---
title: Datenfehler-Register
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: draft
created: 2026-06-21
updated: 2026-06-22
language: de
version: 0.1
authors: [Christopher Pollin]
generated-with: Claude Code
author: claude-code-worker
human-reviewed: false
related: [plan, data, frontend-sichtpruefung-2026-06-21, pipeline, decisions]
---

# Datenfehler-Register

> Gesammelte, laufend gepflegte Liste der bekannten Datenfehler des Bestands, getrennt nach Quellfehler und Abgleichfehler, jeder Eintrag mit Fundstelle und Status. Dies ist die kanonische Adresse für Datenfehler; [plan.md](plan.md) und [frontend-sichtpruefung-2026-06-21.md](frontend-sichtpruefung-2026-06-21.md) verweisen hierher. Strukturelle Excel-Formatverbesserungen (Kopfzeilen, Dropdown-Konfiguration, ISO-Datierung) sind keine Datenfehler und bleiben in [plan.md](plan.md § Strukturelle Quell-Fixes).

## Grundsatz

Datenfehler werden in dieser Lane nie selbst korrigiert (order-m3gim 2026-06-21, Punkt 3). Die Korrektur liegt bei der Datenerfassung (Quellfehler im Excel) oder in einer Reconciliation-Runde mit Approval-Verifikation (Abgleichfehler). Die Pipeline reicht Quellfehler getreu durch, was `tests/test_34_rawdata_crosscheck.py` zellgenau gegen die per `(xlsxSheet, xlsxRow)` adressierte Rohzelle belegt. Zwei Quellfehler sind über xfail-Marker test-gelockt, damit sie nicht stillschweigend verschwinden, sondern beim Quell-Fix sichtbar umschlagen.

Status-Werte: `offen` (noch nicht adressiert), `test-gelockt` (durch einen xfail-Test gegen stilles Regressieren gesichert), `UI-gemildert` (Frontend-Mitigation greift, die Quellwurzel bleibt offen).

## Quellfehler

Im Excel zu beheben. Vor der Bearbeitung jeweils gegen den [Quality-Snapshot](../data/reports/quality-snapshot.md) verifizieren, da ein frischer Export einige Punkte bereits behoben haben kann.

