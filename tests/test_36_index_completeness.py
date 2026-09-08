"""Index field completeness: curated index columns reach the JSON-LD.

Before M1 the pipeline passed through only wikidata_id and komponist from the
four index XLSX (build_index_lookup -> process_verknuepfungen). All other
editorially maintained columns were lost: org seat (ort), work part
(rolle_stimme), person profession (anmerkung), Lebensdaten, associated person.

This test ensures the curated fields arrive as m3gim-ontology: properties on the
respective entity in the output. The expected source is the CANONICAL index
through the real pipeline reader load_index (with header-shift correction, E-95),
not the raw XLSX header that carries the leaked 'Graz'/'Rossini' value.

Frontend semantics (against false positives): the loader deduplicates entities by
name (store.persons/organizations/works as a map name->entry). The index match in
the pipeline hangs on the RAW Verknuepfungen name though; typo-laden occurrences
do not match. Decisive per entity (by name) is therefore: at least ONE occurrence
carries the correct value, and NO occurrence carries a wrong one. Minimum
occurrences prevent trivial green.
"""

import sys
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from transform import load_index, normalize_str  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _index_field_map(index_name: str, field: str) -> dict:
    """name.lower() -> trimmed field value, through the canonical reader.

    For a name recorded multiple times the first non-empty value wins, as in
    ``build_index_lookup`` since E-152. The earlier version let the last row win
    and thereby expected exactly the overwrite that cost the Nachlassbildnerin her
    maintained annotation.
    """
    df = load_index(index_name)
    out = {}
    if df is None or "name" not in df.columns or field not in df.columns:
        return out
    for _, row in df.iterrows():
        name = normalize_str(row.get("name"))
        val = row.get(field)
        if name and pd.notna(val) and str(val).strip():
            out.setdefault(name.lower(), str(val).strip())
    return out


def _agents_of_type(graph: list, atype: str) -> list:
    out = []
    for rec in graph:
        if rec.get("@type") != "rico:Record":
            continue
        ag = rec.get("m3gim-ontology:hasAssociatedAgent")
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
    """Persons as agents AND as mentioned subjects."""
    return _agents_of_type(graph, "rico:Person") + _subjects_of_type(graph, "rico:Person")


