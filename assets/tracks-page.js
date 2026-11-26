/*
 * Guided Tracks page.
 * Topics come from tracks.json. The desktop rail lists All topics and
 * each topic. The right pane draws one tree. All topics shows Guided
 * Tracks and the topics only: no track children on that overview.
 * Choosing a topic zooms that subtree, and the tracks appear there.
 * Each topic has a small animated plate on that overview, and again
 * above its own tree. Each track on that tree has its own plate,
 * in the same frame. The topic drawings are not reused as track drawings.
 * Choosing a track replaces the rail with the playlist: when a step has
 * a note, formulae, a demo description, or a figure, its connectionTitle
 * is a link immediately before that demonstration. The link opens
 * tracks/connection.html, which reads the same step from tracks.json.
 * step= is that step's index.
 * Back returns to the focused topic, or to the full overview.
 * A phone shows the tree in the rail first, then the playlist, then the
 * demonstration. Family concept maps stay in families.json and are not
 * mounted here.
 * The tree paints when tracks.json arrives, even if the shell is late.
 * A hung or failed fetch shows an error and Retry. The shell still
 * attaches navigation when it loads.
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
    var loadToken = 0;
    var loadTimer = null;
    var loadAbort = null;
    var LOAD_LIMIT_MS = 12000;

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
        var demoDescription = typeof raw.demoDescription === "string" ? raw.demoDescription.trim() : "";
        if (demoDescription.length > 500) demoDescription = demoDescription.slice(0, 500);
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
            demoDescription: demoDescription,
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
        if (!step.note && !step.demoDescription && !step.image && !step.formulae.length) return null;
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
            var plate = trackPlate(id);
            if (plate) {
                item.className = "has-plate";
                item.appendChild(plate);
            }
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

    /* One drawing per track id. Same frame as the topic plates. */
    var TRACK_PLATES = {
        "center-and-spread": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><line x1="24" y1="104" x2="296" y2="104" stroke="#111111" stroke-width="1.4"/><g fill="#111111"><circle cx="72" cy="88" r="3.15"/><circle cx="96" cy="88" r="3.15"/><circle cx="114" cy="88" r="3.15"/><circle cx="128" cy="88" r="3.15"/><circle cx="140" cy="88" r="3.15"/><circle cx="152" cy="88" r="3.15"/><circle cx="160" cy="88" r="3.15"/><circle cx="168" cy="88" r="3.15"/><circle cx="180" cy="88" r="3.15"/><circle cx="192" cy="88" r="3.15"/><circle cx="206" cy="88" r="3.15"/><circle cx="224" cy="88" r="3.15"/><circle cx="248" cy="88" r="3.15"/></g><line class="tk-cs-mean" x1="160" y1="104" x2="160" y2="34" stroke="#111111" stroke-width="2.2"/><g class="tk-cs-spread" fill="none" stroke="#111111" stroke-width="1.5" stroke-dasharray="5 3.5"><line x1="96" y1="104" x2="96" y2="34"/><line x1="224" y1="104" x2="224" y2="34"/></g></svg>',
        "shape-and-pictures": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><line x1="28" y1="108" x2="300" y2="108" stroke="#111111" stroke-width="1.4"/><g class="tk-sp-box" fill="none" stroke="#111111" stroke-width="1.5"><line x1="46" y1="64" x2="98" y2="64"/><line x1="198" y1="64" x2="246" y2="64"/><line x1="46" y1="54" x2="46" y2="74"/><line x1="246" y1="54" x2="246" y2="74"/><rect x="98" y="44" width="100" height="40" fill="#ffffff" stroke="#111111" stroke-width="1.6"/><line x1="156" y1="44" x2="156" y2="84" stroke="#111111" stroke-width="2"/></g><g class="tk-sp-out" fill="none" stroke="#111111" stroke-width="1.4"><line x1="268" y1="40" x2="268" y2="88" stroke-dasharray="3 3"/><circle cx="292" cy="64" r="3.4" fill="#111111" stroke="none"/></g></svg>',
        "same-summaries-different-graphs": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><line x1="36" y1="16" x2="36" y2="112" stroke="#111111" stroke-width="1.4"/><line x1="36" y1="112" x2="292" y2="112" stroke="#111111" stroke-width="1.4"/><g class="tk-sg-line" fill="#111111"><circle cx="70" cy="96" r="3.15"/><circle cx="106" cy="84" r="3.15"/><circle cx="142" cy="72" r="3.15"/><circle cx="178" cy="60" r="3.15"/><circle cx="214" cy="48" r="3.15"/><circle cx="250" cy="36" r="3.15"/></g><g class="tk-sg-curve" fill="#111111"><circle cx="70" cy="100" r="3.15"/><circle cx="106" cy="52" r="3.15"/><circle cx="142" cy="40" r="3.15"/><circle cx="178" cy="46" r="3.15"/><circle cx="214" cy="78" r="3.15"/><circle cx="250" cy="100" r="3.15"/></g><line class="tk-sg-fit" pathLength="100" x1="58" y1="100" x2="262" y2="32" stroke="#111111" stroke-width="2"/></svg>',
        "from-process-to-distribution": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><line x1="24" y1="104" x2="296" y2="104" stroke="#111111" stroke-width="1.4"/><path class="tk-pd-curve" pathLength="100" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" d="M28 104 C72 104 96 96 118 68 C134 46 148 30 160 30 C172 30 186 46 202 68 C224 96 248 104 292 104"/><g class="tk-pd-mark" fill="none" stroke="#111111"><line x1="160" y1="104" x2="160" y2="26" stroke-width="1.6" stroke-dasharray="6 3.5"/><line x1="118" y1="104" x2="118" y2="62" stroke-width="1.3" stroke-dasharray="2 3"/><line x1="202" y1="104" x2="202" y2="62" stroke-width="1.3" stroke-dasharray="2 3"/></g></svg>',
        "counts-arrivals-and-the-board": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><g fill="#ffffff" stroke="#111111" stroke-width="1.3"><circle cx="160" cy="22" r="3.2"/><circle cx="140" cy="40" r="3.2"/><circle cx="180" cy="40" r="3.2"/><circle cx="120" cy="58" r="3.2"/><circle cx="160" cy="58" r="3.2"/><circle cx="200" cy="58" r="3.2"/></g><g fill="#111111"><circle class="tk-ca-bead" cx="160" cy="10" r="3.4"/><circle class="tk-ca-bead" cx="140" cy="34" r="3.4"/><circle class="tk-ca-bead" cx="160" cy="52" r="3.4"/></g><g class="tk-ca-bars" fill="#111111"><rect x="108" y="104" width="14" height="12"/><rect x="128" y="92" width="14" height="24"/><rect x="148" y="80" width="14" height="36"/><rect x="168" y="92" width="14" height="24"/><rect x="188" y="104" width="14" height="12"/></g><line x1="100" y1="116" x2="210" y2="116" stroke="#111111" stroke-width="1.4"/><circle class="tk-ca-landed" cx="160" cy="92" r="5.2" fill="#ffffff" stroke="#111111" stroke-width="1.4"/></svg>',
        "sampling-distributions-and-intervals": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><g class="tk-si-hit" fill="none" stroke="#111111" stroke-width="1.6"><line x1="108" y1="28" x2="204" y2="28"/><line x1="108" y1="22" x2="108" y2="34"/><line x1="204" y1="22" x2="204" y2="34"/><line x1="108" y1="48" x2="204" y2="48"/><line x1="108" y1="42" x2="108" y2="54"/><line x1="204" y1="42" x2="204" y2="54"/><line x1="108" y1="68" x2="204" y2="68"/><line x1="108" y1="62" x2="108" y2="74"/><line x1="204" y1="62" x2="204" y2="74"/><line x1="108" y1="88" x2="204" y2="88"/><line x1="108" y1="82" x2="108" y2="94"/><line x1="204" y1="82" x2="204" y2="94"/></g><g class="tk-si-miss" fill="none" stroke="#111111" stroke-width="1.7"><line x1="188" y1="108" x2="284" y2="108" stroke-dasharray="1.8 1.6"/><line x1="188" y1="102" x2="188" y2="114"/><line x1="284" y1="102" x2="284" y2="114"/></g><line x1="156" y1="14" x2="156" y2="116" stroke="#111111" stroke-width="1.8" stroke-dasharray="5 3.5"/></svg>',
        "from-chi-square-to-goodness-of-fit": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><line x1="24" y1="104" x2="304" y2="104" stroke="#111111" stroke-width="1.4"/><path class="tk-chi-curve" pathLength="100" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" d="M32 104 C44 104 50 72 62 42 C72 18 86 16 98 34 C114 58 132 90 156 100 C196 108 250 106 304 104"/><g class="tk-chi-mark" fill="none" stroke="#111111"><line x1="176" y1="104" x2="176" y2="30" stroke-width="1.45" stroke-dasharray="5 3.5"/><line x1="236" y1="104" x2="236" y2="30" stroke-width="2"/></g></svg>',
        "t-test": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><g fill="#111111"><circle cx="86" cy="30" r="3.2"/><circle cx="214" cy="22" r="3.2"/><circle cx="86" cy="50" r="3.2"/><circle cx="214" cy="42" r="3.2"/><circle cx="86" cy="70" r="3.2"/><circle cx="214" cy="62" r="3.2"/><circle cx="86" cy="90" r="3.2"/><circle cx="214" cy="82" r="3.2"/><circle cx="86" cy="110" r="3.2"/><circle cx="214" cy="102" r="3.2"/></g><g fill="none" stroke="#111111" stroke-width="1.6"><line class="tk-tt-link" pathLength="100" x1="86" y1="30" x2="214" y2="22"/><line class="tk-tt-link" pathLength="100" x1="86" y1="50" x2="214" y2="42"/><line class="tk-tt-link" pathLength="100" x1="86" y1="70" x2="214" y2="62"/><line class="tk-tt-link" pathLength="100" x1="86" y1="90" x2="214" y2="82"/><line class="tk-tt-link" pathLength="100" x1="86" y1="110" x2="214" y2="102"/></g></svg>',
        "statistical-power": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><line x1="20" y1="104" x2="304" y2="104" stroke="#111111" stroke-width="1.4"/><path fill="none" stroke="#111111" stroke-width="1.7" stroke-linecap="round" d="M28 104 C48 104 62 92 76 68 C88 46 100 30 114 30 C128 30 140 46 152 68 C166 92 180 104 200 104"/><path class="tk-pw-alt" pathLength="100" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" d="M108 104 C128 104 142 92 156 68 C168 46 180 30 194 30 C208 30 220 46 232 68 C246 92 260 104 280 104"/><line class="tk-pw-cut" x1="164" y1="104" x2="164" y2="22" stroke="#111111" stroke-width="1.45" stroke-dasharray="4 3"/></svg>',
        "anova": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><line x1="20" y1="108" x2="300" y2="108" stroke="#111111" stroke-width="1.4"/><g fill="#111111"><circle cx="48" cy="78" r="3.15"/><circle cx="62" cy="86" r="3.15"/><circle cx="76" cy="72" r="3.15"/><circle cx="90" cy="82" r="3.15"/><circle cx="138" cy="58" r="3.15"/><circle cx="152" cy="66" r="3.15"/><circle cx="166" cy="50" r="3.15"/><circle cx="180" cy="62" r="3.15"/><circle cx="228" cy="40" r="3.15"/><circle cx="242" cy="48" r="3.15"/><circle cx="256" cy="34" r="3.15"/><circle cx="270" cy="44" r="3.15"/></g><g fill="none" stroke="#111111" stroke-width="2"><line class="tk-an-mean" x1="40" y1="80" x2="98" y2="80"/><line class="tk-an-mean" x1="130" y1="58" x2="188" y2="58"/><line class="tk-an-mean" x1="220" y1="40" x2="278" y2="40"/></g></svg>',
        "association": '<svg viewBox="0 0 320 128" width="320" height="128" aria-hidden="true" focusable="false"><line x1="28" y1="16" x2="28" y2="108" stroke="#111111" stroke-width="1.4"/><line x1="28" y1="108" x2="292" y2="108" stroke="#111111" stroke-width="1.4"/><g fill="#111111"><circle cx="72" cy="88" r="3.15"/><circle cx="108" cy="56" r="3.15"/><circle cx="148" cy="90" r="3.15"/><circle cx="188" cy="34" r="3.15"/><circle cx="228" cy="66" r="3.15"/><circle cx="258" cy="36" r="3.15"/></g><line class="tk-ac-fit" pathLength="100" x1="52" y1="96" x2="268" y2="30" stroke="#111111" stroke-width="2"/><g class="tk-ac-resid" fill="none" stroke="#111111" stroke-width="1.35"><line x1="108" y1="56" x2="108" y2="79"/><line x1="148" y1="67" x2="148" y2="90"/><line x1="188" y1="34" x2="188" y2="54"/><line x1="228" y1="42" x2="228" y2="66"/></g></svg>',
    };

    function mountedPlate(id, markup, attr) {
        if (!markup) return null;
        var plate = el("figure", "topic-plate");
        plate.setAttribute(attr, id);
        plate.setAttribute("aria-hidden", "true");
        /* Static markup, parsed as HTML so the svg stays in the SVG namespace. */
        plate.innerHTML = markup;
        var svg = plate.querySelector("svg");
        if (!svg || svg.namespaceURI !== "http://www.w3.org/2000/svg") return null;
        return plate;
    }

    function topicPlate(id) {
        return mountedPlate(id, PLATES[id], "data-topic-plate");
    }

    function trackPlate(id) {
        return mountedPlate(id, TRACK_PLATES[id], "data-track-plate");
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
        nav.appendChild(el("p", "overview-root", "Book view"));
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
        document.title = topic ? topic.title + " - Book view" : "Book view - Project Viz";
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
        document.title = track.title + " - Book view";
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

    function showLoading() {
        clear(root);
        hideOverview();
        if (!root) return;
        var status = el("p", "hub-quiet", "Loading tracks…");
        status.id = "tracks-status";
        root.appendChild(status);
    }

    function showError() {
        clear(root);
        hideOverview();
        if (!root) return;
        root.appendChild(el("p", "hub-quiet", "Book view could not be loaded."));
        var retry = el("button", "catalog-retry", "Retry");
        retry.type = "button";
        retry.addEventListener("click", function () {
            load();
        });
        root.appendChild(retry);
    }

    function jsonUrl(file) {
        var url = new URL(file, window.location.href);
        url.search = "";
        url.hash = "";
        return url.toString();
    }

    function failLoad(token) {
        if (token !== loadToken || ready) return;
        if (loadTimer) window.clearTimeout(loadTimer);
        loadTimer = null;
        loadAbort = null;
        ready = true;
        failed = true;
        showError();
        try {
            document.dispatchEvent(new CustomEvent("projectviz:tracks"));
        } catch (err) {}
    }

    function reportTimeout() {
        if (ready) return;
        if (loadAbort) {
            try {
                loadAbort.abort();
            } catch (err) {}
        }
        failLoad(loadToken);
    }

    function settleTracks(token, data) {
        if (token !== loadToken || ready) return;
        var nextTracks = normalizeTracks(data);
        var nextTopics = normalizeTopics(data, nextTracks);
        if (loadTimer) window.clearTimeout(loadTimer);
        loadTimer = null;
        loadAbort = null;
        tracks = nextTracks;
        topics = nextTopics;
        failed = false;
        ready = true;
        renderedKey = "";
        try {
            sync();
        } catch (err) {
            ready = false;
            failed = false;
            throw err;
        }
        try {
            document.dispatchEvent(new CustomEvent("projectviz:tracks"));
        } catch (err2) {}
    }

    function load() {
        var token = ++loadToken;
        if (loadAbort) {
            try {
                loadAbort.abort();
            } catch (err) {}
            loadAbort = null;
        }
        if (loadTimer) window.clearTimeout(loadTimer);
        loadTimer = null;
        ready = false;
        failed = false;
        showLoading();
        var controller = typeof AbortController === "function" ? new AbortController() : null;
        loadAbort = controller;
        loadTimer = window.setTimeout(function () {
            if (token !== loadToken || ready) return;
            reportTimeout();
        }, LOAD_LIMIT_MS);
        var tracksUrl;
        try {
            tracksUrl = jsonUrl("tracks.json");
        } catch (err) {
            failLoad(token);
            return;
        }
        var options = controller ? { signal: controller.signal } : {};
        fetch(tracksUrl, options).then(function (response) {
            if (!response.ok) throw new Error("tracks");
            return response.json();
        }).then(function (data) {
            settleTracks(token, data);
        }).catch(function () {
            failLoad(token);
        });
    }

    window.ProjectVizTracks = {
        sync: sync,
        ready: function () { return ready && !failed; },
        failed: function () { return failed; },
        load: load,
        reportTimeout: reportTimeout,
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
