---
title: Tests
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.5
created: 2026-02-19
updated: 2026-09-03
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
related: [architecture, data, journal]
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
├── fixtures/
│   ├── baseline_counts.json       # Regression-Mindestwerte
│   └── rico_agrelon_allowlist.json # verifizierte externe Terme mit Quellenangabe
├── tools/
│   └── snapshot_diff.py           # CLI: diff zwei m3gim.jsonld-Versionen
├── test_01_schema.py              # JSON-Schema + DFT-Hierarchie
├── test_02_strings.py             # Umlaute, Whitespace, Datumsformate
├── test_03_roundtrip.py           # XLSX-Rohdaten ↔ JSON-LD
├── test_04_verknuepfungen.py      # Verknüpfungs-Typ-Mapping + Gender-neutrale Rollen
├── test_05_referential.py         # Referentielle Integrität, @id-Eindeutigkeit
├── test_06_frontend_contract.py   # loader.js-Store-Shape-Annahmen
├── test_07_wikidata.py            # WD-Enrichment-Integrität
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
├── test_34_rawdata_crosscheck.py  # JSON-LD-Wert zellgenau gegen XLSX-Rohzelle über (Sheet, Zeile) (E-108)
├── test_35_ste_id_stability.py    # inhaltsbasiertes STE-@id-Schema (E-115)
├── test_36_index_completeness.py  # kuratierte Index-Spalten erreichen das JSON-LD (M1)
├── test_37_dropdown_export.py     # Komposit-Trenner "_" + Sheet-Filter nach dem Dropdown-Umbau
├── test_38_modelling_rules.py     # bestätigte Modellierungsregeln (E-129 bis E-132)
├── test_38_ste_deterministic_ids.py  # Unit-Lock für _ste_id, Reihenfolge-Unabhängigkeit (E-115)
├── test_39_date_validity.py       # kalendarische Gültigkeit der Datumswerte (AF-04)
├── test_40_vocab_gate.py          # check-coverage.py als verbindliches Gate
├── test_41_naming_convention.py   # Namenskonvention des Vokabulars (Klassen groß, Rest klein)
├── test_42_performance_role_migration.py  # E-96-Nachzug in build-views.py und audit-data.py
├── test_43_reconciliation_logic.py   # Unit-Tests der Reconciliation-Logik, offline
├── test_44_approval_signals.py    # Signalvokabular der Approval-Prüfung
├── test_45_knowledge_integrity.py # E-/AF-/QF-Zitate und relative Links der Wissensbasis
├── test_46_vocab_vacancy.py       # Gegenrichtung, kein deklarierter Term ohne Belegung
├── test_47_vocab_reader.py        # enger Turtle-Leser der Pipeline gegen rdflib
├── test_48_model_page.py          # docs/datenmodell.html ist die Ausgabe des Generators
├── test_49_correspondence_author.py # Absenderseite eines Briefes im Beziehungsnetz
├── test_49_footer.py              # der Fuß aller Seiten gegen die Vorlage des Generators (E-209)
├── test_50_link_proposals.py      # Verknuepfungsvorschlaege aus Titeln, Wortgrenzen
├── test_51_agrelon_roles.py       # Rollenstellen einer AgRelOn-Relation
├── test_51_html_hygiene.py        # Struktur, Ids, Überschriftenfolge und Meta-Sets aller Seiten
├── test_52_dating_scope_and_rank.py # Bezugsebene und Rang stehen im Vokabular
├── test_60_csv_source.py          # CSV-Lesepfad und Formatprüfung der Verknüpfungen (E-152)
├── test_61_orphan_links.py        # Datenspiegel: Quellzeilen, die den Datensatz nicht erreichen
├── test_62_value_list_contract.py # Datenspiegel: Erfassung gegen Typ-Rolle.csv
├── test_63_unresolved_aggregate.py # unaufgelöste Sammeleinheit steht im Datensatz, nicht im Frontend
├── test_64_pipeline_guards.py     # Verwurf-Aufstellung und Wikidata-Guard von transform.py
└── test_65_stage_role_duplicates.py # eine Partie je Dokument, einmal und mit Interpret:in (E-205)
```

Die Nummerierung hat historische Lücken (test_17, test_21 und die Fünfziger ab test_53 wurden nicht vergeben). Das ist bewusst, die Zahlen sind stabile IDs und kein durchgängiger Index. Doppelt vergeben sind die 38 und die 49, `test_38_modelling_rules` und `test_38_ste_deterministic_ids` teilen die eine, `test_49_correspondence_author` und `test_49_footer` die andere; der Dateiname unterscheidet die Module, die Nummer allein reicht als Verweis nicht.

Leitsatz: jeder Test prüft eine nicht-triviale, nicht-redundante Invariante und kann failen. Soft-Warnings gehören in `validate.py`, nicht in pytest.

## Teststufen

### 1. Schema-Validierung (test_01)
Ein JSON-Schema (Draft 2020-12) validiert `m3gim.jsonld` strukturell. Die Wohlgeformtheit und Auflösbarkeit der Dokumenttyp-Hierarchie stand hier ein zweites Mal und liegt seit dem 2026-08-31 allein in test_06. Dessen Fassung ist die schärfere, weil sie eine Mindestzahl an Concepts fordert, ein `skos:broader` auch dann beanstandet, wenn es kein Objekt ist, und die Record-Referenzen ohne Präfixfilter prüft.

### 2. String-Integrität (test_02)
Keine pandas/Excel-Artefakte (`NaT`, `nan`, `None` als Strings), keine Mojibake (`Ã¼`, `Ã¶`), kein Zeitrest (`00:00:00`), ISO-8601-Datumsformate, gestrippte Strings.

### 3. XLSX-Roundtrip (test_03)
Lädt die Rohdaten (`M3GIM-Objekte.xlsx`) direkt mit pandas und verifiziert: jede gültige XLSX-Signatur ist als Record im Graph, Titel stimmen überein, Dokumenttyp-Mapping greift. Parametrisierte Einzelfall-Tests für die Referenzobjekte PL_01, PL_02, PL_04.

### 4. Verknüpfungs-Mapping (test_04)
Ein parametrisierter Test führt die vier mengenstarken Basis-Typen (person, institution, ort, werk) auf die Property und den `@type`, die sie im Output erzeugen. Seine Untergrenze bildet sich zur Laufzeit aus der Zeilenzahl der Quelle und liegt bei sechzig Prozent, sodass auch ein Teilverlust auffällt. Die Vorgängerfassung prüfte je Typ nur Nichtleere und fing allein den vollständigen Ausfall eines Zweigs (geschärft am 2026-08-31). Weiter geprüft werden die Umsortierung erwähnter Personen nach `rico:hasOrHadSubject`, der `name` an jedem Agent, die Auflösbarkeit der `hasPerformance`-Referenz samt ihrer StageRole und die Regel, dass keine Rolle im Output auf `:in` oder `:innen` endet (Phase 4.1).

### 5. Referentielle Integrität (test_05)
Fonds existiert genau einmal, `hasOrHadPart`-Referenzen sind alle im Graph auflösbar, keine Waisen-Records, alle `@id` eindeutig. Das PL_07-Quellduplikat (Partner-Übergabeliste) kompensiert die Pipeline auf einen Record; `test_all_record_ids_unique` läuft ohne Marker und wacht über Regressionen. Dazu die Konvolut-Hierarchie: ein Record, dessen `rico:identifier` eine Folio-Angabe führt, hängt als `rico:hasOrHadPart` an genau dem Konvolut mit der bloßen Signatur. Diese Prüfung stand bis zum 2026-08-31 als toter Rumpf in der Datei, weil ihre @id-Regex auch Konvolut-Kennungen traf und der Befundzweig mit `pass` endete.

### 6. Frontend-Kontrakt (test_06)
Implizite Annahmen aus `loader.js` (`aggregator.js` wurde Session 32 entfernt):
- `rico:hasOrHadPart` nie als String (ensureArray-kompatibel)
- Keine Date-like Strings in Locations
- Wikidata-IDs matchen `^wd:Q\d+$`
- `owl:sameAs` konsistent zur `@id`
- Max. 1 `_Folio`-Kind pro Konvolut

### 7. Wikidata-Integrität (test_07)
Jede Q-ID im Output hat eine benannte Herkunft, entweder einen Treffer in `wikidata-reconciliation.json` oder eine kuratierte `wikidata_id`-Zelle einer Index-Arbeitsmappe, gelesen über den kanonischen Pipeline-Reader `load_index`. Eine Q-ID ohne beides ist erfunden und failt. Bis zum 2026-08-31 prüfte der Test nur, dass die Schnittmenge nicht leer ist, womit genau die Fehlerklasse durchfiel, die in Session 34 tragende Datenfehler erzeugt hat. Daneben stehen die Typprüfungen: Enrichment-Werte sind korrekt getypt (`geo:lat/long` Float mit Range, `schema:birthDate` ISO), `m3gim-ontology:voiceType` String (nicht Liste), `gndo:professionOrOccupationAsLiteral` Liste von Strings.

### 9. Regression-Baselines (test_09)
Mindestwerte aus `fixtures/baseline_counts.json` je Entitätstyp (records, konvolute, persons, organizations, locations, works, verknuepfungen, wd_matches). Alle Prüfungen vergleichen mit `>=`, sodass Wachstum erlaubt und Schrumpfung verboten ist.

Die Projektleitung hat am 2026-08-31 entschieden, dass die Mindestwerte nach jedem Datenupdate auf etwa neunzig Prozent des dann erreichten Ist nachgezogen werden. Der Puffer von zehn Prozent trägt die normale Schwankung eines neuen Exports, ein Verlust darüber hinaus schlägt an. Ohne das Nachziehen wachsen die Ist-Werte lautlos von den Mindestwerten weg, und die Schrumpfungssperre fängt selbst den Verlust der Hälfte eines Bestands nicht mehr. Der Handgriff gehört in Schritt 8 des Workflows bei Daten-Updates. Der Test bleibt dabei unverändert, die Fixture trägt die Aussage.

### 10. Determinismus (test_10, slow)
Lässt `transform.py` zweimal laufen, vergleicht Output (ohne `m3gim-ontology:exportDate`). Fängt versehentliche Set-Iteration / Dict-Ordnungsabhängigkeiten. Der Marker `slow` schließt ihn aus dem Lauf `pytest -m "not slow"` aus, im unmarkierten `pytest tests/` läuft er mit. Welche Felder ein Rerun zulässig verändert, steht in [architecture.md](architecture.md) § Reproduzierbarkeit.

### 11. Mobilität (test_11, Phase 4.4 + 4.8)
SpatiotemporalEvent-Existenz, `atPlace` Pflicht; `atDate` nur für datierte STE (datumslose Mobilitäts-STE aus Ortsrollen tragen bewusst kein `atDate`, E-97). Rollen-Vokabular, Anzahl skaliert mit XLSX-Komposit-Rows. Die Existenz der Verortungen und ihre Ausbeute gegen die Quelle standen als zwei zeichengleiche Tests nebeneinander und sind am 2026-08-31 in `test_every_ort_datum_row_produces_event` zusammengeführt, das den absoluten Boden `max(5, ...)` mitübernommen hat. Die Mobilitätssichten aus [data-model.md § Mobilitätsmodell](data-model.md) als SPARQL-ähnliche Python-Queries: performative, institutionelle, Korrespondenz-, biographische, diskursive Mobilität.

### 12. AgRelOn (test_12, Phase 4.8)
`agrelon:`-Namespace im Context, HasEmployeeEmployer-Relationen skalieren mit XLSX-arbeitgeber-Zeilen, HasCorrespondent-Relationen haben Provenance, `agrelon:metadataPeriod` ist well-formed (Begin/End als ISO-String).

Zwei der vier Tests konnten leerlaufen, sobald die Quelle keine matchbare arbeitgeber-Zeile führt oder keine Relation einen Zeitraum trägt; sie blieben dann grün ohne ausgeführten Assert. Seit dem 2026-08-31 überspringen sie sich in diesem Fall sichtbar und nennen die fehlende Vorbedingung. Am Datenstand vom 2026-08-31 haben beide einen Gegenstand und laufen als reguläre Tests.

**Hinweis (E-104).** Die AgRelOn-Termkorrektur ist erledigt: test_12 prüft die korrigierten Terme `agrelon:metadataPeriod`/`metadataProvenance`, und der Term-Validierungs-Test (test_26) lockt die Konformität dauerhaft. Verbliebene Altterme stehen nur noch kosmetisch in der Modul-Docstring von test_12.

### 13. Finanzen (test_13, Phase 4.6)
Jede Finanz-DetailAnnotation hat korrekten `@type`, `detailField`, parsbare `monetaryAmount` (xsd:decimal), Währung im belegten Set (RM/DM/ATS/S/CHF/FRF/Fr/ESC/Esc/USD).

### 14. Parse-Units (test_14)
Unit-Tests für `parse_monetary_value`, `normalize_role`, `normalize_lower`, `decompose_komposit_typ`, `decompose_komposit_value`, `clean_date`, `is_iso_date`. Liefert schnelles Feedback bei Änderungen an den Kern-Helfern ohne Pipeline-Run.

### 15. Vokabular-Coverage (test_15)
Jede in der XLSX belegte Rolle (nach Normalisierung) steht in `data.md § Rollenvokabular`, jeder Dokumenttyp ist im `DOKUMENTTYP_TO_DFT`-Mapping, jede Währung in `ALLOWED_CURRENCIES`. Output-Rollen sind Teilmenge des data.md-Vokabulars.

### 16. Finanz-Roundtrip (test_16, Phase 4.6)
Zu jeder Finanzzeile der Quelle enthält der über `rico:identifier` zugeordnete Record eine DetailAnnotation mit exaktem `monetaryAmount`, `currency` und `detailRole`, sodass keine Zeile still verlorengehen kann. Der Grundtyp einer Zeile wird an Komma und Unterstrich gleichermaßen abgetrennt, weil der Dropdown-Export den Komposittyp als `einnahmen_währung` liefert (test_37). Ohne den Unterstrich als Trenner meldete der Test jede Finanzzeile des neuen Exports als fehlend.

### 18. Datierung am Annotationsknoten (test_18, Phase 4.7)
Der Test heisst nach der Phase, die er sicherte, und sichert seit E-136 ihr Gegenteil. Die sechzehn typisierten Datumsproperties sind entfallen; jede Datierung haengt an einem `m3gim-ontology:Annotation`-Knoten mit `m3gim-ontology:atDate` und der erfassten Rolle. Zwei Ausnahmen bleiben, die Entstehungsdatierung des Dokuments auf `rico:creationDate` und die Datierung einer Auffuehrung am Auffuehrungsknoten ohne Rollenangabe. Der Test greift, wenn ein Property-Name zurueckkehrt, der eine Rolle ausdrueckt, wenn eine Datierung ihre Rolle verliert oder wenn der Zugriffspfad vom Dokument zu seinen Datierungen bricht. Alle Werte sind ISO, TimeSpan oder qualifiziert (`circa:`/`vor:`/`nach:`).

### 19. Datierungs-Meta-Contract (test_19, E-106)
Die `datierungsevidenz` wird nicht serialisiert: kein `m3gim:dateEvidence`, **kein** `agrelon:metadataConfidence` (nirgends im Graph), keine record-seitige Datierungs-Self-Provenance. Die erfundene Dezimalkonfidenz ist entfernt (E-106, löst E-100 ab). Positivkontrolle: die legitime `agrelon:metadataProvenance` auf den AgRelOn-Relationen (`m3gim-ontology:hasAgentRelation`) bleibt erhalten. test_29 (Konfidenz-Hygiene) entfiel mit der Konsolidierung. <!-- vocab-exempt: nennt eine nicht serialisierte Property -->

### 30. Datums-Routing + Datenqualitäts-Flags (test_30, E-102)
Klammer- und freitextunsichere Datierungen landen im Annotationsknoten statt in einem Datumswert am Dokument. Ein Annotationsknoten dupliziert nie eine bereits am selben Record gefuehrte Kombination aus `m3gim-ontology:atDate` und Rolle` am selben Record (`ort,datum` wird in *eine* Repräsentation aufgelöst, data.md § Verknüpfungsmechanismus). `dataQualityFlag`-Werte stammen aus dem kontrollierten Vokabular; `m3gim-ontology:qualityConfidence` wird nicht fabriziert; `m3gim-ontology:processingNote` trägt den Freitext-Anhang getrennt vom canonischen Status.

