"""XLSX provenance spec: phase 7 / session 1.

Every record and every entity derived from Verknuepfungen carries
m3gim-ontology:xlsxSource with {m3gim-ontology:xlsxSheet, m3gim-ontology:xlsxRow[, m3gim-ontology:dataPointId]}.

Purpose:
  1. Strict assertions for 3 curated anchor records. The fixture values are
     deliberately maintained, XPASS/FAIL signals a data change or a pipeline
     regression.
  2. Soft coverage report for all remaining records: warns when the xlsxSource
     rate falls below a threshold but does not abort the suite. This keeps the
     run green while the pipeline catches up on missing provenance data.

Sheet values in xlsxSource:
  "Objekte"         from M3GIM-Objekte.xlsx (directly on the record).
  "Verknuepfungen"  from M3GIM-Verknuepfungen.xlsx (on relations,
                    DetailAnnotations, SpatiotemporalEvents, AgRelOn).
"""

import pytest

from _helpers import ensure_list, iter_entities_with_id  # noqa: F401


ANCHOR_RECORDS = {
    # Finance Konvolut: 5 detail entries (Ausgaben/Einnahmen/Summe) in Schilling.
    # Row 123->122 adjusted: the blank-row filter of the deeper export removed a
    # row before it (verified against the actual XLSX).
    "UAKUG/NIM_007 5_1": {
        "xlsx_row": 122,
        "expected_doc_type": "m3gim-vocab:note",
        "min_finance_details": 5,
    },
    # Review: document type + place/date composite (SpatiotemporalEvent)
    "UAKUG/NIM_004 3": {
        "xlsx_row": 44,
        "expected_doc_type": "m3gim-vocab:review",
        "has_spatiotemporal": True,
    },
    # Music-institute Konvolut: AgRelOn HasIsMember
    "UAKUG/NIM_003 1_8": {
        "xlsx_row": 38,
        "has_agent_relation_type": "agrelon:HasIsMember",
    },
}


def _records_by_signatur(records):
    return {r.get("rico:identifier"): r for r in records if r.get("rico:identifier")}


def _xlsx_row(source):
    """Extract m3gim-ontology:xlsxRow from an xlsxSource object (dict or None)."""
    if not isinstance(source, dict):
        return None
    return source.get("m3gim-ontology:xlsxRow")


def _xlsx_sheet(source):
    if not isinstance(source, dict):
        return None
    return source.get("m3gim-ontology:xlsxSheet")


# ---------------------------------------------------------------------------
# Anchor record asserts (strict)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("signatur,expected", list(ANCHOR_RECORDS.items()))
def test_anchor_record_has_xlsx_source(records, signatur, expected):
    """Anchor record exists and xlsxSource points to the expected Objekte row."""
    by_sig = _records_by_signatur(records)
    rec = by_sig.get(signatur)
    assert rec is not None, (
        f"Anker-Record {signatur!r} nicht im Graph. "
        f"Fixture aktualisieren oder Pipeline-Regression pruefen."
    )
    src = rec.get("m3gim-ontology:xlsxSource")
    assert isinstance(src, dict), (
        f"{signatur}: m3gim-ontology:xlsxSource fehlt oder ist kein Objekt. "
        f"Pipeline setzt ihn in convert_objekt()."
    )
    assert _xlsx_sheet(src) == "Objekte", (
        f"{signatur}: erwartet sheet=Objekte, gefunden {src!r}"
    )
    assert _xlsx_row(src) == expected["xlsx_row"], (
        f"{signatur}: xlsx_row=Ist={_xlsx_row(src)}, Soll={expected['xlsx_row']}. "
        f"XLSX wurde umsortiert? Fixture pflegen."
    )


