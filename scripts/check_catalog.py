#!/usr/bin/env python3
"""Check that catalog and Guided Track links point at files in this repo.

Reads ``demos.json``, ``tracks.json``, and ``families.json`` at the repo root:

* each demo has a non-empty title and href, and that href is a file in the repo
* each track step has a non-empty title and href, and that href is a file in the repo
* each track step with a note, formulae, or image has a short connectionTitle that is not the word Connection
* each track step image, when set, is a file in the repo
* each concept map names catalog demos by href (titles stay in demos.json), in before / backbone / after order, and opts into the tracks page (hub) or a real catalog section
* LICENSE states CC BY 4.0 for content and MIT for code, and LICENSE-CODE is the MIT text
* index.html, catalog.html, tracks.html, cite.html, license.html, and each demo carry the site chrome, those five pages use the shared horizontal top bar, those five pages do not credit HTML5 UP, and no HTML page says "All rights reserved"
* the cite page has cite, license, reuse, credit, accessibility, and report sections, an ORCID link, and a per-demo example whose title matches demos.json
* CITATION.cff matches the current version, and the cite page links the machine-readable citation
* CHANGELOG.md and CONTRIBUTING.md are present, and the changelog names the current version

Prints one line per problem and exits 1 when something is wrong. Exits 0 when
every checked title and path is in place. GitHub Actions runs this on pull
requests and on pushes to ``main``.

Run from any directory:

    python3 scripts/check_catalog.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEMOS_PATH = ROOT / "demos.json"
TRACKS_PATH = ROOT / "tracks.json"
FAMILIES_PATH = ROOT / "families.json"
ORCID_URL = "https://orcid.org/0000-0003-4436-0166"
ORCID_LABEL = "ORCID iD 0000-0003-4436-0166"
DEMO_CITE_HREF = "statistics/central_limit_theorem.html"
CITATION_TITLE = "Project Viz: A visualization demo library for teaching"


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if args:
        print("Usage: python3 scripts/check_catalog.py", file=sys.stderr)
        return 2

    problems: list[str] = []

    demos, error = load_json(DEMOS_PATH)
    demo_count = 0
    demo_hrefs: list[str] = []
    catalog = None if error else demos
    if error:
        problems.append(error)
    else:
        demo_count = check_demos(demos, problems, demo_hrefs)

    check_site_chrome(problems, demo_hrefs, catalog)

    tracks, error = load_json(TRACKS_PATH)
    step_count = 0
    image_count = 0
    if error:
        problems.append(error)
    else:
        step_count, image_count = check_tracks(tracks, problems)
        check_topics(tracks, problems)

    families, error = load_json(FAMILIES_PATH)
    family_count = 0
    if error:
        problems.append(error)
    else:
        family_count = check_families(
            families,
            problems,
            set(demo_hrefs),
            catalog_anchors(catalog),
        )
    check_map_page(problems)

    if problems:
        noun = "problem" if len(problems) == 1 else "problems"
        print(f"Catalog link check failed ({len(problems)} {noun}):")
        for problem in problems:
            print(f"- {problem}")
        return 1

    print(
        "Catalog link check passed: "
        f"{_count(demo_count, 'demo')}, "
        f"{_count(step_count, 'step')}, "
        f"{_count(image_count, 'image')}, "
        f"{_count(family_count, 'concept map', 'concept maps')}. "
        "Site chrome checked."
    )
    return 0


def load_json(path: Path) -> tuple[object | None, str | None]:
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return None, f"{path.name}: file not found"
    except OSError as exc:
        return None, f"{path.name}: {exc}"
    try:
        return json.loads(text), None
    except json.JSONDecodeError as exc:
        return None, f"{path.name}: invalid JSON ({exc})"


def check_demos(data: object, problems: list[str], hrefs: list[str]) -> int:
    if not isinstance(data, dict) or not isinstance(data.get("categories"), list):
        problems.append("demos.json: expected an object with a categories array")
        return 0

    count = 0
    categories = data["categories"]
    for category_index, category in enumerate(categories, start=1):
        if not isinstance(category, dict):
            problems.append(f"demos.json: category {category_index} is not an object")
            continue
        category_name = (
            label(category.get("title"))
            or label(category.get("id"))
            or f"category {category_index}"
        )
        subcategories = category.get("subcategories")
        if not isinstance(subcategories, list):
            problems.append(f"demos.json: {category_name}: subcategories array is missing")
            continue
        for sub_index, subcategory in enumerate(subcategories, start=1):
            if not isinstance(subcategory, dict):
                problems.append(
                    f"demos.json: {category_name}: subcategory {sub_index} is not an object"
                )
                continue
            sub_name = label(subcategory.get("title")) or f"subcategory {sub_index}"
            demos = subcategory.get("demos")
            place = f"demos.json: {category_name} / {sub_name}"
            if not isinstance(demos, list):
                problems.append(f"{place}: demos array is missing")
                continue
            for demo_index, demo in enumerate(demos, start=1):
                count += 1
                if not isinstance(demo, dict):
                    problems.append(f"{place}: demo {demo_index} is not an object")
                    continue
                title = label(demo.get("title"))
                if title is None:
                    problems.append(f"{place}: demo {demo_index}: title is missing or empty")
                    demo_name = f"demo {demo_index}"
                else:
                    demo_name = f"demo {title!r}"
                href = demo.get("href")
                if blank(href):
                    problems.append(f"{place}: {demo_name}: href is missing or empty")
                    continue
                assert isinstance(href, str)
                reason = file_problem(href)
                if reason:
                    problems.append(f"{place}: {demo_name}: href {href!r} {reason}")
                else:
                    hrefs.append(href)
    return count


def check_tracks(data: object, problems: list[str]) -> tuple[int, int]:
    tracks = track_entries(data)
    if tracks is None:
        problems.append(
            'tracks.json: expected a tracks array or an object with a "tracks" array'
        )
        return 0, 0

    step_count = 0
    image_count = 0
    for track_index, track in enumerate(tracks, start=1):
        if not isinstance(track, dict):
            problems.append(f"tracks.json: track {track_index} is not an object")
            continue
        track_name = (
            label(track.get("id"))
            or label(track.get("title"))
            or f"track {track_index}"
        )
        steps = track.get("steps")
        if not isinstance(steps, list):
            problems.append(f"tracks.json: track {track_name!r}: steps array is missing")
            continue
        for step_index, step in enumerate(steps, start=1):
            step_count += 1
            if not isinstance(step, dict):
                problems.append(
                    f"tracks.json: track {track_name!r}: step {step_index} is not an object"
                )
                continue
            title = label(step.get("title"))
            if title is None:
                step_name = f"step {step_index}"
                problems.append(
                    f"tracks.json: track {track_name!r}: {step_name}: title is missing or empty"
                )
            else:
                step_name = f"step {step_index} {title!r}"
            place = f"tracks.json: track {track_name!r}: {step_name}"
            href = step.get("href")
            if blank(href):
                problems.append(f"{place}: href is missing or empty")
            else:
                assert isinstance(href, str)
                reason = file_problem(href)
                if reason:
                    problems.append(f"{place}: href {href!r} {reason}")
            check_connection_title(step, place, problems)
            if "image" not in step or step["image"] is None:
                continue
            image_count += 1
            image = step["image"]
            if blank(image):
                problems.append(f"{place}: image is missing or empty")
                continue
            assert isinstance(image, str)
            reason = file_problem(image)
            if reason:
                problems.append(f"{place}: image {image!r} {reason}")
    return step_count, image_count


CONNECTION_LABEL = re.compile(
    r"^[\s\-—–·.:]*connection[\s\-—–·.]*$",
    re.IGNORECASE,
)


def step_has_connection(step: dict) -> bool:
    if label(step.get("note")):
        return True
    formulae = step.get("formulae")
    if isinstance(formulae, list) and any(label(item) for item in formulae):
        return True
    image = step.get("image")
    return isinstance(image, str) and bool(image.strip())


def connection_title_problem(value: object) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return "connectionTitle is missing or empty"
    title = value.strip()
    if len(title) > 80:
        return "connectionTitle is longer than 80 characters"
    if CONNECTION_LABEL.fullmatch(title):
        return "connectionTitle must name the idea, not the word Connection"
    if not re.search(r"[A-Za-z]", title):
        return "connectionTitle needs words"
    return None


def check_connection_title(step: dict, place: str, problems: list[str]) -> None:
    has_content = step_has_connection(step)
    if "connectionTitle" not in step:
        if has_content:
            problems.append(f"{place}: connectionTitle is missing")
        return
    problem = connection_title_problem(step.get("connectionTitle"))
    if problem:
        problems.append(f"{place}: {problem}")
    elif not has_content:
        problems.append(
            f"{place}: connectionTitle is set but this step has no note, formulae, or image"
        )


def check_topics(data: object, problems: list[str]) -> None:
    """Topics are optional. When present, every track id belongs to one topic."""
    if not isinstance(data, dict) or "topics" not in data:
        return
    topics = data.get("topics")
    if not isinstance(topics, list):
        problems.append('tracks.json: "topics" must be an array')
        return
    track_ids: list[str] = []
    for track in track_entries(data) or []:
        if isinstance(track, dict):
            ident = safe_slug(track.get("id"))
            if ident:
                track_ids.append(ident)
    known = set(track_ids)
    seen_topics: set[str] = set()
    seen_tracks: set[str] = set()
    for index, topic in enumerate(topics, start=1):
        if not isinstance(topic, dict):
            problems.append(f"tracks.json: topic {index} is not an object")
            continue
        extra = sorted(set(topic) - {"id", "title", "tracks"})
        ident = safe_slug(topic.get("id"))
        name = ident or f"topic {index}"
        place = f"tracks.json: topic {name!r}"
        if extra:
            problems.append(f"{place}: unexpected fields {extra}")
        if not ident:
            problems.append(f"{place}: id must be a lowercase slug")
        elif ident in seen_topics:
            problems.append(f"{place}: duplicate id")
        else:
            seen_topics.add(ident)
        title = label(topic.get("title"))
        if title is None or len(title) > 80:
            problems.append(f"{place}: title is missing, empty, or longer than 80 characters")
        children = topic.get("tracks")
        if not isinstance(children, list) or not children:
            problems.append(f"{place}: tracks must list at least one track id")
            continue
        for child_index, child in enumerate(children, start=1):
            child_id = safe_slug(child)
            if not child_id or child_id not in known:
                problems.append(f"{place}: track {child_index} {child!r} is not a track id")
                continue
            if child_id in seen_tracks:
                problems.append(f"{place}: track {child_id!r} is listed in more than one topic")
            else:
                seen_tracks.add(child_id)
    missing = [ident for ident in track_ids if ident not in seen_tracks]
    if topics and missing:
        problems.append("tracks.json: tracks missing from topics: " + ", ".join(missing))


def track_entries(data: object) -> list[object] | None:
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("tracks"), list):
        return data["tracks"]
    return None


def file_problem(raw: str) -> str | None:
    """Return why ``raw`` is not a file inside the repo, or None when it is."""
    if not is_repo_relative(raw):
        return "is not a path inside the repo"
    candidate = (ROOT / raw).resolve()
    if not candidate.is_relative_to(ROOT):
        return "is not a path inside the repo"
    if candidate.is_file():
        return None
    if candidate.exists():
        return "is not a file"
    return "does not exist"


def is_repo_relative(raw: str) -> bool:
    if any(char in raw for char in ("\\", "\n", "\r", "\x00")):
        return False
    if "://" in raw or raw.startswith("//"):
        return False
    head = raw.split("/", 1)[0]
    if ":" in head:
        return False
    path = Path(raw)
    if path.is_absolute() or any(part == ".." for part in path.parts):
        return False
    return True


def check_site_chrome(problems: list[str], demo_hrefs: list[str], catalog: object | None) -> None:
    meta_path = ROOT / "assets" / "site-meta.js"
    meta = read_text(meta_path)
    if meta is None:
        problems.append("assets/site-meta.js: file not found")
        version = updated = updated_display = None
    else:
        version = js_string(meta, "version")
        updated = js_string(meta, "updated")
        updated_display = js_string(meta, "updatedDisplay")
        orcid = js_string(meta, "orcid")
        if not version or not updated or not updated_display:
            problems.append(
                "assets/site-meta.js: version, updated, and updatedDisplay are required"
            )
        if orcid != ORCID_URL:
            problems.append("assets/site-meta.js: ORCID URL is missing or unexpected")
        if "meta.demoCitation = function" not in meta:
            problems.append("assets/site-meta.js: demoCitation helper is missing")
        if js_string(meta, "title") != CITATION_TITLE or js_string(meta, "titleApa") != CITATION_TITLE:
            problems.append(
                "assets/site-meta.js: title and titleApa must be the formal citation title"
            )

    footer_js = read_text(ROOT / "assets" / "site-oer-footer.js")
    if footer_js is None:
        problems.append("assets/site-oer-footer.js: file not found")
    else:
        for needle in (
            "Cite this demo",
            "personalSite",
            'target = "_blank"',
            "noopener noreferrer",
            "cite.html?demo=",
        ):
            if needle not in footer_js:
                problems.append(f"assets/site-oer-footer.js: missing {needle}")
        for banned in (
            "license.html",
            "Cite & reuse",
            "contentLicense",
            "LICENSE-CODE",
            "creativecommons.org",
            "Spotted a mistake",
            "View source",
            "meta.orcid",
        ):
            if banned in footer_js:
                problems.append(
                    f"assets/site-oer-footer.js: in-demo strip should not include {banned}"
                )
        if "project-viz-opened" in footer_js or "localStorage" in footer_js:
            problems.append("assets/site-oer-footer.js: do not store which demos were opened")
    cite_js = read_text(ROOT / "assets" / "cite-page.js")
    if cite_js is None or '.get("demo")' not in cite_js:
        problems.append("assets/cite-page.js: per-demo cite query is missing")

    if (ROOT / "assets" / "opened.js").exists():
        problems.append("assets/opened.js: home no longer marks opened demos")
    home_js = read_text(ROOT / "assets" / "home.js")
    if home_js is None:
        problems.append("assets/home.js: file not found")
    elif any(
        needle in home_js
        for needle in ("ProjectVizOpened", "project-viz-opened", "hub-opened", "is-opened")
    ):
        problems.append("assets/home.js: do not mark an opened demo")
    home_css = read_text(ROOT / "assets" / "home.css")
    if home_css is None:
        problems.append("assets/home.css: file not found")
    elif any(needle in home_css for needle in ("home-fig", "home-plate-index", "hub-opened")):
        problems.append("assets/home.css: do not style figure captions or an opened label")

    maps_js = read_text(ROOT / "assets" / "concept-maps.js")
    tracks_js = read_text(ROOT / "assets" / "tracks-page.js")
    if maps_js is None:
        problems.append("assets/concept-maps.js: file not found")
    else:
        for needle in (
            'return "Before"',
            'return "Backbone"',
            'return "After"',
            "backboneLabel",
        ):
            if needle in maps_js:
                problems.append(f"assets/concept-maps.js: do not show relation labels ({needle})")
    if tracks_js and "backboneLabel" in tracks_js:
        problems.append("assets/tracks-page.js: do not show a Backbone label")
    if tracks_js and "ProjectVizOpened" in tracks_js:
        problems.append("assets/tracks-page.js: do not mark opened boxes")

    for name in ("index.html", "catalog.html", "tracks.html", "cite.html", "license.html"):
        text = read_text(ROOT / name)
        if text is None:
            problems.append(f"{name}: file not found")
            continue
        required = [
            "assets/site-meta.js",
            "assets/site-oer-footer.js",
            "CC BY 4.0",
            "Cite & reuse",
            "Spotted a mistake?",
            "https://github.com/yiuhong/demo-library/issues",
            "https://github.com/yiuhong/demo-library",
            "mailto:yiuhong.ko@gmail.com",
            "https://yiuhong.github.io/",
            "About Yiu Hong",
            "Catalog",
            "Guided Tracks",
            "tracks.html",
            ORCID_URL,
            ORCID_LABEL,
            "CHANGELOG.md",
            "CONTRIBUTING.md",
            "license.html",
        ]
        if version:
            required.append(version)
        if updated:
            required.append(updated)
        if updated_display:
            required.append(updated_display)
        if name == "cite.html":
            required.extend(
                (
                    "BibTeX",
                    "ko2026teachingmaterials",
                    "LICENSE-CODE",
                    'id="cite"',
                    'id="license"',
                    'id="reuse"',
                    'id="credit"',
                    'id="report"',
                    'id="about"',
                    'id="contribute"',
                    "What you may do",
                    "What is not OK",
                    "iframe",
                    "Copy APA",
                    "Copy BibTeX",
                    "Copy credit line",
                    DEMO_CITE_HREF,
                    f"https://yiuhong.github.io/demo-library/{DEMO_CITE_HREF}",
                    "CITATION.cff",
                    "Machine-readable citation",
                    'id="citation-cff"',
                    'id="accessibility"',
                    "keyboard",
                    "contrast",
                )
            )
            lowered = text.lower()
            if "wcag" in lowered or "conforms to" in lowered:
                problems.append(f"{name}: do not claim a conformance standard")
        if name == "license.html":
            for needle in ("LICENSE-CODE", "cite.html"):
                if needle not in text:
                    problems.append(f"{name}: missing {needle}")
        for banned in ("HTML5 UP", "html5up.net", "Hyperspace"):
            if banned in text:
                problems.append(f"{name}: do not credit {banned}")
        for banned_src in (
            "yiuhong.github.io/assets/css/",
            "yiuhong.github.io/assets/js/",
        ):
            if banned_src in text:
                problems.append(
                    f"{name}: do not load a personal-site stylesheet or script ({banned_src})"
                )
        if "assets/foundation.css" not in text:
            problems.append(f"{name}: missing the local shell foundation")
        if name in ("index.html", "cite.html"):
            required.append(CITATION_TITLE)
        if name == "index.html":
            required.extend(
                (
                    'id="library-about"',
                    'id="library-preferred-cite"',
                    "Full cite",
                    "data-site-apa",
                    'id="hub-spine"',
                    'id="colophon"',
                    "Browse the catalog",
                    "catalog.html",
                    "Open the demo",
                )
            )
            for banned in (
                "FIG_VE",
                "FIG_R",
                "FIG_ERP",
                "home-fig",
                "home-plate-index",
                "Plate 1 of 3",
                "Plate 2 of 3",
                "Plate 3 of 3",
                "hub-opened",
                "assets/opened.js",
                ">Opened<",
            ):
                if banned in text:
                    problems.append(f"index.html: {banned} does not belong on the home plate")
            if "Choose a path" in text:
                problems.append("index.html: Choose a path does not belong on the home page")
            about = element_text(text, "library-about")
            if about is None:
                problems.append("index.html: library about blurb is missing")
            elif "A visualization demo library for teaching." not in about:
                problems.append("index.html: about blurb is not the Project Viz tagline")
        if name in ("index.html", "catalog.html", "tracks.html"):
            for banned in (
                'id="hub-progress"',
                "Saved in this browser",
                "No account",
            ):
                if banned in text:
                    problems.append(f"{name}: {banned} does not belong on the hub")
        if name == "tracks.html" and "backbone" in text.lower():
            problems.append("tracks.html: do not mention a backbone")
        if name == "catalog.html":
            for banned in (
                'id="catalog-sections"',
                'id="hub-path-mount"',
                "Jump to a section",
                "concept-maps.js",
                "assets/opened.js",
                "hub-opened",
                "Opened",
            ):
                if banned in text:
                    problems.append(f"catalog.html: {banned} does not belong on the catalog")
        for needle in required:
            if needle not in text:
                problems.append(f"{name}: missing {needle}")
        # The personal-site homepage menu stays on that site. These pages are the library.
        for needle in (
            "My projects",
            "Research & Publications",
            "Teaching & Mentorship",
            "resources_page.html",
            "yiuhong.github.io/#intro",
            "yiuhong.github.io/#projects",
        ):
            if needle in text:
                problems.append(f"{name}: personal-site menu item does not belong here ({needle})")
        if name in ("index.html", "catalog.html", "tracks.html"):
            for needle in ('class="viz-notebook"', "assets/notebook.css", "assets/notebook.js"):
                if needle not in text:
                    problems.append(f"{name}: missing the notebook sheet ({needle})")
        elif "viz-notebook" in text or "assets/notebook.css" in text or "assets/notebook.js" in text:
            problems.append(f"{name}: notebook sheet stays on Home, Catalog, and Guided Tracks")
        if 'class="viz-topbar"' not in text:
            problems.append(f"{name}: missing the shared horizontal top bar")
        for needle in ('id="sidebar"', "mobile-nav-toggle", 'id="site-nav"', "data-library-nav"):
            if needle in text:
                problems.append(f"{name}: old vertical menu does not belong here ({needle})")
        current = {
            "index.html": ">Home</a>",
            "catalog.html": ">Catalog</a>",
            "tracks.html": ">Guided Tracks</a>",
        }.get(name)
        current_count = text.count('aria-current="page"')
        if current is None:
            if current_count:
                problems.append(f"{name}: top bar has no current-page item")
        elif current_count != 1 or f'aria-current="page"{current}' not in text:
            problems.append(f"{name}: top bar should underline only the current page")
        if name in ("cite.html", "license.html"):
            for needle in ("cite-back", "← Project Viz"):
                if needle in text:
                    problems.append(f"{name}: back-to-hub button does not belong here ({needle})")

    shell_css = read_text(ROOT / "assets" / "shell.css")
    if shell_css is None:
        problems.append("assets/shell.css: file not found")
    else:
        if "nav a:not(.about-yiu)" not in shell_css:
            problems.append("assets/shell.css: About Yiu Hong must not take the text-link underline")
        if ".viz-topbar a.about-yiu" not in shell_css or "border: 1px solid #000000 !important;" not in shell_css:
            problems.append("assets/shell.css: About Yiu Hong chip needs a full border")
        if "is-opened" in shell_css:
            problems.append("assets/shell.css: do not style an opened box")

    notebook_css = read_text(ROOT / "assets" / "notebook.css")
    if notebook_css is None:
        problems.append("assets/notebook.css: file not found")
    else:
        if "html.viz-notebook" not in notebook_css:
            problems.append("assets/notebook.css: sheet must stay behind html.viz-notebook")
        if ".viz-pane-stage iframe" not in notebook_css:
            problems.append("assets/notebook.css: keep the plot well and iframe off the graph paper")
        if re.search(r"(^|[^\w-])canvas\s*[,.{]", notebook_css, re.I):
            problems.append("assets/notebook.css: do not style demonstration canvases")

    if catalog is not None:
        cite_text = read_text(ROOT / "cite.html")
        title = demo_title(catalog, DEMO_CITE_HREF)
        if cite_text is None:
            pass
        elif title is None:
            problems.append(f"cite.html: example {DEMO_CITE_HREF} is not in demos.json")
        elif title not in cite_text:
            problems.append(
                f"cite.html: per-demo example title {title!r} does not match demos.json"
            )

    check_citation_file(problems, version, updated)

    readme = read_text(ROOT / "README.md")
    if readme is None:
        problems.append("README.md: file not found")
    elif "CITATION.cff" not in readme or "machine-readable citation" not in readme.lower():
        problems.append("README.md: missing the machine-readable citation link")

    changelog = read_text(ROOT / "CHANGELOG.md")
    if changelog is None:
        problems.append("CHANGELOG.md: file not found")
    else:
        if "Keep a Changelog" not in changelog:
            problems.append("CHANGELOG.md: expected Keep a Changelog style")
        if "## [0.1.0]" not in changelog:
            problems.append("CHANGELOG.md: missing 0.1.0")
        if version and f"## [{version}]" not in changelog:
            problems.append(f"CHANGELOG.md: missing version {version}")

    contributing = read_text(ROOT / "CONTRIBUTING.md")
    if contributing is None:
        problems.append("CONTRIBUTING.md: file not found")
    elif "https://github.com/yiuhong/demo-library/issues" not in contributing:
        problems.append("CONTRIBUTING.md: missing the Issues link")

    for href in demo_hrefs:
        text = read_text(ROOT / href)
        if text is None:
            continue
        for needle in (
            "assets/site-meta.js",
            "assets/site-oer-footer.js",
            "assets/site-oer-footer.css",
        ):
            if needle not in text:
                problems.append(f"{href}: missing {needle}")
        if re.search(
            r"id=[\"'](?:fullscreen-btn|fullscreenBtn|btn-fullscreen|fullscreenToggleBtn)[\"']"
            r"|>\s*Fullscreen\s*<",
            text,
            re.IGNORECASE,
        ):
            problems.append(
                f"{href}: remove the demo Fullscreen control; the shell provides Fullscreen"
            )
        if re.search(
            r"""href=["'][^"']*(?:license\.html|cite\.html|LICENSE-CODE|creativecommons\.org)""",
            text,
        ):
            problems.append(
                f"{href}: remove in-demo license or site-wide cite links"
            )

    for path in sorted(ROOT.rglob("*.html")):
        text = read_text(path)
        if text is None:
            continue
        if "all rights reserved" in text.lower():
            problems.append(
                f'{path.relative_to(ROOT)}: still says "All rights reserved"'
            )
        rel = path.relative_to(ROOT).as_posix()
        if rel not in ("index.html", "catalog.html", "tracks.html") and (
            "viz-notebook" in text or "assets/notebook.css" in text or "assets/notebook.js" in text
        ):
            problems.append(f"{rel}: notebook sheet stays on Home, Catalog, and Guided Tracks")

    license_text = read_text(ROOT / "LICENSE")
    if license_text is None:
        problems.append("LICENSE: file not found")
    else:
        if "Creative Commons Attribution 4.0 International Public License" not in license_text:
            problems.append("LICENSE: missing the CC BY 4.0 legal text")
        if "CC BY 4.0" not in license_text or "MIT" not in license_text:
            problems.append("LICENSE: state the CC BY 4.0 content and MIT code split")

    code_text = read_text(ROOT / "LICENSE-CODE")
    if code_text is None:
        problems.append("LICENSE-CODE: file not found")
    elif "MIT License" not in code_text or "Permission is hereby granted" not in code_text:
        problems.append("LICENSE-CODE: expected the MIT License")


