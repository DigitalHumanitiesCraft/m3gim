"""Gemeinsame Utilities fuer die M3GIM-Pipeline-Scripts.

Enthaelt schlanke Helpers, die in mehreren Scripts identisch gebraucht
werden. Kein Framework, keine Abstraktion auf Vorrat — nur konkret
dedupliziertes Wissen.

Zentralisierte XLSX-Workaround-Konstanten siehe knowledge/data.md § 17.
"""

from __future__ import annotations

import re
from collections.abc import Iterator
from pathlib import Path


# ---------------------------------------------------------------------------
# XLSX-Workaround-Konstanten (siehe knowledge/data.md § 17)
# ---------------------------------------------------------------------------

# Header-Shift-Korrektur fuer Personen-/Org-/Ort-/Werkindex: in mehreren
# Indizes ist die XLSX-Kopfzeile nicht sauber gesetzt — entweder laeuft die
# erste Datenzeile als Header durch (Org/Werk: Position 1 traegt einen
# geleakten Datenwert wie "Graz"/"Rossini, Gioachino" statt "name"), oder die
# name-Spalte hat gar keinen Header (Personenindex: Position 1 ist leer und
# wird von pandas zu "Unnamed: 1"). Pipeline erkennt das positionell an
# Spalte 0 ("m3gim_id" = echte Kopfzeile vorhanden) und benennt die Spalten
# auf den Kanon um, statt eine echte Datenzeile als Header zu konsumieren.
# Zentral, damit transform.py, validate.py und reconcile.py denselben Kanon
# nutzen. Siehe knowledge/data.md § 17 und architecture-decisions.md E-95.
INDEX_HEADER_SHIFTS: dict[str, list[str]] = {
    "personenindex": [
        "m3gim_id", "name", "wikidata_id",
        "lebensdaten", "anmerkung",
    ],
    "organisationsindex": [
        "m3gim_id", "name", "wikidata_id",
        "ort", "assoziierte_person", "anmerkung",
    ],
    "ortsindex": ["m3gim_id", "name", "wikidata_id"],
    "werkindex": [
        "m3gim_id", "name", "wikidata_id",
        "komponist", "rolle_stimme", "anmerkung",
    ],
}

# Finanz-Waehrungs-Defaults pro Konvolut-Signatur. NIM_007 "Aufstellung 1966"
# Folio 5_1 hat fuenf Zahlen ohne Waehrung; benachbarte Folien 5_2..5_8 sind
# konsistent in Schilling ausgewiesen, daher "S" als Default.
# NIM_011 Folio 5 (Bruessel-Gastspiel Tristan, Theatre Royal de la Monnaie):
# zwei Abendgage-Zeilen "1200" ohne Waehrung; das Folio-9-Pendant desselben
# Vertragsblocks ist in "Belgische Francs" ausgewiesen und der Vertragsort ist
# Bruessel. Daher "Belgische Francs" als Default (gleiche folio-nachbarschafts-
# Heuristik wie NIM_007). Mit dem Erschliessungsteam zu bestaetigen (Treffen
# 2026-06-23) — Barcelona ist ein sekundaerer Gastspiel-Ort im selben Block,
# keine zweite Waehrung.
FINANCE_CURRENCY_DEFAULTS: dict[str, str] = {
    "UAKUG/NIM_007": "S",
    "UAKUG/NIM_011": "Belgische Francs",
}


def default_currency_for(signatur: str | None) -> str | None:
    """Default-Waehrung, wenn die Archivsignatur ein bekanntes Praefix hat."""
    if not signatur:
        return None
    for prefix, curr in FINANCE_CURRENCY_DEFAULTS.items():
        if signatur.startswith(prefix):
            return curr
    return None


# Kontrolliertes Bearbeitungsstand-Vokabular: "abgeschlossen", "begonnen",
# "zurueckgestellt". XLSX schreibt Varianten wie "Vollständig", "erledigt",
# "zurückgestellt". Source-Fix: Dropdown in Google Sheets.


def normalize_bearbeitungsstand(value) -> str | None:
    """Mappt Freitext-Varianten auf kanonische Werte.

    Akzeptiert pandas-NaN (Float) und None; liefert in dem Fall None zurueck.
    Rueckgabe sonst: einer der drei kanonischen Werte oder der lower-strip-
    Wert unveraendert, wenn kein Muster greift (dann schlaegt test_03 an).
    """
    if value is None or value != value:  # None oder NaN (NaN != NaN)
        return None
    bs = str(value).strip().lower()
    if not bs or bs == "nan":
        return None
    if "vollst" in bs or bs == "abgeschlossen" or bs.startswith("erledigt"):
        return "abgeschlossen"
    if bs.startswith("begonnen"):
        return "begonnen"
    if "ckgestellt" in bs or "zurück" in bs:
        return "zurueckgestellt"
    return bs


