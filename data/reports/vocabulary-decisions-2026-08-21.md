---
title: "Entscheidungsvorlage: Vier offene Fragen der Vokabular- und Datenmodellierung"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: snapshot
created: 2026-08-21
updated: 2026-08-21
language: de
version: 0.1
authors: [Christopher Pollin]
generated-with: Claude Code
related: [data, data-errors, vocabulary-derivation-findings, domain-ontology, architecture-decisions]
---

# Entscheidungsvorlage: Vier offene Fragen der Vokabular- und Datenmodellierung

Vier Befunde aus der Vokabular-Formalisierung stehen als offene Punkte in [data-errors.md](../../knowledge/data-errors.md) und [vocabulary-derivation-findings.md](../../knowledge/vocabulary-derivation-findings.md), ohne dass Code sie anfassen durfte. Dieses Dokument bereitet die vier Entscheidungen vor. Jede Frage trägt den Befund am Stand des Exports vom 2026-08-21, belegte Beispiele aus dem erzeugten Datensatz und der Erfassungstabelle, den Stand der einschlägigen Standards mit Quelle und Abrufdatum, umsetzbare Optionen samt Auswirkung und Rückholbarkeit sowie eine begründete Empfehlung. Die Entscheidung bleibt beim Operator. Als Momentaufnahme führt das Dokument Zählstände; sie gelten für `data/output/m3gim.jsonld` in der am 2026-08-21 vorliegenden Fassung.

## 1. Selbstbezügliche Korrespondenzbeziehungen

### Befund

`_maybe_add_agrelon` in `scripts/transform.py` setzt die Konstante `MALANIUK_SUBJECT` fest als `agrelon:hasSubject` jeder erzeugten Beziehung und das Gegenüber aus der Verknüpfungszeile als `agrelon:hasObject`. Trägt die Verknüpfungszeile selbst die Nachlassbildnerin, sind beide Seiten identisch, mit derselben Wikidata-Kennung `wd:Q94208`.

Der Export führt 54 Einträge in `m3gim:agentRelation`. 33 davon sind selbstbezüglich, 27 als `agrelon:HasCorrespondent` und 6 als `agrelon:IsHasPatron`. Auslöser sind drei Rollen der Quelltabelle, `adressat` mit 22 Fällen, `auftraggeber` mit 6 und `empfänger` mit 5.

Der eigentliche Korrespondenzpartner geht dabei verloren. Zählt man die Rollen `verfasser`, `unterzeichner`, `absender` und `empfänger` als Gegenrolle, so tragen 27 der 33 Selbstbezüge einen weiteren Personenknoten in einer solchen Rolle, überwiegend `verfasser` mit 19 und `unterzeichner` mit 9 Nennungen. Dreimal steht dort nur eine Institution, dreimal fehlt eine Gegenrolle ganz. Keine dieser Rollen steht in `AGRELON_MAPPING`, sie erzeugt also keine Beziehung.

Wirkung auf die im Interface sichtbare Partnerliste. Malaniuk ist mit 33 Nennungen das mit weitem Abstand häufigste Beziehungsziel, der zweite Rang liegt bei 4 Nennungen. `resolveAgentRelationsToPersons` in `docs/js/data/loader.js` löst das Beziehungsziel gegen den Personenindex auf und hängt den Eintrag an `personEntry.relations`; bei Selbstbezug landet er am eigenen Personeneintrag. Zwei Anzeigen lesen dieses Feld. Die Beziehungsbadges im Personenraster (`docs/js/views/indexes.js`) zeigen Malaniuk als ihre eigene Beziehungspartnerin. Im Netzwerk-Tab entscheidet `entry.relations.length > 0` über die Knotenstärke und über den Filter `onlyAgRelOn` (`docs/js/views/network.js`, `docs/js/views/_network-geometry.js`), wodurch der Knoten der Nachlassbildnerin allein durch Selbstbezüge als stark markiert wird. Zwei weitere Anzeigen greifen unmittelbar auf `store.agentRelations` zu, der Wissenskorb (`docs/js/views/basket.js`) und das Record-Detail. Dort unterdrückt `archive-inline-detail.js` Agents, die bereits über eine AgRelOn-Beziehung sichtbar sind, aus ihrem Ursprungs-Bucket; die Adressatin verschwindet dadurch aus der Personenliste des Records und erscheint stattdessen als Chip mit dem Präfix Korrespondenz und ihrem eigenen Namen, während der tatsächliche Verfasser ohne Beziehungsanzeige in der Personenliste stehen bleibt.

### Datenbeispiele

**UAKUG/NIM_011 7**, Rechnung über 150 Künstlerkarten 1952/53. Der Auszug aus `data/output/m3gim.jsonld`:

```json
"m3gim:agentRelation": [{
  "@type": "agrelon:HasCorrespondent",
  "agrelon:hasSubject": { "name": "Malaniuk, Ira", "@id": "wd:Q94208" },
  "agrelon:hasObject":  { "name": "Malaniuk, Ira", "@id": "wd:Q94208" },
  "agrelon:metadataProvenance": { "@id": "m3gim:NIM_011_7" },
  "m3gim:xlsxSource": { "m3gim:xlsxSheet": "Box_01", "m3gim:xlsxRow": 1556 }
}]
```

Die Quelle trägt die Dyade vollständig. `data/google-spreadsheet/M3GIM-Verknüpfungen.xlsx`, Blatt `Box_01`, Zeile 1555 führt `UAKUG/NIM_11 | 7 | person | Barth, Herbert | verfasser:in`, Zeile 1556 führt `UAKUG/NIM_11 | 7 | person | Malaniuk, Ira | adressat:in`. Der Verfasser steht im Export als `m3gim:hasAssociatedAgent` mit `role: "verfasser"` und ohne AgRelOn-Beziehung.

