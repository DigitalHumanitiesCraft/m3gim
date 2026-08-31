# Probelauf der Pipeline auf dem Export vom 2026-08-31

Isolierter Trockenlauf gegen den neuen Export des Erschließungsteams, verglichen mit dem Altstand vom 2026-06-22. Das Repository wurde nicht verändert.

## Aufbau

Quell-, Ausgabe- und Reportverzeichnis liegen vollständig im Scratchpad, gesetzt über die drei ENV-Overrides pro Prozessaufruf.

| Rolle | neu | alt |
|---|---|---|
| `M3GIM_SHEETS_DIR` | `scratchpad/new-export` | `scratchpad/old-export` |
| `M3GIM_OUTPUT_DIR` | `scratchpad/pipeline-new/output` | `scratchpad/pipeline-old/output` |
| `M3GIM_REPORTS_DIR` | `scratchpad/pipeline-new/reports` | `scratchpad/pipeline-old/reports` |

`wikidata-reconciliation.json` und `wikidata-enrichment.json` wurden vorab aus `data/output/` in beide isolierten Ausgabeverzeichnisse kopiert. Die in `knowledge/pipeline-architecture.md` § Falle beschriebene stille Entwertung ist damit ausgeschlossen; beide Läufe melden `Reconciliation: 383 bzw. 385 Q-IDs ergaenzt` und `Enrichment: 379 Entitaeten`, keine der beiden Hinweiszeilen `nicht vorhanden (uebersprungen)` erscheint.

Der Altlauf reproduziert das versionierte Artefakt bitgenau in allen geprüften Kennzahlen (Graph 2289, Records 913, verknüpft 151, identische `@type`-Verteilung wie `data/output/m3gim.jsonld`). Der Vergleich alt gegen neu misst damit die Datenänderung und keinen Aufbaufehler.

Die Datei `M3GIM-Verknüpfungen.download-altform.xlsx.bak` und `Verknüpfungstabelle neu - Box 1.csv` im Quellverzeichnis werden von keinem Schritt gelesen. `scripts/transform.py:2062` liest den festen Namen `M3GIM-Verknüpfungen.xlsx`, `scripts/validate.py:575` globbt auf `*.xlsx`, `scripts/explore.py:716` ebenso; alle drei melden übereinstimmend sechs Dateien.

## Ausführung und Exitcodes

| Schritt | Stand | Exit | Ergebnis |
|---|---|---|---|
| `explore.py` | neu | 0 | Report geschrieben, 5 Warnungen |
| `validate.py` | neu | 1 (Abbruch) | `AttributeError` vor dem Report |
| `validate.py` (gepatchte Kopie) | neu | 1 | 1266 Fehler, 798 Warnungen |
| `validate.py` | alt | 1 | 1120 Fehler, 956 Warnungen |
| `transform.py` | neu | 0 | 1000 Records, 19 Konvolute, Graph 2982 |
| `transform.py` | alt | 0 | 895 Records, 17 Konvolute, Graph 2289 |

`build-views.py` wurde bewusst nicht ausgeführt, weil es bei abweichendem `M3GIM_OUTPUT_DIR` ohnehin nichts kopiert und der einzige Zielpfad `docs/data/` im Repository liegt. `audit-data.py` und `report-quality.py` lesen die Default-Pfade fest aus dem Repository-Wurzelverzeichnis und wurden aus demselben Grund ausgelassen; die Verknüpfungsrate ist unten aus dem JSON-LD nachgerechnet, mit derselben Zählregel wie `scripts/report-quality.py:53`.

## Abbruch in validate.py

```
File "scripts/validate.py", line 239, in validate_objekte
    if col.lower() in ['folio', 'unnamed: 2']:
AttributeError: 'int' object has no attribute 'lower'
```

Ursache. Die erste Spalte der neuen `M3GIM-Objekte.xlsx` trägt statt `box_nr` den Integer `1` als Kopfzelle. `main()` lowercased die Spaltennamen mit einem `isinstance`-Schutz (`scripts/validate.py:560`), der nicht-textuelle Kopf bleibt also als `int` erhalten und schlägt zwei Funktionen später durch.

