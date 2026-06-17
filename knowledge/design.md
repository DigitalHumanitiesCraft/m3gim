---
title: Design
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.2
created: 2026-02-19
updated: 2026-06-17
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Design
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/design
topics: ["[[Information Visualisation]]", "[[Scholar-Centered Design]]"]
related: [architecture, research, decisions, data-entry-guidelines]
---

# Design

> Designhaltung, Tab-Architektur, Designregeln, Interaktions- und Daten-Präsentations-Muster, das Designsystem mit seinen Design-Tokens sowie die destillierten Lektionen aus den entfernten D3-Visualisierungen. Wie das Frontend technisch gebaut ist (Laufzeitmodell, Module, Store, Routing), steht in [architecture.md](architecture.md). Diese Fassung basiert auf zwei Mockup-Ansichten (Archiv, Repertoire) und den Erfahrungen aus den sechs entfernten D3-Prototypen.

## Grundhaltung

Das Interface positioniert sich als **Forschungswerkzeug**, nicht als Dashboard. Es zeigt den Archivbestand wie eine Edition ihre Quellen — mit sichtbarer Provenienz, ehrlichem Erschließungsstand und einer Typografie, die zur Lesehaltung passt. Datenqualität wird nicht kaschiert; Lücken und Duplikate stehen so da, wie sie im Bestand sind.

## Tab-Architektur

Welche Tabs tatsächlich sichtbar sind, legt `docs/js/ui/router.js::VISIBLE_TABS` fest — das ist die Source of Truth, nicht dieses Dokument. Aktueller Stand: sichtbar sind **Bestand · Chronik · Statistik · Indizes · Netzwerk · Wissenskorb** (Netzwerk zuletzt in Session 46 reaktiviert, E-93). Die verbleibenden drei Perspektiv-Tabs — Mobilitäts-Atlas, Repertoire, Biogramm — sind per `hidden`-Attribut ausgeblendet; Code, CSS und Store-Maps bleiben erhalten, Hash-URLs auf versteckte Tabs werden auf Bestand umgebogen (E-81, präzisiert durch E-86 und E-93). Reaktivieren = `hidden` im HTML entfernen + Eintrag in `VISIBLE_TABS` ergänzen. Qualitätssicht läuft team-intern über `data/reports/quality-snapshot.md` und ist kein eigener Tab.

**Leitprinzip „nur bearbeitet":** Bestand, Chronik und Indizes zeigen ausschließlich Records bzw. Einträge mit Verknüpfungen. Konvolute ohne erschlossene Folios, Records mit `countLinks === 0`, Folios ohne Links innerhalb eines Konvoluts und Index-Einträge ohne Record-Referenz werden gar nicht erst gerendert. Plakate und Tonträger sind pauschal ausgeblendet (`EXCLUDED_DFT`). Die Gesamt-Bestandszahl und Verknüpfungsrate stehen ausschließlich im Quality-Snapshot. Begründung: das Interface positioniert sich als Forschungswerkzeug für substantielles Material — Erschließungs-Platzhalter sind Rauschen, kein Inhalt.

