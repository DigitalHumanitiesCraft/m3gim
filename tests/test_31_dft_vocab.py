"""Dokumentvokabular (E-101): sammlung als eigenständiges Concept ohne
skos:broader, lesbare deutsche skos:prefLabel auf den dft-Concepts (löst die
Frontend-Handtabelle DOKUMENTTYP_LABELS ab), und die neuen Konzepte
(briefumschlag/musikzeitschrift/chronik/verzeichnis) im Modell gerüstet.

Spec: data-model.md § 12, architecture-decisions.md E-101. Der Verknüpfungstyp `dokument` als
Aboutness ist vertagt, bis der tiefere Export den Typ liefert (April-Daten
kennen ihn nicht).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

DFT_PREFIX = "m3gim-vocab:"

# Erwartete deutsche Labels für die in den April-Daten belegten Typen.
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
    """`sammlung` ist ein eigenständiges Concept (nicht mehr auf `konvolut`
    gemappt) und trägt kein `skos:broader` — die is-a-Beziehung zu konvolut
    wird nicht vorentschieden (data-model.md § 12)."""
    concepts = _dft_concepts(graph)
    assert "m3gim-vocab:collection" in concepts, (
        "m3gim-vocab:collection fehlt im Graph — sammlung-Records mappen noch auf "
        "konvolut statt auf ein eigenes Concept (E-101)."
    )
    assert "skos:broader" not in concepts["m3gim-vocab:collection"], (
        "sammlung darf kein skos:broader tragen (data-model.md § 12)."
    )
    # data-backed: die sammlung-Records (häufigster Typ) zeigen auf das Concept.
    refs = [
        r["@id"] for r in records
        if isinstance(r.get("rico:hasDocumentaryFormType"), dict)
        and r["rico:hasDocumentaryFormType"].get("@id") == "m3gim-vocab:collection"
    ]
    assert len(refs) >= 10, (
        f"Nur {len(refs)} Records mit dft:sammlung — Mapping greift nicht."
    )


def test_dft_concepts_have_readable_preflabel(graph):
    """Jedes dft-Concept trägt ein `skos:prefLabel`, und die bekannten Konzepte
    tragen ihr deutsches Label (nicht den nackten Slug) — Voraussetzung dafür,
    dass das Frontend die Handtabelle DOKUMENTTYP_LABELS ablösen kann."""
    concepts = _dft_concepts(graph)
    assert concepts, "Keine dft-Concepts im Graph"
    missing = [cid for cid, c in concepts.items() if not c.get("skos:prefLabel")]
    assert not missing, f"dft-Concepts ohne skos:prefLabel: {missing[:5]}"
    # Labels sind echt (deutsch, kapitalisiert), nicht der Slug.
    for cid, label in EXPECTED_LABELS.items():
        if cid in concepts:
            assert concepts[cid]["skos:prefLabel"] == label, (
                f"{cid}: prefLabel={concepts[cid]['skos:prefLabel']!r}, "
                f"erwartet {label!r} (Slug statt Label?)"
            )


def test_every_record_dokumenttyp_resolves(records):
    """Coverage: jeder Record, der einen Dokumenttyp trägt, hat eine
    `rico:hasDocumentaryFormType`-Referenz — kein stiller Drop unbekannter
    Typen. Mindestens 200 Records erwartet (fast alle tragen einen Typ)."""
    with_dft = [r for r in records if r.get("rico:hasDocumentaryFormType")]
    assert len(with_dft) >= 200, (
        f"Nur {len(with_dft)} Records mit hasDocumentaryFormType — "
        f"DOKUMENTTYP_TO_DFT deckt nicht alle belegten Typen."
    )


def test_new_concepts_scaffolded():
    """Die neuen Konzepte sind im Modell gerüstet (data-model.md § 12): korrekt
    in der broader-Hierarchie platziert bzw. bewusst top-level. Aktiv werden
    sie erst mit dem tieferen Export; hier nur die Struktur-Spec."""
    from transform import DFT_BROADER, DOKUMENTTYP_TO_DFT

    assert DFT_BROADER.get("envelope") == "correspondence"
    assert DFT_BROADER.get("musicPeriodical") == "press"
    assert DFT_BROADER.get("chronicle") == "biographical"
    # verzeichnis und sammlung sind top-level / eigenständig (kein broader).
    assert "inventory" not in DFT_BROADER
    assert "collection" not in DFT_BROADER
    # Dokumenttyp-Mapping kennt die neuen Typen + sammlung als eigenes Concept.
    assert DOKUMENTTYP_TO_DFT.get("sammlung") == "m3gim-vocab:collection"
    for source_value, concept in (("briefumschlag", "envelope"),
                                  ("musikzeitschrift", "musicPeriodical"),
                                  ("chronik", "chronicle"),
                                  ("verzeichnis", "inventory")):
        assert DOKUMENTTYP_TO_DFT.get(source_value) == f"m3gim-vocab:{concept}", (
            f"{source_value} nicht gemappt"
        )


def test_dft_aboutness_not_subject(records):
    """Aboutness-Guard (E-101): ein dft-Concept darf nie als `rico:hasOrHadSubject`
    erscheinen — Dokumentbezug ist scopeAndContent, nicht Enthaltensein. In den
    April-Daten existiert der `dokument`-Verknüpfungstyp nicht; der Test sichert
    die Invariante für den tieferen Export vorab ab."""
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
