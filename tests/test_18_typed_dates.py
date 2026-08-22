"""Datumsmodell-Spec: jede Datierung haengt an einem Annotationsknoten.

STATUS: aktiv. Der Test hiess nach der Phase, die er sicherte, und sichert
seit dem Umbau ihr Gegenteil. Die sechzehn typisierten Datumsproperties am
Dokument sind entfallen; ihre Werte stehen in
`m3gim-ontology:Annotation`-Knoten mit `m3gim-ontology:atDate` und der
erfassten Rolle, erreichbar ueber `m3gim-ontology:hasAnnotation`. Zwei
Ausnahmen bleiben: die Entstehungsdatierung des Dokuments steht am Dokument
auf `rico:creationDate`, die Datierung einer Auffuehrung am
Auffuehrungsknoten auf `m3gim-ontology:atDate` ohne Rollenangabe.

Die Tests greifen, wenn ein Property-Name zurueckkehrt, der eine Rolle
ausdrueckt, wenn eine Datierung ihre Rolle verliert oder wenn der Zugriffspfad
vom Dokument zu seinen Datierungen bricht.
"""

import re


from _helpers import ensure_list


# Die sechzehn Namen, die die Rolle im Property-Namen gefuehrt haben. Sie
# stehen hier als Sperrliste, damit ein Rueckfall benannt wird statt still zu
# passieren.
RETIRED_DATE_PROPS = {
    "m3gim:eventDate",
    "m3gim:erstelldatum",
    "m3gim:absendedatum",
    "m3gim:empfangsdatum",
    "m3gim:ausstellungsdatum",
    "m3gim:erscheinungsdatum",
    "m3gim:abreisedatum",
    "m3gim:auftrittsdatum",
    "m3gim:auffuehrungsdatum",
    "m3gim:probendatum",
    "m3gim:probenbeginn",
    "m3gim:premieredatum",
    "m3gim:ausstrahlungsdatum",
    "m3gim:spielzeitVon",
    "m3gim:spielzeitBis",
    "m3gim:ueberweisungsdatum",
    "m3gim:gespraechsdatum",
}

ISO_OR_QUALIFIED = re.compile(
    r"^(circa:|vor:|nach:)?\d{4}(-\d{2}(-\d{2})?)?(/\d{4}(-\d{2}(-\d{2})?)?)?$"
)


def _annotations_by_id(graph):
    return {
        n["@id"]: n for n in graph
        if n.get("@type") == "m3gim-ontology:Annotation"
    }


def _dated_annotations_of(record, annotations):
    for ref in ensure_list(record.get("m3gim-ontology:hasAnnotation")):
        if not isinstance(ref, dict):
            continue
        node = annotations.get(ref.get("@id"))
        if node is not None and node.get("m3gim-ontology:atDate"):
            yield node


def test_no_record_carries_a_retired_date_property(records):
    """Kein Property-Name am Dokument drueckt mehr eine Rolle aus."""
    offenders = [
        (r["@id"], prop)
        for r in records
        for prop in RETIRED_DATE_PROPS
        if prop in r
    ]
    assert not offenders, (
        f"{len(offenders)} Records tragen eine abgeschaffte Datums-Property: "
        f"{offenders[:5]}"
    )


def test_records_reach_their_datings_through_annotations(records, graph):
    """Der Zugriffspfad Dokument zu Datierung fuehrt ueber Annotationsknoten.

    Mindestvorkommen statt Existenzpruefung, damit der Test nicht trivial
    besteht, wenn die Pipeline aufhoert, Datierungen zu emittieren.
    """
    annotations = _annotations_by_id(graph)
    with_dates = [r for r in records if any(_dated_annotations_of(r, annotations))]
    assert len(with_dates) >= 20, (
        f"Nur {len(with_dates)} Dokumente erreichen eine Datierung ueber "
        "m3gim-ontology:hasAnnotation"
    )


def test_dated_annotations_carry_their_recorded_role(records, graph):
    """Eine Datierung traegt die Rolle, unter der die Quelle sie fuehrt.

    Ohne Rolle in der Quelle traegt der Knoten keine; das ist zugelassen und
    hier nur der Deckel gegen den stillen Verlust aller Rollen.
    """
    annotations = _annotations_by_id(graph)
    dated = [
        node for r in records
        for node in _dated_annotations_of(r, annotations)
    ]
    assert len(dated) >= 50, f"Nur {len(dated)} datierte Annotationen im Output"
    with_role = [n for n in dated if n.get("role")]
    assert len(with_role) >= len(dated) * 0.9, (
        f"Nur {len(with_role)} von {len(dated)} datierten Annotationen tragen "
        "eine Rolle"
    )


def test_annotation_dates_iso_or_qualified_or_flagged(records, graph):
    """Werte sind ISO-8601, TimeSpan (YYYY/YYYY) oder qualifiziert.

    Eine Notationsabweichung der Quelle bleibt im Wortlaut stehen und traegt
    dafuer das Flag datierung-malformed, statt eine eigene Bauform zu
    erzwingen.
    """
    annotations = _annotations_by_id(graph)
    offenders = []
    total = 0
    for r in records:
        for node in _dated_annotations_of(r, annotations):
            total += 1
            value = node["m3gim-ontology:atDate"]
            if isinstance(value, str) and ISO_OR_QUALIFIED.match(value):
                continue
            flags = ensure_list(node.get("m3gim-ontology:dataQualityFlag"))
            if "datierung-malformed" in flags:
                continue
            offenders.append((r["@id"], node["@id"], value))
    assert total >= 50, f"Nur {total} datierte Annotationen im Output"
    assert not offenders, (
        f"Nicht-ISO-Datierungen ohne Flag: {offenders[:5]}"
    )


def test_creation_date_stays_on_the_record(records):
    """Die reine Entstehungsdatierung steht am Dokument auf rico:creationDate."""
    creation = [r for r in records if r.get("rico:creationDate")]
    assert creation, "Kein Dokument traegt rico:creationDate"
    offenders = [
        (r["@id"], value)
        for r in creation
        for value in ensure_list(r["rico:creationDate"])
        if not (isinstance(value, str) and ISO_OR_QUALIFIED.match(value))
    ]
    assert not offenders, f"Nicht-ISO-Werte in rico:creationDate: {offenders[:5]}"


def test_performance_dating_stays_on_the_performance(graph):
    """Die Datierung einer Auffuehrung steht am Auffuehrungsknoten selbst.

    Dort ist das Datum die Datierung des Ereignisses; eine Rollenangabe haette
    keinen Gegenstand.
    """
    performances = [
        n for n in graph if n.get("@type") == "m3gim-ontology:Performance"
    ]
    dated = [n for n in performances if n.get("m3gim-ontology:atDate")]
    assert len(dated) >= 20, (
        f"Nur {len(dated)} Auffuehrungen tragen eine Datierung"
    )
    with_role = [n["@id"] for n in dated if n.get("role")]
    assert not with_role, (
        f"Auffuehrungsknoten mit Rollenangabe an der Datierung: {with_role[:5]}"
    )
