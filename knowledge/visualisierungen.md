# Visualisierungen und UI

> Informationsarchitektur, Ansichtslogik, Interaktionen, Designsystem und offene Produktluecken.

## Informationsarchitektur

### Datenorientierte Hauptbereiche

- Archiv
- Indizes
- Mobilitaet
- Matrix
- Kosmos
- Wissenskorb

### Kontextseiten (statisches HTML, kein JS)

- Ueber (`about.html`) — Projektueberblick, Methodik, Datenstand
- Projekt (`projekt.html`) — Quellenbeschreibung, Tektonik, Erfassung, Modellierung
- Modell (`modell.html`) — Ontologie (RiC-O + m3gim), Verknuepfungstypen, Statistik
- Hilfe (`hilfe.html`) — Bedienung, Interaktion, Datumskonventionen, FAQ
- Impressum (`impressum.html`) — Team, Foerderung, Datenschutz, Lizenz
- Einheitliches Template: info-header, info-nav, info-main, info-footer
- Optimale Lesebreite 720px, Source Serif 4 Titel, Print-Styles

### Routing

- Hash-basiertes Routing in `router.js` (6 aktive Tabs: archiv, indizes, mobilitaet, matrix, kosmos, korb)
- Info-Seiten als eigenstaendige HTML-Dateien (normale Links, kein Hash-Routing)
- Deep Links fuer Views und Datensatzkontext

## Shared Components (Session 23)

Alle 4 D3-Visualisierungen (Matrix, Kosmos, Mobilitaet, Zeitfluss) nutzen ein einheitliches Component-System:

### CSS-Klassen (in `components.css`)
- `.viz-toolbar` / `.viz-toolbar__row` / `.viz-toolbar__group` / `.viz-toolbar__label` / `.viz-toolbar__sep` — Einheitliches Toolbar-Layout
- `.phase-chip` / `.phase-chip--active` — Lebensphasen-Buttons (mono-Font, Toggle-Zustand)
- `.viz-legend` / `.viz-legend__item` / `.viz-legend__sep` / `.viz-legend__hint` — Legende unterhalb der Visualisierung
- `.viz-tooltip` / `.viz-tooltip--visible` — Dunkler Floating-Tooltip (opacity-Transition)
- `.viz-zoom-reset` / `.viz-zoom-reset--visible` — Absolut positionierter Zoom-Reset im SVG-Container
- `.ff-badges` / `.ff-badges__tag` — Forschungsfragen-Annotation (rechtsbuendig, flex-shrink: 0)

### JS-Builder (in `utils/viz-components.js`)
- `buildFFBadges(...ffs)` — Erzeugt FF-Badge-Container
- `buildPhaseChips(lebensphasen, onSelect, { labelMode })` — Erzeugt Phase-Chip-Bar mit "Alle"-Button, liefert `{ element, setActive, chips }`
- `buildCoverageFooter(text)` — Erzeugt `.data-coverage`-Zeile

### Einheitliches Layout-Pattern
Alle Views folgen dem Schema: `[.viz-toolbar] → [Visualisierung/SVG] → [.viz-legend] → [.data-coverage]`

## Ansichtslogik

### Archiv

- Bestand und Chronik als zwei Perspektiven auf denselben Datenraum
- Klickbare Spaltenheader mit Sortier-Indikatoren (statt Dropdown)
- Autocomplete-Combobox fuer Personenfilter (statt Select mit 294 Optionen)
- Erweiterte Suche: Signatur, Titel, Dokumenttyp, Datum
- Unbearbeitete Objekte dezent markiert (opacity, Tooltip)
- Inline-Detailflaechen mit "Zum Wissenskorb"-Button
- Bookmark-Icons an jeder Zeile (Hover → sichtbar)
- Reset-Button ("x Zuruecksetzen") setzt alle Filter gleichzeitig zurueck (nur sichtbar bei aktivem Filter)

### Indizes

