# Audit der M³GIM-Testsuite

Stand 2026-08-31, gegen den Arbeitsbaum in `c:\Users\Chrisi\Documents\GitHub\DHCraft\m3gim` (Branch main, sauber, HEAD d75f23d). Das Repo wurde nicht verändert.

## Lauf und Stand

Beide Suiten wurden ausgeführt.

- `pytest tests/ -m "not slow"` liefert 355 passed, 2 xfailed, 1 deselected in 31,84 s.
- `node --test tests/frontend/*.test.mjs` liefert 234 pass, 0 fail, 0 skipped, 0 todo in 279 ms.
- Playwright ist in dieser Umgebung installiert, der Smoke-Durchlauf läuft im Standardlauf mit und meldet 29 OK, 0 WARN, 0 FAIL.

Umfang: 52 pytest-Module plus `conftest.py` und `_helpers.py`, 17 Node-Testdateien, `smoke.py` mit seinem pytest-Wrapper, ein Werkzeug unter `tests/tools/`, zwei Fixtures, ein JSON-Schema, das Vokabular-Gate `vocab/check-coverage.py`.

Die Suite ist auffallend gesund. Der überwiegende Teil der Module prüft eine echte, nicht-triviale Invariante und ist gegen einen konkreten, benannten Defekt geschrieben. Die Befunde unten betreffen einen Rand von etwa fünfzehn Prozent der Testfunktionen, dort aber teils mit voller Wirkung, weil ein Test grün bleibt, dessen Gegenstand real defekt ist.

## Belegte Befunde

Jeder Punkt in diesem Abschnitt wurde am laufenden Code oder am erzeugten Datensatz nachgewiesen.

### B1. Der Wagner-Fall ist kein Einzelfall, sondern trifft 31 Personen

`docs/js/views/_network-geometry.js:129` filtert über `lower.includes(composer)` ohne Wortgrenze, und die Ausnahme für die Regisseure der Wagner-Familie hängt an `entry.kategorie === 'Regisseur'`, die aus `getPersonKategorie()` kommt. Deren Schlüssel `'wieland wagner'` und `'wolfgang wagner'` in `docs/js/data/constants.js:22` stehen in der Vorname-Nachname-Form, während der Loader den Indexnamen in der Komma-Form führt.

Gegen den echten Store gemessen (`data/output/m3gim.jsonld` über `loadArchive`) entfernt `isPureComposer` 31 Personen aus dem Netzwerk, darunter

| Name | Records | kategorie | Grund |
|---|---|---|---|
| Wagner, Wieland | 35 | Komponist | Schlüsselformat, Ausnahme greift nicht |
| Wagner, Richard | 27 | Komponist | zu Recht gefiltert |
| Wagner, Wolfgang | 18 | Komponist | Schlüsselformat |
| Witte, Wolfgang | 5 | Andere | `'wolf'` als Teilzeichenkette in `Wolfgang` |
| Wagner, Gertrud | 5 | Komponist | Nachname als Teilzeichenkette |

Weiter betroffen sind `Golther, Wolfgang`, `Steinecke, Wolfgang`, `Zimmermann, Wolfram`, `Wolf, Winfried`, `Schubert, Erika`, `Weber, Ludiwig`, `Wagner, Ellen`, `Wagner, WIeland` und `Wagner, Wieland Gottfried`. Wieland Wagner ist nach Records die dichteste Person des Bestands neben der Nachlassbildnerin und fehlt im Netzwerk-Tab vollständig.

Der Test `tests/frontend/network-geometry.test.mjs:132` setzt `{kategorie: 'Regisseur'}` von Hand und prüft damit genau den Zweig, den die echte Kette nie erreicht. Alle 54 Fälle des Moduls arbeiten über die Faktory `person()` in Zeile 43, die `kategorie` als Parameter mit Default `'Andere'` entgegennimmt. Kein Fall bezieht `kategorie` aus `getPersonKategorie()`.

### B2. Die beiden Zählwege für datierte Ereignisse laufen heute nicht auseinander, aber die Divergenz ist verschoben, nicht geschlossen

Am aktuellen Datenstand liefern beide Wege 82 datierte von 125 Mobilitätsereignissen, Differenz null. Der Grund ist `splitQualifier` in `docs/js/data/loader.js:676`, das den Qualifier abtrennt und `date` qualifiziererfrei ablegt (`rawDate: "nach:1956"`, `date: "1956"`). Die im Handoff belegten Fälle an `NIM_004_24` und `NIM_004_29` sind damit erledigt.

Die beiden Kriterien bleiben aber verschieden und divergieren bei einer anderen Wertklasse. `docs/js/main.js:117` prüft `/\d{4}/`, `docs/js/views/statistics-data.js:250` prüft `date.length >= 4` und `Number.isFinite(parseInt(date.slice(0, 4), 10))`. Für den im Datensatz belegten Wert `06-09` (zwei Annotationen, `m3gim-data:ev_NIM_004_34_8b2fc9e2` und `_7b5ac89d`, beide mit `dataQualityFlag: datierung-malformed`) gilt

- Regex-Weg: `/\d{4}/.test('06-09')` ist `false`
- Präfix-Weg: `parseInt('06-0', 10)` ist `6`, `Number.isFinite(6)` ist `true`

Der Präfix-Weg zählte diesen Wert als datiert und ordnete ihn dem Jahrzehnt 0 zu, was in `aggregateDecadesBySicht` die Lückenfüllung ab `Math.min(...buckets.keys())` auslöst und über zweihundert leere Dekadenzeilen erzeugt. Wirkungslos ist das heute nur, weil die beiden Knoten kein `atPlace` tragen und damit nicht in `store.mobilityEvents` landen. Eine Verortung an einer malformten Datierung reicht, um den Defekt auszulösen. Kein Test stellt die beiden Wege gegeneinander.

### B3. Baselines sind so weit veraltet, dass sie keine realistische Regression mehr fangen

`tests/fixtures/baseline_counts.json` trägt den Stand vom 2026-04-17 und ist seither nicht nachgezogen worden.

