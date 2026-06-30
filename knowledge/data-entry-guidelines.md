---
title: Erfassungsrichtlinie
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Domänenwissen
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/domain-knowledge
status: draft
created: 2026-06-17
updated: 2026-06-30
language: de
version: 0.3
authors: [Christopher Pollin]
generated-with: Claude Code
topics: ["[[Data Modelling]]", "[[Controlled Vocabularies]]", "[[Archival Description]]"]
knowledge-sources:
  vocabularies:
    GND: https://gnd.network
    Wikidata: https://www.wikidata.org
related: [data, research]
---

# Erfassungsrichtlinie

Diese Richtlinie ist der verbindliche Maßstab für die manuelle Datenerfassung des Teilnachlasses UAKUG/NIM, also nach welchen Konventionen die Tabellenfelder befüllt werden, welche kontrollierten Vokabulare gelten und wie mit Unsicherheit umgegangen wird. Sie ist die Soll-Seite der Datenqualität. Wo der erfasste Bestand davon abweicht, ist im generierten Quality-Snapshot und in der Modell-Spezifikation [data.md](data.md) dokumentiert. Das voll modellierte Rollen- und Klassenvokabular steht ebenfalls in [data.md](data.md), diese Seite trägt die Erfassungssicht des Archivteams.

> [!warning] Verknüpfungstabelle: neues Schema seit 2026-06-25 (E-127)
> Die Verknüpfungserfassung ist auf das Long-Format mit zweistufiger `aktivitaet_id` umgestellt (Anleitung Stand 2026-06-25, verfeinert E-125). Spalten: `archivsignatur`, `Folio`, `aktivitaet_id`, `typ`, `value`, `anmerkung`. Eine Ganzzahl identifiziert die Aktivität, eine zweistellige Dezimale `1.01` ff. die Beteiligung; `funktion` (kontrolliert) ist von `rolle` (gesungene Partie, frei) getrennt, Geld atomar mit eigener `währung`-Zeile, `aktivitaet` markiert die Art. Das löst die unten beschriebene einstufige `datenpunkt_id`-Konvention und die alte `typ`/`name`/`rolle`-Struktur ab. Der gereinigte Altbestand liegt als `data/migration/M3GIM-Verknuepfungen-v2.xlsx` (Vokabular-Glossar plus kuratiertes Beispiel-Blatt 7_29). Die `aktivitaet_id`-Vergabe ist menschlicher Durchgang und im migrierten Stand bewusst leer. Die Abschnitte unten zum Schichtenmodell, Personenform und Unsicherheit gelten unverändert; die Spaltenbeschreibung der Verknüpfungstabelle ist gegen die neue Anleitung zu lesen, bis dieses Dokument vollständig darauf umgeschrieben ist.

## Schichtenmodell der Erfassung

Die Erschließung läuft in den Schichten Daten erfassen, Quellen sprechen lassen und Interpretation, die aufeinander aufbauen und einzeln abgeschlossen werden können.

**Schicht 1, Daten erfassen.** Die Kernmetadaten eines Objekts werden in der Objekttabelle eingetragen, neue Personen, Organisationen, Orte und Werke werden in den Indextabellen angelegt. Für diese Schicht sind Objekttabelle, Personenindex, Organisationsindex und Ortsindex maßgeblich.

**Schicht 2, die Quellen sprechen lassen.** Die inhaltlichen Verknüpfungen eines Objekts zu Personen, Orten, Institutionen, Ereignissen und Werken werden in der Verknüpfungstabelle erfasst. Für diese Schicht ist allein die Verknüpfungstabelle maßgeblich, auch der Empfangsort einer Korrespondenz wird hier und nicht im Ortsindex geführt.

**Schicht 3, Interpretation.** Bei vertiefter Erschließung werden Detailangaben wie Honorare, Nebenleistungen oder vertragliche Konditionen ergänzt, ebenfalls in der Verknüpfungstabelle über den Verknüpfungstyp `detail`.

Copy-Paste aus der Quelle oder aus bestehenden Einträgen ist gegenüber dem Neutippen vorzuziehen, weil es weniger fehleranfällig ist. In jeder Zeile wird das Erfassungsdatum mitgeführt.

