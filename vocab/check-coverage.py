# /// script
# requires-python = ">=3.11"
# dependencies = ["rdflib>=7.0"]
# ///
"""Coverage check of the project vocabulary against the generated dataset.

Data flow: vocab/m3gim.ttl (vocabulary) plus data/output/m3gim.jsonld (data)
into a console report and an exit code. It checks whether every class and
property of the m3gim-ontology namespace used in the dataset is defined in the
vocabulary, whether every document type has a SKOS concept, whether every role
value references a concept and carries its display text unaltered, and whether
all skos:member and skos:broader references resolve.

Usage:
    uv run vocab/check-coverage.py [--vocab PATH] [--data PATH]

The run is read-only. It complements the term conformance lock from
tests/test_26_term_conformance.py, which exempts the own namespace because
until the vocabulary file existed there was no source to check against. A
deliberate exception is the value `nicht eingehalten`, a contract status in the
role column that the schema explicitly treats as no role term (data-model.md § 11).
"""

from __future__ import annotations

import argparse
import csv
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

# Aliases of the JSON-LD @context mapped to their qualified terms.
CONTEXT_ALIASES = {
    "name": "rico:name",
    "role": "m3gim-ontology:role",
    "composer": "m3gim-ontology:composer",
}

# Property that carries values of the role vocabulary (data-model.md § 7).
# The four earlier role properties have collapsed into this single one.
ROLE_KEYS = frozenset({"role"})

# Contract status in the role column, by schema no role term.
KNOWN_NON_ROLES = frozenset({"nicht eingehalten"})

# The dropdown value list held at the source (Typ-Rolle.csv) is the contract
# between invariant and Datenspiegel. A captured role value not in it (such as
# the truncated role "v" in NIM_005) is a data finding that
# tests/test_60_csv_source.py carries as a source error with its location. It is
# not a vocabulary gap, since the model cannot hold a term for a value the
# capture itself does not know.
TYP_ROLLE_CSV = REPO / "data" / "google-spreadsheet" / "verknuepfungen" / "Typ-Rolle.csv"

# Marker with which a skos:editorialNote excuses a permanently empty term. A
# declared term without occurrence in the dataset is either a leftover or an
# anticipation; both are allowed as long as the reason sits on the term itself
# and travels with it.
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
    """Yields every node of the JSON-LD tree, nested ones included."""
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
    """Collects properties, classes, role values, and document types from the data.

    Since the conversion a role value is a reference node to a concept, a dict
    with @id and the carried skos:prefLabel. It is returned as a whole node so
    the check can hold identifier and display text against the vocabulary. A
    string only appears where the source carries a value the vocabulary
    deliberately does not know as a concept.
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


def load_value_list(path: Path) -> set[str]:
    """Reads the allowed role values from Typ-Rolle.csv, normalized.

    Normalization as in the pipeline (`normalize_role`): lowercased, without the
    gender endings `:in`/`:innen`. If the file is missing, the set stays empty
    and the value-list distinction falls away.
    """
    if not path.exists():
        return set()
    allowed: set[str] = set()
    with path.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))
    for raw in rows[1:]:
        for cell in raw[1:]:
            value = (cell or "").strip().lower()
            for suffix in (":innen", ":in"):
                if value.endswith(suffix):
                    value = value[: -len(suffix)]
                    break
            if value:
                allowed.add(value)
    return allowed


def check_roles(
    roles: list[object],
    concepts: set[str],
    pref_labels: dict[str, str],
    value_list: set[str],
) -> tuple[list[str], list[str]]:
    """Checks each role value for a resolved concept and the right display text.

    Returns a pair (vocabulary deviations, data findings). A captured role value
    without a concept reference is a data finding if it is not in the source
    value list, otherwise a vocabulary gap. This way a truncated source value no
    longer holds the vocabulary gate red.
    """
    findings: list[str] = []
    data_findings: list[str] = []
    for value in roles:
        if isinstance(value, str):
            if value in KNOWN_NON_ROLES:
                continue
            norm = value.strip().lower()
            if value_list and norm not in value_list:
                data_findings.append(
                    f"Erfasster Rollenwert ausserhalb der Quellwertliste "
                    f"Typ-Rolle.csv: {value!r} (Quellbefund, siehe test_60)"
                )
            else:
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
    return sorted(set(findings)), sorted(set(data_findings))


def report_vacancy(
    graph: Graph, defined: set[str], used_terms: set[str], vocab_path: Path
) -> int:
    """Reports declared terms that do not occur in the dataset.

    The coverage check secures one direction, that no used term stays
    undeclared. The other direction stays blind otherwise: a term can be
    declared, never carry data, and still be dragged through model, docs, and
    frontend. An empty term is excused by a skos:editorialNote that begins with
    the marker and names the reason.
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

    value_list = load_value_list(TYP_ROLLE_CSV)
    role_findings, role_data_findings = check_roles(
        roles, concepts, pref_labels, value_list
    )

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
    findings += role_findings
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
