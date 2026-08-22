---
title: "Datenmodell"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.4
created: 2026-02-19
updated: 2026-08-22
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Datengrundlage
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/data
topics: ["[[RiC-O]]", "[[AgRelOn]]", "[[Data Modelling]]", "[[Controlled Vocabularies]]"]
knowledge-sources:
  vocabulary: ../vocab/m3gim.ttl
  standards:
    RiC-O: https://www.ica.org/en/records-context-ontology
    AgRelOn: https://d-nb.info/standards/elementset/agrelon
    SKOS: http://www.w3.org/2004/02/skos/core
    Wikidata: https://www.wikidata.org
related: [data, pipeline-architecture, architecture-decisions, specification, research-framework, testing, data-entry-guidelines, data-errors]
---

# M³GIM Datenmodell

Dieses Dokument führt das formale Modell, also Klassen, Properties, kontrollierte Vokabulare und Serialisierung. Das Quellmaterial dazu, also Schichtenmodell, Tabellenaufbau, Verknüpfungsmechanismus, Rollenlisten und Datumskonventionen, steht in [data.md](data.md). Beide Dokumente behalten die Abschnittsnummern, die sie vor ihrer Teilung hatten; dieses Dokument führt die Abschnitte 7 bis 13 und 16, data.md die übrigen. Die Nummerierung ist deshalb nicht fortlaufend, was eine Setzung ist und kein Versehen, weil Verweise aus Code, Tests und Vokabular an ihr hängen.

Die formale Fassung der Terme steht in [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl). Eine Modelländerung wird zuerst hier verankert, danach im Vokabular, danach im Test und zuletzt in der Pipeline (E-133). Adressiert ist auch, wer mit dem erzeugten Datensatz arbeitet, ohne die Pipeline zu kennen, also ein Agent, der Abfragen formuliert oder Aussagen interpretiert.

## 7. RiC-O-Kern und m3gim-Erweiterung

### Namensräume

Die projekteigenen Terme stehen seit E-138 in drei Namensräumen, geschieden nach der Art der benannten Sache. Der frühere gemeinsame Namensraum `m3gim:` ist damit aufgelöst, ebenso die früheren `m3gim-dft:` und `m3gim-role:`, die in `m3gim-vocab:` aufgehen. Die projekteigenen Termnamen sind durchgängig englisch, die deutsch bleibenden Anzeigewerte stehen als `skos:prefLabel`.

| Prefix | URI | Zweck |
|---|---|---|
| `m3gim-ontology` | `https://dhcraft.org/m3gim/ontology#` | projekteigene Klassen und Properties |
| `m3gim-vocab` | `https://dhcraft.org/m3gim/vocabulary#` | kontrollierte Begriffe, Schemes und Collections |
| `m3gim-data` | `https://dhcraft.org/m3gim/data#` | Instanzen des Bestands |
| `rico` | `https://www.ica.org/standards/RiC/ontology#` | archivisches Kernmodell, Records in Contexts Ontology 1.1 |
| `ric-rst` | `https://www.ica.org/standards/RiC/vocabularies/recordSetTypes#` | RiC-O-Vokabular der RecordSet-Typen, verwendet für Fonds und File |
| `agrelon` | `https://d-nb.info/standards/elementset/agrelon#` | Beziehungen zwischen Akteuren und das Muster für Meta-Aussagen |
| `schema` | `https://schema.org/` | Lebensdaten von Personen |
| `gndo` | `https://d-nb.info/standards/elementset/gnd#` | Berufsangabe als Literal |
| `wd` | `http://www.wikidata.org/entity/` | Wikidata-Entitäten als Identifikatoren |
| `owl` | `http://www.w3.org/2002/07/owl#` | `owl:sameAs` an abgeglichenen Entitäten |
| `geo` | `http://www.w3.org/2003/01/geo/wgs84_pos#` | Koordinaten nach WGS84 |
| `skos` | `http://www.w3.org/2004/02/skos/core#` | Organisation der kontrollierten Vokabulare |
| `xsd` | `http://www.w3.org/2001/XMLSchema#` | Datatypes |

Instanzen und Ontologie teilen sich damit keinen Raum mehr. Eine Aufführung mit der Kennung `m3gim-data:perf_NIM_004_2_1` und die Property `m3gim-ontology:hasPerformance` sind auseinandergehalten, wie RiC-O selbst zwischen Ontologie und Instanzen trennt. Der Instanz-Namensraum trägt keine benannten Vokabularbezeichner und ist im Vokabular nur deklariert.

Zeichengleiche Namen in verschiedenen Namensräumen sind zulässig und bezeichnen verschiedene Sachen. Das betrifft die Property `m3gim-ontology:composer` gegen den Rollenwert `m3gim-vocab:composer` sowie die Klasse `m3gim-ontology:FramingEvent` gegen den Rollenwert `m3gim-vocab:framingEvent`.

### RiC-O-Kern

Hierarchie. `rico:RecordSet` (Konvolut, Fonds) mit `rico:Record` (Einzelstück), verbunden über `rico:hasOrHadPart`. Der Typ eines RecordSet steht als `rico:hasRecordSetType` mit einem Wert aus `ric-rst:`, im Bestand `ric-rst:Fonds` für den Gesamtbestand und `ric-rst:File` für die Konvolute. Agenten-Typen `rico:Person`, `rico:CorporateBody`, `rico:Group`, Orte `rico:Place`. Beschreibungs-Properties `rico:identifier`, `rico:title`, `rico:date`, `rico:creationDate`, `rico:hasExtent`, `rico:hasOrHadLanguage`, `rico:generalDescription`, `rico:name`. Relationen `rico:hasOrHadLocation`, `rico:hasOrHadSubject`, `rico:hasDocumentaryFormType`.

`rico:date` bleibt am Dokument und trägt die archivische Datierung der Einheit. Die reine Entstehungsdatierung eines Dokuments steht daneben auf `rico:creationDate`; die frühere projekteigene Property `m3gim:erstelldatum` war eine nackte Unterproperty dieses Terms mit derselben Domain und derselben Bedeutung und ist entfallen.

**Anschlusskanten.** Vier Kanten verbinden die projekteigenen Aussagen mit RiC-O und sind gegen die offiziellen Komponentenlisten von RiC-O 1.1 belegt (ICA-EGAD, `ontology/current-version/CSV_lists_of_components`).

- `m3gim-ontology:hasPerformance` ist `rdfs:subPropertyOf rico:isAssociatedWithEvent`.
- `m3gim-ontology:atPlace` ist `rdfs:subPropertyOf rico:hasOrHadLocation`.
- `m3gim-ontology:hasPerformer` ist `rdfs:subPropertyOf rico:hasOrHadParticipant`.
- `m3gim-ontology:atDate` ist `rdfs:subPropertyOf rico:date`.

Wer nur die RiC-O-Ebene abfragt, erhält damit die projekteigenen Aussagen mit. Zwei früher gesetzte Kanten sind mit E-136 entfallen. `m3gim-ontology:hasAnnotation` trägt keine Unterproperty-Kante auf `rico:isAssociatedWithEvent` mehr, weil der Zielknoten jetzt auch Finanzposten trägt, die kein Ereignis sind. Die Kante auf `rico:beginningDate` ist mit der typisierten Property `m3gim:probenbeginn` entfallen; sie behauptete am Dokument den Beginn seiner Laufzeit.

**Konformitäts-Korrektur (E-103).** Der Web-Audit gegen RiC-O 1.1 hat im damaligen Output emittierte Terme als nicht konform belegt. (1) `rico:isAssociatedWithRecord` existiert nicht; die `isAssociatedWith*`-Familie kennt nur `Date/Event/Place/Rule`. Record-Bezüge laufen über `rico:hasOrHadPart`/`isOrWasPartOf` oder eine konkrete RecordResource-Relation, ein Event-zu-Record-Bezug über `rico:isAssociatedWithEvent` von der Record-Seite. (2)/(3) `rico:File` und `rico:Fonds` sind keine Klassen und stehen nicht im `rico:`-Namensraum, sondern sind Werte des Vokabulars `ric-rst:`; ein Fonds oder eine File ist ein `rico:RecordSet` mit `rico:hasRecordSetType`. Alle drei Korrekturen sind umgesetzt, der Datensatz führt die genannten Fehlformen nicht mehr.

**Drei offene Wertform-Abweichungen.** Der Termkonformitätstest `tests/test_26_term_conformance.py` prüft, ob ein externer Term existiert. Ob der Wert zu dessen Range passt, bleibt ungeprüft. Der Abgleich gegen die Komponentenlisten zeigt drei Stellen, an denen eine Object Property eine Wertform erhält, die ihre Range ausschließt.

- `rico:hasOrHadLanguage` erwartet ein Individuum der Klasse `rico:Language` und bekommt eine Zeichenkette.
- `rico:hasExtent` erwartet `rico:Extent` und bekommt eine Zeichenkette.
- `rico:hasDocumentaryFormType` erwartet `rico:DocumentaryFormType` und bekommt ein Concept, das nur als `skos:Concept` typisiert ist.

**RiC-O trägt mehr, als das Projekt nutzt.** Die Rollen `verfasser`, `adressat`, `absender`, `empfänger` und `herausgeber` haben in RiC-O 1.1 eigene Object Properties, nämlich `rico:hasCreator`, `rico:hasAddressee`, `rico:hasSender`, `rico:hasReceiver` und `rico:hasPublisher`. Das Projekt führt sie als Rollenwerte an der Sammelproperty `m3gim-ontology:hasAssociatedAgent`, die deshalb bewusst ohne `rdfs:subPropertyOf` steht, weil eine Sammelkante keine von ihnen korrekt spezialisieren kann. Ebenso existiert `rico:Activity` als Unterklasse von `rico:Event` für zielgerichtetes Geschehen, also genau die Aufhängung, für die das Zielmodell `crm:E7_Activity` aus CIDOC-CRM vorsieht. Beide Punkte sind offene Fragen an das Projekt.

### m3gim-Klassen

