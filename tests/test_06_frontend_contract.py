"""Frontend-Kontrakt: Annahmen aus loader.js, aggregator.js.

Diese Tests sichern ab, dass der Output die impliziten Annahmen der
JS-Module erfüllt, damit keine Regressionen beim Datenupdate entstehen."""

import re

from _helpers import ensure_list, iter_entities_with_id


WD_ID_PATTERN = re.compile(r"^wd:Q\d+$")
DATE_LIKE_PATTERN = re.compile(r"^\d{4}(-\d{2}){0,2}")


def test_hasOrHadPart_never_string(graph):
    """loader.js macht ensureArray() — muss object oder array sein, nie String."""
    offenders = []
    for n in graph:
        parts = n.get("rico:hasOrHadPart")
        if parts is None:
            continue
        if isinstance(parts, str):
            offenders.append(n["@id"])
    assert not offenders, f"hasOrHadPart als String: {offenders[:3]}"


def test_location_names_not_dates(records):
    """loader.js filtert Date-Leakage, aber Output sollte sauber sein."""
    offenders = []
    for r in records:
        for loc in ensure_list(r.get("rico:hasOrHadLocation")):
            if not isinstance(loc, dict):
                continue
            name = loc.get("name", "")
            if name and DATE_LIKE_PATTERN.match(name):
                offenders.append((r["@id"], name))
    assert not offenders, f"Date-like Location-Namen: {offenders[:3]}"


def test_wikidata_ids_well_formed(records):
    """Alle wd:Qxxx-IDs matchen Pattern."""
    offenders = []
    for r in records:
        for ent in iter_entities_with_id(r):
            aid = ent.get("@id", "")
            if aid.startswith("wd:") and not WD_ID_PATTERN.match(aid):
                offenders.append((r["@id"], aid))
    assert not offenders, f"Schlecht geformte WD-IDs: {offenders[:3]}"


def test_owl_sameAs_matches_wd_id(records):
    """Wenn @id: wd:Qxxx, dann owl:sameAs voll qualifiziert."""
    offenders = []
    for r in records:
        for ent in iter_entities_with_id(r):
            aid = ent.get("@id", "")
            if aid.startswith("wd:Q"):
                expected = "http://www.wikidata.org/entity/" + aid.replace("wd:", "")
                actual = ent.get("owl:sameAs", "")
                if actual != expected:
                    offenders.append((r["@id"], aid, actual))
    assert not offenders, f"owl:sameAs-Inkonsistenz: {offenders[:3]}"


def test_every_konvolut_has_at_most_one_folio_child(konvolute):
    """loader.js:99 sucht _Folio-Kind — max. 1 pro Konvolut."""
    offenders = []
    for k in konvolute:
        folio_children = [
            p.get("@id", "") for p in ensure_list(k.get("rico:hasOrHadPart"))
            if isinstance(p, dict) and p.get("@id", "").endswith("_Folio")
        ]
        if len(folio_children) > 1:
            offenders.append((k["@id"], folio_children))
    assert not offenders, f"Konvolut mit mehreren _Folio-Kindern: {offenders}"


def test_agents_always_object_or_list_of_objects(records):
    """Niemals String oder null in den 3 ensureArray-Properties."""
    ensure_props = ("m3gim:hasAssociatedAgent", "rico:hasOrHadLocation", "rico:hasOrHadSubject")
    offenders = []
    for r in records:
        for prop in ensure_props:
            v = r.get(prop)
            if v is None:
                continue
            if isinstance(v, dict):
                continue
            if isinstance(v, list):
                for item in v:
                    if not isinstance(item, dict):
                        offenders.append((r["@id"], prop, type(item).__name__))
                continue
            offenders.append((r["@id"], prop, type(v).__name__))
    assert not offenders, f"Falscher Typ in ensureArray-Properties: {offenders[:5]}"
