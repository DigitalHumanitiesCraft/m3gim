---
title: Journal
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
  name: Vorlage Journal
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/journal
related: [decisions, project, plan]
---

# Journal

Dieses Dokument ist die chronologische Genese des Projekts als komprimierte Session-Dokumentation. Entscheidungen und Erkenntnisse stehen vollständig, Dateilisten und CSS-Details sind entfernt. Die jüngeren Meilensteine ab Session 40 sind aus dem früheren Status-Dokument zusammengeführt.

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
- **M3 Mobilitätssichten-Farbsystem (Vorbereitung).** Neue Konstante `EVENT_ROLE_TO_MOBILITY_CLUSTER` in `docs/js/data/constants.js` mappt jede `m3gim:eventRole` auf eine der fünf Sichten aus `datenmodell.md § 10` (performativ, institutionell, korrespondenz, diskursiv, biografisch) oder explizit auf `null` (neutral, für `erwähnt`). CSS-Tokens `--color-sicht-*` in `variables.css` (orthogonal zu den `--color-mob-*`-Typen-Farben, die die fünf Mobilitätstypen aus `forschungsrahmen.md` abdecken). Chip-Modifier `.chip--mobility-*` mit `box-shadow`-Akzentbalken in `archiv.css`. Neuer Test `tests/test_25_chronik_mobility_cluster.py` parst das Mapping per Regex und erzwingt: (1) jeder Cluster-Wert ist in den fünf gültigen Sichten, (2) jede im Datenstand belegte eventRole ist explizit gemappt, (3) die Must-have-Datumsrollen aus `datenmodell.md § 5` (absendedatum, empfangsdatum, erscheinungsdatum, ausstellungsdatum, spielzeit) sind abgedeckt. Bisher keine UI-Änderung an der Chronik — die Infrastruktur wartet auf M4, wo die STE-Events zur Primärquelle werden. `datenmodell.md § 10` um Frontend-Verweis ergänzt, `interface-konzept.md § 3` um die zweite Farbachse, `frontend.md` Constants-Zeile aktualisiert, `tests.md` Testtyp 25 eingetragen. Smoke 15/15 grün, pytest 191 passed.
- **M3.5 Review-Sanitätslauf (Teil 1).** Nach ehrlicher Selbst-Evaluation vier Blocker- und Soll-Korrekturen zusammengezogen, bevor M4 auf dem Fundament aufbaut. (a) Willkürliche Mobility-Cluster-Einträge zurückgesetzt: `auftrag`, `entstehung` (nicht in § 5 spezifiziert) und finanzielles `ueberweisung` stehen jetzt explizit auf `null` mit Klärungs-Kommentar, statt plausibler, aber belegloser Einordnungen. (b) Toolbar-Counter und Karriere-Notiz-Tooltips auf das Projekt-eigene `data-tip`-Pattern (`components.css`) umgestellt — das Browser-`title`-Attribut war inkonsistent mit der Chronik-Umgebung und nicht CSS-stylbar. (c) Dichte-Mikro-Balken visuell gestärkt: 64×10 px mit Rahmen, der leere Track bleibt bei 0-Wert als eigenständiges Signal sichtbar. (d) Editorial-Markierung aus der stillen Dotted-Underline herausgehoben: sichtbarer `red.`-Präfix-Marker (`.chronik-period__editorial-marker`, Mono-Font, Cream-Hintergrund) löst die Designregel „Datenqualität wird gezeigt, nicht gemergt" wörtlich ein. (e) Neuer Helper `logStamp()` in `docs/js/utils/env.js` mit `IS_DEV`-Check (hostname localhost); die drei Views nutzen ihn statt direktem `console.log`. Auf `dhcraft.org` bleibt die Konsole stumm, lokal und im Playwright-Smoke ist das Format identisch. (f) Der „UI-Andockpunkt"-Block aus `datenmodell.md § 10` wurde nach `frontend.md § Chronik` verschoben; Ontologie-Spec bleibt operativ. Smoke 15/15 grün, pytest 191 passed.
- **M3.5 Review-Sanitätslauf (Teil 2).** Smoke-Canary-Code refaktorisiert, damit M4/M5 weitere Tests ohne Copy-Paste anhängen können: Helper `expect_stamp(stamps, view, required_keys)` prüft Stempel-Existenz *und* Key-Vollständigkeit (fängt stillen Key-Drift beim Refactor), Helper `expect_no_new_errors(errors, before)` ersetzt die manuelle Slice-Arithmetik. `stamp_expectations`-Dict legt für jeden Tab die erforderlichen Log-Keys fest. Der `chronik:empty-periods`-Canary ist verschärft: er prüft jetzt zusätzlich, dass leere Perioden *wirklich leer* sind (`.chronik-period--empty .chronik-record` = 0) — ein Bug, der eine leere Periode befüllt, würde jetzt fangen. Smoke 15/15 grün.

---

## Session 37 (2026-04-18): Statistik-Tab — Zusammenschau des Bestandes

Neuer vierter Tab zwischen Chronik und Indizes. Zweck: aggregierte Visualisierung des gesamten Bestandes als Showroom, nicht als Forschungstool. Entlastet die fachlichen Tabs (Bestand/Chronik/Indizes) von ihrer impliziten Doppelrolle als Überblicks-Panels. Plan: `~/.claude/plans/playful-sauteeing-valley.md` mit sechs Meilensteinen (M0-Scaffold bis M5-Knowledge-Sync), jeder = ein Commit, jeder mit Journal-Update.

