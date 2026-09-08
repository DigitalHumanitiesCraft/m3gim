"""Die Registerseite der Indizes im Browser (E-226, E-227, E-230).

Marker: @pytest.mark.frontend — laeuft nur mit ``pytest -m frontend`` und nur,
wenn Playwright installiert ist.

Geprueft wird, was sich ohne Browser nicht pruefen laesst: dass genau ein
Register steht und im Menue des Indizes-Tabs gewaehlt wird, dass die Kopfzeile
der Liste das Register und die Sortierung fuehrt, dass die Liste keine
Spaltenkoepfe mehr fuehrt und alle zugeklappten Eintraege dieselbe Hoehe haben,
dass der Eintrag mit der Tastatur aufgeht, dass der Name die Zeile auf- und
zuklappt statt die Ansicht zu wechseln, dass der Weg in den Bestand allein an
der Dokumentpille haengt und schon in ihrem href steht (Mittel- und Strg-Klick,
E-252) und dass Registerwahl und Adresszeile dieselbe Sache sagen.
"""

import re

import pytest

# Browser stack is an optional extra; skip instead of failing the default run.
pytest.importorskip("playwright")

# frontend_server kommt aus tests/frontend/conftest.py


@pytest.fixture
def page(frontend_server, browser_context):
    pg = browser_context.new_page()
    pg.set_viewport_size({"width": 1440, "height": 900})
    pg.base_url = frontend_server
    yield pg


def _open(page, hash_part):
    page.goto(page.base_url + hash_part, wait_until="networkidle", timeout=20000)
    page.wait_for_selector("#tab-indizes .idx-grid", timeout=10000)


@pytest.mark.frontend
def test_ein_register_und_tastaturbedienung(page):
    _open(page, "#indizes/personen")

    grids = page.locator("#tab-indizes .idx-grid")
    assert grids.count() == 1, "Die Seite zeigt genau ein Register (E-226)."
    assert page.locator(
        "#tab-indizes .idx-head__label").inner_text() == "Personen"

    # The native entry button owns detail selection; row links remain independent.
    row = page.locator("#tab-indizes .idx-item").first
    entry = row.locator(".idx-entry")
    assert entry.evaluate("el => el.tagName") == "BUTTON"
    assert entry.get_attribute("aria-expanded") == "false"
    assert page.locator("#tab-indizes .idx-item .idx-chevron").count() > 0
    entry.focus()
    page.keyboard.press("Enter")
    page.wait_for_selector("#tab-indizes .idx-detail", timeout=5000)
    open_row = page.locator("#tab-indizes .idx-item--expanded").first
    assert open_row.locator(".idx-entry").get_attribute("aria-expanded") == "true"
    detail_id = open_row.locator(".idx-entry").get_attribute("aria-controls")
    assert detail_id and page.locator(f"#{detail_id}").count() == 1

    page.keyboard.press("Escape")
    page.wait_for_selector("#tab-indizes .idx-detail", state="detached", timeout=5000)
    assert page.evaluate(
        "document.activeElement && document.activeElement.classList.contains('idx-entry')"
    ), "Escape laesst den Fokus auf der Zeile stehen."



