---
title: "Datums- und Rollenmodell: Befund am Datensatz und Entwurfsvorlage"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: snapshot
created: 2026-08-22
updated: 2026-08-22
language: de
version: 0.1
authors: [Christopher Pollin]
generated-with: Claude Code
related: [data, data-model, architecture-decisions, frontend-architecture, testing]
---

# Datums- und Rollenmodell

Die Projektleitung hat gefragt, ob sich die Rolle einer Angabe nicht weitgehend aus ihrer Stellung im Graphen erschließen ließe, sodass die eigene Rollenbeschriftung entfallen könnte. Dieses Dokument prüft die Frage am erzeugten Datensatz `data/output/m3gim.jsonld` und legt einen Entwurf vor. Es ist Befund und Entscheidungsvorlage und führt keine Änderung aus.

Alle Zahlen sind programmatisch über den vollständigen Graphen ermittelt und gelten für den Repository-Stand vom 2026-08-22. Stichproben sind an keiner Stelle die Grundlage einer Aussage. Wo eine Aussage über die Datenlage hinausgeht, ist sie als Schätzung oder als offene Frage gekennzeichnet.

Der Graph führt 913 Dokumentknoten (895 `rico:Record`, 18 `rico:RecordSet`), 724 `m3gim:Performance`, 125 `m3gim:SpatiotemporalEvent` und 190 `m3gim:StageRole` auf oberster Ebene sowie 101 `m3gim:DatedEvent` und 57 `m3gim:DetailAnnotation` als eingebettete Knoten.

## 1. Bestandsaufnahme aller Datierungen und Rollenangaben

### 1.1 Vorgehen

Der Graph wurde vollständig traversiert. Je Vorkommen sind Subjektknoten, Knotentyp, Zugriffsproperty, Rollenwert und Herkunft der Rolle festgehalten. Als Datierung zählt jeder Wert, der ein Datum oder einen Zeitraum trägt, gleich über welche Property er erreicht wird. Als Rollenangabe zählt jeder Wert der vier Properties `m3gim:role`, `m3gim:eventRole`, `m3gim:dateRole` und `m3gim:detailRole` sowie jede Rolle, die im Namen einer Datumsproperty steckt.

### 1.2 Wo die Datierungen hängen

Der Datensatz führt 969 Datierungen. Sie verteilen sich auf fünf Bauformen.

| Bauform | Subjektknoten | Wertproperty | Rollenquelle | Werte |
|---|---|---|---|---|
| Archivische Datierung | `rico:Record`, `rico:RecordSet` | `rico:date` | keine | 547 |
| Flache Datumsfamilie am Dokument | `rico:Record`, `rico:RecordSet` | 15 typisierte `m3gim:*datum`-Properties | Property-Name | 168 |
| Flache Datumsfamilie an der Aufführung | `m3gim:Performance` | `m3gim:auffuehrungsdatum` | Property-Name | 71 |
| Auffangklasse | `m3gim:DatedEvent` | `m3gim:dateValue` | `m3gim:dateRole` | 101 |
| Raumzeitliches Ereignis | `m3gim:SpatiotemporalEvent` | `m3gim:atDate` | `m3gim:eventRole` | 82 |

Hinzu kommen 43 `SpatiotemporalEvent` ohne Datum, die eine Verortung ohne Zeitangabe tragen, sowie die aus Wikidata angereicherten Zeitwerte `schema:birthDate`, `schema:deathDate`, `m3gim:wdPremiereDate` und `m3gim:inception` an Personen-, Werk- und Institutionsknoten.

Die flache Familie im Detail, gezählt auf Knotenebene und auf Wertebene, weil mehrere Properties Mehrfachwerte tragen.

| Property | Knoten am Dokument | Werte am Dokument | Werte an der Performance |
|---|---|---|---|
| `m3gim:auffuehrungsdatum` | 21 | 67 | 71 |
| `m3gim:erscheinungsdatum` | 28 | 28 | 0 |
| `m3gim:auftrittsdatum` | 7 | 25 | 0 |
| `m3gim:probendatum` | 4 | 14 | 0 |
| `m3gim:erstelldatum` | 10 | 10 | 0 |
| `m3gim:ausstellungsdatum` | 7 | 7 | 0 |
| `m3gim:absendedatum` | 4 | 4 | 0 |
| `m3gim:premieredatum` | 3 | 3 | 0 |
| `m3gim:probenbeginn` | 3 | 3 | 0 |
| `m3gim:spielzeitVon` | 2 | 2 | 0 |
| `m3gim:abreisedatum` | 1 | 1 | 0 |
| `m3gim:empfangsdatum` | 1 | 1 | 0 |
| `m3gim:ausstrahlungsdatum` | 1 | 1 | 0 |
| `m3gim:ueberweisungsdatum` | 1 | 1 | 0 |
| `m3gim:gespraechsdatum` | 1 | 1 | 0 |
| `m3gim:spielzeitBis` | 0 | 0 | 0 |

`m3gim:spielzeitBis` ist deklariert und unbefüllt. Die Knoten-gegen-Werte-Spalten zeigen, dass die Zählung des Auswirkungsinventars in [rename-map-paket-2.md](rename-map-paket-2.md) § 6.3 Knoten zählt; auf Wertebene liegen die Zahlen für `auffuehrungsdatum`, `auftrittsdatum` und `probendatum` deutlich höher.

### 1.3 Wo die Rollen hängen

Der Datensatz führt 74 verschiedene Rollenwerte, verteilt auf vier Properties.

| Property | Subjektknoten | verschiedene Werte |
|---|---|---|
| `m3gim:role` | Referenzknoten unter `hasAssociatedAgent`, `hasOrHadSubject`, `hasOrHadLocation` | 63 |
| `m3gim:eventRole` | `m3gim:SpatiotemporalEvent` | 20 |
| `m3gim:dateRole` | `m3gim:DatedEvent` | 11 |
| `m3gim:detailRole` | `m3gim:DetailAnnotation` | 8 |

Die vier Properties ziehen aus einem einzigen Vokabular. Das formale Vokabular sagt das selbst; der Kommentar an `m3gim-role:scheme` in [`vocab/m3gim.ttl`](../../vocab/m3gim.ttl) hält fest, dass eine einzige Spalte der Erfassungstabelle diese Werte trägt und die Pipeline sie je nach Verknüpfungstyp auf vier Properties verteilt. Der Datensatz bestätigt es. 14 Rollenwerte kommen sowohl in der Datums- als auch in der Ortsschicht vor, darunter `aufführung`, `auftritt`, `probe`, `spielzeit`, `entstehung`, `aufnahme`, `generalprobe`, `rahmenveranstaltung` und `erwähnt`. Der Wert `erwähnt` steht in allen vier Properties.

Auffällig sind fünf Vorkommen, in denen eine Datumsrolle als `eventRole` an einem raumzeitlichen Ereignis steht (`erscheinungsdatum` fünfmal, `absendedatum` und `ausstellungsdatum` je zweimal). Das ist die in der `skos:editorialNote` an `m3gim:eventRole` beschriebene Rollenvererbung aus dem Komposit `ort, datum`, die am reinen Ortsknoten zurückgenommen wird und am Ereignisknoten stehen bleibt. Eine Rolle mit `-datum`-Endung an einem Knoten, dessen tragende Angabe ein Ort ist, belegt für sich schon, dass Knotentyp und Rollenwert im heutigen Bestand nicht aneinander gebunden sind.

Ohne Rollenangabe bleiben 38 Ortsreferenzen unter `rico:hasOrHadLocation`, zwei `SpatiotemporalEvent`, zwei Werkreferenzen und eine Personenreferenz. Diese Fälle sind für den Entwurf wichtig, weil eine fehlende Rolle im Zielmodell fehlend bleiben muss.

