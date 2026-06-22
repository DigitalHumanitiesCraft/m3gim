---
title: Architektur
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.2
created: 2026-02-19
updated: 2026-06-17
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Architecture
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/architecture
topics: ["[[Static Site Architecture]]", "[[Information Visualisation]]"]
related: [design, pipeline, data, decisions]
---

# Architektur

> Wie das Frontend technisch gebaut ist: Laufzeitmodell, Modulstruktur, Store und State, Routing, build-loses Deployment auf GitHub Pages, Datenfluss von JSON-LD in den Store sowie die Ansichten der einzelnen Tabs. Die Designhaltung, das Designsystem und die Lektionen aus den entfernten Visualisierungen stehen in [design.md](design.md). Die vormaligen D3-Visualisierungen (Mobilität, Matrix, Kosmos, Zeitfluss, Lebenspartitur, Lebensstationen) sind entfernt.

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
- `tests/` — Pipeline-Testsuite (siehe [testing.md](testing.md))

### Frontend-Module

| Pfad | Zweck |
|------|-------|
| `main.js` | Einstiegspunkt, `TAB_RENDERERS`-Registry, Lazy-Tab-Rendering, Error Boundaries pro Tab, DEV-Debug-Helper (`window.m3gim.*`) |
| `data/loader.js` | JSON-LD-Ladeschicht, Store-Aufbau inkl. Phase-6-Maps, Koordinaten-Patch-aware STE-Indizierung |
| `utils/provenance.js` | `extractXlsxSource(obj)` — Provenance-Shape-Extraktion, geteilter Helper für Loader, Inline-Detail und Korb (E-91) |
| `data/constants.js` | `ROLE_CLUSTER`, `ROLE_TO_SECTION`, `AGRELON_LABELS`, `EVENT_ROLE_TO_MOBILITY_CLUSTER` (Session 36), `WIKIDATA_ICON_SVG`, Komponisten-/Personen-Kategorien |
| `ui/router.js` | Hash-Routing, `navigateToView`/`navigateToIndex`, ARIA-State |
| `ui/korb.js` | Wissenskorb (localStorage) |
| `views/archiv-bestand.js` | Bestand-Tab: Konvolut-Hierarchie mit Meta-Chips (Top-3-Dokumenttyp + Status-Mix) direkt in der Zeile; Inline-Detail nur für Records, nicht mehr für Konvolute (E-82). Hierarchische Sortierung: Konvolute Signatur-stabil, Kinder innerhalb sortierbar (E-83). |
| `views/archiv-chronik.js` | Chronik-Tab: scrollender Jahres-Zeitstrahl 1919-2009, dichte-adaptive Jahreshoehe |
| `views/archiv-inline-detail.js` | Record-Detail mit fünf funktionalen Blöcken (Produktion · Mitwirkende · Werk & Repertoire · Ort & Ereignis · Erwähnt), AgRelOn-Dedup (liest `rel.objectName`/`rel.objectWikidata`, nicht das rohe JSON-LD), Sprach-Label-Auflösung, `buildRoleChip()` als geteilter Helper |
| `views/_archiv-toolbar.js` | Geteilte Toolbar (Suche, Dokumenttyp-Filter, Person-Filter, Count-Anzeige) für Bestand + Chronik |
| `views/indizes.js` | 4-Grid Explorer (Personen, Organisationen, Orte, Werke) mit Beziehungsbadges (AgRelOn), nur Einträge mit `records.size > 0` |
| `views/mobility.js` | Mobilitäts-Tab (sichtbar, E-111): D3-geo-Trajektorienkarte über die volle Breite. Orte als Knoten nach dominanter Mobilitätssicht, biografischer Pfad als gerichtete Pfeile hell-zu-dunkel über die Zeit, Zeitregler mit Abspielen, Sicht-Legende als Filter, Klick-Knoten-Detailstreifen. Lokale Ländergeometrie `docs/data/geo/countries-110m.geo.json` (Natural Earth 110m), kein externer Kartenserver, kein Leaflet. |
| `views/mobility-atlas.js` | Leaflet-Karte + D3-Zeitstrahl + Detailpanel (Tab `mobilitaets-atlas` aktuell `hidden`, E-81; durch `views/mobility.js` (E-111) überholt, Stilllegung operator-offen; Leaflet ist nicht in `index.html` eingebunden und bei einer Reaktivierung wieder einzubinden) |
| `views/repertoire.js` | Zwei parallele Aggregat-Tabellen Werke × Komponisten (Tab aktuell `hidden`, E-81) |
| `views/biogramm.js` | Chronologischer D3-Zeitstrahl 1919–2009 (Tab aktuell `hidden`, E-81) |
| `views/netzwerk.js` | Orchestrator des Netzwerk-Tabs (E-93, E-94): State-Eigentum, `draw`, Filter-Anwendung, Detail-Panel, Telemetrie, Zeitfenster-Index. Delegiert Sidebar an `_netzwerk-sidebar.js` und Canvas-Rendering an `_netzwerk-canvas.js`. Nach Session-47-Split von 1095 auf 484 Zeilen. |
| `views/_netzwerk-geometry.js` | Reine Layout-Funktionen für den Netzwerk-Tab (E-93): `computeLayout`, `computeCoOccurrence`, `classifyRing`, `nodeColor`, `derivePersonKategorie`, `labelGeometry`. Keine DOM-/D3-Aufrufe, deterministisch, mit 42 Node-Unit-Tests abgedeckt (E-94). |
| `views/_netzwerk-sidebar.js` | Sidebar-UI des Netzwerk-Tabs (E-94): Suche, Filter-Slider, Toggles (Ko-Okkurrenz + AgRelOn getrennt), Zeitfenster, Kategorie-Chips, Legende, Reset. Reine UI-Produktion mit `state`/`actions`-Vertrag — keine direkte State-Mutation. |
| `views/_netzwerk-canvas.js` | SVG-Rendering, Zoom/Pan, Hover-/Highlight-Logik des Netzwerk-Tabs (E-94): `drawCanvas`, `renderZoomControls`, `applyHighlight` (Knoten-Nachbarschaft), `applyEdgeHighlight` (einzelne Kante + Endpunkte). Kommuniziert mit dem Orchestrator nur ueber `zoomRefs` (wird mutiert) und `actions = {getSelected, setSelected}`. |
| `views/korb.js` | Korb-Cards mit `buildRoleChip()` + funktionale Blöcke (Produktion · Mitwirkende · Werk & Repertoire · Ort & Ereignis · Erwähnt · Weitere · Beziehungen · Finanzen), CSV- + BibTeX-Export inkl. AgRelOn + Finanzen |
| `utils/format.js`, `utils/dom.js`, `utils/date-parser.js`, `utils/normalize.js` | Formatierungshilfen, DOM-Helper, Datumsparser, Namensnormalisierung |

