#!/usr/bin/env python3
"""
M³GIM transform — step 3 of the pipeline.

Produces JSON-LD in RiC-O 1.1 format with m3gim extensions.
Reads the Google Sheets exports, normalizes the data, builds the Konvolut
hierarchy, and matches Verknuepfungen against the indices.

Normalization steps:
    1. Column names: .lower().strip() (Excel has mixed casing)
    2. Header-shift correction: three indices (Org, Ort, Werk) ship shifted headers
    3. String values: .strip(), .lower() for vocabulary fields
    4. Date fields: remove Excel artefacts ("1958-04-18 00:00:00" → "1958-04-18")
    5. Document type: mapping German → m3gim-vocab SKOS concept
    6. Bearbeitungsstand: normalize variants (vollstaendig/Erledigt → abgeschlossen)
    7. Composite types: decompose "ort,datum" into separate relations
    8. Composite values: "Muenchen, 1952-12-17" → place + date split
    9. Roles: .lower() for consistent casing
   10. Wikidata ids: regex validation ^Q\d+$ (prevents malformed URIs)

Usage:
    python scripts/transform.py
"""

import os
import sys
import re
import json
import hashlib
import pandas as pd
from pathlib import Path
from datetime import datetime

from _common import (
    attach_xlsx_source,
    build_xlsx_source,
    default_currency_for,
    extract_bearbeitungsnotiz,
    is_approved_match,
    load_concept_meta,
    load_objekte,
    load_role_concepts,
    load_role_meta,
    normalize_bearbeitungsstand,
    strip_zero_date_padding,
    INDEX_HEADER_SHIFTS,
)

# Windows console defaults to cp1252; force UTF-8
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).parent.parent
SHEETS_DIR = Path(os.environ.get("M3GIM_SHEETS_DIR", BASE_DIR / "data" / "google-spreadsheet"))
OUTPUT_DIR = Path(os.environ.get("M3GIM_OUTPUT_DIR", BASE_DIR / "data" / "output"))

CONTEXT = {
    "rico": "https://www.ica.org/standards/RiC/ontology#",
    "ric-rst": "https://www.ica.org/standards/RiC/vocabularies/recordSetTypes#",
    "m3gim-ontology": "https://dhcraft.org/m3gim/ontology#",
    "m3gim-data": "https://dhcraft.org/m3gim/data#",
    "m3gim-vocab": "https://dhcraft.org/m3gim/vocabulary#",
    "agrelon": "https://d-nb.info/standards/elementset/agrelon#",
    "schema": "https://schema.org/",
    "gndo": "https://d-nb.info/standards/elementset/gnd#",
    "wd": "http://www.wikidata.org/entity/",
    "owl": "http://www.w3.org/2002/07/owl#",
    "geo": "http://www.w3.org/2003/01/geo/wgs84_pos#",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    # Inline property aliases: bare keys → qualified URIs
    "name": "rico:name",
    "role": "m3gim-ontology:role",
    "composer": "m3gim-ontology:composer"
}

# Role concepts of the formal vocabulary, German label → (CURIE, prefLabel).
# The vocabulary ranks above the pipeline in the spec hierarchy (E-133), so
# role values are read from there instead of being duplicated here.
VOCAB_PATH = Path(os.environ.get("M3GIM_VOCAB_PATH", BASE_DIR / "vocab" / "m3gim.ttl"))
ROLE_CONCEPTS = load_role_concepts(VOCAB_PATH)
CONCEPT_META = load_concept_meta(VOCAB_PATH)
ROLE_META = load_role_meta(VOCAB_PATH)

# Mapping (typ, rolle) → AgRelOn class + property (data-model.md § 8.3, phase 4.8).
# The pipeline emits an agrelon relation with provenance on the record in
# addition to the plain agent relation.
AGRELON_MAPPING = {
    # (typ, rolle) -> (agrelon_class, agrelon_property_on_subject)
    ("institution", "arbeitgeber"): ("agrelon:HasEmployeeEmployer", "agrelon:hasEmployer"),
    ("person", "absender"):          ("agrelon:HasCorrespondent",    "agrelon:hasCorrespondent"),
    ("person", "empfänger"):         ("agrelon:HasCorrespondent",    "agrelon:hasCorrespondent"),
    ("person", "adressat"):          ("agrelon:HasCorrespondent",    "agrelon:hasCorrespondent"),
    ("person", "agent"):             ("agrelon:HasProfessionalContact", "agrelon:hasProfessionalContact"),
    ("person", "vermittler"):        ("agrelon:HasProfessionalContact", "agrelon:hasProfessionalContact"),
    ("person", "auftraggeber"):      ("agrelon:IsHasPatron",         "agrelon:hasPatron"),
    ("institution", "ausbildungsstätte"): ("agrelon:HasIsMember",    "agrelon:isMemberOf"),
}

# Roles that carry an AgRelOn relation only on a specific document type.
# The sender side of correspondence is recorded as "verfasser" in the fonds;
# the declared value "absender" never occurs in the data. Without the binding
# to the document type, the same role value would also claim a correspondence
# for the critic of a review or the author of a press article.
AGRELON_MAPPING_BY_DFT = {
    ("person", "verfasser"): {
        "korrespondenz": ("agrelon:HasCorrespondent", "agrelon:hasCorrespondent"),
    },
    ("institution", "verfasser"): {
        "korrespondenz": ("agrelon:HasCorrespondent", "agrelon:hasCorrespondent"),
    },
}

# N-ary AgRelOn concepts whose property is declared owl:SymmetricProperty.
# AgRelOn prescribes agrelon:hasSubjectObject for them because both sides carry
# the same role; hasSubject/hasObject would assert a direction the concept does
# not know. Verified 2026-08-22 against the AgRelOn RDF of the German National
# Library.
SYMMETRIC_AGRELON_CLASSES = frozenset({"agrelon:HasCorrespondent"})

# Concepts whose subject position is not the fonds creator. IsHasPatron is the
# n-ary concept for isPatronOf/hasPatron, and isPatronOf carries the
# correspondsTo direction; per the AgRelOn comment on hasSubjectObject the
# subject position follows that first name part. The subject is thus the
# patron (Auftraggeber), the patronized person sits at the object position.
FONDS_AT_OBJECT_CLASSES = frozenset({"agrelon:IsHasPatron"})

# Fonds subject of all AgRelOn relations: Ira Malaniuk, Wikidata Q94208
# (label + life dates verified against Wikidata 2026-06-18, not guessed).
# The n-ary reification carries her as agrelon:hasSubject, the counterpart as
# hasObject (E-104). References the canonical WD entity directly instead of
# minting a local node (the schema does not allow Person as top-level @type).
MALANIUK_SUBJECT = {
    "name": "Malaniuk, Ira",
    "@id": "wd:Q94208",
    "owl:sameAs": "http://www.wikidata.org/entity/Q94208",
}


# Roles the cataloguing attaches to a dating. The former mapping to typed date
# properties is gone with the target model; every date value becomes an
# annotation node with m3gim-ontology:atDate and its role. The set remains
# because an "ort,datum" composite inherits its role to both halves and a date
# role on the place half says nothing (see the ort branch).
DATE_ONLY_ROLES = frozenset({
    "erstelldatum",
    "absendedatum",
    "empfangsdatum",
    "ausstellungsdatum",
    "erscheinungsdatum",
    "abreisedatum",
    "auftritt",
    "auftrittsdatum",
    "aufführung",
    "auffuehrungsdatum",
    "probe",
    "probendatum",
    "probenbeginn",
    "premiere",
    "premieredatum",
    "ausstrahlung",
    "ausstrahlungsdatum",
    "spielzeit",
    "überweisung",
    "ueberweisungsdatum",
    "gespräch",
    "gespraechsdatum",
})

# The one date role that produces no annotation node on the document: the
# creation dating lives on the RiC-O term rico:creationDate there.
CREATION_DATE_ROLE = "erstelldatum"

# Pipeline-internal scratch key on the record, never serialized. Holds a
# malformed creation dating until @id collision resolution has run.
PENDING_CREATION_DATE = "_malformed_creation_date"

# Mobility place roles (E-97): each produces a dateless m3gim-ontology:Annotation
# (first-class mobility event for the mobility atlas). Vocabulary completeness
# per data.md § 4/§ 10 — the current export uses zielort/absendeort/abreiseort;
# empfangsort/vertragsort scaffold for a deeper export. wohnort is NOT a point
# event (a state with validity) and is deliberately absent from this set.
MOBILITY_PLACE_ROLES = {
    "zielort", "absendeort", "abreiseort", "empfangsort", "vertragsort",
}

# Contract status (data-model.md § 11, E-99): the source marks an unfulfilled
# contract via the rolle column as "nicht eingehalten", propagated column-wide
# across the whole contract block (e.g. NIM_023). This is NOT an event/place
# role: a place or an ort,datum event cannot be "nicht eingehalten". We filter
# the status out as a role so no pseudo-role arises (routing fix). The
# contractStatus modelling (contractStatus/realized on the contract record) is
# not built out for lack of test/frontend demand and remains to be settled with
# the cataloguing team.
CONTRACT_STATUS_ROLES = {"nicht eingehalten"}

# Document type mapping (German → m3gim-vocab)
DOKUMENTTYP_TO_DFT = {
    "korrespondenz": "m3gim-vocab:correspondence",
    "brief": "m3gim-vocab:letter",
    "postkarte": "m3gim-vocab:postcard",
    "telegramm": "m3gim-vocab:telegram",
    "presse": "m3gim-vocab:press",
    "zeitungsausschnitt": "m3gim-vocab:newspaperClipping",
    "kritik": "m3gim-vocab:critique",
    "rezension": "m3gim-vocab:review",
    # Program hierarchy: one canonical concept, the finer genre names stay
    # accepted source values as synonyms (decision template § 3).
    "programm": "m3gim-vocab:program",
    "programmheft": "m3gim-vocab:program",
    "konzertprogramm": "m3gim-vocab:program",
    "biographisch": "m3gim-vocab:biographical",
    "biographie": "m3gim-vocab:biography",
    "autobiografie": "m3gim-vocab:autobiography",
    "lebenslauf": "m3gim-vocab:curriculumVitae",
    "identitaetsdokument": "m3gim-vocab:identityDocument",
    "ausweis": "m3gim-vocab:identityCard",
    "sammlung": "m3gim-vocab:collection",
    "konvolut": "m3gim-vocab:bundle",
    "vertrag": "m3gim-vocab:contract",
    "plakat": "m3gim-vocab:poster",
    "tontraeger": "m3gim-vocab:soundCarrier",
    "studienunterlagen": "m3gim-vocab:document",
    "repertoire": "m3gim-vocab:repertoireList",
    "repertoireliste": "m3gim-vocab:repertoireList",
    "tagebuch": "m3gim-vocab:diary",
    "notizbuch": "m3gim-vocab:note",
    "notiz": "m3gim-vocab:note",
    "urkunde": "m3gim-vocab:certificate",
    "zeugnis": "m3gim-vocab:certificate",
    "widmung": "m3gim-vocab:document",
    "fotografie": "m3gim-vocab:photograph",
    "photokopie": "m3gim-vocab:photocopy",
    "quittung": "m3gim-vocab:receipt",
    "typoskript": "m3gim-vocab:typescript",
    "visitenkarte": "m3gim-vocab:businessCard",
    "noten": "m3gim-vocab:sheetMusic",
    # E-101: new concepts (active with the deeper export; April data lacks them)
    "briefumschlag": "m3gim-vocab:envelope",
    "musikzeitschrift": "m3gim-vocab:musicPeriodical",
    "chronik": "m3gim-vocab:chronicle",
    "verzeichnis": "m3gim-vocab:inventory",
    "dokument": "m3gim-vocab:document",
    "sonstiges": "m3gim-vocab:other",
}

# SKOS hierarchy of document types (DFT scheme in vocab/m3gim.ttl). Key is a
# concept, value its direct broader concept (skos:broader). Concepts without
# an entry are top-level.
DFT_BROADER = {
    "letter": "correspondence",
    "postcard": "correspondence",
    "telegram": "correspondence",
    "envelope": "correspondence",  # E-101
    "newspaperClipping": "press",
    "critique": "press",
    "review": "press",
    "musicPeriodical": "press",  # E-101
    "biography": "biographical",
    "autobiography": "biographical",
    "curriculumVitae": "biographical",
    "chronicle": "biographical",  # E-101
    "identityCard": "identityDocument",
}
# E-101: 'sammlung' and 'verzeichnis' deliberately stay without broader (the
# is-a relation of sammlung to konvolut is not prejudged, data-model.md § 12).

