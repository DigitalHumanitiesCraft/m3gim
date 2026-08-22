"""Gegenrichtung der Vokabular-Abdeckung: kein deklarierter Term ohne Belegung.

`tests/test_40_vocab_gate.py` sichert die eine Richtung, dass kein im Datensatz
verwendeter Term undeklariert bleibt. Die Gegenrichtung war blind. Ein Term
kann deklariert werden, nie Daten tragen und trotzdem in Modell, Dokumentation
und Frontend mitgeführt werden; er kostet dann Pflege, ohne etwas auszusagen.
Vier Properties stehen heute in diesem Zustand.

Entschuldigt ist ein leerer Term durch eine `skos:editorialNote`, die mit dem
Marker `unused:` beginnt und den Grund nennt. Der Grund steht damit am Term
selbst und wandert mit ihm, statt in einer Ausnahmeliste im Testcode zu leben.

Der Test läuft über denselben Einstiegspunkt wie der Handbefehl, also
`vocab/check-coverage.py --vacancy`, damit Skript und Gate nicht auseinander
laufen können. Die Begründung für den eigenen Prozess steht in
`tests/test_40_vocab_gate.py`.

Der xfail-Marker ist strikt. Sobald Phase 4 des Implementierungsplans die vier
Terme füllt, entfernt oder mit ihrer Notiz versieht, schlägt der Test als XPASS
an und verlangt, dass der Marker gezogen wird.
"""

import os
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
CHECKER = REPO_ROOT / "vocab" / "check-coverage.py"
VOCAB_PATH = Path(os.environ.get("M3GIM_VOCAB_PATH", REPO_ROOT / "vocab" / "m3gim.ttl"))


@pytest.mark.xfail(
    reason="Phase 4 des Implementierungsplans nicht umgesetzt", strict=True
)
def test_no_declared_term_without_data(jsonld_path):
    """Jeder deklarierte m3gim-Term trägt Daten oder nennt den Grund seiner Leere."""
    assert CHECKER.exists(), f"Abdeckungspruefer fehlt: {CHECKER}"

    result = subprocess.run(
        [
            sys.executable,
            str(CHECKER),
            "--vacancy",
            "--vocab", str(VOCAB_PATH),
            "--data", str(jsonld_path),
        ],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    report = f"{result.stdout}{result.stderr}".strip()

    # Guards against a silent no-op: the checker must have parsed the vocabulary.
    assert "OK Vokabular geparst" in result.stdout, (
        f"check-coverage.py hat das Vokabular nicht geparst:\n{report}"
    )
    assert result.returncode == 0, (
        f"Deklarierte Terme ohne Belegung und ohne Notiz (Exit {result.returncode}):\n{report}"
    )