def _coverage(entities: list, field_map: dict, prop: str):
    """Frontend semantics (dedup by name): returns (present, wrong).

    present = names for which at least one occurrence carries the correct value.
    wrong   = occurrences with a non-empty value DIVERGING from the index.
    A missing value on individual occurrences is not an error (raw name variant).
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
# Org seat (column 'ort' in the Organisationsindex) -> m3gim-ontology:headquarters
# ---------------------------------------------------------------------------

def test_org_sitz_reaches_jsonld(graph):
    sitz_map = _index_field_map("Organisationsindex", "ort")
    assert len(sitz_map) >= 40, f"Nur {len(sitz_map)} Org-Sitze im Index — Reader kaputt."

    present, wrong = _coverage(_agents_of_type(graph, "rico:CorporateBody"), sitz_map, "m3gim-ontology:headquarters")
    assert not wrong, (
        f"{len(wrong)} Institution(en) mit falschem m3gim-ontology:headquarters. Erste 10:\n  "
        + "\n  ".join(f"{n}: {got!r} != {want!r}" for n, got, want in wrong[:10])
    )
    assert len(present) >= 15, (
        f"Nur {len(present)} Institutionen mit korrektem Index-Sitz im Graph — "
        f"der Sitz erreicht das Frontend nicht."
    )


def test_org_sitz_anchor_bayreuther_festspiele(graph):
    """Human-readable anchor: Bayreuther Festspiele -> Bayreuth."""
    orgs = _agents_of_type(graph, "rico:CorporateBody")
    festspiele = [a for a in orgs
                  if (normalize_str(a.get("name")) or "").lower() == "bayreuther festspiele"]
    assert festspiele, "Bayreuther Festspiele nicht als CorporateBody im Graph."
    vals = {a.get("m3gim-ontology:headquarters") for a in festspiele if a.get("m3gim-ontology:headquarters")}
    assert vals == {"Bayreuth"}, f"Bayreuther-Festspiele-Sitz unerwartet: {vals}"


# ---------------------------------------------------------------------------
# Work part (column 'rolle_stimme' in the Werkindex) -> m3gim-ontology:sungPart
# ---------------------------------------------------------------------------

def test_werk_partie_reaches_jsonld(graph):
    partie_map = _index_field_map("Werkindex", "rolle_stimme")
    assert len(partie_map) >= 55, f"Nur {len(partie_map)} Werk-Partien im Index — Reader kaputt."

    present, wrong = _coverage(_subjects_of_type(graph, "m3gim-ontology:MusicalWork"), partie_map, "m3gim-ontology:sungPart")
    assert not wrong, (
        f"{len(wrong)} Werk(e) mit falscher m3gim-ontology:sungPart. Erste 10:\n  "
        + "\n  ".join(f"{n}: {got!r} != {want!r}" for n, got, want in wrong[:10])
    )
    assert len(present) >= 15, (
        f"Nur {len(present)} Werke mit korrekter Index-Partie im Graph — die von "
        f"Malaniuk gesungene Partie erreicht das Frontend nicht."
    )


def test_werk_partie_anchor_tristan(graph):
    """Anchor: Tristan und Isolde -> Brangaene (Malaniuk's Bayreuth part)."""
    works = _subjects_of_type(graph, "m3gim-ontology:MusicalWork")
    tristan = [w for w in works
               if (normalize_str(w.get("name")) or "").lower() == "tristan und isolde"]
    assert tristan, "Tristan und Isolde nicht als MusicalWork im Graph."
    vals = {w.get("m3gim-ontology:sungPart") for w in tristan if w.get("m3gim-ontology:sungPart")}
    assert "Brangäne" in vals, f"Tristan-Partie unerwartet: {vals}"


# ---------------------------------------------------------------------------
# Person profession (column 'anmerkung' in the Personenindex) -> m3gim-ontology:indexNote
# ---------------------------------------------------------------------------

def test_person_beruf_reaches_jsonld(graph):
    beruf_map = _index_field_map("Personenindex", "anmerkung")
    assert len(beruf_map) >= 250, f"Nur {len(beruf_map)} Personen-Anmerkungen im Index — Reader kaputt."

    present, wrong = _coverage(_persons(graph), beruf_map, "m3gim-ontology:indexNote")
    df = load_index("Personenindex")
    allowed = {}
    for _, row in df.iterrows():
        name = normalize_str(row.get("name"))
        value = normalize_str(row.get("anmerkung"))
        if name and value:
            allowed.setdefault(name, set()).add(value)
    assert all(got in allowed.get(name, set()) for name, got, _ in wrong), (
        "Nicht aus einer realen gleichnamigen Indexzeile stammende Werte: " + repr(wrong[:10])
    )
    assert len(present) >= 50, (
        f"Nur {len(present)} Personen mit korrektem Index-Beruf im Graph — der "
        f"kuratierte Beruf erreicht das Frontend nicht."
    )


# ---------------------------------------------------------------------------
# Person Lebensdaten -> m3gim-ontology:lifespan
# ---------------------------------------------------------------------------

def test_person_lifespan_reaches_jsonld(graph):
    span_map = _index_field_map("Personenindex", "lebensdaten")
    assert len(span_map) >= 15, f"Nur {len(span_map)} Lebensdaten im Index — Reader kaputt."

    present, wrong = _coverage(_persons(graph), span_map, "m3gim-ontology:lifespan")
    assert not wrong, f"Falsche m3gim-ontology:lifespan-Werte: {wrong[:10]}"
    assert len(present) >= 3, f"Nur {len(present)} Personen mit Index-Lebensdaten im Graph."
