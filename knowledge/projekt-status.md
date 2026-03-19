# Projekt-Status

> Steckbrief, Umsetzungsstand, Gap-Analyse und operative naechste Schritte.

## Steckbrief

- **Titel:** Mapping Mobile Musicians (M3GIM). Mobilitaet und Musiktheaterwissen im Graz der Nachkriegszeit am Beispiel der Saengerin Ira Malaniuk
- **Gegenstand:** Digitale Erschliessung des Teilnachlasses Ira Malaniuk (UAKUG/NIM)
- **Projekttyp:** Machbarkeitsstudie / Pilotstudie fuer FWF-Folgeprojekt
- **Institutioneller Kontext:** Universitaetsarchiv der KUG Graz
- **Projektleitung:** Nicole K. Strohmann (Professur fuer Historische Musikwissenschaft und Genderforschung, KUG)
- **Kooperationspartner:** Wolfgang Madl (Archiv KUG), Christopher Pollin (DH Craft OG)
- **Beratend:** Georg Vogeler (Institut fuer Digitale Geisteswissenschaften, Universitaet Graz)
- **Raeumlicher Fokus:** Oper Graz in der Nachkriegszeit (1945–1969)
- **Technischer Kern:** Python-Datenpipeline + statisches Frontend auf GitHub Pages
- **Live-Umgebung:** https://dhcraft.org/m3gim

## Datenstand (Stand: 2026-02-25)

- 282 Objekte (255 Konvolute, 26 Plakate, 1 Tontraeger)
- 1.246 effektive Verknuepfungen (nach Filterung leerer/Template-Zeilen)
- 4 Indizes: Personen (296), Organisationen (59), Orte (31), Werke (96)
- 62/282 Objekte mit mindestens einer Verknuepfung (22%)
- Verknuepfungs-Schwerpunkt: NIM_003, NIM_004, NIM_007
- Validierung: 1 Fehler (E001 PL_07-Duplikat, Sheet-seitig), 177 Warnungen (W004 Cross-Table)

## Umsetzungsstand

### Erreichte Kernpunkte

- Pipeline Iteration 2 lauffaehig (explore → validate → transform → build-views → reconcile)
- validate.py Encoding-Bugs gefixt (Session 19): Mojibake in VOCAB + KOMPOSIT_TYPEN, `normalize_bearbeitungsstand()` eingefuehrt
- Wikidata-CSV-Export: 5 CSVs fuer Google-Sheets-Import (export-wikidata-csv.py)
- Frontend: 20 JS-Module, 11 CSS, 7 aktive Tabs (Archiv, Indizes, Mobilitaet, Zeitfluss, Matrix, Kosmos, Korb)
- Archiv UX: Sortierung, Autocomplete, erweiterte Suche, Inline-Expansion, Bookmark-Icons
- Indizes Explorer: Facettensuche, Cross-Navigation, Wikidata-Icons, WD-Coverage
- Mobilitaet-View: Schwimmbahn-Timeline mit D3, Floating-Tooltips, Dokument-Navigation, Popup-Menue
- Wissenskorb: Card-Details, sessionStorage, Cross-Navigation
- 5 Info-Seiten (about, projekt, modell, hilfe, impressum) mit einheitlichem Header
- Wikidata-Reconciliation: 171 Matches (reconcile.py), Icons im Frontend
- RiC-O 1.1 Compliance: 6 Property-Korrekturen nach OWL-Pruefung

### Erreicht (Session 20)

- Matrix + Kosmos Tabs aktiviert (6 aktive Tabs)
- Cross-Visualization Linking: Matrix ↔ Kosmos ↔ Indizes (navigateToView, Popups)
- Wissenskorb CSV/BibTeX-Export
- Kosmos: Deterministisches konzentrisches Layout (Overhaul)
- modell.html Zahlen aktualisiert (171 WD-Matches)
- Dead Code entfernt, CSS-Duplikate bereinigt

### Erreicht (Session 21) — FF-Enhancement

- FF-Badges + Datenabdeckungs-Zeile auf allen 3 Visualisierungen
- 2 fehlende Mobilitaetstypen (National + Bildung) in Timeline
- Lehrphase als gestrichelter Balken (KUG-Professur 1970–2000)
- Graz-Tags + Werk-Chips im Matrix-Drilldown
- Netzwerk-Sparkline ueber der Heatmap
- Volle Rollen-Anzeige im Kosmos-Tooltip + Popup
- Dokument-Sparkline auf Mobilitaet-Timeline
- Knowledge-Base und Vault konsolidiert

### Erreicht (Session 22) — Daten-Reproduzierbarkeit

