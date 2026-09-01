"""Cell-precise raw-data cross-check: JSON-LD/frontend value <-> XLSX raw cell.

Validates that the values shown in the frontend actually sit at the XLSX cell
addressed by ``m3gim-ontology:xlsxSource`` ({Sheet, Row}). This also confirms the
provenance pill in the UI ("Z.40"): it shows not just *a* row number but the
*right* one.

Two directions:
  1. Object records against M3GIM-Objekte.xlsx (join via xlsxRow = pandas-idx+2).
  2. SpatiotemporalEvents against M3GIM-Verknuepfungen.xlsx (join via sheet-local
     (Sheet, Row) through the same multi-sheet loader as the pipeline).

Method (against false positives): the *real* pipeline transforms are imported and
applied to the raw value, then compared against the JSON-LD value. This checks
provenance fidelity and roundtrip completeness, not the transform logic itself
(the test_03/test_16 roundtrips cover that). It replaces the coarse,
single-sheet-outdated ``scripts/audit-data.py`` with a cell-precise suite check.

Source-data anomalies (e.g. zielort swap NIM_007_20/21) are NOT an error here:
the pipeline passes the source through faithfully, the test confirms exactly that
fidelity. Such findings belong as a ticket in knowledge/data.md.
"""

import sys
from pathlib import Path


REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

# Reuse real pipeline transforms + constants as the expected value.
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
    """Mirrors convert_objekt: rico:date carries only ISO values. A malformed
    source value (not ISO, e.g. '06-09') does not land in rico:date but
    losslessly on the annotation node -> expectation None here."""
    cd = clean_date(raw)
    return cd if (cd is not None and is_iso_date(cd)) else None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _xlsx_source(node):
    src = node.get("m3gim-ontology:xlsxSource")
    return src if isinstance(src, dict) else None


def _dft_id(rec):
    dft = rec.get("rico:hasDocumentaryFormType")
    return dft.get("@id") if isinstance(dft, dict) else None


def _place_name(ste):
    place = ste.get("m3gim-ontology:atPlace")
    if isinstance(place, dict):
        return place.get("name")
    return None


# ---------------------------------------------------------------------------
# Part 1 — object records against M3GIM-Objekte.xlsx
# ---------------------------------------------------------------------------

# Record field -> (XLSX column, transform function). Expectation == f(raw cell).
OBJEKT_FIELDS = {
    "rico:title": ("titel", normalize_str),
    "rico:date": ("entstehungsdatum", _rico_date_expected),
    "rico:hasOrHadLanguage": ("sprache", normalize_str),
    "rico:hasExtent": ("umfang", normalize_str),
    "m3gim-ontology:processingStatus": ("bearbeitungsstand", normalize_bearbeitungsstand),
}


def _objekt_record_rows(records):
    """(record, xlsx_row) for all records with xlsxSource.sheet == 'Objekte'."""
    out = []
    for rec in records:
        src = _xlsx_source(rec)
        if src and src.get("m3gim-ontology:xlsxSheet") == "Objekte":
            out.append((rec, src.get("m3gim-ontology:xlsxRow")))
    return out


def test_objekt_records_match_xlsx_cells(records, xlsx_objekte):
    """Every passed-through record field value == transform of the addressed cell."""
    df = xlsx_objekte
    n_rows = len(df)
    mismatches = []
    checked = 0

    for rec, xlsx_row in _objekt_record_rows(records):
        if not isinstance(xlsx_row, int):
            continue
        idx = xlsx_row - 2  # xlsxRow = pandas-idx + 2 (header = row 1)
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
            # DocType is separate (mapping), language/extent are plain strings.
            if expected != actual:
                mismatches.append(
                    (rec.get("rico:identifier"), field, repr(actual), repr(expected))
                )

        # Document type via the real map.
        if "dokumenttyp" in df.columns:
            exp_dft = DOKUMENTTYP_TO_DFT.get(normalize_lower(row.get("dokumenttyp")))
            if exp_dft != _dft_id(rec):
                mismatches.append(
                    (rec.get("rico:identifier"), "DocType", _dft_id(rec), exp_dft)
                )

    # Not trivially green: the holdings have dozens of object records.
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
# Part 2 — SpatiotemporalEvents against M3GIM-Verknuepfungen.xlsx
# ---------------------------------------------------------------------------

def _verkn_index(df):
    """(sheet, row) -> pandas row, via the provenance helper columns."""
    idx = {}
    if "_xlsx_sheet" not in df.columns or "_xlsx_row" not in df.columns:
        return idx
    for _, row in df.iterrows():
        key = (str(row.get("_xlsx_sheet")), int(row.get("_xlsx_row")))
        idx[key] = row
    return idx


def _spatiotemporal_events(graph):
    """Verortungen: annotation nodes that carry a place."""
    return [n for n in graph
            if n.get("@type") == "m3gim-ontology:Annotation"
            and n.get("m3gim-ontology:atPlace")]


