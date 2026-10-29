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
