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
updated: 2026-07-18
language: de
version: 0.3
authors: [Christopher Pollin]
generated-with: Claude Code
related: [specification, data, data-entry-guidelines, research, pipeline, architecture, design, decisions, testing, journal, datenfehler]
---

# M³GIM Knowledge Base

Diese Seite ist der Einstiegspunkt in die Wissensbasis des Projekts. Sie ordnet die Dokumente nach ihrer Promptotyping-Funktion, gibt Lesepfade nach Rolle und erklärt die wiederkehrenden Begriffe. Die Wissensbasis ist die Source of Truth, der Code ist nachgeordnetes Artefakt. Laufende Zahlen stehen ausschließlich im generierten Quality-Snapshot unter [`data/reports/quality-snapshot.md`](../data/reports/quality-snapshot.md), nicht in diesen Dokumenten.

## Lesepfad nach Rolle

- Erstbesuch → [specification.md](specification.md) für Identität, Ziel und Funktionsumfang, dann [research.md](research.md) für Theorie, Forschungsfragen und Use Cases
- Aktuellen Stand und nächste Schritte → [specification.md](specification.md) § Stand und nächste Schritte
- Datenmodell verstehen oder ändern → [data.md](data.md)
- Daten erfassen nach den Soll-Konventionen → [data-entry-guidelines.md](data-entry-guidelines.md)
- Pipeline ausführen oder debuggen → [pipeline.md](pipeline.md)
- Frontend anpassen → [architecture.md](architecture.md) für die Bauweise (inklusive Cross-View-Filter), [design.md](design.md) für Designhaltung und Interaktionsmuster
- Tests schreiben → [testing.md](testing.md)
- Verstehen, warum etwas so entschieden wurde → [decisions.md](decisions.md)
- Bekannte Datenfehler und Quell-Fixes nachschlagen oder ans Erfassungsteam geben → [datenfehler.md](datenfehler.md)
- Projektgeschichte nachvollziehen → [journal.md](journal.md), ältere Sessions in [_archive/journal-sessions-01-47.md](_archive/journal-sessions-01-47.md)

## Dokumentenmatrix

| Funktion | Dokument | Inhalt |
|---|---|---|
| Navigation | [INDEX.md](INDEX.md) | Diese Seite, Lesepfade, Dokumentenmatrix, Glossar |
| Identität, Funktionsumfang, Stand | [specification.md](specification.md) | Projektsteckbrief, Ziel und Rahmen, Anforderungen, Epics und User Stories, Abgrenzung, volatiler Abschnitt Stand und nächste Schritte inklusive Status-Tracker und offener Operator-Entscheidungen |
| Substanz, Entscheidungen | [decisions.md](decisions.md) | Architekturentscheidungen E-01 aufwärts, offene Entscheidungen, technische Schulden |
| Material | [data.md](data.md) | RiC-O 1.1, m3gim-Extension und AgRelOn, Vokabulare, Mobilitätssichten, Datenqualitäts-Katalog, Quellen |
| Domänenwissen, Theorie und Evaluation | [research.md](research.md) | Mobility Studies, Mobilitätstypen, Forschungsfragen, Fallbeispiel Ira Malaniuk, Oper Graz, Use Cases, Personas, Evaluationsskizze |
| Domänenwissen, Regelwerk | [data-entry-guidelines.md](data-entry-guidelines.md) | Normative Erfassungsrichtlinie, Workflow, Ansetzungsformen, typ-zu-Rolle-Vokabular, ID-Schema |
| Bauweise, Pipeline | [pipeline.md](pipeline.md) | Skriptverantwortung, Datenfluss, Pipeline-Erweiterungen, Qualitäts-Baseline |
| Bauweise, Frontend | [architecture.md](architecture.md) | Laufzeitmodell, Modulstruktur, Store, Routing, build-loses Deployment, Cross-View-Filter |
| Gestalt | [design.md](design.md) | Designhaltung, Tab-Architektur, Designregeln, Designsystem, Lektionen der entfernten Visualisierungen |
| Qualitätssicherung | [testing.md](testing.md) | Testsuite-Überblick, TDD-Workflow, Anker-Record-Strategie |
| Genese | [journal.md](journal.md) | Chronologische Session-Dokumentation ab Session 48; ältere Sessions im Archiv |
| Datenfehler-Register | [datenfehler.md](datenfehler.md) | Quellfehler, Abgleichfehler und strukturelle Quell-Fixes mit Fundstelle und Status |

Die Stand-Kommunikation für Dritte wird bewusst nicht als eigenes Report-Dokument geführt. Diese Funktion übernimmt der generierte Quality-Snapshot, der bei jedem Pipeline-Lauf frisch entsteht. Datierte Befund-Dokumente (Sichtprüfungen, Visualisierungsanalysen, Reviews) liegen als Momentaufnahmen unter `data/reports/`, nicht in der Wissensbasis.

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
- Der Obsidian-Vault unter `C:\Users\Chrisi\Documents\obsidian\Projects\M³GIM\` enthält die DSGVO-sensiblen Quellen und Forschungsnotizen, die nicht im Repo liegen

## Pflegehinweis

- Modell-Änderungen werden immer zuerst in [data.md](data.md) verankert, die Spezifikation ist die Source of Truth, Pipeline, Tests und Frontend folgen
- Der volatile Abschnitt Stand und nächste Schritte lebt am Ende von [specification.md](specification.md); Erledigtes wandert von dort ins [journal.md](journal.md) und nach [decisions.md](decisions.md), Quellseitiges ins [Datenfehler-Register](datenfehler.md)
- Forschungsnotizen werden im Obsidian-Vault gepflegt, das Repo enthält das destillierte, DSGVO-bereinigte Extrakt
- Die Struktur ist flach bis auf `_archive/` für ausgelagerte Journal-Sessions
- Dokumente bleiben konkret, statt Ähnliches zu wiederholen werden Querlinks gesetzt und Inhalte atomar gehalten
