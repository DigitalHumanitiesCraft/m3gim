"""Invariant: every role used in the frontend data resolves to a concept.

Assignment B1: no role reaches the frontend as a bare label. A role sits at its
usage site as an IRI with an embedded label (E-137); the explanation belongs
once at the concept (E-143). Until 2026-09-05 ``build_role_concepts`` emitted a
concept only where the vocabulary carried a definition, dating scope or rank,
so eighteen agent roles arrived in the interface as an IRI without a node.

The test reads ``docs/data/m3gim.jsonld``, the file the frontend loads, not the
pipeline output; both are held identical by test_33.
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
JSONLD_PATH = REPO_ROOT / "docs" / "data" / "m3gim.jsonld"

# Floor from the current dataset (77 distinct role IRIs on 2026-09-05); it keeps
# the test from passing on an empty or truncated graph.
MIN_ROLES_IN_USE = 70


def _graph() -> list:
    with open(JSONLD_PATH, encoding="utf-8") as f:
        return json.load(f)["@graph"]


def _roles_in_use(graph: list) -> Counter:
    """Counts every role reference by concept IRI, at any depth."""
    used: Counter = Counter()

    def walk(node):
        if isinstance(node, dict):
            role = node.get("role")
            if isinstance(role, dict) and role.get("@id"):
                used[role["@id"]] += 1
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(graph)
    return used


def test_every_used_role_has_a_labelled_concept():
    graph = _graph()
    used = _roles_in_use(graph)
    assert len(used) >= MIN_ROLES_IN_USE, (
        f"Nur {len(used)} verschiedene Rollen-IRIs im Datensatz, erwartet "
        f"mindestens {MIN_ROLES_IN_USE} — Graph unvollstaendig?"
    )

    labelled = {
        n["@id"] for n in graph
        if n.get("@type") == "skos:Concept" and n.get("skos:prefLabel")
        and n.get("@id")
    }
    missing = sorted(set(used) - labelled)
    assert not missing, (
        "Rollen ohne skos:Concept mit skos:prefLabel im selben Dokument: "
        + ", ".join(f"{i} ({used[i]}x)" for i in missing)
    )
