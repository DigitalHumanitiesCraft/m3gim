"""Kalendarische Gueltigkeit der Datumswerte im erzeugten Datensatz.

Datierungen liegen im Datensatz durchgaengig als Zeichenkette vor (data.md
§ 7: "Alle Properties vom Typ xsd:string, weil historische Datierung die
ISO-Schema-Strenge von xsd:date regelmaessig ueberschreitet"). Zulaessig sind
nach data.md § 6 die Formen ``YYYY``, ``YYYY-MM`` und ``YYYY-MM-DD``,
Zeitspannen als ``.../...`` sowie die Qualifier ``circa:``, ``vor:`` und
``nach:``. Nicht zulaessig ist ein Monat oder Tag ausserhalb des Kalenders.

Genau das erzeugt die Wikidata-Anreicherung, solange sie das Feld
``precision`` verwirft: eine jahresgenau gefuehrte Angabe wird von Wikidata
als ``+1841-00-00T00:00:00Z`` serialisiert und landet als ``1841-00-00`` im
Datensatz (Befund AF-04, Entscheidungsvorlage vom 2026-08-21, Frage 4).
Betroffen sind ``schema:birthDate``, ``schema:deathDate``,
``m3gim:wdPremiereDate`` und ``m3gim:inception``.

Die geprueften Properties werden aus dem Datensatz ermittelt statt gelistet:
datumstragend ist eine Property, deren lokaler Name auf ``date``/``datum``
endet oder deren saemtliche Zeichenkettenwerte die Gestalt einer Datierung
haben. Kuenftige Datumsproperties fallen damit von selbst in die Pruefung,
waehrend ``m3gim:lifespan`` (``1888-1965``), Titel und Betraege draussen
bleiben.

Die Fallback-Klasse ``m3gim:DatedEvent`` mit ``m3gim:dateValue`` traegt laut
data.md § 6 bewusst die nicht routbaren Rohdatierungen (``06-09``,
``1957-[05-27?]``). Das sind Quellbefunde des Erfassungsteams und Sache des
Registers in data-errors.md, keine Pipeline-Fehler; die Gestaltregel haelt
die Property draussen, weil solche Werte keine Datierungsgestalt haben.
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
# Teil 1: Extraktion der Wikidata-Zeitwerte
# ---------------------------------------------------------------------------


def _load_enrich_module():
    """Laedt scripts/enrich-wikidata.py; der Bindestrich verbietet den Import."""
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
    """Wikidata-Claim mit Zeitwert, Aufbau wie in der wbgetentities-Antwort."""
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
        # Universitaet Mozarteum Salzburg (Q871369), P571, jahresgenau gefuehrt.
        ("+1841-00-00T00:00:00Z", 9, "1841"),
        # Théâtre National de l'Opéra-Comique (Q872222), P571.
        ("+1715-00-00T00:00:00Z", 9, "1715"),
        # Lebensdaten aus dem Personenindex, dieselbe Codestelle.
        ("+1914-00-00T00:00:00Z", 9, "1914"),
        ("+2005-00-00T00:00:00Z", 9, "2005"),
        # Monatsgenau und tagesgenau bleiben in ihrer Praezision.
        ("+1957-05-00T00:00:00Z", 10, "1957-05"),
        ("+1919-01-29T00:00:00Z", 11, "1919-01-29"),
        ("+1901-01-01T00:00:00Z", 11, "1901-01-01"),
        # Groeber als Jahr (Jahrzehnt, Jahrhundert): Jahresform ist die
        # kuerzeste vom Modell getragene Darstellung.
        ("+1980-00-00T00:00:00Z", 8, "1980"),
        # Ohne Praezisionsfeld bleibt kein Nullmonat und kein Nulltag stehen.
        ("+1841-00-00T00:00:00Z", None, "1841"),
    ],
)
def test_extract_claim_value_normalizes_time_to_precision(literal, precision, expected):
    """Zeitwerte werden auf ihre belegte Praezision normalisiert (AF-04)."""
    assert enrich.extract_claim_value(_time_claim(literal, precision)) == expected


def test_extract_claim_value_keeps_non_time_branches():
    """Die Nachbarzweige der Funktion bleiben unberuehrt."""
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
# Teil 2: Datumswerte im erzeugten Datensatz
# ---------------------------------------------------------------------------

QUALIFIER = re.compile(r"^(?:circa:|vor:|nach:)")

# Gestalt einer Datierung: Jahr, optional Monat und Tag, optional als Spanne.
# Bewusst ohne Wertebereich fuer Monat und Tag, damit die Nullform als
# Datierung erkannt und anschliessend als ungueltig gemeldet wird.
DATE_SHAPE = re.compile(
    r"^(?:circa:|vor:|nach:)?\d{4}(?:-\d{2}(?:-\d{2})?)?"
    r"(?:/(?:circa:|vor:|nach:)?\d{4}(?:-\d{2}(?:-\d{2})?)?)?$"
)

TOKEN = re.compile(r"^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$")


def _collect_string_values(graph: list) -> dict[str, list[str]]:
    """Sammelt je Property alle Zeichenkettenwerte des Graphen.

    Ein typisierter Literalknoten (``{"@value": ..., "@type": ...}``) wird der
    umgebenden Property zugerechnet, damit eine spaeter typisiert serialisierte
    Datumsproperty nicht aus der Pruefung faellt.
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
    """ISO-Datum, verkuerzte Form oder Zeitspanne, je mit Qualifier."""
    parts = value.split("/")
    if len(parts) > 2:
        return False
    return all(_valid_token(QUALIFIER.sub("", part)) for part in parts)


