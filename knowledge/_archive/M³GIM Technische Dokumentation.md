# M³GIM Technische Dokumentation

## 1. Systemübersicht

### Dreistufige Architektur

| Stufe        | Funktion                            | Technologie               |
| ------------ | ----------------------------------- | ------------------------- |
| Erfassung    | Dateneingabe durch Projektteam      | Google Sheets             |
| Verarbeitung | Validierung, Reconciliation, Export | Python, OpenRefine        |
| Präsentation | Webbasierte Darstellung             | GitHub Pages, Bootstrap 5 |

### Technologiestack

- **Erfassung.** Google Sheets mit Dropdown-Validierung und bedingter Formatierung
- **Verarbeitung.** Python 3.11+, pandas, jsonschema, OpenRefine
- **Serialisierung.** JSON-LD basierend auf Records in Contexts (RiC)
- **Frontend.** HTML5, Bootstrap 5, JavaScript (Vanilla)
- **Hosting.** GitHub Pages (statisch), perspektivisch Zenodo für Archivierung

### Repository-Struktur

```
m3gim/
├── data/
│   ├── archive-export/      # Originale Archivexporte
│   ├── processed/           # Bereinigte Daten nach Migration
│   └── output/              # JSON-LD Export
├── scripts/
│   ├── migrate.py           # Migration Archivexport → Google Sheets
│   ├── validate.py          # Validierung der Erfassungsdaten
│   └── export.py            # Export zu JSON-LD
├── docs/
│   └── index.html           # Frontend
├── schemas/
│   └── m3gim-schema.json    # JSON Schema für Validierung
└── README.md
```

## 2. Archivexport

### Herkunft

Die Archivexporte stammen aus zwei Systemen des Universitätsarchivs der KUG Graz.

| System | Funktion | Exportformat |
|---|---|---|
| AUGIAS | Archivverwaltung | Excel (XLSX) |
| ALMA | Bibliothekskatalog | Excel (XLSX) mit MARC21-Struktur |

**Erhalt.** 14.01.2026 von Wolfgang Madl (Universitätsarchiv KUG)

### Exportdateien

| Datei | Größe | Inhalt | Datensätze |
|---|---|---|---|
| Nachlass Malaniuk.xlsx | 56,1 KB | Hauptbestand | 182 |
| Nachlass Malaniuk Fotos.xlsx | 41,7 KB | Fotografien | 228 |
| Nachlass Malaniuk Plakate.xlsx | 15,7 KB | Plakate | 25 |
| Nachlass Malaniuk Tonträger.xlsx | 11,4 KB | AV-Medien | 1 |
| Monographie_marc21_Felder.xlsx | 9,8 KB | MARC21-Referenz | – |
| Handschrift_marc21_Felder.xlsx | 9,2 KB | MARC21-Referenz | – |

**Speicherort.** `data/archive-export/`

### MARC21-Referenzdateien

Die beiden MARC21-Dateien sind keine Bestandsdaten, sondern Strukturbeispiele aus ALMA. Sie dokumentieren das Katalogisierungsschema für Monografien und Handschriften im KUG-System. Für das M³GIM-Projekt sind sie als Referenz für die Interpretation von ALMA-Exportfeldern relevant.

## 3. Signaturenschemata

### Übersicht

| Bestandsgruppe | Schema | Regex | Beispiel |
|---|---|---|---|
| Hauptbestand | UAKUG/NIM_XXX | `^UAKUG/NIM_\d{3}$` | UAKUG/NIM_028 |
| Fotografien | UAKUG/NIM_FS_XXX | `^UAKUG/NIM_FS_\d{3}$` | UAKUG/NIM_FS_047 |
| Plakate | UAKUG/NIM/PL_XX | `^UAKUG/NIM/PL_\d{2}$` | UAKUG/NIM/PL_01 |
| Tonträger | UAKUG/NIM_TT_XX | `^UAKUG/NIM_TT_\d{2}$` | UAKUG/NIM_TT_01 |

### Besonderheiten

**Plakate.** Verwenden einen Schrägstrich vor PL statt Unterstrich. Diese Inkonsistenz stammt aus dem Archiv und wird beibehalten.

**Nummerierung.** Hauptbestand und Fotografien verwenden dreistellige Nummern (001–999), Plakate und Tonträger zweistellige (01–99).

### Validierungsfunktion (Python)

