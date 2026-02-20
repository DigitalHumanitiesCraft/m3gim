# M³GIM Scripts

## Ordnerstruktur

```
data/
├── google-spreadsheet/  # Google Sheets XLSX-Exporte
├── output/              # Generierte Dateien (JSON-LD, View-JSONs)
├── reports/             # Exploration- und Validierungsreports
└── archive-export/      # Originale AUGIAS-Exporte (Quelle, einmalig)
```

## Workflow

```
Google Drive (6 Spreadsheets)
    ↓ Download als XLSX → data/google-spreadsheet/
1. explore.py       Datenstruktur analysieren → data/reports/exploration-report.md
2. validate.py      Qualitätsprüfung → data/reports/validation-report.md
3. create-ric-json.py   XLSX → JSON-LD (RiC-O 1.1) → data/output/m3gim.jsonld
4. build-views.py   JSON-LD → View-JSONs → data/output/views/
```

## Abhängigkeiten

```bash
pip install pandas openpyxl
```

---

## explore.py

Analysiert Google-Sheets-Exporte und erzeugt einen Exploration Report. Erster Schritt nach dem Download — zeigt Datenstruktur, Füllgrade, Vokabulare und Probleme.

```bash
python scripts/explore.py                       # data/google-spreadsheet/ (default)
python scripts/explore.py data/google-spreadsheet/export.zip  # ZIP entpacken
python scripts/explore.py data/google-spreadsheet/            # Ordner direkt
```

### Erwartete Dateien

| Datei | Inhalt |
|-------|--------|
| M3GIM-Objekte.xlsx | Hauptbestand (255), Plakate (26), Tonträger (1) |
| M3GIM-Verknüpfungen.xlsx | Kontextuelle Verknüpfungen (1.292) |
| M3GIM-Personenindex.xlsx | Personen-Normdaten (296) |
| M3GIM-Organisationsindex.xlsx | Organisations-Normdaten (58) |
| M3GIM-Ortsindex.xlsx | Orts-Normdaten (31) |
| M3GIM-Werkindex.xlsx | Werk-Normdaten (95) |

### Analyse-Umfang

- Spaltenheader und -typen pro Tabelle
- Füllgrade pro Spalte
- Vokabular-Inventar (alle Werte für kontrollierte Felder)
- Signatur-Analyse (Format, Duplikate, Bestandsgruppen)
- Datums-Analyse (ISO, Bereiche, Artefakte, verdächtige Werte)
- Cross-Table-Checks (referentielle Integrität)
- Spaltennamen-Shift-Erkennung (bekannte Probleme aus Indizes)

### Ausgabe

`data/reports/exploration-report.md`

---

## migrate.py

Transformiert Archiv-Export (AUGIAS) nach Google Sheets Excel-Format mit Dropdown-Validierung. Einmaliger Schritt, bereits abgeschlossen.

```bash
python scripts/migrate.py
```

### Eingabe/Ausgabe

| Quelle | Ziel |
|--------|------|
| `data/archive-export/Nachlass Malaniuk.xlsx` (182) | `data/processed/M3GIM-Objekte.xlsx` (208) |
| `data/archive-export/Nachlass Malaniuk Plakate.xlsx` (25) | ↑ integriert |
| `data/archive-export/Nachlass Malaniuk Tonträger.xlsx` (1) | ↑ integriert |

### Transformationen

| Funktion | Transformation |
|----------|----------------|
| `convert_date` | `19580418` → `1958-04-18` |
| `convert_date_range` | Zwei Daten → `1958-04-18/1958-04-30` |
| `map_dokumenttyp` | Systematikgruppe + Keywords → dokumenttyp |
| `map_zugaenglichkeit` | Sperrfrist/gesperrt_bis → offen/eingeschraenkt/gesperrt |
| `map_scan_status` | Filename vorhanden → gescannt/nicht_gescannt |
| `split_protokoll` | `AV/UR/18.09.2015` → bearbeiter + erfassungsdatum |

---

## validate.py

Prüft die Google Sheets Excel-Exporte und erzeugt einen Markdown-Report.

```bash
python scripts/validate.py
```

### Eingabe

| Datei | Beschreibung |
|-------|--------------|
| `data/google-spreadsheet/M3GIM-Objekte.xlsx` | Hauptbestand, Plakate, Tonträger |
| `data/google-spreadsheet/M3GIM-Verknüpfungen.xlsx` | Relationen |

### Ausgabe

`data/reports/validation-report.md`

### Prüfregeln

| Code | Level | Beschreibung |
|------|-------|--------------|
| E001 | ERROR | Doppelte Signatur |
| E002 | ERROR | Ungültiges Signaturformat |
| E003 | ERROR | Pflichtfeld leer (archivsignatur) |
| E004 | ERROR | Ungültiger Vokabularwert |
| E005 | ERROR | Verknüpfung ohne existierendes Objekt |
| W001 | WARNING | Pflichtfeld leer (titel) |
| W002 | WARNING | Ungültiges Datumsformat |
| W003 | WARNING | Unbekannte Rolle |

### Exit-Code

- `0` = Validierung erfolgreich (nur Warnungen)
- `1` = Fehler gefunden (Export blockiert)

---

## create-ric-json.py

Erzeugt JSON-LD im Records in Contexts (RiC-O) Format.

```bash
python scripts/create-ric-json.py
```

### Eingabe

| Datei | Beschreibung |
|-------|--------------|
| `data/google-spreadsheet/M3GIM-Objekte.xlsx` | Objekte |
| `data/google-spreadsheet/M3GIM-Verknüpfungen.xlsx` | Relationen |
| `data/google-spreadsheet/*index.xlsx` | Normdaten (Personen, Orte, Werke, Organisationen) |

### Ausgabe

`data/output/m3gim.jsonld`

### RiC-O Mapping

| M³GIM-Feld | RiC-O Property |
|------------|----------------|
| archivsignatur | `rico:identifier` |
| titel | `rico:title` |
| entstehungsdatum | `rico:date` |
| dokumenttyp | `rico:hasDocumentaryFormType` |
| umfang | `rico:hasExtent` |
| beschreibung | `rico:scopeAndContent` |
| person/institution | `rico:hasOrHadAgent` |
| ort | `rico:hasOrHadLocation` |
| werk/ereignis | `rico:hasOrHadSubject` |

### JSON-LD Context

```json
{
  "rico": "https://www.ica.org/standards/RiC/ontology#",
  "m3gim": "https://dhcraft.org/m3gim/vocab#",
  "wd": "http://www.wikidata.org/entity/"
}
```
