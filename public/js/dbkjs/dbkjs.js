/*!
 *  Copyright (c) 2014 Milo van der Linden (milo@dogodigi.net)
 *
 *  This file is part of opendispatcher/safetymapsDBK
 *
 *  opendispatcher is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  opendispatcher is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with opendispatcher. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/* global OpenLayers, i18n, Proj4js, dbkjsLang, moment */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || [];
dbkjs.overlays = dbkjs.overlays || [];
dbkjs.map = dbkjs.map || null;

dbkjs.init = function () {

    dbkjs.setPaths();

    if (!dbkjs.map) {
        dbkjs.map = new OpenLayers.Map(dbkjs.options.map.options);
    }
    dbkjs.options.organisation = {
        id: dbkjs.util.getQueryVariable(i18n.t('app.organisation'), 'demo')
    };
    dbkjs.options.adres = dbkjs.util.getQueryVariable(i18n.t('app.queryAddress'));
    dbkjs.options.omsnummer = dbkjs.util.getQueryVariable(i18n.t('app.queryNumber'));
    dbkjs.options.dbk = dbkjs.util.getQueryVariable(i18n.t('app.queryDBK'));
    dbkjs.getOrganisation();

    dbkjs.mapcontrols.createMapControls();

    dbkjs.mapcontrols.registerMapEvents(dbkjs.layers.createBaseLayers());

    dbkjs.showStatus = false;

};

dbkjs.setPaths = function() {

    dbkjs.basePath = window.location.protocol + '//' + window.location.hostname;
    var pathname = window.location.pathname;
    // ensure basePath always ends with '/', remove 'index.html' if exists
    if(pathname.charAt(pathname.length - 1) !== '/') {
        pathname = pathname.substring(0, pathname.lastIndexOf('/')+1);
    }
    // ensure single '/' between hostname and path
    dbkjs.basePath = dbkjs.basePath + (pathname.charAt(0) === "/" ? pathname : "/" + pathname);

    // Wordt gebruikt in:
    // - dbkjs.challengeAuth()
    // - feature.js - get()
    // - jsonDBK.js - getGebied()
    // - jsonDBK.js - getObject()
    if (!dbkjs.dataPath) {
        dbkjs.dataPath = 'api/';
    }

    // Wordt gebruikt in:
    // - jsonDBK.js - constructMedia()
    if (!dbkjs.mediaPath) {
        dbkjs.mediaPath = dbkjs.basePath + 'media/';
    }
};


/**
 * Function to update the visibility for baseLayers
 * @param {integer} nr
 */
dbkjs.toggleBaseLayer = function (nr) {
    var layerbuttons = $(".bl");
    var i;
    for (i = 0; i < layerbuttons.length; i++) {
        if (i !== nr) {
            $(layerbuttons[i]).removeClass("active", true);
            dbkjs.options.baselayers[i].setVisibility(false);
        } else {
            $(layerbuttons[nr]).addClass("active", true);
            dbkjs.options.baselayers[nr].setVisibility(true);
            dbkjs.map.setBaseLayer(dbkjs.options.baselayers[nr]);
        }
    }
};

dbkjs.activateClick = function () {
    dbkjs.map.events.register('click', dbkjs.map, dbkjs.util.onClick);

    // TODO: OpenLayers.Handler.Click with pixelTolerance instead of this?
    if(!dbkjs.options.minTouchMoveEndDistance || dbkjs.options.minTouchMoveEndDistance === 0) {
        dbkjs.map.events.register('touchend', dbkjs.map, dbkjs.util.onClick);
    } else {
        var touchmove = null;

        dbkjs.map.events.register('touchend', dbkjs.map, function(e) {
            // Set on featureselected/featureunselected, as this also fires a
            // touchend, but a click event on feature (un)selected is swallowed
            if(dbkjs.ignoreNextTouchend) {
                dbkjs.ignoreNextTouchend = false;
                return;
            }
            var closeTouch = false;
            if(touchmove !== null && touchmove.xy && e.xy) {
                closeTouch = Math.abs(touchmove.xy.x - e.xy.x) < dbkjs.options.minTouchMoveEndDistance &&
                        Math.abs(touchmove.xy.y - e.xy.y) < dbkjs.options.minTouchMoveEndDistance;
            }
            if(touchmove === null || closeTouch) {
                dbkjs.util.onClick(e);
            }
            touchmove = null;
        });

        dbkjs.map.events.register('touchmove', dbkjs.map, function(e) {
            if(touchmove === null) {
                touchmove = e;
            }
        });
    }
};

