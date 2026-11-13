#!/usr/bin/env python3
"""Check the pinned plot and math registry.

Confirms ``assets/vendor.json`` names exact versions, that demonstration
pages load those libraries through ``assets/vendor-loader.js``, and that
no page still carries its own D3, Chart.js, KaTeX, jStat, or Three.js URL.
It also rejects the Tailwind Play CDN. Utilities load from
``assets/tailwind.css``.

``--fetch`` downloads each pinned file and checks the integrity hash.
Run that after editing a URL. The check without ``--fetch`` stays offline.

    python3 scripts/check_vendor.py
    python3 scripts/check_vendor.py --fetch
"""

from __future__ import annotations

import base64
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = ROOT / "assets" / "vendor.json"
LOADER_PATH = ROOT / "assets" / "vendor-loader.js"
CONVENTIONS_PATH = ROOT / "docs" / "plotting-conventions.md"

REQUIRED = ("d3", "chart", "jstat", "katex", "three", "orbit-controls")
FORBIDDEN_IDS = ("tailwind", "mathjax", "plotly", "vega", "vega-lite", "observable")

# Ad-hoc tags this registry replaces. MathJax, Lucide, and compromise
# are outside this check. The Tailwind Play CDN is not allowed.
# Utilities come from assets/tailwind.css.
FORBIDDEN_HTML = (
    re.compile(r"d3js\.org/d3", re.I),
    re.compile(r"cdn\.jsdelivr\.net/npm/d3@", re.I),
    re.compile(r"cdnjs\.cloudflare\.com/ajax/libs/d3/", re.I),
    re.compile(r"cdn\.jsdelivr\.net/npm/chart\.js(?:@|/|\?|\s|[\"'])", re.I),
    re.compile(r"cdn\.jsdelivr\.net/npm/katex@", re.I),
    re.compile(r"cdn\.jsdelivr\.net/npm/jstat@", re.I),
    re.compile(r"cdnjs\.cloudflare\.com/ajax/libs/jstat/", re.I),
    re.compile(r"cdn\.jsdelivr\.net/npm/three@", re.I),
    re.compile(r"cdnjs\.cloudflare\.com/ajax/libs/three\.js/", re.I),
    re.compile(r"OrbitControls\.js", re.I),
)

USAGE = (
    ("d3", re.compile(r"\bd3\s*\.")),
    ("chart", re.compile(r"\bnew\s+Chart\s*\(|\bChart\s*\.")),
    ("jstat", re.compile(r"\bjStat\s*\.")),
    ("katex", re.compile(r"\bkatex\s*\.|\brenderMathInElement\s*\(")),
    ("three", re.compile(r"\bTHREE\s*\.")),
    ("orbit-controls", re.compile(r"\bOrbitControls\b")),
)

PLAY_CDN_RE = re.compile(r"cdn\.tailwindcss\.com", re.I)
TAILWIND_CONFIG_RE = re.compile(r"tailwind\.config\s*=")
TAILWIND_LINK_RE = re.compile(
    r"<link\b([^>]*\bhref=[\"']([^\"']*tailwind\.css)[\"'][^>]*)>",
    re.I,
)
TAILWIND_HEADER = "/* Project Viz Tailwind utilities. tailwindcss 3.4.17."
TAILWIND_PAGES = (
    "neuroscience/EEG_signal_decomposition.html",
    "neuroscience/eeg_illustration.html",
    "neuroscience/erp_demo.html",
    "neuroscience/fnirs_mechanism.html",
    "personality_psychology/lexical_approach.html",
    "personality_psychology/nlp_psychotherapy.html",
    "statistics/additivity_of_variance.html",
    "statistics/anova_assumptions.html",
    "statistics/bessels_correction_simulation.html",
    "statistics/boxplot_histogram.html",
    "statistics/building_normal_distribution.html",
    "statistics/central_limit_theorem.html",
    "statistics/chi_square_distribution.html",
    "statistics/covariance_and_correlation.html",
    "statistics/galton_board.html",
    "statistics/horowitz_1974_simulation_CLT.html",
    "statistics/independent_t_test_simulation.html",
    "statistics/kde_plots.html",
    "statistics/limitations_of_summary_statistics.html",
    "statistics/mean_mode_median_dot_plot.html",
    "statistics/moments_as_averages.html",
    "statistics/paired_t_test_simulation.html",
    "statistics/power_curve.html",
    "statistics/q_q_plot.html",
    "statistics/skewed_distribution.html",
    "statistics/statistical_power.html",
    "statistics/stats_conceptual_hierarchy.html",
    "statistics/t_test_to_anova.html",
    "statistics/target_analogy_confidence_intervals.html",
    "statistics/two_way_anova.html",
    "statistics/variance_explained.html",
    "statistics/z_distribution_vs_t_distribution.html",
)

