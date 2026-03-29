#!/usr/bin/env python3
"""
M³GIM Enrich — Wikidata-Properties für reconcilierte Entitäten.

Liest wikidata-reconciliation.json, holt ausgewählte Properties
aus der Wikidata API und schreibt wikidata-enrichment.json.

Die Enrichment-Daten werden von transform.py in die JSON-LD-Ausgabe
injiziert (owl:sameAs, m3gim:occupation, m3gim:birthDate etc.).

Verwendung:
    python scripts/enrich-wikidata.py [--force] [--type person|org|location|work]
"""

import sys
import json
import time
import argparse
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime
from pathlib import Path

# Windows-Konsole: UTF-8 erzwingen
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent.parent
RECONCILIATION_FILE = BASE_DIR / "data" / "output" / "wikidata-reconciliation.json"
ENRICHMENT_FILE = BASE_DIR / "data" / "output" / "wikidata-enrichment.json"

# ---------------------------------------------------------------------------
# Wikidata API
# ---------------------------------------------------------------------------

WIKIDATA_API = "https://www.wikidata.org/w/api.php"
REQUEST_DELAY = 0.5
BATCH_SIZE = 50  # Max 50 IDs pro wbgetentities-Aufruf
USER_AGENT = "M3GIM-Enrich/1.0 (DH research project; mailto:pollin@dhcraft.org)"

# ---------------------------------------------------------------------------
# Property-Konfiguration pro Entitaetstyp
# ---------------------------------------------------------------------------

PROPERTY_MAP = {
    "person": {
        "P106": "occupation",      # Beruf (Entity-Ref Liste)
        "P412": "voiceType",       # Stimmfach (Entity-Ref)
        "P19":  "birthPlace",      # Geburtsort (Entity-Ref)
        "P20":  "deathPlace",      # Sterbeort (Entity-Ref)
        "P569": "birthDate",       # Geburtsdatum (Time)
        "P570": "deathDate",       # Sterbedatum (Time)
    },
    "location": {
        "P625": "coordinates",     # Koordinaten (GlobeCoordinate)
        "P17":  "country",         # Staat (Entity-Ref)
    },
    "work": {
        "P86":   "composer",       # Komponist (Entity-Ref)
        "P136":  "genre",          # Genre (Entity-Ref)
        "P1191": "premiereDate",   # Urauffuehrungsdatum (Time)
        "P577":  "publicationDate",  # Veroeffentlichungsdatum (Fallback fuer Aufnahmen)
    },
    "org": {
        "P276": "location",        # Standort (Entity-Ref)
        "P571": "inception",       # Gruendungsdatum (Time)
    },
}

ALL_PROPERTIES = set()
for props in PROPERTY_MAP.values():
    ALL_PROPERTIES.update(props.keys())


# ---------------------------------------------------------------------------
# API-Funktionen
# ---------------------------------------------------------------------------

def fetch_entities_batch(qids: list) -> dict:
    """Holt Claims und Labels fuer eine Batch von QIDs (max 50)."""
    params = {
        "action": "wbgetentities",
        "ids": "|".join(qids),
        "props": "claims|labels",
        "languages": "de|en",
        "format": "json",
    }
    url = f"{WIKIDATA_API}?{urllib.parse.urlencode(params)}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("entities", {})
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        print(f"  [WARN] API-Fehler fuer Batch: {e}")
        return {}


def resolve_labels(qids: list) -> dict:
    """Batch-Aufloesung von QIDs zu Labels (de bevorzugt, en Fallback)."""
    if not qids:
        return {}

    labels = {}
    for i in range(0, len(qids), BATCH_SIZE):
        batch = qids[i:i + BATCH_SIZE]
        params = {
            "action": "wbgetentities",
            "ids": "|".join(batch),
            "props": "labels",
            "languages": "de|en",
            "format": "json",
        }
        url = f"{WIKIDATA_API}?{urllib.parse.urlencode(params)}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for qid, entity in data.get("entities", {}).items():
                    lbl = entity.get("labels", {})
                    labels[qid] = (lbl.get("de") or lbl.get("en") or {}).get("value", qid)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
            pass
        time.sleep(REQUEST_DELAY)

    return labels


