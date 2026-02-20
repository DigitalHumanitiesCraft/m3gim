# Technische Architektur

> Dreistufig: Erfassung (Google Sheets) → Verarbeitung (Python 3.11+) → Präsentation (D3.js v7, GitHub Pages)

---

## Workflow

```
Google Drive (6 Spreadsheets als XLSX)
    ↓ Download als XLSX → data/google-spreadsheet/
explore.py          → data/reports/exploration-report.md
validate.py         → data/reports/validation-report.md
create-ric-json.py  → data/output/m3gim.jsonld
build-views.py      → data/output/views/*.json
    ↓ CI/CD
docs/data/*.json    → GitHub Pages Frontend
```

## Pipeline (6 Python-Scripts)

| Script | Funktion | Input | Output |
|---|---|---|---|
| explore.py | Datenstruktur-Analyse | data/google-spreadsheet/ | exploration-report.md |
| validate.py | Datenqualitaetspruefung + Normalisierung | 6 XLSX + 4 Indizes | validation-report.md |
| transform.py | Google Sheets → JSON-LD (RiC-O 1.1 + m3gim) | 6 XLSX | m3gim.jsonld |
| build-views.py | JSON-LD → View-Aggregationen | m3gim.jsonld | 4 View-JSONs |
| reconcile.py | Wikidata-Reconciliation (noch nicht implementiert) | Indizes | Wikidata-IDs |
| migrate.py | AUGIAS-Export → formatierte Excel (einmalig, abgeschlossen) | AUGIAS-XLSX | Excel |

View-JSONs: `partitur.json`, `matrix.json`, `kosmos.json`, `sankey.json`

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
| **N1** | Spaltennamen-Mapping | Org: "Graz"→"name", Werk: "Rossini"→"titel"/"Barber"→"komponist", Ort: "Unnamed: 0"→"m3gim_id" |
| **N2** | Case-Normalisierung | `.lower().strip()` auf typ, rolle, dokumenttyp, bearbeitungsstand |
| **N3** | Datetime-Bereinigung | `1958-04-18 00:00:00` → `1958-04-18` (Excel-Export-Artefakt) |
| **N4** | Leere Zeilen überspringen | 18 Zeilen ohne typ/rolle/name in Verknüpfungen |
| **N5** | Template-Zeilen filtern | archivsignatur="beispiel" |

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

Mapping: archivsignatur → `rico:identifier`, titel → `rico:title`, entstehungsdatum → `rico:date`, dokumenttyp → `rico:hasDocumentaryFormType`.

---

## Frontend

Vanilla JS (ES6-Module, kein Framework), D3.js v7 für alle Visualisierungen, Lucide Icons (CDN). Offline-first: alle Daten (~500KB) bei Startup geladen, kein Backend.

---

## CI/CD

GitHub Action triggert `build-views.py` bei Push, Deploy auf GitHub Pages. Workflow: `.github/workflows/build-views.yml`.

---

Siehe auch: [→ Datenmodell](03-datenmodell.md) · [→ Design-System](05-design-system.md) · [→ Visualisierungen](06-visualisierungen.md)