def check_citation_file(problems: list[str], version: str | None, updated: str | None) -> None:
    text = read_text(ROOT / "CITATION.cff")
    if text is None:
        problems.append("CITATION.cff: file not found")
        return
    top = cff_top_level(text)
    expected = {
        "cff-version": "1.2.0",
        "title": CITATION_TITLE,
        "license": "CC-BY-4.0",
        "url": "https://yiuhong.github.io/demo-library/",
        "repository-code": "https://github.com/yiuhong/demo-library",
    }
    if version:
        expected["version"] = version
    if updated:
        expected["date-released"] = updated
    for key, value in expected.items():
        got = top.get(key)
        if got != value:
            problems.append(f"CITATION.cff: {key} is {got!r}, expected {value!r}")
    if "family-names: Ko" not in text or "Yiu Hong" not in text:
        problems.append("CITATION.cff: author Yiu Hong Ko is missing")
    if ORCID_URL not in text:
        problems.append("CITATION.cff: ORCID URL is missing")
    if not re.search(r"\bMIT\b", text):
        problems.append("CITATION.cff: note the MIT code license in the message or abstract")
    if "preferred-citation:" not in text or not re.search(r"(?m)^  type:\s*website\s*$", text):
        problems.append("CITATION.cff: preferred-citation should be the website citation")
    if version and text.count(f'version: "{version}"') < 2:
        problems.append(f"CITATION.cff: version {version} must be on the work and the preferred citation")
    if text.count(f'title: "{CITATION_TITLE}"') < 2:
        problems.append(
            "CITATION.cff: citation title must be on the work and the preferred citation"
        )


