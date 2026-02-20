# Journal — M³GIM Arbeitstagebuch

> Kompakte Dokumentation aller Arbeitssessions.

---

## 2026-02-18 — Session 1: Iteration 1 → 2 Übergang

### Was getan
- Wissens-Destillation: 7 Vault-Dokumente geschrieben und verifiziert
- Repo-Bereinigung: Fotografien komplett aus Scope entfernt (alle Scripts, Docs, Frontend)
- `data/sources/` Verzeichnis gelöscht
- KNOWLEDGE.md als konsolidiertes Wissensdokument angelegt (305 Zeilen)

### Entscheidungen
- Fotografien (UAKUG/NIM_FS_XXX) sind nicht Teil des Projekts
- 3 Bestandsgruppen: Hauptbestand (255), Plakate (26), Tonträger (1)

---

## 2026-02-19 — Session 2: Knowledge-Ordner und explore.py

### Was getan
- KNOWLEDGE.md ersetzt durch strukturierten `knowledge/` Ordner mit 7 thematischen Dokumenten + README
- `.gitignore` korrigiert (knowledge/ war blockiert)
- `explore.py` als erster Pipeline-Schritt geschrieben (~760 Zeilen)
- ZIP-Entpackung, flexibles Datei-Matching, Pro-Tabelle-Analyse, Cross-Table-Checks
- Windows UTF-8 Fix (cp1252 → utf-8)
- Pfadkorrektur: `data/input/` → `data/google-spreadsheet/` (User-Feedback)
- Erster erfolgreicher Lauf: alle 6/6 Tabellen erkannt, 6 Warnungen

### Entscheidungen
- Knowledge lebt in Repo UND Vault (nicht nur Vault)
- Bestehende `data/google-spreadsheet/` verwenden, kein neues `data/input/`
- Gesamten Pipeline-Workflow neu denken für Iteration 2

---

## 2026-02-20 — Session 3: Daten-Exploration und Datenmodell v2.5

### Was getan
- Detailanalyse aller 6 Excel-Tabellen (Objekte, Verknüpfungen, 4 Indizes)
- Konvolut-Hierarchie entdeckt: Objekt-ID = archivsignatur + " " + folio
- Verknüpfungs-Mechanismus geklärt: String-Matching über `name`-Spalte
- Prioritätenliste P1–P5 erstellt (alle durch Pipeline lösbar)
- Dokumenttyp-Vokabular erweitert (18 → 25 Werte)
- Datenmodell v2.4 → v2.5
- Alle 5 Knowledge-Docs aktualisiert (01, 02, 03, 04, 07)

### Erkenntnisse
- `Unnamed: 2` in Objekte = Folio-Spalte (fehlender Header)
- Header-Shifts in 3 von 4 Indizes (Org, Ort, Werk)
- IDs in Indizes sind Durchzählungen, keine Verknüpfungs-Schlüssel
- Wikidata wird via `reconcile.py` automatisiert, nicht manuell erfasst
- Nur 3/282 Objekte bisher verknüpft — Verknüpfungsarbeit am Anfang
- Case-Inkonsistenzen durchgängig — Pipeline normalisiert mit `.lower().strip()`
- Excel-Datetime-Artefakte sind Export-Artefakte, kein Datenproblem
- Leere Zeilen in Verknüpfungen einfach ignorieren
- Bearbeitungsstand: 3 Zielwerte (vollständig, in bearbeitung, offen)

### Entscheidungen
- P1–P5 löst Pipeline automatisch, kein Handlungsbedarf im Google Sheet
- Wikidata-Reconciliation wird eigenes Script (`reconcile.py`)
- `Unnamed: 2` / Folio-Feld vorerst ignorieren (Pipeline erkennt es aber)

### Nächste Schritte
- Pipeline-Scripts überarbeiten (validate.py, create-ric-json.py, build-views.py)
- Konvolut-Lieferung (21. Feb)
- Meeting: Datenerfassung, Modellierung, Workflows (24. Feb)

