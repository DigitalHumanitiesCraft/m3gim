# Tests

> Artefakt-basierte Pipeline-Testsuite. 19 Module, 156 Tests grün (v1 + v2). TDD-Workflow für Modell-Erweiterungen.

## Zweck

Die Test-Suite validiert **den Output der Pipeline**, nicht den Pipeline-Code. Sie gibt bei Daten-Updates und Modell-Erweiterungen ein Sicherheitsnetz: wenn alle Tests grün bleiben, ist der Output strukturell, semantisch und referenziell intakt.

Bei Modell-Erweiterungen fungiert die Testsuite zusätzlich als **TDD-Spec**: die Invarianten aus [datenmodell.md](datenmodell.md) werden zuerst als `xfail(strict=True)`-Tests formuliert, dann implementiert, und XPASS signalisiert fertige Phase.

## Struktur

```
tests/
├── conftest.py                    # Session-scoped Fixtures (ENV-aware)
├── _helpers.py                    # ensure_list, iter_strings, iter_entities_with_id
├── schemas/
│   ├── m3gim_jsonld.schema.json   # JSON-Schema Draft 2020-12
│   └── partitur.schema.json
├── fixtures/
│   └── baseline_counts.json       # Regression-Mindestwerte (v1)
├── tools/
│   └── snapshot_diff.py           # CLI: diff zwei m3gim.jsonld-Versionen
├── test_01_schema.py              # JSON-Schema + DFT-Hierarchie
├── test_02_strings.py             # Umlaute, Whitespace, Datumsformate
├── test_03_roundtrip.py           # XLSX-Rohdaten ↔ JSON-LD
├── test_04_verknuepfungen.py      # Verknüpfungs-Typ-Mapping + Gender-neutrale Rollen
├── test_05_referential.py         # Referentielle Integrität, PL_07 xfail
├── test_06_frontend_contract.py   # loader.js/aggregator.js-Annahmen
├── test_07_wikidata.py            # WD-Enrichment-Integrität
├── test_08_partitur.py            # Partitur-Invarianten
├── test_09_baselines.py           # Regression-Zahlen (>=)
├── test_10_determinismus.py       # Pipeline 2× laufen (slow)
├── test_11_mobilitaet.py          # SpatiotemporalEvent + 5 Mobilitätssichten
├── test_12_agrelon.py             # AgRelOn-Relationen + Provenance
├── test_13_finanzen.py            # DetailAnnotation, monetaryAmount, currency
├── test_14_parse_units.py         # Unit-Tests für Parse-/Normalisierungsfunktionen
├── test_15_vocab_coverage.py      # XLSX-Vokabular ↔ Output-Vokabular
├── test_16_roundtrip_finance.py   # Jede Finanz-Zeile exakt im Output
├── test_18_typed_dates.py         # Typisierte Datumsproperty-Familie
└── test_19_provenance.py          # agrelon:hasProvenance + Konfidenz
```

Leitsatz: jeder Test prüft eine nicht-triviale, nicht-redundante Invariante und kann failen. Soft-Warnings gehören in `validate.py`, nicht in pytest.

## Teststufen (19 Module, 156 Tests)

### 1. Schema-Validierung (test_01)
JSON-Schemas (Draft 2020-12) validieren `m3gim.jsonld` und `partitur.json` strukturell. DFT-Hierarchie-Tests: `skos:Concept`-Knoten haben `prefLabel` und optional `broader`, alle Referenzen aus Records sind auflösbar.

### 2. String-Integrität (test_02)
Keine pandas/Excel-Artefakte (`NaT`, `nan`, `None` als Strings), keine Mojibake (`Ã¼`, `Ã¶`), kein Zeitrest (`00:00:00`), ISO-8601-Datumsformate, gestrippte Strings.

### 3. XLSX-Roundtrip (test_03)
Lädt die Rohdaten (`M3GIM-Objekte.xlsx`) direkt mit pandas und verifiziert: jede gültige XLSX-Signatur ist als Record im Graph, Titel stimmen überein, Dokumenttyp-Mapping greift. Parametrisierte Einzelfall-Tests für 3 Referenzobjekte (PL_01, PL_02, PL_04).

### 4. Verknüpfungs-Mapping (test_04)
Jeder der 8 Basis-Typen (person, institution, ensemble, ort, werk, ereignis, rolle, datum) hat einen Test, der die korrekte RiC-O-Property prüft. Plus: erwähnte Personen landen in `rico:hasOrHadSubject`, alle Agents haben `name`, Event-Daten im ISO-Format. Zusätzlich: **keine Rolle im Output endet auf `:in`/`:innen`** (Phase 4.1).

### 5. Referentielle Integrität (test_05)
Fonds existiert genau einmal, `hasOrHadPart`-Referenzen sind alle im Graph auflösbar, keine Waisen-Records. **xfail**: `test_all_record_ids_unique` — PL_07 erscheint doppelt (XLSX-Bug).