| Klasse | Oberklasse | Zweck |
|---|---|---|
| `m3gim-ontology:MusicalWork` | `rico:Thing` | musikalisches Werk (Oper, Lied, Oratorium, Konzert), über den Werkindex identifiziert |
| `m3gim-ontology:Performance` | `rico:Event` | Ereignis, in dem ein Werk realisiert wird; zugleich Reifikationsknoten für die Komposite aus Bühnenrolle und Interpret sowie aus Datum und Werk |
| `m3gim-ontology:FramingEvent` | `rico:Event` | übergeordnete Veranstaltung, in deren Rahmen einzelne Aufführungen stattfinden (Festspiele, Konzertreihe, Spielzeit) |
| `m3gim-ontology:Annotation` | keine | erfasste Angabe zu einem Dokument: Datierung, Verortung, Detailangabe, Finanzposten |
| `m3gim-ontology:StageRole` | `rico:Thing` | Partie eines Werks als eigenständige, wiederverwendete Entität |

### Begründung der Klassen

`m3gim-ontology:Annotation` ist die tragende Änderung aus E-136. Jede Datierung, Verortung und Detailangabe hängt als eigener Annotationsknoten am Subjekt, trägt ihren Wert in einer festen Wertproperty und ihre erfasste Rolle in einer einzigen Rollenproperty aus dem gemeinsamen Vokabular, sodass kein Property-Name mehr eine Rolle ausdrückt und ein Konsument alle Datierungen eines Dokuments über eine Schleife erreicht. Fehlt der Ort, ist es eine reine Datierung; fehlt das Datum, eine reine Verortung. Die Klasse tritt an die Stelle von `m3gim:SpatiotemporalEvent`, `m3gim:DatedEvent` und `m3gim:DetailAnnotation`.

Für `m3gim-ontology:Annotation` ist keine Oberklasse festgelegt. Die beiden Vorgängerklassen `SpatiotemporalEvent` und `DatedEvent` trugen `rdfs:subClassOf rico:Event`; diese Kante entfällt, weil die Klasse jetzt auch Finanzposten trägt, die kein Ereignis sind. RiC-O 1.1 bietet keine passende Aufhängung, weil die Detailangabe weder Ereignis noch Beschreibungselement einer Ressource ist. Ob sie als Reifikation einer Aussage modelliert werden soll, ist offen.

Eine Datumszeile und eine Ortszeile derselben Rolle werden nicht zu einem Knoten zusammengeführt (E-139). Die Zusammenführung würde eine Zusammengehörigkeit behaupten, die die Erfassung so nicht erfasst hat; die Ableitung bleibt dem Frontend überlassen. Damit bleibt `m3gim-ontology:xlsxSource` je Knoten einwertig.

`m3gim-ontology:FramingEvent` heißt seit E-139 so. Der frühere Name `m3gim:PerformanceEvent` sagte Aufführungsereignis und meinte die übergeordnete Veranstaltung, was ihn gegen `m3gim-ontology:Performance` austauschbar erscheinen ließ; der neue Name folgt dem englischen Label des Terms.

`m3gim-ontology:StageRole` trägt der Tatsache Rechnung, dass Bühnenrollen im Datenbestand als eigenständige Entität geführt werden sollten und nicht als String-Attribut. Partien wie *Waltraute*, *Brangäne*, *2. Norn* oder *Alt Solo* sind wiederkehrende referenzierbare Rollen mit Stimmfach und Werkzugehörigkeit.

### Rollen als eine einzige Property (E-137)

Die Erfassung führt eine einzige Rollenspalte. Vor dem Umbau verteilte die Pipeline deren Werte je nach Verknüpfungstyp auf `m3gim:role`, `m3gim:eventRole`, `m3gim:dateRole` und `m3gim:detailRole`. Die vier zogen bereits aus einem einzigen Vokabular und fallen deshalb zu `m3gim-ontology:role` zusammen.

Die Property ist `owl:ObjectProperty` mit `rdfs:range skos:Concept`. Der Rollenwert steht als Verweis auf ein Concept des Vokabulars `m3gim-vocab`, und der Verweisknoten führt dessen `skos:prefLabel` mit, damit der Anzeigetext ohne Nachschlagen im Vokabular verfügbar ist. Damit sind die Bezeichner des Vokabulars in den Daten sichtbar, die Werte über die IRI maschinell auswertbar, und das Frontend braucht keine Handtabelle für die Anzeigeform.

Wo die Quelle keine Rolle führt, trägt der Knoten keine. Eine aus der Stellung erschlossene Rolle entsteht an keiner Stelle. Ein Wert außerhalb des Vokabulars bleibt als Literal stehen; das betrifft im Bestand den Vertragsstatus `nicht eingehalten` (Abschnitt 11).

Die Rolle gilt nur im Kontext des jeweiligen Dokuments, hängt aber am Entitätsknoten. Trägt dieser eine Wikidata-IRI, geht der Dokumentkontext beim Zusammenführen zu RDF verloren (Abschnitt 16). Wie die Rolle an das Dokument gebunden wird, ist mit dem Projekt zu klären.

### Identität der Entitäten

`m3gim-ontology:Annotation`-Instanzen bekommen eine inhaltsbasierte `@id` der Form `m3gim-data:ev_<record-local-id>_<sha1(ort\x1frolle\x1fdatum)[:8]>`, mit stabilem Ordinal-Suffix `-N` bei echten Inhaltsdubletten auf demselben Record (E-115). Die `@id` ist damit eine reine Funktion ihres Inhalts und stabil gegen die Zeilenreihenfolge im XLSX. Der Typmarker lautet `ev_`; der frühere Marker `ste_` stand für das raumzeitliche Ereignis und trüge nach der Zusammenführung auf eine Klasse keine Unterscheidung mehr.

`m3gim-ontology:StageRole`-Instanzen bekommen eine deterministische Slug-`@id` der Form `m3gim-data:stagerole_<slug>` mit Umlaut-Transliteration und werden darüber dedupliziert. Der frühere Präfix `role_` legte eine Zugehörigkeit zum Rollenvokabular nahe, die nicht besteht; der Marker ist aus dem Klassennamen abgeleitet. Das Vokabular `m3gim-vocab` bleibt davon getrennt, es trägt die Relationsrollen als Werte und nicht die Bühnenrollen-Entitäten. `m3gim-ontology:hasStageRole` hängt an der `m3gim-ontology:Performance` und nicht am Record.

Dokumente und Konvolute behalten die Archivsignatur als lokalen Namen (`m3gim-data:NIM_011_5`). Ein zusätzlicher Typmarker brächte keine Unterscheidungsleistung und bräche jeden Bookmark ein zweites Mal, weil die Record-Kennung in den URL-Hash der Anwendung wandert.

### m3gim-Object-Properties

| Property | Domain → Range | Zweck |
|---|---|---|
| `m3gim-ontology:hasAssociatedAgent` | Record, RecordSet → `rico:Agent` | Agenten-Verknüpfung; die Art der Beteiligung steht als `m3gim-ontology:role` am verbundenen Knoten |
| `m3gim-ontology:hasPerformance` | Record, RecordSet → Performance | Archivressource bezeugt eine Aufführung |
| `m3gim-ontology:hasAnnotation` | Record, RecordSet → Annotation | Archivressource bezeugt eine Datierung, Verortung, Detailangabe oder einen Finanzposten |
| `m3gim-ontology:hasDetail` | Record → Annotation | Detailangabe der dritten Erschließungsschicht, Unterproperty von `hasAnnotation` |
| `m3gim-ontology:hasPerformer` | Performance → `rico:Person` | Person wirkt bei einer Aufführung mit |
| `m3gim-ontology:performanceOf` | Performance → MusicalWork | Aufführung eines Werks |
| `m3gim-ontology:hasStageRole` | Performance → StageRole | in der Aufführung besetzte Partie |
| `m3gim-ontology:atPlace` | Annotation → `rico:Place` | Verortung eines Annotationsknotens |
| `m3gim-ontology:role` | Person, CorporateBody, Group, Place, MusicalWork, FramingEvent, Annotation → `skos:Concept` | erfasste Rolle im Dokumentkontext |
| `m3gim-ontology:hasAgentRelation` | Record, RecordSet → ohne Range | n-är reifizierte AgRelOn-Beziehung, für die die Ressource der Beleg ist (Abschnitt 8) |
| `m3gim-ontology:xlsxSource` | ohne Domain, ohne Range | technische Quellzellenadresse (Abschnitt 9) |

`m3gim-ontology:hasDetail` bleibt als Unterproperty von `hasAnnotation` erhalten, obwohl Zielknoten und Aspektknoten jetzt dieselbe Klasse tragen. Sie hält den Finanzposten in einem Tripel adressierbar und erhält den Zugriffspfad, den das Frontend liest. `hasAgentRelation` steht ohne Range, weil AgRelOn die Beziehungsklassen nicht unter einer gemeinsamen, hier belegten Oberklasse führt. `xlsxSource` steht ohne Domain, weil die Property an Dokumenten, Annotationen, Aufführungen, Beziehungen und an allen aus einer Verknüpfungszeile abgeleiteten Entitätsknoten steht, und ohne Range, weil der Container ein typloser Knoten ist.

Die Funktion einer Mitwirkung, also Gesang, Dirigat oder Regie, ist an `hasPerformer` nicht ausgedrückt. Sie steht am Personenknoten in `m3gim-ontology:role` und gilt damit im Dokumentkontext; der Aufführung ist sie nicht zugeordnet. Das behebt erst das Zielmodell weiter unten.

### m3gim-Datatype-Properties

**Beschreibung und Rollen.**

| Property | Typ | Domain | Zweck |
|---|---|---|---|
| `m3gim-ontology:composer` | xsd:string | MusicalWork | kuratierte Komponistenangabe aus dem Werkindex, Ansetzungsform Nachname, Vorname |
| `m3gim-ontology:derivedFromRole` | xsd:string | ohne Domain | Rollenwert der Quelle, aus dem die am Knoten stehende Rolle abgeleitet ist |

`m3gim-ontology:derivedFromRole` hält den Ursprungswert fest, wo mehrere erfasste Rollen im Vokabular zu einem Concept zusammengeführt sind. Ohne ihn ist die Zusammenführung von `auftritt` auf `aufführung` sowie von `erstelldatum` und `entstehungsort` auf `entstehung` irreversibel, sobald die Quelle nicht mehr befragt wird. Die Pipeline setzt den Term überall dort, wo der erfasste Wert nicht das `skos:prefLabel` des Concepts ist, auf das er im Vokabular führt; er steht damit an jedem Knoten, dessen Rolle beim Umbau eine andere Schreibung bekommen hat. Er steht ohne Domain, weil die zusammengeführten Rollen an Annotationsknoten und an Entitätsreferenzen gleichermaßen vorkommen.

