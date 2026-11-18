#!/usr/bin/env python3
"""Point the Android project at ANDROID_HOME.

Gradle reads sdk.dir from android/local.properties. That file is
machine-specific and gitignored. When ANDROID_HOME or ANDROID_SDK_ROOT
is set, this writes it. When neither is set and the file already exists,
Gradle keeps using that file.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

NATIVE_ROOT = Path(__file__).resolve().parent.parent
DEST = NATIVE_ROOT / "android" / "local.properties"


def main() -> int:
    if not (NATIVE_ROOT / "android" / "gradlew").is_file():
        print(
            "android/ is missing. From native-app, run: npx cap add android",
            file=sys.stderr,
        )
        return 1

    sdk = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    if not sdk:
        if DEST.is_file():
            print(f"ANDROID_HOME is unset. Leaving {DEST} in place.")
            return 0
        print(
            "ANDROID_HOME is not set, and android/local.properties is missing. "
            "Install the Android SDK and export ANDROID_HOME.",
            file=sys.stderr,
        )
        return 1

    sdk_path = Path(sdk).expanduser()
    if not sdk_path.is_dir():
        print(f"ANDROID_HOME is not a directory: {sdk_path}", file=sys.stderr)
        return 1

    location = sdk_path.resolve().as_posix()
    if os.name == "nt":
        location = str(sdk_path.resolve()).replace("\\", "\\\\").replace(":", "\\:")
    DEST.write_text(f"sdk.dir={location}\n", encoding="utf-8")
    print(f"Wrote {DEST}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