def cff_top_level(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in text.splitlines():
        if not line or line[0].isspace() or line[0] in "#-":
            continue
        key, sep, raw = line.partition(":")
        if not sep:
            continue
        key = key.strip()
        if not key or " " in key:
            continue
        value = raw.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key] = value
    return values


def demo_title(data: object, href: str) -> str | None:
    if not isinstance(data, dict):
        return None
    categories = data.get("categories")
    if not isinstance(categories, list):
        return None
    for category in categories:
        if not isinstance(category, dict):
            continue
        subcategories = category.get("subcategories")
        if not isinstance(subcategories, list):
            continue
        for subcategory in subcategories:
            if not isinstance(subcategory, dict):
                continue
            demos = subcategory.get("demos")
            if not isinstance(demos, list):
                continue
            for demo in demos:
                if isinstance(demo, dict) and demo.get("href") == href:
                    return label(demo.get("title"))
    return None


def element_text(html: str, element_id: str) -> str | None:
    match = re.search(
        rf'id="{re.escape(element_id)}"[^>]*>(.*?)</p>',
        html,
        re.S | re.I,
    )
    if not match:
        return None
    return re.sub(r"<[^>]+>", " ", match.group(1))


def read_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return None


def js_string(source: str, field: str) -> str | None:
    match = re.search(rf"\b{re.escape(field)}:\s*\"([^\"]*)\"", source)
    if not match:
        return None
    return match.group(1)


