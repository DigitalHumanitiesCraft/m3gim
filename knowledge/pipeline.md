# Pipeline

> Skriptverantwortung, Datenfluss, ENV-Overrides, Pipeline-Erweiterungen, Qualitaets-Baseline. Stand: 2026-04-17 nach v2-Konsolidierung.

## Skriptverantwortung

| Script | Zweck | Input | Output |
|---|---|---|---|
| `scripts/explore.py` | Datenexploration, Strukturdiagnostik | `$M3GIM_SHEETS_DIR` | `$M3GIM_REPORTS_DIR/exploration-report.md` |
| `scripts/validate.py` | Validierung, Qualitaetschecks | `$M3GIM_SHEETS_DIR` | `$M3GIM_REPORTS_DIR/validation-report.md` |
| `scripts/transform.py` | Transformation nach JSON-LD (RiC-O + m3gim + agrelon) | `$M3GIM_SHEETS_DIR` | `$M3GIM_OUTPUT_DIR/m3gim.jsonld` |
| `scripts/build-views.py` | View-spezifische Aggregationen, partitur.json | `$M3GIM_OUTPUT_DIR/m3gim.jsonld` | `$M3GIM_OUTPUT_DIR/views/*.json` |
| `scripts/reconcile.py` | Wikidata-Reconciliation (Fuzzy-Matching, P31-Verifikation, Caching, 3 Confidence-Level) | XLSX-Indizes | `data/output/wikidata-reconciliation.json` |
| `scripts/enrich-wikidata.py` | Wikidata-Property-Enrichment (P106, P412, P569/570, P625, P1191 etc.) | wikidata-reconciliation.json | `data/output/wikidata-enrichment.json` |
| `scripts/export-wikidata-csv.py` | Wikidata-CSVs fuer Google-Sheets-Import | wikidata-reconciliation.json | `data/output/wikidata-csvs/*.csv` (5 Dateien) |
| `scripts/audit-data.py` | Alignment-Pruefung XLSX vs JSON-LD vs Views | XLSX + JSON-LD + Views | Konsolenreport |

## ENV-Overrides

Alle Pipeline-Skripte respektieren drei Umgebungsvariablen für Ausnahmefälle (z.B. alternative Datenstände, Experimente):

| ENV | Default |
|---|---|
| `M3GIM_SHEETS_DIR` | `data/google-spreadsheet` |
| `M3GIM_OUTPUT_DIR` | `data/output` |
| `M3GIM_REPORTS_DIR` | `data/reports` |

`build-views.py` kopiert die Frontend-Artefakte (`m3gim.jsonld`, `partitur.json`, `matrix.json`, `kosmos.json`) nur dann nach `docs/data/`, wenn `M3GIM_OUTPUT_DIR` auf den Default zeigt.

### Workflow (ein Aufruf)

```bash
python scripts/transform.py
python scripts/build-views.py
```

## Datenfluss (5 Stufen)

1. **XLSX-Export** aus Google Sheets nach `$M3GIM_SHEETS_DIR` (git-getrackt fuer Reproduzierbarkeit)
2. **Exploration + Validierung** (`explore.py`, `validate.py`) → Reports
   2b. **Reconciliation** (`reconcile.py`) → `wikidata-reconciliation.json` (Fuzzy-Matching, 3 Confidence-Level)
   2c. **Enrichment** (`enrich-wikidata.py`) → `wikidata-enrichment.json` (WD-Properties fuer gematchte Entitaeten)
3. **Modelltransformation** (`transform.py`) → `$M3GIM_OUTPUT_DIR/m3gim.jsonld` mit:
   - `owl:sameAs` + WD-Enrichment-Properties
   - Skos:Concept-Knoten fuer hierarchische Dokumenttypen (data.md § 12)
   - `m3gim:SpatiotemporalEvent` als Top-Level Graph-Entities (data.md § 10)
   - `agrelon:*`-Relationen fuer Agent-Agent-Beziehungen (data.md § 8)
   - `agrelon:hasProvenance` + `hasConfidenceValue` statt `m3gim:dateEvidence` (data.md § 9)
   - Typisierte Datumsproperties `m3gim:absendedatum` etc. (data.md § 7)
   - `m3gim:DetailAnnotation` mit `monetaryAmount`/`currency`/`detailRole` (data.md § 11)
4. **View-Aggregation** (`build-views.py`) → `$M3GIM_OUTPUT_DIR/views/partitur.json` und matrix/kosmos/sankey
5. **Bereitstellung**: `build-views.py` kopiert im Default-Lauf **`m3gim.jsonld` (primäre Datenquelle)** + die Derivate `partitur.json`, `matrix.json`, `kosmos.json` automatisch nach `docs/data/`.

## Umgesetzte Pipeline-Erweiterungen (Phase 4, Session 28)