def extract_claim_value(claim: dict) -> dict | str | None:
    """Extrahiert einen lesbaren Wert aus einem Wikidata-Claim."""
    mainsnak = claim.get("mainsnak", {})
    snaktype = mainsnak.get("snaktype", "")
    if snaktype != "value":
        return None

    datavalue = mainsnak.get("datavalue", {})
    vtype = datavalue.get("type", "")
    value = datavalue.get("value", {})

    if vtype == "wikibase-entityid":
        qid = value.get("id", "")
        return {"qid": qid} if qid else None

    elif vtype == "time":
        # Format: +1919-01-29T00:00:00Z → 1919-01-29
        time_str = value.get("time", "")
        if time_str:
            # Strip leading +/- and trailing T00:00:00Z
            clean = time_str.lstrip("+-").split("T")[0]
            return clean
        return None

    elif vtype == "globecoordinate":
        return {
            "lat": value.get("latitude"),
            "lon": value.get("longitude"),
        }

    elif vtype == "string":
        return value

    return None


def extract_properties(entity: dict, prop_config: dict) -> dict:
    """Extrahiert konfigurierte Properties aus einer WD-Entitaet."""
    claims = entity.get("claims", {})
    result = {}

    for pid, field_name in prop_config.items():
        if pid not in claims:
            continue

        values = []
        for claim in claims[pid]:
            val = extract_claim_value(claim)
            if val is not None:
                values.append(val)

        if not values:
            continue

        # Einzelwert vs. Liste
        if pid in ("P625",):  # Koordinaten: immer Einzelwert
            result[field_name] = values[0]
        elif pid in ("P569", "P570", "P1191", "P571", "P577"):  # Datumsfelder: Einzelwert
            result[field_name] = values[0]
        elif pid in ("P19", "P20", "P17", "P276", "P86"):  # Entity-Refs: Einzelwert
            result[field_name] = values[0]
        else:  # P106, P412, P136: koennen mehrere sein
            result[field_name] = values

    return result


# ---------------------------------------------------------------------------
# Hauptprogramm
# ---------------------------------------------------------------------------

