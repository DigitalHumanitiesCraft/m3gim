"""Index-Feld-Vollstaendigkeit: kuratierte Index-Spalten erreichen das JSON-LD.

Vor M1 reichte die Pipeline aus den vier Index-XLSX nur wikidata_id und
komponist durch (build_index_lookup -> process_verknuepfungen). Alle anderen
redaktionell gepflegten Spalten gingen verloren: Org-Sitz (ort), Werk-Partie
(rolle_stimme), Personen-Beruf (anmerkung), Lebensdaten, assoziierte Person.

Dieser Test sichert, dass die kuratierten Felder als m3gim:-Properties an der
jeweiligen Entitaet im Output ankommen. Soll-Quelle ist der KANONISCHE Index
ueber den echten Pipeline-Reader load_index (mit Header-Shift-Korrektur, E-95) —
nicht der Roh-XLSX-Header, der den geleakten 'Graz'/'Rossini'-Wert traegt.

Frontend-Semantik (gegen False Positives): Der Loader dedupliziert Entitaeten
nach Name (store.persons/organizations/works als Map name->entry). Der
Index-Match in der Pipeline haengt aber am ROHEN Verknuepfungs-Namen; tippfehler-
behaftete Vorkommen matchen nicht. Massgeblich ist daher pro Entitaet (nach
Name): mindestens EIN Vorkommen traegt den korrekten Wert, und KEIN Vorkommen
traegt einen falschen. Mindestvorkommen verhindern triviales Gruen.
"""

import sys
from pathlib import Path

import pandas as pd
import pytest

REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from transform import load_index, normalize_str  # noqa: E402


# ---------------------------------------------------------------------------
# Helfer
# ---------------------------------------------------------------------------

def _index_field_map(index_name: str, field: str) -> dict:
    """name.lower() -> getrimmter Feldwert, ueber den kanonischen Reader."""
    df = load_index(index_name)
    out = {}
    if df is None or "name" not in df.columns or field not in df.columns:
        return out
    for _, row in df.iterrows():
        name = normalize_str(row.get("name"))
        val = row.get(field)
        if name and pd.notna(val) and str(val).strip():
            out[name.lower()] = str(val).strip()
    return out


def _agents_of_type(graph: list, atype: str) -> list:
    out = []
    for rec in graph:
        if rec.get("@type") != "rico:Record":
            continue
        ag = rec.get("m3gim:hasAssociatedAgent")
        ag = ag if isinstance(ag, list) else ([ag] if ag else [])
        for a in ag:
            if isinstance(a, dict) and a.get("@type") == atype:
                out.append(a)
    return out


def _subjects_of_type(graph: list, atype: str) -> list:
    out = []
    for rec in graph:
        if rec.get("@type") != "rico:Record":
            continue
        subj = rec.get("rico:hasOrHadSubject")
        subj = subj if isinstance(subj, list) else ([subj] if subj else [])
        for s in subj:
            if isinstance(s, dict) and s.get("@type") == atype:
                out.append(s)
    return out


def _persons(graph: list) -> list:
    """Personen als Akteure UND als erwaehnte Subjekte."""
    return _agents_of_type(graph, "rico:Person") + _subjects_of_type(graph, "rico:Person")


def _coverage(entities: list, field_map: dict, prop: str):
    """Frontend-Semantik (Dedup nach Name): liefert (present, wrong).

    present = Namen, fuer die mind. ein Vorkommen den korrekten Wert traegt.
    wrong   = Vorkommen mit einem von Index ABWEICHENDEN, nicht-leeren Wert.
    Fehlender Wert an einzelnen Vorkommen ist kein Fehler (Roh-Namensvariante).
    """
    present = set()
    wrong = []
    for e in entities:
        nm = normalize_str(e.get("name"))
        if not nm:
            continue
        key = nm.lower()
        if key not in field_map:
            continue
        val = e.get(prop)
        if val is None:
            continue
        if val == field_map[key]:
            present.add(key)
        else:
            wrong.append((nm, val, field_map[key]))
    return present, wrong


# ---------------------------------------------------------------------------
# Org-Sitz (Spalte 'ort' im Organisationsindex) -> m3gim:sitz
# ---------------------------------------------------------------------------

