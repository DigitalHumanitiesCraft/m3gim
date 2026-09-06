"""Auszeichnungshygiene der fuenf ausgelieferten Seiten.

Es gibt keinen Buildschritt fuer HTML und auf dieser Maschine keinen Nu-Validator
(kein Java, kein html5lib), also traegt dieser Test die Pruefungen, die eine
Validierung sonst leisten wuerde, so weit sie sich aus dem Markup selbst
entscheiden lassen: geschlossene Tags, eindeutige IDs, gebundene Labels,
Alternativtexte, Kopfdaten und die Ueberschriftenhierarchie. Was er nicht
leistet, ist die vollstaendige Grammatik von HTML5, etwa welches Element in
welchem Kontext stehen darf.

Der Auszeichnungskontrakt der Tab-Leiste steht in tests/frontend/tabs.test.mjs,
Fuss und Kopfleiste in tests/test_49_footer.py; hier stehen nur die Regeln, die
fuer jede der fuenf Seiten gleichermassen gelten.
"""

import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
DOCS = REPO_ROOT / "docs"

VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}

# Inside SVG the parser sees unknown tags; they close themselves or are closed
# explicitly, so the stack handles them, but path data must not confuse it.
SELF_CLOSING_OK = {"path", "circle", "line", "rect", "polyline", "polygon", "use", "stop"}


