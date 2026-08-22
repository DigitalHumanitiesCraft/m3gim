---
title: "Datengrundlage"
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
  standards:
    RiC-O: https://www.ica.org/en/records-context-ontology
    AgRelOn: https://d-nb.info/standards/elementset/agrelon
    Wikidata: https://www.wikidata.org
related: [research-framework, pipeline-architecture, architecture-decisions, testing, data-entry-guidelines]
---

# M³GIM Datenmodell

## 7. RiC-O-Kern und m3gim-Erweiterung

### RiC-O-Kern

Hierarchie.
`rico:RecordSet` (Konvolut, Fonds) mit `rico:Record` (Einzelstück). Agenten-Typen `rico:Person`, `rico:CorporateBody`, `rico:Group`. Beschreibungs-Properties `rico:identifier`, `rico:title`, `rico:date`, `rico:hasExtent`, `rico:hasOrHadLanguage`, `rico:generalDescription`. Relationen `rico:hasOrHadLocation`, `rico:hasOrHadSubject`, `rico:isAssociatedWithEvent`.

**Konformitäts-Korrektur (E-103).** Der Web-Audit gegen RiC-O 1.1 hat im Output emittierte Terme als nicht konform belegt. (1) `rico:isAssociatedWithRecord` existiert nicht — die `isAssociatedWith*`-Familie kennt nur `Date/Event/Place/Rule`; Record-Bezüge laufen über `rico:hasOrHadPart`/`isOrWasPartOf` bzw. eine konkrete RecordResource-Relation, ein Event-zu-Record-Bezug über `rico:isAssociatedWithEvent` von der Record-Seite. (2)/(3) `rico:File` und `rico:Fonds` sind keine Klassen und nicht im `rico:`-Namespace, sondern Werte des Vokabulars `recordSetTypes:`; ein Fonds bzw. eine File ist ein `rico:RecordSet` mit `rico:hasRecordSetType` → `recordSetTypes:Fonds`/`recordSetTypes:File`. Die Pipeline emittiert diese Terme derzeit falsch; Korrektur in derselben Runde wie E-96–E-102.

### m3gim-Klassen

| Klasse | Oberklasse | Zweck | Status |
|---|---|---|---|
| `m3gim:MusicalWork` | `rico:Thing` | musikalisches Werk (Oper, Lied, Konzert) | bestehend |
| `m3gim:Performance` | `rico:Event` | konkretes Aufführungsereignis mit Werk, Ort, Mitwirkenden | bestehend |
| `m3gim:PerformanceEvent` | `rico:Event` | Rahmenveranstaltung: Festspiele, Serien, Saisonen | bestehend |
| `m3gim:DetailAnnotation` | — | finanzielle und vertragliche Details | bestehend, erweitert |
| `m3gim:StageRole` | `rico:Thing` | Bühnenrolle als eigenständige Entität | **neu** |
| `m3gim:SpatiotemporalEvent` | `rico:Event` | raumzeitliches Mobilitätsereignis | **neu** |
| `m3gim:DatedEvent` | `rico:Event` | Fallback für Datumsrollen ohne typisierte Property | **neu**, optional |
| `m3gim:Occurrence` | `rico:Event`, `crm:E7_Activity` | Vorkommnis-Bündelknoten (Auftritt) je Aktivität, an dem die Aspekt-Facetten zusammenlaufen; domänenspezifische Unterklasse der CIDOC-CRM-Activity | **neu**, Spec; Pipeline ausstehend (E-125/E-128) |
| `m3gim:Participation` | — | Beteiligung: bindet eine mitwirkende Partei mit Funktion und gesungener Partie an eine Aufführung (je `1.0n`-Ebene der `aktivitaet_id`) | **neu**, Spec (E-128) |

### Begründung der neuen Klassen

`m3gim:StageRole` trägt der Tatsache Rechnung, dass Bühnenrollen im Datenbestand als eigenständige Entität geführt werden sollten, nicht als String-Attribut. Werktitel *Waltraute*, *Brangäne*, *2. Norn*, *Alt Solo* sind wiederkehrende referenzierbare Rollen mit Stimmfach und Werkzugehörigkeit.

`m3gim:SpatiotemporalEvent` bildet den Komposittyp `ort, datum` als Klasse ab und ist der zentrale Träger der Mobilitätsinformation; daneben speist sie sich aus den Mobilitäts-Ortsrollen, die eine datumslose Variante erzeugen (Abschnitt 4).

`m3gim:DatedEvent` ist Fallback für Datumsangaben, die nicht durch eine typisierte Property abgedeckt sind, insbesondere für klammer- und fragezeichen-unsichere Datierungen (etwa `1957-[05-27?]`). Primär wird die Property-Familie (siehe unten) verwendet.

`m3gim:Occurrence` ist der Bündelknoten, der die dokumentzentrierte Erfassung um eine Auftritts-Ebene ergänzt (Abschnitt 4). Über die `datenpunkt_id` gruppiert er die Aspekt-Klassen, also SpatiotemporalEvent für Ort und Zeit, Performance für Werk und Partie, DetailAnnotation für den Betrag und die beteiligten Agenten, zu einem Auftritt. So wird „wer hat was getan" auch dort rekonstruierbar, wo ein Dokument mehrere Auftritte bündelt. Der Name Occurrence statt Event ist bewusst weiter gefasst, weil nicht jedes Vorkommnis raumzeitlich ist, etwa ein Vertrag. Die Aspekt-Klassen bleiben als Facetten erhalten, die Occurrence liegt eine Ebene darüber.

### Zielmodell v2: zweistufige Identität und Besetzung (E-127/E-128)

Diese Sektion beschreibt den Zielzustand. Der bestehende einstufige Stand (`datenpunkt_id`, Occurrence subClassOf `rico:Event`) bleibt gültig und lauffähig, bis die Pipeline umgestellt ist; alt und neu laufen parallel, das Ziel ist neu.

**Zweistufige Identität.** Die Erfassungs-ID ist seit E-127 zweistufig. Eine Ganzzahl identifiziert die Aktivität (= Occurrence), eine zweistellige Dezimale `1.01` ff. die einzelne Beteiligung daran. Die `@id` der Occurrence kommt aus `(archivsignatur, folio, aktivität)`, die der Beteiligung aus `(occurrence, beteiligungsnummer)`. Das löst die einstufige `datenpunkt_id` als Identitätsträger ab.

