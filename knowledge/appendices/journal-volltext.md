# Appendix: Journal Volltext

> Komprimierte Session-Dokumentation. Entscheidungen und Erkenntnisse vollstaendig, Dateilisten und CSS-Details entfernt.

---

## Session 1 (2026-02-18): Iteration 1 → 2 Uebergang

- Wissens-Destillation: 7 Vault-Dokumente geschrieben und verifiziert
- Repo-Bereinigung: Fotografien komplett aus Scope entfernt
- **Entscheidung:** Fotografien (UAKUG/NIM_FS_XXX) sind nicht Teil des Projekts
- **Entscheidung:** 3 Bestandsgruppen: Hauptbestand (255), Plakate (26), Tontraeger (1)

---

## Session 2 (2026-02-19): Knowledge-Ordner und explore.py

- KNOWLEDGE.md ersetzt durch strukturierten `knowledge/` Ordner mit 7 Docs + README
- `explore.py` als erster Pipeline-Schritt (~760 Zeilen)
- **Entscheidung:** Knowledge lebt in Repo UND Vault (nicht nur Vault)
- **Entscheidung:** Bestehende `data/google-spreadsheet/` verwenden

---

## Session 3 (2026-02-20): Daten-Exploration und Datenmodell v2.5

- Detailanalyse aller 6 Excel-Tabellen
- Konvolut-Hierarchie entdeckt: Objekt-ID = archivsignatur + " " + folio
- Verknuepfungs-Mechanismus geklaert: String-Matching ueber `name`-Spalte
- Dokumenttyp-Vokabular erweitert (18 → 25 Werte)

**Erkenntnisse:**
- `Unnamed: 2` in Objekte = Folio-Spalte (fehlender Header)
- Header-Shifts in 3 von 4 Indizes (Org, Ort, Werk)
- IDs in Indizes sind Durchzaehlungen, keine Verknuepfungs-Schluessel
- Case-Inkonsistenzen durchgaengig — Pipeline normalisiert mit `.lower().strip()`
- Excel-Datetime-Artefakte sind Export-Artefakte, kein Datenproblem

**Entscheidungen:**
- P1–P5 loest Pipeline automatisch, kein Handlungsbedarf im Google Sheet
- Wikidata-Reconciliation wird eigenes Script (`reconcile.py`)

---

## Session 4 (2026-02-20): RiC-O, m3gim-Ontologie, Pipeline Iteration 2

- RiC-O 1.1 Referenzdokument geschrieben
- m3gim-Ontologie: 2 Klassen (MusicalWork, Performance), 4 Object Properties, 2 SKOS-Vokabulare
- validate.py komplett ueberarbeitet (Normalisierung, 25 Dokumenttypen, Cross-Table-Checks)
- transform.py neu geschrieben (Konvolut-Hierarchie, String-Matching, 7 Namespaces → 282 Records)
- build-views.py ueberarbeitet (liest strukturierte RiC-O-Daten → 294 Personen in Matrix)

**Erkenntnisse:**
- Duale Datenextraktion (strukturiert + Title-Matching) ist robuster als nur eins
- 294 vs 30 Personen in Matrix zeigt den Wert der strukturierten Verknuepfungen

**Entscheidungen:**
- m3gim-Namespace fuer MusicalWork und Rollen-Qualifikation (RiC-O reicht nicht)
- transform.py statt create-ric-json.py (klarerer Name)

---

## Session 5 (2026-02-20): Pipeline-Audit und Bugfix

- 3 echte Code-Bugs gefixt:
  1. HEADER_SHIFTS: Spalten 2+3 vertauscht → 145 falsche Wikidata-URIs. Fix: Reihenfolge + Regex `^Q\d+$`
  2. Q-IDs als Komponistennamen in Kosmos — durch Bug-1-Fix automatisch behoben
  3. `rico:hasLanguage` → `rico:hasOrHadLanguage` (falscher Property-Name) → 74 Records mit Sprache

**Erkenntnisse:**
- Header-Shift-Bug war subtil und nicht durch reine Code-Review erkennbar
- 62/282 Objekte haben Verknuepfungen (22%), nicht 3 wie zuvor angenommen

---

## Session 6 (2026-02-20): Bestand-View Verbesserungen

- formatDate() komplett neu: ISO → menschenlesbare deutsche Formate (6 Regeln)
- countLinks() erweitert um `rico:isAssociatedWithDate`, `m3gim:hasPerformanceRole`

**Erkenntnisse:**
- 78% der Records haben 0 Verknuepfungen
- 3 Datumsformate: YYYY-MM-DD (100x), YYYY-MM-DD/YYYY-MM-DD (142x), YYYY (1x)

**Entscheidungen:**
- Monatsabkuerzungen auf Oesterreichisch: "Jaen." statt "Jan."
- "o. D." (ohne Datum) als Archivkonvention

---

## Session 7 (2026-02-20): Konvolut-Darstellung und Sortierung

- Kritischer Bug: `getOrderedItems()` iterierte nur ueber `store.allRecords`, nicht `store.konvolute` → 76 Einzelobjekte unsichtbar
- getOrderedItems() neu: Merged standalone Records + Konvolut RecordSets

**Entscheidungen:**
- Konvolute als eigenstaendige Zeilen mit Toggle-Button
- Bei Suche/Filter: Hierarchie aufgeloest, alle Einzelobjekte flach

---

## Session 8 (2026-02-20): Konvolut-Metadaten und Anforderungsanalyse

- 7 Bestand-View-Probleme behoben (Konvolut-Meta, Folio-Filter, Counter, Detail-Aggregation)
- Anforderungsanalyse (Soll-Ist v5.0): 3 faktische Fehler im Analysedokument identifiziert
- Kritischer Pfad: Mustererkennung → Quellenbeleg → persistente Sammlung — noch nicht geschlossen

