import re

import pytest

pytest.importorskip("playwright")
from playwright.sync_api import expect


VIEWS = (
    ("bestand", "#tab-bestand .archiv-main"),
    ("chronik", "#tab-chronik .chronik-main"),
    ("indizes/personen", "#tab-indizes .idx-page"),
    ("karte", "#tab-karte .places-main"),
    ("netzwerk", "#tab-netzwerk .netzwerk__main"),
    ("statistik", "#tab-statistik .statistik-main"),
    ("korb", "#tab-korb .korb-page"),
)


def _seed_basket(page):
    ids = page.evaluate("""async () => {
        const response = await fetch('data/m3gim.jsonld');
        const graph = (await response.json())['@graph'] || [];
        return graph.filter(node => node['@type'] === 'rico:Record')
          .slice(0, 30).map(node => node['@id']);
    }""")
    page.evaluate("ids => localStorage.setItem('m3gim-korb', JSON.stringify(ids))", ids)


def _box(locator):
    value = locator.evaluate("""element => {
        const rect = element.getBoundingClientRect();
        return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
          width: rect.width, height: rect.height};
    }""")
    return value


def _scroll_report(locator):
    return locator.evaluate("""root => {
        const nodes = [root, ...root.querySelectorAll('*')];
        const scrollable = nodes.filter(node => {
          const style = getComputedStyle(node);
          return node.getClientRects().length && /(auto|scroll)/.test(style.overflowY)
            && node.scrollHeight > node.clientHeight + 2;
        });
        return scrollable.map(node => {
          node.scrollTop = node.scrollHeight;
          return {className: String(node.className), top: node.scrollTop,
            maximum: node.scrollHeight - node.clientHeight};
        });
    }""")


CONTOUR_SCRIPT = """node => {
  const style = getComputedStyle(node);
  const after = getComputedStyle(node, '::after');
  return [style.outlineStyle, style.outlineWidth, style.outlineColor,
    style.boxShadow, style.borderTopStyle, style.borderTopWidth, style.borderTopColor,
    after.outlineStyle, after.outlineWidth, after.outlineColor, after.boxShadow].join('|');
}"""


@pytest.mark.frontend
def test_skip_link_preserves_dashboard_query_and_focus(frontend_server, browser_context):
    page = browser_context.new_page()
    expected_hash = "#statistik?ort=Z%C3%BCrich"
    page.goto(frontend_server + expected_hash, wait_until="networkidle")
    expect(page.locator("#tab-statistik .vs-status__count")).to_contain_text("42")

    page.keyboard.press("Tab")
    skip = page.get_by_role("link", name="Zum Inhalt springen")
    expect(skip).to_be_focused()
    page.keyboard.press("Enter")
    expect(page).to_have_url(frontend_server + expected_hash)
    expect(page.locator("#main-content")).to_be_focused()

    page.reload(wait_until="networkidle")
    expect(page).to_have_url(frontend_server + expected_hash)
    expect(page.locator("#tab-statistik .vs-status__count")).to_contain_text("42")
    expect(page.locator("#tab-statistik .dashboard-panel")).to_have_count(2)
    page.close()


