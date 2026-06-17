---
title: Spezifikation
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.2
created: 2026-06-17
updated: 2026-06-17
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Specification
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/specification
topics: ["[[Requirements]]", "[[User Stories]]", "[[Scope]]"]
related: [project, design, architecture, data, decisions]
---

# Spezifikation

Dieses Dokument beschreibt den Substanz- und Funktionsumfang von M³GIM, also was die Anwendung leistet und für wen, abgeleitet aus dem real Gebauten. Der Geltungsbereich umfasst das statische Forschungsinterface auf GitHub Pages, die ihm zugrunde liegenden Anforderungen sowie die aus den erreichten Meilensteinen ableitbaren Epics und User Stories. Das Datenmodell wird in [data.md](data.md) geführt, die Laufzeitarchitektur in [architecture.md](architecture.md), die Designhaltung in [design.md](design.md), und die getroffenen Architektur- und Modellentscheidungen in [decisions.md](decisions.md). Laufende Zählstände stehen ausschließlich im Quality-Snapshot (`data/reports/quality-snapshot.md`).

## Ziel und Rahmen

M³GIM ist eine Machbarkeitsstudie für ein FWF-Folgeprojekt zur Mobilität und Wissensproduktion von Sängerinnen an europäischen Kulturmetropolen. Sie erschließt den Teilnachlass der Mezzosopranistin Ira Malaniuk (UAKUG/NIM) am Universitätsarchiv der KUG Graz digital und macht ihn als Forschungsinterface zugänglich.

Als Pilotstudie validiert M³GIM primär die Methode, nicht die Vollständigkeit des Bestands. Es geht um den Nachweis, dass das Modell aus RiC-O 1.1, der m3gim-Erweiterung und AgRelOn für die Forschungsfragen praktikabel ist, dass eine reproduzierbare Pipeline von Erfassung über Normdatenanschluss bis zur publizierten Anwendung trägt, und dass erste empirische Ergebnisse aus dem feinerschlossenen Kern entstehen. Feinerschlossen ist vor allem ein Teil des Bestands, der übrige Bestand ist absichtlich noch dünn verknüpft. Dieser ehrliche Erschließungsstand ist Teil der Spezifikation, nicht ein zu kaschierender Mangel.

Technisch ist M³GIM eine statische Single-Page-Application ohne Backend, ausgeliefert über GitHub Pages. Diese Architekturwahl folgt aus dem Rahmen einer durch Förderlücken unterbrochenen Projektzeit, in der eine offline-first lauffähige, ohne Serverbetrieb dauerhaft erreichbare Anwendung robuster ist als eine serverabhängige Lösung.

## Anforderungen

### Funktionale Anforderungen

Die Anwendung präsentiert den erschlossenen Bestand in mehreren komplementären Perspektiven auf denselben zugrunde liegenden Graphen, ohne dass beim Wechsel der Perspektive ein Feature- oder Datenmodellwechsel stattfindet.

Sie macht den archivischen Bestand in seiner hierarchischen Konvolut-Struktur durchsuch- und filterbar und erlaubt das Aufklappen einzelner Objekte zu einem Detailbild mit allen erfassten Verknüpfungen, Finanzangaben, Beziehungen und raum-zeitlichen Ereignissen.

Sie ordnet die datierten Objekte zeitlich an und macht die Karrierechronologie samt ihrer Erschließungslücken sichtbar.

Sie aggregiert den Bestand zu einer visuellen Zusammenschau, die zeigt, was die Daten sind und was mit ihnen möglich wird.

Sie erschließt die vier Normdatenindizes (Personen, Organisationen, Orte, Werke) als eigenständige Einstiege mit Wikidata-Anreicherung und Querverweisen in den Bestand.

Sie stellt das Personennetzwerk um Malaniuk dar und unterscheidet explizit annotierte Beziehungen von aus Ko-Präsenz abgeleiteten Verbindungen.

Sie erlaubt das Sammeln ausgewählter Objekte in einem Wissenskorb und deren Export in zitierfähige Formate.

Sie führt jeden angezeigten Datenpunkt über eine Provenance-Angabe auf seine Quellzelle in den XLSX-Erfassungstabellen zurück und macht Konfidenz und Erschließungsevidenz transparent.

Sie verknüpft normierte Entitäten mit Wikidata-Q-IDs und zeigt die daraus gewonnene Anreicherung (Beruf, Stimmfach, Lebensdaten, Koordinaten) an.

### Nicht-funktionale Anforderungen

Die Anwendung läuft als statische SPA offline-first, lädt alle Daten beim Start und benötigt kein Backend und keine Build-Kette. Sie ist auf GitHub Pages dauerhaft ohne Serverbetrieb erreichbar.

