var express = require('express');
var favicon = require('static-favicon');
var logger = require('morgan');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var errorHandler = require('errorhandler');

var sticky = require('sticky-sesion');
var redis = require('socket.io-redis');
var cpus = require('os').cpus().length;

// Sticky-sessions module is balancing requests using their IP address.
// Thus client will always connect to same worker server, and socket.io will work as expected, but on multiple processes.
sticky(function (cpus) {
    // A new proccess will be forked for every cpu
    // This code will be executed only in slave workers

    var app = express();

    // all environments
    app.set('port', process.env.PORT || 3000);
    app.set('views', path.join(__dirname, 'views'));
    app.use(favicon());
    app.use(logger('dev'));
    app.use(methodOverride());
    app.use(cookieParser('your secret here'));
    app.use(session());

    var http = require('http'),
        io = require('socket.io');

    var server = http.createServer(app);
    io.listen(server);

    //All sockets will be stored in Redis so they can retrive information from other workers
    io.adapter(redis({ host: 'localhost', port: 6379 }));

    io.sockets.on("connection", function (socket) {
        console.log('socket connected to worker with pid ' + process.pid);

        io.sockets.emit("New connection");
    });

    return server;
}).listen(3000, function () {
    console.log('server started on 3000 port');
});