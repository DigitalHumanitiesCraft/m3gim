"""Unit-Lock fuer die STE-@id-Vergabe (`scripts.transform._ste_id`, E-115).

test_35 verankert die Invariante auf dem gebauten Graphen (Output). Dieser Test
sichert dieselbe Eigenschaft eine Ebene tiefer auf der reinen Funktion und deckt
den einen Punkt ab, den ein Output-Test strukturell nicht zeigen kann: die
Reihenfolge-Unabhaengigkeit. Ein globaler oder record-lokaler Laufzaehler
(frueherer Zustand, wiederkehrender test_22-Bruch) wuerde bei umgeordnetem Input
denselben Inhalts-Tupeln andere @ids zuweisen; der Content-Hash tut das nicht.
"""
import hashlib
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
from transform import _ste_id  # noqa: E402


# (rec_local_id, ort, rolle, datum) — bewusst mit einer echten Inhaltsdublette
# (zwei identische Tupel auf NIM_009_01) fuer den Suffix-Test.
SAMPLE = [
    ("NIM_004_24", "Zürich", "spielzeit", "1947/1952"),
    ("NIM_004_24", "Salzburg", "gastspiel", "1956"),
    ("NIM_004_24", "Wien", "zielort", ""),
    ("NIM_007_03", "München", "gastspiel", "1953"),
    ("NIM_009_01", "Bayreuth", "gastspiel", "1951/1953"),
    ("NIM_009_01", "Bayreuth", "gastspiel", "1951/1953"),
    ("NIM_011_02", "Stuttgart", "spielzeit", ""),
]

ID_PATTERN = re.compile(r"^m3gim:[\w/_.\-]+$")


def _ids_by_tuple(tuples: list) -> dict:
    """Vergibt @ids fuer eine Tupelfolge in gegebener Reihenfolge und gruppiert
    sie nach Inhalts-Tupel: Tupel -> sortierte Liste der ihm zugewiesenen @ids.
    Eine echte Inhaltsdublette traegt so [Basis, Basis-2, ...]; die Multimenge
    je Tupel ist reihenfolge-unabhaengig, ein Laufzaehler dagegen wuerde
    demselben Tupel je nach Position andere @ids geben."""
    seen: dict = {}
    out: dict = {}
    for rec, ort, rolle, datum in tuples:
        sid = _ste_id(rec, ort, rolle, datum, seen)
        out.setdefault((rec, ort, rolle, datum), []).append(sid)
    return {k: sorted(v) for k, v in out.items()}


def test_sample_nonempty():
    assert len(SAMPLE) >= 5, "Stichprobe zu klein fuer einen aussagekraeftigen Lock"


def test_order_independence():
    """Kernpunkt: dieselben Inhalts-Tupel liefern in jeder Eingabereihenfolge
    dieselben @ids. Verglichen wird die Abbildung Tupel->@id-Multimenge, nicht
    nur die Gesamtmenge, damit ein reihenfolgeabhaengiger Zaehler (der pro Ordnung
    eine andere Zuordnung Tupel->@id liefert) den Test bricht."""
    forward_map = _ids_by_tuple(SAMPLE)

    for perm in (list(reversed(SAMPLE)),
                 [SAMPLE[3], SAMPLE[0], SAMPLE[6], SAMPLE[1], SAMPLE[4], SAMPLE[2], SAMPLE[5]]):
        perm_map = _ids_by_tuple(perm)
        assert perm_map == forward_map, (
            "STE-@id haengt von der Eingabereihenfolge ab (Zaehler-Regress?): "
            f"{perm_map} != {forward_map}"
        )


def test_collision_gets_ordinal_suffix():
    """Zwei identische Tupel auf demselben Record deduplizieren nicht, sondern
    bekommen ein stabiles Ordinal-Suffix -N in Auftrittsreihenfolge."""
    seen: dict = {}
    first = _ste_id("NIM_009_01", "Bayreuth", "gastspiel", "1951/1953", seen)
    second = _ste_id("NIM_009_01", "Bayreuth", "gastspiel", "1951/1953", seen)
    third = _ste_id("NIM_009_01", "Bayreuth", "gastspiel", "1951/1953", seen)
    assert second == f"{first}-2"
    assert third == f"{first}-3"


def test_same_tuple_different_record_no_collision():
    """Gleiches (Ort, Rolle, Datum) auf verschiedenen Records kollidiert nicht,
    weil der Record-Teil in die @id-Basis eingeht."""
    seen: dict = {}
    a = _ste_id("NIM_004_24", "Wien", "zielort", "", seen)
    b = _ste_id("NIM_007_03", "Wien", "zielort", "", seen)
    assert a != b
    assert "-" not in a.rsplit("_", 1)[-1] and "-" not in b.rsplit("_", 1)[-1]


def test_ids_match_schema_pattern_and_ascii():
    """Jede @id genuegt dem JSON-LD-@id-Pattern und ist ASCII-only, obwohl der
    Ort einen Umlaut traegt (der Umlaut geht in den utf-8-Hash, nicht in die
    @id-Zeichenkette)."""
    ids = [sid for group in _ids_by_tuple(SAMPLE).values() for sid in group]
    for sid in ids:
        assert ID_PATTERN.match(sid), f"@id verletzt Pattern: {sid!r}"
        assert sid.isascii(), f"@id nicht ASCII: {sid!r}"


@pytest.mark.parametrize("rec,ort,rolle,datum,expected", [
    ("NIM_004_24", "Zürich", "spielzeit", "1947/1952", "m3gim:ste_NIM_004_24_67319b11"),
    ("NIM_004_24", "Salzburg", "gastspiel", "1956", "m3gim:ste_NIM_004_24_ed272696"),
])
def test_anchor_ids(rec, ort, rolle, datum, expected):
    """Konkrete Anker (die Zuerich-/Salzburg-STE aus test_22): der Hash ist
    sha1(ort\\x1frolle\\x1fdatum)[:8] in utf-8. Pinnt Separator und Encoding."""
    assert _ste_id(rec, ort, rolle, datum, {}) == expected
    raw = "\x1f".join((ort, rolle, datum))
    h = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:8]
    assert expected.endswith("_" + h)