### 1.4 Das Aufteilungskriterium zwischen flacher Familie und Auffangklasse

`scripts/transform.py` entscheidet je Verknüpfungszeile vom Typ `datum` nach zwei Bedingungen. Steht die Rolle in der Zuordnungstabelle `DATUMSROLLE_TO_PROPERTY` und erkennt `is_iso_date()` den normalisierten Wert als ISO-Datierung, wandert der Wert in die typisierte Property. In jedem anderen Fall entsteht ein `m3gim:DatedEvent`.

Die 101 Auffangknoten zerfallen danach in drei Gruppen.

| Grund für die Auffangklasse | Knoten |
|---|---|
| Rolle fehlt in der Zuordnungstabelle, Wert ist ISO | 96 |
| Rolle steht in der Tabelle, Wert scheitert am ISO-Muster | 4 |
| beides zugleich | 1 |

Nur der eine Knoten der dritten Gruppe, `1957-[05-27?]` an `UAKUG/NIM_007 5_1`, entspricht dem Zweck, den das formale Vokabular für `m3gim:DatedEvent` angibt, also der klammer- und fragezeichen-unsicheren Datierung. Die 96 Knoten der ersten Gruppe tragen einwandfreie ISO-Werte und stehen nur deshalb in der Auffangklasse, weil ihre Rolle in einer Tabelle im Code fehlt. Davon tragen 75 die Rolle `erwähnt`, neun `rahmenveranstaltung`, vier `aufnahme`.

Die vier Knoten der zweiten Gruppe widerlegen den bisher vorliegenden Erstbefund, wonach kein Datensatz dieselbe Datumsrolle in beiden Formen führt. Es gibt einen solchen Datensatz.

`UAKUG/NIM_139 109_2`, ein Programmheft zu Tristan und Isolde an der Pariser Oper, führt vier Aufführungsdaten derselben Produktion. Eines steht als `m3gim:auffuehrungsdatum` mit dem Wert `1956-05-16` am Record. Die drei anderen stehen als `m3gim:DatedEvent` mit `m3gim:dateRole` `aufführung` und den Werten `1956-5-13`, `1956-5-12` und `1956-5-11` (XLSX-Blatt Box 6, Zeilen 40 bis 42). Der einzige Unterschied ist die fehlende führende Null im Monat, an der das ISO-Muster scheitert. Ein zweiter Fall liegt bei `UAKUG/NIM_004 34` vor, wo `erscheinungsdatum` mit dem jahrlosen Wert `06-09` in die Auffangklasse läuft, während dieselbe Rolle an 28 anderen Stellen die typisierte Property füllt.

Damit steht fest, dass das Aufteilungskriterium ein Implementierungsdetail ist. Es besteht aus einer Nachschlagetabelle und einer Regex und trennt Angaben, die fachlich dasselbe sind. Auf Rollenebene betrachtet trifft es 19 Dokumente, die beide Formen tragen, und in einem davon dieselbe Rolle in beiden Formen.

## 2. Erschließbarkeit der Rolle je Fall

Die Prüfung stellt für jede Rolle die Frage, ob sie sich aus Knotentyp und Zugriffsproperty allein ergibt. Sie ergibt sich genau dann, wenn kein Subjektknoten im gesamten Bestand zwei Angaben derselben Art mit verschiedener Bedeutung tragen kann.

### 2.1 Strukturell erschließbar

#### Normdaten-Zeitwerte an Personen, Werken und Institutionen

Betroffen sind `schema:birthDate` und `schema:deathDate` an `rico:Person`, `m3gim:wdPremiereDate` an `m3gim:MusicalWork` sowie `m3gim:inception` an `rico:CorporateBody`. Kein Knoten des Bestands trägt zwei Werte einer dieser Properties; die Prüfung über alle 1301 Personenreferenzen ergibt null Mehrfachbelegungen. Die Kardinalität folgt aus der Sache, weil eine Person genau einmal geboren wird. Diese Properties brauchen keine Rollenbeschriftung und haben auch keine. Sie sind der Maßstab, an dem die übrigen Fälle zu messen sind.

#### `m3gim:auffuehrungsdatum` am Aufführungsknoten

71 der 724 `m3gim:Performance` tragen ein Datum, keine trägt zwei. An diesem Knoten ist das Datum die Datierung des Ereignisses selbst; eine Rollenangabe hätte dort keinen Gegenstand. Belegt an `UAKUG/NIM_073 30_1`, wo 24 Aufführungen der Bayreuther Festspiele 1953 als je eigener Performance-Knoten mit je einem Datum und je einem Werk stehen. Die Stellung trägt die Rolle hier vollständig.

#### `m3gim:monetaryAmount` und `m3gim:currency` an der Detailannotation

Betrag und Währung sind je Knoten eindeutig; der Parser löst einen Doppelbetrag in zwei Knoten auf. Die Rolle des Postens ist damit nicht erschließbar, wohl aber die Rolle der beiden Wertproperties zueinander.

### 2.2 Nicht erschließbar

#### Datierungen am Dokumentknoten

14 Dokumente tragen mehr als eine typisierte Datumsproperty. Der schärfste Fall ist `UAKUG/NIM_007 2`, ein Brief von Martin Hugo Taubmann an Malaniuk. Der Record trägt fünf Datierungen in fünf verschiedenen Rollen und dazu `rico:date`.

```
rico:date                   1952-05-27
m3gim:absendedatum          1952-05-27
m3gim:empfangsdatum         1952-05-21
m3gim:gespraechsdatum       1952-05-26
m3gim:abreisedatum          1952-08-27/1952-08-28
m3gim:auftrittsdatum        1952-09-05, 1952-12-01
```

Alle sechs Werte hängen am selben Subjektknoten, alle sind über eine datumstragende Property erreichbar, alle bedeuten etwas anderes. Aus der Stellung folgt keine von ihnen. Die chronologische Reihenfolge hilft nicht weiter, weil das Empfangsdatum vor dem Absendedatum liegt; ob das ein Quellfehler ist, ist mit dem Erschließungsteam zu klären, für die strukturelle Frage ist es unerheblich.

Weitere Belege derselben Klasse liegen bei `UAKUG/NIM_011 1` (`ausstellungsdatum`, zweimal `auffuehrungsdatum`, `probenbeginn`), `UAKUG/NIM_011 6` (`erstelldatum`, sechsmal `auffuehrungsdatum`, fünfmal `probendatum`), `UAKUG/NIM_007 9` (`auffuehrungsdatum`, `probenbeginn`) und `UAKUG/NIM_007 11` (fünfmal `auftrittsdatum`, siebenmal `probendatum`).

#### Verortungen am Dokumentknoten

56 Dokumente tragen mehr als eine Ortsreferenz mit verschiedenen Rollen. 25 Dokumente tragen mehr als ein `SpatiotemporalEvent` mit verschiedenen `eventRole`-Werten. Der entscheidende Beleg ist `UAKUG/NIM_011 1`, ein Begleitbrief zum Genfer Vertrag. Der Record trägt zwei raumzeitliche Ereignisse.

```
ste_NIM_011_1_527789f9   atPlace Wien   eventRole absendeort   (ohne Datum)
ste_NIM_011_1_704aa5ed   atPlace Wien   eventRole empfangsort  (ohne Datum)
```

Zwei Knoten desselben Typs, am selben Dokument, mit demselben Ortswert, ohne jede weitere unterscheidende Angabe. Ohne die Rollenbeschriftung sind sie ununterscheidbar und zugleich bedeutungsverschieden. Sieben weitere Dokumente führen ein Absende- und ein Empfangs- oder Zielortpaar, acht Dokumente führen denselben Ort in zwei verschiedenen Rollen, darunter `UAKUG/NIM_011 11` mit Bayreuth in den Rollen `probe`, `auftritt`, `generalprobe` und `entstehung`.