**UAKUG/NIM_004 1**, Kopie eines Briefumschlags adressiert an Malaniuk. Gleiche Konstellation mit einer Institution auf der Gegenseite. Blatt `Box_01`, Zeile 37 führt `person | Malaniuk, Ira | adressat:in`, Zeile 41 führt `institution | National Artists Corporation | verfasser:in`. Erzeugt wird eine `HasCorrespondent`-Beziehung von Malaniuk zu sich selbst.

**UAKUG/NIM_007 5_2**, Kassa-Eingang der Konzertdirektion. Hier greift die Rolle `auftraggeber`. Blatt `Box_01`, Zeile 1433 führt `person | Malaniuk, Ira | auftraggeber:in`, Zeile 1434 `person | Altmann, Olga | unterzeichner:in`. Erzeugt wird `agrelon:IsHasPatron` von Malaniuk zu sich selbst. In diesem Fall existiert im Beleg gar keine Mäzenatenbeziehung; die Nachlassbildnerin hat eine Leistung beauftragt.

### Fachlicher Stand

AgRelOn verbietet den Selbstbezug nicht. Die Vokabulardatei deklariert `agrelon:hasCorrespondent` als `rdf:Property, owl:SymmetricProperty` mit dem Kommentar „A person or corporation (subject) exchanges letters with a person or corporation (object)." In der gesamten Datei stehen 22 Deklarationen als `owl:SymmetricProperty` und keine einzige als `owl:IrreflexiveProperty` oder `owl:AsymmetricProperty`. Formal ist die Aussage also zulässig, inhaltlich sagt sie aus, dass die Nachlassbildnerin mit sich selbst Briefe wechselt.

Zwei weitere Punkte derselben Codestelle fallen bei der Prüfung an. AgRelOn trennt die Rollenproperties nach Symmetrie. `agrelon:hasSubject` und `agrelon:hasObject` sind laut ihren Kommentaren für die Subjekt- und Objektrolle „of the asymmetric relationship meant by the n-ary concept" bestimmt, für symmetrische Relationen ist `agrelon:hasSubjectObject` vorgesehen. Da `hasCorrespondent` symmetrisch ist, verwendet die Pipeline für den Korrespondenzfall das Paar, das für asymmetrische Relationen gedacht ist. Zweitens ist `agrelon:IsHasPatron` laut Kommentar „the n-ary concept for the properties hasPatron / isPatronOf". Der Kommentar zu `hasSubject` sagt, für inverse Relationen folgten Subjekt- und Objektrolle der Benennung der n-ären Klasse, gelesen „quasi just the first part of the n-ary concept name". Nach dieser Lesart, die eine Inferenz aus dem Kommentartext ist und keine ausdrückliche Regel, wäre `hasSubject` bei `IsHasPatron` die `isPatronOf`-Seite, also der Mäzen. Die Pipeline setzt dort die Nachlassbildnerin ein.

RiC-O 1.1 beantwortet die Frage für den Korrespondenzfall ausdrücklich. Die Klasse `rico:CorrespondenceRelation` trägt den Kommentar „Connects at least two Persons, when they correspond or corresponded to each other. This Relation is not oriented." und eine Restriktion `owl:minQualifiedCardinality 2` auf `rico:relationConnects` mit `owl:onClass rico:Person`. Die Oberklasse `rico:AgentToAgentRelation` trägt dieselbe Restriktion mit `onClass rico:Agent`. Eine Relation, die nur eine Person verbindet, erfüllt diese Kardinalität nicht. Auch RiC-O 1.1 deklariert keine einzige `owl:IrreflexiveProperty`; die normative Kraft liegt hier in der Kardinalität und im Klassenkommentar.

Die Projektpraxis der Korrespondenzerschließung hält an der Zweistelligkeit fest, auch wenn eine Seite unbekannt ist. Das Correspondence Metadata Interchange Format führt `persName` innerhalb von `correspAction` als „Mandatory" und schreibt vor, bei unbekanntem Absender oder Empfänger die Zeichenkette „Unknown" einzutragen. Das Handbuch der ediarum-Umgebung der Berlin-Brandenburgischen Akademie der Wissenschaften verlangt getrennte `correspAction`-Elemente mit `type="sent"` und `type="received"`. Die Dyade wird strukturell erhalten und im Zweifel mit einem Platzhalter besetzt.

### Optionen

**A. Selbstbezüge unterdrücken.** `_maybe_add_agrelon` bricht ab, wenn die Kennung des Agents mit der des Nachlass-Subjekts übereinstimmt. Im Datensatz entfallen damit 33 von 54 Beziehungen, 21 bleiben. Information geht dabei nicht verloren, weil die Rolle der Nachlassbildnerin am selben Record weiterhin als `m3gim:hasAssociatedAgent` mit `role: "adressat"` samt Quellzeile steht. Im Interface verschwindet Malaniuk aus der Partnerliste, aus den Beziehungsbadges und aus der AgRelOn-Markierung des Netzwerkknotens; im Record-Detail kehrt sie in den Personen-Bucket zurück, weil die Unterdrückung dort an das Vorhandensein einer Beziehung gekoppelt ist. Der Aufwand liegt bei einer Bedingung plus Testanpassung. Die Änderung ist vollständig rückholbar, die Beziehung jederzeit wieder erzeugbar.

