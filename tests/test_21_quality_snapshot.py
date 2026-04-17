"""Quality-Snapshot-JSON-Kontrakt (Session 32, E-75).

Der Tab "Erschliessungsstand" im Frontend konsumiert
data/reports/quality-snapshot.json. Dieser Test sichert die
Top-Level-Struktur ab — Pipeline-Aenderungen, die Frontend-Annahmen
brechen, sollen hier rot werden.

Quelle: scripts/report-quality.py. Generiert wird die Datei bei jedem
Pipeline-Lauf (report-quality.py schreibt MD + JSON parallel).
"""

import json
from pathlib import Path

import pytest


SNAPSHOT = Path(__file__).resolve().parents[1] / "data" / "reports" / "quality-snapshot.json"


@pytest.fixture(scope="module")
def snapshot():
    if not SNAPSHOT.exists():
        pytest.skip(f"Quality-Snapshot-JSON nicht vorhanden: {SNAPSHOT}")
    return json.loads(SNAPSHOT.read_text(encoding="utf-8"))


def test_top_level_keys(snapshot):
    # Frontend erwartet genau diese Top-Level-Keys.
    for key in ("generated", "source", "coverage", "wikidata", "blockers"):
        assert key in snapshot, f"Pflichtfeld fehlt: {key}"


def test_coverage_shape(snapshot):
    cov = snapshot["coverage"]
    for key in ("link_rate", "konvolute_multi", "single_aggregate",
                "bearbeitungsstand", "provenance"):
        assert key in cov, f"coverage.{key} fehlt"

    lr = cov["link_rate"]
    for k in ("linked", "total", "pct"):
        assert k in lr

    prov = cov["provenance"]
    for k in ("records_with_xlsx", "records_with_agrelon_provenance",
              "nested_with_xlsx"):
        assert k in prov
        for field in ("n", "total", "pct"):
            assert field in prov[k], f"provenance.{k}.{field} fehlt"


def test_wikidata_shape(snapshot):
    wd = snapshot["wikidata"]
    assert "summary" in wd
    for k in ("matched", "unmatched", "skipped"):
        assert k in wd["summary"]

    assert "by_type" in wd
    assert isinstance(wd["by_type"], list)
    for row in wd["by_type"]:
        for field in ("type", "exact", "fuzzy_high", "fuzzy_low", "total"):
            assert field in row, f"by_type-Feld fehlt: {field}"

    assert "low_confidence" in wd
    assert isinstance(wd["low_confidence"], list)


def test_blockers_shape(snapshot):
    blockers = snapshot["blockers"]
    assert isinstance(blockers, list)
    assert len(blockers) > 0, "Erwarte mindestens einen dokumentierten Blocker"
    for b in blockers:
        for field in ("id", "title", "description"):
            assert field in b, f"Blocker-Feld fehlt: {field}"
