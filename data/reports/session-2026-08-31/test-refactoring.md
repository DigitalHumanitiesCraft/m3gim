# Test-Refactoring nach dem Audit

Ausgeführt am 2026-08-31 gegen `c:\Users\Chrisi\Documents\GitHub\DHCraft\m3gim`, Branch main, Ausgangspunkt HEAD d75f23d. Geändert wurden dreizehn Dateien unter `tests/*.py` und `knowledge/testing.md`. Unberührt sind `tests/fixtures/baseline_counts.json`, `tests/test_09_baselines.py`, `tests/frontend/`, `scripts/`, `docs/`, `vocab/` und `data/`. Kein Commit, kein Staging.

## Laufzahlen

| Zeitpunkt | Umfang | Ergebnis |
|---|---|---|
| 19:07, vor der Arbeit | `pytest tests/ -m "not slow" --ignore=tests/frontend` | 354 passed, 1 deselected, 2 xfailed |
| 19:19, nach der Arbeit, laufender Baum | `pytest tests/ -m "not slow"` | 4 failed, 329 passed, 2 xfailed, 16 errors |
| 19:23, nach der Arbeit, HEAD-konsistente Quelle | `pytest tests/ -m "not slow" --ignore=tests/test_60_csv_source.py` | 349 passed, 1 deselected, 2 xfailed |
| 19:24 | `node --test tests/frontend/*.test.mjs` | 254 pass, 0 fail |

Der zweite Lauf ist nicht aussagekräftig, weil die parallel arbeitende Übernahme-Instanz um 19:19:04 die Quelldaten gewechselt hat; die Klassifikation der Ausfälle steht weiter unten. Belastbar ist der dritte Lauf. Er setzt `M3GIM_SHEETS_DIR` auf eine Kopie der Arbeitsmappen aus HEAD im Scratchpad und misst damit denselben Datenstand, gegen den das Audit geschrieben wurde. Er ist vollständig grün, bis auf die beiden bekannten strikten xfail-Marker.

Die Zahl der Testfunktionen sinkt um sechs, von 356 auf 350 im Vergleich ohne Browserteil. Die Aufschlüsselung lautet test_01 minus zwei, test_11 minus eine, test_26 minus eine, test_28 minus eine, test_33 minus zwei, test_05 plus eine (der tote Rumpf wurde in zwei benannte Tests getrennt), test_04 unverändert (vier Nichtleere-Tests durch vier parametrisierte Fälle ersetzt).

## Schritt 1, die zu schwachen Tests

### Vier Nichtleere-Tests in test_04 (B4)

Vorher `tests/test_04_verknuepfungen.py:128-145`, vier Funktionen der Form `assert len(...) > 0`. Nachher `tests/test_04_verknuepfungen.py:129-166`, ein parametrisierter Test `test_typ_reaches_output` über die vier mengenstarken Basis-Typen, mit einer zur Laufzeit aus der Quelle gebildeten Untergrenze von sechzig Prozent der Zeilenzahl (`_MIN_YIELD` in Zeile 140).

Die Datendeckung wurde vor der Umsetzung gemessen. Person kommt auf 1316 Quellzeilen und 984 Entities (Ausbeute 0,748), institution auf 249 und 236 (0,948), ort auf 279 und 336 (1,204), werk auf 284 und 271 (0,954). Die Schwelle von sechzig Prozent trägt den Abstand bei person, der durch die Umsortierung der Rolle `erwähnt` nach `rico:hasOrHadSubject` entsteht, und entspricht der Schwelle, die test_11 für die Verortungen führt.

Der Nachweis ist geführt. Bei einem simulierten Verlust der Hälfte aller Person-Agents meldet die neue Fassung „typ='person': nur 484 rico:Person-Entities … für 1316 Quellzeilen (unter 60%)", während die alte Fassung mit 484 Agents grün bleibt.

