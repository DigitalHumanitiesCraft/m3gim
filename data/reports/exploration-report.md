# M3GIM Exploration Report

> Generiert: 2026-08-21 20:31
> Quelle: `C:\Users\Chrisi\Documents\GitHub\DHCraft\m3gim\data\google-spreadsheet`

## Executive Summary

- Tabellen erkannt: **6/6**
- Gesamtzeilen: **2515**
- Warnungen: **5**
- Kritische Cross-Checks: **0**

## Tabellenuebersicht

| Tabelle | Datei | Rows | Columns | Warnungen | Status |
|---|---|---|---|---|---|
| objekte | M3GIM-Objekte.xlsx | 906 | 18 | 0 | OK |
| verknuepfungen | M3GIM-Verknüpfungen.xlsx | 1037 | 7 | 0 | OK |
| personenindex | M3GIM-Personenindex.xlsx | 328 | 6 | 1 | WARNUNG |
| organisationsindex | M3GIM-Organisationsindex.xlsx | 75 | 6 | 1 | WARNUNG |
| ortsindex | M3GIM-Ortsindex.xlsx | 32 | 3 | 2 | WARNUNG |
| werkindex | M3GIM-Werkindex.xlsx | 137 | 6 | 1 | WARNUNG |

## Tabellen im Detail

### objekte

#### Kontext

- Datei: `M3GIM-Objekte.xlsx`
- Sheets: Sheet1
- Zeilen: 906
- Spalten: 18

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
| box_nr | text | 98.2% | 890/906 |
| archivsignatur | text | 100.0% | 906/906 |
| folio nr | text | 76.5% | 693/906 |
| titel | text | 72.7% | 659/906 |
| entstehungsdatum | datum (string) | 63.7% | 577/906 |
| datierungsevidenz | text | 49.1% | 445/906 |
| dokumenttyp | text | 72.4% | 656/906 |
| sprache | text | 50.2% | 455/906 |
| umfang | text | 48.5% | 439/906 |
| bearbeiter:in | text | 64.9% | 588/906 |
| erfassungsdatum | datum (string) | 69.6% | 631/906 |
| Bearbeitungsstand | text | 45.7% | 414/906 |
| Objekttabelle | text | 30.9% | 280/906 |
| Verknüpfungstabelle | text | 7.4% | 67/906 |
| Werkindex | text | 7.4% | 67/906 |
| Ortsindex | text | 7.4% | 67/906 |
| Organisationsindex | text | 7.4% | 67/906 |
| Personenindex | text | 7.4% | 67/906 |

#### Werteprofile

- **datierungsevidenz** (3): aus_dokument · erschlossen · unbekannt
- **dokumenttyp** (22): autobiografie · biographie · Briefumschlag · Chronik · identitaetsdokument · korrespondenz · musikzeitschrift · notiz · photokopie · plakat · presse · programm · quittung · repertoire · repertoireliste · rezension · sammlung · tontraeger · Typoskript · vertrag · verzeichnis · visitenkarte
- **sprache** (7): de · de, en, fr · en · en, fr · es · fr · it
- **Bearbeitungsstand** (21): abgeschlossen · Begonnen · begonnen · begonnen (nur Ira Malaniuk) · erledigt · Erledigt · Erledigt (Ira Malaniuk betreffend. Rest zurückgestellt) · vollständig · Vollständig · zurückgestellt · Zurückgestellt · Zurückgestellt aus Zeitmangel · Zurückgestellt aus Zeitmangel (IM erwähnt) · zurückgestellt, da irrelevant · Zurückgestellt, Duplikat · zurückgestellt, keine Erwähnung IMs · zurückgestellt, keine Erwähnung Malaniuks · Zurückgestellt, keine Erwähnung Malaniuks · Zurückgestellt, unlesbar · zurückgestellt, weil keine Erwähnung I.M. · Zurückgestellt, weil keine Erwähnung Malaniuks

#### Signaturanalyse

- hauptbestand: 879
- plakate: 26
- tontraeger: 1
- unbekannt: 0
- Duplikate: UAKUG/NIM/PL_07, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_003, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_004, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_005, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_006, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_007, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_008, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_011, UAKUG/NIM_022, UAKUG/NIM_022, UAKUG/NIM_022, UAKUG/NIM_022, UAKUG/NIM_022, UAKUG/NIM_022, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_023, UAKUG/NIM_043, UAKUG/NIM_043, UAKUG/NIM_043, UAKUG/NIM_043, UAKUG/NIM_043, UAKUG/NIM_043, UAKUG/NIM_043, UAKUG/NIM_043, UAKUG/NIM_043, UAKUG/NIM_043, UAKUG/NIM_043, UAKUG/NIM_043, UAKUG/NIM_043, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_073, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_135, UAKUG/NIM_136, UAKUG/NIM_135, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_136, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_137, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_139, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_142, UAKUG/NIM_168

#### Datumsanalyse

- iso: 364
- bereich: 183
- sonstiges: 30

### verknuepfungen

#### Kontext

- Datei: `M3GIM-Verknüpfungen.xlsx`
- Sheets: Box 5, Box 6, Box 9, Box_01, Box_02, Box_4
- Zeilen: 1037
- Spalten: 7

#### Spaltenanalyse

| Spalte | Typ | Fuellgrad | Non-Null |
|---|---|---|---|
|   | text | 98.0% | 1016/1037 |
| Folio | text | 92.3% | 957/1037 |
| datenpunkt_id | leer | 0.0% | 0/1037 |
| typ | text | 94.0% | 975/1037 |
| name | text | 94.1% | 976/1037 |
| rolle | text | 93.2% | 967/1037 |
| anmerkung | text | 0.2% | 2/1037 |

#### Werteprofile

- **typ** (11): Datum · datum, werk · ensemble · ereignis · institution · ort · ort, datum · person · rolle · rolle, Vorname Nachname Sänger*in · werk
- **rolle** (28): auffuehrungsort · Aufführung · auftritt · ausstatter:in · Beleuchter:in · bühnenbildner:in · Bühnenleiter:in · choreograph:in · chorleiter:in · dirigent:in · entstehungsort · erscheinungsdatum · erwähnt · gastspiel · herausgeber:in · interpret:in · Komponist:in · Kostümbildner:in · Leitung · Maskenbidner:in · premiere · rahmenveranstaltung · Regieassistent:in · regisseur:in · Repetitor:in · sänger:in · technische leitung · verfasser:in
- **anmerkung** (2): Assitent der Gesamtleitung · Kapellmeister New York

#### Verknuepfungsanalyse

- Typ-Verteilung:
  - person: 340
  - rolle, vorname nachname sänger*in: 230
  - rolle: 162
  - werk: 56
  - datum, werk: 49
  - datum: 44
  - institution: 43
  - ort: 34
  - ort, datum: 13
  - ensemble: 3
  - ereignis: 1
- Komposit-Typen gesamt: 292
  - `rolle, vorname nachname sänger*in`: 230
  - `ort, datum`: 13
  - `datum, werk`: 49

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

- Keine Cross-Table-Checks vorhanden.
## Abschluss

- Tabellen erkannt: 6/6
- Gesamt-Zeilen: 2515
- Warnungen: 5
- Cross-Table-Checks: 0