# Entscheidungen und Prozesswissen

> 56 Architekturentscheidungen (E-01 bis E-56), offene Entscheidungen, technische Schulden und Learnings.

## Architekturentscheidungen (final)

| ID | Entscheidung |
|---|---|
| E-01 | Vanilla JS (kein Framework) |
| E-02 | D3.js v7 fuer alle Visualisierungen |
| E-03 | Kein Build-Tool, direkte ES6-Module auf GitHub Pages |
| E-04 | Leaflet + CartoDB (deferred) |
| E-05 | Offline-first (alle Daten bei Startup) |
| E-06 | Google Sheets als Erfassungstool |
| E-07 | Wikidata Q-IDs als Normdaten |
| E-08 | JSON-LD / RiC-O 1.1 als Datenformat |
| E-09 | Mobilitaetsform-Praefix `[mobilitaet:]` im Anmerkungsfeld |
| E-10 | Synthetische Daten mit `_meta.synthetic` |
| E-11 | 4 D3-Vis (Matrix, Kosmos, Zeitfluss, Mobilitaet) + 3 Views (Archiv, Indizes, Korb) |
| E-12 | Netzwerk-Schwellenwert 3+ fuer Matrix |
| E-13 | 5-Jahres-Intervalle in Matrix |
| E-14 | Komponisten-Farbkodierung |
| E-15 | 7 Lebensphasen LP1–LP7 |
| E-16 | Scroll-Morphing im Kosmos |
| E-17 | Farbe + Linienstil fuer Mobilitaetstypen |
| E-18 | Tab-basiert (Archiv, Indizes, Mobilitaet, Korb, Matrix, Kosmos) |
| E-19 | Bestand/Chronik-Toggle mit Inline-Expansion |
| E-20 | Inline-Expansion (Archiv) + Slide-in Sidebar (deaktiviert) |
| E-21 | Collapsible Provenienz-Darstellung |
| E-22 | Gruppierte Verknuepfungen mit Icons |
| E-23 | Horizontale Toolbar fuer Visualisierungen |
| E-24 | Export CSV > JSON-LD > GEXF > GeoJSON |
| E-25 | Keine praeemptive Performance-Optimierung |
| E-26 | Seiten statt Modals — About/Projekt/Hilfe als eigenstaendige HTML-Seiten |
| E-27 | 4 funktionale Farbkategorien: KUG-Blau (Interaktion), Signal-Gruen (Verknuepfung), Neutral-Grau (Abwesenheit), Warmer Hintergrund (Struktur) |
| E-28 | Handreichung als UX-Quelle — Erfassungskonventionen direkt in Frontend-Texte |
| E-29 | Dynamischer Counter: "X von Y Objekten" bei aktivem Filter |
| E-30 | Stats-Bar entfernt — Info nur kontextuell im Archiv-Tab |
| E-31 | `m3gim:hasAssociatedAgent` statt `rico:hasOrHadAgent` (existiert nicht in RiC-O 1.1) |
| E-32 | Erwaehnungen als `rico:hasOrHadSubject` mit `@type: rico:Person` (standard RiC-O statt custom `m3gim:mentions`) |
| E-33 | `m3gim:eventDate` fuer Datum-Literale (rico:isAssociatedWithDate ist ObjectProperty) |
| E-34 | `@context`-Aliase (`name` → `rico:name`, `role` → `m3gim:role`, `komponist` → `m3gim:komponist`) |
| E-35 | GitHub Actions Workflow entfernt — Pipeline laeuft lokal |
| E-36 | Floating-Tooltip (HTML-div ueber SVG) statt CSS-`::after` — SVG-Elemente unterstuetzen keine Pseudo-Elemente |
| E-37 | Popup-Menue fuer Multi-Dokument-Dots — bei >1 Dokumenten pro Gastspiel-Dot |
| E-38 | Guest-City-Display-Normalisierung via GUEST_DISPLAY_MAP |
| E-39 | Piecewise-linear Zeitskala mit Skalenbruch (BREAK_YEAR=1975, BREAK_RATIO=0.74) |
| E-40 | Excel-Quelldateien in `data/source/` git-getrackt (Reproduzierbarkeit statt nur Google Sheets) |
| E-41 | Layer-Toggle statt gleichzeitiger Darstellung aller Schichten in Mobilitaet (5 Layer: mobilitaet, auftritte, netzwerk, repertoire, sparkline) |
| E-42 | Vertikale Event-Marker statt Bezier-Pfeile fuer Mobilitaetsereignisse — Position + Text statt Kurve + Farbe |
| E-43 | `extract_auftritte()` Pipeline-Funktion — 3-Pass-Extraktion (strukturiert, Programmhefte/Plakate, Rezensionen) mit 4 Kategorien (engagement, festspiel, gastspiel, konzert) |
| E-44 | `buildLayerChips()` als Multi-Select-Erweiterung des Phase-Chip-Patterns in viz-components.js |
| E-45 | Auftritte-Aggregation — Deduplizierung nach (ort, jahr, werk), Dots ueber dem Balken positioniert |
| E-46 | `kontext`-Felder in `mobilitaet[]` — narrative Zusatztexte fuer Forschungsbezug (z.B. Netzwerk-Deltas, Wissenstransfer) |
| E-47 | Prototyp-Seiten als eigenstaendige HTML (lebensstationen.html, lebenspartitur.html) statt weitere SPA-Tab-Iterationen |
| E-48 | Lebensstationen: Scrollytelling mit IntersectionObserver, 7 Kapitel + 7 Wendepunkte, Sticky Mini-Timeline |
| E-49 | Lebenspartitur: Vertikaler Bump-Chart (Lebenslinie + synchronisierte Facetten fuer Netzwerk/Repertoire) |
| E-50 | DEV/Prod Log-Toggle: `viewLog()` gibt No-Ops auf GitHub Pages, Console-Diagnostik nur auf localhost |
| E-51 | Error Boundaries pro View: main.js faengt Render-Fehler pro Tab ab (sync+async), erlaubt Re-Render |
| E-52 | Deutsche Fehlermeldungen in loader.js: Netzwerk/404/Parse unterschieden, `loadPartitur()` warnt statt stilles null |
| E-53 | Zentraler Cross-View Event-Bus (`events.js`): `onViewNavigate(tab, handler)` mit Auto-Replay statt `pendingHighlight`-Pattern pro View |
| E-54 | Prototyp-Seiten modularisiert: inline CSS/JS extrahiert in externe Module, `loadPartitur()` Singleton statt direktem fetch() |
| E-55 | ARIA-Accessibility: `role="tablist/tab/tabpanel"`, `aria-selected` dynamisch, `aria-hidden` auf dekorativen SVG-Icons |
| E-56 | Responsive Breakpoints: `@media <768px` in base.css + components.css, FF-Badges hidden, Toolbars kompakter |
| E-57 | Lebenspartitur als SPA-Tab: `renderLebenspartitur(store, container)` mit container-relativem DOM, Standalone-`init()` beibehalten fuer `lebenspartitur.html` |
| E-58 | Fuzzy-Matching in reconcile.py: `thefuzz.token_set_ratio`, 3 Confidence-Level (exact/fuzzy_high/fuzzy_low), backward-kompatibles JSON-Format |
| E-59 | Wikidata-Enrichment-Pipeline: `enrich-wikidata.py` holt Properties (P106, P412, P569/P570, P625, P1191 etc.), `transform.py` injiziert `owl:sameAs` + `m3gim:`-Properties in JSON-LD |
| E-60 | UA-Distanz im Kosmos: Phase-Filter-Annotation zeigt durchschnittliche Urauffuehrungsdistanz, Werk-Tooltips zeigen individuelle Distanz |
| E-61 | Indizes-Subtitles: `renderNameCell()` zeigt Beruf, Stimmfach, Lebensdaten aus WD-Enrichment unter Personennamen |