### 6. Frontend-Kontrakt (test_06)
Implizite Annahmen aus `loader.js`/`aggregator.js`:
- `rico:hasOrHadPart` nie als String (ensureArray-kompatibel)
- Keine Date-like Strings in Locations
- Wikidata-IDs matchen `^wd:Q\d+$`
- `owl:sameAs` konsistent zur `@id`
- Max. 1 `_Folio`-Kind pro Konvolut

### 7. Wikidata-Integrität (test_07)
Jede Q-ID im Output stammt aus `wikidata-reconciliation.json`, Enrichment-Werte sind korrekt getypt (`geo:lat/long` Float mit Range, `m3gim:birthDate` ISO), `m3gim:voiceType` String (nicht Liste), `m3gim:occupation` Liste von Strings.

### 8. Partitur-Invarianten (test_08)
Lebensphasen lückenlos (`LP(i).bis == LP(i+1).von`), decken 1919–2009 ab, unique IDs. Mobilitäts-Jahre innerhalb Lebensspanne, `form` im Enum. Auftritt-Jahre liegen im Phasen-Fenster, dokumente-Referenzen auflösbar.

### 9. Regression-Baselines (test_09)
Mindestwerte aus `fixtures/baseline_counts.json`, eingefroren auf v1-Stand. Alle Checks `>=`, nicht `==` — Wachstum erlaubt, Schrumpfung verboten. 11 Baselines (records, konvolute, persons, organizations, locations, works, verknuepfungen, wd_matches, partitur-auftritte, -lebensphasen, -mobilitaet).

### 10. Determinismus (test_10, slow)
Lässt `transform.py` zweimal laufen, vergleicht Output (ohne `m3gim:exportDate`). Fängt versehentliche Set-Iteration / Dict-Ordnungsabhängigkeiten. Nur mit `pytest -m slow` ausführen.

### 11. Mobilität (test_11, Phase 4.4 + 4.8)
SpatiotemporalEvent-Existenz, `atPlace`+`atDate` Pflicht, Rollen-Vokabular, Anzahl skaliert mit XLSX-Komposit-Rows. Die 5 Mobilitätssichten aus [datenmodell.md § 10](datenmodell.md) als SPARQL-ähnliche Python-Queries: performative, institutionelle, Korrespondenz-, biographische, diskursive Mobilität.

### 12. AgRelOn (test_12, Phase 4.8)
`agrelon:`-Namespace im Context, HasEmployeeEmployer-Relationen skalieren mit XLSX-arbeitgeber-Zeilen, HasCorrespondent-Relationen haben Provenance, `hasValidityPeriod` ist well-formed (Begin/End als ISO-String).

### 13. Finanzen (test_13, Phase 4.6)
Jede Finanz-DetailAnnotation hat korrekten `@type`, `detailField`, parsbare `monetaryAmount` (xsd:decimal), Währung im belegten Set (RM/DM/ATS/S/CHF/FRF/Fr/ESC/Esc/USD).

### 14. Parse-Units (test_14, 47 Tests)
Unit-Tests für `parse_monetary_value`, `normalize_role`, `normalize_lower`, `decompose_komposit_typ`, `decompose_komposit_value`, `clean_date`, `is_iso_date`. Liefert schnelles Feedback bei Änderungen an den Kern-Helfern ohne Pipeline-Run.

### 15. Vokabular-Coverage (test_15)
Jede in der XLSX belegte Rolle (nach Normalisierung) steht in `data.md § 5`, jeder Dokumenttyp ist im `DOKUMENTTYP_TO_DFT`-Mapping, jede Währung in `ALLOWED_CURRENCIES`. Output-Rollen sind Teilmenge des data.md-Vokabulars.

### 16. Finanz-Roundtrip (test_16, Phase 4.6)
Für jede der 21 XLSX-Finanzzeilen: der zugehörige Record (über `rico:identifier`) enthält eine DetailAnnotation mit exaktem `monetaryAmount` + `currency` + `detailRole`. Kein Silent-Drop.

### 18. Typisierte Datumsproperties (test_18, Phase 4.7)
Records nutzen die typisierten Properties (`m3gim:absendedatum` etc.) mindestens so häufig wie generisches `m3gim:eventDate`. Alle Werte sind ISO, TimeSpan oder qualifiziert (`circa:`/`vor:`/`nach:`).

### 19. Provenance + Konfidenz (test_19, Phase 4.3)
Kein `m3gim:dateEvidence` mehr im Output. `agrelon:hasProvenance` und `agrelon:hasConfidenceValue` treten gemeinsam auf (keine halbierten Meta-Aussagen). Konfidenz-Werte aus dem Evidenz-Mapping (1.0/0.8/0.6/0.0) als xsd:decimal.

## Ausführung

