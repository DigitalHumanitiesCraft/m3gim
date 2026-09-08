"""Source interpretation and navigation in the place evidence view."""
from urllib.parse import parse_qs

import pytest
from playwright.sync_api import expect

pytestmark = pytest.mark.frontend


def open_navigator(page):
    navigator = page.locator(".places-navigator")
    if navigator.is_hidden():
        page.get_by_role("button", name="Ortsliste einblenden", exact=True).click()
    expect(navigator).to_be_visible()
    return navigator


@pytest.mark.parametrize("width", [390, 800, 1440])
def test_selection_preserves_cut_and_exposes_complete_evidence(frontend_server, browser_context, width):
    page = browser_context.new_page()
    page.set_viewport_size({"width": width, "height": 1000})
    page.goto(frontend_server + "#karte", wait_until="networkidle")
    open_navigator(page)
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


def test_compact_navigator_and_unlocated_evidence(frontend_server, browser_context):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1440, "height": 1000})
    page.goto(frontend_server + "#karte", wait_until="networkidle")
    navigator = open_navigator(page)
    assert 240 <= navigator.bounding_box()['width'] <= 280
    count = page.locator('.places-name').count()
    row = page.locator('.places-table tbody tr').filter(has=page.locator('.places-location-note')).first
    name = row.locator('.places-name').inner_text()
    original_url = page.url
    page.get_by_role('button', name='Belege zu ' + name, exact=True).click()
    expect(page.locator('.places-detail')).to_contain_text('Ohne Koordinaten')
    assert page.url == original_url
    page.get_by_role('button', name='Schließen', exact=True).click()
    expect(page.locator('.places-name')).to_have_count(count)
    page.get_by_role('button', name='Ortsliste einklappen', exact=True).click()
    expect(navigator).to_be_hidden()
    expect(page.locator('.mob-map')).to_be_visible()


def test_narrow_view_starts_with_collapsed_reachable_navigator(frontend_server, browser_context):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(frontend_server + "#karte", wait_until="networkidle")
    expect(page.locator('.places-navigator')).to_be_hidden()
    navigator = open_navigator(page)
    assert navigator.bounding_box()['width'] <= 280
    expect(page.locator('.places-name')).to_have_count(91)


def test_zurich_selection_centres_after_detail_and_keeps_zoom(frontend_server, browser_context):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1440, "height": 1000})
    page.goto(frontend_server + "#karte", wait_until="networkidle")
    open_navigator(page)
    page.get_by_role('button', name='Belege zu Zürich', exact=True).click()
    expect(page.locator('.selection-detail__title')).to_have_text('Zürich')

    def map_state():
        return page.evaluate("""() => {
          const map = document.querySelector('.mob-map');
          const svg = map.querySelector('.mob-map__svg');
          const point = map.querySelector('.mob-node--selected')?.__data__;
          const transform = d3.zoomTransform(svg);
          const [x, y] = point ? transform.apply([point.x, point.y]) : [null, null];
          return { x, y, width: map.clientWidth, height: map.clientHeight, k: transform.k };
        }""")

    page.wait_for_function("""() => {
      const map = document.querySelector('.mob-map');
      const svg = map?.querySelector('.mob-map__svg');
      const mark = map?.querySelector('.mob-node--selected');
      if (!svg || !mark) return false;
      const [x, y] = d3.zoomTransform(svg).apply([mark.__data__.x, mark.__data__.y]);
      return Math.abs(x - map.clientWidth / 2) < 2 && Math.abs(y - map.clientHeight / 2) < 2;
    }""")
    centred = map_state()
    assert centred['k'] >= 3
    assert abs(centred['x'] - centred['width'] / 2) < 2
    assert abs(centred['y'] - centred['height'] / 2) < 2

    page.get_by_role('button', name='Hineinzoomen').click()
    useful_zoom = map_state()['k']
    page.get_by_role('button', name='Belege zu Bayreuth', exact=True).click()
    page.wait_for_function("""() => {
      const map = document.querySelector('.mob-map');
      const svg = map?.querySelector('.mob-map__svg');
      const mark = map?.querySelector('.mob-node--selected');
      if (!svg || !mark) return false;
      const [x, y] = d3.zoomTransform(svg).apply([mark.__data__.x, mark.__data__.y]);
      return Math.abs(x - map.clientWidth / 2) < 2 && Math.abs(y - map.clientHeight / 2) < 2;
    }""")
    assert abs(map_state()['k'] - useful_zoom) < 0.001
    page.get_by_role('button', name='Schließen', exact=True).click()
    page.set_viewport_size({"width": 1300, "height": 900})
    page.wait_for_timeout(100)
    assert abs(map_state()['k'] - useful_zoom) < 0.001


