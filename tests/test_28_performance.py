"""m3gim:Performance als n-äre Reifikation (E-96/E-98).

Komposite rolle,person und datum,werk lösen sich in eine m3gim:Performance auf
(hasStageRole/hasPerformer bzw. performanceOf/auffuehrungsdatum); Standalone-
rolle erzeugt eine Performance mit nur hasStageRole. Records verweisen via
m3gim:hasPerformance. Die Performer-/Werk-Pfade aktivieren sich mit dem tieferen
Box-Export; gegen den aktuellen Stand sind sie zulässig leer.
"""

from _helpers import ensure_list


def test_performances_exist(graph):
    perfs = [n for n in graph if n.get("@type") == "m3gim:Performance"]
    assert perfs, "Keine m3gim:Performance im Graph (E-96 nicht aktiv)"


def test_performance_record_refs_resolvable(records, graph):
    """Jede m3gim:hasPerformance-Referenz eines Records ist im Graph auflösbar."""
    perf_ids = {n["@id"] for n in graph if n.get("@type") == "m3gim:Performance"}
    for r in records:
        for ref in ensure_list(r.get("m3gim:hasPerformance")):
            pid = ref.get("@id") if isinstance(ref, dict) else None
            assert pid in perf_ids, f"{r['@id']}: hasPerformance {pid} nicht im Graph"


def test_performance_of_is_indexed_work(graph):
    """performanceOf trägt nie eine literale Q-ID/Rohstring als Werktitel —
    das Ziel ist ein m3gim:MusicalWork mit name (E-98)."""
    for n in graph:
        if n.get("@type") != "m3gim:Performance":
            continue
        work = n.get("m3gim:performanceOf")
        if isinstance(work, dict):
            assert work.get("@type") == "m3gim:MusicalWork", (
                f"{n['@id']}: performanceOf kein MusicalWork"
            )
            assert work.get("name"), f"{n['@id']}: performanceOf ohne name"
