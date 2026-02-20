# Technische Architektur

> Dreistufig: Erfassung (Google Sheets) → Verarbeitung (Python 3.11+) → Präsentation (D3.js v7, GitHub Pages)

---

## Workflow

```
Google Drive (6 Spreadsheets als XLSX)
    ↓ Download als XLSX → data/google-spreadsheet/
explore.py          → data/reports/exploration-report.md
validate.py         → data/reports/validation-report.md
transform.py        → data/output/m3gim.jsonld
build-views.py      → data/output/views/*.json
    ↓ CI/CD
docs/data/*.json    → GitHub Pages Frontend
```

## Pipeline (5 Python-Scripts + 1 abgeschlossen)

| Script | Funktion | Input | Output |
|---|---|---|---|
| explore.py | Datenstruktur-Analyse | data/google-spreadsheet/ | exploration-report.md |
| validate.py | Datenqualitaetspruefung + Normalisierung | 6 XLSX + 4 Indizes | validation-report.md |
| transform.py | Google Sheets → JSON-LD (RiC-O 1.1 + m3gim) | 6 XLSX | m3gim.jsonld |
| build-views.py | JSON-LD → View-Aggregationen | m3gim.jsonld | 4 View-JSONs |
| reconcile.py | Wikidata-Reconciliation (noch nicht implementiert) | Indizes | Wikidata-IDs |
| migrate.py | AUGIAS-Export → formatierte Excel (einmalig, abgeschlossen) | AUGIAS-XLSX | Excel |

View-JSONs: `matrix.json`, `kosmos.json` (+ Legacy: `partitur.json`, `sankey.json` — nicht im Frontend verwendet)

**Hinweis**: Archiv und Indizes lesen direkt `m3gim.jsonld`, nicht separate View-JSONs.

Details: siehe [`scripts/README.md`](../scripts/README.md)

## Verzeichnisstruktur

```
data/
├── google-spreadsheet/ # Google Sheets XLSX-Exporte
├── output/             # Generierte Dateien (JSON-LD, View-JSONs)
├── reports/            # Exploration- und Validierungsreports
└── archive-export/     # Originale AUGIAS-Exporte (einmalig)
```

---

## Pipeline-Anforderungen (Iteration 2)

### Normalisierung (automatisch beim Import)

| ID | Was | Details |
|---|---|---|
| **N1** | Spaltennamen-Mapping | Org: "Graz"→"name", Werk: "Rossini"→"name"/"Barber"→"komponist", Ort: "Unnamed: 0"→"m3gim_id" |
| **N2** | Case-Normalisierung | `.lower().strip()` auf typ, rolle, dokumenttyp, bearbeitungsstand |
| **N3** | Datetime-Bereinigung | `1958-04-18 00:00:00` → `1958-04-18` (Excel-Export-Artefakt) |
| **N4** | Leere Zeilen überspringen | 45 Zeilen ohne typ/rolle/name in Verknüpfungen |
| **N5** | Template-Zeilen filtern | archivsignatur="beispiel" |
| **N6** | Wikidata-URI-Validierung | Nur Werte mit `^Q\d+$` bekommen `wd:` Prefix |

### Transformation

| ID | Was | Details |
|---|---|---|
| **T1** | Konvolut-ID | Objekt-ID = `archivsignatur + " " + folio` (wenn Folio vorhanden) |
| **T2** | Komposit-Typ-Decompose | `ort, datum` → separate Ort- + Datum-Verknüpfung |
| **T3** | String-Matching | Verknüpfung `name` → Lookup in Ziel-Index (bestimmt durch `typ`) |
| **T4** | Personen-Kategorie | Aus Personenindex.anmerkung lesen (nicht hardcoded) |
| **T5** | Robuster Date-Parser | ISO, Bereiche, Excel-Artefakte |
| **T6** | Neue Typen verarbeiten | rolle, datum, ensemble |

### Zukünftig

| ID | Was | Details |
|---|---|---|
| **Z1** | Wikidata-Reconciliation | `reconcile.py` — automatisiert für Personen, Orgs, Orte, dann händisch nachbearbeitet |

---

## JSON-LD (RiC-O 1.1)

Namespaces: `rico:` (ICA RiC-O), `m3gim:` (Projektvokabular), `m3gim-dft:` (DocumentaryFormTypes), `m3gim-role:` (Rollen), `wd:` (Wikidata), `skos:`, `xsd:`.

Mapping: archivsignatur → `rico:identifier`, titel → `rico:title`, entstehungsdatum → `rico:date`, dokumenttyp → `rico:hasDocumentaryFormType`, sprache → `rico:hasOrHadLanguage`.

---

## Frontend