LOADER_RE = re.compile(
    r"<script\b([^>]*\bsrc=[\"'][^\"']*vendor-loader\.js[\"'][^>]*)>\s*</script>",
    re.I,
)
ATTR_RE = re.compile(r"([:\w-]+)\s*=\s*([\"'])(.*?)\2", re.S)


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    fetch = False
    if args == ["--fetch"]:
        fetch = True
    elif args:
        print("Usage: python3 scripts/check_vendor.py [--fetch]", file=sys.stderr)
        return 2

    problems: list[str] = []
    registry = load_registry(problems)
    conventions = read(CONVENTIONS_PATH)
    if conventions is None:
        problems.append("docs/plotting-conventions.md: file not found")
    loader_text = read(LOADER_PATH)
    if loader_text is None:
        problems.append("assets/vendor-loader.js: file not found")
    elif "document.write" not in loader_text or "crossorigin" not in loader_text:
        problems.append("assets/vendor-loader.js: must write the pinned tags, including crossorigin")

    if registry is not None:
        check_registry(registry, problems)
        if conventions is not None:
            check_smoke(registry, conventions, problems)
        check_pages(registry, problems)
        check_tailwind(problems)
        if fetch and not any(item.startswith("assets/vendor.json") for item in problems):
            check_hashes(registry, problems)

    if problems:
        noun = "problem" if len(problems) == 1 else "problems"
        print(f"Vendor pin check failed ({len(problems)} {noun}):")
        for problem in problems:
            print(f"- {problem}")
        return 1

    libraries = registry["libraries"] if isinstance(registry, dict) else {}
    pins = ", ".join(
        f"{name} {libraries[name].get('version')}" for name in REQUIRED if name in libraries
    )
    suffix = " Hashes match the downloaded files." if fetch else " Offline check only."
    print(f"Vendor pin check passed: {pins}.{suffix}")
    return 0


def load_registry(problems: list[str]) -> dict | None:
    text = read(REGISTRY_PATH)
    if text is None:
        problems.append("assets/vendor.json: file not found")
        return None
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        problems.append(f"assets/vendor.json: invalid JSON ({exc})")
        return None
    if not isinstance(data, dict):
        problems.append("assets/vendor.json: expected an object")
        return None
    return data


def check_registry(data: dict, problems: list[str]) -> None:
    libraries = data.get("libraries")
    if not isinstance(libraries, dict):
        problems.append("assets/vendor.json: libraries object is missing")
        return
    for banned in FORBIDDEN_IDS:
        if banned in libraries:
            problems.append(f"assets/vendor.json: {banned} is not a pinned plot library")
    for name in REQUIRED:
        if name not in libraries:
            problems.append(f"assets/vendor.json: missing {name}")
    orders: dict[int, str] = {}
    for name, entry in libraries.items():
        place = f"assets/vendor.json: {name}"
        if not isinstance(entry, dict):
            problems.append(f"{place}: expected an object")
            continue
        version = entry.get("version")
        if not isinstance(version, str) or not version or version == "latest" or "@" in version:
            problems.append(f"{place}: version must be an exact pin")
        if not isinstance(entry.get("package"), str) or not entry.get("package"):
            problems.append(f"{place}: package is missing")
        order = entry.get("order")
        if not isinstance(order, int):
            problems.append(f"{place}: order must be an integer")
        elif order in orders:
            problems.append(f"{place}: order {order} is also used by {orders[order]}")
        else:
            orders[order] = name
        after = entry.get("after", [])
        if not isinstance(after, list) or not all(isinstance(item, str) for item in after):
            problems.append(f"{place}: after must be a list of library names")
        else:
            for dep in after:
                other = libraries.get(dep)
                if not isinstance(other, dict):
                    problems.append(f"{place}: after {dep}, which is not in the registry")
                elif isinstance(order, int) and isinstance(other.get("order"), int):
                    if other["order"] >= order:
                        problems.append(f"{place}: {dep} must load before it")
        assets = entry.get("assets")
        if not isinstance(assets, list) or not assets:
            problems.append(f"{place}: assets are missing")
            continue
        for index, asset in enumerate(assets, start=1):
            check_asset(place, entry, index, asset, problems)
    check_katex_shape(libraries, problems)