| Schlüssel | Ist | Mindestwert | Puffer |
|---|---|---|---|
| records | 895 | 380 | +136 % |
| konvolute | 17 | 7 | +143 % |
| persons | 472 | 320 | +48 % |
| organizations | 143 | 65 | +120 % |
| locations | 58 | 40 | +45 % |
| works | 142 | 95 | +49 % |
| verknuepfungen | 3123 | 1200 | +160 % |
| wd_matches | 339 | 200 | +70 % |

Ein Pipeline-Fehler, der die Hälfte aller Records verliert, hält alle acht Prüfungen in `tests/test_09_baselines.py` grün.

### B4. Vier Tests in `test_04` prüfen nur Nichtleere

`tests/test_04_verknuepfungen.py:128,133,138,143` sind vier Funktionen der Form `assert len(...) > 0`. Sie fangen den vollständigen Ausfall eines Typzweigs, sonst nichts, und überschneiden sich mit den Baselines aus `test_09`, die dieselben vier Mengen zählen.

### B5. Zwei Tests in `test_11` sind zeichengleich derselbe Test

`tests/test_11_mobilitaet.py:43-55` und `tests/test_11_mobilitaet.py:106-118` berechnen beide `row_count` der Zeilen mit `typ == "ort, datum"` und prüfen `len(events) >= row_count * 0.6`. Der erste ergänzt ein `max(5, ...)`. Verlustfrei zusammenlegbar.

Beide zählen den Komposittyp allein in der Kommaform. `tests/test_37_dropdown_export.py:36` hält fest, dass der Dropdown-Export die Unterstrichform `Datum_Ort` liefert, und die Pipeline akzeptiert beide. Sobald der Export nur noch Unterstrichformen führt, fällt `row_count` auf null und die Schwelle wird trivial.

### B6. Zwei Tests in `test_12` laufen ohne einen ausgeführten Assert durch

Die Quelle führt am aktuellen Stand null Zeilen mit `typ == institution` und `rolle == arbeitgeber` (geprüft über `load_verknuepfungen`).

- `tests/test_12_agrelon.py:34` berechnet daraus `matchable = 0` und prüft `actual >= 0`. Immer wahr.
- `tests/test_12_agrelon.py:95` betritt seine Assert-Schleife nur bei vorhandenem `agrelon:metadataPeriod`, `expected_min` ist null, der Skip-Zweig in Zeile 133 wird nie erreicht. Der Kommentar in Zeile 132 hält das selbst fest ("Zaehlung ist info").

`knowledge/testing.md:342` führt den ersten der beiden als **skip**. Tatsächlich ist er kein Skip, sondern ein grüner Test ohne Gegenstand, was in der Zählung der grünen Tests anders wirkt als ein sichtbarer Skip.

### B7. `test_05` hat eine Testfunktion mit totem Rumpf

`tests/test_05_referential.py:63-81`. Die Schleife über die Folio-Records baut eine Regex-Gruppe auf, wertet `if not any(...)` aus und beendet den Zweig mit `pass`. Der einzige wirksame Assert ist der Nachsatz in Zeile 79-81, dass jedes Konvolut Kinder hat. Der Funktionsname `test_folio_records_have_konvolut_parent` beschreibt eine Invariante, die die Funktion nicht prüft.

### B8. `test_07` prüft nicht, was sein Name behauptet

`tests/test_07_wikidata.py:24` heißt `test_every_wd_id_in_output_stems_from_reconciliation` und prüft in Zeile 35-37 lediglich, dass die Schnittmenge nicht leer ist. Eine Q-ID im Output, die in `wikidata-reconciliation.json` fehlt, fällt nicht auf. Genau diese Fehlerklasse hat laut `CLAUDE.md` § Manuelle Wikidata-Approvals in Session 34 tragende Datenfehler erzeugt.

### B9. Latenter `NameError` im Fehlerpfad von `test_22`

`tests/test_22_ste_coordinates.py:67,69,72,76` referenzieren `ste_id`, das im Funktionsrumpf nie gebunden wird. Solange der Anker gefunden wird, ist die Zeile unerreichbar. Schlägt der Test an, ersetzt ein `NameError` die Fehlermeldung, die den Befund benennen sollte.

### B10. Toter Fixture-Code in `test_42`

`tests/test_42_performance_role_migration.py:62-69` definiert die Fixtures `auftritte` und `kosmos` über `build_views.extract_auftritte` und `build_views.build_kosmos`. Der Name `build_views` wird in der Datei nirgends gebunden (nur `audit_data` in Zeile 54). Beide Fixtures sind unbenutzt und würden beim ersten Gebrauch mit `NameError` scheitern.

### B11. Vier Redundanzpaare zwischen Modulen

| Invariante | Stelle A | Stelle B |
|---|---|---|
| Record-DFT-Referenz löst gegen ein `skos:Concept` auf | `tests/test_01_schema.py:45-57` | `tests/test_06_frontend_contract.py:265-275` |
| `skos:broader` löst im Graph auf | `tests/test_01_schema.py:34-42` | `tests/test_06_frontend_contract.py:252-263` |
| Kein Record trägt eine abgelöste Datums-Property | `tests/test_04_verknuepfungen.py:198-221` | `tests/test_18_typed_dates.py:67-78` plus `tests/test_30_quality_and_dated_events.py:53-57` |
| `hasPerformance`-Referenz ist im Graph auflösbar | `tests/test_04_verknuepfungen.py:182-195` | `tests/test_28_performance.py:18-24` |

Dazu die Teilmengenbeziehung in `tests/test_26_term_conformance.py`. `test_known_wrong_terms_absent` (Zeile 71) prüft eine Menge von sieben Termen, von denen keiner in `tests/fixtures/rico_agrelon_allowlist.json` steht. `test_all_external_terms_in_allowlist` (Zeile 58) schlägt bei jedem davon bereits an. Der zweite Test kann nicht rot werden, ohne dass der erste rot ist.

Ebenso in `tests/test_33_frontend_data_fresh.py`. Der Test in Zeile 87 vergleicht die beiden `@graph` auf Gleichheit und subsumiert damit die Knotenzahl aus Zeile 69 und die Annotationszahl aus Zeile 77 vollständig.

### B12. Das JSON-Schema ist nach unten offen