def label(value: object) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def blank(value: object) -> bool:
    return not isinstance(value, str) or value.strip() == ""


def _count(n: int, noun: str, plural: str | None = None) -> str:
    if n == 1:
        return f"{n} {noun}"
    return f"{n} {plural or noun + 's'}"


def catalog_anchors(data: object) -> set[str]:
    """Section ids the library page assigns, matching index.html pathAnchor."""
    anchors: set[str] = set()
    if not isinstance(data, dict):
        return anchors
    categories = data.get("categories")
    if not isinstance(categories, list):
        return anchors
    used: set[str] = set()
    for category in categories:
        if not isinstance(category, dict):
            continue
        category_id = safe_slug(category.get("id"))
        subcategories = category.get("subcategories")
        if not isinstance(subcategories, list):
            continue
        for subcategory in subcategories:
            if not isinstance(subcategory, dict):
                continue
            title = label(subcategory.get("title"))
            if title is None:
                continue
            anchor = path_anchor(title)
            if not anchor:
                continue
            if anchor in used:
                anchor = f"{anchor}-{category_id}" if category_id else ""
            if not anchor or anchor in used:
                continue
            used.add(anchor)
            anchors.add(anchor)
    return anchors


def path_anchor(title: str) -> str:
    slug = title.lower().replace("\u00d7", "x").replace("&", " and ")
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")
    if not slug or not ("a" <= slug[0] <= "z"):
        return ""
    return "path-" + slug


