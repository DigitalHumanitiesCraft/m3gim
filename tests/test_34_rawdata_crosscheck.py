"""Zellgenauer Rohdaten-Gegencheck: JSON-LD/Frontend-Wert <-> XLSX-Rohzelle.

Validiert, dass die im Frontend gezeigten Werte tatsaechlich an der per
``m3gim:xlsxSource`` ({Sheet, Row}) ausgewiesenen XLSX-Zelle stehen. Das
bestaetigt zugleich die Provenienz-Pille im UI ("Z.40"): sie zeigt nicht nur
*eine* Zeilennummer, sondern die *richtige*.

Zwei Stossrichtungen:
  1. Objekt-Records gegen M3GIM-Objekte.xlsx (Join ueber xlsxRow = pandas-idx+2).
  2. SpatiotemporalEvents gegen M3GIM-Verknuepfungen.xlsx (Join ueber sheet-lokale
     (Sheet, Row) via demselben Multi-Sheet-Loader wie die Pipeline).

Methode (gegen False Positives): die *echten* Pipeline-Transformationen werden
importiert und auf den Rohwert angewendet, dann gegen den JSON-LD-Wert
verglichen. Geprueft wird damit die Provenienz-Treue und Roundtrip-
Vollstaendigkeit, nicht die Transformationslogik selbst (die haben die
test_03/test_16-Roundtrips). Es ersetzt den groben, single-sheet-veralteten
``scripts/audit-data.py`` durch einen zellgenauen Suite-Check.

Quelldaten-Anomalien (z. B. zielort-Swap NIM_007_20/21) sind hier KEIN Fehler:
die Pipeline reicht die Quelle getreu durch — der Test bestaetigt genau diese
Treue. Solche Befunde gehoeren als Ticket nach knowledge/data.md.
"""

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

# Echte Pipeline-Transformationen + Konstanten als Soll wiederverwenden.
from transform import (  # noqa: E402
    normalize_str,
    normalize_lower,
    normalize_role,
    clean_date,
    is_iso_date,
    normalize_bearbeitungsstand,
    DOKUMENTTYP_TO_DFT,
    MOBILITY_PLACE_ROLES,
)


def _rico_date_expected(raw):
    """Spiegelt convert_objekt: rico:date traegt nur ISO-Werte. Ein malformter
    Quellwert (kein ISO, z.B. '06-09') landet nicht in rico:date, sondern
    verlustfrei im DatedEvent-Fallback -> hier als Erwartung None."""
    cd = clean_date(raw)
    return cd if (cd is not None and is_iso_date(cd)) else None


# ---------------------------------------------------------------------------
# Helfer
# ---------------------------------------------------------------------------

def _xlsx_source(node):
    src = node.get("m3gim:xlsxSource")
    return src if isinstance(src, dict) else None


def _dft_id(rec):
    dft = rec.get("rico:hasDocumentaryFormType")
    return dft.get("@id") if isinstance(dft, dict) else None


def _place_name(ste):
    place = ste.get("m3gim:atPlace")
    if isinstance(place, dict):
        return place.get("name")
    return None


# ---------------------------------------------------------------------------
# Teil 1 — Objekt-Records gegen M3GIM-Objekte.xlsx
# ---------------------------------------------------------------------------

# Record-Feld -> (XLSX-Spalte, Transformfunktion). Erwartung == f(roh-Zelle).
OBJEKT_FIELDS = {
    "rico:title": ("titel", normalize_str),
    "rico:date": ("entstehungsdatum", _rico_date_expected),
    "rico:hasOrHadLanguage": ("sprache", normalize_str),
    "rico:hasExtent": ("umfang", normalize_str),
    "m3gim:bearbeitungsstand": ("bearbeitungsstand", normalize_bearbeitungsstand),
}


def _objekt_record_rows(records):
    """(record, xlsx_row) fuer alle Records mit xlsxSource.sheet == 'Objekte'."""
    out = []
    for rec in records:
        src = _xlsx_source(rec)
        if src and src.get("m3gim:xlsxSheet") == "Objekte":
            out.append((rec, src.get("m3gim:xlsxRow")))
    return out


