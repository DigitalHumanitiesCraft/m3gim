# M³GIM Migrationsspezifikation

Technische Referenz für die Migration der Archivexporte in die M³GIM-Datenstruktur.

## Quelldateien

Die vier Excel-Dateien liegen im Ordner data/archive-export/ und enthalten Metadaten zu einem Nachlass.

Die Datei "Nachlass Malaniuk.xlsx" enthält 182 Datensätze des Hauptbestands mit 19 Spalten. Die Datei "Nachlass Malaniuk Fotos.xlsx" enthält 228 Fotografien mit 21 Spalten. Die Datei "Nachlass Malaniuk Plakate.xlsx" enthält 25 Plakate mit 12 Spalten. Die Datei "Nachlass Malaniuk Tonträger.xlsx" enthält 1 Tonträger mit 18 Spalten.

## Zielstruktur

Die Migration erzeugt zwei CSV-Dateien für den Import in Google Sheets.

Die erste Zieldatei "objekte.csv" kombiniert Hauptbestand, Plakate und Tonträger zu insgesamt 208 Zeilen. Sie enthält 12 Spalten in folgender Reihenfolge: archivsignatur, box_nr, titel, entstehungsdatum, datierungsevidenz, dokumenttyp, sprache, umfang, zugaenglichkeit, scan_status, bearbeiter, erfassungsdatum.

Die zweite Zieldatei "fotos.csv" enthält alle 228 Fotografien mit 16 Spalten in folgender Reihenfolge: archivsignatur, alte_signatur, fotobox_nr, titel, entstehungsdatum, datierungsevidenz, beschreibung, stichwoerter, fotograf, fototyp, format, aufnahmeort, rechte, filename, bearbeiter, erfassungsdatum.

## Feldmapping Hauptbestand

Die Spalte "Archivsignatur" wird direkt zu archivsignatur. Die Spalte "Heft-Nr./Box-Nr." wird zu box_nr, wobei nur der numerische Wert extrahiert wird. Die Spalte "Titel" wird direkt zu titel. Die Spalte "Datierung von/bis" wird zu entstehungsdatum mit Datumskonvertierung. Die Spalte "Systematikgruppe 1" wird zu dokumenttyp mit Vokabular-Mapping. Die Spalte "Umfang" wird direkt zu umfang. Die Spalte "Sperrfrist/gesperrt bis" wird zu zugaenglichkeit mit Mapping. Die Spalte "Filename/Speicherort" wird zu scan_status, wobei geprüft wird ob ein Wert vorhanden ist. Die Spalte "Verzeichnungsprotokoll" wird aufgesplittet in bearbeiter und erfassungsdatum.

Die Felder datierungsevidenz und sprache haben keine Entsprechung im Export und bleiben leer.

Die Spalten "Dat. - Findbuch", "Verzeichnungsstufe" und "AV-Standort" werden nicht übernommen.

## Feldmapping Fotografien

Die Spalte "Archivsignatur" wird direkt zu archivsignatur. Die Spalte "alte Archiv-Sign." wird zu alte_signatur. Die Spalte "Fotobox-Nr." wird zu fotobox_nr. Die Spalte "Titel" wird direkt zu titel. Die Spalte "Datierung von/bis" wird zu entstehungsdatum mit Datumskonvertierung. Die Spalte "Beschreibung" wird direkt zu beschreibung. Die Spalte "Stichwörter" wird direkt zu stichwoerter. Die Spalte "Fotograf" wird direkt zu fotograf. Die Spalte "Fototyp" wird zu fototyp mit Mapping. Die Spalte "Format" wird direkt zu format. Die Spalte "Ort der Aufnahme" wird direkt zu aufnahmeort. Die Spalte "Rechte" wird direkt zu rechte. Die Spalte "Filename" wird direkt zu filename.

Die Felder datierungsevidenz, bearbeiter und erfassungsdatum bleiben leer.

## Feldmapping Plakate

Plakate werden in die Objekttabelle integriert mit dokumenttyp "plakat". Die Spalte "Archivsignatur" wird zu archivsignatur. Die Spalte "Mappen-Nr." wird zu box_nr. Die Spalte "Titel" wird zu titel. Die Spalte "Datierung von/bis" wird zu entstehungsdatum. Die Spalte "Format" wird zu umfang. Alle anderen Zielfelder bleiben leer.

## Feldmapping Tonträger

Der Tonträger wird in die Objekttabelle integriert mit dokumenttyp "tontraeger". Die Spalte "Archivsignatur" wird zu archivsignatur. Die Spalte "Titel" wird zu titel. Aus der Spalte "Datum/Uhrzeit/Dauer" wird nur das Datum extrahiert und zu entstehungsdatum. Alle anderen Zielfelder bleiben leer.

## Signaturenschemata

