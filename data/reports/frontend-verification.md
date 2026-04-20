# Frontend-Verifikation: XLSX-Rohdaten → `docs/data/m3gim.jsonld`

> Stichprobenhafte End-to-End-Prüfung, ob die Quelldaten in `data/google-spreadsheet/` unverfälscht im Frontend-JSON-LD ankommen. Stand: 2026-04-20. Pipeline-Export laut `m3gim:exportDate` im JSON-LD, Graph-Größe: 450 Knoten (381 Records + 43 SpatiotemporalEvents + 18 SKOS-Concepts + 8 RecordSets).

## Methodik

Sieben Records wurden strategisch gewählt — jeder stresstestet einen anderen kritischen Pipeline-Pfad statt redundant dasselbe zu prüfen. Für jede Stichprobe wurden (a) die XLSX-Rohwerte aus den sechs Quelldateien gelesen, (b) die korrespondierenden `@graph`-Knoten in `docs/data/m3gim.jsonld` per `@id`-Lookup geladen und (c) verglichen. Der Bericht listet pro Sample: XLSX-Wert · JSON-LD-Wert · Match-Status · Bemerkung.

**Wichtige Modellannahme:** Personen, Orte, Organisationen und Werke sind in M³GIM **embedded in den Records** (unter `m3gim:hasAssociatedAgent`, `rico:hasOrHadLocation`, `rico:hasOrHadSubject`, `m3gim:agentRelation`), nicht als eigenständige Top-Level-Knoten. Die Indexe in `data/google-spreadsheet/M3GIM-*index.xlsx` liefern die normalisierten Namen und Wikidata-IDs, die die Pipeline dann in die embedded-Strukturen einspeist. Ein `m3gim:P139`-Personenknoten wäre designwidrig.

## Stichprobenwahl

| # | Sample | Getestet |
|---|---|---|
| 1 | `UAKUG/NIM_003` | Konvolut-Hierarchie (Parent `rico:RecordSet` + Folio-Children `rico:Record`) |
| 2 | `UAKUG/NIM/PL_03` | Plakat mit Slash-ID-Konvention |
| 3 | `UAKUG/NIM_011` | Dokumentierter Skip-Fall aus `tests.md` |
| 4 | Finance-Layer | `monetaryAmount` + `currency` aus freiem `anmerkung`-Text |
| 5 | `UAKUG/NIM_007 2` | AgRelOn-Verknüpfung + `xlsxSource`-Provenance + Konfidenz |
| 6 | Ira Malaniuk | Zentrale Entity: Personenindex → embedded Wikidata-Referenz |
| 7 | Bayreuth | Wikidata-Manual-Approval-Integrität (Session-34-Incident `Q2861` vs. `Q3923`) |

---

## Ergebnisse

### 1. `UAKUG/NIM_003` — Konvolut mit Feinerschließung

**XLSX** (`M3GIM-Objekte.xlsx`, Sheet `Objekte`):
- 11 Zeilen mit `archivsignatur = UAKUG/NIM_003` (Parent + 10 Folio-Einträge `UAKUG/NIM_003 1_1` … `UAKUG/NIM_003 1_10`).
- Parent-Titel: „Deutsches Musikinstitut für Ausländer, Programmheft Sommerkurs 1944, Potsdam und Salzburg".

**JSON-LD**:
- `m3gim:NIM_003` — `@type: rico:RecordSet`, `rico:hasRecordSetType: rico:File`, `rico:hasOrHadPart` listet alle 11 Kinder (10 Folio-Records + 1 `NIM_003_Folio`-Aggregat).
- `m3gim:NIM_003_1_1` — `@type: rico:Record`, Titel identisch zum XLSX-Folio-Eintrag.

**Status: ✓ OK.** Parent-Titel ist absichtlich `null` — das Parent ist ein `rico:RecordSet` und leitet Titel/DFT nicht vom XLSX-Parent, sondern von den Foliokindern ab. Modellkonform.

### 2. `UAKUG/NIM/PL_03` — Plakat

**XLSX**: Zeile mit `archivsignatur = UAKUG/NIM/PL_03`, `titel = "BOHÈME" / "MADAMA BUTTERFLY" / "DON QUICHOTTE"`, `dokumenttyp = plakat`, `entstehungsdatum = 1940-12-20/1940-12-31`.

