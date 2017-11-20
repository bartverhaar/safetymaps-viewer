
dbkjs.modules.search.viewmode = 'fullscreen';

dbkjs.modules.search.createSearchGroup = function() {
    var search_group = $('<div></div>').addClass('input-group input-group-lg');
    var search_input = $('<input id="search_input" name="search_input" autocomplete="off" type="text" class="form-control" placeholder="' + i18n.t("search.dbkplaceholder") + '">');

    if(dbkjs.options.searchTabs) {
        var search_tabs = $(
            '<ul id="search_tabs" class="nav nav-pills" style="margin-bottom: 10px">' +
                    '<li id="search_li_dbk" class="active"><a data-toggle="tab" href="#" id="s_dbk"><i class="fa fa-building"></i> ' + i18n.t("search.dbk") + '</a></li>' +
                    '<li id="search_li_oms"><a  data-toggle="tab" href="#" id="s_oms"><i class="fa fa-bell"></i> ' + i18n.t("search.oms") + '</a></li>' +
                    '<li id="search_li_library" style="display: none"><a  data-toggle="tab" href="#" id="s_library"><i class="fa fa-book"></i> ' + i18n.t("search.library") + '</a></li>' +
                    '<li id="search_li_wo" style="display: ' + (dbkjs.modules.waterongevallen.features && dbkjs.modules.waterongevallen.features.length > 0 ? "block" : "none") + '"><a data-toggle="tab" href="#" id="s_wo"><i class="fa fa-life-buoy"></i> ' + i18n.t("search.wo") + '</a></li>' +                     '<li id="search_li_address"><a  data-toggle="tab" href="#" id="s_address"><i class="fa fa-home"></i> ' + i18n.t("search.address") + '</a></li>' +
                '</ul>'
        );

        search_group.append(search_tabs);
        search_group.append(search_input);
    } else {
        var search_btn_grp = $(
            '<span class="btn-group input-group-btn">' +
                '<a class="btn btn-default dropdown-toggle" data-toggle="dropdown"><i class="fa fa-building"></i> <span class="dropdown-text">' + i18n.t("search.dbk") + '</span> <span class="caret"></span></a>' +
                '<ul class="dropdown-menu pull-right" id="search_dropdown" role="menu">' +
                    '<li><a href="#" id="s_dbk"><i class="fa fa-building"></i> ' + i18n.t("search.dbk") + '</a></li>' +
                    '<li><a href="#" id="s_oms"><i class="fa fa-bell"></i> ' + i18n.t("search.oms") + '</a></li>' +
                    '<li><a href="#" id="s_adres"><i class="fa fa-home"></i> ' + i18n.t("search.address") + '</a></li>' +
    //                '<li><a href="#" id="s_coord"><i class="fa fa-thumb-tack"></i> ' + i18n.t("search.coordinates") + '</a></li>' +
                '</ul>' +
            '</span>'
        );
        search_group.append(search_input);
        search_group.append(search_btn_grp);
    }

    return $('<div class="row"></div>').append($('<div class="col-lg-12"></div>').append(search_group));
};
