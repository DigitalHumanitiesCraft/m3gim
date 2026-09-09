"""Quellschicht der Verknuepfungstabelle als CSV (E-152).

Die Lieferung vom 2026-08-31 hat gezeigt, dass der XLSX-Export der
Tabellenkalkulation Datums-, Folio- und Buendelungsspalten in Zelltypen
umwandelt und dabei Genauigkeit erfindet, die die Erfassung nicht traegt.
Quellformat der Verknuepfungen sind seither die CSV-Ausfuhren je Blatt
(`data.md` § Source format, § Date notation of the source).

Diese Datei sichert zwei Dinge ab. Erstens den Lesepfad: der Loader nimmt das
CSV-Verzeichnis, fuehrt `data_id` und `datenpunkt_id` zusammen und traegt
dieselbe Provenienz wie der XLSX-Pfad. Zweitens die Pruefschicht: jede
Formatabweichung der Quelle wird als Befund mit Blatt und Zeile gemeldet,
statt still verworfen oder still repariert zu werden.

Die Mindestvorkommen sind aus der Lieferung vom 2026-08-31 gezaehlt und
bewusst unter dem Ist gesetzt, damit ein spaeterer Quell-Fix den Test nicht
sofort bricht, ein Totalverlust aber auffaellt.
"""

import csv
import re
import sys
from collections import Counter
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
SCRIPTS = REPO_ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

CSV_DIR = REPO_ROOT / "data" / "google-spreadsheet" / "verknuepfungen"
BOX_SHEETS = [f"Box {number}" for number in range(1, 10)]


# ---------------------------------------------------------------------------
# Lokaler Leser: unabhaengig von der Pipeline, damit die Quellzusagen auch
# dann pruefbar bleiben, wenn der Lesepfad selbst Gegenstand des Tests ist.
# ---------------------------------------------------------------------------

def _raw_rows() -> list[dict]:
    rows = []
    for path in sorted(CSV_DIR.glob("Box_*.csv")):
        sheet = path.stem.replace("_", " ")
        with path.open(encoding="utf-8-sig", newline="") as handle:
            table = list(csv.reader(handle))
        header = [c.strip().lower() for c in table[0]]
        for line_no, raw in enumerate(table[1:], start=2):
            row = dict(zip(header, raw))
            row["_sheet"] = sheet
            row["_row"] = line_no
            row["_id"] = (row.get("datenpunkt_id") or row.get("data_id") or "").strip()
            rows.append(row)
    return rows


# ---------------------------------------------------------------------------
# 1. Quelllayout
# ---------------------------------------------------------------------------

def test_csv_source_layout():
    """Das Quellverzeichnis fuehrt je Blatt eine Datei plus die Wertliste."""
    assert CSV_DIR.is_dir(), f"CSV-Quellverzeichnis fehlt: {CSV_DIR}"
    boxes = sorted(p.name for p in CSV_DIR.glob("Box_*.csv"))
    assert boxes == [f"{sheet.replace(' ', '_')}.csv" for sheet in BOX_SHEETS]
    assert (CSV_DIR / "Typ-Rolle.csv").exists(), "Wertliste Typ-Rolle.csv fehlt"
    xlsx = list(CSV_DIR.parent.glob("M3GIM-Verkn*pfungen*.xlsx"))
    assert not xlsx, (
        f"Die XLSX-Fassung der Verknuepfungen liegt noch im Quellverzeichnis: {xlsx}. "
        "Sie ist verlustbehaftet und darf nicht neben der CSV-Quelle stehen (E-152)."
    )


def test_csv_preserves_the_recorded_text():
    """Die CSV gibt den erfassten Text weiter, ohne ihn zu konvertieren.

    Vier Belegstellen, an denen der XLSX-Export einen anderen Wert lieferte.
    """
    rows = _raw_rows()
    assert len(rows) >= 5600, f"Nur {len(rows)} Quellzeilen geladen"

    # Lieferfest ueber Wert-Existenz statt Zellkoordinate: die Zeilennummern
    # verschieben sich mit jeder Lieferung, der erfasste Text muss aber in
    # jeder Lieferung unkonvertiert ankommen. Jeder Wert unten ist eine
    # Form, die der XLSX-Weg nachweislich zerstoert hat (E-152/E-153).
    names = {(r.get("name") or "").strip() for r in rows}
    folios = {(r.get("folio") or "").strip() for r in rows}
    ids = {str(r["_id"]).strip() for r in rows if r.get("_id")}

    assert "1956-11" in names, "Monatsangabe auf den Monatsersten aufgefuellt"
    assert "06-09" in names, "Jahrlose Angabe zu einem Kalenderdatum gemacht"
    assert "36.000" in names, "Tausenderpunkt im Betrag verloren"
    assert "15-1" in folios, "Bindestrich-Folio in ein Datum umgewandelt"
    assert "1.1" in ids, "Buendelungskennung in ein Datum umgewandelt"
    assert not any("00:00:00" in n for n in names), (
        "Zeitstempelmuster in der CSV-Quelle, die Quelle ist durch die "
        "Tabellenkalkulation gelaufen"
    )


