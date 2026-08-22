---
title: "Umbenennungskarte Paket 2: Namespace-Dreiteilung und englische Bezeichner"
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
related: [data, domain-ontology, architecture-decisions, vocabulary-derivation-findings, frontend-architecture, testing]
---

# Umbenennungskarte Paket 2

Diese Karte bereitet die in [architecture-decisions.md](../../knowledge/architecture-decisions.md) § Offene Modellentscheidungen geführte Trennung von Daten- und Ontologie-Ebene aus, zusammen mit der dort ebenfalls offenen Sprachvereinheitlichung. Sie ist eine Entscheidungsvorlage und führt keine Änderung aus. Jeder benannte Bezeichner des formalen Vokabulars [`vocab/m3gim.ttl`](../../vocab/m3gim.ttl) steht mit heutigem und künftigem Namen in einer Tabellenzeile, damit die Vorlage zeilenweise durchgesehen und geändert werden kann.

Als Arbeitsartefakt führt die Karte Zählstände. Sie gelten für den Stand von `vocab/m3gim.ttl` und `data/output/m3gim.jsonld` am 2026-08-22.

## 1. Zielzustand der Namensräume

Der beschlossene Zielzustand teilt den heute einheitlichen Projekt-Namespace in drei Räume nach der Art der benannten Sache.

| Prefix | IRI | Inhalt | heute |
|---|---|---|---|
| `m3gim-ontology` | `https://dhcraft.org/m3gim/ontology#` | Klassen und Properties | Teil von `m3gim:` |
| `m3gim-data` | `https://dhcraft.org/m3gim/data#` | Instanzen des Bestands | Teil von `m3gim:` |
| `m3gim-vocab` | `https://dhcraft.org/m3gim/vocabulary#` | kontrollierte Begriffe, Schemes, Collections | `m3gim-role:` und `m3gim-dft:` |

Die beiden heutigen Vokabular-Namespaces `m3gim-role:` (`.../roles#`) und `m3gim-dft:` (`.../documentaryFormTypes#`) verschmelzen zu `m3gim-vocab:`. Ihre Trennung wird von den Concept Schemes getragen, die nach der Zerlegung in Abschnitt 4 ohnehin feiner unterscheiden als zwei Namespaces es könnten. Die Verschmelzung ist die Voraussetzung dafür, dass die Kollision der beiden gleichnamigen `scheme`-Knoten überhaupt als Kollision auftritt und gelöst werden muss.

Die IRI der Ontologie selbst wandert von `https://dhcraft.org/m3gim/vocab` nach `https://dhcraft.org/m3gim/ontology`; jedes `rdfs:isDefinedBy` zieht mit.

### Namenskonventionen des Zielzustands

- Klassen beginnen mit einem Großbuchstaben, Properties und SKOS-Concepts mit einem Kleinbuchstaben. Das ist der heute schon gültige und in `tests/test_41_naming_convention.py` gesicherte Stand.
- Schemes und Collections sind weder Klasse noch Concept und folgen der Kleinschreibung der Concepts.
- Durchgängig Binnenmajuskel ohne Unterstrich. Betroffen ist genau ein heutiger Bezeichner, `m3gim-role:technische_leitung`.
- Amerikanische Schreibung, wo britisch und amerikanisch auseinanderfallen (`organizer`, `program`). Das folgt schema.org, dessen Terme das Modell bereits einbindet.
- Anzeigelabels bleiben deutsch als `skos:prefLabel` beziehungsweise `rdfs:label` mit `@de`. Wo ein englisches Zweitlabel fehlt, kommt es hinzu. Die im Datensatz stehenden Rollenliterale bleiben damit unverändert deutsch, und `vocab/check-coverage.py` prüft sie weiterhin gegen `skos:prefLabel` statt gegen den lokalen Namen.

### Legende der Spalte „Quelle"

| Wert | Bedeutung |
|---|---|
| Label | wörtlich aus dem vorhandenen englischen `rdfs:label` abgeleitet |
| unverändert | Name ist bereits englisch und bleibt stehen |
| abweichend | weicht vom vorhandenen englischen Label ab, Begründung in der Anmerkung |
| Vorschlag | kein englisches Label vorhanden, Name neu vorgeschlagen |
| offen | Vorschlag steht unter einer Entscheidung, siehe Anmerkung |

## 2. Karte der Ontologie

Zielraum aller Zeilen dieses Abschnitts ist `m3gim-ontology:`. Die Spalte „heute" nennt den lokalen Namen unter `m3gim:`.

### 2.1 Klassen

| heute | künftig | Art | Quelle | Anmerkung |
|---|---|---|---|---|
| `MusicalWork` | `MusicalWork` | owl:Class | unverändert | |
| `Performance` | `Performance` | owl:Class | unverändert | |
| `PerformanceEvent` | `FramingEvent` | owl:Class | Label | Das englische Label lautet bereits „Framing event". Der heutige Name sagt Aufführungsereignis und meint die übergeordnete Veranstaltung, was ihn gegen `Performance` austauschbar erscheinen lässt. Alternativen `EventSeries`, `Festival`. Empfehlung `FramingEvent`, weil es dem Label folgt und die Rolle als Rahmen ausdrückt. |
| `SpatiotemporalEvent` | `SpatiotemporalEvent` | owl:Class | unverändert | |
| `DatedEvent` | `DatedEvent` | owl:Class | unverändert | Trägt nach Abschnitt 6 möglicherweise die ganze Datumslast. |
| `StageRole` | `StageRole` | owl:Class | unverändert | |
| `DetailAnnotation` | `DetailAnnotation` | owl:Class | unverändert | |

### 2.2 Object Properties

| heute | künftig | Art | Quelle | Anmerkung |
|---|---|---|---|---|
| `hasAssociatedAgent` | `hasAssociatedAgent` | owl:ObjectProperty | unverändert | |
| `hasPerformance` | `hasPerformance` | owl:ObjectProperty | unverändert | |
| `hasSpatiotemporalEvent` | `hasSpatiotemporalEvent` | owl:ObjectProperty | unverändert | |
| `hasDatedEvent` | `hasDatedEvent` | owl:ObjectProperty | unverändert | |
| `hasDetail` | `hasDetail` | owl:ObjectProperty | unverändert | |
| `hasPerformer` | `hasPerformer` | owl:ObjectProperty | unverändert | |
| `performanceOf` | `performanceOf` | owl:ObjectProperty | unverändert | Label lautet „is performance of"; das führende `is` bleibt nach RiC-O-Konvention aus dem Namen. |
| `hasStageRole` | `hasStageRole` | owl:ObjectProperty | unverändert | |
| `atPlace` | `atPlace` | owl:ObjectProperty | unverändert | |
| `agentRelation` | `hasAgentRelation` | owl:ObjectProperty | Label | Label lautet „has agent relation". Der heutige Name fällt aus der `has*`-Familie, der alle übrigen Object Properties folgen. Alternative, den Namen zu belassen. Empfehlung `hasAgentRelation`. |
| `xlsxSource` | `xlsxSource` | owl:ObjectProperty | unverändert | Label lautet „has source cell". Der Name bleibt trotzdem, weil `xlsxSheet` und `xlsxRow` mit ihm eine Familie bilden und XLSX ein Formatname ist. |

### 2.3 Datatype Properties, Rollen und Beschreibung

| heute | künftig | Art | Quelle | Anmerkung |
|---|---|---|---|---|
| `role` | `role` | owl:DatatypeProperty | unverändert | |
| `komponist` | `composer` | owl:DatatypeProperty | Label | Löst die im Auftrag genannte Kollision mit dem Rollenbegriff auf, weil beide Namen künftig in verschiedenen Namespaces stehen. Der Kontext-Alias `komponist` ist gesondert zu entscheiden, siehe Abschnitt 8.4. |
| `eventRole` | `eventRole` | owl:DatatypeProperty | unverändert | |
| `dateRole` | `dateRole` | owl:DatatypeProperty | unverändert | Zentrale Property der Vorlage in Abschnitt 6. |

### 2.4 Datatype Properties, Datumsfamilie

Elf Zeilen dieser Tabelle tragen in der Spalte „künftig" den Verweis auf Abschnitt 6 statt eines Namens, weil ihre Übersetzung erst nach der Redundanzentscheidung sinnvoll ist. Der Name, der bei Erhalt der Property gelten würde, steht in der Anmerkung.

| heute | künftig | Art | Quelle | Anmerkung |
|---|---|---|---|---|
| `atDate` | `atDate` | owl:DatatypeProperty | unverändert | Eigenständig, sitzt am raumzeitlichen Ereignis. |
| `dateValue` | `dateValue` | owl:DatatypeProperty | unverändert | Eigenständig, Träger der Auffangklasse. |
| `erstelldatum` | offen, § 6 | owl:DatatypeProperty | offen | Bare subproperty von `rico:creationDate` mit Domain `rico:Record` und ohne eigene Einschränkung. Vorschlag, den Term durch `rico:creationDate` selbst zu ersetzen. Fallbackname `creationDate`. |
| `absendedatum` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `dispatchDate`. Gehört zur Korrespondenzmobilität und ist der stärkste Erhaltungskandidat der Gruppe. |
| `empfangsdatum` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `receiptDate`. Gegenstück zu `absendedatum`. |
| `ausstellungsdatum` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `issueDate`, abweichend vom Label „date of issue" zugunsten der `*Date`-Familie. |
| `erscheinungsdatum` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `publicationDate`. Trägt die diskursive Mobilität. |
| `abreisedatum` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `departureDate`. |
| `auftrittsdatum` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `appearanceDate`. Die Abgrenzung gegen `auffuehrungsdatum` folgt allein der Rollenspalte, siehe die `skos:editorialNote` am Term. |
| `auffuehrungsdatum` | `performanceDate` | owl:DatatypeProperty | Label | Eigenständig, weil der überwiegende Teil der Vorkommen an `m3gim:Performance` hängt und dort das Datum des Ereignisses selbst ist. Die Vorkommen am Record fallen unter Abschnitt 6. |
| `probendatum` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `rehearsalDate`. |
| `probenbeginn` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `rehearsalStartDate`, abweichend vom Label „start of rehearsals" zugunsten der Familie. Zusätzlicher Befund, die Property ist `rdfs:subPropertyOf rico:beginningDate` mit Domain `rico:Record`, meint aber den Probenbeginn und nicht den Beginn der Laufzeit des Dokuments. |
| `premieredatum` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `premiereDate`. Gegen `wdPremiereDate` abzugrenzen, das die Uraufführung des Werks laut Wikidata trägt. |
| `ausstrahlungsdatum` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `broadcastDate`. |
| `spielzeitVon` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `seasonStart`. Der Wert trägt die ganze Spanne, obwohl der Name den Beginn bezeichnet. Alternative `season`, falls die Spanne bleibt. Derselbe Domain-Befund wie bei `probenbeginn`. |
| `spielzeitBis` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `seasonEnd`. Deklariert und von der Pipeline nie befüllt. |
| `ueberweisungsdatum` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `transferDate`. |
| `gespraechsdatum` | offen, § 6 | owl:DatatypeProperty | offen | Fallbackname `conversationDate`. In `knowledge/data.md` § 7 nicht in der Aufzählung geführt. |