@pytest.mark.frontend
def test_dashboard_intersection_highlight_has_visible_contour(frontend_server, browser_context):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1440, "height": 800})
    page.goto(frontend_server + "#statistik?ort=Z%C3%BCrich", wait_until="networkidle")
    treemap = page.locator('.dashboard-panel[data-panel-id="a"]')
    matrix = page.locator('.dashboard-panel[data-panel-id="b"]')
    cells = matrix.locator(".dashboard-matrix__cell")
    initial_contours = cells.evaluate_all("""nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      const after = getComputedStyle(node, '::after');
      return [style.outlineStyle, style.outlineWidth, style.outlineColor,
        style.boxShadow, style.borderTopStyle, style.borderTopWidth, style.borderTopColor,
        after.outlineStyle, after.outlineWidth, after.outlineColor, after.boxShadow].join('|');
    })""")
    treemap.locator(".dashboard-treemap__mark").first.click()
    detail = page.locator(".selection-detail__panel")
    expect(detail).to_be_visible()
    selected_ids = set(detail.locator(".dashboard-selection__records button").evaluate_all(
        "nodes => nodes.map(node => node.dataset.recordId)"
    ))
    assert selected_ids

    classification = matrix.locator(".dashboard-matrix__cell").evaluate_all(
        """(nodes, selected) => nodes.map(node => ({
          highlighted: node.classList.contains('dashboard-mark--highlighted'),
          intersects: (node._dashboardAggregate?.recordIds || []).some(id => selected.includes(id)),
        }))""",
        list(selected_ids),
    )
    assert classification and all(item["highlighted"] == item["intersects"] for item in classification)
    highlighted_index = cells.evaluate_all(
        "nodes => nodes.findIndex(node => node.classList.contains('dashboard-mark--highlighted'))"
    )
    assert highlighted_index >= 0
    highlighted = cells.nth(highlighted_index)
    expect(highlighted).to_be_visible()
    selected_contour = highlighted.evaluate(CONTOUR_SCRIPT)
    assert selected_contour != initial_contours[highlighted_index]

    detail.press("Escape")
    expect(page.locator(".selection-detail__panel")).to_have_count(0)
    expect(page.locator(".dashboard-mark--highlighted")).to_have_count(0)
    assert highlighted.evaluate(CONTOUR_SCRIPT) == initial_contours[highlighted_index]
    page.close()


@pytest.mark.frontend
@pytest.mark.parametrize("width,height", [(1440, 600), (800, 600), (390, 640)])
def test_every_workspace_is_bounded_scrollable_and_has_shared_controls(
    frontend_server, browser_context, width, height
):
    page = browser_context.new_page()
    page.set_viewport_size({"width": width, "height": height})
    page.goto(frontend_server, wait_until="networkidle")
    _seed_basket(page)

    for path, workspace_selector in VIEWS:
        page.goto(frontend_server + f"#{path}", wait_until="networkidle")
        tab_id = path.split("/", maxsplit=1)[0]
        active = page.locator(f"#tab-{tab_id}")
        workspace = page.locator(workspace_selector)
        expect(active).to_be_visible()
        expect(workspace).to_be_visible()
        tab_box = _box(active)
        work_box = _box(workspace)
        assert tab_box["left"] >= -1 and tab_box["right"] <= width + 1
        assert tab_box["top"] >= 0 and tab_box["bottom"] <= height + 1
        assert work_box["width"] >= min(280, width - 2) and work_box["height"] >= 80
        assert work_box["left"] >= tab_box["left"] - 1 and work_box["right"] <= tab_box["right"] + 1
        assert work_box["top"] >= tab_box["top"] - 1 and work_box["bottom"] <= tab_box["bottom"] + 1
        scrolls = _scroll_report(active)
        assert all(item["top"] >= item["maximum"] - 2 for item in scrolls), (path, scrolls)

        if tab_id == "korb":
            continue
        expect(active.locator(".research-toolbar")).to_be_visible()
        toggle = active.get_by_role("button", name="Filter ein- oder ausblenden")
        expect(toggle).to_be_visible()
        before = toggle.get_attribute("aria-expanded")
        if before == "false":
            toggle.click()
        expect(toggle).to_have_attribute("aria-expanded", "true")
        sidebar = active.locator(".view-sidebar")
        expect(sidebar).to_be_visible()
        expect(active.locator(".vs-status__count")).to_be_visible()
        side_box = _box(sidebar)
        open_work_box = _box(workspace)
        assert side_box["left"] >= tab_box["left"] - 1 and side_box["right"] <= tab_box["right"] + 1
        assert side_box["top"] >= tab_box["top"] - 1 and side_box["bottom"] <= tab_box["bottom"] + 1
        assert open_work_box["left"] >= tab_box["left"] - 1 and open_work_box["right"] <= tab_box["right"] + 1
        open_scrolls = _scroll_report(active)
        assert all(item["top"] >= item["maximum"] - 2 for item in open_scrolls), (path, open_scrolls)
        toggle.click()
        expect(toggle).to_have_attribute("aria-expanded", "false")
        expect(sidebar).to_be_hidden()
        if before == "true":
            toggle.click()
            expect(toggle).to_have_attribute("aria-expanded", "true")
    page.close()