| Tab | Status | Gegenstand | Primäre Datenquelle im Store | Form |
|---|---|---|---|---|
| **Bestand** | aktiv | Einzelbelege in Konvolut-Hierarchie; Konvolut-Meta-Chips (Top-3-Dokumenttyp + Status-Mix) direkt in der Zeile (E-82), Kinder werden innerhalb ihres Konvoluts sortiert (E-83), Facet-Filter (Dokumenttyp, Person), Record-Inline-Detail mit fünf funktionalen Blöcken | `store.records`, `store.konvolutMeta` (inkl. `docTypeCounts`, `statusCounts`, `processedCount`), `store.agentRelations`, `store.finances`, `store.recordToEvents` | Record-Tabelle mit Rolle-Prefix-Chips, Konvolut-Meta-Chips, Provenance-Pill |
| **Chronik** | aktiv | Scrollender Jahres-Zeitstrahl 1919–2009 (+ Ausreißer-Jahre), Records als klickbare Punkte pro Jahr, leere Jahre sichtbar als Erschließungsspiegel | `store.allRecords` (gefiltert über `unprocessedIds`), `store.recordToEvents`, `store.mobilityEvents` | Vertikale Achse, Jahres-Labels links, Dot-Dichte = Jahresbelegung, Record-Chips rechts |
| **Statistik** | aktiv | Read-only Showroom des Bestandes mit Dokumenttypen, Mobilitätssichten, Geografie, Netzwerk, Repertoire und Finanzen (E-85, E-89, E-92), Tech-Reporting ausgelagert in den Quality-Snapshot | gesamter Store, aggregiert pro Sektion | Sechs Sektionen aus pure-function Aggregation |
| **Indizes** | aktiv | Aggregierte Übersicht Personen, Organisationen, Orte, Werke; Cross-Grid-Linking | `store.persons`, `store.organizations`, `store.locations`, `store.works` (nur Einträge mit `records.size > 0`) | Vier parallele Grids, `renderNameCell()` mit Beziehungsbadges |
| **Mobilitäts-Atlas** | verborgen | Raumzeitliche Aktivität, Leaflet + D3-Zeitstrahl + Detailpanel | `store.mobilityEvents` | Karte + Zeitstrahl + Detailpanel |
| **Repertoire** | verborgen | Bühnenrepertoire und Komponisten, nach Belegtyp aggregiert | `store.works` + DFT-Typ der Records | Parallele Aggregat-Tabellen mit Inline-Breakdown |
| **Biogramm** | verborgen | Chronologische Gesamtsicht entlang der Lebensspanne 1919–2009 | `store.mobilityEvents`, `store.records` mit Datum | D3-Zeitstrahl mit zwei Spuren |
| **Netzwerk** | aktiv | Konzentrische Personen-Visualisierung um Malaniuk (E-93): zwei Ringe nach Evidenzstärke (harte Beziehung / Umfeld), Rolle als Füllfarbe, zwei Linientypen explizit unterschieden — gerade Radial = `agrelon:*` (explizit annotiert), geschwungene Bezier = Ko-Okkurrenz (aus Dokumenten abgeleitet), beide mit SVG-`<title>`-Tooltips + eigenem Sichtbarkeits-Toggle | `store.persons`, `store.agentRelations`, `store.records` | D3-SVG-Viz mit Filter-Sidebar, Zoom/Pan, Zeitfenster, Detail-Panel |
| **Wissenskorb** | aktiv | Querschnitts-Merkliste mit CSV-/BibTeX-Export; Cards im Rolle-Prefix-Chip-Muster mit AgRelOn + Finanzen + STE-Events | `store.records` gefiltert durch Korb-IDs + `store.agentRelations`, `store.finances`, `store.recordToEvents` | Card-Liste, Werkzeug-Tab; localStorage-Persistenz |

Tab-Namen sind inhaltlich (keine „Charts"/„Views"-Floskeln).

## Designregeln

### 1. Typografie als Bedeutungsträger

- **Source Serif 4** für Titel und Record-Bezeichner — signalisiert Textarbeit, nicht Admin-Tool.
- **Monospace** für Signaturen und technische IDs — farblich leicht abgesetzt, so dass die ID als Anker beim Scannen sofort erkennbar ist.
- **UI-Sansserif** für Chips, Meta-Zeilen, Navigation.

Die typografische Trennung zwischen ID (Mono) und Inhalt (Serif) reduziert die kognitive Last beim Scannen einer Record-Liste.

### 2. Warmer Papier-Hintergrund, funktionale Akzentfarben

Hintergrund creme/warm. Akzentfarben sparsam und semantisch: KUG-Blau für Interaktion, Signal-Grün für Verknüpfungen, Signal-Rot ausschließlich für die Flucht 1944. Chip-Farbfamilien eng, aber differenziert — Rollen-Cluster (blau-türkis für Wer-war-beteiligt, rotbraun für Verkörperung) ohne Legende lesbar.

### 3. Rolle-Prefix-Chips als universelles Daten-Atom

Jeder semantische Datenpunkt wird als Chip mit Uppercase-Rollenbezeichner und Wert gezeigt: `AUFFUEHRUNGSORT München`, `KOMPONIST Beethoven, Ludwig van`, `DIRIGENT Hindemith, Paul`. Dasselbe Chip-Muster trägt:

- Einzelbelege im Archiv-Inline-Detail (konkrete Werte)
- Aggregatverteilungen im Repertoire und Netzwerk (mit Count: `AUFFÜHRUNG 5`, `KORRESP 10`)
- AgRelOn-Beziehungen im Archiv-Inline-Detail
- Chips in Atlas-Popups und Biogramm-Summary

Implementiert als `buildRoleChip({prefix, value, cluster, xlsxSource, wikidata, onClick, compact})` in `docs/js/views/archiv-inline-detail.js`.

Visuell dieselbe Primitive, semantisch kontextabhängig. Ein einziges robustes Muster statt fünf Darstellungsformen.

**Zweite Farbachse für Chronik-Stations-Chips (Session 36, M3).** Zusätzlich zur Rollen-Cluster-Farbe (Rolle-Kategorie wie Ort, Person, Beziehung) tragen Chronik-Stations-Chips einen linken Akzent-Balken in einer der fünf Mobilitätssichten-Farben (`--color-sicht-performativ|institutionell|korrespondenz|diskursiv|biografisch`). Diese zweite Achse macht die in [data.md § 10](data.md) spezifizierten analytischen Perspektiven direkt sichtbar. Mapping in `EVENT_ROLE_TO_MOBILITY_CLUSTER` (constants.js), Chip-Modifier `.chip--mobility-*`.

### 4. Inline-Breakdown statt Drilldown-Panel

Aggregatzellen zeigen die Verteilung der Untertypen direkt in der Zelle, gefolgt von der Summe als Ranking-Anker:
`ERWÄHNT 7 · AUFFÜHRUNG 4 · REPERTOIRE 1 → 12`

Das ersetzt für viele Fragen ein Modal-Panel. Drilldown bleibt für Fälle, in denen Einzelbelege gelistet werden müssen.

### 5. Confidence als Micro-Dot pro Record

`agrelon:hasConfidenceValue` wird als farbiger Punkt mit numerischem Wert inline angezeigt (`● 1.00` grün für `aus_dokument`, `● 0.60` gedämpft für `erschlossen`). Undatierte Aussagen tragen gar keinen Punkt — `0.0` wird nicht serialisiert (E-100). Keine Legende, kein Tooltip nötig. Datenqualität steht neben dem Datenpunkt, nicht in einem separaten Report.

### 6. Provenance-Pille am Datenpunkt

`m3gim:xlsxSource` wird als kompakte Pille pro Finanz-, Beziehungs- und Ereignis-Datenpunkt im Inline-Detail sichtbar. Klick führt zur XLSX-Zeilenreferenz (Sheet + Zeile). Provenance ist verpflichtender Teil der UI, nicht Debug-Beigabe.

### 7. Selection durch Kontur, nicht Flächenfarbe

Ein ausgewählter Record bekommt einen dünnen farbigen Rahmen. Fläche würde den Text dämpfen; Kontur signalisiert Fokus ohne Ablenkung.

### 8. Facet-Sidebar mit „TOP N" statt vollständigen Listen

Die linke Sidebar zeigt die häufigsten Einträge pro Index (Orte, Agenten, Dokumenttypen) mit Counts. Long-Tail bleibt via Suche zugänglich; die Sidebar dient Orientierung, nicht Vollständigkeit.

### 9. Uppercase-Letter-Spaced-Section-Header mit Gloss

Sektionen im Hauptbereich tragen dezente Überschriften nach dem Muster `BÜHNENROLLEN (STAGE ROLES)`. Das Fachvokabular wird mit englischem Gloss erklärt, ohne ein Popup-Glossar zu verlangen.

### 10. Datenqualität wird gezeigt, nicht gemergt

Tippfehler, Dubletten, Normalisierungslücken (etwa „Verdi, Guiseppe" neben „Verdi, Giuseppe") erscheinen im UI so, wie sie im Bestand liegen. Das Interface ist ein Erschließungsspiegel. Der Markdown-Report `data/reports/quality-snapshot.md` listet solche Funde systematisch für die Team-Arbeit.

