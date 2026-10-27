/*
 * Read a --viz-* token from assets/stats-viz-theme.css.
 * Returns a CSS colour string so D3 / canvas / Chart.js stay on the same
 * source of truth as the stylesheet. var() aliases are followed once so
 * callers receive a concrete colour, not another custom property.
 */
(function (global) {
    function tokenName(token) {
        if (!token) {
            throw new Error('statsViz.color: missing token');
        }
        if (token.charAt(0) === '-') {
            return token;
        }
        if (token.indexOf('viz-') === 0) {
            return '--' + token;
        }
        return '--viz-' + token;
    }

    function read(name) {
        return global.getComputedStyle(global.document.documentElement).getPropertyValue(name).trim();
    }

    function color(token) {
        var name = tokenName(token);
        var value = read(name);
        var guard = 0;
        while (/^var\(/.test(value) && guard < 5) {
            var inner = value.slice(4, value.indexOf(')')).split(',')[0].trim();
            value = read(inner);
            guard += 1;
        }
        if (!value) {
            throw new Error('statsViz.color: missing ' + name);
        }
        return value;
    }

    global.statsViz = { color: color };
})(window);
