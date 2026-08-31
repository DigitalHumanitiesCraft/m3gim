"""AgRelOn-Spec: Phase 4.8 — Agent-Agent-Relationen aus data.md Abschnitt 8.

STATUS: aktiv, sichert den Phase-4.8-Output (seit Session 28). Tests greifen,
wenn die Pipeline Rollen wie 'arbeitgeber', 'absender' etc. nicht mehr zu
agrelon:*-Relationen transformiert.

Mapping aus data-model.md § 8.3:
  arbeitgeber (institution)        -> agrelon:hasEmployer
  ausbildungsstätte (institution)  -> agrelon:isMemberOf (+ Lehrkraft hasTeacher)
  agent, vermittler (person)       -> agrelon:hasProfessionalContact
  auftraggeber (Foerderung)        -> agrelon:isPatronOf
  absender/empfänger (Korrespondenz) -> agrelon:hasCorrespondent
  adressat (Korrespondenz)         -> agrelon:hasCorrespondent
  Ko-Praesenz in Aufführung        -> agrelon:hasColleague (inferiert)

Serialisierung: je eine Instanz von agrelon:HasEmployeeEmployer etc. mit
hasSubject/hasObject/hasValidityPeriod/hasProvenance/hasConfidenceValue.
"""

import pytest

from _helpers import ensure_list


def test_agrelon_namespace_in_context(jsonld):
    """agrelon:-Prefix muss im JSON-LD @context stehen."""
    ctx = jsonld.get("@context", {})
    assert "agrelon" in ctx, "agrelon:-Prefix fehlt im @context"
    assert "elementset/agrelon" in ctx["agrelon"], (
        f"agrelon:-URI falsch: {ctx.get('agrelon')}"
    )


def test_has_employer_relations_from_arbeitgeber(records, xlsx_verknuepfungen):
    """Fuer jede XLSX-Zeile typ=institution, rolle=arbeitgeber, die einem
    Record zugeordnet werden kann, existiert eine HasEmployeeEmployer-Relation.
    Verwaiste Rows (Signatur/Folio nicht matchbar) sind ausgenommen.

    Ohne matchbare Zeile hat der Vergleich keinen Gegenstand; der Test
    ueberspringt sich dann sichtbar, statt als gruener Test ohne
    ausgefuehrten Assert durchzulaufen.
    """
    df = xlsx_verknuepfungen
    assert "typ" in df.columns and "rolle" in df.columns, (
        "Verknuepfungs-XLSX hat keine typ/rolle-Spalten — Struktur-Regress "
        "(siehe knowledge/data.md § 17)."
    )
    # Record-Identifier-Index aufbauen
    by_ident = {}
    for r in records:
        ident = r.get("rico:identifier")
        if ident:
            by_ident[ident] = r

    typ_col = df["typ"].fillna("").astype(str).str.strip().str.lower()
    role_col = df["rolle"].fillna("").astype(str).str.strip().str.lower()
    role_norm = role_col.str.replace(":innen$", "", regex=True).str.replace(":in$", "", regex=True)
    mask = (typ_col == "institution") & (role_norm == "arbeitgeber")

    folio_col = "folio" if "folio" in df.columns else None
    matchable = 0
    for _, row in df[mask].iterrows():
        sig = str(row.get("archivsignatur", "")).strip()
        if not sig:
            continue
        folio_val = row.get(folio_col) if folio_col else None
        folio = str(folio_val).strip() if folio_val and str(folio_val) != "nan" else None
        ident = f"{sig} {folio}" if folio else sig
        if ident in by_ident or sig in by_ident:
            matchable += 1

    if matchable == 0:
        pytest.skip(
            f"Die Quelle fuehrt {int(mask.sum())} Zeilen typ=institution/"
            f"rolle=arbeitgeber, davon keine mit einer Signatur, die einem "
            f"Record zugeordnet werden kann (verwaist, data.md § 17). Der "
            f"Vergleich haette keinen Gegenstand."
        )

    actual = sum(
        1 for r in records
        for rel in ensure_list(r.get("m3gim-ontology:hasAgentRelation"))
        if isinstance(rel, dict) and rel.get("@type") == "agrelon:HasEmployeeEmployer"
    )
    assert actual >= matchable, (
        f"{actual} HasEmployeeEmployer im Output, {matchable} matchbare XLSX-Zeilen"
    )


def test_correspondence_relations_have_provenance(records):
    """Jede hasCorrespondent-Relation traegt agrelon:metadataProvenance
    (= URI des Record-Briefes). Sichert, dass die Provenance-Spur konsistent
    ist — Aussage ohne Quelle ist unzulaessig.
    """
    corr_rels = []
    for r in records:
        for rel in ensure_list(r.get("m3gim-ontology:hasAgentRelation")):
            if isinstance(rel, dict) and rel.get("@type") == "agrelon:HasCorrespondent":
                corr_rels.append(rel)
    assert corr_rels, "Keine HasCorrespondent-Relation im Output"
    missing = [r for r in corr_rels if not r.get("agrelon:metadataProvenance")]
    assert not missing, (
        f"{len(missing)} Korrespondenz-Relationen ohne Provenance"
    )


def test_validity_period_well_formed(records, xlsx_verknuepfungen):
    """Struktur-Check fuer agrelon:metadataPeriod: BlankNode mit Begin/End als
    ISO-String.

    Kein Zwang auf Existenz, der Gueltigkeitszeitraum haengt an der
    Abdeckung der arbeitgeber-Zeilen. Traegt keine Relation einen Zeitraum,
    ueberspringt sich der Test sichtbar, statt gruen ohne ausgefuehrten
    Assert durchzulaufen."""
    import re
    iso_pat = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")
    df = xlsx_verknuepfungen
    if "typ" in df.columns and "rolle" in df.columns:
        typ_col = df["typ"].fillna("").astype(str).str.strip().str.lower()
        role_col = df["rolle"].fillna("").astype(str).str.strip().str.lower()
        role_norm = role_col.str.replace(":innen$", "", regex=True).str.replace(":in$", "", regex=True)
        expected_min = int(((typ_col == "institution") & (role_norm == "arbeitgeber")).sum())
    else:
        expected_min = 0

    checked = 0
    for r in records:
        for rel in ensure_list(r.get("m3gim-ontology:hasAgentRelation")):
            if not isinstance(rel, dict):
                continue
            vp = rel.get("agrelon:metadataPeriod")
            if not vp:
                continue
            checked += 1
            assert isinstance(vp, dict), f"hasValidityPeriod ist kein BlankNode: {vp}"
            begin = vp.get("agrelon:hasBeginDate")
            end = vp.get("agrelon:hasEndDate")
            assert begin or end, f"ValidityPeriod ohne Begin/End: {rel.get('@id')}"
            for label, val in [("begin", begin), ("end", end)]:
                if val:
                    assert iso_pat.match(str(val)), (
                        f"ValidityPeriod {label} nicht ISO: {val}"
                    )
    if checked == 0:
        pytest.skip(
            f"Keine Relation im Output traegt agrelon:metadataPeriod "
            f"({expected_min} arbeitgeber-Zeilen in der Quelle, davon keine "
            f"mit datierbarem Record). Die Struktur-Asserts oben hatten "
            f"keinen Gegenstand."
        )
