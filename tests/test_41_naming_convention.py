"""Naming convention of the ontology, held as a lock.

Project convention: what is declared as `owl:Class` starts with an uppercase
letter; what is declared as `owl:ObjectProperty`, `owl:DatatypeProperty` or
`skos:Concept` starts with a lowercase letter. The current state fully keeps the
convention already, the test secures it against erosion.

Read with rdflib rather than a text pattern, because the declaration in the
Turtle file usually sits on the line after the identifier and a line-wise match
does not attribute it to the subject. Anonymous class expressions
(`rdfs:domain [ a owl:Class ; owl:unionOf ( ... ) ]`) are blank nodes, carry no
name and stay outside the check.

Path override: `M3GIM_VOCAB_PATH`.
"""

import os
from pathlib import Path

import pytest
from rdflib import Graph, URIRef
from rdflib.namespace import OWL, RDF, SKOS

REPO_ROOT = Path(__file__).parent.parent
VOCAB_PATH = Path(os.environ.get("M3GIM_VOCAB_PATH", REPO_ROOT / "vocab" / "m3gim.ttl"))


@pytest.fixture(scope="module")
def vocab_graph() -> Graph:
    graph = Graph()
    graph.parse(VOCAB_PATH, format="turtle")
    return graph


def local_names(graph: Graph, declared_type) -> list[str]:
    """Local names of all named declarations of a type, blank nodes excluded."""
    names = []
    for subject in graph.subjects(RDF.type, declared_type):
        if not isinstance(subject, URIRef):
            continue
        name = str(subject).rsplit("#", 1)[-1].rsplit("/", 1)[-1]
        if name:
            names.append(name)
    return sorted(names)


def test_classes_start_uppercase(vocab_graph):
    """Every named owl:Class starts with an uppercase letter."""
    names = local_names(vocab_graph, OWL.Class)
    assert names, f"Keine benannte owl:Class in {VOCAB_PATH.name} gefunden"

    offenders = [name for name in names if not name[0].isupper()]
    assert not offenders, f"owl:Class muss gross beginnen, verletzt von: {offenders}"


def test_properties_start_lowercase(vocab_graph):
    """Every named object and datatype property starts with a lowercase letter."""
    names = sorted(
        local_names(vocab_graph, OWL.ObjectProperty)
        + local_names(vocab_graph, OWL.DatatypeProperty)
    )
    assert names, f"Keine benannte Property in {VOCAB_PATH.name} gefunden"

    offenders = [name for name in names if not name[0].islower()]
    assert not offenders, f"Property muss klein beginnen, verletzt von: {offenders}"


def test_concepts_start_lowercase(vocab_graph):
    """Every named skos:Concept starts with a lowercase letter."""
    names = local_names(vocab_graph, SKOS.Concept)
    assert names, f"Kein benanntes skos:Concept in {VOCAB_PATH.name} gefunden"

    offenders = [name for name in names if not name[0].islower()]
    assert not offenders, f"skos:Concept muss klein beginnen, verletzt von: {offenders}"