---
title: "Datengrundlage"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.5
created: 2026-02-19
updated: 2026-09-01
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
related: [data-model, research-framework, architecture, journal, testing]
---

# Datengrundlage

## 1. Präambel

Dieses Dokument ist der Spec-first-Anker des Datenmodells. Es beschreibt das Quellmaterial und seine Erfassung, das Schichtenmodell, den Verknüpfungsmechanismus, das Rollenvokabular, die Datumskonventionen und die Datenqualität, also welche Eigenheiten der Quelle die Pipeline kompensiert. Jede Modelländerung wird zuerst hier verankert, danach im Vokabular, im Test und in der Pipeline (E-133).

Adressiert sind Projektmitarbeitende und Folge-Erschließer:innen. Die formalen Klassen, Properties und die Serialisierung führt [data-model.md](data-model.md), dort steht auch die Namespace-Tabelle (§ 7) und die Erfassungsanleitung des Archivteams (§ Erfassung). Die Pipeline-Implementierung steht in [architecture.md](architecture.md), der Forschungsrahmen in [research-framework.md](research-framework.md), die Projektsteuerung in [specification.md](specification.md) § Stand und nächste Schritte.

Beide Modelldokumente behalten die Abschnittsnummern aus der Zeit vor ihrer Teilung, dieses führt 1 bis 6 sowie 14, 15, 17 und 18, [data-model.md](data-model.md) die übrigen. Verweise aus Code, Tests und Vokabular hängen an diesen Nummern.

## 2. Schichtenmodell

Das Modell ist in die fachlichen Schichten Kernmetadaten, Verknüpfungen und Erweiterung plus eine Querschnittsebene Meta gegliedert.

**Schicht 1 (Kernmetadaten).** Archivsignatur, Titel, Datum, Dokumenttyp, Sprache, Umfang, Bearbeitungsstand. Direkt aus `rico:Record`-Properties bedient.

**Schicht 2 (Verknüpfungen).** Person, Ort, Institution, Werk, Bühnenrolle, Datum, Ereignis, Ensemble. Relationale Anreicherung der Records über die Verknüpfungstabelle.

**Schicht 3 (Erweiterung).** Finanzielle und vertragliche Detailangaben (Honorare, Provisionen, Währungsbeträge). Getragen von `m3gim-ontology:Annotation`.

**Querschnittsebene (Meta).** Gültigkeitsperiode, Konfidenz und Provenienz jeder Aussage. Nach dem Muster von AgRelOn realisiert, wirksam für alle fachlichen Schichten ([data-model.md](data-model.md) § 9).

## 3. Tabellenmodell

| Tabelle | Funktion |
|---|---|
| M3GIM-Objekte | Primäre Record-Metadaten (Schicht 1) |
| M3GIM-Verknüpfungen | Kontext- und Entitätsrelationen (Schicht 2 + 3), seit 2026-08-31 als CSV-Ausfuhr je Blatt |
| Personenindex | Personen-Normdaten (Name, Lebensdaten, Wikidata-ID) |
| Organisationsindex | Organisations-Normdaten |
| Ortsindex | Ortsdaten |
| Werkindex | Werknachweise (Titel, Komponist, Wikidata-ID) |

### Quellformat

Das maßgebliche Quellformat ist die CSV-Ausfuhr, weil der XLSX-Export der Tabellenkalkulation Datums-, Folio- und Kennungsspalten in Zelltypen umwandelt und dabei Angaben erfindet, die die Erfassung nicht trägt (Abschnitt 6). Die CSV-Ausfuhr gibt den erfassten Text unverändert weiter.

Die Verknüpfungstabelle liegt seit der Lieferung vom 2026-08-31 als CSV je Blatt unter `data/google-spreadsheet/verknuepfungen/`, eine Datei je Box und dazu die Wertliste `Typ-Rolle.csv` (E-152). Die Dateinamen tragen die Blattbezeichnung mit Unterstrich, `Box_1.csv` bis `Box_9.csv`, der Blattname der Provenienz bleibt die Schreibung der Quelle, also `Box 1`. Die Objekttabelle liegt seit der Lieferung vom 2026-09-01 ebenfalls als CSV vor, im Repository als `M3GIM-Objekte.csv` neben der Arbeitsmappe. Der Loader bevorzugt die CSV und fällt ohne sie auf die XLSX zurück, deren Datumsspalte dann die Autokonvertierung trägt. Die vier Indextabellen bleiben XLSX, weil sie keine gefährdeten Spalten führen.

