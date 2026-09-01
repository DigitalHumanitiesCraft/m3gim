"""m3gim-ontology:StageRole as a standalone entity (E-96).

Stage roles are kept as deduplicated top-level entities with a deterministic
ASCII-slug @id, no longer as the attribute m3gim-ontology:hasPerformanceRole.
"""

import re


def test_no_legacy_performance_role(records):
    """The old attribute m3gim-ontology:hasPerformanceRole is fully replaced (E-96)."""
    offenders = [r["@id"] for r in records if "m3gim-ontology:hasPerformanceRole" in r]
    assert not offenders, f"hasPerformanceRole noch vorhanden: {offenders[:5]}"


def test_stage_roles_exist_and_well_formed(graph):
    """StageRole entities exist and carry an ASCII-slug @id
    (m3gim-data:stagerole_*), @type and rico:name."""
    srs = [n for n in graph if n.get("@type") == "m3gim-ontology:StageRole"]
    assert srs, "Keine m3gim-ontology:StageRole im Graph (E-96 nicht aktiv)"
    slug_pat = re.compile(r"^m3gim-data:stagerole_[a-z0-9_]+$")
    for sr in srs:
        assert slug_pat.match(sr.get("@id", "")), (
            f"StageRole-@id kein ASCII-Slug: {sr.get('@id')}"
        )
        assert sr.get("rico:name"), f"StageRole ohne rico:name: {sr.get('@id')}"


def test_stage_roles_deduplicated(graph):
    """StageRole @ids are unique (shared dedup registry, E-96)."""
    ids = [n["@id"] for n in graph if n.get("@type") == "m3gim-ontology:StageRole"]
    assert len(ids) == len(set(ids)), "Doppelte StageRole-@id (Dedup verletzt)"
