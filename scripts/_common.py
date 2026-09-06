"""Shared utilities for the M3GIM pipeline scripts.

Lean helpers used identically across several scripts. No framework, no
speculative abstraction, only concretely deduplicated knowledge.

Centralised XLSX workaround constants, see knowledge/data.md § Compensations in the pipeline.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from collections.abc import Iterator
from pathlib import Path

# ---------------------------------------------------------------------------
# Pipeline paths
# ---------------------------------------------------------------------------
# One resolution of the three M3GIM ENV overrides for every pipeline script.
# audit-data.py and report-quality.py used to read fixed paths, so a run
# against an alternative data state silently audited the default one
# (Refactoring 2026-09-01). Resolved at import; the scripts are separate
# processes, so the environment is fixed for the run.

REPO_ROOT = Path(__file__).resolve().parent.parent
SHEETS_DIR = Path(os.environ.get(
    "M3GIM_SHEETS_DIR", REPO_ROOT / "data" / "google-spreadsheet"))
OUTPUT_DIR = Path(os.environ.get(
    "M3GIM_OUTPUT_DIR", REPO_ROOT / "data" / "output"))
REPORTS_DIR = Path(os.environ.get(
    "M3GIM_REPORTS_DIR", REPO_ROOT / "data" / "reports"))


def atomic_write_json(path: Path, data: object, *, indent: int = 2) -> None:
    """Serialize JSON completely before atomically replacing the destination."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(
        dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(data, stream, ensure_ascii=False, indent=indent)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise


def atomic_copy_file(source: Path, destination: Path) -> None:
    """Copy a file completely before atomically replacing the destination."""
    source = Path(source)
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(
        dir=destination.parent, prefix=f".{destination.name}.", suffix=".tmp")
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "wb") as target, source.open("rb") as origin:
            while chunk := origin.read(1 << 20):
                target.write(chunk)
            target.flush()
            os.fsync(target.fileno())
        os.replace(temporary, destination)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise


def rel_to_repo(path: Path) -> str:
    """Repo-relative POSIX path for a report line, absolute when outside.

    The ENV overrides may point at a directory outside the repository, and
    ``Path.relative_to`` raises there instead of falling back.
    """
    path = Path(path)
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


# ---------------------------------------------------------------------------
# XLSX workaround constants (see knowledge/data.md § Compensations in the pipeline)
# ---------------------------------------------------------------------------

# Header-shift correction for the person/org/place/work index. In several
# indices the XLSX header row is not set cleanly: either the first data row
# runs through as the header (org/work: position 1 carries a leaked data value
# like "Graz"/"Rossini, Gioachino" instead of "name"), or the name column has
# no header at all (person index: position 1 is empty and pandas turns it into
# "Unnamed: 1"). The pipeline detects this positionally via column 0
# ("m3gim_id" = a real header is present) and renames the columns to the canon
# instead of consuming a real data row as the header. Centralised so
# transform.py, validate.py and reconcile.py share the same canon.
# See knowledge/data.md § Compensations in the pipeline and journal.md E-95.
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

# Finance currency defaults per Konvolut signature. NIM_007 "Aufstellung 1966"
# folio 5_1 has five numbers without a currency; neighbouring folios 5_2..5_8
# are consistently stated in Schilling, hence "S" as the default.
# NIM_011 folio 5 (Brussels Tristan guest performance, Theatre Royal de la
# Monnaie): two fee lines "1200" without a currency; the folio 9 counterpart of
# the same contract block is stated in "Belgische Francs" and the contract place
# is Brussels. Hence "Belgische Francs" as the default (same folio-neighbourhood
# heuristic as NIM_007). To be confirmed with the Erschliessungsteam (meeting
# 2026-06-23); Barcelona is a secondary guest venue in the same block, not a
# second currency.
FINANCE_CURRENCY_DEFAULTS: dict[str, str] = {
    "UAKUG/NIM_007": "S",
    "UAKUG/NIM_011": "Belgische Francs",
}