#### Finanzposten am Dokumentknoten

Sechs Dokumente tragen mehrere Detailannotationen mit verschiedener Rollenkombination. `UAKUG/NIM_023 7`, ein Verpflichtungsschein des Nordwestdeutschen Rundfunks, trägt drei Beträge, alle mit demselben `detailField` `einnahmen`.

```
1.200, DM   detailRole rundfunkshonorar
151, DM     detailRole reisekosten
1.351, DM   detailRole gesamtvergütung
```

Der dritte Betrag ist die Summe der beiden ersten. Ohne die Rolle wäre die Gesamtvergütung von den Einzelposten nicht zu trennen und die Auswertung würde den Betrag doppelt zählen. Dieselbe Konstruktion liegt bei `UAKUG/NIM_023 8` und `UAKUG/NIM_023 10` vor. Bei `UAKUG/NIM_023 2` steht derselbe Betrag zweimal, einmal als `einnahmen`/`gesamtvergütung` und einmal als `summe`/`erwähnt`.

#### Datierungen in der Auffangklasse

Vier Dokumente tragen mehr als ein `m3gim:DatedEvent` mit verschiedenen `dateRole`-Werten, darunter `UAKUG/NIM_023 9` mit `generalprobe` am 1953-07-02 und `aufnahme` am 1953-07-03 sowie `UAKUG/NIM_022 1_1` mit `rahmenveranstaltung` und `ratenzahlung` über denselben Zeitraum 1952-06-22/1952-08-25. Im letzten Fall ist der Wert identisch und nur die Rolle trennt die Aussage über den Festspielzeitraum von der über den Ratenzahlungszeitraum.

### 2.3 Heute nicht entscheidbar

Für die folgenden Rollen ist die Datenlage zu dünn, um aus ihr eine Regel abzuleiten. Genannt sind Rolle, Vorkommen und der offene Punkt.

| Rolle | Vorkommen | offener Punkt |
|---|---|---|
| `gespräch` | 1 typisierter Wert | Ob ein Gesprächsdatum je zusammen mit einem anderen Datum desselben Dokuments auftritt, zeigt der Bestand nur an `UAKUG/NIM_007 2`, wo es das tut. Ein einziger Fall trägt keine Regel. |
| `überweisung` | 1 typisierter Wert | dito, und die Abgrenzung gegen `lohnbestätigung` und `ratenzahlung` in der Auffangklasse ist ungeprüft |
| `ausstrahlung` | 1 typisierter Wert | Ob Ausstrahlung und Aufnahme am selben Dokument zusammentreffen, ist an `UAKUG/NIM_007 6` mit `ausstrahlungsdatum` und `ueberweisungsdatum` angedeutet, aber nicht mit einem Aufnahmedatum belegt |
| `abreisedatum`, `empfangsdatum` | je 1 typisierter Wert | beide nur in `UAKUG/NIM_007 2` bzw. `UAKUG/NIM_004 1` und `UAKUG/NIM_007 2` |
| `generalprobe` | 1 als `dateRole`, 1 als `eventRole`, 1 als Ortsrolle | Ob Generalprobe eine eigene Rolle bleibt oder ein Wert von `m3gim:probenTyp` unter `probe` wird, entscheidet der Bestand nicht. `m3gim:probenTyp` ist in [data.md](../../knowledge/data.md) § 7 deklariert und im Datensatz nullmal befüllt. |
| `lohnbestätigung`, `ratenzahlung`, `empfang`, `auftrag` | je 1 bis 2 Vorkommen | keine Aussage über Mehrfachauftreten am selben Subjekt möglich |
| `spielzeit` | 2 typisierte Werte, 7 als `eventRole` | Der Wert trägt eine Spanne in einer Property, deren Name den Beginn bezeichnet; ob die Spanne zu zerlegen ist, ist eine eigene offene Frage |

Für diese Rollen gilt, dass die Frage der Projektleitung an ihnen weder bejaht noch verneint werden kann. Sie sind im Entwurf so zu behandeln wie die belegten Fälle, weil eine Sonderbehandlung des dünn belegten Rands eine zweite Fallunterscheidung einführen würde und genau das der Befund aus Abschnitt 1.4 als Fehlerquelle ausweist.

### 2.4 Ergebnis der Prüfung

Die Frage der Projektleitung ist für die Normdaten-Zeitwerte und für das Datum am Aufführungsknoten zu bejahen. Für die drei Schichten, um die es geht, also Datierungen und Verortungen am Dokument sowie Finanzposten, ist sie zu verneinen, und die Gegenbelege liegen im Kern des Bestands. Der Grund ist in allen drei Fällen derselbe. Ein Archivdokument ist ein Zeuge. Es bezeugt beliebig viele Ereignisse gleicher Art, und die Stellung einer Angabe am Dokumentknoten sagt darüber nichts aus.

Die Gegenthese des Auftrags bestätigt sich damit in ihrem ersten Teil. Ihr zweiter Teil, wonach die erfasste Rolle eine belegte Quellangabe und eine erschlossene eine Interpretation ist, findet im Datensatz eine eigene Stütze. 38 Ortsreferenzen, zwei raumzeitliche Ereignisse, zwei Werkreferenzen und eine Personenreferenz tragen heute keine Rolle. Würde die Rolle aus der Stellung erschlossen, bekämen genau diese Fälle eine Rolle zugeschrieben, die die Quelle nicht hergibt, und die Unterscheidung zwischen erfasst und erschlossen ginge verloren.

## 3. Rollenbestand

### 3.1 Rollen, die eine eigenständige fachliche Aussage tragen

Die Prüfung in Abschnitt 2.2 belegt für die folgenden Gruppen, dass die Rolle Information trägt, die sonst verloren ginge.

- Die Korrespondenzrollen `absendeort`, `empfangsort`, `zielort`, `abreiseort` unterscheiden an `UAKUG/NIM_011 1` zwei ansonsten identische Knoten.
- Die Finanzrollen `abendgage`, `provision`, `reisekosten`, `rundfunkshonorar`, `gesamtvergütung` unterscheiden an `UAKUG/NIM_023 7` Einzelposten von der Summe.
- Die Produktionsrollen `probe`, `probenbeginn`, `premiere`, `aufführung` ordnen an `UAKUG/NIM_011 1` und `UAKUG/NIM_011 6` mehrere Daten desselben Dokuments verschiedenen Stationen einer Produktion zu.
- Die Rolle `erwähnt` markiert eine bloße Nennung. Sie trägt 75 der 101 Auffangknoten, 143 Ortsreferenzen und 162 Personenreferenzen. Ihr Wert liegt darin, dass sie den Fall erfasste Nennung von dem Fall keine Rolle erfasst trennt.
- Die Ereignisrolle `rahmenveranstaltung` trennt an `UAKUG/NIM_073 30_1` den Festspielzeitraum 1953-07-23/1953-08-23 von der Erwähnung 1876/1953 und von den 24 datierten Einzelaufführungen.

### 3.2 Rollen, die nur wegen fehlender Struktur existieren

Hier liegt die eigentliche Redundanz, an einer anderen Stelle als der von der Frage der Projektleitung vermuteten. Redundant ist der Aspektzusatz im Rollennamen gegen die Wertproperty, an der die Rolle hängt. Die Rolle gegen die Stellung ist es nach Abschnitt 2 gerade nicht.

#### Die `-datum`- und `-ort`-Endungen

