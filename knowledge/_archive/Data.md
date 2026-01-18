# M³GIM Datenstruktur

## Übersicht

Zwei Datenquellen müssen zusammengeführt werden:

| Quelle | Ordner | Inhalt |
|--------|--------|--------|
| Archiv-Export | `data/archive-export/` | Rohdaten aus Universitätsarchiv (4 Excel-Dateien) |
| Google Sheets | `data/google-spreadsheet/` | Zielstruktur mit Normdaten (6 Excel-Dateien) |

---

## 1. Archiv-Export (Quelldaten)

Nachlass Ira Malaniuk (UAKUG) - ukrainisch-österreichische Opernsängerin (1919-2009).

| Datei | Anzahl | Signatur-Schema |
|-------|--------|-----------------|
| Nachlass Malaniuk.xlsx | 182 | `UAKUG/NIM_###` |
| Nachlass Malaniuk Fotos.xlsx | 228 | `UAKUG/NIM_FS_###` |
| Nachlass Malaniuk Plakate.xlsx | 25 | `UAKUG/NIM/PL_##` |
| Nachlass Malaniuk Tonträger.xlsx | 1 | `UAKUG/NIM_TT_##` |

**Gesamt: 436 Objekte** | Zeitraum: 1930-2010

### Wichtige Quellfelder

```
Archivsignatur       → archivsignatur
Datierung von/bis    → entstehungsdatum (YYYYMMDD → ISO 8601)
Titel                → titel
Systematikgruppe 1   → dokumenttyp (mit Mapping)
Enthält              → für Typ-Bestimmung
Umfang               → umfang
Sperrfrist           → zugaenglichkeit
Filename             → scan_status
Verzeichnungsprotokoll → bearbeiter + erfassungsdatum
```

---

## 2. Google Sheets (Zielstruktur)

### M3GIM-Objekte.xlsx
Haupttabelle für alle Archivstücke (aktuell 3 Beispieldatensätze).

| Spalte | Typ | Beispiel |
|--------|-----|----------|
| archivsignatur | ID | UAKUG/NIM_028 |
| box_nr | Zahl | 1 |
| titel | Text | Gastvertrag Bayerische Staatsoper... |
| entstehungsdatum | ISO-Datum | 1958-04-18 |
| datierungsevidenz | Vokabular | aus_dokument, erschlossen, extern, unbekannt |
| dokumenttyp | Vokabular | vertrag, korrespondenz, presse, programm... |
| sprache | ISO-Code | de, uk, en, fr, it |
| umfang | Text | 2 Blatt |
| zugaenglichkeit | Vokabular | offen, eingeschraenkt, gesperrt |
| scan_status | Vokabular | nicht_gescannt, gescannt, online |
| bearbeiter | Text | - |
| erfassungsdatum | ISO-Datum | - |

### M3GIM-Personenindex.xlsx
Normdatei für Personen (10 Einträge).

| Spalte | Beispiel |
|--------|----------|
| m3gim_id | P1, P2, P3... |
| name | Malaniuk, Ira |
| wikidata_id | Q94208 |
| lebensdaten | 1919–2009 |
| anmerkung | Mezzosopranistin |

### M3GIM-Ortsindex.xlsx
Normdatei für Orte (5 Einträge).

| Spalte | Beispiel |
|--------|----------|
| m3gim_id | L1, L2... |
| name | München |
| wikidata_id | Q1726 |
| land | Deutschland |

### M3GIM-Werkindex.xlsx
Normdatei für Werke (6 Einträge).

| Spalte | Beispiel |
|--------|----------|
| m3gim_id | W1, W2... |
| titel | Julius Cäsar |
| wikidata_id | Q729645 |
| komponist | Händel, Georg Friedrich |

### M3GIM-Organisationsindex.xlsx
Normdatei für Institutionen (5 Einträge).

| Spalte | Beispiel |
|--------|----------|
| m3gim_id | O1, O2... |
| name | Bayerische Staatsoper |
| wikidata_id | Q681931 |
| ort | München |

### M3GIM-Verknüpfungen.xlsx
Relationstabelle zwischen Objekten und Normdaten (35 Einträge).

| Spalte | Werte |
|--------|-------|
| archivsignatur | Verweis auf Objekt |
| typ | person, ort, institution, werk, ereignis |
| name | Name der verknüpften Entität |
| rolle | vertragspartner, interpretin, erwähnt, verfasser... |
| datum | ISO-Datum (optional) |
| anmerkung | Zusatzinfo |

---

## 3. Migrationsaufgabe

### Was existiert
- 3 Beispiel-Objekte in Google Sheets (manuell erfasst)
- 35 Verknüpfungen zu diesen 3 Objekten
- Normdaten-Indizes mit ersten Einträgen

### Was fehlt
- 433 weitere Objekte aus Archiv-Export
- Fotos-Tabelle (228 Einträge) fehlt komplett
- Erweiterte Normdaten (Personen, Orte, Werke aus allen Objekten)
- Verknüpfungen für alle migrierten Objekte

### Transformationen laut context.md
1. **Datumsformat:** YYYYMMDD → YYYY-MM-DD
2. **Systematikgruppe → dokumenttyp:** Keyword-basiertes Mapping
3. **Verzeichnungsprotokoll aufsplitten:** "AV/UR/WM/18.09.2015" → bearbeiter + erfassungsdatum
4. **Sperrfrist → zugaenglichkeit:** Logik nach Datum
5. **Filename → scan_status:** Vorhanden = gescannt

