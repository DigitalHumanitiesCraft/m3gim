# M3GIM Scripts

## Pipeline-Workflow

```text
Google Sheets (XLSX in data/google-spreadsheet/)
  -> explore.py      -> data/reports/exploration-report.md
  -> validate.py     -> data/reports/validation-report.md
  -> transform.py    -> data/output/m3gim.jsonld
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

### `migrate.py` (Legacy)

Einmalige Migration fuer fruehere AUGIAS-Exporte.

```bash
python scripts/migrate.py
```

## Hinweise

- `reconcile.py` ist als naechster Schritt geplant, derzeit nicht im Repository vorhanden.
- Reports in `data/reports/` sind generiert und koennen bei erneutem Lauf ueberschrieben werden.
