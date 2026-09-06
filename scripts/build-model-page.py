# /// script
# requires-python = ">=3.11"
# dependencies = ["rdflib>=7.0"]
# ///
"""Erzeugt die Datenmodell-Seite der Anwendung aus dem Projektvokabular.

Datenfluss: vocab/m3gim.ttl (Vokabular) plus data/output/m3gim.jsonld (Datensatz)
nach docs/datenmodell.html. Kein Term steht im Generator; alles, was die Seite
zeigt, ist aus dem Vokabular gelesen. Der Datensatz wird nur befragt, welche
externen Namensraeume in ihm tatsaechlich vorkommen.

Usage:
    python scripts/build-model-page.py [--vocab PFAD] [--data PFAD] [--out PFAD]

Der Lauf ist deterministisch: keine Zeitstempel, keine ungeordneten Mengen,
keine zufaellige Reihenfolge. Zweimal laufen ergibt zeichengleich dasselbe.
Die Reihenfolge der Terme ist die Deklarationsreihenfolge des Vokabulars, die
Gruppierung der Datatype Properties dessen eigene Abschnittsgliederung.

Die Netzwerkzeichnung entsteht als SVG im Generator, ohne Laufzeitbibliothek
und ohne Kraeftesimulation (Leitplanke Determinismus vor Schoenheit,
knowledge/design.md). Die Klassen sind nach ihrem Abstand von den Klassen ohne
eingehende Kante in Spalten geschichtet; jede Object Property laeuft damit von
links nach rechts.

Das Gate gegen eine veraltete Seite ist tests/test_48_model_page.py: der Test
laesst diesen Generator erneut laufen und vergleicht mit der eingecheckten Datei.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from rdflib import Graph, URIRef
from rdflib.collection import Collection
from rdflib.namespace import DCTERMS, OWL, RDF, RDFS, SKOS

REPO = Path(__file__).resolve().parent.parent
DEFAULT_VOCAB = REPO / "vocab" / "m3gim.ttl"
DEFAULT_DATA = REPO / "data" / "output" / "m3gim.jsonld"
DEFAULT_OUT = REPO / "docs" / "datenmodell.html"

# Bezeichnung fuer einen Namensraum, dessen CURIEs im Datensatz Knoten mit
# eigenem Inhalt benennen und an keiner Stelle als Property oder Typ stehen. Sie
# identifizieren einzelne Entitaeten und sind keine Terme des Modells, weshalb
# sie nicht aufgezaehlt werden.
IDENTIFIER_USE = "Identifikatoren einzelner Entitäten"


# ---------------------------------------------------------------------------
# Vokabular als Text: Praefixe, Abschnitte, Deklarationsreihenfolge
# ---------------------------------------------------------------------------

PREFIX_RE = re.compile(r"^@prefix\s+([\w-]*):\s+<([^>]+)>\s*\.", re.MULTILINE)
SUBJECT_RE = re.compile(r"^([A-Za-z][\w.-]*:[\w-]+)")
RULE_RE = re.compile(r"^#\s-{10,}\s*$")


@dataclass
class Section:
    """Ein mit Kommentarlinie ueberschriebener Abschnitt der Vokabulardatei."""

    title: str
    notes: list[str] = field(default_factory=list)
    terms: list[str] = field(default_factory=list)

    @property
    def kind(self) -> str:
        return self.title.split(",", 1)[0].strip()

    @property
    def group(self) -> str:
        """Der Teil hinter dem Komma, also der Name der Sachgruppe."""
        head, _, tail = self.title.partition(",")
        return tail.strip() if tail else head.strip()


def parse_prefixes(text: str) -> dict[str, str]:
    return {prefix: iri for prefix, iri in PREFIX_RE.findall(text)}


def parse_preamble(text: str) -> list[str]:
    """Die Kommentarabsaetze vor der ersten Praefixzeile, in Quellreihenfolge."""
    paragraphs: list[str] = []
    current: list[str] = []
    for line in text.splitlines():
        if not line.startswith("#"):
            break
        body = line[1:].strip()
        if body:
            current.append(body)
        elif current:
            paragraphs.append(" ".join(current))
            current = []
    if current:
        paragraphs.append(" ".join(current))
    return paragraphs


def parse_sections(text: str) -> list[Section]:
    """Abschnitte der Datei mit Titel, Anmerkung und den in ihnen deklarierten Termen.

    Ein Abschnitt beginnt mit einer Trennlinie, traegt seinen Titel in der
    naechsten Kommentarzeile und danach eine zweite Trennlinie. Was zwischen der
    zweiten Trennlinie und dem ersten Term noch als Kommentar steht, ist die
    Anmerkung des Abschnitts.
    """
    sections: list[Section] = []
    lines = text.splitlines()
    index = 0
    seen: set[str] = set()
    while index < len(lines):
        line = lines[index]
        if RULE_RE.match(line) and index + 2 < len(lines) and RULE_RE.match(lines[index + 2]):
            sections.append(Section(title=lines[index + 1].lstrip("#").strip()))
            index += 3
            note: list[str] = []
            while index < len(lines) and lines[index].startswith("#"):
                body = lines[index][1:].strip()
                if body:
                    note.append(body)
                elif note:
                    sections[-1].notes.append(" ".join(note))
                    note = []
                index += 1
            if note:
                sections[-1].notes.append(" ".join(note))
            continue
        match = SUBJECT_RE.match(line)
        if match and sections and match.group(1) not in seen:
            seen.add(match.group(1))
            sections[-1].terms.append(match.group(1))
        index += 1
    return sections


# ---------------------------------------------------------------------------
# Vokabular als Graph
# ---------------------------------------------------------------------------


@dataclass
class Term:
    curie: str
    label_de: list[str]
    label_en: list[str]
    definition: str | None
    notes: list[str]
    facets: list[tuple[str, list[str]]] = field(default_factory=list)
    alt_de: list[str] = field(default_factory=list)


class Vocabulary:
    """Lesesicht auf vocab/m3gim.ttl, Text und Graph zusammen."""

    def __init__(self, path: Path):
        self.text = path.read_text(encoding="utf-8")
        self.prefixes = parse_prefixes(self.text)
        self.preamble = parse_preamble(self.text)
        self.sections = parse_sections(self.text)
        self.graph = Graph()
        self.graph.parse(path, format="turtle")
        self.ontology = self._ontology_iri()
        self.base = self.ontology.rsplit("/", 1)[0] + "/"
        self.own_prefixes = {
            prefix: iri for prefix, iri in self.prefixes.items() if iri.startswith(self.base)
        }

    # -- Aufloesung ---------------------------------------------------------

    def _ontology_iri(self) -> str:
        for subject in self.graph.subjects(RDF.type, OWL.Ontology):
            return str(subject)
        raise RuntimeError("Kein owl:Ontology-Knoten im Vokabular")

    def curie(self, iri: str) -> str:
        best = ""
        result = iri
        for prefix, namespace in self.prefixes.items():
            if iri.startswith(namespace) and len(namespace) > len(best):
                best = namespace
                result = f"{prefix}:{iri[len(namespace):]}"
        return result

    def uri(self, curie: str) -> URIRef:
        prefix, _, local = curie.partition(":")
        return URIRef(self.prefixes[prefix] + local)

    # -- Literale -----------------------------------------------------------

    def _order(self, value: str) -> tuple[int, int, str]:
        position = self.text.find(value)
        return (0 if position >= 0 else 1, position, value)

    def literals(self, subject: URIRef, predicate: URIRef, language: str) -> list[str]:
        values = [
            str(value)
            for value in self.graph.objects(subject, predicate)
            if getattr(value, "language", None) == language
        ]
        return sorted(values, key=self._order)

    def literal(self, subject: URIRef, predicate: URIRef, language: str) -> str | None:
        values = self.literals(subject, predicate, language)
        return values[0] if values else None

    # -- Referenzen ---------------------------------------------------------

    def references(self, subject: URIRef, predicate: URIRef) -> list[str]:
        """Objekte einer Kante als CURIE, Vereinigungsklassen in Listenreihenfolge."""
        result: list[str] = []
        for obj in self.graph.objects(subject, predicate):
            if isinstance(obj, URIRef):
                result.append(self.curie(str(obj)))
                continue
            for union in self.graph.objects(obj, OWL.unionOf):
                for member in Collection(self.graph, union):
                    result.append(self.curie(str(member)))
        return result

    # -- Terme --------------------------------------------------------------

    def section_of(self, curie: str) -> Section | None:
        for section in self.sections:
            if curie in section.terms:
                return section
        return None

    def sections_of_kind(self, kind: str) -> list[Section]:
        return [section for section in self.sections if section.kind == kind]

    def term(self, curie: str, facet_specs: list[tuple[str, URIRef]]) -> Term:
        subject = self.uri(curie)
        facets: list[tuple[str, list[str]]] = []
        for name, predicate in facet_specs:
            values = self.references(subject, predicate)
            if values:
                facets.append((name, values))
        return Term(
            curie=curie,
            label_de=self.literals(subject, RDFS.label, "de"),
            label_en=self.literals(subject, RDFS.label, "en"),
            definition=self.literal(subject, RDFS.comment, "de"),
            notes=self.literals(subject, SKOS.editorialNote, "de"),
            facets=facets,
        )

    def concept(self, curie: str) -> Term:
        subject = self.uri(curie)
        return Term(
            curie=curie,
            label_de=self.literals(subject, SKOS.prefLabel, "de"),
            label_en=self.literals(subject, SKOS.altLabel, "en"),
            definition=self.literal(subject, SKOS.definition, "de"),
            notes=self.literals(subject, SKOS.editorialNote, "de"),
            alt_de=self.literals(subject, SKOS.altLabel, "de"),
        )

    def declared(self, rdf_type: URIRef, namespace_prefix: str) -> list[str]:
        """Alle Terme eines Typs in Deklarationsreihenfolge der Datei."""
        declared = {
            self.curie(str(subject))
            for subject in self.graph.subjects(RDF.type, rdf_type)
            if str(subject).startswith(self.prefixes[namespace_prefix])
        }
        ordered = [
            curie
            for section in self.sections
            for curie in section.terms
            if curie in declared
        ]
        remainder = sorted(declared - set(ordered))
        return ordered + remainder


# ---------------------------------------------------------------------------
# Datensatz: welche externen Namensraeume vorkommen
# ---------------------------------------------------------------------------


def dataset_usage(path: Path) -> tuple[dict[str, str], dict[str, set[str]], set[str]]:
    """Praefixe des Datensatzes, belegte CURIEs je Praefix, Praefixe als Identifikator.

    Ein CURIE steht an einer von drei Stellen. Als Schluessel oder als Typ
    benennt er einen Term des Modells. Als nackte Referenz benennt er einen Wert
    aus einem kontrollierten Vokabular. Als Kennung eines Knotens, der weitere
    Angaben traegt, benennt er eine einzelne Entitaet. Ein Praefix, dessen CURIEs
    nur an der dritten Stelle stehen, fuehrt Identifikatoren und keine Terme;
    seine Werte werden nicht aufgezaehlt.
    """
    document = json.loads(path.read_text(encoding="utf-8"))
    context = document.get("@context", {})
    prefixes = {
        key: value
        for key, value in context.items()
        if isinstance(value, str) and value.endswith(("#", "/"))
    }
    used: dict[str, set[str]] = {}
    as_term: set[str] = set()
    as_identity: set[str] = set()

    def note(curie: str, position: str) -> None:
        prefix, separator, _ = curie.partition(":")
        if not separator or prefix not in prefixes:
            return
        used.setdefault(prefix, set()).add(curie)
        if position == "term":
            as_term.add(prefix)
        elif position == "identity":
            as_identity.add(prefix)

    def walk(node) -> None:
        if isinstance(node, dict):
            carries_content = any(key != "@id" for key in node)
            for key, value in node.items():
                if not key.startswith("@"):
                    note(key, "term")
                if key == "@type":
                    for item in value if isinstance(value, list) else [value]:
                        if isinstance(item, str):
                            note(item, "term")
                if key == "@id" and isinstance(value, str):
                    note(value, "identity" if carries_content else "reference")
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(document.get("@graph", []))
    for key, value in document.items():
        if not key.startswith("@"):
            note(key, "term")
            walk(value)
    identifiers = as_identity - as_term
    return prefixes, used, identifiers


def external_namespaces(vocab: Vocabulary, data: Path) -> list[dict]:
    """Externe Namensraeume mit den Termen, die Vokabular und Datensatz belegen."""
    prefixes, used, identifiers = dataset_usage(data)
    namespaces = dict(prefixes)
    namespaces.update(vocab.prefixes)

    # Anschlusskanten des Vokabulars: Oberklasse, Oberproperty, Domain, Range.
    for predicate in (RDFS.subClassOf, RDFS.subPropertyOf, RDFS.domain, RDFS.range):
        for subject in set(vocab.graph.subjects(predicate, None)):
            for curie in vocab.references(subject, predicate):
                prefix, separator, _ = curie.partition(":")
                if separator and prefix in namespaces:
                    used.setdefault(prefix, set()).add(curie)

    rows = []
    for prefix in sorted(used):
        iri = namespaces[prefix]
        if iri.startswith(vocab.base):
            continue
        rows.append(
            {
                "prefix": prefix,
                "iri": iri,
                "terms": [] if prefix in identifiers else sorted(used[prefix]),
                "identifier": prefix in identifiers,
            }
        )
    return rows


# ---------------------------------------------------------------------------
# Zeichnung: Klassen als Knoten, Object Properties als beschriftete Kanten
# ---------------------------------------------------------------------------

NODE_W = 138
NODE_H = 46
COL_GAP = 140
ROW_GAP = 88
MARGIN = 28


@dataclass
class Edge:
    source: str
    target: str
    label: str


def build_edges(vocab: Vocabulary, properties: list[str]) -> tuple[list[Edge], list[str]]:
    """Kanten aus Domain und Range; Properties ohne beides bleiben ungezeichnet."""
    edges: list[Edge] = []
    undrawn: list[str] = []
    for curie in properties:
        subject = vocab.uri(curie)
        domains = vocab.references(subject, RDFS.domain)
        ranges = vocab.references(subject, RDFS.range)
        if not domains or not ranges:
            undrawn.append(curie)
            continue
        for domain in domains:
            for target in ranges:
                edges.append(Edge(domain, target, curie.split(":", 1)[1]))
    return edges, undrawn


def rank_nodes(nodes: list[str], edges: list[Edge]) -> dict[str, int]:
    """Laengster Weg von den Klassen ohne eingehende Kante, iterativ und stabil."""
    incoming: dict[str, list[str]] = {node: [] for node in nodes}
    for edge in edges:
        if edge.source != edge.target:
            incoming[edge.target].append(edge.source)
    rank = {node: 0 for node in nodes}
    for _ in range(len(nodes)):
        changed = False
        for node in nodes:
            candidate = max((rank[pred] + 1 for pred in incoming[node]), default=0)
            if candidate > rank[node]:
                rank[node] = candidate
                changed = True
        if not changed:
            break
    return rank


def layout(
    nodes: list[str], edges: list[Edge], rank: dict[str, int]
) -> dict[str, tuple[float, float]]:
    """Spalten nach Rang, Reihenfolge in der Spalte nach dem Mittel der Vorgaenger."""
    columns: dict[int, list[str]] = {}
    for node in nodes:
        columns.setdefault(rank[node], []).append(node)
    order: dict[str, int] = {}
    for column in sorted(columns):
        members = sorted(columns[column])
        if column > 0:
            preds = {node: [] for node in members}
            for edge in edges:
                if edge.target in preds and rank[edge.source] < column:
                    preds[edge.target].append(order[edge.source])
            members.sort(
                key=lambda node: (
                    sum(preds[node]) / len(preds[node]) if preds[node] else 0.0,
                    node,
                )
            )
        for index, node in enumerate(members):
            order[node] = index
        columns[column] = members

    height = max(len(members) for members in columns.values())
    positions: dict[str, tuple[float, float]] = {}
    for column in sorted(columns):
        members = columns[column]
        offset = (height - len(members)) / 2
        for index, node in enumerate(members):
            x = MARGIN + column * (NODE_W + COL_GAP)
            y = MARGIN + (offset + index) * ROW_GAP
            positions[node] = (x, y)
    return positions


def bezier_point(p0, p1, p2, p3, t: float) -> tuple[float, float]:
    u = 1 - t
    x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
    y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
    return x, y


def render_drawing(
    vocab: Vocabulary, properties: list[str], classes: list[str]
) -> tuple[str, list[str], list[str]]:
    """Die Zeichnung, die ungezeichneten Properties und die Klassen ohne Kante."""
    edges, undrawn = build_edges(vocab, properties)
    nodes = sorted({edge.source for edge in edges} | {edge.target for edge in edges})
    ranks = rank_nodes(nodes, edges)
    positions = layout(nodes, edges, ranks)

    width = MARGIN * 2 + max(x for x, _ in positions.values()) + NODE_W - MARGIN
    height = MARGIN * 2 + max(y for _, y in positions.values()) + NODE_H - MARGIN

    parts: list[str] = []
    parts.append(
        f'<svg class="model-graph" viewBox="0 0 {width:.0f} {height:.0f}" '
        f'width="{width:.0f}" height="{height:.0f}" role="img" '
        'aria-labelledby="graph-title graph-desc" xmlns="http://www.w3.org/2000/svg">'
    )
    parts.append("<title id=\"graph-title\">Modellgestalt</title>")
    parts.append(
        '<desc id="graph-desc">Die Klassen des Modells als Knoten, die Object '
        "Properties als beschriftete Kanten. Die Spalten schichten die Klassen nach "
        "ihrem Abstand von den Klassen ohne eingehende Kante.</desc>"
    )
    parts.append(
        '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" '
        'markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
        '<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-text-tertiary)"/>'
        "</marker></defs>"
    )

    # Kanten zuerst, damit die Knoten darueber liegen.
    labels: list[tuple[float, float, str]] = []
    for edge in sorted(edges, key=lambda e: (e.label, e.source, e.target)):
        x1, y1 = positions[edge.source]
        x2, y2 = positions[edge.target]
        start = (x1 + NODE_W, y1 + NODE_H / 2)
        end = (x2 - 8, y2 + NODE_H / 2)
        span = end[0] - start[0]
        c1 = (start[0] + span * 0.42, start[1])
        c2 = (end[0] - span * 0.42, end[1])
        parts.append(
            f'<path class="model-graph__edge" d="M {start[0]:.1f} {start[1]:.1f} '
            f"C {c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} "
            f'{end[0]:.1f} {end[1]:.1f}" marker-end="url(#arrow)"/>'
        )
        distance = ranks[edge.target] - ranks[edge.source]
        t = 0.5 if distance <= 1 else 0.22
        lx, ly = bezier_point(start, c1, c2, end, t)
        labels.append((lx, ly, edge.label))

    placed: dict[tuple[int, int], int] = {}
    for lx, ly, text in labels:
        cell = (int(lx // 90), int(ly // 18))
        shift = placed.get(cell, 0)
        placed[cell] = shift + 1
        ly = ly - 6 + shift * 13
        box = len(text) * 5.9 + 8
        parts.append(
            f'<rect class="model-graph__labelbox" x="{lx - box / 2:.1f}" y="{ly - 9:.1f}" '
            f'width="{box:.1f}" height="14" rx="2"/>'
        )
        parts.append(
            f'<text class="model-graph__edgelabel" x="{lx:.1f}" y="{ly + 1:.1f}" '
            f'text-anchor="middle">{html.escape(text)}</text>'
        )

    for node in nodes:
        x, y = positions[node]
        prefix, _, local = node.partition(":")
        own = prefix in vocab.own_prefixes
        # Eigene Klassen tragen ihr deutsches Label, eingebundene ihren Praefix,
        # damit die Herkunft am Knoten steht und nicht nur in der Legende.
        label = vocab.literal(vocab.uri(node), RDFS.label, "de") if own else f"{prefix}:"
        variant = "own" if own else "external"
        parts.append(
            f'<g class="model-graph__node model-graph__node--{variant}">'
            f'<rect x="{x:.0f}" y="{y:.0f}" width="{NODE_W}" height="{NODE_H}" rx="4"/>'
        )
        if label:
            parts.append(
                f'<text class="model-graph__name" x="{x + NODE_W / 2:.0f}" '
                f'y="{y + 20:.0f}" text-anchor="middle">{html.escape(local)}</text>'
                f'<text class="model-graph__gloss" x="{x + NODE_W / 2:.0f}" '
                f'y="{y + 35:.0f}" text-anchor="middle">{html.escape(label)}</text>'
            )
        else:
            parts.append(
                f'<text class="model-graph__name" x="{x + NODE_W / 2:.0f}" '
                f'y="{y + 28:.0f}" text-anchor="middle">{html.escape(local)}</text>'
            )
        parts.append("</g>")

    parts.append("</svg>")
    isolated = sorted(set(classes) - set(nodes))
    return "\n".join(parts), undrawn, isolated


# ---------------------------------------------------------------------------
# HTML
# ---------------------------------------------------------------------------


def esc(value: str) -> str:
    return html.escape(value, quote=False)


def code(curie: str) -> str:
    return f"<code>{esc(curie)}</code>"


def code_list(values: list[str]) -> str:
    return " ".join(code(value) for value in values)


def wide(content: str) -> str:
    return f'<div class="page__wide">\n{content}\n</div><!--/wide-->'


def render_term(term: Term, level: int = 3) -> str:
    """The heading level follows the outline: a term sits one step below its
    section, which is h3 unless the section groups its terms under h3 first."""
    parts = ['<div class="term">', f'  <h{level} class="term__head">']
    parts.append(f"    <code>{esc(term.curie)}</code>")
    if term.label_de:
        parts.append(f'    <span class="term__label">{esc(", ".join(term.label_de))}</span>')
    if term.label_en:
        parts.append(f'    <span class="term__gloss">{esc(", ".join(term.label_en))}</span>')
    parts.append(f"  </h{level}>")
    if term.definition:
        parts.append(f'  <p class="term__definition">{esc(term.definition)}</p>')
    if term.facets:
        parts.append('  <dl class="term__facets">')
        for name, values in term.facets:
            parts.append(f"    <dt>{esc(name)}</dt><dd>{code_list(values)}</dd>")
        parts.append("  </dl>")
    for note in term.notes:
        parts.append(f'  <p class="term__note">{esc(note)}</p>')
    parts.append("</div>")
    return "\n".join(parts)


def render_concept_table(vocab: Vocabulary, concepts: list[str]) -> str:
    rows = ['<table class="page__table page__table--concepts">']
    rows.append(
        "<thead><tr><th>Begriff</th><th>Anzeigelabel</th><th>Englisch</th>"
        "<th>Definition</th></tr></thead><tbody>"
    )
    for curie in concepts:
        term = vocab.concept(curie)
        cell = f"<code>{esc(curie)}</code>"
        label = esc(", ".join(term.label_de))
        if term.alt_de:
            label += f'<span class="cell__alt">{esc(", ".join(term.alt_de))}</span>'
        english = esc(", ".join(term.label_en))
        definition = esc(term.definition) if term.definition else ""
        for note in term.notes:
            definition += f'<span class="cell__note">{esc(note)}</span>'
        rows.append(
            f"<tr><td>{cell}</td><td>{label}</td><td>{english}</td><td>{definition}</td></tr>"
        )
    rows.append("</tbody></table>")
    return "\n".join(rows)


def render_dft_tree(vocab: Vocabulary, concepts: list[str]) -> str:
    """Die Dokumenttypen eingerueckt nach skos:broader."""
    children: dict[str, list[str]] = {curie: [] for curie in concepts}
    roots: list[str] = []
    for curie in concepts:
        broader = vocab.references(vocab.uri(curie), SKOS.broader)
        parent = next((value for value in broader if value in children), None)
        if parent:
            children[parent].append(curie)
        else:
            roots.append(curie)

    def branch(curie: str) -> str:
        term = vocab.concept(curie)
        parts = ["<li>", '<span class="dft-tree__term">']
        parts.append(f'<span class="dft-tree__label">{esc(", ".join(term.label_de))}</span>')
        parts.append(f"<code>{esc(curie)}</code>")
        if term.label_en:
            parts.append(f'<span class="term__gloss">{esc(", ".join(term.label_en))}</span>')
        parts.append("</span>")
        if term.definition:
            parts.append(f'<span class="dft-tree__definition">{esc(term.definition)}</span>')
        for note in term.notes:
            parts.append(f'<span class="cell__note">{esc(note)}</span>')
        if children[curie]:
            parts.append("<ul>" + "".join(branch(child) for child in children[curie]) + "</ul>")
        parts.append("</li>")
        return "".join(parts)

    return '<ul class="dft-tree">' + "".join(branch(root) for root in roots) + "</ul>"


def render_page(vocab_path: Path = DEFAULT_VOCAB, data_path: Path = DEFAULT_DATA) -> str:
    vocab = Vocabulary(vocab_path)
    ontology = URIRef(vocab.ontology)

    classes = vocab.declared(OWL.Class, "m3gim-ontology")
    object_properties = vocab.declared(OWL.ObjectProperty, "m3gim-ontology")
    datatype_properties = vocab.declared(OWL.DatatypeProperty, "m3gim-ontology")
    schemes = vocab.declared(SKOS.ConceptScheme, "m3gim-vocab")
    collections = vocab.declared(SKOS.Collection, "m3gim-vocab")
    concepts = vocab.declared(SKOS.Concept, "m3gim-vocab")

    drawing, undrawn, isolated = render_drawing(vocab, object_properties, classes)
    externals = external_namespaces(vocab, data_path)

    title = vocab.literal(ontology, DCTERMS.title, "de") or ""
    lead = vocab.literal(ontology, RDFS.comment, "de") or ""
    version = next(iter(vocab.graph.objects(ontology, OWL.versionInfo)), "")
    created = next(iter(vocab.graph.objects(ontology, DCTERMS.created)), "")
    license_iri = next(iter(vocab.graph.objects(ontology, DCTERMS.license)), "")
    source_iri = next(iter(vocab.graph.objects(ontology, DCTERMS.source)), "")

    out: list[str] = []
    add = out.append

    add(HEAD)
    add('      <header class="page__header">')
    add('        <h1 class="page__title">Datenmodell</h1>')
    add(f'        <p class="page__lead">{esc(lead)}</p>')
    add('        <dl class="page__stats">')
    add(f"          <dt>Vokabular</dt><dd>{esc(title)}</dd>")
    add(f"          <dt>Version</dt><dd>{esc(str(version))}</dd>")
    add(f"          <dt>Angelegt</dt><dd>{esc(str(created))}</dd>")
    add(
        "          <dt>Lizenz</dt><dd>"
        f'<a class="page__link" href="{esc(str(license_iri))}" target="_blank" '
        f'rel="noopener">{esc(str(license_iri))}</a></dd>'
    )
    add(
        "          <dt>Quelle</dt><dd>"
        f'<a class="page__link" href="{esc(str(source_iri))}" target="_blank" '
        f'rel="noopener">{esc(str(source_iri))}</a></dd>'
    )
    add("        </dl>")
    add(
        '        <p class="page__note">Diese Seite ist aus <code>vocab/m3gim.ttl</code> '
        "erzeugt und nicht geschrieben. Jede Definition, jede Kante und jede Anmerkung "
        "steht hier im Wortlaut des Vokabulars.</p>"
    )
    add("      </header>")

    # -- Namensraeume -------------------------------------------------------
    add('      <section class="page__section">')
    add("        <h2>Namensräume</h2>")
    for paragraph in vocab.preamble:
        add(f"        <p>{esc(paragraph)}</p>")
    add("        <h3>Eigene Namensräume</h3>")
    rows = ['<table class="page__table">']
    rows.append("<thead><tr><th>Präfix</th><th>Namensraum</th></tr></thead><tbody>")
    for prefix, iri in vocab.own_prefixes.items():
        rows.append(f"<tr><td><code>{esc(prefix)}:</code></td><td><code>{esc(iri)}</code></td></tr>")
    rows.append("</tbody></table>")
    add(_indent(wide("\n".join(rows)), 8))
    add("        <h3>Eingebundene externe Namensräume</h3>")
    rows = ['<table class="page__table page__table--namespaces">']
    rows.append(
        "<thead><tr><th>Präfix</th><th>Namensraum</th><th>Verwendete Terme</th></tr>"
        "</thead><tbody>"
    )
    for row in externals:
        terms = IDENTIFIER_USE if row["identifier"] else code_list(row["terms"])
        rows.append(
            f'<tr><td><code>{esc(row["prefix"])}:</code></td>'
            f'<td><code>{esc(row["iri"])}</code></td><td>{terms}</td></tr>'
        )
    rows.append("</tbody></table>")
    add(_indent(wide("\n".join(rows)), 8))
    add("      </section>")

    # -- Zeichnung ----------------------------------------------------------
    add('      <section class="page__section">')
    add("        <h2>Modellgestalt</h2>")
    add(
        "        <p>Die Klassen stehen als Knoten, die Object Properties als "
        "beschriftete Kanten. Die Spalten schichten die Klassen nach ihrem Abstand "
        "von den Klassen ohne eingehende Kante, sodass jede Kante nach rechts läuft. "
        "Die Zeichnung ist im Erzeugungslauf berechnet und bei gleichem Vokabular "
        "zeichengleich dieselbe.</p>"
    )
    add(_indent(wide(drawing), 8))
    add('        <ul class="graph-legend">')
    add(
        '          <li><span class="graph-legend__swatch graph-legend__swatch--own"></span>'
        "Klasse der Projekterweiterung</li>"
    )
    add(
        '          <li><span class="graph-legend__swatch graph-legend__swatch--external">'
        "</span>Klasse eines eingebundenen Namensraums</li>"
    )
    add("        </ul>")
    if undrawn:
        add(
            '        <p class="page__note">Ohne Kante in der Zeichnung, weil Domain '
            f"oder Range fehlt: {code_list(undrawn)}.</p>"
        )
    if isolated:
        add(
            '        <p class="page__note">Ohne Knoten in der Zeichnung, weil keine '
            "Object Property auf die Klasse führt oder von ihr ausgeht: "
            f"{code_list(isolated)}.</p>"
        )
    add("      </section>")

    # -- Klassen ------------------------------------------------------------
    section = vocab.section_of(classes[0])
    add('      <section class="page__section">')
    add(f"        <h2>{esc(section.title if section else 'Klassen')}</h2>")
    for note in section.notes if section else []:
        add(f"        <p>{esc(note)}</p>")
    for curie in classes:
        term = vocab.term(curie, [("Oberklasse", RDFS.subClassOf)])
        add(_indent(render_term(term), 8))
    add("      </section>")

    # -- Object Properties --------------------------------------------------
    section = vocab.section_of(object_properties[0])
    add('      <section class="page__section">')
    add(f"        <h2>{esc(section.title if section else 'Object Properties')}</h2>")
    for note in section.notes if section else []:
        add(f"        <p>{esc(note)}</p>")
    for curie in object_properties:
        term = vocab.term(
            curie,
            [
                ("Domain", RDFS.domain),
                ("Range", RDFS.range),
                ("Unterproperty von", RDFS.subPropertyOf),
            ],
        )
        add(_indent(render_term(term), 8))
    add("      </section>")

    # -- Datatype Properties, nach den Sachgruppen des Vokabulars -----------
    groups = [
        section
        for section in vocab.sections_of_kind("Datatype Properties")
        if any(curie in datatype_properties for curie in section.terms)
    ]
    add('      <section class="page__section">')
    add("        <h2>Datatype Properties</h2>")
    for section in groups:
        add(f"        <h3>{esc(section.group)}</h3>")
        for note in section.notes:
            add(f"        <p>{esc(note)}</p>")
        for curie in section.terms:
            if curie not in datatype_properties:
                continue
            term = vocab.term(
                curie,
                [
                    ("Domain", RDFS.domain),
                    ("Range", RDFS.range),
                    ("Unterproperty von", RDFS.subPropertyOf),
                ],
            )
            add(_indent(render_term(term, level=4), 8))
    add("      </section>")

    # -- Kontrollierte Vokabulare -------------------------------------------
    add('      <section class="page__section">')
    add("        <h2>Kontrollierte Vokabulare</h2>")
    for curie in schemes:
        subject = vocab.uri(curie)
        members = [
            concept
            for concept in concepts
            if curie in vocab.references(vocab.uri(concept), SKOS.inScheme)
        ]
        label = vocab.literal(subject, SKOS.prefLabel, "de") or ""
        english = ", ".join(vocab.literals(subject, RDFS.label, "en"))
        add(
            f"        <h3>{esc(label)} "
            f'<span class="term__gloss">{esc(english)}</span> '
            f"<code>{esc(curie)}</code></h3>"
        )
        comment = vocab.literal(subject, RDFS.comment, "de")
        if comment:
            add(f"        <p>{esc(comment)}</p>")
        for note in vocab.literals(subject, SKOS.editorialNote, "de"):
            add(f'        <p class="term__note">{esc(note)}</p>')
        has_hierarchy = any(
            vocab.references(vocab.uri(member), SKOS.broader) for member in members
        )
        if has_hierarchy:
            add(_indent(wide(render_dft_tree(vocab, members)), 8))
        else:
            add(_indent(wide(render_concept_table(vocab, members)), 8))
    add("      </section>")

    # -- Collections --------------------------------------------------------
    section = vocab.section_of(collections[0])
    add('      <section class="page__section">')
    add(f"        <h2>{esc(section.title if section else 'Collections')}</h2>")
    for note in section.notes if section else []:
        add(f"        <p>{esc(note)}</p>")
    for curie in collections:
        subject = vocab.uri(curie)
        label = vocab.literal(subject, SKOS.prefLabel, "de") or ""
        english = ", ".join(vocab.literals(subject, SKOS.altLabel, "en"))
        add('        <div class="term">')
        add(
            f'          <h3 class="term__head"><code>{esc(curie)}</code>'
            f'<span class="term__label">{esc(label)}</span>'
            f'<span class="term__gloss">{esc(english)}</span></h3>'
        )
        comment = vocab.literal(subject, RDFS.comment, "de")
        if comment:
            add(f'          <p class="term__definition">{esc(comment)}</p>')
        for note in vocab.literals(subject, SKOS.editorialNote, "de"):
            add(f'          <p class="term__note">{esc(note)}</p>')
        members = [
            concept for concept in concepts if concept in vocab.references(subject, SKOS.member)
        ]
        add(f'          <p class="term__members">{code_list(members)}</p>')
        add("        </div>")
    add("      </section>")

    add(FOOT)
    return "\n".join(out) + "\n"


def _indent(block: str, spaces: int) -> str:
    pad = " " * spaces
    return "\n".join(pad + line if line else line for line in block.splitlines())


# Bumped whenever a stylesheet changes, so GitHub Pages and browsers drop the
# cached copy; sync_shared_regions writes it into every page.
ASSET_VERSION = "2026-09-05"

# ---------------------------------------------------------------------------
# Die Kopfleiste: eine Vorlage fuer alle Seiten
# ---------------------------------------------------------------------------
#
# One bar on every page of the site (project lead, 2026-09-05). Brand, badge,
# the seven views and the info links stand in the same place everywhere; only
# the semantics of the view navigation differ, because a tablist needs the
# panels it controls and an info page has none. The bar is therefore generated
# from here into all five pages instead of written by hand per page.


@dataclass(frozen=True)
class Tab:
    """One view of the application as it stands in the band."""

    name: str
    label: str
    button_id: str
    icon: str
    tip: str = ""


CURRENT = ' aria-current="page"'

# The views in band order, grouped into Material, Perspektiven and Werkzeug
# (E-160). The group wrappers carry role="none" so the tabs stay direct children
# of the tablist in the accessibility tree; the grouping is a visual ordering,
# not a level the screen reader has to walk through. The tray of the Korb tab
# repeats korbIcon() in docs/js/data/constants.js, keep both identical.
TAB_GROUPS: tuple[tuple[str, tuple[Tab, ...]], ...] = (
    (
        "material",
        (
            Tab(
                "bestand", "Bestand", "btn-bestand",
                '<rect width="20" height="5" x="2" y="3" rx="1"/>'
                '<path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
            ),
            Tab(
                "indizes", "Indizes", "btn-indizes",
                '<path d="M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"/>'
                '<path d="M14 2v5h5"/><path d="M3 15h6"/><path d="M3 19h4"/><path d="M3 11h8"/>',
            ),
        ),
    ),
    (
        "perspektiven",
        (
            Tab(
                "chronik", "Chronik", "btn-chronik",
                '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
            ),
            Tab(
                "karte", "Karte", "btn-karte",
                '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>'
                '<line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
            ),
            Tab(
                "netzwerk", "Netzwerk", "btn-netzwerk",
                '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/>'
                '<circle cx="19" cy="19" r="2"/><circle cx="5" cy="19" r="2"/>'
                '<circle cx="12" cy="12" r="2"/><path d="M6.5 6.5 10.5 10.5"/>'
                '<path d="M17.5 6.5 13.5 10.5"/><path d="M6.5 17.5 10.5 13.5"/>'
                '<path d="M17.5 17.5 13.5 13.5"/>',
            ),
            Tab(
                "statistik", "Statistik", "btn-statistik",
                '<line x1="18" y1="20" x2="18" y2="10"/>'
                '<line x1="12" y1="20" x2="12" y2="4"/>'
                '<line x1="6" y1="20" x2="6" y2="14"/>',
            ),
        ),
    ),
    (
        "werkzeug",
        (
            Tab(
                "korb", "Korb", "korb-tab-btn",
                '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>'
                '<path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89'
                'A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
                "Ausgewählte Dokumente sammeln und als CSV oder BibTeX exportieren",
            ),
        ),
    ),
)

INFO_LINKS = (
    ("about.html", "Über"),
    ("projekt.html", "Projekt"),
    ("datenmodell.html", "Datenmodell"),
)

BRAND_SUBTITLE = "Teilnachlass Ira Malaniuk — UAKUG/NIM"

# The view the application opens on; its tab is the one the live bar preselects.
DEFAULT_TAB = "bestand"


def _icon(paths: str) -> str:
    return (
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" '
        f'focusable="false">{paths}</svg>'
    )


def _render_tab(tab: Tab, app: bool, pad: str) -> list[str]:
    """One tab, as the live tablist button or as a link into the application.

    Both variants carry the same classes and the same icon, so the band reads as
    one bar. The button adds what only a live bar can honour: the panel it
    controls, the roving tabindex, the register menu of the Indizes tab and the
    Korb count. A link would promise those without being able to keep them.
    """
    tip = f' data-tip="{tab.tip}"' if tab.tip else ""
    # The chevron stands on both variants: it says that registers sit behind the
    # entry, which holds wherever the entry stands, and without it the five tabs
    # after the Indizes would sit 20px apart between the two bars. Only the
    # menu itself, its wrapper and its ARIA state belong to the live bar.
    chevron = tab.name == "indizes"
    menu = app and chevron
    active = app and tab.name == DEFAULT_TAB
    lines: list[str] = []
    if menu:
        lines.append(f'{pad}<div class="tab-menu" role="none">')
        pad += "  "
    inner = pad + "  "
    if app:
        classes = "tab-bar__tab tab-menu__trigger" if menu else "tab-bar__tab"
        if active:
            classes += " active"
        extra = ' aria-haspopup="menu" aria-expanded="false"' if menu else ""
        lines.append(
            f'{pad}<button class="{classes}" id="{tab.button_id}" role="tab" '
            f'aria-selected="{str(active).lower()}" aria-controls="tab-{tab.name}" '
            f'tabindex="{0 if active else -1}" data-tab="{tab.name}"{tip}{extra}>'
        )
    else:
        lines.append(f'{pad}<a class="tab-bar__tab" href="index.html#{tab.name}"{tip}>')
    lines.append(inner + _icon(tab.icon))
    label = f'<span class="tab-bar__label">{tab.label}</span>'
    if chevron:
        # Label and chevron sit in one wrapper so the chevron keeps its own tight
        # gap instead of the wider gap between icon and label.
        lines.append(f'{inner}<span class="tab-menu__name">')
        lines.append(f"{inner}  {label}")
        lines.append(
            f'{inner}  <svg class="tab-menu__chevron" width="11" height="11" '
            'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" '
            'focusable="false"><path d="m6 9 6 6 6-6"/></svg>'
        )
        lines.append(f"{inner}</span>")
    else:
        lines.append(inner + label)
    if app and tab.name == "korb":
        lines.append(
            f'{inner}<span class="tab-bar__badge" id="korb-badge" '
            'aria-label="Anzahl Einträge im Korb">0</span>'
        )
    lines.append(f"{pad}</button>" if app else f"{pad}</a>")
    if menu:
        pad = pad[:-2]
        lines.append(
            f'{pad}  <div class="tab-menu__panel" id="indizes-register-menu" role="menu" '
            'aria-label="Register" hidden></div>'
        )
        lines.append(f"{pad}</div>")
    return lines


def topbar_for(page_name: str) -> str:
    """The one header of the site, carrying this page's own state.

    ``index.html`` gets the live tab list, every other page the same views as
    links into the application. The info links mark the page's own entry with
    ``aria-current``; the application page and the Impressum stand in that list
    with no entry of their own and therefore mark nothing.
    """
    app = page_name == "index.html"
    lines = [
        '<header class="topbar">',
        '    <div class="topbar__lead">',
        f'      <a class="topbar__brand" href="index.html" data-tip="{BRAND_SUBTITLE}">M³GIM</a>',
        '      <a class="topbar__badge" href="projekt.html">Research Preview</a>',
        "    </div>",
        "",
    ]
    if app:
        lines.append('    <nav class="tab-bar" role="tablist" aria-label="Hauptnavigation">')
    else:
        lines.append('    <nav class="tab-bar" aria-label="Ansichten">')
    for group, tabs in TAB_GROUPS:
        lines.append(f'      <div class="tab-bar__group" role="none" data-group="{group}">')
        for tab in tabs:
            lines += _render_tab(tab, app, pad="        ")
        lines.append("      </div>")
    lines += [
        "    </nav>",
        "",
        '    <nav class="topbar__info" aria-label="Informationsseiten">',
    ]
    for href, label in INFO_LINKS:
        lines.append(f'      <a href="{href}"{CURRENT if href == page_name else ""}>{label}</a>')
    lines += ["    </nav>", "  </header>"]
    return "\n".join(lines)


# The top bar and foot of these templates are the single source for the shared
# regions of the hand-written pages under docs/; sync_shared_regions injects
# them, tests/test_49_footer.py guards that the injection ran.
# A plain string, not an f-string, because the structured data carries braces.
_HEAD = """<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Datenmodell · M³GIM</title>
  <meta name="description" content="Klassen, Properties und kontrollierte Vokabulare der M³GIM-Erweiterung zu RiC-O 1.1, erzeugt aus dem Projektvokabular.">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#004A8F">
  <link rel="canonical" href="https://digitalhumanitiescraft.github.io/m3gim/datenmodell.html">

  <!-- Social cards: absolute URLs, because a scraper resolves nothing relative. -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="M³GIM">
  <meta property="og:locale" content="de_AT">
  <meta property="og:title" content="Datenmodell · M³GIM">
  <meta property="og:description" content="Klassen, Properties und kontrollierte Vokabulare der M³GIM-Erweiterung zu RiC-O 1.1, erzeugt aus dem Projektvokabular.">
  <meta property="og:url" content="https://digitalhumanitiescraft.github.io/m3gim/datenmodell.html">
  <meta property="og:image" content="https://digitalhumanitiescraft.github.io/m3gim/img/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="M³GIM — Mapping Mobile Musicians">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Datenmodell · M³GIM">
  <meta name="twitter:description" content="Klassen, Properties und kontrollierte Vokabulare der M³GIM-Erweiterung zu RiC-O 1.1, erzeugt aus dem Projektvokabular.">
  <meta name="twitter:image" content="https://digitalhumanitiescraft.github.io/m3gim/img/og.png">

  <!-- Favicon: inline SVG, so the page needs no external asset; the PNGs serve
       the browsers and launchers that take no SVG. -->
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='10' fill='%231a1a1a'/%3E%3Ctext x='50%25' y='58%25' text-anchor='middle' font-family='Georgia,serif' font-size='36' font-weight='700' fill='%23f5f1e8'%3EM%3C/text%3E%3Ctext x='78%25' y='38%25' text-anchor='middle' font-family='Georgia,serif' font-size='18' font-weight='700' fill='%23c9a961'%3E3%3C/text%3E%3C/svg%3E">
  <link rel="icon" type="image/png" sizes="32x32" href="img/favicon-32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="img/apple-touch-icon.png">
  <link rel="manifest" href="site.webmanifest">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap">

  <link rel="stylesheet" href="css/variables.css?v={v}">
  <link rel="stylesheet" href="css/base.css?v={v}">
  <link rel="stylesheet" href="css/components.css?v={v}">
  <link rel="stylesheet" href="css/pages.css?v={v}">
  <link rel="stylesheet" href="css/tabs.css?v={v}">

  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://digitalhumanitiescraft.github.io/m3gim/#website",
          "name": "M³GIM",
          "alternateName": "Mapping Mobile Musicians",
          "url": "https://digitalhumanitiescraft.github.io/m3gim/",
          "inLanguage": "de-AT",
          "description": "Digitale Erschließung des Teilnachlasses Ira Malaniuk (UAKUG/NIM) am Universitätsarchiv der Kunstuniversität Graz.",
          "publisher": {
            "@type": "Organization",
            "name": "Universität für Musik und darstellende Kunst Graz",
            "alternateName": "KUG",
            "url": "https://www.kug.ac.at"
          }
        },
        {
          "@type": "WebPage",
          "@id": "https://digitalhumanitiescraft.github.io/m3gim/datenmodell.html#webpage",
          "name": "Datenmodell",
          "description": "Klassen, Properties und kontrollierte Vokabulare der M³GIM-Erweiterung zu RiC-O 1.1, erzeugt aus dem Projektvokabular.",
          "url": "https://digitalhumanitiescraft.github.io/m3gim/datenmodell.html",
          "inLanguage": "de",
          "isPartOf": {
            "@id": "https://digitalhumanitiescraft.github.io/m3gim/#website"
          },
          "license": "https://creativecommons.org/licenses/by/4.0/"
        }
      ]
    }
  </script>