Genau dieser Fall ist in `scripts/transform.py:2036-2044` bereits abgefangen, der Kommentar dort nennt ihn wörtlich als E-95-Befund. Die Absorption wurde in `validate.py` nie nachgezogen.

Minimaler Fix, im Repository nicht angewendet.

```python
# scripts/validate.py:239
if isinstance(col, str) and col.lower() in ['folio', 'unnamed: 2']:
```

Angewendet wurde er auf eine Kopie unter `scratchpad/patched-scripts/validate.py`, mit der beide Validierungsläufe gefahren wurden. Sonst ist die Kopie unverändert; `_common.py` und `transform.py` liegen als unveränderte Kopien daneben, `M3GIM_VOCAB_PATH` zeigt auf das Vokabular im Repository.

Zweiter Befund am selben Ort, ohne Patch belassen. Die Folio-Erkennung in `validate.py:239` kennt nur `folio` und `unnamed: 2`, während `transform.py:2044` zusätzlich `folio nr` und `folio_nr` akzeptiert. Die aktuelle Spalte heißt in beiden Exporten `folio nr`, also findet `validate.py` keine Folio-Spalte und bildet die Objekt-ID allein aus der Signatur. Jede Folio eines Konvoluts wird dadurch zum Duplikat. Das erklärt 699 von 1120 Fehlern im Altstand und 798 von 1266 im neuen Stand; die Zahl ist in beiden Läufen ein Artefakt und kein Quellbefund. Da der Defekt beide Stände gleich trifft, bleibt der Vergleich tragfähig.

## Validierungsreports alt gegen neu

Gezählt aus den Abschnitten „Vollstaendige Fehlerliste" und „Vollstaendige Warnungsliste", also ohne die Dopplung durch den Blocker-Auszug.

| Code | Tabelle | alt | neu | Bedeutung |
|---|---|---|---|---|
| E001 | Objekte | 699 | 798 | Artefakt der fehlenden Folio-Erkennung, siehe oben |
| E004 | Objekte | 41 | 41 | Dokumenttyp außerhalb des Vokabulars, unverändert |
| E004 | Verknuepfungen | 380 | 425 | Verknüpfungstyp außerhalb des Vokabulars |
| E005 | Verknuepfungen | 0 | 2 | Signatur ohne Objektsatz |
| W001 | Objekte | 247 | 256 | Pflichtfeld `titel` leer |
| W002 | Objekte | 30 | 29 | Datumsformat nicht ISO 8601 |
| W004 | Verknuepfungen | 679 | 513 | Name in keinem Index |

Die 45 zusätzlichen E004 in den Verknüpfungen sind sämtlich neue Typwerte.

| Typwert | Zeilen | Verhalten der Pipeline |
|---|---|---|
| `einnahmen_währung` | 32 | wird korrekt zu `einnahmen` zerlegt |
| `summe_währung` | 3 | wird korrekt zu `summe` zerlegt |
| `ausgaben_währung` | 2 | wird korrekt zu `ausgaben` zerlegt |
| `ort_datum` | 1 | wird korrekt zu `ort` + `datum` zerlegt |
| `Aktivität` | 6 | kein Zielzweig, Zeile fällt still weg |

Die vier Unterstrich-Varianten sind für `transform.py` unproblematisch, weil `decompose_komposit_typ` (`scripts/transform.py:1013`) auf `[,_]` trennt. `validate.py` kennt den Unterstrich als Trenner nicht und meldet sie als Vokabularverstoß. Der Befund ist also validatorseitig, nicht datenseitig.

Der Rückgang bei W004 kommt aus dem gewachsenen Personenindex. Im Altstand entfielen 331 der 679 Warnungen auf `Name nicht im personenindex gefunden`, im neuen Stand keine einzige. Die verbleibenden 513 verteilen sich auf Organisationsindex (203), Ortsindex (174) und Werkindex (136), betreffen also die drei Indizes, die dem Zuwachs der Verknüpfungstabelle nicht gefolgt sind.

Die zwei neuen E005 tragen beide die abgeschnittene Signatur `UAKUG/NIM_` ohne Konvolutnummer.

