"""Modelling rules confirmed by the operator, recorded as E-129 to E-132 in
knowledge/architecture-decisions.md.

Rule 1 (E-129): a relation whose object is the fonds creator herself
    is suppressed; the role stays recorded as m3gim-ontology:hasAssociatedAgent.
Rule 2 (E-130): the source value `fotografie` maps to
    m3gim-vocab:photograph and carries a display label.
Rule 3 (E-131): `programm` is the canonical concept labelled
    "Programm"; `programmheft` and `konzertprogramm` are source-value synonyms
    resolving to it.
Warning (E-130, appendix): an unmapped dokumenttyp names value and source cell
    instead of vanishing silently.
"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from _helpers import ensure_list, relation_parties

DFT_PREFIX = "m3gim-vocab:"

# Records carrying a self-referential HasCorrespondent relation in the export
# of 2026-08-21 (decision template § 1). They double as the no-loss control.
SELF_RELATION_ANCHORS = [
    "UAKUG/NIM_004 1",
    "UAKUG/NIM_004 23",
    "UAKUG/NIM_004 27",
    "UAKUG/NIM_007 1",
    "UAKUG/NIM_007 2",
]


def _row(**cols) -> pd.Series:
    base = {"archivsignatur": "UAKUG/NIM_999"}
    base.update(cols)
    return pd.Series(base)


# ---------------------------------------------------------------------------
# Rule 1 — suppress meaningless self-relations
# ---------------------------------------------------------------------------

def test_no_self_referential_agent_relations_and_roles_kept(records):
    """No m3gim-ontology:hasAgentRelation points from the fonds creator to herself, and the
    anchor records still carry her as m3gim-ontology:hasAssociatedAgent — the
    suppression must not drop the role assignment."""
    by_ident = {r.get("rico:identifier"): r for r in records}

    for ident in SELF_RELATION_ANCHORS:
        rec = by_ident.get(ident)
        assert rec is not None, f"Anker-Record {ident} fehlt im Export"
        agents = [
            a for a in ensure_list(rec.get("m3gim-ontology:hasAssociatedAgent"))
            if isinstance(a, dict) and a.get("@id") == "wd:Q94208"
        ]
        assert agents, (
            f"{ident}: Malaniuk nicht mehr als m3gim-ontology:hasAssociatedAgent — "
            f"die Rollenzuordnung darf durch die Unterdrueckung nicht verloren gehen"
        )

    offenders = []
    for r in records:
        for rel in ensure_list(r.get("m3gim-ontology:hasAgentRelation")):
            if not isinstance(rel, dict):
                continue
            # Beide Formen pruefen: gerichtet ueber hasSubject/hasObject,
            # symmetrisch ueber die beiden hasSubjectObject-Seiten (E-149).
            parties = relation_parties(rel)
            if len(parties) != 2:
                continue
            subj, obj = parties
            same_id = subj.get("@id") and subj.get("@id") == obj.get("@id")
            same_name = not obj.get("@id") and subj.get("name") == obj.get("name")
            if same_id or same_name:
                offenders.append((r.get("rico:identifier"), rel.get("@type")))
    assert not offenders, (
        f"{len(offenders)} selbstbezuegliche AgRelOn-Relationen im Export "
        f"(Aussage der Form 'Malaniuk korrespondierte mit Malaniuk'): "
        f"{offenders[:5]}"
    )


def test_maybe_add_agrelon_skips_fonds_subject_by_id():
    """Early exit on identical Wikidata id, with a positive control that the
    same role still produces a relation for a different agent."""
    from transform import MALANIUK_SUBJECT, _maybe_add_agrelon

    record = {"@id": "m3gim-data:TEST_1"}
    _maybe_add_agrelon(record, "person", "adressat", dict(MALANIUK_SUBJECT))
    assert "m3gim-ontology:hasAgentRelation" not in record, (
        "Selbstbezug erzeugt weiterhin eine Beziehung"
    )

    other = {"name": "Barth, Herbert", "@id": "wd:Q1587046"}
    _maybe_add_agrelon(record, "person", "adressat", other)
    rels = record.get("m3gim-ontology:hasAgentRelation", [])
    assert len(rels) == 1 and rels[0]["@type"] == "agrelon:HasCorrespondent", (
        "Beziehung zu einem anderen Agent wird faelschlich unterdrueckt"
    )


def test_maybe_add_agrelon_skips_fonds_subject_by_name_without_id():
    """Name comparison is the fallback: a share of the linked agents carries no
    Wikidata id, so the id check alone would let the self-reference through."""
    from transform import MALANIUK_SUBJECT, _maybe_add_agrelon

    record = {"@id": "m3gim-data:TEST_2"}
    _maybe_add_agrelon(record, "person", "auftraggeber",
                       {"name": MALANIUK_SUBJECT["name"]})
    assert "m3gim-ontology:hasAgentRelation" not in record, (
        "Selbstbezug ohne Wikidata-Kennung erzeugt weiterhin eine Beziehung"
    )


# ---------------------------------------------------------------------------
# Rule 2 — map fotografie explicitly
# ---------------------------------------------------------------------------

def test_fotografie_is_mapped_and_labelled():
    """The source value fotografie resolves to its concept and the concept
    node carries the display label instead of the bare slug."""
    from transform import (DFT_LABELS, DOKUMENTTYP_TO_DFT, build_dft_concepts,
                           convert_objekt)

    assert DOKUMENTTYP_TO_DFT.get("fotografie") == "m3gim-vocab:photograph"
    assert DFT_LABELS.get("photograph") == "Fotografie"

    record = convert_objekt(_row(dokumenttyp="Fotografie"))
    assert record.get("rico:hasDocumentaryFormType") == {"@id": "m3gim-vocab:photograph"}

    concepts = build_dft_concepts([record])
    by_id = {c["@id"]: c for c in concepts}
    assert by_id["m3gim-vocab:photograph"]["skos:prefLabel"] == "Fotografie"


# ---------------------------------------------------------------------------
# Rule 3 — one canonical programme concept with synonym handling
# ---------------------------------------------------------------------------

def test_programm_is_canonical_concept_with_synonyms():
    """programm is the single concept, labelled after itself; programmheft and
    konzertprogramm stay accepted source values resolving to it."""
    from transform import DFT_BROADER, DFT_LABELS, DOKUMENTTYP_TO_DFT, convert_objekt

    assert DFT_LABELS.get("program") == "Programm"
    for source_value in ("programm", "programmheft", "konzertprogramm"):
        assert DOKUMENTTYP_TO_DFT.get(source_value) == "m3gim-vocab:program", (
            f"Quellwert {source_value!r} loest nicht auf den kanonischen Begriff auf"
        )
        record = convert_objekt(_row(dokumenttyp=source_value))
        assert record.get("rico:hasDocumentaryFormType") == {"@id": "m3gim-vocab:program"}

    assert "programmheft" not in DFT_BROADER, (
        "programmheft ist kein eigenes Konzept mehr und braucht keinen Oberbegriff"
    )
    assert "programmheft" not in DFT_LABELS, (
        "programmheft ist kein eigenes Konzept mehr und braucht kein Label"
    )
    assert "m3gim-vocab:programmheft" not in set(DOKUMENTTYP_TO_DFT.values())


def test_programm_concept_in_export_is_labelled_programm(graph):
    """In the export the concept node reads Programm, and the merged subconcept
    does not appear."""
    concepts = {
        n["@id"]: n for n in graph
        if n.get("@type") == "skos:Concept"
        and isinstance(n.get("@id"), str) and n["@id"].startswith(DFT_PREFIX)
    }
    assert "m3gim-vocab:program" in concepts, "programm-Concept fehlt im Export"
    assert concepts["m3gim-vocab:program"]["skos:prefLabel"] == "Programm", (
        "Der Oberbegriff traegt weiterhin das Label seines Unterfalls"
    )
    assert "m3gim-vocab:programmheft" not in concepts


# ---------------------------------------------------------------------------
# Warning on an unmapped dokumenttyp
# ---------------------------------------------------------------------------

def test_unknown_dokumenttyp_warns_with_value_and_location(capsys):
    """An unmapped dokumenttyp names value and source cell; a mapped one stays
    silent."""
    from transform import convert_objekt

    record = convert_objekt(_row(dokumenttyp="Hologramm"), xlsx_row=4242)
    assert "rico:hasDocumentaryFormType" not in record
    out = capsys.readouterr().out
    assert "hologramm" in out.lower(), f"Unbekannter Wert nicht gemeldet: {out!r}"
    assert "UAKUG/NIM_999" in out, f"Fundstelle nicht gemeldet: {out!r}"
    assert "4242" in out, f"XLSX-Zeile nicht gemeldet: {out!r}"

    convert_objekt(_row(dokumenttyp="Vertrag"), xlsx_row=7)
    assert capsys.readouterr().out == "", "Gemappter Dokumenttyp warnt faelschlich"