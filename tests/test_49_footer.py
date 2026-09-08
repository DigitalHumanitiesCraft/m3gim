"""Fuss, Kopfleiste und Head stehen in jeder Seite aus derselben HTML-Quelle.

``scripts/_site_html.py`` ist die einzige Quelle der gemeinsamen Regionen;
``sync-site-html.py`` zieht sie ohne Vokabular- oder Datenverarbeitung nach.

Die Kopfleiste gilt fuer alle fuenf Seiten, ``docs/index.html`` eingeschlossen
(Projektleitung, 2026-09-05). Was die Seite von den anderen unterscheidet, die
lebende Tabliste statt der Links und das ``aria-current`` auf dem Link der
eigenen Seite, erzeugt ``topbar_for`` und wird deshalb mitverglichen.
"""

import re
import shutil
from pathlib import Path

import pytest

from scripts import _site_html as site_html

REPO_ROOT = Path(__file__).parent.parent
DOCS = REPO_ROOT / "docs"


def _pages() -> list[Path]:
    pages = sorted(DOCS.glob("*.html"))
    assert len(pages) >= 5, "weniger Seiten als erwartet unter docs/"
    return pages


@pytest.mark.parametrize("page", _pages(), ids=lambda p: p.name)
def test_footer_matches_template(page: Path) -> None:
    footer = site_html.extract_region(
        page.read_text(encoding="utf-8"),
        site_html.FOOTER_OPEN,
        site_html.FOOTER_CLOSE,
        page.name,
    )
    assert footer == site_html.FOOTER, (
        f"Der Fuss in docs/{page.name} ist nicht nachgezogen; "
        f"python scripts/sync-site-html.py stellt ihn her."
    )


@pytest.mark.parametrize("page", _pages(), ids=lambda p: p.name)
def test_topbar_matches_template(page: Path) -> None:
    """Die Kopfleiste ist die erzeugte, samt Markierung der eigenen Seite."""
    topbar = site_html.extract_region(
        page.read_text(encoding="utf-8"),
        site_html.TOPBAR_OPEN,
        site_html.TOPBAR_CLOSE,
        page.name,
    )
    assert topbar == site_html.topbar_for(page.name), (
        f"Die Kopfleiste in docs/{page.name} ist nicht nachgezogen; "
        f"python scripts/sync-site-html.py stellt sie her."
    )


@pytest.mark.parametrize("page", _pages(), ids=lambda p: p.name)
def test_head_matches_page_catalogue(page):
    html = page.read_text(encoding="utf-8")
    head = site_html.extract_region(html, site_html.HEAD_OPEN, site_html.HEAD_CLOSE, page.name)
    assert head == site_html.head_for(page.name)
    links = re.findall(r'href="css/([a-z-]+\.css)\?v=([^"]+)"', head)
    expected = [(name, site_html.ASSET_VERSION) for name in site_html.page_definition(page.name).styles]
    assert links == expected


def test_templates_are_substantial() -> None:
    """Leere oder verkuerzte Vorlagen duerfen nicht trivial bestehen, weil ein
    ausgeduennter Fuss sonst in alle Seiten liefe."""
    footer = site_html.FOOTER
    for needle in (
        'class="app-footer__kug"',
        'src="img/kug-logo.svg"',
        'src="img/cc-by.svg"',
        "Impressum",
        "CC BY 4.0",
    ):
        assert needle in footer, f"FOOT-Vorlage ohne {needle!r}"
    assert footer.count("app-footer__group") == 2

    topbar = site_html.topbar_for("about.html")
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
    tabs = [tab.name for _, group in site_html.TAB_GROUPS for tab in group]
    assert len(tabs) >= 7, "weniger Ansichten in der Leiste als erwartet"
    for name in tabs:
        assert f'href="index.html#{name}"' in topbar, f"Infoleiste ohne Ansicht {name!r}"
    app = site_html.topbar_for("index.html")
    assert 'role="tablist"' in app
    for name in tabs:
        assert f'data-tab="{name}"' in app, f"Anwendungsleiste ohne Ansicht {name!r}"
    assert 'id="indizes-register-menu"' in app
    assert 'id="korb-badge"' in app


def test_impressum_marks_nothing_in_the_topbar() -> None:
    """Das Impressum steht nicht in der Leiste und markiert deshalb nichts."""
    assert 'aria-current="page"' not in site_html.topbar_for("impressum.html")


def test_read_only_sync_reports_drift_without_writing(tmp_path: Path) -> None:
    copied = tmp_path / "docs"
    copied.mkdir()
    for page in _pages():
        shutil.copy2(page, copied / page.name)
    target = copied / "about.html"
    stale = target.read_text(encoding="utf-8").replace("Über · M³GIM", "Veraltet", 1)
    target.write_text(stale, encoding="utf-8")

    assert site_html.sync_site_html(copied, write=False) == ["about.html"]
    assert target.read_text(encoding="utf-8") == stale
    assert site_html.sync_site_html(copied) == ["about.html"]
    assert site_html.sync_site_html(copied, write=False) == []
