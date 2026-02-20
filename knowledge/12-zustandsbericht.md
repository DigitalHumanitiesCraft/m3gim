# M³GIM Repository-Zustandsbericht

> Stand: 2026-02-20, Session 9. Basiert auf Code-Analyse, nicht auf Dokumentation.

---

## Architektur

### Tech-Stack
- **Frontend**: Vanilla JS (ES6-Module), kein Build-Tool, kein package.json
- **Visualisierung**: D3.js v7 via CDN
- **Fonts**: Inter, Source Serif 4, JetBrains Mono (Google Fonts CDN)
- **Icons**: Lucide (inline SVG, kein CDN)
- **Pipeline**: Python 3.11+ (4 Scripts)
- **Hosting**: GitHub Pages (`docs/` Ordner)
- **Daten**: Google Sheets → Excel-Export → Pipeline → JSON-LD → View-JSONs

### Verzeichnisstruktur
```
m3gim/
├── docs/                    # GitHub Pages Root = Frontend
│   ├── index.html           # Single-Page-App (127 Zeilen)
│   ├── css/                 # 7 CSS-Dateien
│   ├── js/                  # 17 ES6-Module in 4 Unterordnern
│   └── data/                # JSON-LD + 4 View-JSONs
├── scripts/                 # Python-Pipeline (4-5 Scripts)
├── knowledge/               # 10+ thematische Markdown-Docs + Journal
├── data/                    # Rohdaten (google-spreadsheet/, output/)
└── .github/                 # CI/CD (build-views.yml)
```

### Pipeline-Scripts (Reihenfolge)
1. `explore.py` — Analysiert Excel-Rohdaten, erzeugt Bericht (diagnostisch, kein Output-File)
2. `validate.py` — Normalisierung, 25 Dokumenttypen, Cross-Table-Checks → Fehler/Warnings
3. `transform.py` — Google Sheets → JSON-LD (RiC-O 1.1 + m3gim-Ontologie). Konvolut-Hierarchie, String-Matching, Wikidata-Anreicherung. Output: `data/output/m3gim.jsonld`
4. `build-views.py` — JSON-LD → 4 View-JSONs (archiv, matrix, kosmos, sankey). Output: `data/output/views/`
5. `reconcile.py` — Wikidata-Reconciliation (geplant, Status unklar)

### Frontend-Modulstruktur
```
docs/js/
├── main.js                  # Einstiegspunkt, DOMContentLoaded → init()
├── ui/
│   ├── router.js            # Hash-basierter Router, 4 Tabs
│   ├── stats-bar.js         # Header-Statistik-Chips
│   └── detail-panel.js      # Slide-in Sidebar rechts
├── data/
│   ├── loader.js            # Fetch m3gim.jsonld → buildStore()
│   ├── aggregator.js        # Client-seitige Aggregation für Matrix/Kosmos
│   └── constants.js         # Komponisten, Personen-Kategorien, Dokumenttypen
├── utils/
│   ├── dom.js               # el(tag, attrs, ...children) Helper
│   ├── date-parser.js       # extractYear(), formatDate()
│   └── format.js            # formatSignatur(), formatDocType(), ensureArray(), countLinks()
└── views/
    ├── archiv.js             # Orchestrator: Toolbar, Bestand/Chronik-Toggle
    ├── archiv-bestand.js     # Bestandsansicht (Tabelle mit Konvolut-Hierarchie)
    ├── archiv-chronik.js     # Chronik (Perioden → Ort/Person/Werk Gruppierung)
    ├── archiv-inline-detail.js  # Shared Detail-Komponente (Metadaten + Chips)
    ├── indizes.js            # 4-Grid Index (Personen, Organisationen, Orte, Werke)
    ├── matrix.js             # D3 Heatmap + Drilldown-Panel
    └── kosmos.js             # D3 Force-Graph (Komponisten-Netzwerk)
```

---

## Daten

### Dateien in `docs/data/`
- `m3gim.jsonld` — Haupt-Datendatei, JSON-LD mit RiC-O 1.1 Ontologie (~258 KB)
- `archiv.json` — View-JSON für Archiv-Tab
- `matrix.json` — View-JSON für Matrix-Heatmap
- `kosmos.json` — View-JSON für Kosmos-Force-Graph
- `sankey.json` — View-JSON für Sankey-Diagramm (wird im Frontend aktuell nicht verwendet)

