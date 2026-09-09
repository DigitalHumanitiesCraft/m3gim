"""Focused source-fidelity regressions for the E-301 transform contract."""

from collections import Counter
from pathlib import Path
import sys

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

import transform
from transform import (
    _inject_enrichment,
    add_relations_to_records,
    build_index_lookup,
    convert_objekt,
    process_verknuepfungen,
)


def _record():
    return {"@id": "m3gim-data:record_test", "@type": "rico:Record",
            "rico:identifier": "UAKUG/NIM_007 5_1"}


def test_unmodelled_row_is_retained_as_neutral_annotation():
    source = pd.DataFrame([{
        "archivsignatur": "UAKUG/NIM_007", "folio": "5_1",
        "typ": "aktivitaet", "name": "Probe", "rolle": "Teilnahme",
        "anmerkung": "wörtliche Notiz", "_xlsx_sheet": "Box 1", "_xlsx_row": 9,
    }])
    relations = process_verknuepfungen(source, {})
    record = _record()
    add_relations_to_records([record], relations)
    detail = record["m3gim-ontology:hasDetail"][0]
    assert detail["@type"] == "m3gim-ontology:Annotation"
    assert detail["m3gim-ontology:detailField"] == "aktivitaet"
    assert detail["m3gim-ontology:detailValue"] == "Probe"
    assert detail["m3gim-ontology:recordedRole"] == "Teilnahme"
    assert detail["rico:generalDescription"] == "wörtliche Notiz"


def test_join_only_row_does_not_create_a_statement():
    source = pd.DataFrame([{
        "archivsignatur": "UAKUG/NIM_007", "folio": "5_1",
        "typ": None, "name": None, "rolle": None, "anmerkung": None,
        "_xlsx_sheet": "Box 1", "_xlsx_row": 2925,
    }])
    assert process_verknuepfungen(source, {}) == {}


def test_type_only_row_is_reported_without_creating_a_statement(monkeypatch):
    monkeypatch.setattr(transform, "DROPS", Counter())
    monkeypatch.setattr(transform, "DROP_SAMPLES", {})
    source = pd.DataFrame([{
        "archivsignatur": "UAKUG/NIM_024", "folio": None,
        "typ": "dokument", "name": None, "rolle": None, "anmerkung": None,
        "_xlsx_sheet": "Box 3", "_xlsx_row": 2,
    }])

    assert process_verknuepfungen(source, {}) == {}
    assert transform.DROPS == Counter({"Verknuepfungszeile nur mit Typ": 1})
    assert transform.DROP_SAMPLES == {
        "Verknuepfungszeile nur mit Typ": ["Box 3 Zeile 2"]
    }


def test_each_substantive_untyped_field_keeps_the_row_neutral():
    rows = [
        {"name": "untypisierter Wert"},
        {"rolle": "untypisierte Rolle"},
        {"anmerkung": "alleinige Notiz"},
    ]
    for row_number, content in enumerate(rows, start=20):
        source_row = {
            "archivsignatur": "UAKUG/NIM_007", "folio": "5_1",
            "typ": None, "name": None, "rolle": None, "anmerkung": None,
            "_xlsx_sheet": "Box 1", "_xlsx_row": row_number,
        }
        source_row.update(content)
        relations = process_verknuepfungen(pd.DataFrame([source_row]), {})
        record = _record()
        add_relations_to_records([record], relations)
        detail = record["m3gim-ontology:hasDetail"][0]
        assert detail["@type"] == "m3gim-ontology:Annotation"
        assert detail["m3gim-ontology:xlsxSource"]["m3gim-ontology:xlsxRow"] == row_number
        if content.get("name"):
            assert detail["m3gim-ontology:recordedValue"] == content["name"]
        if content.get("rolle"):
            assert detail["m3gim-ontology:recordedRole"] == content["rolle"]
        if content.get("anmerkung"):
            assert detail["rico:generalDescription"] == content["anmerkung"]


def test_missing_currency_is_not_inferred_from_signature():
    record = _record()
    relations = {record["rico:identifier"]: [{
        "typ": "ausgaben", "name": "1200", "recordedType": "ausgaben",
        "recordedValue": "1200", "_source": {},
    }]}
    add_relations_to_records([record], relations)
    detail = record["m3gim-ontology:hasDetail"][0]
    assert detail["m3gim-ontology:monetaryAmount"]["@value"] == "1200"
    assert "m3gim-ontology:currency" not in detail


def test_index_conflict_emits_no_first_value():
    source = pd.DataFrame([
        {"m3gim_id": "P1", "name": "Person", "lebensdaten": "1900–1980"},
        {"m3gim_id": "P1", "name": "Person", "lebensdaten": "1901–1980"},
    ])
    result = build_index_lookup(source)["person"]
    assert result["index_conflict"] is True
    assert "lebensdaten" not in result


def test_wikidata_publication_date_has_own_property_and_provenance():
    entry = {}
    _inject_enrichment(entry, {"publicationDate": "1956-00-00"}, "Q1")
    assert entry["m3gim-ontology:wdPublicationDate"] == "1956"
    assert "m3gim-ontology:wdPremiereDate" not in entry
    source = entry["m3gim-ontology:propertySource"][0]
    assert source["m3gim-ontology:sourceProperty"] == "m3gim-ontology:wdPublicationDate"
    assert source["m3gim-ontology:sourceKind"] == "wikidata"


def test_local_mention_uses_authority_reference_instead_of_global_identity():
    record = _record()
    relations = {record["rico:identifier"]: [{
        "typ": "person", "name": "Person", "rolle": "Adressat",
        "wikidata_id": "Q1", "recordedType": "person",
        "recordedValue": "Person", "recordedRole": "Adressat", "_source": {},
    }]}
    add_relations_to_records([record], relations)
    mention = record["m3gim-ontology:hasAssociatedAgent"]
    assert "@id" not in mention
    assert "owl:sameAs" not in mention
    assert mention["m3gim-ontology:authorityReference"] == {"@id": "wd:Q1"}
    assert mention["m3gim-ontology:recordedRole"] == "Adressat"


def test_object_dating_evidence_is_preserved_verbatim():
    record = convert_objekt(pd.Series({
        "archivsignatur": "UAKUG/NIM_001", "entstehungsdatum": "1956",
        "datierungsevidenz": "aus_dokument",
    }))
    assert record["m3gim-ontology:datingEvidence"] == "aus_dokument"


def test_creation_date_projection_keeps_source_annotation():
    record = _record()
    relations = {record["rico:identifier"]: [{
        "typ": "datum", "name": "1956", "datum": "1956",
        "rolle": "erstelldatum", "recordedType": "datum",
        "recordedValue": "1956", "recordedRole": "erstelldatum",
        "_source": {"m3gim-ontology:xlsxSheet": "Box 1",
                    "m3gim-ontology:xlsxRow": 3},
    }]}
    annotations, _ = add_relations_to_records([record], relations)
    assert record["rico:creationDate"] == "1956"
    assert len(annotations) == 1
    assert annotations[0]["m3gim-ontology:recordedValue"] == "1956"
    assert annotations[0]["m3gim-ontology:xlsxSource"]["m3gim-ontology:xlsxRow"] == 3