def test_org_sitz_reaches_jsonld(graph):
    sitz_map = _index_field_map("Organisationsindex", "ort")
    assert len(sitz_map) >= 40, f"Nur {len(sitz_map)} Org-Sitze im Index — Reader kaputt."

    present, wrong = _coverage(_agents_of_type(graph, "rico:CorporateBody"), sitz_map, "m3gim:sitz")
    assert not wrong, (
        f"{len(wrong)} Institution(en) mit falschem m3gim:sitz. Erste 10:\n  "
        + "\n  ".join(f"{n}: {got!r} != {want!r}" for n, got, want in wrong[:10])
    )
    assert len(present) >= 15, (
        f"Nur {len(present)} Institutionen mit korrektem Index-Sitz im Graph — "
        f"der Sitz erreicht das Frontend nicht."
    )


def test_org_sitz_anchor_bayreuther_festspiele(graph):
    """Menschlich lesbarer Anker: Bayreuther Festspiele -> Bayreuth."""
    orgs = _agents_of_type(graph, "rico:CorporateBody")
    festspiele = [a for a in orgs
                  if (normalize_str(a.get("name")) or "").lower() == "bayreuther festspiele"]
    assert festspiele, "Bayreuther Festspiele nicht als CorporateBody im Graph."
    vals = {a.get("m3gim:sitz") for a in festspiele if a.get("m3gim:sitz")}
    assert vals == {"Bayreuth"}, f"Bayreuther-Festspiele-Sitz unerwartet: {vals}"


# ---------------------------------------------------------------------------
# Werk-Partie (Spalte 'rolle_stimme' im Werkindex) -> m3gim:partie
# ---------------------------------------------------------------------------

def test_werk_partie_reaches_jsonld(graph):
    partie_map = _index_field_map("Werkindex", "rolle_stimme")
    assert len(partie_map) >= 55, f"Nur {len(partie_map)} Werk-Partien im Index — Reader kaputt."

    present, wrong = _coverage(_subjects_of_type(graph, "m3gim:MusicalWork"), partie_map, "m3gim:partie")
    assert not wrong, (
        f"{len(wrong)} Werk(e) mit falscher m3gim:partie. Erste 10:\n  "
        + "\n  ".join(f"{n}: {got!r} != {want!r}" for n, got, want in wrong[:10])
    )
    assert len(present) >= 15, (
        f"Nur {len(present)} Werke mit korrekter Index-Partie im Graph — die von "
        f"Malaniuk gesungene Partie erreicht das Frontend nicht."
    )


def test_werk_partie_anchor_tristan(graph):
    """Anker: Tristan und Isolde -> Brangaene (Malaniuks Bayreuth-Partie)."""
    works = _subjects_of_type(graph, "m3gim:MusicalWork")
    tristan = [w for w in works
               if (normalize_str(w.get("name")) or "").lower() == "tristan und isolde"]
    assert tristan, "Tristan und Isolde nicht als MusicalWork im Graph."
    vals = {w.get("m3gim:partie") for w in tristan if w.get("m3gim:partie")}
    assert "Brangäne" in vals, f"Tristan-Partie unerwartet: {vals}"


# ---------------------------------------------------------------------------
# Personen-Beruf (Spalte 'anmerkung' im Personenindex) -> m3gim:editorialNote
# ---------------------------------------------------------------------------

def test_person_beruf_reaches_jsonld(graph):
    beruf_map = _index_field_map("Personenindex", "anmerkung")
    assert len(beruf_map) >= 250, f"Nur {len(beruf_map)} Personen-Anmerkungen im Index — Reader kaputt."

    present, wrong = _coverage(_persons(graph), beruf_map, "m3gim:editorialNote")
    assert not wrong, (
        f"{len(wrong)} Person(en) mit falscher m3gim:editorialNote. Erste 10:\n  "
        + "\n  ".join(f"{n}: {got!r} != {want!r}" for n, got, want in wrong[:10])
    )
    assert len(present) >= 50, (
        f"Nur {len(present)} Personen mit korrektem Index-Beruf im Graph — der "
        f"kuratierte Beruf erreicht das Frontend nicht."
    )


# ---------------------------------------------------------------------------
# Personen-Lebensdaten -> m3gim:lifespan
# ---------------------------------------------------------------------------

def test_person_lifespan_reaches_jsonld(graph):
    span_map = _index_field_map("Personenindex", "lebensdaten")
    assert len(span_map) >= 15, f"Nur {len(span_map)} Lebensdaten im Index — Reader kaputt."

    present, wrong = _coverage(_persons(graph), span_map, "m3gim:lifespan")
    assert not wrong, f"Falsche m3gim:lifespan-Werte: {wrong[:10]}"
    assert len(present) >= 3, f"Nur {len(present)} Personen mit Index-Lebensdaten im Graph."