**CIDOC-CRM-Anschluss.** `m3gim:Occurrence` ist zusätzlich `rdfs:subClassOf crm:E7_Activity`, neben der bestehenden `rico:Event`-Oberklasse. `crm:E7_Activity` ist die etablierte Oberklasse für zielgerichtetes Geschehen (Aufführung, Gastspiel, Vertrag); `m3gim:Occurrence` ist die domänenspezifische Unterklasse. Das schließt an die schon genutzte CIDOC-CRM-`P70`-Bezeugungslogik (`m3gim:attests`) an.

**Beteiligung als Knoten.** Jede Beteiligung (`1.0n`) wird eine `m3gim:Participation`, die genau eine mitwirkende Partei mit ihrer Funktion und, bei Sänger:innen, ihrer gesungenen Partie an der Aufführung bindet. Damit ist „X sang Y als Z" rekonstruierbar, was im flachen Modell verloren ging.

- `m3gim:performedBy` → die Person, das Ensemble oder die Organisation.
- `m3gim:inFunction` → die Funktion als `m3gim-role:`-Wert (sänger:in, dirigent:in), kontrolliert.
- `m3gim:playsStageRole` → die gesungene Partie als geteilte `m3gim:StageRole`, optional, nur wo eine Partie genannt ist.
- `m3gim:hasFee` → das Honorar als `m3gim:DetailAnnotation`, optional.

**StageRole bleibt geteilt.** Die Partie (`m3gim:role_fricka`) ist ein wiederverwendeter Konzeptknoten, sodass „wer sang Fricka über die Jahre" beantwortbar bleibt; die konkrete Besetzung sitzt an der Participation, nicht an der StageRole. Das behebt den heutigen Zustand, in dem StageRole-Knoten global und ohne Sänger- und Aufführungsbezug sind.

**Eine Aufführung trägt die ganze Besetzung.** Je Aktivität eine `m3gim:Performance` mit der Liste ihrer Beteiligungen über `m3gim:hasParticipation`, nicht je Person-Rollen-Paar eine eigene Performance. Werk, Ort und Datum hängen als Facetten an der Occurrence.

**Geld.** `m3gim:hasFee` bindet das Honorar an die Beteiligung der Person; `einnahmen`/`ausgaben`/`summe` bleiben Veranstaltungsfinanzen an der Occurrence über `m3gim:hasDetail`.

**Sprache.** Neue Properties sind englisch benannt, anschlussfähig zu rico, agrelon und crm. Die deutschen Bestandsproperties (`partie`, `bearbeitungsstand`, die `*datum`-Familie) wandern im Zuge der Umstellung nach und bleiben bis dahin gültig (E-128 löst die offene Sprachentscheidung auf Englisch auf).

### Identität der neuen Entitäten

`m3gim:StageRole`-Instanzen bekommen eine deterministische Slug-`@id` der Form `m3gim:role_<slug>` im Entitäts-Namespace und werden darüber dedupliziert. Das ConceptScheme `m3gim-role:` bleibt davon getrennt — es trägt die Relationsrollen als Werte, nicht die Bühnenrollen-Entitäten. `m3gim:hasStageRole` hängt an der `m3gim:Performance`, nicht am Record.

`m3gim:Occurrence`-Instanzen bekommen eine deterministische `@id` aus `(archivsignatur, folio, datenpunkt_id)`, analog zur inhaltsbasierten STE-`@id` (E-115). Solange die Identität pro Dokument vergeben wird, gehört eine Occurrence genau einem Record; die Bezeugungs-Relation `m3gim:attests` hält den Weg zu einer dokumentübergreifenden Auftritts-Identität offen, ohne sie schon zu verlangen.

`m3gim:dataQualityFlag` zieht aus einem kontrollierten Vokabular (`name-nicht-eindeutig`, `vorname-fehlt`, `rolle-unsicher`, `quelle-tippfehler` — quell-belegt aus den `anmerkung`-Einträgen, nicht extrapoliert), abgeleitet aus Unsicherheitssignalen im `anmerkung`-Feld. Seine Konfidenz steht in der eigenen Property `m3gim:qualityConfidence`, getrennt von der inhaltlichen Aussage. **Die Property wird derzeit nicht befüllt** (E-102/E-106): die `anmerkung`-Freitexte liefern kein quantifizierbares Konfidenzsignal, und ein gesetzter Zahlenwert wäre genau die von der Leitplanke verbotene erfundene Konfidenz. `m3gim:qualityConfidence` ist deklariert und für eine künftige, belegbare Quelle reserviert. Das Flag selbst ist das Unsicherheitssignal.

`m3gim:derivedFromRole` hält die XLSX-Ursprungsrolle dort fest, wo eine Relation ihren Auslöser sonst verlöre — etwa `vertragspartner`, das auf dieselbe AgRelOn-Klasse wie `arbeitgeber` abbildet und ohne den Marker nicht unterscheidbar wäre.

### m3gim-Object-Properties

