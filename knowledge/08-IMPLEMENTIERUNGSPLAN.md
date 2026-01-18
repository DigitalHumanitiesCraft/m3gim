# M³GIM Implementierungsplan

## Übersicht

Dieser Plan beschreibt die schrittweise Implementierung aller offenen Features inklusive eines vollständigen Refactorings der Frontend-Architektur.

**Geschätzter Gesamtumfang:** 8 Phasen

---

## Aktueller Zustand

### Dateistruktur (8.784 Zeilen)

```
docs/
├── index.html                 (449 Zeilen)   - Monolithisches HTML
├── css/
│   ├── styles.css             (1.506 Zeilen) - Archiv + Base
│   └── visualization-premium.css (1.268 Zeilen) - Viz-Styles
└── js/
    ├── app.js                 (1.101 Zeilen) - Archiv-Logik
    ├── partitur.js            (4.460 Zeilen) - ALLE Visualisierungen
    ├── data-extractor.js      - JSON-LD → View-Transform
    └── color-schemes.js       - Farbpaletten
```

### Probleme

| Problem | Beschreibung | Auswirkung |
|---------|--------------|------------|
| Monolithisches JS | partitur.js enthält 4 Visualisierungen | Schwer wartbar, langsam |
| Inline Styles | Document Panel CSS in partitur.js | Inkonsistent |
| Duplizierter Code | Ähnliche Patterns in app.js und partitur.js | Fehleranfällig |
| Keine Module | Alles in IIFEs, kein Import/Export | Keine Wiederverwendung |
| Synthetische Daten | Visualisierungen nutzen Testdaten | Nicht produktionsreif |
| Fehlende Features | Matrix, Kosmos, Sankey nur Placeholder | Unvollständig |

---

## Zielarchitektur

### Dateistruktur (Ziel)

```
docs/
├── index.html                 - Schlankes HTML-Gerüst
├── css/
│   ├── tokens.css             - Design Tokens (Farben, Spacing)
│   ├── base.css               - Reset, Typography, Utilities
│   ├── components/
│   │   ├── header.css
│   │   ├── sidebar.css
│   │   ├── cards.css
│   │   ├── modal.css
│   │   ├── toolbar.css
│   │   └── document-panel.css
│   └── visualizations/
│       ├── shared.css         - Gemeinsame Viz-Styles
│       ├── partitur.css
│       ├── matrix.css
│       ├── kosmos.css
│       └── sankey.css
└── js/
    ├── main.js                - Entry Point, Router
    ├── config.js              - Konstanten, URLs
    ├── state.js               - Zentraler State
    ├── utils/
    │   ├── dom.js             - DOM Helpers
    │   ├── format.js          - Datum, Escape
    │   └── colors.js          - Farbskalen
    ├── components/
    │   ├── search.js
    │   ├── filters.js
    │   ├── tektonik.js
    │   ├── modal.js
    │   └── document-panel.js
    ├── views/
    │   ├── archiv.js          - Katalog-View
    │   └── analyse.js         - Viz-Container
    └── visualizations/
        ├── shared.js          - Tooltips, Axes, Legends
        ├── partitur.js
        ├── matrix.js
        ├── kosmos.js
        └── sankey.js
data/
├── export/
│   └── m3gim.jsonld           - Quelldaten
└── views/                     - NEU: Aggregierte View-Daten
    ├── partitur.json
    ├── matrix.json
    ├── kosmos.json
    └── sankey.json
```

---

## Phase 0: Projektsetup

**Ziel:** Build-Tooling einrichten für modulare Entwicklung

### Tasks

| ID | Task | Output |
|----|------|--------|
| P0.1 | package.json anlegen | `package.json` |
| P0.2 | Vite als Bundler einrichten | `vite.config.js` |
| P0.3 | ESLint + Prettier | `.eslintrc.js`, `.prettierrc` |
| P0.4 | Build-Script für Views | `scripts/build-views.py` |
| P0.5 | GitHub Actions für Build | `.github/workflows/build.yml` |

### Entscheidung: Build-Tool

| Option | Pro | Contra |
|--------|-----|--------|
| **Vite** | Schnell, ESM-native, HMR | Dependency |
| Parcel | Zero-config | Weniger Kontrolle |
| Kein Bundler | Einfach | Keine Module, kein Tree-Shaking |

