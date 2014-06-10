//Parse command line parameters
// -m - number of messages to send from each sender
// -s - number of senders that will send messages, each sender is in its own process
// -l - number of listeners that should recieve messages, each listener is in its own process

var argv = require('minimist')(process.argv.slice(2));

var cluster = require('cluster');

function io() {
    return require('socket.io-client')('http://localhost:' + (process.env.PORT || 3000));
}

function getTime() {
    var d = new Date();
    return d.getTime();
}

//Messages that each emitter sends
var messagesCount;
if (argv.m) {
    messagesCount = argv.m;
}
else {
    console.error("Specify number of messages to send in -m parameter.");
}

// sockets that only listen
var socketsCount;
if (argv.l) {
    socketsCount = argv.l;
}
else {
    console.error("Specify number of listeners in -l parameter.");
}

//sockets that only emits
var emittersCount;
if (argv.s) {
    emittersCount = argv.s;
}
else {
    console.error("Specify number of senders in -s parameter.");
}

var allMessagesCount = messagesCount * socketsCount * emittersCount;
var listenerMessagesCount = messagesCount * emittersCount;


if (cluster.isMaster) {
    var finishedProcessesCount = 0;    
    var averageRoundTripTime = 0;
    var averageElapsedTime = 0;
    var startTime = 0;
    var endTime = 0;
    var isFirst;

    for (var i = 0; i < emittersCount; i++) {
        var worker = cluster.fork({type: "emit"});
        worker.on("message", function (message) {
            if (message.time && !isFirst) {
                startTime = getTime();
                isFirst = true;
            }
        });
    }

     for (var i = 0; i < socketsCount; i++) {
        var worker = cluster.fork({type: "listen"});
        worker.on("message", function (message) {
            if (message.roundTripTime) {
                //a listener have measured its average recieving time
                averageRoundTripTime += message.roundTripTime;
            }

            if (message.endTime) {
                //a listener has recieved all sent messages
                averageElapsedTime += (message.endTime - startTime);
                finishedProcessesCount++;

                if (finishedProcessesCount == socketsCount) {
                    //when every listener has recieved all sent messages
                    console.warn(allMessagesCount + " messages for average: " + (averageElapsedTime / socketsCount) + " miliseconds.");
                    console.warn("Average time to send and recieve message: " + (averageRoundTripTime / socketsCount) + " miliseconds.");
                }
            }
        });
    }
}
else {
    var recievedMessages = 0;

    if(process.env.type == "listen"){
        var socket = io();
        socket.on("connect", function () {
            socket.on("new message", function (data) {
                recievedMessages++;

                if (recievedMessages >= listenerMessagesCount) {
                    process.send({ endTime: getTime() });
                }

                if (data.number && data.number == Math.floor(messagesCount / 2)) {
                    process.send({ roundTripTime: (getTime() - data.time) });
                }
            });
        });       
    }

    if (process.env.type == "emit") {
        var emitterSocket = io();
        emitterSocket.on("connect", function(){
            process.send({ time: getTime() });

            for (var i = 0; i < messagesCount; i++) {
                emitterSocket.emit("message", { time: getTime(), number: i });
            }
        });        
    }
}