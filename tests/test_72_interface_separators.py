"""No middle dot as separator in interface text (interface plan 2026-11-15).

The project lead reads the middle dot (U+00B7) as a mark of generated text.
Counts stand as label plus number, enumerations are joined by commas. The
check scans every delivered page, stylesheet and script line outside
comments, so a new string with the dot fails here before it reaches a reader.
"""

import re
from pathlib import Path

import pytest

DOCS = Path(__file__).parent.parent / "docs"
COMMENT = re.compile(r"^\s*(//|\*|/\*)")
DOT = "·"


def _sources():
    for pattern in ("*.html", "css/*.css", "js/**/*.js"):
        yield from DOCS.glob(pattern)


@pytest.mark.parametrize("path", sorted(_sources()), ids=lambda p: str(p.relative_to(DOCS)))
def test_no_middle_dot_in_interface_text(path: Path) -> None:
    offending = [
        f"{n}: {line.strip()[:80]}"
        for n, line in enumerate(path.read_text(encoding="utf-8").split("\n"), 1)
        if DOT in line and not COMMENT.match(line)
    ]
    assert not offending, "\n".join(offending)


# A semicolon or a dash between two words inside a string literal joins two
# statements; interface sentences end with a full stop instead. Export
# metadata and the CSV column format name a file convention, not prose.
SEMICOLON = re.compile(r"[a-zäöüß]; [A-Za-zÄÖÜäöüß]")
DASH = re.compile(r"[A-Za-zÄÖÜäöüß)] [\u2013\u2014] [A-Za-zÄÖÜäöüß(]")
EXEMPT = ("<creator>", "Semikolon", "console.", "%c", "<!--")
STRING = re.compile(r"'([^']*)'|`([^`]*)`|\"([^\"]*)\"")


def _string_parts(line: str) -> str:
    """The text inside quotes of one source line, code outside dropped."""
    return " ".join(a or b or c for a, b, c in STRING.findall(line))


@pytest.mark.parametrize("path", sorted([*DOCS.glob("js/**/*.js"), DOCS.parent / "scripts/_site_html.py"]),
                         ids=lambda p: p.name)
def test_no_semicolon_or_dash_connector_in_interface_strings(path: Path) -> None:
    offending = []
    for n, line in enumerate(path.read_text(encoding="utf-8").split("\n"), 1):
        if COMMENT.match(line) or line.lstrip().startswith("#") or any(e in line for e in EXEMPT):
            continue
        text = _string_parts(line)
        if SEMICOLON.search(text) or DASH.search(text):
            offending.append(f"{n}: {line.strip()[:90]}")
    assert not offending, "\n".join(offending)
