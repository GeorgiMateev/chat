(function () {
    this.onmessage = function (e) {
        var messagesCount = e.data;
        for (var i = 0; i < messagesCount; i++) {
            postMessage(i);
        }
    };    
})();