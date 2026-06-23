---
title: "Datengrundlage"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.2
created: 2026-02-19
updated: 2026-06-17
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
related: [research, pipeline, decisions, testing, data-entry-guidelines]
---

# Datengrundlage

Dieses Dokument beschreibt die Datengrundlage des M³GIM-Projekts. Es definiert Ontologie, Schichtenmodell, Verknüpfungslogik, die Integration von RiC-O und AgRelOn, das Mobilitätsmodell, Meta-Statements, kontrollierte Vokabulare und das partitur.json-Schema. Ergänzend dokumentiert es die Quellenlage des Teilnachlasses und die Datenqualität, also welche XLSX-Eigenheiten die Pipeline kompensiert.

Version 2.0, Stand der Revision auf Basis der Ist-Daten-Analyse der sechs M³GIM-Tabellen.

## 1. Präambel

### Inhalt und Adressaten

Dieses Dokument beschreibt das Datenmodell des M³GIM-Projekts in seinem aktuellen Stand. Es integriert die empirisch aus den erschlossenen Daten abgeleiteten Erweiterungen, die Mobilitätsperspektive als eigenständige Modellebene sowie die AgRelOn-Integration für Agent-zu-Agent-Beziehungen.

Adressiert sind Projektmitarbeitende und Folge-Erschließer:innen, nicht externe Ontologie-Reviewer:innen. Der Stil ist operativ. Begründungen werden dort gegeben, wo Modellentscheidungen nicht aus den Tabellen ersichtlich sind.

### Geltungsbereich

Das Dokument definiert die Entitätsklassen, Relationen, Vokabulare und Normalisierungsregeln, nach denen die Excel-Erfassung in RDF überführt und als JSON-LD serialisiert wird. Die Pipeline-Implementierung ist Gegenstand von [pipeline.md](pipeline.md), die Projektsteuerung von [plan.md](plan.md), der Forschungsstand und das Kontextwissen von [research.md](research.md), die Projektgeschichte von [journal.md](journal.md).

### Namespaces

| Prefix | URI | Zweck |
|---|---|---|
| `rico` | `https://www.ica.org/standards/RiC/ontology#` | Archivisches Kernmodell |
| `ric-rst` | `https://www.ica.org/standards/RiC/vocabularies/recordSetTypes#` | RiC-O RecordSetType-Werte (Fonds, File) |
| `m3gim` | `https://dhcraft.org/m3gim/vocab#` | Projekterweiterung: Werke, Aufführungen, Bühnenrollen, Mobilität |
| `m3gim-dft` | `https://dhcraft.org/m3gim/documentaryFormTypes#` | SKOS-ConceptScheme Dokumenttypen |
| `m3gim-role` | `https://dhcraft.org/m3gim/roles#` | SKOS-ConceptScheme Relationsrollen |
| `agrelon` | `https://d-nb.info/standards/elementset/agrelon#` | Agent-Agent-Relationen, Meta-Statements |
| `schema` | `https://schema.org/` | Personen-Normdaten (Geburt/Tod) |
| `gndo` | `https://d-nb.info/standards/elementset/gnd#` | GND-Ontologie (Beruf als Literal) |
| `wd` | `http://www.wikidata.org/entity/` | Wikidata-Normdatenreferenzen |
| `skos` | `http://www.w3.org/2004/02/skos/core#` | Vokabularorganisation |
| `xsd` | `http://www.w3.org/2001/XMLSchema#` | Datatypes |

Die kanonische Form von `m3gim-dft`/`m3gim-role` ist die ausgeschriebene (`documentaryFormTypes#`/`roles#`), übereinstimmend mit dem `@context` des Output (E-105 entschieden). Die IRIs für `ric-rst`, `schema` und `gndo` sind im Audit 2026-06-18 gegen die offiziellen Quellen belegt (ICA-EGAD-RiC-O-Repo, schema.org, DNB-GND-Ontologie), nicht aus der Konvention abgeleitet.

### Beziehung zu den anderen Projektdokumenten

Das Datenmodell operiert auf der dritten epistemischen Ebene des Projekts, den *Entitäten und Verknüpfungen*. Kontextwissen wie Theorie und Forschungsstand bleibt in [research.md](research.md), die Projektsteuerung mit Arbeitsprogramm in [plan.md](plan.md), die technische Pipeline in [pipeline.md](pipeline.md).

## 2. Schichtenmodell

Das Modell ist in drei fachliche Schichten plus eine Querschnittsebene gegliedert.

**Schicht 1 (Kernmetadaten).** Archivsignatur, Titel, Datum, Dokumenttyp, Sprache, Umfang, Bearbeitungsstand. Direkt aus `rico:Record`-Properties bedient.

**Schicht 2 (Verknüpfungen).** Person, Ort, Institution, Werk, Bühnenrolle, Datum, Ereignis, Ensemble. Relationale Anreicherung der Records über die Verknüpfungstabelle.

**Schicht 3 (Erweiterung).** Finanzielle und vertragliche Detailangaben (Honorare, Provisionen, Währungsbeträge). Getragen von `m3gim:DetailAnnotation`.

**Querschnittsebene (Meta).** Gültigkeitsperiode, Konfidenz und Provenienz jeder Aussage. Nach dem Muster von AgRelOn realisiert, wirksam für alle drei Schichten (siehe Abschnitt 9).

## 3. Tabellenmodell

| Tabelle | Funktion |
|---|---|
| M3GIM-Objekte | Primäre Record-Metadaten (Schicht 1) |
| M3GIM-Verknüpfungen | Kontext- und Entitätsrelationen (Schicht 2 + 3) |
| Personenindex | Personen-Normdaten (Name, Lebensdaten, Wikidata-ID) |
| Organisationsindex | Organisations-Normdaten |
| Ortsindex | Ortsdaten |
| Werkindex | Werknachweise (Titel, Komponist, Wikidata-ID) |

