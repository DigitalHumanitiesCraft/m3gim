# M3GIM Exploration Report

> Generiert: 2026-02-20 18:17
> Quelle: `C:\Users\Chrisi\Documents\GitHub\DHCraft\m3gim\data\google-spreadsheet`

## Executive Summary

- Tabellen erkannt: **6/6**
- Gesamtzeilen: **2026**
- Warnungen: **6**
- Kritische Cross-Checks: **1**

## Tabellenuebersicht

| Tabelle | Datei | Rows | Columns | Warnungen | Status |
|---|---|---|---|---|---|
| objekte | M3GIM-Objekte.xlsx | 282 | 18 | 0 | OK |
| verknuepfungen | M3GIM-Verknüpfungen.xlsx | 1264 | 6 | 1 | WARNUNG |
| personenindex | M3GIM-Personenindex.xlsx | 296 | 6 | 1 | WARNUNG |
| organisationsindex | M3GIM-Organisationsindex.xlsx | 58 | 6 | 1 | WARNUNG |
| ortsindex | M3GIM-Ortsindex.xlsx | 31 | 3 | 2 | WARNUNG |
| werkindex | M3GIM-Werkindex.xlsx | 95 | 6 | 1 | WARNUNG |

## Tabellen im Detail

### objekte

#### Kontext

- Datei: `M3GIM-Objekte.xlsx`
- Sheets: Objekte
- Zeilen: 282
- Spalten: 18

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| box_nr | text | 89.4% | 252/282 |
| archivsignatur | text | 100.0% | 282/282 |
| Unnamed: 2 | text | 27.0% | 76/282 |
| titel | text | 98.9% | 279/282 |
| entstehungsdatum | datum (string) | 86.2% | 243/282 |
| datierungsevidenz | text | 26.2% | 74/282 |
| dokumenttyp | text | 98.9% | 279/282 |
| sprache | text | 26.2% | 74/282 |
| umfang | text | 30.9% | 87/282 |
| bearbeiter | text | 74.5% | 210/282 |
| erfassungsdatum | datum (string) | 89.4% | 252/282 |
| Bearbeitungsstand | text | 24.8% | 70/282 |
| Objekttabelle | text | 25.2% | 71/282 |
| Verknüpfungstabelle | text | 23.0% | 65/282 |
| Werkindex | text | 23.0% | 65/282 |
| Ortsindex | text | 23.4% | 66/282 |
| Organisationsindex | text | 23.0% | 65/282 |
| Personenindex | text | 19.5% | 55/282 |

#### Werteprofile

- **datierungsevidenz** (2): aus_dokument · unbekannt
- **dokumenttyp** (18): autobiografie · biographie · identitaetsdokument · korrespondenz · notiz · photokopie · plakat · presse · programm · quittung · repertoire · repertoireliste · rezension · sammlung · tontraeger · Typoskript · vertrag · visitenkarte
- **sprache** (6): de · de, en, fr · en · en, fr · fr · it
- **Bearbeitungsstand** (9): abgeschlossen · Begonnen · begonnen · begonnen (nur Ira Malaniuk) · Erledigt (Ira Malaniuk betreffend. Rest zurückgestellt) · vollstädig  · vollständig · Vollständig · zurückgestellt

#### Signaturanalyse

- hauptbestand: 255
- plakate: 26
- tontraeger: 1
- unbekannt: 0
- Duplikate: UAKUG/NIM/PL_07, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007

#### Datumsanalyse

- iso: 59
- bereich: 142
- excel_artefakt: 42

### verknuepfungen

#### Kontext

- Datei: `M3GIM-Verknüpfungen.xlsx`
- Sheets: Verknuepfungen
- Zeilen: 1264
- Spalten: 6

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| archivsignatur | text | 99.4% | 1256/1264 |
| Folio | text | 99.3% | 1255/1264 |
| typ | text | 97.9% | 1237/1264 |
| name | text | 98.6% | 1246/1264 |
| rolle | text | 97.9% | 1237/1264 |
| anmerkung | text | 11.3% | 143/1264 |

#### Werteprofile

- **typ** (12): ausgaben, währung · Datum · einnahmen, währung · ensemble · ereignis · institution · ort · ort, datum · person · rolle · summe, währung · werk
- **rolle** (57): abendgage · Abreisedatum · abreiseort · absendedatum · absendeort · adressat:in · agent:in · arrangeur:in · auffuehrungsort · Aufführung · auftrag · auftraggeber:in · auftritt · ausbildungsstätte · ausstatter:in · ausstellungsdatum · Ausstrahlung · bühnenbildner:in · Bühnenleiter:in · choreograph:in · chorleiter:in · dirigent:in · empfangsdatum · empfänger:in · entstehung · entstehungsort · erscheinungsdatum · erwähnt · festvorstellung · fluggesellschaft · ... (+27)