- **M0 Scaffold.** Tab-Registrierung in `index.html` (Button mit Bar-Chart-Icon zwischen Chronik und Indizes, neue `<section id="tab-statistik">`, neuer CSS-Link), `TAB_RENDERERS`-Eintrag und `logTabActivation`-Profil in `main.js`, `VISIBLE_TABS` und `TABS` in `router.js` um `'statistik'` erweitert. Neue View `docs/js/views/statistik.js` als read-only Render-Funktion ohne Module-State (keine Toolbar, keine Filter, keine Re-Renders — senkt die Bug-Oberfläche gegenüber Bestand/Chronik deutlich). Vier Placeholder-Sektionen für M1-M4 bereits eingerichtet, damit die DOM-Struktur stabil ist. Neues Stylesheet `docs/css/statistik.css` mit Grid-Skelett, KUG-Blau-Akzenten und Sektions-Basisklassen. Smoke-Test registriert: `TABS`-Array und Konsolen-Stempel-Erkennung um `'statistik'` erweitert, `stamp_expectations` um die fünf Keys `records / konvolute / events / personen / sektionen` ergänzt. Smoke 17/17 grün (neuer Stempel `[statistik] records:381 | konvolute:7 | events:43 | personen:308 | sektionen:4` sichtbar), pytest 191 passed.
- **M1 Hero-Row + § 1 Bestand in Zahlen.** Vier Kennzahlen-Karten als Hero (Datensätze · Konvolute · Spatiotemporal-Events · Personen), jede als Link in den jeweiligen Fach-Tab (`#bestand`, `#chronik`, `#indizes`). Quelle sind `store.allRecords.length` (378, nach Folio-Filter — ehrlicher als das rohe `recordCount` von 381, das Folio-Metadaten mitzählt), `store.konvolute.size`, `store.mobilityEvents.size`, `store.persons.size`. Erste Sektion Bestand in Zahlen mit zwei Subsektionen: Dokumenttypen (Balken aus `store.allRecords` via `getDocTypeId` + Label aus `store.dftHierarchy`, absteigend sortiert) und Bearbeitungsstand (Buckets abgeschlossen / begonnen / zurückgestellt / ohne Status-Feld, aus `record['m3gim:bearbeitungsstand']`). Reine Aggregations-Helper `aggregateDocTypes(store)` und `aggregateBearbeitungsstatus(store)` als pure Funktionen — einfach testbar, memoizable, keine Seiteneffekte. Gemeinsamer Balken-Renderer `buildBarList(rows)` mit optionalem `tone`-Modifier (complete/progress/deferred/unprocessed) als CSS-Klasse. Log-Stempel um Keys `doctypes`, `abgeschlossen`, `unbearbeitet` erweitert, damit Silent-Regressions beim Aggregations-Code auffallen. Smoke 17/17 grün.
- **M2 Mobilitätssichten + Geografie.** Zweite Sektion „Die fünf Mobilitätssichten" als Kachel-Grid mit den Farben aus `--color-sicht-*` (performativ · institutionell · korrespondenz · diskursiv · biografisch) plus einer sechsten neutralen Kachel „Nicht klassifiziert" für Events mit Rollen, die in `EVENT_ROLE_TO_MOBILITY_CLUSTER` bewusst auf `null` stehen (`erwähnt`, `auftrag`, `entstehung`, `ueberweisung` — bewusst nicht erfunden, Entscheidung aus M3.5). Pro Kachel: Count, Prozent-Anteil an allen STE-Events, Beschreibung der Sicht, und ein Beispiel-Datensatz als Link (`#bestand/<recordId>`) — das macht den abstrakten Cluster sofort konkret. Dritte Sektion „Geografie" mit Top-10-Orten (Balken, aggregiert nach `placeWikidata || place`, Label wo vorhanden zu Wikidata verlinkt) und Zeitspanne der datierten Events (aus `ev.date.slice(0,4)` extrahiert, typografisch KUG-Blau). Aggregations-Helper `aggregateSichten(store)`, `aggregatePlaces(store)`, `eventYearSpan(store)` — wieder pure Funktionen. CSS-Tokens werden unverändert aus `variables.css` übernommen; die Chip-Farbfamilie, die in der Chronik seit M3 die STE-Events markiert, ist hier als Border-Left-Akzent in den Sicht-Kacheln gespiegelt — gleiche Daten, gleiche Farben, konsistente Leserführung. Log-Stempel um `sichten` (Zahl belegter Sichten) und `orte` (Zahl unterschiedlicher Orte) erweitert. Smoke 17/17 grün.
- **M3 Netzwerk + Repertoire.** Vierte Sektion „Netzwerk" aggregiert AgRelOn-Relationen aus `store.agentRelations` nach Typ (Korrespondenz, Förderung / Patronage, Beruflicher Kontakt, Mitgliedschaft, Anstellung — deutsche Kurzlabel in `AGRELON_LABEL` zentralisiert). Darunter eine Chip-Row der Personen-Kategorien aus `store.persons.*.kategorie` (Komponist, Dirigent, Regisseur, Andere), und eine schlichte Zeile für die Organisations-Zahl — Opernhäuser und Festspiele sind bereits im Indizes-Tab als eigener Register sichtbar, daher keine Doppel-Visualisierung. Fünfte Sektion „Repertoire" mit Top-10-Komponisten als Balken (aggregiert aus `store.works.*.komponist`) und einem kurzen Erläuterungssatz zur Dominanz von Wagner/Strauss plus italienischem Repertoire — bewusst nicht als quantifizierte Behauptung, sondern als Kontextrahmen für die Balken. Neuer gemeinsamer Chip-Renderer `buildCountChip({label, count, tone})` mit Farbvarianten `--relation`, `--kategorie-*` (tönt pro Kategorie in die entsprechende `--color-cat-*`-Familie aus `variables.css`). Aggregations-Helper `aggregateAgentRelations(store)`, `aggregatePersonKategorien(store)`, `aggregateComposers(store)` — pure Funktionen wie bisher. Log-Stempel um `relationen` (Gesamtzahl AgRelOn-Einträge) und `komponisten` (Zahl unterschiedlicher Komponisten) erweitert. Smoke 17/17 grün.
- **M4 Verlinkung & Qualität + Finanzen.** Sechste Sektion „Verlinkung & Qualität" zeigt Wikidata-Abdeckung pro Entitätstyp (Personen · Organisationen · Orte · Werke) als vier Mini-Balken im `stat-bars__fill--complete`-Ton (grün). Quelle ist `entry.wikidata` mit `wd:`-Präfix-Check, identisch zu `logStoreSummary` in `main.js`. Darunter die Provenienz-Zeile mit dem `xlsxSource`-Anteil unter den Records — das ist der ehrliche Qualitäts-Selbsttest, den der Statistik-Tab als einziger Ort im UI explizit zeigt (bisher nur im Dev-Konsolen-Log sichtbar). Siebte Sektion „Finanzen" aggregiert `store.finances` über alle Einträge: Gesamtzahl, Währungsverteilung als goldene Chip-Row (Schilling · Escudo · Reichsmark · Franc · DM — `CURRENCY_LABEL` übersetzt die ISO-Kurzcodes) und Detail-Rollen (erwähnt · provision · abendgage) als zweite Chip-Row. Der `stat-section--minor`-Modifier dimmt den Block leicht, weil die Finanzen als Teilerschließung gekennzeichnet sind. `aggregateFinances(store)` als pure Helper-Funktion. Placeholder-Sektionen entfernt; das Tab ist inhaltlich komplett. Log-Stempel um `finanzen` und `waehrungen` erweitert. Smoke 17/17 grün mit Stempel `[statistik] records:378 | konvolute:7 | events:43 | personen:308 | sektionen:7 | doctypes:17 | ...`.
- **M5 Knowledge-Sync + Decision-Record + Polish.** Drei Knowledge-Dateien nachgezogen, damit der Tab spec-verankert ist: `knowledge/frontend.md` bekommt einen eigenen §-Block „Statistik (seit Session 37)" zwischen Bestand/Chronik und Indizes — beschreibt die sieben Sektionen, die read-only-Natur, die pure-function-Aggregations-Helper, die wiederverwendeten Bausteine, den Log-Stempel und die eingebauten Ehrlichkeits-Signale. `knowledge/entscheidungen.md` ergänzt **E-85 — Statistik-Tab ist Showroom, nicht Research-Tool** mit drei Begründungen (Eingangs-Sicht für DH-Projekt, read-only senkt Bug-Oberfläche, Verankerung in `frontend.md` statt eigener Spec-Datei) und expliziten Ablehnungen (Filter/Drill-Down, Vergleichsmodi, Exporte). `knowledge/status.md` bekommt einen „Session 37 — Statistik-Tab"-Block unter Erreichte Meilensteine. Kleiner Polish am Smoke: Tab-Element-Selector um `.stat-section` und `.statistik-chip` erweitert, damit der Statistik-Tab nicht mehr mit `0 Elemente` durchrauscht — die 27 gerenderten Sektionen + Chips sind jetzt im Smoke-Report sichtbar. Final: Smoke 17/17 grün, pytest 191 passed. Sechs Commits in Session 37 (M0–M5), Tab steht, Knowledge aligned, E-85 dokumentiert die Abgrenzung zu zukünftigen dedizierten Perspektiv-Tabs.
- **M5.5 Review-Sanitätslauf.** Analog zu Session 36 M3.5 eine ehrlich-kritische Runde nach den Sprint-Commits, weil das Plan-Risiko „Schein-Vollständigkeit" im Ergebnis nicht entschärft war. Drei Befunde korrigiert: (a) Tab-Intro bekommt einen `.statistik__caveat`-Block mit goldener Linke, der den Erschließungsstand explizit benennt („N von M Datensätzen tragen einen Bearbeitungsstand, der Rest wartet auf Erschließung") — aus dem Live-Store berechnet, nie hardcoded. Damit wird der Tab nicht mehr als Vollständigkeits-Theater wahrgenommen. (b) Hero-Captions auf ehrliche Semantik umgestellt: „Konvolute" nennt jetzt den Unterschied zum Bestand-Tab (Statistik zeigt alle, Bestand nur die mit bearbeiteten Folios), „Personen" erklärt dass der Index sowohl aktive Agent:innen als auch rein Erwähnte zusammenfasst, „Datensätze" weist auf Plakate/Tonträger/Folios hin. Die Captions nehmen die Spannung aus den Zahl-Widersprüchen zwischen den Tabs. (c) Repertoire-Erläuterungssatz von fester Behauptung („Wagner und Strauss dominieren, dazu italienisches Repertoire") zu datengetriebener Aussage umgebaut: „N einzigartige Werke, verteilt auf M Komponisten. Führend: X (Y Werke)." Der Satz kann nicht mehr still durch Datenänderung falsch werden. Smoke 17/17 grün.

---

## Session 38 (2026-04-18): Statistik-Review — drei ehrliche Lücken geschlossen

Verification-Lauf gegen den Live-Store hat drei Schwachstellen im Statistik-Tab aus Session 37 aufgedeckt. Vier Commits, strikt nach der Regel aus `knowledge/xlsx-fixes.md`: „Documents as Source of Truth — Pipeline-Workarounds sind Schulden, nicht Features." Plan: `~/.claude/plans/playful-sauteeing-valley.md` (überschrieben).

