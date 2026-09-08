"""Exercise application updates with an incompatible module in the HTTP cache."""

import http.server
import threading
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

import pytest

pytest.importorskip("playwright")
from playwright.sync_api import expect

DOCS = Path(__file__).resolve().parents[2] / "docs"


@pytest.fixture(params=["/", "/m3gim/"])
def cached_module_server(request):
    prefix = request.param
    requests = Counter()

    class Handler(http.server.SimpleHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(DOCS), **kwargs)

        def log_message(self, *args):
            pass

        def do_GET(self):
            requests[self.path] += 1
            relative = self.path.removeprefix(prefix)
            if relative == "prime.html":
                body = b"<!doctype html><title>Cache fixture</title>"
                content_type = "text/html"
            elif relative == "js/ui/filter-state.js":
                # A fresh cached module from before the new facet API existed.
                body = b"export const cachedBeforeUpdate = true;"
                content_type = "text/javascript"
            else:
                self.path = "/" + relative
                super().do_GET()
                return
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=31536000")
            self.end_headers()
            self.wfile.write(body)

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}{prefix}", requests, prefix
    finally:
        server.shutdown()
        server.server_close()


@pytest.mark.frontend
def test_dashboard_bypasses_cached_module_and_preserves_shared_state(
    cached_module_server, browser_context
):
    base, requests, prefix = cached_module_server
    page = browser_context.new_page()
    old_module = prefix + "js/ui/filter-state.js"
    for _ in range(2):
        page.goto(base + "prime.html")
        assert page.evaluate(
            "async () => (await import('./js/ui/filter-state.js')).cachedBeforeUpdate"
        )
    assert requests[old_module] == 1, "The incompatible response must actually be cached"

    target = base + "#statistik?ort=Z%C3%BCrich"
    page.goto(target, wait_until="networkidle")
    expect(page.locator("#tab-statistik .dashboard-panel")).to_have_count(2)
    expect(page.locator("#tab-statistik .vs-status__count")).to_contain_text("42")
    expect(page).to_have_url(target)
    assert page.evaluate(
        "async () => (await import('./js/ui/filter-state.js')).getFilter().ort"
    ) == ["Zürich"]
    assert requests[old_module] == 1

    module_requests = [url for url in requests if url.startswith(prefix + "js/")]
    current_modules = [url for url in module_requests if url != old_module]
    assert len(current_modules) > 10
    assert all(urlsplit(url).query.startswith("v=") for url in current_modules)
    assert len({urlsplit(url).query for url in current_modules}) == 1
    assert any(url.startswith(old_module + "?v=") for url in current_modules)

    page.reload(wait_until="networkidle")
    expect(page.locator("#tab-statistik .vs-status__count")).to_contain_text("42")
    page.get_by_role("tab", name="Orte", exact=True).click()
    expect(page.locator("#tab-karte .places-main")).to_be_visible()
    assert page.evaluate(
        "async () => (await import('./js/ui/filter-state.js')).getFilter().ort"
    ) == ["Zürich"]
    page.close()
