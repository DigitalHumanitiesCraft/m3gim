---
title: "Domänenmodell"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: draft
language: de
version: 0.4
created: 2026-07-24
updated: 2026-08-21
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Datengrundlage
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/data
topics: ["[[RiC-O]]", "[[AgRelOn]]", "[[Controlled Vocabularies]]", "[[Data Modelling]]"]
knowledge-sources:
  vocabulary: ../vocab/m3gim.ttl
  standards:
    RiC-O: https://www.ica.org/en/records-context-ontology
    AgRelOn: https://d-nb.info/standards/elementset/agrelon
    SKOS: http://www.w3.org/2004/02/skos/core
related: [data, pipeline-architecture, architecture-decisions, vocabulary-derivation-findings]
---

# Domänenmodell

Dieses Dokument beschreibt, was die Daten des Projekts aussagen und wie sie zu lesen sind. Es ist aus der Vokabulardatei [`vocab/m3gim.ttl`](../vocab/m3gim.ttl) abgeleitet und um das Projektwissen ergänzt, das ein formales Vokabular nicht trägt. Adressiert ist, wer mit dem Datensatz arbeitet, ohne die Pipeline zu kennen, also auch ein Agent, der Abfragen formuliert oder Aussagen interpretiert.

Die Spezifikation des Modells bleibt [data.md](data.md). Wo dieses Dokument und data.md auseinandergehen, gilt data.md, und die Abweichung gehört gemeldet. Der Bericht über die Ableitung dieses Dokuments aus dem Vokabular steht in [vocabulary-derivation-findings.md](vocabulary-derivation-findings.md).

## 1. Gegenstand

Beschrieben ist ein Teilnachlass einer Opernsängerin des 20. Jahrhunderts an einem österreichischen Universitätsarchiv. Der Bestand gliedert sich in einen Hauptbestand aus Briefen, Verträgen, Presseartikeln, Programmen und Fotografien sowie in Plakate und Tonträger. Ein Teil der Konvolute ist bis auf die Folioebene erschlossen, der Rest bleibt auf der Ebene der Archiveinheit.

Die leitende Frage ist Mobilität, also wo die Nachlassbildnerin wann auftrat, wo sie engagiert war, wohin sie reiste, mit wem sie korrespondierte und wo über sie berichtet wurde. Das Modell bildet diese Frage über Abfragesichten auf raumzeitliche Ereignisse, Aufführungen, Rollen und Beziehungen ab. Eigene Klassen für die Sichten gibt es nicht.

Jede Auswertung führt den Erschließungsstand mit. Die Daten belegen den Stand der Erschließung. Ein Ereignis ohne Beleg im erschlossenen Teil des Bestands erscheint im Datensatz nicht, hat aber stattgefunden. Eine Mobilitätskarte zeigt deshalb einen Zwischenstand.

## 2. Namespaces

| Prefix | Zweck |
|---|---|
| `rico` | Archivisches Kernmodell, Records in Contexts Ontology 1.1 |
| `ric-rst` | RiC-O-Vokabular der RecordSet-Typen, verwendet für Fonds und File |
| `m3gim` | Projekteigene Klassen, Properties und Instanzen |
| `m3gim-dft` | Kontrolliertes Vokabular der Dokumenttypen |
| `m3gim-role` | Kontrolliertes Vokabular der Relationsrollen |
| `agrelon` | Beziehungen zwischen Akteuren und das Muster für Meta-Aussagen |
| `schema` | Lebensdaten von Personen |
| `gndo` | Berufsangabe als Literal |
| `wd` | Wikidata-Entitäten als Identifikatoren |
| `geo` | Koordinaten nach WGS84 |
| `skos` | Organisation der kontrollierten Vokabulare |

Instanzen und Ontologie teilen sich den Namespace `m3gim`. Eine Aufführung mit der Kennung `m3gim:perf_NIM_004_2_1` steht damit im selben Raum wie die Property `m3gim:hasPerformance`. Die Trennung ist als offene Modellentscheidung geführt.

## 3. Klassen

Der archivische Kern kommt aus RiC-O. Ein Konvolut ist ein `rico:RecordSet` mit einem Typ aus `ric-rst`, ein Einzelstück ein `rico:Record`. Akteure sind `rico:Person`, `rico:CorporateBody` und `rico:Group`, Orte sind `rico:Place`.

Die Projekterweiterung fügt sieben Klassen hinzu.

