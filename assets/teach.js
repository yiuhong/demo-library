/*
 * Teach and Learn. One site-wide choice. Visibility only.
 *
 * Teach is the quieter class view: html gets class viz-teach.
 * Learn is the full page, and it is the default.
 *
 * A blocking load from <head> sets that class before the body is
 * parsed, so the long notes do not flash on.
 *   ?teach=1   Teach
 *   ?learn=1   Learn
 *   ?teach=0   Learn
 *   ?learn=0   Teach
 * The same tokens notebook.js accepts (on/off, true/false) work too.
 * When both flags are present, the later one wins.
 * The choice is stored on this origin under the key viz-teach
 * ("1" Teach, "0" Learn), so Catalog, Guided Tracks, and a
 * demonstration opened on its own share it. Another open page hears
 * the storage event and follows without a reload. This file does not
 * recompute a result, rewrite teaching text, or reset a simulation.
 *
 * The shell control is #viz-teach. On a demonstration, the same
 * Teach / Learn pair is inserted next to .demo-back. assets/teach.css
 * hides that in-page control when html has viz-embedded.
 */
(function () {
    if (window.__vizTeachBoot) return;
    window.__vizTeachBoot = true;

    var KEY = "viz-teach";
    var root = document.documentElement;

    function parseFlag(value) {
        if (value == null) return null;
        var flag = String(value).replace(/\s+/g, "").toLowerCase();
        if (flag === "1" || flag === "on" || flag === "true") return true;
        if (flag === "0" || flag === "off" || flag === "false") return false;
        return null;
    }

    function choiceFromSearch(search) {
        var params;
        try {
            params = new URLSearchParams(search);
        } catch (err) {
            return null;
        }
        var choice = null;
        params.forEach(function (value, key) {
            var flag = parseFlag(value);
            if (flag === null) return;
            if (key === "teach") choice = flag;
            else if (key === "learn") choice = !flag;
        });
        return choice;
    }

    function readStored() {
        try {
            return parseFlag(localStorage.getItem(KEY));
        } catch (err) {
            return null;
        }
    }

    function writeStored(teachOn) {
        try {
            localStorage.setItem(KEY, teachOn ? "1" : "0");
        } catch (err) {}
    }

    function teachOn() {
        return root.classList.contains("viz-teach");
    }

    function syncButtons() {
        var on = teachOn();
        var buttons = document.querySelectorAll("[data-viz-teach-choice]");
        var i, selected;
        for (i = 0; i < buttons.length; i++) {
            selected = (buttons[i].getAttribute("data-viz-teach-choice") === "teach") === on;
            buttons[i].setAttribute("aria-checked", selected ? "true" : "false");
            buttons[i].tabIndex = selected ? 0 : -1;
        }
    }

    function apply(on, persist) {
        root.classList.toggle("viz-teach", !!on);
        if (persist) writeStored(!!on);
        syncButtons();
    }

    var fromUrl = choiceFromSearch(window.location.search);
    if (fromUrl !== null) apply(fromUrl, true);
    else apply(readStored() === true, false);

    window.addEventListener("storage", function (event) {
        if (!event || event.key !== KEY) return;
        var next = parseFlag(event.newValue);
        apply(next === true, false);
    });

    function onArrows(event) {
        var forward = event.key === "ArrowRight" || event.key === "ArrowDown";
        var back = event.key === "ArrowLeft" || event.key === "ArrowUp";
        if (!forward && !back) return;
        var buttons = event.currentTarget.querySelectorAll("[data-viz-teach-choice]");
        if (!buttons.length) return;
        event.preventDefault();
        var want = teachOn() ? "teach" : "learn";
        var current = 0;
        var i;
        for (i = 0; i < buttons.length; i++) {
            if (buttons[i].getAttribute("data-viz-teach-choice") === want) current = i;
        }
        var next = forward
            ? (current + 1) % buttons.length
            : (current - 1 + buttons.length) % buttons.length;
        apply(buttons[next].getAttribute("data-viz-teach-choice") === "teach", true);
        buttons[next].focus();
    }

    function wire(button) {
        if (!button || button.getAttribute("data-viz-teach-wired") === "1") return;
        button.setAttribute("data-viz-teach-wired", "1");
        if (!button.getAttribute("role")) button.setAttribute("role", "radio");
        button.addEventListener("click", function () {
            apply(button.getAttribute("data-viz-teach-choice") === "teach", true);
        });
        var group = button.closest ? button.closest("[role='radiogroup']") : null;
        if (group && group.getAttribute("data-viz-teach-group") !== "1") {
            group.setAttribute("data-viz-teach-group", "1");
            group.addEventListener("keydown", onArrows);
        }
    }

    function makeChoice(choice, label) {
        var button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "radio");
        button.setAttribute("data-viz-teach-choice", choice);
        button.textContent = label;
        return button;
    }

    function makeSwitch() {
        var group = document.createElement("div");
        group.className = "viz-mode-switch demo-teach";
        group.setAttribute("role", "radiogroup");
        group.setAttribute("aria-label", "Teach or Learn");
        group.appendChild(makeChoice("teach", "Teach"));
        group.appendChild(makeChoice("learn", "Learn"));
        return group;
    }

    function mountPageControl() {
        var placed = false;
        var bars = document.querySelectorAll(".demo-topbar");
        var i, bar, group, back;
        for (i = 0; i < bars.length; i++) {
            bar = bars[i];
            if (bar.querySelector("[data-viz-teach-choice]")) {
                placed = true;
                continue;
            }
            group = makeSwitch();
            back = bar.querySelector(".demo-back");
            if (back) back.insertAdjacentElement("afterend", group);
            else bar.insertBefore(group, bar.firstChild);
            wire(group.querySelector("[data-viz-teach-choice='teach']"));
            wire(group.querySelector("[data-viz-teach-choice='learn']"));
            placed = true;
        }
        if (placed) return;
        var links = document.querySelectorAll("a.demo-back");
        for (i = 0; i < links.length; i++) {
            if (links[i].parentNode && links[i].parentNode.querySelector("[data-viz-teach-choice]")) continue;
            group = makeSwitch();
            links[i].insertAdjacentElement("afterend", group);
            wire(group.querySelector("[data-viz-teach-choice='teach']"));
            wire(group.querySelector("[data-viz-teach-choice='learn']"));
        }
    }

    function mount() {
        var nodes = document.querySelectorAll("[data-viz-teach-choice]");
        var i;
        for (i = 0; i < nodes.length; i++) wire(nodes[i]);
        mountPageControl();
        syncButtons();
    }

    window.ProjectVizTeach = {
        key: KEY,
        isOn: teachOn,
        set: function (on) {
            apply(!!on, true);
        }
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
    else mount();
})();
