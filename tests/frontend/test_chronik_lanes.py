"""Browser checks for the calendar-group chronology and its evidence details."""

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
    page.locator(".chronik-calendar-group").first.wait_for()
    return page


def visible_detail(page):
    return page.locator("#tab-chronik .selection-detail__panel:visible")


def calendar_group(page, scale, key):
    page.locator("#chronik-scale").select_option(scale)
    group = page.locator(f'.chronik-calendar-group[data-key="{key}"]')
    group.scroll_into_view_if_needed()
    return group


def test_source_statements_and_document_context_keep_their_dates(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context, "?suche=NIM_023%205")
    april_3 = calendar_group(page, "month", "day-1953-04-03")
    april_4 = page.locator('.chronik-calendar-group[data-key="day-1953-04-04"]')
    april_26 = page.locator('.chronik-calendar-group[data-key="day-1953-04-26"]')
    expect(april_3.locator(".chronik-source--statement")).to_have_count(1)
    expect(april_4.locator(".chronik-source--statement")).to_have_count(1)
    expect(april_26.locator(".chronik-source--document")).to_have_count(1)

    april_4.locator(".chronik-source__link").click()
    panel = visible_detail(page)
    expect(panel.locator(".chronik-evidence__note")).to_contain_text("1954")
    panel.get_by_role("button", name="Schließen").click()

    april_26.scroll_into_view_if_needed()
    source = april_26.locator(".chronik-source__link")
    source.click()
    place = panel.locator(
        '.chronik-source-entities .chronik-entity[data-entity-key^="ort:"]'
    )
    expect(place).to_contain_text("Wuppertal")
    place.click()
    expect(panel).to_contain_text("In der Quelle genannt")
    expect(panel).to_contain_text("keinen gemeinsamen Auftritt oder Aufenthalt")
    panel.get_by_role("button", name="Schließen").click()
    expect(source).to_be_focused()


def test_dense_day_shows_lane_previews_and_complete_detail_lists(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context)
    group = calendar_group(page, "month", "day-1953-07-26")
    people = group.locator('[data-lane="person"]')
    sources = group.locator('[data-lane="source"]')
    expect(people).to_have_attribute("data-count", "46")
    expect(people.locator(".chronik-entity")).to_have_count(3)
    expect(sources).to_have_attribute("data-count", "6")
    expect(sources.locator(".chronik-source__link")).to_have_count(3)

    people.locator(".chronik-more").click()
    panel = visible_detail(page)
    expect(panel.locator(".chronik-list .chronik-entity")).to_have_count(46)
    panel.get_by_role("button", name="Schließen").click()
    expect(people.locator(".chronik-entity")).to_have_count(3)

    sources.locator(".chronik-more").click()
    expect(panel.locator(".chronik-list .chronik-source__link")).to_have_count(6)
    panel.get_by_role("button", name="Schließen").click()

    parts = group.locator("button.chronik-parts")
    expect(parts).to_have_text("Partien · 53")
    parts.click()
    part_entries = panel.locator(".chronik-list .chronik-entity")
    expect(part_entries).to_have_count(53)
    assert all(
        key.startswith("part:")
        for key in part_entries.evaluate_all("els => els.map(el => el.dataset.entityKey)")
    )


@pytest.mark.parametrize(
    ("scale", "key"),
    [
        ("overview", "decade-1950"),
        ("years", "year-1953"),
        ("year", "month-1953-07"),
        ("month", "day-1953-07-26"),
    ],
)
def test_scale_uses_natural_calendar_groups(frontend_server, browser_context, scale, key):
    page = open_chronik(frontend_server, browser_context)
    group = calendar_group(page, scale, key)
    expect(group).to_be_attached()
    expect(group.locator(".chronik-calendar-anchor")).to_have_count(1)
    expect(group.locator('[data-lane="source"]')).to_be_attached()
    expect(page.locator(".chronik-mark, .chronik-range")).to_have_count(0)


def test_long_empty_period_is_a_short_explicit_gap(frontend_server, browser_context):
    page = open_chronik(frontend_server, browser_context)
    page.locator("#chronik-scale").select_option("years")
    gaps = page.locator(".chronik-gap")
    expect(gaps.first).to_be_visible()
    largest = gaps.evaluate_all(
        "els => els.map(el => ({years: Number(el.dataset.gapTo) - "
        "Number(el.dataset.gapFrom), height: el.getBoundingClientRect().height}))"
        ".sort((a, b) => b.years - a.years)[0]"
    )
    assert largest["years"] > 100
    assert largest["height"] <= 60
    expect(gaps.first.locator("button")).to_have_attribute("aria-expanded", "false")


def test_original_range_remains_visible_in_the_calendar_source(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context, "?suche=NIM_005%202")
    group = calendar_group(page, "years", "year-1924")
    dates = group.locator(".chronik-source__dates")
    expect(dates).to_contain_text("1924")
    expect(dates).to_contain_text("1925")


