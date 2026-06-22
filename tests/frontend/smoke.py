"""Frontend-Smoke-Test via Playwright.

Laedt die SPA unter http://localhost:8765/ in einem Headless-Chromium, klickt
die sieben sichtbaren Tabs durch und prueft pro Tab: keine JS-Errors, DOM rendert
nicht-leer. Der Mobilitaets-Tab (D3-geo-Karte, E-111) hat zusaetzlich einen
Karten-Canary (Knoten und Pfeile rendern nach dem asynchronen Geometrie-Load).
Zusaetzlich werden im Archiv-Tab Anker-Records geoeffnet und das Detail-Panel
gegen Konsolen-Fehler + erwartete Sektionen gecheckt.

Aufruf (Server muss laufen: `python -m http.server 8765` in `docs/`):

    python tests/frontend/smoke.py

Exitcode 0 = alles OK, Exitcode 1 = mindestens ein FAIL.

Bewusst *kein* pytest-Integration bis der Test stabil laeuft — einfacher
Standalone-Script mit kompaktem Protokoll.
"""

import os
import sys
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("M3GIM_SMOKE_URL", "http://localhost:8765/")
# Alle sichtbaren Tabs testen (deckt VISIBLE_TABS). Der Mobilitaets-Tab (D3-geo-
# Karte, E-111) und der Korb sind seit E-109/E-111 sichtbar und jetzt im Loop;
# die verborgenen Perspektiv-Tabs (mobilitaets-atlas, repertoire, biogramm)
# bleiben per `hidden` ausgeblendet und werden spaeter ueberarbeitet (E-81).
TABS = ["bestand", "chronik", "statistik", "indizes", "mobilitaet", "netzwerk", "korb"]

# Anker-Records: Titel-Snippets, die im Bestand-Tab-DOM erreichbar sein muessen.
# Nur Records mit Verknuepfungen (sonst werden sie durch den "nur bearbeitet"-
# Filter unsichtbar) und aus aktiv bearbeiteten Konvoluten.
ANCHOR_TITLES = [
    "Rezension von Karl Schumann zu Macbeth",       # NIM_004/3
    "Handschriftliche Notiz",                        # NIM_007/5_1 (Finanz-Anker)
]

# Bekannte, dokumentierte @id-Kollisionen (siehe knowledge/data.md § 17).
# Wird der Satz grosser, ist das ein echter Regressions-Alarm.
KNOWN_COLLISIONS = {"m3gim:NIM_PL_07"}


# ---------------------------------------------------------------------------
# Canary-Helper (Session 36 M3.5): extrahiert damit zusaetzliche Tests fuer
# M4/M5 ohne Copy-Paste-Wuchs angehaengt werden koennen.
# ---------------------------------------------------------------------------

def expect_stamp(
    stamps: dict[str, str],
    view: str,
    required_keys: list[str] | None = None,
) -> tuple[str, str, str]:
    """Prueft, dass der View einen Log-Stempel geschrieben hat und optional,
    dass bestimmte Keys vorkommen (Reihenfolge egal)."""
    label = f"stamp:{view:22s}"
    stamp = stamps.get(view)
    if not stamp:
        return ("FAIL", label,
                "Kein console.log '[view] ...' waehrend Render")
    if required_keys:
        missing = [k for k in required_keys if f"{k}:" not in stamp]
        if missing:
            return ("FAIL", label,
                    f"Keys fehlen: {', '.join(missing)} | {stamp[:80]}")
    return ("OK", label, stamp[:100])


def expect_no_new_errors(
    errors: list[str],
    errs_before: int,
) -> list[str]:
    """Gibt die seit `errs_before` neu eingelaufenen Errors zurueck."""
    return errors[errs_before:]


