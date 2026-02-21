# M3GIM Scripts

## Pipeline-Workflow

```text
Google Sheets (XLSX in data/google-spreadsheet/)
  -> explore.py      -> data/reports/exploration-report.md
  -> validate.py     -> data/reports/validation-report.md
  -> transform.py    -> data/output/m3gim.jsonld
  -> reconcile.py    -> data/output/wikidata-reconciliation.json
  -> build-views.py  -> data/output/views/*.json
```

## Abhaengigkeiten

```bash
pip install pandas openpyxl
```

## Skripte

### `explore.py`

Analysiert Struktur, Fuellgrade, Vokabulare und Auffaelligkeiten der XLSX-Exporte.

```bash
python scripts/explore.py
python scripts/explore.py data/google-spreadsheet/export.zip
```

Output: `data/reports/exploration-report.md`

### `validate.py`

Validiert Pflichtfelder, Formate und Referenzierbarkeit; erzeugt Fehler/Warnungen fuer den Erfassungsprozess.

```bash
python scripts/validate.py
```

Output: `data/reports/validation-report.md`

### `transform.py`

Transformiert Tabellen nach JSON-LD auf Basis RiC-O 1.1 und m3gim-Erweiterungen.

```bash
python scripts/transform.py
```

Output: `data/output/m3gim.jsonld`

### `build-views.py`

Erzeugt View-spezifische JSON-Dateien aus JSON-LD.

```bash
python scripts/build-views.py
```

Output: `data/output/views/partitur.json`, `matrix.json`, `kosmos.json`, `sankey.json`

### `audit-data.py`

Validiert Alignment zwischen Quelldaten (XLSX), JSON-LD und Frontend-Views. Prueft Record-Vollstaendigkeit, Verknuepfungstypen, View-Konsistenz, Datenqualitaet und Handreichungs-Compliance.

```bash
python scripts/audit-data.py
```

Output: Konsolenreport mit Fehler/Warnungs-Zaehlung.

### `reconcile.py`

Wikidata-Reconciliation fuer die 4 Index-Tabellen. Sucht ueber die Wikidata Search API und traegt Q-IDs ein bei exaktem Label-Match + P31-Verifikation (Personen: Q5, Orte: geographic entities, Organisationen: organisations, Werke: musical works). Ergebnisse als JSON-Datei, die manuell geprueft und ins Google Sheet uebertragen wird.

```bash
python scripts/reconcile.py                  # alle 4 Indizes
python scripts/reconcile.py --type person    # nur Personen
python scripts/reconcile.py --dry-run        # nur Namen auflisten
```

Output: `data/output/wikidata-reconciliation.json`

## Hinweise

- Reports in `data/reports/` sind generiert und koennen bei erneutem Lauf ueberschrieben werden.
