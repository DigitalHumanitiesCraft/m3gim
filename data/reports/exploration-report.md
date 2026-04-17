# M3GIM Exploration Report

> Generiert: 2026-04-16 20:48
> Quelle: `data\source-v2`

## Executive Summary

- Tabellen erkannt: **6/6**
- Gesamtzeilen: **2398**
- Warnungen: **5**
- Kritische Cross-Checks: **1**

## Tabellenuebersicht

| Tabelle | Datei | Rows | Columns | Warnungen | Status |
|---|---|---|---|---|---|
| objekte | M3GIM-Objekte.xlsx | 381 | 18 | 0 | OK |
| verknuepfungen | M3GIM-Verknüpfungen.xlsx | 1445 | 7 | 0 | OK |
| personenindex | M3GIM-Personenindex.xlsx | 328 | 6 | 1 | WARNUNG |
| organisationsindex | M3GIM-Organisationsindex.xlsx | 75 | 6 | 1 | WARNUNG |
| ortsindex | M3GIM-Ortsindex.xlsx | 32 | 3 | 2 | WARNUNG |
| werkindex | M3GIM-Werkindex.xlsx | 137 | 6 | 1 | WARNUNG |

## Tabellen im Detail

### objekte

#### Kontext

- Datei: `M3GIM-Objekte.xlsx`
- Sheets: Objekte
- Zeilen: 381
- Spalten: 18

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| box_nr | text | 99.7% | 380/381 |
| archivsignatur | text | 100.0% | 381/381 |
| folio nr | text | 46.2% | 176/381 |
| titel | text | 77.4% | 295/381 |
| entstehungsdatum | datum (string) | 67.2% | 256/381 |
| datierungsevidenz | text | 23.6% | 90/381 |
| dokumenttyp | text | 77.4% | 295/381 |
| sprache | text | 23.6% | 90/381 |
| umfang | text | 24.7% | 94/381 |
| bearbeiter | text | 59.3% | 226/381 |
| erfassungsdatum | datum (string) | 70.3% | 268/381 |
| Bearbeitungsstand | text | 21.3% | 81/381 |
| Objekttabelle | text | 22.8% | 87/381 |
| Verknüpfungstabelle | text | 22.0% | 84/381 |
| Werkindex | text | 22.0% | 84/381 |
| Ortsindex | text | 22.3% | 85/381 |
| Organisationsindex | text | 22.0% | 84/381 |
| Personenindex | text | 19.4% | 74/381 |

#### Werteprofile

- **datierungsevidenz** (3): aus_dokument · erschlossen · unbekannt
- **dokumenttyp** (18): autobiografie · biographie · identitaetsdokument · korrespondenz · notiz · photokopie · plakat · presse · programm · quittung · repertoire · repertoireliste · rezension · sammlung · tontraeger · Typoskript · vertrag · visitenkarte
- **sprache** (6): de · de, en, fr · en · en, fr · fr · it
- **Bearbeitungsstand** (10): abgeschlossen · Begonnen · begonnen · begonnen (nur Ira Malaniuk) · erledigt · Erledigt (Ira Malaniuk betreffend. Rest zurückgestellt) · vollständig · Vollständig · zurückgestellt · Zurückgestellt

#### Signaturanalyse

- hauptbestand: 354
- plakate: 26
- tontraeger: 1
- unbekannt: 0
- Duplikate: UAKUG/NIM/PL_07, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011

#### Datumsanalyse

- iso: 60
- bereich: 143
- excel_artefakt: 53

### verknuepfungen

#### Kontext

- Datei: `M3GIM-Verknüpfungen.xlsx`
- Sheets: Verknuepfungen
- Zeilen: 1445
- Spalten: 7

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| archivsignatur | text | 99.7% | 1441/1445 |
| Folio | text | 96.5% | 1394/1445 |
| datenpunkt_id | numerisch | 0.1% | 2/1445 |
| typ | text | 95.8% | 1384/1445 |
| name | text | 95.7% | 1383/1445 |
| rolle | text | 95.7% | 1383/1445 |
| anmerkung | text | 10.2% | 148/1445 |

#### Werteprofile