- Vier Grid-Bloecke: Personen, Organisationen, Orte, Werke
- Cross-Grid-Facettensuche: Klick auf Index-Eintrag filtert die anderen 3 Grids
- Kompakte Toolbar: Suche (flex: 1) + Facet-Chips auf einer Zeile
- Detail-Expansion auf 10 Records begrenzt + "Alle im Archiv anzeigen" Link
- Grid-Count zeigt gefilterte/total bei aktivem Filter
- Wikidata-Icons (Original-Barcode-Logo) bei Index-Eintraegen mit WD-ID
- WD-Coverage-Prozent in Index-Grid-Headern

### Mobilitaet (Session 17/18/23)

Schwimmbahn-Timeline (D3.js) fuer Ira Malaniuks geografische Mobilitaet 1919–2009.

**Datenquellen:**
- `partitur.json`: Lebensphasen, Orte (Wohnort/Auffuehrungsort/Lehrstaette), Mobilitaetsereignisse (5 Typen), Netzwerk-/Repertoire-/Dokumentdaten
- `store.locations` + `store.records`: Gastspiel-Dots dynamisch aus Archivdaten extrahiert

**Visualisierungsschichten (Z-Order):**
1. Netzwerk-Overlay — Blaues Intensitaetsband am oberen Rand (Hoehe nach `netzwerk[].intensitaet`, FF1)
2. Phasen-Baender — 7 Lebensphasen als alternierende Hintergrundfarben
3. Skalenbruch — Vertikale Linie + Zigzag bei 1975, Annotation "// komprimiert"
4. Gitterlinien — Horizontale Trennlinien zwischen Swim-Lanes
5. Kontextlinien — Gestrichelte Verbindungen Wien → Auffuehrungsorte
6. Balken — Farbige Balken (KUG-Blau = Wohnort, Beige = Auffuehrungsort)
7. Pfeile — Bezier-Kurven fuer Mobilitaetsereignisse (rot-gestrichelt = erzwungen, gruen = geografisch, lila = Lebensstil, blaugrau-gestrichelt = national, braun = Bildung)
8. Repertoire-Diamonds — Rauten im oberen Bereich zeigen aktive Repertoire-Perioden
9. Gastspiel-Dots — Dot-Plot unterhalb der Swim-Lanes mit dynamischem Radius
10. Dokument-Sparkline — Archivalischer Puls als Flaechendiagramm am unteren Rand
11. Achsen — X-Achse (1920–2009) und Y-Achse (7 Orte)

**Interaktion:**
- Floating-Tooltip (`.viz-tooltip`) fuer Balken, Pfeile und Gastspiel-Dots
- Arrow-Tooltips zeigen aktives Repertoire im Zeitfenster (FF4)
- Phasen-Chip-Bar: filtert alle Elemente auf gewaehlte Lebensphase (opacity-Dimming)
- Klick auf Balken → navigiert zum Ort-Index (via `navigateToIndex`)
- Shift+Klick auf Balken → Matrix (FF1)
- Klick auf Repertoire-Diamond/Label → Zeitfluss mit Komponist-Kontext
- Klick auf Gastspiel-Dot (1 Dokument) → navigiert direkt zum Archiv-Tab
- Klick auf Gastspiel-Dot (>1 Dokument) → Popup-Menue mit Signatur + Titel-Liste
- Unsichtbare Hit-Areas (14px) hinter Pfeilen fuer zuverlaessiges Hovern

**Besonderheiten:**
- Piecewise-linear Zeitskala: BREAK_YEAR=1975, BREAK_RATIO=0.74 komprimiert sparse 1975–2009
- GUEST_DISPLAY_MAP normalisiert Granularitaetsmischungen ("Italien" → "Italien (versch.)")
- PHASE_ABBR kuerzt Labels bei schmalen Phasen-Baendern
- Legende unterhalb des Diagramms (einheitlich mit anderen Views)
- Wien→Zuerich-Bogen bewusst abgeschwaecht (bowFactor 0.30 statt 0.45)
- Lehrstaette (KUG-Professur 1970–2000) als gestrichelter Balken
- Dokument-Sparkline am unteren Rand: jaehrliche Dokumentanzahl als Flaechendiagramm mit Peak-Annotation
- FF-Badges (FF4, FF1) und Datenabdeckungs-Zeile in `.viz-toolbar`