Die Datums- und Ortsschicht führen zusammen 34 Rollenwerte. Vierzehn davon kommen in beiden Schichten vor, also derselbe Wert einmal an einer Zeitangabe und einmal an einer Ortsangabe. Daneben stehen Paare, in denen die Endung des Rollennamens den Aspekt wiederholt, den schon die Property trägt.

| Aspektpaar | Datumsseite | Ortsseite |
|---|---|---|
| Absendung | `absendedatum`, 4 Werte | `absendeort`, 15 Ereignisse |
| Empfang | `empfangsdatum`, 1 Wert | `empfangsort`, 3 Ereignisse |
| Abreise | `abreisedatum`, 1 Wert | `abreiseort`, 4 Ereignisse |
| Entstehung | `erstelldatum`, 10 Werte | `entstehungsort`, 11 Referenzen; `entstehung`, 16 Ereignisse |

Der Aspekt steht in der Wertproperty (`atDate` gegen `atPlace`) und noch einmal im Rollennamen. Sobald ein Knoten beide Werte tragen kann, ist die Endung überflüssig.

#### Der Fall Entstehung im Detail

Derselbe Sachverhalt, also die Entstehung eines Dokuments an einem Ort zu einer Zeit, liegt im Bestand in drei einander ausschließenden Bauformen vor.

| Bauform | Dokumente | Beleg |
|---|---|---|
| `SpatiotemporalEvent` mit `eventRole` `entstehung`, `atPlace` und `atDate` | 16 | `UAKUG/NIM_011 14`, München, 1952-12-13 |
| `m3gim:erstelldatum` am Record plus getrennte Ortsreferenz mit Rolle `absendeort` | 10 | `UAKUG/NIM_011 3`, erstelldatum 1954-06-16, Ortsereignisse Bayreuth als `absendeort` und München als `empfangsort`, beide ohne Datum |
| Ortsreferenz mit Rolle `entstehungsort` ohne zugehörige Datumsrolle | 11 | `UAKUG/NIM_007 4`, entstehungsort Stuttgart, dazu `absendedatum` 1953-09-29 |

Die drei Mengen überschneiden sich nicht. Kein Dokument mit `erstelldatum` trägt ein `entstehung`-Ereignis, und kein Dokument mit `entstehungsort` trägt eines. Welche Bauform greift, hängt allein davon ab, welchen Verknüpfungstyp die Erfassungszeile getragen hat. In allen 15 Fällen, in denen ein `entstehung`-Ereignis und ein `rico:date` am selben Dokument stehen, sind die Werte identisch; das sechzehnte Dokument hat kein `rico:date`. Bei `erstelldatum` stimmt der Wert in neun von zehn Fällen mit `rico:date` überein, die Ausnahme `UAKUG/NIM_011 7` trägt den Tippfehler `1055-08-24` gegen `1955-08-24`.

#### Die Wiederholung von `rico:date`

Vier der typisierten Properties wiederholen weit überwiegend eine Angabe, die am selben Knoten schon steht.

| Property | Werte | Dokument trägt auch `rico:date` | Wert deckungsgleich |
|---|---|---|---|
| `m3gim:ausstellungsdatum` | 7 | 7 | 7 |
| `m3gim:absendedatum` | 4 | 4 | 4 |
| `m3gim:erstelldatum` | 10 | 10 | 9 |
| `m3gim:erscheinungsdatum` | 28 | 27 | 22 |

Bei den übrigen Properties liegt die Deckungsgleichheit niedrig oder bei null; `auffuehrungsdatum` deckt sich in 3 von 67 Werten, `probendatum` und `probenbeginn` in keinem. Die vier obigen Properties sagen am Dokument in der Sache dasselbe wie `rico:date` und typisieren es nur.

#### Der Vertragsstatus

`nicht eingehalten` steht dreimal als `dateRole`, einmal als `detailRole`, zweimal als Ortsrolle sowie je einmal an einer Werk- und einer Institutionsreferenz. Das formale Vokabular führt den Wert bewusst nicht als Concept und benennt `m3gim:contractStatus` zusammen mit `m3gim:realized` als Zielfeld. Beide Properties sind im Datensatz nullmal befüllt. Der Wert ist keine Rolle und belegt heute sieben Rollenstellen.

#### Die Doppelung Auftritt gegen Aufführung

Die `skos:editorialNote` an `m3gim:auftrittsdatum` hält fest, dass die Abgrenzung allein der Rollenspalte der Quelle folgt und ihr keine inhaltliche Unterscheidung zugrunde liegt. Im Datensatz stehen 25 Werte unter `auftrittsdatum` gegen 138 unter `auffuehrungsdatum`, und beide Rollen kommen zusätzlich an Werk-, Personen-, Institutions- und Ensemble-Referenzen vor. Ob die beiden zusammenfallen, ist eine fachliche Entscheidung und aus der Struktur des Bestands nicht abzuleiten.

### 3.3 Wie viele Rollen ein zusammengeführtes Modell braucht

Ausgangspunkt sind die 34 Rollenwerte der Datums- und Ortsschicht. Die folgende Rechnung nennt je Schritt den Grund und die Belegstelle.

| Schritt | Wirkung | Restbestand |
|---|---|---|
| Ausgangsbestand Datums- und Ortsschicht | | 34 |
| `nicht eingehalten` nach `m3gim:contractStatus`, bereits in [data.md](../../knowledge/data.md) § 11 entschieden und unimplementiert | −1 | 33 |
| `absendedatum` und `absendeort` fallen zu einer Rolle zusammen, Aspekt trägt die Wertproperty | −1 | 32 |
| `empfangsdatum` und `empfangsort` ebenso | −1 | 31 |
| `abreisedatum` und `abreiseort` ebenso | −1 | 30 |
| `erstelldatum`, `entstehungsort` und `entstehung` fallen zu einer Rolle zusammen, drei Bauformen desselben Sachverhalts | −2 | 28 |
| `auftritt` fällt mit `aufführung` zusammen, sofern die Projektleitung der `editorialNote` folgt | −1 | 27 |

Ein zusammengeführtes Modell braucht damit 27 Rollenwerte für Datierungen und Verortungen, gegenüber heute 34 Werten und zusätzlich 16 Property-Namen, die dieselben Rollen ein zweites Mal ausdrücken. Keiner der 27 Werte trägt danach noch eine `-datum`- oder `-ort`-Endung, weil der Aspekt in der Wertproperty steht.

Die Finanzschicht bleibt bei ihren acht Rollenwerten, abzüglich `nicht eingehalten` und abzüglich `interpret`, das an einer einzigen Detailannotation als Finanzrolle steht und dort als Erfassungsfehler zu prüfen ist. Belegt bleiben `abendgage`, `provision`, `gesamtvergütung`, `reisekosten`, `rundfunkshonorar` und `erwähnt`.

## 4. Zielmodell

### 4.1 Der Entwurf in einem Satz

Jede Datierung, Verortung und Detailangabe hängt als eigener Annotationsknoten am Subjekt, trägt ihren Wert in einer festen Wertproperty und ihre erfasste Rolle in einer einzigen Rollenproperty aus dem gemeinsamen Vokabular, sodass kein Property-Name mehr eine Rolle ausdrückt und ein Konsument alle Datierungen eines Dokuments über eine Schleife erreicht.

### 4.2 Aufbau

Der Entwurf baut die vier Schichten gleich. Drei der vier haben die Zielgestalt bereits.

| Schicht | heute | im Entwurf |
|---|---|---|
| Ort | `SpatiotemporalEvent` mit `atPlace`, optional `atDate`, `eventRole` | unverändert in der Gestalt, Rollenproperty umbenannt |
| Datum, Auffangklasse | `DatedEvent` mit `dateValue`, `dateRole` | geht im Ortsknoten auf, der dann ein Ereignis mit optionalem Ort und optionalem Datum ist |
| Datum, flache Familie | 16 Properties am Record, Rolle im Namen | entfällt, jeder Wert wird ein Ereignisknoten mit `atDate` und Rolle |
| Finanz | `DetailAnnotation` mit `monetaryAmount`, `currency`, `detailField`, `detailRole` | unverändert in der Gestalt, Rollenproperty umbenannt |

