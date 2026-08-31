# Diff der Verknuepfungstabelle ALT gegen NEU

ALT `old-export\M3GIM-Verknüpfungen.xlsx`  
NEU `new-export\M3GIM-Verknüpfungen.xlsx`  
Objekttabelle `new-export\M3GIM-Objekte.xlsx`

Geladene Zeilen ALT 4165, NEU 5657.

Uebersprungene Blaetter ALT: keine

Uebersprungene Blaetter NEU: ['Hilfstabelle Box1 (keine typ/name-Spalten)', 'Typ-Rolle (keine typ/name-Spalten)', 'Hilfstabelle Box2 (keine typ/name-Spalten)', 'Hilfstabelle Box3 (keine typ/name-Spalten)', 'Hilfstabelle Box4 (keine typ/name-Spalten)', 'Hilfstabelle Box5 (keine typ/name-Spalten)', 'Hilfstabelle Box6 (keine typ/name-Spalten)', 'Hilfstabelle Box7 (keine typ/name-Spalten)', 'Hilfstabelle Box8 (keine typ/name-Spalten)', 'Hilfstabelle Box9 (keine typ/name-Spalten)', 'Hilfstabelle Box10 (keine typ/name-Spalten)']

## 1 Blattzuordnung ueber Signaturmengen

| Blatt ALT | Zeilen | bestes Blatt NEU | Jaccard | Signaturen gemeinsam / nur ALT / nur NEU |
|---|---:|---|---:|---|
| Box 5 | 1446 | Box 5 | 0.750 | 3 / 0 / 1 |
| Box 6 | 391 | Box 6 | 1.000 | 2 / 0 / 0 |
| Box 9 | 14 | Box 9 | 1.000 | 1 / 0 / 0 |
| Box_01 | 1743 | Box 1 | 1.000 | 6 / 0 / 0 |
| Box_02 | 209 | Box 2 | 0.667 | 2 / 0 / 1 |
| Box_4 | 362 | Box 4 | 1.000 | 1 / 0 / 0 |

Blaetter NEU ohne ALT-Gegenstueck: ['Box 3', 'Box 7', 'Box 8', 'Box 10']

## 2 Zeilenzahl und Spaltenkoepfe je Blatt

| Mappe | Blatt | Zeilen | Original-Spaltenkoepfe |
|---|---|---:|---|
| ALT | Box 5 | 1446 | ` , Folio, datenpunkt_id, typ, name, rolle, anmerkung` |
| ALT | Box 6 | 391 | ` , Folio, typ, name, rolle, anmerkung` |
| ALT | Box 9 | 14 | ` , Folio, datenpunkt_id, typ, name, rolle, anmerkung` |
| ALT | Box_01 | 1743 | ` , Folio, datenpunkt_id, typ, name, rolle, anmerkung` |
| ALT | Box_02 | 209 | ` , Folio, datenpunkt_id, typ, name, rolle, anmerkung` |
| ALT | Box_4 | 362 | ` , Folio, datenpunkt_id, typ, name, rolle, anmerkung` |
| NEU | Box 1 | 3015 | ` , Folio, datenpunkt_id, typ, name, rolle, anmerkung` |
| NEU | Box 2 | 396 | ` , Folio, datenpunkt_id, typ, name, rolle, anmerkung` |
| NEU | Box 3 | 1 | ` , Folio, datenpunkt_id, typ, name, rolle, anmerkung` |
| NEU | Box 4 | 362 | ` , Folio, datenpunkt_id, typ, name, rolle, anmerkung` |
| NEU | Box 5 | 1446 | ` , Folio, datenpunkt_id, typ, name, rolle, anmerkung` |
| NEU | Box 6 | 391 | ` , Folio, data_id, typ, name, rolle, anmerkung` |
| NEU | Box 7 | 30 | ` , Folio, data_id, typ, name, rolle, anmerkung` |
| NEU | Box 8 | 1 | ` , Folio, data_id, typ, name, rolle, anmerkung` |
| NEU | Box 9 | 14 | ` , Folio, datenpunkt_id, typ, name, rolle, anmerkung` |
| NEU | Box 10 | 1 | ` , Folio, data_id, typ, name, rolle, anmerkung` |

### Spalte datenpunkt_id gegen data_id

| Mappe | Blatt | datenpunkt_id | data_id |
|---|---|---|---|
| ALT | Box 5 | ja | nein |
| ALT | Box 6 | nein | nein |
| ALT | Box 9 | ja | nein |
| ALT | Box_01 | ja | nein |
| ALT | Box_02 | ja | nein |
| ALT | Box_4 | ja | nein |
| NEU | Box 1 | ja | nein |
| NEU | Box 2 | ja | nein |
| NEU | Box 3 | ja | nein |
| NEU | Box 4 | ja | nein |
| NEU | Box 5 | ja | nein |
| NEU | Box 6 | nein | ja |
| NEU | Box 7 | nein | ja |
| NEU | Box 8 | nein | ja |
| NEU | Box 9 | ja | nein |
| NEU | Box 10 | nein | ja |

## 3 Werteverteilung typ (exakte Schreibweise)

| typ | ALT | NEU | Delta |
|---|---:|---:|---:|
| `person` | 1316 | 1431 | +115 |
| `rolle` | 572 | 724 | +152 |
| `Datum` | 277 | 673 | +396 |
| `ort` | 279 | 488 | +209 |
| `institution` | 249 | 437 | +188 |
| `werk` | 284 | 422 | +138 |
| `rolle, Vorname Nachname Sänger*in` | 230 | 230 | +0 |
| `ereignis` | 22 | 79 | +57 |
| `ort, datum` | 92 | 76 | -16 |
| `datum, werk` | 73 | 73 | +0 |
| `Rolle, Person` | 51 | 51 | +0 |
| `einnahmen_währung` | 0 | 32 | +32 |
| `dokument` | 26 | 27 | +1 |
| `ensemble` | 15 | 15 | +0 |
| `ausgaben, währung` | 12 | 10 | -2 |
| `summe, währung` | 7 | 6 | -1 |
| `Aktivität` | 0 | 6 | +6 |
| `einnahmen, währung` | 37 | 4 | -33 |
| `summe_währung` | 0 | 3 | +3 |
| `ausgaben_währung` | 0 | 2 | +2 |
| `ort_datum` | 0 | 1 | +1 |

