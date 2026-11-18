#!/usr/bin/env python3
"""Copy the Project Viz site into the Capacitor web directory.

The teaching pages stay in the repository root. This script refreshes
native-app/www from that root, downloads the pinned plot libraries named
in assets/vendor.json, checks their sha384 pins, and rewrites only the
copied registry so those files load from the app origin.

GitHub Pages keeps the CDN URLs. Do not edit www/. The next sync replaces it.

Run from anywhere:

    python3 native-app/scripts/sync_site.py
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import shutil
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

NATIVE_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = NATIVE_ROOT.parent
WWW = NATIVE_ROOT / "www"
MIRROR_PREFIX = "assets/vendor-mirror"

SKIP_DIRS = {
    ".git",
    ".github",
    ".cursor",
    ".gradle",
    ".idea",
    "native-app",
    "node_modules",
    "__pycache__",
}

CSS_URL = re.compile(
    r"""url\(\s*(?:'([^']+)'|"([^"]+)"|([^)'"\s]+))\s*\)""",
    re.IGNORECASE,
)

USER_AGENT = "project-viz-native-sync"


def main() -> int:
    if not (REPO_ROOT / "index.html").is_file():
        print(f"Site root is missing index.html: {REPO_ROOT}", file=sys.stderr)
        return 1
    source_registry = REPO_ROOT / "assets" / "vendor.json"
    source_text = source_registry.read_text(encoding="utf-8")
    if "cdn.jsdelivr.net" not in source_text:
        print(
            "assets/vendor.json no longer points at the jsDelivr pins. "
            "Refusing to sync until the published registry is intact.",
            file=sys.stderr,
        )
        return 1

    copied = copy_site()
    try:
        vendored = mirror_vendors(WWW / "assets" / "vendor.json")
    except (OSError, urllib.error.URLError, ValueError, json.JSONDecodeError) as exc:
        print(f"Vendor mirror failed: {exc}", file=sys.stderr)
        return 1

    registry_copy = (WWW / "assets" / "vendor.json").read_text(encoding="utf-8")
    if "cdn.jsdelivr.net" in registry_copy:
        print("Copied vendor.json still points at the CDN.", file=sys.stderr)
        return 1
    if "cdn.jsdelivr.net" not in source_registry.read_text(encoding="utf-8"):
        print("Sync rewrote the published vendor.json. That file must stay on the CDN.", file=sys.stderr)
        return 1

    print(f"Synced {copied} site files into {WWW}")
    print(f"Mirrored {len(vendored)} vendor files for offline plot libraries.")
    for path in vendored:
        print(f"  {path.relative_to(WWW).as_posix()}")
    return 0


def copy_site() -> int:
    if WWW.exists():
        shutil.rmtree(WWW)
    WWW.mkdir(parents=True)
    count = 0
    for dirpath, dirnames, filenames in os.walk(REPO_ROOT):
        dirnames[:] = sorted(
            name for name in dirnames if name not in SKIP_DIRS and not name.startswith(".git")
        )
        rel_dir = Path(dirpath).relative_to(REPO_ROOT)
        target_dir = WWW / rel_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        for name in filenames:
            if name == ".DS_Store" or name.endswith(".pyc"):
                continue
            src = Path(dirpath) / name
            if src.is_symlink() or not src.is_file():
                continue
            shutil.copy2(src, target_dir / name)
            count += 1
    return count


def mirror_vendors(registry_path: Path) -> list[Path]:
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    libraries = registry.get("libraries")
    if not isinstance(libraries, dict) or not libraries:
        raise ValueError("copied vendor.json has no libraries")

    written: dict[str, Path] = {}
    for entry in libraries.values():
        assets = entry.get("assets") if isinstance(entry, dict) else None
        if not isinstance(assets, list):
            continue
        for asset in assets:
            if not isinstance(asset, dict):
                continue
            field = "src" if asset.get("src") else "href" if asset.get("href") else ""
            if not field:
                raise ValueError(f"vendor asset has no src or href: {asset}")
            url = str(asset[field])
            dest = mirror_file(url, written, expected_integrity(asset.get("integrity")))
            asset[field] = "/" + dest.relative_to(WWW).as_posix()
            if asset.get("kind") == "style" or url.endswith(".css"):
                mirror_css_relatives(url, dest, written)

    registry_path.write_text(json.dumps(registry, indent=2) + "\n", encoding="utf-8")
    missing = [asset_path for asset_path in written.values() if not asset_path.is_file()]
    if missing:
        raise ValueError("mirror wrote a path that is not a file: " + str(missing[0]))
    return sorted(written.values())


def expected_integrity(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or not value.startswith("sha384-"):
        raise ValueError(f"vendor integrity is not sha384: {value!r}")
    return value


def mirror_file(url: str, written: dict[str, Path], integrity: str | None) -> Path:
    if url in written:
        dest = written[url]
        if integrity and integrity != sha384_file(dest):
            raise ValueError(f"integrity does not match {url}")
        return dest

    dest = WWW / mirror_rel(url)
    dest.parent.mkdir(parents=True, exist_ok=True)
    data = fetch(url)
    actual = "sha384-" + base64.b64encode(hashlib.sha384(data).digest()).decode("ascii")
    if integrity and actual != integrity:
        raise ValueError(f"integrity does not match {url} (got {actual})")
    dest.write_bytes(data)
    written[url] = dest
    return dest


def mirror_css_relatives(css_url: str, css_path: Path, written: dict[str, Path]) -> None:
    """Download files the stylesheet names with relative url().

    The CSS bytes stay as published so the sha384 pin still matches.
    Absolute urls are left for the network; KaTeX fonts are relative.
    """
    text = css_path.read_text(encoding="utf-8")
    for match in CSS_URL.finditer(text):
        ref = next(group for group in match.groups() if group)
        if ref.startswith(("data:", "#")):
            continue
        absolute = urllib.parse.urljoin(css_url, ref)
        absolute = urllib.parse.urlsplit(absolute)._replace(fragment="").geturl()
        if urllib.parse.urlsplit(absolute).scheme not in ("http", "https"):
            continue
        if urllib.parse.urlsplit(ref).scheme in ("http", "https"):
            continue
        mirror_file(absolute, written, None)


def mirror_rel(url: str) -> Path:
    parts = urllib.parse.urlsplit(url)
    path = urllib.parse.unquote(parts.path)
    if path.startswith("/npm/"):
        path = path[len("/npm/") :]
    path = path.lstrip("/")
    if not path or ".." in Path(path).parts:
        raise ValueError(f"vendor URL is not a safe file path: {url}")
    return Path(MIRROR_PREFIX) / path


def sha384_file(path: Path) -> str:
    digest = hashlib.sha384(path.read_bytes()).digest()
    return "sha384-" + base64.b64encode(digest).decode("ascii")


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            data = response.read()
    except urllib.error.HTTPError as exc:
        raise ValueError(f"{url} returned HTTP {exc.code}") from exc
    if not data:
        raise ValueError(f"{url} was empty")
    return data


if __name__ == "__main__":
    sys.exit(main())
