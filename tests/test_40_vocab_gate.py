"""Vokabular-Abdeckung als verbindliches Test-Gate.

Fuehrt `vocab/check-coverage.py` aus und failt, sobald der Pruefer eine
Abweichung meldet. Damit wird die Abdeckung des formalen Vokabulars gegen den
erzeugten Datensatz im Standardlauf mitgeprueft, statt nur als Handbefehl
verfuegbar zu sein.

Einbindung als eigener Prozess, aus drei Gruenden. Das Skript exportiert keine
aufrufbare Pruef-Funktion; seinen Befund baut `main()` intern zusammen und gibt
ihn ueber Konsole und Exit-Code aus. Der Dateiname traegt einen Bindestrich und
ist damit kein importierbarer Modulname. Und der Handbefehl aus `CLAUDE.md` und
dieses Gate laufen so ueber denselben Einstiegspunkt, koennen also nicht
auseinanderlaufen. Die vollstaendige Ausgabe des Skripts wandert in die
Assertion, sodass ein roter Lauf den fehlenden Term benennt.

Pfad-Overrides: `--data` folgt der conftest-Fixture (`M3GIM_JSONLD_PATH`),
`--vocab` folgt `M3GIM_VOCAB_PATH`.
"""

import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
CHECKER = REPO_ROOT / "vocab" / "check-coverage.py"
VOCAB_PATH = Path(os.environ.get("M3GIM_VOCAB_PATH", REPO_ROOT / "vocab" / "m3gim.ttl"))


def test_vocab_coverage_gate(jsonld_path):
    """Jeder im Datensatz verwendete m3gim-Term ist im Vokabular definiert."""
    assert CHECKER.exists(), f"Abdeckungspruefer fehlt: {CHECKER}"

    result = subprocess.run(
        [
            sys.executable,
            str(CHECKER),
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
        f"check-coverage.py meldet Abweichungen (Exit {result.returncode}):\n{report}"
    )
