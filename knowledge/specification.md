---
title: Spezifikation
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: reviewed
language: de
version: 0.4
created: 2026-06-17
updated: 2026-08-22
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
related: [research-framework, data, data-entry-guidelines, frontend-architecture, design, architecture-decisions, data-errors, testing, pipeline-architecture]
---

# Spezifikation

Dieses Dokument trägt die Projektidentität, den Substanz- und Funktionsumfang von M³GIM und den operativen Stand. Es beschreibt, was die Anwendung leistet und für wen, und führt am Ende in einem ausdrücklich volatilen Abschnitt die nächsten Schritte. Das Datenmodell wird in [data.md](data.md) geführt, die Laufzeitarchitektur in [frontend-architecture.md](frontend-architecture.md), die Designhaltung in [design.md](design.md), die getroffenen Architektur- und Modellentscheidungen in [architecture-decisions.md](architecture-decisions.md), die quellseitig zu behebenden Datenpunkte im [Datenfehler-Register](data-errors.md). Laufende Zählstände stehen ausschließlich im Quality-Snapshot (`data/reports/quality-snapshot.md`).

## Projekt

M³GIM (Mapping Mobile Musicians) erschließt den Teilnachlass der Mezzosopranistin Ira Malaniuk (1919–2009, UAKUG/NIM am Universitätsarchiv der KUG Graz) digital und macht ihre Mobilität und Wissensproduktion im Graz der Nachkriegszeit auswertbar. Den technischen Kern bilden eine Python-Datenpipeline, die die archivische Erfassung nach JSON-LD überführt, und eine statische Single-Page-Anwendung auf GitHub Pages. Die laufende Anwendung ist unter https://dhcraft.org/m3gim erreichbar.

### Datengrundlage

Grundlage ist der archivisch erfasste Teilnachlass UAKUG/NIM in den Bestandsgruppen Hauptbestand, Plakate und Tonträger, erfasst durch das Archivteam der KUG nach der projekteigenen [Erfassungsrichtlinie](data-entry-guidelines.md). Das Projekt verarbeitet diese Erfassung, es produziert die Quellbeschreibung nicht selbst. Modell, Vokabulare und Quellen stehen im Detail in [data.md](data.md).

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

Die Anwendung präsentiert den erschlossenen Bestand in mehreren komplementären Perspektiven auf denselben zugrunde liegenden Graphen, ohne dass beim Wechsel der Perspektive ein Feature- oder Datenmodellwechsel stattfindet.

Sie macht den archivischen Bestand in seiner hierarchischen Konvolut-Struktur durchsuch- und filterbar und erlaubt das Aufklappen einzelner Objekte zu einem Detailbild mit allen erfassten Verknüpfungen, Finanzangaben, Beziehungen und raum-zeitlichen Ereignissen.

Sie ordnet die datierten Objekte zeitlich an und macht die Karrierechronologie samt ihrer Erschließungslücken sichtbar.

Sie aggregiert den Bestand zu einer visuellen Zusammenschau, die zeigt, was die Daten sind und was mit ihnen möglich wird.

Sie erschließt die Normdatenindizes Personen, Organisationen, Orte und Werke als eigenständige Einstiege mit Wikidata-Anreicherung und Querverweisen in den Bestand.

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

Annahme: Die Anwendung adressiert ohne weitere Tuning-Maßnahmen den aktuellen Bestandsumfang. Eine präemptive Performance-Optimierung wird bewusst nicht betrieben (siehe E-25 in [architecture-decisions.md](architecture-decisions.md)). Bei deutlich größerem Bestand in einem Folgeprojekt wäre dies neu zu bewerten.

## Epics und User Stories

Die folgenden Epics decken die aktiven Funktionsbereiche ab. Die Tabs Bestand, Chronik, Statistik, Indizes, Karte, Netzwerk und Wissenskorb sind sichtbar; die Perspektiv-Tabs Mobilitäts-Atlas, Repertoire und Biogramm sind aktuell verborgen und werden iterativ reaktiviert. Die Stories spiegeln den belegten Funktionsumfang wider.

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

Die Indizes erschließen die Normdaten-Register Personen, Organisationen, Orte und Werke als eigenständige Einstiege.

- Als Forscher:in möchte ich Personen, Organisationen, Orte und Werke durchsuchen und nach Wikidata-Verknüpfung filtern, um über eine normierte Entität in den Bestand einzusteigen.
- Als Forscher:in möchte ich an einer Personenzeile die Wikidata-Anreicherung (Beruf, Stimmfach, Lebensdaten) und die annotierten Beziehungen sehen, um die Entität ohne Detailsprung einzuordnen.

