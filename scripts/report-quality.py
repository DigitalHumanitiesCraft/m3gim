#!/usr/bin/env python3
"""M³GIM Quality-Snapshot — Report für das Erschließungsteam.

Liest m3gim.jsonld + wikidata-reconciliation.json + die XLSX-Rohdaten und
schreibt einen kompakten Markdown-Report mit:

  - Verknuepfungsrate (Records mit mind. einer Verknuepfung)
  - Bearbeitungsstand-Verteilung
  - Wikidata-Coverage pro Index + Liste der low-confidence Matches
    fuer manuelle Freigabe
  - Provenance-Coverage (xlsxSource, agrelon:metadataProvenance)
  - Externe Blocker (PL_07, NIM_11, Header-Shifts)

Verwendung:
    python scripts/report-quality.py

Ausgabe: data/reports/quality-snapshot.md
"""

import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

import pandas as pd

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

BASE = Path(__file__).parent.parent
JSONLD = BASE / "data" / "output" / "m3gim.jsonld"
RECON = BASE / "data" / "output" / "wikidata-reconciliation.json"
SHEETS = BASE / "data" / "google-spreadsheet"
OUTPUT = BASE / "data" / "reports" / "quality-snapshot.md"


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
    """Zaehlt "effektive" Property-Eintraege eines Records."""
    count = 0
    for key in (
        "m3gim:hasAssociatedAgent", "rico:hasOrHadLocation",
        "rico:hasOrHadSubject", "m3gim:hasDetail",
        "m3gim:hasSpatiotemporalEvent", "m3gim:agentRelation",
    ):
        count += len(ensure_list(rec.get(key)))
    return count


def main():
    print("Lese m3gim.jsonld ...")
    data = load_jsonld()
    graph = data.get("@graph", [])
    records = [n for n in graph if n.get("@type") == "rico:Record"]
    records_real = [r for r in records if not r.get("@id", "").endswith("_Folio")]

    print(f"  {len(records_real)} echte Records (ohne Folio-Platzhalter)")

    # --- Verknuepfungsrate
    with_links = [r for r in records_real if count_links_on_record(r) > 0]
    link_rate = len(with_links) / len(records_real) if records_real else 0.0

    # Breakdown pro Konvolut
    konvolut_stats = {}
    for r in records_real:
        sig = r.get("rico:identifier", "")
        # Konvolut = archivsignatur ohne folio-Suffix
        parts = sig.rsplit(" ", 1)
        konvolut = parts[0] if len(parts) == 2 else sig
        ks = konvolut_stats.setdefault(konvolut, {"total": 0, "linked": 0})
        ks["total"] += 1
        if count_links_on_record(r) > 0:
            ks["linked"] += 1

    # --- Bearbeitungsstand
    bs_counter = Counter()
    for r in records_real:
        bs_counter[r.get("m3gim:bearbeitungsstand", "(leer)")] += 1

    # --- Wikidata-Coverage
    recon = load_recon() or {}
    matched = recon.get("matched", [])
    unmatched = recon.get("unmatched", [])
    skipped = recon.get("skipped", [])

    # Pro Index-Typ
    by_type = {}
    for m in matched:
        t = m.get("type", "?")
        by_type.setdefault(t, {"high": 0, "low": 0, "exact": 0}).setdefault(m.get("match", "?"), 0)
        by_type[t][m.get("match", "?")] = by_type[t].get(m.get("match", "?"), 0) + 1

    # Low-Confidence Manual-Review-Liste — nur ungeprueft (weder approved noch rejected)
    low_conf = [m for m in matched
                if m.get("match") == "fuzzy_low"
                and m.get("manual_review") not in ("approved", "rejected")]

    # --- Provenance-Coverage
    prov_total = len(records_real)
    prov_with_xlsx = sum(1 for r in records_real if isinstance(r.get("m3gim:xlsxSource"), dict))
    prov_with_agrelon = sum(1 for r in records_real
                            if r.get("agrelon:metadataProvenance") is not None)

    nested_total = 0
    nested_with_xlsx = 0
    for r in records_real:
        for d in ensure_list(r.get("m3gim:hasDetail")):
            if isinstance(d, dict) and d.get("@type") == "m3gim:DetailAnnotation":
                nested_total += 1
                if isinstance(d.get("m3gim:xlsxSource"), dict):
                    nested_with_xlsx += 1
        for rel in ensure_list(r.get("m3gim:agentRelation")):
            if isinstance(rel, dict):
                nested_total += 1
                if isinstance(rel.get("m3gim:xlsxSource"), dict):
                    nested_with_xlsx += 1

    # --- Markdown schreiben
    lines = []
    lines.append(f"# M³GIM Quality-Snapshot")
    lines.append("")
    lines.append(f"_Generiert: {datetime.now().isoformat(timespec='minutes')}_")
    lines.append("")
    lines.append(f"Grundlage: `{JSONLD.relative_to(BASE)}` + `{RECON.relative_to(BASE)}`.")
    lines.append("")

    lines.append("## Verknüpfungsrate")
    lines.append("")
    lines.append(f"- **{len(with_links)}/{len(records_real)}** Records mit "
                 f"mindestens einer Verknüpfung = **{link_rate:.0%}**")
    lines.append("")
    # Konvolute mit mehr als einem Folio sind die eigentlich interessanten.
    # Einzelobjekte (records == 1) werden aggregiert, damit der Report
    # lesbar bleibt.
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
    lines.append(f"### Einzelobjekte (aggregiert)")
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
    agrelon_pct = prov_with_agrelon / prov_total if prov_total else 0
    nested_pct = nested_with_xlsx / nested_total if nested_total else 0
    lines.append(f"- Records mit `m3gim:xlsxSource`: **{prov_with_xlsx}/{prov_total}** "
                 f"({xlsx_pct:.0%})")
    lines.append(f"- Records mit `agrelon:metadataProvenance`: **{prov_with_agrelon}/{prov_total}** "
                 f"({agrelon_pct:.0%}) — nur Records mit Datierungsevidenz")
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
    print(f"Gespeichert: {OUTPUT.relative_to(BASE)} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
