# Testing

> Teststrategie fuer die M3GIM-Pipeline: Artefakt-basierte Tests, JSON-Schema-Validierung, Roundtrip-Checks. Sicherheitsnetz bei Datenupdates.

## Zweck

Die Test-Suite validiert **den Output der Pipeline**, nicht den Pipeline-Code. Sie gibt uns bei Daten-Updates (neue XLSX aus Google Sheets) ein Sicherheitsnetz: wenn alle Tests gruen bleiben, ist der Output strukturell, semantisch und referenziell intakt. Pipeline-Skripte bleiben dadurch unveraendert.

Hintergrund: Pipeline ist stabil (siehe [pipeline.md](pipeline.md)), aber bei Daten-Updates (z.B. 283 → 381 Objekte) koennen sich Formatabweichungen, fehlende Verknuepfungen, Umlauten-Probleme oder Schema-Drift einschleichen. Statt die Pipeline zu erweitern, testen wir den Vertrag mit dem Frontend.

## Struktur

```
tests/
├── conftest.py              # Session-scoped Fixtures (laedt XLSX + JSON-LD einmal)
├── schemas/
│   ├── m3gim_jsonld.schema.json
│   └── partitur.schema.json
├── fixtures/
│   └── baseline_counts.json
├── tools/
│   └── snapshot_diff.py     # CLI: diffed zwei m3gim.jsonld-Versionen
├── test_01_schema.py        # JSON-Schema-Validierung
├── test_02_strings.py       # String-Integritaet (Umlaute, Whitespace, Datumsformate)
├── test_03_roundtrip.py     # XLSX-Rohdaten ↔ JSON-LD
├── test_04_verknuepfungen.py # Verknuepfungs-Typ-Mapping (8 Typen)
├── test_05_referential.py   # Referentielle Integritaet im Graph
├── test_06_frontend_contract.py  # loader.js/aggregator.js-Annahmen
├── test_07_wikidata.py      # WD-Enrichment-Integritaet
├── test_08_partitur.py      # Partitur-Invarianten
├── test_09_baselines.py     # Regression-Zahlen (Mindestwerte)
└── test_10_determinismus.py # Pipeline 2× laufen lassen (slow)
```

Tests liegen am Repo-Root, Python-Konvention. Schemas sind im `tests/schemas/`-Ordner abgelegt statt global, weil sie nur zum Testen genutzt werden — nicht als Publikations-Artefakt.

## Teststufen (10 Module)

### 1. Schema-Validierung
JSON-Schemas (Draft 2020-12) validieren `m3gim.jsonld` und `partitur.json` strukturell. Definiert Pflichtfelder, Typen, Enums, Regex-Patterns (Q-IDs, Datum). Agent-/Location-/Subject-Properties als `oneOf(object | array)` — sichert Frontend-ensureArray-Kontrakt.

### 2. String-Integritaet
Keine Artefakte aus pandas/Excel-Import (`NaT`, `nan`, `None` als Strings), keine doppelt-kodierte Umlauten (`Ã¼`, `Ã¶`), kein Excel-Zeitrest (`00:00:00`), ISO-8601-Datumsformate, gestrippte Strings.

### 3. XLSX-Roundtrip
Der wichtigste Test. Laed die Rohdaten (`M3GIM-Objekte.xlsx`) direkt mit pandas und verifiziert: jede gueltige XLSX-Signatur ist als Record im Graph, Titel stimmen ueberein, dokumenttyp-Mapping greift. Parametrisierte Einzelfall-Tests fuer 3 Referenzobjekte (PL_01, PL_02, PL_04).

### 4. Verknuepfungs-Mapping
Jeder der 8 Typen (person, institution, ensemble, ort, werk, ereignis, rolle, datum) hat einen Test, der die korrekte RiC-O-Property prueft. Plus: erwaehnte Personen landen in `rico:hasOrHadSubject` (nicht Agents), alle Agents haben `name`, Event-Daten im ISO-Format.

