"""m3gim:StageRole als eigenständige Entität (E-96).

Bühnenrollen werden als deduplizierte Top-Level-Entitäten mit deterministischer
ASCII-Slug-@id geführt, nicht mehr als Attribut m3gim:hasPerformanceRole.
"""

import re


def test_no_legacy_performance_role(records):
    """Das alte Attribut m3gim:hasPerformanceRole ist vollständig abgelöst (E-96)."""
    offenders = [r["@id"] for r in records if "m3gim:hasPerformanceRole" in r]
    assert not offenders, f"hasPerformanceRole noch vorhanden: {offenders[:5]}"


def test_stage_roles_exist_and_well_formed(graph):
    """StageRole-Entitäten existieren, tragen ASCII-Slug-@id (m3gim:role_*),
    @type und rico:name."""
    srs = [n for n in graph if n.get("@type") == "m3gim:StageRole"]
    assert srs, "Keine m3gim:StageRole im Graph (E-96 nicht aktiv)"
    slug_pat = re.compile(r"^m3gim:role_[a-z0-9_]+$")
    for sr in srs:
        assert slug_pat.match(sr.get("@id", "")), (
            f"StageRole-@id kein ASCII-Slug: {sr.get('@id')}"
        )
        assert sr.get("rico:name"), f"StageRole ohne rico:name: {sr.get('@id')}"


def test_stage_roles_deduplicated(graph):
    """StageRole-@ids sind eindeutig (geteiltes Dedup-Registry, E-96)."""
    ids = [n["@id"] for n in graph if n.get("@type") == "m3gim:StageRole"]
    assert len(ids) == len(set(ids)), "Doppelte StageRole-@id (Dedup verletzt)"