Sie zeigt den Erschließungsstand ehrlich. Lücken, ungetypte Datensätze und nicht verknüpfte Objekte werden dargestellt und nicht durch Pipeline-Workarounds geglättet. Es werden keine redaktionellen Deutungen in das Interface eingebaut, die nicht aus den Metadaten ableitbar sind.

Sie ist an Linked Open Data anschlussfähig, indem das Datenmodell auf etablierten Standards (RiC-O 1.1, AgRelOn, SKOS) aufsetzt und Entitäten über Wikidata-Q-IDs normiert.

Sie ist reproduzierbar, indem die XLSX-Quelldateien versioniert vorliegen und die Pipeline aus diesen deterministisch denselben Datenstand erzeugt.

Die einzige primäre Datenquelle des Frontends ist `docs/data/m3gim.jsonld`. Es gibt keine zweite Frontend-Datenquelle und keine im Frontend hartkodierten Zählstände.

Annahme: Die Anwendung adressiert ohne weitere Tuning-Maßnahmen den aktuellen Bestandsumfang. Eine präemptive Performance-Optimierung wird bewusst nicht betrieben (siehe E-25 in [decisions.md](decisions.md)). Bei deutlich größerem Bestand in einem Folgeprojekt wäre dies neu zu bewerten.

## Epics und User Stories

Die folgenden Epics decken die aktiven Funktionsbereiche ab. Die Tabs Bestand, Chronik, Statistik, Indizes, Netzwerk und Wissenskorb sind sichtbar; die Perspektiv-Tabs Mobilitäts-Atlas, Repertoire und Biogramm sind aktuell verborgen und werden iterativ reaktiviert. Die Stories spiegeln den belegten Funktionsumfang wider.

### Epic Bestand

Der Bestand ist die archivische Grundsicht auf die Objekte in ihrer Konvolut-Hierarchie.

- Als Forscher:in möchte ich den Bestand nach Volltext, Dokumenttyp, Person, Ort und Werk filtern, um gezielt die für meine Frage relevanten Objekte einzugrenzen.
- Als Forscher:in möchte ich ein Objekt aufklappen und sein vollständiges Detailbild mit Verknüpfungen, Finanzen, Beziehungen und Ereignissen in funktionalen Blöcken sehen, um den erschlossenen Kontext eines Stücks zu erfassen.
- Als Forscher:in möchte ich Konvolute als Einheit mit ihren aggregierten Metadaten erkennen und ihre Kinder innerhalb der Hierarchie sortieren, um die archivische Ordnung nicht zu zerreißen.

### Epic Chronik

Die Chronik ordnet die datierten Objekte entlang der Lebenszeit Malaniuks an.

- Als Forscher:in möchte ich die Objekte als scrollenden Jahres-Zeitstrahl sehen, um die zeitliche Verteilung und Dichte der Überlieferung zu lesen.
- Als Forscher:in möchte ich von einem Chronik-Punkt direkt in das zugehörige Bestand-Detail springen, um zwischen zeitlicher und archivischer Sicht zu wechseln, ohne den Lesefluss zu verlieren.

### Epic Statistik

Die Statistik ist eine read-only Zusammenschau des Bestands.

- Als Forscher:in möchte ich Dokumenttypen, Mobilitätssichten, Geografie, Netzwerk, Repertoire und Finanzen als Diagramme sehen, um auf einen Blick zu erfassen, was die Daten sind und was sie hergeben.
- Als Gutachter:in möchte ich eine ehrliche Eingangssicht auf den Bestand, die auch ungetypte und unverknüpfte Datensätze sichtbar macht, um den realen Erschließungsstand einschätzen zu können.

### Epic Indizes

Die Indizes erschließen die vier Normdaten-Register als eigenständige Einstiege.

- Als Forscher:in möchte ich Personen, Organisationen, Orte und Werke durchsuchen und nach Wikidata-Verknüpfung filtern, um über eine normierte Entität in den Bestand einzusteigen.
- Als Forscher:in möchte ich an einer Personenzeile die Wikidata-Anreicherung (Beruf, Stimmfach, Lebensdaten) und die annotierten Beziehungen sehen, um die Entität ohne Detailsprung einzuordnen.

### Epic Netzwerk

Das Netzwerk stellt das Personenumfeld Malaniuks dar.

