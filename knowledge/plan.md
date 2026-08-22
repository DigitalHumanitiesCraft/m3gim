---
title: "Implementierungsplan: Datenmodell, Wissensbasis und Repository"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: active
created: 2026-08-22
updated: 2026-08-22
language: de
version: 0.1
authors: [Christopher Pollin]
generated-with: Claude Code
query-topics: [implementierungsplan, datenmodell-umbau, annotationsknoten, namensraum-dreiteilung, wissensbasis-refactoring, datenmodell-seite]
related: [INDEX, data, data-model, architecture-decisions, pipeline-architecture, frontend-architecture, testing, handoff]
---

# Implementierungsplan

Dieses Dokument steuert einen zusammenhängenden Umbau, der das Datenmodell in seine Zielform bringt und diese Form in Wissensbasis, Vokabular, Pipeline, Datensatz, Erfassungs-Workflow, Tests und Frontend zugleich verankert. Es ist ein Prozessdokument mit begrenzter Lebensdauer und wird nach Abschluss gelöscht; sein bleibender Ertrag steht dann in den Dokumenten, die es benennt.

Reihenfolge-Grundsatz. Das Modell wird zuerst entschieden und umgesetzt, die Wissensbasis danach umgebaut. Andernfalls wird derselbe Text zweimal geschrieben, weil die Modellentscheidung genau die Abschnitte neu fasst, die ein vorgezogener Umbau verschiebt.

## 1. Entscheidungsblatt

Drei Wurzelentscheidungen bestimmen alles Weitere. Sie sind vor Phase 4 zu beantworten; die Phasen 0 bis 3 laufen unabhängig davon.

**Entschieden am 2026-08-22.** W1 auf Stufe 3, das Zielmodell mit einem einzigen Annotationsknoten. W2 auf IRI mit eingebettetem `skos:prefLabel`. W3 im selben Durchgang. Die sieben Einzelentscheidungen und die vierzehn strittigen Übersetzungen gelten wie unten empfohlen.

### W1. Wie weit geht der Umbau der Annotationsschichten

| Stufe | Inhalt | Folge |
|---|---|---|
| 1, Mittelweg | Vier typisierte Datumsproperties bleiben (`dispatchDate`, `receiptDate`, `publicationDate`, `performanceDate`) plus `rico:creationDate`, elf entfallen zugunsten des Datumsknotens | Die Frontend-Register schrumpfen von vierzehn auf vier und bleiben in ihrer heutigen Form lauffähig |
| 2, generische Datumsform | Alle typisierten Datumsproperties entfallen, jede Datierung läuft über einen Datumsknoten mit Rollenangabe | Zwei Frontend-Register lesen künftig Knoten statt Record-Properties |
| 3, Zielmodell | Ein einziger Annotationsknoten trägt Datierung, Verortung, Detailangabe und Finanzposten; sechzehn Datumsproperties und vier Rollenproperties entfallen; das Rollenvokabular fällt von 34 auf 27 Werte | Vokabular, Pipeline, Datensatz, Tests und Frontend zugleich; die Mobilitätsauswertung wird vollständiger |

Empfehlung Stufe 3. Der Auftrag lautet, das fertige Datenmodell in allen Schichten abzubilden, und die Stufen 1 und 2 lassen die Fallunterscheidung im Kern bestehen, die jede spätere Änderung erneut über fünf Register führt. Der Preis ist ein großer Eingriff anstelle zweier kleiner.

### W2. Rollenwerte als Literal oder als IRI

Heute steht in den Daten der deutsche Rollenstring. Kein Concept des Rollenschemas wird über seine IRI referenziert, weshalb die englischen Bezeichner in den Daten unsichtbar blieben.

Empfehlung IRI, mit eingebettetem `skos:prefLabel` am selben Knoten. Das Frontend behält damit den Anzeigetext ohne Nachschlagen, die Daten werden über die IRI maschinell auswertbar, und die Anforderung A1 des Frontend-Vertrags ist erfüllt.

