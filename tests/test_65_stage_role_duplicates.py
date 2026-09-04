"""Eine Partie je Dokument steht genau einmal, und zwar mit Interpret:in.

Die Verknuepfungen der Boxen 5 und 6 fuehren jede Buehnenrolle doppelt, einmal
als blanke ``rolle``-Zeile und einmal als Komposit aus Rolle und Person, von
denen nur das Komposit ``hasPerformer`` traegt (Befund handoff 2026-09-03). Die
Pipeline raeumt das Paar auf den Eintrag mit Interpret:in zusammen; dieser Test
haelt die Invariante fest.
"""

import collections


def _performances_by_record(graph):
    perf = {n["@id"]: n for n in graph
            if n.get("@type") == "m3gim-ontology:Performance"}
    by_record = collections.defaultdict(list)
    for node in graph:
        refs = node.get("m3gim-ontology:hasPerformance")
        if not refs:
            continue
        if isinstance(refs, dict):
            refs = [refs]
        for ref in refs:
            entry = perf.get(ref["@id"])
            if entry is not None:
                by_record[node.get("rico:identifier")].append(entry)
    return by_record


def _stage_role_id(perf):
    role = perf.get("m3gim-ontology:hasStageRole")
    return role.get("@id") if isinstance(role, dict) else role


def test_no_bare_duplicate_of_a_cast_stage_role(graph):
    """Kein Dokument fuehrt dieselbe Partie einmal mit und einmal ohne Person."""
    offenders = []
    for identifier, entries in _performances_by_record(graph).items():
        by_role = collections.defaultdict(list)
        for entry in entries:
            role = _stage_role_id(entry)
            if role:
                by_role[role].append(entry)
        for role, group in by_role.items():
            bare = [e for e in group if "m3gim-ontology:hasPerformer" not in e]
            cast = [e for e in group if "m3gim-ontology:hasPerformer" in e]
            if bare and cast:
                offenders.append(f"{identifier} / {role}")
    assert not offenders, (
        "Partie doppelt gefuehrt (blanke Rolle neben Komposit): "
        + ", ".join(sorted(offenders)[:10])
    )


def test_cast_performances_survive_the_deduplication(graph):
    """Die Zusammenfuehrung darf die Besetzungen nicht mit wegraeumen.

    Mindestvorkommen aus dem Datenstand vom 2026-09-03: 160 Performances mit
    Interpret:in, verteilt auf 19 Dokumente.
    """
    perf = [n for n in graph if n.get("@type") == "m3gim-ontology:Performance"]
    cast = [p for p in perf if "m3gim-ontology:hasPerformer" in p]
    assert len(cast) >= 160, f"nur {len(cast)} Performances mit Interpret:in"
    records = {identifier
               for identifier, entries in _performances_by_record(graph).items()
               if any("m3gim-ontology:hasPerformer" in e for e in entries)}
    assert len(records) >= 19, f"nur {len(records)} Dokumente mit Besetzung"


def test_performer_names_are_readable(graph):
    """Jede Besetzung traegt einen Personennamen, nicht nur einen Rest-String."""
    for node in graph:
        if node.get("@type") != "m3gim-ontology:Performance":
            continue
        performer = node.get("m3gim-ontology:hasPerformer")
        if performer is None:
            continue
        assert isinstance(performer, dict) and performer.get("name"), (
            f"{node['@id']}: hasPerformer ohne name"
        )