### 2.5 Datatype Properties, Finanzschicht

| heute | künftig | Art | Quelle | Anmerkung |
|---|---|---|---|---|
| `detailField` | `detailField` | owl:DatatypeProperty | unverändert | Die gegenläufige Belegung durch den zweiten Emissionspfad bleibt eine eigene offene Frage. |
| `detailValue` | `detailValue` | owl:DatatypeProperty | unverändert | |
| `detailRole` | `detailRole` | owl:DatatypeProperty | unverändert | |
| `monetaryAmount` | `monetaryAmount` | owl:DatatypeProperty | unverändert | |
| `currency` | `currency` | owl:DatatypeProperty | unverändert | |

### 2.6 Datatype Properties, Bearbeitungsstand und Datenqualität

| heute | künftig | Art | Quelle | Anmerkung |
|---|---|---|---|---|
| `bearbeitungsstand` | `processingStatus` | owl:DatatypeProperty | Label | Die Werte bleiben deutsch und normalisiert. Welches der beiden konkurrierenden Wertesysteme gilt, ist eine eigene offene Frage. |
| `bearbeitungsnotiz` | `processingNote` | owl:DatatypeProperty | Label | |
| `accessStatus` | `accessStatus` | owl:DatatypeProperty | unverändert | Bedingt emittiert, im aktuellen Export unbelegt. |
| `digitizationStatus` | `digitizationStatus` | owl:DatatypeProperty | unverändert | Bedingt emittiert, im aktuellen Export unbelegt. |
| `dataQualityFlag` | `dataQualityFlag` | owl:DatatypeProperty | unverändert | |
| `qualityConfidence` | `qualityConfidence` | owl:DatatypeProperty | unverändert | Label ist ein Satzfragment, der Name bleibt kompakt. Bewusst unbefüllt. |

### 2.7 Datatype Properties, kuratierte Indexfelder

| heute | künftig | Art | Quelle | Anmerkung |
|---|---|---|---|---|
| `sitz` | `headquarters` | owl:DatatypeProperty | abweichend | Das Label lautet „seat", das im Englischen zuerst den Sitzplatz meint. Gemeint ist der Verwaltungssitz der Institution, der den Auftritt am eigenen Haus vom auswärtigen trennt. Alternativen `seat`, `basedIn`. Empfehlung `headquarters`, anschlussfähig an Wikidata P159. Fachlich zu bestätigen. |
| `keyContact` | `keyContact` | owl:DatatypeProperty | unverändert | |
| `partie` | `sungPart` | owl:DatatypeProperty | abweichend | Das Label lautet „part". Ein Term dieses Namens ist im archivischen Kontext gefährlich, weil `rico:hasOrHadPart` den mereologischen Teil meint. Alternativen `part`, `roleName`, `repertoirePart`. Empfehlung `sungPart`, weil der Kommentar die von der Nachlassbildnerin gesungene Partie bezeichnet. |
| `lifespan` | `lifespan` | owl:DatatypeProperty | unverändert | |
| `editorialNote` | `indexNote` | owl:DatatypeProperty | abweichend | Der heutige Name fällt mit `skos:editorialNote` zusammen und meint etwas anderes, eine kuratierte Anmerkung aus dem Indexblatt. Die `skos:editorialNote` am Term hält die Umbenennung bereits für erwägenswert. Alternativen `curatorialNote`, `sourceNote`. Empfehlung `indexNote`, weil die Quelle das Indexblatt ist. |
| `voiceType` | `voiceType` | owl:DatatypeProperty | unverändert | Ob der Wert das Fach der Person oder der Partie bezeichnet, bleibt offen. |

### 2.8 Datatype Properties, Wikidata-Anreicherung

| heute | künftig | Art | Quelle | Anmerkung |
|---|---|---|---|---|
| `country` | `country` | owl:DatatypeProperty | unverändert | Bewusst ohne `wd`-Marker, weil in `data.md` § 7 als Place-Property definiert. |
| `wdComposer` | `wdComposer` | owl:DatatypeProperty | unverändert | |
| `wdGenre` | `wdGenre` | owl:DatatypeProperty | unverändert | |
| `wdPremiereDate` | `wdPremiereDate` | owl:DatatypeProperty | unverändert | |
| `wdLocation` | `wdLocation` | owl:DatatypeProperty | unverändert | |
| `inception` | `wdInception` | owl:DatatypeProperty | abweichend | Der Wert stammt aus Wikidata, der Name trägt aber den `wd`-Marker der Familie nicht. `country` und `voiceType` sind in `data.md` § 7 ausdrücklich von diesem Marker ausgenommen, `inception` steht dort ohne Begründung. Alternative, den Namen zu belassen. Empfehlung `wdInception`. |

### 2.9 Datatype Properties, technische Herkunft

| heute | künftig | Art | Quelle | Anmerkung |
|---|---|---|---|---|
| `xlsxSheet` | `xlsxSheet` | owl:DatatypeProperty | unverändert | |
| `xlsxRow` | `xlsxRow` | owl:DatatypeProperty | unverändert | |
| `datenpunktId` | `dataPointId` | owl:DatatypeProperty | Label | Der Term wird von E-127 und E-128 ohnehin durch die zweistufige Aktivitätskennung abgelöst. Alternative, ihn beim Umbau gleich in `activityId` plus `participationId` zu überführen, statt ihn zu übersetzen. |

### 2.10 Datatype Properties, Kennzahlen des Exports

| heute | künftig | Art | Quelle | Anmerkung |
|---|---|---|---|---|
| `exportDate` | `exportDate` | owl:DatatypeProperty | unverändert | |
| `recordCount` | `recordCount` | owl:DatatypeProperty | unverändert | |
| `konvolutCount` | `recordSetCount` | owl:DatatypeProperty | abweichend | Der heutige Name ist deutsch-englisch gemischt, das Label lautet „number of aggregations". Gezählt wird genau die Klasse `rico:RecordSet`. Alternative `aggregationCount` nach dem Label. Empfehlung `recordSetCount`, weil sie die gezählte Klasse benennt. |
| `approvedManualMatches` | `approvedManualMatches` | owl:DatatypeProperty | unverändert | |
| `lowConfidenceSkipped` | `lowConfidenceSkipped` | owl:DatatypeProperty | unverändert | Label lautet „skipped low confidence matches". Der kompaktere Bestandsname bleibt. |

### 2.11 Ontologie-Knoten

| heute | künftig | Art | Quelle | Anmerkung |
|---|---|---|---|---|
| `<https://dhcraft.org/m3gim/vocab>` | `<https://dhcraft.org/m3gim/ontology>` | owl:Ontology | Vorschlag | Jedes `rdfs:isDefinedBy` der 71 Klassen und Properties zeigt künftig hierhin. |

### 2.12 Im Zielmodell spezifizierte, im Vokabular noch nicht geführte Terme

`knowledge/data.md` § 7 und die Entscheidungen E-125 bis E-128 führen Terme, die die `skos:editorialNote` der Ontologie ausdrücklich von der Aufnahme ausnimmt, solange die Pipeline sie nicht erzeugt. Sie sind bereits englisch benannt und brauchen keine Übersetzung, gehören aber beim Umbau in den Ontologie-Namespace: `Occurrence`, `Participation`, `attests`, `hasParticipation`, `performedBy`, `inFunction`, `playsStageRole`, `hasFee`, `mode`, `contractStatus`, `realized`, `probenTyp`, `derivedFromRole`, `belongsToWork`, `attachedTo`.

Eine Ausnahme trägt einen deutschen Namen. `probenTyp` wäre als `rehearsalType` zu führen, damit die Umstellung nicht rückwärts eine neue deutsche Property einträgt.

## 3. Instanz-Präfixe

### 3.1 Befund

Der Datensatz führt heute vier Sorten von Kennungen im selben Namespace wie Klassen und Properties.

| Muster | Sorte | Herkunft der Kennung |
|---|---|---|
| `m3gim:NIM_011_5` | Dokument, Konvolut, Plakat, Tonträger | Archivsignatur plus Folio |
| `m3gim:NIM_003_sammlung` | Sammel-Zeile eines Konvoluts | Archivsignatur plus Suffix |
| `m3gim:perf_NIM_004_2_1` | Aufführungsknoten | erzeugt aus Record-Kennung plus laufender Nummer |
| `m3gim:ste_NIM_011_5_ab9424a0` | raumzeitliches Ereignis | erzeugt aus Record-Kennung plus Inhalts-Hash (E-115) |
| `m3gim:role_lady_macbeth` | Bühnenrolle | deterministischer ASCII-Slug des Rollennamens |

### 3.2 Vorschlag

Alle fünf Muster wandern unverändert in ihrer Struktur nach `m3gim-data:`. Zwei Änderungen am lokalen Namen kommen hinzu.

| heute | künftig | Begründung |
|---|---|---|
| `m3gim:NIM_011_5` | `m3gim-data:NIM_011_5` | Der lokale Name bleibt die Archivsignatur. Ein zusätzlicher Typmarker brächte keine Unterscheidungsleistung und bräche jeden Bookmark ein zweites Mal, weil die Record-Kennung in den URL-Hash der Anwendung wandert. |
| `m3gim:NIM_003_sammlung` | `m3gim-data:NIM_003_collection` | Das Suffix ist ein Pipeline-Artefakt gegen die @id-Kollision aus Sammel-Zeile und Folios und trägt als einziger Teil einer Instanzkennung ein deutsches Wort. Niedrige Priorität. |
| `m3gim:perf_…` | `m3gim-data:perf_…` | unverändert |
| `m3gim:ste_…` | `m3gim-data:ste_…` | unverändert |
| `m3gim:role_lady_macbeth` | `m3gim-data:stagerole_lady_macbeth` | Siehe 3.4. |

