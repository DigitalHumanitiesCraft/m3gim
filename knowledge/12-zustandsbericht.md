# M³GIM Repository-Zustandsbericht

> Stand: 2026-02-20, Working Tree. Basiert auf Code-Analyse (`git`, `python`, `wc`), nicht auf Dokumentation.
> Letzter Commit: `0f95b91`. Working Tree hat uncommittete Änderungen (M8 Navigation WIP).

---

## Architektur

### Tech-Stack

- **Frontend**: Vanilla JS (ES6-Module), kein Build-Tool, kein `package.json`
- **Visualisierung**: D3.js v7 via CDN (`cdn.jsdelivr.net/npm/d3@7`)
- **Fonts**: Inter, Source Serif 4, JetBrains Mono (Google Fonts CDN, geladen in `base.css`)
- **Icons**: Inline SVG (kein Icon-CDN, kein Lucide-CDN)
- **Pipeline**: Python 3.11+ (5 Scripts, davon 4 aktiv + 1 Legacy)
- **Hosting**: GitHub Pages (`docs/` Ordner)
- **CI**: `.github/workflows/build-views.yml` — Triggered bei Push auf `data/output/m3gim.jsonld` oder `scripts/build-views.py`
- **node_modules**: Existiert (eslint, esbuild, rollup etc.), aber kein `package.json` im Root. Nicht in `.gitignore` blockiert, aber `.gitignore` hat `node_modules/`-Regel. Vermutlich Residuum einer früheren Konfiguration.

### Verzeichnisstruktur

```
m3gim/
├── docs/                    # GitHub Pages Root = Frontend
│   ├── index.html           # Single-Page-App (110 Zeilen, committed 127)
│   ├── css/                 # 7 CSS-Dateien (1681 Zeilen, 36.858 Bytes)
│   ├── js/                  # 19 ES6-Module in 4 Unterordnern (3103 Zeilen inkl. uncommitted)
│   └── data/                # JSON-LD + 4 View-JSONs (505.913 Bytes)
├── scripts/                 # Python-Pipeline (5 Scripts + README)
├── knowledge/               # 13 Markdown-Docs + Journal + README
├── data/                    # Rohdaten + Pipeline-Output
│   ├── archive-export/      # AUGIAS-Originalexporte (4 XLSX)
│   ├── google-spreadsheet/  # Google Sheets Exports (6 XLSX)
│   ├── output/              # Pipeline-Output (m3gim.jsonld + views/)
│   ├── processed/           # Legacy migrate.py Output (2 XLSX)
│   └── reports/             # Exploration + Validation Reports
├── .github/workflows/       # 1 Workflow (build-views.yml)
├── MEETING-2026-02-24.md    # Meeting-Vorbereitung
└── README.md                # Projekt-README
```

**Hinweis**: `.xlsx`-Dateien sind in `.gitignore` → werden nicht versioniert. `data/`-Ordner enthält nur lokale Arbeitskopien.

### Pipeline-Scripts (5 Dateien)

| # | Script | Input | Output | Zweck |
|---|--------|-------|--------|-------|
| 1 | `explore.py` (28.0 KB) | `data/google-spreadsheet/*.xlsx` | `data/reports/exploration-report.md` | Diagnostisch: Analysiert Datenstruktur, Fill-Rates, Vokabulare |
| 2 | `validate.py` (20.2 KB) | 6 XLSX (Objekte, Verknüpfungen, 4 Indizes) | `data/reports/validation-report.md` | Normalisierung, Pflichtfelder, Vokabular-Check, Cross-Table-Prüfung |
| 3 | `transform.py` (21.5 KB) | 6 XLSX (wie validate) | `data/output/m3gim.jsonld` | Transformation zu JSON-LD (RiC-O 1.1 + m3gim). Konvolut-Hierarchie, Wikidata-Anreicherung |
| 4 | `build-views.py` (31.4 KB) | `data/output/m3gim.jsonld` | 4 JSONs in `data/output/views/` | Erzeugt partitur.json, matrix.json, kosmos.json, sankey.json |
| 5 | `migrate.py` (12.7 KB) | `data/archive-export/*.xlsx` | `data/processed/*.xlsx` | Legacy: Einmalige AUGIAS→Google-Sheets-Migration (abgeschlossen) |

