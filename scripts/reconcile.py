#!/usr/bin/env python3
"""
M³GIM Reconcile — Wikidata-Reconciliation für Indizes.

Liest die 4 Index-Tabellen (Personen, Organisationen, Orte, Werke),
fragt die Wikidata Search API ab und traegt Q-IDs ein, wenn ein
100%-Match vorliegt. Ergebnisse werden als JSON-Datei gespeichert,
die von transform.py bei der naechsten Pipeline-Ausfuehrung
uebernommen wird.

Strategie:
  - Nur exakte Matches (Label == Name, case-insensitive)
  - Personen: zusaetzlich Filterung auf instance-of human (Q5)
  - Organisationen: Filterung auf organisation/institution
  - Orte: Filterung auf geographic entity
  - Werke: Suche mit "Komponist + Titel" fuer bessere Praezision
  - Alles was nicht 100% matcht → manuell (spaeter)

Verwendung:
    python scripts/reconcile.py [--dry-run] [--type person|org|location|work]
                                [--force]
"""

import sys
import json
import time
import argparse
import urllib.request
import urllib.parse
import urllib.error
import pandas as pd
from datetime import datetime
from pathlib import Path

# Windows-Konsole: UTF-8 erzwingen
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent.parent
SHEETS_DIR = BASE_DIR / "data" / "google-spreadsheet"
OUTPUT_FILE = BASE_DIR / "data" / "output" / "wikidata-reconciliation.json"

# ---------------------------------------------------------------------------
# Wikidata API
# ---------------------------------------------------------------------------

WIKIDATA_API = "https://www.wikidata.org/w/api.php"
REQUEST_DELAY = 0.5  # Sekunden zwischen Anfragen (Rate Limiting)
MIN_NAME_LENGTH = 3  # Kurze Namen (Kuerzel, Initialien) ueberspringen

# Instance-of (P31) Werte fuer Filterung
Q_HUMAN = "Q5"
Q_GEOGRAPHIC = {"Q515", "Q486972", "Q1549591", "Q3957", "Q6256", "Q35657"}
# Q515=city, Q486972=human settlement, Q1549591=municipality, Q3957=town,
# Q6256=country, Q35657=state

Q_ORGANIZATION = {"Q43229", "Q4830453", "Q3918", "Q7075", "Q31855",
                   "Q2385804", "Q24354", "Q57660343"}
# Q43229=organization, Q4830453=business, Q3918=university, Q7075=library,
# Q31855=research institute, Q2385804=musical ensemble,
# Q24354=theater, Q57660343=opera house

Q_MUSICAL_WORK = {"Q105543609", "Q7725634", "Q1344", "Q7366", "Q9730",
                   "Q482994", "Q188451"}
# Q105543609=musical work/composition, Q7725634=literary work,
# Q1344=opera, Q7366=song, Q9730=classical music composition,
# Q482994=musical composition, Q188451=musical work


def search_wikidata(query: str, language: str = "de", limit: int = 5) -> list:
    """Sucht Entitaeten ueber die Wikidata Search API."""
    params = {
        "action": "wbsearchentities",
        "search": query,
        "language": language,
        "limit": str(limit),
        "format": "json",
    }
    url = f"{WIKIDATA_API}?{urllib.parse.urlencode(params)}"

    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "M3GIM-Reconcile/1.0 (DH research project; mailto:pollin@dhcraft.org)"
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("search", [])
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        print(f"  [WARN] API-Fehler fuer '{query}': {e}")
        return []


def get_entity_claims(qid: str) -> dict:
    """Holt die Claims (P31 etc.) fuer eine Entitaet."""
    params = {
        "action": "wbgetentities",
        "ids": qid,
        "props": "claims",
        "format": "json",
    }
    url = f"{WIKIDATA_API}?{urllib.parse.urlencode(params)}"

    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "M3GIM-Reconcile/1.0 (DH research project; mailto:pollin@dhcraft.org)"
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            entity = data.get("entities", {}).get(qid, {})
            return entity.get("claims", {})
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
        return {}


