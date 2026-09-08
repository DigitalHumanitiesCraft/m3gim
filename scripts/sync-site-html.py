# /// script
# requires-python = ">=3.11"
# ///
"""Synchronize shared HTML regions without reading vocabulary or project data.

Usage:
    python scripts/sync-site-html.py
    python scripts/sync-site-html.py --check
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import _site_html as site_html


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="Nur veraltete Seiten melden")
    parser.add_argument("--docs", type=Path, default=site_html.DOCS)
    args = parser.parse_args()

    changed = site_html.sync_site_html(args.docs, write=not args.check)
    if args.check and changed:
        print(f"[FEHLER] gemeinsame HTML-Regionen veraltet: {', '.join(changed)}", file=sys.stderr)
        return 1
    state = ", ".join(changed) if changed else "unverändert"
    print(f"[OK] gemeinsame HTML-Regionen: {state}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
