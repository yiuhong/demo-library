/*
 * Catalog page. Cards come from demos.json. Search and category filters
 * narrow the list. There is no List / Tracks toggle on this page.
 */
(function () {
    var searchInput = document.getElementById("searchInput");
    var noResults = document.getElementById("noResults");
    var activeFilter = "all";
    var catalogReady = false;
    var catalogError = false;
    var CATALOG_PANELS = ["style2", "style3", "style1"];

    function normalize(value) {
        return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
    }

    function applyFilters() {
        if (!noResults) return;
        if (!catalogReady || catalogError) {
            noResults.style.display = "none";
            return;
        }
        var searchTerm = normalize(searchInput ? searchInput.value : "");
        var totalVisibleDemos = 0;

        document.querySelectorAll(".category-section").forEach(function (category) {
            var categoryKey = category.getAttribute("data-category");
            var chipMatch = activeFilter === "all" || activeFilter === categoryKey;
            if (!chipMatch) {
                category.style.display = "none";
                return;
            }
            var categoryTitle = normalize(category.querySelector("h2").textContent);
            var categoryTitleMatch = searchTerm !== "" && categoryTitle.indexOf(searchTerm) !== -1;

            category.querySelectorAll(".sub-category-section").forEach(function (sub) {
                var heading = sub.querySelector("h3, h4");
                var subTitle = normalize(heading ? heading.textContent : "");
                var group = sub.closest(".topic-group");
                var groupHeading = group ? group.querySelector(".topic-group-title") : null;
                var groupTitle = normalize(groupHeading ? groupHeading.textContent : "");
                var subTitleMatch = searchTerm !== "" && subTitle.indexOf(searchTerm) !== -1;
                var groupTitleMatch = searchTerm !== "" && groupTitle.indexOf(searchTerm) !== -1;
                var subHasVisibleCards = false;

                sub.querySelectorAll(".demo-card").forEach(function (card) {
                    var keywords = normalize(card.getAttribute("data-keywords"));
                    var cardText = normalize(card.textContent);
                    var cardMatch = (keywords + " " + cardText).indexOf(searchTerm) !== -1;
                    if (searchTerm === "" || cardMatch || subTitleMatch || groupTitleMatch || categoryTitleMatch) {
                        card.style.display = "";
                        subHasVisibleCards = true;
                        totalVisibleDemos++;
                    } else {
                        card.style.display = "none";
                    }
                });
                sub.style.display = subHasVisibleCards ? "" : "none";
            });

            category.querySelectorAll(".topic-group").forEach(function (group) {
                var groupHasVisibleSubs = Array.prototype.some.call(
                    group.querySelectorAll(".sub-category-section"),
                    function (sub) { return sub.style.display !== "none"; }
                );
                group.style.display = groupHasVisibleSubs ? "" : "none";
            });

            var categoryHasVisibleSubs = Array.prototype.some.call(
                category.querySelectorAll(".sub-category-section"),
                function (sub) { return sub.style.display !== "none"; }
            );
            category.style.display = categoryHasVisibleSubs ? "" : "none";
        });

        document.querySelectorAll("section.catalog-panel").forEach(function (wrapper) {
            var hasVisible = Array.prototype.some.call(
                wrapper.querySelectorAll(".category-section"),
                function (cat) { return cat.style.display !== "none"; }
            );
            wrapper.style.display = hasVisible ? "" : "none";
        });
        noResults.style.display = totalVisibleDemos === 0 ? "block" : "none";
    }

    if (searchInput) searchInput.addEventListener("input", applyFilters);

    var filterChips = document.querySelector(".filter-chips");
    if (filterChips) {
        filterChips.addEventListener("click", function (event) {
            var chip = event.target.closest ? event.target.closest(".filter-chip") : null;
            if (!chip || !filterChips.contains(chip)) return;
            filterChips.querySelectorAll(".filter-chip").forEach(function (other) {
                other.classList.remove("is-active");
                other.setAttribute("aria-pressed", "false");
            });
            chip.classList.add("is-active");
            chip.setAttribute("aria-pressed", "true");
            activeFilter = chip.getAttribute("data-filter");
            applyFilters();
        });
    }

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

    function catalogMount(panel) {
        return document.getElementById("catalog-mount-" + panel);
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

    function assignAnchors(categories) {
        var used = {};
        categories.forEach(function (category) {
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
        var categories = list.map(normalizeCategory).filter(Boolean);
        assignAnchors(categories);
        return categories;
    }

    function renderDemoCard(demo) {
        var card = el("a", "demo-card");
        card.href = demo.href;
        card.setAttribute("data-keywords", demo.keywords);
        card.appendChild(el("span", "demo-card-title", demo.title));
        var desc = el("p", "demo-card-desc");
        setDescription(desc, demo.description);
        card.appendChild(desc);
        var tags = el("span", "demo-card-tags");
        demo.tags.forEach(function (tag) {
            tags.appendChild(el("span", tag.draft ? "demo-tag is-draft" : "demo-tag", tag.label));
        });
        if (tags.firstChild) card.appendChild(tags);
        return card;
    }

    function renderSubcategory(sub, level) {
        var section = el("div", "sub-category-section");
        if (sub.anchor) section.id = sub.anchor;
        section.appendChild(el(level, null, sub.title));
        var grid = el("nav", "card-grid");
        grid.setAttribute("aria-label", sub.title);
        sub.demos.forEach(function (demo) {
            grid.appendChild(renderDemoCard(demo));
        });
        section.appendChild(grid);
        return section;
    }

    function renderCategory(category) {
        var section = el("div", "category-section");
        if (category.domId) section.id = category.domId;
        section.setAttribute("data-category", category.id);
        section.appendChild(el("h2", null, category.title));
        var index = 0;
        while (index < category.subcategories.length) {
            var sub = category.subcategories[index];
            if (!sub.group) {
                section.appendChild(renderSubcategory(sub, "h3"));
                index++;
                continue;
            }
            var group = el("div", "topic-group");
            group.appendChild(el("h3", "topic-group-title", sub.group));
            var name = sub.group;
            while (index < category.subcategories.length && category.subcategories[index].group === name) {
                group.appendChild(renderSubcategory(category.subcategories[index], "h4"));
                index++;
            }
            section.appendChild(group);
        }
        return section;
    }

    function syncFilterChips(categories) {
        var group = document.querySelector(".filter-chips");
        if (!group) return;
        var chips = group.querySelectorAll(".filter-chip");
        var same = chips.length === categories.length + 1 && chips[0] && chips[0].getAttribute("data-filter") === "all";
        var i;
        if (same) {
            for (i = 0; i < categories.length; i++) {
                if (chips[i + 1].getAttribute("data-filter") !== categories[i].id) same = false;
                if (chips[i + 1].textContent !== categories[i].title) same = false;
            }
        }
        if (same) return;
        var keepAll = chips[0] && chips[0].getAttribute("data-filter") === "all" ? chips[0] : null;
        clear(group);
        if (!keepAll) {
            keepAll = el("button", "filter-chip is-active", "All");
            keepAll.type = "button";
            keepAll.setAttribute("data-filter", "all");
            keepAll.setAttribute("aria-pressed", "true");
        }
        var known = false;
        for (i = 0; i < categories.length; i++) {
            if (categories[i].id === activeFilter) known = true;
        }
        if (!known) activeFilter = "all";
        keepAll.classList.toggle("is-active", activeFilter === "all");
        keepAll.setAttribute("aria-pressed", activeFilter === "all" ? "true" : "false");
        group.appendChild(keepAll);
        categories.forEach(function (category) {
            var on = activeFilter === category.id;
            var btn = el("button", on ? "filter-chip is-active" : "filter-chip", category.title);
            btn.type = "button";
            btn.setAttribute("data-filter", category.id);
            btn.setAttribute("aria-pressed", on ? "true" : "false");
            group.appendChild(btn);
        });
    }

    function renderCatalog(categories) {
        var byPanel = { style1: [], style2: [], style3: [] };
        categories.forEach(function (category) {
            byPanel[category.panel].push(category);
        });
        CATALOG_PANELS.forEach(function (panel) {
            var mount = catalogMount(panel);
            if (!mount) return;
            var wrapper = mount.closest ? mount.closest("section") : null;
            clear(mount);
            if (!byPanel[panel].length) {
                if (wrapper) wrapper.classList.add("is-pending");
                return;
            }
            byPanel[panel].forEach(function (category) {
                mount.appendChild(renderCategory(category));
            });
            if (wrapper) wrapper.classList.remove("is-pending");
        });
        syncFilterChips(categories);
    }

    function clearBrowse() {
        if (searchInput) searchInput.value = "";
        activeFilter = "all";
        document.querySelectorAll(".filter-chip").forEach(function (chip) {
            var on = chip.getAttribute("data-filter") === "all";
            chip.classList.toggle("is-active", on);
            chip.setAttribute("aria-pressed", on ? "true" : "false");
        });
        applyFilters();
    }

    function pathIdFromLocation() {
        var hash = window.location.hash.replace(/^#/, "");
        if (!hash) return "";
        try {
            hash = decodeURIComponent(hash);
        } catch (err) {}
        if (!/^[a-z][a-z0-9-]*$/.test(hash)) return "";
        return hash;
    }

    function revealPathFromLocation() {
        var id = pathIdFromLocation();
        if (!id) return;
        var node = document.getElementById(id);
        if (!node) return;
        clearBrowse();
        node.scrollIntoView({ block: "start" });
    }

    function showCatalogError() {
        catalogError = true;
        var status = document.getElementById("catalog-status");
        if (status) status.textContent = "The catalog could not be loaded.";
    }

    function loadCatalog() {
        var catalogUrl = new URL("demos.json", window.location.href);
        catalogUrl.search = "";
        catalogUrl.hash = "";
        fetch(catalogUrl.toString()).then(function (response) {
            if (!response.ok) throw new Error("Catalog could not be loaded.");
            return response.json();
        }).then(function (data) {
            var categories = normalizeCatalog(data);
            if (!categories.length) throw new Error("Catalog could not be loaded.");
            renderCatalog(categories);
            catalogReady = true;
            applyFilters();
            revealPathFromLocation();
            document.dispatchEvent(new CustomEvent("projectviz:catalog"));
        }).catch(function () {
            showCatalogError();
            catalogReady = true;
            applyFilters();
            document.dispatchEvent(new CustomEvent("projectviz:catalog"));
        });
    }

    try {
        if (window.localStorage.getItem("demo-library-view") === "cards") {
            window.localStorage.setItem("demo-library-view", "list");
        }
    } catch (err) {}

    window.addEventListener("popstate", revealPathFromLocation);
    window.addEventListener("hashchange", revealPathFromLocation);

    loadCatalog();
})();
