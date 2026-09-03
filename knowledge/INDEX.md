---
title: M³GIM Knowledge Base
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Index
  version: 0.4
  url: https://dhcraft.org/Promptotyping/promptotyping-document/index
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-index
status: complete
created: 2026-02-19
updated: 2026-09-03
language: de
version: 0.5
authors: [Christopher Pollin]
generated-with: Claude Code
related: [specification, data, data-model, research-framework, architecture, design, journal, testing, handoff]
---

# M³GIM Knowledge Base

Diese Seite ist der Einstiegspunkt in die Wissensbasis des Projekts. Sie ordnet die Dokumente nach ihrer Promptotyping-Funktion, benennt die Ablagezonen des Repositorys, gibt Lesepfade und erklärt die konstitutiven Begriffe. Die Wissensbasis ist die Source of Truth, der Code ist nachgeordnetes Artefakt. Laufende Zahlen stehen im generierten Quality-Snapshot unter [`data/reports/quality-snapshot.md`](../data/reports/quality-snapshot.md).

## Dokumente

| Pfad | Funktion | Routing Question | Aktualisierung |
|---|---|---|---|
| [INDEX.md](INDEX.md) | Navigation | Was liegt hier, wie lese ich, welche Begriffe sind konstitutiv? | bei jeder Änderung des Ordnerinhalts |
| [specification.md](specification.md) | Charter und Specification | Was ist das Projekt, was soll die Anwendung leisten, und wo steht die Arbeit? | bei Änderung von Identität, Anforderungen, Funktionsumfang oder Arbeitsstand |
| [data.md](data.md) | Material und Modell-Spezifikation | Woraus besteht das Quellmaterial, wie ist es erfasst, was ist daran fehlerhaft? | bei neuem Datenexport oder geänderter Erfassung |
| [data-model.md](data-model.md) | Domain Knowledge | Wie ist das Material formal modelliert, und wie wird nach den Soll-Konventionen erfasst? | bei Änderung an [`vocab/m3gim.ttl`](../vocab/m3gim.ttl), am Modell oder an der Erfassungskonvention |
| [research-framework.md](research-framework.md) | Domain Knowledge | Welche Theorie, Forschungsfragen und Anwendungsfälle tragen das Projekt? | bei Schärfung der Forschungsfragen, Personas oder Use Cases |
| [architecture.md](architecture.md) | Architecture | Wie läuft die Datenpipeline, und wie ist die statische SPA gebaut? | bei Änderung an `scripts/`, `docs/js/` oder am Datenfluss |
| [design.md](design.md) | Design | Wie sieht die Anwendung aus, und wie verhält sie sich? | bei Änderung von Designhaltung oder Designsystem |
| [testing.md](testing.md) | Quality Assurance | Was wird garantiert, und wie wird es geprüft? | bei Änderung der Testsuite oder des TDD-Workflows |
| [handoff.md](handoff.md) | Handoff | Welche geprüften Übergabepunkte warten auf Integration oder Verwerfung? | bei Eingang oder Verarbeitung eines Punkts |
| [journal.md](journal.md) | Provenance | Wie sind wir hierhin gekommen, und warum wurde so entschieden? | nach sachlich zusammengehörigen Übergängen und bei jeder Entscheidung (Entscheidungsregister) |

Die Datenbefunde leben operativ unter `data/reports/`, die quellseitig behebbaren Fehler in der Partner-Übergabeliste [`source-errors-handover-2026-09-01.md`](../data/reports/source-errors-handover-2026-09-01.md), der Wikidata-Abgleich im [`reconciliation-register.md`](../data/reports/reconciliation-register.md).

## Ablagezonen

- `knowledge/` trägt die dauerhaft gepflegten Promptotyping Documents einschließlich der Process Inbox [handoff.md](handoff.md).
- `data/google-spreadsheet/` trägt das übernommene Quellmaterial, die versionierten Exporte der archivischen Erfassung, die Verknüpfungstabelle und die Objekttabelle als CSV, die Indextabellen als XLSX.
- `data/reports/` trägt drei Klassen. Die Kurationsbelege der Normdaten-Zuordnung sind dauerhaft, weil `data/output/wikidata-reconciliation.json` sie zitiert. Die Befundregister (Partner-Übergabeliste, Reconciliation-Register) sind die operative Fehlerverwaltung. Der bei jedem Pipeline-Lauf erzeugte Quality-Snapshot ist die Stand-Kommunikation für Dritte; die übrigen erzeugten Reports sind nicht versioniert, ein Lauf stellt sie her.
- `data/output/` und `docs/data/` tragen die reproduzierbar erzeugten Artefakte der Pipeline.
- `vocab/` trägt das formale Projektvokabular als Turtle-Datei samt Abdeckungsprüfer; [data-model.md](data-model.md) beschreibt das Modell, das die Datei formalisiert.

## Lesepfade

