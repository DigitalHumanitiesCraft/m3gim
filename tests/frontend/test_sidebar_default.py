"""The filter column starts folded and remembers an opening (2026-11-15 variant)."""

import pytest

pytest.importorskip("playwright")


@pytest.mark.frontend
@pytest.mark.parametrize("width", [1280, 2000])
def test_sidebar_starts_folded_and_stays_open_once_opened(frontend_server, frontend_browser, width):
    context = frontend_browser.new_context(viewport={"width": width, "height": 900})
    page = context.new_page()
    page.goto(frontend_server + "#bestand", wait_until="networkidle")
    toggle = page.locator("#tab-bestand .view-shell__sidebar-toggle")
    assert toggle.get_attribute("aria-expanded") == "false"
    assert page.locator("#tab-bestand .view-shell--sidebar-collapsed").count() == 1
    toggle.click()
    assert toggle.get_attribute("aria-expanded") == "true"
    page.goto(frontend_server + "#chronik", wait_until="networkidle")
    assert page.locator("#tab-chronik .view-shell__sidebar-toggle").get_attribute("aria-expanded") == "true"
    context.close()
