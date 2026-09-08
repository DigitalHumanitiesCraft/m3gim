"""Shared HTML shell for the five static pages under ``docs``.

Page metadata, stylesheet order, navigation and footer live here so updating the
site shell never needs to parse the vocabulary or generated JSON-LD. The model
renderer imports the same functions for its generated page. ``sync_site_html``
only replaces the head, navigation and footer and leaves page bodies intact.
"""

from __future__ import annotations

import html
import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DOCS = REPO / "docs"
SITE_URL = "https://digitalhumanitiescraft.github.io/m3gim/"
IMAGE_URL = f"{SITE_URL}img/og.png"
ASSET_VERSION = "2026-09-08d"

HEAD_OPEN = "<head>"
HEAD_CLOSE = "</head>"
FOOTER_OPEN = '<footer class="app-footer">'
FOOTER_CLOSE = "</footer>"
TOPBAR_OPEN = '<header class="topbar">'
TOPBAR_CLOSE = "</header>"

FOUNDATION_STYLES = (
    "variables.css",
    "base.css",
    "components.css",
)
APP_SHARED_STYLES = (
    *FOUNDATION_STYLES,
    "view-shell.css",
    "search.css",
    "controls.css",
)
INFO_STYLES = (*FOUNDATION_STYLES, "pages.css", "tabs.css")
APP_STYLES = (
    *APP_SHARED_STYLES,
    "selection-detail.css",
    "sidebar.css",
    "bestand.css",
    "chronik.css",
    "indizes.css",
    "dashboard.css",
    "karte.css",
    "korb.css",
    "netzwerk.css",
    "tabs.css",
)


@dataclass(frozen=True)
class PageDefinition:
    """Stable metadata and assets for one delivered HTML document."""

    filename: str
    title: str
    description: str
    schema_type: str
    schema_name: str
    app: bool = False

    @property
    def canonical(self) -> str:
        return SITE_URL if self.filename == "index.html" else f"{SITE_URL}{self.filename}"

    @property
    def styles(self) -> tuple[str, ...]:
        return APP_STYLES if self.app else INFO_STYLES


PAGE_DEFINITIONS = (
    PageDefinition(
        "index.html",
        "Teilnachlass Ira Malaniuk · M³GIM",
        "Digitale Erschließung des Teilnachlasses Ira Malaniuk (UAKUG/NIM) am Universitätsarchiv der Kunstuniversität Graz.",
        "Dataset",
        "M³GIM — Teilnachlass Ira Malaniuk (UAKUG/NIM)",
        app=True,
    ),
    PageDefinition(
        "about.html",
        "Über · M³GIM",
        "Mapping Mobile Musicians: Forschungskontext, Methodik, Projektteam und Förderung der Machbarkeitsstudie zum Teilnachlass Ira Malaniuk.",
        "AboutPage",
        "Über",
    ),
    PageDefinition(
        "projekt.html",
        "Projekt · M³GIM",
        "Forschungsfragen, Quellenbestand, Tektonik und Erschließungsprozess des Teilnachlasses Ira Malaniuk an der Kunstuniversität Graz.",
        "AboutPage",
        "Projekt",
    ),
    PageDefinition(
        "impressum.html",
        "Impressum · M³GIM",
        "Impressum, Projektverantwortung, Förderung und Datenschutz von M³GIM — Mapping Mobile Musicians.",
        "WebPage",
        "Impressum",
    ),
    PageDefinition(
        "datenmodell.html",
        "Datenmodell · M³GIM",
        "Klassen, Properties und kontrollierte Vokabulare der M³GIM-Erweiterung zu RiC-O 1.1, erzeugt aus dem Projektvokabular.",
        "WebPage",
        "Datenmodell",
    ),
)
PAGES = tuple(page.filename for page in PAGE_DEFINITIONS)
PAGE_BY_NAME = {page.filename: page for page in PAGE_DEFINITIONS}


