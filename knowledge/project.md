---
title: Projekt
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Projekt-Wissensdokument
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/project
status: complete
created: 2026-02-19
updated: 2026-06-17
language: de
version: 0.2
authors: [Christopher Pollin]
generated-with: Claude Code
knowledge-sources:
  institutions:
    Universitätsarchiv der KUG Graz: https://www.kug.ac.at
  standards:
    RiC-O: https://www.ica.org/standards/RiC/ontology
    AgRelOn: https://d-nb.info/standards/elementset/agrelon
related: [research, data, specification, plan]
---

# Projekt

M³GIM (Mapping Mobile Musicians) erschließt den Teilnachlass der Mezzosopranistin Ira Malaniuk (1919–2009, UAKUG/NIM am Universitätsarchiv der KUG Graz) digital und macht ihre Mobilität und Wissensproduktion im Graz der Nachkriegszeit auswertbar. Den technischen Kern bilden eine Python-Datenpipeline, die die archivische Erfassung nach JSON-LD überführt, und eine statische Single-Page-Anwendung auf GitHub Pages.

## Datengrundlage

Grundlage ist der archivisch erfasste Teilnachlass UAKUG/NIM in drei Bestandsgruppen (Hauptbestand, Plakate, Tonträger), erfasst durch das Archivteam der KUG nach der projekteigenen [Erfassungsrichtlinie](data-entry-guidelines.md). Das Projekt verarbeitet diese Erfassung, es produziert die Quellbeschreibung nicht selbst. Modell, Vokabulare und Quellen stehen im Detail in [data.md](data.md). Laufende Bestandszahlen stehen ausschließlich im generierten Quality-Snapshot, nicht in der Wissensbasis.

## Übergeordneter Kontext

Das Projekt ist eine Machbarkeitsstudie für ein FWF-Folgeprojekt zu Mobilität und Wissensproduktion von Sängerinnen an europäischen Kulturmetropolen im 19. und 20. Jahrhundert. Träger ist das Universitätsarchiv der KUG Graz, die DH-Umsetzung liegt bei DH Craft. Theorie und Forschungsfragen stehen in [research.md](research.md).

## Beteiligte und Kontext

Die Projektleitung liegt bei Nicole K. Strohmann (Historische Musikwissenschaft und Genderforschung, KUG). Als Kooperationspartner wirken Wolfgang Madl vom Archiv der KUG und Christopher Pollin von DH Craft mit, beratend begleitet Georg Vogeler vom Zentrum für Informationsmodellierung der Universität Graz das Vorhaben. Der inhaltliche Schwerpunkt liegt räumlich auf der Oper Graz im Zeitraum 1945–1969, dem prägenden Abschnitt von Malaniuks früher Karriere. Die laufende Anwendung ist unter https://dhcraft.org/m3gim erreichbar.

## Worum es geht

Das Projekt priorisiert methodische Validierung vor Vollständigkeit. Es prüft, ob der Nachlass mit RiC-O 1.1 plus m3gim-Extension plus AgRelOn praktikabel erschließbar ist und ob die Verfahren auf größere Bestände skalieren. Der Erschließungsstand wird sichtbar gemacht, nicht kaschiert.

## Standards

- RiC-O 1.1 für die archivische Modellierung, erweitert um die m3gim-Extension für Werke, Aufführungen, Bühnenrollen und Mobilität
- AgRelOn für Agent-Agent-Beziehungen
- Wikidata-Q-IDs als Normdaten über Reconciliation und Enrichment
- SKOS für die Vokabularorganisation

Die Wahl folgt dem Anspruch auf Linked-Open-Data-Anschlussfähigkeit. Die Grenzen der Normdaten-Abdeckung sind in [data.md](data.md) benannt.

## Abgrenzungen

Das Projekt zieht bewusst Grenzen.

- keine vollständige Erschließung des Nachlasses, Pilotstudie mit Schwerpunkt auf wenigen feinerschlossenen Konvoluten
- keine biografische Rekonstruktion aus den Mobilitätsdaten, ein Erschließungs-Zwischenstand und kein Lebensbild
- keine eigenständige Quellenedition
- kein Backend, keine Nutzerkonten, keine Schreibzugriffe, eine statische SPA mit Offline-first-Laden
- keine Forschungsergebnisse als Aussagen über den Gegenstand, die liegen in Publikationen

## Lizenz

Code steht unter MIT, Daten und Dokumentation unter CC BY 4.0, Quellenmaterial nach Einzelrechtevermerk. Details in der Lizenzdatei des Repos.
