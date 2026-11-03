/*
 * Browser-only list of demonstrations opened from this library.
 * Same localStorage key as assets/site-oer-footer.js. No account.
 */
(function (global) {
    var KEY = "project-viz-opened";

    function read() {
        try {
            var raw = global.localStorage.getItem(KEY);
            if (raw == null) return [];
            var parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            var out = [];
            var seen = {};
            var i;
            for (i = 0; i < parsed.length; i++) {
                if (typeof parsed[i] !== "string" || seen[parsed[i]]) continue;
                seen[parsed[i]] = true;
                out.push(parsed[i]);
            }
            return out;
        } catch (err) {
            return null;
        }
    }

    function renderProgress(hrefs) {
        var box = document.getElementById("hub-progress");
        var note = document.getElementById("hub-progress-note");
        var status = document.getElementById("hub-progress-status");
        var meter = document.getElementById("hub-progress-meter");
        var fill = document.getElementById("hub-progress-fill");
        var opened = read();
        var list = Array.isArray(hrefs) ? hrefs : [];
        var available = opened !== null && list.length > 0;
        if (box) box.hidden = !available;
        if (note) note.hidden = !available;
        if (!available || !opened) return;
        var known = {};
        list.forEach(function (href) { known[href] = true; });
        var total = list.length;
        var count = 0;
        opened.forEach(function (href) {
            if (!known[href]) return;
            known[href] = false;
            count++;
        });
        var label = count + " of " + total + " opened in this browser";
        if (status) status.textContent = label;
        if (meter) {
            meter.setAttribute("aria-valuemax", String(total));
            meter.setAttribute("aria-valuenow", String(count));
            meter.setAttribute("aria-valuetext", label);
        }
        if (fill) fill.style.width = (total ? Math.round((count / total) * 100) : 0) + "%";
    }

    function mark(selector) {
        var opened = read();
        var set = {};
        if (opened) opened.forEach(function (href) { set[href] = true; });
        document.querySelectorAll(selector).forEach(function (card) {
            var href = card.getAttribute("href");
            card.classList.toggle("is-opened", !!(href && set[href]));
        });
    }

    function bindReset(button, onReset) {
        if (!button) return;
        button.addEventListener("click", function () {
            try {
                global.localStorage.removeItem(KEY);
            } catch (err) {}
            if (onReset) onReset();
        });
    }

    global.ProjectVizOpened = {
        renderProgress: renderProgress,
        mark: mark,
        bindReset: bindReset
    };
})(window);
