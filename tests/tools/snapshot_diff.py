#!/usr/bin/env python3
"""Snapshot-Diff für M3GIM JSON-LD Outputs.

Druckt strukturierten Report zwischen zwei m3gim.jsonld-Versionen.
Failed nie — reines Review-Werkzeug für Datenupdates.

Verwendung:
    python tests/tools/snapshot_diff.py old.jsonld new.jsonld
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

# Windows-Konsolen (cp1252) können den U+2192-Pfeil nicht rendern.
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass


def load_graph(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("@graph", [])


def classify(graph):
    records = [n for n in graph if n.get("@type") == "rico:Record"]
    konvolute = [n for n in graph if n.get("@type") == "rico:RecordSet"
                 and n.get("rico:hasRecordSetType", {}).get("@id") != "rico:Fonds"]
    return records, konvolute


def ensure_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def collect_entities(records):
    persons, orgs, locs, works = set(), set(), set(), set()
    total_rels = 0
    wd_matches = set()
    for r in records:
        for prop in ("m3gim:hasAssociatedAgent", "rico:hasOrHadLocation", "rico:hasOrHadSubject"):
            for ent in ensure_list(r.get(prop)):
                if not isinstance(ent, dict):
                    continue
                total_rels += 1
                name = ent.get("name", "")
                t = ent.get("@type", "")
                aid = ent.get("@id", "")
                if aid.startswith("wd:Q"):
                    wd_matches.add(aid)
                if t == "rico:Person":
                    persons.add(name)
                elif t in ("rico:CorporateBody", "rico:Group"):
                    orgs.add(name)
                elif t == "rico:Place":
                    locs.add(name)
                elif t == "m3gim:MusicalWork":
                    works.add(name)
    return {
        "records": len(records),
        "persons": len(persons),
        "organizations": len(orgs),
        "locations": len(locs),
        "works": len(works),
        "relations": total_rels,
        "wd_matches": len(wd_matches),
    }


def fmt_delta(old, new):
    diff = new - old
    sign = "+" if diff >= 0 else ""
    return f"{old:>6} → {new:>6}  ({sign}{diff})"


def main():
    ap = argparse.ArgumentParser(description="M3GIM JSON-LD Snapshot-Diff")
    ap.add_argument("old", type=Path, help="Alte m3gim.jsonld")
    ap.add_argument("new", type=Path, help="Neue m3gim.jsonld")
    ap.add_argument("--verbose", "-v", action="store_true", help="Zeige alle geänderten IDs")
    args = ap.parse_args()

    if not args.old.exists():
        print(f"FEHLER: {args.old} nicht gefunden", file=sys.stderr)
        return 2
    if not args.new.exists():
        print(f"FEHLER: {args.new} nicht gefunden", file=sys.stderr)
        return 2

    old_graph = load_graph(args.old)
    new_graph = load_graph(args.new)

    old_records, old_konv = classify(old_graph)
    new_records, new_konv = classify(new_graph)

    old_stats = collect_entities(old_records)
    old_stats["konvolute"] = len(old_konv)
    new_stats = collect_entities(new_records)
    new_stats["konvolute"] = len(new_konv)

    print("=" * 60)
    print(f"M3GIM Snapshot-Diff")
    print(f"  Alt: {args.old}")
    print(f"  Neu: {args.new}")
    print("=" * 60)
    print()
    print("=== Structural Diff ===")
    labels = [
        ("Records",       "records"),
        ("Konvolute",     "konvolute"),
        ("Persons",       "persons"),
        ("Organizations", "organizations"),
        ("Locations",     "locations"),
        ("Works",         "works"),
        ("Verknüpfungen", "relations"),
        ("WD-Matches",    "wd_matches"),
    ]
    for label, key in labels:
        print(f"  {label:18s} {fmt_delta(old_stats[key], new_stats[key])}")

    # ID-Diff
    old_ids = {r["@id"]: r for r in old_records}
    new_ids = {r["@id"]: r for r in new_records}

    added = sorted(set(new_ids) - set(old_ids))
    removed = sorted(set(old_ids) - set(new_ids))
    common = set(old_ids) & set(new_ids)

    print()
    print(f"=== Neue Records: {len(added)} ===")
    for aid in added[:20]:
        title = new_ids[aid].get("rico:title", "")[:60]
        print(f"  + {aid}  {title}")
    if len(added) > 20:
        print(f"  ... ({len(added) - 20} weitere)")

    print()
    print(f"=== Entfernte Records: {len(removed)} ===")
    for aid in removed[:20]:
        title = old_ids[aid].get("rico:title", "")[:60]
        print(f"  - {aid}  {title}")
    if len(removed) > 20:
        print(f"  ... ({len(removed) - 20} weitere)")

    # Inhaltlicher Diff in gemeinsamen Records
    changed_titles = []
    changed_dates = []
    for aid in common:
        old_r = old_ids[aid]
        new_r = new_ids[aid]
        if old_r.get("rico:title") != new_r.get("rico:title"):
            changed_titles.append(aid)
        if old_r.get("rico:date") != new_r.get("rico:date"):
            changed_dates.append(aid)

    print()
    print(f"=== Geänderte Titel: {len(changed_titles)} ===")
    for aid in changed_titles[:10]:
        print(f"  ~ {aid}")
        print(f"    alt: {old_ids[aid].get('rico:title', '')[:70]}")
        print(f"    neu: {new_ids[aid].get('rico:title', '')[:70]}")
    if len(changed_titles) > 10 and not args.verbose:
        print(f"  ... ({len(changed_titles) - 10} weitere — -v für alle)")

    print()
    print(f"=== Geänderte Datümer: {len(changed_dates)} ===")
    for aid in changed_dates[:10]:
        print(f"  ~ {aid}: {old_ids[aid].get('rico:date')} → {new_ids[aid].get('rico:date')}")

    print()
    print("=" * 60)
    print("Diff abgeschlossen.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
