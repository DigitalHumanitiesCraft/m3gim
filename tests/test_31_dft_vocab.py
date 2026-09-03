"""Document vocabulary (E-101): sammlung as a standalone concept without
skos:broader, readable German skos:prefLabel on the dft concepts (replaces the
frontend hand table DOKUMENTTYP_LABELS), and the new concepts
(briefumschlag/musikzeitschrift/chronik/verzeichnis) scaffolded in the model.

Spec: data-model.md § Dokumenttypen-Vokabular, journal.md E-101. The Verknuepfungen type `dokument` as
aboutness is deferred until the deeper export delivers the type (the April data
do not know it).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

DFT_PREFIX = "m3gim-vocab:"

# Expected German labels for the types attested in the April data.
EXPECTED_LABELS = {
    "m3gim-vocab:correspondence": "Korrespondenz",
    "m3gim-vocab:press": "Presse",
    "m3gim-vocab:review": "Rezension",
    "m3gim-vocab:collection": "Sammlung",
    "m3gim-vocab:poster": "Plakat",
    "m3gim-vocab:contract": "Vertrag",
    "m3gim-vocab:identityDocument": "Identitätsdokument",
    "m3gim-vocab:soundCarrier": "Tonträger",
}


def _dft_concepts(graph):
    return {
        n["@id"]: n for n in graph
        if n.get("@type") == "skos:Concept"
        and isinstance(n.get("@id"), str) and n["@id"].startswith(DFT_PREFIX)
    }


def test_sammlung_is_own_concept_without_broader(records, graph):
    """`sammlung` is a standalone concept (no longer mapped to `konvolut`) and
    carries no `skos:broader`, the is-a relation to konvolut is not pre-decided
    (data-model.md § Dokumenttypen-Vokabular)."""
    concepts = _dft_concepts(graph)
    assert "m3gim-vocab:collection" in concepts, (
        "m3gim-vocab:collection fehlt im Graph — sammlung-Records mappen noch auf "
        "konvolut statt auf ein eigenes Concept (E-101)."
    )
    assert "skos:broader" not in concepts["m3gim-vocab:collection"], (
        "sammlung darf kein skos:broader tragen (data-model.md § Dokumenttypen-Vokabular)."
    )
    # data-backed: the sammlung records (most frequent type) point to the concept.
    refs = [
        r["@id"] for r in records
        if isinstance(r.get("rico:hasDocumentaryFormType"), dict)
        and r["rico:hasDocumentaryFormType"].get("@id") == "m3gim-vocab:collection"
    ]
    assert len(refs) >= 10, (
        f"Nur {len(refs)} Records mit dft:sammlung — Mapping greift nicht."
    )


def test_dft_concepts_have_readable_preflabel(graph):
    """Every dft concept carries a `skos:prefLabel`, and the known concepts
    carry their German label (not the bare slug), a precondition for the frontend
    to replace the hand table DOKUMENTTYP_LABELS."""
    concepts = _dft_concepts(graph)
    assert concepts, "Keine dft-Concepts im Graph"
    missing = [cid for cid, c in concepts.items() if not c.get("skos:prefLabel")]
    assert not missing, f"dft-Concepts ohne skos:prefLabel: {missing[:5]}"
    # Labels are real (German, capitalized), not the slug.
    for cid, label in EXPECTED_LABELS.items():
        if cid in concepts:
            assert concepts[cid]["skos:prefLabel"] == label, (
                f"{cid}: prefLabel={concepts[cid]['skos:prefLabel']!r}, "
                f"erwartet {label!r} (Slug statt Label?)"
            )


def test_every_record_dokumenttyp_resolves(records):
    """Coverage: every record carrying a document type has a
    `rico:hasDocumentaryFormType` reference, no silent drop of unknown types. At
    least 200 records expected (almost all carry a type)."""
    with_dft = [r for r in records if r.get("rico:hasDocumentaryFormType")]
    assert len(with_dft) >= 200, (
        f"Nur {len(with_dft)} Records mit hasDocumentaryFormType — "
        f"DOKUMENTTYP_TO_DFT deckt nicht alle belegten Typen."
    )


def test_new_concepts_scaffolded():
    """The new concepts are scaffolded in the model (data-model.md § Dokumenttypen-Vokabular): placed
    correctly in the broader hierarchy resp. deliberately top-level. They only
    become active with the deeper export; here just the structural spec."""
    from transform import DFT_BROADER, DOKUMENTTYP_TO_DFT

    assert DFT_BROADER.get("envelope") == "correspondence"
    assert DFT_BROADER.get("musicPeriodical") == "press"
    assert DFT_BROADER.get("chronicle") == "biographical"
    # verzeichnis and sammlung are top-level / standalone (no broader).
    assert "inventory" not in DFT_BROADER
    assert "collection" not in DFT_BROADER
    # The document-type mapping knows the new types + sammlung as its own concept.
    assert DOKUMENTTYP_TO_DFT.get("sammlung") == "m3gim-vocab:collection"
    for source_value, concept in (("briefumschlag", "envelope"),
                                  ("musikzeitschrift", "musicPeriodical"),
                                  ("chronik", "chronicle"),
                                  ("verzeichnis", "inventory")):
        assert DOKUMENTTYP_TO_DFT.get(source_value) == f"m3gim-vocab:{concept}", (
            f"{source_value} nicht gemappt"
        )


def test_dft_aboutness_not_subject(records):
    """Aboutness guard (E-101): a dft concept must never appear as
    `rico:hasOrHadSubject`, document reference is scopeAndContent, not
    containment. In the April data the `dokument` Verknuepfungen type does not
    exist; the test secures the invariant ahead of the deeper export."""
    from _helpers import ensure_list
    offenders = []
    for r in records:
        for subj in ensure_list(r.get("rico:hasOrHadSubject")):
            if isinstance(subj, dict) and isinstance(subj.get("@id"), str) \
                    and subj["@id"].startswith(DFT_PREFIX):
                offenders.append((r["@id"], subj["@id"]))
    assert not offenders, (
        f"dft-Concept als hasOrHadSubject (Aboutness gehört in scopeAndContent, "
        f"E-101): {offenders[:5]}"
    )
