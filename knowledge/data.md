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

# Datengrundlage

Dieses Dokument beschreibt die Datengrundlage des M³GIM-Projekts. Es definiert Ontologie, Schichtenmodell, Verknüpfungslogik, die Integration von RiC-O und AgRelOn, das Mobilitätsmodell, Meta-Statements, kontrollierte Vokabulare und das partitur.json-Schema. Ergänzend dokumentiert es die Quellenlage des Teilnachlasses und die Datenqualität, also welche XLSX-Eigenheiten die Pipeline kompensiert.

Der überarbeitete Modellstand auf Basis der Ist-Daten-Analyse der M³GIM-Tabellen. Dieser Revisionsstand des Modells ist von der Promptotyping-Dokumentversion im Frontmatter zu unterscheiden.

## 1. Präambel

### Inhalt und Adressaten

Dieses Dokument beschreibt das Datenmodell des M³GIM-Projekts in seinem aktuellen Stand. Es integriert die empirisch aus den erschlossenen Daten abgeleiteten Erweiterungen, die Mobilitätsperspektive als eigenständige Modellebene sowie die AgRelOn-Integration für Agent-zu-Agent-Beziehungen.

Adressiert sind Projektmitarbeitende und Folge-Erschließer:innen, nicht externe Ontologie-Reviewer:innen. Der Stil ist operativ. Begründungen werden dort gegeben, wo Modellentscheidungen nicht aus den Tabellen ersichtlich sind.

### Geltungsbereich

Das Dokument definiert die Entitätsklassen, Relationen, Vokabulare und Normalisierungsregeln, nach denen die Excel-Erfassung in RDF überführt und als JSON-LD serialisiert wird. Die Pipeline-Implementierung ist Gegenstand von [pipeline-architecture.md](pipeline-architecture.md), die Projektsteuerung von [specification.md](specification.md) § Stand und nächste Schritte, der Forschungsstand und das Kontextwissen von [research-framework.md](research-framework.md), die Projektgeschichte von [journal.md](journal.md).

### Namespaces

| Prefix | URI | Zweck |
|---|---|---|
| `rico` | `https://www.ica.org/standards/RiC/ontology#` | Archivisches Kernmodell |
| `ric-rst` | `https://www.ica.org/standards/RiC/vocabularies/recordSetTypes#` | RiC-O RecordSetType-Werte (Fonds, File) |
| `crm` | `http://www.cidoc-crm.org/cidoc-crm/` | CIDOC-CRM-Oberklassen (E7 Activity) für das Occurrence-Modell |
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

Das Datenmodell operiert auf der dritten epistemischen Ebene des Projekts, den *Entitäten und Verknüpfungen*. Kontextwissen wie Theorie und Forschungsstand bleibt in [research-framework.md](research-framework.md), die Projektsteuerung in [specification.md](specification.md) § Stand und nächste Schritte, die technische Pipeline in [pipeline-architecture.md](pipeline-architecture.md).

## 2. Schichtenmodell

Das Modell ist in die fachlichen Schichten Kernmetadaten, Verknüpfungen und Erweiterung plus eine Querschnittsebene Meta gegliedert.

**Schicht 1 (Kernmetadaten).** Archivsignatur, Titel, Datum, Dokumenttyp, Sprache, Umfang, Bearbeitungsstand. Direkt aus `rico:Record`-Properties bedient.

**Schicht 2 (Verknüpfungen).** Person, Ort, Institution, Werk, Bühnenrolle, Datum, Ereignis, Ensemble. Relationale Anreicherung der Records über die Verknüpfungstabelle.

**Schicht 3 (Erweiterung).** Finanzielle und vertragliche Detailangaben (Honorare, Provisionen, Währungsbeträge). Getragen von `m3gim-ontology:Annotation`.

**Querschnittsebene (Meta).** Gültigkeitsperiode, Konfidenz und Provenienz jeder Aussage. Nach dem Muster von AgRelOn realisiert, wirksam für alle fachlichen Schichten (siehe Abschnitt 9).

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

