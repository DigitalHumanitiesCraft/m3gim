"""Geteilte Fixtures der Browser-Tests (Marker frontend, Playwright optional)."""

import contextlib
import http.server
import socket
import socketserver
import threading
import time
from pathlib import Path

import pytest

BASE = Path(__file__).parent.parent.parent
DOCS_DIR = BASE / "docs"


def _free_port() -> int:
    with contextlib.closing(socket.socket()) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def frontend_server():
    """Startet einen Thread-SimpleHTTPServer auf freiem Port, yieldet
    die URL und raeumt sauber ab."""
    port = _free_port()

    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Request-Log wuerde den pytest-Output fluten

    handler_factory = lambda *a, **kw: QuietHandler(
        *a, directory=str(DOCS_DIR), **kw
    )
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", port), handler_factory)
    httpd.daemon_threads = True
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.3)  # Startup-Puffer
    try:
        yield f"http://127.0.0.1:{port}/"
    finally:
        httpd.shutdown()
        httpd.server_close()
