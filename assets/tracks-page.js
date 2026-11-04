/*
 * Guided Tracks page. The rail starts as the list of tracks.
 * Choosing one replaces that list with the playlist: when a step has
 * a note, formulae, or figure, its connectionTitle is a link
 * immediately before that demonstration. The link opens
 * tracks/connection.html, which reads the same step from tracks.json.
 * step= is that step's index. Back returns to the track list.
 * Family concept maps stay in families.json and are not mounted here.
 */
(function () {
    var root = document.getElementById("tracks-root");
    var missing = document.getElementById("tracks-missing");
    var rail = document.getElementById("viz-rail");
    var tracks = [];
    var ready = false;
    var failed = false;
    var currentId = "";
    var renderedKey = "";

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function clear(node) {
        if (!node) return;
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    function safeSlug(value) {
        if (typeof value !== "string") return "";
        var id = value.trim();
        if (!/^[a-z][a-z0-9-]*$/.test(id)) return "";
        return id;
    }

    function stepCountLabel(count) {
        return count === 1 ? "1 step" : count + " steps";
    }

    function safeImagePath(href) {
        if (!window.ProjectVizMaps) return "";
        var value = window.ProjectVizMaps.safeHref(href);
        if (!value || value.charAt(0) === "/") return "";
        if (!/^[A-Za-z0-9._/-]+$/.test(value)) return "";
        if (!/\.(png|svg|jpe?g|gif|webp)$/i.test(value)) return "";
        return value;
    }

    function normalizeFormulae(raw) {
        if (!Array.isArray(raw)) return [];
        var formulae = [];
        var i;
        for (i = 0; i < raw.length; i++) {
            if (typeof raw[i] !== "string") continue;
            var text = raw[i].trim();
            if (!text || text.length > 400) continue;
            formulae.push(text);
        }
        return formulae;
    }

    function normalizeStep(raw) {
        if (!raw || typeof raw !== "object" || !window.ProjectVizMaps) return null;
        var title = typeof raw.title === "string" ? raw.title.trim() : "";
        var href = window.ProjectVizMaps.safeHref(raw.href);
        if (!title || !href) return null;
        var note = typeof raw.note === "string" ? raw.note.trim() : "";
        var connectionTitle = connectionTitleOf(raw.connectionTitle);
        var image = safeImagePath(raw.image);
        var imageAlt = typeof raw.imageAlt === "string" ? raw.imageAlt.trim() : "";
        if (!image || !imageAlt) {
            image = "";
            imageAlt = "";
        }
        return {
            title: title,
            href: href,
            connectionTitle: connectionTitle,
            note: note,
            image: image,
            imageAlt: imageAlt,
            formulae: normalizeFormulae(raw.formulae)
        };
    }

    function connectionTitleOf(raw) {
        if (typeof raw !== "string") return "";
        var title = raw.trim().replace(/\s+/g, " ");
        if (!title || title.length > 80) return "";
        if (/^[\s\-—–·.:]*connection[\s\-—–·.]*$/i.test(title)) return "";
        return title;
    }

    function normalizeTrack(raw) {
        if (!raw || typeof raw !== "object") return null;
        var id = typeof raw.id === "string" ? raw.id.trim() : "";
        var title = typeof raw.title === "string" ? raw.title.trim() : "";
        if (!id || !title) return null;
        var summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
        var steps = Array.isArray(raw.steps) ? raw.steps.map(normalizeStep).filter(Boolean) : [];
        return { id: id, title: title, summary: summary, steps: steps };
    }

    function normalizeTracks(data) {
        var list = Array.isArray(data) ? data : (data && Array.isArray(data.tracks) ? data.tracks : null);
        if (!list) throw new Error("Tracks could not be loaded.");
        return list.map(normalizeTrack).filter(Boolean);
    }

    function requestedRaw() {
        var params;
        try {
            params = new URLSearchParams(window.location.search);
        } catch (err) {
            return "";
        }
        if (params.has("track")) return (params.get("track") || "").trim();
        var hash = window.location.hash.replace(/^#/, "");
        if (!hash) return "";
        try {
            hash = decodeURIComponent(hash);
        } catch (err2) {}
        if (hash.indexOf("track-") === 0) return hash.slice("track-".length).trim();
        return "";
    }

    function findTrack(id) {
        var i;
        for (i = 0; i < tracks.length; i++) {
            if (tracks[i].id === id) return tracks[i];
        }
        return null;
    }

    function trackForHref(href) {
        if (typeof href !== "string" || !href) return "";
        var parts = /^tracks\/connection\.html\?track=([a-z][a-z0-9-]*)&step=([0-9]{1,3})$/.exec(href);
        if (parts) return parts[1];
        var i;
        var j;
        for (i = 0; i < tracks.length; i++) {
            var steps = tracks[i].steps;
            for (j = 0; j < steps.length; j++) {
                if (steps[j].href === href) return safeSlug(tracks[i].id);
            }
        }
        return "";
    }

    function stepNumber(index) {
        var n = String(index + 1);
        if (n.length < 2) n = "0" + n;
        return n;
    }

    function demoItem(step, index) {
        var item = el("li", "playlist-demo");
        var link = el("a", "concept-node");
        link.href = step.href;
        var kicker = el("span", "concept-kicker");
        kicker.appendChild(el("span", "concept-relation", stepNumber(index)));
        link.appendChild(kicker);
        link.appendChild(el("span", "concept-title", step.title));
        item.appendChild(link);
        return item;
    }

    function connectionHref(track, index) {
        var id = safeSlug(track.id);
        if (!id) return "";
        return "tracks/connection.html?track=" + id + "&step=" + index;
    }

    function connectionItem(track, step, index) {
        if (!step.connectionTitle) return null;
        if (!step.note && !step.image && !step.formulae.length) return null;
        var href = connectionHref(track, index);
        if (!href) return null;
        var item = el("li", "playlist-join");
        var link = el("a", "playlist-connection-link");
        link.href = href;
        link.setAttribute("data-pane-title", step.connectionTitle);
        link.appendChild(el("span", "playlist-connection-label", step.connectionTitle));
        item.appendChild(link);
        return item;
    }

    function trackPlaylist(track) {
        var map = el("div", "concept-map is-track");
        var headingId = safeSlug(track.id) ? "track-" + track.id : "";
        if (headingId) {
            map.setAttribute("role", "group");
            map.setAttribute("aria-labelledby", headingId);
        }
        var head = el("div", "concept-map-head");
        head.appendChild(el("p", "concept-map-kicker", stepCountLabel(track.steps.length)));
        var title = el("h2", "concept-map-title", track.title);
        if (headingId) {
            title.id = headingId;
            title.tabIndex = -1;
        }
        head.appendChild(title);
        map.appendChild(head);
        var list = el("ol", "playlist");
        track.steps.forEach(function (step, index) {
            var connection = connectionItem(track, step, index);
            if (connection) list.appendChild(connection);
            list.appendChild(demoItem(step, index));
        });
        map.appendChild(list);
        return map;
    }

    function refreshOpened() {
        if (!window.ProjectVizOpened) return;
        window.ProjectVizOpened.mark("a.concept-node");
    }

    function setLeadVisible(show) {
        var lead = rail ? rail.querySelector(".page-lead") : null;
        if (lead) lead.hidden = !show;
    }

    function placeBack(show) {
        var button = document.getElementById("tracks-back");
        if (!show) {
            if (button) button.hidden = true;
            return;
        }
        if (!button) {
            button = el("button", "track-rail-back", "Back");
            button.id = "tracks-back";
            button.type = "button";
            button.setAttribute("aria-label", "Back to all tracks");
            if (rail) rail.insertBefore(button, rail.firstChild);
        }
        button.hidden = false;
    }

    function renderLanding(missingOn) {
        clear(root);
        placeBack(false);
        setLeadVisible(true);
        if (missing) missing.hidden = !missingOn;
        document.title = "Guided Tracks - Project Viz";
        currentId = "";
        var visible = [];
        tracks.forEach(function (track) {
            if (track.steps.length && safeSlug(track.id)) visible.push(track);
        });
        if (!visible.length) {
            root.appendChild(el("p", "hub-quiet", "No tracks yet."));
            return;
        }
        var list = el("ul", "track-chooser");
        list.setAttribute("aria-label", "Tracks");
        visible.forEach(function (track) {
            var id = safeSlug(track.id);
            var item = el("li");
            var link = el("a", "track-choice");
            link.href = "tracks.html?track=" + id;
            link.setAttribute("data-track", id);
            link.appendChild(el("span", "track-choice-title", track.title));
            link.appendChild(el("span", "track-choice-count", stepCountLabel(track.steps.length)));
            item.appendChild(link);
            list.appendChild(item);
        });
        root.appendChild(list);
    }

    function renderTrack(track) {
        clear(root);
        placeBack(true);
        setLeadVisible(false);
        if (missing) missing.hidden = true;
        currentId = safeSlug(track.id);
        document.title = track.title + " - Guided Tracks";
        var block = el("div", "track-block");
        block.appendChild(trackPlaylist(track));
        root.appendChild(block);
    }

    function focusChoice(id) {
        id = safeSlug(id);
        if (!id || !root) return;
        var links = root.querySelectorAll("a.track-choice");
        var i;
        for (i = 0; i < links.length; i++) {
            if (links[i].getAttribute("data-track") === id) {
                links[i].focus();
                return;
            }
        }
    }

    function sync(options) {
        options = options || {};
        if (!ready || failed) return currentId;
        var raw = requestedRaw();
        var id = safeSlug(raw);
        var found = id ? findTrack(id) : null;
        var missingOn = !!raw && !found;
        var key = (missingOn ? "missing:" : "ok:") + (found ? id : "");
        if (key !== renderedKey) {
            renderedKey = key;
            if (found) renderTrack(found);
            else renderLanding(missingOn);
            refreshOpened();
        }
        if (options.focus === "back") {
            var back = document.getElementById("tracks-back");
            if (back && !back.hidden) back.focus();
        } else if (options.focusChoice) {
            focusChoice(options.focusChoice);
        }
        return currentId;
    }

    function showError() {
        clear(root);
        if (root) root.appendChild(el("p", "hub-quiet", "Guided tracks could not be loaded."));
    }

    function jsonUrl(file) {
        var url = new URL(file, window.location.href);
        url.search = "";
        url.hash = "";
        return url.toString();
    }

    function load() {
        fetch(jsonUrl("tracks.json")).then(function (response) {
            if (!response.ok) throw new Error("tracks");
            return response.json();
        }).then(function (data) {
            tracks = normalizeTracks(data);
            ready = true;
            failed = false;
            sync();
            document.dispatchEvent(new CustomEvent("projectviz:tracks"));
        }).catch(function () {
            failed = true;
            ready = false;
            showError();
            document.dispatchEvent(new CustomEvent("projectviz:tracks"));
        });
    }

    window.ProjectVizTracks = {
        sync: sync,
        trackForHref: trackForHref,
        currentId: function () { return currentId; }
    };

    window.addEventListener("pageshow", refreshOpened);
    window.addEventListener("storage", function (event) {
        if (event.key === "project-viz-opened") refreshOpened();
    });
    window.addEventListener("hashchange", function () {
        sync();
    });

    load();
})();