@dataclass(frozen=True)
class Tab:
    """One application view in the common navigation band."""

    name: str
    label: str
    button_id: str
    icon: str
    tip: str = ""


TAB_GROUPS: tuple[tuple[str, tuple[Tab, ...]], ...] = (
    (
        "material",
        (
            Tab(
                "bestand",
                "Bestand",
                "btn-bestand",
                '<rect width="20" height="5" x="2" y="3" rx="1"/>'
                '<path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/>'
                '<path d="M10 12h4"/>',
            ),
            Tab(
                "indizes",
                "Indizes",
                "btn-indizes",
                '<path d="M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"/>'
                '<path d="M14 2v5h5"/><path d="M3 15h6"/><path d="M3 19h4"/>'
                '<path d="M3 11h8"/>',
            ),
        ),
    ),
    (
        "perspektiven",
        (
            Tab(
                "chronik",
                "Chronik",
                "btn-chronik",
                '<circle cx="12" cy="12" r="10"/>'
                '<polyline points="12 6 12 12 16 14"/>',
            ),
            Tab(
                "karte",
                "Orte",
                "btn-karte",
                '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>'
                '<line x1="8" y1="2" x2="8" y2="18"/>'
                '<line x1="16" y1="6" x2="16" y2="22"/>',
            ),
            Tab(
                "netzwerk",
                "Netzwerk",
                "btn-netzwerk",
                '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/>'
                '<circle cx="19" cy="19" r="2"/><circle cx="5" cy="19" r="2"/>'
                '<circle cx="12" cy="12" r="2"/><path d="M6.5 6.5 10.5 10.5"/>'
                '<path d="M17.5 6.5 13.5 10.5"/><path d="M6.5 17.5 10.5 13.5"/>'
                '<path d="M17.5 17.5 13.5 13.5"/>',
            ),
            Tab(
                "statistik",
                "Dashboard",
                "btn-statistik",
                '<line x1="18" y1="20" x2="18" y2="10"/>'
                '<line x1="12" y1="20" x2="12" y2="4"/>'
                '<line x1="6" y1="20" x2="6" y2="14"/>',
            ),
        ),
    ),
    (
        "werkzeug",
        (
            Tab(
                "korb",
                "Korb",
                "korb-tab-btn",
                '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>'
                '<path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6'
                'l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
                "Ausgewählte Dokumente sammeln und als CSV, BibTeX, JSON-LD oder GEXF exportieren",
            ),
        ),
    ),
)

INFO_LINKS = (
    ("about.html", "Über"),
    ("projekt.html", "Projekt"),
    ("datenmodell.html", "Datenmodell"),
)
BRAND_SUBTITLE = "Teilnachlass Ira Malaniuk — UAKUG/NIM"
DEFAULT_TAB = "bestand"


def page_definition(page_name: str) -> PageDefinition:
    try:
        return PAGE_BY_NAME[page_name]
    except KeyError as error:
        raise ValueError(f"Unbekannte HTML-Seite: {page_name}") from error


def _website_schema() -> dict:
    return {
        "@type": "WebSite",
        "@id": f"{SITE_URL}#website",
        "name": "M³GIM",
        "alternateName": "Mapping Mobile Musicians",
        "url": SITE_URL,
        "inLanguage": "de-AT",
        "description": PAGE_BY_NAME["index.html"].description,
        "publisher": {
            "@type": "Organization",
            "name": "Universität für Musik und darstellende Kunst Graz",
            "alternateName": "KUG",
            "url": "https://www.kug.ac.at",
        },
    }