#### Verknuepfungsanalyse

- Typ-Verteilung:
  - person: 519
  - rolle: 215
  - werk: 134
  - ort: 117
  - institution: 100
  - datum: 74
  - ort, datum: 48
  - ausgaben, währung: 11
  - ereignis: 8
  - einnahmen, währung: 8
  - summe, währung: 2
  - ensemble: 1
- Komposit-Typen gesamt: 69
  - `ausgaben, währung`: 11
  - `ort, datum`: 48
  - `einnahmen, währung`: 8
  - `summe, währung`: 2
- Top-10 Objekte nach Verknuepfungsanzahl:
  - UAKUG/NIM_004: 795
  - UAKUG/NIM_007: 426
  - UAKUG/NIM_003: 35

#### Warnungen

- 1 Template-Zeile(n) gefunden (archivsignatur='beispiel')

### personenindex

#### Kontext

- Datei: `M3GIM-Personenindex.xlsx`
- Sheets: Personenindex
- Zeilen: 296
- Spalten: 6

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| m3gim_id | text | 100.0% | 296/296 |
| name | text | 100.0% | 296/296 |
| wikidata_id | text | 1.0% | 3/296 |
| lebensdaten | datum (string) | 6.8% | 20/296 |
| anmerkung | text | 86.8% | 257/296 |
| Unnamed: 5 | text | 0.3% | 1/296 |

#### Werteprofile

- **wikidata_id** (3): K · Q60452 · Q94208
- **lebensdaten** (19): 1838-1875 · 1839-1881 · 1840-1893 · 1854-1928 · 1857-1941 · 1858-1924 · 1881-1945 · 1882-1967 · 1882-1971 · 1888-1965 · 1892-1955 · 1906-1959 · 1906-1997 · 1908-1989 · 1912-1988 · 1916-2010 · 1919-2010 · 1919–2009 · 1922-2023
- **Unnamed: 5** (1): gelb hinterlegt = Vornmame muss noch erruiert werden

#### Indexanalyse

- Fehlende Header: id
- Gefundene Header: m3gim_id, name, wikidata_id, lebensdaten, anmerkung, Unnamed: 5
- Wikidata-Abdeckung: 3/296 (1.0%)

#### Warnungen

- Fehlende Spaltenheader: id (gefunden: m3gim_id, name, wikidata_id, lebensdaten, anmerkung, Unnamed: 5)

### organisationsindex

#### Kontext

- Datei: `M3GIM-Organisationsindex.xlsx`
- Sheets: Organisationsindex
- Zeilen: 58
- Spalten: 6

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| m3gim_id | text | 94.8% | 55/58 |
| Graz | text | 100.0% | 58/58 |
| wikidata_id | text | 6.9% | 4/58 |
| ort | text | 67.2% | 39/58 |
| Assoziierte Person | text | 25.9% | 15/58 |
| anmerkung | text | 27.6% | 16/58 |

#### Werteprofile

- **wikidata_id** (3): nicht verifizierbar · Q157596 · Q681931
- **ort** (19): Bayreuth · Berlin · Berlin-Charlottenburg · Buenos Aires · Düsseldorf · Graz · Hannover · Köln · Monaco · München · Neapel · New York · Paris · Salzburg · Strasbourg · Stuttgart · Wien · Wien? · Zürich
- **Assoziierte Person** (15): Ballhausen, Felix · Bauer, Gerhard · Dr. Joachim Bergfeld · Dr. Kurt Honolka · Dumesnil, René · Helmut, Schmidt-Gasse · ibe · k-e-p · K.H. Ruppert · Karl Schumann · Kühnly, Ernst · Taubmann, Martin H., Altmann, Olga · Wagner, Wolfgang · Warren, Cox · Y.
- **anmerkung** (7): Agentur? · Aktiengesellschaft / Bank · beide Namen haben dieselbe Adresse, daher zusammengefasst · Festival · Fluggesellschaft · Rundfunk · Zeitung

#### Indexanalyse

- Fehlende Header: id, name
- Gefundene Header: m3gim_id, Graz, wikidata_id, ort, Assoziierte Person, anmerkung
- Doppelte IDs: O43, O44
- Zeilen ohne ID: 3
- Wikidata-Abdeckung: 4/58 (6.9%)

#### Warnungen

