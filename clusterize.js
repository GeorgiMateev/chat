var cluster = require('cluster');
var net = require('net');

module.exports = function clusterize(num, callback) {
    var server;

    // `num` argument is optional
    if (typeof num !== 'number') {
        callback = num;
        num = require('os').cpus().length;
    }

    // Master will spawn `num` workers
    if (cluster.isMaster) {
        var workers = [];
        for (var i = 0; i < num; i++) {
            !function spawn(i) {
                workers[i] = cluster.fork();
                // Restart worker on exit
                workers[i].on('exit', function () {
                    console.error('clusterize-session: worker died');
                    spawn(i);
                });
            } (i);
        }

        server = { listen: function () { } }

        //server = net.createServer(function(c) {
        //  var worker;

        //  // Pass connection to random worker
        //  worker = workers[Math.floor(Math.random() * num)];
        //  worker.send('sticky-session:connection', c);
        //});
    } else {
        server = typeof callback === 'function' ? callback() : callback;

        //  // Worker process
        //process.on('message', function(msg, socket) {
        //  if (msg !== 'sticky-session:connection') return;

        //  server.emit('connection', socket);
        //});

        if (!server) throw new Error('Worker hasn\'t created server!');

        // Monkey patch server to do not bind to port
        //var oldListen = server.listen;
        //server.listen = function listen() {
        //    var lastArg = arguments[arguments.length - 1];

        //    if (typeof lastArg === 'function') lastArg();

        //    return oldListen.call(this, null);
        //};
    }

    return server;
};