require.config({
    paths: {
        angular: "../bower_components/angular/angular.min",
        ngRoute: "../bower_components/angular-route/angular-route.min",
        ngSanitize: "../bower_components/angular-sanitize/angular-sanitize.min",
        ngCookies: "../bower_components/angular-cookies/angular-cookies.min",
        jquery: "../bower_components/jquery/dist/jquery.min",
        bootstrap: "../bower_components/bootstrap/dist/js/bootstrap.min",
        domReady: "../bower_components/requirejs-domready/domReady",
        io: "/socket.io/socket.io",
        ss: "lib/socket.io-stream"
    },
    shim: {
        angular: {
            deps: ["jquery"],
            exports: "angular"
        },
        ngSanitize: {
            deps: ["angular"]
        },
        ngCookies: {
            deps: ["angular"]
        },
        ngRoute: {
            deps: ["angular"]
        },

        io: {
            exports: "io"
        },

        ss: {
            exports: "ss"
        }
    }
});

require(["domReady", "angular", "app"],
 function (domReady, angular, app) {
     domReady(function () {
         //the required 'app' file initializes the 'chat' module
         angular.bootstrap(document, ['chat']);
     });
 });