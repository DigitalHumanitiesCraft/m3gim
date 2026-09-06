"""Dating meta-contract (data-model.md § Meta-statements and provenance, E-106 replaces the E-100/E-104 confidence).

The dating evidence (datierungsevidenz column) is NOT serialized, neither as the
old m3gim:dateEvidence nor as an invented agrelon:metadataConfidence decimal. The
latter was an unmeasured projection of the categorial evidence
(aus_dokument/erschlossen/extern) that no active feature read, removed under the
guardrail "do not invent confidence". This also drops the record-side dating
self-provenance.

Legitimate agrelon:metadataProvenance stays intact, on AgRelOn relations (nested
in agrelon:hasRelation) and on SpatiotemporalEvents as a back-reference to the
documenting record.
"""

from _helpers import ensure_list


def test_date_evidence_property_removed(records):
    """No old m3gim:dateEvidence in the output (migration from phase 4.3)."""
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
    """agrelon:metadataConfidence is no longer emitted anywhere (E-106): the
    invented decimal confidence derived from datierungsevidenz is fully removed."""
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
    """No record carries a DIRECT agrelon:metadataProvenance/-Confidence: the
    dating self-provenance dropped together with the confidence (E-106). The
    legitimate provenance on nested AgRelOn relations stays intact (it is not a
    direct record key)."""
    offenders = [
        r["@id"] for r in records
        if "agrelon:metadataProvenance" in r or "agrelon:metadataConfidence" in r
    ]
    assert not offenders, (
        f"{len(offenders)} Records mit direkter Datierungs-Self-Provenance/"
        f"-Konfidenz (sollte mit E-106 entfallen sein): {offenders[:5]}"
    )


def test_agrelon_relation_provenance_intact(graph):
    """Positive control: the legitimate agrelon:metadataProvenance on the AgRelOn
    relations (m3gim-ontology:hasAgentRelation, back-reference to the record) still
    exists, the confidence removal did not take it along by accident."""
    seen = 0
    for n in graph:
        for rel in ensure_list(n.get("m3gim-ontology:hasAgentRelation")):
            if isinstance(rel, dict) and "agrelon:metadataProvenance" in rel:
                seen += 1
    assert seen >= 1, (
        "Keine AgRelOn-Relation mehr mit metadataProvenance — die "
        "Konfidenz-Entfernung hat zu viel abgeraeumt."
    )