### W3. Namensraum-Dreiteilung und englische Bezeichner im selben Durchgang

Empfehlung ja. Stufe 3 schreibt das Vokabular ohnehin neu. Die Umbenennung getrennt zu fahren bedeutet, Vokabular, Pipeline, Tests und Frontend zweimal anzufassen.

### Einzelentscheidungen, die W1 nicht absorbiert

| Frage | Empfehlung | Begründung |
|---|---|---|
| Fallen `auftritt` und `aufführung` zusammen | ja | Die `skos:editorialNote` hält fest, dass ihnen keine inhaltliche Unterscheidung zugrunde liegt |
| Fallen `erstelldatum`, `entstehungsort` und `entstehung` zusammen, geführt auf `rico:creationDate` | ja | Drei Bauformen desselben Sachverhalts, im Bestand einander ausschließend |
| Werden Datums- und Ortszeile derselben Rolle zu einem Knoten zusammengeführt | nein | Die Zusammengehörigkeit ist so nicht erfasst worden; sie bleibt Ableitung im Frontend und wandert nicht in die Daten |
| Wie heißt der vereinheitlichte Knoten | `m3gim:Annotation` | Ordinäres Wort für die Sache, eine erfasste Angabe zu einem Datensatz; die vorhandene `DetailAnnotation` geht darin auf. Kollidiert im Lesen mit der Web Annotation des W3C, Alternative `m3gim:RecordedDetail` |
| Bleibt `generalprobe` eine eigene Rolle | ja | Die Alternative setzt `m3gim:probenTyp` voraus, das deklariert und nullmal befüllt ist |
| Wird der Vertragsstatus jetzt umgesetzt | vertagt | Setzt die offene Klärung mit dem Erfassungsteam voraus, also extern blockiert |
| `spielzeitVon` und `spielzeitBis` | ein Term `season` trägt die Spanne | `spielzeitBis` ist deklariert und wird nie befüllt |

### Sammelfreigabe der strittigen Übersetzungen

Vierzehn Terme aus Abschnitt 9.2 der Umbenennungskarte. Der Vorschlag der Karte gilt als angenommen, sofern der Operator nicht einzeln widerspricht. Die Karte führt zu jedem Term die Alternativen und den Grund der Strittigkeit.

### Vertagt

Die Abgrenzung von `sammlung` gegen `konvolut`, der Status von `protagonist`, die Doppelrepräsentation der Partie als Literal und als Entität, das Occurrence-Modell aus E-125 bis E-128 und der Vertragsstatus. Diese fünf Punkte wandern in die Liste der offenen Entscheidungen in `specification.md`.

## 2. Absicherung

Vor dem ersten Eingriff geschrieben, gegen den heutigen Stand laufen gelassen, danach als Regressionsschranke stehend.

- **Verweisintegrität.** Jede im Repo zitierte E-Nummer ist in `knowledge/` genau einmal definiert, dasselbe für AF- und QF-Nummern.
- **Linkintegrität.** Jeder relative Markdown-Link in `knowledge/` und `CLAUDE.md` zeigt auf eine existierende Datei.
- **Inhaltserhalt.** Jede Abschnittsüberschrift des heutigen `data.md` existiert nach der Teilung in genau einer der beiden Zieldateien.
- **Modellabdeckung.** Jeder im Datensatz vorkommende Term ist im Vokabular deklariert, und jeder deklarierte Term ist entweder befüllt oder trägt eine Notiz, warum er leer bleibt.
- **Seitenaktualität.** Die erzeugte Datenmodell-Seite stimmt mit `vocab/m3gim.ttl` überein.

## 3. Phasen