Die vier Rollenproperties `m3gim:role`, `m3gim:eventRole`, `m3gim:dateRole` und `m3gim:detailRole` fallen zu einer zusammen. Das folgt aus dem Befund in Abschnitt 1.3, dass sie schon heute aus einem Vokabular ziehen, und das formale Vokabular sagt es selbst. Als Name schlage ich `m3gim:role` vor, weil die Property existiert und mit 63 belegten Werten die breiteste ist. Die endgültige Benennung folgt der Umbenennungskarte.

Der Ereignisknoten trägt im Entwurf `m3gim:atPlace` und `m3gim:atDate`, beide optional. Fehlt der Ort, ist es eine reine Datierung; fehlt das Datum, eine reine Verortung. Damit entfällt `m3gim:DatedEvent` als eigene Klasse. Die Klasse `m3gim:SpatiotemporalEvent` ist der naheliegende Träger, weil ihr Kommentar sie schon heute als wahlweise datiertes Ereignis beschreibt; ihr Name behauptet dann allerdings für den ortslosen Fall zu viel. Die Benennung ist eine Entscheidung der Projektleitung, siehe Abschnitt 6.

Der Bündelknoten `m3gim:Occurrence` aus E-125 bis E-128 bleibt davon unberührt. Er liegt eine Ebene über den Aspektknoten und bündelt sie zur Aktivität; der Entwurf hier vereinheitlicht die Aspektebene selbst. Beide greifen ineinander, weil ein einheitlicher Aspektknoten die Bündelung vereinfacht.

`rico:date` bleibt am Dokument. Es ist ein RiC-O-Term und trägt die archivische Datierung der Einheit. Der Entwurf entfernt nur die projekteigene Familie, die daneben steht.

### 4.3 Wie der Entwurf die drei geforderten Leistungen erbringt

#### Die erfasste Rolle bleibt eine belegte Quellangabe

Jeder Ereignisknoten trägt seine Rolle als Wert und dazu `m3gim:xlsxSource` mit Blatt und Zeile der Ursprungszelle. Wo die Quelle keine Rolle führt, trägt der Knoten keine, und die 38 heute rollenlosen Ortsreferenzen bleiben sichtbar rollenlos. Eine aus der Stellung erschlossene Rolle entsteht an keiner Stelle. Wo die Projektleitung eine Erschließung wünscht, gehört sie als eigener Term neben die erfasste Rolle, damit belegt und erschlossen unterscheidbar bleiben.

#### Die Redundanz zwischen Property-Name und Rollenbegriff ist aufgelöst

Nach der Umstellung existiert kein Property-Name mehr, der eine Rolle ausdrückt. Die 16 Namen der flachen Familie entfallen, ebenso die Zuordnungstabelle `DATUMSROLLE_TO_PROPERTY` und die Fallunterscheidung, die den Befund aus Abschnitt 1.4 erzeugt hat. Die `-datum`- und `-ort`-Endungen der Rollenwerte entfallen mit dem Zusammenfall aus Abschnitt 3.3.

#### Das Frontend rendert generisch

Ein Konsument liest alle Datierungen eines Dokuments über eine Schleife über die Ereignisknoten und nimmt Wert und Rolle ab. Die Register `TYPED_DATE_PROPS` in `docs/js/data/loader.js` und `SECONDARY_LABEL` in `docs/js/views/chronik-data.js` mit heute je 14 Einträgen entfallen; das Anzeigelabel kommt aus dem `skos:prefLabel` des Rollen-Concepts, wie es die Dokumenttyp-Labels seit E-101 schon tun.

### 4.4 Fünf Beispiele aus dem Bestand, vorher und nachher

Die Beispiele sind gekürzt auf die betroffenen Angaben. Titel, Sprache, Umfang, Agenten und die Anreicherungsfelder bleiben unverändert und sind weggelassen. Die `@id` der neuen Knoten folgt dem bestehenden inhaltsbasierten Muster aus E-115 und ist hier schematisch geschrieben. Wo eine Zeilennummer der Quelle in der Nachher-Fassung als `…` steht, hat der Befund sie nicht ausgelesen, weil sie an der bestehenden Datumsproperty nicht mitgeführt wird; sie stammt beim Umbau aus der Verknüpfungszeile.

#### Beispiel 1, Korrespondenzstück mit fünf Datierungen

`UAKUG/NIM_007 2`, Brief von Martin Hugo Taubmann, Objektzeile 118.

Vorher.

```json
{
  "@id": "m3gim:NIM_007_2",
  "@type": "rico:Record",
  "rico:date": "1952-05-27",
  "m3gim:absendedatum": "1952-05-27",
  "m3gim:empfangsdatum": "1952-05-21",
  "m3gim:gespraechsdatum": "1952-05-26",
  "m3gim:abreisedatum": "1952-08-27/1952-08-28",
  "m3gim:auftrittsdatum": ["1952-09-05", "1952-12-01"],
  "m3gim:hasSpatiotemporalEvent": [
    {"@id": "m3gim:ste_NIM_007_2_bd830db9"},
    {"@id": "m3gim:ste_NIM_007_2_2d8cb340"}
  ]
}
```

Nachher.

```json
{
  "@id": "m3gim:NIM_007_2",
  "@type": "rico:Record",
  "rico:date": "1952-05-27",
  "m3gim:hasEvent": [
    {"@id": "m3gim:ev_NIM_007_2_a1"},
    {"@id": "m3gim:ev_NIM_007_2_a2"},
    {"@id": "m3gim:ev_NIM_007_2_a3"},
    {"@id": "m3gim:ev_NIM_007_2_a4"},
    {"@id": "m3gim:ev_NIM_007_2_a5"},
    {"@id": "m3gim:ev_NIM_007_2_a6"},
    {"@id": "m3gim:ev_NIM_007_2_bd830db9"},
    {"@id": "m3gim:ev_NIM_007_2_2d8cb340"}
  ]
}
```

Die sechs neuen Knoten, hier zusammen gezeigt.

```json
[
 {"@id": "m3gim:ev_NIM_007_2_a1", "m3gim:atDate": "1952-05-27", "m3gim:role": "absendung",
  "m3gim:xlsxSource": {"m3gim:xlsxSheet": "Box_01", "m3gim:xlsxRow": "…"}},
 {"@id": "m3gim:ev_NIM_007_2_a2", "m3gim:atDate": "1952-05-21", "m3gim:role": "empfang"},
 {"@id": "m3gim:ev_NIM_007_2_a3", "m3gim:atDate": "1952-05-26", "m3gim:role": "gespräch"},
 {"@id": "m3gim:ev_NIM_007_2_a4", "m3gim:atDate": "1952-08-27/1952-08-28", "m3gim:role": "abreise"},
 {"@id": "m3gim:ev_NIM_007_2_a5", "m3gim:atDate": "1952-09-05", "m3gim:role": "aufführung"},
 {"@id": "m3gim:ev_NIM_007_2_a6", "m3gim:atDate": "1952-12-01", "m3gim:role": "aufführung"},
 {"@id": "m3gim:ev_NIM_007_2_bd830db9", "m3gim:atPlace": {"name": "Zürich, Geibelstrasse 1/1"},
  "m3gim:role": "zielort"},
 {"@id": "m3gim:ev_NIM_007_2_2d8cb340", "m3gim:atPlace": {"name": "Bayreuth", "@id": "wd:Q3923"},
  "m3gim:atDate": "1952-08-26", "m3gim:role": "erwähnt"}
]
```

