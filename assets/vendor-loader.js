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
 * OrbitControls is written after Three.js.
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
    selected.forEach(function (entry) {
        (entry.assets || []).forEach(function (asset) {
            tags.push(assetTag(asset));
        });
    });
    document.write(tags.join(""));

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