## Erfassungs-Workflow

Pro Objekt werden die folgenden Schritte in dieser Reihenfolge durchlaufen.

1. **Objekt anlegen.** In der Objekttabelle eine neue Zeile anlegen, die Archivsignatur eintragen und alle Schicht-1-Felder ausfüllen. Wo Dropdowns vorhanden sind, werden sie genutzt, die Normalisierungsregeln dieser Richtlinie sind dabei einzuhalten.
2. **Verknüpfungen erfassen.** In der Verknüpfungstabelle für dasselbe Objekt alle relevanten Personen, Orte, Institutionen, Ereignisse und Werke eintragen, pro Verknüpfung eine eigene Zeile. Werden dieselbe Person, derselbe Ort oder dasselbe Datum mehrfach genannt, wird der Bezug nur einmal erfasst, es sei denn die Rolle ändert sich.
3. **Indizes pflegen.** Neue Personen, Organisationen, Orte oder Werke in der jeweiligen Indextabelle anlegen und die fortlaufende ID vergeben. Duplikate sind ausgeschlossen.
4. **Status setzen.** In der Objekttabelle den Erfassungsstatus auf den erreichten Schichtfortschritt setzen.

## Konvolut, Folio und Umfang

Die Objektidentität wird aus der Archivsignatur und der Folioangabe gebildet. Innerhalb eines Konvoluts wird das Folio von eins weg durchnummeriert, in der Vorlage mit Bleistift oben rechts. Mehrere zusammenhängende Seiten eines Blattes tragen einen Unterstrich, also 5_1, 5_2 und so fort, in der Folio-Spalte steht in diesem Fall weiterhin nur 5.

Die Umfangsangabe nennt die Anzahl der Blätter. Als Seiten zählen die bedruckten Seiten, also Vorder- und Rückseiten getrennt.

## Datumsangaben

Datumsangaben folgen ISO 8601 in den hier festgelegten Granularitäten.

| Situation | Format | Beispiel |
|---|---|---|
| Vollständiges Datum | YYYY-MM-DD | 1958-04-18 |
| Nur Monat bekannt | YYYY-MM | 1958-04 |
| Nur Jahr bekannt | YYYY | 1958 |
| Zeitspanne | YYYY-MM-DD/YYYY-MM-DD | 1958-08-10/1958-09-09 |
| Zeitspanne nur Jahre | YYYY/YYYY | 1945/1947 |

Unsichere Datierungen werden mit einem vorangestellten Qualifier markiert, ein undatiertes Objekt lässt das Datumsfeld leer.

| Situation | Format | Beispiel |
|---|---|---|
| Ungefähre Datierung | circa:YYYY | circa:1958 |
| Terminus ante quem | vor:YYYY | vor:1958 |
| Terminus post quem | nach:YYYY | nach:1958 |
| Undatiert | Feld leer | |

Ergänzend hält das Feld `datierungsevidenz` fest, woher die Datierung stammt.

| Wert | Bedeutung |
|---|---|
| aus_dokument | Datum steht explizit im Dokument |
| erschlossen | Datum aus Kontext abgeleitet, etwa Poststempel, Briefkopf, Ereignisbezug |
| extern | Datum aus einer anderen Quelle ermittelt |
| unbekannt | keine Datierung möglich |

Die Zusammenführung von Datum und Evidenz zeigt sich an typischen Fällen.

| Quelle | entstehungsdatum | datierungsevidenz |
|---|---|---|
| Brief datiert „18. April 1958" | 1958-04-18 | aus_dokument |
| Brief ohne Datum, Poststempel „April 58" | 1958-04 | erschlossen |
| Vertrag für die Spielzeit 1958 | 1958 | erschlossen |
| Foto ohne Angaben, geschätzt 1950er | circa:1955 | erschlossen |
| Dokument komplett undatiert | leer | unbekannt |

## Ansetzungsformen

Personen werden als Nachname, Vorname angesetzt (`Malaniuk, Ira`), Adelstitel und Zusätze nachgestellt (`Karajan, Herbert von`). Bei Künstlernamen gegenüber bürgerlichen Namen wird der Name verwendet, unter dem die Person im Dokumentkontext auftritt, bei Unsicherheit der bekanntere als Ansetzungsform mit Vermerk der Varianten im Anmerkungsfeld. Die Reconciliation gegen Wikidata verknüpft die Namensvarianten später.