Eine Nebenwirkung ist zu vermerken. Der Test hängt jetzt an der Fixture `xlsx_verknuepfungen`, so wie test_11, test_15 und test_16 es bereits tun. Fehlt die Quelle, meldet er einen Fixture-Fehler statt zu bestehen. Das ist die Konsequenz der Autoren-Regel, Untergrenzen aus der Quelle abzuleiten.

### Zwei assert-lose Tests in test_12 (B6)

Vorher `tests/test_12_agrelon.py:34` mit `actual >= 0` und `:95` mit einer Schleife ohne Durchlauf und unerreichbarem Skip-Zweig. Nachher tragen beide eine sichtbare Vorbedingung, `tests/test_12_agrelon.py:73` und `:145`.

Der Befund B6 ist am heutigen Datenstand nur teilweise reproduzierbar. Das Audit maß null Zeilen mit `typ == institution` und `rolle == arbeitgeber`; die Quelle führt zwei solche Zeilen, beide mit dem Rohwert `arbeitgeber:in`. Der Test normalisiert dieses Suffix, die Audit-Messung offenbar nicht. Am HEAD-Stand ist `matchable == 2` und `checked == 2`, beide Tests führen also einen echten Assert aus. Die eingezogenen Wächter bleiben trotzdem die richtige Fassung, weil sie ein künftiges Leerlaufen sichtbar machen, statt es als grünen Test zu verbuchen.

Der Nachweis ist geführt. Mit entfernten arbeitgeber-Zeilen beziehungsweise entferntem `agrelon:metadataPeriod` melden beide Tests einen Skip, dessen Text die fehlende Vorbedingung benennt.

### Toter Funktionsrumpf in test_05 (B7)

Vorher `tests/test_05_referential.py:63-81`, eine Schleife, deren Befundzweig mit `pass` endet, dazu ein artfremder Nachsatz über Konvolut-Kinder. Nachher `tests/test_05_referential.py:62-109` als `test_folio_records_have_konvolut_parent` und `:112-121` als `test_konvolute_have_children`.

Die neue Fassung prüft die Invariante, die der Name behauptet, in der Formulierung der Datengrundlage. Ein Record, dessen `rico:identifier` eine Folio-Angabe führt, hängt als `rico:hasOrHadPart` an genau dem Konvolut mit der bloßen Signatur. Am HEAD-Stand trifft das 693 von 895 Records ohne einen einzigen Verstoß. Ein Mindestvorkommen von der Hälfte aller Records (Zeile 90) verhindert, dass der Test bei einem Einbruch der Hierarchie leer läuft. Die alte @id-Regex war für diese Aufgabe unbrauchbar, weil sie auch 207 Konvolut-Kennungen wie `m3gim-data:NIM_003` traf.

Der Nachweis ist geführt. Entfernt man ein Folio-Kind aus einem Konvolut, meldet die neue Fassung „1 von 693 Folio-Records ohne passenden Konvolut-Parent", während die alte grün bleibt.

### Herkunftstest in test_07 (B8)

Vorher `tests/test_07_wikidata.py:24-37` mit der bloßen Prüfung, dass die Schnittmenge nicht leer ist. Nachher `tests/test_07_wikidata.py:37-52` als Fixture `index_qids` und `:56-85` als Test. Gefordert ist jetzt `used_qids - recon_qids - index_qids == set()`, und die zweite zulässige Herkunft ist ausdrücklich benannt.

Die Indexherkunft ist belegt. Sechs Q-IDs im Output stehen nicht in `wikidata-reconciliation.json` und stammen sämtlich aus der Spalte `wikidata_id` der Index-Arbeitsmappen, nämlich Q157596 und Q681931 aus dem Organisationsindex, Q60452 und Q94208 aus dem Personenindex sowie Q190891 und Q723407 aus dem Werkindex. Gelesen wird über den kanonischen Pipeline-Reader `load_index`, wie test_36 es tut; der Roh-Header bleibt außen vor, weil er die Header-Shift-Korrektur nicht kennt.

