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
|-- knowledge/                 # Kanonische KB (siehe knowledge/INDEX.md)
|-- data/
|   |-- google-spreadsheet/  # XLSX-Exporte (git-getrackt)
|   |-- output/              # Generierte JSON-LD/View-Daten
|   `-- reports/             # Generierte Markdown-Reports
|-- scripts/                  # explore/validate/reconcile/enrich-wikidata/transform/build-views/report-quality
|-- vocab/                    # Formales Projektvokabular (Turtle) + Abdeckungspruefer, siehe knowledge/domain.md
|-- docs/                     # GitHub Pages Frontend (Vanilla JS, keine Build-Kette)
`-- README.md
```

## Technologiestand

- Datenmodell: RiC-O 1.1 + m3gim-Erweiterungen + AgRelOn
- Pipeline: Python 3.11+ (`pandas`, `openpyxl`, `thefuzz[speedup]`)
- Frontend: Vanilla JS (ES-Module), D3.js v7 als Library, Leaflet fuer den Mobilitaets-Atlas, kein Build-Tool
- Tab-Architektur: sichtbar Bestand · Chronik · Statistik · Indizes · Netzwerk · Wissenskorb; drei Perspektiv-Tabs (Mobilitaets-Atlas, Repertoire, Biogramm) sind aktuell verborgen und werden iterativ reaktiviert. Details in [`knowledge/design.md`](knowledge/design.md) + [`knowledge/specification.md`](knowledge/specification.md)
- Hosting: GitHub Pages
- Normdaten: Wikidata-Q-IDs (Reconciliation via `reconcile.py` + Enrichment via `enrich-wikidata.py`)

Laufende Zahlen (Bestand, Verknuepfungsrate, WD-Coverage) stehen im generierten Quality-Snapshot unter [`data/reports/quality-snapshot.md`](data/reports/quality-snapshot.md), nicht im README.

## Dokumentation

- Einstieg in die KB: [`knowledge/INDEX.md`](knowledge/INDEX.md)
- Aktueller Stand + nächste Schritte: [`knowledge/specification.md`](knowledge/specification.md) § Stand und nächste Schritte
- Architekturentscheidungen: [`knowledge/decisions.md`](knowledge/decisions.md)
- Pipeline: [`knowledge/pipeline.md`](knowledge/pipeline.md)
- Workflow-Regeln fuer Claude-Code-Sessions: [`CLAUDE.md`](CLAUDE.md)

## Licence

- Code: MIT (see [LICENSE](LICENSE)).
- Documentation and knowledge documents (`knowledge/`, `docs/` prose): CC BY 4.0.
- Third-party research data is excluded from these licences and the rights remain with their holders. The digitised archival source material (Teilnachlass Ira Malaniuk) is held by the Universitaetsarchiv der Kunstuniversitaet Graz; individual items carry their own rights notices.
