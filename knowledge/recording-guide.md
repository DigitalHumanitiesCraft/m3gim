---
title: "Erfassungsrichtlinie"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.3
created: 2026-09-05
updated: 2026-09-08
authors: [Christopher Pollin]
generated-with: Codex
related: [data.md, data-model.md]
---

# Erfassungsrichtlinie

## Erfassung

Diese Richtlinie beschreibt die Konventionen des Erschließungsteams für Tabellenfelder, Namen, Unsicherheit und Quellenbezug. [data.md](data.md) dokumentiert das tatsächlich eingelesene Material und seine Abweichungen; [data-model.md](data-model.md) beschreibt die formale Abbildung.

Maßgeblich sind die Rollenwerte und Datumsformen in [data.md](data.md), einschließlich der Werte für `datierungsevidenz`. Offene Änderungen an Erfassung und Modell stehen in [specification.md](specification.md) § Open decisions.

Der aktive Import liest die bestehende Verknüpfungstabelle mit `typ`, `name`, `rolle`, `anmerkung` und der optionalen Spalte `datenpunkt_id` beziehungsweise `data_id`. Das Long-Format mit zweistufiger `aktivitaet_id` ist als Migration vorbereitet (E-125, E-127, E-128), wird jedoch noch nicht von der Pipeline verarbeitet. Der Stand in `data/migration/M3GIM-Verknuepfungen-v2.xlsx` enthält ein Vokabular-Glossar und das kuratierte Beispiel 7_29; die übrige Aktivitätszuordnung erfordert Quellenprüfung. Die formale Zielbeschreibung steht in [data-model.md](data-model.md) § Target model v2. Eine Umstellung der laufenden Erfassung ist damit noch nicht belegt.

### Schichtenmodell der Erfassung

Die Erschließung umfasst Kernmetadaten, inhaltliche Verknüpfungen und vertiefte Interpretation.

**Schicht 1, Daten erfassen.** Kernmetadaten werden in der Objekttabelle eingetragen. Neue Personen, Organisationen, Orte und Werke erhalten Einträge in den jeweiligen Indizes.

**Schicht 2, die Quellen sprechen lassen.** Die Verknüpfungstabelle hält Bezüge zu Personen, Orten, Institutionen, Ereignissen und Werken fest. Auch der Empfangsort einer Korrespondenz gehört hierher.

**Schicht 3, Interpretation.** Honorare, Nebenleistungen und vertragliche Konditionen werden mit ihrem Quellenbezug ergänzt. Die aktuell genutzten Finanztypen und die offene Alt-Konvention `detail` sind unten unterschieden.

Copy-Paste aus der Quelle oder aus bestehenden Einträgen reduziert Übertragungsfehler. In jeder Zeile wird das Erfassungsdatum mitgeführt.

### Erfassungs-Workflow

1. **Objekt anlegen.** Archivsignatur und Kernmetadaten eintragen; vorhandene Auswahllisten verwenden.
2. **Verknüpfungen erfassen.** Für jede relevante Entität und ihre Rolle eine eigene Zeile anlegen. Verschiedene Aussagen oder Auftritte dürfen beim Zusammenfassen wiederholter Namen nicht verloren gehen.
3. **Indizes pflegen.** Neue Entitäten mit einer freien ID anlegen und vorab auf vorhandene Einträge prüfen.
4. **Status setzen.** Den erreichten Erschließungsstand dokumentieren. Das Verhältnis der Schichtwerte zum verwendeten Bearbeitungsstatus bleibt klärungsbedürftig, siehe [data.md](data.md) § Processing status.

### Konvolut, Folio und Umfang

Die Objektidentität entsteht aus Archivsignatur und Folioangabe. Folios werden innerhalb eines Konvoluts fortlaufend nummeriert, in der Vorlage mit Bleistift oben rechts. Der aktuelle Export führt getrennt erfasste Seiten mit Suffixen wie `5_1` und `5_2` auch in der Folio-Spalte. Die Pipeline ordnet sie dem übergeordneten Folio `5` zu (E-269). Objekt- und Verknüpfungstabelle müssen dieselbe Bezugsebene verwenden.