def _page_schema(page: PageDefinition) -> dict:
    if page.app:
        return {
            "@type": "Dataset",
            "@id": f"{SITE_URL}#dataset",
            "name": page.schema_name,
            "description": (
                "Erschließungsdaten des Teilnachlasses der Mezzosopranistin Ira Malaniuk am "
                "Universitätsarchiv der Kunstuniversität Graz, modelliert in RiC-O 1.1 mit "
                "einer projekteigenen Erweiterung."
            ),
            "url": page.canonical,
            "inLanguage": "de",
            "license": "https://creativecommons.org/licenses/by/4.0/",
            "creator": {
                "@type": "Organization",
                "name": "Digital Humanities Craft",
                "url": "https://dhcraft.org",
            },
            "publisher": _website_schema()["publisher"],
            "isAccessibleForFree": True,
            "keywords": ["Ira Malaniuk", "Nachlass", "RiC-O", "Musikwissenschaft", "Mobilität"],
            "distribution": [
                {
                    "@type": "DataDownload",
                    "contentUrl": f"{SITE_URL}data/m3gim.jsonld",
                    "encodingFormat": "application/ld+json",
                }
            ],
        }
    return {
        "@type": page.schema_type,
        "@id": f"{page.canonical}#webpage",
        "name": page.schema_name,
        "description": page.description,
        "url": page.canonical,
        "inLanguage": "de",
        "isPartOf": {"@id": f"{SITE_URL}#website"},
        "license": "https://creativecommons.org/licenses/by/4.0/",
    }


def structured_data(page_name: str) -> dict:
    page = page_definition(page_name)
    return {"@context": "https://schema.org", "@graph": [_website_schema(), _page_schema(page)]}


def head_for(page_name: str) -> str:
    """Render the complete shared head from the page catalogue."""
    page = page_definition(page_name)
    title = html.escape(page.title, quote=True)
    description = html.escape(page.description, quote=True)
    canonical = html.escape(page.canonical, quote=True)
    styles = [
        '  <link rel="stylesheet" href="vendor/fonts.css">',
        "",
        *(f'  <link rel="stylesheet" href="css/{name}?v={ASSET_VERSION}">' for name in page.styles),
    ]
    schema = json.dumps(structured_data(page_name), ensure_ascii=False, indent=2)
    schema = "\n".join(f"    {line}" for line in schema.splitlines())
    scripts = []
    if page.app:
        scripts = [
            "",
            "  <!-- D3.js -->",
            '  <script src="vendor/d3-7.9.0.min.js"></script>',
            "",
            "  <!-- App -->",
            '  <script type="module" src="js/start.js"></script>',
        ]
    lines = [
        HEAD_OPEN,
        '  <meta charset="UTF-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        f"  <title>{title}</title>",
        f'  <meta name="description" content="{description}">',
        '  <meta name="robots" content="index,follow">',
        '  <meta name="theme-color" content="#004A8F">',
        f'  <link rel="canonical" href="{canonical}">',
        "",
        "  <!-- Social cards: absolute URLs, because a scraper resolves nothing relative. -->",
        '  <meta property="og:type" content="website">',
        '  <meta property="og:site_name" content="M³GIM">',
        '  <meta property="og:locale" content="de_AT">',
        f'  <meta property="og:title" content="{title}">',
        f'  <meta property="og:description" content="{description}">',
        f'  <meta property="og:url" content="{canonical}">',
        f'  <meta property="og:image" content="{IMAGE_URL}">',
        '  <meta property="og:image:width" content="1200">',
        '  <meta property="og:image:height" content="630">',
        '  <meta property="og:image:alt" content="M³GIM — Mapping Mobile Musicians">',
        '  <meta name="twitter:card" content="summary_large_image">',
        f'  <meta name="twitter:title" content="{title}">',
        f'  <meta name="twitter:description" content="{description}">',
        f'  <meta name="twitter:image" content="{IMAGE_URL}">',
        "",
        "  <!-- Favicon: inline SVG, so the page needs no external asset; the PNGs serve",
        "       the browsers and launchers that take no SVG. -->",
        "  <link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='10' fill='%231a1a1a'/%3E%3Ctext x='50%25' y='58%25' text-anchor='middle' font-family='Georgia,serif' font-size='36' font-weight='700' fill='%23f5f1e8'%3EM%3C/text%3E%3Ctext x='78%25' y='38%25' text-anchor='middle' font-family='Georgia,serif' font-size='18' font-weight='700' fill='%23c9a961'%3E3%3C/text%3E%3C/svg%3E\">",
        '  <link rel="icon" type="image/png" sizes="32x32" href="img/favicon-32.png">',
        '  <link rel="apple-touch-icon" sizes="180x180" href="img/apple-touch-icon.png">',
        '  <link rel="manifest" href="site.webmanifest">',
        "",
        *styles,
        "",
        '  <script type="application/ld+json">',
        schema,
        "  </script>",
        *scripts,
        HEAD_CLOSE,
    ]
    return "\n".join(lines)


