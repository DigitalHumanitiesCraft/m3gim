"""Unit-Tests fuer Parse-/Normalisierungs-Funktionen aus scripts/transform.py.

Schnelle Unit-Tests ohne Pipeline-Run. Gibt sofortiges Feedback bei
Aenderungen an den Kern-Helfern (parse_monetary_value, normalize_role,
decompose_komposit_value).

Testbasis: konkrete Werte aus data/source-v2/ und Spezifikation in
knowledge/data.md.
"""

import sys
from pathlib import Path

import pytest

# scripts/transform.py importierbar machen
SCRIPTS = Path(__file__).parent.parent / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from transform import (  # noqa: E402
    parse_monetary_value,
    normalize_role,
    normalize_lower,
    decompose_komposit_typ,
    decompose_komposit_value,
    clean_date,
)


# ---------------------------------------------------------------------------
# parse_monetary_value — testet alle belegten v2-Finanz-Muster aus XLSX
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("raw,expected_amount,expected_currency", [
    # Standard AMOUNT, CURRENCY (Komma+Space als Waehrungstrenner)
    ("15, RM", "15", "RM"),
    ("150, RM", "150", "RM"),
    ("4000, Esc", "4000", "Esc"),
    ("2500, Esc", "2500", "Esc"),
    ("1360, DM", "1360", "DM"),
    ("1200, Fr", "1200", "Fr"),
    ("2, S", "2", "S"),
    ("2600, S", "2600", "S"),
    # Ohne Waehrung (Freitext-Betrag)
    ("36000", "36000", None),
    ("90000", "90000", None),
    ("180000", "180000", None),
    # Dezimaltrenner europaeisch DANN Komma+Waehrung ("631,50, Fr.")
    ("631,50, Fr.", "631.5", "Fr"),
    # Dezimalkomma, Space, Waehrung, KEIN Trenn-Komma ("1500,00 DM")
    ("1500,00 DM", "1500", "DM"),
    ("15,00 DM", "15", "DM"),
    ("200,00 Belgische Francs", "200", "Belgische Francs"),
    # Komma OHNE Space als reiner Waehrungstrenner ("153,DM")
    ("153,DM", "153", "DM"),
    # Tausenderpunkt + Komma+Waehrung
    ("1.200, DM", "1200", "DM"),
    ("150.000, Lire", "150000", "Lire"),
    ("280.000, Lire", "280000", "Lire"),
    # Space als Waehrungstrenner ohne Komma ("50000 Lire")
    ("50000 Lire", "50000", "Lire"),
    # Tausenderpunkt ohne Waehrung
    ("18.000", "18000", None),
    ("90.000", "90000", None),
    # Leerstring, None → beide None
    ("", None, None),
])
def test_parse_monetary_value_exact(raw, expected_amount, expected_currency):
    amount, currency = parse_monetary_value(raw)
    assert amount == expected_amount, f"{raw!r} amount mismatch"
    assert currency == expected_currency, f"{raw!r} currency mismatch"


def test_parse_monetary_value_none_safe():
    assert parse_monetary_value(None) == (None, None)


# ---------------------------------------------------------------------------
# normalize_role — Gender-Suffix-Strip + Case-Normalisierung
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("raw,expected", [
    # :in-Suffix
    ("sänger:in", "sänger"),
    ("dirigent:in", "dirigent"),
    ("regisseur:in", "regisseur"),
    ("adressat:in", "adressat"),
    ("empfänger:in", "empfänger"),
    ("arbeitgeber:in", "arbeitgeber"),
    ("Komponist:in", "komponist"),  # auch mit Grossbuchstabe am Anfang
    ("Bühnenleiter:in", "bühnenleiter"),
    # :innen-Suffix
    ("sänger:innen", "sänger"),
    # Kein Suffix bleibt unveraendert (nur lowercase)
    ("erwähnt", "erwähnt"),
    ("Aufführung", "aufführung"),
    ("auftritt", "auftritt"),
    ("repertoire", "repertoire"),
    ("gastspiel", "gastspiel"),
    # Ambigue Endung auf "in" ohne Doppelpunkt bleibt unberuehrt
    ("interpret", "interpret"),
    # Whitespace und Null
    ("  dirigent:in  ", "dirigent"),
    ("technische leitung", "technische leitung"),
])
def test_normalize_role(raw, expected):
    assert normalize_role(raw) == expected