# ---------------------------------------------------------------------------
# 2. Lesepfad
# ---------------------------------------------------------------------------

def test_loader_prefers_the_csv_directory():
    """`load_verknuepfungen` liest das CSV-Verzeichnis des Quellordners."""
    from transform import load_verknuepfungen

    df = load_verknuepfungen(REPO_ROOT / "data" / "google-spreadsheet")
    assert len(df) >= 5600, f"Nur {len(df)} Zeilen geladen"
    sheets = sorted(df["_xlsx_sheet"].dropna().unique().tolist())
    assert sheets == BOX_SHEETS, f"Unerwartete Blattnamen: {sheets}"


def test_provenance_is_sheet_and_csv_line():
    """Provenienz ist der Blattname der Quelle und die Zeile der CSV-Datei."""
    from transform import load_verknuepfungen

    df = load_verknuepfungen(REPO_ROOT / "data" / "google-spreadsheet")
    box1 = df[df["_xlsx_sheet"] == "Box 1"]
    assert len(box1) >= 3000, f"Box 1 nur mit {len(box1)} Zeilen geladen"
    assert box1["_xlsx_row"].min() == 2, "Erste Datenzeile muss Zeile 2 sein"

    hit = df[(df["_xlsx_sheet"] == "Box 1") & (df["_xlsx_row"] == 436)]
    assert len(hit) == 1
    assert str(hit.iloc[0]["name"]).strip() == "1956-11"


def test_data_id_and_datenpunkt_id_are_merged():
    """Vier Blaetter nennen die Buendelungsspalte `data_id`; sie darf nicht verfallen."""
    from transform import load_verknuepfungen

    df = load_verknuepfungen(REPO_ROOT / "data" / "google-spreadsheet")
    assert "datenpunkt_id" in df.columns
    assert "data_id" not in df.columns, (
        "Die Spalte data_id steht getrennt neben datenpunkt_id und wird von "
        "process_verknuepfungen nie gelesen."
    )
    filled = df["datenpunkt_id"].notna().sum()
    assert filled >= 140, f"Nur {filled} Zeilen mit Buendelungskennung"


# ---------------------------------------------------------------------------
# 3. Pruefschicht: Datumsformate (data.md § Date notation of the source)
# ---------------------------------------------------------------------------

def _source_issues():
    from validate import load_typ_rolle, validate_verknuepfungen_source
    from transform import load_verknuepfungen

    sheets = REPO_ROOT / "data" / "google-spreadsheet"
    df = load_verknuepfungen(sheets)
    return validate_verknuepfungen_source(df, load_typ_rolle(sheets))


def test_date_format_findings_are_reported():
    """Nicht aufgefuellte Monats- und Tagesstellen sind ein gemeldeter Befund."""
    issues = _source_issues()
    dates = [i for i in issues if i.code == "E010"]
    # Lieferfest: solange die Quelle mindestens einen nicht aufgefuellten
    # Wert traegt, muss der Validator ihn mit Blatt und Zeile melden. Die
    # frueheren Pins auf konkrete Werte einer Lieferung sind entfallen,
    # welche Werte offen sind, zeigt der Datenspiegel-Lauf.
    assert len(dates) >= 1, "Kein Datumsformat-Befund gemeldet, Erkennung tot"
    for issue in dates:
        assert issue.sheet in BOX_SHEETS, f"Befund ohne Blattangabe: {issue}"
        assert issue.row >= 2, f"Befund ohne Zeilenangabe: {issue}"
        assert issue.value, f"Befund ohne Wert: {issue}"


def test_timestamp_pattern_is_its_own_warning_class():
    """Ein Zeitstempelmuster belegt eine Autokonvertierung und wird gewarnt."""
    import pandas as pd
    from validate import validate_verknuepfungen_source

    synthetic = pd.DataFrame([{
        "archivsignatur": "UAKUG/NIM_004",
        "folio": "1",
        "datenpunkt_id": None,
        "typ": "Datum",
        "name": "1952-12-16 00:00:00",
        "rolle": "erwähnt",
        "anmerkung": None,
        "_xlsx_sheet": "Box 1",
        "_xlsx_row": 70,
    }])
    warned = [i for i in validate_verknuepfungen_source(synthetic) if i.code == "W010"]
    assert len(warned) == 1, "Zeitstempelmuster ohne Warnung durchgelassen"

    real = [i for i in _source_issues() if i.code == "W010"]
    assert not real, (
        f"{len(real)} Zeitstempel in der CSV-Quelle; die Quelle ist damit doch "
        "durch die Tabellenkalkulation gelaufen"
    )


# ---------------------------------------------------------------------------
# 4. Pruefschicht: Buendelungskennung, Folio, Signatur
# ---------------------------------------------------------------------------

def test_participation_id_ambiguity_is_reported():
    """`1.1` ist zwischen Beteiligung 01 und 10 nicht entscheidbar."""
    issues = _source_issues()
    ambiguous = [i for i in issues if i.code == "W011"]
    assert len(ambiguous) >= 50, f"Nur {len(ambiguous)} mehrdeutige Kennungen gemeldet"
    assert "1.1" in {i.value for i in ambiguous}

    off_spec = [i for i in issues if i.code == "E011"]
    assert not off_spec, (
        f"Kennungen ausserhalb der Muster n und n.mm: {[i.value for i in off_spec][:10]}"
    )