### Konvolut- und Objektlogik

Objektidentität wird durch `archivsignatur` plus optionales Folio gebildet. Konvolute sind aggregierende Einheiten (`rico:RecordSet`) mit Kindern auf Folio-Ebene (`rico:Record`). Verknüpfungen hängen an der granularsten verfügbaren Ebene.

### Bestand

Teilnachlass UAKUG/NIM in drei Bestandsgruppen: Hauptbestand, Plakate, Tonträger. Feinerschlossen mit einzelnen Folio-Einträgen sind die Konvolute um NIM_003, NIM_004, NIM_005, NIM_006, NIM_007 und NIM_011. Die Verknüpfungstabelle trägt den Großteil der Schicht-2- und Schicht-3-Relationen.

Aktuelle Zählstände pro Bestandsgruppe, Feldabdeckung und Verknüpfungsrate stehen im Quality-Snapshot (`data/reports/quality-snapshot.md`) und werden bei jedem Pipeline-Lauf neu generiert — dieses Modelldokument hält keine laufenden Zahlen vor.

### Feldabdeckung in der Objekttabelle

Nicht alle Objekte sind durchgängig erschlossen: Titel + Dokumenttyp sind am besten abgedeckt, Entstehungsdatum mittel, Umfangsangabe und Sprache dünn. Dieser Abdeckungsgrad ist bei jeder Auswertung mitzuführen — konkrete Werte pro Feld im Quality-Snapshot.

## 4. Verknüpfungsmechanismus

Die Zuordnung einer Verknüpfungszeile zu einem Indexeintrag erfolgt über String-Matching in der `name`-Spalte nach vorheriger Normalisierung. Das Feld `typ` steuert den Zielkontext.

| typ | Zielkontext | Pipeline-Status |
|---|---|---|
| person | Personenindex → `rico:Person` | implementiert |
| institution | Organisationsindex → `rico:CorporateBody` | implementiert |
| ort | Ortsindex → `rico:Place` | implementiert |
| werk | Werkindex → `m3gim:MusicalWork` | implementiert |
| rolle | Bühnenrollen → `m3gim:StageRole` | Rollenindex ausstehend |
| datum | direkte Datumsproperty | implementiert |
| ort, datum | Komposit → `m3gim:SpatiotemporalEvent` | implementiert (E-96) |
| datum, werk | Komposit → `m3gim:Performance` | implementiert (E-98) |
| rolle, person | Komposit → `m3gim:Performance` (Bühnenrolle + Interpret:in) | implementiert (E-96) |
| ort (Mobilitätsrolle) | → `rico:Place` + `m3gim:SpatiotemporalEvent` (ohne Datum) | implementiert (E-97) |
| ereignis | → `m3gim:PerformanceEvent` | implementiert |
| ausgaben, währung | → `m3gim:DetailAnnotation` | implementiert |
| einnahmen, währung | → `m3gim:DetailAnnotation` | implementiert |
| summe, währung | → `m3gim:DetailAnnotation` | implementiert |
| ensemble | direkte Kontextverarbeitung | niedrige Priorität |

### Dekomposition des Komposittyps `ort, datum`

Der Komposittyp trägt in einem Feld sowohl Ortsreferenz als auch Zeitangabe. In der Pipeline wird er in eine Instanz von `m3gim:SpatiotemporalEvent` aufgelöst, mit `m3gim:atPlace` (Ortsreferenz) und `m3gim:atDate` (ISO-8601 oder TimeSpan). Dieser Typ ist der Mobilitätskern des Modells und wird in Abschnitt 10 ausführlich behandelt.

### Dekomposition des Komposittyps `datum, werk`

Der Typ verbindet Aufführungsdatum und Werktitel (etwa `1953-07-23, Lohengrin`). Er wird in eine `m3gim:Performance` aufgelöst, mit `m3gim:performanceOf` auf das über den Werkindex gematchte `m3gim:MusicalWork` und `m3gim:auffuehrungsdatum` an der Performance. Das Werk-Ziel wird ausschließlich über den Index aufgelöst; ein roher Komposit-String oder eine literale Q-ID landet nie als Werktitel. Zeilen, deren Werthälfte kein führendes Jahr trägt (Komponist statt Werk, etwa eine reine `Beethoven`-Zeile), werden ausgefiltert und nur im Quality-Snapshot gezählt, nicht modelliert.

### Dekomposition der Komposittypen `rolle, person`

Beide Schreibvarianten (`Rolle, Person` und `rolle, … Sänger*in`) verbinden Bühnenrolle und Interpret:in. Sie werden in eine n-äre `m3gim:Performance` aufgelöst, die über `m3gim:hasStageRole` die Bühnenrolle (Abschnitt 7) und über `m3gim:hasPerformer` die gegen den Personenindex aufgelöste Person trägt.

Eine **Standalone-Bühnenrolle** (Typ `rolle` ohne Interpret:in) erzeugt ebenfalls eine `m3gim:Performance`, dann nur mit `m3gim:hasStageRole` — so trägt jede Bühnenrolle dieselbe Entitätsstruktur, und das frühere Attribut `m3gim:hasPerformanceRole` entfällt vollständig (E-96). Die StageRole-`@id` ist ein deterministischer ASCII-Slug `m3gim:role_<slug>` (Umlaut-Transliteration, weil das @id-Pattern keine Umlaute erlaubt); gleiche Rollennamen werden dedupliziert.