def test_real_dense_source_uses_a_short_calendar_summary(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context, "?suche=NIM_005%2025")
    group = calendar_group(page, "years", "year-1963")
    expect(group.locator(".chronik-source__dates")).to_have_text(
        "25 Datierungen · Jänner–Dezember 1963"
    )
    source = group.locator(".chronik-source__link")
    assert "chronik-source--statement" in source.get_attribute("class").split()
    assert source.evaluate("el => getComputedStyle(el).borderLeftStyle") == "dotted"
    source.click()
    rows = visible_detail(page).locator(".chronik-group-row")
    expect(rows).to_have_count(25)
    dates = rows.evaluate_all("els => els.map(el => el.dataset.date)")
    assert any(date.startswith("1963-01") for date in dates)
    assert any(date.startswith("1963-12") for date in dates)


def test_selection_does_not_move_calendar_group_or_scroll(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context)
    group = calendar_group(page, "month", "day-1953-07-26")
    source = group.locator(".chronik-source__link").first
    scroll = page.locator(".chronik-scroll")
    top_before = group.get_attribute("style")
    scroll_before = scroll.evaluate("el => el.scrollTop")
    source.click()
    expect(visible_detail(page)).to_be_focused()
    assert group.get_attribute("style") == top_before
    assert scroll.evaluate("el => el.scrollTop") == scroll_before
    visible_detail(page).press("Escape")
    expect(source).to_be_focused()


def test_source_evidence_opens_the_record(frontend_server, browser_context):
    page = open_chronik(frontend_server, browser_context)
    group = calendar_group(page, "month", "day-1953-07-26")
    group.locator('[data-lane="ort"] .chronik-entity').first.click()
    panel = visible_detail(page)
    source = panel.locator(".chronik-evidence__source").first
    record_id = source.get_attribute("data-record-id")
    source.click()
    expect(page.locator('[data-tab="bestand"]').first).to_have_attribute(
        "aria-selected", "true"
    )
    expect(page.locator(".inline-detail")).to_have_count(1)
    assert record_id in unquote(page.url)


def test_selected_source_marks_its_entities_in_the_calendar_lanes(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context, "?suche=NIM_023%205")
    group = calendar_group(page, "month", "day-1953-04-26")
    source = group.locator(".chronik-source__link")
    source.click()
    expect(source).to_have_attribute("aria-pressed", "true")
    linked = group.locator(".chronik-entity.chronik-selected")
    assert linked.count() > 0
    assert all(linked.evaluate_all("els => els.map(el => el.getAttribute('aria-pressed') === 'true')"))
    expect(linked.filter(has_text="Wuppertal").first).to_be_visible()
    visible_detail(page).press("Escape")
    expect(group.locator(".chronik-entity.chronik-selected")).to_have_count(0)


def test_chronik_contains_no_editorial_context_bands(frontend_server, browser_context):
    page = open_chronik(frontend_server, browser_context)
    bands = page.locator('.chronik-context-band[data-editorial="true"]')
    expect(bands).to_have_count(0)


@pytest.mark.parametrize("width", [390, 800, 1366])
def test_calendar_lanes_remain_readable_at_supported_widths(
    frontend_server, browser_context, width
):
    page = open_chronik(frontend_server, browser_context)
    page.set_viewport_size({"width": width, "height": 900})
    group = calendar_group(page, "month", "day-1953-07-26")
    heights = page.locator(".chronik-calendar-group").evaluate_all(
        "els => els.map(el => Math.round(el.getBoundingClientRect().height * 100) / 100)"
    )
    assert len(set(heights)) == 1
    assert group.evaluate(
        "el => [...el.children].filter(child => getComputedStyle(child).display !== 'none')"
        ".every(child => child.getBoundingClientRect().right <= el.getBoundingClientRect().right + 1)"
    )
    overflow = group.evaluate(
        "el => [...el.children].filter(child => getComputedStyle(child).display !== 'none')"
        ".map(child => ({name: child.className, overflow: child.getBoundingClientRect().bottom "
        "- el.getBoundingClientRect().bottom})).filter(item => item.overflow > 2)"
    )
    assert not overflow, overflow
    group.locator(".chronik-calendar-anchor").click()
    expect(visible_detail(page)).to_be_visible()
    overflow = group.evaluate(
        "el => [...el.children].filter(child => getComputedStyle(child).display !== 'none')"
        ".map(child => ({name: child.className, overflow: child.getBoundingClientRect().bottom "
        "- el.getBoundingClientRect().bottom})).filter(item => item.overflow > 2)"
    )
    assert not overflow, overflow
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")


