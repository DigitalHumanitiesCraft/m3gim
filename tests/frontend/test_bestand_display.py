"""Exhaustive Bestand checks with rendering and source defects separated."""

import pytest

# Browser stack is an optional extra; skip instead of failing the default run.
pytest.importorskip("playwright")

import os
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).parent.parent.parent


def run_verifier(frontend_server: str, mode: str) -> subprocess.CompletedProcess:
    script = BASE / "tests" / "tools" / "verify_bestand_display.py"
    proc = subprocess.run(
        [sys.executable, str(script), "--mode", mode],
        env={
            **os.environ,
            "M3GIM_VERIFY_URL": frontend_server,
            "PYTHONIOENCODING": "utf-8",
        },
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=300,
    )
    return proc


def report_process(proc: subprocess.CompletedProcess) -> None:
    if proc.stdout:
        print(proc.stdout)
    if proc.stderr:
        print("STDERR:", proc.stderr, file=sys.stderr)


def settle_layout(page) -> None:
    """Wait until rendering and browser scroll anchoring have both finished."""
    page.evaluate(
        """() => new Promise(resolve => {
            const main = document.querySelector('.archiv-main');
            if (!main) { resolve(); return; }
            let last = -1;
            let stableFrames = 0;
            const tick = () => {
                if (main.scrollTop === last) stableFrames += 1;
                else { last = main.scrollTop; stableFrames = 0; }
                if (stableFrames >= 6) resolve();
                else requestAnimationFrame(tick);
            };
            tick();
        })"""
    )


def row_top(page, record_id: str) -> float:
    return page.locator(f'[data-record-row="{record_id}"]').evaluate(
        "element => element.getBoundingClientRect().top"
    )


@pytest.mark.frontend
@pytest.mark.parametrize("viewport", [(800, 900), (1366, 800), (2048, 1111)])
@pytest.mark.parametrize("query", ["", "?suche=NIM_023"])
def test_bestand_direct_record_starts_below_sticky_context(
    frontend_server: str, browser_context, viewport: tuple[int, int], query: str
) -> None:
    from playwright.sync_api import expect

    page = browser_context.new_page()
    page.emulate_media(reduced_motion="reduce")
    page.set_viewport_size({"width": viewport[0], "height": viewport[1]})
    page.goto(
        frontend_server + "#bestand/m3gim-data%3ANIM_023_10" + query,
        wait_until="networkidle",
    )
    settle_layout(page)

    parent = page.locator(
        '[data-konvolut-header="m3gim-data:NIM_023"]'
    )
    record = page.locator('[data-record-row="m3gim-data:NIM_023_10"]')
    detail = record.locator("xpath=following-sibling::tr[1]")
    if query:
        expect(parent).to_have_count(0)
    else:
        expect(parent).to_have_attribute("aria-expanded", "true")
    expect(record).to_have_attribute("aria-expanded", "true")
    expect(detail).to_have_class("archiv-row--detail")
    expect(detail).to_be_visible()

    geometry = page.evaluate(
        """() => {
            const main = document.querySelector('.archiv-main');
            const column = main.querySelector('.archiv-table thead th');
            const parent = main.querySelector(
                '[data-konvolut-header="m3gim-data:NIM_023"]');
            const record = main.querySelector(
                '[data-record-row="m3gim-data:NIM_023_10"]');
            return {
                mainTop: main.getBoundingClientRect().top,
                column: column.getBoundingClientRect().toJSON(),
                parent: parent?.getBoundingClientRect().toJSON(),
                record: record.getBoundingClientRect().toJSON(),
            };
        }"""
    )
    assert geometry["column"]["top"] >= geometry["mainTop"] - 1
    context_bottom = geometry["column"]["bottom"]
    if geometry["parent"]:
        assert geometry["parent"]["top"] >= context_bottom - 2
        context_bottom = geometry["parent"]["bottom"]
    assert abs(geometry["record"]["top"] - context_bottom) <= 2


@pytest.mark.frontend
def test_bestand_renders_every_linked_basis_record(frontend_server):
    proc = run_verifier(frontend_server, "render")
    report_process(proc)
    assert proc.returncode == 0, "Bestand-Darstellung ist unvollständig"


@pytest.mark.frontend
@pytest.mark.data_quality
def test_bestand_source_rows_reach_jsonld(frontend_server):
    proc = run_verifier(frontend_server, "source")
    report_process(proc)
    assert proc.returncode == 0, "Objektzeilen fehlen im JSON-LD"