| Richtig | Falsch |
|---|---|
| Malaniuk, Ira | Ira Malaniuk |
| Wagner, Wieland | Wieland Wagner |
| Knappertsbusch, Hans | H. Knappertsbusch |

Orte tragen den gebräuchlichen historischen Namen aus der Quelle, also den zur Zeit des Dokuments üblichen (`Lemberg`, nicht `Lwiw`). Die Wikidata-Reconciliation liefert die Verknüpfung zum heutigen Namen.

| In der Quelle | Erfassen als | Wikidata liefert |
|---|---|---|
| Lemberg | Lemberg | Q36036 (Lwiw) |
| Pressburg | Pressburg | Q1780 (Bratislava) |

| Richtig | Falsch |
|---|---|
| München | Monaco di Baviera |
| Wien | Vienna |
| Zürich | Zurich |

Straßennamen werden nur dann eingetragen, wenn es sich um Aufenthaltsorte oder Adressen von Ira Malaniuk handelt, und gehören zur zweiten Schicht. Ort und Adresse werden mit Komma und Leerzeichen getrennt, der Wortbestandteil Straße wird einheitlich mit Doppel-s geschrieben. Wurde der genaue Ort nicht der Quelle entnommen, sondern interpretiert oder ergänzt, wird das in der Spalte für bei der Erfassung Hinzugefügtes vermerkt.

Institutionen tragen ihre offizielle Bezeichnung ohne Rechtsform, bei historischen Institutionen den zeitgenössischen Namen.

| Richtig | Falsch |
|---|---|
| Bayerische Staatsoper | Bayerische Staatsoper GmbH |
| Österreichisches Kulturinstitut London | Österr. Kulturinst. London |
| Münchner Merkur | „Münchner Merkur" |

Werke werden mit ihrem Titel aus der Quelle erfasst, der Komponist wandert in das Anmerkungsfeld. Liegt ein Titel in mehreren Sprachen vor (etwa Orpheus und Eurydike), wird zunächst die Form aus der Quelle übernommen und später vereinheitlicht. Lieder ohne eindeutigen Titel tragen den Textanfang oder die gebräuchliche Bezeichnung. Gibt das Objekt über eine Spalte keinen Aufschluss, wird eine begründete Vermutung mit dem Zusatz von Signatur und Folio im Anmerkungsfeld festgehalten.

## Titelbildung

Der Titel ist eine Beschreibung des Objekts, kein Zitat aus der Quelle, und wird auf Deutsch gebildet. Die Konvention richtet sich nach dem Dokumenttyp.

| Dokumenttyp | Titelmuster | Beispiel |
|---|---|---|
| Vertrag | Gastvertrag [Institution], [Anlass oder Zeitraum] | Gastvertrag Bayerische Staatsoper München, Münchner Sommerfestspiele 1958 |
| Korrespondenz | Brief [Absender] an [Empfänger], [Institution wenn relevant] | Brief Ira Malaniuk an Hugo Zelzer, Österreichisches Kulturinstitut London |
| Presse | Kritik „[Überschrift]", [Publikation] | Kritik „Wieland Wagner inszeniert Glucks Orpheus", Münchner Merkur |
| Fotografie | [Beschreibung], [Anlass oder Rolle wenn erkennbar] | Bühnenszene Orpheus, Bayerische Staatsoper 1953 |
| Programm | Programmzettel [Werk oder Veranstaltung], [Ort], [Datum] | Programmzettel Die Meistersinger von Nürnberg, München, 1958-08-17 |
| Identitätsdokument | [Dokumenttyp] Ira Malaniuk, [Ausstellungsjahr wenn bekannt] | Reisepass Ira Malaniuk, 1948 |

## Verknüpfungen erfassen

Pro Verknüpfung wird eine Zeile in der Verknüpfungstabelle angelegt, mehrere Personen kommen nicht in eine Zeile. Eine Brief-Verknüpfung mit zwei Beteiligten ergibt also zwei Zeilen, eine je Person mit ihrer Rolle.

