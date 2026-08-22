"""Die ausgelieferte Datenmodell-Seite gegen das Vokabular.

`docs/datenmodell.html` ist erzeugt und nicht geschrieben. Eine von Hand
gepflegte Modellseite driftet gegen `vocab/m3gim.ttl`, sobald das Vokabular
sich bewegt; eine erzeugte kann es nicht, solange dieser Test die Erzeugung
nachvollzieht.

Der Test laesst `scripts/build-model-page.py` erneut laufen und vergleicht sein
Ergebnis Zeichen fuer Zeichen mit der eingecheckten Datei. Faellt er, ist die
Seite veraltet und mit einem Lauf des Generators wieder in Deckung zu bringen.
Die uebrigen Faelle sichern, dass ein leerer oder verkuerzter Generator nicht
trivial besteht: jede Klasse, jede Property, jedes Scheme und jeder Begriff des
Vokabulars muss auf der Seite vorkommen, und die Zeichnung muss deterministisch
und ohne Laufzeitbibliothek entstehen.
"""

import importlib.util
import os
import re
import sys
from pathlib import Path

import pytest
from rdflib import Graph
from rdflib.namespace import OWL, RDF, SKOS

REPO_ROOT = Path(__file__).parent.parent
GENERATOR = REPO_ROOT / "scripts" / "build-model-page.py"
PAGE = REPO_ROOT / "docs" / "datenmodell.html"
VOCAB = Path(os.environ.get("M3GIM_VOCAB_PATH", REPO_ROOT / "vocab" / "m3gim.ttl"))
DATA = Path(os.environ.get("M3GIM_JSONLD_PATH", REPO_ROOT / "data" / "output" / "m3gim.jsonld"))

ONTOLOGY_NS = "https://dhcraft.org/m3gim/ontology#"
VOCAB_NS = "https://dhcraft.org/m3gim/vocabulary#"


def _load_generator():
    spec = importlib.util.spec_from_file_location("build_model_page", GENERATOR)
    module = importlib.util.module_from_spec(spec)
    sys.modules["build_model_page"] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def generator():
    assert GENERATOR.exists(), f"Generator fehlt: {GENERATOR}"
    return _load_generator()


@pytest.fixture(scope="module")
def rendered(generator) -> str:
    return generator.render_page(VOCAB, DATA)


@pytest.fixture(scope="module")
def shipped() -> str:
    assert PAGE.exists(), f"Seite fehlt: {PAGE}"
    return PAGE.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def vocab_graph() -> Graph:
    graph = Graph()
    graph.parse(VOCAB, format="turtle")
    return graph


def _curies(graph: Graph, rdf_type, namespace: str) -> list[str]:
    prefix = "m3gim-ontology:" if namespace == ONTOLOGY_NS else "m3gim-vocab:"
    return sorted(
        prefix + str(subject).split("#", 1)[1]
        for subject in graph.subjects(RDF.type, rdf_type)
        if str(subject).startswith(namespace)
    )


# ---------------------------------------------------------------------------
# Das Gate: ausgelieferte Seite gegen erneuten Lauf des Generators
# ---------------------------------------------------------------------------


def test_shipped_page_matches_generator_output(rendered, shipped):
    """Die eingecheckte Seite ist das, was der Generator aus dem Vokabular baut."""
    if rendered != shipped:
        first = next(
            (i for i, (a, b) in enumerate(zip(rendered, shipped)) if a != b),
            min(len(rendered), len(shipped)),
        )
        context = slice(max(0, first - 120), first + 120)
        pytest.fail(
            "docs/datenmodell.html weicht vom Vokabular ab. "
            "`python scripts/build-model-page.py` erneut laufen lassen.\n"
            f"Erste Abweichung an Position {first}\n"
            f"erzeugt:      ...{rendered[context]}...\n"
            f"ausgeliefert: ...{shipped[context]}..."
        )


def test_generator_is_deterministic(generator):
    """Zwei Laeufe ergeben zeichengleich dasselbe."""
    assert generator.render_page(VOCAB, DATA) == generator.render_page(VOCAB, DATA)


# ---------------------------------------------------------------------------
# Vollstaendigkeit: nichts aus dem Vokabular faellt unterwegs heraus
# ---------------------------------------------------------------------------


def test_every_class_reaches_the_page(shipped, vocab_graph):
    classes = _curies(vocab_graph, OWL.Class, ONTOLOGY_NS)
    assert len(classes) >= 5, "Klassenliste unplausibel klein"
    missing = [curie for curie in classes if curie not in shipped]
    assert not missing, f"Klassen fehlen auf der Seite: {missing}"


