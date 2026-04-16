"""
M3GIM Test Fixtures — session-scoped loaders.

Paths are overridable via ENV for v2 pipeline runs:
  M3GIM_JSONLD_PATH       — default: data/output/m3gim.jsonld
  M3GIM_PARTITUR_PATH     — default: data/output/views/partitur.json
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
def partitur_path() -> Path:
    return _path("M3GIM_PARTITUR_PATH", "data/output/views/partitur.json")


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
        if isinstance(set_type, dict) and set_type.get("@id") == "rico:Fonds":
            continue
        result.append(n)
    return result


@pytest.fixture(scope="session")
def fonds(graph: list) -> dict:
    for n in graph:
        st = n.get("rico:hasRecordSetType", {})
        if isinstance(st, dict) and st.get("@id") == "rico:Fonds":
            return n
    raise RuntimeError("Kein Fonds im Graph")


@pytest.fixture(scope="session")
def partitur(partitur_path: Path) -> dict:
    with open(partitur_path, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="session")
def xlsx_objekte(sheets_dir: Path) -> pd.DataFrame:
    df = pd.read_excel(sheets_dir / "M3GIM-Objekte.xlsx")
    df.columns = [c.lower().strip() if isinstance(c, str) else c for c in df.columns]
    return df


@pytest.fixture(scope="session")
def xlsx_verknuepfungen(sheets_dir: Path) -> pd.DataFrame:
    # Filename has umlaut variant
    for name in ["M3GIM-Verknüpfungen.xlsx", "M3GIM-Verknuepfungen.xlsx"]:
        p = sheets_dir / name
        if p.exists():
            df = pd.read_excel(p)
            df.columns = [c.lower().strip() if isinstance(c, str) else c for c in df.columns]
            return df
    raise FileNotFoundError(f"Keine Verknüpfungs-XLSX in {sheets_dir}")


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