Das Feld `typ` wird immer zuerst gewählt, es bestimmt, welche Rollen verfügbar sind. Rollennamen werden kleingeschrieben erfasst, Geschlechtssuffixe wie `:in` werden bei der Verarbeitung vereinheitlicht.

| typ | mögliche Rollen |
|---|---|
| person | verfasser, adressat, erwähnt, vertragspartner, unterzeichner, abgebildet, interpret |
| ort | entstehungsort, zielort, erwähnt, auffuehrungsort, wohnort, vertragsort, lehrtätigkeit, absendeort, abreiseort, empfangsort |
| institution | vertragspartner, arbeitgeber, veranstalter, vermittler, adressat, erwähnt |
| ereignis | rahmenveranstaltung, premiere, auftritt, probe, implizit |
| werk | interpret, gastspiel, aufführung |
| ort, datum | gastspiel, probe, generalprobe |
| einnahmen, währung | abendgage, provision, gesamtvergütung, reisekosten, rundfunkhonorar, dépôt, transfer (vollständiger detailRole-Katalog in [data.md](data.md) § 11) |
| ausgaben, währung | abendgage, provision, gesamtvergütung, reisekosten, rundfunkhonorar, dépôt, transfer (vollständiger detailRole-Katalog in [data.md](data.md) § 11) |
| summe, währung | abendgage, provision, gesamtvergütung, reisekosten, rundfunkhonorar, dépôt, transfer (vollständiger detailRole-Katalog in [data.md](data.md) § 11) |
| detail | Feldname frei wählbar (Schicht 3) |

Beim Werk steht `aufführung` für die eigenständige Aufführung eines Werkes und `gastspiel` für die in der Quelle ausdrücklich als Gastspiel bezeichnete Aufführung mit festem Ensemble. Eine Gruppe von mehr als zwei musizierenden Personen wird über den Typ `ensemble` erfasst. Eine Bühnenrolle wird zusammen mit ihrer interpretierenden Person geführt.

Das vollständige, im Modell ausdifferenzierte Rollenvokabular mit seinem Belegstand steht in [data.md](data.md).

### Auftritte bündeln (`datenpunkt_id`)

Beschreibt ein Dokument mehrere Auftritte, gehören seine Zeilen nicht alle gleichberechtigt zum Dokument, sondern je zu einem Auftritt. Die Spalte `datenpunkt_id` hält diese Zugehörigkeit fest, damit rekonstruierbar bleibt, wer was in welchem Auftritt getan hat, und nicht nur, dass etwas im Dokument vorkommt. Das Modell bildet jede so gebündelte Gruppe als ein Vorkommnis ab (`m3gim:Occurrence`, [data.md](data.md) § 4 und 7).

Die Konvention kennt die folgenden Werte.

- **Leer** ist der Default und meint die Dokument-Ebene. Hierher gehören die Angaben über das Dokument selbst, also Verfasser, Adressat, Absendeort und Erstelldatum, und ebenso jede Angabe, deren Auftritts-Zuordnung die Quelle nicht hergibt. Ein nicht eindeutig zuordenbarer Dirigent bleibt leer, statt geraten zu werden.
- Eine **fortlaufende Nummer** ab `1` bündelt alle Zeilen eines Auftritts. Zwei Auftritte in einem Folio tragen `1` und `2`. Geteilte Angaben werden je Auftritt wiederholt, damit jeder Auftritt vollständig beschrieben ist.

Gastspiel und Tournee sind ein **Modus** des Auftritts, keine Rolle. Statt `gastspiel` an Ort, Werk und Institution zugleich zu hängen, wird der Ort als `auffuehrungsort`, das Werk als `aufführung` und die Institution als `veranstalter` geführt, und der Modus einmal pro Auftritt an der `aufführung`-Zeile in der Spalte `modus` notiert. Ob ein Auftritt auswärts oder am eigenen Haus stattfand, leitet die Pipeline aus dem Auftrittsort und dem Institutionssitz ab und muss nicht erfasst werden.

Beispiel `UAKUG/NIM_011` Folio 5, ein Brief, der ein Tristan-Gastspiel der Bayreuther in Brüssel und Barcelona beschreibt, also zwei Auftritte.

