#!/usr/bin/env python3
"""M³GIM Erschliessungs-Report — die Arbeitsliste des Erschliessungsteams.

Das Team liest die Anwendung nicht; seine Adresse ist ein erzeugter Report
neben dem Quality-Snapshot. Waehrend der Snapshot den Stand fuer Dritte
zusammenfasst, nennt dieser Report die Stellen, an denen die Erfassung
weiterarbeiten kann:

  (a) die duenn erschlossenen Konvolute, geordnet nach Verknuepfungen je Objekt
  (b) Objekte, die als bearbeitet gefuehrt sind, aber keine Verknuepfung
      tragen und deshalb in keiner Ansicht erscheinen
  (c) Objekte, deren Titel einen Ort des Ortsindex nennt, ohne dass eine
      Ortsverknuepfung erfasst waere
  (d) Verknuepfungstypen, die die Pipeline nicht abbildet und deren Zeilen
      daher aus dem Datensatz fallen
  (e) die Fehlerklassen der Validierung, mit Zeiger auf den Validierungsreport,
      der die Fundstellen vollstaendig fuehrt

Aufruf:
    python scripts/report-cataloguing.py

Ausgabe: data/reports/cataloguing-report.md
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent))
from _common import (  # noqa: E402
    OUTPUT_DIR, REPORTS_DIR, SHEETS_DIR, load_index, rel_to_repo,
)

JSONLD = OUTPUT_DIR / "m3gim.jsonld"
OUTPUT = REPORTS_DIR / "cataloguing-report.md"
VALIDATION_REPORT = REPORTS_DIR / "validation-report.md"
VALIDATION_ERROR_SECTION = "Vollstaendige Fehlerliste"

# Die Kanten, die eine Verknuepfungszeile am Objekt erzeugen kann. Die Zahl
# dieser Eintraege ist die Erschliessungstiefe des Objekts; rico:creationDate
# zaehlt nicht mit, weil es aus der Objektzeile stammen kann.
LINK_PROPS = (
    "m3gim-ontology:hasAssociatedAgent",
    "rico:hasOrHadLocation",
    "rico:hasOrHadSubject",
    "m3gim-ontology:hasDetail",
    "m3gim-ontology:hasAnnotation",
    "m3gim-ontology:hasAgentRelation",
    "m3gim-ontology:hasPerformance",
)

# Spiegel von countLinks (docs/js/utils/format.js): die Kanten, deren Vorkommen
# ein Objekt sichtbar macht. Enger als LINK_PROPS, das die Erschliessungstiefe
# misst; hier steht die Frage, ob das Objekt die Anwendung ueberhaupt erreicht.
VISIBILITY_LINK_PROPS = (
    "m3gim-ontology:hasAssociatedAgent",
    "rico:hasOrHadLocation",
    "rico:hasOrHadSubject",
    "m3gim-ontology:hasAnnotation",
    "m3gim-ontology:hasPerformance",
)

WORKED_ON = ("abgeschlossen", "begonnen")

# Wie viele Zeilen eine Befundtabelle hoechstens fuehrt. Der Report ist eine
# Arbeitsliste, keine Vollausgabe; die Gesamtzahl steht im Satz darueber.
TABLE_LIMIT = 40


def ensure_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def link_count(record: dict) -> int:
    return sum(len(ensure_list(record.get(prop))) for prop in LINK_PROPS)


def source_cell(node: dict) -> str:
    src = node.get("m3gim-ontology:xlsxSource") or {}
    sheet = src.get("m3gim-ontology:xlsxSheet")
    row = src.get("m3gim-ontology:xlsxRow")
    return f"{sheet} {row}" if sheet and row else "—"


def load_records() -> list:
    with open(JSONLD, encoding="utf-8") as f:
        graph = json.load(f).get("@graph", [])
    return [
        n for n in graph
        if n.get("@type") == "rico:Record"
        and not n.get("@id", "").endswith("_Folio")
    ]


def konvolut_of(record: dict) -> str:
    """Signatur ohne Folio-Zusatz."""
    sig = record.get("rico:identifier", "")
    parts = sig.rsplit(" ", 1)
    return parts[0] if len(parts) == 2 else sig


# ---------------------------------------------------------------------------
# (a) Duenn erschlossene Konvolute
# ---------------------------------------------------------------------------

def thin_konvolute(records: list) -> list:
    stats: dict = {}
    for r in records:
        key = konvolut_of(r)
        entry = stats.setdefault(key, {"records": 0, "links": 0, "leer": 0})
        entry["records"] += 1
        n = link_count(r)
        entry["links"] += n
        if n == 0:
            entry["leer"] += 1
    rows = [
        {
            "konvolut": key,
            "records": v["records"],
            "links": v["links"],
            "leer": v["leer"],
            "je_objekt": v["links"] / v["records"] if v["records"] else 0.0,
        }
        for key, v in stats.items()
        # Einzelobjekte sind kein Konvolut; sie stehen in der Zusammenfassung.
        if v["records"] > 1
    ]
    rows.sort(key=lambda x: (x["je_objekt"], -x["records"]))
    return rows


# ---------------------------------------------------------------------------
# (b) Bearbeitet, aber ohne Verknuepfung
# ---------------------------------------------------------------------------

def worked_on_without_link(nodes: list) -> list:
    """Objekte mit Bearbeitungsstand, aber ohne jede sichtbare Verknuepfung.

    Seit E-165 ist die Verknuepfung die Dokumentbasis; ein solches Objekt
    erscheint in keiner Ansicht, waehrend die Erfassung es als bearbeitet
    fuehrt. Eine Regel fuer Report und Datenspiegel, den
    ``tests/test_61_orphan_links.py`` gegen diese Funktion prueft, statt eine
    zweite Kopie zu fuehren.
    """
    findings = []
    for node in nodes:
        if not isinstance(node, dict) or node.get("@type") != "rico:Record":
            continue
        if str(node.get("@id", "")).endswith("_Folio"):
            continue
        if node.get("m3gim-ontology:derivedFolioRecord") is True:
            continue
        stand = node.get("m3gim-ontology:processingStatus")
        if stand not in WORKED_ON:
            continue
        if any(ensure_list(node.get(prop)) for prop in VISIBILITY_LINK_PROPS):
            continue
        findings.append({
            "signatur": node.get("rico:identifier") or node.get("@id", "?"),
            "stand": stand,
            "titel": str(node.get("rico:title") or "").strip(),
            "quelle": source_cell(node),
        })
    findings.sort(key=lambda x: x["signatur"])
    return findings


# ---------------------------------------------------------------------------
# (c) Ort im Titel ohne Ortsverknuepfung
# ---------------------------------------------------------------------------

def place_names() -> list:
    """Die Namen des Ortsindex, laengste zuerst, damit das Kompositum gewinnt."""
    df = load_index(SHEETS_DIR, "Ortsindex")
    if df is None or "name" not in df.columns:
        return []
    names = {
        str(v).strip() for v in df["name"].dropna()
        if str(v).strip() and len(str(v).strip()) > 2
    }
    return sorted(names, key=len, reverse=True)


def places_in_title_without_link(records: list, names: list) -> list:
    # Wortgrenzen, damit "Rom" nicht in "Programm" trifft. Ein Name mit
    # Komma ("Bloomington, Indiana") bleibt als Ganzes stehen.
    patterns = [(n, re.compile(rf"(?<!\w){re.escape(n)}(?!\w)", re.I)) for n in names]
    findings = []
    for r in records:
        if ensure_list(r.get("rico:hasOrHadLocation")):
            continue
        title = r.get("rico:title")
        if not isinstance(title, str) or not title.strip():
            continue
        hits, covered = [], []
        for name, pattern in patterns:
            match = pattern.search(title)
            if not match:
                continue
            span = match.span()
            # Ein bereits vom laengeren Namen abgedeckter Treffer ist derselbe
            # Ort ("Bloomington" in "Bloomington, Indiana").
            if any(span[0] >= a and span[1] <= b for a, b in covered):
                continue
            covered.append(span)
            hits.append(name)
        if hits:
            findings.append({
                "signatur": r.get("rico:identifier", "?"),
                "orte": sorted(hits),
                "titel": title.strip(),
                "quelle": source_cell(r),
            })
    findings.sort(key=lambda x: x["signatur"])
    return findings


# ---------------------------------------------------------------------------
# (d) Verknuepfungstypen ohne Modellabbildung
# ---------------------------------------------------------------------------

def unmapped_link_types() -> dict:
    """Erfasste Typen, die kein Handler der Pipeline aufnimmt.

    Die Wahrheit darueber, was abgebildet ist, steht in transform.py und wird
    von dort gelesen statt hier nachgehalten.
    """
    from transform import (  # noqa: WPS433
        RELATION_HANDLERS, decompose_komposit_typ, load_verknuepfungen,
    )

    def raw(value) -> str:
        s = "" if value is None else str(value).strip()
        return "" if s.lower() == "nan" else s

    df = load_verknuepfungen(SHEETS_DIR)
    findings: dict = {}
    for _, row in df.iterrows():
        typ = raw(row.get("typ")).lower()
        if not typ:
            continue
        unknown = [p for p in (decompose_komposit_typ(typ) or [])
                   if p not in RELATION_HANDLERS]
        if not unknown:
            continue
        sheet, line = raw(row.get("_xlsx_sheet")), raw(row.get("_xlsx_row"))
        for part in unknown:
            findings.setdefault(part, []).append({
                "signatur": raw(row.get("archivsignatur")) or "—",
                "quelle": f"{sheet} {line}" if sheet and line else "—",
                "name": raw(row.get("name")) or "—",
            })
    return findings


# ---------------------------------------------------------------------------
# (e) Fehlerklassen der Validierung
# ---------------------------------------------------------------------------

# Eine Befundzeile aus generate_report von validate.py, Form:
# "- **E004 Objekte [Box_12] Zeile 57:** typ = `wert` -> Meldung".
VALIDATION_ERROR_LINE = re.compile(
    r"^- \*\*(?P<code>\w+) (?P<tabelle>\S+?)(?: \[[^\]]*\])? Zeile \d+:\*\* "
    r"(?P<feld>\S+) = .* -> (?P<meldung>.+)$"
)
VALIDATION_GENERATED = re.compile(r"^> Generiert: (.+)$")


def validation_error_classes() -> dict:
    """Die ERROR-Befunde des Validierungsreports nach Klasse gebuendelt.

    Gelesen statt neu berechnet: validate.py ist Schritt 2 der Pipeline und
    dieser Report Schritt 7, die Datei ist also aktuell, und ihre gesamte
    Validierungsorchestrierung muesste hier sonst ein zweites Mal stehen. Die
    Fundstellen bleiben drueben, hier steht nur, wie viel Arbeit je Klasse
    dahintersteht.
    """
    if not VALIDATION_REPORT.exists():
        return {"vorhanden": False}
    stand = None
    in_section = False
    zeilen = 0
    klassen: dict = {}
    for line in VALIDATION_REPORT.read_text(encoding="utf-8").splitlines():
        if stand is None:
            head = VALIDATION_GENERATED.match(line)
            if head:
                stand = head.group(1).strip()
        if line.startswith("## "):
            in_section = line[3:].strip() == VALIDATION_ERROR_SECTION
            continue
        if not in_section or not line.startswith("- **"):
            continue
        zeilen += 1
        match = VALIDATION_ERROR_LINE.match(line)
        if not match:
            continue
        key = (match["code"], match["tabelle"], match["feld"])
        entry = klassen.setdefault(key, {"anzahl": 0, "meldungen": set()})
        entry["anzahl"] += 1
        entry["meldungen"].add(match["meldung"].strip())
    rows = [
        {
            "code": code,
            "tabelle": tabelle,
            "feld": feld,
            "anzahl": v["anzahl"],
            # Deterministischer Vertreter; E001 traegt die Signatur in der
            # Meldung und bildet deshalb mehrere Texte in einer Klasse.
            "meldung": sorted(v["meldungen"])[0],
            "mehrere": len(v["meldungen"]) > 1,
        }
        for (code, tabelle, feld), v in klassen.items()
    ]
    rows.sort(key=lambda x: (-x["anzahl"], x["code"], x["tabelle"], x["feld"]))
    return {
        "vorhanden": True,
        "stand": stand,
        "klassen": rows,
        "gesamt": sum(r["anzahl"] for r in rows),
        "zeilen": zeilen,
    }


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def build_report(records: list) -> str:
    lines = ["# M³GIM Erschließungs-Report", ""]
    run_time = datetime.now().astimezone().isoformat(timespec="minutes")
    lines.append(f"_Laufzeit des Reports: {run_time}_")
    lines.append("")
    lines.append(
        f"Grundlage: `{rel_to_repo(JSONLD)}` und die Quelltabellen unter "
        f"`{rel_to_repo(SHEETS_DIR)}`. Jeder Lauf der "
        "Pipeline stellt diesen Report neu her."
    )
    lines.append("")
    lines.append(
        "Dieser Report ist die eine Adresse der Erfassung. Er führt die "
        "Befunde des Datenspiegels selbst und zeigt für die Quellfehler der "
        f"Validierung auf `{rel_to_repo(VALIDATION_REPORT)}`, wo sie mit "
        "Zeilennummer stehen."
    )
    lines.append("")
    lines.append(
        f"Gezählt werden {len(records)} Records. Als Verknüpfung zählt jeder "
        "Eintrag an den Kanten `hasAssociatedAgent`, `hasOrHadLocation`, "
        "`hasOrHadSubject`, `hasDetail`, `hasAnnotation`, `hasAgentRelation` "
        "und `hasPerformance`."
    )
    lines.append("")

    # (a)
    rows = thin_konvolute(records)
    lines.append("## Dünn erschlossene Konvolute")
    lines.append("")
    lines.append(
        "Die Konvolute mit mehr als einem Objekt, aufsteigend nach "
        "Verknüpfungen je Objekt. Oben steht, wo die Erfassung am wenigsten "
        "erschlossen hat."
    )
    lines.append("")
    lines.append("| Konvolut | Objekte | Verknüpfungen | je Objekt | ohne Verknüpfung |")
    lines.append("|---|---:|---:|---:|---:|")
    for row in rows:
        lines.append(
            f"| {row['konvolut']} | {row['records']} | {row['links']} | "
            f"{row['je_objekt']:.1f} | {row['leer']} |"
        )
    lines.append("")

    einzel = [r for r in records if konvolut_of(r) == r.get("rico:identifier", "")]
    einzel_ohne = sum(1 for r in einzel if link_count(r) == 0)
    lines.append(
        f"Daneben stehen {len(einzel)} Einzelobjekte ohne Folio-Gliederung, "
        f"davon {einzel_ohne} ohne jede Verknüpfung."
    )
    lines.append("")

    # (b) Ohne Deckel: die Liste ist der Arbeitsauftrag, ein abgeschnittenes
    # Ende verschwiege genau die Objekte, die aus der Anwendung fallen.
    waisen = worked_on_without_link(records)
    lines.append("## Bearbeitet, aber ohne Verknüpfung")
    lines.append("")
    lines.append(
        "Der Bearbeitungsstand führt diese Objekte als abgeschlossen oder "
        "begonnen, sie tragen aber keine Verknüpfung zu Person, Ort, Werk, "
        "Anmerkung oder Auftritt. Seit E-165 ist die Verknüpfung die "
        "Dokumentbasis, das Objekt erscheint deshalb in keiner Ansicht. "
        f"Gefunden: {len(waisen)} Objekte. Entweder sind die Verknüpfungen "
        "nachzutragen oder der Bearbeitungsstand ist zurückzustellen."
    )
    lines.append("")
    if waisen:
        lines.append("| Signatur | Bearbeitungsstand | Titel | Quellzeile |")
        lines.append("|---|---|---|---|")
        for w in waisen:
            titel = w["titel"].replace("|", "\\|") or "—"
            lines.append(
                f"| {w['signatur']} | {w['stand']} | {titel} | {w['quelle']} |"
            )
    else:
        lines.append("_Kein Befund in diesem Lauf._")
    lines.append("")

    # (c)
    names = place_names()
    findings = places_in_title_without_link(records, names)
    lines.append("## Ort im Titel ohne Ortsverknüpfung")
    lines.append("")
    lines.append(
        f"Der Titel nennt einen der {len(names)} Namen des Ortsindex, das "
        "Objekt trägt aber keine Verknüpfung vom Typ `ort`. Der Ort ist damit "
        "erfasst, aber fuer Karte, Register und Filter unsichtbar. "
        f"Gefunden: {len(findings)} Objekte."
    )
    lines.append("")
    if findings:
        lines.append("| Signatur | Ort im Titel | Titel | Quellzeile |")
        lines.append("|---|---|---|---|")
        for f in findings[:TABLE_LIMIT]:
            titel = f["titel"].replace("|", "\\|")
            lines.append(
                f"| {f['signatur']} | {', '.join(f['orte'])} | {titel} | "
                f"{f['quelle']} |"
            )
        if len(findings) > TABLE_LIMIT:
            lines.append("")
            lines.append(
                f"Weitere {len(findings) - TABLE_LIMIT} Objekte sind nicht "
                "aufgeführt; sie stehen im nächsten Lauf, sobald die "
                "gelisteten abgearbeitet sind."
            )
    else:
        lines.append("_Kein Befund in diesem Lauf._")
    lines.append("")

    # (d)
    unmapped = unmapped_link_types()
    total = sum(len(v) for v in unmapped.values())
    lines.append("## Verknüpfungstypen ohne Modellabbildung")
    lines.append("")
    lines.append(
        "Diese Typwerte haben keine spezielle Modellabbildung. Bei einer "
        "auflösbaren Objektzuordnung bleiben sie als neutrale Quellangaben "
        f"mit ihrem Originalwert erhalten. Betroffen: {total} Zeilen in "
        f"{len(unmapped)} Typen. Eine fachlich spezifischere Zuordnung "
        "erfordert eine ausdrückliche Angabe in der Erfassung."
    )
    lines.append("")
    if unmapped:
        for typ in sorted(unmapped, key=lambda t: -len(unmapped[t])):
            rows_t = unmapped[typ]
            lines.append(f"### Typ `{typ}` ({len(rows_t)} Zeilen)")
            lines.append("")
            lines.append("| Signatur | Quellzeile | erfasster Name |")
            lines.append("|---|---|---|")
            for row in rows_t[:TABLE_LIMIT]:
                name = row["name"].replace("|", "\\|")
                lines.append(f"| {row['signatur']} | {row['quelle']} | {name} |")
            if len(rows_t) > TABLE_LIMIT:
                lines.append("")
                lines.append(f"Weitere {len(rows_t) - TABLE_LIMIT} Zeilen nicht aufgeführt.")
            lines.append("")
    else:
        lines.append("_Kein Befund in diesem Lauf._")
        lines.append("")

    # (e)
    lines.extend(validation_section())

    return "\n".join(lines) + "\n"


def validation_section() -> list:
    """Die Fehlerklassen der Validierung als Zeiger auf den Nachbarreport."""
    val = validation_error_classes()
    pfad = rel_to_repo(VALIDATION_REPORT)
    lines = ["## Quellfehler der Validierung", ""]
    if not val.get("vorhanden"):
        lines.append(
            f"`{pfad}` liegt in diesem Lauf nicht vor; er entsteht mit "
            "`python scripts/validate.py`."
        )
        lines.append("")
        return lines
    stand = val["stand"] or "unbekannt"
    if val["klassen"]:
        lines.append(
            f"Die Validierung zählt {val['gesamt']} Fehler in "
            f"{len(val['klassen'])} Klassen, Stand {stand}. Jede Fundstelle "
            f"mit Tabelle, Blatt und Zeilennummer steht in `{pfad}` § "
            f"{VALIDATION_ERROR_SECTION}; hier steht, wie viel Arbeit hinter "
            "jeder Klasse liegt. Die abgestimmten Korrekturen führt "
            "`data/reports/source-errors-handover-*.md`."
        )
        lines.append("")
        lines.append("| Code | Tabelle | Feld | Zeilen | Befund |")
        lines.append("|---|---|---|---:|---|")
        for row in val["klassen"]:
            meldung = row["meldung"].replace("|", "\\|")
            if row["mehrere"]:
                meldung += " (u. a.)"
            lines.append(
                f"| {row['code']} | {row['tabelle']} | {row['feld']} | "
                f"{row['anzahl']} | {meldung} |"
            )
    elif val["zeilen"]:
        # Formdrift statt Entwarnung: validate.py hat die Zeilenform geaendert.
        lines.append(
            f"`{pfad}` führt {val['zeilen']} Fehlerzeilen in einer Form, die "
            "dieser Report nicht liest. Die Befunde stehen dort vollständig; "
            f"`VALIDATION_ERROR_LINE` in `{rel_to_repo(Path(__file__))}` ist "
            "an die Zeilenform von `scripts/validate.py` anzugleichen."
        )
    else:
        lines.append(f"Die Validierung meldet keine Fehler, Stand {stand}.")
    lines.append("")
    return lines


def main():
    print("Lese m3gim.jsonld ...")
    records = load_records()
    print(f"  {len(records)} Records")
    text = build_report(records)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(text, encoding="utf-8")
    print(f"Gespeichert: {rel_to_repo(OUTPUT)} "
          f"({OUTPUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