## 4 Werteverteilung rolle (exakte Schreibweise)

| rolle | ALT | NEU | Delta |
|---|---:|---:|---:|
| `erwähnt` | 715 | 2054 | +1339 |
| `Aufführung` | 578 | 666 | +88 |
| `sänger:in` | 530 | 536 | +6 |
| `auftritt` | 522 | 496 | -26 |
| `Komponist:in` | 110 | 114 | +4 |
| `verfasser:in` | 67 | 87 | +20 |
| `dirigent:in` | 83 | 84 | +1 |
| `auffuehrungsort` | 82 | 84 | +2 |
| `repertoire` | 58 | 58 | +0 |
| `regisseur:in` | 50 | 52 | +2 |
| `interpret:in` | 50 | 50 | +0 |
| `adressat:in` | 30 | 48 | +18 |
| `gastspiel` | 47 | 47 | +0 |
| `rahmenveranstaltung` | 46 | 41 | -5 |
| `erscheinungsdatum` | 34 | 34 | +0 |
| `absendeort` | 16 | 33 | +17 |
| `absendedatum` | 7 | 33 | +26 |
| `veranstalter:in` | 10 | 30 | +20 |
| `Publikum` | 27 | 27 | +0 |
| `empfangsort` | 4 | 27 | +23 |
| `herausgeber:in` | 27 | 26 | -1 |
| `zielort` | 19 | 22 | +3 |
| `Beleuchter:in` | 21 | 21 | +0 |
| `unterzeichner:in` | 20 | 21 | +1 |
| `bühnenbildner:in` | 19 | 20 | +1 |
| `abendgage` | 20 | 19 | -1 |
| `chorleiter:in` | 19 | 19 | +0 |
| `probe` | 19 | 18 | -1 |
| `Absender:in` | 0 | 18 | +18 |
| `empfänger:in` | 11 | 15 | +4 |
| `Spielzeit` | 9 | 15 | +6 |
| `vertragspartner:in` | 22 | 14 | -8 |
| `entstehung` | 17 | 14 | -3 |
| `Maskenbidner:in` | 14 | 14 | +0 |
| `premiere` | 14 | 14 | +0 |
| `Kostümbildner:in` | 12 | 12 | +0 |
| `Gesamtvergütung` | 9 | 12 | +3 |
| `entstehungsort` | 11 | 11 | +0 |
| `vertragsort` | 11 | 11 | +0 |
| `Erstelldatum` | 10 | 11 | +1 |
| `abgebildet` | 8 | 11 | +3 |
| `Leitung` | 10 | 10 | +0 |
| `technische leitung` | 10 | 10 | +0 |
| `ausstellungsdatum` | 9 | 10 | +1 |
| `Aufnahme` | 18 | 9 | -9 |
| `Generalprobe` | 2 | 9 | +7 |
| `ausstatter:in` | 8 | 8 | +0 |
| `agent:in` | 7 | 7 | +0 |
| `auftraggeber:in` | 7 | 7 | +0 |
| `Repetitor:in` | 6 | 6 | +0 |
| `provision` | 6 | 6 | +0 |
| `Probenbeginn` | 3 | 6 | +3 |
| `Unterschriftsdatum` | 0 | 6 | +6 |
| `librettist:in` | 5 | 5 | +0 |
| `abreiseort` | 4 | 5 | +1 |
| `Aufnahmedatum` | 0 | 5 | +5 |
| `choreograph:in` | 4 | 4 | +0 |
| `wohnort` | 3 | 4 | +1 |
| `Ausstrahlung` | 1 | 4 | +3 |
| `Empfang` | 3 | 3 | +0 |
| `Regieassistent:in` | 3 | 3 | +0 |
| `Reisekosten` | 3 | 3 | +0 |
| `vermittler:in` | 3 | 3 | +0 |
| `Bühnenleiter:in` | 2 | 2 | +0 |
| `Fotograf:in` | 2 | 2 | +0 |
| `arbeitgeber:in` | 2 | 2 | +0 |
| `festvorstellung` | 2 | 2 | +0 |
| `protagonist` | 2 | 2 | +0 |
| `wiederaufnahme` | 2 | 2 | +0 |
| `übersetzer:in` | 2 | 2 | +0 |
| `Abreisedatum` | 1 | 1 | +0 |
| `Gespräch` | 1 | 1 | +0 |
| `Lohnbestätigung` | 1 | 1 | +0 |
| `arrangeur:in` | 1 | 1 | +0 |
| `auftrag` | 1 | 1 | +0 |
| `ausbildungsstätte` | 1 | 1 | +0 |
| `empfangsdatum` | 1 | 1 | +0 |
| `fluggesellschaft` | 1 | 1 | +0 |
| `inhaber:in` | 1 | 1 | +0 |
| `überweisung` | 1 | 1 | +0 |
| `Abspielhonorar` | 0 | 1 | +1 |
| `Gage` | 0 | 1 | +1 |
| `Reisedatum` | 0 | 1 | +1 |
| `summe` | 0 | 1 | +1 |
| `nicht eingehalten` | 9 | 0 | -9 |
| `Rundfunkshonorar` | 3 | 0 | -3 |
| `Ratenzahlung` | 1 | 0 | -1 |

### Rollen nach Genderform (NEU)

**Doppelpunkt-Form** (32): `Absender:in`, `Beleuchter:in`, `Bühnenleiter:in`, `Fotograf:in`, `Komponist:in`, `Kostümbildner:in`, `Maskenbidner:in`, `Regieassistent:in`, `Repetitor:in`, `adressat:in`, `agent:in`, `arbeitgeber:in`, `arrangeur:in`, `auftraggeber:in`, `ausstatter:in`, `bühnenbildner:in`, `choreograph:in`, `chorleiter:in`, `dirigent:in`, `empfänger:in`, `herausgeber:in`, `inhaber:in`, `interpret:in`, `librettist:in`, `regisseur:in`, `sänger:in`, `unterzeichner:in`, `veranstalter:in`, `verfasser:in`, `vermittler:in`, `vertragspartner:in`, `übersetzer:in`

**Sternchen-Form** (0): keine

**Binnen-I** (0): keine