def resolve_objekte_source(sheets_dir: Path) -> Path:
    """Source selection for the object table, CSV preferred (data.md § Source format).

    The CSV export preserves the captured text; the XLSX carries the
    spreadsheet's autoconversion in the date column and stays admissible only as
    a fallback. If both are missing, FileNotFoundError.
    """
    csv_path = sheets_dir / "M3GIM-Objekte.csv"
    if csv_path.exists():
        return csv_path
    xlsx_path = sheets_dir / "M3GIM-Objekte.xlsx"
    if xlsx_path.exists():
        return xlsx_path
    raise FileNotFoundError(
        f"Objekttabelle nicht gefunden: weder {csv_path} noch {xlsx_path}")


def load_objekte(sheets_dir: Path):
    """Load the object table as a DataFrame with normalised column names.

    CSV is read with dtype=str so date values arrive as captured text instead of
    a calendar value. The XLSX fallback stays unchanged, including its known date
    artefacts (data.md § Date notation of the source).
    """
    import pandas as pd  # lazy so _common stays importable without pandas

    path = resolve_objekte_source(sheets_dir)
    if path.suffix.lower() == ".csv":
        df = pd.read_csv(path, dtype=str)
    else:
        df = pd.read_excel(path)
    df.columns = [c.lower().strip() if isinstance(c, str) else c
                  for c in df.columns]
    return df


def load_index(sheets_dir: Path, name: str):
    """Load an index table with header-shift correction.

    One implementation for transform.py, validate.py and reconcile.py. The
    three used to carry their own copy with diverging shift logic, so a changed
    box export broke validate and reconcile differently from transform (Review
    2026-07-18, point 2). ``name`` is the index name without the file prefix,
    e.g. "Personenindex".

    Three malformation classes from the box export (E-95, E-152):

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

    (c) id column overwritten with a data value — the Ortsindex of the
        2026-08-31 delivery carries the place name "Turin" at position 0
        instead of "m3gim_id". Neither branch above fires, because position 0
        is not "m3gim_id" and position 1 is on the exception list. Only column
        0 is renamed back positionally, and only if its values look like index
        ids; the remaining headers stay untouched so no note column mistakenly
        becomes wikidata_id.

    Returns None when the file is absent.
    """
    import pandas as pd  # lazy so _common stays importable without pandas

    path = Path(sheets_dir) / f"M3GIM-{name}.xlsx"
    if not path.exists():
        return None

    df = pd.read_excel(path)
    canonical = name.lower()

    if canonical in INDEX_HEADER_SHIFTS:
        expected = INDEX_HEADER_SHIFTS[canonical]
        col0 = str(df.columns[0]).strip().lower() if len(df.columns) else ""
        if col0 == "m3gim_id":
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

    if len(df.columns) and str(df.columns[0]).strip().lower() != "m3gim_id":
        col0 = df.columns[0]
        sample = df[col0].dropna().astype(str).str.strip().head(10)
        if len(sample) and all(re.match(r"^[A-Za-z]\d+$", s) for s in sample):
            print(f"  {name}: Kopfzelle der Kennungsspalte traegt '{col0}', "
                  "positionell auf 'm3gim_id' zurueckbenannt")
            df = df.rename(columns={col0: "m3gim_id"})

    return df


def default_currency_for(signatur: str | None) -> str | None:
    """Default currency when the archive signature has a known prefix."""
    if not signatur:
        return None
    for prefix, curr in FINANCE_CURRENCY_DEFAULTS.items():
        if signatur.startswith(prefix):
            return curr
    return None


# Controlled Bearbeitungsstand vocabulary: "abgeschlossen", "begonnen",
# "zurueckgestellt". The XLSX writes variants like "Vollständig", "erledigt",
# "zurückgestellt". Source fix: dropdown in Google Sheets.


