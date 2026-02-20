# Systemarchitektur und Pipeline

> Kanonische Quelle fuer technische Architektur, Datenfluss und Ausfuehrungsverantwortung.

## Architekturuebersicht

### Laufzeitmodell

- **Erfassung:** Google-Sheets-Exporte als XLSX in `data/google-spreadsheet/`
- **Verarbeitung:** Python-Skripte in `scripts/`
- **Bereitstellung:** JSON/JSON-LD in `docs/data/`
- **Praesentation:** Statische SPA in `docs/` (Vanilla JS + D3 v7)

### Toolchain (Ist-Stand)

- Kein produktiver Build-Tool-Zwang (kein Vite-Produktionspfad)
- Frontend als ES-Module direkt im Browser
- D3 v7 via CDN
- Hosting: GitHub Pages

## Verzeichnis- und Komponentenstruktur

### Relevante Top-Level-Pfade

- `docs/` Frontend und ausgelieferte Daten
- `scripts/` Datenpipeline
- `data/` Rohdaten, Reports, Pipeline-Output
- `knowledge/` kanonische Wissensbasis + Archive

### Frontend-Module (Ist-Zustand)

- 18 JS-Module unter `docs/js/`
- 9 CSS-Dateien unter `docs/css/`
- 4 statische HTML-Seiten: `docs/about.html`, `docs/projekt.html`, `docs/modell.html`, `docs/hilfe.html`
- Einstieg: `docs/js/main.js`
- Routing: `docs/js/ui/router.js` (3 aktive Tabs: archiv, indizes, korb; 2 ausgeblendet: matrix, kosmos)
- Info-Seiten: Eigenstaendige HTML-Dateien (kein JS, kein Store), verlinkt aus SPA-Header
- Dataloading/Store: `docs/js/data/loader.js`
- Wissenskorb: `docs/js/ui/korb.js` (sessionStorage-Persistenz)

## Pipeline

### Skriptverantwortung

| Script | Zweck | Input | Output |
|---|---|---|---|
| `scripts/explore.py` | Datenexploration und Strukturdiagnostik | XLSX-Exporte | `data/reports/exploration-report.md` |
| `scripts/validate.py` | Validierung und Qualitaetschecks | XLSX-Exporte | `data/reports/validation-report.md` |
| `scripts/transform.py` | Transformation nach JSON-LD (RiC-O + m3gim) | XLSX-Exporte | `data/output/m3gim.jsonld` |
| `scripts/build-views.py` | View-spezifische Aggregationen | JSON-LD | `data/output/views/*.json` |
| `scripts/migrate.py` | Legacy-Migration (AUGIAS -> Arbeitsformat) | Archive-Export | `data/processed/*.xlsx` |

### Datenfluss

1. XLSX-Export aus Google Sheets nach `data/google-spreadsheet/`
2. Exploration und Validierung (`explore.py`, `validate.py`)
3. Modelltransformation nach `data/output/m3gim.jsonld`
4. View-Aggregation nach `data/output/views/`
5. Bereitstellung in `docs/data/`

## CI/CD

- Workflow: `.github/workflows/build-views.yml`
- Trigger: Push auf `data/output/m3gim.jsonld` oder `scripts/build-views.py`
- Aktion: Rebuild der View-JSONs und Commit von Aenderungen in `docs/data/`

## Pipeline-Korrekturen (Session 10)

- Spaltennamen-Normalisierung: `df.columns = [c.lower().strip() ...]` nach `pd.read_excel()` in `transform.py` und `validate.py`
- Bearbeitungsstand-Werte: `vollstaendig/Erledigt -> abgeschlossen`, `begonnen -> begonnen`, `zurueckgestellt -> zurueckgestellt`
- Store: `unprocessedIds` (Set) — Records ohne Links UND ohne Bearbeitungsstand

## Store-Struktur (aus loader.js)

```
store = {
  fonds,                           // Fonds-Node (RecordSet mit type=Fonds)
  konvolute: Map<id, RecordSet>,   // 3 Eintraege
  records: Map<id, Record>,        // Alle 282 Records inkl. Folios
  allRecords: Array<Record>,       // 279 (Folios gefiltert)
  byYear: Map<year, Record[]>,
  byDocType: Map<typeId, Record[]>,
  bySignatur: Map<sig, Record>,
  persons: Map<name, {records, roles, kategorie, wikidata}>,
  organizations: Map<name, {records, roles, wikidata}>,
  locations: Map<name, {records, roles}>,
  works: Map<name, {records, komponist, wikidata}>,
  konvolutChildren: Map<konvolutId, childIds[]>,
  childToKonvolut: Map<childId, konvolutId>,
  konvolutMeta: Map<konvolutId, {title, dateDisplay, childCount, ...}>,
  folioIds: Set<folioId>,
  recordCount, konvolutCount, exportDate
}
```

Archiv und Indizes lesen direkt aus `m3gim.jsonld` (via Store), nicht aus separaten View-JSONs.

## Dateien in docs/data/

| Datei | Format | Status |
|-------|--------|--------|
| `m3gim.jsonld` | JSON-LD | Primaere Datenquelle fuer Archiv + Indizes |
| `matrix.json` | JSON | Personen × Zeitraeume × Kategorien (Matrix-View) |
| `kosmos.json` | JSON | Zentrum + Komponisten + Werke (Kosmos-View) |
| `partitur.json` | JSON | Legacy — wird erzeugt, aber nicht konsumiert |
| `sankey.json` | JSON | Legacy — wird erzeugt, aber nicht konsumiert |

## Dokumentation-vs-Code: verbindliche Klarstellungen

- `reconcile.py` ist geplant, aber im Repository derzeit nicht vorhanden.
- `partitur.json` und `sankey.json` werden erzeugt, im aktuellen Frontend jedoch nicht konsumiert (Legacy).
- Historische Vite-/package.json-Referenzen gelten nicht als kanonischer Laufzeitpfad.
- `migrate.py` wurde in Session 15 entfernt (Legacy-Migration abgeschlossen).

## Schnittstellenvertrag

- Kanonische Systemaussagen fuer Architekturentscheidungen stehen in dieser Datei.
- Detailmapping fuer Ontologie und Datenvokabulare steht in `knowledge/Daten/Datenmodell und Ontologie.md`.
- Operative Priorisierung und offene Arbeiten stehen in `knowledge/Prozess/Operativer Plan.md`.
- Architekturentscheidungen (E-01 bis E-30) stehen in `knowledge/Prozess/Entscheidungen.md`.
- Datenqualitaets-Baseline steht in `knowledge/Prozess/Datenqualitaet-Baseline.md`.
