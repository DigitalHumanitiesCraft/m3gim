"""Absorption des Dropdown-Umbaus der Verknuepfungstabelle (Team-Aenderung 2026-07).

Das Erschliessungsteam stellt die Spalten typ/rolle auf abhaengige
Google-Sheets-Dropdowns um. Zwei Export-Folgen muss die Pipeline tragen:

1. Dropdown-Werte koennen kein Komma enthalten; der Komposit-Typ
   "Datum, Ort" heisst im Export jetzt "Datum_Ort". Der Unterstrich ist
   als gleichwertiger Komposit-Trenner zu akzeptieren, sonst verliert
   der ort,datum-Zweig (SpatiotemporalEvent) alle neuen Zeilen still.
2. Der XLSX-Export enthaelt zusaetzlich versteckte Hilfsblaetter und das
   Blatt "Typ-Rollen". load_verknuepfungen liest bislang ALLE Sheets;
   Blaetter ohne Verknuepfungs-Spaltensignatur (typ + name) muessen
   uebersprungen werden.
"""

import sys
from pathlib import Path

import pandas as pd

SCRIPTS = Path(__file__).parent.parent / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from transform import (  # noqa: E402
    decompose_komposit_typ,
    load_verknuepfungen,
    process_verknuepfungen,
)


# ---------------------------------------------------------------------------
# 1. Unterstrich als Komposit-Trenner
# ---------------------------------------------------------------------------

def test_decompose_underscore_komposit():
    assert decompose_komposit_typ("Datum_Ort") == ["datum", "ort"]
    assert decompose_komposit_typ("datum_ort") == ["datum", "ort"]
    # Kommaform bleibt unveraendert gueltig (Bestandsdaten)
    assert decompose_komposit_typ("ort, datum") == ["ort", "datum"]
    # Einzeltypen unveraendert
    assert decompose_komposit_typ("person") == ["person"]


def test_datum_ort_underscore_emits_spatiotemporal():
    """Eine Datum_Ort-Zeile muss denselben STE-Pfad nehmen wie 'ort, datum'."""
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


def test_bare_waehrung_typ_emits_no_relation():
    """Ein nackter Typ 'währung' (ohne Komposit) ist kein eigener Typwert und
    darf keine Relation erzeugen. Der bedingungslose decompose-Aufruf filtert
    ihn zur leeren Liste, statt ihn als Generic-Relation durchzulassen."""
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
# 2. Hilfsblaetter im Export werden nicht als Verknuepfungen gelesen
# ---------------------------------------------------------------------------

def test_helper_sheets_are_skipped(tmp_path):
    xlsx = tmp_path / "verk.xlsx"
    verk = pd.DataFrame([
        {"archivsignatur": "NIM_003", "Folio": None, "datenpunkt_id": "dp1",
         "Typ": "person", "Name": "Karajan, Herbert von",
         "Rolle": "Dirigent:in", "Anmerkung": None},
    ])
    # Gefaehrlichster Fall: Hilfsblatt mit typ- UND rolle-artigen Spalten
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