**Datierung.**

| Property | Typ | Domain | Zweck |
|---|---|---|---|
| `m3gim-ontology:atDate` | xsd:string | Annotation, Performance | Datierung im Wortlaut der normalisierten Quelle |

Alle Datumswerte sind Zeichenketten, weil historische Datierung die ISO-Schema-Strenge von `xsd:date` regelmäßig überschreitet, durch Zeitspannen in der Form `1952/1953`, durch unvollständige Angaben und durch die Qualifier `circa:`, `vor:` und `nach:`. Wer nach Zeit filtert, parst diese Formen selbst.

Fehlt die Datierung am Annotationsknoten, ist dieser bewusst undatiert, weil die Quelle kein Datum hergibt. Am Aufführungsknoten bleibt die Datierung, wo sie steht; dort ist das Datum die Datierung des Ereignisses selbst, eine Rollenangabe hätte keinen Gegenstand, und keine Aufführung des Bestands trägt zwei Datierungen.

**Finanzschicht.**

| Property | Typ | Domain | Zweck |
|---|---|---|---|
| `m3gim-ontology:detailField` | xsd:string | Annotation | Art des Postens; belegt sind die Finanzfelder `ausgaben`, `einnahmen`, `summe` |
| `m3gim-ontology:detailValue` | xsd:string | Annotation | unveränderter Zellwert, aus dem Betrag und Währung geparst werden |
| `m3gim-ontology:monetaryAmount` | xsd:decimal | Annotation | geparster Geldbetrag |
| `m3gim-ontology:currency` | xsd:string | Annotation | Währung des Betrags |

**Bearbeitungsstand und Datenqualität.**

| Property | Typ | Domain | Zweck |
|---|---|---|---|
| `m3gim-ontology:processingStatus` | xsd:string | Record | projektinterner Erschließungsstand, normalisiert auf `begonnen`, `abgeschlossen`, `zurueckgestellt` |
| `m3gim-ontology:processingNote` | xsd:string | Record | redaktionelle Anmerkung aus dem Klammeranhang der Statusspalte |
| `m3gim-ontology:accessStatus` | xsd:string | Record | benutzungsrechtlicher Zugangsstatus aus der Quellspalte `zugaenglichkeit`, Werte `offen`, `eingeschraenkt`, `gesperrt` |
| `m3gim-ontology:digitizationStatus` | xsd:string | Record | Digitalisierungsstand aus der Quellspalte `scan_status`, Werte `nicht_gescannt`, `gescannt`, `online` |
| `m3gim-ontology:dataQualityFlag` | xsd:string | ohne Domain | kontrolliertes Signal für eine Unsicherheit der Erfassung |
| `m3gim-ontology:qualityConfidence` | xsd:decimal | ohne Domain | Konfidenz des Flags, getrennt von der Konfidenz der inhaltlichen Aussage |

`accessStatus` und `digitizationStatus` werden bedingt emittiert, `scripts/transform.py` setzt sie nur bei belegter Quellspalte. Der aktuelle Objekt-Export führt diese Spalten nicht, weshalb die Terme im Datensatz nicht vorkommen; sie tragen dafür im Vokabular eine `skos:editorialNote` mit dem Marker `unused:`, den `tests/test_46_vocab_vacancy.py` als Entschuldigung eines leeren Terms verlangt.

`m3gim-ontology:dataQualityFlag` zieht aus einem kontrollierten Wertevorrat, abgeleitet aus Unsicherheitssignalen im `anmerkung`-Feld. Belegte Werte sind `name-nicht-eindeutig`, `vorname-fehlt`, `rolle-unsicher`, `quelle-tippfehler` und `datierung-malformed`. Das Flag steht ohne Domain, weil es an jede aus einer Verknüpfungszeile abgeleitete Entität wandern kann, auf die sich die Unsicherheit bezieht. Es nimmt die Notationsabweichungen der Quelle auf, die zuvor die Modellgestalt bestimmt haben. Eine Datierung, deren Notation kein ISO-Datum ergibt, wird mit `datierung-malformed` markiert, statt eine eigene Bauform zu erzwingen. Die Werte stehen als Literale ohne Concept-IRI, ein Schema für sie existiert nicht; ob eines angelegt wird, ist offen.

`m3gim-ontology:qualityConfidence` ist deklariert und bewusst unbefüllt (E-102, E-106). Die `anmerkung`-Freitexte liefern kein quantifizierbares Konfidenzsignal, und ein gesetzter Zahlenwert wäre genau die von der Leitplanke verbotene erfundene Konfidenz. Das Flag selbst ist das Unsicherheitssignal, die Property für eine künftige belegbare Quelle reserviert.

Der Bearbeitungsstand führt ein zweites, abweichendes Wertesystem mit sich. [data.md](data.md) § 15 nennt aus der Erfassungshandreichung die Stufen `in_bearbeitung`, `schicht1_fertig`, `schicht2_fertig` und `abgeschlossen`, die den Schichtfortschritt abbilden. Welches System gilt, ist zu entscheiden; erst dann lässt sich der Erschließungsgrad pro Schicht messen.

**Technische Herkunft.**

| Property | Typ | Zweck |
|---|---|---|
| `m3gim-ontology:xlsxSheet` | xsd:string | Name des Blatts der Erfassungstabelle |
| `m3gim-ontology:xlsxRow` | xsd:integer | Zeilennummer einschließlich der Kopfzeile |
| `m3gim-ontology:dataPointId` | xsd:integer | Kennung, die die Aussagen eines Vorkommnisses innerhalb eines Dokuments bündelt |

Einzelheiten und Anbringungsorte stehen in Abschnitt 9.

**Kennzahlen des Exports.** `m3gim-ontology:exportDate`, `m3gim-ontology:recordCount`, `m3gim-ontology:recordSetCount`, `m3gim-ontology:approvedManualMatches` und `m3gim-ontology:lowConfidenceSkipped` stehen am Wurzelknoten der Serialisierung (Abschnitt 16).

### Normdaten-Properties aus Wikidata-Enrichment (E-105)

Die aus dem Wikidata-Enrichment injizierten Personen-, Orts- und Werk-Normdaten nutzen, wo ein etabliertes Vokabular trägt, dieses statt einer Eigenprägung, was die Anschlussfähigkeit erhält (entschieden E-105, IRIs im Audit 2026-06-18 belegt). Personen-Lebensdaten laufen über schema.org, der Beruf über die GND-Literal-Property. Die übrigen, für die kein passendes Standardvokabular vorliegt, bleiben unter `m3gim-ontology:` mit dem `wd`-Präfix als Marker ihrer Wikidata-Herkunft.

| Property | Typ / Range | Domain | Zweck |
|---|---|---|---|
| `schema:birthDate` | Date (xsd:string) | Person | Geburtsdatum |
| `schema:deathDate` | Date (xsd:string) | Person | Sterbedatum |
| `schema:birthPlace` | Place | Person | Geburtsort (derzeit Label-Literal; Range-Verfeinerung auf eine Ortsressource mit `wd:`-`@id` ist offen) |
| `schema:deathPlace` | Place | Person | Sterbeort (dito) |
| `gndo:professionOrOccupationAsLiteral` | Literal (Liste) | Person | Beruf oder Tätigkeit als Freitext-Label; die Literal-Variante gegen das IRI-erwartende `gndo:professionOrOccupation` |
| `geo:lat`, `geo:long` | Dezimalwert | Place | Koordinaten nach WGS84 |
| `owl:sameAs` | Zeichenkette | jede abgeglichene Entität | Wikidata-URI der Entität, im `@context` nicht als IRI typisiert und deshalb als Literal serialisiert |
| `m3gim-ontology:voiceType` | xsd:string | Person | Stimmfach; bleibt projekteigen, weil kein schema-Äquivalent trägt |
| `m3gim-ontology:country` | xsd:string | Place | Land eines Ortes (Wikidata P17), Place-Property und kein Personennormdatum |
| `m3gim-ontology:wdComposer` | xsd:string | MusicalWork | Komponist laut Wikidata |
| `m3gim-ontology:wdGenre` | xsd:string, mehrwertig | MusicalWork | Gattung laut Wikidata |
| `m3gim-ontology:wdPremiereDate` | xsd:string | MusicalWork | Uraufführungsdatum laut Wikidata; fehlt es dort, füllt die Anreicherung ersatzweise aus dem Publikationsdatum, was am Wert nicht erkennbar ist |
| `m3gim-ontology:wdLocation` | xsd:string | CorporateBody | Ortsangabe zu einer Institution laut Wikidata, häufig ein Stadtteil oder ein Gebäude statt der Stadt |
| `m3gim-ontology:wdInception` | xsd:string | CorporateBody | Gründungsdatum laut Wikidata |

Die vier Zeitwerte dieser Familie, `schema:birthDate`, `schema:deathDate`, `m3gim-ontology:wdPremiereDate` und `m3gim-ontology:wdInception`, werden bei der Anreicherung auf die in Wikidata belegte Präzision geschnitten und tragen damit die Formen von EDTF Level 0, also Jahr, Jahr und Monat oder vollständiges Datum (E-132). Die Präzisionsstufe selbst wird nicht als eigener Term mitgeführt, sie steht implizit in der Länge des Werts. Der Zeichenkettentyp bleibt aus demselben Grund wie bei `m3gim-ontology:atDate`.

`m3gim-ontology:voiceType` ist in [data.md](data.md) auch für die Bühnenrolle vorgesehen, um das Stimmfach einer Partie zu führen. Dort ist die Property unbelegt. Solange beide Verwendungen offen sind, bleibt unklar, ob ein Wert das Fach der Person oder das der Partie bezeichnet.

Die angereicherten Ortsknoten unterhalb von `m3gim-ontology:atPlace` tragen keinen eigenen Typ. Für diese Knoten ist die Domain nur aus der Position im Graphen erschließbar.

### Kuratierte Index-Properties (M1, Index-Durchreichung)

Die Indextabellen (Personen-, Organisations-, Orts- und Werkindex) pflegen Felder, die die Pipeline zuvor nach `build_index_lookup` verlor. M1 reicht sie als eigene `m3gim-ontology:`-Properties an die jeweilige Entität durch, getrennt von den Wikidata-Normdaten oben (kuratiert gegen angereichert) und vom Verknüpfungs-`anmerkung`. Quelle ist die Index-Spalte und nicht das Wikidata-Enrichment; damit erreichen Beruf, Sitz und Partie auch ungematchte Entitäten ohne Q-ID.

