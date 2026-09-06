"""Fuss und Kopfleiste stehen in jeder Seite, geschrieben hat sie der Generator.

Die Vorlagen HEAD und FOOT in ``scripts/build-model-page.py`` sind die einzige
Quelle der gemeinsamen Regionen; ``sync_shared_regions`` spritzt sie in die
Seiten unter ``docs/`` ein. Dieser Test ist das Gate dagegen, dass der Lauf
ausgeblieben ist: Er zieht Fuss und Kopfleiste aus den Vorlagen und vergleicht
sie zeichenweise mit den ausgelieferten Seiten. Faellt er, ist eine Seite nicht
nachgezogen, und ``python scripts/build-model-page.py`` stellt sie her.

Die Kopfleiste gilt fuer alle fuenf Seiten, ``docs/index.html`` eingeschlossen
(Projektleitung, 2026-09-05). Was die Seite von den anderen unterscheidet, die
lebende Tabliste statt der Links und das ``aria-current`` auf dem Link der
eigenen Seite, erzeugt ``topbar_for`` und wird deshalb mitverglichen.
"""

import importlib.util
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
GENERATOR = REPO_ROOT / "scripts" / "build-model-page.py"
DOCS = REPO_ROOT / "docs"


@pytest.fixture(scope="module")
def generator():
    spec = importlib.util.spec_from_file_location("build_model_page", GENERATOR)
    module = importlib.util.module_from_spec(spec)
    sys.modules["build_model_page"] = module
    spec.loader.exec_module(module)
    return module


def _pages() -> list[Path]:
    pages = sorted(DOCS.glob("*.html"))
    assert len(pages) >= 5, "weniger Seiten als erwartet unter docs/"
    return pages


@pytest.mark.parametrize("page", _pages(), ids=lambda p: p.name)
def test_footer_matches_template(page: Path, generator) -> None:
    footer = generator.extract_region(
        page.read_text(encoding="utf-8"),
        generator.FOOTER_OPEN,
        generator.FOOTER_CLOSE,
        page.name,
    )
    expected = generator.extract_region(
        generator.FOOT, generator.FOOTER_OPEN, generator.FOOTER_CLOSE, "FOOT"
    )
    assert footer == expected, (
        f"Der Fuss in docs/{page.name} ist nicht nachgezogen; "
        f"python scripts/build-model-page.py stellt ihn her."
    )


@pytest.mark.parametrize("page", _pages(), ids=lambda p: p.name)
def test_topbar_matches_template(page: Path, generator) -> None:
    """Die Kopfleiste ist die erzeugte, samt Markierung der eigenen Seite."""
    topbar = generator.extract_region(
        page.read_text(encoding="utf-8"),
        generator.TOPBAR_OPEN,
        generator.TOPBAR_CLOSE,
        page.name,
    )
    assert topbar == generator.topbar_for(page.name), (
        f"Die Kopfleiste in docs/{page.name} ist nicht nachgezogen; "
        f"python scripts/build-model-page.py stellt sie her."
    )


@pytest.mark.parametrize("page", _pages(), ids=lambda p: p.name)
def test_stylesheet_links_carry_the_asset_version(page, generator):
    """Every stylesheet link names the generator's version, so a bump happens in
    one place and a stale cache cannot show new markup with old CSS."""
    html = page.read_text(encoding="utf-8")
    links = re.findall(r'<link rel="stylesheet" href="css/[a-z-]+\.css(\?v=[^"]*)?"', html)
    assert links, f"{page.name} ohne Stylesheet-Links"
    for suffix in links:
        assert suffix == f"?v={generator.ASSET_VERSION}", f"{page.name}: Stylesheet-Link ohne aktuelle Version {generator.ASSET_VERSION}"


def test_templates_are_substantial(generator) -> None:
    """Leere oder verkuerzte Vorlagen duerfen nicht trivial bestehen, weil ein
    ausgeduennter Fuss sonst in alle Seiten liefe."""
    footer = generator.extract_region(
        generator.FOOT, generator.FOOTER_OPEN, generator.FOOTER_CLOSE, "FOOT"
    )
    for needle in (
        'class="app-footer__kug"',
        'src="img/kug-logo.svg"',
        'src="img/cc-by.svg"',
        "Impressum",
        "CC BY 4.0",
    ):
        assert needle in footer, f"FOOT-Vorlage ohne {needle!r}"
    assert footer.count("app-footer__group") == 2

    topbar = generator.topbar_for("about.html")
    for needle in (
        'class="topbar__brand"',
        'class="topbar__badge"',
        'aria-label="Informationsseiten"',
        'href="about.html" aria-current="page"',
        'href="projekt.html"',
        'href="datenmodell.html"',
    ):
        assert needle in topbar, f"Kopfleisten-Vorlage ohne {needle!r}"

    # Beide Auspraegungen der Ansichtsnavigation tragen alle Ansichten: die
    # Infoseite als Verweise, die Anwendungsseite als lebende Tabliste.
    tabs = [tab.name for _, group in generator.TAB_GROUPS for tab in group]
    assert len(tabs) >= 7, "weniger Ansichten in der Leiste als erwartet"
    for name in tabs:
        assert f'href="index.html#{name}"' in topbar, f"Infoleiste ohne Ansicht {name!r}"
    app = generator.topbar_for("index.html")
    assert 'role="tablist"' in app
    for name in tabs:
        assert f'data-tab="{name}"' in app, f"Anwendungsleiste ohne Ansicht {name!r}"
    assert 'id="indizes-register-menu"' in app
    assert 'id="korb-badge"' in app


def test_impressum_marks_nothing_in_the_topbar(generator) -> None:
    """Das Impressum steht nicht in der Leiste und markiert deshalb nichts."""
    assert 'aria-current="page"' not in generator.topbar_for("impressum.html")
