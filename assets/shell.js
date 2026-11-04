/*
 * Catalog and Guided Tracks shell.
 * The demo pane loads the selected file in place. A Guided Tracks
 * connection uses the same path: tracks/connection.html?track=&step=
 * in the iframe, and tracks.html?demo=tracks/connection.html&step=
 * in the address bar. Fullscreen only hides the rail; this file does
 * not call the browser Fullscreen API. Phone shows the rail, then the
 * page. Back returns to the same rail.
 */
(function () {
    var page = document.body.getAttribute("data-viz-page");
    if (page !== "catalog" && page !== "tracks") return;

    var phoneQuery = window.matchMedia("(max-width: 736px)");
    var frame = document.getElementById("viz-frame");
    var empty = document.getElementById("viz-empty");
    var titleNode = document.getElementById("viz-pane-title");
    var fullscreenBtn = document.getElementById("viz-fullscreen");
    var exitBtn = document.getElementById("viz-exit");
    var backBtn = document.getElementById("viz-back");
    var rail = document.getElementById("viz-rail");
    var currentHref = "";
    var seeded = false;
    var railScroll = 0;
    var scoped = false;
    var openSelector = "a.demo-card, a.concept-node, a.playlist-connection-link";

    function isPhone() {
        return phoneQuery.matches;
    }

    function safeTrackId(value) {
        if (typeof value !== "string") return "";
        var id = value.trim();
        if (!/^[a-z][a-z0-9-]*$/.test(id)) return "";
        return id;
    }

    function connectionParts(href) {
        if (typeof href !== "string") return null;
        var match = /^tracks\/connection\.html\?track=([a-z][a-z0-9-]*)&step=([0-9]{1,3})$/.exec(href);
        if (!match) return null;
        return { href: href, track: match[1], step: match[2] };
    }

    function safeDemoHref(href) {
        if (typeof href !== "string") return "";
        var value = href.trim();
        if (!value || value.length > 300) return "";
        if (/[\s\\]/.test(value)) return "";
        if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "";
        if (value.indexOf("//") === 0 || value.indexOf("..") !== -1) return "";
        if (value.charAt(0) === "/") return "";
        if (value === "tracks/connection.html") return "";
        if (connectionParts(value)) return value;
        if (!/^[a-z0-9_./-]+\.html$/i.test(value)) return "";
        return value;
    }

    function readConnection() {
        var params;
        try {
            params = new URLSearchParams(window.location.search);
        } catch (err) {
            return "";
        }
        if ((params.get("demo") || "").trim() !== "tracks/connection.html") return "";
        var track = safeTrackId(params.get("track") || "");
        var step = (params.get("step") || "").trim();
        if (!track || !/^[0-9]{1,3}$/.test(step)) return "";
        return "tracks/connection.html?track=" + track + "&step=" + String(parseInt(step, 10));
    }

    function readDemo() {
        var connection = readConnection();
        if (connection) return connection;
        try {
            return safeDemoHref(new URLSearchParams(window.location.search).get("demo") || "");
        } catch (err) {
            return "";
        }
    }

    function findLink(href) {
        var links = document.querySelectorAll(openSelector);
        var i;
        for (i = 0; i < links.length; i++) {
            if (links[i].getAttribute("href") === href) return links[i];
        }
        return null;
    }

    function titleFrom(link) {
        if (!link) return "";
        var named = link.getAttribute("data-pane-title");
        if (named && named.trim()) return named.replace(/\s+/g, " ").trim();
        var node = link.querySelector(".demo-card-title, .concept-title");
        var text = node ? node.textContent : link.textContent;
        return (text || "").replace(/\s+/g, " ").trim();
    }

    function activeCategory() {
        var chip = document.querySelector(".filter-chip.is-active");
        return chip ? (chip.getAttribute("data-filter") || "all") : "all";
    }

    function applyCategory(id) {
        if (!id) return false;
        var chip = null;
        var chips = document.querySelectorAll(".filter-chip");
        var i;
        for (i = 0; i < chips.length; i++) {
            if (chips[i].getAttribute("data-filter") === id) chip = chips[i];
        }
        if (!chip) return false;
        if (!chip.classList.contains("is-active")) chip.click();
        return true;
    }

    function categoryFor(href) {
        var link = findLink(href);
        if (!link || !link.closest) return "";
        var section = link.closest(".category-section");
        return section ? (section.getAttribute("data-category") || "") : "";
    }

    function trackFromLocation() {
        var fromQuery = "";
        try {
            fromQuery = safeTrackId(new URLSearchParams(window.location.search).get("track") || "");
        } catch (err) {}
        if (fromQuery) return fromQuery;
        var hash = window.location.hash.replace(/^#/, "");
        try {
            hash = decodeURIComponent(hash);
        } catch (err) {}
        if (hash.indexOf("track-") === 0) return safeTrackId(hash.slice("track-".length));
        return "";
    }

    function trackFor(href) {
        var links = document.querySelectorAll(".track-block a.concept-node, .track-block a.playlist-connection-link");
        var i;
        for (i = 0; i < links.length; i++) {
            if (links[i].getAttribute("href") !== href) continue;
            var block = links[i].closest(".track-block");
            var heading = block ? block.querySelector("h2[id^='track-']") : null;
            if (heading && heading.id.indexOf("track-") === 0) {
                return safeTrackId(heading.id.slice("track-".length));
            }
        }
        var parts = connectionParts(href);
        if (parts) return parts.track;
        return "";
    }

    function setExpanded(on) {
        if (!currentHref) on = false;
        if (isPhone()) on = false;
        document.body.classList.toggle("is-expanded", !!on);
        if (fullscreenBtn) {
            fullscreenBtn.hidden = !!on;
            fullscreenBtn.setAttribute("aria-pressed", on ? "true" : "false");
        }
        if (exitBtn) exitBtn.hidden = !on;
    }

    function showDemoChrome(open, title) {
        if (rail && open && !document.body.classList.contains("is-demo-open")) {
            railScroll = rail.scrollTop;
        }
        document.body.classList.toggle("is-demo-open", !!open);
        if (!open) document.documentElement.classList.remove("viz-deep-demo");
        if (titleNode) {
            titleNode.textContent = open ? (title || "Demonstration") : "Select a demonstration";
        }
        if (empty) empty.hidden = !!open;
        if (frame) {
            frame.hidden = !open;
            if (!open) {
                frame.src = "about:blank";
                frame.title = "Demonstration";
            }
        }
        if (fullscreenBtn) fullscreenBtn.disabled = !open;
        if (!open) setExpanded(false);
        if (rail && !open) {
            window.requestAnimationFrame(function () {
                var track = page === "tracks" ? trackFromLocation() : "";
                if (track) revealTrack(track);
                else rail.scrollTop = railScroll;
            });
        }
    }

    function highlight(href) {
        document.querySelectorAll(openSelector).forEach(function (link) {
            var on = !!href && link.getAttribute("href") === href;
            link.classList.toggle("is-current", on);
            if (on) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });
        if (!href || isPhone()) return;
        var current = document.querySelector(".viz-rail a.is-current");
        if (current && current.scrollIntoView) {
            current.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
    }

    function revealTrack(id) {
        id = safeTrackId(id);
        if (!id) return;
        var heading = document.getElementById("track-" + id);
        if (!heading || !heading.scrollIntoView) return;
        heading.scrollIntoView({ block: isPhone() ? "start" : "nearest" });
    }

    function buildUrl(href) {
        var url = new URL(window.location.href);
        var parts = connectionParts(href);
        if (parts) {
            url.searchParams.set("demo", "tracks/connection.html");
            url.searchParams.set("step", parts.step);
            if (page === "tracks") {
                url.searchParams.set("track", parts.track);
                url.hash = "track-" + encodeURIComponent(parts.track);
            }
        } else {
            if (href) url.searchParams.set("demo", href);
            else url.searchParams.delete("demo");
            url.searchParams.delete("step");
        }
        if (page === "catalog") {
            url.searchParams.delete("step");
            var category = activeCategory();
            if (category && category !== "all") url.searchParams.set("category", category);
            else url.searchParams.delete("category");
        }
        return url;
    }

    function seed(demoUrl) {
        if (seeded) return;
        seeded = true;
        var listUrl = new URL(demoUrl.href);
        listUrl.searchParams.delete("demo");
        listUrl.searchParams.delete("step");
        history.replaceState({ vizShell: "list", demo: "" }, "", listUrl);
        history.pushState({ vizShell: "demo", demo: currentHref }, "", demoUrl);
    }

    function openDemo(href, options) {
        options = options || {};
        href = safeDemoHref(href);
        if (!href || !frame) return;
        var title = options.title || titleFrom(findLink(href));
        if (!title && connectionParts(href)) title = "Connection";
        var same = currentHref === href && !!frame.getAttribute("src");
        currentHref = href;
        showDemoChrome(true, title);
        highlight(href);
        frame.title = title || "Demonstration";
        if (!same) {
            var src = new URL(href, window.location.href);
            src.searchParams.set("embed", "shell");
            src.hash = "";
            frame.src = src.href;
        }
        if (options.track) {
            var prep = new URL(window.location.href);
            prep.searchParams.set("track", options.track);
            prep.hash = "track-" + encodeURIComponent(options.track);
            history.replaceState(history.state || { vizShell: "list", demo: "" }, "", prep);
        }
        var next = buildUrl(href);
        var state = { vizShell: "demo", demo: href };
        if (options.mode === "seed") seed(next);
        else if (options.mode === "replace") history.replaceState(state, "", next);
        else if (options.mode === "push" && window.location.href !== next.href) {
            if (history.state && history.state.vizShell === "demo") history.replaceState(state, "", next);
            else history.pushState(state, "", next);
        }
        if (options.focus && isPhone() && backBtn) backBtn.focus();
    }

    function closeDemo(mode) {
        var previous = currentHref;
        currentHref = "";
        showDemoChrome(false);
        highlight("");
        if (mode === "push") {
            var next = buildUrl("");
            if (window.location.href !== next.href) {
                history.pushState({ vizShell: "list", demo: "" }, "", next);
            }
        }
        if (isPhone() && previous) {
            var link = findLink(previous);
            if (link) link.focus();
        }
    }

    function syncFromLocation() {
        var params = new URLSearchParams(window.location.search);
        var demo = safeDemoHref(params.get("demo") || "");
        if (page === "catalog") applyCategory(params.get("category") || "all");
        if (page === "tracks") revealTrack(trackFromLocation());
        if (demo) openDemo(demo, { mode: "none" });
        else closeDemo("none");
    }

    function onCatalogReady() {
        if (scoped || page !== "catalog") return;
        scoped = true;
        var params = new URLSearchParams(window.location.search);
        var demo = readDemo();
        var category = params.get("category");
        if (category) applyCategory(category);
        else if (demo) applyCategory(categoryFor(demo));
        if (demo) openDemo(demo, { mode: seeded ? "replace" : "seed" });
    }

    function onTracksReady() {
        if (scoped || page !== "tracks") return;
        scoped = true;
        var demo = readDemo();
        var track = trackFromLocation();
        if (!track && demo) track = trackFor(demo);
        if (track) {
            var prep = new URL(window.location.href);
            prep.searchParams.set("track", track);
            if (!prep.hash) prep.hash = "track-" + encodeURIComponent(track);
            history.replaceState(history.state || { vizShell: demo ? "demo" : "list", demo: demo || "" }, "", prep);
            revealTrack(track);
        }
        if (demo) openDemo(demo, { mode: seeded ? "replace" : "seed" });
    }

    document.addEventListener("click", function (event) {
        if (!event.isTrusted || event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var link = event.target.closest ? event.target.closest(openSelector) : null;
        if (!link || (rail && !rail.contains(link))) return;
        var href = safeDemoHref(link.getAttribute("href") || "");
        if (!href) return;
        event.preventDefault();
        var track = "";
        var block = link.closest ? link.closest(".track-block") : null;
        if (block) {
            var heading = block.querySelector("h2[id^='track-']");
            if (heading) track = safeTrackId(heading.id.slice("track-".length));
        }
        openDemo(href, {
            mode: "push",
            title: titleFrom(link),
            track: track,
            focus: true
        });
    });

    document.addEventListener("click", function (event) {
        var chip = event.target.closest ? event.target.closest(".filter-chip") : null;
        if (!chip || !event.isTrusted || page !== "catalog") return;
        window.setTimeout(function () {
            var url = buildUrl(currentHref);
            history.replaceState({
                vizShell: currentHref ? "demo" : "list",
                demo: currentHref || ""
            }, "", url);
        }, 0);
    });

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", function () {
            setExpanded(true);
        });
    }
    if (exitBtn) {
        exitBtn.addEventListener("click", function () {
            setExpanded(false);
        });
    }
    if (backBtn) {
        backBtn.addEventListener("click", function () {
            setExpanded(false);
            if (history.state && history.state.vizShell === "demo") {
                history.back();
                return;
            }
            closeDemo("push");
        });
    }

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        if (!document.body.classList.contains("is-expanded")) return;
        setExpanded(false);
    });

    window.addEventListener("popstate", syncFromLocation);
    document.addEventListener("projectviz:catalog", onCatalogReady);
    document.addEventListener("projectviz:tracks", onTracksReady);

    var initial = readDemo();
    if (initial) openDemo(initial, { mode: "none", focus: isPhone() });
    else history.replaceState({ vizShell: "list", demo: "" }, "", window.location.href);
    document.body.classList.add("viz-shell-ready");

    if (phoneQuery.addEventListener) {
        phoneQuery.addEventListener("change", function () {
            if (isPhone()) setExpanded(false);
        });
    }
})();