| Phase | Änderung in transform.py |
|---|---|
| 4.1 | `normalize_role()` strippt `:in`/`:innen` — Gender-neutrale Rollenbezeichner |
| 4.2 | `DOKUMENTTYP_TO_DFT` hierarchisch erweitert + `build_dft_concepts()` emittiert skos:Concept-Knoten mit skos:broader |
| 4.3 | `EVIDENZ_TO_CONFIDENCE` mapped dateEvidence auf `agrelon:hasConfidenceValue` (1.0/0.8/0.6/0.0), Record-URI als `agrelon:hasProvenance` |
| 4.4 | Komposit `ort, datum` erzeugt zusaetzlich `m3gim:SpatiotemporalEvent`-Instanz mit `atPlace`, `atDate`, `eventRole` (43 Events im aktuellen Stand) |
| 4.6 | `parse_monetary_value()` zerlegt `AMOUNT, CURRENCY`; Finanz-DetailAnnotation haelt `monetaryAmount` (xsd:decimal), `currency`, `detailRole`. `FINANCE_CURRENCY_DEFAULTS` pro Signatur-Präfix greift, wenn die Quelle keine Währung liefert (Session 29 für NIM_007: `S`). |
| 4.7 | `DATUMSROLLE_TO_PROPERTY` mapped Datumsrollen auf typisierte Properties (`m3gim:absendedatum`, `m3gim:auffuehrungsdatum` etc.); `is_iso_date()` filtert Freitext in Fallback `m3gim:eventDate`; `clean_date` normalisiert `YYYY-YYYY` → `YYYY/YYYY` |
| 4.8 | `AGRELON_MAPPING` erzeugt `agrelon:HasEmployeeEmployer`/`HasCorrespondent`/`HasProfessionalContact`/`HasIsPatron`/`HasIsMember` je (typ, rolle); `m3gim:agentRelation`-Array am Record |

Noch offen:
- Phase 4.5: `m3gim:StageRole` als eigenstaendige Entitaet — erfordert neuen Rollenindex-XLSX, mit Team abzustimmen
- Phase 4.9: Reifikation / `m3gim:Statement` — optional, spaet

## Pipeline-Korrekturen (Session 10 + 19 + 28)

- Spaltennamen-Normalisierung: `df.columns = [c.lower().strip() ...]` nach `pd.read_excel()`
- Folio-Spalten-Erkennung akzeptiert `folio`, `folio nr`, `folio_nr`, `Unnamed:*` (v2 nutzt `folio nr`)
- Bearbeitungsstand-Werte normalisiert (Fuzzy, inkl. Tippfehler)
- Store: `unprocessedIds` (Set) — Records ohne Links UND ohne Bearbeitungsstand
- Mojibake in validate.py VOCAB + KOMPOSIT_TYPEN gefixt (Session 19, doppelte UTF-8-Kodierung)
- `clean_date()` bereinigt Excel-Artefakte + normalisiert Zeitspannen `YYYY-YYYY` → `YYYY/YYYY`

## Wikidata-Reconciliation (Session 17, erweitert Session 27)

`reconcile.py` implementiert mit:

- **Fuzzy-Matching**: `thefuzz.token_set_ratio`, 3 Confidence-Level (exact ≥100, fuzzy_high ≥90, fuzzy_low ≥80)
- P31-Verifikation (instance-of-Check gegen erwarteten Typ)
- **Composer-aware Werk-Matching**: Compound-Query "Titel Komponist", P86-Bonus (+5 Score)
- Caching fuer wiederholte Laeufe
- MIN_NAME_LENGTH=3, CLI: `--min-confidence`, `--force`, `--type`
- Letzter Reconciliation-Lauf (auf v1-Datenstand 2026-02-25): 217 Q-IDs ergänzt, 216 Enrichments. Re-Run auf aktuellen v2-Indizes steht aus.

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

- Kein aktiver Workflow (`.github/workflows/build-views.yml` in Session 17 entfernt — Merge-Konflikte)
- Pipeline wird lokal ausgefuehrt, Ergebnisse manuell committet
- Reaktivierung moeglich wenn Dritte Daten updaten sollen

## Dateien in docs/data/

| Datei | Format | Status |
|-------|--------|--------|
| `m3gim.jsonld` | JSON-LD | **Alleinige primäre Datenquelle** für das Frontend. Enthält alle 381 Records + 43 SpatiotemporalEvents + 18 SKOS-Concepts + 24 AgRelOn-Relationen + 21 Finanz-Details. |
| `partitur.json` | JSON | Derivat: biografische Masterdaten für Lebenspartitur + Mobilitäts-Schwimmbahn. Wird nach Phase 7 aus dem Store regeneriert und ist dann optional. |
| `matrix.json` / `kosmos.json` | JSON | Derivat: vorverdichtete Aggregationen für einzelne D3-Views. Aggregator.js kann äquivalent zur Laufzeit aus dem Store rechnen. |

## Datenstand (data/google-spreadsheet, Stand 2026-04-17)

