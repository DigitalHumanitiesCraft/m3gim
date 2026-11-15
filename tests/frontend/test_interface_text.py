"""Rendered interface text and the provenance key (interface plan 2026-11-15).

The source scan in tests/test_72_interface_separators.py misses labels built
from data at runtime, so every view is checked as rendered. Bestand and
Indizes must explain their provenance marks; Netzwerk and Chronik keep their
own legends and carry no second one.
"""

import pytest

pytest.importorskip("playwright")

VIEWS = ["bestand", "indizes", "chronik", "karte", "netzwerk", "statistik", "korb"]


@pytest.mark.frontend
@pytest.mark.parametrize("view", VIEWS)
def test_rendered_view_has_no_middle_dot(frontend_server, browser_context, view):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1366, "height": 900})
    page.goto(frontend_server + f"#{view}", wait_until="networkidle")
    text = page.evaluate("document.body.innerText + document.title")
    assert "·" not in text


@pytest.mark.frontend
@pytest.mark.parametrize("view,expected", [
    ("bestand", True), ("indizes", True), ("chronik", False), ("netzwerk", False),
])
def test_provenance_key_names_its_three_classes(frontend_server, browser_context, view, expected):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1366, "height": 900})
    page.goto(frontend_server + f"#{view}", wait_until="networkidle")
    key = page.locator(f'#tab-{view} .provenance-key, [data-view="{view}"] .provenance-key, .tab-content:not([hidden]) .provenance-key')
    if not expected:
        assert key.count() == 0
        return
    items = key.first.locator(".provenance-key__item")
    assert [i.inner_text().strip() for i in items.all()] == ["Quelle", "ergänzt", "Wikidata"]
    for item in items.all():
        assert item.get_attribute("data-tip")
        assert item.get_attribute("tabindex") == "0"