**B. Beziehungen auf die tatsächliche Gegenseite umhängen.** Für Korrespondenz-Records wird die Gegenpartei aus der Rollenverteilung des Records bestimmt, `verfasser`, `unterzeichner` oder `absender` gegen `adressat` oder `empfänger`, und als `hasObject` gesetzt. Im Datensatz werden 27 der 33 Fälle zu Dyaden zwischen zwei Personen, drei weitere ließen sich nur gegen eine Institution paaren, drei bleiben ohne Gegenüber und fallen unter A. Die Zahl der Beziehungen steigt gegenüber A, und das Netzwerk gewinnt Kanten, die heute fehlen. Im Interface bildet die Partnerliste erstmals die realen Korrespondenzpartner ab. Der Aufwand ist mittel bis hoch, weil eine Paarungsregel gebraucht wird und mehrdeutige Fälle zu entscheiden sind; UAKUG/NIM_004 27 trägt neben einem Unterzeichner auch einen Vermittler, UAKUG/NIM_004 1 hat eine Institution als Verfasserin, was `agrelon:hasCorrespondent` zulässt und `rico:CorrespondenceRelation` mit ihrer Person-Restriktion ausschließt. Die Rückholbarkeit ist gut, weil die Quellzeilen unverändert bleiben und die Ableitung wiederholbar ist.

**C. Selbstbezug stehen lassen und erst im Interface filtern.** Der Datensatz bleibt unverändert. Im Interface wird die Partnerliste korrekt, sobald die Filterregel überall greift, wo Beziehungen gelesen werden, gegenwärtig an vier Stellen. Der Aufwand ist im Einzelfall gering und dauerhaft, weil jede neue Auswertung die Regel erneut anwenden muss. Rückholbar ist der Zustand vollständig. Das exportierte JSON-LD bleibt gegenüber der RiC-O-Kardinalität fehlerhaft und wird für Nachnutzende außerhalb dieses Frontends falsch.

### Empfehlung

Option A umsetzen und Option B als eigenen, später terminierten Arbeitsschritt darauf aufsetzen. A entfernt eine Aussage, die nach RiC-O die Kardinalität ihrer Klasse verletzt und nach AgRelOn semantisch leer ist, ohne eine einzige Information zu verlieren, weil die Rollenzuordnung am Record erhalten bleibt. B fügt Information hinzu, die heute fehlt, und verlangt eine Paarungsregel samt Entscheidung über Institutionen als Korrespondenzpartner; das ist eine eigene fachliche Festlegung und sollte die Bereinigung nicht aufhalten. Option C ist abzulehnen, weil sie den Fehler im publizierten Datensatz belässt und die Korrektur an jede künftige Auswertung delegiert.

### Ansatzpunkt

Option A setzt in `scripts/transform.py` in der Funktion `_maybe_add_agrelon` an, als Frühausstieg nach dem Nachschlagen von `AGRELON_MAPPING` und vor dem Aufbau von `rel_entry`, mit einem Vergleich gegen `MALANIUK_SUBJECT["@id"]` und Namensvergleich als Rückfallebene, weil 14 der 54 Objekte keine Wikidata-Kennung tragen. Betroffen sind die Tests in `tests/test_12_agrelon.py`, dort `test_correspondence_relations_have_provenance` und `test_has_employer_relations_from_arbeitgeber`.

Option B setzt in derselben Funktion an, dazu in den Aufrufstellen innerhalb von `add_relations_to_records`, weil die Paarung den ganzen Record braucht, über die einzelne Verknüpfungszeile hinaus. Die Rollenlisten stehen in `AGRELON_MAPPING`.

Option C setzt in `docs/js/data/loader.js` an, in den Funktionen `indexAgentRelations` und `resolveAgentRelationsToPersons`, sowie bei den vier Lesern in `docs/js/views/indexes.js`, `docs/js/views/network.js`, `docs/js/views/archive-inline-detail.js` und `docs/js/views/basket.js`.

## 2. Dokumenttyp Fotografie ohne Mapping-Eintrag

### Befund

`m3gim-dft:fotografie` ist im Vokabular angelegt, mit `skos:prefLabel "Fotografie"@de` und `skos:broader m3gim-dft:dokument`, und steht im Vokabularbaum in [data.md](../../knowledge/data.md) § 12. In der Zuordnungstabelle `DOKUMENTTYP_TO_DFT` in `scripts/transform.py` fehlt der Eintrag. Die Zuweisung in `transform.py` setzt `rico:hasDocumentaryFormType` nur, wenn das Nachschlagen trifft; ein unbekannter Quellwert fällt still durch, der Record bleibt ohne Dokumenttyp und verschwindet damit aus jeder typbasierten Auswertung.

Im aktuellen Export tritt der Fall nicht ein. Die Objekttabelle führt 22 verschiedene Werte in der Spalte `dokumenttyp`, von `programm` mit 234 Vorkommen bis zu `tontraeger` mit einem; `fotografie` ist nicht darunter. Der Befund beschreibt eine latente Lücke. Wirksam wird sie, sobald ein Record den Wert trägt.

Die Erfassungsrichtlinie schreibt den Wert allerdings vor. [data-entry-guidelines.md](../../knowledge/data-entry-guidelines.md) führt Fotografie in der Tabelle der Titelmuster als eigenen Dokumenttyp mit dem Muster `[Beschreibung], [Anlass oder Rolle wenn erkennbar]` und dem Beispiel `Bühnenszene Orpheus, Bayerische Staatsoper 1953`. Das Rollenvokabular enthält passend dazu `m3gim-role:abgebildet` mit der Definition „Person, die auf einer Fotografie oder einem Plakat abgebildet ist." Das Erschließungsteam ist also angewiesen, Fotografien als solche zu erfassen, sobald sie an die Reihe kommen.

### Datenbeispiele

Ein positiver Beleg lässt sich nicht führen, weil der Fall im Datensatz nicht vorkommt; das ist der Befund. Belegbar ist die Umgebung.

Die Vokabulardefinition in `vocab/m3gim.ttl` trägt die Lücke bereits als Notiz:

```turtle
m3gim-dft:fotografie a skos:Concept ; skos:prefLabel "Fotografie"@de ;
  skos:broader m3gim-dft:dokument ; skos:inScheme m3gim-dft:scheme ;
  skos:editorialNote "In knowledge/data.md § 12 geführt, in der Zuordnungstabelle
  der Pipeline aber nicht angelegt. Ein Quellwert Fotografie liefe deshalb ins Leere."@de .
```

