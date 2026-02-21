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

Siehe auch: [→ Projekt](../projekt-kontext.md) · [→ Datenmodell](../Daten/Datenmodell%20und%20Ontologie.md) · [→ Technische Dokumentation](../Technik/Technische%20Dokumentation.md)