### 31. Dokumentvokabular (test_31, E-101)
`sammlung` ist ein eigenständiges Concept `m3gim-vocab:collection` ohne `skos:broader` (Records zeigen darauf). Jedes dft-Concept trägt ein lesbares deutsches `skos:prefLabel` (bekannte Konzepte exakt, nicht der Slug). Coverage: kein stiller Typ-Drop bei `hasDocumentaryFormType`. Die neuen Konzepte (briefumschlag/musikzeitschrift/chronik/verzeichnis) sind in `DFT_BROADER`/`DOKUMENTTYP_TO_DFT` strukturell gerüstet. Aboutness-Guard: ein dft-Concept erscheint nie als `rico:hasOrHadSubject`.

### 20. XLSX-Provenance + Anker-Records (test_20)

Prüft `m3gim-ontology:xlsxSource` an Records + DetailAnnotations + AgRelOn-Relationen + SpatiotemporalEvents. Zwei Testebenen:



**Strict — kuratierte Anker-Records.** Das Modul pflegt ein Fixture-Dict `ANCHOR_RECORDS` mit Erwartungen pro Anker (`xlsx_row`, `expected_doc_type`, `title_contains`, `min_finance_details`). Jeder Anker läuft durch parametrisierte Tests: existiert der Record, zeigt `xlsxSource` auf die erwartete XLSX-Zeile, tragen Nested Entities (Details, AgRelOn) selbst xlsxSource. Bricht der Test, ist entweder die XLSX umsortiert worden (Fixture pflegen, absichtlich) oder die Pipeline hat eine Regression. Aktuelle Anker: `UAKUG/NIM_007 5_1` (Finanz-Konvolut), `UAKUG/NIM_004 3` (Rezension), `UAKUG/NIM_003 1_8` (Musikinstitut).