## JSON-LD alt gegen neu

`python tests/tools/snapshot_diff.py data/output/m3gim.jsonld <neu>` läuft mit Exit 0 durch.

```
Records               895 →   1000  (+105)
Konvolute              17 →     19  (+2)
Persons               128 →    158  (+30)
Locations              58 →     82  (+24)
Verknüpfungen         790 →   1225  (+435)
WD-Matches            153 →    158  (+5)
```

Ergänzend nachgerechnet aus beiden Graphen.

| Kennzahl | alt | neu |
|---|---|---|
| Graph-Entitäten | 2289 | 2982 |
| `rico:Record` | 895 | 1000 |
| echte Records ohne Folio-Platzhalter | 892 | 997 |
| davon verknüpft | 147 (16,5 %) | 177 (17,8 %) |
| `rico:RecordSet` | 18 | 20 |
| Konvolute mit mehr als einer Folio | 17 | 19 |
| `m3gim-ontology:Performance` | 724 | 876 |
| `m3gim-ontology:Annotation` | 385 | 808 |
| `m3gim-ontology:StageRole` | 190 | 202 |
| `skos:Concept` | 77 | 76 |
| Agentenknoten / distinkte Namen | 1553 / 685 | 1841 / 801 |
| Ortsknoten / distinkte Namen | 339 / 59 | 525 / 82 |
| Werkknoten / distinkte Namen | 343 / 143 | 480 / 170 |

Kein Record des Altstands ist weggefallen, 105 sind hinzugekommen. Die beiden von `snapshot_diff` als entfernt gemeldeten Einträge `NIM_016` und `NIM_134` sind keine Verluste, sondern Konvolutköpfe, die durch die Feinerschließung ihrer Folien zu `_collection`-Sets geworden sind.

Neu feinerschlossen sind `UAKUG/NIM_016` mit 20 Folien (19 davon verknüpft) und `UAKUG/NIM_134` mit 86 Folien (4 verknüpft); `UAKUG/NIM_073` hat eine Folio gewonnen. Die Verknüpfungsdichte der bereits erschlossenen Konvolute ist unverändert, mit einer Ausnahme: `UAKUG/NIM_005` steigt von 2 auf 9 verknüpfte Folien bei gleichbleibend 30 Folien.

Vier Records ändern ihr Entstehungsdatum, alle vier durch Typkonvertierung in Google Sheets.

| Record | alt | neu |
|---|---|---|
| `UAKUG/NIM_004 34` | `06-09` | `2026-09-06` |
| `UAKUG/NIM_073 5` | `1956-10` | `1956-10-01` |
| `UAKUG/NIM_142 20` | `1954-12` | `1954-12-01` |
| `UAKUG/NIM_168 2` | `1990-12` | `1990-12-01` |

## Welche Workarounds im neuen Lauf greifen

**Header-Shift der Indizes** (`scripts/_common.py:31`, `scripts/transform.py:614`). Greift beim Personenindex, dessen Namensspalte jetzt gar keinen Kopf mehr hat und von pandas als `Unnamed: 1` gelesen wird; im Altstand stand dort noch `name`. Greift weiterhin beim Organisationsindex (Kopfzelle `Claredon` statt `name`) und beim Werkindex (`Rossini, Gioachino` und `Barber, Samuel`). Diese geleakten Einzelwerte gehen wie dokumentiert verloren.

Nicht greift der Shift beim Ortsindex. Dessen Spalte 0 trägt statt `m3gim_id` den Wert `Turin`, damit läuft weder der Positions- noch der Legacy-Zweig an (`transform.py:637` und `:650`), und die Spaltennamen bleiben `Turin`, `name`, `Bei Erfassung hinzugefügt `. Eine `wikidata_id`-Spalte existiert im Ortsindex in beiden Ständen nicht, es geht also keine Normdatenkennung verloren; der Ortsindex liefert in beiden Ständen null Q-IDs. Neu ist allein, dass ein Ortsname in der Kopfzeile steht.