def check_katex_shape(libraries: dict, problems: list[str]) -> None:
    entry = libraries.get("katex")
    if not isinstance(entry, dict):
        return
    assets = entry.get("assets")
    if not isinstance(assets, list) or len(assets) < 3:
        problems.append("assets/vendor.json: katex needs CSS, katex.min.js, then auto-render")
        return
    kinds = [asset.get("kind") if isinstance(asset, dict) else None for asset in assets]
    urls = []
    for asset in assets:
        if isinstance(asset, dict):
            urls.append(asset.get("href") or asset.get("src") or "")
    if kinds[0] != "style" or not str(urls[0]).endswith("katex.min.css"):
        problems.append("assets/vendor.json: katex CSS must be the first asset")
    if kinds[1] != "script" or not str(urls[1]).endswith("katex.min.js"):
        problems.append("assets/vendor.json: katex.min.js must follow the CSS")
    if kinds[2] != "script" or not str(urls[2]).endswith("auto-render.min.js"):
        problems.append("assets/vendor.json: auto-render must follow katex.min.js")


def check_asset(place: str, entry: dict, index: int, asset: object, problems: list[str]) -> None:
    where = f"{place} asset {index}"
    if not isinstance(asset, dict):
        problems.append(f"{where}: expected an object")
        return
    kind = asset.get("kind")
    url = asset.get("href") if kind == "style" else asset.get("src")
    if kind not in ("style", "script") or not isinstance(url, str) or not url.startswith("https://"):
        problems.append(f"{where}: needs an https style href or script src")
        return
    if "@latest" in url or "/latest/" in url:
        problems.append(f"{where}: URL is not pinned")
    version = entry.get("version")
    revision = entry.get("revision")
    tokens = [token for token in (version, revision) if isinstance(token, str)]
    if tokens and not any(token in url for token in tokens):
        problems.append(f"{where}: URL does not contain the pinned version")
    integrity = asset.get("integrity")
    if integrity is not None:
        if not isinstance(integrity, str) or not re.fullmatch(r"sha384-[A-Za-z0-9+/=]+", integrity):
            problems.append(f"{where}: integrity must be a sha384 hash")


def check_smoke(data: dict, conventions: str, problems: list[str]) -> None:
    smoke = data.get("smoke")
    if not isinstance(smoke, list) or len(smoke) < 8:
        problems.append("assets/vendor.json: smoke list is missing")
        return
    for item in smoke:
        if not isinstance(item, str) or not item:
            problems.append("assets/vendor.json: smoke entries must be paths")
            continue
        if item not in conventions:
            problems.append(f"docs/plotting-conventions.md: smoke path {item} is not listed")
        file_part = item.split("?", 1)[0]
        if not (ROOT / file_part).is_file():
            problems.append(f"assets/vendor.json: smoke path {item} is not a file")