### 3.3 Regel hinter der Uneinheitlichkeit

Die Uneinheitlichkeit, dass Dokumente keinen Typmarker tragen und die abgeleiteten Knoten einen, ist beabsichtigt und lässt sich als Regel schreiben. Ein Dokument bringt seine Identität aus der Quelle mit, die Archivsignatur ist bereits ein Identifikator. Aufführungsknoten, raumzeitliche Ereignisse und Bühnenrollen haben keine Kennung in der Quelle; ihre Kennung erzeugt die Pipeline, und der Typmarker hält sie kollisionsfrei gegen die anderen erzeugten Sorten und für einen Menschen lesbar.

### 3.4 Verwechslungsgefahr zwischen Bühnenrolle und Rollenbegriff

Der Präfix `role_` ist die gravierendste Namensschwäche des heutigen Bestands. `m3gim:role_lady_macbeth` ist eine Instanz der Klasse `StageRole`, also eine Partie eines Werks. `m3gim-role:saenger` ist ein Concept des Relationsrollen-Vokabulars, also die Funktion einer Person in einem Dokument. Beide tragen die Zeichenfolge `role` an prominenter Stelle, und die Leitplanke „Namespace-Sauberkeit" in [architecture-decisions.md](../../knowledge/architecture-decisions.md) musste deshalb ausdrücklich festhalten, dass `m3gim-role:` kein Entitäts-Namespace ist.

Nach der Dreiteilung trägt der Namespace die Unterscheidung formal, `m3gim-data:` gegen `m3gim-vocab:`. Für die Lesbarkeit einer Kennung im Interface, im Log und im URL-Hash reicht das nicht, weil dort der Präfix oft abgeschnitten ist. Der Vorschlag ändert den Typmarker deshalb auf `stagerole_`, abgeleitet aus dem Klassennamen `StageRole`. Alternativen wären `part_`, das mit `rico:hasOrHadPart` kollidiert, und `sr_`, das den Vorteil der Lesbarkeit aufgibt.

Zur Verwechslungsgefahr gehört ein zweiter Punkt, der über die Benennung hinausgeht. Die Property `m3gim:partie` führt dieselbe Partie noch einmal als Literal am Werk, ohne Verbindung zur `StageRole`-Entität. Solange zwei Repräsentationen derselben Sache nebeneinander stehen, hilft kein Name. Der Umbau der Kennung löst die Verwechslung auf der Ebene der Adresse. Im Modell bleibt sie bestehen.

## 4. Zerlegung des Rollenvokabulars

### 4.1 Befund

Das heutige Scheme `m3gim-role:` bündelt 82 Concepts, die sechs verschiedenen Sorten angehören. Die `rdfs:comment` des Scheme-Knotens nennt den Grund: eine einzige Spalte der Erfassungstabelle trägt alle Werte, und die Pipeline verteilt sie je nach Verknüpfungstyp auf `m3gim:role`, `m3gim:eventRole`, `m3gim:dateRole` und `m3gim:detailRole`. Die Erfassungsform hat damit die Vokabularstruktur bestimmt.

Die neun `skos:Collection`-Knoten bilden eine zweite, quer liegende Gliederung nach dem Zielknoten, an dem eine Rolle empirisch auftritt. Sie bleiben erhalten, weil sie andere Information tragen als die vorgeschlagenen Schemes. Ein Scheme sagt, was ein Begriff ist; eine Collection sagt, wo er im Datensatz vorkommt. Genau ihre Differenz macht die Vermischung sichtbar, etwa dass die Collection der Datumsrollen zehn Ereignistypen enthält.

### 4.2 Vorgeschlagene Concept Schemes

Alle sieben Schemes liegen in `m3gim-vocab:`. Jedes der 118 Concepts gehört genau einem an.

| Scheme | deutsches prefLabel | Zeilen | Inhalt |
|---|---|---|---|
| `agentRoles` | Akteursrollen | 40 | Funktion einer Person, Körperschaft oder Gruppe in einem Dokument |
| `eventTypes` | Ereignistypen | 13 | Art des Vorkommnisses, auf das sich eine Zeile bezieht |
| `placeRoles` | Ortsrollen | 9 | Bezug eines Orts zum Dokument |
| `dateRoles` | Datumsrollen | 13 | Bezug einer Datierung zum Dokument |
| `financialItemTypes` | Finanzposten | 5 | Art eines Geldbetrags |
| `relationQualifiers` | Beziehungsqualifikatoren | 2 | Bestimmtheitsgrad einer Aussage, unabhängig vom Zieltyp |
| `documentaryFormTypes` | Dokumenttypen | 36 | hierarchisches Vokabular der Dokumentgattungen |

Die beiden heutigen Scheme-Knoten heißen beide `scheme` und kollidieren nach der Verschmelzung der Namespaces. Sie gehen auf in `agentRoles` bis `relationQualifiers` (aus `m3gim-role:scheme`) beziehungsweise in `documentaryFormTypes` (aus `m3gim-dft:scheme`).

Das kleine Scheme `relationQualifiers` verdient eine Begründung. `erwaehnt` und `implizit` sagen nichts über die Art der Beziehung und alles über ihren Bestimmtheitsgrad. Sie treten heute in fast jeder Collection auf, weil sie an jedem Zieltyp stehen können. Ein eigenes Scheme hält diese Querlage fest, statt sie willkürlich einem der fünf Sachschemes zuzuschlagen.

### 4.3 `agentRoles`

| heute `m3gim-role:` | künftig `m3gim-vocab:` | Quelle | Anmerkung |
|---|---|---|---|
| `verfasser` | `author` | Vorschlag | Die `skos:editorialNote` an `hasAssociatedAgent` hält die Abbildung auf `rico:hasCreator` als offene Frage fest. |
| `adressat` | `addressee` | Vorschlag | |
| `absender` | `sender` | Vorschlag | |
| `empfaenger` | `recipient` | Vorschlag | Alternative `receiver`, näher an `rico:hasReceiver`. |
| `unterzeichner` | `signatory` | Vorschlag | |
| `abgebildet` | `depicted` | Vorschlag | |
| `agent` | `artistAgent` | Vorschlag | Der nackte Name `agent` kollidiert im Lesen mit `rico:Agent`, das jeden Akteur meint. Gemeint ist die Künstleragentur. Alternative `agent`. |
| `vermittler` | `intermediary` | Vorschlag | Alternativen `broker`, `mediator`. |
| `auftraggeber` | `commissioner` | Vorschlag | |
| `widmungsempfaenger` | `dedicatee` | Vorschlag | |
| `inhaber` | `holder` | Vorschlag | Alternativen `proprietor`, `owner`. |
| `herausgeber` | `publisher` | Vorschlag | Folgt der Definition und der Anmerkung an `hasAssociatedAgent`, die auf `rico:hasPublisher` verweist. Das deutsche Wort trägt auch die Bedeutung Editor, die hier ausgeschlossen ist. |
| `vertragspartner` | `contractingParty` | Vorschlag | |
| `saenger` | `singer` | Vorschlag | |
| `dirigent` | `conductor` | Vorschlag | |
| `regisseur` | `director` | Vorschlag | |
| `komponist` | `composer` | Vorschlag | Namensgleich mit der Ontologie-Property, in einem anderen Namespace und damit zulässig. |
| `librettist` | `librettist` | Vorschlag | |
| `uebersetzer` | `translator` | Vorschlag | |
| `arrangeur` | `arranger` | Vorschlag | |
| `chorleiter` | `chorusMaster` | Vorschlag | |
| `choreograph` | `choreographer` | Vorschlag | |
| `buehnenbildner` | `setDesigner` | Vorschlag | |
| `kostuembildner` | `costumeDesigner` | Vorschlag | |
| `ausstatter` | `productionDesigner` | Vorschlag | Folgt der Definition, die Bühnenbild und Kostüm zusammenfasst. |
| `buehnenleiter` | `stageManager` | Vorschlag | Ohne Definition im Vokabular. Der deutsche Begriff kann die technische Leitung der Bühne oder die künstlerische Leitung des Hauses meinen. Alternative `headOfStage`. Fachlich strittig. |
| `technische_leitung` | `technicalDirector` | Vorschlag | Einziger Bezeichner mit Unterstrich. Die Abgrenzung gegen `leitung` ist als offene Frage vermerkt. |
| `leitung` | `unspecifiedDirection` | Vorschlag | Der Wert ist ausweislich seiner `skos:editorialNote` unbestimmt und kann musikalische, szenische oder technische Leitung meinen. Alternativen `direction`, `management`, die beide die Unbestimmtheit verlieren. Fachlich strittig, gebunden an die offene Frage. |
| `beleuchter` | `lightingTechnician` | Vorschlag | Alternative `lightingDesigner`, die eine gestalterische Funktion unterstellt, die die Quelle nicht belegt. |
| `maskenbidner` | `makeupArtist` | Vorschlag | Der heutige lokale Name reproduziert den Tippfehler der Quelle. Die Umbenennung löst die IRI vom Quellfehler; `skos:prefLabel` behält die Quellform, `skos:altLabel` die korrekte. |
| `repetitor` | `repetiteur` | Vorschlag | Alternative `vocalCoach`. |
| `regieassistent` | `assistantDirector` | Vorschlag | |
| `fotograf` | `photographer` | Vorschlag | Optisch nah am Dokumenttyp `photograph`, formal verschieden. |
| `interpret` | `performer` | Vorschlag | Die `skos:editorialNote` hält fest, dass der Wert auch als Rolle einer Detailangabe vorkommt, wo er keinen Finanzposten bezeichnet. Diese Verwendung bleibt eine offene Frage und begründet die Zuordnung zu `agentRoles`. |
| `protagonist` | `protagonist` | Vorschlag | Vermutlich ein Erfassungsfehler, weil der Wert eine Bühnenrolle bezeichnet. Als offene Modellentscheidung geführt. |
| `publikum` | `audienceMember` | Vorschlag | Die Definition meint die einzelne anwesende Person. |
| `arbeitgeber` | `employer` | Vorschlag | |
| `veranstalter` | `organizer` | Vorschlag | |
| `ausbildungsstaette` | `educationalInstitution` | Vorschlag | |
| `fluggesellschaft` | `airline` | Vorschlag | |

