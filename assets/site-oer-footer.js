/*
 * Fills the library footer from assets/site-meta.js, and on demo pages
 * adds the compact license strip. Does not replace a demo's own navigation.
 */
(function () {
    var meta = window.DEMO_LIBRARY;
    if (!meta || window.__siteOerFooterMounted) return;
    window.__siteOerFooterMounted = true;

    var script = document.currentScript;
    var assetsDir = script && script.src ? new URL("./", script.src) : null;
    var root = assetsDir ? new URL("../", assetsDir) : new URL("./", window.location.href);

    function rootUrl(path) {
        return new URL(path, root).href;
    }

    document.querySelectorAll("[data-site-field]").forEach(function (node) {
        var key = node.getAttribute("data-site-field");
        if (!key || meta[key] == null) return;
        node.textContent = String(meta[key]);
        var datetimeKey = node.getAttribute("data-site-datetime");
        if (datetimeKey && meta[datetimeKey] != null) {
            node.setAttribute("datetime", String(meta[datetimeKey]));
        }
    });

    var libraryFooter = document.getElementById("footer");
    if (libraryFooter && libraryFooter.classList.contains("wrapper")) return;

    if (assetsDir && !document.querySelector('link[href*="site-oer-footer.css"]')) {
        var sheet = document.createElement("link");
        sheet.rel = "stylesheet";
        sheet.href = new URL("site-oer-footer.css", assetsDir).href;
        document.head.appendChild(sheet);
    }

    var strip = document.createElement("footer");
    strip.className = "site-oer-strip";
    strip.setAttribute("aria-label", "License, citation, and source");

    var line = document.createElement("p");

    function addSep() {
        if (!line.firstChild) return;
        var sep = document.createElement("span");
        sep.className = "site-oer-sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "·";
        line.appendChild(sep);
    }

    function addLink(href, text, rel) {
        addSep();
        var link = document.createElement("a");
        link.href = href;
        link.textContent = text;
        if (rel) link.rel = rel;
        line.appendChild(link);
    }

    function addNode(node) {
        addSep();
        line.appendChild(node);
    }

    function addText(text) {
        addSep();
        line.appendChild(document.createTextNode(text));
    }

    addLink(meta.personalSite, meta.author, "author");

    var content = document.createElement("span");
    content.appendChild(document.createTextNode("Content "));
    var cc = document.createElement("a");
    cc.rel = "license";
    cc.href = meta.contentLicenseUrl;
    cc.textContent = meta.contentLicense;
    content.appendChild(cc);
    addNode(content);

    var code = document.createElement("span");
    code.appendChild(document.createTextNode("Code "));
    var mit = document.createElement("a");
    mit.href = rootUrl("LICENSE-CODE");
    mit.textContent = meta.codeLicense;
    code.appendChild(mit);
    addNode(code);

    addLink(rootUrl("cite.html"), "How to cite");
    addLink(meta.issues, "Spotted a mistake?");
    addLink(meta.repo, "View source");
    addText("v" + meta.version);
    addText(meta.updatedShort);

    strip.appendChild(line);
    document.body.appendChild(strip);

    var padBase = null;

    function clipsViewport() {
        var bodyStyle = window.getComputedStyle(document.body);
        var rootStyle = window.getComputedStyle(document.documentElement);
        function clips(style) {
            return style.overflow === "hidden" || style.overflowY === "hidden";
        }
        return clips(bodyStyle) || clips(rootStyle);
    }

    function layout() {
        var lock = clipsViewport();
        document.documentElement.classList.toggle("site-oer-fit", lock);
        if (!lock) {
            if (padBase !== null) {
                document.body.style.paddingBottom = padBase + "px";
                padBase = null;
            }
            return;
        }
        var height = Math.ceil(strip.getBoundingClientRect().height);
        document.documentElement.style.setProperty("--site-oer-h", height + "px");
        if (padBase === null) {
            padBase = parseFloat(window.getComputedStyle(document.body).paddingBottom) || 0;
        }
        document.body.style.paddingBottom = (padBase + height) + "px";
    }

    layout();
    window.addEventListener("resize", layout);
})();