**Nicht-textuelle Spaltenköpfe** (`transform.py:2038`). Greift für den Integer-Kopf `1` der Objekttabelle. In `validate.py` fehlt die Entsprechung, siehe Abbruchabschnitt.

**Signatur-Normalisierung und Forward-Fill** in `load_verknuepfungen` (`transform.py:1155-1160`). Greift auf allen zehn Box-Blättern.

**Hilfsblatt-Filter** in `load_verknuepfungen` (`transform.py:1148`). Übersprungen werden `Typ-Rolle` sowie `Hilfstabelle Box1` bis `Hilfstabelle Box10`, jeweils mit der Logzeile `Sheet '<Name>' uebersprungen (keine Verknuepfungs-Spalten)`. Der Filter greift, weil diesen Blättern `typ` und `name` fehlen. Übrig bleiben die zehn Box-Blätter mit 5657 Zeilen.

**Spalte `data_id` statt `datenpunkt_id`** in Box 6, 7, 8 und 10. `load_verknuepfungen` normalisiert Spaltennamen positionell nur für Spalte 0 und sonst über den Namen (`transform.py:1132-1140`), `data_id` bleibt also als eigene Spalte stehen und wird von der Union der Blätter mitgeführt. `process_verknuepfungen` liest ausschließlich `datenpunkt_id` (`transform.py:1229`), die Zeilen dieser vier Blätter bekommen daher keine `m3gim-ontology:dataPointId` in ihre Provenienz. Materiell entsteht daraus kein Verlust, weil die Spalte `data_id` in allen vier Blättern durchgehend leer ist (0 von 423 Zeilen gefüllt). Die Divergenz ist trotzdem eine stille Falle, weil ein späteres Befüllen ohne Fehlermeldung ins Leere liefe.

Die Provenienzkennung ist im neuen Export insgesamt weitgehend aufgegeben. Von 4790 Verknüpfungszeilen mit gesetztem `typ` tragen 151 eine `datenpunkt_id`, im Altstand waren es 2 von 3542. Zusätzlich enthält die Spalte 75 Werte, die Sheets in Datumsobjekte umgewandelt hat (`2026-01-01` und ähnlich); `transform.py:1233` fängt den `int`-Cast ab und schreibt den Datumsstring als Kennung fort.

**Komposit-Parser** (`decompose_komposit_typ`, `decompose_komposit_value`). Greift für `ort, datum` (76), `datum, werk` (73), `Rolle, Person` (51), die durchgesickerte Erfassungsanweisung `rolle, Vorname Nachname Sänger*in` (230) sowie neu für die vier Unterstrich-Varianten (38).

**Finanz-Währungsdefaults** (`_common.py:57`, `default_currency_for`). Der Bestand an Finanzzeilen wächst von 56 auf 57, verteilt auf NIM_003, NIM_007, NIM_011, NIM_016, NIM_022, NIM_023 und NIM_073. Die Präfixe NIM_007 und NIM_011 sind weiterhin im Datenbestand, die Defaults greifen also unverändert.

**Orphan-Verhalten.** `add_relations_to_records` (`transform.py:1608`) überspringt jede Relationsgruppe, deren Objekt-ID keinen Record trifft, ohne Zähler und ohne Meldung. Der Verlust ist nur durch Nachrechnen sichtbar.

**Bearbeitungsstand-Kanonisierung** (`_common.py:78`). Greift unverändert; die Verteilung verschiebt sich von 479/38/253/122 auf 493/43/317/144 für leer, begonnen, zurückgestellt, abgeschlossen.

**Nicht greift explore.py auf dem Mehrblatt-Workbook.** Der Explorationsreport listet zwar alle 21 Blattnamen, analysiert aber nur 3001 Zeilen, also allein Box 1. E-95 hat `validate.py` und `audit-data.py` auf den gemeinsamen Loader umgestellt, `explore.py` nicht. Der Report unterzeichnet den Bestand damit um rund die Hälfte, und sein Befund „0 Warnungen" für die Verknüpfungstabelle deckt nur Box 1 ab.

## Verworfene Verknüpfungszeilen

Von 5657 geladenen Zeilen erreichen 4961 Relationen 199 Objekt-IDs. Die Differenz zerfällt so.

