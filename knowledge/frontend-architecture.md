---
title: Frontend-Architektur
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.4
created: 2026-02-19
updated: 2026-08-21
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
related: [design, pipeline-architecture, data, architecture-decisions, specification]
---

# Frontend-Architektur

> Wie das Frontend technisch gebaut ist: Laufzeitmodell, Modulstruktur, Store und State, Routing, build-loses Deployment auf GitHub Pages, Datenfluss von JSON-LD in den Store sowie die Ansichten der einzelnen Tabs. Die Designhaltung, das Designsystem und die Lektionen aus den entfernten Visualisierungen stehen in [design.md](design.md). Die vormaligen D3-Visualisierungen (Mobilität, Matrix, Kosmos, Zeitfluss, Lebenspartitur, Lebensstationen) sind entfernt.

## Laufzeitmodell

- **Erfassung:** Google-Sheets-Exporte als XLSX → `data/google-spreadsheet/`
- **Verarbeitung:** Python-Skripte ([pipeline-architecture.md](pipeline-architecture.md)) → JSON/JSON-LD in `docs/data/`
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
| `ui/basket.js` | Wissenskorb (localStorage) |
| `views/archive-holdings.js` | Bestand-Tab: Konvolut-Hierarchie mit Meta-Chips (Top-3-Dokumenttyp + Status-Mix) direkt in der Zeile; Inline-Detail nur für Records, nicht mehr für Konvolute (E-82). Hierarchische Sortierung: Konvolute Signatur-stabil, Kinder innerhalb sortierbar (E-83). |
| `views/archive-timeline.js` | Mobilitäts-Chronik-Tab: scrollender Jahres-Zeitstrahl 1919-2009 mit Sicht-Akzent am Chip, kollabierbarem Dekaden×Sicht-Header (Aggregat→Quelle per Segment-Klick), Sekundär-Datierung undatierter Records und ehrlicher Deckungs-Caption (E-124) |
| `views/chronik-data.js` | Reine Datenschicht der Chronik (kein DOM/d3): `sichtForRecord` (dominante Sicht aus STEs), `secondaryYearForRecord` (Sekundär-Datierung), `aggregateDecadeStacks` (Dekaden×Sicht) |
| `views/archive-inline-detail.js` | Record-Detail mit den funktionalen Blöcken Produktion · Mitwirkende · Werk & Repertoire · Ort & Ereignis · Erwähnt, AgRelOn-Dedup (liest `rel.objectName`/`rel.objectWikidata`, nicht das rohe JSON-LD), Sprach-Label-Auflösung, `buildRoleChip()` als geteilter Helper |
| `views/_archive-toolbar.js` | Geteilte Toolbar (Suche, Dokumenttyp-Filter, Person-Filter, Count-Anzeige) für Bestand + Chronik |
| `views/indexes.js` | Grid-Explorer über Personen, Organisationen, Orte und Werke mit Beziehungsbadges (AgRelOn), nur Einträge mit `records.size > 0` |
| `views/mobility.js` | Karten-Tab (sichtbar, **entitätszentriert seit E-126**): man wählt eine Entität (Organisation/Person) und sieht ihre Orte als Knoten, je Ort ein Tortendiagramm nach Mobilitätssicht. **Keine** Verbindungslinien (die Trajektorie aus E-111 entfiel). Datenschicht `views/entity-map-data.js` zieht die Orte aus Record-Orten (`rico:hasOrHadLocation`) + STE zusammen und vergibt Verortungs-Stufen (`secured`/`city`/`far`/`unlocatable`, Adressen auf die Stadt hochgerollt). Sidebar: Entitäts-Auswahl, Zeitraum, Farb- und Verortungs-Legende, Klick-Detail (Zuordnungen + alle Dokumente). Basemap lokal: Ozean (SVG-Hintergrund) + Gradnetz, Ländergeometrie `docs/data/geo/countries-110m.geo.json` (Natural Earth 110m), kein Kartenserver, kein Leaflet. |
| `views/mobility-atlas.js` | Leaflet-Karte + D3-Zeitstrahl + Detailpanel (Tab `mobilitaets-atlas` aktuell `hidden`, E-81; durch `views/mobility.js` (E-111) überholt, Stilllegung operator-offen; Leaflet ist nicht in `index.html` eingebunden und bei einer Reaktivierung wieder einzubinden) |
| `views/repertoire.js` | Parallele Aggregat-Tabellen Werke × Komponisten (Tab aktuell `hidden`, E-81) |
| `views/biogram.js` | Chronologischer D3-Zeitstrahl 1919–2009 (Tab aktuell `hidden`, E-81) |
| `views/network.js` | Orchestrator des Netzwerk-Tabs (E-93, E-94): State-Eigentum, `draw`, Filter-Anwendung, Detail-Panel, Telemetrie, Zeitfenster-Index. Delegiert Sidebar an `_network-sidebar.js` und Canvas-Rendering an `_network-canvas.js`. Im Session-47-Split deutlich verschlankt. |
| `views/_network-geometry.js` | Reine Layout-Funktionen für den Netzwerk-Tab (E-93): `computeLayout`, `computeCoOccurrence`, `classifyRing`, `nodeColor`, `derivePersonKategorie`, `labelGeometry`. Keine DOM-/D3-Aufrufe, deterministisch, mit Node-Unit-Tests abgedeckt (E-94). |
| `views/_network-sidebar.js` | Sidebar-UI des Netzwerk-Tabs (E-94): Suche, Filter-Slider, Toggles (Ko-Okkurrenz + AgRelOn getrennt), Zeitfenster, Kategorie-Chips, Legende, Reset. Reine UI-Produktion mit `state`/`actions`-Vertrag — keine direkte State-Mutation. |
| `views/_network-canvas.js` | SVG-Rendering, Zoom/Pan, Hover-/Highlight-Logik des Netzwerk-Tabs (E-94): `drawCanvas`, `renderZoomControls`, `applyHighlight` (Knoten-Nachbarschaft), `applyEdgeHighlight` (einzelne Kante + Endpunkte). Kommuniziert mit dem Orchestrator nur ueber `zoomRefs` (wird mutiert) und `actions = {getSelected, setSelected}`. |
| `views/basket.js` | Korb-Cards mit `buildRoleChip()` + funktionale Blöcke (Produktion · Mitwirkende · Werk & Repertoire · Ort & Ereignis · Erwähnt · Weitere · Beziehungen · Finanzen), CSV- + BibTeX-Export inkl. AgRelOn + Finanzen |
| `utils/format.js`, `utils/dom.js`, `utils/date-parser.js`, `utils/normalize.js` | Formatierungshilfen, DOM-Helper, Datumsparser, Namensnormalisierung |