def get_instance_of(claims: dict) -> set:
    """Extrahiert alle P31 (instance-of) Q-IDs aus Claims."""
    p31 = claims.get("P31", [])
    result = set()
    for claim in p31:
        mainsnak = claim.get("mainsnak", {})
        datavalue = mainsnak.get("datavalue", {})
        value = datavalue.get("value", {})
        if isinstance(value, dict) and "id" in value:
            result.add(value["id"])
    return result


def is_exact_match(search_name: str, result_label: str) -> bool:
    """Prueft ob der Name exakt uebereinstimmt (case-insensitive)."""
    return search_name.strip().lower() == result_label.strip().lower()


def check_type(qid: str, expected_types: set) -> bool:
    """Prueft ob eine Entitaet den erwarteten P31-Typ hat."""
    time.sleep(REQUEST_DELAY)
    claims = get_entity_claims(qid)
    instances = get_instance_of(claims)
    if isinstance(expected_types, str):
        return expected_types in instances
    return bool(instances & expected_types)


# ---------------------------------------------------------------------------
# Reconciliation-Funktionen pro Typ
# ---------------------------------------------------------------------------

def reconcile_person(name: str, **_) -> dict | None:
    """Reconciliation fuer Personen: Name → Q-ID wenn exakter Match + Q5."""
    results = search_wikidata(name, language="de")
    if not results:
        parts = name.split(",", 1)
        if len(parts) == 2:
            reversed_name = f"{parts[1].strip()} {parts[0].strip()}"
            results = search_wikidata(reversed_name, language="de")

    for r in results:
        label = r.get("label", "")
        qid = r.get("id", "")

        if is_exact_match(name, label):
            if check_type(qid, Q_HUMAN):
                return {"qid": qid, "label": label, "match": "exact_label"}

        parts = name.split(",", 1)
        if len(parts) == 2:
            reversed_name = f"{parts[1].strip()} {parts[0].strip()}"
            if is_exact_match(reversed_name, label):
                if check_type(qid, Q_HUMAN):
                    return {"qid": qid, "label": label, "match": "exact_reversed"}

    return None


def reconcile_simple(name: str, expected_types: set, **_) -> dict | None:
    """Generische Reconciliation: exakter Match + P31-Typfilter."""
    results = search_wikidata(name, language="de")

    for r in results:
        label = r.get("label", "")
        qid = r.get("id", "")
        if is_exact_match(name, label):
            if check_type(qid, expected_types):
                return {"qid": qid, "label": label, "match": "exact_label"}

    return None


def reconcile_work(name: str, komponist: str = None, **_) -> dict | None:
    """Reconciliation fuer Werke. Sucht mit Komponist fuer bessere Praezision."""
    query = f"{name} {komponist}" if komponist else name
    results = search_wikidata(query, language="de")

    for r in results:
        label = r.get("label", "")
        qid = r.get("id", "")
        if is_exact_match(name, label):
            if check_type(qid, Q_MUSICAL_WORK):
                return {"qid": qid, "label": label, "match": "exact_label"}

    return None


# ---------------------------------------------------------------------------
# Index-Konfiguration (ersetzt den Duplikat-Code)
# ---------------------------------------------------------------------------

HEADER_SHIFTS = {
    "organisationsindex": ["m3gim_id", "name", "wikidata_id", "ort",
                           "assoziierte_person", "anmerkung"],
    "ortsindex": ["m3gim_id", "name", "wikidata_id"],
    "werkindex": ["m3gim_id", "name", "wikidata_id", "komponist",
                  "rolle_stimme", "anmerkung"]
}

INDEX_CONFIG = [
    {
        "type": "person",
        "label": "Personenindex",
        "filename": "M3GIM-Personenindex.xlsx",
        "shift_key": None,
        "reconcile_fn": reconcile_person,
        "extra_fields": [],
    },
    {
        "type": "org",
        "label": "Organisationsindex",
        "filename": "M3GIM-Organisationsindex.xlsx",
        "shift_key": "organisationsindex",
        "reconcile_fn": lambda name, **kw: reconcile_simple(name, Q_ORGANIZATION),
        "extra_fields": [],
    },
    {
        "type": "location",
        "label": "Ortsindex",
        "filename": "M3GIM-Ortsindex.xlsx",
        "shift_key": "ortsindex",
        "reconcile_fn": lambda name, **kw: reconcile_simple(name, Q_GEOGRAPHIC),
        "extra_fields": [],
    },
    {
        "type": "work",
        "label": "Werkindex",
        "filename": "M3GIM-Werkindex.xlsx",
        "shift_key": "werkindex",
        "reconcile_fn": reconcile_work,
        "extra_fields": ["komponist"],
    },
]