### 5. Referentielle Integritaet
Fonds existiert genau einmal, `hasOrHadPart`-Referenzen sind alle im Graph aufloesbar, keine Waisen-Records. **Bekannter xfail**: `test_all_record_ids_unique` — PL_07 erscheint doppelt (XLSX-Bug, in [pipeline.md](pipeline.md) dokumentiert).

### 6. Frontend-Kontrakt
Sichert implizite Annahmen aus `docs/js/data/loader.js` + `aggregator.js`:
- `rico:hasOrHadPart` nie als String (ensureArray-kompatibel)
- Keine Date-like Strings in Locations (loader.js filtert, aber sollte gar nicht vorkommen)
- Wikidata-IDs matchen `^wd:Q\d+$`
- `owl:sameAs` konsistent zur `@id`
- Max. 1 `_Folio`-Kind pro Konvolut

### 7. Wikidata-Integritaet
Jede Q-ID im Output stammt aus `wikidata-reconciliation.json`, Enrichment-Werte sind korrekt getypt (`geo:lat/long` Float mit Range-Check, `m3gim:birthDate` ISO), `m3gim:voiceType` als String (nicht Liste), `m3gim:occupation` als Liste von Strings.

### 8. Partitur-Invarianten
Lebensphasen lueckenlos (`LP(i).bis == LP(i+1).von`), decken 1919–2009 ab, unique IDs. Mobilitaets-Jahre innerhalb Lebensspanne, `form` im Enum. Auftritt-Jahre liegen im Phasen-Fenster, dokumente-Referenzen aufloesbar.

### 9. Regression-Baselines
Mindestwerte aus `fixtures/baseline_counts.json`, eingefroren auf v1-Stand. Alle Checks `>=`, nicht `==` — Wachstum erlaubt, Schrumpfung verboten. 11 Baselines (records, konvolute, persons, organizations, locations, works, verknuepfungen, wd_matches, partitur-auftritte, -lebensphasen, -mobilitaet).

### 10. Determinismus (slow)
Laesst `transform.py` zweimal laufen, vergleicht Output (ohne `m3gim:exportDate`). Faengt versehentliche Set-Iteration / dict-Ordnungsabhaengigkeiten. Nur mit `pytest -m slow` ausfuehren.

## Ausfuehrung

```bash
# Dependencies (einmalig)
pip install -r requirements-test.txt

# Alle Tests (schnell, ohne Pipeline-Re-Run)
pytest tests/ -m "not slow"

# Inklusive Determinismus
pytest tests/

# Gegen alternativen Output (v2-Pipeline-Lauf)
M3GIM_JSONLD_PATH=data/output-v2/m3gim.jsonld \
M3GIM_SHEETS_DIR=data/source-v2 \
    pytest tests/

# Snapshot-Diff zweier Outputs (CLI, kein Test)
python tests/tools/snapshot_diff.py \
    data/output/m3gim.jsonld \
    data/output-v2/m3gim.jsonld
```

### ENV-Overrides

Pfade sind ueberschreibbar fuer parallele Pipeline-Varianten:

| ENV | Default |
|---|---|
| `M3GIM_JSONLD_PATH` | `data/output/m3gim.jsonld` |
| `M3GIM_PARTITUR_PATH` | `data/output/views/partitur.json` |
| `M3GIM_SHEETS_DIR` | `data/google-spreadsheet` |
| `M3GIM_ENRICHMENT_PATH` | `data/output/wikidata-enrichment.json` |
| `M3GIM_RECONCILIATION_PATH` | `data/output/wikidata-reconciliation.json` |

## Workflow bei Daten-Updates

1. Tests auf aktuellem (v1) Stand gruen bekommen — Baseline verifizieren
2. Neue XLSX nach `data/source-v2/` ablegen (alte `data/google-spreadsheet/` unveraendert)
3. Pipeline mit Pfad-Override laufen lassen → `data/output-v2/m3gim.jsonld`
4. Tests gegen v2: `M3GIM_JSONLD_PATH=data/output-v2/m3gim.jsonld pytest tests/ -m "not slow"`
5. Snapshot-Diff als Review-Report: zeigt neue/entfernte/geaenderte Records
6. Bei allen Tests gruen + akzeptablem Diff: v2-Output ins Frontend mergen (`docs/data/`)

