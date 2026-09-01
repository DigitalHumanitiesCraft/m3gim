"""Data-quality flags and date routing (E-102, E-136).

Three invariants:
  1. The generic m3gim:eventDate is abolished, and so is the typed date family.
     Every dating lands in a m3gim-ontology:Annotation node with atDate and the
     recorded role, which also carries bracket-/question-mark-uncertain datings.
     No silent data loss on the drop.
  2. m3gim-ontology:dataQualityFlag draws from a controlled vocabulary, derived
     from uncertainty signals in the anmerkung field.
     m3gim-ontology:qualityConfidence is not fabricated (guardrail "do not invent
     confidence").
  3. m3gim-ontology:processingNote carries the free-text appendix of the object
     Bearbeitungsstand, the canonical status stays in
     m3gim-ontology:processingStatus.

Spec: data.md section 6/7, journal.md E-100/E-102.
"""

from _helpers import ensure_list

QUALITY_FLAG_VOCAB = {
    "name-nicht-eindeutig",
    "vorname-fehlt",
    "rolle-unsicher",
    "quelle-tippfehler",
    # Malformed source date value (not ISO, e.g. "06-09" without a year): not
    # usable in rico:date, stays verbatim on the annotation node.
    "datierung-malformed",
}

# The property carrying the creation dating on the document. It is the only
# dating that does not get its own node.
RECORD_DATE_PROPS = {"rico:date", "rico:creationDate"}


def _walk(node):
    """All dict nodes in the tree (including nested)."""
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


# --- 1. Date routing / eventDate drop -------------------------------------

def test_generic_event_date_retired(graph):
    """m3gim:eventDate no longer occurs anywhere (E-102, atomic replacement by
    DatedEvent routing)."""
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
    """Every dating reachable via hasAnnotation is well-formed.

    The node carries a non-empty atDate value and, where the source has one, its
    role as a reference to a concept. At least 10 expected, the volume formerly
    routed to eventDate."""
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
    """Sheet and row of the origin cell, as a comparison key.

    Two nodes with the same date and the same role from two different cells are
    two recorded statements and not a duplicate. Only the cell distinguishes the
    recording case from the pipeline artifact that represents a composite twice.
    """
    source = node.get("m3gim-ontology:xlsxSource")
    if not isinstance(source, dict):
        return None
    return (source.get("m3gim-ontology:xlsxSheet"),
            source.get("m3gim-ontology:xlsxRow"))


def test_dated_event_does_not_duplicate_ste(records, graph):
    """An ort,datum composite resolves into EXACTLY ONE representation
    (data.md § 4): the annotation node carries place and date. The date part must
    not additionally appear as its own date annotation on the same record,
    otherwise every date aggregation counts the date twice (audit finding on
    E-102)."""
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
    """Bracket-/question-mark-uncertain or free-text datings land on the
    annotation node, not on rico:date or rico:creationDate. The two record
    properties stay purely ISO/qualified."""
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
    # At least one annotation carries a non-ISO value (evidence that the
    # uncertain cases arrive here) and is marked malformed for it.
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


# --- 2. Data-quality flags ------------------------------------------------

def test_data_quality_flags_vocab(graph):
    """Every m3gim-ontology:dataQualityFlag value comes from the controlled
    vocabulary; at least 10 flags derived from the anmerkung signals present."""
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
    """m3gim-ontology:qualityConfidence is not fabricated: the pipeline emits no
    guessed numeric value for the flag confidence (guardrail 'do not invent
    confidence'). The property stays reserved for provable values."""
    offenders = [n.get("@id") for n in _all_nodes(graph)
                 if "m3gim-ontology:qualityConfidence" in n]
    assert not offenders, (
        f"{len(offenders)} Knoten tragen eine fabrizierte qualityConfidence: "
        f"{offenders[:5]}"
    )


# --- 3. Bearbeitungsnotiz --------------------------------------------------

def test_bearbeitungsnotiz_split(records):
    """At least one record carries a m3gim-ontology:processingNote (free-text
    appendix of the Bearbeitungsstand), and the canonical status stays separate
    in m3gim-ontology:processingStatus."""
    canonical = {"abgeschlossen", "begonnen", "zurueckgestellt"}
    with_notiz = [r for r in records if r.get("m3gim-ontology:processingNote")]
    assert with_notiz, "Kein Record mit m3gim-ontology:processingNote — Split greift nicht"
    for r in with_notiz:
        notiz = r["m3gim-ontology:processingNote"]
        assert isinstance(notiz, str) and notiz.strip()
        # Note is free text, not a mere canonical status.
        assert notiz.strip().lower() not in canonical, (
            f"{r['@id']}: bearbeitungsnotiz ist nur der Status: {notiz}"
        )
        # The canonical status is kept and separate.
        assert r.get("m3gim-ontology:processingStatus") in canonical, (
            f"{r['@id']}: bearbeitungsstand fehlt oder nicht canonisch"
        )
