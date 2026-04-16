"""Vokabular-Coverage-Tests: sind alle belegten Werte aus XLSX im Output abgedeckt?

Fuer Rollen, Dokumenttypen und Waehrungen. Bei jeder Modell-Erweiterung
gibt diese Suite schnelles Feedback, wenn etwas im Pipeline-Mapping fehlt.

Testbasis: data/source-v2/ vs. data/output-v2/m3gim.jsonld.
"""

from collections import Counter

import pytest

from _helpers import ensure_list
from test_13_finanzen import FINANCE_FIELDS, ALLOWED_CURRENCIES, iter_finance_details


# ---------------------------------------------------------------------------
# Rollen-Normalisierung: jeder XLSX-Rolle-Wert hat ein eindeutiges Ziel
# ---------------------------------------------------------------------------

def _normalize_role_for_test(s: str) -> str:
    """Spiegelt scripts.transform.normalize_role() 1:1."""
    if s is None:
        return None
    v = str(s).strip().lower()
    if not v:
        return None
    for suffix in (":innen", ":in"):
        if v.endswith(suffix):
            v = v[: -len(suffix)]
            break
    return v


def test_xlsx_roles_have_stable_normalization(xlsx_verknuepfungen):
    """Nach Normalisierung darf es keine Kollision geben, die Information
    loescht. Sprich: wenn zwei verschiedene Rohrollen zum gleichen
    normalisierten Wert fuehren, ist das ok — aber jede Rohrolle selbst
    muss einen nicht-leeren, eindeutigen normalisierten Wert haben.
    """
    df = xlsx_verknuepfungen
    if "rolle" not in df.columns:
        pytest.skip("rolle-Spalte nicht in XLSX")
    mapping = {}
    for raw in df["rolle"].dropna().astype(str):
        norm = _normalize_role_for_test(raw)
        assert norm, f"Rohrolle {raw!r} normalisiert zu leerem String"
        mapping.setdefault(norm, set()).add(raw)
    # Info-Output: wie viele Roh-Rollen fallen auf je 1 normalisierte Rolle
    multi = {k: sorted(v) for k, v in mapping.items() if len(v) > 1}
    if multi:
        print(f"INFO: {len(multi)} normalisierte Rollen aus mehreren Rohformen:")
        for k, v in sorted(multi.items())[:10]:
            print(f"  {k}: {v}")


# Rollen aus data.md § 5 (kanonisches Vokabular nach Normalisierung)
DATA_MD_ROLES = {
    # Personen
    "verfasser", "adressat", "absender", "empfänger", "unterzeichner",
    "abgebildet", "agent", "vermittler", "auftraggeber", "widmungsempfänger",
    "erwähnt", "sänger", "dirigent", "regisseur", "komponist", "librettist",
    "übersetzer", "arrangeur", "chorleiter", "choreograph", "bühnenbildner",
    "kostümbildner", "ausstatter", "bühnenleiter", "technische leitung",
    "interpret", "protagonist",
    # Institutionell (mit Personen-Ueberlapp)
    "vertragspartner", "inhaber", "herausgeber",
    # Orte
    "entstehungsort", "zielort", "absendeort", "abreiseort", "auffuehrungsort",
    "wohnort", "vertragsort",
    # Institutionen
    "arbeitgeber", "veranstalter", "ausbildungsstätte", "fluggesellschaft",
    "rahmenveranstaltung",
    # Ereignisse + Werke + Buehnenrollen
    "premiere", "auftritt", "probe", "aufführung", "festvorstellung",
    "wiederaufnahme", "implizit", "repertoire",
    # Datumsrollen
    "absendedatum", "empfangsdatum", "ausstellungsdatum", "erscheinungsdatum",
    "abreisedatum", "probenbeginn", "ausstrahlung", "spielzeit", "überweisung",
    "gespräch",
    # Finanz
    "abendgage", "provision",
    # Zusaetzlich aus Datenbestand v2: Komposit-Rollen
    "gastspiel", "generalprobe", "auftrag", "entstehung",
}


def test_v2_roles_covered_by_data_md_vocab(xlsx_verknuepfungen):
    """Jede in v2 belegte Rolle (nach Normalisierung) steht in data.md § 5.
    Wenn Unbekannte auftauchen: data.md erweitern oder XLSX korrigieren.
    """
    df = xlsx_verknuepfungen
    if "rolle" not in df.columns:
        pytest.skip("rolle-Spalte nicht in XLSX")
    present = Counter()
    for raw in df["rolle"].dropna().astype(str):
        norm = _normalize_role_for_test(raw)
        if norm:
            present[norm] += 1
    unknown = {r: n for r, n in present.items() if r not in DATA_MD_ROLES}
    assert not unknown, (
        f"Rollen im Datenbestand ohne data.md-Eintrag (data.md § 5 erweitern "
        f"oder XLSX korrigieren): {sorted(unknown.items(), key=lambda x: -x[1])[:10]}"
    )


