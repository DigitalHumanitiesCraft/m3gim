"""Calendar validity of the date values in the generated dataset.

Datierungen are stored throughout as strings (data-model.md § 7: "Alle
Properties vom Typ xsd:string, weil historische Datierung die ISO-Schema-Strenge
von xsd:date regelmaessig ueberschreitet"). Per data.md § 6 the admissible forms
are ``YYYY``, ``YYYY-MM`` and ``YYYY-MM-DD``, spans as ``.../...`` and the
qualifiers ``circa:``, ``vor:`` and ``nach:``. A month or day outside the
calendar is not admissible.

That is exactly what the Wikidata enrichment produces while it discards the
``precision`` field: a year-precision value is serialized by Wikidata as
``+1841-00-00T00:00:00Z`` and lands as ``1841-00-00`` in the dataset (finding
AF-04, decision template of 2026-08-21, question 4). Affected are
``schema:birthDate``, ``schema:deathDate``, ``m3gim-ontology:wdPremiereDate``
and ``m3gim-ontology:wdInception``.

The checked properties are discovered from the dataset rather than listed: a
property is date-bearing if its local name ends in ``date``/``datum`` or if all
its string values have the shape of a Datierung. Future date properties thus
fall into the check on their own, while ``m3gim-ontology:lifespan``
(``1888-1965``), titles and amounts stay out.

Per data.md § 6 the annotation node deliberately carries the non-routable raw
Datierungen (``06-09``, ``1957-[05-27?]``). These are source findings of the
cataloguing team and a matter for the register in
data/reports/reconciliation-register.md, not pipeline errors. Since the rebuild
they sit in the same property as any other Datierung; they carry the flag
``datierung-malformed`` and stay out of the calendar check with it.
"""

from __future__ import annotations

import calendar
import importlib.util
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
SCRIPTS = REPO_ROOT / "scripts"


# ---------------------------------------------------------------------------
# Part 1: extracting the Wikidata time values
# ---------------------------------------------------------------------------


