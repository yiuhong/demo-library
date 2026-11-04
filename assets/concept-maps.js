/*
 * Concept-map rails. Titles come from the caller. Nodes are catalog hrefs
 * and open in this tab. families.json decides which maps exist; Guided
 * Tracks build one rail per playlist from tracks.json.
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
            head.appendChild(el("p", "concept-map-backbone", family.backbone));
        }
        map.appendChild(head);
        var rail = el("ol", "concept-rail");
        family.nodes.forEach(function (node) {
            var stop = el("li", "concept-stop is-" + (node.relation || "step"));
            var link = el("a", "concept-node");
            link.href = node.href;
            if (node.label) {
                var kicker = el("span", "concept-kicker");
                kicker.appendChild(el("span", "concept-relation", node.label));
                link.appendChild(kicker);
            }
            link.appendChild(el("span", "concept-title", node.title));
            stop.appendChild(link);
            rail.appendChild(stop);
        });
        map.appendChild(rail);
        return map;
    }

    global.ProjectVizMaps = {
        clear: clear,
        safeHref: safeHref,
        normalizeFamilies: normalizeFamilies,
        renderConceptMap: renderConceptMap
    };
})(window);
