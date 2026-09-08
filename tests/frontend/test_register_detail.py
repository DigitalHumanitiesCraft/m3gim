"""Source-backed register navigation, complete lists and responsive details."""
from urllib.parse import parse_qs, quote

import pytest

pytest.importorskip("playwright")
from playwright.sync_api import expect

pytestmark = pytest.mark.frontend


def test_first_indices_click_offers_all_registers(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server)
    page.locator('[data-tab="indizes"]').first.click()
    menu = page.get_by_role("menu")
    expect(menu).to_be_visible()
    expect(menu.get_by_role("menuitemradio")).to_have_count(4)
    menu.get_by_role("menuitemradio", name="Werke").click()
    expect(page.locator(".idx-head__label")).to_have_text("Werke")
    expect(menu).to_be_hidden()


@pytest.mark.parametrize("activation", ["click", "Enter"])
@pytest.mark.parametrize("query", ["", "NIM_023"])
def test_institution_chip_uses_its_facet_and_preserves_search(
    frontend_server, browser_context, activation, query
):
    page = browser_context.new_page()
    page.goto(frontend_server + "#bestand/m3gim-data%3ANIM_023_7?suche=" + query)
    action = page.locator(".archiv-row--detail .chip-action", has_text="Nordwestdeutscher Rundfunk")
    expect(action).to_have_count(1)
    if activation == "click":
        action.click()
    else:
        action.focus()
        action.press(activation)
    page.wait_for_url("**institution=*")
    params = parse_qs(page.url.split("?", 1)[1])
    assert params["institution"] == ["Nordwestdeutscher Rundfunk"]
    assert "person" not in params
    assert params.get("suche", [""]) == [query]
    expected = ["NIM_023_10", "NIM_023_7", "NIM_023_8"]
    if not query:
        expected = ["NIM_005_17", "NIM_005_18", "NIM_005_19"] + expected
    rows = page.locator("#bestand-tbody tr[data-record-row]")
    expect(rows).to_have_count(len(expected))
    assert sorted(rows.evaluate_all("els => els.map(el => el.dataset.recordRow)")) == [
        "m3gim-data:" + identifier for identifier in expected
    ]


def test_authority_link_keyboard_activation_leaves_the_filter_unchanged(
    frontend_server, browser_context
):
    browser_context.route("https://www.wikidata.org/**", lambda route: route.fulfill(body="Wikidata"))
    page = browser_context.new_page()
    page.goto(frontend_server + "#bestand/m3gim-data%3ANIM_023_7")
    chip = page.locator(".archiv-row--detail .chip--role-pair", has_text="Malaniuk, Ira").first
    link = chip.locator("a.badge--wikidata")
    expect(link).to_be_visible()
    assert chip.locator("button a, a button").count() == 0
    original = page.url
    link.focus()
    with page.expect_popup() as popup:
        link.press("Enter")
    popup.value.wait_for_load_state()
    assert "wikidata.org/entity/Q94208" in popup.value.url
    assert page.url == original
    expect(chip.locator("button[data-action='filter']")).to_be_visible()


@pytest.mark.parametrize(
    ("query", "identifiers"),
    [("NIM_016", ["NIM_016_1", "NIM_016_4"]), ("NIM_016 1962-07-11", ["NIM_016_4"])],
)
def test_relationship_exposes_each_attesting_document_in_the_cut(
    frontend_server, browser_context, query, identifiers
):
    page = browser_context.new_page()
    page.goto(frontend_server + "#indizes/personen?suche=" + quote(query))
    page.get_by_role("button", name="Details zu Baasch, Dr. med. Ernst", exact=True).click()
    relation = page.locator(".idx-relation")
    expect(relation).to_have_count(1)
    relation.locator("summary").focus()
    relation.locator("summary").press("Enter")
    links = relation.locator(".idx-evidence")
    assert [text.removesuffix(" →") for text in links.all_text_contents()] == identifiers
    links.last.press("Enter")
    expect(page.locator(".inline-detail__head-sig")).to_have_text("UAKUG/NIM_016 4")
    assert parse_qs(page.url.split("?", 1)[1])["suche"] == [query]


def test_register_search_does_not_hide_a_co_mentioned_target(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + "#indizes/werke?suche=NIM_004")
    search = page.get_by_role("combobox", name="Suche", exact=True)
    search.fill("Tristan")
    search.press("ArrowDown")
    page.get_by_role("button", name="Registereintrag öffnen", exact=True).click()
    entry = page.get_by_role("button", name="Details zu Tristan und Isolde", exact=True)
    expect(entry).to_be_visible()
    page.locator('.detail-disclosure > summary', has_text='Im selben Dokument genannt').click()
    chip = page.locator(".idx-umfeld__chips > button.chip").first
    name = chip.locator(".chip-wert").inner_text()
    chip.click()
    expect(page.locator("#tab-indizes .selection-detail__title")).to_have_text(name)
    expect(search).to_have_value("")
    assert parse_qs(page.url.split("?", 1)[1])["suche"] == ["NIM_004"]


