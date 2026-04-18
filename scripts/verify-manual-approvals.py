#!/usr/bin/env python3
"""Verifiziert alle ``match: "manual"``-Eintraege in der Reconciliation-JSON
gegen die Live-Labels auf Wikidata.

Hintergrund (Session 34): Zwei manuelle Q-ID-Approvals waren falsch —
Bayreuth Q2861 war Rostock, Stanislau Q200491 ein US-Videospiel-Publisher.
Solche stillen Datenfehler produzieren plausibel aussehende, aber faktisch
falsche Atlas-Marker und Country-Zuordnungen.

Aufruf::

    python scripts/verify-manual-approvals.py

Prueft fuer jeden ``match: "manual"``-Eintrag:

  1. Lebt die Q-ID ueberhaupt?
  2. Passt das Label zum erwarteten Namen (fuzzy, ueber DE/EN + Aliases)?
  3. Passt der Typ zum Eintrag (location -> "city"/"town"/"settlement"
     im Description-Feld; person -> "Person"; org -> "organization"; ...)?

Exitcode 0 = alles OK, Exitcode 1 = mind. eine Diskrepanz. Kann im
Pre-Commit oder in CI laufen.

Netzwerk-Abhaengigkeit: eine REST-Anfrage pro Batch (50 Q-IDs). Laeuft
typischerweise unter einer Sekunde. Fuer Offline-Runs::

    SKIP_VERIFY_MANUAL=1 python scripts/verify-manual-approvals.py
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

BASE = Path(__file__).parent.parent
RECONCILIATION = BASE / "data" / "output" / "wikidata-reconciliation.json"
USER_AGENT = "M3GIM-Pipeline/1.0 (office@dhcraft.org)"
BATCH = 50

# Heuristische Typ-Signale im Description-Text.
TYPE_SIGNALS = {
    "location":    ["stadt", "town", "city", "settlement", "gemeinde",
                    "ortschaft", "municipality", "village"],
    "person":      ["person", "saenger", "sänger", "komponist", "dirigent",
                    "singer", "composer", "conductor", "kuenstler",
                    "sopran", "mezzo", "alt ", "tenor", "bariton", "bass",
                    "maler", "dichter", "schriftsteller", "regisseur"],
    "org":         ["organization", "organisation", "unternehmen", "institution",
                    "company", "verein", "verband", "universit", "hochschule"],
    "work":        ["oper", "opera", "werk", "lied", "song", "sinfonie",
                    "symphony", "theaterst", "komposition", "music"],
}


def _normalize(s: str) -> str:
    """Lowercase + einfache Umlaut-Entschaerfung fuer fuzzy-Vergleich."""
    s = (s or "").lower().strip()
    return (s.replace("ä", "a").replace("ö", "o").replace("ü", "u")
             .replace("ß", "ss").replace("-", " "))


def _tokens(s: str) -> set:
    return set(_normalize(s).split())


def fetch_entities(qids: list) -> dict:
    """Holt Labels, Aliases und Beschreibungen in DE+EN fuer eine QID-Liste."""
    url = ("https://www.wikidata.org/w/api.php?action=wbgetentities"
           f"&ids={'|'.join(qids)}"
           "&props=labels|aliases|descriptions"
           "&languages=de|en&format=json")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8")).get("entities", {})


def verify_entry(entry: dict, wd: dict) -> tuple[str, str]:
    """Vergleicht einen Eintrag gegen die Live-WD-Daten.

    Rueckgabe: (status, comment).
    Status: "OK" | "MISMATCH" | "MISSING" | "TYPE-WARN".
    """
    qid = entry.get("qid", "")
    name = entry.get("name", "")
    etype = entry.get("type", "")

    if qid not in wd:
        return "MISSING", f"Q-ID {qid} existiert nicht auf Wikidata"

    labels = wd[qid].get("labels", {})
    aliases = wd[qid].get("aliases", {})
    desc = wd[qid].get("descriptions", {})

    candidates = set()
    for lang in ("de", "en"):
        if lang in labels:
            candidates.add(labels[lang].get("value", ""))
        for a in aliases.get(lang, []):
            candidates.add(a.get("value", ""))

    wd_label_de = labels.get("de", {}).get("value") or labels.get("en", {}).get("value") or "?"
    wd_desc_de = desc.get("de", {}).get("value") or desc.get("en", {}).get("value") or ""

    name_norm = _normalize(name)
    cand_norms = {_normalize(c) for c in candidates}

    # Direkte Treffer
    if name_norm in cand_norms:
        return "OK", f"{wd_label_de} — {wd_desc_de[:60]}"

    # Token-basierter Jaccard ueber Labels+Aliases
    name_tokens = _tokens(name)
    best = 0.0
    for c in candidates:
        ct = _tokens(c)
        if not ct or not name_tokens:
            continue
        j = len(name_tokens & ct) / len(name_tokens | ct)
        if j > best:
            best = j

    # Typ-Signal aus Description
    desc_norm = _normalize(wd_desc_de)
    signals = TYPE_SIGNALS.get(etype, [])
    type_hit = any(sig in desc_norm for sig in signals)

    if best >= 0.5 and type_hit:
        return "OK", f"{wd_label_de} (Alias/Token-Match {best:.0%}) — {wd_desc_de[:60]}"
    if type_hit:
        return "TYPE-WARN", f"{wd_label_de} — {wd_desc_de[:60]}  (Name abweichend, Typ passt)"
    return "MISMATCH", f"{wd_label_de} — {wd_desc_de[:80]}"


def main() -> int:
    if os.environ.get("SKIP_VERIFY_MANUAL"):
        print("SKIP_VERIFY_MANUAL gesetzt — ueberspringe Live-Check.")
        return 0

    if not RECONCILIATION.exists():
        print(f"Reconciliation-JSON fehlt: {RECONCILIATION}")
        return 1

    with open(RECONCILIATION, encoding="utf-8") as f:
        data = json.load(f)

    manual = [m for m in data.get("matched", []) if m.get("match") == "manual"]
    if not manual:
        print("Keine manual-approved Eintraege — nichts zu pruefen.")
        return 0

    print(f"Pruefe {len(manual)} manual-approved Eintraege gegen Wikidata...\n")
    qids = [m["qid"] for m in manual if m.get("qid")]

    wd = {}
    for i in range(0, len(qids), BATCH):
        batch = qids[i:i + BATCH]
        try:
            wd.update(fetch_entities(batch))
        except Exception as exc:  # noqa: BLE001
            print(f"  Batch {i // BATCH + 1} Fehler: {exc}")
        time.sleep(0.2)

    statuses = {}
    for m in manual:
        status, comment = verify_entry(m, wd)
        statuses.setdefault(status, []).append((m, comment))

    # Ausgabe
    for status in ("OK", "TYPE-WARN", "MISMATCH", "MISSING"):
        items = statuses.get(status, [])
        if not items:
            continue
        icon = {"OK": "✓", "TYPE-WARN": "⚠", "MISMATCH": "✗", "MISSING": "✗"}[status]
        print(f"{icon} {status}  ({len(items)})")
        for m, comment in items:
            name = m.get("name", "?")
            qid = m.get("qid", "?")
            print(f"    {name:25s} {qid:10s}  {comment}")
        print()

    bad = len(statuses.get("MISMATCH", [])) + len(statuses.get("MISSING", []))
    if bad:
        print(f"FAIL — {bad} Eintrag(e) mit Diskrepanz. "
              "Korrekte Q-ID in reconciliation.json eintragen und Cache evicten.")
        return 1
    warn = len(statuses.get("TYPE-WARN", []))
    if warn:
        print(f"PASS mit {warn} Warnung(en) — Typ passt, Name weicht ab (z. B. historische Stadtnamen).")
    else:
        print("PASS — alle manual-approved Eintraege verifiziert.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