**Entscheidungen:**
- Folio-Records sind Metadaten, keine Archivobjekte → aus allRecords entfernen
- Konvolut-Titel vom Folio-Kind abgeleitet

---

## Session 9 (2026-02-20): Pipeline-Fix + Quick-Wins + Features

**Pipeline (M1):** 3 Bugs in transform.py: Rollen-Normalisierung, Datums-Bereinigung, Ort/Datum-Decomposition.

**Quick-Wins (M2):** Stats-Bar Jahresvalidierung, Typ-Badges "Nicht klassifiziert", Empty-State "Noch nicht erschlossen", Kosmos-Legende, Malaniuk-Kategorie.

**Features (M3–M7):** Matrix-Drilldown (Heatmap-Zelle → Dokumentliste), Chronik-Toggle Ort/Person/Werk, klickbare Tags → Index-Navigation, Personen-Filter im Archiv, 4 funktionale Farbkategorien.

**Navigation (M8):** Info-Modal ersetzt durch 3 eigenstaendige Seiten. Stats-Bar und Info-Button entfernt.

**Bestand/Chronik (M9):** Folio-Differenzierung, Ohne-Ort-Hinweis, Undatiert-Erklaerung, Agenten-Tooltip.

**Matrix/Kosmos (M10):** Kategorie-Kuerzel in Matrix, Graduated-Circle-Legende, Zoom/Pan.

---

## Session 10 (2026-02-20): Archiv UX, Indizes, Wissenskorb

**Pipeline (M12):** Spaltennamen-Normalisierung, Bearbeitungsstand-Mapping.

**Archiv UX (M13):** Spaltenheader-Sortierung, Custom Autocomplete-Combobox fuer Personenfilter, erweiterte Suche.

**Indizes (M14):** Viewport-Fix (Flexbox statt max-height), Cross-Grid-Facettensuche, Detail-Expansion mit Archiv-Link.

**Wissenskorb (M15):** sessionStorage-State, Bookmark-Icons, Korb-Tab als 5. Tab.

**KB-Refactor (M16):** 12 nummerierte Docs → 5 kanonische + Traceability-Matrix + Quellenindex. Vollarchiv unter `_archive/`.

---

## Session 11 (2026-02-20): Konsolidierung, Bugfixes

- KB-Refactoring zusammengefuehrt
- Bugfix: Indizes-Tab leer (`.tab-content` auf `position: absolute; inset: 0`)
- Feature: Archiv Reset-Button (alle 3 Filter gleichzeitig zuruecksetzen)
- Bugfix: D3.js passive Event Listener (`touch-action: none`)

---

## Session 12 (2026-02-20): Demo-Modus

- Matrix und Kosmos aus Tab-Bar ausgeblendet (hidden-Attribut), Code erhalten
- Wissenskorb: Card-basierte Darstellung mit Metadaten und Verknuepfungen als klickbare Chips
- Detail-Panel (Sidebar) deaktiviert — Navigation zum Archiv-Tab
- Layout-Refactor: Flex-Layout mit fixierter Toolbar und scrollbarem View-Container

---

## Session 12b (2026-02-20): Indizes-Layout, Semantik, Modell-Seite

