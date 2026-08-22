"""Der Vokabular-Leser der Pipeline gegen einen echten Turtle-Parser.

Die Pipeline braucht zur Laufzeit die Abbildung eines erfassten Rollenwerts auf
sein Concept im Vokabular. Die Quelle dieser Abbildung ist `vocab/m3gim.ttl`,
das in der Spec-Hierarchie ueber der Pipeline steht (E-133). rdflib steht nur
in `requirements-test.txt`; ein Import in `scripts/transform.py` wuerde die
Laufzeitumgebung um eine Abhaengigkeit erweitern, die sie heute nicht hat.
Deshalb liest die Pipeline die Datei mit einem eigenen, engen Leser.

Dieser Test ist das Gate dagegen, dass der eigene Leser vom Vokabular abweicht.
Er baut dieselbe Abbildung ein zweites Mal mit rdflib und vergleicht beide
Ergebnisse Eintrag fuer Eintrag. Faellt er, ist entweder der Leser zu eng oder
das Vokabular hat eine Form angenommen, die er nicht kennt.
"""

import os
import sys
from pathlib import Path

import pytest
from rdflib import Graph, URIRef
from rdflib.namespace import RDF, SKOS

REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from _common import load_role_concepts  # noqa: E402

VOCAB_PATH = Path(os.environ.get("M3GIM_VOCAB_PATH", REPO_ROOT / "vocab" / "m3gim.ttl"))
VOCAB_NS = "https://dhcraft.org/m3gim/vocabulary#"
DFT_SCHEME = URIRef(VOCAB_NS + "documentaryFormTypes")


def _reference_mapping(path: Path) -> dict[str, tuple[str, str]]:
    """Dieselbe Abbildung, mit rdflib gebaut: deutsches Label -> (CURIE, prefLabel)."""
    graph = Graph()
    graph.parse(path, format="turtle")
    dft = set(graph.subjects(SKOS.inScheme, DFT_SCHEME))
    mapping: dict[str, tuple[str, str]] = {}
    for subject in graph.subjects(RDF.type, SKOS.Concept):
        if subject in dft:
            continue
        pref = [
            str(label)
            for label in graph.objects(subject, SKOS.prefLabel)
            if label.language == "de"
        ]
        if not pref:
            continue
        curie = "m3gim-vocab:" + str(subject).split("#", 1)[1]
        labels = list(pref) + [
            str(label)
            for label in graph.objects(subject, SKOS.altLabel)
            if label.language == "de"
        ]
        for label in labels:
            mapping[label] = (curie, pref[0])
    return mapping


@pytest.fixture(scope="module")
def reference() -> dict[str, tuple[str, str]]:
    return _reference_mapping(VOCAB_PATH)


@pytest.fixture(scope="module")
def parsed() -> dict[str, tuple[str, str]]:
    return load_role_concepts(VOCAB_PATH)


def test_reader_finds_every_role_label(parsed, reference):
    """Kein Rollenbegriff des Vokabulars bleibt dem Leser verborgen."""
    assert len(reference) > 50, "Referenzabbildung unplausibel klein"
    missing = sorted(set(reference) - set(parsed))
    assert not missing, f"Vom Leser nicht gefundene Labels: {missing}"


def test_reader_invents_no_label(parsed, reference):
    """Der Leser fuegt nichts hinzu, was das Vokabular nicht fuehrt."""
    extra = sorted(set(parsed) - set(reference))
    assert not extra, f"Vom Leser erfundene Labels: {extra}"


def test_reader_resolves_to_the_same_concept(parsed, reference):
    """Kennung und Anzeigetext stimmen Eintrag fuer Eintrag ueberein."""
    divergent = {
        label: (parsed[label], reference[label])
        for label in sorted(reference)
        if label in parsed and parsed[label] != reference[label]
    }
    assert not divergent, f"Abweichende Aufloesung: {divergent}"


def test_documentary_form_types_stay_out(parsed):
    """Dokumenttypen sind keine Rollen und gehoeren nicht in die Abbildung.

    Ohne die Trennung kollidierten Anzeigetexte wie Kritik oder Sammlung mit
    Rollenwerten, und eine Rolle loeste auf einen Dokumenttyp auf.
    """
    assert "Quittung" not in parsed
    assert "Konvolut" not in parsed


def test_merged_labels_keep_the_canonical_display_text(parsed):
    """Ein aufgegangener Begriff traegt den Anzeigetext des aufnehmenden.

    Das ist die Stelle, an der die Zusammenfuehrung sichtbar wird: der erfasste
    Wert auftritt loest auf dasselbe Concept auf wie auffuehrung und bekommt
    dessen prefLabel, waehrend der Ursprungswert an anderer Stelle erhalten
    bleibt.
    """
    assert parsed["auftritt"] == parsed["aufführung"]
    assert parsed["auftritt"][1] == "aufführung"
    assert parsed["erstelldatum"] == parsed["entstehung"]
    assert parsed["entstehungsort"][1] == "entstehung"
