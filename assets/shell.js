/*
 * Catalog and Guided Tracks shell.
 * The demo pane loads the selected file in place. A Guided Tracks
 * connection uses the same path: tracks/connection.html?track=&step=
 * in the iframe, and tracks.html?demo=tracks/connection.html&step=
 * in the address bar. step= is still that step's index. The rail lists
 * the connection before the demonstration. Fullscreen calls the browser
 * Fullscreen API on #viz-pane (the bar and the open demonstration).
 * While that pane is fullscreen it is the scrollport: the iframe is
 * laid out at the demonstration's content height, so a vertical swipe
 * scrolls. Exit, Back, and Escape leave it. document.exitFullscreen()
 * is not called for a scroll or a swipe. The enter control is hidden
 * only under 480px. Phone shows the rail, then the page. A wider
 * phone shell still offers Fullscreen.
 * On Guided Tracks the desktop rail lists topics and the pane
 * shows the topic tree until a track is open. Choosing a topic zooms
 * that subtree. Back from a demonstration returns to that track, and
 * Back in the rail returns to the focused topic or the full overview.
 * A phone shows the tree first. On Catalog the desktop rail is
 * categories until a demonstration is open, and the pane holds that
 * category's cards. Back to browse restores the grid. On a phone,
 * Back from a demonstration returns to that category, and Back in the
 * rail returns to the category list.
 */
