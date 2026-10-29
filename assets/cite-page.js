/*
 * Fills the pasteable citation on cite.html from assets/site-meta.js
 * and wires the copy buttons.
 */
(function () {
    var meta = window.DEMO_LIBRARY;
    if (!meta) return;

    var apa = document.getElementById("cite-apa");
    if (apa) {
        apa.textContent = "";
        apa.appendChild(document.createTextNode(meta.authorApa + " (" + meta.year + "). "));
        var title = document.createElement("em");
        title.textContent = meta.titleApa;
        apa.appendChild(title);
        apa.appendChild(document.createTextNode(" (Version " + meta.version + "). " + meta.url));
    }

    var bibtex = document.getElementById("cite-bibtex");
    if (bibtex) bibtex.textContent = meta.bibtex;

    var credit = document.getElementById("cite-credit");
    if (credit) credit.textContent = meta.credit;

    function findDemoTitle(data, href) {
        var categories = data && data.categories;
        if (!categories) return "";
        for (var i = 0; i < categories.length; i++) {
            var subs = categories[i] && categories[i].subcategories;
            if (!subs) continue;
            for (var j = 0; j < subs.length; j++) {
                var demos = subs[j] && subs[j].demos;
                if (!demos) continue;
                for (var k = 0; k < demos.length; k++) {
                    var demo = demos[k];
                    if (demo && demo.href === href && demo.title) {
                        return String(demo.title).trim();
                    }
                }
            }
        }
        return "";
    }

    var demoNode = document.getElementById("cite-demo");
    var demoHref = demoNode && demoNode.getAttribute("data-demo-href");
    if (demoNode && demoHref && typeof meta.demoCitation === "function") {
        fetch(new URL("demos.json", window.location.href)).then(function (response) {
            if (!response.ok) throw new Error("catalog");
            return response.json();
        }).then(function (data) {
            var title = findDemoTitle(data, demoHref);
            if (!title) return;
            demoNode.textContent = meta.demoCitation(title, demoHref);
            var frame = document.getElementById("cite-iframe");
            if (!frame) return;
            var pageUrl = meta.url + String(demoHref).replace(/^\/+/, "");
            var safeTitle = title.replace(/"/g, "");
            frame.textContent = '<iframe src="' + pageUrl + '" title="' + safeTitle
                + '" width="100%" height="720" style="border:0"></iframe>';
        }).catch(function () {});
    }

    function textFor(id, mode) {
        var node = document.getElementById(id);
        if (!node) return "";
        if (mode === "pre") return node.textContent.replace(/\s+$/, "");
        return node.textContent.replace(/\s+/g, " ").trim();
    }

    function selectNode(node) {
        var range = document.createRange();
        range.selectNodeContents(node);
        var selection = window.getSelection();
        if (!selection) return;
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function flash(button) {
        var label = button.getAttribute("data-label") || button.textContent;
        button.textContent = "Copied";
        window.setTimeout(function () {
            button.textContent = label;
        }, 1600);
    }

    document.querySelectorAll(".cite-copy").forEach(function (button) {
        button.setAttribute("data-label", button.textContent);
        button.addEventListener("click", function () {
            var id = button.getAttribute("data-copy");
            var mode = button.getAttribute("data-copy-mode") || "inline";
            var text = textFor(id, mode);
            var node = document.getElementById(id);
            function fallback() {
                if (node) selectNode(node);
            }
            if (!text || !navigator.clipboard || !navigator.clipboard.writeText) {
                fallback();
                return;
            }
            navigator.clipboard.writeText(text).then(function () {
                flash(button);
            }).catch(function () {
                fallback();
            });
        });
    });
})();
