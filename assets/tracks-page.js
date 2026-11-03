/*
 * Guided Tracks page. Each playlist is one concept-map rail. The nodes
 * open the demonstrations. families.json backbone maps that opt into "hub"
 * sit above the playlists. Step notes stay in tracks.json; this page does
 * not repeat the same demos as a second link list.
 */
(function () {
    var root = document.getElementById("tracks-root");
    var familyMount = document.getElementById("tracks-family-mount");
    var familySection = document.getElementById("tracks-family-section");
    var missing = document.getElementById("tracks-missing");
    var catalogHrefs = [];

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

    function normalizeStep(raw) {
        if (!raw || typeof raw !== "object" || !window.ProjectVizMaps) return null;
        var title = typeof raw.title === "string" ? raw.title.trim() : "";
        var href = window.ProjectVizMaps.safeHref(raw.href);
        if (!title || !href) return null;
        return { title: title, href: href };
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

    function titleMap(data) {
        var byHref = {};
        var hrefs = [];
        var seen = {};
        var categories = data && Array.isArray(data.categories) ? data.categories : [];
        categories.forEach(function (category) {
            var subs = category && Array.isArray(category.subcategories) ? category.subcategories : [];
            subs.forEach(function (sub) {
                var demos = sub && Array.isArray(sub.demos) ? sub.demos : [];
                demos.forEach(function (demo) {
                    if (!demo || typeof demo.href !== "string" || typeof demo.title !== "string") return;
                    var href = demo.href.trim();
                    var title = demo.title.trim();
                    if (!href || !title || byHref[href]) return;
                    byHref[href] = title;
                    if (!seen[href]) {
                        seen[href] = true;
                        hrefs.push(href);
                    }
                });
            });
        });
        return { byHref: byHref, hrefs: hrefs };
    }

    function trackIdFromLocation() {
        var params = new URLSearchParams(window.location.search);
        if (params.has("track")) return (params.get("track") || "").trim();
        var hash = window.location.hash.replace(/^#/, "");
        if (!hash) return "";
        try {
            hash = decodeURIComponent(hash);
        } catch (err) {}
        if (hash.indexOf("track-") === 0) return hash.slice("track-".length).trim();
        return "";
    }

    function trackMap(track) {
        var nodes = track.steps.map(function (step, index) {
            var n = String(index + 1);
            if (n.length < 2) n = "0" + n;
            return {
                href: step.href,
                title: step.title,
                relation: "step",
                label: n
            };
        });
        return window.ProjectVizMaps.renderConceptMap({
            title: track.title,
            backbone: track.summary,
            nodes: nodes
        }, {
            headingTag: "h2",
            headingId: safeSlug(track.id) ? "track-" + track.id : "",
            kicker: stepCountLabel(nodes.length),
            tabIndex: -1,
            className: "is-track"
        });
    }

    function refreshOpened() {
        if (!window.ProjectVizOpened) return;
        window.ProjectVizOpened.renderProgress(catalogHrefs);
        window.ProjectVizOpened.mark("a.concept-node");
    }

    function revealTrack(tracks) {
        var requested = trackIdFromLocation();
        if (missing) missing.hidden = true;
        if (!requested) {
            document.title = "Guided Tracks - Project Viz";
            return;
        }
        var found = null;
        tracks.forEach(function (track) {
            if (track.id === requested) found = track;
        });
        if (!found) {
            if (missing) missing.hidden = false;
            document.title = "Guided Tracks - Project Viz";
            return;
        }
        document.title = found.title + " - Guided Tracks";
        var headingId = safeSlug(found.id) ? "track-" + found.id : "";
        var heading = headingId ? document.getElementById(headingId) : null;
        if (!heading) return;
        window.requestAnimationFrame(function () {
            heading.scrollIntoView({ block: "start" });
        });
    }

    function render(tracks, families) {
        clear(familyMount);
        clear(root);
        var hubCount = 0;
        families.forEach(function (family) {
            if (family.show.indexOf("hub") === -1 || !familyMount) return;
            familyMount.appendChild(window.ProjectVizMaps.renderConceptMap(family, {
                headingTag: "h3",
                headingId: "concept-map-" + family.id,
                kicker: "Concept map",
                backboneLabel: "Backbone"
            }));
            hubCount++;
        });
        if (familySection) familySection.hidden = hubCount === 0;
        if (!tracks.length) {
            root.appendChild(el("p", "hub-quiet", "No tracks yet."));
            return;
        }
        tracks.forEach(function (track) {
            if (!track.steps.length) return;
            var block = el("div", "track-block");
            block.appendChild(trackMap(track));
            root.appendChild(block);
        });
    }

    function showError() {
        clear(root);
        if (familySection) familySection.hidden = true;
        if (root) root.appendChild(el("p", "hub-quiet", "Guided tracks could not be loaded."));
    }

    function jsonUrl(file) {
        var url = new URL(file, window.location.href);
        url.search = "";
        url.hash = "";
        return url.toString();
    }

    function load() {
        Promise.all([
            fetch(jsonUrl("tracks.json")).then(function (response) {
                if (!response.ok) throw new Error("tracks");
                return response.json();
            }),
            fetch(jsonUrl("demos.json")).then(function (response) {
                if (!response.ok) throw new Error("demos");
                return response.json();
            }),
            fetch(jsonUrl("families.json")).then(function (response) {
                if (!response.ok) throw new Error("families");
                return response.json();
            })
        ]).then(function (results) {
            var tracks = normalizeTracks(results[0]);
            var titles = titleMap(results[1]);
            catalogHrefs = titles.hrefs;
            var families = window.ProjectVizMaps.normalizeFamilies(results[2], function (href) {
                return titles.byHref[href] || "";
            });
            render(tracks, families);
            refreshOpened();
            revealTrack(tracks);
        }).catch(function () {
            showError();
        });
    }

    if (window.ProjectVizOpened) {
        window.ProjectVizOpened.bindReset(document.getElementById("hub-progress-reset"), refreshOpened);
    }
    window.addEventListener("pageshow", refreshOpened);
    window.addEventListener("storage", function (event) {
        if (event.key === "project-viz-opened") refreshOpened();
    });
    window.addEventListener("hashchange", function () {
        var blocks = root ? root.querySelectorAll(".track-block") : [];
        var tracks = [];
        blocks.forEach(function (block) {
            var heading = block.querySelector("h2");
            if (!heading || !heading.id || heading.id.indexOf("track-") !== 0) return;
            tracks.push({ id: heading.id.slice("track-".length), title: heading.textContent });
        });
        revealTrack(tracks);
    });

    load();
})();
