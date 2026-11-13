/*
 * Load pinned plot and math libraries from assets/vendor.json.
 *
 * A demonstration names what it needs. Paths are relative, including
 * inside a Catalog or Guided Tracks iframe:
 *
 *   <script src="../assets/vendor-loader.js" data-libs="d3,katex"></script>
 *
 * This tag has to stay a classic blocking script. It reads the registry
 * and writes the pinned tags before the parser continues, so a later
 * script still sees d3, Chart, katex, jStat, and THREE. Do not add
 * defer or async.
 *
 * KaTeX is written as CSS, then katex.min.js, then auto-render.
 * OrbitControls is installed after Three.js.
 *
 * Three.js r187 has no classic build. An asset with format "esm" is
 * fetched, checked against its sha384 pin, and evaluated onto THREE.
 * three.core.js comes before three.module.js. OrbitControls is the
 * examples/jsm module, and it still becomes THREE.OrbitControls.
 * D3, Chart.js, jStat, and KaTeX stay ordinary script tags.
 *
 * data-katex-auto="default" typesets document.body with KaTeX's own
 * delimiters after the document is parsed. data-katex-auto="dollars"
 * also typesets $...$ and $$...$$. Leave the attribute off when the
 * page calls renderMathInElement itself.
 */
(function () {
    var current = document.currentScript;
    if (!current || !current.getAttribute) return;

    var requested = (current.getAttribute("data-libs") || "").split(/[\s,]+/).filter(Boolean);
    if (!requested.length) return;

    var registryUrl = new URL("vendor.json", current.src).href;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", registryUrl, false);
    try {
        xhr.send(null);
    } catch (error) {
        throw new Error("Plotting registry did not load: " + registryUrl);
    }
    if ((xhr.status !== 200 && xhr.status !== 0) || !xhr.responseText) {
        throw new Error("Plotting registry did not load: " + registryUrl + " (" + xhr.status + ")");
    }

    var registry = JSON.parse(xhr.responseText);
    var libraries = registry.libraries || {};
    var selected = [];
    var seen = {};

    function add(name) {
        if (seen[name]) return;
        var entry = libraries[name];
        if (!entry) throw new Error("Unknown plotting library: " + name);
        var after = entry.after || [];
        for (var i = 0; i < after.length; i++) add(after[i]);
        seen[name] = true;
        selected.push(entry);
    }

    requested.slice().sort(function (a, b) {
        var left = libraries[a] && libraries[a].order;
        var right = libraries[b] && libraries[b].order;
        return (left || 0) - (right || 0);
    }).forEach(add);

    var tags = [];
    function flushTags() {
        if (!tags.length) return;
        document.write(tags.join(""));
        tags = [];
    }
    selected.forEach(function (entry) {
        (entry.assets || []).forEach(function (asset) {
            if (asset.format === "esm") {
                flushTags();
                installEsm(asset);
                return;
            }
            if (asset.format) throw new Error("Unknown vendor asset format: " + asset.format);
            tags.push(assetTag(asset));
        });
    });
    flushTags();

    var auto = current.getAttribute("data-katex-auto");
    if (!auto) return;
    if (!seen.katex) throw new Error("data-katex-auto requires the katex library");
    if (auto !== "default" && auto !== "dollars") {
        throw new Error("data-katex-auto must be default or dollars");
    }
    scheduleKatex(auto);

    function scheduleKatex(mode) {
        var run = function () {
            if (typeof window.renderMathInElement !== "function") return;
            if (mode === "dollars") {
                window.renderMathInElement(document.body, {
                    delimiters: [
                        { left: "$$", right: "$$", display: true },
                        { left: "$", right: "$", display: false }
                    ]
                });
                return;
            }
            window.renderMathInElement(document.body);
        };
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", run);
        } else {
            run();
        }
    }

    function installEsm(asset) {
        var source = fetchText(asset.src);
        if (asset.integrity) {
            var digest = sha384Integrity(source);
            if (digest !== asset.integrity) {
                throw new Error("Plotting module integrity does not match " + asset.src + " (got " + digest + ")");
            }
        }
        var namespace;
        try {
            namespace = evaluateModule(source, window.THREE || {});
        } catch (error) {
            throw new Error("Plotting module did not evaluate: " + asset.src + " (" + (error && error.message) + ")");
        }
        if (!window.THREE) window.THREE = {};
        var keys = Object.keys(namespace);
        for (var i = 0; i < keys.length; i++) window.THREE[keys[i]] = namespace[keys[i]];
    }

    function fetchText(url) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        try {
            xhr.overrideMimeType("text/javascript; charset=utf-8");
        } catch (error) {
            // A browser that cannot force the charset still decodes XHR as UTF-8.
        }
        try {
            xhr.send(null);
        } catch (error) {
            throw new Error("Plotting module did not load: " + url);
        }
        if ((xhr.status !== 200 && xhr.status !== 0) || !xhr.responseText) {
            throw new Error("Plotting module did not load: " + url + " (" + xhr.status + ")");
        }
        return xhr.responseText;
    }

    // The published build is a module with one import list, optional
    // `export { ... } from`, and one trailing `export { ... }`. Names are
    // bare. That is three.core.js, three.module.js, and OrbitControls.js.
    function evaluateModule(source, imports) {
        var importNames = [];
        var guard = 0;
        var importRe = /^import\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]\s*;?[ \t]*\r?\n?/m;
        var importMatch;
        while ((importMatch = importRe.exec(source))) {
            if (++guard > 20) throw new Error("Plotting module has too many imports");
            importNames = importNames.concat(splitNames(importMatch[1]));
            source = source.slice(0, importMatch.index) + source.slice(importMatch.index + importMatch[0].length);
        }
        guard = 0;
        var reexportRe = /^export\s*\{[^}]*\}\s*from\s*['"][^'"]+['"]\s*;?[ \t]*\r?\n?/m;
        var reexportMatch;
        while ((reexportMatch = reexportRe.exec(source))) {
            if (++guard > 20) throw new Error("Plotting module has too many re-exports");
            source = source.slice(0, reexportMatch.index) + source.slice(reexportMatch.index + reexportMatch[0].length);
        }
        var exportRe = /^export\s*\{([^}]*)\}\s*;?[ \t]*\r?\n?/m;
        var exportMatch = exportRe.exec(source);
        if (!exportMatch) throw new Error("Plotting module has no export list");
        var exportNames = splitNames(exportMatch[1]);
        source = source.slice(0, exportMatch.index) + source.slice(exportMatch.index + exportMatch[0].length);
        if (exportRe.exec(source)) throw new Error("Plotting module has more than one export list");
        var prelude = "'use strict';\n";
        if (importNames.length) prelude += "var {" + importNames.join(",") + "}=__imports;\n";
        var fn = new Function("__imports", prelude + source + "\nreturn {" + exportNames.join(",") + "};\n");
        return fn(imports || {});
    }

    function splitNames(inner) {
        var parts = inner.split(",");
        var names = [];
        for (var i = 0; i < parts.length; i++) {
            var name = parts[i].replace(/^\s+|\s+$/g, "");
            if (!name) continue;
            if (/\s/.test(name)) throw new Error("Plotting module export is not a bare name: " + name);
            names.push(name);
        }
        return names;
    }

    function sha384Integrity(text) {
        var bytes = new TextEncoder().encode(text);
        var digest = sha384(bytes);
        var binary = "";
        for (var i = 0; i < digest.length; i++) binary += String.fromCharCode(digest[i]);
        return "sha384-" + btoa(binary);
    }

    // SHA-384 over 32-bit words. Checked against the empty string, "abc",
    // and the pinned Three.js files.
    function sha384(bytes) {
        function W(h, l) { return { h: h >>> 0, l: l >>> 0 }; }
        function add(a, b) {
            var lo = (a.l + b.l) >>> 0;
            var carry = (a.l + b.l) > 0xffffffff ? 1 : 0;
            return W((a.h + b.h + carry) >>> 0, lo);
        }
        function xor(a, b) { return W(a.h ^ b.h, a.l ^ b.l); }
        function and(a, b) { return W(a.h & b.h, a.l & b.l); }
        function not(a) { return W(~a.h, ~a.l); }
        function rotr(a, n) {
            if (n === 0) return a;
            if (n === 32) return W(a.l, a.h);
            if (n < 32) {
                return W(
                    ((a.h >>> n) | (a.l << (32 - n))) >>> 0,
                    ((a.l >>> n) | (a.h << (32 - n))) >>> 0
                );
            }
            n -= 32;
            return W(
                ((a.l >>> n) | (a.h << (32 - n))) >>> 0,
                ((a.h >>> n) | (a.l << (32 - n))) >>> 0
            );
        }
        function shr(a, n) {
            if (n === 0) return a;
            if (n < 32) return W(a.h >>> n, ((a.l >>> n) | (a.h << (32 - n))) >>> 0);
            if (n === 32) return W(0, a.h);
            return W(0, a.h >>> (n - 32));
        }
        var K = [
            [0x428a2f98,0xd728ae22],[0x71374491,0x23ef65cd],[0xb5c0fbcf,0xec4d3b2f],[0xe9b5dba5,0x8189dbbc],
            [0x3956c25b,0xf348b538],[0x59f111f1,0xb605d019],[0x923f82a4,0xaf194f9b],[0xab1c5ed5,0xda6d8118],
            [0xd807aa98,0xa3030242],[0x12835b01,0x45706fbe],[0x243185be,0x4ee4b28c],[0x550c7dc3,0xd5ffb4e2],
            [0x72be5d74,0xf27b896f],[0x80deb1fe,0x3b1696b1],[0x9bdc06a7,0x25c71235],[0xc19bf174,0xcf692694],
            [0xe49b69c1,0x9ef14ad2],[0xefbe4786,0x384f25e3],[0x0fc19dc6,0x8b8cd5b5],[0x240ca1cc,0x77ac9c65],
            [0x2de92c6f,0x592b0275],[0x4a7484aa,0x6ea6e483],[0x5cb0a9dc,0xbd41fbd4],[0x76f988da,0x831153b5],
            [0x983e5152,0xee66dfab],[0xa831c66d,0x2db43210],[0xb00327c8,0x98fb213f],[0xbf597fc7,0xbeef0ee4],
            [0xc6e00bf3,0x3da88fc2],[0xd5a79147,0x930aa725],[0x06ca6351,0xe003826f],[0x14292967,0x0a0e6e70],
            [0x27b70a85,0x46d22ffc],[0x2e1b2138,0x5c26c926],[0x4d2c6dfc,0x5ac42aed],[0x53380d13,0x9d95b3df],
            [0x650a7354,0x8baf63de],[0x766a0abb,0x3c77b2a8],[0x81c2c92e,0x47edaee6],[0x92722c85,0x1482353b],
            [0xa2bfe8a1,0x4cf10364],[0xa81a664b,0xbc423001],[0xc24b8b70,0xd0f89791],[0xc76c51a3,0x0654be30],
            [0xd192e819,0xd6ef5218],[0xd6990624,0x5565a910],[0xf40e3585,0x5771202a],[0x106aa070,0x32bbd1b8],
            [0x19a4c116,0xb8d2d0c8],[0x1e376c08,0x5141ab53],[0x2748774c,0xdf8eeb99],[0x34b0bcb5,0xe19b48a8],
            [0x391c0cb3,0xc5c95a63],[0x4ed8aa4a,0xe3418acb],[0x5b9cca4f,0x7763e373],[0x682e6ff3,0xd6b2b8a3],
            [0x748f82ee,0x5defb2fc],[0x78a5636f,0x43172f60],[0x84c87814,0xa1f0ab72],[0x8cc70208,0x1a6439ec],
            [0x90befffa,0x23631e28],[0xa4506ceb,0xde82bde9],[0xbef9a3f7,0xb2c67915],[0xc67178f2,0xe372532b],
            [0xca273ece,0xea26619c],[0xd186b8c7,0x21c0c207],[0xeada7dd6,0xcde0eb1e],[0xf57d4f7f,0xee6ed178],
            [0x06f067aa,0x72176fba],[0x0a637dc5,0xa2c898a6],[0x113f9804,0xbef90dae],[0x1b710b35,0x131c471b],
            [0x28db77f5,0x23047d84],[0x32caab7b,0x40c72493],[0x3c9ebe0a,0x15c9bebc],[0x431d67c4,0x9c100d4c],
            [0x4cc5d4be,0xcb3e42b6],[0x597f299c,0xfc657e2a],[0x5fcb6fab,0x3ad6faec],[0x6c44198c,0x4a475817]
        ].map(function (pair) { return W(pair[0], pair[1]); });
        var H = [
            W(0xcbbb9d5d,0xc1059ed8), W(0x629a292a,0x367cd507), W(0x9159015a,0x3070dd17), W(0x152fecd8,0xf70e5939),
            W(0x67332667,0xffc00b31), W(0x8eb44a87,0x68581511), W(0xdb0c2e0d,0x64f98fa7), W(0x47b5481d,0xbefa4fa4)
        ];
        var bitHi = Math.floor(bytes.length / 0x20000000);
        var bitLo = (bytes.length << 3) >>> 0;
        var total = bytes.length + 1 + 16;
        var rem = total % 128;
        if (rem) total += 128 - rem;
        var buf = new Uint8Array(total);
        buf.set(bytes);
        buf[bytes.length] = 0x80;
        var view = new DataView(buf.buffer);
        view.setUint32(total - 8, bitHi, false);
        view.setUint32(total - 4, bitLo, false);
        var words = new Array(80);
        for (var off = 0; off < total; off += 128) {
            for (var i = 0; i < 16; i++) {
                words[i] = W(view.getUint32(off + i * 8, false), view.getUint32(off + i * 8 + 4, false));
            }
            for (var j = 16; j < 80; j++) {
                var w15 = words[j - 15], w2 = words[j - 2];
                var s0 = xor(xor(rotr(w15, 1), rotr(w15, 8)), shr(w15, 7));
                var s1 = xor(xor(rotr(w2, 19), rotr(w2, 61)), shr(w2, 6));
                words[j] = add(add(words[j - 16], s0), add(words[j - 7], s1));
            }
            var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], hh = H[7];
            for (var k = 0; k < 80; k++) {
                var S1 = xor(xor(rotr(e, 14), rotr(e, 18)), rotr(e, 41));
                var ch = xor(and(e, f), and(not(e), g));
                var temp1 = add(add(add(hh, S1), add(ch, K[k])), words[k]);
                var S0 = xor(xor(rotr(a, 28), rotr(a, 34)), rotr(a, 39));
                var maj = xor(xor(and(a, b), and(a, c)), and(b, c));
                var temp2 = add(S0, maj);
                hh = g; g = f; f = e; e = add(d, temp1); d = c; c = b; b = a; a = add(temp1, temp2);
            }
            H[0] = add(H[0], a); H[1] = add(H[1], b); H[2] = add(H[2], c); H[3] = add(H[3], d);
            H[4] = add(H[4], e); H[5] = add(H[5], f); H[6] = add(H[6], g); H[7] = add(H[7], hh);
        }
        var out = new Uint8Array(48);
        var outView = new DataView(out.buffer);
        for (var n = 0; n < 6; n++) {
            outView.setUint32(n * 8, H[n].h, false);
            outView.setUint32(n * 8 + 4, H[n].l, false);
        }
        return out;
    }

    function assetTag(asset) {
        var extra = "";
        if (asset.integrity) {
            extra += ' integrity="' + esc(asset.integrity) + '" crossorigin="anonymous"';
        }
        if (asset.kind === "style") {
            return '<link rel="stylesheet" href="' + esc(asset.href) + '"' + extra + ">";
        }
        if (asset.kind === "script") {
            return '<script src="' + esc(asset.src) + '"' + extra + "><\/script>";
        }
        throw new Error("Unknown vendor asset: " + asset.kind);
    }

    function esc(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;");
    }
})();