`data/aggregator.js` und `utils/viz-components.js` wurden Session 32 mit den D3-Prototypen entfernt.

CSS-Dateien unter `docs/css/`: `variables`, `base`, `components`, `archiv`, `indizes`, `korb`, `mobility`, `mobility-atlas`, `repertoire`, `biogramm`, `netzwerk`, `pages`. Design-Tokens (Farben, Spacing, Text-Sizes, Transitions) zentral in `variables.css`; alle Tab-CSS nutzen diese Tokens (Session 34).

### Info-Seiten (statisches HTML)

Content-Seiten (`about.html`, `projekt.html`, `datenmodell.html`, `impressum.html`); `datenmodell.html` wird von `scripts/build-model-page.py` aus dem Vokabular erzeugt und nie von Hand geschrieben. Einheitliches Template: `info-header`, `info-nav`, `info-main`, `info-footer`. Lesebreite 720px, Source Serif 4 für Titel.

## Routing

- Hash-basiert in `ui/router.js`. Der Katalog `TABS` listet alle registrierten Tabs (Bestand, Chronik, Statistik, Indizes, Karte, Netzwerk, Verknüpfungen, Korb). Verborgene Tabs gibt es seit E-140 nicht mehr; jeder registrierte Tab ist sichtbar.
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
  recordToPerformances: Map<recordId, Performance-Node[]>,  // traegt den engen Schaerfegrad mit
}
```

Alle Tabs lesen direkt aus `m3gim.jsonld` (über Store). Vorverdichtete View-JSONs gibt es seit E-140 nicht mehr.

### Phase-6-Store-Maps im Überblick

| Store-Map | Quelle im JSON-LD | Verwendung |
|---|---|---|
| `store.dftHierarchy` | Top-Level `skos:Concept`-Knoten + `skos:broader` | Hierarchischer Dokumenttyp-Filter im Archiv |
| `store.mobilityEvents` + `store.recordToEvents` | `m3gim-ontology:Annotation`-Knoten + `m3gim-ontology:hasAnnotation`-Refs; seit Session 33 inkl. `placeLat`/`placeLon`/`placeCountry` aus dem Koordinaten-Patch | Mobilitäts-Atlas, Biogramm-Orte-Spur, Archiv-Inline-Detail Ort-&-Ereignis-Block |
| `store.agentRelations` | `m3gim-ontology:hasAgentRelation`-Array am Record | Archiv-Inline-Detail Beziehungen-Block, Indizes-Personen-Beziehungsbadges, Netzwerk-Tab |
| `store.finances` | `m3gim-ontology:hasDetail`-DetailAnnotations mit `monetaryAmount` + `currency` + `detailRole` | Archiv-Inline-Detail Finanzen-Block |
| `store.stageRoles` | `m3gim-ontology:StageRole`-Knoten (`rico:name`) | Bühnenrollen-Auflösung im Archiv-Inline-Detail (E-96/E-98) |
| `store.performances` | `m3gim-ontology:Performance`-Knoten (n-äre Aufführung mit `m3gim-ontology:hasStageRole`-Ref) | Archiv-Inline-Detail Werk-&-Repertoire-Block |

Die Invarianten werden als Kontrakttests in [test_06_frontend_contract.py](../tests/test_06_frontend_contract.py) durchgängig geprüft. Provenance (`agrelon:metadataProvenance`) wird nicht als eigene Store-Map indexiert, sondern am Record mitgeführt.

**Wichtiger Formatbruch:** `store.agentRelations`, `mobilityEvents` und `finances` transformieren das rohe JSON-LD in ein flaches Lookup-Format (z. B. `objectName`/`objectWikidata` statt des verschachtelten `agrelon:hasObject`). Consumer dürfen nicht die JSON-LD-Keys lesen — das führte Session 35 zu einem stillen Dedup-Bug (Malaniuk doppelt sichtbar). JSDoc-Shapes für `RelationEntry`, `MobilityEvent`, `FinanceEntry`, `DftConcept` sind direkt oberhalb von `buildStore()` in `loader.js` annotiert.

## Ansichten

### Bestand und Chronik (seit Session 35 eigenständige Tabs)

- Bestand und Chronik sind eigene Top-Level-Tabs (früher Archiv-Sub-Toggle), nutzen eine geteilte Toolbar (`_archive-toolbar.js`).
- **Leitprinzip „nur bearbeitet" als Default, umschaltbar (E-116):** Standardmäßig rendern Konvolute ohne erschlossene Folios, Records ohne Verknüpfungen und Folios mit 0 Links nicht. Der Bestand-Toggle „Nicht erschlossene einblenden" (`zeigeUnerschlossen`, Facet-Kind `toggle`) schaltet den „alle"-Modus frei: dann erscheinen auch die nicht erschlossenen Records und Konvolute, in `getOrderedItems(showAll)` durchgereicht und in `renderRows` über `.archiv-row--unerschlossen` ausgegraut plus Badge „nicht erschlossen" markiert. So sind alle Daten erreichbar, ohne den Erschließungsstand zu kaschieren (Zielbild Linie 3): das Form-ist-Signal-Prinzip wird nicht aufgegeben, sondern als sichtbare Markierung statt als Ausblendung umgesetzt. Folios (reine Metadaten-Records) bleiben in beiden Modi raus. Plakate + Tonträger sind davon unabhängig pauschal ausgeblendet (`EXCLUDED_DFT`, Forschungsscope laut `interface-konzept.md`, nicht Teil des Toggles); die Chronik filtert weiterhin ausschließlich über `unprocessedIds` ohne Toggle, weil der lokale DFT-Ausschluss 0 Matches liefert — Session 36. Log-Stempel-Keys ergänzt um `erschliessung` (erschlossen|alle) und `nicht-erschlossen`.
- **Counter-Tooltip** erklärt „bearbeitet" direkt am `archiv-count`-Span (Schicht 1 + 2 erschlossen, Plakate/Tonträger ausgeblendet, Verweis auf `quality-snapshot.md` für Gesamtzahlen).
- **Mobilitäts-Chronik als Scroll-Zeitstrahl** (E-88/E-124, seit Session 41): jedes Jahr 1919-2009 (+ Ausreisser) rendert eine Zeile mit Jahres-Label links, dichte-adaptivem Dot und Record-Chips rechts; leere Jahre bleiben sichtbar (dichte-adaptiv E-92: Nicht-Dekaden-Jahre als 6-px-Linie, Dekaden-Jahre als Anker), Lückenstruktur als Rhythmus lesbar. **E-124-Reframe zur Mobilitäts-Chronik:** ein linker **Sicht-Akzent** am Chip (`SICHT_COLOR`, geteilt mit Karte/Statistik; kein STE → monochrom = „keine Sicht erschlossen", divergierende Records → Mehrfach-Verlauf); ein kollabierbarer **Dekaden×Sicht-Header**, dessen Segment-Klick genau die belegenden Chips hervorhebt (`chronik-point--hit`/`--dim`) und so das Aggregat auf seine Einzelquellen auflöst (Vorgabe „kein Aggregat ohne Quellen-Rückführung"); **undatierte ehrlich gespalten** — sekundär-datierte Records (typisiertes Feld oder `STE.atDate`) wandern markiert (gestrichelt + `≈`-Badge) in ihre Jahreszeile, echt-undatierte bleiben im Endblock mit Sicht-Mini-Stapel als Kopf; **Achsenkopf-Caption** „N von M datiert (davon K sekundär), L undatiert · S mit Sicht" plus Hinweis „Dichte zeigt den Erschließungsstand, nicht die Aktivität". Reine Datenschicht `chronik-data.js`. Log-Stempel: `records, jahre-belegt, datiert, sekundaer, undatiert, sicht-gedeckt, spanne, gefiltert`.
- **Mobilitätssichten als Chip-Farbfamilie** (Session 36, M3): die Sichten aus [data-model.md § 10](data.md) (performativ, institutionell, korrespondenz, diskursiv, biografisch) sind im Frontend über `EVENT_ROLE_TO_MOBILITY_CLUSTER` in `docs/js/data/constants.js` einem `m3gim-ontology:role` zugeordnet. CSS-Tokens `--color-sicht-performativ|institutionell|korrespondenz|diskursiv|biografisch` in `variables.css`, Chip-Modifier `.chip--mobility-*` in `archiv.css`. Seit E-124 als linker Sicht-Akzent an den Chronik-Chips getragen (`sichtForRecord`). Ungeklärte Rollen (`auftrag`, `entstehung`, finanzielles `ueberweisung`) stehen explizit auf `null` — keine stillschweigende Einordnung. Abgesichert in `tests/test_25_chronik_mobility_cluster.py`.
- **DEV-only Log-Stempel** (Session 36, M3.5): der Stempel pro Tab-Render geht durch `logStamp(viewName, parts)` aus `docs/js/utils/env.js`. `IS_DEV` prüft `localhost`/`127.0.0.1`. Auf `dhcraft.org` bleibt die Konsole stumm, lokal und im Playwright-Smoke erscheint der kompakte State pro Render mit fester Key-Reihenfolge.
- **Konvolut-Meta-Chips direkt in der Zeile** (E-82): Top-3-Dokumenttyp-Chips + Status-Mix (abgeschlossen/begonnen/zurückgestellt) unter dem Konvolut-Titel. Click auf Konvolut-Zeile = Auf/Zuklappen, kein Inline-Detail.
- **Hierarchische Sortierung** (E-83): Konvolute bleiben Signatur-sortiert, Kinder werden *innerhalb* ihres Konvoluts nach dem gewählten Sort-Key sortiert. Bei aktivem Filter flach (Hierarchie dann aufgelöst).
- Titel-Dedup: Folios mit identischem Titel wie Konvolut zeigen leere Titel-Zelle (semantisches Rauschen vermeiden).
- Klickbare Spaltenheader, Autocomplete-Combobox für Personenfilter, Suche über Signatur/Titel/Dokumenttyp/Datum.
- **Inline-Detail für Records:** funktionale Blöcke Produktion · Mitwirkende · Werk & Repertoire · Ort & Ereignis · Erwähnt. Agents mit AgRelOn-Äquivalent werden aus „Mitwirkende" unterdrückt (Dedup-Filter liest das *flache* Loader-Format). Sprach-Kürzel (`en, fr`) werden über `formatLanguage()` zu lesbaren Labels aufgelöst. Alle Chips via `buildRoleChip()` mit Cluster-Farbe + Provenance-Pille.
- Bookmark-Icons an jeder Record-Zeile (toggeln in `store.korb`, Klick auf Tab öffnet den Wissenskorb).
- Reset-Button setzt alle Filter gleichzeitig zurück.

### Statistik

- Interaktives **Master-Detail-Dashboard** mit Mobilität als Rückgrat (Showroom-Ursprung E-89/E-92, Dashboard E-122, Mobilitäts-Reframing E-123). Geteilte Sidebar-Shell (`viewShell`/`createSidebar`): links ein Single-Select über genau eine Ansicht in den Gruppen **Mobilität** (Wohin & Wann · Art der Mobilität · Mit wem) und **Werk & Bestand** (Repertoire · Personen · Dokumenttypen · Finanzen) plus die Filter; rechts rendert die gewählte Ansicht über die volle Breite. Datenschicht getrennt: Aggregate, Sichten-Konstanten und Filter in `docs/js/views/statistics-data.js` (rein), `statistics.js` ist View-Orchestrierung + DOM-Rendering.
- **Multi-Facetten-Filter:** ein record-basierter **Zeitraum**-Filter plus, nur bei event-getriebenen Ansichten, **Sicht-** und **Land**-Facetten (Mehrfachauswahl). `filterStore(store, {lo, hi, sichten, laender})` schneidet zuerst die Record-Menge aufs Jahresfenster (Sub-Store: `mobilityEvents` über `recordId`, `agentRelations`/`finances` über Map-Key, `persons`/`works` über `records`-Set), dann prunen Sicht/Land nur `mobilityEvents` (Event-, keine Record-Facetten). Leeres Set = nichts, `null` = alles. Die Status-Zeile beziffert Zeitschnitt, ausgeblendete undatierte Records (Erschließungsspiegel, E-87) und aktive Facetten und benennt, dass Sicht/Land Ereignisse schneiden, nicht Dokumente. `rebuild()` per `requestAnimationFrame` gedrosselt; bei View-Wechsel wird die Sidebar neu gebaut (Facetten-Kontext).
- **Ansichten** (alle aus dem Live-Store): **Wohin & Wann** (Jahrzehnt×Sicht als Stapelbalken `buildStackedBars` + Länder-Reichweite aus `placeCountry` + Top-Orte mit Wikidata-Link/Bestand-Drilldown, ehrliche Deckungs-Captions) · **Art der Mobilität** (die Sichten performativ, institutionell, korrespondenz, diskursiv, biografisch + feine `eventRole`-Aufschlüsselung, die `gastspiel`/`aufführung`/`spielzeit` sichtbar macht; Caption zur fehlenden Ensemble-Erfassung) · **Mit wem** (AgRelOn-Typ-Donut, dessen Klick die benannten **Partner** nach Typ filtert) · **Repertoire** (Top-Komponisten) · **Personen** (Rollen-Census des Bestands aus dem `roles`-Set) · **Dokumenttypen** (Long-Tail-Bar Top-12 + „Sonstige“ + „ohne Typ“, Drilldown E-121) · **Finanzen** (Währungen als Donut + Detail-Rollen; Beträge nie summiert, Artefakte als „unklar“-Gruppe, QF-14). Farbe kategorial nur für die Sichten (`SICHT_COLOR`, geteilt mit der Karte), sonst monochrom/sequenziell (`blueShade`), Donut gedämpfte `DONUT_PALETTE`, wiederkehrende Orte via `ortColor` (E-120).
- Tech-Reporting (Bearbeitungsstand-Balken, Wikidata-Abdeckung pro Entitätstyp, Provenienz-Anteil, Low-Confidence-Policy) wurde aus der Statistik entfernt und lebt im Markdown-Report `data/reports/quality-snapshot.md`. Die Statistik zeigt, was die Daten *sind*, nicht wie vollständig sie sind.
- D3 v7 global via CDN; DOM-Primitive im View-Modul: `buildDonut(data, {size, ariaLabel})` (kategorische Anteile, Hover-Verkettung Segment/Legende, optional klickbare Segmente für Drilldown), `buildHorizontalBars(rows)`, `buildStackedBars(rows, segMeta)` (gestapelt nach Sicht). `buildDonut` fällt bei CDN-Ausfall/leeren Daten auf `buildHorizontalBars` zurück.
- Pure Datenschicht `statistics-data.js` (kein DOM/d3) exportiert `facetInventory`, `filterStore` und die Aggregate (`aggregateSichten`, `aggregateEventRoles`, `aggregateDecadesBySicht`, `aggregatePlaces`, `aggregateCountries`, `aggregateDocTypes`, `aggregateAgentRelations`, `aggregateRelationPartners`, `aggregatePersonRollen`, `aggregateComposers`, `aggregateFinances`); sie laufen auf dem gefilterten Sub-Store, ohne den Filter zu kennen.
- Log-Stempel `[statistik] records:N | events:N | personen:N | ansichten:N | aktiv:<id> | spanne:Y-Y | undatiert:N | sicht:<n|alle> | land:<n|alle>` (E-123; ersetzt die E-122-Keys `panels`/`sichtbar`/`doctypes`/`orte`/`relationen`/`komponisten`/`finanzen`). `stamp_expectations['statistik']` prüft `records/events/personen/ansichten/aktiv`.

### Indizes

- Grid-Blöcke Personen, Organisationen, Orte und Werke, parallel sichtbar im 2×2-Layout
- **Globale Toolbar** (E-91, seit Session 44): nutzt `buildToolbar` aus [`_toolbar.js`](../docs/js/views/_toolbar.js) mit den Facetten Such-Input (`q`, filtert alle Grids gleichzeitig über `config.searchFields`) und Toggle `Nur mit Wikidata` (filtert Entries ohne Q-ID aus). Per-Grid-Suche entfällt.
- **Cross-Grid-Facettensuche**: Klick auf Index-Eintrag setzt `activeFilter = { gridKey, name, recordIds }` und filtert die übrigen Grids auf Record-Overlap. Sichtbar als Chip unter der Toolbar, X-Button setzt zurück. Zweite Filterebene neben der Toolbar, unabhängig.
- Detail-Expansion pro Eintrag begrenzt + „Alle im Archiv"-Link
- Wikidata-Icons bei Einträgen mit Q-ID
- **Subtitles** aus WD-Enrichment: `Beruf · Stimmfach · Lebensdaten` unter Personennamen (E-61)
- **Beziehungsbadges an Personen** (Session 32): Loader-Pass 2.5 resolviert AgRelOn-Relationen rückwärts auf Personen-Einträge; `renderNameCell()` zeigt eine dritte Zeile `idx-relations` mit Chips (Match primär Q-ID, sekundär `normalizePerson(name)`).

### Mobilität

- Entitätszentrierte D3-geo-Karte über die volle Breite (E-126, sichtbarer Tab `karte`). Projektion `geoMercator.fitExtent` auf die europäischen Punkte, lokale Ländergeometrie `docs/data/geo/countries-110m.geo.json` (Natural Earth 110m), kein Tile-Server, kein API-Key, kein Leaflet; Basemap-Ebenen Ozean (SVG-Hintergrund) + Gradnetz (`d3.geoGraticule`)
- Auswahl einer Entität (Organisation/Person) in der Sidebar; ihre Orte werden aus Record-Orten (`rico:hasOrHadLocation`) + STE zusammengezogen (`views/entity-map-data.js`). Default = alle Orte des Bestands
- Orte als Knoten, je Ort ein Tortendiagramm nach Mobilitätssicht (`mobilityClusterFor`/`EVENT_ROLE_TO_MOBILITY_CLUSTER`, E-110; Farben aus `SICHT_COLOR`), Knotengröße nach Belegzahl im Zeitfenster
- **Keine Verbindungslinien** — die biografische Trajektorie aus E-111 (gerichtete Pfeile, Zeitregler) ist entfernt; die räumliche Verteilung einer Entität ist die Aussage, nicht der Weg
- Verortungs-Sicherheit visuell kodiert (Ring-Stil + Legende): `secured` durchgezogen, `city` (Adresse auf die Stadtkoordinate hochgerollt) gestrichelt, `far` (Fehlmatch-Verdacht AF-01, [data-errors.md](data-errors.md)) gestrichelt-warnfarben, `unlocatable` als eingeklappte Liste statt Kartenpunkt
- Hover-Tooltip (Proportionsbalken) und Klick-Detail (Zuordnungen nach Sicht + alle verknüpften Dokumente); Zoom und Pan per `d3.zoom`, `non-scaling-stroke` hält Linien und Ringe beim Zoomen konstant (E-114-Erbe)

### Netzwerk

Konzentrische Personen-Visualisierung um Malaniuk (E-93, Session 46; Session-47-Hygiene-Runde E-94). Antwortet auf die Forschungsfrage „Mit welchen Personen stand Malaniuk in Beziehung?". Tabelle-vor-Graph wurde hier bewusst verlassen — die vorherige Pivot-Tabelle zeigte nur die wenigen explizit annotierten AgRelOn-Partner und blendete die Wagner-Familie, Strauss, Mozart und die übrigen Multi-Record-Personen aus. Der Tab ist in die Module [`_network-geometry.js`](../docs/js/views/_network-geometry.js) (pure Funktionen, mit Unit-Tests), [`_network-sidebar.js`](../docs/js/views/_network-sidebar.js) (Filter-UI mit `state`/`actions`-Vertrag), [`_network-canvas.js`](../docs/js/views/_network-canvas.js) (SVG-Rendering + Hover + Zoom) und [`network.js`](../docs/js/views/network.js) (Orchestrator) gesplittet.

- **Ringe nach Evidenzstärke.** Malaniuk im Zentrum (KUG-Blau, r=38). Ring 1 (`R * 0.32`) = harte Beziehung: `entry.relations.length > 0` ODER (Wikidata-verknüpft UND `records.size ≥ 5`). Ring 2 (`R * 0.82`) = wiederkehrendes Umfeld: `records.size ≥ 2` ODER `entry.kategorie !== "Andere"`. Ring 3 (einmalige Nennungen) ist bewusst weggefiltert — reiner dekorativer Halo. Winkel alphabetisch pro Ring (sortKey nach normalisiertem Nachnamen), gleichverteilt über 2π, Start 12 Uhr. Positionen analytisch aus Sinus/Kosinus — keine Force-Simulation, Determinismus vor Schönheit ([design.md § Lektionen aus den entfernten Visualisierungen](design.md)).
- **Rolle als zweite Dimension über die Füllfarbe.** `derivePersonKategorie(entry)` leitet die Kategorie aus den tatsächlichen `entry.roles`-Sets ab (Prioritätsordnung Produktion > Bühne > Vermittlung > Korrespondenz > Presse > Erwähnt; nur „erwähnt"-Varianten ohne Sonst-Rolle → „Erwähnt"; Rest → „Andere"). Ersetzt die statische Namens-Keyword-Kategorie aus `normalize.js`, die nur einen kleinen Teil der Personen traf und den Rest stumm in „Andere" kippte. Farbpalette in `NETZWERK_KATEGORIEN` (Produktion violett, Bühne gold, Vermittlung grün, Korrespondenz braun, Presse oliv, Erwähnt hellgrau, Andere neutral).
- **Linientypen explizit unterschieden** (Session 46, nach Nutzertest). Gerade blaue Radial-Linien zum Zentrum = `agrelon:*`-Beziehungen, **explizit** in den Archiv-Metadaten annotiert (aus `store.agentRelations`). Geschwungene Bezier-Bänder zwischen Knoten = **Ko-Okkurrenz**, automatisch aus gemeinsamen Dokumenten abgeleitet (`computeCoOccurrence` enumeriert Paare pro Record und zählt, Threshold `minShared` steuerbar). Jede Linie trägt einen nativen SVG-`<title>`-Tooltip, der den *Grund* der Verbindung zeigt: für AgRelOn den deutschen Beziehungstyp (via `AGRELON_LABELS`), für Ko-Okkurrenz die Anzahl geteilter Dokumente. Beide Linientypen haben eigene Sichtbarkeits-Toggle in der Sidebar — der Unterschied war vorher im UI nicht lesbar und hat beim Test verwirrt.
- **Interaktion.** Klick pinnt den Highlight-Zustand (Knoten bekommt Kontur + Drop-Shadow, Nachbarn werden beschriftet, Rest gedimmt). Gepinnt ignoriert der View weitere Hover, bis der User ins Leere klickt oder denselben Knoten erneut klickt. Doppelklick-Zoom ist deaktiviert, damit der Pin-Flow nicht mit D3-Zoom kollidiert. Detail-Panel rechts (sticky, box-shadowed): Titel + Wikidata-Badge, Meta-Zeile (Kategorie · Dokumenten-Count · Ring · Evidenz-Typ), Beziehungs-Chips via `buildRoleChip({cluster: 'beziehung'})`, Rollen-Chips aus `entry.roles`, chronologische Belegliste. Klick auf Beleg → `navigateToView('bestand', {recordId})`.
- **Filter-Sidebar** (`.netzwerk__sidebar`, 300 px breit). Slider `Mind. Dokumente` und `Verkn. ab (gem. Dok.)`, Toggles (Ko-Okkurrenz-Linien / AgRelOn-Linien / Nur Wikidata / Nur AgRelOn-Personen), Zeitfenster-Block mit Von/Bis-Slider (baut einen Person-→-Jahres-Index aus Record-Daten auf und verbirgt Personen ohne Records im Zeitfenster), Kategorie-Chips als Multi-Select mit Live-Counts, Legende (immer ausgeklappt) mit expliziten Swatches für Ring 1 (solid), Ring 2 (dashed), gerade Linie (AgRelOn), geschwungene Linie (Ko-Okkurrenz), Wikidata-Stern. Filter ändern nur Opazität, nicht Position — der „groß anfangen, dann verdichten"-Flow funktioniert ohne Layout-Sprung. Coverage-Block prominent oben: `N Personen` + `X AgRelOn · Y Ko-Okk. · Ring 1: N₁ · Ring 2: N₂ · von total`.
- **Zoom + Pan** via `d3.zoom()`, ScaleExtent `[0.5, 4]`, Controls `+/−/⊙` oben links im Canvas. Labels bekommen einen weißen Text-Halo (`paint-order: stroke fill` + `stroke: var(--color-paper)` + `stroke-width: 3px`), damit sie im Kantenwirrwarr lesbar bleiben. Ring-1-Labels und Ring-2-Labels für Personen mit `records.size ≥ 3` sind permanent sichtbar, der Rest nur on-hover/pin/neighbour.
- **Telemetrie.** Log-Stempel `[netzwerk] total:N | ring1:N₁ | ring2:N₂ | agrelon:N` pro Render — die Zähler lassen sich aus der Konsole und aus dem Playwright-Smoke lesen (stamp_expectation `["total", "ring1", "ring2", "agrelon"]`).

### Verknüpfungen

Heterogener (multivariater) Graph über Person, Ort, Werk und Institution um eine Fokus-Entität, gebaut am 2026-06-23 als Milestone M3 der Partner-Runde Juni und im selben Zug an den geteilten Filter gekoppelt (M4). Der Tab beantwortet „Malaniuk 1952 in Bayreuth, welche Werke, wer war beteiligt" als generalisierten, filterbaren Schnitt, womit Bayreuth ein Filterergebnis wird und kein eigener Bereich ([architecture-decisions.md](architecture-decisions.md), Bayreuth als filterbarer Schnitt). Der Tab ist in [`_verknuepfungen-geometry.js`](../docs/js/views/_verknuepfungen-geometry.js) (Graphaufbau und Layout als reine Funktionen, unit-getestet über `tests/frontend/verknuepfungen-geometry.test.mjs`) und [`verknuepfungen.js`](../docs/js/views/verknuepfungen.js) (Controls, SVG-Rendering, Detail-Panel) gesplittet.

- **Zwei Schärfegrade, sichtbar getrennt.** `weit` heißt im selben Dokument genannt, also Ko-Okkurrenz und ausdrücklich kein Auftrittsnachweis; `eng` schränkt auf die Records ein, die ein `m3gim-ontology:Annotation` oder eine `m3gim-ontology:Performance` tragen. Die Caption über dem Graph nennt im weiten Modus, wie viele der Dokumente im Fokus einen raumzeitlichen oder Aufführungs-Beleg tragen, und im engen Modus, wie viele Records von der weiten Menge übrig bleiben. Die Differenz wird damit benannt und bleibt ungeglättet.
- **Geteilt gegen lokal.** Der View abonniert `subscribe` beim Render und zeichnet auf eine externe Filteränderung neu, wobei die Controls aus dem geteilten State nachgezogen werden. Geprüft ist die Aufteilung in der Browser-Verifikation vom 2026-06-23.
  - Schärfegrad weit/eng: schaltet den Record-Satz um, Differenz wird benannt (recordsEng/recordsWeit).
  - Ort- und Zeitfenster-Facetten: geteilter Filter-State (`filter-state.js`), wirken auf den Graph.
  - Knotentyp-Toggles: jeder Typ einzeln abschaltbar (wörtliche Partnervorgabe).
  - Fokus-Wechsel (Person/Ort): lokaler View-State.
  - Knoten-Klick: Detail-Panel mit datengetriebenen Chips (kein redaktionelles Deuten).
- **Determinismus.** Positionen aus reinen Funktionen in `_verknuepfungen-geometry.js` (unit-getestet), keine Force-Simulation. Vier Typ-Sektoren aus festen Winkeln, zwei Ringe gegen Gedränge, Knotenradius aus der Zahl der geteilten Dokumente.
- **Kappung wird ausgewiesen.** Je Knotentyp rendert der Graph nur die stärksten Nachbarn (`TOP_N`); die Caption nennt pro Typ, wie viele Knoten dabei weggefallen sind, statt die Kappung stumm zu lassen.
- **Detail-Panel.** Die Chips folgen dem Rolle-Prefix-Muster und ziehen ihre Werte aus `nodeMeta`, je Typ die datengedeckten Felder (Institution Sitz und Kontakt, Person Lebensspanne und Stimmfach, Werk Partie und Komponist, dazu die Rollen). Die Partie kommt aus der kuratierten Werkindex-Spalte `rolle/stimme`, die die Pipeline vor M1 fallen ließ.
- **Telemetrie.** Log-Stempel `[verknuepfungen]` pro Render mit Fokus, Schärfegrad, Ort, Zeitfenster, Knotenzahl je Typ, `recordsWeit`, `recordsEng` und der Kappungssumme.

### Wissenskorb

- Bookmark-Icons in Bestand, Indizes-Detail und Archiv-Inline-Detail; `toggleKorb(id)` + `onKorbChange`-Callback für Re-Render
- Card pro Record: Mono-Signatur (Deep-Link auf `#bestand/...`) · Serif-Titel · Typ-Badge · Remove-Button · Meta-Zeile (Datum · Sprache · Umfang · Status) · funktionale Blöcke aus dem Inline-Detail-Muster (Produktion, Mitwirkende, Werk & Repertoire, Ort & Ereignis, Erwähnt, Weitere) plus eigene Blöcke Beziehungen (AgRelOn) und Finanzen
- Chips durch `buildRoleChip()` aus `archive-inline-detail.js`; Provenance-Pille und Wikidata-Badge pro Chip; Klick springt in den passenden Index
- CSV: Spalten Signatur, Titel, Typ, Datierung, Konvolut, Personen (mit Rollen), Orte (inkl. STE-Events mit Datum), Werke (mit Komponist), Beziehungen (AgRelOn), Finanzen (Betrag + Währung + Rolle). UTF-8 BOM
- BibTeX: `@misc{SIG_sanitized, ...}`, Autor primär aus `verfasser:in`, Fallback auf `agrelon:HasCorrespondent`-Sender
- localStorage-Persistenz (Key `m3gim-korb`); Badge in der Tab-Bar zeigt die Anzahl