`tests/schemas/m3gim_jsonld.schema.json` setzt an keiner Stelle `additionalProperties: false`. Eine unerwartete Property an einem Knoten passiert die Validierung. Die einzige Prüfung in `tests/test_01_schema.py:18` ist damit weniger scharf, als der Modulname nahelegt. Zwei ihrer Zusagen stehen zusätzlich als eigener Test daneben, das `processingStatus`-Enum auch in `tests/test_03_roundtrip.py:46`, die `rico:date`-Gestalt sinngemäß in `tests/test_02_strings.py:60`.

### B13. Der Browser-Smoke degradiert sieben Prüfungen zu WARN, wenn ihre Ausführung scheitert

`tests/frontend/smoke.py` fängt an sieben Stellen jede Ausnahme und schreibt WARN statt FAIL (Zeilen 205, 235, 314, 394, 412, 443, 484). Betroffen sind der Chronik-Jahresraster, die Aggregat-Auflösung, der Cross-View-Filter, der Anker-Record NIM_004_1, die Konvolut-Meta-Chips, der Erschließungs-Toggle und die Duplikat-Prüfung der `@id`. Zusätzlich ist in Zeile 135 ein Konsolenfehler auf einem Tab WARN, während `knowledge/testing.md:382` den Tab-Durchlauf als "keine JS-Errors" beschreibt. Nur ein FAIL setzt den Exit-Code, den `tests/frontend/test_smoke.py:89` auswertet. Ein kaputt gehender Selektor lässt den Smoke-Test still grün werden.

### B14. Zwei xfail-Marker, beide begründet und beide strikt

`pytest -rxX` meldet genau zwei.

- `tests/test_04_verknuepfungen.py:67`, `strict=True`, Grund NIM_168 Folio-Granularität zwischen Objekt- und Verknüpfungstabelle, Source-Fix beim Erschließungsteam offen. Der Grund gilt, der Marker ist korrekt gesetzt.
- `tests/test_24_composer_uniqueness.py:49`, `strict=True`, Grund Beethoven van/von im Werkindex. Der Grund gilt, der Marker ist korrekt gesetzt. Der eingebettete `pytest.skip` bei fehlendem `thefuzz` (Zeile 58) wäre unter einem strikten xfail ein verdeckter Ausfall, `thefuzz` steht aber in `requirements.txt` und ist damit immer vorhanden.

`test_46_vocab_vacancy` trägt keinen Marker mehr, die Docstring in Zeile 18-21 dokumentiert die Aufhebung. `knowledge/testing.md:255` und `:343` führen ihn weiterhin als xfail strict, die Dokumentation ist an dieser Stelle veraltet.

Der einzige echte Skip-Pfad im Standardlauf ist `pytest.importorskip("playwright")` in `tests/frontend/test_smoke.py:15`. Die übrigen `pytest.skip`-Aufrufe (test_20:243, test_20:256, test_22:140, test_33:58, test_33:65, test_45:221) sind Vorbedingungswächter und werden am aktuellen Stand nicht erreicht.

### B15. Laufzeit

Der Smoke-Durchlauf dominiert mit 25,55 s von 31,84 s, also achtzig Prozent des Standardlaufs. Der teuerste Nicht-Browser-Posten ist das Setup von `test_03_roundtrip` mit 1,08 s (Laden der Objekte-XLSX). Alles andere liegt unter 0,3 s. Der Determinismus-Test ist mit `slow` ausgeschlossen. Die Node-Suite braucht für 234 Tests 279 ms.

### B16. Der CSV-Quellpfad ist vollständig ungetestet

`scripts/assemble-verknuepfungen.py` baut die Verknüpfungs-Arbeitsmappe aus den Box-CSV-Exporten und ist von keiner Testdatei importiert oder aufgerufen. Das Skript validiert nichts. Es leitet den Sheetnamen aus dem Dateinamen ab (Zeile 29-38), liest jede Datei als Text (Zeile 55) und schreibt sie unverändert in ein Sheet.

Am aktuellen Stand liefert die zusammengesetzte Mappe über `load_verknuepfungen` 4165 Zeilen mit folgenden Auffälligkeiten.

- 622 Zeilen ohne `typ` und ohne `name`, eine weitere mit `name` und ohne `typ`
- 230 Zeilen mit `typ == 'rolle, vorname nachname sänger*in'`, also einem Erfassungshinweis im Typfeld
- Folio-Werte in vier Mustern, `n` (2115), `n_m` (1285), `n_m_o` (102) und die Bindestrichform `15-1`/`15-2` (46)
- `datenpunkt_id` nahezu leer, nur zwei Zeilen tragen das Muster `n.mm`
- kein Kontrollblatt `Typ-Rollen` in der aktuellen Mappe, die Sheets heißen `Box 5`, `Box 6`, `Box 9`, `Box_01`, `Box_02`, `Box_4`

`tests/test_37_dropdown_export.py:87` prüft, dass Hilfsblätter übersprungen werden, aber gegen eine synthetische Mappe, nicht gegen die echte Sheet-Menge.

## Tabelle je Testdatei

### pytest-Module

