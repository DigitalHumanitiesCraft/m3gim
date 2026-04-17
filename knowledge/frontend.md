# Frontend

> Laufzeitmodell, Modulstruktur, Store, Routing und Designsystem. Die vormaligen D3-Visualisierungen (Mobilität, Matrix, Kosmos, Zeitfluss, Lebenspartitur, Lebensstationen) sind entfernt. Die destillierten Lektionen stehen unter § Lektionen aus den entfernten Visualisierungen. Die neue Tab-Architektur und die Designregeln für den Nachfolger stehen in [interface-konzept.md](interface-konzept.md).

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

### Frontend-Module (nach Entfernung der D3-Views)

| Pfad | Zweck |
|------|-------|
| `main.js` | Einstiegspunkt, `TAB_RENDERERS`-Registry, Lazy-Tab-Rendering, Error Boundaries pro Tab |
| `data/loader.js` | JSON-LD-Ladeschicht, Store-Aufbau inkl. Phase-6-Maps, Partitur-Singleton |
| `data/aggregator.js` | Daten-Aggregation (wird für die neue Mobilitäts-Visualisierung neu bewertet) |
| `ui/router.js` | Hash-Routing, `navigateToView`/`navigateToIndex`, ARIA-State |
| `ui/events.js` | Cross-View Event-Bus (`onViewNavigate()`) mit Auto-Replay |
| `ui/korb.js` | Wissenskorb (sessionStorage) |
| `views/archiv.js` + `archiv-bestand.js` + `archiv-chronik.js` + `archiv-inline-detail.js` | Archiv als Bestand + Chronik, Inline-Detail mit Finanzen, AgRelOn, SpatiotemporalEvents |
| `views/indizes.js` | 4-Grid Explorer (Personen, Organisationen, Orte, Werke) |
| `views/korb.js` | Korb-Cards |
| `utils/format.js`, `utils/dom.js`, `utils/date-parser.js`, `utils/normalize.js` | Formatierungshilfen, DOM-Helper, Datumsparser, Namensnormalisierung |
| `utils/viz-components.js` | Shared Viz-Builder (werden für die Neukonzeption gesichtet, nicht mehr aktiv genutzt) |

CSS-Dateien unter `docs/css/`: `variables`, `base`, `archiv`, `indizes`, `korb`, `components`, `pages`. Die viz-spezifischen CSS-Dateien sind mit den Views entfernt.

### Info-Seiten (statisches HTML)

Fünf Content-Seiten (`about.html`, `projekt.html`, `modell.html`, `hilfe.html`, `impressum.html`). Einheitliches Template: `info-header`, `info-nav`, `info-main`, `info-footer`. Lesebreite 720px, Source Serif 4 für Titel.

## Routing