def test_objekt_records_match_xlsx_cells(records, xlsx_objekte):
    """Jeder durchgereichte Record-Feldwert == Transform der adressierten Zelle."""
    df = xlsx_objekte
    n_rows = len(df)
    mismatches = []
    checked = 0

    for rec, xlsx_row in _objekt_record_rows(records):
        if not isinstance(xlsx_row, int):
            continue
        idx = xlsx_row - 2  # xlsxRow = pandas-idx + 2 (Header = Zeile 1)
        if idx < 0 or idx >= n_rows:
            mismatches.append((rec.get("rico:identifier"), "xlsx_row", xlsx_row, "out-of-range"))
            continue
        row = df.iloc[idx]
        checked += 1

        for field, (col, transform) in OBJEKT_FIELDS.items():
            if col not in df.columns:
                continue
            expected = transform(row.get(col))
            actual = rec.get(field)
            # DocType ist separat (Mapping), Sprache/Extent sind reine Strings.
            if expected != actual:
                mismatches.append(
                    (rec.get("rico:identifier"), field, repr(actual), repr(expected))
                )

        # Dokumenttyp ueber die echte Map.
        if "dokumenttyp" in df.columns:
            exp_dft = DOKUMENTTYP_TO_DFT.get(normalize_lower(row.get("dokumenttyp")))
            if exp_dft != _dft_id(rec):
                mismatches.append(
                    (rec.get("rico:identifier"), "DocType", _dft_id(rec), exp_dft)
                )

    # Nicht trivial gruen: der Bestand hat zig Objekt-Records.
    assert checked >= 50, (
        f"Nur {checked} Objekt-Records gegen XLSX geprueft — Provenienz fehlt "
        f"oder Fixture leer; Test waere nicht aussagekraeftig."
    )
    assert not mismatches, (
        f"{len(mismatches)} Record-Feld(er) weichen von der XLSX-Rohzelle ab "
        f"(Ist != Soll). Erste 10:\n  "
        + "\n  ".join(f"{sig} {field}: {actual} != {expected}"
                      for sig, field, actual, expected in mismatches[:10])
    )


# ---------------------------------------------------------------------------
# Teil 2 — SpatiotemporalEvents gegen M3GIM-Verknuepfungen.xlsx
# ---------------------------------------------------------------------------

def _verkn_index(df):
    """(sheet, row) -> pandas-Row, ueber die Provenance-Hilfsspalten."""
    idx = {}
    if "_xlsx_sheet" not in df.columns or "_xlsx_row" not in df.columns:
        return idx
    for _, row in df.iterrows():
        key = (str(row.get("_xlsx_sheet")), int(row.get("_xlsx_row")))
        idx[key] = row
    return idx


