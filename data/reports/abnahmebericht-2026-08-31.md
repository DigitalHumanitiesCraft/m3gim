---
title: "Abnahmebericht zur Session vom 31. August 2026"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: review
created: 2026-08-31
updated: 2026-08-31
language: de
version: 1.0
authors: [Christopher Pollin]
generated-with: Claude Code
related: [data, data-errors, architecture-decisions, testing, specification]
---

# Abnahmebericht zur Session vom 31. August 2026

Feedback-Analyse, Exploration der neuen Datenlieferung, sechs behobene Frontend-Fehler, vollzogene Datenübernahme (E-152), Test-Refactoring, Implementierungsplan und Entscheidungskatalog. Statusdokument, alle Zahlen sind Momentaufnahme dieses Tages. Die Detailberichte liegen unter `data/reports/session-2026-08-31/`.

## Ergebnis in Kürze

Das Feedback des Erschließungsteams ist vollständig analysiert und in jedem Punkt berechtigt. Die neue Datenlieferung liegt verlustfrei gesichert vor und ist durch einen isolierten Pipeline-Probelauf, zwei Quell-Diffs und ein Test-Audit vermessen. Sechs belegte Frontend-Fehler sind testgetrieben behoben und im Browser verifiziert. Nach vier Operatorentscheidungen, alle auf Empfehlung, sind am selben Tag die Datenübernahme (E-152) und das Test-Refactoring umgesetzt; die Anwendung läuft lokal auf dem neuen Datenstand, beide Testsuiten sind grün, und es fehlt nur noch die Commit-Freigabe. Die Modellierungsrunden 2 bis 4 und der Ansichten-Umbau warten auf die verbleibenden Entscheidungen in Abschnitt 7.

## 1. Datenlage

