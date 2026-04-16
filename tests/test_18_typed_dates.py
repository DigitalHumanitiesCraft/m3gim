"""Typisierte Datumsproperty-Spec: Phase 4.7 aus data.md Abschnitt 7.

STATUS: aktuell xfail. Wird grun, wenn die Pipeline Datums-Verknuepfungen
nach Rolle typisiert emittiert (statt generischem m3gim:eventDate):
  rolle=absendedatum       -> m3gim:absendedatum
  rolle=empfangsdatum      -> m3gim:empfangsdatum
  rolle=auftritt / aufführung -> m3gim:auftrittsdatum / m3gim:auffuehrungsdatum
  rolle=premiere           -> m3gim:premieredatum
  rolle=spielzeit          -> m3gim:spielzeitVon / m3gim:spielzeitBis
  ... (data.md § 7 vollstaendige Liste)
"""

import re

import pytest

from _helpers import ensure_list


TYPED_DATE_PROPS = {
    "m3gim:absendedatum",
    "m3gim:empfangsdatum",
    "m3gim:ausstellungsdatum",
    "m3gim:erscheinungsdatum",
    "m3gim:abreisedatum",
    "m3gim:auftrittsdatum",
    "m3gim:auffuehrungsdatum",
    "m3gim:probendatum",
    "m3gim:probenbeginn",
    "m3gim:premieredatum",
    "m3gim:ausstrahlungsdatum",
    "m3gim:spielzeitVon",
    "m3gim:spielzeitBis",
    "m3gim:ueberweisungsdatum",
}


def _any_typed_date(record) -> bool:
    return any(prop in record for prop in TYPED_DATE_PROPS)


def test_records_use_typed_date_properties(records):
    """Mindestens ein Record nutzt eine typisierte Datumsproperty (Nachweis,
    dass die Typisierung ueberhaupt stattfindet, Phase 4.7)."""
    typed = [r for r in records if _any_typed_date(r)]
    assert typed, "Keine typisierten Datumsproperties im Output"


def test_event_date_property_retired_for_typed_cases(records):
    """Nach Phase 4.7: typisierte Records sollten mindestens so haeufig sein
    wie generisches eventDate. Wenn generic noch dominiert, deckt
    DATUMSROLLE_TO_PROPERTY nicht alle belegten Rollen ab."""
    typed_count = sum(1 for r in records if _any_typed_date(r))
    generic_count = sum(1 for r in records if "m3gim:eventDate" in r)
    assert typed_count >= generic_count, (
        f"typed={typed_count} vs generic eventDate={generic_count} "
        f"— DATUMSROLLE_TO_PROPERTY erweitern"
    )


def test_typed_date_values_iso_or_qualified(records):
    """Werte der typisierten Datumsproperties sind ISO-8601, TimeSpan
    (YYYY/YYYY), oder qualifiziert (circa:/vor:/nach:). Mindestens 10 typisierte
    Date-Vorkommen erwartet (Phase 4.7 wirksam)."""
    iso_or_range = re.compile(
        r"^(circa:|vor:|nach:)?\d{4}(-\d{2}(-\d{2})?)?(/\d{4}(-\d{2}(-\d{2})?)?)?$"
    )
    offenders = []
    total = 0
    for r in records:
        for prop in TYPED_DATE_PROPS:
            for val in ensure_list(r.get(prop)):
                total += 1
                if isinstance(val, str) and not iso_or_range.match(val):
                    offenders.append((r["@id"], prop, val))
    assert total >= 10, f"Nur {total} typisierte Date-Eintraege im Output"
    assert not offenders, f"Nicht-ISO-Werte in typisierten Datumsproperties: {offenders[:5]}"