**Soft — Coverage-Reports.** Prüft, dass alle Records und nested entities `xlsxSource` tragen, mit Toleranz für einzelne Nachzügler. Die Soft-Variante erlaubt graduellen Ausbau, falls Teilbestände erst später nachgezogen werden. Aktuelle Coverage-Werte stehen in `data/reports/quality-snapshot.md`.

Das Modul ist damit gleichzeitig Kontrakttest und **lesbare XLSX → JSON-LD-Abbildungs-Dokumentation**. Die Anker zeigen konkret: „Zelle 123 in Objekte.xlsx wird zu diesem Record, mit genau diesen Properties".

### 22. SpatiotemporalEvent-Koordinaten (test_22, Session 33)

TDD-Spec für den Koordinaten-Patch: jedes ortsindex-auflösbare `m3gim-ontology:Annotation` trägt im `atPlace`-Subobjekt `@id` (`wd:Qxxx`), `owl:sameAs`, `geo:lat`, `geo:long` und — falls Wikidata P17 das liefert — `m3gim-ontology:country`. Anker: `ste_NIM_004_24_7` (Zürich Q72), `ste_NIM_004_24_10` (Salzburg Q34713). Soft-Coverage über die STE mit Koordinaten, Werte im Quality-Snapshot.

### 23. Rollen-Hygiene an Orten (test_23, Session 34)

Regression-Test für einen Pipeline-Bug: im Komposit `ort,datum` der Verknüpfungstabelle wurde die Rolle (z. B. `erscheinungsdatum`) blind an beide Hälften vererbt — der `rico:Place`-Eintrag trug dadurch eine Datumsrolle, die im UI als „Stuttgart (erscheinungsdatum)" erschien. Der Test prüft: kein `rico:Place` an einem Record trägt eine Rolle aus `DATUMSROLLE_TO_PROPERTY`. Anker: NIM_004_12 (Stuttgart).

### 24. Komponisten-Unikat-Check im Werkindex (test_24, Session 38)

Fuzzy-Detektor (Levenshtein-Ratio ≥ 92) über alle Komponistennamen in `m3gim-ontology:MusicalWork`-Subjects. Findet Schreibweise-Varianten desselben Komponisten („Beethoven, Ludwig van/von"), die durch Tippfehler im Werkindex-XLSX entstehen. `strict-xfail` bis zum Source-Fix durch das Archivteam — nach Fix wird XPASS und bricht die Suite, damit der Marker entfernt wird. Bewusst **kein** `normalize_composer()` in der Pipeline (siehe [data.md § Datenqualität](data.md)): das wäre ein Sonderfall-Workaround, der künftige Tippfehler still kaschiert.

### 25. Chronik-Mobilitätscluster (test_25, Session 36)

Lock für die `EVENT_ROLE_TO_MOBILITY_CLUSTER`-Mapping-Tabelle im Frontend (`docs/js/data/constants.js`). Prüft, dass jede `m3gim-ontology:role`, die im JSON-LD vorkommt, entweder einer der Sichten (`performativ`/`institutionell`/`korrespondenz`/`diskursiv`/`biografisch`) zugeordnet ist oder explizit auf `null` steht (bewusste Nicht-Einordnung wie `auftrag`, `entstehung`, `ueberweisung`). Fängt stille Mapping-Drift ein, wenn neue Rollen eingeführt werden, ohne die Cluster-Zuordnung mitzuziehen.

### 26. Term-Validierung gegen RiC-O 1.1 und AgRelOn (test_26)

Konformitäts-Lock aus dem Modellierungs-Audit ([journal.md](journal.md) E-103/E-104). Sammelt jeden im Output verwendeten `rico:`- und `agrelon:`-Term (als `@type` und als Property-Key) und prüft ihn gegen eine im Repo hinterlegte Allowlist der offiziellen Termlisten — RiC-O 1.1 aus den ICA-EGAD-CSV-Komponentenlisten, AgRelOn aus der DNB-RDF. Ein nicht gelisteter Term failt hart. Deckt die bekannten Fehlterme (`rico:isAssociatedWithRecord`, `rico:File`/`rico:Fonds` als Klasse, `agrelon:hasProvenance`/`hasConfidenceValue`/`hasValidityPeriod`, `agrelon:HasIsPatron`) sofort als rot auf und sichert dauerhaft gegen Regression — die Fehlerklasse „Term aus der Benennungskonvention extrapoliert" ([Leitplanke „Fremdterme verifizieren"](journal.md)) wird damit maschinell unmöglich.

Der Test lockt die Term-Konformität gegen die Allowlist dauerhaft und verifiziert die mit der Konformitäts-Korrektur nachgezogenen Module test_12/test_19. Die sieben bekannten Fehlterme standen zusätzlich als eigener Test daneben; da keiner von ihnen in der Allowlist steht, konnte dieser nie rot werden, ohne dass der Allowlist-Test bereits rot war, und ist am 2026-08-31 entfallen. Ein leichtgewichtiger Vorläufer der weiter unten genannten SHACL-Validierung — er prüft Term-Existenz, nicht Shape-Konformität.

### 27. StageRole-Entität (test_27, E-96)

Sichert, dass `m3gim:hasPerformanceRole` vollständig abgelöst ist (kein Record trägt es mehr), dass `m3gim-ontology:StageRole`-Entitäten existieren, eine ASCII-Slug-`@id` (`^m3gim-data:stagerole_[a-z0-9_]+$`) und `rico:name` tragen, und dass ihre `@id`s eindeutig sind (Dedup-Registry). ASCII-Slug ist Pflicht, weil das JSON-LD-@id-Pattern keine Umlaute matcht. <!-- vocab-exempt: nennt das mit E-96 abgeloeste Attribut -->

### 28. Performance-Reifikation (test_28, E-96/E-98)

`m3gim-ontology:Performance`-Entitäten existieren, und `m3gim-ontology:performanceOf` zeigt stets auf ein `m3gim-ontology:MusicalWork` mit `name` (nie literale Q-ID). Die `hasPerformer`/`performanceOf`-Pfade sind datenadaptiv zulässig leer, solange der April-Stand keine `rolle,person`/`datum,werk`-Komposite enthält — sie aktivieren sich mit dem tieferen Box-Export. Begleitend migriert wurden test_04 (rolle → Performance statt hasPerformanceRole), test_09/test_15 (Relations-Zählung auf `hasPerformance`) und die JS-Fixtures `record-partition`/`utils`. Die Auflösbarkeit der record-seitigen `hasPerformance`-Referenz stand hier ein zweites Mal und liegt seit dem 2026-08-31 allein in `test_04.test_performance_references_resolvable`, das zusätzlich die `hasStageRole`-Referenz gegen die StageRole-Knoten prüft.

### 34. Rohdaten-Gegencheck (test_34, E-108)

Zellgenauer Gegencheck JSON-LD-Wert gegen die per `m3gim-ontology:xlsxSource` (`{Sheet, Row}`) adressierte XLSX-Rohzelle, für Objekt-Records gegen `M3GIM-Objekte.xlsx` (Join über `xlsxRow`) und für SpatiotemporalEvents gegen `M3GIM-Verknüpfungen.xlsx` (Join über sheet-lokale `(Sheet, Row)` via demselben Multi-Sheet-Loader wie die Pipeline). Bestätigt zugleich die Provenienz-Pille im UI: sie zeigt nicht nur eine Zeilennummer, sondern die richtige. Ersetzt den zellgenauen Teil von `audit-data.py`.