---

## 2026-02-20 — Session 4: RiC-O Referenz, m3gim-Ontologie, Pipeline Iteration 2

### Was getan
- RiC-O 1.1 Referenzdokument geschrieben (`knowledge/08-ric-o.md`): Alle relevanten Klassen, Properties, Modellierungsmuster
- 5 offene Modellierungsfragen analysiert → 3 mit RiC-O allein lösbar, 2 brauchen m3gim-Erweiterung
- m3gim-Ontologie geschrieben (`knowledge/09-m3gim-ontology.md`): 2 Klassen (MusicalWork, Performance), 4 Object Properties, 2 SKOS-Vokabulare (11 Rollen, 25 Dokumenttypen)
- **validate.py komplett überarbeitet**: Normalisierung, 25 Dokumenttypen, Konvolut-aware Duplikaterkennung, Cross-Table-Checks, Header-Shift-Korrektur → 1 realer Fehler (PL_07 Duplikat), 177 Warnings
- **transform.py neu geschrieben** (ersetzt create-ric-json.py): Konvolut-Hierarchie (Fonds → RecordSet → Record), String-Matching gegen Indizes, Wikidata-Anreicherung, Komposit-Typ-Decomposition, 7 Namespaces → 282 Records, 3 Konvolute, 258 KB JSON-LD
- **build-views.py überarbeitet**: Liest strukturierte RiC-O-Daten (hasOrHadAgent, mentions, hasOrHadSubject, hasOrHadLocation) statt hardcoded Listen → 294 Personen in Matrix (vorher ~30), 7 Komponisten in Kosmos, 17 Flows in Sankey
- CI/CD aktualisiert (build-views.yml Pfade), scripts/README.md, knowledge/04-architektur.md
- `create-ric-json.py` gelöscht (ersetzt durch transform.py)

### Erkenntnisse
- Duale Datenextraktion (strukturiert + Title-Matching) ist robuster als nur eins von beiden
- Konvolut-Duplikaterkennung braucht Objekt-ID (signatur + folio), nicht nur signatur
- Wikidata-IDs tauchen als Komponisten-Namen in kosmos.json auf (Q190891, Q723407) — kosmetisch, TODO
- 294 vs 30 Personen in Matrix zeigt den Wert der strukturierten Verknüpfungen

### Entscheidungen
- m3gim-Namespace für MusicalWork und Rollen-Qualifikation (RiC-O reicht dafür nicht)
- transform.py statt create-ric-json.py (klarerer Name)
- Pfade standardisiert: google-spreadsheet/ → output/ → output/views/ → docs/data/

### Nächste Schritte
- Wikidata-IDs in Kosmos-View auflösen (Q190891 → Name)
- reconcile.py implementieren (Wikidata-Reconciliation)
- Frontend-Visualisierungen an neue Datenstrukturen anpassen
- Meeting 24. Feb vorbereiten

---

## 2026-02-20 — Session 5: Pipeline-Audit und Bugfix

### Was getan
- Umfassender Audit: Excel-Rohdaten gegen JSON-LD und View-JSONs verglichen
- 5 potentielle Bugs identifiziert, davon 3 echte Code-Bugs, 1 Datenqualitaets-Problem, 1 korrektes Verhalten
- **Bug 1 gefixt (schwerwiegend):** HEADER_SHIFTS in transform.py und validate.py hatten Spalten 2+3 vertauscht fuer Organisationsindex und Werkindex → 145 falsche Wikidata-URIs (`wd:Wien`, `wd:Wagner, Richard`). Fix: Spaltenreihenfolge korrigiert + Regex-Validierung `^Q\d+$`
- **Bug 2 gefixt:** Q-IDs als Komponistennamen in Kosmos (Q190891, Q723407) — durch Bug-1-Fix automatisch behoben
- **Bug 3 gefixt:** `rico:hasLanguage` → `rico:hasOrHadLanguage` (falscher RiC-O Property-Name) → 74 Records mit Sprache (vorher 0)
- `knowledge/10-datenqualitaet.md` geschrieben: Alle Erfassungsprobleme dokumentiert
- MEETING-2026-02-24.md komplett ueberarbeitet mit Datenqualitaets-Sektion
- Knowledge-Refactoring: Veraltete Zahlen und Referenzen in 01, 02, 04, 07 aktualisiert

