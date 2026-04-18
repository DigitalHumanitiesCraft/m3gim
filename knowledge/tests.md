# Tests

> Artefakt-basierte Pipeline-Testsuite. TDD-Workflow für Modell-Erweiterungen, Anker-Record-Strategie für XLSX-Provenance.

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
│   └── baseline_counts.json       # Regression-Mindestwerte
├── tools/
│   └── snapshot_diff.py           # CLI: diff zwei m3gim.jsonld-Versionen
├── test_01_schema.py              # JSON-Schema + DFT-Hierarchie
├── test_02_strings.py             # Umlaute, Whitespace, Datumsformate
├── test_03_roundtrip.py           # XLSX-Rohdaten ↔ JSON-LD
├── test_04_verknuepfungen.py      # Verknüpfungs-Typ-Mapping + Gender-neutrale Rollen
├── test_05_referential.py         # Referentielle Integrität, PL_07 xfail
├── test_06_frontend_contract.py   # loader.js-Store-Shape-Annahmen
├── test_07_wikidata.py            # WD-Enrichment-Integrität
├── test_08_partitur.py            # Partitur-Invarianten (Derivat, nicht mehr konsumiert)
├── test_09_baselines.py           # Regression-Zahlen (>=)
├── test_10_determinismus.py       # Pipeline 2× laufen (slow)
├── test_11_mobilitaet.py          # SpatiotemporalEvent + 5 Mobilitätssichten
├── test_12_agrelon.py             # AgRelOn-Relationen + Provenance
├── test_13_finanzen.py            # DetailAnnotation, monetaryAmount, currency
├── test_14_parse_units.py         # Unit-Tests für Parse-/Normalisierungsfunktionen
├── test_15_vocab_coverage.py      # XLSX-Vokabular ↔ Output-Vokabular
├── test_16_roundtrip_finance.py   # Jede Finanz-Zeile exakt im Output
├── test_18_typed_dates.py         # Typisierte Datumsproperty-Familie
├── test_19_provenance.py          # agrelon:hasProvenance + Konfidenz
├── test_20_xlsx_provenance.py     # m3gim:xlsxSource + Anker-Records
├── test_22_ste_coordinates.py     # STE.atPlace mit @id + geo:lat/long (Session 33)
├── test_23_role_hygiene.py        # rico:Place trägt keine Datumsrollen (Session 34)
└── test_25_chronik_mobility_cluster.py  # EVENT_ROLE_TO_MOBILITY_CLUSTER-Spec (Session 36)
```

Leitsatz: jeder Test prüft eine nicht-triviale, nicht-redundante Invariante und kann failen. Soft-Warnings gehören in `validate.py`, nicht in pytest.

## Teststufen

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
Implizite Annahmen aus `loader.js` (`aggregator.js` wurde Session 32 entfernt):
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
Mindestwerte aus `fixtures/baseline_counts.json` pro Entitätstyp (records, persons, orgs, locations, works, verknuepfungen, wd_matches). Alle Checks `>=`, nicht `==` — Wachstum erlaubt, Schrumpfung verboten. Baselines werden bei substanziellen Datenständen nach oben nachgezogen.

### 10. Determinismus (test_10, slow)
Lässt `transform.py` zweimal laufen, vergleicht Output (ohne `m3gim:exportDate`). Fängt versehentliche Set-Iteration / Dict-Ordnungsabhängigkeiten. Nur mit `pytest -m slow` ausführen.

### 11. Mobilität (test_11, Phase 4.4 + 4.8)
SpatiotemporalEvent-Existenz, `atPlace`+`atDate` Pflicht, Rollen-Vokabular, Anzahl skaliert mit XLSX-Komposit-Rows. Die 5 Mobilitätssichten aus [datenmodell.md § 10](datenmodell.md) als SPARQL-ähnliche Python-Queries: performative, institutionelle, Korrespondenz-, biographische, diskursive Mobilität.

### 12. AgRelOn (test_12, Phase 4.8)
`agrelon:`-Namespace im Context, HasEmployeeEmployer-Relationen skalieren mit XLSX-arbeitgeber-Zeilen, HasCorrespondent-Relationen haben Provenance, `hasValidityPeriod` ist well-formed (Begin/End als ISO-String).

### 13. Finanzen (test_13, Phase 4.6)
Jede Finanz-DetailAnnotation hat korrekten `@type`, `detailField`, parsbare `monetaryAmount` (xsd:decimal), Währung im belegten Set (RM/DM/ATS/S/CHF/FRF/Fr/ESC/Esc/USD).

### 14. Parse-Units (test_14)
Unit-Tests für `parse_monetary_value`, `normalize_role`, `normalize_lower`, `decompose_komposit_typ`, `decompose_komposit_value`, `clean_date`, `is_iso_date`. Liefert schnelles Feedback bei Änderungen an den Kern-Helfern ohne Pipeline-Run.

### 15. Vokabular-Coverage (test_15)
Jede in der XLSX belegte Rolle (nach Normalisierung) steht in `data.md § 5`, jeder Dokumenttyp ist im `DOKUMENTTYP_TO_DFT`-Mapping, jede Währung in `ALLOWED_CURRENCIES`. Output-Rollen sind Teilmenge des data.md-Vokabulars.

### 16. Finanz-Roundtrip (test_16, Phase 4.6)
Für jede XLSX-Finanzzeile: der zugehörige Record (über `rico:identifier`) enthält eine DetailAnnotation mit exaktem `monetaryAmount` + `currency` + `detailRole`. Kein Silent-Drop.

### 18. Typisierte Datumsproperties (test_18, Phase 4.7)
Records nutzen die typisierten Properties (`m3gim:absendedatum` etc.) mindestens so häufig wie generisches `m3gim:eventDate`. Alle Werte sind ISO, TimeSpan oder qualifiziert (`circa:`/`vor:`/`nach:`).

### 19. Provenance + Konfidenz (test_19, Phase 4.3)
Kein `m3gim:dateEvidence` mehr im Output. `agrelon:hasProvenance` und `agrelon:hasConfidenceValue` treten gemeinsam auf (keine halbierten Meta-Aussagen). Konfidenz-Werte aus dem Evidenz-Mapping (1.0/0.8/0.6/0.0) als xsd:decimal.

### 20. XLSX-Provenance + Anker-Records (test_20)

Prüft `m3gim:xlsxSource` an Records + DetailAnnotations + AgRelOn-Relationen + SpatiotemporalEvents. Zwei Testebenen:



**Strict — kuratierte Anker-Records.** Das Modul pflegt ein Fixture-Dict `ANCHOR_RECORDS` mit Erwartungen pro Anker (`xlsx_row`, `expected_doc_type`, `title_contains`, `min_finance_details`). Jeder Anker läuft durch parametrisierte Tests: existiert der Record, zeigt `xlsxSource` auf die erwartete XLSX-Zeile, tragen Nested Entities (Details, AgRelOn) selbst xlsxSource. Bricht der Test, ist entweder die XLSX umsortiert worden (Fixture pflegen, absichtlich) oder die Pipeline hat eine Regression. Aktuelle Anker: `UAKUG/NIM_007 5_1` (Finanz-Konvolut), `UAKUG/NIM_004 3` (Rezension), `UAKUG/NIM_003 1_8` (Musikinstitut).

**Soft — Coverage-Reports.** Prüft, dass alle Records und nested entities `xlsxSource` tragen, mit Toleranz für einzelne Nachzügler. Die Soft-Variante erlaubt graduellen Ausbau, falls Teilbestände erst später nachgezogen werden. Aktuelle Coverage-Werte stehen in `data/reports/quality-snapshot.md`.

Das Modul ist damit gleichzeitig Kontrakttest und **lesbare XLSX → JSON-LD-Abbildungs-Dokumentation**. Die Anker zeigen konkret: „Zelle 123 in Objekte.xlsx wird zu diesem Record, mit genau diesen Properties".

### 22. SpatiotemporalEvent-Koordinaten (test_22, Session 33)

TDD-Spec für den Koordinaten-Patch: jedes ortsindex-auflösbare `m3gim:SpatiotemporalEvent` trägt im `atPlace`-Subobjekt `@id` (`wd:Qxxx`), `owl:sameAs`, `geo:lat`, `geo:long` und — falls Wikidata P17 das liefert — `m3gim:country`. Anker: `ste_NIM_004_24_7` (Zürich Q72), `ste_NIM_004_24_10` (Salzburg Q34713). Soft-Coverage ≥ 10 STE mit Koordinaten.

### 23. Rollen-Hygiene an Orten (test_23, Session 34)

Regression-Test für einen Pipeline-Bug: im Komposit `ort,datum` der Verknüpfungstabelle wurde die Rolle (z. B. `erscheinungsdatum`) blind an beide Hälften vererbt — der `rico:Place`-Eintrag trug dadurch eine Datumsrolle, die im UI als „Stuttgart (erscheinungsdatum)" erschien. Der Test prüft: kein `rico:Place` an einem Record trägt eine Rolle aus `DATUMSROLLE_TO_PROPERTY`. Anker: NIM_004_12 (Stuttgart).

## Ausführung

```bash
# Dependencies (einmalig)
pip install -r requirements-test.txt

