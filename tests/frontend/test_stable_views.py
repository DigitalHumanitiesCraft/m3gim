"""Integrated document cuts and accessible static delivery in the real browser."""

from urllib.parse import urlparse

import pytest

pytest.importorskip("playwright")
from playwright.sync_api import sync_playwright

VIEWS = ("bestand", "indizes", "netzwerk", "chronik", "karte", "statistik")


@pytest.mark.frontend
def test_six_views_share_search_and_load_without_external_requests(frontend_server):
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(viewport={"width": 1366, "height": 900})
        external = []
        errors = []

        def local_only(route):
            if urlparse(route.request.url).netloc != urlparse(frontend_server).netloc:
                external.append(route.request.url)
                route.abort()
            else:
                route.continue_()

        context.route("**/*", local_only)
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(frontend_server, wait_until="networkidle")
        page.wait_for_selector("#bestand-tbody tr")
        for query in ("nim_004", "no-record-can-match-this-93f8"):
            page.evaluate("q => { location.hash = '#bestand?suche=' + encodeURIComponent(q); }", query)
            page.wait_for_timeout(300)
            expected = page.evaluate("""async () => {
                const {recordsFor} = await import('./js/data/records-for.js');
                const {getFilter} = await import('./js/ui/filter-state.js');
                return [...recordsFor(window.m3gim.store, getFilter()).ids].sort();
            }""")
            assert bool(expected) == (query == "nim_004")
            for view in VIEWS:
                page.locator(f'[data-tab="{view}"]').first.click()
                page.wait_for_timeout(250)
                count = page.locator(f'#tab-{view} .vs-status__count')
                assert count.count() == 1, view
                assert count.locator('.fs-option__count').inner_text().startswith(f'{len(expected)} von'), view
                search = page.locator(f'#tab-{view} input[type="search"]').first
                assert search.input_value() == query, view
                assert "Datenstand" in count.get_attribute("aria-label"), view
                count.focus()
                assert count.evaluate("el => document.activeElement === el"), view
                assert page.locator(f'#tab-{view} .load-error').count() == 0, view
            page.reload(wait_until="networkidle")
            page.wait_for_selector('#tab-statistik .vs-status__count')
            assert page.locator('#tab-statistik input[type="search"]').first.input_value() == query
        assert not external, external
        assert not errors, errors
        browser.close()


@pytest.mark.frontend
def test_explicit_filter_link_replaces_previous_cut(frontend_server):
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        page.goto(frontend_server + '#bestand?ort=Graz', wait_until="networkidle")
        page.wait_for_selector('#bestand-tbody tr')
        page.evaluate("location.hash = '#bestand?werk=Tristan%20und%20Isolde'")
        page.wait_for_timeout(250)
        state = page.evaluate("async () => (await import('./js/ui/filter-state.js')).getFilter()")
        assert state['ort'] == []
        assert state['werk'] == ['Tristan und Isolde']
        page.locator('[data-tab="chronik"]').first.click()
        page.reload(wait_until="networkidle")
        state_after = page.evaluate("async () => (await import('./js/ui/filter-state.js')).getFilter()")
        assert state_after == state
        browser.close()


@pytest.mark.frontend
def test_narrow_views_start_with_accessible_collapsed_filters(frontend_server):
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 800, "height": 900})
        page.goto(frontend_server, wait_until="networkidle")
        for view in ("netzwerk", "karte", "statistik"):
            page.locator(f'[data-tab="{view}"]').first.click()
            page.wait_for_timeout(300)
            panel = page.locator(f'#tab-{view}')
            toggle = panel.get_by_role('button', name='Filter ein- oder ausblenden')
            assert toggle.is_visible()
            assert not panel.locator('.view-sidebar').is_visible()
            assert toggle.get_attribute('aria-expanded') == 'false'
            toggle.click()
            assert panel.locator('.view-sidebar').is_visible()
            assert toggle.get_attribute('aria-expanded') == 'true'
            toggle.click()
            assert not panel.locator('.view-sidebar').is_visible()
        browser.close()


@pytest.mark.frontend
def test_grouped_performance_dates_expose_their_source_by_keyboard(frontend_server):
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        page.goto(frontend_server + '#bestand/m3gim-data%3ANIM_022_1_1', wait_until='networkidle')
        date = page.locator('.archiv-row--detail .chip-date[data-tip*="Zeile 6"]').first
        date.wait_for()
        date.focus()
        assert date.evaluate('el => document.activeElement === el')
        assert 'Box 2' in date.get_attribute('aria-label')
        assert 'Zeile 6' in date.get_attribute('aria-label')
        browser.close()
