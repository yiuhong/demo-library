#!/usr/bin/env python3
"""Lock the fullscreen scroll fix.

Fullscreen stays the browser Fullscreen API on #viz-pane. While that
pane is fullscreen it has to be the scrollport, because a vertical
swipe on a fullscreen element that does not overflow is taken by the
browser. The script checks the source, not a device:

* requestFullscreen is still how Catalog and Guided Tracks enter
* document.exitFullscreen() is only reached from setExpanded(false)
  and from the narrow-phone / closed-demo guard in syncExpanded
* the scroll sync does not call exitFullscreen or setExpanded
* shell.js has no touch, wheel, or scroll listener
* a rejected fullscreen request does not turn on is-expanded by itself
* both fullscreen pseudos scroll and contain overscroll, and the chrome
  stays sticky so Exit does not scroll away
* the enter control stays hidden under 480px
* phone and coarse-pointer range targets stay 44px with
  touch-action: pan-y pinch-zoom

Run from any directory:

    python3 scripts/check_fullscreen_scroll.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def grab(text: str, start: str, end: str) -> str:
    at = text.find(start)
    if at < 0:
        return ""
    stop = text.find(end, at + len(start))
    if stop < 0:
        return ""
    return text[at:stop]


def main() -> int:
    problems: list[str] = []
    shell_js = read("assets/shell.js")
    shell_css = read("assets/shell.css")
    stats = read("assets/stats-demo-theme.css")
    neuro = read("assets/neuroscience-demo-theme.css")
    notebook = read("assets/notebook.css")

    if "requestFullscreen(fullscreenHost())" not in shell_js:
        problems.append("shell.js: fullscreen must still request the browser API on the pane")
    if 'return document.getElementById("viz-pane")' not in shell_js:
        problems.append("shell.js: fullscreen host must stay #viz-pane")
    if "applyExpanded(!!activeFullscreen())" not in shell_js:
        problems.append("shell.js: a rejected fullscreen request must not force is-expanded")

    scroll_fn = grab(shell_js, "function syncFullscreenScroll()", "function applyExpanded(")
    if not scroll_fn:
        problems.append("shell.js: syncFullscreenScroll is missing")
    else:
        if "exitFullscreen" in scroll_fn or "setExpanded" in scroll_fn:
            problems.append("shell.js: scroll sync must not leave fullscreen")
        if "pane.clientHeight" not in scroll_fn and "paneFillHeight" not in scroll_fn:
            problems.append("shell.js: measure the demonstration at the pane height")
        if "fsCommitted" not in scroll_fn:
            problems.append("shell.js: do not chase scrollHeight after the iframe is the measured content height")

    for name in ("touchstart", "touchmove", "touchend", "touchcancel", "wheel"):
        if re.search(r"addEventListener\(\s*['\"]" + name, shell_js):
            problems.append(f"shell.js: no {name} listener (a swipe must stay a scroll)")

    calls = [
        line.strip()
        for line in shell_js.splitlines()
        if "exitFullscreen()" in line and "function exitFullscreen" not in line and "document.exitFullscreen" not in line
    ]
    if calls != [
        "exitFullscreen().catch(function () {});",
        "exitFullscreen().catch(function () {});",
    ]:
        problems.append(
            "shell.js: exitFullscreen() may only run from setExpanded(false) "
            "and the narrow-phone / closed-demo guard, not from a scroll. Found: "
            + repr(calls)
        )

    for pseudo in (":fullscreen", ":-webkit-full-screen"):
        block = grab(shell_css, ".viz-pane" + pseudo + " {", "}")
        if "overflow: auto;" not in block or "overscroll-behavior: contain;" not in block:
            problems.append(f"shell.css: {pseudo} pane must scroll and contain overscroll")
        stage = grab(shell_css, ".viz-pane" + pseudo + " .viz-pane-stage {", "}")
        if "flex: 1 0 auto;" not in stage:
            problems.append(f"shell.css: {pseudo} stage must keep its content height")
        frame = grab(shell_css, ".viz-pane" + pseudo + " .viz-pane-stage iframe {", "}")
        if "position: relative;" not in frame:
            problems.append(f"shell.css: {pseudo} iframe must be in normal flow")
        chrome = grab(shell_css, ".viz-pane" + pseudo + " .viz-pane-chrome", "}")
        if "position: sticky;" not in chrome:
            problems.append(f"shell.css: {pseudo} chrome must stay on screen while the pane scrolls")

    if re.search(r"\.viz-pane:fullscreen[\s\S]{0,400}touch-action\s*:", shell_css):
        problems.append("shell.css: do not set touch-action on the fullscreen pane")

    narrow = grab(shell_css, "@media screen and (max-width: 479px) {", "}")
    if "#viz-fullscreen" not in narrow:
        problems.append("shell.css: the enter control stays hidden under 480px")
    if "#viz-exit" in narrow:
        problems.append("shell.css: Exit stays available while fullscreen is on at a narrow width")

    if ".viz-rail" not in shell_css or "overscroll-behavior: contain;" not in shell_css:
        problems.append("shell.css: the rail keeps overscroll-behavior: contain")

    for label, text in (("stats-demo-theme.css", stats), ("neuroscience-demo-theme.css", neuro)):
        if "height: 44px;" not in text:
            problems.append(f"{label}: phone range target must stay 44px")
        if "touch-action: pan-y pinch-zoom;" not in text:
            problems.append(f"{label}: range touch-action must stay pan-y pinch-zoom")

    if "position: relative;" not in grab(notebook, "html.viz-notebook body.viz-app .viz-pane-chrome {", "}"):
        problems.append("notebook.css: the pane bar's tick positioning is unchanged")
    if "var(--notebook-paper)" not in notebook:
        problems.append("notebook.css: fullscreen chrome keeps the notebook paper")

    if problems:
        for item in problems:
            print(item)
        return 1
    print("Fullscreen scroll checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
