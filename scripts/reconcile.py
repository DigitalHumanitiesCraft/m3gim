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
  - Personen: zusaeztlich Filterung auf instance-of human (Q5)
  - Organisationen: Filterung auf organisation/institution
  - Orte: Filterung auf geographic entity
  - Werke: Suche mit "Komponist + Titel" fuer bessere Praezision
  - Alles was nicht 100% matcht → manuell (spaeter)

Verwendung:
    python scripts/reconcile.py [--dry-run] [--type person|org|location|work]
"""

import sys
import json
import time
import argparse
import urllib.request
import urllib.parse
import urllib.error
import pandas as pd
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


def reconcile_person(name: str) -> dict | None:
    """Reconciliation fuer Personen: Name → Q-ID wenn exakter Match + Q5."""
    # Personennamen: "Nachname, Vorname" → suche beides
    results = search_wikidata(name, language="de")
    if not results:
        # Versuche mit umgedrehtem Namen
        parts = name.split(",", 1)
        if len(parts) == 2:
            reversed_name = f"{parts[1].strip()} {parts[0].strip()}"
            results = search_wikidata(reversed_name, language="de")

    for r in results:
        label = r.get("label", "")
        qid = r.get("id", "")

        # Exakter Match auf Label oder aliases
        if is_exact_match(name, label):
            # Prüfe instance-of
            time.sleep(REQUEST_DELAY)
            claims = get_entity_claims(qid)
            instances = get_instance_of(claims)
            if Q_HUMAN in instances:
                return {"qid": qid, "label": label, "match": "exact_label"}

        # Auch umgedrehten Namen prüfen
        parts = name.split(",", 1)
        if len(parts) == 2:
            reversed_name = f"{parts[1].strip()} {parts[0].strip()}"
            if is_exact_match(reversed_name, label):
                time.sleep(REQUEST_DELAY)
                claims = get_entity_claims(qid)
                instances = get_instance_of(claims)
                if Q_HUMAN in instances:
                    return {"qid": qid, "label": label, "match": "exact_reversed"}

    return None


def reconcile_org(name: str) -> dict | None:
    """Reconciliation fuer Organisationen."""
    results = search_wikidata(name, language="de")

    for r in results:
        label = r.get("label", "")
        qid = r.get("id", "")

        if is_exact_match(name, label):
            time.sleep(REQUEST_DELAY)
            claims = get_entity_claims(qid)
            instances = get_instance_of(claims)
            if instances & Q_ORGANIZATION:
                return {"qid": qid, "label": label, "match": "exact_label"}

    return None


def reconcile_location(name: str) -> dict | None:
    """Reconciliation fuer Orte."""
    results = search_wikidata(name, language="de")

    for r in results:
        label = r.get("label", "")
        qid = r.get("id", "")

        if is_exact_match(name, label):
            time.sleep(REQUEST_DELAY)
            claims = get_entity_claims(qid)
            instances = get_instance_of(claims)
            if instances & Q_GEOGRAPHIC:
                return {"qid": qid, "label": label, "match": "exact_label"}

    return None


def reconcile_work(name: str, komponist: str = None) -> dict | None:
    """Reconciliation fuer Werke. Sucht mit Komponist fuer bessere Praezision."""
    query = f"{name} {komponist}" if komponist else name
    results = search_wikidata(query, language="de")

    for r in results:
        label = r.get("label", "")
        qid = r.get("id", "")

        if is_exact_match(name, label):
            time.sleep(REQUEST_DELAY)
            claims = get_entity_claims(qid)
            instances = get_instance_of(claims)
            if instances & Q_MUSICAL_WORK:
                return {"qid": qid, "label": label, "match": "exact_label"}

    return None


# ---------------------------------------------------------------------------
# Header-Shift-Korrekturen (identisch mit transform.py)
# ---------------------------------------------------------------------------

HEADER_SHIFTS = {
    "organisationsindex": ["m3gim_id", "name", "wikidata_id", "ort",
                           "assoziierte_person", "anmerkung"],
    "ortsindex": ["m3gim_id", "name", "wikidata_id"],
    "werkindex": ["m3gim_id", "name", "wikidata_id", "komponist",
                  "rolle_stimme", "anmerkung"]
}


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
            # Erste Datenzeile ist eigentlich Header-Zeile
            first_row = df.iloc[0].tolist()
            df.columns = expected + list(df.columns[len(expected):])
            # Erste Zeile als Daten wiederherstellen
            first_df = pd.DataFrame([first_row], columns=df.columns)
            df = pd.concat([first_df, df.iloc[1:]], ignore_index=True)

    return df


# ---------------------------------------------------------------------------
# Hauptprogramm
# ---------------------------------------------------------------------------

def run_reconciliation(entity_types: list, dry_run: bool = False):
    """Fuehrt die Reconciliation durch."""

    results = {
        "meta": {
            "date": __import__("datetime").datetime.now().isoformat(),
            "strategy": "exact_match_only",
            "note": "Nur 100%-Matches. Rest muss manuell geprueft werden."
        },
        "matched": [],
        "unmatched": [],
        "skipped": [],
    }

    # --- Personen ---
    if "person" in entity_types:
        print("\n=== Personenindex ===")
        df = load_index("M3GIM-Personenindex.xlsx")
        if not df.empty:
            name_col = "name" if "name" in df.columns else df.columns[1]
            wd_col = "wikidata_id" if "wikidata_id" in df.columns else None

            for _, row in df.iterrows():
                name = str(row.get(name_col, "")).strip()
                existing_wd = str(row.get(wd_col, "")).strip() if wd_col else ""

                if not name or name == "nan":
                    continue
                if existing_wd and existing_wd != "nan" and existing_wd != "":
                    results["skipped"].append({
                        "type": "person", "name": name,
                        "existing_qid": existing_wd
                    })
                    print(f"  [SKIP] {name} — bereits {existing_wd}")
                    continue

                print(f"  [SEARCH] {name}...", end=" ", flush=True)
                if not dry_run:
                    match = reconcile_person(name)
                    time.sleep(REQUEST_DELAY)
                    if match:
                        results["matched"].append({
                            "type": "person", "name": name, **match
                        })
                        print(f"→ {match['qid']} ({match['match']})")
                    else:
                        results["unmatched"].append({
                            "type": "person", "name": name
                        })
                        print("→ kein Match")
                else:
                    print("→ [DRY RUN]")

    # --- Organisationen ---
    if "org" in entity_types:
        print("\n=== Organisationsindex ===")
        df = load_index("M3GIM-Organisationsindex.xlsx",
                        shift_key="organisationsindex")
        if not df.empty:
            for _, row in df.iterrows():
                name = str(row.get("name", "")).strip()
                existing_wd = str(row.get("wikidata_id", "")).strip()

                if not name or name == "nan":
                    continue
                if existing_wd and existing_wd != "nan":
                    results["skipped"].append({
                        "type": "org", "name": name,
                        "existing_qid": existing_wd
                    })
                    print(f"  [SKIP] {name} — bereits {existing_wd}")
                    continue

                print(f"  [SEARCH] {name}...", end=" ", flush=True)
                if not dry_run:
                    match = reconcile_org(name)
                    time.sleep(REQUEST_DELAY)
                    if match:
                        results["matched"].append({
                            "type": "org", "name": name, **match
                        })
                        print(f"→ {match['qid']} ({match['match']})")
                    else:
                        results["unmatched"].append({
                            "type": "org", "name": name
                        })
                        print("→ kein Match")
                else:
                    print("→ [DRY RUN]")

    # --- Orte ---
    if "location" in entity_types:
        print("\n=== Ortsindex ===")
        df = load_index("M3GIM-Ortsindex.xlsx", shift_key="ortsindex")
        if not df.empty:
            for _, row in df.iterrows():
                name = str(row.get("name", "")).strip()
                existing_wd = str(row.get("wikidata_id", "")).strip()

                if not name or name == "nan":
                    continue
                if existing_wd and existing_wd != "nan":
                    results["skipped"].append({
                        "type": "location", "name": name,
                        "existing_qid": existing_wd
                    })
                    print(f"  [SKIP] {name} — bereits {existing_wd}")
                    continue

                print(f"  [SEARCH] {name}...", end=" ", flush=True)
                if not dry_run:
                    match = reconcile_location(name)
                    time.sleep(REQUEST_DELAY)
                    if match:
                        results["matched"].append({
                            "type": "location", "name": name, **match
                        })
                        print(f"→ {match['qid']} ({match['match']})")
                    else:
                        results["unmatched"].append({
                            "type": "location", "name": name
                        })
                        print("→ kein Match")
                else:
                    print("→ [DRY RUN]")

    # --- Werke ---
    if "work" in entity_types:
        print("\n=== Werkindex ===")
        df = load_index("M3GIM-Werkindex.xlsx", shift_key="werkindex")
        if not df.empty:
            for _, row in df.iterrows():
                name = str(row.get("name", "")).strip()
                komponist = str(row.get("komponist", "")).strip()
                existing_wd = str(row.get("wikidata_id", "")).strip()

                if not name or name == "nan":
                    continue
                if existing_wd and existing_wd != "nan":
                    results["skipped"].append({
                        "type": "work", "name": name,
                        "existing_qid": existing_wd
                    })
                    print(f"  [SKIP] {name} — bereits {existing_wd}")
                    continue

                komp = komponist if komponist != "nan" else None
                print(f"  [SEARCH] {name}"
                      f"{f' ({komp})' if komp else ''}...",
                      end=" ", flush=True)
                if not dry_run:
                    match = reconcile_work(name, komp)
                    time.sleep(REQUEST_DELAY)
                    if match:
                        results["matched"].append({
                            "type": "work", "name": name,
                            "komponist": komp, **match
                        })
                        print(f"→ {match['qid']} ({match['match']})")
                    else:
                        results["unmatched"].append({
                            "type": "work", "name": name,
                            "komponist": komp
                        })
                        print("→ kein Match")
                else:
                    print("→ [DRY RUN]")

    # --- Ergebnis speichern ---
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # --- Zusammenfassung ---
    print(f"\n{'='*60}")
    print(f"Ergebnis:")
    print(f"  Matches:   {len(results['matched'])}")
    print(f"  Kein Match: {len(results['unmatched'])}")
    print(f"  Uebersprungen: {len(results['skipped'])}")
    print(f"\nGespeichert: {OUTPUT_FILE}")

    if not dry_run and results["matched"]:
        print(f"\nNaechster Schritt:")
        print(f"  1. Ergebnisse in {OUTPUT_FILE} pruefen")
        print(f"  2. Gepruefe Q-IDs ins Google Sheet eintragen")
        print(f"  3. Pipeline neu ausfuehren: python scripts/transform.py")


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
    args = parser.parse_args()

    entity_types = [args.type] if args.type else [
        "person", "org", "location", "work"
    ]

    print("M³GIM Wikidata-Reconciliation")
    print(f"Strategie: Nur exakte Matches (100%)")
    if args.dry_run:
        print("[DRY RUN — keine API-Abfragen]")

    run_reconciliation(entity_types, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
