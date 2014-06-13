var express = require('express');
var favicon = require('serve-favicon');
var logger = require('morgan');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var errorHandler = require('errorhandler');
var path = require('path');

//Allows messages to be sent to sockets hosted on other processes
var redis = require('socket.io-redis');

//Parse command line parameters
// -s - runs the app in a single thread
// -t - determines whether the app is in test mode
// -c - determines the number of cpus to use;
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
    app.get('/', function (req, res) {
        res.send();
    });

    var http = require('http');

    var server = http.createServer(app);
    io = require('socket.io').listen(server);

    //All sockets will be stored in Redis so they can retrieve information from other workers
    io.adapter(redis({ host: 'localhost', port: 6379 }));

    io.sockets.on("connection", function (socket) {
        console.log('socket connected to worker with pid ' + process.pid);

        io.sockets.emit("New connection");

        socket.on("message", function (data) {
            io.sockets.emit("new message", data);
        });
    });

    return server;
}