```python
import re

PATTERNS = {
    'hauptbestand': r'^UAKUG/NIM_\d{3}$',
    'fotos': r'^UAKUG/NIM_FS_\d{3}$',
    'plakate': r'^UAKUG/NIM/PL_\d{2}$',
    'tontraeger': r'^UAKUG/NIM_TT_\d{2}$'
}

def validate_signatur(signatur: str) -> str | None:
    """Gibt den Bestandstyp zurück oder None bei ungültiger Signatur."""
    for typ, pattern in PATTERNS.items():
        if re.match(pattern, signatur):
            return typ
    return None
```

## 4. Feldmapping Archivexport → M³GIM

### Hauptbestand (19 Spalten)

| Exportfeld | M³GIM-Feld | Transformation |
|---|---|---|
| Archivsignatur | archivsignatur | direkt |
| Heft-Nr./Box-Nr. | box_nr | Integer-Extraktion |
| Titel | titel | direkt |
| Datierung von/bis | entstehungsdatum | Datumskonvertierung |
| Dat. - Findbuch | – | nicht übernommen (redundant) |
| Systematikgruppe 1 | dokumenttyp | Vokabular-Mapping |
| Enthält | → Verknüpfungstabelle | als Anmerkung |
| Darin | → Verknüpfungstabelle | als Anmerkung |
| Umfang | umfang | direkt |
| Verzeichnungsstufe | – | nicht übernommen (alle "Einzelstück") |
| Anmerkung | → Verknüpfungstabelle | als Anmerkung |
| Sperrfrist/gesperrt bis | zugaenglichkeit | Mapping auf Vokabular |
| AV-Standort | – | nicht übernommen (internes Feld) |
| Verzeichnungsprotokoll | bearbeiter, erfassungsdatum | aufsplitten |
| Filename/Speicherort | scan_status | Prüfung ob Digitalisat vorhanden |

**Felder ohne Entsprechung im Export (manuell ergänzen)**

- datierungsevidenz
- sprache

### Fotografien (21 Spalten)

| Exportfeld | M³GIM-Feld | Transformation |
|---|---|---|
| alte Archiv-Sign. | alte_signatur | direkt |
| Archivsignatur | archivsignatur | direkt |
| Datierung von/bis | entstehungsdatum | Datumskonvertierung |
| Dat. => Findbuch | – | nicht übernommen |
| Titel | titel | direkt |
| Beschreibung | beschreibung | direkt |
| Stichwörter | stichwoerter | direkt |
| Fotograf | fotograf | direkt |
| Rechte | rechte | direkt |
| Überlieferungsgeschichte | → Verknüpfungstabelle | als Anmerkung |
| Fototyp | fototyp | Mapping (s/w → sw, Farbfoto → farbe) |
| Format | format | direkt |
| Filename | filename | direkt |
| Ort der Aufnahme | aufnahmeort | direkt |
| Fotobox-Nr. | fotobox_nr | Integer-Extraktion |

### Plakate (12 Spalten)

Plakate werden in der Objekttabelle mit dokumenttyp "plakat" erfasst.

| Exportfeld | M³GIM-Feld | Transformation |
|---|---|---|
| Archivsignatur | archivsignatur | direkt |
| Datierung von/bis | entstehungsdatum | Datumskonvertierung |
| Titel | titel | direkt |
| Enthält | → Verknüpfungstabelle | als Anmerkung |
| Format | umfang | direkt |
| Material | → Verknüpfungstabelle | als detail |
| Mappen-Nr. | box_nr | Integer-Extraktion |

### Tonträger (18 Spalten)

Tonträger werden in der Objekttabelle mit dokumenttyp "tontraeger" erfasst.

| Exportfeld | M³GIM-Feld | Transformation |
|---|---|---|
| Archivsignatur | archivsignatur | direkt |
| Art des Tonträgers | → Verknüpfungstabelle | als detail |
| Titel | titel | direkt |
| Track/Untertitel | → Verknüpfungstabelle | als Anmerkung |
| beteiligte Personen | → Verknüpfungstabelle | als person (erwähnt) |
| Inhalt | → Verknüpfungstabelle | als Anmerkung |
| Urheberrecht | zugaenglichkeit | Mapping |
| Ort der Veranstaltung | → Verknüpfungstabelle | als ort |
| Datum/Uhrzeit/Dauer | entstehungsdatum, → detail | aufsplitten |

## 5. Systematikgruppen-Mapping

Die Systematikgruppen des Archivs müssen auf das M³GIM-Vokabular für dokumenttyp gemappt werden.

