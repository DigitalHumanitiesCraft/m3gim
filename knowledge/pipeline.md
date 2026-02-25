# Pipeline

> Skriptverantwortung, Datenfluss, Pipeline-Korrekturen, CI/CD und Datenqualitaets-Baseline.

## Skriptverantwortung

| Script | Zweck | Input | Output |
|---|---|---|---|
| `scripts/explore.py` | Datenexploration, Strukturdiagnostik | XLSX-Exporte | `data/reports/exploration-report.md` |
| `scripts/validate.py` | Validierung, Qualitaetschecks | XLSX-Exporte | `data/reports/validation-report.md` |
| `scripts/transform.py` | Transformation nach JSON-LD (RiC-O + m3gim) | XLSX-Exporte | `data/output/m3gim.jsonld` |
| `scripts/build-views.py` | View-spezifische Aggregationen | JSON-LD | `data/output/views/*.json` |
| `scripts/reconcile.py` | Wikidata-Reconciliation (100%-Match, P31-Verifikation, Caching) | XLSX-Indizes | `data/output/wikidata-reconciliation.json` |
| `scripts/export-wikidata-csv.py` | Wikidata-CSVs fuer Google-Sheets-Import | wikidata-reconciliation.json | `data/output/wikidata-csvs/*.csv` (5 Dateien) |
| `scripts/audit-data.py` | Alignment-Pruefung XLSX vs JSON-LD vs Views | XLSX + JSON-LD + Views | Konsolenreport |

## Datenfluss (5 Stufen)

1. **XLSX-Export** aus Google Sheets nach `data/google-spreadsheet/`
2. **Exploration + Validierung** (`explore.py`, `validate.py`) → Reports
3. **Modelltransformation** (`transform.py`) → `data/output/m3gim.jsonld`
4. **View-Aggregation** (`build-views.py`) → `data/output/views/` (matrix.json, kosmos.json, partitur.json, sankey.json)
5. **Bereitstellung** in `docs/data/` (manuelles Copy oder Pipeline-Schritt)

## Pipeline-Korrekturen (Session 10 + 19)

- Spaltennamen-Normalisierung: `df.columns = [c.lower().strip() ...]` nach `pd.read_excel()` in transform.py und validate.py
- Bearbeitungsstand-Werte: `vollstaendig/Erledigt → abgeschlossen`, `begonnen → begonnen`, `zurueckgestellt → zurueckgestellt`
- Store: `unprocessedIds` (Set) — Records ohne Links UND ohne Bearbeitungsstand
- Session 19: Mojibake in validate.py VOCAB + KOMPOSIT_TYPEN gefixt (doppelte UTF-8-Kodierung)
- Session 19: `normalize_bearbeitungsstand()` in validate.py eingefuehrt (Fuzzy-Matching wie transform.py)
- Session 19: `is_komposit_typ()` verbessert — Input-Wert vor Vergleich `.replace(" ", "")`

## Wikidata-Reconciliation (Session 17)

`reconcile.py` implementiert mit:

- 100%-Match-Strategie (Wikidata Search API)
- P31-Verifikation (instance-of-Check gegen erwarteten Typ)
- Caching fuer wiederholte Laeufe
- MIN_NAME_LENGTH=3 (Einbuchstaben-/Zweibuchstaben-Namen werden uebersprungen)
- Ergebnis: 171 Matches ueber Personen, Orte, Organisationen, Werke
- Offen: Ergebnisse in Google Sheets uebertragen

## CI/CD

- Kein aktiver Workflow (`.github/workflows/build-views.yml` in Session 17 entfernt — erzeugte Merge-Konflikte)
- Pipeline wird lokal ausgefuehrt, Ergebnisse manuell committet
- Reaktivierung moeglich wenn Dritte Daten updaten sollen

## Dateien in docs/data/

| Datei | Format | Status |
|-------|--------|--------|
| `m3gim.jsonld` | JSON-LD | Primaere Datenquelle fuer Archiv + Indizes |
| `matrix.json` | JSON | Personen x Zeitraeume x Kategorien (Matrix-View) |
| `kosmos.json` | JSON | Zentrum + Komponisten + Werke (Kosmos-View) |
| `partitur.json` | JSON | Biografische Masterdaten fuer Mobilitaet-View |
| `sankey.json` | JSON | Legacy — wird erzeugt, aber nicht konsumiert |

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