### Erkenntnisse
- Header-Shift-Bug war subtil: Spalte 2 (wikidata_id) wurde zu `ort`/`komponist` gemappt, Spalte 3 (ort/komponist) wurde zu `wikidata_id` → Komponentennamen landeten als Wikidata-URIs
- Pipeline-Audit gegen Rohdaten ist essentiell — Bugs waren nicht durch reine Code-Review erkennbar
- 62/282 Objekte haben Verknuepfungen (22%), nicht 3 wie zuvor angenommen (3 Konvolute, aber 62 Records)

### Entscheidungen
- Bug 4 (17 verlorene Verknuepfungen) ist Datenqualitaet, kein Code-Fix
- Bug 5 (Phantom-Relationen) ist korrektes Verhalten (Komposit-Decomposition)
- P1-P5 Redundanz in 02-quellenbestand.md durch Verweis auf 10-datenqualitaet.md ersetzt

---

## 2026-02-20 — Session 6: Bestand-View Verbesserungen

### Was getan
- **formatDate() komplett neu**: ISO-Daten → menschenlesbare deutsche Formate (6 Regeln: Ganzjahr, Multi-Jahr, Monat, gleicher Monat, Monats-Range, Fallback)
- **countLinks() erweitert**: +2 Properties (`rico:isAssociatedWithDate`, `m3gim:hasPerformanceRole`) → vollständige Verknüpfungszählung
- **Vkn.-Spalte gefixt**: `0` statt leer (JS falsy-Bug), Konvolute zeigen aggregierte Zahl ("21 Fol. · 423 Vkn.")
- **Datum-Spalte**: `formatDate()` statt nur Jahreszahl, "o. D." kursiv/gedimmt für undatierte Records
- **CSS**: Spaltenbreiten angepasst (Datum 100→160px, Vkn. 60→120px), `.archiv-datum--undated` Styling
- Pipeline-Analyse: Verknüpfungen-Flow von Google Sheets → transform.py → JSON-LD → Frontend komplett verifiziert

### Erkenntnisse
- 78% der Records haben 0 Verknüpfungen (nur NIM_003, NIM_004, NIM_007 sind erschlossen)
- 39 Records ohne Datum (Konvolut-Folios + Ephemera)
- 3 Datumsformate im Datensatz: YYYY-MM-DD (100x), YYYY-MM-DD/YYYY-MM-DD (142x), YYYY (1x)
- Pipeline funktioniert korrekt — alle Verknüpfungstypen werden sauber gemappt

### Entscheidungen
- Monatsabkürzungen auf Österreichisch: "Jän." statt "Jan."
- Thin Space (`\u2009`) zwischen Tag und Monat für typografische Qualität
- "o. D." (ohne Datum) als Archivkonvention statt leerer Zelle

---

## 2026-02-20 — Session 7: Konvolut-Darstellung und Sortierung

### Was getan
- **Kritischer Bug gefixt**: `getOrderedItems()` iterierte nur ueber `store.allRecords` (rico:Record), aber Konvolute sind `rico:RecordSet` und leben in `store.konvolute` → 76 Einzelobjekte innerhalb von Konvoluten waren im Bestand unsichtbar
- **getOrderedItems() neu geschrieben**: Merged standalone Records + Konvolut RecordSets in eine sortierte Liste, injiziert Konvolut-Kinder nach dem jeweiligen Konvolut-Header
- **Filter-Logik verbessert**: Bei aktivem Search/DocType-Filter werden Konvolut-Header entfernt und Kinder als eigenstaendige Zeilen angezeigt (kein Expand/Collapse noetig)
- **Titel-Sortierung ergaenzt**: Neuer Sort-Option "Titel" im Dropdown (alphabetisch, `localeCompare('de')`)