@pytest.mark.frontend
def test_der_name_klappt_auf_die_pille_fuehrt_in_den_bestand(page):
    """Ein Element, eine Funktion (Projektleitung, 2026-09-05).

    Der Name teilt die Funktion der Zeile und klappt den Eintrag auf; in den
    Bestand fuehrt allein die Dokumentpille, die den Eintrag als Hub bedient
    (E-252).
    """
    _open(page, "#indizes/personen")
    row = page.locator("#tab-indizes .idx-item").first
    name = row.locator(".idx-name")
    pill = row.locator(".idx-doclink")

    # Der Name traegt kein eigenes Ziel und keinen Tooltip, der eines behauptet.
    assert name.get_attribute("href") is None
    assert name.get_attribute("data-tip") is None
    assert name.evaluate("e => e.tagName") == "SPAN"

    # Mittel- und Strg-Klick lesen nur das href; ohne die Facette darin
    # oeffnete sich der ungefilterte Bestand.
    href = pill.get_attribute("href")
    assert href.startswith("#bestand"), href
    assert "person=" in href, href

    # Die Belegzahl ist die Handlung der Zeile: Zeichen, Einheitswort, Pfeil.
    label = pill.locator(".idx-doclink__label").inner_text().strip()
    m = re.fullmatch(r"(\d+) Dokumente?", label)
    assert m, label
    erwartet = (f"Diese {m.group(1)} Dokument{'' if m.group(1) == '1' else 'e'} "
                "im Bestand öffnen")
    assert pill.get_attribute("data-tip") == erwartet
    assert pill.get_attribute("aria-label") == erwartet
    assert pill.locator(".idx-doclink__icon svg").count() == 1
    assert pill.locator(".idx-doclink__arrow").inner_text().strip() == "→"
    # Die nackte Zahl am rechten Rand ist entfallen.
    assert page.locator("#tab-indizes .idx-item__count").count() == 0

    # Der Netzwerksprung steht als erster der Sprungknoepfe; ob die Karte
    # daneben steht, entscheidet der verortete Beleg (eigener Test).
    net = row.locator(".idx-jump--row").first
    assert net.get_attribute("data-tip").endswith("im Netzwerk öffnen")

    # Der Klick auf den Namen klappt auf und laesst die Ansicht stehen.
    name.click()
    page.wait_for_selector("#tab-indizes .idx-detail", timeout=5000)
    offen = page.locator("#tab-indizes .idx-item--expanded").first
    assert offen.locator(".idx-entry").get_attribute("aria-expanded") == "true"
    assert "#indizes" in page.url and "#bestand" not in page.url, page.url
    # und derselbe Klick wieder zu.
    offen.locator(".idx-name").click()
    page.wait_for_selector("#tab-indizes .idx-detail", state="detached", timeout=5000)
    assert page.locator("#tab-indizes .idx-item--expanded").count() == 0

    # In den gefilterten Bestand fuehrt die Dokumentpille.
    pill.click()
    page.wait_for_url(re.compile(r"#bestand\?.*person="))
    assert "#bestand" in page.url, page.url
    assert "person=" in page.url, page.url
    root = page.locator("#tab-bestand .vs-status__count").inner_text()
    assert re.search(r"\d", root), root


@pytest.mark.frontend
def test_der_eintrag_listet_keine_dokumente_mehr(page):
    """Kein Dokumentenblock im aufgeklappten Eintrag (E-252)."""
    _open(page, "#indizes/personen")
    page.locator("#tab-indizes .idx-item").first.click()
    page.wait_for_selector("#tab-indizes .idx-detail", timeout=5000)
    for gone in (".idx-detail__records", ".idx-detail-record",
                 ".idx-detail__show-all", ".idx-detail__header"):
        assert page.locator(f"#tab-indizes {gone}").count() == 0, gone

    page.locator('.detail-disclosure > summary', has_text='Im selben Dokument genannt').click()
    # Each family initially shows five entries; its remainder expands in place.
    groups = page.locator("#tab-indizes .idx-umfeld__group")
    assert groups.count() > 0
    for i in range(groups.count()):
        chips = groups.nth(i).locator(
            ".idx-umfeld__chips > .chip").count()
        assert chips <= 5, f"Gruppe {i} zeigt {chips} Chips"
    # Der Gruppentitel ist eine Ueberschrift, kein Link: keine Unterlinie.
    labels = page.locator("#tab-indizes .idx-umfeld__label")
    assert labels.count() > 0
    for i in range(labels.count()):
        el = labels.nth(i)
        assert "mark-derived" not in (el.get_attribute("class") or "")
        deco = el.evaluate(
            "e => getComputedStyle(e).textDecorationLine")
        assert deco == "none", deco

    more = page.locator("#tab-indizes .idx-umfeld__more").first
    if more.count() > 0:
        original_url = page.url
        remainder = page.locator("#" + more.get_attribute("aria-controls"))
        assert not remainder.is_visible()
        more.click()
        assert more.get_attribute("aria-expanded") == "true"
        assert remainder.is_visible()
        assert remainder.locator(".chip").count() > 0
        assert page.url == original_url
        more.click()
        assert not remainder.is_visible()


@pytest.mark.frontend
def test_jedes_register_zeigt_seine_rollen_und_seine_spanne(page):
    """Rollenzeile aus der Verknuepfungsart, Zeitspanne in jeder Zeile (E-252)."""
    # Person, Ort und Institution fuehren Rollen an ihren Verknuepfungen; das
    # Werk fuehrt keine, dort faellt die Zeile weg statt leer zu stehen.
    for register in ("personen", "orte", "organisationen"):
        _open(page, f"#indizes/{register}")
        page.locator("#tab-indizes .idx-item").first.click()
        page.wait_for_selector("#tab-indizes .idx-detail", timeout=5000)
        rollen = page.locator("#tab-indizes .idx-detail .idx-rollen .chip")
        assert rollen.count() > 0, register
        first = rollen.first
        assert first.locator(".chip-rolle").inner_text().strip() != ""
        assert re.fullmatch(r"\d+", first.locator(".chip-wert").inner_text().strip())

    for register in ("personen", "organisationen", "orte", "werke"):
        _open(page, f"#indizes/{register}")
        spans = [t.strip() for t in page.eval_on_selector_all(
            "#tab-indizes .idx-item__span", "els => els.map(e => e.textContent)")]
        assert spans, register
        gesetzt = [t for t in spans if t]
        assert gesetzt, f"{register} zeigt keine einzige Zeitspanne"
        for text in gesetzt[:10]:
            assert re.fullmatch(r"\d{4}(–\d{4})?", text), (register, text)