- Indizes: Suche + Facet-Chips auf eine Zeile
- Semantische Verknuepfungen: Person/Institution-Trennung, Werk-Rollen
- Neue Seite "Modell" (#modell): Ontologie, Verknuepfungstypen, Normdaten-Statistik
- Konvolut-Expansion: Collapsed als Default

---

## Session 13 (2026-02-20): Info-Seiten als statisches HTML

- 4 Info-Seiten von JS-Views zu eigenstaendigen HTML-Dateien migriert
- Einheitliches Template: info-header, info-nav, info-main, info-footer (720px Lesebreite)
- SPA aufraeumen: PAGES-Array entfernt, 18 statt 22 JS-Module
- Statische Zahlen (Stand 2026-02-20): 282 Archiveinheiten, 62 verknuepft (22%), 313 Personen, 94 Werke

---

## Session 14 (2026-02-20): Einheitlicher Header, CSS-Bereinigung

- App-Header auf allen 6 Info-Seiten vereinheitlicht (about, projekt, modell, hilfe, impressum, index)
- CSS-Bug gefixt: `.info-page a` → `.info-main a` (verhinderte blaue-auf-blau Links)
- `.gitignore` aktualisiert: antrag.md, handreichung.md ausgeschlossen (DSGVO)

---

## Session 15 (2026-02-20): Vault-Reorganisation, Knowledge-Sync

- 16 Vault-Dokumente in thematische Unterordner: Forschung/, Daten/, Technik/, Produkt/, Prozess/
- Knowledge-Ordner im Repo mit Vault synchronisiert
- `_archive/` aufgeloest, Wissen in kanonische Dokumente integriert

---

## Session 16 (2026-02-20): CSS-Tooltips, Chronik-Redesign

- CSS-only Tooltips (`data-tip` Attribut) als Ersatz fuer Browser-Tooltips
- Chronik-Redesign: Perioden starten zugeklappt, aggregierte Summary-Zeile im Header
- nummerierte Listen mit KUG-Blau-Kreisen auf Info-Seiten

---

## Session 17 (2026-02-21): Wikidata-Integration, reconcile.py, RiC-O 1.1 Compliance

**Wikidata-Sichtbarkeit:**
- Wikidata-Icon (Original-Barcode-Logo in Markenfarben #990000/#339966/#006699) in allen Indizes, Inline-Detail und Korb
- WD-Coverage-Prozent in Index-Grid-Headern
- Orte-Index: Wikidata-Feld in loader.js + indizes.js ergaenzt

**reconcile.py Refactoring:**
- MIN_NAME_LENGTH = 3 (verhindert falsche Matches)
- 4 identische Code-Sektionen → generische INDEX_CONFIG-Schleife
- Caching: vorhandene Ergebnisse ueberspringen (--force zum Ignorieren)
- Redundante time.sleep entfernt
- 171 Wikidata-Matches (Personen, Orte, Organisationen, Werke)

**RiC-O 1.1 Compliance (OWL-Pruefung gegen RiC-O_1-1.rdf):**
- `rico:hasOrHadAgent` existiert nicht in RiC-O → `m3gim:hasAssociatedAgent` (bewusste Extension)
- `m3gim:mentions` → `rico:hasOrHadSubject` mit `@type: rico:Person` (RiC-O-konform)
- `rico:isAssociatedWithDate` ist ObjectProperty (Range: Date-Klasse) → `m3gim:eventDate` fuer Literale
- `rico:descriptiveNote` umbenannt → `rico:generalDescription`
- Locations: `@type: "rico:Place"` ergaenzt (161/161)
- Bare Properties via `@context`-Aliase: `name` → `rico:name`, `role` → `m3gim:role`, `komponist` → `m3gim:komponist`

**Geaenderte Dateien:** transform.py, build-views.py, audit-data.py, loader.js, format.js, aggregator.js, archiv-bestand.js, archiv-chronik.js, archiv-inline-detail.js, korb.js, indizes.js, constants.js, modell.html

**Entscheidungen:**
- `m3gim:hasAssociatedAgent` statt `rico:hasCreator` (zu einschraenkend fuer Archivdaten mit diversen Rollen)
- Erwaehnungen als `rico:hasOrHadSubject` (domain: RecordResource, range: Thing — standard RiC-O)
- `@context`-Aliase fuer kurze JSON-Keys bei semantischer Korrektheit

---

## Session 18 (2026-02-25): Mobilitaet-View Verbesserungen, Knowledge-Refactor

**Mobilitaet-View Verbesserungen:**
- Floating-Tooltips (HTML-div ueber SVG) statt CSS-`::after` (SVG-Elemente unterstuetzen keine Pseudo-Elemente)
- Dokument-Navigation: Klick auf Gastspiel-Dot → Archiv-Tab (1 Dokument) oder Popup-Menue (>1 Dokumente)
- Popup-Menue fuer Multi-Dokument-Dots mit Signatur + Titel-Liste
- Piecewise-linear Zeitskala: BREAK_YEAR=1975, BREAK_RATIO=0.74 komprimiert sparse 1975–2009
- GUEST_DISPLAY_MAP normalisiert Gastspiel-Staedtenamen
- PHASE_ABBR kuerzt Labels bei schmalen Phasen-Baendern
- Legende ueber dem Diagramm
- Unsichtbare Hit-Areas (14px) hinter Pfeilen

**Knowledge-Refactor:**
- 12 alte Quelldateien in `_archive/pre-refactor/` archiviert
- 7 destillierte Wissensdokumente als flacher Vault erstellt:
  forschung.md, datenmodell.md, pipeline.md, frontend.md, visualisierungen.md, entscheidungen.md, projekt-status.md
- knowledge/README.md aktualisiert
- Appendices: journal-volltext.md

**Entscheidungen:**
- E-36: Floating-Tooltip statt CSS-Pseudo-Elemente
- E-37: Popup-Menue fuer Multi-Dokument-Dots
- E-38: Guest-City-Display-Normalisierung via GUEST_DISPLAY_MAP
- E-39: Piecewise-linear Zeitskala mit Skalenbruch

---

## Session 19 (2026-02-25): Pipeline-Audit, validate.py Fixes, Wikidata-CSVs

**Pipeline-Audit:**
- Vollstaendiger Audit ergab 69 Fehler in validate.py — alle verursacht durch einen einzigen Bug: doppelte UTF-8-Kodierung (Mojibake) in den Vokabular-Listen
- transform.py verarbeitet alle Daten korrekt (kein Datenverlust)

**validate.py Fixes:**
- Mojibake in VOCAB["bearbeitungsstand"] korrigiert (47 E004-Fehler → 0)
- Mojibake in KOMPOSIT_TYPEN korrigiert (21 E004-Fehler → 0)
- `normalize_bearbeitungsstand()` eingefuehrt: Fuzzy-Matching das transform.py's Logik spiegelt
- `is_komposit_typ()` verbessert: Input-Wert vor Vergleich `.replace(" ", "")`
- Ergebnis: 69 Fehler → 1 (E001 PL_07-Duplikat, Sheet-seitig)

**Wikidata-CSV-Export:**
- Neues Skript `scripts/export-wikidata-csv.py`
- 5 CSVs in `data/output/wikidata-csvs/`: person-matches (152), org-matches (3), location-matches (14), work-matches (2), unmatched (295)
- Zweck: VLOOKUP-Import in Google Sheets fuer Nicole/Wolfgang

**3 Git-Commits:**
1. `feat: Mobilität-Tooltips, Dokument-Navigation, Popup-Menü, Skalenbruch`
2. `docs: Knowledge-Base destilliert — 7 flache Dokumente, 12 Quellen archiviert`
3. `fix: validate.py Encoding-Bugs, Wikidata-CSV-Export, Pipeline-Reports aktualisiert`

**Erkenntnisse:**
- Mojibake-Bugs sind subtil — `.py`-Dateien muessen konsistent UTF-8 sein
- Fuzzy-Matching in validate.py (wie transform.py) ist robuster als exakte VOCAB-Listen
- 177 verbleibende Warnungen (W004) sind alle Cross-Table-Mismatches — erwartetes Verhalten bei laufender Erschliessung

---

## Session 20 (2026-02-25): Cross-View Linking, Korb-Export, Kosmos-Overhaul

**Cross-Visualization Linking:**
- Matrix → Indizes: Person-Name klickbar (navigateToIndex)
- Matrix → Kosmos: Komponist-Link mit Highlight-Event (navigateToView + m3gim:navigate)
- Kosmos → Matrix: Komponist-Popup mit Aktions-Links
- Kosmos → Indizes: Werk-Popup mit Dokumentliste + Index-Link
- Router: navigateToView(tab, context) als generische Cross-View-Funktion

**Wissenskorb-Export:**
- CSV-Export (Blob-Download) mit allen Korb-Eintraegen
- BibTeX-Export fuer Literaturverwaltung

**Kosmos-Overhaul:**
- Deterministisches konzentrisches Layout statt instabilem Force-Layout
- Feste Radien: Komponisten-Layer innen, Werk-Layer aussen
- Konsistente Positionierung bei jedem Laden

**Refactoring:**
- Dead Code entfernt (alte Sankey-Referenzen, ungenutzte Funktionen)
- CSS-Duplikate bereinigt
- Normalisierung in eigenes Modul extrahiert
- Meeting-Referenzen aus allen Knowledge-Docs entfernt

**Commits:**
1. `feat: Cross-Visualization Linking, Wissenskorb-Export, modell.html aktualisiert`
2. `refactor: Dead Code entfernt, CSS-Duplikate bereinigt, Normalisierung extrahiert`
3. `fix: PERSONEN_KATEGORIEN Import in aggregator.js wiederhergestellt`
4. `feat: Kosmos-View komplett neu — deterministisches konzentrisches Layout`

---

## Session 21 (2026-02-25): FF-Enhancement — Visualisierungen forschungskonform staerken

**Analyse:** Systematische Evaluation der 3 Visualisierungen gegen FF1–FF4 ergab:
- FF4 (Mobilitaetsformen) = stark
- FF1 (Graz/Vernetzung) = mittel
- FF2 (Aesthetische Strukturen) = schwach
- FF3 (Wissenstransfer) = schwach

**10-Punkte-Plan (Phase 1 + Phase 2)** entwickelt und groesstenteils umgesetzt:

**Phase 1 — Sofort sichtbar (alle erledigt):**
1. FF-Badges + Datenabdeckungs-Zeile auf Matrix, Kosmos, Mobilitaet
2. 2 fehlende Mobilitaetstypen: National (Lemberg→Wien, ~1950) und Bildung (Zuerich→Graz, 1970)
3. Lehrphase: Gestrichelter Balken fuer KUG-Professur (1970–2000) als eigener Ortstyp
4. Graz-Tags (gruen hervorgehoben) + Werk-Chips (klickbar → Kosmos) im Matrix-Drilldown
5. Netzwerk-Sparkline ueber der Heatmap: 7 Perioden-Intensitaet aus partitur.json

**Phase 2 — Tiefere FF-Argumentation (teilweise erledigt):**
6. Volle Rollen-Anzeige im Kosmos: Tooltip und Popup zeigen alle Rollen mit Counts
7. Dokument-Sparkline auf Mobilitaet-Timeline: Archivalischer Puls als Flaechendiagramm
8. Kosmos-Phasenfilter (Zeitdimension) — in Arbeit
9. Repertoire-Overlay auf Mobilitaet-Timeline — offen

**Knowledge-Base-Konsolidierung:**
- Vault: 6 alte Einzeldocs in _archive/ verschoben, Project Overview als einziges Destillat (v4.0)
- Repo: PLAN.md und Status.md geloescht (obsolet/redundant)
- README.md: Tote Links gefixt, Struktur aktualisiert
- 5 stale Knowledge-Docs aktualisiert (frontend, visualisierungen, entscheidungen, projekt-status, README)
- Journal um Session 20 + 21 ergaenzt

**Geaenderte Dateien:**
- `docs/js/views/matrix.js` — FF-Badges, Sparkline, Drilldown mit Graz-Tags + Werk-Chips
- `docs/js/views/kosmos.js` — FF-Badges, volle Rollen-Anzeige
- `docs/js/views/mobilitaet.js` — FF-Badges, 2 neue Mobilitaetstypen, Lehrphase, Dokument-Sparkline
- `docs/css/components.css` — FF-Badges, Data-Coverage CSS
- `docs/css/matrix.css` — Sparkline, Drilldown-Tags, Werk-Chips
- `docs/css/kosmos.css` — Header-Row, Rollen-CSS
- `docs/css/mobilitaet.css` — Header-Row
- `docs/data/partitur.json` — National/Bildung-Pfeile, Lehrstaette

---

## Session 23 (2026-03-12): UI-Vereinheitlichung, FF-Schaerfung, Cross-View-Netzwerk

**Kontext:** Kritische UI-Analyse ergab Inkonsistenzen: 4 verschiedene Toolbar-Architekturen, 3 verschiedene Phasen-Chip-Implementierungen, 3 verschiedene Tooltip-Stile, uneinheitliche Legende-Platzierung, unvollstaendiges Cross-View-Netzwerk. 6-Phasen-Optimierungsplan erstellt und umgesetzt.

**Phase 0 — Zeitfluss Navigate-Listener:**
- Zeitfluss empfaengt `m3gim:navigate`-Events und highlightet Komponisten-Zeile
- `pendingHighlight`/`activeHighlight`-Pattern fuer Lazy-Highlight nach Render

**Phase 1 — Shared Component Foundation:**
- `components.css`: ~100 Zeilen shared CSS (`.viz-toolbar`, `.phase-chip`, `.viz-legend`, `.viz-tooltip`, `.viz-zoom-reset`)
- `viz-components.js`: Neue Datei mit `buildFFBadges()`, `buildPhaseChips()`, `buildCoverageFooter()`

**Phase 2 — Toolbar-Refactor alle 4 D3-Views:**
- Alle 4 Views migriert auf `.viz-toolbar` + `.phase-chip` + `.viz-legend`
- ~235 Zeilen view-spezifisches CSS entfernt
- Mobilitaet: NEU Phase-Chip-Bar mit `applyMobPhaseFilter()` (Dimming ausserhalb gewaehlter Phase)

**Phase 3 — Forschungsfragen schaerfen (FF1–FF4):**
1. FF1: Graz-Fokus-Toggle in Matrix-Toolbar
2. FF1: Netzwerk-Intensitaets-Overlay auf Mobilitaet
3. FF2: Genre-Ratio-Annotation im Kosmos bei Phasenfilter
4. FF3: Ort-Chips im Kosmos Werk-Popup (klickbar → Orte-Index)
5. FF3: Ort-kodierte Dot-Strokes im Zeitfluss (Graz=gruen, Wien=blau, Bayreuth=gold)
6. FF4: Repertoire-Kontext in Mobilitaets-Arrow-Tooltips

**Phase 4 — Cross-View-Navigation komplettiert:**
- 6 neue Navigationslinks: Zeitfluss↔Kosmos, Zeitfluss→Indizes, Mob→Matrix, Mob→Zeitfluss, Matrix→Mob

**Phase 5 — Tooltip-Vereinheitlichung:**
- Alle 3 D3-Views: einheitlich `.viz-tooltip` (dunkler Stil, opacity-Transition)

**Bugfixes nach Screenshot-Analyse:**
- Kosmos: Flex-Column-Layout, Reset-Button nur bei Zoom, Legende sichtbar
- Mobilitaet: Legende-Spacing vereinheitlicht, Netzwerk-Overlay Position korrigiert
- Console-Diagnostik fuer alle 4 Views

**Neue Datei:** `docs/js/utils/viz-components.js`

---

## Session 22 (2026-03-12): Daten-Reproduzierbarkeit

- Excel-Quelldateien in `data/source/` git-getrackt (7 XLSX: Objekte, Verknuepfungen, 4 Indizes, Fotos)
- `.gitignore` angepasst: `!data/source/*.xlsx` Ausnahme
- Pipeline-Skripte referenzieren noch `data/google-spreadsheet/` → Migration offen

**Entscheidung:** Originale XLSX-Quelldateien werden fuer Reproduzierbarkeit im Repo versioniert

---

## Session 24 (2026-03-13): Viz-Infrastruktur-Refactoring

**Kontext:** Analyse ergab 4× duplizierte Patterns (Partitur-Fetch, Tooltip-Logik, Zoom-Setup, Console-Diagnostik) in den 4 D3-Views. 5-Schritte-Plan erstellt und umgesetzt.

**Schritt 1 — Partitur-Singleton:**
- `loadPartitur()` + `getLebensphasen()` in loader.js (concurrent-safe mit Promise-Caching)
- Alle 4 Views migriert (statt 3× separater Fetch + 1× Hardcode LEBENSPHASEN)
- `renderZeitfluss` async gemacht fuer `await loadPartitur()`

**Schritt 2 — Tooltip-Controller:**
- `createTooltip(container)` in viz-components.js — shared show/move/hide mit Boundary-Clamping
- Migriert: Kosmos, Zeitfluss, Mobilitaet (je ~12 Zeilen lokaler Code entfernt)

**Schritt 3 — Matrix an Shared-System:**
- `buildFFBadges()` Import statt inline-HTML

**Schritt 4 — Zoom+Reset-Helper:**
- `setupD3Zoom()` in viz-components.js — D3-Zoom mit Reset-Button und Visibility-Toggle
- Migriert: Kosmos. Zeitfluss behaelt eigene horizontale Zoom-Logik (zu spezialisiert)

**Schritt 5 — Console-Diagnostik:**
- `viewLog(name, color)` in viz-components.js — einheitliche Gruppenausgabe
- Migriert: alle 4 D3-Views

**Ergebnis:** viz-components.js gewachsen von 68 → 156 Zeilen (6 Exports statt 3)

---

## Session 25 (2026-03-13): Code-Konsolidierung + Repo-Bereinigung

**Kontext:** 5 weitere Refactoring-Kandidaten identifiziert und umgesetzt.

**1. aggregator.js — buildKomponistenMap() extrahiert:**
- ~90 Zeilen duplizierter Pass-1/Pass-2 Logik (structured subjects + title-matching) in shared Funktion
- `aggregateKosmos()` und `aggregateZeitfluss()` nutzen beide `buildKomponistenMap(store)`

**2. Unused Reset-Funktionen entfernt:**
- `resetMatrix()`, `resetKosmos()`, `resetMobilitaet()` — exportiert aber nie importiert → geloescht

**3. CSS konsolidiert:**
- `.matrix-drilldown__kosmos-link` + `__zeitfluss-link` → `.cross-link` (components.css)
- `.kosmos-popup__action` + `.mob__popup-item` → `.popup-item` (components.css)
- ~54 Zeilen view-spezifisches CSS entfernt, ~30 Zeilen shared CSS eingefuehrt

**4. Matrix refreshMatrix():**
- 6 redundante `reAggregate + renderHeatmap + renderPeriphery + updateActiveFilters` Aufrufe → 1 Funktion

**5. main.js Registry:**
- Switch-Statement (7 cases) → `TAB_RENDERERS` Map + 3-zeilige `renderTab()` Funktion

**6. Repo-Bereinigung:**
- 3 ungenutzte View-JSONs aus Git entfernt: `sankey.json`, `matrix.json`, `kosmos.json` (nur `partitur.json` wird konsumiert)
- `node_modules/` lokal geloescht (~40 MB, kein package.json vorhanden)

---

## Session 26 (2026-03-20): DEV/Prod-Log-Toggle, Error Boundaries, ARIA

- `viewLog()`-Wrapper: Konsolen-Diagnostik nur auf localhost (E-50)
- Error Boundaries pro View in `main.js`: sync + async Renderfehler fangen, Tab re-renderbar (E-51)
- Deutsche Fehlermeldungen in `loader.js`: Netzwerk/404/Parse unterschieden, `loadPartitur()` warnt statt stilles null (E-52)
- Zentraler Cross-View Event-Bus in `events.js`: `onViewNavigate(tab, handler)` mit Auto-Replay ersetzt `pendingHighlight`-Pattern (E-53)
- ARIA-Accessibility: `role="tablist/tab/tabpanel"`, `aria-selected` dynamisch, `aria-hidden` auf dekorativen SVG-Icons (E-55)
- Responsive Breakpoints: `@media <768px` in `base.css` + `components.css`, FF-Badges versteckt, Toolbars kompakter (E-56)

---

## Session 27 (2026-03-25): Wikidata-Enrichment-Pipeline, Lebenspartitur als SPA-Tab, Fuzzy-Matching

- `reconcile.py` erweitert: `thefuzz.token_set_ratio`, 3 Confidence-Level (exact/fuzzy_high/fuzzy_low) (E-58)
- `enrich-wikidata.py` neu: fetcht WD-Properties (P106, P412, P569/P570, P625, P1191 etc.), `transform.py` injiziert als `owl:sameAs` + `m3gim:`-Properties (E-59)
- UA-Distanz im Kosmos via Phase-Filter-Annotation (E-60)
- Indizes-Subtitles: `Beruf · Stimmfach · Lebensdaten` unter Personennamen aus WD-Enrichment (E-61)
- Lebenspartitur als SPA-Tab: `renderLebenspartitur(store, container)` mit container-relativem DOM, Standalone-`init()` beibehalten für `lebenspartitur.html` (E-57)

---

## Session 28 (2026-04-10): v2-Modellerweiterungen (Phase 4.1–4.8)

Testgetriebene Umsetzung der in `datenmodell.md` spezifizierten Modell-Erweiterungen (E-63 bis E-69).

- 4.1 `normalize_role()`: Gender-neutrale Rollennormalisierung (strippt `:in`/`:innen`-Suffixe)
- 4.2 SKOS-Hierarchie für Dokumenttypen, `build_dft_concepts()` emittiert `skos:Concept`-Knoten
- 4.3 `m3gim:dateEvidence` → `agrelon:hasProvenance` + `hasConfidenceValue` (Frontend-breaking, Phase 6 zieht nach)
- 4.4 `m3gim:SpatiotemporalEvent` als Top-Level-Graph-Entitäten (Komposit `ort, datum`)
- 4.6 Finanzschicht mit `monetaryAmount`/`currency`/`detailRole`, `parse_monetary_value()`, belegtes Währungsvokabular ohne ISO-4217-Zwang
- 4.7 Typisierte Datumsproperty-Familie (`m3gim:absendedatum`, `m3gim:auffuehrungsdatum` etc.); `is_iso_date()` filtert Freitext
- 4.8 AgRelOn-Relationen via `AGRELON_MAPPING` (HasEmployeeEmployer, HasCorrespondent, HasProfessionalContact, HasIsPatron, HasIsMember)

Durchgängig TDD mit `xfail(strict=True)`-Spec.

---

## Session 29 (2026-04-17): v2-Konsolidierung + Currency-Fix + Frontend-Kontrakt-Spec

- `data/` aufgeräumt: v1-Stände archiviert unter `data/_archive/`, v2 alleiniger Default. Ein Datenfluss, ein `data/output/`, ein `docs/data/` (E-70)
- `FINANCE_CURRENCY_DEFAULTS`-Mapping in `transform.py` (NIM_007 → `S` Schilling, E-71)
- `build-views.py` kopiert seitdem `m3gim.jsonld` + Derivate automatisch nach `docs/data/` (zuvor Drift-Quelle)
- Baselines in `tests/fixtures/baseline_counts.json` auf v2-Niveau gehoben
- `test_06_frontend_contract.py`: XPASS(strict)-Marker formulieren die Phase-6-loader.js-Arbeit als TDD-Spec

---

## Session 30 (2026-04-17): Phase 6 — loader.js indexiert v2-Strukturen + Phase 7 Schritt 1

**Phase 6 (Store-Maps in `loader.js`, E-72):**
- `dftHierarchy` (SKOS-Dokumenttyp-Hierarchie mit `broader`+`children`-Backrefs)
- `mobilityEvents` + `recordToEvents` (Top-Level-STE + Reverse-Map)
- `agentRelations` (AgRelOn am Record)
- `finances` (DetailAnnotations mit geparstem Betrag)
- `indexByYear()` nutzt typisierte Datumsproperties als Fallback

**Phase 7 Schritt 1 — Archiv-Inline-Detail zeigt v2-Daten:**
- Drei Panels: Finanzen (Tabelle), Beziehungen (AgRelOn-Chips), Ereignisse (SpatiotemporalEvent-Chips)
- Verifiziert gegen XLSX-Rohdaten für drei Anker-Records

---

## Session 31 (2026-04-17): Wikidata-Rerun + xlsxSource-Provenance + Quality-Snapshot

- Reconciliation + Enrichment auf v2-Indizes neu gelaufen; Low-Confidence-Policy: `fuzzy_low` nur bei `manual_review: "approved"` durchgereicht (E-74)
- `m3gim:xlsxSource` als technische Provenance auf Records + DetailAnnotations + AgRelOn-Relationen + SpatiotemporalEvents (E-73)
- Anker-Record-Strategie in `test_20_xlsx_provenance.py`: drei kuratierte Records (`NIM_007 5_1`, `NIM_004 3`, `NIM_003 1_8`) mit strict-Assertions + Soft-Coverage
- `scripts/report-quality.py` + `data/reports/quality-snapshot.md` als Team-taugliches Markdown
- Frontend-Debug: `window.m3gim.provenanceOf(recordId)` liefert alle XLSX-Quellen eines Records + Nested Entities

---

## Session 32 (2026-04-17): Interface-Fundament MVP — Redesign als Forschungswerkzeug (E-75)

Fünf aufeinander aufbauende Commits legten das neue Interface-Fundament:

- Alt-Viz entfernt: sechs D3-Prototypen (Mobilität, Matrix, Kosmos, Zeitfluss, Lebenspartitur, Lebensstationen) + zugehöriges CSS + zwei Standalone-HTMLs + `aggregator.js` + `viz-components.js` raus
- Archiv-Inline-Detail rendert Finanzen, AgRelOn-Beziehungen und SpatiotemporalEvents im neuen Rolle-Prefix-Chip-Pattern aus dem Archiv-Mockup: Uppercase-Mono-Prefix + Serif-Wert + Provenance-Pille + optionales Wikidata-Badge
- Indizes-Personen mit Beziehungsbadges: Loader-Pass 2.5 resolviert AgRelOn rückwärts auf Personen-Einträge
- DFT-Filter hierarchisch: `buildDftTree(store)` + `expandDftFilter()` in `format.js`
- Erschließungsstand-Tab als Browsing-UI für Quality-Snapshot (in Session 33 wieder entfernt, weil redundant zum Markdown-Report)

Designgrundlage durchgängig: `interface-konzept.md`.

---

## Session 33 (2026-04-17): Mobilitäts-Atlas MVP

Zwei sequenzielle Commits:

- **Koordinaten-Patch (Pipeline, TDD):** STE-`atPlace` trägt jetzt `@id`, `owl:sameAs`, `geo:lat`, `geo:long`, `m3gim:country` aus Wikidata-Enrichment. `process_verknuepfungen()` + `add_relations_to_records()` wiederverwenden vorhandenen `_inject_enrichment()`-Pfad. TDD via `tests/test_22_ste_coordinates.py` (Anker Zürich Q72, Salzburg Q34713).
- **Mobilitäts-Atlas-Tab:** neuer Tab `docs/js/views/mobilitaets-atlas.js`, Grid mit Leaflet-Karte (OSM-Tiles) + D3-Zeitstrahl (Brush) + Chip-Detailpanel, bi-direktional gekoppelt. Marker-Größe skaliert mit Event-Zahl pro Ort; Signal-Grün markiert Auswahl. Events ohne Koordinaten via Badge „N unverortet". `buildRoleChip()` aus `archiv-inline-detail.js` exportiert. Erschließungsstand-Tab wurde in diesem Pass wieder entfernt. (E-76)

---

## Session 34 (2026-04-17): Datenqualität + Interface-Ausbau (Repertoire · Biogramm · Netzwerk)

Mehrere Commits schlossen die Datenqualitäts-Gaps und vervollständigten das Sechs-Perspektiven-Fundament:

- **ORTE-Label-Bug (Pipeline):** `rico:Place` im Komposit `ort,datum` erbte die Datumsrolle — Fix in `transform.py`, TDD in `test_23_role_hygiene.py`. 18 Places mit Datumsrolle → 0.
- **Reconciliation-10-cities manuell approved:** Wien, München, Bayreuth, Köln, Venedig, Neapel, Buenos Aires, Lemberg, Lissabon, Stanislau. Effekt auf Atlas: STE-Coverage von 37 % auf 100 %.
- **Archiv-Inline-Detail-Migration:** `renderEntityChips()` entfallen, alle Chips via `buildRoleChip()`. Rechte Spalte auf fünf funktionale Blöcke regruppiert (Produktion · Mitwirkende · Werk & Repertoire · Ort & Ereignis · Erwähnt + Weitere). `ROLE_TO_SECTION`-Mapping in `constants.js` (E-77).
- **Drei neue Tabs:** Repertoire (parallele Aggregat-Tabellen Werke × Komponisten), Biogramm (D3-Zeitstrahl 1919–2009 mit Orte- + Belege-Spur + Flucht-Marker 1944), Netzwerk (AgRelOn-Tabelle mit Chip-Breakdown). (E-80)
- **CSS-Token-Refactor:** Font-, Farb-, Spacing- und Text-Tokens aus `variables.css` konsequent in den neuen Tab-CSS-Files. `.chip--compact` als geteilter Modifier in `archiv.css`.
- **Datenqualität Wikidata:** Zwei falsche Q-IDs aus dem Approval-Batch korrigiert (Bayreuth Q2861 war Rostock → Q3923; Stanislau Q200491 war US-Game-Publisher → Q156726). Neues `verify-manual-approvals.py`-Skript als Gate (E-78). Smart-P17-Selector in `enrich-wikidata.py` (`rank=preferred`) löst Berlin → Deutschland statt „Mark Brandenburg" (E-79).

---

## Session 35 (2026-04-17): Tab-Fokus + Konvolut-UX-Umbau

Vollständig dokumentiert in `status.md § Erreichte Meilensteine` und `entscheidungen.md § E-81/82/83`. Kurz:

- Tab-Bar auf Bestand · Chronik · Indizes reduziert (E-81); fünf Perspektiv-Tabs per `hidden` deaktiviert, Hash-Umleitung auf Bestand.
- Konvolut-Meta-Chips direkt in der Bestand-Zeile (E-82); `buildKonvolutDetail` entfällt.
- Hierarchische Sortierung Konvolute/Kinder (E-83).
- AgRelOn-Dedup-Bug gefixt, Folio-Filter auf Kinder, Sprach-Label-Auflösung, JSDoc-Shapes auf `buildStore()`.
- Drei neue Playwright-Canaries: Sprach-Label, Malaniuk-Dedup, Konvolut-Meta-Chips.

---

## Session 36 (2026-04-18): Chronik v2 — STE-Basis, Mobilitätssichten, Mini-Map

Fortsetzung nach 35. Ziel: die Chronik wird räumlich ehrlich und fachlich scharf — STE-Events werden zur Primär-Datenquelle, die fünf Mobilitätssichten aus `forschungsrahmen.md § Fünf Mobilitätstypen` werden als Chip-Farbfamilie sichtbar, eine Mini-Map pro Periode löst das bislang nur textuelle Mobilitäts-Signal ein. Plan: `~/.claude/plans/m3gim-chronik-v2.md` mit sieben Meilensteinen, jeder = ein Commit, jeder mit Journal-/Knowledge-Update.

- **M0 Silent-Bug-Fix + Test-Infrastruktur.** `ReferenceError: currentFilters is not defined` (drei Stellen in `archiv-chronik.js`): Closures referenzierten eine im Session-35-Refactor entfernte Modulvariable, was jede Klick-Interaktion auf Periodenheader und Records still abbrach. Screenshots sahen korrekt aus, die Chronik war de facto read-only. Fix: `updateChronikView(currentFilters)` → `updateChronikView()`. Zusätzlich kompakte State-Log-Stempel in `archiv-bestand.js`, `archiv-chronik.js`, `indizes.js` (eine Zeile pro Render mit fester Key-Reihenfolge, z.B. `[chronik] bearbeitet:63 | perioden:7 | undatiert:16 | ohne-location:13 | modus:location`). Playwright-Smoke erweitert um Stempel-Verify pro Tab und Click-Canary für Chronik (Periode auf → Body + Records + 0 Konsole; Record auf → Inline-Detail). Die Stempel-Prüfung hätte den `currentFilters`-Bug gefangen, da die Render-Funktion vor dem Log-Stempel fehlgeschlagen wäre. Smoke 14/14 grün.
- **M1 Housekeeping + Counter-Tooltip.** Der lokale `EXCLUDED_DFT = new Set(['plakat', 'tontraeger'])` im Chronik-Filter war toter Code — Plakate und Tonträger werden bereits vollständig von der `unprocessedIds`-Maske geschluckt (0 Matches im Bearbeitet-Pool verifiziert). Entfernt; der Filter besteht jetzt nur noch aus `!unprocessedIds.has(id)`. Der Counter-Span im `_archiv-toolbar.js` trägt ein `title`-Attribut, das „bearbeitet" für Bestand und Chronik identisch erklärt (Schicht 1 + 2 erschlossen, Plakate/Tonträger ausgeblendet, Verweis auf `quality-snapshot.md`). `frontend.md § Bestand und Chronik` nachgezogen. Smoke 14/14 grün, pytest 188 passed.
- **M2 Ehrlicher Rahmen.** `PERIOD_ORDER` als Modul-Konstante; die Render-Schleife iteriert alle acht Perioden, nicht mehr nur die belegten. Leere Perioden (1945-49 Graz/Nachkriegszeit, 1970-74 Rückzug/Zürich) erscheinen gedimmt mit „Kein bearbeitetes Material erfasst" — Erschließungslücken werden sichtbar, nicht weggelassen. Karriere-Notizen bekommen eine Dotted-Underline + Tooltip „Redaktionelle Einordnung durch das Projektteam, nicht aus Metadaten generiert" (`.chronik-period__note--editorial`). Ein Dichte-Mikro-Balken (CSS, `.chronik-period__density` / `--density-bar`) zeigt den Anteil jeder Periode am stärksten belegten Zeitfenster neben dem Count. `sortGroupedPeriods` und `groupByPeriodAndLocation` nutzen die gemeinsame `PERIOD_ORDER`-Konstante. Log-Stempel erweitert: `perioden-leer:2`. Neuer Playwright-Canary `chronik:empty-periods` prüft 9 Perioden im DOM und 2 als `--empty`. `interface-konzept.md § 10` erweitert um „Leere Zeitfenster bleiben sichtbar" und „Redaktionelle Einordnung wird markiert". `frontend.md § Chronik` nachgezogen. Smoke 15/15 grün.
- **M3 Mobilitätssichten-Farbsystem (Vorbereitung).** Neue Konstante `EVENT_ROLE_TO_MOBILITY_CLUSTER` in `docs/js/data/constants.js` mappt jede `m3gim:eventRole` auf eine der fünf Sichten aus `datenmodell.md § 10` (performativ, institutionell, korrespondenz, diskursiv, biografisch) oder explizit auf `null` (neutral, für `erwähnt`). CSS-Tokens `--color-sicht-*` in `variables.css` (orthogonal zu den `--color-mob-*`-Typen-Farben, die die fünf Mobilitätstypen aus `forschungsrahmen.md` abdecken). Chip-Modifier `.chip--mobility-*` mit `box-shadow`-Akzentbalken in `archiv.css`. Neuer Test `tests/test_25_chronik_mobility_cluster.py` parst das Mapping per Regex und erzwingt: (1) jeder Cluster-Wert ist in den fünf gültigen Sichten, (2) jede im Datenstand belegte eventRole ist explizit gemappt, (3) die Must-have-Datumsrollen aus `datenmodell.md § 5` (absendedatum, empfangsdatum, erscheinungsdatum, ausstellungsdatum, spielzeit) sind abgedeckt. Bisher keine UI-Änderung an der Chronik — die Infrastruktur wartet auf M4, wo die STE-Events zur Primärquelle werden. `datenmodell.md § 10` um „UI-Andockpunkt (Session 36)" ergänzt, `interface-konzept.md § 3` um die zweite Farbachse, `frontend.md` Constants-Zeile aktualisiert, `tests.md` Testtyp 25 eingetragen. Smoke 15/15 grün, pytest 191 passed.

