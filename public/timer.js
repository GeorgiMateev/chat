function Timer() {
    this.isRunning = false;
    this.start = 0;
    this.callback = null;

    this.jsTimerObject = null;

    this.reset();
}
Timer.prototype = {
    setInterval: function (interval, callback) {
        var self = this;
        this.start = new Date().getTime();
        this.callback = callback;
        this.isRunning = true;

        this.jsTimerObject = window.setTimeout(function () {
            self.setIntervalInternal(interval, callback)
        }, interval);
    },

    setIntervalInternal: function (interval, callback) {
        var self = this;

        callback(this.progressSec);

        var difference = (new Date().getTime() - this.start) - interval;

        this.jsTimerObject = window.setTimeout(function () {
            self.setIntervalInternal(interval, callback)
        }, interval - difference);
    },

    reset: function () {
        if (this.jsTimerObject) {
            window.clearTimeout(this.jsTimerObject);
        }

        this.isRunning = false;
        this.start = 0;
        this.callback = null;
                
        this.jsTimerObject = null;
    },

    stop: function () {
        this.reset();
    }
};