| Property | Typ / Range | Domain | Quelle (Index-Spalte) | Zweck |
|---|---|---|---|---|
| `m3gim-ontology:headquarters` | xsd:string | CorporateBody | Organisationsindex `ort` | kuratierter Sitz; Vorrang vor `wdLocation`; trägt die Unterscheidung auswärts gegen am Haus |
| `m3gim-ontology:keyContact` | xsd:string | CorporateBody | Organisationsindex `assoziierte_person` | Schlüsselkontakt der Institution |
| `m3gim-ontology:sungPart` | xsd:string | MusicalWork | Werkindex `rolle/stimme` | von der Nachlassbildnerin gesungene Partie pro Werk |
| `m3gim-ontology:lifespan` | xsd:string | Person | Personenindex `lebensdaten` | kuratierte Lebensspanne, getrennt von `schema:birthDate`/`deathDate` |
| `m3gim-ontology:indexNote` | xsd:string | Person, CorporateBody, MusicalWork | Index-`anmerkung` | redaktionelle Anmerkung (Person: Beruf oder Funktion; Institution: Typ; Werk: Werkgruppe) |

Loader-seitig landen sie additiv in `store.organizations[]`, `store.works[]` und `store.persons[]`. Abgesichert durch `tests/test_36_index_completeness.py` (Index-Zelle gegen Entitäts-Property, mit Mindestvorkommen) und die synthetischen Loader-Tests.

Drei Punkte hängen an dieser Familie. `headquarters` und `keyContact` tragen Literale und sind nicht mit dem Orts- beziehungsweise Personenindex verknüpft, sodass dieselbe Person als Akteur und als Schlüsselkontakt unverbunden nebeneinander stehen kann. `indexNote` führt bei Personen faktisch eine Berufsangabe und überschneidet sich mit `gndo:professionOrOccupationAsLiteral` aus der Anreicherung; ob die kuratierte Angabe dorthin geführt werden soll, ist offen. Die frühere Benennung `m3gim:editorialNote` fiel mit `skos:editorialNote` zusammen und meinte etwas anderes, nämlich ein kuratiertes Quellfeld statt einer Anmerkung an der Modellierung.

### Typisierte Datumsproperty-Familie

Dieser Abschnitt ist mit E-136 gegenstandslos geworden. Die sechzehn typisierten Datumsproperties am Dokument (`m3gim:absendedatum`, `m3gim:empfangsdatum`, `m3gim:ausstellungsdatum`, `m3gim:erscheinungsdatum`, `m3gim:abreisedatum`, `m3gim:auftrittsdatum`, `m3gim:auffuehrungsdatum`, `m3gim:probendatum`, `m3gim:probenbeginn`, `m3gim:premieredatum`, `m3gim:ausstrahlungsdatum`, `m3gim:spielzeitVon`, `m3gim:spielzeitBis`, `m3gim:ueberweisungsdatum`, `m3gim:erstelldatum`, `m3gim:gespraechsdatum`) sind ersatzlos entfallen, ebenso die Auffangklasse `m3gim:DatedEvent` mit `m3gim:dateValue` und `m3gim:dateRole`.

An ihre Stelle tritt für jeden Wert ein `m3gim-ontology:Annotation`-Knoten mit `m3gim-ontology:atDate` und der erfassten Rolle in `m3gim-ontology:role`, erreichbar über `m3gim-ontology:hasAnnotation`. Zwei Ausnahmen bleiben. Die reine Entstehungsdatierung des Dokuments steht am Dokument auf `rico:creationDate`, die Datierung einer Aufführung am Aufführungsknoten auf `m3gim-ontology:atDate` ohne Rollenangabe. Die Abbildung jeder einzelnen entfallenen Property auf ihre Nachfolgekonstruktion steht im Abschnitt `typedDateProperties` von [`../vocab/rename-map.json`](../vocab/rename-map.json), die Vorher-Nachher-Beispiele aus dem Bestand in [`../data/reports/date-role-model-befund.md`](../data/reports/date-role-model-befund.md) § 4. Abgesichert ist der Zustand durch `tests/test_18_typed_dates.py`, das seit dem Umbau das Gegenteil dessen prüft, wonach es benannt ist, und anschlägt, sobald ein Property-Name zurückkehrt, der eine Rolle ausdrückt.

Zwei Zusammenlegungen der Rollenwerte hängen an dieser Umstellung (E-139). `spielzeitVon` und `spielzeitBis` sind durch den einen Term `m3gim-vocab:season` ersetzt, der die Spanne in einem Wert trägt, weil die Quelle sie so führt und `spielzeitBis` nie befüllt wurde. Ein `m3gim:probenTyp` beziehungsweise `rehearsalType` wird nicht angelegt; `generalprobe` bleibt eine eigene Rolle, weil die Alternative eine Property voraussetzte, die deklariert und nie befüllt war.

### Erwähnung

Inhaltlich erwähnte Personen und Institutionen werden als `rico:hasOrHadSubject` mit `@type: rico:Person` beziehungsweise `rico:CorporateBody` serialisiert, statt über eine custom-Property `m3gim:mentions`. Damit bleibt das Modell RiC-O-konform. Der Rollenwert `m3gim-vocab:mentioned` trennt dabei den Fall erfasste Nennung von dem Fall keine Rolle erfasst.

### Kontrollierte Vokabulare als SKOS

Das Vokabular `m3gim-vocab` führt fünf Concept Schemes. Das frühere Sammelscheme `m3gim-role:scheme` ist in vier sortenreine Schemes zerlegt.

| Scheme | Gegenstand |
|---|---|
| `m3gim-vocab:agentRoles` | Funktion, die eine Person, eine Körperschaft oder eine Gruppe in einem Dokument einnimmt |
| `m3gim-vocab:annotationRoles` | Rolle, in der eine Datierung, eine Verortung oder eine Entitätsreferenz zu ihrem Dokument steht |
| `m3gim-vocab:financialItemTypes` | Art eines Geldbetrags, den eine Detailangabe der dritten Schicht trägt |
| `m3gim-vocab:relationQualifiers` | Bestimmtheitsgrad einer Aussage, unabhängig von der Art des Zielknotens |
| `m3gim-vocab:documentaryFormTypes` | hierarchisches Vokabular der Dokumenttypen (Abschnitt 12) |

`annotationRoles` vereinigt die zunächst getrennt vorgeschlagenen Schemes für Ereignis-, Orts- und Datumsrollen. Mit dem einheitlichen Annotationsknoten trägt derselbe Begriff wahlweise eine Datierung, eine Verortung oder beides, sodass eine Trennung nach Datums- und Ortsrollen keinen Gegenstand mehr hat. Wo eine Datumsrolle und eine Ortsrolle denselben Aspekt bezeichnet haben, sind sie zu einem Begriff zusammengefallen und haben ihre Aspektendung verloren, weil der Aspekt in der Wertproperty steht und der Rollenname ihn nur wiederholt hat. So tragen `absendedatum` und `absendeort` jetzt gemeinsam `m3gim-vocab:dispatch`, `empfangsdatum` und `empfangsort` gemeinsam `m3gim-vocab:receiving`, `abreisedatum` und `abreiseort` gemeinsam `m3gim-vocab:departure`, `erstelldatum` und `entstehungsort` gemeinsam `m3gim-vocab:creation`. Wo ein Begriff nur auf einer der beiden Seiten vorkommt, trägt er seinen Namen unverändert weiter. `auftritt` und `aufführung` fallen auf `m3gim-vocab:performance` zusammen, weil ihnen keine inhaltliche Unterscheidung zugrunde lag. Die jeweilige Ursprungsrolle bleibt über `m3gim-ontology:derivedFromRole` erhalten.

`relationQualifiers` hält die Querlage der Begriffe `erwähnt` und `implizit` fest, die an jedem Zieltyp stehen können und nichts über die Art der Beziehung und alles über ihren Bestimmtheitsgrad sagen.

`financialItemTypes` bleibt neben `annotationRoles` bestehen, weil kein Wert der Finanzschicht im Bestand als Datums- oder Ortsrolle auftritt und umgekehrt. Zwei Ausnahmen sind `erwähnt`, das im eigenen Scheme `relationQualifiers` steht, und `interpret`, das als Rolle einer Detailangabe keinen Finanzposten bezeichnet und als Erfassungsfehler zu prüfen ist.

Daneben führt das Vokabular neun `skos:Collection`, gegliedert nach dem Ziel, an dem eine Rolle im Datensatz auftritt. Die Sammlungen heißen `rolesAtPersons`, `rolesAtCorporateBodies`, `rolesAtGroups`, `rolesAtPlaces`, `rolesAtWorks`, `rolesAtFramingEvents`, `rolesAtDates`, `rolesAtFinancialDetails` und `mobilityPlaceRoles`. Eine Rolle kann in mehreren Sammlungen stehen, weil dieselbe Spalte verschiedene Zieltypen bedient. Die Pipeline liest allein `mobilityPlaceRoles` (Abschnitt 10).

Alle Rollenwerte sind nach der Normalisierung geschlechtsneutral, weil die Pipeline die Endungen `:in` und `:innen` entfernt. Die vollständigen Rollenlisten mit Zuordnung zu Verknüpfungstypen stehen in [data.md](data.md) § 5.

### Zielmodell v2: zweistufige Identität und Besetzung (E-127/E-128)

Diese Sektion beschreibt einen Zielzustand, der entschieden und noch nicht umgesetzt ist. Die genannten Terme stehen bewusst nicht im Vokabular; ihre Aufnahme gehört in die Umsetzungsrunde, damit Spezifikation und Vokabular gemeinsam wandern.

**Zweistufige Identität.** Die Erfassungs-ID ist seit E-127 zweistufig. Eine Ganzzahl identifiziert die Aktivität (das Vorkommnis), eine zweistellige Dezimale `1.01` ff. die einzelne Beteiligung daran. Die `@id` des Vorkommnisses kommt aus `(archivsignatur, folio, aktivität)`, die der Beteiligung aus `(vorkommnis, beteiligungsnummer)`. Das löst die einstufige `datenpunkt_id` als Identitätsträger ab, deren Spalte in der Quelle nahezu nie gefüllt ist, weshalb das darauf aufbauende Vorkommnis-Modell nicht wirksam wird.

