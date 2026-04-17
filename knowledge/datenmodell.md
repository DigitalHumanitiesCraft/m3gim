# Datenmodell

> Ontologie, Schichtenmodell, Verknüpfungslogik, RiC-O- und AgRelOn-Integration, Mobilitätsmodell, Meta-Statements, kontrollierte Vokabulare und partitur.json-Schema.

Version 2.0, Stand: Revision auf Basis der Ist-Daten-Analyse der sechs M³GIM-Tabellen.

## 1. Präambel

### Zweck

Dieses Dokument beschreibt das Datenmodell des M³GIM-Projekts in seinem aktuellen Stand. Es ersetzt die Vorgängerfassung und integriert die empirisch aus den erschlossenen Daten abgeleiteten Erweiterungen, die Mobilitätsperspektive als eigenständige Modellebene sowie die AgRelOn-Integration für Agent-zu-Agent-Beziehungen.

Adressiert sind Projektmitarbeitende und Folge-Erschließer:innen, nicht externe Ontologie-Reviewer:innen. Der Stil ist operativ. Begründungen werden dort gegeben, wo Modellentscheidungen nicht aus den Tabellen ersichtlich sind.

### Geltungsbereich

Das Dokument definiert die Entitätsklassen, Relationen, Vokabulare und Normalisierungsregeln, nach denen die Excel-Erfassung in RDF überführt und als JSON-LD serialisiert wird. Pipeline-Implementierung, Projektgeschichte und Forschungsstand sind Gegenstand separater Dokumente (`pipeline.md`, `projekt-status.md`, `forschung.md`).

### Namespaces

| Prefix | URI | Zweck |
|---|---|---|
| `rico` | `https://www.ica.org/standards/RiC/ontology#` | Archivisches Kernmodell |
| `m3gim` | `https://dhcraft.org/m3gim/vocab#` | Projekterweiterung: Werke, Aufführungen, Bühnenrollen, Mobilität |
| `m3gim-dft` | `https://dhcraft.org/m3gim/dft#` | SKOS-ConceptScheme Dokumenttypen |
| `m3gim-role` | `https://dhcraft.org/m3gim/role#` | SKOS-ConceptScheme Relationsrollen |
| `agrelon` | `https://d-nb.info/standards/elementset/agrelon#` | Agent-Agent-Relationen, Meta-Statements |
| `wd` | `http://www.wikidata.org/entity/` | Wikidata-Normdatenreferenzen |
| `skos` | `http://www.w3.org/2004/02/skos/core#` | Vokabularorganisation |
| `xsd` | `http://www.w3.org/2001/XMLSchema#` | Datatypes |

### Beziehung zu den anderen Projektdokumenten

Das Datenmodell operiert auf der dritten epistemischen Ebene des Projekts: *Entitäten und Verknüpfungen*. Kontextwissen (Theorie, Forschungsstand) bleibt in `forschung.md`, Projektsteuerung (Arbeitsprogramm, Technik) in `projekt-status.md` und `pipeline.md`.

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
| ort, datum | Komposit → `m3gim:SpatiotemporalEvent` | Dekomposition implementiert, Klassenmapping neu |
| ereignis | → `m3gim:PerformanceEvent` | implementiert |
| ausgaben, währung | → `m3gim:DetailAnnotation` | implementiert |
| einnahmen, währung | → `m3gim:DetailAnnotation` | implementiert |
| summe, währung | → `m3gim:DetailAnnotation` | implementiert |
| ensemble | direkte Kontextverarbeitung | niedrige Priorität |

### Dekomposition des Komposittyps `ort, datum`

Der Komposittyp trägt in einem Feld sowohl Ortsreferenz als auch Zeitangabe. In der Pipeline wird er in eine Instanz von `m3gim:SpatiotemporalEvent` aufgelöst, mit `m3gim:atPlace` (Ortsreferenz) und `m3gim:atDate` (ISO-8601 oder TimeSpan). Dieser Typ ist der Mobilitätskern des Modells und wird in Abschnitt 10 ausführlich behandelt.

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
| technische leitung | ● ★ | |
| interpret | ● ★ | Oberbegriff, sofern Stimmfach/Funktion unklar |
| protagonist | ● | Klärungsbedarf: möglicherweise Bühnenrolle, nicht Personenrolle |

**Institutionell**

| Rolle | Status | Bemerkung |
|---|---|---|
| vertragspartner | ○ | |
| inhaber | ● ★ | |
| herausgeber | ● ★ | auch bei Personen, nicht nur bei Institutionen |

