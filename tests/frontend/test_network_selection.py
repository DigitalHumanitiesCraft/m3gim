"""Browser checks for the network selection hot path."""

from urllib.parse import parse_qs

import pytest


@pytest.mark.frontend
def test_selection_preserves_label_geometry_and_opens_evidence(
    frontend_server, browser_context
):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1366, "height": 900})
    page.goto(frontend_server, wait_until="networkidle")
    page.locator('[data-tab="netzwerk"]').first.click()
    node = page.locator(".netzwerk-node[tabindex='0']")
    node.wait_for(state="visible")
    selected_id = node.evaluate("node => node.__data__.id")

    labels = page.locator(".netzwerk-label")
    initial = labels.evaluate_all(
        "labels => labels.map(label => [label.style.fontSize, label.style.strokeWidth, label.getAttribute('x')])"
    )
    assert all(all(value for value in geometry) for geometry in initial)
    page.get_by_role("button", name="Hineinzoomen").click()
    page.wait_for_function(
        "parseFloat(document.querySelector('.netzwerk-label').style.fontSize) <= 7.14"
    )
    before = labels.evaluate_all(
        "labels => labels.map(label => [label.style.fontSize, label.style.strokeWidth, label.getAttribute('x')])"
    )
    node.focus()
    node.press("Enter")
    page.locator(".netzwerk__detail").wait_for(state="visible")
    after = labels.evaluate_all(
        "labels => labels.map(label => [label.style.fontSize, label.style.strokeWidth, label.getAttribute('x')])"
    )

    assert after == before
    assert node.evaluate("node => node.classList.contains('netzwerk-node--focus')")
    assert parse_qs(page.url.split("?", 1)[1])["knoten"] == [selected_id]
