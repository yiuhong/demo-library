/*
 * Renders one Guided Tracks connection from tracks.json.
 * Address: tracks/connection.html?track=<id>&step=<index>
 * step= is the zero-based index of the demonstration this page introduces.
 * The heading is that step's connectionTitle. The note, formulae, and
 * figure stay in tracks.json.
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
    }

    function connectionTitleOf(raw) {
        if (typeof raw !== "string") return "";
        var title = raw.trim().replace(/\s+/g, " ");
        if (!title || title.length > 80) return "";
        if (/^[\s\-—–·.:]*connection[\s\-—–·.]*$/i.test(title)) return "";
        return title;
    }

    function render(step) {
        var heading = connectionTitleOf(step.connectionTitle);
        var note = typeof step.note === "string" ? step.note.trim() : "";
        if (note.length > 4000) note = note.slice(0, 4000);
        var image = safeImagePath(step.image);
        var imageAlt = typeof step.imageAlt === "string" ? step.imageAlt.trim() : "";
        if (!image || !imageAlt) {
            image = "";
            imageAlt = "";
        }
        var formulae = formulaeOf(step.formulae);
        if (!heading && !note && !image && !formulae.length) {
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
        if (note) root.appendChild(el("p", "connection-note", note));
        if (formulae.length) {
            var list = el("ul", "connection-formulae");
            list.setAttribute("aria-label", "Formulae");
            formulae.forEach(function (formula) {
                list.appendChild(el("li", null, formula));
            });
            root.appendChild(list);
        }
        if (image) {
            var figure = el("figure", "connection-figure");
            var img = document.createElement("img");
            img.alt = imageAlt;
            img.src = new URL("../" + image, window.location.href).href;
            img.addEventListener("load", revealFigure);
            figure.appendChild(img);
            root.appendChild(figure);
        }
    }

    function revealFigure() {
        if (!document.documentElement.classList.contains("viz-embedded")) return;
        var img = root.querySelector(".connection-figure img");
        if (!img || !img.scrollIntoView) return;
        var view = window.innerHeight || document.documentElement.clientHeight || 0;
        if (!view || img.getBoundingClientRect().height <= view * 0.45) return;
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