Der Export enthält 22 `skos:Concept`-Knoten, weil `build_dft_concepts` nur belegte Konzepte samt ihren transitiven Oberbegriffen emittiert. `m3gim-dft:fotografie` ist nicht darunter.

Die Rolle `abgebildet` kommt im Export achtmal vor, verteilt auf zwei Records. UAKUG/NIM_073 33_1_3 mit dem Titel „Bayreuther Tagblatt Festspiel Nachrichten mit Foto" trägt `m3gim-dft:presse`, UAKUG/NIM_139 109_6 trägt `m3gim-dft:programm`. Abgebildete Personen werden also bereits erfasst, jedoch bislang nur an Dokumenten anderer Gattung.

### Fachlicher Stand

RiC-O 1.1 definiert `rico:hasDocumentaryFormType` mit Domain `Record` oder `RecordPart` und Range `rico:DocumentaryFormType`, beschrieben als „Categorization of a Record or Record Part with respect to its extrinsic and intrinsic elements". Welche Konzepte ein Projekt in seinem Typvokabular führt, überlässt der Standard dem Projekt; eine Aussage über die Vollständigkeit von Zuordnungstabellen zwischen Quellwerten und Konzepten trifft er nicht.

Die SKOS-Qualitätskriterien greifen ebenfalls nicht. Die von qSKOS benannten Klassen betreffen Orphan Concepts, also Konzepte ohne assoziative oder hierarchische Relation, Disconnected Concept Clusters und Undocumented Concepts. `m3gim-dft:fotografie` ist über `skos:broader` angebunden und mit `skos:editorialNote` dokumentiert und fällt unter keine davon. Die Lücke liegt in der Projektinfrastruktur zwischen Quellwert und Konzept, für die es kein einschlägiges Normwerk gibt. Die Frage ist damit eine reine Projektentscheidung.

Innerhalb des Projekts existiert bereits ein Wächter. `tests/test_15_vocab_coverage.py::test_every_xlsx_dokumenttyp_is_mapped` prüft jeden belegten `dokumenttyp` gegen `DOKUMENTTYP_TO_DFT` und schlägt fehl, sobald ein unbekannter Wert in der Tabelle auftaucht. Der stille Datenverlust wird also bemerkt, allerdings erst als roter Testlauf während der laufenden Erschließung.

### Optionen

**A. Eintrag nachtragen.** `"fotografie": "m3gim-dft:fotografie"` in `DOKUMENTTYP_TO_DFT`. Am Datensatz ändert sich heute nichts, weil kein Quellwert existiert. Das Interface bleibt ebenso unberührt; sobald Fotografien erfasst werden, erscheint der Typ in der Typfacette und in den Chips, mit dem Label aus `DFT_LABELS`, das dafür ebenfalls anzulegen ist. Der Aufwand liegt bei zwei Zeilen, die Änderung ist vollständig rückholbar.

**B. Konzept aus dem Vokabular entfernen.** Am Datensatz ändert sich nichts, das Konzept wird ohnehin nicht emittiert. Das Vokabular verliert einen Term, den die Erfassungsrichtlinie den Bearbeitenden vorschreibt; die Richtlinie wäre mitzuändern, sonst entsteht ein Widerspruch zwischen zwei Dokumenten der Wissensbasis. Der Aufwand ist gering, mit Folgeaufwand in der Richtlinie und in `data.md` § 12. Die Rückholbarkeit ist gut, allerdings wäre die inhaltliche Frage, ob der Bestand Fotografien enthält, damit verneint, was dem Bestandsprofil in [domain-ontology.md](../../knowledge/domain-ontology.md) widerspricht; dort sind Fotografien ausdrücklich als Teil des Hauptbestands genannt.

**C. Nichts ändern und auf den Test vertrauen.** Datensatz und Interface bleiben unverändert. Der Fall wird beim ersten erfassten Foto zu einem roten Testlauf, der die Suite blockiert, bis jemand die Zuordnung nachträgt. Der Aufwand ist jetzt null und fällt später klein an, zu einem ungünstigen Zeitpunkt. Rückholbar ist der Zustand trivial.

### Empfehlung

Option A. Das Vokabular führt den Term, die Erfassungsrichtlinie schreibt ihn vor, das Bestandsprofil nennt Fotografien als Bestandteil des Hauptbestands, und allein die Zuordnungstabelle fehlt. Der Nachtrag ist heute folgenlos für Datensatz und Interface und verhindert einen roten Lauf mitten in der Erschließung. Option B verlangt zusätzlich eine inhaltliche Aussage über den Bestand, für die es keinen Anlass gibt.

Unabhängig von der Entscheidung bleibt eine zweite Schwachstelle bestehen. Ein unbekannter `dokumenttyp` verschwindet in `transform.py` ohne Meldung. Eine Warnung an dieser Stelle würde die Klasse solcher Fälle sichtbar machen, statt sie einzeln über Tests zu entdecken. Das ist eine eigene Änderung und Gegenstand einer eigenen Entscheidung.

### Ansatzpunkt

Option A setzt in `scripts/transform.py` in der Tabelle `DOKUMENTTYP_TO_DFT` bei den flachen Typen an, dazu mit einem Eintrag `"fotografie": "Fotografie"` in `DFT_LABELS`. In `DFT_BROADER` ist kein Eintrag nötig, weil Konzepte ohne Eintrag dort als Unterbegriff von `dokument` gelten. Betroffen ist der Test `tests/test_31_dft_vocab.py`.

Option B setzt in `vocab/m3gim.ttl` an der Konzeptzeile im dft-Schema an, dazu in `knowledge/data.md` § 12 und in der Titelmustertabelle in `knowledge/data-entry-guidelines.md`.