def load_previous_enrichment() -> dict:
    """Laedt vorhandene Enrichment-Daten als Cache."""
    if not ENRICHMENT_FILE.exists():
        return {}
    with open(ENRICHMENT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("entities", {})


def run_enrichment(entity_types: list, force: bool = False):
    """Holt WD-Properties fuer alle reconcilierten Entitaeten."""

    # Reconciliation-Ergebnisse laden
    if not RECONCILIATION_FILE.exists():
        print(f"Fehler: {RECONCILIATION_FILE} nicht gefunden.")
        print("Zuerst reconcile.py ausfuehren.")
        return

    with open(RECONCILIATION_FILE, "r", encoding="utf-8") as f:
        recon = json.load(f)

    matched = recon.get("matched", [])
    print(f"Reconciliation: {len(matched)} Matches geladen")

    # Cache laden (bei --force nur die gewaehlten Typen loeschen, Rest behalten)
    cache = load_previous_enrichment()
    if force:
        cache = {k: v for k, v in cache.items()
                 if v.get("type") not in entity_types}
    cached_count = 0

    # Entitaeten nach Typ filtern und gruppieren
    to_fetch = {}  # qid → {type, name}
    for m in matched:
        etype = m.get("type", "")
        if etype not in entity_types:
            continue
        if etype not in PROPERTY_MAP:
            continue

        qid = m.get("qid", "")
        if not qid:
            continue

        # Cache-Hit
        if qid in cache and not force:
            cached_count += 1
            continue

        to_fetch[qid] = {"type": etype, "name": m.get("name", "")}

    print(f"Zu fetchen: {len(to_fetch)} Entitaeten "
          f"(Cache: {cached_count} uebersprungen)")

    if not to_fetch:
        print("Nichts zu tun.")
        # Trotzdem Output schreiben (Cache erhalten)
        _write_output(cache, entity_types, matched)
        return

    # Batch-Fetch
    qid_list = list(to_fetch.keys())
    enriched = dict(cache)  # Start mit Cache
    pending_label_qids = set()

    for i in range(0, len(qid_list), BATCH_SIZE):
        batch = qid_list[i:i + BATCH_SIZE]
        print(f"  Batch {i // BATCH_SIZE + 1}: {len(batch)} QIDs...", end=" ",
              flush=True)

        entities = fetch_entities_batch(batch)
        time.sleep(REQUEST_DELAY)

        for qid in batch:
            info = to_fetch[qid]
            entity = entities.get(qid, {})
            prop_config = PROPERTY_MAP.get(info["type"], {})
            props = extract_properties(entity, prop_config)

            # Entity-Ref QIDs sammeln fuer Label-Aufloesung
            for field_name, val in props.items():
                if isinstance(val, dict) and "qid" in val:
                    pending_label_qids.add(val["qid"])
                elif isinstance(val, list):
                    for item in val:
                        if isinstance(item, dict) and "qid" in item:
                            pending_label_qids.add(item["qid"])

            enriched[qid] = {
                "type": info["type"],
                "name": info["name"],
                "properties": props,
            }

        print(f"OK ({len(entities)} Entitaeten)")

    # Labels fuer Entity-Referenzen aufloesen
    if pending_label_qids:
        print(f"\nLabels aufloesen: {len(pending_label_qids)} QIDs...")
        labels = resolve_labels(list(pending_label_qids))

        # Labels in Properties eintragen
        for qid_key, entry in enriched.items():
            props = entry.get("properties", {})
            for field_name, val in props.items():
                if isinstance(val, dict) and "qid" in val:
                    val["label"] = labels.get(val["qid"], val["qid"])
                elif isinstance(val, list):
                    for item in val:
                        if isinstance(item, dict) and "qid" in item:
                            item["label"] = labels.get(item["qid"], item["qid"])

    _write_output(enriched, entity_types, matched)


def _write_output(enriched: dict, entity_types: list, matched: list):
    """Schreibt Enrichment-JSON."""
    # Alle Properties auflisten
    all_props = set()
    for etype in entity_types:
        if etype in PROPERTY_MAP:
            all_props.update(PROPERTY_MAP[etype].keys())

    output = {
        "meta": {
            "date": datetime.now().isoformat(),
            "source": "wikidata-reconciliation.json",
            "entity_count": len(enriched),
            "properties_fetched": sorted(all_props),
        },
        "entities": enriched,
    }

    ENRICHMENT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(ENRICHMENT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # Zusammenfassung
    type_counts = {}
    for entry in enriched.values():
        t = entry.get("type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1

    print(f"\n{'='*60}")
    print(f"Enrichment abgeschlossen:")
    for t, c in sorted(type_counts.items()):
        print(f"  {t}: {c} Entitaeten")
    print(f"  Gesamt: {len(enriched)}")
    print(f"\nGespeichert: {ENRICHMENT_FILE}")
    print(f"\nNaechster Schritt:")
    print(f"  python scripts/transform.py")


def main():
    parser = argparse.ArgumentParser(
        description="M³GIM Wikidata-Enrichment"
    )
    parser.add_argument(
        "--type", choices=["person", "org", "location", "work"],
        help="Nur einen bestimmten Typ anreichern"
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Cache ignorieren, alle Entitaeten neu fetchen"
    )
    args = parser.parse_args()

    entity_types = [args.type] if args.type else [
        "person", "org", "location", "work"
    ]

    print("M³GIM Wikidata-Enrichment")
    print(f"Typen: {', '.join(entity_types)}")
    if args.force:
        print("[FORCE — Cache wird ignoriert]")

    run_enrichment(entity_types, force=args.force)


if __name__ == "__main__":
    main()