**Empfehlung:** Vite (Dev-Server + Build für Production)

### package.json

```json
{
  "name": "m3gim",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "build:views": "python scripts/build-views.py",
    "lint": "eslint docs/js/**/*.js"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "eslint": "^8.56.0"
  },
  "dependencies": {
    "d3": "^7.8.5"
  }
}
```

---

## Phase 1: Daten-Pipeline

**Ziel:** Echte Daten statt synthetischer Testdaten

### Tasks

| ID | Task | Abhängigkeit | Output |
|----|------|--------------|--------|
| P1.1 | Build-Script Grundgerüst | - | `scripts/build-views.py` |
| P1.2 | Lebensphasen-Definition | - | Statische Daten in Script |
| P1.3 | partitur.json generieren | P1.1, P1.2 | `data/views/partitur.json` |
| P1.4 | matrix.json generieren | P1.1 | `data/views/matrix.json` |
| P1.5 | kosmos.json generieren | P1.1 | `data/views/kosmos.json` |
| P1.6 | sankey.json generieren | P1.1, P1.2 | `data/views/sankey.json` |
| P1.7 | GitHub Action | P1.1-P1.6 | `.github/workflows/build-views.yml` |

### Aggregationslogik

#### partitur.json

```python
def build_partitur(records):
    return {
        'lebensphasen': LEBENSPHASEN,  # Statisch definiert
        'orte': aggregate_orte(records),
        'mobilitaet': extract_mobilitaet(records),
        'netzwerk': calculate_network_density(records),
        'repertoire': aggregate_repertoire(records),
        'dokumente': count_per_year(records)
    }
```

#### matrix.json

```python
def build_matrix(records):
    personen = defaultdict(lambda: defaultdict(list))

    for record in records:
        year = extract_year(record)
        period = get_5year_period(year)

        for agent in get_agents(record):
            if agent.name != 'Malaniuk, Ira':
                personen[agent.name][period].append(record.id)

    return {
        'zeitraeume': ['1945-1949', '1950-1954', ...],
        'personen': format_matrix(personen)
    }
```

---

## Phase 2: CSS Refactoring

**Ziel:** Modulare, wartbare Stylesheets

### Tasks

| ID | Task | Input | Output |
|----|------|-------|--------|
| P2.1 | Design Tokens extrahieren | styles.css:15-94 | `css/tokens.css` |
| P2.2 | Base Styles extrahieren | styles.css:96-200 | `css/base.css` |
| P2.3 | Header Styles | styles.css | `css/components/header.css` |
| P2.4 | Sidebar Styles | styles.css | `css/components/sidebar.css` |
| P2.5 | Cards Styles | styles.css | `css/components/cards.css` |
| P2.6 | Modal Styles | styles.css | `css/components/modal.css` |
| P2.7 | Toolbar Styles | visualization-premium.css | `css/components/toolbar.css` |
| P2.8 | Document Panel Styles | partitur.js (inline!) | `css/components/document-panel.css` |
| P2.9 | Partitur Styles | visualization-premium.css | `css/visualizations/partitur.css` |
| P2.10 | Matrix Styles | NEU | `css/visualizations/matrix.css` |
| P2.11 | Kosmos Styles | NEU | `css/visualizations/kosmos.css` |
| P2.12 | Sankey Styles | NEU | `css/visualizations/sankey.css` |
| P2.13 | CSS Import-Struktur | - | `css/main.css` |

### tokens.css (Beispiel)

```css
:root {
  /* === Colors === */
  /* Primary: KUG Institutional */
  --color-primary: #004A8F;
  --color-primary-dark: #002D5C;
  --color-primary-light: #6B9DD1;
  --color-primary-tint: #E1ECF5;

  /* Neutral: Archive Palette */
  --color-paper: #FCFBF9;
  --color-cream: #F7F5F2;
  --color-parchment: #F0EDE8;
  --color-sand: #E8E4DC;
  --color-shadow: #C4BFB5;

  /* Text */
  --color-text-primary: #2C2825;
  --color-text-secondary: #5C5651;
  --color-text-tertiary: #8A857E;

  /* Composers */
  --color-wagner: #6B2C2C;
  --color-verdi: #2C5C3F;
  --color-strauss: #4A3A6B;
  --color-baroque: #8B7355;

  /* Mobility */
  --color-mobility-forced: #8B3A3A;
  --color-mobility-geographic: #3D7A5A;
  --color-mobility-education: #B67D3D;
  --color-mobility-lifestyle: #6B4E8C;

  /* === Typography === */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-serif: 'Source Serif 4', Georgia, serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* === Spacing === */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;

  /* === Layout === */
  --header-height: 60px;
  --sidebar-width: 280px;
  --panel-width: 380px;
}
```

