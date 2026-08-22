---
title: "Befund: Domänenwissen aus einer formalen Quelle"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: snapshot
language: de
version: 0.4
created: 2026-07-24
updated: 2026-08-22
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
topics: ["[[Knowledge Engineering]]", "[[Controlled Vocabularies]]", "[[RiC-O]]"]
related: [domain-ontology, data, architecture-decisions, data-errors]
---

# Befund: Domänenwissen aus einer formalen Quelle

Dieses Dokument berichtet über einen Versuch am Datensatz des Projekts. Die geprüfte These lautet, dass sich das Domänenwissen für eine agentische Wissensbasis dort, wo ein formales Vokabular vorliegt, aus dieser formalen Quelle ableiten lässt, statt es aus dem Fachexperten zu erheben.

Der Versuch bestand aus zwei Schritten. Zuerst wurde der bislang nur sprechend benannte Namespace `m3gim` empirisch erhoben und als Vokabulardatei [`vocab/m3gim.ttl`](../vocab/m3gim.ttl) formalisiert, mit Klassen, Properties, Domain, Range, Anschlüssen an RiC-O 1.1 und den beiden kontrollierten Vokabularen als SKOS-Schemata. Danach wurde aus dieser Datei das Domänendokument [domain-ontology.md](domain-ontology.md) abgeleitet und dabei protokolliert, was aus der formalen Quelle kam und was nicht. Pipeline, Daten und Frontend blieben unangetastet.

## 1. Was aus dem Vokabular ableitbar war

Der zweite Schritt verlief weitgehend mechanisch. Die Klassenübersicht mit Oberklassen und definierenden Aussagen, das Beziehungsdiagramm zwischen den Klassen, die Liste der typisierten Datumsproperties, der Aufbau der Finanzschicht, die Hierarchie der Dokumenttypen und die Gliederung des Rollenvokabulars nach Zieltypen stehen im Dokument so, wie sie in der Turtle-Datei stehen. Für diese Abschnitte war keine Rückfrage nötig und keine Quelle außer der Datei.

Innerhalb des Ableitbaren liegen zwei verschiedene Sorten Wissen übereinander.

**Getragen von den formalen Konstrukten.** `rdfs:subClassOf`, `rdfs:domain`, `rdfs:range` und `rdfs:subPropertyOf` beantworten die Fragen, welche Entitätstypen es gibt, was womit verbunden werden darf und welche Standardaussage eine projekteigene Aussage impliziert. `skos:broader` liefert die Aggregationsstufen der Dokumenttypen, `skos:member` die Zuordnung von Rollen zu Zieltypen. Diese Aussagen sind maschinell prüfbar und lassen sich ohne Interpretation in Prosa überführen.

**Mitgeführt als Annotation.** Alles, was ein Term bedeutet, wieso er so heißt und was an ihm ungeklärt ist, steht in `rdfs:comment` und `skos:editorialNote`. Das Vorrangverhältnis zwischen dem kuratierten Sitz einer Institution und der angereicherten Ortsangabe aus Wikidata ist ein Beispiel, ebenso die Begründung, warum das Fehlen eines Datums an einem Mobilitätsereignis eine Aussage ist. Beides ist Prosa in einem formalen Behälter. Der Gewinn liegt darin, dass die Prosa an dem Term steht, den sie erklärt, und dass beim Formalisieren jeder Term einmal eine Definition verlangt. Ein Ableitungsvorteil gegenüber gut gepflegter Dokumentation entsteht dadurch nicht.

## 2. Was das Vokabular nicht tragen konnte

Vier Sorten Wissen mussten aus der übrigen Wissensbasis und aus der Beobachtung des Datensatzes kommen.

**Gegenstand und Fragestellung.** Dass es um einen Teilnachlass an einem Universitätsarchiv geht, dass die leitende Frage Mobilität ist und dass die Daten den Erschließungsstand abbilden und keine Biographie rekonstruieren, steht in keinem Term. Abschnitt 1 von [domain-ontology.md](domain-ontology.md) ist vollständig aus [data.md](data.md) und [research-framework.md](research-framework.md) übernommen.