**Vorkommnis als Bündelknoten.** `m3gim-ontology:Occurrence` ergänzt die dokumentzentrierte Erfassung um eine Auftritts-Ebene ([data.md](data.md) § 4). Er gruppiert die Aspektknoten eines Auftritts, also Annotation für Ort und Zeit, Performance für Werk und Partie, Annotation für den Betrag und die beteiligten Agenten. So wird „wer hat was getan" auch dort rekonstruierbar, wo ein Dokument mehrere Auftritte bündelt. Der Name Occurrence ist bewusst weiter gefasst als Event, weil nicht jedes Vorkommnis raumzeitlich ist, etwa ein Vertrag. Die Aspektknoten bleiben als Facetten erhalten, das Vorkommnis liegt eine Ebene darüber. Der Record bezeugt es über `m3gim-ontology:attests`, statt es zu enthalten, was der CIDOC-CRM-`P70`-Logik folgt und den Weg zu einer dokumentübergreifenden Auftritts-Identität offen hält.

**CIDOC-CRM-Anschluss.** `m3gim-ontology:Occurrence` ist `rdfs:subClassOf crm:E7_Activity` neben `rico:Event`. `crm:E7_Activity` ist die etablierte Oberklasse für zielgerichtetes Geschehen (Aufführung, Gastspiel, Vertrag). Als projektnähere Alternative steht `rico:Activity` bereit, die RiC-O 1.1 als Unterklasse von `rico:Event` führt.

**Beteiligung als Knoten.** Jede Beteiligung wird eine `m3gim-ontology:Participation`, die genau eine mitwirkende Partei mit ihrer Funktion und, bei Sänger:innen, ihrer gesungenen Partie an die Aufführung bindet. Damit ist „X sang Y als Z" rekonstruierbar, was im flachen Modell verloren geht.

| Term | Domain → Range | Zweck |
|---|---|---|
| `m3gim-ontology:Occurrence` | Klasse | Vorkommnis-Bündelknoten je Aktivität |
| `m3gim-ontology:Participation` | Klasse | Beteiligung einer Partei an einer Aufführung |
| `m3gim-ontology:attests` | Record → Occurrence | Record bezeugt ein Vorkommnis |
| `m3gim-ontology:hasParticipation` | Performance, Occurrence → Participation | Besetzungsbindung einer Aufführung |
| `m3gim-ontology:performedBy` | Participation → Person, Group, CorporateBody | mitwirkende Partei der Beteiligung |
| `m3gim-ontology:inFunction` | Participation → `m3gim-vocab`-Concept | Funktion in der Aufführung, kontrolliert |
| `m3gim-ontology:playsStageRole` | Participation → StageRole | gesungene Partie, optional |
| `m3gim-ontology:hasFee` | Participation → Annotation | Honorar der Beteiligung, optional |
| `m3gim-ontology:mode` | Occurrence → xsd:string | Auftrittsmodus (gastspiel, tournee), getrennt vom Rollenvokabular |
| `m3gim-ontology:belongsToWork` | StageRole → MusicalWork | Bühnenrolle gehört zu einem Werk |
| `m3gim-ontology:attachedTo` | Annotation → Performance, Record | Rückreferenz einer Detailangabe |

**StageRole bleibt geteilt.** Die Partie ist ein wiederverwendeter Konzeptknoten, sodass „wer sang Fricka über die Jahre" beantwortbar bleibt; die konkrete Besetzung sitzt an der Participation. Das behebt den heutigen Zustand, in dem StageRole-Knoten global und ohne Sänger- und Aufführungsbezug sind.

**Eine Aufführung trägt die ganze Besetzung.** Je Aktivität eine `m3gim-ontology:Performance` mit der Liste ihrer Beteiligungen über `hasParticipation`, statt je Person-Rollen-Paar eine eigene Performance. Werk, Ort und Datum hängen als Facetten am Vorkommnis.

**Geld.** `hasFee` bindet das Honorar an die Beteiligung der Person; `einnahmen`, `ausgaben` und `summe` bleiben Veranstaltungsfinanzen am Vorkommnis über `m3gim-ontology:hasDetail`.

### Grenzen des heutigen Modells

- Eine Aufführung zerfällt im Datensatz in mehrere Knoten, weil je Verknüpfungszeile einer entsteht. Wer sang welche Partie in welcher Aufführung, ist daraus nicht rekonstruierbar. Das Zielmodell oben ist entschieden und noch nicht umgesetzt.
- Bühnenrollen sind global und tragen weder Werkbindung noch Stimmfach. Gleichnamige Partien verschiedener Werke fallen zusammen, weil die Deduplikation allein über den Namen läuft. Ob das tragfähig ist, ist mit dem Erschließungsteam zu klären.
- Dieselbe Partie steht zweimal im Modell, als Literal `m3gim-ontology:sungPart` am Werk und als eigene Entität `m3gim-ontology:StageRole`, ohne Verbindung zwischen beiden.
- Die Mobilitätssichten sind Abfragemuster und keine Klassen. Welcher Rollenwert zu welcher Sicht gehört, ist für einen Teil der Werte noch mit dem Erschließungsteam abzustimmen (Abschnitt 10).

Die redaktionellen Anmerkungen zu den einzelnen Termen stehen als `skos:editorialNote` an ihrer Stelle in [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl). Die offenen Modell- und Operator-Entscheidungen führt [specification.md](specification.md) § Offene Entscheidungen, ihre Begründungen [architecture-decisions.md](architecture-decisions.md).

## 8. AgRelOn-Integration

### Scope und Begründung

AgRelOn (Agent Relationship Ontology der Deutschen Nationalbibliothek) modelliert Beziehungen zwischen Agenten (Personen, Organisationen) über ein nach Kategorien gegliedertes Vokabular von Relationstypen. Das M³GIM-Modell integriert AgRelOn als *komplementäre Ebene* für Agent-Agent-Beziehungen und für Meta-Statements. AgRelOn ersetzt keinen Teil des m3gim-Modells, weil sein Scope auf Agent-Agent beschränkt ist und raumzeitliche, werkbezogene oder archivische Relationen nicht abdeckt.

Die Integration verfolgt folgende Ziele:

1. Standardvokabular für die institutionelle und die Korrespondenzschicht.
2. GND-Anschlussfähigkeit für Bestände anderer Archive.
3. Meta-Statement-Muster (Gültigkeit, Konfidenz, Provenienz) als einheitliche Querschnittsebene (siehe Abschnitt 9).

### Übernommene AgRelOn-Klassen und -Properties

Die Beziehungen hängen über `m3gim-ontology:hasAgentRelation` am belegenden Dokument. Im Datensatz verwendet sind fünf Klassen.

| Klasse | Nutzung im Modell |
|---|---|
| `agrelon:HasCorrespondent` | Brief- und Telegrammverkehr |
| `agrelon:HasProfessionalContact` | Agenten, Vermittler, Kolleg:innen |
| `agrelon:HasEmployeeEmployer` | Engagement der Nachlassbildnerin an Opernhäusern |
| `agrelon:IsHasPatron` | Förderverhältnisse |
| `agrelon:HasIsMember` | Ensemble- und Ausbildungsmitgliedschaft |

Als Erweiterungsraum stehen `agrelon:HasColleague` für die inferierte Ko-Präsenz bei Aufführungen und `agrelon:HasStudentTeacher` für den Ausbildungskontext bereit; beide sind vom aktuellen Zuordnungsmuster nicht bedient.

**Direkte Properties**

`agrelon:hasEmployer`, `agrelon:hasEmployee`, `agrelon:hasCorrespondent`, `agrelon:hasProfessionalContact`, `agrelon:hasColleague`, `agrelon:hasTeacher`, `agrelon:hasStudent`, `agrelon:isPatronOf`, `agrelon:hasPatron`, `agrelon:isMemberOf`, `agrelon:hasMember`.

**Konformitäts-Korrektur (E-104, amendiert E-69).** Der Web-Audit gegen die DNB-RDF hat bestätigt, dass das n-äre Reifikationsmuster (eine Klasse pro Beziehungstyp, Agenten über `agrelon:hasSubject`/`hasObject`, Gültigkeit als Blank-Node) AgRelOn exakt entspricht. Einige Benennungen waren zu korrigieren. Gültigkeit, Konfidenz und Provenienz führt AgRelOn unter `metadata*` und nicht unter `has*`, also `agrelon:metadataPeriod` (statt `hasValidityPeriod`), `agrelon:metadataConfidence` (statt `hasConfidenceValue`), `agrelon:metadataProvenance` (statt `hasProvenance`); `hasBeginDate` und `hasEndDate` am Period-Blank-Node sind korrekt. Die Patron-Klasse heißt `agrelon:IsHasPatron`, `HasIsMember` ist korrekt. Die Reifikation setzt `agrelon:hasSubject` zusätzlich zu `hasObject`.

### Mapping M³GIM-Rolle → AgRelOn

| M³GIM-Kontext | AgRelOn-Property |
|---|---|
| institution `arbeitgeber` bei der Nachlassbildnerin | `agrelon:hasEmployer` |
| institution `ausbildungsstätte` | `agrelon:isMemberOf` (Lehrkraft über `agrelon:hasTeacher`, sofern erschließbar) |
| person `agent`, `vermittler` | `agrelon:hasProfessionalContact` |
| person `auftraggeber` bei finanzieller Förderung | `agrelon:hasPatron` |
| person `absender`, `empfänger` oder `adressat` in Korrespondenz | `agrelon:hasCorrespondent` |
| Ko-Präsenz mit anderen Sänger:innen in derselben Aufführung | `agrelon:hasColleague` (inferiert mit Provenance-Spur, nicht implementiert) |

Weil `vertragspartner` und `arbeitgeber` auf dieselbe AgRelOn-Klasse abbilden, ist die Herkunft ohne `m3gim-ontology:derivedFromRole` nicht mehr unterscheidbar.

### Selbstbezügliche Beziehungen (E-129)

Die Pipeline setzt die Nachlassbildnerin fest als Subjekt jeder AgRelOn-Beziehung. Ist sie zugleich die Adressatin oder Absenderin des Dokuments, entstünde eine Korrespondenzbeziehung von ihr zu sich selbst, mit identischer Wikidata-Kennung auf beiden Seiten. In einem persönlichen Nachlass ist das der Regelfall und kein Sonderfall. Solche Beziehungen werden seit E-129 unterdrückt, während die Rollenzuordnung als `m3gim-ontology:hasAssociatedAgent` samt Quellzeile am Record bleibt, sodass keine Information verloren geht. Ob die tatsächliche Gegenseite als Beziehungsziel nachgezogen wird, ist offen.