# Readable German labels for skos:prefLabel of the document type concepts
# (E-101). Replaces the frontend hand table DOKUMENTTYP_LABELS; values are
# identical to it so the frontend rebuild does not change the display.
DFT_LABELS = {
    "document": "Dokument",
    "bundle": "Konvolut",
    "collection": "Sammlung",
    "correspondence": "Korrespondenz",
    "letter": "Brief",
    "postcard": "Postkarte",
    "telegram": "Telegramm",
    "envelope": "Briefumschlag",
    "press": "Presse",
    "newspaperClipping": "Zeitungsausschnitt",
    "critique": "Kritik",
    "review": "Rezension",
    "musicPeriodical": "Musikzeitschrift",
    "program": "Programm",
    "contract": "Vertrag",
    "poster": "Plakat",
    "photograph": "Fotografie",
    "note": "Notiz",
    "typescript": "Typoskript",
    "photocopy": "Photokopie",
    "certificate": "Urkunde",
    "businessCard": "Visitenkarte",
    "receipt": "Quittung",
    "sheetMusic": "Noten",
    "repertoireList": "Repertoireliste",
    "biographical": "Biographisch",
    "biography": "Biographie",
    "autobiography": "Autobiografie",
    "curriculumVitae": "Lebenslauf",
    "chronicle": "Chronik",
    "identityDocument": "Identitätsdokument",
    "identityCard": "Ausweis",
    "inventory": "Verzeichnis",
    "diary": "Tagebuch",
    "soundCarrier": "Tonträger",
    "other": "Sonstiges",
}

# Header-shift corrections and currency/Bearbeitungsstand defaults come from
# _common.py (INDEX_HEADER_SHIFTS, FINANCE_CURRENCY_DEFAULTS,
# normalize_bearbeitungsstand). See knowledge/data.md § 17.


def normalize_str(value) -> str | None:
    """Trimmed string or None for empty/NaN values."""
    if pd.isna(value) or str(value).strip() == "":
        return None
    return str(value).strip()


def normalize_lower(value) -> str | None:
    """Trimmed lowercase string or None for empty/NaN values."""
    if pd.isna(value) or str(value).strip() == "":
        return None
    return str(value).strip().lower()


def build_dft_concepts(records: list) -> list:
    """SKOS concept nodes for all document type concepts actually in use.

    Adds skos:broader per the DFT scheme in vocab/m3gim.ttl. Only used
    concepts are emitted (sparse graph); transitive parents are pulled in
    ("brief" brings "korrespondenz").
    """
    used = set()
    for r in records:
        dft = r.get("rico:hasDocumentaryFormType")
        if isinstance(dft, dict):
            ident = dft.get("@id", "")
            if ident.startswith("m3gim-vocab:"):
                used.add(ident.split(":", 1)[1])

    to_process = list(used)
    while to_process:
        concept = to_process.pop()
        broader = DFT_BROADER.get(concept)
        if broader and broader not in used:
            used.add(broader)
            to_process.append(broader)

    concepts = []
    for concept in sorted(used):
        node = {
            "@id": f"m3gim-vocab:{concept}",
            "@type": "skos:Concept",
            # E-101: readable German label instead of the bare slug.
            "skos:prefLabel": DFT_LABELS.get(concept, concept),
        }
        if concept in DFT_BROADER:
            node["skos:broader"] = {"@id": f"m3gim-vocab:{DFT_BROADER[concept]}"}
        meta = CONCEPT_META.get(node["@id"], {})
        if meta.get("definition"):
            node["skos:definition"] = meta["definition"]
        if meta.get("scheme"):
            node["skos:inScheme"] = {"@id": meta["scheme"]}
        concepts.append(node)
    return concepts


def build_role_concepts(nodes: list) -> list:
    """SKOS concept nodes for every role used in the graph.

    At its usage site the role is an IRI with an embedded label (E-137). Its
    definition belongs once at the concept, not at each of the thousands of
    sites; the UI explains the term from there without a second explanatory
    text (E-143).
    """
    used: dict[str, str] = {}

    def walk(node):
        if isinstance(node, dict):
            role = node.get("role")
            if isinstance(role, dict):
                ident = role.get("@id", "")
                if ident.startswith("m3gim-vocab:"):
                    # Label comes from the usage site so node and display
                    # cannot drift apart.
                    used.setdefault(ident, role.get("skos:prefLabel") or "")
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(nodes)
    concepts = []
    for ident in sorted(used):
        meta = CONCEPT_META.get(ident, {})
        role_meta = ROLE_META.get(ident, {})
        # A concept without a definition is still emitted once it carries a
        # dating scope or rank: both are structural and needed, while the
        # explanatory text may be absent (E-150).
        if not meta.get("definition") and not role_meta:
            continue
        node = {
            "@id": ident,
            "@type": "skos:Concept",
            "skos:prefLabel": used[ident] or ident.split(":", 1)[1],
        }
        if meta.get("definition"):
            node["skos:definition"] = meta["definition"]
        if meta.get("scheme"):
            node["skos:inScheme"] = {"@id": meta["scheme"]}
        # Scope and rank live on the concept so the UI does not have to keep
        # them as a second table (E-150).
        if role_meta.get("scope"):
            node["m3gim-ontology:datingScope"] = {"@id": role_meta["scope"]}
        if role_meta.get("rank") is not None:
            node["m3gim-ontology:datingRank"] = role_meta["rank"]
        concepts.append(node)
    return concepts


def normalize_role(value) -> str | None:
    """Normalizes role labels: lower + strip + remove gender suffix.

    Strips :innen and :in (saenger:in -> saenger). A final 'in' without colon
    is not removed generally because it is ambiguous (interpret, ...);
    extendable via a stem allowlist if needed. See data.md § 5.
    """
    v = normalize_lower(value)
    if v is None:
        return None
    for suffix in (":innen", ":in"):
        if v.endswith(suffix):
            v = v[: -len(suffix)]
            break
    return v


def attach_role(target: dict, value) -> None:
    """Sets a node's role as a reference to its concept in the vocabulary.

    The reference node carries the concept's skos:prefLabel so a consumer has
    the display text without a lookup. If the recorded value maps to a
    different concept in the vocabulary, it stays in
    m3gim-ontology:derivedFromRole so the merge remains reversible. If the
    source records no role, the node carries none.

    A value outside the vocabulary stays as a literal. This covers the
    contract status "nicht eingehalten", which sits in the role column and is
    explicitly not a role concept per the vocabulary; its modelling is open
    with the cataloguing team (data-model.md § 11).
    """
    if not value:
        return
    key = str(value).strip().lower()
    if not key:
        return
    concept = ROLE_CONCEPTS.get(key)
    if concept is None:
        target["role"] = key
        return
    curie, pref_label = concept
    target["role"] = {"@id": curie, "skos:prefLabel": pref_label}
    if key != pref_label:
        target["m3gim-ontology:derivedFromRole"] = key


# "No date" placeholders: "ohne Datum" (attested) plus the established archival
# short form "o. D."/"o.d." (case-insensitive, arbitrary inner whitespace).
_NO_DATE_PLACEHOLDER = re.compile(
    r"^(?:ohne\s+datum|o\.?\s*d\.?)$", re.IGNORECASE
)


def clean_date(value) -> str | None:
    """Removes date artefacts (Excel 00:00:00) and normalizes spans.

    YYYY-YYYY (a season) becomes YYYY/YYYY (ISO-8601 time span, data.md § 6).
    Free-text values like 'Wien, ab 1956' stay unchanged — the pipeline filters
    them out by pattern match before they reach typed date properties.
    """
    if pd.isna(value):
        return None
    s = str(value).strip()
    s = re.sub(r'\s+00:00:00$', '', s)
    if s == "":
        return None
    # "No date" placeholders (data.md § 6): "ohne Datum"/"o. D." is NOT a date
    # and must not land in rico:date (breaks the JSON-LD schema). Map to None.
    if _NO_DATE_PLACEHOLDER.match(s):
        return None
    # YYYY-YYYY -> YYYY/YYYY (ISO convention for year-only spans)
    s = re.sub(r'^(\d{4})-(\d{4})$', r'\1/\2', s)
    return s


# Accepted typed date values: ISO-8601 + time span + qualifier
ISO_DATE_PATTERN = re.compile(
    r"^(circa:|vor:|nach:)?\d{4}(-\d{2}(-\d{2})?)?(/\d{4}(-\d{2}(-\d{2})?)?)?$"
)


def is_iso_date(value) -> bool:
    return isinstance(value, str) and bool(ISO_DATE_PATTERN.match(value))


# Date routing normalization (data.md § 6, E-102). Maps text notations to ISO
# representations before the annotation gets its value. Lossless: unrecognized
# notations stay unchanged and carry the datierung-malformed flag instead.
_RANGE_BIS = re.compile(r"^(.+?)\s+bis\s+(.+)$", re.IGNORECASE)
_FREITEXT_BEGINN = re.compile(
    r"^(?:ab|seit)\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)$", re.IGNORECASE
)


def normalize_dating(value: str) -> str:
    """Normalizes date notations per the routing table (data.md § 6).

    - "X bis Y" → ISO time span "X/Y" (only if both sides are ISO)
    - "ab/seit YYYY" → qualifier "nach:YYYY"
    otherwise unchanged.
    """
    if not isinstance(value, str):
        return value
    s = value.strip()
    m = _RANGE_BIS.match(s)
    if m and is_iso_date(m.group(1).strip()) and is_iso_date(m.group(2).strip()):
        return f"{m.group(1).strip()}/{m.group(2).strip()}"
    m = _FREITEXT_BEGINN.match(s)
    if m:
        return f"nach:{m.group(1)}"
    return s


# Data quality flags from anmerkung signals (data-model.md § 7, E-102). The
# vocabulary is derived from the actual anmerkung entries, not extrapolated
# (guardrail 'verify foreign terms'): "Name nicht eindeutig auffindbar",
# "Vorname fehlt"/"ohne Vornamen", "Rolle Unsicher: ..."/"(??)",
# "Tippfehler uebernommen".
_QUALITY_FLAG_SIGNALS = [
    (re.compile(r"name nicht eindeutig", re.IGNORECASE), "name-nicht-eindeutig"),
    (re.compile(r"vorname[n]?\s+fehlt|ohne\s+vorname", re.IGNORECASE), "vorname-fehlt"),
    (re.compile(r"rolle\s+unsicher|\(\?\?\)", re.IGNORECASE), "rolle-unsicher"),
    (re.compile(r"tippfehler", re.IGNORECASE), "quelle-tippfehler"),
]


def quality_flags(anmerkung) -> list[str]:
    """Derives controlled data quality flags from an anmerkung free text.
    Returns a deduplicated, stably ordered list (empty if no signal matches).
    No fabricated confidence — the flag is the signal."""
    if not isinstance(anmerkung, str) or not anmerkung.strip():
        return []
    found = [flag for rx, flag in _QUALITY_FLAG_SIGNALS if rx.search(anmerkung)]
    # Keep the signal list order as the stable output order.
    seen = set()
    return [f for f in found if not (f in seen or seen.add(f))]


def create_record_id(signatur: str, folio: str = None) -> str:
    """URI from Signatur (+ Folio)."""
    # UAKUG/NIM_028 → m3gim-data:NIM_028
    # UAKUG/NIM_003 + 1_1 → m3gim-data:NIM_003_1_1
    # UAKUG/NIM/PL_07 → m3gim-data:NIM_PL_07
    clean = signatur.replace("UAKUG/", "").replace("/", "_")
    if folio:
        clean = f"{clean}_{folio.replace(' ', '_')}"
    return f"m3gim-data:{clean}"


def normalize_signatur(sig: str) -> str:
    """Zero-pads the NIM Konvolut number to three digits (NIM_11 -> NIM_011).

    The Verknuepfungen table records a Konvolut with two digits, the Objekte
    table with three; without alignment the Verknuepfungen miss their record
    and are lost. PL_xx and other forms stay untouched.
    """
    return re.sub(r'NIM_(\d{1,3})\b',
                  lambda m: f"NIM_{int(m.group(1)):03d}", sig)


