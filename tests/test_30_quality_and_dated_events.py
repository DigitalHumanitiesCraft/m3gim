"""Datenqualitaets-Flags und Datums-Routing (E-102, E-136).

Drei Invarianten:
  1. Das generische m3gim:eventDate ist abgeschafft, die typisierte
     Datumsfamilie ebenfalls. Jede Datierung landet in einem
     m3gim-ontology:Annotation-Knoten mit atDate und der erfassten Rolle, der
     auch klammer-/fragezeichen-unsichere Datierungen traegt. Kein stiller
     Datenverlust beim Drop.
  2. m3gim-ontology:dataQualityFlag zieht aus einem kontrollierten Vokabular, abgeleitet
     aus Unsicherheitssignalen im anmerkung-Feld. m3gim-ontology:qualityConfidence wird
     nicht fabriziert (Leitplanke "Konfidenz nicht erfinden").
  3. m3gim-ontology:processingNote traegt den Freitext-Anhang des Objekt-
     Bearbeitungsstands, der canonische Status bleibt in m3gim-ontology:processingStatus.

Spec: data.md Abschnitt 6/7, architecture-decisions.md E-100/E-102.
"""

from _helpers import ensure_list

QUALITY_FLAG_VOCAB = {
    "name-nicht-eindeutig",
    "vorname-fehlt",
    "rolle-unsicher",
    "quelle-tippfehler",
    # Malformter Quell-Datumswert (kein ISO, z.B. "06-09" ohne Jahr): nicht in
    # rico:date verwertbar, bleibt im Wortlaut am Annotationsknoten stehen.
    "datierung-malformed",
}

# Die Property, auf der die Entstehungsdatierung am Dokument steht. Sie ist die
# einzige Datierung, die kein eigener Knoten traegt.
RECORD_DATE_PROPS = {"rico:date", "rico:creationDate"}


def _walk(node):
    """Alle dict-Knoten im Baum (inkl. verschachtelt)."""
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from _walk(v)
    elif isinstance(node, list):
        for item in node:
            yield from _walk(item)


def _all_nodes(graph):
    for n in graph:
        yield from _walk(n)


# --- 1. Datums-Routing / eventDate-Drop -----------------------------------

def test_generic_event_date_retired(graph):
    """m3gim:eventDate kommt nirgends mehr vor (E-102, atomarer Ersatz durch
    DatedEvent-Routing)."""
    offenders = [n.get("@id") for n in _all_nodes(graph) if "m3gim:eventDate" in n]
    assert not offenders, (
        f"{len(offenders)} Knoten tragen noch das abgeschaffte m3gim:eventDate: "
        f"{offenders[:5]}"
    )


def _annotations_by_id(graph):
    return {n["@id"]: n for n in graph
            if n.get("@type") == "m3gim-ontology:Annotation"}


def _annotations_of(record, annotations):
    for ref in ensure_list(record.get("m3gim-ontology:hasAnnotation")):
        if isinstance(ref, dict) and ref.get("@id") in annotations:
            yield annotations[ref["@id"]]


def test_dated_events_wellformed(records, graph):
    """Jede ueber hasAnnotation erreichbare Datierung ist wohlgeformt.

    Der Knoten traegt einen nicht-leeren atDate-Wert und, wo die Quelle eine
    fuehrt, seine Rolle als Verweis auf ein Concept. Mindestens 10 erwartet,
    das frueher nach eventDate geleitete Volumen."""
    annotations = _annotations_by_id(graph)
    total = 0
    offenders = []
    for r in records:
        for node in _annotations_of(r, annotations):
            value = node.get("m3gim-ontology:atDate")
            if value is None:
                continue
            total += 1
            if not isinstance(value, str) or not value.strip():
                offenders.append((r["@id"], "atDate", value))
            role = node.get("role")
            if role is not None and not isinstance(role, (dict, str)):
                offenders.append((r["@id"], "role", role))
    assert total >= 10, f"Nur {total} datierte Annotationen — Routing greift nicht"
    assert not offenders, f"Fehlgeformte Datierungen: {offenders[:5]}"


def _role_id(node):
    role = node.get("role")
    return role.get("@id") if isinstance(role, dict) else role


def _source_cell(node):
    """Blatt und Zeile der Ursprungszelle, als Vergleichsschluessel.

    Zwei Knoten mit demselben Datum und derselben Rolle aus zwei verschiedenen
    Zellen sind zwei erfasste Aussagen und keine Dublette. Nur die Zelle
    unterscheidet den Erfassungsfall vom Pipeline-Artefakt, das ein Komposit
    zweimal repraesentiert.
    """
    source = node.get("m3gim-ontology:xlsxSource")
    if not isinstance(source, dict):
        return None
    return (source.get("m3gim-ontology:xlsxSheet"),
            source.get("m3gim-ontology:xlsxRow"))


