/* A still press shows the same readout a mouse hover already shows.
   A finger that slides keeps scrolling: nothing calls preventDefault, and the
   chart keeps touch-action: pan-y. Mouse hover is left to the page. */
(function (global) {
    function touchMouse(event) {
        return !!(event && event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents);
    }

    var activeUntil = 0;

    function holding() {
        return Date.now() < activeUntil;
    }

    function bind(selection, handlers) {
        var press = null;
        var timer = null;
        var slop = handlers.slop == null ? 12 : handlers.slop;
        var holdMs = handlers.holdMs == null ? 1400 : handlers.holdMs;

        function clearTimer() {
            if (timer != null) {
                clearTimeout(timer);
                timer = null;
            }
        }

        selection
            .style("touch-action", handlers.touchAction || "pan-y")
            .on("pointerdown.vizpress", function (event, d) {
                if (event.pointerType === "mouse") return;
                if (event.isPrimary === false) return;
                clearTimer();
                activeUntil = Date.now() + holdMs + 4000;
                press = {
                    id: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                    moved: false
                };
                if (handlers.show) handlers.show.call(this, event, d);
            })
            .on("pointermove.vizpress", function (event, d) {
                if (!press || event.pointerId !== press.id || press.moved) return;
                if (Math.hypot(event.clientX - press.x, event.clientY - press.y) <= slop) {
                    if (handlers.move) handlers.move.call(this, event, d);
                    return;
                }
                press.moved = true;
                activeUntil = 0;
                if (handlers.hide) handlers.hide.call(this, event, d);
            })
            .on("pointerup.vizpress", function (event, d) {
                if (!press || event.pointerId !== press.id) return;
                var moved = press.moved || Math.hypot(event.clientX - press.x, event.clientY - press.y) > slop;
                press = null;
                if (moved) {
                    if (handlers.hide) handlers.hide.call(this, event, d);
                    return;
                }
                if (handlers.show) handlers.show.call(this, event, d);
                var node = this;
                clearTimer();
                activeUntil = Date.now() + holdMs;
                timer = setTimeout(function () {
                    timer = null;
                    activeUntil = 0;
                    if (handlers.hide) handlers.hide.call(node, event, d);
                }, holdMs);
            })
            .on("pointercancel.vizpress", function (event, d) {
                press = null;
                clearTimer();
                activeUntil = 0;
                if (handlers.hide) handlers.hide.call(this, event, d);
            });

        return selection;
    }

    global.vizPressReadout = {
        bind: bind,
        touchMouse: touchMouse,
        holding: holding
    };
})(window);
