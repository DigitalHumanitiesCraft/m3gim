"""Real chronology evidence, density controls and narrow-screen reading."""

from urllib.parse import unquote

import pytest

pytest.importorskip("playwright")
from playwright.sync_api import expect

pytestmark = pytest.mark.frontend


def open_chronik(frontend_server, browser_context, query=""):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1536, "height": 1000})
    page.emulate_media(reduced_motion="reduce")
    page.goto(frontend_server + "#chronik" + query)
    page.locator(".chronik-date").first.wait_for()
    return page


def test_contract_keeps_rehearsal_performance_and_document_context_apart(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context, "?suche=NIM_023%205")
    for day in ("1953-04-03", "1953-04-04"):
        row = page.locator(f'.chronik-date[data-date="{day}"]')
        expect(row.locator(".chronik-source--statement")).to_have_count(1)
        expect(row.locator(".chronik-entity")).to_have_count(0)
    own = page.locator('.chronik-date[data-date="1953-04-26"]')
    expect(own.locator(".chronik-source--document")).to_have_count(1)
    place = own.locator('[data-lane="ort"] .chronik-entity')
    expect(place).to_contain_text("Wuppertal")
    place.click()
    panel = page.locator(".chronik-evidence")
    expect(panel).to_contain_text("Im Dokument")
    expect(panel).to_contain_text("keinen gemeinsamen Auftritt oder Aufenthalt")
    panel.get_by_role("button", name="Schließen").click()
    expect(place).to_be_focused()
    notes = page.locator('.chronik-date[data-date="1953-04-04"] .chronik-notes')
    notes.locator("summary").click()
    expect(notes).to_contain_text("1954")


def test_dense_day_unfolds_all_entities_sources_and_typed_parts(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context)
    row = page.locator('.chronik-date[data-date="1953-07-26"]')
    people = row.locator('[data-lane="person"]')
    sources = row.locator('[data-lane="source"]')
    expect(people.locator(".chronik-entity")).to_have_count(3)
    expect(people).to_have_attribute("data-count", "46")
    people.locator(".chronik-more").click()
    expect(people.locator(".chronik-entity")).to_have_count(46)
    expect(sources.locator(".chronik-source__link")).to_have_count(3)
    sources.locator(".chronik-more").click()
    expect(sources.locator(".chronik-source__link")).to_have_count(6)
    parts = row.locator(".chronik-parts")
    expect(parts.locator("summary")).to_have_text("Partien · 26")
    parts.locator("summary").click()
    parts.locator(".chronik-more").click()
    expect(parts.locator(".chronik-entity")).to_have_count(26)
    expect(parts.locator("svg")).to_have_count(0)
    assert all(
        key.startswith("part:")
        for key in parts.locator(".chronik-entity").evaluate_all(
            "els => els.map(el => el.dataset.entityKey)"
        )
    )
    people.locator(".chronik-more").click()
    expect(people.locator(".chronik-entity")).to_have_count(3)


def test_entity_evidence_has_exact_sources_and_keyboard_return(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context)
    row = page.locator('.chronik-date[data-date="1953-07-26"]')
    place = row.locator('[data-lane="ort"] .chronik-entity')
    expect(place).to_contain_text("2 Belege")
    place.focus()
    place.press("Enter")
    panel = page.locator(".chronik-evidence")
    expect(panel).to_be_focused()
    expect(panel.locator(".chronik-evidence__source")).to_have_count(2)
    panel.press("Escape")
    expect(panel).to_have_count(0)
    expect(place).to_be_focused()
    expect(place).to_have_attribute("aria-expanded", "false")
    place.press("Enter")
    source = page.locator(".chronik-evidence__source").first
    record_id = source.get_attribute("data-record-id")
    source.click()
    expect(page.locator('[data-tab="bestand"]').first).to_have_attribute(
        "aria-selected", "true"
    )
    expect(page.locator(".inline-detail")).to_have_count(1)
    assert record_id in unquote(page.url)


@pytest.mark.parametrize("width", [390, 800, 1366])
def test_responsive_layout_and_combined_lane_preserve_the_filter(
    frontend_server, browser_context, width
):
    page = open_chronik(frontend_server, browser_context, "?suche=NIM_023%205")
    page.set_viewport_size({"width": width, "height": 900})
    before = page.url
    page.get_by_role("button", name="Alle Entitäten", exact=True).click()
    expect(page.get_by_role("button", name="Alle Entitäten", exact=True)).to_have_attribute(
        "aria-pressed", "true"
    )
    assert page.url == before
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    assert page.locator(".chronik-main").evaluate(
        "el => el.scrollWidth <= el.clientWidth + 1"
    )
    own = page.locator('.chronik-date[data-date="1953-04-26"]')
    expect(own.locator('[data-lane="all"]')).to_have_count(1)
    own.locator(".chronik-entity").first.click()
    expect(page.locator(".chronik-evidence")).to_be_visible()
    page.locator(".chronik-evidence").press("Escape")
    if width >= 900:
        sidebar = page.locator("#tab-chronik .view-sidebar").bounding_box()
        main = page.locator(".chronik-main").bounding_box()
        assert sidebar["x"] < main["x"]
        assert sidebar["x"] + sidebar["width"] <= main["x"] + 1


def test_year_jump_and_undated_context_remain_reachable(frontend_server, browser_context):
    page = open_chronik(frontend_server, browser_context)
    page.get_by_role("combobox", name="Zum Jahr springen").select_option("1953")
    year = page.locator('.chronik-year[data-year="1953"]')
    expect(year).to_be_focused()
    head = page.locator(".chronik-sticky").bounding_box()
    assert year.bounding_box()["y"] >= head["y"] + head["height"] - 1
    undated = page.locator(".chronik-undated")
    undated.locator(":scope > summary").click()
    expect(undated.locator(".chronik-source__link").first).to_be_visible()