### Ortsrollen

| Rolle | Status | Bemerkung |
|---|---|---|
| entstehungsort | ● | |
| zielort | ● | |
| absendeort | ● ★ | Korrespondenz- und Reisemobilität |
| abreiseort | ● ★ | Reisemobilität |
| auffuehrungsort | ● | |
| wohnort | ○ | |
| vertragsort | ○ | |
| erwähnt | ● | |

### Institutionenrollen

| Rolle | Status | Bemerkung |
|---|---|---|
| vertragspartner | ○ | |
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
| gespräch | ● ★ | |
| erwähnt | ● ★ | |

### Finanzrollen (Typ `ausgaben, währung` / `einnahmen, währung` / `summe, währung`)

| Rolle | Status | Bemerkung |
|---|---|---|
| abendgage | ● ★ | Honorar pro Auftritt |
| provision | ● ★ | Agentenvergütung |
| erwähnt | ● | |

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

### Datierungsevidenz

| Wert | Bedeutung |
|---|---|
| aus_dokument | Datum steht explizit im Dokument |
| erschlossen | Datum aus Kontext abgeleitet |
| extern | Datum aus anderer Quelle ermittelt |
| unbekannt | keine Datierung möglich |

Datierungsevidenz wird im Meta-Statement-Modell als `agrelon:hasProvenance`-Wert auf die Datumsproperty angewendet, nicht mehr als separate `m3gim:dateEvidence`-Property. Siehe Abschnitt 9.

## 7. RiC-O-Kern und m3gim-Erweiterung

### RiC-O-Kern

Hierarchie.
`rico:RecordSet` (Konvolut, Fonds) mit `rico:Record` (Einzelstück). Agenten-Typen `rico:Person`, `rico:CorporateBody`, `rico:Group`. Beschreibungs-Properties `rico:identifier`, `rico:title`, `rico:date`, `rico:hasExtent`, `rico:hasOrHadLanguage`, `rico:generalDescription`. Relationen `rico:hasOrHadLocation`, `rico:hasOrHadSubject`, `rico:isAssociatedWithEvent`.

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

`m3gim:SpatiotemporalEvent` bildet den Komposittyp `ort, datum` als Klasse ab. Dieser Typ ist der zentrale Träger der Mobilitätsinformation. Er hat 60 direkte Einträge im Datenbestand plus indirekte Belege in den einfacheren `ort`-Rollen.

`m3gim:DatedEvent` ist Fallback für künftige Datumsrollen, die nicht durch typisierte Properties abgedeckt sind. Primär wird die Property-Familie (siehe unten) verwendet.

### m3gim-Object-Properties

| Property | Domain → Range | Zweck |
|---|---|---|
| `m3gim:hasAssociatedAgent` | Record → Person/CorporateBody | Agenten-Verknüpfung (RiC-O kennt kein hasOrHadAgent) |
| `m3gim:hasPerformer` | Performance → Person | Person wirkt bei Aufführung mit |
| `m3gim:performanceOf` | Performance → MusicalWork | Aufführung eines Werks |
| `m3gim:hasStageRole` | Performance → StageRole | konkrete Bühnenrolle der Aufführung |
| `m3gim:belongsToWork` | StageRole → MusicalWork | Bühnenrolle gehört zu Werk |
| `m3gim:atPlace` | SpatiotemporalEvent → Place | Ortsreferenz |
| `m3gim:hasDetail` | Record/Performance → DetailAnnotation | Verweis auf Detailebene |
| `m3gim:attachedTo` | DetailAnnotation → Performance/Record | Rückreferenz |

### m3gim-Datatype-Properties

| Property | Typ | Zweck |
|---|---|---|
| `m3gim:bearbeitungsstand` | xsd:string | projektinterner Status |
| `m3gim:atDate` | xsd:string | Datum als Literal an SpatiotemporalEvent |
| `m3gim:voiceType` | xsd:string | Stimmfach an StageRole |
| `m3gim:monetaryAmount` | xsd:decimal | Geldbetrag an DetailAnnotation |
| `m3gim:currency` | xsd:string | Währungscode an DetailAnnotation |

### Typisierte Datumsproperty-Familie

Statt einer generischen `m3gim:eventDate` trägt das Modell für die empirisch belegten Datumsrollen je eine typisierte Property. Damit bleibt die semantische Differenzierung zwischen Absendedatum, Erscheinungsdatum, Premierendatum etc. in Queries direkt adressierbar.