**Die Gestalt des Graphen.** Domain und Range sagen, dass ein Dokument einen beteiligten Akteur hat. Ob dieser Akteur einen eigenen Knoten besitzt oder eingebettet im Dokument steht, lassen sie offen. Im Datensatz gilt der zweite Fall, und er entscheidet darüber, wie eine Abfrage nach allen Dokumenten zu einer Person aussieht. Dieser Abschnitt entstand durch Auszählen der Typen auf der obersten Ebene des Graphen. Aus dem Vokabular allein war er nicht zu gewinnen.

**Negatives Wissen.** Dass `m3gim:qualityConfidence` bewusst leer bleibt, dass `wohnort` bewusst kein Mobilitätsereignis erzeugt und dass eine Dezimalkonfidenz bewusst entfernt wurde, sind Aussagen über Nichtvorhandenes. RDFS und OWL haben dafür keine Konstrukte, die hier trügen. Es blieb die Annotation, und deren Inhalt stammt aus [architecture-decisions.md](architecture-decisions.md).

**Verlässlichkeit einer Angabe.** Ob eine kuratierte Angabe der angereicherten vorgeht, ob eine Währung erfasst oder aus dem Kontext gesetzt wurde und ob ein Wert einer Erfassungskonvention folgt oder eine Kompensation der Pipeline ist, entscheidet über die Belastbarkeit jeder Auswertung. Das Vokabular kann es vermerken, ableiten kann es das nicht.

## 3. Der eigentliche Befund

Die These trägt für den zweiten Schritt und verschiebt den Aufwand in den ersten. Die Ableitung Vokabular zu Domänendokument war billig und verlustarm. Die Formalisierung selbst war die teure Operation, und sie brauchte dieselben Quellen, die man sonst befragt, nämlich den Datensatz, die Spezifikation, den Pipeline-Code und die Testsuite.

Der Gewinn liegt woanders als in der Ersparnis. Die Formalisierung erzwingt eine Vollständigkeit, die Prosa nicht erzwingt. Für jeden Term ist zu entscheiden, was seine Domain ist, was seine Range ist und ob eine Kante zum Standard trägt. Wo diese Entscheidung nicht möglich war, lag eine Unschärfe im Modell, die vorher niemandem aufgefallen war. Abschnitt 4 listet diese Fälle. Sie sind der Ertrag der Übung.

Ein zweiter Gewinn ist Prüfbarkeit. Der Abgleich des Vokabulars gegen den Datensatz lässt sich als Testlauf führen und beantwortet, ob jeder verwendete Term definiert und jeder Vokabularwert einem Concept zugeordnet ist. Bei prosaischer Dokumentation ist diese Frage nur durch Lesen zu beantworten.

## 4. Unschärfen, die die Formalisierung sichtbar gemacht hat

### Im eigenen Modell

**Kontextabhängige Angaben an global identifizierten Knoten.** Die Frage nach der Domain von `m3gim:role` führte auf den schwersten Fall. Die Rolle gilt im Kontext eines Dokuments, hängt aber am Entitätsknoten, und dieser Knoten trägt bei abgeglichenen Entitäten die Wikidata-Kennung. Beim Zusammenführen zur RDF-Ebene fällt der Baumkontext weg, und dieselbe Kennung sammelt alle Rollen aus allen Dokumenten ein. Eine Stadt trägt dann gleichzeitig Absendeort, Zielort, Wohnort und Vertragsort, eine Person gleichzeitig Verfasserin, Adressatin und Erwähnte. Dasselbe gilt für die Quellzellenadresse und für das Datenqualitäts-Flag. Solange der Datensatz als JSON-Baum gelesen wird, fällt das nicht auf.

**Selbstbezügliche Beziehungen.** Die Pipeline setzt die Nachlassbildnerin fest als Subjekt jeder AgRelOn-Beziehung. Ist sie zugleich die Adressatin oder Absenderin des Dokuments, entsteht eine Korrespondenzbeziehung von ihr zu sich selbst. In einem persönlichen Nachlass ist das der Regelfall und kein Sonderfall. Sichtbar wurde es beim Versuch, für `m3gim:agentRelation` eine Range anzugeben. Beispiel `UAKUG/NIM_011 7`.