### main.css (Import-Struktur)

```css
/* Design Tokens */
@import 'tokens.css';

/* Base */
@import 'base.css';

/* Components */
@import 'components/header.css';
@import 'components/sidebar.css';
@import 'components/cards.css';
@import 'components/modal.css';
@import 'components/toolbar.css';
@import 'components/document-panel.css';

/* Visualizations */
@import 'visualizations/shared.css';
@import 'visualizations/partitur.css';
@import 'visualizations/matrix.css';
@import 'visualizations/kosmos.css';
@import 'visualizations/sankey.css';
```

---

## Phase 3: JavaScript Refactoring

**Ziel:** Modulare, testbare JavaScript-Architektur

### Tasks

| ID | Task | Input | Output |
|----|------|-------|--------|
| P3.1 | Config Modul | app.js, partitur.js | `js/config.js` |
| P3.2 | State Modul | app.js:136-144 | `js/state.js` |
| P3.3 | DOM Utilities | app.js:1020-1042 | `js/utils/dom.js` |
| P3.4 | Format Utilities | app.js:979-1015 | `js/utils/format.js` |
| P3.5 | Color Utilities | partitur.js:72-74 | `js/utils/colors.js` |
| P3.6 | Search Component | app.js:543-553 | `js/components/search.js` |
| P3.7 | Filter Component | app.js:436-538 | `js/components/filters.js` |
| P3.8 | Tektonik Component | app.js:216-362 | `js/components/tektonik.js` |
| P3.9 | Modal Component | app.js:620-829 | `js/components/modal.js` |
| P3.10 | Document Panel | partitur.js:142-300 | `js/components/document-panel.js` |
| P3.11 | Archiv View | app.js:556-618 | `js/views/archiv.js` |
| P3.12 | Analyse View | app.js:367-432 | `js/views/analyse.js` |
| P3.13 | Main Entry Point | app.js:1091-1099 | `js/main.js` |

### Modul-Struktur

#### js/config.js

```javascript
export const CONFIG = {
  dataUrl: 'data/m3gim.jsonld',
  viewsUrl: 'data/views',
  debounceDelay: 200,
  minYear: 1919,
  maxYear: 2009
};

export const DOKUMENTTYP_LABELS = {
  'Letter': 'Korrespondenz',
  'Contract': 'Vertrag',
  // ...
};

export const TEKTONIK_STRUKTUR = {
  'Hauptbestand': { label: 'Hauptbestand', prefix: 'NIM_', excludePrefix: [...] },
  // ...
};
```

#### js/state.js

```javascript
import { reactive } from './utils/reactive.js';

export const state = reactive({
  // Data
  allRecords: [],
  filteredRecords: [],
  viewData: {
    partitur: null,
    matrix: null,
    kosmos: null,
    sankey: null
  },

  // UI State
  currentView: 'analyse',
  currentViz: 'partitur',
  tektonikFilter: null,
  selectedRecord: null,
  documentPanelOpen: false,
  documentPanelContent: null
});

// Simple reactivity (or use Proxy)
export function reactive(obj) {
  const listeners = new Set();

  return new Proxy(obj, {
    set(target, key, value) {
      target[key] = value;
      listeners.forEach(fn => fn(key, value));
      return true;
    }
  });
}
```

#### js/components/document-panel.js