- **M1 — § 1 zeigt ungetypte Records ehrlich.** Die Dokumenttypen-Balken summierten 292 statt 378, weil `aggregateDocTypes` Records ohne DFT-Typ stillschweigend wegfilterte. Fix: ein zusätzliches „ohne Typ"-Bucket wird gesammelt und **bewusst ans Ende** der Balkenliste gehängt, nicht nach Count einsortiert — das liest sich als „die häufigsten Typen zuerst, dann die Datenlücke" klarer als ein Grau-Balken mitten in der Sortierung. CSS-Modifier `stat-bars__fill--missing` (text-tertiary mit Opacity 0.55) steht in einer Reihe mit dem vorhandenen `--complete/--progress/--deferred/--unprocessed`-Vokabular. logStamp bekommt einen neuen Key `doctypes-ohne`; der bisherige `doctypes`-Key zählt jetzt nur die echten Typen (17), damit die Stempel-Semantik klar bleibt. Smoke robust, 17/17 grün. Im Browser: § 1 zeigt jetzt 18 Zeilen, Summe 378.
- **M2 — Komponisten-Duplikate-Detektor ohne Pipeline-Workaround.** § 5 Repertoire listete „Beethoven, Ludwig van" (3 Werke) und „Beethoven, Ludwig von" (2 Werke) als zwei verschiedene Komponisten — typischer Tippfehler im Werkindex-XLSX. **Entscheidung: kein `normalize_composer()` in `scripts/transform.py`.** Das wäre ein Sonderfall-Workaround, der einen einzelnen Tippfehler kaschiert und künftige Varianten stillschweigend weiter kaschieren würde; widerspricht der `xlsx-fixes.md`-Regel. Stattdessen neuer Test `tests/test_24_composer_uniqueness.py::test_komponisten_ohne_fuzzy_duplikate` mit Levenshtein-Ratio ≥ 92 — findet van/von-Paare und jede künftige Tippfehler-Variante, bleibt `xfail(strict=True)` bis XLSX-Fix durch das Archivteam. Nach Fix: XPASS → Suite bricht → Marker entfernen, damit der Test nicht stumm als xfail „vergessen" wird. Neuer `§ 14` in `knowledge/xlsx-fixes.md` dokumentiert das Ticket + die Prinzip-Begründung explizit („Bewusst NICHT im Code"). Suite grün (191 passed, 2 xfail inkl. dem neuen).
- **M3 — § 6 Low-Confidence-Badge via Meta-Block im JSON-LD.** § 6 Qualität zeigte Wikidata-Abdeckung + Provenienz, aber der approved-Count manueller Q-ID-Freigaben (E-74) fehlte — das Frontend hatte keinen Zugang zu `wikidata-reconciliation.json`. Fix im Top-Level-Meta des JSON-LD statt zusätzlicher Datei: `scripts/transform.py` schreibt `m3gim:approvedManualMatches` und `m3gim:lowConfidenceSkipped` (Werte lagen lokal in `recon_count` / `recon_low_skipped` bereits vor) in den JSON-LD-Dokumentkopf. Damit bleibt die harte Regel aus `CLAUDE.md` — „m3gim.jsonld ist die einzige primäre Datenquelle für das Frontend" — unangetastet. Loader liest in `store.qualityMeta.{approvedManualMatches, lowConfidenceSkipped}` mit `?? 0`-Defaults für Test-Fixtures. `buildQualitaetSection` ergänzt eine dritte Subsection „Low-Confidence-Policy" nach Wikidata-Coverage + Provenienz: „261 manuell freigegebene Wikidata-Matches (fuzzy_low 80–89). Ein weiterer Low-Confidence-Treffer wartet auf redaktionelle Sichtung. Entscheidung E-74: fuzzy_low fließt nur nach `manual_review: 'approved'` ins Modell." Singular/Plural-Grammatik. logStamp bekommt `approved`-Key. Smoke 17/17 grün, 191 passed.
- **M4 — Knowledge-Sync.** `knowledge/status.md` bekommt einen Block „Session 38 — Statistik-Review + Datenqualitäts-Audit" unter Erreichte Meilensteine. `knowledge/xlsx-fixes.md § 14` dokumentiert das Beethoven-Ticket. Dieser Journal-Eintrag schließt die Session. Plan-File in `~/.claude/plans/playful-sauteeing-valley.md` wurde während Session 37 überschrieben — der ursprüngliche Session-37-Plan steht deshalb nicht mehr dort, ist aber durch die Session-37-Journal-Einträge dokumentiert.

---

## Session 39 (2026-04-18): Knowledge-Refactor — Hygiene-Lauf

Audit des `knowledge/`-Ordners (Ist-Zustands-Bericht via Explore-Agent) hat drei Problemklassen aufgedeckt: Quantitäten in Knowledge-Dokumenten (verletzt Memory-Regel `feedback_no_quantities.md`), Drift in Root-Dokumenten (`README.md` listet veraltete Sechs-Tab-Architektur, `CLAUDE.md` kennt § 14 noch nicht), Redundanz zwischen `pipeline.md` und `xlsx-fixes.md`. Kein neues Feature — reiner Hygiene-Lauf in fünf Commits. Plan: `~/.claude/plans/playful-sauteeing-valley.md` (überschrieben).

- **M1 — Quantitäten aus Knowledge tilgen.** `status.md` Session-38/37/35/34-Blöcke umformuliert: „86 Records (23 %)", „Summe 378", „14 Log-Keys", „fünf Verknüpfungen zu 100 %", „18 Places → 0", „STE-Coverage 37 % auf 100 % (43/43), Wien 15 Events" etc. durch qualitative Aussagen ersetzt. Zahlen bleiben im Quality-Snapshot, wo sie mit jedem Pipeline-Lauf frisch sind. Nebenbefund im Session-34-Block: zwei Q-IDs waren noch mit den falschen Werten gelistet (Bayreuth Q2861, Stanislau Q200491) — korrigiert auf Q3923 / Q156726 im Stiftungsgedanken, den der Korrekturhinweis selbst bereits beschrieb. `frontend.md` Routing-Absatz: „acht Einträge" / „drei ersten" durch `TABS` + `VISIBLE_TABS`-Verweise ersetzt — mit dem Nebeneffekt, dass der Statistik-Tab in der Aufzählung endlich dabei ist (war in dem Absatz seit Session 37 übersehen). Header „Frontend-Module (Stand nach Session 34)" zu „Frontend-Module" — Session-Datierung im Header war offene Einladung zum Drift.
- **M2 — `README.md` + `CLAUDE.md` synchron ziehen.** `README.md` Zeile 34 listete noch die Sechs-Tab-Architektur vor Session 35 (Archiv, Indizes, Mobilitäts-Atlas, Repertoire, Biogramm, Netzwerk + Wissenskorb) — glatte Fehlinformation für externe Leser der GitHub-Landing. Auf aktuellen Stand gebracht mit explizitem Hinweis auf die verborgenen Tabs. `CLAUDE.md` Zeile 34: Laufzeit-Aussage „<1s" für pytest entfernt (Suite braucht inzwischen mehrere Sekunden). `CLAUDE.md` Zeile 93: Workaround-Aufzählung um „Komponisten-Schreibweisen" ergänzt (neuer § 14 aus Session 38).
- **M3 — `tests.md` gegen Realstand synchronisieren.** `pytest --collect-only -q` als Quelle: `test_24_composer_uniqueness` (Session 38) fehlte in der Übersichtsliste und hatte keinen eigenen Abschnitt — beides nachgetragen mit Prinzip-Begründung. `test_25_chronik_mobility_cluster` (Session 36) war nur in der Liste, jetzt eigener Abschnitt. Nummern-Lücken (test_17, test_21) explizit als bewusst dokumentiert — ohne diesen Satz liest sich die Lücke als Fehler. Laufzeit-Aussagen („unter einer Sekunde", „<1 min") entfernt. Smoke-Beschreibung „drei aktiv sichtbaren Tabs" auf `VISIBLE_TABS`-Verweis umgestellt, damit die Beschreibung nicht erneut driftet.
- **M4 — `pipeline.md` dedupliziert + `interface-konzept.md` präzisiert.** `pipeline.md` hatte die Datenqualitäts-Baseline und die Handlungsbedarfe eigenständig dupliziert — beides existiert strukturierter in `xlsx-fixes.md` (Workaround-Katalog mit Prinzip-Einordnung) und im laufenden `quality-snapshot.md` (Zahlen). Rund sechzig Zeilen durch einen Verweis-Block ersetzt. § „Modell-Weiterentwicklung" Phase 7 sprach noch von „Sechs Perspektiv-Tabs" — durch Verweis auf `status.md` ersetzt. `interface-konzept.md` Tab-Architektur-Kopf: Source of Truth ist `router.js::VISIBLE_TABS`, nicht das Dokument — die aktuelle Sichtbarkeits-Aussage bleibt, aber mit explizitem Verweis-Anker. Die Tab-Tabelle bekommt eine Zeile für Statistik (war seit Session 37 untauglich; das Dokument sprach immer noch nur über Bestand/Chronik/Indizes).
- **M5 — Journal-Eintrag + Fail-Safe.** Dieser Block schließt die Session. `python -m pytest tests/ -m "not slow"` grün (191 passed, 2 xfailed wie erwartet), Frontend-Smoke 17/17 grün — Knowledge-Änderungen haben keinen Code berührt, war aber Pflicht-Check.

