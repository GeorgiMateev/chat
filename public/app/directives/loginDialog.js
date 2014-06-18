define(["directives/module", "bootstrap"], function (directives) {
    directives.directive("loginDialog", ["$rootScope", "$cacheFactory", "WebSocketService",
     function ($rootScope, $cacheFactory, webSocketService) {
         return {
             restrict: 'EA',
             replace: true,
             templateUrl: 'partials/loginDialog.html',
             link: function (scope, element, attrs) {
                 webSocketService.on("connect", function () {
                     scope.$apply(function () {
                         scope.error = false;
                         element.modal("show");
                     });
                 });

                 webSocketService.on("userRegisterSuccess", function (message) {
                     scope.$apply(function () {
                         var username = message.username;
                         var cache = $cacheFactory("login");
                         cache.put("username", username);
                         scope.error = false;
                         element.modal("hide");
                         $rootScope.$emit("loggedIn");
                     });
                 });

                 webSocketService.on("userExists", function (message) {
                     scope.$apply(function () {
                         scope.error = true;
                         scope.errorMessage = "The username already exists!";
                     });
                 });

                 scope.register = function () {
                     var username = scope.username;
                     if (!username) {
                         scope.error = true;
                         scope.errorMessage = "Please enter username!";
                     }
                     else {
                         scope.error = false;
                         webSocketService.send("userRegister", username);
                     }
                 };

                 element.modal({
                     keyboard: false,
                     show: false
                 });
             }
         };
     } ]);
});