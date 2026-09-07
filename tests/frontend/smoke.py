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
TABS = ["bestand", "chronik", "statistik", "indizes", "karte", "netzwerk", "korb"]

# Anker-Records: Titel-Snippets, die im Bestand-Tab-DOM erreichbar sein muessen.
# Nur Records mit Verknuepfungen (sonst werden sie durch den "nur bearbeitet"-
# Filter unsichtbar) und aus aktiv bearbeiteten Konvoluten.
ANCHOR_TITLES = [
    "Rezension von Karl Schumann zu Macbeth",       # NIM_004/3
    "Handschriftliche Notiz",                        # NIM_007/5_1 (Finanz-Anker)
]

# Bekannte, dokumentierte @id-Kollisionen (siehe data/reports/reconciliation-register.md).
# Aktuell leer — das PL_07-Quellduplikat wird von der Pipeline kompensiert.
# Jeder Eintrag hier ist ein tolerierter Regressions-Alarm.
KNOWN_COLLISIONS = set()


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


# Der Bestand scrollt weich; erst wenn `scrollTop` mehrere Frames still steht,
# ist die Messung belastbar.
SCROLL_SETTLED = """() => new Promise(done => {
  const main = document.querySelector('.archiv-main');
  if (!main) return done(null);
  let last = -1, same = 0;
  const tick = () => {
    if (main.scrollTop === last) { if (++same > 6) return done(main.scrollTop); }
    else { same = 0; last = main.scrollTop; }
    requestAnimationFrame(tick);
  };
  tick();
})"""

