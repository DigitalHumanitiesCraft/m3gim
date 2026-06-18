"""Frontend-Kontrakt: Annahmen aus loader.js, aggregator.js.

Diese Tests sichern ab, dass der Output die impliziten Annahmen der
JS-Module erfüllt, damit keine Regressionen beim Datenupdate entstehen.
Inkl. v2-Store-Invarianten (Phase 6): dftHierarchy, mobilityEvents,
agentRelations, finances, typisierte Datumsfelder."""

import re

import pytest

from _helpers import ensure_list, iter_entities_with_id


WD_ID_PATTERN = re.compile(r"^wd:Q\d+$")
DATE_LIKE_PATTERN = re.compile(r"^\d{4}(-\d{2}){0,2}")
ISO_DATE_PATTERN = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")
# STE atDate darf zusaetzlich einen Qualifier tragen (data.md § 6): "Wien, ab
# 1956" wird zu atDate="nach:1956" (E-102). extractYear in date-parser.js greift
# die Jahreszahl unabhaengig vom Praefix.
ISO_OR_QUALIFIED_PATTERN = re.compile(r"^(circa:|vor:|nach:)?\d{4}(-\d{2}(-\d{2})?)?$")
AGRELON_TYPE_PATTERN = re.compile(r"^agrelon:(Has|Is)[A-Z]\w+$")


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


def test_context_declares_v2_namespaces(jsonld):
    """loader.js muss skos:broader und agrelon:* auflösen — @context pflicht."""
    ctx = jsonld.get("@context", {})
    for prefix in ("skos", "agrelon", "m3gim-dft"):
        assert prefix in ctx, f"Prefix {prefix!r} fehlt im @context (v2-Pflicht)"


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


# ---------------------------------------------------------------------------
# v2-Erweiterungen (Phase 6): Output-Invarianten für den erweiterten loader.js
#
# Diese Tests formulieren die Strukturen, die der erweiterte loader.js
# beim Aufbau von store.mobilityEvents, store.agentRelations, store.finances
# und store.dftHierarchy voraussetzt. loader.js wurde in Session 30 erweitert;
# die Tests sind reguläre Kontrakt-Tests.
# ---------------------------------------------------------------------------


