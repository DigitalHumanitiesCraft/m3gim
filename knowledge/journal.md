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

Siehe auch: [→ Projekt](01-projekt.md) · [→ Quellenbestand](02-quellenbestand.md) · [→ Architektur](04-architektur.md)