`data/aggregator.js` und `utils/viz-components.js` wurden Session 32 mit den D3-Prototypen entfernt.

CSS-Dateien unter `docs/css/`: `variables`, `base`, `components`, `archiv`, `indizes`, `korb`, `mobility`, `mobility-atlas`, `repertoire`, `biogramm`, `netzwerk`, `pages`. Design-Tokens (Farben, Spacing, Text-Sizes, Transitions) zentral in `variables.css`; alle Tab-CSS nutzen diese Tokens (Session 34).

### Info-Seiten (statisches HTML)

Fünf Content-Seiten (`about.html`, `projekt.html`, `modell.html`, `hilfe.html`, `impressum.html`). Einheitliches Template: `info-header`, `info-nav`, `info-main`, `info-footer`. Lesebreite 720px, Source Serif 4 für Titel.

## Routing

- Hash-basiert in `ui/router.js`. Der Katalog `TABS` listet alle registrierten Tabs (Bestand, Chronik, Statistik, Indizes, Mobilität, Mobilitäts-Atlas, Repertoire, Biogramm, Netzwerk, Korb). Sichtbar in der Tab-Bar sind die Einträge im `VISIBLE_TABS`-Set (aktuell Bestand · Chronik · Statistik · Indizes · Mobilität · Netzwerk · Korb); die drei verbleibenden Perspektiv-Tabs Mobilitäts-Atlas/Repertoire/Biogramm bleiben per `hidden` ausgeblendet (E-81, präzisiert durch E-93 für Netzwerk). Mobilität (`mobilitaet`, E-109/E-111) und Mobilitäts-Atlas (`mobilitaets-atlas`) sind getrennte Tabs: der sichtbare ist die D3-geo-Karte, der verborgene der ältere Leaflet-Atlas. Hash-URLs auf versteckte Tabs werden in `parseHash` auf `bestand` umgebogen. `archiv` bleibt als Legacy-Alias für alte Bookmarks auf `bestand` gemappt.
- Deep Links: `#bestand/UAKUG/NIM_003%20Folio%2001` für Datensatzkontext
- Info-Seiten als eigenständige HTML-Dateien (normale Links, kein Hash-Routing)
- `navigateToIndex(gridType, entityName)` für Cross-Tab-Navigation, `navigateToView(tab, {recordId})` für Sprung aus anderen Views ins Bestand-Tab

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
  konvolutChildren, childToKonvolut,
  konvolutMeta:   Map<kid, {title, dateDisplay, childCount, processedCount, folioId, totalLinks, datedCount, docTypeCounts:Map<dft,count>, statusCounts:Map<status,count>}>,
  folioIds, unprocessedIds,
  recordCount, konvolutCount, exportDate,

  // Phase-6-Erweiterungen + Session-33-Koordinaten-Patch
  dftHierarchy:   Map<conceptId, {id, prefLabel, broader, children[]}>,
  mobilityEvents: Map<eventId, {id, place, placeWikidata, placeLat, placeLon, placeCountry, date, role, description, recordId, xlsxSource}>,
  recordToEvents: Map<recordId, eventId[]>,
  agentRelations: Map<recordId, [{type, objectName, objectWikidata, validityBegin, validityEnd, provenance, xlsxSource}]>,
  finances:       Map<recordId, [{field, role, rawValue, amount:Number, currency, xlsxSource}]>,
  stageRoles:     Map<stageRoleId, name>,         // m3gim:StageRole (E-96/E-98)
  performances:   Map<performanceId, Performance-Node>,
}
```

Alle Tabs lesen direkt aus `m3gim.jsonld` (über Store), nicht aus separaten View-JSONs. Die Derivate `partitur.json`, `matrix.json`, `kosmos.json` sind nicht mehr angebunden.

### Phase-6-Store-Maps im Überblick

| Store-Map | Quelle im JSON-LD | Verwendung |
|---|---|---|
| `store.dftHierarchy` | Top-Level `skos:Concept`-Knoten + `skos:broader` | Hierarchischer Dokumenttyp-Filter im Archiv |
| `store.mobilityEvents` + `store.recordToEvents` | `m3gim:SpatiotemporalEvent`-Knoten + `m3gim:hasSpatiotemporalEvent`-Refs; seit Session 33 inkl. `placeLat`/`placeLon`/`placeCountry` aus dem Koordinaten-Patch | Mobilitäts-Atlas, Biogramm-Orte-Spur, Archiv-Inline-Detail Ort-&-Ereignis-Block |
| `store.agentRelations` | `m3gim:agentRelation`-Array am Record | Archiv-Inline-Detail Beziehungen-Block, Indizes-Personen-Beziehungsbadges, Netzwerk-Tab |
| `store.finances` | `m3gim:hasDetail`-DetailAnnotations mit `monetaryAmount` + `currency` + `detailRole` | Archiv-Inline-Detail Finanzen-Block |
| `store.stageRoles` | `m3gim:StageRole`-Knoten (`rico:name`) | Bühnenrollen-Auflösung im Archiv-Inline-Detail (E-96/E-98) |
| `store.performances` | `m3gim:Performance`-Knoten (n-äre Aufführung mit `m3gim:hasStageRole`-Ref) | Archiv-Inline-Detail Werk-&-Repertoire-Block |

Die Invarianten werden als Kontrakttests in [test_06_frontend_contract.py](../tests/test_06_frontend_contract.py) durchgängig geprüft. Provenance (`agrelon:metadataProvenance`) wird nicht als eigene Store-Map indexiert, sondern am Record mitgeführt.

**Wichtiger Formatbruch:** `store.agentRelations`, `mobilityEvents` und `finances` transformieren das rohe JSON-LD in ein flaches Lookup-Format (z. B. `objectName`/`objectWikidata` statt des verschachtelten `agrelon:hasObject`). Consumer dürfen nicht die JSON-LD-Keys lesen — das führte Session 35 zu einem stillen Dedup-Bug (Malaniuk doppelt sichtbar). JSDoc-Shapes für `RelationEntry`, `MobilityEvent`, `FinanceEntry`, `DftConcept` sind direkt oberhalb von `buildStore()` in `loader.js` annotiert.

## Ansichten

### Bestand und Chronik (seit Session 35 eigenständige Tabs)

- Bestand und Chronik sind eigene Top-Level-Tabs (früher Archiv-Sub-Toggle), nutzen eine geteilte Toolbar (`_archiv-toolbar.js`).
- **Leitprinzip „nur bearbeitet" als Default, umschaltbar (E-116):** Standardmäßig rendern Konvolute ohne erschlossene Folios, Records ohne Verknüpfungen und Folios mit 0 Links nicht. Der Bestand-Toggle „Nicht erschlossene einblenden" (`zeigeUnerschlossen`, Facet-Kind `toggle`) schaltet den „alle"-Modus frei: dann erscheinen auch die nicht erschlossenen Records und Konvolute, in `getOrderedItems(showAll)` durchgereicht und in `renderRows` über `.archiv-row--unerschlossen` ausgegraut plus Badge „nicht erschlossen" markiert. So sind alle Daten erreichbar, ohne den Erschließungsstand zu kaschieren (Zielbild Linie 3): das Form-ist-Signal-Prinzip wird nicht aufgegeben, sondern als sichtbare Markierung statt als Ausblendung umgesetzt. Folios (reine Metadaten-Records) bleiben in beiden Modi raus. Plakate + Tonträger sind davon unabhängig pauschal ausgeblendet (`EXCLUDED_DFT`, Forschungsscope laut `interface-konzept.md`, nicht Teil des Toggles); die Chronik filtert weiterhin ausschließlich über `unprocessedIds` ohne Toggle, weil der lokale DFT-Ausschluss 0 Matches liefert — Session 36. Log-Stempel-Keys ergänzt um `erschliessung` (erschlossen|alle) und `nicht-erschlossen`.
- **Counter-Tooltip** erklärt „bearbeitet" direkt am `archiv-count`-Span (Schicht 1 + 2 erschlossen, Plakate/Tonträger ausgeblendet, Verweis auf `quality-snapshot.md` für Gesamtzahlen).
- **Chronik als Scroll-Zeitstrahl** (E-88, seit Session 41): statt Perioden-Akkordeon rendert jedes Jahr 1919-2009 (+ Ausreisser) eine eigene Zeile mit Jahres-Label links, Dot auf der Zeitachse und Record-Chips rechts. Dot-Groesse skaliert mit Jahresbelegung. Leere Jahre bleiben als Umriss-Dot sichtbar, **dichte-adaptiv** (E-92): Nicht-Dekaden-Jahre ohne Records rendern als 6-px-Linie (Label versteckt), Dekaden-Jahre (% 10 == 0) bleiben auch bei Null Records sichtbar als Anker. So bleibt die Lueckenstruktur als Rhythmus lesbar, ohne endloses Scrollen durch Jahrzehnte ohne Belege. Log-Stempel: `records, jahre-belegt, undatiert, spanne, gefiltert`.
- **Mobilitätssichten als Chip-Farbfamilie** (Session 36, M3): die fünf Sichten aus [data.md § 10](data.md) (performativ, institutionell, korrespondenz, diskursiv, biografisch) sind im Frontend über `EVENT_ROLE_TO_MOBILITY_CLUSTER` in `docs/js/data/constants.js` einem `m3gim:eventRole` zugeordnet. CSS-Tokens `--color-sicht-performativ|institutionell|korrespondenz|diskursiv|biografisch` in `variables.css`, Chip-Modifier `.chip--mobility-*` in `archiv.css`. Wird von M4 an den Stations-Chips der Chronik getragen. Ungeklärte Rollen (`auftrag`, `entstehung`, finanzielles `ueberweisung`) stehen explizit auf `null` — keine stillschweigende Einordnung. Abgesichert in `tests/test_25_chronik_mobility_cluster.py`.
- **DEV-only Log-Stempel** (Session 36, M3.5): der Stempel pro Tab-Render geht durch `logStamp(viewName, parts)` aus `docs/js/utils/env.js`. `IS_DEV` prüft `localhost`/`127.0.0.1`. Auf `dhcraft.org` bleibt die Konsole stumm, lokal und im Playwright-Smoke erscheint der kompakte State pro Render mit fester Key-Reihenfolge.
- **Konvolut-Meta-Chips direkt in der Zeile** (E-82): Top-3-Dokumenttyp-Chips + Status-Mix (abgeschlossen/begonnen/zurückgestellt) unter dem Konvolut-Titel. Click auf Konvolut-Zeile = Auf/Zuklappen, kein Inline-Detail.
- **Hierarchische Sortierung** (E-83): Konvolute bleiben Signatur-sortiert, Kinder werden *innerhalb* ihres Konvoluts nach dem gewählten Sort-Key sortiert. Bei aktivem Filter flach (Hierarchie dann aufgelöst).
- Titel-Dedup: Folios mit identischem Titel wie Konvolut zeigen leere Titel-Zelle (semantisches Rauschen vermeiden).
- Klickbare Spaltenheader, Autocomplete-Combobox für Personenfilter, Suche über Signatur/Titel/Dokumenttyp/Datum.
- **Inline-Detail für Records:** Fünf funktionale Blöcke — Produktion · Mitwirkende · Werk & Repertoire · Ort & Ereignis · Erwähnt. Agents mit AgRelOn-Äquivalent werden aus „Mitwirkende" unterdrückt (Dedup-Filter liest das *flache* Loader-Format). Sprach-Kürzel (`en, fr`) werden über `formatLanguage()` zu lesbaren Labels aufgelöst. Alle Chips via `buildRoleChip()` mit Cluster-Farbe + Provenance-Pille.
- Bookmark-Icons an jeder Record-Zeile (toggeln in `store.korb`, Klick auf Tab öffnet den Wissenskorb).
- Reset-Button setzt alle Filter gleichzeitig zurück.

### Statistik

- Interaktives Dashboard als **visuelles Porträt des Bestandes** (Read-only-Showroom-Ursprung E-89/E-92, zum Dashboard umgebaut E-122). Geteilte Sidebar-Shell (`viewShell`/`createSidebar`, `ui/sidebar.js`) wie Karte und Netzwerk: links ein record-basierter **Zeitraum-Filter** und Panel-Schalter (Ansichten-Legende plus „Alle/Keine"), rechts ein Masonry-Panel-Grid. Der Zeitschnitt rechnet alle sechs Panels gleichzeitig neu; eine Status-Zeile beziffert den Schnitt und die ausgeblendeten undatierten Records (Erschließungsspiegel). Bei vollem Fenster bleibt der Store unverändert.
- Sechs Sektionen, alle aus dem Live-Store aggregiert (kein Pipeline-Derivat, keine Hardcoded-Zahlen): **Dokumenttypen** (Bar-Rangliste: Top-12 + „Sonstige" + „ohne Typ", klickbarer Drilldown in den Bestand E-121) → **Mobilitätssichten** (horizontaler Balken-Chart ueber die fünf Sichten plus "Nicht klassifiziert", Farbe pro Sicht via `SICHT_COLOR`) → **Geografie** (Top-10-Orte als horizontal Bar + Events-pro-Jahrzehnt als D3-Histogramm mit Achsen-Titeln "Jahrzehnt"/"Anzahl Events") → **Netzwerk** (AgRelOn-Typen als Donut + **Personen nach Rolle** als Bar-Liste, datengetrieben aus dem `roles`-Set statt namensbasierter Kategorie) → **Repertoire** (Top-10-Komponisten als Bar-Liste) → **Finanzen** (Währungen als Donut + Detail-Rollen als Bar-Liste, `stat-section--minor` dimmt den Block als Teilerschließung). Die frühere Hero-Row (vier Kennzahl-Kacheln) ist entfernt \u2014 die Zahlen tauchen in den Sektions-Legenden ohnehin auf (E-92). Page-Intro (Titel + Lead) und die sechs Sektions-Lead-Absätze sind ebenfalls entfernt (E-112, order Punkt 3): keine textlastigen Seiten-Erklärungen mehr, nur die Diagramm-Titel als Label und die datengetriebene Histogramm-Notiz zu den datumslosen Events bleiben.
- Tech-Reporting (Bearbeitungsstand-Balken, Wikidata-Abdeckung pro Entitätstyp, Provenienz-Anteil, Low-Confidence-Policy) wurde aus der Statistik entfernt und lebt im Markdown-Report `data/reports/quality-snapshot.md`. Die Statistik zeigt, was die Daten *sind*, nicht wie vollständig sie sind.
- D3 v7 global via CDN; zwei Visualisierungs-Primitive im Modul: `buildDonut(data, {size, ariaLabel})` für kategorische Anteile, `buildHistogram(data, {xAccessor, yAccessor, xLabel, xAxisLabel, yAxisLabel})` für numerische Achsen (Achsen-Titel optional, rotierter Y-Titel via `.stat-axis__title`). Beide fallen bei CDN-Ausfall oder leeren Daten auf `buildHorizontalBars()` zurück. Farbpalette: `PALETTE[]` mit zehn getönten Akzenten als einfache Index→Farbe-Zuordnung, keine semantische Mapping-Pflege nötig.
- Aggregations-Helper sind pure Funktionen ohne Seiteneffekte (`aggregateDocTypes`, `aggregateSichten`, `aggregatePlaces`, `aggregateEventsPerDecade`, `aggregateAgentRelations`, `aggregatePersonRollen`, `aggregateComposers`, `aggregateFinances`); sie laufen auf dem zeitgefilterten Sub-Store, ohne den Filter zu kennen.
- Log-Stempel `[statistik] records:N | events:N | personen:N | panels:N | sichtbar:N | spanne:Y-Y | undatiert:N | doctypes:N | orte:N | relationen:N | komponisten:N | finanzen:N` (seit E-122; `konvolute`/`sektionen`/`waehrungen`/`doctypes-ohne`/`sichten` ersetzt durch `panels`/`sichtbar`/`spanne`/`undatiert`). `stamp_expectations['statistik']` prüft `records/events/personen/panels/sichtbar`.

### Indizes

- Vier Grid-Blöcke: Personen, Organisationen, Orte, Werke — parallel sichtbar, 2×2-Layout
- **Globale Toolbar** (E-91, seit Session 44): nutzt `buildToolbar` aus [`_toolbar.js`](../docs/js/views/_toolbar.js) mit zwei Facetten — Such-Input (`q`, filtert alle vier Grids gleichzeitig über `config.searchFields`) und Toggle `Nur mit Wikidata` (filtert Entries ohne Q-ID aus). Per-Grid-Suche entfällt.
- **Cross-Grid-Facettensuche**: Klick auf Index-Eintrag setzt `activeFilter = { gridKey, name, recordIds }` und filtert die anderen drei Grids auf Record-Overlap. Sichtbar als Chip unter der Toolbar, X-Button setzt zurück. Zweite Filterebene neben der Toolbar, unabhängig.
- Detail-Expansion pro Eintrag begrenzt + „Alle im Archiv"-Link
- Wikidata-Icons bei Einträgen mit Q-ID
- **Subtitles** aus WD-Enrichment: `Beruf · Stimmfach · Lebensdaten` unter Personennamen (E-61)
- **Beziehungsbadges an Personen** (Session 32): Loader-Pass 2.5 resolviert AgRelOn-Relationen rückwärts auf Personen-Einträge; `renderNameCell()` zeigt eine dritte Zeile `idx-relations` mit Chips (Match primär Q-ID, sekundär `normalizePerson(name)`).

### Mobilität

- D3-geo-Trajektorienkarte über die volle Breite (E-111, sichtbarer Tab `mobilitaet`). Projektion `geoMercator.fitExtent` auf die europäischen Punkte, lokale Ländergeometrie `docs/data/geo/countries-110m.geo.json` (Natural Earth 110m), kein Tile-Server, kein API-Key, kein Leaflet
- Orte als Knoten, Größe nach Ereigniszahl, Farbe nach dominanter Mobilitätssicht (`mobilityClusterFor`/`EVENT_ROLE_TO_MOBILITY_CLUSTER`, E-110); Kontextbezüge (Entstehung, Erwähnung) bleiben grau, daher erscheinen Zürich und Köln grau
- Biografischer Pfad als gerichtete Pfeile zwischen aufeinanderfolgenden verschiedenen Stationen, chronologisch eingefärbt hell (früh) zu dunkel (spät), SVG-Arrowhead-Marker
- Zeitregler mit Abspielen zieht den Pfad über die Jahre auf; Zoom und Pan per `d3.zoom` (scaleExtent [1,12]). Der Zoom steuert zugleich die Label-Ausdünnung (bei Basiszoom nur die Top-N-Stationen nach Ereigniszahl, mit Zoom mehr) und skaliert Font und Halo gegen den Zoom, sodass die Beschriftung bildschirmkonstant bleibt (E-114)
- Knoten-Tooltip beim Überfahren (HTML-Div über dem SVG, E-36): dominante Mobilitätssicht, Ereigniszahl, Zeitspanne; die Karte ist damit ohne Klick lesbar (E-114)
- Bedienelemente statt Fließtext (order-m3gim Punkt 3): Sicht-Legende als Filter-Toggle, Pfad-Schalter, Klick-Knoten-Detailstreifen, unverortet-Button, „abseits der Karte"-Button, einklappbare Voll-Liste für Prüfbarkeit
- Distinkt von den Session-32 entfernten D3-Prototypen (E-75): dies ist eine geprojizierte Karte, kein abstraktes Diagramm. Orte außerhalb des Kartenausschnitts (der New-York-Fehlmatch AF-01, [datenfehler.md](datenfehler.md)) werden aus Knoten und Pfad ausgenommen und im Detailstreifen als „abseits der Karte" transparent ausgewiesen, statt als auslaufende Arcs nach Westen (E-114, löst den E-111-Befund auf)

### Mobilitäts-Atlas

Der ältere, verborgene Karten-Tab (`mobilitaets-atlas`), durch den Mobilitäts-Tab (E-111) überholt; Stilllegung ist operator-offen.

- Leaflet-Karte mit OpenStreetMap-Tiles (CDN, kein API-Key); Canvas-Renderer
- Ein Marker pro Ort, Größe skaliert mit Event-Zahl pro Ort, Signal-Grün markiert Auswahl
- D3-Zeitstrahl (Brush) unter der Karte, bi-direktional gekoppelt über Closure-State (`selectedPlace`, `selectedRange`, `unverortetMode`)
- Detailpanel rechts mit Chips je Event, Klick → Sprung ins Archiv
- Badge „N unverortet" öffnet Liste der Events ohne Koordinaten
- Voraussetzung: Koordinaten-Patch (E-76) liefert `geo:lat`/`geo:long` an `store.mobilityEvents`
- Leaflet (`window.L`) ist aus `index.html` entfernt, solange der Tab `hidden` ist (E-81). Bei Reaktivierung muss das Leaflet-CDN wieder in `index.html` eingebunden werden. Der Hinweis steht als Kommentar an der Auslassstelle in `index.html` und in `mobility-atlas.js`.

### Repertoire

- Zwei parallele Aggregat-Tabellen: Bühnenrepertoire (60 %) × Komponisten (40 %)
- Jede Zeile: Name + Inline-Breakdown `ERW · AUFF · REP → Summe`
- Aggregation frontend-seitig aus `store.works` + DFT-Typ der Records
- Klick → Belegliste chronologisch im Detail-Panel; Klick auf Beleg → Sprung ins Archiv

### Biogramm

- Chronologische Gesamtsicht 1919–2009 als D3-Zeitstrahl
- Zwei Spuren: Orte (aus `store.mobilityEvents` nach Land) + Belege (alle Records mit Datum, leichter Jitter)
- Phasen-Quickselect: Jugend (≤1944) · Nachkriegs-Graz · Europäische Karriere · Lehrtätigkeit
- Vertikaler Signal-Rot-Marker für Flucht 1944
- Klick auf Beleg-Punkt → Detail-Panel, Sprung ins Archiv via CTA

### Netzwerk

Konzentrische Personen-Visualisierung um Malaniuk (E-93, Session 46; Session-47-Hygiene-Runde E-94). Antwortet auf die Forschungsfrage „Mit welchen Personen stand Malaniuk in Beziehung?". Tabelle-vor-Graph wurde hier bewusst verlassen — die vorherige Pivot-Tabelle zeigte nur ~13 AgRelOn-Partner und blendete die Wagner-Familie, Strauss, Mozart und 72 Multi-Record-Personen aus. Der Tab ist in vier Module gesplittet: [`_netzwerk-geometry.js`](../docs/js/views/_netzwerk-geometry.js) (pure Funktionen, 42 Unit-Tests), [`_netzwerk-sidebar.js`](../docs/js/views/_netzwerk-sidebar.js) (Filter-UI mit `state`/`actions`-Vertrag), [`_netzwerk-canvas.js`](../docs/js/views/_netzwerk-canvas.js) (SVG-Rendering + Hover + Zoom), [`netzwerk.js`](../docs/js/views/netzwerk.js) (Orchestrator, 484 Zeilen).

- **Zwei Ringe nach Evidenzstärke.** Malaniuk im Zentrum (KUG-Blau, r=38). Ring 1 (`R * 0.32`) = harte Beziehung: `entry.relations.length > 0` ODER (Wikidata-verknüpft UND `records.size ≥ 5`). Ring 2 (`R * 0.82`) = wiederkehrendes Umfeld: `records.size ≥ 2` ODER `entry.kategorie !== "Andere"`. Ring 3 (einmalige Nennungen) ist bewusst weggefiltert — reiner dekorativer Halo. Winkel alphabetisch pro Ring (sortKey nach normalisiertem Nachnamen), gleichverteilt über 2π, Start 12 Uhr. Positionen analytisch aus Sinus/Kosinus — keine Force-Simulation, Determinismus vor Schönheit ([design.md § Lektionen aus den entfernten Visualisierungen](design.md)).
- **Rolle als zweite Dimension über die Füllfarbe.** `derivePersonKategorie(entry)` leitet die Kategorie aus den tatsächlichen `entry.roles`-Sets ab (Prioritätsordnung Produktion > Bühne > Vermittlung > Korrespondenz > Presse > Erwähnt; nur „erwähnt"-Varianten ohne Sonst-Rolle → „Erwähnt"; Rest → „Andere"). Ersetzt die statische Namens-Keyword-Kategorie aus `normalize.js`, die nur ~70 der 305 Personen traf und den Rest stumm in „Andere" kippte. Farbpalette in `NETZWERK_KATEGORIEN` (Produktion violett, Bühne gold, Vermittlung grün, Korrespondenz braun, Presse oliv, Erwähnt hellgrau, Andere neutral).
- **Zwei Linientypen explizit unterschieden** (Session 46, nach Nutzertest). Gerade blaue Radial-Linien zum Zentrum = `agrelon:*`-Beziehungen, **explizit** in den Archiv-Metadaten annotiert (aus `store.agentRelations`). Geschwungene Bezier-Bänder zwischen Knoten = **Ko-Okkurrenz**, automatisch aus gemeinsamen Dokumenten abgeleitet (`computeCoOccurrence` enumeriert Paare pro Record und zählt, Threshold `minShared` steuerbar). Jede Linie trägt einen nativen SVG-`<title>`-Tooltip, der den *Grund* der Verbindung zeigt: für AgRelOn den deutschen Beziehungstyp (via `AGRELON_LABELS`), für Ko-Okkurrenz die Anzahl geteilter Dokumente. Beide Linientypen haben eigene Sichtbarkeits-Toggle in der Sidebar — der Unterschied war vorher im UI nicht lesbar und hat beim Test verwirrt.
- **Interaktion.** Klick pinnt den Highlight-Zustand (Knoten bekommt Kontur + Drop-Shadow, Nachbarn werden beschriftet, Rest gedimmt). Gepinnt ignoriert der View weitere Hover, bis der User ins Leere klickt oder denselben Knoten erneut klickt. Doppelklick-Zoom ist deaktiviert, damit der Pin-Flow nicht mit D3-Zoom kollidiert. Detail-Panel rechts (sticky, box-shadowed): Titel + Wikidata-Badge, Meta-Zeile (Kategorie · Dokumenten-Count · Ring · Evidenz-Typ), Beziehungs-Chips via `buildRoleChip({cluster: 'beziehung'})`, Rollen-Chips aus `entry.roles`, chronologische Belegliste. Klick auf Beleg → `navigateToView('bestand', {recordId})`.
- **Filter-Sidebar** (`.netzwerk__sidebar`, 300 px breit). Slider `Mind. Dokumente` und `Verkn. ab (gem. Dok.)`, vier Toggles (Ko-Okkurrenz-Linien / AgRelOn-Linien / Nur Wikidata / Nur AgRelOn-Personen), Zeitfenster-Block mit Von/Bis-Slider (baut einen Person-→-Jahres-Index aus Record-Daten auf und verbirgt Personen ohne Records im Zeitfenster), Kategorie-Chips als Multi-Select mit Live-Counts, Legende (immer ausgeklappt) mit expliziten Swatches für Ring 1 (solid), Ring 2 (dashed), gerade Linie (AgRelOn), geschwungene Linie (Ko-Okkurrenz), Wikidata-Stern. Filter ändern nur Opazität, nicht Position — der „groß anfangen, dann verdichten"-Flow funktioniert ohne Layout-Sprung. Coverage-Block prominent oben: `N Personen` + `X AgRelOn · Y Ko-Okk. · Ring 1: N₁ · Ring 2: N₂ · von total`.
- **Zoom + Pan** via `d3.zoom()`, ScaleExtent `[0.5, 4]`, Controls `+/−/⊙` oben links im Canvas. Labels bekommen einen weißen Text-Halo (`paint-order: stroke fill` + `stroke: var(--color-paper)` + `stroke-width: 3px`), damit sie im Kantenwirrwarr lesbar bleiben. Ring-1-Labels und Ring-2-Labels für Personen mit `records.size ≥ 3` sind permanent sichtbar, der Rest nur on-hover/pin/neighbour.
- **Telemetrie.** Log-Stempel `[netzwerk] total:N | ring1:N₁ | ring2:N₂ | agrelon:N` pro Render — die vier Zahlen lassen sich aus der Konsole und aus dem Playwright-Smoke lesen (stamp_expectation `["total", "ring1", "ring2", "agrelon"]`).

### Wissenskorb

- Bookmark-Icons in Bestand, Indizes-Detail und Archiv-Inline-Detail; `toggleKorb(id)` + `onKorbChange`-Callback für Re-Render
- Card pro Record: Mono-Signatur (Deep-Link auf `#bestand/...`) · Serif-Titel · Typ-Badge · Remove-Button · Meta-Zeile (Datum · Sprache · Umfang · Status) · funktionale Blöcke aus dem Inline-Detail-Muster (Produktion, Mitwirkende, Werk & Repertoire, Ort & Ereignis, Erwähnt, Weitere) plus eigene Blöcke Beziehungen (AgRelOn) und Finanzen
- Chips durch `buildRoleChip()` aus `archiv-inline-detail.js`; Provenance-Pille und Wikidata-Badge pro Chip; Klick springt in den passenden Index
- CSV: Spalten Signatur, Titel, Typ, Datierung, Konvolut, Personen (mit Rollen), Orte (inkl. STE-Events mit Datum), Werke (mit Komponist), Beziehungen (AgRelOn), Finanzen (Betrag + Währung + Rolle). UTF-8 BOM
- BibTeX: `@misc{SIG_sanitized, ...}`, Autor primär aus `verfasser:in`, Fallback auf `agrelon:HasCorrespondent`-Sender
- localStorage-Persistenz (Key `m3gim-korb`); Badge in der Tab-Bar zeigt die Anzahl