```bash
# Dependencies (einmalig)
pip install -r requirements-test.txt

# v1 — Default-Output
pytest tests/ -m "not slow"                 # ~156 Tests, ~1s
pytest tests/                                # inkl. Determinismus

# v2 — Parallel-Output
M3GIM_JSONLD_PATH=data/output-v2/m3gim.jsonld \
M3GIM_PARTITUR_PATH=data/output-v2/views/partitur.json \
M3GIM_SHEETS_DIR=data/source-v2 \
M3GIM_ENRICHMENT_PATH=data/output-v2/wikidata-enrichment.json \
M3GIM_RECONCILIATION_PATH=data/output-v2/wikidata-reconciliation.json \
    pytest tests/ -m "not slow"

# Snapshot-Diff zweier Outputs (CLI, kein Test)
python tests/tools/snapshot_diff.py \
    data/output/m3gim.jsonld \
    data/output-v2/m3gim.jsonld
```

### ENV-Overrides

Pfade sind überschreibbar für parallele Pipeline-Varianten:

| ENV | Default |
|---|---|
| `M3GIM_JSONLD_PATH` | `data/output/m3gim.jsonld` |
| `M3GIM_PARTITUR_PATH` | `data/output/views/partitur.json` |
| `M3GIM_SHEETS_DIR` | `data/google-spreadsheet` |
| `M3GIM_ENRICHMENT_PATH` | `data/output/wikidata-enrichment.json` |
| `M3GIM_RECONCILIATION_PATH` | `data/output/wikidata-reconciliation.json` |

## TDD-Workflow für Modell-Erweiterungen

Bei neuen Features aus [datenmodell.md](datenmodell.md):

1. **Invariante formulieren**: welcher neue Output soll entstehen?
2. **Test schreiben** mit `@pytest.mark.xfail(reason="Phase X nicht implementiert", strict=True)`. Mit `strict=True` failt die Suite, sobald der Test grün wird — das signalisiert, dass xfail-Marker entfernt werden muss.
3. **Mindestvorkommen** in Test verankern (nicht „leer ist ok"), damit der Test nicht trivial durchgeht.
4. **Implementieren** in `scripts/transform.py`, bis xfail → XPASS → xfail-Marker entfernt.
5. **Bei Datenadaptivität**: Tests datenadaptiv formulieren (skalieren mit XLSX-Count) statt hartcodierter Zahlen, um v1/v2 zu unterstützen.

Dieses Muster wurde in Phase 4.1–4.8 erfolgreich angewendet. Siehe [status.md](status.md) und [pipeline.md](pipeline.md).

## Workflow bei Daten-Updates

1. Tests auf aktuellem Stand grün — Baseline verifizieren
2. Neue XLSX nach `data/source-v2/` ablegen (alte `data/google-spreadsheet/` unverändert)
3. Pipeline mit ENV-Overrides laufen lassen → `data/output-v2/m3gim.jsonld`
4. Tests gegen v2 (siehe oben)
5. Snapshot-Diff als Review-Report: zeigt neue/entfernte/geänderte Records
6. Bei allen Tests grün + akzeptablem Diff: v2-Output ins Frontend mergen (`docs/data/`)

## Bekannte Ausnahmen

- `test_all_record_ids_unique` — **xfail**. PL_07 Duplikat aus XLSX-Erfassung. Fix: im Google Sheet bereinigen, dann xfail-Marker entfernen.
- v2: 1 **skip** in `test_has_employer_relations_from_arbeitgeber` — die einzige arbeitgeber-Zeile hat Signatur `UAKUG/NIM_11`, die keinem Record zugeordnet werden kann (verwaist).
- Junk-Namen im Personen-Index (`[Organi]`, kurze Initialen) werden als Warnung geloggt, nicht gefailed — Frontend filtert via `isJunkName`.
- Freitext in Datumsspalte (`"Wien, ab 1956"`, `"1944-05 bis 1944-09"`): `is_iso_date()` lässt sie nicht in typisierte Datumsproperties durch, landen stattdessen in generischem `m3gim:eventDate`.

## Test-Ergebnis (Session 28, 2026-04-16)

```
v1:  156 passed, 1 xfailed (PL_07)
v2:  155 passed, 1 skipped, 1 xfailed
```

Laufzeit: ~1 Sekunde für `pytest -m "not slow"`, ~60 Sekunden inkl. Determinismus-Test.

## Dependencies

`requirements-test.txt`:
- `pytest>=7.0`
- `jsonschema>=4.0` (Schema-Validierung)
- `deepdiff>=6.0` (Snapshot-Diff)

Produktions-`requirements.txt` bleibt unberührt (nur pandas + openpyxl + thefuzz).

## Abgrenzungen

**Was nicht getestet wird** (bewusst):
- Pipeline-Internas (private Funktionen) — außer die in test_14 als Unit-Tests
- Google-Sheets-Content selbst — Datenqualität ist redaktionelle Aufgabe (`explore.py`/`validate.py`)
- Frontend-JavaScript — Browser-Validierung, nicht pytest
- Performance — Pipeline-Laufzeit unkritisch (<1 min)

**Was später dazukommen kann**:
- SHACL-Validierung gegen RiC-O-Shapes (`pyshacl`) — semantisch schärfer als JSON-Schema
- Frontend-Smoke-Tests (Node-Script, das `loader.js`-Store-Aufbau simuliert)
- CI-Integration (aktuell keine, siehe [pipeline.md](pipeline.md))