def load_index(filename: str, shift_key: str = None) -> pd.DataFrame:
    """Laedt eine Index-Tabelle mit optionaler Header-Shift-Korrektur."""
    path = SHEETS_DIR / filename
    if not path.exists():
        print(f"  [SKIP] {filename} nicht gefunden")
        return pd.DataFrame()

    df = pd.read_excel(path)

    if shift_key and shift_key in HEADER_SHIFTS:
        expected = HEADER_SHIFTS[shift_key]
        if len(df.columns) >= len(expected):
            first_row = df.iloc[0].tolist()
            df.columns = expected + list(df.columns[len(expected):])
            first_df = pd.DataFrame([first_row], columns=df.columns)
            df = pd.concat([first_df, df.iloc[1:]], ignore_index=True)

    return df


# ---------------------------------------------------------------------------
# Caching: vorhandene Ergebnisse laden
# ---------------------------------------------------------------------------

def load_previous_results() -> dict:
    """Laedt vorhandene Reconciliation-Ergebnisse als Cache.

    Returns dict mit:
      matched_keys: set of (type, name) Tupeln
      unmatched_keys: set of (type, name) Tupeln
      matched_data: dict (type, name) → vollstaendiger Match-Eintrag
    """
    empty = {"matched_keys": set(), "unmatched_keys": set(), "matched_data": {}}
    if not OUTPUT_FILE.exists():
        return empty

    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    result = {
        "matched_keys": set(),
        "unmatched_keys": set(),
        "matched_data": {},
    }
    for m in data.get("matched", []):
        key = (m["type"], m["name"])
        result["matched_keys"].add(key)
        result["matched_data"][key] = m
    for u in data.get("unmatched", []):
        result["unmatched_keys"].add((u["type"], u["name"]))

    return result


# ---------------------------------------------------------------------------
# Hauptprogramm
# ---------------------------------------------------------------------------

