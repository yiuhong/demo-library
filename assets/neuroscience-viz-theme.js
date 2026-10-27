/*
 * Read a --viz-* token from assets/neuroscience-viz-theme.css.
 * Returns a concrete CSS colour (rgb / rgba) so canvas and Chart.js stay on
 * the same source of truth as the stylesheet. var() aliases are followed,
 * then color-mix() / hex values are resolved through a probe element.
 * getComputedStyle on a custom property returns the specified value, which
 * canvas cannot paint.
 */
(function (global) {
    var probe = null;

    function tokenName(token) {
        if (!token) {
            throw new Error('neuroViz.color: missing token');
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

    function probeEl() {
        if (!probe) {
            probe = global.document.createElement('span');
            probe.setAttribute('data-neuro-viz-probe', '');
            probe.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;';
            global.document.documentElement.appendChild(probe);
        }
        return probe;
    }

    function toRgba(computed) {
        var srgb = String(computed).match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i);
        if (srgb) {
            var r = Math.round(parseFloat(srgb[1]) * 255);
            var g = Math.round(parseFloat(srgb[2]) * 255);
            var b = Math.round(parseFloat(srgb[3]) * 255);
            var a = srgb[4] == null ? 1 : parseFloat(srgb[4]);
            return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
        }
        var rgb = String(computed).match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
        if (rgb) {
            var ra = rgb[4] == null ? 1 : parseFloat(rgb[4]);
            return 'rgba(' + Math.round(parseFloat(rgb[1])) + ', ' + Math.round(parseFloat(rgb[2])) + ', ' + Math.round(parseFloat(rgb[3])) + ', ' + ra + ')';
        }
        return computed;
    }

    function resolveToRgb(specified) {
        var el = probeEl();
        el.style.color = 'transparent';
        el.style.color = specified;
        return toRgba(global.getComputedStyle(el).color);
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
            throw new Error('neuroViz.color: missing ' + name);
        }
        var resolved = resolveToRgb(value);
        if (!resolved || resolved === 'rgba(0, 0, 0, 0)') {
            throw new Error('neuroViz.color: could not resolve ' + name);
        }
        return resolved;
    }

    function alpha(resolved, amount) {
        var parts = String(resolved).match(/[\d.]+/g);
        if (!parts || parts.length < 3) {
            throw new Error('neuroViz.alpha: expected an rgb colour');
        }
        var clamped = Math.max(0, Math.min(1, Number(amount)));
        return 'rgba(' + Math.round(Number(parts[0])) + ', ' + Math.round(Number(parts[1])) + ', ' + Math.round(Number(parts[2])) + ', ' + clamped + ')';
    }

    function withAlpha(token, amount) {
        return alpha(color(token), amount);
    }

    global.neuroViz = { color: color, alpha: alpha, withAlpha: withAlpha };
})(window);
