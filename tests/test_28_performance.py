"""m3gim-ontology:Performance als n-äre Reifikation (E-96/E-98).

Komposite rolle,person und datum,werk lösen sich in eine m3gim-ontology:Performance auf
(hasStageRole/hasPerformer bzw. performanceOf/auffuehrungsdatum); Standalone-
rolle erzeugt eine Performance mit nur hasStageRole. Records verweisen via
m3gim-ontology:hasPerformance. Die Performer-/Werk-Pfade aktivieren sich mit dem tieferen
Box-Export; gegen den aktuellen Stand sind sie zulässig leer.

Die Aufloesbarkeit der record-seitigen hasPerformance-Referenz stand hier ein
zweites Mal und liegt allein in
test_04_verknuepfungen.test_performance_references_resolvable, das zusaetzlich
die hasStageRole-Referenz gegen die StageRole-Knoten prueft.
"""


def test_performances_exist(graph):
    perfs = [n for n in graph if n.get("@type") == "m3gim-ontology:Performance"]
    assert perfs, "Keine m3gim-ontology:Performance im Graph (E-96 nicht aktiv)"


def test_performance_of_is_indexed_work(graph):
    """performanceOf trägt nie eine literale Q-ID/Rohstring als Werktitel —
    das Ziel ist ein m3gim-ontology:MusicalWork mit name (E-98)."""
    for n in graph:
        if n.get("@type") != "m3gim-ontology:Performance":
            continue
        work = n.get("m3gim-ontology:performanceOf")
        if isinstance(work, dict):
            assert work.get("@type") == "m3gim-ontology:MusicalWork", (
                f"{n['@id']}: performanceOf kein MusicalWork"
            )
            assert work.get("name"), f"{n['@id']}: performanceOf ohne name"