**Nicht vorhanden**: `reconcile.py` — in Dokumentation als geplant erwähnt, existiert nicht als Datei.

### Frontend-Modulstruktur (20 Module, ~3300 Zeilen inkl. uncommitted)

```
docs/js/
├── main.js                     139 Zeilen  # Einstiegspunkt, DOMContentLoaded → init()
├── data/
│   ├── loader.js               248 Zeilen  # Fetch m3gim.jsonld → buildStore()
│   ├── aggregator.js           249 Zeilen  # Client-seitige Aggregation für Matrix/Kosmos
│   └── constants.js            208 Zeilen  # Komponisten, Personen-Kategorien, Dokumenttypen
├── ui/
│   ├── router.js               122 Zeilen  # Hash-basierter Router, 4 Tabs + 3 Pages
│   ├── stats-bar.js             27 Zeilen  # Header-Statistik-Chips
│   └── detail-panel.js          52 Zeilen  # Slide-in Sidebar rechts
├── utils/
│   ├── dom.js                   37 Zeilen  # el(tag, attrs, ...children), clear()
│   ├── date-parser.js           76 Zeilen  # extractYear(), formatDate()
│   └── format.js                62 Zeilen  # formatSignatur(), formatDocType(), ensureArray()
└── views/
    ├── archiv.js               191 Zeilen  # Orchestrator: Toolbar, Bestand/Chronik-Toggle
    ├── archiv-bestand.js       290 Zeilen  # Bestandsansicht (Tabelle mit Konvolut-Hierarchie)
    ├── archiv-chronik.js       352 Zeilen  # Chronik (Perioden → Ort/Person/Werk)
    ├── archiv-inline-detail.js 279 Zeilen  # Shared Detail-Komponente (Metadaten + Chips)
    ├── indizes.js              297 Zeilen  # 4-Grid Index (Personen, Organisationen, Orte, Werke)
    ├── matrix.js               252 Zeilen  # D3 Heatmap + Drilldown-Panel
    ├── kosmos.js               248 Zeilen  # D3 Force-Graph (Komponisten-Netzwerk)
    ├── about.js                 67 Zeilen  # Über-Seite (uncommitted)
    ├── projekt.js              130 Zeilen  # Projekt-Seite (uncommitted)
    └── hilfe.js                133 Zeilen  # Hilfe-Seite (uncommitted)
```

---

## Daten

### Dateien in `docs/data/`

| Datei | Größe | Format | Inhalt |
|-------|-------|--------|--------|
| `m3gim.jsonld` | 262.339 Bytes | JSON-LD | 286 Nodes (282 Records + 4 RecordSets), 7 Context-Prefixe |
| `matrix.json` | 184.694 Bytes | JSON | 294 Personen × 7 Zeiträume × 5 Kategorien |
| `kosmos.json` | 37.286 Bytes | JSON | 1 Zentrum + 28 Komponisten + Werke |
| `partitur.json` | 11.577 Bytes | JSON | 7 Lebensphasen, 8 Orte, 49 Dokumente |
| `sankey.json` | 10.017 Bytes | JSON | 4 Phasen, 5 Repertoire, 5 Orte, 17 Flows |

**Fehlend**: `archiv.json` — im alten Zustandsbericht erwähnt, existiert nicht. Das Archiv-Tab liest direkt aus `m3gim.jsonld`.

**Nicht verwendet im Frontend**: `partitur.json`, `sankey.json` — werden von `build-views.py` erzeugt, aber kein View-Modul konsumiert sie.

### JSON-LD Struktur (m3gim.jsonld)

```
@context: 7 Prefixe (rico, m3gim, m3gim-dft, m3gim-role, wd, skos, xsd)
@graph: 286 Nodes
  ├── 282 × rico:Record
  └── 4 × rico:RecordSet
       ├── 1 × rico:Fonds (UAKUG_NIM) → 209 Kinder via rico:hasOrHadPart
       └── 3 × rico:File (Konvolute)
            ├── NIM_003: 11 Kinder (inkl. 1 Folio-Meta)
            ├── NIM_004: 35 Kinder (inkl. 1 Folio-Meta)
            └── NIM_007: 30 Kinder (inkl. 1 Folio-Meta)
```

