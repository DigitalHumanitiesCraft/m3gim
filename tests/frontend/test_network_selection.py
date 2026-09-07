"""Browser checks for the network selection hot path."""

from urllib.parse import parse_qs

import pytest


def graph_geometry(page):
    return page.evaluate(
        """() => {
            const plot = document.querySelector('.netzwerk__plot').getBoundingClientRect();
            const main = document.querySelector('.netzwerk__main').getBoundingClientRect();
            const nodes = [...document.querySelectorAll('.netzwerk-node')];
            const centers = nodes.map(node => {
                const box = node.getBoundingClientRect();
                const style = getComputedStyle(node);
                return {
                    live: box.width > 0 && box.height > 0
                        && style.visibility === 'visible' && Number(style.opacity) > 0,
                    x: box.left + box.width / 2,
                    y: box.top + box.height / 2,
                };
            });
            const inside = centers.filter(point => point.live
                && point.x >= plot.left && point.x <= plot.right
                && point.y >= plot.top && point.y <= plot.bottom).length;
            const top = Math.max(0, plot.top, main.top);
            const bottom = Math.min(innerHeight, plot.bottom, main.bottom);
            const viewport = centers.filter(point => point.live
                && point.x >= plot.left && point.x <= plot.right
                && point.y >= top && point.y <= bottom).length;
            return {height: plot.height, nodes: nodes.length, inside, viewport,
                plotTop: plot.top, plotBottom: plot.bottom,
                mainTop: main.top, mainBottom: main.bottom};
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
    detail = page.locator("#tab-netzwerk .selection-detail__panel")
    detail.wait_for(state="visible")
    selected = graph_geometry(page)
    assert selected["height"] >= 475
    assert selected["height"] >= before["height"] * 0.9
    assert selected["nodes"] == before["nodes"]
    assert selected["inside"] == selected["nodes"]
    assert detail.is_visible()
    assert detail.evaluate("el => el.scrollHeight >= el.clientHeight")

    page.keyboard.press("Tab")
    close = page.get_by_role("button", name="Schließen")
    assert close.evaluate("el => document.activeElement === el")
    detail.evaluate("el => { el.scrollTop = el.scrollHeight; }")
    close_box = close.bounding_box()
    dialog_box = page.locator(".selection-detail__dialog[open]").bounding_box()
    assert dialog_box["y"] <= close_box["y"]
    assert close_box["y"] + close_box["height"] <= dialog_box["y"] + dialog_box["height"]
    page.keyboard.press("Escape")
    detail.wait_for(state="detached")
    assert node.evaluate("el => document.activeElement === el")
    cleared = graph_geometry(page)
    assert cleared["height"] >= before["height"] * 0.9

    node.press("Enter")
    page.locator("#tab-netzwerk .selection-detail__panel").wait_for(state="visible")
    reselected = graph_geometry(page)
    assert reselected["height"] >= 475
    assert reselected["nodes"] == before["nodes"]
    assert reselected["inside"] == reselected["nodes"]


@pytest.mark.frontend
def test_selection_preserves_label_geometry_and_opens_evidence(
    frontend_server, browser_context
):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1440, "height": 980})
    page.goto(frontend_server, wait_until="networkidle")
    page.locator('[data-tab="netzwerk"]').first.click()
    node = page.locator(".netzwerk-node[tabindex='0']")
    node.wait_for(state="visible")
    before_geometry = graph_geometry(page)
    assert before_geometry["inside"] == before_geometry["nodes"]
    assert before_geometry["viewport"] > 0
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
    page.locator("#tab-netzwerk .selection-detail__panel").wait_for(state="visible")
    after = labels.evaluate_all(
        "labels => labels.map(label => [label.style.fontSize, label.style.strokeWidth, label.getAttribute('x')])"
    )

    assert after == before
    selected = graph_geometry(page)
    assert abs(selected["height"] - before_geometry["height"]) <= 1
    assert selected["plotTop"] >= selected["mainTop"] - 1
    assert selected["plotBottom"] <= selected["mainBottom"] + 1
    assert selected["viewport"] > 0
    assert selected["nodes"] == before_geometry["nodes"]
    assert node.evaluate("node => node.classList.contains('netzwerk-node--focus')")
    assert parse_qs(page.url.split("?", 1)[1])["knoten"] == [selected_id]