def test_place_detail_names_coverage_roles_and_document_co_mentions(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + '#karte', wait_until='networkidle')
    open_navigator(page)
    page.get_by_role('button', name='Belege zu Zürich', exact=True).click()
    detail = page.locator('.places-detail')
    expect(detail.locator('.places-overview__facts')).to_contain_text('Mit eigenem Datum')
    expect(detail.locator('.places-overview__roles .places-role')).not_to_have_count(0)
    expect(detail.locator('.places-evidence')).not_to_have_count(0)
    first = detail.locator('.places-evidence').first
    expect(first.locator('dt')).to_have_text([
        'Datum der Ortsaussage', 'Dokumentdatum', 'Primärer Zeitanker'
    ])
    related = detail.locator('.places-related')
    expect(related).to_contain_text('Im selben Dokument genannt')
    expect(related.locator('.places-related__family')).not_to_have_count(0)


def test_common_search_opens_typed_place_without_changing_cut(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + '#karte', wait_until='networkidle')
    before = page.url
    search = page.get_by_role('combobox', name='Suche', exact=True)
    search.fill('Zürich')
    option = page.get_by_role('option', name='Ort: Zürich, 42 Dokumente', exact=True)
    option.hover()
    page.get_by_role('button', name='Ort auf der Karte öffnen', exact=True).click()
    expect(page.locator('.selection-detail__title')).to_have_text('Zürich')
    assert page.url == before
    expect(page.locator('.mob-node--selected')).to_have_count(1)
    page.get_by_role('button', name='Schließen', exact=True).click()
    expect(search).to_be_focused()


def test_bound_place_query_marks_witnesses_and_keeps_document_context(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + '#karte', wait_until='networkidle')
    page.evaluate("""() => import('./js/ui/filter-state.js').then(({setFilter}) => setFilter({
      predicates: [{type: 'entity-role', family: 'ort', entities: ['Zürich'],
        roles: ['m3gim-vocab:receiving']}]
    }))""")
    open_navigator(page)
    page.get_by_role('button', name='Belege zu Zürich', exact=True).click()
    expected = page.evaluate("""async () => {
      const {recordsFor} = await import('./js/data/records-for.js');
      const {getFilter} = await import('./js/ui/filter-state.js');
      return recordsFor(window.m3gim.store, getFilter()).witnesses
        .filter(item => item.dimension === 'ort').length;
    }""")
    assert expected == 13
    detail = page.locator('.places-detail')
    expect(detail.locator('.places-match')).to_have_count(expected)
    assert detail.locator('.places-evidence').count() > expected


def test_work_navigation_uses_the_shared_facet(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + '#indizes/werke?suche=NIM_004', wait_until='networkidle')
    page.get_by_role('button', name='Nach Tristan und Isolde filtern und Karte öffnen', exact=True).click()
    expect(page.locator('#tab-karte')).to_be_visible()
    params = parse_qs(page.url.split('?', 1)[1])
    assert params['werk'] == ['Tristan und Isolde']
    assert params['suche'] == ['NIM_004']
    assert page.locator('.places-name').count() > 0
    assert page.locator('[data-facet="entitaet"]').count() == 0


def test_typed_entity_navigation_binds_an_existing_role(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + '#karte', wait_until='networkidle')
    page.evaluate("""async () => {
      const {setFilter} = await import('./js/ui/filter-state.js');
      const {navigateToView} = await import('./js/ui/router.js');
      setFilter({verknuepfung: ['person:m3gim-vocab:contractingParty']});
      navigateToView('karte', {entityName: 'Malaniuk, Ira', entityFamily: 'person'});
    }""")
    page.wait_for_function("""() => {
      const params = new URLSearchParams(location.hash.split('?')[1] || '');
      return params.has('praedikat') && !params.has('person') && !params.has('verknuepfung');
    }""")
    result = page.evaluate("""async () => {
      const {getFilter} = await import('./js/ui/filter-state.js');
      const {recordsFor} = await import('./js/data/records-for.js');
      const filter = getFilter();
      return {
        predicate: filter.predicates[0],
        count: recordsFor(window.m3gim.store, filter).ids.size,
      };
    }""")
    assert result['predicate'] == {
        'type': 'entity-role',
        'family': 'person',
        'entities': ['Malaniuk, Ira'],
        'roles': ['m3gim-vocab:contractingParty'],
    }
    assert result['count'] == 9