- **datenpunkt_id** (2): 1.0 · 2.0
- **typ** (12): ausgaben, währung · Datum · einnahmen, währung · ensemble · ereignis · institution · ort · ort, datum · person · rolle · summe, währung · werk
- **rolle** (59): abendgage · Abreisedatum · abreiseort · absendedatum · absendeort · adressat:in · agent:in · arbeitgeber:in · arrangeur:in · auffuehrungsort · Aufführung · auftrag · auftraggeber:in · auftritt · ausbildungsstätte · ausstatter:in · ausstellungsdatum · Ausstrahlung · bühnenbildner:in · Bühnenleiter:in · choreograph:in · chorleiter:in · dirigent:in · empfangsdatum · empfänger:in · entstehung · entstehungsort · erscheinungsdatum · erwähnt · festvorstellung · ... (+29)

#### Verknuepfungsanalyse

- Typ-Verteilung:
  - person: 585
  - rolle: 221
  - werk: 171
  - ort: 126
  - institution: 114
  - datum: 77
  - ort, datum: 60
  - ausgaben, währung: 11
  - ereignis: 8
  - einnahmen, währung: 8
  - summe, währung: 2
  - ensemble: 1
- Komposit-Typen gesamt: 81
  - `ausgaben, währung`: 11
  - `ort, datum`: 60
  - `einnahmen, währung`: 8
  - `summe, währung`: 2
- Top-10 Objekte nach Verknuepfungsanzahl:
  - UAKUG/NIM_004: 817
  - UAKUG/NIM_007: 426
  - UAKUG/NIM_11: 116
  - UAKUG/NIM_003: 35
  - UAKUG/NIM_005: 31
  - UAKUG/NIM_006: 16

### personenindex

#### Kontext

- Datei: `M3GIM-Personenindex.xlsx`
- Sheets: Personenindex
- Zeilen: 328
- Spalten: 6

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| m3gim_id | text | 99.7% | 327/328 |
| name | text | 97.9% | 321/328 |
| wikidata_id | text | 0.9% | 3/328 |
| lebensdaten | datum (string) | 6.1% | 20/328 |
| anmerkung | text | 85.4% | 280/328 |
| Unnamed: 5 | text | 0.3% | 1/328 |

#### Werteprofile

- **wikidata_id** (3): K · Q60452 · Q94208
- **lebensdaten** (19): 1838-1875 · 1839-1881 · 1840-1893 · 1854-1928 · 1857-1941 · 1858-1924 · 1881-1945 · 1882-1967 · 1882-1971 · 1888-1965 · 1892-1955 · 1906-1959 · 1906-1997 · 1908-1989 · 1912-1988 · 1916-2010 · 1919-2010 · 1919–2009 · 1922-2023
- **Unnamed: 5** (1): gelb hinterlegt = Vornmame muss noch erruiert werden

#### Indexanalyse

- Fehlende Header: id
- Gefundene Header: m3gim_id, name, wikidata_id, lebensdaten, anmerkung, Unnamed: 5
- Doppelte IDs: P293, P290, P295, P289, P288, P291, P287, P296, P294, P286, P292
- Zeilen ohne ID: 1
- Wikidata-Abdeckung: 3/328 (0.9%)

#### Warnungen

- Fehlende Spaltenheader: id (gefunden: m3gim_id, name, wikidata_id, lebensdaten, anmerkung, Unnamed: 5)

### organisationsindex

#### Kontext

- Datei: `M3GIM-Organisationsindex.xlsx`
- Sheets: Organisationsindex
- Zeilen: 75
- Spalten: 6

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| m3gim_id | text | 100.0% | 75/75 |
| Graz | text | 96.0% | 72/75 |
| wikidata_id | text | 6.7% | 5/75 |
| ort | text | 61.3% | 46/75 |
| Assoziierte Person | text | 25.3% | 19/75 |
| anmerkung | text | 24.0% | 18/75 |

#### Werteprofile

- **wikidata_id** (3): nicht verifizierbar · Q157596 · Q681931
- **ort** (20): Bayreuth · Berlin · Berlin-Charlottenburg · Bloomington, Indiana · Buenos Aires · Düsseldorf · Graz · Hannover · Köln · Monaco · München · Neapel · New York · Paris · Salzburg · Strasbourg · Stuttgart · Wien · Wien? · Zürich
- **Assoziierte Person** (19): Angerer, Dorothea · Ballhausen, Felix · Bauer, Gerhard · Dr. Joachim Bergfeld · Dr. Kurt Honolka · Dumesnil, René · Helmut, Schmidt-Gasse · ibe · Ira Malaniuk · k-e-p · K.H. Ruppert · Karl Schumann · Klebe, Carl-Heinz · Kühnly, Ernst · Max Röthlisberger · Taubmann, Martin H., Altmann, Olga · Wagner, Wolfgang · Warren, Cox · Y.
- **anmerkung** (7): Agentur? · Aktiengesellschaft / Bank · beide Namen haben dieselbe Adresse, daher zusammengefasst · Festival · Fluggesellschaft · Rundfunk · Zeitung

