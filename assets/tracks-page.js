/*
 * Guided Tracks page.
 * Topics come from tracks.json. The desktop rail lists All topics and
 * each topic. The right pane draws one tree. All topics shows Guided
 * Tracks and the topics only: no track children on that overview.
 * Choosing a topic zooms that subtree, and the tracks appear there.
 * Each topic has a small animated plate on that overview, and again
 * above its own tree.
 * Choosing a track replaces the rail with the playlist: when a step has
 * a note, formulae, or figure, its connectionTitle is a link immediately
 * before that demonstration. The link opens tracks/connection.html, which
 * reads the same step from tracks.json. step= is that step's index.
 * Back returns to the focused topic, or to the full overview.
 * A phone shows the tree in the rail first, then the playlist, then the
 * demonstration. Family concept maps stay in families.json and are not
 * mounted here.
 */
(function () {
    var root = document.getElementById("tracks-root");
    var missing = document.getElementById("tracks-missing");
    var rail = document.getElementById("viz-rail");
    var overview = document.getElementById("viz-overview");
    var phoneQuery = window.matchMedia("(max-width: 736px)");
    var tracks = [];
    var topics = [];
    var ready = false;
    var failed = false;
    var currentId = "";
    var currentTopicId = "";
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

    function isPhone() {
        return phoneQuery.matches;
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

    function countLabel(count, singular, plural) {
        return count === 1 ? "1 " + singular : count + " " + plural;
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

    function normalizeTopics(data, trackList) {
        var raw = data && !Array.isArray(data) && Array.isArray(data.topics) ? data.topics : [];
        var byId = {};
        var i;
        for (i = 0; i < trackList.length; i++) {
            if (trackList[i].steps.length && safeSlug(trackList[i].id)) byId[trackList[i].id] = trackList[i];
        }
        var grouped = [];
        var seenTopic = {};
        var seenTrack = {};
        raw.forEach(function (item) {
            if (!item || typeof item !== "object") return;
            var id = safeSlug(item.id);
            var title = typeof item.title === "string" ? item.title.trim() : "";
            if (!id || !title || title.length > 80 || seenTopic[id]) return;
            var ids = Array.isArray(item.tracks) ? item.tracks : [];
            var children = [];
            ids.forEach(function (trackId) {
                var slug = safeSlug(typeof trackId === "string" ? trackId : "");
                if (!slug || seenTrack[slug] || !byId[slug]) return;
                seenTrack[slug] = true;
                children.push(byId[slug]);
            });
            if (!children.length) return;
            seenTopic[id] = true;
            grouped.push({ id: id, title: title, tracks: children });
        });
        return grouped;
    }

    function requestedParam(name) {
        var params;
        try {
            params = new URLSearchParams(window.location.search);
        } catch (err) {
            return "";
        }
        return (params.get(name) || "").trim();
    }

    function requestedRaw() {
        if (requestedParam("track")) return requestedParam("track");
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

    function findTopic(id) {
        var i;
        for (i = 0; i < topics.length; i++) {
            if (topics[i].id === id) return topics[i];
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

    function setLeadVisible(show) {
        var lead = rail ? rail.querySelector(".page-lead") : null;
        if (lead) lead.hidden = !show;
    }

    function placeBack(show, label) {
        var button = document.getElementById("tracks-back");
        if (!show) {
            if (button) button.hidden = true;
            return;
        }
        if (!button) {
            button = el("button", "track-rail-back", "Back");
            button.id = "tracks-back";
            button.type = "button";
            if (rail) rail.insertBefore(button, rail.firstChild);
        }
        button.hidden = false;
        button.setAttribute("aria-label", label || "Back to all topics");
    }

    function topicChoice(id, title, count, current) {
        var item = el("li");
        var link = el("a", "topic-choice");
        link.href = id ? "tracks.html?topic=" + id : "tracks.html";
        link.setAttribute("data-topic", id);
        if (current) {
            link.classList.add("is-current");
            link.setAttribute("aria-current", "true");
        }
        link.appendChild(el("span", "track-choice-title", title));
        link.appendChild(el("span", "track-choice-count", count));
        item.appendChild(link);
        return item;
    }

    function trackHref(track) {
        var id = safeSlug(track.id);
        if (!id) return "tracks.html";
        if (currentTopicId) return "tracks.html?topic=" + currentTopicId + "&track=" + id;
        return "tracks.html?track=" + id;
    }

    function overviewNode(className, href, title, count) {
        var link = el("a", "overview-node " + className);
        link.href = href;
        link.appendChild(el("span", "overview-title", title));
        if (count) link.appendChild(el("span", "overview-count", count));
        return link;
    }

    function trackBranch(list) {
        var branch = el("ul", "overview-branch");
        list.forEach(function (track) {
            var id = safeSlug(track.id);
            if (!id) return;
            var item = el("li");
            var link = overviewNode("is-track", trackHref(track), track.title, stepCountLabel(track.steps.length));
            link.setAttribute("data-track", id);
            item.appendChild(link);
            branch.appendChild(item);
        });
        return branch;
    }

    /* Static plates. One drawing per topic id. Not catalog data. */
    var PLATES = {
        "describing-data": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><line x1="18" y1="100" x2="302" y2="100" stroke="#111111" stroke-width="1.4"/><g fill="#111111"><circle cx="42" cy="90" r="3.15"/><circle cx="58" cy="86" r="3.15"/><circle cx="72" cy="82" r="3.15"/><circle cx="86" cy="76" r="3.15"/><circle cx="98" cy="80" r="3.15"/><circle cx="108" cy="72" r="3.15"/><circle cx="118" cy="78" r="3.15"/><circle cx="130" cy="74" r="3.15"/><circle cx="142" cy="70" r="3.15"/><circle cx="156" cy="76" r="3.15"/><circle cx="170" cy="68" r="3.15"/><circle cx="186" cy="72" r="3.15"/><circle cx="204" cy="64" r="3.15"/><circle cx="224" cy="70" r="3.15"/><circle cx="246" cy="58" r="3.15"/><circle cx="268" cy="66" r="3.15"/><circle cx="286" cy="54" r="3.15"/></g><line class="tp-dd-mode" x1="108" y1="100" x2="108" y2="34" stroke="#111111" stroke-width="1.5" stroke-dasharray="2 3"/><line class="tp-dd-median" x1="156" y1="100" x2="156" y2="34" stroke="#111111" stroke-width="1.6" stroke-dasharray="6 3.5"/><line class="tp-dd-mean" x1="196" y1="100" x2="196" y2="34" stroke="#111111" stroke-width="2.2"/></svg>',
        "probability-and-sampling": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><line x1="24" y1="104" x2="296" y2="104" stroke="#111111" stroke-width="1.4"/><path class="tp-ps-curve" pathLength="100" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" d="M24 104 C60 104 82 98 110 74 C132 54 150 36 168 36 C186 36 204 54 226 76 C252 100 272 104 296 104"/><g class="tp-ps-bars" fill="#111111"><rect x="78" y="90" width="16" height="14"/><rect x="112" y="68" width="16" height="36"/><rect x="146" y="46" width="16" height="58"/><rect x="180" y="58" width="16" height="46"/><rect x="214" y="78" width="16" height="26"/></g></svg>',
        "comparing-means": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><line x1="20" y1="104" x2="300" y2="104" stroke="#111111" stroke-width="1.4"/><g class="tp-cm-a" fill="#111111"><circle cx="62" cy="78" r="3.3"/><circle cx="78" cy="70" r="3.3"/><circle cx="92" cy="84" r="3.3"/><circle cx="104" cy="66" r="3.3"/><circle cx="118" cy="76" r="3.3"/><circle cx="132" cy="72" r="3.3"/></g><line class="tp-cm-ma" x1="96" y1="104" x2="96" y2="42" stroke="#111111" stroke-width="1.8"/><g class="tp-cm-near" fill="none" stroke="#111111" stroke-width="1.6"><circle cx="70" cy="86" r="3.3"/><circle cx="86" cy="74" r="3.3"/><circle cx="100" cy="90" r="3.3"/><circle cx="114" cy="68" r="3.3"/><circle cx="128" cy="82" r="3.3"/><line x1="108" y1="104" x2="108" y2="42" stroke="#111111" stroke-width="1.8"/></g><g class="tp-cm-far" fill="none" stroke="#111111" stroke-width="1.6"><circle cx="176" cy="86" r="3.3"/><circle cx="192" cy="74" r="3.3"/><circle cx="206" cy="90" r="3.3"/><circle cx="220" cy="68" r="3.3"/><circle cx="234" cy="82" r="3.3"/><line x1="214" y1="104" x2="214" y2="42" stroke="#111111" stroke-width="1.8"/></g></svg>',
        "association": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><line x1="28" y1="16" x2="28" y2="108" stroke="#111111" stroke-width="1.4"/><line x1="28" y1="108" x2="292" y2="108" stroke="#111111" stroke-width="1.4"/><g class="tp-as-loose" fill="#111111"><circle cx="70" cy="40" r="3.15"/><circle cx="98" cy="96" r="3.15"/><circle cx="124" cy="36" r="3.15"/><circle cx="150" cy="88" r="3.15"/><circle cx="178" cy="44" r="3.15"/><circle cx="206" cy="90" r="3.15"/><circle cx="232" cy="48" r="3.15"/><circle cx="112" cy="60" r="3.15"/><circle cx="190" cy="70" r="3.15"/></g><g class="tp-as-tight" fill="#111111"><circle cx="72" cy="92" r="3.15"/><circle cx="104" cy="74" r="3.15"/><circle cx="136" cy="72" r="3.15"/><circle cx="168" cy="54" r="3.15"/><circle cx="204" cy="52" r="3.15"/><circle cx="236" cy="34" r="3.15"/><circle cx="252" cy="42" r="3.15"/></g><line class="tp-as-fit" pathLength="100" x1="48" y1="96" x2="268" y2="28" stroke="#111111" stroke-width="2"/></svg>'
    };

    function topicPlate(id) {
        var markup = PLATES[id];
        if (!markup) return null;
        var plate = el("figure", "topic-plate");
        plate.setAttribute("data-topic-plate", id);
        plate.setAttribute("aria-hidden", "true");
        /* Static markup, parsed as HTML so the svg stays in the SVG namespace. */
        plate.innerHTML = markup;
        var svg = plate.querySelector("svg");
        if (!svg || svg.namespaceURI !== "http://www.w3.org/2000/svg") return null;
        return plate;
    }

    function buildTree(topic) {
        var nav = el("nav", "overview-tree");
        nav.setAttribute("aria-label", topic ? topic.title : "All topics");
        if (topic) {
            var focused = topicPlate(topic.id);
            if (focused) nav.appendChild(focused);
            nav.appendChild(el("p", "overview-root is-current", topic.title));
            nav.appendChild(trackBranch(topic.tracks));
            return nav;
        }
        nav.appendChild(el("p", "overview-root", "Guided Tracks"));
        var branch = el("ul", "overview-branch");
        topics.forEach(function (item) {
            var li = el("li");
            var link = overviewNode(
                "is-topic",
                "tracks.html?topic=" + item.id,
                item.title,
                countLabel(item.tracks.length, "track", "tracks")
            );
            link.setAttribute("data-topic", item.id);
            li.appendChild(link);
            var plate = topicPlate(item.id);
            if (plate) {
                li.className = "has-plate";
                li.appendChild(plate);
            }
            branch.appendChild(li);
        });
        nav.appendChild(branch);
        return nav;
    }

    function hideOverview() {
        if (!overview) return;
        overview.hidden = true;
        clear(overview);
    }

    function showOverview(topic) {
        if (!overview) return;
        clear(overview);
        overview.hidden = document.body.classList.contains("is-demo-open");
        overview.appendChild(buildTree(topic));
    }

    function renderBrowse(missingTrack, missingTopic, topic) {
        clear(root);
        var phone = isPhone();
        placeBack(phone && !!topic, "Back to all topics");
        setLeadVisible(true);
        if (missing) {
            missing.hidden = !missingTrack && !missingTopic;
            if (missingTrack) missing.textContent = "That track was not found.";
            else if (missingTopic) missing.textContent = "That topic was not found.";
        }
        currentId = "";
        currentTopicId = topic ? topic.id : "";
        document.title = topic ? topic.title + " - Guided Tracks" : "Guided Tracks - Project Viz";
        if (!topics.length) {
            root.appendChild(el("p", "hub-quiet", "No topics yet."));
            hideOverview();
            return;
        }
        if (phone) {
            root.appendChild(buildTree(topic));
            hideOverview();
            return;
        }
        var list = el("ul", "track-chooser");
        list.setAttribute("aria-label", "Topics");
        list.appendChild(topicChoice(
            "",
            "All topics",
            countLabel(topics.length, "topic", "topics"),
            !topic
        ));
        topics.forEach(function (item) {
            list.appendChild(topicChoice(
                item.id,
                item.title,
                countLabel(item.tracks.length, "track", "tracks"),
                topic && topic.id === item.id
            ));
        });
        root.appendChild(list);
        showOverview(topic);
    }

    function renderTrack(track, topic) {
        clear(root);
        currentId = safeSlug(track.id);
        currentTopicId = topic ? topic.id : "";
        placeBack(true, topic ? "Back to " + topic.title : "Back to all topics");
        setLeadVisible(false);
        if (missing) missing.hidden = true;
        document.title = track.title + " - Guided Tracks";
        hideOverview();
        var block = el("div", "track-block");
        block.appendChild(trackPlaylist(track));
        root.appendChild(block);
    }

    function focusChoice(id) {
        id = safeSlug(id);
        if (!id) return;
        var links = document.querySelectorAll("a.overview-node.is-track");
        var i;
        for (i = 0; i < links.length; i++) {
            if (links[i].getAttribute("data-track") === id) {
                links[i].focus();
                return;
            }
        }
    }

    function focusTopic(id) {
        id = id ? safeSlug(id) : "";
        if (!root) return;
        var links = root.querySelectorAll("a.topic-choice, a.overview-node.is-topic");
        var i;
        for (i = 0; i < links.length; i++) {
            if ((links[i].getAttribute("data-topic") || "") === id) {
                links[i].focus();
                return;
            }
        }
    }

    function stageTitle() {
        if (currentId) return "Select a demonstration";
        if (currentTopicId) {
            var topic = findTopic(currentTopicId);
            if (topic) return topic.title;
        }
        return "All topics";
    }

    function sync(options) {
        options = options || {};
        if (!ready || failed) return currentId;
        var raw = requestedRaw();
        var id = safeSlug(raw);
        var found = id ? findTrack(id) : null;
        var topicRaw = requestedParam("topic");
        var topicId = safeSlug(topicRaw);
        var topic = topicId ? findTopic(topicId) : null;
        var missingTrack = !!raw && !found;
        var missingTopic = !found && !!topicRaw && !topic;
        var key = [
            missingTrack ? "missing-track" : missingTopic ? "missing-topic" : "ok",
            found ? id : "",
            found ? (topic ? topic.id : "") : (topic ? topic.id : ""),
            isPhone() ? "phone" : "desk"
        ].join(":");
        if (key !== renderedKey) {
            renderedKey = key;
            if (found) renderTrack(found, topic);
            else renderBrowse(missingTrack, missingTopic, topic);
        }
        if (options.focus === "back") {
            var back = document.getElementById("tracks-back");
            if (back && !back.hidden) back.focus();
        } else if (options.focusTopic != null) {
            focusTopic(options.focusTopic);
        } else if (options.focusChoice) {
            focusChoice(options.focusChoice);
        }
        document.dispatchEvent(new CustomEvent("projectviz:tracks-view"));
        return currentId;
    }

    function showError() {
        clear(root);
        hideOverview();
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
            topics = normalizeTopics(data, tracks);
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
        currentId: function () { return currentId; },
        currentTopic: function () { return currentTopicId; },
        hasTopic: function (id) { return !!findTopic(safeSlug(id)); },
        browsing: function () { return ready && !failed && !currentId; },
        stageTitle: stageTitle
    };

    window.addEventListener("hashchange", function () {
        sync();
    });

    if (phoneQuery.addEventListener) {
        phoneQuery.addEventListener("change", function () {
            renderedKey = "";
            sync();
        });
    }

    load();
})();