Der Nachweis ist geführt. Eine eingespielte Fehlzuordnung nach dem Muster von Session 34 (Q2861, Rostock statt Bayreuth) meldet „1 Q-IDs im Output ohne Herkunft in Reconciliation oder Index-XLSX: ['Q2861']", während die alte Fassung grün bleibt.

### Latenter NameError in test_22 (B9)

Vorher referenzieren `tests/test_22_ste_coordinates.py:67,69,72,76` ein nirgends gebundenes `ste_id`. Nachher bindet Zeile 66 die Kennung aus dem gefundenen Knoten.

Der Nachweis ist geführt. Mit einer verfälschten Q-ID am Anker meldete die alte Fassung `NameError: name 'ste_id' is not defined`, die neue meldet „m3gim-data:ev_NIM_004_24_67319b11: atPlace.@id='wd:Q9999999', erwartet 'wd:Q72'".

### Zwei tote Fixtures in test_42 (B10)

Vorher `tests/test_42_performance_role_migration.py:62-69` mit den Fixtures `auftritte` und `kosmos` über ein nirgends gebundenes `build_views`. Nachher entfernt; die Datei enthält den Namen `build_views` nicht mehr. Beide Fixtures waren unbenutzt und wären beim ersten Gebrauch mit `NameError` gescheitert.

## Schritt 2, die fünf verlustfreien Zusammenlegungen

Verlustfrei heißt hier, dass jede gestrichene Aussage in der verbleibenden Fassung enthalten oder schärfer gefasst ist. Das wurde je Paar einzeln geprüft.

Die DFT-Auflösbarkeit wandert von test_01 nach test_06. Gestrichen ist `tests/test_01_schema.py:23-57`, verbleibend `tests/test_06_frontend_contract.py:247-283`. Die verbleibende Fassung ist in drei Punkten schärfer, sie fordert mindestens zehn Concepts statt Nichtleere, beanstandet ein `skos:broader`, das kein Objekt ist, und prüft die Record-Referenzen ohne den Präfixfilter `m3gim-vocab:`. Die einzige Aussage, die test_06 nicht führte, war die Präsenz von `skos:prefLabel` an jedem `skos:Concept`; sie ist als `tests/test_06_frontend_contract.py:257-258` mitgezogen. Ein Verlass auf test_31 wäre eine Schwächung gewesen, weil dessen Prüfung nur Concepts mit dem Präfix `m3gim-vocab:` erfasst, was heute zufällig auf alle 77 zutrifft. test_01 trägt jetzt allein die Schemavalidierung.

Die zeichengleichen Tests in test_11 sind zusammengelegt. Gestrichen ist `tests/test_11_mobilitaet.py:43-55`, verbleibend `tests/test_11_mobilitaet.py:91-110`. Der einzige Unterschied der beiden war der absolute Boden `max(5, ...)`; er ist in die verbleibende Fassung übernommen, ebenso der Spaltenwächter `if "typ" in df.columns`.

Die Teilmenge in test_26 ist entfallen. Gestrichen ist `tests/test_26_term_conformance.py:71-81`, verbleibend `tests/test_26_term_conformance.py:58-75`. Belegt wurde, dass keiner der sieben verbotenen Terme in `tests/fixtures/rico_agrelon_allowlist.json` steht; der Allowlist-Test schlägt bei jedem von ihnen also bereits an. Die Docstring des verbleibenden Tests hält das jetzt fest.

Die Subsumtion in test_33 ist aufgelöst. Gestrichen ist `tests/test_33_frontend_data_fresh.py:69-84`, verbleibend `tests/test_33_frontend_data_fresh.py:69-85`. Gleichheit der beiden `@graph` impliziert Gleichheit der Knotenzahl und der Annotationszahl. Beide Größen stehen jetzt in der Fehlermeldung des verbleibenden Tests, damit ein roter Lauf weiterhin zeigt, ob Knoten fehlen oder nur Werte abweichen.