@pytest.mark.parametrize("signatur,expected", list(ANCHOR_RECORDS.items()))
def test_anchor_record_structural_shape(records, signatur, expected):
    """Structural record properties from the raw XLSX row match.

    Deliberately no title substring assertion: titles are free text in the XLSX
    and prone to change. Instead we check the document type (from the mapped
    `DOKUMENTTYP_TO_DFT` column) and the presence of a non-empty title as a smoke
    check.
    """
    by_sig = _records_by_signatur(records)
    rec = by_sig.get(signatur)
    assert rec is not None, f"Anker {signatur} fehlt"

    title = rec.get("rico:title", "")
    assert isinstance(title, str) and title.strip(), (
        f"{signatur}: kein Titel gesetzt"
    )

    if "expected_doc_type" in expected:
        dft = rec.get("rico:hasDocumentaryFormType", {})
        actual_dft = dft.get("@id") if isinstance(dft, dict) else None
        assert actual_dft == expected["expected_doc_type"], (
            f"{signatur}: Dokumenttyp={actual_dft!r}, erwartet "
            f"{expected['expected_doc_type']!r}"
        )


@pytest.mark.parametrize("signatur,expected", list(ANCHOR_RECORDS.items()))
def test_anchor_nested_entities_have_source(records, signatur, expected):
    """All relation-derived entities in the anchor record carry xlsxSource and
    the domain-expected structures (finance, AgRelOn, STE)."""
    by_sig = _records_by_signatur(records)
    rec = by_sig.get(signatur)
    assert rec is not None, f"Anker {signatur} fehlt"

    nested_without_source = []

    details = [d for d in ensure_list(rec.get("m3gim-ontology:hasDetail"))
               if isinstance(d, dict) and d.get("@type") == "m3gim-ontology:Annotation"]
    for detail in details:
        if not isinstance(detail.get("m3gim-ontology:xlsxSource"), dict):
            nested_without_source.append(("detail", detail.get("m3gim-ontology:detailField")))

    agent_rels = [r for r in ensure_list(rec.get("m3gim-ontology:hasAgentRelation"))
                  if isinstance(r, dict)]
    for rel in agent_rels:
        if not isinstance(rel.get("m3gim-ontology:xlsxSource"), dict):
            nested_without_source.append(("agentRelation", rel.get("@type")))

    assert not nested_without_source, (
        f"{signatur}: nested entities ohne xlsxSource: {nested_without_source}"
    )

    # Domain expectation: minimum number of finance details
    if "min_finance_details" in expected:
        finance_count = sum(
            1 for d in details
            if d.get("m3gim-ontology:detailField") in {"ausgaben", "einnahmen", "summe"}
        )
        assert finance_count >= expected["min_finance_details"], (
            f"{signatur}: {finance_count} Finanz-Details gefunden, "
            f"erwartet >= {expected['min_finance_details']}"
        )

    # Domain expectation: a specific AgRelOn type is present
    if "has_agent_relation_type" in expected:
        found_types = {r.get("@type") for r in agent_rels}
        assert expected["has_agent_relation_type"] in found_types, (
            f"{signatur}: AgRelOn-Typen {found_types}, "
            f"erwartet {expected['has_agent_relation_type']!r}"
        )

    # Domain expectation: a SpatiotemporalEvent reference is present
    if expected.get("has_spatiotemporal"):
        ste_refs = ensure_list(rec.get("m3gim-ontology:hasAnnotation"))
        assert ste_refs, (
            f"{signatur}: kein m3gim-ontology:hasAnnotation-Ref gefunden"
        )


def test_anchors_cover_v2_feature_breadth():
    """Meta test: the chosen anchors together cover the breadth of the v2
    features (finance, AgRelOn, SpatiotemporalEvent, typed document type).
    Ensures that swapping an anchor does not accidentally drop a dimension from
    the living documentation."""
    has_finance = any("min_finance_details" in v for v in ANCHOR_RECORDS.values())
    has_agrelon = any("has_agent_relation_type" in v for v in ANCHOR_RECORDS.values())
    has_ste = any(v.get("has_spatiotemporal") for v in ANCHOR_RECORDS.values())
    has_dft = any("expected_doc_type" in v for v in ANCHOR_RECORDS.values())
    assert has_finance, "Kein Anker testet Finanz-DetailAnnotations"
    assert has_agrelon, "Kein Anker testet AgRelOn-Relationen"
    assert has_ste, "Kein Anker testet SpatiotemporalEvents"
    assert has_dft, "Kein Anker testet Dokumenttyp-Mapping"


