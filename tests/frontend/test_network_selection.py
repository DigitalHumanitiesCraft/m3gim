"""Browser checks for the network selection hot path."""

from urllib.parse import parse_qs

import pytest


def graph_geometry(page):
    return page.evaluate(
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
            }).length;
            return {height: plot.height, nodes: nodes.length, inside};
        }"""
    )


@pytest.mark.frontend
def test_narrow_selection_keeps_graph_readable_and_detail_reachable(
    frontend_server, browser_context
):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 800, "height": 900})
    page.goto(frontend_server, wait_until="networkidle")
    page.locator('[data-tab="netzwerk"]').first.click()
    node = page.locator(".netzwerk-node[tabindex='0']")
    node.wait_for(state="visible")
    before = graph_geometry(page)
    assert before["nodes"] > 0

    node.focus()
    node.press("Enter")
    detail = page.locator(".netzwerk__detail")
    detail.wait_for(state="visible")
    selected = graph_geometry(page)
    assert selected["height"] >= 475
    assert selected["height"] >= before["height"] * 0.9
    assert selected["nodes"] == before["nodes"]
    assert selected["inside"] == selected["nodes"]
    assert detail.is_visible()
    assert detail.evaluate("el => el.scrollHeight === el.clientHeight")

    page.keyboard.press("Tab")
    page.keyboard.press("Tab")
    close = page.get_by_role("button", name="Schließen")
    assert close.evaluate("el => document.activeElement === el")
    close_box = close.bounding_box()
    main_box = page.locator(".netzwerk__main").bounding_box()
    assert main_box["y"] <= close_box["y"]
    assert close_box["y"] + close_box["height"] <= main_box["y"] + main_box["height"]
    page.keyboard.press("Escape")
    detail.wait_for(state="detached")
    assert node.evaluate("el => document.activeElement === el")
    cleared = graph_geometry(page)
    assert cleared["height"] >= before["height"] * 0.9

    node.press("Enter")
    page.locator(".netzwerk__detail").wait_for(state="visible")
    reselected = graph_geometry(page)
    assert reselected["height"] >= 475
    assert reselected["nodes"] == before["nodes"]
    assert reselected["inside"] == reselected["nodes"]


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