### Epic Karte

Die Karte zeigt die räumliche Verteilung einer gewählten Entität (E-126, entitätszentriert).

- Als Forscher:in möchte ich eine Organisation oder Person wählen und ihre Orte als Punkte mit Sicht-Aufschlüsselung sehen, um die räumliche Streuung einer Entität zu erfassen.
- Als Forscher:in möchte ich die Verortungs-Sicherheit jedes Punkts erkennen und von einem Ort zu den belegenden Dokumenten gelangen, um Kartenaussagen auf ihre Quellen zurückzuführen.

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

Annahme: Die folgenden Stories beschreiben den in vorigen Sessions gebauten, derzeit verborgenen Funktionsstand der Perspektiv-Tabs Mobilitäts-Atlas, Repertoire und Biogramm. Sie sind als Zielbild der iterativen Reaktivierung zu verstehen, nicht als aktuell ausgelieferter Funktionsumfang.

- Als Forscher:in möchte ich die verorteten Ereignisse auf einer Karte mit Zeitstrahl-Filter sehen (Mobilitäts-Atlas), um die räumliche Mobilität Malaniuks nachzuvollziehen.
- Als Forscher:in möchte ich das Bühnenrepertoire und die Komponisten als Aggregat-Tabellen mit Belegaufschlüsselung sehen (Repertoire), um den künstlerischen Schwerpunkt zu erfassen.
- Als Forscher:in möchte ich die Lebensstationen und Belege auf einem biografischen Zeitstrahl sehen (Biogramm), um den Lebenslauf entlang der Quellen zu lesen.

## Funktionsumfang und Abgrenzung

Im Funktionsumfang sind die sichtbaren Tabs Bestand, Chronik, Statistik, Indizes, Karte, Netzwerk und der Wissenskorb als Werkzeug, jeweils mit Provenance- und Normdatenanschluss. Die Perspektiv-Tabs Mobilitäts-Atlas, Repertoire und Biogramm sind als Code, CSS und Store-Maps vorhanden, aber verborgen und werden iterativ reaktiviert.

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

Für die Designhaltung hinter diesen Sichten (Rolle-Prefix-Chips als universelles Daten-Atom, Tabelle vor Chart, Provenance-Pille, Datenqualität wird gezeigt) siehe [design.md](design.md). Für das Laufzeitmodell, den Store und die Ansichten siehe [frontend-architecture.md](frontend-architecture.md). Die einzelnen Architektur- und Modellentscheidungen, die diesen Funktionsumfang tragen, werden in [architecture-decisions.md](architecture-decisions.md) geführt und hier nicht dupliziert.

## Stand und nächste Schritte

Dieser Abschnitt ist volatil und wird je Session fortgeschrieben; alles oberhalb ist der durable Kern der Spezifikation. Erledigte Arbeitspakete wandern von hier in [journal.md](journal.md) und [architecture-decisions.md](architecture-decisions.md), quellseitige Datenpunkte ins [Datenfehler-Register](data-errors.md).

### Erfassungsschema v2 und Migration des Altbestands (E-127)

Das Erfassungsschema ist auf das Long-Format mit zweistufiger `aktivitaet_id` verfeinert (E-127, operationalisiert das Occurrence-Modell E-125). Die Modellentscheidung zur Abbildung auf Performance und Participation ist mit E-128 getroffen ([architecture-decisions.md](architecture-decisions.md)). Der Altbestand ist migriert (`scripts/migrate-v2.py`, integrationsfertige Arbeitsmappe in `data/migration/`), die Pipeline-Umstellung steht aus.

1. **Menschlicher Durchgang (Erschließungsteam):** Mappe als Google Sheet hochladen (Post-Import-Round-Trip als Coercion-Guard), `aktivitaet_id` vergeben, Komposit-Redundanz je Beteiligung zusammenführen, die offenen Vokabular- und Namensfälle entscheiden.
2. **Vokabular als Kontrakt:** das Vokabular-Glossar als kanonische Quelle festlegen, [data.md](data.md) verweist darauf (Redundanz auflösen); `validate.py` und die SKOS-Concepts binden dagegen.
3. **Neuer Lesepfad:** `assemble-verknuepfungen.py` und `load_verknuepfungen` auf den neuen Spaltenkontrakt umstellen, `transform.py` baut Occurrence plus Beteiligungen aus den zwei ID-Ebenen; die Altschmutz-Heuristiken (`FINANCE_CURRENCY_DEFAULTS`, Kompositzellen-Parser, `(typ,rolle)`-Disambiguierung, Folio-Ko-Lokation) entfallen.
4. **Gate:** Äquivalenztest alt gegen neu über `audit-data.py` und den zellgenauen Crosscheck; partielle Gruppierung muss der Lesepfad tragen (gruppierte Zeilen → Performances, Rest → Mention plus Coverage-Report).