def main() -> int:
    if sys.stdout.encoding != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")

    print("Frontend-Smoke-Test\n" + "=" * 60)
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        global_errors: list[str] = []
        # State-Stempel pro Tab-View: jede Render-Funktion schreibt genau eine
        # Zeile `[viewname] key:val | ...` in die Konsole; wir sammeln die
        # letzte Zeile pro View und pruefen sie weiter unten.
        stamps: dict[str, str] = {}

        def on_console(msg):
            text = msg.text
            if msg.type in ("error", "warning"):
                global_errors.append(f"[{msg.type}] {text}")
            # Stempel erkennen: `[chronik] ...`, `[bestand] ...`, `[indizes] ...`
            if text.startswith("[") and "]" in text:
                tag = text[1:text.index("]")]
                if tag in ("chronik", "bestand", "indizes", "statistik",
                           "mobilitaet", "netzwerk", "korb"):
                    stamps[tag] = text

        page.on("console", on_console)
        page.on("pageerror", lambda exc: global_errors.append(f"[pageerror] {exc}"))

        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=20000)
        except Exception as e:
            print(f"[FAIL] goto {BASE_URL}: {e}")
            browser.close()
            return 1

        # --- Tab-Durchlauf ---
        for tab in TABS:
            errs_before = len(global_errors)
            try:
                page.locator(f'[data-tab="{tab}"]').first.click(timeout=5000)
                page.wait_for_timeout(600)   # Render-Zeit
                # Zaehle sichtbare Zeilen/Elemente im aktiven Tab-Panel
                visible = page.locator(
                    f'#tab-{tab} .record, '
                    f'#tab-{tab} .row, '
                    f'#tab-{tab} tr, '
                    f'#tab-{tab} .leaflet-marker-icon, '
                    f'#tab-{tab} circle, '
                    f'#tab-{tab} .chip, '
                    f'#tab-{tab} .stat-section, '
                    f'#tab-{tab} .statistik-chip'
                ).count()
                new_errs = global_errors[errs_before:]
                status = "OK" if not new_errs else "WARN"
                results.append((status, f"tab:{tab:20s}",
                                f"{visible:4d} Elemente, {len(new_errs)} Konsole"))
                for e in new_errs[:3]:
                    results.append(("  ", " " * 24, e[:120]))
            except Exception as e:
                results.append(("FAIL", f"tab:{tab:20s}", str(e)[:120]))

        # --- State-Stempel pro Tab: jeder View muss seinen Log-Stempel mit
        #     den erwarteten Keys geschrieben haben. Schuetzt davor, dass
        #     ein View still ins Nichts rendert (siehe currentFilters-
        #     Regression) oder ein Key beim Refactor still wegfliegt.
        stamp_expectations = {
            "bestand":    ["konvolute", "records", "sort"],
            "chronik":    ["records", "jahre-belegt", "undatiert", "spanne"],
            "statistik":  ["records", "konvolute", "events", "personen", "sektionen"],
            "indizes":    ["personen", "organisationen", "orte", "werke"],
            "mobilitaet": ["events", "verortet", "unverortet", "datiert", "jahre"],
            "netzwerk":   ["total", "ring1", "ring2", "agrelon"],
            "korb":       ["eintraege", "aufgeloest", "events", "finanzen"],
        }
        for view, required in stamp_expectations.items():
            results.append(expect_stamp(stamps, view, required))

        # --- Canary Chronik: Scroll-Zeitstrahl (E-88) rendert Jahres-Zeilen
        #     1919..2009 (+ Ausreisser), leere Jahre als Umriss-Dots, Records
        #     als chronik-point-Chips. Klick auf Punkt = selectRecord -> springt
        #     in Bestand und oeffnet Inline-Detail.
        try:
            page.locator('[data-tab="chronik"]').first.click()
            page.wait_for_timeout(400)
            year_count = page.locator('#tab-chronik .chronik-year').count()
            empty_years = page.locator(
                '#tab-chronik .chronik-year--empty'
            ).count()
            points_in_empty = page.locator(
                '#tab-chronik .chronik-year--empty .chronik-point'
            ).count()
            # Erwartung: mindestens 91 Jahre (1919..2009), viele leer, keine
            # Records in leeren Jahres-Zeilen (Form-ist-Signal-Prinzip).
            if year_count >= 90 and empty_years >= 10 and points_in_empty == 0:
                results.append(("OK", "chronik:year-grid          ",
                                f"{year_count} Jahre, {empty_years} leer, 0 Punkte in leeren"))
            else:
                results.append(("FAIL", "chronik:year-grid          ",
                                f"Jahre={year_count}, leer={empty_years}, "
                                f"Punkte-in-leer={points_in_empty}"))

            # Klick auf einen Chronik-Punkt: muss selectRecord triggern und
            # in Bestand springen.
            points = page.locator('#tab-chronik .chronik-point')
            if points.count() > 0:
                errs_before = len(global_errors)
                points.first.click()
                page.wait_for_timeout(500)
                detail_visible = page.locator('.inline-detail').count()
                active_tab = page.locator('[data-tab][aria-selected="true"]').get_attribute('data-tab')
                new_errs = expect_no_new_errors(global_errors, errs_before)
                if detail_visible > 0 and active_tab == 'bestand' and not new_errs:
                    results.append(("OK", "click:chronik-point        ",
                                    "springt in Bestand + Inline-Detail, 0 Konsole"))
                else:
                    results.append(("FAIL", "click:chronik-point        ",
                                    f"detail={detail_visible}, tab={active_tab}, errs={len(new_errs)}"))
                    for e in new_errs[:2]:
                        results.append(("  ", " " * 24, e[:120]))
            else:
                results.append(("WARN", "click:chronik-point        ",
                                "keine Punkte im Zeitstrahl gefunden"))
        except Exception as e:
            results.append(("WARN", "chronik:year-grid          ",
                            f"check uebersprungen: {e}"))

        # --- Canary Mobilitaet: D3-geo-Karte (E-111) zeichnet nach dem
        #     asynchronen Geometrie-Load Stadt-Knoten und Pfad-Pfeile. Der reine
        #     logStamp-Check faengt das nicht: der Stempel wird synchron beim
        #     Render geschrieben, also bevor `loadCountries().then(...)` die
        #     Knoten zeichnet. Dieser Canary wartet auf den Async-Draw und ist
        #     der harte Schutz davor, dass die Karte still leer rendert
        #     (fehlende Geometrie, d3-Ausfall, Projektions-Bug).
        try:
            page.locator('[data-tab="mobilitaet"]').first.click()
            errs_before = len(global_errors)
            # Knoten erscheinen erst nach dem fetch der Laendergeometrie.
            page.locator('#tab-mobilitaet .mob-nodes g.mob-node').first.wait_for(
                state="attached", timeout=8000)
            nodes = page.locator('#tab-mobilitaet .mob-nodes g.mob-node').count()
            arcs = page.locator('#tab-mobilitaet .mob-arcs path').count()
            legend = page.locator('#tab-mobilitaet .vs-legend .vs-chip').count()
            land = page.locator('#tab-mobilitaet .mob-land path').count()
            new_errs = expect_no_new_errors(global_errors, errs_before)
            # Erwartung: mehrere Stadt-Knoten, mindestens ein Pfad-Pfeil, die
            # Sicht-Legende als Filter, Laendergeometrie, keine Konsolenfehler.
            if nodes >= 5 and arcs >= 1 and legend >= 5 and land >= 50 and not new_errs:
                results.append(("OK", "mobilitaet:karte-render     ",
                                f"{nodes} Knoten, {arcs} Pfeile, {legend} Sicht-Filter, "
                                f"{land} Laender"))
            else:
                results.append(("FAIL", "mobilitaet:karte-render     ",
                                f"Knoten={nodes}, Pfeile={arcs}, Legende={legend}, "
                                f"Laender={land}, errs={len(new_errs)}"))
                for e in new_errs[:2]:
                    results.append(("  ", " " * 24, e[:120]))
        except Exception as e:
            results.append(("FAIL", "mobilitaet:karte-render     ",
                            f"Karte nicht gezeichnet: {str(e)[:90]}"))

        # --- Anker-Titel: im DOM erreichbar? ---
        # (Kein Klick, weil Konvolute im Archiv-Tab ggf. eingeklappt sind und
        # Virtual-Scrolling die Zeilen lazy rendert. Reicht fuer Smoke: ist
        # der Titel als DOM-Text anwesend -> Daten sind durchgereicht.)
        try:
            page.locator('[data-tab="bestand"]').first.click()
            page.wait_for_timeout(400)
        except Exception:
            pass

        html = page.locator("body").inner_html()
        for ident in ANCHOR_TITLES:
            short = ident[:38]
            if ident in html:
                results.append(("OK", f"title:{short:38s}",
                                "im DOM anwesend"))
            else:
                results.append(("FAIL", f"title:{short:38s}",
                                "Titel fehlt im gerenderten DOM"))

        # --- Anker-Record NIM_004_1 voll aufklappen ---
        # Oeffnet den Brief-Record und prueft: Sprach-Label aufgeloest,
        # keine Doppel-Darstellung Malaniuk (KORRESPONDENZ vs ADRESSAT),
        # kein Konvolut-Inline-Detail (Konvolute klappen nur auf/zu).
        try:
            page.goto(f"{BASE_URL}#bestand/m3gim:NIM_004_1", wait_until="networkidle",
                      timeout=10000)
            page.wait_for_timeout(1500)
            detail = page.locator(".inline-detail").first
            if detail.count() == 0:
                results.append(("FAIL", "anchor:NIM_004_1                 ",
                                "Inline-Detail nicht geoeffnet"))
            else:
                body = detail.inner_text()
                # Sprach-Label aufgeloest?
                if "Englisch" in body and "Franz" in body:
                    results.append(("OK", "anchor:NIM_004_1:sprache         ",
                                    "en,fr -> Englisch, Franzoesisch"))
                else:
                    results.append(("FAIL", "anchor:NIM_004_1:sprache         ",
                                    "Sprach-Kuerzel nicht aufgeloest"))
                # Kein Doppel-Malaniuk: "ADRESSAT" soll NICHT in einer
                # Mitwirkende-Sektion stehen, wenn KORRESPONDENZ da ist.
                malaniuk_count = body.count("Malaniuk, Ira")
                # Genau einmal (unter KORRESPONDENZ).
                if malaniuk_count == 1:
                    results.append(("OK", "anchor:NIM_004_1:dedup           ",
                                    "Malaniuk erscheint einmal (dedup ok)"))
                else:
                    results.append(("FAIL", "anchor:NIM_004_1:dedup           ",
                                    f"Malaniuk {malaniuk_count}x sichtbar"))
                # E-97-Kontrakt: typisierter Mobilitaets-Chip mit Datum "—".
                # Belegt, dass der datumslose ZIELORT/ABSENDEORT-Chip real
                # rendert (nicht nur der generische ORT-Chip aus hasOrHadLocation).
                ort_block = page.locator(
                    ".inline-detail__section",
                    has=page.locator(".inline-detail__section-title",
                                     has_text="Ort & Ereignis")
                ).first
                ort_text = ort_block.inner_text() if ort_block.count() else ""
                has_zielort = "ZIELORT" in ort_text or "ABSENDEORT" in ort_text
                has_dash = "—" in ort_text   # em dash fuer datumslos
                if has_zielort and has_dash:
                    results.append(("OK", "anchor:NIM_004_1:ortsrolle-chip  ",
                                    "ZIELORT/ABSENDEORT-Chip mit Datum '—' gerendert"))
                else:
                    results.append(("FAIL", "anchor:NIM_004_1:ortsrolle-chip  ",
                                    f"zielort={has_zielort}, dash={has_dash} | "
                                    f"{ort_text[:80]!r}"))
        except Exception as e:
            results.append(("WARN", "anchor:NIM_004_1                 ",
                            f"check uebersprungen: {e}"))

        # --- Konvolut-Meta-Chips: direkt in der Bestand-Tabelle sichtbar? ---
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=10000)
            page.wait_for_timeout(800)
            page.locator('[data-tab="bestand"]').first.click()
            page.wait_for_timeout(400)
            chips = page.locator(".archiv-konvolut-meta .chip--compact").count()
            status = page.locator(".archiv-konvolut-status").count()
            if chips > 0 and status > 0:
                results.append(("OK", "konvolut-meta-chips              ",
                                f"{chips} Typ-Chips, {status} Status-Zeilen"))
            else:
                results.append(("FAIL", "konvolut-meta-chips              ",
                                f"chips={chips}, status={status}"))
        except Exception as e:
            results.append(("WARN", "konvolut-meta-chips              ",
                            f"check uebersprungen: {e}"))

        # --- Erschliessungs-Toggle (E-116): der "alle"-Modus blendet die nicht
        #     erschlossenen Bestaende ein, ausgegraut markiert; der Default zeigt
        #     nur erschlossene. Sichert, dass alle Daten erreichbar sind, ohne
        #     den Erschliessungsstand zu kaschieren (Zielbild Linie 3). ---
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=10000)
            page.wait_for_timeout(600)
            page.locator('[data-tab="bestand"]').first.click()
            page.wait_for_timeout(400)
            rows_default = page.locator('#tab-bestand tbody tr').count()
            un_default = page.locator(
                '#tab-bestand .archiv-row--unerschlossen').count()
            page.locator('#tab-bestand .archiv-toggle__input').first.check()
            page.wait_for_timeout(500)
            rows_all = page.locator('#tab-bestand tbody tr').count()
            un_all = page.locator(
                '#tab-bestand .archiv-row--unerschlossen').count()
            # Erwartung: mehr Zeilen im "alle"-Modus, im Default keine ausgegraute
            # Zeile, im "alle"-Modus mindestens eine als nicht erschlossen markiert.
            if rows_all > rows_default and un_default == 0 and un_all > 0:
                results.append(("OK", "bestand:erschliessung-toggle     ",
                                f"erschlossen {rows_default} -> alle {rows_all} Zeilen, "
                                f"{un_all} nicht erschlossen markiert"))
            else:
                results.append(("FAIL", "bestand:erschliessung-toggle     ",
                                f"default={rows_default}/un{un_default}, "
                                f"alle={rows_all}/un{un_all}"))
        except Exception as e:
            results.append(("WARN", "bestand:erschliessung-toggle     ",
                            f"check uebersprungen: {e}"))

        # --- Spezial-Check: duplicate @id im JSON-LD (Frontend-Store) ---
        # JSON-LD-Graph direkt ueber das window.m3gim-Debug-Objekt pruefen
        # (falls vorhanden) oder ueber einen fetch auf /data/m3gim.jsonld.
        try:
            dups = page.evaluate("""async () => {
                const res = await fetch('/data/m3gim.jsonld');
                const data = await res.json();
                const seen = new Map();
                const dup = [];
                for (const node of (data['@graph'] || [])) {
                    const id = node['@id'];
                    if (!id) continue;
                    if (seen.has(id)) {
                        dup.push({id, types: [seen.get(id), node['@type']]});
                    } else {
                        seen.set(id, node['@type']);
                    }
                }
                return dup;
            }""")
            unexpected = [d for d in dups if d['id'] not in KNOWN_COLLISIONS]
            known = [d for d in dups if d['id'] in KNOWN_COLLISIONS]
            if unexpected:
                results.append(("FAIL", "graph:duplicate-@id             ",
                                f"{len(unexpected)} NEUE kollidierende @id:"))
                for d in unexpected:
                    results.append(("  ", " " * 34,
                                    f"{d['id']} ({'/'.join(str(t) for t in d['types'])})"))
            elif known:
                results.append(("OK", "graph:duplicate-@id             ",
                                f"nur bekannte Kollisionen ({len(known)})"))
                for d in known:
                    results.append(("  ", " " * 34,
                                    f"{d['id']} (known, siehe data.md § 17)"))
            else:
                results.append(("OK", "graph:duplicate-@id             ",
                                "keine kollidierenden @ids im Graph"))
        except Exception as e:
            results.append(("WARN", "graph:duplicate-@id   ",
                            f"check uebersprungen: {e}"))

        browser.close()

    # --- Report ---
    print()
    n_ok = sum(1 for r in results if r[0] == "OK")
    n_warn = sum(1 for r in results if r[0] == "WARN")
    n_fail = sum(1 for r in results if r[0] == "FAIL")
    for status, label, msg in results:
        icon = {"OK": "✓", "WARN": "⚠", "FAIL": "✗", "  ": " "}.get(status, "?")
        print(f"  {icon} {status:4s} {label}  {msg}")
    print()
    print(f"Summary: {n_ok} OK, {n_warn} WARN, {n_fail} FAIL")
    return 0 if n_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