## DEV/Prod-Verhalten und Error Boundaries

- **DEV/Prod-Logging** über `viewLog()`, das auf GitHub Pages ein No-Op ist (E-50). Auf localhost zeigt `main.js` beim Seitenaufruf einen strukturierten Store-Report (Records, Konvolute, Phase-6-Maps, WD-Coverage pro Index, Provenance-Coverage) und setzt `window.m3gim` mit Debug-Helpern `window.m3gim.store`, `window.m3gim.inspect(recordId)`, `window.m3gim.finances()`, `window.m3gim.agentRelations()`, `window.m3gim.mobilityEvents()`, `window.m3gim.dftTree()` und `window.m3gim.provenanceOf(recordId)` (letzterer zeigt alle XLSX-Quellen eines Records + Nested Entities als Liste `{field, sheet, row, datenpunkt}`). Auf Produktion (dhcraft.org) bleibt alles stumm.
- **Error Boundaries** pro View: `main.js` fängt Render-Fehler pro Tab ab (sync und async, E-51).

## Erweiterung für den neuen Datenstand (umgesetzt)

Die freigegebene Modell-Erweiterung ([architecture-decisions.md](architecture-decisions.md) E-95 bis E-102) ist committet (007b8c2) und im Code live. Die Reihenfolge steuerte der damalige Plan.