def test_normalize_role_none_and_empty():
    assert normalize_role(None) is None
    assert normalize_role("") is None
    assert normalize_role("   ") is None


# ---------------------------------------------------------------------------
# decompose_komposit_typ / decompose_komposit_value
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("raw,expected", [
    ("ort, datum", ["ort", "datum"]),
    ("ausgaben, währung", ["ausgaben"]),
    ("einnahmen, währung", ["einnahmen"]),
    ("summe, währung", ["summe"]),
    ("person", ["person"]),
    ("ort, datum, währung", ["ort", "datum"]),  # hypothetisch
])
def test_decompose_komposit_typ(raw, expected):
    assert decompose_komposit_typ(raw) == expected


def test_decompose_ort_datum_splits_correctly():
    """Standard-Pattern 'Ortsname, YYYY...': Ort und Datum sauber getrennt."""
    result = decompose_komposit_value("München, 1952-12-17", ["ort", "datum"])
    assert result["ort"] == "München"
    assert result["datum"] == "1952-12-17"


def test_decompose_ort_datum_with_year_only():
    result = decompose_komposit_value("Lissabon, 1955", ["ort", "datum"])
    assert result["ort"] == "Lissabon"
    assert result["datum"].startswith("1955")


def test_decompose_ort_datum_freitext_beginn():
    """'Wien, ab 1956' wird am Komma getrennt und das Freitext-Datum auf den
    nach:-Qualifier normalisiert (E-102): ort='Wien', datum='nach:1956'. Kein
    Ort-Leak mehr ins Datumsfeld."""
    result = decompose_komposit_value("Wien, ab 1956", ["ort", "datum"])
    assert result["ort"] == "Wien"
    assert result["datum"] == "nach:1956"


# ---------------------------------------------------------------------------
# clean_date — Excel-Artefakte
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("raw,expected", [
    ("1958-04-18 00:00:00", "1958-04-18"),
    ("1958-04-18", "1958-04-18"),
    ("1958", "1958"),
    ("", None),
    ("  1960-12-14  ", "1960-12-14"),
    # YYYY-YYYY wird zu ISO-TimeSpan YYYY/YYYY normalisiert
    ("1947-1952", "1947/1952"),
    ("1945-1947", "1945/1947"),
    # YYYY-MM bleibt unveraendert (12 < 1000, kein Jahres-Range)
    ("1958-04", "1958-04"),
    # Freitext bleibt, Filter passiert in is_iso_date
    ("Wien, ab 1956", "Wien, ab 1956"),
    # "ohne Datum"-Platzhalter (und etablierte Kurzformen o. D.) -> None,
    # damit der Platzhalter nicht in rico:date landet (bricht das Schema).
    ("ohne Datum", None),
    ("Ohne Datum", None),
    ("OHNE DATUM", None),
    ("  ohne Datum  ", None),
    ("o. D.", None),
    ("o.D.", None),
    ("o. d.", None),
])
def test_clean_date(raw, expected):
    assert clean_date(raw) == expected


# ---------------------------------------------------------------------------
# is_iso_date — Gatekeeper fuer typisierte Datumsproperties
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("raw,expected", [
    ("1958-04-18", True),
    ("1958-04", True),
    ("1958", True),
    ("1947/1952", True),
    ("1958-08-10/1958-09-09", True),
    ("circa:1958", True),
    ("vor:1958", True),
    ("nach:1958", True),
    ("Wien, ab 1956", False),
    ("1947-1952", False),  # Bindestrich-Range nicht ISO (erwartet Slash)
    ("", False),
    ("unknown", False),
])
def test_is_iso_date(raw, expected):
    from transform import is_iso_date
    assert is_iso_date(raw) == expected


def test_clean_date_nan():
    import math
    assert clean_date(math.nan) is None
