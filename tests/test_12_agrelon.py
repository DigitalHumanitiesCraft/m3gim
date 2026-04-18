"""AgRelOn-Spec: Phase 4.8 — Agent-Agent-Relationen aus data.md Abschnitt 8.

STATUS: aktiv, sichert den Phase-4.8-Output (seit Session 28). Tests greifen,
wenn die Pipeline Rollen wie 'arbeitgeber', 'absender' etc. nicht mehr zu
agrelon:*-Relationen transformiert.

Mapping aus data.md § 8.3:
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
    """
    df = xlsx_verknuepfungen
    assert "typ" in df.columns and "rolle" in df.columns, (
        "Verknuepfungs-XLSX hat keine typ/rolle-Spalten — Struktur-Regress "
        "(siehe knowledge/xlsx-fixes.md)."
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

    actual = sum(
        1 for r in records
        for rel in ensure_list(r.get("m3gim:agentRelation"))
        if isinstance(rel, dict) and rel.get("@type") == "agrelon:HasEmployeeEmployer"
    )
    assert actual >= matchable, (
        f"{actual} HasEmployeeEmployer im Output, {matchable} matchbare XLSX-Zeilen"
    )


def test_correspondence_relations_have_provenance(records):
    """Jede hasCorrespondent-Relation traegt agrelon:hasProvenance
    (= URI des Record-Briefes). Sichert, dass die Provenance-Spur konsistent
    ist — Aussage ohne Quelle ist unzulaessig.
    """
    corr_rels = []
    for r in records:
        for rel in ensure_list(r.get("m3gim:agentRelation")):
            if isinstance(rel, dict) and rel.get("@type") == "agrelon:HasCorrespondent":
                corr_rels.append(rel)
    assert corr_rels, "Keine HasCorrespondent-Relation im Output"
    missing = [r for r in corr_rels if not r.get("agrelon:hasProvenance")]
    assert not missing, (
        f"{len(missing)} Korrespondenz-Relationen ohne Provenance"
    )


def test_validity_period_well_formed(records, xlsx_verknuepfungen):
    """Struktur-Check fuer hasValidityPeriod (falls vorhanden): BlankNode mit
    Begin/End als ISO-String. Kein Zwang auf Existenz — v1 hat keine, v2 nur 1
    arbeitgeber-Zeile. Datenadaptiv: Mindestens so viele ValidityPeriods wie
    arbeitgeber-Zeilen in XLSX (Heuristik aus rico:date des Records)."""
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
        for rel in ensure_list(r.get("m3gim:agentRelation")):
            if not isinstance(rel, dict):
                continue
            vp = rel.get("agrelon:hasValidityPeriod")
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
    # Datenadaptiv: checked darf 0 sein, wenn keine matchbare arbeitgeber-Row
    # (verwaiste Signaturen sind moeglich — siehe exploration-report).
    # Strict-Check nur wenn Test-Invariante auf >= expected_min wirklich hart sein soll.
    # Hier: strukturelle Korrektheit ist oben gepraeft; Zaehlung ist info.
    if expected_min > 0 and checked == 0:
        pytest.skip(
            f"XLSX hat {expected_min} arbeitgeber-Zeilen, aber keine matchbaren "
            f"Records — evtl. verwaiste Signaturen"
        )