### Zahlen (aus Pipeline-Output und Store)
- **282 Records** (rico:Record) + **3 Konvolute** (rico:RecordSet) + **1 Fonds**
- **3 Folio-Meta-Records** (aus allRecords gefiltert → **279 angezeigte Objekte**)
- **3 Bestandsgruppen**: Hauptbestand (255), Plakate (26), Tonträger (1)
- **294 Personen** im Index (store.persons)
- **~1280 Verknüpfungen** gesamt
- **62 von 282 Records** haben mindestens eine Verknüpfung (22%)
- **78% der Records** haben 0 Verknüpfungen (Erschließung am Anfang)
- **39 Records** ohne Datum
- **Konvolute**: NIM_003, NIM_004, NIM_007 (mit 76 Kind-Records insgesamt)

### Datenfluss
```
Google Sheets (6 Tabellen)
  → Excel-Export (.xlsx)
    → validate.py (Normalisierung, Prüfung)
      → transform.py (→ m3gim.jsonld, 282 Records)
        → build-views.py (→ 4 View-JSONs)
          → docs/data/ (→ Frontend fetch)
            → loader.js buildStore() (→ In-Memory Maps/Sets)
```

### Store-Struktur (loader.js)
```
store = {
  fonds,                           // Fonds-Node
  konvolute: Map<id, RecordSet>,   // 3 Einträge
  records: Map<id, Record>,        // Alle Records inkl. Folios
  allRecords: Array<Record>,       // Folios gefiltert (279)
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

### Navigationsstruktur (Ist-Zustand)
- **Header**: `.app-header` — Titel + Untertitel + Stats-Bar (4 Chips) + Info-Button
- **Tab-Bar**: 4 Tabs — Archiv, Indizes, Matrix, Kosmos
- **Hash-Routing**: `#archiv`, `#indizes`, `#matrix`, `#kosmos`, optional `#archiv/RECORD_ID`
- **Info-Modal**: Overlay mit Datenstand-Statistiken (z-index 150)
- **Detail-Panel**: Fixed Sidebar rechts, 420px, z-index 100
- **Footer**: KUG Graz · GitHub-Link · "Prototyp"
- **Keine** About/Projekt/Hilfe-Seiten

### Implementierte Interaktionen
| Interaktion | Wo | Status |
|---|---|---|
| Textsuche (Signatur + Titel) | Archiv-Toolbar | Funktioniert |
| Dokumenttyp-Filter (Dropdown) | Archiv-Toolbar | Funktioniert |
| Personen-Filter (Dropdown) | Archiv-Toolbar | Funktioniert (M6) |
| Sortierung (Signatur/Datum/Titel) | Archiv-Toolbar Dropdown | Funktioniert |
| Bestand/Chronik-Toggle | Archiv-Toolbar | Funktioniert |
| Chronik-Gruppierung (Ort/Person/Werk) | Archiv-Toolbar (nur Chronik) | Funktioniert (M4) |
| Konvolut Expand/Collapse | Bestand-Tabelle | Funktioniert |
| Inline-Detail bei Klick | Bestand + Chronik | Funktioniert |
| Klickbare Entity-Chips → Index | Inline-Detail | Funktioniert (M5) |
| Matrix Heatmap Hover/Tooltip | Matrix-Tab | Funktioniert |
| Matrix Zellen-Klick → Drilldown | Matrix-Tab | Funktioniert (M3) |
| Kosmos Klick auf Komponist → Filter | Kosmos-Tab | Funktioniert |
| Kosmos Doppelklick → Reset | Kosmos-Tab | Funktioniert |
| Index Grid Expand → Record-Liste | Indizes-Tab | Funktioniert |
| Index Spalten-Sort | Indizes-Tab | Funktioniert |
| Counter in Archiv-Toolbar | Statisch "279 Objekte · 3 Konvolute" | **Bug**: Dupliziert Stats-Bar, aktualisiert nicht bei Filter |

### CSS-Variablen (aus variables.css)
**Farben:**
- `--color-kug-blau: #004A8F` (Primary, Interaktion)
- `--color-signal-green: #2E7D4F` (Verknüpfungen, NEU M7 uncommitted)
- `--color-signal-green-light: #e8f4ec` (NEU M7 uncommitted)
- `--color-absent: var(--color-text-tertiary)` (Abwesenheit, NEU M7 uncommitted)
- `--color-paper: #FAF8F5`, `--color-cream: #F5F0E8`, `--color-parchment: #EDE5D8`
- `--color-text-primary: #2C2825`, `--color-text-secondary: #5C5651`, `--color-text-tertiary: #8A857E`

