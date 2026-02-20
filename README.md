# M3GIM: Mapping Mobile Musicians

Digitale Erschliessung des Teilnachlasses Ira Malaniuk (UAKUG/NIM) am Universitaetsarchiv der KUG Graz.

**Live:** [dhcraft.org/m3gim](https://dhcraft.org/m3gim)

## Repository-Zweck

Dieses Repository enthaelt:

- die Datenpipeline (`scripts/*.py`)
- das statische Frontend (`docs/`)
- die kanonische Knowledge Base (`knowledge/`)

## Struktur

```text
m3gim/
|-- knowledge/                 # Kanonische KB + Archive + Anhaenge
|-- data/
|   |-- google-spreadsheet/   # XLSX-Exporte (Arbeitsstand)
|   |-- output/               # Generierte JSON-LD/View-Daten
|   `-- reports/              # Generierte Markdown-Reports
|-- scripts/                  # Explore/Validate/Transform/View-Build
|-- docs/                     # GitHub Pages Frontend + ausgelieferte Daten
|-- .github/workflows/        # CI fuer View-Daten-Build
|-- MEETING-2026-02-24.md
`-- README.md
```

## Technologiestand (Ist)

- Datenmodell: RiC-O 1.1 + m3gim-Erweiterungen
- Pipeline: Python 3.11+ (`pandas`, `openpyxl`)
- Frontend: Vanilla JS (ES-Module), D3.js v7
- Hosting: GitHub Pages
- Normdaten: Wikidata-Q-IDs (Reconciliation als naechster Schritt)

## Dokumentation

- Einstieg in die KB: [knowledge/README.md](knowledge/README.md)
- Pipeline-Workflow: [scripts/README.md](scripts/README.md)
- Nachvollziehbarkeit: [knowledge/traceability-matrix.md](knowledge/traceability-matrix.md)

## Lizenz

- Code: MIT
- Daten und Dokumentation: CC BY 4.0
- Quellenmaterial: siehe Einzelrechtevermerke