Die Doppelung zwischen test_04 und test_28 ist beseitigt. Gestrichen ist `tests/test_28_performance.py:18-24`, verbleibend `tests/test_04_verknuepfungen.py:203-216`. Die verbleibende Fassung prüft zusätzlich, dass die `hasStageRole`-Referenz der Performance auf einen existierenden `StageRole`-Knoten zeigt. Der dadurch unbenutzte Import `ensure_list` ist aus test_28 entfernt.

## Schritt 3, Komposit-Trenner in test_16

`tests/test_16_roundtrip_finance.py:53-62`. Vorher `raw_typ.strip().lower().split(",")[0].strip()`, nachher `re.split(r"[,_]", raw_typ.strip().lower())[0].strip()`, mit `import re` in Zeile 14.

Der Fehlalarm ist gezeigt. Die Quelle führt heute nur die Kommaform, also `einnahmen, währung` mit 37 Zeilen, `ausgaben, währung` mit 12 und `summe, währung` mit 7. Auf die Unterstrichform des Dropdown-Exports, die test_37 bereits festhält, lieferte die alte Fassung `einnahmen_währung` als Grundtyp. Dieser Wert trifft kein `detailField` im Output, womit `test_each_finance_row_reachable_in_output` jede Finanzzeile des neuen Exports als fehlend gemeldet hätte. Nachher lösen beide Formen auf `einnahmen`, `ausgaben` und `summe` auf.

## Schritt 4, knowledge/testing.md

Version 0.4 auf 0.5, `updated` auf 2026-08-31.

Aufgenommen sind die Module 47 bis 52 im Strukturbaum und als eigene Abschnitte, also der Vokabular-Leser, die Modellseite, die Absenderseite der Korrespondenz, die Verknüpfungsvorschläge, die AgRelOn-Rollenstellen sowie Bezugsebene und Rang. Die Fixture `rico_agrelon_allowlist.json` steht jetzt ebenfalls im Baum.

Der Abschnitt zu den Node-Dateien führte sechs von achtzehn. Er führt jetzt alle achtzehn mit ihrem Gegenstand, dazu die Fixture-Hilfe `_concepts.mjs`. Enthalten ist auch `event-year-count.test.mjs`, das noch ungetrackt im Baum liegt und aus der Arbeit der parallelen Instanz stammt; benennt sie die Datei um, ist der Eintrag nachzuziehen.

Korrigiert sind die überholten Ausnahmen. test_46 trägt in Überschrift und Ausnahmenliste keinen xfail-Marker mehr, die Docstring des Moduls dokumentiert die Aufhebung bereits. Der Eintrag zu `test_has_employer_relations_from_arbeitgeber` als stehender Skip ist entfallen und durch die Beschreibung der neuen, sichtbaren Vorbedingung ersetzt. Die Ausnahmenliste nennt jetzt beide tatsächlich vorhandenen xfail-Marker (test_04 NIM_168, test_24 Beethoven) und den einzigen real greifenden Skip-Pfad, `importorskip("playwright")`. Der Abschnitt „Stand" nennt keine Partitur-Skips und keinen NIM_11-Skip mehr.

Die Tab-Namen und Stempel sind auf den realen Stand gezogen. Der Smoke-Abschnitt führte `mobilitaet` und eine Sieben-Tab-Menge; er führt jetzt die reale `VISIBLE_TABS`-Menge aus `docs/js/ui/router.js` mit `karte` und `verknuepfungen` sowie die tatsächlichen `stamp_expectations` aus `tests/frontend/smoke.py`, einschließlich der seither hinzugekommenen Schlüssel bei `chronik`, `statistik` und `karte`. Ergänzt ist die Feststellung, dass sieben Prüfungen bei einem Ausführungsfehler zu WARN abfallen und der Durchlauf dadurch still grün werden kann; dass dies eine offene Operator-Entscheidung ist, steht dabei.

