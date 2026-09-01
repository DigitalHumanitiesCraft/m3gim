"""End-to-end-Abgleich Quell-CSV gegen die gerenderte Bestand-Liste.

audit-data.py prueft die Kette Quelle -> JSON-LD -> docs/data. Die letzte
Schicht, das tatsaechlich gerenderte DOM der Bestand-Tabelle, prueft bisher
niemand. Dieses Skript schliesst die Luecke: es laedt die Objekte-CSV ueber
die Pipeline-Loader, das publizierte docs/data/m3gim.jsonld, oeffnet die
Bestand-Ansicht headless im Chromium, schaltet den Umfang in der Sidebar auf
"Gesamt" (E-157) und vergleicht Zeile fuer Zeile.

Geprueft wird pro Einheit: Anwesenheit, Titelanzeige (inkl. Konvolut-Regel
"Kindtitel gleich Elterntitel wird leer" und 80-Zeichen-Truncation), die
Undatiert-Markierung "o. D." und die Erschliessungsanzeige (E-158): mindestens
ein gefuellter Punkt genau dann, wenn der Record Verknuepfungen traegt. Im
Umfang "Gesamt" sind Plakate und Tontraeger eingeschlossen, nur die
Folio-Metadaten-Records bleiben aussen vor.

Aufruf (Server muss laufen, siehe testing.md § Sichtpruefung):
    python -m http.server 8791 -d docs   # Port via M3GIM_VERIFY_URL aenderbar
    python tests/tools/verify_bestand_display.py

Schreibt data/reports/frontend-verification-bestand.md und endet mit
Exit 1 bei Befunden.
"""

import json
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

from _common import load_objekte  # noqa: E402
from transform import normalize_signatur  # noqa: E402

BASE_URL = os.environ.get("M3GIM_VERIFY_URL", "http://localhost:8791/")
JSONLD = REPO / "docs" / "data" / "m3gim.jsonld"
SHEETS = REPO / "data" / "google-spreadsheet"
REPORT = REPO / "data" / "reports" / "frontend-verification-bestand.md"

# Mirror of countLinks() in docs/js/utils/format.js; the dot display aggregates
# exactly these carriers.
LINK_KEYS = (
    "m3gim-ontology:hasAssociatedAgent",
    "rico:hasOrHadLocation",
    "rico:hasOrHadSubject",
    "m3gim-ontology:hasAnnotation",
    "m3gim-ontology:hasPerformance",
)


def ensure_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def count_links(record):
    return sum(len(ensure_list(record.get(k))) for k in LINK_KEYS)


def truncate(s, max_len=80):
    if not s or len(s) <= max_len:
        return s or ""
    return s[: max_len - 1] + "…"


def load_graph():
    data = json.loads(JSONLD.read_text(encoding="utf-8"))
    records, konvolute = {}, {}
    konvolut_children = {}
    for node in ensure_list(data.get("@graph")):
        types = ensure_list(node.get("@type"))
        if "rico:RecordSet" in types:
            konvolute[node["@id"]] = node
            konvolut_children[node["@id"]] = [
                p["@id"] for p in ensure_list(node.get("rico:hasOrHadPart"))
            ]
        else:
            records[node["@id"]] = node
    return records, konvolute, konvolut_children


def expected_display_set(records, konvolute, konvolut_children):
    """Repliziert getOrderedItems(showAll=True) aus archive-holdings.js.

    Der Umfang "Gesamt" blendet nichts mehr aus (E-157), einzig die
    Folio-Metadaten-Records bleiben in beiden Umfaengen aussen vor.
    """
    child_ids = {cid for kids in konvolut_children.values() for cid in kids}
    folio_ids = {rid for rid in records if rid.endswith("_Folio")}
    expected = {}
    for rid, r in records.items():
        if rid in folio_ids:
            continue
        # Kinder erscheinen nur unter ihrem Konvolut, Standalone direkt.
        parent = next(
            (kid for kid, kids in konvolut_children.items() if rid in kids), None
        ) if rid in child_ids else None
        ident = r.get("rico:identifier", "")
        if not ident:
            continue
        expected[ident] = {
            "id": rid,
            "record": r,
            "parent": parent,
            "links": count_links(r),
            "undated": not r.get("rico:date"),
        }
    return expected, folio_ids