def _recorded_role(node):
    """The recorded role value, before the merge in the vocabulary.

    Compared against the raw cell, so the origin value counts, not the concept it
    resolves to.
    """
    role = node.get("role")
    if role is None:
        return None
    origin = node.get("m3gim-ontology:derivedFromRole")
    if origin:
        return origin
    if isinstance(role, dict):
        return role.get("skos:prefLabel")
    return role


def test_ste_provenance_points_to_ort_row(graph, xlsx_verknuepfungen):
    """Every Verortung points to an 'ort' row, and its atPlace.name sits inside
    the raw name string. Catches wrong row assignment (off-by-one, sheet mix)."""
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
        key = (str(src.get("m3gim-ontology:xlsxSheet")), int(src.get("m3gim-ontology:xlsxRow")))
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
        # atPlace.name is either the whole name (pure ort row) or the decomposed
        # place part (ort,datum composite) -> substring fidelity suffices.
        if place and place not in raw_name:
            problems.append((ste.get("@id"), f"Ort {place!r} nicht in name {raw_name!r}"))

    assert checked >= 40, f"Nur {checked} STE geprueft — Provenienz unvollstaendig."
    assert not problems, (
        f"{len(problems)} STE-Provenienz-Abweichung(en). Erste 10:\n  "
        + "\n  ".join(f"{sid}: {msg}" for sid, msg in problems[:10])
    )


def test_e97_ortsrollen_exact_cell_match(graph, xlsx_verknuepfungen):
    """E-97 mobility place roles: atPlace.name, recorded role and (if present)
    atDate match the raw row CELL-PRECISELY.

    Data shape of the deeper export: mobility place roles come from pure `ort`
    rows (dateless, atPlace == whole raw cell) OR from `ort, datum` composites
    (decomposed: atPlace == place part, atDate == ISO date part). Both forms are
    checked here against the real pipeline decomposition, provenance fidelity (no
    date leak into the place name, exact place/date split) stays sharp, only the
    formerly assumed datelessness falls away."""
    from transform import (  # noqa: PLC0415
        decompose_komposit_value, normalize_lower, normalize_dating, is_iso_date,
    )
    vindex = _verkn_index(xlsx_verknuepfungen)
    events = _spatiotemporal_events(graph)
    mismatches = []
    e97_count = 0

    for ste in events:
        role = _recorded_role(ste)
        if role not in MOBILITY_PLACE_ROLES:
            continue
        src = _xlsx_source(ste)
        if not src:
            mismatches.append((ste.get("@id"), "xlsxSource", None, "vorhanden"))
            continue
        key = (str(src.get("m3gim-ontology:xlsxSheet")), int(src.get("m3gim-ontology:xlsxRow")))
        row = vindex.get(key)
        if row is None:
            mismatches.append((ste.get("@id"), "row", key, "in XLSX"))
            continue
        e97_count += 1

        exp_role = normalize_role(row.get("rolle"))
        if exp_role != role:
            mismatches.append((ste.get("@id"), "role", role, exp_role))

        raw_name = normalize_str(row.get("name"))
        raw_typ = normalize_lower(row.get("typ")) or ""
        if "ort" in raw_typ and "datum" in raw_typ:
            # ort,datum composite -> decomposed expectation (atPlace = place part,
            # atDate = ISO date part).
            dec = decompose_komposit_value(raw_name, ["ort", "datum"])
            exp_place = dec.get("ort")
            exp_date = normalize_dating(dec.get("datum") or "")
            actual_date = ste.get("m3gim-ontology:atDate")
            if is_iso_date(exp_date):
                if actual_date != exp_date:
                    mismatches.append((ste.get("@id"), "atDate", actual_date, exp_date))
        else:
            # pure ort row -> dateless, atPlace == whole raw cell.
            exp_place = raw_name
            if ste.get("m3gim-ontology:atDate"):
                mismatches.append(
                    (ste.get("@id"), "atDate", ste.get("m3gim-ontology:atDate"), "(keins)"))

        if exp_place != _place_name(ste):
            mismatches.append((ste.get("@id"), "atPlace.name", _place_name(ste), exp_place))

    # At least 15 mobility place-role events expected (pure ort rows + ort,datum
    # composites with a mobility role).
    assert e97_count >= 15, (
        f"Nur {e97_count} E-97-Ortsrollen-Events gefunden (erwartet >= 15). "
        f"Sind sie noch im Output? (E-107 hatte sie nach docs/data gehoben.)"
    )
    assert not mismatches, (
        f"{len(mismatches)} E-97-Ortsrollen weichen von der XLSX-Zelle ab. Erste 10:\n  "
        + "\n  ".join(f"{sid} {field}: {actual!r} != {expected!r}"
                      for sid, field, actual, expected in mismatches[:10])
    )
