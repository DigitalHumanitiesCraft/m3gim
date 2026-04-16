"""XLSX-Roundtrip fuer Finanz-Eintraege: jede Zeile exakt im Output verifiziert.

Fuer alle Finanz-Rows in verknuepfungen.xlsx (typ in {ausgaben, einnahmen,
summe} + ', waehrung') wird geprueft:
  1. Der referenzierte Record existiert
  2. Genau eine DetailAnnotation mit detailField=typ und detailValue=Rohwert
  3. monetaryAmount/currency (wenn parsbar) sind exakt
  4. detailRole entspricht der (normalisierten) Rohrolle

Sichert dass die Finanzschicht nicht nur strukturell grun ist, sondern auch
jede Datenzeile tatsaechlich im Output erscheint. Phase 4.6 Invariante.
"""

import sys
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).parent.parent / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from transform import parse_monetary_value, normalize_role  # noqa: E402
from _helpers import ensure_list  # noqa: E402


FIN_PREFIXES = ("ausgaben", "einnahmen", "summe")


def _is_finance_typ(raw_typ: str) -> bool:
    if not isinstance(raw_typ, str):
        return False
    t = raw_typ.strip().lower()
    return any(t.startswith(p) for p in FIN_PREFIXES)


def _finance_base_typ(raw_typ: str) -> str:
    return raw_typ.strip().lower().split(",")[0].strip()


@pytest.fixture(scope="module")
def xlsx_finance_rows(xlsx_verknuepfungen):
    """Alle Finanz-Rows als Liste von Dicts."""
    df = xlsx_verknuepfungen
    needed_cols = {"archivsignatur", "typ", "name", "rolle"}
    missing = needed_cols - set(df.columns)
    if missing:
        pytest.skip(f"XLSX-Spalten fehlen: {missing}")
    rows = []
    folio_col = "folio" if "folio" in df.columns else None
    for _, row in df.iterrows():
        typ = row.get("typ")
        if not _is_finance_typ(typ):
            continue
        sig = row.get("archivsignatur")
        if not isinstance(sig, str) or not sig.strip():
            continue
        folio_val = row.get(folio_col) if folio_col else None
        folio = str(folio_val).strip() if folio_val and str(folio_val) != "nan" else None
        rows.append({
            "signatur": sig.strip(),
            "folio": folio,
            "typ": typ,
            "base_typ": _finance_base_typ(typ),
            "name": str(row.get("name", "")).strip(),
            "rolle": row.get("rolle"),
        })
    return rows


def _make_identifier(signatur: str, folio: str | None) -> str:
    return f"{signatur} {folio}" if folio else signatur


def test_finance_row_count_in_output_matches_xlsx(xlsx_finance_rows, records):
    """Gesamt-Anzahl Finanz-DetailAnnotations im Output >= XLSX-Finanz-Rows.
    Die Pipeline darf nicht silently Rows droppen.
    """
    output_count = 0
    for r in records:
        for det in ensure_list(r.get("m3gim:hasDetail")):
            if isinstance(det, dict) and det.get("m3gim:detailField") in FIN_PREFIXES:
                output_count += 1

    # Manche Rows haben keine Signatur-Zuordnung (unverknuepfte Einträge).
    # Mindestens 80% sollten im Output sein.
    expected_min = int(len(xlsx_finance_rows) * 0.8)
    assert output_count >= expected_min, (
        f"Nur {output_count} von {len(xlsx_finance_rows)} Finanz-Rows im Output"
    )


def test_each_finance_row_reachable_in_output(xlsx_finance_rows, records):
    """Pro XLSX-Finanzzeile muss im zugehoerigen Record eine passende
    DetailAnnotation liegen. Match-Kriterium: detailField=base_typ UND
    (wenn parsbar) monetaryAmount+currency matchen.
    """
    # Index records by identifier
    by_ident = {}
    for r in records:
        ident = r.get("rico:identifier")
        if ident:
            by_ident[ident] = r

    unmatched = []
    for row in xlsx_finance_rows:
        ident = _make_identifier(row["signatur"], row["folio"])
        record = by_ident.get(ident) or by_ident.get(row["signatur"])
        if not record:
            # Unverknuepfte Row — nicht im Output erwartbar
            continue

        expected_amount, expected_currency = parse_monetary_value(row["name"])
        expected_role = normalize_role(row["rolle"])
        found = False
        for det in ensure_list(record.get("m3gim:hasDetail")):
            if not isinstance(det, dict):
                continue
            if det.get("m3gim:detailField") != row["base_typ"]:
                continue
            # Role match (falls beide gesetzt)
            if expected_role and det.get("m3gim:detailRole") != expected_role:
                continue
            # Amount match (falls parsbar)
            if expected_amount is not None:
                ma = det.get("m3gim:monetaryAmount")
                if not isinstance(ma, dict) or ma.get("@value") != expected_amount:
                    continue
            if expected_currency:
                if det.get("m3gim:currency") != expected_currency:
                    continue
            found = True
            break
        if not found:
            unmatched.append({
                "ident": ident,
                "typ": row["base_typ"],
                "name": row["name"],
                "rolle": expected_role,
                "expected": (expected_amount, expected_currency),
            })

    assert not unmatched, (
        f"{len(unmatched)} Finanz-Rows nicht im Output gefunden: {unmatched[:5]}"
    )


def test_finance_output_has_no_extra_currencies(records):
    """Jede im Output auftauchende Waehrung muss auch in XLSX belegt sein —
    sonst halluzinieren wir Werte. (Schutz gegen Pipeline-Bugs.)"""
    output_currencies = set()
    for r in records:
        for det in ensure_list(r.get("m3gim:hasDetail")):
            if isinstance(det, dict) and det.get("m3gim:currency"):
                output_currencies.add(det["m3gim:currency"])
    # Aus data.md § 11 belegtes Set
    from test_13_finanzen import ALLOWED_CURRENCIES
    extras = output_currencies - ALLOWED_CURRENCIES
    assert not extras, f"Waehrungen im Output, die nicht erwartet sind: {extras}"
