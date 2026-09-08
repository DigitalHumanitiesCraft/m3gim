"""Shared draft/commit search, source-bound controls and record context."""
import json
from urllib.parse import quote

import pytest
from playwright.sync_api import BrowserContext, expect

pytestmark = pytest.mark.frontend


def test_search_commit_undo_and_typed_collision(frontend_server: str, browser_context: BrowserContext) -> None:
    page = browser_context.new_page()
    page.goto(frontend_server + '#bestand')
    search = page.get_by_role('combobox', name='Suche', exact=True)
    expect(search).to_be_visible()
    before = page.url
    search.fill('Zürich')
    text_action = page.get_by_role('option', name='Nach „Zürich“ im Text suchen, 45 Dokumente', exact=True)
    expect(text_action).to_be_visible()
    expect(text_action).to_have_attribute('aria-selected', 'true')
    expect(page.get_by_role('option', name='Nach Ort Zürich filtern, 42 Dokumente', exact=True)).to_be_visible()
    assert page.url == before
    search.press('Enter')
    expect(page.locator('#tab-bestand .vs-status__count .fs-option__count')).to_have_text('45 von 188')
    page.get_by_role('button', name='Letzte Filteränderung rückgängig', exact=True).click()
    search.fill('Zürich')
    page.get_by_role('option', name='Nach Ort Zürich filtern, 42 Dokumente', exact=True).click()
    expect(page.locator('#tab-bestand .vs-status__count .fs-option__count')).to_have_text('42 von 188')
    page.get_by_role('button', name='Letzte Filteränderung rückgängig', exact=True).click()
    page.get_by_role('button', name='Letzte Filteränderung wiederholen', exact=True).click()
    expect(page.locator('#tab-bestand .vs-status__count .fs-option__count')).to_have_text('42 von 188')
    page.get_by_role('button', name='Alle Filter löschen', exact=True).click()
    search.fill('Bayreuth')
    expect(page.get_by_role('option', name='Nach Ort Bayreuth filtern, 49 Dokumente', exact=True)).to_be_visible()
    assert page.locator('.research-search__option[aria-label^="Nach Institution Bayreuth filtern,"]').count() == 1


def test_hover_does_not_change_enter_action(frontend_server: str, browser_context: BrowserContext) -> None:
    page = browser_context.new_page()
    page.goto(frontend_server + '#bestand')
    search = page.get_by_role('combobox', name='Suche', exact=True)
    search.fill('Zürich')
    hovered = page.get_by_role('option', name='Nach Ort Zürich filtern, 42 Dokumente', exact=True)
    active = page.get_by_role('option', name='Nach „Zürich“ im Text suchen, 45 Dokumente', exact=True)
    hovered.hover()
    expect(active).to_have_attribute('aria-selected', 'true')
    assert active.evaluate("el => getComputedStyle(el).boxShadow") != 'none'
    assert hovered.evaluate("el => getComputedStyle(el).boxShadow") == 'none'
    search.press('Enter')
    expect(page.locator('#tab-bestand .vs-status__count .fs-option__count')).to_have_text('45 von 188')
    expect(page.get_by_role('button', name='Text: „Zürich“', exact=False)).to_be_visible()


def test_implied_generic_link_chip_remains_editable(frontend_server: str, browser_context: BrowserContext) -> None:
    page = browser_context.new_page()
    page.goto(frontend_server + '#bestand?ort=Z%C3%BCrich&verknuepfung=ort')
    strip = page.locator('#tab-bestand .filter-strip')
    expect(strip.get_by_role('button', name='Ort: Zürich', exact=False)).to_be_visible()
    expect(strip.get_by_role('button', name='Verknüpfung: Ort', exact=False)).to_have_count(0)
    assert 'verknuepfung=ort' in page.url
    strip.get_by_role('button', name='Ort: Zürich', exact=False).click()
    expect(strip.get_by_role('button', name='Verknüpfung: Ort', exact=False)).to_be_visible()
    assert 'verknuepfung=ort' in page.url


