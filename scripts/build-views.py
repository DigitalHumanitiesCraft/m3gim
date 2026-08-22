#!/usr/bin/env python3
"""
M³GIM Publishing Step

Copies the pipeline result into the frontend data directory.

The script once built four pre-aggregated derivatives (partitur, matrix,
kosmos, sankey). None of them was read by an active view, and their
generators carried a second, heuristic model of the data (composer guessed
from the title, opera detected by keyword) beside the pipeline's own. They
are retired; the curated part of their input is preserved in
data/curated/curated-biography.json.

The file name is kept because tests, knowledge documents and the decision
record address the script by it.

Usage:
    python scripts/build-views.py

Output:
    docs/data/m3gim.jsonld   (copy of data/output/m3gim.jsonld)
"""

import os
import shutil
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
_OUTPUT_BASE = Path(os.environ.get("M3GIM_OUTPUT_DIR", PROJECT_ROOT / 'data' / 'output'))
INPUT_FILE = Path(os.environ.get("M3GIM_JSONLD_PATH", _OUTPUT_BASE / 'm3gim.jsonld'))


def main():
    """Copy the pipeline result to the frontend data directory."""
    print('M³GIM Publishing Step')
    print('=' * 50)
    print(f'Input: {INPUT_FILE}')

    # Only the default output is published; a staging run writes to a temp
    # directory and must not overwrite the frontend data source.
    default_output = PROJECT_ROOT / 'data' / 'output'
    if _OUTPUT_BASE.resolve() != default_output.resolve():
        print(f'\nSkip copy to docs/data/ (non-default output: {_OUTPUT_BASE})')
        return 0

    docs_data = PROJECT_ROOT / 'docs' / 'data'
    if not INPUT_FILE.exists():
        print(f'\nFEHLER: {INPUT_FILE} nicht gefunden. Erst scripts/transform.py laufen lassen.')
        return 1
    if not docs_data.exists():
        print(f'\nFEHLER: {docs_data} fehlt.')
        return 1

    shutil.copy2(INPUT_FILE, docs_data / 'm3gim.jsonld')
    print()
    print('Copying to docs/data/:')
    print('  [CP] m3gim.jsonld -> docs/data/')
    print()
    print('Done!')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
