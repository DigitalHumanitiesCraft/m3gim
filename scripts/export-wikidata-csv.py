#!/usr/bin/env python3
"""
M³GIM Wikidata-CSV-Export — Erzeugt Lookup-CSVs für Google Sheets.

Liest data/output/wikidata-reconciliation.json und erzeugt 5 CSVs
in data/output/wikidata-csvs/ für den Import per VLOOKUP.

Verwendung:
    python scripts/export-wikidata-csv.py
"""

import csv
import json
import sys
from pathlib import Path

# Windows-Konsole: UTF-8 erzwingen
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "data" / "output" / "wikidata-reconciliation.json"
OUTPUT_DIR = BASE_DIR / "data" / "output" / "wikidata-csvs"

# Typ → CSV-Dateiname
TYPE_MAP = {
    "person": "person-matches.csv",
    "org": "org-matches.csv",
    "location": "location-matches.csv",
    "work": "work-matches.csv",
}


def main():
    print("=" * 60)
    print("M³GIM Wikidata-CSV-Export")
    print("=" * 60)

    if not INPUT_FILE.exists():
        print(f"FEHLER: {INPUT_FILE} nicht gefunden.")
        print("Bitte zuerst reconcile.py ausfuehren.")
        return 1

    with open(INPUT_FILE, encoding="utf-8") as f:
        data = json.load(f)

    matched = data.get("matched", [])
    unmatched = data.get("unmatched", [])

    print(f"Geladen: {len(matched)} Matches, {len(unmatched)} Unmatched")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Matched nach Typ gruppieren und als CSV schreiben
    by_type = {}
    for m in matched:
        t = m["type"]
        by_type.setdefault(t, []).append(m)

    total_written = 0
    for typ, filename in TYPE_MAP.items():
        entries = by_type.get(typ, [])
        if not entries:
            continue

        path = OUTPUT_DIR / filename
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["name", "qid", "wikidata_label", "match_type"])
            for entry in sorted(entries, key=lambda e: e["name"]):
                writer.writerow([
                    entry["name"],
                    entry["qid"],
                    entry.get("label", ""),
                    entry.get("match", ""),
                ])
        total_written += len(entries)
        print(f"  {filename}: {len(entries)} Eintraege")

    # Unmatched als CSV
    unmatched_path = OUTPUT_DIR / "unmatched.csv"
    with open(unmatched_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["name", "type"])
        for entry in sorted(unmatched, key=lambda e: (e["type"], e["name"])):
            writer.writerow([entry["name"], entry["type"]])
    print(f"  unmatched.csv: {len(unmatched)} Eintraege")

    print()
    print(f"Gesamt: {total_written} Matches + {len(unmatched)} Unmatched")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    exit(main())