# ---------------------------------------------------------------------------
# Soft coverage report
# ---------------------------------------------------------------------------


def test_xlsx_source_coverage_records(records):
    """Soft: at least 99 % of records have m3gim-ontology:xlsxSource. Folios are
    admissible exceptions (they are metadata placeholders)."""
    total = 0
    with_source = 0
    for rec in records:
        if rec.get("@id", "").endswith("_Folio"):
            continue
        total += 1
        if isinstance(rec.get("m3gim-ontology:xlsxSource"), dict):
            with_source += 1
    coverage = with_source / total if total else 0.0
    # Strict threshold: 99 %. The default run must hit 100 %.
    assert coverage >= 0.99, (
        f"xlsxSource-Coverage an Records: {with_source}/{total} "
        f"= {coverage:.1%} (erwartet >= 99 %)"
    )


def test_xlsx_source_coverage_nested_entities(records):
    """Soft: at least 95 % of nested entities (details, AgRelOn, STE) carry
    xlsxSource. STE are maintained separately at the top of the graph, so this
    covers only record-internal entities."""
    total = 0
    with_source = 0
    missing_examples = []

    for rec in records:
        rec_id = rec.get("@id", "")

        for detail in ensure_list(rec.get("m3gim-ontology:hasDetail")):
            if not isinstance(detail, dict):
                continue
            total += 1
            if isinstance(detail.get("m3gim-ontology:xlsxSource"), dict):
                with_source += 1
            elif len(missing_examples) < 5:
                missing_examples.append((rec_id, "detail", detail.get("m3gim-ontology:detailField")))

        for rel in ensure_list(rec.get("m3gim-ontology:hasAgentRelation")):
            if not isinstance(rel, dict):
                continue
            total += 1
            if isinstance(rel.get("m3gim-ontology:xlsxSource"), dict):
                with_source += 1
            elif len(missing_examples) < 5:
                missing_examples.append((rec_id, "agentRelation", rel.get("@type")))

    if total == 0:
        pytest.skip("Keine nested entities im Output -- uebersprungen")

    coverage = with_source / total
    assert coverage >= 0.95, (
        f"xlsxSource-Coverage nested entities: {with_source}/{total} "
        f"= {coverage:.1%} (erwartet >= 95 %). Beispiele ohne Source: {missing_examples}"
    )


def test_xlsx_source_coverage_spatiotemporal_events(graph):
    """Soft: all top-level SpatiotemporalEvents carry xlsxSource."""
    events = [n for n in graph if n.get("@type") == "m3gim-ontology:Annotation"]
    if not events:
        pytest.skip("Keine SpatiotemporalEvents im Graph")
    missing = [e.get("@id") for e in events
               if not isinstance(e.get("m3gim-ontology:xlsxSource"), dict)]
    assert not missing, (
        f"{len(missing)}/{len(events)} STE ohne xlsxSource: {missing[:5]}"
    )


def test_xlsx_source_row_is_positive_int(records, graph):
    """When xlsxSource is present, xlsxRow must be a positive int."""
    offenders = []
    for n in graph:
        src = n.get("m3gim-ontology:xlsxSource")
        if not isinstance(src, dict):
            continue
        row = src.get("m3gim-ontology:xlsxRow")
        if not isinstance(row, int) or row < 2:
            offenders.append((n.get("@id"), row))

        # Search nested
        for detail in ensure_list(n.get("m3gim-ontology:hasDetail")):
            if not isinstance(detail, dict):
                continue
            sub_src = detail.get("m3gim-ontology:xlsxSource")
            if not isinstance(sub_src, dict):
                continue
            sub_row = sub_src.get("m3gim-ontology:xlsxRow")
            if not isinstance(sub_row, int) or sub_row < 2:
                offenders.append((n.get("@id"), "detail", sub_row))

    assert not offenders, f"xlsxRow nicht int >=2 bei: {offenders[:5]}"