### Zahlen (aus m3gim.jsonld extrahiert)

| Metrik | Wert |
|--------|------|
| Records gesamt | 282 |
| Davon mit Verknüpfungen | 62 (22%) |
| Davon ohne Datum | 39 (14%) |
| Gesamte Link-Relationen | 924 |
| Konvolute (rico:File) | 3 |
| Konvolut-Kinder gesamt | 76 (NIM_003: 11, NIM_004: 35, NIM_007: 30, jeweils inkl. Folio-Meta) |
| Folio-Meta-Records | 3 (NIM_003_Folio, NIM_004_Folio, NIM_007_Folio) |
| Angezeigte Objekte (allRecords) | 279 (282 − 3 Folio-Metas) |
| Matrix-Personen | 294 |
| Kosmos-Komponisten | 28 |

### Datenqualitätsprobleme (aus Code extrahiert)

- **Doppelte Signatur**: `UAKUG/NIM/PL_07` kommt 2× im Fonds `rico:hasOrHadPart` vor
- **Konvolut-Hierarchie**: Verwendet `rico:hasOrHadPart`, nicht `rico:includes` (das Feld existiert, ist aber leer)
- **Wikidata-IDs als Komponisten-Namen**: Einige Einträge in kosmos.json haben Q-IDs statt aufgelöster Namen (journal.md erwähnt dies)

### Datenfluss

```
Google Sheets (6 Tabellen, lokal als .xlsx)
  → validate.py (→ validation-report.md)
  → transform.py (→ data/output/m3gim.jsonld)
    → build-views.py (→ data/output/views/{partitur,matrix,kosmos,sankey}.json)
      → manuell kopiert nach docs/data/
        → ODER: CI Workflow kopiert nach Push
          → Frontend: loader.js fetch('data/m3gim.jsonld') → buildStore()
```

**Hinweis**: `docs/data/m3gim.jsonld` und `data/output/m3gim.jsonld` sind identische Kopien (262.339 Bytes). Die View-JSONs in `docs/data/` und `data/output/views/` sind ebenfalls identisch.

### Store-Struktur (aus loader.js extrahiert)

```
store = {
  fonds,                           // Fonds-Node (RecordSet mit type=Fonds)
  konvolute: Map<id, RecordSet>,   // 3 Einträge
  records: Map<id, Record>,        // Alle 282 Records inkl. Folios
  allRecords: Array<Record>,       // 279 (Folios gefiltert)
  byYear: Map<year, Record[]>,
  byDocType: Map<typeId, Record[]>,
  bySignatur: Map<sig, Record>,
  persons: Map<name, {records: Set, roles: Set, kategorie, wikidata}>,
  organizations: Map<name, {records: Set, roles: Set, wikidata}>,
  locations: Map<name, {records: Set, roles: Set}>,
  works: Map<name, {records: Set, komponist, wikidata}>,
  konvolutChildren: Map<konvolutId, childIds[]>,
  childToKonvolut: Map<childId, konvolutId>,
  konvolutMeta: Map<konvolutId, {title, dateDisplay, childCount, folioId, totalLinks, datedCount}>,
  folioIds: Set<folioId>,
  recordCount, konvolutCount, exportDate
}
```

---

## Frontend

### Navigationsstruktur (M8, uncommitted)

- **Header**: `.app-header` — Titel + Untertitel + Spacer + Nav-Links (Über, Projekt, Hilfe)
- **Tab-Bar**: 4 Daten-Tabs — Archiv, Indizes, Matrix, Kosmos
- **Hash-Routing**: `#archiv`, `#indizes`, `#matrix`, `#kosmos`, `#about`, `#projekt`, `#hilfe`, optional `#archiv/RECORD_ID`
- **3 Page-Seiten**: About (Über M³GIM), Projekt (Datenmodell), Hilfe (Bedienung)
- **Detail-Panel**: Fixed Sidebar rechts, 420px, z-index 100
- **Footer**: KUG Graz · GitHub-Link · "Prototyp"

