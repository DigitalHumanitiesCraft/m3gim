"""Frontend-Daten-Frische: docs/data spiegelt data/output.

Schliesst die Bug-Klasse, die in Session 50 aufgedeckt wurde: Commit ada6445
(E-97) regenerierte data/output/m3gim.jsonld (+15 Mobilitaets-STE), aber
build-views.py wurde nie erneut ausgefuehrt, sodass docs/data/m3gim.jsonld
eine Modell-Welle zurueckhing und die 15 Events nie ins Frontend gelangten.

build-views.py kopiert m3gim.jsonld via shutil.copy2 ungefiltert von
data/output nach docs/data. Nach einem vollstaendigen Pipeline-Lauf MUSS der
@graph beider Dateien daher identisch sein. Weicht er ab, ist docs/data stale
und 'python scripts/build-views.py' muss laufen.

Skippt bei Staging-Laeufen (M3GIM_JSONLD_PATH / M3GIM_OUTPUT_DIR gesetzt): dann
zeigt data/output auf ein Temp-Verzeichnis und die Produktions-Invariante gilt
nicht.
"""

import json
import os
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
OUTPUT_JSONLD = REPO_ROOT / "data" / "output" / "m3gim.jsonld"
DOCS_JSONLD = REPO_ROOT / "docs" / "data" / "m3gim.jsonld"

# A staging run redirects the pipeline to a temp dir; the production
# output<->docs relationship is meaningless there.
_STAGING = bool(os.environ.get("M3GIM_JSONLD_PATH") or os.environ.get("M3GIM_OUTPUT_DIR"))

pytestmark = pytest.mark.skipif(
    _STAGING, reason="Staging-Lauf (ENV-Override aktiv) — Produktions-Frische nicht anwendbar"
)


def _graph(path: Path) -> list:
    with open(path, encoding="utf-8") as f:
        return json.load(f)["@graph"]


def _count_ste(graph: list) -> int:
    n = 0
    for node in graph:
        t = node.get("@type")
        types = t if isinstance(t, list) else [t]
        if "m3gim:SpatiotemporalEvent" in types:
            n += 1
    return n


@pytest.fixture(scope="module")
def output_graph() -> list:
    if not OUTPUT_JSONLD.exists():
        pytest.skip(f"Kein Pipeline-Output: {OUTPUT_JSONLD}")
    return _graph(OUTPUT_JSONLD)


@pytest.fixture(scope="module")
def docs_graph() -> list:
    if not DOCS_JSONLD.exists():
        pytest.skip(f"Keine Frontend-Datenquelle: {DOCS_JSONLD}")
    return _graph(DOCS_JSONLD)


def test_docs_data_node_count_matches_output(output_graph, docs_graph):
    """Knotenzahl Frontend == Pipeline-Output."""
    assert len(docs_graph) == len(output_graph), (
        f"docs/data hat {len(docs_graph)} Knoten, data/output {len(output_graph)}. "
        "docs/data ist stale — 'python scripts/build-views.py' ausfuehren."
    )


def test_docs_data_ste_count_matches_output(output_graph, docs_graph):
    """STE-Zahl identisch — die konkrete Bug-Klasse aus Session 50."""
    out_ste = _count_ste(output_graph)
    docs_ste = _count_ste(docs_graph)
    assert docs_ste == out_ste, (
        f"Frontend zeigt {docs_ste} SpatiotemporalEvents, Pipeline-Output {out_ste}. "
        "Mobilitaets-Events fehlen im Frontend — 'python scripts/build-views.py' ausfuehren."
    )


def test_docs_data_graph_equals_output(output_graph, docs_graph):
    """Vollstaendige @graph-Gleichheit: build-views.py ist ein reiner Copy."""
    assert docs_graph == output_graph, (
        "docs/data/m3gim.jsonld weicht von data/output/m3gim.jsonld ab. "
        "build-views.py kopiert ungefiltert; eine Abweichung heisst, der Copy "
        "lief nach der letzten Output-Regeneration nicht. "
        "'python scripts/build-views.py' ausfuehren."
    )
