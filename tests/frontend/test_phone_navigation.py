"""Phones keep the view navigation (defect found 2026-11-15).

Below 700 px the whole top bar scrolls sideways (base.css). A shrinkable tab
list with its own overflow collapsed to a few pixels there, so a phone showed
no tabs at all. Each tab must keep its own width and be reachable by scrolling
the bar.
"""

import pytest

pytest.importorskip("playwright")


@pytest.mark.frontend
@pytest.mark.parametrize("width", [320, 360, 390, 699])
def test_every_tab_keeps_its_width_and_can_be_scrolled_into_view(
        frontend_server, browser_context, width):
    page = browser_context.new_page()
    page.set_viewport_size({"width": width, "height": 740})
    page.goto(frontend_server + "#bestand", wait_until="networkidle")

    tablist = page.locator('[role="tablist"]')
    assert tablist.evaluate("el => el.clientWidth >= el.scrollWidth - 1")
    for tab in page.locator('[role="tab"]').all():
        tab.scroll_into_view_if_needed()
        box = tab.bounding_box()
        assert box is not None and box["width"] >= 24
        assert box["x"] >= 0 and box["x"] + box["width"] <= width
    assert page.evaluate("document.documentElement.scrollWidth") <= width