def extract_bearbeitungsnotiz(value) -> str | None:
    """Extrahiert den Freitext-Anhang des Bearbeitungsstands als Notiz (E-102).

    Der canonische Status (``normalize_bearbeitungsstand``) verwirft den
    Klammer-Zusatz; hier wird er als ``m3gim-ontology:processingNote`` herausgeloest,
    z. B. "Erledigt (Ira Malaniuk betreffend. Rest zurueckgestellt)" →
    "Ira Malaniuk betreffend. Rest zurueckgestellt". Rueckgabe None, wenn kein
    Klammer-Zusatz vorhanden ist.
    """
    if value is None or value != value:  # None oder NaN
        return None
    s = str(value).strip()
    m = re.search(r"\(([^)]+)\)", s)
    if not m:
        return None
    notiz = m.group(1).strip()
    return notiz or None


def is_approved_match(match_entry: dict) -> bool:
    """Darf dieses Reconciliation-Match ans Enrichment/JSON-LD durchgereicht werden?

    Konservative Low-Confidence-Policy (siehe E-74):
    - ``exact`` und ``fuzzy_high`` (Score >= 90) sind automatisch freigegeben.
    - ``fuzzy_low`` (Score 80-89) nur, wenn redaktionell ``manual_review:
      "approved"`` gesetzt wurde. Alles andere wird uebergangen.

    Funktion ist idempotent, Seiteneffekte null.
    """
    level = match_entry.get("match")
    if level != "fuzzy_low":
        return True
    return match_entry.get("manual_review") == "approved"


def build_xlsx_source(sheet: str, row: int,
                      datenpunkt_id: int | str | None = None) -> dict:
    """Erzeugt das Provenance-Sidecar-Objekt fuer m3gim-ontology:xlsxSource (E-73).

    Shape:
        {
            "m3gim-ontology:xlsxSheet": "<Objekte|Verknuepfungen>",
            "m3gim-ontology:xlsxRow":   <int >= 2>,
            "m3gim-ontology:dataPointId": <optional, nur falls gesetzt>,
        }

    Aufruf-Muster:
        record["m3gim-ontology:xlsxSource"] = build_xlsx_source("Objekte", row_idx + 2)
    """
    source = {
        "m3gim-ontology:xlsxSheet": sheet,
        "m3gim-ontology:xlsxRow": row,
    }
    if datenpunkt_id is not None:
        source["m3gim-ontology:dataPointId"] = datenpunkt_id
    return source


def attach_xlsx_source(target: dict, rel: dict, key: str = "_source") -> None:
    """Haengt ``rel[key]`` als ``m3gim-ontology:xlsxSource`` an ``target``.

    No-op, wenn in ``rel`` keine Quellreferenz vorliegt. Soll in
    ``transform.py`` an jeder Stelle verwendet werden, an der aus einer
    Verknuepfungszeile eine nested entity gebaut wird (Agent, Location,
    Subject, Annotation, AgRelOn).
    """
    source = rel.get(key)
    if source:
        target["m3gim-ontology:xlsxSource"] = source


def strip_zero_date_padding(value):
    """Drop Wikidata's zero padding from a date literal.

    Wikidata serialises every time value at full width and carries the real
    granularity in a separate `precision` field, so a year-only date arrives as
    1841-00-00, which is no date under ISO 8601. Cutting the trailing zero
    groups restores the attested precision (E-132). Values without padding and
    non-string values pass through unchanged.
    """
    if not isinstance(value, str):
        return value
    if not re.fullmatch(r"\d{4}(-\d{2}){1,2}", value):
        return value
    return re.sub(r"(-00)+$", "", value)


# ---------------------------------------------------------------------------
# Vokabular-Leser
# ---------------------------------------------------------------------------
# Die Pipeline braucht zur Laufzeit die Abbildung eines erfassten Rollenwerts
# auf sein Concept in vocab/m3gim.ttl. Diese Datei steht in der Spec-Hierarchie
# ueber der Pipeline (E-133), sie ist die Quelle und keine Kopie. rdflib liegt
# nur in requirements-test.txt; ein Import haette die Laufzeitumgebung um eine
# Abhaengigkeit erweitert, die sie nicht hat. Der Leser hier deckt genau die
# Turtle-Form ab, die das Vokabular verwendet, und wird von
# tests/test_47_vocab_reader.py gegen einen echten Parser gehalten.

VOCAB_PREFIX = "m3gim-vocab:"
DFT_SCHEME = VOCAB_PREFIX + "documentaryFormTypes"

_LITERAL_DE = re.compile(r'"((?:[^"\\]|\\.)*)"@de')
_IS_CONCEPT = re.compile(r"^\s*a\s+skos:Concept(?:\s|;|$)")


def _turtle_statements(text: str) -> Iterator[str]:
    """Zerlegt Turtle in seine Aussagen, ohne den abschliessenden Punkt.

    Anfuehrungszeichen und spitze Klammern werden mitgefuehrt, damit ein Punkt
    innerhalb eines Literals oder einer IRI nicht trennt. Kommentare fallen weg.
    """
    buffer: list[str] = []
    in_string = in_iri = in_comment = escaped = False
    for char in text:
        if in_comment:
            if char == "\n":
                in_comment = False
                buffer.append(" ")
            continue
        if in_string:
            buffer.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == "#" and not in_iri:
            in_comment = True
            continue
        if char == "." and not in_iri:
            statement = "".join(buffer).strip()
            if statement:
                yield statement
            buffer = []
            continue
        buffer.append(char)
        if char == '"':
            in_string = True
        elif char == "<":
            in_iri = True
        elif char == ">":
            in_iri = False
    tail = "".join(buffer).strip()
    if tail:
        yield tail


