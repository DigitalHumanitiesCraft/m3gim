"""Bezugsebene und Rang einer Datierung stehen am Begriff, nicht im Frontend.

Der Frontend-Vertrag verlangt beides (A2 Rang, A3 Bezugsebene). Bis 2026-08-22
lagen sie als zwei Handtabellen in `docs/js/data/constants.js`, waehrend der
Datensatz sie an keiner Stelle fuehrte. Damit trug die Oberflaeche eine Aussage
ueber die Daten, die in den Daten nicht stand, und jede Vokabularaenderung liess
die Tabellen still veralten.

Der stille Defekt, gegen den diese Datei steht, hat zwei Gestalten. Ein neuer
Rollenbegriff ohne Bezugsebene datiert ein Dokument entweder gar nicht oder
faelschlich, je nach Voreinstellung, ohne dass etwas meldet. Und eine Rolle, die
im Vokabular eine Ebene traegt, die es im Schema nicht gibt, faellt aus jeder
Auswertung heraus.

Lauf: pytest tests/test_52_dating_scope_and_rank.py
"""

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

VOCAB = REPO_ROOT / "vocab" / "m3gim.ttl"
SCOPE_SCHEME = "m3gim-vocab:datingScopes"
ANNOTATION_SCHEME = "m3gim-vocab:annotationRoles"

# Die Ebenen, die ein Dokument datieren duerfen (Frontend-Vertrag A4).
ANCHORING = {"m3gim-vocab:objectDating", "m3gim-vocab:attestedDating"}


@pytest.fixture(scope="module")
def role_meta():
    from _common import load_role_meta  # noqa: WPS433

    return load_role_meta(VOCAB)


@pytest.fixture(scope="module")
def concept_meta():
    from _common import load_concept_meta  # noqa: WPS433

    return load_concept_meta(VOCAB)


def test_the_scope_scheme_holds_exactly_its_five_values(concept_meta):
    scopes = {c for c, m in concept_meta.items() if m.get("scheme") == SCOPE_SCHEME}
    assert scopes == {
        "m3gim-vocab:objectDating",
        "m3gim-vocab:attestedDating",
        "m3gim-vocab:mentionedDating",
        "m3gim-vocab:framingDating",
        "m3gim-vocab:unfulfilledDating",
    }, f"Unerwartete Bezugsebenen im Schema: {sorted(scopes)}"


def test_every_declared_scope_is_a_concept_of_the_scheme(role_meta, concept_meta):
    """Ein Verweis auf eine Ebene ausserhalb des Schemas faellt aus jeder Auswertung."""
    wrong = [
        (curie, m["scope"]) for curie, m in role_meta.items()
        if m.get("scope") and concept_meta.get(m["scope"], {}).get("scheme") != SCOPE_SCHEME
    ]
    assert not wrong, f"Bezugsebene ausserhalb des Schemas: {wrong}"


def test_every_anchoring_role_carries_a_rank(role_meta):
    """Wer datieren darf, braucht einen Rang; sonst entscheidet die Zufallsreihenfolge."""
    missing = [
        curie for curie, m in role_meta.items()
        if m.get("scope") in ANCHORING and m.get("rank") is None
    ]
    assert not missing, (
        "Diese Rollen duerfen ein Dokument datieren, tragen aber keinen Rang. "
        "Traegt ein Dokument zwei davon, entscheidet die Quellreihenfolge: "
        f"{missing}"
    )


def test_ranks_are_unique(role_meta):
    """Zwei Rollen mit demselben Rang machen die Reihenfolge unbestimmt."""
    seen = {}
    clashes = []
    for curie, m in role_meta.items():
        rank = m.get("rank")
        if rank is None:
            continue
        if rank in seen:
            clashes.append((rank, seen[rank], curie))
        seen[rank] = curie
    assert not clashes, f"Doppelt vergebene Raenge: {clashes}"


def test_the_dataset_carries_both_at_the_role_concepts(graph):
    """Die erzeugten Rollenbegriffe fuehren Bezugsebene und Rang."""
    concepts = [
        n for n in graph
        if n.get("@type") == "skos:Concept"
        and _scheme_of(n) == ANNOTATION_SCHEME
    ]
    assert concepts, "Keine Rollenbegriffe im Datensatz"
    with_scope = [n for n in concepts if n.get("m3gim-ontology:datingScope")]
    assert with_scope, (
        "Kein Rollenbegriff im Datensatz traegt eine Bezugsebene; das Frontend "
        "muesste sie weiterhin selbst wissen."
    )
    with_rank = [n for n in concepts if n.get("m3gim-ontology:datingRank") is not None]
    assert with_rank, "Kein Rollenbegriff im Datensatz traegt einen Rang."


def test_the_frontend_holds_no_second_table():
    """`constants.js` fuehrt Bezugsebene und Rang nicht mehr als eigene Tabelle."""
    text = (REPO_ROOT / "docs" / "js" / "data" / "constants.js").read_text(encoding="utf-8")
    for name in ("ANNOTATION_ROLE_SCOPE", "ANNOTATION_ROLE_RANK"):
        assert f"const {name}" not in text, (
            f"{name} steht weiterhin als Handtabelle im Frontend und veraltet "
            "bei der naechsten Vokabularaenderung still."
        )


def _scheme_of(node):
    scheme = node.get("skos:inScheme")
    if isinstance(scheme, dict):
        return scheme.get("@id")
    return scheme