**Eine Property, zwei gegenläufige Belegungen.** `m3gim:detailField` und `m3gim:detailValue` werden von zwei Zweigen der Pipeline vertauscht befüllt. Im Finanzzweig trägt `detailField` die Art des Postens und `detailValue` den Rohwert, im Zweig für den Verknüpfungstyp `detail` ist es umgekehrt. Der zweite Zweig führt im aktuellen Stand keine Daten, weshalb die Kollision folgenlos blieb. Sie wäre bemerkt worden, sobald er Daten führt.

**Ein Name, der eine andere Aussage macht als der Wert.** `m3gim:spielzeitVon` trägt den vollständigen Zeitraum in der Form `1952/1953`, obwohl der Name den Beginn bezeichnet. `m3gim:spielzeitBis` ist in Spezifikation und Testsuite geführt und wird nie befüllt, weil die Spielzeit nicht zerlegt wird.

**Zwei Repräsentationen derselben Sache.** Eine Partie steht als Literal `m3gim:partie` am Werk und zugleich als eigene Entität `m3gim:StageRole` im Graphen. Eine Verbindung zwischen beiden gibt es nicht, `m3gim:belongsToWork` ist spezifiziert und unbefüllt. Die Bühnenrollen sind zudem allein über ihren Namen dedupliziert, sodass gleichnamige Partien verschiedener Werke zusammenfallen.

**Ein gemischter Wertebereich.** `m3gim:eventRole` enthält neben Orts- und Ereignisrollen auch Datumsrollen wie `absendedatum` und `erscheinungsdatum`. Ursache ist die Vererbung der Rolle an beide Hälften des Komposits aus Ort und Datum. Am reinen Ortsknoten nimmt die Pipeline diese Vererbung zurück, am raumzeitlichen Ereignis nicht.

**Ein Vertragsstatus in der Rollenspalte.** Der Wert `nicht eingehalten` ist keine Rolle. Er wird beim Bau der raumzeitlichen Ereignisse gefiltert und läuft an drei anderen Stellen als Rollenwert mit, an Orten, an Werken und an Datumsangaben.

**Eine fachliche Kennung im technischen Container.** `m3gim:datenpunktId` sitzt im Container der Quellzellenadresse, trägt seit der Entscheidung zum Vorkommnis-Modell aber eine fachliche Bündelung.

**Ein Vokabular ohne Verwendung.** Der Namespace `m3gim-role` ist im JSON-LD-Kontext deklariert und wird von keiner einzigen Aussage benutzt. Alle Rollen stehen als Literale. Das Schema existierte bislang nur als Präfix-Zeile.

**Kennzahlen ohne Träger.** Die Angaben zum Export stehen am Wurzelknoten der Serialisierung, der keinen Typ trägt. Eine Domain lässt sich für sie nicht angeben, und adressierbar sind sie nicht.

### Zwischen Spezifikation und Datensatz

**Ein Term ohne Spezifikation.** `m3gim:gespraechsdatum` wird erzeugt und fehlt in der Aufzählung der typisierten Datumsproperties in [data.md](data.md) § 7. Nachgetragen am 2026-08-21.

**Ein Wertebereich, der anders aussieht als spezifiziert.** Für `m3gim:xlsxSheet` nennt [data.md](data.md) § 9 die beiden Werte `Objekte` und `Verknuepfungen`. Tatsächlich steht dort der Name des jeweiligen Box-Blatts, weil die Verknüpfungstabelle über mehrere Blätter verteilt ist. § 9 ist am 2026-08-21 auf den tatsächlichen Wertebereich nachgezogen.

**Ein Dokumenttyp ohne Weg in die Daten.** `fotografie` steht im Vokabularbaum in [data.md](data.md) § 12 und hat in der Zuordnungstabelle der Pipeline keinen Eintrag. Ein Quellwert dieses Namens liefe ins Leere.