**Entfernt**: Stats-Bar (Header-Chips), Info-Button, Info-Modal

### Implementierte Interaktionen (54 Event-Handler verifiziert)

| Interaktion | Modul | Handler | Status |
|---|---|---|---|
| Textsuche (Signatur + Titel) | archiv.js:49 | onInput | Funktioniert |
| Dokumenttyp-Filter (Dropdown) | archiv.js:56 | onChange | Funktioniert |
| Personen-Filter (Dropdown) | archiv.js:70 | onChange | Funktioniert |
| Sortierung (5 Optionen) | archiv.js:79 | onChange | Funktioniert |
| Bestand/Chronik-Toggle | archiv.js:115 | onClick | Funktioniert |
| Chronik-Gruppierung (Ort/Person/Werk) | archiv.js:130 | onClick | Funktioniert |
| Konvolut Expand/Collapse | archiv-bestand.js:198 | onClick | Funktioniert |
| Inline-Detail (Bestand) | archiv-bestand.js:234 | onClick | Funktioniert |
| Chronik Perioden-Collapse | archiv-chronik.js:101 | onClick | Funktioniert |
| Inline-Detail (Chronik) | archiv-chronik.js:150 | onClick | Funktioniert |
| Klickbare Entity-Chips → Index | archiv-inline-detail.js:155 | onClick | Funktioniert |
| Wikidata-Link (Inline-Detail) | archiv-inline-detail.js:174 | onClick (stopPropagation) | Funktioniert |
| Index Globale Suche | indizes.js:128 | onInput | Funktioniert |
| Index Spalten-Sort | indizes.js:193 | onClick | Funktioniert |
| Index Row Expand → Record-Liste | indizes.js:215 | onClick | Funktioniert |
| Index Wikidata-Link | indizes.js:258 | onClick (stopPropagation) | Funktioniert |
| Index Record-Klick → Detail-Panel | indizes.js:282 | onClick | Funktioniert |
| Matrix Kategorie-Checkboxen | matrix.js:48 | onClick | Funktioniert |
| Matrix "Alle zeigen" | matrix.js:71 | onClick | Funktioniert |
| Matrix Heatmap Hover | matrix.js:185 | mouseenter/mouseleave | Funktioniert |
| Matrix Zellen-Klick → Drilldown | matrix.js:187 | click | Funktioniert |
| Matrix Drilldown Record-Klick | matrix.js:235 | onClick | Funktioniert |
| Kosmos Drag | kosmos.js:121 | d3.drag | Funktioniert |
| Kosmos Komponist-Klick → Highlight | kosmos.js:137 | click | Funktioniert |
| Kosmos Werk-Hover → Label | kosmos.js:160 | mouseenter/mouseleave | Funktioniert |
| Kosmos Doppelklick → Reset | kosmos.js:224 | dblclick | Funktioniert |
| Kosmos Werk-Klick → Detail-Panel | kosmos.js:133 | click | OK: `store` aus Funktionsparameter wird per Closure erfasst |
| Archiv-Counter | archiv.js:107 | applyFilters | Dynamisch: zeigt "X von Y Objekten" bei aktivem Filter |
| Page-Navigation | router.js | click | Über/Projekt/Hilfe als eigene Seiten (M8) |

### CSS (8 Dateien, ~1700 Zeilen inkl. uncommitted)

| Datei | Zeilen | Zweck |
|-------|--------|-------|
| `variables.css` | 110 | Design Tokens (6 Farbgruppen, 3 Fonts, 8px-Raster) |
| `base.css` | ~160 | Reset, App-Shell, Header-Nav, Layout, Scrollbar |
| `components.css` | ~230 | Tab-Bar, Detail-Panel, Badges, Spinner, Tooltip (Stats/Info entfernt) |
| `archiv.css` | 601 | Archiv-Tab: Toolbar, View-Toggle, Tabelle, Inline-Detail, Chips, Chronik |
| `indizes.css` | 243 | 4-Grid Index-Layout |
| `matrix.css` | 167 | Heatmap + Drilldown |
| `kosmos.css` | 83 | Force-Graph + Legende |
| `pages.css` | ~130 | About/Projekt/Hilfe Seiten-Styling (neu, uncommitted) |

