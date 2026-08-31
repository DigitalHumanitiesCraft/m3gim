"""
M3GIM Test Fixtures — session-scoped loaders.

Paths are overridable via ENV for v2 pipeline runs:
  M3GIM_JSONLD_PATH       — default: data/output/m3gim.jsonld
  M3GIM_SHEETS_DIR        — default: data/google-spreadsheet
  M3GIM_ENRICHMENT_PATH   — default: data/output/wikidata-enrichment.json
  M3GIM_RECONCILIATION_PATH — default: data/output/wikidata-reconciliation.json
"""

import json
import os
from pathlib import Path

import pandas as pd
import pytest

REPO_ROOT = Path(__file__).parent.parent


def _path(env_var: str, default_rel: str) -> Path:
    return Path(os.environ.get(env_var, REPO_ROOT / default_rel))


@pytest.fixture(scope="session")
def jsonld_path() -> Path:
    return _path("M3GIM_JSONLD_PATH", "data/output/m3gim.jsonld")


@pytest.fixture(scope="session")
def sheets_dir() -> Path:
    return _path("M3GIM_SHEETS_DIR", "data/google-spreadsheet")


@pytest.fixture(scope="session")
def enrichment_path() -> Path:
    return _path("M3GIM_ENRICHMENT_PATH", "data/output/wikidata-enrichment.json")


@pytest.fixture(scope="session")
def reconciliation_path() -> Path:
    return _path("M3GIM_RECONCILIATION_PATH", "data/output/wikidata-reconciliation.json")


@pytest.fixture(scope="session")
def jsonld(jsonld_path: Path) -> dict:
    with open(jsonld_path, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="session")
def graph(jsonld: dict) -> list:
    return jsonld["@graph"]


@pytest.fixture(scope="session")
def records(graph: list) -> list:
    return [n for n in graph if n.get("@type") == "rico:Record"]


@pytest.fixture(scope="session")
def konvolute(graph: list) -> list:
    """Record-Sets außer dem Fonds."""
    result = []
    for n in graph:
        if n.get("@type") != "rico:RecordSet":
            continue
        set_type = n.get("rico:hasRecordSetType", {})
        if isinstance(set_type, dict) and set_type.get("@id") == "ric-rst:Fonds":
            continue
        result.append(n)
    return result


@pytest.fixture(scope="session")
def fonds(graph: list) -> dict:
    for n in graph:
        st = n.get("rico:hasRecordSetType", {})
        if isinstance(st, dict) and st.get("@id") == "ric-rst:Fonds":
            return n
    raise RuntimeError("Kein Fonds im Graph")


@pytest.fixture(scope="session")
def xlsx_objekte(sheets_dir: Path) -> pd.DataFrame:
    df = pd.read_excel(sheets_dir / "M3GIM-Objekte.xlsx")
    df.columns = [c.lower().strip() if isinstance(c, str) else c for c in df.columns]
    return df


@pytest.fixture(scope="session")
def xlsx_verknuepfungen(sheets_dir: Path) -> pd.DataFrame:
    """Die Verknuepfungstabelle ueber den Loader der Pipeline.

    Quellformat ist seit E-152 die CSV-Ausfuhr je Blatt unter
    ``verknuepfungen/``; der Loader nimmt daneben weiter die Mehrblatt-Mappe
    an (E-95). Der Fixture-Name bleibt, weil ihn ein Dutzend Testdateien
    adressiert; er benennt die Tabelle, nicht ihr Dateiformat.
    """
    import sys
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    from transform import load_verknuepfungen  # noqa: WPS433

    return load_verknuepfungen(sheets_dir)


@pytest.fixture(scope="session")
def xlsx_personen(sheets_dir: Path) -> pd.DataFrame:
    df = pd.read_excel(sheets_dir / "M3GIM-Personenindex.xlsx")
    df.columns = [c.lower().strip() if isinstance(c, str) else c for c in df.columns]
    return df


@pytest.fixture(scope="session")
def enrichment(enrichment_path: Path):
    if not enrichment_path.exists():
        return None
    with open(enrichment_path, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="session")
def reconciliation(reconciliation_path: Path):
    if not reconciliation_path.exists():
        return None
    with open(reconciliation_path, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="session")
def baseline() -> dict:
    with open(REPO_ROOT / "tests/fixtures/baseline_counts.json", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Hilfsfunktionen via _helpers.py (importierbar aus Tests)
# ---------------------------------------------------------------------------

from _helpers import ensure_list, iter_strings, iter_entities_with_id  # re-export


@pytest.fixture(scope="session")
def helpers():
    """Hilfsmodul als Objekt, damit Tests die Funktionen nutzen koennen."""
    class H:
        ensure_list = staticmethod(ensure_list)
        iter_strings = staticmethod(iter_strings)
        iter_entities_with_id = staticmethod(iter_entities_with_id)
    return H()