(function () {
    var page = document.body.getAttribute("data-viz-page");
    if (page !== "catalog" && page !== "tracks") return;

    var phoneQuery = window.matchMedia("(max-width: 736px)");
    var hidesFullscreenQuery = window.matchMedia("(max-width: 479px)");
    var frame = document.getElementById("viz-frame");
    if (frame) {
        frame.allowFullscreen = true;
        if ((frame.getAttribute("allow") || "").indexOf("fullscreen") === -1) {
            frame.setAttribute("allow", "fullscreen");
        }
        frame.addEventListener("load", function () {
            if (activeFullscreen() === document.getElementById("viz-pane")) syncFullscreenScroll();
        });
    }
    var empty = document.getElementById("viz-empty");
    var titleNode = document.getElementById("viz-pane-title");
    var fullscreenBtn = document.getElementById("viz-fullscreen");
    var prevBtn = document.getElementById("viz-prev");
    var nextBtn = document.getElementById("viz-next");
    var exitBtn = document.getElementById("viz-exit");
    var backBtn = document.getElementById("viz-back");
    var rail = document.getElementById("viz-rail");
    var currentHref = "";
    var currentLink = null;
    var fsScrollObserver = null;
    var fsScrollBody = null;
    var fsScrollLock = false;
    var fsScrollScheduled = false;
    var seeded = false;
    var railScroll = 0;
    var scoped = false;
    var pendingTrackFocus = "";
    var openSelector = "a.demo-card, a.catalog-demo, a.concept-node, a.playlist-connection-link";

    function isPhone() {
        return phoneQuery.matches;
    }

    function hidesFullscreen() {
        return hidesFullscreenQuery.matches;
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

    function inTrackList(link) {
        return !!(link && link.closest && link.closest(".track-block"));
    }

    function linksFor(href) {
        var links = document.querySelectorAll(openSelector);
        var matches = [];
        var i;
        for (i = 0; i < links.length; i++) {
            if (links[i].getAttribute("href") === href) matches.push(links[i]);
        }
        return matches;
    }

    function findLink(href) {
        var chosen = preferredLink(href, null);
        return chosen;
    }

    function preferredLink(href, explicit) {
        if (page === "catalog") {
            var catalogMatches = linksFor(href);
            var catalogIndex;
            if (explicit && explicit.isConnected && rail && rail.contains(explicit) && explicit.getAttribute("href") === href) {
                return explicit;
            }
            for (catalogIndex = 0; catalogIndex < catalogMatches.length; catalogIndex++) {
                if (rail && rail.contains(catalogMatches[catalogIndex])) return catalogMatches[catalogIndex];
            }
            return catalogMatches.length ? catalogMatches[0] : null;
        }
        if (explicit && explicit.getAttribute && explicit.getAttribute("href") === href) return explicit;
        var matches = linksFor(href);
        var trackId = page === "tracks" ? trackFromLocation() : "";
        var i;
        if (trackId) {
            for (i = 0; i < matches.length; i++) {
                if (!inTrackList(matches[i])) continue;
                var block = matches[i].closest(".track-block");
                var heading = block ? block.querySelector("h2[id^='track-']") : null;
                if (heading && heading.id === "track-" + trackId) return matches[i];
            }
        }
        for (i = 0; i < matches.length; i++) {
            if (inTrackList(matches[i])) return matches[i];
        }
        return matches.length ? matches[0] : null;
    }

    function titleFrom(link) {
        if (!link) return "";
        var named = link.getAttribute("data-pane-title");
        if (named && named.trim()) return named.replace(/\s+/g, " ").trim();
        var node = link.querySelector(".demo-card-title, .concept-title");
        var text = node ? node.textContent : link.textContent;
        return (text || "").replace(/\s+/g, " ").trim();
    }

    function categoryFor(href) {
        if (page === "catalog" && window.ProjectVizCatalog && window.ProjectVizCatalog.categoryForHref) {
            return window.ProjectVizCatalog.categoryForHref(href) || "";
        }
        var link = findLink(href);
        if (!link || !link.closest) return "";
        var section = link.closest(".category-section");
        return section ? (section.getAttribute("data-category") || "") : "";
    }

    function catalogCategory() {
        if (window.ProjectVizCatalog && window.ProjectVizCatalog.currentId) {
            return window.ProjectVizCatalog.currentId() || "";
        }
        return "";
    }

    function catalogExplicit() {
        return !!(window.ProjectVizCatalog && window.ProjectVizCatalog.explicit && window.ProjectVizCatalog.explicit());
    }

    function catalogExplicitFromLocation() {
        var params;
        try {
            params = new URLSearchParams(window.location.search);
        } catch (err) {
            return false;
        }
        if (safeTrackId(params.get("category") || "")) return true;
        if (readDemo()) return true;
        if (window.ProjectVizCatalog && window.ProjectVizCatalog.categoryForHash && window.ProjectVizCatalog.categoryForHash(window.location.hash)) {
            return true;
        }
        return false;
    }

    function resolveCatalogCategory(demo) {
        var api = window.ProjectVizCatalog;
        if (!api) return "";
        var params;
        try {
            params = new URLSearchParams(window.location.search);
        } catch (err) {
            params = new URLSearchParams();
        }
        var requested = safeTrackId(params.get("category") || "");
        var fromDemo = demo && api.categoryForHref ? (api.categoryForHref(demo) || "") : "";
        if (fromDemo) return fromDemo;
        if (requested && api.has && api.has(requested)) return requested;
        var fromHash = api.categoryForHash ? (api.categoryForHash(window.location.hash) || "") : "";
        if (fromHash) return fromHash;
        if (!isPhone() && api.firstId) return api.firstId() || "";
        return "";
    }

    function catalogBrowsing() {
        var node = document.getElementById("catalog-browse");
        return !!(node && !node.hidden);
    }

    function syncCatalogView() {
        if (page !== "catalog" || !window.ProjectVizCatalog || !window.ProjectVizCatalog.ready || !window.ProjectVizCatalog.ready()) return;
        var demo = readDemo();
        window.ProjectVizCatalog.sync({
            category: resolveCatalogCategory(demo),
            demoOpen: !!demo,
            explicit: catalogExplicitFromLocation()
        });
        if (demo && currentHref) highlight(currentHref);
        else if (!demo && titleNode && window.ProjectVizCatalog.stageTitle) {
            titleNode.textContent = window.ProjectVizCatalog.stageTitle() || "Catalog";
        }
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
        if (window.ProjectVizTracks && window.ProjectVizTracks.trackForHref) {
            var fromData = window.ProjectVizTracks.trackForHref(href);
            if (fromData) return fromData;
        }
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

    function fullscreenHost() {
        return document.getElementById("viz-pane") || document.documentElement;
    }

    function activeFullscreen() {
        return document.fullscreenElement
            || document.webkitFullscreenElement
            || document.webkitCurrentFullScreenElement
            || document.mozFullScreenElement
            || document.msFullscreenElement
            || null;
    }

    function callFullscreen(target, name) {
        var fn = target[name];
        if (typeof fn !== "function") return undefined;
        if (name === "webkitRequestFullScreen" && typeof Element !== "undefined" && Element.ALLOW_KEYBOARD_INPUT) {
            return fn.call(target, Element.ALLOW_KEYBOARD_INPUT);
        }
        return fn.call(target);
    }

    function asFullscreenPromise(result) {
        if (result && typeof result.then === "function") return result;
        return Promise.resolve();
    }

    function requestFullscreen(el) {
        if (!el) return Promise.reject(new Error("fullscreen-unavailable"));
        var names = [
            "requestFullscreen",
            "webkitRequestFullscreen",
            "webkitRequestFullScreen",
            "mozRequestFullScreen",
            "msRequestFullscreen"
        ];
        var i, result, lastErr, saw = false;
        for (i = 0; i < names.length; i++) {
            if (typeof el[names[i]] !== "function") continue;
            saw = true;
            try {
                result = callFullscreen(el, names[i]);
            } catch (err) {
                if (names[i] === "webkitRequestFullScreen") {
                    try {
                        result = el.webkitRequestFullScreen();
                    } catch (err2) {
                        lastErr = err2;
                        continue;
                    }
                } else {
                    lastErr = err;
                    continue;
                }
            }
            return asFullscreenPromise(result);
        }
        return Promise.reject(lastErr || new Error(saw ? "fullscreen-rejected" : "fullscreen-unavailable"));
    }

    function exitFullscreen() {
        if (!activeFullscreen()) return Promise.resolve();
        var names = [
            "exitFullscreen",
            "webkitExitFullscreen",
            "webkitCancelFullScreen",
            "mozCancelFullScreen",
            "msExitFullscreen"
        ];
        var i, result;
        for (i = 0; i < names.length; i++) {
            if (typeof document[names[i]] !== "function") continue;
            try {
                result = callFullscreen(document, names[i]);
            } catch (err) {
                continue;
            }
            return asFullscreenPromise(result);
        }
        return Promise.resolve();
    }

    function clearFullscreenScroll() {
        if (fsScrollObserver) {
            fsScrollObserver.disconnect();
            fsScrollObserver = null;
        }
        fsScrollBody = null;
        if (frame) frame.style.height = "";
    }

    function frameDocument() {
        if (!frame) return null;
        try {
            return frame.contentDocument;
        } catch (err) {
            return null;
        }
    }

    function watchFullscreenBody(body) {
        if (!body || typeof ResizeObserver === "undefined") return;
        if (fsScrollBody === body && fsScrollObserver) return;
        if (fsScrollObserver) fsScrollObserver.disconnect();
        fsScrollBody = body;
        fsScrollObserver = new ResizeObserver(function () {
            if (fsScrollLock) return;
            scheduleFullscreenScroll();
        });
        fsScrollObserver.observe(body);
    }

    function scheduleFullscreenScroll() {
        if (fsScrollScheduled) return;
        fsScrollScheduled = true;
        window.requestAnimationFrame(function () {
            fsScrollScheduled = false;
            syncFullscreenScroll();
        });
    }

    /* The browser fullscreen element is #viz-pane. A vertical swipe
     * scrolls that element only when it overflows. The demonstration
     * scrolls inside the iframe, so the pane's own box does not, and
     * the swipe is not a scroll (on some mobile browsers it leaves
     * fullscreen). Size the iframe to the document while fullscreen.
     * Exit, Back, and Escape still leave fullscreen. This does not. */
    function syncFullscreenScroll() {
        if (fsScrollLock) return;
        var pane = document.getElementById("viz-pane");
        if (!frame || !pane || activeFullscreen() !== pane) {
            clearFullscreenScroll();
            return;
        }
        var doc = frameDocument();
        if (!doc || !doc.body) return;
        var scrolling = doc.scrollingElement || doc.documentElement;
        fsScrollLock = true;
        try {
            var overflow = scrolling.scrollHeight - scrolling.clientHeight;
            if (overflow > 1) {
                var next = Math.ceil(scrolling.scrollHeight) + "px";
                if (frame.style.height !== next) frame.style.height = next;
            } else if (!frame.style.height) {
                var chrome = pane.querySelector(".viz-pane-chrome");
                var chromeH = chrome ? chrome.getBoundingClientRect().height : 0;
                var minH = Math.ceil(Math.max(0, pane.clientHeight - chromeH));
                if (minH > 0) frame.style.height = minH + "px";
            }
            watchFullscreenBody(doc.body);
        } finally {
            fsScrollLock = false;
        }
    }

    function applyExpanded(on) {
        document.body.classList.toggle("is-expanded", !!on);
        if (fullscreenBtn) {
            fullscreenBtn.hidden = !!on;
            fullscreenBtn.setAttribute("aria-pressed", on ? "true" : "false");
        }
        if (exitBtn) exitBtn.hidden = !on;
        if (on) syncFullscreenScroll();
        else clearFullscreenScroll();
    }

    function syncExpanded() {
        var on = !!activeFullscreen();
        /* Narrow-phone guard and a closed demo. Not a scroll or a swipe. */
        if (on && (hidesFullscreen() || !currentHref)) {
            exitFullscreen().catch(function () {});
            on = false;
        }
        applyExpanded(on);
    }

    function setExpanded(on) {
        if (!currentHref || hidesFullscreen()) on = false;
        if (!on) {
            exitFullscreen().catch(function () {});
            applyExpanded(false);
            return;
        }
        if (activeFullscreen()) {
            applyExpanded(true);
            return;
        }
        requestFullscreen(fullscreenHost()).then(function () {
            syncExpanded();
        }).catch(function () {
            applyExpanded(!!activeFullscreen());
        });
    }

    function showDemoChrome(open, title) {
        if (rail && open && !document.body.classList.contains("is-demo-open")) {
            railScroll = rail.scrollTop;
        }
        document.body.classList.toggle("is-demo-open", !!open);
        if (!open) document.documentElement.classList.remove("viz-deep-demo");
        if (titleNode && open) titleNode.textContent = title || "Demonstration";
        if (!open && page === "tracks") refreshTracksIdle();
        else if (titleNode && !open && page === "catalog" && window.ProjectVizCatalog && window.ProjectVizCatalog.stageTitle) {
            titleNode.textContent = window.ProjectVizCatalog.stageTitle() || "Catalog";
        } else if (titleNode && !open) titleNode.textContent = "Select a demonstration";
        if (empty) {
            var topicMap = page === "tracks" && !open && tracksBrowsing() && !isPhone();
            empty.hidden = !!open || (page === "catalog" && catalogBrowsing()) || topicMap;
        }
        if (frame) {
            frame.hidden = !open;
            if (!open) {
                frame.src = "about:blank";
                frame.title = "Demonstration";
            }
        }
        if (fullscreenBtn) fullscreenBtn.disabled = !open;
        refreshStepNav();
        if (!open) setExpanded(false);
        if (rail && !open) {
            window.requestAnimationFrame(function () {
                var track = page === "tracks" ? trackFromLocation() : "";
                if (track) revealTrack(track);
                else rail.scrollTop = railScroll;
            });
        }
        if (page === "tracks") syncTracksChrome();
    }

    function highlight(href, explicit) {
        var chosen = href ? preferredLink(href, explicit) : null;
        currentLink = chosen;
        document.querySelectorAll(openSelector).forEach(function (link) {
            var on = link === chosen;
            link.classList.toggle("is-current", on);
            if (on) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });
        if (!chosen || isPhone() || !chosen.scrollIntoView) return;
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                if (currentLink === chosen) {
                    chosen.scrollIntoView({ block: "nearest", inline: "nearest" });
                }
            });
        });
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
                url.hash = "";
            }
        } else {
            if (href) url.searchParams.set("demo", href);
            else url.searchParams.delete("demo");
            url.searchParams.delete("step");
        }
        if (page === "catalog") {
            url.searchParams.delete("step");
            url.searchParams.delete("track");
            var category = catalogCategory();
            if (category && (href || catalogExplicit())) url.searchParams.set("category", category);
            else url.searchParams.delete("category");
        }
        return url;
    }

    function topicFromLocation() {
        try {
            return safeTrackId(new URLSearchParams(window.location.search).get("topic") || "");
        } catch (err) {
            return "";
        }
    }

    function topicUrl(id) {
        var url = new URL(window.location.href);
        url.searchParams.delete("track");
        url.searchParams.delete("demo");
        url.searchParams.delete("step");
        url.hash = "";
        if (id) url.searchParams.set("topic", id);
        else url.searchParams.delete("topic");
        return url;
    }

    function landingUrl() {
        return topicUrl("");
    }

    function trackUrl(id) {
        var url = new URL(window.location.href);
        url.searchParams.delete("demo");
        url.searchParams.delete("step");
        url.searchParams.set("track", id);
        var topic = topicFromLocation();
        if (topic) url.searchParams.set("topic", topic);
        else url.searchParams.delete("topic");
        url.hash = "";
        return url;
    }

    function trackState(id, pushed) {
        return { vizShell: "track", track: id, topic: topicFromLocation(), demo: "", pushed: !!pushed };
    }

    function topicState(id, pushed) {
        return { vizShell: "topic", topic: id, track: "", demo: "", pushed: !!pushed };
    }

    function tracksState() {
        return { vizShell: "tracks", demo: "", track: "", topic: "" };
    }

    function demoState(href) {
        if (page === "catalog") {
            return {
                vizShell: "demo",
                demo: href,
                category: catalogCategory(),
                pushed: true
            };
        }
        var prior = history.state || {};
        var trackPushed = prior.vizShell === "track" && !!prior.pushed;
        if (prior.vizShell === "demo" && prior.trackPushed) trackPushed = true;
        return {
            vizShell: "demo",
            demo: href,
            track: trackFromLocation(),
            topic: topicFromLocation(),
            trackPushed: trackPushed
        };
    }

    function tracksBrowsing() {
        return page === "tracks"
            && !currentHref
            && !!(window.ProjectVizTracks && window.ProjectVizTracks.browsing && window.ProjectVizTracks.browsing());
    }

    function syncTracksChrome() {
        if (page !== "tracks") return;
        var overview = document.getElementById("viz-overview");
        var showMap = tracksBrowsing() && !isPhone();
        if (overview) overview.hidden = !showMap;
        if (empty) empty.hidden = !!currentHref || showMap;
        var pane = document.getElementById("viz-pane");
        if (pane) pane.setAttribute("aria-label", showMap ? "Topic overview" : "Demonstration");
        if (currentHref || !titleNode) return;
        var inTrack = window.ProjectVizTracks && window.ProjectVizTracks.currentId
            ? window.ProjectVizTracks.currentId()
            : "";
        if (inTrack) {
            titleNode.textContent = "Select a demonstration";
            if (empty) empty.textContent = "Select a step.";
        } else if (window.ProjectVizTracks && window.ProjectVizTracks.stageTitle) {
            titleNode.textContent = window.ProjectVizTracks.stageTitle() || "All topics";
        } else {
            titleNode.textContent = "All topics";
        }
    }

    function refreshTracksIdle() {
        syncTracksChrome();
    }

    function syncTracks(options) {
        if (page !== "tracks" || !window.ProjectVizTracks || !window.ProjectVizTracks.sync) return;
        window.ProjectVizTracks.sync(options || {});
        refreshStepNav();
    }

    function stepLinks() {
        if (page !== "tracks" || !rail) return [];
        return Array.prototype.slice.call(rail.querySelectorAll("a.playlist-connection-link, a.concept-node"));
    }

    function stepIndex(links) {
        var i;
        if (!currentHref) return -1;
        for (i = 0; i < links.length; i++) {
            if (links[i].classList.contains("is-current") && links[i].getAttribute("href") === currentHref) {
                return i;
            }
        }
        for (i = 0; i < links.length; i++) {
            if (links[i].getAttribute("href") === currentHref) return i;
        }
        return -1;
    }

    function refreshStepNav() {
        if (page !== "tracks" || !prevBtn || !nextBtn) return;
        var inTrack = window.ProjectVizTracks && window.ProjectVizTracks.currentId
            ? window.ProjectVizTracks.currentId()
            : "";
        var links = inTrack ? stepLinks() : [];
        var show = !!inTrack && links.length > 0;
        prevBtn.hidden = !show;
        nextBtn.hidden = !show;
        if (!show) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }
        var index = stepIndex(links);
        prevBtn.disabled = index <= 0;
        nextBtn.disabled = index >= 0 && index >= links.length - 1;
    }

    function moveStep(delta) {
        var links = stepLinks();
        if (!links.length) return;
        var index = stepIndex(links);
        var target = index + delta;
        if (index < 0 && delta > 0) target = 0;
        if (target < 0 || target >= links.length) return;
        var link = links[target];
        var href = safeDemoHref(link.getAttribute("href") || "");
        if (!href) return;
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
            link: link
        });
    }

    function seed(demoUrl) {
        if (seeded) return;
        seeded = true;
        var listUrl = new URL(demoUrl.href);
        listUrl.searchParams.delete("demo");
        listUrl.searchParams.delete("step");
        if (page === "catalog") {
            var category = catalogCategory();
            history.replaceState({
                vizShell: category ? "category" : "categories",
                category: category || "",
                demo: "",
                pushed: false
            }, "", listUrl);
            history.pushState({
                vizShell: "demo",
                demo: currentHref,
                category: category || "",
                pushed: true
            }, "", demoUrl);
            return;
        }
        var track = trackFromLocation();
        history.replaceState(trackState(track, false), "", listUrl);
        history.pushState({
            vizShell: "demo",
            demo: currentHref,
            track: track,
            trackPushed: false
        }, "", demoUrl);
    }

    function openDemo(href, options) {
        options = options || {};
        href = safeDemoHref(href);
        if (!href || !frame) return;
        if (page === "catalog" && window.ProjectVizCatalog && window.ProjectVizCatalog.sync) {
            var catalogOptions = {
                category: options.category || categoryFor(href) || catalogCategory(),
                demoOpen: true
            };
            if (options.mode !== "none") catalogOptions.explicit = true;
            window.ProjectVizCatalog.sync(catalogOptions);
        }
        var title = options.title || titleFrom(findLink(href));
        var same = currentHref === href && !!frame.getAttribute("src");
        currentHref = href;
        showDemoChrome(true, title);
        highlight(href, options.link || null);
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
            prep.hash = "";
            history.replaceState(history.state || { vizShell: "list", demo: "" }, "", prep);
        }
        var next = buildUrl(href);
        var state = demoState(href);
        if (options.track) state.track = options.track;
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
        if (page === "catalog" && window.ProjectVizCatalog && window.ProjectVizCatalog.sync && window.ProjectVizCatalog.ready && window.ProjectVizCatalog.ready()) {
            window.ProjectVizCatalog.sync({
                category: catalogCategory(),
                demoOpen: false
            });
        }
        showDemoChrome(false);
        highlight("");
        if (mode === "push") {
            var next = buildUrl("");
            if (window.location.href !== next.href) {
                if (page === "catalog") {
                    history.pushState({
                        vizShell: catalogCategory() ? "category" : "categories",
                        category: catalogCategory(),
                        demo: "",
                        pushed: true
                    }, "", next);
                } else {
                    var track = page === "tracks" ? trackFromLocation() : "";
                    history.pushState(track ? trackState(track, false) : { vizShell: "list", demo: "" }, "", next);
                }
            }
        }
        if (isPhone() && previous) {
            var link = preferredLink(previous, null);
            if (link) link.focus();
        }
    }

    function openTopic(id) {
        id = safeTrackId(id);
        if (id && (!window.ProjectVizTracks || !window.ProjectVizTracks.hasTopic || !window.ProjectVizTracks.hasTopic(id))) return;
        if (!id && !trackFromLocation() && !topicFromLocation() && !currentHref) return;
        if (id && id === topicFromLocation() && !trackFromLocation() && !currentHref) return;
        var next = topicUrl(id);
        var state = id ? topicState(id, true) : tracksState();
        if (currentHref) {
            currentHref = "";
            showDemoChrome(false);
            highlight("");
        }
        if (window.location.href !== next.href) history.pushState(state, "", next);
        else history.replaceState(state, "", next);
        syncTracks(isPhone() && id ? { focus: "back" } : { focusTopic: id });
        refreshTracksIdle();
    }

    function openTrack(id) {
        id = safeTrackId(id);
        if (!id) return;
        var next = trackUrl(id);
        var state = trackState(id, true);
        if (window.location.href !== next.href) history.pushState(state, "", next);
        else history.replaceState(state, "", next);
        if (currentHref) {
            currentHref = "";
            showDemoChrome(false);
            highlight("");
        }
        syncTracks({ focus: "back" });
        refreshTracksIdle();
    }

    function traverseHistory(delta) {
        // Chrome drops history.back/go called in the same turn as the click.
        window.setTimeout(function () {
            if (delta === -1) history.back();
            else history.go(delta);
        }, 0);
    }

    function showTrackRail() {
        var previous = currentHref;
        var track = safeTrackId(trackFromLocation() || ((history.state && history.state.track) || ""));
        if (!track) {
            returnToTrackList();
            return;
        }
        if (currentHref) {
            currentHref = "";
            showDemoChrome(false);
            highlight("");
        }
        var next = trackUrl(track);
        var prior = history.state || {};
        history.replaceState(trackState(track, !!(prior.trackPushed || prior.pushed)), "", next);
        syncTracks();
        refreshTracksIdle();
        if (isPhone() && previous) {
            var link = preferredLink(previous, null);
            if (link) link.focus();
        }
    }

    function returnToTrackList() {
        var state = history.state || {};
        var fromTrack = safeTrackId(trackFromLocation() || state.track || "");
        var topic = fromTrack ? topicFromLocation() : "";
        pendingTrackFocus = fromTrack;
        if (currentHref) {
            currentHref = "";
            showDemoChrome(false);
            highlight("");
        }
        var next = topic ? topicUrl(topic) : landingUrl();
        var dest = topic ? topicState(topic, true) : tracksState();
        // A second history.back() is dropped when it follows the demo Back.
        // Write the overview directly. Replacing a demo entry keeps Back
        // from reopening that demonstration.
        if (state.vizShell === "demo" || window.location.href === next.href) {
            history.replaceState(dest, "", next);
        } else if (window.location.href !== next.href) {
            history.pushState(dest, "", next);
        }
        var focus;
        if (topic) focus = isPhone() ? { focus: "back" } : { focusTopic: topic };
        else focus = isPhone() ? { focusChoice: pendingTrackFocus } : { focusTopic: "" };
        syncTracks(focus);
        pendingTrackFocus = "";
        refreshTracksIdle();
    }

    function openCategory(id, options) {
        options = options || {};
        id = safeTrackId(id);
        if (!id || !window.ProjectVizCatalog || !window.ProjectVizCatalog.has || !window.ProjectVizCatalog.has(id)) return;
        var browsingSame = window.ProjectVizCatalog.currentId() === id && !currentHref;
        if (browsingSame && !options.replace) return;
        if (currentHref) {
            currentHref = "";
            highlight("");
        }
        window.ProjectVizCatalog.sync({ category: id, demoOpen: false, explicit: true });
        showDemoChrome(false);
        var next = buildUrl("");
        var state = {
            vizShell: "category",
            category: id,
            demo: "",
            pushed: !options.replace
        };
        if (!options.replace && window.location.href !== next.href) history.pushState(state, "", next);
        else history.replaceState(state, "", next);
        if (isPhone()) {
            var back = document.getElementById("catalog-back");
            if (back && !back.hidden) back.focus();
        }
    }

    function retreatCatalogDemo() {
        var category = catalogCategory();
        currentHref = "";
        if (window.ProjectVizCatalog && window.ProjectVizCatalog.sync) {
            window.ProjectVizCatalog.sync({ category: category, demoOpen: false });
        }
        showDemoChrome(false);
        highlight("");
        history.replaceState({
            vizShell: category ? "category" : "categories",
            category: category || "",
            demo: "",
            pushed: false
        }, "", buildUrl(""));
    }

    function retreatCatalogCategories() {
        var focusId = catalogCategory();
        currentHref = "";
        if (window.ProjectVizCatalog && window.ProjectVizCatalog.sync) {
            window.ProjectVizCatalog.sync({ category: "", demoOpen: false, explicit: false });
        }
        showDemoChrome(false);
        highlight("");
        var url = new URL(window.location.href);
        url.searchParams.delete("demo");
        url.searchParams.delete("category");
        url.searchParams.delete("step");
        url.hash = "";
        var state = { vizShell: "categories", category: "", demo: "", pushed: true };
        if (window.location.href !== url.href) history.pushState(state, "", url);
        else history.replaceState(state, "", url);
        if (isPhone() && focusId && rail) {
            var choice = rail.querySelector('a.catalog-choice[data-category="' + focusId + '"]');
            if (choice) choice.focus();
        }
    }

    function backCatalog() {
        // Closing a demonstration does not use history.back(). The iframe
        // navigation sits in the same session history, so one Back would
        // step the frame and leave the shell on the open demo.
        if (currentHref) {
            retreatCatalogDemo();
            return;
        }
        var state = history.state || {};
        if (state.vizShell === "category" && state.pushed) {
            traverseHistory(-1);
            return;
        }
        retreatCatalogCategories();
    }

    function syncFromLocation() {
        var demo = readDemo();
        var focusChoice = "";
        if (page === "tracks" && !trackFromLocation()) focusChoice = pendingTrackFocus;
        pendingTrackFocus = "";
        if (page === "tracks") syncTracks(focusChoice ? { focusChoice: focusChoice } : {});
        if (page === "catalog") syncCatalogView();
        if (demo) openDemo(demo, { mode: "none" });
        else closeDemo("none");
        refreshTracksIdle();
    }

    function onCatalogReady() {
        if (scoped || page !== "catalog") return;
        scoped = true;
        if (!window.ProjectVizCatalog || !window.ProjectVizCatalog.ready || !window.ProjectVizCatalog.ready()) return;
        var demo = readDemo();
        var category = resolveCatalogCategory(demo);
        window.ProjectVizCatalog.sync({
            category: category,
            demoOpen: !!demo,
            explicit: catalogExplicitFromLocation()
        });
        if (demo) openDemo(demo, { mode: seeded ? "replace" : "seed", category: category });
        else {
            history.replaceState({
                vizShell: category ? "category" : "categories",
                category: category || "",
                demo: "",
                pushed: false
            }, "", buildUrl(""));
            showDemoChrome(false);
        }
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
            prep.hash = "";
            var prior = history.state || {};
            history.replaceState({
                vizShell: demo ? "demo" : "track",
                demo: demo || "",
                track: track,
                topic: topicFromLocation(),
                pushed: !!prior.pushed,
                trackPushed: !!prior.trackPushed
            }, "", prep);
        }
        syncTracks();
        if (demo) openDemo(demo, { mode: seeded ? "replace" : "seed", track: track });
        else refreshTracksIdle();
    }

    document.addEventListener("click", function (event) {
        if (!event.isTrusted || event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var link = event.target.closest ? event.target.closest(openSelector) : null;
        if (!link) return;
        var browseRoot = document.getElementById("catalog-browse");
        var inRail = rail && rail.contains(link);
        var inBrowse = page === "catalog" && browseRoot && browseRoot.contains(link);
        if (!inRail && !inBrowse) return;
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
            category: link.getAttribute("data-category") || "",
            focus: true,
            link: link
        });
    });

    document.addEventListener("click", function (event) {
        if (page !== "tracks" || !event.isTrusted || event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var back = event.target.closest ? event.target.closest("button.track-rail-back") : null;
        if (back && (!rail || rail.contains(back))) {
            event.preventDefault();
            returnToTrackList();
            return;
        }
        var topicLink = event.target.closest
            ? event.target.closest("a.topic-choice, a.overview-node.is-topic")
            : null;
        if (topicLink && inTracksSurface(topicLink)) {
            event.preventDefault();
            openTopic(topicLink.getAttribute("data-topic") || "");
            return;
        }
        var choice = event.target.closest ? event.target.closest("a.overview-node.is-track") : null;
        if (!choice || !inTracksSurface(choice)) return;
        var chosen = safeTrackId(choice.getAttribute("data-track") || "");
        if (!chosen) return;
        event.preventDefault();
        openTrack(chosen);
    });

    document.addEventListener("click", function (event) {
        if (page !== "catalog" || !event.isTrusted || event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var back = event.target.closest ? event.target.closest("button.catalog-rail-back") : null;
        if (back && (!rail || rail.contains(back))) {
            event.preventDefault();
            backCatalog();
            return;
        }
        var choice = event.target.closest ? event.target.closest("a.catalog-choice") : null;
        if (!choice || (rail && !rail.contains(choice))) return;
        var chosen = safeTrackId(choice.getAttribute("data-category") || "");
        if (!chosen) return;
        event.preventDefault();
        openCategory(chosen);
    });

    if (prevBtn) {
        prevBtn.addEventListener("click", function () {
            if (prevBtn.disabled || prevBtn.hidden) return;
            moveStep(-1);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener("click", function () {
            if (nextBtn.disabled || nextBtn.hidden) return;
            moveStep(1);
        });
    }
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
            if (page === "tracks") {
                showTrackRail();
                return;
            }
            if (page === "catalog") {
                backCatalog();
                return;
            }
            if (history.state && history.state.vizShell === "demo") {
                traverseHistory(-1);
                return;
            }
            closeDemo("push");
        });
    }

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        if (!document.body.classList.contains("is-expanded") && !activeFullscreen()) return;
        setExpanded(false);
    });

    ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach(function (name) {
        document.addEventListener(name, syncExpanded);
    });
    ["fullscreenerror", "webkitfullscreenerror", "mozfullscreenerror", "MSFullscreenError"].forEach(function (name) {
        document.addEventListener(name, function () {
            applyExpanded(!!activeFullscreen());
        });
    });

    function inTracksSurface(node) {
        if (!node) return false;
        if (rail && rail.contains(node)) return true;
        var map = document.getElementById("viz-overview");
        return !!(map && map.contains(node));
    }

    window.addEventListener("popstate", syncFromLocation);
    document.addEventListener("projectviz:catalog", onCatalogReady);
    document.addEventListener("projectviz:tracks", onTracksReady);
    document.addEventListener("projectviz:tracks-view", function () {
        if (page !== "tracks") return;
        if (currentHref) highlight(currentHref);
        syncTracksChrome();
        refreshStepNav();
    });

    var initial = readDemo();
    if (initial) openDemo(initial, { mode: "none", focus: isPhone() });
    else if (page === "tracks") {
        var openingTrack = trackFromLocation();
        var openingTopic = topicFromLocation();
        var openingState = openingTrack
            ? trackState(openingTrack, false)
            : openingTopic
                ? topicState(openingTopic, false)
                : tracksState();
        history.replaceState(openingState, "", window.location.href);
    } else history.replaceState({ vizShell: page === "catalog" ? "categories" : "list", category: "", demo: "", pushed: false }, "", window.location.href);
    document.body.classList.add("viz-shell-ready");
    if (page === "catalog") {
        window.ProjectVizShell = {
            openCategory: openCategory,
            syncCatalog: syncCatalogView
        };
    }

    if (hidesFullscreenQuery.addEventListener) {
        hidesFullscreenQuery.addEventListener("change", function () {
            if (hidesFullscreen()) setExpanded(false);
        });
    }
})();