| Grund | neu | alt |
|---|---|---|
| `typ` leer (Leerzeilen der Tabelle) | 866 | 623 |
| Orphan, kein Objektsatz zur Objekt-ID | 474 | 445 |
| Zeile ohne Signatur vor dem ersten Forward-Fill | 1 | 0 |
| `typ`-Wert ohne Zielzweig in der Serialisierung | 32 | 25 |

Die 32 Zeilen ohne Zielzweig sind 26 mal `dokument` und 6 mal `aktivität`. Für beide gibt es in `add_relations_to_records` keinen `elif`-Zweig und keinen `else`-Fall; die Relation wird gebaut und beim Serialisieren fallengelassen. `knowledge/pipeline-architecture.md` § E-101 beschreibt für `dokument` eine Behandlung als `scopeAndContent`-Blankknoten. Im Code findet sich `rico:scopeAndContent` nur an einer Stelle (`transform.py:781`), und die speist die Objektbeschreibung. Die Dokumentation und der Code stimmen hier nicht überein.

Die Orphans verteilen sich auf 18 distinkte Objekt-IDs, im Altstand auf 16. Drei Gruppen sind zu trennen.

Erstens die vorbestehenden Orphans in `UAKUG/NIM_137` und `UAKUG/NIM_168`, zusammen 425 Zeilen in beiden Ständen. Deren Folien sind in den Verknüpfungen mit Bindestrich erfasst (`15-1`, `15-2`), in der Objekttabelle mit Unterstrich (`15_1`, `15_2`). Neu ist, dass Sheets die Bindestrichform in Datumswerte umgewandelt hat, aus `15-1` wurde `2026-01-15`. Die Objekt-ID heißt jetzt `UAKUG/NIM_137 2026-01-15 00:00:00`. Am Verlust ändert das nichts, an der Reparierbarkeit sehr wohl.

Zweitens 29 Zeilen in `UAKUG/NIM_016`, die im Altstand nicht existierten. Deren Folio-Werte stehen als Fließkommazahlen in der Tabelle, die Objekt-ID lautet `UAKUG/NIM_016 1.0` und `UAKUG/NIM_016 2.0`, während die Objekttabelle die Folien als Ganzzahlen `1` und `2` führt. Dieselbe Spalte enthält für dieselben Folien auch ganzzahlige Zellen, die Verknüpfung greift dort. Das ist ein neuer, echter Verlust von 29 Relationszeilen.

Drittens 20 Zeilen `UAKUG/NIM_016 2.0` und 9 Zeilen `UAKUG/NIM_016 1.0` sind identisch mit dem zweiten Punkt und dort bereits gezählt.

Zusätzlich verworfen, aber nicht als Orphan sichtbar, ist der Objektsatz `UAKUG/NIM_138`. Die Objekttabelle führt dafür eine Zeile, in der außer der Signatur jede Spalte leer ist. Der Datensatz enthält deshalb keinen Record dazu, was `tests/test_03_roundtrip.py` anschlägt.

**Rollenwerte außerhalb des Vokabulars.** Sieben Rollenwerte sind neu, sechs davon ohne Concept im Vokabular.

| Rolle | Zeilen | Status |
|---|---|---|
| `absender` | 18 | im Vokabular vorhanden |
| `unterschriftsdatum` | 6 | ohne Concept |
| `aufnahmedatum` | 5 | ohne Concept |
| `gage` | 1 | ohne Concept |
| `summe` | 1 | ohne Concept |
| `reisedatum` | 1 | ohne Concept |
| `abspielhonorar` | 1 | ohne Concept |

Die Rollen werden nicht verworfen, sondern als Literal durchgereicht. `vocab/check-coverage.py` meldet sie als sechs Abweichungen, im Frontend landen fünf davon im Cluster `neutral`.

## Testlauf

