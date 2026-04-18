# Interface-Konzept

> Designregeln und Tab-Architektur für die Neufassung des Forschungsinterfaces nach Entfernung der sechs D3-Prototypen. Basiert auf zwei Mockup-Ansichten (Archiv, Repertoire) und den in [frontend.md § Lektionen](frontend.md) verdichteten Erfahrungen.

## Grundhaltung

Das Interface positioniert sich als **Forschungswerkzeug**, nicht als Dashboard. Es zeigt den Archivbestand wie eine Edition ihre Quellen — mit sichtbarer Provenienz, ehrlichem Erschließungsstand und einer Typografie, die zur Lesehaltung passt. Datenqualität wird nicht kaschiert; Lücken und Duplikate stehen so da, wie sie im Bestand sind.

## Tab-Architektur

Welche Tabs tatsächlich sichtbar sind, legt `docs/js/ui/router.js::VISIBLE_TABS` fest — das ist die Source of Truth, nicht dieses Dokument. Aktueller Stand: sichtbar sind **Bestand · Chronik · Statistik · Indizes · Wissenskorb**. Die verbleibenden Perspektiv-Tabs — Mobilitäts-Atlas, Repertoire, Biogramm, Netzwerk — sind per `hidden`-Attribut ausgeblendet; Code, CSS und Store-Maps bleiben erhalten, Hash-URLs auf versteckte Tabs werden auf Bestand umgebogen (E-81, präzisiert durch E-86). Reaktivieren = `hidden` im HTML entfernen + Eintrag in `VISIBLE_TABS` ergänzen. Qualitätssicht läuft team-intern über `data/reports/quality-snapshot.md` und ist kein eigener Tab.

**Leitprinzip „nur bearbeitet":** Bestand, Chronik und Indizes zeigen ausschließlich Records bzw. Einträge mit Verknüpfungen. Konvolute ohne erschlossene Folios, Records mit `countLinks === 0`, Folios ohne Links innerhalb eines Konvoluts und Index-Einträge ohne Record-Referenz werden gar nicht erst gerendert. Plakate und Tonträger sind pauschal ausgeblendet (`EXCLUDED_DFT`). Die Gesamt-Bestandszahl und Verknüpfungsrate stehen ausschließlich im Quality-Snapshot. Begründung: das Interface positioniert sich als Forschungswerkzeug für substantielles Material — Erschließungs-Platzhalter sind Rauschen, kein Inhalt.

| Tab | Status | Gegenstand | Primäre Datenquelle im Store | Form |
|---|---|---|---|---|
| **Bestand** | aktiv | Einzelbelege in Konvolut-Hierarchie; Konvolut-Meta-Chips (Top-3-Dokumenttyp + Status-Mix) direkt in der Zeile (E-82), Kinder werden innerhalb ihres Konvoluts sortiert (E-83), Facet-Filter (Dokumenttyp, Person), Record-Inline-Detail mit fünf funktionalen Blöcken | `store.records`, `store.konvolutMeta` (inkl. `docTypeCounts`, `statusCounts`, `processedCount`), `store.agentRelations`, `store.finances`, `store.recordToEvents` | Record-Tabelle mit Rolle-Prefix-Chips, Konvolut-Meta-Chips, Provenance-Pill |
| **Chronik** | aktiv | Scrollender Jahres-Zeitstrahl 1919–2009 (+ Ausreißer-Jahre), Records als klickbare Punkte pro Jahr, leere Jahre sichtbar als Erschließungsspiegel | `store.allRecords` (gefiltert über `unprocessedIds`), `store.recordToEvents`, `store.mobilityEvents` | Vertikale Achse, Jahres-Labels links, Dot-Dichte = Jahresbelegung, Record-Chips rechts |
| **Statistik** | aktiv | Read-only Showroom des Bestandes: Kennzahlen, Dokumenttypen, Mobilitätssichten, Geografie, Netzwerk, Repertoire, Verlinkung & Qualität, Finanzen (Session 37, E-85) | gesamter Store, aggregiert pro Sektion | Sieben Sektionen aus pure-function Aggregation |
| **Indizes** | aktiv | Aggregierte Übersicht Personen, Organisationen, Orte, Werke; Cross-Grid-Linking | `store.persons`, `store.organizations`, `store.locations`, `store.works` (nur Einträge mit `records.size > 0`) | Vier parallele Grids, `renderNameCell()` mit Beziehungsbadges |
| **Mobilitäts-Atlas** | verborgen | Raumzeitliche Aktivität, Leaflet + D3-Zeitstrahl + Detailpanel | `store.mobilityEvents` | Karte + Zeitstrahl + Detailpanel |
| **Repertoire** | verborgen | Bühnenrepertoire und Komponisten, nach Belegtyp aggregiert | `store.works` + DFT-Typ der Records | Parallele Aggregat-Tabellen mit Inline-Breakdown |
| **Biogramm** | verborgen | Chronologische Gesamtsicht entlang der Lebensspanne 1919–2009 | `store.mobilityEvents`, `store.records` mit Datum | D3-Zeitstrahl mit zwei Spuren |
| **Netzwerk** | verborgen | AgRelOn-Beziehungen tabellarisch | `store.agentRelations` | Pivot-Tabelle mit Chip-Breakdown |
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