`m3gim:absendedatum`, `m3gim:empfangsdatum`, `m3gim:ausstellungsdatum`, `m3gim:erscheinungsdatum`, `m3gim:abreisedatum`, `m3gim:auftrittsdatum`, `m3gim:auffuehrungsdatum`, `m3gim:probendatum`, `m3gim:probenbeginn`, `m3gim:premieredatum`, `m3gim:ausstrahlungsdatum`, `m3gim:spielzeitVon`, `m3gim:spielzeitBis`, `m3gim:ueberweisungsdatum`.

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
| `agrelon:HasIsPatron` | Förderverhältnisse |
| `agrelon:HasIsMember` | Ensemblemitgliedschaft |

**Direkte Properties**

`agrelon:hasEmployer`, `agrelon:hasEmployee`, `agrelon:hasCorrespondent`, `agrelon:hasProfessionalContact`, `agrelon:hasColleague`, `agrelon:hasTeacher`, `agrelon:hasStudent`, `agrelon:isPatronOf`, `agrelon:hasPatron`, `agrelon:isMemberOf`, `agrelon:hasMember`.

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
    agrelon:hasValidityPeriod [
        agrelon:hasBeginDate "1956" ;
        agrelon:hasEndDate "1971"
    ] ;
    agrelon:hasProvenance <https://m3gim.dhcraft.org/record/UAKUG/NIM_004/24> ;
    agrelon:metadataConfidence "0.9"^^xsd:decimal .
```

### Abgrenzung

AgRelOn modelliert *nicht*: Orte, Werke, Bühnenrollen, Aufführungen, Dokumenttypen, raumzeitliche Ereignisse, Datumstypologien jenseits der Relationsgültigkeit, finanzielle Details. Für diese Bereiche bleibt das m3gim-Modell zuständig.

## 9. Meta-Statement-Modell

### Prinzip

Jede Aussage im Modell kann mit drei Meta-Angaben versehen werden: Gültigkeitsperiode, Konfidenzwert, Provenienz. Das Muster stammt aus AgRelOn und wird auf alle M³GIM-Relationen übertragen, nicht nur auf Agent-Agent-Relationen. Damit entsteht eine einheitliche Querschnittsebene über den drei fachlichen Schichten.

### Properties

| Property | Wertebereich | Zweck |
|---|---|---|
| `agrelon:hasValidityPeriod` | Blank Node mit Begin/End | Zeitraum, in dem die Aussage gilt |
| `agrelon:hasBeginDate` | xsd:string (ISO-8601 oder TimeSpan) | Beginn der Gültigkeit |
| `agrelon:hasEndDate` | xsd:string | Ende der Gültigkeit |
| `agrelon:hasConfidenceValue` | xsd:decimal [0..1] oder xsd:string (Stufenwert) | Konfidenzwert |
| `agrelon:hasProvenance` | URI auf Archivrecord oder Literal | Quelle der Aussage |

### Migration der bestehenden Meta-Properties

Die bisherige Property `m3gim:dateEvidence` geht in `agrelon:hasProvenance` auf. Die vier Evidenzwerte (`aus_dokument`, `erschlossen`, `extern`, `unbekannt`) werden in eine kombinierte Serialisierung übertragen: der Archivrecord als `hasProvenance`-URI, der Evidenzwert als qualifizierender Konfidenzwert.

| dateEvidence (alt) | hasConfidenceValue (neu) |
|---|---|
| aus_dokument | 1.0 |
| erschlossen | 0.6 |
| extern | 0.8 |
| unbekannt | 0.0 |

Der Bearbeitungsstand `m3gim:bearbeitungsstand` bleibt als datensatzinterner Projektstatus erhalten und ist nicht Teil der Meta-Statement-Schicht.

### XLSX-Quellreferenz (`m3gim:xlsxSource`)

Ergänzend zur semantischen Provenance (`agrelon:hasProvenance` + `agrelon:hasConfidenceValue`) trägt jede aus dem Excel abgeleitete Entität eine **technische Quellreferenz** auf die Ursprungszelle. Sie ist keine wissenschaftliche Quellenangabe, sondern eine Rückverfolgbarkeits-Kette für Pipeline und Review.

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

Die Kontrakttests in `tests/test_20_xlsx_provenance.py` halten 100 %-Coverage als Soft-Invariante und pflegen drei Anker-Records (NIM_007 5_1, NIM_004 3, NIM_003 1_8) mit exakten Zeilenerwartungen als Fixtures.

### Anwendung in Reifikation

Für nicht-agentische Relationen, bei denen das n-ary-Reifikationsmuster nicht aus AgRelOn stammt, wird RDF-Reifikation oder das Muster `m3gim:Statement` (als Leichtgewichtsvariante) verwendet. Beispiel:

```turtle
:stmt_001 a m3gim:Statement ;
    rdf:subject :performance_bayreuth_1951_walkuere ;
    rdf:predicate m3gim:hasPerformer ;
    rdf:object :malaniuk ;
    agrelon:hasProvenance <https://m3gim.dhcraft.org/record/UAKUG/NIM_007/3> ;
    agrelon:hasConfidenceValue "1.0"^^xsd:decimal .
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
`agrelon:HasCorrespondent` mit `agrelon:hasProvenance` auf Briefe. Ergänzt durch Ortsrollen `absendeort`, `zielort`, `abreiseort` und Datumsrollen `absendedatum`, `empfangsdatum`, `abreisedatum`.