- Excel-Quelldateien in `data/source/` git-getrackt (7 XLSX: Objekte, Verknuepfungen, 4 Indizes, Fotos)
- `.gitignore` angepasst: `!data/source/*.xlsx` Ausnahme
- Pipeline-Skripte referenzieren noch `data/google-spreadsheet/` → Migration offen

### Erreicht (Session 23) — UI-Vereinheitlichung + FF-Schaerfung

- **Zeitfluss-View** neu: Chronologischer Dot-Plot (D3) mit Gattungsfilter, Phasen-Zoom, Ort-kodierten Dot-Raendern
- **Shared Component System**: `.viz-toolbar`, `.phase-chip`, `.viz-legend`, `.viz-tooltip`, `.viz-zoom-reset` in components.css
- **JS-Builder**: `viz-components.js` mit `buildFFBadges()`, `buildPhaseChips()`, `buildCoverageFooter()`, `createTooltip()`, `setupD3Zoom()`, `viewLog()`
- **Einheitliches Layout** in allen 4 D3-Views: Toolbar → Visualisierung → Legende → Coverage
- **Cross-View Navigation komplett**: 4×6 Navigationsmatrix (Matrix ↔ Kosmos ↔ Zeitfluss ↔ Mobilitaet ↔ Indizes ↔ Archiv)
- **FF-Schaerfungen**:
  - FF1: Graz-Fokus-Toggle in Matrix, Netzwerk-Intensitaets-Overlay auf Mobilitaet
  - FF2: Genre-Ratio-Annotation bei Kosmos-Phasenfilter
  - FF3: Ort-Chips in Kosmos Werk-Popup, Ort-kodierte Dot-Raender im Zeitfluss
  - FF4: Repertoire-Kontext in Mobilitaets-Arrow-Tooltips, Phasen-Filter auf Mobilitaet
- **Tooltip-Vereinheitlichung**: Alle 3 D3-Views nutzen `.viz-tooltip` (dunkel, opacity-Transition)
- **Console-Diagnostik**: Strukturierte Gruppenausgabe in allen 4 D3-Views
- ~270 Zeilen view-spezifisches CSS entfernt, ~180 Zeilen shared CSS eingefuehrt

### Erreicht (Session 24) — Viz-Infrastruktur-Refactoring

- **Partitur-Singleton**: `loadPartitur()` + `getLebensphasen()` in loader.js — ein einziger Fetch fuer alle 4 Views (statt 3× separater Fetch + 1× Hardcode)
- **Tooltip-Controller**: `createTooltip(container)` in viz-components.js — shared show/move/hide mit Boundary-Clamping (migriert: Kosmos, Zeitfluss, Mobilitaet)
- **Zoom+Reset-Helper**: `setupD3Zoom()` in viz-components.js — shared D3-Zoom mit Reset-Button (migriert: Kosmos; Zeitfluss behaelt eigene horizontale Zoom-Logik)
- **Matrix an Shared-System angeschlossen**: `buildFFBadges()` Import statt inline-HTML
- **Console-Diagnostik**: `viewLog(name, color)` in viz-components.js — einheitliche Gruppenausgabe in allen 4 D3-Views
- **viz-components.js**: gewachsen von 68 → 156 Zeilen (6 Exports statt 3)

### Erreicht (Session 25) — Code-Konsolidierung + Repo-Bereinigung

- **buildKomponistenMap()**: Shared Aggregator-Funktion fuer Kosmos + Zeitfluss (~90 Zeilen Duplikation entfernt)
- **CSS-Konsolidierung**: `.cross-link` + `.popup-item` in components.css (statt 3 view-spezifische Duplikate)
- **refreshMatrix()**: Redundante Filter-Refresh-Aufrufe in 1 Funktion gebuendelt
- **main.js Registry**: Switch-Statement → `TAB_RENDERERS` Map
- **Dead Code entfernt**: `resetMatrix()`, `resetKosmos()`, `resetMobilitaet()` (nie importiert)
- **Repo-Bereinigung**: 3 ungenutzte View-JSONs aus Git entfernt (sankey, matrix, kosmos — nur partitur.json wird konsumiert)

### Deferred / offen

- Matrix-Zeitauflosung und Sortierausbau
- Erweiterte Indextiefe (z.B. Orts-Hierarchien)
- Leaflet-Karte

## Gap-Analyse: Offene Pipeline-Implementierungen

### Erledigt (Session 17–19)

