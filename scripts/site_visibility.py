#!/usr/bin/env python3
"""Write and check the public sitemap, robots.txt, and share tags.

The public page list is not a hand-kept copy. It is:

* the library pages (home, Catalog, Book view, the four chapters, Cite & reuse, Licenses)
* each live demonstration in ``demos.json``, in curriculum order, skipping a draft badge
* each other teaching page linked from ``tracks.json`` (the section self-tests), once

Left off the sitemap: ``tracks.html`` (the bare address opens Book view), ``tracks/connection.html`` (a shell whose note depends on the query), ``statistics/center_and_spread_check.html`` (a trial, not a catalog card and not a track step), and ``cognitive_psychology/``, ``neuroscience/``, ``personality_psychology/``, and ``native-app/``.

Share tags are one block, ``<!-- site-share -->``, on every sitemap page and on the three public HTML files that stay off the sitemap. A catalog page uses its ``demos.json`` description. A self-test counts its own questions. An existing description on any other page is left as written. There is no share image: the wordmarks are SVG, which card crawlers do not reliably fetch.

Check from the catalog script, or directly:

    python3 scripts/check_catalog.py
    python3 scripts/site_visibility.py --check

Regenerate after a catalog or track page is added:

    python3 scripts/site_visibility.py
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://yiuhong.github.io/project-viz/"
SITEMAP_URL = SITE + "sitemap.xml"

LIBRARY_PAGES = (
    "index.html",
    "catalog.html",
    "book/index.html",
    "book/chapter-1.html",
    "book/chapter-2.html",
    "book/chapter-3.html",
    "book/chapter-4.html",
    "cite.html",
    "license.html",
)

# Shells, not documents. A query selects the note or the open demonstration.
SHELL_PAGES = (
    "tracks.html",
    "tracks/connection.html",
)

NON_PUBLIC_PREFIXES = (
    "cognitive_psychology/",
    "neuroscience/",
    "personality_psychology/",
    "native-app/",
)

# Used only when the page has no description of its own. Catalog cards and
# self-tests do not come from here.
FALLBACK_DESCRIPTIONS = {
    "tracks/connection.html": "A Book view note between one demonstration and the next.",
    "statistics/center_and_spread_check.html": (
        "The mean on a dot plot, and the variance divisor from n toward n − 1."
    ),
}

SELF_TEST_PREFIX = "Self-test: "
NUMBER_WORDS = (
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
)
INDENT = "    "
BLOCK_RE = re.compile(r"[ \t]*<!-- site-share -->.*?<!-- /site-share -->\n?", re.S)
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.I | re.S)
DESC_RE = re.compile(
    r"<meta\s[^>]*\bname\s*=\s*(['\"])description\1[^>]*>",
    re.I,
)
CANON_RE = re.compile(
    r"<link\s[^>]*\brel\s*=\s*(['\"])canonical\1[^>]*>",
    re.I,
)
DESC_LINE_RE = re.compile(
    r"^[ \t]*<meta\s[^>]*\bname\s*=\s*(['\"])description\1[^>]*>[ \t]*\r?\n?",
    re.I | re.M,
)
CANON_LINE_RE = re.compile(
    r"^[ \t]*<link\s[^>]*\brel\s*=\s*(['\"])canonical\1[^>]*>[ \t]*\r?\n?",
    re.I | re.M,
)
CHARSET_RE = re.compile(r"<meta\s+charset\b[^>]*>", re.I)
VIEWPORT_RE = re.compile(
    r"<meta\b[^>]*\bname\s*=\s*(['\"])viewport\1[^>]*>",
    re.I,
)
STEM_RE = re.compile(r"(?<![\w-])(?:\"stem\"|stem)\s*:")
INLINE_TAG_RE = re.compile(r"</?(?:sub|sup|em|strong|i|b|br)\s*/?>", re.I)


def render_robots() -> str:
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "\n"
        f"Sitemap: {SITEMAP_URL}\n"
    )


def page_url(rel: str) -> str:
    if rel == "index.html":
        return SITE
    if rel == "book/index.html":
        return SITE + "book/"
    return SITE + rel


def xml_escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def attr_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def plain_text(value: str) -> str:
    text = INLINE_TAG_RE.sub("", value)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def attr_value(tag: str, name: str) -> str | None:
    match = re.search(
        rf"\b{name}\s*=\s*(['\"])(.*?)\1",
        tag,
        re.I | re.S,
    )
    if match is None:
        return None
    return html.unescape(match.group(2))


def load_json(path: Path) -> tuple[object | None, str | None]:
    try:
        return json.loads(path.read_text(encoding="utf-8")), None
    except FileNotFoundError:
        return None, f"{path.name}: file not found"
    except json.JSONDecodeError as exc:
        return None, f"{path.name}: invalid JSON ({exc})"
    except OSError as exc:
        return None, f"{path.name}: {exc}"


def demo_is_draft(demo: object) -> bool:
    if not isinstance(demo, dict):
        return False
    tags = demo.get("tags")
    if not isinstance(tags, list):
        return False
    for tag in tags:
        if isinstance(tag, dict) and tag.get("draft") is True:
            return True
    return False


def catalog_descriptions(problems: list[str]) -> tuple[dict[str, str], list[str]]:
    """Return description by href, and live catalog hrefs in curriculum order."""
    data, error = load_json(ROOT / "demos.json")
    descriptions: dict[str, str] = {}
    live: list[str] = []
    if error:
        problems.append(error)
        return descriptions, live
    if not isinstance(data, dict) or not isinstance(data.get("categories"), list):
        problems.append("demos.json: expected an object with a categories array")
        return descriptions, live
    for category in data["categories"]:
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
                if not isinstance(demo, dict):
                    continue
                href = demo.get("href")
                if not isinstance(href, str) or not href.strip():
                    continue
                href = href.strip()
                description = demo.get("description")
                if isinstance(description, str) and description.strip():
                    # The card sentence, with ’ where the card still uses '.
                    descriptions[href] = plain_text(description).replace("'", "\u2019")
                if demo_is_draft(demo):
                    continue
                if href not in live:
                    live.append(href)
    return descriptions, live


def track_hrefs(problems: list[str]) -> list[str]:
    data, error = load_json(ROOT / "tracks.json")
    hrefs: list[str] = []
    if error:
        problems.append(error)
        return hrefs
    if not isinstance(data, dict) or not isinstance(data.get("tracks"), list):
        problems.append("tracks.json: expected an object with a tracks array")
        return hrefs
    for track in data["tracks"]:
        if not isinstance(track, dict):
            continue
        steps = track.get("steps")
        if not isinstance(steps, list):
            continue
        for step in steps:
            if not isinstance(step, dict):
                continue
            href = step.get("href")
            if isinstance(href, str) and href.strip():
                hrefs.append(href.strip())
    return hrefs


def is_non_public(rel: str) -> bool:
    return rel.startswith(NON_PUBLIC_PREFIXES)


def sitemap_entries(problems: list[str]) -> list[tuple[str, str]]:
    descriptions, live = catalog_descriptions(problems)
    entries: list[tuple[str, str]] = []
    seen: set[str] = set()

    def add(rel: str) -> None:
        if rel in seen or is_non_public(rel) or rel in SHELL_PAGES:
            return
        if rel not in descriptions and rel in live:
            problems.append(f"{rel}: catalog description is missing")
        path = ROOT / rel
        if not path.is_file():
            problems.append(f"sitemap.xml: {rel} is not a file")
            return
        seen.add(rel)
        entries.append((rel, page_url(rel)))

    for rel in LIBRARY_PAGES:
        add(rel)
    for rel in live:
        add(rel)
    for rel in track_hrefs(problems):
        add(rel)

    urls = [url for _, url in entries]
    if len(urls) != len(set(urls)):
        problems.append("sitemap.xml: duplicate URL")
    for rel, url in entries:
        if not url.startswith(SITE):
            problems.append(f"sitemap.xml: {url} is not an absolute project URL")
        if is_non_public(rel) or rel in SHELL_PAGES:
            problems.append(f"sitemap.xml: {rel} is not a public page")
    return entries


def render_sitemap(entries: list[tuple[str, str]]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for _rel, url in entries:
        lines.append("  <url>")
        lines.append(f"    <loc>{xml_escape(url)}</loc>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def share_paths(entries: list[tuple[str, str]]) -> list[str]:
    paths = [rel for rel, _url in entries]
    seen = set(paths)
    extra: list[str] = []
    statistics = ROOT / "statistics"
    if statistics.is_dir():
        extra.extend(
            path.relative_to(ROOT).as_posix()
            for path in sorted(statistics.glob("*.html"))
        )
    extra.extend(SHELL_PAGES)
    for rel in extra:
        if rel in seen or is_non_public(rel):
            continue
        if (ROOT / rel).is_file():
            seen.add(rel)
            paths.append(rel)
    return paths


def questions_phrase(count: int) -> str:
    if 1 <= count < len(NUMBER_WORDS):
        noun = "question" if count == 1 else "questions"
        return f"{NUMBER_WORDS[count]} {noun}"
    noun = "question" if count == 1 else "questions"
    return f"{count} {noun}"


def question_count(text: str) -> int:
    return len(STEM_RE.findall(text))


def page_title(text: str) -> str | None:
    matches = TITLE_RE.findall(text)
    if len(matches) != 1:
        return None
    title = plain_text(matches[0])
    return title or None


def existing_descriptions(text: str) -> list[str]:
    found: list[str] = []
    for match in DESC_RE.finditer(text):
        value = attr_value(match.group(0), "content")
        if value is not None:
            found.append(plain_text(value))
    return found


def chosen_description(
    rel: str,
    text: str,
    title: str,
    descriptions: dict[str, str],
    problems: list[str],
) -> str | None:
    if rel in descriptions:
        return descriptions[rel]
    if title.startswith(SELF_TEST_PREFIX):
        section = title[len(SELF_TEST_PREFIX):].strip()
        count = question_count(text)
        if not section or count < 1:
            problems.append("self-test description could not be built from the questions")
            return None
        return f"{questions_phrase(count)} on {section}."
    found = existing_descriptions(text)
    unique = list(dict.fromkeys(found))
    if len(unique) > 1:
        problems.append("meta descriptions disagree")
        return None
    if len(unique) == 1:
        return unique[0]
    fallback = FALLBACK_DESCRIPTIONS.get(rel)
    if fallback:
        return fallback
    problems.append("meta description is missing")
    return None


def render_share_block(title: str, description: str, url: str) -> str:
    rows = (
        ("name", "description", description),
        ("property", "og:title", title),
        ("property", "og:description", description),
        ("property", "og:url", url),
        ("property", "og:type", "website"),
        ("name", "twitter:card", "summary"),
        ("name", "twitter:title", title),
        ("name", "twitter:description", description),
        ("name", "twitter:url", url),
    )
    lines = [
        f"{INDENT}<!-- site-share -->",
        f'{INDENT}<link rel="canonical" href="{attr_escape(url)}">',
    ]
    for attr, name, content in rows:
        lines.append(
            f'{INDENT}<meta {attr}="{name}" content="{attr_escape(content)}">'
        )
    lines.append(f"{INDENT}<!-- /site-share -->")
    return "\n".join(lines) + "\n"


def insertion_index(text: str) -> int | None:
    charset = CHARSET_RE.search(text)
    title_close = re.search(r"</title>", text, re.I)
    viewport = VIEWPORT_RE.search(text)
    if title_close and charset and charset.start() < title_close.start():
        anchor = title_close.end()
    elif viewport:
        anchor = viewport.end()
    elif charset:
        anchor = charset.end()
    elif title_close:
        anchor = title_close.end()
    else:
        return None
    newline = text.find("\n", anchor)
    if newline == -1:
        return len(text)
    return newline + 1


def strip_share_tags(text: str) -> str:
    text = BLOCK_RE.sub("", text)
    text = DESC_LINE_RE.sub("", text)
    text = CANON_LINE_RE.sub("", text)
    return text


def apply_html(
    text: str,
    rel: str,
    descriptions: dict[str, str],
) -> tuple[str, list[str]]:
    problems: list[str] = []
    title = page_title(text)
    if title is None:
        problems.append("expected one title")
        return text, problems
    description = chosen_description(rel, text, title, descriptions, problems)
    if description is None:
        return text, problems
    url = page_url(rel)
    for match in CANON_RE.finditer(text):
        href = attr_value(match.group(0), "href")
        if href and href != url:
            problems.append(f"canonical is {href}, expected {url}")
            return text, problems
    stripped = strip_share_tags(text)
    if DESC_RE.search(stripped) or CANON_RE.search(stripped):
        problems.append("description or canonical is not on its own line")
        return text, problems
    index = insertion_index(stripped)
    if index is None:
        problems.append("no title to attach the share tags to")
        return text, problems
    block = render_share_block(title, description, url)
    updated = stripped[:index] + block + stripped[index:]
    return updated, problems


def read_file(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return None
    except OSError:
        return None


def check_visibility(problems: list[str]) -> None:
    build_problems: list[str] = []
    entries = sitemap_entries(build_problems)
    problems.extend(build_problems)
    if build_problems:
        return
    robots = render_robots()
    sitemap = render_sitemap(entries)
    actual_robots = read_file(ROOT / "robots.txt")
    if actual_robots != robots:
        problems.append("robots.txt: out of date. Run python3 scripts/site_visibility.py")
    actual_sitemap = read_file(ROOT / "sitemap.xml")
    if actual_sitemap != sitemap:
        problems.append("sitemap.xml: out of date. Run python3 scripts/site_visibility.py")
    descriptions, _live = catalog_descriptions([])
    for rel in share_paths(entries):
        text = read_file(ROOT / rel)
        if text is None:
            problems.append(f"{rel}: file not found")
            continue
        updated, errors = apply_html(text, rel, descriptions)
        for error in errors:
            problems.append(f"{rel}: {error}")
        if not errors and updated != text:
            problems.append(
                f"{rel}: share tags are out of date. Run python3 scripts/site_visibility.py"
            )


def write_visibility() -> int:
    problems: list[str] = []
    entries = sitemap_entries(problems)
    if problems:
        for problem in problems:
            print(problem, file=sys.stderr)
        return 1
    (ROOT / "robots.txt").write_text(render_robots(), encoding="utf-8")
    (ROOT / "sitemap.xml").write_text(render_sitemap(entries), encoding="utf-8")
    descriptions, _live = catalog_descriptions([])
    changed = 0
    for rel in share_paths(entries):
        path = ROOT / rel
        text = path.read_text(encoding="utf-8")
        updated, errors = apply_html(text, rel, descriptions)
        if errors:
            for error in errors:
                print(f"{rel}: {error}", file=sys.stderr)
                problems.append(error)
            continue
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            changed += 1
    if problems:
        return 1
    print(
        f"Wrote robots.txt, sitemap.xml ({len(entries)} URLs), "
        f"and share tags on {changed} pages."
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if args == ["--check"]:
        problems: list[str] = []
        check_visibility(problems)
        if problems:
            noun = "problem" if len(problems) == 1 else "problems"
            print(f"Site visibility check failed ({len(problems)} {noun}):", file=sys.stderr)
            for problem in problems:
                print(f"- {problem}", file=sys.stderr)
            return 1
        print("Site visibility check passed.")
        return 0
    if args:
        print(
            "Usage: python3 scripts/site_visibility.py [--check]",
            file=sys.stderr,
        )
        return 2
    return write_visibility()


if __name__ == "__main__":
    sys.exit(main())