def test_dated_event_does_not_duplicate_ste(records, graph):
    """Ein ort,datum-Komposit wird in GENAU EINE Repraesentation aufgeloest
    (data.md § 4): der Annotationsknoten traegt Ort und Datum. Der Datums-Teil
    darf nicht zusaetzlich als eigene Datumsannotation am selben Record
    erscheinen — sonst zaehlt jede Datums-Aggregation das Datum doppelt
    (Audit-Befund zu E-102)."""
    annotations = _annotations_by_id(graph)
    dupes = []
    for r in records:
        located = {
            (n.get("m3gim-ontology:atDate"), _role_id(n), _source_cell(n))
            for n in _annotations_of(r, annotations)
            if n.get("m3gim-ontology:atPlace")
        }
        for node in _annotations_of(r, annotations):
            if node.get("m3gim-ontology:atPlace"):
                continue
            key = (node.get("m3gim-ontology:atDate"), _role_id(node),
                   _source_cell(node))
            if key[0] is not None and key in located:
                dupes.append((r["@id"], key))
    assert not dupes, (
        f"{len(dupes)} Datumsannotationen duplizieren eine Verortung aus "
        f"derselben Quellzelle mit demselben Datum und derselben Rolle "
        f"(ort,datum doppelt repraesentiert, data.md § 4): {dupes[:5]}"
    )


def test_uncertain_datings_routed_to_dated_event(records, graph):
    """Klammer-/Fragezeichen-unsichere oder Freitext-Datierungen landen am
    Annotationsknoten, nicht an rico:date oder rico:creationDate. Die beiden
    Record-Properties bleiben rein ISO/qualifiziert."""
    import re
    iso_or_qual = re.compile(
        r"^(circa:|vor:|nach:)?\d{4}(-\d{2}(-\d{2})?)?(/\d{4}(-\d{2}(-\d{2})?)?)?$"
    )
    record_offenders = []
    for r in records:
        for prop in RECORD_DATE_PROPS:
            for val in ensure_list(r.get(prop)):
                if isinstance(val, str) and not iso_or_qual.match(val):
                    record_offenders.append((r["@id"], prop, val))
    assert not record_offenders, (
        f"Unsichere/Freitext-Datierung am Dokument statt am Annotationsknoten: "
        f"{record_offenders[:5]}"
    )
    # Mindestens eine Annotation traegt einen nicht-ISO-Wert (Beleg, dass die
    # unsicheren Faelle hier ankommen) und ist dafuer als malformed markiert.
    annotations = _annotations_by_id(graph)
    nonsiso = []
    for r in records:
        for node in _annotations_of(r, annotations):
            val = node.get("m3gim-ontology:atDate", "")
            if isinstance(val, str) and val and not iso_or_qual.match(val):
                assert "datierung-malformed" in ensure_list(
                    node.get("m3gim-ontology:dataQualityFlag")), (
                    f"{node['@id']}: nicht-ISO-Datierung ohne Flag: {val!r}"
                )
                nonsiso.append(val)
    assert nonsiso, "Keine nicht-ISO-Datierung am Annotationsknoten — Klammerfall verloren?"


# --- 2. Datenqualitaets-Flags ---------------------------------------------

def test_data_quality_flags_vocab(graph):
    """Jeder m3gim-ontology:dataQualityFlag-Wert stammt aus dem kontrollierten Vokabular;
    mindestens 10 Flags aus den anmerkung-Signalen vorhanden."""
    values = []
    for n in _all_nodes(graph):
        values.extend(ensure_list(n.get("m3gim-ontology:dataQualityFlag")))
    assert len(values) >= 10, f"Nur {len(values)} dataQualityFlags — Ableitung greift nicht"
    offenders = sorted({v for v in values if v not in QUALITY_FLAG_VOCAB})
    assert not offenders, (
        f"dataQualityFlag-Werte ausserhalb des Vokabulars {QUALITY_FLAG_VOCAB}: "
        f"{offenders}"
    )


def test_quality_confidence_not_fabricated(graph):
    """m3gim-ontology:qualityConfidence wird nicht fabriziert: die Pipeline emittiert
    keinen geratenen Zahlenwert fuer die Flag-Konfidenz (Leitplanke 'Konfidenz
    nicht erfinden'). Die Property bleibt fuer belegbare Werte reserviert."""
    offenders = [n.get("@id") for n in _all_nodes(graph)
                 if "m3gim-ontology:qualityConfidence" in n]
    assert not offenders, (
        f"{len(offenders)} Knoten tragen eine fabrizierte qualityConfidence: "
        f"{offenders[:5]}"
    )


# --- 3. Bearbeitungsnotiz --------------------------------------------------

def test_bearbeitungsnotiz_split(records):
    """Mindestens ein Record traegt eine m3gim-ontology:processingNote (Freitext-Anhang
    des Bearbeitungsstands), und der canonische Status bleibt davon getrennt in
    m3gim-ontology:processingStatus."""
    canonical = {"abgeschlossen", "begonnen", "zurueckgestellt"}
    with_notiz = [r for r in records if r.get("m3gim-ontology:processingNote")]
    assert with_notiz, "Kein Record mit m3gim-ontology:processingNote — Split greift nicht"
    for r in with_notiz:
        notiz = r["m3gim-ontology:processingNote"]
        assert isinstance(notiz, str) and notiz.strip()
        # Notiz ist Freitext, kein blosser canonischer Status.
        assert notiz.strip().lower() not in canonical, (
            f"{r['@id']}: bearbeitungsnotiz ist nur der Status: {notiz}"
        )
        # Der canonische Status bleibt erhalten und getrennt.
        assert r.get("m3gim-ontology:processingStatus") in canonical, (
            f"{r['@id']}: bearbeitungsstand fehlt oder nicht canonisch"
        )
