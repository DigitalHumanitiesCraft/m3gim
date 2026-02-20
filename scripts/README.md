# M³GIM Scripts

## Ordnerstruktur

```
data/
├── archive-export/          # Originale Archivexporte (Quelle)
├── google-spreadsheet/      # Excel-Exporte aus Google Sheets (Erfassungsdaten)
├── processed/               # Von migrate.py erzeugte Excel-Dateien
├── export/                  # JSON-LD für Website/Archivierung
└── reports/                 # Validierungsreports
```

## Workflow

```
1. migrate.py           Archiv-Export → data/processed/ (einmalig)
2. [Manuelle Erfassung in Google Sheets]
3. [Export aus Google Drive → data/google-spreadsheet/]
4. validate.py          Prüft Daten → data/reports/
5. create-ric-json.py   Erzeugt JSON-LD → data/export/
```

## Abhängigkeiten

```bash
pip install pandas openpyxl
```

---

## migrate.py

Transformiert Archiv-Export nach Google Sheets Excel-Format mit Dropdown-Validierung.

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

### Excel-Formatierung

- Header: fett, blau (#4472C4), eingefroren
- Spaltenbreiten: automatisch (max 50)
- Dropdowns: dokumenttyp, sprache, zugaenglichkeit, scan_status, datierungsevidenz

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
| `data/google-spreadsheet/M3GIM-*index.xlsx` | Normdaten (Personen, Orte, Werke, Organisationen) |

### Ausgabe

`data/export/m3gim.jsonld`

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