**ungegendert** (52): `Abreisedatum`, `Abspielhonorar`, `Aufführung`, `Aufnahme`, `Aufnahmedatum`, `Ausstrahlung`, `Empfang`, `Erstelldatum`, `Gage`, `Generalprobe`, `Gesamtvergütung`, `Gespräch`, `Leitung`, `Lohnbestätigung`, `Probenbeginn`, `Publikum`, `Reisedatum`, `Reisekosten`, `Spielzeit`, `Unterschriftsdatum`, `abendgage`, `abgebildet`, `abreiseort`, `absendedatum`, `absendeort`, `auffuehrungsort`, `auftrag`, `auftritt`, `ausbildungsstätte`, `ausstellungsdatum`, `empfangsdatum`, `empfangsort`, `entstehung`, `entstehungsort`, `erscheinungsdatum`, `erwähnt`, `festvorstellung`, `fluggesellschaft`, `gastspiel`, `premiere`, `probe`, `protagonist`, `provision`, `rahmenveranstaltung`, `repertoire`, `summe`, `technische leitung`, `vertragsort`, `wiederaufnahme`, `wohnort`, `zielort`, `überweisung`

## 5 Kreuztabelle typ x rolle NEU gegen das Blatt Typ-Rolle

Blatt `Typ-Rolle`, wortgetreu:

| Typ | Rollen |
|---|---|
| `person` | `erwähnt`, `verfasser:in`, `adressat:in`, `vertragspartner:in`, `unterzeichner:in`, `abgebildet`, `arbeitgeber:in`, `veranstalter:in`, `vermittler:in`, `interpret:in`, `agent:in`, `inhaber:in`, `auftraggeber:in`, `empfänger:in`, `Komponist:in`, `regisseur:in`, `bühnenbildner:in`, `dirigent:in`, `sänger:in`, `herausgeber:in`, `chorleiter:in`, `librettist:in`, `übersetzer:in`, `arrangeur:in`, `ausstatter:in`, `Kostümbildner:in`, `Bühnenleiter:in`, `technische Leitung`, `choreograph:in` |
| `Datum` | `absendedatum`, `Reisedatum`, `empfangsdatum`, `ausstellungsdatum`, `Ausstrahlung`, `Spielzeit`, `Probenbeginn`, `erscheinungsdatum`, `Generalprobe`, `Erstelldatum`, `Lohnbestätigung`, `erwähnt`, `Aufführung`, `Auftragsdatum`, `Überweisungdatum`, `Unterschriftsdatum`, `Aufnahmedatum` |
| `ort` | `entstehungsort`, `zielort`, `auffuehrungsort`, `wohnort`, `vertragsort`, `abreiseort`, `absendeort`, `empfangsort`, `erwähnt`, `Lehrtätigkeit` |
| `institution` | `fluggesellschaft`, `ausbildungsstätte`, `veranstalter:in`, `empfänger:in`, `Absender:in`, `auftritt`, `erwähnt` |
| `ereignis` | `rahmenveranstaltung`, `premiere`, `probe`, `gastspiel`, `Aufführung` |
| `werk` | `wiederaufnahme`, `Aufführung`, `Probe`, `Aufnahme`, `erwähnt`, `Ausstrahlung` |
| `rolle` | `Aufführung`, `repertoire`, `erwähnt` |
| `einnahmen_währung` | `abendgage`, `provision`, `Gesamtvergütung`, `Reisekosten`, `Abspielhonorar` |
| `ausgaben_währung` | `erwähnt`, `provision` |
| `summe_währung` | `summe`, `Gage`, `erwähnt` |
| `ensemble` | `Auftritt`, `erwähnt` |
| `Aktivität` | `Aufführung` |

### Kombinationen in den Daten, die Typ-Rolle nicht kennt