- Fehlende Spaltenheader: id, name (gefunden: m3gim_id, Graz, wikidata_id, ort, Assoziierte Person, anmerkung)

### ortsindex

#### Kontext

- Datei: `M3GIM-Ortsindex.xlsx`
- Sheets: Ortsindex
- Zeilen: 31
- Spalten: 3

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| Unnamed: 0 | text | 96.8% | 30/31 |
| name | text | 100.0% | 31/31 |
| Bei Erfassung hinzugefügt  | text | 3.2% | 1/31 |

#### Werteprofile

- **Unnamed: 0** (30): L1 · L10 · L11 · L12 · L13 · L14 · L15 · L16 · L17 · L18 · L19 · L2 · L20 · L21 · L22 · L23 · L24 · L25 · L26 · L27 · L28 · L29 · L3 · L30 · L4 · L5 · L6 · L7 · L8 · L9
- **name** (31): Basel · Bayreuth · Berlin · Buenos Aires · Frankfurt · Graz · Hamburg · Köln · Lemberg · Linz · Lissabon  · London · Madrid · Mailand · Monte Carlo · München · Neapel · New York · Paris · Perchtoldsdorf · Potsdam · Rom · Salzburg · Schottland · Stanislau · Straßburg · Stuttgart · Stuttgart  · Venedig · Wien · ... (+1)
- **Bei Erfassung hinzugefügt ** (1): Frankfurt am Main

#### Indexanalyse

- Fehlende Header: id, wikidata_id, koordinaten
- Gefundene Header: Unnamed: 0, name, Bei Erfassung hinzugefügt 

#### Warnungen

- Fehlende Spaltenheader: id, wikidata_id, koordinaten (gefunden: Unnamed: 0, name, Bei Erfassung hinzugefügt )
- Kein ID-Header gefunden

### werkindex

#### Kontext

- Datei: `M3GIM-Werkindex.xlsx`
- Sheets: Werkindex
- Zeilen: 95
- Spalten: 6

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| m3gim_id | text | 89.5% | 85/95 |
| Rossini, Gioachino | text | 98.9% | 94/95 |
| wikidata_id | text | 4.2% | 4/95 |
| Barber, Samuel | text | 90.5% | 86/95 |
| rolle/stimme | text | 36.8% | 35/95 |
| anmerkung | text | 30.5% | 29/95 |

#### Werteprofile

- **wikidata_id** (4): Q190891 · Q309823 · Q723407 · Q729645
- **rolle/stimme** (33): Adelaide · Alt-Solo · Amneris · Aufseherin · Azucena · Brangäne · Carmen · Dorabella · Engel · Gaea · Hausfrau · Judith · Kabanicha · keine Rollenangabe · Lady Macbeth · Maddalena · Magdalena · Magdalene · Marfa · Marina · Octavian · ohne Angabe · Olga und Filipjewna · Orpheus · Ortrud · Quickly und Meg · Salome · Sextus (Hosenrolle) · Suzuki · Ulrika · ... (+3)
- **anmerkung** (12): Bartok, Bela  (UAKUG/NIM_007_2) · Geistliche Lieder, Spanisches Liederbuch · Mozart, Wolfgang (UAKUG/NIM_007_4) · Oper · Schumann, Robert (UAKUG/NIM_007_6) · Sprache des Werktitels noch unklar (Vereinheitlichung notwendig!) · Strauss, Richard (UAKUG/NIM_007_4) · Strauss, Strauss (UAKUG/NIM_007_2) · Ukrainisches Lied · Wagner, Richard (UAKUG/NIM_007_4) · Wagner, Richard (UAKUG/NIM_007_5_1) · Weltliche Lieder, Spanisches Liederbuch

#### Indexanalyse

- Fehlende Header: id, titel, komponist
- Gefundene Header: m3gim_id, Rossini, Gioachino, wikidata_id, Barber, Samuel, rolle/stimme, anmerkung
- Zeilen ohne ID: 10
- Wikidata-Abdeckung: 4/95 (4.2%)

#### Warnungen

- Fehlende Spaltenheader: id, titel, komponist (gefunden: m3gim_id, Rossini, Gioachino, wikidata_id, Barber, Samuel, rolle/stimme, anmerkung)

## Cross-Table-Checks

### VerknÃ¼pfungen â†’ Objekte [WARNUNG]

VerknÃ¼pfungen referenzieren existierende Objekte

- Verwaiste Signaturen (1): beispiel

## Abschluss

- Tabellen erkannt: 6/6
- Gesamt-Zeilen: 2026
- Warnungen: 6
- Cross-Table-Checks: 1