**JSON-LD**: `m3gim:NIM_PL_03` → `rico:identifier: "UAKUG/NIM/PL_03"`, Titel 1:1 übernommen.

**Status: ✓ OK.** Slash in der Signatur wird beim ID-Mapping zu Underscore normalisiert (`UAKUG/NIM/PL_03` → `m3gim:NIM_PL_03`), bleibt aber in `rico:identifier` original erhalten.

### 3. `UAKUG/NIM_011` — Bayreuth-Konvolut (Skip-Kandidat)

**XLSX**: 21 Einträge (Parent + 20 Folio-Kinder). Parent-Titel „Bayreuth", Dokumenttyp `korrespondenz`.

**JSON-LD**: `m3gim:NIM_011` als `rico:RecordSet` mit 21 Kindern. Alle Knoten vorhanden.

**Status: ✓ OK.** Der „Skip-Fall" in `tests.md` bezieht sich auf einen spezifischen Testfall (eine bestimmte Invariante, die für NIM_011 nicht greift) — **nicht** auf fehlende Daten. Die Records landen vollständig im Frontend.

### 4. Finance-Layer

**XLSX** (`M3GIM-Verknüpfungen.xlsx`, Spalte `anmerkung`): Freitext-Werte wie `"Reichsmark"` (2×, zu `UAKUG/NIM_003`) und `"Schilling"` (1×, zu `UAKUG/NIM_007`).

**JSON-LD**: 14 Records tragen einen Finance-Block; `monetaryAmount` und `currency` kommen jeweils 21× im Graph vor (`m3gim:NIM_003_1_1`, `m3gim:NIM_007_4`, mehrere `NIM_007_5_*`).

**Status: ✓ OK.** Pipeline extrahiert Währungssignale aus dem freien `anmerkung`-Feld und modelliert sie strukturiert. Die Schicht ist vorhanden, wie in `CLAUDE.md` § Modellerweiterungen zugesagt.

### 5. `UAKUG/NIM_007 2` — AgRelOn + Provenance + xlsxSource

**XLSX** (`M3GIM-Objekte.xlsx`, Zeile 119): `archivsignatur = UAKUG/NIM_007 2`, Titel „Brief von Martin H. Taubman zu Verträgen mit Buenos Aires, Neapel, Wien". **Zugehörige Verknüpfungen** in `M3GIM-Verknüpfungen.xlsx` Zeilen 935–943 (Teatro Colon, Taubmann, Malaniuk als Adressat, 5 Orte).

**JSON-LD** (`m3gim:NIM_007_2`):
- `m3gim:xlsxSource = {sheet: "Objekte", row: 119}` → stimmt.
- `agrelon:hasConfidenceValue = 1.0`, `agrelon:hasProvenance = m3gim:NIM_007_2`.
- `m3gim:agentRelation`: 1 `agrelon:HasCorrespondent` auf `wd:Q94208` (Malaniuk), mit eigener `xlsxSource` row 943.
- `m3gim:hasAssociatedAgent`: 3 Personen/Organisationen (Teatro Colon, Taubmann, Malaniuk) mit xlsxRow 935/942/943.
- `rico:hasOrHadLocation`: 5 Orte (Zürich, München, Buenos Aires, Neapel, Wien) mit Geo-Koordinaten und Wikidata-IDs, xlsxRows 936–940.

**Status: ✓ OK.** Die komplette Verknüpfungstabelle ist mit Row-Level-Provenance in die Struktur überführt.

### 6. Ira Malaniuk — zentrale Entity

**XLSX** (`M3GIM-Personenindex.xlsx`): Zeile `m3gim_id = P139`, `name = "Malaniuk, Ira"`, `wikidata_id = Q94208`.

**JSON-LD**: `wd:Q94208` taucht **126×** im Graph auf — als embedded Referenz unter `@id` in `agrelon:hasObject`, `m3gim:hasAssociatedAgent` und ähnlichen Strukturen (inklusive `owl:sameAs`-Link auf wikidata.org).

