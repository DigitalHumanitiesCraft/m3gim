"""Explain absent companion marks and retain usable matrix pages and headers."""
import json
from urllib.parse import quote

import pytest
from playwright.sync_api import expect

pytestmark = pytest.mark.frontend


@pytest.mark.parametrize('width', [390, 1440])
def test_receipt_explains_absent_work_without_changing_filter(frontend_server, browser_context, width):
    page = browser_context.new_page()
    page.set_viewport_size({'width': width, 'height': 844})
    page.goto(frontend_server + '#statistik?suche=Z%C3%BCrich', wait_until='networkidle')
    first = page.locator('.dashboard-panel[data-panel-id="a"]')
    second = page.locator('.dashboard-panel[data-panel-id="b"]')
    expect(first.locator('.dashboard-chart-status')).to_contain_text('45 von 45 Dokumenten')
    first.locator('.dashboard-values > summary').click()
    url = page.url
    first.locator('.dashboard-values__select').filter(has_text='Quittung').click()
    detail = page.locator('.selection-detail__panel')
    expect(detail.locator('.selection-detail__title')).to_have_text('Quittung')
    expect(detail.locator('.selection-detail__subtitle')).to_have_text('1 Dokument')
    expect(second.locator('.dashboard-chart-selection')).to_contain_text('1 Dokument ohne Werkangabe')
    expect(second.locator('.dashboard-matrix__cell.dashboard-mark--highlighted')).to_have_count(0)
    expect(page).to_have_url(url)
    expect(detail.locator('.dashboard-selection__records button')).to_have_attribute(
        'data-record-id', 'm3gim-data:NIM_007_5_8'
    )
    expect(detail.locator('.dashboard-selection__witnesses').first).to_be_hidden()
    detail.locator('summary', has_text='Belege für diese Auswahl').click()
    expect(detail.locator('.detail-disclosure[open] .dashboard-selection__witnesses')).to_be_visible()
    expect(detail).not_to_contain_text('Originalstelle ist im Datenbeleg erhalten')
    detail.press('Escape')
    expect(second.locator('.dashboard-chart-selection')).to_be_hidden()
    page.close()


def test_matrix_clamps_saved_pages_and_keeps_headers_when_scrolling(frontend_server, browser_context):
    page = browser_context.new_page()
    page.set_viewport_size({'width': 1440, 'height': 900})
    config = quote(json.dumps({'chart': 'matrix', 'config': {'page': 99, 'columnPage': 99}}))
    page.goto(frontend_server + '#statistik?ort=Z%C3%BCrich&dash-panel-b=' + config, wait_until='networkidle')
    target = page.locator('.dashboard-panel[data-panel-id="b"]')
    assert target.locator('.dashboard-matrix__cell').count() > 0
    page.goto(frontend_server + '#statistik', wait_until='networkidle')
    wrap = target.locator('.dashboard-matrix-wrap')
    wrap.scroll_into_view_if_needed()
    wrap.evaluate('node => { node.scrollTop = 150; node.scrollLeft = 250; }')
    corner = target.locator('thead th').first.bounding_box()
    body_head = target.locator('tbody th').first
    box = wrap.bounding_box()
    assert abs(corner['y'] - box['y']) <= 2
    assert abs(corner['x'] - box['x']) <= 2
    assert body_head.evaluate('node => getComputedStyle(node).top') == 'auto'
    label = target.locator('.dashboard-matrix__axis').first
    assert label.evaluate('node => getComputedStyle(node).whiteSpace') == 'normal'
    page.close()
