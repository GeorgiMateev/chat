define(["angular", "controllers/loader", "services/loader", "directives/loader", "ngRoute", "ngSanitize"],
    function (angular) {
        var module = angular.module('chat', ['chat.controllers', 'chat.services', 'chat.directives', 'ngRoute', 'ngSanitize'])
          .config(function ($routeProvider, $locationProvider) {
              $routeProvider.otherwise("/");

              $routeProvider
                     .when("/", {
                         templateUrl: "partials/chat.html",
                         controller: "ChatCtrl"
                     });

              // use the HTML5 History API
              $locationProvider.html5Mode(true).hashPrefix('!');
          });

        return module;
    });