### 35. STE-@id-Stabilität (test_35, E-115)

Lock für das inhaltsbasierte STE-@id-Schema `m3gim:ste_<record>_<sha1(ort,rolle,datum)[:8]>`, optional mit Ordinal-Suffix bei echten Inhaltsdubletten. Verankert die Invariante, dass die @id eine reine Funktion ihres Inhalts ist, nicht der Verarbeitungsreihenfolge; eine Rückkehr zum früheren globalen Zähler bricht den Test.

### 36. Index-Feld-Vollständigkeit (test_36, M1)

Sichert, dass die kuratierten Spalten der vier Index-XLSX (Org-Sitz, Werk-Partie, Personen-Beruf, Lebensdaten, assoziierte Person) als `m3gim:`-Properties an der jeweiligen Entität im Output ankommen. Soll-Quelle ist der kanonische Index über den echten Pipeline-Reader `load_index` mit Header-Shift-Korrektur, nicht der Roh-XLSX-Header.

### 37. Dropdown-Umbau der Verknüpfungstabelle (test_37)

Absorbiert die Team-Änderung von 2026-07, mit der die Spalten `typ` und `rolle` auf abhängige Google-Sheets-Dropdowns umgestellt wurden. Zwei Export-Folgen muss die Pipeline tragen. Ein Dropdown-Wert kann kein Komma enthalten, weshalb der Komposit-Typ „Datum, Ort" im Export „Datum_Ort" heißt; der Unterstrich gilt als gleichwertiger Komposit-Trenner, sonst verliert der `ort,datum`-Zweig alle neuen Zeilen still. Und der Export enthält zusätzlich versteckte Hilfsblätter sowie das Blatt „Typ-Rollen", weshalb `load_verknuepfungen` jedes Blatt ohne die Verknüpfungs-Spaltensignatur (`typ` und `name`) überspringt.

### 38. Bestätigte Modellierungsregeln (test_38_modelling_rules, E-129 bis E-131)

Lock für die von der Projektleitung bestätigten Modellierungsregeln. Eine Relation, deren Objekt die Bestandsbildnerin selbst ist, wird unterdrückt, die Rolle bleibt als `m3gim-ontology:hasAssociatedAgent` erhalten (E-129). Der Quellwert `fotografie` bildet auf `m3gim-vocab:photograph` ab und trägt ein Anzeigelabel (E-130). `programm` ist das kanonische Concept mit dem Label „Programm", `programmheft` und `konzertprogramm` lösen als Quellwert-Synonyme darauf auf (E-131). Ein nicht gemappter Dokumenttyp nennt Wert und Quellzelle, statt still zu verschwinden (Anhang zu E-130). Die Anker-Records mit selbstbezüglicher HasCorrespondent-Relation dienen zugleich als Verlustfrei-Kontrolle. Die vierte Regel der Runde, die Präzisionsnormalisierung angereicherter Zeitwerte (E-132), ist über test_39 abgesichert.

### 38. Determinismus der STE-@id-Vergabe (test_38_ste_deterministic_ids, E-115)

Unit-Lock für `scripts.transform._ste_id`, eine Ebene unter dem Output-Test test_35. Deckt den einen Punkt ab, den ein Output-Test strukturell nicht zeigen kann, die Reihenfolge-Unabhängigkeit. Ein globaler oder record-lokaler Laufzähler (früherer Zustand, wiederkehrender test_22-Bruch) würde bei umgeordnetem Input denselben Inhalts-Tupeln andere @ids zuweisen, der Content-Hash tut das nicht. Die Fixture führt bewusst eine echte Inhaltsdublette mit, damit auch das Ordinal-Suffix geprüft wird.

### 39. Kalendarische Datumsgültigkeit (test_39, AF-04/E-132)

Prüft, dass kein Datumswert im erzeugten Datensatz einen Monat oder Tag außerhalb des Kalenders trägt. Zulässig sind nach [data.md](data.md) § Datumskonventionen die Formen `YYYY`, `YYYY-MM` und `YYYY-MM-DD`, Zeitspannen als `.../...` sowie die Qualifier `circa:`, `vor:` und `nach:`. Der Anlass ist die Wikidata-Anreicherung, solange sie das Feld `precision` verwirft; eine jahresgenau geführte Angabe kommt von Wikidata als `+1841-00-00T00:00:00Z` und landet als `1841-00-00` im Datensatz (Befund AF-04). Betroffen sind `schema:birthDate`, `schema:deathDate`, `m3gim-ontology:wdPremiereDate` und `m3gim-ontology:wdInception`. Die geprüften Properties ermittelt der Test aus dem Datensatz statt aus einer Liste; datumstragend ist eine Property, deren lokaler Name auf `date` oder `datum` endet oder deren sämtliche Zeichenkettenwerte die Gestalt einer Datierung haben. Künftige Datumsproperties fallen damit von selbst in die Prüfung, während `m3gim-ontology:lifespan`, Titel und Beträge draußen bleiben. Die Fallback-Klasse `m3gim-ontology:Annotation` mit `m3gim-ontology:atDate` trägt laut data.md § Datumskonventionen bewusst die nicht routbaren Rohdatierungen und bleibt über dieselbe Gestaltregel außen vor.

### 40. Vokabular-Gate (test_40)

Führt `vocab/check-coverage.py` aus und failt, sobald der Prüfer eine Abweichung meldet. Damit läuft die Abdeckung des formalen Vokabulars gegen den erzeugten Datensatz im Standardlauf mit, statt nur als Handbefehl verfügbar zu sein. Die Einbindung als eigener Prozess hat drei Gründe. Das Skript exportiert keine aufrufbare Prüf-Funktion, seinen Befund baut `main()` intern zusammen und gibt ihn über Konsole und Exit-Code aus. Der Dateiname trägt einen Bindestrich und ist damit kein importierbarer Modulname. Und der Handbefehl aus `CLAUDE.md` und dieses Gate laufen so über denselben Einstiegspunkt, können also nicht auseinanderlaufen. Die vollständige Ausgabe des Skripts wandert in die Assertion, sodass ein roter Lauf den fehlenden Term benennt. Pfad-Overrides sind `M3GIM_JSONLD_PATH` über die conftest-Fixture und `M3GIM_VOCAB_PATH`.

### 41. Namenskonvention des Vokabulars (test_41)

Lock für die Konvention der Projektleitung, dass ein als `owl:Class` deklarierter Bezeichner mit einem Großbuchstaben beginnt und ein als `owl:ObjectProperty`, `owl:DatatypeProperty` oder `skos:Concept` deklarierter mit einem Kleinbuchstaben. Gelesen wird mit rdflib statt mit einem Textmuster, weil die Deklaration in der Turtle-Datei üblicherweise in der Zeile nach dem Bezeichner steht und ein zeilenweiser Abgleich sie dem Subjekt nicht zuordnet. Anonyme Klassenausdrücke sind Blank Nodes, tragen keinen Namen und bleiben außerhalb der Prüfung. Pfad-Override `M3GIM_VOCAB_PATH`.

### 42. E-96-Nachzug in Ansichtserzeugung und Datenaudit (test_42)

`scripts/build-views.py` und `scripts/audit-data.py` lasen die mit E-96 abgelöste Property `m3gim:hasPerformanceRole`, die im erzeugten Datensatz nicht mehr vorkommt; die Lesestellen lieferten still leere Listen, ohne einen Fehler zu melden, womit Auftritts-Partien, Gattungserkennung und Rollenzählung im Kosmos leer blieben. Das heutige Modell führt Aufführungsknoten `m3gim-ontology:Performance`, die über `m3gim-ontology:hasStageRole` auf `m3gim-ontology:StageRole` zeigen, während der Record über `m3gim-ontology:hasPerformance` auf die Aufführung verweist (data.md § Verknüpfungsmechanismus und data-model.md § RiC-O-Kern und m3gim-Erweiterung). Zwei Absicherungen greifen. Die betroffenen Auswertungen tragen wieder Daten, mit Mindestvorkommen statt „leere Liste ist ok". Und jeder Vokabular-Term, den die beiden Skripte als String-Literal aus dem Graph lesen, muss im Datensatz vorkommen, womit eine erneute Ablösung dieser Art auffällt. <!-- vocab-exempt: nennt das mit E-96 abgeloeste Attribut -->

### 43. Reconciliation-Logik (test_43)