@pytest.mark.frontend
@pytest.mark.parametrize("width", [1366, 800])
def test_bestand_title_can_be_copied_without_toggling(
    frontend_server: str, browser_context, width: int
) -> None:
    from playwright.sync_api import expect

    browser_context.grant_permissions(["clipboard-read", "clipboard-write"])
    page = browser_context.new_page()
    page.set_viewport_size({"width": width, "height": 900})
    page.goto(
        frontend_server + "#bestand/m3gim-data%3ANIM_023_5",
        wait_until="networkidle",
    )
    row = page.locator('[data-record-row="m3gim-data:NIM_023_5"]')
    title = row.locator(".archiv-titel")
    expect(row).to_have_attribute("aria-expanded", "true")
    expected_title = page.evaluate(
        "window.m3gim.store.records.get('m3gim-data:NIM_023_5')['rico:title']"
    )
    assert title.text_content() == expected_title

    title.scroll_into_view_if_needed()
    endpoints = title.evaluate("""element => {
        const text = element.firstChild;
        const caret = offset => {
            const range = document.createRange();
            range.setStart(text, offset);
            range.collapse(true);
            const rect = range.getBoundingClientRect();
            return {x: rect.x, y: rect.y + rect.height / 2};
        };
        return [caret(0), caret(text.length)];
    }""")
    page.mouse.move(**endpoints[0])
    page.mouse.down()
    page.mouse.move(**endpoints[1], steps=20)
    page.mouse.up()
    assert page.evaluate("window.getSelection().toString()") == expected_title
    expect(row).to_have_attribute("aria-expanded", "true")
    page.keyboard.press("Control+c")
    assert page.evaluate("navigator.clipboard.readText()") == expected_title

    page.evaluate("window.getSelection().removeAllRanges()")
    title.dblclick(position={"x": 8, "y": 8})
    assert page.evaluate("window.getSelection().toString().length") > 0
    expect(row).to_have_attribute("aria-expanded", "true")
    page.evaluate("window.getSelection().removeAllRanges()")
    row.locator(".archiv-signatur").click()
    expect(row).to_have_attribute("aria-expanded", "false")
    title.click()
    expect(row).to_have_attribute("aria-expanded", "false")
    row.focus()
    page.keyboard.press("Enter")
    expect(row).to_have_attribute("aria-expanded", "true")
    page.keyboard.press("Escape")
    expect(row).to_have_attribute("aria-expanded", "false")


@pytest.mark.frontend
@pytest.mark.parametrize("activation", ["mouse", "keyboard"])
@pytest.mark.parametrize("width", [1366, 800])
def test_bestand_detail_toggle_keeps_activated_row_in_place(
    frontend_server: str, browser_context, activation: str, width: int
) -> None:
    from playwright.sync_api import expect

    page = browser_context.new_page()
    page.set_viewport_size({"width": width, "height": 900})
    page.goto(
        frontend_server + "#bestand/m3gim-data%3ANIM_007_10",
        wait_until="networkidle",
    )
    open_row = page.locator('[data-record-row="m3gim-data:NIM_007_10"]')
    target_id = "m3gim-data:NIM_007_11"
    target = page.locator(f'[data-record-row="{target_id}"]')
    expect(open_row).to_have_attribute("aria-expanded", "true")
    expect(target).to_be_visible()

    target.evaluate(
        "element => element.scrollIntoView({block: 'center', behavior: 'instant'})"
    )
    if activation == "keyboard":
        target.focus()
    settle_layout(page)
    top_before = row_top(page, target_id)
    if activation == "mouse":
        target.locator(".archiv-signatur").click()
    else:
        page.keyboard.press("Enter")
    expect(target).to_have_attribute("aria-expanded", "true")
    expect(page).to_have_url(frontend_server + "#bestand/m3gim-data%3ANIM_007_11")
    settle_layout(page)
    assert abs(row_top(page, target_id) - top_before) <= 1

    top_before_close = row_top(page, target_id)
    if activation == "mouse":
        target.locator(".archiv-signatur").click()
    else:
        page.keyboard.press("Escape")
    expect(target).to_have_attribute("aria-expanded", "false")
    expect(page).to_have_url(frontend_server + "#bestand")
    settle_layout(page)
    assert abs(row_top(page, target_id) - top_before_close) <= 1

    lower_id = "m3gim-data:NIM_007_20"
    lower = page.locator(f'[data-record-row="{lower_id}"]')
    lower.evaluate(
        "element => element.scrollIntoView({block: 'center', behavior: 'instant'})"
    )
    if activation == "keyboard":
        lower.focus()
    settle_layout(page)
    lower_top_before = row_top(page, lower_id)
    if activation == "mouse":
        lower.locator(".archiv-signatur").click()
    else:
        page.keyboard.press("Enter")
    expect(lower).to_have_attribute("aria-expanded", "true")
    settle_layout(page)
    assert abs(row_top(page, lower_id) - lower_top_before) <= 1
    shared_url = page.url
    page.reload(wait_until="networkidle")
    expect(page).to_have_url(shared_url)
    expect(lower).to_have_attribute("aria-expanded", "true")
    expect(page.locator('[data-konvolut-header="m3gim-data:NIM_007"]')).to_have_attribute(
        "aria-expanded", "true"
    )
