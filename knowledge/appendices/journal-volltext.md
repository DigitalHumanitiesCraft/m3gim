# Appendix: Journal Volltext

> Vollstaendige, unverkuerzte Uebernahme der Session-Dokumentation aus dem Vor-Refactor-Stand.
> Quelle: knowledge/_archive/2026-02-20-pre-kb-refactor/knowledge/journal.md

---

# Journal â€” MÂ³GIM Arbeitstagebuch

> Kompakte Dokumentation aller Arbeitssessions.

---

## 2026-02-18 â€” Session 1: Iteration 1 â†’ 2 Ãœbergang

### Was getan
- Wissens-Destillation: 7 Vault-Dokumente geschrieben und verifiziert
- Repo-Bereinigung: Fotografien komplett aus Scope entfernt (alle Scripts, Docs, Frontend)
- `data/sources/` Verzeichnis gelÃ¶scht
- KNOWLEDGE.md als konsolidiertes Wissensdokument angelegt (305 Zeilen)

### Entscheidungen
- Fotografien (UAKUG/NIM_FS_XXX) sind nicht Teil des Projekts
- 3 Bestandsgruppen: Hauptbestand (255), Plakate (26), TontrÃ¤ger (1)

---

## 2026-02-19 â€” Session 2: Knowledge-Ordner und explore.py

### Was getan
- KNOWLEDGE.md ersetzt durch strukturierten `knowledge/` Ordner mit 7 thematischen Dokumenten + README
- `.gitignore` korrigiert (knowledge/ war blockiert)
- `explore.py` als erster Pipeline-Schritt geschrieben (~760 Zeilen)
- ZIP-Entpackung, flexibles Datei-Matching, Pro-Tabelle-Analyse, Cross-Table-Checks
- Windows UTF-8 Fix (cp1252 â†’ utf-8)
- Pfadkorrektur: `data/input/` â†’ `data/google-spreadsheet/` (User-Feedback)
- Erster erfolgreicher Lauf: alle 6/6 Tabellen erkannt, 6 Warnungen

### Entscheidungen
- Knowledge lebt in Repo UND Vault (nicht nur Vault)
- Bestehende `data/google-spreadsheet/` verwenden, kein neues `data/input/`
- Gesamten Pipeline-Workflow neu denken fÃ¼r Iteration 2

---

## 2026-02-20 â€” Session 3: Daten-Exploration und Datenmodell v2.5

### Was getan
- Detailanalyse aller 6 Excel-Tabellen (Objekte, VerknÃ¼pfungen, 4 Indizes)
- Konvolut-Hierarchie entdeckt: Objekt-ID = archivsignatur + " " + folio
- VerknÃ¼pfungs-Mechanismus geklÃ¤rt: String-Matching Ã¼ber `name`-Spalte
- PrioritÃ¤tenliste P1â€“P5 erstellt (alle durch Pipeline lÃ¶sbar)
- Dokumenttyp-Vokabular erweitert (18 â†’ 25 Werte)
- Datenmodell v2.4 â†’ v2.5
- Alle 5 Knowledge-Docs aktualisiert (01, 02, 03, 04, 07)

### Erkenntnisse
- `Unnamed: 2` in Objekte = Folio-Spalte (fehlender Header)
- Header-Shifts in 3 von 4 Indizes (Org, Ort, Werk)
- IDs in Indizes sind DurchzÃ¤hlungen, keine VerknÃ¼pfungs-SchlÃ¼ssel
- Wikidata wird via `reconcile.py` automatisiert, nicht manuell erfasst
- Nur 3/282 Objekte bisher verknÃ¼pft â€” VerknÃ¼pfungsarbeit am Anfang
- Case-Inkonsistenzen durchgÃ¤ngig â€” Pipeline normalisiert mit `.lower().strip()`
- Excel-Datetime-Artefakte sind Export-Artefakte, kein Datenproblem
- Leere Zeilen in VerknÃ¼pfungen einfach ignorieren
- Bearbeitungsstand: 3 Zielwerte (vollstÃ¤ndig, in bearbeitung, offen)