### Mapping-Tabelle

| Systematikgruppe (Archiv) | dokumenttyp (M³GIM) | Regel |
|---|---|---|
| Berufliche Tätigkeit | *differenziert* | nach Inhalt (siehe unten) |
| Dokumente | *differenziert* | nach Inhalt (siehe unten) |
| Korrespondenzen | korrespondenz | direkt |
| Sammlungen | sammlung | direkt |

### Differenzierung "Berufliche Tätigkeit"

| Enthält-Vermerk (Schlüsselwörter) | dokumenttyp |
|---|---|
| Vertrag, Engagement, Gage | vertrag |
| Programm, Programmheft, Programmzettel | programm |
| Kritik, Rezension, Besprechung | presse |
| Repertoire, Rollenliste | repertoire |
| Lebenslauf, Biografie | autobiografie |

### Differenzierung "Dokumente"

| Enthält-Vermerk (Schlüsselwörter) | dokumenttyp |
|---|---|
| Pass, Ausweis, Visum | identitaetsdokument |
| Zeugnis, Diplom, Urkunde | identitaetsdokument |
| Studien, Noten, Partituren | studienunterlagen |

### Entscheidungslogik (Python)

```python
def map_dokumenttyp(systematikgruppe: str, enthaelt: str) -> str:
    """Mappt Archiv-Systematik auf M³GIM-dokumenttyp."""
    
    if systematikgruppe == "Korrespondenzen":
        return "korrespondenz"
    if systematikgruppe == "Sammlungen":
        return "sammlung"
    
    enthaelt_lower = (enthaelt or "").lower()
    
    keywords = {
        "vertrag": ["vertrag", "engagement", "gage", "honorar"],
        "programm": ["programm", "programmheft", "programmzettel"],
        "presse": ["kritik", "rezension", "besprechung", "artikel"],
        "repertoire": ["repertoire", "rollenliste", "partien"],
        "autobiografie": ["lebenslauf", "biografie", "vita"],
        "identitaetsdokument": ["pass", "ausweis", "visum", "zeugnis", "diplom"],
        "studienunterlagen": ["studien", "noten", "partitur"]
    }
    
    for typ, words in keywords.items():
        if any(word in enthaelt_lower for word in words):
            return typ
    
    # Fallback
    return "sammlung"
```

### Offene Fälle

Dokumente, die keiner Kategorie zugeordnet werden können, werden mit dokumenttyp "sammlung" erfasst und im Erfassungsworkshop manuell geprüft.

## 6. Datumskonvertierung

### Archivformat

Das Archiv verwendet das Format YYYYMMDD (z.B. 19440101 für 1. Januar 1944). Zeiträume werden als zwei durch Bindestrich getrennte Werte angegeben (z.B. 19440101-19450815).

### Zielformat

M³GIM verwendet ISO 8601 mit folgenden Varianten:

| Typ | Format | Beispiel |
|---|---|---|
| Vollständiges Datum | YYYY-MM-DD | 1944-01-01 |
| Jahr und Monat | YYYY-MM | 1944-01 |
| Nur Jahr | YYYY | 1944 |
| Zeitraum | YYYY/YYYY oder YYYY-MM-DD/YYYY-MM-DD | 1944/1945 |
| Circa | circa:YYYY | circa:1958 |
| Vor | vor:YYYY | vor:1958 |
| Nach | nach:YYYY | nach:1958 |

### Konvertierungslogik (Python)

```python
import re

def convert_date(archiv_date: str) -> str:
    """Konvertiert Archivdatum zu ISO 8601."""
    
    if not archiv_date or archiv_date.strip() == "":
        return ""
    
    archiv_date = str(archiv_date).strip()
    
    # Zeitraum (zwei Daten mit Bindestrich)
    if "-" in archiv_date and len(archiv_date) > 8:
        parts = archiv_date.split("-")
        if len(parts) == 2:
            start = convert_single_date(parts[0])
            end = convert_single_date(parts[1])
            return f"{start}/{end}"
    
    return convert_single_date(archiv_date)

def convert_single_date(d: str) -> str:
    """Konvertiert einzelnes Archivdatum."""
    
    d = d.strip()
    
    # Vollständiges Datum YYYYMMDD
    if re.match(r'^\d{8}$', d):
        return f"{d[:4]}-{d[4:6]}-{d[6:8]}"
    
    # Jahr und Monat YYYYMM
    if re.match(r'^\d{6}$', d):
        return f"{d[:4]}-{d[4:6]}"
    
    # Nur Jahr YYYY
    if re.match(r'^\d{4}$', d):
        return d
    
    # Bereits ISO-Format
    if re.match(r'^\d{4}-\d{2}(-\d{2})?$', d):
        return d
    
    return d  # Unverändert zurückgeben
```