| typ (normalisiert) | rolle (normalisiert) | Zeilen | Rohformen (typ / rolle) |
|---|---|---:|---|
| `rolle` | `auftritt` | 298 | `rolle` / `auftritt` (rolle fehlt beim typ) |
| `rolle‚ person` | `auftritt` | 158 | `rolle, Vorname Nachname Sänger*in` / `auftritt`; `Rolle, Person` / `auftritt` (typ fehlt im Blatt) |
| `rolle‚ person` | `aufführung` | 115 | `rolle, Vorname Nachname Sänger*in` / `Aufführung` (typ fehlt im Blatt) |
| `datum‚ werk` | `aufführung` | 73 | `datum, werk` / `Aufführung` (typ fehlt im Blatt) |
| `ereignis` | `erwähnt` | 60 | `ereignis` / `erwähnt` (rolle fehlt beim typ) |
| `institution` | `auffuehrungsort` | 35 | `institution` / `auffuehrungsort` (rolle fehlt beim typ) |
| `institution` | `rahmenveranstaltung` | 29 | `institution` / `rahmenveranstaltung` (rolle fehlt beim typ) |
| `werk` | `repertoire` | 27 | `werk` / `repertoire` (rolle fehlt beim typ) |
| `person` | `publikum` | 27 | `person` / `Publikum` (rolle fehlt beim typ) |
| `dokument` | `erwähnt` | 26 | `dokument` / `erwähnt` (typ fehlt im Blatt) |
| `institution` | `herausgeber` | 25 | `institution` / `herausgeber:in` (rolle fehlt beim typ) |
| `ort‚ datum` | `gastspiel` | 22 | `ort, datum` / `gastspiel` (typ fehlt im Blatt) |
| `person` | `beleuchter` | 21 | `person` / `Beleuchter:in` (rolle fehlt beim typ) |
| `ort‚ datum` | `aufführung` | 15 | `ort, datum` / `Aufführung` (typ fehlt im Blatt) |
| `ort` | `aufführung` | 15 | `ort` / `Aufführung` (rolle fehlt beim typ) |
| `ort‚ datum` | `entstehung` | 14 | `ort, datum` / `entstehung` (typ fehlt im Blatt) |
| `person` | `maskenbidner` | 14 | `person` / `Maskenbidner:in` (rolle fehlt beim typ) |
| `datum` | `probe` | 13 | `Datum` / `probe` (rolle fehlt beim typ) |
| `institution` | `gastspiel` | 12 | `institution` / `gastspiel` (rolle fehlt beim typ) |
| `werk` | `premiere` | 11 | `werk` / `premiere` (rolle fehlt beim typ) |
| `datum` | `auftritt` | 11 | `Datum` / `auftritt` (rolle fehlt beim typ) |
| `werk` | `auftritt` | 11 | `werk` / `auftritt` (rolle fehlt beim typ) |
| `person` | `leitung` | 10 | `person` / `Leitung` (rolle fehlt beim typ) |
| `person` | `auftritt` | 9 | `person` / `auftritt` (rolle fehlt beim typ) |
| `institution` | `aufführung` | 8 | `institution` / `Aufführung` (rolle fehlt beim typ) |
| `ort‚ datum` | `spielzeit` | 7 | `ort, datum` / `Spielzeit` (typ fehlt im Blatt) |
| `rolle‚ person` | `sänger` | 7 | `rolle, Vorname Nachname Sänger*in` / `sänger:in` (typ fehlt im Blatt) |
| `institution` | `verfasser` | 6 | `institution` / `verfasser:in` (rolle fehlt beim typ) |
| `ort‚ datum` | `erscheinungsdatum` | 6 | `ort, datum` / `erscheinungsdatum`; `ort_datum` / `erscheinungsdatum` (typ fehlt im Blatt) |
| `werk` | `gastspiel` | 6 | `werk` / `gastspiel` (rolle fehlt beim typ) |
| `person` | `repetitor` | 6 | `person` / `Repetitor:in` (rolle fehlt beim typ) |
| `ort` | `gastspiel` | 4 | `ort` / `gastspiel` (rolle fehlt beim typ) |
| `datum` | `rahmenveranstaltung` | 4 | `Datum` / `rahmenveranstaltung` (rolle fehlt beim typ) |
| `datum` | `premiere` | 3 | `Datum` / `premiere` (rolle fehlt beim typ) |
| `rolle` | `interpret` | 3 | `rolle` / `interpret:in` (rolle fehlt beim typ) |
| `ort‚ datum` | `erwähnt` | 3 | `ort, datum` / `erwähnt` (typ fehlt im Blatt) |
| `einnahmen` | `erwähnt` | 3 | `einnahmen, währung` / `erwähnt` (rolle fehlt beim typ) |
| `person` | `regieassistent` | 3 | `person` / `Regieassistent:in` (rolle fehlt beim typ) |
| `werk` | `festvorstellung` | 2 | `werk` / `festvorstellung` (rolle fehlt beim typ) |
| `institution` | `vermittler` | 2 | `institution` / `vermittler:in` (rolle fehlt beim typ) |
| `person` | `protagonist` | 2 | `person` / `protagonist` (rolle fehlt beim typ) |
| `ort‚ datum` | `absendedatum` | 2 | `ort, datum` / `absendedatum` (typ fehlt im Blatt) |
| `ensemble` | `interpret` | 2 | `ensemble` / `interpret:in` (rolle fehlt beim typ) |
| `ensemble` | `gastspiel` | 2 | `ensemble` / `gastspiel` (rolle fehlt beim typ) |
| `institution` | `arbeitgeber` | 2 | `institution` / `arbeitgeber:in` (rolle fehlt beim typ) |
| `summe` | `abendgage` | 2 | `summe, währung` / `abendgage` (rolle fehlt beim typ) |
| `ort‚ datum` | `probe` | 2 | `ort, datum` / `probe` (typ fehlt im Blatt) |
| `ort‚ datum` | `auftritt` | 2 | `ort, datum` / `auftritt` (typ fehlt im Blatt) |
| `person` | `fotograf` | 2 | `person` / `Fotograf:in` (rolle fehlt beim typ) |
| `ort` | `empfang` | 2 | `ort` / `Empfang` (rolle fehlt beim typ) |
| `datum` | `abreisedatum` | 1 | `Datum` / `Abreisedatum` (rolle fehlt beim typ) |
| `datum` | `gespräch` | 1 | `Datum` / `Gespräch` (rolle fehlt beim typ) |
| `ort‚ datum` | `ausstellungsdatum` | 1 | `ort, datum` / `ausstellungsdatum` (typ fehlt im Blatt) |
| `datum` | `überweisung` | 1 | `Datum` / `überweisung` (rolle fehlt beim typ) |
| `ereignis` | `veranstalter` | 1 | `ereignis` / `veranstalter:in` (rolle fehlt beim typ) |
| `person` | `aufführung` | 1 | `person` / `Aufführung` (rolle fehlt beim typ) |
| `ort‚ datum` | `auftrag` | 1 | `ort, datum` / `auftrag` (typ fehlt im Blatt) |
| `institution` | `empfangsort` | 1 | `institution` / `empfangsort` (rolle fehlt beim typ) |
| `rolle` | `gastspiel` | 1 | `rolle` / `gastspiel` (rolle fehlt beim typ) |
| `ausgaben` | `interpret` | 1 | `ausgaben, währung` / `interpret:in` (rolle fehlt beim typ) |
| `ort‚ datum` | `generalprobe` | 1 | `ort, datum` / `Generalprobe` (typ fehlt im Blatt) |
| `rolle` | `probe` | 1 | `rolle` / `probe` (rolle fehlt beim typ) |
| `institution` | `zielort` | 1 | `institution` / `zielort` (rolle fehlt beim typ) |
| `ereignis` | `aufnahme` | 1 | `ereignis` / `Aufnahme` (rolle fehlt beim typ) |
| `dokument` | `(leer)` | 1 | `dokument` / `` (typ fehlt im Blatt) |
| `ort‚ datum` | `rahmenveranstaltung` | 1 | `ort, datum` / `rahmenveranstaltung` (typ fehlt im Blatt) |
| `ensemble` | `aufführung` | 1 | `ensemble` / `Aufführung` (rolle fehlt beim typ) |
| `ensemble` | `sänger` | 1 | `ensemble` / `sänger:in` (rolle fehlt beim typ) |
| `rolle‚ person` | `erwähnt` | 1 | `Rolle, Person` / `erwähnt` (typ fehlt im Blatt) |
| `datum` | `empfang` | 1 | `Datum` / `Empfang` (rolle fehlt beim typ) |

### Kombinationen aus Typ-Rolle ohne Beleg in den Daten

| Typ (Blatt) | Rolle (Blatt) |
|---|---|
| `person` | `arbeitgeber:in` |
| `Datum` | `Auftragsdatum` |
| `Datum` | `Überweisungdatum` |
| `ort` | `Lehrtätigkeit` |
| `ereignis` | `premiere` |
| `ereignis` | `probe` |
| `ereignis` | `gastspiel` |
| `einnahmen_währung` | `provision` |
| `Aktivität` | `Aufführung` |

