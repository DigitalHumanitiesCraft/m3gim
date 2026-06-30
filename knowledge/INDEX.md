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
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/index
status: complete
created: 2026-02-19
updated: 2026-06-30
language: de
version: 0.2
authors: [Christopher Pollin]
generated-with: Claude Code
related: [project, specification, use-cases, data, data-entry-guidelines, research, filter-modell, pipeline, architecture, design, decisions, testing, journal, plan, datenfehler]
---

# M³GIM Knowledge Base

Diese Seite ist der Einstiegspunkt in die Wissensbasis des Projekts. Sie ordnet die Dokumente nach ihrer Promptotyping-Funktion, gibt Lesepfade nach Rolle und erklärt die wiederkehrenden Begriffe. Die Wissensbasis ist die Source of Truth, der Code ist nachgeordnetes Artefakt. Laufende Zahlen stehen ausschließlich im generierten Quality-Snapshot unter [`data/reports/quality-snapshot.md`](../data/reports/quality-snapshot.md), nicht in diesen Dokumenten.

## Lesepfad nach Rolle

- Erstbesuch → [project.md](project.md) für Identität und Kontext, dann [research.md](research.md) für Theorie und Forschungsfragen
- Datenmodell verstehen oder ändern → [data.md](data.md)
- Daten erfassen nach den Soll-Konventionen → [data-entry-guidelines.md](data-entry-guidelines.md)
- Pipeline ausführen oder debuggen → [pipeline.md](pipeline.md)
- Frontend anpassen → [architecture.md](architecture.md) für die Bauweise, [design.md](design.md) für Designhaltung und Interaktionsmuster
- Tests schreiben → [testing.md](testing.md)
- Funktionsumfang nachschlagen → [specification.md](specification.md)
- Verstehen, warum etwas so entschieden wurde → [decisions.md](decisions.md)
- Aktuellen Stand und nächste Schritte → [plan.md](plan.md)
- Bekannte Datenfehler nachschlagen oder ans Erfassungsteam geben → [datenfehler.md](datenfehler.md)
- Use Cases, Personas und Evaluation der Forschungsfragen → [use-cases.md](use-cases.md)
- Geteilten Cross-View-Filter (Querschnitt über Chronik, Karte, Statistik) verstehen → [filter-modell.md](filter-modell.md)
- Projektgeschichte nachvollziehen → [journal.md](journal.md)

## Dokumentenmatrix

| Funktion | Dokument | Inhalt |
|---|---|---|
| Navigation | [INDEX.md](INDEX.md) | Diese Seite, Lesepfade, Dokumentenmatrix, Glossar |
| Identität | [project.md](project.md) | Steckbrief, Beteiligte, übergeordneter Kontext, Abgrenzungen, Lizenz |
| Substanz, Funktionsumfang | [specification.md](specification.md) | Anforderungen, Epics und User Stories, Funktionsumfang und Abgrenzung |
| Substanz, Entscheidungen | [decisions.md](decisions.md) | Architekturentscheidungen E-01 aufwärts, offene Entscheidungen, technische Schulden |
| Material | [data.md](data.md) | RiC-O 1.1, m3gim-Extension und AgRelOn, Vokabulare, Mobilitätssichten, partitur-Schema, Datenqualität, Quellen |
| Domänenwissen, Theorie | [research.md](research.md) | Mobility Studies, fünf Mobilitätstypen, Forschungsfragen, Fallbeispiel Ira Malaniuk, Oper Graz |
| Domänenwissen, Regelwerk | [data-entry-guidelines.md](data-entry-guidelines.md) | Normative Erfassungsrichtlinie, Workflow, Ansetzungsformen, typ-zu-Rolle-Vokabular, ID-Schema |
| Bauweise, Pipeline | [pipeline.md](pipeline.md) | Skriptverantwortung, Datenfluss, Pipeline-Erweiterungen, Qualitäts-Baseline |
| Bauweise, Frontend | [architecture.md](architecture.md) | Laufzeitmodell, Modulstruktur, Store, Routing, build-loses Deployment |
| Gestalt | [design.md](design.md) | Designhaltung, Tab-Architektur, Designregeln, Designsystem, Lektionen der entfernten Visualisierungen |
| Qualitätssicherung | [testing.md](testing.md) | Testsuite-Überblick, TDD-Workflow, Anker-Record-Strategie |
| Genese | [journal.md](journal.md) | Chronologische Session-Dokumentation, Entscheidungen und Erkenntnisse |
| Plan und Steuerung | [plan.md](plan.md) | Zielbild, nächste Schritte, deferred Arbeiten, offene Datenqualität |
| Datenfehler-Register | [datenfehler.md](datenfehler.md) | Gesammelte Quell- und Abgleichfehler mit Fundstelle und Status |
| Use Cases & Evaluation | [use-cases.md](use-cases.md) | Forschungsfragen als Use Cases, Persona-Stubs, Evaluations-Skizze (Arbeitsstand) |
| Substanz, Feature-Spec | [filter-modell.md](filter-modell.md) | Geteilter Cross-View-Filter, State-Modell, Filtersemantik, Facetten-Matrix, Bauplan |