```javascript
import { state } from '../state.js';
import { escapeHtml } from '../utils/dom.js';

let panelElement = null;

export function initDocumentPanel() {
  panelElement = createPanel();
  document.body.appendChild(panelElement);
}

export function showDocumentPanel(context, documents) {
  state.documentPanelOpen = true;
  state.documentPanelContent = { context, documents };
  render();
  panelElement.classList.add('document-panel--visible');
}

export function hideDocumentPanel() {
  state.documentPanelOpen = false;
  panelElement.classList.remove('document-panel--visible');
}

function createPanel() {
  const panel = document.createElement('div');
  panel.id = 'document-panel';
  panel.className = 'document-panel';
  panel.innerHTML = `
    <div class="document-panel__header">
      <h3 class="document-panel__title">Verknüpfte Archivalien</h3>
      <button class="document-panel__close" aria-label="Schließen">&times;</button>
    </div>
    <div class="document-panel__content"></div>
  `;

  panel.querySelector('.document-panel__close')
    .addEventListener('click', hideDocumentPanel);

  return panel;
}

function render() {
  const { context, documents } = state.documentPanelContent;
  const content = panelElement.querySelector('.document-panel__content');

  content.innerHTML = `
    <div class="document-panel__context">${escapeHtml(context)}</div>
    <div class="document-panel__count">${documents.length} Archivalien</div>
    <ul class="document-panel__list">
      ${documents.map(renderDocument).join('')}
    </ul>
  `;
}

function renderDocument(doc) {
  return `
    <li class="document-panel__item" data-id="${doc.id}">
      <span class="document-panel__item-type">${doc.typ}</span>
      <span class="document-panel__item-title">${escapeHtml(doc.titel)}</span>
      <span class="document-panel__item-date">${doc.datum || ''}</span>
    </li>
  `;
}
```

---

## Phase 4: HTML Refactoring

**Ziel:** Semantisches, schlankes HTML

### Tasks

| ID | Task | Beschreibung |
|----|------|--------------|
| P4.1 | Head optimieren | Preload Fonts, Async Scripts |
| P4.2 | Header vereinfachen | Nur wesentliche Elemente |
| P4.3 | Sidebar als Template | Dynamisch generiert |
| P4.4 | Toolbar als Template | Dynamisch je nach Viz |
| P4.5 | Modal entfernen | Dynamisch erstellt in JS |
| P4.6 | ARIA verbessern | Live Regions, Roles |

### index.html (Ziel)

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>M³GIM - Digitales Archiv Ira Malaniuk</title>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Source+Serif+4:wght@400;600&display=swap" rel="stylesheet">

  <!-- Styles -->
  <link rel="stylesheet" href="css/main.css">
</head>
<body>
  <a href="#main" class="skip-link">Zum Inhalt springen</a>

  <header class="header" role="banner">
    <div class="header__brand">
      <h1 class="header__title">M³GIM</h1>
      <span class="header__subtitle">Digitales Archiv Ira Malaniuk</span>
    </div>

    <nav class="nav-tabs" role="tablist" aria-label="Hauptnavigation">
      <!-- Generated by JS -->
    </nav>

    <div class="search" role="search">
      <input type="search" id="search-input" placeholder="Suche..." aria-label="Suche">
    </div>
  </header>

  <main id="main" class="main" role="main">
    <!-- Sidebar, Content, Toolbar generated by JS based on view -->
  </main>

  <!-- Scripts -->
  <script src="https://unpkg.com/lucide@latest" defer></script>
  <script src="https://d3js.org/d3.v7.min.js" defer></script>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

---

## Phase 5: Visualisierungen Refactoring

**Ziel:** Separate, vollständige Visualisierungs-Module

### Tasks

| ID | Task | Beschreibung | LOC (geschätzt) |
|----|------|--------------|-----------------|
| P5.1 | Shared Viz Utilities | Axes, Tooltips, Legends | 300 |
| P5.2 | Partitur extrahieren | Aus partitur.js | 800 |
| P5.3 | Matrix neu implementieren | Nach VIZ-2-Matrix.md | 600 |
| P5.4 | Kosmos neu implementieren | Nach VIZ-3-Kosmos.md | 700 |
| P5.5 | Sankey neu implementieren | Nach VIZ-4-Karrierefluss.md | 500 |

### Gemeinsame Schnittstelle

```javascript
// js/visualizations/base.js
export class Visualization {
  constructor(container, data, options = {}) {
    this.container = container;
    this.data = data;
    this.options = options;
    this.svg = null;
  }

  async init() {
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%');

    await this.render();
    this.setupInteractions();
  }

  async render() {
    throw new Error('render() must be implemented');
  }

  setupInteractions() {
    // Override in subclass
  }

  resize() {
    // Override in subclass
  }

  destroy() {
    this.svg?.remove();
  }

  // Shared utilities
  showTooltip(event, content) {
    // ...
  }

  hideTooltip() {
    // ...
  }

  showDocumentPanel(context, documentIds) {
    // ...
  }
}
```