Ein Blatt ohne auswertbare Datenzeile wird nicht mitgeführt. In der Lieferung vom 2026-08-31 sind das Box 3, Box 8 und Box 10, alle mit defekten Restzeilen, vermerkt in der [Partner-Übergabeliste](../data/reports/source-errors-handover-2026-09-01.md). Sie kommen mit dem Quell-Fix zurück.

### Identität und Vorrang in den Indextabellen

Ein Index kann denselben Namen mehrfach führen, teils als versehentliche Doppelerfassung, teils als echte Homonymie. Die Übernahme folgt drei deterministischen Regeln, die keinen Fall stillschweigend auflösen.

**Identität.** Führt eine Indexzeile eine `m3gim_id`, ist diese die Identität. Zeilen mit derselben `m3gim_id` bezeichnen dieselbe Entität und werden verdichtet. Fehlt die `m3gim_id`, entscheidet der getrimmte Name. Tragen zwei Zeilen denselben Namen und verschiedene `m3gim_id`, ist das eine Namenskollision und keine Dublette.

**Verdichtung.** Innerhalb einer Identität gewinnt je Feld der erste nicht leere Wert in Quellreihenfolge. Ein gefülltes Feld wird nie von einem leeren überschrieben. `assoziierte_person` ist mehrwertig und sammelt alle Werte der Gruppe.

**Kollision.** Tragen zwei Zeilen derselben Identität in demselben Feld verschiedene nicht leere Werte, gewinnt der erste, und der Fall geht mit beiden Werten in den Validierungsreport. Ein Flag am Knoten des Datensatzes entsteht dabei nicht, weil der Konflikt im Bestand ausschließlich die Anmerkungsspalte betrifft und je Vorkommen denselben Knoten erneut träfe.

Im Werkindex ist der Titel allein keine Identität, weil verschiedene Werke ihn teilen. Der Schlüssel ist das Paar aus Titel und Komponist. Eine Verknüpfungszeile, die nur einen Titel nennt und auf mehr als einen Indexeintrag passt, wird nicht aufgelöst. Das Werk erscheint mit Titel, ohne Komponistenangabe und mit dem Flag `name-nicht-eindeutig`, und die Mehrdeutigkeit geht in den Validierungsreport.

### Konvolut- und Objektlogik

Objektidentität wird durch `archivsignatur` plus optionales Folio gebildet. Konvolute sind aggregierende Einheiten (`rico:RecordSet`) mit Kindern auf Folio-Ebene (`rico:Record`). Verknüpfungen hängen an der granularsten verfügbaren Ebene.

### Bestand und Abdeckung

Teilnachlass UAKUG/NIM in den Bestandsgruppen Hauptbestand, Plakate und Tonträger. Feinerschlossen mit einzelnen Folio-Einträgen ist eine wachsende Auswahl der Konvolute. Die Verknüpfungstabelle trägt den Großteil der Schicht-2- und Schicht-3-Relationen. Nicht alle Objekte sind durchgängig erschlossen, Titel und Dokumenttyp sind am besten abgedeckt, Entstehungsdatum mittel, Umfangsangabe und Sprache dünn. Dieser Abdeckungsgrad ist bei jeder Auswertung mitzuführen. Alle laufenden Zählstände, welche Konvolute Folien tragen, Feldabdeckung und Verknüpfungsrate, stehen im Quality-Snapshot (`data/reports/quality-snapshot.md`) und werden bei jedem Pipeline-Lauf neu generiert. Dieses Dokument hält keine laufenden Zahlen vor.

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

Seit dem Dropdown-Umbau der Erfassungstabelle (Juli 2026) erzwingen abhängige Dropdowns die Wertelisten für `typ` und `rolle` an der Quelle, dokumentiert im Blatt `Typ-Rolle`, das als eigene Datei `Typ-Rolle.csv` neben den Box-Dateien liegt. Google-Sheets-Dropdowns tragen kein Komma im Wert, weshalb ein Komposittyp im Export auch mit Unterstrich stehen kann. Belegt sind `einnahmen_währung`, `ausgaben_währung`, `summe_währung` und `ort_datum`. Die Pipeline akzeptiert den Unterstrich als gleichwertigen Komposit-Trenner.

