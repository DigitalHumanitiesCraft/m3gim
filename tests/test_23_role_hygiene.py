"""Role hygiene on places (session 34, phase 2 step 3).

Bug: in the ``ort,datum`` composite of the Verknuepfungen table the role of the
whole Verknuepfungen entry (a date role like ``erscheinungsdatum`` or
``auffuehrungsdatum``) is blindly inherited by both halves. As a result the
``rico:Place`` entry of a record carries a date role although the role
semantically belongs only to the date part. UI consequence:
``Muenchen (erscheinungsdatum)`` in the archive inline detail.

Fix: in the place normalization (``scripts/transform.py``, ``t == "ort"`` branch
of ``add_relations_to_records``) the ``role`` field is removed when the recorded
role is in ``DATE_ONLY_ROLES``. Non-date roles (``auffuehrungsort``,
``wohnort``, ``erscheinungsort`` etc.) are kept.
"""



# Must stay in sync with DATE_ONLY_ROLES in scripts/transform.py. The recorded
# value is checked, not the concept it resolves to: the role is removed before
# resolution.
DATE_ROLES = {
    "absendedatum", "empfangsdatum", "ausstellungsdatum", "erscheinungsdatum",
    "abreisedatum", "auftritt", "aufführung", "probe", "probenbeginn",
    "premiere", "ausstrahlung", "spielzeit", "überweisung", "gespräch",
}


def recorded_role(entity):
    """The recorded role value of a node, before the merge."""
    role = entity.get("role")
    if role is None:
        return ""
    origin = entity.get("m3gim-ontology:derivedFromRole")
    if origin:
        return origin
    if isinstance(role, dict):
        return role.get("skos:prefLabel", "")
    return role


def _iter_record_locations(graph):
    """Yields (record_id, place_dict) for every rico:Place-Subobjekt an einem Record."""
    for n in graph:
        if n.get("@type") != "rico:Record":
            continue
        locs = n.get("rico:hasOrHadLocation") or []
        if isinstance(locs, dict):
            locs = [locs]
        for loc in locs:
            if isinstance(loc, dict):
                yield n.get("@id"), loc


# ---------------------------------------------------------------------------
# Anchor assert (guards the role-hygiene fix from session 34)
# ---------------------------------------------------------------------------


def test_anchor_location_no_date_role(graph):
    """NIM_004_12 carries a Stuttgart place that came in the raw data with the
    composite role ``erscheinungsdatum``. After the fix this ``role`` field must
    no longer hang on the place entry."""
    targets = [
        place for rec_id, place in _iter_record_locations(graph)
        if rec_id == "m3gim-data:NIM_004_12"
    ]
    assert targets, "Anker-Record NIM_004_12 hat keinen rico:Place — Fixture pflegen"

    offenders = [p for p in targets if recorded_role(p).strip().lower() in DATE_ROLES]
    assert not offenders, (
        f"NIM_004_12: rico:Place traegt noch eine Datumsrolle: "
        f"{[(p.get('name'), p.get('role')) for p in offenders]}"
    )


# ---------------------------------------------------------------------------
# Shape assertion (globally clean after the fix)
# ---------------------------------------------------------------------------


def test_no_record_location_has_date_role(graph):
    """No rico:Place on a record carries a date role."""
    offenders = [
        (rec_id, p.get("name"), recorded_role(p))
        for rec_id, p in _iter_record_locations(graph)
        if recorded_role(p).strip().lower() in DATE_ROLES
    ]
    assert not offenders, (
        f"{len(offenders)} rico:Place-Eintraege mit Datumsrolle gefunden "
        f"(erste 5: {offenders[:5]}). Fix in scripts/transform.py "
        f"(Ort-Zweig, role aus entry entfernen, wenn in DATE_ONLY_ROLES)."
    )