Die Warnung bei unbekanntem Typ setzt in `scripts/transform.py` an, bei der Zuweisung von `rico:hasDocumentaryFormType` im Aufbau des Record-Knotens.

## 3. Label-Dublette zwischen Programm und Programmheft

### Befund

`DFT_LABELS` in `scripts/transform.py` weist `programm` und `programmheft` dasselbe Anzeigelabel Programmheft zu, während `DFT_BROADER` `programmheft` als Unterbegriff von `programm` führt. Ober- und Unterbegriff sind in der Anzeige nicht unterscheidbar.

Der Export macht die Dublette heute nicht sichtbar, weil nur einer der beiden Terme belegt ist. 234 Records tragen `m3gim-dft:programm`, das ist der häufigste Dokumenttyp des Bestands; `m3gim-dft:programmheft` trägt kein einziger Record. `build_dft_concepts` emittiert nur belegte Konzepte samt transitiven Oberbegriffen, der Unterbegriff erscheint also gar nicht im Datensatz. Sichtbar ist stattdessen, dass 234 Records des Oberbegriffs im Interface als Programmheft ausgewiesen werden.

Das Frontend trägt seit E-101 keine eigene Labeltabelle mehr. `docs/js/utils/format.js` löst über `dftLabel(store, shortId)` gegen `store.dftHierarchy` auf, das der Loader aus den `skos:prefLabel`-Werten der exportierten Konzepte füllt. Eine Änderung in `DFT_LABELS` schlägt ohne Frontend-Eingriff bis in die Chips und in die Typfacette durch. Die Baseline-Fixture `tests/fixtures/baseline_counts.json` prüft Zählstände und keine Labels.

### Datenbeispiele

Der Konzeptknoten im Export, aus `data/output/m3gim.jsonld`:

```json
{ "@id": "m3gim-dft:programm", "@type": "skos:Concept", "skos:prefLabel": "Programmheft" }
```

Der Knoten trägt kein `skos:broader`, ist also im exportierten Schema oberster Begriff seines Astes und heißt dort Programmheft.

**UAKUG/NIM_142 19_5** mit dem Titel „Programmheft Theatre royal de la Monnaie, Programmzettel" trägt `m3gim-dft:programm`. Der Titel benennt beide Gattungen nebeneinander, was zeigt, dass der Bestand die Unterscheidung kennt und die Erschließung sie im Titel und nicht im Typ ablegt.

Sieben der 234 Records mit `m3gim-dft:programm` führen im Titel ausdrücklich eine andere Gattung als Programmheft, darunter **UAKUG/NIM_078** „Programmzettel des Opernhauses Lemberg (Lwiw)", **UAKUG/NIM_007 8** „Konzertprogramm, Liederabend, Palais Pallavicini, 1963-08-28" und **UAKUG/NIM_072** „Konzertprogramme Vintia [???]". Für diese Records ist das angezeigte Label sachlich falsch.

Die Quelltabelle bestätigt die Verteilung. In `data/google-spreadsheet/M3GIM-Objekte.xlsx` steht der Wert `programm` 234-mal in der Spalte `dokumenttyp`, die Werte `programmheft` und `konzertprogramm`, die beide in `DOKUMENTTYP_TO_DFT` stehen, kommen nicht vor.

### Fachlicher Stand

Der SKOS Primer spricht die Frage in zwei Abschnitten an. Abschnitt 2.2.1 empfiehlt, „that no two concepts in the same KOS be given the same preferred lexical label for any given language tag", Abschnitt 2.5 wiederholt das für Concept Schemes mit der Formulierung „that no two concepts have the same preferred lexical label in a given language when they belong to the same concept scheme". Beides ist eine Empfehlung; die formale Disjunktheit erzwingt SKOS nur zwischen `prefLabel`, `altLabel` und `hiddenLabel` desselben Konzepts.

qSKOS führt den Fall als eigene Prüfkategorie unter dem Namen Overlapping Labels, gestützt auf ebendiese Primer-Empfehlung, mit dem Hinweis, das Muster deute auf fehlende Disambiguierung. Die Dublette ist damit ein benanntes Qualitätsproblem eines SKOS-Vokabulars und kein Verstoß gegen eine normative Anforderung.

RiC-O trifft zu Labels innerhalb eines projektspezifischen Typvokabulars keine Aussage; `rico:DocumentaryFormType` verweist auf ein kontrolliertes Vokabular, dessen Pflege beim Projekt liegt.

### Optionen

**A. Oberbegriff umbenennen.** `DFT_LABELS["programm"]` erhält den Wert Programm. Im Datensatz ändert sich der `skos:prefLabel` des einen emittierten Konzepts, die 234 Zuordnungen bleiben unverändert. Im Interface weisen Chips, Typfacette und Statistikaufriss den häufigsten Dokumenttyp künftig als Programm aus. Der Aufwand liegt bei einer Zeile ohne Frontend-Änderung, die Rückholbarkeit ist vollständig. Die Bezeichnung deckt sich mit der Erfassungsrichtlinie, deren Titelmustertabelle den Dokumenttyp bereits Programm nennt und ihm das Titelmuster `Programmzettel [Werk oder Veranstaltung], [Ort], [Datum]` zuordnet.

**B. Die beiden Konzepte zusammenlegen.** `programmheft` entfällt aus `DOKUMENTTYP_TO_DFT`, `DFT_BROADER` und `DFT_LABELS`, `konzertprogramm` wird auf `programm` umgehängt. Am Datensatz ändert sich heute nichts, weil beide Quellwerte unbelegt sind. Der Baum verliert eine Ebene, die Unterscheidung steht für spätere Erschließung nicht mehr zur Verfügung. Der Aufwand ist gering, mit Folgeaufwand im Vokabularbaum in `data.md` § 12 und in `vocab/m3gim.ttl`. Die Rückholbarkeit ist gut, solange kein Record den Unterbegriff trägt.

