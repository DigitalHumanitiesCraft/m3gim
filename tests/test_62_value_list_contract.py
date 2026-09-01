"""Datenspiegel: Erfassung gegen die Werteliste Typ-Rolle.csv.

Die Werteliste ist der Kontrakt der Erfassung, die Dropdowns speisen sich
aus ihr. Ein erfasster Typ- oder Rollenwert ausserhalb der Werteliste ist
ein Quellbefund, abgeschnittene Werte, haengengebliebene Dropdown-
Beschriftungen, leere Pflichtspalten. Ein Wert, der in der Werteliste
steht, aber im Vokabular fehlt, ist dagegen ein Invarianten-Befund
(test_15, test_40), weil dann das Modell hinterherhinkt.

Diese Tests sind absichtlich ROT, solange die Quelle solche Werte traegt
(Marker data_quality). Ihre Fehlermeldung ist die Befundliste mit
Fundstellen. Keine hartkodierten Erwartungen, mit einer sauberen
Lieferung werden sie von selbst gruen.
"""

import csv
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
WERTELISTE = REPO_ROOT / "data/google-spreadsheet/verknuepfungen/Typ-Rolle.csv"

# Komposittypen sind vor dem Dropdown-Umbau mit Komma erfasst worden und
# bleiben gueltige Quellwerte (data.md § 4); die Werteliste fuehrt nur die
# Unterstrich-Schreibung der Finanztypen.
KOMPOSIT_TYPEN = {
    "ort, datum", "datum, werk", "rolle, person",
    "einnahmen, währung", "ausgaben, währung", "summe, währung",
    "ort_datum",
}


def _norm(value) -> str:
    s = ("" if value is None else str(value)).strip().lower()
    return "" if s == "nan" else s


def _strip_gender(value: str) -> str:
    for suffix in (":innen", ":in"):
        if value.endswith(suffix):
            return value[: -len(suffix)]
    return value


def _werteliste():
    typen, rollen = set(), set()
    with open(WERTELISTE, encoding="utf-8-sig", newline="") as f:
        for i, row in enumerate(csv.reader(f)):
            if i == 0 or not row:
                continue
            if _norm(row[0]):
                typen.add(_norm(row[0]))
            for cell in row[1:]:
                v = _strip_gender(_norm(cell))
                if v:
                    rollen.add(v)
    return typen, rollen


def _fail_with_findings(kind: str, findings: dict):
    lines = [f"{kind} ausserhalb der Werteliste (Wert -> Fundstellen):"]
    for value, places in sorted(findings.items(), key=lambda x: -len(x[1])):
        sample = ", ".join(places[:4])
        more = "" if len(places) <= 4 else f" und {len(places) - 4} weitere"
        lines.append(f"  {value!r}  ({len(places)} Zeilen)  ->  {sample}{more}")
    lines.append(
        "Fix in der Erfassung: Wert ausschreiben bzw. Dropdown nutzen, "
        "oder die Werteliste Typ-Rolle.csv bewusst erweitern."
    )
    pytest.fail("\n".join(lines))


@pytest.mark.data_quality
def test_recorded_roles_are_in_the_value_list(xlsx_verknuepfungen):
    _, rollen = _werteliste()
    assert len(rollen) > 40, "Werteliste unplausibel klein"
    findings = {}
    for _, row in xlsx_verknuepfungen.iterrows():
        raw = _norm(row.get("rolle"))
        if not raw:
            continue
        if _strip_gender(raw) in rollen:
            continue
        place = f"{row.get('_xlsx_sheet')}:{row.get('_xlsx_row')}"
        findings.setdefault(raw, []).append(place)
    if findings:
        _fail_with_findings("Rollenwerte", findings)


@pytest.mark.data_quality
def test_recorded_types_are_in_the_value_list(xlsx_verknuepfungen):
    typen, _ = _werteliste()
    assert len(typen) > 8, "Werteliste unplausibel klein"
    findings = {}
    for _, row in xlsx_verknuepfungen.iterrows():
        raw = _norm(row.get("typ"))
        if not raw or raw in typen or raw in KOMPOSIT_TYPEN:
            continue
        place = f"{row.get('_xlsx_sheet')}:{row.get('_xlsx_row')}"
        findings.setdefault(raw, []).append(place)
    if findings:
        _fail_with_findings("Typwerte", findings)


@pytest.mark.data_quality
def test_no_row_with_name_but_empty_type(xlsx_verknuepfungen):
    """Ohne Typ fehlt der Zielkontext, die Zeile erreicht den Datensatz nicht."""
    findings = {}
    sig = None
    for _, row in xlsx_verknuepfungen.iterrows():
        sig_val = _norm(row.get("archivsignatur"))
        if sig_val:
            sig = sig_val
        if _norm(row.get("typ")) or not _norm(row.get("name")):
            continue
        key = f"{sig or '(ohne Signatur)'} / Folio {_norm(row.get('folio')) or '-'}"
        place = f"{row.get('_xlsx_sheet')}:{row.get('_xlsx_row')}"
        findings.setdefault(key, []).append(place)
    if findings:
        lines = ["Zeilen mit Name, aber ohne Typ (Signatur/Folio -> Zeilen):"]
        for key, places in sorted(findings.items(), key=lambda x: -len(x[1])):
            lines.append(f"  {key}  ({len(places)} Zeilen)")
        lines.append("Fix: Typ ergaenzen, bei Dokumentgattungen der Typ dokument.")
        pytest.fail("\n".join(lines))
