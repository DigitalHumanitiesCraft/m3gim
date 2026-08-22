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
updated: 2026-08-21
language: de
version: 0.4
authors: [Christopher Pollin]
generated-with: Claude Code
related: [specification, data, data-model, data-entry-guidelines, research-framework, pipeline-architecture, frontend-architecture, design, architecture-decisions, testing, data-errors, handoff, journal]
---

# M³GIM Knowledge Base

Diese Seite ist der Einstiegspunkt in die Wissensbasis des Projekts. Sie ordnet die Dokumente nach ihrer Promptotyping-Funktion, benennt die Ablagezonen des Repositorys, gibt Lesepfade und erklärt die konstitutiven Begriffe. Die Wissensbasis ist die Source of Truth, der Code ist nachgeordnetes Artefakt. Laufende Zahlen stehen im generierten Quality-Snapshot unter [`data/reports/quality-snapshot.md`](../data/reports/quality-snapshot.md).

## Dokumente

| Pfad | Funktion | Routing Question | Aktualisierung |
|---|---|---|---|
| [INDEX.md](INDEX.md) | Navigation | Was liegt hier, wie lese ich, welche Begriffe sind konstitutiv? | bei jeder Änderung des Ordnerinhalts |
| [specification.md](specification.md) | Charter und Specification | Was ist das Projekt, was soll die Anwendung leisten, und wo steht die Arbeit? | bei Änderung von Identität, Anforderungen, Funktionsumfang oder Arbeitsstand |
| [data.md](data.md) | Material | Woraus besteht das Quellmaterial, wie ist es erfasst, was ist daran fehlerhaft? | bei neuem Datenexport oder geänderter Erfassung |
| [data-model.md](data-model.md) | Domain Knowledge | Wie ist das Material formal modelliert, welche Klassen, Properties und Vokabulare trägt es? | bei Änderung an [`vocab/m3gim.ttl`](../vocab/m3gim.ttl) oder am Modell |
| [data-entry-guidelines.md](data-entry-guidelines.md) | Domain Knowledge | Wie wird nach den Soll-Konventionen erfasst? | bei Änderung der Erfassungskonvention |
| [research-framework.md](research-framework.md) | Domain Knowledge | Welche Theorie, Forschungsfragen und Anwendungsfälle tragen das Projekt? | bei Schärfung der Forschungsfragen, Personas oder Use Cases |
| [architecture-decisions.md](architecture-decisions.md) | Specification, ausgelagerte Entscheidungsschicht | Warum wurde etwas so entschieden, und was ist noch offen? | bei jeder getroffenen oder revidierten Entscheidung |
| [pipeline-architecture.md](pipeline-architecture.md) | Architecture | Wie läuft die Datenpipeline von der XLSX-Erfassung zum JSON-LD? | bei Änderung an `scripts/` oder am Datenfluss |
| [frontend-architecture.md](frontend-architecture.md) | Architecture | Wie ist die statische SPA gebaut, was hält der Store? | bei Änderung an `docs/js/` oder am Laufzeitmodell |
| [design.md](design.md) | Design | Wie sieht die Anwendung aus, und wie verhält sie sich? | bei Änderung von Designhaltung oder Designsystem |
| [testing.md](testing.md) | Quality Assurance | Was wird garantiert, und wie wird es geprüft? | bei Änderung der Testsuite oder des TDD-Workflows |
| [data-errors.md](data-errors.md) | Material, Fehlerregister | Welche Quell- und Abgleichfehler sind bekannt, wo liegen sie, wie ist ihr Status? | bei jedem neuen, weitergeleiteten oder behobenen Befund |
| [handoff.md](handoff.md) | Handoff | Welche geprüften Übergabepunkte warten auf Integration oder Verwerfung? | bei Eingang oder Verarbeitung eines Punkts |
| [journal.md](journal.md) | Provenance | Wie sind wir hierhin gekommen? | nach sachlich zusammengehörigen Übergängen |

## Ablagezonen

- `knowledge/` trägt die dauerhaft gepflegten Promptotyping Documents einschließlich der Process Inbox [handoff.md](handoff.md).
- `data/google-spreadsheet/` trägt das übernommene Quellmaterial, die versionierten XLSX-Exporte der archivischen Erfassung.
- `data/reports/` trägt zwei Klassen. Die Kurationsbelege der Normdaten-Zuordnung sind dauerhaft, weil `data/output/wikidata-reconciliation.json` sie je manuell freigegebener Kennung als Grundlage zitiert. Der bei jedem Pipeline-Lauf erzeugte Quality-Snapshot ist zugleich die Stand-Kommunikation für Dritte; die beiden übrigen erzeugten Reports sind nicht versioniert, weil ein Lauf sie aus den versionierten XLSX reproduziert.
- `data/output/` und `docs/data/` tragen die reproduzierbar erzeugten Artefakte der Pipeline.
- `vocab/` trägt das formale Projektvokabular als Turtle-Datei samt Abdeckungsprüfer; [data-model.md](data-model.md) beschreibt das Modell, das die Datei formalisiert.

