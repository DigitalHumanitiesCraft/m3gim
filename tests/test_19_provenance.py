"""Datierungs-Meta-Contract (data.md § 9, E-106 ersetzt die E-100/E-104-Konfidenz).

Die Datierungsevidenz (datierungsevidenz-Spalte) wird NICHT serialisiert: weder
als altes m3gim:dateEvidence noch als erfundener agrelon:metadataConfidence-
Dezimalwert. Letzterer war eine nicht gemessene Projektion der kategorialen
Evidenz (aus_dokument/erschlossen/extern) und wurde von keinem aktiven Feature
gelesen — entfernt gemaess Leitplanke "Konfidenz nicht erfinden". Damit
entfaellt auch die record-seitige Datierungs-Self-Provenance.

Legitime agrelon:metadataProvenance bleibt unberuehrt: auf AgRelOn-Relationen
(nested in agrelon:hasRelation) und auf SpatiotemporalEvents als Rueckverweis
auf den dokumentierenden Record.
"""

from _helpers import ensure_list


def test_date_evidence_property_removed(records):
    """Kein altes m3gim:dateEvidence im Output (Migration aus Phase 4.3)."""
    offenders = [r["@id"] for r in records if "m3gim:dateEvidence" in r]
    assert not offenders, (
        f"m3gim:dateEvidence noch vorhanden bei {len(offenders)} Records "
        f"(z.B. {offenders[:3]})"
    )


def _walk(node):
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from _walk(v)
    elif isinstance(node, list):
        for item in node:
            yield from _walk(item)


def test_no_date_confidence_anywhere(graph):
    """agrelon:metadataConfidence wird nirgends mehr emittiert (E-106): die
    erfundene Dezimal-Konfidenz aus datierungsevidenz ist vollstaendig entfernt."""
    offenders = []
    for n in graph:
        for node in _walk(n):
            if "agrelon:metadataConfidence" in node:
                offenders.append(node.get("@id") or node.get("@type"))
    assert not offenders, (
        f"{len(offenders)} Knoten tragen noch eine agrelon:metadataConfidence "
        f"(entfernt in E-106): {offenders[:5]}"
    )


def test_record_has_no_dating_self_provenance(records):
    """Kein Record traegt eine DIREKTE agrelon:metadataProvenance/-Confidence:
    die Datierungs-Self-Provenance ist mit der Konfidenz entfallen (E-106). Die
    legitime Provenance auf nested AgRelOn-Relationen bleibt davon unberuehrt
    (sie ist kein direkter Record-Key)."""
    offenders = [
        r["@id"] for r in records
        if "agrelon:metadataProvenance" in r or "agrelon:metadataConfidence" in r
    ]
    assert not offenders, (
        f"{len(offenders)} Records mit direkter Datierungs-Self-Provenance/"
        f"-Konfidenz (sollte mit E-106 entfallen sein): {offenders[:5]}"
    )


def test_agrelon_relation_provenance_intact(graph):
    """Positivkontrolle: die legitime agrelon:metadataProvenance auf den
    AgRelOn-Relationen (m3gim:agentRelation, Rueckverweis auf den Record)
    existiert weiterhin — die Konfidenz-Entfernung hat sie nicht versehentlich
    mitgenommen."""
    seen = 0
    for n in graph:
        for rel in ensure_list(n.get("m3gim:agentRelation")):
            if isinstance(rel, dict) and "agrelon:metadataProvenance" in rel:
                seen += 1
    assert seen >= 1, (
        "Keine AgRelOn-Relation mehr mit metadataProvenance — die "
        "Konfidenz-Entfernung hat zu viel abgeraeumt."
    )