def test_every_property_reaches_the_page(shipped, vocab_graph):
    properties = _curies(vocab_graph, OWL.ObjectProperty, ONTOLOGY_NS)
    properties += _curies(vocab_graph, OWL.DatatypeProperty, ONTOLOGY_NS)
    assert len(properties) >= 30, "Propertyliste unplausibel klein"
    missing = [curie for curie in properties if curie not in shipped]
    assert not missing, f"Properties fehlen auf der Seite: {missing}"


def test_every_scheme_and_collection_reaches_the_page(shipped, vocab_graph):
    schemes = _curies(vocab_graph, SKOS.ConceptScheme, VOCAB_NS)
    collections = _curies(vocab_graph, SKOS.Collection, VOCAB_NS)
    assert len(schemes) >= 5 and len(collections) >= 5, "Vokabularlisten unplausibel klein"
    missing = [curie for curie in schemes + collections if curie not in shipped]
    assert not missing, f"Schemes oder Collections fehlen auf der Seite: {missing}"


def test_every_concept_reaches_the_page(shipped, vocab_graph):
    concepts = _curies(vocab_graph, SKOS.Concept, VOCAB_NS)
    assert len(concepts) >= 100, "Begriffsliste unplausibel klein"
    missing = [curie for curie in concepts if curie not in shipped]
    assert not missing, f"Begriffe fehlen auf der Seite: {missing}"


def test_definitions_reach_the_page(shipped, vocab_graph):
    """Die Definitionen stehen im Wortlaut des Vokabulars auf der Seite."""
    definitions = [
        str(value)
        for value in vocab_graph.objects(None, SKOS.definition)
        if value.language == "de"
    ]
    assert len(definitions) >= 50, "Definitionsliste unplausibel klein"
    escaped = shipped.replace("&quot;", '"').replace("&#x27;", "'").replace("&amp;", "&")
    missing = [text for text in definitions if text not in escaped]
    assert not missing, f"Definitionen fehlen auf der Seite: {missing[:3]}"


def test_documentary_form_hierarchy_is_indented(shipped, vocab_graph):
    """Die Dokumenttypen stehen eingerueckt nach skos:broader, nicht flach."""
    depth = max(
        _broader_depth(vocab_graph, subject)
        for subject in vocab_graph.subjects(SKOS.broader, None)
    )
    assert depth >= 2, "Keine mehrstufige skos:broader-Kette im Vokabular"
    assert 'class="dft-tree"' in shipped, "Kein Baum fuer die Dokumenttypen"
    tree = shipped.split('<ul class="dft-tree">', 1)[1]
    assert tree.count("<ul") >= depth - 1, "Der Baum ist nicht so tief wie das Vokabular"


def _broader_depth(graph: Graph, subject) -> int:
    parents = list(graph.objects(subject, SKOS.broader))
    return 1 + max((_broader_depth(graph, parent) for parent in parents), default=0)


# ---------------------------------------------------------------------------
# Zeichnung und Seitenkoerper
# ---------------------------------------------------------------------------


def test_drawing_is_embedded_svg_without_runtime_library(shipped):
    """Die Zeichnung liegt als SVG in der Seite und braucht kein Skript."""
    assert shipped.count("<svg") == 1, "Keine oder mehr als eine Zeichnung auf der Seite"
    assert "<script" not in shipped, "Die Seite laedt oder fuehrt Code aus"
    assert 'href="css/' in shipped, "Die Seite bindet die Stylesheets der Anwendung nicht ein"


def test_drawing_shows_classes_as_nodes_and_object_properties_as_edges(shipped, vocab_graph):
    drawing = shipped.split('<svg', 1)[1].split("</svg>", 1)[0]
    object_properties = _curies(vocab_graph, OWL.ObjectProperty, ONTOLOGY_NS)
    drawn = [c.split(":", 1)[1] for c in object_properties if c.split(":", 1)[1] in drawing]
    assert len(drawn) >= 5, f"Zu wenige Object Properties in der Zeichnung: {drawn}"
    for local in ("Performance", "Annotation", "StageRole"):
        assert local in drawing, f"Klasse {local} fehlt in der Zeichnung"


def test_wide_content_scrolls_in_its_own_container(shipped):
    """Tabellen und Zeichnung sitzen in einem eigenen Scroll-Container."""
    for match in re.finditer(r"<(table|svg)\b", shipped):
        before = shipped[: match.start()]
        opened = before.rfind('<div class="page__wide">')
        closed = before.rfind("</div><!--/wide-->")
        assert opened > closed, (
            f"{match.group(1)} ohne page__wide-Container an Position {match.start()}"
        )