**Explizite Qualitäts- und Statusmarker.** Wo das Modell Qualität oder Status ausdrücklich trägt, zeigt das UI das mit eigenen Markern statt es zu verschweigen. Ein `m3gim:dataQualityFlag` (etwa „Name nicht eindeutig") erscheint als kleiner Hinweis am betroffenen Datenpunkt, mit eigener `qualityConfidence` getrennt von der Aussage-Konfidenz. Ein unerfüllter Vertrag (`m3gim:contractStatus`, `realized = false`) bekommt einen Status-Chip am Vertrags-Record. Beide folgen derselben Haltung wie die übrige Datenqualität — sichtbar, nicht gemergt.

**Leere Zeitfenster bleiben sichtbar.** Die Chronik zeigt jedes Jahr der Lebensspanne einzeln (Session 41, M5 — ersetzt das frühere Perioden-Akkordeon). Jahre ohne bearbeitetes Material bekommen einen Umriss-Dot und gedimmtes Label, Jahre mit Records einen gefüllten Dot, dessen Größe mit der Record-Dichte skaliert. Erschließungslücken bleiben dadurch sichtbar, ohne dass ein redaktioneller Hinweis nötig wäre — die Form selbst ist das Signal.

**Keine redaktionelle Deutung im UI.** Alles, was gerendert wird, muss aus den Daten ableitbar sein — Aggregate aus `store.*` (Top-Dokumenttypen, Top-Orte/Personen/Werke der Periode, Counts) sind zulässig, handverdrahtete Karriere-Labels („Internationale Karriere", „Späte Karriere") nicht. Die Chronik führte solche Notizen in Session 36 ein und hat sie in Session 40 wieder entfernt (E-87); die Perioden-Summary aus Top-Typen und Top-Gruppen trägt die datengetriebene Charakterisierung alleine.

## Daten-Präsentations-Muster

### Tabelle vor Chart für Rankings

Wenn die Frage „Was kommt wie oft vor?" lautet, ist die Tabelle überlegen. Eine Heatmap zerstört die Rangreihung, die der Hauptlesepfad ist. Charts sind nur dort begründet, wo Raum oder Zeit die Information ist (Atlas, Biogramm). Für Aggregationen pro Kategorie: Tabelle mit Inline-Breakdown.

### Parallele Facet-Tabellen statt Umschalter

Gehören zwei Sichten auf dasselbe Konzept zusammen (z. B. Repertoire = Rollen + Komponisten), stehen sie nebeneinander statt durch ein Tab-Control getrennt. Breitenverhältnis signalisiert Primat: dominanter Pivot breit, sekundärer schmal.

### Minimalistische Interaktions-UI

Keine Viz-Toolbar, keine Layer-Chips, kein Facet-Filter, wenn die sortierte Darstellung informativ genug ist. Erst statisch lesbar machen, dann Interaktion hinzufügen. Die sechs D3-Prototypen hatten durchgehend zu viel Toolbar-Chrome.

### Pipeline-Semantik sichtbar machen

Was die Pipeline semantisch unterscheidet (Rollen-Typen, Datumsrollen, DFT-Hierarchie, Konfidenzstufen), erscheint auch im UI sichtbar. Sonst ist die Mühe der Differenzierung unsichtbar. Die Chips `ERWÄHNT · AUFFÜHRUNG · INTERPRET · REPERTOIRE` sind die Belegrollen nach `normalize_role()` — direkt aus dem Datenmodell gerendert.

## Designsystem

Die Design-Tokens (Farben, Spacing, Text-Sizes, Transitions) liegen zentral in `docs/css/variables.css`; alle Tab-CSS nutzen diese Tokens. Die Designregeln 1 und 2 beschreiben die Haltung, dieser Abschnitt fasst die konkreten Tokens und Querschnittsregeln zusammen.

- **Funktionale Farbsemantik.**
  - KUG-Blau `#004A8F` — Interaktion, Engagement, primäre Aktion
  - Signal-Grün — Verknüpfung, Match
  - Neutral-Grau — Abwesenheit, unbearbeitet
  - Warmer Hintergrund — Struktur
  - Signal-Rot — nur für Flucht 1944 (hochselektiv)
- **Mobilitätssichten-Farbfamilie.** Fünf Tokens `--color-sicht-performativ|institutionell|korrespondenz|diskursiv|biografisch` in `variables.css`, getragen vom Chip-Modifier `.chip--mobility-*` als zweite Farbachse der Chronik-Stations-Chips.
- **Ortsfarbcodierung.** Eine durchgehende Farbzuordnung für wiederkehrende Orte (Graz, Wien, Bayreuth, Salzburg, München) gehört ins Designsystem, nicht in einzelne Views — sie stiftet Orientierung über alle Sichten hinweg.
- **Typografie.** Source Serif 4 (Titel und Record-Bezeichner), UI-Sansserif-Stack (Interface), Monospace (Signaturen und IDs).
- **CSS Custom Properties** als Design-System.
- **Responsive.** `@media <768px`-Breakpoints in `base.css` und `components.css` für Header, Tab-Bar, Toolbars, Legenden.
- **Accessibility.** `role="tablist/tab/tabpanel"`, `aria-selected` dynamisch, `aria-hidden` auf SVG-Icons, `aria-label` auf der Korb-Badge.

## Anti-Muster

Konsolidiert aus den Designregeln und den Lektionen der entfernten Prototypen.

- **Räumliche Separation zusammengehöriger Ebenen.** Wenn Datenschichten in einem gemeinsamen Koordinatensystem zusammenhängen, müssen sie auch visuell zusammen stehen. Der Gastspiel-Block in Mobilität war vom Hauptchart abgesetzt, was das Parallelen-Lesen kognitiv teuer machte.
- **Unbegrenzter Zoom ohne State-Persistence.** Klare Zoom-Bounds setzen, State im Hash oder der Session halten. In Kosmos war der Zoom unbegrenzt und der Zustand wurde nicht gespeichert, bis Text unleserlich wurde.
- **Inkonsistente Scales zwischen Szenen.** Ein geteiltes Scale-Objekt pro Achse über alle Szenen einer View. Die Lebensstationen-Mini-Karten hatten andere Scales als die Synthese-Sektion (Maßstabs-Dissonanz).
- **Schmale Facetten mit Text-Quetschung.** Facetten bekommen Mindestbreite oder werden durch Interaktion (Hover-Detail) kompensiert, nicht durch Stauchung. Die Netzwerk-Facette in Lebenspartitur war zu schmal, Labels wurden unleserlich.
- **Scrollytelling mit IntersectionObserver bei kleinen Viewports.** Sticky-Plot ist robuster. Precision-Probleme und nicht-responsive Stat-Cards haben den Flow gestört; Scrollytelling braucht sehr viel Testaufwand.
- **Layer-Toggle-Overengineering.** Erst prüfen, ob statisch reicht, dann Interaktion bauen. Die sechs D3-Prototypen hatten durchgehend zu viel Toolbar-Chrome.

## Lektionen aus den entfernten Visualisierungen

Die sechs entfernten D3-Views (Mobilität, Matrix, Kosmos, Zeitfluss, Lebenspartitur, Lebensstationen) und die Standalone-HTMLs (`lebenspartitur.html`, `lebensstationen.html`) waren Entwürfe. Sie werden nicht rekonstruiert. Ihre Substanz ist in den neuen Tabs weiterverarbeitet (Ort-Farbcodierung im Atlas, Signal-Rot für Flucht 1944 im Biogramm, Tabelle-vor-Chart im Netzwerk und Repertoire). Die folgenden Muster gelten als Designregeln auch für künftige Arbeit. Die destruktiven Lehren aus diesen Prototypen sind oben unter § Anti-Muster zusammengeführt.

### Kompositionsentscheidungen, die bleiben

- **Skalenbruch als bewusste Geste.** Die Zigzag-Unterbrechung bei 1975 (in Mobilität, Lebenspartitur, Lebensstationen konsistent angewendet) macht die Pre/Post-Flucht-Asymmetrie visuell unmittelbar lesbar. Diskontinuität wird zur Kompositionsform, nicht verdeckt.
- **Ortsfarbcodierung als Wiedererkennung.** Die durchgehende Farbzuordnung (Graz, Wien, Bayreuth, Salzburg, München) über alle Views hat Orientierung gestiftet. Ort-Farben gehören ins Designsystem, nicht in einzelne Views.
- **Determinismus vor Schönheit.** Seeded Randomness (Zeitfluss-Jitter) und polar-analytisches Layout (Kosmos) haben garantiert, dass gleiche Daten gleiche Grafik ergeben. Pflicht für Langzeitstabilität und Wiedererkennbarkeit — keine unkontrollierte Force-Simulation.
- **Facetten-Synchronisierung via gemeinsamer Y-Scale.** Die 3-Spalten-Partitur (Netzwerk — Hauptchart — Repertoire) mit synchronem Hover-Highlight war das kognitiv stärkste Muster — auf einen Blick sichtbar, welche Netzwerk-Intensität und welches Repertoire zu welchem Zeitpunkt aktiv waren.
- **Kern-/Peripherie-Dichotomie.** Die Matrix-Aufteilung in stark vernetzte (Kern) und schwach vernetzte (Peripherie als kollapsbare Gruppen) Personen hat Überladung ohne Informationsverlust verhindert. Prinzip: das Häufige zeigen, das Seltene zugänglich halten.
- **3-Farben-Semantik-Schema.** Engagement-Blau, Gastspiel-Gold, Signal-Rot nur für Flucht 1944 — semantisch scharf, Rot bleibt Ausnahme.

### Interaktionsmuster, die etabliert sind

- **Layer/Fokus/Phase-Dimming** als universelles Muster über mehrere Views bewährt — bleibt als Fade-on-Focus-Standard.
- **Deep-Link-Hash-Routing** in SPA-Tabs + `navigateToView`-Event-Bus für Cross-View-Interaktion funktioniert.
- **Shared Phase-Chip-Leiste** zur Jahreseingrenzung war konsistent über alle Views — als wiederverwendbares Element übernommen.

### Forschungsfrage-Abdeckung der entfernten Views

| FF | Stärkste frühere Annäherung | Was für die Neukonzeption bleibt |
|---|---|---|
| FF1 (Professionalisierung/Vernetzung) | Matrix-Heatmap (Person × Phase) + Ort-Dots in Mobilität | Kern-/Peripherie-Schnitt + Ort als strukturierende Achse |
| FF2 (narrativ/ästhetisch) | Kosmos mit Genre-Ratio + UA-Distanz | bleibt spekulativ, nicht MVP-relevant |
| FF3 (Wissenstransfer) | Zeitfluss (Komponist × Ort × Jahr) | Ort-Codierung über Dot-Rand war elegant — übernehmen |
| FF4 (Mobilitätsformen) | Mobilität-Schwimmbahn + Lebenspartitur-Bump | Stärkster Hebel — hier setzt die Neukonzeption an |

### Datenvorstrukturen, die unverändert bleiben

- `store.mobilityEvents` (Phase 6, Session-33-Koordinaten-Patch) zentralisiert, was vorher heuristisch aus `partitur.auftritte` abgeleitet wurde — Atlas und Biogramm konsumieren die Map direkt.
- `store.agentRelations` ist in Archiv-Inline-Detail, Indizes-Beziehungsbadges und Netzwerk-Tab integriert.
- `store.finances` sitzt im Archiv-Inline-Detail Finanzen-Block.

## Abgrenzung zur entfernten Frontend-Schicht

Die sechs D3-Views und die Standalone-HTMLs sind entfernt; ihre Lektionen stehen oben unter § Lektionen aus den entfernten Visualisierungen. Das neue Interface baut nicht auf `partitur.json`, sondern direkt auf den Phase-6-Store-Maps (`dftHierarchy`, `mobilityEvents`, `agentRelations`, `finances`) + `store.records`/`persons`/`works`/`locations` (Aufbau dieser Maps siehe [architecture.md](architecture.md)).

`utils/viz-components.js` (Phase-Chips, Zoom-Helper, Tooltip-Controller) wird je Tab neu bewertet; nicht alle Builder überleben, nicht alle werden gebraucht.
