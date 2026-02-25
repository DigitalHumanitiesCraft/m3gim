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
|-- knowledge/                 # Kanonische KB (7 Docs + Appendices + Archive)
|-- data/
|   |-- google-spreadsheet/   # XLSX-Exporte (Arbeitsstand)
|   |-- output/               # Generierte JSON-LD/View-Daten
|   `-- reports/              # Generierte Markdown-Reports
|-- scripts/                  # Explore/Validate/Transform/Build-Views/Reconcile
|-- docs/                     # GitHub Pages Frontend + ausgelieferte Daten
`-- README.md
```

## Technologiestand

- Datenmodell: RiC-O 1.1 + m3gim-Erweiterungen
- Pipeline: Python 3.11+ (`pandas`, `openpyxl`)
- Frontend: Vanilla JS (ES-Module), D3.js v7, 6 aktive Tabs
- Hosting: GitHub Pages
- Normdaten: Wikidata-Q-IDs (Reconciliation via `reconcile.py`, 171 Matches)

## Dokumentation

- Einstieg in die KB: [knowledge/README.md](knowledge/README.md)
- Entscheidungen: [knowledge/entscheidungen.md](knowledge/entscheidungen.md)
- Pipeline: [knowledge/pipeline.md](knowledge/pipeline.md)

## Lizenz

- Code: MIT
- Daten und Dokumentation: CC BY 4.0
- Quellenmaterial: siehe Einzelrechtevermerke