@pytest.mark.frontend
def test_registerwechsel_und_direkter_einstieg(page):
    _open(page, "#indizes/personen")
    # Das Register wird seit E-230 im Menue des Indizes-Tabs gewaehlt, weder in
    # der Sidebar noch in einer Kopfleiste der Arbeitsflaeche.
    assert page.locator(".view-sidebar .idx-register-choice").count() == 0
    assert page.locator("#tab-indizes .idx-chooser").count() == 0

    tab = page.locator("#btn-indizes")
    assert tab.get_attribute("aria-haspopup") == "menu"
    assert tab.get_attribute("aria-expanded") == "false"
    menu = page.locator("#indizes-register-menu")
    assert menu.get_attribute("role") == "menu"
    items = menu.locator("[role='menuitemradio']")
    assert items.count() == 4
    assert [i.inner_text().strip() for i in items.all()] == [
        "Personen", "Organisationen", "Orte", "Werke"]

    # Der aktive Tab klappt das Menue auf, Escape schliesst es wieder.
    tab.click()
    page.wait_for_selector("#indizes-register-menu[role='menu']:not([hidden])",
                           timeout=5000)
    assert tab.get_attribute("aria-expanded") == "true"
    assert items.nth(0).get_attribute("aria-checked") == "true"
    page.keyboard.press("Escape")
    assert menu.is_hidden()

    tab.click()
    items.nth(2).click()         # Orte
    page.wait_for_url(re.compile(r"#indizes/orte"))
    assert menu.is_hidden(), "Die Wahl schliesst das Menue."
    assert "#indizes/orte" in page.url, page.url
    assert page.locator("#tab-indizes .idx-head__label").inner_text() == "Orte"

    # Ein geteilter Link auf ein Register oeffnet dieses Register direkt, und
    # das Menue nennt es als gewaehlt.
    _open(page, "#indizes/werke")
    assert page.locator("#tab-indizes .idx-head__label").inner_text() == "Werke"
    assert page.locator("#tab-indizes .idx-grid").count() == 1
    assert items.nth(3).get_attribute("aria-checked") == "true"


@pytest.mark.frontend
def test_sortierung_steht_im_kopf_der_liste(page):
    """Die Sortierung ordnet und schneidet nicht, sie steht ueber der Liste."""
    _open(page, "#indizes/personen")
    buttons = page.locator("#tab-indizes .idx-sort .idx-sort__btn")
    assert buttons.count() == 2
    # Seit 2026-09-05 tragen die beiden Knoepfe nur ihr Zeichen; der Name steht
    # im aria-label und im Tooltip (Regel 8).
    assert [b.inner_text().strip() for b in buttons.all()] == ["", ""]
    assert [b.get_attribute("aria-label") for b in buttons.all()] == [
        "Belegzahl", "Alphabetisch"]
    assert [b.get_attribute("data-tip") for b in buttons.all()] == [
        "Nach Belegzahl sortiert", "Alphabetisch sortiert"]
    assert buttons.nth(0).get_attribute("aria-pressed") == "true"

    def names():
        return page.eval_on_selector_all(
            "#tab-indizes .idx-item .idx-name", "els => els.map(e => e.textContent)")

    by_count = names()
    buttons.nth(1).click()
    page.wait_for_function(
        "document.querySelectorAll('.idx-sort__btn')[1]?.getAttribute('aria-pressed') === 'true'"
    )
    assert buttons.nth(1).get_attribute("aria-pressed") == "true"
    assert buttons.nth(0).get_attribute("aria-pressed") == "false"
    by_alpha = names()
    assert by_alpha != by_count, "Der Wechsel ordnet die Liste um."
    assert sorted(by_alpha) == sorted(by_count), "Die Sortierung schneidet nicht."

    # Die Normdaten-Schalter sind mit E-230 entfallen.
    assert "Wikidata" not in page.locator(".view-sidebar").inner_text()


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

    # Sichtbar steht nur die Zahl des Schnitts, das Paar liegt im Tooltip
    # (Projektleitung, 2026-09-05).
    head_count = page.locator("#tab-indizes .idx-head__count")
    assert re.fullmatch(r"\d+", head_count.inner_text()), head_count.inner_text()
    assert re.fullmatch(r"\d+ Einträge mit verknüpften Dokumenten",
                        head_count.get_attribute("data-tip")), head_count.get_attribute("data-tip")

    # Im Schnitt nennt der Tooltip beide Zahlen, sichtbar bleibt die des Schnitts.
    _open(page, "#indizes/personen?typ=biographical")
    head_count = page.locator("#tab-indizes .idx-head__count")
    shown = int(head_count.inner_text())
    tip = head_count.get_attribute("data-tip")
    m = re.fullmatch(
        r"(\d+) von (\d+) Einträgen, die übrigen liegen außerhalb des Filters", tip)
    assert m, tip
    assert int(m.group(1)) == shown < int(m.group(2))


