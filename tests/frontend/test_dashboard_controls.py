"""Progressive dashboard controls and paired-view presets."""
import json
from pathlib import Path
from urllib.parse import parse_qs

import pytest
from playwright.sync_api import expect

pytestmark = pytest.mark.frontend


def panel(page, panel_id):
    return page.locator(f'.dashboard-panel[data-panel-id="{panel_id}"]')


def dashboard_params(page):
    return parse_qs(page.url.split('?', 1)[1])


def test_presets_update_both_panels_and_preserve_shared_state(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + '#statistik?jahr=1950-1960', wait_until='networkidle')
    before_filter = page.evaluate("""async () => {
      const {getFilter} = await import('./js/ui/filter-state.js');
      return getFilter();
    }""")
    assert page.evaluate("""async () => {
      const {getFilter} = await import('./js/ui/filter-state.js');
      const {recordsFor} = await import('./js/data/records-for.js');
      return recordsFor(window.m3gim.store, getFilter()).ids.size;
    }""") < 194
    panel(page, 'a').locator('.dashboard-mark').first.click()
    detail_title = page.locator('.selection-detail__title').inner_text()

    preset = page.get_by_role('button', name='Zeit + Orte', exact=True)
    preset.click()
    expect(preset).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('.dashboard-presets__status')).to_have_text('Aktiv: Zeit + Orte')
    expect(panel(page, 'a').get_by_label('Diagramm in Panel A')).to_have_value('time')
    expect(panel(page, 'b').get_by_label('Diagramm in Panel B')).to_have_value('map')
    params = dashboard_params(page)
    assert json.loads(params['dash-panel-a'][0])['chart'] == 'time'
    assert json.loads(params['dash-panel-b'][0])['chart'] == 'map'
    expect(page.locator('.selection-detail__title')).to_have_text(detail_title)
    assert page.evaluate("""async expected => {
      const {getFilter} = await import('./js/ui/filter-state.js');
      return JSON.stringify(getFilter()) === JSON.stringify(expected);
    }""", before_filter)

    page.reload(wait_until='networkidle')
    expect(panel(page, 'a').get_by_label('Diagramm in Panel A')).to_have_value('time')
    expect(panel(page, 'b').get_by_label('Diagramm in Panel B')).to_have_value('map')
    expect(page.locator('.dashboard-presets__status')).to_have_text('Aktiv: Zeit + Orte')

    panel(page, 'a').get_by_label('Diagramm in Panel A').select_option('treemap')
    expect(page.locator('.dashboard-presets__status')).to_have_text('Freie Kombination')
    expect(preset).to_have_attribute('aria-pressed', 'false')

    panel(page, 'a').get_by_label('Diagramm in Panel A').select_option('comparison')
    panel(page, 'a').get_by_role('button', name='Aktuellen Schnitt als A merken', exact=True).click()
    reference = dashboard_params(page)['dash-reference'][0]
    page.get_by_role('button', name='Ortsrollen + Karte', exact=True).click()
    assert dashboard_params(page)['dash-reference'][0] == reference


def test_panel_menus_keep_dimensions_visible_and_support_escape(frontend_server, browser_context):
    page = browser_context.new_page()
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(frontend_server + '#statistik', wait_until='networkidle')
    target = panel(page, 'b')
    expect(target.get_by_label('Diagramm in Panel B')).to_be_visible()
    expect(target.get_by_label('Dimensionspaar')).to_be_visible()
    expect(target.get_by_label('Matrixmaß')).to_be_visible()
    expect(target.get_by_label('Matrixsortierung')).to_be_hidden()

    display = target.locator('.dashboard-panel-menu').filter(has_text='Darstellung')
    trigger = display.locator('summary')
    trigger.focus()
    trigger.press('Enter')
    expect(target.get_by_label('Matrixsortierung')).to_be_visible()
    expect(target.get_by_role('button', name='Achsen tauschen', exact=True)).to_be_visible()
    expect(target.get_by_role('button', name='Ansicht zurücksetzen', exact=True)).to_be_visible()
    target.get_by_label('Matrixsortierung').press('Escape')
    expect(display).not_to_have_attribute('open', '')
    expect(trigger).to_be_focused()

    export = target.locator('.dashboard-panel-menu').filter(has_text='Export')
    export.locator('summary').focus()
    export.locator('summary').press('Enter')
    export_button = target.get_by_role('button', name='Aggregat CSV', exact=True)
    expect(export_button).to_be_visible()
    box = export.locator('.dashboard-panel-menu__content').bounding_box()
    assert box and box['x'] >= 0 and box['x'] + box['width'] <= 390
    with page.expect_download() as download_info:
        export_button.click()
    download = download_info.value
    assert download.suggested_filename == 'm3gim-dashboard-panel-b.csv'
    assert Path(download.path()).stat().st_size > 0