**C. Unterbegriff präzisieren.** `DFT_LABELS["programmheft"]` erhält ein spezifischeres Label. Datensatz und Interface bleiben heute unberührt, weil der Unterbegriff nicht emittiert wird. Die Dublette wäre aufgelöst, der Oberbegriff behielte jedoch ein Label, das eine seiner Unterarten benennt, und der Anzeigefehler bei den sieben Records mit abweichender Gattung bliebe bestehen. Der Aufwand ist minimal, die Rückholbarkeit vollständig.

### Empfehlung

Option A. Der Oberbegriff soll den Oberbegriff benennen, und Programm deckt Programmzettel, Programmheft und Konzertprogramm gemeinsam ab. Die Erfassungsrichtlinie führt den Dokumenttyp bereits unter diesem Namen, die Änderung stellt also Vokabular und Richtlinie in Deckung. Sie trifft eine Zeile, propagiert über die exportierten `skos:prefLabel` automatisch ins Frontend und berührt keine Zählstände, an denen Baselines hängen.

Option B ist zusätzlich erwägenswert, sobald geklärt ist, ob die Erschließung die feinere Stufe je verwenden wird. Solange beide Unterbegriffe unbelegt bleiben, kostet ihr Fortbestand nichts, und A löst die Dublette bereits vollständig auf.

### Ansatzpunkt

Option A setzt in `scripts/transform.py` in der Tabelle `DFT_LABELS` beim Eintrag `"programm"` an. Zu prüfen sind danach `tests/test_31_dft_vocab.py`, das die Hierarchie und die Mappingabdeckung prüft, sowie ein Neulauf von `scripts/transform.py` und der Abgleich von `docs/data/m3gim.jsonld` gegen `data/output/m3gim.jsonld`, den `tests/test_33_frontend_data_fresh.py` erzwingt.

Option B setzt in derselben Datei an, zusätzlich bei den Einträgen `programmheft` und `konzertprogramm` in `DOKUMENTTYP_TO_DFT` sowie beim Eintrag `programmheft` in `DFT_BROADER`, dazu in den Konzeptzeilen in `vocab/m3gim.ttl` und im Baum in `knowledge/data.md` § 12.

## 4. ISO-Form angereicherter Gründungsdaten

### Befund

`extract_claim_value` in `scripts/enrich-wikidata.py` behandelt Zeitwerte, indem es das Literal aus `datavalue.value.time` nimmt, das Vorzeichen entfernt und am `T` abschneidet. Das Feld `precision` desselben `datavalue` wird nicht gelesen. Führt Wikidata eine Angabe nur jahresgenau, steht dort `+YYYY-00-00T00:00:00Z`, und das Ergebnis ist `YYYY-00-00`.

Die Funktion bedient alle Zeitproperties der Konfiguration. Betroffen sind daher nicht nur die Gründungsdaten aus P571, sondern ebenso P569 Geburtsdatum, P570 Sterbedatum und P577 Veröffentlichungsdatum. Im Anreicherungscache `data/output/wikidata-enrichment.json` tragen 29 Entitäten eine Nullform, im erzeugten JSON-LD stehen 45 Vorkommen, verteilt auf `schema:birthDate` mit 21, `schema:deathDate` mit 11, `m3gim:wdPremiereDate` mit 8 und `m3gim:inception` mit 5. Der Befund AF-04 in [data-errors.md](../../knowledge/data-errors.md) beschreibt damit den kleinsten der vier betroffenen Fälle.

Wirkung auf das Interface. `docs/js/views/indexes.js` schneidet Geburts- und Sterbedatum für die Anzeige auf die ersten vier Zeichen, dort bleibt die Nullform unsichtbar. `m3gim:inception` wird im Frontend an keiner Stelle gelesen. Der Schaden liegt heute vollständig im exportierten Datensatz und in seiner Nachnutzbarkeit, und er hat sich bereits ins Vokabular fortgesetzt; `vocab/m3gim.ttl` führt `m3gim:inception` mit `rdfs:range xsd:string` und begründet das in einer `skos:editorialNote` ausdrücklich mit der ungültigen Form.

Ein zweiter Verlust betrifft die Präzision selbst. Weil das Feld verworfen wird, lässt sich an einem Wert wie `1901-01-01` beim Prinzregententheater aus dem Export nicht mehr entscheiden, ob die Quelle tagesgenau ist. Diese Unterscheidung ist unabhängig von der Nullform verloren und durch reine Zeichenkettenreparatur nicht wiederherstellbar.

### Datenbeispiele

**Théâtre National de l'Opéra-Comique**, `wd:Q872222`. Der Cache `data/output/wikidata-enrichment.json` führt `"inception": "1715-00-00"`, im JSON-LD steht der Wert am eingebetteten Organisationsknoten, erstmals am Record UAKUG/NIM_004 31.

**Universität Mozarteum Salzburg**, `wd:Q871369`, am Record UAKUG/NIM_003 1_8. Der Auszug aus `data/output/m3gim.jsonld`:

```json
"m3gim:hasAssociatedAgent": {
  "name": "Universität Mozarteum Salzburg",
  "@id": "wd:Q871369",
  "m3gim:inception": "1841-00-00",
  "role": "ausbildungsstätte",
  "m3gim:xlsxSource": { "m3gim:xlsxSheet": "Box_01", "m3gim:xlsxRow": 36 },
  "@type": "rico:CorporateBody",
  "m3gim:sitz": "Salzburg"
}
```

Die zugehörige Erfassungszeile in `data/google-spreadsheet/M3GIM-Verknüpfungen.xlsx`, Blatt `Box_01`, Zeile 36 lautet `UAKUG/NIM_003 | 1_8 | institution | Universität Mozarteum Salzburg | ausbildungsstätte`. Der Wert stammt aus der Anreicherung; die Erfassungstabelle enthält kein Gründungsdatum.