@pytest.mark.frontend
def test_belegzahl_fuehrt_zu_den_exakten_quellbelegen(page):
    """A fixed source-backed person resolves to exactly its two records."""
    _open(page, "#indizes/personen")
    row = page.locator("#tab-indizes .idx-item", has_text="Klarwein, Franz").first
    pill = row.locator(".idx-doclink")
    assert pill.locator(".idx-doclink__label").inner_text().strip() == "2 Dokumente"
    pill.click()
    page.wait_for_url(re.compile(r"#bestand\?.*person=Klarwein"))
    rows = page.locator("#bestand-tbody tr[data-record-row]")
    rows.first.wait_for()
    assert sorted(rows.evaluate_all(
        "els => els.map(e => e.dataset.recordRow)"
    )) == ["m3gim-data:NIM_004_2", "m3gim-data:NIM_004_4"]


@pytest.mark.frontend
def test_jedes_zeichen_traegt_seinen_tooltip(page):
    """Regel 8: kein Zeichen ohne Tooltip, und keiner davon als natives title."""
    _open(page, "#indizes/orte")
    assert page.locator("#tab-indizes .idx-head__icon").get_attribute(
        "data-tip") == "Register Orte"
    for sel in (".idx-head__icon", ".idx-head__count", ".idx-sort__btn",
                ".idx-doclink", ".idx-jump--row", ".idx-wd-link"):
        marks = page.locator(f"#tab-indizes {sel}")
        assert marks.count() > 0, sel
        for mark in marks.all()[:5]:
            assert mark.get_attribute("data-tip"), sel
            assert mark.get_attribute("title") is None, sel

    # Der Name ist Text, kein Zeichen: er sagt sich selbst und traegt deshalb
    # keinen Tooltip, seit er auch kein zweites Ziel mehr hat.
    for mark in page.locator("#tab-indizes .idx-name").all()[:5]:
        assert mark.get_attribute("data-tip") is None
        assert mark.get_attribute("title") is None

    wd = page.locator("#tab-indizes .idx-wd-link").first
    assert re.fullmatch(r"Wikidata Q\d+", wd.get_attribute("data-tip"))
    assert wd.get_attribute("href").startswith("https://www.wikidata.org/entity/Q")
    # Die Marke steht auf der Hoehe der Ziffern, nicht ueber der Zeile.
    box = wd.locator("svg").bounding_box()
    assert round(box["height"]) <= 10, box


@pytest.mark.frontend
def test_werke_bieten_den_sprung_auf_die_karte(page):
    """Die Karte waehlt seit dem Werk-Knoten auch Werke als Entitaet."""
    _open(page, "#indizes/werke")
    # Beide Spruenge stehen seit dem 2026-09-05 in der Zeile; der aufgeklappte
    # Eintrag traegt keine freischwebende Aktionszeile mehr.
    assert page.locator("#tab-indizes .idx-detail__actions").count() == 0

    def jumps(name):
        row = page.locator("#tab-indizes .idx-item", has_text=name).first
        return row.locator(".idx-jump--row").evaluate_all(
            "els => els.map(e => e.getAttribute('aria-label'))")

    assert jumps("Tristan und Isolde") == [
        "Umgebung von Tristan und Isolde im Netzwerk öffnen",
        "Nach Tristan und Isolde filtern und Karte öffnen",
    ]

    # The shipped graph carries located evidence for La Gioconda in Italy.
    assert jumps("La Gioconda") == [
        "Umgebung von La Gioconda im Netzwerk öffnen",
        "Nach La Gioconda filtern und Karte öffnen"]

    # Das Ortsregister bietet ihn nie, dort waere er der Ort auf sich selbst.
    _open(page, "#indizes/orte")
    labels = page.eval_on_selector_all(
        "#tab-indizes .idx-jump--row",
        "els => els.map(e => e.getAttribute('aria-label'))")
    assert labels and all(l.endswith("im Netzwerk öffnen") for l in labels)