## Lesepfade

- Sessionstart: [`../CLAUDE.md`](../CLAUDE.md) → [INDEX.md](INDEX.md) → [handoff.md](handoff.md) → [specification.md](specification.md) → aufgabenrelevantes Dokument. Der Action-Layer regelt das Verhalten, die Inbox das noch Offene, die Spezifikation den Rahmen.
- Datenmodell verstehen oder ändern: [data.md](data.md) → [data-model.md](data-model.md) → [architecture-decisions.md](architecture-decisions.md). Erst das Quellmaterial, dann seine Formalisierung; die Modelländerung wird in `data-model.md` verankert, Vokabular, Pipeline, Tests und Frontend folgen.
- Mit dem erzeugten Datensatz arbeiten, ohne die Pipeline zu kennen: [data-model.md](data-model.md) → [data-errors.md](data-errors.md). Erst die Gestalt des Graphen, dann die bekannten Fehlstellen.
- Pipeline ausführen oder debuggen: [`../CLAUDE.md`](../CLAUDE.md) § Kern-Commands → [pipeline-architecture.md](pipeline-architecture.md) → [testing.md](testing.md) → [data-errors.md](data-errors.md). Die Befehlsfolge eines vollständigen Laufs steht im Action-Layer, die Architektur und die bekannten Fallen im Wissensdokument.
- Frontend anpassen: [frontend-architecture.md](frontend-architecture.md) → [design.md](design.md) → [architecture-decisions.md](architecture-decisions.md).
- Daten erfassen: [data-entry-guidelines.md](data-entry-guidelines.md) → [data.md](data.md).
- Forschungsseitig einsteigen: [research-framework.md](research-framework.md) → [specification.md](specification.md).

## Konvention

Diese Wissensbasis folgt der Konvention für Promptotyping Documents, die Naming Contract, Frontmatter-Schema, Routing-Heuristik und Strukturprinzipien regelt. Einzelträger einer Funktion tragen den kanonischen Namen, Spezialisierungen das Muster `<subject>-<function>.md`; deshalb heißen die beiden Architektur-Dokumente [pipeline-architecture.md](pipeline-architecture.md) und [frontend-architecture.md](frontend-architecture.md). Charter, Specification und der volatile Arbeitsstand liegen zusammengefasst in [specification.md](specification.md), weil die Wissensbasis am 2026-07-19 bewusst von achtzehn auf zwölf Dokumente konsolidiert wurde.

Modelländerungen werden zuerst in [data.md](data.md) verankert (Leitplanke Spec-first in [architecture-decisions.md](architecture-decisions.md)). Erledigtes wandert aus dem volatilen Abschnitt von [specification.md](specification.md) nach [journal.md](journal.md) und [architecture-decisions.md](architecture-decisions.md), Quellseitiges nach [data-errors.md](data-errors.md). Forschungsnotizen und DSGVO-sensible Quellen werden im Obsidian-Vault gepflegt, das Repo trägt das destillierte Extrakt.

## Begriffe

- AgRelOn, Agent Relationship Ontology der Deutschen Nationalbibliothek für Agent-Agent-Beziehungen
- DFT, Documentary Form Type, die hierarchische Dokumenttypen-Taxonomie im Namespace `m3gim-dft`
- Konvolut, eine aggregierende Archiveinheit mit Kindern auf Folio-Ebene
- M³GIM, Mapping Mobile Musicians, der Projektname; im Namespace und in Dateinamen als `m3gim` geschrieben
- m3gim-Extension, die Projekterweiterung für Werke, Aufführungen, Bühnenrollen und Mobilität, formalisiert in [`vocab/m3gim.ttl`](../vocab/m3gim.ttl)
- Mobilitätssichten, fünf Abfrageperspektiven auf dieselben Daten, performativ, institutionell, Reise und Korrespondenz, biographisch, diskursiv
- Promptotyping, die Arbeitsweise des Projekts, in der die Dokumente die Source of Truth sind und der Code ein nachgeordnetes Artefakt
- Provenance, die semantische Quellenangabe je Aussage und die technische Rückverfolgbarkeit zur XLSX-Ursprungszelle
- Quality-Snapshot, der bei jedem Pipeline-Lauf generierte Markdown-Bericht mit allen laufenden Zahlen
- Reconciliation und Enrichment, der Abgleich der Entitäten gegen Wikidata und die Anreicherung mit Normdaten
- RiC-O, Records in Contexts Ontology, das archivische Kernmodell in Version 1.1
- Schichtenmodell, die drei Erschließungsschichten Kernmetadaten, Verknüpfungen und Detailerschließung plus die Meta-Querschnittsebene
- SKOS, Simple Knowledge Organization System, die Organisationsform der kontrollierten Vokabulare
- SpatiotemporalEvent, kurz STE, die zentrale raumzeitliche Klasse, die den Mobilitätskern trägt
- UAKUG/NIM, die Signatur des Teilnachlasses Ira Malaniuk am Universitätsarchiv der Kunstuniversität Graz
