"""Ad-hoc: zeigt, was der Bestand-Tab in beiden Modi rendert + Store-Datenlage.
Server muss laufen: python -m http.server 8765 --directory docs"""
import json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8765/"
OUT = "reports/screens"

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1500, "height": 1000})
    pg.goto(BASE, wait_until="networkidle", timeout=15000)
    pg.wait_for_timeout(900)
    pg.locator('[data-tab="bestand"]').first.click()
    pg.wait_for_timeout(500)

    def count_text():
        for sel in ['#tab-bestand .archiv-count', '#tab-bestand [class*="count"]',
                    '#tab-bestand .archiv-toolbar']:
            loc = pg.locator(sel).first
            if loc.count() and loc.inner_text().strip():
                return loc.inner_text().strip().replace("\n", " | ")
        return "(kein count-Element gefunden)"

    rows_default = pg.locator('#tab-bestand tbody tr').count()
    txt_default = count_text()
    pg.screenshot(path=f"{OUT}/demo-bestand-default.png", full_page=False)

    pg.locator('#tab-bestand .archiv-toggle__input').first.check()
    pg.wait_for_timeout(700)
    rows_all = pg.locator('#tab-bestand tbody tr').count()
    un_all = pg.locator('#tab-bestand .archiv-row--unerschlossen').count()
    txt_all = count_text()
    pg.screenshot(path=f"{OUT}/demo-bestand-alle.png", full_page=False)

    # Store-/JSON-LD-Datenlage: Gesamtbestand und scope-ausgeschlossene Typen.
    info = pg.evaluate("""async () => {
      const res = await fetch('/data/m3gim.jsonld');
      const data = await res.json();
      const g = data['@graph'] || data;
      const recs = g.filter(n => n['m3gim:xlsxSource'] !== undefined);
      const byType = {};
      for (const r of recs) {
        let t = r['rico:hasDocumentaryFormType'] || r['m3gim:documentaryFormType'] || 'unbekannt';
        if (t && t['@id']) t = t['@id'];
        t = String(t).split('#').pop();
        byType[t] = (byType[t]||0)+1;
      }
      const store = (window.m3gim && window.m3gim.store) ? Object.keys(window.m3gim.store) : [];
      return { totalRecords: recs.length, byType, storeKeys: store };
    }""")

    print(json.dumps({
        "rows_default": rows_default, "count_default": txt_default,
        "rows_all": rows_all, "unerschlossen_all": un_all, "count_all": txt_all,
        "store": info,
    }, ensure_ascii=False, indent=2))
    b.close()