| Klasse | Oberklasse | Bedeutung |
|---|---|---|
| `m3gim:MusicalWork` | `rico:Thing` | Musikalisches Werk, über den Werkindex identifiziert |
| `m3gim:Performance` | `rico:Event` | Ereignis, in dem ein Werk realisiert wird |
| `m3gim:PerformanceEvent` | `rico:Event` | Rahmenveranstaltung wie Festspiele, Reihe oder Spielzeit |
| `m3gim:SpatiotemporalEvent` | `rico:Event` | Verortetes und wahlweise datiertes Ereignis, Träger der Mobilität |
| `m3gim:DatedEvent` | `rico:Event` | Auffangklasse für Datierungen ohne typisierte Property |
| `m3gim:StageRole` | `rico:Thing` | Partie eines Werks als eigenständige Entität |
| `m3gim:DetailAnnotation` | keine | Finanzielle oder vertragliche Einzelangabe |

Die Kanten zwischen ihnen:

```
rico:RecordSet ──rico:hasOrHadPart──▶ rico:Record
     │                                     │
     │ m3gim:hasAssociatedAgent            │ rico:hasOrHadLocation ──▶ rico:Place
     │ m3gim:agentRelation                 │ rico:hasOrHadSubject  ──▶ Person, Werk, Rahmenveranstaltung
     ▼                                     │ rico:hasDocumentaryFormType ──▶ m3gim-dft:*
rico:Person, rico:CorporateBody,           │
rico:Group                                 ├─ m3gim:hasSpatiotemporalEvent ──▶ m3gim:SpatiotemporalEvent
                                           │        ├─ m3gim:atPlace ──▶ rico:Place
                                           │        ├─ m3gim:atDate  (Literal)
                                           │        └─ m3gim:eventRole (Literal)
                                           │
                                           ├─ m3gim:hasPerformance ──▶ m3gim:Performance
                                           │        ├─ m3gim:performanceOf ──▶ m3gim:MusicalWork
                                           │        ├─ m3gim:hasStageRole  ──▶ m3gim:StageRole
                                           │        └─ m3gim:hasPerformer  ──▶ rico:Person
                                           │
                                           ├─ m3gim:hasDatedEvent ──▶ m3gim:DatedEvent
                                           └─ m3gim:hasDetail     ──▶ m3gim:DetailAnnotation
```

Drei Anschlüsse an RiC-O tragen über die Klassenhierarchie hinaus. `m3gim:hasPerformance`, `m3gim:hasSpatiotemporalEvent` und `m3gim:hasDatedEvent` sind Spezialisierungen von `rico:isAssociatedWithEvent`, `m3gim:atPlace` von `rico:hasOrHadLocation`, `m3gim:hasPerformer` von `rico:hasOrHadParticipant`. Die Datumsfamilie spezialisiert `rico:date`, der Probenbeginn und der Spielzeitbeginn zusätzlich `rico:beginningDate`, das Erstelldatum `rico:creationDate`. Wer nur die RiC-O-Ebene abfragt, erhält damit die projekteigenen Aussagen mit.

## 4. Der Graph ist dokumentzentriert

Als eigenständige Knoten mit eigener Kennung stehen im Datensatz nur Dokumente, Archiveinheiten, Aufführungen, Bühnenrollen, raumzeitliche Ereignisse und die Concepts der Vokabulare. Personen, Institutionen, Orte und Werke stehen eingebettet in dem Dokument, das sie nennt. Ist eine Entität gegen Wikidata abgeglichen, trägt der eingebettete Knoten deren Kennung, sonst nur einen Namen.

Drei Folgen für die Arbeit mit den Daten:

- Eine Frage nach allen Dokumenten zu einer Person beantwortet sich über den Namen oder die Wikidata-Kennung im eingebetteten Knoten. Einen Personenknoten gibt es nicht.
- Alle Angaben, die nur im Kontext eines Dokuments gelten, hängen am eingebetteten Knoten. Das betrifft die Rolle, die Quellzellenadresse und das Datenqualitäts-Flag.
- Beim Zusammenführen zu RDF fällt der Dokumentkontext weg, und die kontextabhängigen Angaben wandern an die global identifizierte Entität. Eine Stadt trägt dann alle Ortsrollen aller Dokumente gleichzeitig. Der JSON-Baum hält den Kontext, das flache Tripel nicht.

## 5. Rollen

Die Erfassung führt eine einzige Rollenspalte. Die Pipeline verteilt deren Werte je nach Verknüpfungstyp auf vier Properties.

| Property | Trägerin | Bedeutung |
|---|---|---|
| `m3gim:role` | eingebetteter Entitätsknoten | Rolle der Entität im Dokument |
| `m3gim:eventRole` | `m3gim:SpatiotemporalEvent` | Rolle des raumzeitlichen Ereignisses |
| `m3gim:dateRole` | `m3gim:DatedEvent` | Typisierung einer Datierung ohne eigene Property |
| `m3gim:detailRole` | `m3gim:DetailAnnotation` | Art eines Finanzpostens |

