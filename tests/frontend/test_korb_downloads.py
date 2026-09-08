"""Browser checks for the four basket download paths."""

import csv
import io
import json
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

pytest.importorskip("playwright")


IDS = ["m3gim-data:NIM_069", "m3gim-data:NIM_004_24"]


@pytest.fixture
def page(browser_context):
    page = browser_context.new_page()
    yield page


@pytest.mark.frontend
def test_basket_downloads_are_parseable(frontend_server, page):
    stored = [*IDS, "m3gim-data:missing", None, "https://example.org/not-a-record"]
    page.add_init_script(
        f"localStorage.setItem('m3gim-korb', JSON.stringify({json.dumps(stored)}))"
    )
    page.goto(frontend_server + "#korb")
    page.wait_for_selector(".korb-card")
    assert page.locator(".korb-card").count() == len(IDS)
    assert page.locator(".korb-title").inner_text() == f"Korb ({len(IDS)})"

    downloads = {}
    for label in ["CSV", "BibTeX", "JSON-LD", "GEXF"]:
        with page.expect_download() as pending:
            page.get_by_role("button", name=f"↓ {label}").click()
        download = pending.value
        downloads[label] = (
            download.suggested_filename,
            Path(download.path()).read_bytes(),
        )

    csv_name, csv_bytes = downloads["CSV"]
    assert csv_name == "m3gim-korb.csv"
    assert csv_bytes.startswith(b"\xef\xbb\xbf")
    rows = list(csv.reader(io.StringIO(csv_bytes.decode("utf-8-sig"))))
    assert len(rows) == len(IDS) + 1
    assert {row[0] for row in rows[1:]} == {"UAKUG/NIM_069", "UAKUG/NIM_004 24"}

    bib_name, bib_bytes = downloads["BibTeX"]
    assert bib_name == "m3gim-korb.bib"
    bib = bib_bytes.decode("utf-8-sig")
    assert bib.count("@misc{") == len(IDS)
    assert "Diverse Programme \\& Kritiken" in bib

    json_name, json_bytes = downloads["JSON-LD"]
    assert json_name.startswith("m3gim-korb-") and json_name.endswith(".jsonld")
    graph = json.loads(json_bytes)["@graph"]
    exported = {node.get("@id") for node in graph if node.get("@type") == "rico:Record"}
    assert exported == set(IDS)

    gexf_name, gexf_bytes = downloads["GEXF"]
    assert gexf_name.startswith("m3gim-korb-") and gexf_name.endswith(".gexf")
    root = ET.fromstring(gexf_bytes)
    nodes = root.findall(".//{http://gexf.net/1.3}node")
    assert len(nodes) > len(IDS)


@pytest.mark.frontend
def test_map_has_one_keyboard_operable_drawing(frontend_server, page):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
        "console",
        lambda message: (
            errors.append(message.text) if message.type == "error" else None
        ),
    )
    page.goto(frontend_server, wait_until="networkidle")
    page.locator("#btn-karte").click()
    drawing = page.locator("#tab-karte svg.mob-map__svg")
    try:
        drawing.wait_for(timeout=10_000)
    except Exception:
        panel = page.locator("#tab-karte")
        pytest.fail(
            f"Karte nicht aufgebaut; Browserfehler: {errors}; "
            f"panel={panel.get_attribute('class')!r}, text={panel.inner_text()!r}"
        )
    assert drawing.get_attribute("tabindex") == "0"
    assert page.locator("#tab-karte .mob-node[tabindex]").count() == 0
    focus_rings = page.locator("#tab-karte .mob-node__focus")
    assert (
        focus_rings.evaluate_all(
            "nodes => nodes.filter(node => node.getAttribute('display') !== 'none').length"
        )
        == 0
    )
    drawing.focus()
    first_label = drawing.get_attribute("aria-label")
    assert (
        focus_rings.evaluate_all(
            "nodes => nodes.filter(node => node.getAttribute('display') !== 'none').length"
        )
        == 1
    )
    drawing.press("ArrowRight")
    moved_label = drawing.get_attribute("aria-label")
    assert "Ort " in moved_label and moved_label != first_label
    assert (
        focus_rings.evaluate_all(
            "nodes => nodes.filter(node => node.getAttribute('display') !== 'none').length"
        )
        == 1
    )
    drawing.press("Escape")
    assert (
        focus_rings.evaluate_all(
            "nodes => nodes.filter(node => node.getAttribute('display') !== 'none').length"
        )
        == 0
    )
    assert (
        not page.locator("#tab-karte .mob-tip")
        .get_attribute("class")
        .endswith("mob-tip--on")
    )
    drawing.focus()
    drawing.press("ArrowRight")
    original_hash = page.url
    drawing.press("Enter")
    assert page.locator('.selection-detail__panel').is_visible()
    assert page.url == original_hash
    page.get_by_role('button', name='Nach diesem Ort filtern', exact=True).click()
    page.wait_for_function("() => location.hash.includes('ort=')")


