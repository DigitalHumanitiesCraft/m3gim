"""Lock for the content-based annotation @id scheme (refactoring 2026-06-21, E-115).

The @id of a m3gim-ontology:Annotation node is

    m3gim-data:ev_<record-local-id>_<sha1(ort\x1frolle\x1fdatum)[:8]>

optionally with an ordinal suffix ``-N`` on real content duplicates on the same
record. The recorded role value is hashed, not the concept it resolves to in the
vocabulary. This replaces the former global counter, whose shift on every change
recurrently broke test_22. This test anchors the invariant: the @id is a pure
function of its content, not of the processing order. A return to the counter
breaks it.
"""
import hashlib
import re

import pytest


def _expected_base(ste: dict) -> str:
    """Reconstruct the expected @id base from the node content, mirrors
    scripts.transform._annotation_id."""
    prov = ste.get("agrelon:metadataProvenance")
    rec = prov.get("@id") if isinstance(prov, dict) else None
    rec_local = rec.split(":", 1)[-1] if rec else ""
    place = ste.get("m3gim-ontology:atPlace")
    ort = place.get("name", "") if isinstance(place, dict) else ""
    role = ste.get("role")
    # Hashed is the recorded value: the origin value where the merge left one,
    # otherwise the prefLabel.
    rolle = ste.get("m3gim-ontology:derivedFromRole") or (
        role.get("skos:prefLabel", "") if isinstance(role, dict) else (role or "")
    )
    datum = ste.get("m3gim-ontology:atDate", "")
    raw = "\x1f".join((ort or "", rolle or "", datum or ""))
    h = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:8]
    return f"m3gim-data:ev_{rec_local}_{h}"


@pytest.fixture(scope="session")
def stes(graph) -> list:
    return [n for n in graph if n.get("@type") == "m3gim-ontology:Annotation"]


def test_ste_present(stes):
    assert stes, "keine Annotationen im Graph (Fixture oder Pipeline pruefen)"


def test_ste_ids_are_content_derived(stes):
    """Every annotation @id derives from (record, place, role, date), not from a
    running counter."""
    bad = []
    for ste in stes:
        base = _expected_base(ste)
        sid = ste.get("@id", "")
        if not (sid == base or sid.startswith(base + "-")):
            bad.append((sid, base))
    assert not bad, "Annotations-@id nicht inhaltsabgeleitet: " + "; ".join(
        f"{s!r} erwartet Basis {b!r}" for s, b in bad[:5])


def test_ste_ids_unique(stes):
    ids = [n["@id"] for n in stes]
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    assert not dupes, f"doppelte Annotations-@ids: {dupes}"


def test_ste_id_suffix_is_hash_not_counter(stes):
    """Structural lock: the @id suffix (before an optional ``-N``) is an 8-digit
    hex hash, not a decimal counter."""
    offenders = [
        ste["@id"] for ste in stes
        if not re.fullmatch(r"[0-9a-f]{8}", ste["@id"].rsplit("_", 1)[-1].split("-")[0])
    ]
    assert not offenders, f"STE-@id ohne 8-stelligen Hash-Suffix: {offenders[:5]}"
