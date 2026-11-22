/*
 * One-page PDF of the Shape and pictures completion card.
 *
 * The page builds the file itself: vector rules, a vector seal, and
 * real text in the same OFL faces the card uses on screen. Nothing is
 * uploaded, and the attempt is not stored. Subsets and licenses live
 * in assets/fonts/shape-complete/.
 *
 * Fraunces, Source Serif 4, Caveat, and Cormorant SC. U+0020–U+007E.
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
        caps: "cormorant.ttf"
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
    function cardStream(fonts, res, info) {
        /*
         * Measured from the on-screen sheet at the review column width,
         * without the download control. The score sits with the seal,
         * a short gap under the date.
         */
        var scale = 1.2;
        var cardW = 574;
        var cardH = 278;
        var pageW = cardW * scale;
        var pageH = cardH * scale;
        function X(px) { return px * scale; }
        function Y(pxFromTop) { return pageH - pxFromTop * scale; }
        function S(px) { return px * scale; }
        var ink = rgb("#241F1A");
        var soft = rgb("#5A534C");
        var navy = rgb("#3D4A62");
        var rule = rgb("#D5E0EE");
        var margin = rgb("#C96A6A");
        var paper = rgb("#FBF7EE");
        var seal = rgb("#7A3B3B");
        var ops = [];

        ops.push(paper + " rg");
        ops.push("0 0 " + num(pageW) + " " + num(pageH) + " re");
        ops.push("f");

        ops.push(rule + " RG");
        ops.push(num(S(1)) + " w");
        ops.push("0 J");
        var rulePx;
        for (rulePx = 28; rulePx < cardH; rulePx += 28) {
            var ruleY = Y(rulePx);
            ops.push("0 " + num(ruleY) + " m " + num(pageW) + " " + num(ruleY) + " l S");
        }

        ops.push(margin + " RG");
        ops.push(num(S(2)) + " w");
        var marginX = X(42);
        ops.push(num(marginX) + " 0 m " + num(marginX) + " " + num(pageH) + " l S");

        function textAt(fontKey, text, xPx, baselinePx, sizePx, color, tracking) {
            var font = fonts[fontKey];
            ops.push("BT");
            ops.push("/" + res[fontKey] + " " + num(S(sizePx)) + " Tf");
            ops.push(color + " rg");
            ops.push("1 0 0 1 " + num(X(xPx)) + " " + num(Y(baselinePx)) + " Tm");
            ops.push(showText(text, font, tracking || 0));
            ops.push("ET");
        }

        /*
         * Baselines are the distance from the top of the sheet, tuned
         * to the same sizes and gaps as the on-screen card.
         */
        /*
         * The track name defaults to Shape and pictures, which is the
         * call the original page makes. A later track passes its own
         * title. Every current title fits on this line at the same size.
         */
        var trackName = info.track || "Shape and pictures";
        textAt("caps", "PROJECT VIZ", 58, 35, 13, ink, 0.18);
        textAt("display", "Well done!", 58, 67, 28, ink, -0.02);
        textAt("text", "You have finished the track:", 58, 96, 16, ink, 0);
        textAt("display", trackName, 58, 121, 20, ink, -0.02);
        textAt("script", info.date, 58, 150, 22, navy, 0);

        var sealSize = 86;
        var sealLeft = 470;
        var sealTop = 170;
        var sealCx = sealLeft + sealSize / 2;
        var sealCy = sealTop + sealSize / 2;
        var outerR = 47 / 100 * sealSize;
        var innerR = 41 / 100 * sealSize;

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

        ops.push(seal + " RG");
        ops.push("1 J");
        ops.push("[] 0 d");
        ops.push(num(S(2.2 / 100 * sealSize)) + " w");
        circle(sealCx, sealCy, outerR);
        ops.push("s");
        ops.push("[" + num(S(1.6 / 100 * sealSize)) + " " + num(S(1.8 / 100 * sealSize)) + "] 0 d");
        ops.push(num(Math.max(0.8, S(0.9 / 100 * sealSize))) + " w");
        circle(sealCx, sealCy, innerR);
        ops.push("s");
        ops.push("[] 0 d");

        var sealWord = "Complete";
        var sealFontSize = 13.5;
        var sealWidth = measure(sealWord, S(sealFontSize), fonts.score, 0.01);
        textAt("score", sealWord, sealCx - sealWidth / S(1) / 2, sealCy + sealFontSize * 0.34, sealFontSize, seal, 0.01);

        var scoreText = String(info.score);
        var scoreSize = 42;
        var ofSize = 20;
        var scoreBaseline = 225;
        textAt("score", scoreText, 58, scoreBaseline, scoreSize, ink, -0.03);
        var scoreWidth = measure(scoreText, S(scoreSize), fonts.score, -0.03);
        textAt("score", "/10", 58 + scoreWidth / scale, scoreBaseline, ofSize, soft, -0.02);

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

    function build(info, rawFonts) {
        var fonts = {
            display: parseFont(rawFonts.display, true),
            score: parseFont(rawFonts.score, true),
            text: parseFont(rawFonts.text, true),
            script: parseFont(rawFonts.script, false),
            caps: parseFont(rawFonts.caps, true)
        };
        var keys = ["display", "score", "text", "script", "caps"];
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
            score: info.score,
            track: info.track
        });
        var fontRes = keys.map(function (key, index) {
            return "/F" + (index + 1) + " " + ids[key].type0 + " 0 R";
        }).join(" ");
        var bodies = [];
        bodies[0] = latin1("<< /Type /Catalog /Pages 2 0 R >>");
        bodies[1] = latin1("<< /Type /Pages /Count 1 /Kids [3 0 R] >>");
        bodies[2] = latin1(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + num(card.width) + " " + num(card.height) +
            "] /Contents 4 0 R /Resources << /Font << " + fontRes + " >> >> >>"
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
        var trackName = info.track || "Shape and pictures";
        var docTitle = pdfLiteral("Project Viz - " + trackName);
        bodies[infoId - 1] = latin1(
            "<< /Title (" + docTitle + ") /Creator (Project Viz) /Producer (Project Viz) >>"
        );
        return assemble(bodies);
    }

    function load() {
        if (cached) return Promise.resolve(cached);
        if (loading) return loading;
        if (!fontDirectory) return Promise.reject(new Error("Font directory is missing"));
        var keys = Object.keys(FONT_FILES);
        loading = Promise.all(keys.map(function (key) {
            return fetch(fontDirectory + FONT_FILES[key]).then(function (response) {
                if (!response.ok) throw new Error("Font failed to load");
                return response.arrayBuffer();
            }).then(function (buffer) {
                return { key: key, bytes: new Uint8Array(buffer) };
            });
        })).then(function (list) {
            var fonts = {};
            list.forEach(function (item) { fonts[item.key] = item.bytes; });
            cached = fonts;
            loading = null;
            return fonts;
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

    return {
        filename: FILENAME,
        parseFont: parseFont,
        measure: measure,
        build: build,
        load: load,
        ready: function () { return cached; },
        save: save
    };
});