### CSS-Variablen (aus variables.css)

**Farben (6 Gruppen):**
- Primary: `--color-kug-blau: #004A8F`, `-light: #1a6ab5`, `-dark: #003366`
- Archival Neutrals: `--color-paper: #FAF8F5`, `--color-cream: #F5F0E8`, `--color-parchment: #EDE5D8`, `--color-sand: #C4B49A`
- Gold: `--color-gold-rich: #9A7B4F`, `-medium: #C4A574`, `-light: #E8DBC7`
- Signal: `--color-signal-green: #2E7D4F`, `-light: #e8f4ec`, `--color-absent: var(--color-text-tertiary)`
- Text: `--color-text-primary: #2C2825`, `-secondary: #5C5651`, `-tertiary: #8A857E`, `-inverse: #FFFFFF`
- Semantic: 6 Composer-Farben, 5 Mobility-Farben, 6 Personen-Kategorie-Farben

**Typografie:**
- `--font-ui: 'Inter'`, `--font-title: 'Source Serif 4'`, `--font-mono: 'JetBrains Mono'`
- 7 Größen: `--text-xs: 0.75rem` bis `--text-3xl: 2rem`

**Layout:**
- `--header-height: 64px`, `--tab-bar-height: 48px`, `--footer-height: 48px`
- `--detail-panel-width: 420px`

### Externe Abhängigkeiten

- D3.js v7 (`cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js`)
- Google Fonts: Inter, Source Serif 4, JetBrains Mono (geladen via `@import` in `base.css`)
- Kein npm/yarn/bun im Produktivcode
- Kein Build-Tool, Bundler, oder Transpiler

---

## Dokumentation

### Knowledge-Ordner (15 Dateien)

| Datei | Bytes | Inhalt |
|-------|-------|--------|
| `01-projekt.md` | 2.816 | Projektidentität, Scope |
| `02-quellenbestand.md` | 3.137 | 3 Bestandsgruppen, Zahlen |
| `03-datenmodell.md` | 4.652 | Datenmodell (Achtung: heißt nicht `03-methodik.md`) |
| `04-architektur.md` | 5.817 | Tech-Stack, Modulstruktur |
| `05-design-system.md` | 1.829 | Farben, Typografie |
| `06-visualisierungen.md` | 3.279 | D3.js-Visualisierungen |
| `07-entscheidungen.md` | 4.813 | Architekturentscheidungen (ADRs) |
| `08-ric-o.md` | 7.303 | RiC-O 1.1 Referenz |
| `09-m3gim-ontology.md` | 6.424 | m3gim-Erweiterungs-Ontologie |
| `10-datenqualitaet.md` | 7.053 | Erfassungsprobleme, Pipeline-Fixes |
| `12-zustandsbericht.md` | — | Dieser Bericht |
| `journal.md` | 16.121 | Arbeitstagebuch (9+ Sessions) |
| `README.md` | 1.861 | Übersicht über Knowledge-Ordner |

**Fehlend**: Es gibt keine `03-methodik.md` (alter Zustandsbericht listete sie). Die tatsächliche `03-datenmodell.md` existiert.
**Fehlend**: Es gibt keine `11-*.md` (Lücke in der Nummerierung).

### Abweichungen Dokumentation ↔ Code

| Abweichung | Was die Doku sagt | Was der Code zeigt |
|---|---|---|
| `archiv.json` | Zustandsbericht v1 listet `archiv.json` als View-JSON | Existiert nicht. Archiv-Tab liest direkt `m3gim.jsonld` |
| `reconcile.py` | Dokumentation als "nächster Schritt" | Existiert nicht als Datei im Repo |
| Pipeline-Outputs | `build-views.py` erzeugt "4 View-JSONs (archiv, matrix, kosmos, sankey)" | Erzeugt tatsächlich: partitur.json, matrix.json, kosmos.json, sankey.json |
| Frontend-Module | Alter Zustandsbericht sagt "17 ES6-Module" | Tatsächlich 18 (inkl. about.js, uncommitted) |
| Verknüpfungen | Alter Bericht sagt "~1280 Verknüpfungen" | Tatsächlich 924 Link-Relationen (Zählung aus JSON-LD) |
| Counter-Duplikat | Nicht dokumentiert | Bereinigt: Stats-Bar entfernt, archiv-count zeigt dynamische Filterzahl |
| Info-Modal | `components.css` definiert `.info-modal` Styles | Entfernt (HTML, CSS, JS) — ersetzt durch About/Projekt/Hilfe-Seiten |
| `03-methodik.md` | Alter Zustandsbericht und MEMORY.md listen diese Datei | Existiert nicht. Tatsächlich: `03-datenmodell.md` |

