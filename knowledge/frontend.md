# Frontend

> Laufzeitmodell, Modulstruktur, Store, Routing, Visualisierungen und Designsystem. Zusammengeführt aus den vormals getrennten Dokumenten zu Architektur und Ansichten.

## Laufzeitmodell

- **Erfassung:** Google-Sheets-Exporte als XLSX → `data/google-spreadsheet/`
- **Verarbeitung:** Python-Skripte ([pipeline.md](pipeline.md)) → JSON/JSON-LD in `docs/data/`
- **Präsentation:** Statische SPA in `docs/` (Vanilla JS + D3 v7)
- Offline-first: alle Daten beim Startup geladen (E-05)

## Toolchain

- Vanilla JS mit ES6-Modulen, kein Build-Tool (E-03)
- D3.js v7 via CDN (E-02)
- Hosting: GitHub Pages
- Kein Framework (E-01)

## Verzeichnisstruktur

### Top-Level

- `docs/` — Frontend und ausgelieferte Daten
- `scripts/` — Datenpipeline
- `data/` — Rohdaten, Reports, Pipeline-Output
- `knowledge/` — Kanonische Wissensbasis
- `tests/` — Pipeline-Testsuite (siehe [tests.md](tests.md))

### Frontend-Module

23 JS-Module unter `docs/js/`:

| Pfad | Zweck |
|------|-------|
| `main.js` | Einstiegspunkt, `TAB_RENDERERS`-Registry, Lazy-Tab-Rendering, Error Boundaries pro Tab |
| `data/loader.js` | JSON-LD-Ladeschicht, Store-Aufbau, Partitur-Singleton (`loadPartitur()`, `getLebensphasen()`) |
| `data/aggregator.js` | Daten-Aggregation (`buildKomponistenMap`, `aggregateMatrix`, `aggregateKosmos`, `aggregateZeitfluss`) |
| `ui/router.js` | Hash-Routing (8 aktive Tabs inkl. Lebenspartitur), `navigateToView`/`navigateToIndex`, ARIA-State |
| `ui/events.js` | Cross-View Event-Bus (`onViewNavigate()`) mit Auto-Replay |
| `ui/korb.js` | Wissenskorb (sessionStorage) |
| `views/archiv.js` | Bestand + Chronik |
| `views/indizes.js` | 4-Grid Explorer |
| `views/mobilitaet.js` | Schwimmbahn-Timeline (D3) |
| `views/zeitfluss.js` | Chronologischer Dot-Plot (D3) |
| `views/korb.js` | Korb-Cards |
| `views/matrix.js` | Person × Zeit-Heatmap (D3) |
| `views/kosmos.js` | Repertoire-Konzentrisches Layout (D3) |
| `views/lebensstationen.js` | Scrollytelling-Prototyp (D3, IntersectionObserver) |
| `views/lebenspartitur.js` | Bump-Chart (D3) — SPA-Tab (`renderLebenspartitur`) + Standalone (`init`) |
| `utils/format.js` | Formatierungshilfen |
| `utils/dom.js` | DOM-Helfer (`el`, `clear`) |
| `utils/date-parser.js` | Datumsparser |
| `utils/normalize.js` | Namensnormalisierung, `getPersonKategorie` |
| `utils/viz-components.js` | Shared Viz-Builder (siehe [§ Shared Components](#shared-components)) |

13 CSS-Dateien unter `docs/css/`: `variables`, `base`, `archiv`, `indizes`, `mobilitaet`, `korb`, `matrix`, `kosmos`, `zeitfluss`, `components`, `pages`, `lebensstationen`, `lebenspartitur`.

### Info-Seiten (statisches HTML)

5 Content-Seiten (`about.html`, `projekt.html`, `modell.html`, `hilfe.html`, `impressum.html`) + 2 Prototyp-Seiten (`lebensstationen.html`, `lebenspartitur.html`).

Einheitliches Template: `info-header`, `info-nav`, `info-main`, `info-footer`. Lesebreite 720px, Source Serif 4 für Titel.

## Routing

- Hash-basiert in `router.js`: 8 aktive Tabs (archiv, indizes, mobilitaet, zeitfluss, matrix, kosmos, lebenspartitur, korb)
- Alle D3-Views laden Lebensphasen über `loadPartitur()`-Singleton (loader.js) statt separater Fetches
- Deep Links: `#archiv/UAKUG/NIM_003%20Folio%2001` für Datensatzkontext
- Info-Seiten als eigenständige HTML-Dateien (normale Links, kein Hash-Routing)
- `navigateToIndex(gridType, entityName)` für Cross-Tab-Navigation

## Store-Struktur (aus loader.js)

```
store = {
  // Basis (seit v1)
  fonds,                           // rico:RecordSet, type=Fonds
  konvolute: Map<id, RecordSet>,
  records: Map<id, Record>,        // alle Records inkl. Folios
  allRecords: Array<Record>,       // Folios gefiltert
  byYear: Map<year, Record[]>,     // nutzt rico:date ODER typisierte Datumsfelder als Fallback
  byDocType: Map<typeId, Record[]>,
  bySignatur: Map<sig, Record>,
  persons: Map<name, {records, roles, kategorie, wikidata, occupation, voiceType, birthDate, deathDate}>,
  organizations: Map<name, {records, roles, wikidata}>,
  locations: Map<name, {records, roles, wikidata}>,
  works: Map<name, {records, komponist, wikidata, premiereDate, wdGenre}>,
  konvolutChildren: Map<konvolutId, childIds[]>,
  childToKonvolut: Map<childId, konvolutId>,
  konvolutMeta: Map<konvolutId, {title, dateDisplay, childCount, ...}>,
  folioIds: Set<folioId>,
  unprocessedIds: Set<recordId>,
  recordCount, konvolutCount, exportDate,

  // v2-Store-Maps (Phase 6, Session 30)
  dftHierarchy: Map<conceptId, {id, prefLabel, broader, children[]}>,
  mobilityEvents: Map<eventId, {id, place, placeWikidata, date, role, description, recordId}>,
  recordToEvents: Map<recordId, eventId[]>,
  agentRelations: Map<recordId, [{type, objectName, objectWikidata, validityBegin, validityEnd, provenance}]>,
  finances: Map<recordId, [{field, role, rawValue, amount:Number, currency}]>,
}
```

Archiv und Indizes lesen direkt aus `m3gim.jsonld` (über Store), nicht aus separaten View-JSONs. Mobilität liest aus beiden: `partitur.json` (Lebensphasen, Orte, Pfeile) + Store (Gastspiel-Dokumente dynamisch).

### Phase 6 — Store-Erweiterungen (umgesetzt, Session 30)

| Store-Map | Quelle im JSON-LD | Sichtbarer Nutzen (nach Phase 7) |
|---|---|---|
| `store.dftHierarchy` (18 Concepts) | Top-Level `skos:Concept`-Knoten + `skos:broader` | Indizes-Filter kann Dokumenttypen hierarchisch gruppieren (`biographisch` → `autobiografie`, `biographie`) |
| `store.mobilityEvents` (43) + `store.recordToEvents` (24) | `m3gim:SpatiotemporalEvent`-Knoten + `m3gim:hasSpatiotemporalEvent`-Refs | Mobilität + Lebenspartitur zeigen präzise Events mit Provenance statt heuristisch aus `partitur.auftritte` |
| `store.agentRelations` (19 Records) | `m3gim:agentRelation`-Array am Record | Indizes-Personen-Kacheln mit Beziehungs-Badges (Arbeitgeber, Patron, Korrespondent); optional neuer „Beziehungen"-Grid |
| `store.finances` (14 Records) | `m3gim:hasDetail`-DetailAnnotations mit `monetaryAmount` + `currency` + `detailRole` | Archiv-Inline-Detail zeigt Honorare, optional Finanz-Visualisierung als eigener Tab |
| typisierte Datumsfelder als Fallback in `indexByYear` | `m3gim:absendedatum`, `m3gim:auffuehrungsdatum` etc. (inkl. Listen + `"ISO/ISO"`-Ranges + `circa:`/`vor:`/`nach:`-Präfixe) | Matrix + Zeitfluss zeigen mehr Dots — Records ohne `rico:date`, aber mit typisiertem Datum werden zeitlich einsortiert |

Die Invarianten werden als Kontrakttests in [test_06_frontend_contract.py](../tests/test_06_frontend_contract.py) durchgängig geprüft.

Provenance (`agrelon:hasProvenance` + `hasConfidenceValue`) wird nicht als eigene Store-Map indexiert, sondern am Record mitgeführt; einzelne Views können sie bei Bedarf lesen.

## Shared Components

Alle D3-Visualisierungen nutzen ein einheitliches Component-System.

### CSS (components.css)

- `.viz-toolbar` / `.viz-toolbar__row` / `.viz-toolbar__group` / `.viz-toolbar__label` — Toolbar-Layout
- `.phase-chip` / `.phase-chip--active` — Lebensphasen-Buttons
- `.viz-legend` / `.viz-legend__item` / `.viz-legend__sep` — Legende
- `.viz-tooltip` / `.viz-tooltip--visible` — Dunkler Floating-Tooltip
- `.viz-zoom-reset` / `.viz-zoom-reset--visible` — Absolut positionierter Zoom-Reset
- `.ff-badges` / `.ff-badges__tag` — Forschungsfragen-Annotation
- `.cross-link` — Pill-förmiger Navigationslink
- `.popup-item` / `.popup-item--secondary` — Klickbare Aktionszeile in Popups

### JS-Builder (utils/viz-components.js)

- `buildFFBadges(...ffs)` — FF-Badge-Container
- `buildPhaseChips(lebensphasen, onSelect, { labelMode })` — Phase-Chip-Bar mit „Alle", liefert `{ element, setActive, chips }`
- `buildLayerChips(...)` — Multi-Select-Layer-Toggle für Mobilität
- `buildCoverageFooter(text)` — `.data-coverage`-Zeile
- `createTooltip(container)` — Tooltip-Controller mit Boundary-Clamping
- `setupD3Zoom({ svg, zoomGroup, container, scaleExtent, onZoom })` — D3-Zoom+Pan mit Reset
- `viewLog(name, color)` — Console-Diagnostik (No-Op auf GitHub Pages via DEV-Flag)

### Layout-Pattern

Alle Views folgen: `.viz-toolbar → SVG/Visualisierung → .viz-legend → .data-coverage`.

## Ansichten

### Archiv

- Bestand und Chronik als zwei Perspektiven auf denselben Datenraum
- Klickbare Spaltenheader mit Sortier-Indikatoren
- Autocomplete-Combobox für Personenfilter
- Erweiterte Suche: Signatur, Titel, Dokumenttyp, Datum
- Unbearbeitete Objekte dezent markiert (opacity, Tooltip)
- Inline-Detailflächen mit „Zum Wissenskorb"-Button
- Bookmark-Icons an jeder Zeile (Hover → sichtbar)
- Reset-Button setzt alle Filter gleichzeitig zurück

### Indizes

- Vier Grid-Blöcke: Personen, Organisationen, Orte, Werke
- Cross-Grid-Facettensuche: Klick auf Index-Eintrag filtert die anderen drei Grids
- Kompakte Toolbar: Suche (flex: 1) + Facet-Chips
- Detail-Expansion auf 10 Records begrenzt + „Alle im Archiv"-Link
- Wikidata-Icons bei Einträgen mit Q-ID, WD-Coverage-Prozent in Header
- **Subtitles** aus WD-Enrichment: `Beruf · Stimmfach · Lebensdaten` unter Personennamen (E-61)

### Mobilität

Schwimmbahn-Timeline (D3) für Malaniuks geografische Mobilität 1919–2009.

**Datenquellen**

- `partitur.json`: Lebensphasen, Orte, Mobilitätsereignisse (mit `kontext`-Feldern), `auftritte[]` (60 Pipeline-extrahierte Events), Netzwerk/Repertoire/Dokumente
- `store.locations` + `store.records`: Gastspiel-Dots dynamisch aus Archivdaten (Fallback)

**Layer-Architektur (E-41):** 5 togglebare Layer via `buildLayerChips()` (Multi-Select)

| Layer | Default | Inhalt |
|---|---|---|
| mobilitaet | AN | Swim-Lane-Balken + Event-Marker + Gitterlinien |
| auftritte | AN | Aggregierte Auftritte-Dots + Gastspiel-Section |
| netzwerk | AUS | Intensitätsband am oberen Rand |
| repertoire | AUS | Komponisten-Zeitspannen |
| sparkline | AUS | Dokumente-pro-Jahr Flächendiagramm |

**Visualisierungselemente**

- Phasen-Bänder — 7 Lebensphasen als alternierende Hintergrundfarben
- Skalenbruch — Zigzag bei 1975 (E-39, BREAK_YEAR=1975, BREAK_RATIO=0.74)
- Balken — 55% Lane-Höhe, KUG-Blau = Wohnort, Gold = Aufführungsort
- Event-Marker (E-42) — vertikale Linien mit gestaffelten Text-Labels, Flucht 1944 in Signal-Rot
- Auftritte-Dots (E-45) — aggregiert pro Ort+Jahr, Radius nach Dokumentanzahl
- 3-Farben-Schema: KUG-Blau (Engagement), Warm-Gold (Gastspiel), Signal-Rot (nur Flucht)

**Interaktion**

- Layer-Chips: Multi-Select-Toggle für 5 Schichten
- Phasen-Chip-Bar: filtert via `data-year`/`data-von`/`data-bis`
- Event-Marker: Hover zeigt Kontext + Repertoire, Klick aktiviert Fokus-Modus
- Auftritte-Dots: Hover zeigt Werk/Rolle/Ort/Kategorie
- Balken: Klick → Ort-Index, Shift+Klick → Matrix
- FF-Badges: FF1, FF2, FF3, FF4

### Lebenspartitur

Vertikaler Bump-Chart (D3). Zeitachse Y, Orte X, durchgehende „Lebenslinie" mit farbkodierten Mobilitätssprüngen. 3-Spalten-Grid: Netzwerk-Facette (links), Hauptchart, Repertoire-Facette (rechts). Synchronisierte Hover-Highlight-Linie über alle 3 Spalten.

- Als SPA-Tab (`renderLebenspartitur(store, container)`, E-57) und als Standalone-Seite (`lebenspartitur.html`, E-49)
- UA-Distanz-Annotation in Phase-Tooltips (E-60)

### Lebensstationen

Scrollytelling (D3 + IntersectionObserver), 7 Kapitel + 7 Wendepunkte, Sticky Mini-Timeline, 2-Spalten-Grid (Text + Ort-Schema-SVG), Stat-Cards (Netzwerk/Auftritte/Repertoire), Synthese-Section. Standalone: `lebensstationen.html` (E-48).

### Matrix

- Begegnungsstruktur als Heatmap (Person × Zeitraum, 5-Jahres-Perioden)
- Kategoriefilter (Dirigent, Regisseur, Korrepetitor, Kollege, Vermittler, Andere)
- Graz-Fokus-Toggle (FF1)
- Drilldown auf Dokumentliste mit Orts-Tags (Graz = grün) und Werk-Chips (klickbar → Kosmos)
- Netzwerk-Sparkline über der Heatmap
- FF-Badges: FF1, FF3

### Kosmos

- Repertoire-/Rollenbezug als deterministisches konzentrisches Layout
- Zentrum Malaniuk, Komponisten-Layer, Werk-Layer
- Fokus-Interaktionen, Zoom/Pan/Drag
- Phasen-Chip-Bar: Genre-Ratio-Annotation + UA-Distanz (FF2, E-60)
- Ort-Chips im Werk-Popup (FF3)
- Volle Rollen-Anzeige im Tooltip und Popup
- FF-Badges: FF2, FF3

### Zeitfluss

Chronologischer Dot-Plot (D3) aller Werke nach Komponist, Gattung, Zeit.

- Y-Achse: Komponisten (sortierbar)
- X-Achse: Premiere-Jahre
- Dots: Größe nach Dokumentanzahl, Form nach Gattung (Kreis = Oper, Raute = Konzert/Lied)
- Ort-kodierte Dot-Ränder: Graz=#2E7D4F, Wien=#004A8F, Bayreuth=#9A7B4F, Salzburg=#6B4E8C, München=#4A6E96 (FF3)
- Phasen-Zoom mit Smooth-Transition
- FF-Badges: FF1, FF3

### Wissenskorb

- Bookmark-Icons in Archiv + Indizes
- Card-Darstellung pro Record: Signatur, Titel, Typ-Badge, Meta, Verknüpfungen als Chips
- CSV- und BibTeX-Export
- sessionStorage-Persistenz

## Cross-View Navigation

Vollständiges Navigationsnetzwerk zwischen den Visualisierungen:

| Von \ Nach | Matrix | Kosmos | Zeitfluss | Mobilität | Indizes | Archiv |
|---|---|---|---|---|---|---|
| **Matrix** | — | Drilldown | Drilldown | Peripherie-Chip (Malaniuk) | Name-Klick | Sig-Klick |
| **Kosmos** | Popup-Link | — | Popup-Link | — | Popup-Link | — |
| **Zeitfluss** | Shift+Klick Dot | Shift+Klick Dot | — | — | Y-Label-Klick | Dot-Klick |
| **Mobilität** | Shift+Klick Bar | — | Repertoire-Diamond-Klick | — | Bar-Klick | Dot-Klick |

- **Router**: `navigateToView(tab, context)` als generische Cross-View-Funktion
- **Event-Bus** (E-53): `events.js` — `onViewNavigate(tab, handler)` mit Auto-Replay, ersetzt verteilte `window.addEventListener('m3gim:navigate')`

## Designsystem

- **Funktionale Farbsemantik**:
  - KUG-Blau `#004A8F` — Interaktion, Engagement, primäre Aktion
  - Signal-Grün — Verknüpfung, Match
  - Neutral-Grau — Abwesenheit, unbearbeitet
  - Warmer Hintergrund — Struktur
  - Signal-Rot — nur für Flucht 1944 (hochselektiv)
- **Typografie**: Source Serif 4 (Titel), UI-Font stack (Interface), Mono (Signaturen)
- **CSS Custom Properties** als Design-System
- **Responsive**: `@media <768px` Breakpoints in base.css + components.css — Header, Tab-Bar, Toolbars, FF-Badges, Legenden
- **Accessibility**: `role="tablist/tab/tabpanel"`, `aria-selected` dynamisch, `aria-hidden` auf SVG-Icons, `aria-label` auf Korb-Badge
- **DEV/Prod**: `viewLog()` No-Op auf GitHub Pages (E-50)
- **Error Boundaries** pro View: main.js fängt Render-Fehler pro Tab (sync+async, E-51)

## Schnittstellenvertrag

| Thema | Kanonische Quelle |
|-------|------------------|
| Datenmodell, Ontologie, Vokabulare | [datenmodell.md](datenmodell.md) |
| Pipeline, Datenfluss, Qualitätsbaseline | [pipeline.md](pipeline.md) |
| Testsuite, TDD-Workflow | [tests.md](tests.md) |
| Architekturentscheidungen | [entscheidungen.md](entscheidungen.md) |
| Operativer Stand, nächste Schritte | [status.md](status.md) |
| Forschungsrahmen | [forschungsrahmen.md](forschungsrahmen.md) |
