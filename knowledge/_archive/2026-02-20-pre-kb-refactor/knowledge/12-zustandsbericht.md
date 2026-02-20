# M³GIM Repository-Zustandsbericht

> Stand: 2026-02-20, nach Session 9 (M7–M11). Basiert auf Code-Analyse, nicht auf Dokumentation.
> Letzter Commit: `5db70c7` (M10). Working Tree: Knowledge-Updates (M11).

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
│   ├── css/                 # 8 CSS-Dateien (~1800 Zeilen)
│   ├── js/                  # 20 ES6-Module in 4 Unterordnern (~3500 Zeilen)
│   └── data/                # JSON-LD + 4 View-JSONs (505.913 Bytes)
├── scripts/                 # Python-Pipeline (5 Scripts + README)
├── knowledge/               # 14 Markdown-Docs + Journal + README
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

### Frontend-Modulstruktur (19 Module, ~3500 Zeilen)

```
docs/js/
├── main.js                     ~120 Zeilen # Einstiegspunkt, Store-Aufbau, Page-Rendering
├── data/
│   ├── loader.js               248 Zeilen  # Fetch m3gim.jsonld → buildStore()
│   ├── aggregator.js           249 Zeilen  # Client-seitige Aggregation für Matrix/Kosmos
│   └── constants.js            208 Zeilen  # Dokumenttypen, Personen-Kategorien, Zeiträume
├── ui/
│   ├── router.js               ~130 Zeilen # Hash-basierter Router, 4 Tabs + 3 Pages
│   └── detail-panel.js          52 Zeilen  # Slide-in Sidebar rechts
├── utils/
│   ├── dom.js                   37 Zeilen  # el(tag, attrs, ...children), clear()
│   ├── date-parser.js           76 Zeilen  # extractYear(), formatDate()
│   └── format.js                ~70 Zeilen # formatSignatur(), formatChildSignatur(), ensureArray()
└── views/
    ├── archiv.js               ~200 Zeilen # Orchestrator: Toolbar, Toggle, Filter, Counter
    ├── archiv-bestand.js       ~310 Zeilen # Bestandsansicht + Folio-Differenzierung
    ├── archiv-chronik.js       ~378 Zeilen # Chronik: Perioden → Ort/Person/Werk
    ├── archiv-inline-detail.js 279 Zeilen  # Shared Detail-Komponente (Metadaten + Chips)
    ├── indizes.js              297 Zeilen  # 4-Grid Index (Personen, Organisationen, Orte, Werke)
    ├── matrix.js               ~261 Zeilen # D3 Heatmap + Drilldown + Kategorie-Kürzel
    ├── kosmos.js               ~330 Zeilen # D3 Force-Graph + Zoom/Pan + Graduated-Circle-Legende
    ├── about.js                 67 Zeilen  # Über-Seite
    ├── projekt.js              130 Zeilen  # Projekt-Seite (Schichten-Modell)
    └── hilfe.js                133 Zeilen  # Hilfe-Seite (Bedienung, FAQ)
```

**Toter Code**: `stats-bar.js` (27 Zeilen) — nicht importiert, kann entfernt werden.

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

### Navigationsstruktur (M8)

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

### CSS (8 Dateien, ~1800 Zeilen)

| Datei | Zeilen | Zweck |
|-------|--------|-------|
| `variables.css` | 110 | Design Tokens (6 Farbgruppen, 3 Fonts, 8px-Raster) |
| `base.css` | ~160 | Reset, App-Shell, Header-Nav, Layout, Scrollbar |
| `components.css` | ~230 | Tab-Bar, Detail-Panel, Badges, Spinner, Tooltip |
| `archiv.css` | ~620 | Archiv-Tab: Toolbar, Tabelle, Inline-Detail, Chips, Chronik |
| `indizes.css` | 243 | 4-Grid Index-Layout |
| `matrix.css` | 167 | Heatmap + Drilldown |
| `kosmos.css` | ~119 | Force-Graph + Legende + Zoom-Reset |
| `pages.css` | ~130 | About/Projekt/Hilfe Seiten-Styling |

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

### Knowledge-Ordner (14 Dateien)

| Datei | Inhalt |
|-------|--------|
| `01-projekt.md` | Projektidentität, Scope, Meilensteine |
| `02-quellenbestand.md` | 3 Bestandsgruppen, Zahlen |
| `03-datenmodell.md` | Datenmodell und Erfassungsrichtlinien |
| `04-architektur.md` | Tech-Stack, Modulstruktur, CSS, Pipeline |
| `05-design-system.md` | Farbsystem, Typografie, Layout |
| `06-visualisierungen.md` | 4 Views/Visualisierungen |
| `07-entscheidungen.md` | 30 Architekturentscheidungen (ADRs) |
| `08-ric-o.md` | RiC-O 1.1 Referenz |
| `09-m3gim-ontology.md` | m3gim-Erweiterungs-Ontologie |
| `10-datenqualitaet.md` | Erfassungsprobleme, Pipeline-Fixes |
| `11-aufgabenkatalog.md` | 31 Items, 23 DONE, 8 DEFERRED |
| `12-zustandsbericht.md` | Dieser Bericht |
| `journal.md` | Arbeitstagebuch (9 Sessions) |
| `README.md` | Übersicht über Knowledge-Ordner |

### Bekannte Abweichungen Dokumentation ↔ Code

| Abweichung | Details |
|---|---|
| `reconcile.py` | In Dokumentation als geplant, existiert nicht als Datei |
| Pipeline-Outputs | `build-views.py` erzeugt `partitur.json` + `sankey.json`, die kein Frontend-Modul konsumiert |

---

## Offene Baustellen

### Bugs im Code

1. **m3gim.jsonld** — `UAKUG/NIM/PL_07` ist doppelt im Fonds `rico:hasOrHadPart` (2× referenziert).

### Toter Code

- `stats-bar.js` — 27 Zeilen, nicht importiert. Kann entfernt werden.
- `build-views.py` erzeugt `partitur.json` und `sankey.json` (Legacy, nicht konsumiert)

### Branch-Status

- Branch: `main`
- 13 Commits ahead of origin (alle unpushed)
- Kein Feature-Branch

### Nicht implementierte geplante Features

Siehe [→ Aufgabenkatalog](11-aufgabenkatalog.md) für detaillierte Liste. Zusammenfassung:

- Wikidata-Reconciliation (`reconcile.py`)
- Merkliste mit CSV-Export
- Orts-Hierarchie im Index
- Matrix-Sortieroptionen + Zeitfilter
- Kosmos Temporaler Slider
- Erschließungsdashboard
- Leaflet-Karte