@pytest.mark.parametrize("width", [390, 800, 1440])
def test_dense_register_detail_keeps_bounds_lists_and_keyboard_return(
    frontend_server, browser_context, width
):
    page = browser_context.new_page()
    page.set_viewport_size({"width": width, "height": 900})
    page.emulate_media(reduced_motion="reduce")
    page.goto(frontend_server + "#indizes/werke")
    entry = page.get_by_role("button", name="Details zu Tristan und Isolde", exact=True)
    entry.scroll_into_view_if_needed()
    grid = page.locator(".idx-list")
    before = grid.evaluate("el => ({height: el.clientHeight, scroll: el.scrollTop})")
    entry.focus()
    entry.press("Enter")
    panel = page.locator("#tab-indizes .selection-detail__panel")
    expect(panel).to_be_visible()
    expect(panel.locator('.detail-disclosure > summary', has_text='Im selben Dokument genannt')).to_be_visible()
    expect(panel.locator('.idx-umfeld')).to_be_hidden()
    expect(panel.locator(".idx-komponist")).to_contain_text("Komponist:")
    parts = panel.locator(".idx-partien")
    expect(parts.locator(".chip:not(.mark-derived) .chip-wert")).to_have_text("Brangäne")
    more = parts.locator(".idx-roles__more")
    expect(more).to_be_visible()
    remainder = page.locator("#" + more.get_attribute("aria-controls"))
    assert not remainder.is_visible()
    more.focus()
    more.press("Enter")
    expect(remainder).to_be_visible()
    names = parts.locator(".mark-derived .chip-wert").all_text_contents()
    # Literal output of the documented single-work inference, including suspect bindings.
    assert sorted(names) == [
        "Amneris", "Ein Hirte", "Ein Steuermann", "Hirte", "Isolde", "Kurwenal",
        "König Marke", "Marke", "Matelot", "Melot", "Seemann", "Steuermann",
        "Stimme eines jungen Seemanns", "Tristan", "Venus", "pâtre",
    ]
    expect(parts).to_contain_text("Abgeleitet aus Dokumenten, die genau ein Werk nennen")
    panel.locator('.detail-disclosure > summary', has_text='Im selben Dokument genannt').click()
    expect(panel.locator('.idx-umfeld')).to_be_visible()
    assert grid.evaluate("el => el.clientHeight") == before["height"]
    assert grid.evaluate("el => el.scrollTop") == before["scroll"]
    metrics = panel.evaluate("""el => {
      const r = el.getBoundingClientRect();
      return {left: r.left, right: r.right, top: r.top, bottom: r.bottom,
        width: el.clientWidth, contentWidth: el.scrollWidth,
        height: el.clientHeight, contentHeight: el.scrollHeight};
    }""")
    assert 0 <= metrics["left"] < metrics["right"] <= width
    assert 0 <= metrics["top"] < metrics["bottom"] <= 900
    assert metrics["contentWidth"] <= metrics["width"] + 1
    assert metrics["contentHeight"] > metrics["height"]
    panel.evaluate("el => { el.scrollTop = el.scrollHeight; }")
    assert panel.evaluate("el => el.scrollTop") > 0
    expect(panel.get_by_role("button", name="Schließen")).to_be_in_viewport()
    panel.press("Escape")
    expect(panel).to_have_count(0)
    expect(entry).to_be_focused()
    entry.press("Enter")
    expect(panel).to_be_visible()
    expect(panel.locator(".idx-partien .idx-roles__more")).to_have_attribute("aria-expanded", "false")


@pytest.mark.parametrize("view", ["indizes/werke", "chronik", "netzwerk"])
def test_hidden_view_does_not_open_a_modal_over_the_next_tab(
    frontend_server, browser_context, view
):
    page = browser_context.new_page()
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto(frontend_server + "#" + view)
    if view.startswith("indizes"):
        page.get_by_role("button", name="Details zu Tristan und Isolde", exact=True).click()
    elif view == "chronik":
        page.locator(".chronik-source__link").first.click()
    else:
        page.locator(".netzwerk-node[tabindex='0']").press("Enter")
    panel = page.locator(".selection-detail__panel:visible")
    expect(panel).to_be_visible()
    page.locator('[data-tab="bestand"]').first.click()
    expect(page.locator("#tab-bestand")).to_be_visible()
    expect(page.locator("dialog[open]")).to_have_count(0)
    page.locator('[data-tab="statistik"]').first.click()
    expect(page.locator("#tab-statistik")).to_be_visible()