Extern offen bleibt daneben das Rollenindex-XLSX vom Erschließungsteam für einen eigenen StageRole-Index ([architecture-decisions.md](architecture-decisions.md) § Offene Modellentscheidungen).

### Auftritts-Occurrence und Forschungsdatenstufe

Aus der Partner-Runde Juni 2026 stammt die Linie bündeln, referenzieren, differenzieren, verbinden (E-125).

1. **Bündeln.** Die Spalte `datenpunkt_id` füllen, sodass zusammengehörige Verknüpfungszeilen einen Auftritt bilden. Modell und Erfassungskonvention sind entschieden ([data.md](data.md) § 4/7, [data-entry-guidelines.md](data-entry-guidelines.md)); offen sind die Pipeline-Gruppierung nach `(archivsignatur, folio, datenpunkt_id)` zu `m3gim:Occurrence`, testgetrieben, und der Erfassungs-Rollout im Team.
2. **Referenzieren.** Namen in der Verknüpfungstabelle über Auswahllisten als Index-ID führen statt auszuschreiben, beginnend bei den Personen. Erfassungsentscheidung, noch nicht umgesetzt.
3. **Differenzieren.** Gastspiel und Tournee als `m3gim:mode` an der Occurrence statt als konkurrierender Rollenwert (Teil von E-125).
4. **Verbinden.** Verknüpfungen-Tab und Cross-View-Filter zeigen heute den weiten Schärfegrad „im selben Dokument genannt“; mit gefüllter `datenpunkt_id` werden sie auf den engen Schärfegrad „im selben Auftritt“ präzise.

Datenstufen darauf aufbauend: Stufe 1 ohne Erfassungsänderung (Partner-Reconciliation der benannten AgRelOn-Partner gegen Wikidata, Orts-Casing), Stufe 2 mit `datenpunkt_id`-Bündelung (Institution und Ensemble pro Auftritt auswertbar), Stufe 3 Werk plus Partie am Auftritt (Repertoire×Ort).

### Interface-Ausbau

1. Reaktivierung und Redesign der verborgenen Perspektiv-Tabs Repertoire und Biogramm; pro Tab Daten-Kontrakt gegen den Store, Rolle-Prefix-Chip-Muster, Meta-Fresh-Check vor dem Enable. Reihenfolge offen.
2. Cross-View-Filter bauen (Milestone 4). Gescopt in [frontend-architecture.md](frontend-architecture.md) § Cross-View-Filter, Bau operator-gated; erster realer Baustein ist der Statistik-Zeitfilter (E-122).
3. Facetten- und Filter-Funktion ausbauen. Heute je Facette Single-Select mit UND-Verknüpfung (E-117); offen sind Mehrfachauswahl beziehungsweise ODER innerhalb einer Facette und eine einheitliche Filter-UX über die Views.
4. AgRelOn-Granularität schärfen über `HasAddressee` und `HasSender` statt des pauschalen `HasCorrespondent`, alternativ über eine symmetrische Beziehung.
5. Im Statistik-Tab den Durchstich vom Aggregat zur Quelle ergänzen, analog zum Aggregat→Quelle-Muster der Chronik (E-124).
6. Karte: Werk als wählbare Entität, feinere Werk- und Personen-Ebene pro Ort, fehlende Stadt-Koordinaten über die Reconciliation-Pipeline (siehe E-126 „Offen“).
7. Indizes-Seite optimieren; konkrete Punkte noch zu schärfen.
8. Die Netzwerk-Spur im Biogramm ergänzen, sobald die AgRelOn-Relationen Validity-Dates tragen (blockiert).

### Offene Operator-Entscheidungen

Gesammelt, damit sie nicht über das Dokument verstreut sind; jede braucht eine ausdrückliche Operator-Freigabe oder -Absage.