### Qualifier

Qualifier für unsichere Datierungen werden manuell bei der Erfassung ergänzt. Das Archivexport enthält keine strukturierten Unsicherheitsangaben.

## 7. Google-Sheets-Konfiguration

### Tabellenarchitektur

| Tabelle | Funktion | Farbcodierung | Spaltenanzahl |
|---|---|---|---|
| M3GIM-Objekte | Hauptbestand, Plakate, Tonträger | Blau | 12 |
| M3GIM-Fotos | Fotografien | Orange | 16 |
| M3GIM-Verknuepfungen | Verknüpfungen und Details | Grün | 6 |
| M3GIM-Personenindex | Personen | Violett | 5 |
| M3GIM-Organisationsindex | Organisationen | Violett | 5 |
| M3GIM-Ortsindex | Orte | Violett | 5 |
| M3GIM-Werkindex | Werke | Violett | 5 |

### M3GIM-Objekte

**Spalten (A–L)**

| Spalte | Feld | Dropdown | Validierung |
|---|---|---|---|
| A | archivsignatur | – | Regex, eindeutig |
| B | box_nr | – | Integer 1–17 |
| C | titel | – | – |
| D | entstehungsdatum | – | ISO 8601 |
| E | datierungsevidenz | ✓ | aus_dokument, erschlossen, extern, unbekannt |
| F | dokumenttyp | ✓ | siehe Vokabular |
| G | sprache | ✓ | de, uk, en, fr, it |
| H | umfang | – | – |
| I | zugaenglichkeit | ✓ | offen, eingeschraenkt, gesperrt |
| J | scan_status | ✓ | nicht_gescannt, gescannt, online |
| K | bearbeiter | – | – |
| L | erfassungsdatum | – | YYYY-MM-DD |

**Bedingte Formatierung**

- Leere Pflichtfelder (A, C) rot hinterlegen
- Ungültige Datumsformate orange hinterlegen

### M3GIM-Fotos

**Spalten (A–P)**

| Spalte | Feld | Dropdown | Validierung |
|---|---|---|---|
| A | archivsignatur | – | Regex NIM_FS_XXX, eindeutig |
| B | alte_signatur | – | – |
| C | fotobox_nr | – | Integer |
| D | titel | – | – |
| E | entstehungsdatum | – | ISO 8601 |
| F | datierungsevidenz | ✓ | aus_dokument, erschlossen, extern, unbekannt |
| G | beschreibung | – | – |
| H | stichwoerter | – | Semikolon-getrennt |
| I | fotograf | – | – |
| J | fototyp | ✓ | sw, farbe, digital |
| K | format | – | – |
| L | aufnahmeort | – | – |
| M | rechte | – | – |
| N | filename | – | – |
| O | bearbeiter | – | – |
| P | erfassungsdatum | – | YYYY-MM-DD |

### M3GIM-Verknuepfungen

**Spalten (A–F)**

| Spalte | Feld | Dropdown | Validierung |
|---|---|---|---|
| A | archivsignatur | – | Muss in Objekt- oder Fototabelle existieren |
| B | typ | ✓ | person, ort, institution, ereignis, werk, detail |
| C | name | – | – |
| D | rolle | ✓ | abhängig von typ (siehe Datenmodell) |
| E | datum | – | ISO 8601 |
| F | anmerkung | – | – |

**Abhängige Dropdown-Validierung**

Die Werte für "rolle" (Spalte D) hängen vom Wert in "typ" (Spalte B) ab. Dies kann in Google Sheets über INDIRECT-Formeln oder Apps Script realisiert werden.

### Indextabellen (einheitliche Struktur)

**Spalten (A–E)**

| Spalte | Feld | Beschreibung |
|---|---|---|
| A | m3gim_id | Projektinterne ID (P1, O1, L1, W1) |
| B | name / titel | Ansetzungsform |
| C | wikidata_id | Q-ID oder leer |
| D | Zusatzfeld | lebensdaten / ort / land / komponist |
| E | anmerkung | Freitext |

## 8. Migrationsworkflow