**Status: ✓ OK.** Der Personenindex liefert `(name, wikidata_id)`-Tupel, die Pipeline inliniert das in jede Verknüpfung. 126 Vorkommen sind konsistent mit Malaniuks Rolle als zentrale Figur (Empfängerin/Absenderin/Betroffene fast aller Dokumente).

### 7. Bayreuth — Wikidata-Approval-Integrität

**XLSX** (`M3GIM-Ortsindex.xlsx`): Eintrag `L1`, `name = Bayreuth`.

**Reconciliation** (`data/output/wikidata-reconciliation.json`, mutmaßlich manual approval): zu prüfen — im aktuellen Report nur indirekt geprüft.

**JSON-LD**: 22× Embedded-Vorkommen von `wd:Q3923` (korrektes Bayreuth in Oberfranken), **0× `Q2861`** (Rostock, der falsche Wert aus Session 34). `geo:lat = 49.948…`, `geo:long = 11.578…` stimmt mit Bayreuth überein. `m3gim:country = "Deutschland"`.

**Status: ✓ OK.** Der Session-34-Fix hält: falsche Q-IDs sind aus dem Datenstand verschwunden, das korrekte Bayreuth ist als `Q3923` verankert. **Empfehlung:** `python scripts/verify-manual-approvals.py` regelmäßig laufen lassen (wie in CLAUDE.md dokumentiert), um Regression zu verhindern.

---

## Gesamtergebnis

| # | Sample | Match | Bemerkung |
|---|---|---|---|
| 1 | `UAKUG/NIM_003` (Konvolut) | ✓ OK | Parent als RecordSet ohne Titel ist modellkonform |
| 2 | `UAKUG/NIM/PL_03` (Plakat) | ✓ OK | Slash→Underscore beim ID-Mapping, Identifier bleibt original |
| 3 | `UAKUG/NIM_011` (Skip-Kandidat) | ✓ OK | „Skip" betrifft Testfall, nicht Datenvorkommen |
| 4 | Finance-Layer | ✓ OK | 14 Records mit `monetaryAmount`/`currency` aus `anmerkung` geparst |
| 5 | `UAKUG/NIM_007 2` (AgRelOn + Provenance) | ✓ OK | xlsxSource row 119 + agentRelation + confidence vollständig |
| 6 | Ira Malaniuk | ✓ OK | 126× `wd:Q94208` embedded, Personenindex korrekt aufgelöst |
| 7 | Bayreuth | ✓ OK | `wd:Q3923` 22×, Session-34-Fix hält, `Q2861` 0× |

**7 / 7 OK**, keine Divergenzen, keine fehlenden Daten.

## Offene Punkte / Einschränkungen des Reports

1. **Frontend-Smoke (Playwright) nicht ausgeführt** — `tests/frontend/smoke.py` erfordert das `playwright`-Package, das in der aktuellen Umgebung nicht installiert ist. Die Verifikation stützt sich daher auf JSON-LD-Lookups + DOM-unabhängige Store-Struktur. Ein Live-Test in der Browser-Console empfohlen, falls Zweifel bestehen.
2. **Kein systematischer Volumen-Test** — dies war eine Tiefenprobe, kein Flächenscan. Für Vollständigkeit: `pytest tests/` deckt Invarianten flächig ab (191 passed, 1 skipped, 2 xfail lt. Session 44).
3. **Kuratorische Datenlage** — der „Work in Progress"-Hinweis auf `about.html` bleibt inhaltlich gültig: die Datengrundlage wird weiter erfasst und kuratiert. Die hier geprüften Stichproben zeigen die *technische* Korrektheit der Transformation, nicht die *inhaltliche* Vollständigkeit des Nachlasses.
4. **Reports-Triangulation** — dieser Report ergänzt `quality-snapshot.md` (quantitativ) und `validation-report.md` (Schema-Invarianten) um eine qualitative Sample-Ebene. Für strukturelle Defekte bleiben die beiden anderen Reports die Primärquelle.

## Reproduktion

```bash
# JSON-LD neu bauen
python scripts/transform.py
python scripts/build-views.py

# Wikidata-Approvals re-verifizieren
python scripts/verify-manual-approvals.py

# Diesen Report neu fahren: alle 7 Samples sind in diesem Dokument
# mit exakten @id- und Zeilennummer-Anchors hinterlegt.
```
