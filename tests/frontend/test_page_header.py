"""Eine Kopfleiste auf allen fuenf Seiten (Projektleitung, 2026-09-05).

``scripts/sync-site-html.py`` schreibt die Leiste aus einer Vorlage in
``docs/index.html`` und in die vier Infoseiten. ``tests/test_49_footer.py`` ist
das Gate dagegen, dass dieser Lauf ausgeblieben ist; dieser Test steht daneben
und liest nur die ausgelieferten Seiten. Er vergleicht sie untereinander und
faellt deshalb auch dann, wenn jemand Vorlage und eine Seite gemeinsam von Hand
verstellt hat.

Erlaubt sind genau zwei Unterschiede, beide unten als Zusicherung ausformuliert:

1. Die Infolinks markieren den Eintrag der eigenen Seite mit ``aria-current``.
   ``index.html`` und ``impressum.html`` stehen nicht in der Liste und markieren
   nichts.
2. Die Ansichtsnavigation ist auf ``index.html`` die lebende Tabliste mit
   Buttons, Panelbezug, Registermenue und Korbzaehler, auf den Infoseiten
   dieselben Ansichten als Verweise in die Anwendung. Ansichtenfolge,
   Gruppierung, Symbol, Beschriftung und Tooltip sind auf beiden gleich.

Alles andere, Marke samt Untertitel, Badge, Reihenfolge der drei Bloecke und die
Infolinks, ist zeichengleich.
"""

import re
from html.parser import HTMLParser
from pathlib import Path

import pytest

DOCS = Path(__file__).parent.parent.parent / "docs"

APP_PAGE = "index.html"
INFO_PAGES = ("about.html", "projekt.html", "impressum.html", "datenmodell.html")
PAGES = (APP_PAGE, *INFO_PAGES)

OPEN = '<header class="topbar">'
CLOSE = "</header>"

SUBTITLE = "Teilnachlass Ira Malaniuk — UAKUG/NIM"

BRAND_RE = re.compile(
    r'<a class="topbar__brand" href="([^"]+)" data-tip="([^"]+)">([^<]+)</a>'
)
BADGE_RE = re.compile(r'<a class="topbar__badge" href="([^"]+)">([^<]+)</a>')
NAV_RE = re.compile(r'<nav class="tab-bar"([^>]*)>')
GROUP_RE = re.compile(r'<div class="tab-bar__group" role="none" data-group="([a-z]+)">')
TAB_RE = re.compile(r'<(?:button|a) class="tab-bar__tab[^"]*"[^>]*>')
NAME_RE = re.compile(r'data-tab="([a-z]+)"|href="index\.html#([a-z]+)"')
TIP_RE = re.compile(r'data-tip="([^"]*)"')
ICON_RE = re.compile(r'<svg width="18"[^>]*>(.*?)</svg>', re.S)
LABEL_RE = re.compile(r'<span class="tab-bar__label">([^<]+)</span>')
INFO_LINK_RE = re.compile(r'<a href="([a-z]+\.html)"( aria-current="page")?>([^<]+)</a>')

# Die beiden Auspraegungen der Ansichtsnavigation, Unterschied 2.
NAV_VARIANTS = {
    APP_PAGE: ' role="tablist" aria-label="Hauptnavigation" inert',
    "info": ' aria-label="Ansichten"',
}

# Was nur die lebende Leiste tragen kann: der Zaehler des Korbs und das Panel
# des Registermenues stehen nur dort, die Huelle des Menues ebenfalls. Sie
# gehoeren zu Unterschied 2 und fallen deshalb aus dem Geruest.
LIVE_ONLY = {"tab-bar__badge", "tab-menu__panel"}
LIVE_WRAPPER = "tab-menu"


def header_of(name: str) -> str:
    text = (DOCS / name).read_text(encoding="utf-8")
    start = text.find(OPEN)
    assert start != -1, f"docs/{name} ohne {OPEN}"
    assert text.find(OPEN, start + 1) == -1, f"docs/{name}: {OPEN} steht mehrfach"
    end = text.find(CLOSE, start)
    assert end != -1, f"docs/{name} ohne {CLOSE} nach der Kopfleiste"
    return text[start : end + len(CLOSE)]


