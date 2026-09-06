#!/usr/bin/env python3
"""M³GIM Quality-Snapshot — report for the Erschließungsteam.

Reads m3gim.jsonld + wikidata-reconciliation.json and writes a compact
Markdown report with:

  - Verknüpfung rate (records carrying at least one Verknüpfung)
  - Bearbeitungsstand distribution
  - Wikidata coverage per index plus the list of low-confidence matches
    for manual approval
  - Provenance coverage (xlsxSource, agrelon:metadataProvenance)
  - External blockers (PL_07, NIM_11, header shifts)

Usage:
    python scripts/report-quality.py

Output: data/reports/quality-snapshot.md
"""

import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent))
from _common import OUTPUT_DIR, REPO_ROOT, REPORTS_DIR, rel_to_repo  # noqa: E402

BASE = REPO_ROOT
JSONLD = OUTPUT_DIR / "m3gim.jsonld"
RECON = OUTPUT_DIR / "wikidata-reconciliation.json"
OUTPUT = REPORTS_DIR / "quality-snapshot.md"


def load_jsonld():
    with open(JSONLD, encoding="utf-8") as f:
        return json.load(f)


def load_recon():
    if not RECON.exists():
        return None
    with open(RECON, encoding="utf-8") as f:
        return json.load(f)


def ensure_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def count_links_on_record(rec):
    """Counts the effective property entries of a record."""
    count = 0
    for key in (
        "m3gim-ontology:hasAssociatedAgent", "rico:hasOrHadLocation",
        "rico:hasOrHadSubject", "m3gim-ontology:hasDetail",
        "m3gim-ontology:hasAnnotation", "m3gim-ontology:hasAgentRelation",
        "m3gim-ontology:hasPerformance",
    ):
        count += len(ensure_list(rec.get(key)))
    return count