Teilnachlass UAKUG/NIM in den Bestandsgruppen Hauptbestand, Plakate und Tonträger. Feinerschlossen mit einzelnen Folio-Einträgen sind die Konvolute um NIM_003, NIM_004, NIM_005, NIM_006, NIM_007 und NIM_011. Die Verknüpfungstabelle trägt den Großteil der Schicht-2- und Schicht-3-Relationen.

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
| werk | Werkindex → `m3gim-ontology:MusicalWork` | implementiert |
| rolle | Bühnenrollen → `m3gim-ontology:StageRole` | Rollenindex ausstehend |
| datum | direkte Datumsproperty | implementiert |
| ort, datum | Komposit → `m3gim-ontology:Annotation` | implementiert (E-96) |
| datum, werk | Komposit → `m3gim-ontology:Performance` | implementiert (E-98) |
| rolle, person | Komposit → `m3gim-ontology:Performance` (Bühnenrolle + Interpret:in) | implementiert (E-96) |
| ort (Mobilitätsrolle) | → `rico:Place` + `m3gim-ontology:Annotation` (ohne Datum) | implementiert (E-97) |
| ereignis | → `m3gim-ontology:FramingEvent` | implementiert |
| ausgaben, währung | → `m3gim-ontology:Annotation` | implementiert |
| einnahmen, währung | → `m3gim-ontology:Annotation` | implementiert |
| summe, währung | → `m3gim-ontology:Annotation` | implementiert |
| ensemble | direkte Kontextverarbeitung | niedrige Priorität |

Seit dem Dropdown-Umbau der Erfassungstabelle (Juli 2026) erzwingen abhängige Dropdowns die Wertelisten für `typ` und `rolle` an der Quelle; das Blatt „Typ-Rollen“ im Workbook dokumentiert die Zuordnung. Google-Sheets-Dropdowns tragen kein Komma im Wert, der Komposittyp heißt im Export deshalb `Datum_Ort`; die Pipeline akzeptiert den Unterstrich als gleichwertigen Komposit-Trenner. Die versteckten Dropdown-Hilfsblätter des Workbooks werden beim Laden übersprungen.

### Dekomposition des Komposittyps `ort, datum`

Der Komposittyp trägt in einem Feld sowohl Ortsreferenz als auch Zeitangabe. In der Pipeline wird er in eine Instanz von `m3gim-ontology:Annotation` aufgelöst, mit `m3gim-ontology:atPlace` (Ortsreferenz) und `m3gim-ontology:atDate` (ISO-8601 oder TimeSpan). Dieser Typ ist der Mobilitätskern des Modells und wird in Abschnitt 10 ausführlich behandelt.

### Dekomposition des Komposittyps `datum, werk`

Der Typ verbindet Aufführungsdatum und Werktitel (etwa `1953-07-23, Lohengrin`). Er wird in eine `m3gim-ontology:Performance` aufgelöst, mit `m3gim-ontology:performanceOf` auf das über den Werkindex gematchte `m3gim-ontology:MusicalWork` und `m3gim-ontology:atDate` ohne Rollenangabe an der Performance. Das Werk-Ziel wird ausschließlich über den Index aufgelöst; ein roher Komposit-String oder eine literale Q-ID landet nie als Werktitel. Zeilen, deren Werthälfte kein führendes Jahr trägt (Komponist statt Werk, etwa eine reine `Beethoven`-Zeile), werden ausgefiltert und nur im Quality-Snapshot gezählt, nicht modelliert.

### Dekomposition der Komposittypen `rolle, person`

Beide Schreibvarianten (`Rolle, Person` und `rolle, … Sänger*in`) verbinden Bühnenrolle und Interpret:in. Sie werden in eine n-äre `m3gim-ontology:Performance` aufgelöst, die über `m3gim-ontology:hasStageRole` die Bühnenrolle (Abschnitt 7) und über `m3gim-ontology:hasPerformer` die gegen den Personenindex aufgelöste Person trägt.

Eine **Standalone-Bühnenrolle** (Typ `rolle` ohne Interpret:in) erzeugt ebenfalls eine `m3gim-ontology:Performance`, dann nur mit `m3gim-ontology:hasStageRole` — so trägt jede Bühnenrolle dieselbe Entitätsstruktur, und das frühere Attribut `m3gim:hasPerformanceRole` entfällt vollständig (E-96). Die Form der StageRole-`@id` und ihre Deduplizierung stehen in [data-model.md](data-model.md) § 7. <!-- vocab-exempt: nennt das mit E-96 entfallene Attribut -->