### Mobilitäts-Ortsrollen ohne Datum

Die einfache `ort`-Verknüpfung erzeugt zusätzlich zur `rico:Place`-Referenz eine `m3gim:SpatiotemporalEvent`, wenn ihre Rolle zu den Mobilitäts-Ortsrollen gehört (`MOBILITY_PLACE_ROLES` = zielort, absendeort, abreiseort, empfangsort, vertragsort). Diese Variante trägt nur `m3gim:atPlace` und `m3gim:eventRole`, **kein** `m3gim:atDate` — ein Datum wird nicht geraten (Abschnitt 8, Konfidenz). `wohnort` ist davon ausgenommen und als Zustand mit Gültigkeitsperiode modelliert (Abschnitt 10).

## 5. Rollenvokabular

Die Rollen sind nach Zieltyp gegliedert. Empirisch in den Daten belegte Rollen sind mit ●, bislang nur in der Handreichung spezifizierte Rollen mit ○ markiert. Neu im Modell, gegenüber der Vorversion, sind die mit ★ markierten Rollen.

Alle Rollen sind nach Normalisierung geschlechtsneutral. Pipeline-Regel: `:in`, `:innen`, `in` werden aus Rollennamen entfernt (`sänger:in` → `sänger`, `dirigent:in` → `dirigent`).

### Personenrollen

Dreiteilung nach Handreichungslogik: archivalisch / künstlerisch / institutionell.

**Archivalisch-inhaltlich**

| Rolle | Status | Bemerkung |
|---|---|---|
| verfasser | ● | |
| adressat | ● | |
| absender | ★ | Ergänzung Korrespondenzrolle |
| empfänger | ★ | Ergänzung Korrespondenzrolle |
| unterzeichner | ● | |
| abgebildet | ○ | in Fotografien und Plakaten |
| agent | ● ★ | Karriereinfrastruktur |
| vermittler | ● ★ | Karriereinfrastruktur |
| auftraggeber | ● ★ | |
| widmungsempfänger | ○ | |
| erwähnt | ● | |

**Künstlerisch**

| Rolle | Status | Bemerkung |
|---|---|---|
| sänger | ● ★ | häufigste Personenrolle |
| dirigent | ● ★ | |
| regisseur | ● ★ | |
| komponist | ● ★ | |
| librettist | ● ★ | |
| übersetzer | ● ★ | |
| arrangeur | ● ★ | |
| chorleiter | ● ★ | |
| choreograph | ● ★ | |
| bühnenbildner | ● ★ | |
| kostümbildner | ● ★ | |
| ausstatter | ● ★ | |
| bühnenleiter | ● ★ | |
| technische leitung | ● ★ | gegen nacktes „leitung" abzugrenzen, Klärungsbedarf |
| beleuchter | ● ★ | Produktionscrew |
| maskenbildner | ● ★ | Quelle führt Tippform „maskenbidner", wird durchgereicht |
| repetitor | ● ★ | Produktionscrew |
| regieassistent | ● ★ | Produktionscrew |
| fotograf | ● ★ | Produktionscrew |
| interpret | ● ★ | Oberbegriff, sofern Stimmfach/Funktion unklar |
| protagonist | ● | Klärungsbedarf: möglicherweise Bühnenrolle, nicht Personenrolle |
| leitung | ● ★ | nacktes „leitung" aus dem tieferen Export, gegen „technische leitung" abzugrenzen, Klärungsbedarf (Treffen 2026-06-23) |
| publikum | ● ★ | im Publikum anwesende Person; Person-vs.-Subject-Zuordnung mit dem Erschließungsteam zu klären (Treffen 2026-06-23) |

**Institutionell**

| Rolle | Status | Bemerkung |
|---|---|---|
| vertragspartner | ● ★ | als AgRelOn-Relation, nicht als Personenrolle (Abschnitt 8) |
| inhaber | ● ★ | |
| herausgeber | ● ★ | auch bei Personen, nicht nur bei Institutionen |

### Ortsrollen

| Rolle | Status | Bemerkung |
|---|---|---|
| entstehungsort | ● | |
| zielort | ● ★ | Reisemobilität; erzeugt ort-only `SpatiotemporalEvent` |
| absendeort | ● ★ | Korrespondenz- und Reisemobilität; ort-only STE |
| abreiseort | ● ★ | Reisemobilität; ort-only STE |
| empfangsort | ● ★ | Korrespondenzmobilität; ort-only STE |
| auffuehrungsort | ● | |
| vertragsort | ● ★ | ort-only STE |
| wohnort | ● ★ | Zustand mit Gültigkeitsperiode, kein Punktereignis (Abschnitt 10) |
| erwähnt | ● | |

Die mit *ort-only STE* markierten Rollen (`MOBILITY_PLACE_ROLES`) erzeugen neben der `rico:Place`-Referenz eine `m3gim:SpatiotemporalEvent` ohne Datum (Abschnitt 4). `wohnort` ist davon ausgenommen.

### Institutionenrollen

| Rolle | Status | Bemerkung |
|---|---|---|
| vertragspartner | ● ★ | AgRelOn `HasEmployeeEmployer` (Institution) bzw. `HasProfessionalContact` (Person), Abschnitt 8 |
| arbeitgeber | ● | AgRelOn-Mapping: `hasEmployer` |
| veranstalter | ● | |
| vermittler | ● | |
| adressat | ○ | |
| empfänger | ● ★ | |
| verfasser | ● ★ | |
| herausgeber | ● ★ | häufig bei Presse |
| auffuehrungsort | ● ★ | Institution als Ort-Proxy |
| ausbildungsstätte | ● ★ | biographisch relevant |
| fluggesellschaft | ● ★ | diagnostisch für Flugreisen |
| rahmenveranstaltung | ● ★ | |
| erwähnt | ● | |

