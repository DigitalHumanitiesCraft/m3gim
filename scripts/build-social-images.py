# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=11.0"]
# ///
"""Builds the social card and the PNG icons of the application from the design tokens.

Data flow: docs/css/variables.css (accent colour) to docs/img/og.png,
docs/img/favicon-32.png and docs/img/apple-touch-icon.png. The head of every
page under docs/ points at these three files; the inline SVG favicon beside
them needs no build step.

Usage:
    python scripts/build-social-images.py [--css PFAD] [--out VERZEICHNIS]

The colour is read from the token file and never written here, so the mark
cannot drift from the band it sits in (knowledge/design.md § Tokens). The
wordmark is set in Georgia, the same serif the inline SVG favicon names, so the
raster icons and the vector one show the same letterforms.

The run is deterministic: no timestamps, no random placement, the same bytes
twice. Pillow writes no tIME chunk, so two runs are comparable by hash.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent
DEFAULT_CSS = REPO / "docs" / "css" / "variables.css"
DEFAULT_OUT = REPO / "docs" / "img"

# Georgia carries the superscript three of the wordmark and ships with Windows;
# the pages name it in the inline SVG favicon for the same reason.
SERIF_BOLD = Path("C:/Windows/Fonts/georgiab.ttf")

WORDMARK = "M\u00b3GIM"
SUBTITLE = "Mapping Mobile Musicians"
ICON_MARK = "M\u00b3"

PAPER = (255, 255, 255)
CARD_SIZE = (1200, 630)  # what Open Graph and Twitter scrape at


def read_token(css: Path, name: str) -> tuple[int, int, int]:
    """Reads one hex colour token out of the stylesheet.

    A missing token is a broken contract, not a case to paper over with a
    default: the whole point of reading the file is that the mark follows the
    palette.
    """
    text = css.read_text(encoding="utf-8")
    match = re.search(rf"--{re.escape(name)}:\s*#([0-9A-Fa-f]{{6}})\s*;", text)
    if not match:
        raise ValueError(f"{css} fuehrt kein Token --{name}")
    value = match.group(1)
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def _centred(draw: ImageDraw.ImageDraw, centre: tuple[float, float], text: str,
             font: ImageFont.FreeTypeFont, fill: tuple[int, int, int]) -> None:
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    draw.text((centre[0] - (right + left) / 2, centre[1] - (bottom + top) / 2),
              text, font=font, fill=fill)


def _font(size: int) -> ImageFont.FreeTypeFont:
    if not SERIF_BOLD.exists():
        raise FileNotFoundError(
            f"Schrift fehlt: {SERIF_BOLD}. Das Skript laeuft auf einer Maschine "
            "mit Georgia; ohne sie waere die Zeichnung nicht dieselbe."
        )
    return ImageFont.truetype(str(SERIF_BOLD), size)


def build_card(accent: tuple[int, int, int], soft: tuple[int, int, int]) -> Image.Image:
    card = Image.new("RGB", CARD_SIZE, accent)
    draw = ImageDraw.Draw(card)
    _centred(draw, (600, 300), WORDMARK, _font(168), PAPER)
    _centred(draw, (600, 428), SUBTITLE, _font(44), soft)
    return card


def build_icon(size: int, accent: tuple[int, int, int]) -> Image.Image:
    """Draws at four times the size and downsamples, because a rounded corner
    rasterised straight at 32 pixels comes out ragged."""
    scale = 4
    edge = size * scale
    icon = Image.new("RGBA", (edge, edge), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    draw.rounded_rectangle([0, 0, edge - 1, edge - 1], radius=int(edge * 0.16), fill=accent)
    _centred(draw, (edge / 2, edge / 2 - edge * 0.04), ICON_MARK, _font(int(edge * 0.62)), PAPER)
    return icon.resize((size, size), Image.LANCZOS)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--css", type=Path, default=DEFAULT_CSS)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    accent = read_token(args.css, "accent")
    soft = read_token(args.css, "accent-soft")
    args.out.mkdir(parents=True, exist_ok=True)

    written = [
        (args.out / "og.png", build_card(accent, soft)),
        (args.out / "favicon-32.png", build_icon(32, accent)),
        (args.out / "apple-touch-icon.png", build_icon(180, accent)),
    ]
    for path, image in written:
        image.save(path, optimize=True)
        print(f"[OK] {path.relative_to(REPO).as_posix()} ({path.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