### 4.4 `eventTypes`

| heute `m3gim-role:` | künftig `m3gim-vocab:` | Quelle | Anmerkung |
|---|---|---|---|
| `auffuehrung` | `performance` | Vorschlag | |
| `auftritt` | `appearance` | Vorschlag | |
| `premiere` | `premiere` | Vorschlag | |
| `wiederaufnahme` | `revival` | Vorschlag | |
| `festvorstellung` | `galaPerformance` | Vorschlag | |
| `probe` | `rehearsal` | Vorschlag | |
| `generalprobe` | `dressRehearsal` | Vorschlag | |
| `aufnahme` | `recording` | Vorschlag | |
| `empfang` | `reception` | Vorschlag | |
| `gastspiel` | `guestPerformance` | Vorschlag | Nach `data.md` § 4 gehört der Auftrittsmodus als `mode` an das Vorkommnis. Solange das Vorkommnis-Modell nicht umgesetzt ist, bleibt der Wert ein Begriff dieses Schemes. |
| `rahmenveranstaltung` | `framingEvent` | Vorschlag | Namensgleich mit der vorgeschlagenen Klasse `FramingEvent`, unterschieden durch Groß- und Kleinschreibung und durch den Namespace. |
| `repertoire` | `repertoire` | Vorschlag | |
| `entstehung` | `creation` | Vorschlag | Steht in den Rollenlisten von `data.md` § 5 nicht, kommt in den Daten aber vor. |

### 4.5 `placeRoles`

| heute `m3gim-role:` | künftig `m3gim-vocab:` | Quelle | Anmerkung |
|---|---|---|---|
| `entstehungsort` | `creationPlace` | Vorschlag | |
| `auffuehrungsort` | `performancePlace` | Vorschlag | Steht auch an Institutionen, die dann als Ortsvertreter dienen. |
| `zielort` | `destinationPlace` | Vorschlag | Mobilitäts-Ortsrolle. |
| `absendeort` | `dispatchPlace` | Vorschlag | Mobilitäts-Ortsrolle. |
| `abreiseort` | `departurePlace` | Vorschlag | Mobilitäts-Ortsrolle. |
| `empfangsort` | `receiptPlace` | Vorschlag | Mobilitäts-Ortsrolle. |
| `vertragsort` | `contractPlace` | Vorschlag | Mobilitäts-Ortsrolle. |
| `wohnort` | `residencePlace` | Vorschlag | Bewusst kein Mobilitätsereignis, weil ein Wohnort ein Zustand mit Gültigkeitsperiode ist. |
| `auftrag` | `assignment` | offen | Die `skos:editorialNote` hält fest, dass der Wert an Orten und an raumzeitlichen Ereignissen vorkommt, in keiner Rollenliste der Spezifikation steht und aus den Daten nicht bestimmbar ist. Der naheliegende Name `commission` ist an `provision` vergeben, siehe 4.7. Empfehlung, die Übersetzung zurückzustellen, bis das Erschließungsteam die Bedeutung klärt. |

### 4.6 `dateRoles`

Die Namen folgen der Regel, dass ein Zeitpunkt auf `Date` endet und ein Zeitraum den Sachnamen trägt.

| heute `m3gim-role:` | künftig `m3gim-vocab:` | Quelle | Anmerkung |
|---|---|---|---|
| `absendedatum` | `dispatchDate` | Vorschlag | Namensgleich mit der Ontologie-Property, siehe Abschnitt 6. |
| `empfangsdatum` | `receiptDate` | Vorschlag | dito |
| `ausstellungsdatum` | `issueDate` | Vorschlag | dito |
| `erscheinungsdatum` | `publicationDate` | Vorschlag | dito |
| `erstelldatum` | `creationDate` | Vorschlag | dito |
| `abreisedatum` | `departureDate` | Vorschlag | dito |
| `probenbeginn` | `rehearsalStartDate` | Vorschlag | dito |
| `ausstrahlung` | `broadcastDate` | Vorschlag | Der deutsche Name trägt anders als seine Geschwister keine Datumsendung. Der englische Name gleicht das an. |
| `spielzeit` | `season` | Vorschlag | Zeitraum. |
| `ueberweisung` | `transferDate` | Vorschlag | |
| `gespraech` | `conversationDate` | Vorschlag | |
| `lohnbestaetigung` | `wageConfirmationDate` | Vorschlag | Alternative `paymentConfirmationDate`. |
| `ratenzahlung` | `installmentPeriod` | Vorschlag | Zeitraum. |

### 4.7 `financialItemTypes`

| heute `m3gim-role:` | künftig `m3gim-vocab:` | Quelle | Anmerkung |
|---|---|---|---|
| `abendgage` | `performanceFee` | Vorschlag | Alternativen `eveningFee`, `nightlyFee`, die den Bezug auf den einzelnen Auftritt verlieren. |
| `provision` | `commission` | Vorschlag | Der Name ist damit für `auftrag` in 4.5 blockiert. Die Kollisionsprüfung in Abschnitt 5 hat diesen Konflikt gefunden. |
| `gesamtverguetung` | `totalRemuneration` | Vorschlag | |
| `reisekosten` | `travelExpenses` | Vorschlag | |
| `rundfunkshonorar` | `broadcastFee` | Vorschlag | Wie bei `maskenbidner` löst die Umbenennung die IRI vom Tippfehler der Quelle, den `skos:prefLabel` behält. |

### 4.8 `relationQualifiers`

| heute `m3gim-role:` | künftig `m3gim-vocab:` | Quelle | Anmerkung |
|---|---|---|---|
| `erwaehnt` | `mentioned` | Vorschlag | Häufigster Wert des ganzen Vokabulars. |
| `implizit` | `implicit` | Vorschlag | |

### 4.9 `documentaryFormTypes`

| heute `m3gim-dft:` | künftig `m3gim-vocab:` | Quelle | Anmerkung |
|---|---|---|---|
| `dokument` | `document` | Vorschlag | Top Concept. |
| `konvolut` | `bundle` | offen | Fachterminus ohne festes englisches Gegenstück. Alternativen `file` (RiC-O führt `recordSetTypes:File`, der Begriff ist aber mehrfach belegt) und `convolute` (Lehnübersetzung, im englischen Archivwesen unüblich). Empfehlung `bundle`. Die Abgrenzung gegen `sammlung` ist ohnehin eine offene Modellentscheidung. |
| `sammlung` | `collection` | Vorschlag | |
| `korrespondenz` | `correspondence` | Vorschlag | |
| `brief` | `letter` | Vorschlag | |
| `postkarte` | `postcard` | Vorschlag | |
| `telegramm` | `telegram` | Vorschlag | |
| `briefumschlag` | `envelope` | Vorschlag | |
| `presse` | `press` | Vorschlag | |
| `zeitungsausschnitt` | `newspaperClipping` | Vorschlag | |
| `kritik` | `critique` | offen | `kritik` und `rezension` tragen beide keine Definition und fallen im Englischen auf `review` zusammen. Alternative `performanceReview`, wenn die Unterscheidung Aufführungskritik gegen Werk- oder Tonträgerbesprechung gemeint ist. Fachlich strittig, weil die Quelle offenlässt, ob die beiden Begriffe dasselbe meinen. |
| `rezension` | `review` | offen | Siehe `kritik`. |
| `musikzeitschrift` | `musicPeriodical` | Vorschlag | Alternative `musicMagazine`. |
| `programm` | `program` | Vorschlag | Kanonischer Begriff des Astes seit E-131. |
| `biographisch` | `biographical` | Vorschlag | |
| `biographie` | `biography` | Vorschlag | |
| `autobiografie` | `autobiography` | Vorschlag | |
| `lebenslauf` | `curriculumVitae` | Vorschlag | |
| `chronik` | `chronicle` | Vorschlag | |
| `identitaetsdokument` | `identityDocument` | Vorschlag | |
| `ausweis` | `identityCard` | Vorschlag | |
| `vertrag` | `contract` | Vorschlag | |
| `plakat` | `poster` | Vorschlag | |
| `fotografie` | `photograph` | Vorschlag | |
| `notiz` | `note` | Vorschlag | |
| `typoskript` | `typescript` | Vorschlag | |
| `photokopie` | `photocopy` | Vorschlag | Bezeichnet die Vervielfältigungsform, die Gattung bleibt unbestimmt. Die Einordnung ist als offene Frage vermerkt. |
| `urkunde` | `certificate` | Vorschlag | Alternativen `deed`, `charter`, die eine rechtsgeschäftliche Urkunde meinen. Die Definition nennt Zeugnis und Auszeichnung. |
| `visitenkarte` | `businessCard` | Vorschlag | |
| `quittung` | `receipt` | Vorschlag | |
| `noten` | `sheetMusic` | Vorschlag | Alternative `musicalScore`. |
| `repertoireliste` | `repertoireList` | Vorschlag | |
| `verzeichnis` | `inventory` | Vorschlag | Alternative `list`. Die Definition grenzt gegen die Repertoireliste ab. |
| `tagebuch` | `diary` | Vorschlag | |
| `tontraeger` | `soundCarrier` | Vorschlag | Alternative `phonogram`. |
| `sonstiges` | `other` | Vorschlag | Auffangwert. Alternative `miscellaneous`. |

### 4.10 Collections

