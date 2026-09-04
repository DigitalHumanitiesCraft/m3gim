"""Fuss und Kopfleiste stehen mehrfach identisch im Repo.

Das Fussmarkup (E-209) ist in jede Seite unter ``docs/`` kopiert und ein
weiteres Mal in die FOOT-Vorlage von ``scripts/build-model-page.py``, aus der
``docs/datenmodell.html`` entsteht. Ohne Buildschritt fuer HTML gibt es keine
technische Klammer um diese Kopien; dieser Test ist sie. Er zieht den Fuss aus
der Vorlage des Generators und vergleicht ihn Zeichen fuer Zeichen mit dem Fuss
jeder ausgelieferten Seite. Faellt er, ist eine Kopie gedriftet: die Vorlage ist
die Quelle, die Seiten folgen.

Dasselbe gilt fuer die Kopfleiste der Infoseiten. Sie traegt auf jeder Seite
dieselbe Marke, denselben Untertitel und dieselben drei Infolinks; die einzige
erlaubte Abweichung ist das ``aria-current`` am Link auf die eigene Seite.
``docs/index.html`` bleibt aussen vor, weil ihre Leiste zusaetzlich die Tabs
traegt.
"""

import importlib.util
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
GENERATOR = REPO_ROOT / "scripts" / "build-model-page.py"
DOCS = REPO_ROOT / "docs"

FOOTER_OPEN = '<footer class="app-footer">'
FOOTER_CLOSE = "</footer>"

TOPBAR_OPEN = '<header class="topbar">'
TOPBAR_CLOSE = "</header>"
CURRENT = ' aria-current="page"'


def _extract_footer(html: str, source: str) -> str:
    start = html.find(FOOTER_OPEN)
    assert start != -1, f"{source} traegt keinen {FOOTER_OPEN}"
    end = html.find(FOOTER_CLOSE, start)
    assert end != -1, f"{source} schliesst den Fuss nicht"
    assert html.find(FOOTER_OPEN, start + 1) == -1, f"{source} traegt zwei Fuesse"
    return html[start : end + len(FOOTER_CLOSE)]


@pytest.fixture(scope="module")
def generator():
    spec = importlib.util.spec_from_file_location("build_model_page", GENERATOR)
    module = importlib.util.module_from_spec(spec)
    sys.modules["build_model_page"] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def template_footer(generator) -> str:
    return _extract_footer(generator.FOOT, "FOOT")


def _extract_topbar(html: str, source: str) -> str:
    start = html.find(TOPBAR_OPEN)
    assert start != -1, f"{source} traegt keine {TOPBAR_OPEN}"
    end = html.find(TOPBAR_CLOSE, start)
    assert end != -1, f"{source} schliesst die Kopfleiste nicht"
    return html[start : end + len(TOPBAR_CLOSE)]


@pytest.fixture(scope="module")
def template_topbar(generator) -> str:
    return _extract_topbar(generator.HEAD, "HEAD")


def _info_pages() -> list[Path]:
    pages = [p for p in _pages() if p.name != "index.html"]
    assert len(pages) >= 4, "weniger Infoseiten als erwartet unter docs/"
    return pages


def _pages() -> list[Path]:
    pages = sorted(DOCS.glob("*.html"))
    assert len(pages) >= 5, "weniger Seiten als erwartet unter docs/"
    return pages


@pytest.mark.parametrize("page", _pages(), ids=lambda p: p.name)
def test_footer_matches_template(page: Path, template_footer: str) -> None:
    footer = _extract_footer(page.read_text(encoding="utf-8"), page.name)
    assert footer == template_footer, (
        f"Der Fuss in docs/{page.name} weicht von der FOOT-Vorlage in "
        f"scripts/build-model-page.py ab."
    )


def test_template_footer_is_substantial(template_footer: str) -> None:
    """Ein leerer oder verkuerzter Fuss darf nicht trivial bestehen."""
    for needle in (
        'class="app-footer__kug"',
        'src="img/kug-logo.svg"',
        'src="img/cc-by.svg"',
        "Impressum",
        "CC BY 4.0",
    ):
        assert needle in template_footer, f"FOOT-Vorlage ohne {needle!r}"
    assert template_footer.count("app-footer__group") == 2


@pytest.mark.parametrize("page", _pages(), ids=lambda p: p.name)
def test_stylesheet_links_carry_the_asset_version(page, generator):
    """Every stylesheet link names the generator's version, so a bump happens in
    one place and a stale cache cannot show new markup with old CSS."""
    html = page.read_text(encoding="utf-8")
    links = re.findall(r'<link rel="stylesheet" href="css/[a-z-]+\.css(\?v=[^"]*)?"', html)
    assert links, f"{page.name} ohne Stylesheet-Links"
    for suffix in links:
        assert suffix == f"?v={generator.ASSET_VERSION}", f"{page.name}: Stylesheet-Link ohne aktuelle Version {generator.ASSET_VERSION}"


@pytest.mark.parametrize("page", _info_pages(), ids=lambda p: p.name)
def test_info_topbar_matches_template(page: Path, template_topbar: str) -> None:
    """Die Kopfleiste einer Infoseite ist die der HEAD-Vorlage, bis auf die
    Markierung der eigenen Seite."""
    topbar = _extract_topbar(page.read_text(encoding="utf-8"), page.name)
    assert topbar.replace(CURRENT, "") == template_topbar.replace(CURRENT, ""), (
        f"Die Kopfleiste in docs/{page.name} weicht von der HEAD-Vorlage in "
        f"scripts/build-model-page.py ab."
    )


@pytest.mark.parametrize("page", _info_pages(), ids=lambda p: p.name)
def test_info_topbar_marks_the_current_page(page: Path) -> None:
    """Genau der Link auf die eigene Seite traegt ``aria-current``; das
    Impressum steht nicht in der Leiste und markiert deshalb nichts."""
    topbar = _extract_topbar(page.read_text(encoding="utf-8"), page.name)
    marked = re.findall(r'<a href="([^"]+)"' + re.escape(CURRENT), topbar)
    if page.name == "impressum.html":
        assert marked == [], "Das Impressum steht nicht in der Kopfleiste"
    else:
        assert marked == [page.name], f"{page.name}: aria-current auf {marked}"


def test_template_topbar_is_substantial(template_topbar: str) -> None:
    """Eine leere oder verkuerzte Leiste darf nicht trivial bestehen."""
    for needle in (
        'class="topbar__brand"',
        'class="topbar__subtitle"',
        'class="topbar__badge"',
        'aria-label="Informationsseiten"',
        'href="about.html"',
        'href="projekt.html"',
        'href="datenmodell.html"',
    ):
        assert needle in template_topbar, f"HEAD-Vorlage ohne {needle!r}"