Der Mehrfachwert `auftrittsdatum` wird zu zwei Knoten, weil zwei Auftritte gemeint sind. Die Rolle `auftritt` ist dabei auf `aufführung` geführt, was die in Abschnitt 3.3 genannte Entscheidung voraussetzt; ohne sie bleibt sie `auftritt`.

#### Beispiel 2, Aufführung mit Ausstellungs-, Proben- und Aufführungsdatum

`UAKUG/NIM_011 1`, Begleitbrief zum Genfer Vertrag, zugleich der Beleg aus Abschnitt 2.2 für zwei ununterscheidbare Ortsknoten.

Vorher.

```json
{
  "@id": "m3gim:NIM_011_1",
  "rico:date": "1956-08-16",
  "m3gim:ausstellungsdatum": "1956-08-16",
  "m3gim:auffuehrungsdatum": ["1956-12-12", "1956-12-14"],
  "m3gim:probenbeginn": "1956-12-09",
  "rico:hasOrHadLocation": [
    {"name": "Wien", "role": "absendeort"},
    {"name": "Genf", "role": null},
    {"name": "Wien", "role": "empfangsort"}
  ]
}
```

Dazu die beiden bestehenden Ereignisknoten.

```json
[
 {"@id": "m3gim:ste_NIM_011_1_527789f9", "m3gim:atPlace": {"name": "Wien"}, "m3gim:eventRole": "absendeort"},
 {"@id": "m3gim:ste_NIM_011_1_704aa5ed", "m3gim:atPlace": {"name": "Wien"}, "m3gim:eventRole": "empfangsort"}
]
```

Nachher, die Ereignisknoten des Dokuments.

```json
[
 {"@id": "m3gim:ev_NIM_011_1_b1", "m3gim:atDate": "1956-08-16", "m3gim:role": "ausstellung"},
 {"@id": "m3gim:ev_NIM_011_1_b2", "m3gim:atDate": "1956-12-12", "m3gim:role": "aufführung"},
 {"@id": "m3gim:ev_NIM_011_1_b3", "m3gim:atDate": "1956-12-14", "m3gim:role": "aufführung"},
 {"@id": "m3gim:ev_NIM_011_1_b4", "m3gim:atDate": "1956-12-09", "m3gim:role": "probenbeginn"},
 {"@id": "m3gim:ev_NIM_011_1_527789f9", "m3gim:atPlace": {"name": "Wien"}, "m3gim:role": "absendung"},
 {"@id": "m3gim:ev_NIM_011_1_704aa5ed", "m3gim:atPlace": {"name": "Wien"}, "m3gim:role": "empfang"},
 {"@id": "m3gim:ev_NIM_011_1_b5", "m3gim:atPlace": {"name": "Genf"}}
]
```

Der Genfer Ortsknoten trägt weiterhin keine Rolle, weil die Quelle keine führt. Die beiden Wiener Knoten bleiben unterscheidbar, weil sie die Rolle tragen; nach dem Zusammenfall aus Abschnitt 3.3 heißen die Rollen `absendung` und `empfang` ohne Aspektendung, weil der Aspekt in `atPlace` steht.

#### Beispiel 3, Finanzeintrag

`UAKUG/NIM_023 7`, Verpflichtungsschein des Nordwestdeutschen Rundfunks, XLSX-Blatt Box_02, Zeilen 154 und 159 bis 161.

Vorher.

```json
{
  "@id": "m3gim:NIM_023_7",
  "rico:date": "1952-10-24",
  "m3gim:hasDetail": [
    {"@type": "m3gim:DetailAnnotation", "m3gim:detailField": "einnahmen",
     "m3gim:detailValue": "1.200, DM", "m3gim:detailRole": "rundfunkshonorar",
     "m3gim:monetaryAmount": {"@value": "1200", "@type": "xsd:decimal"}, "m3gim:currency": "DM"},
    {"@type": "m3gim:DetailAnnotation", "m3gim:detailField": "einnahmen",
     "m3gim:detailValue": "151, DM", "m3gim:detailRole": "reisekosten",
     "m3gim:monetaryAmount": {"@value": "151", "@type": "xsd:decimal"}, "m3gim:currency": "DM"},
    {"@type": "m3gim:DetailAnnotation", "m3gim:detailField": "einnahmen",
     "m3gim:detailValue": "1.351, DM", "m3gim:detailRole": "gesamtvergütung",
     "m3gim:monetaryAmount": {"@value": "1351", "@type": "xsd:decimal"}, "m3gim:currency": "DM"}
  ],
  "m3gim:hasDatedEvent": {"@type": "m3gim:DatedEvent",
    "m3gim:dateValue": "1953-03-19/1953-03-24", "m3gim:dateRole": "aufnahme"}
}
```

Nachher.

```json
{
  "@id": "m3gim:NIM_023_7",
  "rico:date": "1952-10-24",
  "m3gim:hasDetail": [
    {"@type": "m3gim:DetailAnnotation", "m3gim:detailField": "einnahmen",
     "m3gim:detailValue": "1.200, DM", "m3gim:role": "rundfunkshonorar",
     "m3gim:monetaryAmount": {"@value": "1200", "@type": "xsd:decimal"}, "m3gim:currency": "DM"},
    {"@type": "m3gim:DetailAnnotation", "m3gim:detailField": "einnahmen",
     "m3gim:detailValue": "151, DM", "m3gim:role": "reisekosten",
     "m3gim:monetaryAmount": {"@value": "151", "@type": "xsd:decimal"}, "m3gim:currency": "DM"},
    {"@type": "m3gim:DetailAnnotation", "m3gim:detailField": "einnahmen",
     "m3gim:detailValue": "1.351, DM", "m3gim:role": "gesamtvergütung",
     "m3gim:monetaryAmount": {"@value": "1351", "@type": "xsd:decimal"}, "m3gim:currency": "DM"}
  ],
  "m3gim:hasEvent": [
    {"@id": "m3gim:ev_NIM_023_7_c1", "m3gim:atDate": "1953-03-19/1953-03-24", "m3gim:role": "aufnahme"},
    {"@id": "m3gim:ev_NIM_023_7_46bf7d31", "m3gim:atPlace": {"name": "Köln", "@id": "wd:Q365"},
     "m3gim:atDate": "1952-10-24", "m3gim:role": "vertragsort"}
  ]
}
```

Die Finanzschicht ändert nur den Namen ihrer Rollenproperty. `m3gim:detailField` bleibt, weil es die Richtung des Geldflusses trägt und damit eine von der Rolle unabhängige Angabe ist; `UAKUG/NIM_023 2` führt denselben Betrag einmal als `einnahmen`/`gesamtvergütung` und einmal als `summe`/`erwähnt`.

#### Beispiel 4, Mobilitätsereignis

`UAKUG/NIM_004 1`, Kopie eines Briefumschlags mit New Yorker Poststempel.

Vorher.

```json
{
  "@id": "m3gim:NIM_004_1",
  "rico:date": "1959-10-28",
  "m3gim:absendedatum": "1959-10-28",
  "rico:hasOrHadLocation": [
    {"name": "New York", "@id": "wd:Q60", "role": "absendeort"},
    {"name": "Zürich, Zürichbergstrasse 104", "role": "zielort"}
  ]
}
```

Dazu die beiden datumslosen Ereignisknoten.

```json
[
 {"@id": "m3gim:ste_NIM_004_1_902c53c1", "m3gim:atPlace": {"name": "New York", "@id": "wd:Q60"},
  "m3gim:eventRole": "absendeort"},
 {"@id": "m3gim:ste_NIM_004_1_60aa8e40", "m3gim:atPlace": {"name": "Zürich, Zürichbergstrasse 104"},
  "m3gim:eventRole": "zielort"}
]
```