Zwei Typwerte haben keinen Zielzweig in der Serialisierung und fallen heute still weg, `Aktivität` und `dokument`. Beide sind belegt, beide stehen als eigene Modellierungsrunde aus, und beide sind bis dahin in der [Partner-Übergabeliste](../data/reports/source-errors-handover-2026-09-01.md) und im [Datenfehler-Register](../data/reports/reconciliation-register.md) geführt.

### Dekomposition der Komposittypen

Jeder Komposittyp wird nach demselben Muster in eine Zielentität mit typisierten Properties aufgelöst. Die formale Fassung tragen das Vokabular und `decompose_komposit_typ()` in der Pipeline, diese Tabelle ist die Lesefassung.

| Komposittyp | Zielklasse | Properties | Sonderregel |
|---|---|---|---|
| `ort, datum` | `m3gim-ontology:Annotation` | `atPlace`, `atDate` (ISO 8601 oder TimeSpan) | Mobilitätskern des Modells ([data-model.md](data-model.md) § 10) |
| `datum, werk` | `m3gim-ontology:Performance` | `performanceOf` (Werk über Index), `atDate` | Werk-Ziel nur über den Index, nie roher String oder literale Q-ID. Zeilen ohne führendes Jahr in der Werthälfte (Komponist statt Werk) werden ausgefiltert und nur im Quality-Snapshot gezählt |
| `rolle, person` | `m3gim-ontology:Performance` | `hasStageRole`, `hasPerformer` (Person über Index) | beide Schreibvarianten (`Rolle, Person` und `rolle, … Sänger*in`) gleichbehandelt |
| `rolle` (standalone) | `m3gim-ontology:Performance` | nur `hasStageRole` | jede Bühnenrolle trägt dieselbe Entitätsstruktur, das frühere Attribut `m3gim:hasPerformanceRole` entfällt vollständig (E-96); StageRole-`@id` und Deduplizierung in [data-model.md](data-model.md) § 7 <!-- vocab-exempt: nennt das mit E-96 entfallene Attribut --> |
| `ort` mit Mobilitätsrolle | `rico:Place` + `m3gim-ontology:Annotation` | `atPlace`, `role`, **kein** `atDate` | greift für `MOBILITY_PLACE_ROLES` (zielort, absendeort, abreiseort, empfangsort, vertragsort), ein Datum wird nicht geraten. `wohnort` ist ausgenommen und als Zustand mit Gültigkeitsperiode modelliert ([data-model.md](data-model.md) § 10) |
| `ausgaben, währung` / `einnahmen, währung` / `summe, währung` | `m3gim-ontology:Annotation` | Betrag, Währung, Finanzrolle | Betragsparsing und Doppelbeträge in [data-model.md](data-model.md) § 11 |

### Auftrittsbündelung über `datenpunkt_id`

Eine Verknüpfungszeile trägt je eine Aussage, etwa eine Person, einen Ort, ein Werk, eine Partie oder einen Betrag. Beschreibt ein Dokument mehrere Auftritte, verteilen sich deren Aussagen flach über den Record, und welche Person, welche Partie, welcher Ort und welcher Betrag zu welchem Auftritt gehören, ist nicht mehr rekonstruierbar. Die Annotation ist dann dokumentzentriert, sie belegt „kommt im Dokument vor", nicht „wer hat was getan".

Die Spalte `datenpunkt_id` hebt diese Bündelung auf eine eigene Ebene. Sie ist die Identität eines **Vorkommnisses** (`m3gim-ontology:Occurrence`, [data-model.md](data-model.md) § 7), an dem die zusammengehörigen Aussagen eines Auftritts zusammenlaufen.

- Eine **leere** `datenpunkt_id` ist der Default und bezeichnet die Dokument-Ebene. Hierher gehören Aussagen über das Dokument selbst (Verfasser, Adressat, Absendeort, Erstelldatum) sowie Aussagen, deren Auftritts-Zuordnung die Quelle nicht hergibt.
- Eine **fortlaufende Nummer** bündelt alle Zeilen eines Auftritts innerhalb des Folios zu einer Occurrence.