1. ~~Ereignis-Typ (`typ: ereignis`)~~ → implementiert als `m3gim:PerformanceEvent`
2. ~~Detail-Typ (`typ: detail`, Schicht 3)~~ → implementiert als `m3gim:DetailAnnotation`
3. ~~reconcile.py~~ → 171 Matches
4. ~~datierungsevidenz~~ → implementiert als `m3gim:dateEvidence`
5. ~~validate.py Encoding-Bugs~~ → Mojibake gefixt, `normalize_bearbeitungsstand()` eingefuehrt (Session 19)
6. ~~Wikidata-CSV-Export~~ → 5 CSVs in `data/output/wikidata-csvs/` (Session 19)

### Hoch (offen)

7. **Erfassungsstatus vereinheitlichen:** 3 parallele Systeme → Google Sheets + transform.py synchronisieren

### Mittel

8. ~~**Wissenskorb-Export:** CSV/BibTeX~~ → erledigt (Session 20)
9. **Nachhaltigkeit:** Zenodo-Archivierung vorbereiten

### Niedrig

10. **box_nr und scan_status:** Antrag nennt sie, Pipeline kennt sie nicht
11. **EAD-Kompatibilitaet:** Antrag erwaehnt Test
12. **Digitalisate-Strategie:** Platzhalter-URLs, finale Loesung offen

## Session 25 (2026-03-19): Mobilitaets-View Redesign + Prototyp-Seiten

**Pipeline-Erweiterung:**
- `extract_auftritte()` in build-views.py: 3-Pass-Extraktion (strukturiert → Programmhefte/Plakate → Rezensionen), 60 Auftrittsereignisse in 4 Kategorien (engagement/festspiel/gastspiel/konzert)
- `auftritte[]` Array in partitur.json, `kontext`-Felder in mobilitaet[]
- Automatisches Kopieren der Views nach docs/data/ in main()

**Mobilitaets-View (mobilitaet.js) — mehrere Iterationen:**
- Layer-Toggle mit buildLayerChips() (Multi-Select, 5 Schichten)
- Event-Marker statt Bezier-Pfeile (vertikale Linien, gestaffelte Labels)
- Aggregierte Auftritte-Dots ueber den Balken
- 3-Farben-Schema (KUG-Blau, Gold, Signal-Rot nur fuer Flucht)
- Fokus-Modus mit Dimming
- **Ergebnis:** Schwimmbahn-Metapher bleibt problematisch — Pfeile und Marker ueberlagern sich bei 5 Events in 8 Jahren

**Zwei Prototyp-Seiten als Alternative (E-47 bis E-49):**
- `lebensstationen.html` (994 Zeilen): Scrollytelling mit 7 Kapiteln + 7 Wendepunkten, Sticky Mini-Timeline, Stat-Cards
- `lebenspartitur.html` (770 Zeilen): Vertikaler Bump-Chart mit Lebenslinie + synchronisierten Facetten (Netzwerk, Repertoire)
- Beide eigenstaendig (fetch partitur.json, D3 v7, kein SPA-Router)

**Shared Components:**
- `buildLayerChips()` in viz-components.js (Multi-Select Toggle, E-44)

**Navigation:**
- "Stationen" + "Partitur" Links in allen 7 HTML-Seiten (index, about, projekt, modell, hilfe, impressum + die Prototypen selbst)

**9 neue Architekturentscheidungen:** E-41 bis E-49

**Learnings:**
- Schwimmbahnen passen nicht zur sequenziell-narrativen Datenstruktur
- Bezier-Pfeile und vertikale Marker scheitern beide an der Cluster-Verteilung (1944–1952)
- Scrollytelling (Lebensstationen) und Bump-Chart (Lebenspartitur) sind vielversprechende Alternativen
- Auftritte als Pipeline-Kategorie (4 Typen) ist wertvoller Datenanreicherungsschritt

## Operative Naechste Schritte

1. Prototyp-Seiten evaluieren (Lebensstationen vs. Lebenspartitur) — welcher Ansatz passt besser zu FF1–FF4?
2. Pipeline-Skripte auf `data/source/` migrieren (SHEETS_DIR Pfad aendern)
3. Datenqualitaetsluecken in Quelltabellen reduzieren (22% Verknuepfungsrate erhoehen)
4. Erfassungsstatus mit Team vereinheitlichen
5. Wikidata-Ergebnisse in Google Sheets uebertragen (171 Matches vorhanden)
6. Zenodo-Archivierung vorbereiten

## Strategischer Kontext

Machbarkeitsstudie fuer FWF-Antrag. Pilotstudie liefert methodische Validierung, technische Infrastruktur und erste empirische Ergebnisse. Geplante Folgefinanzierung: Mobilitaet und Wissensproduktion von Saengerinnen an europaeischen Kulturmetropolen im 19. und 20. Jahrhundert.