# Abstand zwischen der Oberkante des Konvolut-Kopfs und der Unterkante des
# Spaltenkopfs. Gemessen an einer `th`-Zelle: sticky sitzt auf den Zellen, das
# `thead` selbst scrollt weg und meldet eine Box weit ausserhalb.
HEAD_OFFSET = """(kid) => {
  const main = document.querySelector('.archiv-main');
  const th = main && main.querySelector('.archiv-table thead th');
  const row = main && main.querySelector('tr[data-konvolut-header="' + kid + '"]');
  if (!th || !row) return null;
  return row.getBoundingClientRect().top - th.getBoundingClientRect().bottom;
}"""


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
                           "karte", "netzwerk", "korb"):
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
            "bestand":    ["konvolute", "records", "stand"],
            "chronik":    ["records", "jahre-belegt", "datumsgruppen",
                           "quellenbezuege", "ohne-dokumentdatum", "spanne"],
            "statistik":  ["records", "ansichten", "aktiv", "spanne"],
            # Seit E-226 zeigt die Seite genau ein Register; der Stempel nennt
            # es und seine Zahlen statt aller vier Registerschluessel.
            "indizes":    ["register", "eintraege", "gesamt", "sortierung"],
            "karte":      ["entitaeten", "orte", "belege", "unverortet", "jahre"],
            "netzwerk":   ["facetten", "person", "ort", "werk", "institution",
                           "stand", "zeit", "modus", "knoten", "akteure",
                           "personen", "institutionen", "dokumentknoten",
                           "kanten", "einzelbelege", "beziehungen",
                           "recordsWeit", "recordsEng", "msLayout",
                           "msZeichnen", "msGesamt", "msErstzeichnung"],
            "korb":       ["eintraege", "aufgeloest", "events", "finanzen"],
        }
        for view, required in stamp_expectations.items():
            results.append(expect_stamp(stamps, view, required))

        # --- Canary Chronik: dated rows expose their sources and entities.
        try:
            page.locator('[data-tab="chronik"]').first.click()
            page.wait_for_timeout(400)
            date_rows = page.locator('#tab-chronik .chronik-date')
            sources = page.locator('#tab-chronik .chronik-source__link')
            entities = page.locator('#tab-chronik .chronik-entity')
            if date_rows.count() > 0 and sources.count() > 0 and entities.count() > 0:
                results.append(("OK", "chronik:timeline          ",
                                f"{date_rows.count()} Datierungen, "
                                f"{sources.count()} Quellen, {entities.count()} Entitaeten"))
            else:
                results.append(("FAIL", "chronik:timeline          ",
                                f"Datierungen={date_rows.count()}, Quellen={sources.count()}, "
                                f"Entitaeten={entities.count()}"))

            if sources.count() > 0:
                errs_before = len(global_errors)
                sources.first.click()
                page.wait_for_timeout(200)
                evidence = page.locator(
                    '#tab-chronik .chronik-detail-slot .chronik-evidence'
                )
                evidence_jump = evidence.locator('.chronik-evidence__source')
                panel_visible = evidence.count()
                if evidence_jump.count() > 0:
                    evidence_jump.first.click()
                page.wait_for_timeout(500)
                detail_visible = page.locator('.inline-detail').count()
                active_tab = page.locator('[data-tab][aria-selected="true"]').get_attribute('data-tab')
                new_errs = expect_no_new_errors(global_errors, errs_before)
                if (panel_visible == 1 and detail_visible > 0
                        and active_tab == 'bestand' and not new_errs):
                    results.append(("OK", "click:chronik-source       ",
                                    "oeffnet Belege und dann Bestand, 0 Konsole"))
                else:
                    results.append(("FAIL", "click:chronik-source       ",
                                    f"panel={panel_visible}, detail={detail_visible}, "
                                    f"tab={active_tab}, errs={len(new_errs)}"))
                    for e in new_errs[:2]:
                        results.append(("  ", " " * 24, e[:120]))
            else:
                results.append(("FAIL", "click:chronik-source       ",
                                "kein Quelldokument in der Chronik gefunden"))
        except Exception as e:
            results.append(("FAIL", "chronik:timeline          ", str(e)[:120]))

        # --- Canary Chronik: entity and lane compression resolve to evidence.
        try:
            page.locator('[data-tab="chronik"]').first.click()
            page.wait_for_timeout(300)
            entities = page.locator('#tab-chronik .chronik-entity')
            if entities.count() > 0:
                errs_before = len(global_errors)
                entities.first.click()
                page.wait_for_timeout(200)
                evidence = page.locator('#tab-chronik .chronik-evidence')
                evidence_sources = evidence.locator('.chronik-evidence__source')
                new_errs = expect_no_new_errors(global_errors, errs_before)
                if evidence.count() == 1 and evidence_sources.count() > 0 and not new_errs:
                    results.append(("OK", "chronik:entity-evidence   ",
                                    f"{evidence_sources.count()} Beleglinks, 0 Konsole"))
                else:
                    results.append(("FAIL", "chronik:entity-evidence   ",
                                    f"Panel={evidence.count()}, Belege={evidence_sources.count()}, "
                                    f"errs={len(new_errs)}"))
            else:
                results.append(("FAIL", "chronik:entity-evidence   ",
                                "keine Entitaet in der Chronik gefunden"))

            more = page.locator('#tab-chronik .chronik-more')
            if more.count() > 0:
                lane = more.first.locator('xpath=..')
                before = lane.locator(':scope > .chronik-list > li').count()
                more.first.click()
                after_main = lane.locator(':scope > .chronik-list > li').count()
                after_detail = page.locator(
                    '#tab-chronik .chronik-detail-slot '
                    '.chronik-evidence > .chronik-list > li'
                ).count()
                if after_main == before and after_detail > before:
                    results.append(("OK", "chronik:lane-more         ",
                                    f"{before} in Lane, {after_detail} rechts vollstaendig"))
                else:
                    results.append(("FAIL", "chronik:lane-more         ",
                                    f"vorher={before}, Hauptlane={after_main}, "
                                    f"Detail={after_detail}"))
            else:
                results.append(("FAIL", "chronik:lane-more         ",
                                "keine verdichtete Lane mit Mehr-Schalter gefunden"))
        except Exception as e:
            results.append(("FAIL", "chronik:entity-evidence   ", str(e)[:120]))

        # --- Canary Karte: entitaetszentrierte D3-geo-Karte zeichnet nach dem
        #     asynchronen Geometrie-Load Stadt-Knoten (KEINE Verbindungslinien
        #     mehr). Der reine logStamp-Check faengt das nicht: der Stempel wird
        #     synchron beim Render geschrieben, also bevor `loadCountries()` die
        #     Knoten zeichnet. Dieser Canary wartet auf den Async-Draw und ist
        #     der harte Schutz davor, dass die Karte still leer rendert
        #     (fehlende Geometrie, d3-Ausfall, Projektions-Bug). Zusaetzlich:
        #     die Entitaets-Auswahl filtert die Knoten und wirft keine Fehler.
        try:
            page.locator('[data-tab="karte"]').first.click()
            errs_before = len(global_errors)
            # Knoten erscheinen erst nach dem fetch der Laendergeometrie.
            page.locator('#tab-karte .mob-nodes g.mob-node').first.wait_for(
                state="attached", timeout=8000)
            nodes_all = page.locator('#tab-karte .mob-nodes g.mob-node').count()
            arcs = page.locator('#tab-karte .mob-arcs path').count()
            land = page.locator('#tab-karte .mob-land path').count()

            # Eine konkrete Entitaet waehlen (Bayreuther Festspiele) und pruefen,
            # dass die Knotenmenge auf ihre Orte schrumpft. Die Wahl laeuft seit
            # dem Sidebar-Umbau ueber dasselbe Facetten-Muster wie jeder Filter.
            # Die view-eigene Sektion startet zugeklappt (E-240); ihr Feld ist
            # erst nach dem Aufklappen bedienbar.
            entity_head = page.locator('#tab-karte .vs-section',
                                       has_text="Entität").locator(
                '.vs-section__title--toggle').first
            if entity_head.get_attribute("aria-expanded") == "false":
                entity_head.click()
                page.wait_for_timeout(200)
            entity_facet = page.locator('#tab-karte .fs-facet[data-facet="entitaet"]')
            entity_facet.locator('.fs-search').fill("Bayreuther Festspiele")
            page.wait_for_timeout(200)
            picker = entity_facet.locator('.fs-option').count()
            nodes_entity = None
            target = entity_facet.locator('.fs-option').first
            if target.count() > 0:
                target.click()
                page.wait_for_timeout(400)
                nodes_entity = page.locator('#tab-karte .mob-nodes g.mob-node').count()
            new_errs = expect_no_new_errors(global_errors, errs_before)
            # Erwartung: Gesamt-Geografie mit mehreren Knoten, KEINE Pfeile, eine
            # befuellte Entitaets-Auswahl, Laendergeometrie, Entitaetswahl
            # liefert Knoten, keine Konsolenfehler.
            ok = (nodes_all >= 1 and arcs == 0 and picker >= 1 and land >= 50
                  and (nodes_entity is None or nodes_entity >= 1) and not new_errs)
            if ok:
                results.append(("OK", "karte:render               ",
                                f"{nodes_all} Knoten (Malaniuk), 0 Linien, {picker} Vorschlaege, "
                                f"Bayreuther Festspiele -> {nodes_entity} Orte, {land} Laender"))
            else:
                results.append(("FAIL", "karte:render               ",
                                f"Knoten={nodes_all}, Linien={arcs}, Vorschlaege={picker}, "
                                f"Entitaet-Knoten={nodes_entity}, Laender={land}, errs={len(new_errs)}"))
                for e in new_errs[:2]:
                    results.append(("  ", " " * 24, e[:120]))
        except Exception as e:
            results.append(("FAIL", "karte:render               ",
                            f"Karte nicht gezeichnet: {str(e)[:90]}"))

        # --- Canary M4: geteilter Cross-View-Filter
        #     (architecture.md § Cross-View-Filter). Im
        #     Netzwerk-Graph Ort=Bayreuth setzen -> der Graph fokussiert
        #     Bayreuth (Stempel ort:Bayreuth) UND der bereits gerenderte Bestand
        #     filtert synchron auf die Bayreuth-Records (Stempel gefiltert:ja).
        #     Harter Schutz fuer die Synchronitaet ueber den geteilten filter-state.
        #     Der Ort steht seit dem Sidebar-Umbau als Facette in der linken
        #     Spalte: Suchfeld eingrenzen, dann den Wert anklicken.
        try:
            page.locator('[data-tab="netzwerk"]').first.click()
            page.wait_for_timeout(500)
            errs_before = len(global_errors)
            ort_facet = page.locator('#tab-netzwerk .fs-facet[data-facet="ort"]')
            ort_facet.locator(".fs-search").fill("Bayreuth")
            page.wait_for_timeout(200)
            ort_facet.get_by_text("Bayreuth", exact=True).first.click()
            page.wait_for_timeout(500)
            vk_stamp = stamps.get('netzwerk', '')
            page.locator('[data-tab="bestand"]').first.click()
            page.wait_for_timeout(600)
            bestand_stamp = stamps.get('bestand', '')
            new_errs = expect_no_new_errors(global_errors, errs_before)
            if 'ort:Bayreuth' in vk_stamp and 'gefiltert:ja' in bestand_stamp and not new_errs:
                results.append(("OK", "m4:cross-view-filter        ",
                                f"Graph Ort=Bayreuth -> Bestand synchron gefiltert"))
            else:
                results.append(("FAIL", "m4:cross-view-filter        ",
                                f"vk={vk_stamp[-40:]!r} bestand={bestand_stamp[-40:]!r} "
                                f"errs={len(new_errs)}"))
                for e in new_errs[:2]:
                    results.append(("  ", " " * 24, e[:120]))
        except Exception as e:
            results.append(("WARN", "m4:cross-view-filter        ",
                            f"check uebersprungen: {e}"))

        # --- Canary: der Schnitt steht in der URL und ueberlebt den Reload.
        #     Hash-Grammatik #<tab>[/<recordId>][?<query>] (ui/filter-url.js).
        #     Ohne diesen Weg ist ein Befund nicht zitierbar: der geteilte Link
        #     oeffnet die Anwendung im vollen Bestand, ohne dass etwas darauf
        #     hinweist.
        try:
            errs_before = len(global_errors)
            hash_before = page.evaluate("() => window.location.hash")
            page.reload(wait_until="networkidle", timeout=20000)
            page.wait_for_timeout(800)
            hash_after = page.evaluate("() => window.location.hash")
            page.locator('[data-tab="netzwerk"]').first.click()
            page.wait_for_timeout(600)
            vk_after = stamps.get('netzwerk', '')
            new_errs = expect_no_new_errors(global_errors, errs_before)
            if ("ort=Bayreuth" in hash_before and "ort=Bayreuth" in hash_after
                    and "ort:Bayreuth" in vk_after and not new_errs):
                results.append(("OK", "filter:url-roundtrip        ",
                                "Ort im Hash, nach Reload weiterhin gefiltert"))
            else:
                results.append(("FAIL", "filter:url-roundtrip        ",
                                f"vorher={hash_before!r} nachher={hash_after!r} "
                                f"vk={vk_after[-40:]!r} errs={len(new_errs)}"))
                for e in new_errs[:2]:
                    results.append(("  ", " " * 24, e[:120]))
        except Exception as e:
            results.append(("WARN", "filter:url-roundtrip        ",
                            f"check uebersprungen: {e}"))

        # Reset des geteilten Filters: der Cross-View-Canary oben setzt
        # ort=Bayreuth, und der filter-state ueberlebt SPA-Navigation bewusst
        # (Persistenz). Ein voller Reload setzt den modul-lokalen State zurueck,
        # damit die folgenden Anker-Checks den ungefilterten Bestand sehen.
        page.goto(BASE_URL, wait_until="networkidle", timeout=10000)
        page.wait_for_timeout(400)

        # --- Anker-Titel: im DOM erreichbar? ---
        # Konvolute oeffnen geschlossen, nur das erste steht beim Eintreten offen
        # (user-story audit 2026-09-03). Also nur die geschlossenen Koepfe
        # anklicken, sonst schlaegt der Klick das erste wieder zu.
        try:
            page.locator('[data-tab="bestand"]').first.click()
            page.wait_for_timeout(400)
            heads = page.locator('#tab-bestand .archiv-row--konvolut')
            for i in range(heads.count()):
                head = heads.nth(i)
                if head.get_attribute("aria-expanded") == "true":
                    continue
                head.click()
                page.wait_for_timeout(60)
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
                has_zielort = "ZIELORT" in ort_text or "ABSENDUNG" in ort_text
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

        # --- Performance detail of NIM_022 1_1: full signature and title in
        #     the detail head, no close button or source rows, section titles
        #     without counts, performances below their run, stage role below
        #     its work (Projektleitung, 2026-09-04/05). ---
        try:
            page.goto(f"{BASE_URL}#bestand/m3gim-data:NIM_022_1_1",
                      wait_until="networkidle", timeout=10000)
            page.wait_for_timeout(1500)
            detail = page.locator(".inline-detail").first
            head = detail.locator(".inline-detail__head").first
            head_text = head.inner_text() if head.count() else ""
            in_header_head = detail.locator(
                ".inline-detail__header > .inline-detail__head").count()
            if ("NIM_022 1_1" in head_text and "Bayreuther Festspiele" in head_text
                    and in_header_head == 1):
                results.append(("OK", "anchor:NIM_022_1_1:kopfzeile     ",
                                "Signatur und vollständiger Titel im Detailkopf"))
            else:
                results.append(("FAIL", "anchor:NIM_022_1_1:kopfzeile     ",
                                f"Kopfzeile {head_text[:60]!r}, in-header={in_header_head}"))

            in_controls = detail.locator(".inline-detail__controls > .inline-detail__actions"
                                         " .inline-detail__action-btn").count()
            n_close = detail.locator(".inline-detail__close").count()
            n_source = detail.locator(".inline-detail__source").count()
            meta_text = detail.locator(".inline-detail__meta").first.inner_text()
            if (in_controls == 1 and n_close == 0 and n_source == 0
                    and "ERSCHLIESSUNG" in meta_text.upper()):
                results.append(("OK", "anchor:NIM_022_1_1:metazeile     ",
                                "nur Korb-Aktion, kein Schliessen, keine Quellzeilen"))
            else:
                results.append(("FAIL", "anchor:NIM_022_1_1:metazeile     ",
                                f"aktionen={in_controls}, close={n_close}, quelle={n_source}, "
                                f"meta={meta_text[:60]!r}"))

            titles = detail.locator(".inline-detail__section-title").all_inner_texts()
            with_count = [t for t in titles if "(" in t]
            weitere = detail.locator(
                ".inline-detail__section",
                has=page.locator(".inline-detail__section-title", has_text="Weitere")
            ).first
            weitere_mark = weitere.locator(".fam-mark").count() if weitere.count() else -1
            if not with_count and weitere_mark == 0:
                results.append(("OK", "anchor:NIM_022_1_1:blocktitel    ",
                                "keine Zahl im Titel, Weitere ohne Familienmarker"))
            else:
                results.append(("FAIL", "anchor:NIM_022_1_1:blocktitel    ",
                                f"mit-zahl={with_count}, weitere-marker={weitere_mark}"))

            dates = detail.locator(".chip-group .chip-date")
            n_dates = dates.count()
            first_date = dates.first.inner_text() if n_dates else ""
            empty_dates = [value for value in dates.all_inner_texts() if not value.strip()]
            if n_dates == 14 and first_date.startswith("23.") and not empty_dates:
                results.append(("OK", "anchor:NIM_022_1_1:spielzeit     ",
                                "14 Auffuehrungen datumssortiert unter der Spielzeit"))
            else:
                results.append(("FAIL", "anchor:NIM_022_1_1:spielzeit     ",
                                f"daten={n_dates}, erstes={first_date!r}, leer={empty_dates}"))

            rheingold = detail.locator(".chip-group", has_text="Das Rheingold").first
            sub = rheingold.locator(".chip-group__sub").inner_text() if rheingold.count() else ""
            role_chip = rheingold.locator(
                ".chip-group__sub .chip--role-pair", has_text="Fricka").count()
            if "Fricka" in sub and role_chip > 0:
                results.append(("OK", "anchor:NIM_022_1_1:rolle-am-werk ",
                                "Fricka als Rollenwert unter Das Rheingold"))
            else:
                results.append(("FAIL", "anchor:NIM_022_1_1:rolle-am-werk ",
                                f"sub={sub[:60]!r}, rollenchips={role_chip}"))
        except Exception as e:
            results.append(("WARN", "anchor:NIM_022_1_1               ",
                            f"check uebersprungen: {e}"))

        # --- Typ-Chips des eingeklappten Konvolut-Kopfs: inline neben dem Titel
        #     in derselben Titelzeile, der Erschliessungsstand ausschliesslich
        #     im Kopf-Tooltip (E-181). ---
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=10000)
            page.wait_for_timeout(800)
            page.locator('[data-tab="bestand"]').first.click()
            page.wait_for_timeout(400)
            chips = page.locator(
                ".archiv-row--konvolut .archiv-titel-zeile"
                " .archiv-konvolut-meta .chip--compact").count()
            row_text = " ".join(page.locator(".archiv-row--konvolut").all_inner_texts())
            stand_in_zeile = "Erschließungsstand" in row_text
            heads = page.locator(".archiv-row--konvolut .archiv-titel")
            tips = [heads.nth(i).get_attribute("data-tip") or ""
                    for i in range(heads.count())]
            status_in_tip = any("Erschließungsstand:" in tip for tip in tips)
            if chips > 0 and not stand_in_zeile and status_in_tip:
                results.append(("OK", "konvolut-meta-chips              ",
                                f"{chips} Typ-Chips inline am Titel, "
                                f"Stand im Kopf-Tooltip"))
            else:
                results.append(("FAIL", "konvolut-meta-chips              ",
                                f"chips={chips}, stand-in-zeile={stand_in_zeile}, "
                                f"stand-im-tooltip={status_in_tip}"))
        except Exception as e:
            results.append(("WARN", "konvolut-meta-chips              ",
                            f"check uebersprungen: {e}"))

        # --- Land als geteilte Facette (F1, loest die karteneigene
        #     Laender-Reichweite ab): sie startet zugeklappt und ohne Chip,
        #     fuehrt ihre Werte als Zeilen mit Zahl, und eine Wahl verengt den
        #     Bestand und erscheint als Chip. Der Erschliessungsstand ist mit
        #     E-262 aus Spalte und Statistik heraus. ---
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=10000)
            page.wait_for_timeout(600)
            page.locator('[data-tab="bestand"]').first.click()
            page.wait_for_timeout(400)
            gone = page.locator('#tab-bestand .vs-section',
                                has_text="Erschließungsstand").count()
            facet = page.locator('#tab-bestand .vs-section',
                                 has_text="Land").first
            head = facet.locator('.vs-section__title--toggle')
            folded_start = head.get_attribute("aria-expanded") == "false"
            head.click()
            page.wait_for_timeout(300)
            facet_rows = facet.locator('.fs-option').count()
            # Gegen die Ergebniszeile gemessen und nicht gegen die Tabellen-
            # zeilen: ein Schnitt flacht die Konvolut-Hierarchie auf und zeigt
            # dann mehr Zeilen als der zugeklappte Start.
            root = page.locator('#tab-bestand .vs-status__count .fs-option__count')
            docs_start = root.inner_text().strip()
            facet.locator('.fs-option').first.click()
            page.wait_for_timeout(400)
            docs_cut = root.inner_text().strip()
            group = page.locator('#tab-bestand .filter-strip .filter-strip__group',
                                 has_text="Land")
            chips_cut = group.locator('.fs-chip').count()
            cut_smaller = " von " in docs_cut and docs_cut != docs_start
            if (gone == 0 and folded_start and facet_rows >= 8
                    and chips_cut == 1 and cut_smaller):
                results.append(("OK", "bestand:land-facette             ",
                                f"zugeklappt, {facet_rows} Laender, eine Wahl -> "
                                f"Dokumente {docs_cut} statt {docs_start} mit Chip"))
            else:
                results.append(("FAIL", "bestand:land-facette             ",
                                f"erschliessungsstand={gone}, zugeklappt={folded_start}, "
                                f"laender={facet_rows}, start={docs_start}, "
                                f"gewaehlt={docs_cut}, chips={chips_cut}"))
        except Exception as e:
            results.append(("WARN", "bestand:land-facette             ",
                            f"check uebersprungen: {e}"))

        # --- Datenstand in jeder Ansicht (F6): die Ergebniszeile der Spalte
        #     traegt ihn im Tooltip, an derselben Stelle und in derselben Form. ---
        try:
            missing = []
            for tab in TABS:
                page.locator(f'[data-tab="{tab}"]').first.click()
                page.wait_for_timeout(400)
                tip = page.locator(f'#tab-{tab} .vs-status__count').first
                if tip.count() == 0:
                    continue
                value = tip.get_attribute("data-tip") or ""
                if "Datenstand" not in value:
                    missing.append(tab)
            if missing:
                results.append(("FAIL", "sidebar:datenstand               ",
                                f"ohne Datenstand: {', '.join(missing)}"))
            else:
                results.append(("OK", "sidebar:datenstand               ",
                                "jede Ansicht nennt ihn im Tooltip der Ergebniszeile"))
        except Exception as e:
            results.append(("WARN", "sidebar:datenstand               ",
                            f"check uebersprungen: {e}"))

        # --- Konvolut aufklappen parkt den Kopf unter dem Spaltenkopf
        #     (Projektleitung, 2026-09-04). Der Kopf haftet erst nach dem
        #     Scrollen; misst man gegen `thead` statt gegen ein `th`, liest man
        #     die weggescrollte Box, denn sticky sitzt auf den Zellen. Toleranz
        #     2 px fuer Subpixel-Zeilenhoehen. ---
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=10000)
            page.wait_for_timeout(600)
            page.locator('[data-tab="bestand"]').first.click()
            page.wait_for_timeout(500)
            heads = page.locator('#tab-bestand .archiv-row--konvolut')
            target = None
            for i in range(heads.count()):
                if heads.nth(i).get_attribute("aria-expanded") == "false":
                    target = heads.nth(i)
                    break
            if target is None:
                results.append(("WARN", "bestand:scroll-unter-kopf        ",
                                "kein geschlossenes Konvolut gefunden"))
            else:
                kid = target.get_attribute("data-konvolut-header")
                errs_before = len(global_errors)
                target.locator(".archiv-chevron").click()
                page.evaluate(SCROLL_SETTLED)
                page.wait_for_timeout(150)
                delta = page.evaluate(HEAD_OFFSET, kid)
                new_errs = expect_no_new_errors(global_errors, errs_before)
                if delta is not None and abs(delta) <= 2 and not new_errs:
                    results.append(("OK", "bestand:scroll-unter-kopf        ",
                                    f"Kopf {delta:+.2f} px unter dem Spaltenkopf"))
                else:
                    results.append(("FAIL", "bestand:scroll-unter-kopf        ",
                                    f"Versatz={delta}, errs={len(new_errs)}"))
                    for e in new_errs[:2]:
                        results.append(("  ", " " * 24, e[:120]))
        except Exception as e:
            results.append(("WARN", "bestand:scroll-unter-kopf        ",
                            f"check uebersprungen: {e}"))

        # --- Neutraler Filterstreifen traegt den Platzhalter statt einer leeren
        #     Zeile. Designregel 8 ist hier bewusst ausgesetzt (Projektleitung,
        #     2026-09-04): kein Chip, kein Knopf, eine ruhige Zeile. ---
        try:
            reset = page.locator('#tab-bestand .vs-status__reset')
            if reset.count():
                reset.click()
            page.wait_for_timeout(500)
            hint = page.locator('#tab-bestand .filter-strip__empty')
            chips = page.locator('#tab-bestand .filter-strip .fs-chip').count()
            text = hint.inner_text() if hint.count() else ""
            tip = hint.get_attribute("data-tip") if hint.count() else ""
            glyph = page.locator('#tab-bestand .filter-strip__empty svg').count()
            is_button = page.locator('#tab-bestand button.filter-strip__empty').count()
            if (hint.count() == 1 and chips == 0 and text.strip() == "kein Filter aktiv"
                    and glyph == 1 and tip and is_button == 0):
                results.append(("OK", "bestand:filterstreifen-leer      ",
                                "Platzhalter mit Zeichen und Tooltip, kein Knopf"))
            else:
                results.append(("FAIL", "bestand:filterstreifen-leer      ",
                                f"hint={hint.count()}, chips={chips}, text={text!r}, "
                                f"glyph={glyph}, button={is_button}, tip={bool(tip)}"))
        except Exception as e:
            results.append(("WARN", "bestand:filterstreifen-leer      ",
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
                                    f"{d['id']} (known, siehe data.md § Datenqualität)"))
            else:
                results.append(("OK", "graph:duplicate-@id             ",
                                "keine kollidierenden @ids im Graph"))
        except Exception as e:
            results.append(("WARN", "graph:duplicate-@id   ",
                            f"check uebersprungen: {e}"))

        for error in global_errors:
            results.append(("FAIL", "browser:console", error))
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
    return 0 if n_fail == 0 and n_warn == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