### js/visualizations/matrix.js

```javascript
import { Visualization } from './base.js';
import { showDocumentPanel } from '../components/document-panel.js';

export class MatrixVisualization extends Visualization {
  constructor(container, data, options) {
    super(container, data, options);

    this.config = {
      cellSize: 40,
      labelWidth: 150,
      headerHeight: 60,
      ...options
    };

    this.scales = {};
    this.filters = {
      kategorien: new Set(['dirigent', 'regisseur', 'vermittler', 'kollege']),
      zeitraeume: new Set(data.zeitraeume)
    };
  }

  async render() {
    const { personen, zeitraeume } = this.data;

    // Filter data
    const filtered = personen.filter(p =>
      this.filters.kategorien.has(p.kategorie)
    );

    // Setup scales
    this.scales.color = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, 5]);

    // Render grid
    this.renderHeaders(zeitraeume);
    this.renderRows(filtered, zeitraeume);
    this.renderLegend();
  }

  renderHeaders(zeitraeume) {
    // Column headers for time periods
  }

  renderRows(personen, zeitraeume) {
    const rows = this.svg.selectAll('.matrix-row')
      .data(personen)
      .join('g')
      .attr('class', 'matrix-row');

    // Row label
    rows.append('text')
      .attr('class', 'matrix-row__label')
      .text(d => d.name);

    // Cells
    rows.selectAll('.matrix-cell')
      .data(d => zeitraeume.map(z => ({
        person: d,
        zeitraum: z,
        begegnung: d.begegnungen.find(b => b.zeitraum === z)
      })))
      .join('rect')
      .attr('class', 'matrix-cell')
      .attr('fill', d => d.begegnung
        ? this.scales.color(d.begegnung.intensitaet)
        : '#F5F3EF')
      .on('mouseenter', (event, d) => this.handleCellHover(event, d))
      .on('click', (event, d) => this.handleCellClick(event, d));
  }

  handleCellHover(event, d) {
    if (!d.begegnung) return;

    this.showTooltip(event, `
      <strong>${d.person.name}</strong><br>
      ${d.zeitraum}: ${d.begegnung.intensitaet} Begegnungen
    `);
  }

  handleCellClick(event, d) {
    if (!d.begegnung || d.begegnung.dokumente.length === 0) return;

    showDocumentPanel(
      `${d.person.name} (${d.zeitraum})`,
      d.begegnung.dokumente
    );
  }

  setFilter(type, values) {
    this.filters[type] = new Set(values);
    this.render();
  }
}
```

---

## Phase 6: Document Panel & Cross-Linking

**Ziel:** Nahtlose Verbindung zwischen Visualisierungen und Archiv

### Tasks

| ID | Task | Beschreibung |
|----|------|--------------|
| P6.1 | Document Panel fertigstellen | Styles aus CSS, nicht inline |
| P6.2 | Klick in Panel → Modal | Archivdetails öffnen |
| P6.3 | "In Archiv zeigen" Button | Filter auf Signatur setzen |
| P6.4 | Cross-Viz Highlighting | Element in anderer Viz hervorheben |
| P6.5 | Deep Linking | URL-Parameter für State |

### Deep Linking

```javascript
// js/router.js
export function initRouter() {
  // Parse initial URL
  const params = new URLSearchParams(window.location.search);

  if (params.has('view')) {
    state.currentView = params.get('view');
  }
  if (params.has('viz')) {
    state.currentViz = params.get('viz');
  }
  if (params.has('signatur')) {
    openRecord(params.get('signatur'));
  }

  // Listen for state changes
  window.addEventListener('popstate', handlePopState);
}

export function updateUrl() {
  const params = new URLSearchParams();
  params.set('view', state.currentView);

  if (state.currentView === 'analyse') {
    params.set('viz', state.currentViz);
  }
  if (state.selectedRecord) {
    params.set('signatur', state.selectedRecord['rico:identifier']);
  }

  history.pushState(null, '', `?${params}`);
}
```

---

## Phase 7: Export & Accessibility

**Ziel:** Export-Funktionen und vollständige Barrierefreiheit

### Tasks