Die Umfangsangabe nennt die Anzahl der Blätter. Bedruckte Vorder- und Rückseiten zählen jeweils als Seiten.

### Datumsangaben erfassen

Datumsangaben folgen ISO 8601 in den in [data.md](data.md) § Date notation of the source festgelegten Granularitäten und Qualifiern. Ein undatiertes Objekt lässt das Datumsfeld leer. Ergänzend hält das Feld `datierungsevidenz` fest, woher die Datierung stammt, mit den Werten aus [data.md](data.md) § Date notation of the source.

Die Zusammenführung von Datum und Evidenz zeigt sich an typischen Fällen.

| Quelle | entstehungsdatum | datierungsevidenz |
|---|---|---|
| Brief datiert „18. April 1958" | 1958-04-18 | aus_dokument |
| Brief ohne Datum, Poststempel „April 58" | 1958-04 | erschlossen |
| Vertrag für die Spielzeit 1958 | 1958 | erschlossen |
| Foto ohne Angaben, geschätzt 1950er | circa:1955 | erschlossen |
| Dokument komplett undatiert | leer | unbekannt |

### Ansetzung von Namen und Titeln

Die Ansetzungsformen für Personen, Orte, Institutionen und Werke folgen den Namenskonventionen in [data.md](data.md) § Naming conventions and place duplicates. Ergänzend gilt für die Erfassung Folgendes.

Bei Künstlernamen gegenüber bürgerlichen Namen wird der Name verwendet, unter dem die Person im Dokumentkontext auftritt, bei Unsicherheit der bekanntere als Ansetzungsform mit Vermerk der Varianten im Anmerkungsfeld. Der spätere Wikidata-Abgleich kann Namensvarianten zuordnen; mehrdeutige Identitäten benötigen redaktionelle Prüfung. Orte tragen den gebräuchlichen historischen Namen aus der Quelle, ein belegter Wikidata-Abgleich ergänzt die Identität, soweit eine passende Entität vorhanden ist.

Straßennamen werden nur dann eingetragen, wenn es sich um Aufenthaltsorte oder Adressen von Ira Malaniuk handelt, und gehören zur zweiten Schicht. Ort und Adresse werden mit Komma und Leerzeichen getrennt, der Wortbestandteil Straße wird einheitlich mit Doppel-s geschrieben. Wurde der genaue Ort nicht der Quelle entnommen, sondern interpretiert oder ergänzt, wird das in der Spalte für bei der Erfassung Hinzugefügtes vermerkt.

Werke werden mit ihrem Titel aus der Quelle erfasst. In einer Verknüpfungszeile kann das Anmerkungsfeld den Komponisten erläutern. Der Werkindex führt dafür ein eigenes strukturiertes Feld, das der Normdatenabgleich verwendet. Liegt ein Titel in mehreren Sprachen vor (etwa Orpheus und Eurydike), wird zunächst die Form aus der Quelle übernommen und später vereinheitlicht. Lieder ohne eindeutigen Titel tragen den Textanfang oder die gebräuchliche Bezeichnung. Gibt das Objekt über eine Spalte keinen Aufschluss, wird eine begründete Vermutung mit dem Zusatz von Signatur und Folio im Anmerkungsfeld festgehalten.

### Titelbildung

Der Titel ist eine Beschreibung des Objekts, kein Zitat aus der Quelle, und wird auf Deutsch gebildet. Die Konvention richtet sich nach dem Dokumenttyp.

