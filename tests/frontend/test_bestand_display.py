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