### Serialisierungsbeispiel

Die Beziehungsknoten sind in das belegende Dokument eingebettet und tragen keine eigene `@id`.

```json
{
  "@type": "agrelon:HasEmployeeEmployer",
  "agrelon:hasSubject": {
    "name": "Malaniuk, Ira",
    "@id": "wd:Q94208",
    "owl:sameAs": "http://www.wikidata.org/entity/Q94208"
  },
  "agrelon:hasObject": {"name": "Bayreuther Festspiele", "@id": "wd:Q157596"},
  "agrelon:metadataProvenance": {"@id": "m3gim-data:NIM_011_3"},
  "agrelon:metadataPeriod": {"agrelon:hasBeginDate": "1954"},
  "m3gim-ontology:xlsxSource": {
    "m3gim-ontology:xlsxSheet": "Box_01",
    "m3gim-ontology:xlsxRow": 1515
  }
}
```

`agrelon:metadataPeriod` wird allein für `agrelon:HasEmployeeEmployer` gesetzt und trägt als Heuristik das Jahr aus `rico:date` des Records als `agrelon:hasBeginDate`. Ein `agrelon:hasEndDate` wird nicht gesetzt, weil die Quelle es nicht hergibt.

### Abgrenzung

AgRelOn modelliert *nicht*: Orte, Werke, Bühnenrollen, Aufführungen, Dokumenttypen, raumzeitliche Ereignisse, Datumstypologien jenseits der Relationsgültigkeit, finanzielle Details. Für diese Bereiche bleibt das m3gim-Modell zuständig.

## 9. Meta-Statement-Modell

### Prinzip

Das Modell führt zwei Provenienzspuren getrennt, eine semantische und eine technische. Das Muster der semantischen Spur stammt aus AgRelOn und ist auf alle M³GIM-Relationen übertragbar, nicht nur auf Agent-Agent-Relationen; damit entsteht eine einheitliche Querschnittsebene über den fachlichen Schichten.

### Semantische Provenienz

| Property | Wertebereich | Zweck |
|---|---|---|
| `agrelon:metadataPeriod` | Blank Node mit Begin/End | Zeitraum, in dem die Aussage gilt |
| `agrelon:hasBeginDate` | xsd:string (ISO-8601 oder TimeSpan) | Beginn der Gültigkeit |
| `agrelon:hasEndDate` | xsd:string | Ende der Gültigkeit |
| `agrelon:metadataConfidence` | xsd:decimal [0..1] oder xsd:string (Stufenwert) | Konfidenzwert |
| `agrelon:metadataProvenance` | URI auf Archivrecord oder Literal | Quelle der Aussage |

`agrelon:metadataProvenance` steht an den Akteursbeziehungen und an den Annotationsknoten und verweist auf das Dokument, das die Aussage belegt. Da beide am belegenden Dokument hängen, ist der Verweis derzeit ein Selbstbezug. Ob die Akteursbeziehungen stattdessen als eigene Graphknoten mit Verweis auf ihre Belege geführt werden sollen, ist offen.

Keine Aussage trägt einen Konfidenzwert.

### Datierungsevidenz wird nicht serialisiert (E-106)

Die `datierungsevidenz`-Spalte (`aus_dokument`/`erschlossen`/`extern`/`unbekannt`) wird **nicht** in den Output übernommen, weder als altes `m3gim:dateEvidence` noch als `agrelon:metadataConfidence`-Dezimalwert. Der frühere Mapping-Schritt (aus_dokument→1.0, extern→0.8, erschlossen→0.6) war eine **erfundene Projektion** der kategorialen Evidenz auf eine Zahl, also kein gemessener Wert und gegen die Leitplanke „Konfidenz nicht erfinden". Kein aktives Feature las den Wert. Mit der Konfidenz entfällt auch die record-seitige Datierungs-**Self-Provenance**, die ohne den Konfidenzwert ein leerer Selbstverweis war.

Falls die Datierungsevidenz später gebraucht wird, kehrt sie als **kategorialer Wert** zurück, entweder als `agrelon:metadataConfidence`-String-Stufenwert (`"aus_dokument"`/`"erschlossen"`/`"extern"`; der Wertebereich oben erlaubt das ausdrücklich) oder als wiederbelebtes `m3gim:dateEvidence`-Literal. Eine Dezimalzahl wird nicht reaktiviert.

Der Bearbeitungsstand `m3gim-ontology:processingStatus` bleibt als datensatzinterner Projektstatus erhalten und ist nicht Teil der Meta-Statement-Schicht.

### XLSX-Quellreferenz (`m3gim-ontology:xlsxSource`)

Ergänzend zur semantischen Provenienz trägt jede aus dem Excel abgeleitete Entität eine **technische Quellreferenz** auf die Ursprungszeile. Sie adressiert die Ursprungszeile in der Erfassungstabelle und dient Pipeline und Review; als wissenschaftliche Quellenangabe taugt sie nicht.

| Property | Wertebereich | Zweck |
|---|---|---|
| `m3gim-ontology:xlsxSource` | typloser Knoten | Container für die Adressteile (Sheet, Zeile, optional dataPointId) |
| `m3gim-ontology:xlsxSheet` | xsd:string | Name des Ursprungs-Sheets. Objektzeilen tragen `"Objekte"`, Verknüpfungszeilen den Namen des jeweiligen Box-Blatts (etwa `"Box_01"`, `"Box 5"`), weil die Verknüpfungstabelle über mehrere, uneinheitlich benannte Blätter verteilt ist (E-95) |
| `m3gim-ontology:xlsxRow` | xsd:integer (≥ 2) | 1-basierte XLSX-Zeilennummer inklusive Header-Zeile |
| `m3gim-ontology:dataPointId` | xsd:integer (optional) | Identität der Auftritts-Occurrence innerhalb des Dokuments; leer bedeutet die Dokument-Ebene. Aus Spalte `datenpunkt_id` |

Angebracht wird `m3gim-ontology:xlsxSource`:

- **am Record** (aus `M3GIM-Objekte.xlsx`). `xlsxSheet = "Objekte"`, `xlsxRow` entspricht der Excel-Zeilennummer des Objekts.
- **an jedem Annotationsknoten**, sowohl an den über `hasAnnotation` referenzierten als auch an den über `hasDetail` eingebetteten Detailangaben.
- **an jeder Aufführung** und an den aus einer Verknüpfungszeile abgeleiteten Entitätsknoten (Agent, Ort, Subject).
- **an jeder AgRelOn-Relation**.

Direkte Record-Properties (`rico:title`, `rico:date`, `rico:hasDocumentaryFormType` und die übrigen Beschreibungsfelder) bekommen keinen eigenen `xlsxSource`, weil ihre Herkunft implizit die des umgebenden Records ist. Damit bleibt die JSON-LD lesbar, ohne Provenienz pro Atom-Property zu wiederholen.

Beispiel, eine Detailangabe des Anker-Records `UAKUG/NIM_007 5_1`:

```json
{
  "@type": "m3gim-ontology:Annotation",
  "m3gim-ontology:detailField": "ausgaben",
  "m3gim-ontology:detailValue": "36.000",
  "role": {"@id": "m3gim-vocab:mentioned", "skos:prefLabel": "erwähnt"},
  "m3gim-ontology:monetaryAmount": {"@value": "36000", "@type": "xsd:decimal"},
  "m3gim-ontology:currency": "S",
  "m3gim-ontology:xlsxSource": {
    "m3gim-ontology:xlsxSheet": "Box_01",
    "m3gim-ontology:xlsxRow": 1413
  }
}
```

Die Kontrakttests in `tests/test_20_xlsx_provenance.py` halten die volle xlsxSource-Coverage als Soft-Invariante und pflegen kuratierte Anker-Records (NIM_007 5_1, NIM_004 3, NIM_003 1_8) mit exakten Zeilenerwartungen als Fixtures.

`m3gim-ontology:dataPointId` sitzt im Container der technischen Herkunft, trägt seit E-125 aber eine fachliche Bündelung und keine Herkunftsangabe. Sie gehört an die bezeugte Entität statt an die Quellzellenadresse. Die Nachfolgekonvention ist die zweistufige Aktivitätskennung aus E-127 (Abschnitt 7).

### Anwendung in Reifikation

Für nicht-agentische Relationen, bei denen das n-äre Reifikationsmuster nicht aus AgRelOn stammt, sieht [specification.md](specification.md) eine leichtgewichtige Reifikation über ein Muster `m3gim:Statement` vor, angewendet nur dort, wo die Provenienz nicht bereits aus der Record-URI folgt. Das Muster ist nicht ins Vokabular aufgenommen und kommt im Datensatz nicht vor; [pipeline-architecture.md](pipeline-architecture.md) führt es als späte, optionale Phase.

## 10. Mobilitätsmodell

### Motivation

Mobilität ist die zentrale inhaltliche Frage des Projekts, also wo die Nachlassbildnerin wann auftrat, wo sie engagiert war, wohin sie reiste, mit wem sie korrespondierte und wo über sie berichtet wurde. Das Datenmodell unterstützt sie über die unterscheidbaren Sichten performative, institutionelle, Reise- und Korrespondenz-, biographische und diskursive Mobilität, die als SPARQL-Abfragemuster auf den bestehenden Klassen und Rollen realisiert sind. Eigene Klassen für die Sichten gibt es nicht, weil sie verschiedene Schnitte durch dieselben Daten sind.

### Mobilitätssichten

**Performative Mobilität.** Wo trat sie auf?
`m3gim-ontology:Annotation` mit `m3gim-ontology:role` ∈ {`performance`, `guestPerformance`, `premiere`, `revival`, `galaPerformance`}. Alternativ `m3gim-ontology:Performance` mit `hasPerformer`, dem zugehörigen Annotationsknoten für den Ort und `atDate` an der Aufführung.

**Institutionelle Mobilität.** Wo war sie engagiert?
`m3gim-ontology:Annotation` mit der Rolle `m3gim-vocab:season`. Ergänzend `agrelon:HasEmployeeEmployer`-Relationen mit Gültigkeitsperiode.

**Reise- und Korrespondenzmobilität.** Wo war sie wann?
`agrelon:HasCorrespondent` mit `agrelon:metadataProvenance` auf Briefe. Ergänzt durch die Mobilitäts-Ortsrollen und durch die Datierungen mit den Rollen `dispatch`, `receiving` und `departure`.