def main():
    print("Lese m3gim.jsonld ...")
    data = load_jsonld()
    graph = data.get("@graph", [])
    records = [n for n in graph if n.get("@type") == "rico:Record"]
    # The object table repeats its header inside a Konvolut block, so the folio
    # column carries the literal "Folio" and the pipeline builds a record from
    # it. Those placeholders are no archival unit and stay out of every figure;
    # the snapshot names the exclusion so its count and the count in
    # docs/data/m3gim.jsonld can be reconciled.
    placeholders = [r for r in records if r.get("@id", "").endswith("_Folio")]
    # A folio record the pipeline derives (B2) carries no cataloguing of its
    # own; counting it would lower every coverage figure without a change in
    # the source.
    derived = [r for r in records
               if r.get("m3gim-ontology:derivedFolioRecord") is True]
    excluded = {r.get("@id") for r in placeholders + derived}
    records_real = [r for r in records if r.get("@id") not in excluded]

    print(f"  {len(records_real)} echte Records "
          f"(ohne {len(placeholders)} Folio-Platzhalter und "
          f"{len(derived)} abgeleitete Foliodatensaetze, {len(records)} im Graph)")

    with_links = [r for r in records_real if count_links_on_record(r) > 0]
    link_rate = len(with_links) / len(records_real) if records_real else 0.0

    # Breakdown per Konvolut
    konvolut_stats = {}
    for r in records_real:
        sig = r.get("rico:identifier", "")
        # Konvolut = archivsignatur without folio suffix
        parts = sig.rsplit(" ", 1)
        konvolut = parts[0] if len(parts) == 2 else sig
        ks = konvolut_stats.setdefault(konvolut, {"total": 0, "linked": 0})
        ks["total"] += 1
        if count_links_on_record(r) > 0:
            ks["linked"] += 1

    bs_counter = Counter()
    for r in records_real:
        bs_counter[r.get("m3gim-ontology:processingStatus", "(leer)")] += 1

    recon = load_recon() or {}
    matched = recon.get("matched", [])
    unmatched = recon.get("unmatched", [])
    skipped = recon.get("skipped", [])

    # Per index type
    by_type = {}
    for m in matched:
        t = m.get("type", "?")
        by_type.setdefault(t, {"high": 0, "low": 0, "exact": 0}).setdefault(m.get("match", "?"), 0)
        by_type[t][m.get("match", "?")] = by_type[t].get(m.get("match", "?"), 0) + 1

    # Low-confidence manual-review list, only unchecked (neither approved nor rejected)
    low_conf = [m for m in matched
                if m.get("match") == "fuzzy_low"
                and m.get("manual_review") not in ("approved", "rejected")]

    prov_total = len(records_real)
    prov_with_xlsx = sum(1 for r in records_real if isinstance(r.get("m3gim-ontology:xlsxSource"), dict))
    # E-103: agrelon:metadataProvenance migrated off the record onto its
    # nested/related entities (Annotation, AgRelOn), each backref-ing the
    # record. Probe the record-owned provenance-bearing entities instead of the
    # now always-absent record-level property.
    prov_bearing_keys = ("m3gim-ontology:hasAnnotation",
                         "m3gim-ontology:hasAgentRelation")
    prov_with_events = sum(
        1 for r in records_real
        if any(ensure_list(r.get(k)) for k in prov_bearing_keys)
    )

    nested_total = 0
    nested_with_xlsx = 0
    for r in records_real:
        for d in ensure_list(r.get("m3gim-ontology:hasDetail")):
            if isinstance(d, dict) and d.get("@type") == "m3gim-ontology:Annotation":
                nested_total += 1
                if isinstance(d.get("m3gim-ontology:xlsxSource"), dict):
                    nested_with_xlsx += 1
        for rel in ensure_list(r.get("m3gim-ontology:hasAgentRelation")):
            if isinstance(rel, dict):
                nested_total += 1
                if isinstance(rel.get("m3gim-ontology:xlsxSource"), dict):
                    nested_with_xlsx += 1

    lines = []
    lines.append("# M³GIM Quality-Snapshot")
    lines.append("")
    # Local time with its UTC offset, so a later file timestamp (a checkout
    # touches the file without regenerating it) is distinguishable from the run.
    run_time = datetime.now().astimezone().isoformat(timespec="minutes")
    lines.append(f"_Laufzeit des Reports: {run_time}_")
    lines.append("")
    lines.append(f"Grundlage: `{rel_to_repo(JSONLD)}` + `{rel_to_repo(RECON)}`.")
    lines.append("")

    lines.append("## Gezählte Menge")
    lines.append("")
    lines.append(f"Alle Zahlen dieses Reports beziehen sich auf **{len(records_real)} "
                 "Records**. Der Graph führt "
                 f"**{len(records)}** Knoten vom Typ `rico:Record`; die Differenz "
                 f"von {len(placeholders) + len(derived)} sind "
                 f"{len(placeholders)} Folio-Platzhalter, entstanden aus "
                 "innerhalb eines Konvoluts wiederholten Kopfzeilen der "
                 "Objekttabelle, deren Folio-Zelle den Text „Folio“ "
                 f"trägt, und {len(derived)} Foliodatensätze, die die Pipeline "
                 "über den Seiten eines Blattes bildet. Weder die einen noch "
                 "die anderen tragen eine eigene Erschließung und zählen "
                 "deshalb nicht mit.")
    lines.append("")
    if placeholders:
        lines.append("| Platzhalter | Quellzeile |")
        lines.append("|---|---:|")
        for r in sorted(placeholders, key=lambda x: x.get("rico:identifier", "")):
            src = r.get("m3gim-ontology:xlsxSource") or {}
            sheet = src.get("m3gim-ontology:xlsxSheet", "?")
            row = src.get("m3gim-ontology:xlsxRow", "?")
            lines.append(f"| {r.get('rico:identifier', '?')} | {sheet} {row} |")
        lines.append("")

    lines.append("## Verknüpfungsrate")
    lines.append("")
    lines.append(f"- **{len(with_links)}/{len(records_real)}** Records mit "
                 f"mindestens einer Verknüpfung = **{link_rate:.0%}**")
    lines.append("")
    # Konvolute with more than one Folio are the interesting ones. Single
    # objects (records == 1) are aggregated to keep the report readable.
    multi = {k: v for k, v in konvolut_stats.items() if v["total"] > 1}
    single = {k: v for k, v in konvolut_stats.items() if v["total"] == 1}
    single_total = sum(v["total"] for v in single.values())
    single_linked = sum(v["linked"] for v in single.values())

    lines.append("### Konvolute mit mehreren Folios")
    lines.append("")
    lines.append("| Konvolut | Records | verlinkt | Rate |")
    lines.append("|---|---:|---:|---:|")
    for konvolut in sorted(multi.keys()):
        ks = multi[konvolut]
        rate = ks["linked"] / ks["total"] if ks["total"] else 0
        lines.append(f"| {konvolut} | {ks['total']} | {ks['linked']} | {rate:.0%} |")
    lines.append("")
    lines.append("### Einzelobjekte (aggregiert)")
    lines.append("")
    single_rate = single_linked / single_total if single_total else 0
    lines.append(f"- **{single_linked}/{single_total}** Einzelobjekte verlinkt "
                 f"({single_rate:.0%}), verteilt auf {len(single)} Signaturen "
                 f"(Plakate, Tonträger, Einzelstücke).")
    lines.append("")

    lines.append("## Bearbeitungsstand")
    lines.append("")
    lines.append("| Status | Records |")
    lines.append("|---|---:|")
    for stand, count in bs_counter.most_common():
        lines.append(f"| {stand} | {count} |")
    lines.append("")

    lines.append("## Wikidata-Coverage")
    lines.append("")
    lines.append(f"- {len(matched)} gematcht, {len(unmatched)} kein Match, "
                 f"{len(skipped)} übersprungen (bereits mit Q-ID oder zu kurz)")
    lines.append("")
    lines.append("### Nach Typ + Konfidenz")
    lines.append("")
    lines.append("| Typ | exact | fuzzy_high | fuzzy_low | gesamt |")
    lines.append("|---|---:|---:|---:|---:|")
    for t in ("person", "org", "location", "work"):
        stats = by_type.get(t, {})
        ex = stats.get("exact", 0)
        fh = stats.get("fuzzy_high", 0)
        fl = stats.get("fuzzy_low", 0)
        lines.append(f"| {t} | {ex} | {fh} | {fl} | {ex + fh + fl} |")
    lines.append("")

    lines.append("### Low-Confidence-Matches (manuelle Freigabe erforderlich)")
    lines.append("")
    lines.append(f"**{len(low_conf)} Matches mit Score 80–89** — prüfen, ob sie "
                 f"tatsächlich das korrekte Wikidata-Objekt treffen. Freigegebene "
                 f"Einträge manuell als `manual_review: approved` markieren.")
    lines.append("")
    if low_conf:
        lines.append("| Typ | Name | → | Q-ID | Label | Score |")
        lines.append("|---|---|---|---|---|---:|")
        for m in sorted(low_conf, key=lambda x: (x.get("type", ""), x.get("name", "").lower())):
            lines.append(f"| {m.get('type', '?')} | {m.get('name', '?')} | → | "
                         f"[{m.get('qid', '?')}](https://www.wikidata.org/wiki/{m.get('qid', '')}) | "
                         f"{m.get('label', '?')} | {m.get('confidence', '?')} |")
    else:
        lines.append("_Keine Low-Confidence-Matches in diesem Lauf._")
    lines.append("")

    lines.append("## Provenance-Coverage")
    lines.append("")
    xlsx_pct = prov_with_xlsx / prov_total if prov_total else 0
    events_pct = prov_with_events / prov_total if prov_total else 0
    nested_pct = nested_with_xlsx / nested_total if nested_total else 0
    lines.append(f"- Records mit `m3gim-ontology:xlsxSource`: **{prov_with_xlsx}/{prov_total}** "
                 f"({xlsx_pct:.0%})")
    lines.append(f"- Records mit provenienz-belegten Ereignissen "
                 f"(`agrelon:metadataProvenance` auf Annotation/AgRelOn): "
                 f"**{prov_with_events}/{prov_total}** ({events_pct:.0%})")
    lines.append(f"- Nested Entities (Details + AgRelOn) mit `xlsxSource`: "
                 f"**{nested_with_xlsx}/{nested_total}** ({nested_pct:.0%})")
    lines.append("")

    lines.append("## Externe Blocker (zur Klärung mit Erschließungsteam)")
    lines.append("")
    lines.append("1. **`UAKUG/NIM/PL_07` Duplikat** im Google Sheet bereinigen "
                 "— aktuell xfail in `test_05_referential.py`.")
    lines.append("2. **Verwaiste Signatur `UAKUG/NIM_11`**: tritt in Verknüpfungen "
                 "auf, existiert aber nicht in `M3GIM-Objekte.xlsx`. "
                 "Mögliche Interpretation: Tippfehler (`NIM_110` / `NIM_111`?) oder "
                 "fehlende Objektzeile nachpflegen.")
    lines.append("3. **Header-Shifts** in drei Indizes (Organisationen, Orte, Werke): "
                 "Erste Datenzeile wird als Header gelesen. Pipeline kompensiert "
                 "via `HEADER_SHIFTS`-Mapping in `scripts/transform.py` — sollte "
                 "im Google Sheet gefixt werden, damit die Normalform sauber ist.")
    lines.append("")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    size_kb = OUTPUT.stat().st_size / 1024
    print(f"Gespeichert: {rel_to_repo(OUTPUT)} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
