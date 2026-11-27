/*
 * Book view chapters. The chapter scrolls. A still opens its
 * demonstration over the screen, and Exit returns to the same place.
 * This file does not turn pages. The side menu is the table of
 * contents on a chapter page, and it stays under the top bar while
 * the chapter scrolls. The overview lists its four chapter titles
 * in the page and does not load this file. A chapter page expands
 * only the open chapter.
 */
(function () {
    var BOOK_CONTENTS = [
        {
            file: "chapter-1.html",
            id: "describing-data",
            title: "Chapter 1 – Describing data",
            sections: [
                {
                    id: "center-and-spread",
                    title: "Center and spread",
                    items: [
                        ["demo", "demo-mean-mode-median-dot-plot", "Mean, Median, and Mode"],
                        ["demo", "demo-moments-as-averages", "Moments"],
                        ["demo", "demo-bessels-correction-simulation", "Bessel's Correction"],
                        ["selftest", "self-test-center-and-spread", "Self-test: Center and spread"]
                    ]
                },
                {
                    id: "shape-and-pictures",
                    title: "Shape and pictures",
                    items: [
                        ["demo", "demo-skewed-distribution", "Skewed Distribution"],
                        ["demo", "demo-boxplot-histogram", "Boxplot and Histogram"],
                        ["demo", "demo-boxplot-outliers", "Boxplot and Outliers"],
                        ["demo", "demo-kde-plots", "Kernel Density Estimate (KDE)"],
                        ["selftest", "self-test-shape-and-pictures", "Self-test: Shape and pictures"]
                    ]
                },
                {
                    id: "same-summaries-different-graphs",
                    title: "Same summaries, different graphs",
                    items: [
                        ["demo", "demo-q-q-plot", "Q–Q Plot"],
                        ["demo", "demo-limitations-of-summary-statistics", "Limitations of summary statistics"],
                        ["selftest", "self-test-same-summaries-different-graphs", "Self-test: Same summaries, different graphs"]
                    ]
                }
            ],
            references: "references"
        },
        {
            file: "chapter-2.html",
            id: "probability-and-sampling",
            title: "Chapter 2 – Probability & sampling",
            sections: [
                {
                    id: "from-process-to-distribution",
                    title: "From process to distribution",
                    items: [
                        ["demo", "demo-stats-conceptual-hierarchy", "The 5-Level Conceptual Hierarchy of Statistics"],
                        ["demo", "demo-building-normal-distribution", "Building the Normal Distribution"],
                        ["demo", "demo-probability-distributions-map", "Probability Distributions Map"],
                        ["selftest", "self-test-from-process-to-distribution", "Self-test: From process to distribution"]
                    ]
                },
                {
                    id: "counts-arrivals-and-the-board",
                    title: "Counts, arrivals, and the board",
                    items: [
                        ["demo", "demo-binomial-bernoulli", "Binomial Distribution & Bernoulli Process"],
                        ["demo", "demo-poisson-point-process", "Poisson Distribution & Poisson Point Process"],
                        ["demo", "demo-galton-board", "Galton Board"],
                        ["selftest", "self-test-counts-arrivals-and-the-board", "Self-test: Counts, arrivals, and the board"]
                    ]
                },
                {
                    id: "sampling-distributions-and-intervals",
                    title: "Sampling distributions and intervals",
                    items: [
                        ["demo", "demo-central-limit-theorem", "Central Limit Theorem (CLT)"],
                        ["demo", "demo-horowitz-1974-simulation-CLT", "Horowitz (1974) CLT Simulation"],
                        ["demo", "demo-chi-square-distribution", "Chi-Square Distribution"],
                        ["demo", "demo-target-analogy-confidence-intervals", "Target Analogy of Confidence Intervals"],
                        ["selftest", "self-test-sampling-distributions-and-intervals", "Self-test: Sampling distributions and intervals"]
                    ]
                },
                {
                    id: "from-chi-square-to-goodness-of-fit",
                    title: "From chi-square to goodness-of-fit",
                    items: [
                        ["demo", "demo-chi-square-distribution-2", "Chi-Square Distribution"],
                        ["demo", "demo-chi-square-squared-distance", "Chi-Square as Squared Distance"],
                        ["demo", "demo-binomial-counts-to-chi-square", "From Binomial Counts to Chi-Square"],
                        ["demo", "demo-chi-square-goodness-of-fit", "Pearson’s χ² Goodness-of-Fit"],
                        ["demo", "demo-chi-square-independence-2x2", "χ² Roulette: Goodness-of-Fit vs Independence"],
                        ["selftest", "self-test-from-chi-square-to-goodness-of-fit", "Self-test: From chi-square to goodness-of-fit"]
                    ]
                }
            ],
            references: "references"
        },
        {
            file: "chapter-3.html",
            id: "comparing-means",
            title: "Chapter 3 – Comparing means",
            sections: [
                {
                    id: "t-test",
                    title: "t-test",
                    items: [
                        ["demo", "demo-z-distribution-vs-t-distribution", "z-Distribution vs t-Distribution"],
                        ["demo", "demo-independent-t-test-simulation", "Independent Samples t-Test"],
                        ["demo", "demo-paired-t-test-simulation", "Paired Sample t-Test"],
                        ["selftest", "self-test-t-test", "Self-test: t-test"]
                    ]
                },
                {
                    id: "statistical-power",
                    title: "Statistical power",
                    items: [
                        ["demo", "demo-statistical-power", "Statistical Power"],
                        ["demo", "demo-power-curve", "Power Curve"],
                        ["selftest", "self-test-statistical-power", "Self-test: Statistical power"]
                    ]
                },
                {
                    id: "anova",
                    title: "ANOVA",
                    items: [
                        ["demo", "demo-t-test-to-anova", "From t-Test to ANOVA"],
                        ["demo", "demo-paired-t-to-rm-anova", "From Paired t-Test to RM-ANOVA"],
                        ["demo", "demo-partitioning-sum-of-squares-anova", "Partitioning Sum of Squares in 1-Way, 2-Way, and 3-Way ANOVA"],
                        ["demo", "demo-two-way-anova", "Two-Way ANOVA"],
                        ["demo", "demo-mixed-anova-2x2", "2×2 Mixed ANOVA"],
                        ["demo", "demo-geometric-anova-regression", "Geometric ANOVA Regression"],
                        ["demo", "demo-anova-assumptions", "ANOVA Assumptions"],
                        ["selftest", "self-test-anova", "Self-test: ANOVA"]
                    ]
                }
            ]
        },
        {
            file: "chapter-4.html",
            id: "association",
            title: "Chapter 4 – Association",
            sections: [
                {
                    id: "association",
                    title: "Association",
                    items: [
                        ["demo", "demo-covariance-and-correlation", "Covariance and Correlation"],
                        ["demo", "demo-ols-simple-linear-regression", "Ordinary Least Squares (OLS)"],
                        ["demo", "demo-multiple-regression-sst-ssm-sse", "Multiple Regression"],
                        ["demo", "demo-multiple-regression-anova-equivalence", "Multiple Regression and ANOVA Equivalence"],
                        ["demo", "demo-variance-explained", "Variance Explained"],
                        ["demo", "demo-additivity-of-variance", "Additivity of Variance & SS"],
                        ["selftest", "self-test-association", "Self-test: Association"]
                    ]
                }
            ]
        }
    ];

    function chapterFile() {
        var path = window.location.pathname || "";
        var slash = path.lastIndexOf("/");
        return slash >= 0 ? path.slice(slash + 1) : path;
    }

    function itemHref(file, id, onThisPage) {
        var hash = "#" + id;
        return onThisPage ? hash : file + hash;
    }

    function renderContents(panel) {
        var here = chapterFile();
        panel.textContent = "";
        BOOK_CONTENTS.forEach(function (chapter) {
            var onThisPage = chapter.file === here;
            var block = document.createElement("div");
            block.className = "book-toc-chapter" + (onThisPage ? " is-current" : "");
            var heading = document.createElement("p");
            heading.className = "book-menu-chapter";
            var chapterLink = document.createElement("a");
            chapterLink.href = itemHref(chapter.file, chapter.id, onThisPage);
            chapterLink.textContent = chapter.title;
            if (onThisPage) chapterLink.setAttribute("aria-current", "page");
            heading.appendChild(chapterLink);
            block.appendChild(heading);
            if (!onThisPage) {
                panel.appendChild(block);
                return;
            }
            chapter.sections.forEach(function (section) {
                var sectionLink = document.createElement("a");
                sectionLink.className = "book-section-link";
                sectionLink.href = itemHref(chapter.file, section.id, onThisPage);
                sectionLink.textContent = section.title;
                block.appendChild(sectionLink);
                var list = document.createElement("ul");
                section.items.forEach(function (item) {
                    var li = document.createElement("li");
                    var link = document.createElement("a");
                    var kind = item[0];
                    link.className = kind === "selftest" ? "book-selftest-link" : "book-demo-link";
                    link.href = itemHref(chapter.file, item[1], onThisPage);
                    if (kind === "selftest") {
                        var mark = document.createElement("span");
                        mark.className = "book-selftest-mark";
                        mark.setAttribute("aria-hidden", "true");
                        mark.textContent = "🔖";
                        link.appendChild(mark);
                        link.appendChild(document.createTextNode(" " + item[2]));
                    } else {
                        link.textContent = item[2];
                    }
                    li.appendChild(link);
                    list.appendChild(li);
                });
                block.appendChild(list);
            });
            if (chapter.references) {
                var refLink = document.createElement("a");
                refLink.className = "book-section-link";
                refLink.href = itemHref(chapter.file, chapter.references, true);
                refLink.textContent = "References";
                block.appendChild(refLink);
            }
            panel.appendChild(block);
        });
    }

    var contentsPanel = document.getElementById("book-menu-panel");
    if (contentsPanel) renderContents(contentsPanel);

    /* The top bar wraps on a narrow phone and grows with the notebook
       ruler. The contents bar sticks just under that measured height. */
    function syncMenuTop() {
        var topbar = document.querySelector(".viz-topbar");
        if (!topbar) return;
        var height = topbar.getBoundingClientRect().height;
        if (height > 0) document.documentElement.style.setProperty("--book-menu-top", height + "px");
    }

    syncMenuTop();
    window.addEventListener("resize", syncMenuTop);
    if (typeof ResizeObserver === "function") {
        var menuTopbar = document.querySelector(".viz-topbar");
        if (menuTopbar) new ResizeObserver(syncMenuTop).observe(menuTopbar);
    }

    function boot() {
        var menu = document.querySelector(".book-menu");
        var menuButton = document.getElementById("book-menu-toggle");
        var menuPanel = document.getElementById("book-menu-panel");
        var menuShell = document.querySelector(".book-shell");
        var menuWide = window.matchMedia("(min-width: 960px)");
        var menuChosen = false;

        function setMenu(open) {
            if (!menu || !menuButton) return;
            menu.classList.toggle("is-collapsed", !open);
            if (menuShell) menuShell.classList.toggle("is-menu-collapsed", !open);
            menuButton.setAttribute("aria-expanded", open ? "true" : "false");
            menuButton.setAttribute("aria-label", open ? "Hide table of contents" : "Show table of contents");
            if (open) window.requestAnimationFrame(revealCurrentChapter);
        }

        function revealCurrentChapter() {
            if (!menuPanel || !menu || !menuWide.matches || menu.classList.contains("is-collapsed")) return;
            var current = menuPanel.querySelector(".book-toc-chapter.is-current");
            if (!current) return;
            var panelRect = menuPanel.getBoundingClientRect();
            var chapterRect = current.getBoundingClientRect();
            if (chapterRect.top >= panelRect.top && chapterRect.top <= panelRect.bottom - 48) return;
            menuPanel.scrollTop += chapterRect.top - panelRect.top;
        }

        if (menuButton) {
            setMenu(menuWide.matches);
            menuButton.addEventListener("click", function () {
                menuChosen = true;
                setMenu(menuButton.getAttribute("aria-expanded") !== "true");
            });
            if (typeof menuWide.addEventListener === "function") {
                menuWide.addEventListener("change", function () {
                    if (!menuChosen) setMenu(menuWide.matches);
                });
            }
            menu.addEventListener("click", function (event) {
                var link = event.target.closest && event.target.closest("a[href^='#']");
                if (!link || menuWide.matches) return;
                setMenu(false);
            });
        }

        var sections = Array.prototype.slice.call(document.querySelectorAll(".book-doc [data-book-section], #describing-data, #chapter-wrap"));
        if (menu && sections.length && "IntersectionObserver" in window) {
            var links = {};
            Array.prototype.forEach.call(menu.querySelectorAll("a[href^='#']"), function (link) {
                if (link.getAttribute("aria-current") === "page") return;
                links[link.getAttribute("href").slice(1)] = link;
            });
            var currentId = "";
            function mark(id) {
                if (!id || id === currentId) return;
                currentId = id;
                Object.keys(links).forEach(function (key) {
                    var link = links[key];
                    if (!link || link.getAttribute("aria-current") === "page") return;
                    if (key === id) link.setAttribute("aria-current", "true");
                    else link.removeAttribute("aria-current");
                });
            }
            var observer = new IntersectionObserver(function (entries) {
                var visible = entries.filter(function (entry) { return entry.isIntersecting; });
                if (!visible.length) return;
                visible.sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
                mark(visible[0].target.id);
            }, { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.6] });
            sections.forEach(function (section) { observer.observe(section); });
        }

        function activeFullscreen() {
            return document.fullscreenElement
                || document.webkitFullscreenElement
                || document.webkitCurrentFullScreenElement
                || document.mozFullScreenElement
                || document.msFullscreenElement
                || null;
        }

        function requestFullscreen(el) {
            var names = ["requestFullscreen", "webkitRequestFullscreen", "webkitRequestFullScreen", "mozRequestFullScreen", "msRequestFullscreen"];
            var i;
            for (i = 0; i < names.length; i++) {
                if (typeof el[names[i]] !== "function") continue;
                try {
                    var result = el[names[i]]();
                    return result && typeof result.then === "function" ? result : Promise.resolve();
                } catch (err) {}
            }
            return Promise.reject(new Error("fullscreen-unavailable"));
        }

        function exitFullscreen() {
            var names = ["exitFullscreen", "webkitExitFullscreen", "webkitCancelFullScreen", "mozCancelFullScreen", "msExitFullscreen"];
            var i;
            for (i = 0; i < names.length; i++) {
                if (typeof document[names[i]] !== "function") continue;
                try {
                    var result = document[names[i]]();
                    return result && typeof result.then === "function" ? result : Promise.resolve();
                } catch (err) {}
            }
            return Promise.resolve();
        }

        /* Scroll position before an in-page fullscreen, so Exit can put the
           reader back in the chapter. A phone often ignores overflow:hidden
           unless the body is fixed. */
        var savedScroll = 0;
        var scrollLocked = false;

        function lockScroll() {
            if (scrollLocked) return;
            savedScroll = window.scrollY || document.documentElement.scrollTop || 0;
            scrollLocked = true;
            document.body.style.position = "fixed";
            document.body.style.top = "-" + savedScroll + "px";
            document.body.style.left = "0";
            document.body.style.right = "0";
            document.body.style.width = "100%";
        }

        /* The place to put back after Back. The browser restores the scroll
           it stored for the previous history entry, which is not this place
           once the reader has moved down the chapter.
           That restore is only for the traversal that closes the
           demonstration. A later contents link also updates the session
           history. Leaving the saved place armed pulls that jump back to
           where the demonstration was opened, so the menu looks dead. */
        var restoreY = null;
        var restoreArmed = false;
        var restoreHash = "";
        var restoreSerial = 0;

        function putBack() {
            if (restoreY == null) return;
            window.scrollTo(0, restoreY);
        }

        function settleRestore() {
            if (!restoreArmed) return;
            var serial = restoreSerial;
            function go() {
                if (!restoreArmed || serial !== restoreSerial) return;
                putBack();
            }
            go();
            window.requestAnimationFrame(function () {
                go();
                window.setTimeout(function () {
                    if (!restoreArmed || serial !== restoreSerial) return;
                    putBack();
                    restoreArmed = false;
                    restoreY = null;
                }, 0);
            });
        }

        function cancelRestore() {
            restoreArmed = false;
            restoreY = null;
            restoreSerial += 1;
        }

        function unlockScroll() {
            if (!scrollLocked) return;
            var y = savedScroll;
            scrollLocked = false;
            restoreY = y;
            restoreArmed = true;
            restoreHash = window.location.hash || "";
            restoreSerial += 1;
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.left = "";
            document.body.style.right = "";
            document.body.style.width = "";
            putBack();
        }

        /* The live frame keeps the figure and its controls. The page title,
           the Back link, and the cite strip repeat the chapter, so they
           stay out. Teach already hides the longer notes. */
        var BOOK_FIT_CSS = [
            "html.viz-book h1,",
            "html.viz-book .demo-topbar,",
            "html.viz-book .demo-back,",
            "html.viz-book .site-oer-strip {",
            "  display: none !important;",
            "}"
        ].join("\n");

        function frameDocument(frame) {
            try {
                return frame.contentDocument;
            } catch (err) {
                return null;
            }
        }

        function ensureBookFit(doc) {
            if (!doc || !doc.head || !doc.body) return;
            doc.documentElement.classList.add("viz-book");
            if (doc.getElementById("viz-book-fit")) return;
            var style = doc.createElement("style");
            style.id = "viz-book-fit";
            style.textContent = BOOK_FIT_CSS;
            doc.head.appendChild(style);
        }

        function bindFrame(frame) {
            function ready() {
                ensureBookFit(frameDocument(frame));
            }
            frame.addEventListener("load", ready);
            if (frame.contentDocument && frame.contentDocument.readyState === "complete") ready();
        }

        /* The close control is always the word Exit. */
        function labelExit(exit) {
            if (!exit) return;
            if (exit.textContent !== "Exit") exit.textContent = "Exit";
        }

        function focusExit(pane) {
            var exit = pane.querySelector(".book-exit");
            labelExit(exit);
            if (exit && exit.focus) exit.focus();
        }

        function stillButton(pane) {
            var figure = pane && pane.parentNode;
            return figure ? figure.querySelector(".book-still") : null;
        }

        /* The browser Fullscreen API often refuses a div that holds an iframe
           in a normal phone tab. The card then fills the screen in the page. */
        function applyImmersive(pane) {
            if (activeFullscreen() === pane) return;
            lockScroll();
            document.body.classList.add("is-immersive");
            pane.classList.add("is-immersive-pane");
            focusExit(pane);
            if (!pane.hasAttribute("data-book-immersive-history")) {
                try {
                    history.pushState({ bookImmersive: 1 }, "", window.location.href);
                    pane.setAttribute("data-book-immersive-history", "1");
                } catch (err) {}
            }
        }

        function clearImmersive(pane, fromPop) {
            if (!pane) pane = document.querySelector(".book-figure .viz-pane.is-immersive-pane");
            var pushed = pane && pane.hasAttribute("data-book-immersive-history");
            if (pane) {
                pane.removeAttribute("data-book-immersive-history");
                pane.classList.remove("is-immersive-pane");
            }
            if (!document.querySelector(".book-figure .viz-pane.is-immersive-pane")) {
                document.body.classList.remove("is-immersive");
                unlockScroll();
            }
            if (pushed && !fromPop) {
                try {
                    history.back();
                } catch (err) {
                    settleRestore();
                }
            }
        }

        function enterPane(pane) {
            function settled() {
                /* Exit can win the race against the fullscreen promise. */
                if (!pane.classList.contains("is-live")) {
                    if (activeFullscreen() === pane) exitFullscreen();
                    return;
                }
                if (activeFullscreen() === pane) {
                    clearImmersive(pane, true);
                    document.body.classList.remove("is-immersive");
                    focusExit(pane);
                    return;
                }
                applyImmersive(pane);
            }
            requestFullscreen(pane).then(function () {
                window.requestAnimationFrame(settled);
            }).catch(function () {
                settled();
            });
        }

        /* Drop the live frame so a demonstration is not left running, and
           put the keyboard back on the card that opened it. */
        function releaseLive(pane, fromPop) {
            if (!pane || !pane.classList.contains("is-live")) return;
            var button = stillButton(pane);
            var immersive = pane.classList.contains("is-immersive-pane");
            if (immersive) clearImmersive(pane, fromPop);
            pane.classList.remove("is-live");
            pane.setAttribute("aria-hidden", "true");
            pane.setAttribute("inert", "");
            var frame = pane.querySelector("iframe");
            if (frame) frame.remove();
            if (!immersive && activeFullscreen()) exitFullscreen();
            if (button && button.focus) button.focus({ preventScroll: true });
        }

        function openStill(button) {
            var pane = button.parentNode && button.parentNode.querySelector(".viz-pane");
            if (!pane || pane.classList.contains("is-live")) return;
            var open = document.querySelector(".book-figure .book-live.is-live");
            if (open) releaseLive(open, false);
            var base = button.getAttribute("data-demo");
            if (!base) return;
            var teach = document.documentElement.classList.contains("viz-teach");
            var stage = pane.querySelector(".viz-pane-stage");
            var frame = document.createElement("iframe");
            var title = button.querySelector(".book-still-title");
            frame.title = title ? title.textContent : button.textContent;
            frame.setAttribute("allow", "fullscreen");
            frame.setAttribute("allowfullscreen", "");
            frame.src = base + "?embed=shell&" + (teach ? "teach=1" : "learn=1");
            stage.appendChild(frame);
            bindFrame(frame);
            pane.classList.add("is-live");
            pane.removeAttribute("aria-hidden");
            pane.removeAttribute("inert");
            labelExit(pane.querySelector(".book-exit"));
            enterPane(pane);
        }

        function endIfFullscreenLeft() {
            var pane = document.querySelector(".book-figure .book-live.is-live");
            if (!pane) return;
            if (activeFullscreen() === pane || pane.classList.contains("is-immersive-pane")) return;
            releaseLive(pane, true);
        }

        document.addEventListener("click", function (event) {
            var still = event.target.closest && event.target.closest(".book-still");
            if (still) {
                event.preventDefault();
                openStill(still);
                return;
            }
            var exit = event.target.closest && event.target.closest(".book-exit");
            if (!exit) return;
            var pane = exit.closest(".viz-pane");
            if (!pane) return;
            event.preventDefault();
            releaseLive(pane, false);
        });

        document.addEventListener("keydown", function (event) {
            if (event.key !== "Escape") return;
            var pane = document.querySelector(".book-figure .viz-pane.is-immersive-pane");
            if (!pane) pane = document.querySelector(".book-figure .book-live.is-live");
            if (!pane) return;
            event.preventDefault();
            releaseLive(pane, false);
        });

        window.addEventListener("popstate", function () {
            var pane = document.querySelector(".book-figure .viz-pane.is-immersive-pane");
            if (pane) releaseLive(pane, true);
            if (!restoreArmed) return;
            /* A contents link moves to another hash. The Back that closed
               the demonstration does not. */
            if ((window.location.hash || "") !== restoreHash) {
                cancelRestore();
                return;
            }
            settleRestore();
        });

        document.addEventListener("fullscreenchange", endIfFullscreenLeft);
        document.addEventListener("webkitfullscreenchange", endIfFullscreenLeft);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
