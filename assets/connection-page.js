/*
 * Renders one Guided Tracks connection from tracks.json.
 * Address: tracks/connection.html?track=<id>&step=<index>
 * step= is the zero-based index of the demonstration this page introduces.
 * The heading is that step's connectionTitle. The note, formulae, demo
 * description, and figure stay in tracks.json. Order: title, note,
 * Key points, formulae, the figure, In the next demo, what the
 * demonstration does. Key points shows only when formulae are present.
 * In the next demo shows only when the demo description is present.
 * The figure shows only when the image path and its alt text are both valid.
 * A trailing _word, _word(note), _{word}, ^word, or ^{word} in the note,
 * the formulae, or the demo description is drawn as sub or sup. The source
 * stays plain text. Keep that grammar in step with check_catalog.py.
 */
(function () {
    var root = document.getElementById("connection-root");
    if (!root) return;

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function clear(node) {
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    function showStatus(text) {
        clear(root);
        root.appendChild(el("p", "connection-status", text));
    }

    function safeTrackId(value) {
        if (typeof value !== "string") return "";
        var id = value.trim();
        if (!/^[a-z][a-z0-9-]*$/.test(id)) return "";
        return id;
    }

    function safeImagePath(href) {
        if (typeof href !== "string") return "";
        var value = href.trim();
        if (!value || value.length > 300) return "";
        if (/[\s\\]/.test(value)) return "";
        if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "";
        if (value.indexOf("//") === 0 || value.indexOf("..") !== -1) return "";
        if (value.charAt(0) === "/") return "";
        if (!/^[A-Za-z0-9._/-]+$/.test(value)) return "";
        if (!/\.(png|svg|jpe?g|gif|webp)$/i.test(value)) return "";
        return value;
    }

    function readQuery() {
        var params;
        try {
            params = new URLSearchParams(window.location.search);
        } catch (err) {
            return null;
        }
        var track = safeTrackId(params.get("track") || "");
        var stepText = (params.get("step") || "").trim();
        if (!track || !/^[0-9]{1,3}$/.test(stepText)) return null;
        return { track: track, step: parseInt(stepText, 10) };
    }

    function trackEntries(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.tracks)) return data.tracks;
        return null;
    }

    function findStep(data, query) {
        var tracks = trackEntries(data);
        if (!tracks) return null;
        var i;
        for (i = 0; i < tracks.length; i++) {
            var track = tracks[i];
            var id = track && typeof track.id === "string" ? track.id.trim() : "";
            if (!track || id !== query.track || !Array.isArray(track.steps)) continue;
            if (query.step < 0 || query.step >= track.steps.length) return null;
            var step = track.steps[query.step];
            if (!step || typeof step !== "object") return null;
            return step;
        }
        return null;
    }

    function formulaeOf(raw) {
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

    function applyTheme(href) {
        var neuro = typeof href === "string" && href.indexOf("neuroscience/") === 0;
        var theme = document.getElementById("connection-theme");
        if (neuro && theme) theme.href = "../assets/neuroscience-demo-theme.css";
        if (document.documentElement.classList.contains("viz-embedded")) {
            document.documentElement.classList.toggle("connection-sheet", !neuro);
        }
    }

    function connectionTitleOf(raw) {
        if (typeof raw !== "string") return "";
        var title = raw.trim().replace(/\s+/g, " ");
        if (!title || title.length > 80) return "";
        if (/^[\s\-—–·.:]*connection[\s\-—–·.]*$/i.test(title)) return "";
        return title;
    }

    function proseOf(raw, limit) {
        if (typeof raw !== "string") return "";
        var text = raw.trim();
        if (text.length > limit) text = text.slice(0, limit);
        return text;
    }

    function isSubscriptChar(ch) {
        if (ch === "×") return true;
        var code = ch.charCodeAt(0);
        if (code >= 48 && code <= 57) return true;
        if (code >= 65 && code <= 90) return true;
        if (code >= 97 && code <= 122) return true;
        if (code >= 0x00C0 && code <= 0x024F) return true;
        if (code >= 0x0370 && code <= 0x03FF) return true;
        return false;
    }

    function isSuperscriptChar(ch) {
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

    function readSubscript(text, start) {
        var i = start;
        var saw = false;
        while (i < text.length) {
            var ch = text.charAt(i);
            if (ch === "(") {
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
            if (!isSubscriptChar(ch)) break;
            i += 1;
            saw = true;
        }
        if (!saw) return null;
        return { body: text.slice(start, i), next: i };
    }

    function readSuperscript(text, start) {
        var i = start;
        while (i < text.length && isSuperscriptChar(text.charAt(i))) i += 1;
        if (i === start) return null;
        return { body: text.slice(start, i), next: i };
    }

    /* Plain text only. sub and sup are created here; their contents are
     * text nodes, never parsed as markup. */
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
            else if (kind === "sub") marked = readSubscript(text, at + 1);
            else marked = readSuperscript(text, at + 1);
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
        var node = el(tag, className);
        appendNotation(node, text);
        return node;
    }

    function render(step) {
        var heading = connectionTitleOf(step.connectionTitle);
        var note = proseOf(step.note, 4000);
        var demo = proseOf(step.demoDescription, 500);
        var image = safeImagePath(step.image);
        var imageAlt = typeof step.imageAlt === "string" ? step.imageAlt.trim() : "";
        if (!image || !imageAlt) {
            image = "";
            imageAlt = "";
        }
        var formulae = formulaeOf(step.formulae);
        if (!heading && !note && !demo && !image && !formulae.length) {
            showStatus("This page was not found.");
            return;
        }
        applyTheme(step.href);
        document.title = (heading ? heading + " - " : "") + "Project Viz";
        clear(root);
        if (heading) {
            var header = el("header", "demo-header");
            header.appendChild(el("h1", null, heading));
            root.appendChild(header);
        }
        var lead = el("div", "connection-lead");
        if (note) lead.appendChild(prose("p", "connection-note", note));
        if (formulae.length) {
            var points = el("h2", "connection-key-points", "Key points");
            points.id = "connection-key-points";
            var list = el("ul", "connection-formulae");
            list.setAttribute("aria-labelledby", "connection-key-points");
            formulae.forEach(function (formula) {
                list.appendChild(prose("li", null, formula));
            });
            lead.appendChild(points);
            lead.appendChild(list);
        }
        if (lead.childNodes.length) root.appendChild(lead);
        if (image) {
            var figure = el("figure", "connection-figure");
            var img = document.createElement("img");
            img.alt = imageAlt;
            img.src = new URL("../" + image, window.location.href).href;
            img.addEventListener("load", revealFigure);
            figure.appendChild(img);
            root.appendChild(figure);
        }
        if (demo) {
            var nextDemo = el("h2", "connection-next-demo", "In the next demo");
            nextDemo.id = "connection-next-demo";
            root.appendChild(nextDemo);
            root.appendChild(prose("p", "connection-demo", demo));
        }
    }

    function fullyVisible(node, view) {
        var box = node.getBoundingClientRect();
        return box.height > 0 && box.top >= -1 && box.bottom <= view + 1;
    }

    function revealFigure() {
        if (!document.documentElement.classList.contains("viz-embedded")) return;
        var img = root.querySelector(".connection-figure img");
        if (!img || !img.scrollIntoView) return;
        var view = window.innerHeight || document.documentElement.clientHeight || 0;
        if (!view) return;
        var tail = root.querySelector(".connection-demo");
        if (tail && tail.scrollIntoView) {
            if (fullyVisible(img, view) && fullyVisible(tail, view)) return;
            tail.scrollIntoView({ block: "end", inline: "nearest" });
            if (!fullyVisible(img, view)) {
                img.scrollIntoView({ block: "nearest", inline: "nearest" });
            }
            return;
        }
        if (img.getBoundingClientRect().height <= view * 0.45) return;
        img.scrollIntoView({ block: "end", inline: "nearest" });
    }

    function jsonUrl() {
        var url = new URL("../tracks.json", window.location.href);
        url.search = "";
        url.hash = "";
        return url.href;
    }

    var query = readQuery();
    if (!query) {
        showStatus("This page was not found.");
        return;
    }

    fetch(jsonUrl()).then(function (response) {
        if (!response.ok) throw new Error("tracks");
        return response.json();
    }).then(function (data) {
        var step = findStep(data, query);
        if (!step) {
            showStatus("This page was not found.");
            return;
        }
        render(step);
    }).catch(function () {
        showStatus("This page could not be loaded.");
    });
})();