Die Pipeline gruppiert die Zeilen nach `(archivsignatur, folio, datenpunkt_id)` und erzeugt je Gruppe eine Occurrence. Die bestehenden Aspekt-Klassen werden zu ihren Facetten, die Annotation trägt Ort und Zeit, die Performance Werk und Partie, die Annotation den Betrag. Der Record bezeugt die Occurrence über `m3gim-ontology:attests`, statt sie zu enthalten, damit dieselbe Occurrence später aus mehreren Dokumenten belegt werden kann.

Der Auftrittsmodus (Gastspiel, Tournee) gehört über `m3gim-ontology:mode` an die Occurrence, nicht als konkurrierender Rollenwert an die einzelne Orts-, Werk- oder Institutionszeile. Die Unterscheidung auswärts gegen am Haus folgt aus dem Vergleich von `m3gim-ontology:atPlace` mit dem Institutionssitz (`m3gim-ontology:headquarters`) und wird nicht eigens erfasst. Die Erfassungskonvention steht in [data-model.md](data-model.md) § Erfassung.

Die Spalte trägt in einem Teil der Blätter den Namen `data_id` statt `datenpunkt_id`. Beide bezeichnen dieselbe Angabe, der Lesepfad führt sie zusammen. Seit E-127 ist diese Identität zweistufig verfeinert, die Erfassungsspalte heißt `aktivitaet_id`, eine Ganzzahl bündelt die Aktivität (Occurrence), eine zweistellige Dezimale `1.01` ff. die einzelne Beteiligung daran. Die einstufige `datenpunkt_id` bleibt als Lesepfad gültig, bis die Pipeline umgestellt ist. Das Beteiligungs- und Besetzungsmodell steht in [data-model.md](data-model.md) § 7 (Zielmodell v2).

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
| vertragspartner | ● ★ | als AgRelOn-Relation, nicht als Personenrolle ([data-model.md](data-model.md) § 8) |
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
| wohnort | ● ★ | Zustand mit Gültigkeitsperiode, kein Punktereignis ([data-model.md](data-model.md) § 10) |
| erwähnt | ● | |

Die mit *ort-only STE* markierten Rollen (`MOBILITY_PLACE_ROLES`) erzeugen neben der `rico:Place`-Referenz eine `m3gim-ontology:Annotation` ohne Datum (Abschnitt 4). `wohnort` ist davon ausgenommen.

### Institutionenrollen

| Rolle | Status | Bemerkung |
|---|---|---|
| vertragspartner | ● ★ | AgRelOn `HasEmployeeEmployer` (Institution) bzw. `HasProfessionalContact` (Person), [data-model.md](data-model.md) § 8 |
| arbeitgeber | ● | AgRelOn-Mapping: `hasEmployer` |
| veranstalter | ● | |
| vermittler | ● | |
| adressat | ○ | |
| empfänger | ● ★ | |
| absender | ● ★ | Korrespondenzrolle auch bei Institutionen, häufig bei Rundfunkanstalten |
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
| generalprobe | ● ★ | erzeugt `probendatum` + `probenTyp` ([data-model.md](data-model.md) § 7) |
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

Die Bühnenrolle ist eigenständige Entität, kein Attribut ([data-model.md](data-model.md) § 7).

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
| ratenzahlung | ○ | seit der Lieferung 2026-08-31 nicht mehr belegt, der Beleg trägt jetzt `spielzeit` |
| unterschriftsdatum | ● ★ | Datierung der Unterzeichnung, Gegenstück zur Akteursrolle `unterzeichner` |
| reisedatum | ● ★ | Reisemobilität ohne Richtungsangabe, gegen `abreisedatum` abzugrenzen |
| aufnahmedatum | ● ★ | fällt mit der Werkrolle `aufnahme` auf einen Begriff zusammen, Ursprungswert in `derivedFromRole` |
| gespräch | ● ★ | |
| erwähnt | ● ★ | |

### Bezugsebene und Rang einer Datierung

