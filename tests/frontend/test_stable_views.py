"""Integrated document cuts and accessible static delivery in the real browser."""

import re
from urllib.parse import urlparse

import pytest

pytest.importorskip("playwright")
from playwright.sync_api import expect

VIEWS = ("bestand", "indizes", "netzwerk", "chronik", "karte", "statistik")


@pytest.mark.frontend
def test_six_views_share_search_and_load_without_external_requests(
    frontend_server, browser_context
):
    context = browser_context
    external = []

    def local_only(route):
        if urlparse(route.request.url).netloc != urlparse(frontend_server).netloc:
            external.append(route.request.url)
            route.abort()
        else:
            route.continue_()

    context.route("**/*", local_only)
    page = context.new_page()
    page.goto(frontend_server, wait_until="networkidle")
    page.wait_for_selector("#bestand-tbody tr")
    for query in ("nim_004", "no-record-can-match-this-93f8"):
        page.evaluate(
            "q => { location.hash = '#bestand?suche=' + encodeURIComponent(q); }", query
        )
        expect(page.locator('#tab-bestand input[type="search"]').first).to_have_value(
            query
        )
        expected = page.evaluate("""async () => {
                const {recordsFor} = await import('./js/data/records-for.js');
                const {getFilter} = await import('./js/ui/filter-state.js');
                return [...recordsFor(window.m3gim.store, getFilter()).ids].sort();
            }""")
        assert bool(expected) == (query == "nim_004")
        for view in VIEWS:
            page.locator(f'[data-tab="{view}"]').first.click()
            count = page.locator(f"#tab-{view} .vs-status__count")
            assert count.count() == 1, view
            expect(count.locator(".fs-option__count")).to_have_text(
                re.compile(rf"^{len(expected)} von")
            )
            search = page.locator(f'#tab-{view} input[type="search"]').first
            expect(search).to_have_value(query)
            assert "Datenstand" in count.get_attribute("aria-label"), view
            count.focus()
            assert count.evaluate("el => document.activeElement === el"), view
            assert page.locator(f"#tab-{view} .load-error").count() == 0, view
        page.reload(wait_until="networkidle")
        page.wait_for_selector("#tab-statistik .vs-status__count")
        assert (
            page.locator('#tab-statistik input[type="search"]').first.input_value()
            == query
        )
    assert not external, external
    page.close()


@pytest.mark.frontend
def test_explicit_filter_link_replaces_previous_cut(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + "#bestand?ort=Graz", wait_until="networkidle")
    page.wait_for_selector("#bestand-tbody tr")
    page.evaluate("location.hash = '#bestand?werk=Tristan%20und%20Isolde'")
    page.wait_for_function("location.hash.includes('werk=Tristan%20und%20Isolde')")
    state = page.evaluate(
        "async () => (await import('./js/ui/filter-state.js')).getFilter()"
    )
    assert state["ort"] == []
    assert state["werk"] == ["Tristan und Isolde"]
    page.locator('[data-tab="chronik"]').first.click()
    page.reload(wait_until="networkidle")
    state_after = page.evaluate(
        "async () => (await import('./js/ui/filter-state.js')).getFilter()"
    )
    assert state_after == state
    page.close()


@pytest.mark.frontend
def test_narrow_views_start_with_accessible_collapsed_filters(
    frontend_server, browser_context
):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 800, "height": 900})
    page.goto(frontend_server, wait_until="networkidle")
    for view in ("netzwerk", "karte", "statistik"):
        page.locator(f'[data-tab="{view}"]').first.click()
        panel = page.locator(f"#tab-{view}")
        toggle = panel.get_by_role("button", name="Filter ein- oder ausblenden")
        assert toggle.is_visible()
        assert not panel.locator(".view-sidebar").is_visible()
        assert toggle.get_attribute("aria-expanded") == "false"
        toggle.click()
        assert panel.locator(".view-sidebar").is_visible()
        assert toggle.get_attribute("aria-expanded") == "true"
        toggle.click()
        assert not panel.locator(".view-sidebar").is_visible()
    page.close()


@pytest.mark.frontend
def test_grouped_performance_dates_only_expose_recorded_caveats_by_keyboard(
    frontend_server, browser_context
):
    """Exercise the rare date-caveat path in the isolated browser store."""
    page = browser_context.new_page()
    page.goto(
        frontend_server + "#bestand/m3gim-data%3ANIM_022_1_1", wait_until="networkidle"
    )
    page.wait_for_selector(".archiv-row--detail .chip-date")
    page.evaluate("""() => {
        const datings = window.m3gim.store.recordDatings.get('m3gim-data:NIM_022_1_1');
        const performance = datings.find(
            dating => dating.roleId === 'm3gim-vocab:performance'
        );
        performance.description = 'Prüfhinweis zum einzelnen Aufführungsdatum';
        location.hash = '#bestand/m3gim-data%3ANIM_023_5';
    }""")
    page.wait_for_url("**NIM_023_5")
    expect(page.locator(".archiv-row--detail .inline-detail__head-sig")).to_have_text(
        "UAKUG/NIM_023 5"
    )
    page.evaluate(
        "location.hash = '#bestand/m3gim-data%3ANIM_022_1_1'"
    )
    page.wait_for_url("**NIM_022_1_1")
    dates = page.locator(".archiv-row--detail .chip-date")
    expect(dates).to_have_count(14)
    annotated = page.locator(".archiv-row--detail .chip-date[data-tip]")
    expect(annotated).to_have_count(1)
    expect(annotated).to_have_attribute(
        "data-tip", "Anmerkung: Prüfhinweis zum einzelnen Aufführungsdatum"
    )
    annotated.focus()
    assert annotated.evaluate("el => document.activeElement === el")
    expect(page.locator(".tooltip-portal")).to_be_visible()
    expect(page.locator(".tooltip-portal")).to_have_text(
        "Anmerkung: Prüfhinweis zum einzelnen Aufführungsdatum"
    )
    for index in range(dates.count()):
        date = dates.nth(index)
        tip = date.get_attribute("data-tip")
        if tip:
            assert "Datenqualität:" in tip or "Anmerkung:" in tip
            date.focus()
            assert date.evaluate("el => document.activeElement === el")
        else:
            assert date.get_attribute("tabindex") is None
            assert date.get_attribute("aria-label") is None
    page.close()
