# Frontend

> Laufzeitmodell, Toolchain, Verzeichnisstruktur, Store und Schnittstellenvertrag.

## Laufzeitmodell

- **Erfassung:** Google-Sheets-Exporte als XLSX → `data/google-spreadsheet/`
- **Verarbeitung:** Python-Skripte → JSON/JSON-LD in `docs/data/`
- **Praesentation:** Statische SPA in `docs/` (Vanilla JS + D3 v7)
- Offline-first: Alle Daten bei Startup geladen (E-05)

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

### Frontend-Module

19 JS-Module unter `docs/js/`:

| Pfad | Zweck |
|------|-------|
| `main.js` | Einstiegspunkt, Lazy-Tab-Rendering |
| `data/loader.js` | Dataloading, Store-Aufbau |
| `ui/router.js` | Hash-Routing (6 aktive Tabs) |
| `ui/korb.js` | Wissenskorb (sessionStorage) |
| `views/archiv.js` | Bestand + Chronik |
| `views/indizes.js` | 4-Grid Explorer |
| `views/mobilitaet.js` | Schwimmbahn-Timeline (D3) |
| `views/korb.js` | Korb-Cards |
| `views/matrix.js` | Person×Zeit-Heatmap (D3) |
| `views/kosmos.js` | Repertoire-Force-Graph (D3) |
| `utils/format.js` | Formatierungshilfen |
| `utils/dom.js` | DOM-Helfer (el, clear) |
| `utils/date-parser.js` | Datumsparser |
| `utils/normalize.js` | Normalisierung |

10 CSS-Dateien unter `docs/css/` (variables, base, archiv, indizes, mobilitaet, korb, matrix, kosmos, components, pages).

### Info-Seiten (statisches HTML, kein JS)

5 eigenstaendige HTML-Dateien: `about.html`, `projekt.html`, `modell.html`, `hilfe.html`, `impressum.html`.
Einheitliches Template: info-header, info-nav, info-main, info-footer. Lesebreite 720px.

## Routing

- Hash-basiert in `router.js`: 6 aktive Tabs (archiv, indizes, mobilitaet, matrix, kosmos, korb)
- Deep Links: `#archiv/UAKUG/NIM_003%20Folio%2001` fuer Datensatzkontext
- Info-Seiten als eigenstaendige HTML-Dateien (normale Links, kein Hash-Routing)
- `navigateToIndex(gridType, entityName)` fuer Cross-Tab-Navigation

## Store-Struktur (aus loader.js)

```
store = {
  fonds,                           // Fonds-Node (RecordSet, type=Fonds)
  konvolute: Map<id, RecordSet>,   // 3 Eintraege
  records: Map<id, Record>,        // Alle 282 Records inkl. Folios
  allRecords: Array<Record>,       // 279 (Folios gefiltert)
  byYear: Map<year, Record[]>,
  byDocType: Map<typeId, Record[]>,
  bySignatur: Map<sig, Record>,
  persons: Map<name, {records, roles, kategorie, wikidata}>,
  organizations: Map<name, {records, roles, wikidata}>,
  locations: Map<name, {records, roles, wikidata}>,
  works: Map<name, {records, komponist, wikidata}>,
  konvolutChildren: Map<konvolutId, childIds[]>,
  childToKonvolut: Map<childId, konvolutId>,
  konvolutMeta: Map<konvolutId, {title, dateDisplay, childCount, ...}>,
  folioIds: Set<folioId>,
  recordCount, konvolutCount, exportDate
}
```

Archiv und Indizes lesen direkt aus `m3gim.jsonld` (via Store), nicht aus separaten View-JSONs.
Mobilitaet liest aus beiden: `partitur.json` (Lebensphasen, Orte, Pfeile) + Store (Gastspiel-Dokumente dynamisch extrahiert).

## Schnittstellenvertrag

| Thema | Kanonische Quelle |
|-------|------------------|
| Systemarchitektur, Store, Module | diese Datei |
| Ontologie, Vokabulare, Datenmodell | `datenmodell.md` |
| Pipeline, Datenfluss, Qualitaet | `pipeline.md` |
| Visualisierungen, Interaktion, UI | `visualisierungen.md` |
| Architekturentscheidungen E-01 bis E-39 | `entscheidungen.md` |
| Operativer Stand, Naechste Schritte | `projekt-status.md` |
| Forschungsrahmen, Forschungsfragen | `forschung.md` |