Zwei Eigenschaften am Rollenbegriff sagen, was eine Datierung datiert und welche zählt, wenn ein Dokument mehrere trägt. Beide standen bis 2026-08-22 als Handtabelle im Frontend und wandern mit E-150 an den Begriff, damit Datensatz und Oberfläche dieselbe Aussage führen.

`m3gim-ontology:datingScope` benennt die Bezugsebene. Sie ist ein Begriff des Schemas `m3gim-vocab:datingScopes` mit fünf Werten. `objectDating` datiert das Objekt selbst, `attestedDating` ein vom Objekt bezeugtes Ereignis, `mentionedDating` eine bloße Erwähnung, `framingDating` einen umfassenden Zeitraum, `unfulfilledDating` eine negierte Behauptung. Nur die ersten beiden dürfen ein Dokument datieren, die übrigen bleiben lesbar, ohne den Zeitanker zu setzen.

`m3gim-ontology:datingRank` ist eine ganze Zahl und entscheidet die Reihenfolge, wenn ein Dokument mehrere ankernde Datierungen trägt. Der kleinere Wert hat Vorrang. Ein Rollenbegriff ohne Rang sortiert hinter jeden mit Rang, in Quellreihenfolge.

Ein neu aufgenommener Rollenbegriff bekommt einen Rang am Ende der bestehenden Reihe. Die Reihenfolge der bereits vergebenen Ränge bleibt unverändert, weil eine Umsortierung eine Datierung verschiebt, die heute ankert. Eine Umsortierung ist eine eigene Entscheidung und keine Nebenwirkung einer Ergänzung.

### Finanzrollen (Typ `ausgaben, währung` / `einnahmen, währung` / `summe, währung`)

| Rolle | Status | Bemerkung |
|---|---|---|
| abendgage | ● ★ | Honorar pro Auftritt |
| provision | ● ★ | Agentenvergütung |
| gesamtvergütung | ● ★ | Umlaut bleibt erhalten, keine ASCII-Transliteration |
| reisekosten | ● ★ | |
| rundfunkhonorar | ○ | seit der Lieferung 2026-08-31 nicht mehr belegt, die Belege tragen jetzt `gesamtvergütung`; Quelle führte die Tippform „rundfunkshonorar" |
| abspielhonorar | ● ★ | Vergütung für die Ausstrahlung einer vorhandenen Aufnahme, gegen `rundfunkhonorar` (Herstellung) abzugrenzen |
| gage | ● ★ | Abendsumme über mehrere Partien, gegen `abendgage` (je Partie) abzugrenzen |
| summe | ● ★ | die Rolle wiederholt das Detailfeld `summe`; als Begriff geführt, damit kein Literal in der Rollenproperty steht |
| erwähnt | ● | |

### Statusmarkierungen in der Rollenspalte

Die Quelle nutzte die `rolle`-Spalte vereinzelt für einen Vertragsstatus statt für eine echte Rolle. Mit der Lieferung vom 2026-08-31 steht der Wert in der Anmerkungsspalte als `Vertrag nicht eingehalten` und die betroffenen Zeilen tragen eine echte Rolle. Der Rollenwert `nicht eingehalten` ist damit nicht mehr belegt. Die Modellierung als `m3gim-ontology:contractStatus` am Vorkommnis ist nicht mehr extern blockiert und steht als eigene Runde aus. Bis dahin wird ein solcher Wert im STE-Bau nicht als `m3gim-ontology:role` emittiert (`CONTRACT_STATUS_ROLES`).

## 6. Datumskonventionen

### Formate

| Situation | Format | Beispiel |
|---|---|---|
| Vollständig | YYYY-MM-DD | 1958-04-18 |
| Nur Monat | YYYY-MM | 1958-04 |
| Nur Jahr | YYYY | 1958 |
| Zeitspanne | YYYY-MM-DD/YYYY-MM-DD | 1958-08-10/1958-09-09 |
| Zeitspanne nur Jahre | YYYY/YYYY | 1945/1947 |
| Spielzeit in der Quellschreibung | YYYY-YYYY | 1947-1952 |

Die Spielzeitform mit Bindestrich ist die Schreibung der Quelle, `clean_date()` normalisiert sie verlustfrei auf `YYYY/YYYY`.

### Quellformat und Autokonvertierung