Stand am 2026-08-22. Die Phasen 0 bis 3 sind abgeschlossen und gepusht. Zwei Abweichungen vom Plan haben sich beim Durchführen ergeben. Die vier Reconciliation-Unterlagen bleiben erhalten, weil `data/output/wikidata-reconciliation.json` sie je manuell freigegebener Kennung als Grundlage zitiert; sie sind Kurationsprovenienz der Forschungsdaten. Und `data/_archive/` bleibt vorerst stehen, weil siebzehn Dateien darin unversioniert sind, darunter die Originaldateien der Institution; über sie entscheidet die Projektleitung gesondert.

### Phase 0, Absicherung

Ohne Agent. Die fünf Prüfungen aus Abschnitt 2 schreiben, die ersten drei sofort laufen lassen.

### Phase 1, die beiden Frontend-Fehler

Ein Agent, test-first. Beide Fehler sind von jeder Modellentscheidung unabhängig.

- `m3gim:erstelldatum` fehlt in `TYPED_DATE_PROPS`, obwohl Modell, Vokabular, Pipeline und Testliste es führen und zehn Datensätze es tragen. Unsichtbar bislang allein deshalb, weil alle zehn zusätzlich ein `rico:date` haben.
- Drei Präsenzprüfungen auf `rico:date` laufen nach einer Umstellung stillschweigend leer. Härtester Fall ist die Netzwerkansicht, die bei aktivem Zeitfilter jede Person ohne Jahresmenge ausblendet.

### Phase 2, Repo-Hygiene

Ohne Agent. Beide Archive löschen. Die zwei erzeugten Reports `validation-report.md` und `exploration-report.md` in die `.gitignore` aufnehmen und aus der Versionierung nehmen; `quality-snapshot.md` bleibt, weil zwölf Dokumente und ein Hinweistext im Frontend darauf zeigen. Die `.gitignore` entrümpeln, acht der dort genannten Pfade existieren nicht mehr.

### Phase 3, Ernte der erledigten Momentaufnahmen

Drei Agents, aufgeteilt nach Zieldatei, damit kein Schreibkonflikt entsteht. Geerntet werden neun Dokumente, deren Vorgang abgeschlossen ist, darunter die vier Reconciliation-Unterlagen, die Entscheidungsvorlage vom 2026-08-21, der Implementierungsplan von 2026-06, die Frontend-Verifikation von 2026-04 und das Projekt-Review von 2026-07. Jede Aussage geht in ihr Zieldokument, danach wird die Quelle gelöscht.

Die drei offenen Vorlagen bleiben unangetastet, bis der Umbau sie eingelöst hat.

### Phase 4, Vokabular und Pipeline

Zwei Agents nacheinander, weil der zweite auf dem Ergebnis des ersten arbeitet.

- Agent V schreibt `vocab/m3gim.ttl` in die Zielform: Namensraum-Dreiteilung, englische Bezeichner, `m3gim:Annotation` als vereinheitlichter Knoten, das zerlegte Rollenvokabular aus Abschnitt 4 der Umbenennungskarte, Klassen groß und Properties klein.
- Agent P zieht `scripts/transform.py` und die übrigen Skripte nach. Die Zuordnungstabelle `DATUMSROLLE_TO_PROPERTY` und die Fallunterscheidung zwischen typisierter Property und Auffangklasse entfallen.

### Phase 5, Datensatz und Tests

Ein Agent für die Testsuite, die Verifikation läuft ohne Agent. Der Datensatz wird neu erzeugt, der Determinismus-Test bestätigt die Reproduzierbarkeit, und die Migration wird an den fünf Vorher-Nachher-Beispielen des Datums-Befunds geprüft. Sechs Testlücken aus dem Frontend-Vertrag werden geschlossen, darunter das fehlende Gegenstück zu `test_25`, das die Property-Liste gegen die Daten hält.

### Phase 6, Frontend

Drei Agents nach Modulgruppe, jeder besitzt seine Dateien allein.

- Ladeprogramm, Filterzustand und Detailansichten
- Chronik, Statistik und Bestand
- Karte, Netzwerk, Verknüpfungen und Mobilitäts-Atlas

