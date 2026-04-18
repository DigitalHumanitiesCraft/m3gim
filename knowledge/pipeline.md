# Pipeline

> Skriptverantwortung, Datenfluss, ENV-Overrides, Pipeline-Erweiterungen, Qualitaets-Baseline.

## Skriptverantwortung

| Script | Zweck | Input | Output |
|---|---|---|---|
| `scripts/explore.py` | Datenexploration, Strukturdiagnostik | `$M3GIM_SHEETS_DIR` | `$M3GIM_REPORTS_DIR/exploration-report.md` |
| `scripts/validate.py` | Validierung, Qualitaetschecks | `$M3GIM_SHEETS_DIR` | `$M3GIM_REPORTS_DIR/validation-report.md` |
| `scripts/transform.py` | Transformation nach JSON-LD (RiC-O + m3gim + agrelon) | `$M3GIM_SHEETS_DIR` | `$M3GIM_OUTPUT_DIR/m3gim.jsonld` |
| `scripts/build-views.py` | View-spezifische Aggregationen, partitur.json | `$M3GIM_OUTPUT_DIR/m3gim.jsonld` | `$M3GIM_OUTPUT_DIR/views/*.json` |
| `scripts/reconcile.py` | Wikidata-Reconciliation (Fuzzy-Matching, P31-Verifikation, Caching, 3 Confidence-Level) | XLSX-Indizes | `data/output/wikidata-reconciliation.json` |
| `scripts/enrich-wikidata.py` | Wikidata-Property-Enrichment (P106, P412, P569/570, P625, P1191 etc.). Filtert fuzzy_low ohne `manual_review: "approved"` aus (E-74). | wikidata-reconciliation.json | `data/output/wikidata-enrichment.json` |
| `scripts/export-wikidata-csv.py` | Wikidata-CSVs fuer Google-Sheets-Import | wikidata-reconciliation.json | `data/output/wikidata-csvs/*.csv` |
| `scripts/audit-data.py` | Alignment-Pruefung XLSX vs JSON-LD vs Views | XLSX + JSON-LD + Views | Konsolenreport |
| `scripts/report-quality.py` | Datenqualitaets-Snapshot fuer Erschliessungsteam: Verknuepfungsrate, Bearbeitungsstand, WD-Coverage, Provenance-Coverage, Low-Confidence-Freigabeliste | m3gim.jsonld + wikidata-reconciliation.json | `data/reports/quality-snapshot.md` |
| `scripts/verify-manual-approvals.py` | Pflichtlauf nach manuellen Q-ID-Approvals: prueft `match: "manual"`-Eintraege gegen Live-Wikidata-Labels + Typ-Signal; Exitcode 1 bei Mismatch (E-78). Offline-Bypass via `SKIP_VERIFY_MANUAL=1`. | wikidata-reconciliation.json | Konsolenreport, Exitcode |

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
   - `owl:sameAs` + WD-Enrichment-Properties (fuzzy_low nur bei `manual_review: "approved"`, E-74)
   - Skos:Concept-Knoten fuer hierarchische Dokumenttypen (data.md § 12)
   - `m3gim:SpatiotemporalEvent` als Top-Level Graph-Entities (data.md § 10)
   - `agrelon:*`-Relationen fuer Agent-Agent-Beziehungen (data.md § 8)
   - `agrelon:hasProvenance` + `hasConfidenceValue` statt `m3gim:dateEvidence` (data.md § 9)
   - Typisierte Datumsproperties `m3gim:absendedatum` etc. (data.md § 7)
   - `m3gim:DetailAnnotation` mit `monetaryAmount`/`currency`/`detailRole` (data.md § 11)
   - `m3gim:xlsxSource` pro Record + Nested Entity (technische Quellreferenz auf Sheet + Zeile, data.md § 9, E-73)
4. **View-Aggregation** (`build-views.py`) → `$M3GIM_OUTPUT_DIR/views/partitur.json` und matrix/kosmos/sankey
5. **Bereitstellung**: `build-views.py` kopiert im Default-Lauf **`m3gim.jsonld` (primäre Datenquelle)** + die Derivate `partitur.json`, `matrix.json`, `kosmos.json` automatisch nach `docs/data/`.

## Umgesetzte Pipeline-Erweiterungen (Phase 4, Session 28)