### Ereignisrollen

| Rolle | Status | Bemerkung |
|---|---|---|
| rahmenveranstaltung | ● | |
| premiere | ○ | |
| auftritt | ○ | |
| probe | ○ | |
| aufführung | ● ★ | |
| festvorstellung | ● ★ | |
| wiederaufnahme | ● ★ | |
| generalprobe | ● ★ | erzeugt `probendatum` + `probenTyp` (Abschnitt 7) |
| aufnahme | ● ★ | Rundfunk-/Tonaufnahme, diskursive Mobilität |
| empfang | ● ★ | auf Rahmenveranstaltung gemappt |
| veranstalter | ● ★ | Institution veranstaltet Ereignis |
| implizit | ○ | |
| erwähnt | ● ★ | |

### Werkrollen

| Rolle | Status | Bemerkung |
|---|---|---|
| aufführung | ● ★ | |
| auftritt | ● ★ | |
| premiere | ● ★ | |
| wiederaufnahme | ● ★ | |
| festvorstellung | ● ★ | |
| probe | ● ★ | |
| repertoire | ● ★ | Werk als Bestandteil des Repertoires |
| erwähnt | ● | |

### Bühnenrollen (Typ `rolle`)

Die Bühnenrolle ist eigenständige Entität, kein Attribut. Siehe Abschnitt 7.

| Rolle | Status | Bemerkung |
|---|---|---|
| aufführung | ● ★ | Rolle wurde in Aufführung gesungen |
| auftritt | ● ★ | |
| interpret | ● ★ | Verknüpfung Rolle zu Sänger:in |
| probe | ● ★ | |
| repertoire | ● ★ | |
| erwähnt | ● ★ | |

### Datumsrollen

Datum ist als First-Class-Typ erfasst, Rollen typisieren den Datumsbezug.

| Rolle | Status | Bemerkung |
|---|---|---|
| absendedatum | ● ★ | Korrespondenzmobilität |
| empfangsdatum | ● ★ | Korrespondenzmobilität |
| ausstellungsdatum | ● ★ | Verträge, Ausweise |
| erscheinungsdatum | ● ★ | Presse, Publikationen |
| abreisedatum | ● ★ | Reisemobilität |
| auftritt | ● ★ | |
| aufführung | ● ★ | |
| probe | ● ★ | |
| probenbeginn | ● ★ | |
| premiere | ● ★ | |
| ausstrahlung | ● ★ | Rundfunkaufnahmen |
| spielzeit | ● ★ | institutionelle Bindung, TimeSpan |
| überweisung | ● ★ | Finanzdatum |
| erstelldatum | ● ★ | Entstehung eines Dokuments |
| lohnbestätigung | ● ★ | Finanzdatum (Bestätigung der Vergütung) |
| ratenzahlung | ● ★ | Finanzdatum (Ratenzahlungs-Zeitraum) |
| gespräch | ● ★ | |
| erwähnt | ● ★ | |

### Finanzrollen (Typ `ausgaben, währung` / `einnahmen, währung` / `summe, währung`)

| Rolle | Status | Bemerkung |
|---|---|---|
| abendgage | ● ★ | Honorar pro Auftritt |
| provision | ● ★ | Agentenvergütung |
| gesamtvergütung | ● ★ | Umlaut bleibt erhalten, keine ASCII-Transliteration |
| reisekosten | ● ★ | |
| rundfunkhonorar | ● ★ | Quelle führt Tippform „rundfunkshonorar", durchgereicht |
| erwähnt | ● | |

### Statusmarkierungen in der Rollenspalte

Die Quelle nutzt die `rolle`-Spalte vereinzelt für einen Vertragsstatus statt für eine echte Rolle. Dieser wird spaltenweit über einen ganzen Vertragsblock durchgereicht (z. B. NIM_023).

| Wert | Status | Bemerkung |
|---|---|---|
| nicht eingehalten | ● ★ | Vertragsstatus, keine Ereignis-/Ortsrolle (Abschnitt 11); wird im STE-Bau **nicht** als `m3gim:eventRole` emittiert. Zielmodellierung `m3gim:contractStatus`/`m3gim:realized = false` am Vertrags-Record ist mit dem Erschließungsteam zu klären (Treffen 2026-06-23). |

## 6. Datumskonventionen

### Formate

| Situation | Format | Beispiel |
|---|---|---|
| Vollständig | YYYY-MM-DD | 1958-04-18 |
| Nur Monat | YYYY-MM | 1958-04 |
| Nur Jahr | YYYY | 1958 |
| Zeitspanne | YYYY-MM-DD/YYYY-MM-DD | 1958-08-10/1958-09-09 |
| Zeitspanne nur Jahre | YYYY/YYYY | 1945/1947 |

### Qualifier

| Qualifier | Bedeutung | Beispiel |
|---|---|---|
| `circa:` | ungefähre Datierung | circa:1958 |
| `vor:` | Terminus ante quem | vor:1958 |
| `nach:` | Terminus post quem | nach:1958 |
| *leer* | undatiert | |

### Datums-Routing

Eine Datierung wird nach ihrer Notation auf eine der drei Repräsentationen geführt:

| Notation | Repräsentation |
|---|---|
| vollständiges oder partielles ISO-Datum | typisierte Datumsproperty (Abschnitt 7) |
| Bereich (`von … bis`, `YYYY/YYYY`) | TimeSpan-Wert |
| Klammer-/Fragezeichen-Unsicherheit (`1957-[05-27?]`) | `m3gim:DatedEvent` mit `dateValue`/`dateRole` |
| Freitext-Beginn (`ab …`, `seit …`) | Qualifier `nach:` |