### Datenflussdiagramm

```
Archivexporte (XLSX)
        ↓
    [migrate.py]
        ↓
Bereinigte Daten (CSV)
        ↓
    Import in Google Sheets
        ↓
M3GIM-Objekte + M3GIM-Fotos
        ↓
    Manuelle Erfassung (Ergänzungen)
        ↓
    [validate.py]
        ↓
    Fehlerreport
        ↓
    Korrekturen
        ↓
    [export.py]
        ↓
    JSON-LD (RiC-konform)
```

### Migrationsscript (Spezifikation)

**Eingabe**

- `data/archive-export/Nachlass Malaniuk.xlsx`
- `data/archive-export/Nachlass Malaniuk Fotos.xlsx`
- `data/archive-export/Nachlass Malaniuk Plakate.xlsx`
- `data/archive-export/Nachlass Malaniuk Tonträger.xlsx`

**Ausgabe**

- `data/processed/objekte.csv` (Hauptbestand + Plakate + Tonträger)
- `data/processed/fotos.csv`
- `data/processed/migration_log.txt`

**Transformationen**

1. Feldmapping gemäß Abschnitt 4
2. Datumskonvertierung gemäß Abschnitt 6
3. Systematikgruppen-Mapping gemäß Abschnitt 5
4. Bereinigung von Whitespace und Sonderzeichen
5. Generierung leerer Spalten für fehlende Pflichtfelder

**Fehlerbehandlung**

- Ungültige Signaturen → Log-Eintrag, Zeile wird trotzdem migriert
- Nicht mappbare Systematikgruppen → Fallback "sammlung", Log-Eintrag
- Ungültige Datumsformate → Originalwert beibehalten, Log-Eintrag

### Validierung nach Migration

Nach dem Import in Google Sheets prüft validate.py folgende Regeln:

- Eindeutigkeit der Signaturen
- Gültigkeit aller Dropdown-Werte
- Referentielle Integrität (Verknüpfungen verweisen auf existierende Objekte)
- Vollständigkeit der Pflichtfelder

## 9. Reconciliation

### Wikidata-Abgleich

Die Reconciliation erfolgt nachträglich, nicht während der Erfassung. Ziel ist die Anreicherung der Indextabellen mit Wikidata-IDs.

### OpenRefine-Workflow

1. Export der Indextabellen als CSV
2. Import in OpenRefine
3. Reconciliation gegen Wikidata
   - Personen: `wdt:P31 wd:Q5` (instance of human)
   - Orte: `wdt:P31 wd:Q515` (instance of city) oder breiter
   - Organisationen: `wdt:P31 wd:Q43229` (instance of organization)
   - Werke: `wdt:P31 wd:Q7725634` (instance of musical work)
4. Manuelle Prüfung der Matches
5. Export und Rückführung in Google Sheets

### Umgang mit Nicht-Treffern

Entitäten ohne Wikidata-Eintrag behalten eine leere wikidata_id. Die projektinterne m3gim_id gewährleistet die Referenzierbarkeit unabhängig von externen Normdaten.

## 10. Validierung und Qualitätssicherung

### Python-Validierungsscript

```python
# validate.py (Grundstruktur)

import pandas as pd
from typing import List, Dict

def validate_objekte(df: pd.DataFrame) -> List[Dict]:
    """Validiert die Objekttabelle."""
    errors = []
    
    # Eindeutigkeit Signaturen
    duplicates = df[df['archivsignatur'].duplicated()]
    for _, row in duplicates.iterrows():
        errors.append({
            'typ': 'DUPLICATE',
            'feld': 'archivsignatur',
            'wert': row['archivsignatur'],
            'zeile': row.name
        })
    
    # Dropdown-Validierung
    valid_dokumenttyp = ['autobiografie', 'korrespondenz', 'vertrag', ...]
    invalid = df[~df['dokumenttyp'].isin(valid_dokumenttyp)]
    for _, row in invalid.iterrows():
        errors.append({
            'typ': 'INVALID_VALUE',
            'feld': 'dokumenttyp',
            'wert': row['dokumenttyp'],
            'zeile': row.name
        })
    
    return errors
```

### Prüfregeln

