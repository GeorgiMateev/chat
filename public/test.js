(function () {
    var timer = new Timer();

    function getTime() {
        var d = new Date();
        return d.getTime();
    }

    //Messages that each emitter sends
    var messagesCount = 10000;

    // sockets that only listen
    var socketsCount = 10;

    //sockets that only emits
    var emittersCount = 4;

    var allMessagesCount = messagesCount * socketsCount * emittersCount;
    var recievedMessages = 0;
    var startTime;
    var endTime;

    for (var i = 0; i < socketsCount; i++) {
        var socket = io();
        socket.on("new message", function (data) {
            recievedMessages++;
            if (recievedMessages >= allMessagesCount) {
                endTime = getTime();
                console.log(allMessagesCount + " messages for " + (endTime - startTime) / 1000 + " seconds.");
            }

            if (data.number && data.number === Math.floor(messagesCount / 2)) {
                console.log("Elapsed: " + (getTime() - data.time) + "ms");
            }
        });
    }

    var isFirst = false;
    for (var i = 0; i < emittersCount; i++) {
        var emitterSocket = io();
        var worker = new Worker("testEmitter.js");
        worker.postMessage(messagesCount);
        worker.onmessage = function (event) {
            if (!isFirst) {
                isFirst = true;
                startTime = getTime();
            }

            emitterSocket.emit("message", { time: getTime(), number: event.data });
        };
    }
})();