Nachher, strukturelle Umstellung ohne Zusammenführung.

```json
[
 {"@id": "m3gim:ev_NIM_004_1_d1", "m3gim:atDate": "1959-10-28", "m3gim:role": "absendung"},
 {"@id": "m3gim:ev_NIM_004_1_902c53c1", "m3gim:atPlace": {"name": "New York", "@id": "wd:Q60"},
  "m3gim:role": "absendung"},
 {"@id": "m3gim:ev_NIM_004_1_60aa8e40", "m3gim:atPlace": {"name": "Zürich, Zürichbergstrasse 104"},
  "m3gim:role": "zielort"}
]
```

Nachher mit Zusammenführung, die eine fachliche Entscheidung voraussetzt.

```json
[
 {"@id": "m3gim:ev_NIM_004_1_902c53c1", "m3gim:atPlace": {"name": "New York", "@id": "wd:Q60"},
  "m3gim:atDate": "1959-10-28", "m3gim:role": "absendung",
  "m3gim:xlsxSource": [{"m3gim:xlsxSheet": "Box_01", "m3gim:xlsxRow": "…"},
                       {"m3gim:xlsxSheet": "Box_01", "m3gim:xlsxRow": "…"}]},
 {"@id": "m3gim:ev_NIM_004_1_60aa8e40", "m3gim:atPlace": {"name": "Zürich, Zürichbergstrasse 104"},
  "m3gim:role": "zielort"}
]
```

Erst die zweite Fassung beantwortet die Frage, wo Malaniuk wann war, in einem Knoten. Sie behauptet allerdings, dass die Datumszeile und die Ortszeile der Quelle denselben Vorgang beschreiben, und diese Behauptung geht über die Erfassung hinaus. Sie ist deshalb als eigener Schritt zu entscheiden, siehe Abschnitt 6. Der Fall betrifft die vier Aspektpaare aus Abschnitt 3.2, also nach heutigem Stand höchstens 16 Datumswerte auf der Datumsseite sowie 22 Ereignisknoten (`absendeort`, `empfangsort`, `abreiseort`) und 11 Ortsreferenzen mit der Rolle `entstehungsort` auf der Ortsseite.

#### Beispiel 5, derselbe Rollenwert in beiden Bauformen

`UAKUG/NIM_139 109_2`, Programmheft zu Tristan und Isolde an der Pariser Oper, XLSX-Blatt Box 6, Zeilen 40 bis 42. Der Fall aus Abschnitt 1.4 und zugleich der Beleg dafür, dass die Aufteilung ein Implementierungsdetail ist.

Vorher.

```json
{
  "@id": "m3gim:NIM_139_109_2",
  "m3gim:auffuehrungsdatum": "1956-05-16",
  "m3gim:hasDatedEvent": [
    {"@type": "m3gim:DatedEvent", "m3gim:dateValue": "1956-5-13", "m3gim:dateRole": "aufführung",
     "m3gim:xlsxSource": {"m3gim:xlsxSheet": "Box 6", "m3gim:xlsxRow": 40}},
    {"@type": "m3gim:DatedEvent", "m3gim:dateValue": "1956-5-12", "m3gim:dateRole": "aufführung",
     "m3gim:xlsxSource": {"m3gim:xlsxSheet": "Box 6", "m3gim:xlsxRow": 41}},
    {"@type": "m3gim:DatedEvent", "m3gim:dateValue": "1956-5-11", "m3gim:dateRole": "aufführung",
     "m3gim:xlsxSource": {"m3gim:xlsxSheet": "Box 6", "m3gim:xlsxRow": 42}}
  ]
}
```

Nachher.

```json
{
  "@id": "m3gim:NIM_139_109_2",
  "m3gim:hasEvent": [
    {"@id": "m3gim:ev_NIM_139_109_2_e1", "m3gim:atDate": "1956-05-16", "m3gim:role": "aufführung"},
    {"@id": "m3gim:ev_NIM_139_109_2_e2", "m3gim:atDate": "1956-5-13", "m3gim:role": "aufführung",
     "m3gim:dataQualityFlag": "datierung-malformed",
     "m3gim:xlsxSource": {"m3gim:xlsxSheet": "Box 6", "m3gim:xlsxRow": 40}},
    {"@id": "m3gim:ev_NIM_139_109_2_e3", "m3gim:atDate": "1956-5-12", "m3gim:role": "aufführung",
     "m3gim:dataQualityFlag": "datierung-malformed",
     "m3gim:xlsxSource": {"m3gim:xlsxSheet": "Box 6", "m3gim:xlsxRow": 41}},
    {"@id": "m3gim:ev_NIM_139_109_2_e4", "m3gim:atDate": "1956-5-11", "m3gim:role": "aufführung",
     "m3gim:dataQualityFlag": "datierung-malformed",
     "m3gim:xlsxSource": {"m3gim:xlsxSheet": "Box 6", "m3gim:xlsxRow": 42}}
  ]
}
```

Vier Aufführungen derselben Produktion stehen danach in vier gleich gebauten Knoten. Die Notationsabweichung der Quelle wandert dorthin, wo sie hingehört, nämlich in ein Datenqualitäts-Flag und in das Fehlerregister [data-errors.md](../../knowledge/data-errors.md), statt die Modellgestalt zu bestimmen. Das Flag `datierung-malformed` steht bereits im Vokabular und wird von `scripts/transform.py` auf dem Record-Pfad für das Entstehungsdatum gesetzt; im aktuellen Datensatz ist es nullmal belegt, sodass die drei Pariser Werte und der jahrlose Wert aus `UAKUG/NIM_004 34` seine ersten Träger wären.

## 5. Grenzen und Kosten

### 5.1 Was der Entwurf nicht löst

Die Zuordnung einer Datierung zu einem Auftritt bleibt offen. Der Entwurf hängt jede Datierung als eigenen Knoten ans Dokument, ohne zu sagen, welche Datierung zu welchem Auftritt gehört. Bei `UAKUG/NIM_007 11` mit fünf Auftrittsdaten und sieben Probendaten bleibt unbestimmt, welche Probe zu welchem Auftritt gehört. Diese Zuordnung ist Gegenstand des Occurrence-Modells aus E-125 bis E-128 und wird von diesem Entwurf weder erbracht noch verstellt.

Die Sichtbarkeit der Datierung im Dokumentkopf sinkt. Eine typisierte Property am Record ist in einer SPARQL-Abfrage in einem Tripel adressierbar; nach der Umstellung braucht es zwei, weil der Weg über den Ereignisknoten führt. Für die vier Datierungen mit der stärksten Leselast wiegt das schwerer als für den Rand; die Umbenennungskarte hat aus diesem Grund in ihrer Option C für den Erhalt von vier Properties plädiert. Der hier vorgelegte Entwurf entspricht deren Option A und nimmt diesen Nachteil in Kauf, weil er die Fallunterscheidung ganz auflöst.

Die Abgrenzung der Rollenwerte untereinander bleibt, wo sie heute unklar ist. `auftritt` gegen `aufführung`, `probe` gegen `generalprobe`, `sammlung` gegen `konvolut` und der Status von `protagonist` sind fachliche Fragen, die eine strukturelle Vereinheitlichung nicht beantwortet.

Der Zustand `wohnort` bleibt gesondert. Er ist in [data.md](../../knowledge/data.md) § 4 ausdrücklich kein Punktereignis, sondern ein Zustand mit Gültigkeitsperiode, und im Datensatz steht er dreimal als Ortsrolle ohne zugehöriges Ereignis. Ob er im Entwurf ein Ereignisknoten mit `agrelon:metadataPeriod` wird oder außerhalb bleibt, entscheidet der Entwurf nicht.