| Datei | Zweck | Urteil | Begründung |
|---|---|---|---|
| `test_01_schema.py` | JSON-Schema gegen den Datensatz plus Wohlgeformtheit und Auflösbarkeit der Dokumenttyp-Hierarchie | zusammenlegen | Die beiden DFT-Tests stehen doppelt in `test_06` (B11). Das Schema selbst ist nach unten offen (B12). |
| `test_02_strings.py` | String-Hygiene über alle Werte, keine pandas-Artefakte, keine Mojibake, gestrippte Strings | behalten | Rekursiv, billig, fängt eine reale Importfehlerklasse. |
| `test_03_roundtrip.py` | Jede gültige XLSX-Signatur erreicht den Graph, drei Titel-Anker | behalten | `test_record_count_reasonable` ist schwach, weil Folios den Zähler ohnehin erhöhen; der Signatur-Test trägt die Aussage. |
| `test_04_verknuepfungen.py` | Typ-Mapping XLSX nach RiC-O, Rollenhygiene, Relationenverlust | zusammenlegen und kürzen | Vier Nichtleere-Tests (B4), eine Doppelung zu `test_18` und eine zu `test_28` (B11). Der xfail-Test und die Rollen-Tests bleiben. |
| `test_05_referential.py` | Fonds einmal, `@id` eindeutig, keine Waisen, auflösbare Teilbeziehungen | behalten, eine Funktion reparieren | Fünf tragende Tests, eine Funktion mit totem Rumpf (B7). |
| `test_06_frontend_contract.py` | Output-Annahmen des Loaders, Annotationen, AgRelOn, Finanzen, DFT | behalten | Bestes Kontraktmodul; nur der DFT-Teil ist mit `test_01` zusammenzulegen. |
| `test_07_wikidata.py` | Herkunft und Typisierung der Wikidata-Anreicherung | erweitern | Der Herkunftstest hält nicht, was er verspricht (B8). Die drei Typtests sind in Ordnung. |
| `test_09_baselines.py` | Mindestwerte je Entitätstyp als Schrumpfungssperre | erweitern | Die Fixture ist so veraltet, dass keine realistische Regression mehr anschlägt (B3). |
| `test_10_determinismus.py` | Zwei Pipeline-Läufe in ein eigenes Verzeichnis, Vergleich ohne Zeitstempel | behalten | Sauber gebaut, eigener Ausgabepfad, mit `slow` korrekt ausgeschlossen. |
| `test_11_mobilitaet.py` | Verortungen als Annotationsknoten und die fünf Mobilitätssichten | zusammenlegen und kürzen | Zwei zeichengleiche Tests (B5), drei Sichten-Tests mit Existenz-Assert statt Invariante. |
| `test_12_agrelon.py` | AgRelOn-Namensraum, Arbeitgeber-Relationen, Provenance, Gültigkeitszeitraum | erweitern | Zwei der vier Tests laufen ohne ausgeführten Assert durch (B6). Der Provenance-Test trägt. |
| `test_13_finanzen.py` | Typ, Betrag und Währung der Finanz-Annotationen | behalten | Die Währungsmenge ist die kanonische Stelle, auf die `test_16` zurückgreift. |
| `test_14_parse_units.py` | 82 Unit-Tests der Parse- und Normalisierungshelfer | behalten | Dichtestes und schnellstes Modul der Suite, keine Datenabhängigkeit. |
| `test_15_vocab_coverage.py` | Rollen, Dokumenttypen und Währungen der Quelle gegen `data.md` und die Frontend-Konstanten | behalten | Der Frontend-Kopplungstest ist die einzige lexikalische Brücke zu `constants.js` neben `test_25`. |
| `test_16_roundtrip_finance.py` | Jede Finanzzeile der Quelle exakt im Output | behalten | Zellgenau, keine Toleranz beim Einzelabgleich. |
| `test_18_typed_dates.py` | Jede Datierung hängt an einem Annotationsknoten, keine Rolle im Property-Namen | behalten | Führt die Sperrliste `RETIRED_DATE_PROPS`, auf die `test_04` importiert. |
| `test_19_provenance.py` | Keine Datierungskonfidenz, keine Self-Provenance, Positivkontrolle | zusammenlegen | Vier Negativsperren auf abgelöste Namen; gehören mit den Sperren aus `test_04`, `test_18` und `test_30` in ein Modul. |
| `test_20_xlsx_provenance.py` | `xlsxSource` an Records und Nested Entities, drei kuratierte Anker | behalten | Höchster Wartungsaufwand beim Datenupdate, aber bewusst so (Anker-Strategie). |
| `test_22_ste_coordinates.py` | Koordinaten und Q-ID am `atPlace` der Verortung | behalten, Fehler beheben | Vier gute Prüfungen, ein latenter `NameError` im Fehlerpfad (B9). |
| `test_23_role_hygiene.py` | Kein Ort trägt eine Datumsrolle | behalten | Anker plus globale Form, klassischer Regressionstest zu einem realen Bug. |
| `test_24_composer_uniqueness.py` | Fuzzy-Detektor für Schreibvarianten im Werkindex, xfail strict | behalten | Korrekt als Source-Fix-Signal gebaut, Grund gilt weiter (B14). |
| `test_25_chronik_mobility_cluster.py` | Die Cluster-Tabelle in `constants.js` gegen die belegten Rollen | behalten | Liest `docs/data/m3gim.jsonld` fest statt über die Fixture; wegen `test_33` heute äquivalent, aber unter ENV-Override falsch. |
| `test_26_term_conformance.py` | Externe Terme gegen die kuratierte Allowlist | zusammenlegen | Der zweite Test ist Teilmenge des ersten (B11). |
| `test_27_stage_role.py` | `StageRole` als eigenständige Entität mit ASCII-Slug | behalten | Drei knappe, tragende Prüfungen. |
| `test_28_performance.py` | `Performance` als n-äre Reifikation | zusammenlegen | Die Auflösbarkeit steht doppelt in `test_04` (B11); der `performanceOf`-Test ist eigenständig. |
| `test_30_quality_and_dated_events.py` | Datums-Routing, Dublettenfreiheit, Qualitätsflags, Bearbeitungsnotiz | behalten | Sieben Tests, alle mit Mindestvorkommen versehen. |
| `test_31_dft_vocab.py` | Dokumentvokabular, Sammlung eigenständig, deutsche Labels, Aboutness-Guard | behalten | Der Aboutness-Guard ist die einzige Stelle, die Dokumenttyp und Sachbegriff trennt. |
| `test_32_mobility_events.py` | Datumslose Mobilitäts-Verortungen aus Ortsrollen | behalten | Datenadaptiv formuliert, Mindestvorkommen gesetzt. |
| `test_33_frontend_data_fresh.py` | `docs/data` spiegelt `data/output` | zusammenlegen | Ein Test subsumiert die beiden anderen vollständig (B11). |
| `test_34_rawdata_crosscheck.py` | Zellgenauer Gegencheck JSON-LD gegen die adressierte XLSX-Rohzelle | behalten | Stärkstes Datenmodul der Suite, prüft die Provenienzangabe selbst. |
| `test_35_ste_id_stability.py` | Inhaltsbasiertes `@id`-Schema der Annotationen | behalten | Ergänzt sich sauber mit `test_38_ste_deterministic_ids` (Output gegen Unit). |
| `test_36_index_completeness.py` | Kuratierte Indexspalten erreichen den Datensatz | behalten | Liest die Sollseite über den echten Pipeline-Reader, nicht über den Roh-Header. |
| `test_37_dropdown_export.py` | Unterstrich-Komposit und Hilfsblatt-Filter nach dem Dropdown-Umbau | erweitern | Prüft gegen eine synthetische Mappe; die echte Sheet-Menge und die typ-losen Zeilen bleiben ungeprüft (B16). |
| `test_38_modelling_rules.py` | Bestätigte Modellierungsregeln E-129 bis E-131 | behalten | Mischt Unit-Aufrufe und Output-Anker sauber, prüft auch die Warnung auf `stdout`. |
| `test_38_ste_deterministic_ids.py` | Reihenfolgeunabhängigkeit der `@id`-Vergabe | behalten | Deckt den Punkt ab, den ein Output-Test strukturell nicht zeigen kann. |
| `test_39_date_validity.py` | Kalendarische Gültigkeit aller Datumswerte, Properties aus dem Datensatz ermittelt | behalten | Ermittelt seine Prüfmenge selbst und wächst damit mit dem Modell. |
| `test_40_vocab_gate.py` | `check-coverage.py` als verbindliches Gate | behalten | Mit Wächter gegen den stillen Leerlauf ("OK Vokabular geparst"). |
| `test_41_naming_convention.py` | Groß- und Kleinschreibung im Vokabular | behalten | Liest mit rdflib statt über ein Textmuster. |
| `test_42_performance_role_migration.py` | Auswertende Skripte lesen nur Terme, die der Datensatz führt | behalten, toten Code entfernen | Der Term-Scan über den AST ist ein guter Griff; zwei Fixtures sind tot (B10). |
| `test_43_reconciliation_logic.py` | Fünf Ursachen der Fehlzuordnungen, offline gegen aufgezeichnete Antworten | behalten | Das Modul mit dem klarsten Bezug auf belegte Fehlerursachen. |
| `test_44_approval_signals.py` | Signalvokabular der Approval-Prüfung im selben String-Raum | behalten | Kurz, offline, gegen einen konkreten Fehlschlag geschrieben. |
| `test_45_knowledge_integrity.py` | E-, AF- und QF-Zitate sowie relative Links der Wissensbasis | behalten | Der einzige Wächter gegen lautlose Referenzbrüche in `knowledge/`. |
| `test_46_vocab_vacancy.py` | Kein deklarierter Vokabularterm ohne Belegung oder Begründung | behalten | Gegenrichtung zu `test_40`, Marker korrekt gezogen (B14). |
| `test_47_vocab_reader.py` | Der enge Turtle-Leser der Pipeline gegen rdflib | behalten | Beidseitig geprüft (nichts fehlt, nichts erfunden), inklusive Auflösungsgleichheit. |
| `test_48_model_page.py` | Die ausgelieferte Modellseite ist die Ausgabe des Generators | behalten | Deckt Determinismus, Vollständigkeit und Darstellungsregeln in einem. |
| `test_49_correspondence_author.py` | Die Absenderseite eines Briefes erreicht das Beziehungsnetz, außerhalb der Korrespondenz nicht | behalten | Beide Richtungen geprüft, mit Wächter gegen den Verlust des Gegenstands. |
| `test_50_link_proposals.py` | Verknüpfungsvorschläge aus Titeln, Wortgrenzen und Mehrdeutigkeit | behalten | Prüft ausdrücklich, dass keine Rolle erfunden wird. |
| `test_51_agrelon_roles.py` | Rollenstellen einer AgRelOn-Relation folgen der Ontologie | behalten | Gegen die offizielle Quelle belegt, nicht extrapoliert. |
| `test_52_dating_scope_and_rank.py` | Bezugsebene und Rang stehen im Vokabular, nicht im Frontend | behalten | Enthält den lexikalischen Nachweis, dass das Frontend keine zweite Tabelle führt. |