| heute `m3gim-role:` | künftig `m3gim-vocab:` | Quelle | Anmerkung |
|---|---|---|---|
| `personenrollen` | `rolesAtPersons` | Vorschlag | |
| `institutionsrollen` | `rolesAtCorporateBodies` | Vorschlag | |
| `ensemblerollen` | `rolesAtGroups` | Vorschlag | |
| `ortsrollen` | `rolesAtPlaces` | Vorschlag | Gegen das Scheme `placeRoles` abzugrenzen, das nach der Sorte gliedert und nicht nach dem Vorkommen. |
| `mobilitaetsortsrollen` | `mobilityPlaceRoles` | Vorschlag | Einzige Collection, die die Pipeline liest (`MOBILITY_PLACE_ROLES`). |
| `werkrollen` | `rolesAtWorks` | Vorschlag | |
| `ereignisrollen` | `rolesAtFramingEvents` | Vorschlag | |
| `datumsrollen` | `rolesAtDates` | Vorschlag | Enthält zehn Begriffe, die nach 4.2 Ereignistypen sind. Genau diese Differenz ist das Argument in Abschnitt 6. |
| `finanzrollen` | `rolesAtFinancialDetails` | Vorschlag | |

### 4.11 Nicht als Concept geführter Wert

Der Wert `nicht eingehalten` kommt in der Rollenspalte vor, bezeichnet dort aber einen Vertragsstatus. Er ist heute bewusst kein Concept, und `vocab/check-coverage.py` führt ihn als `KNOWN_NON_ROLES`. Der Zielzustand ändert daran nichts. Sein Zielfeld ist `contractStatus` zusammen mit `realized`, deren Modellierung offen ist.

## 5. Kollisionsprüfung

Geprüft wurde mechanisch, ob im Zielzustand ein lokaler Name zweimal im selben Namespace vorkommt. Grundlage ist die vollständige Karte dieses Dokuments, für die elf in Abschnitt 6 zurückgestellten Datums-Properties mit ihrem jeweiligen Fallbacknamen, also im ungünstigsten Fall.

### 5.1 Ergebnis

| Namespace | Bezeichner | eindeutig | Kollisionen |
|---|---|---|---|
| `m3gim-ontology` | 71 | 71 | keine |
| `m3gim-vocab` | 134 | 134 | keine |

Der Ontologie-Namespace zählt 7 Klassen und 64 Properties. Der Vokabular-Namespace zählt 82 Rollen-Concepts, 36 Dokumenttyp-Concepts, 7 Schemes und 9 Collections. Der Instanz-Namespace trägt keine benannten Vokabularbezeichner und ist von der Prüfung nicht betroffen; seine Kennungen sind schon heute innerhalb ihres Musters eindeutig, gesichert durch `tests/test_35_ste_id_stability.py` und `tests/test_38_ste_deterministic_ids.py`.

Zusätzlich geprüft und ohne Befund:

- Jedes der 118 Concepts ist genau einem Scheme zugeordnet.
- Jeder Klassenname beginnt groß, jeder Property- und Concept-Name beginnt klein.
- Kein Bezeichner enthält einen Unterstrich.
- Die Karte deckt alle 7 Klassen, alle 64 Properties, alle 82 Rollen-Concepts und alle 36 Dokumenttyp-Concepts der Turtle-Datei ab, ohne überzählige Zeile.

### 5.2 Ein während der Prüfung gefundener Konflikt

Der erste Entwurf führte `auftrag` und `provision` beide auf `commission`. Die Prüfung hat das gemeldet, und die Karte weist `commission` jetzt `provision` zu, während `auftrag` in 4.5 als offen markiert bleibt.

### 5.3 Heutiger Zustand zum Vergleich

| Kollidierender Name | betroffene Namespaces |
|---|---|
| `komponist` | `m3gim:` (Property am Werk) und `m3gim-role:` (Concept) |
| `absendedatum`, `empfangsdatum`, `ausstellungsdatum`, `erscheinungsdatum`, `erstelldatum`, `abreisedatum`, `probenbeginn` | `m3gim:` (typisierte Datums-Property) und `m3gim-role:` (Datumsrolle) |
| `scheme` | `m3gim-role:` und `m3gim-dft:` |

Der Auftrag nennt sechs Datumsnamen. Mechanisch sind es sieben; `probenbeginn` kommt zu den sechs offensichtlichen hinzu, weil es als einziges Paar ohne die Endung `datum` gebildet ist.

### 5.4 Namensgleichheit über Namespaces hinweg

Nach der Umbenennung tragen elf Namen in beiden Projektnamespaces dieselbe Zeichenfolge: `composer`, `creationDate`, `dispatchDate`, `receiptDate`, `issueDate`, `publicationDate`, `departureDate`, `rehearsalStartDate`, `broadcastDate`, `transferDate`, `conversationDate`. Das ist im Zielzustand zulässig, weil die IRIs verschieden sind und die beiden Sachen verschieden sind, eine Property gegen einen Wert dieser Property.

Diese Namensgleichheit ist zugleich der Befund, der Abschnitt 6 trägt. Zehn der elf Paare sind Datums-Property gegen Datumsrolle, und die Zuordnungstabelle `DATUMSROLLE_TO_PROPERTY` in `scripts/transform.py` wird für sie zur Identitätsabbildung auf dem lokalen Namen.

## 6. Redundanzprüfung der Datums-Properties

Dieser Abschnitt legt eine begründete Vorlage vor. Die Entscheidung bleibt beim Operator. Er ist der Grund, warum elf Zeilen der Karte in 2.4 keinen künftigen Namen tragen.

### 6.1 Wie die Pipeline eine Datierung führt

`scripts/transform.py` verarbeitet eine Verknüpfungszeile vom Typ `datum` so: Der Wert wird normalisiert; steht die Rolle in `DATUMSROLLE_TO_PROPERTY` und ist der Wert ein ISO-Datum, wandert er in die typisierte Property am Record. In jedem anderen Fall entsteht ein Knoten `m3gim:DatedEvent` mit `dateValue` und `dateRole`, und die Rolle bleibt dort als Literal erhalten.

Damit erzeugt dieselbe Quellkonstruktion, eine Datierung mit einer Rolle, zwei verschiedene Gestalten im Graphen. Welche greift, entscheidet ein Nachschlagewerk im Code. Der Beleg dafür, dass die Grenze willkürlich verläuft, steht im Datensatz: `erscheinungsdatum` kommt 28-mal als typisierte Property vor und einmal als `dateRole` an einem `DatedEvent`.

`m3gim:atDate` gehört nicht in diesen Vergleich. Es sitzt an `m3gim:SpatiotemporalEvent` und tritt dort immer zusammen mit `atPlace` auf. Es beantwortet, wo und wann etwas war, während die typisierte Familie beantwortet, wann etwas in welcher Eigenschaft war. Der Auftrag stellt die Redundanzfrage gegen `atDate` und `dateRole`; die Prüfung zeigt, dass allein `dateRole` zusammen mit `dateValue` der Vergleichspunkt ist.

### 6.2 Befund an der formalen Struktur

Zwölf der sechzehn typisierten Datums-Properties sind eine `rdfs:subPropertyOf rico:date` mit `rdfs:domain rico:Record` und ohne jede weitere Einschränkung. Ihr einziger Inhalt über `rico:date` hinaus ist die Rolle, und diese Rolle steht als Concept im Rollenvokabular. Das Paar aus `rico:date` und einer Rollenangabe deckt sie exakt ab, und genau dieses Paar ist `dateValue` plus `dateRole`.

Drei Properties haben eine andere Oberproperty, und zwei davon zeigen dabei einen zweiten Befund.

| Property | Oberproperty | Befund |
|---|---|---|
| `erstelldatum` | `rico:creationDate` | Nackte Unterproperty eines RiC-O-Terms mit derselben Domain und derselben Bedeutung. Sie ist durch den RiC-O-Term selbst ersetzbar. |
| `probenbeginn` | `rico:beginningDate` | `rico:beginningDate` an einem `rico:Record` meint den Beginn der Laufzeit des Dokuments. Der Probenbeginn ist der Beginn einer Produktion, die das Dokument bezeugt. Die Unterproperty-Kante ist damit sachlich falsch gesetzt. |
| `spielzeitVon`, `spielzeitBis` | `rico:beginningDate`, `rico:endDate` | Derselbe Befund. Zusätzlich trägt `spielzeitVon` ausweislich der `skos:editorialNote` die ganze Spanne, und `spielzeitBis` wird nie befüllt. |

### 6.3 Befund am Datensatz

| Property | Vorkommen | davon am Record | davon an Performance | Record trägt auch `rico:date` | Wert identisch mit `rico:date` |
|---|---|---|---|---|---|
| `auffuehrungsdatum` | 92 | 21 | 71 | 18 | 2 |
| `erscheinungsdatum` | 28 | 27 | 0 | 27 | 22 |
| `erstelldatum` | 10 | 10 | 0 | 10 | 9 |
| `ausstellungsdatum` | 7 | 7 | 0 | 7 | 7 |
| `auftrittsdatum` | 7 | 7 | 0 | 7 | 1 |
| `absendedatum` | 4 | 4 | 0 | 4 | 4 |
| `probendatum` | 4 | 4 | 0 | 4 | 0 |
| `premieredatum` | 3 | 3 | 0 | 3 | 1 |
| `probenbeginn` | 3 | 3 | 0 | 3 | 0 |
| `spielzeitVon` | 2 | 2 | 0 | 2 | 0 |
| `abreisedatum` | 1 | 1 | 0 | 1 | 0 |
| `empfangsdatum` | 1 | 1 | 0 | 1 | 0 |
| `gespraechsdatum` | 1 | 1 | 0 | 1 | 0 |
| `ausstrahlungsdatum` | 1 | 1 | 0 | 1 | 0 |
| `ueberweisungsdatum` | 1 | 1 | 0 | 1 | 0 |
| `spielzeitBis` | 0 | 0 | 0 | | |

Zum Vergleich trägt `m3gim:DatedEvent` mit dem Paar `dateValue` und `dateRole` 101 Datierungen an 39 Records und deckt dort elf verschiedene Rollen ab, darunter Werte, für die es keine typisierte Property gibt (`lohnbestaetigung`, `ratenzahlung`, `nicht eingehalten`).

Zwei Zahlen der Tabelle verdienen Aufmerksamkeit. `ausstellungsdatum` trägt in allen sieben Fällen denselben Wert wie `rico:date` desselben Records, `absendedatum` in allen vier, `erstelldatum` in neun von zehn und `erscheinungsdatum` in 22 von 28. Diese Properties wiederholen weit überwiegend eine Angabe, die am selben Knoten schon steht.

### 6.4 Was eigenständige Bedeutung trägt

