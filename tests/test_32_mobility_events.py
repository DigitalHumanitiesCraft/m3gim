"""Mobility events from place roles (E-97, data-backed core).

The mobility place roles (zielort/absendeort/abreiseort/empfangsort/vertragsort)
each produce a DATELESS m3gim-ontology:Annotation node, a first-class mobility
event for the mobility atlas. The place additionally stays as
rico:hasOrHadLocation on the record (no index regression).

Delimitation: wohnort (a state with agrelon:hasValidityPeriod) and
vertragspartner (an AgRelOn relation) are specified in E-97 but occur 0 times in
the current export and are deliberately NOT implemented (no speculative,
never-firing code, guardrail "data-backed"). The tests test_dated_ste_unaffected
and test_wohnort_not_a_point_event secure this delimitation as regression
guards.

Spec: data.md § The link mechanism, § Role values, journal.md E-97.
"""

from _helpers import ensure_list

# After the merge in the vocabulary the aspect pairs carry the same term:
# absendeort is absendung, empfangsort is empfangnahme, abreiseort is abreise.
MOBILITY_PLACE_ROLES = {
    "zielort", "absendung", "abreise", "empfangnahme", "vertragsort",
}


def _role_label(node):
    role = node.get("role")
    if isinstance(role, dict):
        return role.get("skos:prefLabel", "")
    return role or ""


def _stes(graph):
    """Verortungen: annotation nodes that carry a place."""
    return [n for n in graph if isinstance(n, dict)
            and n.get("@type") == "m3gim-ontology:Annotation"
            and n.get("m3gim-ontology:atPlace")]


def _mobility_stes(graph):
    return [n for n in _stes(graph)
            if _role_label(n) in MOBILITY_PLACE_ROLES]


# --- Data-backed core (E-97) ----------------------------------------------

def test_mobility_place_role_emits_wellformed_ste(graph, records):
    """Every mobility place role produces a well-formed
    m3gim-ontology:Annotation node: atPlace with name, role from the mobility
    vocabulary, self-provenance to an existing record.

    Data shape of the deeper export (E-97 extended): most mobility place roles
    come from pure `ort` rows and stay DATELESS. Some (e.g. `vertragsort` on
    `ort, datum` composites) carry a decomposed ISO date and are then legitimately
    dated, where the place is the decomposed part (atPlace='Bayreuth', not the raw
    cell 'Bayreuth, 1952-08-25'). When an atDate is present it must be ISO-shaped
    (no place leak into the date)."""
    from transform import is_iso_date  # noqa: PLC0415
    rec_ids = {r["@id"] for r in records}
    mob = _mobility_stes(graph)
    assert len(mob) >= 10, f"Nur {len(mob)} Mobilitaets-STE — Routing greift nicht"
    offenders = []
    for ev in mob:
        date = ev.get("m3gim-ontology:atDate")
        if date is not None and not is_iso_date(date):
            offenders.append((ev.get("@id"), "atDate nicht ISO", date))
        place = ev.get("m3gim-ontology:atPlace")
        place_name = (place.get("name") if isinstance(place, dict) else "") or ""
        if not place_name.strip():
            offenders.append((ev.get("@id"), "atPlace", place))
        # Place-leak guard: the decomposed place name never contains the date.
        elif date and date in place_name:
            offenders.append((ev.get("@id"), "Datum im Ortsnamen", place_name))
        prov = ev.get("agrelon:metadataProvenance")
        rid = prov.get("@id") if isinstance(prov, dict) else None
        if rid not in rec_ids:
            offenders.append((ev.get("@id"), "provenance", rid))
    assert not offenders, f"Fehlgeformte Mobilitaets-STE: {offenders[:5]}"


def test_pure_ort_mobility_stes_stay_dateless(graph, records):
    """The dateless E-97 core stays intact: there remains a relevant number of
    DATELESS mobility STE (from pure `ort` rows, source:
    zielort/absendeort/abreiseort without a date). Ensures the dateless path does
    not accidentally vanish in favor of dated STE."""
    dateless = [ev for ev in _mobility_stes(graph) if "m3gim-ontology:atDate" not in ev]
    assert len(dateless) >= 10, (
        f"Nur {len(dateless)} datumslose Mobilitaets-STE — der E-97-Kern "
        f"(reine ort-Zeilen) ist verloren gegangen"
    )


def test_mobility_place_retained_as_location(graph, records):
    """The mobility place additionally stays as rico:hasOrHadLocation on the
    source record (no regression of the Ortsindex). For at least one mobility STE
    the atPlace name coincides with a record location."""
    rec_by_id = {r["@id"]: r for r in records}
    overlaps = 0
    for ev in _mobility_stes(graph):
        prov = ev.get("agrelon:metadataProvenance")
        rid = prov.get("@id") if isinstance(prov, dict) else None
        rec = rec_by_id.get(rid)
        if not rec:
            continue
        place_name = (ev.get("m3gim-ontology:atPlace") or {}).get("name")
        loc_names = {
            (loc or {}).get("name")
            for loc in ensure_list(rec.get("rico:hasOrHadLocation"))
            if isinstance(loc, dict)
        }
        if place_name in loc_names:
            overlaps += 1
    assert overlaps >= 1, (
        "Kein Mobilitaets-Ort als rico:hasOrHadLocation erhalten — Index-Regress"
    )


# --- Regression guards / delimitation (no xfail) --------------------------

def test_dated_ste_unaffected(graph):
    """The existing composite ort,datum Verortungen (WITH atDate) stay intact; at
    least 40 dated Verortungen in the graph (baseline 46)."""
    dated = [n for n in _stes(graph) if "m3gim-ontology:atDate" in n]
    assert len(dated) >= 40, (
        f"Nur {len(dated)} datierte Verortungen — Komposit-Pfad regressiert"
    )


def test_wohnort_not_a_point_event(graph):
    """wohnort is a state, not a point event: no Verortung carries the role
    'wohnort' (E-97 delimitation; the state modeling with validity is deliberately
    deferred for lack of data coverage)."""
    offenders = [n.get("@id") for n in _stes(graph)
                 if _role_label(n) == "wohnort"]
    assert not offenders, (
        f"{len(offenders)} Verortungen mit Rolle 'wohnort' — als Punktereignis "
        f"fehlmodelliert: {offenders[:5]}"
    )
