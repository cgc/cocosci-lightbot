export class RAF {
    constructor(frameLenMS, cb) {
        this.frameLenMS = frameLenMS;
        this.cb = cb;
        this.timeClockMinusFrame = 0;
        this.prev = window.performance.now();
        // HACK: Just doing this to kick off the RAF
        this.tick(this.prev);
    }
    tick = (ts) => {
        this.rafID = window.requestAnimationFrame(this.tick);

        // First, add elapsed time.
        this.timeClockMinusFrame += ts - this.prev;
        // Make sure it can't get too large, so clock can only get at most a frame length ahead.
        this.timeClockMinusFrame = Math.min(this.timeClockMinusFrame, this.frameLenMS);
        // Set ts for next tick
        this.prev = ts;

        // Whenever frames are behind, we make a call.
        if (0 <= this.timeClockMinusFrame) {
            this.timeClockMinusFrame -= this.frameLenMS;
            this.cb();
        }
    }
    stop() {
        window.cancelAnimationFrame(this.rafID);
    }
}