`tests/conftest.py` respektiert die Overrides. Die Pfade laufen über `M3GIM_SHEETS_DIR`, `M3GIM_JSONLD_PATH`, `M3GIM_ENRICHMENT_PATH` und `M3GIM_RECONCILIATION_PATH` (`tests/conftest.py:21-42`). Zu beachten ist, dass der JSON-LD-Pfad eine eigene Variable hat und nicht aus `M3GIM_OUTPUT_DIR` abgeleitet wird.

Kontrolllauf auf dem Altstand mit denselben Variablen: 352 passed, 3 skipped, 2 xfailed, Exit 0. Alle folgenden Ausfälle gehen also auf den neuen Export zurück.

Lauf auf dem neuen Stand: 7 failed, 345 passed, 3 skipped, 2 xfailed.

### Quellfehler im neuen Export

`tests/test_03_roundtrip.py::test_every_xlsx_signatur_in_graph`. `UAKUG/NIM_138` fehlt im Graph, weil die Objektzeile außer der Signatur leer ist. Leere Sammelzeile in der Objekttabelle.

`tests/test_39_date_validity.py::test_dataset_dates_are_valid_calendar_dates`. Drei Datumswerte existieren nicht im Kalender, alle in `UAKUG/NIM_005`, Blatt Box 1.

| Wert | Folio | XLSX-Zeile | Problem |
|---|---|---|---|
| `1951-02-29` | 16 | 1079 | 1951 ist kein Schaltjahr |
| `1959-31-08` | 21 | 1927 | Tag und Monat vertauscht |
| `1959-02-30` | 22 | 2004 | kein 30. Februar |

`tests/test_38_modelling_rules.py::test_no_self_referential_agent_relations_and_roles_kept`. Der Ankerrecord `UAKUG/NIM_004 1` führt die Nachlassbildnerin nicht mehr mit `wd:Q94208`. Die Verknüpfungszeile ist unverändert; die Ursache liegt im Personenindex, der `Malaniuk, Ira` zweimal führt, einmal mit `P139` und `Q94208`, einmal ohne Kennung und mit der Anmerkung `sängerin`. `build_index_lookup` (`transform.py:684`) schreibt pro Namen einen Eintrag, der letzte gewinnt, und die Dublette überschreibt die Normdatenkennung. Das ist der einzige Fall dieser Art im gesamten Export, betrifft aber die zentrale Person des Bestands. Im Datensatz fällt `wd:Q94208` von 165 auf 66 Vorkommen, während der Name `Malaniuk, Ira` von 165 auf 206 steigt.

`tests/test_15_vocab_coverage.py` (zwei Ausfälle) und `tests/test_40_vocab_gate.py`. Die sechs neuen Rollenwerte aus der Tabelle oben fehlen in `knowledge/data.md` § 5, in `vocab/m3gim.ttl` und in `ROLE_CLUSTER` in `docs/js/data/constants.js`. Das ist neue Erfassungssubstanz, die eine Vokabularentscheidung braucht.

### Testannahme, die nicht mehr gilt

`tests/test_16_roundtrip_finance.py::test_each_finance_row_reachable_in_output` meldet 37 nicht gefundene Finanzzeilen. Der Helfer `_finance_base_typ` (`tests/test_16_roundtrip_finance.py:53`) trennt den Komposit-Typ nur am Komma:

```python
return raw_typ.strip().lower().split(",")[0].strip()
```

Für `einnahmen_währung` liefert das den ganzen String zurück, der nie auf ein `detailField` von `einnahmen` trifft. Die Pipeline selbst trennt an `[,_]` (`transform.py:1013`) und verarbeitet die Zeilen korrekt. Die 37 gemeldeten Zeilen sind exakt die 32 `einnahmen_währung`, 3 `summe_währung` und 2 `ausgaben_währung`; alle sind im Ausgabedatensatz vorhanden. Minimaler Fix im Test, nicht in der Pipeline:

```python
return re.split(r"[,_]", raw_typ.strip().lower())[0].strip()
```

Kein Datenverlust, reiner Testbefund.

## Belegt gegen vermutet

Belegt sind alle oben genannten Zahlen, Exitcodes, Zeilen- und Dateiverweise. Sie stammen aus den Läufen selbst, aus den beiden Validierungsreports und aus Nachrechnungen über die geladenen XLSX und die erzeugten JSON-LD-Dateien.

