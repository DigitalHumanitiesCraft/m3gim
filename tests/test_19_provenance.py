"""Provenance + Konfidenz-Spec: Phase 4.3 aus data.md Abschnitt 9.

STATUS: aktiv, sichert den Phase-4.3-Output (seit Session 28). Tests greifen,
wenn m3gim:dateEvidence statt agrelon:hasProvenance + agrelon:hasConfidenceValue
im Output auftaucht (Rueckfall auf altes Schema).

Mapping (data.md § 9):
  aus_dokument -> hasConfidenceValue 1.0
  erschlossen  -> hasConfidenceValue 0.6
  extern       -> hasConfidenceValue 0.8
  unbekannt    -> hasConfidenceValue 0.0

hasProvenance = Archivrecord-URI (self-reference) oder externe Quelle.
"""

import pytest


def test_date_evidence_property_removed(records):
    """Keine m3gim:dateEvidence-Property mehr im Output (Phase 4.3)."""
    offenders = [r["@id"] for r in records if "m3gim:dateEvidence" in r]
    assert not offenders, (
        f"m3gim:dateEvidence noch vorhanden bei {len(offenders)} Records "
        f"(z.B. {offenders[:3]})"
    )


def test_provenance_paired_with_confidence(records):
    """agrelon:hasProvenance und agrelon:hasConfidenceValue treten gemeinsam auf.
    Keine halbierte Meta-Aussage (data.md § 9)."""
    mismatch = []
    for r in records:
        has_prov = "agrelon:hasProvenance" in r
        has_conf = "agrelon:hasConfidenceValue" in r
        if has_prov != has_conf:
            mismatch.append((r["@id"], has_prov, has_conf))
    assert not mismatch, f"Provenance/Confidence inkonsistent: {mismatch[:5]}"


def test_confidence_values_from_evidenz_mapping(records):
    """agrelon:hasConfidenceValue ist als Literal mit xsd:decimal getypt und
    Wert in {0.0, 0.6, 0.8, 1.0}. Mindestens 50 Records mit Konfidenz erwartet
    (in v2 haben 90 Records datierungsevidenz)."""
    allowed = {"0.0", "0.6", "0.8", "1.0"}
    offenders = []
    checked = 0
    for r in records:
        cv = r.get("agrelon:hasConfidenceValue")
        if cv is None:
            continue
        checked += 1
        if isinstance(cv, dict):
            val = cv.get("@value")
            typ = cv.get("@type")
            if typ != "xsd:decimal":
                offenders.append((r["@id"], f"wrong type: {typ}"))
            if str(val) not in allowed:
                offenders.append((r["@id"], f"unexpected value: {val}"))
        else:
            if str(cv) not in allowed:
                offenders.append((r["@id"], f"raw value: {cv}"))
    assert checked >= 50, f"Nur {checked} Records mit Konfidenz (erwartet >= 50)"
    assert not offenders, f"Konfidenz-Werte nicht im erwarteten Set: {offenders[:5]}"