def views_of(header: str) -> list[tuple[str, str, str, str, str]]:
    """Die Ansichten der Leiste als (Gruppe, Name, Beschriftung, Tooltip, Symbol).

    Der Bauteil, Button oder Verweis, geht nicht ein: er ist der erlaubte
    Unterschied. Alles, was der Leser sieht, geht ein.
    """
    groups = [(m.start(), m.group(1)) for m in GROUP_RE.finditer(header)]
    assert groups, "Kopfleiste ohne Gruppen in der Ansichtsnavigation"
    views = []
    for match in TAB_RE.finditer(header):
        group = [name for start, name in groups if start < match.start()][-1]
        name = NAME_RE.search(match.group(0))
        assert name, f"Tab ohne Ansichtsnamen: {match.group(0)[:60]}"
        tip = TIP_RE.search(match.group(0))
        rest = header[match.end() :]
        icon = ICON_RE.search(rest)
        label = LABEL_RE.search(rest)
        assert icon and label, f"Tab ohne Symbol oder Beschriftung: {name.group(0)}"
        views.append(
            (
                group,
                name.group(1) or name.group(2),
                label.group(1),
                tip.group(1) if tip else "",
                icon.group(1),
            )
        )
    return views


class _Skeleton(HTMLParser):
    """Die Kopfleiste als Folge ihrer Bauteile, ohne die erlaubten Unterschiede.

    Ein Tab wird zu einem einzigen Baustein, weil sein Inneres schon
    ``views_of`` vergleicht und Button und Verweis sich genau dort unterscheiden
    duerfen. Die Huelle des Registermenues faellt weg, ihr Inhalt bleibt; Panel
    und Korbzaehler fallen samt Inhalt weg. Alles andere geht mit Elementname,
    Klasse und Ziel ein, Text und Einrueckung nicht.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._depth = 0
        self._skip_from = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str]]) -> None:
        self._depth += 1
        if self._skip_from:
            return
        values = dict(attrs)
        classes = set(values.get("class", "").split())
        if classes & LIVE_ONLY or "tab-bar__tab" in classes:
            self._skip_from = self._depth
            if "tab-bar__tab" in classes:
                self.parts.append("tab")
            return
        if LIVE_WRAPPER in classes:
            return  # unwrap: the tab inside it stands on every page
        target = values.get("href", "")
        self.parts.append(f"{tag}.{values.get('class', '')}[{target}]")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str]]) -> None:
        if not self._skip_from:
            self.parts.append(tag)

    def handle_endtag(self, tag: str) -> None:
        if self._skip_from == self._depth:
            self._skip_from = 0
        self._depth -= 1


def skeleton(header: str) -> list[str]:
    parser = _Skeleton()
    parser.feed(header)
    return parser.parts


@pytest.mark.parametrize("page", INFO_PAGES)
def test_the_header_is_the_same_beyond_the_two_differences(page: str) -> None:
    """Die Klammer um alle Einzelzusicherungen: dasselbe Geruest auf jeder Seite.

    Weggerechnet sind allein die beiden erlaubten Unterschiede. Was sonst eine
    Seite fuer sich haette, ein zusaetzliches Element, ein anderes Ziel, eine
    andere Klasse, faellt hier auf.
    """
    assert skeleton(header_of(page)) == skeleton(header_of(APP_PAGE)), (
        f"docs/{page}: Aufbau der Kopfleiste weicht von docs/{APP_PAGE} ab; "
        f"python scripts/sync-site-html.py stellt die Leiste her."
    )


@pytest.mark.parametrize("page", PAGES)
def test_page_carries_the_shared_header(page: str) -> None:
    """Marke, Badge, Ansichtsnavigation und Infolinks, in dieser Reihenfolge."""
    header = header_of(page)
    assert BRAND_RE.search(header), f"docs/{page}: Marke fehlt in der Kopfleiste"
    assert BADGE_RE.search(header), f"docs/{page}: Badge fehlt in der Kopfleiste"
    lead = header.index('<div class="topbar__lead">')
    views = header.index('<nav class="tab-bar"')
    info = header.index('<nav class="topbar__info"')
    assert lead < views < info, f"docs/{page}: Bloecke der Kopfleiste in anderer Folge"


@pytest.mark.parametrize("page", PAGES)
def test_page_loads_the_tab_bar_stylesheet(page: str) -> None:
    """Ohne tabs.css traegt die Seite die Leiste, zeigt sie aber nicht."""
    text = (DOCS / page).read_text(encoding="utf-8")
    assert "css/tabs.css" in text, f"docs/{page} ohne css/tabs.css"


@pytest.mark.parametrize("page", INFO_PAGES)
def test_brand_and_badge_are_identical(page: str) -> None:
    """Marke samt Untertitel und Badge stehen ueberall im selben Wortlaut."""
    app = header_of(APP_PAGE)
    header = header_of(page)
    assert BRAND_RE.search(header).groups() == BRAND_RE.search(app).groups()
    assert BADGE_RE.search(header).groups() == BADGE_RE.search(app).groups()


@pytest.mark.parametrize("page", PAGES)
def test_the_subtitle_rides_in_the_brand_tooltip(page: str) -> None:
    """Das Band traegt eine Zeile; der Untertitel haengt deshalb ueberall am
    Tooltip der Marke und steht auf keiner Seite als eigenes Element."""
    header = header_of(page)
    assert BRAND_RE.search(header).group(2) == SUBTITLE, f"docs/{page}: anderer Untertitel"
    assert "topbar__subtitle" not in header, f"docs/{page}: Untertitel steht neben der Marke"


@pytest.mark.parametrize("page", INFO_PAGES)
def test_views_are_identical(page: str) -> None:
    """Dieselben Ansichten in derselben Folge, mit demselben Symbol und Wort."""
    assert views_of(header_of(page)) == views_of(header_of(APP_PAGE)), (
        f"docs/{page}: Ansichtsnavigation weicht von docs/{APP_PAGE} ab; "
        f"python scripts/sync-site-html.py stellt die Leiste her."
    )


def test_the_application_page_carries_the_live_tab_list() -> None:
    """Unterschied 2: nur dort haengt die Navigation an den Panels."""
    header = header_of(APP_PAGE)
    assert NAV_RE.search(header).group(1) == NAV_VARIANTS[APP_PAGE]
    names = [view[1] for view in views_of(header)]
    assert len(names) >= 7, "weniger Ansichten in der Leiste als erwartet"
    for name in names:
        assert f'aria-controls="tab-{name}"' in header, f"Tab {name} ohne Panelbezug"
    assert 'id="indizes-register-menu"' in header
    assert 'id="korb-badge"' in header


@pytest.mark.parametrize("page", INFO_PAGES)
def test_info_pages_link_into_the_application(page: str) -> None:
    """Unterschied 2, andere Seite: Verweise statt Tabs, ohne Tablisten-Semantik."""
    header = header_of(page)
    assert NAV_RE.search(header).group(1) == NAV_VARIANTS["info"]
    assert 'role="tab"' not in header, f"docs/{page}: Tablisten-Semantik ohne Panels"
    for name in (view[1] for view in views_of(header)):
        assert f'href="index.html#{name}"' in header


@pytest.mark.parametrize("page", PAGES)
def test_info_links_mark_only_the_own_page(page: str) -> None:
    """Unterschied 1, und er ist der einzige innerhalb der Infolinks."""
    header = header_of(page)
    block = header[header.index('<nav class="topbar__info"') :]
    links = INFO_LINK_RE.findall(block)
    assert [(href, label) for href, _, label in links] == [
        ("about.html", "Über"),
        ("projekt.html", "Projekt"),
        ("datenmodell.html", "Datenmodell"),
    ], f"docs/{page}: Infolinks weichen ab"
    marked = [href for href, current, _ in links if current]
    assert marked == ([page] if page in {"about.html", "projekt.html", "datenmodell.html"} else [])