| Phase | Änderung in transform.py |
|---|---|
| 4.1 | `normalize_role()` strippt `:in`/`:innen` — Gender-neutrale Rollenbezeichner |
| 4.2 | `DOKUMENTTYP_TO_DFT` hierarchisch erweitert + `build_dft_concepts()` emittiert skos:Concept-Knoten mit skos:broader |
| 4.3 | `EVIDENZ_TO_CONFIDENCE` mapped dateEvidence auf `agrelon:hasConfidenceValue` (1.0/0.8/0.6/0.0), Record-URI als `agrelon:hasProvenance` |
| 4.4 | Komposit `ort, datum` erzeugt zusaetzlich `m3gim:SpatiotemporalEvent`-Instanz mit `atPlace`, `atDate`, `eventRole` |
| 4.6 | `parse_monetary_value()` zerlegt `AMOUNT, CURRENCY`; Finanz-DetailAnnotation haelt `monetaryAmount` (xsd:decimal), `currency`, `detailRole`. `FINANCE_CURRENCY_DEFAULTS` pro Signatur-Präfix greift, wenn die Quelle keine Währung liefert (Session 29 für NIM_007: `S`). |
| 4.7 | `DATUMSROLLE_TO_PROPERTY` mapped Datumsrollen auf typisierte Properties (`m3gim:absendedatum`, `m3gim:auffuehrungsdatum` etc.); `is_iso_date()` filtert Freitext in Fallback `m3gim:eventDate`; `clean_date` normalisiert `YYYY-YYYY` → `YYYY/YYYY` |
| 4.8 | `AGRELON_MAPPING` erzeugt `agrelon:HasEmployeeEmployer`/`HasCorrespondent`/`HasProfessionalContact`/`HasIsPatron`/`HasIsMember` je (typ, rolle); `m3gim:agentRelation`-Array am Record |

Noch offen:
- Phase 4.5: `m3gim:StageRole` als eigenstaendige Entitaet — erfordert neuen Rollenindex-XLSX, mit Team abzustimmen
- Phase 4.9: Reifikation / `m3gim:Statement` — optional, spaet

## Nachzuege (Session 33 + 34)

### Koordinaten-Patch fuer SpatiotemporalEvents (Session 33, E-76)

`scripts/transform.py` injiziert Wikidata-Koordinaten jetzt auch in den `m3gim:atPlace`-Subteil eines `SpatiotemporalEvent`. Vorher hatten nur regulaere `rico:Place`-Entries `geo:lat`/`geo:long`; STE-Orte trugen nur den Namen und blieben auf der Karte unverortet. Zwei minimale Eingriffe: (a) `process_verknuepfungen()` loest den Ortsteil des `ort,datum`-Komposits gegen `indices["ort"]` auf und setzt `wikidata_id`, (b) `add_relations_to_records()` baut den Place-Entry mit gleichem Muster wie im Haupt-Loop und ruft `_inject_enrichment()`. TDD-Abdeckung in `tests/test_22_ste_coordinates.py` (Anker Zuerich Q72, Salzburg Q34713).

### ORTE-Rollen-Hygiene (Session 34)

Bug: Im Komposit `ort,datum` wurde die Rolle (z. B. `erscheinungsdatum`) blind an beide Haelften vererbt — der `rico:Place` trug dadurch eine Datumsrolle, im UI erschien „Stuttgart (erscheinungsdatum)". Fix in `add_relations_to_records()`: wenn die Rolle in `DATUMSROLLE_TO_PROPERTY` liegt, wird `role` am Place-Entry geloescht. Nicht-Datumsrollen (`auffuehrungsort`, `wohnort`, `erscheinungsort`) bleiben. Regression-Test in `tests/test_23_role_hygiene.py`.

### Smart-P17 Claim-Selection (Session 34, E-79)

