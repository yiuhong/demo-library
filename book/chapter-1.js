/*
 * Chapter 1 Book mode. The chapter scrolls. This file does not turn
 * pages. It marks the section in view, and Fullscreen opens the
 * demonstration the reader chose.
 */
(function () {
    var menu = document.querySelector(".book-menu");
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

    function unlockScroll() {
        if (!scrollLocked) return;
        var y = savedScroll;
        scrollLocked = false;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        window.scrollTo(0, y);
    }

    function syncPane(pane) {
        if (!pane) return;
        var on = activeFullscreen() === pane || pane.classList.contains("is-immersive-pane");
        var enter = pane.querySelector(".book-fullscreen");
        var exit = pane.querySelector(".book-exit");
        if (enter) {
            enter.hidden = !!on;
            enter.setAttribute("aria-pressed", on ? "true" : "false");
        }
        if (exit) exit.hidden = !on;
        var frame = pane.querySelector("iframe");
        if (!frame) return;
        if (activeFullscreen() !== pane) {
            frame.style.height = "";
            return;
        }
        var chrome = pane.querySelector(".viz-pane-chrome");
        var fill = Math.ceil(pane.clientHeight - (chrome ? chrome.getBoundingClientRect().height : 0));
        if (fill > 0) frame.style.height = fill + "px";
    }

    /* The browser Fullscreen API often refuses a div that holds an iframe
       in a normal phone tab. The button then fills the screen in the page. */
    function applyImmersive(pane) {
        if (activeFullscreen() === pane) return;
        lockScroll();
        document.body.classList.add("is-immersive");
        pane.classList.add("is-immersive-pane");
        syncPane(pane);
        var exit = pane.querySelector(".book-exit");
        if (exit && exit.focus) exit.focus();
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
            syncPane(pane);
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
            if (activeFullscreen() === pane) {
                clearImmersive(pane, true);
                document.body.classList.remove("is-immersive");
                syncPane(pane);
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

    function leavePane(pane) {
        var wasImmersive = pane && pane.classList.contains("is-immersive-pane");
        if (wasImmersive) clearImmersive(pane, false);
        exitFullscreen().then(function () { syncPane(pane); }).catch(function () { syncPane(pane); });
    }

    document.addEventListener("click", function (event) {
        var enter = event.target.closest && event.target.closest(".book-fullscreen");
        var exit = event.target.closest && event.target.closest(".book-exit");
        if (!enter && !exit) return;
        var pane = (enter || exit).closest(".viz-pane");
        if (!pane) return;
        event.preventDefault();
        if (exit || activeFullscreen() === pane || pane.classList.contains("is-immersive-pane")) leavePane(pane);
        else enterPane(pane);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        var pane = document.querySelector(".book-figure .viz-pane.is-immersive-pane");
        if (!pane) return;
        event.preventDefault();
        leavePane(pane);
    });

    window.addEventListener("popstate", function () {
        var pane = document.querySelector(".book-figure .viz-pane.is-immersive-pane");
        if (!pane) return;
        clearImmersive(pane, true);
    });

    document.addEventListener("fullscreenchange", function () {
        Array.prototype.forEach.call(document.querySelectorAll(".book-figure .viz-pane"), syncPane);
    });
    document.addEventListener("webkitfullscreenchange", function () {
        Array.prototype.forEach.call(document.querySelectorAll(".book-figure .viz-pane"), syncPane);
    });
})();
