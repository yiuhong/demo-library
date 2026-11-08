/*
 * Fills library-page fields from assets/site-meta.js, and on demo pages
 * adds a short strip: Cite this demo, and the author site.
 * License, site-wide cite, and source links stay on the library footer.
 * Does not replace a demo's own navigation.
 */
(function () {
    try {
        if (new URLSearchParams(window.location.search).get("embed") === "shell") {
            document.documentElement.classList.add("viz-embedded");
        }
    } catch (error) {}

    /* A finger that starts on a range and then scrolls must not leave the
       control where that finger landed. The browser cancels the gesture
       when it takes the pan. */
    if (!window.__rangeScrollGuard) {
        window.__rangeScrollGuard = true;
        document.querySelectorAll('input[type="range"]').forEach(function (el) {
            var snapshot = null;
            el.addEventListener("pointerdown", function (event) {
                if (event.pointerType === "mouse") return;
                snapshot = el.value;
            });
            el.addEventListener("pointercancel", function () {
                if (snapshot == null) return;
                var restore = snapshot;
                snapshot = null;
                if (el.value === restore) return;
                el.value = restore;
                el.dispatchEvent(new Event("input", { bubbles: true }));
            });
            el.addEventListener("pointerup", function () {
                snapshot = null;
            });
        });
    }

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

    document.querySelectorAll("[data-site-apa]").forEach(function (node) {
        node.textContent = "";
        node.appendChild(document.createTextNode(meta.authorApa + " (" + meta.year + "). "));
        var title = document.createElement("em");
        title.textContent = meta.titleApa;
        node.appendChild(title);
        node.appendChild(document.createTextNode(" (Version " + meta.version + "). " + meta.url));
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
    strip.setAttribute("aria-label", "Citation and author");

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
        link.target = "_blank";
        link.rel = rel ? rel + " noopener noreferrer" : "noopener noreferrer";
        line.appendChild(link);
        return link;
    }

    addLink(meta.personalSite, meta.author, "author");
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

    function currentDemoHref() {
        var page = new URL(window.location.href);
        page.hash = "";
        page.search = "";
        var path = page.pathname;
        var base = new URL(root).pathname;
        if (base !== "/" && path.indexOf(base) === 0) {
            path = path.slice(base.length);
        }
        path = path.replace(/^\/+/, "");
        try {
            path = decodeURIComponent(path);
        } catch (error) {
            return "";
        }
        return path;
    }

    function findDemoTitle(data, href) {
        var categories = data && data.categories;
        if (!categories || !categories.length) return "";
        for (var i = 0; i < categories.length; i++) {
            var subs = categories[i] && categories[i].subcategories;
            if (!subs) continue;
            for (var j = 0; j < subs.length; j++) {
                var demos = subs[j] && subs[j].demos;
                if (!demos) continue;
                for (var k = 0; k < demos.length; k++) {
                    var demo = demos[k];
                    if (!demo || demo.href !== href) continue;
                    var title = demo.title == null ? "" : String(demo.title).trim();
                    if (title) return title;
                }
            }
        }
        return "";
    }

    function insertDemoCite(href) {
        var link = document.createElement("a");
        link.href = rootUrl("cite.html?demo=" + encodeURIComponent(href) + "#one-demo");
        link.textContent = "Cite this demo";
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        var sep = document.createElement("span");
        sep.className = "site-oer-sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "·";
        line.insertBefore(sep, line.firstChild);
        line.insertBefore(link, sep);
        layout();
    }

    function loadDemoCitation() {
        var href = currentDemoHref();
        // Library pages live at the site root. Demos live in a subject folder.
        if (!href || href.indexOf("/") === -1) return;
        var catalog = new URL("demos.json", root);
        fetch(catalog.href).then(function (response) {
            if (!response.ok) throw new Error("catalog");
            return response.json();
        }).then(function (data) {
            var title = findDemoTitle(data, href);
            if (!title) return;
            insertDemoCite(href);
        }).catch(function () {});
    }

    layout();
    window.addEventListener("resize", layout);
    loadDemoCitation();
})();
