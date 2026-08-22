"""Rollen-Hygiene an Orten (Session 34, Phase 2 Schritt 3).

Bug: Im Komposit ``ort,datum`` der Verknuepfungstabelle wird die Rolle
des gesamten Verknuepfungs-Eintrags (eine Datumsrolle wie ``erscheinungsdatum``
oder ``auffuehrungsdatum``) blind an beide Haelften vererbt. Dadurch traegt
der ``rico:Place``-Eintrag eines Records eine Datumsrolle, obwohl die Rolle
semantisch nur zum Datum-Teil gehoert. Folge im UI: ``Muenchen (erscheinungsdatum)``
im Archiv-Inline-Detail.

Fix: In der Ort-Normalisierung (``scripts/transform.py``, ``t == "ort"``-Zweig
von ``add_relations_to_records``) wird das ``role``-Feld entfernt, wenn die
erfasste Rolle in ``DATE_ONLY_ROLES`` liegt. Nicht-Datumsrollen
(``auffuehrungsort``, ``wohnort``, ``erscheinungsort`` etc.) bleiben erhalten.
"""



# Muss mit DATE_ONLY_ROLES in scripts/transform.py synchron bleiben.
# Geprueft wird der erfasste Wert, nicht das Concept, auf das er fuehrt:
# die Rolle wird vor der Aufloesung entfernt.
DATE_ROLES = {
    "absendedatum", "empfangsdatum", "ausstellungsdatum", "erscheinungsdatum",
    "abreisedatum", "auftritt", "aufführung", "probe", "probenbeginn",
    "premiere", "ausstrahlung", "spielzeit", "überweisung", "gespräch",
}


def recorded_role(entity):
    """Der erfasste Rollenwert eines Knotens, vor der Zusammenfuehrung."""
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
# Anker-Assert (sichert Role-Hygiene-Fix aus Session 34)
# ---------------------------------------------------------------------------


def test_anchor_location_no_date_role(graph):
    """NIM_004_12 traegt einen Stuttgart-Ort, der im Rohdatensatz mit der
    Komposit-Rolle ``erscheinungsdatum`` kam. Nach dem Fix darf dieses
    ``role``-Feld nicht mehr am Place-Entry haengen."""
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
# Shape-Assertion (nach Fix global sauber)
# ---------------------------------------------------------------------------


def test_no_record_location_has_date_role(graph):
    """Kein rico:Place an einem Record traegt eine Datumsrolle."""
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