### Datierungsevidenz

| Wert | Bedeutung |
|---|---|
| aus_dokument | Datum steht explizit im Dokument |
| erschlossen | Datum aus Kontext abgeleitet |
| extern | Datum aus anderer Quelle ermittelt |
| unbekannt | keine Datierung möglich |

Datierungsevidenz wird im Meta-Statement-Modell als `agrelon:metadataProvenance`-Wert auf die Datumsproperty angewendet, nicht mehr als separate `m3gim:dateEvidence`-Property. Siehe Abschnitt 9.

## 7. RiC-O-Kern und m3gim-Erweiterung

### RiC-O-Kern

Hierarchie.
`rico:RecordSet` (Konvolut, Fonds) mit `rico:Record` (Einzelstück). Agenten-Typen `rico:Person`, `rico:CorporateBody`, `rico:Group`. Beschreibungs-Properties `rico:identifier`, `rico:title`, `rico:date`, `rico:hasExtent`, `rico:hasOrHadLanguage`, `rico:generalDescription`. Relationen `rico:hasOrHadLocation`, `rico:hasOrHadSubject`, `rico:isAssociatedWithEvent`.

**Konformitäts-Korrektur (E-103).** Der Web-Audit gegen RiC-O 1.1 hat drei im Output emittierte Terme als nicht konform belegt. (1) `rico:isAssociatedWithRecord` existiert nicht — die `isAssociatedWith*`-Familie kennt nur `Date/Event/Place/Rule`; Record-Bezüge laufen über `rico:hasOrHadPart`/`isOrWasPartOf` bzw. eine konkrete RecordResource-Relation, ein Event-zu-Record-Bezug über `rico:isAssociatedWithEvent` von der Record-Seite. (2)/(3) `rico:File` und `rico:Fonds` sind keine Klassen und nicht im `rico:`-Namespace, sondern Werte des Vokabulars `recordSetTypes:`; ein Fonds bzw. eine File ist ein `rico:RecordSet` mit `rico:hasRecordSetType` → `recordSetTypes:Fonds`/`recordSetTypes:File`. Die Pipeline emittiert diese Terme derzeit falsch; Korrektur in derselben Runde wie E-96–E-102.

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

### Begründung der neuen Klassen

`m3gim:StageRole` trägt der Tatsache Rechnung, dass Bühnenrollen im Datenbestand als eigenständige Entität geführt werden sollten, nicht als String-Attribut. Werktitel *Waltraute*, *Brangäne*, *2. Norn*, *Alt Solo* sind wiederkehrende referenzierbare Rollen mit Stimmfach und Werkzugehörigkeit.

`m3gim:SpatiotemporalEvent` bildet den Komposittyp `ort, datum` als Klasse ab und ist der zentrale Träger der Mobilitätsinformation; daneben speist sie sich aus den Mobilitäts-Ortsrollen, die eine datumslose Variante erzeugen (Abschnitt 4).

`m3gim:DatedEvent` ist Fallback für Datumsangaben, die nicht durch eine typisierte Property abgedeckt sind, insbesondere für klammer- und fragezeichen-unsichere Datierungen (etwa `1957-[05-27?]`). Primär wird die Property-Familie (siehe unten) verwendet.

### Identität der neuen Entitäten

`m3gim:StageRole`-Instanzen bekommen eine deterministische Slug-`@id` der Form `m3gim:role_<slug>` im Entitäts-Namespace und werden darüber dedupliziert. Das ConceptScheme `m3gim-role:` bleibt davon getrennt — es trägt die Relationsrollen als Werte, nicht die Bühnenrollen-Entitäten. `m3gim:hasStageRole` hängt an der `m3gim:Performance`, nicht am Record.

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

### m3gim-Datatype-Properties

| Property | Typ | Zweck |
|---|---|---|
| `m3gim:bearbeitungsstand` | xsd:string | projektinterner Status (Objektebene) |
| `m3gim:bearbeitungsnotiz` | xsd:string | redaktionelle Notiz zum Objekt-Bearbeitungsstand |
| `m3gim:eventRole` | xsd:string | Rolle eines SpatiotemporalEvent |
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

### Kuratierte Index-Properties (M1, Index-Durchreichung)

Die vier Indextabellen pflegen Felder, die die Pipeline zuvor nach `build_index_lookup` verlor (nur `wikidata_id`/`komponist` wurden durchgereicht). M1 reicht sie als eigene `m3gim:`-Properties an die jeweilige Entität durch — getrennt von den Wikidata-Normdaten oben (kuratiert gegen angereichert) und vom Verknüpfungs-`anmerkung`. Quelle ist die Index-Spalte, nicht das Wikidata-Enrichment; damit erreichen Beruf, Sitz und Partie auch ungematchte Entitäten ohne Q-ID.

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

`m3gim:absendedatum`, `m3gim:empfangsdatum`, `m3gim:ausstellungsdatum`, `m3gim:erscheinungsdatum`, `m3gim:abreisedatum`, `m3gim:auftrittsdatum`, `m3gim:auffuehrungsdatum`, `m3gim:probendatum`, `m3gim:probenbeginn`, `m3gim:premieredatum`, `m3gim:ausstrahlungsdatum`, `m3gim:spielzeitVon`, `m3gim:spielzeitBis`, `m3gim:ueberweisungsdatum`, `m3gim:erstelldatum`.

Alle Properties vom Typ xsd:string, weil historische Datierung die ISO-Schema-Strenge von xsd:date regelmäßig überschreitet (Qualifier `circa:`, TimeSpans, unvollständige Datierungen).

