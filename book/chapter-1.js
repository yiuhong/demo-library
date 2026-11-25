/*
 * Page turns for the Chapter 1 draft, and the still-to-demo wake.
 * Below 960px the chapter is one scrolling stack. The buttons
 * here are not shown, and this file does not slide text and
 * figures sideways. A wide window shows one spread.
 * A still stays a picture until the button is used. The frame
 * then loads that same demonstration. Nothing plays on its own.
 */
(function () {
    var root = document.documentElement;
    var WIDE = window.matchMedia("(min-width: 960px)");
    var spreads = Array.prototype.slice.call(document.querySelectorAll("[data-book-spread]"));
    var prev = document.getElementById("book-prev");
    var next = document.getElementById("book-next");
    var position = document.getElementById("book-position");
    var index = 0;

    if (!spreads.length || !prev || !next || !position) return;

    function hashIndex() {
        var id = window.location.hash.replace(/^#/, "");
        if (!id) return -1;
        for (var i = 0; i < spreads.length; i++) {
            if (spreads[i].id === id) return i;
        }
        return -1;
    }

    function indexFromScroll() {
        var line = window.scrollY + 24;
        var found = 0;
        for (var i = 0; i < spreads.length; i++) {
            if (spreads[i].offsetTop <= line) found = i;
        }
        return found;
    }

    function show(moveFocus, resetScroll) {
        var paged = root.classList.contains("book-paged");
        spreads.forEach(function (el, i) {
            var on = i === index;
            el.classList.toggle("is-active", on);
            if (paged) {
                if (on) el.removeAttribute("aria-hidden");
                else el.setAttribute("aria-hidden", "true");
            } else {
                el.removeAttribute("aria-hidden");
            }
        });
        var spread = spreads[index];
        spread.querySelectorAll(".book-text").forEach(function (leaf) {
            leaf.tabIndex = paged ? 0 : -1;
            if (paged && resetScroll) leaf.scrollTop = 0;
        });
        prev.disabled = index === 0;
        next.disabled = index === spreads.length - 1;
        position.textContent = (index + 1) + " / " + spreads.length;
        if (paged) {
            if (window.location.hash !== "#" + spread.id) {
                history.replaceState(null, "", "#" + spread.id);
            }
        }
        if (moveFocus) {
            var head = spread.querySelector("h1, h2");
            if (head) {
                head.setAttribute("tabindex", "-1");
                head.focus();
            }
        }
    }

    function setPaged(on) {
        root.classList.toggle("book-paged", on);
    }

    function go(delta, moveFocus) {
        if (!root.classList.contains("book-paged")) return;
        var upcoming = index + delta;
        if (upcoming < 0 || upcoming >= spreads.length) return;
        index = upcoming;
        show(moveFocus, true);
    }

    var fromHash = hashIndex();
    if (fromHash >= 0) index = fromHash;
    if (WIDE.matches) setPaged(true);
    show(false, false);

    prev.addEventListener("click", function (event) {
        go(-1, event.detail === 0);
    });
    next.addEventListener("click", function (event) {
        go(1, event.detail === 0);
    });

    document.addEventListener("keydown", function (event) {
        if (!root.classList.contains("book-paged")) return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        var tag = event.target && event.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (event.target && event.target.isContentEditable) return;
        var selection = window.getSelection && window.getSelection();
        if (selection && !selection.isCollapsed) return;
        if (event.key === "ArrowRight" || event.key === "PageDown") {
            event.preventDefault();
            go(1, true);
        } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
            event.preventDefault();
            go(-1, true);
        }
    });

    function applyMode() {
        if (WIDE.matches) {
            if (!root.classList.contains("book-paged")) {
                index = indexFromScroll();
            }
            setPaged(true);
            show(false, false);
        } else {
            var current = spreads[index];
            setPaged(false);
            show(false, false);
            if (current) current.scrollIntoView();
        }
    }

    if (typeof WIDE.addEventListener === "function") {
        WIDE.addEventListener("change", applyMode);
    } else if (typeof WIDE.addListener === "function") {
        WIDE.addListener(applyMode);
    }

    document.addEventListener("click", function (event) {
        var button = event.target.closest && event.target.closest(".book-wake");
        if (!button || button.hidden) return;
        var path = button.getAttribute("data-demo") || "";
        if (!/^\.\.\/statistics\/[a-z0-9_]+\.html$/.test(path)) return;
        var frame = document.getElementById(button.getAttribute("aria-controls"));
        if (!frame || frame.getAttribute("src")) return;
        frame.src = path + "?embed=shell&learn=1";
        button.hidden = true;
        button.setAttribute("aria-pressed", "true");
        frame.hidden = false;
    });
})();