def _icon(paths: str) -> str:
    return (
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" '
        f'focusable="false">{paths}</svg>'
    )


def _render_tab(tab: Tab, app: bool, pad: str) -> list[str]:
    tip = f' data-tip="{tab.tip}"' if tab.tip else ""
    chevron = tab.name == "indizes"
    menu = app and chevron
    active = app and tab.name == DEFAULT_TAB
    lines: list[str] = []
    if menu:
        lines.append(f'{pad}<div class="tab-menu" role="none">')
        pad += "  "
    inner = pad + "  "
    if app:
        classes = "tab-bar__tab tab-menu__trigger" if menu else "tab-bar__tab"
        if active:
            classes += " active"
        extra = ' aria-haspopup="menu" aria-expanded="false"' if menu else ""
        lines.append(
            f'{pad}<button class="{classes}" id="{tab.button_id}" role="tab" '
            f'aria-selected="{str(active).lower()}" aria-controls="tab-{tab.name}" '
            f'tabindex="{0 if active else -1}" data-tab="{tab.name}"{tip}{extra}>'
        )
    else:
        lines.append(f'{pad}<a class="tab-bar__tab" href="index.html#{tab.name}"{tip}>')
    lines.append(inner + _icon(tab.icon))
    label = f'<span class="tab-bar__label">{tab.label}</span>'
    if chevron:
        lines.append(f'{inner}<span class="tab-menu__name">')
        lines.append(f"{inner}  {label}")
        lines.append(
            f'{inner}  <svg class="tab-menu__chevron" width="11" height="11" '
            'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" '
            'focusable="false"><path d="m6 9 6 6 6-6"/></svg>'
        )
        lines.append(f"{inner}</span>")
    else:
        lines.append(inner + label)
    if app and tab.name == "korb":
        lines.append(
            f'{inner}<span class="tab-bar__badge" id="korb-badge" '
            'aria-label="Anzahl Einträge im Korb">0</span>'
        )
    lines.append(f"{pad}</button>" if app else f"{pad}</a>")
    if menu:
        pad = pad[:-2]
        lines.append(
            f'{pad}  <div class="tab-menu__panel" id="indizes-register-menu" role="menu" '
            'aria-label="Register" hidden></div>'
        )
        lines.append(f"{pad}</div>")
    return lines


def topbar_for(page_name: str) -> str:
    """Render the site header with the current page semantics."""
    app = page_name == "index.html"
    lines = [
        TOPBAR_OPEN,
        '    <div class="topbar__lead">',
        f'      <a class="topbar__brand" href="index.html" data-tip="{BRAND_SUBTITLE}">M³GIM</a>',
        '      <a class="topbar__badge" href="projekt.html">Research Preview</a>',
        "    </div>",
        "",
        (
            '    <nav class="tab-bar" role="tablist" aria-label="Hauptnavigation" inert>'
            if app
            else '    <nav class="tab-bar" aria-label="Ansichten">'
        ),
    ]
    for group, tabs in TAB_GROUPS:
        lines.append(f'      <div class="tab-bar__group" role="none" data-group="{group}">')
        for tab in tabs:
            lines.extend(_render_tab(tab, app, pad="        "))
        lines.append("      </div>")
    lines.extend(
        [
            "    </nav>",
            "",
            '    <nav class="topbar__info" aria-label="Informationsseiten">',
        ]
    )
    for href, label in INFO_LINKS:
        current = ' aria-current="page"' if href == page_name else ""
        lines.append(f'      <a href="{href}"{current}>{label}</a>')
    lines.extend(["    </nav>", "  </header>"])
    return "\n".join(lines)


