# /// script
# requires-python = ">=3.11"
# dependencies = ["rdflib>=7.0"]
# ///
"""Abdeckungsprüfung des Projektvokabulars gegen den erzeugten Datensatz.

Datenfluss: vocab/m3gim.ttl (Vokabular) plus data/output/m3gim.jsonld (Daten)
in einen Konsolenreport und einen Exit-Code. Geprüft wird, ob jede im Datensatz
verwendete Klasse und Property des m3gim-Namespace im Vokabular definiert ist,
ob jeder Dokumenttyp ein SKOS-Concept hat, ob jedes Rollenliteral auf ein
Concept trifft und ob alle skos:member- und skos:broader-Verweise auflösen.

Usage:
    uv run vocab/check-coverage.py [--vocab PFAD] [--data PFAD]

Der Lauf ist read-only. Er ergänzt den Term-Konformitäts-Lock aus
tests/test_26_term_conformance.py, der den eigenen Namespace ausnimmt, weil es
bis zur Vokabulardatei keine Quelle gab, gegen die er prüfen konnte. Bewusste
Ausnahme ist der Wert `nicht eingehalten`, ein Vertragsstatus in der
Rollenspalte, der im Schema ausdrücklich kein Rollenbegriff ist (data.md § 11).
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Iterator
from pathlib import Path

from rdflib import Graph
from rdflib.namespace import RDF, RDFS, SKOS

REPO = Path(__file__).resolve().parent.parent
VOCAB_NS = "https://dhcraft.org/m3gim/vocab#"
ROLE_NS = "https://dhcraft.org/m3gim/roles#"
DFT_NS = "https://dhcraft.org/m3gim/documentaryFormTypes#"

# Aliase des JSON-LD-@context auf ihre qualifizierten Terme.
CONTEXT_ALIASES = {
    "name": "rico:name",
    "role": "m3gim:role",
    "komponist": "m3gim:komponist",
}

# Properties, die Werte des Rollenvokabulars tragen (domain.md § 5).
ROLE_KEYS = frozenset({"role", "m3gim:eventRole", "m3gim:dateRole", "m3gim:detailRole"})

# Vertragsstatus in der Rollenspalte, im Schema begründet kein Rollenbegriff.
KNOWN_NON_ROLES = frozenset({"nicht eingehalten"})

PREFIXES = {"m3gim:": VOCAB_NS, "m3gim-role:": ROLE_NS, "m3gim-dft:": DFT_NS}


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


def collect_from_data(path: Path) -> tuple[set[str], set[str], set[str], set[str]]:
    """Sammelt Properties, Klassen, Rollenliterale und Dokumenttypen aus dem Datensatz."""
    with path.open(encoding="utf-8") as handle:
        doc = json.load(handle)

    properties: set[str] = set()
    classes: set[str] = set()
    roles: set[str] = set()
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
                roles.update(item for item in as_list(value) if isinstance(item, str))
            if key == "rico:hasDocumentaryFormType":
                dft.update(
                    item["@id"]
                    for item in as_list(value)
                    if isinstance(item, dict) and "@id" in item
                )
    return properties, classes, roles, dft


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--vocab", type=Path, default=REPO / "vocab" / "m3gim.ttl")
    parser.add_argument(
        "--data", type=Path, default=REPO / "data" / "output" / "m3gim.jsonld"
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
    role_concepts = {iri for iri in concepts if iri.startswith(ROLE_NS)}
    labels = {
        str(label)
        for predicate in (SKOS.prefLabel, SKOS.altLabel)
        for subject, label in graph.subject_objects(predicate)
        if str(subject) in role_concepts
    }

    properties, classes, roles, dft = collect_from_data(args.data)

    findings: list[str] = []
    findings += [
        f"Property ohne Definition: {term}"
        for term in sorted(properties)
        if term.startswith("m3gim:") and expand(term) not in defined
    ]
    findings += [
        f"Klasse ohne Definition: {term}"
        for term in sorted(classes)
        if term.startswith("m3gim:") and expand(term) not in defined
    ]
    findings += [
        f"Rollenliteral ohne Concept: {value}"
        for value in sorted(roles)
        if value not in labels and value not in KNOWN_NON_ROLES
    ]
    findings += [
        f"Dokumenttyp ohne Concept: {value}"
        for value in sorted(dft)
        if expand(value) not in concepts
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
