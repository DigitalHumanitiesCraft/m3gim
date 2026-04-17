# Interface-Konzept

> Designregeln und Tab-Architektur für die Neufassung des Forschungsinterfaces nach Entfernung der sechs D3-Prototypen. Basiert auf zwei Mockup-Ansichten (Dossier, Repertoire) und den in [frontend.md § Lektionen](frontend.md) verdichteten Erfahrungen.

## Grundhaltung

Das Interface positioniert sich als **Forschungswerkzeug**, nicht als Dashboard. Es zeigt den Archivbestand wie eine Edition ihre Quellen — mit sichtbarer Provenienz, ehrlichem Erschließungsstand und einer Typografie, die zur Lesehaltung passt. Datenqualität wird nicht kaschiert; Lücken und Duplikate stehen so da, wie sie im Bestand sind.

## Tab-Architektur (fünf Tabs)

Die fünf Tabs decken je eine legitime Perspektive auf denselben Graph ab. Umschalten bedeutet Perspektivenwechsel, nicht Feature-Wechsel. Qualitätssicht (Abdeckung, Lücken, Duplikate) läuft team-intern über den Markdown-Report `data/reports/quality-snapshot.md` und ist kein eigener Tab.

| Tab | Gegenstand | Primäre Datenquelle im Store | Form |
|---|---|---|---|
| **Dossier** | Einzelbelege des Teilnachlasses, Facet-Filterung per Sidebar (Dokumenttyp, Ort, Agent) | `store.records`, `store.agentRelations`, `store.finances`, `store.recordToEvents` | Record-Liste mit Rolle-Prefix-Chips, Confidence-Dot, Provenance-Pill |
| **Biogramm** | Chronologische Gesamtsicht — Orte, Netzwerk, Repertoire pro Lebensphase | `store.mobilityEvents`, `store.records`, WD-Enrichment an Person „Malaniuk" | Mehrschichtige Zeit-Darstellung, Form offen |
| **Mobilitäts-Atlas** | Raumzeitliche Aktivität nach Mobilitätstyp | `store.mobilityEvents` (+ Koordinaten-Patch) | Karte + Zeitstrahl + Detailpanel, bi-direktional gekoppelt |
| **Netzwerk** | Agenten-Beziehungen (AgRelOn-Relationen) und deren Belege | `store.agentRelations`, `store.persons` | Offen — voraussichtlich Tabelle mit Chip-Breakdown analog Repertoire |
| **Repertoire** | Bühnenrollen und Komponisten, nach Belegtyp aggregiert | `store.works`, Rollen-Belege aus `records` | Parallele Aggregat-Tabellen mit Inline-Breakdown |

Tab-Namen sind inhaltlich (keine „Charts"/„Views"-Floskeln). Jeder Tab trägt einen erklärenden Untertitel, der das Vokabular definiert („Repertoire — Bühnenrollen & Komponisten").

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

- Einzelbelege im Dossier (konkrete Werte)
- Aggregatverteilungen im Repertoire (mit Count: `AUFFÜHRUNG 5`)
- AgRelOn-Beziehungen im Archiv-Inline-Detail

Visuell dieselbe Primitive, semantisch kontextabhängig. Ein einziges robustes Muster statt fünf Darstellungsformen.

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