## Offene Entscheidungen

| Thema | Prioritaet | Status |
|---|---|---|
| Matrix Zeitfilter UI | hoch | Slider, Dropdown, oder Timeline-Brush |
| ~~Wikidata in Kosmos-View~~ | ~~mittel~~ | erledigt: UA-Distanz-Annotation + Tooltip (E-60) |

## Technische Schulden

- Kein JSON-LD/GEXF-Export aus Archiv-View (offen)
- Alle Iteration-1-Schulden behoben (monolithische Dateien, synthetische Daten, Inline-CSS)
- `aggregator.js` dupliziert Pipeline-Logik (pre-built JSONs nutzen 5-Jahres-Perioden statt Lebensphasen → Pipeline-Update noetig)
- Legend-Builder nicht konsolidiert (bewusst: zu heterogene Patterns, Abstraktion lohnt nicht)

## Verschobene Features

| Prioritaet | Feature | Status |
|---|---|---|
| Hoch | Export CSV/JSON-LD/GEXF | CSV/BibTeX erledigt (Session 20), JSON-LD/GEXF offen |
| Mittel | Matrix Zeitfilter/Zoom | offen |
| ~~Mittel~~ | ~~Cross-Visualization Linking~~ | erledigt (Session 20): Matrix ↔ Kosmos ↔ Indizes |
| ~~Mittel~~ | ~~Merkliste + CSV-Export~~ | erledigt (Session 20): Wissenskorb + CSV/BibTeX |
| Niedrig | Leaflet Karte | offen |

## Prozesswissen

### Was funktioniert hat

- Promptotyping-Dokumente als Source of Truth → Code-Generierung
- Synthetische Daten entkoppeln Frontend- von Datenarbeit
- Design-System als CSS Custom Properties vorab definiert
- Offline-first ueberlebt Funding-Gaps
- Iterative Vis-Entwicklung (Partitur → Patterns fuer Matrix/Kosmos)

### Iteration-2-Erkenntnisse

- Data-first statt UI-first
- Modularisierung von Anfang an
- User Testing frueher
- Evaluation-driven Priorisierung (FF3=60% braucht Aufmerksamkeit)
- Controlled Vocabulary Enforcement bei Datenerfassung

### Positive Ueberraschungen aus Datenanalyse

- Erschliessungstiefe bei 3 Konvoluten (1.246 Verknuepfungen) uebertrifft Erwartungen
- Gender-inklusives Rollen-Vokabular (58 Werte mit `:in`-Form)
- 257/296 Personen mit Kategorie — Matrix bekommt direkt Daten
- 134 Werk-Verknuepfungen ermoeglichen substantiellen Rollen-Kosmos