Out of Scope dieses Laufs: Fusion von `interface-konzept.md` ⇄ `frontend.md` (die Redundanz zwischen Design-Spec und Code-Inventar ist absichtlich), Fusion `ira-malaniuk.md` ⇄ `forschungsrahmen.md` (biografische Referenz verdient Eigenständigkeit), Umstrukturierung der Phasen-Roadmap in `datenmodell.md` (zu groß). Die jetzigen Befunde waren die belastbar klar falschen oder redundanten; tiefere Refaktorierungen können folgen, wenn weiterer Drift-Schmerz auftritt.

---

## Session 40 (2026-04-18): Chronik rein datengetrieben (E-87)

Redaktionelle Karriere-Notizen aus der Chronik entfernt. `KARRIERE_NOTIZEN` und das note-Rendering im Perioden-Header gestrichen, Editorial-Marker-CSS entfernt. Die Perioden-Summary aus Top-Typen und Top-Gruppen trägt die datengetriebene Charakterisierung allein. Grundsatz: alles, was gerendert wird, muss aus `store.*` ableitbar sein. Strukturelle Labels und prozessuale Workflow-Terminologie bleiben, weil sie keine historische Deutung leisten. Knowledge-Sync in [design.md](design.md).

## Session 41 (2026-04-18): Chronik als Scroll-Zeitstrahl, Ort- und Werk-Filter

Chronik vom Perioden-Akkordeon auf einen scrollenden Jahres-Zeitstrahl umgestellt (E-88). Records erscheinen als klickbare Punkte rechts der Zeitachse pro Jahr, leere Jahre bleiben als Umriss-Dot sichtbar, die Dot-Größe skaliert mit der Jahresbelegung. Gruppierungs-Toggle und Fünfjahresperioden-Logik entfallen. Die geteilte Filter-Toolbar für Bestand und Chronik bekommt die Facetten Ort und Werk als Entity-Comboboxen; `buildPersonCombobox` ist zu einem generischen `buildEntityCombobox` refaktoriert.

## Session 42 (2026-04-18): Statistik als visuelles Porträt, generische Toolbar

Statistik-Tab umgebaut (E-89), weg von Prozent-Balken und Tech-Tabellen, hin zu D3-Donut, Histogramm und horizontalen Bars. Die Sektion zur Verlinkung und Qualität sowie der Bearbeitungsstand-Balken sind entfernt, das Tech-Reporting lebt im Markdown-Report. Die Filter-Toolbar ist als generische Komponente `_toolbar.js` neu gezogen, jeder Tab deklariert seine Facetten.

## Session 43 (2026-04-18): UI-Feinschliff (E-90)

Drei sichtbare Defekte und eine Statistik-Politur in einem Durchlauf. Der Konvolut-Aufklapp-Chevron wird als KUG-blauer Button mit `aria-expanded` dargestellt. Die Provenance-Pille am Rolle-Prefix-Chip nutzt das CSS-data-tip-System mit mehrzeiligem Tooltip, Doppel-Tooltips sind beseitigt. Das Wikidata-Badge bekommt eine Trennlinie und einen eigenen Hover-State. In der Statistik tragen Donut-Legenden bei Ellipsis ein data-tip, das Histogramm dünnt Ticks aus, das SVG-Wrap shrinkt auf schmalen Viewports.

## Session 44 (2026-04-18): Projekt-Finalisierung (E-91)

Abschluss des Interface-Redesign-Zyklus. Ein Chip-Klick setzt den Toolbar-Filter im aktiven Record-Tab und lässt den Lesefluss dort, statt in die Indizes zu springen. Die Indizes-Toolbar nutzt die generische `buildToolbar`-Komponente. `extractXlsxSource` ist nach `utils/provenance.js` als ein Ort der Wahrheit refaktoriert. Der Smoke-Test ist auf den Chronik-Zeitstrahl umgestellt. Korb-Follow-ups entschieden, Konvolute bleiben nicht bookmarkbar, der Tab-Name bleibt Wissenskorb.

## Session 45 (2026-04-18): Statistik schärfer, Chronik dichte-adaptiv (E-92)

Gezielte Korrekturen nach Screenshot-Review. Die Statistik-Hero-Row ist entfernt. Die Mobilitätssichten rendern als ein einziger Balken-Chart mit eigener Farbfamilie pro Sicht statt als Feature-Kacheln. Das Histogramm bekommt Achsen-Titel. Die Chronik-Jahre sind dichte-adaptiv, leere Jahre als kurze Linie, belegte auf voller Höhe, Dekaden-Jahre als Anker.

## Session 46 (2026-04-18): Netzwerk-Tab als konzentrische Personen-Visualisierung (E-93)

Der Netzwerk-Tab antwortet auf die Frage, mit welchen Personen Malaniuk in Beziehung stand. Malaniuk steht im Zentrum, alle anderen Personen auf zwei konzentrischen Ringen, geordnet nach Evidenzstärke (Ring 1 harte Beziehung, Ring 2 wiederkehrendes Umfeld). Winkel alphabetisch, Positionen analytisch berechnet, Determinismus vor Force-Simulation. Zwei Linientypen sind unterschieden, eine gerade Radial-Linie für die direkte AgRelOn-Beziehung und eine geschwungene Bezier-Kurve für Ko-Okkurrenz. Der Tab ist pipeline-frei und liest direkt aus dem Store, die Kategorien werden aus den tatsächlichen Rollen-Sets mit Prioritätsordnung abgeleitet. Die Geometrie ist nach `_netzwerk-geometry.js` ausgelagert, dazu Zoom, Pan, Filter und Zeitfenster in der Sidebar.

## Session 47 (2026-04-18): Netzwerk-Tab Hygiene-Runde (E-94)

Konstruktiv-kritische Nachbereitung der Netzwerk-Visualisierung. Unit-Tests für die reinen Funktionen über `node:test` decken Ringklassifikation, Layout, Ko-Okkurrenz und Label-Geometrie ab. Das Sophokles-Datenartefakt ist dokumentiert, in Zeile 1208 trägt Sophokles als Person die Rolle Aufführung, was semantisch falsch ist, der Source-Fix-Vorschlag steht in [data.md § Datenqualität](data.md), bewusst ohne Sondermapping im Code. Die Kategorie-Farben sind Design-Tokens. Edge-Hover hebt die Endpunkte hervor. `netzwerk.js` ist in Orchestrator, Sidebar und Canvas gesplittet.

---

## Session 48 (2026-06-18): Modellierungs-Audit gegen RiC-O 1.1 und AgRelOn (E-103/E-104/E-105)

Vollständige Prüfung aller verwendeten Ontologie-Terme gegen die offiziellen Quellen. Methode: aus dem Output (`data/output/m3gim.jsonld`) alle `rico:`-, `agrelon:`- und `m3gim:`-Terme extrahiert, dann zwei parallele Web-Agenten gegen die Primärquellen — RiC-O 1.1 über die ICA-EGAD-CSV-Komponentenlisten (`github.com/ICA-EGAD/RiC-O`), AgRelOn über die DNB-RDF (`d-nb.info/standards/elementset/agrelon`).

