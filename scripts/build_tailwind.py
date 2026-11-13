#!/usr/bin/env python3
"""Rebuild the pinned Tailwind sheet.

https://cdn.tailwindcss.com is the Tailwind Play CDN. It is not for
production, and it is not a pinned file. The URL currently serves
Tailwind CSS 3.4.17. This script runs that same compiler over the
demonstration HTML and writes assets/tailwind.css.

No package.json is required. The CLI is fetched with npx when you rebuild.

    python3 scripts/build_tailwind.py
    python3 scripts/build_tailwind.py --check
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION = "3.4.17"
INPUT = ROOT / "assets" / "tailwind.input.css"
CONFIG = ROOT / "assets" / "tailwind.config.js"
OUTPUT = ROOT / "assets" / "tailwind.css"
HEADER = (
    "/* Project Viz Tailwind utilities. tailwindcss "
    + VERSION
    + ". Built from assets/tailwind.input.css and assets/tailwind.config.js. "
    + "Do not edit by hand. Rebuild with python3 scripts/build_tailwind.py. */\n"
)


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    check = False
    if args == ["--check"]:
        check = True
    elif args:
        print("Usage: python3 scripts/build_tailwind.py [--check]", file=sys.stderr)
        return 2

    if shutil.which("npx") is None:
        print("npx is required to rebuild the Tailwind sheet.", file=sys.stderr)
        return 1

    with tempfile.TemporaryDirectory() as tmp:
        built = Path(tmp) / "tailwind.css"
        command = [
            "npx",
            "--yes",
            f"tailwindcss@{VERSION}",
            "--config",
            str(CONFIG),
            "--input",
            str(INPUT),
            "--output",
            str(built),
            "--minify",
        ]
        completed = subprocess.run(command, cwd=ROOT, check=False)
        if completed.returncode != 0:
            return completed.returncode
        body = built.read_text(encoding="utf-8")
        if body.startswith("/* Project Viz Tailwind utilities"):
            text = body if body.endswith("\n") else body + "\n"
        else:
            text = HEADER + body
            if not text.endswith("\n"):
                text += "\n"

    if check:
        current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.is_file() else ""
        if current != text:
            print(
                "assets/tailwind.css does not match tailwindcss "
                + VERSION
                + ". Run python3 scripts/build_tailwind.py",
                file=sys.stderr,
            )
            return 1
        print(f"Tailwind sheet matches tailwindcss {VERSION}. {integrity(text)}")
        return 0

    OUTPUT.write_text(text, encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} with tailwindcss {VERSION}. {integrity(text)}")
    return 0


def integrity(text: str) -> str:
    digest = base64.b64encode(hashlib.sha384(text.encode("utf-8")).digest()).decode()
    return "sha384-" + digest


if __name__ == "__main__":
    sys.exit(main())