def load_index(name: str) -> pd.DataFrame | None:
    """Loads an index with header-shift correction.

    Two malformation classes from the box export (E-95):

    (a) name column without header — person index: position 0 carries the real
        header "m3gim_id", but the name column (position 1) is empty and
        becomes "Unnamed: 1" in pandas. Row 0 is a genuine header row; NO data
        row may be consumed as header. Columns are renamed positionally to the
        canon.

    (b) leaked data value in the header row — Org/Werk: position 1 (or 3)
        carries a data value like "Graz"/"Rossini, Gioachino" instead of a
        real header. Position 0 is still "m3gim_id", i.e. row 0 remains a
        (contaminated) header row, not a lost data row. So again only rename
        columns — the leaked single cells are lost (passed through; same
        behaviour as the prod export).
    """
    path = SHEETS_DIR / f"M3GIM-{name}.xlsx"
    if not path.exists():
        return None

    df = pd.read_excel(path)
    canonical = name.lower()

    if canonical in INDEX_HEADER_SHIFTS:
        expected = INDEX_HEADER_SHIFTS[canonical]
        col0 = str(df.columns[0]).strip().lower() if len(df.columns) else ""
        if col0 == "m3gim_id":
            # Row 0 is a genuine (possibly contaminated) header row: only
            # rename columns positionally to the canon, consume no data row as
            # header. Preserves any extra trailing columns.
            new_cols = list(expected[:len(df.columns)])
            if len(df.columns) > len(expected):
                new_cols += list(df.columns[len(expected):])
            df.columns = new_cols
        elif len(df.columns) == len(expected):
            # Legacy case: row 0 is a shifted data row that pandas read as
            # header (position 0 != "m3gim_id"). Push it back into the data.
            first_val = str(df.columns[1]) if len(df.columns) > 1 else ""
            if first_val and first_val not in ["name", "titel", "ort", "m3gim_id"]:
                old_headers = list(df.columns)
                df.columns = expected[:len(df.columns)]
                first_row = pd.DataFrame([old_headers], columns=df.columns)
                df = pd.concat([first_row, df], ignore_index=True)

    # (c) id column overwritten with a data value — the Ortsindex of the
    # 2026-08-31 delivery carries the place name "Turin" at position 0 instead
    # of "m3gim_id". Neither branch above fires, because position 0 is not
    # "m3gim_id" and position 1 is on the exception list. Only column 0 is
    # renamed back positionally, and only if its values look like index ids;
    # the remaining headers stay untouched so no note column mistakenly
    # becomes wikidata_id (E-152).
    if len(df.columns) and str(df.columns[0]).strip().lower() != "m3gim_id":
        col0 = df.columns[0]
        sample = df[col0].dropna().astype(str).str.strip().head(10)
        if len(sample) and all(re.match(r"^[A-Za-z]\d+$", s) for s in sample):
            print(f"  {name}: Kopfzelle der Kennungsspalte traegt '{col0}', "
                  "positionell auf 'm3gim_id' zurueckbenannt")
            df = df.rename(columns={col0: "m3gim_id"})

    return df


# Fields carrying exactly one value per identity, plus the one multi-valued
# field. M1: pass curated index fields through so ALL maintained data reaches
# the frontend. Each index type only has its own applicable columns
# (org: ort + assoziierte_person; person: lebensdaten; werk: rolle_stimme).
_INDEX_SCALAR_FIELDS = (
    "wikidata_id", "gnd_id", "anmerkung", "komponist",
    "lebensdaten", "ort", "rolle_stimme",
)
_INDEX_MULTI_FIELDS = ("assoziierte_person",)


def _index_row_values(row: pd.Series, columns) -> dict:
    """Non-empty index fields of a row as trimmed strings."""
    values = {}
    for col in _INDEX_SCALAR_FIELDS + _INDEX_MULTI_FIELDS:
        if col not in columns:
            continue
        raw = row.get(col)
        if pd.isna(raw):
            continue
        val = str(raw).strip()
        if val:
            values[col] = val
    return values


def build_index_lookup(df: pd.DataFrame) -> dict:
    """Builds the lookup dictionary: name → {wikidata_id, ...} (data.md § 3).

    The earlier version wrote one entry per name in source order; on equal
    names the last row won entirely. The 2026-08-31 delivery lists the fonds
    creator twice in the person index, the second row without id and without
    life dates; it thus cost the central person of the fonds her Wikidata id
    including enrichment.

    Three rules resolve this deterministically (E-152).

    Identity. An ``m3gim_id`` is the identity. A row without id joins the
    group that records the same name under an id, otherwise the trimmed name
    is the identity.

    Consolidation. Per field the first non-empty value in source order wins; a
    filled field is never overwritten by an empty one. ``assoziierte_person``
    is multi-valued and accumulates.

    Collision. Different non-empty values in the same field set
    ``index_conflict``; the first value wins and the case reaches the report
    via ``validate.py``. Two rows with the same name and different ids are a
    name collision; in the Werkindex it stays unresolved because ``Requiem``
    and ``Stabat mater`` each denote three different works.
    """
    lookup: dict = {}
    if df is None:
        return lookup
    name_col = 'name' if 'name' in df.columns else 'titel'
    if name_col not in df.columns:
        return lookup
    columns = set(df.columns)
    has_id = 'm3gim_id' in columns
    is_work_index = 'komponist' in columns

    # Pre-pass: first id per name, so a straggler row without id joins the
    # maintained row's group instead of forming its own.
    first_id_for_name: dict = {}
    if has_id:
        for _, row in df.iterrows():
            name = normalize_str(row.get(name_col))
            ident = row.get('m3gim_id')
            if name is None or pd.isna(ident):
                continue
            key = str(ident).strip()
            if key:
                first_id_for_name.setdefault(name.lower(), key)

    groups: dict = {}
    order: list = []
    for _, row in df.iterrows():
        name = normalize_str(row.get(name_col))
        if name is None:
            continue
        low = name.lower()
        ident = None
        if has_id and pd.notna(row.get('m3gim_id')):
            raw_id = str(row['m3gim_id']).strip()
            if raw_id:
                ident = ("id", raw_id)
        if ident is None:
            ident = ("id", first_id_for_name[low]) if low in first_id_for_name else ("name", low)

        group = groups.get(ident)
        if group is None:
            group = {"name": name, "scalar": {}, "multi": {}, "conflicts": {}}
            groups[ident] = group
            order.append(ident)

        for field, value in _index_row_values(row, columns).items():
            if field in _INDEX_MULTI_FIELDS:
                bucket = group["multi"].setdefault(field, [])
                if value not in bucket:
                    bucket.append(value)
                continue
            previous = group["scalar"].get(field)
            if previous is None:
                group["scalar"][field] = value
            elif previous != value:
                clash = group["conflicts"].setdefault(field, [previous])
                if value not in clash:
                    clash.append(value)

    by_name: dict = {}
    for ident in order:
        group = groups[ident]
        entry = {"name": group["name"]}
        entry.update(group["scalar"])
        for field, values in group["multi"].items():
            entry[field] = "; ".join(values)
        if group["conflicts"]:
            entry["index_conflict"] = True
            entry["index_conflict_fields"] = {k: list(v) for k, v in group["conflicts"].items()}
        if ident[0] == "id":
            entry["m3gim_id"] = ident[1]
        by_name.setdefault(group["name"].lower(), []).append(entry)

    for low, entries in by_name.items():
        if len(entries) == 1:
            lookup[low] = entries[0]
            continue
        # Name collision: the name denotes more than one identity.
        if is_work_index:
            # The title alone is no identity. Without a composer in the
            # Verknuepfungen row the assignment stays open; a guessed composer
            # would be a fabricated statement.
            lookup[low] = {
                "name": entries[0]["name"],
                "ambiguous": True,
                "candidates": [
                    {k: v for k, v in e.items()
                     if k in ("name", "komponist", "wikidata_id", "m3gim_id")}
                    for e in entries
                ],
            }
            continue
        winner = dict(entries[0])
        winner["name_collision"] = True
        winner["collision_candidates"] = [e.get("m3gim_id") for e in entries]
        lookup[low] = winner

    return lookup


def convert_objekt(row: pd.Series, folio_col: str = None,
                   xlsx_row: int | None = None) -> dict:
    """Converts an Objekt row to a JSON-LD record.

    xlsx_row: 1-based XLSX row number incl. header (= pandas idx + 2),
              attached as m3gim-ontology:xlsxSource.
    """
    sig = str(row['archivsignatur']).strip()
    folio_raw = row.get(folio_col) if folio_col else None
    folio = str(folio_raw).strip() if pd.notna(folio_raw) and str(folio_raw).strip() else None

    record = {
        "@id": create_record_id(sig, folio),
        "@type": "rico:Record",
        "rico:identifier": f"{sig} {folio}" if folio else sig
    }

    if xlsx_row is not None:
        record["m3gim-ontology:xlsxSource"] = build_xlsx_source("Objekte", xlsx_row)

    titel = normalize_str(row.get('titel'))
    if titel:
        record["rico:title"] = titel

    # rico:date is ISO-typed in the JSON schema; a malformed source value
    # (e.g. "06-09" without year) must not land there. ISO values go to
    # rico:date, non-ISO is kept losslessly as an annotation node with role
    # entstehungsdatum and marked as a source data error. The node is built
    # only after @id collision resolution in build_konvolut_hierarchy, because
    # its id carries the document's.
    date_val = clean_date(row.get('entstehungsdatum'))
    if date_val:
        if is_iso_date(date_val):
            record["rico:date"] = date_val
        else:
            record[PENDING_CREATION_DATE] = date_val

    # Dating evidence is deliberately NOT serialized (E-106, replaces E-100).
    # The former agrelon:metadataConfidence decimals (1.0/0.8/0.6) were a
    # fabricated projection of the categorical datierungsevidenz column
    # (aus_dokument/erschlossen/extern) — no measured value, against the
    # guardrail "do not fabricate confidence". Nothing in frontend/report read
    # them. If dating evidence is needed later it returns as a categorical
    # value, not a decimal. data-model.md § 9.

    dokumenttyp = normalize_lower(row.get('dokumenttyp'))
    if dokumenttyp:
        dft = DOKUMENTTYP_TO_DFT.get(dokumenttyp)
        if dft:
            record["rico:hasDocumentaryFormType"] = {"@id": dft}
        else:
            # Without this the record silently loses its type and drops out of
            # every type-based view; name value and source cell instead.
            where = record["rico:identifier"]
            if xlsx_row is not None:
                where += f", Objekte.xlsx Zeile {xlsx_row}"
            print(f"  WARNUNG: Dokumenttyp '{dokumenttyp}' ohne Eintrag in "
                  f"DOKUMENTTYP_TO_DFT — {where}")

    sprache = normalize_str(row.get('sprache'))
    if sprache:
        record["rico:hasOrHadLanguage"] = sprache

    umfang = normalize_str(row.get('umfang'))
    if umfang:
        record["rico:hasExtent"] = umfang

    beschreibung = normalize_str(row.get('beschreibung'))
    if beschreibung:
        record["rico:scopeAndContent"] = beschreibung

    # Bearbeitungsstand (m3gim extension) — mapping in _common.py.
    # E-102: split the free-text suffix into a separate processing note,
    # the canonical status stays in m3gim-ontology:processingStatus.
    bearbeitungsstand = normalize_bearbeitungsstand(row.get('bearbeitungsstand'))
    if bearbeitungsstand:
        record["m3gim-ontology:processingStatus"] = bearbeitungsstand
    bearbeitungsnotiz = extract_bearbeitungsnotiz(row.get('bearbeitungsstand'))
    if bearbeitungsnotiz:
        record["m3gim-ontology:processingNote"] = bearbeitungsnotiz

    zugaenglichkeit = normalize_lower(row.get('zugaenglichkeit'))
    if zugaenglichkeit:
        record["m3gim-ontology:accessStatus"] = zugaenglichkeit

    scan_status = normalize_lower(row.get('scan_status'))
    if scan_status:
        record["m3gim-ontology:digitizationStatus"] = scan_status

    return record