Befund: das Modell ist konzeptionell tragfähig, aber mehrere im Output pervasiv serialisierte Terme existieren in den Ontologien nicht — und alle sind *plausibel extrapoliert*. RiC-O: `rico:isAssociatedWithRecord` (die Familie kennt nur Date/Event/Place/Rule), `rico:File`/`rico:Fonds` als Klasse (tatsächlich recordSetTypes-Werte in einem anderen Namespace). AgRelOn: `agrelon:hasProvenance`/`hasConfidenceValue`/`hasValidityPeriod` (AgRelOn führt diese unter `metadata*`), `agrelon:HasIsPatron` (korrekt `IsHasPatron`), plus eine asymmetrische Reifikation (`hasObject` ohne `hasSubject`). Das Reifikationsmuster selbst entspricht AgRelOn exakt. Zusätzlich eine Spec-Lücke: die meistgenutzten m3gim-Properties (`birthDate` & Co.) sind in `data.md` nirgends definiert, dazu eine `premiereDate`/`premieredatum`-Dublette, das spec-verworfene `eventDate` noch im Output und ein Namespace-Mismatch `m3gim-dft`/`m3gim-role` zwischen Spec und `@context`.

Zentrale Lehre: bei kontrollierten externen Vokabularen ist Plausibilität die Fehlerquelle, nicht der Schutz — dasselbe Muster wie die Q-ID-Fehler aus Session 34. Festgehalten als Modellierungs-Leitplanke „Fremdterme verifizieren, nicht extrapolieren" und als Session-Memory.

Dokumentiert, nicht implementiert (Reihenfolge: erst sichern, dann mit der E-96–E-102-Runde umsetzen): E-103 (RiC-O-Termkorrektur), E-104 (AgRelOn-`metadata*`-Benennung, amendiert E-69), E-105 (offen: Person-Properties unter `m3gim:` vs. `schema:`/GND). `data.md` ist auf die korrekten Terme gesetzt (§7/§8/§9/§10), die Tickets stehen in [plan.md § Ontologie-Konformität](plan.md), die geplante Absicherung als Term-Validierungs-Test (test_26) in [testing.md](testing.md). Der Audit lief read-only; Pipeline, Tests test_12/test_19 und Output sind in der Umsetzungsrunde nachzuziehen.

Kontext: Die Statusprüfung zu Sessionbeginn zeigte zudem eine Daten-Drift — der committete Output und der Quality-Snapshot (18. April) liegen vor der E-95-Loader-Änderung (17. Juni), und der im Plan genannte neue Multi-Box-Export ist im Repo nicht vorhanden. Vor dem Produktivschalten zu klären.

**Umsetzung im selben Tag.** Welle 1 (Konformität) testgetrieben umgesetzt: alle Fehlterme korrigiert (`ric-rst:File/Fonds`, `agrelon:metadata*`, `IsHasPatron`, Person-Normdaten auf `schema:`/`gndo:professionOrOccupationAsLiteral`, `m3gim:wdPremiereDate`), `test_26`-Konformitäts-Lock mit quellenbelegter Allowlist eingeführt, `docs/data/` gesynct. `agrelon:hasSubject` ergänzt — referenziert Malaniuks gegen Wikidata verifizierte Entität `wd:Q94208` direkt (Q-ID nicht geraten), die Reifikation ist damit symmetrisch. Welle 2 begonnen mit AP-5 (E-96/E-98): `m3gim:Performance` + `m3gim:StageRole` als n-äre Top-Level-Entitäten, das alte Attribut `m3gim:hasPerformanceRole` vollständig abgelöst (Standalone-Bühnenrollen → `Performance{hasStageRole}`, deterministische ASCII-Slug-@id, geteiltes Dedup-Registry). Frontend regressionsfrei nachgezogen (Loader indexiert Performances/StageRoles, `partitionRecord` löst die Bühnenrollen auf). Die `hasPerformer`/`performanceOf`-Pfade sind implementiert, aktivieren sich aber erst mit dem tieferen Box-Export — die April-Daten tragen nur `ort,datum` und Finanz-Komposite. Stand: pytest 200 passed / 2 xfailed (inkl. Determinismus), JS 74/74. Offen in Welle 2: E-97, E-99, E-100, E-101, E-102.

**Welle 2 fortgesetzt — E-100/E-102 + Datums-Routing.** Testgetrieben (Spec-Tests test_29/test_30 zuerst rot) umgesetzt: E-102 schafft das generische `m3gim:eventDate` ab und ersetzt es durch inline `m3gim:hasDatedEvent` (Fallback-Klasse `m3gim:DatedEvent` mit `dateValue`/`dateRole`, analog DetailAnnotation). `normalize_dating` führt „X bis Y"→TimeSpan und „ab/seit YYYY"→`nach:`. `m3gim:dataQualityFlag` zieht aus vier quell-belegten `anmerkung`-Signalen (29 Treffer), `m3gim:bearbeitungsnotiz` aus dem Klammer-Anhang des Bearbeitungsstands, `erstelldatum` ins typisierte Datumsfamilien-Mapping. Bewusst **nicht fabriziert**: `m3gim:qualityConfidence` bleibt unbefüllt (das Flag ist das Signal).