def normalize_bearbeitungsstand(value) -> str | None:
    """Map free-text variants onto the canonical values.

    Accepts pandas NaN (float) and None, returning None in that case.
    Otherwise returns one of the three canonical values, or the lower-stripped
    value unchanged if no pattern matches (then test_03 fires).
    """
    if value is None or value != value:  # None or NaN (NaN != NaN)
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
    """Extract the free-text addition of the Bearbeitungsstand as a note (E-102).

    The canonical status (``normalize_bearbeitungsstand``) discards the
    parenthetical addition; here it is lifted out as ``m3gim-ontology:processingNote``,
    e.g. "Erledigt (Ira Malaniuk betreffend. Rest zurueckgestellt)" →
    "Ira Malaniuk betreffend. Rest zurueckgestellt". Returns None when there is
    no parenthetical addition.
    """
    if value is None or value != value:  # None or NaN
        return None
    s = str(value).strip()
    m = re.search(r"\(([^)]+)\)", s)
    if not m:
        return None
    notiz = m.group(1).strip()
    return notiz or None


def is_approved_match(match_entry: dict) -> bool:
    """May this reconciliation match pass through to enrichment/JSON-LD?

    Conservative low-confidence policy (see E-74):
    - ``exact`` and ``fuzzy_high`` (score >= 90) are released automatically.
    - ``fuzzy_low`` (score 80-89) only when ``manual_review: "approved"`` was set
      editorially. Everything else is skipped.

    Idempotent, no side effects.
    """
    level = match_entry.get("match")
    if level != "fuzzy_low":
        return True
    return match_entry.get("manual_review") == "approved"


def build_xlsx_source(sheet: str, row: int,
                      datenpunkt_id: int | str | None = None) -> dict:
    """Build the provenance sidecar object for m3gim-ontology:xlsxSource (E-73).

    Shape:
        {
            "m3gim-ontology:xlsxSheet": "<Objekte|Verknuepfungen>",
            "m3gim-ontology:xlsxRow":   <int >= 2>,
            "m3gim-ontology:dataPointId": <optional, nur falls gesetzt>,
        }

    Call pattern:
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
    """Attach ``rel[key]`` as ``m3gim-ontology:xlsxSource`` to ``target``.

    No-op when ``rel`` carries no source reference. Meant for use in
    ``transform.py`` wherever a nested entity is built from a Verknuepfung row
    (Agent, Location, Subject, Annotation, AgRelOn).
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
# Vocabulary reader
# ---------------------------------------------------------------------------
# At runtime the pipeline needs the mapping from a captured role value onto its
# concept in vocab/m3gim.ttl. That file sits above the pipeline in the spec
# hierarchy (E-133), it is the source and not a copy. rdflib lives only in
# requirements-test.txt; importing it would add a dependency the runtime
# environment does not have. This reader covers exactly the Turtle form the
# vocabulary uses and is held against a real parser by
# tests/test_47_vocab_reader.py.

VOCAB_PREFIX = "m3gim-vocab:"
DFT_SCHEME = VOCAB_PREFIX + "documentaryFormTypes"

_LITERAL_DE = re.compile(r'"((?:[^"\\]|\\.)*)"@de')
_IS_CONCEPT = re.compile(r"^\s*a\s+skos:Concept(?:\s|;|$)")


def _turtle_statements(text: str) -> Iterator[str]:
    """Split Turtle into its statements, without the trailing period.

    Quotes and angle brackets are tracked so a period inside a literal or an IRI
    does not split. Comments are dropped.
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
    """Object part of every mention of ``predicate`` in a Turtle statement."""
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
    """Read definition and concept scheme of the vocabulary concepts.

    Returns {CURIE: {"definition": str|None, "scheme": CURIE|None}}. The
    definition is the explanatory sentence the UI shows on a Fachbegriff; it
    lives in the vocabulary and is not duplicated in the frontend. The scheme
    separates document types from roles, which share the same prefix since the
    namespace tripartition.
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
    """Read dating scope and rank of the role concepts from the vocabulary.

    Returns {CURIE: {"scope": CURIE|None, "rank": int|None}}. Both lived as a
    hand table in the frontend until 2026-08-22 (E-150). The scope says what a
    dating dates, the rank decides between several anchoring datings of the same
    document.
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
    """Read the vocabulary's role concepts as German label onto concept.

    Returns {Label: (CURIE, prefLabel)}. Keys are the prefLabel and every German
    altLabel, so a merged term also resolves; the value always carries the
    prefLabel of the absorbing concept. Document types stay out because their
    display texts would collide with role values.
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
