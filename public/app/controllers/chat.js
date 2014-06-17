define(["controllers/module"], function (controllers) {
    controllers.controller("ChatCtrl", ["$scope", "$rootScope", "$cacheFactory", "WebSocketService",
     function ($scope, $rootScope, $cacheFactory, webSocketService) {
         $scope.users = [];
         $scope.rooms = [];

         var allUsersRoom = "allUsersRoom";

         $rootScope.$on("loggedIn", function () {
             var username = $cacheFactory.get("username");
             webSocketService.send("usersGetAll", { from: username });
         });

         webSocketService.on("usersGetAllSuccess", function (users) {
             applyCallback(function () {
                 //reuse the array to keep the angular binding
                 $scope.usernames.length = 0;
                 for (var i = 0, l = users.length; i < l; i++) {
                     var user = users[i];
                     $scope.users[user] = { name: user };
                 }
             });
         });

         webSocketService.on("senderNotValid", function () {
             alert("There is a problem with your username. Please register again.");
         });

         webSocketService.on("messageRecipientNotFound", function () {
             alert("You are trying to send a message to a user that doesn't exist.");
         });

         //A new user has been registered
         webSocketService.on("userRegistered", function (username) {
             applyCallback(function () {
                 $scope.users[username] = { name: username };
                 $scope.rooms[allUsersRoom] = { name: allUsersRoom };
             });
         });

         webSocketService.on("userLeft", function (username) {
             applyCallback(function () {
                 delete $scope.users[username];
             });
         });

         webSocketService.on("messageSend", function (message) {
             applyCallback(function () {
                 var room = $scope.rooms[message.sender];
                 room.messages.push(message);
             });
         });

         webSocketService.on("messageSendAll", function (message) {
             applyCallback(function () {
                 var room = $scope.rooms[allUsersRoom];
                 room.messages.push(message);
             });
         });

         $scope.openRoom = function (name) {
             if ($scope.rooms[name]) {
                 return;
             }

             $scope.rooms[name] = { name: name };
         };

         $scope.closeRoom = function (name) {
             delete $scope.rooms[name];
         };

         $scope.sendMessage = function (room) {
             var username = $cacheFactory.get("username");
             var message = {
                 from: username,
                 to: room.name,
                 message: room.messageInput
             };

             if (room.name == "allUsersRoom") {
                 webSocketService.send("messageSendAll");
             } else {
                 webSocketService.send("messageSend");
             }
         };

         //returns a element from a array in the $scope
         function findRoom(username) {
             for (var i = 0, l = $scope.rooms.length; i < l; i++) {
                 var room = $scope.rooms[i];
                 if (room.name === username) {
                     return room;
                 }
             }
         };

         //forces angular to update the scope when external event occurs
         function applyCallback(callback) {
             $scope.$apply(function () {
                 callback();
             });
         };
     } ]);
});