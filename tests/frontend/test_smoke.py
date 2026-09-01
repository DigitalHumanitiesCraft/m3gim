"""Frontend-Smoke-Test als pytest-Case.

Marker: @pytest.mark.frontend — laeuft nur, wenn explizit aktiviert:

    pytest -m frontend

Startet einen kurzlebigen http.server auf einem zufaelligen Port,
fuehrt den Smoke-Durchlauf aus ``smoke.py`` aus und gibt die Liste
aller Probleme an pytest zurueck.
"""

import pytest

# Browser stack is an optional extra; skip instead of failing the default run.
pytest.importorskip("playwright")

import subprocess
import sys
from pathlib import Path

# frontend_server kommt aus tests/frontend/conftest.py


@pytest.mark.frontend
def test_frontend_smoke_no_fails(frontend_server):
    """Fuehrt tests/frontend/smoke.py gegen den gestarteten Server aus.

    Exit-Code 0 = alles OK, Exit-Code 1 = mindestens ein FAIL im Protokoll.
    """
    smoke = Path(__file__).parent / "smoke.py"
    proc = subprocess.run(
        [sys.executable, str(smoke)],
        env={
            **__import__("os").environ,
            "M3GIM_SMOKE_URL": frontend_server,
            "PYTHONIOENCODING": "utf-8",
        },
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=120,
    )
    # Protokoll an pytest-Output weiterreichen (Windows-Konsole kann die
    # Smoke-Icons ✓/✗/⚠ nicht codieren — auf ASCII mappen).
    def _ascii(s: str) -> str:
        return (s.replace("\u2713", "OK").replace("\u2717", "X")
                 .replace("\u26a0", "!").replace("\u2022", "*"))
    if proc.stdout:
        print(_ascii(proc.stdout))
    if proc.stderr:
        print("STDERR:", _ascii(proc.stderr), file=sys.stderr)
    assert proc.returncode == 0, (
        f"smoke.py exit-code {proc.returncode} — siehe Protokoll oben"
    )
