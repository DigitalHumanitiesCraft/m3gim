"""Determinismus: zweimaliger Pipeline-Lauf ergibt identischen Output.

Marker: slow — nur explizit ausführen mit `pytest -m slow`."""

import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent


@pytest.mark.slow
def test_transform_deterministic(tmp_path):
    """Führt transform.py zweimal aus und vergleicht Output (ohne Timestamps)."""
    # Kopiere Output weg vor Test
    original = REPO_ROOT / "data/output/m3gim.jsonld"
    if not original.exists():
        pytest.skip("m3gim.jsonld nicht vorhanden — Pipeline nicht gelaufen")

    backup = tmp_path / "original.jsonld"
    backup.write_bytes(original.read_bytes())

    try:
        # Lauf 1
        subprocess.run(
            [sys.executable, "scripts/transform.py"],
            cwd=REPO_ROOT, check=True, capture_output=True,
        )
        out1 = json.loads(original.read_text(encoding="utf-8"))

        # Lauf 2
        subprocess.run(
            [sys.executable, "scripts/transform.py"],
            cwd=REPO_ROOT, check=True, capture_output=True,
        )
        out2 = json.loads(original.read_text(encoding="utf-8"))

        # Timestamps rausrechnen
        for d in (out1, out2):
            d.pop("m3gim:exportDate", None)

        assert out1 == out2, "transform.py nicht deterministisch"
    finally:
        # Ursprünglichen Output wiederherstellen
        original.write_bytes(backup.read_bytes())
