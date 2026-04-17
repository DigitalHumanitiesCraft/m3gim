"""Gemeinsame Utilities fuer die M3GIM-Pipeline-Scripts.

Enthaelt schlanke Helpers, die in mehreren Scripts identisch gebraucht
werden. Kein Framework, keine Abstraktion auf Vorrat — nur konkret
dedupliziertes Wissen.
"""

from __future__ import annotations


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