Für nicht typisierte oder zukünftig auftretende Rollen dient die Fallback-Klasse `m3gim:DatedEvent` mit Properties `m3gim:dateValue`, `m3gim:dateRole`.

### Erwähnung

Inhaltlich erwähnte Personen und Institutionen werden als `rico:hasOrHadSubject` mit `@type: rico:Person` bzw. `rico:CorporateBody` serialisiert, statt über eine custom-Property `m3gim:mentions`. Damit bleibt das Modell RiC-O-konform.

### PerformanceRoles als SKOS-ConceptScheme

Das bestehende SKOS-ConceptScheme `m3gim-role:` bündelt die Bühnen- und Aufführungsrollen. Es wird durch die Rollenlisten aus Abschnitt 5 ersetzt und in die drei Kategorien archivalisch-inhaltlich, künstlerisch, institutionell gegliedert.

## 8. AgRelOn-Integration

### Scope und Begründung

AgRelOn (Agent Relationship Ontology der Deutschen Nationalbibliothek) modelliert Beziehungen zwischen Agenten (Personen, Organisationen) mit rund 70 Relationstypen in sieben Kategorien. Das M³GIM-Modell integriert AgRelOn als *komplementäre Ebene* für Agent-Agent-Beziehungen und für Meta-Statements. AgRelOn ersetzt keinen Teil des m3gim-Modells, weil sein Scope auf Agent-Agent beschränkt ist und raumzeitliche, werkbezogene oder archivische Relationen nicht abdeckt.

Die Integration hat drei Ziele:

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

**Konformitäts-Korrektur (E-104, amendiert E-69).** Der Web-Audit gegen die DNB-RDF hat bestätigt: das n-äre Reifikationsmuster (eine Klasse pro Beziehungstyp, Agenten über `agrelon:hasSubject`/`hasObject`, Gültigkeit als Blank-Node) entspricht AgRelOn exakt. Vier Benennungen sind aber zu korrigieren. Gültigkeit, Konfidenz und Provenienz führt AgRelOn unter `metadata*`, nicht `has*`: `agrelon:metadataPeriod` (statt `hasValidityPeriod`), `agrelon:metadataConfidence` (statt `hasConfidenceValue`), `agrelon:metadataProvenance` (statt `hasProvenance`); `hasBeginDate`/`hasEndDate` am Period-Blank-Node sind korrekt. Die Patron-Klasse heißt `agrelon:IsHasPatron` (nicht `HasIsPatron`); `HasIsMember` ist korrekt. Die Reifikation muss `agrelon:hasSubject` zusätzlich zu `hasObject` setzen (aktuell nur `hasObject` emittiert). Die obigen Beispiele und Tabellen sind bereits auf die korrekten Terme gesetzt; Pipeline und die Tests test_12/test_19 sind nachzuziehen.

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

Jede Aussage im Modell kann mit drei Meta-Angaben versehen werden: Gültigkeitsperiode, Konfidenzwert, Provenienz. Das Muster stammt aus AgRelOn und wird auf alle M³GIM-Relationen übertragen, nicht nur auf Agent-Agent-Relationen. Damit entsteht eine einheitliche Querschnittsebene über den drei fachlichen Schichten.

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
| `m3gim:xlsxSource` | Blank Node | Container für die drei Adressteile |
| `m3gim:xlsxSheet` | xsd:string (`"Objekte"` oder `"Verknuepfungen"`) | Name des Ursprungs-Sheets |
| `m3gim:xlsxRow` | xsd:integer (≥ 2) | 1-basierte XLSX-Zeilennummer inklusive Header-Zeile |
| `m3gim:datenpunktId` | xsd:integer (optional) | Projekteigener Datenpunkt-Identifier aus Spalte `datenpunkt_id`, falls vorhanden |

Angebracht wird `m3gim:xlsxSource`:

- **am Record** (aus `M3GIM-Objekte.xlsx`). `xlsxSheet = "Objekte"`, `xlsxRow` entspricht der Excel-Zeilennummer des Objekts.
- **an jeder DetailAnnotation** (Finanz-Detail, Sach-Detail). `xlsxSheet = "Verknuepfungen"`.
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
    "m3gim:xlsxSheet": "Verknuepfungen",
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

Mobilität ist die zentrale inhaltliche Frage des Projekts. Das Datenmodell unterstützt sie über fünf unterscheidbare Sichten, die als SPARQL-Abfragemuster auf den bestehenden Klassen und Rollen realisiert sind. Sie werden nicht als eigene Klassen angelegt, weil sie verschiedene Schnitte durch dieselben Daten sind.

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

Die UI-Anbindung der fünf Sichten, etwa die Farbfamilie für Chronik-Chips, liegt in [design.md](design.md). Die Absicherung gegen fehl-gemappte eventRoles erfolgt in `tests/test_25_chronik_mobility_cluster.py`.

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
│   └── programmheft
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

Gegenüber der Vorfassung ergänzt sind korrespondenz, presse, programm, autobiografie, identitaetsdokument, repertoireliste, biographisch, briefumschlag, musikzeitschrift, chronik, verzeichnis. `sammlung` bleibt ein eigenständiges Concept **ohne** `skos:broader` auf konvolut — die is-a-Beziehung wird nicht vorentschieden. Die Abgrenzung zwischen sammlung und konvolut ist noch zu klären (Klärungspunkt in [plan.md](plan.md)): möglicherweise ist konvolut der physische Umschlag und sammlung die thematische Zusammenstellung.

