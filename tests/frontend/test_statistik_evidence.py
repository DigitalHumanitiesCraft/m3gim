import json
import re
from pathlib import Path

import pytest

pytest.importorskip("playwright")
from playwright.sync_api import expect


TASK4_IDS = {
    "m3gim-data:NIM_004_18", "m3gim-data:NIM_004_24",
    "m3gim-data:NIM_004_29", "m3gim-data:NIM_005_17",
    "m3gim-data:NIM_011_3", "m3gim-data:NIM_011_5",
    "m3gim-data:NIM_011_6", "m3gim-data:NIM_142_22_4",
    "m3gim-data:NIM_142_27",
}


@pytest.mark.frontend
def test_dashboard_defaults_and_two_independent_equal_panels(frontend_server, browser_context):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    panels = page.locator(".dashboard-panel")
    expect(panels).to_have_count(2)
    selectors = panels.locator('select[aria-label^="Diagramm in Panel"]')
    expect(selectors.nth(0)).to_have_value("treemap")
    expect(selectors.nth(1)).to_have_value("matrix")
    selectors.nth(1).select_option("treemap")
    expect(page.locator(".dashboard-treemap")).to_have_count(2)
    expect(selectors.nth(0)).to_have_value("treemap")
    assert "dash-panel-b=" in page.url
    page.reload(wait_until="networkidle")
    expect(page.locator(".dashboard-treemap")).to_have_count(2)
    page.close()