@pytest.mark.parametrize('width', [390, 800, 1440])
def test_one_search_across_views_and_full_facet_values(frontend_server: str, browser_context: BrowserContext, width: int) -> None:
    page = browser_context.new_page()
    page.set_viewport_size({'width': width, 'height': 1000})
    page.goto(frontend_server + '#bestand')
    for view in ['bestand', 'chronik', 'karte', 'netzwerk', 'statistik']:
        page.locator(f'[data-tab="{view}"]').first.click()
        expect(page.locator('input[type="search"]:visible')).to_have_count(1)
        search = page.get_by_role('combobox', name='Suche', exact=True)
        search.fill('draft that must not cut')
        assert 'suche=' not in page.url
    for register in ['personen', 'organisationen', 'orte', 'werke']:
        page.evaluate("register => import('./js/ui/router.js').then(m => m.navigateToView('indizes', {register}))", register)
        expect(page.locator('input[type="search"]:visible')).to_have_count(1)
    page.locator('[data-tab="bestand"]').first.click()
    toggle = page.get_by_role('button', name='Filter ein- oder ausblenden')
    if toggle.get_attribute('aria-expanded') == 'false':
        toggle.click()
    section = page.locator('#tab-bestand .vs-section').filter(has=page.get_by_role('button', name='Person', exact=True))
    section.get_by_role('button', name='Person', exact=True).click()
    while section.get_by_role('button', name='Weitere anzeigen', exact=False).count():
        section.get_by_role('button', name='Weitere anzeigen', exact=False).click()
    assert section.locator('.fs-option').count() >= 500
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')


def test_bound_role_from_real_controls_has_no_false_zurich_performance(frontend_server: str, browser_context: BrowserContext) -> None:
    page = browser_context.new_page()
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.goto(frontend_server + '#bestand?ort=Z%C3%BCrich')
    tree = page.locator('#tab-bestand [data-facet="verknuepfung"]')
    group = tree.locator('.fs-option--group', has=page.locator('.fs-option__label', has_text='Ort')).filter(has_text='42').first
    group.get_by_role('button', name='Untertypen einblenden').click()
    role = tree.locator('.fs-option--child', has=page.locator('.fs-option__label', has_text='Auffuehrungsort')).first
    role.focus()
    role.press('Enter')
    expect(page.locator('#tab-bestand .vs-status__count .fs-option__count')).to_have_text('0 von 188')
    assert 'praedikat=' in page.url
    expect(page.locator('#tab-bestand .filter-strip')).to_contain_text('Zürich')
    expect(page.locator('#tab-bestand .filter-strip')).to_contain_text('Auffuehrungsort')
    page.reload()
    expect(page.locator('#tab-bestand .vs-status__count .fs-option__count')).to_have_text('0 von 188')


def test_source_outside_comparison_cut_opens_without_widening(frontend_server: str, browser_context: BrowserContext) -> None:
    page = browser_context.new_page()
    page.goto(frontend_server + '#bestand?ort=Z%C3%BCrich')
    expect(page.locator('#tab-bestand .vs-status__count .fs-option__count')).to_have_text('42 von 188')
    page.evaluate("() => import('./js/ui/router.js').then(m => m.navigateToView('bestand', {recordId:'m3gim-data:NIM_023_5', preserveFilter:true}))")
    expect(page.locator('.archiv-outside-record')).to_be_visible()
    expect(page.locator('.archiv-outside-record')).to_contain_text('UAKUG/NIM_023 5')
    expect(page.locator('#tab-bestand .vs-status__count .fs-option__count')).to_have_text('42 von 188')
    assert 'quellansicht=1' in page.url
    page.reload()
    expect(page.locator('.archiv-outside-record')).to_be_visible()
    expect(page.locator('#tab-bestand .vs-status__count .fs-option__count')).to_have_text('42 von 188')


def test_invalid_predicate_is_visible_and_removable(frontend_server: str, browser_context: BrowserContext) -> None:
    page = browser_context.new_page()
    raw = quote(json.dumps({'type': 'unknown-condition'}))
    page.goto(frontend_server + '#bestand?praedikat=' + raw)
    expect(page.locator('#tab-bestand .vs-status__count .fs-option__count')).to_have_text('0 von 188')
    expect(page.locator('#tab-bestand .filter-strip')).to_contain_text('Ungültiger Filter')
    page.get_by_role('button', name='Ungültiger Filter', exact=False).click()
    expect(page.locator('#tab-bestand .vs-status__count .fs-option__count')).to_have_text('188')