def build_konvolut_hierarchy(df: pd.DataFrame, folio_col: str = None,
                             annotation_seen: dict | None = None
                             ) -> tuple[list, list, list]:
    """Detects Konvolute and builds the hierarchy.

    Args:
        annotation_seen: shared registry of assigned annotation @ids, so the
            nodes built here and those built in add_relations_to_records never
            settle on the same id.

    Returns:
        records: all records (single objects + folios)
        konvolute: Konvolut record sets
        annotations: annotation nodes from malformed creation datings
    """
    if annotation_seen is None:
        annotation_seen = {}
    records = []
    konvolut_members = {}  # {signatur: [record_ids]}

    for idx, row in df.iterrows():
        if pd.isna(row.get('archivsignatur')) or str(row['archivsignatur']).strip() == "":
            continue
        # Skip template rows
        if str(row['archivsignatur']).strip().lower() == "beispiel":
            continue

        sig = str(row['archivsignatur']).strip()
        folio_raw = row.get(folio_col) if folio_col else None
        folio = str(folio_raw).strip() if pd.notna(folio_raw) and str(folio_raw).strip() else None

        # Skip empty placeholder rows (only Signatur/box_nr, no Folio, no
        # content): they are no object and, lacking a Folio, would all land on
        # the same collection @id (source artefact, e.g. NIM_137). A row with
        # Folio or with title/type/date/status stays.
        if not folio:
            _content_cols = ('titel', 'dokumenttyp', 'entstehungsdatum',
                             'Bearbeitungsstand')
            if not any(pd.notna(row.get(c)) and str(row.get(c)).strip()
                       for c in _content_cols):
                continue

        # XLSX row number: pandas idx is 0-based, XLSX header is row 1
        record = convert_objekt(row, folio_col, xlsx_row=int(idx) + 2)
        records.append(record)

        if folio:
            if sig not in konvolut_members:
                konvolut_members[sig] = []
            konvolut_members[sig].append(record["@id"])

    konvolute = []
    for sig, member_ids in konvolut_members.items():
        konvolut = {
            "@id": create_record_id(sig),
            "@type": "rico:RecordSet",
            "rico:hasRecordSetType": {"@id": "ric-rst:File"},
            "rico:identifier": sig,
            "rico:hasOrHadPart": [{"@id": mid} for mid in member_ids]
        }
        konvolute.append(konvolut)

    # Collision resolution (see knowledge/data.md § 17): if a Signatur has
    # both a collection row (no Folio) and Folio rows, the collection record
    # shares its @id with the record set. The collection row gets a
    # _collection suffix and is attached to the Konvolut as meta member.
    konvolut_ids = {k["@id"] for k in konvolute}
    for rec in records:
        if rec["@id"] in konvolut_ids and rec.get("@type") == "rico:Record":
            old_id = rec["@id"]
            new_id = f"{old_id}_collection"
            rec["@id"] = new_id
            konv = next(k for k in konvolute if k["@id"] == old_id)
            konv["rico:hasOrHadPart"].append({"@id": new_id})

    # Materialize malformed creation datings as annotation nodes. Only here,
    # because the node's @id carries the document's, which may have changed
    # above.
    annotations = []
    for rec in records:
        date_val = rec.pop(PENDING_CREATION_DATE, None)
        if not date_val:
            continue
        node = build_annotation(rec, annotation_seen, date=date_val,
                                role="entstehungsdatum")
        node["m3gim-ontology:dataQualityFlag"] = "datierung-malformed"
        # The source cell is the date column of the same Objekte row.
        source = rec.get("m3gim-ontology:xlsxSource")
        if source:
            node["m3gim-ontology:xlsxSource"] = source
        annotations.append(node)

    return records, konvolute, annotations


# Fallback currency per Archivsignatur prefix lives in _common.py
# (FINANCE_CURRENCY_DEFAULTS + default_currency_for). See knowledge/data.md
# § 17 for the editorial assumptions.


# Numeric head of a raw finance value: leading digits with '.' (thousands)
# and ',' (decimal). Matches "1.200", "631,50", "200,00", "50000".
_AMOUNT_HEAD = re.compile(r"^\s*([\d.,]+)")


def _parse_amount_token(token: str) -> str | None:
    """Converts a raw numeric token to an xsd:decimal string.

    Convention (data-model.md § 11, European): '.' is the thousands separator,
    ',' the decimal separator. A trailing comma before the currency is already
    stripped here; a remaining ',NN' is a genuine decimal fraction.
    """
    token = token.strip().rstrip(",").strip()
    if not token:
        return None
    cleaned = token.replace(".", "").replace(",", ".")
    try:
        amount_decimal = float(cleaned)
    except ValueError:
        return None
    if amount_decimal == int(amount_decimal):
        return str(int(amount_decimal))
    return f"{amount_decimal:g}"


def _parse_single_monetary(segment: str) -> tuple[str | None, str | None]:
    """Splits ONE amount segment (no double amount) into (amount, currency)."""
    s = segment.strip()
    if not s:
        return None, None
    head = _AMOUNT_HEAD.match(s)
    if not head:
        # No numeric head -> not parseable as amount.
        return None, None
    num_token = head.group(1)
    rest = s[head.end():].strip()
    # 'rest' may start with the currency separator (comma) -> strip it.
    rest = rest.lstrip(",").strip()
    currency = rest.rstrip(".").strip() or None
    return _parse_amount_token(num_token), currency


def parse_monetary_values(name: str) -> list[tuple[str | None, str | None]]:
    """Splits a raw finance value into a list of (amount, currency).

    Robust against the mixed notations in the source (data-model.md § 11):
      - 'AMOUNT, CURRENCY'     : '4000, Esc', '1.200, DM'  (comma+space separator)
      - 'AMOUNT,DEC, CURRENCY' : '631,50, Fr.'             (decimal comma THEN separator comma)
      - 'AMOUNT,DEC CURRENCY'  : '1500,00 DM', '200,00 Belgische Francs'
                                                           (decimal comma, space, currency)
      - 'AMOUNT,CURRENCY'      : '153,DM'                  (comma without space as separator)
      - 'AMOUNT CURRENCY'      : '50000 Lire'              (space separator without comma)
      - 'AMOUNT'               : '36000', '18.000'         (no currency)
      - double amount '25, DM/45, DM' -> two independent entries.

    Per-segment strategy: detach the numeric head (digits + '.'/',') from the
    rest, read the rest as currency. A ',NN' suffix in the head is a genuine
    decimal fraction and stays part of the amount; '.' groups are thousands.
    """
    if not name:
        return [(None, None)]
    s = str(name).strip()
    if not s:
        return [(None, None)]
    # Split double amounts at '/' (data-model.md § 11): each part becomes its
    # own entry with the same detailField. Only segments with a numeric head count.
    segments = [seg for seg in s.split("/") if seg.strip()]
    parsed = [_parse_single_monetary(seg) for seg in segments]
    parsed = [p for p in parsed if p[0] is not None]
    return parsed or [_parse_single_monetary(s)]


def parse_monetary_value(name: str) -> tuple[str | None, str | None]:
    """First (amount, currency) entry of a raw finance value.

    Thin wrapper around parse_monetary_values for callers/tests expecting a
    single amount (double amounts yield the first part).
    """
    return parse_monetary_values(name)[0]


def decompose_komposit_typ(typ: str) -> list[str]:
    """Decomposes a composite type: 'ort, datum' → ['ort', 'datum'].

    E-95 normalization: the typ "rolle, Vorname Nachname Saenger*in" (mostly
    Box 5) is a leaked cataloguing instruction, not a real type value. Its
    name values are real role,person pairs (e.g. "Siegfried, Bernd Aldenoff").
    We map it to the canonical composite "rolle, person" so those rows take
    the same decompose path as genuine rolle,person composites (groundwork for
    E-96 Performance/StageRole). Structural absorption, no content change.

    Underscore is an equivalent composite separator: Google Sheets dropdowns
    cannot carry a comma in the value, so the cataloguing team's dropdown
    rebuild exports "Datum, Ort" as "Datum_Ort".
    """
    parts = [t.strip().lower() for t in re.split(r"[,_]", typ)]
    # Leaked cataloguing instruction -> canonical "rolle, person".
    if (len(parts) == 2 and parts[0] == "rolle"
            and "nger" in parts[1] and parts[1].split()[:2] == ["vorname", "nachname"]):
        return ["rolle", "person"]
    # "waehrung"/"währung" is no type of its own, it belongs to the previous one
    return [p for p in parts if p not in ["waehrung", "währung"]]


def decompose_komposit_value(name: str, typen: list[str]) -> dict[str, str]:
    """Decomposes a composite value into per-type values.

    For 'ort,datum' composites like 'München, 1952-12-17':
    → {'ort': 'München', 'datum': '1952-12-17'}

    Fallback: same value for all types.
    """
    result = {t: name for t in typen}
    if not name or len(typen) < 2:
        return result

    # Pattern: "place name, YYYY..." (place + date)
    if 'ort' in typen and 'datum' in typen:
        m = re.match(r'^(.+?),\s*(\d{4}.*)$', name)
        if m:
            result['ort'] = m.group(1).strip()
            result['datum'] = clean_date(m.group(2).strip())
        else:
            # Free-text start after the comma ("Wien, ab 1956"): split at the
            # first comma and normalize the date ("ab 1956" → "nach:1956",
            # data.md § 6). Adopt only if this yields an ISO value — otherwise
            # no place leak into the date field (audit finding on E-102).
            m2 = re.match(r'^(.+?),\s*(.+)$', name)
            if m2:
                cand = normalize_dating(m2.group(2).strip())
                if is_iso_date(cand):
                    result['ort'] = m2.group(1).strip()
                    result['datum'] = cand

    # Pattern: "stage role, person name" (E-96, rolle,person -> Performance).
    # The first comma separates the stage role from the performer name.
    if 'rolle' in typen and 'person' in typen:
        m = re.match(r'^(.+?),\s*(.+)$', name)
        if m:
            result['rolle'] = m.group(1).strip()
            result['person'] = m.group(2).strip()

    # Pattern: "YYYY..., work title" (E-98, datum,werk -> Performance). Date
    # with leading year before the comma; without a leading year (composer-
    # instead-of-work row) 'datum' stays the raw value and fails the
    # is_iso_date gate.
    if 'datum' in typen and 'werk' in typen:
        m = re.match(r'^(\d{4}[^,]*),\s*(.+)$', name)
        if m:
            result['datum'] = clean_date(m.group(1).strip())
            result['werk'] = m.group(2).strip()

    return result


def _stage_role_slug(name: str) -> str:
    """Deterministic ASCII slug for the StageRole @id (E-96).

    ASCII because the JSON-LD @id pattern only allows [\\w/_.-] and
    JSON-Schema \\w does not match umlauts. ä/ö/ü/ß are transliterated.
    """
    s = name.strip().lower()
    for a, b in [("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")]:
        s = s.replace(a, b)
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s or "rolle"


def _make_stage_role(stage_roles: dict, role_name: str) -> str:
    """Deduplicates an m3gim-ontology:StageRole entity, returns its @id (E-96).

    The shared ``stage_roles`` registry ensures the same stage role (say
    *Brangäne*) gets exactly one node with a deterministic slug @id.
    """
    slug = _stage_role_slug(role_name)
    sid = f"m3gim-data:stagerole_{slug}"
    if sid not in stage_roles:
        stage_roles[sid] = {
            "@id": sid,
            "@type": "m3gim-ontology:StageRole",
            "rico:name": role_name.strip(),
        }
    return sid


VERKNUEPFUNGEN_CSV_DIR = "verknuepfungen"


def resolve_verknuepfungen_source(base: Path) -> Path:
    """Determines the Verknuepfungen source under a source directory.

    Since E-152 the source format is the per-sheet CSV export, because the
    XLSX export converts date, Folio and bundling columns into cell types and
    fabricates precision in the process (data.md § 3 source format). The CSV
    directory wins; if absent, the previous XLSX path applies so an archived
    state remains readable. A directly passed file path is passed through
    unchanged.
    """
    base = Path(base)
    if not base.is_dir():
        return base
    csv_dir = base if base.name == VERKNUEPFUNGEN_CSV_DIR else base / VERKNUEPFUNGEN_CSV_DIR
    if csv_dir.is_dir() and any(csv_dir.glob("Box_*.csv")):
        return csv_dir
    candidates = sorted(base.glob("M3GIM-Verkn*pfungen*.xlsx"))
    if candidates:
        return candidates[0]
    raise FileNotFoundError(
        f"Keine Verknuepfungsquelle unter {base}. Erwartet wird "
        f"{VERKNUEPFUNGEN_CSV_DIR}/Box_*.csv oder eine Verknuepfungs-XLSX."
    )


def _box_order(path: Path) -> tuple:
    """Sorts Box_2 before Box_10 instead of lexicographically."""
    digits = re.findall(r"\d+", path.stem)
    return (int(digits[0]) if digits else 0, path.stem)