**Zweite Farbachse für Chronik-Stations-Chips (Session 36, M3).** Zusätzlich zur Rollen-Cluster-Farbe (Rolle-Kategorie wie Ort, Person, Beziehung) tragen Chronik-Stations-Chips einen linken Akzent-Balken in einer der fünf Mobilitätssichten-Farben (`--color-sicht-performativ|institutionell|korrespondenz|diskursiv|biografisch`). Diese zweite Achse macht die in `datenmodell.md § 10` spezifizierten analytischen Perspektiven direkt sichtbar. Mapping in `EVENT_ROLE_TO_MOBILITY_CLUSTER` (constants.js), Chip-Modifier `.chip--mobility-*`.

### 4. Inline-Breakdown statt Drilldown-Panel

Aggregatzellen zeigen die Verteilung der Untertypen direkt in der Zelle, gefolgt von der Summe als Ranking-Anker:
`ERWÄHNT 7 · AUFFÜHRUNG 4 · REPERTOIRE 1 → 12`

Das ersetzt für viele Fragen ein Modal-Panel. Drilldown bleibt für Fälle, in denen Einzelbelege gelistet werden müssen.

### 5. Confidence als Micro-Dot pro Record

`agrelon:hasConfidenceValue` wird als farbiger Punkt mit numerischem Wert inline angezeigt (`● 1.00` grün, `● 0.00` grau). Keine Legende, kein Tooltip nötig. Datenqualität steht neben dem Datenpunkt, nicht in einem separaten Report.

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

## Anti-Muster

- **Räumliche Separation zusammengehöriger Ebenen.** Wenn Datenschichten in einem gemeinsamen Koordinatensystem zusammenhängen, müssen sie auch visuell zusammen stehen.
- **Unbegrenzter Zoom ohne State-Persistence.** Zoom-Bounds setzen, State im Hash halten.
- **Inkonsistente Scales zwischen Szenen.** Ein geteiltes Scale-Objekt pro Achse über alle Szenen einer View.
- **Schmale Facetten mit Text-Quetschung.** Mindestbreite oder Hover-Detail statt Stauchung.
- **Scrollytelling mit IntersectionObserver bei kleinen Viewports.** Sticky-Plot ist robuster.
- **Layer-Toggle-Overengineering.** Erst prüfen, ob statisch reicht, dann Interaktion bauen.

## Abgrenzung zur entfernten Frontend-Schicht

Die sechs D3-Views (Mobilität, Matrix, Kosmos, Zeitfluss, Lebenspartitur, Lebensstationen) und die Standalone-HTMLs (`lebenspartitur.html`, `lebensstationen.html`) sind entfernt. Ihre Lektionen sind in [frontend.md § Lektionen](frontend.md) konserviert. Das neue Interface baut nicht auf `partitur.json`, sondern direkt auf den Phase-6-Store-Maps (`dftHierarchy`, `mobilityEvents`, `agentRelations`, `finances`) + `store.records`/`persons`/`works`/`locations`.

`utils/viz-components.js` (Phase-Chips, Zoom-Helper, Tooltip-Controller) wird je Tab neu bewertet; nicht alle Builder überleben, nicht alle werden gebraucht.