- Sessionstart: [`../CLAUDE.md`](../CLAUDE.md) → [INDEX.md](INDEX.md) → [handoff.md](handoff.md) → [specification.md](specification.md) → aufgabenrelevantes Dokument.
- Datenmodell verstehen oder ändern: [data.md](data.md) → [data-model.md](data-model.md) → [journal.md](journal.md) § Entscheidungsregister. Erst das Quellmaterial, dann seine Formalisierung; die Modelländerung wird in [data.md](data.md) verankert, Vokabular, Pipeline, Tests und Frontend folgen.
- Mit dem erzeugten Datensatz arbeiten, ohne die Pipeline zu kennen: [data-model.md](data-model.md) → [`data/reports/reconciliation-register.md`](../data/reports/reconciliation-register.md).
- Pipeline ausführen oder debuggen: [`../CLAUDE.md`](../CLAUDE.md) § Kern-Commands → [architecture.md](architecture.md) § Pipeline → [testing.md](testing.md).
- Frontend anpassen: [architecture.md](architecture.md) § Frontend → [design.md](design.md).
- Daten erfassen: [data-model.md](data-model.md) § Erfassung → [data.md](data.md).
- Forschungsseitig einsteigen: [research-framework.md](research-framework.md) → [specification.md](specification.md).

## Konvention

Diese Wissensbasis folgt der Konvention für Promptotyping Documents, die Naming Contract, Frontmatter-Schema, Routing-Heuristik und Strukturprinzipien regelt. Einzelträger einer Funktion tragen den kanonischen Namen. Die Wissensbasis wurde am 2026-07-19 von achtzehn auf zwölf Dokumente konsolidiert und am 2026-09-01 weiter verdichtet, die Erfassungsrichtlinie ging in [data-model.md](data-model.md) auf, die beiden Architektur-Dokumente wurden zu [architecture.md](architecture.md), das Datenfehler-Register wanderte als operatives Registerpaar nach `data/reports/`, und das Entscheidungsregister wurde Teil von [journal.md](journal.md) (E-155). Dateinamen sind englisch, der Inhalt ist deutsch. Abschnitte tragen keine Nummern, ein Verweis nennt Dokument und Abschnittstitel (E-161).

Modelländerungen werden zuerst in [data.md](data.md) verankert (Leitplanke Spec-first, E-133). Erledigtes wandert aus dem volatilen Abschnitt von [specification.md](specification.md) nach [journal.md](journal.md), Quellseitiges in die Partner-Übergabeliste unter `data/reports/`. Forschungsnotizen und DSGVO-sensible Quellen werden im Obsidian-Vault gepflegt, das Repo trägt das destillierte Extrakt.

## Begriffe

- AgRelOn, Agent Relationship Ontology der Deutschen Nationalbibliothek für Agent-Agent-Beziehungen
- Datenspiegel, die Testschicht mit Marker `data_quality`, die Sauberkeit der Quelle behauptet und absichtlich rot bleibt, solange bekannte Quellfehler bestehen
- DFT, Documentary Form Type, die hierarchische Dokumenttypen-Taxonomie im Namespace `m3gim-dft`
- Konvolut, eine aggregierende Archiveinheit mit Kindern auf Folio-Ebene
- M³GIM, Mapping Mobile Musicians, der Projektname; im Namespace und in Dateinamen als `m3gim` geschrieben
- m3gim-Extension, die Projekterweiterung für Werke, Aufführungen, Bühnenrollen und Mobilität, formalisiert in [`vocab/m3gim.ttl`](../vocab/m3gim.ttl)
- Mobilitätssichten, fünf Abfrageperspektiven auf dieselben Daten, performativ, institutionell, Reise und Korrespondenz, biographisch, diskursiv
- Promptotyping, die Arbeitsweise des Projekts, in der die Dokumente die Source of Truth sind und der Code ein nachgeordnetes Artefakt
- Provenance, die semantische Quellenangabe je Aussage und die technische Rückverfolgbarkeit zur Ursprungszelle der Erfassung
- Quality-Snapshot, der bei jedem Pipeline-Lauf generierte Markdown-Bericht mit allen laufenden Zahlen
- Reconciliation und Enrichment, der Abgleich der Entitäten gegen Wikidata und die Anreicherung mit Normdaten
- RiC-O, Records in Contexts Ontology, das archivische Kernmodell in Version 1.1
- Schichtenmodell, die drei Erschließungsschichten Kernmetadaten, Verknüpfungen und Detailerschließung plus die Meta-Querschnittsebene
- SKOS, Simple Knowledge Organization System, die Organisationsform der kontrollierten Vokabulare
- SpatiotemporalEvent, kurz STE, die zentrale raumzeitliche Klasse, die den Mobilitätskern trägt
- UAKUG/NIM, die Signatur des Teilnachlasses Ira Malaniuk am Universitätsarchiv der Kunstuniversität Graz