### Mobilitäts-Ortsrollen ohne Datum

Die einfache `ort`-Verknüpfung erzeugt zusätzlich zur `rico:Place`-Referenz eine `m3gim-ontology:Annotation`, wenn ihre Rolle zu den Mobilitäts-Ortsrollen gehört (`MOBILITY_PLACE_ROLES` = zielort, absendeort, abreiseort, empfangsort, vertragsort). Diese Variante trägt nur `m3gim-ontology:atPlace` und `m3gim-ontology:role`, **kein** `m3gim-ontology:atDate` — ein Datum wird nicht geraten (Abschnitt 8, Konfidenz). `wohnort` ist davon ausgenommen und als Zustand mit Gültigkeitsperiode modelliert (Abschnitt 10).

### Auftrittsbündelung über `datenpunkt_id`

Eine Verknüpfungszeile trägt je eine Aussage, etwa eine Person, einen Ort, ein Werk, eine Partie oder einen Betrag. Beschreibt ein Dokument mehrere Auftritte, verteilen sich deren Aussagen flach über den Record, und welche Person, welche Partie, welcher Ort und welcher Betrag zu welchem Auftritt gehören, ist nicht mehr rekonstruierbar. Die Annotation ist dann dokumentzentriert, sie belegt „kommt im Dokument vor", nicht „wer hat was getan".

Die Spalte `datenpunkt_id` hebt diese Bündelung auf eine eigene Ebene. Sie ist die Identität eines **Vorkommnisses** (`m3gim-ontology:Occurrence`, Abschnitt 7), an dem die zusammengehörigen Aussagen eines Auftritts zusammenlaufen.

- Eine **leere** `datenpunkt_id` ist der Default und bezeichnet die Dokument-Ebene. Hierher gehören Aussagen über das Dokument selbst (Verfasser, Adressat, Absendeort, Erstelldatum) sowie Aussagen, deren Auftritts-Zuordnung die Quelle nicht hergibt.
- Eine **fortlaufende Nummer** (1, 2, 3 …) bündelt alle Zeilen eines Auftritts innerhalb des Folios zu einer Occurrence.

Die Pipeline gruppiert die Zeilen nach `(archivsignatur, folio, datenpunkt_id)` und erzeugt je Gruppe eine Occurrence. Die bestehenden Aspekt-Klassen werden zu ihren Facetten — `m3gim-ontology:Annotation` trägt Ort und Zeit, `m3gim-ontology:Performance` Werk und Partie, `m3gim-ontology:Annotation` den Betrag. Der Record bezeugt die Occurrence über `m3gim-ontology:attests` (Abschnitt 7), statt sie zu enthalten, damit dieselbe Occurrence später aus mehreren Dokumenten belegt werden kann.

Der Auftrittsmodus (Gastspiel, Tournee) gehört über `m3gim-ontology:mode` an die Occurrence, nicht als konkurrierender Rollenwert an die einzelne Orts-, Werk- oder Institutionszeile. Die Unterscheidung auswärts gegen am Haus folgt zusätzlich aus dem Vergleich von `m3gim-ontology:atPlace` mit dem Institutionssitz (`m3gim-ontology:headquarters`) und wird nicht eigens erfasst. Die konkrete Erfassungskonvention steht in [data-entry-guidelines.md](data-entry-guidelines.md).

Seit E-127 ist diese Identität zweistufig verfeinert: die Erfassungsspalte heißt `aktivitaet_id`, eine Ganzzahl bündelt die Aktivität (Occurrence), eine zweistellige Dezimale `1.01` ff. die einzelne Beteiligung daran. Die einstufige `datenpunkt_id` (eine Nummer je Auftritt) bleibt als Lesepfad gültig, bis die Pipeline umgestellt ist; das Beteiligungs- und Besetzungsmodell steht in Abschnitt 7 (Zielmodell v2).

## 5. Rollenvokabular

Die Rollen sind nach Zieltyp gegliedert. Empirisch in den Daten belegte Rollen sind mit ●, bislang nur in der Handreichung spezifizierte Rollen mit ○ markiert. Neu im Modell, gegenüber der Vorversion, sind die mit ★ markierten Rollen.

