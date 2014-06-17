define(["directives/module", function (directives) {
    directives.directive("loginDialog", ["$rootScope", "$cacheFactory", "webSocketService",
     function ($rootScope, $cacheFactory, webSocketService) {
         return {
             restrict: 'AE',
             templateUrl: 'partials/loginDialog.html',
             link: function (scope, element, attrs) {
                 webSocketService.on("connection", function () {
                     scope.$apply(function () {
                         scope.showLogin = true;
                         scope.error = false;
                         scope.showLogin = true;
                         $cacheFactory.remove("username");
                     });
                 });

                 webSocketService.on("userRegisterSuccess", function (message) {
                     scope.$apply(function () {
                         var username = message.username;
                         $cacheFactory.set("username", username);
                         scope.error = false;
                         scope.showLogin = false;
                         $rootScope.emit("loggedIn");
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

                 //TODO: make it modal
             }
         };
     } ]);
} ]);