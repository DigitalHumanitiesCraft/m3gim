"""Absorbing the dropdown rebuild of the Verknuepfungen table (team change 2026-07).

The cataloguing team moves the typ/rolle columns to dependent Google-Sheets
dropdowns. The pipeline must carry two export consequences:

1. Dropdown values cannot contain a comma, so the composite type
   "Datum, Ort" now reads "Datum_Ort" in the export. The underscore must be
   accepted as an equivalent composite separator, otherwise the ort,datum
   branch (SpatiotemporalEvent) silently loses every new row.
2. The XLSX export also carries hidden helper sheets and the "Typ-Rollen"
   sheet. load_verknuepfungen so far reads ALL sheets; sheets without the
   Verknuepfungen column signature (typ + name) must be skipped.
"""

import sys
from pathlib import Path

import pandas as pd
import pytest

SCRIPTS = Path(__file__).parent.parent / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from transform import (  # noqa: E402
    add_relations_to_records,
    decompose_komposit_typ,
    load_verknuepfungen,
    process_verknuepfungen,
)


# ---------------------------------------------------------------------------
# 1. Underscore as composite separator
# ---------------------------------------------------------------------------

def test_decompose_underscore_komposit():
    assert decompose_komposit_typ("Datum_Ort") == ["datum", "ort"]
    assert decompose_komposit_typ("datum_ort") == ["datum", "ort"]
    # Comma form stays valid (existing data)
    assert decompose_komposit_typ("ort, datum") == ["ort", "datum"]
    assert decompose_komposit_typ("person") == ["person"]


def test_datum_ort_underscore_emits_spatiotemporal():
    """A Datum_Ort row must take the same STE path as 'ort, datum'."""
    df = pd.DataFrame([{
        "archivsignatur": "NIM_003",
        "typ": "Datum_Ort",
        "name": "München, 1952-12-17",
        "rolle": "aufführung",
        "anmerkung": None,
    }])
    indices = {"person": {}, "organisation": {}, "ort": {}, "werk": {}}
    relations = process_verknuepfungen(df, indices)

    rels = relations.get("NIM_003", [])
    ste = [r for r in rels if r.get("typ") == "spatiotemporal"]
    assert len(ste) == 1, f"Kein SpatiotemporalEvent emittiert: {rels}"
    assert ste[0]["ort"] == "München"
    assert ste[0]["datum"] == "1952-12-17"


def test_qualified_ort_datum_keeps_place_and_literal_boundary():
    """A source boundary remains attached to its explicitly named place."""
    df = pd.DataFrame([{
        "archivsignatur": "NIM_004",
        "typ": "ort, datum",
        "name": "Wien, ab 1956",
        "rolle": "Spielzeit",
        "anmerkung": "Staatsoper Wien",
    }])
    indices = {"person": {}, "organisation": {}, "ort": {}, "werk": {}}

    relations = process_verknuepfungen(df, indices)
    rels = relations["NIM_004"]
    ste = [rel for rel in rels if rel.get("typ") == "spatiotemporal"]

    assert len(ste) == 1
    assert ste[0]["ort"] == "Wien"
    assert ste[0]["datum"] == "ab 1956"
    assert not any(rel.get("typ") == "datum" for rel in rels)


@pytest.mark.parametrize("raw", ["1956-11-21", "06-09"])
def test_undivided_ort_datum_stays_one_neutral_source_statement(raw):
    """One cell without two components does not assert two dimensions."""
    df = pd.DataFrame([{
        "archivsignatur": "NIM_004",
        "typ": "ort, datum",
        "name": raw,
        "rolle": "Spielzeit",
        "anmerkung": "Quellnotiz",
        "_xlsx_sheet": "Box 1",
        "_xlsx_row": 408,
    }])
    indices = {"person": {}, "organisation": {}, "ort": {}, "werk": {}}

    relations = process_verknuepfungen(df, indices)
    rels = relations["NIM_004"]

    assert len(rels) == 1
    assert rels[0]["typ"] == "unmodelled_composite"
    assert rels[0]["recordedType"] == "ort, datum"
    assert rels[0]["recordedValue"] == raw
    assert rels[0]["recordedRole"] == "Spielzeit"
    assert rels[0]["anmerkung"] == "Quellnotiz"
    assert rels[0]["_source"] == {
        "m3gim-ontology:xlsxSheet": "Box 1",
        "m3gim-ontology:xlsxRow": 408,
    }

    record = {"@id": "m3gim-data:NIM_004", "@type": "rico:Record",
              "rico:identifier": "NIM_004"}
    annotations, performances = add_relations_to_records([record], relations)
    details = record.get("m3gim-ontology:hasDetail", [])
    details = details if isinstance(details, list) else [details]

    assert annotations == [] and performances == []
    assert len(details) == 1
    assert details[0]["@type"] == "m3gim-ontology:Annotation"
    assert details[0]["m3gim-ontology:detailField"] == "ort, datum"
    assert details[0]["m3gim-ontology:detailValue"] == raw
    assert details[0]["rico:generalDescription"] == "Quellnotiz"
    assert "m3gim-ontology:atPlace" not in details[0]
    assert "m3gim-ontology:atDate" not in details[0]
    assert "rico:hasOrHadLocation" not in record
    assert "m3gim-ontology:hasAnnotation" not in record


def test_bare_waehrung_typ_emits_no_relation():
    """A bare type 'währung' (no composite) is not a type value of its own and
    must not create a relation. The unconditional decompose call filters it to
    an empty list instead of letting it through as a generic relation."""
    df = pd.DataFrame([{
        "archivsignatur": "NIM_003",
        "typ": "währung",
        "name": "RM",
        "rolle": None,
        "anmerkung": None,
    }])
    indices = {"person": {}, "organisation": {}, "ort": {}, "werk": {}}
    relations = process_verknuepfungen(df, indices)

    assert relations.get("NIM_003", []) == [], (
        f"Nackter währung-Typ erzeugte eine Relation: {relations.get('NIM_003')}"
    )


# ---------------------------------------------------------------------------
# 2. Helper sheets in the export are not read as Verknuepfungen
# ---------------------------------------------------------------------------

def test_helper_sheets_are_skipped(tmp_path):
    xlsx = tmp_path / "verk.xlsx"
    verk = pd.DataFrame([
        {"archivsignatur": "NIM_003", "Folio": None, "datenpunkt_id": "dp1",
         "Typ": "person", "Name": "Karajan, Herbert von",
         "Rolle": "Dirigent:in", "Anmerkung": None},
    ])
    # Worst case: helper sheet with both typ- and rolle-like columns
    typ_rollen = pd.DataFrame([
        {"Typ": "person", "Rollen": "Adressat, Empfänger, Dirigent"},
        {"Typ": "ort", "Rollen": "Aufführungsort, Zielort"},
    ])
    hilfs = pd.DataFrame({"Rollen": ["Adressat", "Empfänger"]})

    with pd.ExcelWriter(xlsx, engine="openpyxl") as writer:
        verk.to_excel(writer, sheet_name="Verknuepfungen", index=False)
        typ_rollen.to_excel(writer, sheet_name="Typ-Rollen", index=False)
        hilfs.to_excel(writer, sheet_name="Hilfstabelle_Person", index=False)

    df = load_verknuepfungen(xlsx)

    assert set(df["_xlsx_sheet"].unique()) == {"Verknuepfungen"}, (
        "Hilfsblaetter wurden als Verknuepfungen eingelesen: "
        f"{sorted(df['_xlsx_sheet'].unique())}"
    )
    assert list(df["archivsignatur"]) == ["NIM_003"]
