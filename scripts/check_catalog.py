#!/usr/bin/env python3
"""Check that catalog and Guided Track links point at files in this repo.

Reads ``demos.json`` and ``tracks.json`` at the repo root:

* each demo has a non-empty title and href, and that href is a file in the repo
* each track step has a non-empty title and href, and that href is a file in the repo
* each track step image, when set, is a file in the repo
* LICENSE states CC BY 4.0 for content and MIT for code, and LICENSE-CODE is the MIT text
* index.html, cite.html, and each demo carry the site chrome, and no HTML page says "All rights reserved"

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


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if args:
        print("Usage: python3 scripts/check_catalog.py", file=sys.stderr)
        return 2

    problems: list[str] = []

    demos, error = load_json(DEMOS_PATH)
    demo_count = 0
    demo_hrefs: list[str] = []
    if error:
        problems.append(error)
    else:
        demo_count = check_demos(demos, problems, demo_hrefs)

    check_site_chrome(problems, demo_hrefs)

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


def check_site_chrome(problems: list[str], demo_hrefs: list[str]) -> None:
    meta = read_text(ROOT / "assets" / "site-meta.js")
    if meta is None:
        problems.append("assets/site-meta.js: file not found")
        version = updated = updated_display = None
    else:
        version = js_string(meta, "version")
        updated = js_string(meta, "updated")
        updated_display = js_string(meta, "updatedDisplay")
        if not version or not updated or not updated_display:
            problems.append(
                "assets/site-meta.js: version, updated, and updatedDisplay are required"
            )

    for name in ("index.html", "cite.html"):
        text = read_text(ROOT / name)
        if text is None:
            problems.append(f"{name}: file not found")
            continue
        required = [
            "assets/site-meta.js",
            "assets/site-oer-footer.js",
            "CC BY 4.0",
            "How to cite",
            "Spotted a mistake?",
            "https://github.com/yiuhong/demo-library/issues",
            "https://github.com/yiuhong/demo-library",
            "mailto:yiuhong.ko@gmail.com",
            "https://yiuhong.github.io/",
        ]
        if version:
            required.append(version)
        if updated:
            required.append(updated)
        if updated_display:
            required.append(updated_display)
        if name == "cite.html":
            required.extend(("BibTeX", "ko2026teachingmaterials", "LICENSE-CODE"))
        for needle in required:
            if needle not in text:
                problems.append(f"{name}: missing {needle}")

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
