"""Komponisten-Schreibweise-Varianten im Werkindex (Session 38).

Der Statistik-Tab listet Komponisten aus dem Werkindex als Top-N. Ein Tippfehler
im Quell-XLSX fuehrt dazu, dass derselbe Komponist unter zwei Roh-Strings
auftaucht (z.B. "Beethoven, Ludwig van" vs. "Beethoven, Ludwig von") und in
der Top-10-Liste doppelt erscheint.

Regel aus ``knowledge/data.md § 17`` (Documents as Source of Truth,
"Pipeline-Workarounds sind Schulden, nicht Features"): Schreibfehler gehoeren
an der Quelle gefixt. Die Pipeline bekommt dafuer **keinen** Sonderfall-
Normalisierer (kein ``normalize_composer``), weil das kuenftige Tippfehler
stillschweigend zukleistern wuerde.

Stattdessen detektiert dieser Test Fuzzy-aehnliche Komponistennamen und bleibt
``xfail(strict=True)``, solange solche Paare existieren. Nach XLSX-Fix wird der
Test ``XPASS`` → strict bricht die Suite → xfail-Marker entfernen, Eintrag in
data.md § 17 streichen.

Schwelle: Levenshtein-Ratio >= 92. Beethoven van/von liegt typischerweise bei
96. Mozart vs. Brahms bei ~20. Die Schwelle trifft Tippfehler und echte
Varianten, nicht legitim aehnliche Namen.
"""

from __future__ import annotations

import pytest


def _iter_works(graph: list) -> list:
    """Gibt alle Roh-Komponistennamen aus m3gim:MusicalWork-Subjects zurueck."""
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
            if subj.get("@type") != "m3gim:MusicalWork":
                continue
            komponist = (subj.get("komponist") or "").strip()
            if komponist:
                out.append(komponist)
    return out


@pytest.mark.xfail(
    reason="data.md § 17 — Beethoven 'van/von' im Werkindex. Fix durch Archiv-Team.",
    strict=True,
)
def test_komponisten_ohne_fuzzy_duplikate(graph):
    """Keine zwei Komponisten-Rohstrings duerfen fuzzy-aehnlich (>= 92) sein."""
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