### Node-Testdateien

| Datei | Zweck | Urteil | Begründung |
|---|---|---|---|
| `catalogue-gaps.test.mjs` | Erschließungsachsen zählen keinen Teilbeleg als vollen Beleg | behalten | Jede Achse einzeln plus Summe gegen den Gesamtbestand. |
| `coverage.test.mjs` | Die Rechnung hinter der Erschließungsgrad-Angabe | behalten | Sechs Fälle für eine Funktion mit zwei Zeilen, angemessen. |
| `date-carrier.test.mjs` | Vier Stellen prüfen die Anwesenheit des Zeitankers | behalten | Erreicht drei Stellen, die vorher im DOM-Pfad eingeschlossen waren. |
| `datings.test.mjs` | Die vier Zugänge zu Datierungen im zusammengeführten Modell | behalten | Synthetische Fixtures und Anker am echten Stand, sauber getrennt. |
| `filter-sync.test.mjs` | Projektion zwischen geteiltem und View-eigenem Filterzustand, Loop-Guard | behalten | Deckt den Endlosschleifen-Fall mit gemocktem `window` ab. |
| `gloss.test.mjs` | Begriffserklärungen wandern aus dem Vokabular ins Frontend | behalten | Enthält den einzigen `t.skip` der Node-Suite, korrekt als Vorbedingung. |
| `loader.test.mjs` | Strecke JSON-LD nach Store, synthetisch und am echten Stand | behalten, erweitern | Die einzige echte Integrationsstrecke der Frontend-Tests. |
| `network-geometry.test.mjs` | Ring, Kategorie, Layout, Ko-Okkurrenz, Komponistenfilter | erweitern | Alle 54 Fälle setzen `kategorie` von Hand; genau dort sitzt der Defekt (B1). |
| `record-partition.test.mjs` | Partition für Korb und Inline-Detail | behalten | Deckt den sonst untestbaren Korb-Pfad ab. |
| `relation-shape.test.mjs` | Beide Bauformen einer AgRelOn-Relation erreichen den Store | behalten | Gegen einen konkreten, benannten stillen Defekt geschrieben. |
| `router.test.mjs` | Legacy-Präfix im URL-Hash | behalten | Sechs Zeilen Prüfung für eine Zeile Code, angemessen. |
| `shared-filter-reach.test.mjs` | Lexikalisches Gate, jede Zeitraum-Sektion hängt am geteilten State | behalten | Ohne Ermessen entscheidbar formuliert, das ist die Stärke. |
| `statistics-data.test.mjs` | Dokumenttyp-Aggregation und drei weitere Aggregationen | erweitern | Drei von vierzehn exportierten Aggregationen sind erreicht; `aggregateDecadesBySicht` wird nur mit sauberen Datumswerten gefüttert (B2). |
| `typed-dates.test.mjs` | Rollenregister des Frontends gegen den Datenstand | behalten | Jede Prüfung wird durch eine eingespielte Verletzung bewiesen, vorbildlich. |
| `utils.test.mjs` | Datumsparser und Formathelfer | behalten | 27 Fälle, keine Datenabhängigkeit. |
| `verknuepfungen-geometry.test.mjs` | Graphaufbau, Layout, geteilter Filterzustand | behalten | Determinismus und Kappungsmeldung ausdrücklich geprüft. |
| `year-anchor.test.mjs` | Ein Zeitanker je Record, in jeder Ansicht derselbe | behalten | Lexikalische und datenseitige Strecke kombiniert. |