- Hash-basiert in `router.js`: aktive Tabs sind Archiv, Indizes, Wissenskorb (die Neukonzeption der Mobilitäts-Visualisierung wird als neuer Tab eingehängt).
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
  konvolutChildren, childToKonvolut, konvolutMeta,
  folioIds, unprocessedIds,
  recordCount, konvolutCount, exportDate,

  // Phase-6-Erweiterungen
  dftHierarchy:   Map<conceptId, {id, prefLabel, broader, children[]}>,
  mobilityEvents: Map<eventId, {id, place, placeWikidata, date, role, description, recordId}>,
  recordToEvents: Map<recordId, eventId[]>,
  agentRelations: Map<recordId, [{type, objectName, objectWikidata, validityBegin, validityEnd, provenance}]>,
  finances:       Map<recordId, [{field, role, rawValue, amount:Number, currency}]>,
}
```

Archiv und Indizes lesen direkt aus `m3gim.jsonld` (über Store), nicht aus separaten View-JSONs.

### Phase-6-Store-Maps im Überblick

| Store-Map | Quelle im JSON-LD | Verwendung |
|---|---|---|
| `store.dftHierarchy` | Top-Level `skos:Concept`-Knoten + `skos:broader` | Vorbereitung für hierarchischen Dokumenttyp-Filter im Archiv |
| `store.mobilityEvents` + `store.recordToEvents` | `m3gim:SpatiotemporalEvent`-Knoten + `m3gim:hasSpatiotemporalEvent`-Refs | Grundlage für die neu zu konzipierende Mobilitäts-Visualisierung |
| `store.agentRelations` | `m3gim:agentRelation`-Array am Record | Archiv-Inline-Detail; geplant: Beziehungs-Badges im Personen-Index |
| `store.finances` | `m3gim:hasDetail`-DetailAnnotations mit `monetaryAmount` + `currency` + `detailRole` | Archiv-Inline-Detail zeigt Honorare |

Die Invarianten werden als Kontrakttests in [test_06_frontend_contract.py](../tests/test_06_frontend_contract.py) durchgängig geprüft. Provenance (`agrelon:hasProvenance` + `hasConfidenceValue`) wird nicht als eigene Store-Map indexiert, sondern am Record mitgeführt.

## Ansichten

### Archiv

- Bestand und Chronik als zwei Perspektiven auf denselben Datenraum
- Klickbare Spaltenheader mit Sortier-Indikatoren
- Autocomplete-Combobox für Personenfilter
- Erweiterte Suche: Signatur, Titel, Dokumenttyp, Datum
- Unbearbeitete Objekte dezent markiert (opacity, Tooltip)
- Inline-Detailflächen zeigen Finanzen, AgRelOn-Beziehungen und SpatiotemporalEvents; „Zum Wissenskorb"-Button pro Record
- Bookmark-Icons an jeder Zeile (Hover → sichtbar)
- Reset-Button setzt alle Filter gleichzeitig zurück

### Indizes

- Vier Grid-Blöcke: Personen, Organisationen, Orte, Werke
- Cross-Grid-Facettensuche: Klick auf Index-Eintrag filtert die anderen drei Grids
- Kompakte Toolbar: Suche (flex: 1) + Facet-Chips
- Detail-Expansion begrenzt + „Alle im Archiv"-Link
- Wikidata-Icons bei Einträgen mit Q-ID, WD-Coverage-Anzeige im Header
- **Subtitles** aus WD-Enrichment: `Beruf · Stimmfach · Lebensdaten` unter Personennamen (E-61)

### Wissenskorb

- Bookmark-Icons in Archiv + Indizes
- Card-Darstellung pro Record: Signatur, Titel, Typ-Badge, Meta, Verknüpfungen als Chips
- CSV- und BibTeX-Export
- sessionStorage-Persistenz

## Lektionen aus den entfernten Visualisierungen

Die sechs entfernten D3-Views waren Entwürfe. Sie werden nicht rekonstruiert, aber ihre Substanz wird in die Neukonzeption der Mobilitäts-Visualisierung überführt. Die folgenden Muster gelten als Designregeln für den Nachfolger.

### Kompositionsentscheidungen, die bleiben

- **Skalenbruch als bewusste Geste.** Die Zigzag-Unterbrechung bei 1975 (in Mobilität, Lebenspartitur, Lebensstationen konsistent angewendet) macht die Pre/Post-Flucht-Asymmetrie visuell unmittelbar lesbar. Diskontinuität wird zur Kompositionsform, nicht verdeckt.
- **Ortsfarbcodierung als Wiedererkennung.** Die durchgehende Farbzuordnung (Graz, Wien, Bayreuth, Salzburg, München) über alle Views hat Orientierung gestiftet. Ort-Farben gehören ins Designsystem, nicht in einzelne Views.
- **Determinismus vor Schönheit.** Seeded Randomness (Zeitfluss-Jitter) und polar-analytisches Layout (Kosmos) haben garantiert: gleiche Daten ergeben gleiche Grafik. Pflicht für Langzeitstabilität und Wiedererkennbarkeit — keine unkontrollierte Force-Simulation.
- **Facetten-Synchronisierung via gemeinsamer Y-Scale.** Die 3-Spalten-Partitur (Netzwerk — Hauptchart — Repertoire) mit synchronem Hover-Highlight war das kognitiv stärkste Muster: auf einen Blick sichtbar, welche Netzwerk-Intensität und welches Repertoire zu welchem Zeitpunkt aktiv waren.
- **Kern-/Peripherie-Dichotomie.** Die Matrix-Aufteilung in stark vernetzte (Kern) und schwach vernetzte (Peripherie als kollapsbare Gruppen) Personen hat Überladung ohne Informationsverlust verhindert. Prinzip: das Häufige zeigen, das Seltene zugänglich halten.
- **3-Farben-Semantik-Schema.** Engagement-Blau, Gastspiel-Gold, Signal-Rot nur für Flucht 1944 — semantisch scharf, Rot bleibt Ausnahme.

### Interaktionsmuster, die etabliert sind

- **Layer/Fokus/Phase-Dimming** als universelles Muster über mehrere Views bewährt — bleibt als Fade-on-Focus-Standard.
- **Deep-Link-Hash-Routing** in SPA-Tabs + `navigateToView`-Event-Bus für Cross-View-Interaktion funktioniert.
- **Shared Phase-Chip-Leiste** zur Jahreseingrenzung war konsistent über alle Views — als wiederverwendbares Element übernommen.

### Anti-Muster, die nicht wiederkehren sollen

- **Räumliche Separation zusammengehöriger Datenschichten.** Der Gastspiel-Block in Mobilität war vom Hauptchart abgesetzt — Parallelen-Lesen wurde kognitiv teuer. Lehre: zusammenhängende Ebenen bleiben in gemeinsamem Koordinatensystem.
- **Unbegrenzter Zoom ohne State-Persistence.** In Kosmos wurde Expand-/Zoom-Zustand nicht gespeichert, Zoom war unbegrenzt — irgendwann Text unleserlich. Lehre: klare Zoom-Bounds, State im Hash oder der Session.
- **Inkonsistente Scales zwischen Szenen.** Die Lebensstationen-Scrollytelling-Mini-Karten hatten andere Scales als die Synthese-Sektion — Maßstabs-Dissonanz. Lehre: ein geteiltes Scale-Objekt pro Achse über alle Szenen einer View.
- **Schmale Facetten mit Text-Quetschung.** Die Netzwerk-Facette in Lebenspartitur war zu schmal, Labels unleserlich. Lehre: Facetten bekommen Mindestbreite oder werden durch Interaktion (Hover-Detail) kompensiert, nicht durch Stauchung.
- **Scrollytelling mit IntersectionObserver bei kleinen Viewports.** Precision-Probleme und nicht-responsive Stat-Cards haben den Flow gestört. Lehre: Scrollytelling braucht sehr viel Testaufwand; Plot mit Sticky-Filter ist robuster.

### Forschungsfrage-Abdeckung der entfernten Views

| FF | Stärkste frühere Annäherung | Was für die Neukonzeption bleibt |
|---|---|---|
| FF1 (Professionalisierung/Vernetzung) | Matrix-Heatmap (Person × Phase) + Ort-Dots in Mobilität | Kern-/Peripherie-Schnitt + Ort als strukturierende Achse |
| FF2 (narrativ/ästhetisch) | Kosmos mit Genre-Ratio + UA-Distanz | bleibt spekulativ, nicht MVP-relevant |
| FF3 (Wissenstransfer) | Zeitfluss (Komponist × Ort × Jahr) | Ort-Codierung über Dot-Rand war elegant — übernehmen |
| FF4 (Mobilitätsformen) | Mobilität-Schwimmbahn + Lebenspartitur-Bump | Stärkster Hebel — hier setzt die Neukonzeption an |

### Datenvorstrukturen, die unverändert bleiben

- `store.mobilityEvents` (Phase 6) zentralisiert, was vorher heuristisch aus `partitur.auftritte` abgeleitet wurde — die neue Viz konsumiert diese Map direkt.
- `store.agentRelations` + `store.finances` sind bereits in Archiv-Inline-Detail integriert; die neue Viz kann sie pro Ort oder Record sekundär einblenden, ohne selbst zu aggregieren.

## Designsystem

- **Funktionale Farbsemantik**:
  - KUG-Blau `#004A8F` — Interaktion, Engagement, primäre Aktion
  - Signal-Grün — Verknüpfung, Match
  - Neutral-Grau — Abwesenheit, unbearbeitet
  - Warmer Hintergrund — Struktur
  - Signal-Rot — nur für Flucht 1944 (hochselektiv)
