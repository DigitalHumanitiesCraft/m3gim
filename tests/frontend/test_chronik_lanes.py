"""Browser checks for the scaled chronology and its evidence details."""

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
    page.locator(".chronik-mark").first.wait_for()
    return page


def visible_detail(page):
    return page.locator("#tab-chronik .selection-detail__panel:visible")


def clickable_mark(page, date):
    page.locator("#chronik-scale").select_option("month")
    mark = page.locator(f'.chronik-mark[data-date="{date}"]').first
    mark.scroll_into_view_if_needed()
    return mark


def test_source_statements_and_document_context_keep_their_dates(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context, "?suche=NIM_023%205")
    for day in ("1953-04-03", "1953-04-04"):
        expect(page.locator(f'.chronik-mark--statement[data-date="{day}"]')).to_have_count(1)
    expect(page.locator('.chronik-mark--document[data-date="1953-04-26"]')).to_have_count(1)

    april_4 = clickable_mark(page, "1953-04-04")
    april_4.click()
    panel = visible_detail(page)
    expect(panel.locator(".chronik-evidence__note")).to_contain_text("1954")
    panel.get_by_role("button", name="Schließen").click()
    expect(april_4).to_be_focused()

    april_26 = clickable_mark(page, "1953-04-26")
    april_26.click()
    place = panel.locator(
        '.chronik-source-entities .chronik-entity[data-entity-key^="ort:"]'
    )
    expect(place).to_contain_text("Wuppertal")
    place.click()
    expect(panel).to_contain_text("Im Dokument")
    expect(panel).to_contain_text("keinen gemeinsamen Auftritt oder Aufenthalt")
    panel.get_by_role("button", name="Schließen").click()
    expect(april_26).to_be_focused()


def test_compact_summary_opens_all_grouped_dates_and_sources(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context)
    group = page.locator(".chronik-summary__group").first
    group.click()
    panel = visible_detail(page)
    rows = panel.locator(".chronik-group-row")
    assert rows.count() > 0
    assert all(rows.evaluate_all("els => els.map(el => Boolean(el.dataset.date))"))
    expect(panel.locator(".chronik-source__link").first).to_be_visible()


def test_dense_day_opens_complete_lists_without_expanding_the_axis(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context)
    mark = clickable_mark(page, "1953-07-26")
    top_before = mark.get_attribute("style")
    scroll = page.locator(".chronik-scroll")
    scroll_before = scroll.evaluate("el => el.scrollTop")
    mark.click()
    panel = visible_detail(page)
    row = panel.locator('.chronik-date[data-date="1953-07-26"]')
    people = row.locator('[data-lane="person"]')
    sources = row.locator('[data-lane="source"]')
    expect(people.locator(".chronik-entity")).to_have_count(3)
    expect(people).to_have_attribute("data-count", "46")
    expect(sources.locator(".chronik-source__link")).to_have_count(3)
    assert mark.get_attribute("style") == top_before
    assert scroll.evaluate("el => el.scrollTop") == scroll_before

    people.locator(".chronik-more").click()
    expect(panel.locator(":scope .chronik-list .chronik-entity")).to_have_count(46)
    panel.get_by_role("button", name="Zurück").click()
    expect(panel.locator('[data-lane="person"] .chronik-entity')).to_have_count(3)
    panel.locator('[data-lane="source"] .chronik-more').click()
    expect(panel.locator(":scope .chronik-list .chronik-source__link")).to_have_count(6)
    panel.get_by_role("button", name="Zurück").click()

    parts = panel.locator("button.chronik-parts")
    expect(parts).to_have_text("Partien · 26")
    parts.click()
    part_entries = panel.locator(":scope .chronik-list .chronik-entity")
    expect(part_entries).to_have_count(26)
    assert all(
        key.startswith("part:")
        for key in part_entries.evaluate_all("els => els.map(el => el.dataset.entityKey)")
    )


def test_scaled_positions_preserve_actual_time_distances(frontend_server, browser_context):
    page = open_chronik(frontend_server, browser_context, "?suche=NIM_023%205")
    marks = {
        day: page.locator(f'.chronik-mark[data-date="{day}"]').first
        for day in ("1953-04-03", "1953-04-04", "1953-04-26")
    }
    tops = {
        day: float(mark.evaluate("el => parseFloat(el.style.top)"))
        for day, mark in marks.items()
    }
    one_day = tops["1953-04-04"] - tops["1953-04-03"]
    twenty_two_days = tops["1953-04-26"] - tops["1953-04-04"]
    assert one_day > 0
    assert twenty_two_days > one_day * 20

    distance_before = tops["1953-04-26"] - tops["1953-04-03"]
    page.locator("#chronik-scale").select_option("year")
    distance_after = (
        float(marks["1953-04-26"].evaluate("el => parseFloat(el.style.top)"))
        - float(marks["1953-04-03"].evaluate("el => parseFloat(el.style.top)"))
    )
    assert distance_after > distance_before * 5