class Structure(HTMLParser):
    """Collects the structural facts of one page in a single pass."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, int]] = []
        self.errors: list[str] = []
        self.ids: list[str] = []
        self.headings: list[tuple[int, str]] = []
        self.labels: list[str] = []  # values of the for attribute
        self.controls: list[str] = []  # ids of labelable elements
        self.imgs: list[dict] = []
        self.anchors: list[dict] = []
        self.metas: list[dict] = []
        self.tabs: list[dict] = []
        self.tabpanels: list[dict] = []
        self.html_attrs: dict = {}
        self.landmarks: list[tuple[str, dict]] = []
        self._heading: int | None = None
        self._heading_text = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))
        if tag == "html":
            self.html_attrs = a
        if "id" in a:
            self.ids.append(a["id"])
        if tag in {"input", "select", "textarea", "button"} and "id" in a:
            self.controls.append(a["id"])
        if tag == "label" and "for" in a:
            self.labels.append(a["for"])
        if tag == "img":
            self.imgs.append(a)
        if tag == "a":
            self.anchors.append(a)
        if tag == "meta":
            self.metas.append(a)
        if a.get("role") == "tab":
            self.tabs.append(a)
        if a.get("role") == "tabpanel":
            self.tabpanels.append(a)
        if tag in {"header", "nav", "main", "aside", "footer"}:
            self.landmarks.append((tag, a))
        if re.fullmatch(r"h[1-6]", tag):
            self._heading = int(tag[1])
            self._heading_text = ""

    def handle_startendtag(self, tag, attrs):
        if tag not in VOID and tag not in SELF_CLOSING_OK and tag not in {"svg"}:
            pass  # a self-closed tag never opens the stack

    def handle_endtag(self, tag):
        if tag in VOID:
            self.errors.append(f"Zeile {self.getpos()[0]}: </{tag}> auf einem leeren Element")
            return
        if not self.stack:
            self.errors.append(f"Zeile {self.getpos()[0]}: </{tag}> ohne offenes Element")
            return
        open_tag, line = self.stack.pop()
        if open_tag != tag:
            self.errors.append(
                f"Zeile {self.getpos()[0]}: </{tag}> schliesst <{open_tag}> aus Zeile {line}"
            )
        if re.fullmatch(r"h[1-6]", tag) and self._heading is not None:
            self.headings.append((self._heading, self._heading_text.strip()))
            self._heading = None

    def handle_data(self, data):
        if self._heading is not None:
            self._heading_text += data

    def close(self):  # noqa: D102
        super().close()
        for tag, line in self.stack:
            self.errors.append(f"<{tag}> aus Zeile {line} bleibt offen")


def _pages() -> list[Path]:
    pages = sorted(DOCS.glob("*.html"))
    assert len(pages) >= 5, "weniger Seiten als erwartet unter docs/"
    return pages


PAGES = _pages()
PARAM = pytest.mark.parametrize("page", PAGES, ids=lambda p: p.name)


@pytest.fixture(scope="module")
def parsed() -> dict[str, Structure]:
    out = {}
    for page in PAGES:
        parser = Structure()
        parser.feed(page.read_text(encoding="utf-8"))
        parser.close()
        out[page.name] = parser
    return out


# ---------------------------------------------------------------------------
# Struktur
# ---------------------------------------------------------------------------


@PARAM
def test_tags_are_balanced(page, parsed):
    assert not parsed[page.name].errors, "\n".join(parsed[page.name].errors)


@PARAM
def test_ids_are_unique(page, parsed):
    doubled = [i for i, n in Counter(parsed[page.name].ids).items() if n > 1]
    assert not doubled, f"{page.name}: doppelte IDs {doubled}"


@PARAM
def test_language_is_german(page, parsed):
    assert parsed[page.name].html_attrs.get("lang") == "de", f"{page.name} ohne lang=\"de\""


@PARAM
def test_exactly_one_h1(page, parsed):
    ones = [text for level, text in parsed[page.name].headings if level == 1]
    assert len(ones) == 1, f"{page.name}: {len(ones)} h1 statt einer ({ones})"


@PARAM
def test_heading_levels_have_no_gaps(page, parsed):
    levels = [level for level, _ in parsed[page.name].headings]
    assert levels, f"{page.name} ohne Ueberschriften"
    for before, after in zip(levels, levels[1:]):
        assert after <= before + 1, (
            f"{page.name}: Sprung von h{before} auf h{after}"
        )


# ---------------------------------------------------------------------------
# Barrierefreiheit im Markup
# ---------------------------------------------------------------------------


@PARAM
def test_every_label_binds_a_control(page, parsed):
    p = parsed[page.name]
    missing = [ref for ref in p.labels if ref not in p.controls and ref not in p.ids]
    assert not missing, f"{page.name}: label for={missing} ohne Bedienelement"


@PARAM
def test_every_image_carries_alt(page, parsed):
    missing = [img.get("src") for img in parsed[page.name].imgs if "alt" not in img]
    assert not missing, f"{page.name}: img ohne alt {missing}"


@PARAM
def test_every_image_reserves_its_box(page, parsed):
    """Ohne width und height springt das Layout beim Nachladen des Bildes."""
    missing = [
        img.get("src") for img in parsed[page.name].imgs
        if not ("width" in img and "height" in img)
    ]
    assert not missing, f"{page.name}: img ohne width/height {missing}"


@PARAM
def test_every_anchor_has_a_target(page, parsed):
    empty = [a for a in parsed[page.name].anchors if not a.get("href")]
    assert not empty, f"{page.name}: {len(empty)} a ohne href"


@PARAM
def test_new_windows_are_opened_safely(page, parsed):
    unsafe = [
        a.get("href") for a in parsed[page.name].anchors
        if a.get("target") == "_blank" and "noopener" not in (a.get("rel") or "")
    ]
    assert not unsafe, f"{page.name}: target=_blank ohne rel=noopener {unsafe}"


@PARAM
def test_navigation_landmarks_are_named(page, parsed):
    """Mehrere nav auf einer Seite brauchen je einen eigenen Namen."""
    navs = [a for tag, a in parsed[page.name].landmarks if tag == "nav"]
    if len(navs) > 1:
        names = [a.get("aria-label") or a.get("aria-labelledby") for a in navs]
        assert all(names), f"{page.name}: nav ohne Namen"
        assert len(set(names)) == len(names), f"{page.name}: zwei nav mit demselben Namen {names}"


@PARAM
def test_one_main_and_one_footer(page, parsed):
    counts = Counter(tag for tag, _ in parsed[page.name].landmarks)
    assert counts["main"] == 1, f"{page.name}: {counts['main']} main"
    assert counts["footer"] == 1, f"{page.name}: {counts['footer']} footer"


@PARAM
def test_the_skip_link_is_the_first_focusable_element(page, parsed):
    first = parsed[page.name].anchors[0]
    assert first.get("href") == "#main-content", (
        f"{page.name}: erster Link ist {first.get('href')}, nicht der Sprung in den Inhalt"
    )
    assert "main-content" in parsed[page.name].ids, f"{page.name} ohne #main-content"


def test_tabs_and_panels_point_at_each_other(parsed):
    """The application page owns the tab interface; content pages do not."""
    p = parsed["index.html"]
    assert p.tabs, "index.html ohne Tab-Leiste"
    ids = set(p.ids)
    for tab in p.tabs:
        assert tab.get("aria-controls") in ids, f"Tab zeigt auf kein Panel: {tab}"
    for panel in p.tabpanels:
        assert panel.get("aria-labelledby") in ids, f"Panel ohne Tab: {panel}"
    assert len(p.tabs) == len(p.tabpanels), "Tabs und Panels sind nicht gleich viele"


# ---------------------------------------------------------------------------
# Kopfdaten
# ---------------------------------------------------------------------------


@PARAM
def test_meta_names_are_unique(page, parsed):
    keys = [m["name"] for m in parsed[page.name].metas if "name" in m]
    doubled = [k for k, n in Counter(keys).items() if n > 1]
    assert not doubled, f"{page.name}: doppelte meta {doubled}"


@PARAM
def test_description_is_present_and_short_enough(page, parsed):
    hits = [m for m in parsed[page.name].metas if m.get("name") == "description"]
    assert len(hits) == 1, f"{page.name}: {len(hits)} description"
    text = hits[0].get("content", "")
    assert 50 <= len(text) <= 160, f"{page.name}: description mit {len(text)} Zeichen"


@PARAM
def test_viewport_is_responsive(page, parsed):
    hits = [m for m in parsed[page.name].metas if m.get("name") == "viewport"]
    assert hits, f"{page.name} ohne viewport"
    assert "width=device-width" in hits[0].get("content", "")


@PARAM
def test_canonical_and_social_cards_are_absolute(page):
    html = page.read_text(encoding="utf-8")
    canonical = re.search(r'<link rel="canonical" href="([^"]+)"', html)
    assert canonical, f"{page.name} ohne canonical"
    expected = "https://digitalhumanitiescraft.github.io/m3gim/"
    if page.name != "index.html":
        expected += page.name
    assert canonical.group(1) == expected, f"{page.name}: canonical {canonical.group(1)}"
    for prop in ("og:title", "og:description", "og:url", "og:image", "og:type", "og:locale"):
        assert f'property="{prop}"' in html, f"{page.name} ohne {prop}"
    assert 'name="twitter:card" content="summary_large_image"' in html


def test_titles_are_unique_and_follow_the_pattern():
    titles = {}
    for page in PAGES:
        title = re.search(r"<title>(.*?)</title>", page.read_text(encoding="utf-8")).group(1)
        assert title.endswith(" · M³GIM"), f"{page.name}: Titel {title!r}"
        titles[title] = titles.get(title, 0) + 1
    doubled = [t for t, n in titles.items() if n > 1]
    assert not doubled, f"doppelte Titel {doubled}"


def test_sitemap_lists_every_page():
    sitemap = (DOCS / "sitemap.xml").read_text(encoding="utf-8")
    for page in PAGES:
        needle = "/m3gim/" if page.name == "index.html" else f"/m3gim/{page.name}"
        assert f"<loc>https://digitalhumanitiescraft.github.io{needle}</loc>" in sitemap, (
            f"{page.name} fehlt in der Sitemap"
        )
    assert (DOCS / "robots.txt").read_text(encoding="utf-8").count("Sitemap:") == 1