- Mobilitäts-Atlas stilllegen oder als zweite Sicht reaktivieren (durch die entitätszentrierte Karte E-126 fachlich überholt; Reaktivierung erfordert Leaflet-Einbindung).
- Bestand-Default-Modus, erschlossen gegen alle (E-116), und der Forschungsscope-Ausschluss Plakate/Tonträger (`EXCLUDED_DFT`).
- Cross-View-Filter Milestone 4 bauen (propose-first gated).
- Verfall oder Weiterbau der nicht konsumierten Derivate `partitur.json`, `matrix.json`, `kosmos.json` samt zugehöriger Tests. Richtungsentscheid der Operatorin (Juli 2026): nicht einfach löschen, sondern das darin kodierte kuratierte Wissen (Lebensphasen-Periodisierung, Engagement-Zeiträume, Personen-Kategorien) sichern und in eine neu konzipierte View einfließen lassen; die Heuristik-Fallbacks (Titel-Keyword-Matching) werden nicht übernommen.
- Live-Deploy der nicht deployten Frontend-Stände.

### Deferred

- Die Derivate `partitur.json`, `matrix.json`, `kosmos.json` samt `loadPartitur()` und `test_08_partitur.py` werden weiter gebaut, aber von keinem aktiven Tab konsumiert; Entfernung hängt an der Operator-Entscheidung oben.
- `scripts/build-views.py` und `scripts/audit-data.py` lesen noch das durch E-96 entfernte `m3gim:hasPerformanceRole` und liefern für diese Spuren leere Listen, bis sie auf `m3gim:hasPerformance`/`m3gim:StageRole` umgestellt werden.
- Eine leichtgewichtige Reifikation über `m3gim:Statement` wird nur dort ergänzt, wo die Provenance nicht bereits aus der Record-URI folgt.
- Zenodo-Archivierung und EAD-Export gehören zum Betriebsmodell und werden später angegangen.

### Datenqualität

Instanzbezogene Datenfehler, Abgleichfehler und die strukturellen Quell-Fixes stehen kanonisch im [Datenfehler-Register](data-errors.md); vor Bearbeitung gegen den Quality-Snapshot verifizieren. Fortlaufend im Erfassungsteam: die Verknüpfungsrate erhöhen (Schwerpunkt lag auf den Konvoluten um NIM_003, NIM_004 und NIM_007, Einzelobjekte sind weitgehend unverknüpft) und den mehrheitlich offenen Bearbeitungsstand schließen.

### Status-Tracker

Nur offene, blockierte und zurückgestellte Pakete; Erledigtes steht in [journal.md](journal.md) und [architecture-decisions.md](architecture-decisions.md).

| Arbeitspaket | Status | Notiz |
|---|---|---|
| Erfassungsschema v2, Pipeline-Umstellung | wartet | auf den menschlichen Durchgang des Erschließungsteams; Modellentscheidung E-128 liegt vor |
| Auftritts-Occurrence, Pipeline-Gruppierung | offen | `(archivsignatur, folio, datenpunkt_id)` → `m3gim:Occurrence`, testgetrieben |
| Cross-View-Filter (Milestone 4) | gescopt, operator-gated | Scope in [frontend-architecture.md](frontend-architecture.md) § Cross-View-Filter |
| Reaktivierung Repertoire, Biogramm | offen | pro Tab Daten-Kontrakt, Chip-Muster, Meta-Fresh-Check |
| Mobilitäts-Atlas | operator-offen | stilllegen oder als zweite Sicht reaktivieren |
| AgRelOn-Granularität | offen | `HasAddressee`/`HasSender` statt pauschal |
| Biogramm-Netzwerk-Spur | blockiert | wartet auf AgRelOn-Validity-Dates |
| Weitere Reconciliation-Runde | optional | Unmatched-Restliste, nicht blockierend |
| Test-Regression NIM_168 | quellseitig offen | `test_04` mit xfail strict gelockt, Folio-Granularität zwischen den Quelltabellen, siehe Datenfehler-Register QF-07 |
| Nächste Datenstufe Forschungsdaten | offen | Stufen 1 bis 3, siehe oben |
| Anreicherungslauf nach der Präzisions-Normalisierung | offen | `enrich-wikidata.py --force` plus Transformationslauf; bis dahin trägt der Datensatz die Wikidata-Nullform, `test_39` hält das mit xfail strict, siehe Datenfehler-Register AF-04 und E-132 |
| Deferred Aufräumarbeiten und Modell-Erweiterungen | zurückgestellt | siehe § Deferred |