Alle Rollen sind nach Normalisierung geschlechtsneutral. Pipeline-Regel: `:in`, `:innen`, `in` werden aus Rollennamen entfernt (`sänger:in` → `sänger`, `dirigent:in` → `dirigent`).

### Personenrollen

Gliederung nach Handreichungslogik in archivalisch, künstlerisch und institutionell.

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

Die mit *ort-only STE* markierten Rollen (`MOBILITY_PLACE_ROLES`) erzeugen neben der `rico:Place`-Referenz eine `m3gim-ontology:Annotation` ohne Datum (Abschnitt 4). `wohnort` ist davon ausgenommen.

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

### Bezugsebene und Rang einer Datierung

Zwei Eigenschaften am Rollenbegriff sagen, was eine Datierung datiert und welche zählt, wenn ein Dokument mehrere trägt. Beide standen bis 2026-08-22 als Handtabelle im Frontend und wandern mit E-150 an den Begriff, damit Datensatz und Oberfläche dieselbe Aussage führen.

`m3gim-ontology:datingScope` benennt die Bezugsebene. Sie ist ein Begriff des Schemas `m3gim-vocab:datingScopes` mit fünf Werten. `objectDating` datiert das Objekt selbst, `attestedDating` ein vom Objekt bezeugtes Ereignis, `mentionedDating` eine bloße Erwähnung, `framingDating` einen umfassenden Zeitraum, `unfulfilledDating` eine negierte Behauptung. Nur die ersten beiden dürfen ein Dokument datieren; die übrigen bleiben lesbar, ohne den Zeitanker zu setzen.

`m3gim-ontology:datingRank` ist eine ganze Zahl und entscheidet die Reihenfolge, wenn ein Dokument mehrere ankernde Datierungen trägt. Der kleinere Wert hat Vorrang. Ein Rollenbegriff ohne Rang sortiert hinter jeden mit Rang, in Quellreihenfolge.

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
| nicht eingehalten | ● ★ | Vertragsstatus, keine Ereignis-/Ortsrolle (Abschnitt 11); wird im STE-Bau **nicht** als `m3gim-ontology:role` emittiert. Zielmodellierung `m3gim-ontology:contractStatus`/`m3gim:realized = false` am Vertrags-Record ist mit dem Erschließungsteam zu klären (Treffen 2026-06-23). |

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

Eine Datierung wird nach ihrer Notation auf eine der folgenden Repräsentationen geführt:

| Notation | Repräsentation |
|---|---|
| vollständiges oder partielles ISO-Datum | typisierte Datumsproperty (Abschnitt 7) |
| Bereich (`von … bis`, `YYYY/YYYY`) | TimeSpan-Wert |
| Klammer-/Fragezeichen-Unsicherheit (`1957-[05-27?]`) | `m3gim-ontology:Annotation` mit `dateValue`/`dateRole` |
| Freitext-Beginn (`ab …`, `seit …`) | Qualifier `nach:` |

### Datierungsevidenz

| Wert | Bedeutung |
|---|---|
| aus_dokument | Datum steht explizit im Dokument |
| erschlossen | Datum aus Kontext abgeleitet |
| extern | Datum aus anderer Quelle ermittelt |
| unbekannt | keine Datierung möglich |

Datierungsevidenz wird im Meta-Statement-Modell als `agrelon:metadataProvenance`-Wert auf die Datumsproperty angewendet, nicht mehr als separate `m3gim:dateEvidence`-Property. Siehe Abschnitt 9. <!-- vocab-exempt: nennt eine nicht uebernommene Property -->

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

Parallel im Feld befindliche Systeme, zu vereinheitlichen auf das Handreichungssystem.

| Quelle | Werte |
|---|---|
| Handreichung (Soll) | in_bearbeitung, schicht1_fertig, schicht2_fertig, abgeschlossen |
| Pipeline (transform.py) | begonnen, abgeschlossen, zurueckgestellt |

Empfehlung: Handreichungssystem durchsetzen. Die Werte in_bearbeitung, schicht1_fertig, schicht2_fertig und abgeschlossen bilden den Schichtfortschritt sauber ab und erlauben eine Abdeckungsmessung pro Schicht.