Die beiden weiteren Institutionen sind **Metropolitan Opera**, `wd:Q10583424`, mit `1880-00-00` und der **Nord- und Westdeutsche Rundfunkverband**, `wd:Q1997444`, mit `1956-00-00`.

Als Gegenprobe außerhalb der Gründungsdaten trägt die Person **Erlenwein, Herbert**, `wd:Q95636832`, im JSON-LD `schema:birthDate` mit `1896-00-00` und `schema:deathDate` mit `1960-00-00`. Der Fall verhält sich identisch und stammt aus derselben Codestelle.

### Fachlicher Stand

Die Standards antworten hier eindeutig, und sie stimmen überein.

Das Wikidata-Datenmodell führt die Präzision als eigenes Feld. Help:Dates beschreibt sie als „explicit value encoded in a shortint" mit der Skala von 0 für Milliarden Jahre bis 14 für Sekunden, darin 9 für Jahr, 10 für Monat und 11 für Tag, und zeigt für Jahresgenauigkeit die Form `+2026-00-00T00:00:00Z`. Die Nullen sind Platzhalter der Serialisierung und tragen keine Kalenderbedeutung.

ISO 8601 lässt diese Form nicht zu. Der Monat ist „a two-digit month of the year, 01 through 12", der Tag „a two-digit day of that month, 01 through 31". Reduzierte Genauigkeit wird durch Weglassen der feineren Komponenten ausgedrückt, `1981` für das Jahr und `1981-04` für den Monat.

Das Extended Date/Time Format der Library of Congress, seit 2019 als ISO 8601-2 Teil der Norm, kennt auf Level 0 die drei Formen CCYY-MM-DD, CCYY-MM und CCYY. Für eine jahresgenaue Angabe ist die vierstellige Jahreszahl die vorgesehene Darstellung.

RiC-O 1.1 schließt daran an. `rico:normalizedDateValue` ist beschrieben als „Machine readable representation of the date based on a public technical standard" und führt unter seinen Beispielen ausdrücklich `1948-03` als „an ISO 8601 form of a single date" neben `1948-03-08`, außerdem EDTF-Formen wie `1948-03~`. Für die natursprachliche Fassung steht `rico:expressedDate` daneben. Truncation nach Präzision ist damit die vom Zielmodell vorgesehene Ausdrucksform.

Die Praxis der Korrespondenzmetadaten bestätigt dasselbe Muster. Das CMI-Format lässt zur Erleichterung des Austauschs ausschließlich die Formen YYYY-MM-DD, YYYY-MM und YYYY zu.

### Optionen

**A. Präzision auswerten und den Wert truncieren.** `extract_claim_value` liest `value["precision"]` und schneidet das Literal entsprechend, auf vier Zeichen ab Präzision 9 und darunter, auf sieben bei Präzision 10, vollständig ab Präzision 11. Im Datensatz werden 45 Werte in vier Properties kürzer und nach ISO 8601 sowie EDTF Level 0 gültig; die Gültigkeit erstreckt sich dann auf alle Zeitwerte der Anreicherung, über die auffälligen hinaus. Das Interface bleibt unberührt, weil die Personenindex-Anzeige ohnehin auf das Jahr schneidet und `m3gim:inception` nicht gelesen wird. Der Aufwand ist im Code gering und im Ablauf mittel, weil der Cache die Präzision nicht mitgeschrieben hat und ein neuer Lauf gegen Wikidata nötig ist. Rückholbar ist die Änderung vollständig, der bisherige Cache liegt versioniert vor.

**B. Präzision zusätzlich mitführen.** Wie A, dazu ein eigenes Feld für die Präzisionsstufe an der angereicherten Entität. Im Datensatz wird die Unterscheidung zwischen jahresgenauer und tagesgenauer Quelle erstmals explizit und maschinell auswertbar; das schließt den zweiten, heute stillen Verlust. Das Interface bleibt unberührt, solange keine Anzeige die Stufe liest. Der Aufwand ist höher, weil Vokabular, `data.md` und die JSON-LD-Kontextdefinition je einen neuen Term brauchen. Die Rückholbarkeit ist gut.

**C. Nullform ohne neuen Wikidata-Lauf reparieren.** Die Endungen `-00-00` und `-00` werden beim Einlesen des Caches abgeschnitten. Im Datensatz werden die 45 Werte gültig, ohne Netzzugriff. Das Interface bleibt unberührt. Der Aufwand ist minimal, die Rückholbarkeit vollständig. Die Präzisionsunterscheidung bleibt verloren, sie ist es allerdings bereits, weil der Cache das Feld nicht führt.

### Empfehlung

Option A, mit Option C als Zwischenschritt, falls kurzfristig kein Anreicherungslauf ansteht. Die Standards lassen hier keinen Spielraum; `1715-00-00` ist nach ISO 8601 kein Datum, und die Nullen entstehen allein daraus, dass die Präzision beim Auslesen verworfen wird. Die Reparatur an der Quelle behebt alle vier betroffenen Properties zugleich und verhindert, dass jede weitere Zeitproperty denselben Fehler erbt. C erzeugt denselben gültigen Datensatz sofort, lässt die Ursache jedoch im Code stehen.

Option B ist die sachlich beste Lösung und sollte anhand des Bedarfs entschieden werden. Solange keine Auswertung die Präzisionsstufe braucht, trägt der zusätzliche Term nichts, und A liefert bereits einen normkonformen Datensatz, dessen Kürze die Unschärfe implizit ausdrückt.