def _predicate_objects(statement: str, predicate: str) -> list[str]:
    """Objektteil jeder Nennung von ``predicate`` in einer Turtle-Aussage."""
    parts: list[str] = []
    buffer: list[str] = []
    in_string = escaped = False
    for char in statement:
        if in_string:
            buffer.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == ";":
            parts.append("".join(buffer))
            buffer = []
            continue
        buffer.append(char)
        if char == '"':
            in_string = True
    parts.append("".join(buffer))
    pattern = re.compile(rf"(?:^|\s){re.escape(predicate)}\s")
    return [part.split(predicate, 1)[1] for part in parts if pattern.search(part)]


def load_concept_meta(vocab_path: Path) -> dict[str, dict[str, str]]:
    """Liest Definition und Begriffsschema der Vokabularbegriffe.

    Rueckgabe: {CURIE: {"definition": str|None, "scheme": CURIE|None}}. Die
    Definition ist der erklaerende Satz, den die Oberflaeche an einem
    Fachbegriff zeigt; sie steht im Vokabular und wird nicht im Frontend
    zweitgefuehrt. Das Schema trennt Dokumenttypen von Rollen, die sich seit
    der Namensraum-Dreiteilung denselben Praefix teilen.
    """
    meta: dict[str, dict[str, str]] = {}
    for statement in _turtle_statements(Path(vocab_path).read_text(encoding="utf-8")):
        subject, _, body = statement.partition(" ")
        if not subject.startswith(VOCAB_PREFIX) or not _IS_CONCEPT.match(body):
            continue
        definition = None
        for obj in _predicate_objects(body, "skos:definition"):
            match = _LITERAL_DE.search(obj)
            if match:
                definition = match.group(1)
                break
        scheme = None
        for obj in _predicate_objects(body, "skos:inScheme"):
            candidate = obj.strip().rstrip(" .;,")
            if candidate.startswith(VOCAB_PREFIX):
                scheme = candidate
                break
        meta[subject] = {"definition": definition, "scheme": scheme}
    return meta


def load_role_meta(vocab_path: Path) -> dict[str, dict]:
    """Liest Bezugsebene und Rang der Rollenbegriffe aus dem Vokabular.

    Rueckgabe: {CURIE: {"scope": CURIE|None, "rank": int|None}}. Beides stand
    bis 2026-08-22 als Handtabelle im Frontend (E-150). Die Bezugsebene sagt,
    was eine Datierung datiert, der Rang entscheidet zwischen mehreren
    ankernden Datierungen desselben Dokuments.
    """
    meta: dict[str, dict] = {}
    for statement in _turtle_statements(Path(vocab_path).read_text(encoding="utf-8")):
        subject, _, body = statement.partition(" ")
        if not subject.startswith(VOCAB_PREFIX) or not _IS_CONCEPT.match(body):
            continue
        scope = None
        for obj in _predicate_objects(body, "m3gim-ontology:datingScope"):
            candidate = obj.strip().rstrip(" .;,")
            if candidate.startswith(VOCAB_PREFIX):
                scope = candidate
                break
        rank = None
        for obj in _predicate_objects(body, "m3gim-ontology:datingRank"):
            digits = obj.strip().rstrip(" .;,")
            if digits.isdigit():
                rank = int(digits)
                break
        if scope is None and rank is None:
            continue
        meta[subject] = {"scope": scope, "rank": rank}
    return meta


def load_role_concepts(vocab_path: Path) -> dict[str, tuple[str, str]]:
    """Liest die Rollenbegriffe des Vokabulars als deutsches Label auf Concept.

    Rueckgabe: {Label: (CURIE, prefLabel)}. Schluessel sind das prefLabel und
    jedes deutsche altLabel, sodass auch ein aufgegangener Begriff aufloest; der
    Wert traegt immer das prefLabel des aufnehmenden Concepts. Dokumenttypen
    bleiben aussen vor, weil ihre Anzeigetexte mit Rollenwerten kollidieren
    wuerden.
    """
    mapping: dict[str, tuple[str, str]] = {}
    for statement in _turtle_statements(Path(vocab_path).read_text(encoding="utf-8")):
        subject, _, body = statement.partition(" ")
        if not subject.startswith(VOCAB_PREFIX) or not _IS_CONCEPT.match(body):
            continue
        if any(DFT_SCHEME in obj for obj in _predicate_objects(body, "skos:inScheme")):
            continue
        pref = [
            match.group(1)
            for obj in _predicate_objects(body, "skos:prefLabel")
            for match in _LITERAL_DE.finditer(obj)
        ]
        if not pref:
            continue
        alt = [
            match.group(1)
            for obj in _predicate_objects(body, "skos:altLabel")
            for match in _LITERAL_DE.finditer(obj)
        ]
        for label in pref + alt:
            mapping[label] = (subject, pref[0])
    return mapping
