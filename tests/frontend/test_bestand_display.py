"""DOM-Abgleich der Bestand-Liste als pytest-Case.

Marker: @pytest.mark.frontend — laeuft nur, wenn explizit aktiviert:

    pytest -m frontend

Fuehrt tests/tools/verify_bestand_display.py gegen einen kurzlebigen
Server aus. Das Skript vergleicht Quell-CSV -> docs/data/m3gim.jsonld ->
gerendertes DOM Zeile fuer Zeile; jeder Befund macht den Test rot.
Bekannte Quellbefunde (etwa die leere Objektzeile zu Folio 11_62)
erscheinen hier, bis das Erschliessungsteam die Quelle korrigiert —
derselbe Charakter wie der Datenspiegel, nur ueber die Browser-Schicht.
"""

import pytest

# Browser stack is an optional extra; skip instead of failing the default run.
pytest.importorskip("playwright")

import os
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).parent.parent.parent


@pytest.mark.frontend
@pytest.mark.data_quality
def test_bestand_display_matches_source(frontend_server):
    script = BASE / "tests" / "tools" / "verify_bestand_display.py"
    proc = subprocess.run(
        [sys.executable, str(script)],
        env={
            **os.environ,
            "M3GIM_VERIFY_URL": frontend_server,
            "PYTHONIOENCODING": "utf-8",
        },
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=300,
    )
    if proc.stdout:
        print(proc.stdout)
    if proc.stderr:
        print("STDERR:", proc.stderr, file=sys.stderr)
    assert proc.returncode == 0, (
        "verify_bestand_display.py meldet Befunde — siehe Ausgabe oben und "
        "data/reports/frontend-verification-bestand.md"
    )
