
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

dbkjs.challengeAuth = function() {
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
            dbkjs.successAuth();
        }
    });
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