Die Baseline-Politik ist als Prosa in § 9 festgehalten. Die Projektleitung hat am 2026-08-31 entschieden, dass die Mindestwerte nach jedem Datenupdate auf etwa neunzig Prozent des dann erreichten Ist nachgezogen werden; die Begründung nennt, warum ein stehender Wert die Schrumpfungssperre wertlos macht. Schritt 8 im Workflow bei Daten-Updates verweist darauf und ist von „ggf. anpassen" auf verbindlich umgestellt. Die Werte in `tests/fixtures/baseline_counts.json` sind unverändert, das Nachziehen bleibt beim Übernahme-Paket.

Weiter nachgezogen wurden die Abschnitte zu den in Schritt 1 und 2 geänderten Modulen, also 1, 4, 5, 7, 11, 12, 16, 26 und 28, jeweils mit dem Datum der Änderung.

## Klassifikation der Ausfälle im laufenden Baum

Der Lauf um 19:19 zeigt 4 Fehlschläge, 16 Fehler und zusätzlich 12 Fehlschläge in `tests/test_60_csv_source.py`. Keiner davon geht auf meine Änderungen zurück.

Die parallel arbeitende Übernahme-Instanz hat um 19:19:04 den Quellstand gewechselt. `data/google-spreadsheet/M3GIM-Verknüpfungen.xlsx` ist gelöscht und durch das Verzeichnis `data/google-spreadsheet/verknuepfungen/` mit CSV-Ausfuhren je Blatt ersetzt (E-152, in `knowledge/data.md` verankert). Die vier Index-Arbeitsmappen und die Objekttabelle sind ebenfalls neu. `data/output/m3gim.jsonld` trägt noch den alten Stand, die Pipeline lief also noch nicht gegen die neue Quelle.

- Die 16 Fehler sind sämtlich `FileNotFoundError: Keine Verknüpfungs-XLSX in data/google-spreadsheet` aus der Fixture `xlsx_verknuepfungen` in `tests/conftest.py:92-106`. Betroffen sind test_04, test_11, test_12, test_15, test_16, test_34 und test_37, also jedes Modul, das die Quelltabelle liest. Vier davon sind meine neuen parametrisierten Fälle in test_04, die diese Abhängigkeit mit der Untergrenze aus der Quelle neu eingegangen sind.
- Die vier Fehlschläge in test_03, test_34 und test_36 sind Wertabweichungen zwischen der neuen Index- und Objekttabelle und dem alten JSON-LD, etwa `Wagner, Wieland: 'Regisseur' != 'regisseur'` und `Weber, Ludwig: 'Sänger' != 'Sänger:in'`.
- Die zwölf Fehlschläge in `tests/test_60_csv_source.py` sind `ImportError`. Das Modul ist die TDD-Spec der parallelen Instanz für den CSV-Quellpfad und wartet auf das zugehörige Skript unter `scripts/`.
- Ein weiterer Fehlschlag um 19:07, `test_45_knowledge_integrity::test_every_citation_resolves` mit `E-152` ohne Definition, hat sich im Verlauf der Sitzung von selbst erledigt, nachdem die parallele Instanz die Entscheidung in `knowledge/architecture-decisions.md` nachgetragen hat.

Nichts außerhalb meines Schreibbereichs wurde angefasst.

## Was für das Übernahme-Paket offen bleibt

Die Untergrenze in `tests/test_04_verknuepfungen.py:140` und die Mindestvorkommen in `tests/test_05_referential.py:90` und `tests/test_07_wikidata.py:75` sind gegen den HEAD-Stand kalibriert und tragen dort deutlichen Abstand. Ob sie den neuen CSV-Stand ohne Korrektur mittragen, ist erst nach einem Pipeline-Lauf gegen die neue Quelle prüfbar.

Die Fixture `xlsx_verknuepfungen` in `tests/conftest.py:92-106` sucht ausschließlich nach den beiden XLSX-Dateinamen. Solange sie nicht auf den CSV-Pfad umgestellt ist, laufen sieben Module in einen Fixture-Fehler. Das liegt beim Übernahme-Paket.

Die Baseline-Werte in `tests/fixtures/baseline_counts.json` sind auf Weisung unverändert geblieben und nach der neuen Politik auf etwa neunzig Prozent des neuen Ist zu setzen.