- **Vokabular-Kopplung in `constants.js`.** Die Mobilitäts-Ortsrollen (`zielort`, `absendeort`, `abreiseort`, `empfangsort`, `vertragsort`) sind in `EVENT_ROLE_TO_MOBILITY_CLUSTER` auf den Cluster `korrespondenz` gemappt (E-110, order-m3gim Punkt 1, ratifiziert die zuvor offene `null`-Führung) — zielort/abreiseort = Reisemobilität, empfangsort = Korrespondenz, absendeort = beides, vertragsort = Mobilitäts-Ortsrolle derselben Spur, data.md § Ortsrollen/§ 10 folgend. Weitere vorgemerkte eventRoles (`aufnahme`, `generalprobe`, `empfang`) und Rollen (Crew, `publikum`/`abgebildet`) bleiben auskommentiert gerüstet, bis der tiefere Export sie mit Daten füllt. Dokumenttyp-Labels kommen nicht mehr aus einer Hand-Map, sondern über `dftLabel(store, id)` aus `store.dftHierarchy`. Die Leitplanke Vokabular-Kopplung (`test_25`/`test_15`) bleibt grün.
- **Loader.** Die datumslosen Mobilitäts-STEs setzen kein `atDate` voraus (`date: null`). Die Ablösung des `m3gim:hasPerformanceRole`-Artefakts durch `m3gim-ontology:StageRole`-Entitäten und n-äre `m3gim-ontology:Performance` (gelesen in `archive-inline-detail`) ist umgesetzt und über die neuen Store-Maps `store.stageRoles` + `store.performances` angebunden. Die neuen Record-Felder `dataQualityFlag`, `bearbeitungsnotiz` und `erstelldatum` liegen an den Record-Knoten. Vertagt: der `wohnort`-Zustand mit Gültigkeitsperiode sowie `contractStatus`/`realized` (E-99, keine Datendeckung); `qualityConfidence` wird bewusst nicht fabriziert. <!-- vocab-exempt: nennt das mit E-96 abgeloeste Attribut -->
- **Datums-Handling (offen).** `date-parser.js` gibt qualifizierte Datierungen heute roh aus; Anzeige und Jahres-Extraktion sind um die Qualifier (`circa:`/`vor:`/`nach:`) und das `DatedEvent`-Shape (`m3gim-ontology:hasAnnotation`) noch zu erweitern.
- **Wirkung.** Die Mobilitäts-Strukturen tragen den sichtbaren Mobilitäts-Tab (E-111, D3-geo-Karte); die zurückgestellten Tabs Mobilitäts-Atlas, Repertoire und Biogramm bleiben damit ebenfalls tragfähig. Der Bühnenrollen-Block steht in [design.md](design.md). Eine UI-Anzeige für `dataQualityFlag` (und ein etwaiger Vertragsstatus) ist noch nicht umgesetzt — die Flags liegen vorerst nur in den Daten.

