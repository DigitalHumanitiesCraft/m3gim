"""m3gim-ontology:Performance as an n-ary reification (E-96/E-98).

The composites rolle,person and datum,werk resolve into a
m3gim-ontology:Performance (hasStageRole/hasPerformer resp.
performanceOf/auffuehrungsdatum); a standalone rolle produces a Performance with
only hasStageRole. Records reference it via m3gim-ontology:hasPerformance. The
performer/work paths activate with the deeper Box export; against the current
state they are admissibly empty.

The resolvability of the record-side hasPerformance reference used to stand here
a second time and lives solely in
test_04_verknuepfungen.test_performance_references_resolvable, which also checks
the hasStageRole reference against the StageRole nodes.
"""


def test_performances_exist(graph):
    perfs = [n for n in graph if n.get("@type") == "m3gim-ontology:Performance"]
    assert perfs, "Keine m3gim-ontology:Performance im Graph (E-96 nicht aktiv)"


def test_performance_of_is_indexed_work(graph):
    """performanceOf never carries a literal Q-ID/raw string as the work title,
    the target is a m3gim-ontology:MusicalWork with name (E-98)."""
    for n in graph:
        if n.get("@type") != "m3gim-ontology:Performance":
            continue
        work = n.get("m3gim-ontology:performanceOf")
        if isinstance(work, dict):
            assert work.get("@type") == "m3gim-ontology:MusicalWork", (
                f"{n['@id']}: performanceOf kein MusicalWork"
            )
            assert work.get("name"), f"{n['@id']}: performanceOf ohne name"