Deshalb bilden die vier Properties ein gemeinsames Vokabular. `m3gim-role` ist in Sammlungen nach dem Ziel gegliedert, an dem eine Rolle steht, also Rollen an Personen, an Institutionen, an Ensembles, an Orten, an Werken, an Rahmenveranstaltungen sowie Datums- und Finanzrollen. Eine Rolle kann in mehreren Sammlungen stehen; `erwähnt` steht in allen.

Alle Werte sind nach der Normalisierung geschlechtsneutral, weil die Endungen `:in` und `:innen` entfernt werden. Die Werte stehen als Literale. Verweise auf die Concepts kommen im Datensatz nicht vor.

Fünf Ortsrollen sind Mobilitätsrollen: `zielort`, `absendeort`, `abreiseort`, `empfangsort` und `vertragsort`. Sie erzeugen neben der Ortsreferenz ein raumzeitliches Ereignis ohne Datum. Das Fehlen des Datums ist selbst die Aussage. `wohnort` gehört ausdrücklich nicht dazu, weil ein Wohnort ein Zustand mit Gültigkeitszeitraum ist und kein Punktereignis.

Ein Wert der Rollenspalte ist keine Rolle. `nicht eingehalten` markiert einen unerfüllten Vertrag und wird in der Quelle über einen ganzen Vertragsblock durchgereicht. Beim Bau der raumzeitlichen Ereignisse wird er herausgefiltert, an anderen Stellen läuft er als Rollenwert mit. Das Zielfeld wäre ein Vertragsstatus am Vertragsdokument.

## 6. Datierungen

Eine Datierung wird nach ihrer Notation auf eine von drei Repräsentationen geführt.

1. Ein ISO-Datum mit bekannter Rolle geht in eine typisierte Property, etwa `m3gim:absendedatum` oder `m3gim:auffuehrungsdatum`.
2. Ein Datum im Komposit mit einem Ort geht als `m3gim:atDate` an das raumzeitliche Ereignis.
3. Alles Übrige geht in ein `m3gim:DatedEvent` mit `m3gim:dateValue` und `m3gim:dateRole`, damit keine Angabe verloren geht.

Alle Datumswerte sind Zeichenketten. Historische Datierung überschreitet die Strenge von `xsd:date` regelmäßig, durch Zeitspannen in der Form `1952/1953`, durch unvollständige Angaben und durch die Qualifier `circa:`, `vor:` und `nach:`. Wer nach Zeit filtert, parst diese Formen selbst.

Die typisierten Properties sind `absendedatum`, `empfangsdatum`, `ausstellungsdatum`, `erscheinungsdatum`, `abreisedatum`, `auftrittsdatum`, `auffuehrungsdatum`, `probendatum`, `probenbeginn`, `premieredatum`, `ausstrahlungsdatum`, `spielzeitVon`, `spielzeitBis`, `ueberweisungsdatum`, `erstelldatum` und `gespraechsdatum`. Sie hängen am Dokument, `auffuehrungsdatum` zusätzlich an der Aufführung.

## 7. Finanzschicht

Eine `m3gim:DetailAnnotation` trägt einen Finanzposten. `m3gim:detailField` benennt die Art des Postens mit `ausgaben`, `einnahmen` oder `summe`, `m3gim:detailRole` die Art der Zahlung, `m3gim:detailValue` den unveränderten Zellwert, `m3gim:monetaryAmount` den geparsten Betrag und `m3gim:currency` die Währung.

Der Rohwert bleibt erhalten, damit die Parsung nachprüfbar ist. Ein Doppelbetrag in einer Zelle wird in zwei Detailangaben aufgelöst. Währungen stehen als ISO-Code, wo die Quelle eindeutig ist, sonst in der Schreibung der Quelle. Eine spekulative Normalisierung historischer Währungen findet nicht statt.

An zwei Fundstellen setzt die Pipeline eine fehlende Währung aus dem Kontext der Nachbarfolien. Dieser abgeleitete Charakter ist im Datum nicht markiert.

## 8. Kontrollierte Vokabulare

**Dokumenttypen.** `m3gim-dft` ist hierarchisch und erlaubt granulare wie aggregierte Abfragen, also Brief ebenso wie Korrespondenz. Die Zwischenebenen sind Korrespondenz, Presse, Programm, Biographisch und Identitätsdokument. Jedes Concept trägt ein deutsches Label, über das die Anzeige aufgelöst wird. Das Verhältnis von Sammlung und Konvolut ist bewusst offen und nicht durch eine Hierarchiekante vorentschieden.

**Rollen.** Siehe Abschnitt 5.

**Datenqualität.** `m3gim:dataQualityFlag` trägt ein Signal aus der Anmerkungsspalte, mit den Werten `name-nicht-eindeutig`, `vorname-fehlt`, `rolle-unsicher`, `quelle-tippfehler` und `datierung-malformed`. Das Flag ist das Unsicherheitssignal. Ein Zahlenwert für die Konfidenz wird nicht gesetzt, weil die Freitexte der Quelle keinen hergeben.