### Infrastruktur

| Datei | Zweck | Urteil | Begründung |
|---|---|---|---|
| `tests/conftest.py` | Session-Fixtures für Datensatz, Quellmappen, Normdaten, Baselines | behalten | ENV-Overrides sauber gekapselt; sechs Module umgehen sie trotzdem. |
| `tests/_helpers.py` | `ensure_list`, `iter_strings`, `iter_entities_with_id`, `relation_parties` | behalten | `relation_parties` kapselt die E-149-Fallunterscheidung an einer Stelle. |
| `tests/fixtures/baseline_counts.json` | Mindestwerte je Entitätstyp | erweitern | Stand 2026-04-17, Puffer bis 160 Prozent (B3). |
| `tests/fixtures/rico_agrelon_allowlist.json` | Verifizierte externe Terme mit Quellenangabe | behalten | Provenienz steht im `_provenance`-Feld, Nachpflege ist geregelt. |
| `tests/schemas/m3gim_jsonld.schema.json` | Strukturschema des Datensatzes | erweitern | Nach unten offen, unerwartete Properties passieren (B12). |
| `tests/tools/snapshot_diff.py` | Diff zweier Datensatzstände als Review-Report | behalten | Kein Test, sondern Werkzeug, korrekt außerhalb der Suite. |
| `tests/frontend/smoke.py` | Browser-Durchlauf über alle sichtbaren Tabs mit Ankern und Canaries | erweitern | Sieben Prüfungen degradieren bei Ausführungsfehler zu WARN (B13). |
| `tests/frontend/test_smoke.py` | pytest-Wrapper mit eigenem Server auf freiem Port | behalten | `importorskip` hält den Standardlauf in browserlosen Umgebungen grün. |
| `tests/frontend/_concepts.mjs` | Stellt synthetischen Fixtures die echten Begriffsknoten des Datensatzes voran | behalten | Verhindert eine zweite, im Testcode geführte Vokabulartabelle; genau das richtige Gegenmittel zur verdrahteten Zwischenschicht. |
| `vocab/check-coverage.py` | Abdeckung und Leerstand des Vokabulars, beidseitig | behalten | Ein Einstiegspunkt für Handbefehl und Gate, das war die richtige Entscheidung. |

## Priorisierter Refactoring-Plan

Die Reihenfolge folgt dem Schaden, den der jeweilige Zustand heute anrichtet oder beim anstehenden Datenupdate anrichten wird.

### Stufe 1, vor dem Datenupdate

**S1. Die echte Kette in den Netzwerk-Test ziehen und den Filter reparieren.**
Zuerst ein Test, der `getPersonKategorie` und `isPureComposer` gegen den echten Store hintereinanderschaltet und für eine Liste benannter Personen prüft, dass sie im Netzwerk bleiben. Erst danach der Fix.
- Test: `tests/frontend/network-geometry.test.mjs:43` (Faktory `person()` um einen Modus erweitern, der `kategorie` aus `getPersonKategorie(name)` bezieht), neuer Fall neben `:132`
- Ursache A: `docs/js/data/constants.js:22` (`'wieland wagner'`, `'wolfgang wagner'` in die Komma-Form bringen oder `getPersonKategorie` beide Formen prüfen lassen, `docs/js/utils/normalize.js:28`)
- Ursache B: `docs/js/views/_network-geometry.js:129` (Nachnamen-Token statt `includes`, wie der Kommentar in Zeile 127 es bereits beschreibt)

**S2. Die beiden Zählwege gegeneinander stellen und danach zusammenführen.**
- Test: neue Datei oder Erweiterung in `tests/frontend/statistics-data.test.mjs:70`, die beide Kriterien auf denselben `store.mobilityEvents` anwendet und Gleichheit fordert, mit einem eingespielten `date: '06-09'` als Verletzungsnachweis
- Danach `docs/js/main.js:117` und `docs/js/views/statistics-data.js:250-252` beide auf `extractYear` aus `docs/js/utils/date-parser.js` ziehen, wie `knowledge/handoff.md` § Zwei Zählwege es vorschlägt

**S3. Baselines nachziehen und eine Obergrenze für den erwarteten Sprung setzen.**
- `tests/fixtures/baseline_counts.json:3-10` auf etwa neunzig Prozent des heutigen Ist-Werts setzen, damit die Prüfung wieder greift
- `tests/test_09_baselines.py` bleibt unverändert, die Fixture trägt die Aussage

**S4. Die drei Tests reparieren, die nicht prüfen können, was ihr Name sagt.**
- `tests/test_05_referential.py:63-81` entweder die Folio-Invariante wirklich prüfen oder die Funktion auf ihren einzigen wirksamen Assert kürzen und umbenennen
- `tests/test_07_wikidata.py:35-37` von `overlap` auf `used_qids - recon_qids - index_qids == set()` umstellen, die Indexherkunft dabei ausdrücklich benennen
- `tests/test_22_ste_coordinates.py:67,69,72,76` `ste_id` durch `ste.get("@id")` ersetzen

**S5. Toten und leerlaufenden Code entfernen.**
- `tests/test_42_performance_role_migration.py:62-69` beide Fixtures streichen
- `tests/test_12_agrelon.py:34-75` und `:95-137` entweder auf eine Vorbedingung mit `pytest.skip` umstellen, die sichtbar wird, oder gegen die heute belegten Rollen neu formulieren
- `knowledge/testing.md:342` und `:255`, `:343` an den tatsächlichen Zustand angleichen (B6, B14)