### Erkenntnisse
- Konvolute (NIM_003, NIM_004, NIM_007) sind `rico:RecordSet` mit `rico:hasRecordSetType: rico:File`
- Die alte `getOrderedItems()` suchte nach Records mit gleichem `rico:identifier` wie ein Konvolut — solche Records existieren aber nicht (Konvolute sind ausschliesslich RecordSets)
- NIM_029 ist im JSON-LD aktuell ein `rico:Record` (kein Konvolut) — wird erst zum RecordSet, wenn Folios bearbeitet werden
- 281 Records + 3 Konvolute + 1 Fonds = 285 Nodes im Graph, davon 205 standalone + 76 in Konvoluten

### Entscheidungen
- Konvolute als eigenstaendige Zeilen mit Toggle-Button (Aufklappen/Zuklappen der Kinder)
- Bei Suche/Filter: Strukturelle Hierarchie wird aufgeloest, alle Einzelobjekte flach dargestellt
- NIM_029 bleibt vorerst Record — wird automatisch Konvolut sobald Folios in der Pipeline ankommen

---

## 2026-02-20 — Session 8: Bestand-View Konvolut-Metadaten und Anforderungsanalyse

### Was getan
- **7 Bestand-View-Probleme behoben** (Plan genehmigt und implementiert):
  1. `loader.js` Pass 3: `store.konvolutMeta` mit Titel (vom Folio-Kind), Datumsbereich (min/max aus Kindern), Link-Summe, Kind-Anzahl
  2. `store.folioIds` + Filter: Folio-Meta-Records aus `allRecords` entfernt (282 → 279)
  3. `formatChildSignatur()`: Kinder zeigen "Fol. 14" statt "NIM_007 14"
  4. `buildKonvolutDetail()`: Aggregierte Uebersicht mit Top-10 Personen, Top-5 Orte
  5. Counter: "279 Objekte · 3 Konvolute"
  6. Gedankenstrich statt "0" bei unverknuepften Records (`.archiv-links--zero`)
  7. Konvolut-Zeilen: Titel aus Folio-Kind, Zeitraum aus Kindern, kein "o. D."
- **Anforderungsanalyse (Soll-Ist-Abgleich v5.0)** gegen Codebase verifiziert

### Erkenntnisse aus der Anforderungsanalyse
- **3 faktische Fehler im Analysedokument identifiziert**:
  1. "1919–2826" ist kein Parsing-Bug in stats-bar.js (Math.min/max korrekt) — falls falsch, dann Datenquelle
  2. Kosmos ist voll funktional (D3 Force-Graph), nicht "unklar"
  3. NIM_005/NIM_006 haben `m3gim-dft:konvolut` als Typ — Badge wird absichtlich unterdrueckt (`docType !== 'konvolut'`)
- **Korrekte Beobachtungen**:
  - Detailansicht hat keinen "leeren Zustand" fuer unerschlossene Objekte
  - Matrix-Drilldown oeffnet nur erstes Dokument, nicht gefilterte Liste
  - Chronik "Ohne Ort" wird wie eine Ortskategorie behandelt, nicht als Erfassungsluecke
  - Personen-Tags in Detailansicht sind nicht klickbar (kein Navigationskreis zu Indizes)
- **Neues konzeptuelles Framework**: UC1–UC4 (4 Use Cases) und A1–A9/S1–S3/D1–D5 (Anforderungs-IDs) — existiert nicht in unserer Knowledge-Base
- **Kritischer Pfad fuer Iteration 2**: Mustererkennung (Matrix/Kosmos) → Quellenbeleg (Detail) → persistente Sammlung (Merkliste) — dieser Pfad ist noch nicht geschlossen