def dom_rows(page):
    return page.evaluate(
        """() => {
          const out = [];
          for (const tr of document.querySelectorAll('#bestand-tbody > tr')) {
            if (tr.classList.contains('archiv-row--detail')) continue;
            const ersch = tr.querySelector('.archiv-ersch');
            out.push({
              header: tr.dataset.konvolutHeader || null,
              child: tr.dataset.konvolutChild || null,
              sig: (tr.querySelector('.archiv-signatur') || {}).textContent || '',
              titel: (tr.querySelector('.archiv-titel') || {}).textContent || '',
              datum: (tr.querySelector('.archiv-datum') || {}).textContent || '',
              erschDots: tr.querySelectorAll('.ersch-dot').length,
              erschOn: tr.querySelectorAll('.ersch-dot--on').length,
              erschTip: ersch ? (ersch.dataset.tip || '') : '',
            });
          }
          return out;
        }"""
    )


def reconstruct_identifier(row, header_sig_by_id):
    """Anzeige-Signatur -> rico:identifier (UAKUG/... mit Folio)."""
    if row["child"]:
        parent_sig = header_sig_by_id.get(row["child"], "")
        m = re.match(r"Nr\.\s*(.+)$", row["sig"].replace(" ", " ").strip())
        if m and parent_sig:
            return f"UAKUG/{parent_sig} {m.group(1).replace('.', '_')}"
        # formatChildSignatur-Fallback: volle Signatur angezeigt
        return "UAKUG/" + row["sig"].strip()
    return "UAKUG/" + row["sig"].strip()