Nach A oder C ist die `skos:editorialNote` an `m3gim:inception` gegenstandslos und die Begründung für `rdfs:range xsd:string` entfällt in ihrer bisherigen Form. Ein Wechsel auf einen engeren Datentyp ist gleichwohl nicht möglich, weil die Werte je nach Präzision vier, sieben oder zehn Zeichen tragen; die Notiz sollte stattdessen EDTF Level 0 als Wertform benennen. Das ist eine Folgeänderung der Entscheidung und keine eigene Frage.

### Ansatzpunkt

Die Optionen A und B setzen in `scripts/enrich-wikidata.py` in der Funktion `extract_claim_value` im Zweig `elif vtype == "time"` an. Die Präzision steht im selben `value`-Dictionary wie das Zeitliteral. Danach folgen ein Lauf des Skripts und ein Neulauf von `scripts/transform.py`. Für B kommen `vocab/m3gim.ttl`, der `@context`-Block in `scripts/transform.py` und der Propertykatalog in `knowledge/data.md` hinzu.

Option C setzt in `scripts/transform.py` an der Stelle an, an der die angereicherten Properties in den Agentenknoten übernommen werden, alternativ in `scripts/_common.py`, falls die Übernahme dort zentral liegt.

In allen drei Fällen sind `tests/test_07_wikidata.py` für die Anreicherung und `tests/test_18_typed_dates.py` zu prüfen. Der dortige ISO-Test deckt die vier betroffenen Properties gegenwärtig nicht ab, weil `TYPED_DATE_PROPS` nur die projektspezifischen Ereignisdaten führt; eine Erweiterung um die angereicherten Zeitwerte würde den Befund künftig maschinell festhalten.

## Quellen

Alle Webquellen wurden am 2026-08-21 abgerufen. Die AgRelOn-Turtle-Datei und die RiC-O-1.1-Ontologiedatei wurden vollständig heruntergeladen und die zitierten Aussagen direkt in der jeweiligen Datei geprüft.

- AgRelOn, an Agent Relationship Ontology, Deutsche Nationalbibliothek. Turtle-Serialisierung unter <https://d-nb.info/standards/elementset/agrelon.ttl>, HTML-Fassung unter <https://d-nb.info/standards/elementset/agrelon>. Geprüft wurden die Deklarationen zu `hasCorrespondent`, `hasSubject`, `hasObject`, `hasSubjectObject`, `hasPatron`, `isPatronOf`, `IsHasPatron` und `metadataProvenance` sowie das Fehlen jeder `owl:IrreflexiveProperty`- und `owl:AsymmetricProperty`-Deklaration. Abgerufen 2026-08-21.
- International Council on Archives, Records in Contexts Ontology (RiC-O) 1.1. Ontologiedatei unter <https://raw.githubusercontent.com/ICA-EGAD/RiC-O/master/ontology/current-version/RiC-O_1-1.rdf>, Einstiegsseite <https://www.ica.org/standards/RiC/ontology>. Geprüft wurden `CorrespondenceRelation`, `AgentToAgentRelation`, `Relation`, `hasDocumentaryFormType`, `DocumentaryFormType`, `normalizedDateValue` und `expressedDate`. Abgerufen 2026-08-21.
- W3C, SKOS Simple Knowledge Organization System Primer, <https://www.w3.org/TR/skos-primer/>. Abschnitte 2.2, 2.2.1 und 2.5 zur Empfehlung eindeutiger bevorzugter Bezeichner und zur Disjunktheit der Labeltypen. Abgerufen 2026-08-21.
- qSKOS Quality Issues, <https://github.com/cmader/qSKOS/wiki/Quality-Issues>. Kategorien Overlapping Labels, Inconsistent Preferred Labels, Orphan Concepts, Disconnected Concept Clusters und Undocumented Concepts. Abgerufen 2026-08-21.
- Wikidata, Help:Dates, <https://www.wikidata.org/wiki/Help:Dates>. Präzisionsskala des Zeitdatentyps und Serialisierung von Monat und Tag als Nullen bei Jahresgenauigkeit. Abgerufen 2026-08-21.
- ISO 8601, Zusammenfassung der Wertebereiche und der reduzierten Genauigkeit, <https://en.wikipedia.org/wiki/ISO_8601>. Abgerufen 2026-08-21. Der Normtext selbst ist kostenpflichtig und wurde nicht eingesehen; die zitierten Wertebereiche für Monat und Tag decken sich mit der RiC-O-Beispielliste und mit der EDTF-Level-0-Definition.
- Library of Congress, Extended Date/Time Format. Die Level-0-Definition wurde über Suchergebnisse ermittelt; die beiden direkten Adressen <https://www.loc.gov/standards/datetime/> und <https://id.loc.gov/datatypes/edtf/EDTF-level0.html> antworteten beim Abruf am 2026-08-21 mit HTTP 403 und konnten nicht eingesehen werden. Die Aussage zu den Formen CCYY-MM-DD, CCYY-MM und CCYY ist deshalb über die RiC-O-Beispielliste gegengeprüft, die dieselben Formen führt.
- TEI Correspondence SIG, Correspondence Metadata Interchange Format, Dokumentation unter <https://raw.githubusercontent.com/TEI-Correspondence-SIG/CMIF/main/doc/documentation-en.md>. Regeln zu `correspAction`, zur Pflicht von `persName`, zur Zeichenkette `Unknown` bei unbekannten Korrespondenten und zu den zugelassenen Datumsformen. Abgerufen 2026-08-21. Die Seite <https://correspsearch.net/en/participate/cmi-format.html> antwortete mit HTTP 404.
- Berlin-Brandenburgische Akademie der Wissenschaften, ediarum-Handbuch, Abschnitt zu Absender, Empfänger, Ort und Datierung, <https://telota.bbaw.de/ediarum/base/manual/frameworks/basis/brief/sender_empfaenger.html>. Getrennte `correspAction`-Elemente für Absender und Empfänger, Verknüpfung über Registerkennungen. Abgerufen 2026-08-21.
