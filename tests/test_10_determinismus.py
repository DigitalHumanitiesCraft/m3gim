"""Determinismus: zweimaliger Pipeline-Lauf ergibt identischen Output.

Marker: slow — nur explizit ausführen mit `pytest -m slow`.

Der Unterprozess bekommt ein eigenes, leeres Ausgabeverzeichnis gesetzt, statt
die Umgebung des Testlaufs zu erben. Sonst schrieb `transform.py` bei gesetztem
`M3GIM_OUTPUT_DIR` ins Ausweichverzeichnis, während der Test die unberührte
Produktionsdatei zweimal mit sich selbst verglich und ohne echte Prüfung grün
meldete. Die Produktionsdatei wird jetzt gar nicht mehr angefasst.
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent

# transform.py liest die Wikidata-Normdaten aus seinem eigenen Ausgabe-
# verzeichnis. Fehlen sie dort, laeuft es still ohne Anreicherung weiter
# (pipeline-architecture.md § ENV-Overrides), und der Vergleich liefe auf einem
# verarmten Datensatz. Deshalb vorher hinueberkopieren.
NORMDATA_FILES = ("wikidata-reconciliation.json", "wikidata-enrichment.json")


def _source_output_dir() -> Path:
    return Path(os.environ.get("M3GIM_OUTPUT_DIR", REPO_ROOT / "data" / "output"))


@pytest.mark.slow
def test_transform_deterministic(tmp_path):
    """Führt transform.py zweimal in ein eigenes Verzeichnis aus und vergleicht (ohne Timestamps)."""
    out_dir = tmp_path / "output"
    out_dir.mkdir()
    for name in NORMDATA_FILES:
        src = _source_output_dir() / name
        if src.exists():
            shutil.copy2(src, out_dir / name)

    env = {**os.environ, "M3GIM_OUTPUT_DIR": str(out_dir)}
    target = out_dir / "m3gim.jsonld"

    runs = []
    for lauf in (1, 2):
        target.unlink(missing_ok=True)
        subprocess.run(
            [sys.executable, "scripts/transform.py"],
            cwd=REPO_ROOT, check=True, capture_output=True, env=env,
        )
        assert target.exists(), (
            f"Lauf {lauf}: transform.py hat nicht nach $M3GIM_OUTPUT_DIR "
            f"({out_dir}) geschrieben — der Vergleich haette eine Fremddatei geprüft."
        )
        runs.append(json.loads(target.read_text(encoding="utf-8")))

    # Timestamps rausrechnen
    for d in runs:
        d.pop("m3gim:exportDate", None)

    assert runs[0] == runs[1], "transform.py nicht deterministisch"