Jedes emittierte dft-Concept trägt ein lesbares deutsches `skos:prefLabel` (Pipeline-Map `DFT_LABELS`, E-101) statt des nackten Slugs. Das Frontend löst Dokumenttyp-Labels seit E-101 direkt über `skos:prefLabel` aus dem Store auf (`dftLabel(store, id)` über `store.dftHierarchy`); die frühere Frontend-Handtabelle `DOKUMENTTYP_LABELS` ist entfallen.

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

## 14. Kontrollierte Vokabulare und Normalisierung

### Pipeline-Normalisierung

- Case- und Whitespace-Normalisierung (`lower().strip()`)
- Gender-Suffix-Entfernung: `:in`, `:innen`, `in` werden aus Rollenbezeichnern gestrippt
- Excel-Datetime-Artefakte bereinigt (Zeitanteil `00:00:00` abgestreift)
- Komposit-Typen dekomponiert (`ort, datum` → `SpatiotemporalEvent`; `datum, werk` → `Performance`; `rolle, person` → `Performance`; `ausgaben, währung` → `DetailAnnotation`)
- Mehrblatt-Verknüpfungstabelle über alle Box-Sheets zusammengeführt; Signaturspalte positionsbasiert erkannt (Kopf ist teils nur ein Leerzeichen) und je Sheet forward-gefüllt
- Header-Shift-Abfederung in Personen-, Organisations-, Orts- und Werkindex
- nicht-textuelle Spaltenköpfe und Literal-Folio-Werte abgefangen, statt die Folio-Erkennung abbrechen zu lassen
- Wikidata-URI-Validierung: nur Strings mit Pattern `^Q\d+$` erhalten `wd:`-Prefix

### Ortsdubletten

Vor der Normalisierung zu vereinheitlichen:

- `Stuttgart` und `Stuttgart ` (Trailing-Whitespace) → konsolidiert
- `Zürich` und `Zürich, Zürichbergstrasse 104` → separater Ortseintrag für die Adresse, verknüpft via `skos:broader` zum Ort `Zürich`
- Freitextmischungen wie `Wien, ab 1956` werden in `SpatiotemporalEvent`-Instanzen mit separaten `atPlace` und `atDate` überführt

### Namenskonventionen

- **Personen.** Nachname, Vorname (`Malaniuk, Ira`). Adelstitel nachgestellt (`Karajan, Herbert von`).
- **Orte.** Gebräuchlicher deutscher Name, historische Ortsnamen aus der Quelle (`Lemberg` statt `Lwiw`).
- **Institutionen.** Offizielle Bezeichnung ohne Rechtsform (`Bayerische Staatsoper`).
- **Werke.** Titel aus der Quelle, Komponist als Zusatzfeld.

## 15. Erfassungsstatus

Drei parallel im Feld befindliche Systeme, zu vereinheitlichen auf das Handreichungssystem.

| Quelle | Werte |
|---|---|
| Handreichung (Soll) | in_bearbeitung, schicht1_fertig, schicht2_fertig, abgeschlossen |
| Pipeline (transform.py) | begonnen, abgeschlossen, zurueckgestellt |

Empfehlung: Handreichungssystem durchsetzen. Vier Werte bilden den Schichtfortschritt sauber ab und erlauben eine Abdeckungsmessung pro Schicht.

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