## Cross-View-Filter

Der view-übergreifende einheitliche Filter (Entwurf E-117, order-m3gim Milestone 3; vormals eigenes Dokument `filter-modell.md`). Ein gesetzter Schnitt nach Ort, Person, Werk, Rolle, Zeitfenster oder Mobilitätssicht soll synchron in allen filterbaren Views wirken, statt in jedem Tab getrennt gesetzt zu werden. Der Filter ist ein neutraler gekoppelter Schnitt mit den sichtbar getrennten Schärfegraden `weit` und `eng`; Bayreuth 1951 bis 1953 wird damit ein reines Filterergebnis, kein eigener View (Entscheidung in [architecture-decisions.md](architecture-decisions.md), Bayreuth als filterbarer Schnitt). Erster realer Baustein war der Statistik-Zeitfilter (E-122); Milestone 4 ist am 2026-06-23 gebaut, mit `filter-state.js` als Halter, `filter-sync.js` als DOM-freier Projektionsschicht und fünf abonnierenden Views (Bestand, Chronik, Karte, Netzwerk, Verknüpfungen).

### Ausgangslage

Heute trägt jeder filterbare View seine eigene Filterlogik. Bestand und Chronik teilen `filterByToolbarState` (`_archive-filter.js`) und je eine Instanz von `buildFilterToolbar`, aber mit getrenntem State; Netzwerk hat eine eigene Filter-Sidebar mit Zeitfenster; die Karte filtert view-lokal über Sicht-Legende und Zeitraum. Der Event-Bus `events.js` (E-53) ist ein einmaliger Navigationskanal (`m3gim:navigate`), kein geteilter Filter-State; genau diese Lücke schließt das Modell.

