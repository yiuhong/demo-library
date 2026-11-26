/*
 * Book view chapters. The chapter scrolls. A still opens its
 * demonstration over the screen, and Exit returns to the same place.
 * This file does not turn pages.
 */
(function () {
    var menu = document.querySelector(".book-menu");
    var menuButton = document.getElementById("book-menu-toggle");
    var menuShell = document.querySelector(".book-shell");
    var menuWide = window.matchMedia("(min-width: 960px)");
    var menuChosen = false;

    function setMenu(open) {
        if (!menu || !menuButton) return;
        menu.classList.toggle("is-collapsed", !open);
        if (menuShell) menuShell.classList.toggle("is-menu-collapsed", !open);
        menuButton.setAttribute("aria-expanded", open ? "true" : "false");
        menuButton.setAttribute("aria-label", open ? "Hide sections" : "Show sections");
    }

    if (menuButton) {
        setMenu(menuWide.matches);
        menuButton.addEventListener("click", function () {
            menuChosen = true;
            setMenu(menuButton.getAttribute("aria-expanded") !== "true");
        });
        if (typeof menuWide.addEventListener === "function") {
            menuWide.addEventListener("change", function () {
                if (!menuChosen) setMenu(menuWide.matches);
            });
        }
        menu.addEventListener("click", function (event) {
            var link = event.target.closest && event.target.closest("a[href^='#']");
            if (!link || menuWide.matches) return;
            setMenu(false);
        });
    }

    var sections = Array.prototype.slice.call(document.querySelectorAll(".book-doc [data-book-section], #describing-data, #chapter-wrap"));
    if (menu && sections.length && "IntersectionObserver" in window) {
        var links = {};
        Array.prototype.forEach.call(menu.querySelectorAll("a[href^='#']"), function (link) {
            links[link.getAttribute("href").slice(1)] = link;
        });
        var currentId = "";
        function mark(id) {
            if (!id || id === currentId) return;
            currentId = id;
            Object.keys(links).forEach(function (key) {
                if (key === id) links[key].setAttribute("aria-current", "true");
                else links[key].removeAttribute("aria-current");
            });
        }
        var observer = new IntersectionObserver(function (entries) {
            var visible = entries.filter(function (entry) { return entry.isIntersecting; });
            if (!visible.length) return;
            visible.sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
            mark(visible[0].target.id);
        }, { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.6] });
        sections.forEach(function (section) { observer.observe(section); });
    }

    function activeFullscreen() {
        return document.fullscreenElement
            || document.webkitFullscreenElement
            || document.webkitCurrentFullScreenElement
            || document.mozFullScreenElement
            || document.msFullscreenElement
            || null;
    }

    function requestFullscreen(el) {
        var names = ["requestFullscreen", "webkitRequestFullscreen", "webkitRequestFullScreen", "mozRequestFullScreen", "msRequestFullscreen"];
        var i;
        for (i = 0; i < names.length; i++) {
            if (typeof el[names[i]] !== "function") continue;
            try {
                var result = el[names[i]]();
                return result && typeof result.then === "function" ? result : Promise.resolve();
            } catch (err) {}
        }
        return Promise.reject(new Error("fullscreen-unavailable"));
    }

    function exitFullscreen() {
        var names = ["exitFullscreen", "webkitExitFullscreen", "webkitCancelFullScreen", "mozCancelFullScreen", "msExitFullscreen"];
        var i;
        for (i = 0; i < names.length; i++) {
            if (typeof document[names[i]] !== "function") continue;
            try {
                var result = document[names[i]]();
                return result && typeof result.then === "function" ? result : Promise.resolve();
            } catch (err) {}
        }
        return Promise.resolve();
    }

    /* Scroll position before an in-page fullscreen, so Exit can put the
       reader back in the chapter. A phone often ignores overflow:hidden
       unless the body is fixed. */
    var savedScroll = 0;
    var scrollLocked = false;

    function lockScroll() {
        if (scrollLocked) return;
        savedScroll = window.scrollY || document.documentElement.scrollTop || 0;
        scrollLocked = true;
        document.body.style.position = "fixed";
        document.body.style.top = "-" + savedScroll + "px";
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
    }

    /* The place to put back after Back. The browser restores the scroll
       it stored for the previous history entry, which is not this place
       once the reader has moved down the chapter. */
    var restoreY = null;

    function putBack() {
        if (restoreY == null) return;
        window.scrollTo(0, restoreY);
    }

    function unlockScroll() {
        if (!scrollLocked) return;
        var y = savedScroll;
        scrollLocked = false;
        restoreY = y;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        putBack();
    }

    /* The live frame keeps the figure and its controls. The page title,
       the Back link, and the cite strip repeat the chapter, so they
       stay out. Teach already hides the longer notes. */
    var BOOK_FIT_CSS = [
        "html.viz-book h1,",
        "html.viz-book .demo-topbar,",
        "html.viz-book .demo-back,",
        "html.viz-book .site-oer-strip {",
        "  display: none !important;",
        "}"
    ].join("\n");

    function frameDocument(frame) {
        try {
            return frame.contentDocument;
        } catch (err) {
            return null;
        }
    }

    function ensureBookFit(doc) {
        if (!doc || !doc.head || !doc.body) return;
        doc.documentElement.classList.add("viz-book");
        if (doc.getElementById("viz-book-fit")) return;
        var style = doc.createElement("style");
        style.id = "viz-book-fit";
        style.textContent = BOOK_FIT_CSS;
        doc.head.appendChild(style);
    }

    function bindFrame(frame) {
        function ready() {
            ensureBookFit(frameDocument(frame));
        }
        frame.addEventListener("load", ready);
        if (frame.contentDocument && frame.contentDocument.readyState === "complete") ready();
    }

    function focusExit(pane) {
        var exit = pane.querySelector(".book-exit");
        if (exit && exit.focus) exit.focus();
    }

    function stillButton(pane) {
        var figure = pane && pane.parentNode;
        return figure ? figure.querySelector(".book-still") : null;
    }

    /* The browser Fullscreen API often refuses a div that holds an iframe
       in a normal phone tab. The card then fills the screen in the page. */
    function applyImmersive(pane) {
        if (activeFullscreen() === pane) return;
        lockScroll();
        document.body.classList.add("is-immersive");
        pane.classList.add("is-immersive-pane");
        focusExit(pane);
        if (!pane.hasAttribute("data-book-immersive-history")) {
            try {
                history.pushState({ bookImmersive: 1 }, "", window.location.href);
                pane.setAttribute("data-book-immersive-history", "1");
            } catch (err) {}
        }
    }

    function clearImmersive(pane, fromPop) {
        if (!pane) pane = document.querySelector(".book-figure .viz-pane.is-immersive-pane");
        var pushed = pane && pane.hasAttribute("data-book-immersive-history");
        if (pane) {
            pane.removeAttribute("data-book-immersive-history");
            pane.classList.remove("is-immersive-pane");
        }
        if (!document.querySelector(".book-figure .viz-pane.is-immersive-pane")) {
            document.body.classList.remove("is-immersive");
            unlockScroll();
        }
        if (pushed && !fromPop) {
            try {
                history.back();
            } catch (err) {}
        }
    }

    function enterPane(pane) {
        function settled() {
            /* Exit can win the race against the fullscreen promise. */
            if (!pane.classList.contains("is-live")) {
                if (activeFullscreen() === pane) exitFullscreen();
                return;
            }
            if (activeFullscreen() === pane) {
                clearImmersive(pane, true);
                document.body.classList.remove("is-immersive");
                focusExit(pane);
                return;
            }
            applyImmersive(pane);
        }
        requestFullscreen(pane).then(function () {
            window.requestAnimationFrame(settled);
        }).catch(function () {
            settled();
        });
    }

    /* Drop the live frame so a demonstration is not left running, and
       put the keyboard back on the card that opened it. */
    function releaseLive(pane, fromPop) {
        if (!pane || !pane.classList.contains("is-live")) return;
        var button = stillButton(pane);
        var immersive = pane.classList.contains("is-immersive-pane");
        if (immersive) clearImmersive(pane, fromPop);
        pane.classList.remove("is-live");
        pane.setAttribute("aria-hidden", "true");
        pane.setAttribute("inert", "");
        var frame = pane.querySelector("iframe");
        if (frame) frame.remove();
        if (!immersive && activeFullscreen()) exitFullscreen();
        if (button && button.focus) button.focus({ preventScroll: true });
    }

    function openStill(button) {
        var pane = button.parentNode && button.parentNode.querySelector(".viz-pane");
        if (!pane || pane.classList.contains("is-live")) return;
        var open = document.querySelector(".book-figure .book-live.is-live");
        if (open) releaseLive(open, false);
        var base = button.getAttribute("data-demo");
        if (!base) return;
        var teach = document.documentElement.classList.contains("viz-teach");
        var stage = pane.querySelector(".viz-pane-stage");
        var frame = document.createElement("iframe");
        var title = button.querySelector(".book-still-title");
        frame.title = title ? title.textContent : button.textContent;
        frame.setAttribute("allow", "fullscreen");
        frame.setAttribute("allowfullscreen", "");
        frame.src = base + "?embed=shell&" + (teach ? "teach=1" : "learn=1");
        stage.appendChild(frame);
        bindFrame(frame);
        pane.classList.add("is-live");
        pane.removeAttribute("aria-hidden");
        pane.removeAttribute("inert");
        enterPane(pane);
    }

    function endIfFullscreenLeft() {
        var pane = document.querySelector(".book-figure .book-live.is-live");
        if (!pane) return;
        if (activeFullscreen() === pane || pane.classList.contains("is-immersive-pane")) return;
        releaseLive(pane, true);
    }

    document.addEventListener("click", function (event) {
        var still = event.target.closest && event.target.closest(".book-still");
        if (still) {
            event.preventDefault();
            openStill(still);
            return;
        }
        var exit = event.target.closest && event.target.closest(".book-exit");
        if (!exit) return;
        var pane = exit.closest(".viz-pane");
        if (!pane) return;
        event.preventDefault();
        releaseLive(pane, false);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        var pane = document.querySelector(".book-figure .viz-pane.is-immersive-pane");
        if (!pane) pane = document.querySelector(".book-figure .book-live.is-live");
        if (!pane) return;
        event.preventDefault();
        releaseLive(pane, false);
    });

    window.addEventListener("popstate", function () {
        var pane = document.querySelector(".book-figure .viz-pane.is-immersive-pane");
        if (pane) releaseLive(pane, true);
        putBack();
        window.requestAnimationFrame(function () {
            putBack();
            window.setTimeout(putBack, 0);
        });
    });

    document.addEventListener("fullscreenchange", endIfFullscreenLeft);
    document.addEventListener("webkitfullscreenchange", endIfFullscreenLeft);
})();