def safe_slug(value: object) -> str:
    if not isinstance(value, str):
        return ""
    ident = value.strip()
    if re.fullmatch(r"[a-z][a-z0-9-]*", ident):
        return ident
    return ""


def check_families(
    data: object,
    problems: list[str],
    catalog_hrefs: set[str],
    anchors: set[str],
) -> int:
    if not isinstance(data, dict) or not isinstance(data.get("families"), list):
        problems.append('families.json: expected an object with a "families" array')
        return 0

    count = 0
    seen_ids: set[str] = set()
    for index, family in enumerate(data["families"], start=1):
        if not isinstance(family, dict):
            problems.append(f"families.json: family {index} is not an object")
            continue
        extra = sorted(set(family) - {"id", "title", "backbone", "show", "nodes"})
        family_id = safe_slug(family.get("id"))
        title = label(family.get("title"))
        name = family_id or title or f"family {index}"
        place = f"families.json: {name}"
        if extra:
            problems.append(f"{place}: unexpected fields {extra}")
        if not family_id:
            problems.append(f"{place}: id must be a lowercase slug")
        elif family_id in seen_ids:
            problems.append(f"{place}: duplicate id")
        else:
            seen_ids.add(family_id)
        if title is None or len(title) > 80:
            problems.append(f"{place}: title is missing, empty, or longer than 80 characters")
        backbone = label(family.get("backbone"))
        if backbone is None or len(backbone) > 280:
            problems.append(f"{place}: backbone is missing, empty, or longer than 280 characters")

        show = family.get("show")
        if not isinstance(show, list) or not show:
            problems.append(f"{place}: show must list hub and/or catalog sections")
        else:
            seen_show: set[str] = set()
            for item in show:
                if not isinstance(item, str) or item in seen_show:
                    problems.append(f"{place}: show has a duplicate or invalid place {item!r}")
                    continue
                seen_show.add(item)
                if item == "hub":
                    continue
                if not re.fullmatch(r"path-[a-z0-9-]+", item):
                    problems.append(f"{place}: show place {item!r} is not hub or a path id")
                elif item not in anchors:
                    problems.append(f"{place}: show place {item!r} is not a catalog section")

        nodes = family.get("nodes")
        if not isinstance(nodes, list):
            problems.append(f"{place}: nodes array is missing")
            continue
        relations: list[str] = []
        seen_hrefs: set[str] = set()
        for node_index, node in enumerate(nodes, start=1):
            node_place = f"{place}: node {node_index}"
            if not isinstance(node, dict):
                problems.append(f"{node_place} is not an object")
                continue
            node_extra = sorted(set(node) - {"href", "relation"})
            if node_extra:
                problems.append(
                    f"{node_place}: unexpected fields {node_extra}; titles come from demos.json"
                )
            href = node.get("href")
            if blank(href):
                problems.append(f"{node_place}: href is missing or empty")
            else:
                assert isinstance(href, str)
                if href in seen_hrefs:
                    problems.append(f"{node_place}: duplicate href {href!r}")
                seen_hrefs.add(href)
                reason = file_problem(href)
                if reason:
                    problems.append(f"{node_place}: href {href!r} {reason}")
                elif href not in catalog_hrefs:
                    problems.append(f"{node_place}: href {href!r} is not in demos.json")
            relation = node.get("relation")
            if relation not in ("before", "backbone", "after"):
                problems.append(f"{node_place}: relation must be before, backbone, or after")
            else:
                relations.append(relation)
        if len(relations) < 2:
            problems.append(f"{place}: needs at least two catalog demos")
        if "backbone" not in relations:
            problems.append(f"{place}: needs a backbone demo")
        if "before" not in relations and "after" not in relations:
            problems.append(f"{place}: needs a before or after demo")
        ranks = {"before": 0, "backbone": 1, "after": 2}
        last = -1
        for relation in relations:
            rank = ranks[relation]
            if rank < last:
                problems.append(f"{place}: nodes must run before, then backbone, then after")
                break
            last = rank
        count += 1
    return count


