# Architekturentscheidungen und Prozesswissen

> 30 finale Architekturentscheidungen (E-01 bis E-30), offene Entscheidungen, technische Schulden und Learnings aus Iteration 1+2.

## Architekturentscheidungen (final)

| ID | Entscheidung |
|---|---|
| E-01 | Vanilla JS (kein Framework) |
| E-02 | D3.js v7 fuer alle Visualisierungen |
| E-03 | ~~Vite v5~~ → Iteration 2: Kein Build-Tool, direkte ES6-Module auf GitHub Pages |
| E-04 | Leaflet + CartoDB (deferred auf Iteration 2) |
| E-05 | Offline-first (alle Daten bei Startup) |
| E-06 | Google Sheets als Erfassungstool |
| E-07 | Wikidata Q-IDs als Normdaten |
| E-08 | JSON-LD / RiC-O 1.1 als Datenformat |
| E-09 | Mobilitaetsform-Praefix `[mobilitaet:]` im Anmerkungsfeld |
| E-10 | Synthetische Daten mit `_meta.synthetic` |
| E-11 | ~~Vier Visualisierungen~~ → Iteration 2: 2 D3-Vis (Matrix, Kosmos) + 2 Views (Archiv, Indizes) |
| E-12 | Netzwerk-Schwellenwert 3+ fuer Matrix |
| E-13 | 5-Jahres-Intervalle in Matrix |
| E-14 | Komponisten-Farbkodierung |
| E-15 | 7 Lebensphasen LP1–LP7 |
| E-16 | Scroll-Morphing im Kosmos |
| E-17 | Farbe + Linienstil fuer Mobilitaetstypen |
| E-18 | ~~Zwei-Bereiche~~ → Iteration 2: Tab-basiert (Archiv, Indizes, Matrix, Kosmos) |
| E-19 | ~~Tektonik-Sidebar~~ → Iteration 2: Bestand/Chronik-Toggle mit Inline-Expansion |
| E-20 | ~~Modal~~ → Iteration 2: Inline-Expansion (Archiv) + Slide-in Sidebar (Indizes/Matrix/Kosmos) |
| E-21 | Collapsible Provenienz-Darstellung |
| E-22 | Gruppierte Verknuepfungen mit Icons |
| E-23 | Horizontale Toolbar fuer Visualisierungen |
| E-24 | Export CSV > JSON-LD > GEXF > GeoJSON |
| E-25 | Keine praeemptive Performance-Optimierung |
| E-26 | Seiten statt Modals — About/Projekt/Hilfe als eigenstaendige HTML-Seiten |
| E-27 | 4 funktionale Farbkategorien: KUG-Blau (Interaktion), Signal-Gruen (Verknuepfung), Neutral-Grau (Abwesenheit), Warmer Hintergrund (Struktur) |
| E-28 | Handreichung als UX-Quelle — Erfassungskonventionen direkt in Frontend-Texte |
| E-29 | Dynamischer Counter: "X von Y Objekten" bei aktivem Filter, sonst "Y Objekte · Z Konvolute" |
| E-30 | Stats-Bar entfernt — keine duplizierte Statistik im Header, Info nur kontextuell im Archiv-Tab |

## Offene Entscheidungen

| Thema | Prioritaet | Status |
|---|---|---|
| Matrix Zeitfilter UI | hoch | Slider, Dropdown, oder Timeline-Brush — noch nicht entschieden |
| Wikidata-Reconciliation | hoch | reconcile.py implementieren, Kosmos-View anpassen |

## Technische Schulden (Iteration 1) — Status

- ~~`app.js` monolithisch (1.101 Zeilen)~~ → Behoben: 15+ Module (main.js, router.js, loader.js, etc.)
- ~~`partitur.js` monolithisch (4.460 Zeilen)~~ → Behoben: Partitur durch Archiv-Chronik ersetzt
- ~~Synthetische Daten noch in Frontend-Code~~ → Behoben: Reale Pipeline-Daten
- ~~Kategoriefilter-HTML ohne JS-Binding~~ → Behoben: Funktionale Filter in allen Views
- Kein CSV/JSON-LD-Export aus Archiv-View (offen)
- ~~Inline-CSS in partitur.js~~ → Behoben: CSS-Klassen in archiv.css

## Verschobene Features

| Prioritaet | Feature | Status |
|---|---|---|
| Hoch | Wikidata-Reconciliation (reconcile.py) | offen |
| Hoch | Export CSV/JSON-LD/GEXF | offen |
| Mittel | Matrix Zeitfilter/Zoom | offen |
| Mittel | Cross-Visualization Linking | offen |
| Mittel | Merkliste + CSV-Export | offen |
| Niedrig | Leaflet Karte | offen |

## Prozesswissen (Iteration 1)

### Was funktioniert hat

- Promptotyping-Dokumente als Source of Truth (12 Knowledge-Docs → Code-Generierung)
- Synthetische Daten entkoppeln Frontend- von Datenarbeit
- Design-System als CSS Custom Properties vorab definiert
- Offline-first ueberlebt Funding-Gaps
- Iterative Vis-Entwicklung (Partitur zuerst → Patterns fuer Matrix/Kosmos/Karrierefluss)

### Was in Iteration 2 anders

- Data-first statt UI-first
- Modularisierung von Anfang an
- User Testing frueher
- Evaluation-driven Priorisierung (FF3=60% braucht Aufmerksamkeit)
- Controlled Vocabulary Enforcement bei Datenerfassung

### Positive Ueberraschungen aus der Datenanalyse

- Erschliessungstiefe bei 3 Konvoluten (1.246 effektive Verknuepfungen) uebertrifft Erwartungen
- Gender-inklusives Rollen-Vokabular (58 Werte mit `:in`-Form) zeigt sorgfaeltige Erfassung
- 257/296 Personen mit Kategorie — Begegnungs-Matrix bekommt direkt Daten
- 134 Werk-Verknuepfungen ermoeglichen substantiellen Rollen-Kosmos

### Erkenntnisse aus Daten-Exploration (Feb 2026)

- Konvolut-Hierarchie entdeckt: Objekt-ID = archivsignatur + folio (2 Spalten)
- Verknuepfung ueber String-Matching (`name`-Spalte), nicht ueber IDs
- Header-Shifts in 3 von 4 Indizes — Pipeline muss Spaltennamen mappen
- Dokumenttyp-Vokabular gewachsen (18 → 25 Werte)
- Case-Inkonsistenzen durchgaengig — Pipeline normalisiert mit `.lower().strip()`
- Wikidata wird via Reconciliation-Script befuellt, nicht manuell
- 62/282 Objekte mit Verknuepfungen (22%) — Verknuepfungsarbeit steht am Anfang