Unit-Tests für `scripts/reconcile.py` entlang der fünf Ursachen der systematischen Fehlzuordnungen, die die Identifier-Vorschlagsberichte unter `data/reports/` belegen. Betroffen sind der Typfilter der Werke ohne die Opernklasse, die angekündigte und nie bindende Komponistenprüfung, der Alias-Vergleich, der nur das Label verglich und den Alias als Label las, die vorhandenen Kennungen, die übersprungen und nie geprüft wurden, sowie die Personensuche mit ihrem Abbruch nach der Komma-Form samt Rangfolge bei Gleichstand. Das Modul läuft offline, alle Wikidata-Antworten darin sind Aufzeichnungen und kein Test greift auf das Netz zu.

### 44. Signalvokabular der Approval-Prüfung (test_44)

Die Prüfung in `scripts/verify-manual-approvals.py` vergleicht Wikidata-Descriptions gegen eine Liste von Typsignalen. Beide Seiten müssen im selben String-Raum liegen, sonst fällt eine korrekte Zuordnung als MISMATCH durch. Der konkrete Anlass ist die Umlautentschärfung, die „saenger" auf „sanger" abbildet, während die Signalliste nur die Schreibweisen mit Umlaut und mit ae führte; damit traf das häufigste Berufssignal dieses Projekts nie und eine belegte Korrektur wurde zurückgewiesen. Der Test prüft die Signaltabelle und die Urteilsfunktion gegen festgehaltene Beschreibungen und läuft ohne Netzzugriff.

### 45. Verweis- und Linkintegrität der Wissensbasis (test_45)

Die Wissensbasis trägt zwei Zitiersysteme, die aus Code, Tests, Vokabular und Action-Layer heraus angesprochen werden. E-Nummern benennen Architektur- und Modellentscheidungen, AF- und QF-Nummern benennen Abgleich- und Quellfehler. Sobald ein Umbau die Definitionen nach Gegenstand verteilt, kann eine Nummer unbemerkt verschwinden oder doppelt entstehen, und das Zitat im Code zeigt danach ins Leere, ohne dass etwas bricht. Der Test verlangt deshalb nur, dass jede zitierte Nummer irgendwo in `knowledge/` genau eine Definition hat, ohne an ein bestimmtes Dokument zu binden; damit überlebt er eine Verteilung der Register. Ein zweiter Teil sichert die relativen Markdown-Links der Wissensbasis und des Action-Layers gegen lautlose Brüche durch Umbenennung oder Löschung.

### 46. Vokabular-Leerstand (test_46)

Gegenrichtung zu test_40. Jener sichert, dass kein im Datensatz verwendeter Term undeklariert bleibt; dieser sichert, dass kein deklarierter Term ohne Belegung mitgeführt wird. Ein leerer Term ist durch eine `skos:editorialNote` entschuldigt, die mit dem Marker `unused:` beginnt und den Grund nennt, womit der Grund am Term selbst steht und mit ihm wandert, statt in einer Ausnahmeliste im Testcode zu leben. Der Test läuft über denselben Einstiegspunkt wie der Handbefehl, also `vocab/check-coverage.py --vacancy`. Der Test lief zunächst als strikter xfail, weil vier Properties deklariert und unbelegt waren. Mit dem Umbau der Pipeline auf das Zielmodell trägt jeder deklarierte Term Daten oder nennt den Grund seiner Leere; der Marker ist gezogen und der Test ist ein reguläres Gate.

### 47. Vokabular-Leser der Pipeline (test_47)

Die Pipeline braucht zur Laufzeit die Abbildung eines erfassten Rollenwerts auf
sein Concept im Vokabular. rdflib steht nur in `requirements-test.txt`, ein
Import in `scripts/transform.py` erweiterte die Laufzeitumgebung um eine
Abhängigkeit, die sie heute nicht hat; deshalb liest die Pipeline `vocab/m3gim.ttl`
mit einem eigenen, engen Leser. Der Test baut dieselbe Abbildung ein zweites Mal
mit rdflib und vergleicht beide Ergebnisse Eintrag für Eintrag, in beide
Richtungen und einschließlich der Auflösungsgleichheit. Fällt er, ist entweder
der Leser zu eng oder das Vokabular hat eine Form angenommen, die er nicht kennt.

### 48. Modellseite gegen das Vokabular (test_48)

`docs/datenmodell.html` ist erzeugt und nicht geschrieben. Der Test lässt
`scripts/build-model-page.py` erneut laufen und vergleicht das Ergebnis Zeichen
für Zeichen mit der ausgelieferten Datei; eine veraltete Seite kommt damit mit
einem Lauf des Generators wieder in Deckung. Die übrigen Fälle sichern, dass ein
leerer oder verkürzter Generator nicht trivial besteht, indem jede Klasse, jede
Property, jedes Scheme und jeder Begriff des Vokabulars auf der Seite vorkommen
muss und die Zeichnung deterministisch und ohne Laufzeitbibliothek entsteht.

### 49. Absenderseite der Korrespondenz (test_49)

Der Bestand führt die Absenderseite unter der Rolle `verfasser`; der im
Vokabular deklarierte Wert `absender` kommt in den Daten nicht vor. Solange
`verfasser` ohne AgRelOn-Zuordnung bleibt, zeigt die Korrespondenz-Sektion nur
den Adressaten. Die Zuordnung gilt allein am Dokumenttyp Korrespondenz, weil an
einer Rezension der `verfasser` der Kritiker ist und eine pauschale Abbildung
dort eine Korrespondenz erzeugte, die es nie gab. Beide Richtungen sind geprüft,
mit einem Wächter gegen den Verlust des Gegenstands.

### 50. Verknüpfungsvorschläge aus Titeln (test_50)

`scripts/propose-links.py` liest die Titel des unverknüpften Bestands und legt
Vorschläge vor; in die Daten geht nur, was das Erschließungsteam bestätigt. Der
Test steht gegen vier Gestalten desselben stillen Defekts, nämlich einen
Vorschlag, der plausibel aussieht und falsch ist. Geprüft werden der Teiltreffer
im Wortinneren („Wien“ in „Wiener Neustadt“), die Mehrdeutigkeit eines Namens,
der auf zwei Indexeinträge zugleich passt, die Erkennung einer Person an einem
einzelnen Nachnamen und die Regel, dass kein Vorschlag eine Rolle trägt, die
niemand erfasst hat.

### 51. Rollenstellen einer AgRelOn-Relation (test_51)

Zwei Befunde aus der offiziellen AgRelOn-RDF der Deutschen Nationalbibliothek,
beide am 2026-08-22 gegen die Quelle geprüft. `agrelon:hasCorrespondent` ist eine
`owl:SymmetricProperty`, weshalb die Ontologie für den n-ären Begriff
`agrelon:hasSubjectObject` vorsieht; `hasSubject` und `hasObject` behaupteten
dort eine Richtung, die der Begriff nicht kennt. Und `IsHasPatron` folgt der
Lesart des ersten Namensteils `isPatronOf`, womit Subjekt der Fördernde ist. Die
Pipeline setzte die Nachlassbildnerin als Subjekt und drehte die Beziehung damit
um.

### 52. Bezugsebene und Rang einer Datierung (test_52)

Der Frontend-Vertrag verlangt Rang und Bezugsebene jeder Datierung. Bis zum
2026-08-22 lagen beide als Handtabellen in `docs/js/data/constants.js`, während
der Datensatz sie an keiner Stelle führte; die Oberfläche trug damit eine Aussage
über die Daten, die in den Daten nicht stand. Der Test verankert beide am Begriff
im Vokabular und enthält den lexikalischen Nachweis, dass das Frontend keine
zweite Tabelle führt. Ein neuer Rollenbegriff ohne Bezugsebene und eine Rolle mit
einer Ebene außerhalb des Schemas fallen damit auf, statt still aus der
Auswertung zu fallen.

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

Dieses Muster wurde in Phase 4.1–4.8 (Session 28) erfolgreich angewendet, ebenso beim Koordinaten-Patch (Session 33, test_22) und beim ORTE-Rollen-Fix (Session 34, test_23). Siehe [specification.md](specification.md) § Stand und [architecture.md](architecture.md) § Pipeline.

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
- Manche Invarianten sind ohne einen Pipeline-Herkunftsmarker (`m3gim-ontology:derivedFromRole`) gar nicht aus dem Graph berechenbar — der Marker muss dann Teil des Features sein.
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
8. Baselines in `tests/fixtures/baseline_counts.json` auf etwa neunzig Prozent der neuen Ist-Werte nachziehen (Entscheidung der Projektleitung vom 2026-08-31, siehe § 9). Der Schritt ist verbindlich, sonst wachsen die Ist-Werte lautlos von den Mindestwerten weg.

