"""Gemeinsame Utilities fuer die M3GIM-Pipeline-Scripts.

Enthaelt schlanke Helpers, die in mehreren Scripts identisch gebraucht
werden. Kein Framework, keine Abstraktion auf Vorrat — nur konkret
dedupliziertes Wissen.

Zentralisierte XLSX-Workaround-Konstanten siehe knowledge/data.md § 17.
"""

from __future__ import annotations

import re


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
# nutzen. Siehe knowledge/data.md § 17 und decisions.md E-95.
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
FINANCE_CURRENCY_DEFAULTS: dict[str, str] = {
    "UAKUG/NIM_007": "S",
}


def default_currency_for(signatur: str | None) -> str | None:
    """Default-Waehrung, wenn die Archivsignatur ein bekanntes Praefix hat."""
    if not signatur:
        return None
    for prefix, curr in FINANCE_CURRENCY_DEFAULTS.items():
        if signatur.startswith(prefix):
            return curr
    return None


# Kontrolliertes Bearbeitungsstand-Vokabular. XLSX schreibt Varianten wie
# "Vollständig", "erledigt", "zurückgestellt"; Pipeline mappt auf drei
# kanonische Werte. Source-Fix: Dropdown in Google Sheets.
BEARBEITUNGSSTAND_CANONICAL = {"abgeschlossen", "begonnen", "zurueckgestellt"}


def normalize_bearbeitungsstand(value) -> str | None:
    """Mappt Freitext-Varianten auf kanonische Werte.

    Akzeptiert pandas-NaN (Float) und None; liefert in dem Fall None zurueck.
    Rueckgabe sonst: einer aus ``BEARBEITUNGSSTAND_CANONICAL`` oder der
    lower-strip-Wert unveraendert, wenn kein Muster greift (dann schlaegt
    test_03 an).
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
    Klammer-Zusatz; hier wird er als ``m3gim:bearbeitungsnotiz`` herausgeloest,
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
    """Erzeugt das Provenance-Sidecar-Objekt fuer m3gim:xlsxSource (E-73).

    Shape:
        {
            "m3gim:xlsxSheet": "<Objekte|Verknuepfungen>",
            "m3gim:xlsxRow":   <int >= 2>,
            "m3gim:datenpunktId": <optional, nur falls gesetzt>,
        }

    Aufruf-Muster:
        record["m3gim:xlsxSource"] = build_xlsx_source("Objekte", row_idx + 2)
    """
    source = {
        "m3gim:xlsxSheet": sheet,
        "m3gim:xlsxRow": row,
    }
    if datenpunkt_id is not None:
        source["m3gim:datenpunktId"] = datenpunkt_id
    return source


def attach_xlsx_source(target: dict, rel: dict, key: str = "_source") -> None:
    """Haengt ``rel[key]`` als ``m3gim:xlsxSource`` an ``target``.

    No-op, wenn in ``rel`` keine Quellreferenz vorliegt. Soll in
    ``transform.py`` an jeder Stelle verwendet werden, an der aus einer
    Verknuepfungszeile eine nested entity gebaut wird (Agent, Location,
    Subject, DetailAnnotation, SpatiotemporalEvent, AgRelOn).
    """
    source = rel.get(key)
    if source:
        target["m3gim:xlsxSource"] = source
