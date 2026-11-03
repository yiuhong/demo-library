/*
 * Concept-map rails. Titles come from the caller. Nodes are catalog hrefs
 * and open in this tab. families.json still decides which backbone maps
 * exist; Guided Tracks build one rail per playlist from tracks.json.
 */
(function (global) {
    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function clear(node) {
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    function safeHref(href) {
        if (typeof href !== "string") return "";
        var value = href.trim();
        if (!value || value.length > 300) return "";
        if (/[\s\\]/.test(value)) return "";
        if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "";
        if (value.indexOf("//") === 0) return "";
        if (value.indexOf("..") !== -1) return "";
        return value;
    }

    function safeSlug(value) {
        if (typeof value !== "string") return "";
        var id = value.trim();
        if (!/^[a-z][a-z0-9-]*$/.test(id)) return "";
        return id;
    }

    function relationLabel(relation) {
        if (relation === "before") return "Before";
        if (relation === "backbone") return "Backbone";
        if (relation === "after") return "After";
        return "";
    }

    function normalizeFamilies(data, titleFor) {
        var list = data && Array.isArray(data.families) ? data.families : [];
        var families = [];
        var seenIds = {};
        list.forEach(function (raw) {
            if (!raw || typeof raw !== "object") return;
            var id = safeSlug(raw.id);
            var title = typeof raw.title === "string" ? raw.title.trim() : "";
            var backbone = typeof raw.backbone === "string" ? raw.backbone.trim() : "";
            if (!id || seenIds[id] || !title || title.length > 80 || !backbone || backbone.length > 280) return;
            var nodes = [];
            var seenHref = {};
            var rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
            rawNodes.forEach(function (node) {
                if (!node || typeof node !== "object") return;
                var href = safeHref(node.href);
                var relation = node.relation;
                if (!href || seenHref[href]) return;
                if (relation !== "before" && relation !== "backbone" && relation !== "after") return;
                var nodeTitle = titleFor(href);
                if (!nodeTitle) return;
                seenHref[href] = true;
                nodes.push({ href: href, relation: relation, title: nodeTitle, label: "" });
            });
            if (nodes.length < 2) return;
            var hasBackbone = false;
            var hasSide = false;
            nodes.forEach(function (node) {
                if (node.relation === "backbone") hasBackbone = true;
                if (node.relation === "before" || node.relation === "after") hasSide = true;
            });
            if (!hasBackbone || !hasSide) return;
            var show = [];
            var seenShow = {};
            var rawShow = Array.isArray(raw.show) ? raw.show : [];
            rawShow.forEach(function (place) {
                if (seenShow[place]) return;
                if (place !== "hub" && (typeof place !== "string" || !/^path-[a-z0-9-]+$/.test(place))) return;
                seenShow[place] = true;
                show.push(place);
            });
            if (!show.length) return;
            seenIds[id] = true;
            families.push({
                id: id,
                title: title,
                backbone: backbone,
                show: show,
                nodes: nodes
            });
        });
        return families;
    }

    function renderConceptMap(family, options) {
        options = options || {};
        var headingTag = options.headingTag || "h3";
        var map = el("div", "concept-map" + (options.className ? " " + options.className : ""));
        var headingId = options.headingId || "";
        if (headingId) {
            map.setAttribute("role", "group");
            map.setAttribute("aria-labelledby", headingId);
        }
        var head = el("div", "concept-map-head");
        if (options.kicker) head.appendChild(el("p", "concept-map-kicker", options.kicker));
        var title = el(headingTag, "concept-map-title", family.title);
        if (headingId) title.id = headingId;
        if (options.tabIndex != null) title.tabIndex = options.tabIndex;
        head.appendChild(title);
        if (family.backbone) {
            var bone = el("p", "concept-map-backbone");
            if (options.backboneLabel) {
                bone.appendChild(el("span", "concept-map-backbone-label", options.backboneLabel));
            }
            bone.appendChild(document.createTextNode(family.backbone));
            head.appendChild(bone);
        }
        map.appendChild(head);
        var rail = el("ol", "concept-rail");
        family.nodes.forEach(function (node) {
            var stop = el("li", "concept-stop is-" + (node.relation || "step"));
            var link = el("a", "concept-node");
            link.href = node.href;
            var kicker = el("span", "concept-kicker");
            kicker.appendChild(el("span", "concept-relation", node.label || relationLabel(node.relation)));
            kicker.appendChild(el("span", "hub-opened", "Opened"));
            link.appendChild(kicker);
            link.appendChild(el("span", "concept-title", node.title));
            stop.appendChild(link);
            rail.appendChild(stop);
        });
        map.appendChild(rail);
        return map;
    }

    function placeSectionMaps(families) {
        document.querySelectorAll(".concept-map.is-section").forEach(function (node) {
            if (node.parentNode) node.parentNode.removeChild(node);
        });
        var byPlace = {};
        families.forEach(function (family) {
            family.show.forEach(function (place) {
                if (place === "hub") return;
                if (!byPlace[place]) byPlace[place] = [];
                byPlace[place].push(family);
            });
        });
        Object.keys(byPlace).forEach(function (place) {
            var section = document.getElementById(place);
            if (!section || !section.classList.contains("sub-category-section")) return;
            var grid = section.querySelector(".card-grid");
            byPlace[place].forEach(function (family) {
                var map = renderConceptMap(family, {
                    headingTag: "h4",
                    headingId: "concept-map-" + family.id + "-" + place,
                    kicker: "Concept map",
                    backboneLabel: "Backbone",
                    className: "is-section"
                });
                if (grid) section.insertBefore(map, grid);
                else section.appendChild(map);
            });
        });
    }

    global.ProjectVizMaps = {
        clear: clear,
        safeHref: safeHref,
        normalizeFamilies: normalizeFamilies,
        renderConceptMap: renderConceptMap,
        placeSectionMaps: placeSectionMaps
    };
})(window);