Das Team erfasst seit Anfang Juli in einem eigenen Google Sheet („Verknüpfungstabelle neu"), das im Repository nie angekommen war; die Website zeigte den Stand vom 22. Juni. Der XLSX-Export des neuen Sheets zerstört durch Autokonvertierung drei Spalten (Monatsdatierungen, Beteiligungs-IDs, Bindestrich-Folios); die manuellen CSV-Exporte je Blatt bewahren die Erfassungsintention und sind seit E-152 die getrackte Quelle.

| Kennzahl | Juni | August |
|---|---:|---:|
| Verknüpfungszeilen (mit Typ) | 3 540 | 4 787 |
| Objekte | 917 | 1 018 |
| Objekte mit mindestens einer Verknüpfung | 16,6 % | 17,9 % |
| Typ und Rolle im Kontrollvokabular des Teams | 64,6 % | 75,1 % |
| Erwähnte Datumsangaben | 277 | 673 |
| Personenindex-Einträge | 328 | 477 |

Bewertung. Deutlich besser in Tiefe und Vokabulardisziplin, stagnierend in der Breite, schlechter in der Indexhygiene. Der Personenindex trägt viele Zeilen ohne Kennung und 27 Namensdubletten, darunter eine doppelte Malaniuk-Zeile, die der Zentralfigur ohne die neue Schutzregel die Wikidata-Anbindung genommen hätte. Die vermissten Personen und Orte (Herminghaus, Wuppertal, sechs weitere Orte) hat das Team selbst nacherfasst.

## 2. Die vier Fehlermeldungen des Teams

| Meldung | Befund | Einordnung |
|---|---|---|
| Personen fehlen (Wagners) | Ausnahmeliste im falschen Namensformat plus Teilstring-Abgleich ohne Wortgrenze; 31 Personen zu Unrecht gefiltert | behoben |
| Herminghaus, Wuppertal fehlen | Daten vorhanden; Netzwerk blendet Einmal-Nennungen regelhaft aus, Wuppertal fehlte im Ortsindex und hat keine Koordinate | Entscheidung plus Wikidata-Lauf |
| Chronik zeigt Quellendatum | Zutreffend; die erwähnten Daten liegen im Datensatz, keine Zeitansicht zeigt sie | geplanter Umbau |
| Rollen nicht gegendert | Erfassung durchgängig in Doppelpunktform; Pipeline normalisiert laut Spezifikation, Anzeigeform ist an einer Stelle im Vokabular änderbar | Entscheidung mit Team |

## 3. Behobene Fehler

Jeder Fix nach demselben Muster, zuerst ein an der echten Kette fehlschlagender Test, dann die minimale Korrektur. Details in `session-2026-08-31/frontend-bugfixes.md`.

| Fehler | Ort | Wirkung der Korrektur |
|---|---|---|
| Wagner-Ausnahmen greifen nie, Wortgrenzen-Falle | `constants.js`, `_network-geometry.js` | statt 31 fallen 16 Personen aus dem Netzwerk, alle mit belegter Komponisten-Rolle |
| Konvoluttitel verloren (`_sammlung` gegen `_collection`) | `loader.js` | 15 statt 3 von 17 Konvoluten tragen ihren Titel |
| Q-ID-Kollision zieht Relationen auf Tippfehlervariante | `loader.js` | belegstärkster Eintrag gewinnt deterministisch |
| Zwei divergierende Jahreszählungen, Geister-Dekaden | `main.js`, `statistics-data.js` | eine Jahresauflösung über `extractYear`; Handoff-Punkt integriert und ausgetragen |
| BibTeX-Export ohne Jahr bei Anker-Datierung | `basket.js` | Jahr aus `primaryYear`, Export erstmals testbar |
| Datumsartefakt `06-09` als Ort im Index | `loader.js` | Ortsliste bereinigt |

Nachgezogen wegen Quelländerung: der Sektions-Test in `record-partition.test.mjs`, weil das Team die Rolle des Programmheft-Ankers von `herausgeber` auf `Absender:in` geändert hat.

## 4. Analysebausteine

Alle unter `data/reports/session-2026-08-31/`, die beiden Diff-Werkzeuge als Vorlagen unter `tools/`.

| Bericht | Kernbefund |
|---|---|
| `diff-sources.md` | Objekte und Indizes Juni gegen August, Indexhygiene-Befunde, Kopfzeilen-Regressionen |
| `diff-verknuepfungen.md` | Verknüpfungstabelle im Detail, Autokonvertierung, 203 typlose Zeilen, Kontrollblatt-Abgleich |
| `pipeline-dry-run.md` | Transformation läuft, Prüfskript brauchte zwei Nachzüge, 7 Testausfälle sauber sortiert |
| `test-audit.md` | Urteil je Testdatei, stumpfe Baselines, sechs zu schwache Tests, Plan in 13 Schritten |
| `frontend-umbauplan.md` | Acht Schritte zu drei Typ-Ansichten mit gemeinsamem Facettenfilter |
| `modellierung-neue-datenpunkte.md` | Einfügefertige Entwürfe für `data.md` und Vokabular, vier Umsetzungsrunden |
| `frontend-bugfixes.md` | Sechs Fixes mit Test rot zu grün, Browserlauf über alle acht Tabs |
| `test-refactoring.md` | Sechs Tests geschärft, fünf verlustfreie Zusammenlegungen, `testing.md` nachgezogen |
| `daten-uebernahme.md` | E-152 umgesetzt, Kennzahlen alt/neu, Klassifikation der Testausfälle |

## 5. Implementierungsplan

1. Datenübernahme. CSV-Quellpfad, neue Prüfschicht, Prüfskript-Nachzüge, Index-Schutzregeln, Übernahme, Baseline-Nachzug. Umgesetzt, siehe Abschnitt 6.
2. Testsuite-Sanierung. Dreizehn Schritte aus dem Audit; der entscheidungsfreie Teil ist umgesetzt.
3. Modellierung. Vier Runden nach Spezifikation-zuerst; Runde 1 (Rollenbegriffe) ist mit E-152 umgesetzt, Runden 2 bis 4 (Seiten-Hierarchie über `rico:hasOrHadConstituent`, Vorkommnis und Beteiligung, Aboutness) stehen aus.
4. Filterfundament. Mehrfachauswahl abschließen, gemeinsame Funktion von Filter zu Dokumentmenge, drei fehlende Store-Indizes, Filterzustand in der URL.
5. Drei Ansichten. Zeitstrahl der erwähnten Daten, ortszentrierte Karte, Personennetzwerk mit Kanten auf der gefilterten Menge.

Parallel dazu geht die Rückmeldeliste (Abschnitt 8) ans Erschließungsteam; deren Punkte kann keine Programmierung ersetzen.

## 6. Umsetzung am selben Tag

Nach den Entscheidungen wurden Phase 1 und 2 ausgeführt und unabhängig verifiziert. Die Verknüpfungstabelle liegt als CSV je Blatt unter `data/google-spreadsheet/verknuepfungen/` (E-152), die Pipeline liest sie mit Schutzregeln gegen die Index-Defekte, die Zeitstempel-Fehlerklasse ist im CSV-Weg null, und 29 zuvor verlorene Verknüpfungen an `NIM_016` sind zurückgewonnen. Der ausgelieferte Datensatz wächst auf 1 000 Dokumente und 1 240 Verknüpfungen ohne einen Verlust; die Malaniuk-Kennung bleibt durch die Vorrangregel erhalten. Das Prüfskript arbeitet wieder (798 Scheinfehler entfallen), neue Quellfehler stehen als QF-35 bis QF-43 im Register, das Vokabular trägt die fünf neuen Rollenbegriffe, und die Baselines sind nach der beschlossenen 90-Prozent-Politik neu verankert. Das Test-Refactoring hat sechs Tests geschärft und fünf verlustfrei zusammengelegt; ein Audit-Befund erwies sich als teilweise unzutreffend und wurde korrigiert statt umgesetzt.

Grenze der Aussagekraft. Solange die Auftrittsbündelung in der Erfassung erst beginnt, beantworten die gefilterten Ansichten die Frage „wer war beteiligt" auf der Ebene „im selben Dokument genannt". Die Ansichten weisen diesen Schärfegrad aus und werden mit fortschreitender Bündelung von selbst präziser. Die Beteiligungsebene bindet im heutigen Material Partie und Honorar und noch keine Person; das Modell bildet das ehrlich ab.

## 7. Entscheidungskatalog

### Entschieden am 31. August, umgesetzt

| Frage | Entscheidung |
|---|---|
| Übernahme des neuen Datenstands | jetzt, mit Schutzregeln (E-152) |
| Quellformat der Verknüpfungstabelle | CSV je Blatt als getrackte Quelle; Team stellt drei Spalten auf Nur-Text |
| Baseline-Politik der Tests | nach jedem Datenupdate auf etwa 90 % des Ist |
| Entscheidungsfreies Test-Refactoring | umgesetzt |

### Offen, Gestaltung (blockieren Filterfundament und Ansichten)

| Frage | Empfehlung |
|---|---|
| Einmal-Nennungen im Netzwerk (zwei Drittel aller Personen) | Schalter mit sichtbarem Zähler, Voreinstellung aus; Gegenposition des Teams dokumentiert |
| Chronik und neuer Zeitstrahl | eine Ansicht mit Ebenen-Umschaltung |
| Entitätsauswahl der Karte | als Schreiber auf die Facetten behalten |
| Schärfegrad-Voreinstellung je Ansicht | Zeitstrahl und Karte eng, übrige weit |
| Gegenderte Anzeigeform der Rollen | mit dem Team klären; technisch eine Stelle im Vokabular |
| Netzwerk-Layout unter Filter | Positionen stabil, Kanten auf dem Schnitt |
| Ensemble und Finanzen als Facetten | zurückstellen, Datenlage zu dünn |
| Browser-Smoke-Test als Gate oder Bericht | Gate, Fehler brechen den Lauf |
| Personenkategorie aus Wikidata-Beruf statt Namensliste | mittelfristig umstellen |

### Offen, Modellierung

Zwanzig Einzelfragen mit Empfehlung in `session-2026-08-31/modellierung-neue-datenpunkte.md` § 11; die Runde-1-Fragen sind mit E-152 abgeräumt, elf Operatorfragen und neun Team-Klärungen bleiben (darunter Vertragsstatus jetzt bauen, Konvolut-Kante auf `rico:includesOrIncluded` mitziehen).

## 8. Rückmeldeliste ans Erschließungsteam

1. Drei Spalten der Verknüpfungstabelle auf Nur-Text stellen (IDs, Folio, Datumswerte); ID-Schreibung vereinheitlichen (`1.01`-Form); Spaltenname `data_id` angleichen.
2. Personenindex bereinigen, Malaniuk-Dublette zuerst, dann Namensdubletten, verlorene Kennungen und die Zeilen ohne `m3gim_id`; Werkindex-Kollision der drei Requiem-Zeilen auflösen; vier beschädigte Kopfzellen reparieren.
3. Unmögliche Kalenderdaten und das Zukunftsdatum korrigieren; drei Monatsdatierungen als Text wiederherstellen.
4. Verwaiste Verknüpfungen schließen, Bindestrich-Folios, leere Objektzeile, Signaturstümpfe, zweistellige Signaturen, 187 Zeilen ohne Folio.
5. 203 Zeilen ohne Typ nachtragen; Kontrollblatt Typ-Rolle vervollständigen; Bündelungstiefe der Aktivitäts-IDs festlegen; Semantik von Rundfunkhonorar gegen Gesamtvergütung klären.
6. Fehlende Orte und Organisationen in die Indizes aufnehmen, danach läuft der Wikidata-Abgleich neu und die Karte füllt sich.

Die instanzgenauen Fundstellen stehen im [Datenfehler-Register](../../knowledge/data-errors.md) (QF-35 bis QF-43 neu).

## 9. Parallele Arbeit

Eine parallele Codex-Session hat am selben Tag sieben Scans der Bayreuther Programmhefte 1953 quellenkritisch ausgewertet, die Registereinträge QF-31 bis QF-34 und eine Integrationsvorlage unter `outputs/` erzeugt (Journal Session 71). Die Dateimengen überschneiden sich mit dieser Session nur in den beiden fortgeschriebenen Registerdateien; die Besetzungsdaten betreffen genau die verwaisten `NIM_137`-Folios und fließen in die weitere Übernahmeplanung ein.

## 10. Verifikation

- Testsuiten nach Fixes, Refactoring und Übernahme unabhängig nachgeprüft, `node --test tests/frontend/*.test.mjs` 254 von 254, `pytest tests/ -m "not slow"` 361 bestanden, 4 dokumentierte xfail (zwei davon test-gelockte Quellfehler QF-35 und QF-36).
- Pipeline-Probelauf doppelt gefahren (Agent und Kontrolllauf der Hauptsession) mit identischen Kennzahlen; der produktive Lauf hat `data/output/`, `docs/data/`, `docs/datenmodell.html` und den Quality-Snapshot regeneriert.
- CSV-Integrität je Blatt gegen den XLSX-Export gemessen, null Zeitstempel, IDs und Monatsdaten erhalten.
- Anwendung mit allen Fixes auf dem neuen Datenstand lokal unter `http://localhost:8377` prüfbar.
- Nach der Commit-Freigabe werden die Arbeitspakete als getrennte Commits mit expliziten Pfaden gestaged und gepusht; die Commit-Adressen und die GitHub-Pages-Site treten dann an die Stelle der lokalen Nachweise.