@pytest.mark.frontend
def test_dashboard_panels_expose_current_chart_in_region_name(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    panel_a = page.get_by_role("region", name=re.compile(r"Panel A.*Dokumenttypen-Treemap"))
    panel_b = page.get_by_role("region", name=re.compile(r"Panel B.*Matrix"))
    expect(panel_a).to_be_visible()
    expect(panel_b).to_be_visible()
    panel_a.get_by_label("Diagramm in Panel A").select_option("time")
    expect(page.get_by_role("region", name=re.compile(r"Panel A.*Zeitverteilung"))).to_be_visible()
    assert page.get_by_role("region", name=re.compile(r"Panel A.*Dokumenttypen-Treemap")).count() == 0
    page.close()


@pytest.mark.frontend
def test_no_javascript_has_explanation_and_direct_links(frontend_server, frontend_browser):
    context = frontend_browser.new_context(java_script_enabled=False)
    page = context.new_page()
    page.goto(frontend_server, wait_until="networkidle")
    fallback = page.locator('section[aria-labelledby="noscript-title"]')
    expect(fallback).to_be_visible()
    expect(fallback).to_contain_text(re.compile("JavaScript", re.IGNORECASE))
    expect(fallback.locator('a[href="projekt.html"]')).to_be_visible()
    expect(fallback.locator('a[href="data/m3gim.jsonld"]')).to_be_visible()
    expect(page.locator("#load-status")).to_be_hidden()
    context.close()


@pytest.mark.frontend
def test_blocked_main_import_ends_in_understandable_error(frontend_server, frontend_browser):
    context = frontend_browser.new_context()
    page = context.new_page()
    page.route("**/js/main.js*", lambda route: route.abort("failed"))
    page.goto(frontend_server, wait_until="domcontentloaded")
    error = page.locator('#load-status [role="alert"]')
    expect(error).to_be_visible(timeout=10_000)
    expect(error).to_contain_text(re.compile(r"(Anwendung|Archivdaten).*(nicht|Fehler)", re.IGNORECASE))
    expect(page.locator("#load-status")).to_have_attribute("aria-busy", "false")
    expect(page.locator("#load-status .load-status__ring")).to_have_count(0)
    page.unroute("**/js/main.js*")
    with page.expect_navigation(wait_until="networkidle"):
        error.get_by_role("button", name="Neu laden").click()
    expect(page.locator("#main-content")).to_be_visible()
    expect(page.locator("#tab-bestand .archiv-main")).to_be_visible()
    context.close()


@pytest.mark.frontend
def test_delayed_main_import_keeps_tabs_inert_until_first_render(
    frontend_server, browser_context
):
    page = browser_context.new_page()
    held_main_routes = []
    page.route("**/js/main.js*", lambda route: held_main_routes.append(route))

    with page.expect_request("**/js/main.js*"):
        page.goto(frontend_server, wait_until="domcontentloaded")
    expect(page.locator("#load-status")).to_be_visible()
    assert len(held_main_routes) == 1
    tab_bar = page.locator(".tab-bar")
    assert tab_bar.evaluate("element => element.inert")
    info_links = page.locator(".topbar__info a")
    expect(info_links).to_have_count(3)
    info_links.first.focus()
    assert info_links.first.evaluate("element => document.activeElement === element")

    held_main_routes[0].continue_()
    expect(page.locator("#tab-bestand .archiv-main")).to_be_visible()
    tablist = page.get_by_role("tablist", name="Hauptnavigation")
    assert not tablist.evaluate("element => element.inert")
    page.locator('[data-tab="indizes"]').first.click()
    menu = page.get_by_role("menu")
    expect(menu).to_be_visible()
    expect(menu.get_by_role("menuitemradio")).to_have_count(4)
    page.close()