def _spatiotemporal_events(graph):
    return [n for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"]


def test_ste_provenance_points_to_ort_row(graph, xlsx_verknuepfungen):
    """Jeder STE zeigt auf eine 'ort'-Zeile, und sein atPlace.name steckt im
    Roh-name-String. Faengt falsche Zeilenzuordnung (Off-by-one, Sheet-Mix)."""
    vindex = _verkn_index(xlsx_verknuepfungen)
    assert vindex, "Verknuepfungs-Index leer — load_verknuepfungen-Hilfsspalten fehlen."

    events = _spatiotemporal_events(graph)
    problems = []
    checked = 0

    for ste in events:
        src = _xlsx_source(ste)
        if not src:
            problems.append((ste.get("@id"), "kein xlsxSource"))
            continue
        key = (str(src.get("m3gim:xlsxSheet")), int(src.get("m3gim:xlsxRow")))
        row = vindex.get(key)
        if row is None:
            problems.append((ste.get("@id"), f"Zeile {key} nicht in XLSX"))
            continue
        checked += 1

        raw_typ = normalize_lower(row.get("typ")) or ""
        if "ort" not in raw_typ:
            problems.append((ste.get("@id"), f"typ={raw_typ!r} ohne 'ort'"))

        place = (_place_name(ste) or "").strip().lower()
        raw_name = (normalize_str(row.get("name")) or "").lower()
        # atPlace.name ist entweder der ganze name (reine ort-Zeile) oder der
        # dekomponierte Ort-Teil (ort,datum-Komposit) -> Substring-Treue genuegt.
        if place and place not in raw_name:
            problems.append((ste.get("@id"), f"Ort {place!r} nicht in name {raw_name!r}"))

    assert checked >= 40, f"Nur {checked} STE geprueft — Provenienz unvollstaendig."
    assert not problems, (
        f"{len(problems)} STE-Provenienz-Abweichung(en). Erste 10:\n  "
        + "\n  ".join(f"{sid}: {msg}" for sid, msg in problems[:10])
    )


def test_e97_ortsrollen_exact_cell_match(graph, xlsx_verknuepfungen):
    """E-97-Mobilitaets-Ortsrollen: atPlace.name, eventRole und (falls vorhanden)
    atDate stimmen ZELLGENAU mit der Roh-Zeile.

    Datenform tieferer Export: Mobilitaets-Ortsrollen stammen aus reinen `ort`-
    Zeilen (datumslos, atPlace == ganze Rohzelle) ODER aus `ort, datum`-Kompositen
    (dekomponiert: atPlace == Ort-Teil, atDate == ISO-Datums-Teil). Beide Formen
    werden hier gegen die echte Pipeline-Dekomposition geprueft — die Provenienz-
    Treue (kein Datum-Leak in den Ortsnamen, exakter Ort/Datum-Split) bleibt
    scharf, nur die frueher angenommene Datumslosigkeit faellt weg."""
    from transform import (  # noqa: PLC0415
        decompose_komposit_value, normalize_lower, normalize_dating, is_iso_date,
    )
    vindex = _verkn_index(xlsx_verknuepfungen)
    events = _spatiotemporal_events(graph)
    mismatches = []
    e97_count = 0

    for ste in events:
        role = ste.get("m3gim:eventRole")
        if role not in MOBILITY_PLACE_ROLES:
            continue
        src = _xlsx_source(ste)
        if not src:
            mismatches.append((ste.get("@id"), "xlsxSource", None, "vorhanden"))
            continue
        key = (str(src.get("m3gim:xlsxSheet")), int(src.get("m3gim:xlsxRow")))
        row = vindex.get(key)
        if row is None:
            mismatches.append((ste.get("@id"), "row", key, "in XLSX"))
            continue
        e97_count += 1

        exp_role = normalize_role(row.get("rolle"))
        if exp_role != role:
            mismatches.append((ste.get("@id"), "eventRole", role, exp_role))

        raw_name = normalize_str(row.get("name"))
        raw_typ = normalize_lower(row.get("typ")) or ""
        if "ort" in raw_typ and "datum" in raw_typ:
            # ort,datum-Komposit -> dekomponierte Erwartung (atPlace = Ort-Teil,
            # atDate = ISO-Datums-Teil).
            dec = decompose_komposit_value(raw_name, ["ort", "datum"])
            exp_place = dec.get("ort")
            exp_date = normalize_dating(dec.get("datum") or "")
            actual_date = ste.get("m3gim:atDate")
            if is_iso_date(exp_date):
                if actual_date != exp_date:
                    mismatches.append((ste.get("@id"), "atDate", actual_date, exp_date))
        else:
            # reine ort-Zeile -> datumslos, atPlace == ganze Rohzelle.
            exp_place = raw_name
            if ste.get("m3gim:atDate"):
                mismatches.append(
                    (ste.get("@id"), "atDate", ste.get("m3gim:atDate"), "(keins)"))

        if exp_place != _place_name(ste):
            mismatches.append((ste.get("@id"), "atPlace.name", _place_name(ste), exp_place))

    # Mindestens 15 Mobilitaets-Ortsrollen-Events erwartet (reine ort-Zeilen +
    # ort,datum-Komposite mit Mobilitaetsrolle).
    assert e97_count >= 15, (
        f"Nur {e97_count} E-97-Ortsrollen-Events gefunden (erwartet >= 15). "
        f"Sind sie noch im Output? (E-107 hatte sie nach docs/data gehoben.)"
    )
    assert not mismatches, (
        f"{len(mismatches)} E-97-Ortsrollen weichen von der XLSX-Zelle ab. Erste 10:\n  "
        + "\n  ".join(f"{sid} {field}: {actual!r} != {expected!r}"
                      for sid, field, actual, expected in mismatches[:10])
    )
