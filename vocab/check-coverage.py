# /// script
# requires-python = ">=3.11"
# dependencies = ["rdflib>=7.0"]
# ///
"""Abdeckungsprüfung des Projektvokabulars gegen den erzeugten Datensatz.

Datenfluss: vocab/m3gim.ttl (Vokabular) plus data/output/m3gim.jsonld (Daten)
in einen Konsolenreport und einen Exit-Code. Geprüft wird, ob jede im Datensatz
verwendete Klasse und Property des Namensraums m3gim-ontology im Vokabular
definiert ist, ob jeder Dokumenttyp ein SKOS-Concept hat, ob jeder Rollenwert
auf ein Concept verweist und dessen Anzeigetext unverfälscht mitführt und ob
alle skos:member- und skos:broader-Verweise auflösen.

Usage:
    uv run vocab/check-coverage.py [--vocab PFAD] [--data PFAD]

Der Lauf ist read-only. Er ergänzt den Term-Konformitäts-Lock aus
tests/test_26_term_conformance.py, der den eigenen Namespace ausnimmt, weil es
bis zur Vokabulardatei keine Quelle gab, gegen die er prüfen konnte. Bewusste
Ausnahme ist der Wert `nicht eingehalten`, ein Vertragsstatus in der
Rollenspalte, der im Schema ausdrücklich kein Rollenbegriff ist (data-model.md § 11).
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Iterator
from pathlib import Path

from rdflib import Graph, URIRef
from rdflib.namespace import RDF, RDFS, SKOS

REPO = Path(__file__).resolve().parent.parent
ONTOLOGY_NS = "https://dhcraft.org/m3gim/ontology#"
DATA_NS = "https://dhcraft.org/m3gim/data#"
VOCAB_NS = "https://dhcraft.org/m3gim/vocabulary#"

DFT_SCHEME = VOCAB_NS + "documentaryFormTypes"

# Aliase des JSON-LD-@context auf ihre qualifizierten Terme.
CONTEXT_ALIASES = {
    "name": "rico:name",
    "role": "m3gim-ontology:role",
    "composer": "m3gim-ontology:composer",
}

# Property, die Werte des Rollenvokabulars traegt (domain-ontology.md § 5).
# Die vier frueheren Rollenproperties sind auf diese eine zusammengefallen.
ROLE_KEYS = frozenset({"role"})

# Vertragsstatus in der Rollenspalte, im Schema begründet kein Rollenbegriff.
KNOWN_NON_ROLES = frozenset({"nicht eingehalten"})

# Marker, mit dem eine skos:editorialNote einen dauerhaft leeren Term
# entschuldigt. Ein deklarierter Term ohne Vorkommen im Datensatz ist entweder
# ein Rest oder eine Vorwegnahme; beides ist zulässig, solange der Grund am
# Term selbst steht und mit ihm wandert.
VACANCY_MARKER = "unused:"

PREFIXES = {
    "m3gim-ontology:": ONTOLOGY_NS,
    "m3gim-data:": DATA_NS,
    "m3gim-vocab:": VOCAB_NS,
}


def expand(curie: str) -> str:
    for prefix, ns in PREFIXES.items():
        if curie.startswith(prefix):
            return ns + curie[len(prefix) :]
    return curie


def walk(node: object) -> Iterator[dict]:
    """Liefert jeden Knoten des JSON-LD-Baums, verschachtelte eingeschlossen."""
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from walk(value)
    elif isinstance(node, list):
        for item in node:
            yield from walk(item)


def as_list(value: object) -> list:
    return value if isinstance(value, list) else [value]


def collect_from_data(
    path: Path,
) -> tuple[set[str], set[str], list[object], set[str]]:
    """Sammelt Properties, Klassen, Rollenwerte und Dokumenttypen aus dem Datensatz.

    Ein Rollenwert ist seit der Umstellung ein Verweisknoten auf ein Concept,
    also ein dict mit @id und dem mitgeführten skos:prefLabel. Er wird als
    ganzer Knoten zurückgegeben, damit die Prüfung Kennung und Anzeigetext
    gegen das Vokabular halten kann. Ein String tritt nur noch dort auf, wo die
    Quelle einen Wert führt, den das Vokabular bewusst nicht als Concept kennt.
    """
    with path.open(encoding="utf-8") as handle:
        doc = json.load(handle)

    properties: set[str] = set()
    classes: set[str] = set()
    roles: list[object] = []
    dft: set[str] = set()

    nodes = list(walk(doc.get("@graph", [])))
    nodes.append({k: v for k, v in doc.items() if not k.startswith("@")})

    for node in nodes:
        for type_value in as_list(node.get("@type", [])):
            if isinstance(type_value, str):
                classes.add(type_value)
        for key, value in node.items():
            if key.startswith("@"):
                continue
            properties.add(CONTEXT_ALIASES.get(key, key))
            if key in ROLE_KEYS:
                roles.extend(as_list(value))
            if key == "rico:hasDocumentaryFormType":
                dft.update(
                    item["@id"]
                    for item in as_list(value)
                    if isinstance(item, dict) and "@id" in item
                )
    return properties, classes, roles, dft


def check_roles(roles: list[object], concepts: set[str], pref_labels: dict[str, str]) -> list[str]:
    """Prüft jeden Rollenwert auf ein aufgelöstes Concept und den richtigen Anzeigetext."""
    findings: list[str] = []
    for value in roles:
        if isinstance(value, str):
            if value not in KNOWN_NON_ROLES:
                findings.append(f"Rollenwert ohne Concept-Verweis: {value}")
            continue
        if not isinstance(value, dict) or "@id" not in value:
            findings.append(f"Rollenwert ohne Kennung: {value!r}")
            continue
        iri = expand(value["@id"])
        if iri not in concepts:
            findings.append(f"Rollenkennung ohne Concept: {value['@id']}")
            continue
        carried = value.get("skos:prefLabel")
        expected = pref_labels.get(iri)
        if carried != expected:
            findings.append(
                f"Mitgeführtes Label weicht vom Vokabular ab: {value['@id']} "
                f"trägt {carried!r} statt {expected!r}"
            )
    return sorted(set(findings))


def report_vacancy(
    graph: Graph, defined: set[str], used_terms: set[str], vocab_path: Path
) -> int:
    """Meldet deklarierte Terme, die im Datensatz nicht vorkommen.

    Die Abdeckungsprüfung sichert die eine Richtung, dass kein verwendeter Term
    undeklariert bleibt. Die Gegenrichtung bleibt sonst blind: ein Term kann
    deklariert werden, nie Daten tragen und trotzdem in Modell, Doku und
    Frontend mitgeführt werden. Entschuldigt ist ein leerer Term durch eine
    skos:editorialNote, die mit dem Marker beginnt und den Grund nennt.
    """
    used_iris = {expand(term) for term in used_terms}
    excused = {
        str(subject)
        for subject, note in graph.subject_objects(SKOS.editorialNote)
        if str(note).strip().lower().startswith(VACANCY_MARKER)
    }
    vacant = sorted(
        iri
        for iri in defined
        if iri.startswith(ONTOLOGY_NS) and iri not in used_iris and iri not in excused
    )

    print(f"OK Vokabular geparst, {len(graph)} Tripel aus {vocab_path.name}")
    if vacant:
        for iri in vacant:
            print(
                f"FEHLER Deklariert, im Datensatz ohne Vorkommen und ohne Notiz: "
                f"{iri.rsplit('#', 1)[-1]}",
                file=sys.stderr,
            )
        print(f"FEHLER {len(vacant)} unbelegte Terme", file=sys.stderr)
        return 1
    print("OK Jeder deklarierte Term trägt Daten oder nennt den Grund seiner Leere")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--vocab", type=Path, default=REPO / "vocab" / "m3gim.ttl")
    parser.add_argument(
        "--data", type=Path, default=REPO / "data" / "output" / "m3gim.jsonld"
    )
    parser.add_argument(
        "--vacancy",
        action="store_true",
        help="Gegenrichtung prüfen: deklarierte Terme ohne Vorkommen im Datensatz",
    )
    args = parser.parse_args()

    for path in (args.vocab, args.data):
        if not path.exists():
            print(f"FEHLER Eingabedatei fehlt: {path}", file=sys.stderr)
            return 1

    graph = Graph()
    graph.parse(args.vocab, format="turtle")

    defined = {str(subject) for subject in graph.subjects(RDFS.isDefinedBy, None)}
    concepts = {str(subject) for subject in graph.subjects(RDF.type, SKOS.Concept)}
    dft_concepts = {
        str(subject)
        for subject in graph.subjects(SKOS.inScheme, URIRef(DFT_SCHEME))
    }
    role_concepts = concepts - dft_concepts
    pref_labels = {
        str(subject): str(label)
        for subject, label in graph.subject_objects(SKOS.prefLabel)
        if str(subject) in concepts and label.language == "de"
    }

    properties, classes, roles, dft = collect_from_data(args.data)

    if args.vacancy:
        return report_vacancy(graph, defined, properties | classes, args.vocab)

    findings: list[str] = []
    findings += [
        f"Property ohne Definition: {term}"
        for term in sorted(properties)
        if term.startswith("m3gim-ontology:") and expand(term) not in defined
    ]
    findings += [
        f"Klasse ohne Definition: {term}"
        for term in sorted(classes)
        if term.startswith("m3gim-ontology:") and expand(term) not in defined
    ]
    findings += check_roles(roles, concepts, pref_labels)
    findings += [
        f"Dokumenttyp ohne Concept: {value}"
        for value in sorted(dft)
        if expand(value) not in dft_concepts
    ]
    findings += [
        f"skos:member ohne Concept: {target}"
        for _, target in graph.subject_objects(SKOS.member)
        if str(target) not in role_concepts
    ]
    findings += [
        f"skos:broader ohne Concept: {target}"
        for _, target in graph.subject_objects(SKOS.broader)
        if str(target) not in concepts
    ]

    print(f"OK Vokabular geparst, {len(graph)} Tripel aus {args.vocab.name}")
    if findings:
        for finding in findings:
            print(f"FEHLER {finding}", file=sys.stderr)
        print(f"FEHLER {len(findings)} Abweichungen", file=sys.stderr)
        return 1
    print("OK Alle verwendeten Terme und Vokabularwerte sind im Vokabular gedeckt")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    raise SystemExit(main())
