#!/usr/bin/env python3
"""M3GIM Coverage-Scout — beziffert die Datendeckung eines Orts-Fokus.

Grundsatz: erst scouten, dann implementieren. Bevor eine Frontend-Ansicht auf
einen Orts-Fokus (z. B. Bayreuth) gebaut wird, misst dieses Skript read-only,
welche Daten den Fokus tatsaechlich tragen. Es spiegelt die Mappings des
JS-Loaders (docs/js/data/loader.js), damit die Zahlen dem entsprechen, was das
Frontend im Store sieht:

- Orte aus rico:hasOrHadLocation an den Records, Stadt-konsolidiert via cityOf
  (utils/format.js), Datums-Strings als Ort herausgefiltert.
- Mobilitaet aus den Top-Level m3gim:SpatiotemporalEvents
  (m3gim:atPlace / m3gim:atDate / m3gim:eventRole / geo-Koordinaten).
- Netzwerk, Rollen, Werke aus den Fokus-Records. Personen werden strukturell
  getrennt in Akteure (m3gim:hasAssociatedAgent) und erwaehnte Subjekte
  (rico:hasOrHadSubject @type rico:Person), weil nur Erstere belegte
  Mitwirkende sind und Letztere oft Komponisten oder Genannte.

Schreibt nichts; reiner Konsolenreport. Die Kopplung "Person/Rolle steht im
selben Record wie der Ort" ist nicht identisch mit "nachweislich an dem Ort":
die raumzeitlich exakte Verortung liegt auf den SpatiotemporalEvents, die
Record-Achsen buendeln den weiteren Dokumentkontext.

Verwendung:
    python scripts/scout-coverage.py                  # Default-Fokus: Bayreuth
    python scripts/scout-coverage.py "Wien"           # anderer Ort (Stadt-Ebene)
    python scripts/scout-coverage.py --data PATH      # andere JSON-LD-Quelle
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

# Windows-Konsole: UTF-8 erzwingen (analog explore.py)
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATA = ROOT / "docs" / "data" / "m3gim.jsonld"
DEFAULT_FOCUS = "Bayreuth"


def ensure_list(value):
    """Wert immer als Liste, analog utils/format.js ensureArray."""
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def node_type(node):
    t = node.get("@type")
    return ",".join(t) if isinstance(t, list) else t


def city_of(name):
    """Stadt-Ebene wie utils/format.js cityOf: Teil vor dem ersten Komma."""
    if not name:
        return name
    s = str(name)
    i = s.find(",")
    return (s if i == -1 else s[:i]).strip()


def is_date_like(name):
    """Loader skippt Orte, deren Name mit vier Ziffern beginnt (\\d{4}...)."""
    return len(str(name)) >= 4 and str(name)[:4].isdigit()


def load_graph(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return data.get("@graph", []), data


def build_mobility_events(graph):
    """Spiegelt loader.js indexMobilityEvent (Top-Level SpatiotemporalEvents)."""
    events = {}
    for node in graph:
        if node_type(node) != "m3gim:SpatiotemporalEvent":
            continue
        place = node.get("m3gim:atPlace") or {}
        qid = place.get("@id")
        events[node["@id"]] = {
            "place": place.get("name") or place.get("skos:prefLabel"),
            "wikidata": qid if str(qid or "").startswith("wd:") else None,
            "lat": place.get("geo:lat"),
            "lon": place.get("geo:long"),
            "date": node.get("m3gim:atDate"),
            "role": node.get("m3gim:eventRole"),
            "record": (node.get("agrelon:metadataProvenance") or {}).get("@id"),
        }
    return events


def build_locations(graph):
    """Spiegelt loader.js indexLocations (rico:hasOrHadLocation an Records)."""
    locations = {}
    for node in graph:
        if node_type(node) != "rico:Record":
            continue
        for loc in ensure_list(node.get("rico:hasOrHadLocation")):
            name = loc.get("name") or loc.get("skos:prefLabel")
            if not name or is_date_like(name):
                continue
            entry = locations.setdefault(
                name, {"records": set(), "roles": set(), "wikidata": loc.get("@id")}
            )
            entry["records"].add(node["@id"])
            if loc.get("role"):
                entry["roles"].add(loc["role"])
    return locations


def collect_focus_records(records, focus):
    """Record-IDs mit einem Ort, dessen Stadt-Ebene dem Fokus entspricht."""
    focus_lower = focus.lower()
    ids = set()
    for rid, rec in records.items():
        for loc in ensure_list(rec.get("rico:hasOrHadLocation")):
            name = loc.get("name") or loc.get("skos:prefLabel")
            if name and not is_date_like(name) and city_of(name).lower() == focus_lower:
                ids.add(rid)
                break
    return ids


def measure_axes(focus_ids, records, performances, stage_roles):
    """Netzwerk-, Rollen-, Werk- und Beziehungsachsen ueber die Fokus-Records."""
    actors, subjects, orgs = Counter(), Counter(), Counter()
    works, roles, relations = Counter(), Counter(), Counter()
    for rid in focus_ids:
        rec = records[rid]
        for agent in ensure_list(rec.get("m3gim:hasAssociatedAgent")):
            name = agent.get("name") or agent.get("skos:prefLabel")
            if not name:
                continue
            if agent.get("@type") in ("rico:CorporateBody", "rico:Group"):
                orgs[name] += 1
            else:
                actors[name] += 1
        for subj in ensure_list(rec.get("rico:hasOrHadSubject")):
            name = subj.get("name") or subj.get("skos:prefLabel")
            if not name:
                continue
            if subj.get("@type") == "rico:Person":
                subjects[name] += 1
            elif subj.get("@type") == "m3gim:MusicalWork":
                works[name] += 1
        for perf_ref in ensure_list(rec.get("m3gim:hasPerformance")):
            perf = performances.get(perf_ref.get("@id"))
            if not perf:
                continue
            srid = (perf.get("m3gim:hasStageRole") or {}).get("@id")
            if srid:
                roles[stage_roles.get(srid, srid)] += 1
        for rel in ensure_list(rec.get("m3gim:agentRelation")):
            relations[rel.get("@type", "?")] += 1
    return {
        "actors": actors, "subjects": subjects, "orgs": orgs,
        "works": works, "roles": roles, "relations": relations,
    }


def fmt_counter(counter, top=None):
    items = counter.most_common(top)
    return "\n".join(f"   {c:3d}  {name}" for name, c in items) or "   (keine)"


def main():
    args = sys.argv[1:]
    data_path = DEFAULT_DATA
    if "--data" in args:
        i = args.index("--data")
        data_path = Path(args[i + 1])
        del args[i:i + 2]
    focus = args[0] if args else DEFAULT_FOCUS

    graph, meta = load_graph(data_path)
    records = {n["@id"]: n for n in graph if node_type(n) == "rico:Record"}
    performances = {n["@id"]: n for n in graph if node_type(n) == "m3gim:Performance"}
    stage_roles = {
        n["@id"]: (n.get("rico:name") or n["@id"])
        for n in graph if node_type(n) == "m3gim:StageRole"
    }
    events = build_mobility_events(graph)
    locations = build_locations(graph)

    focus_lower = focus.lower()
    focus_ids = collect_focus_records(records, focus)
    focus_events = {
        eid: ev for eid, ev in events.items()
        if ev["place"] and city_of(ev["place"]).lower() == focus_lower
    }
    focus_locs = {n: v for n, v in locations.items() if city_of(n).lower() == focus_lower}
    axes = measure_axes(focus_ids, records, performances, stage_roles)

    print(f"# M3GIM Coverage-Scout — Fokus '{focus}'")
    print(f"# Quelle: {data_path}")
    print(f"# Graph: {len(graph)} Top-Level-Knoten, {len(records)} Records, "
          f"{len(events)} SpatiotemporalEvents, {len(locations)} Orte\n")

    print(f"## Ort '{focus}' im Ortsindex ({len(focus_locs)} Namensvariante(n))")
    for name, v in sorted(focus_locs.items()):
        print(f"   '{name}' | records={len(v['records'])} | "
              f"rollen={sorted(v['roles'])} | wikidata={v['wikidata']}")
    print(f"   -> Records mit {focus}-Ort (Stadt-konsolidiert): {len(focus_ids)}\n")

    print(f"## Mobilitaet: {len(focus_events)} SpatiotemporalEvent(s) mit Ort '{focus}'")
    geo = sum(1 for ev in focus_events.values() if ev["lat"] is not None)
    dated = sum(1 for ev in focus_events.values() if ev["date"])
    print(f"   verortet (Koordinaten): {geo}/{len(focus_events)} | "
          f"datiert: {dated}/{len(focus_events)}")
    for eid, ev in focus_events.items():
        print(f"   {eid} | date={ev['date']} | role={ev['role']} | "
              f"geo=({ev['lat']},{ev['lon']}) | wd={ev['wikidata']}")
    print()

    print(f"## Netzwerk-Achse (ueber {len(focus_ids)} Fokus-Records)")
    print(f"   Akteure (hasAssociatedAgent), {len(axes['actors'])} distinct:")
    print(fmt_counter(axes["actors"]))
    print(f"   Erwaehnte Subjekt-Personen (hasOrHadSubject), {len(axes['subjects'])} distinct:")
    print(fmt_counter(axes["subjects"]))
    print(f"   Organisationen, {len(axes['orgs'])} distinct:")
    print(fmt_counter(axes["orgs"]))
    print(f"   Explizite AgRelOn-Beziehungen, {sum(axes['relations'].values())} total:")
    print(fmt_counter(axes["relations"]))
    print()

    print(f"## Rollen-Achse: {len(axes['roles'])} Buehnenrollen ueber Performances")
    print(fmt_counter(axes["roles"]))
    print(f"\n## Werk-Achse: {len(axes['works'])} Werke")
    print(fmt_counter(axes["works"]))


if __name__ == "__main__":
    main()