## Bekannte Ausnahmen

- `test_verknuepfungen_every_referenced_record_has_relations` — **xfail (strict)**. Folio-Granularitäts-Inkonsistenz NIM_168 zwischen Objekt- und Verknüpfungstabelle (Partner-Übergabeliste). Nach dem Source-Fix bricht XPASS die Suite, dann Marker entfernen.
- `test_komponisten_ohne_fuzzy_duplikate` (test_24) — **xfail (strict)**. Schreibvarianten desselben Komponisten im Werkindex (Beethoven „van/von“), Source-Fix beim Archivteam offen.
- Die beiden AgRelOn-Tests in test_12 überspringen sich sichtbar, wenn die Quelle keine matchbare arbeitgeber-Zeile führt oder keine Relation einen Gültigkeitszeitraum trägt. Am Datenstand vom 2026-08-31 tritt das nicht ein, beide laufen als reguläre Tests.
- `pytest.importorskip("playwright")` in `tests/frontend/test_smoke.py` ist der einzige Skip-Pfad, der in einer browserlosen Umgebung regelmäßig greift. Die übrigen `pytest.skip`-Aufrufe der Suite sind Vorbedingungswächter und werden am aktuellen Stand nicht erreicht.
- Junk-Namen im Personen-Index (`[Organi]`, kurze Initialen) werden als Warnung geloggt, nicht gefailed — Frontend filtert via `isJunkName`.
- Freitext in Datumsspalte (`"Wien, ab 1956"`, `"1944-05 bis 1944-09"`): `is_iso_date()` trennt sie vom ISO-Wert; sie landen im Annotationsknoten unter `m3gim-ontology:hasAnnotation` mit ihrem Rohwert. Das generische `m3gim:eventDate` ist abgeschafft (test_18 assertet `generic_count == 0`). <!-- vocab-exempt: nennt die mit E-102 abgeschaffte generische Datumsproperty -->

## Stand

Suite durchgängig grün bis auf die beiden strikten xfail-Marker (`NIM_168` in test_04, Beethoven-Schreibvariante in test_24), die beide auf einen offenen Source-Fix zeigen. Die Module `test_19_provenance` (semantische Provenance) und `test_20_xlsx_provenance` (technische XLSX-Quellreferenz) bilden zusammen den Provenance-Kontrakt des Projekts.

Laufzeit im Regelbetrieb überschaubar; der Determinismus-Test (Marker `slow`) dominiert die Gesamtdauer und ist aus der Standard-Suite ausgeschlossen.

## Dependencies

`requirements-test.txt` bindet die Laufzeit-Abhängigkeiten über `-r requirements.txt` ein (die Suite braucht pandas und thefuzz) und ergänzt:
- `pytest>=7.0`
- `jsonschema>=4.0` (Schema-Validierung)
- `rdflib>=7.0` für den Vokabular-Abdeckungsprüfer `vocab/check-coverage.py`, der `vocab/m3gim.ttl` parst. Sein Docstring nennt `uv run` als Aufruf; `uv` ist keine Projektvoraussetzung, `python vocab/check-coverage.py` genügt.

Playwright ist bewusst **nicht** enthalten und bleibt ein optionales Extra, siehe § Frontend-Smoke.

`snapshot_diff.py` ist eigenständig implementiert und braucht keine externe Diff-Bibliothek. Produktions-`requirements.txt` bleibt unberührt (pandas, openpyxl, thefuzz).

## Abgrenzungen

**Was nicht getestet wird** (bewusst):
- Pipeline-Internas (private Funktionen) — außer die in test_14 als Unit-Tests
- Google-Sheets-Content selbst — Datenqualität ist redaktionelle Aufgabe (`explore.py`/`validate.py`)
- Frontend-JavaScript in pytest. Die dom-freien Funktionen deckt `node --test` ab (§ JS-Unit-Tests), das gerenderte Dokument der Browser-Smoke
- Performance — Pipeline-Laufzeit unkritisch

**Bekannte Testlücke, Korb-Export.** Die beiden Exportwege des Korbs, `exportCSV` und `exportBibTeX` in [`docs/js/views/korb.js`](../docs/js/views/korb.js), sind modulintern deklariert und tragen kein `export`-Schlüsselwort. Damit kann keine Testdatei sie importieren, und keine tut es. Der Smoke-Durchlauf betritt den Korb-Tab, klickt die beiden Knöpfe aber nicht. Ungeprüft bleiben die Feldauswahl, das CSV-Quoting in `csvEscape`, die Zeichenbehandlung in `bibtexEscape` und der Dateiname des Downloads. Eine Absicherung setzt voraus, dass beide Funktionen exportiert werden, was ein Eingriff in den Frontend-Code ist und deshalb hier nur vermerkt steht.

**Was später dazukommen kann**:
- SHACL-Validierung gegen RiC-O-Shapes (`pyshacl`) — semantisch schärfer als JSON-Schema
- CI-Integration (aktuell keine, siehe [architecture.md](architecture.md) § CI/CD)

## Frontend-Smoke (Playwright, seit Session 35)

`tests/frontend/smoke.py` fährt die SPA headless (Chromium, lokaler `python -m http.server 8765`) und prüft:

1. Tab-Durchlauf über die sieben Tabs des Katalogs `TABS` in `docs/js/ui/router.js`, also `bestand`, `chronik`, `statistik`, `indizes`, `karte`, `netzwerk` und `korb`. Geprüft wird, dass das DOM nicht leer rendert. Ein neuer Konsolenfehler auf einem Tab wird heute als WARN geführt und bricht den Lauf nicht.
2. logStamp-Keys pro Tab, wie sie `stamp_expectations` fordert. `bestand` verlangt `konvolute, records, sort, stand`, `chronik` verlangt `records, jahre-belegt, datiert, undatiert, sicht-gedeckt, spanne`, `statistik` verlangt `records, ansichten, aktiv, spanne`, `indizes` verlangt `personen, organisationen, orte, werke`, `karte` verlangt `entitaeten, orte, belege, unverortet, jahre`, `netzwerk` verlangt `fokus, facetten` samt den fünf Facettenschlüsseln, `stand`, `knoten`, die Knotenzahlen je Typ unter `k-<typ>`, `ring1`, `ring2`, `agrelon`, `recordsWeit` und `recordsEng`, und `korb` verlangt `eintraege, aufgeloest, events, finanzen`. Der Stempel schützt davor, dass eine Ansicht still ins Nichts rendert oder ein Schlüssel beim Refactor wegfliegt.
3. Chronik-Zeitstrahl-Canary: `#tab-chronik .chronik-year` deckt die Lebensspanne als durchgehende Jahres-Zeilen ab, leere Jahre sind sichtbar und tragen keine Record-Chips (E-88). Ein Klick auf einen `chronik-point` springt in den Bestand und öffnet dort das Detail, ohne Konsolenfehler.
4. Chronik-Aggregat-Canary (E-124): ein Klick auf ein Dekaden-Sicht-Segment hebt genau die belegenden Chips hervor (`.chronik-point--hit`) und dämpft den Rest (`.chronik-point--dim`). Bleibt die Trefferzahl null, ist der Stapelbalken eine unbelegte Zahl.
5. Karten-Canary (E-113, neu gefasst mit E-126): nach dem Klick auf den Karten-Tab wartet der Check auf den asynchronen Geometrie-Load und prüft Stadt-Knoten (`.mob-nodes g.mob-node`), das Fehlen von Verbindungslinien (`.mob-arcs path` gleich null), eine befüllte Entitäts-Auswahl im Facettenmuster (`.fs-facet[data-facet="entitaet"] .fs-option`) und die Ländergeometrie (`.mob-land path`). Zusätzlich wählt er „Bayreuther Festspiele" und verifiziert, dass die Knotenmenge auf deren Orte schrumpft. Harter FAIL, nicht WARN, weil der Stempel synchron vor dem Async-Draw geschrieben wird und eine still leer rendernde Karte deshalb verfehlt.
6. Cross-View-Filter-Canary `m4:cross-view-filter` ([architecture.md](architecture.md) § Cross-View-Filter): im Netzwerk wird die Ortsfacette der linken Spalte auf Bayreuth gesetzt, danach führt der Netzwerk-Stempel `ort:Bayreuth` und der bereits gerenderte Bestand meldet `gefiltert:ja`.
7. URL-Roundtrip-Canary `filter:url-roundtrip`: der gesetzte Ort steht im Hash, überlebt einen vollen Reload und filtert danach weiterhin. Ohne diesen Weg wäre ein Befund nicht zitierbar.
8. Anker-Titel im DOM: `Rezension von Karl Schumann zu Macbeth` (NIM_004/3) und `Handschriftliche Notiz` (NIM_007/5_1). Bricht der Check, ist entweder der Record ausgefiltert worden oder die Render-Logik kaputt.
9. Anker-Record NIM_004_1 voll aufgeklappt: Sprach-Kürzel aufgelöst (`en, fr` wird zu „Englisch, Französisch"), AgRelOn-Dedup greift (die Nachlassbildnerin erscheint genau einmal), und der datumslose Ortsrollen-Chip rendert im Block Ort und Ereignis (E-97).
10. Konvolut-Meta-Chips sichtbar: `.archiv-konvolut-meta .chip--compact` steht zählbar in der Titelzeile `.archiv-titel-zeile` des eingeklappten Kopfs, in der Kopfzeile selbst steht kein Erschließungsstand, und der Tooltip des Badges `.badge--konvolut-struct` führt ihn (E-190). Der Check schützt gegen eine leer laufende Meta-Aggregation im Loader und gegen ein Zurückwandern der Statuszeile in die Zeile.
11. Erschließungsstand als Facette (E-162 auf der Basis aus E-165): die Ankreuzliste führt vier Werte, beim Öffnen sind abgeschlossen und begonnen gesetzt, ein weiterer Haken erweitert die Zeilenmenge, und es gibt keinen ausgegrauten Rest mehr, weil die Dokumentbasis die Verknüpfung ist.
12. Duplicate `@id` im JSON-LD-Graph: bekannte Kollisionen stehen in `KNOWN_COLLISIONS` und werden toleriert, neue Kollisionen failen sofort.

Aufruf:

```bash
python -m http.server 8765 --directory docs &
python tests/frontend/smoke.py
# oder via pytest-Wrapper mit Auto-Server:
pytest -m frontend tests/frontend/
```

Der pytest-Wrapper (`tests/frontend/test_smoke.py`, Marker `@pytest.mark.frontend`) startet den Server als Fixture.

Acht der Prüfungen fangen jede Ausnahme ihrer eigenen Ausführung ab und melden dann WARN statt FAIL, betroffen sind der Chronik-Jahresraster, die Aggregat-Auflösung, der Cross-View-Filter, der URL-Roundtrip, der Anker-Record NIM_004_1, die Konvolut-Meta-Chips, die Erschließungsstand-Facette und die Duplikat-Prüfung der `@id`. Nur ein FAIL setzt den Exit-Code, den der Wrapper auswertet. Ein kaputt gehender Selektor lässt den Durchlauf damit still grün werden. Ob diese Prüfungen den Lauf brechen sollen, ist eine offene Operator-Entscheidung, sie bestimmt, ob der Smoke-Durchlauf ein Gate oder ein Bericht ist.

Der Browserteil ist ein optionales Extra. Playwright steht in keiner Requirements-Datei, weil die Testumgebung sonst einen Browser-Download mitzöge. Der Wrapper prüft die Verfügbarkeit beim Import (`pytest.importorskip("playwright")`) und überspringt sich selbst, wenn das Paket fehlt. Ein Standardlauf in einer browserlosen Umgebung bleibt dadurch grün. Ist Playwright installiert, läuft der Smoke-Test auch im unmarkierten `pytest tests/` mit, weil `pytest.ini` den Marker nicht ausschließt.

Installation des Extras:

```bash
pip install playwright
playwright install chromium
```

Ohne das Extra prüft die Suite weiterhin die Pipeline-Artefakte, den Frontend-Kontrakt aus den Daten heraus (test_06, test_33) und über `node --test` die dom-freien Frontend-Funktionen. Ungeprüft bleibt allein, was erst im gerenderten Dokument entsteht, also Tab-Durchlauf, logStamp-Keys, die Canaries und die Anker-Titel im DOM.

## DOM-Abgleich der Bestand-Liste (seit 2026-09-01)

`tests/tools/verify_bestand_display.py` schließt die Schicht, die `audit-data.py` offen lässt. Der Audit prüft Quelle gegen JSON-LD gegen `docs/data`, der DOM-Abgleich prüft zusätzlich das tatsächlich gerenderte Dokument. Er lädt die Objekte-CSV über die Pipeline-Loader, das publizierte `docs/data/m3gim.jsonld` und die Bestand-Tabelle headless im Chromium und vergleicht pro Einheit Anwesenheit, Titelanzeige (samt der Regel, dass ein Kindtitel gleich dem Konvoluttitel leer erscheint), Undatiert-Markierung, Jahr und Verknüpfungszahl. Die Frontend-Konstanten sind bewusst gespiegelt, und driftet das Frontend, schlägt der Abgleich an und der Spiegel wird nachgezogen.

Der Spiegel ist am Abend des 2026-09-03 auf die ausgelieferte Oberfläche nachgezogen (E-195). Das Werkzeug bediente bis dahin den Umfang-Umschalter der Sidebar, den es seit E-162 und E-165 nicht mehr gibt; es klickt jetzt den Zurücksetzen-Link der Chip-Zeile (`.vs-status__reset`) und erreicht darüber die Grundmenge, weil der Bestands-Default seit E-170 ein gewöhnlicher Filter mit Chip ist.

Der Handlauf schreibt `data/reports/frontend-verification-bestand.md` und endet mit Exit 1 bei Befunden:

```bash
python -m http.server 8791 -d docs   # Port via M3GIM_VERIFY_URL aenderbar
python tests/tools/verify_bestand_display.py
```

Als pytest-Case läuft derselbe Abgleich über `tests/frontend/test_bestand_display.py` mit Auto-Server auf freiem Port. Er trägt beide Marker `frontend` und `data_quality`: ohne Playwright überspringt er sich, mit Playwright gehört er zum Datenspiegel, weil sein Rot am aktuellen Stand Quellbefunde meldet (etwa die fast leere Objektzeile zu einem einzelnen Folio), nicht Frontend-Fehler. Der Invarianten-Lauf schließt ihn über `-m "not data_quality"` aus.

## Sichtprüfung

Die frühere Screenshot-Ablage `reports/screens/` ist am 2026-09-01 entfernt (E-155). Eine Sichtprüfung liest die laufende Oberfläche direkt, `python -m http.server 8765` gegen `docs/`, denselben Bezugspunkt nutzt `tests/frontend/smoke.py` über `M3GIM_SMOKE_URL` mit dem Default `http://localhost:8765/`. Der pytest-Wrapper `tests/frontend/test_smoke.py` startet bewusst einen eigenen Server auf einem freien Port, weil er die Fixture selbst hält.

Methodenregel aus der Frontend-Sichtprüfung vom 2026-06-21: bei einem Widerspruch zwischen Bildlesung und DOM-Lesung gilt das DOM. Der gegen den breiten Render skalierte Screenshot war zweimal irreführend, eine vermeintliche Chip-Beschriftung FRIEDHOF war im DOM ERWÄHNT und eine vermeintliche Datumsspanne bis 2826 war im DOM 2026. Zahlen und Beschriftungen stammen seither aus Store-Abfrage oder DOM.

## Zwei-Schichten-Modell der Suite

Die Suite trennt seit dem 2026-09-01 zwei Aussagearten, weil der Bestand laufend neue Lieferungen bekommt und ein Rot zwei verschiedene Dinge bedeuten kann.

**Invarianten** prüfen Modell, Pipeline, Serialisierung und Frontend-Kontrakt, unabhängig davon, welche Fehler die Quelle gerade trägt. Sie laufen als `pytest -m "not data_quality and not slow"` und müssen immer grün sein. Ein Rot hier heißt, wir haben etwas kaputt gemacht.

**Datenspiegel** (Marker `data_quality`) behauptet, dass die Quelle sauber ist, etwa dass jede Verknüpfungszeile ein Objekt trifft (`test_61_orphan_links.py`). Diese Tests sind absichtlich rot, solange bekannte Quellfehler bestehen, ihre Fehlermeldung ist die Befundliste mit Fundstellen, direkt als Arbeitsauftrag ans Erschließungsteam lesbar. Sie tragen keine hartkodierten Erwartungslisten und werden mit einer sauberen Lieferung von selbst grün, ohne dass jemand den Test anfasst. Sie laufen als `pytest -m data_quality`. Mit installiertem Playwright gehört auch der DOM-Abgleich der Bestand-Liste zu dieser Schicht (§ DOM-Abgleich), die Behauptung reicht dann bis ins gerenderte Dokument.

Der Kontrakt zwischen beiden Schichten ist die Werteliste `Typ-Rolle.csv`. Ein erfasster Wert außerhalb der Werteliste ist ein Datenspiegel-Befund; ein Wert, der in der Werteliste steht, aber im Vokabular fehlt, ist ein Invarianten-Befund, weil dann das Modell hinterherhinkt.

## JS-Unit-Tests (Node, seit Session 47)

Die JS-Unit-Tests decken die dom- und d3-freien Funktionen des Frontends ab. Jede Datei steht gegen einen benannten stillen Defekt, also gegen einen Fehler, der kein Symptom zeigt, sondern ein falsches oder leeres Ergebnis liefert. Der Stand vom 2026-09-03 umfasst diese Dateien unter `tests/frontend/`.

Datenschicht und Store:

- `loader.test.mjs` für die Strecke JSON-LD zu `loadArchive()` zu Store, mit synthetischer Fixture und Ankern gegen `docs/data`. Als einzige Datei eine Integrationsstrecke.
- `datings.test.mjs` für die Zugänge des Stores zu Datierungen, `annotationsOf`, `datingsOf`, `datingsByScope` und `primaryYear`.
- `year-anchor.test.mjs` für den einen Zeitanker je Record, in jeder Ansicht derselbe (Frontend-Vertrag A4).
- `date-carrier.test.mjs` für die vier Stellen, die die Anwesenheit von `rico:date` und `m3gim-ontology:hasAnnotation` prüfen.
- `event-year-count.test.mjs` für den einen Zählweg datierter Ereignisse, gegen jede zweite Jahresbestimmung an `primaryYear` vorbei.
- `typed-dates.test.mjs` für das Rollenregister des Frontends gegen den Datenstand, jede Prüfung durch eine eingespielte Verletzung nachgewiesen.
- `relation-shape.test.mjs` für beide Bauformen einer AgRelOn-Relation, die gerichtete und die symmetrische (E-149).
- `provenance.test.mjs` für `extractXlsxSource`, die eine Stelle, an der das Format der Quellreferenz gelesen wird (E-91).
- `gloss.test.mjs` für die Begriffserklärungen aus dem Vokabular und die Trennung der Begriffsschemata (E-143).

Filter und Dokumentmenge:

- `records-for.test.mjs` für `recordsFor` als einzige Auflösung von Filter zu Dokumentmenge, einschließlich des lexikalischen Gates gegen wiederkehrende Eigenauflösungen in den Views.
- `multi-facet.test.mjs` dafür, dass mehrere Werte einer Facette als ODER wirken und verschiedene Facetten als UND (E-151).
- `facet-inventory.test.mjs` für die Deckung der Achsen am ausgelieferten Datensatz, mit Mindestvorkommen statt Nulltoleranz.
- `doctype-facet.test.mjs` für den Dokumenttyp als Facette, den Oberbegriff über `expandDftFilter` und die Baumgruppen aus `docTypeGroups`.
- `shared-facets-holdings.test.mjs` für den Schnitt von Bestand und Chronik über `filterBySharedState`, inklusive der Facetten Institution und Sicht.
- `shared-filter-reach.test.mjs` als lexikalisches Gate, dass den Zeitregler genau eine Stelle baut und jede Ansicht am geteilten Zustand hängt.
- `filter-state.test.mjs` für den Nullpunkt als leere Wahl und die Ansichts-Voreinstellung als sichtbaren Filter.
- `filter-sync.test.mjs` für die Faltung zwischen Jahresfenster und Zeitfenster-Facette und den Loop-Guard.
- `filter-url.test.mjs` für Kodierung und Zerlegung des Hash, und `router-hash.test.mjs` für die Gegenrichtung, also was `parseHash` in Router-State und Filter überträgt.
- `text-match.test.mjs` für den Textabgleich der Facetten-Autovervollständigung mit Umlaut- und Akzentausgleich.

Ansichten:

- `bestand-data.js`-Seite mit `bestand-badge.test.mjs` für den Dokumenttyp-Badge im abgeflachten Modus, `bestand-families.test.mjs` für `familiesForRecord`, die dom-freie Logik hinter der typisierten Erschließungsanzeige (E-158), und `bestand-autoopen.test.mjs` für `shouldAutoOpenFirstKonvolut`, also das erste Konvolut beim ungefilterten Eintreten (E-206). Eine Sortierung hat die Tabelle seit E-203 nicht mehr, der frühere `bestand-sort.test.mjs` ist mit ihr entfallen.
- `record-partition.test.mjs` für `partitionRecord`, also den geteilten Pfad von Inline-Detail und Korb, und `detail-foot.test.mjs` für `sourceSummary`.
- `statistik-data.test.mjs` für die Aggregationen der Statistik und dafür, dass der geteilte Schnitt sie schneidet.
- `catalogue-gaps.test.mjs` für `aggregateCatalogueGaps`, jede Erschließungsachse einzeln und die Summe gegen den Gesamtbestand.
- `indizes-data.test.mjs` für Einträge, Suche, Normdaten-Filter und Cross-Grid-Schnitt der Register.
- `netzwerk-geometry.test.mjs` für das eine reine Modul der zusammengeführten Netzwerk-Ansicht (E-94, E-160), also `buildGraph`, `computeLayout`, `computeCoOccurrence`, `nodeRing`, `nodeEvidence`, `nodeColor`, `nodeId`, `isMalaniuk`, `isPureComposer`, `derivePersonKategorie` und `labelGeometry`, gegen einen synthetischen Store und gegen den ausgelieferten Datenstand.

Rahmen:

- `tabs.test.mjs` für die Tastaturbewegung der Tab-Leiste als reine Funktion und für den Auszeichnungskontrakt der ausgelieferten `docs/index.html`, also `aria-controls`, genau ein `tabindex="0"` und `role="none"` an den Gruppen (E-160).
- `router.test.mjs` für den Legacy-Präfix `m3gim:` im URL-Hash nach der Namensraum-Dreiteilung (E-138).
- `basket.test.mjs` für den Korb, seine Spiegelung in den localStorage und das Abmelden seiner Listener.
- `log-stamp.test.mjs` für den Zustands-Stempel, seine feste Schlüsselreihenfolge und die Unterscheidung zwischen der Null und dem leeren Wert.
- `sidebar-column.test.mjs` für die reinen Beschriftungsfunktionen und die Sektionskonfiguration der Seitenleiste.
- `bestand-jumplist.test.mjs` für das Modell der Sprungliste in beiden Zuständen, der Konvolut-Hierarchie und der flachen gefilterten Liste (E-214).
- `derived-mark.test.mjs` als lexikalische Sperre, dass jede der fünf Ergänzungsstellen die Marke `mark-derived` mit einem „ergänzt:“-Tooltip trägt und die alten Einzelformen fehlen (E-216).
- `auftritt-grouping.test.mjs` für die Datumssortierung, die Spielzeit-Gruppierung und die Rolle-zu-Werk-Zuordnung des Details (E-213).
- `family-icons.test.mjs` für das geteilte Symbolmodul und dass Bestand und Indizes keine eigenen Familiensymbole zeichnen (E-212).
- `tooltip-system.test.mjs` als lexikalische Sperre, dass `data-tip` das einzige Tooltip-System ist und `title` unter `docs/js` nicht vorkommt (E-210).
- `utils.test.mjs` für `date-parser` und `format`.

Zwei Hilfsdateien tragen die Fixtures. `_concepts.mjs` stellt synthetischen Fixtures die echten Begriffsknoten des Datensatzes voran und verhindert damit eine zweite, im Testcode geführte Vokabulartabelle. `_shipped.mjs` liefert den ausgelieferten Graphen unter `docs/data/m3gim.jsonld` und den daraus über den echten Loader gebauten Store, also genau das, was der Browser bekommt.

Lauf:

```bash
node --test tests/frontend/*.test.mjs
```

Kein npm install und keine Build-Tools, genutzt werden `node:test` und `node:assert/strict` aus Node 18. Die Datei `docs/js/package.json` mit `{"type":"module"}` markiert den Baum als ES-Modul für das Laden in Node, Browser ignorieren sie.

Wo eine Ansicht DOM- und D3-Aufrufe direkt in ihrer Zeichenlogik mischt, wird sie nicht auf diesem Weg geprüft, weil der Aufwand größer wäre als der Wert. Geprüft wird, was sich sauber von der DOM-Schicht trennen lässt, und der Schichtenschnitt der Ansichten hat diese Menge deutlich vergrößert.