Der Hauptbestand verwendet das Schema UAKUG/NIM_ gefolgt von drei Ziffern, zum Beispiel UAKUG/NIM_028. Fotografien verwenden UAKUG/NIM_FS_ gefolgt von drei Ziffern, zum Beispiel UAKUG/NIM_FS_047. Plakate verwenden UAKUG/NIM/PL_ gefolgt von zwei Ziffern, zum Beispiel UAKUG/NIM/PL_01. Beachte den Schrägstrich statt Unterstrich vor PL. Tonträger verwenden UAKUG/NIM_TT_ gefolgt von zwei Ziffern, zum Beispiel UAKUG/NIM_TT_01.

## Datumskonvertierung

Das Archivformat verwendet YYYYMMDD ohne Trennzeichen. Das Zielformat ist ISO 8601 mit Bindestrichen.

Ein achtstelliger Wert wie 19580418 wird zu 1958-04-18. Ein sechsstelliger Wert wie 195804 wird zu 1958-04. Ein vierstelliger Wert wie 1958 bleibt 1958. Zeiträume im Format YYYYMMDD-YYYYMMDD werden zu YYYY-MM-DD/YYYY-MM-DD mit Schrägstrich als Trenner. Leere oder ungültige Werte bleiben leer.

## Systematikgruppen-Mapping

Die Systematikgruppe "Korrespondenzen" wird direkt zu dokumenttyp "korrespondenz". Die Systematikgruppe "Sammlungen" wird direkt zu dokumenttyp "sammlung".

Bei den Systematikgruppen "Berufliche Tätigkeit" und "Dokumente" entscheidet der Inhalt der Spalte "Enthält" über den dokumenttyp. Die Prüfung erfolgt case-insensitive auf Schlüsselwörter.

Für dokumenttyp "vertrag" wird geprüft auf: vertrag, engagement, gage, honorar. Für dokumenttyp "programm" wird geprüft auf: programm, programmheft, programmzettel. Für dokumenttyp "presse" wird geprüft auf: kritik, rezension, besprechung, artikel. Für dokumenttyp "repertoire" wird geprüft auf: repertoire, rollenliste, partien. Für dokumenttyp "autobiografie" wird geprüft auf: lebenslauf, biografie, vita. Für dokumenttyp "identitaetsdokument" wird geprüft auf: pass, ausweis, visum, zeugnis, diplom. Für dokumenttyp "studienunterlagen" wird geprüft auf: studien, noten, partitur.

Wenn kein Schlüsselwort gefunden wird, ist der Fallback "sammlung".

## Fototyp-Mapping

Der Wert "s/w" wird zu "sw". Der Wert "Farbfoto" wird zu "farbe". Der Wert "PDF" wird zu "digital". Leere oder unbekannte Werte werden zu "sw" als Fallback.

## Zugänglichkeit-Mapping

Ein leerer Wert in "Sperrfrist/gesperrt bis" wird zu "offen". Ein Datum in der Zukunft wird zu "gesperrt". Ein Datum in der Vergangenheit wird zu "offen". Jeder andere nicht-leere Text wird zu "eingeschraenkt".

## Scan-Status-Mapping

Ein leerer Wert in "Filename/Speicherort" wird zu "nicht_gescannt". Jeder nicht-leere Wert wird zu "gescannt".

## Verzeichnungsprotokoll aufsplitten

Das Feld "Verzeichnungsprotokoll" enthält typischerweise einen Namen gefolgt von einem Datum im Format TT.MM.JJJJ. Der Name wird zu bearbeiter, das Datum wird zu erfassungsdatum im Format YYYY-MM-DD konvertiert. Die Trennung erfolgt am Datumspattern. Falls kein Datum erkennbar ist, wird der gesamte Wert zu bearbeiter und erfassungsdatum bleibt leer.

## Kontrollierte Vokabulare

Für dokumenttyp sind erlaubt: autobiografie, korrespondenz, vertrag, programm, presse, repertoire, studienunterlagen, identitaetsdokument, plakat, tontraeger, sammlung.

Für sprache sind erlaubt: de, uk, en, fr, it.

Für scan_status sind erlaubt: nicht_gescannt, gescannt, online.

Für datierungsevidenz sind erlaubt: aus_dokument, erschlossen, extern, unbekannt.

Für zugaenglichkeit sind erlaubt: offen, eingeschraenkt, gesperrt.

Für fototyp sind erlaubt: sw, farbe, digital.

## Ausgabeformat

Die CSV-Dateien verwenden UTF-8-Encoding, Komma als Feldtrenner und doppelte Anführungszeichen um alle Textfelder. Die erste Zeile enthält die Spaltenüberschriften.

## Logging

Das Script soll ein Log führen mit Einträgen für ungültige Signaturen, nicht mappbare Systematikgruppen mit Fallback-Verwendung, ungültige Datumsformate mit Originalwert-Beibehaltung und Zusammenfassung der verarbeiteten Datensätze pro Quelldatei.