| datenpunkt_id | typ | name | rolle | modus | anmerkung |
|---|---|---|---|---|---|
| (leer) | person | Wagner, Wieland | verfasser | | |
| (leer) | person | Malaniuk, Ira | adressat | | |
| (leer) | datum | 1954-05-03 | erstelldatum | | |
| (leer) | ort | Bayreuth | absendeort | | |
| (leer) | person | Keilberth, Joseph | dirigent | | Stadt nicht auflösbar |
| (leer) | person | Jochum, Eugen | dirigent | | Stadt nicht auflösbar |
| 1 | ort | Brüssel | auffuehrungsort | | |
| 1 | werk | Tristan und Isolde | aufführung | gastspiel | |
| 1 | rolle | Brangäne | interpret | | Interpret Malaniuk |
| 1 | institution | Bayreuther Festspiele | veranstalter | | |
| 1 | summe, währung | 1200 | abendgage | | freie Bahnfahrt 2. Kl. Brüssel |
| 2 | ort | Barcelona | auffuehrungsort | | |
| 2 | werk | Tristan und Isolde | aufführung | gastspiel | |
| 2 | rolle | Brangäne | interpret | | Interpret Malaniuk |
| 2 | institution | Bayreuther Festspiele | veranstalter | | |
| 2 | summe, währung | 1200 | abendgage | | freie Flugreise München-Barcelona-München |

Wo eine Auswahlliste für eine Spalte gepflegt wird, gilt sie für die ganze Spalte, nicht nur für den Bereich, in dem sie angelegt wurde. Eine Validierung wird daher auf die ganze Spalte gelegt oder aus einem Bereich gespeist, damit ein neuer Listeneintrag auch in schon befüllten Zeilen greift. Bestehende Werte werden dabei markiert, nie überschrieben.

### Ereignisse

Ereignisse werden direkt in der Verknüpfungstabelle erfasst, nicht in einem eigenen Index. Als Ereignis gelten die Festspiele und vergleichbare Rahmenveranstaltungen.

| archivsignatur | typ | name | rolle | datum |
|---|---|---|---|---|
| UAKUG/NIM_028 | ereignis | Münchner Sommerfestspiele 1958 | rahmenveranstaltung | 1958-08-10/1958-09-09 |

### Details der dritten Schicht

Bei vertiefter Erschließung trägt der Typ `detail` die Feinangaben. Der Feldname steht in der Spalte `name`, der Wert in der Spalte `rolle`. Einnahmen und Ausgaben werden aus der Perspektive von Ira Malaniuk gelesen, sie nimmt also ein oder gibt aus. Währungen werden mit ihrem Code erfasst, etwa S für Schilling oder Esc für den portugiesischen Escudo. Die vollständige Auflösung der Währungscodes steht in [data.md](data.md).

| archivsignatur | typ | name | rolle | anmerkung |
|---|---|---|---|---|
| UAKUG/NIM_028 | detail | honorar | 1.000 DM | Julius Cäsar |
| UAKUG/NIM_028 | detail | nebenleistungen | Flugkosten Zürich-München | |

## Indizes pflegen

Ein neuer Indexeintrag wird angelegt, sobald eine Person, Organisation, ein Ort oder ein Werk zum ersten Mal in der Verknüpfungstabelle auftaucht. Die Ansetzungsform folgt der Hauptansetzung der Gemeinsamen Normdatei (GND).

Die ID wird fortlaufend vergeben, das Präfix richtet sich nach dem Typ. Verwendet wird die nächste freie Nummer. Wird ein Eintrag gelöscht, entsteht eine Lücke, es wird nicht umnummeriert.

| Typ | Präfix | Beispiel |
|---|---|---|
| Personen | P | P1, P2, P3 |
| Organisationen | O | O1, O2, O3 |
| Orte | L | L1, L2, L3 |
| Werke | W | W1, W2, W3 |

Das Feld `wikidata_id` bleibt zunächst leer, Recherche und Reconciliation folgen in einem späteren Arbeitsschritt. Ist die ID bei prominenten Entitäten bereits bekannt, kann sie direkt eingetragen werden, im Format `Q94208` ohne URL.

