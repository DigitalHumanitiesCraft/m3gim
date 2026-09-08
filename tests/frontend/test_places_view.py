"""Source interpretation and navigation in the place evidence view."""
from urllib.parse import parse_qs

import pytest
from playwright.sync_api import expect

pytestmark = pytest.mark.frontend


@pytest.mark.parametrize("width", [390, 800, 1440])
def test_selection_preserves_cut_and_exposes_complete_evidence(frontend_server, browser_context, width):
    page = browser_context.new_page()
    page.set_viewport_size({"width": width, "height": 1000})
    page.goto(frontend_server + "#karte", wait_until="networkidle")
    original_url = page.url
    names = page.locator(".places-name")
    count = names.count()
    trigger = page.get_by_role("button", name="Belege zu Bayreuth", exact=True)
    trigger.focus()
    trigger.press("Enter")
    detail = page.locator(".selection-detail__panel")
    expect(detail).to_be_visible()
    assert page.url == original_url
    assert names.count() == count
    expected = page.evaluate("""async () => {
        const {buildOccurrences} = await import('./js/views/karte-data.js');
        const {cityOf} = await import('./js/utils/format.js');
        return buildOccurrences(window.m3gim.store).filter(o => cityOf(o.place).toLowerCase() === 'bayreuth').length;
    }""")
    expect(detail.locator(".places-evidence")).to_have_count(expected)
    box = detail.bounding_box()
    assert 0 <= box['x'] and box['x'] + box['width'] <= width + 1
    assert box['y'] >= 0 and box['y'] + box['height'] <= 1000
    assert detail.evaluate("el => el.scrollWidth <= el.clientWidth + 1")
    assert detail.evaluate("el => el.scrollHeight > el.clientHeight")
    detail.evaluate("el => el.scrollTop = el.scrollHeight")
    expect(detail.locator(".places-evidence").last).to_be_in_viewport()
    page.keyboard.press("Escape")
    expect(trigger).to_be_focused()
    expect(detail).to_have_count(0)
    page.get_by_role("button", name="Belege zu München", exact=True).click()
    expect(page.locator(".selection-detail__title")).to_have_text("München")
    page.get_by_role("button", name="Schließen", exact=True).click()
    assert page.url == original_url
    page.get_by_role("button", name="Karte ausblenden").click()
    expect(page.locator(".mob-map")).to_be_hidden()
    assert names.count() == count


def test_wuppertal_keeps_document_and_place_dates_separate(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + "#karte?suche=NIM_023%205", wait_until="networkidle")
    page.get_by_role("button", name="Belege zu Wuppertal", exact=True).click()
    detail = page.locator(".places-evidence")
    expect(detail).to_have_count(1)
    assert [" ".join(value.split()) for value in detail.locator("dd").all_text_contents()] == ["nicht erfasst", "26. April 1953", "4. April 1953"]
    detail.locator(".places-source").click()
    expect(page.locator(".inline-detail__head-sig")).to_have_text("UAKUG/NIM_023 5")
    assert parse_qs(page.url.split('?', 1)[1])['suche'] == ['NIM_023 5']


def test_map_selection_is_local_and_chronik_action_filters_explicitly(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + "#karte?suche=NIM_023%205", wait_until="networkidle")
    original = page.url
    svg = page.locator(".mob-map__svg")
    svg.focus()
    for _ in range(page.locator('.mob-node').count()):
        if 'Ort Wuppertal.' in svg.get_attribute('aria-label'):
            break
        svg.press('ArrowRight')
    svg.press("Enter")
    assert page.url == original
    expect(page.locator(".selection-detail__title")).to_have_text("Wuppertal")
    page.get_by_role("button", name="Ort in Chronik öffnen", exact=True).click()
    expect(page.locator("#tab-chronik")).to_be_visible()
    params = parse_qs(page.url.split('?', 1)[1])
    assert params['ort'] == ['Wuppertal']
    assert params['suche'] == ['NIM_023 5']
    expect(page.locator("dialog[open]")).to_have_count(0)


def test_missing_geometry_keeps_place_evidence_usable(frontend_server, browser_context):
    browser_context.route('**/data/geo/countries-110m.geo.json', lambda route: route.fulfill(body='invalid geometry'))
    page = browser_context.new_page()
    page.goto(frontend_server + "#karte", wait_until="networkidle")
    expect(page.locator(".mob-map")).to_contain_text("Karte nicht verfügbar")
    page.locator(".places-name").first.click()
    expect(page.locator(".places-evidence").first).to_be_visible()


def test_place_lookup_reset_and_unlocated_evidence(frontend_server, browser_context):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1440, "height": 1000})
    page.goto(frontend_server + "#karte", wait_until="networkidle")
    count = page.locator('.places-name').count()
    row = page.locator('.places-table tbody tr').filter(has=page.locator('.places-location-note')).first
    name = row.locator('.places-name').inner_text()
    query = page.get_by_role('searchbox', name='Ort in der Liste suchen')
    original_url = page.url
    query.fill(name)
    page.get_by_role('button', name='Belege zu ' + name, exact=True).click()
    expect(page.locator('.places-detail')).to_contain_text('Ohne Koordinaten')
    assert page.url == original_url
    page.get_by_role('button', name='Schließen', exact=True).click()
    query.fill('KeinOrt93fa7')
    expect(page.locator('.places-name')).to_have_count(0)
    expect(page.locator('.mob-node')).to_have_count(0)
    query.fill('')
    expect(page.locator('.places-name')).to_have_count(count)


def test_work_navigation_uses_the_shared_facet(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + '#indizes/werke?suche=NIM_004', wait_until='networkidle')
    page.get_by_role('button', name='Ortsbelege zu Tristan und Isolde öffnen', exact=True).click()
    expect(page.locator('#tab-karte')).to_be_visible()
    params = parse_qs(page.url.split('?', 1)[1])
    assert params['werk'] == ['Tristan und Isolde']
    assert params['suche'] == ['NIM_004']
    assert page.locator('.places-name').count() > 0
    assert page.locator('[data-facet="entitaet"]').count() == 0
