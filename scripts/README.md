# M³GIM Scripts

## Ordnerstruktur

```
data/
├── google-spreadsheet/  # Google Sheets XLSX-Exporte (6 Dateien)
├── output/              # Generierte Dateien
│   ├── m3gim.jsonld     # JSON-LD (RiC-O 1.1 + m3gim)
│   └── views/           # 4 View-JSONs fuer Frontend
├── reports/             # Exploration- und Validierungsreports
└── archive-export/      # Originale AUGIAS-Exporte (Quelle, einmalig)
```

## Workflow

```
Google Drive (6 Spreadsheets)
    ↓ Download als XLSX → data/google-spreadsheet/
1. explore.py      Datenstruktur analysieren  → data/reports/exploration-report.md
2. validate.py     Qualitaetspruefung         → data/reports/validation-report.md
3. transform.py    XLSX → JSON-LD (RiC-O)     → data/output/m3gim.jsonld
4. build-views.py  JSON-LD → View-JSONs       → data/output/views/
```

## Abhaengigkeiten

```bash
pip install pandas openpyxl
```

---

## explore.py

Analysiert Google-Sheets-Exporte und erzeugt einen Exploration Report. Erster Schritt nach dem Download — zeigt Datenstruktur, Fuellgrade, Vokabulare und Probleme.

```bash
python scripts/explore.py
python scripts/explore.py data/google-spreadsheet/export.zip
```

Ausgabe: `data/reports/exploration-report.md`

---

## migrate.py

Transformiert Archiv-Export (AUGIAS) nach Google Sheets Excel-Format. Einmaliger Schritt, bereits abgeschlossen.

```bash
python scripts/migrate.py
```

---

## validate.py

Prueft die Google Sheets Excel-Exporte und erzeugt einen Markdown-Report. Normalisiert Daten vor der Validierung (.lower().strip(), Datetime-Artefakte).

```bash
python scripts/validate.py
```

Eingabe: `data/google-spreadsheet/M3GIM-Objekte.xlsx`, `M3GIM-Verknuepfungen.xlsx`, 4 Index-Dateien
Ausgabe: `data/reports/validation-report.md`
Exit-Code: 0 = erfolgreich, 1 = Fehler

Pruefregeln: E001 Duplikat, E002 Signaturformat, E003 Pflichtfeld, E004 Vokabular, E005 Referenz, W001 Titel leer, W002 Datum, W004 Index-Eintrag fehlt

---

## transform.py

Erzeugt JSON-LD im RiC-O 1.1 Format mit m3gim-Erweiterungen. Baut Konvolut-Hierarchie (Fonds → RecordSet → Record), matched Verknuepfungen gegen Indizes.

```bash
python scripts/transform.py
```

Eingabe: alle 6 XLSX aus `data/google-spreadsheet/`
Ausgabe: `data/output/m3gim.jsonld`

JSON-LD Context: rico, m3gim, m3gim-dft, m3gim-role, wd, skos, xsd

---

## build-views.py

Generiert 4 View-spezifische JSON-Dateien aus dem JSON-LD fuer die Frontend-Visualisierungen.

```bash
python scripts/build-views.py
```

Eingabe: `data/output/m3gim.jsonld`
Ausgabe: `data/output/views/partitur.json`, `matrix.json`, `kosmos.json`, `sankey.json`