### Geteiltes Filter-State-Modell

Ein einziges Filter-State-Objekt ist die Quelle, alle Views lesen daraus und schreiben dorthin. Jede Facette zieht ihre Werte aus `store.*`, nicht aus redaktionellen Listen (E-87). Leerwert heißt Facette inaktiv.

| Facette | Wert-Typ | Quelle im Store | Leerwert |
|---|---|---|---|
| `ort` | String (Stadtname) | `store.locations`, Stadt-konsolidiert über `cityOf` (E-108) | `''` |
| `person` | String (Name) | `store.persons` | `''` |
| `werk` | String (Name) | `store.works` | `''` |
| `rolle` | String (Rollen-Id) | distinkte Rollen über `store.persons[].roles` (Akteursrolle) | `''` |
| `zeitfenster` | `[vonJahr, bisJahr]` | aus `rico:date` der Records und den Event-Daten | `null` (volle Spanne) |
| `sicht` | Sicht-Id | `mobilityClusterFor(eventRole)`, `null` → Bucket `kontext` | `''` |
| `schaerfe` | `'weit'` \| `'eng'` | Modus, kein Entitätsfilter | `'weit'` |

`rolle` ist die Akteursrolle, nicht die `eventRole`; die `eventRole` speist ausschließlich die `sicht`-Facette. Die bestand-lokale Erschließungs-Umschaltung (E-116, `zeigeUnerschlossen`) bleibt view-lokal, sie ist eine Darstellungsfrage des Bestands, kein view-übergreifender Datenschnitt.

