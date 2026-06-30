---
title: Tests
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.2
created: 2026-02-19
updated: 2026-06-30
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Testing
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/testing
topics: ["[[Test-Driven Development]]", "[[Data Validation]]"]
related: [pipeline, data, decisions]
---

# Tests

> Artefakt-basierte Pipeline-Testsuite. TDD-Workflow für Modell-Erweiterungen, Anker-Record-Strategie für XLSX-Provenance.

## Zweck

Die Test-Suite validiert **den Output der Pipeline**, nicht den Pipeline-Code. Sie gibt bei Daten-Updates und Modell-Erweiterungen ein Sicherheitsnetz: wenn alle Tests grün bleiben, ist der Output strukturell, semantisch und referenziell intakt.

Bei Modell-Erweiterungen fungiert die Testsuite zusätzlich als **TDD-Spec**: die Invarianten aus [data.md](data.md) werden zuerst als `xfail(strict=True)`-Tests formuliert, dann implementiert, und XPASS signalisiert fertige Phase.

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
├── test_11_mobilitaet.py          # SpatiotemporalEvent + Mobilitätssichten
├── test_12_agrelon.py             # AgRelOn-Relationen + Provenance
├── test_13_finanzen.py            # DetailAnnotation, monetaryAmount, currency
├── test_14_parse_units.py         # Unit-Tests für Parse-/Normalisierungsfunktionen
├── test_15_vocab_coverage.py      # XLSX-Vokabular ↔ Output-Vokabular
├── test_16_roundtrip_finance.py   # Jede Finanz-Zeile exakt im Output
├── test_18_typed_dates.py         # Typisierte Datumsproperty-Familie
├── test_19_provenance.py          # Datierungs-Meta-Contract (keine Konfidenz, E-106)
├── test_20_xlsx_provenance.py     # m3gim:xlsxSource + Anker-Records
├── test_22_ste_coordinates.py     # STE.atPlace mit @id + geo:lat/long (Session 33)
├── test_23_role_hygiene.py        # rico:Place trägt keine Datumsrollen (Session 34)
├── test_24_composer_uniqueness.py # Fuzzy-Varianten-Detektor im Werkindex (Session 38)
├── test_25_chronik_mobility_cluster.py  # EVENT_ROLE_TO_MOBILITY_CLUSTER-Spec (Session 36)
├── test_26_term_conformance.py    # Term-Konformitäts-Lock gegen Allowlist (E-103/104/105)
├── test_27_stage_role.py          # m3gim:StageRole wohlgeformt + dedupliziert (E-96)
├── test_28_performance.py         # m3gim:Performance + hasPerformance-Auflösung (E-96/98)
├── test_30_quality_and_dated_events.py  # DatedEvent-Routing + dataQualityFlag + bearbeitungsnotiz (E-102)
├── test_31_dft_vocab.py           # sammlung eigenständig + deutsche skos:prefLabel (E-101)
├── test_32_mobility_events.py     # datumslose Mobilitäts-STE aus Ortsrollen (E-97, additiv, kein atDate, Ort als rico:hasOrHadLocation)
├── test_33_frontend_data_fresh.py # docs/data == data/output (Frontend-Staleness-Guard, E-107)
└── test_34_rawdata_crosscheck.py  # JSON-LD-Wert zellgenau gegen XLSX-Rohzelle über (Sheet, Zeile) (E-108)
```

Die Nummerierung hat historische Lücken (test_17, test_21 wurden nicht vergeben). Das ist bewusst — die Zahlen sind stabile IDs, kein durchgängiger Index.

Leitsatz: jeder Test prüft eine nicht-triviale, nicht-redundante Invariante und kann failen. Soft-Warnings gehören in `validate.py`, nicht in pytest.

## Teststufen

### 1. Schema-Validierung (test_01)
JSON-Schemas (Draft 2020-12) validieren `m3gim.jsonld` und `partitur.json` strukturell. DFT-Hierarchie-Tests: `skos:Concept`-Knoten haben `prefLabel` und optional `broader`, alle Referenzen aus Records sind auflösbar.

### 2. String-Integrität (test_02)
Keine pandas/Excel-Artefakte (`NaT`, `nan`, `None` als Strings), keine Mojibake (`Ã¼`, `Ã¶`), kein Zeitrest (`00:00:00`), ISO-8601-Datumsformate, gestrippte Strings.

### 3. XLSX-Roundtrip (test_03)
Lädt die Rohdaten (`M3GIM-Objekte.xlsx`) direkt mit pandas und verifiziert: jede gültige XLSX-Signatur ist als Record im Graph, Titel stimmen überein, Dokumenttyp-Mapping greift. Parametrisierte Einzelfall-Tests für die Referenzobjekte PL_01, PL_02, PL_04.

### 4. Verknüpfungs-Mapping (test_04)
Jeder Basis-Typ (person, institution, ensemble, ort, werk, ereignis, rolle, datum) hat einen Test, der die korrekte RiC-O-Property prüft. Plus: erwähnte Personen landen in `rico:hasOrHadSubject`, alle Agents haben `name`, Event-Daten im ISO-Format. Zusätzlich: **keine Rolle im Output endet auf `:in`/`:innen`** (Phase 4.1).

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
SpatiotemporalEvent-Existenz, `atPlace` Pflicht; `atDate` nur für datierte STE (datumslose Mobilitäts-STE aus Ortsrollen tragen bewusst kein `atDate`, E-97). Rollen-Vokabular, Anzahl skaliert mit XLSX-Komposit-Rows. Die Mobilitätssichten aus [data.md § 10](data.md) als SPARQL-ähnliche Python-Queries: performative, institutionelle, Korrespondenz-, biographische, diskursive Mobilität.

### 12. AgRelOn (test_12, Phase 4.8)
`agrelon:`-Namespace im Context, HasEmployeeEmployer-Relationen skalieren mit XLSX-arbeitgeber-Zeilen, HasCorrespondent-Relationen haben Provenance, `hasValidityPeriod` ist well-formed (Begin/End als ISO-String).

**Hinweis (E-104).** Die AgRelOn-Termkorrektur ist erledigt: test_12 prüft die korrigierten Terme `agrelon:metadataPeriod`/`metadataProvenance`, und der Term-Validierungs-Test (test_26) lockt die Konformität dauerhaft. Verbliebene Altterme stehen nur noch kosmetisch in der Modul-Docstring von test_12.

### 13. Finanzen (test_13, Phase 4.6)
Jede Finanz-DetailAnnotation hat korrekten `@type`, `detailField`, parsbare `monetaryAmount` (xsd:decimal), Währung im belegten Set (RM/DM/ATS/S/CHF/FRF/Fr/ESC/Esc/USD).

### 14. Parse-Units (test_14)
Unit-Tests für `parse_monetary_value`, `normalize_role`, `normalize_lower`, `decompose_komposit_typ`, `decompose_komposit_value`, `clean_date`, `is_iso_date`. Liefert schnelles Feedback bei Änderungen an den Kern-Helfern ohne Pipeline-Run.

### 15. Vokabular-Coverage (test_15)
Jede in der XLSX belegte Rolle (nach Normalisierung) steht in `data.md § 5`, jeder Dokumenttyp ist im `DOKUMENTTYP_TO_DFT`-Mapping, jede Währung in `ALLOWED_CURRENCIES`. Output-Rollen sind Teilmenge des data.md-Vokabulars.

### 16. Finanz-Roundtrip (test_16, Phase 4.6)
Für jede XLSX-Finanzzeile: der zugehörige Record (über `rico:identifier`) enthält eine DetailAnnotation mit exaktem `monetaryAmount` + `currency` + `detailRole`. Kein Silent-Drop.

### 18. Typisierte Datumsproperties (test_18, Phase 4.7)
Das generische `m3gim:eventDate` ist abgeschafft (E-102): kein Record trägt es mehr, rollenlose/nicht-ISO Datierungen laufen in `m3gim:hasDatedEvent`. Mindestens ein Record nutzt eine typisierte Property; alle Werte sind ISO, TimeSpan oder qualifiziert (`circa:`/`vor:`/`nach:`).

### 19. Datierungs-Meta-Contract (test_19, E-106)
Die `datierungsevidenz` wird nicht serialisiert: kein `m3gim:dateEvidence`, **kein** `agrelon:metadataConfidence` (nirgends im Graph), keine record-seitige Datierungs-Self-Provenance. Die erfundene Dezimalkonfidenz ist entfernt (E-106, löst E-100 ab). Positivkontrolle: die legitime `agrelon:metadataProvenance` auf den AgRelOn-Relationen (`m3gim:agentRelation`) bleibt erhalten. test_29 (Konfidenz-Hygiene) entfiel mit der Konsolidierung.

### 30. Datums-Routing + Datenqualitäts-Flags (test_30, E-102)
DatedEvent-Fallback wohlgeformt (`dateValue`/`dateRole`), kein `m3gim:eventDate` mehr, klammer-/freitext-unsichere Datierungen landen im DatedEvent (nicht in typisierten Properties). Ein DatedEvent dupliziert nie ein STE `atDate`+`eventRole` am selben Record (`ort,datum` wird in *eine* Repräsentation aufgelöst, data.md § 4). `dataQualityFlag`-Werte stammen aus dem kontrollierten Vokabular; `m3gim:qualityConfidence` wird nicht fabriziert; `m3gim:bearbeitungsnotiz` trägt den Freitext-Anhang getrennt vom canonischen Status.

### 31. Dokumentvokabular (test_31, E-101)
`sammlung` ist ein eigenständiges Concept `m3gim-dft:sammlung` ohne `skos:broader` (Records zeigen darauf). Jedes dft-Concept trägt ein lesbares deutsches `skos:prefLabel` (bekannte Konzepte exakt, nicht der Slug). Coverage: kein stiller Typ-Drop bei `hasDocumentaryFormType`. Die neuen Konzepte (briefumschlag/musikzeitschrift/chronik/verzeichnis) sind in `DFT_BROADER`/`DOKUMENTTYP_TO_DFT` strukturell gerüstet. Aboutness-Guard: ein dft-Concept erscheint nie als `rico:hasOrHadSubject`.

### 20. XLSX-Provenance + Anker-Records (test_20)

Prüft `m3gim:xlsxSource` an Records + DetailAnnotations + AgRelOn-Relationen + SpatiotemporalEvents. Zwei Testebenen:



**Strict — kuratierte Anker-Records.** Das Modul pflegt ein Fixture-Dict `ANCHOR_RECORDS` mit Erwartungen pro Anker (`xlsx_row`, `expected_doc_type`, `title_contains`, `min_finance_details`). Jeder Anker läuft durch parametrisierte Tests: existiert der Record, zeigt `xlsxSource` auf die erwartete XLSX-Zeile, tragen Nested Entities (Details, AgRelOn) selbst xlsxSource. Bricht der Test, ist entweder die XLSX umsortiert worden (Fixture pflegen, absichtlich) oder die Pipeline hat eine Regression. Aktuelle Anker: `UAKUG/NIM_007 5_1` (Finanz-Konvolut), `UAKUG/NIM_004 3` (Rezension), `UAKUG/NIM_003 1_8` (Musikinstitut).

**Soft — Coverage-Reports.** Prüft, dass alle Records und nested entities `xlsxSource` tragen, mit Toleranz für einzelne Nachzügler. Die Soft-Variante erlaubt graduellen Ausbau, falls Teilbestände erst später nachgezogen werden. Aktuelle Coverage-Werte stehen in `data/reports/quality-snapshot.md`.

Das Modul ist damit gleichzeitig Kontrakttest und **lesbare XLSX → JSON-LD-Abbildungs-Dokumentation**. Die Anker zeigen konkret: „Zelle 123 in Objekte.xlsx wird zu diesem Record, mit genau diesen Properties".

### 22. SpatiotemporalEvent-Koordinaten (test_22, Session 33)

TDD-Spec für den Koordinaten-Patch: jedes ortsindex-auflösbare `m3gim:SpatiotemporalEvent` trägt im `atPlace`-Subobjekt `@id` (`wd:Qxxx`), `owl:sameAs`, `geo:lat`, `geo:long` und — falls Wikidata P17 das liefert — `m3gim:country`. Anker: `ste_NIM_004_24_7` (Zürich Q72), `ste_NIM_004_24_10` (Salzburg Q34713). Soft-Coverage über die STE mit Koordinaten, Werte im Quality-Snapshot.

### 23. Rollen-Hygiene an Orten (test_23, Session 34)

Regression-Test für einen Pipeline-Bug: im Komposit `ort,datum` der Verknüpfungstabelle wurde die Rolle (z. B. `erscheinungsdatum`) blind an beide Hälften vererbt — der `rico:Place`-Eintrag trug dadurch eine Datumsrolle, die im UI als „Stuttgart (erscheinungsdatum)" erschien. Der Test prüft: kein `rico:Place` an einem Record trägt eine Rolle aus `DATUMSROLLE_TO_PROPERTY`. Anker: NIM_004_12 (Stuttgart).

### 24. Komponisten-Unikat-Check im Werkindex (test_24, Session 38)

Fuzzy-Detektor (Levenshtein-Ratio ≥ 92) über alle Komponistennamen in `m3gim:MusicalWork`-Subjects. Findet Schreibweise-Varianten desselben Komponisten („Beethoven, Ludwig van/von"), die durch Tippfehler im Werkindex-XLSX entstehen. `strict-xfail` bis zum Source-Fix durch das Archivteam — nach Fix wird XPASS und bricht die Suite, damit der Marker entfernt wird. Bewusst **kein** `normalize_composer()` in der Pipeline (siehe [data.md § Datenqualität](data.md)): das wäre ein Sonderfall-Workaround, der künftige Tippfehler still kaschiert.

### 25. Chronik-Mobilitätscluster (test_25, Session 36)

Lock für die `EVENT_ROLE_TO_MOBILITY_CLUSTER`-Mapping-Tabelle im Frontend (`docs/js/data/constants.js`). Prüft, dass jede `m3gim:eventRole`, die im JSON-LD vorkommt, entweder einer der Sichten (`performativ`/`institutionell`/`korrespondenz`/`diskursiv`/`biografisch`) zugeordnet ist oder explizit auf `null` steht (bewusste Nicht-Einordnung wie `auftrag`, `entstehung`, `ueberweisung`). Fängt stille Mapping-Drift ein, wenn neue Rollen eingeführt werden, ohne die Cluster-Zuordnung mitzuziehen.

### 26. Term-Validierung gegen RiC-O 1.1 und AgRelOn (test_26)

Konformitäts-Lock aus dem Modellierungs-Audit ([decisions.md](decisions.md) E-103/E-104). Sammelt jeden im Output verwendeten `rico:`- und `agrelon:`-Term (als `@type` und als Property-Key) und prüft ihn gegen eine im Repo hinterlegte Allowlist der offiziellen Termlisten — RiC-O 1.1 aus den ICA-EGAD-CSV-Komponentenlisten, AgRelOn aus der DNB-RDF. Ein nicht gelisteter Term failt hart. Deckt die bekannten Fehlterme (`rico:isAssociatedWithRecord`, `rico:File`/`rico:Fonds` als Klasse, `agrelon:hasProvenance`/`hasConfidenceValue`/`hasValidityPeriod`, `agrelon:HasIsPatron`) sofort als rot auf und sichert dauerhaft gegen Regression — die Fehlerklasse „Term aus der Benennungskonvention extrapoliert" ([Leitplanke „Fremdterme verifizieren"](decisions.md)) wird damit maschinell unmöglich.

Der Test lockt die Term-Konformität gegen die Allowlist dauerhaft und verifiziert die mit der Konformitäts-Korrektur nachgezogenen Module test_12/test_19. Ein leichtgewichtiger Vorläufer der weiter unten genannten SHACL-Validierung — er prüft Term-Existenz, nicht Shape-Konformität.

### 27. StageRole-Entität (test_27, E-96)

Sichert, dass `m3gim:hasPerformanceRole` vollständig abgelöst ist (kein Record trägt es mehr), dass `m3gim:StageRole`-Entitäten existieren, eine ASCII-Slug-`@id` (`^m3gim:role_[a-z0-9_]+$`) und `rico:name` tragen, und dass ihre `@id`s eindeutig sind (Dedup-Registry). ASCII-Slug ist Pflicht, weil das JSON-LD-@id-Pattern keine Umlaute matcht.

### 28. Performance-Reifikation (test_28, E-96/E-98)

`m3gim:Performance`-Entitäten existieren, jede record-seitige `m3gim:hasPerformance`-Referenz ist im Graph auflösbar, und `m3gim:performanceOf` zeigt stets auf ein `m3gim:MusicalWork` mit `name` (nie literale Q-ID). Die `hasPerformer`/`performanceOf`-Pfade sind datenadaptiv zulässig leer, solange der April-Stand keine `rolle,person`/`datum,werk`-Komposite enthält — sie aktivieren sich mit dem tieferen Box-Export. Begleitend migriert: test_04 (rolle → Performance statt hasPerformanceRole), test_09/test_15 (Relations-Zählung auf `hasPerformance`), die JS-Fixtures `record-partition`/`utils`.

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

Bei neuen Features aus [data.md](data.md):

1. **Invariante formulieren**: welcher neue Output soll entstehen?
2. **Test schreiben** mit `@pytest.mark.xfail(reason="Phase X nicht implementiert", strict=True)`. Mit `strict=True` failt die Suite, sobald der Test grün wird — das signalisiert, dass xfail-Marker entfernt werden muss.
3. **Mindestvorkommen** in Test verankern (nicht „leer ist ok"), damit der Test nicht trivial durchgeht.
4. **Implementieren** in `scripts/transform.py`, bis xfail → XPASS → xfail-Marker entfernt.
5. **Bei Datenadaptivität**: Tests datenadaptiv formulieren (skalieren mit XLSX-Count) statt hartcodierter Zahlen, damit neue Datenstände ohne Testkorrektur laufen.

Dieses Muster wurde in Phase 4.1–4.8 (Session 28) erfolgreich angewendet, ebenso beim Koordinaten-Patch (Session 33, test_22) und beim ORTE-Rollen-Fix (Session 34, test_23). Siehe [plan.md](plan.md) und [pipeline.md](pipeline.md).

### Drei Testmodi und die Durchreich-Policy

Die TDD-Spec unterscheidet drei Modi, die entscheiden, was „der Output ist intakt" bedeutet.

- **hart** — strukturelle Invariante, muss grün sein. Fängt Absturz und stillen Datenverlust (etwa die Loader-Blocker, E-95) sowie referenzielle, Namespace- und Q-ID-Garantien. Scharf gegen den bisherigen Stand und gegen den neuen Export.
- **xfail (strict)** — rot erwartet; sobald das Feature implementiert ist, schlägt der Test um, bricht die Suite und signalisiert, dass der Marker zu entfernen ist. Für noch nicht implementierte Modell-Features und für Source-Fix-Signale wie test_24.
- **report** — failt nie; gibt den Befund ohne Seiteneffekt aus und mutiert nicht den getrackten Quality-Snapshot (den pflegt allein `report-quality.py`). Für inhaltliche Datenfehler, die per Durchreich-Policy das Archivteam an der Quelle korrigiert, nicht die Pipeline.

Die Trennlinie folgt der Durchreich-Policy: ein **struktureller** Blocker gehört in einen harten oder xfail-Test, die Pipeline muss ihn lösen; ein **inhaltlicher** Datenfehler gehört in einen Report oder ein Source-Fix-Signal und wird nie still korrigiert.

### Autoren-Regeln

- Untergrenzen zur Laufzeit aus der Quelle ableiten, nicht als feste Zahl an die Größe des neuen Exports binden — sonst werden harte Tests gegen den bisherigen Stand rot.
- Vorbedingungen, die nur für den neuen Export gelten, sind ein Skip, kein Assert.
- Ein noch nicht implementiertes Feature ist xfail, nicht hart.
- Manche Invarianten sind ohne einen Pipeline-Herkunftsmarker (`m3gim:derivedFromRole`) gar nicht aus dem Graph berechenbar — der Marker muss dann Teil des Features sein.
- Der Frontend-Vokabular-Parser in den Kopplungstests muss Kommentare strippen, sonst zählt er auskommentierte Einträge als gemappt.
- Die Datierungs-Konfidenz ist ganz entfernt (E-106); `agrelon:metadataConfidence` taucht nirgends im Graph auf.
- Jeder xfail-Grund zeigt auf den `data.md`-Anker, der zuerst existieren muss.

### Wellen für den neuen Datenstand

Die Modell-Umsetzung (E-95 bis E-102) wird in einer ersten und einer zweiten Welle abgesichert. Eine modellunabhängige erste Welle ist sofort schreibbar — das strukturelle Regressionsnetz (Loader-Blocker, referenzielle Integrität, Q-ID-Hygiene, Währungs-Typ-Erhalt, Determinismus, Promote-Gate, Approval-Provenienz), grün gegen den bisherigen Stand, rot an den Blockern gegen den neuen Export. Die zweite Welle ist die Modell-Spec als rote xfail-Tests und setzt die in [data.md](data.md) verankerten Entscheidungen voraus. Neue eventRoles und Rollen brechen die bestehenden Vokabular-Tests (test_15, test_25), sobald die Suite gegen den neuen Export läuft; sie brauchen einen koordinierten xfail-Carve-out, sonst ist die Suite zu keinem Zeitpunkt grün.

### Anker-Record-Strategie (seit Session 31)

Ergänzend zum aggregat-orientierten TDD ist `test_20_xlsx_provenance` das erste Modul mit **Einzelfall-Fixtures als Living Documentation**. Wenige kuratierte Records (`ANCHOR_RECORDS`-Dict) halten ihre XLSX-Herkunft und erwartete Properties explizit fest. Das macht die Abbildung XLSX-Zelle → JSON-LD im Test selbst nachlesbar.

Wartung:
- Wenn die XLSX umsortiert wird, **bricht der Anker-Test bewusst**. Die Fixture wird manuell auf die neue Zeilennummer nachgezogen — das ist Feature, kein Bug. Die Alternative wäre eine dynamische Zeilensuche, die aber den Kontraktzweck unterlaufen würde.
- Neue Anker werden zurückhaltend gepflegt. Ziel ist die Breite des Modells abzudecken (Finanz-Konvolut, Rezensions-Einzelstück, Musikinstitut-Konvolut) — nicht jede Eigenart.
- `window.m3gim.provenanceOf(recordId)` im Frontend ist das Gegenstück zum Test: beide liefern dieselbe Liste an XLSX-Quellen für einen Record.

## Workflow bei Daten-Updates

1. Tests auf aktuellem Stand grün — Baseline verifizieren
2. Aktuellen `data/output/m3gim.jsonld` als Referenz-Snapshot sichern (z.B. `cp data/output/m3gim.jsonld data/_archive/pre-update.jsonld`)
3. Neue XLSX nach `data/google-spreadsheet/` legen (überschreibt vorige Version)
4. Pipeline laufen lassen: `python scripts/transform.py && python scripts/build-views.py`
5. Tests: `pytest -m "not slow"`
6. Snapshot-Diff als Review-Report: `python tests/tools/snapshot_diff.py data/_archive/pre-update.jsonld data/output/m3gim.jsonld`
7. Bei allen Tests grün + akzeptablem Diff: `docs/data/` wurde von `build-views.py` bereits aktualisiert — committen.
8. Baselines in `tests/fixtures/baseline_counts.json` ggf. nach oben anpassen, wenn neue Daten deutlich mehr Inhalte bringen.

## Bekannte Ausnahmen

- `test_all_record_ids_unique` — **xfail**. PL_07 Duplikat aus XLSX-Erfassung. Fix: im Google Sheet bereinigen, dann xfail-Marker entfernen.
- `test_has_employer_relations_from_arbeitgeber` — **skip**. Die einzige arbeitgeber-Zeile hat Signatur `UAKUG/NIM_11`, die keinem Record zugeordnet werden kann (verwaist).
- Junk-Namen im Personen-Index (`[Organi]`, kurze Initialen) werden als Warnung geloggt, nicht gefailed — Frontend filtert via `isJunkName`.
- Freitext in Datumsspalte (`"Wien, ab 1956"`, `"1944-05 bis 1944-09"`): `is_iso_date()` lässt sie nicht in typisierte Datumsproperties durch, landen stattdessen im Fallback `m3gim:hasDatedEvent` (inline DatedEvent mit `dateValue`/`dateRole`, E-102). Das generische `m3gim:eventDate` ist abgeschafft (test_18 assertet `generic_count == 0`).

## Stand

Suite durchgängig grün bis auf die beiden dokumentierten Ausnahmen (`PL_07` xfail, `NIM_11` skip). Die Module `test_19_provenance` (semantische Provenance) und `test_20_xlsx_provenance` (technische XLSX-Quellreferenz) bilden zusammen den **Provenance-Kontrakt** des Projekts.

Laufzeit im Regelbetrieb überschaubar; der Determinismus-Test (Marker `slow`) dominiert die Gesamtdauer und ist aus der Standard-Suite ausgeschlossen.

## Dependencies

`requirements-test.txt` bindet die Laufzeit-Abhängigkeiten über `-r requirements.txt` ein (die Suite braucht pandas und thefuzz) und ergänzt:
- `pytest>=7.0`
- `jsonschema>=4.0` (Schema-Validierung)

`snapshot_diff.py` ist eigenständig implementiert und braucht keine externe Diff-Bibliothek. Produktions-`requirements.txt` bleibt unberührt (pandas, openpyxl, thefuzz).

## Abgrenzungen

**Was nicht getestet wird** (bewusst):
- Pipeline-Internas (private Funktionen) — außer die in test_14 als Unit-Tests
- Google-Sheets-Content selbst — Datenqualität ist redaktionelle Aufgabe (`explore.py`/`validate.py`)
- Frontend-JavaScript — Browser-Validierung, nicht pytest
- Performance — Pipeline-Laufzeit unkritisch

**Was später dazukommen kann**:
- SHACL-Validierung gegen RiC-O-Shapes (`pyshacl`) — semantisch schärfer als JSON-Schema
- CI-Integration (aktuell keine, siehe [pipeline.md](pipeline.md))

## Frontend-Smoke (Playwright, seit Session 35)

`tests/frontend/smoke.py` fährt die SPA headless (Chromium, lokaler `python -m http.server 8765`) und prüft:

1. **Tab-Durchlauf** über alle sichtbaren Tabs = der reale `VISIBLE_TABS`-Satz (`bestand`, `chronik`, `statistik`, `indizes`, `mobilitaet`, `netzwerk`, `korb`) — keine JS-Errors, DOM rendert nicht-leer. Der seit E-109/E-111 sichtbare Mobilitäts-Tab (D3-geo-Karte) und der Korb sind seit E-113 im Loop; der Mobilitäts-Tab trägt zusätzlich einen eigenen Karten-Canary (Punkt 8). Versteckte Perspektiv-Tabs (Mobilitäts-Atlas, Repertoire, Biogramm) werden bewusst nicht angesteuert (E-81).
2. **logStamp-Keys pro Tab** (State-Stempel): `bestand` → `konvolute, records, sort`; `chronik` → `records, jahre-belegt, undatiert, spanne` (Scroll-Zeitstrahl, E-88); `statistik` → `records, konvolute, events, personen, sektionen`; `indizes` → `personen, organisationen, orte, werke`; `mobilitaet` → `events, verortet, unverortet, datiert, jahre`; `netzwerk` → `total, ring1, ring2, agrelon` (konzentrische Personen-Viz, E-93); `korb` → `eintraege, aufgeloest, events, finanzen`.
3. **Chronik-Zeitstrahl-Canary** (seit Session 44, E-91): `#tab-chronik .chronik-year` deckt die Lebensspanne 1919–2009 als durchgehende Jahres-Zeilen ab, leere Jahre sichtbar aber ohne Records-in-leer. Klick auf `chronik-point` dispatcht `selectRecord` und springt in Bestand mit offenem Inline-Detail; fehlerfrei in der Konsole.
4. **Anker-Titel im DOM**: `Rezension von Karl Schumann zu Macbeth` (NIM_004/3), `Handschriftliche Notiz` (NIM_007/5_1). Bricht der Check, ist entweder der Record ausgefiltert worden oder die Render-Logik kaputt.
5. **Anker-Record NIM_004_1 voll aufgeklappt**: Sprach-Label aufgelöst (`en, fr` → „Englisch, Französisch") und AgRelOn-Dedup greift (Malaniuk erscheint genau einmal).
6. **Konvolut-Meta-Chips sichtbar**: `.archiv-konvolut-meta .chip--compact` + `.archiv-konvolut-status` zählbar > 0 — Absicherung gegen Regression, die die Meta-Aggregation im Loader leer lässt.
7. **Duplicate `@id` im JSON-LD-Graph**: bekannte Kollisionen (`m3gim:NIM_PL_07`) sind in `KNOWN_COLLISIONS` aufgeführt und werden toleriert; neue Kollisionen fail'n sofort.
8. **Karten-Canary** (E-113, neu gefasst mit E-126): nach dem Klick auf den Karten-Tab wartet der Check auf den asynchronen Geometrie-Load (`loadCountries().then(...)`) und prüft, dass die entitätszentrierte D3-geo-Karte real zeichnet — Stadt-Knoten (`.mob-nodes g.mob-node` vorhanden), **keine** Verbindungslinien (`.mob-arcs path` == 0, da die Trajektorie mit E-126 entfiel), eine befüllte Entitäts-Auswahl (`.mob-entity__list .mob-entity__item` vorhanden) und Ländergeometrie (`.mob-land path` vorhanden), ohne neue Konsolenfehler. Zusätzlich wählt der Canary „Bayreuther Festspiele" und verifiziert, dass die Knotenmenge auf deren Orte schrumpft. Harter FAIL, nicht WARN: eine still leer rendernde Karte (fehlende Geometrie, d3-Ausfall, Projektions-Bug) ist genau die Regression, die der logStamp-Check verfehlt, weil der Stempel synchron vor dem Async-Draw geschrieben wird.

Aufruf:

```bash
python -m http.server 8765 --directory docs &
python tests/frontend/smoke.py
# oder via pytest-Wrapper mit Auto-Server:
pytest -m frontend tests/frontend/
```

Der pytest-Wrapper (`tests/frontend/test_smoke.py`, Marker `@pytest.mark.frontend`) startet den Server als Fixture. Standard-`pytest tests/` skippt den Marker per Default, damit Browserless-Environments keinen Playwright-Setup brauchen.

## JS-Unit-Tests (Node, seit Session 47)

Die JS-Unit-Tests decken die dom-/d3-freien Pure-Functions des Frontends ab, über vier Dateien:

- `tests/frontend/network-geometry.test.mjs` für die Geometrie aus [`_network-geometry.js`](../docs/js/views/_network-geometry.js) (E-94): `classifyRing`, `isMalaniuk`, `isPureComposer`, `derivePersonKategorie`, `nodeEvidence`, `nodeColor`, `computeLayout` (Determinismus-Property, alphabetische Winkel-Reihenfolge, Umlaut-Normalisierung im SortKey, Radius-Cap), `computeCoOccurrence` (Malaniuk- und Komponisten-Filter, minShared-Threshold, maxEdges-Cap, Tie-breaker-Determinismus) und `labelGeometry`.
- `tests/frontend/utils.test.mjs` für `date-parser` und `format`.
- `tests/frontend/record-partition.test.mjs` für `partitionRecord`, also den Korb- und Inline-Detail-Pfad.
- `tests/frontend/loader.test.mjs` für die Strecke JSON-LD → `loadArchive()` → store (synthetische Fixture + Anker gegen `docs/data`; deckt u.a. die E-97-Datumslosigkeit und die DFT-prefLabel-Auflösung). Anders als die übrigen Module ist dies eine Integrationsstrecke, keine reine Pure-Function.

Lauf:

```bash
node --test tests/frontend/*.test.mjs
```

Kein npm install, keine build-tools — nutzt `node:test` + `node:assert/strict` builtin (Node 18+). Enabler: `docs/js/package.json` mit `{"type":"module"}` markiert den Baum als ES-Modul fuer Node-seitiges Loading. Browser ignorieren die Dateien.

Weitere JS-Views werden *nicht* aehnlich getestet, solange sie DOM- und D3-Aufrufe direkt in der Rendering-Pipeline mischen — der Aufwand waere groesser als der Wert. Getestet wird, was sich sauber von der DOM-Schicht trennen laesst.