dbkjs.getOrganisation = function() {
    var params = {srid: dbkjs.options.projection.srid};
    $.ajax({
        dataType: "json",
        url: dbkjs.dataPath + 'organisation.json',
        data: params,
        cache: false
    })
    .done(function (data) {
        if (data.organisation) {
            dbkjs.options.organisation = data.organisation;
            if (dbkjs.options.organisation.title) {
                document.title = dbkjs.options.organisation.title;
            }
            dbkjs.gotOrganisation();
        }
    });
};

dbkjs.gotOrganisation = function () {
    dbkjs.hoverControl = new OpenLayers.Control.SelectFeature(
            [],
            {
                hover: true,
                highlightOnly: true,
                clickTolerance: 30,
                renderIntent: "temporary"
            }
    );
    dbkjs.hoverControl.handlers.feature.stopDown = false;
    dbkjs.hoverControl.handlers.feature.stopUp = false;
    dbkjs.map.addControl(dbkjs.hoverControl);
    dbkjs.selectControl = new OpenLayers.Control.SelectFeature(
            [],
            {
                clickout: true,
                clickTolerance: 30,
                toggle: true,
                multiple: false
            }
    );
    dbkjs.selectControl.handlers.feature.stopDown = false;
    dbkjs.selectControl.handlers.feature.stopUp = false;
    dbkjs.map.addControl(dbkjs.selectControl);

    //register modules
    $.each(dbkjs.modules, function (name, module) {
        var enabled = false;
        $.each(dbkjs.options.organisation.modules, function(i, m) {
            if(m.name === name) {
                enabled = true;
                module.options = m.options;
                return false;
            }
        });
        enabled = enabled || dbkjs.options.additionalModules && $.inArray(name, dbkjs.options.additionalModules) > -1;

        if(enabled && module.register) {
            try {
                module.register();
            } catch(e) {
                console.log("Error initializing module " + name + ": " + e + ", options: ", module.options);
            }
        }
    });

    dbkjs.layers.loadFromWMSGetCapabilities();
    dbkjs.finishMap();
    $(dbkjs).trigger('dbkjs_init_complete');
};

dbkjs.zoomToFixedMapResolutionForBounds = function(bounds) {
    dbkjs.map.zoomToExtent(bounds);

    var res = dbkjs.map.getResolution();
    var zoomIndex = 1;
    for(; zoomIndex < dbkjs.map.options.resolutions.length; zoomIndex++) {
        if(dbkjs.map.options.resolutions[zoomIndex] < res) {
            break;
        }
    }
    zoomIndex--;
    console.log("orig res: " + res + ", higher map resolution at index " + zoomIndex + ", res " + dbkjs.map.options.resolutions[zoomIndex]);
    dbkjs.map.setCenter(dbkjs.map.getCenter(), zoomIndex);
}

dbkjs.finishMap = function () {
    //find the div that contains the baseLayer.name
    var listItems = $("#baselayerpanel_ul li");
    var areaGeometry = dbkjs.options.mapExtent ? dbkjs.options.mapExtent : new OpenLayers.Format.GeoJSON().read(dbkjs.options.organisation.area.geometry, "Geometry");
    listItems.each(function (idx, li) {
        var test = $(li).children(':first').text();
        if (test === dbkjs.map.baseLayer.name) {
            $(li).addClass('active');
        }
    });
    if (dbkjs.layout) {
        dbkjs.layout.activate();
    }
    dbkjs.activateClick();

    dbkjs.selectControl.activate();
    var hrefzoom = dbkjs.util.getQueryVariable('zoom');
    var hreflat = dbkjs.util.getQueryVariable('lat');
    var hreflon = dbkjs.util.getQueryVariable('lon');
    if (hrefzoom && hreflat && hreflon) {
        dbkjs.argparser = new dbkjs.argParser();
        dbkjs.map.addControl(dbkjs.argparser);
    } else {
        if(dbkjs.options.initialZoomed) {
            return;
        }
        dbkjs.options.initialZoomed = true;
        if (dbkjs.options.organisation.area) {
            if (dbkjs.options.organisation.area.geometry.type === "Point") {
                dbkjs.map.setCenter(
                        new OpenLayers.LonLat(
                                dbkjs.options.organisation.area.geometry.coordinates[0],
                                dbkjs.options.organisation.area.geometry.coordinates[1]
                                ).transform(
                        new OpenLayers.Projection(dbkjs.options.projection.code),
                        dbkjs.map.getProjectionObject()
                        ),
                        dbkjs.options.organisation.area.zoom
                        );
            } else if (dbkjs.options.organisation.area.geometry.type === "Polygon") {
                dbkjs.zoomToFixedMapResolutionForBounds(areaGeometry.getBounds())
            }
        } else {
            dbkjs.map.zoomToMaxExtent();
        }
    }
};