Die Stand-Kommunikation für Dritte wird bewusst nicht als eigenes Report-Dokument geführt. Diese Funktion übernimmt der generierte Quality-Snapshot, der bei jedem Pipeline-Lauf frisch entsteht.

Im Ordner liegen zwei datierte Befund-Dokumente, die keine kanonischen Wissensdokumente sind, sondern Momentaufnahmen einer Lane-Arbeit, [frontend-sichtpruefung-2026-06-21.md](frontend-sichtpruefung-2026-06-21.md) (Sichtprüfungs-Audit, Datenfehler bereits ins Register überführt) und [visualisierung-bayreuth.md](visualisierung-bayreuth.md) (Auftrags- und Klärungsdokument der Visualisierungs-Lane). Beide sind Kandidaten für eine Verlagerung nach `data/reports/`, solange sie hier liegen, gehören sie nicht zum Lesepfad.

## Glossar

- Promptotyping, die Arbeitsweise des Projekts, in der die Dokumente die Source of Truth sind und der Code ein nachgeordnetes Artefakt
- RiC-O, Records in Contexts Ontology, das archivische Kernmodell in Version 1.1
- m3gim-Extension, die Projekterweiterung für Werke, Aufführungen, Bühnenrollen und Mobilität
- AgRelOn, Agent Relationship Ontology der Deutschen Nationalbibliothek für Agent-Agent-Beziehungen
- SKOS und DFT, die Vokabularorganisation und die hierarchische Dokumenttypen-Taxonomie
- Konvolut, eine aggregierende Archiveinheit mit Kindern auf Folio-Ebene
- Schichtenmodell, die drei Erschließungsschichten Kernmetadaten, Verknüpfungen und Detailerschließung plus die Meta-Querschnittsebene
- SpatiotemporalEvent, die zentrale raumzeitliche Klasse, die den Mobilitätskern trägt
- Mobilitätssichten, fünf Abfrageperspektiven auf dieselben Daten, performativ, institutionell, Reise und Korrespondenz, biographisch, diskursiv
- Reconciliation und Enrichment, der Abgleich der Entitäten gegen Wikidata und die Anreicherung mit Normdaten
- Provenance, die semantische Quellenangabe je Aussage und die technische Rückverfolgbarkeit zur XLSX-Ursprungszelle
- Quality-Snapshot, der bei jedem Pipeline-Lauf generierte Markdown-Bericht mit allen laufenden Zahlen

## Weitere Ressourcen

- [`../CLAUDE.md`](../CLAUDE.md) führt die Workflow-Regeln für Claude-Code-Sessions, prozessual und nicht dokumentarisch
- Die Session-Memory unter `.claude/projects/*/memory/` persistiert über Sessions
- Der Obsidian-Vault unter `C:\Users\chris\Documents\obsidian\Projects\M³GIM\` enthält die DSGVO-sensiblen Quellen und Forschungsnotizen, die nicht im Repo liegen

## Pflegehinweis

- Modell-Änderungen werden immer zuerst in [data.md](data.md) verankert, die Spezifikation ist die Source of Truth, Pipeline, Tests und Frontend folgen
- Forschungsnotizen werden im Obsidian-Vault gepflegt, das Repo enthält das destillierte, DSGVO-bereinigte Extrakt
- Die Struktur ist flach, alle Dokumente liegen auf Top-Level ohne Unterordner
- Dokumente bleiben konkret, statt Ähnliches zu wiederholen werden Querlinks gesetzt und Inhalte atomar gehalten