## 6 Fuellgrad der Buendelungsspalte je Blatt

| Mappe | Blatt | Spaltenname | Zeilen | gefuellt | Anteil | Wertebeispiele |
|---|---|---|---:|---:|---:|---|
| ALT | Box 5 | datenpunkt_id | 1446 | 0 | 0.0% |  |
| ALT | Box 6 | (fehlt) | 391 | 0 | 0.0% |  |
| ALT | Box 9 | datenpunkt_id | 14 | 0 | 0.0% |  |
| ALT | Box_01 | datenpunkt_id | 1743 | 2 | 0.1% | 1.0, 2.0 |
| ALT | Box_02 | datenpunkt_id | 209 | 0 | 0.0% |  |
| ALT | Box_4 | datenpunkt_id | 362 | 0 | 0.0% |  |
| NEU | Box 1 | datenpunkt_id | 3015 | 14 | 0.5% | 1, 2, 2026-01-01 00:00:00, 2026-02-01 00:00:00, 2026-03-01 00:00:00, 2026-04-01 00:00:00 |
| NEU | Box 2 | datenpunkt_id | 396 | 88 | 22.2% | 1, 2026-01-01 00:00:00, 2026-02-01 00:00:00, 2026-03-01 00:00:00, 2026-04-01 00:00:00 |
| NEU | Box 3 | datenpunkt_id | 1 | 0 | 0.0% |  |
| NEU | Box 4 | datenpunkt_id | 362 | 0 | 0.0% |  |
| NEU | Box 5 | datenpunkt_id | 1446 | 49 | 3.4% | 1.0, 2.0, 3.0, 4.0, 5.0, 6.0 |
| NEU | Box 6 | data_id | 391 | 0 | 0.0% |  |
| NEU | Box 7 | data_id | 30 | 0 | 0.0% |  |
| NEU | Box 8 | data_id | 1 | 0 | 0.0% |  |
| NEU | Box 9 | datenpunkt_id | 14 | 0 | 0.0% |  |
| NEU | Box 10 | data_id | 1 | 0 | 0.0% |  |

### Zellwert und Zahlenformat der Buendelungsspalte (NEU)

Der gelesene Wert allein sagt nicht, was erfasst wurde. Ein Datumsformat in dieser Spalte belegt, dass die Tabellenkalkulation eine Eingabe der Form `1.01` als Kalenderdatum gelesen hat.

| Blatt | Zellwert | Anzahl | Zahlenformat |
|---|---|---:|---|
| Box 1 | `datetime: 2026-01-01 00:00:00` | 3 | `dd.mm` |
| Box 1 | `datetime: 2026-02-01 00:00:00` | 3 | `dd.mm` |
| Box 1 | `datetime: 2026-03-01 00:00:00` | 3 | `dd.mm` |
| Box 1 | `datetime: 2026-04-01 00:00:00` | 3 | `dd.mm` |
| Box 1 | `float: 1.0` | 1 | `General` |
| Box 1 | `float: 2.0` | 1 | `General` |
| Box 2 | `datetime: 2026-01-01 00:00:00` | 26 | `d.m` |
| Box 2 | `float: 1.0` | 25 | `General` |
| Box 2 | `datetime: 2026-02-01 00:00:00` | 21 | `d.m` |
| Box 2 | `datetime: 2026-03-01 00:00:00` | 10 | `d.m` |
| Box 2 | `datetime: 2026-04-01 00:00:00` | 6 | `d.m` |
| Box 5 | `float: 7.0` | 12 | `General` |
| Box 5 | `float: 1.0` | 11 | `General` |
| Box 5 | `float: 3.0` | 9 | `General` |
| Box 5 | `float: 2.0` | 7 | `General` |
| Box 5 | `float: 6.0` | 4 | `General` |
| Box 5 | `float: 4.0` | 3 | `General` |
| Box 5 | `float: 5.0` | 3 | `General` |

## 7 Folio-Muster

| Folio-Muster | ALT | NEU | Delta |
|---|---:|---:|---:|
| `int` | 2115 | 3428 | +1313 |
| `n_m` | 1285 | 1347 | +62 |
| `leer` | 617 | 734 | +117 |
| `n_m_k` | 102 | 102 | +0 |
| `datum-autokonvertiert (YYYY-MM-DD 00:00:00)` | 0 | 46 | +46 |
| `sonstiges` | 46 | 0 | -46 |

Belegte Nicht-Standard-Folios NEU (Datum, Literal, sonstiges), mit Fundstelle:

| Blatt | XLSX-Zeile | Signatur | Folio-Rohwert | Muster |
|---|---:|---|---|---|
| Box 5 | 1272 | UAKUG/NIM_137 | `2026-01-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1273 | UAKUG/NIM_137 | `2026-01-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1274 | UAKUG/NIM_137 | `2026-01-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1275 | UAKUG/NIM_137 | `2026-01-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1276 | UAKUG/NIM_137 | `2026-01-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1277 | UAKUG/NIM_137 | `2026-01-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1278 | UAKUG/NIM_137 | `2026-01-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1279 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1280 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1281 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1282 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1283 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1284 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1285 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1286 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1287 | UAKUG/NIM_137 | `2026-01-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1288 | UAKUG/NIM_137 | `2026-01-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1289 | UAKUG/NIM_137 | `2026-01-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1290 | UAKUG/NIM_137 | `2026-01-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1291 | UAKUG/NIM_137 | `2026-01-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1292 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1293 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1294 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1295 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| Box 5 | 1296 | UAKUG/NIM_137 | `2026-02-15 00:00:00` | datum-autokonvertiert (YYYY-MM-DD 00:00:00) |
| ... | | | | insgesamt 46 Zeilen |

## 8 Datumsformate in name bei typ Datum

| Datumsmuster | ALT | NEU | Delta |
|---|---:|---:|---:|
| `Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00)` | 0 | 618 | +618 |
| `Freitext / sonstiges` | 168 | 149 | -19 |
| `ISO YYYY` | 25 | 25 | +0 |
| `ISO-Zeitspanne mit /` | 27 | 24 | -3 |
| `ISO YYYY-MM-DD` | 213 | 6 | -207 |
| `Zeitspanne mit 'bis'` | 1 | 1 | +0 |
| `ISO YYYY-MM` | 8 | 0 | -8 |