@pytest.mark.parametrize("width", [390, 800, 1366])
@pytest.mark.parametrize("scale", ["overview", "years"])
def test_every_calendar_group_contains_all_lanes_before_and_after_selection(
    frontend_server, browser_context, width, scale
):
    page = open_chronik(frontend_server, browser_context)
    page.set_viewport_size({"width": width, "height": 900})
    page.locator("#chronik-scale").select_option(scale)
    groups = page.locator(".chronik-calendar-group")

    def overflows():
        return groups.evaluate_all(
            "groups => groups.flatMap(group => [...group.children]"
            ".filter(child => child.getClientRects().length)"
            ".map(child => { const outer = group.getBoundingClientRect(); "
            "const inner = child.getBoundingClientRect(); return {"
            "group: group.dataset.key, child: child.className, "
            "right: inner.right - outer.right, bottom: inner.bottom - outer.bottom}; })"
            ".filter(item => item.right > 2 || item.bottom > 2))"
        )

    overflow = overflows()
    assert not overflow, overflow
    source = groups.locator(".chronik-source__link").first
    source.scroll_into_view_if_needed()
    positions_before = groups.evaluate_all(
        "els => els.map(el => [el.dataset.key, el.style.top, el.style.height])"
    )
    scroll = page.locator(".chronik-scroll")
    scroll_before = scroll.evaluate("el => el.scrollTop")
    source.click()
    expect(visible_detail(page)).to_be_visible()
    assert groups.evaluate_all(
        "els => els.map(el => [el.dataset.key, el.style.top, el.style.height])"
    ) == positions_before
    assert scroll.evaluate("el => el.scrollTop") == scroll_before
    overflow = overflows()
    assert not overflow, overflow


def test_sticky_time_head_tracks_the_scrolled_calendar_year(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context)
    current = page.locator(".chronik-current-year")
    expect(current).to_be_visible()
    page.locator("#chronik-year-jump").select_option("1953")
    expect(current).to_have_text("1953")
    group = page.locator('.chronik-calendar-group[data-key="year-1963"]')
    top = group.evaluate("el => parseFloat(el.style.top)")
    page.locator(".chronik-scroll").evaluate("(el, y) => { el.scrollTop = y; }", top)
    expect(current).to_have_text("1963")


def test_long_gap_range_stays_inside_the_narrow_sticky_time_head(
    frontend_server, browser_context
):
    page = open_chronik(frontend_server, browser_context)
    page.set_viewport_size({"width": 390, "height": 900})
    page.locator("#chronik-scale").select_option("years")
    gap = page.locator(
        '.chronik-gap[data-gap-from="1056"][data-gap-to="1871"]'
    )
    top = gap.evaluate("el => parseFloat(el.style.top)")
    page.locator(".chronik-scroll").evaluate("(el, y) => { el.scrollTop = y; }", top)
    current = page.locator(".chronik-current-year")
    expect(current).to_have_text("1056–1871")
    assert current.evaluate("el => getComputedStyle(el).whiteSpace === 'nowrap'")
    bounds = current.evaluate(
        "el => { const range = document.createRange(); range.selectNodeContents(el); "
        "const text = range.getBoundingClientRect(); "
        "const column = el.parentElement.getBoundingClientRect(); "
        "const head = el.closest('.chronik-lane-head').getBoundingClientRect(); "
        "return {textLeft: text.left, textRight: text.right, textBottom: text.bottom, "
        "columnLeft: column.left, columnRight: column.right, headBottom: head.bottom}; }"
    )
    assert bounds["textLeft"] >= bounds["columnLeft"] - 1
    assert bounds["textRight"] <= bounds["columnRight"] + 1
    assert bounds["textBottom"] <= bounds["headBottom"] + 1


def test_controls_reach_year_coarse_undated_and_context_entries(
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
    expect(page.locator('.chronik-calendar-group[data-year="1953"]').first).to_be_visible()
    page.locator("#chronik-scale").select_option("month")
    coarse = page.locator("button.chronik-coarse")
    expect(coarse).to_be_visible()
    coarse.click()
    expect(visible_detail(page).locator(".chronik-group-row").first).to_be_visible()
    visible_detail(page).press("Escape")
    undated = page.locator("button.chronik-undated")
    expect(undated).to_contain_text("Ohne Datum")
    undated.click()
    expect(visible_detail(page).locator(".chronik-source__link").first).to_be_visible()


def test_legend_and_shared_detail_keep_their_places(frontend_server, browser_context):
    page = open_chronik(frontend_server, browser_context)
    legend = page.locator(".chronik-legend")
    expect(legend).to_be_visible()
    expect(page.locator(".selection-detail__panel")).to_have_count(0)
    expect(page.locator(".selection-detail__slot")).to_be_hidden()
    legend_box = legend.bounding_box()
    main_box = page.locator(".chronik-main").bounding_box()
    assert legend_box["x"] > main_box["x"] + main_box["width"] / 2
