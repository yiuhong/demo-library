/*
 * Chapter 1 Book mode. One text leaf beside the live demonstration
 * on a wide window. A phone stacks the text, then that demonstration.
 * Connection wording is read from tracks.json, the same source as
 * the Guided Tracks connection page. The demonstration iframe is the
 * existing page, embedded, and it starts in Teach.
 */
(function () {
    var root = document.documentElement;
    var WIDE = window.matchMedia("(min-width: 960px)");
    var NARROW_FS = window.matchMedia("(max-width: 479px)");
    var spreads = Array.prototype.slice.call(document.querySelectorAll("[data-book-spread]"));
    var slots = Array.prototype.slice.call(document.querySelectorAll(".book-demo-slot"));
    var prev = document.getElementById("book-prev");
    var next = document.getElementById("book-next");
    var position = document.getElementById("book-position");
    var index = 0;
    var fsPane = null;

    if (!spreads.length || !prev || !next || !position) return;

    function hashIndex() {
        var id = window.location.hash.replace(/^#/, "");
        if (!id) return -1;
        var i;
        for (i = 0; i < spreads.length; i++) {
            if (spreads[i].id === id) return i;
        }
        return -1;
    }

    function indexFromScroll() {
        var line = window.scrollY + 24;
        var found = 0;
        var i;
        for (i = 0; i < spreads.length; i++) {
            if (spreads[i].offsetTop <= line) found = i;
        }
        return found;
    }

    function show(moveFocus, resetScroll) {
        var paged = root.classList.contains("book-paged");
        var spread = spreads[index];
        var slotKey = spread.getAttribute("data-demo-slot") || "";
        var i;
        for (i = 0; i < spreads.length; i++) {
            var on = i === index;
            spreads[i].classList.toggle("is-active", on);
            if (paged) {
                if (on) spreads[i].removeAttribute("aria-hidden");
                else spreads[i].setAttribute("aria-hidden", "true");
            } else {
                spreads[i].removeAttribute("aria-hidden");
            }
            if (paged && on && resetScroll) spreads[i].scrollTop = 0;
        }
        for (i = 0; i < slots.length; i++) {
            var slotOn = !!(paged && slotKey && slots[i].getAttribute("data-demo-slot") === slotKey);
            slots[i].classList.toggle("is-active", slotOn);
            if (paged && !slotOn) slots[i].setAttribute("aria-hidden", "true");
            else slots[i].removeAttribute("aria-hidden");
        }
        prev.disabled = index === 0;
        next.disabled = index === spreads.length - 1;
        var label = spread.getAttribute("data-label") || "";
        position.textContent = (index + 1) + " / " + spreads.length + (label ? " · " + label : "");
        if (paged && window.location.hash !== "#" + spread.id) {
            history.replaceState(null, "", "#" + spread.id);
        }
        if (moveFocus) {
            var head = spread.querySelector("h1, h2");
            if (head) {
                head.setAttribute("tabindex", "-1");
                head.focus();
            }
        }
    }

    function setPaged(on) {
        root.classList.toggle("book-paged", on);
    }

    function go(delta, moveFocus) {
        if (!root.classList.contains("book-paged")) return;
        var upcoming = index + delta;
        if (upcoming < 0 || upcoming >= spreads.length) return;
        index = upcoming;
        show(moveFocus, true);
    }

    var fromHash = hashIndex();
    if (fromHash >= 0) index = fromHash;
    if (WIDE.matches) setPaged(true);
    show(false, false);

    prev.addEventListener("click", function (event) {
        go(-1, event.detail === 0);
    });
    next.addEventListener("click", function (event) {
        go(1, event.detail === 0);
    });

    document.addEventListener("keydown", function (event) {
        if (!root.classList.contains("book-paged")) return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        var target = event.target;
        if (!target) return;
        var tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (target.isContentEditable) return;
        if (target.closest && (target.closest(".viz-mode-switch") || target.closest(".viz-pane"))) return;
        var selection = window.getSelection && window.getSelection();
        if (selection && !selection.isCollapsed) return;
        if (event.key === "ArrowRight" || event.key === "PageDown") {
            event.preventDefault();
            go(1, true);
        } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
            event.preventDefault();
            go(-1, true);
        }
    });

    function applyMode() {
        if (WIDE.matches) {
            if (!root.classList.contains("book-paged")) index = indexFromScroll();
            setPaged(true);
            show(false, false);
        } else {
            var current = spreads[index];
            setPaged(false);
            show(false, false);
            if (current && current.scrollIntoView) current.scrollIntoView();
        }
    }

    if (typeof WIDE.addEventListener === "function") WIDE.addEventListener("change", applyMode);
    else if (typeof WIDE.addListener === "function") WIDE.addListener(applyMode);

    /* Notation matches assets/connection-page.js. Text nodes only. */
    function isSubChar(ch) {
        if (ch === "×") return true;
        var code = ch.charCodeAt(0);
        if (code >= 48 && code <= 57) return true;
        if (code >= 65 && code <= 90) return true;
        if (code >= 97 && code <= 122) return true;
        if (code >= 0x00C0 && code <= 0x024F) return true;
        if (code >= 0x0370 && code <= 0x03FF) return true;
        return false;
    }

    function isSupChar(ch) {
        var code = ch.charCodeAt(0);
        if (code >= 48 && code <= 57) return true;
        if (code >= 65 && code <= 90) return true;
        if (code >= 97 && code <= 122) return true;
        if (code >= 0x00C0 && code <= 0x024F) return true;
        if (code >= 0x0370 && code <= 0x03FF) return true;
        return false;
    }

    function readBraced(text, open) {
        var close = text.indexOf("}", open + 1);
        if (close <= open + 1) return null;
        return { body: text.slice(open + 1, close), next: close + 1 };
    }

    function readRun(text, start, kind) {
        var i = start;
        var saw = false;
        while (i < text.length) {
            var ch = text.charAt(i);
            if (kind === "sub" && ch === "(") {
                var depth = 1;
                var j = i + 1;
                while (j < text.length && depth > 0) {
                    var inner = text.charAt(j);
                    if (inner === "(") depth += 1;
                    else if (inner === ")") depth -= 1;
                    j += 1;
                }
                if (depth !== 0) break;
                i = j;
                saw = true;
                continue;
            }
            if (kind === "sub" ? !isSubChar(ch) : !isSupChar(ch)) break;
            i += 1;
            saw = true;
        }
        if (!saw) return null;
        return { body: text.slice(start, i), next: i };
    }

    function appendNotation(parent, text) {
        var i = 0;
        while (i < text.length) {
            var subAt = text.indexOf("_", i);
            var supAt = text.indexOf("^", i);
            var at = -1;
            var kind = "";
            if (subAt !== -1 && (supAt === -1 || subAt < supAt)) {
                at = subAt;
                kind = "sub";
            } else if (supAt !== -1) {
                at = supAt;
                kind = "sup";
            }
            if (at === -1) {
                if (i < text.length) parent.appendChild(document.createTextNode(text.slice(i)));
                return;
            }
            if (at > i) parent.appendChild(document.createTextNode(text.slice(i, at)));
            var marked = null;
            if (text.charAt(at + 1) === "{") marked = readBraced(text, at + 1);
            else marked = readRun(text, at + 1, kind);
            if (!marked) {
                parent.appendChild(document.createTextNode(text.charAt(at)));
                i = at + 1;
                continue;
            }
            var node = document.createElement(kind === "sub" ? "sub" : "sup");
            node.textContent = marked.body;
            parent.appendChild(node);
            i = marked.next;
        }
    }

    function prose(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        appendNotation(node, text);
        return node;
    }

    function glossParts(text) {
        var mark = " \u2014 ";
        var at = text.indexOf(mark);
        if (at <= 0) return null;
        var formula = text.slice(0, at).trim();
        var gloss = text.slice(at + mark.length).trim();
        if (!formula || !gloss) return null;
        var sentences = [];
        var rest = gloss;
        while (rest) {
            var dot = rest.indexOf(". ");
            if (dot === -1) {
                sentences.push(rest);
                break;
            }
            sentences.push(rest.slice(0, dot + 1));
            rest = rest.slice(dot + 2).trim();
        }
        if (sentences.length < 2) return { formula: formula, description: gloss, symbols: "" };
        var symbols = sentences.pop();
        return { formula: formula, description: sentences.join(" "), symbols: symbols };
    }

    function keyPoint(formula) {
        var parts = glossParts(formula);
        if (!parts) return prose("li", "", formula);
        var item = document.createElement("li");
        item.appendChild(prose("span", "connection-formula-line", parts.formula));
        item.appendChild(prose("span", "connection-gloss-line", parts.description));
        if (parts.symbols) item.appendChild(prose("span", "connection-symbols-line", parts.symbols));
        return item;
    }

    function fillConnection(mount, step) {
        while (mount.firstChild) mount.removeChild(mount.firstChild);
        var sub = (step.connectionTitle || "").replace(/\s+/g, " ").trim();
        if (sub) mount.appendChild(prose("p", "book-subhead", sub));
        if (step.note) mount.appendChild(prose("p", "connection-note", step.note));
        var formulae = Array.isArray(step.formulae) ? step.formulae : [];
        if (formulae.length) {
            var points = document.createElement("h3");
            points.className = "connection-key-points";
            points.textContent = "Key points";
            var list = document.createElement("ul");
            list.className = "connection-formulae";
            formulae.forEach(function (formula) {
                if (typeof formula === "string" && formula.trim()) list.appendChild(keyPoint(formula.trim()));
            });
            mount.appendChild(points);
            mount.appendChild(list);
        }
        if (step.demoDescription) {
            var heading = document.createElement("h3");
            heading.className = "connection-next-demo";
            heading.textContent = step.closingHeading && step.closingHeading.trim()
                ? step.closingHeading.trim()
                : "In the next demo";
            mount.appendChild(heading);
            mount.appendChild(prose("p", "connection-demo", step.demoDescription));
        }
    }

    var mounts = document.querySelectorAll(".book-connection");
    if (mounts.length) {
        var url;
        try {
            url = new URL("../tracks.json", window.location.href);
            url.search = "";
            url.hash = "";
        } catch (err) {
            url = null;
        }
        if (url) {
            fetch(url.href).then(function (response) {
                if (!response.ok) throw new Error("tracks");
                return response.json();
            }).then(function (data) {
                var byHref = {};
                var tracks = data && data.tracks ? data.tracks : [];
                tracks.forEach(function (track) {
                    (track.steps || []).forEach(function (step) {
                        if (step && step.href) byHref[step.href] = step;
                    });
                });
                Array.prototype.forEach.call(mounts, function (mount) {
                    var href = mount.getAttribute("data-href") || "";
                    var step = byHref[href];
                    if (!step) {
                        mount.appendChild(prose("p", "connection-status", "This connection was not found."));
                        return;
                    }
                    fillConnection(mount, step);
                });
            }).catch(function () {
                Array.prototype.forEach.call(mounts, function (mount) {
                    if (mount.firstChild) return;
                    mount.appendChild(prose("p", "connection-status", "The connection text could not be loaded."));
                });
            });
        }
    }

    function activeFullscreen() {
        return document.fullscreenElement
            || document.webkitFullscreenElement
            || document.webkitCurrentFullScreenElement
            || document.mozFullScreenElement
            || document.msFullscreenElement
            || null;
    }

    function homeScreenWebApp() {
        if (typeof navigator !== "undefined" && navigator.standalone === true) return true;
        if (!window.matchMedia) return false;
        return window.matchMedia("(display-mode: standalone)").matches
            || window.matchMedia("(display-mode: minimal-ui)").matches;
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

    function syncPane(pane) {
        if (!pane) return;
        var on = activeFullscreen() === pane || pane.classList.contains("is-immersive-pane");
        var enter = pane.querySelector(".book-fullscreen");
        var exit = pane.querySelector(".book-exit");
        if (enter) {
            enter.hidden = !!on;
            enter.setAttribute("aria-pressed", on ? "true" : "false");
        }
        if (exit) exit.hidden = !on;
        var frame = pane.querySelector("iframe");
        if (!frame) return;
        if (activeFullscreen() !== pane) {
            frame.style.height = "";
            return;
        }
        var chrome = pane.querySelector(".viz-pane-chrome");
        var fill = Math.ceil(pane.clientHeight - (chrome ? chrome.getBoundingClientRect().height : 0));
        if (fill > 0) frame.style.height = fill + "px";
    }

    function enterPane(pane) {
        if (NARROW_FS.matches) return;
        fsPane = pane;
        if (homeScreenWebApp()) {
            requestFullscreen(pane).then(function () {
                if (activeFullscreen() !== pane) {
                    document.body.classList.add("is-immersive");
                    pane.classList.add("is-immersive-pane");
                }
                syncPane(pane);
            }).catch(function () {
                document.body.classList.add("is-immersive");
                pane.classList.add("is-immersive-pane");
                syncPane(pane);
            });
            return;
        }
        requestFullscreen(pane).then(function () {
            syncPane(pane);
        }).catch(function () {});
    }

    function leavePane(pane) {
        document.body.classList.remove("is-immersive");
        if (pane) pane.classList.remove("is-immersive-pane");
        exitFullscreen().then(function () {
            syncPane(pane);
        }).catch(function () {
            syncPane(pane);
        });
    }

    document.addEventListener("click", function (event) {
        var enter = event.target.closest && event.target.closest(".book-fullscreen");
        var exit = event.target.closest && event.target.closest(".book-exit");
        if (!enter && !exit) return;
        var pane = (enter || exit).closest(".viz-pane");
        if (!pane) return;
        event.preventDefault();
        if (exit || activeFullscreen() === pane || pane.classList.contains("is-immersive-pane")) leavePane(pane);
        else enterPane(pane);
    });

    document.addEventListener("fullscreenchange", function () {
        slots.forEach(function (slot) {
            syncPane(slot.querySelector(".viz-pane"));
        });
        if (!activeFullscreen()) fsPane = null;
    });
    document.addEventListener("webkitfullscreenchange", function () {
        slots.forEach(function (slot) {
            syncPane(slot.querySelector(".viz-pane"));
        });
    });
})();
