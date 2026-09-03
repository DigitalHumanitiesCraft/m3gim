---
title: Spezifikation
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: reviewed
language: de
version: 0.6
created: 2026-06-17
updated: 2026-09-03
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Specification
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/specification
knowledge-sources:
  institutions:
    Universitätsarchiv der KUG Graz: https://www.kug.ac.at
  standards:
    RiC-O: https://www.ica.org/standards/RiC/ontology
    AgRelOn: https://d-nb.info/standards/elementset/agrelon
topics: ["[[Requirements]]", "[[User Stories]]", "[[Scope]]"]
related: [research-framework, data, data-model, architecture, design, journal, testing]
---

# Spezifikation

Dieses Dokument trägt die Projektidentität, den Substanz- und Funktionsumfang von M³GIM und den operativen Stand. Es beschreibt, was die Anwendung leistet und für wen, sammelt die offenen Entscheidungen des Projekts an einer Stelle und führt am Ende in einem ausdrücklich volatilen Abschnitt die nächsten Schritte. Das Datenmodell wird in [data.md](data.md) geführt, die Laufzeitarchitektur in [architecture.md](architecture.md), die Designhaltung in [design.md](design.md), die getroffenen Architektur- und Modellentscheidungen in [journal.md](journal.md), die quellseitig zu behebenden Datenpunkte im [Datenfehler-Register](../data/reports/reconciliation-register.md). Laufende Zählstände stehen ausschließlich im Quality-Snapshot (`data/reports/quality-snapshot.md`).

## Projekt

M³GIM (Mapping Mobile Musicians) erschließt den Teilnachlass der Mezzosopranistin Ira Malaniuk (1919–2009, UAKUG/NIM am Universitätsarchiv der KUG Graz) digital und macht ihre Mobilität und Wissensproduktion im Graz der Nachkriegszeit auswertbar. Den technischen Kern bilden eine Python-Datenpipeline, die die archivische Erfassung nach JSON-LD überführt, und eine statische Single-Page-Anwendung auf GitHub Pages. Die laufende Anwendung ist unter https://dhcraft.org/m3gim erreichbar.

### Datengrundlage