@pytest.mark.frontend
def test_matrix_composer_axis_opens_all_source_attested_documents(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(
        frontend_server
        + "#statistik?ort=Bayreuth&werk=Tristan%20und%20Isolde&jahr=1954-1954",
        wait_until="networkidle",
    )
    panel = page.locator('.dashboard-panel[data-panel-id="b"]')
    panel.get_by_label("Dimensionspaar").select_option("doctype-composer")
    wagner = panel.get_by_role("button", name=re.compile(r"^Wagner, Richard: 9 Dokumente$"))
    wagner.click()
    detail = page.locator(".selection-detail__panel")
    expect(detail).to_be_visible()
    ids = set(detail.locator(".dashboard-selection__records button").evaluate_all(
        "els => els.map(el => el.dataset.recordId)"
    ))
    assert ids == TASK4_IDS
    expect(detail.locator(".dashboard-selection__witnesses li").first).to_be_hidden()
    detail.locator('.detail-disclosure > summary', has_text='Belege für diese Auswahl').click()
    expect(detail.locator(".detail-disclosure[open] .dashboard-selection__witnesses li").first).to_be_visible()
    with page.expect_download() as source_download:
        detail.get_by_role("button", name="Quellen JSON").click()
    payload = json.loads(source_download.value.path().read_text(encoding="utf-8"))
    assert payload["marks"][0]["witnesses"]
    assert payload["marks"][0]["sourceRefs"]
    assert payload["marks"][0]["dimensions"] == {
        "pair": "doctype-composer",
        "binding": "derived",
        "composer": "Wagner, Richard",
    }
    page.close()


@pytest.mark.frontend
def test_selection_union_filter_basket_and_download(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    panels = page.locator(".dashboard-panel")
    panels.nth(0).locator(".dashboard-values summary").click()
    panels.nth(1).locator(".dashboard-values summary").click()
    panels.nth(0).locator(".dashboard-values__select").first.click()
    panels.nth(1).locator(".dashboard-values__add").first.click()
    detail = page.locator(".selection-detail__panel")
    expect(detail.locator(".dashboard-selection__union")).to_contain_text("ODER-Auswahl aus 2")
    expected_ids = detail.locator(".dashboard-selection__records button").count()
    detail.get_by_role("button", name="Dokumente zum Korb hinzufügen").click()
    stored = page.evaluate("JSON.parse(localStorage.getItem('m3gim-korb') || '[]').length")
    assert stored == expected_ids
    with page.expect_download() as download_info:
        detail.get_by_role("button", name="Auswahl CSV").click()
    assert download_info.value.suggested_filename == "m3gim-dashboard-auswahl.csv"
    with page.expect_download() as source_download:
        detail.get_by_role("button", name="Quellen JSON").click()
    assert source_download.value.suggested_filename == "m3gim-dashboard-quellen.json"
    detail.get_by_role("button", name="Auswahl als Filter anwenden").click()
    assert "praedikat=" in page.url and "%22records%22" in page.url
    page.close()


@pytest.mark.frontend
def test_time_brush_focus_and_explicit_filter(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    panel = page.locator('.dashboard-panel[data-panel-id="a"]')
    panel.get_by_label("Diagramm in Panel A").select_option("time")
    panel.get_by_label("Zeitaufteilung").select_option("doctype")
    legend_colors = panel.locator(".dashboard-time__legend-swatch").evaluate_all(
        "els => Object.fromEntries(els.map(el => [el.dataset.stackKey, getComputedStyle(el).backgroundColor]))"
    )
    assert len(legend_colors) == 16
    assert len(set(legend_colors.values())) == 16
    panel.locator("[data-range-from]").fill("")
    panel.locator("[data-range-to]").fill("3000")
    panel.get_by_role("button", name="Lokal fokussieren").click()
    expect(panel.locator(".dashboard-time-range__validation")).to_contain_text("gültige Jahreszahlen")
    assert "jahr=" not in page.url
    overlay = panel.locator(".dashboard-time__brush .overlay")
    box = overlay.bounding_box()
    page.mouse.move(box["x"] + box["width"] * 0.35, box["y"] + box["height"] / 2)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"] * 0.55, box["y"] + box["height"] / 2)
    page.mouse.up()
    expect(panel.get_by_role("button", name="Zeitfenster als Filter anwenden")).to_be_visible()
    panel.locator("[data-range-from]").fill("1950")
    panel.locator("[data-range-to]").fill("1955")
    panel.get_by_role("button", name="Lokal fokussieren").click()
    expect(panel.get_by_role("button", name="Zeitfenster als Filter anwenden")).to_be_visible()
    panel.get_by_role("button", name="Zeitfenster als Filter anwenden").click()
    assert "jahr=1950-1955" in page.url
    filtered_colors = panel.locator(".dashboard-time__legend-swatch").evaluate_all(
        "els => Object.fromEntries(els.map(el => [el.dataset.stackKey, getComputedStyle(el).backgroundColor]))"
    )
    assert all(legend_colors[key] == color for key, color in filtered_colors.items())
    expect(panel.locator(".dashboard-note:not(.dashboard-time__brush-note)")).to_contain_text("undatierte Dokumente")
    page.close()


@pytest.mark.frontend
def test_stacked_interval_dates_remain_selectable_with_document_sources(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    page.evaluate("""() => import('./js/ui/filter-state.js').then(({setFilter}) => setFilter({
      predicates: [{type: 'records', ids: [
        'm3gim-data:NIM_003_1_1', 'm3gim-data:NIM_003_1_2', 'm3gim-data:NIM_003_1_8'
      ]}]
    }))""")
    panel = page.locator('.dashboard-panel[data-panel-id="a"]')
    panel.get_by_label("Diagramm in Panel A").select_option("time")
    panel.get_by_label("Zeitaufteilung").select_option("doctype")
    panel.locator(".dashboard-values summary").click()
    panel.locator(".dashboard-values__select").filter(
        has_text="1944-01-01/1944-12-31 · Programm · 3 Dokumente"
    ).click()
    detail = page.locator(".selection-detail__panel")
    expect(detail.locator(".dashboard-selection__records button")).to_have_count(3)
    expect(detail.locator(".dashboard-selection__evidence")).to_have_text(
        "3 Belege · 3 Quellenstellen"
    )
    detail.locator('.detail-disclosure > summary', has_text='Belege für diese Auswahl').click()
    expect(detail.locator(".detail-disclosure[open] .dashboard-selection__witnesses li")).to_have_count(3)
    with page.expect_download() as source_download:
        detail.get_by_role("button", name="Quellen JSON").click()
    payload = json.loads(source_download.value.path().read_text(encoding="utf-8"))
    assert {(source["sheet"], source["row"]) for source in payload["marks"][0]["sourceRefs"]} == {
        ("Objekte", 31), ("Objekte", 32), ("Objekte", 38),
    }
    page.close()


@pytest.mark.frontend
def test_all_seven_choices_render_and_companion_highlight(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    panel = page.locator('.dashboard-panel[data-panel-id="a"]')
    selector = panel.get_by_label("Diagramm in Panel A")
    expected = {
        "treemap": ".dashboard-treemap",
        "matrix": ".dashboard-matrix",
        "time": ".dashboard-time__mark",
        "sankey": ".dashboard-sankey",
        "upset": ".dashboard-upset",
        "comparison": ".dashboard-empty",
        "map": ".dashboard-map",
    }
    for choice, target in expected.items():
        selector.select_option(choice)
        expect(panel.locator(target).first).to_be_visible()
        selector = panel.get_by_label("Diagramm in Panel A")

    selector.select_option("treemap")
    first_mark = panel.locator(".dashboard-treemap__mark").first
    first_mark.click()
    expect(page.locator('.dashboard-panel[data-panel-id="b"] .dashboard-mark--highlighted').first).to_be_visible()
    page.close()


@pytest.mark.frontend
def test_selection_survives_panel_replacement_and_restores_focus(frontend_server, browser_context):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    panel_a = page.locator('.dashboard-panel[data-panel-id="a"]')
    panel_b = page.locator('.dashboard-panel[data-panel-id="b"]')
    panel_a.locator(".dashboard-values summary").click()
    panel_a.locator(".dashboard-values__select").first.click()
    detail = page.locator(".selection-detail__panel")
    expect(detail).to_be_visible()
    selected_records = detail.locator(".dashboard-selection__records button").count()
    assert selected_records > 0

    panel_b.get_by_label("Diagramm in Panel B").select_option("time")
    expect(detail).to_be_visible()
    expect(panel_b.locator(".dashboard-mark--highlighted").first).to_be_visible()
    panel_a.get_by_label("Diagramm in Panel A").select_option("matrix")
    expect(detail.locator(".dashboard-selection__records button")).to_have_count(selected_records)
    detail.press("Escape")
    expect(panel_a).to_be_focused()
    page.close()


@pytest.mark.frontend
def test_union_keeps_same_mask_from_different_upset_definitions(frontend_server, browser_context):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    panels = [page.locator(f'.dashboard-panel[data-panel-id="{panel_id}"]') for panel_id in ("a", "b")]
    for panel, family in zip(panels, ("person", "werk"), strict=True):
        panel.get_by_label(re.compile(r"Diagramm in Panel")).select_option("upset")
        for _ in range(3):
            panel.locator(".dashboard-panel__set-chip").first.click()
        panel.get_by_label("Familie der neuen Mengenbedingung").select_option(family)
        panel.get_by_role("button", name="Menge hinzufügen").click()
        panel.locator(".dashboard-values summary").click()
    panels[0].locator(".dashboard-values__add").first.click()
    panels[1].locator(".dashboard-values__add").first.click()
    detail = page.locator(".selection-detail__panel")
    expect(detail.locator(".dashboard-selection__union")).to_contain_text("ODER-Auswahl aus 2")
    expect(detail.locator(".dashboard-selection__marks li")).to_have_count(2)
    page.close()


@pytest.mark.frontend
def test_pinned_reference_persists_and_mixed_upset_sets_are_configurable(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + "#statistik?ort=Bayreuth", wait_until="networkidle")
    panel = page.locator('.dashboard-panel[data-panel-id="a"]')
    panel.get_by_label("Diagramm in Panel A").select_option("comparison")
    panel.get_by_role("button", name="Aktuellen Schnitt als A merken").click()
    expect(panel.locator(".dashboard-compare")).to_be_visible()
    expect(panel.locator(".dashboard-compare__value", has_text="A = B").first).to_be_visible()
    assert "dash-reference=" in page.url
    page.reload(wait_until="networkidle")
    panel = page.locator('.dashboard-panel[data-panel-id="a"]')
    expect(panel.locator(".dashboard-compare")).to_be_visible()
    panel.get_by_label("Diagramm in Panel A").select_option("upset")
    expect(panel.locator(".dashboard-panel__set-chip")).to_have_count(3)
    for _ in range(3):
        panel.locator(".dashboard-panel__set-chip").first.click()
    panel.get_by_label("Familie der neuen Mengenbedingung").select_option("person")
    person = panel.get_by_label("Wert der neuen Mengenbedingung").input_value()
    panel.get_by_role("button", name="Menge hinzufügen").click()
    panel.get_by_label("Familie der neuen Mengenbedingung").select_option("werk")
    work = panel.get_by_label("Wert der neuen Mengenbedingung").input_value()
    panel.get_by_role("button", name="Menge hinzufügen").click()
    expect(panel.locator(".dashboard-panel__set-chip")).to_have_count(2)
    assert person and work
    expect(panel.locator(".dashboard-upset")).to_be_visible()
    page.close()


@pytest.mark.frontend
@pytest.mark.parametrize("width", [390, 800, 1440, 2048])
def test_dense_dashboard_geometry_with_detail(frontend_server, browser_context, width):
    page = browser_context.new_page()
    page.set_viewport_size({"width": width, "height": 900})
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    first = page.locator('.dashboard-panel[data-panel-id="a"]')
    first.locator(".dashboard-values summary").click()
    trigger = first.locator(".dashboard-values__select").first
    trigger.click()
    detail = page.locator(".selection-detail__panel")
    expect(detail).to_be_visible()
    boxes = page.locator(".dashboard-panel").evaluate_all(
        "els => els.map(el => { const r=el.getBoundingClientRect(); return ({left:r.left,right:r.right,top:r.top,bottom:r.bottom}); })"
    )
    viewport = page.viewport_size
    assert all(box["left"] >= 0 and box["right"] <= viewport["width"] + 1 for box in boxes)
    if width >= 1200:
        assert max(box["bottom"] for box in boxes) >= 700
    detail.get_by_role("button", name="Schließen").click()
    expect(trigger).to_be_focused()
    page.close()


@pytest.mark.frontend
def test_missing_type_remains_reachable_as_evidence(frontend_server, browser_context):
    target = "m3gim-data:NIM_023_5"
    payload = json.loads(
        (Path(__file__).parents[2] / "docs/data/m3gim.jsonld").read_text(encoding="utf-8")
    )
    record = next(node for node in payload["@graph"] if node.get("@id") == target)
    record.pop("rico:hasDocumentaryFormType")
    browser_context.route("**/data/m3gim.jsonld", lambda route: route.fulfill(json=payload))
    page = browser_context.new_page()
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    panel = page.locator('.dashboard-panel[data-panel-id="a"]')
    panel.locator(".dashboard-values summary").click()
    panel.locator(".dashboard-values__select", has_text="Ohne Dokumenttyp").click()
    expect(page.locator(".dashboard-selection__records")).to_contain_text("NIM_023 5")
    page.close()
