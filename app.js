var express = require('express');
var favicon = require('serve-favicon');
var logger = require('morgan');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var errorHandler = require('errorhandler');
var path = require('path');
var Q = require('q');

//Parse command line parameters
console.log(
" -s - runs the app in a single thread\n\r" +
" -t - determines whether the app is in test mode\n\r" +
" -c - determines the number of cpus to use");

var argv = require('minimist')(process.argv.slice(2));

//A new process will be forked for each logical CPU
var cpus = argv.c ? argv.c : require('os').cpus().length;

if (argv.s) {
    // Run the application in a single thread
    var server = setupApp();
    server.listen(3000, function () {
        console.log("Server started on a single process with pid " + process.pid +" on 3000 port");
    });
}
else {
    // Sticky-sessions module is balancing requests using their IP address.
    // Thus client will always connect to same worker server, and socket.io will work as expected, but on multiple processes.
    clusterize(cpus, function () {
        // A new proccess will be forked for every cpu
        // This code will be executed only in slave workers
        console.log("A process with pid "+ process.pid +" has been forked.");
        return setupApp();
    }).listen(3000, function () {
        console.log('Server started on multiple processes on 3000 port');
    });
}

function clusterize (cpus, worker) {
    if (argv.t) {
        //The connections to workers won't be distributed by remote ip
        var cluster = require("./clusterize");
        return cluster(cpus, worker);
    }
    else {
        //Ensures that all messages for a socket will be sent to the process where the socket is hosted
        var sticky = require('sticky-session');
        return sticky(cpus, worker);
    }
}

function setupApp () {
    var app = express();

    // all environments
    app.set('port', process.env.PORT || 3000);
    //app.use(favicon(__dirname + '/public/favicon.ico'));
    app.use(logger('dev'));
    app.use(methodOverride());
    app.use(cookieParser('your secret here'));
    app.use(session());

    app.use(express.static(path.join(__dirname, 'public')));

    //Ensure that all url are redirected to index.html/#![path].
    //This will allow Angular to handle all url paths in Html5 mode and fallback to hashbang mode if needed.
   app.use('*', function(req, res){
        //res.sendfile(path.join(__dirname, 'public/index.html'));
        return res.redirect(req.protocol + '://' + req.get('Host') + '/#!' + req.url);
    });

    var http = require('http');

    var server = http.createServer(app);
    io = require('socket.io').listen(server);

    var redisClient;
    try {
        redisClient = require('redis').createClient(6379, 'localhost');
        redisClient.ping();

        //Allows messages to be sent to sockets hosted on other processes
        var redisAdapter = require('socket.io-redis');     
        io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));
    }
    catch (e) {
        console.error("Failed to connect to redis. Inner error: " + e.message);
    }

    io.sockets.on("connection", function (socket) {
        console.log('socket connected to worker with pid ' + process.pid);

        //used for test purposes
        io.sockets.emit("New connection");

        socket.on("message", function (data) {
            io.sockets.emit("new message", data);
        });

        //Attempt to register username
        //Emits back userExists if the user exists
        socket.on("userRegister", function (username) {
            redisClient.exists(username, function (err, reply) {
                if (reply) {
                    socket.emit("userExists", { code: 100, message: "Already taken." });
                }
                else {
                    //to be able to get the username from id and vice versa with constant time
                    redisClient.set("user:" + username, socket.id);
                    redisClient.set("userid:" + socket.id, username);
                    socket.emit("userRegisterSuccess", { code: 200, message: "User registered.", username: username });
                    socket.broadcast.emit("userRegistered", username);
                }
            });
        });

        //Sends message to user
        //Emits back messageRecipientNotFound if there is no such user.
        //Emits back senderNotValid if the sender is not registered or belongs to different socket.
        socket.on("messageSend", function (data) {
            var toUsername = data.to;
            var fromUsername = data.from;
            var message = data.message;

            Q.spread([
                Q.ninvoke(redisClient, "get", "user:" + fromUsername),
                Q.ninvoke(redisClient, "get", "user:" + toUsername)],
                    function (fromId, toId) {
                        if (!fromId || fromId != socket.id) {
                            socket.emit("senderNotValid", { code: 101, message: "The sender is not registered or invalid." });
                        }
                        else if (!toId) {
                            socket.emit("messageRecipientNotFound", { code: 100, message: "No such user." });
                        }
                        else {
                            io.to(toId).emit("messageSend", {
                                sender: fromUsername,
                                message: message,
                                date: new Date()
                            });

                            socket.emit("messageSendSuccess", { code: 200, message: "Message sent." });
                        }

                    });
        });

        //Sends message to all users
        //Emits back senderNotValid if the sender is not registered or belongs to different socket.
        socket.on("messageSendAll", function (data) {
            var fromUsername = data.from;
            var message = data.message;

            Q.ninvoke(redisClient, "get", "user:" + fromUsername)
            .then(function(fromId){
                    if (!fromId || fromId != socket.id) {
                    socket.emit("senderNotValid", { code: 101, message: "The sender is not registered or invalid." });
                }
                else {
                    socket.emit("messageSendSuccess", { code: 200, message: "Message sent." });
                    socket.broadcast.emit("messageSendAll", {
                        sender: fromUsername,
                        message: message,
                        date: new Date()
                    });
                }
            });
        });

        //Requests list of all registered users
        //Emits back senderNotValid if the sender is not registered or belongs to different socket.
        socket.on("usersGetAll", function (data) {
            var fromUsername = data.from;

            Q.ninvoke(redisClient, "get", "user:" + fromUsername)
            .then(function (fromId) {
                if (!fromId || fromId != socket.id) {
                    socket.emit("senderNotValid", { code: 101, message: "The sender is not registered or invalid." });
                    return false;
                }

                return true;
            })
            .then(function (valid) {
                if (valid) {
                    //Runs with O(n) complexity where n is the number of all keys. May cause performance issues. Consider storing usernames in sets.
                    return Q.ninvoke(redisClient, "keys", "user:*");
                }
                return false;
            })
            .then(function (keys) {
                if (keys) {
                    var users = keys.map(function (userKey) {
                        var parts = userKey.split(':');
                        return parts[1];
                    });
                    socket.emit("usersGetAllSuccess", users);
                }
            });
        });

        //Removes the user from the database
        socket.on("disconnect", function () {
            redisClient.get("userid:" + socket.id,
                function (err, reply) {
                    var username = reply;
                    redisClient.del("user:" + username);
                    redisClient.del("userid:" + socket.id);

                    io.emit("userLeft", username);
                });
        });
    });

    return server;
}