### Wissenskorb

- Bookmark-Icons in Archiv (Bestand-Zeilen, Inline-Detail) und Indizes (Detail-Records)
- Korb-Tab immer sichtbar (auch bei 0 Items), Badge-Count bei >= 1
- Card-basierte Darstellung pro Record:
  - Header: Signatur (klickbar → Archiv), Titel, Typ-Badge, Entfernen-Button
  - Meta-Zeile: Datum, Sprache, Umfang, Status
  - Verknuepfungen: Personen, Institutionen, Werke, Orte, Rollen als klickbare Chips
  - Wikidata-Icons als klickbare Links wo vorhanden
  - Konvolut-Info (Teil von Konvolut X)
- Cross-Navigation: Signatur-Klick → Archiv, Chip-Klick → Index
- sessionStorage-Persistenz (kein Server)
- Empty-State mit Lesezeichen-Icon und Anleitung

### Matrix (Session 20/21/23)

- Begegnungsstruktur als Heatmap (Person x Zeitraum, 5-Jahres-Perioden)
- Kategoriefilter (Dirigent, Regisseur, Korrepetitor, Kollege, Vermittler, Andere)
- **Graz-Fokus-Toggle** (`.phase-chip`): Schnellfilter auf Graz-Dokumente (FF1)
- Drilldown auf Dokumentliste mit Orts-Tags (Graz = gruen hervorgehoben) und Werk-Chips (klickbar → Kosmos)
- Peripherie-Chip "Malaniuk, Ira" → navigiert zur Mobilitaet (statt Indizes)
- Netzwerk-Sparkline ueber der Heatmap: 7 Perioden aus partitur.json mit Peak-Annotation
- Blaue Intensitaetsskala (KUG-Blau), gewichtet nach Dokumenttyp
- FF-Badges (FF1, FF3) und Datenabdeckungs-Zeile in `.viz-toolbar`

### Kosmos (Session 20/21/23)

- Repertoire-/Rollenbezug als radialer Force-Graph (D3.js)
- Deterministisches konzentrisches Layout: Zentrum Malaniuk, Komponisten-Layer, Werk-Layer
- Fokus-Interaktionen (Komponist-Klick highlightet), Zoom/Pan, Drag
- **Phasen-Chip-Bar**: Filtert Nodes auf Lebensphasen, zeigt Genre-Ratio-Annotation (z.B. "LP6: 12 Opern · 5 Konzerte", FF2)
- **Ort-Chips im Werk-Popup**: Klickbare Ort-Chips mit Counts (FF3), navigieren zu Ort-Index
- Groesse nach Dokumentanzahl, Farbe nach Komponist (KOMPONISTEN_FARBEN)
- Volle Rollen-Anzeige im Tooltip und Popup (alle Rollen mit Counts statt nur Hauptrolle)
- Zoom-Reset-Button: nur sichtbar wenn gezoomt (`.viz-zoom-reset--visible` per Zoom-Handler)
- Popup-Links: "→ Matrix", "→ Zeitfluss" fuer Cross-View-Navigation
- FF-Badges (FF2, FF3) und Datenabdeckungs-Zeile in `.viz-toolbar`

### Zeitfluss (Session 23)

Chronologischer Dot-Plot (D3.js) aller Werke nach Komponist, Gattung und Zeit.

**Datenquelle:**
- `kosmos.json`: Strang-Daten mit Werken, Signaturen, Orten, Gattungen und Lebensphasen

