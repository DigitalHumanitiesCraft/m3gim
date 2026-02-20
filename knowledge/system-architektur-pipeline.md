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

- 21 JS-Module unter `docs/js/`
- 9 CSS-Dateien unter `docs/css/`
- Einstieg: `docs/js/main.js`
- Routing: `docs/js/ui/router.js` (5 Tabs: archiv, indizes, matrix, kosmos, korb)
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

## Dokumentation-vs-Code: verbindliche Klarstellungen

- `reconcile.py` ist geplant, aber im Repository derzeit nicht vorhanden.
- `partitur.json` und `sankey.json` werden erzeugt, im aktuellen Frontend jedoch nicht als aktive Hauptansichten genutzt.
- Historische Vite-/package.json-Referenzen gelten nicht als kanonischer Laufzeitpfad.

## Schnittstellenvertrag

- Kanonische Systemaussagen fuer Architekturentscheidungen stehen in dieser Datei.
- Detailmapping fuer Ontologie und Datenvokabulare steht in `knowledge/datenmodell-ontologie.md`.
- Operative Priorisierung und offene Arbeiten stehen in `knowledge/operativer-plan-claude.md`.