**Eine Etikettendublette.** Das Concept `programm` trägt das Label Programmheft und ist zugleich der Oberbegriff des Concepts `programmheft`. In der Anzeige sind beide nicht unterscheidbar.

### Am Anschluss an RiC-O

**Der Term-Lock reicht nur bis zum Termnamen.** Der bestehende Konformitätstest `test_26` hält jeden externen Term gegen eine belegte Allowlist und nimmt den eigenen Namespace ausdrücklich aus. Geprüft wird die Existenz eines Terms. Ob der Wert zu dessen Range passt, bleibt ungeprüft. Der Abgleich gegen die offiziellen Komponentenlisten von RiC-O 1.1 zeigt drei Stellen, an denen eine Object Property eine Wertform erhält, die ihre Range ausschließt.

- `rico:hasOrHadLanguage` erwartet ein Individuum der Klasse `rico:Language` und bekommt eine Zeichenkette.
- `rico:hasExtent` erwartet `rico:Extent` und bekommt eine Zeichenkette.
- `rico:hasDocumentaryFormType` erwartet `rico:DocumentaryFormType` und bekommt ein Concept, das nur als `skos:Concept` typisiert ist.

**RiC-O trägt mehr, als das Projekt nutzt.** Die Rollen `verfasser`, `adressat`, `absender`, `empfänger` und `herausgeber` haben in RiC-O 1.1 eigene Object Properties, nämlich `rico:hasCreator`, `rico:hasAddressee`, `rico:hasSender`, `rico:hasReceiver` und `rico:hasPublisher`. Das Projekt führt sie als Literalwerte an einer Sammelproperty. Ebenso existiert `rico:Activity` als Unterklasse von `rico:Event` für zielgerichtetes Geschehen, also genau die Aufhängung, für die das Zielmodell `crm:E7_Activity` aus CIDOC-CRM vorsieht. Beide Punkte fielen erst auf, als für die eigenen Terme nach einer belegbaren Oberklasse und Superproperty gesucht wurde.

**Tragfähige Kanten gibt es reichlich.** Sechs Anschlüsse ließen sich gegen die offizielle Termliste belegen und setzen, nämlich `rico:isAssociatedWithEvent` für die drei Ereignisverweise, `rico:hasOrHadLocation` für die Verortung, `rico:hasOrHadParticipant` für die Mitwirkung und `rico:date` samt `rico:beginningDate` und `rico:creationDate` für die Datumsfamilie. Damit erreicht eine Abfrage auf der RiC-O-Ebene die projekteigenen Aussagen mit.

## 5. Datenbefunde, gemeldet und nicht behoben

Diese Punkte fielen beim Erheben der Wertebereiche auf.

Nachtrag 2026-08-21: alle vier sind inzwischen ins [Datenfehler-Register](data-errors.md) übernommen, die ersten beiden als Quellfehler QF-18 und QF-19, das Gründungsdatum als Abgleichfehler AF-04, die selbstbezüglichen Beziehungen als Pipeline-Befund mit Datenwirkung unter den verwandten Befunden. Zweiter Nachtrag desselben Tages, die Projektleitung hat die beiden Pipeline-Befunde entschieden, die Selbstbezüge als E-129 und die Wertform der angereicherten Zeitwerte als E-132, dort auch der über die Gründungsdaten hinausgehende Umfang. Kanonische Adresse ist [architecture-decisions.md](architecture-decisions.md); die beiden Quellfehler bleiben beim Erschließungsteam. Ebenso entschieden sind die beiden Abweichungen aus Abschnitt 4 zwischen Spezifikation und Datensatz, der Dokumenttyp `fotografie` als E-130 und die Etikettendublette am Ast `programm` als E-131.