# ---------------------------------------------------------------------------
# Dokumenttyp-Coverage: jeder belegte dokumenttyp ist im Mapping
# ---------------------------------------------------------------------------

def test_every_xlsx_dokumenttyp_is_mapped(xlsx_objekte):
    """Jede dokumenttyp-Instanz aus Objekte.xlsx muss im DOKUMENTTYP_TO_DFT-Mapping
    stehen (nach normalize_lower). Sonst verliert die Pipeline diesen Record-Typ.
    """
    import sys
    from pathlib import Path
    SCRIPTS = Path(__file__).parent.parent / "scripts"
    if str(SCRIPTS) not in sys.path:
        sys.path.insert(0, str(SCRIPTS))
    from transform import DOKUMENTTYP_TO_DFT

    df = xlsx_objekte
    if "dokumenttyp" not in df.columns:
        pytest.skip("dokumenttyp-Spalte fehlt")
    unknown = Counter()
    for raw in df["dokumenttyp"].dropna().astype(str):
        norm = raw.strip().lower()
        if norm and norm not in DOKUMENTTYP_TO_DFT:
            unknown[norm] += 1
    assert not unknown, (
        f"Dokumenttypen ohne Mapping (DOKUMENTTYP_TO_DFT erweitern): "
        f"{sorted(unknown.items(), key=lambda x: -x[1])}"
    )


# ---------------------------------------------------------------------------
# Rollen im Output entsprechen den belegten Rollen
# ---------------------------------------------------------------------------

def _collect_output_roles(records):
    roles = Counter()
    for r in records:
        for prop in ("m3gim:hasAssociatedAgent", "rico:hasOrHadLocation",
                     "rico:hasOrHadSubject", "m3gim:hasPerformanceRole"):
            for ent in ensure_list(r.get(prop)):
                if isinstance(ent, dict) and ent.get("role"):
                    roles[ent["role"]] += 1
    return roles


def test_output_roles_are_all_normalized(records):
    """Keine Rolle im JSON-LD-Output traegt noch :in/:innen oder Grossbuchstaben."""
    roles = _collect_output_roles(records)
    offenders = [
        (r, c) for r, c in roles.items()
        if r.endswith(":in") or r.endswith(":innen") or r != r.lower()
    ]
    assert not offenders, f"Nicht-normalisierte Rollen im Output: {offenders[:10]}"


def test_output_roles_subset_of_data_md(records):
    """Alle Rollen im Output stehen im data.md-Vokabular.
    Sichert konsistentes Vokabular ueber die gesamte Pipeline hinweg.
    """
    roles = _collect_output_roles(records)
    unknown = {r: c for r, c in roles.items() if r not in DATA_MD_ROLES}
    assert not unknown, (
        f"Rollen im Output nicht in data.md § 5: "
        f"{sorted(unknown.items(), key=lambda x: -x[1])[:10]}"
    )


# ---------------------------------------------------------------------------
# Waehrungs-Coverage: jede belegte Waehrung im Datenbestand ist erlaubt
# ---------------------------------------------------------------------------

def test_xlsx_currencies_all_allowed(xlsx_verknuepfungen):
    """Jede belegte Waehrung aus XLSX-Finanzzeilen ist in ALLOWED_CURRENCIES.
    Bei neuer Waehrung: data.md § 11 und tests/test_13_finanzen.py aktualisieren.
    """
    import sys
    from pathlib import Path
    SCRIPTS = Path(__file__).parent.parent / "scripts"
    if str(SCRIPTS) not in sys.path:
        sys.path.insert(0, str(SCRIPTS))
    from transform import parse_monetary_value

    df = xlsx_verknuepfungen
    if "typ" not in df.columns or "name" not in df.columns:
        pytest.skip("Spalten fehlen")
    # Finanz-Rows erkennen ueber typ-Prefix
    fin_mask = df["typ"].fillna("").str.lower().str.contains(
        "ausgaben|einnahmen|summe", regex=True
    )
    currencies = Counter()
    for name in df.loc[fin_mask, "name"].dropna().astype(str):
        _, currency = parse_monetary_value(name)
        if currency:
            currencies[currency] += 1
    unknown = {c: n for c, n in currencies.items() if c not in ALLOWED_CURRENCIES}
    assert not unknown, (
        f"Waehrungen aus XLSX ohne Vokabular-Eintrag: {sorted(unknown.items())}"
    )