def run_reconciliation(entity_types: list, dry_run: bool = False,
                       force: bool = False):
    """Fuehrt die Reconciliation durch."""

    # Cache laden (ueberspringbare Namen)
    cache = load_previous_results() if not force else {
        "matched_keys": set(), "unmatched_keys": set(), "matched_data": {}
    }
    cached_count = 0

    results = {
        "meta": {
            "date": datetime.now().isoformat(),
            "strategy": "exact_match_only",
            "min_name_length": MIN_NAME_LENGTH,
            "note": "Nur 100%-Matches. Rest muss manuell geprueft werden."
        },
        "matched": [],
        "unmatched": [],
        "skipped": [],
    }

    # Vorhandene Matches aus Cache uebernehmen (damit sie nicht verloren gehen)
    if not force and OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            prev = json.load(f)
        # Nur Matches uebernehmen, die nicht im aktuellen Lauf neu abgefragt werden
        for m in prev.get("matched", []):
            if m["type"] not in entity_types:
                results["matched"].append(m)
        for u in prev.get("unmatched", []):
            if u["type"] not in entity_types:
                results["unmatched"].append(u)
        for s in prev.get("skipped", []):
            if s["type"] not in entity_types:
                results["skipped"].append(s)

    for cfg in INDEX_CONFIG:
        etype = cfg["type"]
        if etype not in entity_types:
            continue

        print(f"\n=== {cfg['label']} ===")
        df = load_index(cfg["filename"], shift_key=cfg["shift_key"])
        if df.empty:
            continue

        # Spaltennamen ermitteln
        name_col = "name" if "name" in df.columns else df.columns[1]
        wd_col = "wikidata_id" if "wikidata_id" in df.columns else None

        for _, row in df.iterrows():
            name = str(row.get(name_col, "")).strip()
            existing_wd = str(row.get(wd_col, "")).strip() if wd_col else ""

            if not name or name == "nan":
                continue

            # Bereits im Google Sheet verknuepft
            if existing_wd and existing_wd != "nan" and existing_wd != "":
                results["skipped"].append({
                    "type": etype, "name": name,
                    "existing_qid": existing_wd
                })
                print(f"  [SKIP] {name} — bereits {existing_wd}")
                continue

            # Mindestlaenge pruefen (verhindert False Positives bei Kuerzeln)
            if len(name) < MIN_NAME_LENGTH:
                results["skipped"].append({
                    "type": etype, "name": name,
                    "existing_qid": f"zu kurz ({len(name)} Zeichen)"
                })
                print(f"  [SKIP] {name} — zu kurz ({len(name)} Zeichen)")
                continue

            # Cache-Hit: bereits abgefragt, Ergebnis wiederverwenden
            cache_key = (etype, name)
            if cache_key in cache["matched_keys"]:
                prev_match = cache["matched_data"].get(cache_key)
                if prev_match:
                    results["matched"].append(prev_match)
                    cached_count += 1
                    print(f"  [CACHE] {name} → {prev_match['qid']}")
                    continue
            if cache_key in cache["unmatched_keys"]:
                results["unmatched"].append({"type": etype, "name": name})
                cached_count += 1
                print(f"  [CACHE] {name} → kein Match")
                continue

            # Extra-Felder sammeln (z.B. komponist fuer Werke)
            extra = {}
            for field in cfg["extra_fields"]:
                val = str(row.get(field, "")).strip()
                extra[field] = val if val != "nan" else None

            # Anzeige
            display = name
            if extra.get("komponist"):
                display = f"{name} ({extra['komponist']})"
            print(f"  [SEARCH] {display}...", end=" ", flush=True)

            if dry_run:
                print("→ [DRY RUN]")
                continue

            match = cfg["reconcile_fn"](name, **extra)
            time.sleep(REQUEST_DELAY)

            if match:
                entry = {"type": etype, "name": name, **extra, **match}
                results["matched"].append(entry)
                print(f"→ {match['qid']} ({match['match']})")
            else:
                entry = {"type": etype, "name": name}
                if extra:
                    entry.update(extra)
                results["unmatched"].append(entry)
                print("→ kein Match")

    # --- Ergebnis speichern (nicht im Dry-Run) ---
    if not dry_run:
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

    # --- Zusammenfassung ---
    print(f"\n{'='*60}")
    print(f"Ergebnis:")
    print(f"  Matches:      {len(results['matched'])}")
    print(f"  Kein Match:   {len(results['unmatched'])}")
    print(f"  Uebersprungen: {len(results['skipped'])}")
    if cached_count > 0:
        print(f"  Aus Cache:    {cached_count}")
    if not dry_run:
        print(f"\nGespeichert: {OUTPUT_FILE}")

    if not dry_run and results["matched"]:
        print(f"\nNaechster Schritt:")
        print(f"  Pipeline neu ausfuehren: python scripts/transform.py")
        print(f"  (transform.py liest {OUTPUT_FILE.name} automatisch)")


def main():
    parser = argparse.ArgumentParser(
        description="M³GIM Wikidata-Reconciliation"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Nur Namen auflisten, keine API-Abfragen"
    )
    parser.add_argument(
        "--type", choices=["person", "org", "location", "work"],
        help="Nur einen bestimmten Typ reconcilen"
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Cache ignorieren, alle Namen neu abfragen"
    )
    args = parser.parse_args()

    entity_types = [args.type] if args.type else [
        "person", "org", "location", "work"
    ]

    print("M³GIM Wikidata-Reconciliation")
    print(f"Strategie: Nur exakte Matches (100%), min. {MIN_NAME_LENGTH} Zeichen")
    if args.dry_run:
        print("[DRY RUN — keine API-Abfragen]")
    if args.force:
        print("[FORCE — Cache wird ignoriert]")

    run_reconciliation(entity_types, dry_run=args.dry_run, force=args.force)


if __name__ == "__main__":
    main()