### Stufe 2, Zusammenlegungen ohne Aussageverlust

**S6. Ein Modul für die abgelösten Namen.**
Vier Sperrlisten liegen in vier Modulen. Zusammenlegen in `test_18_typed_dates.py` (dort steht `RETIRED_DATE_PROPS` bereits).
- entfernen: `tests/test_04_verknuepfungen.py:198-221`, `tests/test_30_quality_and_dated_events.py:53-57`
- prüfen und ggf. übernehmen: `tests/test_19_provenance.py:18-24` (`m3gim:dateEvidence`), `tests/test_27_stage_role.py:10-13` (`hasPerformanceRole`)

**S7. DFT-Auflösbarkeit an einer Stelle.**
- `tests/test_01_schema.py:34-42` und `:45-57` streichen, die Aussagen stehen vollständig in `tests/test_06_frontend_contract.py:247-275`
- `test_01` behält damit die reine Schemavalidierung

**S8. Redundante Einzeltests streichen.**
- `tests/test_26_term_conformance.py:71-81` streichen (Teilmenge von `:58-68`)
- `tests/test_33_frontend_data_fresh.py:69-84` streichen (subsumiert von `:87-94`)
- `tests/test_28_performance.py:18-24` streichen (steht in `tests/test_04_verknuepfungen.py:182-195` mit der zusätzlichen StageRole-Prüfung)
- `tests/test_11_mobilitaet.py:43-55` streichen (zeichengleich zu `:106-118`)
- `tests/test_04_verknuepfungen.py:128-145` die vier Nichtleere-Tests zu einem parametrisierten Test mit datenabgeleiteter Untergrenze zusammenziehen, oder ganz an `test_09` abgeben

**S9. Die schwachen Sichten-Tests schärfen.**
- `tests/test_11_mobilitaet.py:144-156` (`assert spielzeit or employer_rels`) und `:158-167` (`has_corr > 0`) auf ein aus der Quelle abgeleitetes Mindestvorkommen umstellen, wie es `test_11:131-141` bereits tut

### Stufe 3, Erweiterungen für die nächste Etappe

**S10. Den CSV-Quellpfad prüfen.**
Neues Modul, etwa `tests/test_53_csv_ingest.py`, gegen `scripts/assemble-verknuepfungen.py`. Zu prüfen sind die Punkte, die das Skript heute ungeprüft durchreicht.
- Sheetnamen-Ableitung und Kollisionsauflösung, `scripts/assemble-verknuepfungen.py:29-38` und `:58-63`
- Datumsformate der Spalte `name` bei `typ` in `{datum, ort_datum, datum_werk}`, strikt gegen die drei in `knowledge/data.md` § 6 zugelassenen Formen plus die drei Qualifier
- Beteiligungs-ID-Muster `n.mm` in `datenpunkt_id`, heute mit zwei Belegen praktisch leer und damit ein reiner Vorgriff auf den neuen Stand
- Folio-Muster, heute vier Varianten inklusive der Bindestrichform `15-1`; der Test entscheidet, welche die Pipeline tragen soll
- `typ` und `rolle` gegen das Kontrollblatt `Typ-Rollen`, sobald der Export es wieder mitliefert; heute fehlt das Blatt in der Mappe (B16)
- typ-lose Zeilen, heute 623, davon eine mit gefülltem `name`; der Test trennt Leerzeile von Datenverlust
- Signaturstümpfe, der `ffill` in `load_verknuepfungen` normalisiert sie heute weg, der Test prüft vor dem `ffill`

**S11. Die Frontend-Kette Store nach View absichern.**
Über den Wagner-Fall hinaus fehlt jede Prüfung, die eine Ansichtsfunktion gegen den echten Store hält.
- Muster: `tests/frontend/loader.test.mjs:288` (Anker am echten Stand) auf die Ansichtsmodule übertragen
- Kandidaten in der Reihenfolge des Risikos: `_network-geometry.js` (B1), `statistics-data.js` mit elf ungetesteten Aggregationen, `entity-map-data.js`

**S12. Den Smoke-Durchlauf ehrlich machen.**
- `tests/frontend/smoke.py:205,235,314,394,412,443,484` von WARN auf FAIL heben, sofern der Check zum vereinbarten Umfang gehört
- `tests/frontend/smoke.py:135` entscheiden, ob ein Konsolenfehler den Lauf brechen soll; `knowledge/testing.md:382` behauptet es bereits
- `knowledge/testing.md:382-383` auf die heutigen Tab-Namen (`karte`, `verknuepfungen`) nachziehen

**S13. Das JSON-Schema schließen.**
- `tests/schemas/m3gim_jsonld.schema.json:24` und die weiteren `$defs` um `additionalProperties: false` ergänzen, dann die dadurch aufgedeckten Properties nachtragen
- danach `tests/test_03_roundtrip.py:46` und der `rico:date`-Anteil von `tests/test_02_strings.py:60` als Doppelung streichbar

## Was beim Datenupdate mechanisch bricht

Der angekündigte Stand bringt etwa hundert Objekte und etwa 1500 Verknüpfungszeilen mehr. Erwartete Reaktionen, getrennt nach gewollt und Wartungslast.

**Gewollt, die Fixture wird nachgezogen.**
- `tests/test_20_xlsx_provenance.py:26-45`. Die drei Anker pinnen `xlsx_row` auf 122, 44 und 38. Jede eingeschobene Zeile davor bricht sie. Das ist die dokumentierte Anker-Strategie (`knowledge/testing.md:324`).
- `tests/test_38_ste_deterministic_ids.py:100-104`. Zwei `@id`-Anker mit sha1-Hash. Sie brechen nur, wenn sich Ort, Rolle oder Datum an diesen Records ändern, also zu Recht.
- `tests/test_22_ste_coordinates.py:25-33`, `tests/test_23_role_hygiene.py:63-67`, `tests/test_36_index_completeness.py:126,155`. Namentliche Anker, brechen bei Umerfassung des jeweiligen Records.
- `tests/frontend/smoke.py:34-36` und `:349`, `tests/frontend/loader.test.mjs:288`, `tests/frontend/record-partition.test.mjs:236`. Titel- und Record-Anker im Frontend.