def _normalize_verknuepfungen_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Brings the column headers of a sheet onto the canon.

    Column 0 is always the Archivsignatur, recognized positionally because its
    header in the source is empty or a single space. The other headers are
    trimmed and lowercased; non-textual headers stay unchanged and fall
    through the column check below.

    ``data_id`` and ``datenpunkt_id`` denote the same datum and are merged.
    Four sheets of the 2026-08-31 delivery carry the second spelling; without
    the merge ``process_verknuepfungen`` never reads them and the id is lost
    silently (E-152).
    """
    rename: dict = {}
    for pos, col in enumerate(df.columns):
        if pos == 0:
            rename[col] = "archivsignatur"
        elif isinstance(col, str):
            rename[col] = col.strip().lower()
    df = df.rename(columns=rename)
    if "data_id" in df.columns:
        if "datenpunkt_id" in df.columns:
            df["datenpunkt_id"] = df["datenpunkt_id"].fillna(df["data_id"])
            df = df.drop(columns=["data_id"])
        else:
            df = df.rename(columns={"data_id": "datenpunkt_id"})
    return df


def _finish_verknuepfungen_sheet(df: pd.DataFrame, sheet: str) -> pd.DataFrame:
    """Forward-fills the Signatur and adds per-sheet provenance."""
    if "archivsignatur" in df.columns:
        df["archivsignatur"] = df["archivsignatur"].ffill()
        df["archivsignatur"] = df["archivsignatur"].map(
            lambda s: normalize_signatur(s) if isinstance(s, str) else s)
    df["_xlsx_sheet"] = sheet
    df["_xlsx_row"] = [int(i) + 2 for i in range(len(df))]
    return df


def _load_verknuepfungen_csv(directory: Path) -> list[pd.DataFrame]:
    """Reads one CSV file per sheet as text, without type inference.

    ``dtype=str`` is the load-bearing promise of this path: a Folio ``15-1``,
    an id ``1.1`` and a month value ``1956-11`` stay the text the cataloguing
    wrote.
    """
    frames = []
    for path in sorted(directory.glob("Box_*.csv"), key=_box_order):
        df = pd.read_csv(path, dtype=str, encoding="utf-8-sig")
        if df.empty:
            continue
        df = _normalize_verknuepfungen_columns(df)
        # Leere Anhangspalten der Ausfuhr verwerfen.
        drop = [c for c in df.columns
                if isinstance(c, str) and c.startswith("unnamed:") and df[c].isna().all()]
        if drop:
            df = df.drop(columns=drop)
        if not {"typ", "name"}.issubset(df.columns):
            print(f"  Datei '{path.name}' uebersprungen (keine Verknuepfungs-Spalten)")
            continue
        frames.append(_finish_verknuepfungen_sheet(df, path.stem.replace("_", " ")))
    return frames


def _load_verknuepfungen_xlsx(path: Path) -> list[pd.DataFrame]:
    """Liest die Mehrblatt-Arbeitsmappe (Altpfad vor E-152)."""
    frames = []
    xl = pd.ExcelFile(path)
    for sheet in xl.sheet_names:
        df = pd.read_excel(path, sheet_name=sheet)
        if df.empty:
            continue
        df = _normalize_verknuepfungen_columns(df)
        # Sheets ohne Verknuepfungs-Signatur ueberspringen: der Dropdown-Umbau
        # des Erschliessungsteams fuegt dem Workbook versteckte Hilfsblaetter
        # und das Wertlistenblatt hinzu. Eine Verknuepfungszeile braucht
        # mindestens typ + name (Spalte 0 ist positionell die Signatur).
        if not {"typ", "name"}.issubset(df.columns):
            print(f"  Sheet '{sheet}' uebersprungen (keine Verknuepfungs-Spalten)")
            continue
        frames.append(_finish_verknuepfungen_sheet(df, sheet))
    return frames


def load_verknuepfungen(path: Path) -> pd.DataFrame:
    """Laedt die Verknuepfungstabelle als EINE DataFrame ueber alle Blaetter.

    Die Funktion absorbiert drei Quellformen. Ein Quellverzeichnis mit
    ``verknuepfungen/Box_*.csv`` wird als CSV gelesen (E-152, der Regelfall
    seit 2026-08-31), ein Quellverzeichnis ohne dieses Unterverzeichnis ueber
    die Verknuepfungs-XLSX, und ein direkt uebergebener Dateipfad als
    Arbeitsmappe. Der Box-Export verteilt die Verknuepfungen auf mehrere,
    inkonsistent benannte Blaetter (E-95); alle werden geladen und
    zusammengefuehrt.

    Die Provenienz ist in allen Faellen dieselbe. ``_xlsx_sheet`` traegt den
    Blattnamen der Quelle, ``_xlsx_row`` die 1-basierte Zeile inklusive
    Kopfzeile, damit ``process_verknuepfungen`` die Herkunftszeile blattgenau
    aufzeichnet.
    """
    source = resolve_verknuepfungen_source(path)
    frames = (_load_verknuepfungen_csv(source) if source.is_dir()
              else _load_verknuepfungen_xlsx(source))

    if not frames:
        return pd.DataFrame(columns=["archivsignatur", "_xlsx_sheet", "_xlsx_row"])

    # Union der Spalten ueber alle Blaetter.
    return pd.concat(frames, ignore_index=True, sort=False)


def process_verknuepfungen(df: pd.DataFrame, indices: dict) -> dict:
    """Verarbeitet Verknuepfungen und gruppiert nach Signatur.

    Returns:
        dict: {signatur_or_objekt_id: [relation_dicts]}
    """
    relations = {}

    for idx, row in df.iterrows():
        sig = row.get('archivsignatur')
        if pd.isna(sig) or str(sig).strip() == "":
            continue
        sig_str = str(sig).strip()
        if sig_str.lower() == "beispiel":
            continue

        # Folio-Feld pruefen (Spalte heisst oft "Folio" in Verknuepfungen).
        # load_verknuepfungen lowercased die Header -> "folio".
        folio = None
        for col in ['folio', 'Folio', 'Unnamed: 1']:
            if col in df.columns:
                folio_raw = row.get(col)
                if pd.notna(folio_raw) and str(folio_raw).strip():
                    folio_val = str(folio_raw).strip()
                    # Guard: vereinzelt steht die Kopfzeichenkette "Folio"
                    # literal in einer Folio-Datenzelle — keine echte Folio.
                    if folio_val.lower() != "folio":
                        folio = folio_val
                break

        # Objekt-ID: signatur + folio
        objekt_id = f"{sig_str} {folio}" if folio else sig_str

        typ = normalize_lower(row.get('typ'))
        name = normalize_str(row.get('name'))
        rolle = normalize_role(row.get('rolle'))
        datum = clean_date(row.get('datum') if 'datum' in df.columns else None)
        anmerkung = normalize_str(row.get('anmerkung'))

        if typ is None:
            continue

        # Provenance: Sheet-Name + originale XLSX-Zeile + datenpunkt_id.
        # load_verknuepfungen liefert die Herkunft sheet-genau in den
        # Hilfsspalten _xlsx_sheet/_xlsx_row (Box-Export verteilt Zeilen auf
        # mehrere Sheets). Fallback auf "Verknuepfungen"/idx+2, falls die
        # Hilfsspalten fehlen (DataFrame nicht ueber load_verknuepfungen geladen).
        sheet_name = "Verknuepfungen"
        if "_xlsx_sheet" in df.columns and pd.notna(row.get("_xlsx_sheet")):
            sheet_name = str(row.get("_xlsx_sheet"))
        if "_xlsx_row" in df.columns and pd.notna(row.get("_xlsx_row")):
            xlsx_row = int(row.get("_xlsx_row"))
        else:
            xlsx_row = int(idx) + 2  # pandas idx 0-basiert, XLSX-Header in Zeile 1
        dp_raw = row.get('datenpunkt_id') if 'datenpunkt_id' in df.columns else None
        datenpunkt_id = None
        if pd.notna(dp_raw):
            try:
                datenpunkt_id = int(float(dp_raw))
            except (ValueError, TypeError):
                datenpunkt_id = str(dp_raw).strip() or None
        source_info = build_xlsx_source(sheet_name, xlsx_row, datenpunkt_id)

        # Komposit-Typen decomponieren (Komma- und Unterstrich-Trenner).
        # Bedingungslos: decompose_komposit_typ behandelt Einzeltypen korrekt
        # ("person" -> ["person"]) und filtert einen nackten Waehrungs-Typ zur
        # leeren Liste, statt ihn als unverarbeitbare Generic-Relation zu emittieren.
        typen = decompose_komposit_typ(typ)
        # Komposit-Werte decomponieren (z.B. "München, 1952-12-17" → Ort + Datum)
        decomposed = decompose_komposit_value(name, typen) if len(typen) > 1 else {}

        # Komposit ort,datum: zusaetzlich eine Annotations-Relation emittieren
        # (data.md § 4, § 10). Der Annotationsknoten wird in add_relations
        # als Top-Level-Entity gebaut.
        ortdatum_ste_emitted = False
        if 'ort' in typen and 'datum' in typen:
            ort_val = decomposed.get('ort')
            datum_val = decomposed.get('datum')
            if ort_val and datum_val and is_iso_date(datum_val):
                ortdatum_ste_emitted = True
                ste_rel = {
                    "typ": "spatiotemporal",
                    "name": ort_val,  # name wird als Event-Ort verwendet
                    "ort": ort_val,
                    "datum": datum_val,
                    "rolle": rolle,
                    "anmerkung": anmerkung,
                    "_source": source_info,
                }
                # Ortsindex-Lookup, damit der Annotations-Zweig in add_relations_to_records
                # Wikidata-Enrichment (Koordinaten, Land) auf das atPlace-Subobjekt
                # anwenden kann (Mobilitaets-Atlas-Vorarbeit).
                ort_lookup = indices.get("ort", {}).get(ort_val.strip().lower())
                if ort_lookup and 'wikidata_id' in ort_lookup:
                    ste_rel["wikidata_id"] = ort_lookup["wikidata_id"]
                relations.setdefault(objekt_id, []).append(ste_rel)

        # Reine ort-Zeile mit Mobilitaets-Rolle -> datumslose Annotation
        # (E-97). Additiv zur flachen rico:hasOrHadLocation (kein Index-Regress):
        # der ort-Zweig in add_relations_to_records emittiert den Ort weiterhin
        # als Location, dieser Block ergaenzt das Mobilitaetsereignis. Greift nur
        # ohne Datum — mit Datum traegt bereits die Komposit-ort,datum-Annotation oben.
        if typen == ['ort'] and (rolle or '').strip().lower() in MOBILITY_PLACE_ROLES:
            mob_ort = name.strip() if name else ''
            if mob_ort:
                mob_rel = {
                    "typ": "spatiotemporal",
                    "name": mob_ort,
                    "ort": mob_ort,
                    "rolle": rolle,
                    "anmerkung": anmerkung,
                    "_source": source_info,
                }
                mob_lookup = indices.get("ort", {}).get(mob_ort.lower())
                if mob_lookup and 'wikidata_id' in mob_lookup:
                    mob_rel["wikidata_id"] = mob_lookup["wikidata_id"]
                relations.setdefault(objekt_id, []).append(mob_rel)

        # Komposit rolle,person -> m3gim-ontology:Performance (Bühnenrolle + Interpret:in),
        # E-96. Die Performance wird in add_relations als Top-Level-Entity gebaut.
        is_roleperson = 'rolle' in typen and 'person' in typen
        if is_roleperson:
            rolle_val = decomposed.get('rolle')
            person_val = decomposed.get('person')
            if rolle_val and person_val:
                perf_rel = {
                    "typ": "performance",
                    "name": person_val,
                    "stageRole": rolle_val,
                    "performer": person_val,
                    "anmerkung": anmerkung,
                    "_source": source_info,
                }
                p_lookup = indices.get("person", {}).get(person_val.strip().lower())
                if p_lookup and 'wikidata_id' in p_lookup:
                    perf_rel["performer_wikidata_id"] = p_lookup["wikidata_id"]
                relations.setdefault(objekt_id, []).append(perf_rel)

        # Komposit datum,werk -> m3gim-ontology:Performance (Aufführung eines Werks), E-98.
        # Werk nur über den Index, nie literale Q-ID/Rohstring. Komponist-statt-
        # Werk-Zeilen (kein führendes Jahr) fallen am is_iso_date-Gate raus.
        is_datumwerk = 'datum' in typen and 'werk' in typen
        if is_datumwerk:
            datum_val = decomposed.get('datum')
            werk_val = decomposed.get('werk')
            if datum_val and werk_val and is_iso_date(datum_val):
                perf_rel = {
                    "typ": "performance",
                    "name": werk_val,
                    "performanceOf": werk_val,
                    "auffuehrungsdatum": datum_val,
                    "anmerkung": anmerkung,
                    "_source": source_info,
                }
                w_lookup = indices.get("werk", {}).get(werk_val.strip().lower())
                if w_lookup and 'wikidata_id' in w_lookup:
                    perf_rel["work_wikidata_id"] = w_lookup["wikidata_id"]
                relations.setdefault(objekt_id, []).append(perf_rel)

        for t in typen:
            # Einzelteile der Performance-Komposite nicht zusätzlich emittieren —
            # die n-äre Performance trägt sie (E-96/E-98).
            if is_roleperson and t in ('rolle', 'person'):
                continue
            if is_datumwerk and t in ('datum', 'werk'):
                continue
            # ort,datum: der Datums-Teil ist bereits im Annotationsknoten
            # (atDate) repraesentiert — nicht zusaetzlich als eigene
            # Datumsannotation emittieren (data.md § 4: eine Repraesentation).
            # Der Orts-Teil bleibt als rico:hasOrHadLocation erhalten.
            if ortdatum_ste_emitted and t == 'datum':
                continue
            rel_name = decomposed.get(t, name) if decomposed else name
            rel = {
                "typ": t,
                "name": rel_name,
                "rolle": rolle,
                "datum": decomposed.get('datum', datum) if t == 'datum' else datum,
                "anmerkung": anmerkung,
                "_source": source_info,
            }

            # Wikidata-URI aus Index anreichern
            index_map = {
                'person': 'person',
                'institution': 'organisation',
                'ort': 'ort',
                'werk': 'werk'
            }
            if t in index_map and name:
                lookup = indices.get(index_map[t], {})
                match = lookup.get(name.strip().lower())
                if match and match.get("ambiguous"):
                    # Der Titel trifft mehrere Indexeintraege. Weder Q-ID noch
                    # Komponist duerfen gesetzt werden, weil beide dann von
                    # einem beliebigen der Kandidaten kaemen (E-152).
                    rel["name_ambiguous"] = True
                    match = None
                if match and 'wikidata_id' in match:
                    rel["wikidata_id"] = match["wikidata_id"]
                if match and 'komponist' in match:
                    rel["komponist"] = match["komponist"]
                if match:
                    # Kuratierte Indexfelder fuer add_relations_to_records,
                    # getrennt vom Verknuepfungs-anmerkung in rel["anmerkung"]
                    # (M1: ALLE Index-Daten ins JSON-LD).
                    rel["_index"] = match

            if objekt_id not in relations:
                relations[objekt_id] = []
            relations[objekt_id].append(rel)

    return relations


def _is_fonds_subject(agent_entry: dict) -> bool:
    """True if the linked agent is the fonds creator herself. The Wikidata id
    decides; the name is the fallback because a share of the linked agents
    carries no id at all."""
    agent_id = agent_entry.get("@id")
    if agent_id:
        return agent_id == MALANIUK_SUBJECT["@id"]
    return agent_entry.get("name") == MALANIUK_SUBJECT["name"]


def _fonds_role_on(record: dict):
    """Die am selben Dokument erfasste Rolle der Nachlassbildnerin.

    Bei einer symmetrischen Beziehung traegt jede Seite ihre eigene Rolle. Fuer
    das Gegenueber steht sie in der Verknuepfungszeile, fuer die
    Nachlassbildnerin in der Agentenliste desselben Dokuments. Gibt es dort
    keine, bleibt ihre Seite ohne Rolle; eine aus der Gegenseite abgeleitete
    Rolle waere geraten.
    """
    agents = record.get("m3gim-ontology:hasAssociatedAgent")
    if agents is None:
        return None
    for agent in (agents if isinstance(agents, list) else [agents]):
        if not isinstance(agent, dict) or not _is_fonds_subject(agent):
            continue
        role = agent.get("role")
        if isinstance(role, dict):
            label = role.get("skos:prefLabel")
            if label:
                return label
        elif isinstance(role, str):
            return role
    return None


def _dft_scoped_mapping(record: dict, typ: str, rolle: str):
    """AgRelOn-Abbildung, die am Dokumenttyp des Records haengt.

    Liefert None, wenn die Rolle keine dokumenttyp-gebundene Abbildung hat oder
    der Typ des Records nicht dazu passt. Der Vergleich laeuft ueber den
    erfassten deutschen Typwert, den build_record als Concept-CURIE an
    rico:hasDocumentaryFormType haengt.
    """
    by_dft = AGRELON_MAPPING_BY_DFT.get((typ, rolle))
    if not by_dft:
        return None
    dft = record.get("rico:hasDocumentaryFormType")
    curie = dft.get("@id") if isinstance(dft, dict) else dft
    if not isinstance(curie, str) or not curie.startswith("m3gim-vocab:"):
        return None
    # Der Dokumenttyp erbt nach oben: ein Brief ist Korrespondenz, eine
    # Rezension nicht. Ohne den Aufstieg griffe die Bindung nur am Oberbegriff.
    chain = [curie.split(":", 1)[1]]
    while chain[-1] in DFT_BROADER:
        parent = DFT_BROADER[chain[-1]]
        if parent in chain:
            break
        chain.append(parent)
    for raw, mapping in by_dft.items():
        target = DOKUMENTTYP_TO_DFT.get(raw, "")
        if target and target.split(":", 1)[1] in chain:
            return mapping
    return None


def _maybe_add_agrelon(record: dict, typ: str, rolle: str, agent_entry: dict,
                       rel: dict | None = None):
    """Emittiert eine agrelon:*-Relation, wenn (typ, rolle) in AGRELON_MAPPING.

    Die Relation haengt am Record (m3gim-ontology:hasAgentRelation) und traegt als
    Provenance die Record-URI selbst. Der optionale ``rel``-Parameter ist die
    Quell-Verknuepfungszeile — sein ``_source`` wird als ``m3gim-ontology:xlsxSource``
    durchgereicht (technische Provenance).
    """
    mapping = AGRELON_MAPPING.get((typ, rolle))
    if not mapping:
        mapping = _dft_scoped_mapping(record, typ, rolle)
    if not mapping:
        return
    if _is_fonds_subject(agent_entry):
        # Subject and object would be the same person ("Malaniuk corresponded
        # with Malaniuk"): semantically empty and below the minQualifiedCardi-
        # nality of rico:CorrespondenceRelation. The role stays recorded as
        # m3gim-ontology:hasAssociatedAgent, so no information is lost.
        return
    agrelon_class, _prop = mapping
    partner = {"name": agent_entry.get("name")}
    # Agent-@id (wd:) durchreichen, falls vorhanden
    if agent_entry.get("@id"):
        partner["@id"] = agent_entry["@id"]

    rel_entry = {
        "@type": agrelon_class,
        "agrelon:metadataProvenance": {"@id": record["@id"]},
    }
    if agrelon_class in SYMMETRIC_AGRELON_CLASSES:
        # Beide Seiten stehen gleichrangig. Die tatsaechliche Richtung, also wer
        # geschrieben und wer empfangen hat, ist eine Aussage ueber das Dokument
        # und steht als erfasste Rolle an der jeweiligen Seite.
        attach_role(partner, rolle)
        fonds_side = dict(MALANIUK_SUBJECT)
        attach_role(fonds_side, _fonds_role_on(record))
        rel_entry["agrelon:hasSubjectObject"] = [fonds_side, partner]
    elif agrelon_class in FONDS_AT_OBJECT_CLASSES:
        rel_entry["agrelon:hasSubject"] = partner
        rel_entry["agrelon:hasObject"] = MALANIUK_SUBJECT
    else:
        rel_entry["agrelon:hasSubject"] = MALANIUK_SUBJECT
        rel_entry["agrelon:hasObject"] = partner
    # Validity aus rico:date des Records als Heuristik (nur fuer HasEmployeeEmployer)
    if agrelon_class == "agrelon:HasEmployeeEmployer" and record.get("rico:date"):
        rel_entry["agrelon:metadataPeriod"] = {
            "agrelon:hasBeginDate": record["rico:date"][:4],
        }
    if rel is not None:
        attach_xlsx_source(rel_entry, rel)
    record.setdefault("m3gim-ontology:hasAgentRelation", []).append(rel_entry)


def _annotation_id(rec_local_id: str, ort: str, rolle: str, datum: str,
                   seen: dict) -> str:
    """Stabile, inhaltsbasierte Annotations-@id: Hash ueber (Ort, Rolle, Datum)
    je Record statt eines globalen Zaehlers. Das Einfuegen oder Aendern einer
    Annotation verschiebt damit keine anderen @ids mehr (frueher globaler
    Zaehler, wiederkehrender test_22-Bruch). Echte Inhaltsdubletten auf
    demselben Record bekommen ein stabiles Ordinal-Suffix in
    Auftrittsreihenfolge.

    Gehasht wird der erfasste Rollenwert und nicht das Concept, auf das er im
    Vokabular fuehrt. Sonst verschoebe jede Zusammenfuehrung im Vokabular die
    Kennungen der Knoten, die sie gar nicht betrifft.
    """
    raw = "\x1f".join((ort or "", rolle or "", datum or ""))
    h = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:8]
    base = f"m3gim-data:ev_{rec_local_id}_{h}"
    n = seen.get(base, 0) + 1
    seen[base] = n
    return base if n == 1 else f"{base}-{n}"


def build_annotation(record: dict, seen: dict, place: dict | None = None,
                     date: str | None = None, role=None) -> dict:
    """Baut einen Annotationsknoten und haengt ihn an das Dokument.

    Der Knoten traegt seinen Wert in m3gim-ontology:atPlace, in
    m3gim-ontology:atDate oder in beiden und seine erfasste Rolle in
    m3gim-ontology:role. Fehlt der Ort, ist es eine reine Datierung; fehlt das
    Datum, eine reine Verortung. Der Rueckverweis auf das Dokument ist
    Provenienz: das Dokument bezeugt die Annotation.

    Der Aufrufer haengt den Knoten in die Graph-Liste; hier entsteht nur die
    Kante am Dokument, damit @id-Vergabe und Kante nicht auseinanderlaufen.
    """
    rec_local_id = record["@id"].split(":", 1)[-1]
    place_name = place.get("name") if place else None
    node = {
        "@id": _annotation_id(rec_local_id, place_name, role, date, seen),
        "@type": "m3gim-ontology:Annotation",
        "agrelon:metadataProvenance": {"@id": record["@id"]},
    }
    if place:
        node["m3gim-ontology:atPlace"] = place
    if date:
        node["m3gim-ontology:atDate"] = date
    attach_role(node, role)
    record.setdefault("m3gim-ontology:hasAnnotation", []).append({"@id": node["@id"]})
    return node


def _attach_index_fields(entry: dict, rel: dict, typ: str):
    """Haengt kuratierte Indexfelder (rel['_index']) als m3gim-ontology:-Properties an
    die Entitaet. Eigener Namespace, additiv zum Loader; getrennt vom
    Verknuepfungs-anmerkung. data.md § Index-Durchreichung (M1).

    person: anmerkung -> indexNote (Beruf), lebensdaten -> lifespan.
    institution: ort -> headquarters, assoziierte_person -> keyContact, anmerkung -> indexNote.
    werk: rolle_stimme -> sungPart (von Malaniuk gesungene Partie), anmerkung -> indexNote.
    """
    idx = rel.get("_index")
    if not idx:
        return
    note = idx.get("anmerkung")
    if typ == "person":
        if note:
            entry["m3gim-ontology:indexNote"] = note
        if idx.get("lebensdaten"):
            entry["m3gim-ontology:lifespan"] = idx["lebensdaten"]
    elif typ == "institution":
        if idx.get("ort"):
            entry["m3gim-ontology:headquarters"] = idx["ort"]
        if idx.get("assoziierte_person"):
            entry["m3gim-ontology:keyContact"] = idx["assoziierte_person"]
        if note:
            entry["m3gim-ontology:indexNote"] = note
    elif typ == "werk":
        if idx.get("rolle_stimme"):
            entry["m3gim-ontology:sungPart"] = idx["rolle_stimme"]
        if note:
            entry["m3gim-ontology:indexNote"] = note


def add_relations_to_records(records: list, relations: dict,
                             enrichment_data: dict | None = None,
                             stage_roles: dict | None = None,
                             annotation_seen: dict | None = None) -> tuple[list, list]:
    """Fuegt Verknuepfungen als RiC-O/m3gim Properties zu Records hinzu.

    Returns:
        (annotations, performances): Top-Level-Entities, die dem Graph
        hinzugefuegt werden. StageRole-Entitäten werden in das geteilte
        ``stage_roles``-Registry dedupliziert (E-96/E-98), Annotations-@ids in
        das geteilte ``annotation_seen``-Registry.
    """
    if enrichment_data is None:
        enrichment_data = {}
    if stage_roles is None:
        stage_roles = {}
    if annotation_seen is None:
        annotation_seen = {}
    annotations = []
    performances = []
    perf_counter = 0  # Performance-@ids bleiben (Scope: nur Annotationen stabilisiert)
    for record in records:
        identifier = record.get("rico:identifier")
        if not identifier or identifier not in relations:
            continue

        agents = []
        locations = []
        subjects = []
        creation_dates = []  # Entstehungsdatierung -> rico:creationDate
        mentions = []

        for rel in relations[identifier]:
            t = rel["typ"]
            name = rel.get("name")
            if not name:
                continue

            # Basis-Entry mit Name
            entry = {"name": name}
            wid = rel.get("wikidata_id", "")
            if wid and re.match(r'^Q\d+$', wid):
                entry["@id"] = f"wd:{wid}"
                entry["owl:sameAs"] = f"http://www.wikidata.org/entity/{wid}"
                # Enrichment-Properties injizieren
                enrich = enrichment_data.get(wid, {}).get("properties", {})
                if enrich:
                    _inject_enrichment(entry, enrich)
            attach_role(entry, rel.get("rolle"))
            attach_xlsx_source(entry, rel)
            # E-102: Datenqualitaets-Flag aus anmerkung-Signal an die Entitaet,
            # auf die sich die Unsicherheit bezieht (person/institution/ort/werk).
            _qf = quality_flags(rel.get("anmerkung"))
            # E-152: Ein im Index mehrdeutiger Name ist eine Unsicherheit ueber
            # die Entitaet und steht an derselben Property wie die aus der
            # Anmerkung abgeleiteten Signale. Der Feldkonflikt der
            # Indexverdichtung steht nicht hier, sondern im Validierungsreport;
            # er betrifft im Bestand ausschliesslich die Anmerkungsspalte und
            # sagt nichts ueber die Entitaet im Dokument aus.
            if rel.get("name_ambiguous") and "name-nicht-eindeutig" not in _qf:
                _qf = _qf + ["name-nicht-eindeutig"]
            if _qf:
                entry["m3gim-ontology:dataQualityFlag"] = _qf if len(_qf) > 1 else _qf[0]

            if t == "person":
                rolle_lower = (rel.get("rolle") or "").lower()
                _attach_index_fields(entry, rel, "person")
                if rolle_lower in ["erwähnt", "erwaehnt", "erwähnt"]:
                    mentions.append(entry)
                else:
                    entry["@type"] = "rico:Person"
                    agents.append(entry)
                    _maybe_add_agrelon(record, t, rolle_lower, entry, rel=rel)

            elif t == "institution":
                entry["@type"] = "rico:CorporateBody"
                _attach_index_fields(entry, rel, "institution")
                agents.append(entry)
                _maybe_add_agrelon(record, t, (rel.get("rolle") or "").lower(), entry, rel=rel)

            elif t == "ensemble":
                entry["@type"] = "rico:Group"
                agents.append(entry)

            elif t == "ort":
                # Skip date-like strings that leaked into locations
                if name and re.match(r'^\d{4}(-\d{2}){0,2}', name):
                    continue
                entry["@type"] = "rico:Place"
                # Komposit "ort,datum" vererbt die Rolle an beide Haelften.
                # Eine Datumsrolle (erscheinungsdatum, auffuehrung, ...) gehoert
                # semantisch nur zum Datum-Teil — am Ort produziert sie im UI
                # Etiketten wie "Muenchen (erscheinungsdatum)". Hier strippen,
                # damit die Rolle nur dort erscheint, wo sie aussagekraeftig ist.
                if (rel.get("rolle") or "").strip().lower() in DATE_ONLY_ROLES:
                    entry.pop("role", None)
                    entry.pop("m3gim-ontology:derivedFromRole", None)
                locations.append(entry)

            elif t == "werk":
                entry["@type"] = "m3gim-ontology:MusicalWork"
                if rel.get("komponist"):
                    entry["composer"] = rel["komponist"]
                _attach_index_fields(entry, rel, "werk")
                subjects.append(entry)

            elif t == "ereignis":
                entry["@type"] = "m3gim-ontology:FramingEvent"
                if rel.get("datum"):
                    entry["date"] = rel["datum"]
                if "role" not in entry:
                    attach_role(entry, "rahmenveranstaltung")
                subjects.append(entry)

            elif t == "rolle":
                # Standalone-Bühnenrolle (ohne Interpret:in) -> m3gim-ontology:Performance
                # mit nur hasStageRole; löst das alte Attribut hasPerformanceRole
                # ab (E-96).
                perf_counter += 1
                rec_local_id = record["@id"].split(":", 1)[-1]
                perf_id = f"m3gim-data:perf_{rec_local_id}_{perf_counter}"
                perf = {
                    "@id": perf_id,
                    "@type": "m3gim-ontology:Performance",
                    "m3gim-ontology:hasStageRole": {"@id": _make_stage_role(stage_roles, name)},
                }
                if rel.get("anmerkung"):
                    perf["rico:generalDescription"] = rel["anmerkung"]
                _qf = quality_flags(rel.get("anmerkung"))
                if _qf:
                    perf["m3gim-ontology:dataQualityFlag"] = _qf if len(_qf) > 1 else _qf[0]
                attach_xlsx_source(perf, rel)
                performances.append(perf)
                record.setdefault("m3gim-ontology:hasPerformance", []).append({"@id": perf_id})

            elif t == "datum":
                date_val = clean_date(rel.get("datum") or name)
                if not date_val:
                    continue
                # Datums-Routing (data.md § 6, E-102): Textnotationen erst auf
                # ISO normalisieren ("X bis Y" → TimeSpan, "ab/seit X" → nach:).
                date_val = normalize_dating(date_val)
                rolle_key = (rel.get("rolle") or "").strip().lower()
                if rolle_key == CREATION_DATE_ROLE and is_iso_date(date_val):
                    # Die reine Entstehungsdatierung des Dokuments steht am
                    # Dokument selbst, auf dem RiC-O-Term rico:creationDate.
                    creation_dates.append(date_val)
                    continue
                # Jeder andere Datumswert wird ein Annotationsknoten mit
                # m3gim-ontology:atDate und seiner erfassten Rolle. Kein
                # Property-Name traegt mehr eine Rolle.
                annotation = build_annotation(record, annotation_seen,
                                              date=date_val, role=rolle_key or None)
                if rel.get("anmerkung"):
                    annotation["rico:generalDescription"] = rel["anmerkung"]
                qf = quality_flags(rel.get("anmerkung"))
                # Eine Notation, die kein ISO-Datum ergibt, wird markiert statt
                # eine eigene Bauform zu erzwingen. Der Wert bleibt im Wortlaut
                # der Quelle stehen und geht ins Fehlerregister.
                if not is_iso_date(date_val):
                    qf = qf + ["datierung-malformed"]
                if qf:
                    annotation["m3gim-ontology:dataQualityFlag"] = (
                        qf if len(qf) > 1 else qf[0]
                    )
                attach_xlsx_source(annotation, rel)
                annotations.append(annotation)

            elif t == "detail":
                # Schicht-3-Detail als strukturiertes Objekt
                detail_entry = {
                    "@type": "m3gim-ontology:Annotation",
                    "m3gim-ontology:detailField": name
                }
                if rel.get("rolle"):
                    detail_entry["m3gim-ontology:detailValue"] = rel["rolle"]
                if rel.get("anmerkung"):
                    detail_entry["rico:generalDescription"] = rel["anmerkung"]
                attach_xlsx_source(detail_entry, rel)
                if "m3gim-ontology:hasDetail" not in record:
                    record["m3gim-ontology:hasDetail"] = []
                record["m3gim-ontology:hasDetail"].append(detail_entry)

            elif t == "spatiotemporal":
                # Komposit ort,datum bzw. datumslose Mobilitaets-Ortsrolle
                # (E-97) als Annotationsknoten mit Rueckverweis.
                # Vertragsstatus ("nicht eingehalten") ist keine Rolle,
                # sondern eine spaltenweit durchgereichte Vertragsmarkierung
                # (data-model.md § 11). Vor @id-Hash UND Rolle herausfiltern, damit
                # beide konsistent bleiben (test_35 leitet die @id aus dem Output ab).
                ste_role = rel.get("rolle")
                if ste_role and ste_role.strip().lower() in CONTRACT_STATUS_ROLES:
                    ste_role = None
                # atPlace: wie reguläre rico:Place-Entries mit Q-ID + Enrichment
                # anreichern, sobald Reconciliation einen Treffer liefert.
                place_entry = {"name": rel["ort"]}
                wid = rel.get("wikidata_id", "")
                if wid and re.match(r'^Q\d+$', wid):
                    place_entry["@id"] = f"wd:{wid}"
                    place_entry["owl:sameAs"] = f"http://www.wikidata.org/entity/{wid}"
                    enrich = enrichment_data.get(wid, {}).get("properties", {})
                    if enrich:
                        _inject_enrichment(place_entry, enrich)
                # Der Rueckverweis auf den Record ist Provenienz (der Record
                # dokumentiert die Annotation); rico:isAssociatedWithRecord
                # existiert in RiC-O 1.1 nicht (E-103). data-model.md § 10.
                ev = build_annotation(record, annotation_seen, place=place_entry,
                                      date=rel.get("datum"), role=ste_role)
                if rel.get("anmerkung"):
                    ev["rico:generalDescription"] = rel["anmerkung"]
                attach_xlsx_source(ev, rel)
                annotations.append(ev)

            elif t == "performance":
                # n-äre m3gim-ontology:Performance aus rolle,person (E-96) bzw. datum,werk
                # (E-98) als Top-Level-Entity mit Rückverweis am Record.
                perf_counter += 1
                rec_local_id = record["@id"].split(":", 1)[-1]
                perf_id = f"m3gim-data:perf_{rec_local_id}_{perf_counter}"
                perf = {"@id": perf_id, "@type": "m3gim-ontology:Performance"}
                if rel.get("stageRole"):
                    perf["m3gim-ontology:hasStageRole"] = {
                        "@id": _make_stage_role(stage_roles, rel["stageRole"])
                    }
                if rel.get("performer"):
                    performer = {"name": rel["performer"], "@type": "rico:Person"}
                    pwid = rel.get("performer_wikidata_id", "")
                    if pwid and re.match(r'^Q\d+$', pwid):
                        performer["@id"] = f"wd:{pwid}"
                        performer["owl:sameAs"] = f"http://www.wikidata.org/entity/{pwid}"
                        pen = enrichment_data.get(pwid, {}).get("properties", {})
                        if pen:
                            _inject_enrichment(performer, pen)
                    perf["m3gim-ontology:hasPerformer"] = performer
                if rel.get("performanceOf"):
                    work = {"name": rel["performanceOf"], "@type": "m3gim-ontology:MusicalWork"}
                    wwid = rel.get("work_wikidata_id", "")
                    if wwid and re.match(r'^Q\d+$', wwid):
                        work["@id"] = f"wd:{wwid}"
                        work["owl:sameAs"] = f"http://www.wikidata.org/entity/{wwid}"
                    perf["m3gim-ontology:performanceOf"] = work
                if rel.get("auffuehrungsdatum"):
                    perf["m3gim-ontology:atDate"] = rel["auffuehrungsdatum"]
                if rel.get("anmerkung"):
                    perf["rico:generalDescription"] = rel["anmerkung"]
                attach_xlsx_source(perf, rel)
                performances.append(perf)
                record.setdefault("m3gim-ontology:hasPerformance", []).append({"@id": perf_id})

            elif t in ["ausgaben", "einnahmen", "summe"]:
                # Finanz-Informationen als Detailangabe (data.md Abschnitt 11).
                # Doppelbetrag ('25, DM/45, DM') -> zwei Detailangaben mit
                # gleichem detailField (parse_monetary_values).
                for amount, currency in parse_monetary_values(name):
                    if currency is None and amount is not None:
                        currency = default_currency_for(
                            record.get("rico:identifier", ""))
                    detail_entry = {
                        "@type": "m3gim-ontology:Annotation",
                        "m3gim-ontology:detailField": t,
                        "m3gim-ontology:detailValue": name,
                    }
                    attach_role(detail_entry, rel.get("rolle"))
                    if amount is not None:
                        detail_entry["m3gim-ontology:monetaryAmount"] = {
                            "@value": amount,
                            "@type": "xsd:decimal",
                        }
                    if currency:
                        detail_entry["m3gim-ontology:currency"] = currency
                    attach_xlsx_source(detail_entry, rel)
                    if "m3gim-ontology:hasDetail" not in record:
                        record["m3gim-ontology:hasDetail"] = []
                    record["m3gim-ontology:hasDetail"].append(detail_entry)

        # Erwähnte Personen → rico:hasOrHadSubject (statt einer eigenen Kante)
        # Sie werden als rico:Person mit role "erwähnt" modelliert
        for m in mentions:
            m["@type"] = "rico:Person"
            subjects.append(m)

        # Properties setzen (nur wenn nicht leer)
        if agents:
            record["m3gim-ontology:hasAssociatedAgent"] = (
                agents if len(agents) > 1 else agents[0]
            )
        if locations:
            record["rico:hasOrHadLocation"] = locations if len(locations) > 1 else locations[0]
        if subjects:
            record["rico:hasOrHadSubject"] = subjects if len(subjects) > 1 else subjects[0]
        if creation_dates:
            record["rico:creationDate"] = (
                creation_dates if len(creation_dates) > 1 else creation_dates[0]
            )

    return annotations, performances


def normalize_containers(records: list) -> None:
    """Einelementige Sammelkanten auf ihren einzigen Wert zurueckfuehren.

    Laeuft ueber alle Records und Konvolute in einem Durchgang, weil die
    Annotationen eines Dokuments aus zwei Quellen kommen, den Objektzeilen und
    den Verknuepfungszeilen.
    """
    for record in records:
        for prop in ("m3gim-ontology:hasDetail", "m3gim-ontology:hasAnnotation",
                     "m3gim-ontology:hasPerformance"):
            values = record.get(prop)
            if isinstance(values, list) and len(values) == 1:
                record[prop] = values[0]


# ---------------------------------------------------------------------------
# Enrichment-Injection
# ---------------------------------------------------------------------------

def _inject_enrichment(entry: dict, props: dict):
    """Injiziert Wikidata-Enrichment-Properties in eine Entitaet.

    Die Datumswerte laufen durch ``strip_zero_date_padding``, weil der
    Enrichment-Cache aus einem Lauf vor der Praezisions-Normalisierung stammen
    kann und die Wikidata-Nullform sonst in den Datensatz durchschlaegt (E-132).
    """
    # Personen
    if "occupation" in props:
        labels = [o.get("label", o.get("qid", "")) for o in props["occupation"]
                  if isinstance(o, dict)]
        if labels:
            entry["gndo:professionOrOccupationAsLiteral"] = labels
    if "voiceType" in props:
        items = props["voiceType"]
        if isinstance(items, list) and items:
            entry["m3gim-ontology:voiceType"] = items[0].get("label", "") if isinstance(items[0], dict) else str(items[0])
        elif isinstance(items, dict):
            entry["m3gim-ontology:voiceType"] = items.get("label", "")
    if "birthDate" in props:
        entry["schema:birthDate"] = strip_zero_date_padding(props["birthDate"])
    if "deathDate" in props:
        entry["schema:deathDate"] = strip_zero_date_padding(props["deathDate"])
    if "birthPlace" in props:
        bp = props["birthPlace"]
        if isinstance(bp, dict):
            entry["schema:birthPlace"] = bp.get("label", bp.get("qid", ""))
    if "deathPlace" in props:
        dp = props["deathPlace"]
        if isinstance(dp, dict):
            entry["schema:deathPlace"] = dp.get("label", dp.get("qid", ""))

    # Orte
    if "coordinates" in props:
        coords = props["coordinates"]
        if isinstance(coords, dict) and "lat" in coords:
            entry["geo:lat"] = coords["lat"]
            entry["geo:long"] = coords["lon"]
    if "country" in props:
        c = props["country"]
        if isinstance(c, dict):
            entry["m3gim-ontology:country"] = c.get("label", c.get("qid", ""))

    # Werke
    if "composer" in props:
        c = props["composer"]
        if isinstance(c, dict):
            entry["m3gim-ontology:wdComposer"] = c.get("label", c.get("qid", ""))
    if "genre" in props:
        items = props["genre"]
        if isinstance(items, list) and items:
            entry["m3gim-ontology:wdGenre"] = [g.get("label", "") for g in items if isinstance(g, dict)]
        elif isinstance(items, dict):
            entry["m3gim-ontology:wdGenre"] = items.get("label", "")
    if "premiereDate" in props:
        entry["m3gim-ontology:wdPremiereDate"] = strip_zero_date_padding(props["premiereDate"])
    elif "publicationDate" in props:
        entry["m3gim-ontology:wdPremiereDate"] = strip_zero_date_padding(props["publicationDate"])

    # Organisationen
    if "location" in props:
        loc = props["location"]
        if isinstance(loc, dict):
            entry["m3gim-ontology:wdLocation"] = loc.get("label", loc.get("qid", ""))
    if "inception" in props:
        entry["m3gim-ontology:wdInception"] = strip_zero_date_padding(props["inception"])


# ---------------------------------------------------------------------------
# Hauptfunktion
# ---------------------------------------------------------------------------

def main():
    """Hauptfunktion"""
    print("=" * 60)
    print("M³GIM Transform (RiC-O JSON-LD)")
    print("=" * 60)

    # Indizes laden
    print("\nLade Indizes...")
    indices = {}
    for name, key in [("Personenindex", "person"), ("Organisationsindex", "organisation"),
                       ("Ortsindex", "ort"), ("Werkindex", "werk")]:
        df = load_index(name)
        if df is not None:
            indices[key] = build_index_lookup(df)
            print(f"  {name}: {len(indices[key])} Eintraege")
        else:
            print(f"  WARNUNG: {name} nicht gefunden")

    # Reconciliation-Ergebnisse als Fallback laden.
    # Konservative Policy: fuzzy_low nur uebernehmen, wenn manuell approved.
    recon_path = OUTPUT_DIR / "wikidata-reconciliation.json"
    recon_count = 0
    recon_low_skipped = 0
    if recon_path.exists():
        with open(recon_path, "r", encoding="utf-8") as f:
            recon_data = json.load(f)
        type_map = {"person": "person", "org": "organisation",
                     "location": "ort", "work": "werk"}
        for match in recon_data.get("matched", []):
            etype = type_map.get(match.get("type"))
            if not etype or etype not in indices:
                continue
            if not is_approved_match(match):
                recon_low_skipped += 1
                continue
            name_key = match["name"].strip().lower()
            if name_key in indices[etype]:
                entry = indices[etype][name_key]
                if "wikidata_id" not in entry:
                    entry["wikidata_id"] = match["qid"]
                    recon_count += 1
        print(f"\n  Reconciliation: {recon_count} Q-IDs ergaenzt aus {recon_path.name}"
              f" ({recon_low_skipped} low-conf ignoriert)")
    else:
        print(f"\n  Reconciliation: {recon_path.name} nicht vorhanden (uebersprungen)")

    # Enrichment-Daten laden (wikidata-enrichment.json)
    enrichment_data = {}
    enrichment_path = OUTPUT_DIR / "wikidata-enrichment.json"
    if enrichment_path.exists():
        with open(enrichment_path, "r", encoding="utf-8") as f:
            enrich_raw = json.load(f)
        enrichment_data = enrich_raw.get("entities", {})
        print(f"  Enrichment: {len(enrichment_data)} Entitaeten aus {enrichment_path.name}")
    else:
        print(f"  Enrichment: {enrichment_path.name} nicht vorhanden (uebersprungen)")

    # Objekte laden, CSV bevorzugt (data.md § 3, Quellformat)
    try:
        from _common import resolve_objekte_source
        objekte_path = resolve_objekte_source(SHEETS_DIR)
    except FileNotFoundError as exc:
        print(f"\nFEHLER: {exc}")
        return 1

    print(f"\nLade {objekte_path.name}...")
    df_objekte = load_objekte(SHEETS_DIR)

    # Folio-Spalte erkennen
    folio_col = None
    for col in df_objekte.columns:
        # Guard: nicht-textuelle Header (im Box-Export traegt Spalte 0
        # statt "box_nr" den int 1) ueberspringen, statt an .lower() zu
        # scheitern (E-95).
        if not isinstance(col, str):
            continue
        col_lower = col.lower()
        if col_lower in ['folio', 'folio nr', 'folio_nr'] or 'unnamed' in col_lower:
            # Pruefen ob die Spalte Folio-artige Werte hat
            sample = df_objekte[col].dropna().astype(str).head(5)
            if any(re.match(r'^\d+_\d+$', s.strip()) or s.strip().startswith('fol.') for s in sample):
                folio_col = col
                break
    if folio_col:
        print(f"  Folio-Spalte erkannt: '{folio_col}'")

    # Konvolut-Hierarchie bauen. annotation_seen ist ueber alle Erzeugungs-
    # stellen geteilt, damit zwei Annotationen desselben Dokuments nie
    # dieselbe @id bekommen.
    annotation_seen = {}
    records, konvolute, annotations = build_konvolut_hierarchy(
        df_objekte, folio_col, annotation_seen)
    print(f"  {len(records)} Records, {len(konvolute)} Konvolute")

    # Verknuepfungen laden (CSV-Verzeichnis bevorzugt, E-152)
    verk_path = resolve_verknuepfungen_source(SHEETS_DIR)

    print(f"\nLade {verk_path.name}...")
    df_verk = load_verknuepfungen(verk_path)
    sheet_names = sorted(df_verk["_xlsx_sheet"].dropna().unique().tolist()) \
        if "_xlsx_sheet" in df_verk.columns else []
    print(f"  {len(df_verk)} Zeilen aus {len(sheet_names)} Sheet(s): {sheet_names}")
    relations = process_verknuepfungen(df_verk, indices)
    total_rels = sum(len(v) for v in relations.values())
    print(f"  {total_rels} Verknuepfungen fuer {len(relations)} Objekte")

    # Folio-Join-Reparatur: Bindestrich- gegen Unterstrich-Notation.
    # Deterministisch ohne Ermessen — repariert wird nur, wenn die
    # Unterstrichform ein existierendes Objekt trifft UND die Bindestrich-
    # form keines. Spannenwerte wie "1-29" fallen nicht darunter, weil
    # "1_29" kein Objekt trifft; sie bleiben Befund fuer das Team. Die
    # Reparatur wird je Paar gemeldet und erlischt von selbst, sobald die
    # Quelle einheitlich schreibt.
    known_ids = {r.get("rico:identifier") for r in records}
    known_ids.update(k.get("rico:identifier") for k in konvolute)
    repaired = {}
    for objekt_id in list(relations.keys()):
        if objekt_id in known_ids or "-" not in objekt_id:
            continue
        candidate = objekt_id.replace("-", "_")
        if candidate in known_ids:
            relations.setdefault(candidate, []).extend(relations.pop(objekt_id))
            repaired[objekt_id] = candidate
    for old, new in sorted(repaired.items()):
        print(f"  Folio-Join repariert: {old} -> {new}")

    # Relations zu Records hinzufuegen (mit Enrichment-Daten). stage_roles ist
    # ein über beide Aufrufe geteiltes Dedup-Registry für StageRole-Entitäten (E-96).
    stage_roles = {}
    record_annotations, performances = add_relations_to_records(
        records, relations, enrichment_data, stage_roles, annotation_seen)
    # Relations auch zu Konvolut-Records (falls Verknuepfungen am Konvolut haengen)
    konvolut_annotations, performances_k = add_relations_to_records(
        konvolute, relations, enrichment_data, stage_roles, annotation_seen)
    annotations = (list(annotations) + list(record_annotations)
                   + list(konvolut_annotations))
    performances = list(performances) + list(performances_k)
    stage_role_nodes = list(stage_roles.values())
    normalize_containers(records + konvolute)

    # Gesamtbestand als Fonds
    fonds = {
        "@id": "m3gim-data:UAKUG_NIM",
        "@type": "rico:RecordSet",
        "rico:hasRecordSetType": {"@id": "ric-rst:Fonds"},
        "rico:identifier": "UAKUG/NIM",
        "rico:title": "Teilnachlass Ira Malaniuk",
        "rico:hasOrHadPart": []
    }

    # Konvolute gehoeren zum Fonds
    for k in konvolute:
        fonds["rico:hasOrHadPart"].append({"@id": k["@id"]})

    # Einzelobjekte (nicht in Konvoluten) gehoeren direkt zum Fonds
    konvolut_member_ids = set()
    for k in konvolute:
        for part in k.get("rico:hasOrHadPart", []):
            konvolut_member_ids.add(part["@id"])

    for r in records:
        if r["@id"] not in konvolut_member_ids:
            fonds["rico:hasOrHadPart"].append({"@id": r["@id"]})

    # SKOS-Konzepte fuer verwendete Dokumenttypen (data.md Abschnitt 12)
    dft_concepts = build_dft_concepts(records)
    role_concepts = build_role_concepts(
        [fonds] + konvolute + records + annotations + performances)

    # JSON-LD Dokument
    graph = ([fonds] + konvolute + records + dft_concepts + role_concepts
             + annotations + performances + stage_role_nodes)

    jsonld = {
        "@context": CONTEXT,
        "@graph": graph,
        "m3gim-ontology:exportDate": datetime.now().isoformat(),
        "m3gim-ontology:recordCount": len(records),
        "m3gim-ontology:recordSetCount": len(konvolute),
        "m3gim-ontology:approvedManualMatches": recon_count,
        "m3gim-ontology:lowConfidenceSkipped": recon_low_skipped,
    }

    # Speichern
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "m3gim.jsonld"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(jsonld, f, ensure_ascii=False, indent=2)

    print()
    print("=" * 60)
    print(f"Export abgeschlossen")
    print(f"  Records:    {len(records)}")
    print(f"  Konvolute:  {len(konvolute)}")
    print(f"  Fonds:      1")
    print(f"  Graph:      {len(graph)} Entitaeten")
    print(f"  Ausgabe:    {output_path}")
    size_kb = output_path.stat().st_size / 1024
    print(f"  Groesse:    {size_kb:.1f} KB")
    print("=" * 60)


if __name__ == "__main__":
    exit(main() or 0)
