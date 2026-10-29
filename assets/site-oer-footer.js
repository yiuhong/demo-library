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

    function addLink(href, text, rel, ariaLabel) {
        addSep();
        var link = document.createElement("a");
        link.href = href;
        link.textContent = text;
        if (rel) link.rel = rel;
        if (ariaLabel) link.setAttribute("aria-label", ariaLabel);
        line.appendChild(link);
        return link;
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
    if (meta.orcid) {
        addLink(meta.orcid, "ORCID", null, "ORCID iD " + (meta.orcidId || meta.orcid));
    }

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

    addLink(rootUrl("license.html"), "Licenses");
    addLink(rootUrl("cite.html"), "Cite & reuse");
    addLink(meta.issues, "Spotted a mistake?");
    addLink(meta.repo, "View source");
    addText("v" + meta.version);
    addText(meta.updatedShort);

    strip.appendChild(line);

    var detail = document.createElement("p");
    detail.id = "site-oer-demo-cite";
    detail.className = "site-oer-demo-cite";
    detail.hidden = true;
    strip.appendChild(detail);
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

    function flash(button, label) {
        button.textContent = "Copied";
        window.setTimeout(function () {
            button.textContent = label;
        }, 1600);
    }

    function copyText(text, button, node) {
        function fallback() {
            if (!node) return;
            var range = document.createRange();
            range.selectNodeContents(node);
            var selection = window.getSelection();
            if (!selection) return;
            selection.removeAllRanges();
            selection.addRange(range);
        }
        if (!text || !navigator.clipboard || !navigator.clipboard.writeText) {
            fallback();
            return;
        }
        navigator.clipboard.writeText(text).then(function () {
            flash(button, "Copy");
        }).catch(function () {
            fallback();
        });
    }

    function insertDemoCite(citation) {
        var sep = document.createElement("span");
        sep.className = "site-oer-sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "·";

        var button = document.createElement("button");
        button.type = "button";
        button.className = "site-oer-textbtn";
        button.textContent = "Cite this demo";
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-controls", "site-oer-demo-cite");

        var text = document.createElement("span");
        text.id = "site-oer-demo-cite-text";
        text.textContent = citation;

        var copy = document.createElement("button");
        copy.type = "button";
        copy.className = "site-oer-textbtn";
        copy.textContent = "Copy";
        copy.addEventListener("click", function () {
            copyText(citation, copy, text);
        });

        detail.textContent = "";
        detail.appendChild(text);
        detail.appendChild(document.createTextNode(" "));
        detail.appendChild(copy);

        button.addEventListener("click", function () {
            var willOpen = detail.hidden;
            detail.hidden = !willOpen;
            detail.classList.toggle("is-open", willOpen);
            button.setAttribute("aria-expanded", willOpen ? "true" : "false");
            layout();
        });

        line.insertBefore(button, content);
        line.insertBefore(sep, content);
        layout();
    }

    function loadDemoCitation() {
        if (typeof meta.demoCitation !== "function") return;
        var href = currentDemoHref();
        if (!href || href === "index.html" || href === "cite.html" || href === "tracks.html") return;
        var catalog = new URL("demos.json", root);
        fetch(catalog.href).then(function (response) {
            if (!response.ok) throw new Error("catalog");
            return response.json();
        }).then(function (data) {
            var title = findDemoTitle(data, href);
            if (!title) return;
            insertDemoCite(meta.demoCitation(title, href));
        }).catch(function () {});
    }

    layout();
    window.addEventListener("resize", layout);
    loadDemoCitation();
})();
