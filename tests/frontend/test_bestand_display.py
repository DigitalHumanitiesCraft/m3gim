"""Exhaustive Bestand checks with rendering and source defects separated."""

import pytest

# Browser stack is an optional extra; skip instead of failing the default run.
pytest.importorskip("playwright")

import os
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).parent.parent.parent


def run_verifier(frontend_server: str, mode: str) -> subprocess.CompletedProcess:
    script = BASE / "tests" / "tools" / "verify_bestand_display.py"
    proc = subprocess.run(
        [sys.executable, str(script), "--mode", mode],
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
    return proc


def report_process(proc: subprocess.CompletedProcess) -> None:
    if proc.stdout:
        print(proc.stdout)
    if proc.stderr:
        print("STDERR:", proc.stderr, file=sys.stderr)


@pytest.mark.frontend
def test_bestand_renders_every_linked_basis_record(frontend_server):
    proc = run_verifier(frontend_server, "render")
    report_process(proc)
    assert proc.returncode == 0, "Bestand-Darstellung ist unvollständig"


@pytest.mark.frontend
@pytest.mark.data_quality
def test_bestand_source_rows_reach_jsonld(frontend_server):
    proc = run_verifier(frontend_server, "source")
    report_process(proc)
    assert proc.returncode == 0, "Objektzeilen fehlen im JSON-LD"