### 5.2 Was bei der Migration verloren gehen könnte

| Gefährdete Angabe | Grund | Gegenmaßnahme |
|---|---|---|
| Die Unterscheidung `auftritt` gegen `aufführung` | Der Zusammenfall aus Abschnitt 3.3 ist irreversibel, sobald die Quelle nicht mehr befragt wird | Erst nach Entscheidung ausführen; die Ursprungsrolle über `m3gim:derivedFromRole` erhalten. Die Property ist in [data.md](../../knowledge/data.md) § 7 für genau diesen Zweck deklariert und wird von der Pipeline heute nirgends gesetzt, sie wäre also mit dem Umbau erstmals zu befüllen |
| Die Unterscheidung `erstelldatum` gegen `entstehung` gegen `entstehungsort` | dito | dito |
| Die Reihenfolge innerhalb eines Mehrfachwerts | 13 Dokumente tragen Mehrfachwerte in einer typisierten Property; die Listenreihenfolge geht beim Umbau in Einzelknoten verloren | Reihenfolge ist heute schon nicht bedeutungstragend, weil die `@id` seit E-115 inhaltsbasiert vergeben wird; die XLSX-Zeilennummer bleibt der Anker |
| Die Zuordnung eines Werts zu seiner Ursprungszelle bei Zusammenführung | Ein zusammengeführter Knoten aus einer Datums- und einer Ortszeile hat zwei Ursprungszellen | `m3gim:xlsxSource` als Liste zulassen, wie im Beispiel 4 gezeigt; der Kontrakttest in `tests/test_20_xlsx_provenance.py` ist entsprechend zu erweitern |
| Die 21 Vorkommen von `auffuehrungsdatum` am Dokument gegen die 71 am Aufführungsknoten | Beide würden zu Ereignisknoten, und die Unterscheidung Annotation am Dokument gegen Datierung des Ereignisses selbst verschwände | Das Datum am Aufführungsknoten bleibt dort, wie in Abschnitt 2.1 begründet; nur die Vorkommen am Dokument wandern |
| `m3gim:spielzeitBis` | deklariert und unbefüllt, fällt beim Umbau stillschweigend weg | Ausdrücklich mitentscheiden, ob die Spanne zerlegt wird oder ein einziger Term sie trägt |

### 5.3 Woran die Migration prüfbar wäre

Die Umstellung ist wertweise prüfbar, weil sie in ihrer ersten Stufe verlustfrei ist. Vier Prüfungen tragen das.

1. **Wertmenge je Dokument.** Die Multimenge aller Datumswerte eines Dokuments ist vor und nach der Umstellung identisch. Das ist ein Vergleich über den alten und den neuen JSON-LD-Stand und deckt jeden verlorenen und jeden erfundenen Wert auf. Das vorhandene Werkzeug `tests/tools/snapshot_diff.py` ist der Ansatzpunkt.
2. **Paarmenge aus Wert und Rolle.** Für jedes Dokument ist die Multimenge der Paare aus Datumswert und Rollenwert vor und nach der Umstellung identisch, nachdem die Property-Namen der flachen Familie auf ihre Rollentoken abgebildet wurden. Diese Prüfung deckt zusätzlich jede Rollenverschiebung auf.
3. **Zellgenauer Rohdaten-Gegencheck.** Das bestehende Gate aus E-108 in `tests/test_34_rawdata_crosscheck.py` prüft jeden durchgereichten Wert über den Provenienzschlüssel gegen die XLSX-Ursprungszelle. Es greift nach der Umstellung unverändert, sobald `m3gim:xlsxSource` an den neuen Knoten hängt, und ist damit die stärkste einzelne Absicherung.
4. **Vokabular-Abdeckung.** `vocab/check-coverage.py` und das Gate `tests/test_40_vocab_gate.py` fallen auf jeden Term, der im Datensatz auftaucht und im Vokabular fehlt. Der Test `tests/test_18_typed_dates.py` ist auf die neue Gestalt umzuschreiben, `tests/test_30_quality_and_dated_events.py` entsprechend.

Der zweite Punkt ist der eigentliche Akzeptanztest des Entwurfs. Läuft er grün, ist belegt, dass die Umstellung keine Angabe hinzufügt und keine entfernt, und die fachlichen Zusammenführungen aus Abschnitt 3.3 lassen sich danach einzeln und je mit eigenem Nachweis ausführen.

## 6. Wo die Projektleitung entscheiden muss

Die folgenden Punkte sind fachlich und können aus dem Datenbestand nicht beantwortet werden.

- **Ob die Umstellung überhaupt jetzt erfolgt.** Sie berührt Vokabular, Pipeline, Tests, Frontend und den erzeugten Datensatz zugleich. Der Alternativweg ist die Option C der Umbenennungskarte, die vier Properties erhält und den langen Rand abräumt. Sie ist der kleinere Eingriff und lässt die Fallunterscheidung im Kern bestehen.
- **Ob `auftritt` und `aufführung` zusammenfallen.** Die `skos:editorialNote` am Vokabular sagt, dass ihnen keine inhaltliche Unterscheidung zugrunde liegt. Die Entscheidung betrifft 25 gegen 138 Datumswerte sowie Rollen an Werk-, Personen- und Institutionsreferenzen.
- **Ob `erstelldatum`, `entstehungsort` und `entstehung` zusammenfallen.** Die drei Bauformen bezeichnen im Bestand denselben Sachverhalt und schließen einander aus. Zu entscheiden ist zugleich, ob das Ergebnis auf den RiC-O-Term `rico:creationDate` geführt wird, wie es die Umbenennungskarte für `erstelldatum` vorschlägt.
- **Ob eine Datums- und eine Ortszeile derselben Rolle zu einem Knoten zusammengeführt werden.** Die Zusammenführung macht die Mobilitätsauswertung erst vollständig, weil sie Ort und Zeit desselben Vorgangs verbindet. Sie behauptet aber eine Zusammengehörigkeit, die die Erfassung nicht ausdrücklich erfasst hat. Alternativ bleibt sie als Ableitung im Frontend, ohne in die Daten zu wandern.
- **Wie der vereinheitlichte Ereignisknoten heißt.** `m3gim:SpatiotemporalEvent` behauptet für den ortslosen Fall zu viel, und `m3gim:DatedEvent` für den datumslosen. Ein neutraler Name ist zu wählen, und die Wahl ist in die Umbenennungskarte einzutragen.
- **Ob `generalprobe` eine eigene Rolle bleibt.** Die Alternative ist `probe` zusammen mit dem deklarierten und nie befüllten `m3gim:probenTyp`. Der Bestand mit drei Vorkommen entscheidet die Frage nicht.
- **Ob der Vertragsstatus jetzt umgesetzt wird.** `nicht eingehalten` belegt heute sieben Rollenstellen in vier verschiedenen Properties. `m3gim:contractStatus` und `m3gim:realized` sind seit E-99 deklariert und nullmal befüllt. Die Umstellung ist ein guter Zeitpunkt, den Wert aus dem Rollenvokabular zu nehmen, und sie setzt die mit dem Erschließungsteam offene Klärung voraus.
- **Ob die Rollenwerte als Literal oder als IRI stehen.** Das formale Vokabular hält fest, dass heute kein Concept des Rollenschemas über seine IRI referenziert wird. Ein einheitlicher Rollenknoten ist der Anlass, das zu ändern, und die Umbenennungskarte schlägt in ihrem Abschnitt 4 ohnehin eine Zerlegung des Schemas in mehrere Vokabulare vor.