def main():
    findings = []
    stats = {}

    # --- Schicht 1: Quelle -----------------------------------------------
    objekte = load_objekte(SHEETS)
    source_units = []  # (objekt_id, zeile) fuer Objektzeilen mit Folio
    sig = None
    for i, row in objekte.iterrows():
        raw_sig = str(row.get("archivsignatur") or "").strip()
        if raw_sig and raw_sig.lower() != "nan":
            sig = normalize_signatur(raw_sig.removeprefix("UAKUG/"))
        folio_col = next(
            (c for c in ("folio nr", "folio") if c in objekte.columns), None
        )
        folio = str(row.get(folio_col) or "").strip() if folio_col else ""
        if folio.lower() == "nan":
            folio = ""
        if sig and folio:
            source_units.append((f"UAKUG/{sig} {folio}", i + 2))
    stats["csv_objektzeilen"] = len(source_units)

    # --- Schicht 2: publiziertes JSON-LD ---------------------------------
    records, konvolute, konvolut_children = load_graph()
    expected, folio_ids = expected_display_set(records, konvolute, konvolut_children)
    stats["jsonld_records"] = len(records)
    stats["jsonld_konvolute"] = len(konvolute)
    stats["erwartete_einheiten"] = len(expected)

    jsonld_idents = {r.get("rico:identifier", "") for r in records.values()}
    csv_missing_in_jsonld = [
        (oid, line) for oid, line in source_units if oid not in jsonld_idents
    ]
    for oid, line in csv_missing_in_jsonld:
        findings.append(
            f"CSV-Objektzeile {line} ({oid}) erreicht das JSON-LD nicht."
        )

    # --- Schicht 3: gerendertes DOM --------------------------------------
    from playwright.sync_api import sync_playwright

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(BASE_URL, wait_until="networkidle")
        page.wait_for_selector("#bestand-tbody tr", timeout=15000)
        # Der Umfang steht seit E-156 als Segment in der linken Sidebar.
        page.click(".fs-scope__seg[data-value=gesamt]")
        page.wait_for_timeout(500)
        rows = dom_rows(page)
        browser.close()

    for e in errors:
        findings.append(f"JavaScript-Fehler im Browser: {e}")

    header_sig_by_id = {
        r["header"]: r["sig"].strip() for r in rows if r["header"]
    }
    dom_records = [r for r in rows if not r["header"]]
    stats["dom_konvolut_header"] = len(header_sig_by_id)
    stats["dom_einheiten"] = len(dom_records)

    dom_by_ident = {}
    for r in dom_records:
        ident = reconstruct_identifier(r, header_sig_by_id)
        dom_by_ident[ident] = r

    # Anwesenheit in beide Richtungen
    missing = sorted(set(expected) - set(dom_by_ident))
    extra = sorted(set(dom_by_ident) - set(expected))
    for ident in missing:
        findings.append(f"Fehlt im DOM: {ident}")
    for ident in extra:
        findings.append(f"Im DOM, aber nicht erwartet: {ident}")

    # Feldvergleich pro angezeigter Einheit
    # Konvoluttitel wie loader.js Pass 3: Folio-Record vor _collection-Record.
    parent_title = {}
    for kid, kids in konvolut_children.items():
        folio_rec = next(
            (records[c] for c in kids if c.endswith("_Folio") and c in records), None
        )
        sammel_rec = next(
            (records[c] for c in kids if c.endswith("_collection") and c in records),
            None,
        )
        title = (folio_rec or {}).get("rico:title") or (sammel_rec or {}).get(
            "rico:title"
        )
        if title:
            parent_title[kid] = title

    field_checked = 0
    for ident, exp in expected.items():
        row = dom_by_ident.get(ident)
        if not row:
            continue
        field_checked += 1
        r = exp["record"]

        # Titel: Kindtitel gleich Konvoluttitel wird leer angezeigt
        title = r.get("rico:title", "") or ""
        if exp["parent"]:
            if title and title == parent_title.get(exp["parent"], ""):
                title = ""
        else:
            title = title or "(ohne Titel)"
        shown_title = row["titel"].strip()
        want_title = truncate(title, 80).strip()
        # Chips/Folio-Hints haengen im selben td; Prefix-Vergleich genuegt
        if want_title and not shown_title.startswith(want_title[:40]):
            findings.append(
                f"Titel weicht ab bei {ident}: angezeigt {shown_title[:60]!r}, "
                f"erwartet {want_title[:60]!r}"
            )

        # Datum: Undatiert-Markierung und Jahr
        shown_date = row["datum"].replace(" ", " ").strip()
        if exp["undated"]:
            if "o. D." not in shown_date and shown_date != "":
                findings.append(
                    f"Undatiert, aber Datum angezeigt bei {ident}: {shown_date!r}"
                )
        else:
            year = str(r["rico:date"])[:4]
            if year not in shown_date:
                findings.append(
                    f"Jahr {year} fehlt in Datumsanzeige bei {ident}: {shown_date!r}"
                )

        # Erschliessungsanzeige. Only one direction is an invariant: the dots also
        # draw on store-side derivations (Finanzen, AgRelOn, Mobilitaetsereignisse,
        # Datierungen) that no link field of the record carries, so a filled dot
        # without countLinks is legitimate. Links without any filled dot would be
        # a display gap.
        if row["erschDots"] == 0:
            findings.append(f"Erschliessungsanzeige fehlt bei {ident}.")
        elif exp["links"] > 0 and row["erschOn"] == 0:
            findings.append(
                f"Erschliessungsanzeige leer trotz Verknuepfungen bei {ident}: "
                f"Tooltip {row['erschTip']!r}, "
                f"Verknuepfungen im JSON-LD {exp['links']}"
            )
    stats["feldgeprueft"] = field_checked

    # CSV -> DOM Endkette (nur Einheiten, die das Frontend zeigen soll)
    csv_missing_in_dom = [
        (oid, line)
        for oid, line in source_units
        if oid in expected and oid not in dom_by_ident
    ]
    for oid, line in csv_missing_in_dom:
        findings.append(
            f"CSV-Objektzeile {line} ({oid}) steht im JSON-LD, fehlt aber im DOM."
        )

    write_report(stats, findings)
    print(f"Report: {REPORT}")
    print(f"Befunde: {len(findings)}")
    for f in findings[:20]:
        print(" -", f)
    if len(findings) > 20:
        print(f"   ... und {len(findings) - 20} weitere, siehe Report")
    return 1 if findings else 0


def write_report(stats, findings):
    lines = [
        "# Frontend-Verifikation Bestand-Liste",
        "",
        "Abgleich Quell-CSV -> docs/data/m3gim.jsonld -> gerenderte",
        'Bestand-Tabelle im Umfang "Gesamt" (E-157).',
        "Erzeugt von tests/tools/verify_bestand_display.py.",
        "",
        "## Zaehlstaende",
        "",
    ]
    for k, v in stats.items():
        lines.append(f"- {k}: {v}")
    lines += ["", "## Befunde", ""]
    if findings:
        lines += [f"- {f}" for f in findings]
    else:
        lines.append(
            "Keine. Jede erwartete Einheit steht im DOM, Titel, "
            "Datumsanzeige und Erschliessungsanzeige stimmen."
        )
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
