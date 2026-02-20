# Technische Architektur

> Dreistufig: Erfassung (Google Sheets) → Verarbeitung (Python 3.11+) → Präsentation (D3.js v7, GitHub Pages)

---

## Workflow

```
Google Drive (6 Spreadsheets als XLSX)
    ↓ Download als ZIP → data/input/
explore.py          → data/reports/exploration-report.md
validate.py         → data/reports/validation-report.md
create-ric-json.py  → data/output/m3gim.jsonld
build-views.py      → data/output/views/*.json
    ↓ CI/CD
docs/data/*.json    → GitHub Pages Frontend
```

## Pipeline (5 Python-Scripts)

| Script | Funktion | Input | Output |
|---|---|---|---|
| explore.py | Datenstruktur-Analyse | data/input/ (XLSX oder ZIP) | exploration-report.md |
| migrate.py | AUGIAS-Export → formatierte Excel (einmalig) | AUGIAS-XLSX | Excel mit Validierung |
| validate.py | Datenqualitätsprüfung | data/input/ XLSX | validation-report.md |
| create-ric-json.py | Google Sheets → JSON-LD (RiC-O 1.1) | 6 XLSX | m3gim.jsonld |
| build-views.py | JSON-LD → View-Aggregationen | m3gim.jsonld | 4 View-JSONs |

View-JSONs: `partitur.json`, `matrix.json`, `kosmos.json`, `sankey.json`

Details: siehe [`scripts/README.md`](../scripts/README.md)

## Verzeichnisstruktur

```
data/
├── input/              # Google Sheets XLSX-Exporte (ZIP entpackt)
├── output/             # Generierte Dateien (JSON-LD, View-JSONs)
├── reports/            # Exploration- und Validierungsreports
└── archive-export/     # Originale AUGIAS-Exporte (einmalig)
```

---

## Pipeline-Anpassungen (v2.3+)

- **P1** Spaltennamen-Mapping: Organisationsindex "Graz"→"name", Werkindex "Rossini"→"titel"/"Barber"→"komponist", Ortsindex fehlender ID-Header
- **P2** Komposit-Typ-Decompose: `ort, datum` → separate Ort- + Datum-Verknüpfung
- **P3** Folio-Feld in JSON-LD aufnehmen
- **P4** Neue Typen `rolle` und `datum` verarbeiten
- **P5** Template-Zeile (archivsignatur="beispiel") filtern
- **P6** Robuster Date-Parser (ISO, Bereiche, Excel-Datetime-Artefakte)
- **P7** Personen-Kategorie aus Personenindex.anmerkung lesen (statt hardcoded)
- **P8** Duplicate-ID-Erkennung (O43/O44)
- **P9** Quellpfad: `data/google-spreadsheet/` statt `data/processed/`

---

## JSON-LD (RiC-O 1.1)

Namespaces: `rico:` (ICA RiC-O), `m3gim:` (Projektvokabular), `m3gim-dft:` (DocumentaryFormTypes).

Mapping: archivsignatur → `rico:identifier`, titel → `rico:title`, entstehungsdatum → `rico:date`, dokumenttyp → `rico:hasDocumentaryFormType`.

---

## Frontend

Vanilla JS (ES6-Module, kein Framework), D3.js v7 für alle Visualisierungen, Lucide Icons (CDN). Offline-first: alle Daten (~500KB) bei Startup geladen, kein Backend.

---

## CI/CD

GitHub Action triggert `build-views.py` bei Push, Deploy auf GitHub Pages. Workflow: `.github/workflows/build-views.yml`.

---

Siehe auch: [→ Datenmodell](03-datenmodell.md) · [→ Design-System](05-design-system.md) · [→ Visualisierungen](06-visualisierungen.md)