### Entscheidungen
- P1â€“P5 lÃ¶st Pipeline automatisch, kein Handlungsbedarf im Google Sheet
- Wikidata-Reconciliation wird eigenes Script (`reconcile.py`)
- `Unnamed: 2` / Folio-Feld vorerst ignorieren (Pipeline erkennt es aber)

### NÃ¤chste Schritte
- Pipeline-Scripts Ã¼berarbeiten (validate.py, create-ric-json.py, build-views.py)
- Konvolut-Lieferung (21. Feb)
- Meeting: Datenerfassung, Modellierung, Workflows (24. Feb)

---

## 2026-02-20 â€” Session 4: RiC-O Referenz, m3gim-Ontologie, Pipeline Iteration 2

### Was getan
- RiC-O 1.1 Referenzdokument geschrieben (`knowledge/08-ric-o.md`): Alle relevanten Klassen, Properties, Modellierungsmuster
- 5 offene Modellierungsfragen analysiert â†’ 3 mit RiC-O allein lÃ¶sbar, 2 brauchen m3gim-Erweiterung
- m3gim-Ontologie geschrieben (`knowledge/09-m3gim-ontology.md`): 2 Klassen (MusicalWork, Performance), 4 Object Properties, 2 SKOS-Vokabulare (11 Rollen, 25 Dokumenttypen)
- **validate.py komplett Ã¼berarbeitet**: Normalisierung, 25 Dokumenttypen, Konvolut-aware Duplikaterkennung, Cross-Table-Checks, Header-Shift-Korrektur â†’ 1 realer Fehler (PL_07 Duplikat), 177 Warnings
- **transform.py neu geschrieben** (ersetzt create-ric-json.py): Konvolut-Hierarchie (Fonds â†’ RecordSet â†’ Record), String-Matching gegen Indizes, Wikidata-Anreicherung, Komposit-Typ-Decomposition, 7 Namespaces â†’ 282 Records, 3 Konvolute, 258 KB JSON-LD
- **build-views.py Ã¼berarbeitet**: Liest strukturierte RiC-O-Daten (hasOrHadAgent, mentions, hasOrHadSubject, hasOrHadLocation) statt hardcoded Listen â†’ 294 Personen in Matrix (vorher ~30), 7 Komponisten in Kosmos, 17 Flows in Sankey
- CI/CD aktualisiert (build-views.yml Pfade), scripts/README.md, knowledge/04-architektur.md
- `create-ric-json.py` gelÃ¶scht (ersetzt durch transform.py)

### Erkenntnisse
- Duale Datenextraktion (strukturiert + Title-Matching) ist robuster als nur eins von beiden
- Konvolut-Duplikaterkennung braucht Objekt-ID (signatur + folio), nicht nur signatur
- Wikidata-IDs tauchen als Komponisten-Namen in kosmos.json auf (Q190891, Q723407) â€” kosmetisch, TODO
- 294 vs 30 Personen in Matrix zeigt den Wert der strukturierten VerknÃ¼pfungen

### Entscheidungen
- m3gim-Namespace fÃ¼r MusicalWork und Rollen-Qualifikation (RiC-O reicht dafÃ¼r nicht)
- transform.py statt create-ric-json.py (klarerer Name)
- Pfade standardisiert: google-spreadsheet/ â†’ output/ â†’ output/views/ â†’ docs/data/

### NÃ¤chste Schritte
- Wikidata-IDs in Kosmos-View auflÃ¶sen (Q190891 â†’ Name)
- reconcile.py implementieren (Wikidata-Reconciliation)
- Frontend-Visualisierungen an neue Datenstrukturen anpassen
- Meeting 24. Feb vorbereiten

---

## 2026-02-20 â€” Session 5: Pipeline-Audit und Bugfix