| Dokumenttyp | Titelmuster | Beispiel |
|---|---|---|
| Vertrag | Gastvertrag [Institution], [Anlass oder Zeitraum] | Gastvertrag Bayerische Staatsoper München, Münchner Sommerfestspiele 1958 |
| Korrespondenz | Brief [Absender] an [Empfänger], [Institution wenn relevant] | Brief Ira Malaniuk an Hugo Zelzer, Österreichisches Kulturinstitut London |
| Presse | Kritik „[Überschrift]", [Publikation] | Kritik „Wieland Wagner inszeniert Glucks Orpheus", Münchner Merkur |
| Fotografie | [Beschreibung], [Anlass oder Rolle wenn erkennbar] | Bühnenszene Orpheus, Bayerische Staatsoper 1953 |
| Programm | Programmzettel [Werk oder Veranstaltung], [Ort], [Datum] | Programmzettel Die Meistersinger von Nürnberg, München, 1958-08-17 |
| Identitätsdokument | [Dokumenttyp] Ira Malaniuk, [Ausstellungsjahr wenn bekannt] | Reisepass Ira Malaniuk, 1948 |

### Verknüpfungen erfassen

Pro Verknüpfung wird eine Zeile in der Verknüpfungstabelle angelegt, mehrere Personen kommen nicht in eine Zeile. Eine Brief-Verknüpfung mit zwei Beteiligten ergibt also zwei Zeilen, eine je Person mit ihrer Rolle.

Das Feld `typ` wird immer zuerst gewählt, es bestimmt, welche Rollen verfügbar sind. Rollennamen werden kleingeschrieben erfasst, Geschlechtssuffixe wie `:in` werden bei der Verarbeitung vereinheitlicht. Welche Rolle zu welchem Verknüpfungstyp gehört, führt das Rollenvokabular in [data.md](data.md) § Role values nach Zieltyp gegliedert.

Beim Werk steht `aufführung` für die eigenständige Aufführung eines Werkes und `gastspiel` für die in der Quelle ausdrücklich als Gastspiel bezeichnete Aufführung mit festem Ensemble. Eine Gruppe von mehr als zwei musizierenden Personen wird über den Typ `ensemble` erfasst. Eine Bühnenrolle wird zusammen mit ihrer interpretierenden Person geführt.

#### Auftritte bündeln (`datenpunkt_id`)

Die optionale Spalte hält eine erfasste Gruppierungsabsicht fest. Ein leerer Wert lässt die Aussage auf Dokumentebene oder ihre Zuordnung offen; eine fortlaufende Nummer bezeichnet nach der bisherigen Konvention die Zeilen eines Auftritts. Die Pipeline bewahrt den Wert in den Quellenmetadaten. Sie baut daraus gegenwärtig keine gemeinsame Aufführung.

Bei mehreren Auftritten in einem Dokument darf eine unklare Person-, Orts- oder Honorarzuordnung nicht geraten werden. Ein nicht zuordenbarer Dirigent bleibt auf Dokumentebene und erhält eine Erläuterung im Anmerkungsfeld. Die zweistufige Aktivitäts- und Beteiligungszuordnung des Zielmodells erfordert einen eigenen menschlichen Durchgang.

Die frühere Anleitung zu einer Spalte `modus` und zur automatischen Ableitung von Auswärtsauftritten beschreibt keine aktive Pipeline-Funktion. Auftrittsmodi gehören zum noch umzusetzenden Zielmodell. Die vorhandenen Rollenwerte werden durch diese Dokumentationskorrektur nicht geändert.

Auswahllisten gelten für die gesamte betreffende Spalte. Neue Werte müssen auch für bereits befüllte Zeilen verfügbar sein; ungültige Altwerte werden zur Prüfung markiert und bleiben erhalten.

#### Ereignisse

Ereignisse werden direkt in der Verknüpfungstabelle erfasst, nicht in einem eigenen Index. Als Ereignis gelten die Festspiele und vergleichbare Rahmenveranstaltungen.

| archivsignatur | typ | name | rolle | datum |
|---|---|---|---|---|
| UAKUG/NIM_028 | ereignis | Münchner Sommerfestspiele 1958 | rahmenveranstaltung | 1958-08-10/1958-09-09 |

#### Details der dritten Schicht