**Biographische Mobilität.** Wohn- und Lebensorte.
Rolle `m3gim-vocab:residencePlace` mit TimeSpan über `agrelon:metadataPeriod`.

**Diskursive Mobilität.** Wo wurde über sie berichtet?
`rico:Record` mit Dokumenttyp ∈ {`review`, `press`, `critique`} und der Rolle `m3gim-vocab:creation` am Ort oder eine Herausgeberinstitution mit Ortsreferenz. Der diskursive Raum weicht typischerweise vom performativen ab.

### Mobilitäts-Ortsrollen

Fünf Ortsrollen belegen für sich genommen ein Mobilitätsereignis und stehen im Vokabular als Collection `m3gim-vocab:mobilityPlaceRoles` mit den Mitgliedern `destinationPlace`, `dispatch`, `departure`, `receiving` und `contractPlace`. Sie erzeugen neben der Ortsreferenz einen Annotationsknoten ohne Datum. Das Fehlen des Datums ist selbst die Aussage, weil die Quelle keines hergibt und keines geraten wird. `residencePlace` gehört ausdrücklich nicht dazu, weil ein Wohnort ein Zustand mit Gültigkeitszeitraum ist und kein Punktereignis. Dies ist die einzige Collection, die die Pipeline liest.

### Cluster-Zuordnung

Die UI-Anbindung dieser Sichten, etwa die Farbfamilie für Chronik-Chips, liegt in [design.md](design.md). Die Absicherung gegen fehl-gemappte Rollen erfolgt in `tests/test_25_chronik_mobility_cluster.py`, die Zuordnungstabelle steht als `EVENT_ROLE_TO_MOBILITY_CLUSTER` in `docs/js/data/constants.js`. Drei mit dem tieferen Export aktivierte Rollen sind dort provisorisch gesetzt und mit dem Erschließungsteam zu bestätigen.

| Rolle | Cluster | Begründung |
|---|---|---|
| generalprobe | performativ | wie das Geschwister `probe`, eindeutig performativ |
| aufnahme | diskursiv | mediale Spur wie `ausstrahlung` (Rundfunk- oder Tonaufnahme) |
| rahmenveranstaltung | null | genuin unklar; `null` bedeutet keine Sicht und Klärungsbedarf, keine willkürliche Einordnung |

Der Vertragsstatus `nicht eingehalten` (Abschnitt 11) ist keine Rolle und wird beim Bau der Annotationsknoten nicht als `m3gim-ontology:role` durchgereicht.

### Der Träger der Mobilität

```json
{
  "@id": "m3gim-data:ev_NIM_004_3_5d99d133",
  "@type": "m3gim-ontology:Annotation",
  "agrelon:metadataProvenance": {"@id": "m3gim-data:NIM_004_3"},
  "m3gim-ontology:atPlace": {
    "name": "München",
    "@id": "wd:Q1726",
    "owl:sameAs": "http://www.wikidata.org/entity/Q1726",
    "geo:lat": 48.1375,
    "geo:long": 11.575,
    "m3gim-ontology:country": "Deutschland"
  },
  "m3gim-ontology:atDate": "1952-12-17",
  "role": {"@id": "m3gim-vocab:publicationDate", "skos:prefLabel": "erscheinungsdatum"},
  "m3gim-ontology:xlsxSource": {
    "m3gim-ontology:xlsxSheet": "Box_01",
    "m3gim-ontology:xlsxRow": 83
  }
}
```

Beide Emissionspfade, das Komposit `ort, datum` aus [data.md](data.md) § 4 und die datumslose Mobilitäts-Annotation, teilen sich denselben Helper für die `@id`-Vergabe.

### Abdeckungsabhängigkeit

Jede Mobilitätsauswertung muss den derzeitigen Erschließungsstand mitführen. Nur ein Teil der Konvolute ist bis auf die Folioebene erschlossen, der Rest bleibt auf der Ebene der Archiveinheit, und Datumsangaben wie Titel sind selektiv vorhanden. Die Daten belegen damit den Stand der Erschließung; ein Ereignis ohne Beleg im erschlossenen Teil des Bestands erscheint im Datensatz nicht, hat aber stattgefunden. Aktuelle Abdeckungszahlen stehen in [`../data/reports/quality-snapshot.md`](../data/reports/quality-snapshot.md). Mobilitätskarten sind deshalb als *Zwischenstand der Erschließung* zu kommunizieren und nicht als Rekonstruktion der Biographie. Dieser Survivorship Bias muss bei Visualisierungen textlich gekennzeichnet sein.

## 11. Finanzschicht

### Klasse und Properties

`m3gim-ontology:Annotation` ist die Trägerklasse für Schicht 3. Ein Finanzposten ist derselbe Knotentyp wie eine Datierung oder eine Verortung und unterscheidet sich allein durch die belegten Properties.

| Property | Typ | Zweck |
|---|---|---|
| `m3gim-ontology:detailField` | xsd:string | Art des Postens, belegt mit `ausgaben`, `einnahmen`, `summe` |
| `m3gim-ontology:detailValue` | xsd:string | unveränderter Zellwert der Quelle |
| `m3gim-ontology:monetaryAmount` | xsd:decimal | geparster Geldbetrag |
| `m3gim-ontology:currency` | xsd:string | Währung |
| `m3gim-ontology:role` | `skos:Concept` | Art der Zahlung, aus `m3gim-vocab:financialItemTypes` |

Der Rohwert bleibt erhalten, damit die Parsung nachprüfbar ist. `detailField` bleibt neben `role` bestehen, weil es die Richtung des Geldflusses trägt und damit eine von der Rolle unabhängige Angabe ist; ein Dokument kann denselben Betrag einmal als `einnahmen` mit der Rolle `gesamtvergütung` und einmal als `summe` mit der Rolle `erwähnt` führen.

Das Rollenvokabular für die Finanzschicht bleibt offen erweiterbar. Die Concepts des Schemes sind `performanceFee` (abendgage), `commission` (provision), `totalRemuneration` (gesamtvergütung), `travelExpenses` (reisekosten) und `broadcastFee` (rundfunkshonorar). Umlaute bleiben in den Anzeigelabels erhalten, eine ASCII-Transliteration findet nicht statt. Der Quellwert `rundfunkshonorar` trägt eine Tippform, die unverändert durchgereicht wird; die Umbenennung des Concepts löst die IRI vom Tippfehler, das korrekte `rundfunkhonorar` steht als `skos:altLabel`.

**Zwei gegenläufige Belegungen.** Die Pipeline kennt einen zweiten Emissionspfad über den Verknüpfungstyp `detail`, in dem `detailField` die Bezeichnung der Angabe und `detailValue` die Rolle trägt. Die beiden Pfade belegen dasselbe Paar von Properties gegenläufig. Der zweite Pfad führt im aktuellen Stand keine Daten, weshalb die Kollision folgenlos bleibt; welche Lesart gilt, ist zu klären, bevor er Daten führt.

### Währungscodes

Wo die Quelle eindeutig ist, steht der ISO-4217-Code (DEM, CHF, ATS, FRF, ESC, USD). Historische und uneindeutige Währungen behalten ihren Originalcode aus der Quelle (RM für Reichsmark, S für Schilling, `Lire`, `Belgische Francs`) mit Klartext-Auflösung im Kommentarfeld; sie werden nicht spekulativ auf einen ISO-Code normalisiert. Der Wertebereich mischt damit ISO-Codes und Quellschreibungen. Für maschinelle Auswertung wäre ein zweites Feld mit dem normalisierten Code nötig, ob es angelegt wird, ist offen.

Fehlt die Währung in der Quelle, setzt die Pipeline für zwei Fundstellen einen redaktionell begründeten Vorgabewert, gebunden an das Präfix der Archivsignatur. Dieser abgeleitete Charakter ist im Datum nicht markiert, der Wert steht wie ein erfasster da.

### Betragsparsing und Doppelbeträge

Beträge stehen in der Quelle in wechselnder Notation, auch mit nachgestellter Währung (`50000 Lire`) und als Doppelbetrag (`25, DM / 45, DM`). Der Parser trennt zuerst die Währung ab und extrahiert dann den numerischen Wert; ein Doppelbetrag wird zu zwei eigenständigen Annotationsknoten mit gleichem `detailField`. Kein belegter Betrag darf dabei verloren gehen.

### Vertragsstatus

Ein in der Quelle vermerkter unerfüllter Vertrag steht als Wert `nicht eingehalten` in der Rollenspalte und wird dort über einen ganzen Vertragsblock durchgereicht. Eine Rolle ist er nicht; das Vokabular führt ihn deshalb bewusst nicht als Concept, und `m3gim-ontology:role` behält ihn als Literal. Das Zielfeld ist ein `m3gim-ontology:contractStatus` zusammen mit `m3gim-ontology:realized = false` am Vertrags-Record, wobei `realized = false` nur bei explizitem Beleg gesetzt und nie aus fehlendem Beleg geschlossen würde. Die Entscheidung ist mit E-139 vertagt, weil sie die offene Klärung mit dem Erfassungsteam voraussetzt und damit extern blockiert ist; beide Terme stehen nicht im Vokabular.

### Anbindung

Finanzeinträge hängen im erzeugten Datensatz alle am Dokument, über `m3gim-ontology:hasDetail`. Inhaltlich haften sie primär an einer Aufführung (etwa die Abendgage für eine konkrete *Walküre*-Aufführung), sekundär an Verträgen (Vertragssumme) oder Reisen (Reisekosten, Provisionen). Die Bindung an die Beteiligung ist für das Zielmodell entschieden (E-128, `hasFee`).

## 12. Dokumenttypen-Vokabular

### Hierarchische SKOS-Struktur

Das ConceptScheme `m3gim-vocab:documentaryFormTypes` ist hierarchisch, damit Queries wahlweise granular oder aggregiert filtern können, also nach Brief ebenso wie nach Korrespondenz. Die Werte werden über `rico:hasDocumentaryFormType` referenziert. Top Concept ist `m3gim-vocab:document`.

