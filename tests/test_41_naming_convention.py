"""Namenskonvention der Ontologie, festgehalten als Lock.

Konvention der Projektleitung: was als `owl:Class` deklariert ist, beginnt mit
einem Grossbuchstaben; was als `owl:ObjectProperty`, `owl:DatatypeProperty` oder
`skos:Concept` deklariert ist, beginnt mit einem Kleinbuchstaben. Der Stand
haelt die Konvention bereits vollstaendig ein, der Test sichert sie gegen
Erosion.

Gelesen wird mit rdflib statt mit einem Textmuster, weil die Deklaration in der
Turtle-Datei ueblicherweise in der Zeile nach dem Bezeichner steht und ein
zeilenweiser Abgleich sie dem Subjekt nicht zuordnet. Anonyme Klassenausdruecke
(`rdfs:domain [ a owl:Class ; owl:unionOf ( ... ) ]`) sind Blank Nodes, tragen
keinen Namen und bleiben ausserhalb der Pruefung.

Pfad-Override: `M3GIM_VOCAB_PATH`.
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
    """Lokale Namen aller benannten Deklarationen eines Typs, Blank Nodes ausgenommen."""
    names = []
    for subject in graph.subjects(RDF.type, declared_type):
        if not isinstance(subject, URIRef):
            continue
        name = str(subject).rsplit("#", 1)[-1].rsplit("/", 1)[-1]
        if name:
            names.append(name)
    return sorted(names)


def test_classes_start_uppercase(vocab_graph):
    """Jede benannte owl:Class beginnt mit einem Grossbuchstaben."""
    names = local_names(vocab_graph, OWL.Class)
    assert names, f"Keine benannte owl:Class in {VOCAB_PATH.name} gefunden"

    offenders = [name for name in names if not name[0].isupper()]
    assert not offenders, f"owl:Class muss gross beginnen, verletzt von: {offenders}"


def test_properties_start_lowercase(vocab_graph):
    """Jede benannte Object- und Datatype-Property beginnt mit einem Kleinbuchstaben."""
    names = sorted(
        local_names(vocab_graph, OWL.ObjectProperty)
        + local_names(vocab_graph, OWL.DatatypeProperty)
    )
    assert names, f"Keine benannte Property in {VOCAB_PATH.name} gefunden"

    offenders = [name for name in names if not name[0].islower()]
    assert not offenders, f"Property muss klein beginnen, verletzt von: {offenders}"


def test_concepts_start_lowercase(vocab_graph):
    """Jedes benannte skos:Concept beginnt mit einem Kleinbuchstaben."""
    names = local_names(vocab_graph, SKOS.Concept)
    assert names, f"Kein benanntes skos:Concept in {VOCAB_PATH.name} gefunden"

    offenders = [name for name in names if not name[0].islower()]
    assert not offenders, f"skos:Concept muss klein beginnen, verletzt von: {offenders}"