| Regel | Tabelle | Schwere |
|---|---|---|
| Signatur eindeutig | Objekte, Fotos | Fehler |
| Signatur-Format gültig | Objekte, Fotos | Fehler |
| Dropdown-Wert gültig | alle | Fehler |
| Verknüpfung existiert | Verknüpfungen | Fehler |
| Pflichtfeld ausgefüllt | Objekte, Fotos | Warnung |
| Datumsformat gültig | alle | Warnung |
| Index-Eintrag vorhanden | Verknüpfungen | Warnung |

### Fehlerreports

Der Validierungsreport wird als CSV exportiert und enthält:

- Fehlertyp (DUPLICATE, INVALID_VALUE, MISSING_REFERENCE, etc.)
- Betroffenes Feld
- Fehlerhafter Wert
- Zeilennummer
- Schweregrad (Fehler/Warnung)

## 11. Export und Serialisierung

### JSON-LD-Schema

Der Export folgt dem Records in Contexts Ontology (RiC-O) Standard.

```json
{
  "@context": {
    "rico": "https://www.ica.org/standards/RiC/ontology#",
    "m3gim": "https://dhcraft.org/m3gim/vocab#",
    "wd": "http://www.wikidata.org/entity/"
  },
  "@graph": [
    {
      "@id": "m3gim:NIM_028",
      "@type": "rico:Record",
      "rico:identifier": "UAKUG/NIM_028",
      "rico:title": "Gastvertrag Bayerische Staatsoper München",
      "rico:date": "1958-04-18",
      "rico:hasDocumentaryFormType": {
        "@id": "m3gim:vertrag"
      },
      "rico:hasOrHadSubject": [
        { "@id": "wd:Q94208" },
        { "@id": "wd:Q681931" }
      ]
    }
  ]
}
```

### RiC-Konformität

| M³GIM-Feld | RiC-O Property |
|---|---|
| archivsignatur | rico:identifier |
| titel | rico:title |
| entstehungsdatum | rico:date |
| dokumenttyp | rico:hasDocumentaryFormType |
| umfang | rico:hasExtent |
| person (verknüpft) | rico:hasOrHadSubject |
| ort (verknüpft) | rico:hasOrHadLocation |

## 12. Frontend

### GitHub Pages

Die statische Website wird über GitHub Pages gehostet. Der Build-Prozess generiert HTML aus den JSON-LD-Daten.

### Bootstrap 5

Das Frontend verwendet Bootstrap 5 für responsives Layout und Komponenten.

### Such- und Filterfunktionen

| Funktion | Beschreibung |
|---|---|
| Volltextsuche | Durchsucht Titel, Beschreibung, Anmerkungen |
| Filterung nach dokumenttyp | Dropdown-Auswahl |
| Filterung nach Zeitraum | Datumsbereich-Slider |
| Filterung nach Personen | Autocomplete aus Personenindex |
| Sortierung | Nach Signatur, Datum, Titel |

### Visualisierungen (perspektivisch)

- Zeitleiste der Karrierestationen
- Netzwerkgraph der Personenbeziehungen
- Karte der Aufführungsorte

## 13. Deployment und Hosting

### GitHub-Repository

- **URL.** github.com/DigitalHumanitiesCraft/m3gim
- **Branch-Strategie.** main (produktiv), develop (Entwicklung)
- **CI/CD.** GitHub Actions für Validierung und Deployment

### Digitalisate-Hosting

| Option | Vorteile | Nachteile |
|---|---|---|
| Uni-Server (bevorzugt) | Institutionelle Anbindung, DSGVO | Abhängigkeit von IT |
| Internet Archive | Kostenfrei, persistent | Keine Zugriffskontrolle |
| GAMS | Langzeitarchivierung, Standards | Aufwand für Integration |

Die Entscheidung erfolgt nach Abstimmung mit der KUG-IT.

### Zenodo-Archivierung

Nach Projektabschluss werden die finalen Daten (JSON-LD, Dokumentation) auf Zenodo archiviert und erhalten einen DOI.

## 14. Offene Punkte (technisch)

| Thema | Status | Priorität |
|---|---|---|
| Migrationsscript | Spezifikation fertig, Implementierung ausstehend | hoch |
| Google Sheet M3GIM-Fotos | Struktur definiert, Erstellung ausstehend | hoch |
| JSON Schema | formalisieren | mittel |
| Frontend-Prototyp | nach Datenerfassung | mittel |
| CI/CD Pipeline | nach Repository-Setup | niedrig |

---

*Version 1.0 – 2026-01-14*

**Änderungsprotokoll**

- v1.0: Initiale Version, konsolidiert aus Project Overview v1.9 und Datenmodell v1.5