pytest tests/ -m "not slow"                 # schnelle Suite
pytest tests/                                # inkl. Determinismus

# Snapshot-Diff (bei Datenupdates, CLI, kein Test)
python tests/tools/snapshot_diff.py \
    data/_archive/output-v1-2026-02-25/m3gim.jsonld \
    data/output/m3gim.jsonld
```

### ENV-Overrides

Pfade sind für Ausnahmefälle (z.B. Experimente mit alternativen Datenständen) überschreibbar:

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
5. **Bei Datenadaptivität**: Tests datenadaptiv formulieren (skalieren mit XLSX-Count) statt hartcodierter Zahlen, damit neue Datenstände ohne Testkorrektur laufen.

Dieses Muster wurde in Phase 4.1–4.8 (Session 28) erfolgreich angewendet, ebenso beim Koordinaten-Patch (Session 33, test_22) und beim ORTE-Rollen-Fix (Session 34, test_23). Siehe [status.md](status.md) und [pipeline.md](pipeline.md).

### Anker-Record-Strategie (seit Session 31)

Ergänzend zum aggregat-orientierten TDD ist `test_20_xlsx_provenance` das erste Modul mit **Einzelfall-Fixtures als Living Documentation**. Wenige kuratierte Records (`ANCHOR_RECORDS`-Dict) halten ihre XLSX-Herkunft und erwartete Properties explizit fest. Das macht die Abbildung XLSX-Zelle → JSON-LD im Test selbst nachlesbar.

Wartung:
- Wenn die XLSX umsortiert wird, **bricht der Anker-Test bewusst**. Die Fixture wird manuell auf die neue Zeilennummer nachgezogen — das ist Feature, kein Bug. Die Alternative wäre eine dynamische Zeilensuche, die aber den Kontraktzweck unterlaufen würde.
- Neue Anker werden zurückhaltend gepflegt. Ziel ist die Breite des Modells abzudecken (Finanz-Konvolut, Rezensions-Einzelstück, Musikinstitut-Konvolut) — nicht jede Eigenart.
- `window.m3gim.provenanceOf(recordId)` im Frontend ist das Gegenstück zum Test: beide liefern dieselbe Liste an XLSX-Quellen für einen Record.

## Workflow bei Daten-Updates

1. Tests auf aktuellem Stand grün — Baseline verifizieren
2. Aktuellen `data/output/m3gim.jsonld` als Referenz-Snapshot sichern (z.B. `cp data/output/m3gim.jsonld /tmp/pre-update.jsonld`)
3. Neue XLSX nach `data/google-spreadsheet/` legen (überschreibt vorige Version)
4. Pipeline laufen lassen: `python scripts/transform.py && python scripts/build-views.py`
5. Tests: `pytest -m "not slow"`
6. Snapshot-Diff als Review-Report: `python tests/tools/snapshot_diff.py /tmp/pre-update.jsonld data/output/m3gim.jsonld`
7. Bei allen Tests grün + akzeptablem Diff: `docs/data/` wurde von `build-views.py` bereits aktualisiert — committen.
8. Baselines in `tests/fixtures/baseline_counts.json` ggf. nach oben anpassen, wenn neue Daten deutlich mehr Inhalte bringen.

## Bekannte Ausnahmen

- `test_all_record_ids_unique` — **xfail**. PL_07 Duplikat aus XLSX-Erfassung. Fix: im Google Sheet bereinigen, dann xfail-Marker entfernen.
- `test_has_employer_relations_from_arbeitgeber` — **skip**. Die einzige arbeitgeber-Zeile hat Signatur `UAKUG/NIM_11`, die keinem Record zugeordnet werden kann (verwaist).
- Junk-Namen im Personen-Index (`[Organi]`, kurze Initialen) werden als Warnung geloggt, nicht gefailed — Frontend filtert via `isJunkName`.
- Freitext in Datumsspalte (`"Wien, ab 1956"`, `"1944-05 bis 1944-09"`): `is_iso_date()` lässt sie nicht in typisierte Datumsproperties durch, landen stattdessen in generischem `m3gim:eventDate`.

## Stand

Suite durchgängig grün bis auf die beiden dokumentierten Ausnahmen (`PL_07` xfail, `NIM_11` skip). Die Module `test_19_provenance` (semantische Provenance) und `test_20_xlsx_provenance` (technische XLSX-Quellreferenz) bilden zusammen den **Provenance-Kontrakt** des Projekts.

Laufzeit im Regelbetrieb unter einer Sekunde für `pytest -m "not slow"`, unter einer Minute inkl. Determinismus-Test.

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
- CI-Integration (aktuell keine, siehe [pipeline.md](pipeline.md))

## Frontend-Smoke (Playwright, seit Session 35)

`tests/frontend/smoke.py` fährt die SPA headless (Chromium, lokaler `python -m http.server 8765`) und prüft:

1. **Tab-Durchlauf** für die drei aktiv sichtbaren Tabs (Bestand · Chronik · Indizes) — keine JS-Errors, DOM rendert nicht-leer. Die fünf versteckten Tabs werden nicht angesteuert (E-81).
2. **Anker-Titel im DOM**: `Rezension von Karl Schumann zu Macbeth` (NIM_004/3), `Handschriftliche Notiz` (NIM_007/5_1). Bricht der Check, ist entweder der Record ausgefiltert worden oder die Render-Logik kaputt.
3. **Anker-Record NIM_004_1 voll aufgeklappt**: Sprach-Label aufgelöst (`en, fr` → „Englisch, Französisch") und AgRelOn-Dedup greift (Malaniuk erscheint genau einmal). Diese beiden Canaries sind direkt aus den beiden Silent-Bugs der Session 35 abgeleitet.
4. **Konvolut-Meta-Chips sichtbar**: `.archiv-konvolut-meta .chip--compact` + `.archiv-konvolut-status` zählbar > 0 — Absicherung gegen Regression, die die Meta-Aggregation im Loader leer lässt.
5. **Duplicate `@id` im JSON-LD-Graph**: bekannte Kollisionen (`m3gim:NIM_PL_07`) sind in `KNOWN_COLLISIONS` aufgeführt und werden toleriert; neue Kollisionen fail’n sofort.

Aufruf:

```bash
python -m http.server 8765 --directory docs &
python tests/frontend/smoke.py
# oder via pytest-Wrapper mit Auto-Server:
pytest -m frontend tests/frontend/
```

Der pytest-Wrapper (`tests/frontend/test_smoke.py`, Marker `@pytest.mark.frontend`) startet den Server als Fixture. Standard-`pytest tests/` skippt den Marker per Default, damit Browserless-Environments keinen Playwright-Setup brauchen.