| Term | Begründung |
|---|---|
| `atDate` | Datum eines raumzeitlichen Ereignisses, unlösbar an `atPlace` gebunden. Anderer Subjektknoten als die Record-Familie. |
| `dateValue` und `dateRole` | Die generische Form, die alle Rollen aufnimmt, auch die ohne typisierte Property. Träger jeder möglichen Vereinfachung. |
| `auffuehrungsdatum` am Performance-Knoten | Dort ist das Datum die Datierung des Ereignisses selbst, und eine Rollenangabe wäre sinnlos. Am Record wäre dasselbe Datum eine Annotation. Die 21 Vorkommen am Record fallen unter die Redundanzgruppe. |

### 6.5 Optionen

#### Option A, Reduktion auf die generische Form

`erstelldatum` entfällt zugunsten von `rico:creationDate`. `auffuehrungsdatum` bleibt als `performanceDate` mit Domain `m3gim:Performance`. Alle übrigen vierzehn Properties entfallen, ihre Werte laufen über `m3gim:DatedEvent`. Der Rollenwert steht dann als `dateRole` und damit an derselben Stelle wie jede andere Rolle, und die Zuordnungstabelle `DATUMSROLLE_TO_PROPERTY` entfällt mitsamt der Fallunterscheidung. Kosten: `TYPED_DATE_PROPS` in `docs/js/data/loader.js` und `SECONDARY_LABEL` in `docs/js/views/chronik-data.js` müssen statt Record-Properties die `DatedEvent`-Knoten lesen. Der Zugriffspfad dorthin existiert bereits (`m3gim:hasDatedEvent` wird in `format.js` und `archive-inline-detail.js` verarbeitet). `tests/test_18_typed_dates.py` wird zu einem Test über `DatedEvent` umgeschrieben.

#### Option B, Beibehaltung

Alle sechzehn Properties werden übersetzt und bleiben. Kosten: sechzehn Namen bleiben in fünf Registern synchron zu halten, nämlich der Zuordnungstabelle in `transform.py`, dem Vokabular, `TYPED_DATE_PROPS`, `SECONDARY_LABEL` und den Tests. Der Nutzen liegt in der direkten Adressierbarkeit ohne Umweg über einen Zwischenknoten in einer SPARQL-Abfrage.

#### Option C, Mittelweg

Erhalten bleiben die vier Properties mit der stärksten Leselast und dem klarsten Mobilitätsbezug, `dispatchDate`, `receiptDate`, `publicationDate` und `performanceDate`, dazu `rico:creationDate` anstelle von `erstelldatum`. Die übrigen elf entfallen zugunsten von `DatedEvent`. Die Frontend-Register schrumpfen von vierzehn auf vier Einträge und bleiben in ihrer heutigen Form lauffähig.

#### Empfehlung

Option C. Sie nimmt den Sync-Aufwand für den langen Rand mit ein bis sieben Vorkommen weg, behält die vier Properties, an denen die Mobilitätssichten in `data.md` § 10 ausdrücklich hängen, und lässt die Frontend-Logik in ihrer heutigen Gestalt bestehen. Option A ist die saubere Zielform und bleibt der nächste Schritt, sobald das Occurrence-Modell aus E-125 bis E-128 die Datierung ohnehin an den Aktivitätsknoten hängt.

#### Unabhängig von der Option zu entscheiden

`spielzeitBis` ist deklariert und wird nie befüllt, während `spielzeitVon` die ganze Spanne trägt. Entweder wird die Spanne zerlegt, dann brauchen beide Terme ihre heutige Bedeutung, oder ein einziger Term `season` trägt die Spanne. Ferner sind die Unterproperty-Kanten von `probenbeginn`, `spielzeitVon` und `spielzeitBis` auf `rico:beginningDate` und `rico:endDate` zu prüfen, weil sie am Record die Laufzeit des Dokuments behaupten.

## 7. Auswirkungsinventar

Gezählt sind Vorkommen der Zeichenfolgen `m3gim:`, `m3gim-dft:` und `m3gim-role:` in der jeweiligen Datei, ermittelt am Repository-Stand vom 2026-08-22. Die Zahl ist ein Größenmaß für den Umbau. Die Zeilenzahl des Diffs fällt anders aus.

### 7.1 Vokabular und Pipeline

| Datei | Vorkommen | Art des Eingriffs |
|---|---|---|
| `vocab/m3gim.ttl` | 286 | Vollständige Neufassung, drei Prefix-Deklarationen, alle Bezeichner, alle `isDefinedBy`, sieben Scheme-Knoten statt zwei |
| `scripts/transform.py` | 180 | `CONTEXT`, `DATUMSROLLE_TO_PROPERTY`, `DOKUMENTTYP_TO_DFT`, `DFT_BROADER`, `DFT_LABELS`, `MALANIUK_SUBJECT`, alle Emissionsstellen, alle @id-Erzeugungen |
| `scripts/build-views.py` | 26 | Leser der Derivate |
| `scripts/audit-data.py` | 14 | Abgleich XLSX gegen JSON-LD gegen Views |
| `scripts/scout-coverage.py` | 14 | Abdeckungs-Scout |
| `scripts/report-quality.py` | 13 | Quality-Snapshot-Generator |
| `scripts/migrate-v2.py` | 12 | Migrationswerkzeug für das Long-Format |
| `scripts/_common.py` | 11 | geteilte Helfer |
| `vocab/check-coverage.py` | 3 plus 3 IRI-Konstanten | `VOCAB_NS`, `ROLE_NS`, `DFT_NS`, `PREFIXES`, `CONTEXT_ALIASES`, `ROLE_KEYS` |
| `scripts/enrich-wikidata.py` | 1 | eine Property-Referenz |

Die drei Namespace-IRIs stehen hart kodiert in `scripts/transform.py`, `vocab/check-coverage.py` und `vocab/m3gim.ttl`. Weitere Fundstellen gibt es nicht.

### 7.2 Frontend, die eigentliche Bruchstelle

Die folgende Tabelle beantwortet die Frage, welche Namen das Frontend unmittelbar aus den Daten liest. Grundlage ist der Code selbst. Namensähnlichkeit allein zählt hier nicht.

| Datei | gelesene Terme | Bruch |
|---|---|---|
| `docs/js/data/loader.js` | 49 Terme, darunter alle sechs Klassen des Graphen, `hasAssociatedAgent`, `hasDetail`, `hasPerformance`, `hasSpatiotemporalEvent`, `hasStageRole`, `hasPerformer`, `performanceOf`, `atPlace`, `atDate`, `eventRole`, `detailField`, `detailRole`, `detailValue`, `currency`, `monetaryAmount`, `bearbeitungsstand`, `editorialNote`, `lifespan`, `sitz`, `keyContact`, `partie`, `voiceType`, `country`, `wdGenre`, `wdLocation`, `wdPremiereDate`, `agentRelation`, die fünf Kennzahlen des Wurzelknotens und vierzehn typisierte Datums-Properties in `TYPED_DATE_PROPS` | vollständig; die zentrale Bruchstelle des Umbaus |
| `docs/js/views/archive-inline-detail.js` | 17, darunter `dateValue`, `dateRole`, `hasDatedEvent`, `dataQualityFlag` | vollständig |
| `docs/js/main.js` | 16, darunter `xlsxSource`, `xlsxSheet`, `xlsxRow`, `datenpunktId`, `detailField` sowie die Instanzkennung `m3gim:NIM_007_5_1` in einer Diagnoseausgabe | vollständig, inklusive einer hart kodierten Instanzkennung |
| `docs/js/views/chronik-data.js` | 14, das Register `SECONDARY_LABEL` der typisierten Datums-Properties | vollständig, entfällt teilweise mit Abschnitt 6 |
| `docs/js/utils/provenance.js` | 6, die vier `xlsx*`-Terme | vollständig |
| `docs/js/utils/format.js` | 4, darunter `stripConceptPrefix` mit dem Regex `/^m3gim-dft:/` und der Aufbau `m3gim-dft:${shortId}` in `expandDftFilter` | vollständig; Prefix und alle Dokumenttyp-Kennungen ändern sich |
| `docs/js/views/basket.js` | 4 | vollständig |
| `docs/js/views/archive-holdings.js` | 4 | vollständig |
| `docs/js/views/repertoire.js` | 2, darunter die hart kodierte Kennung `m3gim-dft:repertoireliste` | vollständig |
| `docs/js/views/_verknuepfungen-geometry.js` | 2 Klassennamen | vollständig |
| `docs/js/data/constants.js` | 2, beide in Kommentaren | keiner |
| `docs/js/ui/events.js`, `router.js`, `filter-state.js` | 7 | keiner; `m3gim:navigate`, `m3gim:archiv-filter` und `m3gim:filter` sind CustomEvent-Kanalnamen und haben mit dem Namespace nichts zu tun |

Zwei Registerlisten des Frontends lesen keine Termnamen und bleiben unberührt. `EVENT_ROLE_TO_MOBILITY_CLUSTER` und `ROLLE_ZU_SEKTION` in `docs/js/data/constants.js` arbeiten auf deutschen Rollenliteralen, und diese Literale bleiben deutsch, weil sie aus `skos:prefLabel` stammen. Dasselbe gilt für die Ortsfarbcodierung und die Personennormalisierung.

Eine Nebenwirkung außerhalb des Codes betrifft Lesezeichen. `docs/js/ui/router.js` schreibt die Record-Kennung in den URL-Hash, in der Form `#bestand/m3gim%3ANIM_011_5`. Nach dem Wechsel auf `m3gim-data:` greift ein bestehendes Lesezeichen ins Leere. `parseHash` führt bereits Legacy-Aliase für umbenannte Tabs; ein Alias, der einen `m3gim:`-Präfix im Hash auf `m3gim-data:` umschreibt, kostet eine Zeile.

### 7.3 Tests

39 Testdateien führen Terme. Die vier mit dem größten Anteil sind `tests/frontend/loader.test.mjs` mit 44 Vorkommen, `tests/test_30_quality_and_dated_events.py` mit 36, `tests/test_20_xlsx_provenance.py` mit 31 und `tests/test_04_verknuepfungen.py` mit 30. `tests/test_18_typed_dates.py` mit 24 Vorkommen wird von der Entscheidung in Abschnitt 6 in seiner Substanz betroffen, über die reine Umbenennung hinaus.