Vanilla JS (ES6-Module, kein Framework), D3.js v7 (CDN) fuer Matrix + Kosmos, Inline-SVG-Icons (kein Icon-CDN). Offline-first: alle Daten (~500KB) bei Startup geladen, kein Backend. Kein Build-Tool (Vite aus Iteration 1 entfernt) — direkt auf GitHub Pages.

### Navigation

- **Header**: Titel + 3 Nav-Links (Über, Projekt, Hilfe)
- **Tab-Bar**: 4 Daten-Tabs (Archiv, Indizes, Matrix, Kosmos)
- **Hash-Routing**: `#archiv`, `#indizes`, `#matrix`, `#kosmos`, `#about`, `#projekt`, `#hilfe`

### 4 Daten-Tabs + 3 Info-Seiten

| Tab/Seite | Typ | Datenquelle | Beschreibung |
|---|---|---|---|
| **Archiv** | Datengetriebene View | m3gim.jsonld | Bestand + Chronik (Ort/Person/Werk-Gruppierung), Filter, Inline-Expansion |
| **Indizes** | Datengetriebene View | m3gim.jsonld | 4-Grid: Personen, Organisationen, Orte, Werke mit Detailansicht |
| **Matrix** | D3.js Heatmap | matrix.json | Person x 5-Jahres-Periode, Kategorie-Filter, Drilldown-Panel |
| **Kosmos** | D3.js Force-Graph | kosmos.json | Malaniuk → Komponisten → Rollen, Zoom/Pan, Graduated-Circle-Legende |
| **Über** | Info-Seite | — | Projekttitel, Methodik, Datenstand |
| **Projekt** | Info-Seite | — | Schichten-Modell, Bestandsgruppen, Pipeline |
| **Hilfe** | Info-Seite | — | Bedienung, Datumskonventionen, FAQ |

### Modulstruktur (20 Module)

```
docs/js/
├── main.js              # Einstiegspunkt, Store-Aufbau, Router, Page-Rendering
├── data/
│   ├── loader.js        # Fetch m3gim.jsonld → buildStore()
│   ├── aggregator.js    # Client-seitige Aggregation für Matrix/Kosmos
│   └── constants.js     # DOKUMENTTYP_LABELS, PERSONEN_KATEGORIEN, ZEITRAEUME
├── ui/
│   ├── router.js        # Hash-basierter Router, 4 Tabs + 3 Pages
│   └── detail-panel.js  # Slide-in Sidebar (für Indizes/Matrix/Kosmos)
├── views/
│   ├── archiv.js              # Orchestrator: Toolbar, Toggle, Filter, Counter
│   ├── archiv-bestand.js      # Tektonik: Fonds → Konvolute → Objekte
│   ├── archiv-chronik.js      # Perioden → Ort/Person/Werk Gruppierung
│   ├── archiv-inline-detail.js # Shared Detail-Komponente (Metadaten + Chips)
│   ├── indizes.js             # 4-Grid Index mit Suche und Sortierung
│   ├── matrix.js              # D3 Heatmap + Drilldown-Panel
│   ├── kosmos.js              # D3 Force-Graph + Zoom/Pan
│   ├── about.js               # Über-Seite
│   ├── projekt.js             # Projekt-Seite (Schichten-Modell)
│   └── hilfe.js               # Hilfe-Seite (Bedienung, FAQ)
└── utils/
    ├── dom.js           # el(), clear(), HTML-Helpers
    ├── date-parser.js   # extractYear(), formatDate()
    └── format.js        # formatSignatur(), formatChildSignatur(), ensureArray()
```

**Toter Code** (nicht importiert): `stats-bar.js` — kann entfernt werden.

---

### CSS (8 Dateien)

| Datei | Zweck |
|-------|-------|
| `variables.css` | Design Tokens (Farben, Fonts, Spacing, Layout) |
| `base.css` | Reset, App-Shell, Header-Nav, Footer |
| `components.css` | Tab-Bar, Detail-Panel, Badges, Spinner, Tooltip |
| `archiv.css` | Archiv-Tab: Toolbar, Tabelle, Inline-Detail, Chips, Chronik |
| `indizes.css` | 4-Grid Index-Layout |
| `matrix.css` | Heatmap + Drilldown |
| `kosmos.css` | Force-Graph + Legende + Zoom-Reset |
| `pages.css` | About/Projekt/Hilfe Seiten-Layout |

---

## CI/CD

GitHub Action triggert `build-views.py` bei Push, Deploy auf GitHub Pages. Workflow: `.github/workflows/build-views.yml`.

---

Siehe auch: [→ Datenmodell](03-datenmodell.md) · [→ Design-System](05-design-system.md) · [→ Visualisierungen](06-visualisierungen.md)