dbkjs.bind_dbkjs_init_complete = function() {

    $(dbkjs).bind('dbkjs_init_complete', function() {
        FastClick.attach(document.body);
        (function() {
            var timer;
            function throttleCalc() {
                window.clearTimeout(timer);
                timer = window.setTimeout(calcMaxWidth, 150);
            }
            function calcMaxWidth() {
                // Calculate the max width for dbk title so other buttons are never pushed down when name is too long
                var maxWidth = $('body').outerWidth();
                $('.dbk-title').css('max-width', (maxWidth - 70) + 'px');
            }
            if(window.addEventListener) {
                // Listen for orientation changes
                window.addEventListener("orientationchange", function() {
                    calcMaxWidth();
                }, false);
                window.addEventListener("resize", function() {
                    throttleCalc();
                }, false);
            }
            calcMaxWidth();
        }());
    });
};

$(document).ready(function () {
    // Make sure i18n is initialized
    i18n.init({
        lng: dbkjsLang, fallbackLng: 'en', debug: false, postProcess: "doReplacements"
    }, function (err,t) {
        i18n.addPostProcessor("doReplacements", function (val, key, options) {
            if (dbkjs.options.i18nReplacements) {
                var lngReplacements = dbkjs.options.i18nReplacements[i18n.lng()];
                if (lngReplacements && lngReplacements[key]) {
                    return lngReplacements[key];
                }
            }
            return val;
        });
        OpenLayers.Lang[dbkjsLang] = OpenLayers.Util.applyDefaults(
            {'Scale = 1 : ${scaleDenom}': i18n.t("app.scale")}
        );
        OpenLayers.Lang.setCode(dbkjsLang);
        // Create the infopanel
        dbkjs.util.createModalPopup({name: 'infopanel'}).getView().append($('<div></div>').attr({'id': 'infopanel_b'}));

        // Create the DBK infopanel
        dbkjs.dbkInfoPanel = new SplitScreenWindow("dbkinfopanel");
        dbkjs.dbkInfoPanel.createElements();

        // Put tabs at the bottom after width transition has ended
        var updateContentHeight = function() {
            var view = dbkjs.dbkInfoPanel.getView();
            var tabContentHeight = view.height() - view.find(".nav-pills").height();
            view.find(".tab-content").css("height", tabContentHeight);

            view.find(".pdf-embed").css("height", tabContentHeight - 28);
        };
        $(window).resize(updateContentHeight);

        $(dbkjs.dbkInfoPanel).on("show", function() {
            var event = dbkjs.util.getTransitionEvent();
            if(event) {
                dbkjs.dbkInfoPanel.getView().parent().on(event, updateContentHeight);
            } else {
                updateContentHeight();
            }

            $.each(dbkjs.dbkInfoPanel.getView().find(".pdf-embed"), function(i, pdf) {
                if(pdf.children.length === 0) {
                    console.log("embedding PDF " + $(pdf).attr("data-url"));
                    // Add cache buster to avoid unexpected server response (206) on iOS 10 safari webapp
                    PDFObject.embed($(pdf).attr("data-url") + "?t=" + new Date().getTime(), pdf, {
                        // Use custom built pdf.js with src/core/network.js function
                        // PDFNetworkStreamFullRequestReader_validateRangeRequestCapabilities
                        // always returning false to also avoid 206 error
                        PDFJS_URL: "js/libs/pdfjs-1.6.210-disablerange-minified/web/viewer.html",
                        forcePDFJS: !!dbkjs.options.forcePDFJS
                    });
                    // Remove buttons from PDFJS toolbar
                    // XXX hack, use PDFJS documentloaded event?
                    function removeToolbar() {
                        var iframe = $("iframe").contents();
                        if(iframe.find("#download")[0] || iframe.find("#secondaryDownload")[0] ) {
                            console.log("found PDFJS toolbar buttons, removing");
                            iframe.find("#download").remove();
                            iframe.find("#openFile").remove();
                            iframe.find("#print").remove();
                            iframe.find("#secondaryDownload").remove();
                            iframe.find("#secondaryOpenFile").remove();
                            iframe.find("#secondaryPrint").remove();
                        } else {
                            console.log("PDFJS toolbar not found, waiting")
                            window.setTimeout(removeToolbar, 500);
                        }
                    }
                        //this check is needed. If the program is not using PDFJS then we can't remove buttons.
                        if(PDFObject.supportsPDFs || dbkjs.options.forcePDFJS ){
                            removeToolbar();
                        }
                }
            });
        });

        dbkjs.dbkInfoPanel.getView().append(
                $('<div></div>')
                .attr({'id': 'dbkinfopanel_b'})
                .text(i18n.t("dialogs.noinfo"))
        );

        // We are removing / moving some existing DIVS from HTML to convert prev. popups to fullscreen modal popups
        $('#baselayerpanel').remove();
        $('#overlaypanel').attr('id', 'tmp_overlaypanel');
        var baseLayerPopup = dbkjs.util.createModalPopup({name: 'baselayerpanel'});
        baseLayerPopup.getView().append($('<div></div>').attr({'id': 'baselayerpanel_b'}));
        var overlaypanelPopup = dbkjs.util.createModalPopup({name: 'overlaypanel'});
        overlaypanelPopup.getView().append($('#tmp_overlaypanel .tabbable'));
        $('#tmp_overlaypanel').remove();

        $('#tb01, #tb02').on('click', function (e) {
            e.preventDefault();
            var panelId = $(this).attr('href').replace('#', '');
            if (panelId === 'baselayerpanel') {
                $.each(dbkjs.options.baselayers, function (bl_index, bl) {
                    if (bl.getVisibility()) {
                        $('#bl' + bl_index).addClass('active');
                    }
                });
            }
            dbkjs.util.getModalPopup(panelId).show();
        });

        $('body').append(dbkjs.util.createDialog('vectorclickpanel', '<i class="icon-info-sign"></i> ' + i18n.t("dialogs.clickinfo"), 'left:0;bottom:0;margin-bottom:0px;position:fixed'));
        $("#vectorclickpanel").on('click', function() {
            dbkjs.selectControl.unselectAll();
            $('#vectorclickpanel').hide();
        });
        dbkjs.init();

        // dbkjs.options.enableSplitScreen: enable split screen setting
        // dbkjs.options.splitScreenChecked: split screen is enabled
        if(dbkjs.options.enableSplitScreen) {
            $(".main-button-group").css({paddingRight: "10px", width: "auto", float: "right", right: "0%"});

            var addSplitscreenOption = function() {
                // Add config option to enable / disable split screen


                $($("#settingspanel_b div.row")[0]).append('<div class="col-xs-12"><label><input type="checkbox" id="checkbox_splitScreen" ' + (dbkjs.options.splitScreenChecked ? 'checked' : '') + '>Toon informatie naast de kaart</label></div>');

                $("#checkbox_splitScreen").on('change', function (e) {
                    dbkjs.options.splitScreenChecked = e.target.checked;
                    $(dbkjs).triggerHandler('setting_changed_splitscreen', dbkjs.options.splitScreenChecked);
                });

                // Hide all modal popups when settings is opened
                $("#c_settings").on('click', function(e) {
                    $(dbkjs).triggerHandler('modal_popup_show', {popupName: 'settings'});
                });
            };

            // XXX timing dependent for #settingspanel_b div.row appears, not
            // only dbkjs_init_compelete...
            var check = function() {
                if($("#settingspanel_b div.row").length === 0) {
                    window.setTimeout(check, 500);
                } else {
                    addSplitscreenOption();
                }
            };
            $(dbkjs).bind('dbkjs_init_complete', check);
        }

        $('#infopanel_b').html(dbkjs.options.info);
        $('#tb03').click(function () {
            dbkjs.dbkInfoPanel.toggle();
        });
        // Added touchstart event to trigger click on. There was some weird behaviour combined with FastClick,
        // this seems to fix the issue
        $('#zoom_extent').on('click touchstart', function () {
          var areaGeometry = new OpenLayers.Format.GeoJSON().read(dbkjs.options.organisation.area.geometry, "Geometry");
            if (dbkjs.options.organisation.modules.regio) {
                dbkjs.modules.regio.zoomExtent();
            } else {
                if (dbkjs.options.organisation.area.geometry.type === "Point") {
                    dbkjs.map.setCenter(
                            new OpenLayers.LonLat(
                                    dbkjs.options.organisation.area.geometry.coordinates[0],
                                    dbkjs.options.organisation.area.geometry.coordinates[1]
                                    ).transform(
                            new OpenLayers.Projection(dbkjs.options.projection.code),
                            dbkjs.map.getProjectionObject()
                            ),
                            dbkjs.options.organisation.area.zoom
                            );
                } else if (dbkjs.options.organisation.area.geometry.type === "Polygon") {
                    dbkjs.zoomToFixedMapResolutionForBounds(areaGeometry.getBounds());
                }
            }
        });
        dbkjs.bind_dbkjs_init_complete();
    });
});