### Was getan
- Umfassender Audit: Excel-Rohdaten gegen JSON-LD und View-JSONs verglichen
- 5 potentielle Bugs identifiziert, davon 3 echte Code-Bugs, 1 Datenqualitaets-Problem, 1 korrektes Verhalten
- **Bug 1 gefixt (schwerwiegend):** HEADER_SHIFTS in transform.py und validate.py hatten Spalten 2+3 vertauscht fuer Organisationsindex und Werkindex â†’ 145 falsche Wikidata-URIs (`wd:Wien`, `wd:Wagner, Richard`). Fix: Spaltenreihenfolge korrigiert + Regex-Validierung `^Q\d+$`
- **Bug 2 gefixt:** Q-IDs als Komponistennamen in Kosmos (Q190891, Q723407) â€” durch Bug-1-Fix automatisch behoben
- **Bug 3 gefixt:** `rico:hasLanguage` â†’ `rico:hasOrHadLanguage` (falscher RiC-O Property-Name) â†’ 74 Records mit Sprache (vorher 0)
- `knowledge/10-datenqualitaet.md` geschrieben: Alle Erfassungsprobleme dokumentiert
- MEETING-2026-02-24.md komplett ueberarbeitet mit Datenqualitaets-Sektion
- Knowledge-Refactoring: Veraltete Zahlen und Referenzen in 01, 02, 04, 07 aktualisiert

### Erkenntnisse
- Header-Shift-Bug war subtil: Spalte 2 (wikidata_id) wurde zu `ort`/`komponist` gemappt, Spalte 3 (ort/komponist) wurde zu `wikidata_id` â†’ Komponentennamen landeten als Wikidata-URIs
- Pipeline-Audit gegen Rohdaten ist essentiell â€” Bugs waren nicht durch reine Code-Review erkennbar
- 62/282 Objekte haben Verknuepfungen (22%), nicht 3 wie zuvor angenommen (3 Konvolute, aber 62 Records)

### Entscheidungen
- Bug 4 (17 verlorene Verknuepfungen) ist Datenqualitaet, kein Code-Fix
- Bug 5 (Phantom-Relationen) ist korrektes Verhalten (Komposit-Decomposition)
- P1-P5 Redundanz in 02-quellenbestand.md durch Verweis auf 10-datenqualitaet.md ersetzt

---

## 2026-02-20 â€” Session 6: Bestand-View Verbesserungen

### Was getan
- **formatDate() komplett neu**: ISO-Daten â†’ menschenlesbare deutsche Formate (6 Regeln: Ganzjahr, Multi-Jahr, Monat, gleicher Monat, Monats-Range, Fallback)
- **countLinks() erweitert**: +2 Properties (`rico:isAssociatedWithDate`, `m3gim:hasPerformanceRole`) â†’ vollstÃ¤ndige VerknÃ¼pfungszÃ¤hlung
- **Vkn.-Spalte gefixt**: `0` statt leer (JS falsy-Bug), Konvolute zeigen aggregierte Zahl ("21 Fol. Â· 423 Vkn.")
- **Datum-Spalte**: `formatDate()` statt nur Jahreszahl, "o. D." kursiv/gedimmt fÃ¼r undatierte Records
- **CSS**: Spaltenbreiten angepasst (Datum 100â†’160px, Vkn. 60â†’120px), `.archiv-datum--undated` Styling
- Pipeline-Analyse: VerknÃ¼pfungen-Flow von Google Sheets â†’ transform.py â†’ JSON-LD â†’ Frontend komplett verifiziert

### Erkenntnisse
- 78% der Records haben 0 VerknÃ¼pfungen (nur NIM_003, NIM_004, NIM_007 sind erschlossen)
- 39 Records ohne Datum (Konvolut-Folios + Ephemera)
- 3 Datumsformate im Datensatz: YYYY-MM-DD (100x), YYYY-MM-DD/YYYY-MM-DD (142x), YYYY (1x)
- Pipeline funktioniert korrekt â€” alle VerknÃ¼pfungstypen werden sauber gemappt

