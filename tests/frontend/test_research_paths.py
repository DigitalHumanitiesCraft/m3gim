"""End-to-end checks for research paths that cross view and export boundaries."""

from collections import Counter
from pathlib import Path
from xml.etree import ElementTree

import pytest

pytest.importorskip("playwright")

TASK4_IDS = {
    "m3gim-data:NIM_004_18",
    "m3gim-data:NIM_005_17",
    "m3gim-data:NIM_011_3",
    "m3gim-data:NIM_011_5",
    "m3gim-data:NIM_011_6",
    "m3gim-data:NIM_142_22_4",
    "m3gim-data:NIM_142_27",
}


@pytest.mark.frontend
def test_task4_canary_preserves_literal_basis_and_source_evidence(
    frontend_server, browser_context
):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1366, "height": 900})
    page.goto(
        frontend_server
        + "#bestand?ort=Bayreuth&werk=Tristan%20und%20Isolde&jahr=1954-1954",
        wait_until="networkidle",
    )
    page.wait_for_selector("#bestand-tbody tr[data-record-row]")

    shipped = page.evaluate(
        """ids => ids.map(id => {
                const record = window.m3gim.store.records.get(id);
                const source = record && record['m3gim-ontology:xlsxSource'];
                return [id, record && record['rico:identifier'], source && source['m3gim-ontology:xlsxRow']];
            })""",
        sorted(TASK4_IDS),
    )
    assert {row[0] for row in shipped if row[1] and row[2]} == TASK4_IDS
    rendered = set(
        page.locator("#bestand-tbody tr[data-record-row]").evaluate_all(
            "rows => rows.map(row => row.dataset.recordRow)"
        )
    )
    assert rendered == (TASK4_IDS - {"m3gim-data:NIM_142_22_4"}) | {
        "m3gim-data:NIM_142_22"
    }
    assert "7 von" in page.locator("#tab-bestand .vs-status__count").inner_text()
    filter_text = page.locator("#tab-bestand .filter-strip").inner_text()
    assert all(
        value in filter_text for value in ("Bayreuth", "Tristan und Isolde", "1954")
    )

    page.locator('[data-tab="chronik"]').first.click()
    page.wait_for_selector("#tab-chronik .vs-status__count")
    assert "ort=Bayreuth" in page.url
    assert "werk=Tristan%20und%20Isolde" in page.url
    assert "jahr=1954-1954" in page.url
    assert "7 von" in page.locator("#tab-chronik .vs-status__count").inner_text()
    chronik_filter_text = page.locator("#tab-chronik .filter-strip").inner_text()
    assert all(
        value in chronik_filter_text
        for value in ("Bayreuth", "Tristan und Isolde", "1954")
    )

    page.locator('[data-tab="bestand"]').first.click()
    first_id = sorted(TASK4_IDS)[0]
    first = page.locator(f'#bestand-tbody tr[data-record-row="{first_id}"]')
    first.click()
    assert page.locator(".prov-pill[aria-label*='Zeile']").first.is_visible()


@pytest.mark.frontend
def test_narrow_network_draws_nodes_inside_visible_plot(
    frontend_server, browser_context
):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 800, "height": 900})
    page.goto(frontend_server, wait_until="networkidle")
    page.locator('[data-tab="netzwerk"]').first.click()
    page.wait_for_selector(".netzwerk-node", state="visible")

    geometry = page.evaluate(
        """() => {
                const plot = document.querySelector('.netzwerk__plot').getBoundingClientRect();
                const nodes = [...document.querySelectorAll('.netzwerk-node')];
                const inside = nodes.filter(node => {
                    const box = node.getBoundingClientRect();
                    const style = getComputedStyle(node);
                    const cx = box.left + box.width / 2;
                    const cy = box.top + box.height / 2;
                    return box.width > 0 && box.height > 0
                        && style.visibility === 'visible' && Number(style.opacity) > 0
                        && cx >= plot.left && cx <= plot.right
                        && cy >= plot.top && cy <= plot.bottom;
                });
                return {total: nodes.length, inside: inside.length};
            }"""
    )
    plot = page.locator(".netzwerk__plot").bounding_box()
    assert plot["width"] >= 700 and plot["height"] >= 400
    assert geometry["total"] >= 900
    assert geometry["inside"] == geometry["total"]


@pytest.mark.frontend
@pytest.mark.parametrize("mode", ["twomode", "projection"])
def test_network_download_matches_drawn_projection_and_document_cut(
    frontend_server, browser_context, mode
):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1366, "height": 900})
    page.goto(frontend_server + "#netzwerk?suche=nim_004", wait_until="networkidle")
    page.wait_for_selector("#netzwerk-canvas canvas", state="attached")
    if mode == "projection":
        sidebar_toggle = page.locator("#tab-netzwerk .view-shell__sidebar-toggle")
        if (
            sidebar_toggle.is_visible()
            and sidebar_toggle.get_attribute("aria-expanded") == "false"
        ):
            sidebar_toggle.click()
        control = page.locator("label.vs-toggle", has_text="Dokumente als Knoten")
        section_toggle = control.locator("xpath=ancestor::section[1]/button")
        if section_toggle.get_attribute("aria-expanded") == "false":
            section_toggle.click()
        control.click()
        assert not control.locator("input").is_checked()
        page.wait_for_function(
            "document.querySelectorAll('.netzwerk-node--record').length === 0"
        )

    expected = page.evaluate(
        """async () => {
                const {recordsFor} = await import('./js/data/records-for.js');
                const {getFilter} = await import('./js/ui/filter-state.js');
                const {buildTwoMode, buildProjection} = await import('./js/views/_netzwerk-geometry.js');
                const cut = recordsFor(window.m3gim.store, getFilter());
                const graph = MODE === 'projection'
                    ? buildProjection(window.m3gim.store, {records: cut.ids})
                    : buildTwoMode(window.m3gim.store, {records: cut.ids});
                return {
                    cut: [...cut.ids].sort(),
                    nodes: graph.nodes.map(node => node.id).sort(),
                    edges: graph.edges.map(edge => [edge.a, edge.b, edge.weight]).sort(),
                };
            }""".replace("MODE", repr(mode))
    )
    assert expected["cut"]
    assert all("NIM_004" in record_id for record_id in expected["cut"])

    with page.expect_download() as pending:
        page.get_by_role("button", name="Netzwerk als GEXF laden").click()
    xml = Path(pending.value.path()).read_text(encoding="utf-8")
    root = ElementTree.fromstring(xml)
    ns = {"g": "http://gexf.net/1.3"}
    nodes = sorted(node.attrib["id"] for node in root.findall(".//g:node", ns))
    edges = sorted(
        [edge.attrib["source"], edge.attrib["target"], float(edge.attrib["weight"])]
        for edge in root.findall(".//g:edge", ns)
    )

    assert nodes == expected["nodes"]
    assert Counter(map(tuple, edges)) == Counter(map(tuple, expected["edges"]))
    record_nodes = sorted(node for node in nodes if node.startswith("record:"))
    expected_records = (
        sorted(f"record:{record_id}" for record_id in expected["cut"])
        if mode == "twomode"
        else []
    )
    assert record_nodes == expected_records
