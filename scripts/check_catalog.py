#!/usr/bin/env python3
"""Check that catalog and Guided Track links point at files in this repo.

Reads ``demos.json`` and ``tracks.json`` at the repo root:

* each demo has a non-empty title and href, and that href is a file in the repo
* each track step has a non-empty title and href, and that href is a file in the repo
* each track step image, when set, is a file in the repo
* LICENSE states CC BY 4.0 for content and MIT for code, and LICENSE-CODE is the MIT text
* index.html, cite.html, license.html, and each demo carry the site chrome, and no HTML page says "All rights reserved"
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
ORCID_URL = "https://orcid.org/0000-0003-4436-0166"
ORCID_LABEL = "ORCID iD 0000-0003-4436-0166"
DEMO_CITE_HREF = "statistics/central_limit_theorem.html"


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
        f"{_count(image_count, 'image')}. "
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

    footer_js = read_text(ROOT / "assets" / "site-oer-footer.js")
    if footer_js is None:
        problems.append("assets/site-oer-footer.js: file not found")
    else:
        for needle in (
            "meta.orcid",
            "Cite this demo",
            "demoCitation",
            "Cite & reuse",
            "ORCID iD",
            "license.html",
        ):
            if needle not in footer_js:
                problems.append(f"assets/site-oer-footer.js: missing {needle}")

    for name in ("index.html", "cite.html", "license.html"):
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
            "Personal site",
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
                    "CC BY 3.0",
                    "HTML5 UP",
                    "Hyperspace",
                )
            )
            lowered = text.lower()
            if "wcag" in lowered or "conforms to" in lowered:
                problems.append(f"{name}: do not claim a conformance standard")
        if name == "license.html":
            for needle in ("CC BY 3.0", "HTML5 UP", "Hyperspace", "LICENSE-CODE", "cite.html"):
                if needle not in text:
                    problems.append(f"{name}: missing {needle}")
        if name == "index.html":
            required.extend(('id="library-about"', 'id="library-preferred-cite"', "Full cite", "data-site-apa"))
            about = element_text(text, "library-about")
            if about is None:
                problems.append("index.html: library about blurb is missing")
            else:
                lowered = about.lower()
                for phrase in (
                    "instructors",
                    "students",
                    "statistics",
                    "neuroscience",
                    "cognitive",
                    "personality",
                ):
                    if phrase not in lowered:
                        problems.append(f"index.html: about blurb is missing {phrase}")
        for needle in required:
            if needle not in text:
                problems.append(f"{name}: missing {needle}")

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

    for path in sorted(ROOT.rglob("*.html")):
        text = read_text(path)
        if text is None:
            continue
        if "all rights reserved" in text.lower():
            problems.append(
                f'{path.relative_to(ROOT)}: still says "All rights reserved"'
            )

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
        "title": "Teaching Materials Library",
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


def _count(n: int, noun: str) -> str:
    return f"{n} {noun}" if n == 1 else f"{n} {noun}s"


if __name__ == "__main__":
    sys.exit(main())
