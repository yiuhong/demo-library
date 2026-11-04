/*
 * Catalog and Guided Tracks shell.
 * The demo pane loads the selected file in place. A Guided Tracks
 * connection uses the same path: tracks/connection.html?track=&step=
 * in the iframe, and tracks.html?demo=tracks/connection.html&step=
 * in the address bar. step= is still that step's index. The rail lists
 * the connection before the demonstration. Fullscreen only hides the rail; this file does
 * not call the browser Fullscreen API. Phone shows the rail, then the
 * page. On Guided Tracks the rail is the track list until a track is
 * open; Back from a demonstration returns to that track, and Back in
 * the rail returns to the track list. Catalog Back returns to the same list.
 */
(function () {
    var page = document.body.getAttribute("data-viz-page");
    if (page !== "catalog" && page !== "tracks") return;

    var phoneQuery = window.matchMedia("(max-width: 736px)");
    var frame = document.getElementById("viz-frame");
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
    var seeded = false;
    var railScroll = 0;
    var scoped = false;
    var pendingTrackFocus = "";
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
        if (titleNode && open) titleNode.textContent = title || "Demonstration";
        if (!open && page === "tracks") refreshTracksIdle();
        else if (titleNode && !open) titleNode.textContent = "Select a demonstration";
        if (empty) empty.hidden = !!open;
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
            var category = activeCategory();
            if (category && category !== "all") url.searchParams.set("category", category);
            else url.searchParams.delete("category");
        }
        return url;
    }

    function landingUrl() {
        var url = new URL(window.location.href);
        url.searchParams.delete("track");
        url.searchParams.delete("demo");
        url.searchParams.delete("step");
        url.hash = "";
        return url;
    }

    function trackUrl(id) {
        var url = new URL(window.location.href);
        url.searchParams.delete("demo");
        url.searchParams.delete("step");
        url.searchParams.set("track", id);
        url.hash = "";
        return url;
    }

    function trackState(id, pushed) {
        return { vizShell: "track", track: id, demo: "", pushed: !!pushed };
    }

    function tracksState() {
        return { vizShell: "tracks", demo: "", track: "" };
    }

    function demoState(href) {
        var prior = history.state || {};
        var trackPushed = prior.vizShell === "track" && !!prior.pushed;
        if (prior.vizShell === "demo" && prior.trackPushed) trackPushed = true;
        return {
            vizShell: "demo",
            demo: href,
            track: trackFromLocation(),
            trackPushed: trackPushed
        };
    }

    function refreshTracksIdle() {
        if (page !== "tracks" || currentHref) return;
        var inTrack = window.ProjectVizTracks && window.ProjectVizTracks.currentId
            ? window.ProjectVizTracks.currentId()
            : "";
        if (titleNode) titleNode.textContent = inTrack ? "Select a demonstration" : "Select a track";
        if (empty) empty.textContent = inTrack ? "Select a step." : "Select a track.";
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
        var previousLink = currentLink;
        currentHref = "";
        showDemoChrome(false);
        highlight("");
        if (mode === "push") {
            var next = buildUrl("");
            if (window.location.href !== next.href) {
                var track = page === "tracks" ? trackFromLocation() : "";
                history.pushState(track ? trackState(track, false) : { vizShell: "list", demo: "" }, "", next);
            }
        }
        if (isPhone() && previous) {
            var link = previousLink
                && previousLink.isConnected
                && previousLink.getAttribute("href") === previous
                ? previousLink
                : preferredLink(previous, null);
            if (link) link.focus();
        }
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
        pendingTrackFocus = state.track || trackFromLocation() || "";
        if (currentHref) {
            currentHref = "";
            showDemoChrome(false);
            highlight("");
        }
        var next = landingUrl();
        // A second history.back() is dropped when it follows the demo Back.
        // Write the track list directly. Replacing a demo entry keeps Back
        // from reopening that demonstration.
        if (state.vizShell === "demo" || window.location.href === next.href) {
            history.replaceState(tracksState(), "", next);
        } else if (window.location.href !== next.href) {
            history.pushState(tracksState(), "", next);
        }
        syncTracks({ focusChoice: pendingTrackFocus });
        pendingTrackFocus = "";
        refreshTracksIdle();
    }

    function syncFromLocation() {
        var params = new URLSearchParams(window.location.search);
        var demo = readDemo();
        if (page === "catalog") applyCategory(params.get("category") || "all");
        var focusChoice = "";
        if (page === "tracks" && !trackFromLocation()) focusChoice = pendingTrackFocus;
        pendingTrackFocus = "";
        if (page === "tracks") syncTracks(focusChoice ? { focusChoice: focusChoice } : {});
        if (demo) openDemo(demo, { mode: "none" });
        else closeDemo("none");
        refreshTracksIdle();
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
            prep.hash = "";
            var prior = history.state || {};
            history.replaceState({
                vizShell: demo ? "demo" : "track",
                demo: demo || "",
                track: track,
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
        var choice = event.target.closest ? event.target.closest("a.track-choice") : null;
        if (!choice || (rail && !rail.contains(choice))) return;
        var chosen = safeTrackId(choice.getAttribute("data-track") || "");
        if (!chosen) return;
        event.preventDefault();
        openTrack(chosen);
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
            if (history.state && history.state.vizShell === "demo") {
                traverseHistory(-1);
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
    else if (page === "tracks") {
        var openingTrack = trackFromLocation();
        history.replaceState(openingTrack ? trackState(openingTrack, false) : tracksState(), "", window.location.href);
    } else history.replaceState({ vizShell: "list", demo: "" }, "", window.location.href);
    document.body.classList.add("viz-shell-ready");

    if (phoneQuery.addEventListener) {
        phoneQuery.addEventListener("change", function () {
            if (isPhone()) setExpanded(false);
        });
    }
})();