**Biographische Mobilität.** Wohn- und Lebensorte.
Ortsrolle `wohnort` an Malaniuk mit TimeSpan via `agrelon:hasValidityPeriod`.

**Diskursive Mobilität.** Wo wurde über sie berichtet?
`rico:Record` mit Dokumenttyp ∈ {rezension, presse, kritik} + `entstehungsort` oder Herausgeberinstitution mit Ortsreferenz. Der diskursive Raum weicht typischerweise vom performativen ab.

### Die zentrale Klasse: m3gim:SpatiotemporalEvent

```turtle
:spe_bayreuth_1951_gastspiel a m3gim:SpatiotemporalEvent ;
    m3gim:eventRole "gastspiel" ;
    m3gim:atPlace :bayreuth ;
    m3gim:atDate "1951/1953" ;
    rico:isAssociatedWithRecord <UAKUG/NIM_004/24> ;
    agrelon:hasProvenance <UAKUG/NIM_004/24> ;
    agrelon:hasConfidenceValue "1.0"^^xsd:decimal .
```

### Abdeckungsabhängigkeit

Jede Mobilitätsauswertung muss die derzeitige Abdeckungsquote mitführen: nur sechs Signaturen sind fein erschlossen, 22 Prozent der Objekte haben Datumsangaben, 25 Prozent Titel. Mobilitätskarten sind deshalb als *Zwischenstand der Erschließung* zu kommunizieren, nicht als Rekonstruktion der Biographie. Dieser Survivorship Bias muss bei Visualisierungen textlich gekennzeichnet sein.

## 11. Finanzschicht

### Klasse und Properties

`m3gim:DetailAnnotation` ist die Trägerklasse für Schicht 3. Sie wird erweitert um Finanzattribute.

| Property | Typ | Zweck |
|---|---|---|
| `m3gim:monetaryAmount` | xsd:decimal | Geldbetrag |
| `m3gim:currency` | xsd:string | Währungscode |
| `m3gim:detailRole` | xsd:string (SKOS) | Art des Finanzpostens |
| `m3gim:attachedTo` | Object Property | Referenz auf Aufführung, Vertrag, Reise oder Record |

Das Rollenvokabular für `detailRole` bleibt offen erweiterbar. Belegte Werte: abendgage, provision, dépôt, transfer, erwähnt.

### Währungscodes

Wo möglich ISO-4217 (DEM, CHF, ATS, FRF, ESC, USD). Historische Währungen behalten ihren Freitextcode (RM für Reichsmark, S für Schilling) mit Klartext-Auflösung im Kommentarfeld.

Belegt im aktuellen Datenbestand: RM (Reichsmark), DM (Deutsche Mark), ATS/S (Österreichischer Schilling), CHF, FRF (Fr), ESC (portugiesischer Escudo), USD.

### Anbindung

Finanzeinträge haften primär an `m3gim:Performance` (z.B. Abendgage für eine konkrete *Walküre*-Aufführung), sekundär an Verträgen (Vertragssumme) oder Reisen (Reisekosten, Provisionen).

### Serialisierungsbeispiel

```turtle
:gage_lissabon_meistersinger a m3gim:DetailAnnotation ;
    m3gim:detailRole "abendgage" ;
    m3gim:monetaryAmount "4000"^^xsd:decimal ;
    m3gim:currency "ESC" ;
    m3gim:attachedTo :performance_lissabon_meistersinger ;
    agrelon:hasProvenance <UAKUG/NIM_007/4> .
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
│   └── telegramm
├── presse
│   ├── zeitungsausschnitt
│   ├── kritik
│   └── rezension
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
│   └── lebenslauf
├── identitaetsdokument
│   └── ausweis
├── tagebuch
├── tontraeger
└── sonstiges
```