#### Indexanalyse

- Fehlende Header: id, name
- Gefundene Header: m3gim_id, Graz, wikidata_id, ort, Assoziierte Person, anmerkung
- Doppelte IDs: O7
- Wikidata-Abdeckung: 5/75 (6.7%)

#### Warnungen

- Fehlende Spaltenheader: id, name (gefunden: m3gim_id, Graz, wikidata_id, ort, Assoziierte Person, anmerkung)

### ortsindex

#### Kontext

- Datei: `M3GIM-Ortsindex.xlsx`
- Sheets: Ortsindex
- Zeilen: 32
- Spalten: 3

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| Unnamed: 0 | text | 100.0% | 32/32 |
| name | text | 100.0% | 32/32 |
| Bei Erfassung hinzugefügt  | text | 3.1% | 1/32 |

#### Werteprofile

- **Unnamed: 0** (32): L1 · L10 · L11 · L12 · L13 · L14 · L15 · L16 · L17 · L18 · L19 · L2 · L20 · L21 · L22 · L23 · L24 · L25 · L26 · L27 · L28 · L29 · L3 · L30 · L31 · L32 · L4 · L5 · L6 · L7 · ... (+2)
- **name** (32): Basel · Bayreuth · Berlin · Bloomington, Indiana · Buenos Aires · Frankfurt · Graz · Hamburg · Köln · Lemberg · Linz · Lissabon  · London · Madrid · Mailand · Monte Carlo · München · Neapel · New York · Paris · Perchtoldsdorf · Potsdam · Rom · Salzburg · Schottland · Stanislau · Straßburg · Stuttgart · Stuttgart  · Venedig · ... (+2)
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
- Zeilen: 137
- Spalten: 6

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| m3gim_id | text | 100.0% | 137/137 |
| Rossini, Gioachino | text | 90.5% | 124/137 |
| wikidata_id | text | 2.9% | 4/137 |
| Barber, Samuel | text | 84.7% | 116/137 |
| rolle/stimme | text | 46.0% | 63/137 |
| anmerkung | text | 21.9% | 30/137 |

#### Werteprofile

- **wikidata_id** (4): Q190891 · Q309823 · Q723407 · Q729645
- **anmerkung** (13): Bartok, Bela  (UAKUG/NIM_007_2) · Geistliche Lieder, Spanisches Liederbuch · Missa Solemnis · Mozart, Wolfgang (UAKUG/NIM_007_4) · Oper · Schumann, Robert (UAKUG/NIM_007_6) · Sprache des Werktitels noch unklar (Vereinheitlichung notwendig!) · Strauss, Richard (UAKUG/NIM_007_4) · Strauss, Strauss (UAKUG/NIM_007_2) · Ukrainisches Lied · Wagner, Richard (UAKUG/NIM_007_4) · Wagner, Richard (UAKUG/NIM_007_5_1) · Weltliche Lieder, Spanisches Liederbuch

#### Indexanalyse

- Fehlende Header: id, titel, komponist
- Gefundene Header: m3gim_id, Rossini, Gioachino, wikidata_id, Barber, Samuel, rolle/stimme, anmerkung
- Doppelte IDs: W53
- Wikidata-Abdeckung: 4/137 (2.9%)

#### Warnungen

- Fehlende Spaltenheader: id, titel, komponist (gefunden: m3gim_id, Rossini, Gioachino, wikidata_id, Barber, Samuel, rolle/stimme, anmerkung)

## Cross-Table-Checks

### VerknÃ¼pfungen â†’ Objekte [WARNUNG]

VerknÃ¼pfungen referenzieren existierende Objekte

- Verwaiste Signaturen (1): UAKUG/NIM_11

## Abschluss

- Tabellen erkannt: 6/6
- Gesamt-Zeilen: 2398
- Warnungen: 5
- Cross-Table-Checks: 1