`enrich-wikidata.py` waehlt fuer Entity-Ref-Properties (P17, P19, P20, P276, P86) jetzt den „aktuellen" Claim via Helper `_pick_current_claim()`: (1) `rank == "preferred"`, (2) Claims ohne `P582`-Qualifier, (3) erster Non-deprecated-Claim. Loest Berlin Q64 → Deutschland (war „Mark Brandenburg" als chronologisch erster Claim). Ebenfalls: Label-Aufloesung laeuft jetzt auch ueber bereits gecachte Entitaeten (vorher blieben Q-IDs aus alten Cache-Laeufen als „Q39"-Strings stehen).

### Manuelle Q-ID-Approvals — Workflow (E-78)

Manuelle Eintraege in `wikidata-reconciliation.json` (Shape siehe E-74) werden vor dem Commit gegen Live-Wikidata geprueft:

```bash
python scripts/verify-manual-approvals.py
```

Das Skript batch-fetcht Labels + Aliases + Descriptions und vergleicht mit dem `name`-Feld. Exitcode 1 bei Mismatch blockiert CI/Commit. Begruendung: Session 34 hatte zwei von zehn Approvals stumm falsch (Q2861 war Rostock statt Bayreuth, Q200491 war ein US-Videospiel-Publisher statt Iwano-Frankiwsk). Siehe auch [CLAUDE.md § Manuelle Wikidata-Approvals verifizieren](../CLAUDE.md).

## Pipeline-seitige Normalisierungen

Strukturelle Transformationen (keine Datenfehler-Kaschierung): Spalten-Lowercase nach `pd.read_excel`, Folio-Spalten-Heuristik, Bearbeitungsstand-Kanonisierung, Gender-Suffix-Strip in Rollen, Q-ID-Regex-Filter, Zeitspannen-Normalisierung `YYYY-YYYY` → `YYYY/YYYY`, `unprocessedIds`-Set im Store. Vollständiger Katalog mit Prinzip-Einordnung (Spec/Workaround/Policy/Dead), Source-Fix-Vorschlägen und Test-Ankern: **[`knowledge/xlsx-fixes.md`](xlsx-fixes.md)**.

## Wikidata-Reconciliation (Session 17, erweitert Session 27)

`reconcile.py` implementiert mit:

- **Fuzzy-Matching**: `thefuzz.token_set_ratio`, 3 Confidence-Level (exact ≥100, fuzzy_high ≥90, fuzzy_low ≥80)
- P31-Verifikation (instance-of-Check gegen erwarteten Typ)
- **Composer-aware Werk-Matching**: Compound-Query "Titel Komponist", P86-Bonus (+5 Score)
- Caching fuer wiederholte Laeufe
- MIN_NAME_LENGTH=3, CLI: `--min-confidence`, `--force`, `--type`
- **Low-Confidence-Policy (E-74):** `fuzzy_low`-Matches werden im Output markiert, aber nur bei `manual_review: "approved"` an Enrichment + transform.py durchgereicht. Der Rest erscheint im Quality-Snapshot zur redaktionellen Freigabe.

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
| `m3gim.jsonld` | JSON-LD | **Alleinige primäre Datenquelle** für das Frontend. Enthält Records + SpatiotemporalEvents + SKOS-Concepts + AgRelOn-Relationen + Finanz-Details + technische Provenance. |
| `partitur.json` / `matrix.json` / `kosmos.json` | JSON | Derivate der entfernten D3-Prototypen. Seit Session 32 von keinem aktiven Tab mehr konsumiert; werden von `build-views.py` weiterhin gebaut (Deferred-Aufräumblock in `status.md` — Entfernung, sobald sicher ist, dass keine künftige Viz sie doch noch braucht). |

## Datenstand

Aktuelle Zahlen zum Bestand, Abdeckung, Verknüpfungsrate und Wikidata-Coverage stehen im **Quality-Snapshot** (`data/reports/quality-snapshot.md`). Der Snapshot wird bei jedem Pipeline-Lauf neu generiert und ist der Single Source of Truth für Zahlen gegenüber dem Erschließungsteam — knowledge-Dokumente halten keine laufenden Zählstände vor, weil die bei jedem Rerun veralten.

Aktuelle Korpus-Struktur qualitativ: Teilnachlass UAKUG/NIM mit drei Bestandsgruppen (Hauptbestand, Plakate, Tonträger), feinerschlossen auf Folio-Ebene sind mehrere Konvolute um NIM_003–007 und NIM_011. Frühere Stände liegen unter `data/_archive/` als Referenz.

## Datenqualität

Baseline und Handlungsbedarfe stehen gebündelt in **[`knowledge/xlsx-fixes.md`](xlsx-fixes.md)** (Workaround-Katalog mit Source-Fix-Vorschlägen) und im laufenden **[`data/reports/quality-snapshot.md`](../data/reports/quality-snapshot.md)** (Verknüpfungsrate, Bearbeitungsstand, Wikidata-Coverage pro Entitätstyp, Provenance-Coverage, Low-Confidence-Freigabeliste). Die Pipeline erzeugt den Snapshot bei jedem Lauf neu — sie ist die Single Source of Truth für Zahlen.

## Modell-Weiterentwicklung

- **Phase 6 (abgeschlossen, Session 30):** `loader.js` hat Store-Maps `dftHierarchy`, `mobilityEvents`, `recordToEvents`, `agentRelations`, `finances` + typisierte Datumsfelder als Fallback in `indexByYear`. Siehe [frontend.md](frontend.md).
- **Phase 7 (abgeschlossen, Sessions 32–34):** Interface-Redesign nach [interface-konzept.md](interface-konzept.md); aktueller Stand der Tab-Sichtbarkeit in [status.md](status.md) (seit Session 35 Fokus auf Bestand · Chronik · Statistik · Indizes, die übrigen Tabs verborgen, E-81).
- **Phase 4.5 (deferred, extern blockiert):** Rollenindex-XLSX anlegen (Spalten `m3gim_id`, `name`, `belongsToWork`, `voiceType`, `wikidata_id`). Braucht Abstimmung mit Erschliessungsteam.