32 Werte, erweitert gegenüber der Vorfassung um: korrespondenz, presse, programm, autobiografie, identitaetsdokument, repertoireliste, biographisch. Die Abgrenzung sammlung/konvolut ist als offene Frage markiert (Abschnitt 17).

## 13. partitur.json-Schema

Manuell kuratierte Datenquelle für die Mobilitäts-Ansicht. Von `build-views.py` aus dem erweiterten Modell erzeugt, von `mobilitaet.js` konsumiert.

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
- Komposit-Typen dekomponiert (`ort, datum` → `SpatiotemporalEvent`; `ausgaben, währung` → `DetailAnnotation`)
- Header-Shift-Abfederung in Organisations-, Orts- und Werkindex
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

`rico`, `m3gim`, `m3gim-dft`, `m3gim-role`, `agrelon`, `wd`, `skos`, `xsd`.

### Aliase

- `name` → `rico:name`
- `role` → `m3gim:role`
- `komponist` → `m3gim:komponist`
- `ort` → `m3gim:atPlace`
- `datum` → `m3gim:atDate`
- `provenance` → `agrelon:hasProvenance`
- `beginDate` → `agrelon:hasBeginDate`
- `endDate` → `agrelon:hasEndDate`

### Technische Provenance-Properties

`m3gim:xlsxSource`, `m3gim:xlsxSheet`, `m3gim:xlsxRow`, `m3gim:datenpunktId` — siehe § 9 („XLSX-Quellreferenz"). Werden von der Pipeline gesetzt, nicht im Google-Sheet erfasst.

## 17. Offene Fragen und Klärungsbedarf

Punkte, die im Zuge dieser Modellrevision sichtbar wurden und vor der nächsten Erschließungsetappe geklärt werden sollten.

**Abgrenzung sammlung vs. konvolut.** Der Dokumenttyp `sammlung` erscheint überlappend mit `konvolut`. Möglicherweise ist `sammlung` ein aggregierender Erfassungsartefakt. Zu prüfen: lässt sich `sammlung` in `konvolut` aufgehen, oder gibt es einen semantischen Unterschied (z.B. `konvolut` = physischer Umschlag, `sammlung` = thematische Zusammenstellung)?

**Status der Rolle `protagonist`.** Zwei Belege im Typ `person`. Vermutlich Erfassungsfehler, weil *protagonist* eine Bühnenrolle ist und in den Typ `rolle` gehört. Zu prüfen und ggf. umzuklassifizieren.

**Rollenindex für Bühnenrollen.** `m3gim:StageRole` benötigt eine eigene Indextabelle analog zu Werk-, Orts-, Personen- und Organisationsindex. Derzeit sind Bühnenrollen nur in der Verknüpfungstabelle als Strings erfasst. Eine saubere Referenzierung setzt einen eigenen Rollenindex voraus (mindestens Spalten `m3gim_id`, `name`, `belongsToWork`, `voiceType`, `wikidata_id`).

**GND-IDs für Kernpersonen.** Malaniuk selbst sowie Karajan, Furtwängler, Knappertsbusch, Solti, Walter, Keilberth und weitere Hauptkontakte sollten mit GND-IDs angereichert werden. Die AgRelOn-Integration entfaltet ihren Linked-Open-Data-Mehrwert erst mit GND-Anschluss.

**Wikidata-IDs durchgängig.** Personen-, Organisations-, Orts- und Werkindex haben Wikidata-Spalten, aber keine gepflegten Werte. Die Anreicherung lässt sich teilweise automatisieren (Orte, Komponist:innen, Hauptinstitutionen).

**Normalisierung der Ortsdubletten.** `Zürich`/`Zürich, Zürichbergstrasse 104`, `Stuttgart`/`Stuttgart `, Freitextmischungen wie `Wien, ab 1956` sind im Ortsindex vor der nächsten Erschließungsrunde zu bereinigen.

**Nachzuordnung unverknüpfter Einträge.** Ein substanzieller Anteil der Verknüpfungstabelle hat keine Archivsignatur. Nachzuordnen oder als inkonsistente Daten aus der Pipeline auszuschließen — aktuelle Anzahl im Quality-Snapshot.

**Validierung der AgRelOn-Inferenzen.** Ko-Präsenz bei Aufführungen wird nicht automatisch zu `agrelon:hasColleague`. Die Inferenzregeln sind in der Pipeline explizit zu dokumentieren und zu parametrisieren (z.B. Schwellenwert Mindestanzahl gemeinsamer Aufführungen, Zeitnähe).