### Schärfegrade als Filtersemantik

Ein Ort, eine Person, ein Werk koppeln an Daten auf unterschiedlich scharfen Ebenen, und der Filter darf die unscharfe nicht als die scharfe ausgeben.

- `schaerfe = 'weit'`, Record-Bezug. Ein Treffer ist ein Record, der die Entität führt, etwa über `rico:hasOrHadLocation`. Weit und unscharf, weil Sammeldokumente mehrere Orte und Zeiten bündeln; das Vorhandensein im selben Record ist kein Nachweis, dass das Ereignis an diesem Ort stattfand.
- `schaerfe = 'eng'`, Ereignis-Verortung. Ein Treffer ist ein `m3gim-ontology:Annotation` mit `atPlace`, Datum und Koordinaten. Raumzeitlich exakt. Umgesetzt ist der enge Grad als Record-Menge. `engRecordSet(store)` in [`filter-sync.js`](../docs/js/ui/filter-sync.js) und `eventAnchoredRecords(store)` in [`_verknuepfungen-geometry.js`](../docs/js/views/_verknuepfungen-geometry.js) sammeln die Records, die mindestens ein `m3gim-ontology:Annotation` **oder** eine `m3gim-ontology:Performance` tragen, also raumzeitlich oder über eine Aufführung belegt sind. Die Aufführungsbelegung ist gegenüber dem Entwurf hinzugekommen, weil eine belegte Aufführung dieselbe Schärfe stiftet wie ein verortetes Ereignis.