def test_hyphen_folio_is_reported():
    """Eine Bindestrich- oder Spannenform in der Folio-Spalte ist ein Befund.

    Lieferfest: geprueft wird, dass der Validator jede solche Form mit
    Blatt und Zeile meldet, nicht welche Formen die aktuelle Lieferung
    traegt. Ob eine Form ein Objekt verfehlt, zeigt der Orphan-Test des
    Datenspiegels (test_61); die Bindestrichformen mit eindeutigem
    Unterstrich-Treffer repariert die Pipeline deterministisch (E-154).
    """
    folios = [i for i in _source_issues() if i.code == "E012"]
    assert len(folios) >= 1, "Kein Folio-Format-Befund gemeldet, Erkennung tot"
    for issue in folios:
        assert issue.sheet in BOX_SHEETS, f"Befund ohne Blattangabe: {issue}"
        assert issue.row >= 2, f"Befund ohne Zeilenangabe: {issue}"
        assert "-" in str(issue.value), f"Befund ohne Bindestrichwert: {issue}"


def test_signature_stub_is_an_error():
    """Eine Signatur ohne Konvolutnummer bezeichnet kein Objekt."""
    import pandas as pd
    from validate import validate_verknuepfungen_source

    synthetic = pd.DataFrame([{
        "archivsignatur": "UAKUG/NIM_",
        "folio": None, "datenpunkt_id": None, "typ": "person",
        "name": "Malaniuk, Ira", "rolle": "erwähnt", "anmerkung": None,
        "_xlsx_sheet": "Box 8", "_xlsx_row": 2,
    }])
    stubs = [i for i in validate_verknuepfungen_source(synthetic) if i.code == "E014"]
    assert len(stubs) == 1, "Signaturstumpf ohne Befund durchgelassen"

    real = [i for i in _source_issues() if i.code == "E014"]
    expected = {
        (row["_sheet"], row["_row"], row.get("", "").strip())
        for row in _raw_rows()
        if row.get("", "").strip() == "UAKUG/NIM_"
    }
    assert {(i.sheet, i.row, i.value) for i in real} == expected


# ---------------------------------------------------------------------------
# 5. Pruefschicht: Kreuzpruefung und typlose Zeilen
# ---------------------------------------------------------------------------

def test_typ_rolle_cross_check_is_a_finding_list():
    """Jede (typ, rolle)-Kombination ausserhalb der Wertliste wird genannt."""
    combos = [i for i in _source_issues() if i.code == "W012"]
    assert len(combos) >= 60, f"Nur {len(combos)} Kombinationen gemeldet"
    reported = {i.value for i in combos}
    assert "rolle / auftritt" in reported, sorted(reported)[:10]
    for issue in combos:
        assert issue.sheet in BOX_SHEETS and issue.row >= 2, f"Befund ohne Fundstelle: {issue}"


def test_rows_with_name_but_without_typ_are_counted():
    """Named rows without a type are reported and remain neutral statements."""
    typeless = [i for i in _source_issues() if i.code == "E013"]
    assert len(typeless) >= 200, f"Nur {len(typeless)} typlose Zeilen gemeldet"
    signatures = Counter(i.value.split(" | ")[0] for i in typeless)
    assert signatures.most_common(1)[0][0] == "UAKUG/NIM_005", signatures.most_common(3)


# ---------------------------------------------------------------------------
# 6. Schutzregeln der Index-Uebernahme (data.md § Identity and precedence in the index tables)
# ---------------------------------------------------------------------------

def test_index_lookup_does_not_attach_idless_row_to_id_group():
    """Eine idlose Zeile wird nicht still einer ID-Identitaet zugeschlagen."""
    from transform import build_index_lookup, load_index

    lookup = build_index_lookup(load_index("Personenindex"))
    malaniuk = lookup.get("malaniuk, ira")
    assert malaniuk is not None, "Die Nachlassbildnerin fehlt im Personen-Lookup"
    assert malaniuk.get("ambiguous") is True
    assert len(malaniuk.get("candidates", [])) == 2
    assert any(c.get("wikidata_id") == "Q94208" for c in malaniuk["candidates"])


def test_work_index_is_keyed_by_title_and_composer():
    """`Requiem` bezeichnet drei Werke; der Titel allein ist keine Identitaet."""
    from transform import build_index_lookup, load_index

    lookup = build_index_lookup(load_index("Werkindex"))
    requiem = lookup.get("requiem")
    assert requiem is not None
    assert requiem.get("ambiguous") is True, (
        f"Der Titel Requiem wird ohne Mehrdeutigkeitsmarke aufgeloest: {requiem}"
    )
    assert "komponist" not in requiem, (
        f"Ein mehrdeutiger Titel darf keinen Komponisten tragen: {requiem}"
    )
    candidates = requiem.get("candidates") or []
    assert len(candidates) >= 3, f"Nur {len(candidates)} Requiem-Kandidaten: {candidates}"
