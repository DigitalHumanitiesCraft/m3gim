"""Interface rules of the 2026-11-15 plan as executable checks.

The independent review of round 1 found these rules resting on screenshots
alone. Each check reads the rendered view the reader sees:

- no explanatory sentence stands between the toolbar and the main figure,
- no research view opens empty,
- the coverage counts lead to their data (a tooltip-bearing focusable count
  in the Dashboard, a navigation control in the Netzwerk).

A sentence is a visible text of six or more words that ends with a full stop.
"""

import pytest

pytest.importorskip("playwright")

FIGURES = {
    "bestand": "table tbody tr",
    "indizes": ".idx-list .idx-item, .idx-list [role=listitem], .idx-list > *",
    "chronik": ".chronik-calendar-group",
    "karte": "svg circle, svg path",
    "netzwerk": "g.netzwerk-nodes > *",
    "statistik": ".dashboard-panel__body rect, .dashboard-panel__body td",
}

SENTENCES_ABOVE = """(view) => {
  const panel = document.getElementById('tab-' + view);
  const candidates = [...panel.querySelectorAll('svg, canvas, table, .idx-list, .chronik-calendar-group')]
    .filter(e => !e.closest('.view-shell__sidebar, .research-toolbar'))
    .map(e => [e, e.getBoundingClientRect()])
    .filter(([, r]) => r.width > 200 && r.height > 150);
  const top = Math.min(...candidates.map(([, r]) => Math.max(r.top, 0)));
  const found = [];
  for (const el of panel.querySelectorAll('p, span, div, h1, h2, h3, li')) {
    if (el.closest('.view-shell__sidebar, .research-toolbar, svg, table, .idx-list')) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim();
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom > top) continue;
    if (own.split(/\\s+/).length >= 6 && /\\.$/.test(own)) found.push(own);
  }
  return found;
}"""


def _open(frontend_server, browser_context, view, width=1366):
    page = browser_context.new_page()
    page.set_viewport_size({"width": width, "height": 900})
    page.goto(frontend_server + f"#{view}", wait_until="networkidle")
    return page


@pytest.mark.frontend
@pytest.mark.parametrize("view", list(FIGURES))
def test_no_explanatory_sentence_above_the_main_figure(frontend_server, browser_context, view):
    page = _open(frontend_server, browser_context, view)
    assert page.evaluate(SENTENCES_ABOVE, view) == []


@pytest.mark.frontend
@pytest.mark.parametrize("view,marks", list(FIGURES.items()))
def test_view_opens_with_content(frontend_server, browser_context, view, marks):
    page = _open(frontend_server, browser_context, view)
    assert page.locator(f"#tab-{view} {marks.split(',')[0]}").count() > 0 or \
        any(page.locator(f"#tab-{view} {m.strip()}").count() > 0 for m in marks.split(","))


@pytest.mark.frontend
def test_dashboard_coverage_count_explains_itself(frontend_server, browser_context):
    page = _open(frontend_server, browser_context, "statistik")
    counts = page.locator("#tab-statistik .dashboard-panel__head .dashboard-chart-status")
    assert counts.count() == 2
    for count in counts.all():
        assert count.get_attribute("tabindex") == "0"
        assert "Dokument" in (count.get_attribute("data-tip") or "")


@pytest.mark.frontend
def test_network_count_opens_the_same_cut_in_bestand(frontend_server, browser_context):
    page = _open(frontend_server, browser_context, "netzwerk")
    page.locator("#tab-netzwerk .netzwerk__coverage").click()
    page.wait_for_function("location.hash.startsWith('#bestand')")
    assert page.locator("#tab-bestand table tbody tr").count() > 0