```
document (Dokument)
├── bundle (Konvolut)
├── collection (Sammlung)
├── correspondence (Korrespondenz)
│   ├── letter (Brief)
│   ├── postcard (Postkarte)
│   ├── telegram (Telegramm)
│   └── envelope (Briefumschlag)
├── press (Presse)
│   ├── newspaperClipping (Zeitungsausschnitt)
│   ├── critique (Kritik)
│   ├── review (Rezension)
│   └── musicPeriodical (Musikzeitschrift)
├── program (Programm)
├── contract (Vertrag)
├── poster (Plakat)
├── photograph (Fotografie)
├── note (Notiz)
├── typescript (Typoskript)
├── photocopy (Photokopie)
├── certificate (Urkunde)
├── businessCard (Visitenkarte)
├── receipt (Quittung)
├── sheetMusic (Noten)
├── repertoireList (Repertoireliste)
├── biographical (Biographisch)
│   ├── biography (Biographie)
│   ├── autobiography (Autobiografie)
│   ├── curriculumVitae (Lebenslauf)
│   └── chronicle (Chronik)
├── identityDocument (Identitätsdokument)
│   └── identityCard (Ausweis)
├── inventory (Verzeichnis)
├── diary (Tagebuch)
├── soundCarrier (Tonträger)
└── other (Sonstiges)
```

`collection` bleibt ein eigenständiges Concept **ohne** `skos:broader` auf `bundle`, die is-a-Beziehung wird nicht vorentschieden. Die Abgrenzung zwischen beiden ist noch zu klären (Klärungspunkt in [architecture-decisions.md](architecture-decisions.md) § Offene Modellentscheidungen). Möglicherweise bezeichnet Konvolut den physischen Umschlag und Sammlung die thematische Zusammenstellung.

Jedes emittierte Concept trägt ein lesbares deutsches `skos:prefLabel` (Pipeline-Map `DFT_LABELS`, E-101) statt des nackten Slugs. Das Frontend löst Dokumenttyp-Labels seit E-101 direkt über `skos:prefLabel` aus dem Store auf (`dftLabel(store, id)` über `store.dftHierarchy`); die frühere Frontend-Handtabelle `DOKUMENTTYP_LABELS` ist entfallen. Die Pipeline emittiert nur die Kanten der zweiten Ebene, weshalb die Wurzel `document` im Datensatz nicht erreichbar ist.

Zwei frühere Abweichungen zwischen diesem Baum und der Pipeline sind am 2026-08-21 entschieden und umgesetzt.

- `photograph` hat in der Zuordnungstabelle `DOKUMENTTYP_TO_DFT` einen Eintrag und in `DFT_LABELS` das Anzeigelabel Fotografie (E-130). Der aktuelle Objekt-Export führt den Quellwert nicht, der Eintrag bleibt im heutigen Stand also folgenlos und greift, sobald Fotografien erfasst werden. Ein Quellwert ohne Eintrag in der Zuordnungstabelle wird seit derselben Änderung mit Wert und Quellzelle gemeldet.
- `program` ist der kanonische Begriff dieses Astes und trägt das Anzeigelabel Programm (E-131). Das Konzept `programmheft` ist entfallen; die Quellwerte `programmheft` und `konzertprogramm` bleiben zulässig und lösen in `DOKUMENTTYP_TO_DFT` auf `m3gim-vocab:program` auf, im Vokabular als `skos:altLabel` geführt.

RiC-O 1.1 erwartet an `rico:hasDocumentaryFormType` ein Individuum der Klasse `rico:DocumentaryFormType`. Die Concepts tragen bislang nur `skos:Concept`. Ob sie zusätzlich als `rico:DocumentaryFormType` typisiert werden, ist eine offene Frage an das Projekt.

### Verknüpfungstyp `dokument` als Aboutness

Der Verknüpfungstyp `dokument` (ein Record nennt einen Dokumenttyp wie „Vertrag" oder „Plakate") beschreibt, **wovon** ein Record handelt. Was er enthält, sagt er damit nicht. Er wird deshalb nicht als `rico:hasOrHadSubject` serialisiert, sondern als `rico:scopeAndContent` oder über einen record-lokalen Blank-Node, der das geteilte SKOS-Concept nur referenziert. Auf den geteilten Concept-Knoten werden keine record-spezifischen Daten gepfropft.

## 13. partitur.json-Schema

Von `scripts/build-views.py` erzeugtes Derivat für eine Mobilitäts-Ansicht. Es wird derzeit von keinem aktiven Tab mehr konsumiert (der frühere Konsument `mobilitaet.js` wurde entfernt) und steht im Deferred-Aufräumblock als potenzieller Baustein für eine künftige Visualisierung. Das Schema bleibt hier als Referenz für eine Reaktivierung dokumentiert.

```json
{
  "lebensphasen": [
    { "id": "LP1", "label": "", "von": 0, "bis": 0, "ort": "", "beschreibung": "" }
  ],
  "orte": [
    { "ort": "", "typ": "wohnort|auffuehrungsort", "von": 0, "bis": 0 }
  ],
  "mobilitaet": [
    { "von": "", "nach": "", "jahr": 0, "form": "", "beschreibung": "", "kontext": "" }
  ],
  "auftritte": [
    { "ort": "", "ort_detail": "", "kategorie": "", "werk": "", "komponist": "",
      "rolle": "", "jahr": 0, "datum": "", "phase": "", "gattung": "", "titel": "",
      "dokumente": [] }
  ],
  "netzwerk": [
    { "periode": "", "intensitaet": 0 }
  ],
  "repertoire": [
    { "komponist": "", "farbe": "", "von": 0, "bis": 0, "dokumente": 0, "dokumente_liste": [] }
  ],
  "dokumente": [
    { "jahr": 0, "anzahl": 0 }
  ],
  "_meta": { "generated": "", "source_records": 0 }
}
```

Nur ein Teil der Eigenschaften stammt aus dem Modell. `auftritte` wird in drei Durchgängen aus den Annotationsknoten des Dokuments (`hasAnnotation` mit `atDate`), aus dem Aufführungsindex und aus der Titelauswertung von Programmheften, Plakaten und Rezensionen gebildet. `repertoire` und `dokumente` werden aus `rico:title` und `rico:date` der Records aggregiert, `netzwerk` aus der Dokumentzahl je Periode. `lebensphasen`, `orte` und `mobilitaet` sind biographische Konstanten im Generator und werden nicht aus dem Datensatz abgeleitet.

Gastspiel-Daten kommen zur Laufzeit aus `store.locations`. Aus partitur.json werden sie nicht bezogen.

## 16. JSON-LD Context

### Prefixe

Der emittierte `@context` führt `rico`, `ric-rst`, `m3gim-ontology`, `m3gim-data`, `m3gim-vocab`, `agrelon`, `schema`, `gndo`, `wd`, `owl`, `geo`, `skos` und `xsd`. Die URIs stehen in der Namensraum-Tabelle in Abschnitt 7.

### Aliase

- `name` → `rico:name`
- `role` → `m3gim-ontology:role`
- `composer` → `m3gim-ontology:composer`

### Gestalt des Graphen

Der Graph ist dokumentzentriert. Als eigenständige Knoten der obersten Ebene mit eigener Kennung stehen im Datensatz Dokumente, Archiveinheiten, Aufführungen, Bühnenrollen, die über `hasAnnotation` referenzierten Annotationen und die im Bestand belegten Concepts des Dokumenttypen-Vokabulars. Personen, Institutionen, Orte und Werke stehen eingebettet in dem Dokument, das sie nennt. Ist eine Entität gegen Wikidata abgeglichen, trägt der eingebettete Knoten deren Kennung, sonst nur einen Namen.

Drei Folgen für die Arbeit mit den Daten:

- Eine Frage nach allen Dokumenten zu einer Person beantwortet sich über den Namen oder die Wikidata-Kennung im eingebetteten Knoten. Einen Personenknoten gibt es nicht.
- Alle Angaben, die nur im Kontext eines Dokuments gelten, hängen am eingebetteten Knoten. Das betrifft die Rolle, die Quellzellenadresse und das Datenqualitäts-Flag.
- Beim Zusammenführen zu RDF fällt der Dokumentkontext weg, und die kontextabhängigen Angaben wandern an die global identifizierte Entität. Eine Stadt trägt dann alle Ortsrollen aller Dokumente gleichzeitig, eine Person alle Akteursrollen. Der JSON-Baum hält den Kontext, das flache Tripel nicht.

Die Annotationsknoten stehen dabei in zwei Bauformen. Die über `m3gim-ontology:hasAnnotation` erreichten Datierungen und Verortungen sind eigene Knoten der obersten Ebene und am Dokument nur als `@id`-Verweis referenziert. Die über `m3gim-ontology:hasDetail` erreichten Detailangaben sind in das Dokument eingebettet und tragen keine eigene `@id`.

### Kennzahlen ohne Träger

Die Angaben zum Export (`exportDate`, `recordCount`, `recordSetCount`, `approvedManualMatches`, `lowConfidenceSkipped`) stehen am Wurzelknoten der Serialisierung, der keinen Typ trägt. Eine Domain lässt sich für sie deshalb nicht angeben, und adressierbar sind sie nicht. Ein eigener Knoten für den Datensatz würde sie adressierbar machen.

### Technische Provenance-Properties

`m3gim-ontology:xlsxSource`, `m3gim-ontology:xlsxSheet` und `m3gim-ontology:xlsxRow` werden von der Pipeline gesetzt und nicht im Google-Sheet erfasst, siehe Abschnitt 9. `m3gim-ontology:dataPointId` stammt dagegen aus der erfassten Spalte `datenpunkt_id` und trägt seit E-125 die Auftritts-Bündelung ([data.md](data.md) § 4), nicht nur Provenienz.

## Related

- [data.md](data.md) — Quellmaterial des Modells, Schichten, Tabellen, Verknüpfungen, Rollenlisten
- [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl) — formale Fassung des Vokabulars mit den redaktionellen Anmerkungen je Term
- [`../vocab/rename-map.json`](../vocab/rename-map.json) — Abbildung der früheren auf die heutigen Bezeichner
- [architecture-decisions.md](architecture-decisions.md) — Begründung der Modellentscheidungen und Leitplanken
- [specification.md](specification.md) — Projektsteuerung und offene Entscheidungen
- [pipeline-architecture.md](pipeline-architecture.md) — wie der Datensatz erzeugt wird
- [data-errors.md](data-errors.md) — Register der Quell- und Abgleichfehler
- [data-entry-guidelines.md](data-entry-guidelines.md) — Erfassungskonventionen des Archivteams
- [testing.md](testing.md) — Test-Gates, die das Modell absichern
