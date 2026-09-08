"""Check overview density and progressive access to complete source evidence."""

import pytest

pytest.importorskip("playwright")
from playwright.sync_api import expect


@pytest.mark.frontend
@pytest.mark.parametrize("width", [390, 1440])
def test_dashboard_sources_open_on_demand_with_sticky_context(
    frontend_server, browser_context, width
):
    page = browser_context.new_page()
    page.set_viewport_size({"width": width, "height": 800})
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    trigger = page.locator('.dashboard-panel[data-panel-id="a"] .dashboard-treemap__mark').first
    trigger.click()
    panel = page.locator('.selection-detail__panel')
    expect(panel).to_be_visible()
    sources = panel.locator('.detail-disclosure').filter(
        has=page.locator('summary', has_text='Quellen ansehen')
    )
    rows = sources.locator('.dashboard-selection__records button')
    assert rows.count() > 10
    expect(rows.first).to_be_hidden()
    expect(panel.locator('.dashboard-selection__witnesses').first).to_be_hidden()
    before = page.url
    sources.locator('summary').focus()
    sources.locator('summary').press('Enter')
    expect(rows.first).to_be_visible()
    rows.last.scroll_into_view_if_needed()
    expect(rows.last).to_be_in_viewport()
    expect(page).to_have_url(before)
    header = panel.locator('.selection-detail__header').bounding_box()
    bounds = panel.bounding_box()
    assert bounds['y'] - 1 <= header['y'] <= bounds['y'] + 1
    expect(panel.get_by_role('button', name='Schließen', exact=True)).to_be_in_viewport()
    expect(panel.locator('.selection-detail__title')).to_be_in_viewport()
    panel.press('Escape')
    expect(panel).to_have_count(0)
    expect(trigger).to_be_focused()
    page.close()


@pytest.mark.frontend
def test_register_co_mentions_are_optional_and_keep_navigation(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + '#indizes/werke', wait_until='networkidle')
    page.get_by_role('button', name='Details zu Tristan und Isolde', exact=True).click()
    panel = page.locator('.selection-detail__panel')
    expect(panel.locator('.idx-partien__derived')).to_be_visible()
    expect(panel.locator('.idx-umfeld')).to_be_hidden()
    before = page.url
    summary = panel.locator('.detail-disclosure > summary', has_text='Im selben Dokument genannt')
    summary.focus()
    summary.press('Enter')
    expect(panel.locator('.idx-umfeld')).to_be_visible()
    expect(page).to_have_url(before)
    target = panel.locator('.idx-umfeld__chips > button').first
    name = target.locator('.chip-wert').inner_text()
    target.click()
    expect(page.locator('.selection-detail__title')).to_have_text(name)
    page.close()


@pytest.mark.frontend
def test_network_actor_exposes_all_sources_on_demand(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + '#netzwerk', wait_until='networkidle')
    nodes = page.locator('.netzwerk-node')
    expect(nodes.first).to_be_visible()
    index, count = nodes.evaluate_all("""nodes => {
      const counts = nodes.map(node => node.__data__.kind === 'record'
        ? 0 : node.__data__.records.size);
      const count = Math.max(...counts);
      return [counts.indexOf(count), count];
    }""")
    assert count > 10
    trigger = nodes.nth(index)
    trigger.focus()
    trigger.press('Enter')
    panel = page.locator('.selection-detail__panel')
    summary = panel.locator('.detail-disclosure > summary', has_text='Quellen ansehen')
    expect(summary).to_contain_text(f'({count} Dokumente)')
    records = panel.locator('.netzwerk__record')
    expect(records).to_have_count(count)
    expect(records.first).to_be_hidden()
    before = page.url
    summary.press('Enter')
    expect(records.first).to_be_visible()
    expect(page).to_have_url(before)
    records.last.scroll_into_view_if_needed()
    expect(records.last).to_be_in_viewport()
    records.last.press('Enter')
    expect(page.locator('#tab-bestand')).to_be_visible()
    expect(page.locator('.archiv-row--detail')).to_be_visible()
    page.close()
