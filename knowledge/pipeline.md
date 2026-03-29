# Pipeline

> Skriptverantwortung, Datenfluss, Pipeline-Korrekturen, CI/CD und Datenqualitaets-Baseline.

## Skriptverantwortung

| Script | Zweck | Input | Output |
|---|---|---|---|
| `scripts/explore.py` | Datenexploration, Strukturdiagnostik | `data/source/*.xlsx` | `data/reports/exploration-report.md` |
| `scripts/validate.py` | Validierung, Qualitaetschecks | `data/source/*.xlsx` | `data/reports/validation-report.md` |
| `scripts/transform.py` | Transformation nach JSON-LD (RiC-O + m3gim) | `data/source/*.xlsx` | `data/output/m3gim.jsonld` |
| `scripts/build-views.py` | View-spezifische Aggregationen | JSON-LD | `data/output/views/*.json` |
| `scripts/reconcile.py` | Wikidata-Reconciliation (Fuzzy-Matching, P31-Verifikation, Caching, 3 Confidence-Level) | XLSX-Indizes | `data/output/wikidata-reconciliation.json` |
| `scripts/enrich-wikidata.py` | Wikidata-Property-Enrichment (P106, P412, P569/570, P625, P1191 etc.) | wikidata-reconciliation.json | `data/output/wikidata-enrichment.json` |
| `scripts/export-wikidata-csv.py` | Wikidata-CSVs fuer Google-Sheets-Import | wikidata-reconciliation.json | `data/output/wikidata-csvs/*.csv` (5 Dateien) |
| `scripts/audit-data.py` | Alignment-Pruefung XLSX vs JSON-LD vs Views | XLSX + JSON-LD + Views | Konsolenreport |

## Datenfluss (5 Stufen)

1. **XLSX-Export** aus Google Sheets nach `data/source/` (git-getrackt fuer Reproduzierbarkeit)
2. **Exploration + Validierung** (`explore.py`, `validate.py`) → Reports
2b. **Reconciliation** (`reconcile.py`) → `wikidata-reconciliation.json` (Fuzzy-Matching, 3 Confidence-Level)
2c. **Enrichment** (`enrich-wikidata.py`) → `wikidata-enrichment.json` (WD-Properties fuer gematchte Entitaeten)
3. **Modelltransformation** (`transform.py`) → `data/output/m3gim.jsonld` (mit `owl:sameAs` + Enrichment-Properties)
4. **View-Aggregation** (`build-views.py`) → `data/output/views/partitur.json` (einzige konsumierte View-Datei; matrix/kosmos/sankey werden zwar generiert, aber seit Session 25 nicht mehr git-getrackt — Frontend aggregiert on-the-fly via aggregator.js). Neu (Session 25): `extract_auftritte()` extrahiert ~60 Auftrittsereignisse in 3 Passes (strukturiert → Programmhefte/Plakate → Rezensionen), 4 Kategorien (engagement/festspiel/gastspiel/konzert). `mobilitaet[]` hat jetzt `kontext`-Felder.
5. **Bereitstellung**: `main()` kopiert automatisch partitur.json, matrix.json, kosmos.json nach `docs/data/` (Session 25, kein manuelles Copy mehr noetig)

> **Hinweis:** Pipeline-Skripte referenzieren aktuell noch `data/google-spreadsheet/` als SHEETS_DIR. Migration auf `data/source/` steht aus.

## Pipeline-Korrekturen (Session 10 + 19)

- Spaltennamen-Normalisierung: `df.columns = [c.lower().strip() ...]` nach `pd.read_excel()` in transform.py und validate.py
- Bearbeitungsstand-Werte: `vollstaendig/Erledigt → abgeschlossen`, `begonnen → begonnen`, `zurueckgestellt → zurueckgestellt`
- Store: `unprocessedIds` (Set) — Records ohne Links UND ohne Bearbeitungsstand
- Session 19: Mojibake in validate.py VOCAB + KOMPOSIT_TYPEN gefixt (doppelte UTF-8-Kodierung)
- Session 19: `normalize_bearbeitungsstand()` in validate.py eingefuehrt (Fuzzy-Matching wie transform.py)
- Session 19: `is_komposit_typ()` verbessert — Input-Wert vor Vergleich `.replace(" ", "")`

## Wikidata-Reconciliation (Session 17, erweitert Session 27)

`reconcile.py` implementiert mit:

- **Fuzzy-Matching** (Session 27): `thefuzz.token_set_ratio`, 3 Confidence-Level (exact ≥100, fuzzy_high ≥90, fuzzy_low ≥80)
- P31-Verifikation (instance-of-Check gegen erwarteten Typ)
- **Composer-aware Werk-Matching**: Compound-Query "Titel Komponist", P86-Bonus (+5 Score)
- Caching fuer wiederholte Laeufe
- MIN_NAME_LENGTH=3, CLI: `--min-confidence`, `--force`, `--type`
- Ergebnis (Baseline): 171 Matches (exakt). Fuzzy-Matching noch nicht mit --force gelaufen.
- Offen: Ergebnisse in Google Sheets uebertragen

## Wikidata-Enrichment (Session 27)

`enrich-wikidata.py` holt Properties aus der Wikidata API:

