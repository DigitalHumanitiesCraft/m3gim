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

### Mobilitaet (Session 17/18)

Schwimmbahn-Timeline (D3.js) fuer Ira Malaniuks geografische Mobilitaet 1919–2009.

**Datenquellen:**
- `partitur.json`: Lebensphasen, Orte (Wohnort/Auffuehrungsort/Lehrstaette), Mobilitaetsereignisse (5 Typen), Netzwerk-/Repertoire-/Dokumentdaten
- `store.locations` + `store.records`: Gastspiel-Dots dynamisch aus Archivdaten extrahiert

**Visualisierungsschichten (Z-Order):**
1. Phasen-Baender — 7 Lebensphasen als alternierende Hintergrundfarben
2. Skalenbruch — Vertikale Linie + Zigzag bei 1975, Annotation "// komprimiert"
3. Gitterlinien — Horizontale Trennlinien zwischen Swim-Lanes
4. Kontextlinien — Gestrichelte Verbindungen Wien → Auffuehrungsorte
5. Balken — Farbige Balken (KUG-Blau = Wohnort, Beige = Auffuehrungsort)
6. Pfeile — Bezier-Kurven fuer Mobilitaetsereignisse (rot-gestrichelt = erzwungen, gruen = geografisch, lila = Lebensstil, blaugrau-gestrichelt = national, braun = Bildung)
7. Gastspiel-Dots — Dot-Plot unterhalb der Swim-Lanes mit dynamischem Radius
8. Dokument-Sparkline — Archivalischer Puls als Flaechendiagramm am unteren Rand
9. Achsen — X-Achse (1920–2009) und Y-Achse (7 Orte)

**Interaktion:**
- Floating-Tooltip (HTML-div ueber SVG) fuer Balken, Pfeile und Gastspiel-Dots
- Klick auf Balken → navigiert zum Ort-Index (via `navigateToIndex`)
- Klick auf Gastspiel-Dot (1 Dokument) → navigiert direkt zum Archiv-Tab
- Klick auf Gastspiel-Dot (>1 Dokument) → Popup-Menue mit Signatur + Titel-Liste
- Unsichtbare Hit-Areas (14px) hinter Pfeilen fuer zuverlaessiges Hovern

**Besonderheiten:**
- Piecewise-linear Zeitskala: BREAK_YEAR=1975, BREAK_RATIO=0.74 komprimiert sparse 1975–2009
- GUEST_DISPLAY_MAP normalisiert Granularitaetsmischungen ("Italien" → "Italien (versch.)")
- PHASE_ABBR kuerzt Labels bei schmalen Phasen-Baendern
- Legende ueber dem Diagramm (nicht darunter)
- Wien→Zuerich-Bogen bewusst abgeschwaecht (bowFactor 0.30 statt 0.45)
- Lehrstaette (KUG-Professur 1970–2000) als gestrichelter Balken
- Dokument-Sparkline am unteren Rand: jaehrliche Dokumentanzahl als Flaechendiagramm mit Peak-Annotation
- FF-Badges (FF4, FF1) und Datenabdeckungs-Zeile im Header

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

### Matrix

- Begegnungsstruktur als Heatmap (Person x Zeitraum, 5-Jahres-Perioden)
- Kategoriefilter (Dirigent, Regisseur, Korrepetitor, Kollege, Vermittler, Andere)
- Drilldown auf Dokumentliste mit Orts-Tags (Graz = gruen hervorgehoben) und Werk-Chips (klickbar → Kosmos)
- Netzwerk-Sparkline ueber der Heatmap: 7 Perioden aus partitur.json mit Peak-Annotation
- Blaue Intensitaetsskala (KUG-Blau), gewichtet nach Dokumenttyp
- FF-Badges (FF1, FF3) und Datenabdeckungs-Zeile in Toolbar

### Kosmos

- Repertoire-/Rollenbezug als radialer Force-Graph (D3.js)
- Deterministisches konzentrisches Layout: Zentrum Malaniuk, Komponisten-Layer, Werk-Layer
- Fokus-Interaktionen (Komponist-Klick highlightet), Zoom/Pan, Drag
- Groesse nach Dokumentanzahl, Farbe nach Komponist (KOMPONISTEN_FARBEN)
- Volle Rollen-Anzeige im Tooltip und Popup (alle Rollen mit Counts statt nur Hauptrolle)
- FF-Badges (FF2, FF3) und Datenabdeckungs-Zeile im Header

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

## Cross-View Navigation (Session 20)

- Matrix → Indizes: Person-Name klickbar (navigateToIndex)
- Matrix → Kosmos: Komponist-Link mit Highlight-Event (navigateToView + m3gim:navigate)
- Kosmos → Matrix: Komponist-Popup mit Aktions-Links
- Kosmos → Indizes: Werk-Popup mit Dokumentliste + Index-Link
- Wissenskorb: CSV- und BibTeX-Export-Buttons
- Router: navigateToView(tab, context) als generische Cross-View-Funktion

## Offene Luecken

- Matrix-Zeitzoom, erweiterte Index-Hierarchien (deferred)
- Mobilitaet → Matrix/Kosmos (braucht Pipeline-Aenderungen fuer Personen-Kontext)
- Datenabdeckung bleibt dominierender Qualitaetshebel (22% verknuepfte Objekte)