Der Modus schaltet die Auflösung der `ort`- und `zeitfenster`-Facette um, weit über die Record-Menge, eng über die Event-Menge. Default ist `weit`; jeder View zeigt den aktiven Schärfegrad an und nennt im engen Modus die Differenz, wie viele der record-bezogenen Treffer raumzeitlich belegt sind (Erschließungsspiegel-Prinzip E-87 auf den Filter angewendet). Die Karte ist intrinsisch `eng`, das Netzwerk intrinsisch `weit`.

Herkunft der Unterscheidung ist der Bayreuth-Befund vom 2026-06-20, der sie am konkreten Fall durchgearbeitet hat. Seine Definitionen gelten unverändert für jede Entität.

- Bayreuth-Bezug (Record-Ebene). Ein Dokument, das Bayreuth als Ort führt (`rico:hasOrHadLocation`, Stadt-Ebene Bayreuth). Weite, unscharfe Kopplung.
- Bayreuth-Verortung (Ereignis-Ebene). Ein `m3gim-ontology:Annotation` mit `atPlace` Bayreuth, mit Datum und Koordinaten. Enge, raumzeitlich exakte Kopplung.
- Zwei Schärfegrade. Im selben Record wie Bayreuth (weit) gegen nachweislich in Bayreuth (eng).

Die Achsenzahlen beruhen auf der Kopplung Person, Rolle oder Werk steht im selben Record wie ein Bayreuth-Ort, nicht auf nachweislich in Bayreuth. Die Bayreuth-Records sind teils Sammeldokumente (Lebenslauf, Rollenverzeichnis), die mehrere Orte und Spielstätten bündeln. Eine ehrliche Visualisierung muss diese zwei Schärfegrade auseinanderhalten und darf die Record-Kopplung nicht als Bayreuth-Auftrittsnachweis ausgeben. Das ist die Anwendung des Erschließungsspiegel-Prinzips (E-87, E-88) auf den Bayreuth-Fokus.

Drei Personen-Begriffe hängen an derselben Unterscheidung und binden die Netzwerk-artigen Views.

- Akteur. Eine Person über `m3gim-ontology:hasAssociatedAgent`, also belegt mitwirkend (Sänger, Dirigent, Regie, Korrespondenzpartner).
- Erwähnte Subjekt-Person. Eine Person über `rico:hasOrHadSubject` mit `@type rico:Person`, also genannt oder besprochen, oft Komponist. Kein Beleg für eine direkte Zusammenarbeit.
- Annotierte Beziehung gegen Ko-Okkurrenz. Annotiert heißt explizit als AgRelOn-Relation erfasst. Ko-Okkurrenz heißt aus der gemeinsamen Nennung in einem Dokument abgeleitet.

Für eine Netzwerk-Ansicht zählt primär die Akteurs-Achse, die Subjekt-Achse ist Kontext, kein Kontaktnetz.

Die `sicht`-Facette nutzt `mobilityClusterFor` als alleinige Quelle und faltet dessen `null`-Rückgabe in eine explizite Option `kontext`, wie `mobility.js` es bereits tut; der view-lokale `ROLE_TO_TYPE` ist im Bau durch denselben kanonischen Pfad ersetzt worden und existiert nicht mehr.

### Verteilung über die bestehende Mechanik

Kein neuer Apparat; Event-Bus und generische Toolbar werden erweitert.

- Ein geteilter Filter-Halter (neues Modul `docs/js/ui/filter-state.js`) hält das State-Objekt und bietet `getFilter()`, `setFilter(patch)`, `subscribe(fn)`; `setFilter` dispatcht ein `m3gim:filter`-CustomEvent über denselben `window`-Kanal, den `events.js` trägt.
- Die Views Bestand, Chronik, Netzwerk und Karte abonnieren beim Render und wenden ihre bestehende Filterfunktion auf den geteilten statt auf privaten State an.
- `buildToolbar` (`_toolbar.js`) wird zur Sicht auf den geteilten State, `setFacet` schreibt über `setFilter`, die Toolbar abonniert und spiegelt externe Änderungen (ein Klick auf einen Kartenknoten setzt `ort`, die Ort-Combobox im Bestand zieht nach).
- `onViewNavigate` bleibt unverändert für den orthogonalen Sprung „öffne diesen Record und scrolle hin“.

### Milestone-4-Stand

Gebaut sind `filter-state.js` mit dem `m3gim:filter`-Kanal, `buildToolbar` rückverdrahtet und Bestand und Chronik umgestellt, Netzwerk-Zeitfenster und Karten-Filter am selben State, der view-lokale `ROLE_TO_TYPE` durch `mobilityClusterFor` ersetzt, und der Schärfegrad als geteiltes Control mit Differenznennung. Bestand und Chronik führen die Differenz über ein eigenes Banner (`updateSchaerfeBanner`), der Verknüpfungen-Tab über seine Caption. Abgesichert ist die Kopplung durch den Smoke-Canary `m4:cross-view-filter` (Ort im Graph gesetzt, Bestand synchron gefiltert), durch `tests/frontend/filter-sync.test.mjs` für die Projektionen und den Loop-Guard und durch den logStamp-Vertrag des Verknüpfungen-Tabs.

Die Persistenz über Tab-Wechsel ist erfüllt, weil der State im Modul lebt und die Views beim einmaligen Render abonniert bleiben. Offen bleibt der Default-Schärfegrad pro View; geteilter Default ist `weit`, und kein View erzwingt heute `eng`.

## Schnittstellenvertrag

| Thema | Kanonische Quelle |
|-------|------------------|
| Designhaltung, Designsystem, Lektionen aus den entfernten Visualisierungen | [design.md](design.md) |
| Datenmodell, Ontologie, Vokabulare | [data.md](data.md) |
| Pipeline, Datenfluss, Qualitätsbaseline | [pipeline-architecture.md](pipeline-architecture.md) |
| Testsuite, TDD-Workflow | [testing.md](testing.md) |
| Architekturentscheidungen | [architecture-decisions.md](architecture-decisions.md) |
| Identität, Funktionsumfang, operativer Stand | [specification.md](specification.md) |
| Forschungsrahmen und Use Cases | [research-framework.md](research-framework.md) |
