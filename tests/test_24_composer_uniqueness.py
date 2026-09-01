"""Composer spelling variants in the Werkindex (session 38).

The statistics tab lists composers from the Werkindex as top-N. A typo in the
source XLSX causes the same composer to appear under two raw strings (e.g.
"Beethoven, Ludwig van" vs. "Beethoven, Ludwig von") and to show up twice in the
top-10 list.

Rule from ``knowledge/data.md § 17`` (documents as source of truth, "pipeline
workarounds are debt, not features"): spelling errors are fixed at the source.
The pipeline gets **no** special-case normalizer (no ``normalize_composer``) for
this, because that would silently paper over future typos.

Instead this test detects fuzzy-similar composer names and stays
``xfail(strict=True)`` as long as such pairs exist. After the XLSX fix the test
becomes ``XPASS`` → strict breaks the suite → remove the xfail marker, delete the
entry in data.md § 17.

Threshold: Levenshtein ratio >= 92. Beethoven van/von is typically around 96.
Mozart vs. Brahms around 20. The threshold catches typos and true variants, not
legitimately similar names.
"""

from __future__ import annotations

import pytest


def _iter_works(graph: list) -> list:
    """Return all raw composer names from m3gim-ontology:MusicalWork subjects."""
    out = []
    for node in graph:
        subjects = node.get("rico:hasOrHadSubject")
        if not subjects:
            continue
        if isinstance(subjects, dict):
            subjects = [subjects]
        for subj in subjects:
            if not isinstance(subj, dict):
                continue
            if subj.get("@type") != "m3gim-ontology:MusicalWork":
                continue
            komponist = (subj.get("composer") or "").strip()
            if komponist:
                out.append(komponist)
    return out


@pytest.mark.xfail(
    reason="data.md § 17 — Beethoven 'van/von' im Werkindex. Fix durch Archiv-Team.",
    strict=True,
)
def test_komponisten_ohne_fuzzy_duplikate(graph):
    """No two composer raw strings may be fuzzy-similar (>= 92)."""
    try:
        from thefuzz import fuzz  # type: ignore
    except ImportError:
        pytest.skip("thefuzz nicht installiert.")

    names = sorted(set(_iter_works(graph)))
    duplicates = []
    for i, a in enumerate(names):
        for b in names[i + 1 :]:
            score = fuzz.ratio(a.lower(), b.lower())
            if score >= 92:
                duplicates.append((score, a, b))

    assert not duplicates, (
        "Komponisten-Varianten gefunden (Levenshtein-Ratio >= 92). "
        "Source-Fix noetig (siehe knowledge/data.md § 17):\n  "
        + "\n  ".join(f"[{s}] '{a}'  <->  '{b}'" for s, a, b in duplicates)
    )
