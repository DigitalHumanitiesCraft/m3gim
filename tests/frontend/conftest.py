"""Geteilte Fixtures der Browser-Tests (Marker frontend, Playwright optional)."""

import http.server
import socketserver
import threading
from pathlib import Path

import pytest

BASE = Path(__file__).parent.parent.parent
DOCS_DIR = BASE / "docs"


@pytest.fixture(scope="session")
def frontend_server():
    """Startet einen Thread-SimpleHTTPServer auf freiem Port, yieldet
    die URL und raeumt sauber ab."""

    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Request-Log wuerde den pytest-Output fluten

    handler_factory = lambda *a, **kw: QuietHandler(*a, directory=str(DOCS_DIR), **kw)
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler_factory)
    httpd.daemon_threads = True
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{httpd.server_address[1]}/"
    finally:
        httpd.shutdown()
        httpd.server_close()


@pytest.fixture(scope="session")
def frontend_browser():
    """Share one Chromium process; tests still create isolated contexts."""
    pytest.importorskip("playwright")
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        yield browser
        browser.close()


@pytest.fixture
def browser_context(frontend_browser):
    """Isolated context that fails on uncaught browser errors."""
    errors = []
    context = frontend_browser.new_context()

    def watch(page):
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on(
            "console",
            lambda message: (
                errors.append(message.text) if message.type == "error" else None
            ),
        )

    context.on("page", watch)
    yield context
    context.close()
    assert not errors, errors