Vermutet bleibt Folgendes. Die Typkonvertierungen in Folio-, Datums- und `datenpunkt_id`-Spalten sehen nach einem Verlust der Textformatierung beim Neuaufbau des Google Sheets aus; belegt ist nur, dass der Altexport in diesen Spalten ausschließlich Strings enthielt und der neue gemischte Typen führt. Ob die Dublette `Malaniuk, Ira` im Personenindex eine Doppelerfassung oder eine bewusst angelegte Variante ist, lässt sich aus den Daten nicht entscheiden. Ob `Aktivität` als Verknüpfungstyp geplant ist oder ein Tippfehler, ebenfalls nicht.

## Offene Punkte für die Projektleitung

1. Sechs neue Rollenwerte (`unterschriftsdatum`, `aufnahmedatum`, `gage`, `summe`, `reisedatum`, `abspielhonorar`) brauchen eine Entscheidung: ins Vokabular aufnehmen und in `data.md` § 5 sowie `ROLE_CLUSTER` nachziehen, oder quellseitig auf bestehende Werte abbilden.
2. Der neue Verknüpfungstyp `Aktivität` (6 Zeilen) hat keinen Zielzweig und verschwindet still. Modellieren oder quellseitig ersetzen.
3. Der Typ `dokument` (26 Zeilen) verschwindet ebenfalls still, obwohl `pipeline-architecture.md` § E-101 eine Behandlung beschreibt. Entweder wurde die Umsetzung nie gebaut oder die Dokumentation ist überholt; das gehört geklärt, bevor der neue Stand übernommen wird.
4. Die Dublette `Malaniuk, Ira` im Personenindex kostet die Normdatenkennung der Nachlassbildnerin. Quellseitige Bereinigung ist der saubere Weg; unabhängig davon sollte `build_index_lookup` eine Dublette mit Kennung nicht durch eine ohne Kennung überschreiben lassen.
5. Die Folio-Werte in `UAKUG/NIM_016` stehen teils als Zahl, teils als Text in der Verknüpfungstabelle; 29 Relationszeilen gehen dadurch verloren. Quellseitige Vereinheitlichung oder eine Normalisierung der Folio-Werte im Loader.
6. Die Folio-Werte `15-1` und `15-2` in `UAKUG/NIM_137` sind zu Datumswerten geworden. Der Bindestrich-Unterstrich-Konflikt bestand schon vorher, die Konvertierung macht die Reparatur dringender.
7. Drei unmögliche Kalenderdaten in `UAKUG/NIM_005` (Folio 16, 21, 22) gehören ins Fehlerregister ans Erschließungsteam.
8. Drei Monatsdatierungen wurden auf den Monatsersten aufgefüllt, eine Angabe `06-09` zu `2026-09-06`. Damit behauptet der Datensatz Tagesgenauigkeit, die die Quelle nicht trägt. Entweder wird die Spalte quellseitig wieder als Text geführt, oder die Pipeline braucht eine Regel, die ein Sheets-Datum mit Tag 1 nicht ungeprüft als tagesgenau übernimmt.
9. Die Provenienzspalte `datenpunkt_id` ist praktisch aufgegeben (151 von 4790 Zeilen) und heißt in vier Blättern `data_id`. Zu entscheiden ist, ob die Kennung weitergeführt wird; wenn ja, muss der Loader beide Spaltennamen zusammenführen.
10. `validate.py` braucht zwei Nachzüge, den `isinstance`-Schutz in Zeile 239 und die Angleichung der Folio-Erkennung an `transform.py:2044`. Ohne den zweiten bleibt der Report mit rund 800 Scheinfehlern unbrauchbar für das Erschließungsteam.
11. `explore.py` liest weiterhin nur das erste Blatt des Verknüpfungs-Workbooks und sollte auf `load_verknuepfungen` umgestellt werden, wie es E-95 für `validate.py` und `audit-data.py` getan hat.
12. `tests/test_16_roundtrip_finance.py:53` kennt den Unterstrich als Komposit-Trenner nicht und meldet 37 Fehlalarme.