`m3gim:xlsxSource`, `m3gim:xlsxSheet`, `m3gim:xlsxRow`, `m3gim:datenpunktId` — siehe § 9 („XLSX-Quellreferenz"). Werden von der Pipeline gesetzt, nicht im Google-Sheet erfasst.

## 17. Datenqualität

Es gilt das Prinzip *Documents as Source of Truth*. Die XLSX-Erfassung ist die maßgebliche Quelle, der Pipeline-Code ist wegwerfbares Artefakt. Wo die Pipeline eine XLSX-Eigenheit kompensiert, ist diese Kompensation eine Schuld, kein Feature. Sie wird sichtbar gehalten, damit klar bleibt, was quellseitig zu fixen ist und wo der Code dauerhaft defensiv bleiben muss. Die Code-Stellen der Kompensationen liegen in `scripts/_common.py` und `scripts/transform.py`, die zugehörigen Test-Anker in der Testsuite. Die offenen Source-Fix-Tickets liegen gebündelt in [plan.md](plan.md).

Die kompensierten Eigenheiten fallen in vier Kategorien.

**Spec** sind strukturell unvermeidliche Format-Transformationen, die im Code bleiben, weil sie keinen Datenfehler kaschieren, etwa die Gender-Suffix-Entfernung und der Q-ID-Regex-Filter.

**Workaround** kompensiert eine XLSX-Eigenheit, die quellseitig fixbar wäre, und ist daher ein redaktioneller Hinweis ans Archiv-Team. Hierher gehören die Index-Header-Shifts, die Bearbeitungsstand-Normalisierung, die Role-Hygiene im Ort-Komposit, der Folio-Spalten-Fallback und die @id-Kollision aus Sammel-Zeile plus Folios.

**Policy** ist eine redaktionelle Entscheidung, die gilt, solange die Annahme trägt, etwa die Default-Währung Schilling für die Folie ohne Währungssuffix in NIM_007 und der Template-Zeilen-Filter.

**Dead** bezeichnet bereits entfernte Kompensationen, die nur noch zur Historie geführt werden, etwa der frühere ASCII-Fallback für den Dateinamen der Verknüpfungen-Datei.

| Eigenheit | Kategorie | Pipeline-Kompensation |
|---|---|---|
| Index-Blätter ohne saubere Kopfzeile (erste Datenzeile als Header gelesen) | Workaround | `INDEX_HEADER_SHIFTS` schiebt die Zeile zurück ins DataFrame |
| Finanzwerte ohne Währungssuffix in NIM_007 Folio 5_1 | Policy | `FINANCE_CURRENCY_DEFAULTS` setzt „S" (Schilling) |
| Finanzwerte ohne Währungssuffix in NIM_011 Folio 5 (Brüssel-Gastspiel) | Policy | `FINANCE_CURRENCY_DEFAULTS` setzt „Belgische Francs" (Folio-9-Pendant + Vertragsort Brüssel); mit Erschließungsteam zu bestätigen |
| Datums-Platzhalter „ohne Datum"/„o. D." in `entstehungsdatum` | Workaround | `clean_date()` bildet die Platzhalter auf `None` ab (kein Schein-`rico:date`) |
| Malformter Datumswert ohne Jahr (z. B. „06-09") in `entstehungsdatum` | Workaround | nicht-ISO Wert läuft verlustfrei in `m3gim:hasDatedEvent` (`dataQualityFlag` „datierung-malformed"), nicht in `rico:date`; Quell-Fix offen |
| Vertragsstatus „nicht eingehalten" spaltenweit in der Rollenspalte (NIM_023) | Workaround | im STE-Bau nicht als `m3gim:eventRole` emittiert (`CONTRACT_STATUS_ROLES`); `contractStatus`-Modellierung mit Erschließungsteam offen |
| Gemischte Finanz-Betragsnotation (Dezimalkomma vs. Komma-Währungstrenner, Tausenderpunkt, Doppelbetrag `25, DM/45, DM`) | Workaround | `parse_monetary_values()` löst Betrag/Währung robust auf und splittet Doppelbeträge in zwei DetailAnnotations |
| Bearbeitungsstand in uneinheitlicher Schreibung und Synonymen | Workaround | `normalize_bearbeitungsstand()` mappt auf drei kanonische Werte |
| Datumsrolle wird im Komposit `ort, datum` an beide Hälften vererbt | Workaround | Role-Strip im Ort-Zweig für Datumsrollen |
| Freitext-Datierungen (Ort plus Zeit gemischt) | Workaround | Rohwert wird durchgereicht und toleriert, nicht geblockt |
| Gender-inklusive Rollennotation (`:in`, `:innen`) | Spec | `normalize_role()` strippt das Suffix |
| Ungültige Wikidata-Roh-Werte (Tippfehler, URLs) | Spec | nur Strings mit Muster `^Q\d+$` erhalten den `wd:`-Prefix |
| wechselnder Spaltenname der Folio-Nummer | Workaround | heuristische Folio-Spalten-Erkennung plus Regex-Fallback |
| nicht-textueller Spaltenkopf in der Objekttabelle | Workaround | Folio-Erkennung überspringt nicht-String-Köpfe statt abzubrechen |
| Literal `Folio` als Folio-Zellwert | Workaround | Guard verhindert die kaputte Objekt-ID, Befund in den Report |
| Verknüpfungstabelle über mehrere Box-Sheets verteilt | Workaround | alle Sheets werden geladen und zusammengeführt, statt nur das erste |
| Signaturspalte mit Leerzeichen-Kopf, lückig gefüllt | Workaround | Spalte positionsbasiert erkannt und je Sheet forward-gefüllt |
| Personenindex ohne sauberen Namensspaltenkopf | Workaround | Header-Shift auch für den Personenindex, sonst Totalverlust der Personen-Normdaten |
| gleiche `archivsignatur` für Sammel-Zeile und Folio-Zeilen | Workaround | `build_konvolut_hierarchy()` vergibt `_sammlung`-Suffix auf der @id |
| Muster-/Template-Zeile im Erfassungsblatt | Policy | Zeilen mit `archivsignatur = "beispiel"` werden übersprungen |
| früherer ASCII-Fallback für den Verknüpfungen-Dateinamen | Dead | entfernt, Pipeline wirft jetzt `FileNotFoundError` |

Einzelne Instanz-Befunde sind laut Katalog dokumentiert und gegen den aktuellen Quality-Snapshot (`data/reports/quality-snapshot.md`) zu verifizieren, bevor sie als feststehender Ist-Zustand behandelt werden. Genannt sind das Duplikat zweier Zeilen für `UAKUG/NIM/PL_07`, die verwaiste Signatur `UAKUG/NIM_11` ohne zugehörige Objektzeile, die Schreibweisen-Variante „Beethoven, Ludwig von" gegen „van" im Werkindex und die Person Sophokles, die mit der Aufführungsrolle erfasst ist, obwohl nicht er, sondern sein Werk aufgeführt wurde.

## 18. Quellen

Datengrundlage ist der Teilnachlass UAKUG/NIM am Universitätsarchiv der KUG Graz. Er gliedert sich in drei Bestandsgruppen.

- **Hauptbestand** NIM_001–NIM_200+ mit Briefen, Verträgen, Presseartikeln, Programmen und Fotos.
- **Plakate** NIM/PL_01–PL_26.
- **Tonträger** NIM/TT_01 mit Schellackplatten und Aufnahmen.

Der Quellenzeitraum reicht von 1934 bis 2009. Feinerschlossen mit einzelnen Folio-Einträgen sind bislang die Konvolute um NIM_003, NIM_004, NIM_005, NIM_006, NIM_007 und NIM_011. Bestandszahlen pro Gruppe, Feinerschließungstiefe und Abdeckungsgrade stehen im Quality-Snapshot (`data/reports/quality-snapshot.md`).

Zu Ira Malaniuk existiert keine eigenständige wissenschaftliche Literatur. Das Projekt leistet die ersten archivgestützten Erschließungsarbeiten. Die Einordnung in den Forschungskontext führt [research.md](research.md).