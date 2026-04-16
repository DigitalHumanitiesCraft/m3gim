"""JSON-Schema-Validierung für m3gim.jsonld und partitur.json."""

import json
from pathlib import Path

import jsonschema
import pytest

SCHEMA_DIR = Path(__file__).parent / "schemas"


@pytest.fixture(scope="module")
def jsonld_schema():
    with open(SCHEMA_DIR / "m3gim_jsonld.schema.json", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def partitur_schema():
    with open(SCHEMA_DIR / "partitur.schema.json", encoding="utf-8") as f:
        return json.load(f)


def test_jsonld_valid_against_schema(jsonld, jsonld_schema):
    jsonschema.validate(jsonld, jsonld_schema)


def test_partitur_valid_against_schema(partitur, partitur_schema):
    jsonschema.validate(partitur, partitur_schema)


def test_dft_hierarchy_well_formed(graph):
    """skos:Concept-Knoten fuer m3gim-dft haben prefLabel, optional broader,
    und broader zeigt auf einen ebenfalls im Graph vorhandenen skos:Concept.

    Implementiert data.md Abschnitt 12 (hierarchische Dokumenttypen).
    """
    concepts = {n["@id"]: n for n in graph if n.get("@type") == "skos:Concept"}
    assert concepts, "Kein skos:Concept im Graph — dft-Hierarchie fehlt"

    missing_label = [cid for cid, n in concepts.items() if not n.get("skos:prefLabel")]
    assert not missing_label, f"skos:Concept ohne prefLabel: {missing_label[:5]}"

    unresolved = []
    for cid, n in concepts.items():
        broader = n.get("skos:broader")
        if not broader:
            continue
        bid = broader.get("@id") if isinstance(broader, dict) else broader
        if bid not in concepts:
            unresolved.append((cid, bid))
    assert not unresolved, f"skos:broader zeigt auf nicht-existente Konzepte: {unresolved[:5]}"


def test_dft_references_are_resolvable(graph, records):
    """Jeder rico:hasDocumentaryFormType eines Records verweist auf einen
    skos:Concept, der im Graph existiert. Sichert referentielle Integritaet
    der Dokumenttyp-Hierarchie."""
    concepts = {n["@id"] for n in graph if n.get("@type") == "skos:Concept"}
    missing = set()
    for r in records:
        dft = r.get("rico:hasDocumentaryFormType")
        if isinstance(dft, dict):
            dft_id = dft.get("@id", "")
            if dft_id.startswith("m3gim-dft:") and dft_id not in concepts:
                missing.add(dft_id)
    assert not missing, f"DFT-Referenzen ohne Konzept im Graph: {sorted(missing)[:5]}"