Zwei Testartefakte tragen strukturelle Annahmen über den Namespace.

- `tests/schemas/m3gim_jsonld.schema.json` schreibt das @id-Muster `^(m3gim|m3gim-dft|m3gim-role|wd):[\w/_.-]+$` fest und verlangt im `@context` die Prefixe `rico`, `m3gim`, `m3gim-dft`, `m3gim-role`, `wd`, `owl`, `geo`, `skos`, `xsd`. Beide Stellen ändern sich. Das Schema führt außerdem `m3gim:dateEvidence`, einen mit E-106 abgeschafften Term, der bei der Gelegenheit zu entfernen ist.
- `tests/test_41_naming_convention.py` prüft die Groß- und Kleinschreibung. Es läuft nach dem Umbau unverändert weiter und ist zugleich das Sicherungsnetz gegen einen Fehlgriff beim Umbau.

### 7.4 Daten und Dokumentation

Die erzeugten Artefakte `data/output/m3gim.jsonld` und `docs/data/m3gim.jsonld` sowie die drei Derivate entstehen aus einem Pipeline-Lauf neu und sind kein eigener Arbeitsschritt. `data/output/wikidata-reconciliation.json` und `wikidata-enrichment.json` tragen keine Projektterme und bleiben unberührt.

Zehn Wissensdokumente führen Terme im Fließtext, an der Spitze `knowledge/data.md`, `knowledge/domain-ontology.md`, `knowledge/architecture-decisions.md`, `knowledge/testing.md` und `knowledge/pipeline-architecture.md`. Sieben Berichte unter `data/reports/` ebenfalls; sie sind datierte Momentaufnahmen und werden nach der üblichen Konvention nicht rückwirkend umgeschrieben.

### 7.5 Reihenfolge

Die Spec-first-Leitplanke aus E-133 gibt die Reihenfolge vor. Zuerst `knowledge/data.md`, dann `vocab/m3gim.ttl`, dann die Tests, dann `scripts/transform.py` und die übrige Pipeline, zuletzt das Frontend. Der Abdeckungsprüfer `vocab/check-coverage.py` ist dabei der brauchbarste Fortschrittsmesser, weil er nach jedem Zwischenstand meldet, welche im Datensatz verwendeten Terme im Vokabular noch fehlen.

## 8. Beispielstrecke

### 8.1 Der `@context` vorher und nachher

Vorher, aus `data/output/m3gim.jsonld`:

```json
{
  "rico": "https://www.ica.org/standards/RiC/ontology#",
  "ric-rst": "https://www.ica.org/standards/RiC/vocabularies/recordSetTypes#",
  "m3gim": "https://dhcraft.org/m3gim/vocab#",
  "m3gim-dft": "https://dhcraft.org/m3gim/documentaryFormTypes#",
  "m3gim-role": "https://dhcraft.org/m3gim/roles#",
  "agrelon": "https://d-nb.info/standards/elementset/agrelon#",
  "schema": "https://schema.org/",
  "gndo": "https://d-nb.info/standards/elementset/gnd#",
  "wd": "http://www.wikidata.org/entity/",
  "owl": "http://www.w3.org/2002/07/owl#",
  "geo": "http://www.w3.org/2003/01/geo/wgs84_pos#",
  "skos": "http://www.w3.org/2004/02/skos/core#",
  "xsd": "http://www.w3.org/2001/XMLSchema#",
  "name": "rico:name",
  "role": "m3gim:role",
  "komponist": "m3gim:komponist"
}
```

Nachher:

```json
{
  "rico": "https://www.ica.org/standards/RiC/ontology#",
  "ric-rst": "https://www.ica.org/standards/RiC/vocabularies/recordSetTypes#",
  "m3gim-ontology": "https://dhcraft.org/m3gim/ontology#",
  "m3gim-data": "https://dhcraft.org/m3gim/data#",
  "m3gim-vocab": "https://dhcraft.org/m3gim/vocabulary#",
  "agrelon": "https://d-nb.info/standards/elementset/agrelon#",
  "schema": "https://schema.org/",
  "gndo": "https://d-nb.info/standards/elementset/gnd#",
  "wd": "http://www.wikidata.org/entity/",
  "owl": "http://www.w3.org/2002/07/owl#",
  "geo": "http://www.w3.org/2003/01/geo/wgs84_pos#",
  "skos": "http://www.w3.org/2004/02/skos/core#",
  "xsd": "http://www.w3.org/2001/XMLSchema#",
  "name": "rico:name",
  "role": "m3gim-ontology:role",
  "composer": "m3gim-ontology:composer"
}
```

Die drei Aliase sind eine eigene kleine Entscheidung. `name` und `role` bleiben unverändert. Der Alias `komponist` wird zu `composer`, wodurch sich der Schlüssel im JSON ändert, den `docs/js/data/loader.js` als `subj.komponist` liest und `tests/schemas/m3gim_jsonld.schema.json` unter `entityRef` führt. Alternative wäre, den Alias-Schlüssel deutsch zu belassen und nur sein Ziel umzuhängen; das erhielte das Frontend, hinterließe aber einen deutschen Schlüssel in einem sonst englischen Datensatz.

### 8.2 Ein Record-Knoten

Vorher, `UAKUG/NIM_007 6`, eine Quittung des Nord- und Westdeutschen Rundfunkverbands, gekürzt um nichts:

```json
{
  "@id": "m3gim:NIM_007_6",
  "@type": "rico:Record",
  "rico:identifier": "UAKUG/NIM_007 6",
  "m3gim:xlsxSource": { "m3gim:xlsxSheet": "Objekte", "m3gim:xlsxRow": 130 },
  "rico:title": "Mittelung über Honorar für Sendung Paradies und Peri 1959 von Nord- und Westdeutscher Rundfunkverband",
  "rico:date": "1959-05-09",
  "rico:hasDocumentaryFormType": { "@id": "m3gim-dft:quittung" },
  "rico:hasOrHadLanguage": "de",
  "rico:hasExtent": "1 Blatt, 1 Seite",
  "m3gim:bearbeitungsstand": "abgeschlossen",
  "m3gim:hasDetail": {
    "@type": "m3gim:DetailAnnotation",
    "m3gim:detailField": "einnahmen",
    "m3gim:detailValue": "1360, DM",
    "m3gim:detailRole": "erwähnt",
    "m3gim:monetaryAmount": { "@value": "1360", "@type": "xsd:decimal" },
    "m3gim:currency": "DM",
    "m3gim:xlsxSource": { "m3gim:xlsxSheet": "Box_01", "m3gim:xlsxRow": 1131 }
  },
  "m3gim:hasSpatiotemporalEvent": { "@id": "m3gim:ste_NIM_007_6_018697b4" },
  "m3gim:hasPerformance": { "@id": "m3gim:perf_NIM_007_6_197" },
  "m3gim:hasAssociatedAgent": [
    {
      "name": "Nord- und Westdeutscher Rundfunkverband",
      "@id": "wd:Q1997444",
      "owl:sameAs": "http://www.wikidata.org/entity/Q1997444",
      "m3gim:inception": "1956",
      "role": "verfasser",
      "m3gim:xlsxSource": { "m3gim:xlsxSheet": "Box_01", "m3gim:xlsxRow": 1132 },
      "@type": "rico:CorporateBody",
      "m3gim:sitz": "Köln",
      "m3gim:editorialNote": "Rundfunk"
    },
    {
      "name": "Malaniuk, Ira",
      "@id": "wd:Q94208",
      "owl:sameAs": "http://www.wikidata.org/entity/Q94208",
      "role": "adressat",
      "m3gim:xlsxSource": { "m3gim:xlsxSheet": "Box_01", "m3gim:xlsxRow": 1134 },
      "m3gim:editorialNote": "Mezzosopranistin, Projektgegenstand",
      "m3gim:lifespan": "1919–2009",
      "@type": "rico:Person"
    }
  ],
  "rico:hasOrHadLocation": {
    "name": "Köln",
    "role": "erwähnt",
    "m3gim:xlsxSource": { "m3gim:xlsxSheet": "Box_01", "m3gim:xlsxRow": 1133 },
    "@type": "rico:Place"
  },
  "rico:hasOrHadSubject": {
    "name": "Paradies und Peri",
    "role": "erwähnt",
    "m3gim:xlsxSource": { "m3gim:xlsxSheet": "Box_01", "m3gim:xlsxRow": 1136 },
    "@type": "m3gim:MusicalWork",
    "m3gim:partie": "Engel",
    "m3gim:editorialNote": "Schumann, Robert (UAKUG/NIM_007_6)"
  },
  "m3gim:ausstrahlungsdatum": "1959-11-18",
  "m3gim:ueberweisungsdatum": "1959-08-31"
}
```

Nachher, unter Option C aus Abschnitt 6, weshalb die beiden Datums-Properties am Ende in ein `DatedEvent` wandern:

```json
{
  "@id": "m3gim-data:NIM_007_6",
  "@type": "rico:Record",
  "rico:identifier": "UAKUG/NIM_007 6",
  "m3gim-ontology:xlsxSource": {
    "m3gim-ontology:xlsxSheet": "Objekte",
    "m3gim-ontology:xlsxRow": 130
  },
  "rico:title": "Mittelung über Honorar für Sendung Paradies und Peri 1959 von Nord- und Westdeutscher Rundfunkverband",
  "rico:date": "1959-05-09",
  "rico:hasDocumentaryFormType": { "@id": "m3gim-vocab:receipt" },
  "rico:hasOrHadLanguage": "de",
  "rico:hasExtent": "1 Blatt, 1 Seite",
  "m3gim-ontology:processingStatus": "abgeschlossen",
  "m3gim-ontology:hasDetail": {
    "@type": "m3gim-ontology:DetailAnnotation",
    "m3gim-ontology:detailField": "einnahmen",
    "m3gim-ontology:detailValue": "1360, DM",
    "m3gim-ontology:detailRole": "erwähnt",
    "m3gim-ontology:monetaryAmount": { "@value": "1360", "@type": "xsd:decimal" },
    "m3gim-ontology:currency": "DM",
    "m3gim-ontology:xlsxSource": {
      "m3gim-ontology:xlsxSheet": "Box_01",
      "m3gim-ontology:xlsxRow": 1131
    }
  },
  "m3gim-ontology:hasSpatiotemporalEvent": { "@id": "m3gim-data:ste_NIM_007_6_018697b4" },
  "m3gim-ontology:hasPerformance": { "@id": "m3gim-data:perf_NIM_007_6_197" },
  "m3gim-ontology:hasAssociatedAgent": [
    {
      "name": "Nord- und Westdeutscher Rundfunkverband",
      "@id": "wd:Q1997444",
      "owl:sameAs": "http://www.wikidata.org/entity/Q1997444",
      "m3gim-ontology:wdInception": "1956",
      "role": "verfasser",
      "m3gim-ontology:xlsxSource": {
        "m3gim-ontology:xlsxSheet": "Box_01",
        "m3gim-ontology:xlsxRow": 1132
      },
      "@type": "rico:CorporateBody",
      "m3gim-ontology:headquarters": "Köln",
      "m3gim-ontology:indexNote": "Rundfunk"
    },
    {
      "name": "Malaniuk, Ira",
      "@id": "wd:Q94208",
      "owl:sameAs": "http://www.wikidata.org/entity/Q94208",
      "role": "adressat",
      "m3gim-ontology:xlsxSource": {
        "m3gim-ontology:xlsxSheet": "Box_01",
        "m3gim-ontology:xlsxRow": 1134
      },
      "m3gim-ontology:indexNote": "Mezzosopranistin, Projektgegenstand",
      "m3gim-ontology:lifespan": "1919–2009",
      "@type": "rico:Person"
    }
  ],
  "rico:hasOrHadLocation": {
    "name": "Köln",
    "role": "erwähnt",
    "m3gim-ontology:xlsxSource": {
      "m3gim-ontology:xlsxSheet": "Box_01",
      "m3gim-ontology:xlsxRow": 1133
    },
    "@type": "rico:Place"
  },
  "rico:hasOrHadSubject": {
    "name": "Paradies und Peri",
    "role": "erwähnt",
    "m3gim-ontology:xlsxSource": {
      "m3gim-ontology:xlsxSheet": "Box_01",
      "m3gim-ontology:xlsxRow": 1136
    },
    "@type": "m3gim-ontology:MusicalWork",
    "m3gim-ontology:sungPart": "Engel",
    "m3gim-ontology:indexNote": "Schumann, Robert (UAKUG/NIM_007_6)"
  },
  "m3gim-ontology:hasDatedEvent": [
    {
      "@type": "m3gim-ontology:DatedEvent",
      "m3gim-ontology:dateValue": "1959-11-18",
      "m3gim-ontology:dateRole": "ausstrahlung"
    },
    {
      "@type": "m3gim-ontology:DatedEvent",
      "m3gim-ontology:dateValue": "1959-08-31",
      "m3gim-ontology:dateRole": "überweisung"
    }
  ]
}
```

Drei Punkte fallen an diesem Beispiel auf. Die Rollenliterale `verfasser`, `adressat`, `erwähnt`, `ausstrahlung` und `überweisung` bleiben deutsch, weil sie Werte sind und aus `skos:prefLabel` stammen. Der Dokumenttyp wechselt die Kennung von `m3gim-dft:quittung` auf `m3gim-vocab:receipt`, während sein Anzeigelabel Quittung bleibt. Unter Option B aus Abschnitt 6 stünden am Ende stattdessen `m3gim-ontology:broadcastDate` und `m3gim-ontology:transferDate` als Literale am Record.

### 8.3 Ein Bühnenrollen-Knoten

Vorher:

```json
{
  "@id": "m3gim:role_lady_macbeth",
  "@type": "m3gim:StageRole",
  "rico:name": "Lady Macbeth"
}
```

Nachher:

```json
{
  "@id": "m3gim-data:stagerole_lady_macbeth",
  "@type": "m3gim-ontology:StageRole",
  "rico:name": "Lady Macbeth"
}
```

Der Knoten ist der kleinste des Datensatzes und trägt trotzdem beide Probleme der heutigen Namensgebung. Sein Präfix `role_` legt eine Zugehörigkeit zum Rollenvokabular nahe, die nicht besteht, und sein Namespace unterscheidet ihn nicht von der Klasse, deren Instanz er ist. Nach der Umbenennung sagt die Kennung, dass es sich um Bestandsdaten handelt (`m3gim-data:`) und um eine Bühnenrolle (`stagerole_`).

Die Verweise auf diesen Knoten ändern sich mit. Ein Aufführungsknoten trägt heute `"m3gim:hasStageRole": {"@id": "m3gim:role_lady_macbeth"}` und künftig `"m3gim-ontology:hasStageRole": {"@id": "m3gim-data:stagerole_lady_macbeth"}`.

### 8.4 Ein Vokabularbegriff

Vorher, aus `vocab/m3gim.ttl`:

```turtle
m3gim-role:absendedatum a skos:Concept ;
    skos:prefLabel "absendedatum"@de ;
    skos:definition "Datierung des Absendens eines Korrespondenzstücks."@de ;
    skos:inScheme m3gim-role:scheme .

m3gim-role:datumsrollen
    a skos:Collection ;
    skos:prefLabel "Datumsrollen"@de ;
    skos:member m3gim-role:abreisedatum , m3gim-role:absendedatum , ... .
```

Nachher:

```turtle
m3gim-vocab:dispatchDate a skos:Concept ;
    skos:prefLabel "absendedatum"@de ;
    skos:altLabel "dispatch date"@en ;
    skos:definition "Datierung des Absendens eines Korrespondenzstücks."@de ;
    skos:definition "Date on which an item of correspondence was dispatched."@en ;
    skos:inScheme m3gim-vocab:dateRoles .

m3gim-vocab:rolesAtDates
    a skos:Collection ;
    skos:prefLabel "Datumsrollen"@de ;
    skos:altLabel "roles occurring at dates"@en ;
    skos:member m3gim-vocab:departureDate , m3gim-vocab:dispatchDate , ... .
```

Der Begriff zeigt die vier Bewegungen der Karte an einer Stelle. Der lokale Name wird englisch, das deutsche Anzeigelabel bleibt als `skos:prefLabel` in der Schreibung der Quelle, ein englisches Label kommt als `skos:altLabel` hinzu, und das Scheme wechselt vom Sammelscheme auf das sortenreine `dateRoles`. Die Collection bleibt daneben bestehen, weil sie eine andere Frage beantwortet als das Scheme.

Der neue lokale Name `dispatchDate` ist zugleich der Fallbackname der Ontologie-Property `m3gim:absendedatum`. Beide Bezeichner tragen im Zielzustand dieselbe Zeichenfolge in verschiedenen Namespaces. Genau das ist der Befund, der Abschnitt 6 begründet.

## 9. Was der Operator entscheiden muss

Die folgenden Punkte sind in der Karte als Vorschlag mit Alternativen geführt und brauchen eine Entscheidung, bevor der Umbau beginnt.

### 9.1 Strukturell

1. **Redundanz der Datums-Properties**, Abschnitt 6, Optionen A, B und C mit der Empfehlung C. Die Entscheidung bestimmt elf Zeilen der Karte und die Substanz zweier Frontend-Register.
2. **`spielzeitVon` und `spielzeitBis`**, ob die Spanne zerlegt wird oder ein Term `season` sie trägt.
3. **Alias-Schlüssel `komponist` im `@context`**, ob er zu `composer` wird und damit zwei Frontend-Stellen bricht.
4. **Instanzpräfix `stagerole_`** anstelle von `role_`, und ob der Legacy-Alias im URL-Hash gebaut wird.
5. **`_sammlung`-Suffix** der Konvolut-Sammelzeilen, ob es zu `_collection` wird.

### 9.2 Fachlich strittige Übersetzungen

| Term | Vorschlag | Alternativen | Warum strittig |
|---|---|---|---|
| `PerformanceEvent` | `FramingEvent` | `EventSeries`, `Festival` | Klassenumbenennung, größerer Eingriff als eine Property |
| `sitz` | `headquarters` | `seat`, `basedIn` | Das vorhandene Label „seat" ist im Englischen missverständlich |
| `partie` | `sungPart` | `part`, `roleName` | Das vorhandene Label „part" kollidiert semantisch mit `rico:hasOrHadPart` |
| `editorialNote` | `indexNote` | `curatorialNote`, `sourceNote` | Der heutige Name kollidiert mit `skos:editorialNote` |
| `konvolut` | `bundle` | `file`, `convolute` | Archivischer Fachterminus ohne festes englisches Gegenstück |
| `kritik` und `rezension` | `critique` und `review` | `performanceReview` und `review` | Beide ohne Definition, im Englischen fallen sie zusammen |
| `leitung` | `unspecifiedDirection` | `direction`, `management` | Der Wert ist laut Vokabular selbst unbestimmt |
| `buehnenleiter` | `stageManager` | `headOfStage` | Ohne Definition, deutscher Begriff mehrdeutig |
| `auftrag` | offen | `assignment`, `commission` | Bedeutung laut Vokabular aus den Daten nicht bestimmbar |
| `agent` | `artistAgent` | `agent` | Der nackte Name kollidiert im Lesen mit `rico:Agent` |
| `inception` | `wdInception` | `inception` | Konsistenz der `wd`-Marker gegen Bestandsschonung |
| `konvolutCount` | `recordSetCount` | `aggregationCount` | Label und gezählte Klasse weichen voneinander ab |
| `agentRelation` | `hasAgentRelation` | `agentRelation` | Konsistenz der `has*`-Familie gegen Bestandsschonung |
| `datenpunktId` | `dataPointId` | `activityId` plus `participationId` | Der Term wird von E-127 und E-128 ohnehin abgelöst |

### 9.3 Was die Karte nicht entscheidet

Vier offene Modellfragen berührt die Karte, ohne sie zu lösen. Die Abgrenzung von `sammlung` gegen `konvolut`, der Status von `protagonist`, die Doppelrepräsentation der Partie als Literal und als Entität sowie die Frage, ob die Rollenwerte künftig als Concept-IRI statt als Literal im Datensatz stehen. Die letzte hängt eng an dieser Karte, weil sie entscheidet, ob die englischen Concept-Namen jemals in den Daten sichtbar werden oder ob dort dauerhaft die deutschen `prefLabel` stehen.