def _offenders(graph: list) -> list[tuple[str, str]]:
    found = []
    for prop, vals in sorted(_date_bearing(graph).items()):
        for val in vals:
            if not _valid_date_value(val):
                found.append((prop, val))
    return found


ENRICHED_DATE_PROPS = {
    "schema:birthDate",
    "schema:deathDate",
    "m3gim:wdPremiereDate",
    "m3gim:inception",
}


def test_date_bearing_properties_are_discovered(graph):
    """Die Ermittlung greift, deckt die angereicherten Zeitwerte ab und zieht
    weder Lebensspannen noch Titel oder Betraege herein."""
    discovered = _date_bearing(graph)
    assert len(discovered) >= 15, (
        f"Nur {len(discovered)} datumstragende Properties ermittelt — "
        "die Ermittlung greift nicht mehr"
    )
    assert "rico:date" in discovered, "rico:date nicht als datumstragend erkannt"
    missing = ENRICHED_DATE_PROPS - set(discovered)
    assert not missing, f"Angereicherte Zeitwerte nicht in der Pruefung: {sorted(missing)}"
    for false_positive in ("m3gim:lifespan", "rico:title", "m3gim:monetaryAmount"):
        assert false_positive not in discovered, (
            f"{false_positive} faelschlich als datumstragend erkannt"
        )

    checked = sum(len(v) for v in discovered.values())
    assert checked >= 500, f"Nur {checked} Datumswerte in der Pruefung"


@pytest.mark.xfail(
    strict=True,
    reason=(
        "data/output/m3gim.jsonld stammt aus dem Anreicherungslauf vor der "
        "Praezisions-Normalisierung in extract_claim_value; schema:birthDate, "
        "schema:deathDate, m3gim:wdPremiereDate und m3gim:inception tragen "
        "dort noch die Wikidata-Nullform YYYY-00-00 (AF-04). Der Marker faellt, "
        "sobald enrich-wikidata.py --force und transform.py gegen data/output "
        "nachgeholt sind."
    ),
)
def test_dataset_dates_are_valid_calendar_dates(graph):
    """Jeder Datumswert ist ein gueltiges Kalenderdatum oder eine belegte
    Verkuerzung auf Jahr oder Jahr und Monat."""
    offenders = _offenders(graph)
    assert not offenders, (
        f"{len(offenders)} ungueltige Datumswerte, "
        f"z. B. {sorted(set(offenders))[:8]}"
    )