Ergebnis: alte Pipeline bleibt byte-identisch, v2-Validierung passiert rein ueber Tests.

## Bekannte Ausnahmen

- `test_all_record_ids_unique` — xfail. PL_07 Duplikat aus XLSX-Erfassung. Fix: im Google Sheet bereinigen, dann xfail-Marker entfernen.
- Junk-Namen im Personen-Index (z.B. `[Organi]`, kurze Initialen) werden als Warnung geloggt, nicht gefailed — laufende Erschliessung, Frontend filtert via `isJunkName`.
- `test_event_date_iso_or_range` — Warnungen statt Fails fuer Datierungs-Freitext in `m3gim:eventDate` (z.B. `"Wien, ab 1956"`, `"1944-05 bis 1944-09"`). Quelle: `M3GIM-Verknuepfungen.xlsx`, Spalte `datum`. Pipeline gibt Werte unveraendert durch — redaktioneller Fix im Google Sheet erforderlich. Test zeigt Count + Beispiele in der Konsole.

## Test-Ergebnis (v1-Baseline, 2026-04-16)

```
63 collected (nach Refactor)
62 passed
 1 xfailed (PL_07 Duplikat)
```

Laufzeit: ~2 Sekunden fuer `pytest -m "not slow"`, ~60 Sekunden inkl. Determinismus-Test.

## Refactor-Prinzipien (2026-04-16)

Initial 74 Tests → 63 Tests nach kritischer Durchsicht. Entfernt wurden:

- **Tautologische Meta-Tests**: Schemas auf Schema-Validität prüfen
- **Durch JSON-Schema abgedeckt**: `test_record_ids_well_formed`, `test_dates_iso_format` — Pattern stehen im Schema, doppelt war überflüssig
- **Selbstreferenzielle Typ-Checks**: `test_ensemble_typ_in_agents`, `test_ereignis_typ_in_subjects` — iterierten über bereits gefilterte Entities und prüften deren Typ (Tautologie)
- **Trivialtests**: `test_identifiers_present_non_empty` — implizit abgedeckt durch `test_every_xlsx_signatur_in_graph`
- **Soft-Tests ohne Assert** (reines `print(...)`): `test_person_names_not_junk`, `test_no_orphan_enrichments`, `test_orte_referenced_in_lifephase_ort` — waren Logging, keine Tests
- **Überlappende Roundtrip-Tests**: `test_titles_match_xlsx_for_sample` entfernt zugunsten der parametrisierten Einzelfall-Tests

Leitsatz: jeder Test muss eine nicht-triviale, nicht-redundante Invariante prüfen und failen können. Soft-Warnings gehören in die Pipeline (`validate.py`), nicht in pytest.

## Dependencies

`requirements-test.txt`:
- `pytest>=7.0`
- `jsonschema>=4.0` (Schema-Validierung)
- `deepdiff>=6.0` (Snapshot-Diff)

Produktions-`requirements.txt` bleibt unberuehrt.

## Abgrenzungen

**Was nicht getestet wird** (bewusst):
- Pipeline-Internas (private Funktionen, Helpers) — Output-Tests reichen als Vertragstest
- Google-Sheets-Content selbst — Datenqualitaet ist redaktionelle Aufgabe, siehe `explore.py`/`validate.py`
- Frontend-JavaScript — wird im Browser validiert, nicht in pytest
- Performance — Pipeline-Laufzeit unkritisch (< 1 Min)

**Was spaeter dazukommen kann**:
- SHACL-Validierung gegen RiC-O-Shapes (ueber `pyshacl`) — semantisch schaerfer als JSON-Schema
- Frontend-Smoke-Tests (Node-Script, das `loader.js`-Store-Aufbau simuliert)
- CI-Integration (aktuell keine, siehe pipeline.md → CI/CD)