@pytest.mark.frontend
def test_map_tooltip_escapes_roles_and_keeps_undated_context(frontend_server, page):
    page.route(
        "**/*",
        lambda route: (
            route.continue_()
            if route.request.url.startswith(frontend_server)
            else route.abort()
        ),
    )
    page.goto(frontend_server, wait_until="networkidle")
    page.locator("#btn-karte").click()
    page.locator("#tab-karte svg.mob-map__svg").wait_for(timeout=10_000)

    hostile = '<img id="executed-role" src=x onerror="window.__roleExecuted=1">'
    result = page.evaluate(
        """async hostile => {
          const { nodeTooltipHtml } = await import('./js/views/karte-map.js');
          const host = document.createElement('div');
          host.id = 'hostile-map-tooltip';
          host.innerHTML = nodeTooltipHtml({ city: 'Testort', shown: 1,
            firstYear: null, lastYear: null, undated: 1,
            breakdown: [{ id: 'role', label: hostile, count: 1,
              color: '#123456' }] });
          document.body.appendChild(host);
          return { text: host.textContent, images: host.querySelectorAll('img').length,
            executed: window.__roleExecuted || 0 };
        }""",
        hostile,
    )
    assert result["images"] == 0 and result["executed"] == 0
    assert hostile in result["text"]
    assert "1 aus undatierten Dokumenten" in result["text"]

    undated = page.locator("#tab-karte .mob-node").evaluate_all(
        """nodes => nodes.map((node, index) => ({ index,
          undated: node.__data__?.undated || 0,
          shown: node.__data__?.shown || 0,
          dots: node.querySelectorAll('.mob-node__dot').length }))
          .find(entry => entry.undated > 0) || null"""
    )
    assert undated is not None, (
        "Der ausgelieferte Graph enthält keinen undatierten Ortskontext"
    )
    node = page.locator("#tab-karte .mob-node").nth(undated["index"])
    node.dispatch_event("mouseenter", {"clientX": 300, "clientY": 200})
    tooltip = page.locator("#tab-karte .mob-tip")
    assert f"{undated['undated']} aus undatierten Dokumenten" in tooltip.inner_text()
    assert undated["dots"] == 1, (
        "Undatierter Dokumentkontext verlor seinen Kartenpunkt"
    )


@pytest.mark.frontend
def test_map_occurrences_never_escape_shared_document_cut(frontend_server, page):
    page.goto(frontend_server, wait_until="networkidle")
    page.locator("#btn-karte").click()
    drawing = page.locator("#tab-karte svg.mob-map__svg")
    drawing.wait_for(timeout=10_000)
    search = page.get_by_role('combobox', name='Suche', exact=True)
    search.fill("nim_004")
    search.press('Enter')
    page.wait_for_timeout(150)

    verdict = page.evaluate(
        """async () => {
          const [{ recordsFor }, { getFilter }] = await Promise.all([
            import('./js/data/records-for.js'), import('./js/ui/filter-state.js'),
          ]);
          const cut = recordsFor(window.m3gim.store, getFilter()).ids;
          const drawn = [...document.querySelectorAll('#tab-karte .mob-node')]
            .flatMap(node => (node.__data__?.evidence || []).map(item => item.recordId));
          return { cut: [...cut], drawn, outside: drawn.filter(id => !cut.has(id)) };
        }"""
    )
    assert len(verdict["cut"]) == 32
    assert verdict["drawn"]
    assert verdict["outside"] == []