**Bearbeitungsstand.** `m3gim:bearbeitungsstand` führt den projektinternen Erschließungsstand mit `begonnen`, `abgeschlossen` und `zurueckgestellt`. Die Erfassungshandreichung kennt ein zweites System, das den Schichtfortschritt abbildet. Welches gilt, ist offen.

## 9. Provenienz

Das Modell führt zwei Provenienzspuren getrennt.

Die semantische Spur ist `agrelon:metadataProvenance`. Sie steht an den Akteursbeziehungen und an den raumzeitlichen Ereignissen und verweist auf das Dokument, das die Aussage belegt. Da beide am belegenden Dokument hängen, ist der Verweis derzeit ein Selbstbezug.

Die technische Spur ist `m3gim:xlsxSource` mit `m3gim:xlsxSheet` und `m3gim:xlsxRow`. Sie adressiert die Ursprungszeile in der Erfassungstabelle und dient Pipeline und Review. Als wissenschaftliche Quellenangabe taugt sie nicht. Sie steht an Dokumenten, Detailangaben, Beziehungen, raumzeitlichen Ereignissen und an den eingebetteten Entitätsknoten. Einzelne Beschreibungsfelder eines Dokuments tragen keine eigene Quellangabe, weil sie die des Dokuments erben.

Keine Aussage trägt einen Konfidenzwert. Die früher aus der Datierungsevidenz projizierte Dezimalkonfidenz wurde entfernt, weil sie kein gemessener Wert war. Käme die Evidenz zurück, dann als kategorialer Wert.

Ein dritter Strang ist die Anreicherung. Entitäten werden gegen Wikidata abgeglichen; ein Treffer bringt die Kennung, `owl:sameAs`, Koordinaten, Lebensdaten, Beruf, Stimmfach, Gattung und Gründungsdatum mit. Davon getrennt stehen die kuratierten Indexfelder `m3gim:sitz`, `m3gim:keyContact`, `m3gim:partie`, `m3gim:lifespan` und `m3gim:editorialNote`, die aus den Indextabellen des Erschließungsteams stammen und auch Entitäten ohne Wikidata-Treffer erreichen. Kuratierte und angereicherte Angabe können am selben Knoten stehen und abweichen; ein Abgleich findet nicht statt. Bei Widerspruch hat die kuratierte Angabe Vorrang.

## 10. Grenzen

- Eine Aufführung zerfällt im Datensatz in mehrere Knoten, weil je Verknüpfungszeile einer entsteht. Wer sang welche Partie in welcher Aufführung, ist daraus nicht rekonstruierbar. Das Zielmodell mit Vorkommnis und Beteiligung ist entschieden und noch nicht umgesetzt.
- Bühnenrollen sind global und tragen weder Werkbindung noch Stimmfach. Gleichnamige Partien verschiedener Werke fallen zusammen.
- Dieselbe Partie steht zweimal im Modell, als Literal am Werk und als eigene Entität, ohne Verbindung.
- Die Rollen sind Literale, obwohl ein Vokabular mit Kennungen deklariert ist.
- Die Mobilitätssichten sind Abfragemuster, keine Klassen. Welcher Rollenwert zu welcher Sicht gehört, ist für einen Teil der Werte noch mit dem Erschließungsteam abzustimmen.

Die vollständige Liste der offenen Punkte steht als redaktionelle Anmerkung an den betroffenen Termen in [`vocab/m3gim.ttl`](../vocab/m3gim.ttl) und zusammengefasst in [vocabulary-derivation-findings.md](vocabulary-derivation-findings.md).

## 11. Herkunft dieses Dokuments

Klassen, Properties, Domain- und Range-Angaben, Vokabularwerte, Hierarchien und die Anschlüsse an RiC-O stammen aus der Vokabulardatei. Der Gegenstand, die Fragestellung, die Erschließungslage, die Lesehinweise für Abfragen und die Einordnung der offenen Punkte stammen aus den übrigen Dokumenten der Wissensbasis und aus der Beobachtung des Datensatzes. Welcher Teil woher kommt, protokolliert [vocabulary-derivation-findings.md](vocabulary-derivation-findings.md).

## 12. Related

- [data.md](data.md) — Spezifikation des Modells, maßgeblich bei Abweichung
- [pipeline-architecture.md](pipeline-architecture.md) — wie der Datensatz erzeugt wird
- [architecture-decisions.md](architecture-decisions.md) — Begründung der Modellentscheidungen und Leitplanken
- [vocabulary-derivation-findings.md](vocabulary-derivation-findings.md) — Befund zur Ableitbarkeit
- [`vocab/m3gim.ttl`](../vocab/m3gim.ttl) — formale Fassung des Vokabulars