**Wartungslast ohne Aussagegewinn.**
- `tests/test_09_baselines.py` samt Fixture. Steigt lautlos mit, ohne je anzuschlagen (B3).
- `tests/test_11_mobilitaet.py:53,116` und `tests/test_16_roundtrip_finance.py:103`. Prozentschwellen von 60 und 80 Prozent gegen die Quellzeilenzahl. Wächst der Anteil verwaister Signaturen im neuen Stand, brechen sie ohne Pipeline-Fehler.
- `tests/test_11_mobilitaet.py:88-95` und `tests/test_15_vocab_coverage.py:60-97`. Handgeführte Rollenmengen. Jede neue Rolle im Export bricht sie, was `knowledge/testing.md:317` als koordinierten xfail-Carve-out vorwegnimmt.
- `tests/test_25_chronik_mobility_cluster.py:99-110`. Jede neue Rolle muss in `constants.js` eingetragen werden, bevor die Suite wieder grün ist.

**Neu bewertbar.**
- Der Komposittyp `'rolle, vorname nachname sänger*in'` mit heute 230 Zeilen ist ein Erfassungshinweis im Typfeld und wird von `decompose_komposit_typ` in eine Rolle und einen unbekannten Zweig zerlegt. Ob der neue Stand das bereinigt, entscheidet, ob hier ein Test oder ein Source-Fix hingehört.

## Einschätzungen

Diese Punkte sind Bewertung, nicht Nachweis.

Die Suite hat kein Mengenproblem. 52 Module bei 895 Records und einem sechsstelligen Zellbestand sind nicht zu viel, und die Nummerierung als stabile ID statt als Index war die richtige Entscheidung. Was fehlt, ist nicht Konsolidierung um ihrer selbst willen, sondern die Trennung zweier Sorten von Modulen, die heute vermischt sind. Die eine Sorte prüft eine Modellinvariante am Output und ist bei einem Modellschnitt vollständig zu überarbeiten. Die andere prüft eine Rechenregel als Unit und überlebt jeden Schnitt. `test_14`, `test_38_ste_deterministic_ids`, `test_43`, `test_44` und `test_47` gehören zur zweiten Sorte und sind die stabilste Substanz der Suite.

Die Frontend-Tests sind jünger und in der Konstruktion durchgehend besser als die Pipeline-Tests. Mehrere Node-Module (`typed-dates`, `relation-shape`, `catalogue-gaps`, `date-carrier`) benennen im Kopf ausdrücklich den stillen Defekt, gegen den sie stehen, und weisen ihre Prüfung durch eine eingespielte Verletzung nach. Dieses Muster ist auf die Pipeline-Seite übertragbar und würde dort mehr bringen als jede Zusammenlegung.

Der Anteil der Tests, die auf einen einzelnen Datenstand kalibriert sind, ist höher, als die Autorenregel in `knowledge/testing.md:307` vorsieht. Die Regel verlangt, Untergrenzen zur Laufzeit aus der Quelle abzuleiten. Tatsächlich stehen an mindestens zwanzig Stellen feste Zahlen (`>= 10`, `>= 20`, `>= 50`, `>= 200`, `>= 250`, `>= 500`). Solange sie deutlich unter dem Ist liegen, sind sie harmlos, aber sie leisten weniger, als die Autorenregel verspricht.

Der Browser-Smoke ist mit achtzig Prozent der Laufzeit teuer, trägt aber die einzigen Aussagen über das gerenderte Dokument. Die Zeit ist gerechtfertigt, sobald die WARN-Ausweichpfade geschlossen sind. Vorher zahlt der Lauf 25 Sekunden für eine Zusage, die er im Fehlerfall nicht einlöst.

## Punkte für eine Operatorentscheidung

1. **Baseline-Politik.** Sollen die Mindestwerte nach jedem Datenupdate auf etwa neunzig Prozent des Ist nachgezogen werden (dann fangen sie Regressionen und kosten je Update einen Handgriff), oder ist die Schrumpfungssperre als grobe Kollaps-Erkennung gemeint (dann können die Werte stehen bleiben und `test_09` schrumpft auf zwei Prüfungen)?

2. **WARN oder FAIL im Smoke-Durchlauf.** Sieben Prüfungen degradieren heute bei Ausführungsfehler zu WARN, ein Konsolenfehler ebenfalls. Sollen sie den Lauf brechen? Die Entscheidung bestimmt, ob der Smoke-Test ein Gate oder ein Bericht ist.

3. **Folio-Muster im CSV-Pfad.** Die Quelle führt heute vier Muster, darunter die Bindestrichform `15-1`. Soll der neue Test die Bindestrichform als gültig aufnehmen, als Quellfehler ans Erschließungsteam durchreichen oder in der Pipeline normalisieren? Nach der Durchreich-Policy in `knowledge/testing.md:303` wäre es ein Quellfehler, die Pipeline trägt aber bereits Varianten.

4. **Typ-lose Zeilen.** 622 Zeilen ohne `typ` und ohne `name` sind Leerzeilen des Exports, eine Zeile trägt einen Namen ohne Typ. Ist die eine Zeile ein Quellfehler mit Registereintrag oder ein zulässiger Zustand?

5. **Kontrollblatt Typ-Rollen.** Die aktuelle Mappe enthält es nicht. Soll der geplante Test es als Pflichtblatt fordern (dann bricht er, bis der Export es wieder mitliefert) oder als optionale Schärfung behandeln?

6. **Der Erfassungshinweis im Typfeld.** `'rolle, vorname nachname sänger*in'` steht in 230 Zeilen als Typwert. Source-Fix oder Pipeline-Workaround mit Registereintrag?

7. **`knowledge/testing.md` als Pflege-Gegenstand.** Das Dokument beschreibt die Suite bis `test_46` und kennt die Module 47 bis 52 sowie zehn der siebzehn Node-Dateien nicht. Es führt zwei Ausnahmen (`test_46` als xfail, `test_12` als skip), die nicht mehr zutreffen. Soll die Modulliste weiter von Hand geführt werden, oder tritt an ihre Stelle ein aus der Suite erzeugter Abschnitt?
