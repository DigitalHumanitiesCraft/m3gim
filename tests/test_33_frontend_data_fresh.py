"""Frontend data freshness: docs/data mirrors data/output.

Closes the bug class uncovered in session 50: commit ada6445 (E-97) regenerated
data/output/m3gim.jsonld (+15 mobility STE), but build-views.py was never rerun,
so docs/data/m3gim.jsonld lagged a model wave behind and the 15 events never
reached the frontend.

build-views.py copies m3gim.jsonld unfiltered from data/output to docs/data via
shutil.copy2. After a full pipeline run the @graph of both files MUST therefore
be identical. If it diverges, docs/data is stale and
'python scripts/build-views.py' must run.

Skips on staging runs (M3GIM_JSONLD_PATH / M3GIM_OUTPUT_DIR set): then
data/output points to a temp directory and the production invariant does not
hold.
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

pytestmark = [
    pytest.mark.skipif(
        _STAGING,
        reason="Staging-Lauf (ENV-Override aktiv) — Produktions-Frische nicht anwendbar",
    ),
]


def _graph(path: Path) -> list:
    with open(path, encoding="utf-8") as f:
        return json.load(f)["@graph"]


def _count_annotations(graph: list) -> int:
    n = 0
    for node in graph:
        t = node.get("@type")
        types = t if isinstance(t, list) else [t]
        if "m3gim-ontology:Annotation" in types:
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


def test_docs_data_graph_equals_output(output_graph, docs_graph):
    """Full @graph equality: build-views.py is a pure copy.

    Fully subsumes the formerly adjacent node count and annotation count (bug
    class from session 50); the message still names both sizes so a red run
    immediately shows whether nodes are missing or only values differ.
    """
    assert docs_graph == output_graph, (
        f"docs/data/m3gim.jsonld weicht von data/output/m3gim.jsonld ab "
        f"(Frontend {len(docs_graph)} Knoten / "
        f"{_count_annotations(docs_graph)} Annotationen, Pipeline-Output "
        f"{len(output_graph)} / {_count_annotations(output_graph)}). "
        "build-views.py kopiert ungefiltert; eine Abweichung heisst, der Copy "
        "lief nach der letzten Output-Regeneration nicht. "
        "'python scripts/build-views.py' ausfuehren."
    )