| Property | Domain → Range | Zweck |
|---|---|---|
| `m3gim:hasAssociatedAgent` | Record → Person/CorporateBody | Agenten-Verknüpfung (RiC-O kennt kein hasOrHadAgent) |
| `m3gim:hasPerformer` | Performance → Person | Person wirkt bei Aufführung mit |
| `m3gim:performanceOf` | Performance → MusicalWork | Aufführung eines Werks |
| `m3gim:hasStageRole` | Performance → StageRole | konkrete Bühnenrolle der Aufführung |
| `m3gim:belongsToWork` | StageRole → MusicalWork | Bühnenrolle gehört zu Werk |
| `m3gim:hasPerformance` | Record → Performance | Record verweist auf eine Aufführung |
| `m3gim:hasSpatiotemporalEvent` | Record → SpatiotemporalEvent | Record verweist auf ein Mobilitätsereignis |
| `m3gim:atPlace` | SpatiotemporalEvent → Place | Ortsreferenz |
| `m3gim:hasDetail` | Record/Performance → DetailAnnotation | Verweis auf Detailebene |
| `m3gim:attachedTo` | DetailAnnotation → Performance/Record | Rückreferenz |
| `m3gim:attests` | Record → Occurrence | Record bezeugt ein Vorkommnis (nicht „enthält"; folgt der CIDOC-CRM-`P70`-Logik, Abschnitt 4) |
| `m3gim:hasParticipation` | Performance/Occurrence → Participation | Besetzungsbindung einer Aufführung (E-128) |
| `m3gim:performedBy` | Participation → Person/Group/CorporateBody | mitwirkende Partei der Beteiligung (E-128) |
| `m3gim:inFunction` | Participation → `m3gim-role:`-Concept | Funktion in der Aufführung, kontrolliert (E-128) |
| `m3gim:playsStageRole` | Participation → StageRole | gesungene Partie, optional (E-128) |
| `m3gim:hasFee` | Participation → DetailAnnotation | Honorar der Beteiligung, optional (E-128) |

Die Facetten-Relationen `m3gim:hasAssociatedAgent`, `m3gim:hasSpatiotemporalEvent`, `m3gim:hasPerformance` und `m3gim:hasDetail` bekommen mit dem Occurrence-Modell `m3gim:Occurrence` als zusätzliche Domain. Trägt eine Zeile eine `datenpunkt_id`, hängen sie an der Occurrence; ohne `datenpunkt_id` bleiben sie am Record (Dokument-Default).

### m3gim-Datatype-Properties

| Property | Typ | Zweck |
|---|---|---|
| `m3gim:bearbeitungsstand` | xsd:string | projektinterner Status (Objektebene) |
| `m3gim:bearbeitungsnotiz` | xsd:string | redaktionelle Notiz zum Objekt-Bearbeitungsstand |
| `m3gim:accessStatus` | xsd:string | benutzungsrechtlicher Zugangsstatus (Objektebene), aus Quellspalte `zugaenglichkeit`; Werte `offen`, `eingeschraenkt`, `gesperrt`. Bedingt emittiert, die Spalte fehlt im aktuellen Export |
| `m3gim:digitizationStatus` | xsd:string | Digitalisierungsstand (Objektebene), aus Quellspalte `scan_status`; Werte `nicht_gescannt`, `gescannt`, `online`. Bedingt emittiert, die Spalte fehlt im aktuellen Export |
| `m3gim:eventRole` | xsd:string | Rolle eines SpatiotemporalEvent |
| `m3gim:mode` | xsd:string | Auftrittsmodus (gastspiel, tournee) an der Occurrence, getrennt vom Rollenvokabular |
| `m3gim:atDate` | xsd:string | Datum als Literal an SpatiotemporalEvent |
| `m3gim:voiceType` | xsd:string | Stimmfach an StageRole |
| `m3gim:probenTyp` | xsd:string | Probenart (probe, generalprobe) an der Probendatum-Aussage |
| `m3gim:monetaryAmount` | xsd:decimal | Geldbetrag an DetailAnnotation |
| `m3gim:currency` | xsd:string | Währungscode an DetailAnnotation |
| `m3gim:contractStatus` | xsd:string | Vertragsstatus (etwa „nicht eingehalten") am Vertrags-Record |
| `m3gim:realized` | xsd:boolean | ob ein Vertrag erfüllt wurde; `false` nur explizit, nie geraten |
| `m3gim:dataQualityFlag` | xsd:string (SKOS) | kontrolliertes Datenqualitäts-Flag |
| `m3gim:qualityConfidence` | xsd:decimal | Konfidenz des Flags, getrennt von der Aussage-Konfidenz |
| `m3gim:derivedFromRole` | xsd:string | XLSX-Ursprungsrolle einer Relation, wenn sonst nicht rekonstruierbar |

### Normdaten-Properties aus Wikidata-Enrichment (E-105)

Die aus dem Wikidata-Enrichment injizierten Personen-, Orts- und Werk-Normdaten nutzen, wo ein etabliertes Vokabular trägt, dieses statt einer Eigenprägung — das erhält die Anschlussfähigkeit (entschieden E-105, IRIs im Audit 2026-06-18 belegt). Personen-Lebensdaten laufen über schema.org, der Beruf über die GND-Literal-Property; die übrigen, für die es kein passendes Standardvokabular gibt, bleiben unter `m3gim:` mit dem `wd`-Präfix als Marker ihrer Wikidata-Herkunft.

| Property | Typ / Range | Domain | Zweck |
|---|---|---|---|
| `schema:birthDate` | Date (xsd:string) | Person | Geburtsdatum |
| `schema:deathDate` | Date (xsd:string) | Person | Sterbedatum |
| `schema:birthPlace` | Place | Person | Geburtsort (derzeit Label-Literal; Range-Verfeinerung auf eine Ortsressource mit `wd:`-`@id` ist offen) |
| `schema:deathPlace` | Place | Person | Sterbeort (dito) |
| `gndo:professionOrOccupationAsLiteral` | Literal (Liste) | Person | Beruf/Tätigkeit als Freitext-Label; die Literal-Variante, nicht das IRI-erwartende `gndo:professionOrOccupation` |
| `m3gim:voiceType` | xsd:string | Person/StageRole | Stimmfach; bleibt `m3gim:` (kein schema-Äquivalent) |
| `m3gim:country` | xsd:string | Place | Land eines Ortes (Wikidata P17); Place-Property, **nicht** Personennormdatum |
| `m3gim:wdComposer` | xsd:string | MusicalWork | Komponist laut Wikidata |
| `m3gim:wdGenre` | xsd:string/Liste | MusicalWork | Genre laut Wikidata |
| `m3gim:wdPremiereDate` | xsd:string | MusicalWork | Uraufführungs-/Publikationsdatum laut Wikidata (löst die englisch/deutsch-Dublette `premiereDate`/`premieredatum` auf — Letzteres bleibt die record-seitige Datumsrolle) |
| `m3gim:wdLocation` | xsd:string | CorporateBody | Sitz laut Wikidata |
| `m3gim:inception` | xsd:string | CorporateBody | Gründungsdatum laut Wikidata |

Die vier Zeitwerte dieser Familie, `schema:birthDate`, `schema:deathDate`, `m3gim:wdPremiereDate` und `m3gim:inception`, werden bei der Anreicherung auf die in Wikidata belegte Präzision geschnitten und tragen damit die Formen von EDTF Level 0, also Jahr, Jahr und Monat oder vollständiges Datum (E-132). Die Präzisionsstufe selbst wird nicht als eigener Term mitgeführt, sie steht implizit in der Länge des Werts. Der Zeichenkettentyp bleibt aus demselben Grund wie bei den übrigen Datumsproperties.

### Kuratierte Index-Properties (M1, Index-Durchreichung)

Die Indextabellen (Personen-, Organisations-, Orts- und Werkindex) pflegen Felder, die die Pipeline zuvor nach `build_index_lookup` verlor (nur `wikidata_id`/`komponist` wurden durchgereicht). M1 reicht sie als eigene `m3gim:`-Properties an die jeweilige Entität durch — getrennt von den Wikidata-Normdaten oben (kuratiert gegen angereichert) und vom Verknüpfungs-`anmerkung`. Quelle ist die Index-Spalte, nicht das Wikidata-Enrichment; damit erreichen Beruf, Sitz und Partie auch ungematchte Entitäten ohne Q-ID.

| Property | Typ / Range | Domain | Quelle (Index-Spalte) | Zweck |
|---|---|---|---|---|
| `m3gim:sitz` | xsd:string | CorporateBody | Organisationsindex `ort` | kuratierter Sitz; Vorrang vor `m3gim:wdLocation` (oft nur Stadtteil); trägt „auswärts gegen am Haus" |
| `m3gim:keyContact` | xsd:string | CorporateBody | Organisationsindex `assoziierte_person` | Schlüsselkontakt der Institution |
| `m3gim:partie` | xsd:string | MusicalWork | Werkindex `rolle/stimme` | von Malaniuk gesungene Partie pro Werk (Mezzo-Repertoire-Kern) |
| `m3gim:lifespan` | xsd:string | Person | Personenindex `lebensdaten` | kuratierte Lebensspanne; getrennt von `schema:birthDate`/`deathDate` |
| `m3gim:editorialNote` | xsd:string | Person/CorporateBody/MusicalWork | Index-`anmerkung` | redaktionelle Anmerkung (Person: Beruf/Funktion; Institution: Typ; Werk: Werkgruppe) |

Loader-seitig landen sie additiv in `store.organizations[].sitz`/`keyContact`/`note`, `store.works[].partie`/`note`, `store.persons[].note`/`lifespan`. Abgesichert durch `tests/test_36_index_completeness.py` (Index-Zelle gegen Entitäts-Property, mit Mindestvorkommen) und die synthetischen Loader-Tests.

### Typisierte Datumsproperty-Familie

Statt einer generischen `m3gim:eventDate` trägt das Modell für die empirisch belegten Datumsrollen je eine typisierte Property. Damit bleibt die semantische Differenzierung zwischen Absendedatum, Erscheinungsdatum, Premierendatum etc. in Queries direkt adressierbar.

`m3gim:absendedatum`, `m3gim:empfangsdatum`, `m3gim:ausstellungsdatum`, `m3gim:erscheinungsdatum`, `m3gim:abreisedatum`, `m3gim:auftrittsdatum`, `m3gim:auffuehrungsdatum`, `m3gim:probendatum`, `m3gim:probenbeginn`, `m3gim:premieredatum`, `m3gim:ausstrahlungsdatum`, `m3gim:spielzeitVon`, `m3gim:spielzeitBis`, `m3gim:ueberweisungsdatum`, `m3gim:erstelldatum`, `m3gim:gespraechsdatum`.

Alle Properties vom Typ xsd:string, weil historische Datierung die ISO-Schema-Strenge von xsd:date regelmäßig überschreitet (Qualifier `circa:`, TimeSpans, unvollständige Datierungen).

Für nicht typisierte oder zukünftig auftretende Rollen dient die Fallback-Klasse `m3gim:DatedEvent` mit Properties `m3gim:dateValue`, `m3gim:dateRole`.

### Erwähnung

Inhaltlich erwähnte Personen und Institutionen werden als `rico:hasOrHadSubject` mit `@type: rico:Person` bzw. `rico:CorporateBody` serialisiert, statt über eine custom-Property `m3gim:mentions`. Damit bleibt das Modell RiC-O-konform.

### PerformanceRoles als SKOS-ConceptScheme

Das bestehende SKOS-ConceptScheme `m3gim-role:` bündelt die Bühnen- und Aufführungsrollen. Es wird durch die Rollenlisten aus Abschnitt 5 ersetzt und in die Kategorien archivalisch-inhaltlich, künstlerisch und institutionell gegliedert.

## 8. AgRelOn-Integration

### Scope und Begründung

AgRelOn (Agent Relationship Ontology der Deutschen Nationalbibliothek) modelliert Beziehungen zwischen Agenten (Personen, Organisationen) über ein nach Kategorien gegliedertes Vokabular von Relationstypen. Das M³GIM-Modell integriert AgRelOn als *komplementäre Ebene* für Agent-Agent-Beziehungen und für Meta-Statements. AgRelOn ersetzt keinen Teil des m3gim-Modells, weil sein Scope auf Agent-Agent beschränkt ist und raumzeitliche, werkbezogene oder archivische Relationen nicht abdeckt.

Die Integration verfolgt folgende Ziele:

1. Standardvokabular für die institutionelle und die Korrespondenzschicht.
2. GND-Anschlussfähigkeit für Bestände anderer Archive.
3. Meta-Statement-Muster (Gültigkeit, Konfidenz, Provenienz) als einheitliche Querschnittsebene (siehe Abschnitt 9).

### Übernommene AgRelOn-Klassen und -Properties

**Klassen (n-ary Reifikation)**

| Klasse | Nutzung im Modell |
|---|---|
| `agrelon:HasEmployeeEmployer` | Engagement Malaniuk → Opernhäuser |
| `agrelon:HasCorrespondent` | Brief- und Telegrammverkehr |
| `agrelon:HasProfessionalContact` | Agenten, Vermittler, Kolleg:innen |
| `agrelon:HasColleague` | Ko-Präsenz bei Aufführungen (inferiert) |
| `agrelon:HasStudentTeacher` | Ausbildungskontext |
| `agrelon:IsHasPatron` | Förderverhältnisse |
| `agrelon:HasIsMember` | Ensemblemitgliedschaft |

**Direkte Properties**

`agrelon:hasEmployer`, `agrelon:hasEmployee`, `agrelon:hasCorrespondent`, `agrelon:hasProfessionalContact`, `agrelon:hasColleague`, `agrelon:hasTeacher`, `agrelon:hasStudent`, `agrelon:isPatronOf`, `agrelon:hasPatron`, `agrelon:isMemberOf`, `agrelon:hasMember`.

**Konformitäts-Korrektur (E-104, amendiert E-69).** Der Web-Audit gegen die DNB-RDF hat bestätigt: das n-äre Reifikationsmuster (eine Klasse pro Beziehungstyp, Agenten über `agrelon:hasSubject`/`hasObject`, Gültigkeit als Blank-Node) entspricht AgRelOn exakt. Einige Benennungen sind aber zu korrigieren. Gültigkeit, Konfidenz und Provenienz führt AgRelOn unter `metadata*`, nicht `has*`: `agrelon:metadataPeriod` (statt `hasValidityPeriod`), `agrelon:metadataConfidence` (statt `hasConfidenceValue`), `agrelon:metadataProvenance` (statt `hasProvenance`); `hasBeginDate`/`hasEndDate` am Period-Blank-Node sind korrekt. Die Patron-Klasse heißt `agrelon:IsHasPatron` (nicht `HasIsPatron`); `HasIsMember` ist korrekt. Die Reifikation muss `agrelon:hasSubject` zusätzlich zu `hasObject` setzen (aktuell nur `hasObject` emittiert). Die obigen Beispiele und Tabellen sind bereits auf die korrekten Terme gesetzt; Pipeline und die Tests test_12/test_19 sind nachzuziehen.

### Mapping M³GIM-Rolle → AgRelOn

| M³GIM-Kontext | AgRelOn-Property |
|---|---|
| institution `arbeitgeber` bei Malaniuk | `agrelon:hasEmployer` |
| institution `ausbildungsstätte` bei Malaniuk | `agrelon:isMemberOf` + `agrelon:hasTeacher` (sofern Lehrkraft erschließbar) |
| person `agent`, `vermittler` | `agrelon:hasProfessionalContact` |
| person `auftraggeber` bei finanzieller Förderung | `agrelon:isPatronOf` |
| person `absender` oder `empfänger` in Korrespondenz | `agrelon:hasCorrespondent` (bidirektional) |
| person `adressat` in Korrespondenz | `agrelon:hasCorrespondent` |
| Ko-Präsenz Malaniuk ↔ anderer Sänger:in in derselben Aufführung | `agrelon:hasColleague` (inferiert mit Provenance-Spur) |

### Serialisierungsbeispiel

```turtle
:rel_malaniuk_wienerstaatsoper a agrelon:HasEmployeeEmployer ;
    agrelon:hasSubject :malaniuk ;
    agrelon:hasObject :wiener_staatsoper ;
    agrelon:metadataPeriod [
        agrelon:hasBeginDate "1956" ;
        agrelon:hasEndDate "1971"
    ] ;
    agrelon:metadataProvenance <https://m3gim.dhcraft.org/record/UAKUG/NIM_004/24> .
```

### Abgrenzung

AgRelOn modelliert *nicht*: Orte, Werke, Bühnenrollen, Aufführungen, Dokumenttypen, raumzeitliche Ereignisse, Datumstypologien jenseits der Relationsgültigkeit, finanzielle Details. Für diese Bereiche bleibt das m3gim-Modell zuständig.

## 9. Meta-Statement-Modell

### Prinzip

Jede Aussage im Modell kann mit den Meta-Angaben Gültigkeitsperiode, Konfidenzwert und Provenienz versehen werden. Das Muster stammt aus AgRelOn und wird auf alle M³GIM-Relationen übertragen, nicht nur auf Agent-Agent-Relationen. Damit entsteht eine einheitliche Querschnittsebene über den fachlichen Schichten.

### Properties

| Property | Wertebereich | Zweck |
|---|---|---|
| `agrelon:metadataPeriod` | Blank Node mit Begin/End | Zeitraum, in dem die Aussage gilt |
| `agrelon:hasBeginDate` | xsd:string (ISO-8601 oder TimeSpan) | Beginn der Gültigkeit |
| `agrelon:hasEndDate` | xsd:string | Ende der Gültigkeit |
| `agrelon:metadataConfidence` | xsd:decimal [0..1] oder xsd:string (Stufenwert) | Konfidenzwert |
| `agrelon:metadataProvenance` | URI auf Archivrecord oder Literal | Quelle der Aussage |

### Datierungsevidenz wird nicht serialisiert (E-106)

Die `datierungsevidenz`-Spalte (`aus_dokument`/`erschlossen`/`extern`/`unbekannt`) wird **nicht** in den Output übernommen — weder als altes `m3gim:dateEvidence` noch als `agrelon:metadataConfidence`-Dezimalwert. Der frühere Mapping-Schritt (aus_dokument→1.0, extern→0.8, erschlossen→0.6) war eine **erfundene Projektion** der kategorialen Evidenz auf eine Zahl: kein gemessener Wert, gegen die Leitplanke „Konfidenz nicht erfinden". Kein aktives Feature las den Wert. Mit der Konfidenz entfällt auch die record-seitige Datierungs-**Self-Provenance** (`metadataProvenance` → eigener Record), die ohne den Konfidenzwert ein leerer Selbstverweis war.

Falls die Datierungsevidenz später gebraucht wird, kehrt sie als **kategorialer Wert** zurück — entweder als `agrelon:metadataConfidence`-String-Stufenwert (`"aus_dokument"`/`"erschlossen"`/`"extern"`; der Wertebereich oben erlaubt das ausdrücklich) oder als wiederbelebtes `m3gim:dateEvidence`-Literal. Eine Dezimalzahl wird nicht reaktiviert.

Die legitime `agrelon:metadataProvenance` bleibt unberührt: auf den AgRelOn-Relationen (`m3gim:agentRelation`, Rückverweis auf den dokumentierenden Record) und auf SpatiotemporalEvents.

Der Bearbeitungsstand `m3gim:bearbeitungsstand` bleibt als datensatzinterner Projektstatus erhalten und ist nicht Teil der Meta-Statement-Schicht.

### XLSX-Quellreferenz (`m3gim:xlsxSource`)

Ergänzend zur semantischen Provenance (`agrelon:metadataProvenance`; die Datierungs-`metadataConfidence` entfällt seit E-106) trägt jede aus dem Excel abgeleitete Entität eine **technische Quellreferenz** auf die Ursprungszelle. Sie ist keine wissenschaftliche Quellenangabe, sondern eine Rückverfolgbarkeits-Kette für Pipeline und Review.

| Property | Wertebereich | Zweck |
|---|---|---|
| `m3gim:xlsxSource` | Blank Node | Container für die Adressteile (Sheet, Zeile, optional datenpunktId) |
| `m3gim:xlsxSheet` | xsd:string | Name des Ursprungs-Sheets. Objektzeilen tragen `"Objekte"`, Verknüpfungszeilen den Namen des jeweiligen Box-Blatts (etwa `"Box_01"`, `"Box 5"`), weil die Verknüpfungstabelle über mehrere, uneinheitlich benannte Blätter verteilt ist (E-95) |
| `m3gim:xlsxRow` | xsd:integer (≥ 2) | 1-basierte XLSX-Zeilennummer inklusive Header-Zeile |
| `m3gim:datenpunktId` | xsd:integer (optional) | Identität der Auftritts-Occurrence innerhalb des Dokuments (Abschnitt 4 und 7); leer = Dokument-Ebene. Aus Spalte `datenpunkt_id`. Die frühere Lesart als reine Provenienz-Kennung ist mit E-125 überholt |

Angebracht wird `m3gim:xlsxSource`:

- **am Record** (aus `M3GIM-Objekte.xlsx`). `xlsxSheet = "Objekte"`, `xlsxRow` entspricht der Excel-Zeilennummer des Objekts.
- **an jeder DetailAnnotation** (Finanz-Detail, Sach-Detail). `xlsxSheet` trägt den Namen des Box-Blatts, aus dem die Verknüpfungszeile stammt.
- **an jeder AgRelOn-Relation** (`m3gim:agentRelation`-Einträgen).
- **an jedem SpatiotemporalEvent** (Top-Level-Graph-Entität).

Direkte Record-Properties (`rico:title`, `rico:date`, `m3gim:documentType` etc.) bekommen keinen eigenen `xlsxSource`, weil ihre Herkunft implizit die des umgebenden Records ist. Damit bleibt die JSON-LD lesbar, ohne Provenance pro Atom-Property zu wiederholen.

Beispiel (Finanz-Detail aus NIM_007 5_1, Zeile 1276):

```json
{
  "@type": "m3gim:DetailAnnotation",
  "m3gim:detailField": "ausgaben",
  "m3gim:detailValue": "36000",
  "m3gim:monetaryAmount": {"@value": 36000, "@type": "xsd:decimal"},
  "m3gim:currency": "S",
  "m3gim:detailRole": "erwähnt",
  "rico:generalDescription": "10% an [Organi]",
  "m3gim:xlsxSource": {
    "m3gim:xlsxSheet": "Box_01",
    "m3gim:xlsxRow": 1276
  }
}
```

Die Kontrakttests in `tests/test_20_xlsx_provenance.py` halten die volle xlsxSource-Coverage als Soft-Invariante und pflegen kuratierte Anker-Records (NIM_007 5_1, NIM_004 3, NIM_003 1_8) mit exakten Zeilenerwartungen als Fixtures.

### Anwendung in Reifikation

Für nicht-agentische Relationen, bei denen das n-ary-Reifikationsmuster nicht aus AgRelOn stammt, wird RDF-Reifikation oder das Muster `m3gim:Statement` (als Leichtgewichtsvariante) verwendet. Beispiel:

```turtle
:stmt_001 a m3gim:Statement ;
    rdf:subject :performance_bayreuth_1951_walkuere ;
    rdf:predicate m3gim:hasPerformer ;
    rdf:object :malaniuk ;
    agrelon:metadataProvenance <https://m3gim.dhcraft.org/record/UAKUG/NIM_007/3> .
```

Aus Performance-Gründen ist diese Reifikation optional und nur dort anzuwenden, wo die Provenienz nicht bereits aus der Record-URI selbst folgt.

## 10. Mobilitätsmodell

### Motivation

Mobilität ist die zentrale inhaltliche Frage des Projekts. Das Datenmodell unterstützt sie über die unterscheidbaren Sichten performative, institutionelle, Reise- und Korrespondenz-, biographische und diskursive Mobilität, die als SPARQL-Abfragemuster auf den bestehenden Klassen und Rollen realisiert sind. Sie werden nicht als eigene Klassen angelegt, weil sie verschiedene Schnitte durch dieselben Daten sind.

### Mobilitätssichten

**Performative Mobilität.** Wo trat Malaniuk auf?
`m3gim:SpatiotemporalEvent` mit `m3gim:eventRole` ∈ {auftritt, aufführung, gastspiel, premiere, wiederaufnahme, festvorstellung}. Alternativ: `m3gim:Performance` mit `m3gim:hasPerformer` = Malaniuk, `m3gim:atPlace`, `m3gim:auffuehrungsdatum`.

**Institutionelle Mobilität.** Wo war sie engagiert?
`m3gim:SpatiotemporalEvent` mit `eventRole` = spielzeit. Ergänzend `agrelon:HasEmployeeEmployer`-Relationen mit Gültigkeitsperiode.

**Reise- und Korrespondenzmobilität.** Wo war sie wann?
`agrelon:HasCorrespondent` mit `agrelon:metadataProvenance` auf Briefe. Ergänzt durch die Mobilitäts-Ortsrollen `absendeort`, `empfangsort`, `zielort`, `abreiseort`, `vertragsort` (je eine datumslose `m3gim:SpatiotemporalEvent`, Abschnitt 4) und die Datumsrollen `absendedatum`, `empfangsdatum`, `abreisedatum`.

**Biographische Mobilität.** Wohn- und Lebensorte.
Ortsrolle `wohnort` an Malaniuk mit TimeSpan via `agrelon:metadataPeriod`.

**Diskursive Mobilität.** Wo wurde über sie berichtet?
`rico:Record` mit Dokumenttyp ∈ {rezension, presse, kritik} + `entstehungsort` oder Herausgeberinstitution mit Ortsreferenz. Der diskursive Raum weicht typischerweise vom performativen ab.

Die UI-Anbindung dieser Sichten, etwa die Farbfamilie für Chronik-Chips, liegt in [design.md](design.md). Die Absicherung gegen fehl-gemappte eventRoles erfolgt in `tests/test_25_chronik_mobility_cluster.py`.

Mit dem tieferen Export aktivierte eventRole-Cluster (`EVENT_ROLE_TO_MOBILITY_CLUSTER` in `docs/js/data/constants.js`), provisorisch und mit dem Erschließungsteam zu bestätigen (Treffen 2026-06-23):

| eventRole | Cluster | Begründung |
|---|---|---|
| generalprobe | performativ | wie das Geschwister `probe`, eindeutig performativ |
| aufnahme | diskursiv | mediale/diskursive Spur wie `ausstrahlung` (Rundfunk-/Tonaufnahme) |
| rahmenveranstaltung | null | genuin unklar; `null` = keine Sicht/Klärungsbedarf, keine willkürliche Einordnung |

Der Vertragsstatus `nicht eingehalten` (Abschnitt 11) ist keine eventRole und wird im STE-Bau nicht als `m3gim:eventRole` durchgereicht.

### Die zentrale Klasse: m3gim:SpatiotemporalEvent

```turtle
:spe_bayreuth_1951_gastspiel a m3gim:SpatiotemporalEvent ;
    m3gim:eventRole "gastspiel" ;
    m3gim:atPlace :bayreuth ;
    m3gim:atDate "1951/1953" ;
    # Record-Bezug von der Record-Seite via rico:isAssociatedWithEvent bzw. m3gim:hasSpatiotemporalEvent (E-103); kein rico:isAssociatedWithRecord
    agrelon:metadataProvenance <UAKUG/NIM_004/24> .
```

Die `@id` im Beispiel ist illustrativ. Real vergibt die Pipeline sie inhaltsbasiert als `m3gim:ste_<record-local-id>_<sha1(ort\x1frolle\x1fdatum)[:8]>`, mit stabilem Ordinal-Suffix `-N` bei echten Inhaltsdubletten auf demselben Record (E-115). Damit ist die `@id` eine reine Funktion ihres Inhalts und stabil gegen die Zeilenreihenfolge im XLSX. Beide Emissionspfade (Komposit `ort, datum` und die datumslose Mobilitäts-STE aus Abschnitt 4) teilen sich denselben Helper `_ste_id`.

### Abdeckungsabhängigkeit

Jede Mobilitätsauswertung muss den derzeitigen Erschließungsstand mitführen: nur wenige Signaturen sind fein erschlossen, Datumsangaben und Titel sind selektiv vorhanden. Aktuelle Abdeckungszahlen stehen in `data/reports/quality-snapshot.md`. Mobilitätskarten sind deshalb als *Zwischenstand der Erschließung* zu kommunizieren, nicht als Rekonstruktion der Biographie. Dieser Survivorship Bias muss bei Visualisierungen textlich gekennzeichnet sein.

## 11. Finanzschicht

### Klasse und Properties

`m3gim:DetailAnnotation` ist die Trägerklasse für Schicht 3. Sie wird erweitert um Finanzattribute.

| Property | Typ | Zweck |
|---|---|---|
| `m3gim:monetaryAmount` | xsd:decimal | Geldbetrag |
| `m3gim:currency` | xsd:string | Währungscode |
| `m3gim:detailRole` | xsd:string (SKOS) | Art des Finanzpostens |
| `m3gim:attachedTo` | Object Property | Referenz auf Aufführung, Vertrag, Reise oder Record |

Das Rollenvokabular für `detailRole` bleibt offen erweiterbar. Belegte Werte: abendgage, provision, gesamtvergütung, reisekosten, rundfunkhonorar, dépôt, transfer, erwähnt. Umlaute bleiben erhalten (`gesamtvergütung`, keine ASCII-Transliteration).

### Währungscodes

Wo möglich ISO-4217 (DEM, CHF, ATS, FRF, ESC, USD). Historische und uneindeutige Währungen behalten ihren Originalcode aus der Quelle (RM für Reichsmark, S für Schilling, `Lire`, `Belgische Francs`) mit Klartext-Auflösung im Kommentarfeld — sie werden nicht spekulativ auf einen ISO-Code normalisiert.

Belegt im aktuellen Datenbestand: RM (Reichsmark), DM (Deutsche Mark), ATS/S (Österreichischer Schilling), CHF, FRF (Fr), ESC (portugiesischer Escudo), USD, Lire, Belgische Francs.

### Betragsparsing und Doppelbeträge

Beträge stehen in der Quelle in wechselnder Notation, auch mit nachgestellter Währung (`50000 Lire`) und als Doppelbetrag (`25, DM / 45, DM`). Der Parser trennt zuerst die Währung ab und extrahiert dann den numerischen Wert; ein Doppelbetrag wird zu zwei eigenständigen `m3gim:DetailAnnotation` mit gleichem `detailField`. Kein belegter Betrag darf dabei verloren gehen.

### Vertragsstatus

Ein in der Quelle vermerkter unerfüllter Vertrag (`nicht eingehalten`) wird als `m3gim:contractStatus` mit `m3gim:realized = false` am Vertrags-Record getragen, nicht an der betragslosen DetailAnnotation. `realized = false` wird nur bei explizitem Beleg gesetzt, nie aus fehlendem Beleg geschlossen.

### Anbindung

Finanzeinträge haften primär an `m3gim:Performance` (z.B. Abendgage für eine konkrete *Walküre*-Aufführung), sekundär an Verträgen (Vertragssumme) oder Reisen (Reisekosten, Provisionen).

### Serialisierungsbeispiel

```turtle
:gage_lissabon_meistersinger a m3gim:DetailAnnotation ;
    m3gim:detailRole "abendgage" ;
    m3gim:monetaryAmount "4000"^^xsd:decimal ;
    m3gim:currency "ESC" ;
    m3gim:attachedTo :performance_lissabon_meistersinger ;
    agrelon:metadataProvenance <UAKUG/NIM_007/4> .
```

## 12. Dokumenttypen-Vokabular

### Hierarchische SKOS-Struktur

Das ConceptScheme `m3gim-dft:` wird hierarchisch ausgebaut. Damit können Queries wahlweise granular oder aggregiert filtern.

```
dokument
├── konvolut (aggregierender Typ auf Konvolut-Ebene)
├── sammlung (Klärungsbedarf: Verhältnis zu konvolut)
├── korrespondenz
│   ├── brief
│   ├── postkarte
│   ├── telegramm
│   └── briefumschlag
├── presse
│   ├── zeitungsausschnitt
│   ├── kritik
│   ├── rezension
│   └── musikzeitschrift
├── programm
├── vertrag
├── plakat
├── fotografie
├── notiz
├── typoskript
├── photokopie
├── urkunde
├── visitenkarte
├── quittung
├── noten
├── repertoireliste
├── biographisch
│   ├── biographie
│   ├── autobiografie
│   ├── lebenslauf
│   └── chronik
├── identitaetsdokument
│   └── ausweis
├── verzeichnis
├── tagebuch
├── tontraeger
└── sonstiges
```

Gegenüber der Vorfassung ergänzt sind korrespondenz, presse, programm, autobiografie, identitaetsdokument, repertoireliste, biographisch, briefumschlag, musikzeitschrift, chronik, verzeichnis. `sammlung` bleibt ein eigenständiges Concept **ohne** `skos:broader` auf konvolut — die is-a-Beziehung wird nicht vorentschieden. Die Abgrenzung zwischen sammlung und konvolut ist noch zu klären (Klärungspunkt in [architecture-decisions.md](architecture-decisions.md) § Offene Modellentscheidungen): möglicherweise ist konvolut der physische Umschlag und sammlung die thematische Zusammenstellung.

Jedes emittierte dft-Concept trägt ein lesbares deutsches `skos:prefLabel` (Pipeline-Map `DFT_LABELS`, E-101) statt des nackten Slugs. Das Frontend löst Dokumenttyp-Labels seit E-101 direkt über `skos:prefLabel` aus dem Store auf (`dftLabel(store, id)` über `store.dftHierarchy`); die frühere Frontend-Handtabelle `DOKUMENTTYP_LABELS` ist entfallen.

Zwei frühere Abweichungen zwischen diesem Baum und der Pipeline sind am 2026-08-21 entschieden und umgesetzt.

- `fotografie` hat in der Zuordnungstabelle `DOKUMENTTYP_TO_DFT` einen Eintrag und in `DFT_LABELS` das Anzeigelabel Fotografie (E-130). Der aktuelle Objekt-Export führt den Quellwert nicht, der Eintrag bleibt im heutigen Stand also folgenlos und greift, sobald Fotografien erfasst werden. Ein Quellwert ohne Eintrag in der Zuordnungstabelle wird seit derselben Änderung mit Wert und Quellzelle gemeldet.
- `programm` ist der kanonische Begriff dieses Astes und trägt das Anzeigelabel Programm (E-131). Das Konzept `programmheft` ist entfallen; die Quellwerte `programmheft` und `konzertprogramm` bleiben zulässig und lösen in `DOKUMENTTYP_TO_DFT` auf `m3gim-dft:programm` auf, im Vokabular als `skos:altLabel` geführt.

### Verknüpfungstyp `dokument` als Aboutness

Der Verknüpfungstyp `dokument` (ein Record nennt einen Dokumenttyp wie „Vertrag" oder „Plakate") beschreibt, **wovon** ein Record handelt, nicht was er enthält. Er wird deshalb nicht als `rico:hasOrHadSubject` serialisiert, sondern als `rico:scopeAndContent` bzw. über einen record-lokalen Blank-Node, der das geteilte SKOS-Concept nur referenziert. Auf den geteilten Concept-Knoten werden keine record-spezifischen Daten gepfropft.

## 13. partitur.json-Schema

Von `build-views.py` aus dem erweiterten Modell erzeugtes Derivat für eine Mobilitäts-Ansicht. Es wird derzeit von keinem aktiven Tab mehr konsumiert (der frühere Konsument `mobilitaet.js` wurde entfernt) und steht im Deferred-Aufräumblock als potenzieller Baustein für eine künftige Visualisierung. Das Schema bleibt hier als Referenz für eine Reaktivierung dokumentiert.

```json
{
  "lebensphasen": [
    { "id": "LP1", "label": "", "von": "", "bis": "", "ort": "", "beschreibung": "" }
  ],
  "orte": [
    { "ort": "", "typ": "wohnort|auffuehrungsort", "von": "", "bis": "" }
  ],
  "mobilitaet": [
    { "von": "", "nach": "", "jahr": "", "form": "", "beschreibung": "" }
  ],
  "netzwerk": [
    { "periode": "", "intensitaet": 0 }
  ],
  "repertoire": [
    { "komponist": "", "farbe": "", "von": "", "bis": "", "dokumente": 0, "dokumente_liste": [] }
  ],
  "dokumente": [
    { "jahr": "", "anzahl": 0 }
  ],
  "_meta": { "generated": "", "source_records": [] }
}
```

Gastspiel-Daten werden nicht aus partitur.json bezogen, sondern zur Laufzeit aus `store.locations` extrahiert. Maßgebliche Rollen: auffuehrungsort, gastspiel, aufführung, spielzeit.

Die Anbindung an das erweiterte Modell erfolgt über die Mobilitätssichten (Abschnitt 10). Die Eigenschaften `orte`, `mobilitaet` und `repertoire` werden aus `m3gim:SpatiotemporalEvent`- und `m3gim:Performance`-Instanzen gespeist, das `netzwerk`-Feld aus AgRelOn-Relationen.

## 16. JSON-LD Context

### Prefixe

`rico`, `ric-rst`, `m3gim`, `m3gim-dft`, `m3gim-role`, `agrelon`, `schema`, `gndo`, `wd`, `owl`, `geo`, `skos`, `xsd`.

### Aliase

- `name` → `rico:name`
- `role` → `m3gim:role`
- `komponist` → `m3gim:komponist`
- `ort` → `m3gim:atPlace`
- `datum` → `m3gim:atDate`
- `provenance` → `agrelon:metadataProvenance`
- `beginDate` → `agrelon:hasBeginDate`
- `endDate` → `agrelon:hasEndDate`

### Technische Provenance-Properties

`m3gim:xlsxSource`, `m3gim:xlsxSheet`, `m3gim:xlsxRow` — siehe § 9 („XLSX-Quellreferenz"). Werden von der Pipeline gesetzt, nicht im Google-Sheet erfasst. `m3gim:datenpunktId` stammt dagegen aus der erfassten Spalte `datenpunkt_id` und trägt seit E-125 die Auftritts-Bündelung (Abschnitt 4), nicht nur Provenienz.

