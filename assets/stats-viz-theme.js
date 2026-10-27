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

    function channels(token) {
        var value = color(token).replace(/\s+/g, '');
        var hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (hex) {
            var h = hex[1];
            if (h.length === 3) {
                h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
            }
            return [
                parseInt(h.slice(0, 2), 16),
                parseInt(h.slice(2, 4), 16),
                parseInt(h.slice(4, 6), 16)
            ];
        }
        var rgb = value.match(/^rgba?\((\d+),(\d+),(\d+)/i);
        if (rgb) {
            return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
        }
        throw new Error('statsViz.rgba: cannot parse ' + value);
    }

    function rgba(token, alpha) {
        var c = channels(token);
        return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')';
    }

    /* Ordered pile of the same kind of term (each Zᵢ in one χ² draw).
       Skips mean / residual / null / reference so a component cannot
       impersonate those roles. */
    var SERIES_CYCLE = [
        '--viz-group-a',
        '--viz-group-b',
        '--viz-group-c',
        '--viz-explained',
        '--viz-se',
        '--viz-median',
        '--viz-density',
        '--viz-mode',
        '--viz-level-f',
        '--viz-level-m',
        '--viz-subject-1',
        '--viz-subject-2',
        '--viz-subject-3',
        '--viz-subject-4',
        '--viz-subject-5',
        '--viz-subject-6'
    ];

    function series(index) {
        var i = Math.abs(Number(index) || 0) % SERIES_CYCLE.length;
        return color(SERIES_CYCLE[i]);
    }

    function subject(index) {
        var n = (Math.abs(Number(index) || 0) % 6) + 1;
        return color('--viz-subject-' + n);
    }

    global.statsViz = { color: color, rgba: rgba, series: series, subject: subject };
})(window);
