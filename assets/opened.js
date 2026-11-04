/*
 * Marks demonstrations opened from this library.
 * Same localStorage key as assets/site-oer-footer.js.
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

    function mark(selector) {
        var opened = read();
        var set = {};
        if (opened) opened.forEach(function (href) { set[href] = true; });
        document.querySelectorAll(selector).forEach(function (card) {
            var href = card.getAttribute("href");
            card.classList.toggle("is-opened", !!(href && set[href]));
        });
    }

    global.ProjectVizOpened = {
        mark: mark
    };
})(window);
