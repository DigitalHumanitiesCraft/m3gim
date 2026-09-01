"""Unit lock for annotation @id assignment (`scripts.transform._annotation_id`, E-115).

test_35 anchors the invariant on the built graph (output). This test secures the
same property one level lower on the pure function and covers the one point an
output test structurally cannot show, the order independence. A global or
record-local run counter (former state, recurring test_22 break) would, on
reordered input, assign different @ids to the same content tuples; the content
hash does not.
"""
import hashlib
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
from transform import _annotation_id  # noqa: E402


# (rec_local_id, ort, rolle, datum) — deliberately with one true content
# duplicate (two identical tuples on NIM_009_01) for the suffix test.
SAMPLE = [
    ("NIM_004_24", "Zürich", "spielzeit", "1947/1952"),
    ("NIM_004_24", "Salzburg", "gastspiel", "1956"),
    ("NIM_004_24", "Wien", "zielort", ""),
    ("NIM_007_03", "München", "gastspiel", "1953"),
    ("NIM_009_01", "Bayreuth", "gastspiel", "1951/1953"),
    ("NIM_009_01", "Bayreuth", "gastspiel", "1951/1953"),
    ("NIM_011_02", "Stuttgart", "spielzeit", ""),
]

ID_PATTERN = re.compile(r"^m3gim-data:[\w/_.\-]+$")


def _ids_by_tuple(tuples: list) -> dict:
    """Assigns @ids for a tuple sequence in the given order and groups them by
    content tuple, mapping tuple to the sorted list of @ids assigned to it. A
    true content duplicate thus carries [base, base-2, ...]; the multiset per
    tuple is order-independent, whereas a run counter would give the same tuple
    different @ids depending on position."""
    seen: dict = {}
    out: dict = {}
    for rec, ort, rolle, datum in tuples:
        sid = _annotation_id(rec, ort, rolle, datum, seen)
        out.setdefault((rec, ort, rolle, datum), []).append(sid)
    return {k: sorted(v) for k, v in out.items()}


def test_sample_nonempty():
    assert len(SAMPLE) >= 5, "Stichprobe zu klein fuer einen aussagekraeftigen Lock"


def test_order_independence():
    """Core point: the same content tuples yield the same @ids in any input
    order. The compared quantity is the tuple->@id multiset mapping, not just
    the overall set, so an order-dependent counter (which gives a different
    tuple->@id mapping per order) breaks the test."""
    forward_map = _ids_by_tuple(SAMPLE)

    for perm in (list(reversed(SAMPLE)),
                 [SAMPLE[3], SAMPLE[0], SAMPLE[6], SAMPLE[1], SAMPLE[4], SAMPLE[2], SAMPLE[5]]):
        perm_map = _ids_by_tuple(perm)
        assert perm_map == forward_map, (
            "Annotations-@id haengt von der Eingabereihenfolge ab (Zaehler-Regress?): "
            f"{perm_map} != {forward_map}"
        )


def test_collision_gets_ordinal_suffix():
    """Two identical tuples on the same record do not deduplicate but get a
    stable ordinal suffix -N in order of appearance."""
    seen: dict = {}
    first = _annotation_id("NIM_009_01", "Bayreuth", "gastspiel", "1951/1953", seen)
    second = _annotation_id("NIM_009_01", "Bayreuth", "gastspiel", "1951/1953", seen)
    third = _annotation_id("NIM_009_01", "Bayreuth", "gastspiel", "1951/1953", seen)
    assert second == f"{first}-2"
    assert third == f"{first}-3"


def test_same_tuple_different_record_no_collision():
    """The same (ort, rolle, datum) on different records does not collide,
    because the record part enters the @id base."""
    seen: dict = {}
    a = _annotation_id("NIM_004_24", "Wien", "zielort", "", seen)
    b = _annotation_id("NIM_007_03", "Wien", "zielort", "", seen)
    assert a != b
    assert "-" not in a.rsplit("_", 1)[-1] and "-" not in b.rsplit("_", 1)[-1]


def test_ids_match_schema_pattern_and_ascii():
    """Every @id satisfies the JSON-LD @id pattern and is ASCII-only, although
    the ort carries an umlaut (the umlaut enters the utf-8 hash, not the @id
    string)."""
    ids = [sid for group in _ids_by_tuple(SAMPLE).values() for sid in group]
    for sid in ids:
        assert ID_PATTERN.match(sid), f"@id verletzt Pattern: {sid!r}"
        assert sid.isascii(), f"@id nicht ASCII: {sid!r}"


@pytest.mark.parametrize("rec,ort,rolle,datum,expected", [
    ("NIM_004_24", "Zürich", "spielzeit", "1947/1952", "m3gim-data:ev_NIM_004_24_67319b11"),
    ("NIM_004_24", "Salzburg", "gastspiel", "1956", "m3gim-data:ev_NIM_004_24_ed272696"),
])
def test_anchor_ids(rec, ort, rolle, datum, expected):
    """Concrete anchors (the Zurich/Salzburg annotation from test_22): the hash
    is sha1(ort\\x1frolle\\x1fdatum)[:8] in utf-8. Pins separator and encoding."""
    assert _annotation_id(rec, ort, rolle, datum, {}) == expected
    raw = "\x1f".join((ort, rolle, datum))
    h = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:8]
    assert expected.endswith("_" + h)