def check_map_page(problems: list[str]) -> None:
    text = read_text(ROOT / "tracks.html")
    if text is None:
        problems.append("tracks.html: file not found")
    else:
        for needle in ("assets/concept-maps.css", "assets/concept-maps.js"):
            if needle not in text:
                problems.append(f"tracks.html: missing {needle}")
    script = read_text(ROOT / "assets" / "concept-maps.js")
    sheet = read_text(ROOT / "assets" / "concept-maps.css")
    if script is None or "families.json" not in script or "concept-node" not in script:
        problems.append("assets/concept-maps.js: concept-map renderer is missing")
    elif "hub-opened" in script or '"Opened"' in script:
        problems.append("assets/concept-maps.js: do not show an Opened tag")
    if sheet is None or "a.concept-node" not in sheet:
        problems.append("assets/concept-maps.css: concept-map links are missing")
    elif re.search(r"a\.concept-node\.is-opened", sheet):
        problems.append("assets/concept-maps.css: do not fill an opened box")
    elif re.search(r"\.concept-stop\.is-backbone[^{]*\{[^}]*background\s*:", sheet):
        problems.append("assets/concept-maps.css: backbone must not paint its own fill")
    catalog_js = read_text(ROOT / "assets" / "catalog.js")
    if catalog_js is None:
        problems.append("assets/catalog.js: file not found")
    elif "hub-opened" in catalog_js or "ProjectVizOpened" in catalog_js or '"Opened"' in catalog_js:
        problems.append("assets/catalog.js: catalog cards must not show or mark opened state")
    tracks = read_text(ROOT / "tracks.html")
    tracks_js = read_text(ROOT / "assets" / "tracks-page.js")
    if tracks and "Choose a path" in tracks:
        problems.append("tracks.html: Choose a path does not belong on Guided Tracks")
    if tracks and "assets/opened.js" in tracks:
        problems.append("tracks.html: do not mark opened boxes")
    if tracks_js and "track-steps" in tracks_js:
        problems.append("assets/tracks-page.js: do not repeat track steps as a link list")
    if tracks_js and ("playlist-note" in tracks_js or "playlist-bridge" in tracks_js):
        problems.append("assets/tracks-page.js: connection notes must not render inline")
    if not tracks_js or "tracks/connection.html?track=" not in tracks_js:
        problems.append("assets/tracks-page.js: connection links are missing")
    connection = read_text(ROOT / "tracks" / "connection.html")
    if connection is None:
        problems.append("tracks/connection.html: file not found")
    else:
        for needle in (
            "viz-embedded",
            "demo-back",
            "assets/connection-page.js",
            "assets/site-oer-footer.js",
            "assets/site-oer-footer.css",
        ):
            if needle not in connection:
                problems.append(f"tracks/connection.html: missing {needle}")
    shell = read_text(ROOT / "assets" / "shell.js")
    if shell is None or "tracks/connection.html" not in shell or "viz-fullscreen" not in shell:
        problems.append("assets/shell.js: connection pages should open in the shell pane")


if __name__ == "__main__":
    sys.exit(main())