def _load_enrich_module():
    """Loads scripts/enrich-wikidata.py; the hyphen forbids a plain import."""
    if str(SCRIPTS) not in sys.path:
        sys.path.insert(0, str(SCRIPTS))
    spec = importlib.util.spec_from_file_location(
        "enrich_wikidata", SCRIPTS / "enrich-wikidata.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


enrich = _load_enrich_module()


def _time_claim(literal: str, precision: int | None) -> dict:
    """Wikidata claim with a time value, shaped like the wbgetentities response."""
    value = {
        "time": literal,
        "timezone": 0,
        "before": 0,
        "after": 0,
        "calendarmodel": "http://www.wikidata.org/entity/Q1985727",
    }
    if precision is not None:
        value["precision"] = precision
    return {
        "mainsnak": {
            "snaktype": "value",
            "property": "P571",
            "datavalue": {"type": "time", "value": value},
        }
    }


@pytest.mark.parametrize(
    ("literal", "precision", "expected"),
    [
        # Universitaet Mozarteum Salzburg (Q871369), P571, year precision.
        ("+1841-00-00T00:00:00Z", 9, "1841"),
        # Théâtre National de l'Opéra-Comique (Q872222), P571.
        ("+1715-00-00T00:00:00Z", 9, "1715"),
        # Life dates from the person index, same code path.
        ("+1914-00-00T00:00:00Z", 9, "1914"),
        ("+2005-00-00T00:00:00Z", 9, "2005"),
        # Month and day precision keep their precision.
        ("+1957-05-00T00:00:00Z", 10, "1957-05"),
        ("+1919-01-29T00:00:00Z", 11, "1919-01-29"),
        ("+1901-01-01T00:00:00Z", 11, "1901-01-01"),
        # Coarser than year (decade, century): the year form is the shortest
        # representation the model carries.
        ("+1980-00-00T00:00:00Z", 8, "1980"),
        # Without a precision field no zero month and no zero day remains.
        ("+1841-00-00T00:00:00Z", None, "1841"),
    ],
)
def test_extract_claim_value_normalizes_time_to_precision(literal, precision, expected):
    """Time values are normalized to their attested precision (AF-04)."""
    assert enrich.extract_claim_value(_time_claim(literal, precision)) == expected


def test_extract_claim_value_keeps_non_time_branches():
    """The neighbouring branches of the function stay untouched."""
    entity_claim = {
        "mainsnak": {
            "snaktype": "value",
            "datavalue": {"type": "wikibase-entityid", "value": {"id": "Q183"}},
        }
    }
    coord_claim = {
        "mainsnak": {
            "snaktype": "value",
            "datavalue": {
                "type": "globecoordinate",
                "value": {"latitude": 47.07, "longitude": 15.44},
            },
        }
    }
    novalue_claim = {"mainsnak": {"snaktype": "somevalue"}}

    assert enrich.extract_claim_value(entity_claim) == {"qid": "Q183"}
    assert enrich.extract_claim_value(coord_claim) == {"lat": 47.07, "lon": 15.44}
    assert enrich.extract_claim_value(novalue_claim) is None


# ---------------------------------------------------------------------------
# Part 2: date values in the generated dataset
# ---------------------------------------------------------------------------

QUALIFIER = re.compile(r"^(?:circa:|vor:|nach:)")

# Shape of a Datierung: year, optionally month and day, optionally a span.
# Deliberately without a value range for month and day, so the zero form is
# recognized as a Datierung and then reported as invalid.
DATE_SHAPE = re.compile(
    r"^(?:circa:|vor:|nach:)?\d{4}(?:-\d{2}(?:-\d{2})?)?"
    r"(?:/(?:circa:|vor:|nach:)?\d{4}(?:-\d{2}(?:-\d{2})?)?)?$"
)

TOKEN = re.compile(r"^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$")


def _collect_string_values(graph: list) -> dict[str, list[str]]:
    """Collects all string values of the graph per property.

    A typed literal node (``{"@value": ..., "@type": ...}``) is attributed to
    its surrounding property, so a later typed-serialized date property does not
    fall out of the check.
    """
    values: dict[str, list[str]] = {}

    def visit(node, parent: str | None):
        if isinstance(node, dict):
            for key, val in node.items():
                if key == "@value" and isinstance(val, str) and parent:
                    values.setdefault(parent, []).append(val)
                elif isinstance(val, str) and not key.startswith("@"):
                    values.setdefault(key, []).append(val)
                visit(val, key)
        elif isinstance(node, list):
            for item in node:
                visit(item, parent)

    visit(graph, None)
    return values


def _is_date_bearing(prop: str, prop_values: list[str]) -> bool:
    local = prop.split(":")[-1].lower()
    if local.endswith(("date", "datum")):
        return True
    return bool(prop_values) and all(DATE_SHAPE.match(v) for v in prop_values)


def _date_bearing(graph: list) -> dict[str, list[str]]:
    return {
        prop: vals
        for prop, vals in _collect_string_values(graph).items()
        if _is_date_bearing(prop, vals)
    }


def _valid_token(token: str) -> bool:
    match = TOKEN.match(token)
    if not match:
        return False
    year, month, day = match.groups()
    if month is None:
        return True
    if not 1 <= int(month) <= 12:
        return False
    if day is None:
        return True
    return 1 <= int(day) <= calendar.monthrange(int(year), int(month))[1]


def _valid_date_value(value: str) -> bool:
    """ISO date, shortened form or span, each with an optional qualifier."""
    parts = value.split("/")
    if len(parts) > 2:
        return False
    return all(_valid_token(QUALIFIER.sub("", part)) for part in parts)


def _flagged_malformed_values(graph: list) -> set[str]:
    """Date values that their own node marks as a source finding.

    A notation deviation of the source stays verbatim and carries
    ``datierung-malformed`` for it. It is a finding for
    data/reports/reconciliation-register.md and not a calendar error of the
    pipeline.
    """
    flagged: set[str] = set()

    def visit(node):
        if isinstance(node, dict):
            flags = node.get("m3gim-ontology:dataQualityFlag")
            flags = flags if isinstance(flags, list) else [flags]
            if "datierung-malformed" in flags:
                value = node.get("m3gim-ontology:atDate")
                if isinstance(value, str):
                    flagged.add(value)
            for val in node.values():
                visit(val)
        elif isinstance(node, list):
            for item in node:
                visit(item)

    visit(graph)
    return flagged


def _offenders(graph: list) -> list[tuple[str, str]]:
    excused = _flagged_malformed_values(graph)
    found = []
    for prop, vals in sorted(_date_bearing(graph).items()):
        for val in vals:
            if val in excused:
                continue
            if not _valid_date_value(val):
                found.append((prop, val))
    return found


ENRICHED_DATE_PROPS = {
    "schema:birthDate",
    "schema:deathDate",
    "m3gim-ontology:wdPremiereDate",
    "m3gim-ontology:wdInception",
}


def test_date_bearing_properties_are_discovered(graph):
    """The discovery works, covers the enriched time values and pulls in
    neither lifespans nor titles or amounts."""
    discovered = _date_bearing(graph)
    assert len(discovered) >= 6, (
        f"Nur {len(discovered)} datumstragende Properties ermittelt — "
        "die Ermittlung greift nicht mehr"
    )
    for required in ("rico:date", "rico:creationDate", "m3gim-ontology:atDate"):
        assert required in discovered, f"{required} nicht als datumstragend erkannt"
    missing = ENRICHED_DATE_PROPS - set(discovered)
    assert not missing, f"Angereicherte Zeitwerte nicht in der Pruefung: {sorted(missing)}"
    for false_positive in ("m3gim-ontology:lifespan", "rico:title", "m3gim-ontology:monetaryAmount"):
        assert false_positive not in discovered, (
            f"{false_positive} faelschlich als datumstragend erkannt"
        )

    checked = sum(len(v) for v in discovered.values())
    assert checked >= 500, f"Nur {checked} Datumswerte in der Pruefung"


@pytest.mark.xfail(
    reason="Quellfehler (Partner-Uebergabeliste): drei unmoegliche Kalenderdaten in UAKUG/NIM_005 "
           "(1951-02-29, 1959-31-08, 1959-02-30). Quellfehler, siehe "
           "knowledge/data/reports/reconciliation-register.md",
    strict=True,
)
def test_dataset_dates_are_valid_calendar_dates(graph):
    """Every date value is a valid calendar date or an attested shortening to
    year, or year and month."""
    offenders = _offenders(graph)
    assert not offenders, (
        f"{len(offenders)} ungueltige Datumswerte, "
        f"z. B. {sorted(set(offenders))[:8]}"
    )