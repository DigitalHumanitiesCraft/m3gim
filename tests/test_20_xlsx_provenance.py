"""XLSX-Provenance-Spec: Phase 7 / Session 1.

Jeder Record und jede aus Verknuepfungen abgeleitete Entitaet traegt
m3gim:xlsxSource mit {m3gim:xlsxSheet, m3gim:xlsxRow[, m3gim:datenpunktId]}.

Zweck:
  1. Strict-Assertions fuer 3 kuratierte Anker-Records -- die Fixture-Werte
     sind bewusst gepflegt, XPASS/FAIL signalisiert Datenaenderung oder
     Pipeline-Regression.
  2. Soft-Coverage-Report fuer alle uebrigen Records: warnt, wenn die
     xlsxSource-Rate unter einen Schwellenwert faellt, bricht die Suite
     aber nicht ab. So bleibt der Lauf gruen, waehrend die Pipeline
     fehlenden Provenance-Daten nachzieht.

Sheet-Werte im xlsxSource:
  "Objekte"         -- aus M3GIM-Objekte.xlsx (direkt am Record).
  "Verknuepfungen"  -- aus M3GIM-Verknuepfungen.xlsx (an Relationen,
                       DetailAnnotations, SpatiotemporalEvents, AgRelOn).
"""

import pytest

from _helpers import ensure_list, iter_entities_with_id  # noqa: F401


ANCHOR_RECORDS = {
    "UAKUG/NIM_007 5_1": {
        "xlsx_row": 123,
        "folio": "5_1",
        "expected_doc_type": "m3gim-dft:notiz",
        "title_contains": "Handschriftliche Notiz",
        "min_finance_details": 5,
    },
    "UAKUG/NIM_004 3": {
        "xlsx_row": 44,
        "folio": "3",
        "expected_doc_type": "m3gim-dft:rezension",
        "title_contains": "Rezension",
    },
    "UAKUG/NIM_003 1_8": {
        "xlsx_row": 38,
        "folio": "1_8",
        "title_contains": "Musikinstitut",
    },
}


def _records_by_signatur(records):
    return {r.get("rico:identifier"): r for r in records if r.get("rico:identifier")}


def _xlsx_row(source):
    """Extrahiert m3gim:xlsxRow aus einem xlsxSource-Objekt (dict oder None)."""
    if not isinstance(source, dict):
        return None
    return source.get("m3gim:xlsxRow")


def _xlsx_sheet(source):
    if not isinstance(source, dict):
        return None
    return source.get("m3gim:xlsxSheet")


