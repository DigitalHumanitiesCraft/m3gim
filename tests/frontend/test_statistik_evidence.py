import json
from pathlib import Path
from urllib.parse import quote

import pytest

pytest.importorskip("playwright")
from playwright.sync_api import expect


TASK4_IDS = {
    "m3gim-data:NIM_004_18", "m3gim-data:NIM_005_17",
    "m3gim-data:NIM_011_3", "m3gim-data:NIM_011_5",
    "m3gim-data:NIM_011_6", "m3gim-data:NIM_142_22_4",
    "m3gim-data:NIM_142_27",
}


@pytest.mark.frontend
def test_composer_ranking_opens_task4_records(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(
        frontend_server
        + "#statistik?ort=Bayreuth&werk=Tristan%20und%20Isolde&jahr=1954-1954",
        wait_until="networkidle",
    )
    page.get_by_role("button", name="Repertoire", exact=True).click()

    section = page.locator(".stat-subsection", has_text="Komponisten").last
    section.get_by_role("button", name="Wagner, Richard", exact=True).click()
    evidence = section.locator(".stat-evidence")
    expect(evidence.locator(".stat-evidence__title")).to_have_text(
        "Wagner, Richard · 7 Belege"
    )
    buttons = evidence.locator(".stat-evidence__record")
    assert set(buttons.evaluate_all("els => els.map(el => el.dataset.recordId)")) == TASK4_IDS
    labels = buttons.all_inner_texts()
    assert len(labels) == 7
    assert all(label.startswith("NIM_") and " · " in label for label in labels)

    target = sorted(TASK4_IDS)[-1]
    button = evidence.locator(f'[data-record-id="{target}"]')
    button.focus()
    assert button.evaluate("el => document.activeElement === el")
    button.press("Enter")
    page.wait_for_url("**#bestand/**")
    assert "#bestand/" + quote(target, safe="") in page.url
    assert all(
        term in page.url
        for term in ("ort=Bayreuth", "werk=Tristan", "jahr=1954-1954")
    )
    expect(page.locator('.archiv-row--detail .inline-detail__head-sig')).to_have_text(
        "UAKUG/NIM_142 27"
    )
    page.close()


@pytest.mark.frontend
def test_tail_discloses_individual_filter_paths(frontend_server, browser_context):
    page = browser_context.new_page()
    page.goto(frontend_server + "#statistik", wait_until="networkidle")

    types = page.locator(".stat-subsection", has_text="Typen").first
    more = types.get_by_role("button", name="Weitere (4)", exact=True)
    visiting_card = types.get_by_role("button", name="Visitenkarte", exact=True)
    assert visiting_card.count() == 0
    expect(more).to_have_attribute("aria-expanded", "false")
    assert more.locator("xpath=ancestor::li[1]").locator(".stat-bars__track").count() == 0
    more.click()
    expect(more).to_have_attribute("aria-expanded", "true")
    expect(visiting_card).to_be_visible()
    card_row = visiting_card.locator("xpath=ancestor::li[1]")
    assert "width: 2%" in card_row.locator(".stat-bars__fill").get_attribute("style")
    press = types.get_by_role("button", name="Presse", exact=True)
    assert "width: 100%" in press.locator(
        "xpath=ancestor::li[1]"
    ).locator(".stat-bars__fill").get_attribute("style")
    more.click()
    expect(more).to_have_attribute("aria-expanded", "false")
    assert visiting_card.count() == 0
    more.click()
    visiting_card.click()
    expect(page).to_have_url(frontend_server + "#bestand?typ=businessCard")
    page.close()


@pytest.mark.frontend
def test_parent_type_count_matches_its_hierarchical_filter(
    frontend_server, browser_context
):
    page = browser_context.new_page()
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    types = page.locator(".stat-subsection", has_text="Typen").first
    correspondence = types.get_by_role("button", name="Korrespondenz", exact=True)
    row = correspondence.locator("xpath=ancestor::li[1]")
    expect(row.locator(".stat-bars__count")).to_have_text("53")
    correspondence.click()
    expect(page).to_have_url(frontend_server + "#bestand?typ=correspondence")
    expect(page.locator("#tab-bestand .vs-status__count")).to_contain_text("53 von")
    page.close()


@pytest.mark.frontend
def test_missing_type_uses_evidence_instead_of_invalid_filter(
    frontend_server, browser_context
):
    target = "m3gim-data:NIM_023_5"
    payload = json.loads(
        (Path(__file__).parents[2] / "docs/data/m3gim.jsonld").read_text(encoding="utf-8")
    )
    record = next(node for node in payload["@graph"] if node.get("@id") == target)
    record.pop("rico:hasDocumentaryFormType")

    def serve_modified_graph(route):
        route.fulfill(json=payload)

    browser_context.route("**/data/m3gim.jsonld", serve_modified_graph)
    page = browser_context.new_page()
    page.goto(frontend_server + "#statistik", wait_until="networkidle")
    types = page.locator(".stat-subsection", has_text="Typen").first
    types.get_by_role("button", name="Weitere (5)", exact=True).click()
    types.get_by_role("button", name="ohne Typ", exact=True).click()
    evidence = types.locator(".stat-evidence__record")
    expect(evidence).to_contain_text("NIM_023 5")
    assert evidence.get_attribute("data-record-id") == target
    evidence.click()
    expect(page).to_have_url(frontend_server + "#bestand/" + quote(target, safe=""))
    expect(page.locator('.archiv-row--detail .inline-detail__head-sig')).to_have_text(
        "UAKUG/NIM_023 5"
    )
    page.close()