- **Typografie**: Source Serif 4 (Titel), UI-Font stack (Interface), Mono (Signaturen)
- **CSS Custom Properties** als Design-System
- **Responsive**: `@media <768px` Breakpoints in base.css + components.css — Header, Tab-Bar, Toolbars, Legenden
- **Accessibility**: `role="tablist/tab/tabpanel"`, `aria-selected` dynamisch, `aria-hidden` auf SVG-Icons, `aria-label` auf Korb-Badge
- **DEV/Prod**: `viewLog()` No-Op auf GitHub Pages (E-50). Auf localhost zeigt `main.js` beim Seitenaufruf einen strukturierten Store-Report (Records, Konvolute, Phase-6-Maps, WD-Coverage pro Index, Provenance-Coverage) und setzt `window.m3gim` mit Debug-Helpern: `window.m3gim.store`, `window.m3gim.inspect(recordId)`, `window.m3gim.finances()`, `window.m3gim.agentRelations()`, `window.m3gim.mobilityEvents()`, `window.m3gim.dftTree()`, `window.m3gim.provenanceOf(recordId)` (letzterer zeigt alle XLSX-Quellen eines Records + Nested Entities als Liste `{field, sheet, row, datenpunkt}`). Auf Produktion (dhcraft.org) bleibt alles stumm.
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