---

## Offene Baustellen

### Uncommittete Änderungen (M8 Navigation, komplett)

```
modified:   docs/index.html               Nav-Links statt Stats-Bar+Info, Page-Sections, Modal entfernt, pages.css
modified:   docs/js/ui/router.js          PAGES Konstante, Page-Handler, applyState erweitert
modified:   docs/js/main.js               Page-Imports, Page-Cases in renderTab, setupInfoModal/statsBar entfernt
modified:   docs/js/views/archiv.js       Dynamischer Counter (updateCounter)
modified:   docs/js/views/archiv-bestand.js  Return filteredCount
modified:   docs/js/views/archiv-chronik.js  Return records.length
modified:   docs/css/base.css             .app-header__nav Styles
modified:   docs/css/components.css       Stats-Bar, Info-Button, Info-Modal CSS entfernt
new file:   docs/css/pages.css            Page-Styling (About, Projekt, Hilfe)
new file:   docs/js/views/about.js        Über-Seite (67 Zeilen)
new file:   docs/js/views/projekt.js      Projekt-Seite (130 Zeilen)
new file:   docs/js/views/hilfe.js        Hilfe-Seite (133 Zeilen)
modified:   knowledge/12-zustandsbericht.md  Dieser Bericht
```

### Bugs im Code

1. **m3gim.jsonld** — `UAKUG/NIM/PL_07` ist doppelt im Fonds `rico:hasOrHadPart` (2× referenziert).

**Korrigiert in M8:**
- ~~kosmos.js:133~~ — Kein Bug. `store` aus Funktionsparameter `renderKosmos(store, container)` wird per Closure korrekt von den D3-Click-Handlern erfasst.
- ~~archiv.js:107~~ — Counter jetzt dynamisch: `updateCounter()` zeigt "X von Y Objekten" bei aktivem Filter.
- ~~main.js:107-136~~ — `setupInfoModal()` komplett entfernt, Info-Modal durch Seiten ersetzt.

### Toter Code

- `stats-bar.js` — 27 Zeilen, nicht mehr importiert (nach M8). Modul existiert noch als Datei.
- `build-views.py` erzeugt `partitur.json` und `sankey.json`, die kein Frontend-Modul konsumiert

**Bereinigt in M8:**
- ~~`components.css` `.info-modal`, `.info-btn`, `.stats-bar`~~ — Entfernt
- ~~`main.js` `setupInfoModal()`, `renderStatsBar()`~~ — Entfernt

### TODOs und FIXMEs im Code

Kein einziger `TODO`, `FIXME`, `HACK` oder `XXX` Kommentar in `docs/js/` oder `docs/css/` oder `scripts/`.

Einziger TODO-Hinweis im Repo:
- `knowledge/journal.md:88` — "Wikidata-IDs tauchen als Komponisten-Namen in kosmos.json auf [...] — kosmetisch, TODO"

### Branch-Status

- Branch: `main`
- 9 Commits ahead of origin (alle unpushed)
- Kein Feature-Branch
- 2 modified + 1 untracked file (M8 WIP)

### Nicht implementierte geplante Features

- Wikidata-Reconciliation (`reconcile.py` existiert nicht)
- ~~About/Projekt/Hilfe-Seiten~~ — Implementiert in M8 (uncommitted)
- Merkliste mit CSV-Export
- Orts-Hierarchie im Index
- Matrix-Sortieroptionen
- Kosmos Zoom/Pan
- Kosmos Temporaler Slider
- Erschließungsdashboard