Gleichnamige Entitäten werden über die Zusatzfelder unterschieden, also Lebensdaten, Ort, Land oder Komponist.

| m3gim_id | name | lebensdaten | anmerkung |
|---|---|---|---|
| P15 | Müller, Hans | 1920–1985 | Dirigent, Wien |
| P16 | Müller, Hans | 1898–1964 | Bühnenbildner, München |

## Umgang mit Unsicherheit

Ein leeres Feld bedeutet, dass die Angabe in dieser Quelle nicht ermittelbar ist, nicht dass sie vergessen wurde.

Der Bearbeitungsfortschritt wird im Feld `erfassungsstatus` der Objekttabelle festgehalten.

| Status | Bedeutung |
|---|---|
| in_bearbeitung | Datensatz angelegt, noch nicht vollständig |
| schicht1_fertig | alle Kernmetadaten erfasst |
| schicht2_fertig | Verknüpfungen erfasst |
| abgeschlossen | Qualitätsprüfung erfolgt |

Ein unsicheres Datum wird über die Qualifier `circa:`, `vor:` und `nach:` markiert. Eine unsichere Personenidentifikation wird mit dem ermittelten Namen erfasst, die Unsicherheit kommt in das Anmerkungsfeld.

| name | anmerkung |
|---|---|
| Müller, Hans | Identifikation unsicher, evtl. Hans Müller (Dirigent Wien) |

Unleserliche Passagen werden im Anmerkungsfeld vermerkt, etwa mit dem Hinweis, dass ein Name teilweise unleserlich und die Lesung unsicher ist. Bei widersprüchlichen Angaben werden beide Varianten dokumentiert und der Widerspruch im Anmerkungsfeld erläutert.

Nicht erfasst werden Informationen ohne Bezug zu den Forschungsfragen, nur beiläufig erwähnte Personen sowie Werke ohne Auftrittsbezug zu Malaniuk. Im Zweifel wird eher erfasst und die Unsicherheit im Anmerkungsfeld dokumentiert.

## Fremdsprachige Dokumente

Der Titel wird auch bei fremdsprachigen Dokumenten auf Deutsch gebildet, weil er eine Beschreibung und kein Zitat ist. Das Sprache-Feld trägt die Originalsprache des Dokuments (de, uk, en, fr, it), bei mehrsprachigen Dokumenten werden die Sprachen als Sprache1, Sprache2 angegeben. Forschungsrelevante Inhalte werden im Anmerkungsfeld auf Deutsch zusammengefasst.

Bei ukrainischen Dokumenten werden Namen so erfasst, wie sie im deutschsprachigen Kontext gebräuchlich sind, die Originalschreibweise wird im Anmerkungsfeld ergänzt.

## Häufige Fehler

| Fehler | Richtig |
|---|---|
| Datum als „18.4.1958" | 1958-04-18 |
| Name als „Ira Malaniuk" | Malaniuk, Ira |
| Mehrere Personen in einer Zeile | pro Person eine Zeile |
| Wikidata-URL statt ID | Q94208, nicht die vollständige URL |
| Rolle ohne typ | typ immer zuerst wählen, dann rolle |
| Führende oder nachgestellte Leerzeichen | keine Leerzeichen vor oder nach dem Eintrag |

## Qualitäts-Checkliste

Vor dem Setzen des Status `abgeschlossen` werden Objekt, Verknüpfungen und Indizes gegengeprüft. Dabei wird auch geprüft, ob Signatur, Objekt und Datum zueinander passen.

In der Objekttabelle:

- Archivsignatur korrekt (`UAKUG/NIM_XXX`)
- Titel aussagekräftig und nach Konvention gebildet
- Datum im richtigen Format
- alle Dropdown-Felder ausgefüllt
- Sprache korrekt

In der Verknüpfungstabelle:

- alle relevanten Personen erfasst
- alle relevanten Orte erfasst
- alle relevanten Institutionen erfasst
- Ereignisse mit Datum, sofern bekannt
- Werke mit Komponist im Anmerkungsfeld

In den Indextabellen:

- neue Entitäten angelegt
- Ansetzungsform einheitlich als Nachname, Vorname
- Disambiguierung bei Gleichnamigen vorgenommen
