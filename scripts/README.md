# M³GIM Scripts

## migrate.py

Transformiert Archiv-Export nach Google Sheets Excel-Format mit Dropdown-Validierung.

```bash
pip install pandas openpyxl
python scripts/migrate.py
```

### Eingabe/Ausgabe

| Quelle | Ziel |
|--------|------|
| `data/archive-export/Nachlass Malaniuk.xlsx` (182) | `data/output/M3GIM-Objekte.xlsx` (208) |
| `data/archive-export/Nachlass Malaniuk Plakate.xlsx` (25) | ↑ integriert |
| `data/archive-export/Nachlass Malaniuk Tonträger.xlsx` (1) | ↑ integriert |
| `data/archive-export/Nachlass Malaniuk Fotos.xlsx` (228) | `data/output/M3GIM-Fotos.xlsx` (228) |

### Transformationen

| Funktion | Transformation |
|----------|----------------|
| `convert_date` | `19580418` → `1958-04-18` |
| `convert_date_range` | Zwei Daten → `1958-04-18/1958-04-30` |
| `map_dokumenttyp` | Systematikgruppe + Keywords → dokumenttyp |
| `map_zugaenglichkeit` | Sperrfrist/gesperrt_bis → offen/eingeschraenkt/gesperrt |
| `map_scan_status` | Filename vorhanden → gescannt/nicht_gescannt |
| `map_fototyp` | s/w→sw, Farbfoto→farbe, PDF→digital |
| `split_protokoll` | `AV/UR/18.09.2015` → bearbeiter + erfassungsdatum |

### Excel-Formatierung

- Header: fett, blau (#4472C4), eingefroren
- Spaltenbreiten: automatisch (max 50)
- Dropdowns: dokumenttyp, sprache, zugaenglichkeit, scan_status, fototyp, datierungsevidenz