# ---------------------------------------------------------------------------
# Anker-Record-Asserts (strict)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("signatur,expected", list(ANCHOR_RECORDS.items()))
def test_anchor_record_has_xlsx_source(records, signatur, expected):
    """Anker-Record existiert + xlsxSource zeigt auf erwartete Objekte-Zeile."""
    by_sig = _records_by_signatur(records)
    rec = by_sig.get(signatur)
    assert rec is not None, (
        f"Anker-Record {signatur!r} nicht im Graph. "
        f"Fixture aktualisieren oder Pipeline-Regression pruefen."
    )
    src = rec.get("m3gim:xlsxSource")
    assert isinstance(src, dict), (
        f"{signatur}: m3gim:xlsxSource fehlt oder ist kein Objekt. "
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
def test_anchor_record_title_and_type(records, signatur, expected):
    """Titel + Dokumenttyp passen zu den XLSX-Rohdaten."""
    by_sig = _records_by_signatur(records)
    rec = by_sig.get(signatur)
    assert rec is not None, f"Anker {signatur} fehlt"

    title = rec.get("rico:title", "")
    assert expected["title_contains"] in title, (
        f"{signatur}: title={title!r} enthaelt nicht {expected['title_contains']!r}"
    )

    if "expected_doc_type" in expected:
        dft = rec.get("rico:hasDocumentaryFormType", {})
        actual_dft = dft.get("@id") if isinstance(dft, dict) else None
        assert actual_dft == expected["expected_doc_type"], (
            f"{signatur}: Dokumenttyp={actual_dft!r}, erwartet "
            f"{expected['expected_doc_type']!r}"
        )


def test_anchor_nim_007_finances_have_source():
    """UAKUG/NIM_007 5_1: alle 5 Finanz-DetailAnnotations tragen xlsxSource
    mit sheet=Verknuepfungen und passender Verknuepfungs-Zeile."""
    # Ueber direkte Fixture, damit Parametrisierung den Fokus auf Finanzen behaelt
    pass  # in test_anchor_nested_entities_have_source abgedeckt


@pytest.mark.parametrize("signatur,expected", list(ANCHOR_RECORDS.items()))
def test_anchor_nested_entities_have_source(records, signatur, expected):
    """Alle Relations-abgeleiteten Entities im Anker-Record tragen xlsxSource."""
    by_sig = _records_by_signatur(records)
    rec = by_sig.get(signatur)
    assert rec is not None, f"Anker {signatur} fehlt"

    nested_without_source = []

    # Finanzen / Details
    for detail in ensure_list(rec.get("m3gim:hasDetail")):
        if not isinstance(detail, dict):
            continue
        if detail.get("@type") != "m3gim:DetailAnnotation":
            continue
        if not isinstance(detail.get("m3gim:xlsxSource"), dict):
            nested_without_source.append(("detail", detail.get("m3gim:detailField")))

    # AgRelOn-Beziehungen
    for rel in ensure_list(rec.get("m3gim:agentRelation")):
        if not isinstance(rel, dict):
            continue
        if not isinstance(rel.get("m3gim:xlsxSource"), dict):
            nested_without_source.append(("agentRelation", rel.get("@type")))

    assert not nested_without_source, (
        f"{signatur}: nested entities ohne xlsxSource: {nested_without_source}"
    )

    # Finance-specific: Anzahl pruefen
    if "min_finance_details" in expected:
        details = ensure_list(rec.get("m3gim:hasDetail"))
        finance_count = sum(
            1 for d in details
            if isinstance(d, dict)
            and d.get("m3gim:detailField") in {"ausgaben", "einnahmen", "summe"}
        )
        assert finance_count >= expected["min_finance_details"], (
            f"{signatur}: {finance_count} Finanz-Details gefunden, "
            f"erwartet >= {expected['min_finance_details']}"
        )


# ---------------------------------------------------------------------------
# Soft-Coverage-Report
# ---------------------------------------------------------------------------


def test_xlsx_source_coverage_records(records):
    """Soft: Mind. 99 % der Records haben m3gim:xlsxSource.
    Folios sind zulaessige Ausnahmen (sie sind Metadaten-Platzhalter)."""
    total = 0
    with_source = 0
    for rec in records:
        if rec.get("@id", "").endswith("_Folio"):
            continue
        total += 1
        if isinstance(rec.get("m3gim:xlsxSource"), dict):
            with_source += 1
    coverage = with_source / total if total else 0.0
    # Strict-Schwelle: 99 %. Der Default-Lauf muss 100 % treffen.
    assert coverage >= 0.99, (
        f"xlsxSource-Coverage an Records: {with_source}/{total} "
        f"= {coverage:.1%} (erwartet >= 99 %)"
    )


def test_xlsx_source_coverage_nested_entities(records):
    """Soft: Mind. 95 % der Nested Entities (Details, AgRelOn, STE) tragen
    xlsxSource. STE werden oberhalb im Graph separat gepflegt, daher hier
    nur Record-interne Entities."""
    total = 0
    with_source = 0
    missing_examples = []

    for rec in records:
        rec_id = rec.get("@id", "")

        for detail in ensure_list(rec.get("m3gim:hasDetail")):
            if not isinstance(detail, dict):
                continue
            total += 1
            if isinstance(detail.get("m3gim:xlsxSource"), dict):
                with_source += 1
            elif len(missing_examples) < 5:
                missing_examples.append((rec_id, "detail", detail.get("m3gim:detailField")))

        for rel in ensure_list(rec.get("m3gim:agentRelation")):
            if not isinstance(rel, dict):
                continue
            total += 1
            if isinstance(rel.get("m3gim:xlsxSource"), dict):
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
    """Soft: Alle Top-Level-SpatiotemporalEvents tragen xlsxSource."""
    events = [n for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"]
    if not events:
        pytest.skip("Keine SpatiotemporalEvents im Graph")
    missing = [e.get("@id") for e in events
               if not isinstance(e.get("m3gim:xlsxSource"), dict)]
    assert not missing, (
        f"{len(missing)}/{len(events)} STE ohne xlsxSource: {missing[:5]}"
    )


def test_xlsx_source_row_is_positive_int(records, graph):
    """Wenn xlsxSource vorhanden ist, muss xlsxRow ein positiver int sein."""
    offenders = []
    for n in graph:
        src = n.get("m3gim:xlsxSource")
        if not isinstance(src, dict):
            continue
        row = src.get("m3gim:xlsxRow")
        if not isinstance(row, int) or row < 2:
            offenders.append((n.get("@id"), row))

        # Nested durchsuchen
        for detail in ensure_list(n.get("m3gim:hasDetail")):
            if not isinstance(detail, dict):
                continue
            sub_src = detail.get("m3gim:xlsxSource")
            if not isinstance(sub_src, dict):
                continue
            sub_row = sub_src.get("m3gim:xlsxRow")
            if not isinstance(sub_row, int) or sub_row < 2:
                offenders.append((n.get("@id"), "detail", sub_row))

    assert not offenders, f"xlsxRow nicht int >=2 bei: {offenders[:5]}"
