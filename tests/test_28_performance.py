"""Source-bound annotations retain grouped role/work link cells.

The composites rolle,person and datum,werk resolve into a
an Annotation with hasStageRole/hasPerformer or performanceOf/atDate. Records
retain the legacy hasPerformance reference without asserting an event class.

The resolvability of the record-side hasPerformance reference used to stand here
a second time and lives solely in
test_04_verknuepfungen.test_performance_references_resolvable, which also checks
the hasStageRole reference against the StageRole nodes.
"""


def test_performances_exist(graph):
    perfs = [n for n in graph if n.get("@type") == "m3gim-ontology:Annotation"
             and str(n.get("@id", "")).startswith("m3gim-data:perf_")]
    assert perfs, "Keine quellengebundenen Besetzungsannotationen im Graph"


def test_performance_of_is_indexed_work(graph):
    """performanceOf never carries a literal Q-ID/raw string as the work title,
    the target is a m3gim-ontology:MusicalWork with name (E-98)."""
    for n in graph:
        if (n.get("@type") != "m3gim-ontology:Annotation"
                or not str(n.get("@id", "")).startswith("m3gim-data:perf_")):
            continue
        work = n.get("m3gim-ontology:performanceOf")
        if isinstance(work, dict):
            assert work.get("@type") == "m3gim-ontology:MusicalWork", (
                f"{n['@id']}: performanceOf kein MusicalWork"
            )
            assert work.get("name"), f"{n['@id']}: performanceOf ohne name"