Die Datumswerte der Verknüpfungstabelle sind Text. Der XLSX-Export der Tabellenkalkulation liest sie als Kalenderwerte zurück und schreibt sie als Zeitstempel der Form `YYYY-MM-DD 00:00:00`. Dabei wird eine Monatsangabe auf den Monatsersten aufgefüllt und eine jahrlose Angabe zu einem Kalenderdatum des Exportjahres. Der Datensatz behauptete damit eine Genauigkeit, die die Quelle nicht trägt. Dasselbe trifft die Folio- und die Bündelungsspalte.

Daraus folgt die Quellformat-Regel aus Abschnitt 3, die Verknüpfungstabelle wird als CSV gelesen, nicht als XLSX. Ein Wert der Form `YYYY-MM-DD 00:00:00` ist kein zulässiges Quellformat mehr. Trifft er trotzdem ein, belegt er eine Autokonvertierung, er geht als Warnung in den Validierungsreport und wird nicht als tagesgenaues Datum übernommen.

Nicht aufgefüllte Monats- und Tagesstellen (`1956-5-13`) sind ein Quellfehler und gehen als Befund in den Report. Die Pipeline füllt sie nicht auf, weil das Auffüllen genau die Behauptung erzeugt, die der Wechsel auf die CSV-Quelle beseitigt hat.

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
| vollständiges oder partielles ISO-Datum | typisierte Datumsproperty ([data-model.md](data-model.md) § 7) |
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

Datierungsevidenz wird im Meta-Statement-Modell als `agrelon:metadataProvenance`-Wert auf die Datumsproperty angewendet, nicht mehr als separate `m3gim:dateEvidence`-Property ([data-model.md](data-model.md) § 9). <!-- vocab-exempt: nennt eine nicht uebernommene Property -->

## 14. Namenskonventionen und Ortsdubletten

Die Normalisierungsregeln des Datenflusses stehen an ihren Heimatstellen, die Rollen-Normalisierung in Abschnitt 5, die Komposit-Dekomposition in Abschnitt 4, die Datumsbereinigung in Abschnitt 6, die Index-Kompensationen im Katalog in Abschnitt 17. Hier stehen nur die Konventionen, die keine andere Heimat haben.

### Namenskonventionen

- **Personen.** Nachname, Vorname (`Malaniuk, Ira`). Adelstitel nachgestellt (`Karajan, Herbert von`).
- **Orte.** Gebräuchlicher deutscher Name, historische Ortsnamen aus der Quelle (`Lemberg` statt `Lwiw`).
- **Institutionen.** Offizielle Bezeichnung ohne Rechtsform (`Bayerische Staatsoper`).
- **Werke.** Titel aus der Quelle, Komponist als Zusatzfeld.

### Ortsdubletten

Vor der Normalisierung zu vereinheitlichen:

- `Stuttgart` und `Stuttgart ` (Trailing-Whitespace) → konsolidiert
- `Zürich` und `Zürich, Zürichbergstrasse 104` → separater Ortseintrag für die Adresse, verknüpft via `skos:broader` zum Ort `Zürich`
- Freitextmischungen wie `Wien, ab 1956` werden in `SpatiotemporalEvent`-Instanzen mit separaten `atPlace` und `atDate` überführt

## 15. Erfassungsstatus

Parallel im Feld befindliche Systeme, zu vereinheitlichen auf das Handreichungssystem.

| Quelle | Werte |
|---|---|
| Handreichung (Soll) | in_bearbeitung, schicht1_fertig, schicht2_fertig, abgeschlossen |
| Pipeline (transform.py) | begonnen, abgeschlossen, zurueckgestellt |

Empfehlung: Handreichungssystem durchsetzen. Die Werte bilden den Schichtfortschritt ab und erlauben eine Abdeckungsmessung pro Schicht. Die uneinheitlichen Schreibungen der Quelle mappt `normalize_bearbeitungsstand()` auf die kanonischen Pipeline-Werte (Abschnitt 17).

## 17. Datenqualität