**Visualisierungselemente:**
- Y-Achse: Komponisten (sortierbar nach Alphabet/Dokumentanzahl)
- X-Achse: Zeitstrahl (Premiere-Jahre der Werke)
- Dots: Groesse nach Dokumentanzahl, Form nach Gattung (Kreis = Oper, Raute = Konzert/Lied)
- Ort-kodierte Dot-Raender: Graz=#2E7D4F, Wien=#004A8F, Bayreuth=#9A7B4F, Salzburg=#6B4E8C, Muenchen=#4A6E96 (FF3)
- Phasen-Baender als Hintergrund (7 Lebensphasen)
- Section-Divider zwischen Komponisten-Gruppen

**Interaktion:**
- Gattungs-Chips: Filtern nach Oper/Konzert/Lied/Operette
- Phasen-Chip-Bar: Smooth-Zoom auf gewaehlte Lebensphase
- Sort-Toggle: Wechsel zwischen alphabetischer und Dokumentanzahl-Sortierung
- Hover: `.viz-tooltip` mit Werkname, Gattung, Orten, Signaturen
- Klick auf Dot → Archiv-Tab (Signatur)
- Shift+Klick auf Dot → Kosmos mit Komponist-Highlight
- Y-Label klickbar → Indizes (Personen-Index)
- Zoom/Pan mit D3-Zoom, `.viz-zoom-reset` nur bei aktivem Zoom sichtbar
- Navigation-Listener (`m3gim:navigate`): Hervorhebt Komponist bei Cross-View-Navigation

**Highlight-System:**
- `pendingHighlight` / `activeHighlight` State-Variablen
- `tryHighlight()` / `highlightKomponist()` / `clearHighlight()` Funktionen
- Doppelklick auf SVG → Highlight aufheben
- CSS: `.zeitfluss-ylabel--highlighted` (fett, KUG-Blau)

## Designsystem

- Funktionale Farbsemantik: KUG-Blau (#004A8F, Interaktion), Signal-Gruen (Verknuepfung), Neutral-Grau (Abwesenheit), Warmer Hintergrund (Struktur)
- Typografische Rollen fuer UI, Titel und Signaturdarstellung
- Konsistente Abwesenheitsdarstellung fuer fehlende Erschliessungsangaben
- CSS Custom Properties als Design-System

## Forschungsbezug

- Archiv und Indizes: Quellenbezug und Nachvollziehbarkeit
- Matrix: Netzwerk- und Zeitmuster
- Kosmos: Repertoire- und Rollenprofil
- Mobilitaet: Geografische Mobilitaetsanalyse (FF4)

## Cross-View Navigation (Session 20/23)

Vollstaendiges Navigationsnetzwerk zwischen allen 4 Visualisierungen + Archiv + Indizes:

| Von \ Nach | Matrix | Kosmos | Zeitfluss | Mobilitaet | Indizes | Archiv |
|---|---|---|---|---|---|---|
| **Matrix** | — | Drilldown | Drilldown | Peripherie-Chip (Malaniuk) | Name-Klick | Sig-Klick |
| **Kosmos** | Popup-Link | — | Popup-Link | — | Popup-Link | — |
| **Zeitfluss** | — | Shift+Klick Dot | — | — | Y-Label-Klick | Dot-Klick |
| **Mobilitaet** | Shift+Klick Bar | — | Repertoire-Diamond-Klick | — | Bar-Klick | Dot-Klick |

- Router: `navigateToView(tab, context)` als generische Cross-View-Funktion
- Custom Event: `m3gim:navigate` mit `{ tab, komponist }` fuer Highlight-Kontext
- Wissenskorb: CSV- und BibTeX-Export-Buttons

## Offene Luecken

- Matrix-Zeitzoom, erweiterte Index-Hierarchien (deferred)
- Leaflet-Karte (deferred)
- Datenabdeckung bleibt dominierender Qualitaetshebel (22% verknuepfte Objekte)
