/*
 * Guided Tracks page. Concept-map strips from families.json sit above
 * the playlists. Each playlist is a vertical menu: a demonstration link,
 * then a Connection link when that step has a note, formulae, or figure.
 * The connection opens tracks/connection.html, which reads tracks.json.
 * The same demos are not listed a second time.
 */
(function () {
    var root = document.getElementById("tracks-root");
    var familyMount = document.getElementById("tracks-family-mount");
    var familySection = document.getElementById("tracks-family-section");
    var missing = document.getElementById("tracks-missing");

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
        var image = safeImagePath(raw.image);
        var imageAlt = typeof raw.imageAlt === "string" ? raw.imageAlt.trim() : "";
        if (!image || !imageAlt) {
            image = "";
            imageAlt = "";
        }
        return {
            title: title,
            href: href,
            note: note,
            image: image,
            imageAlt: imageAlt,
            formulae: normalizeFormulae(raw.formulae)
        };
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
                });
            });
        });
        return { byHref: byHref };
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
        if (!step.note && !step.image && !step.formulae.length) return null;
        var href = connectionHref(track, index);
        if (!href) return null;
        var item = el("li", "playlist-join");
        var link = el("a", "playlist-connection-link");
        link.href = href;
        link.setAttribute("data-pane-title", "Connection · " + step.title);
        link.setAttribute("aria-label", "Connection after " + step.title);
        link.appendChild(el("span", "playlist-connection-label", "Connection"));
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
        if (track.summary) head.appendChild(el("p", "concept-map-backbone", track.summary));
        map.appendChild(head);
        var list = el("ol", "playlist");
        track.steps.forEach(function (step, index) {
            list.appendChild(demoItem(step, index));
            var connection = connectionItem(track, step, index);
            if (connection) list.appendChild(connection);
        });
        map.appendChild(list);
        return map;
    }

    function refreshOpened() {
        if (!window.ProjectVizOpened) return;
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
        var demo = "";
        try {
            demo = (new URLSearchParams(window.location.search).get("demo") || "").trim();
        } catch (err) {}
        if (demo) return;
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
                kicker: "Concept map"
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
            block.appendChild(trackPlaylist(track));
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
            var families = window.ProjectVizMaps.normalizeFamilies(results[2], function (href) {
                return titles.byHref[href] || "";
            });
            render(tracks, families);
            refreshOpened();
            revealTrack(tracks);
            document.dispatchEvent(new CustomEvent("projectviz:tracks"));
        }).catch(function () {
            showError();
            document.dispatchEvent(new CustomEvent("projectviz:tracks"));
        });
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