| ID | Befund | Fundstelle | Status |
|---|---|---|---|
| QF-01 | Zukunftsdatum: `NIM_004_34` trägt das Jahr 2026 in einem Kritiken-Konvolut der Spanne 1952 bis 1968. Folge im Interface: der Zeitfenster-Slider im Netzwerk-Tab reicht bis 2026. | `M3GIM-Objekte.xlsx`, Record `NIM_004_34` | offen |
| QF-02 | `zielort` von `NIM_007_20`/`NIM_007_21` wirkt vertauscht. Umschlag „an Deutsche Oper Berlin" (NIM_007_20) trägt `zielort = Zürich`, „an Stadttheater Zürich" (NIM_007_21) trägt `zielort = Berlin`. Die Zielorte widersprechen den Titeln. | `M3GIM-Verknüpfungen.xlsx` Zeile 1269 und 1273; Titelquelle `M3GIM-Objekte.xlsx` | offen |
| QF-03 | Beethoven van gegen von: in Repertoire-Statistik und Werkindex erscheinen `Beethoven, Ludwig van` und `Beethoven, Ludwig von` als zwei getrennte Komponisten. | Werkindex; `van` bei 9. Sinfonie und Geschöpfe des Prometheus, `von` bei drei Liedern | test-gelockt (`test_24`) |
| QF-04 | PL_07-Duplikat: für `UAKUG/NIM/PL_07` existieren zwei Zeilen im Objekte-Sheet. | `M3GIM-Objekte.xlsx`, Signatur `UAKUG/NIM/PL_07` | test-gelockt (`test_05`) |
| QF-05 | Sophokles-Rolle: Sophokles trägt die Rolle `Aufführung`, obwohl sein Werk aufgeführt wurde, nicht er selbst. Korrekt wäre `Vorlage` oder `Verfasser`. | `M3GIM-Verknüpfungen.xlsx` Zeile 1208 | offen |
| QF-06 | Verwaiste Signatur `UAKUG/NIM_11`: ein Verknüpfungseintrag ohne erfasste Objektzeile, betroffen ist die einzige arbeitgeber-Zeile (`test_12` skipt dort). | `M3GIM-Verknüpfungen.xlsx`, Signatur `UAKUG/NIM_11` | offen |
| QF-07 | Verwaiste Signatur `UAKUG/NIM_168`: Box 9 referenziert durchgehend diese Signatur, für die kein Objekt erfasst ist, sodass ihre Verknüpfungen nicht angehängt werden. | `M3GIM-Verknüpfungen.xlsx`, Box 9 | offen |
| QF-08 | Fehlende Objekt-Folios bei `UAKUG/NIM_137`: mehrere in Box 5 referenzierte Folios fehlen im Objekte-Sheet, die zugehörigen Verknüpfungen laufen ins Leere. | `M3GIM-Objekte.xlsx` / `M3GIM-Verknüpfungen.xlsx`, Box 5 | offen |
| QF-09 | Datum in der Folio-Spalte: in Box 5 trägt mindestens eine Folio-Zelle ein Datum statt einer Folio-Nummer. | `M3GIM-Verknüpfungen.xlsx`, Box 5 | offen |
| QF-10 | Verschwundenes Presse-Konvolut: ein im vorigen Stand vorhandenes Konvolut fehlt im neuen Export, zu prüfen ob versehentlich entfernt. | Export-Diff voriger zu aktueller Stand | offen |
| QF-11 | Erfassungs-Tippfehler: `Maskenbidner` → `Maskenbildner`, `Rundfunkshonorar` → `Rundfunkhonorar`, `Malaiuk`/`Malniuk` → `Malaniuk`. Die Pipeline reicht sie bis zur Quellkorrektur unverändert durch. | XLSX-Erfassung, mehrere Zellen | offen |
| QF-12 | Zürich-Adressvarianten mit Umlaut-Tippfehler: `Zürich, Zurichbergstrasse 104` (`Zu` statt `Zü`) neben `Zürich, Zürichbergstrasse 104`. Teil der adressgenauen Ortsfragmentierung (siehe AF-03). | `M3GIM-Ortsindex.xlsx` | UI-gemildert (`cityOf`, E-108) |
| QF-13 | Dubletten und fehlende Index-IDs: mehrere Personen-, Organisations- und Werk-Einträge sind doppelt erfasst oder ohne `m3gim_id`. | Personen-, Organisations-, Werkindex | offen |
| QF-14 | Betrag in der Währungs-Spalte: einzelne Finanz-Verknüpfungen tragen als Währung `00 DM` bzw. `00 Belgische Francs` (Betrag in das Währungsfeld gerutscht), die in der Statistik als eigene Währungen erschienen. | `M3GIM-Verknüpfungen.xlsx`, Finanz-Verknüpfungen (`einnahmen`/`ausgaben`, `währung`) | UI-gemildert (Statistik-Donut bündelt Codes mit Ziffern als „unklar (Erfassung)") |

## Abgleichfehler

Entstehen im automatischen Wikidata-Match (Reconciliation), nicht in der Quelle. Korrektur über eine manuelle Q-ID im jeweiligen Index oder eine erneute Reconciliation-Runde mit Approval-Verifikation (`scripts/verify-manual-approvals.py`).

| ID | Befund | Fundstelle | Status |
|---|---|---|---|
| AF-01 | New York als Bundesstaat statt Stadt: alle drei New-York-Events tragen `wd:Q1384` (Bundesstaat, Zentroid 43 / -75) statt `wd:Q60` (Stadt, 40.7 / -74.0). Für Absende- und Zielort einer Korrespondenz ist die Stadt gemeint; im reaktivierten Atlas läge der Marker an falscher, ländlicher Position. Gleiche Klasse wie der frühere Q2861-Rostock-Fall (behoben). | STE `absendeort` NIM_004_1, `zielort` NIM_004_23, `entstehung` NIM_004_27 | offen |
| AF-02 | Personen-Fehlmatches auf gleichnamige, prominentere Entitäten, im Interface an widersprüchlichen Berufs- und Lebensdaten erkennbar: Dermota als Politiker (1876 bis 1914 statt Tenor 1910 bis 1989), Böhme als Ubootfahrer, Holm als Botaniker, Wächter als Maler (1762 bis 1852), Wiener als Physiker, Richter als Tischtennisspieler. Nicht je einzeln gegen Wikidata abschließend verifiziert; der Label-Widerspruch ist der Befund. | Personenindex, genannte Namen | offen |
| AF-03 | Adressgenaue Orte ohne Stadt-/Q-ID-Ebene: der Reconcile-Match-Key ist der rohe Ortsname-String, der Ortsindex trägt keine Stadt-/Q-ID-Spalte. Adressvarianten erhalten keine Q-ID, nur die nackten Städtenamen. Betroffen u. a. `Zürich, Zürichbergstrasse 104` (7×), `Zürich, Geibelstrasse 1/1` (4×), `München, Martiusstrasse 3` (1×). Frontend-Folge: der Ort-Filter „Zürich" verfehlte adressgenau erfasste Records, sechs Events bleiben im Atlas unverortet. | `M3GIM-Ortsindex.xlsx` | UI-gemildert (`cityOf` + Loader-Konsolidierung, E-108) |

## Verwandte Befunde ohne Quell- oder Abgleichfehler

Diese Punkte tauchen beim Durchklicken auf, sind aber Frontend- oder Spezifikationsfragen, keine Datenfehler, und werden im Code adressiert.

- Mobilitäts-Klassifikator (Befund M1/F1 der Sichtprüfung): die typisierten Ortsrollen wurden als „Nicht klassifiziert" geführt, obwohl [data.md](data.md § Ortsrollen) sie der Reise- und Korrespondenzmobilität zuordnet. Per order-m3gim Punkt 1 aufgelöst, die fünf Ortsrollen mappen jetzt auf den `korrespondenz`-Cluster (Entscheidung E-110 in [decisions.md](decisions.md)).
- Datierungs-Metrik-Differenz (Befund F2): das Statistik-Histogramm zählt 44 datierte Events, Atlas-Logik und Store-Zählung 46. Differenz aus unterschiedlicher Jahr-Parselogik, nicht blockierend, bei einer Mobilitäts-Überarbeitung die Zählwege angleichen.
- Erkennungslücke `dataQualityFlag` (E-102, Audit): die vier Flag-Regex (`name-nicht-eindeutig`/`vorname-fehlt`/`rolle-unsicher`/`quelle-tippfehler`) sind bewusst konservativ und fangen einige reale Unsicherheitssignale in `anmerkung` nicht (`Vorname unklar`, `unleserlich`, einzelnes `[…?]`). Bewusst kein Mislabeling, eine „unklar"-Zeile ist nicht „fehlt". Bei Bedarf Regex erweitern (ggf. neue Flags `quelle-unleserlich`/`vorname-unklar`) oder quellseitig vereinheitlichen. Pipeline-Heuristik, kein Datenfehler.
