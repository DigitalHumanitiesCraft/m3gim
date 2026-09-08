"""The coordinated map retains every place and its source evidence."""
import re
import json
from urllib.parse import quote

import pytest
from playwright.sync_api import BrowserContext, expect

pytestmark = pytest.mark.frontend


def test_map_lists_unlocated_evidence_and_highlights_without_zoom_loss(
    frontend_server: str, browser_context: BrowserContext,
) -> None:
    page = browser_context.new_page()
    page.set_viewport_size({"width": 2048, "height": 1000})
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    first = page.locator('.dashboard-panel[data-panel-id="a"]')
    second = page.locator('.dashboard-panel[data-panel-id="b"]')
    first.get_by_label("Diagramm in Panel A").select_option("map")
    first.locator(".mob-node").first.wait_for()
    first.locator(".dashboard-values summary").click()
    expect(first.locator(".dashboard-values__select")).to_have_count(91)
    unlocated = page.evaluate("""async () => {
      const {buildOccurrences, groupPlaces} = await import('./js/data/place-evidence.js');
      return groupPlaces(buildOccurrences(window.m3gim.store)).find(group => !group.located).city;
    }""")
    first.get_by_role("button", name=re.compile(r"^" + re.escape(unlocated) + r" ·")).click()
    detail = page.locator(".selection-detail__panel")
    expect(detail.locator(".selection-detail__title")).to_have_text(unlocated)
    assert detail.locator(".dashboard-selection__witnesses li").count() > 0
    assert detail.locator(".dashboard-selection__records button").count() > 0
    detail.get_by_role("button", name="Schließen", exact=True).click()
    second.get_by_label("Diagramm in Panel B").select_option("treemap")
    second.locator(".dashboard-values summary").click()
    first.get_by_role("button", name="Hineinzoomen", exact=True).click()
    zoom = first.locator("svg.mob-map__svg").evaluate("el => el.__zoom.k")
    second.locator(".dashboard-values__select").first.click()
    selected = detail.locator(".dashboard-selection__records button").evaluate_all(
        "els => els.map(el => el.dataset.recordId)"
    )
    matches = first.locator(".mob-node").evaluate_all("""(nodes, ids) => nodes.map(node => ({
      expected: [...node.__data__.records].some(id => ids.includes(id)),
      actual: node.classList.contains('mob-node--selected')
    }))""", selected)
    assert any(item["expected"] for item in matches)
    assert all(item["expected"] == item["actual"] for item in matches)
    assert first.locator("svg.mob-map__svg").evaluate("el => el.__zoom.k") == zoom
    assert "praedikat=" not in page.url
    page.close()


def test_missing_geometry_keeps_every_dashboard_place_reachable(
    frontend_server: str, browser_context: BrowserContext,
) -> None:
    browser_context.route("**/data/geo/*", lambda route: route.fulfill(
        status=200, content_type="application/json", body="invalid geometry"
    ))
    page = browser_context.new_page()
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    panel = page.locator('.dashboard-panel[data-panel-id="a"]')
    panel.get_by_label("Diagramm in Panel A").select_option("map")
    expect(panel.locator(".dashboard-empty")).to_contain_text("Geometrie")
    panel.locator(".dashboard-values summary").click()
    expect(panel.locator(".dashboard-values__select")).to_have_count(91)
    page.close()


def test_upset_shows_membership_and_applies_three_way_intersection(
    frontend_server: str, browser_context: BrowserContext,
) -> None:
    config = {"chart": "upset", "config": {"sets": [
        {"facet": "verknuepfung", "value": value, "label": label}
        for value, label in (("person", "Person"), ("institution", "Institution"), ("werk", "Werk"))
    ]}}
    page = browser_context.new_page()
    page.set_viewport_size({"width": 2048, "height": 1000})
    page.goto(frontend_server + "#statistik?dash-panel-a=" + quote(json.dumps(config)),
              wait_until="networkidle")
    panel = page.locator('.dashboard-panel[data-panel-id="a"]')
    expect(panel.locator(".dashboard-upset__sets li")).to_have_count(3)
    expect(panel.locator(".dashboard-upset__membership")).to_have_count(21)
    triple = panel.locator(".dashboard-upset__row").evaluate_all("""rows => rows.filter(row =>
      row.querySelectorAll('[data-included="true"]').length === 3
    ).map(row => row._dashboardAggregate.count)""")
    assert triple == [106]
    panel.get_by_label("Schnittmodus").select_option("exclusive")
    expect(panel.locator(".dashboard-upset__membership")).to_have_count(21)
    panel.locator(".dashboard-values summary").click()
    panel.locator(".dashboard-values__select").filter(has_text="106 Dokumente").click()
    expect(page.locator(".dashboard-selection__records button")).to_have_count(106)
    page.get_by_role("button", name="Auswahl als Filter anwenden", exact=True).click()
    expect(page.locator("#tab-statistik .vs-status__count .fs-option__count")).to_have_text("106 von 188")
    page.get_by_role("button", name="Letzte Filteränderung rückgängig", exact=True).click()
    expect(page.locator("#tab-statistik .vs-status__count .fs-option__count")).to_have_text("188")
    assert page.evaluate("JSON.parse(localStorage.getItem('m3gim-korb') || '[]').length") == 0
    page.close()