def check_tailwind(problems: list[str]) -> None:
    sheet = ROOT / "assets" / "tailwind.css"
    text = read(sheet)
    if text is None:
        problems.append("assets/tailwind.css: file not found")
    elif not text.startswith(TAILWIND_HEADER):
        problems.append("assets/tailwind.css: expected the tailwindcss 3.4.17 header")
    linked = 0
    for path in sorted(ROOT.rglob("*.html")):
        page = path.read_text(encoding="utf-8")
        rel = path.relative_to(ROOT).as_posix()
        if PLAY_CDN_RE.search(page):
            problems.append(f"{rel}: loads the Tailwind Play CDN")
        if TAILWIND_CONFIG_RE.search(page):
            problems.append(f"{rel}: still has a tailwind.config block")
        links = list(TAILWIND_LINK_RE.finditer(page))
        if len(links) > 1:
            problems.append(f"{rel}: more than one Tailwind sheet")
        if len(links) == 1:
            linked += 1
            href = links[0].group(2)
            expected = expected_src(path).rsplit("/", 1)[0] + "/tailwind.css"
            if href != expected:
                problems.append(f"{rel}: Tailwind sheet should be {expected}")
        elif rel in TAILWIND_PAGES:
            problems.append(f"{rel}: expected the Tailwind sheet")
    if linked != len(TAILWIND_PAGES):
        problems.append(
            f"assets/tailwind.css: expected {len(TAILWIND_PAGES)} pages to load it, found {linked}"
        )


def check_pages(data: dict, problems: list[str]) -> None:
    libraries = data.get("libraries")
    known = set(libraries) if isinstance(libraries, dict) else set()
    for path in sorted(ROOT.rglob("*.html")):
        text = path.read_text(encoding="utf-8")
        rel = path.relative_to(ROOT).as_posix()
        for pattern in FORBIDDEN_HTML:
            if pattern.search(text):
                problems.append(f"{rel}: still has its own {pattern.pattern} tag")
                break
        loaders = list(LOADER_RE.finditer(text))
        if len(loaders) > 1:
            problems.append(f"{rel}: more than one vendor loader")
        declared: set[str] = set()
        if len(loaders) == 1:
            attrs = parse_attrs(loaders[0].group(1))
            src = attrs.get("src", "")
            expected = expected_src(path)
            if src != expected:
                problems.append(f"{rel}: loader src should be {expected}")
            raw = attrs.get("data-libs", "")
            declared = {name for name in re.split(r"[\s,]+", raw) if name}
            if not declared:
                problems.append(f"{rel}: data-libs is empty")
            unknown = sorted(declared - known)
            if unknown:
                problems.append(f"{rel}: unknown libraries {', '.join(unknown)}")
            auto = attrs.get("data-katex-auto")
            if auto is not None and auto not in ("default", "dollars"):
                problems.append(f"{rel}: data-katex-auto must be default or dollars")
            if auto and "katex" not in declared:
                problems.append(f"{rel}: data-katex-auto requires katex")
        for lib, pattern in USAGE:
            if pattern.search(text) and lib not in declared:
                problems.append(f"{rel}: uses {lib} without the vendor loader")


def check_hashes(data: dict, problems: list[str]) -> None:
    libraries = data.get("libraries")
    if not isinstance(libraries, dict):
        return
    seen: set[str] = set()
    for name, entry in libraries.items():
        if not isinstance(entry, dict):
            continue
        for asset in entry.get("assets") or []:
            if not isinstance(asset, dict):
                continue
            url = asset.get("href") or asset.get("src")
            integrity = asset.get("integrity")
            if not isinstance(url, str) or not isinstance(integrity, str) or url in seen:
                continue
            seen.add(url)
            try:
                payload = fetch(url)
            except OSError as exc:
                problems.append(f"{name}: could not download {url} ({exc})")
                continue
            digest = "sha384-" + base64.b64encode(hashlib.sha384(payload).digest()).decode()
            if digest != integrity:
                problems.append(f"{name}: integrity does not match {url} (got {digest})")


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "demo-library-vendor-check"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def expected_src(path: Path) -> str:
    depth = len(path.relative_to(ROOT).parent.parts)
    return "../" * depth + "assets/vendor-loader.js"


def parse_attrs(raw: str) -> dict[str, str]:
    return {match.group(1): match.group(3) for match in ATTR_RE.finditer(raw)}


def read(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return None


if __name__ == "__main__":
    sys.exit(main())
