"""Die Registerseite der Indizes im Browser (E-226, E-227).

Marker: @pytest.mark.frontend — laeuft nur mit ``pytest -m frontend`` und nur,
wenn Playwright installiert ist.

Geprueft wird, was sich ohne Browser nicht pruefen laesst: dass genau ein
Register steht und im Kopf gewaehlt wird, dass die Liste keine Spaltenkoepfe
mehr fuehrt und alle zugeklappten Eintraege dieselbe Hoehe haben, dass der
Eintrag mit der Tastatur aufgeht, dass der Weg in den Bestand schon im href
steht (Mittel- und Strg-Klick) und dass Registerwahl und Adresszeile dieselbe
Sache sagen.
"""

import re

import pytest

# Browser stack is an optional extra; skip instead of failing the default run.
pytest.importorskip("playwright")

from playwright.sync_api import sync_playwright

# frontend_server kommt aus tests/frontend/conftest.py


@pytest.fixture
def page(frontend_server):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        pg = context.new_page()
        pg.console_errors = []
        pg.on("console", lambda m: pg.console_errors.append(m.text)
              if m.type == "error" else None)
        pg.on("pageerror", lambda e: pg.console_errors.append(str(e)))
        pg.base_url = frontend_server
        yield pg
        browser.close()


def _open(page, hash_part):
    page.goto(page.base_url + hash_part, wait_until="networkidle", timeout=20000)
    page.wait_for_selector("#tab-indizes .idx-grid", timeout=10000)


@pytest.mark.frontend
def test_ein_register_und_tastaturbedienung(page):
    _open(page, "#indizes/personen")

    grids = page.locator("#tab-indizes .idx-grid")
    assert grids.count() == 1, "Die Seite zeigt genau ein Register (E-226)."
    assert page.locator(
        "#tab-indizes .idx-seg--on .idx-seg__label").inner_text() == "Personen"

    # Die erste Zeile geht mit der Tastatur auf: der Name ist ein echtes
    # Bedienelement, Enter klappt auf, Escape schliesst wieder.
    name = page.locator("#tab-indizes .idx-item .idx-name").first
    assert name.evaluate("el => el.tagName") == "BUTTON"
    assert name.get_attribute("aria-expanded") == "false"
    name.focus()
    page.keyboard.press("Enter")
    page.wait_for_selector("#tab-indizes .idx-detail", timeout=5000)
    open_name = page.locator("#tab-indizes .idx-item--expanded .idx-name").first
    assert open_name.get_attribute("aria-expanded") == "true"
    detail_id = open_name.get_attribute("aria-controls")
    assert detail_id and page.locator(f"#{detail_id}").count() == 1

    page.keyboard.press("Escape")
    page.wait_for_selector("#tab-indizes .idx-detail", state="detached", timeout=5000)
    assert page.evaluate(
        "document.activeElement && document.activeElement.classList.contains('idx-name')"
    ), "Escape laesst den Fokus auf dem Namen stehen."

    assert not page.console_errors, page.console_errors


@pytest.mark.frontend
def test_archivlink_traegt_die_facette_im_href(page):
    _open(page, "#indizes/personen")
    page.locator("#tab-indizes .idx-item .idx-name").first.click()
    link = page.locator("#tab-indizes .idx-detail__show-all a").first
    href = link.get_attribute("href")
    # Mittel- und Strg-Klick lesen nur das href; ohne die Facette darin
    # oeffnete sich der ungefilterte Bestand.
    assert href.startswith("#bestand"), href
    assert "person=" in href, href


@pytest.mark.frontend
def test_registerwechsel_und_direkter_einstieg(page):
    _open(page, "#indizes/personen")
    # Der Waehler steht im Kopf des Registers, nicht mehr in der Sidebar
    # (E-227), und traegt das Tablist-Muster mit Roving Tabindex.
    assert page.locator(".view-sidebar .idx-register-choice").count() == 0
    segs = page.locator("#tab-indizes .idx-chooser[role='tablist'] .idx-seg")
    assert segs.count() == 4
    assert [s.get_attribute("tabindex") for s in segs.all()] == ["0", "-1", "-1", "-1"]
    assert segs.first.get_attribute("aria-controls") == "idx-register-list"

    segs.nth(2).click()          # Orte
    page.wait_for_timeout(300)
    assert "#indizes/orte" in page.url, page.url
    assert page.locator(
        "#tab-indizes .idx-seg--on .idx-seg__label").inner_text() == "Orte"
    assert page.locator(
        "#tab-indizes .idx-seg--on").get_attribute("aria-selected") == "true"

    # Ein geteilter Link auf ein Register oeffnet dieses Register direkt.
    _open(page, "#indizes/werke")
    assert page.locator(
        "#tab-indizes .idx-seg--on .idx-seg__label").inner_text() == "Werke"
    assert page.locator("#tab-indizes .idx-grid").count() == 1
    assert not page.console_errors, page.console_errors


@pytest.mark.frontend
def test_liste_ohne_spaltenkoepfe_und_mit_einer_zeilenhoehe(page):
    """Liste statt Tabelle (E-227): keine Spaltenkoepfe, eine Zeilenhoehe."""
    _open(page, "#indizes/personen")
    assert page.locator("#tab-indizes thead").count() == 0
    assert page.locator("#tab-indizes .idx-colheaders").count() == 0

    heights = page.eval_on_selector_all(
        "#tab-indizes .idx-item",
        "els => els.map(e => Math.round(e.getBoundingClientRect().height))",
    )
    assert len(heights) > 20, "Ohne Eintraege prueft der Test nichts."
    assert len(set(heights)) == 1, f"Zugeklappte Eintraege verschiedener Hoehe: {sorted(set(heights))}"

    # Die Kopfzahl nennt den Schnitt und den Gesamtstand des Registers.
    count = page.locator("#tab-indizes .idx-seg--on .idx-seg__count").inner_text()
    assert re.fullmatch(r"\d+ von \d+", count), count


@pytest.mark.frontend
def test_belegzahl_stimmt_mit_der_sidebar_ueberein(page):
    """Die Zahl an der Zeile zaehlt im Schnitt, nicht im ganzen Teilnachlass."""
    _open(page, "#indizes/personen?typ=biographical")
    cut = int(re.search(
        r"(\d+)\s*$",
        page.locator(".vs-status__count .fs-option__count").inner_text().strip()).group(1))
    counts = [int(t) for t in page.eval_on_selector_all(
        "#tab-indizes .idx-item__count", "els => els.map(e => e.textContent)")]
    assert counts, "Der Schnitt fuehrt Eintraege."
    assert max(counts) <= cut, (
        f"Ein Eintrag zaehlt {max(counts)} Dokumente in einem Schnitt von {cut}.")
    tip = page.locator("#tab-indizes .idx-item__count").first.get_attribute("data-tip")
    assert re.fullmatch(r"\d+ von \d+ Dokumenten", tip), tip
    assert not page.console_errors, page.console_errors