def test_long_range_and_distant_year_keep_their_order(frontend_server, browser_context):
    page = open_chronik(frontend_server, browser_context)
    old = page.locator('.chronik-range[data-date^="1876"]').first
    recent = page.locator('.chronik-mark[data-date^="1953"]').first
    expect(old).to_have_count(1)
    expect(recent).to_have_count(1)
    assert float(old.evaluate("el => parseFloat(el.style.top)")) < float(
        recent.evaluate("el => parseFloat(el.style.top)")
    )
    assert page.locator(".chronik-timeline").evaluate(
        "el => el.scrollHeight > el.parentElement.clientHeight * 10"
    )


def test_entity_evidence_opens_the_record(frontend_server, browser_context):
    page = open_chronik(frontend_server, browser_context)
    clickable_mark(page, "1953-07-26").click()
    panel = visible_detail(page)
    place = panel.locator('[data-lane="ort"] .chronik-entity')
    expect(place).to_contain_text("2 Belege")
    place.click()
    expect(panel.locator(".chronik-evidence__source")).to_have_count(2)
    source = panel.locator(".chronik-evidence__source").first
    record_id = source.get_attribute("data-record-id")
    source.click()
    expect(page.locator('[data-tab="bestand"]').first).to_have_attribute(
        "aria-selected", "true"
    )
    expect(page.locator(".inline-detail")).to_have_count(1)
    assert record_id in unquote(page.url)


@pytest.mark.parametrize("width", [390, 800, 1366])
def test_responsive_selection_uses_the_shared_detail(
    frontend_server, browser_context, width
):
    page = open_chronik(frontend_server, browser_context, "?suche=NIM_023%205")
    page.set_viewport_size({"width": width, "height": 900})
    trigger = clickable_mark(page, "1953-04-26")
    trigger.click()
    panel = visible_detail(page)
    expect(panel).to_be_visible()
    expect(panel).to_be_focused()
    if width < 900:
        expect(page.locator(".selection-detail__dialog[open]")).to_have_count(1)
    else:
        expect(page.locator(".selection-detail__slot:not([hidden])")).to_have_count(1)
    panel.press("Escape")
    expect(trigger).to_be_focused()
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")


def test_year_jump_scale_controls_and_undated_evidence_are_reachable(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context)
    scale = page.locator("#chronik-scale")
    assert scale.locator("option").evaluate_all("els => els.map(el => el.value)") == [
        "overview",
        "years",
        "year",
        "month",
    ]
    page.locator("#chronik-year-jump").select_option("1953")
    expect(page.locator('.chronik-tick[data-year="1953"]').first).to_be_visible()
    expect(page.locator('.chronik-mark[data-date^="1953"]').first).to_be_visible()
    undated = page.locator("button.chronik-undated")
    expect(undated).to_contain_text("Ohne Datum")
    undated.click()
    expect(visible_detail(page).locator(".chronik-source__link").first).to_be_visible()


def test_legend_and_detail_column_have_stable_places(frontend_server, browser_context):
    page = open_chronik(frontend_server, browser_context)
    legend = page.locator(".chronik-legend")
    expect(legend).to_be_visible()
    expect(page.locator(".selection-detail__panel")).to_have_count(0)
    expect(page.locator(".selection-detail__slot")).to_be_hidden()
    legend_box = legend.bounding_box()
    main_box = page.locator(".chronik-main").bounding_box()
    assert legend_box["x"] > main_box["x"] + main_box["width"] / 2


def test_open_selection_moves_between_shared_slot_and_dialog_on_resize(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context, "?suche=NIM_023%205")
    trigger = clickable_mark(page, "1953-04-26")
    trigger.click()
    panel = visible_detail(page)
    expect(page.locator(".selection-detail__slot:not([hidden])")).to_have_count(1)
    expect(panel).to_be_focused()
    page.set_viewport_size({"width": 800, "height": 900})
    expect(page.locator(".selection-detail__dialog[open]")).to_have_count(1)
    expect(panel).to_be_focused()
    page.set_viewport_size({"width": 1536, "height": 1000})
    expect(page.locator(".selection-detail__slot:not([hidden])")).to_have_count(1)
    expect(panel).to_be_focused()
    expect(page.locator(".selection-detail__dialog[open]")).to_have_count(0)
    panel.press("Escape")
    expect(trigger).to_be_focused()
