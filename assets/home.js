/*
 * Home page. Cycles the featured plates and marks opened demos.
 * Plate copy starts in the HTML and is refreshed from demos.json.
 */
(function () {
    var slides = Array.prototype.slice.call(document.querySelectorAll(".home-slide"));
    var dots = Array.prototype.slice.call(document.querySelectorAll(".home-dot"));
    var live = document.getElementById("home-live");
    var stage = document.getElementById("home-stage");
    var index = 0;
    var timer = 0;
    var paused = false;
    var reduce = false;
    try {
        reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (err) {}

    function slideName(slide) {
        var title = slide.querySelector(".home-slide-title");
        return title ? title.textContent : "Featured";
    }

    function show(next, speak) {
        if (!slides.length) return;
        index = (next + slides.length) % slides.length;
        slides.forEach(function (slide, i) {
            var on = i === index;
            slide.hidden = !on;
            slide.classList.toggle("is-active", on);
        });
        dots.forEach(function (dot, i) {
            var on = i === index;
            dot.classList.toggle("is-active", on);
            dot.setAttribute("aria-pressed", on ? "true" : "false");
        });
        if (speak && live) {
            live.textContent = "Plate " + (index + 1) + " of " + slides.length + ", " + slideName(slides[index]);
        }
    }

    function stop() {
        if (timer) window.clearInterval(timer);
        timer = 0;
    }

    function start() {
        stop();
        if (reduce || slides.length < 2) return;
        timer = window.setInterval(function () {
            if (paused || document.hidden) return;
            show(index + 1, true);
        }, 6800);
    }

    var prev = document.getElementById("home-prev");
    var next = document.getElementById("home-next");
    if (prev) {
        prev.addEventListener("click", function () {
            show(index - 1, true);
            start();
        });
    }
    if (next) {
        next.addEventListener("click", function () {
            show(index + 1, true);
            start();
        });
    }
    dots.forEach(function (dot, i) {
        dot.addEventListener("click", function () {
            show(i, true);
            start();
        });
    });
    if (stage) {
        stage.addEventListener("mouseenter", function () { paused = true; });
        stage.addEventListener("mouseleave", function () { paused = false; });
        stage.addEventListener("focusin", function () { paused = true; });
        stage.addEventListener("focusout", function (event) {
            if (!stage.contains(event.relatedTarget)) paused = false;
        });
    }

    function setText(node, text) {
        if (node && text) node.textContent = text;
    }

    function refreshOpened() {
        if (!window.ProjectVizOpened) return;
        window.ProjectVizOpened.mark("a.home-open");
    }

    function applyCatalog(data) {
        var byHref = {};
        var seen = {};
        var categories = data && Array.isArray(data.categories) ? data.categories : [];
        categories.forEach(function (category) {
            var subs = category && Array.isArray(category.subcategories) ? category.subcategories : [];
            subs.forEach(function (sub) {
                var demos = sub && Array.isArray(sub.demos) ? sub.demos : [];
                demos.forEach(function (demo) {
                    if (!demo || typeof demo.href !== "string") return;
                    var href = demo.href.trim();
                    if (!href || seen[href]) return;
                    seen[href] = true;
                    if (typeof demo.title === "string" && demo.title.trim()) {
                        byHref[href] = {
                            title: demo.title.trim(),
                            description: typeof demo.description === "string" ? demo.description.trim() : ""
                        };
                    }
                });
            });
        });
        slides.forEach(function (slide) {
            var href = slide.getAttribute("data-href");
            var hit = byHref[href];
            if (!hit) return;
            setText(slide.querySelector(".home-slide-title"), hit.title);
            setText(slide.querySelector(".home-hook"), hit.description);
        });
        refreshOpened();
    }

    document.addEventListener("click", function (event) {
        var node = event.target && event.target.nodeType === 1 ? event.target : event.target.parentElement;
        var link = node && node.closest ? node.closest("a.home-open") : null;
        if (!link) return;
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var href = link.getAttribute("href");
        if (!href || href.indexOf("..") !== -1 || /^[a-z][a-z0-9+.-]*:/i.test(href)) return;
        event.preventDefault();
        window.location.href = "catalog.html?demo=" + href;
    });

    show(0, false);
    start();

    window.addEventListener("pageshow", refreshOpened);
    window.addEventListener("storage", function (event) {
        if (event.key === "project-viz-opened") refreshOpened();
    });

    var catalogUrl = new URL("demos.json", window.location.href);
    catalogUrl.search = "";
    catalogUrl.hash = "";
    fetch(catalogUrl.toString()).then(function (response) {
        if (!response.ok) throw new Error("catalog");
        return response.json();
    }).then(applyCatalog).catch(function () {});
})();