### Entscheidungen
- MonatsabkÃ¼rzungen auf Ã–sterreichisch: "JÃ¤n." statt "Jan."
- Thin Space (`\u2009`) zwischen Tag und Monat fÃ¼r typografische QualitÃ¤t
- "o. D." (ohne Datum) als Archivkonvention statt leerer Zelle

---

## 2026-02-20 â€” Session 7: Konvolut-Darstellung und Sortierung

### Was getan
- **Kritischer Bug gefixt**: `getOrderedItems()` iterierte nur ueber `store.allRecords` (rico:Record), aber Konvolute sind `rico:RecordSet` und leben in `store.konvolute` â†’ 76 Einzelobjekte innerhalb von Konvoluten waren im Bestand unsichtbar
- **getOrderedItems() neu geschrieben**: Merged standalone Records + Konvolut RecordSets in eine sortierte Liste, injiziert Konvolut-Kinder nach dem jeweiligen Konvolut-Header
- **Filter-Logik verbessert**: Bei aktivem Search/DocType-Filter werden Konvolut-Header entfernt und Kinder als eigenstaendige Zeilen angezeigt (kein Expand/Collapse noetig)
- **Titel-Sortierung ergaenzt**: Neuer Sort-Option "Titel" im Dropdown (alphabetisch, `localeCompare('de')`)

### Erkenntnisse
- Konvolute (NIM_003, NIM_004, NIM_007) sind `rico:RecordSet` mit `rico:hasRecordSetType: rico:File`
- Die alte `getOrderedItems()` suchte nach Records mit gleichem `rico:identifier` wie ein Konvolut â€” solche Records existieren aber nicht (Konvolute sind ausschliesslich RecordSets)
- NIM_029 ist im JSON-LD aktuell ein `rico:Record` (kein Konvolut) â€” wird erst zum RecordSet, wenn Folios bearbeitet werden
- 281 Records + 3 Konvolute + 1 Fonds = 285 Nodes im Graph, davon 205 standalone + 76 in Konvoluten

### Entscheidungen
- Konvolute als eigenstaendige Zeilen mit Toggle-Button (Aufklappen/Zuklappen der Kinder)
- Bei Suche/Filter: Strukturelle Hierarchie wird aufgeloest, alle Einzelobjekte flach dargestellt
- NIM_029 bleibt vorerst Record â€” wird automatisch Konvolut sobald Folios in der Pipeline ankommen

---

## 2026-02-20 â€” Session 8: Bestand-View Konvolut-Metadaten und Anforderungsanalyse

### Was getan
- **7 Bestand-View-Probleme behoben** (Plan genehmigt und implementiert):
  1. `loader.js` Pass 3: `store.konvolutMeta` mit Titel (vom Folio-Kind), Datumsbereich (min/max aus Kindern), Link-Summe, Kind-Anzahl
  2. `store.folioIds` + Filter: Folio-Meta-Records aus `allRecords` entfernt (282 â†’ 279)
  3. `formatChildSignatur()`: Kinder zeigen "Fol. 14" statt "NIM_007 14"
  4. `buildKonvolutDetail()`: Aggregierte Uebersicht mit Top-10 Personen, Top-5 Orte
  5. Counter: "279 Objekte Â· 3 Konvolute"
  6. Gedankenstrich statt "0" bei unverknuepften Records (`.archiv-links--zero`)
  7. Konvolut-Zeilen: Titel aus Folio-Kind, Zeitraum aus Kindern, kein "o. D."
- **Anforderungsanalyse (Soll-Ist-Abgleich v5.0)** gegen Codebase verifiziert

