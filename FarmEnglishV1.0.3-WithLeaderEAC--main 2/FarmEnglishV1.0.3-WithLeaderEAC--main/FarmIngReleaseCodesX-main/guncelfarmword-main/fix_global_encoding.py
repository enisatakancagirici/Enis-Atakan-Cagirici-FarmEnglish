#!/usr/bin/env python3
"""
Legacy wrapper.

Preferred workflow:
1) npm run encoding:fix
2) npm run encoding:audit
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parent
    cmd = ["node", "./scripts/encoding/fix.mjs", *sys.argv[1:]]
    completed = subprocess.run(cmd, cwd=root, check=False)
    return int(completed.returncode)


if __name__ == "__main__":
    raise SystemExit(main())
