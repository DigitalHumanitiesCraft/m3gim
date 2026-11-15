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