</head>
<body class="info-page">

  <a class="skip-link" href="#main-content">Zum Inhalt springen</a>

  {topbar}

  <main class="info-main" id="main-content">
    <article class="page page--model">
"""

HEAD = _HEAD.replace("{v}", ASSET_VERSION).replace(
    "{topbar}", topbar_for(DEFAULT_OUT.name)
)

FOOT = """
    </article>
  </main>

  <footer class="app-footer">
    <div class="app-footer__group">
      <a class="app-footer__kug" href="https://www.kug.ac.at" target="_blank" rel="noopener" data-tip="Universität für Musik und darstellende Kunst Graz, Universitätsarchiv"><img class="app-footer__mark" src="img/kug-logo.svg" alt="" width="14" height="14">KUG Graz</a>
      <a href="impressum.html">Impressum</a>
    </div>
    <div class="app-footer__group">
      <a href="https://github.com/DigitalHumanitiesCraft/m3gim" target="_blank" rel="noopener" data-tip="Repository auf GitHub, Code unter MIT-Lizenz">Repository</a>
      <a href="https://github.com/DigitalHumanitiesCraft/Promptotyping" target="_blank" rel="noopener" data-tip="Die Anwendung ist mit generativer KI nach der Promptotyping-Methode und Agentic Engineering entstanden">Promptotyping und Agentic Engineering</a>
      <a class="app-footer__dhcraft" href="https://dhcraft.org" target="_blank" rel="noopener" data-tip="Digital Humanities Craft, Konzeption und technische Umsetzung"><img class="app-footer__mark" src="img/dhcraft-logo.svg" alt="" width="14" height="14">Technische Umsetzung DHCraft</a>
      <a class="app-footer__cc" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener" data-tip="Daten, Texte und Dokumentation unter Creative Commons Attribution 4.0"><img class="app-footer__mark" src="img/cc.svg" alt="" width="14" height="14"><img class="app-footer__mark" src="img/cc-by.svg" alt="" width="14" height="14">CC BY 4.0</a>
    </div>
  </footer>