FOOTER = """<footer class="app-footer">
    <div class="app-footer__group">
      <a class="app-footer__kug" href="https://www.kug.ac.at" target="_blank" rel="noopener" data-tip="Universität für Musik und darstellende Kunst Graz, Universitätsarchiv"><img class="app-footer__mark" src="img/kug-logo.svg" alt="" width="14" height="14">KUG Graz</a>
      <a href="impressum.html">Impressum</a>
    </div>
    <div class="app-footer__group">
      <a href="https://github.com/DigitalHumanitiesCraft/m3gim" target="_blank" rel="noopener" data-tip="Repository auf GitHub, Code unter MIT-Lizenz">Repository</a>
      <a href="https://github.com/DigitalHumanitiesCraft/Promptotyping" target="_blank" rel="noopener" data-tip="Die Anwendung ist mit generativer KI nach der Promptotyping-Methode und Agentic Engineering entstanden">Promptotyping und Agentic Engineering</a>
      <a class="app-footer__dhcraft" href="https://dhcraft.org" target="_blank" rel="noopener" data-tip="Digital Humanities Craft, Konzeption und technische Umsetzung"><img class="app-footer__mark" src="img/dhcraft-logo.svg" alt="" width="14" height="14">Technische Umsetzung DHCraft</a>
      <a class="app-footer__cc" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener" data-tip="Daten, Texte und Dokumentation unter Creative Commons Attribution 4.0"><img class="app-footer__mark" src="img/cc.svg" alt="" width="14" height="14"><img class="app-footer__mark" src="img/cc-by.svg" alt="" width="14" height="14">CC BY 4.0</a>
    </div>
  </footer>"""


def extract_region(text: str, open_marker: str, close_marker: str, source: str) -> str:
    start, end = _region_bounds(text, open_marker, close_marker, source)
    return text[start:end]


def _region_bounds(text: str, open_marker: str, close_marker: str, source: str) -> tuple[int, int]:
    start = text.find(open_marker)
    if start == -1:
        raise ValueError(f"{source}: {open_marker} fehlt")
    if text.find(open_marker, start + 1) != -1:
        raise ValueError(f"{source}: {open_marker} steht mehrfach")
    end = text.find(close_marker, start)
    if end == -1:
        raise ValueError(f"{source}: {close_marker} fehlt")
    return start, end + len(close_marker)


def _replace_region(text: str, open_marker: str, close_marker: str, block: str, source: str) -> str:
    start, end = _region_bounds(text, open_marker, close_marker, source)
    return text[:start] + block + text[end:]


def synchronized_html(page_name: str, source: str) -> str:
    """Return one page with the catalogue-driven shared regions replaced."""
    text = _replace_region(source, HEAD_OPEN, HEAD_CLOSE, head_for(page_name), page_name)
    text = _replace_region(text, TOPBAR_OPEN, TOPBAR_CLOSE, topbar_for(page_name), page_name)
    return _replace_region(text, FOOTER_OPEN, FOOTER_CLOSE, FOOTER, page_name)


def _atomic_write(path: Path, text: str) -> None:
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        Path(temporary).replace(path)
    except BaseException:
        Path(temporary).unlink(missing_ok=True)
        raise


def sync_site_html(docs: Path = DOCS, *, write: bool = True) -> list[str]:
    """List stale pages and optionally rewrite them without loading project data."""
    changed: list[str] = []
    for page_name in PAGES:
        path = docs / page_name
        original = path.read_text(encoding="utf-8")
        updated = synchronized_html(page_name, original)
        if updated == original:
            continue
        changed.append(page_name)
        if write:
            _atomic_write(path, updated)
    return changed