Grundlage ist der Frontend-Vertrag mit seinen vier Anforderungen. Die Hand-Map `SECONDARY_LABEL`, der Regex auf die Rollenendung und die Priorität über die Listenreihenfolge entfallen, weil die Rolle ihre Anzeigeform künftig aus den Daten liefert.

### Phase 7, Wissensbasis

Vier Agents nach Zieldatei. `data.md` wird per Skript entlang der Abschnittsgrenzen geteilt, der Modellteil geht nach `data-model.md`, `data-model.md` geht darin auf. Die E-Nummern werden nach Gegenstand aufgelöst, die offenen Entscheidungen laufen zu einer Liste in `specification.md` zusammen. `data-errors.md` geht in `data.md` auf, `data-model.md` in `data-model.md`. Zielbild sind zwölf Dokumente.

### Phase 8, Datenmodell-Spezifikationsseite

Ein Agent. Eine neue Informationsseite `docs/datenmodell.html`, erzeugt von `scripts/build-model-page.py` aus `vocab/m3gim.ttl`, verlinkt in der Kopfnavigation neben Über und Projekt. Die Erzeugung ist die tragende Entscheidung, weil eine handgeschriebene Seite gegen das Vokabular driftet und eine erzeugte es nicht kann.

Inhalt sind die drei Schichten aus externen Ontologien, Projekterweiterung und Vokabularen, die vollständigen Tabellen der Klassen und Properties mit Domain, Range, Unterproperty-Beziehung und Scope Note sowie beide Vokabulare mit ihren Definitionen. Die Netzwerkvisualisierung wird als deterministisches SVG erzeugt und nicht zur Laufzeit gelegt, damit sie bei jedem Aufruf gleich aussieht und prüfbar bleibt. Sie zeigt die Klassen als Knoten und die Object Properties als beschriftete Kanten.

### Phase 9, Abschluss

Ohne Agent. `INDEX.md` neu, Zeiger in `CLAUDE.md` nachziehen, `data-entry-guidelines.md` auf die neue Rollenspalte bringen, alle Prüfungen und die volle Testsuite laufen lassen, Commit über explizite Pfade, Push.

## 4. Regeln für die Agents

Kollisionsfreiheit über Besitz. Jeder Agent schreibt genau die Dateien, die ihm zugewiesen sind, und liest alles andere nur. Zwei Agents teilen nie eine Datei.

Wörtlich an jeden Agent:

- Schreibe ausschließlich die dir zugewiesenen Dateien; alles andere liest du nur
- Verschiebe Inhalt wörtlich, formuliere nicht um, fasse nicht zusammen
- Lösche keine Datei, Löschungen laufen zentral
- Was du nicht unterbringen kannst, meldest du am Ende namentlich, statt es wegzulassen
- Test zuerst, dann Implementierung; ein Gate wird durch eine eingespielte Verletzung bewiesen
- Keine veränderlichen Zahlen in dauerhafte Dokumente
- Keine Namen Dritter in erzeugten Dokumenten, Rolle und Institution stattdessen; für Forschungsdaten gilt das nicht
- Grokipedia ist in keinem Zusammenhang eine Quelle
- Stilregeln: kein Gedankenstrich und kein Doppelpunkt als Verbinder, keine Zuspitzung der Form "X, nicht Y", keine Dreierfiguren, keine Schlusspointe
- Starte keine eigenen Agents

## 5. Definition of Done

- Die volle Testsuite ist grün, die fünf Prüfungen aus Abschnitt 2 eingeschlossen
- Der Datensatz ist neu erzeugt und deterministisch reproduzierbar
- Kein Term steht im Datensatz, der im Vokabular fehlt, und kein deklarierter Term ist ohne Notiz leer
- Die Wissensbasis führt zwölf Dokumente, jede Frage hat genau eine Adresse
- Die Datenmodell-Seite ist erzeugt und stimmt mit dem Vokabular überein
- Dieses Dokument ist gelöscht
