"""Verify source coverage and every rendered path through the Bestand view."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

from _common import load_objekte  # noqa: E402
from transform import normalize_signatur  # noqa: E402

BASE_URL = os.environ.get("M3GIM_VERIFY_URL", "http://localhost:8791/")
JSONLD = REPO / "docs/data/m3gim.jsonld"
SHEETS = REPO / "data/google-spreadsheet"
REPORT = REPO / "data/reports/frontend-verification-bestand.md"


def ensure_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def load_records() -> dict[str, dict]:
    graph = json.loads(JSONLD.read_text(encoding="utf-8")).get("@graph", [])
    return {node["@id"]: node for node in ensure_list(graph)
            if isinstance(node, dict)
            and "rico:Record" in ensure_list(node.get("@type"))}


def source_findings(records: dict[str, dict]) -> tuple[dict, list[str]]:
    """Keep source omissions distinct from browser rendering failures."""
    objects = load_objekte(SHEETS)
    folio_col = next((c for c in ("folio nr", "folio") if c in objects.columns), None)
    source_units = []
    signature = None
    for index, row in objects.iterrows():
        raw = str(row.get("archivsignatur") or "").strip()
        if raw and raw.lower() != "nan":
            signature = normalize_signatur(raw.removeprefix("UAKUG/"))
        folio = str(row.get(folio_col) or "").strip() if folio_col else ""
        if folio.lower() == "nan":
            folio = ""
        if signature and folio:
            source_units.append((f"UAKUG/{signature} {folio}", index + 2))
    identifiers = {record.get("rico:identifier", "") for record in records.values()}
    findings = [f"CSV-Objektzeile {row} ({identifier}) erreicht das JSON-LD nicht."
                for identifier, row in source_units if identifier not in identifiers]
    return {"csv_objektzeilen_mit_folio": len(source_units),
            "jsonld_records": len(records)}, findings


def browser_contract(page) -> dict:
    """Read membership and grouping through the production data layer."""
    return page.evaluate("""async () => {
      const [{ baseIds }, { getOrderedItems, rowRecords }] = await Promise.all([
        import('./js/data/records-for.js'), import('./js/views/bestand-data.js'),
      ]);
      const store = window.m3gim.store;
      const basis = baseIds(store);
      const rows = [], records = [];
      for (const item of getOrderedItems(store)) {
        if (item.isKonvolut) continue;
        const members = rowRecords(item).filter(record => basis.has(record['@id']));
        if (!members.length) continue;
        rows.push({ rowId: item.record['@id'], memberIds: members.map(r => r['@id']) });
        for (const record of members) records.push({
          id: record['@id'], identifier: record['rico:identifier'] || '',
          rowId: item.record['@id'], paged: record['@id'] !== item.record['@id'],
        });
      }
      return { basisCount: basis.size, basisIds: [...basis], rows, records };
    }""")


def render_findings() -> tuple[dict, list[str]]:
    from playwright.sync_api import expect, sync_playwright

    findings = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        browser_errors = []
        page.on("pageerror", lambda error: browser_errors.append(str(error)))
        page.goto(BASE_URL, wait_until="networkidle")
        page.wait_for_selector("#bestand-tbody tr", timeout=15_000)
        reset = page.locator(".vs-status__reset")
        if reset.count():
            reset.click()
        page.wait_for_timeout(100)
        contract = browser_contract(page)

        represented = [record["id"] for record in contract["records"]]
        if set(represented) != set(contract["basisIds"]) or len(represented) != len(set(represented)):
            findings.append("Gruppierung verliert oder dupliziert Basisrecords.")

        header_ids = page.locator("tr[data-konvolut-header]").evaluate_all(
            "rows => rows.map(row => row.dataset.konvolutHeader)")
        for header_id in header_ids:
            header = page.locator(f'tr[data-konvolut-header="{header_id}"]')
            if header.get_attribute("aria-expanded") != "true":
                header.click()
        actual_rows = set(page.locator("tr[data-record-row]").evaluate_all(
            "rows => rows.map(row => row.dataset.recordRow)"))
        expected_rows = {row["rowId"] for row in contract["rows"]}
        findings.extend(f"Erwartete Bestand-Zeile fehlt nach Expansion: {rid}"
                        for rid in sorted(expected_rows - actual_rows))
        findings.extend(f"Unerwartete Bestand-Zeile nach Expansion: {rid}"
                        for rid in sorted(actual_rows - expected_rows))

        opened = paged = substantive_chips = dated_values = 0
        for expected in contract["records"]:
            page.evaluate("rid => { location.hash = '#bestand/' + encodeURIComponent(rid); }",
                          expected["id"])
            head = page.locator(".archiv-row--detail .inline-detail__head-sig")
            try:
                expect(head).to_have_text(expected["identifier"], timeout=5_000)
            except Exception as exc:
                findings.append(f"Detail nicht erreichbar: {expected['id']} ({exc})")
                continue
            opened += 1
            shown = head.text_content().strip()
            if shown != expected["identifier"]:
                findings.append(f"Signatur weicht ab bei {expected['id']}: "
                                f"{shown!r} statt {expected['identifier']!r}")
            active = page.locator("tr.archiv-row--active").get_attribute("data-record-row")
            if active != expected["rowId"]:
                findings.append(f"Falsche Gruppenzeile bei {expected['id']}: "
                                f"{active!r} statt {expected['rowId']!r}")
            detail = page.locator(".archiv-row--detail")
            if detail.locator(".inline-detail__chips").count() == 0:
                findings.append(f"Verlinkter Basisrecord ohne Detailwerte: {expected['id']}")
            chips = detail.locator(".inline-detail__chips .chip--role-pair")
            chip_parts = chips.evaluate_all("""nodes => nodes.map(node => ({
              role: (node.querySelector('.chip-rolle')?.textContent || '').trim(),
              value: (node.querySelector('.chip-wert')?.textContent || '').trim(),
            }))""")
            blank = [part for part in chip_parts if not part["role"] or not part["value"]]
            if blank:
                findings.append(
                    f"Detailchip ohne Rolle oder Wert bei {expected['id']}: {blank!r}"
                )
            substantive_chips += len(chip_parts)
            dates = detail.locator(".chip-date")
            date_texts = dates.all_inner_texts()
            if any(not value.strip() for value in date_texts):
                findings.append(f"Leerer Datumswert bei {expected['id']}")
            dated_values += len(date_texts)
            if detail.locator(".prov-pill, .inline-detail__source").count():
                findings.append(f"Veraltete Quellen-Debug-UI bei {expected['id']}")
            if expected["id"] == "m3gim-data:NIM_023_5":
                text = detail.inner_text()
                canary = (
                    "Malaniuk, Ira",
                    "Wuppertal",
                    "4.\u2009April 1953",
                    "AUFFÜHRUNG",
                )
                missing = [value for value in canary if value not in text]
                if missing:
                    findings.append(
                        "Quellgestützter Inhalts-Canary NIM_023_5 unvollständig: "
                        + ", ".join(missing)
                    )
            if expected["paged"]:
                paged += 1
                if page.locator(".archiv-row--detail .inline-detail__page-pos").count() != 1:
                    findings.append(f"Folio-Seite ohne Seitenposition: {expected['id']}")
        findings.extend(f"JavaScript-Fehler im Browser: {error}"
                        for error in browser_errors)
        browser.close()
    return {"basis_records": contract["basisCount"],
            "expected_rows": len(contract["rows"]),
            "expanded_konvolute": len(header_ids), "opened_records": opened,
            "opened_folio_pages": paged,
            "rendered_role_value_chips": substantive_chips,
            "rendered_grouped_dates": dated_values}, findings


def write_report(mode: str, stats: dict, findings: list[str]) -> None:
    lines = ["# Frontend-Verifikation Bestand-Liste", "",
             f"Modus: `{mode}`. Erzeugt von `tests/tools/verify_bestand_display.py`.",
             "", "## Zählstände", "",
             *[f"- {key}: {value}" for key, value in stats.items()],
             "", "## Befunde", ""]
    lines.extend([f"- {finding}" for finding in findings] or ["Keine."])
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("render", "source", "all"), default="all")
    args = parser.parse_args(argv)
    records = load_records()
    stats, findings = {}, []
    if args.mode in ("source", "all"):
        new_stats, new_findings = source_findings(records)
        stats.update(new_stats)
        findings.extend(new_findings)
    if args.mode in ("render", "all"):
        new_stats, new_findings = render_findings()
        stats.update(new_stats)
        findings.extend(new_findings)
    write_report(args.mode, stats, findings)
    print(json.dumps({"mode": args.mode, "stats": stats, "findings": findings},
                     ensure_ascii=False))
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