| ID | Task | Beschreibung |
|----|------|--------------|
| P7.1 | SVG Export | Für alle Visualisierungen |
| P7.2 | PNG Export | Via Canvas |
| P7.3 | CSV Export Matrix | Personen × Zeiträume |
| P7.4 | Gefilterte Archivalien Export | JSON/CSV |
| P7.5 | Keyboard Navigation | Tab, Enter, Arrows |
| P7.6 | Screen Reader Support | ARIA Live Regions |
| P7.7 | Focus Management | Modal, Panel |
| P7.8 | High Contrast Mode | CSS Media Query |

### Export-Utilities

```javascript
// js/utils/export.js
export function exportSVG(svgElement, filename) {
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svgElement);

  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, `${filename}.svg`);
}

export function exportPNG(svgElement, filename, scale = 2) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const bbox = svgElement.getBoundingClientRect();
  canvas.width = bbox.width * scale;
  canvas.height = bbox.height * scale;

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => downloadBlob(blob, `${filename}.png`));
  };

  const svgData = new XMLSerializer().serializeToString(svgElement);
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

export function exportCSV(data, columns, filename) {
  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(c => `"${row[c.key] || ''}"`.replace(/"/g, '""')).join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${filename}.csv`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## Phase 8: Testing & Dokumentation

**Ziel:** Qualitätssicherung und Übergabefähigkeit

### Tasks

| ID | Task | Beschreibung |
|----|------|--------------|
| P8.1 | Unit Tests Utils | Jest für format.js, colors.js |
| P8.2 | Integration Tests | Playwright für User Flows |
| P8.3 | Visual Regression | Percy oder Chromatic |
| P8.4 | Performance Audit | Lighthouse |
| P8.5 | Accessibility Audit | axe-core |
| P8.6 | README aktualisieren | Setup, Contribution |
| P8.7 | CHANGELOG | Versionshistorie |
| P8.8 | API-Dokumentation | JSDoc für Module |

---

## Zeitplan (Vorschlag)

| Phase | Beschreibung | Abhängigkeiten | Aufwand |
|-------|--------------|----------------|---------|
| **0** | Projektsetup | - | 1 Tag |
| **1** | Daten-Pipeline | Phase 0 | 2-3 Tage |
| **2** | CSS Refactoring | - | 2 Tage |
| **3** | JS Refactoring | Phase 0 | 3-4 Tage |
| **4** | HTML Refactoring | Phase 2, 3 | 1 Tag |
| **5** | Visualisierungen | Phase 1, 3 | 5-7 Tage |
| **6** | Document Panel | Phase 3, 5 | 2 Tage |
| **7** | Export & A11y | Phase 5 | 2-3 Tage |
| **8** | Testing & Docs | Alle | 2-3 Tage |

**Gesamt:** ~20-25 Arbeitstage

---

## Parallelisierbare Arbeiten

```
Phase 0 ─────┬───▶ Phase 1 (Daten) ──────────────────────┐
             │                                            │
             ├───▶ Phase 2 (CSS) ───────┬───▶ Phase 4 ───┼───▶ Phase 5 ───▶ Phase 6 ───▶ Phase 7
             │                          │   (HTML)       │   (Viz)        (Panel)      (Export)
             └───▶ Phase 3 (JS) ────────┘                │
                                                          │
                                                          └───▶ Phase 8 (Testing)
```

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Auswirkung | Mitigation |
|--------|-------------------|------------|------------|
| Datenqualität in JSON-LD | Mittel | Hoch | Validierung im Build |
| D3 v7 Breaking Changes | Niedrig | Mittel | Version pinnen |
| Browser-Kompatibilität | Niedrig | Mittel | Polyfills, Testing |
| Performance bei 436 Records | Niedrig | Niedrig | Virtualisierung falls nötig |

---

## Erfolgskriterien

| Kriterium | Messung | Ziel |
|-----------|---------|------|
| Alle 4 Visualisierungen funktional | Manueller Test | ✅ |
| Document Panel verknüpft | Klick → Archivalien | ✅ |
| Echte Daten (keine Testdaten) | Build-Pipeline | ✅ |
| Lighthouse Performance | Score | ≥ 90 |
| Lighthouse Accessibility | Score | ≥ 90 |
| Bundle Size | gzip | < 200 KB |
| Initiale Ladezeit | FCP | < 2s |

---

*Version 1.0 – 2026-01-18*
