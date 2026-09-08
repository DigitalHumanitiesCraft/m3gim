"""Browser regression for tooltips inside the multicolumn Bestand detail."""

from urllib.parse import quote

import pytest

pytest.importorskip("playwright")

from playwright.sync_api import expect


@pytest.mark.frontend
def test_bestand_tooltip_is_one_unfragmented_overlay(frontend_server, browser_context):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1544, "height": 762})
    record_id = quote("m3gim-data:NIM_003_1_1", safe="")
    page.goto(frontend_server + f"#bestand/{record_id}", wait_until="networkidle")

    potsdam = page.locator(".chip-action", has_text="Potsdam")
    potsdam.evaluate("element => element.setAttribute('aria-describedby', 'record-context')")
    potsdam.hover()
    tooltip = page.locator(".tooltip-portal")
    expect(tooltip).to_be_visible()
    assert tooltip.count() == 1
    assert "Ortsvertreter dienen" in tooltip.inner_text()
    assert "Wikidata Q1711" in tooltip.inner_text()
    assert tooltip.evaluate("element => element.parentElement === document.body")
    assert potsdam.get_attribute("aria-describedby") == "record-context app-tooltip"
    assert potsdam.evaluate(
        "element => getComputedStyle(element, '::after').display === 'none'"
    )

    box = tooltip.bounding_box()
    assert box is not None
    assert box["width"] <= 280
    assert box["x"] >= 8 and box["x"] + box["width"] <= 1544 - 8

    wikidata = potsdam.locator("xpath=..").locator(".badge--wikidata")
    wikidata.hover()
    expect(tooltip).to_contain_text("Bei Wikidata ansehen")
    assert wikidata.get_attribute("aria-describedby") == "app-tooltip"
    assert potsdam.get_attribute("aria-describedby") == "record-context"

    page.keyboard.press("Escape")
    expect(tooltip).to_be_hidden()
    assert wikidata.get_attribute("aria-describedby") is None

    wikidata.focus()
    expect(tooltip).to_be_visible()
    assert wikidata.get_attribute("aria-describedby") == "app-tooltip"
    page.locator(".inline-detail__head").focus()
    expect(tooltip).to_be_hidden()
    assert wikidata.get_attribute("aria-describedby") is None

    potsdam.hover()
    expect(tooltip).to_be_visible()
    page.locator(".inline-detail__head").click()
    expect(tooltip).to_be_hidden()
