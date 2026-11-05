/*
 * Catalog page. Cards come from demos.json.
 * Desktop browse: the rail is categories only, and the pane is the
 * focused category's card grid. The first category is focused on arrival.
 * Opening a card switches the rail to that category's demos and loads
 * the demonstration in the pane. Back to browse restores the grid.
 * Phone stacks categories, then that category's demos, then the
 * demonstration. Search stays inside the focused category.
 */
(function () {
    var rail = document.getElementById("viz-rail");
    var mount = document.getElementById("catalog-rail");
    var browse = document.getElementById("catalog-browse");
    var phoneQuery = window.matchMedia("(max-width: 736px)");
    var categories = [];
    var ready = false;
    var failed = false;
    var currentId = "";
    var explicit = false;
    var demoOpen = false;
    var searchTerm = "";

    function isPhone() {
        return phoneQuery.matches;
    }

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

    function normalize(value) {
        return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
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

    function safeDomId(value, fallback) {
        if (typeof value === "string" && /^[A-Za-z][\w-]*$/.test(value)) return value;
        if (typeof fallback === "string" && /^[A-Za-z][\w-]*$/.test(fallback)) return fallback;
        return "";
    }

    function escapeText(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function descriptionHtml(text) {
        if (text.indexOf("<") === -1) return null;
        var re = /<\/?(sub|sup|em|i|b|strong|br)\s*\/?>/gi;
        if (!re.test(text)) return null;
        re.lastIndex = 0;
        var html = "";
        var last = 0;
        var match;
        while ((match = re.exec(text))) {
            html += escapeText(text.slice(last, match.index));
            var tag = match[1].toLowerCase();
            if (tag === "br") html += "<br>";
            else if (match[0].charAt(1) === "/") html += "</" + tag + ">";
            else html += "<" + tag + ">";
            last = match.index + match[0].length;
        }
        html += escapeText(text.slice(last));
        return html;
    }

    function setDescription(node, text) {
        var html = descriptionHtml(text);
        if (html == null) node.textContent = text;
        else node.innerHTML = html;
    }

    function normalizeTag(raw) {
        if (typeof raw === "string") {
            var label = raw.trim();
            if (!label || label.length > 40) return null;
            return { label: label, draft: false };
        }
        if (!raw || typeof raw !== "object") return null;
        var text = typeof raw.label === "string" ? raw.label.trim() : "";
        if (!text || text.length > 40) return null;
        return { label: text, draft: raw.draft === true };
    }

    function normalizeDemo(raw) {
        if (!raw || typeof raw !== "object") return null;
        var title = typeof raw.title === "string" ? raw.title.trim() : "";
        var href = safeHref(raw.href);
        if (!title || !href) return null;
        var description = typeof raw.description === "string" ? raw.description : "";
        var keywords = typeof raw.keywords === "string" ? raw.keywords : "";
        var tags = Array.isArray(raw.tags) ? raw.tags.map(normalizeTag).filter(Boolean) : [];
        return { title: title, href: href, description: description, keywords: keywords, tags: tags };
    }

    function pathAnchor(title) {
        var slug = title.toLowerCase()
            .replace(/\u00d7/g, "x")
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        if (!slug || slug.charAt(0) < "a" || slug.charAt(0) > "z") return "";
        return "path-" + slug;
    }

    function normalizeSubcategory(raw) {
        if (!raw || typeof raw !== "object") return null;
        var title = typeof raw.title === "string" ? raw.title.trim() : "";
        if (!title) return null;
        var group = typeof raw.group === "string" ? raw.group.trim() : "";
        var demos = Array.isArray(raw.demos) ? raw.demos.map(normalizeDemo).filter(Boolean) : [];
        if (!demos.length) return null;
        return { title: title, group: group, demos: demos, anchor: "" };
    }

    function assignAnchors(list) {
        var used = {};
        list.forEach(function (category) {
            category.subcategories.forEach(function (sub) {
                var anchor = pathAnchor(sub.title);
                if (!anchor) return;
                if (used[anchor]) anchor = anchor + "-" + category.id;
                if (!anchor || used[anchor]) return;
                used[anchor] = true;
                sub.anchor = anchor;
            });
        });
    }

    function normalizeCategory(raw) {
        if (!raw || typeof raw !== "object") return null;
        var id = safeSlug(raw.id);
        var title = typeof raw.title === "string" ? raw.title.trim() : "";
        if (!id || !title) return null;
        var panel = raw.panel === "style1" || raw.panel === "style2" || raw.panel === "style3" ? raw.panel : "style2";
        var domId = safeDomId(raw.domId, id + "-category");
        var subcategories = Array.isArray(raw.subcategories) ? raw.subcategories.map(normalizeSubcategory).filter(Boolean) : [];
        if (!subcategories.length) return null;
        return { id: id, title: title, panel: panel, domId: domId, subcategories: subcategories };
    }

    function normalizeCatalog(data) {
        var list = data && Array.isArray(data.categories) ? data.categories : null;
        if (!list) throw new Error("Catalog could not be loaded.");
        var next = list.map(normalizeCategory).filter(Boolean);
        assignAnchors(next);
        return next;
    }

    function findCategory(id) {
        var i;
        for (i = 0; i < categories.length; i++) {
            if (categories[i].id === id) return categories[i];
        }
        return null;
    }

    function demoCount(category) {
        var n = 0;
        var i;
        for (i = 0; i < category.subcategories.length; i++) n += category.subcategories[i].demos.length;
        return n;
    }

    function countLabel(n) {
        return n === 1 ? "1 demo" : n + " demos";
    }

    function categoryForHref(href) {
        if (typeof href !== "string" || !href) return "";
        var value = href.trim();
        var query = value.indexOf("?");
        if (query !== -1) value = value.slice(0, query);
        var i;
        var j;
        var k;
        for (i = 0; i < categories.length; i++) {
            var subs = categories[i].subcategories;
            for (j = 0; j < subs.length; j++) {
                var demos = subs[j].demos;
                for (k = 0; k < demos.length; k++) {
                    if (demos[k].href === value) return categories[i].id;
                }
            }
        }
        return "";
    }

    function hashToken() {
        var hash = window.location.hash.replace(/^#/, "");
        if (!hash) return "";
        try {
            hash = decodeURIComponent(hash);
        } catch (err) {}
        if (!/^[A-Za-z][\w-]*$/.test(hash)) return "";
        return hash;
    }

    function categoryForHash(hash) {
        var token = typeof hash === "string" ? hash.replace(/^#/, "") : hashToken();
        if (typeof hash === "string") {
            try {
                token = decodeURIComponent(token);
            } catch (err) {}
        }
        if (!token || !/^[A-Za-z][\w-]*$/.test(token)) return "";
        var i;
        var j;
        for (i = 0; i < categories.length; i++) {
            if (categories[i].domId === token) return categories[i].id;
            var subs = categories[i].subcategories;
            for (j = 0; j < subs.length; j++) {
                if (subs[j].anchor === token) return categories[i].id;
            }
        }
        return "";
    }

    function stageTitle() {
        var category = findCategory(currentId);
        if (category) return category.title;
        return isPhone() ? "Select a category" : "Catalog";
    }

    function paintStageTitle() {
        if (demoOpen) return;
        var node = document.getElementById("viz-pane-title");
        if (node) node.textContent = stageTitle();
        var empty = document.getElementById("viz-empty");
        if (empty) empty.hidden = !!(browse && !browse.hidden);
    }

    function setLeadVisible(show) {
        var lead = rail ? rail.querySelector(".page-lead") : null;
        if (lead) lead.hidden = !show;
    }

    function setLandingChrome(landing) {
        var heading = rail ? rail.querySelector("h1") : null;
        if (heading) heading.classList.toggle("visually-hidden", !landing);
        setLeadVisible(landing);
    }

    function placeBack(show, label, aria) {
        var button = document.getElementById("catalog-back");
        if (!show) {
            if (button) button.hidden = true;
            return;
        }
        if (!button) {
            button = el("button", "catalog-rail-back");
            button.id = "catalog-back";
            button.type = "button";
            if (rail) rail.insertBefore(button, rail.firstChild);
        }
        button.hidden = false;
        button.textContent = label;
        button.setAttribute("aria-label", aria || label);
    }

    function keywordText(demo) {
        var extra = demo.tags.map(function (tag) { return tag.label; }).join(" ");
        return (demo.keywords + " " + extra).trim();
    }

    function renderCard(demo, categoryId) {
        var card = el("a", "demo-card");
        card.href = demo.href;
        card.setAttribute("data-category", categoryId);
        card.setAttribute("data-keywords", keywordText(demo));
        card.appendChild(el("span", "demo-card-title", demo.title));
        var desc = el("p", "demo-card-desc");
        setDescription(desc, demo.description);
        card.appendChild(desc);
        return card;
    }

    function renderCompactLink(demo, categoryId) {
        var item = el("li");
        var link = el("a", "catalog-demo", demo.title);
        link.href = demo.href;
        link.setAttribute("data-category", categoryId);
        item.appendChild(link);
        return item;
    }

    function renderTopic(sub, category, compact) {
        var section = el("section", compact ? "catalog-topic is-compact" : "catalog-topic");
        section.setAttribute("data-topic", sub.title);
        if (sub.anchor) section.id = sub.anchor;
        var heading = el("h3", compact ? "catalog-topic-title" : null, sub.title);
        section.appendChild(heading);
        if (compact) {
            var list = el("ul", "catalog-demo-list");
            sub.demos.forEach(function (demo) {
                list.appendChild(renderCompactLink(demo, category.id));
            });
            section.appendChild(list);
            return section;
        }
        var grid = el("div", "card-grid");
        sub.demos.forEach(function (demo) {
            grid.appendChild(renderCard(demo, category.id));
        });
        section.appendChild(grid);
        return section;
    }

    function appendTopics(parent, category, compact) {
        var subs = category.subcategories;
        var index = 0;
        while (index < subs.length) {
            var sub = subs[index];
            if (!sub.group) {
                parent.appendChild(renderTopic(sub, category, compact));
                index++;
                continue;
            }
            var group = el("div", "catalog-group");
            group.setAttribute("data-topic", sub.group);
            group.appendChild(el("h3", "catalog-group-title", sub.group));
            var name = sub.group;
            while (index < subs.length && subs[index].group === name) {
                group.appendChild(renderTopic(subs[index], category, compact));
                index++;
            }
            parent.appendChild(group);
        }
    }

    function topicHaystack(card) {
        var names = [];
        var topic = card.closest ? card.closest("[data-topic]") : null;
        while (topic) {
            names.push(topic.getAttribute("data-topic") || "");
            topic = topic.parentElement && topic.parentElement.closest
                ? topic.parentElement.closest("[data-topic]")
                : null;
        }
        return normalize(names.join(" "));
    }

    function applySearch(root) {
        if (!root) return;
        var term = normalize(searchTerm);
        var visible = 0;
        root.querySelectorAll("a.demo-card").forEach(function (card) {
            var hay = normalize((card.getAttribute("data-keywords") || "") + " " + card.textContent);
            var show = term === "" || hay.indexOf(term) !== -1 || topicHaystack(card).indexOf(term) !== -1;
            card.hidden = !show;
            if (show) visible++;
        });
        root.querySelectorAll("[data-topic]").forEach(function (topic) {
            var any = false;
            var cards = topic.querySelectorAll("a.demo-card");
            var i;
            for (i = 0; i < cards.length; i++) {
                if (!cards[i].hidden) any = true;
            }
            topic.hidden = !any;
        });
        var empty = root.querySelector(".no-results");
        if (empty) empty.hidden = visible !== 0;
    }

    function searchField() {
        var wrap = el("div", "search-container");
        var label = el("label", "visually-hidden", "Search this category");
        label.htmlFor = "searchInput";
        var input = document.createElement("input");
        input.id = "searchInput";
        input.type = "search";
        input.placeholder = "Search this category";
        input.value = searchTerm;
        input.setAttribute("autocomplete", "off");
        input.addEventListener("input", function () {
            searchTerm = input.value;
            applySearch(input.closest("#catalog-browse, .catalog-phone-list"));
        });
        wrap.appendChild(label);
        wrap.appendChild(input);
        return wrap;
    }

    function noResultsNote() {
        var note = el("p", "no-results", "No demonstrations found. Try a different keyword.");
        note.hidden = true;
        note.setAttribute("role", "status");
        return note;
    }

    function renderCategories() {
        clear(mount);
        placeBack(false);
        setLandingChrome(true);
        if (!categories.length) {
            mount.appendChild(el("p", "catalog-message", "The catalog could not be loaded."));
            return;
        }
        var list = el("ul", "catalog-chooser");
        list.setAttribute("aria-label", "Categories");
        categories.forEach(function (category) {
            var item = el("li");
            var link = el("a", "catalog-choice");
            link.href = "catalog.html?category=" + category.id;
            link.setAttribute("data-category", category.id);
            var on = !demoOpen && category.id === currentId;
            if (on) {
                link.classList.add("is-current");
                link.setAttribute("aria-current", "true");
            }
            link.appendChild(el("span", "catalog-choice-title", category.title));
            link.appendChild(el("span", "catalog-choice-count", countLabel(demoCount(category))));
            item.appendChild(link);
            list.appendChild(item);
        });
        mount.appendChild(list);
    }

    function renderDemoList(category, compact) {
        clear(mount);
        placeBack(
            true,
            compact ? "Back to browse" : "Back",
            compact ? "Back to browse" : "Back to all categories"
        );
        setLandingChrome(false);
        var heading = el("h2", null, category.title);
        if (category.domId && isPhone()) heading.id = category.domId;
        mount.appendChild(heading);
        var body = el("div", compact ? "catalog-demo-rail" : "catalog-phone-list");
        if (!compact) {
            body.appendChild(searchField());
            body.appendChild(noResultsNote());
        }
        var nav = el("nav");
        nav.setAttribute("aria-label", category.title);
        appendTopics(nav, category, compact);
        body.appendChild(nav);
        mount.appendChild(body);
        if (!compact) applySearch(body);
    }

    function renderGrid(category) {
        if (!browse) return;
        clear(browse);
        browse.hidden = false;
        if (category.domId) {
            var marker = el("div");
            marker.id = category.domId;
            browse.appendChild(marker);
        }
        var head = el("div", "catalog-browse-head");
        head.appendChild(el("p", "catalog-browse-kicker", "Pick a demonstration"));
        head.appendChild(searchField());
        browse.appendChild(head);
        browse.appendChild(noResultsNote());
        var nav = el("nav");
        nav.setAttribute("aria-label", category.title);
        appendTopics(nav, category, false);
        browse.appendChild(nav);
        applySearch(browse);
        browse.scrollTop = 0;
    }

    function hideBrowse() {
        if (!browse) return;
        browse.hidden = true;
        clear(browse);
    }

    function revealHash() {
        var id = hashToken();
        if (!id) return;
        var node = document.getElementById(id);
        if (!node || !node.scrollIntoView) return;
        window.requestAnimationFrame(function () {
            if (node.isConnected) node.scrollIntoView({ block: "start" });
        });
    }

    function sync(options) {
        options = options || {};
        if (!ready || failed) return currentId;
        if (options.explicit != null) explicit = !!options.explicit;
        demoOpen = !!options.demoOpen;
        var categoryId = typeof options.category === "string" ? safeSlug(options.category) : currentId;
        if (categoryId && !findCategory(categoryId)) categoryId = "";
        if (!categoryId && !isPhone()) categoryId = categories.length ? categories[0].id : "";
        if (categoryId !== currentId) searchTerm = "";
        currentId = categoryId || "";
        var category = findCategory(currentId);
        document.title = category ? category.title + " - Catalog" : "Catalog - Project Viz";
        if (!category) {
            renderCategories();
            hideBrowse();
            paintStageTitle();
            return currentId;
        }
        if (isPhone()) renderDemoList(category, false);
        else if (demoOpen) renderDemoList(category, true);
        else renderCategories();
        if (!isPhone() && !demoOpen) renderGrid(category);
        else hideBrowse();
        paintStageTitle();
        revealHash();
        return currentId;
    }

    function showError() {
        failed = true;
        ready = true;
        clear(mount);
        if (mount) mount.appendChild(el("p", "catalog-message", "The catalog could not be loaded."));
        hideBrowse();
        var empty = document.getElementById("viz-empty");
        if (empty) {
            empty.hidden = false;
            empty.textContent = "The catalog could not be loaded.";
        }
    }

    function loadCatalog() {
        var catalogUrl = new URL("demos.json", window.location.href);
        catalogUrl.search = "";
        catalogUrl.hash = "";
        fetch(catalogUrl.toString()).then(function (response) {
            if (!response.ok) throw new Error("Catalog could not be loaded.");
            return response.json();
        }).then(function (data) {
            categories = normalizeCatalog(data);
            if (!categories.length) throw new Error("Catalog could not be loaded.");
            ready = true;
            failed = false;
            document.dispatchEvent(new CustomEvent("projectviz:catalog"));
        }).catch(function () {
            showError();
            document.dispatchEvent(new CustomEvent("projectviz:catalog"));
        });
    }

    window.ProjectVizCatalog = {
        sync: sync,
        ready: function () { return ready && !failed; },
        has: function (id) { return !!findCategory(safeSlug(id)); },
        firstId: function () { return categories.length ? categories[0].id : ""; },
        currentId: function () { return currentId; },
        explicit: function () { return explicit; },
        categoryForHref: categoryForHref,
        categoryForHash: categoryForHash,
        stageTitle: stageTitle
    };

    window.addEventListener("hashchange", function () {
        if (!ready || failed) return;
        var id = categoryForHash(window.location.hash);
        if (!id) return;
        if (window.ProjectVizShell && window.ProjectVizShell.openCategory) {
            window.ProjectVizShell.openCategory(id, { replace: true });
        }
        revealHash();
    });

    if (phoneQuery.addEventListener) {
        phoneQuery.addEventListener("change", function () {
            if (!ready || failed) return;
            if (window.ProjectVizShell && window.ProjectVizShell.syncCatalog) {
                window.ProjectVizShell.syncCatalog();
            }
        });
    }

    try {
        if (window.localStorage.getItem("demo-library-view") === "cards") {
            window.localStorage.setItem("demo-library-view", "list");
        }
    } catch (err) {}

    loadCatalog();
})();