Grundlage ist der archivisch erfasste Teilnachlass UAKUG/NIM in den Bestandsgruppen Hauptbestand, Plakate und Tonträger, erfasst durch das Archivteam der KUG nach der projekteigenen [Erfassungsrichtlinie](data-model.md#erfassung). Das Projekt verarbeitet diese Erfassung, es produziert die Quellbeschreibung nicht selbst. Modell, Vokabulare und Quellen stehen im Detail in [data.md](data.md).

### Beteiligte und Kontext

Das Projekt ist eine Machbarkeitsstudie für ein FWF-Folgeprojekt zu Mobilität und Wissensproduktion von Sängerinnen an europäischen Kulturmetropolen im 19. und 20. Jahrhundert. Die Projektleitung liegt bei der Professur für Historische Musikwissenschaft und Genderforschung der KUG, Kooperationspartner sind das Universitätsarchiv der KUG und DH Craft, beratend begleitet das Zentrum für Informationsmodellierung der Universität Graz das Vorhaben. Der inhaltliche Schwerpunkt liegt räumlich auf der Oper Graz im Zeitraum 1945–1969, dem prägenden Abschnitt von Malaniuks früher Karriere. Theorie und Forschungsfragen stehen in [research-framework.md](research-framework.md).

### Standards

- RiC-O 1.1 für die archivische Modellierung, erweitert um die m3gim-Extension für Werke, Aufführungen, Bühnenrollen und Mobilität
- AgRelOn für Agent-Agent-Beziehungen
- Wikidata-Q-IDs als Normdaten über Reconciliation und Enrichment
- SKOS für die Vokabularorganisation

Die Wahl folgt dem Anspruch auf Linked-Open-Data-Anschlussfähigkeit. Die Grenzen der Normdaten-Abdeckung sind in [data.md](data.md) benannt.

### Lizenz

Code steht unter MIT, Daten und Dokumentation unter CC BY 4.0, Quellenmaterial nach Einzelrechtevermerk.

## Ziel und Rahmen

Als Pilotstudie validiert M³GIM primär die Methode, nicht die Vollständigkeit des Bestands. Sie verfolgt zusammenhängende Ziele. Sie prüft, ob der Nachlass mit RiC-O 1.1 plus m3gim-Extension plus AgRelOn praktikabel erschließbar ist und ob die Verfahren auf größere Bestände skalieren. Sie baut das Forschungsinterface schrittweise zu einem vollständigen Satz von Perspektiven aus. Und sie hebt die Datenqualität, ohne den tatsächlichen Erschließungsstand zu kaschieren. Diese Linien tragen den Antrag für das FWF-Folgeprojekt.

Feinerschlossen ist vor allem ein Teil des Bestands, der übrige Bestand ist absichtlich noch dünn verknüpft. Dieser ehrliche Erschließungsstand ist Teil der Spezifikation, nicht ein zu kaschierender Mangel.

Technisch ist M³GIM eine statische Single-Page-Application ohne Backend, ausgeliefert über GitHub Pages. Diese Architekturwahl folgt aus dem Rahmen einer durch Förderlücken unterbrochenen Projektzeit, in der eine offline-first lauffähige, ohne Serverbetrieb dauerhaft erreichbare Anwendung robuster ist als eine serverabhängige Lösung.

## Anforderungen

### Funktionale Anforderungen

Die Anwendung präsentiert den erschlossenen Bestand in komplementären Perspektiven auf denselben zugrunde liegenden Graphen, ohne Feature- oder Datenmodellwechsel beim Perspektivwechsel, jede Sicht mit Provenance- und Normdatenanschluss. Die Anforderungen je Sicht sind vollständig als Epics und User Stories ausformuliert (§ Epics und User Stories) und werden hier nicht dupliziert.

### Nicht-funktionale Anforderungen

Die Anwendung läuft als statische SPA offline-first, lädt alle Daten beim Start und benötigt kein Backend und keine Build-Kette. Sie ist auf GitHub Pages dauerhaft ohne Serverbetrieb erreichbar.

Sie zeigt den Erschließungsstand ehrlich. Lücken, ungetypte Datensätze und nicht verknüpfte Objekte werden dargestellt und nicht durch Pipeline-Workarounds geglättet. Es werden keine redaktionellen Deutungen in das Interface eingebaut, die nicht aus den Metadaten ableitbar sind.

Sie ist an Linked Open Data anschlussfähig, indem das Datenmodell auf etablierten Standards (RiC-O 1.1, AgRelOn, SKOS) aufsetzt und Entitäten über Wikidata-Q-IDs normiert.

Sie ist reproduzierbar, indem die XLSX-Quelldateien versioniert vorliegen und die Pipeline aus diesen deterministisch denselben Datenstand erzeugt.

Die einzige primäre Datenquelle des Frontends ist `docs/data/m3gim.jsonld`. Es gibt keine zweite Frontend-Datenquelle und keine im Frontend hartkodierten Zählstände.

Annahme: Die Anwendung adressiert ohne weitere Tuning-Maßnahmen den aktuellen Bestandsumfang. Eine präemptive Performance-Optimierung wird bewusst nicht betrieben (siehe E-25 in [journal.md](journal.md)). Bei deutlich größerem Bestand in einem Folgeprojekt wäre dies neu zu bewerten.

## Epics und User Stories

Die folgenden Epics decken die aktiven Funktionsbereiche ab; welche Tabs sichtbar sind, führt § Funktionsumfang und Abgrenzung an einer Stelle. Die Stories spiegeln den belegten Funktionsumfang wider.

### Epic Bestand

Der Bestand ist die archivische Grundsicht auf die Objekte in ihrer Konvolut-Hierarchie und der Provenienz-Anker der Anwendung (Operator-Entscheidung 2026-09-01). Daraus folgen drei Grundsätze. Der Bestand macht jedes verknüpfte Objekt auffindbar, die Startansicht darf gewichten, aber innerhalb dieser Basis ist nichts unerreichbar, auch Plakate und Tonträger nicht. Objekte ganz ohne Verknüpfung liegen seit E-165 außerhalb der Anwendung, ihr Findmittel bleibt das Archiv. Das aufgeklappte Detail stellt den vollständigen erfassten Datensatz eines Eintrags dar, jeder Datenpunkt des JSON-LD-Records ist dort sichtbar oder erreichbar. Jeder Datenpunkt einer anderen Sicht führt per Rücksprung auf genau diesen aufgeklappten Eintrag.

- Als Forscher:in möchte ich im aufgeklappten Detail jeden erfassten Datenpunkt des Eintrags sehen oder erreichen, um das Detail als vollständige Belegstelle zu nutzen, ohne die Quelltabellen zu öffnen.

- Als Forscher:in möchte ich den Bestand nach Volltext, Dokumenttyp, Erschließungsstand, Person, Ort, Werk und Institution filtern, um gezielt die für meine Frage relevanten Objekte einzugrenzen.
- Als Forscher:in möchte ich ein Objekt aufklappen und sein vollständiges Detailbild mit Verknüpfungen, Finanzen, Beziehungen und Ereignissen in funktionalen Blöcken sehen, um den erschlossenen Kontext eines Stücks zu erfassen.
- Als Forscher:in möchte ich Konvolute als Einheit mit ihren aggregierten Metadaten erkennen und ihre Kinder in der Signaturfolge des Archivs lesen, um die archivische Ordnung nicht zu zerreißen. Eine Sortierung hat die Tabelle nicht, Datum leistet die Chronik, Typ die Facette (E-203).

Zielbild Bestand, Operator-Entscheidungen vom 2026-09-01. Die Anwendung ist Werkzeug, nicht Erzählung; primäre Adressaten sind Forschende und das Erschließungsteam. Leitprinzip der Umsetzung: das Interface erzeugt Erklärung durch Struktur, nicht durch erklärenden Text. Ein klickbarer Wireframe liegt als Referenz unter `C:\tmp\m3gim-wireframe\bestand-wireframe.html`; er zeigt die Zielstruktur, die visuelle Umsetzung folgt dem bestehenden Designsystem ([design.md](design.md)).

- Als Forscher:in möchte ich Suche und alle Filter in einer einheitlichen Seitenleiste bedienen, die in jeder Ansicht identisch ist, um nicht je Ansicht neue Filterorte und Bedienlogiken zu lernen. Die Facetten folgen einem gemeinsamen Muster (Eingabefeld mit Vorschlägen und entfernbaren Chips), die Tab-Leiste bleibt im Seitenkopf.
- Als Forscher:in möchte ich den Erschließungsstand als Facette mit Zählwerten wählen (abgeschlossen, begonnen, zurückgestellt, ohne Angabe), die beim ersten Öffnen auf abgeschlossen und begonnen vorbelegt ist und deren Chips ich entfernen kann, um mit demselben Bedienmuster wie bei Person oder Ort zu bestimmen, was ich sehe (E-162). Kein Dokumenttyp ist dadurch unerreichbar, auch Plakate und Tonträger nicht.
- Als Forscher:in möchte ich in der Wurzelzeile der Sidebar die Zahl der Dokumente im aktuellen Schnitt sehen und in der Chip-Zeile über der Tabelle alle gewählten Werte als entfernbare Chips, je Facette gruppiert, um auf einen Blick zu wissen, was den Schnitt bestimmt, und ihn mit einem Klick ganz oder teilweise aufzuheben (E-166, E-204). Innerhalb einer Facette genügt ein Wert, zwischen den Facetten müssen alle zutreffen; die Gruppierung der Chips zeigt das.
- Als Forscher:in möchte ich Konvolute als dauerhaft sichtbare Gruppenköpfe mit Signatur, Titel, Zeitspanne und Typ-Mix sehen; der Kopf öffnet über seinen Chevron die Folios, ein Objekt öffnet sein Detail (E-175).
- Als Forscher:in möchte ich je Objektzeile eine typisierte Erschließungsanzeige in den Familienfarben sehen (je ein Element pro Inhaltstyp, gefüllt oder leer), um Art und Tiefe der Erschließung vor dem Aufklappen zu erkennen; die Aufschlüsselung je Familie liegt im Tooltip, und dieselben Farben tragen im Detail die Blocktitel, sodass die Legende aus Nähe entsteht statt aus Text.
- Als Forscher:in möchte ich das Detail über die volle Breite lesen, beginnend mit einer Metadaten-Kopfzeile und der inhaltlichen Beschreibung, gefolgt vom Blockraster einschließlich der Aufführungen mit Werk und Datum, mit gebündelter Quellenangabe und zuklappbaren Verwaltungsangaben am Fuß, um den vollständigen Datensatz eines Eintrags an einem Ort zu erfassen. Das ausrichtende Haus je Aufführung kommt erst mit der Occurrence-Datenstufe in den Datensatz (§ Auftritts-Occurrence) und erscheint in der Sektion, sobald es dort steht; vorher zeigt die Anwendung es nicht, um keine Institution zu erfinden.
- Als Forscher:in möchte ich Signatur und Titel im aufgeklappten Detail nicht doppelt lesen und gleich gestaltete, gleich große Aktionsschaltflächen für Korb und Schließen vorfinden.
- Der Korb erhält eine eigene schmale Spalte, damit das Lesezeichen-Symbol nicht als Teil der Inhalts- oder Verknüpfungsanzeige gelesen wird.

### Epic Chronik

Die Chronik ordnet die datierten Objekte entlang der Lebenszeit Malaniuks an.

- Als Forscher:in möchte ich die Objekte als scrollenden Jahres-Zeitstrahl sehen, um die zeitliche Verteilung und Dichte der Überlieferung zu lesen.
- Als Forscher:in möchte ich von einem Chronik-Punkt direkt in das zugehörige Bestand-Detail springen, um zwischen zeitlicher und archivischer Sicht zu wechseln, ohne den Lesefluss zu verlieren.

### Epic Statistik

Die Statistik ist der Bestand in Zahlen, eine read-only Zusammenschau dessen, was keine andere Perspektive trägt (E-160). Räumliche und zeitliche Aggregate liegen in Karte und Chronik, das Beziehungsaggregat im Netzwerk.

- Als Forscher:in möchte ich Dokumenttypen, Erschließungsstand, Repertoire, Personen und Institutionen als Ranglisten sehen, um auf einen Blick zu erfassen, was die Daten sind und was sie hergeben.
- Als Gutachter:in möchte ich eine ehrliche Eingangssicht auf den Erschließungsstand, die ungetypte Datensätze und die offenen Achsen je Konvolut ausweist, um den realen Stand einschätzen zu können. Objekte ohne Verknüpfung liegen seit E-165 außerhalb der Anwendung, sie führt der Datenspiegel.
- Als Forscher:in möchte ich, dass der geteilte Filter der Sidebar auch die Statistik schneidet, um dieselbe Teilmenge in Zahlen zu sehen, die ich in Bestand, Chronik und Karte betrachte.
- Als Forscher:in möchte ich von einer Zeile mit passender Facette in den so gefilterten Bestand springen, um vom Aggregat zu den Einzelbelegen zu kommen (E-144). Bühnenrollen, Komponisten und Erschließungsachsen tragen keine Facette und bleiben deshalb ohne Sprung.

### Epic Indizes

Die Indizes erschließen die Normdaten-Register Personen, Organisationen, Orte und Werke als eigenständige Einstiege.

- Als Forscher:in möchte ich Personen, Organisationen, Orte und Werke durchsuchen und nach Wikidata-Verknüpfung filtern, um über eine normierte Entität in den Bestand einzusteigen.
- Als Forscher:in möchte ich an einer Personenzeile die Wikidata-Anreicherung (Beruf, Stimmfach, Lebensdaten) und die annotierten Beziehungen sehen, um die Entität ohne Detailsprung einzuordnen.

### Epic Karte

Die Karte zeigt die räumliche Verteilung einer gewählten Entität (E-126, entitätszentriert).

- Als Forscher:in möchte ich eine Organisation oder Person wählen und ihre Orte als Punkte mit Sicht-Aufschlüsselung sehen, um die räumliche Streuung einer Entität zu erfassen.
- Als Forscher:in möchte ich die Verortungs-Sicherheit jedes Punkts erkennen und von einem Ort zu den belegenden Dokumenten gelangen, um Kartenaussagen auf ihre Quellen zurückzuführen.
- Als Forscher:in möchte ich in der Sidebar der Karte die Reichweite nach Ländern als Liste mit Dokumentzahlen sehen und ein Land wählen können, das die Karte auf seine Orte einschränkt, um die geografische Streuung ohne Wechsel in eine andere Ansicht zu lesen (E-160, aus der Statistik übernommen).

### Epic Netzwerk

Das Netzwerk stellt das Beziehungsgeflecht um eine Fokus-Entität dar, standardmäßig Malaniuk, über Personen, Werke, Orte und Institutionen (E-160, vereinigt die früheren Ansichten Netzwerk und Verknüpfungen).

- Als Forscher:in möchte ich eine Fokus-Entität wählen und ihre Nachbarn nach Typ ein- und ausschalten, um vom Personenumfeld bis zum Schnitt über Werk, Ort und Institution dieselbe Ansicht zu nutzen.
- Als Forscher:in möchte ich in der reinen Personenansicht die Personen nach Evidenzstärke auf konzentrischen Ringen sehen, um zu erkennen, mit wem die Fokus-Entität in belegter Beziehung oder wiederkehrendem Umfeld stand.
- Als Forscher:in möchte ich explizit annotierte AgRelOn-Beziehungen von aus Ko-Präsenz abgeleiteten Verbindungen unterscheiden können, um nicht beleghafte mit erschlossenen Verbindungen zu verwechseln.
- Als Forscher:in möchte ich sehen, wie viele Dokumente des Schnitts einen raumzeitlichen oder Aufführungsbeleg tragen, um Ko-Okkurrenz nicht mit Auftrittsnachweis zu verwechseln (der Umschalter zwischen den Schärfegraden ist mit E-163 entfallen, die Zahl steht am Fokus).
- Als Forscher:in möchte ich mit dem geteilten Filter der Sidebar, mit Zeitfenster, mit der Zahl der Knoten je Typ und mit der Kategorie-Legende als Filter arbeiten und durch einen Klick auf einen Knoten zu dessen Umfeld weitergehen, um das Netzwerk verdichtet und schrittweise zu lesen.
- Als Forscher:in möchte ich im Detail-Panel eines Knotens die datengedeckten Felder, die Rollen und die Belegliste sehen und von jedem Beleg in den Bestand springen, um jede Verbindung auf ihre Quelle zurückzuführen.

### Epic Korb

Der Korb ist das Querschnitts-Werkzeug zum Sammeln und Exportieren.

- Als Forscher:in möchte ich ausgewählte Objekte in einem Korb sammeln, um eine Arbeitsauswahl über mehrere Tabs hinweg zusammenzustellen.
- Als Forscher:in möchte ich die Auswahl als CSV und BibTeX inklusive Beziehungen und Finanzangaben exportieren, um sie in eigene Arbeitsumgebungen zu übernehmen.

### Epic Provenance und Normdaten

Provenance und Normdatenanschluss durchziehen alle Sichten.

- Als Forscher:in möchte ich zu jedem angezeigten Datenpunkt die XLSX-Quellzelle (Sheet, Zeile, Datenpunkt) einsehen, um die Angabe gegen die Erfassung zu prüfen.
- Als Forscher:in möchte ich die Konfidenz und Erschließungsevidenz eines Datenpunkts erkennen, um erschlossene von dokumentarisch belegten Angaben zu unterscheiden.
- Als Forscher:in möchte ich von einer normierten Entität direkt zu ihrem Wikidata-Eintrag gelangen, um den Normdatenanschluss nachzuvollziehen.

## Funktionsumfang und Abgrenzung

Im Funktionsumfang sind sieben Tabs in drei Gruppen, Material mit Bestand und Indizes, Perspektiven mit Chronik, Karte, Netzwerk und Statistik sowie Werkzeug mit dem Korb, jeweils mit Provenance- und Normdatenanschluss (E-160). Jeder registrierte Tab ist sichtbar, verborgene Tabs gibt es seit E-140 nicht mehr. Eine neue Ansicht entsteht gegen die Forschungsfrage und die belegte Datenlage, statt einen vorhandenen Prototyp zu reaktivieren.

Bewusst nicht im Funktionsumfang sind:

- ein Backend oder eine serverseitige Suche
- eine Schreib- oder Bearbeitungsfunktion im Frontend, die Erfassung läuft ausschließlich über die XLSX-Quellen
- redaktionelle Deutungen im Interface, die nicht aus den Metadaten ableitbar sind
- eine vollständige Erschließung des Nachlasses, die Pilotstudie konzentriert sich auf wenige feinerschlossene Konvolute
- eine biografische Rekonstruktion aus den Mobilitätsdaten, gezeigt wird ein Erschließungs-Zwischenstand, kein Lebensbild
- eine eigenständige Quellenedition
- Forschungsergebnisse als Aussagen über den Gegenstand, die liegen in Publikationen
- eine präemptive Performance-Optimierung

Verschoben sind ein JSON-LD- und GEXF-Export aus den Sichten sowie EAD-Export und Zenodo-Archivierung als Betriebsmodell.

Für die Designhaltung hinter diesen Sichten (Rolle-Prefix-Chips als universelles Daten-Atom, Tabelle vor Chart, Provenance-Pille, Datenqualität wird gezeigt) siehe [design.md](design.md). Für das Laufzeitmodell, den Store und die Ansichten siehe [architecture.md](architecture.md) § Frontend. Die einzelnen Architektur- und Modellentscheidungen, die diesen Funktionsumfang tragen, werden in [journal.md](journal.md) geführt und hier nicht dupliziert.

## Offene Entscheidungen

Dieses Kapitel ist die einzige Adresse für Entscheidungen, die noch offen sind. [journal.md](journal.md) führt die getroffenen Entscheidungen und verweist für die offenen hierher. Jeder Punkt nennt den Gegenstand, den geprüften Stand, die Folge der Offenheit und die Stelle, an der die ausführliche Grundlage steht. Die vier Wurzelentscheidungen vom 2026-08-22 (E-136 bis E-139) stehen hier nicht mehr, weil alles, was sie beantworten, entschieden ist. Jeder Punkt ist am 2026-08-22 gegen Code, Vokabular oder den ausgelieferten Datensatz geprüft.

### Datenmodell und Vokabular

- **Abgrenzung von `sammlung` gegen `konvolut`.** Zu entscheiden ist, ob `sammlung` ein aggregierendes Erfassungsartefakt ist oder ein eigener semantischer Typ, also ob die beiden Begriffe einen physischen Umschlag gegen eine thematische Zusammenstellung unterscheiden oder dasselbe meinen. Im Entscheidungsblatt ausdrücklich vertagt; die Prüfung gegen [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl) zeigt `m3gim-vocab:collection` weiterhin ohne `skos:broader` auf `konvolut`, mit einer Editorial Note, die genau diese Offenheit festhält, und der Typ ist im ausgelieferten Datensatz belegt. Solange das nicht geklärt ist, bleibt unklar, ob beide Typen im Modell getrennt geführt werden müssen.
- **Status der Personen-Rolle `protagonist`.** Vermutlich liegt ein Erfassungsfehler vor, weil `protagonist` eine Bühnenrolle bezeichnet und damit in den Typ `rolle` (`m3gim-ontology:StageRole`) gehört, während der Wert heute als Rolle einer Person geführt wird. Zu entscheiden ist, ob der Eintrag umzuklassifizieren ist und ob ein Pipeline- oder ein Quellen-Fix im XLSX vorzuziehen ist. Im Entscheidungsblatt vertagt, im ausgelieferten Datensatz unverändert vorhanden. Solange der Wert dort steht, führt der Rollenbestand eine Partie unter den Akteursrollen.
- **Doppelrepräsentation der Partie.** Die Property `m3gim-ontology:sungPart` führt dieselbe Partie noch einmal als Literal am Werk, ohne Verbindung zur `StageRole`-Entität. Im Entscheidungsblatt vertagt; im ausgelieferten Datensatz stehen beide Formen nebeneinander. Zwei Repräsentationen derselben Sache nebeneinander löst auch ein besserer Name nicht auf, der Umbau der Kennung räumt die Verwechslung allein auf der Ebene der Adresse ab. Grundlage in [rename-map-paket-2.md](../data/reports/rename-map-paket-2.md) § 3.4.
- **Umsetzung des Occurrence-Modells.** Das Zielmodell ist mit E-128 entschieden, seine Umsetzung im Entscheidungsblatt vertagt. Offen sind die Pipeline-Gruppierung nach `(archivsignatur, folio, datenpunkt_id)` zu `m3gim-ontology:Occurrence` und der Erfassungs-Rollout im Team. Die Prüfung des ausgelieferten Datensatzes zeigt `m3gim-ontology:dataPointId` nur vereinzelt befüllt und keinen Occurrence-Knoten im Graphen. Solange das so bleibt, zeigen Netzwerk und geteilter Filter weiterhin den weiten Schärfegrad „im selben Dokument genannt", der enge Schärfegrad „im selben Auftritt" bleibt unerreichbar, und die Bindung von Person, Partie und Aufführung fehlt im Datensatz. Grundlage in E-125, E-127 und E-128 sowie unten in § Auftritts-Occurrence und Forschungsdatenstufe.
- **Vertragsstatus.** Der Rollenwert `nicht eingehalten` belegt heute Stellen in mehreren Properties, während `m3gim-ontology:contractStatus` und `m3gim-ontology:realized` mit dem Modellumbau aus dem Vokabular genommen und in dessen Zielmodell-Register verschoben sind, weil sie deklariert und nie befüllt waren. Die Umstellung setzt die offene Klärung mit dem Erfassungsteam voraus und ist deshalb vertagt; die Prüfung des ausgelieferten Datensatzes bestätigt beide Properties als leer. Die Anforderung A1 des Frontend-Vertrags verlangt für jeden Rollenwert eine Anzeigeform aus den Daten, und `nicht eingehalten` ist die dokumentierte Ausnahme ohne eigenes Concept. Grundlage in [date-role-model-befund.md](../data/reports/date-role-model-befund.md) § 6.
- **Inferenzregeln aus Ko-Präsenz.** Ko-Präsenz bei Aufführungen wird nicht automatisch zu `agrelon:hasColleague`, weil das gemeinsame Auftreten allein keine kollegiale Beziehung belegt. Zu entscheiden und explizit zu dokumentieren sind die Inferenzregeln, also etwa ein Schwellenwert gemeinsamer Aufführungen und ein Maß für Zeitnähe, bevor aus Ko-Präsenz eine annotierte Beziehung abgeleitet wird. Am 2026-08-22 im Datensatz geprüft, dort stehen ausschließlich die annotierten AgRelOn-Klassen ohne abgeleitete Beziehung. Solange die Regeln fehlen, bleibt die aus Ko-Präsenz gezeigte Verbindung eine Anzeige des Netzwerks ohne Entsprechung in den Daten.
- **Präzisionsstufe angereicherter Zeitwerte.** Option B der Entscheidungsvorlage vom 2026-08-21, in E-132 ausdrücklich nicht mitentschieden. Ein eigenes Feld an der angereicherten Entität würde die Unterscheidung zwischen jahresgenauer und tagesgenauer Quelle erstmals maschinell auswertbar machen, während sie heute allein implizit in der Länge des Werts steht. Umzusetzen wären je ein Term in [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl), im `@context`-Block von `scripts/transform.py` und im Propertykatalog von [data.md](data.md); am 2026-08-22 gegen das Vokabular geprüft, ein solcher Term fehlt dort. Die Vorlage bindet die Entscheidung an den Bedarf, weil der zusätzliche Term nichts trägt, solange keine Auswertung die Stufe liest.
- **Drei Detailfragen der Umbenennungskarte.** Die Sammelfreigabe vom 2026-08-22 deckt die vierzehn strittigen Übersetzungen ab, drei strukturelle Punkte der Karte bleiben ohne Entscheidung.
  - Der Alias-Schlüssel `komponist` im `@context`, ob er zu `composer` wird und damit zwei Frontend-Stellen bricht.
  - Das Instanzpräfix `stagerole_` anstelle von `role_`, und ob der Legacy-Alias im URL-Hash gebaut wird.
  - Das `_sammlung`-Suffix der Konvolut-Sammelzeilen, ob es zu `_collection` wird.

  Ohne Entscheidung schreibt der Umbau die heutigen Namen fort, und eine spätere Änderung bricht die Bookmarks der Anwendung ein zweites Mal. Grundlage in [rename-map-paket-2.md](../data/reports/rename-map-paket-2.md) § 9.1.
- **Granularität der Korrespondenz-Beziehung.** Offen ist, wie fein die AgRelOn-Korrespondenzbeziehung geführt wird. Nachtrag vom 2026-08-21 zu E-129, am 2026-08-22 gegen `scripts/transform.py` und den ausgelieferten Datensatz geprüft und dort unverändert. Solange offen, bleibt die UI-Sektion „KORRESPONDENZ" auf der heutigen Granularität.
- **Wahl der AgRelOn-Rollenproperties.** Nebenbefund der Entscheidungsvorlage vom 2026-08-21, von E-129 nicht mitentschieden. `_maybe_add_agrelon` in `scripts/transform.py` setzt an jeder erzeugten Beziehung `agrelon:hasSubject` und `agrelon:hasObject`, auch bei `agrelon:HasCorrespondent`. AgRelOn trennt die Rollenproperties nach Symmetrie. `hasSubject` und `hasObject` sind laut ihren Kommentaren für die Subjekt- und Objektrolle „of the asymmetric relationship meant by the n-ary concept" bestimmt, für symmetrische Relationen ist `agrelon:hasSubjectObject` vorgesehen, und `hasCorrespondent` ist als `owl:SymmetricProperty` deklariert. Der zweite Punkt betrifft die Orientierung. `agrelon:IsHasPatron` ist laut Kommentar „the n-ary concept for the properties hasPatron / isPatronOf". Nach der Lesart des Kommentars zu `hasSubject`, die eine Inferenz aus dem Kommentartext ist und keine ausdrückliche Regel, wäre `hasSubject` dort die `isPatronOf`-Seite, also der Mäzen, während die Pipeline die Nachlassbildnerin einsetzt. Am 2026-08-22 gegen `scripts/transform.py` geprüft, der Zustand ist unverändert.

### Erfassung und externe Zulieferung

- **Eigener Rollenindex für `m3gim-ontology:StageRole`.** Ein Index analog zu den bestehenden für Werke, Orte, Personen und Organisationen trägt mindestens die Spalten `m3gim_id`, `name`, `belongsToWork`, `voiceType` und `wikidata_id`. Voraussetzung ist ein neues Rollenindex-XLSX vom Erschließungsteam. Am 2026-08-22 gegen `data/google-spreadsheet/` geprüft, dort liegen die Arbeitsmappen für Objekte, Personen, Organisationen, Orte, Werke und Verknüpfungen ohne einen Rollenindex. Solange er fehlt, tragen die `m3gim-ontology:StageRole`-Knoten im Datensatz allein ihren Namen, ohne Werkbindung und ohne Stimmfach.

### Frontend-Vertrag für Datierungen und Rollen

Der Vertrag in [frontend-date-contract.md](../data/reports/frontend-date-contract.md) hält vier Anforderungen an die Zusammenführung der Datierungen fest. Die Anforderung A1 ist mit der Wurzelentscheidung zu den Rollenwerten und der Zerlegung des Rollenvokabulars beantwortet. Die drei übrigen tragen je eine Wahl, dazu eine Nebenbedingung.

- **Zeitanker je Record (A4), entschieden und umgesetzt.** Mit E-141 bleibt `rico:date` der einwertige Zeitanker; fehlt er, datiert die ranghöchste Datierung einer ankernden Bezugsebene und benennt sich als abgeleitet. `primaryYear` der Datenschicht ist die einzige Jahresauflösung des Frontends, abgesichert durch `tests/frontend/year-anchor.test.mjs`. Der Punkt steht hier nur noch, weil A2 und A3 an derselben Stelle ansetzen.
- **Qualifier `circa:`, `vor:` und `nach:`.** Sie werden heute an zwei Stellen weggeschnitten und sonst nirgends ausgewertet. Zu entscheiden ist, ob der Qualifier ein eigenes Feld der Datierung wird; andernfalls bleibt die Sonderbehandlung als String-Operation an zwei Stellen liegen. Grundlage in [frontend-date-contract.md](../data/reports/frontend-date-contract.md) § 3 Nebenbedingungen und in [architecture.md](architecture.md) § Erweiterung.

### Sichten und Funktionsumfang

- **Bewegungstypen als zweite Mobilitätsachse.** Die Konstante `EVENT_ROLE_TO_MOBILITY_CLUSTER` in `docs/js/data/constants.js` trägt die fünf Ereigniskategorien performativ, institutionell, korrespondenz, diskursiv und biografisch, während [research-framework.md](research-framework.md) fünf theoretische Bewegungstypen führt, nationale und geografische Mobilität, erzwungene Migration, Bildungs- und Lebensstil-Mobilität. Zu entscheiden ist, ob die Ereignis-Cluster bleiben und die Bewegungstypen als zweite Achse hinzukommen oder ob beide zusammengeführt werden. Am 2026-08-22 gegen `constants.js` geprüft, eine zweite Achse existiert nicht. Solange offen, bleibt die theoretische Typologie des Forschungsrahmens ohne Entsprechung im Interface.

### Repository

- **Unversionierte Bestände in `data/_archive/`.** Der Ordner bleibt vorerst stehen, weil Dateien darin unversioniert sind, darunter die Originaldateien der Institution; über sie entscheidet die Projektleitung gesondert. Am 2026-08-22 geprüft, git-getrackte und ignorierte Teile liegen dort nebeneinander. Solange offen, liegt Material außerhalb der Versionierung im Arbeitsverzeichnis, dessen Wiederbeschaffbarkeit nicht festgehalten ist.

## Stand und nächste Schritte

Dieser Abschnitt ist volatil und wird je Session fortgeschrieben; alles oberhalb ist der durable Kern der Spezifikation. Erledigte Arbeitspakete wandern von hier in [journal.md](journal.md), quellseitige Datenpunkte ins [Datenfehler-Register](../data/reports/reconciliation-register.md).

### Datenstand vom 2026-08-31

Der Export des Erschließungsteams vom 2026-08-31 ist übernommen (E-152). Die Verknüpfungstabelle liegt seit dieser Lieferung als CSV-Ausfuhr je Blatt vor, die übrigen fünf Arbeitsmappen bleiben XLSX; die Pipeline trägt Schutzregeln gegen die Index-Defekte des Exports, und `validate.py` hat die zwei nie nachgezogenen Absorptionen aus `transform.py` bekommen. Neu feinerschlossen sind NIM_016 und NIM_134.

Aus der Übernahme bleiben vier Stränge offen. Erstens die Modellierungsrunden 2 bis 4 aus dem Entwurf zu den neu hinzugekommenen Datenpunkten, also Seiten-Hierarchie, Vorkommnis und Beteiligung sowie Aboutness; Runde 1 mit den fünf neuen Rollenbegriffen ist gebaut. Zweitens `m3gim-ontology:contractStatus` am Vorkommnis, dessen externe Blockade entfallen ist, weil die Quelle den Vertragsstatus jetzt in der Anmerkungsspalte führt. Drittens die beiden Typwerte `Aktivität` und `dokument`, die belegt sind und keinen Zielzweig haben. Viertens die Quellfehler der Lieferung, die im [Datenfehler-Register](../data/reports/reconciliation-register.md) stehen.

### Erfassungsschema v2 und Migration des Altbestands (E-127)

Das Erfassungsschema ist auf das Long-Format mit zweistufiger `aktivitaet_id` verfeinert (E-127, operationalisiert das Occurrence-Modell E-125). Die Modellentscheidung zur Abbildung auf Performance und Participation ist mit E-128 getroffen ([journal.md](journal.md)). Der Altbestand ist migriert (`scripts/_archive/migrate-v2.py`, integrationsfertige Arbeitsmappe in `data/migration/`), die Pipeline-Umstellung steht aus.

1. **Menschlicher Durchgang (Erschließungsteam):** Mappe als Google Sheet hochladen (Post-Import-Round-Trip als Coercion-Guard), `aktivitaet_id` vergeben, Komposit-Redundanz je Beteiligung zusammenführen, die offenen Vokabular- und Namensfälle entscheiden.
2. **Vokabular als Kontrakt:** das Vokabular-Glossar als kanonische Quelle festlegen, [data.md](data.md) verweist darauf (Redundanz auflösen); `validate.py` und die SKOS-Concepts binden dagegen.
3. **Neuer Lesepfad:** `assemble-verknuepfungen.py` und `load_verknuepfungen` auf den neuen Spaltenkontrakt umstellen, `transform.py` baut Occurrence plus Beteiligungen aus den zwei ID-Ebenen; die Altschmutz-Heuristiken (`FINANCE_CURRENCY_DEFAULTS`, Kompositzellen-Parser, `(typ,rolle)`-Disambiguierung, Folio-Ko-Lokation) entfallen.
4. **Gate:** Äquivalenztest alt gegen neu über `audit-data.py` und den zellgenauen Crosscheck; partielle Gruppierung muss der Lesepfad tragen (gruppierte Zeilen → Performances, Rest → Mention plus Coverage-Report).

Extern offen bleibt daneben das Rollenindex-XLSX vom Erschließungsteam für einen eigenen StageRole-Index (§ Offene Entscheidungen, Eigener Rollenindex).

### Auftritts-Occurrence und Forschungsdatenstufe

Aus der Partner-Runde Juni 2026 stammt die Linie bündeln, referenzieren, differenzieren, verbinden (E-125).

1. **Bündeln.** Die Spalte `datenpunkt_id` füllen, sodass zusammengehörige Verknüpfungszeilen einen Auftritt bilden. Modell und Erfassungskonvention sind entschieden ([data.md](data.md) § Verknüpfungsmechanismus, [data-model.md](data-model.md) § RiC-O-Kern und m3gim-Erweiterung sowie § Erfassung); offen sind die Pipeline-Gruppierung nach `(archivsignatur, folio, datenpunkt_id)` zu `m3gim-ontology:Occurrence`, testgetrieben, und der Erfassungs-Rollout im Team.
2. **Referenzieren.** Namen in der Verknüpfungstabelle über Auswahllisten als Index-ID führen statt auszuschreiben, beginnend bei den Personen. Erfassungsentscheidung, noch nicht umgesetzt.
3. **Differenzieren.** Gastspiel und Tournee als `m3gim-ontology:mode` an der Occurrence statt als konkurrierender Rollenwert (Teil von E-125).
4. **Verbinden.** Netzwerk und Cross-View-Filter zeigen heute den weiten Schärfegrad „im selben Dokument genannt“; mit gefüllter `datenpunkt_id` werden sie auf den engen Schärfegrad „im selben Auftritt“ präzise.

Datenstufen darauf aufbauend: Stufe 1 ohne Erfassungsänderung (Partner-Reconciliation der benannten AgRelOn-Partner gegen Wikidata, Orts-Casing), Stufe 2 mit `datenpunkt_id`-Bündelung (Institution und Ensemble pro Auftritt auswertbar), Stufe 3 Werk plus Partie am Auftritt (Repertoire×Ort).

### Frontend-Refactoring und Interface-Ausbau (Plan vom 2026-09-03)

Der Plan entstand aus drei Code-Audits über Views, CSS und HTML sowie die Kernschichten und aus der Durchsicht der Seitenstrukturen gegen die Forschungsfragen. Seine Schritte 1 bis 7 sind am 2026-09-03 umgesetzt, also die Benennung von View-Modulen und Stylesheets nach Tab-Key (E-159), der Schichtenschnitt in Orchestrator, reine Datenschicht und eigenes Zeichenmodul, das eine Sidebar-Gerüst mit fester Spaltenreihenfolge (E-166), die geteilten CSS-Primitiven samt Container Query am Gerüst, die Zusammenführung von Netzwerk und Verknüpfungen zu einer Ansicht mit Fokus-Wahl und Knotentyp-Schaltern, die Reduktion der Statistik auf den Bestand in Zahlen mit den fünf Ansichten Dokumenttypen, Erschließungsstand, Repertoire, Personen und Institutionen sowie die Tab-Leiste in drei sichtbaren Gruppen mit Pfeiltasten und Roving Tabindex (E-160). Die Länder-Reichweite trägt seither die Karten-Sidebar, die zeitliche Entwicklung der Dekaden-Header der Chronik und das Beziehungsaggregat das Netzwerk. Die Finanzansicht und die Mobilitätsansichten der Statistik sind entfallen. Den gebauten Stand führt [architecture.md](architecture.md) § Frontend, die Regeln dahinter [design.md](design.md). Die Durchsicht am laufenden Bild vom Abend des 2026-09-03 ist ebenfalls gebaut, also Markenband und weiße Tab-Zeile, die warme Flächenfamilie mit dem Blau als einzigem Akzent, die Schriftregel, der Bestand ohne Sortierung in Signaturfolge, der entschlackte Konvolut-Kopf, die Zustände des Dokumenttyp-Baums und ein Hausstil-Durchgang über die Stylesheets. Der Verlauf steht in [journal.md](journal.md) als Session 78, die Entscheidungen als E-185 bis E-204.

Offen bleiben drei UI-Bausteine, je eine Entscheidung der Projektleitung.

8. Ein Detail-Panel-Baustein für Kopf, Chips und Belegliste neben Visualisierungen, während das Inline-Detail die Form im Bestand bleibt.
9. Ein eigener leichter Tooltip per Hover und Fokus statt nativer `title`-Attribute, weil Regel 8 in [design.md](design.md) den Tooltip zum Träger der Aufschlüsselung macht.
11. Lade- und Fehlerzustand aus Tokens statt Inline-Styles.

Daneben stehen zwei Punkte an der Wissensbasis. Ob der Testkatalog in [testing.md](testing.md) künftig aus den Docstrings erzeugt wird, ist eine offene Entscheidung. Die Personas in [research-framework.md](research-framework.md) warten auf die Zulieferung der Projektleitung. Die offenen Übergaben an Frontend, Backend und Erschließungsteam führt [handoff.md](handoff.md).

Weiterhin offen aus früheren Ständen:

- `m3gim-ontology:dataQualityFlag` an den Record-Ebenen rendern, an denen er heute nur in den Daten liegt; im Chip ist er umgesetzt ([design.md](design.md) Regel 10).
- Auftritts-Occurrence umsetzen, sobald die Spalte `datenpunkt_id` gefüllt ist (§ Auftritts-Occurrence und Forschungsdatenstufe).
- Karte: Werk als wählbare Entität, feinere Werk- und Personen-Ebene pro Ort, fehlende Stadt-Koordinaten über die Reconciliation-Pipeline (siehe E-126 „Offen").
- Export um JSON-LD und GEXF ergänzen. CSV und BibTeX sind gebaut, die beiden übrigen Formate fehlen.
- Das Inline-Detail zu einer Auftrittssicht umbauen, mit einem Pipeline-Schritt davor, weil Box 6 jede Partie zweimal führt, als blanke `rolle`-Zeile und als Komposit aus Rolle und Person, von denen nur das Komposit `hasPerformer` trägt. Die Kindzeile schreibt „o. D.“, obwohl der abgeleitete Anker aus E-141 vorliegt (siehe [handoff.md](handoff.md)).

### Deferred

- `scripts/build-views.py` und `scripts/audit-data.py` lesen noch das durch E-96 entfernte `m3gim:hasPerformanceRole` und liefern für diese Spuren leere Listen, bis sie auf `m3gim-ontology:hasPerformance`/`m3gim-ontology:StageRole` umgestellt werden. <!-- vocab-exempt: nennt das mit E-96 entfernte Attribut -->
- Eine leichtgewichtige Reifikation über `m3gim:Statement` wird nur dort ergänzt, wo die Provenance nicht bereits aus der Record-URI folgt. <!-- vocab-exempt: nennt ein vorgeschlagenes, nicht gebautes Muster -->
- Zenodo-Archivierung und EAD-Export gehören zum Betriebsmodell und werden später angegangen.

### Datenqualität

Instanzbezogene Datenfehler, Abgleichfehler und die strukturellen Quell-Fixes stehen kanonisch im [Datenfehler-Register](../data/reports/reconciliation-register.md); vor Bearbeitung gegen den Quality-Snapshot verifizieren. Fortlaufend im Erfassungsteam: die Verknüpfungsrate erhöhen (Schwerpunkt lag auf den Konvoluten um NIM_003, NIM_004 und NIM_007, Einzelobjekte sind weitgehend unverknüpft) und den mehrheitlich offenen Bearbeitungsstand schließen.

### Status-Tracker

Nur offene, blockierte und zurückgestellte Pakete; Erledigtes steht in [journal.md](journal.md).

| Arbeitspaket | Status | Notiz |
|---|---|---|
| Erfassungsschema v2, Pipeline-Umstellung | wartet | auf den menschlichen Durchgang des Erschließungsteams; Modellentscheidung E-128 liegt vor |
| Auftritts-Occurrence, Pipeline-Gruppierung | offen | `(archivsignatur, folio, datenpunkt_id)` → `m3gim-ontology:Occurrence`, testgetrieben |
| Weitere Reconciliation-Runde | optional | Unmatched-Restliste, nicht blockierend |
| Erschließungsvorschläge durchsehen | wartet | auf das Erschließungsteam; `scripts/propose-links.py` legt die Liste vor, bestätigte Zeilen gehen in die Verknüpfungstabelle (E-147) |
| Test-Regression NIM_168 | quellseitig offen | `test_04` mit xfail strict gelockt, Folio-Granularität zwischen den Quelltabellen, siehe Partner-Übergabeliste |
| Nächste Datenstufe Forschungsdaten | offen | Stufen 1 bis 3, siehe oben |
| Modellierungsrunden 2 bis 4 zum Stand 2026-08-31 | offen | Seiten-Hierarchie, Vorkommnis und Beteiligung, Aboutness; Runde 1 (Rollenbegriffe) ist gebaut |
| Typwerte `Aktivität` und `dokument` ohne Zielzweig | offen | belegt in der Quelle, fallen heute still weg |
| Werteliste Typ-Rolle nachziehen | wartet | der Datenspiegel zeigt legitime Modell-Rollen (publikum, beleuchter, repetitor u. a.), die im Erfassungs-Dropdown fehlen; Abgleich mit dem Erschließungsteam |
| Quellfehler der Lieferungen 2026-08-31/09-01 | übergeben | Partner-Übergabeliste unter `data/reports/source-errors-handover-2026-09-01.md`, sichtbar im Datenspiegel-Lauf |
| Deferred Aufräumarbeiten und Modell-Erweiterungen | zurückgestellt | siehe § Deferred |