### Erkenntnisse aus der Anforderungsanalyse
- **3 faktische Fehler im Analysedokument identifiziert**:
  1. "1919â€“2826" ist kein Parsing-Bug in stats-bar.js (Math.min/max korrekt) â€” falls falsch, dann Datenquelle
  2. Kosmos ist voll funktional (D3 Force-Graph), nicht "unklar"
  3. NIM_005/NIM_006 haben `m3gim-dft:konvolut` als Typ â€” Badge wird absichtlich unterdrueckt (`docType !== 'konvolut'`)
- **Korrekte Beobachtungen**:
  - Detailansicht hat keinen "leeren Zustand" fuer unerschlossene Objekte
  - Matrix-Drilldown oeffnet nur erstes Dokument, nicht gefilterte Liste
  - Chronik "Ohne Ort" wird wie eine Ortskategorie behandelt, nicht als Erfassungsluecke
  - Personen-Tags in Detailansicht sind nicht klickbar (kein Navigationskreis zu Indizes)
- **Neues konzeptuelles Framework**: UC1â€“UC4 (4 Use Cases) und A1â€“A9/S1â€“S3/D1â€“D5 (Anforderungs-IDs) â€” existiert nicht in unserer Knowledge-Base
- **Kritischer Pfad fuer Iteration 2**: Mustererkennung (Matrix/Kosmos) â†’ Quellenbeleg (Detail) â†’ persistente Sammlung (Merkliste) â€” dieser Pfad ist noch nicht geschlossen

### Entscheidungen
- Folio-Records sind Metadaten, keine Archivobjekte â†’ aus allRecords entfernen
- Konvolut-Titel wird vom Folio-Kind abgeleitet (nicht in Pipeline/JSON-LD)
- Analysedokument-Fehler werden nicht ins Wissensdokument uebernommen, korrekte Beobachtungen schon

### Offene Punkte fuer Iteration 2
- Detailansicht: "Noch nicht erschlossen"-Hinweis bei leerer rechter Spalte
- Matrix: Drilldown auf gefilterte Dokumentliste statt nur erstes Dokument
- Personen-Tags klickbar machen (â†’ Index-Navigation)
- Chronik "Ohne Ort" als Erfassungsluecke kennzeichnen
- Merkliste (Session-basiert, CSV-Export) als Minimalversion

---

## 2026-02-20 â€” Session 9: Aufgabenkatalog â€” Pipeline-Fix + Quick-Wins + Features

### Milestone 1: Pipeline-Normalisierung

**3 Bugs in transform.py gefixt und verifiziert:**
1. **Rollen-Normalisierung**: `normalize_str()` â†’ `normalize_lower()` auf Zeile 340 â€” Rollen waren gemischt-case ("Dirigent" vs "dirigent"), jetzt konsistent lowercase
2. **Datums-Bereinigung**: `dates.append(name)` â†’ `dates.append(clean_date(rel.get("datum") or name))` â€” Timestamps ("1959-10-28 00:00:00") in `rico:isAssociatedWithDate` bereinigt
3. **Ort/Datum-Decomposition**: Neue Funktion `decompose_komposit_value()` â€” Komposit-Werte ("Muenchen, 1952-12-17") werden in separate Ort- und Datum-Relationen zerlegt

**Verifikation:** 0 Grossbuchstaben-Rollen, 0 Timestamps, 0 gemischte Ort/Datum-Strings. 282 Records, 3 Konvolute, 1280 Verknuepfungen.

**Zusaetzlich:** `archiv-chronik.js` nutzt jetzt `formatChildSignatur()` fuer Konvolut-Kinder (Chronik-Signaturen waren nicht gekuerzt).

### Milestone 2: Quick-Wins (QW-1 bis QW-5)