</body>
</html>"""


# ---------------------------------------------------------------------------
# Shared regions of the hand-written pages
# ---------------------------------------------------------------------------
#
# The pages under docs/ are hand-written and have no build step. Their top bar
# and foot are nevertheless identical everywhere, so they are not written by
# hand but injected from the templates above: only the region between the
# markers is generated, the page body around it stays untouched.

DOCS = REPO / "docs"

FOOTER_OPEN = '<footer class="app-footer">'
FOOTER_CLOSE = "</footer>"
TOPBAR_OPEN = '<header class="topbar">'
TOPBAR_CLOSE = "</header>"

PAGES = ("index.html", "about.html", "projekt.html", "impressum.html", "datenmodell.html")

STYLESHEET_RE = re.compile(r'(href="css/[^"?]+\.css)(?:\?v=[^"]*)?"')


def extract_region(text: str, open_marker: str, close_marker: str, source: str) -> str:
    start, end = _region_bounds(text, open_marker, close_marker, source)
    return text[start:end]


def _region_bounds(text: str, open_marker: str, close_marker: str, source: str) -> tuple[int, int]:
    start = text.find(open_marker)
    if start == -1:
        raise ValueError(f"{source}: {open_marker} fehlt")
    if text.find(open_marker, start + 1) != -1:
        raise ValueError(f"{source}: {open_marker} steht mehrfach")
    end = text.find(close_marker, start)
    if end == -1:
        raise ValueError(f"{source}: {close_marker} fehlt")
    return start, end + len(close_marker)


def _replace_region(
    text: str, open_marker: str, close_marker: str, block: str, source: str
) -> str:
    start, end = _region_bounds(text, open_marker, close_marker, source)
    return text[:start] + block + text[end:]


def sync_shared_regions(docs: Path = DOCS) -> list[str]:
    """Inject foot, top bar and asset version into the delivered pages.

    Returns the names of the pages actually rewritten; a second run returns an
    empty list.
    """
    footer = extract_region(FOOT, FOOTER_OPEN, FOOTER_CLOSE, "FOOT")
    changed = []
    for name in PAGES:
        path = docs / name
        original = path.read_text(encoding="utf-8")
        text = _replace_region(original, FOOTER_OPEN, FOOTER_CLOSE, footer, name)
        text = _replace_region(text, TOPBAR_OPEN, TOPBAR_CLOSE, topbar_for(name), name)
        text = STYLESHEET_RE.sub(rf'\1?v={ASSET_VERSION}"', text)
        if text != original:
            path.write_text(text, encoding="utf-8", newline="\n")
            changed.append(name)
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--vocab", type=Path, default=DEFAULT_VOCAB)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    page = render_page(args.vocab, args.data)
    args.out.write_text(page, encoding="utf-8", newline="\n")
    try:
        shown = args.out.resolve().relative_to(REPO)
    except ValueError:
        shown = args.out
    print(f"[OK] {shown} ({len(page):,} bytes)")

    changed = sync_shared_regions()
    print(f"[OK] gemeinsame Regionen: {', '.join(changed) if changed else 'unveraendert'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
