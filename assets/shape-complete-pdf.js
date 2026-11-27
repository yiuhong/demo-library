/*
 * One-page PDF of a Guided Track completion card.
 *
 * The page builds the file itself: rules, a raster COMPLETED stamp,
 * and real text in the same OFL faces the card uses on screen. Nothing
 * is uploaded, and the attempt is not stored. Subsets and licenses live
 * in assets/fonts/shape-complete/. Anton Regular (SIL OFL 1.1) is the
 * stamp word. Fraunces, Source Serif 4, Caveat, and Cormorant SC are
 * the rest of the sheet. U+0020–U+007E.
 *
 * One palette and one stamp per topic. Track membership is read from
 * tracks.json. Tracks in a topic share that sheet. Omitting the track
 * id keeps the original Shape and pictures card, which is Describing data.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof root === "object" && root) root.ShapeCompletePdf = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    var FILENAME = "project-viz-shape-and-pictures-complete.pdf";
    var FONT_FILES = {
        display: "fraunces-560.ttf",
        score: "fraunces-500.ttf",
        text: "sourceserif-400.ttf",
        script: "caveat-500.ttf",
        caps: "cormorant.ttf",
        stamp: "anton-regular.ttf"
    };

    var fontDirectory = "";
    if (typeof document !== "undefined" && document.currentScript && document.currentScript.src) {
        fontDirectory = new URL("fonts/shape-complete/", document.currentScript.src).href;
    }

    var cached = null;
    var loading = null;

    function bytesOf(value) {
        if (value instanceof Uint8Array) return value;
        return new Uint8Array(value);
    }

    function concat(parts) {
        var length = 0;
        var i;
        for (i = 0; i < parts.length; i++) length += parts[i].length;
        var out = new Uint8Array(length);
        var offset = 0;
        for (i = 0; i < parts.length; i++) {
            out.set(parts[i], offset);
            offset += parts[i].length;
        }
        return out;
    }

    function latin1(text) {
        var out = new Uint8Array(text.length);
        var i;
        for (i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 255;
        return out;
    }

    function num(value) {
        var rounded = Math.round(value * 100) / 100;
        if (Object.is(rounded, -0)) rounded = 0;
        return String(rounded);
    }

    function rgb(hex) {
        var color = parseInt(hex.slice(1), 16);
        return num(((color >> 16) & 255) / 255) + " " +
            num(((color >> 8) & 255) / 255) + " " +
            num((color & 255) / 255);
    }

    function hex4(value) {
        var text = (value & 65535).toString(16).toUpperCase();
        while (text.length < 4) text = "0" + text;
        return text;
    }

    function pdfName(text) {
        var clean = String(text || "CompleteFont").replace(/[^A-Za-z0-9+\-]/g, "");
        return clean || "CompleteFont";
    }

    function u16(view, offset) {
        return view.getUint16(offset);
    }

    function i16(view, offset) {
        return view.getInt16(offset);
    }

    function tagAt(bytes, offset) {
        return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    }

    function tableMap(bytes, view) {
        var count = u16(view, 4);
        var tables = {};
        var i;
        for (i = 0; i < count; i++) {
            var record = 12 + i * 16;
            tables[tagAt(bytes, record)] = {
                offset: view.getUint32(record + 8),
                length: view.getUint32(record + 12)
            };
        }
        return tables;
    }

    function readName(bytes, view, table, nameId) {
        if (!table) return "";
        var offset = table.offset;
        var count = u16(view, offset + 2);
        var storage = offset + u16(view, offset + 4);
        var fallback = "";
        var i;
        for (i = 0; i < count; i++) {
            var record = offset + 6 + i * 12;
            var platform = u16(view, record);
            var encoding = u16(view, record + 2);
            var id = u16(view, record + 6);
            var length = u16(view, record + 8);
            var start = storage + u16(view, record + 10);
            if (id !== nameId) continue;
            var text = "";
            var k;
            if (platform === 3 || platform === 0) {
                for (k = 0; k + 1 < length; k += 2) text += String.fromCharCode(u16(view, start + k));
            } else {
                for (k = 0; k < length; k++) text += String.fromCharCode(bytes[start + k]);
            }
            if (platform === 3 && (encoding === 1 || encoding === 10)) return text;
            fallback = text;
        }
        return fallback;
    }

    function cmap4(view, offset) {
        var segCount = u16(view, offset + 6) / 2;
        var endOffset = offset + 14;
        var startOffset = endOffset + segCount * 2 + 2;
        var deltaOffset = startOffset + segCount * 2;
        var rangeOffset = deltaOffset + segCount * 2;
        var ends = [];
        var starts = [];
        var deltas = [];
        var ranges = [];
        var i;
        for (i = 0; i < segCount; i++) {
            ends.push(u16(view, endOffset + i * 2));
            starts.push(u16(view, startOffset + i * 2));
            deltas.push(i16(view, deltaOffset + i * 2));
            ranges.push(u16(view, rangeOffset + i * 2));
        }
        return function (code) {
            for (i = 0; i < segCount; i++) {
                if (code > ends[i]) continue;
                if (code < starts[i]) return 0;
                if (ranges[i] === 0) return (code + deltas[i]) & 65535;
                var glyphOffset = rangeOffset + i * 2 + ranges[i] + (code - starts[i]) * 2;
                var glyph = u16(view, glyphOffset);
                if (glyph === 0) return 0;
                return (glyph + deltas[i]) & 65535;
            }
            return 0;
        };
    }

    function parseFont(raw, serif) {
        var bytes = bytesOf(raw);
        var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        var tables = tableMap(bytes, view);
        function need(name) {
            if (!tables[name]) throw new Error("Font is missing " + name);
            return tables[name].offset;
        }
        var head = need("head");
        var units = u16(view, head + 18);
        var xMin = i16(view, head + 36);
        var yMin = i16(view, head + 38);
        var xMax = i16(view, head + 40);
        var yMax = i16(view, head + 42);
        var hhea = need("hhea");
        var ascent = i16(view, hhea + 4);
        var descent = i16(view, hhea + 6);
        var metrics = u16(view, hhea + 34);
        var glyphs = u16(view, need("maxp") + 4);
        var hmtx = need("hmtx");
        var advances = [];
        var last = 0;
        var g;
        for (g = 0; g < glyphs; g++) {
            if (g < metrics) last = u16(view, hmtx + g * 4);
            advances.push(last);
        }
        var cmapOffset = need("cmap");
        var encodings = u16(view, cmapOffset + 2);
        var chosen = -1;
        var e;
        for (e = 0; e < encodings; e++) {
            var record = cmapOffset + 4 + e * 8;
            var platform = u16(view, record);
            var encoding = u16(view, record + 2);
            var sub = view.getUint32(record + 4);
            var format = u16(view, cmapOffset + sub);
            if (format !== 4) continue;
            if (platform === 3 && encoding === 1) {
                chosen = cmapOffset + sub;
                break;
            }
            if (platform === 0 && chosen < 0) chosen = cmapOffset + sub;
        }
        if (chosen < 0) throw new Error("Font has no Unicode cmap");
        var glyphId = cmap4(view, chosen);
        var cap = Math.round(ascent * 0.7);
        if (tables["OS/2"] && tables["OS/2"].length >= 90 && u16(view, tables["OS/2"].offset) >= 2) {
            cap = i16(view, tables["OS/2"].offset + 88);
        }
        var italic = 0;
        if (tables.post) italic = view.getInt32(tables.post.offset + 4) / 65536;
        var scale = 1000 / units;
        function unitsOf(value) {
            return Math.round(value * scale);
        }
        var glyphWidths = [];
        for (g = 0; g < advances.length; g++) glyphWidths.push(unitsOf(advances[g]));
        var charWidths = [];
        var code;
        for (code = 32; code <= 126; code++) {
            var id = glyphId(code);
            charWidths.push(glyphWidths[id] || 0);
        }
        return {
            name: pdfName(readName(bytes, view, tables.name, 6)),
            bytes: bytes,
            serif: serif !== false,
            glyphId: glyphId,
            glyphWidths: glyphWidths,
            charWidths: charWidths,
            ascent: unitsOf(ascent),
            descent: unitsOf(descent),
            capHeight: unitsOf(cap),
            italicAngle: italic,
            bbox: [unitsOf(xMin), unitsOf(yMin), unitsOf(xMax), unitsOf(yMax)]
        };
    }

    function measure(text, size, font, trackingEm) {
        var width = 0;
        var tracking = (trackingEm || 0) * size;
        var i;
        for (i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var advance = code >= 32 && code <= 126 ? font.charWidths[code - 32] : 500;
            width += advance * size / 1000;
            if (i < text.length - 1) width += tracking;
        }
        return width;
    }

    function glyphHex(text, font) {
        var hex = "";
        var i;
        for (i = 0; i < text.length; i++) hex += hex4(font.glyphId(text.charCodeAt(i)) || 0);
        return "<" + hex + ">";
    }

    function showText(text, font, trackingEm) {
        if (!trackingEm) return glyphHex(text, font) + " Tj";
        var adjust = Math.round(-trackingEm * 1000);
        var parts = [];
        var i;
        for (i = 0; i < text.length; i++) {
            parts.push(glyphHex(text.charAt(i), font));
            if (i < text.length - 1) parts.push(String(adjust));
        }
        return "[" + parts.join(" ") + "] TJ";
    }

    function toUnicode(font) {
        var maps = [];
        var code;
        for (code = 32; code <= 126; code++) {
            var glyph = font.glyphId(code);
            if (!glyph) continue;
            maps.push("<" + hex4(glyph) + "> <" + hex4(code) + ">");
        }
        return [
            "/CIDInit /ProcSet findresource begin",
            "12 dict begin",
            "begincmap",
            "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
            "/CMapName /Adobe-Identity-UCS def",
            "/CMapType 2 def",
            "1 begincodespacerange",
            "<0000> <FFFF> endcodespacerange",
            maps.length + " beginbfchar",
            maps.join("\n"),
            "endbfchar",
            "endcmap",
            "CMapName currentdict /CMap defineresource pop",
            "end",
            "end"
        ].join("\n");
    }

    function widthArray(font) {
        var max = font.glyphWidths.length - 1;
        while (max > 0 && !font.glyphWidths[max]) max -= 1;
        var list = [];
        var i;
        for (i = 0; i <= max; i++) list.push(font.glyphWidths[i] || 0);
        return "0 [" + list.join(" ") + "]";
    }

    function streamObject(dict, data) {
        return concat([
            latin1("<< " + dict + " /Length " + data.length + " >>\nstream\n"),
            data,
            latin1("\nendstream")
        ]);
    }

    /*
     * The sheet matches the on-screen card, without the download control.
     * Rules are every 28px. The margin sits left of the type.
     */
    function cardStream(fonts, res, info, palette) {
        /*
         * Measured from the on-screen sheet at the review column width,
         * without the download control. The stamp sits under the date.
         * The sheet does not show the score.
         */
        var scale = 1.5;
        var cardW = 240;
        var trackName = info.track || "Shape and pictures";
        var finishLine = "You have finished the section:";
        function lineWidth(fontKey, text, sizePx, tracking) {
            return measure(text, sizePx * scale, fonts[fontKey], tracking || 0) / scale;
        }
        function wrap(fontKey, text, sizePx, maxPx, tracking) {
            var words = String(text).split(" ");
            var lines = [];
            var current = "";
            var i;
            for (i = 0; i < words.length; i++) {
                var trial = current ? current + " " + words[i] : words[i];
                if (current && lineWidth(fontKey, trial, sizePx, tracking) > maxPx) {
                    lines.push(current);
                    current = words[i];
                } else {
                    current = trial;
                }
            }
            if (current) lines.push(current);
            return lines.length ? lines : [""];
        }
        var contentW = cardW - 36;
        var finishLines = wrap("text", finishLine, 13, contentW, 0);
        var titleLines = wrap("display", trackName, 18, contentW, -0.02);
        var yFinish = 128;
        var finishGap = 17;
        var yTitle = yFinish + finishLines.length * finishGap + 14;
        var titleGap = 22;
        var yDate = yTitle + Math.max(0, titleLines.length - 1) * titleGap + 34;
        var stampImage = info.stampImage;
        var placeH = stampImage ? stampImage.placeH : 118;
        var placeW = stampImage ? stampImage.placeW : 118;
        var sealCx = cardW / 2;
        /*
         * Date baseline to the top of the stamp. Tuned to the sheet
         * after the score line was removed, so the mark sits under
         * the date without a spare band.
         */
        var stampTop = yDate + 14;
        var sealCy = stampTop + placeH / 2;
        var cardH = Math.ceil(sealCy + placeH / 2 + 78);
        var pageW = cardW * scale;
        var pageH = cardH * scale;
        function X(px) { return px * scale; }
        function Y(pxFromTop) { return pageH - pxFromTop * scale; }
        function S(px) { return px * scale; }
        var colors = palette || {};
        var ink = rgb("#241F1A");
        var navy = rgb(colors.date || "#3D4A62");
        var rule = rgb(colors.rule || "#D5E0EE");
        var margin = rgb(colors.margin || "#C96A6A");
        var paper = rgb(colors.paper || "#FBF7EE");
        var seal = rgb(colors.seal || "#7A3B3B");
        var ops = [];

        var notch = 48;
        var shoulder = cardH - notch;
        function bookmarkPath() {
            moveTo(0, 0);
            lineTo(cardW, 0);
            lineTo(cardW, shoulder);
            lineTo(cardW / 2, cardH);
            lineTo(0, shoulder);
            ops.push("h");
        }
        ops.push(paper + " rg");
        bookmarkPath();
        ops.push("f");
        ops.push(margin + " RG");
        ops.push(num(S(1.6)) + " w");
        ops.push("0 J");
        bookmarkPath();
        ops.push("S");

        function textAt(fontKey, text, xPx, baselinePx, sizePx, color, tracking, renderMode) {
            var font = fonts[fontKey];
            ops.push("BT");
            ops.push("/" + res[fontKey] + " " + num(S(sizePx)) + " Tf");
            if (renderMode != null) ops.push(num(renderMode) + " Tr");
            ops.push(color + " rg");
            ops.push("1 0 0 1 " + num(X(xPx)) + " " + num(Y(baselinePx)) + " Tm");
            ops.push(showText(text, font, tracking || 0));
            ops.push("ET");
            /* Tr is part of the graphics state and survives ET; reset after a non-default mode. */
            if (renderMode != null) ops.push("0 Tr");
        }

        function centerText(fontKey, text, baselinePx, sizePx, color, tracking) {
            var width = lineWidth(fontKey, text, sizePx, tracking || 0);
            textAt(fontKey, text, (cardW - width) / 2, baselinePx, sizePx, color, tracking || 0);
        }

        /* A small hole near the top, then the words stacked down the ribbon. */
        ops.push("1 1 1 rg");
        circle(sealCx, 28, 8);
        ops.push("f");
        ops.push(margin + " RG");
        ops.push(num(S(1.6)) + " w");
        circle(sealCx, 28, 8);
        ops.push("S");

        centerText("caps", "PROJECT VIZ", 62, 12, ink, 0.16);
        centerText("display", "Well done!", 98, 26, ink, -0.02);
        finishLines.forEach(function (line, index) {
            centerText("text", line, yFinish + index * finishGap, 13, ink, 0);
        });
        titleLines.forEach(function (line, index) {
            centerText("display", line, yTitle + index * titleGap, 18, ink, -0.02);
        });
        centerText("script", info.date, yDate, 20, navy, 0);

        var stamp = info.stamp || "circle";
        /*
         * Larger, more realistic rubber/wax stamps. Shared centre sits to
         * the right of the score, with a clear gap to long track titles,
         * the card edge, and the bottom. COMPLETED is set in a heavy
         * condensed gothic when that face is provided.
         */
        var sealSize = Math.min(placeW, 130);
        var circleOuter = 58;
        var circleInner = 51;
        var rectHalfW = 70;
        var rectHalfH = 36;
        var rectCorner = 11;
        var rectInset = 7;
        var starOuter = 72;
        var starInnerRatio = 0.55;
        var starCorner = 6;
        var starInset = 7;
        var ovalRx = 72;
        var ovalRy = 47;
        var ovalInset = 7;

        function circle(cx, cy, r) {
            var k = 0.5517847498;
            var px = X(cx);
            var py = Y(cy);
            var rr = S(r);
            var c = k * rr;
            ops.push(num(px + rr) + " " + num(py) + " m");
            ops.push(num(px + rr) + " " + num(py + c) + " " + num(px + c) + " " + num(py + rr) + " " + num(px) + " " + num(py + rr) + " c");
            ops.push(num(px - c) + " " + num(py + rr) + " " + num(px - rr) + " " + num(py + c) + " " + num(px - rr) + " " + num(py) + " c");
            ops.push(num(px - rr) + " " + num(py - c) + " " + num(px - c) + " " + num(py - rr) + " " + num(px) + " " + num(py - rr) + " c");
            ops.push(num(px + c) + " " + num(py - rr) + " " + num(px + rr) + " " + num(py - c) + " " + num(px + rr) + " " + num(py) + " c");
        }

        function ellipse(cx, cy, rx, ry) {
            var k = 0.5517847498;
            var px = X(cx);
            var py = Y(cy);
            var rxp = S(rx);
            var ryp = S(ry);
            var cxk = k * rxp;
            var cyk = k * ryp;
            ops.push(num(px + rxp) + " " + num(py) + " m");
            ops.push(num(px + rxp) + " " + num(py + cyk) + " " + num(px + cxk) + " " + num(py + ryp) + " " + num(px) + " " + num(py + ryp) + " c");
            ops.push(num(px - cxk) + " " + num(py + ryp) + " " + num(px - rxp) + " " + num(py + cyk) + " " + num(px - rxp) + " " + num(py) + " c");
            ops.push(num(px - rxp) + " " + num(py - cyk) + " " + num(px - cxk) + " " + num(py - ryp) + " " + num(px) + " " + num(py - ryp) + " c");
            ops.push(num(px + cxk) + " " + num(py - ryp) + " " + num(px + rxp) + " " + num(py - cyk) + " " + num(px + rxp) + " " + num(py) + " c");
        }

        function pt(x, y) {
            return num(X(x)) + " " + num(Y(y));
        }
        function moveTo(x, y) { ops.push(pt(x, y) + " m"); }
        function lineTo(x, y) { ops.push(pt(x, y) + " l"); }
        function curveTo(x1, y1, x2, y2, x3, y3) {
            ops.push(pt(x1, y1) + " " + pt(x2, y2) + " " + pt(x3, y3) + " c");
        }
        function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
        function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
        function mul(a, s) { return { x: a.x * s, y: a.y * s }; }
        function vecLen(a) { return Math.sqrt(a.x * a.x + a.y * a.y); }
        function norm(a) {
            var L = vecLen(a);
            return L ? { x: a.x / L, y: a.y / L } : { x: 0, y: 0 };
        }
        function dot(a, b) { return a.x * b.x + a.y * b.y; }

        function arcCorner(center, start, end, r) {
            var a0 = Math.atan2(start.y - center.y, start.x - center.x);
            var a1 = Math.atan2(end.y - center.y, end.x - center.x);
            var cr = (start.x - center.x) * (end.y - center.y) - (start.y - center.y) * (end.x - center.x);
            var sweep = a1 - a0;
            while (sweep <= -Math.PI) sweep += 2 * Math.PI;
            while (sweep > Math.PI) sweep -= 2 * Math.PI;
            if (cr > 0 && sweep < 0) sweep += 2 * Math.PI;
            if (cr < 0 && sweep > 0) sweep -= 2 * Math.PI;
            var segments = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
            var s;
            for (s = 0; s < segments; s++) {
                var t0 = a0 + sweep * (s / segments);
                var t1 = a0 + sweep * ((s + 1) / segments);
                var ph = t1 - t0;
                var k = (4 / 3) * Math.tan(ph / 4);
                var p0x = center.x + r * Math.cos(t0);
                var p0y = center.y + r * Math.sin(t0);
                var p3x = center.x + r * Math.cos(t1);
                var p3y = center.y + r * Math.sin(t1);
                curveTo(
                    p0x - k * r * Math.sin(t0),
                    p0y + k * r * Math.cos(t0),
                    p3x + k * r * Math.sin(t1),
                    p3y - k * r * Math.cos(t1),
                    p3x,
                    p3y
                );
            }
        }

        function roundedPolygon(vertices, radius) {
            var n = vertices.length;
            var corners = [];
            var i;
            for (i = 0; i < n; i++) {
                var prev = vertices[(i + n - 1) % n];
                var p = vertices[i];
                var next = vertices[(i + 1) % n];
                var inDir = norm(sub(p, prev));
                var outDir = norm(sub(next, p));
                var back = { x: -inDir.x, y: -inDir.y };
                var cosA = Math.max(-1, Math.min(1, dot(back, outDir)));
                var interior = Math.acos(cosA);
                var r = radius;
                var cut = r / Math.tan(interior / 2);
                var maxCut = Math.min(vecLen(sub(p, prev)), vecLen(sub(next, p))) * 0.45;
                if (cut > maxCut) {
                    cut = maxCut;
                    r = cut * Math.tan(interior / 2);
                }
                var start = sub(p, mul(inDir, cut));
                var end = add(p, mul(outDir, cut));
                var bisector = norm(add(back, outDir));
                var center = add(p, mul(bisector, r / Math.sin(interior / 2)));
                corners.push({ start: start, end: end, center: center, r: r });
            }
            moveTo(corners[0].start.x, corners[0].start.y);
            for (i = 0; i < n; i++) {
                var c = corners[i];
                arcCorner(c.center, c.start, c.end, c.r);
                var nxt = corners[(i + 1) % n];
                lineTo(nxt.start.x, nxt.start.y);
            }
        }

        function rectVertices(cx, cy, halfW, halfH) {
            return [
                { x: cx - halfW, y: cy - halfH },
                { x: cx + halfW, y: cy - halfH },
                { x: cx + halfW, y: cy + halfH },
                { x: cx - halfW, y: cy + halfH }
            ];
        }

        function starVertices(cx, cy, outer, inner) {
            var pts = [];
            var i;
            for (i = 0; i < 10; i++) {
                var radius = (i % 2 === 0) ? outer : inner;
                var a = -Math.PI / 2 + i * Math.PI / 5;
                pts.push({
                    x: cx + radius * Math.cos(a),
                    y: cy + radius * Math.sin(a)
                });
            }
            return pts;
        }

        function drawStamp(kind, role) {
            var inner = role === "inner";
            if (kind === "circle") {
                circle(sealCx, sealCy, inner ? circleInner : circleOuter);
                return;
            }
            if (kind === "oval") {
                ellipse(
                    sealCx,
                    sealCy,
                    inner ? ovalRx - ovalInset : ovalRx,
                    inner ? ovalRy - ovalInset : ovalRy
                );
                return;
            }
            if (kind === "roundedRect") {
                var hw = inner ? rectHalfW - rectInset : rectHalfW;
                var hh = inner ? rectHalfH - rectInset : rectHalfH;
                var cr = inner ? Math.max(1, rectCorner - rectInset) : rectCorner;
                roundedPolygon(rectVertices(sealCx, sealCy, hw, hh), cr);
                return;
            }
            if (kind === "star") {
                var ro = inner ? starOuter - starInset : starOuter;
                var ri = ro * starInnerRatio;
                var cs = inner ? starCorner * ((starOuter - starInset) / starOuter) : starCorner;
                roundedPolygon(starVertices(sealCx, sealCy, ro, ri), cs);
                return;
            }
            circle(sealCx, sealCy, inner ? circleInner : circleOuter);
        }

        var sealWord = "COMPLETED";
        var sealFontKey = fonts.stamp ? "stamp" : "caps";
        var sealFont = fonts[sealFontKey];

        if (info.stampImage) {
            var img = info.stampImage;
            var imgCx = sealCx;
            var imgCy = sealCy;
            var pdfX = X(imgCx - placeW / 2);
            var pdfY = Y(imgCy + placeH / 2);
            var pdfW = S(placeW);
            var pdfH = S(placeH);
            ops.push("q");
            ops.push(num(pdfW) + " 0 0 " + num(pdfH) + " " + num(pdfX) + " " + num(pdfY) + " cm");
            ops.push("/ImStamp Do");
            ops.push("Q");
            /* Invisible COMPLETED so the file still has extractable text. */
            var hideSize = 18;
            var hideWidth = measure(sealWord, S(hideSize), sealFont, 0);
            textAt(sealFontKey, sealWord, imgCx - hideWidth / S(1) / 2, imgCy, hideSize, seal, 0, 3);
        } else {
            ops.push(seal + " RG");
            ops.push("1 J");
            ops.push("[] 0 d");
            ops.push(num(S(2.2 / 100 * sealSize)) + " w");
            drawStamp(stamp, "outer");
            ops.push("s");
            ops.push("[" + num(S(1.6 / 100 * sealSize)) + " " + num(S(1.8 / 100 * sealSize)) + "] 0 d");
            ops.push(num(Math.max(0.8, S(0.9 / 100 * sealSize))) + " w");
            drawStamp(stamp, "inner");
            ops.push("s");
            ops.push("[] 0 d");

            var sealFontSize = 18;
            var sealTracking = -0.015;
            var sealWidth = measure(sealWord, S(sealFontSize), sealFont, sealTracking);
            var capPx = (sealFont.capHeight || 700) / 1000 * sealFontSize;
            var sealBaseline = sealCy + capPx * 0.5;
            if (stamp === "star") sealBaseline -= 5;
            textAt(sealFontKey, sealWord, sealCx - sealWidth / S(1) / 2, sealBaseline, sealFontSize, seal, sealTracking);
        }


        return {
            width: pageW,
            height: pageH,
            stream: ops.join("\n")
        };
    }

    function fontObjects(font, ids) {
        var flags = font.serif ? 34 : 32;
        var type0 = "<< /Type /Font /Subtype /Type0 /BaseFont /" + font.name +
            " /Encoding /Identity-H /DescendantFonts [" + ids.cid + " 0 R] /ToUnicode " +
            ids.uni + " 0 R >>";
        var cid = "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /" + font.name +
            " /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >>" +
            " /FontDescriptor " + ids.desc + " 0 R /CIDToGIDMap /Identity /DW " +
            (font.charWidths[0] || 500) + " /W [" + widthArray(font) + "] >>";
        var bbox = font.bbox.join(" ");
        var desc = "<< /Type /FontDescriptor /FontName /" + font.name +
            " /Flags " + flags + " /FontBBox [" + bbox + "] /ItalicAngle " + num(font.italicAngle) +
            " /Ascent " + font.ascent + " /Descent " + font.descent +
            " /CapHeight " + font.capHeight + " /StemV " + (font.serif ? 90 : 70) +
            " /FontFile2 " + ids.file + " 0 R >>";
        return {
            type0: latin1(type0),
            cid: latin1(cid),
            desc: latin1(desc),
            file: streamObject("/Length1 " + font.bytes.length, font.bytes),
            uni: streamObject("", latin1(toUnicode(font)))
        };
    }

    function deflateBytes(bytes) {
        var input = bytesOf(bytes);
        if (typeof require === "function") {
            try {
                var zlib = require("zlib");
                var out = zlib.deflateSync(Buffer.from(input.buffer, input.byteOffset, input.byteLength));
                return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
            } catch (error) {
                /* The browser has no Node zlib. Stamps are compressed in load(). */
            }
        }
        throw new Error("Stamp image is not compressed");
    }

    function imageObjects(img, imageId, smaskId) {
        var rgb = img.rgbDeflated ? bytesOf(img.rgbDeflated) : deflateBytes(img.rgb);
        var alpha = img.alphaDeflated ? bytesOf(img.alphaDeflated) : deflateBytes(img.alpha);
        var image = streamObject(
            "/Type /XObject /Subtype /Image /Width " + img.width + " /Height " + img.height +
            " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask " + smaskId + " 0 R",
            rgb
        );
        var smask = streamObject(
            "/Type /XObject /Subtype /Image /Width " + img.width + " /Height " + img.height +
            " /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode",
            alpha
        );
        return { image: image, smask: smask };
    }

    function assemble(bodies) {
        var chunks = [];
        var offset = 0;
        function push(part) {
            chunks.push(part);
            offset += part.length;
        }
        push(latin1("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"));
        var offsets = [0];
        var i;
        for (i = 0; i < bodies.length; i++) {
            offsets.push(offset);
            push(latin1((i + 1) + " 0 obj\n"));
            push(bodies[i]);
            push(latin1("\nendobj\n"));
        }
        var xrefAt = offset;
        var xref = "xref\n0 " + (bodies.length + 1) + "\n0000000000 65535 f \n";
        for (i = 1; i < offsets.length; i++) {
            var pos = String(offsets[i]);
            while (pos.length < 10) pos = "0" + pos;
            xref += pos + " 00000 n \n";
        }
        xref += "trailer\n<< /Size " + (bodies.length + 1) + " /Root 1 0 R /Info " +
            bodies.length + " 0 R >>\nstartxref\n" + xrefAt + "\n%%EOF\n";
        push(latin1(xref));
        return concat(chunks);
    }

    function build(info, rawFonts, palette) {
        info = info || {};
        var topicId = resolvedTopic(info);
        var colors = palette || info.palette || paletteFor(topicId);
        var stampMeta = STAMP_META[topicId] || STAMP_META["describing-data"];
        var stampImage = info.stampImage || (stampImages && stampImages[topicId]) || null;
        var fonts = {
            display: parseFont(rawFonts.display, true),
            score: parseFont(rawFonts.score, true),
            text: parseFont(rawFonts.text, true),
            script: parseFont(rawFonts.script, false),
            caps: parseFont(rawFonts.caps, true)
        };
        var keys = ["display", "score", "text", "script", "caps"];
        if (rawFonts.stamp) {
            fonts.stamp = parseFont(rawFonts.stamp, false);
            keys = keys.concat(["stamp"]);
        }
        var ids = {};
        var next = 5;
        keys.forEach(function (key) {
            ids[key] = {
                type0: next,
                cid: next + 1,
                desc: next + 2,
                file: next + 3,
                uni: next + 4
            };
            next += 5;
        });
        var infoId = next;
        var res = {};
        keys.forEach(function (key, index) {
            res[key] = "F" + (index + 1);
        });
        var card = cardStream(fonts, res, {
            date: String(info.date || ""),
            track: info.track,
            stamp: info.stamp || stampMeta.stamp,
            stampImage: stampImage
        }, colors);
        var fontRes = keys.map(function (key, index) {
            return "/F" + (index + 1) + " " + ids[key].type0 + " 0 R";
        }).join(" ");
        var imageId = 0;
        var smaskId = 0;
        var xobjRes = "";
        if (stampImage) {
            imageId = infoId;
            smaskId = infoId + 1;
            infoId = infoId + 2;
            xobjRes = " /XObject << /ImStamp " + imageId + " 0 R >>";
        }
        var bodies = [];
        bodies[0] = latin1("<< /Type /Catalog /Pages 2 0 R >>");
        bodies[1] = latin1("<< /Type /Pages /Count 1 /Kids [3 0 R] >>");
        bodies[2] = latin1(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + num(card.width) + " " + num(card.height) +
            "] /Contents 4 0 R /Resources << /Font << " + fontRes + " >>" + xobjRes + " >> >>"
        );
        bodies[3] = streamObject("", latin1(card.stream));
        keys.forEach(function (key) {
            var made = fontObjects(fonts[key], ids[key]);
            bodies[ids[key].type0 - 1] = made.type0;
            bodies[ids[key].cid - 1] = made.cid;
            bodies[ids[key].desc - 1] = made.desc;
            bodies[ids[key].file - 1] = made.file;
            bodies[ids[key].uni - 1] = made.uni;
        });
        if (stampImage) {
            var madeImg = imageObjects(stampImage, imageId, smaskId);
            bodies[imageId - 1] = madeImg.image;
            bodies[smaskId - 1] = madeImg.smask;
        }
        var trackName = info.track || "Shape and pictures";
        var docTitle = pdfLiteral("Project Viz - " + trackName);
        bodies[infoId - 1] = latin1(
            "<< /Title (" + docTitle + ") /Creator (Project Viz) /Producer (Project Viz) >>"
        );
        return assemble(bodies);
    }

    function load() {
        if (cached && stampImages && trackTopic) return Promise.resolve(cached);
        if (loading) return loading;
        if (!fontDirectory) return Promise.reject(new Error("Font directory is missing"));
        loading = Promise.all([loadFonts(), loadStamps(), fetchTopics()]).then(function (parts) {
            cached = parts[0];
            loading = null;
            return cached;
        }).catch(function (error) {
            loading = null;
            throw error;
        });
        return loading;
    }

    function pdfLiteral(text) {
        return String(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    }

    function save(bytes, filename) {
        var blob = new Blob([bytes], { type: "application/pdf" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = filename || FILENAME;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }

    /*
     * Topic color and stamp geometry. Track membership is not listed
     * here. load() reads it from tracks.json. Place sizes and centres
     * match assets/stamps/stamps.json. The sheet is CARD_W by CARD_H.
     */
    var CARD_W = 240;
    var CARD_H = 680;
    var PALETTES = {
        "describing-data": {
            paper: "#FBF7EE",
            rule: "#D5E0EE",
            margin: "#C96A6A",
            seal: "#7A3B3B",
            date: "#3D4A62",
            soft: "#5A534C"
        },
        "probability-and-sampling": {
            paper: "#F4F6FA",
            rule: "#D3DCEB",
            margin: "#5C73A8",
            seal: "#33416C",
            date: "#3D4A62",
            soft: "#53565C"
        },
        "comparing-means": {
            paper: "#F4F6F1",
            rule: "#D2DDD0",
            margin: "#3F6B52",
            seal: "#244033",
            date: "#2A4034",
            soft: "#4C554E"
        },
        association: {
            paper: "#F8F3F5",
            rule: "#E4D4DA",
            margin: "#8E4E6A",
            seal: "#5A2E42",
            date: "#4A3040",
            soft: "#585056"
        }
    };
    var STAMP_META = {
        "describing-data": {
            stamp: "circle",
            width: 1080,
            height: 1080,
            placeW: 135,
            placeH: 135,
            cx: 492,
            cy: 204.5
        },
        "probability-and-sampling": {
            stamp: "roundedRect",
            width: 1121,
            height: 573,
            placeW: 140.125,
            placeH: 71.625,
            cx: 492,
            cy: 206
        },
        "comparing-means": {
            stamp: "star",
            width: 1281,
            height: 1264,
            placeW: 160.125,
            placeH: 158,
            cx: 485.9375,
            cy: 193
        },
        association: {
            stamp: "oval",
            width: 1212,
            height: 676,
            placeW: 151.5,
            placeH: 84.5,
            cx: 490.25,
            cy: 206
        }
    };

    var trackTopic = null;
    var topicsPromise = null;
    var stampImages = null;

    function paletteFor(topicId) {
        return PALETTES[topicId] || PALETTES["describing-data"];
    }

    function resolvedTopic(info) {
        if (info.topicId && PALETTES[info.topicId]) return info.topicId;
        if (info.trackId && trackTopic && PALETTES[trackTopic[info.trackId]]) {
            return trackTopic[info.trackId];
        }
        return "describing-data";
    }

    function stampPngUrl(topicId) {
        if (!fontDirectory) return "";
        return new URL("../../stamps/" + topicId + ".png", fontDirectory).href;
    }

    function tracksJsonUrl() {
        if (!fontDirectory) return "";
        return new URL("../../../tracks.json", fontDirectory).href;
    }

    function fetchTopics() {
        if (trackTopic) return Promise.resolve(trackTopic);
        if (topicsPromise) return topicsPromise;
        var url = tracksJsonUrl();
        if (!url) return Promise.reject(new Error("Topic list is missing"));
        topicsPromise = fetch(url).then(function (response) {
            if (!response.ok) throw new Error("Topic list failed to load");
            return response.json();
        }).then(function (data) {
            var map = {};
            var topics = data && data.topics || [];
            var i;
            var j;
            for (i = 0; i < topics.length; i++) {
                var topic = topics[i];
                if (!topic || !PALETTES[topic.id]) continue;
                var ids = topic.tracks || [];
                for (j = 0; j < ids.length; j++) map[ids[j]] = topic.id;
            }
            trackTopic = map;
            topicsPromise = null;
            return map;
        }).catch(function (error) {
            topicsPromise = null;
            throw error;
        });
        return topicsPromise;
    }

    function applyCard(card, trackId) {
        function paint() {
            var topicId = "describing-data";
            if (trackId) {
                if (!trackTopic || !PALETTES[trackTopic[trackId]]) return;
                topicId = trackTopic[trackId];
            }
            var palette = paletteFor(topicId);
            var stamp = STAMP_META[topicId];
            card.style.setProperty("--complete-paper", palette.paper);
            card.style.setProperty("--complete-rule", palette.rule);
            card.style.setProperty("--complete-margin", palette.margin);
            card.style.setProperty("--complete-date", palette.date);
            card.style.setProperty("--complete-soft", palette.soft);
            card.setAttribute("data-topic", topicId);
            if (stamp) {
                card.style.setProperty("--stamp-x", ((stamp.cx - stamp.placeW / 2) / CARD_W * 100) + "%");
                card.style.setProperty("--stamp-y", ((stamp.cy - stamp.placeH / 2) / CARD_H * 100) + "%");
                card.style.setProperty("--stamp-w", (stamp.placeW / CARD_W * 100) + "%");
                card.style.setProperty("--stamp-h", (stamp.placeH / CARD_H * 100) + "%");
            }
            var img = card.querySelector(".complete-seal-img");
            var url = stampPngUrl(topicId);
            if (img && url && img.getAttribute("src") !== url) img.src = url;
        }
        if (!trackId || (trackTopic && trackTopic[trackId])) paint();
        else fetchTopics().then(paint).catch(function () {});
    }

    function paeth(a, b, c) {
        var p = a + b - c;
        var pa = Math.abs(p - a);
        var pb = Math.abs(p - b);
        var pc = Math.abs(p - c);
        if (pa <= pb && pa <= pc) return a;
        if (pb <= pc) return b;
        return c;
    }

    function inflateZlib(bytes) {
        var input = bytesOf(bytes);
        if (typeof DecompressionStream === "function") {
            var stream = new Blob([input]).stream().pipeThrough(new DecompressionStream("deflate"));
            return new Response(stream).arrayBuffer().then(function (buf) {
                return new Uint8Array(buf);
            });
        }
        if (typeof require === "function") {
            var zlib = require("zlib");
            var out = zlib.inflateSync(Buffer.from(input.buffer, input.byteOffset, input.byteLength));
            return Promise.resolve(new Uint8Array(out.buffer, out.byteOffset, out.byteLength));
        }
        return Promise.reject(new Error("Cannot inflate stamp"));
    }

    function deflateAsync(bytes) {
        var input = bytesOf(bytes);
        if (typeof CompressionStream === "function") {
            var stream = new Blob([input]).stream().pipeThrough(new CompressionStream("deflate"));
            return new Response(stream).arrayBuffer().then(function (buf) {
                return new Uint8Array(buf);
            });
        }
        if (typeof require === "function") {
            var zlib = require("zlib");
            var out = zlib.deflateSync(Buffer.from(input.buffer, input.byteOffset, input.byteLength));
            return Promise.resolve(new Uint8Array(out.buffer, out.byteOffset, out.byteLength));
        }
        return Promise.reject(new Error("Cannot compress stamp"));
    }

    function decodePng(bytes) {
        var data = bytesOf(bytes);
        if (data.length < 8 || data[0] !== 137 || data[1] !== 80) throw new Error("Stamp is not a PNG");
        var view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        var offset = 8;
        var width = 0;
        var height = 0;
        var idat = [];
        while (offset + 12 <= data.length) {
            var length = view.getUint32(offset);
            var type = tagAt(data, offset + 4);
            var start = offset + 8;
            if (start + length + 4 > data.length) throw new Error("Stamp PNG is truncated");
            if (type === "IHDR") {
                width = view.getUint32(start);
                height = view.getUint32(start + 4);
                if (data[start + 8] !== 8 || data[start + 9] !== 6 || data[start + 12] !== 0) {
                    throw new Error("Unsupported stamp PNG");
                }
            } else if (type === "IDAT") {
                idat.push(data.subarray(start, start + length));
            } else if (type === "IEND") {
                break;
            }
            offset = start + length + 4;
        }
        if (!width || !height || !idat.length) throw new Error("Stamp PNG is incomplete");
        return inflateZlib(concat(idat)).then(function (raw) {
            var stride = width * 4;
            var rowBytes = stride + 1;
            if (raw.length < height * rowBytes) throw new Error("Stamp PNG data is short");
            var rgb = new Uint8Array(width * height * 3);
            var alpha = new Uint8Array(width * height);
            var prev = new Uint8Array(stride);
            var row = new Uint8Array(stride);
            var src = 0;
            var y;
            var x;
            var i;
            for (y = 0; y < height; y++) {
                var filter = raw[src++];
                for (i = 0; i < stride; i++) {
                    var v = raw[src++];
                    var left = i >= 4 ? row[i - 4] : 0;
                    var up = prev[i];
                    var ul = i >= 4 ? prev[i - 4] : 0;
                    if (filter === 1) v = (v + left) & 255;
                    else if (filter === 2) v = (v + up) & 255;
                    else if (filter === 3) v = (v + ((left + up) >> 1)) & 255;
                    else if (filter === 4) v = (v + paeth(left, up, ul)) & 255;
                    else if (filter !== 0) throw new Error("Bad PNG filter");
                    row[i] = v;
                }
                for (x = 0; x < width; x++) {
                    var pixel = y * width + x;
                    var sample = x * 4;
                    rgb[pixel * 3] = row[sample];
                    rgb[pixel * 3 + 1] = row[sample + 1];
                    rgb[pixel * 3 + 2] = row[sample + 2];
                    alpha[pixel] = row[sample + 3];
                }
                prev.set(row);
            }
            return { width: width, height: height, rgb: rgb, alpha: alpha };
        });
    }

    function loadStamps() {
        var ids = Object.keys(STAMP_META);
        return Promise.all(ids.map(function (id) {
            return fetch(stampPngUrl(id)).then(function (response) {
                if (!response.ok) throw new Error("Stamp failed to load");
                return response.arrayBuffer();
            }).then(function (buffer) {
                return decodePng(new Uint8Array(buffer));
            }).then(function (image) {
                var meta = STAMP_META[id];
                if (image.width !== meta.width || image.height !== meta.height) {
                    throw new Error("Stamp size mismatch");
                }
                return Promise.all([deflateAsync(image.rgb), deflateAsync(image.alpha)]).then(function (pair) {
                    return {
                        id: id,
                        image: {
                            width: image.width,
                            height: image.height,
                            rgbDeflated: pair[0],
                            alphaDeflated: pair[1],
                            placeW: meta.placeW,
                            placeH: meta.placeH,
                            cx: meta.cx,
                            cy: meta.cy,
                            stamp: meta.stamp
                        }
                    };
                });
            });
        })).then(function (list) {
            var map = {};
            list.forEach(function (item) { map[item.id] = item.image; });
            stampImages = map;
            return map;
        });
    }

    function loadFonts() {
        var keys = Object.keys(FONT_FILES);
        return Promise.all(keys.map(function (key) {
            return fetch(fontDirectory + FONT_FILES[key]).then(function (response) {
                if (!response.ok) throw new Error("Font failed to load");
                return response.arrayBuffer();
            }).then(function (buffer) {
                return { key: key, bytes: new Uint8Array(buffer) };
            });
        })).then(function (list) {
            var fonts = {};
            list.forEach(function (item) { fonts[item.key] = item.bytes; });
            return fonts;
        });
    }

    if (typeof document !== "undefined" && fontDirectory) fetchTopics();

    return {
        filename: FILENAME,
        parseFont: parseFont,
        measure: measure,
        build: build,
        load: load,
        ready: function () { return cached && stampImages && trackTopic ? cached : null; },
        save: save,
        applyCard: applyCard
    };
});