### Entscheidungen
- Folio-Records sind Metadaten, keine Archivobjekte → aus allRecords entfernen
- Konvolut-Titel wird vom Folio-Kind abgeleitet (nicht in Pipeline/JSON-LD)
- Analysedokument-Fehler werden nicht ins Wissensdokument uebernommen, korrekte Beobachtungen schon

### Offene Punkte fuer Iteration 2
- Detailansicht: "Noch nicht erschlossen"-Hinweis bei leerer rechter Spalte
- Matrix: Drilldown auf gefilterte Dokumentliste statt nur erstes Dokument
- Personen-Tags klickbar machen (→ Index-Navigation)
- Chronik "Ohne Ort" als Erfassungsluecke kennzeichnen
- Merkliste (Session-basiert, CSV-Export) als Minimalversion

---

## 2026-02-20 — Session 9: Aufgabenkatalog — Pipeline-Fix + Quick-Wins + Features

### Milestone 1: Pipeline-Normalisierung

**3 Bugs in transform.py gefixt und verifiziert:**
1. **Rollen-Normalisierung**: `normalize_str()` → `normalize_lower()` auf Zeile 340 — Rollen waren gemischt-case ("Dirigent" vs "dirigent"), jetzt konsistent lowercase
2. **Datums-Bereinigung**: `dates.append(name)` → `dates.append(clean_date(rel.get("datum") or name))` — Timestamps ("1959-10-28 00:00:00") in `rico:isAssociatedWithDate` bereinigt
3. **Ort/Datum-Decomposition**: Neue Funktion `decompose_komposit_value()` — Komposit-Werte ("Muenchen, 1952-12-17") werden in separate Ort- und Datum-Relationen zerlegt

**Verifikation:** 0 Grossbuchstaben-Rollen, 0 Timestamps, 0 gemischte Ort/Datum-Strings. 282 Records, 3 Konvolute, 1280 Verknuepfungen.

**Zusaetzlich:** `archiv-chronik.js` nutzt jetzt `formatChildSignatur()` fuer Konvolut-Kinder (Chronik-Signaturen waren nicht gekuerzt).

### Milestone 2: Quick-Wins (QW-1 bis QW-5)

1. **QW-1 Stats-Bar**: Jahresvalidierung (1800–2030 Filter) — verhindert implausible Zeitraeume
2. **QW-2 Typ-Badges**: "Nicht klassifiziert" Badge fuer Records ohne Dokumenttyp (`badge--unclassified`)
3. **QW-3 Empty-State**: "Noch nicht erschlossen" Hinweis bei leerer rechter Spalte in Inline-Detail
4. **QW-4 Kosmos-Legende**: "Knotengroesse = Dokumenthaeufigkeit" als zweite Erklaerungszeile
5. **QW-5 Malaniuk-Kategorie**: `'malaniuk': 'Archivsubjekt'` in PERSONEN_KATEGORIEN, KUG-Blau (#004A8F) als Farbe

### Milestone 3: Matrix-Drilldown (IT-1)

Klick auf Heatmap-Zelle zeigt jetzt Drilldown-Panel unter der Matrix mit Person, Zeitraum, und allen Dokumenten der Zelle als klickbare Liste. Klick auf Dokument → navigiert zum Archiv-Tab. Zweiter Klick auf gleiche Zelle oder Schliessen-Button → Panel ausblenden. Wiederverwendet: `el()`, `formatSignatur()`, `DOKUMENTTYP_LABELS`, `selectRecord()`.

---

Siehe auch: [→ Projekt](01-projekt.md) · [→ Quellenbestand](02-quellenbestand.md) · [→ Architektur](04-architektur.md)
