"""Lock fuer das inhaltsbasierte STE-@id-Schema (Refactoring 2026-06-21, E-115).

Die @id eines m3gim:SpatiotemporalEvent ist

    m3gim:ste_<record-local-id>_<sha1(ort\\x1frolle\\x1fdatum)[:8]>

optional mit Ordinal-Suffix ``-N`` bei echten Inhaltsdubletten auf demselben
Record. Das loest den frueheren globalen Zaehler ab, dessen Verschiebung bei
jeder STE-Aenderung wiederkehrend test_22 brach. Dieser Test verankert die
Invariante: die @id ist eine reine Funktion ihres Inhalts, nicht der
Verarbeitungsreihenfolge. Eine Rueckkehr zum Zaehler bricht ihn.
"""
import hashlib
import re

import pytest


def _expected_base(ste: dict) -> str:
    """Rekonstruiert die erwartete @id-Basis aus dem STE-Inhalt, spiegelt
    scripts.transform._ste_id."""
    prov = ste.get("agrelon:metadataProvenance")
    rec = prov.get("@id") if isinstance(prov, dict) else None
    rec_local = rec.split(":", 1)[-1] if rec else ""
    place = ste.get("m3gim:atPlace")
    ort = place.get("name", "") if isinstance(place, dict) else ""
    rolle = ste.get("m3gim:eventRole", "")
    datum = ste.get("m3gim:atDate", "")
    raw = "\x1f".join((ort or "", rolle or "", datum or ""))
    h = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:8]
    return f"m3gim:ste_{rec_local}_{h}"


@pytest.fixture(scope="session")
def stes(graph) -> list:
    return [n for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"]


def test_ste_present(stes):
    assert stes, "keine SpatiotemporalEvents im Graph (Fixture oder Pipeline pruefen)"


def test_ste_ids_are_content_derived(stes):
    """Jede STE-@id leitet sich aus (Record, Ort, Rolle, Datum) ab, nicht aus
    einem laufenden Zaehler."""
    bad = []
    for ste in stes:
        base = _expected_base(ste)
        sid = ste.get("@id", "")
        if not (sid == base or sid.startswith(base + "-")):
            bad.append((sid, base))
    assert not bad, "STE-@id nicht inhaltsabgeleitet: " + "; ".join(
        f"{s!r} erwartet Basis {b!r}" for s, b in bad[:5])


def test_ste_ids_unique(stes):
    ids = [n["@id"] for n in stes]
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    assert not dupes, f"doppelte STE-@ids: {dupes}"


def test_ste_id_suffix_is_hash_not_counter(stes):
    """Strukturlock: der @id-Suffix (vor optionalem ``-N``) ist ein
    8-stelliger Hex-Hash, kein dezimaler Zaehler."""
    offenders = [
        ste["@id"] for ste in stes
        if not re.fullmatch(r"[0-9a-f]{8}", ste["@id"].rsplit("_", 1)[-1].split("-")[0])
    ]
    assert not offenders, f"STE-@id ohne 8-stelligen Hash-Suffix: {offenders[:5]}"