- 381 Objekte (354 Hauptbestand, 26 Plakate, 1 Tontraeger)
- 1.494 Verknuepfungen (1.220 effektive Record-Properties)
- 4 Indizes: Personen (324), Organisationen (69), Orte (41), Werke (97)
- 60 `ort, datum`-Kompositen → 43 SpatiotemporalEvents (17 verwaiste Signaturen / Artefakte)
- 21 Finanz-Zeilen (alle mit Waehrung seit `FINANCE_CURRENCY_DEFAULTS`-Fix), 12 Mobilitaets-Anmerkungen
- 18 SKOS-Concepts in DFT-Hierarchie
- Abdeckung: 295/381 Objekte haben Titel + Dokumenttyp (77%), 256/381 haben Datum (67%)

Fruehere Staende unter `data/_archive/` (2026-02-25: 282 Objekte, 1.246 Verknuepfungen).

## Datenqualitaets-Baseline

### Kritisch — Datenverlust

- **Verwaiste Signaturen** (1): `UAKUG/NIM_11` existiert in Verknuepfungen, aber nicht in Objekte.xlsx (nur `NIM_110`, `NIM_111` etc.). Betroffen u.a. die einzige `arbeitgeber:in`-Zeile.
- **Verknuepfungen ohne Archivsignatur** (~20): gehen in Pipeline verloren → Signaturen nachtragen.
- **PL_07 Duplikat:** Signatur `UAKUG/NIM/PL_07` erscheint doppelt → im Sheet bereinigen, dann xfail-Marker in `test_05_referential.py` entfernen.

### Hoch — Unvollstaendige Erfassung

- **Bearbeitungsstand** fehlt bei ~75% der Objekte. Tippfehler ("vollstaedig"). Pipeline normalisiert Case, nicht Tippfehler.
- **22% aktive Verknuepfungsrate**: Nur ein Bruchteil der Objekte hat Verknuepfungen. Schwerpunkt: NIM_003, NIM_004, NIM_007.

### Mittel — Strukturelle Probleme

- **Header-Shifts** in 3/4 Indizes (Org, Ort, Werk): erste Datenzeile wird als Header gelesen. Pipeline korrigiert via HEADER_SHIFTS-Mapping, aber echte Header in XLSX setzen besser.
- **Freitext-Datumswerte** wie `"Wien, ab 1956"` oder `"1944-05 bis 1944-09"` in `datum`-Spalte: gehen in typisierte Properties nicht durch (`is_iso_date` Gatekeeper), landen stattdessen im generischen `m3gim:eventDate`.

### Niedrig — Anreicherungsluecken

- **Wikidata-IDs** in aktuellen Indizes duenn: Personen ~170/324 (55% im Frontend sichtbar), Organisationen 8/69 (12%), Orte 14/41 (34%), Werke 16/97 (16%). Reconciliation mit aktualisiertem v2-Datenstand steht aus.
- **Sprache** nur bei 24% der Objekte erfasst.

### Pipeline-seitig behoben (kein Handlungsbedarf)

- Case-Inkonsistenzen (lower/strip)
- Gender-Suffixe in Rollen (`:in`, `:innen` werden gestrippt)
- Excel-Datetime-Artefakte (Zeitanteil)
- Leerzeilen + Template-Zeilen (uebersprungen)
- Komposit-Typen (dekomponiert + SpatiotemporalEvent)
- Header-Shifts (HEADER_SHIFTS-Mapping)
- Mojibake in validate.py (Session 19)
- Bearbeitungsstand-Varianten (`normalize_bearbeitungsstand()`)
- Jahres-Ranges `YYYY-YYYY` werden zu ISO `YYYY/YYYY`

## Handlungsbedarfe

### Sofort (vor weiterer Erfassung)

- Verwaiste Signaturen (`NIM_11`) klaeren — Umbenennung oder Nachtrag in Objekte.xlsx
- PL_07 Duplikat bereinigen
- Reconciliation + Enrichment fuer v2 laufen lassen (mit neuen Indizes)
- Header-Shifts in 3 Indizes im Google Sheet korrigieren

### Laufend

- Verknuepfungen: Signatur und Typ immer ausfuellen
- Bearbeitungsstand pflegen
- Fehlende Dokumenttypen und Titel nachtragen
- Datierung nicht als Freitext (`"Wien, ab 1956"`), sondern als strukturiertes Feld

### Modell-Weiterentwicklung

- **Phase 6 (aktiv):** loader.js um Store-Maps erweitern — `store.dftHierarchy`, `store.mobilityEvents`, `store.agentRelations`, `store.finances` + typisierte Datumsfelder als Fallback in `indexByYear`. Spec steht als 7 XPASS-Tests in `test_06`, siehe [tests.md](tests.md).
- **Phase 7 (geplant):** Views aus Store aggregieren statt aus partitur.json. Reihenfolge: Mobilität → Matrix/Zeitfluss → Indizes (+Beziehungen-Grid) → Lebenspartitur → optional Finanz-Visualisierung.
- **Phase 4.5 (deferred, extern blockiert):** Rollenindex-XLSX anlegen (Spalten `m3gim_id`, `name`, `belongsToWork`, `voiceType`, `wikidata_id`). Braucht Abstimmung mit Erschliessungsteam.