## DEV/Prod-Verhalten und Error Boundaries

- **DEV/Prod-Logging** über `viewLog()`, das auf GitHub Pages ein No-Op ist (E-50). Auf localhost zeigt `main.js` beim Seitenaufruf einen strukturierten Store-Report (Records, Konvolute, Phase-6-Maps, WD-Coverage pro Index, Provenance-Coverage) und setzt `window.m3gim` mit Debug-Helpern `window.m3gim.store`, `window.m3gim.inspect(recordId)`, `window.m3gim.finances()`, `window.m3gim.agentRelations()`, `window.m3gim.mobilityEvents()`, `window.m3gim.dftTree()` und `window.m3gim.provenanceOf(recordId)` (letzterer zeigt alle XLSX-Quellen eines Records + Nested Entities als Liste `{field, sheet, row, datenpunkt}`). Auf Produktion (dhcraft.org) bleibt alles stumm.
- **Error Boundaries** pro View: `main.js` fängt Render-Fehler pro Tab ab (sync und async, E-51).

## Erweiterung für den neuen Datenstand (umgesetzt)

Die freigegebene Modell-Erweiterung ([decisions.md](decisions.md) E-95 bis E-102) ist committet (007b8c2) und im Code live. Die Reihenfolge steuerte [plan.md](plan.md).