1. **QW-1 Stats-Bar**: Jahresvalidierung (1800â€“2030 Filter) â€” verhindert implausible Zeitraeume
2. **QW-2 Typ-Badges**: "Nicht klassifiziert" Badge fuer Records ohne Dokumenttyp (`badge--unclassified`)
3. **QW-3 Empty-State**: "Noch nicht erschlossen" Hinweis bei leerer rechter Spalte in Inline-Detail
4. **QW-4 Kosmos-Legende**: "Knotengroesse = Dokumenthaeufigkeit" als zweite Erklaerungszeile
5. **QW-5 Malaniuk-Kategorie**: `'malaniuk': 'Archivsubjekt'` in PERSONEN_KATEGORIEN, KUG-Blau (#004A8F) als Farbe

### Milestone 3: Matrix-Drilldown (IT-1)

Klick auf Heatmap-Zelle zeigt jetzt Drilldown-Panel unter der Matrix mit Person, Zeitraum, und allen Dokumenten der Zelle als klickbare Liste. Klick auf Dokument â†’ navigiert zum Archiv-Tab. Zweiter Klick auf gleiche Zelle oder Schliessen-Button â†’ Panel ausblenden. Wiederverwendet: `el()`, `formatSignatur()`, `DOKUMENTTYP_LABELS`, `selectRecord()`.

### Milestone 4: Chronik-Toggle Ort/Person/Werk (IT-3)

Chronik-View kann jetzt nach drei Dimensionen gruppieren: Ort (Standard), Person, Werk. Toggle-Buttons in der Toolbar (nur sichtbar im Chronik-Modus). Generische Gruppierungsfunktion `groupByPeriodAndDimension()` extrahiert Dimension per Callback. Icons: Pin (Ort), User (Person), Music-Note (Werk). Placeholder: "â€” Ohne Ort/Person/Werk".

### Milestone 5: Klickbare Tags (IT-4)

Personen-, Ort-, Werk-Chips in der Detailansicht sind jetzt klickbar â†’ wechselt zu Indizes-Tab und expandiert den Eintrag. Router: `navigateToIndex(gridType, entityName)`. Indizes: `expandEntry()` mit Scroll-to-Element. CSS: Hover-Effekt fuer klickbare Chips.

### Milestone 6: Personen-Filter (I-2)

Personen-Dropdown im Archiv-Tab: Filtert Bestand UND Chronik nach verknuepfter Person. Sortiert nach Dokumenthaeufigkeit. archiv.js (Dropdown + State), archiv-bestand.js (Filter-Logik), archiv-chronik.js (Filter-Logik). Nutzt `store.persons.get(name).records.has(id)`.

### Milestone 7: Farbsystem (F-1, F-3, F-6, F-7, F-9, F-10, Ue-3)

4 funktionale Farbkategorien etabliert: KUG-Blau (Interaktion), Signal-Gruen (Verknuepfung), Neutral-Grau (Abwesenheit), Warmer Hintergrund (Struktur). Konkret: `--color-signal-green` fuer VKN.-Zahlen und Wikidata-Badges. Per-Typ-Badge-Farben entfernt (alles neutral-grau). Konvolut- und Folio-Zeilen ohne Hintergrundfarbe (Hierarchie via Typografie). Kategorie-Farbstriche im Personen-Index entfernt. Konsistentes Abwesenheits-Pattern (`--color-absent`) fuer "o. D.", "Nicht klassifiziert", leere VKN.

### Milestone 8: Navigation-Architektur

Info-Modal komplett ersetzt durch 3 eigenstaendige Seiten: About (Ueber MÂ³GIM), Projekt (Datenmodell & Erfassung), Hilfe (Bedienung). Router erweitert: `PAGES = ['about', 'projekt', 'hilfe']` neben den 4 Daten-Tabs. Header umgebaut: Stats-Bar und Info-Button entfernt, 3 Nav-Links (Ueber/Projekt/Hilfe) rechts. Lazy Rendering wie bei Tabs.

Archiv-Counter dynamisch: `updateCounter()` zeigt "X von Y Objekten" bei aktivem Filter, sonst "Y Objekte Â· Z Konvolute".

Toter Code bereinigt: `setupInfoModal()` entfernt, `renderStatsBar` Import entfernt, `.info-modal`/`.info-btn`/`.stats-bar` CSS entfernt.

Neues CSS: `pages.css` fuer Seiten-Layout (scholarly, Prosa-tauglich, max-width 720px). `base.css` erweitert um `.app-header__nav`.

Zustandsbericht (`12-zustandsbericht.md`) geschrieben und aktualisiert. Korrektur: kosmos.js `store`-Referenz ist kein Bug (Closure erfasst Funktionsparameter korrekt).

**Neue Dateien**: about.js (67), projekt.js (130), hilfe.js (133), pages.css (~130)
**Geaenderte Dateien**: index.html, router.js, main.js, archiv.js, archiv-bestand.js, archiv-chronik.js, base.css, components.css, 12-zustandsbericht.md

### Milestone 9: Bestand + Chronik Verbesserungen (B-1, C-2, C-3, C-4)

**B-1 Folio-Differenzierung**: Kind-Records in Konvoluten mit identischen Titeln zeigen jetzt einen Hinweis aus der ersten Verknuepfung (Person, Mention, Ort). Relevant fuer NIM_003 (10 identische Programmheft-Titel). Neue `getFolioHint()` in archiv-bestand.js, CSS `.archiv-folio-hint`.

**C-2 Ohne-Ort-Hinweis**: Placeholder-Gruppen ("â€” Ohne Ort/Person/Werk") zeigen kontextabhaengigen Hinweis "noch nicht erfasst (Schicht 2)". Dynamisch je nach Gruppierungsmodus.

**C-3 Undatierte Objekte**: "Undatiert"-Periode zeigt erklaerenden Zusatz "ohne Datumsangabe in der Quelle" â€” unterscheidet bewusste Nicht-Datierung von fehlender Erfassung.

**C-4 Agenten-Tooltip**: Bei mehr als 3 Agenten zeigt die Chronik "(+N)" und `title`-Attribut mit vollstaendiger Liste. Hover zeigt alle Namen.

**Geaenderte Dateien**: archiv-bestand.js, archiv-chronik.js, archiv.css

### Milestone 10: Matrix + Kosmos Erweiterungen (M-2, K-1, K-4)

**M-2 Kategorie-Labels**: Matrix Y-Achse zeigt Kuerzel nach Personenname: "Knappertsbusch [D]" fuer Dirigent, "[R]" Regisseur, "[Kr]" Korrepetitor, "[Ko]" Kollege, "[V]" Vermittler, "[Kp]" Komponist. Neue `KATEGORIE_KUERZEL` Map in matrix.js.

**K-1 Visuelle Legende**: Graduated circles (3 Stufen: 1, mittel, max) als SVG in der Kosmos-Legende. Neue `buildSizeLegend()` erstellt SVG-Elemente programmatisch. CSS `.kosmos-legend__sizes`.

**K-4 Zoom/Pan**: `d3.zoom()` auf SVG, 0.3xâ€“3x Constraint. Alle Zeichnungselemente in `<g class="kosmos-zoom-group">`. Reset-Button oben rechts im Container (absolut positioniert). CSS `.kosmos-zoom-reset`.

**Geaenderte Dateien**: matrix.js, kosmos.js, kosmos.css

---

## 2026-02-20 — Session 10: Archiv UX, Indizes Explorer, Wissenskorb

### Milestone 12: Pipeline-Fix Bearbeitungsstand

Spaltennamen-Normalisierung in transform.py und validate.py (`df.columns = [c.lower().strip() ...]` nach `pd.read_excel()`). Bearbeitungsstand-Werte gemappt: vollstaendig/Erledigt → abgeschlossen, begonnen → begonnen, zurueckgestellt → zurueckgestellt. Store erweitert: `unprocessedIds` (Set) fuer Records ohne Links UND ohne Bearbeitungsstand.

**Geaenderte Dateien**: scripts/transform.py, scripts/validate.py, docs/js/data/loader.js

### Milestone 13: Archiv UX

Spaltenheader-Sortierung statt Dropdown: klickbare `<th>`-Elemente mit Richtungsindikator (asc/desc Toggle, KUG-Blau + Pfeil). Custom Autocomplete-Combobox statt `<select>` fuer Personenfilter (294 Eintraege, live filterbar, Klick setzt Filter, x zuruecksetzen). Erweiterte Suche: Signatur + Titel + Typ + Datum. "Verkn." statt "Vkn.", "Nr." statt "Fol." fuer Konvolut-Stuecke. Typ-Filter Label "— Dokumenttyp —". Unbearbeitete Objekte markiert (opacity 0.7, Tooltip "Noch nicht erschlossen").

**Geaenderte Dateien**: archiv.js, archiv-bestand.js, format.js, archiv.css

### Milestone 14: Indizes Explorer

Viewport-Fix: `max-height: 380px` entfernt, stattdessen Flexbox-Kaskade (`height: 100%` auf `.idx-page`, `flex: 1; min-height: 0` auf `.idx-grids` und `.idx-grid__body`). Tab-Container Override: `#tab-indizes.tab-content { overflow: hidden; padding: 0; }`.

Cross-Grid-Facettensuche: Klick auf Index-Eintrag (z.B. "Karajan" bei Personen) setzt `activeFilter = { gridKey, name, recordIds: Set }`, filtert die anderen 3 Grids via Record-ID-Intersection. Facet-Chip mit Label/Name/Count/Close ueber den Grids. Grid-Count zeigt "gefiltert/total" bei aktivem Filter.

Detail-Expansion auf 10 Records begrenzt. Bei > 10: "Alle N im Archiv anzeigen →" Link, der via Custom Event (`m3gim:archiv-filter`) zum Archiv-Tab mit Personenfilter navigiert. `requestAnimationFrame` fuer Cross-Tab-Timing (Lazy Rendering).

**Geaenderte Dateien**: indizes.js, indizes.css, archiv.js (Event-Listener)

### Milestone 15: Wissenskorb

**Neue Dateien**: `docs/js/ui/korb.js` (sessionStorage-State mit Set, persist/listeners-Pattern), `docs/js/views/korb.js` (Tab-View mit Empty-State, sortierter Record-Liste, Entfernen-Button), `docs/css/korb.css` (Korb-Page, Bookmark-Button-Styles).

Bookmark-Icons in archiv-bestand.js (buildBookmarkBtn(), Hover → sichtbar, aktiv → KUG-Blau), archiv-inline-detail.js ("Zum Korb"/"Im Korb" Toggle-Button), indizes.js (Detail-Record-Zeilen).

Korb-Tab als 5. Tab: Router erweitert (`TABS = [..., ‘korb’]`), index.html (`<section id="tab-korb">`), Tab-Button mit Badge (id="korb-tab-btn", initial hidden). main.js: `initKorb()`, `onKorbChange(() => updateKorbTabVisibility())`, Lazy-Render-Invalidierung bei Korb-Aenderung.

**Geaenderte Dateien**: router.js, main.js, index.html, archiv-bestand.js, archiv-inline-detail.js, indizes.js, archiv.css

### Milestone 16: Knowledge + KB-Refactor

Architektur, Produkt, Operativer Plan aktualisiert. Modulzahl auf 21 korrigiert. Paralleler KB-Refactor: 12 nummerierte Knowledge-Docs + journal.md → 5 kanonische Docs + Traceability-Matrix + Quellenindex. Vollarchiv unter `_archive/2026-02-20-pre-kb-refactor/`.

---

Siehe auch: [→ Projekt](../projekt-kontext.md) · [→ Quellenbestand](../datenmodell-ontologie.md) · [→ Architektur](../system-architektur-pipeline.md)