def test_spatiotemporal_events_are_top_level(graph):
    """store.mobilityEvents soll aus Top-Level-Knoten im @graph aufgebaut werden."""
    ste_nodes = [n for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"]
    assert len(ste_nodes) >= 30, f"Zu wenige SpatiotemporalEvents im @graph: {len(ste_nodes)}"
    missing_id = [n for n in ste_nodes if not n.get("@id", "").startswith("m3gim:ste_")]
    assert not missing_id, f"SpatiotemporalEvent ohne m3gim:ste_-ID: {missing_id[:3]}"


def test_spatiotemporal_events_have_required_fields(graph):
    """loader.js-Indexierung braucht atPlace + atDate (ISO oder ISO/ISO-Range) pro Event."""
    ste_nodes = [n for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"]
    offenders = []
    for n in ste_nodes:
        place = n.get("m3gim:atPlace")
        date = n.get("m3gim:atDate")
        if not (isinstance(place, dict) and place.get("name")):
            offenders.append((n.get("@id"), "atPlace"))
            continue
        if not isinstance(date, str):
            offenders.append((n.get("@id"), f"atDate Typ={type(date).__name__}"))
            continue
        # Range (ISO/ISO) zulassen — Spielzeit-Events wie 1947/1952; Qualifier
        # (nach:/vor:/circa:) zulassen — Freitext-Beginn wie "nach:1956".
        parts = date.split("/") if "/" in date else [date]
        if not all(ISO_OR_QUALIFIED_PATTERN.match(p) for p in parts):
            offenders.append((n.get("@id"), f"atDate={date!r}"))
    assert not offenders, f"SpatiotemporalEvent-Pflichtfelder fehlen: {offenders[:5]}"


def test_hasSpatiotemporalEvent_refs_resolve(records, graph):
    """store.recordToEvents erwartet auflösbare @id-Referenzen auf STE-Knoten."""
    ste_ids = {n["@id"] for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"}
    assert ste_ids, "Keine SpatiotemporalEvents im Graph — Baseline verletzt"
    unresolved = []
    ref_count = 0
    for r in records:
        for ref in ensure_list(r.get("m3gim:hasSpatiotemporalEvent")):
            if not isinstance(ref, dict):
                unresolved.append((r["@id"], f"nicht-dict: {type(ref).__name__}"))
                continue
            ref_count += 1
            if ref.get("@id") not in ste_ids:
                unresolved.append((r["@id"], ref.get("@id")))
    assert ref_count >= 10, f"Zu wenige hasSpatiotemporalEvent-Referenzen: {ref_count}"
    assert not unresolved, f"Unauflösbare STE-Referenzen: {unresolved[:5]}"


def test_agent_relations_have_type_and_object(records):
    """store.agentRelations braucht @type (agrelon:HasXxx) + agrelon:hasObject mit name."""
    offenders = []
    total = 0
    for r in records:
        for rel in ensure_list(r.get("m3gim:agentRelation")):
            if not isinstance(rel, dict):
                offenders.append((r["@id"], f"rel ist {type(rel).__name__}"))
                continue
            total += 1
            rel_type = rel.get("@type", "")
            if not AGRELON_TYPE_PATTERN.match(rel_type):
                offenders.append((r["@id"], f"@type={rel_type!r}"))
                continue
            obj = rel.get("agrelon:hasObject")
            if not (isinstance(obj, dict) and obj.get("name")):
                offenders.append((r["@id"], f"{rel_type}: hasObject ohne name"))
    assert total >= 10, f"Zu wenige agentRelation-Einträge: {total}"
    assert not offenders, f"Malformed agentRelation: {offenders[:5]}"


def test_finance_details_have_amount_structure(records):
    """store.finances braucht monetaryAmount als typisiertes Literal + detailRole.
    Currency kann fehlen (Bug, siehe test_finance_details_have_currency)."""
    offenders = []
    finance_count = 0
    for r in records:
        for det in ensure_list(r.get("m3gim:hasDetail")):
            if not isinstance(det, dict):
                continue
            if det.get("@type") != "m3gim:DetailAnnotation":
                continue
            amount = det.get("m3gim:monetaryAmount")
            if amount is None:
                continue
            finance_count += 1
            if not (isinstance(amount, dict) and amount.get("@value") and amount.get("@type") == "xsd:decimal"):
                offenders.append((r["@id"], f"monetaryAmount malformed: {amount!r}"))
            if not det.get("m3gim:detailRole"):
                offenders.append((r["@id"], "detailRole fehlt"))
    assert finance_count >= 10, f"Zu wenige Finanz-Details: {finance_count}"
    assert not offenders, f"Malformed Finanz-Details: {offenders[:5]}"


def test_finance_details_have_currency(records):
    """Jedes monetaryAmount im Output braucht m3gim:currency für die UI-Darstellung.
    Fehlt die Währung in der Quelle, greift FINANCE_CURRENCY_DEFAULTS in transform.py."""
    offenders = []
    for r in records:
        for det in ensure_list(r.get("m3gim:hasDetail")):
            if not isinstance(det, dict):
                continue
            if det.get("m3gim:monetaryAmount") is not None and not det.get("m3gim:currency"):
                offenders.append((r["@id"], det.get("m3gim:detailField"), det.get("m3gim:detailValue")))
    assert not offenders, f"Finanz-Details ohne currency: {offenders[:5]}"


def test_dft_hierarchy_concepts_resolve(graph, records):
    """store.dftHierarchy erwartet auflösbare skos:broader-Referenzen + Record-Referenzen."""
    concepts = {n["@id"]: n for n in graph if n.get("@type") == "skos:Concept"}
    assert len(concepts) >= 10, f"Zu wenige skos:Concepts: {len(concepts)}"

    broken_broader = []
    for cid, c in concepts.items():
        broader = c.get("skos:broader")
        if broader is None:
            continue
        if not isinstance(broader, dict):
            broken_broader.append((cid, f"broader ist {type(broader).__name__}"))
            continue
        bid = broader.get("@id")
        if bid and bid not in concepts:
            broken_broader.append((cid, f"broader→{bid} unauflösbar"))
    assert not broken_broader, f"skos:broader-Referenzen defekt: {broken_broader[:5]}"

    # Jede von Records referenzierte DFT-ID existiert als Concept
    unresolved_from_records = []
    for r in records:
        dft = r.get("rico:hasDocumentaryFormType")
        for ent in ensure_list(dft):
            if isinstance(ent, dict) and ent.get("@id"):
                if ent["@id"] not in concepts:
                    unresolved_from_records.append((r["@id"], ent["@id"]))
    assert not unresolved_from_records, (
        f"Record verweist auf nicht-existente DFT-Concepts: {unresolved_from_records[:5]}"
    )


def test_typed_date_properties_usable_for_indexByYear(records):
    """indexByYear soll typisierte Daten nutzen, wenn rico:date fehlt.

    loader.js muss mit 3 Formen rechnen:
      - Einzelwert (String): ISO oder qualifiziert (circa:/vor:/nach:)
      - Range-String: "ISO/ISO" (z.B. Spielzeit, Zwei-Tages-Event)
      - Liste: mehrere der obigen (Mehrfach-Auftritte in einem Dokument)
    """
    typed_props = (
        "m3gim:absendedatum", "m3gim:auffuehrungsdatum", "m3gim:premieredatum",
        "m3gim:erscheinungsdatum", "m3gim:auftrittsdatum", "m3gim:ausstellungsdatum",
        "m3gim:empfangsdatum", "m3gim:gespraechsdatum", "m3gim:probendatum",
        "m3gim:probenbeginn", "m3gim:spielzeitVon", "m3gim:ueberweisungsdatum",
        "m3gim:ausstrahlungsdatum", "m3gim:abreisedatum",
    )

    def _valid_single(s):
        if not isinstance(s, str):
            return False
        bare = s
        for pfx in ("circa:", "vor:", "nach:"):
            if bare.startswith(pfx):
                bare = bare[len(pfx):]
                break
        parts = bare.split("/") if "/" in bare else [bare]
        return all(ISO_DATE_PATTERN.match(p) for p in parts)

    offenders = []
    total = 0
    for r in records:
        for prop in typed_props:
            v = r.get(prop)
            if v is None:
                continue
            total += 1
            values = v if isinstance(v, list) else [v]
            for val in values:
                if not _valid_single(val):
                    offenders.append((r["@id"], prop, val))
    assert total >= 20, f"Zu wenige typisierte Datumswerte: {total}"
    assert not offenders, f"Nicht-parsbare typisierte Daten: {offenders[:5]}"