- **Vokabular-Kopplung in `constants.js`.** Die fünf Mobilitäts-Ortsrollen (`zielort`, `absendeort`, `abreiseort`, `empfangsort`, `vertragsort`) sind in `EVENT_ROLE_TO_MOBILITY_CLUSTER` auf den Cluster `korrespondenz` gemappt (E-110, order-m3gim Punkt 1, ratifiziert die zuvor offene `null`-Führung) — zielort/abreiseort = Reisemobilität, empfangsort = Korrespondenz, absendeort = beides, vertragsort = Mobilitäts-Ortsrolle derselben Spur, data.md § Ortsrollen/§ 10 folgend. Weitere vorgemerkte eventRoles (`aufnahme`, `generalprobe`, `empfang`) und Rollen (Crew, `publikum`/`abgebildet`) bleiben auskommentiert gerüstet, bis der tiefere Export sie mit Daten füllt. Dokumenttyp-Labels kommen nicht mehr aus einer Hand-Map, sondern über `dftLabel(store, id)` aus `store.dftHierarchy`. Die Leitplanke Vokabular-Kopplung (`test_25`/`test_15`) bleibt grün.
- **Loader.** Die datumslosen Mobilitäts-STEs setzen kein `atDate` voraus (`date: null`). Die Ablösung des `m3gim:hasPerformanceRole`-Artefakts durch `m3gim:StageRole`-Entitäten und n-äre `m3gim:Performance` (gelesen in `archive-inline-detail`) ist umgesetzt und über die neuen Store-Maps `store.stageRoles` + `store.performances` angebunden. Die neuen Record-Felder `dataQualityFlag`, `bearbeitungsnotiz` und `erstelldatum` liegen an den Record-Knoten. Vertagt: der `wohnort`-Zustand mit Gültigkeitsperiode sowie `contractStatus`/`realized` (E-99, keine Datendeckung); `qualityConfidence` wird bewusst nicht fabriziert.
- **Datums-Handling (offen).** `date-parser.js` gibt qualifizierte Datierungen heute roh aus; Anzeige und Jahres-Extraktion sind um die Qualifier (`circa:`/`vor:`/`nach:`) und das `DatedEvent`-Shape (`m3gim:hasDatedEvent`) noch zu erweitern.
- **Wirkung.** Die Mobilitäts-Strukturen tragen den sichtbaren Mobilitäts-Tab (E-111, D3-geo-Karte); die zurückgestellten Tabs Mobilitäts-Atlas, Repertoire und Biogramm bleiben damit ebenfalls tragfähig. Der Bühnenrollen-Block steht in [design.md](design.md). Eine UI-Anzeige für `dataQualityFlag` (und ein etwaiger Vertragsstatus) ist noch nicht umgesetzt — die Flags liegen vorerst nur in den Daten.

## Schnittstellenvertrag

| Thema | Kanonische Quelle |
|-------|------------------|
| Designhaltung, Designsystem, Lektionen aus den entfernten Visualisierungen | [design.md](design.md) |
| Datenmodell, Ontologie, Vokabulare | [data.md](data.md) |
| Pipeline, Datenfluss, Qualitätsbaseline | [pipeline.md](pipeline.md) |
| Testsuite, TDD-Workflow | [testing.md](testing.md) |
| Architekturentscheidungen | [decisions.md](decisions.md) |
| Operativer Stand, nächste Schritte | [plan.md](plan.md) |
| Forschungsrahmen | [research.md](research.md) |