**Typografie:**
- `--font-ui: 'Inter'`, `--font-title: 'Source Serif 4'`, `--font-mono: 'JetBrains Mono'`

**Layout:**
- `--header-height: 64px`, `--tab-bar-height: 48px`, `--footer-height: 48px`
- `--detail-panel-width: 420px`

### CSS-Dateien (7)
| Datei | Zweck |
|---|---|
| `variables.css` | Design Tokens (~105 Zeilen) |
| `base.css` | Reset, App-Shell, Layout (~145 Zeilen) |
| `components.css` | Tabs, Detail-Panel, Badges, Modal, Tooltip (~337 Zeilen) |
| `archiv.css` | Archiv-Tab: Tabelle, Chronik, Inline-Detail, Chips (~599 Zeilen) |
| `indizes.css` | 4-Grid Index-Layout (~244 Zeilen) |
| `matrix.css` | Heatmap + Drilldown |
| `kosmos.css` | Force-Graph + Legende |

### Externe Abhängigkeiten
- D3.js v7 (CDN)
- Google Fonts: Inter, Source Serif 4, JetBrains Mono
- Keine npm/yarn/bun Dependencies
- Keine Build-Tools, Bundler, oder Transpiler

---

## Dokumentation

### Knowledge-Ordner (im Repo)
| Datei | Inhalt |
|---|---|
| `01-projekt.md` | Projektidentität, Scope |
| `02-quellenbestand.md` | 3 Bestandsgruppen, Zahlen |
| `03-methodik.md` | Promptotyping-Ansatz |
| `04-architektur.md` | Tech-Stack, Modulstruktur |
| `07-entscheidungen.md` | Architekturentscheidungen (ADRs) |
| `08-ric-o.md` | RiC-O 1.1 Referenz |
| `09-m3gim-ontology.md` | m3gim-Erweiterungs-Ontologie |
| `10-datenqualitaet.md` | Erfassungsprobleme, Pipeline-Fixes |
| `journal.md` | Arbeitstagebuch (9 Sessions, ~255 Zeilen) |
| `README.md` | Übersicht über Knowledge-Ordner |

### Vault-Dokumentation (extern, Obsidian)
7 Docs in `Projects/M³GIM/` — Project Overview, Datenmodell, Technische Doku, Design-System, Visualisierungen, Entscheidungen, Iteration 1 Learnings.

### Bekannte Abweichungen Dokumentation ↔ Code
- **Counter-Duplikat**: Nicht dokumentiert. Stats-Bar und archiv-count zeigen identische Zahlen.
- **Sankey-View**: `sankey.json` wird erzeugt, aber kein Tab/View im Frontend dafür.
- **reconcile.py**: In Dokumentation als "nächster Schritt" erwähnt, aktueller Implementierungsstand unklar.
- **Folio-Anzahl**: Journal sagt "282 → 279" (3 Folios gefiltert), aber technisch sind es 3 Folio-Meta-Records die aus allRecords entfernt werden — die 282 Records existieren weiterhin im Store.

---

## Offene Baustellen

### Uncommittete Änderungen (M7 Farbsystem)
```
modified:   docs/css/variables.css      (Signal Colors hinzugefügt)
modified:   docs/css/components.css     (Per-Typ-Badge-Farben entfernt, Wikidata grün)
modified:   docs/css/archiv.css         (Signal-Grün VKN., Konvolut/Folio-Hintergrund weg, Abwesenheits-Pattern)
modified:   docs/js/views/indizes.js    (Kategorie-Farbstrich entfernt)
modified:   knowledge/journal.md        (M7 Eintrag)
```

### Bekannte TODOs
- Wikidata-IDs in Kosmos auflösen (Q-IDs statt Namen bei manchen Komponisten)
- Archiv-Counter dynamisch machen (zeigt keine gefilterte Zahl)
- Info-Modal soll durch echte Seiten ersetzt werden (About/Projekt/Hilfe)
- Erschließungsdashboard fehlt (nur 22% der Records haben Verknüpfungen)

### Nicht implementierte geplante Features
- Merkliste mit CSV-Export (localStorage-basiert)
- Orts-Hierarchie im Index (Stadt → Strasse)
- Matrix-Sortieroptionen
- Kosmos Zoom/Pan
- Kosmos Temporaler Slider

### Branch-Status
- Branch: `main`
- 8 Commits ahead of origin (7 pushed + 1 uncommitted M7)
- Kein Feature-Branch, alles direkt auf main