- Personen: P106 (Beruf), P412 (Stimmfach), P19/P20 (Geburts-/Sterbeort), P569/P570 (Lebensdaten)
- Orte: P625 (Koordinaten), P17 (Staat)
- Werke: P86 (Komponist), P136 (Genre), P1191 (Urauffuehrungsdatum)
- Orgs: P276 (Standort), P571 (Gruendungsdatum)
- Output: `data/output/wikidata-enrichment.json`
- `transform.py` injiziert Properties als `owl:sameAs` + `m3gim:`-Properties in JSON-LD
- Frontend (loader.js) extrahiert Properties in Store → Indizes-Subtitles, Kosmos-UA-Distanz

## CI/CD

- Kein aktiver Workflow (`.github/workflows/build-views.yml` in Session 17 entfernt — erzeugte Merge-Konflikte)
- Pipeline wird lokal ausgefuehrt, Ergebnisse manuell committet
- Reaktivierung moeglich wenn Dritte Daten updaten sollen

## Dateien in docs/data/

| Datei | Format | Status |
|-------|--------|--------|
| `m3gim.jsonld` | JSON-LD | Primaere Datenquelle fuer Archiv + Indizes + Client-Aggregation (Matrix, Kosmos, Zeitfluss) |
| `partitur.json` | JSON | Biografische Masterdaten fuer alle 4 D3-Views + Prototyp-Seiten (Lebensphasen, Orte, Mobilitaet mit kontext, `auftritte[]` mit 60 Events, Netzwerk, Repertoire, Dokumente) |
| ~~`matrix.json`~~ | JSON | Nicht mehr git-getrackt — Frontend aggregiert on-the-fly (Session 25) |
| ~~`kosmos.json`~~ | JSON | Nicht mehr git-getrackt — Frontend aggregiert on-the-fly (Session 25) |
| ~~`sankey.json`~~ | JSON | Nicht mehr git-getrackt — Legacy, nie konsumiert (Session 25) |

## Datenqualitaets-Baseline

> Audit-Stand: 2026-02-25 (282 Objekte, 1.246 effektive Verknuepfungen, 4 Indizes).

### Kritisch — Datenverlust

- **8 Verknuepfungen ohne Archivsignatur:** Davon 3 mit echten Daten (Cox/person, Wien/ort, Basel/ort). Gehen in Pipeline verloren → Signaturen nachtragen.
- **5 Verknuepfungen ohne Typ** (NIM_004 Folio 32): Ohne Typ kann Pipeline Relationstyp nicht bestimmen → Typ-Spalte nachtragen.
- **PL_07 Duplikat:** Signatur `UAKUG/NIM/PL_07` erscheint doppelt → Im Sheet bereinigen.

### Hoch — Unvollstaendige Erfassung

- **Bearbeitungsstand** fehlt bei 213/282 Objekten. Tippfehler ("vollstaedig"). Pipeline normalisiert Case, nicht Tippfehler.
- **Nur 62/282 Objekte** (22%) haben Verknuepfungen. Schwerpunkt: NIM_003, NIM_004, NIM_007.
- **4 Objekte** ohne Dokumenttyp, **3 Objekte** ohne Titel.

### Mittel — Strukturelle Probleme

- **Header-Shifts** in 3/4 Indizes (Org, Ort, Werk): Erste Datenzeile wird als Header gelesen. Pipeline korrigiert via HEADER_SHIFTS-Mapping, aber erste Datenzeile geht verloren → Echte Header einfuegen.
- **Folio-Spalte** ohne Header: Pandas liest als `Unnamed: 2` → Header `folio` setzen.

### Niedrig — Anreicherungsluecken

- **Wikidata-IDs** fehlten bei 97% der Index-Eintraege. Update: `reconcile.py` hat 171 Matches gefunden — noch in Sheets uebertragen.
- **Sprache** nur bei 74/282 Objekten erfasst (26%).

### Pipeline-seitig behoben (kein Handlungsbedarf)

- Case-Inkonsistenzen (lower/strip)
- Excel-Datetime-Artefakte (Zeitanteil)
- 45 Leerzeilen + 1 Template-Zeile (uebersprungen)
- Komposit-Typen (dekomponiert)
- Header-Shifts (HEADER_SHIFTS-Mapping)
- Mojibake in validate.py (Session 19: VOCAB + KOMPOSIT_TYPEN korrigiert)
- Bearbeitungsstand-Varianten (Session 19: `normalize_bearbeitungsstand()` fuzzy-matched)

## Handlungsbedarfe

### Sofort (vor weiterer Erfassung)

- Header-Shifts in 3 Indizes korrigieren
- Folio-Spalte benennen
- PL_07 Duplikat bereinigen
- Bearbeitungsstand-Schreibweise vereinbaren

### Laufend

- Verknuepfungen: Signatur und Typ immer ausfuellen
- Bearbeitungsstand pflegen
- Fehlende Dokumenttypen und Titel nachtragen

### Nach Abschluss der Erfassung

- Wikidata-Ergebnisse in Google Sheets uebertragen (171 Matches vorhanden)
- Verknuepfungs-Fortschritt pruefen (Ziel: >50% verknuepfte Objekte)