Es gilt das Prinzip *Documents as Source of Truth*. Die Erfassung ist die maßgebliche Quelle, der Pipeline-Code ist wegwerfbares Artefakt. Wo die Pipeline eine Quell-Eigenheit kompensiert, ist diese Kompensation eine Schuld, kein Feature. Sie wird sichtbar gehalten, damit klar bleibt, was quellseitig zu fixen ist und wo der Code dauerhaft defensiv bleiben muss. Die Code-Stellen liegen in `scripts/_common.py` und `scripts/transform.py`, die Test-Anker in der Testsuite.

Die kompensierten Eigenheiten fallen in vier Kategorien. **Spec** sind strukturell unvermeidliche Format-Transformationen, die keinen Datenfehler kaschieren. **Workaround** kompensiert eine quellseitig fixbare Eigenheit und ist ein redaktioneller Hinweis ans Archiv-Team. **Policy** ist eine redaktionelle Entscheidung, die gilt, solange die Annahme trägt. **Dead** bezeichnet entfernte Kompensationen, die nur zur Historie geführt werden.

| Eigenheit | Kategorie | Pipeline-Kompensation |
|---|---|---|
| Index-Blätter ohne saubere Kopfzeile (erste Datenzeile als Header gelesen) | Workaround | `INDEX_HEADER_SHIFTS` schiebt die Zeile zurück ins DataFrame |
| Finanzwerte ohne Währungssuffix in NIM_007 Folio 5_1 | Policy | `FINANCE_CURRENCY_DEFAULTS` setzt „S" (Schilling) |
| Finanzwerte ohne Währungssuffix in NIM_011 Folio 5 (Brüssel-Gastspiel) | Policy | `FINANCE_CURRENCY_DEFAULTS` setzt „Belgische Francs" (Folio-9-Pendant + Vertragsort Brüssel); mit Erschließungsteam zu bestätigen |
| Datums-Platzhalter „ohne Datum"/„o. D." in `entstehungsdatum` | Workaround | `clean_date()` bildet die Platzhalter auf `None` ab (kein Schein-`rico:date`) |
| Malformter Datumswert ohne Jahr in `entstehungsdatum` | Workaround | nicht-ISO Wert läuft verlustfrei in `m3gim-ontology:hasAnnotation` (`dataQualityFlag` „datierung-malformed"), nicht in `rico:date`; Quell-Fix offen |
| Vertragsstatus „nicht eingehalten" in der Rollenspalte | Workaround | `CONTRACT_STATUS_ROLES`, siehe Abschnitt 5 § Statusmarkierungen |
| Gemischte Finanz-Betragsnotation (Dezimalkomma vs. Komma-Währungstrenner, Tausenderpunkt, Doppelbetrag) | Workaround | `parse_monetary_values()` löst Betrag/Währung auf und splittet Doppelbeträge in zwei DetailAnnotations |
| Bearbeitungsstand in uneinheitlicher Schreibung und Synonymen | Workaround | `normalize_bearbeitungsstand()`, siehe Abschnitt 15 |
| Datumsrolle wird im Komposit `ort, datum` an beide Hälften vererbt | Workaround | Role-Strip im Ort-Zweig für Datumsrollen |
| Freitext-Datierungen (Ort plus Zeit gemischt) | Workaround | Rohwert wird durchgereicht und toleriert, nicht geblockt |
| Gender-inklusive Rollennotation | Spec | `normalize_role()`, siehe Abschnitt 5 |
| Ungültige Wikidata-Roh-Werte (Tippfehler, URLs) | Spec | nur Strings mit Muster `^Q\d+$` erhalten den `wd:`-Prefix |
| wechselnder Spaltenname der Folio-Nummer | Workaround | heuristische Folio-Spalten-Erkennung plus Regex-Fallback |
| nicht-textueller Spaltenkopf in der Objekttabelle | Workaround | Folio-Erkennung überspringt nicht-String-Köpfe statt abzubrechen |
| Literal `Folio` als Folio-Zellwert | Workaround | Guard verhindert die kaputte Objekt-ID, Befund in den Report |
| Verknüpfungstabelle über mehrere Box-Sheets verteilt | Workaround | alle Sheets werden geladen und zusammengeführt, statt nur das erste |
| Signaturspalte mit Leerzeichen-Kopf, lückig gefüllt | Workaround | Spalte positionsbasiert erkannt und je Sheet forward-gefüllt |
| Personenindex ohne sauberen Namensspaltenkopf | Workaround | Header-Shift auch für den Personenindex, sonst Totalverlust der Personen-Normdaten |
| gleiche `archivsignatur` für Sammel-Zeile und Folio-Zeilen | Workaround | `build_konvolut_hierarchy()` vergibt `_sammlung`-Suffix auf der @id |
| Muster-/Template-Zeile im Erfassungsblatt | Policy | Zeilen mit `archivsignatur = "beispiel"` werden übersprungen |
| Komposit-Typ mit Unterstrich statt Komma | Spec | `decompose_komposit_typ()`, siehe Abschnitt 4 |
| versteckte Dropdown-Hilfsblätter im Verknüpfungs-Export | Spec | im XLSX-Pfad überspringt `load_verknuepfungen()` Sheets ohne `typ`- und `name`-Spalte; im CSV-Pfad entfällt der Fall |
| Autokonvertierung von Datums-, Folio- und Bündelungsspalten im XLSX-Export | Workaround | Quellformat der Verknüpfungen ist die CSV-Ausfuhr je Blatt (E-152), siehe Abschnitt 6 |
| Bündelungsspalte heißt je nach Blatt `datenpunkt_id` oder `data_id` | Workaround | `load_verknuepfungen()` führt beide Schreibungen zusammen, siehe Abschnitt 4 |
| mehrfach erfasster Name in einem Index | Workaround | feldweise Verdichtung nach Identität, siehe Abschnitt 3; der Feldkonflikt geht in den Validierungsreport |
| gleicher Werktitel bei verschiedenen Komponisten | Workaround | Werkindex-Schlüssel Titel plus Komponist, siehe Abschnitt 3 |
| Indexkopfzelle mit einem Datenwert überschrieben | Workaround | Kennungsspalte positionsbasiert erkannt statt über den Kopfnamen; der geleakte Wert geht in den Report |
| Verknüpfungszeile mit `name` und `rolle`, aber ohne `typ` | Workaround | Zeile wird nicht modelliert, weil der Typ den Zielkontext steuert und ein Typ nicht geraten wird; sie geht mit Fundstelle in den Validierungsreport. Ein Typ-Vorschlag entsteht getrennt nach dem Muster von `scripts/propose-links.py` (E-147) |
| früherer ASCII-Fallback für den Verknüpfungen-Dateinamen | Dead | entfernt, Pipeline wirft jetzt `FileNotFoundError` |

Die konkreten, an das Erschließungsteam übergebenen Quellfehler mit Datei, Fundstelle und Feld stehen tagesaktuell und geprüft in der [Partner-Übergabeliste](../data/reports/source-errors-handover-2026-09-01.md). Die projektinterne Reconciliation- und Strukturschicht führt das [Datenfehler-Register](../data/reports/reconciliation-register.md). Vor Bearbeitung gegen den aktuellen Quality-Snapshot (`data/reports/quality-snapshot.md`) verifizieren.

## 18. Quellen

Datengrundlage ist der Teilnachlass UAKUG/NIM am Universitätsarchiv der KUG Graz. Er gliedert sich in die folgenden Bestandsgruppen.

- **Hauptbestand** NIM_001–NIM_200+ mit Briefen, Verträgen, Presseartikeln, Programmen und Fotos.
- **Plakate** NIM/PL_01–PL_26.
- **Tonträger** NIM/TT_01 mit Schellackplatten und Aufnahmen.

Der Quellenzeitraum reicht von 1919 bis 2010. Die früheste Datierung trägt ein Plakat, die späteste eine Ausstellung nach dem Tod der Nachlassbildnerin. Ein Wert außerhalb dieser Spanne ist ein Quellfehler und gehört auf die [Partner-Übergabeliste](../data/reports/source-errors-handover-2026-09-01.md). Welche Konvolute feinerschlossen sind, Bestandszahlen pro Gruppe und Abdeckungsgrade stehen im Quality-Snapshot (`data/reports/quality-snapshot.md`).

Zu Ira Malaniuk existiert keine eigenständige wissenschaftliche Literatur. Das Projekt leistet die ersten archivgestützten Erschließungsarbeiten. Die Einordnung in den Forschungskontext führt [research-framework.md](research-framework.md).
