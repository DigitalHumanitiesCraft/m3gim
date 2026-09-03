"""Invarianten der Lauf-Diagnostik von scripts/transform.py.

Zwei Zusagen aus dem Projekt-Review (2026-07-18). Erstens meldet jeder Lauf,
wie viele Quellzeilen er verworfen hat, statt sie stumm fallen zu lassen.
Zweitens bricht ein Lauf ohne die Normdatendateien ab, statt einen vollstaendig
aussehenden, tatsaechlich entkernten Datensatz zu schreiben; ein bewusster Lauf
ohne Normdaten braucht M3GIM_ALLOW_NO_WIKIDATA=1.
"""

import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SCRIPTS = REPO_ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import transform  # noqa: E402


def test_drop_summary_reports_counts_and_samples(capsys):
    transform.DROPS.clear()
    transform.DROP_SAMPLES.clear()
    transform.record_drop("Testverwurf", "Box 1 Zeile 7")
    transform.record_drop("Testverwurf", "Box 1 Zeile 7")  # Dublette
    transform.record_drop("Testverwurf", "Box 1 Zeile 9")
    transform.print_drop_summary()
    out = capsys.readouterr().out
    transform.DROPS.clear()
    transform.DROP_SAMPLES.clear()

    assert "Testverwurf: 3" in out
    assert "Box 1 Zeile 7" in out and "Box 1 Zeile 9" in out
    # Dubletten belegen keinen Beispielplatz.
    assert out.count("Box 1 Zeile 7") == 1


def test_drop_summary_states_an_empty_tally(capsys):
    transform.DROPS.clear()
    transform.DROP_SAMPLES.clear()
    transform.print_drop_summary()
    assert "keine" in capsys.readouterr().out


def test_missing_wikidata_files_abort_the_run(tmp_path):
    """Ohne Reconciliation und Enrichment bricht der Lauf mit Exit 1 ab."""
    env = dict(os.environ)
    env["M3GIM_OUTPUT_DIR"] = str(tmp_path)
    env.pop("M3GIM_ALLOW_NO_WIKIDATA", None)
    proc = subprocess.run(
        [sys.executable, str(SCRIPTS / "transform.py")],
        capture_output=True, text=True, encoding="utf-8", env=env,
        cwd=str(REPO_ROOT),
    )
    assert proc.returncode == 1, proc.stdout[-2000:]
    assert "M3GIM_ALLOW_NO_WIKIDATA" in proc.stdout
    assert not (tmp_path / "m3gim.jsonld").exists(), (
        "Der abgebrochene Lauf darf keinen Datensatz hinterlassen"
    )