Nicht-ISO-Datumswerte NEU (Freitext, Qualifier, bis-Spanne, Timestamp), Beispiele:

| Blatt | XLSX-Zeile | Signatur | typ | name-Rohwert | Muster |
|---|---:|---|---|---|---|
| Box 1 | 6 | UAKUG/NIM_003 | `Datum` | `1944-05 bis 1944-09` | Zeitspanne mit 'bis' |
| Box 1 | 38 | UAKUG/NIM_004 | `Datum` | `1959-10-28 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 70 | UAKUG/NIM_004 | `Datum` | `1952-12-16 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 71 | UAKUG/NIM_004 | `Datum` | `1952-12-16 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 72 | UAKUG/NIM_004 | `Datum` | `1952-12-22 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 83 | UAKUG/NIM_004 | `ort_datum` | `München, 1952-12-17` | Freitext / sonstiges |
| Box 1 | 102 | UAKUG/NIM_004 | `Datum` | `1952-12-18 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 122 | UAKUG/NIM_004 | `Datum` | `1953-03-05 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 156 | UAKUG/NIM_004 | `Datum` | `1953-08-13 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 178 | UAKUG/NIM_004 | `ort, datum` | `München, 1953-03-06` | Freitext / sonstiges |
| Box 1 | 203 | UAKUG/NIM_004 | `Datum` | `1964-01-08 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 206 | UAKUG/NIM_004 | `Datum` | `1954-01-07 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 244 | UAKUG/NIM_004 | `Datum` | `1953-08-01 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 288 | UAKUG/NIM_004 | `Datum` | `1954-03-31 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 320 | UAKUG/NIM_004 | `ort, datum` | `Stuttgart, 1954-07-06` | Freitext / sonstiges |
| Box 1 | 344 | UAKUG/NIM_004 | `Datum` | `1954-08-14 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 365 | UAKUG/NIM_004 | `Datum` | `1954-10-28 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 408 | UAKUG/NIM_004 | `ort, datum` | `1956-11-21 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 435 | UAKUG/NIM_004 | `Datum` | `1956-05-01 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 436 | UAKUG/NIM_004 | `Datum` | `1956-11-01 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 452 | UAKUG/NIM_004 | `Datum` | `1956-05-02 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| Box 1 | 515 | UAKUG/NIM_004 | `ort, datum` | `Paris, 1956` | Freitext / sonstiges |
| Box 1 | 516 | UAKUG/NIM_004 | `ort, datum` | `Paris, 1955` | Freitext / sonstiges |
| Box 1 | 535 | UAKUG/NIM_004 | `ort, datum` | `Wien, 1957-09-07` | Freitext / sonstiges |
| Box 1 | 536 | UAKUG/NIM_004 | `Datum` | `1957-08-27 00:00:00` | Timestamp-Autokonvertierung (YYYY-MM-DD 00:00:00) |
| ... | | | | | insgesamt 768 Zeilen |

## 9 Zeilendiff (Schluessel Signatur + Folio + typ + name)

Zwei Schluesselvarianten. Der strikte Schluessel nimmt die Rohwerte, der normalisierte zerlegt den Komposit-Typ und streift den Excel-Zeitanteil des name-Werts ab. Die Differenz beider Zahlen ist reiner Formatwechsel des Exports, keine inhaltliche Aenderung.

| Schluessel | nur NEU | nur ALT |
|---|---:|---:|
| strikt | 1443 | 330 |
| normalisiert | 1211 | 98 |

Normalisiert: Schluessel nur NEU 1211, nur ALT 98, geaendert (rolle/anmerkung) 72.

Zeilen hinter den Nur-NEU-Schluesseln: 1785; hinter den Nur-ALT-Schluesseln: 113.

### Neue Signaturen (in NEU, nicht in ALT)

Nur NEU: ``, `UAKUG/NIM_`, `UAKUG/NIM_016`, `UAKUG/NIM_024`, `UAKUG/NIM_134`

Nur ALT: keine

### Nur-NEU-Zeilen je Blatt

| Blatt NEU | neue Zeilen |
|---|---:|
| Box 1 | 1191 |
| Box 5 | 344 |
| Box 2 | 212 |
| Box 7 | 30 |
| Box 6 | 3 |
| Box 3 | 1 |
| Box 4 | 1 |
| Box 8 | 1 |
| Box 10 | 1 |
| Box 9 | 1 |

### Nur-ALT-Zeilen (entfallen), Beispiele

| Blatt ALT | XLSX-Zeile | Signatur | Folio | typ | name |
|---|---:|---|---|---|---|
| Box_01 | 2 | UAKUG/NIM_003 | `1_1` | `ereignis` | `Sommerkurse Deutsches Musikinstitut für Ausländer` |
| Box_01 | 536 | UAKUG/NIM_004 | `` | `datum` | `1957-08-27` |
| Box_01 | 535 | UAKUG/NIM_004 | `` | `ort+datum` | `Wien, 1957-09-07` |
| Box_01 | 534 | UAKUG/NIM_004 | `` | `person` | `Cox, Warren` |
| Box_01 | 436 | UAKUG/NIM_004 | `16` | `datum` | `1956-11` |
| Box_01 | 705 | UAKUG/NIM_004 | `30` | `person` | `Baasch-Malaniuk, Ira` |
| Box_01 | 867 | UAKUG/NIM_004 | `34` | `ort+datum` | `06-09` |
| Box_01 | 933 | UAKUG/NIM_005 | `15` | `datum` | `1944-03` |
| Box_01 | 934 | UAKUG/NIM_005 | `15` | `datum` | `1945-05` |
| Box_01 | 952 | UAKUG/NIM_005 | `15` | `datum` | `1945-09` |
| Box_01 | 1029 | UAKUG/NIM_005 | `16` | `` | `` |
| Box_01 | 1097 | UAKUG/NIM_007 | `3` | `person` | `Malaniuk, Ira` |
| Box_01 | 1414 | UAKUG/NIM_007 | `5_1` | `ausgaben` | `18.000` |
| Box_01 | 1413 | UAKUG/NIM_007 | `5_1` | `ausgaben` | `36.000` |
| Box_01 | 1416 | UAKUG/NIM_007 | `5_1` | `einnahmen` | `90.000` |
| Box_01 | 1421 | UAKUG/NIM_007 | `5_1` | `summe` | `180.000` |
| Box_02 | 35 | UAKUG/NIM_022 | `1_3` | `ort+datum` | `Bayreuth, 1952-06-09` |
| Box_02 | 36 | UAKUG/NIM_022 | `1_3` | `ort+datum` | `Bayreuth, 1952-06-30` |
| Box_02 | 49 | UAKUG/NIM_022 | `3` | `` | `` |
| Box_02 | 39 | UAKUG/NIM_022 | `3` | `datum` | `1951/1952` |
| Box_02 | 48 | UAKUG/NIM_022 | `3` | `einnahmen` | `50000 Lire` |
| Box_02 | 38 | UAKUG/NIM_022 | `3` | `ort+datum` | `Neapel, 1952-12-12` |
| Box_02 | 198 | UAKUG/NIM_023 | `10` | `` | `` |
| Box_02 | 197 | UAKUG/NIM_023 | `10` | `einnahmen` | `1674, DM` |
| Box_02 | 189 | UAKUG/NIM_023 | `10` | `ort+datum` | `Hamburg, 1953-01-05` |
| ... | | | | | insgesamt 98 Schluessel |

### Geaenderte Zeilen (gleicher Schluessel, andere rolle oder anmerkung), Beispiele

| Signatur | Folio | typ | name | ALT (rolle, anmerkung) | NEU (rolle, anmerkung) |
|---|---|---|---|---|---|
| UAKUG/NIM_003 | `1_1` | `institution` | `Deutsches Musikinstitut für Ausländer` | [('herausgeber', '')] | [('absender', '')] |
| UAKUG/NIM_005 | `` | `` | `` | [('', '')] | [('', ''), ('erwähnt', '')] |
| UAKUG/NIM_007 | `3` | `person` | `Wagner, Wolfgang` | [('unterzeichner', '')] | [('inhaber', 'im Original: "Ira Malaniuk-Baasch So." [Solistin?]')] |
| UAKUG/NIM_011 | `19` | `ereignis` | `Münchner Opern-Festspiele` | [('auffuehrungsort', '')] | [('rahmenveranstaltung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-06-22/1952-08-25` | [('rahmenveranstaltung', ''), ('ratenzahlung', '')] | [('spielzeit', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-07-23` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-07-24` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-07-30` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-08-02` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-08-03` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-08-06` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-08-07` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-08-09` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-08-12` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-08-17` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-08-20` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-08-21` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-08-24` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `datum` | `1952-08-25` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `institution` | `Bayreuther Festspiele` | [('rahmenveranstaltung', '')] | [('veranstalter', '')] |
| UAKUG/NIM_022 | `1_1` | `person` | `Malaniuk, Ira` | [('vertragspartner', '')] | [('sänger', '')] |
| UAKUG/NIM_022 | `1_1` | `rolle` | `Brangäne` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `rolle` | `Fricka` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `1_1` | `rolle` | `Magdalena` | [('auftritt', '')] | [('aufführung', '')] |
| UAKUG/NIM_022 | `3` | `datum` | `1952-03-04/1952-04-02` | [('aufführung', '')] | [('spielzeit', '')] |
| ... | | | | | insgesamt 72 Schluessel |

## 10 Referenzielle Pruefung Signatur + Folio gegen die Objekttabelle

Objekttabelle: 1001 Objekt-IDs, 208 Signaturen, Folio-Spalte `folio nr`.

Zum Vergleich gegen dieselbe (neue) Objekttabelle: ALT 468 Zeilen auf 18 Objekt-IDs ohne Objektsatz.

NEU: Verknuepfungszeilen ohne passenden Objektsatz 653 auf 19 Objekt-IDs.

Davon Signaturen, die die Objekttabelle gar nicht kennt: 2 Zeilen auf 1 Signaturen (`UAKUG/NIM_`).

| Objekt-ID ohne Objektsatz | Zeilen NEU | Zeilen ALT | Blatt | erste XLSX-Zeile |
|---|---:|---:|---|---:|
| `UAKUG/NIM_005` | 187 | 1 | Box 1 | 2143 |
| `UAKUG/NIM_137 11_62` | 114 | 114 | Box 5 | 712 |
| `UAKUG/NIM_137 8_30` | 60 | 60 | Box 5 | 502 |
| `UAKUG/NIM_137 10_27` | 56 | 56 | Box 5 | 608 |
| `UAKUG/NIM_137 7_29` | 55 | 55 | Box 5 | 443 |
| `UAKUG/NIM_137 11_21` | 43 | 43 | Box 5 | 669 |
| `UAKUG/NIM_137 9_27` | 38 | 38 | Box 5 | 566 |
| `UAKUG/NIM_137 2026-01-15` | 23 | 0 | Box 5 | 1272 |
| `UAKUG/NIM_137 2026-02-15` | 23 | 0 | Box 5 | 1279 |
| `UAKUG/NIM_004` | 19 | 22 | Box 1 | 292 |
| `UAKUG/NIM_168 2_1` | 6 | 6 | Box 9 | 6 |
| `UAKUG/NIM_137 11_1` | 5 | 5 | Box 5 | 664 |
| `UAKUG/NIM_137 8_1` | 4 | 4 | Box 5 | 498 |
| `UAKUG/NIM_137 9_1` | 4 | 4 | Box 5 | 562 |
| `UAKUG/NIM_137 10_1` | 4 | 4 | Box 5 | 604 |
| `UAKUG/NIM_168 2_3` | 4 | 4 | Box 9 | 2 |
| `UAKUG/NIM_168 2_2` | 4 | 4 | Box 9 | 12 |
| `UAKUG/NIM_137 7_1` | 2 | 2 | Box 5 | 441 |
| `UAKUG/NIM_` | 2 | 0 | Box 8 | 2 |

Objekt-IDs, die nur in ALT unaufgeloest waren. Sie sind entweder quellseitig geklaert oder tragen in NEU eine andere Schreibform und erscheinen dann oben unter dieser neuen Form: `UAKUG/NIM_137 15-1` (23), `UAKUG/NIM_137 15-2` (23)

## 11 CSV-Export Box 1 gegen Blatt Box 1 der NEU-Mappe

CSV Zeilen 3015, XLSX Blatt Box 1 Zeilen 3015.

CSV-Spalten `[' ', 'Folio', 'datenpunkt_id', 'typ', 'name', 'rolle', 'anmerkung']`

Zellabweichungen in den ersten 3015 Zeilen und 7 Spalten: 24.

| CSV-Zeile | Spalte | CSV | XLSX |
|---:|---|---|---|
| 436 | name | `1956-11` | `1956-11-01 00:00:00` |
| 867 | name | `06-09` | `2026-09-06 00:00:00` |
| 933 | name | `1944-03` | `1944-03-01 00:00:00` |
| 934 | name | `1945-05` | `1945-05-01 00:00:00` |
| 951 | name | `1945-05` | `1945-05-01 00:00:00` |
| 952 | name | `1945-09` | `1945-09-01 00:00:00` |
| 1386 | name | `1954-11-8` | `1954-11-08 00:00:00` |
| 2374 | datenpunkt_id | `01.01` | `2026-01-01 00:00:00` |
| 2375 | datenpunkt_id | `01.02` | `2026-02-01 00:00:00` |
| 2376 | datenpunkt_id | `01.03` | `2026-03-01 00:00:00` |
| 2377 | datenpunkt_id | `01.04` | `2026-04-01 00:00:00` |
| 2393 | datenpunkt_id | `01.01` | `2026-01-01 00:00:00` |
| 2394 | datenpunkt_id | `01.02` | `2026-02-01 00:00:00` |
| 2395 | datenpunkt_id | `01.03` | `2026-03-01 00:00:00` |
| 2396 | datenpunkt_id | `01.04` | `2026-04-01 00:00:00` |
| 2397 | datenpunkt_id | `01.01` | `2026-01-01 00:00:00` |
| 2398 | datenpunkt_id | `01.02` | `2026-02-01 00:00:00` |
| 2399 | datenpunkt_id | `01.03` | `2026-03-01 00:00:00` |
| 2400 | datenpunkt_id | `01.04` | `2026-04-01 00:00:00` |
| 2685 | name | `36.000` | `36000` |
| 2686 | name | `18.000` | `18000` |
| 2688 | name | `90.000` | `90000` |
| 2689 | name | `90.000` | `90000` |
| 2693 | name | `180.000` | `180000` |

## 12 Zweitfassung gegen ALT

Zweitfassung `new-export\M3GIM-Verknüpfungen.download-altform.xlsx.bak`, 4165 Zeilen (ALT 4165).

| Schluessel | nur Zweitfassung | nur ALT |
|---|---:|---:|
| strikt | 267 | 268 |
| normalisiert | 66 | 67 |

| Signatur | Folio | typ | name | ALT | Zweitfassung |
|---|---|---|---|---|---|
| UAKUG/NIM_004 | `` | `datum` | `1957-08-27` | [('erwähnt', '')] | [] |
| UAKUG/NIM_004 | `` | `ort+datum` | `Wien, 1957-09-07` | [('entstehung', '')] | [] |
| UAKUG/NIM_004 | `` | `person` | `Cox, Warren` | [('adressat', '')] | [] |
| UAKUG/NIM_004 | `16` | `datum` | `1956-11` | [('erwähnt', 'Premiere')] | [] |
| UAKUG/NIM_004 | `16` | `datum` | `1956-11-01` | [] | [('erwähnt', 'Premiere')] |
| UAKUG/NIM_004 | `22` | `datum` | `1957-08-27` | [] | [('erwähnt', '')] |
| UAKUG/NIM_004 | `22` | `ort+datum` | `Wien, 1957-09-07` | [] | [('entstehung', '')] |
| UAKUG/NIM_004 | `22` | `person` | `Cox, Warren` | [] | [('adressat', '')] |
| UAKUG/NIM_004 | `30` | `person` | `Baasch-Malaniuk, Ira` | [('erwähnt', '')] | [] |
| UAKUG/NIM_004 | `30` | `person` | `Malaniuk, Ira` | [] | [('erwähnt', '')] |
| UAKUG/NIM_004 | `34` | `ort+datum` | `06-09` | [('erscheinungsdatum', 'ohne Jahr')] | [] |
| UAKUG/NIM_004 | `34` | `ort+datum` | `2026-09-06` | [] | [('erscheinungsdatum', 'ohne Jahr')] |
| UAKUG/NIM_005 | `15` | `datum` | `1944-03` | [('erwähnt', '')] | [] |
| UAKUG/NIM_005 | `15` | `datum` | `1944-03-01` | [] | [('erwähnt', '')] |
| UAKUG/NIM_005 | `15` | `datum` | `1945-05` | [('erwähnt', '')] | [] |
| UAKUG/NIM_005 | `15` | `datum` | `1945-05-01` | [] | [('erwähnt', '')] |
| UAKUG/NIM_005 | `15` | `datum` | `1945-09` | [('erwähnt', '')] | [] |
| UAKUG/NIM_007 | `5_1` | `ausgaben` | `18.000` | [('erwähnt', '5% an Taubman')] | [] |
| UAKUG/NIM_007 | `5_1` | `ausgaben` | `18000` | [] | [('erwähnt', '5% an Taubman')] |
| UAKUG/NIM_007 | `5_1` | `ausgaben` | `36.000` | [('erwähnt', '10% an [Organi]')] | [] |
| UAKUG/NIM_007 | `5_1` | `ausgaben` | `36000` | [] | [('erwähnt', '10% an [Organi]')] |
| UAKUG/NIM_007 | `5_1` | `einnahmen` | `90.000` | [('erwähnt', '2 x Götterdämmerung (90.000 pro Aufführung)'), ('erwähnt', '2 x Walküre (90.000 pro Aufführung)')] | [] |
| UAKUG/NIM_007 | `5_1` | `einnahmen` | `90000` | [] | [('erwähnt', '2 x Götterdämmerung (90.000 pro Aufführung)'), ('erwähnt', '2 x Walküre (90.000 pro Aufführung)')] |
| UAKUG/NIM_007 | `5_1` | `summe` | `180.000` | [('erwähnt', 'Dépôt für Transfer')] | [] |
| UAKUG/NIM_007 | `5_1` | `summe` | `180000` | [] | [('erwähnt', 'Dépôt für Transfer')] |
| ... | | | | | insgesamt 133 |
