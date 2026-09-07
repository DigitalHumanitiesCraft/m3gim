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


def chronik_detail(page, width=1536):
    if width < 900:
        return page.locator("dialog.chronik-dialog[open] .chronik-evidence")
    return page.locator(".chronik-detail-slot .chronik-evidence")


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
    panel = chronik_detail(page)
    expect(panel).to_contain_text("Im Dokument")
    expect(panel).to_contain_text("keinen gemeinsamen Auftritt oder Aufenthalt")
    panel.get_by_role("button", name="Schließen").click()
    expect(place).to_be_focused()


def test_dense_day_opens_complete_lists_without_changing_lane_density(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context)
    row = page.locator('.chronik-date[data-date="1953-07-26"]')
    people = row.locator('[data-lane="person"]')
    sources = row.locator('[data-lane="source"]')
    expect(people.locator(".chronik-entity")).to_have_count(3)
    expect(people).to_have_attribute("data-count", "46")
    people.locator(".chronik-more").click()
    person_list = page.locator(".chronik-detail-slot .chronik-list")
    expect(person_list.locator(".chronik-entity")).to_have_count(46)
    expect(people.locator(".chronik-entity")).to_have_count(3)
    expect(sources.locator(".chronik-source__link")).to_have_count(3)
    sources.locator(".chronik-more").click()
    source_list = page.locator(".chronik-detail-slot .chronik-list")
    expect(source_list.locator(".chronik-source__link")).to_have_count(6)
    expect(sources.locator(".chronik-source__link")).to_have_count(3)
    parts = row.locator("button.chronik-parts")
    expect(parts).to_have_text("Partien · 26")
    parts.click()
    part_list = page.locator(".chronik-detail-slot .chronik-list")
    expect(part_list.locator(".chronik-entity")).to_have_count(26)
    expect(part_list.locator("svg")).to_have_count(0)
    assert all(
        key.startswith("part:")
        for key in part_list.locator(".chronik-entity").evaluate_all(
            "els => els.map(el => el.dataset.entityKey)"
        )
    )


def test_entity_evidence_has_exact_sources_and_keyboard_return(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context)
    row = page.locator('.chronik-date[data-date="1953-07-26"]')
    place = row.locator('[data-lane="ort"] .chronik-entity')
    expect(place).to_contain_text("2 Belege")
    scroll = page.locator(".chronik-scroll")
    place.focus()
    row_before = row.bounding_box()
    scroll_before = scroll.evaluate("el => el.scrollTop")
    place.press("Enter")
    panel = chronik_detail(page)
    expect(panel).to_be_focused()
    expect(panel.locator(".chronik-evidence__source")).to_have_count(2)
    assert row.bounding_box() == row_before
    assert scroll.evaluate("el => el.scrollTop") == scroll_before
    panel.press("Escape")
    expect(panel).to_have_count(0)
    expect(place).to_be_focused()
    expect(place).to_have_attribute("aria-pressed", "false")
    place.press("Enter")
    expect(place).to_have_attribute("aria-pressed", "true")
    source = chronik_detail(page).locator(".chronik-evidence__source").first
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
    entity = own.locator(".chronik-entity").first
    entity.click()
    panel = chronik_detail(page, width)
    expect(panel).to_be_visible()
    panel.press("Escape")
    expect(entity).to_be_focused()
    expect(page.locator(".chronik-legend")).to_be_visible()
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
    assert undated.evaluate("el => el.tagName") == "SECTION"
    expect(undated.locator(":scope > summary")).to_have_count(0)
    expect(undated.locator(".chronik-source__link").first).to_be_visible()


def test_source_and_list_details_use_the_shared_panel(frontend_server, browser_context):
    page = open_chronik(frontend_server, browser_context, "?suche=NIM_023%205")
    source = page.locator(
        '.chronik-date[data-date="1953-04-04"] .chronik-source__link'
    )
    source.click()
    evidence = chronik_detail(page)
    expect(evidence.locator(".chronik-evidence__source")).to_have_count(1)
    expect(evidence.locator(".chronik-evidence__note")).to_be_visible()
    evidence.get_by_role("button", name="Schließen").click()
    expect(source).to_be_focused()

    page.close()
    page = open_chronik(frontend_server, browser_context)
    page.locator(
        '.chronik-date[data-date="1953-07-26"] '
        '[data-lane="person"] .chronik-more'
    ).click()
    detail = page.locator(".chronik-detail-slot")
    person = detail.locator(".chronik-list .chronik-entity").first
    person.click()
    expect(detail.locator(".chronik-evidence")).to_be_visible()
    detail.get_by_role("button", name="Zurück zur Liste").click()
    expect(detail.locator(".chronik-list .chronik-entity")).to_have_count(46)


def test_legend_and_empty_instruction_have_stable_places(frontend_server, browser_context):
    page = open_chronik(frontend_server, browser_context)
    legend = page.locator(".chronik-legend")
    empty = page.locator(".chronik-detail-empty")
    expect(legend).to_be_visible()
    expect(empty).to_contain_text("Eintrag auswählen")
    expect(page.locator(".chronik-navigation")).not_to_contain_text(
        "Name wählen → Belege lesen"
    )
    legend_box = legend.bounding_box()
    main_box = page.locator(".chronik-main").bounding_box()
    assert legend_box["x"] + legend_box["width"] >= main_box["x"] + main_box["width"] - 2


def test_open_selection_moves_between_detail_slot_and_dialog_on_resize(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context, "?suche=NIM_023%205")
    trigger = page.locator(
        '.chronik-date[data-date="1953-04-26"] '
        '[data-lane="ort"] .chronik-entity'
    )
    trigger.click()
    desktop_panel = chronik_detail(page)
    expect(desktop_panel).to_be_visible()
    expect(desktop_panel).to_be_focused()

    page.set_viewport_size({"width": 800, "height": 900})
    mobile_panel = chronik_detail(page, 800)
    expect(mobile_panel).to_be_visible()
    expect(mobile_panel).to_be_focused()

    page.set_viewport_size({"width": 1536, "height": 1000})
    expect(desktop_panel).to_be_visible()
    expect(desktop_panel).to_be_focused()
    expect(page.locator("dialog.chronik-dialog[open]")).to_have_count(0)
    desktop_panel.press("Escape")
    expect(trigger).to_be_focused()