## 17. Datenqualität

Es gilt das Prinzip *Documents as Source of Truth*. Die XLSX-Erfassung ist die maßgebliche Quelle, der Pipeline-Code ist wegwerfbares Artefakt. Wo die Pipeline eine XLSX-Eigenheit kompensiert, ist diese Kompensation eine Schuld, kein Feature. Sie wird sichtbar gehalten, damit klar bleibt, was quellseitig zu fixen ist und wo der Code dauerhaft defensiv bleiben muss. Die Code-Stellen der Kompensationen liegen in `scripts/_common.py` und `scripts/transform.py`, die zugehörigen Test-Anker in der Testsuite. Die offenen Source-Fix-Tickets liegen gebündelt im [Datenfehler-Register](data-errors.md § Strukturelle Quell-Fixes).

Die kompensierten Eigenheiten fallen in die Kategorien Spec, Workaround, Policy und Dead.

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
| Malformter Datumswert ohne Jahr (z. B. „06-09") in `entstehungsdatum` | Workaround | nicht-ISO Wert läuft verlustfrei in `m3gim-ontology:hasAnnotation` (`dataQualityFlag` „datierung-malformed"), nicht in `rico:date`; Quell-Fix offen |
| Vertragsstatus „nicht eingehalten" spaltenweit in der Rollenspalte (NIM_023) | Workaround | im STE-Bau nicht als `m3gim-ontology:role` emittiert (`CONTRACT_STATUS_ROLES`); `contractStatus`-Modellierung mit Erschließungsteam offen |
| Gemischte Finanz-Betragsnotation (Dezimalkomma vs. Komma-Währungstrenner, Tausenderpunkt, Doppelbetrag `25, DM/45, DM`) | Workaround | `parse_monetary_values()` löst Betrag/Währung robust auf und splittet Doppelbeträge in zwei DetailAnnotations |
| Bearbeitungsstand in uneinheitlicher Schreibung und Synonymen | Workaround | `normalize_bearbeitungsstand()` mappt auf die kanonischen Werte |
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
| Komposit-Typ `Datum_Ort` statt `Datum, Ort` (Dropdown-Werte können kein Komma tragen) | Spec | `decompose_komposit_typ()` akzeptiert Unterstrich als gleichwertigen Komposit-Trenner |
| versteckte Dropdown-Hilfsblätter und Blatt „Typ-Rollen“ im Verknüpfungs-Export | Spec | `load_verknuepfungen()` überspringt Sheets ohne `typ`- und `name`-Spalte |
| früherer ASCII-Fallback für den Verknüpfungen-Dateinamen | Dead | entfernt, Pipeline wirft jetzt `FileNotFoundError` |

Einzelne Instanz-Befunde (Quellfehler und Abgleichfehler mit Fundstelle und Status) stehen kanonisch im [Datenfehler-Register](data-errors.md) und werden hier nicht dupliziert; vor Bearbeitung gegen den aktuellen Quality-Snapshot (`data/reports/quality-snapshot.md`) verifizieren.

## 18. Quellen

Datengrundlage ist der Teilnachlass UAKUG/NIM am Universitätsarchiv der KUG Graz. Er gliedert sich in die folgenden Bestandsgruppen.

- **Hauptbestand** NIM_001–NIM_200+ mit Briefen, Verträgen, Presseartikeln, Programmen und Fotos.
- **Plakate** NIM/PL_01–PL_26.
- **Tonträger** NIM/TT_01 mit Schellackplatten und Aufnahmen.

Der Quellenzeitraum reicht von 1934 bis 2009. Feinerschlossen mit einzelnen Folio-Einträgen sind bislang die Konvolute um NIM_003, NIM_004, NIM_005, NIM_006, NIM_007 und NIM_011. Bestandszahlen pro Gruppe, Feinerschließungstiefe und Abdeckungsgrade stehen im Quality-Snapshot (`data/reports/quality-snapshot.md`).

Zu Ira Malaniuk existiert keine eigenständige wissenschaftliche Literatur. Das Projekt leistet die ersten archivgestützten Erschließungsarbeiten. Die Einordnung in den Forschungskontext führt [research-framework.md](research-framework.md).