- Als Forscher:in möchte ich Malaniuk im Zentrum und alle weiteren Personen nach Evidenzstärke auf konzentrischen Ringen sehen, um zu erkennen, mit wem sie in belegter Beziehung oder wiederkehrendem Umfeld stand.
- Als Forscher:in möchte ich explizit annotierte AgRelOn-Beziehungen von aus Ko-Präsenz abgeleiteten Verbindungen unterscheiden können, um nicht beleghafte mit erschlossenen Verbindungen zu verwechseln.
- Als Forscher:in möchte ich nach Mindest-Dokumentzahl, Kategorie und Zeitfenster filtern und einen Knoten anpinnen, um das Netzwerk verdichtet zu lesen, ohne dass sich die Positionen verschieben.

### Epic Wissenskorb

Der Wissenskorb ist das Querschnitts-Werkzeug zum Sammeln und Exportieren.

- Als Forscher:in möchte ich ausgewählte Objekte in einem Korb sammeln, um eine Arbeitsauswahl über mehrere Tabs hinweg zusammenzustellen.
- Als Forscher:in möchte ich die Auswahl als CSV und BibTeX inklusive Beziehungen und Finanzangaben exportieren, um sie in eigene Arbeitsumgebungen zu übernehmen.

### Epic Provenance und Normdaten

Provenance und Normdatenanschluss durchziehen alle Sichten.

- Als Forscher:in möchte ich zu jedem angezeigten Datenpunkt die XLSX-Quellzelle (Sheet, Zeile, Datenpunkt) einsehen, um die Angabe gegen die Erfassung zu prüfen.
- Als Forscher:in möchte ich die Konfidenz und Erschließungsevidenz eines Datenpunkts erkennen, um erschlossene von dokumentarisch belegten Angaben zu unterscheiden.
- Als Forscher:in möchte ich von einer normierten Entität direkt zu ihrem Wikidata-Eintrag gelangen, um den Normdatenanschluss nachzuvollziehen.

### Epic Perspektiv-Tabs (verborgen, in Reaktivierung)

Annahme: Die folgenden Stories beschreiben den in vorigen Sessions gebauten, derzeit verborgenen Funktionsstand der drei Perspektiv-Tabs. Sie sind als Zielbild der iterativen Reaktivierung zu verstehen, nicht als aktuell ausgelieferter Funktionsumfang.

- Als Forscher:in möchte ich die verorteten Ereignisse auf einer Karte mit Zeitstrahl-Filter sehen (Mobilitäts-Atlas), um die räumliche Mobilität Malaniuks nachzuvollziehen.
- Als Forscher:in möchte ich das Bühnenrepertoire und die Komponisten als Aggregat-Tabellen mit Belegaufschlüsselung sehen (Repertoire), um den künstlerischen Schwerpunkt zu erfassen.
- Als Forscher:in möchte ich die Lebensstationen und Belege auf einem biografischen Zeitstrahl sehen (Biogramm), um den Lebenslauf entlang der Quellen zu lesen.

## Funktionsumfang und Abgrenzung

Im Funktionsumfang sind die sichtbaren Tabs Bestand, Chronik, Statistik, Indizes, Netzwerk und der Wissenskorb als Werkzeug, jeweils mit Provenance- und Normdatenanschluss. Die drei Perspektiv-Tabs Mobilitäts-Atlas, Repertoire und Biogramm sind als Code, CSS und Store-Maps vorhanden, aber verborgen und werden iterativ reaktiviert.

Bewusst nicht im Funktionsumfang sind ein Backend oder eine serverseitige Suche, eine Schreib- oder Bearbeitungsfunktion im Frontend (Erfassung läuft ausschließlich über die XLSX-Quellen), redaktionelle Deutungen im Interface, die nicht aus den Metadaten ableitbar sind, sowie eine präemptive Performance-Optimierung. Ebenfalls verschoben sind ein JSON-LD- und GEXF-Export aus den Sichten sowie EAD-Export und Zenodo-Archivierung als Betriebsmodell.

Für die Designhaltung hinter diesen Sichten (Rolle-Prefix-Chips als universelles Daten-Atom, Tabelle vor Chart, Provenance-Pille, Datenqualität wird gezeigt) siehe [design.md](design.md). Für das Laufzeitmodell, den Store und die Ansichten siehe [architecture.md](architecture.md). Für das zugrunde liegende Datenmodell siehe [data.md](data.md).

## Architektur- und Modellentscheidungen

Die einzelnen Architektur- und Modellentscheidungen, die diesen Funktionsumfang tragen, werden in [decisions.md](decisions.md) geführt und hier nicht dupliziert. Dort liegen sowohl die finalen Entscheidungen (von der Vanilla-JS-Wahl über die Tab-Architektur bis zu den einzelnen Modellschichten) als auch die getrackten offenen Entscheidungen, die den Funktionsumfang in künftigen Sessions noch verändern können.