**Adversariale Verifikation** durch drei parallele Opus-Auditoren (Datenverlust, Spec-Konformität, Frontend/Schema). Befund-Ertrag: ein echter Blocker an der `ort,datum`-Komposit-Interaktion — der `datum`-Teil wurde sowohl als STE (`atDate`) als auch zusätzlich als DatedEvent emittiert (30 Dubletten, verletzt data.md § 4 „eine Repräsentation"); pre-existing, von E-102 nur sichtbarer gemacht. Behoben: der `datum`-Teil von `ort,datum` wird unterdrückt, wenn das STE ihn trägt; „Place, ab YYYY" (z. B. „Wien, ab 1956") wird sauber zu STE `atPlace=Wien`/`atDate=nach:1956` statt Ort-Leak ins Datumsfeld. Folgekonsumenten der Datum-Verschiebung ins STE nachgezogen (Relation-Count, Partitur-Builder via STE-Lookup, STE-Contract qualifier-tolerant).

**E-106 — Datierungs-Konfidenz ganz entfernt (löst E-100 ab).** Auf Nachfrage geprüft, woher die Konfidenz kommt und wer sie liest: sie war eine erfundene Dezimal-Projektion der kategorialen `datierungsevidenz` (aus_dokument→1.0 etc.) — kein gemessener Wert, gegen die Leitplanke „Konfidenz nicht erfinden" — und **kein aktives Feature las sie** (`confidenceDotProps()` war vorbereitet, nie platziert). Entscheidung: ganz entfernen statt ehrlicher serialisieren. `agrelon:metadataConfidence`, die record-seitige Datierungs-Self-Provenance, die Konstante `EVIDENZ_TO_CONFIDENCE` und `confidenceDotProps()` raus; test_29 in test_19 konsolidiert. Die legitime `agrelon:metadataProvenance` auf AgRelOn-Relationen und STEs bleibt. Käme die Evidenz zurück, dann kategorial, nicht als Zahl. Stand: pytest 208 passed / 1 skipped / 2 xfailed, JS 74/74.

**E-101 — Dokumentvokabular (datengedeckte Teile).** Vor der Umsetzung die Datengrundlage geprüft: von E-101s neuen Konzepten (`musikzeitschrift`/`briefumschlag`/`chronik`/`verzeichnis`) ist keines in den April-Daten, und den Verknüpfungstyp `dokument` gibt es nicht — E-101 ist großteils Scaffolding für den tieferen Export. Umgesetzt wurden die datengedeckten Teile: `sammlung` ist jetzt ein eigenständiges Concept `m3gim-dft:sammlung` ohne `skos:broader` (vorher fälschlich auf `konvolut` gemappt, der häufigste Typ mit 77 Records); alle dft-Concepts tragen lesbare deutsche `skos:prefLabel` (`DFT_LABELS`, deckungsgleich mit der Frontend-Handtabelle `DOKUMENTTYP_LABELS`) statt des nackten Slugs — damit ist die Ablösung der Handtabelle vorbereitet. Die neuen Konzepte sind in den Maps gerüstet. Vertagt: der `dokument`-Aboutness-Branch (keine Daten — kein spekulativer Code), die Invariante (dft nie als `hasOrHadSubject`) ist als Guard gesichert. Test test_31. Stand: pytest 213 passed / 1 skipped / 2 xfailed, JS 74/74.

**Frontend auf SKOS-prefLabel umgestellt** (Folgeschritt zu E-101). Die Hand-Map `DOKUMENTTYP_LABELS` in `constants.js` (~40 handgepflegte Labels, die von den Daten driften konnten) ist entfernt; an ihre Stelle tritt `dftLabel(store, id)` in `format.js`, das die von der Pipeline gelieferten `skos:prefLabel` aus `store.dftHierarchy` auflöst. Alle sieben Konsumenten umgestellt (inline-Detail, Bestand, Chronik, Indizes, Korb, Toolbar, Bestand-Filter) — die per-Record-Funktionen erhalten den Store über den jeweiligen Modul-Store bzw. den Render-Einstieg, `searchMatchBestand` über einen Wrap. Die Labels sind deckungsgleich, also kein visueller Unterschied — nur die Quelle wandert von Hand in die Daten. Verifiziert: JS 74/74 + Headless-Smoke (dftLabel löst „Korrespondenz"/„Sammlung"/… korrekt auf).

**Welle 2 fortgesetzt — E-97 Mobilitäts-Ortsrollen (datengedeckter Kern).** Vor der Umsetzung die Datendeckung geprüft: von E-97s Bestandteilen ist nur der Ortsrollen-Kern belegt. `zielort`/`absendeort`/`abreiseort` stehen auf reinen, datumslosen `ort`-Zeilen (im April-Export 15 Stück), `wohnort` und `vertragspartner` kommen 0× vor. Damit war E-99 (Finanz-Parser) als nächstes Ticket ausgeschieden — alle 21 Finanzzeilen parst der bestehende E-67-Parser bereits korrekt, die E-99-Fälle (nachgestellte Währung, Doppelbeträge, `nicht eingehalten`, Lire/Belg. Francs) sind 0× im Export und wären spekulativer, nie feuernder Code. E-97-Kern dagegen ist real: die Mobilitäts-Orte werden heute nur als flache `rico:Place`-Chips abgelegt, nicht als Mobilitätsereignis.

Testgetrieben (test_32 zuerst rot, zwei xfail-Feature-Tests + zwei grüne Guards): reine `ort`-Zeilen mit Mobilitäts-Rolle erzeugen in `process_verknuepfungen` eine zusätzliche datumslose `spatiotemporal`-Relation (Geschwister-Block zum Komposit-`ort,datum`-STE), der `spatiotemporal`-Zweig setzt `atDate` jetzt nur noch bei vorhandenem Datum. **Rein additiv** — die flache `rico:hasOrHadLocation` bleibt erhalten, adversarisch verifiziert 15/15 (kein Ortsindex-Regress); @ids eindeutig, alle datumslos, Provenienz gültig. Der Loader (`date: null`) und alle aktiven Tabs verkraften datumslose STE; `aggregateEventsPerDecade` überspringt sie.

Die Ripple-Effekte der neuen STE-Schicht koordiniert nachgezogen: test_06/test_11 erkennen datumslose Mobilitäts-STE als gültig an, test_11 nimmt die neuen eventRoles ins Vokabular. test_22 war zum dritten Mal an der globalen STE-Zähler-@id gebrochen — jetzt **stabil** über (Record-Präfix + Ortsname) statt hartem `ste_NIM_004_24_N` verankert, womit künftige STE-Zuwächse den Anker nicht mehr verschieben. Den im Frontend schon vorbereiteten PENDING-Block in `EVENT_ROLE_TO_MOBILITY_CLUSTER` aufgelöst: die fünf Mobilitäts-Ortsrollen explizit auf `null` gemappt statt auf die spekulativen Cluster aus dem Kommentar — ob sie zur Sicht „Korrespondenz/Reise" oder einer anderen gehören, ist mit dem Erschließungsteam zu klären; `null` hält test_25 nach Promote grün und zeigt die Events ehrlich als „nicht klassifiziert". `build-views` ist bereits datumslos-tolerant, `data.md` spezifizierte E-97 schon vollständig (§ 4/§ 10) — der Code deckt die Spec exakt. **Vertagt:** `wohnort`-Zustand mit `metadataPeriod` und `vertragspartner` als AgRelOn-Relation (beide 0× — Guard test_wohnort_not_a_point_event sichert, dass `wohnort` kein Punktereignis wird). Stand: pytest 216 passed / 1 skipped / 2 xfailed (+ Determinismus slow), JS 74/74. Nicht promotet — `docs/data/` wartet weiterhin auf den tieferen Box-Export.

**Mobilitäts-Interface E-109 → E-111 (Forschungsleitstellen-Runde 2026-06-21).** Auf order-m3gim hin den Mobilitätsaspekt in den Vordergrund gebracht. Erst E-109, ein eigener Tab als Listendarstellung aller SpatiotemporalEvents nach den fünf data.md-§-10-Sichten. Dann E-110, den globalen Klassifikator an data.md angeglichen: die fünf E-97-Ortsrollen (zielort/absendeort/abreiseort/empfangsort/vertragsort) mappen in `EVENT_ROLE_TO_MOBILITY_CLUSTER` jetzt auf `korrespondenz` statt `null`, womit die irreführende „Nicht klassifiziert"-Leiste im Statistik-Tab verschwindet und Reise/Korrespondenz als datenreichste Spur benannt wird; `test_25` lockt das (`test_place_roles_count_as_reise_korrespondenz`). Parallel das Fehler-Register `datenfehler.md` angelegt (Quellfehler QF-01..13, Abgleichfehler AF-01..03 getrennt, je Fundstelle und Status), order Punkt 4 folgend: Rohdaten nie selbst korrigieren, eindeutige Fälle aufbereiten, Weiterleitung ans Erschließungsteam über den Operator. Auf direkte In-session-Operator-Anweisung dann E-111, die Listendarstellung durch eine D3-geo-Trajektorienkarte ersetzt (Technologiewahl D3-geo statt des im Order vorgeschlagenen MapLibre/deck.gl, weil keine Tiles, kein API-Key, Geometrie im Repo). Das weicht offen vom Vorschlag-zuerst-Gate des Koordinators ab, gedeckt durch die direkte Anweisung. Karte als Vollbreiten-Interface: Orte als Knoten nach dominanter Mobilitätssicht, biografischer Pfad als gerichtete Pfeile hell-zu-dunkel über die Zeit, Zeitregler mit Abspielen, Sicht-Legende als Filter, Bedienelemente statt Fließtext (order Punkt 3). Den vestigialen Leaflet-CDN-Load aus einem Zwischenstand zurückgebaut, die D3-geo-Karte braucht ihn nicht. Sichtbare Datenlage: die drei New-York-Arcs laufen nach Westen aus dem Bild (AF-01), Zürich und Köln grau wegen dominantem Kontextbezug. Beide Runden nach main gepusht (ea62739, 24ed8e2), gedeckt durch die `sicherung`-Klausel des Orders. Offene Operator-Punkte im handoff Stand 8: Karte freigeben (plus Einfärbungsregel), Atlas stilllegen, AF-01 weiterleiten, einheitliche Cross-View-Filter als nächster großer Schritt.


**Statistik entschlackt, E-112 (Forschungsleitstellen-Runde 2026-06-21, Folgeschritt).** order-m3gim Punkt 3 weiter durchgezogen: durchgängig keine textlastigen Seiten-Erklärungen. Aus dem Statistik-Tab den Page-Intro (`statistik__intro` mit Titel und Lead) und alle sechs `stat-section__lead`-Absätze entfernt, dazu die toten CSS-Regeln. Behalten: die Diagramm-Titel als Label und die datengetriebene Histogramm-Notiz zu den datumslosen Events (Datenverlust-Ehrlichkeit). Survey vorab bestätigte, dass nur die Statistik page-level Erklärtexte trug, Bestand/Chronik/Indizes nicht (Bestand hat nur einen funktionalen Folio-Hint), und dass die Zahlen-Kacheln über E-92 schon raus waren. `logStamp`-Keys unverändert, die Sektionszahl bleibt 6. Verifiziert: JS 87/87, pytest frontend-contract + data-fresh 18/18, plus Browser-Render des Tabs in der Sitzung (Donut direkt unter dem Titel, keine Leads, keine Konsolenfehler).

---

## Session 52 (2026-06-21): Milestone-Runde, Karten-Testnetz und Karten-Schärfung

**Milestone 1 — Smoke-Loop deckt die Mobilitätskarte ab (E-113).** Aus der vorigen Selbstkritik die größte Lücke geschlossen: das aufwendigste neue Interface, die D3-geo-Karte, hatte kein automatisches Netz, nur Sitzungs-Sichtprüfung. `tests/frontend/smoke.py` iterierte eine fest gelistete Tab-Auswahl ohne `mobilitaet` und `korb`; jetzt deckt der Loop alle sieben sichtbaren Tabs, mit logStamp-Erwartungen für beide neuen Tabs. **Zentral** ist ein neuer harter Karten-Canary `mobilitaet:karte-render`, der auf den asynchronen Geometrie-Load wartet und prüft, dass die Karte real zeichnet (Stadt-Knoten, Pfad-Pfeile, Sicht-Filter, Ländergeometrie). Der reine logStamp-Check fängt das nicht, weil der Stempel synchron vor dem Async-Draw geschrieben wird, eine still leer rendernde Karte hätte ihn trotzdem gesetzt. Das ist die Drift-Lehre angewandt: die Lücke war zuvor nur dokumentiert (testing.md, plan.md), jetzt ist sie maschinell geschlossen. Verifiziert: smoke 24 OK / 0 FAIL (11 Knoten, 23 Pfeile, 177 Länder belegt), JS 87/87, pytest frontend-contract + data-fresh 18/18. Intern, nach main gesichert.

**Milestone 2 — Mobilitätskarte als Forschungswerkzeug geschärft (E-114).** order Punkt 2 weiter umgesetzt, drei additive Eingriffe in die E-111-Karte. Erstens ein Knoten-Tooltip beim Überfahren (dominante Sicht, Ereigniszahl, Zeitspanne), womit die Karte ohne Klick lesbar wird. Zweitens zoomabhängige Label-Ausdünnung: bei Basiszoom nur die Top-Stationen nach Ereigniszahl (Wien, München, Zürich), beim Hineinzoomen mehr, Font und Halo gegen den Zoom skaliert, damit Beschriftung bildschirmkonstant bleibt und der dichte mitteleuropäische Cluster entzerrt wird, ohne Information zu verstecken. Drittens ein ehrlicher Off-Map-Umgang mit dem New-York-Fehlmatch AF-01: statt die drei Arcs nach Westen aus dem Bild laufen zu lassen, werden die off-map projizierten Orte aus Knoten und Pfad ausgenommen und im Detailstreifen als Knopf „abseits der Karte" mit Verweis aufs Datenfehler-Register transparent ausgewiesen. Der entscheidende Punkt der Reihenfolge: Milestone 1 wurde zuerst gebaut, sodass der dort ergänzte Karten-Canary diese Kartenänderung sofort absichert, er zeigt jetzt 10 Knoten / 22 Pfeile statt 11 / 23 und belegt die New-York-Exklusion. Verifiziert: `node --check`, JS 87/87, smoke 24 OK / 0 FAIL, plus vierteilige Screenshot-Spur unter `reports/screens/` (Basis, Tooltip, Off-Map, Zoom). Öffentlich wirksam: Code nach main gesichert, Live-Deploy auf dhcraft.org/m3gim operator-gated, die Spur ist die Sicht-Grundlage vor der Freigabe.

## Session 53 (2026-06-21): Verifikation und Standortbestimmung (kein Code)

Reine Prüf- und Synthese-Runde auf Operator-Nachfrage, kein Eingriff in Code oder Daten, einziger Commit ist dieser Journal-Eintrag.

**Build-Verifikation am laufenden Server.** Den geschärften Stand über `python -m http.server 8765 --directory docs` zur Operator-Sicht bereitgestellt, nicht live deployt. Aus dem Store des laufenden Builds (`window.m3gim.store`) den Datenstand zellgenau gegengelesen statt aus dem Gedächtnis berichtet.

**Bestand-Konvolut-Klärung.** Operator-Frage, warum der Bestand-Reiter nur drei Konvolute zeigt. Gesamtbestand laut Source of Truth: 381 Records in 7 Konvoluten (`m3gim:recordCount`/`konvolutCount`). Der Bestand zeigt 3, weil das dokumentierte Leitprinzip „nur bearbeitet" Konvolute ohne erschlossene Folios, unverknüpfte Records und Folios mit 0 Links nicht rendert. Erschlossen sind 64 von 378 Records (17 Prozent), nur NIM_003/004/007 tragen verknüpfte Objekte, NIM_005/006/008/011 sind angelegt, aber noch unverknüpft. Geprüft, dass das vollständig und aktuell dokumentiert ist: Anzeigeregel in architecture.md (Leitprinzip „nur bearbeitet" plus Counter-Tooltip), Erschließungsvorbehalt und Survivorship-Bias-Pflicht in data.md, konkrete Zahlen im `quality-snapshot.md` (generiert 18.06., deckungsgleich mit dem live gemessenen Stand). Kein Spalt zwischen Code und Doku, der niedrige sichtbare Bestand ist eine bewusste, dreifach festgehaltene Entscheidung.

**Standortbestimmung am Zielbild.** Das Dreifachziel der Pilotstudie ehrlich abgeglichen. Linie 1 (Methodik validieren) ist im Kern erreicht: Modell testgetrieben umgesetzt, Ontologie-Audit erledigt, Pipeline produktiv (`project.md` `status: complete`), das trägt den FWF-Antrag. Linie 2 (vollständiger Perspektivensatz) ist offen: drei verborgene Tabs (Atlas überholt, Repertoire, Biogramm), Cross-View-Filter ungebaut, STE-@id-Refactoring offen. Linie 3 (Datenqualität heben) läuft und ist größtenteils quellseitig (17 Prozent Verknüpfungsrate, Datenfehler-Register, AF-01/AF-02). Verdikt: als Machbarkeitsstudie Kernziel erreicht, als ausgebautes Interface nicht fertig, keiner der Restpunkte ist ein Machbarkeits-Blocker. Das Abschluss-Urteil liegt beim Operator.

## Session 54 (2026-06-21): STE-@id-Refactoring, inhaltsbasierte Vergabe (E-115)

Auf Operator-Freigabe, autonom innerhalb der Entscheidungsgrenze offene Ziele weiterzutreiben, den klar reversiblen, internen Fachurteils-Punkt aus dem Status-Tracker umgesetzt: die @id-Stabilisierung der SpatiotemporalEvents. Bewusst nicht angefasst wurden die nach außen wirkenden oder Produktentscheidungen (Live-Deploy der Karte, Atlas stilllegen, Cross-View-Filter, drei verborgene Tabs sichtbar schalten), die bleiben operator-gated.

**Befund.** Die STE-@id war `m3gim:ste_<record>_<event_counter>` mit einem globalen Zähler über alle Records. Folge: jedes neue oder geänderte Event verschob alle nachfolgenden @ids, `test_22` brach daran wiederkehrend und musste defensiv über einen Record-Präfix statt die exakte @id ankern. Vor dem Eingriff verifiziert, dass kein Konsument das brechen lässt: die einzigen exakten @id-Literale sind eine synthetische Fixture (`ste_TEST_1`, schema-unabhängig) und ebenjener Präfix-Anker; das JSON-Schema-Pattern erlaubt Hex-Suffixe; das Frontend löst STE über die `hasSpatiotemporalEvent`-Referenz auf, die konsistent mitwandert.

**Eingriff.** Neuer Helper `_ste_id` in `transform.py`: `@id = m3gim:ste_<record-local-id>_<sha1(ort\x1frolle\x1fdatum)[:8]>`, Ordinal-Suffix `-N` nur bei echten Inhaltsdubletten je Record. Damit ist die @id eine reine Funktion ihres Inhalts, ordnungs- und einfügungsunabhängig. Fachurteil Hash statt record-lokalem Index: ein lokaler Laufindex verschiebt sich noch, wenn innerhalb desselben Records ein Event dazukommt; der Content-Hash nicht. `sha1` statt Pythons gesalzenem `hash()`, sonst kein Determinismus über Läufe. Performances bleiben beim Zähler, Scope ist allein die STE.

**Verifikation.** STE-@ids über zwei volle Pipeline-Läufe byte-identisch (Determinismus empirisch belegt). Neuer Regressions-Lock `tests/test_35_ste_id_stability.py` schreibt die Invariante fest: jede @id ist aus (Record, Ort, Rolle, Datum) ableitbar, eindeutig, mit 8-stelligem Hex-Suffix statt Zähler. Eine Rückkehr zum Zähler bricht ihn. Volle Suite 228 passed / 1 skipped / 2 xfailed (vier neue Lock-Asserts), `test_22` und Staleness-Guard `test_33` grün, JS 87/87, smoke 24 OK / 0 FAIL (Karte unverändert 10 Knoten / 22 Pfeile). Daten regeneriert, `docs/data == data/output`, im Diff nur `exportDate` und die STE-@ids. Rein internes Hygiene-Refactoring, nach main gesichert.

## Session 55 (2026-06-21): Bestand-Vollanzeige, alle Daten erreichbar ohne Kaschieren (E-116)

Auf die Operator-Klärung, dass das Ziel der vollständige Perspektivensatz ist und alle Daten aus den Excel-Exporten dargestellt werden sollen, den Bestand-Tab von harter Ausblendung auf eine umschaltbare Vollanzeige umgebaut. Eingeordnet als Fachentscheidung, nicht als offene Produktwahl: das Operator-Ziel „alle Daten dargestellt" und die Projektinvariante Linie 3 „Erschließungsstand nicht kaschieren" ziehen gegeneinander, die einzige Lösung, die beide zugleich erfüllt, ist alle Records zu zeigen und die unerschlossenen sichtbar als solche zu markieren. Reversibel, frontend-intern, Live-Deploy operator-gated.

**Befund.** Die Daten waren längst vollständig eingelesen (378/378 Records mit `m3gim:xlsxSource`, Quality-Snapshot), aber `getOrderedItems` blendete per Leitprinzip „nur bearbeitet" alles ohne Verknüpfung hart aus, sodass der Bestand nur 63 Records und 3 von 7 Konvoluten zeigte. Zweite, davon unabhängige Unterdrückung erkannt und bewusst nicht angetastet: `EXCLUDED_DFT` (Plakate, Tonträger) blendet ganze Dokumenttypen als Forschungsscope aus (`interface-konzept.md`), das ist eine inhaltliche Scope-Entscheidung des Projekts, nicht meine.

**Eingriff.** Toolbar-Toggle „Nicht erschlossene einblenden" (`zeigeUnerschlossen`, Facet-Kind `toggle`). `getOrderedItems(showAll)` lässt im „alle"-Modus die drei `unprocessedIds`-Filter und den `totalLinks===0`-Konvolut-Skip fallen; Folios bleiben in beiden Modi raus. `renderRows` markiert Unerschlossene über `.archiv-row--unerschlossen` (ausgegraut, kursiv) plus Badge „nicht erschlossen", Konvolut-Header werden ausgegraut, wenn ihr Link-Saldo 0 ist. Count zeigt im „alle"-Modus „N Einheiten (X erschlossen, Y nicht erschlossen)", logStamp um `erschliessung`/`nicht-erschlossen` ergänzt. Default bleibt „nur erschlossen", der Smoke-Default also unverändert.

**Nebenbefund.** Der `toggle`-Facet war im ganzen Projekt nie benutzt und trug einen latenten Bug: `el()` setzt Attribute via `setAttribute`, und ein Boolean-Attribut `checked` macht die Checkbox unabhängig vom State angehakt, der `change`-Handler feuerte nie (im Smoke sichtbar als no-op-Toggle). `buildToggle` setzt `checked` jetzt als Property. Der `el()`-Footgun bleibt als scharfe Kante bestehen, ist aber mit `checked` der einzige Boolean-Attribut-Aufruf; eine generelle `el()`-Korrektur wäre breiter als der Bedarf.

**Verifikation.** „alle"-Modus zeigt alle 7 Konvolute und 352 Records (vorher 3/63), 289 als nicht erschlossen markiert; die Differenz zu den 378 sind die per Scope ausgeblendeten Plakate/Tonträger. Neuer Smoke-Check `bestand:erschliessung-toggle` (66 → 359 Zeilen, 293 ausgegraut), smoke 25 OK / 0 FAIL, JS 87/87, pytest 228 passed / 1 skipped / 2 xfailed (Pipeline unberührt). Vorher-Nachher-Screenshots unter `reports/screens/2026-06-21-*-bestand-{erschlossen,alle}.png`. Rein frontend, nach main gesichert. Operator-gated bleiben: der Default-Modus (erschlossen vs. alle als Erstansicht) und der Live-Deploy.

## Session 56 (2026-06-21): Filter-Modell-Entwurf, view-übergreifender Filter (E-117, order Milestone 3)

Lane-Aktivierung mit Order-Auftrag Milestone 3: das Filter-State-Modell für den view-übergreifenden einheitlichen Filter entwerfen, bauen bleibt Milestone 4 und propose-first gated. Aus der Informationsvisualisierungs-Persona durchgearbeitet. Ergebnis-Artefakt `knowledge/filter-modell.md`.

**Befund vor dem Entwurf.** Drei getrennte Filtermechaniken heute: Bestand und Chronik teilen `filterByToolbarState` (`_archive-filter.js`) mit je eigener Toolbar-Instanz und getrenntem State, das Netzwerk hat eine eigene Sidebar mit Zeitfenster (E-93/E-94), die Karte filtert view-lokal über Sicht-Legende und Zeitregler (E-111). Der Event-Bus `events.js` (E-53) ist gelesen: er ist ein gezielter, einmaliger Navigationskanal (`onViewNavigate`, ein Handler pro Tab, letztes Detail wird einmal abgespielt), nicht ein fortlaufender geteilter Filter-State. Genau diese Lücke schließt der Entwurf.

**Abgleich der zwei Sicht-Klassifikatoren** (Order-Punkt). Global `mobilityClusterFor` (`constants.js`, seit E-110 an § 10 angeglichen) gegen view-lokalen `ROLE_TO_TYPE` (`mobility.js`, E-109). Befund aus dem Code: sie decken sich für die fünf Sichten, `ROLE_TO_TYPE` ist nur feiner, weil es einen expliziten `kontext`-Eimer für die Nicht-Mobilitäts-Ortsrollen führt, wo der globale Klassifikator `null` liefert. Ableitung: die geteilte `sicht`-Facette nutzt allein `mobilityClusterFor` und faltet `null` in `kontext`, in M4 ersetzt das den view-lokalen Pfad, keine zwei divergierenden Tabellen.

**Spezifiziert.** Ein geteiltes Filter-State-Objekt, sieben Facetten (`ort`, `person`, `werk`, `rolle`, `zeitfenster`, `sicht`, plus `schaerfe`-Modus), Quelle durchgängig `store.*`. Zwei Schärfegrade als Filtersemantik: weit (Record-Bezug über `rico:hasOrHadLocation`) gegen eng (Ereignis-Verortung über `m3gim:SpatiotemporalEvent`); der `schaerfe`-Schalter stellt die Auflösung der Ort- und Zeit-Facette um und verankert die Leitplanke gegen den Bayreuth-Auftrittsnachweis-Fehlschluss im Modell statt in der Disziplin. Verteilung über die bestehende Mechanik: `events.js` um einen `m3gim:filter`-Kanal erweitert, `buildToolbar` wird zur Sicht auf den geteilten State, `onViewNavigate` bleibt für den orthogonalen Record-Sprung. View-Facetten-Matrix (welcher View teilt welche Facette primär, unterstützend, datenschwach).

**Bayreuth durchgerechnet.** Scout frisch read-only gegen `docs/data/m3gim.jsonld` (HEAD `f887d1a`) via `scout-coverage.py Bayreuth`: 9 Records mit Ort Bayreuth, 4 verortete und datierte Events, 59 Akteure im Ko-Okkurrenznetz, Spanne 1951 bis 1953 (über 1953 hinaus kein Beleg, V1). Pro View nach Schärfegrad getrennt im Entwurf tabelliert. Karte und Netzwerk zeigen denselben Ort auf gegensätzlichen Schärfegraden, genau das macht der Filter sichtbar.

**Numerierungs-Drift gemeldet.** Die Order nannte als Entscheidungsnummer E-167, die höchste belegte Nummer in decisions.md ist E-116. Statt eine 50er-Lücke zu öffnen, fortlaufend E-117 vergeben und die Abweichung der Leitstelle im handoff gemeldet, damit der Orchestrator sie reconciled. Verify-not-trust, ein Befehl legitimiert keine inkonsistente Numerierung im eigenen Register.

**Verifikation.** Maschinelles Grün-Kriterium Milestone 3 erfüllt: `knowledge/filter-modell.md` existiert, decisions.md E-117 und der plan.md-Status-Tracker verweisen darauf, der Scout ist frisch gelaufen und im Entwurf verankert. Dokumentationsmilestone, kein Code, daher kein Test-Lauf nötig; die belegten Zahlen sind über den Scout reproduzierbar. Nach main gesichert.