Der aktuelle Export führt Finanzangaben über `einnahmen, währung`, `ausgaben, währung` und `summe, währung` sowie ihre akzeptierten Unterstrichvarianten. Der Betrag und seine ursprüngliche Schreibweise bleiben nachvollziehbar. Einnahmen und Ausgaben beziehen sich auf Ira Malaniuk. Historische Währungsangaben werden quellentreu geführt; Parsing und bestehende Defaults beschreibt [data-model.md](data-model.md) § Financial layer.

Der früher vorgeschlagene Typ `detail` wird im aktuellen Export nicht verwendet. Sein verbliebener Pipeline-Zweig interpretiert Felder anders als die Finanz-Komposita. Diese Konvention muss vor einer Verwendung mit dem Erschließungsteam geklärt werden. Vertragsbemerkungen wie `Vertrag nicht eingehalten` bleiben im Anmerkungsfeld; strukturierter Vertragsstatus und Realisierung sind offene Modellfragen.

### Indizes pflegen

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

### Umgang mit Unsicherheit

Ein leeres Feld bedeutet, dass die Angabe in dieser Quelle nicht ermittelbar ist, nicht dass sie vergessen wurde.

Der Bearbeitungsfortschritt wird im Feld `erfassungsstatus` der Objekttabelle festgehalten. Die Werte dieser Erfassungsrichtlinie und ihr Verhältnis zum Pipeline-System stehen in [data.md](data.md) § Processing status.

Ein unsicheres Datum wird über die Qualifier `circa:`, `vor:` und `nach:` markiert. Eine unsichere Personenidentifikation wird mit dem ermittelten Namen erfasst, die Unsicherheit kommt in das Anmerkungsfeld.

| name | anmerkung |
|---|---|
| Müller, Hans | Identifikation unsicher, evtl. Hans Müller (Dirigent Wien) |

Unleserliche Passagen werden im Anmerkungsfeld vermerkt, etwa mit dem Hinweis, dass ein Name teilweise unleserlich und die Lesung unsicher ist. Bei widersprüchlichen Angaben werden beide Varianten dokumentiert und der Widerspruch im Anmerkungsfeld erläutert.

Nicht erfasst werden Informationen ohne Bezug zu den Forschungsfragen, nur beiläufig erwähnte Personen sowie Werke ohne Auftrittsbezug zu Malaniuk. Im Zweifel wird eher erfasst und die Unsicherheit im Anmerkungsfeld dokumentiert.

### Fremdsprachige Dokumente

Der Titel wird auch bei fremdsprachigen Dokumenten auf Deutsch gebildet, weil er eine Beschreibung und kein Zitat ist. Das Sprache-Feld trägt die Originalsprache des Dokuments (de, uk, en, fr, it), bei mehrsprachigen Dokumenten werden die Sprachen als Sprache1, Sprache2 angegeben. Forschungsrelevante Inhalte werden im Anmerkungsfeld auf Deutsch zusammengefasst.

Bei ukrainischen Dokumenten werden Namen so erfasst, wie sie im deutschsprachigen Kontext gebräuchlich sind, die Originalschreibweise wird im Anmerkungsfeld ergänzt.

### Häufige Fehler

| Fehler | Richtig |
|---|---|
| Datum als „18.4.1958" | 1958-04-18 |
| Name als „Ira Malaniuk" | Malaniuk, Ira |
| Mehrere Personen in einer Zeile | pro Person eine Zeile |
| Wikidata-URL statt ID | Q94208, nicht die vollständige URL |
| Rolle ohne typ | typ immer zuerst wählen, dann rolle |
| Führende oder nachgestellte Leerzeichen | keine Leerzeichen vor oder nach dem Eintrag |

### Qualitäts-Checkliste

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
- Werkbezug und gegebenenfalls Komponistenangabe nachvollziehbar; strukturiertes Komponistenfeld im Werkindex geprüft

In den Indextabellen:

- neue Entitäten angelegt
- Ansetzungsform einheitlich als Nachname, Vorname
- Disambiguierung bei Gleichnamigen vorgenommen