---

## 4. Datenmodell (Entity-Relationship)

```
┌─────────────────┐
│     Objekte     │
│  archivsignatur │◄──────────────┐
└────────┬────────┘               │
         │                        │
         │ 1:n                    │
         ▼                        │
┌─────────────────┐               │
│  Verknüpfungen  │               │
│  archivsignatur │───────────────┘
│  typ            │
│  name           │──────┐
│  rolle          │      │
└─────────────────┘      │
                         │ n:1
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Personen   │  │    Orte     │  │   Werke     │
│  m3gim_id   │  │  m3gim_id   │  │  m3gim_id   │
│  wikidata   │  │  wikidata   │  │  wikidata   │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## 5. Kontrollierte Vokabulare

### dokumenttyp
autobiografie, korrespondenz, vertrag, programm, presse, repertoire, studienunterlagen, identitaetsdokument, plakat, tontraeger, sammlung

### datierungsevidenz
aus_dokument, erschlossen, extern, unbekannt

### zugaenglichkeit
offen, eingeschraenkt, gesperrt

### scan_status
nicht_gescannt, gescannt, online

### sprache
de, uk, en, fr, it

### fototyp
sw, farbe, digital

### Verknüpfungs-Typen
person, ort, institution, werk, ereignis

### Verknüpfungs-Rollen
vertragspartner, interpretin, verfasser, adressat, erwähnt, unterzeichner, vermittler, veranstalter, entstehungsort, zielort, wohnort, vertragsort, auffuehrungsort, auftritt, premiere, rahmenveranstaltung, implizit

---

## 6. Ausgabeformat: Excel mit Formatierung

Ausgabe als `.xlsx` (nicht CSV), um folgende Features zu nutzen:

### Formatierungen
- **Header-Zeile:** Fett, eingefroren, Hintergrundfarbe
- **Spaltenbreiten:** Automatisch angepasst
- **Datenvalidierung:** Dropdown-Listen für Vokabular-Felder
- **Bedingte Formatierung:** Farbliche Hervorhebung (z.B. gesperrte Objekte rot)

### Dropdown-Validierung pro Tabelle

**Objekte:**
| Spalte | Dropdown-Werte |
|--------|----------------|
| datierungsevidenz | aus_dokument, erschlossen, extern, unbekannt |
| dokumenttyp | autobiografie, korrespondenz, vertrag, programm, presse, repertoire, studienunterlagen, identitaetsdokument, plakat, tontraeger, sammlung |
| sprache | de, uk, en, fr, it |
| zugaenglichkeit | offen, eingeschraenkt, gesperrt |
| scan_status | nicht_gescannt, gescannt, online |

**Fotos:**
| Spalte | Dropdown-Werte |
|--------|----------------|
| datierungsevidenz | aus_dokument, erschlossen, extern, unbekannt |
| fototyp | sw, farbe, digital |

**Verknüpfungen:**
| Spalte | Dropdown-Werte |
|--------|----------------|
| typ | person, ort, institution, werk, ereignis |
| rolle | vertragspartner, interpretin, verfasser, adressat, erwähnt, unterzeichner, vermittler, veranstalter, entstehungsort, zielort, wohnort, vertragsort, auffuehrungsort, auftritt, premiere, rahmenveranstaltung, implizit |

---

## 7. Migrationsplan

### Phase 1: Skript-Entwicklung
Skripte liegen in `scripts/` mit eigener Dokumentation (`scripts/README.md`).

1. Python-Skript mit `openpyxl` für Excel-Erzeugung
2. Transformationslogik gemäß context.md implementieren
3. Excel-Formatierungen (Header, Spaltenbreiten, Dropdowns)
4. Testlauf mit Validierung

### Phase 2: Datenmigration
1. **Objekte:** 182 Hauptbestand + 25 Plakate + 1 Tonträger → M3GIM-Objekte.xlsx
2. **Fotos:** 228 Einträge → neue M3GIM-Fotos.xlsx
3. Bestehende 3 Beispiel-Objekte beibehalten/aktualisieren

### Phase 3: Google Sheets Import
1. Formatierte Excel-Dateien in Google Drive hochladen
2. Als Google Sheets öffnen (Formatierung wird übernommen)
3. Datenvalidierung in Google Sheets ggf. nachbessern
4. Bestehende Verknüpfungen und Normdaten-Indizes verknüpfen

### Ausgabedateien

```
data/output/
├── M3GIM-Objekte.xlsx      # 208 Zeilen (migriert + formatiert)
├── M3GIM-Fotos.xlsx        # 228 Zeilen (neu)
├── M3GIM-Personenindex.xlsx    # erweitert
├── M3GIM-Ortsindex.xlsx        # erweitert
├── M3GIM-Werkindex.xlsx        # erweitert
├── M3GIM-Organisationsindex.xlsx # erweitert
└── M3GIM-Verknuepfungen.xlsx   # bestehend (manuell gepflegt)
```

### Workflow für Datenerfassung

```
1. Excel aus data/output/ herunterladen
2. Neue Objekte/Verknüpfungen erfassen (Dropdowns nutzen)
3. Excel in Google Sheets hochladen
4. Kollaborative Bearbeitung
5. Export als Excel → zurück ins Repository
```