- `UAKUG/NIM_011 7` trägt als Erstelldatum `1055-08-24`, während das Dokumentdatum `1955-08-24` lautet. Vermutlich eine vertippte Jahrhundertstelle in der Verknüpfungszeile.
- Dasselbe Dokument trägt an einer Ausgabe von 15,00 DM die Detailrolle `interpret`. Eine Personenrolle in der Finanzspalte.
- `m3gim:inception` führt Werte in der Form `1715-00-00`, wenn Wikidata nur ein Jahr kennt. Kein gültiges ISO-Datum.
- Die selbstbezüglichen Korrespondenzbeziehungen aus Abschnitt 4 sind ein Pipeline-Befund mit Datenwirkung und gehören in dieselbe Klärung.

## 6. Offene Fragen an die Projektleitung

1. Sollen die Rollenwerte auf Concept-Kennungen aus `m3gim-role` umgestellt werden oder Literale bleiben? Ohne Kennungen bleibt das Schema ohne Wirkung.
2. Wie wird die Rolle an das Dokument gebunden, in dem sie gilt? Ohne diese Bindung ist der Datensatz als RDF nicht widerspruchsfrei lesbar. Die Entscheidung zum Vorkommnis-Modell adressiert das teilweise und ist noch nicht umgesetzt.
3. Werden die archivalischen Rollen auf die RiC-O-Properties abgebildet, oder bleibt die Sammelproperty mit Rollenliteral?
4. Wie wird ein nicht erfüllter Vertrag modelliert? Das Feld ist spezifiziert und unbefüllt, der Wert läuft weiter durch die Rollenspalte.
5. Welches der beiden Wertesysteme für den Bearbeitungsstand gilt?
6. Wird die Spielzeit in Beginn und Ende zerlegt, oder wird `spielzeitVon` umbenannt?
7. Welche Lesart von `detailField` und `detailValue` gilt, bevor der zweite Zweig Daten führt?
8. Erhalten die Dokumenttyp-Concepts zusätzlich den Typ `rico:DocumentaryFormType`, und werden Sprache und Umfang auf die von RiC-O erwarteten Wertformen gebracht?
9. Wird die Partie am Werk mit der Bühnenrollen-Entität verbunden, und bekommt die Bühnenrolle eine Werkbindung?
10. ~~Wird die Vokabulardatei ein gepflegtes Artefakt des Projekts?~~ Beantwortet am 2026-08-21. Die Datei ist ein gepflegtes Artefakt und steht in der Spec-Hierarchie, die Reihenfolge lautet [data.md](data.md), Vokabular, Test, Pipeline. Kanonische Adresse ist E-133 in [architecture-decisions.md](architecture-decisions.md), die Betriebssicht steht in [`../CLAUDE.md`](../CLAUDE.md) § Spec-Hierarchie.

## 7. Empfehlung zur Absicherung

Der Konformitätstest `test_26` nimmt den eigenen Namespace aus, weil es bislang keine Quelle gab, gegen die er hätte prüfen können. Mit der Vokabulardatei gibt es sie. Der Prüflauf liegt als [`vocab/check-coverage.py`](../vocab/check-coverage.py) im Repository und hält, dass jeder im Datensatz verwendete `m3gim`-Term im Vokabular definiert ist, dass jeder Dokumenttyp ein Concept hat, dass jedes Rollenliteral auf ein Concept trifft und dass alle Verweise innerhalb der Schemata auflösen. Er läuft read-only, meldet Abweichungen zeilenweise und endet mit einem Exit-Code, sodass er sich ohne Umbau in die Testsuite ziehen lässt. Nachtrag 2026-08-21, die Projektleitung hat ihn als verbindliches Test-Gate gesetzt, es läuft über `tests/test_40_vocab_gate.py` im Standardlauf mit, die Namenskonvention des Vokabulars sichert `tests/test_41_naming_convention.py` (E-133).

## 8. Related

- [domain-ontology.md](domain-ontology.md) — das abgeleitete Domänendokument
- [`vocab/m3gim.ttl`](../vocab/m3gim.ttl) — die formale Quelle
- [data.md](data.md) — Spezifikation des Modells
- [architecture-decisions.md](architecture-decisions.md) — Leitplanken und offene Modellentscheidungen
- [data-errors.md](data-errors.md) — Register der Quell- und Abgleichfehler
