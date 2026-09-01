---
title: Architektur
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.5
created: 2026-02-19
updated: 2026-09-01
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Architecture
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/architecture
topics: ["[[Pipeline Design]]", "[[JSON-LD]]", "[[Data Validation]]", "[[Static Site Architecture]]", "[[Information Visualisation]]"]
related: [data, testing, journal, design, specification]
---

# Architektur

> Dieses Dokument führt beide Architekturhälften von M³GIM. Teil [Pipeline](#pipeline) beschreibt Skriptverantwortung, Datenfluss, ENV-Overrides, Pipeline-Erweiterungen und Qualitäts-Baseline. Teil [Frontend](#frontend) beschreibt Laufzeitmodell, Modulstruktur, Store und State, Routing, das build-lose Deployment auf GitHub Pages und die Ansichten der einzelnen Tabs. Der Datenfluss wird im Pipeline-Teil vollständig geführt und im Frontend-Teil nur an seiner Anschlussstelle aufgenommen. Die Designhaltung, das Designsystem und die Lektionen aus den entfernten Visualisierungen stehen in [design.md](design.md).

## Pipeline

### Skriptverantwortung

| Script | Zweck | Input | Output |
|---|---|---|---|
| `scripts/explore.py` | Datenexploration, Strukturdiagnostik. Liest die Verknüpfungen seit 2026-08-31 über denselben Loader wie Transformation und Validierung und deckt damit alle Blätter ab; vorher sah der Report nur das erste. | `$M3GIM_SHEETS_DIR` | `$M3GIM_REPORTS_DIR/exploration-report.md` |
| `scripts/validate.py` | Validierung, Qualitaetschecks. Liest die Verknuepfungstabelle ueber denselben Multi-Sheet-Loader wie die Transformation (`load_verknuepfungen`, E-95) und deckt damit alle Box-Blaetter ab. Exitcode 1, sobald ERROR-Befunde im Report stehen, was dem Regelfall entspricht (siehe [CLAUDE.md § Kern-Commands](../CLAUDE.md)). | `$M3GIM_SHEETS_DIR` | `$M3GIM_REPORTS_DIR/validation-report.md` |
| `scripts/transform.py` | Transformation nach JSON-LD (RiC-O + m3gim + agrelon) | `$M3GIM_SHEETS_DIR` | `$M3GIM_OUTPUT_DIR/m3gim.jsonld` |
| `scripts/build-views.py` | Veroeffentlichung: kopiert das Ergebnis in die Frontend-Datenquelle (E-140) | `$M3GIM_OUTPUT_DIR/m3gim.jsonld` | `docs/data/m3gim.jsonld` |
| `scripts/reconcile.py` | Wikidata-Reconciliation (Fuzzy-Matching, P31-Verifikation, Caching, Confidence-Level exact/fuzzy_high/fuzzy_low) | XLSX-Indizes | `data/output/wikidata-reconciliation.json` |
| `scripts/enrich-wikidata.py` | Wikidata-Property-Enrichment (P106, P412, P569/570, P625, P1191 etc.). Filtert fuzzy_low ohne `manual_review: "approved"` aus (E-74). | wikidata-reconciliation.json | `data/output/wikidata-enrichment.json` |
| `scripts/export-wikidata-csv.py` | Wikidata-CSVs fuer Google-Sheets-Import | wikidata-reconciliation.json | `data/output/wikidata-csvs/*.csv` |
| `scripts/audit-data.py` | Alignment-Pruefung XLSX vs JSON-LD vs Views | XLSX + JSON-LD + Views | Konsolenreport |
| `scripts/report-quality.py` | Datenqualitaets-Snapshot fuer Erschliessungsteam: Verknuepfungsrate, Bearbeitungsstand, WD-Coverage, Provenance-Coverage, Low-Confidence-Freigabeliste | m3gim.jsonld + wikidata-reconciliation.json | `data/reports/quality-snapshot.md` |
| `scripts/verify-manual-approvals.py` | Pflichtlauf nach manuellen Q-ID-Approvals: prueft `match: "manual"`-Eintraege gegen Live-Wikidata-Labels + Typ-Signal; Exitcode 1 bei Mismatch (E-78). Offline-Bypass via `SKIP_VERIFY_MANUAL=1`. | wikidata-reconciliation.json | Konsolenreport, Exitcode |

### ENV-Overrides

Die Pipeline-Skripte respektieren folgende Umgebungsvariablen für Ausnahmefälle (z.B. alternative Datenstände, Experimente):

| ENV | Default |
|---|---|
| `M3GIM_SHEETS_DIR` | `data/google-spreadsheet` |
| `M3GIM_OUTPUT_DIR` | `data/output` |
| `M3GIM_REPORTS_DIR` | `data/reports` |

Die Overrides greifen bei `explore.py`, `validate.py`, `transform.py` und `build-views.py`. `audit-data.py` und `report-quality.py` lesen ihre Pfade fest aus dem Repository-Wurzelverzeichnis und ignorieren die Variablen.

#### Quelllayout unter `$M3GIM_SHEETS_DIR`

```
$M3GIM_SHEETS_DIR/
├── M3GIM-Objekte.xlsx
├── M3GIM-Personenindex.xlsx
├── M3GIM-Organisationsindex.xlsx
├── M3GIM-Ortsindex.xlsx
├── M3GIM-Werkindex.xlsx
└── verknuepfungen/
    ├── Box_1.csv … Box_9.csv     # je Blatt eine Datei, Blattname der Provenienz ist "Box 1"
    └── Typ-Rolle.csv             # Wertliste, keine Verknuepfungszeilen
```

Die fünf Indextabellen und die Objekttabelle bleiben XLSX. Die Verknüpfungstabelle liegt seit der Lieferung vom 2026-08-31 als CSV-Ausfuhr je Blatt vor (E-152, [data.md](data.md) § 3 Quellformat), weil der XLSX-Export Datums-, Folio- und Bündelungsspalten in Zelltypen umwandelt und dabei Genauigkeit erfindet.

`load_verknuepfungen` in `scripts/transform.py` nimmt beide Quellen an. Der Aufrufer übergibt das Quellverzeichnis oder einen Pfad; existiert darin `verknuepfungen/` mit mindestens einer `Box_*.csv`, gewinnt das CSV-Verzeichnis, sonst greift der XLSX-Pfad mit dem bekannten Dateinamen. Die Provenienz ist in beiden Fällen dieselbe, `_xlsx_sheet` trägt den Blattnamen der Quelle und `_xlsx_row` die 1-basierte Zeile inklusive Kopfzeile. `Typ-Rolle.csv` wird nicht als Verknüpfungsblatt gelesen, sondern als Wertliste für die Kreuzprüfung in `validate.py`.

`build-views.py` kopiert `m3gim.jsonld` nur dann nach `docs/data/`, wenn `M3GIM_OUTPUT_DIR` auf den Default zeigt.

#### Falle, leeres Ausgabeverzeichnis kostet die Normdaten stillschweigend

`transform.py` liest `wikidata-reconciliation.json` und `wikidata-enrichment.json` aus dem **Ausgabe**verzeichnis `$M3GIM_OUTPUT_DIR`, also aus derselben Zone, in die es sein eigenes Ergebnis schreibt. Beide Dateien sind git-getrackt und liegen im normalen Klon bereit. Zeigt `M3GIM_OUTPUT_DIR` auf ein frisches Verzeichnis, oder wird `data/output/` geleert, dann meldet der Lauf zwei Hinweiszeilen der Form `nicht vorhanden (uebersprungen)`, endet mit Exit 0 und schreibt einen vollständig aussehenden Datensatz.

Dem Datensatz fehlen dann sämtliche Wikidata-Properties aus dem Enrichment, also Koordinaten, Lebensdaten, Berufe, Stimmfächer, Komponisten- und Genreangaben, dazu jene Q-IDs, die erst die Reconciliation ergänzt. Übrig bleiben allein die Q-IDs, die in den Index-XLSX selbst erfasst sind. Das Frontend rendert daraufhin eine leere Karte, weil `geo:lat` und `geo:long` nirgends mehr im Graph stehen. Der Verlust ist im Ergebnis groß und im Protokoll leise, weshalb die beiden Hinweiszeilen bei jedem Lauf mit gesetztem `M3GIM_OUTPUT_DIR` zu lesen sind. Wer mit einem alternativen Ausgabeverzeichnis arbeitet, kopiert die beiden Dateien vorher dorthin.

#### Reihenfolge eines vollständigen Laufs

Explorieren, validieren, transformieren, Ansichten bauen, auditieren, Snapshot schreiben. Die Befehle mit ihren jeweiligen Ausgabezielen stehen in [CLAUDE.md § Kern-Commands](../CLAUDE.md). `reconcile.py` und `enrich-wikidata.py` stehen außerhalb dieses Laufs und werden nur beim Neuziehen des Wikidata-Abgleichs gebraucht.

### Datenfluss

1. **Export** aus Google Sheets nach `$M3GIM_SHEETS_DIR` (git-getrackt fuer Reproduzierbarkeit): Objekt- und Indextabellen als XLSX, die Verknuepfungstabelle als CSV je Blatt unter `verknuepfungen/` (E-152)
2. **Exploration + Validierung** (`explore.py`, `validate.py`) → Reports
   2b. **Reconciliation** (`reconcile.py`) → `wikidata-reconciliation.json` (Fuzzy-Matching, Confidence-Level exact/fuzzy_high/fuzzy_low)
   2c. **Enrichment** (`enrich-wikidata.py`) → `wikidata-enrichment.json` (WD-Properties fuer gematchte Entitaeten)
3. **Modelltransformation** (`transform.py`) → `$M3GIM_OUTPUT_DIR/m3gim.jsonld` mit:
   - `owl:sameAs` + WD-Enrichment-Properties (fuzzy_low nur bei `manual_review: "approved"`, E-74)
   - Skos:Concept-Knoten fuer hierarchische Dokumenttypen (data-model.md § 12)
   - `m3gim-ontology:Annotation` als Top-Level Graph-Entities (data-model.md § 10)
   - `agrelon:*`-Relationen fuer Agent-Agent-Beziehungen (data-model.md § 8)
   - `agrelon:metadataProvenance` an AgRelOn-Relationen und STEs; Datierungsevidenz wird seit E-106 nicht mehr serialisiert (data-model.md § 9)
   - `m3gim-ontology:Annotation` mit `monetaryAmount`/`currency`/`detailRole` (data-model.md § 11)
   - `m3gim-ontology:xlsxSource` pro Record + Nested Entity (technische Quellreferenz auf Sheet + Zeile, data-model.md § 9, E-73)
4. **Bereitstellung** (`build-views.py`): kopiert im Default-Lauf `m3gim.jsonld` als alleinige Frontend-Datenquelle nach `docs/data/`.

#### Reproduzierbarkeit

Gleiche Quelldaten ergeben bitgleiche Artefakte, mit genau zwei Ausnahmen. `transform.py` schreibt das Exportdatum als `m3gim-ontology:exportDate` in `m3gim.jsonld`, `build-views.py` schreibt in jede erzeugte Ansicht ein Feld `generated`. Beide tragen den Zeitpunkt des Laufs, weshalb ein Rerun aus unverändertem Quellstand in `git diff` genau diese Zeilen zeigt und sonst nichts. Ein Diff, der darüber hinausgeht, ist eine echte Änderung an Daten oder Code. Der Determinismus-Test `tests/test_10_determinismus.py` (Marker `slow`) sichert die Eigenschaft ab, indem er `transform.py` zweimal laufen lässt und `m3gim-ontology:exportDate` vor dem Vergleich entfernt. Die generierten Markdown-Reports unter `data/reports/` tragen ihren Generierungszeitpunkt ebenfalls im Kopf.

### Umgesetzte Pipeline-Erweiterungen (Phase 4)

| Phase | Änderung in transform.py |
|---|---|
| 4.1 | `normalize_role()` strippt `:in`/`:innen` — Gender-neutrale Rollenbezeichner |
| 4.2 | `DOKUMENTTYP_TO_DFT` hierarchisch erweitert + `build_dft_concepts()` emittiert skos:Concept-Knoten mit skos:broader |
| 4.3 | Record-URI als `agrelon:metadataProvenance` an AgRelOn-Relationen und STEs. Datierungs-Konfidenz ist seit E-106 ganz entfernt (Konstante `EVIDENZ_TO_CONFIDENCE` gestrichen); Konfidenz wird nicht fabriziert. |
| 4.4 | Komposit `ort, datum` erzeugt zusaetzlich `m3gim-ontology:Annotation`-Instanz mit `atPlace`, `atDate`, `eventRole` |
| 4.6 | `parse_monetary_value()` zerlegt `AMOUNT, CURRENCY`; Finanz-DetailAnnotation haelt `monetaryAmount` (xsd:decimal), `currency`, `detailRole`. `FINANCE_CURRENCY_DEFAULTS` pro Signatur-Präfix greift, wenn die Quelle keine Währung liefert (für NIM_007 `S`). |
| 4.7 | Jede Datierung wird ein `m3gim-ontology:Annotation`-Knoten mit `m3gim-ontology:atDate` und der erfassten Rolle, erreichbar ueber `m3gim-ontology:hasAnnotation` (E-136). `DATE_ONLY_ROLES` streicht die Rolle am Ortsteil eines Komposits `ort, datum`, weil eine Datumsrolle dort nichts aussagt; `is_iso_date()` trennt Freitext von ISO-Werten; `clean_date` normalisiert `YYYY-YYYY` → `YYYY/YYYY` |
| 4.8 | `AGRELON_MAPPING` erzeugt `agrelon:HasEmployeeEmployer`/`HasCorrespondent`/`HasProfessionalContact`/`IsHasPatron`/`HasIsMember` je (typ, rolle); `m3gim-ontology:hasAgentRelation`-Array am Record |

Noch offen:
- Phase 4.9: Reifikation / `m3gim:Statement` — optional, spaet <!-- vocab-exempt: nennt ein vorgeschlagenes, nicht gebautes Muster -->

### Erweiterungen fuer den neuen Datenstand (testgetrieben)

Ein neuer Export erschliesst mehrere Konvolute tiefer und loest die freigegebene Modell-Erweiterung aus ([journal.md](journal.md) E-95 bis E-102). Die Umsetzung folgt dem TDD-Workflow ([testing.md](testing.md)): erst die rote Spec, dann der Code.

Darauf aufbauend sichert eine Ontologie-Konformitaets-Welle (E-103 bis E-105) die Term-Korrektheit: `ric-rst:File`/`Fonds`, `agrelon:metadataProvenance`/`metadataConfidence`, `agrelon:IsHasPatron`, Person-Normdaten in `schema:`/`gndo:`, `m3gim-ontology:wdPremiereDate`, die Namespaces `documentaryFormTypes#`/`roles#` sowie der `test_26`-Lock. E-106 entfernt die Datierungs-Konfidenz ganz (`m3gim:dateEvidence`/`agrelon:metadataConfidence` an Datumsangaben werden nicht mehr serialisiert). <!-- vocab-exempt: nennt Terme der Konformitaetswelle E-103 bis E-105 unter ihren damaligen Namen -->

#### Strukturelle Loader-Absorption (E-95)

Die neue Export-Struktur erzeugt ohne Eingriff stillen Totalverlust bzw. einen Abbruch. Der Loader absorbiert das defensiv, statt die fehlerhaften Zeilen still fallen zu lassen.

- Die Verknuepfungstabelle verteilt sich auf mehrere Box-Sheets; alle werden geladen und zusammengefuehrt, statt nur das erste. `validate.py` und `audit-data.py` benutzen denselben Loader; vorher lasen sie die Mappe mit `pd.read_excel` ohne Blattangabe, sahen also nur das erste Blatt, und ihre Befunde blieben hinter dem transformierten Stand zurück.
- Die Signaturspalte traegt teils nur ein Leerzeichen als Kopf und ist luckig gefuellt; sie wird positionsbasiert erkannt und je Sheet forward-gefuellt.
- Der Personenindex hat keinen sauberen Namensspaltenkopf; der Header-Shift greift jetzt auch fuer den Personenindex, sonst gehen alle Personen-Normdaten verloren.
- Nicht-textuelle Spaltenkoepfe und Literal-`Folio`-Zellwerte werden abgefangen, statt die Folio-Erkennung abbrechen zu lassen.

Diese Faelle sind nicht durchreichbar; die quellseitige Bereinigung ist als Source-Fix-Ticket im [Datenfehler-Register](../data/reports/reconciliation-register.md § Strukturelle Quell-Fixes) vermerkt.

#### Schutzregeln der Index-Uebernahme (E-152)

`build_index_lookup` schrieb je Namen einen Eintrag in Quellreihenfolge; bei gleichem Namen gewann die letzte Zeile vollstaendig, auch mit leeren Feldern gegen gefuellte. Die Lieferung vom 2026-08-31 fuehrt die Nachlassbildnerin zweimal im Personenindex, die zweite Zeile ohne Kennung und ohne Lebensdaten, womit die zentrale Person des Bestands ihre Wikidata-Kennung samt Anreicherung verlor.

Die Uebernahme verdichtet jetzt feldweise. Identitaet ist die `m3gim_id`, ersatzweise der getrimmte Name; je Feld gewinnt der erste nicht leere Wert; ein gefuelltes Feld wird nie von einem leeren ueberschrieben; `assoziierte_person` sammelt alle Werte der Gruppe. Tragen zwei Zeilen derselben Identitaet in demselben Feld verschiedene nicht leere Werte, gewinnt der erste, und der Fall geht in den Validierungsreport; ein Flag am Knoten des Datensatzes entsteht nicht, weil der Konflikt im Bestand ausschliesslich die Anmerkungsspalte betrifft. Der Schluessel des Werkindex ist das Paar aus Titel und Komponist, weil `Requiem` und `Stabat mater` je drei verschiedene Werke bezeichnen; eine Verknuepfungszeile mit blossem Titel bleibt unaufgeloest und traegt `name-nicht-eindeutig`. Die Regel steht in [data.md](data.md) § 3 unter Identitaet und Vorrang in den Indextabellen.

#### Pruefschicht der CSV-Quelle (E-152)

`validate.py` prueft die Verknuepfungszeilen zusaetzlich gegen die Formatregeln der Quelle und meldet jeden Befund mit Tabelle, Blatt und Zeile. Geprueft werden das Datumsformat gegen [data.md](data.md) § 6 einschliesslich der Warnklasse fuer Zeitstempelmuster aus einer Autokonvertierung, das Muster der Buendelungskennung, das Folio-Muster mit der Bindestrichform als Befund, die Kreuzpruefung von `typ` und `rolle` gegen `Typ-Rolle.csv`, Zeilen mit `name` und ohne `typ` sowie Signaturstuempfe ohne Konvolutnummer. Kein Befund dieser Schicht veraendert Daten; jeder geht ueber das [Datenfehler-Register](../data/reports/reconciliation-register.md) an das Erschliessungsteam.

#### Neue Modell-Features in transform.py

| Bereich | Aenderung |
|---|---|
| Buehnenrollen (E-96) | `rolle, person`-Komposit wird dekomponiert und erzeugt eine n-aere `m3gim-ontology:Performance` mit `hasStageRole` (Slug-`@id`, `belongsToWork`) + gegen den Personenindex aufgeloestem `hasPerformer` |
| Mobilitaet (E-97) | `MOBILITY_PLACE_ROLES` = {zielort, absendeort, abreiseort, empfangsort, vertragsort} erzeugen am `ort`-Zweig eine zusaetzliche datumslose `m3gim-ontology:Annotation` (kein `atDate`); die flache `rico:hasOrHadLocation` bleibt. `wohnort`/`vertragspartner` vertagt (keine Daten). |
| Auffuehrungen (E-98) | `datum, werk`-Branch in `decompose_komposit_value`; `m3gim-ontology:Performance` mit `performanceOf` (nur aus Werkindex) + `auffuehrungsdatum`; `^\d{4}`-Guard filtert Komponist-statt-Werk-Zeilen |
| Finanz (E-99) | `parse_monetary_value`-Umbau: nachgestellte Waehrung abtrennen, Doppelbetraege in zwei DetailAnnotations; neue Waehrungen + detailRoles als Originalcode; `contractStatus`/`realized` fuer „nicht eingehalten" |
| Datum/Evidenz (E-100/E-102) | `m3gim-ontology:hasAnnotation` (inline `m3gim-ontology:Annotation`) fuer klammer-unsichere Datierungen; Datums-Routing (ISO / TimeSpan / DatedEvent / `nach:`); `erstelldatum` als typisierte Property |
| Dokumentvokabular (E-101) | neue dft-Concepts (musikzeitschrift, briefumschlag, chronik, verzeichnis); `dokument`-Typ als `scopeAndContent`/Blank-Node statt Subject; `sammlung` ohne `skos:broader` |
| Datenqualitaet (E-102) | `m3gim-ontology:dataQualityFlag` aus `anmerkung`-Signalen; `m3gim-ontology:processingNote` fuer den Bearbeitungsstand |

### Nachzuege

#### Koordinaten-Patch fuer SpatiotemporalEvents (E-76)

`scripts/transform.py` injiziert Wikidata-Koordinaten jetzt auch in den `m3gim-ontology:atPlace`-Subteil eines `SpatiotemporalEvent`. Vorher hatten nur regulaere `rico:Place`-Entries `geo:lat`/`geo:long`; STE-Orte trugen nur den Namen und blieben auf der Karte unverortet. Zwei minimale Eingriffe: (a) `process_verknuepfungen()` loest den Ortsteil des `ort,datum`-Komposits gegen `indices["ort"]` auf und setzt `wikidata_id`, (b) `add_relations_to_records()` baut den Place-Entry mit gleichem Muster wie im Haupt-Loop und ruft `_inject_enrichment()`. TDD-Abdeckung in `tests/test_22_ste_coordinates.py` (Anker Zuerich Q72, Salzburg Q34713).

#### ORTE-Rollen-Hygiene

Bug: Im Komposit `ort,datum` wurde die Rolle (z. B. `erscheinungsdatum`) blind an beide Haelften vererbt — der `rico:Place` trug dadurch eine Datumsrolle, im UI erschien „Stuttgart (erscheinungsdatum)". Fix in `add_relations_to_records()`: wenn die Rolle in `DATUMSROLLE_TO_PROPERTY` liegt, wird `role` am Place-Entry geloescht. Nicht-Datumsrollen (`auffuehrungsort`, `wohnort`, `erscheinungsort`) bleiben. Regression-Test in `tests/test_23_role_hygiene.py`.

#### Smart-P17 Claim-Selection (E-79)

`enrich-wikidata.py` waehlt fuer Entity-Ref-Properties (P17, P19, P20, P276, P86) jetzt den „aktuellen" Claim via Helper `_pick_current_claim()`: (1) `rank == "preferred"`, (2) Claims ohne `P582`-Qualifier, (3) erster Non-deprecated-Claim. Loest Berlin Q64 → Deutschland (war „Mark Brandenburg" als chronologisch erster Claim). Ebenfalls: Label-Aufloesung laeuft jetzt auch ueber bereits gecachte Entitaeten (vorher blieben Q-IDs aus alten Cache-Laeufen als „Q39"-Strings stehen).

#### Manuelle Q-ID-Approvals — Workflow (E-78)

Manuelle Eintraege in `wikidata-reconciliation.json` (Shape siehe E-74) werden vor dem Commit gegen Live-Wikidata geprueft:

```bash
python scripts/verify-manual-approvals.py
```

Das Skript batch-fetcht Labels + Aliases + Descriptions und vergleicht mit dem `name`-Feld. Exitcode 1 bei Mismatch blockiert CI/Commit. Begruendung: ein Approval-Batch trug stumm falsche Q-IDs (Q2861 war Rostock statt Bayreuth, Q200491 war ein US-Videospiel-Publisher statt Iwano-Frankiwsk). Siehe auch [CLAUDE.md § Manuelle Wikidata-Approvals verifizieren](../CLAUDE.md).

### Pipeline-seitige Normalisierungen

Strukturelle Transformationen (keine Datenfehler-Kaschierung): Spalten-Lowercase nach `pd.read_excel`, Folio-Spalten-Heuristik, Bearbeitungsstand-Kanonisierung, Gender-Suffix-Strip in Rollen, Q-ID-Regex-Filter, Zeitspannen-Normalisierung `YYYY-YYYY` → `YYYY/YYYY`, Unterstrich als Komposit-Trenner (`Datum_Ort` aus dem Dropdown-Export), Hilfsblatt-Filter in `load_verknuepfungen` (Sheets ohne `typ`+`name`), `unprocessedIds`-Set im Store. Vollständiger Katalog mit Prinzip-Einordnung (Spec/Workaround/Policy/Dead), Source-Fix-Vorschlägen und Test-Ankern: **[data.md § Datenqualität](data.md)**.

### Wikidata-Reconciliation

`reconcile.py` implementiert mit:

- **Fuzzy-Matching**: `thefuzz.token_set_ratio`, Confidence-Level exact (≥100), fuzzy_high (≥90), fuzzy_low (≥80)
- P31-Verifikation (instance-of-Check gegen erwarteten Typ)
- **Composer-aware Werk-Matching**: Compound-Query "Titel Komponist", P86-Bonus (+5 Score)
- Caching fuer wiederholte Laeufe
- MIN_NAME_LENGTH=3, CLI: `--min-confidence`, `--force`, `--type`
- **Low-Confidence-Policy (E-74):** `fuzzy_low`-Matches werden im Output markiert, aber nur bei `manual_review: "approved"` an Enrichment + transform.py durchgereicht. Der Rest erscheint im Quality-Snapshot zur redaktionellen Freigabe.

### Wikidata-Enrichment

`enrich-wikidata.py` holt Properties aus der Wikidata API:

- Personen: P106 (Beruf), P412 (Stimmfach), P19/P20 (Geburts-/Sterbeort), P569/P570 (Lebensdaten)
- Orte: P625 (Koordinaten), P17 (Staat)
- Werke: P86 (Komponist), P136 (Genre), P1191 (Urauffuehrungsdatum)
- Orgs: P276 (Standort), P571 (Gruendungsdatum)
- Output: `data/output/wikidata-enrichment.json`
- `transform.py` injiziert Properties als `owl:sameAs` + `m3gim:`-Properties in JSON-LD
- Frontend (loader.js) extrahiert Properties in Store → Indizes-Subtitles, Kosmos-UA-Distanz

### CI/CD

- Kein aktiver Workflow (`.github/workflows/build-views.yml` wegen Merge-Konflikten entfernt)
- Pipeline wird lokal ausgefuehrt, Ergebnisse manuell committet
- Reaktivierung moeglich wenn Dritte Daten updaten sollen

### Dateien in docs/data/

| Datei | Format | Status |
|-------|--------|--------|
| `m3gim.jsonld` | JSON-LD | **Alleinige primäre Datenquelle** für das Frontend. Enthält Records + SpatiotemporalEvents + SKOS-Concepts + AgRelOn-Relationen + Finanz-Details + technische Provenance. |

### Datenstand

Aktuelle Zahlen zum Bestand, Abdeckung, Verknüpfungsrate und Wikidata-Coverage stehen im **Quality-Snapshot** (`data/reports/quality-snapshot.md`). Der Snapshot wird bei jedem Pipeline-Lauf neu generiert und ist der Single Source of Truth für Zahlen gegenüber dem Erschließungsteam; knowledge-Dokumente halten keine laufenden Zählstände vor, weil die bei jedem Rerun veralten.

Aktuelle Korpus-Struktur qualitativ: Teilnachlass UAKUG/NIM mit den Bestandsgruppen Hauptbestand, Plakate und Tonträger, feinerschlossen auf Folio-Ebene ist eine wachsende Auswahl der Konvolute. Welche das sind, steht im Quality-Snapshot. Frühere Stände liegen unter `data/_archive/` als Referenz.

### Datenqualität

Baseline und Handlungsbedarfe stehen gebündelt in **[data.md § Datenqualität](data.md)** (Workaround-Katalog mit Source-Fix-Vorschlägen) und im laufenden **[`data/reports/quality-snapshot.md`](../data/reports/quality-snapshot.md)** (Verknüpfungsrate, Bearbeitungsstand, Wikidata-Coverage pro Entitätstyp, Provenance-Coverage, Low-Confidence-Freigabeliste). Die Pipeline erzeugt den Snapshot bei jedem Lauf neu; sie ist die Single Source of Truth für Zahlen.

### Modell-Weiterentwicklung

- **Phase 6 (abgeschlossen):** `loader.js` hat Store-Maps `dftHierarchy`, `mobilityEvents`, `recordToEvents`, `agentRelations`, `finances` + typisierte Datumsfelder als Fallback in `indexByYear`. Siehe [Frontend](#frontend).
- **Phase 7 (abgeschlossen):** Interface-Redesign nach [design.md](design.md); aktueller Stand der Tab-Sichtbarkeit in [specification.md](specification.md) § Stand (Fokus auf Bestand · Chronik · Statistik · Indizes, die übrigen Tabs verborgen, E-81).
- **Modell-Erweiterung neuer Datenstand (aktiv):** Loader-Fix und die Features aus E-95 bis E-102, testgetrieben umgesetzt (siehe oben). `m3gim-ontology:StageRole` als Entitaet ist Teil davon; ein dedizierter Rollenindex-XLSX (Spalten `m3gim_id`, `name`, `belongsToWork`, `voiceType`, `wikidata_id`) bleibt extern blockiert und wartet auf das Erschliessungsteam.

## Frontend

> Wie das Frontend technisch gebaut ist: Laufzeitmodell, Modulstruktur, Store und State, Routing, build-loses Deployment auf GitHub Pages, Datenfluss von JSON-LD in den Store sowie die Ansichten der einzelnen Tabs. Die vormaligen D3-Visualisierungen (Mobilität, Matrix, Kosmos, Zeitfluss, Lebenspartitur, Lebensstationen) sind entfernt.

### Laufzeitmodell

- **Erfassung:** Google-Sheets-Exporte als XLSX → `data/google-spreadsheet/`
- **Verarbeitung:** Python-Skripte (siehe [Pipeline](#pipeline)) → JSON/JSON-LD in `docs/data/`
- **Präsentation:** Statische SPA in `docs/` (Vanilla JS + D3 v7)
- Offline-first: alle Daten beim Startup geladen (E-05)

### Toolchain

- Vanilla JS mit ES6-Modulen, kein Build-Tool (E-03)
- D3.js v7 via CDN (E-02)
- Hosting: GitHub Pages
- Kein Framework (E-01)

### Verzeichnisstruktur

#### Top-Level

- `docs/` — Frontend und ausgelieferte Daten
- `scripts/` — Datenpipeline
- `data/` — Rohdaten, Reports, Pipeline-Output
- `knowledge/` — Kanonische Wissensbasis
- `tests/` — Pipeline-Testsuite (siehe [testing.md](testing.md))

#### Frontend-Module

| Pfad | Zweck |
|------|-------|
| `main.js` | Einstiegspunkt, `TAB_RENDERERS`-Registry, Lazy-Tab-Rendering, Error Boundaries pro Tab, DEV-Debug-Helper (`window.m3gim.*`) |
| `data/loader.js` | JSON-LD-Ladeschicht, Store-Aufbau inkl. Phase-6-Maps, Koordinaten-Patch-aware STE-Indizierung, Facetten-Indizes `eventsByRole`, `recordsByAgentRole` und `ensembles` |
| `data/records-for.js` | Filter zu Dokumentmenge, die einzige Aufloesung im Frontend: `recordsFor`, `facetIndex`, `facetInventory`. Rein, ohne DOM und ohne d3 |
| `ui/filter-url.js` | Filterzustand im URL-Hash: `serializeFilter`, `parseFilterQuery`, `splitHash`, `buildHash`. Rein |
| `views/_facet-sidebar.js` | Die geteilte linke Filterspalte: Status- und Legendenblock, Facetten mit Mehrfachauswahl, Zeitfenster, Schaerfegrad, Zuruecksetzen |
| `utils/provenance.js` | `extractXlsxSource(obj)` — Provenance-Shape-Extraktion, geteilter Helper für Loader, Inline-Detail und Korb (E-91) |
| `data/constants.js` | `ROLE_CLUSTER`, `ROLE_TO_SECTION`, `AGRELON_LABELS`, `EVENT_ROLE_TO_MOBILITY_CLUSTER` (Session 36), `WIKIDATA_ICON_SVG`, Komponisten-/Personen-Kategorien |
| `ui/router.js` | Hash-Routing, `navigateToView`/`navigateToIndex`, ARIA-State |
| `ui/basket.js` | Wissenskorb (localStorage) |
| `views/archive-holdings.js` | Bestand-Tab: Konvolut-Hierarchie mit Meta-Chips (Top-3-Dokumenttyp + Status-Mix) direkt in der Zeile; Inline-Detail nur für Records, nicht mehr für Konvolute (E-82). Hierarchische Sortierung: Konvolute Signatur-stabil, Kinder innerhalb sortierbar (E-83). |
| `views/archive-timeline.js` | Mobilitäts-Chronik-Tab: scrollender Jahres-Zeitstrahl 1919-2009 mit Sicht-Akzent am Chip, kollabierbarem Dekaden×Sicht-Header (Aggregat→Quelle per Segment-Klick), Sekundär-Datierung undatierter Records und ehrlicher Deckungs-Caption (E-124) |
| `views/chronik-data.js` | Reine Datenschicht der Chronik (kein DOM/d3): `sichtForRecord` (dominante Sicht aus STEs), `secondaryYearForRecord` (Sekundär-Datierung), `aggregateDecadeStacks` (Dekaden×Sicht) |
| `views/archive-inline-detail.js` | Record-Detail mit den funktionalen Blöcken Produktion · Mitwirkende · Werk & Repertoire · Ort & Ereignis · Erwähnt, AgRelOn-Dedup (liest `rel.objectName`/`rel.objectWikidata`, nicht das rohe JSON-LD), Sprach-Label-Auflösung, `buildRoleChip()` als geteilter Helper |
| `views/_archive-toolbar.js` | Geteilte Toolbar (Suche, Dokumenttyp-Filter, Person-Filter, Count-Anzeige) für Bestand + Chronik |
| `views/indexes.js` | Grid-Explorer über Personen, Organisationen, Orte und Werke mit Beziehungsbadges (AgRelOn), nur Einträge mit `records.size > 0` |
| `views/mobility.js` | Karten-Tab (sichtbar, **entitätszentriert seit E-126**): man wählt eine Entität (Organisation/Person) und sieht ihre Orte als Knoten, je Ort ein Tortendiagramm nach Mobilitätssicht. **Keine** Verbindungslinien (die Trajektorie aus E-111 entfiel). Datenschicht `views/entity-map-data.js` zieht die Orte aus Record-Orten (`rico:hasOrHadLocation`) + STE zusammen und vergibt Verortungs-Stufen (`secured`/`city`/`far`/`unlocatable`, Adressen auf die Stadt hochgerollt). Sidebar: Entitäts-Auswahl, Zeitraum, Farb- und Verortungs-Legende, Klick-Detail (Zuordnungen + alle Dokumente). Basemap lokal: Ozean (SVG-Hintergrund) + Gradnetz, Ländergeometrie `docs/data/geo/countries-110m.geo.json` (Natural Earth 110m), kein Kartenserver, kein Leaflet. |
| `views/network.js` | Orchestrator des Netzwerk-Tabs (E-93, E-94): State-Eigentum, `draw`, Filter-Anwendung, Detail-Panel, Telemetrie, Zeitfenster-Index. Delegiert Sidebar an `_network-sidebar.js` und Canvas-Rendering an `_network-canvas.js`. Im Session-47-Split deutlich verschlankt. |
| `views/_network-geometry.js` | Reine Layout-Funktionen für den Netzwerk-Tab (E-93): `computeLayout`, `computeCoOccurrence`, `classifyRing`, `nodeColor`, `derivePersonKategorie`, `labelGeometry`. Keine DOM-/D3-Aufrufe, deterministisch, mit Node-Unit-Tests abgedeckt (E-94). |
| `views/_network-sidebar.js` | Sidebar-UI des Netzwerk-Tabs (E-94): Suche, Filter-Slider, Toggles (Ko-Okkurrenz + AgRelOn getrennt), Zeitfenster, Kategorie-Chips, Legende, Reset. Reine UI-Produktion mit `state`/`actions`-Vertrag — keine direkte State-Mutation. |
| `views/_network-canvas.js` | SVG-Rendering, Zoom/Pan, Hover-/Highlight-Logik des Netzwerk-Tabs (E-94): `drawCanvas`, `renderZoomControls`, `applyHighlight` (Knoten-Nachbarschaft), `applyEdgeHighlight` (einzelne Kante + Endpunkte). Kommuniziert mit dem Orchestrator nur ueber `zoomRefs` (wird mutiert) und `actions = {getSelected, setSelected}`. |
| `views/basket.js` | Korb-Cards mit `buildRoleChip()` + funktionale Blöcke (Produktion · Mitwirkende · Werk & Repertoire · Ort & Ereignis · Erwähnt · Weitere · Beziehungen · Finanzen), CSV- + BibTeX-Export inkl. AgRelOn + Finanzen |
| `utils/format.js`, `utils/dom.js`, `utils/date-parser.js`, `utils/normalize.js` | Formatierungshilfen, DOM-Helper, Datumsparser, Namensnormalisierung |

`data/aggregator.js` und `utils/viz-components.js` wurden Session 32 mit den D3-Prototypen entfernt.

CSS-Dateien unter `docs/css/`: `variables`, `base`, `components`, `sidebar`, `facets`, `archive`, `indexes`, `basket`, `mobility`, `network`, `statistics`, `verknuepfungen`, `pages`. Design-Tokens (Farben, Spacing, Text-Sizes, Transitions) zentral in `variables.css`; alle Tab-CSS nutzen diese Tokens.

#### Info-Seiten (statisches HTML)

Content-Seiten (`about.html`, `projekt.html`, `datenmodell.html`, `impressum.html`); `datenmodell.html` wird von `scripts/build-model-page.py` aus dem Vokabular erzeugt und nie von Hand geschrieben. Einheitliches Template: `info-header`, `info-nav`, `info-main`, `info-footer`. Lesebreite 720px, Source Serif 4 für Titel.

### Routing

- Hash-basiert in `ui/router.js`. Der Katalog `TABS` listet alle registrierten Tabs (Bestand, Chronik, Statistik, Indizes, Karte, Netzwerk, Verknüpfungen, Korb). Verborgene Tabs gibt es seit E-140 nicht mehr; jeder registrierte Tab ist sichtbar.
- Grammatik `#<tab>[/<recordId>][?<query>]`. Der Query-Teil trägt den geteilten Filter und wird in `splitHash` abgetrennt, bevor der Pfad an `/` zerlegt wird; jeder bestehende Deep-Link auf einen Datensatz bleibt dadurch gültig. Geschrieben wird mit `replaceState`, damit ein Sliderschritt keinen History-Eintrag erzeugt.
- Deep Links: `#bestand/UAKUG/NIM_003%20Folio%2001` für Datensatzkontext
- Info-Seiten als eigenständige HTML-Dateien (normale Links, kein Hash-Routing)
- `navigateToIndex(gridType, entityName)` für Cross-Tab-Navigation, `navigateToView(tab, {recordId})` für Sprung aus anderen Views ins Bestand-Tab

### Store-Struktur (aus loader.js)

```
store = {
  // Basis (seit v1)
  fonds,                           // rico:RecordSet, type=Fonds
  konvolute: Map<id, RecordSet>,
  records: Map<id, Record>,        // alle Records inkl. Folios
  allRecords: Array<Record>,       // Folios gefiltert
  byYear: Map<year, Record[]>,     // nutzt rico:date ODER typisierte Datumsfelder als Fallback
  byDocType: Map<typeId, Record[]>,
  bySignatur: Map<sig, Record>,
  persons: Map<name, {records, roles, kategorie, wikidata, occupation, voiceType, birthDate, deathDate}>,
  organizations: Map<name, {records, roles, wikidata}>,
  locations: Map<name, {records, roles, wikidata}>,
  works: Map<name, {records, komponist, wikidata, premiereDate, wdGenre}>,
  konvolutChildren, childToKonvolut,
  konvolutMeta:   Map<kid, {title, dateDisplay, childCount, processedCount, folioId, totalLinks, datedCount, docTypeCounts:Map<dft,count>, statusCounts:Map<status,count>}>,
  folioIds, unprocessedIds,
  recordCount, konvolutCount, exportDate,

  // Phase-6-Erweiterungen + Session-33-Koordinaten-Patch
  dftHierarchy:   Map<conceptId, {id, prefLabel, broader, children[]}>,
  mobilityEvents: Map<eventId, {id, place, placeWikidata, placeLat, placeLon, placeCountry, date, role, description, recordId, xlsxSource}>,
  recordToEvents: Map<recordId, eventId[]>,
  agentRelations: Map<recordId, [{type, objectName, objectWikidata, validityBegin, validityEnd, provenance, xlsxSource}]>,
  finances:       Map<recordId, [{field, role, rawValue, amount:Number, currency, xlsxSource}]>,
  stageRoles:     Map<stageRoleId, name>,         // m3gim:StageRole (E-96/E-98)
  performances:   Map<performanceId, Performance-Node>,
  recordToPerformances: Map<recordId, Performance-Node[]>,  // traegt den engen Schaerfegrad mit
}
```

Alle Tabs lesen direkt aus `m3gim.jsonld` (über Store). Vorverdichtete View-JSONs gibt es seit E-140 nicht mehr.

#### Phase-6-Store-Maps im Überblick

| Store-Map | Quelle im JSON-LD | Verwendung |
|---|---|---|
| `store.dftHierarchy` | Top-Level `skos:Concept`-Knoten + `skos:broader` | Hierarchischer Dokumenttyp-Filter im Archiv |
| `store.mobilityEvents` + `store.recordToEvents` | `m3gim-ontology:Annotation`-Knoten + `m3gim-ontology:hasAnnotation`-Refs; seit Session 33 inkl. `placeLat`/`placeLon`/`placeCountry` aus dem Koordinaten-Patch | Mobilitäts-Atlas, Biogramm-Orte-Spur, Archiv-Inline-Detail Ort-&-Ereignis-Block |
| `store.agentRelations` | `m3gim-ontology:hasAgentRelation`-Array am Record | Archiv-Inline-Detail Beziehungen-Block, Indizes-Personen-Beziehungsbadges, Netzwerk-Tab |
| `store.finances` | `m3gim-ontology:hasDetail`-DetailAnnotations mit `monetaryAmount` + `currency` + `detailRole` | Archiv-Inline-Detail Finanzen-Block |
| `store.stageRoles` | `m3gim-ontology:StageRole`-Knoten (`rico:name`) | Bühnenrollen-Auflösung im Archiv-Inline-Detail (E-96/E-98) |
| `store.performances` | `m3gim-ontology:Performance`-Knoten (n-äre Aufführung mit `m3gim-ontology:hasStageRole`-Ref) | Archiv-Inline-Detail Werk-&-Repertoire-Block |

Die Invarianten werden als Kontrakttests in [test_06_frontend_contract.py](../tests/test_06_frontend_contract.py) durchgängig geprüft. Provenance (`agrelon:metadataProvenance`) wird nicht als eigene Store-Map indexiert, sondern am Record mitgeführt.

**Wichtiger Formatbruch:** `store.agentRelations`, `mobilityEvents` und `finances` transformieren das rohe JSON-LD in ein flaches Lookup-Format (z. B. `objectName`/`objectWikidata` statt des verschachtelten `agrelon:hasObject`). Consumer dürfen nicht die JSON-LD-Keys lesen — das führte Session 35 zu einem stillen Dedup-Bug (Malaniuk doppelt sichtbar). JSDoc-Shapes für `RelationEntry`, `MobilityEvent`, `FinanceEntry`, `DftConcept` sind direkt oberhalb von `buildStore()` in `loader.js` annotiert.

### Ansichten

#### Bestand und Chronik (seit Session 35 eigenständige Tabs)

- Bestand und Chronik sind eigene Top-Level-Tabs (früher Archiv-Sub-Toggle), nutzen eine geteilte Toolbar (`_archive-toolbar.js`).
- **Leitprinzip „nur bearbeitet" als Default, umschaltbar (E-116):** Standardmäßig rendern Konvolute ohne erschlossene Folios, Records ohne Verknüpfungen und Folios mit 0 Links nicht. Der Bestand-Toggle „Nicht erschlossene einblenden" (`zeigeUnerschlossen`, Facet-Kind `toggle`) schaltet den „alle"-Modus frei: dann erscheinen auch die nicht erschlossenen Records und Konvolute, in `getOrderedItems(showAll)` durchgereicht und in `renderRows` über `.archiv-row--unerschlossen` ausgegraut plus Badge „nicht erschlossen" markiert. So sind alle Daten erreichbar, ohne den Erschließungsstand zu kaschieren (Zielbild Linie 3): das Form-ist-Signal-Prinzip wird nicht aufgegeben, sondern als sichtbare Markierung statt als Ausblendung umgesetzt. Folios (reine Metadaten-Records) bleiben in beiden Modi raus. Plakate + Tonträger sind davon unabhängig pauschal ausgeblendet (`EXCLUDED_DFT`, Forschungsscope laut `interface-konzept.md`, nicht Teil des Toggles); die Chronik filtert weiterhin ausschließlich über `unprocessedIds` ohne Toggle, weil der lokale DFT-Ausschluss 0 Matches liefert — Session 36. Log-Stempel-Keys ergänzt um `erschliessung` (erschlossen|alle) und `nicht-erschlossen`.
- **Counter-Tooltip** erklärt „bearbeitet" direkt am `archiv-count`-Span (Schicht 1 + 2 erschlossen, Plakate/Tonträger ausgeblendet, Verweis auf `quality-snapshot.md` für Gesamtzahlen).
- **Mobilitäts-Chronik als Scroll-Zeitstrahl** (E-88/E-124, seit Session 41): jedes Jahr 1919-2009 (+ Ausreisser) rendert eine Zeile mit Jahres-Label links, dichte-adaptivem Dot und Record-Chips rechts; leere Jahre bleiben sichtbar (dichte-adaptiv E-92: Nicht-Dekaden-Jahre als 6-px-Linie, Dekaden-Jahre als Anker), Lückenstruktur als Rhythmus lesbar. **E-124-Reframe zur Mobilitäts-Chronik:** ein linker **Sicht-Akzent** am Chip (`SICHT_COLOR`, geteilt mit Karte/Statistik; kein STE → monochrom = „keine Sicht erschlossen", divergierende Records → Mehrfach-Verlauf); ein kollabierbarer **Dekaden×Sicht-Header**, dessen Segment-Klick genau die belegenden Chips hervorhebt (`chronik-point--hit`/`--dim`) und so das Aggregat auf seine Einzelquellen auflöst (Vorgabe „kein Aggregat ohne Quellen-Rückführung"); **undatierte ehrlich gespalten** — sekundär-datierte Records (typisiertes Feld oder `STE.atDate`) wandern markiert (gestrichelt + `≈`-Badge) in ihre Jahreszeile, echt-undatierte bleiben im Endblock mit Sicht-Mini-Stapel als Kopf; **Achsenkopf-Caption** „N von M datiert (davon K sekundär), L undatiert · S mit Sicht" plus Hinweis „Dichte zeigt den Erschließungsstand, nicht die Aktivität". Reine Datenschicht `chronik-data.js`. Log-Stempel: `records, jahre-belegt, datiert, sekundaer, undatiert, sicht-gedeckt, spanne, gefiltert`.
- **Mobilitätssichten als Chip-Farbfamilie** (Session 36, M3): die Sichten aus [data-model.md § 10](data.md) (performativ, institutionell, korrespondenz, diskursiv, biografisch) sind im Frontend über `EVENT_ROLE_TO_MOBILITY_CLUSTER` in `docs/js/data/constants.js` einem `m3gim-ontology:role` zugeordnet. CSS-Tokens `--color-sicht-performativ|institutionell|korrespondenz|diskursiv|biografisch` in `variables.css`, Chip-Modifier `.chip--mobility-*` in `archiv.css`. Seit E-124 als linker Sicht-Akzent an den Chronik-Chips getragen (`sichtForRecord`). Ungeklärte Rollen (`auftrag`, `entstehung`, finanzielles `ueberweisung`) stehen explizit auf `null` — keine stillschweigende Einordnung. Abgesichert in `tests/test_25_chronik_mobility_cluster.py`.
- **DEV-only Log-Stempel** (Session 36, M3.5): der Stempel pro Tab-Render geht durch `logStamp(viewName, parts)` aus `docs/js/utils/env.js`. `IS_DEV` prüft `localhost`/`127.0.0.1`. Auf `dhcraft.org` bleibt die Konsole stumm, lokal und im Playwright-Smoke erscheint der kompakte State pro Render mit fester Key-Reihenfolge.
- **Konvolut-Meta-Chips direkt in der Zeile** (E-82): Top-3-Dokumenttyp-Chips + Status-Mix (abgeschlossen/begonnen/zurückgestellt) unter dem Konvolut-Titel. Click auf Konvolut-Zeile = Auf/Zuklappen, kein Inline-Detail.
- **Hierarchische Sortierung** (E-83): Konvolute bleiben Signatur-sortiert, Kinder werden *innerhalb* ihres Konvoluts nach dem gewählten Sort-Key sortiert. Bei aktivem Filter flach (Hierarchie dann aufgelöst).
- Titel-Dedup: Folios mit identischem Titel wie Konvolut zeigen leere Titel-Zelle (semantisches Rauschen vermeiden).
- Klickbare Spaltenheader, Autocomplete-Combobox für Personenfilter, Suche über Signatur/Titel/Dokumenttyp/Datum.
- **Inline-Detail für Records:** funktionale Blöcke Produktion · Mitwirkende · Werk & Repertoire · Ort & Ereignis · Erwähnt. Agents mit AgRelOn-Äquivalent werden aus „Mitwirkende" unterdrückt (Dedup-Filter liest das *flache* Loader-Format). Sprach-Kürzel (`en, fr`) werden über `formatLanguage()` zu lesbaren Labels aufgelöst. Alle Chips via `buildRoleChip()` mit Cluster-Farbe + Provenance-Pille.
- Bookmark-Icons an jeder Record-Zeile (toggeln in `store.korb`, Klick auf Tab öffnet den Wissenskorb).
- Reset-Button setzt alle Filter gleichzeitig zurück.

#### Statistik

- Interaktives **Master-Detail-Dashboard** mit Mobilität als Rückgrat (Showroom-Ursprung E-89/E-92, Dashboard E-122, Mobilitäts-Reframing E-123). Geteilte Sidebar-Shell (`viewShell`/`createSidebar`): links ein Single-Select über genau eine Ansicht in den Gruppen **Mobilität** (Wohin & Wann · Art der Mobilität · Mit wem) und **Werk & Bestand** (Repertoire · Personen · Dokumenttypen · Finanzen) plus die Filter; rechts rendert die gewählte Ansicht über die volle Breite. Datenschicht getrennt: Aggregate, Sichten-Konstanten und Filter in `docs/js/views/statistics-data.js` (rein), `statistics.js` ist View-Orchestrierung + DOM-Rendering.
- **Multi-Facetten-Filter:** ein record-basierter **Zeitraum**-Filter plus, nur bei event-getriebenen Ansichten, **Sicht-** und **Land**-Facetten (Mehrfachauswahl). `filterStore(store, {lo, hi, sichten, laender})` schneidet zuerst die Record-Menge aufs Jahresfenster (Sub-Store: `mobilityEvents` über `recordId`, `agentRelations`/`finances` über Map-Key, `persons`/`works` über `records`-Set), dann prunen Sicht/Land nur `mobilityEvents` (Event-, keine Record-Facetten). Leeres Set = nichts, `null` = alles. Die Status-Zeile beziffert Zeitschnitt, ausgeblendete undatierte Records (Erschließungsspiegel, E-87) und aktive Facetten und benennt, dass Sicht/Land Ereignisse schneiden, nicht Dokumente. `rebuild()` per `requestAnimationFrame` gedrosselt; bei View-Wechsel wird die Sidebar neu gebaut (Facetten-Kontext).
- **Ansichten** (alle aus dem Live-Store): **Wohin & Wann** (Jahrzehnt×Sicht als Stapelbalken `buildStackedBars` + Länder-Reichweite aus `placeCountry` + Top-Orte mit Wikidata-Link/Bestand-Drilldown, ehrliche Deckungs-Captions) · **Art der Mobilität** (die Sichten performativ, institutionell, korrespondenz, diskursiv, biografisch + feine `eventRole`-Aufschlüsselung, die `gastspiel`/`aufführung`/`spielzeit` sichtbar macht; Caption zur fehlenden Ensemble-Erfassung) · **Mit wem** (AgRelOn-Typ-Donut, dessen Klick die benannten **Partner** nach Typ filtert) · **Repertoire** (Top-Komponisten) · **Personen** (Rollen-Census des Bestands aus dem `roles`-Set) · **Dokumenttypen** (Long-Tail-Bar Top-12 + „Sonstige“ + „ohne Typ“, Drilldown E-121) · **Finanzen** (Währungen als Donut + Detail-Rollen; Beträge nie summiert, Artefakte als „unklar“-Gruppe, Befund Betrag in der Währungsspalte, Partner-Übergabeliste). Farbe kategorial nur für die Sichten (`SICHT_COLOR`, geteilt mit der Karte), sonst monochrom/sequenziell (`blueShade`), Donut gedämpfte `DONUT_PALETTE`, wiederkehrende Orte via `ortColor` (E-120).
- Tech-Reporting (Bearbeitungsstand-Balken, Wikidata-Abdeckung pro Entitätstyp, Provenienz-Anteil, Low-Confidence-Policy) wurde aus der Statistik entfernt und lebt im Markdown-Report `data/reports/quality-snapshot.md`. Die Statistik zeigt, was die Daten *sind*, nicht wie vollständig sie sind.
- D3 v7 global via CDN; DOM-Primitive im View-Modul: `buildDonut(data, {size, ariaLabel})` (kategorische Anteile, Hover-Verkettung Segment/Legende, optional klickbare Segmente für Drilldown), `buildHorizontalBars(rows)`, `buildStackedBars(rows, segMeta)` (gestapelt nach Sicht). `buildDonut` fällt bei CDN-Ausfall/leeren Daten auf `buildHorizontalBars` zurück.
- Pure Datenschicht `statistics-data.js` (kein DOM/d3) exportiert `facetInventory`, `filterStore` und die Aggregate (`aggregateSichten`, `aggregateEventRoles`, `aggregateDecadesBySicht`, `aggregatePlaces`, `aggregateCountries`, `aggregateDocTypes`, `aggregateAgentRelations`, `aggregateRelationPartners`, `aggregatePersonRollen`, `aggregateComposers`, `aggregateFinances`); sie laufen auf dem gefilterten Sub-Store, ohne den Filter zu kennen.
- Log-Stempel `[statistik] records:N | events:N | personen:N | ansichten:N | aktiv:<id> | spanne:Y-Y | undatiert:N | sicht:<n|alle> | land:<n|alle>` (E-123; ersetzt die E-122-Keys `panels`/`sichtbar`/`doctypes`/`orte`/`relationen`/`komponisten`/`finanzen`). `stamp_expectations['statistik']` prüft `records/events/personen/ansichten/aktiv`.

#### Indizes

- Grid-Blöcke Personen, Organisationen, Orte und Werke, parallel sichtbar im 2×2-Layout
- **Globale Toolbar** (E-91, seit Session 44): nutzt `buildToolbar` aus [`_toolbar.js`](../docs/js/views/_toolbar.js) mit den Facetten Such-Input (`q`, filtert alle Grids gleichzeitig über `config.searchFields`) und Toggle `Nur mit Wikidata` (filtert Entries ohne Q-ID aus). Per-Grid-Suche entfällt.
- **Cross-Grid-Facettensuche**: Klick auf Index-Eintrag setzt `activeFilter = { gridKey, name, recordIds }` und filtert die übrigen Grids auf Record-Overlap. Sichtbar als Chip unter der Toolbar, X-Button setzt zurück. Zweite Filterebene neben der Toolbar, unabhängig.
- Detail-Expansion pro Eintrag begrenzt + „Alle im Archiv"-Link
- Wikidata-Icons bei Einträgen mit Q-ID
- **Subtitles** aus WD-Enrichment: `Beruf · Stimmfach · Lebensdaten` unter Personennamen (E-61)
- **Beziehungsbadges an Personen** (Session 32): Loader-Pass 2.5 resolviert AgRelOn-Relationen rückwärts auf Personen-Einträge; `renderNameCell()` zeigt eine dritte Zeile `idx-relations` mit Chips (Match primär Q-ID, sekundär `normalizePerson(name)`).

#### Mobilität

- Entitätszentrierte D3-geo-Karte über die volle Breite (E-126, sichtbarer Tab `karte`). Projektion `geoMercator.fitExtent` auf die europäischen Punkte, lokale Ländergeometrie `docs/data/geo/countries-110m.geo.json` (Natural Earth 110m), kein Tile-Server, kein API-Key, kein Leaflet; Basemap-Ebenen Ozean (SVG-Hintergrund) + Gradnetz (`d3.geoGraticule`)
- Auswahl einer Entität (Organisation/Person) in der Sidebar; ihre Orte werden aus Record-Orten (`rico:hasOrHadLocation`) + STE zusammengezogen (`views/entity-map-data.js`). Default = alle Orte des Bestands
- Orte als Knoten, je Ort ein Tortendiagramm nach Mobilitätssicht (`mobilityClusterFor`/`EVENT_ROLE_TO_MOBILITY_CLUSTER`, E-110; Farben aus `SICHT_COLOR`), Knotengröße nach Belegzahl im Zeitfenster
- **Keine Verbindungslinien** — die biografische Trajektorie aus E-111 (gerichtete Pfeile, Zeitregler) ist entfernt; die räumliche Verteilung einer Entität ist die Aussage, nicht der Weg
- Verortungs-Sicherheit visuell kodiert (Ring-Stil + Legende): `secured` durchgezogen, `city` (Adresse auf die Stadtkoordinate hochgerollt) gestrichelt, `far` (Fehlmatch-Verdacht AF-01, [data/reports/reconciliation-register.md](../data/reports/reconciliation-register.md)) gestrichelt-warnfarben, `unlocatable` als eingeklappte Liste statt Kartenpunkt
- Hover-Tooltip (Proportionsbalken) und Klick-Detail (Zuordnungen nach Sicht + alle verknüpften Dokumente); Zoom und Pan per `d3.zoom`, `non-scaling-stroke` hält Linien und Ringe beim Zoomen konstant (E-114-Erbe)

#### Netzwerk

Konzentrische Personen-Visualisierung um Malaniuk (E-93, Session 46; Session-47-Hygiene-Runde E-94). Antwortet auf die Forschungsfrage „Mit welchen Personen stand Malaniuk in Beziehung?". Tabelle-vor-Graph wurde hier bewusst verlassen — die vorherige Pivot-Tabelle zeigte nur die wenigen explizit annotierten AgRelOn-Partner und blendete die Wagner-Familie, Strauss, Mozart und die übrigen Multi-Record-Personen aus. Der Tab ist in die Module [`_network-geometry.js`](../docs/js/views/_network-geometry.js) (pure Funktionen, mit Unit-Tests), [`_network-sidebar.js`](../docs/js/views/_network-sidebar.js) (Filter-UI mit `state`/`actions`-Vertrag), [`_network-canvas.js`](../docs/js/views/_network-canvas.js) (SVG-Rendering + Hover + Zoom) und [`network.js`](../docs/js/views/network.js) (Orchestrator) gesplittet.

- **Ringe nach Evidenzstärke.** Malaniuk im Zentrum (KUG-Blau, r=38). Ring 1 (`R * 0.32`) = harte Beziehung: `entry.relations.length > 0` ODER (Wikidata-verknüpft UND `records.size ≥ 5`). Ring 2 (`R * 0.82`) = wiederkehrendes Umfeld: `records.size ≥ 2` ODER `entry.kategorie !== "Andere"`. Ring 3 (einmalige Nennungen) ist bewusst weggefiltert — reiner dekorativer Halo. Winkel alphabetisch pro Ring (sortKey nach normalisiertem Nachnamen), gleichverteilt über 2π, Start 12 Uhr. Positionen analytisch aus Sinus/Kosinus — keine Force-Simulation, Determinismus vor Schönheit ([design.md § Lektionen aus den entfernten Visualisierungen](design.md)).
- **Rolle als zweite Dimension über die Füllfarbe.** `derivePersonKategorie(entry)` leitet die Kategorie aus den tatsächlichen `entry.roles`-Sets ab (Prioritätsordnung Produktion > Bühne > Vermittlung > Korrespondenz > Presse > Erwähnt; nur „erwähnt"-Varianten ohne Sonst-Rolle → „Erwähnt"; Rest → „Andere"). Ersetzt die statische Namens-Keyword-Kategorie aus `normalize.js`, die nur einen kleinen Teil der Personen traf und den Rest stumm in „Andere" kippte. Farbpalette in `NETZWERK_KATEGORIEN` (Produktion violett, Bühne gold, Vermittlung grün, Korrespondenz braun, Presse oliv, Erwähnt hellgrau, Andere neutral).
- **Linientypen explizit unterschieden** (Session 46, nach Nutzertest). Gerade blaue Radial-Linien zum Zentrum = `agrelon:*`-Beziehungen, **explizit** in den Archiv-Metadaten annotiert (aus `store.agentRelations`). Geschwungene Bezier-Bänder zwischen Knoten = **Ko-Okkurrenz**, automatisch aus gemeinsamen Dokumenten abgeleitet (`computeCoOccurrence` enumeriert Paare pro Record und zählt, Threshold `minShared` steuerbar). Jede Linie trägt einen nativen SVG-`<title>`-Tooltip, der den *Grund* der Verbindung zeigt: für AgRelOn den deutschen Beziehungstyp (via `AGRELON_LABELS`), für Ko-Okkurrenz die Anzahl geteilter Dokumente. Beide Linientypen haben eigene Sichtbarkeits-Toggle in der Sidebar — der Unterschied war vorher im UI nicht lesbar und hat beim Test verwirrt.
- **Interaktion.** Klick pinnt den Highlight-Zustand (Knoten bekommt Kontur + Drop-Shadow, Nachbarn werden beschriftet, Rest gedimmt). Gepinnt ignoriert der View weitere Hover, bis der User ins Leere klickt oder denselben Knoten erneut klickt. Doppelklick-Zoom ist deaktiviert, damit der Pin-Flow nicht mit D3-Zoom kollidiert. Detail-Panel rechts (sticky, box-shadowed): Titel + Wikidata-Badge, Meta-Zeile (Kategorie · Dokumenten-Count · Ring · Evidenz-Typ), Beziehungs-Chips via `buildRoleChip({cluster: 'beziehung'})`, Rollen-Chips aus `entry.roles`, chronologische Belegliste. Klick auf Beleg → `navigateToView('bestand', {recordId})`.
- **Filter-Sidebar** (`.netzwerk__sidebar`, 300 px breit). Slider `Mind. Dokumente` und `Verkn. ab (gem. Dok.)`, Toggles (Ko-Okkurrenz-Linien / AgRelOn-Linien / Nur Wikidata / Nur AgRelOn-Personen), Zeitfenster-Block mit Von/Bis-Slider (baut einen Person-→-Jahres-Index aus Record-Daten auf und verbirgt Personen ohne Records im Zeitfenster), Kategorie-Chips als Multi-Select mit Live-Counts, Legende (immer ausgeklappt) mit expliziten Swatches für Ring 1 (solid), Ring 2 (dashed), gerade Linie (AgRelOn), geschwungene Linie (Ko-Okkurrenz), Wikidata-Stern. Filter ändern nur Opazität, nicht Position — der „groß anfangen, dann verdichten"-Flow funktioniert ohne Layout-Sprung. Coverage-Block prominent oben: `N Personen` + `X AgRelOn · Y Ko-Okk. · Ring 1: N₁ · Ring 2: N₂ · von total`.
- **Zoom + Pan** via `d3.zoom()`, ScaleExtent `[0.5, 4]`, Controls `+/−/⊙` oben links im Canvas. Labels bekommen einen weißen Text-Halo (`paint-order: stroke fill` + `stroke: var(--color-paper)` + `stroke-width: 3px`), damit sie im Kantenwirrwarr lesbar bleiben. Ring-1-Labels und Ring-2-Labels für Personen mit `records.size ≥ 3` sind permanent sichtbar, der Rest nur on-hover/pin/neighbour.
- **Telemetrie.** Log-Stempel `[netzwerk] total:N | ring1:N₁ | ring2:N₂ | agrelon:N` pro Render — die Zähler lassen sich aus der Konsole und aus dem Playwright-Smoke lesen (stamp_expectation `["total", "ring1", "ring2", "agrelon"]`).

#### Verknüpfungen

Heterogener (multivariater) Graph über Person, Ort, Werk und Institution um eine Fokus-Entität, gebaut am 2026-06-23 als Milestone M3 der Partner-Runde Juni und im selben Zug an den geteilten Filter gekoppelt (M4). Der Tab beantwortet „Malaniuk 1952 in Bayreuth, welche Werke, wer war beteiligt" als generalisierten, filterbaren Schnitt, womit Bayreuth ein Filterergebnis wird und kein eigener Bereich ([journal.md](journal.md), Bayreuth als filterbarer Schnitt). Der Tab ist in [`_verknuepfungen-geometry.js`](../docs/js/views/_verknuepfungen-geometry.js) (Graphaufbau und Layout als reine Funktionen, unit-getestet über `tests/frontend/verknuepfungen-geometry.test.mjs`) und [`verknuepfungen.js`](../docs/js/views/verknuepfungen.js) (SVG-Rendering, Detail-Panel, view-eigene Sidebar-Sektionen) gesplittet; die Filterspalte kommt aus [`_facet-sidebar.js`](../docs/js/views/_facet-sidebar.js).

- **Zwei Schärfegrade, sichtbar getrennt.** `weit` heißt im selben Dokument genannt, also Ko-Okkurrenz und ausdrücklich kein Auftrittsnachweis; `eng` schränkt auf die Records ein, die ein `m3gim-ontology:Annotation` oder eine `m3gim-ontology:Performance` tragen. Der Statusblock der Sidebar nennt in beiden Modi, wie viele der Dokumente im Schnitt einen raumzeitlichen oder Aufführungs-Beleg tragen. Die Differenz wird damit benannt und bleibt ungeglättet.
- **Geteilt gegen lokal.** Seit dem 2026-08-31 trägt der Tab die geteilte linke Filterspalte statt der Controls-Zeile über dem Bild; die Fließtext-Caption ist durch den strukturierten Status- und Legendenblock der Spalte abgelöst, ihre Aussagen bleiben vollständig. Die Kappung je Knotentyp steht als Bezifferung am jeweiligen Toggle, das den Typ nennt und daneben die Zahl der gezeigten und der vorhandenen Kandidaten (etwa 12 von 195). Der Schnitt kommt aus `recordsFor` mit dem Record-Satz der Fokus-Entität als Startmenge, sodass Zählstand, Deckung und Bild dieselbe Menge meinen.
  - Schärfegrad weit/eng: schaltet den Record-Satz um, Differenz wird benannt (recordsEng/recordsWeit).
  - Die Facetten Person, Ort, Werk, Institution und Rolle sowie das Zeitfenster: geteilter Filter-State (`filter-state.js`), wirken auf den Graph.
  - Knotentyp-Toggles: jeder Typ einzeln abschaltbar (wörtliche Partnervorgabe).
  - Fokus-Wechsel (Person/Ort): lokaler View-State.
  - Knoten-Klick: Detail-Panel mit datengetriebenen Chips (kein redaktionelles Deuten).
- **Determinismus.** Positionen aus reinen Funktionen in `_verknuepfungen-geometry.js` (unit-getestet), keine Force-Simulation. Vier Typ-Sektoren aus festen Winkeln, zwei Ringe gegen Gedränge, Knotenradius aus der Zahl der geteilten Dokumente.
- **Kappung wird ausgewiesen.** Je Knotentyp rendert der Graph nur die stärksten Nachbarn (`TOP_N`). `stats.candidates` nennt pro Typ die Zahl vor der Kappung, das Toggle in der Sidebar zeigt sie an, und der Statusblock führt die Summe der weggefallenen Knoten, statt die Kappung stumm zu lassen.
- **Detail-Panel.** Die Chips folgen dem Rolle-Prefix-Muster und ziehen ihre Werte aus `nodeMeta`, je Typ die datengedeckten Felder (Institution Sitz und Kontakt, Person Lebensspanne und Stimmfach, Werk Partie und Komponist, dazu die Rollen). Die Partie kommt aus der kuratierten Werkindex-Spalte `rolle/stimme`, die die Pipeline vor M1 fallen ließ.
- **Telemetrie.** Log-Stempel `[verknuepfungen]` pro Render mit Fokus, Schärfegrad, Zahl der aktiven Facetten, den Werten jeder Facette, Zeitfenster, Knotenzahl gesamt und je Typ (`k-person` und Geschwister), `recordsWeit`, `recordsEng` und der Kappungssumme.

#### Wissenskorb

- Bookmark-Icons in Bestand, Indizes-Detail und Archiv-Inline-Detail; `toggleKorb(id)` + `onKorbChange`-Callback für Re-Render
- Card pro Record: Mono-Signatur (Deep-Link auf `#bestand/...`) · Serif-Titel · Typ-Badge · Remove-Button · Meta-Zeile (Datum · Sprache · Umfang · Status) · funktionale Blöcke aus dem Inline-Detail-Muster (Produktion, Mitwirkende, Werk & Repertoire, Ort & Ereignis, Erwähnt, Weitere) plus eigene Blöcke Beziehungen (AgRelOn) und Finanzen
- Chips durch `buildRoleChip()` aus `archive-inline-detail.js`; Provenance-Pille und Wikidata-Badge pro Chip; Klick springt in den passenden Index
- CSV: Spalten Signatur, Titel, Typ, Datierung, Konvolut, Personen (mit Rollen), Orte (inkl. STE-Events mit Datum), Werke (mit Komponist), Beziehungen (AgRelOn), Finanzen (Betrag + Währung + Rolle). UTF-8 BOM
- BibTeX: `@misc{SIG_sanitized, ...}`, Autor primär aus `verfasser:in`, Fallback auf `agrelon:HasCorrespondent`-Sender
- localStorage-Persistenz (Key `m3gim-korb`); Badge in der Tab-Bar zeigt die Anzahl

### DEV/Prod-Verhalten und Error Boundaries

- **DEV/Prod-Logging** über `viewLog()`, das auf GitHub Pages ein No-Op ist (E-50). Auf localhost zeigt `main.js` beim Seitenaufruf einen strukturierten Store-Report (Records, Konvolute, Phase-6-Maps, WD-Coverage pro Index, Provenance-Coverage) und setzt `window.m3gim` mit Debug-Helpern `window.m3gim.store`, `window.m3gim.inspect(recordId)`, `window.m3gim.finances()`, `window.m3gim.agentRelations()`, `window.m3gim.mobilityEvents()`, `window.m3gim.dftTree()` und `window.m3gim.provenanceOf(recordId)` (letzterer zeigt alle XLSX-Quellen eines Records + Nested Entities als Liste `{field, sheet, row, datenpunkt}`). Auf Produktion (dhcraft.org) bleibt alles stumm.
- **Error Boundaries** pro View: `main.js` fängt Render-Fehler pro Tab ab (sync und async, E-51).

### Erweiterung für den neuen Datenstand (umgesetzt)

Die freigegebene Modell-Erweiterung ([journal.md](journal.md) E-95 bis E-102) ist committet (007b8c2) und im Code live. Die Reihenfolge steuerte der damalige Plan.

- **Vokabular-Kopplung in `constants.js`.** Die Mobilitäts-Ortsrollen (`zielort`, `absendeort`, `abreiseort`, `empfangsort`, `vertragsort`) sind in `EVENT_ROLE_TO_MOBILITY_CLUSTER` auf den Cluster `korrespondenz` gemappt (E-110, order-m3gim Punkt 1, ratifiziert die zuvor offene `null`-Führung) — zielort/abreiseort = Reisemobilität, empfangsort = Korrespondenz, absendeort = beides, vertragsort = Mobilitäts-Ortsrolle derselben Spur, data.md § Ortsrollen/§ 10 folgend. Weitere vorgemerkte eventRoles (`aufnahme`, `generalprobe`, `empfang`) und Rollen (Crew, `publikum`/`abgebildet`) bleiben auskommentiert gerüstet, bis der tiefere Export sie mit Daten füllt. Dokumenttyp-Labels kommen nicht mehr aus einer Hand-Map, sondern über `dftLabel(store, id)` aus `store.dftHierarchy`. Die Leitplanke Vokabular-Kopplung (`test_25`/`test_15`) bleibt grün.
- **Loader.** Die datumslosen Mobilitäts-STEs setzen kein `atDate` voraus (`date: null`). Die Ablösung des `m3gim:hasPerformanceRole`-Artefakts durch `m3gim-ontology:StageRole`-Entitäten und n-äre `m3gim-ontology:Performance` (gelesen in `archive-inline-detail`) ist umgesetzt und über die neuen Store-Maps `store.stageRoles` + `store.performances` angebunden. Die neuen Record-Felder `dataQualityFlag`, `bearbeitungsnotiz` und `erstelldatum` liegen an den Record-Knoten. Vertagt: der `wohnort`-Zustand mit Gültigkeitsperiode sowie `contractStatus`/`realized` (E-99, keine Datendeckung); `qualityConfidence` wird bewusst nicht fabriziert. <!-- vocab-exempt: nennt das mit E-96 abgeloeste Attribut -->
- **Datums-Handling (offen).** `date-parser.js` gibt qualifizierte Datierungen heute roh aus; Anzeige und Jahres-Extraktion sind um die Qualifier (`circa:`/`vor:`/`nach:`) und das `DatedEvent`-Shape (`m3gim-ontology:hasAnnotation`) noch zu erweitern.
- **Wirkung.** Die Mobilitäts-Strukturen tragen den sichtbaren Mobilitäts-Tab (E-111, D3-geo-Karte); die zurückgestellten Tabs Mobilitäts-Atlas, Repertoire und Biogramm bleiben damit ebenfalls tragfähig. Der Bühnenrollen-Block steht in [design.md](design.md). Eine UI-Anzeige für `dataQualityFlag` (und ein etwaiger Vertragsstatus) ist noch nicht umgesetzt — die Flags liegen vorerst nur in den Daten.

### Cross-View-Filter

Der view-übergreifende einheitliche Filter (Entwurf E-117, order-m3gim Milestone 3; vormals eigenes Dokument `filter-modell.md`). Ein gesetzter Schnitt nach Ort, Person, Werk, Rolle, Zeitfenster oder Mobilitätssicht soll synchron in allen filterbaren Views wirken, statt in jedem Tab getrennt gesetzt zu werden. Der Filter ist ein neutraler gekoppelter Schnitt mit den sichtbar getrennten Schärfegraden `weit` und `eng`; Bayreuth 1951 bis 1953 wird damit ein reines Filterergebnis, kein eigener View (Entscheidung in [journal.md](journal.md), Bayreuth als filterbarer Schnitt). Erster realer Baustein war der Statistik-Zeitfilter (E-122); Milestone 4 ist am 2026-06-23 gebaut, mit `filter-state.js` als Halter, `filter-sync.js` als DOM-freier Projektionsschicht und fünf abonnierenden Views (Bestand, Chronik, Karte, Netzwerk, Verknüpfungen).

#### Ausgangslage

Heute trägt jeder filterbare View seine eigene Filterlogik. Bestand und Chronik teilen `filterByToolbarState` (`_archive-filter.js`) und je eine Instanz von `buildFilterToolbar`, aber mit getrenntem State; Netzwerk hat eine eigene Filter-Sidebar mit Zeitfenster; die Karte filtert view-lokal über Sicht-Legende und Zeitraum. Der Event-Bus `events.js` (E-53) ist ein einmaliger Navigationskanal (`m3gim:navigate`), kein geteilter Filter-State; genau diese Lücke schließt das Modell.

#### Geteiltes Filter-State-Modell

Ein einziges Filter-State-Objekt ist die Quelle, alle Views lesen daraus und schreiben dorthin. Jede Facette zieht ihre Werte aus `store.*`, nicht aus redaktionellen Listen (E-87). Leerwert heißt Facette inaktiv.

| Facette | Wert-Typ | Quelle im Store | Leerwert |
|---|---|---|---|
| `ort` | Liste von Stadtnamen | `store.locations`, Stadt-konsolidiert über `cityOf` (E-108) | `[]` |
| `person` | Liste von Namen | `store.persons` | `[]` |
| `werk` | Liste von Namen | `store.works` | `[]` |
| `institution` | Liste von Namen | `store.organizations` | `[]` |
| `rolle` | Liste von Rollen-Ids | `store.recordsByAgentRole` (Akteursrolle) | `[]` |
| `zeitfenster` | `[vonJahr, bisJahr]` | aus `rico:date` der Records und den Event-Daten | `null` (volle Spanne) |
| `sicht` | Liste von Sicht-Ids | `mobilityClusterFor(eventRole)`, `null` → Bucket `kontext` | `[]` |
| `schaerfe` | `'weit'` \| `'eng'` | Modus, kein Entitätsfilter | `'weit'` |

Jede Entitätsfacette hält seit E-151 eine Liste. Mehrere Werte einer Facette wirken als ODER, verschiedene Facetten als UND. Ein Wert ohne Entsprechung im Bestand betrifft nur sich selbst; treffen alle Werte einer Facette nichts, bleibt die Menge leer. `facetValues(state, key)` in [`filter-state.js`](../docs/js/ui/filter-state.js) bringt jeden Wert auf die Listenform, sodass ein Aufrufer weiterhin einen einzelnen String setzen darf.

Ensemble (`rico:Group`), Ereignisrolle und Währung sind in [`records-for.js`](../docs/js/data/records-for.js) als Achsen gebaut, stehen aber nach der Entscheidung der Projektleitung vom 2026-08-31 noch nicht im geteilten State. Die Ensemble-Deckung ist zu dünn, und die Finanzachse trägt heute nur Vorhandensein und Währung, weil `detailRole` in allen Belegen leer ist.

`rolle` ist die Akteursrolle, nicht die `eventRole`; die `eventRole` speist ausschließlich die `sicht`-Facette. Die bestand-lokale Erschließungs-Umschaltung (E-116, `zeigeUnerschlossen`) bleibt view-lokal, sie ist eine Darstellungsfrage des Bestands, kein view-übergreifender Datenschnitt.

#### Schärfegrade als Filtersemantik

Ein Ort, eine Person, ein Werk koppeln an Daten auf unterschiedlich scharfen Ebenen, und der Filter darf die unscharfe nicht als die scharfe ausgeben.

- `schaerfe = 'weit'`, Record-Bezug. Ein Treffer ist ein Record, der die Entität führt, etwa über `rico:hasOrHadLocation`. Weit und unscharf, weil Sammeldokumente mehrere Orte und Zeiten bündeln; das Vorhandensein im selben Record ist kein Nachweis, dass das Ereignis an diesem Ort stattfand.
- `schaerfe = 'eng'`, Ereignis-Verortung. Ein Treffer ist ein `m3gim-ontology:Annotation` mit `atPlace`, Datum und Koordinaten. Raumzeitlich exakt. Umgesetzt ist der enge Grad als Record-Menge. `engRecordSet(store)` in [`filter-sync.js`](../docs/js/ui/filter-sync.js) und `eventAnchoredRecords(store)` in [`_verknuepfungen-geometry.js`](../docs/js/views/_verknuepfungen-geometry.js) sammeln die Records, die mindestens ein `m3gim-ontology:Annotation` **oder** eine `m3gim-ontology:Performance` tragen, also raumzeitlich oder über eine Aufführung belegt sind. Die Aufführungsbelegung ist gegenüber dem Entwurf hinzugekommen, weil eine belegte Aufführung dieselbe Schärfe stiftet wie ein verortetes Ereignis.

Der Modus engt die Dokumentmenge ein, die `recordsFor` liefert, und wirkt damit hinter allen Facetten zugleich. Default ist `weit`; jeder View zeigt den aktiven Schärfegrad an und nennt im engen Modus die Differenz, wie viele der record-bezogenen Treffer raumzeitlich belegt sind (Erschließungsspiegel-Prinzip E-87 auf den Filter angewendet). Die Karte ist intrinsisch `eng`, das Netzwerk intrinsisch `weit`.

Herkunft der Unterscheidung ist der Bayreuth-Befund vom 2026-06-20, der sie am konkreten Fall durchgearbeitet hat. Seine Definitionen gelten unverändert für jede Entität.

- Bayreuth-Bezug (Record-Ebene). Ein Dokument, das Bayreuth als Ort führt (`rico:hasOrHadLocation`, Stadt-Ebene Bayreuth). Weite, unscharfe Kopplung.
- Bayreuth-Verortung (Ereignis-Ebene). Ein `m3gim-ontology:Annotation` mit `atPlace` Bayreuth, mit Datum und Koordinaten. Enge, raumzeitlich exakte Kopplung.
- Zwei Schärfegrade. Im selben Record wie Bayreuth (weit) gegen nachweislich in Bayreuth (eng).

Die Achsenzahlen beruhen auf der Kopplung Person, Rolle oder Werk steht im selben Record wie ein Bayreuth-Ort, nicht auf nachweislich in Bayreuth. Die Bayreuth-Records sind teils Sammeldokumente (Lebenslauf, Rollenverzeichnis), die mehrere Orte und Spielstätten bündeln. Eine ehrliche Visualisierung muss diese zwei Schärfegrade auseinanderhalten und darf die Record-Kopplung nicht als Bayreuth-Auftrittsnachweis ausgeben. Das ist die Anwendung des Erschließungsspiegel-Prinzips (E-87, E-88) auf den Bayreuth-Fokus.

Drei Personen-Begriffe hängen an derselben Unterscheidung und binden die Netzwerk-artigen Views.

- Akteur. Eine Person über `m3gim-ontology:hasAssociatedAgent`, also belegt mitwirkend (Sänger, Dirigent, Regie, Korrespondenzpartner).
- Erwähnte Subjekt-Person. Eine Person über `rico:hasOrHadSubject` mit `@type rico:Person`, also genannt oder besprochen, oft Komponist. Kein Beleg für eine direkte Zusammenarbeit.
- Annotierte Beziehung gegen Ko-Okkurrenz. Annotiert heißt explizit als AgRelOn-Relation erfasst. Ko-Okkurrenz heißt aus der gemeinsamen Nennung in einem Dokument abgeleitet.

Für eine Netzwerk-Ansicht zählt primär die Akteurs-Achse, die Subjekt-Achse ist Kontext, kein Kontaktnetz.

Die `sicht`-Facette nutzt `mobilityClusterFor` als alleinige Quelle und faltet dessen `null`-Rückgabe in eine explizite Option `kontext`, wie `mobility.js` es bereits tut; der view-lokale `ROLE_TO_TYPE` ist im Bau durch denselben kanonischen Pfad ersetzt worden und existiert nicht mehr.

#### Verteilung über die bestehende Mechanik

Kein neuer Apparat; Event-Bus und generische Toolbar werden erweitert.

- Ein geteilter Filter-Halter (neues Modul `docs/js/ui/filter-state.js`) hält das State-Objekt und bietet `getFilter()`, `setFilter(patch)`, `subscribe(fn)`; `setFilter` dispatcht ein `m3gim:filter`-CustomEvent über denselben `window`-Kanal, den `events.js` trägt.
- Die Views Bestand, Chronik, Netzwerk und Karte abonnieren beim Render und wenden ihre bestehende Filterfunktion auf den geteilten statt auf privaten State an.
- `buildToolbar` (`_toolbar.js`) wird zur Sicht auf den geteilten State, `setFacet` schreibt über `setFilter`, die Toolbar abonniert und spiegelt externe Änderungen (ein Klick auf einen Kartenknoten setzt `ort`, die Ort-Combobox im Bestand zieht nach).
- `onViewNavigate` bleibt unverändert für den orthogonalen Sprung „öffne diesen Record und scrolle hin“.

#### Milestone-4-Stand

Gebaut sind `filter-state.js` mit dem `m3gim:filter`-Kanal, `buildToolbar` rückverdrahtet und Bestand und Chronik umgestellt, Netzwerk-Zeitfenster und Karten-Filter am selben State, der view-lokale `ROLE_TO_TYPE` durch `mobilityClusterFor` ersetzt, und der Schärfegrad als geteiltes Control mit Differenznennung. Bestand und Chronik führen die Differenz über ein eigenes Banner (`updateSchaerfeBanner`), der Verknüpfungen-Tab über seine Caption. Abgesichert ist die Kopplung durch den Smoke-Canary `m4:cross-view-filter` (Ort im Graph gesetzt, Bestand synchron gefiltert), durch `tests/frontend/filter-sync.test.mjs` für die Projektionen und den Loop-Guard und durch den logStamp-Vertrag des Verknüpfungen-Tabs.

Die Persistenz über Tab-Wechsel ist erfüllt, weil der State im Modul lebt und die Views beim einmaligen Render abonniert bleiben.

#### Fundament vom 2026-08-31

Fünf Bausteine lösen die verstreute Filterlogik ab und tragen die Umrüstung der übrigen Ansichten.

##### Listenform durch jede lesende Stelle

Der Zustandshalter hält je Entitätsfacette eine Liste, und jede lesende Stelle ist mitgezogen. Betroffen waren die beiden Projektionen in `filter-sync.js`, die Toolbar-Pipeline in `_archive-filter.js`, die Facetten-Comboboxen in `_toolbar.js` (jetzt mit `addFacet`/`removeFacet` und entfernbaren Chips), der Personenfilter des Netzwerks (`sharedPersons`) und die Ortsauswahl der Karte (`selectedCities`). Der Merge-Vorbehalt aus E-151 ist damit eingelöst; keine Ansicht erwartet noch einen String, während der State Listen hält.

##### `recordsFor` als einzige Auflösung

Aus Store und Filter entsteht in [`docs/js/data/records-for.js`](../docs/js/data/records-for.js) genau eine Dokumentmenge, an der jede Ansicht schneidet. `recordsFor(store, filter, {base})` liefert `ids`, `weit`, `eng`, `undatiert` und `byFacet`, sodass jede Ansicht die Differenz zwischen weitem und engem Grad nennen kann, ohne sie selbst zu rechnen. `facetIndex(store, key)` gibt den Wertindex einer Achse, `facetInventory(store, key)` die wählbaren Werte mit Belegzahl. Ein lexikalischer Gate in `tests/frontend/records-for.test.mjs` hält die fünf früheren Eigenauflösungen fern. Kein Modul unter `docs/js/views/` darf eine Entitätsfacette noch selbst über `store.persons.get(` und Geschwister auflösen. `buildGraph` im Verknüpfungen-Tab nimmt die Menge seither über `opts.records` entgegen, statt sie zu bauen.

##### Die einheitliche linke Filterspalte

[`_facet-sidebar.js`](../docs/js/views/_facet-sidebar.js) baut auf dem Gerüst von `createSidebar`/`viewShell` die Spalte, die jede Visualisierung tragen soll (Vorgabe der Projektleitung nach der Sichtprüfung vom 2026-08-31). Von oben stehen dort ein Status- und Legendenblock, die Facetten Person, Ort, Werk, Institution und Rolle mit Mehrfachauswahl und entfernbaren Chips, das Zeitfenster, der Schärfegrad und am Fuß das Zurücksetzen. Der Statusblock bleibt beim Scrollen stehen und nennt den Zählstand der gefilterten Dokumentmenge, die Deckungsangabe aus `ui/coverage.js`, den Schärfegrad als Badge mit erklärendem Tooltip und die belegte Teilmenge. Die Werte der Facetten kommen ausschließlich aus `facetInventory` und damit aus dem Datensatz. Eine redaktionelle Werteliste im Code bleibt ausgeschlossen (E-87). Über `leadSections` und `sections` hängt eine Ansicht ihre eigenen Regler in dieselbe Spalte. Die Spalte abonniert den geteilten Filter selbst und meldet jede Änderung, eigene wie fremde, als einen einzigen `onChange`-Aufruf; die Ansicht zeichnet daraufhin neu und ruft `update()`.

##### Filterzustand in der URL

Die Grammatik lautet `#<tab>[/<recordId>][?<query>]`, die Kodierung `ort=Bayreuth,Wien&person=Malaniuk%2C%20Ira&jahr=1951-1953&schaerfe=eng`. Das Komma trennt die Werte einer Facette, ein Komma im Wert wird prozentkodiert. Leerwerte erscheinen nicht, also weder eine leere Auswahl noch ein zur vollen Spanne gefaltetes Zeitfenster noch der Default-Schärfegrad. Der Router liest den Query-Teil in `parseHash`, bevor die Views rendern, und `main.js` hängt `syncHashToFilter` an den Filter-Halter. Ein Schnitt ist damit zitierbar und überlebt den Reload; der Smoke-Canary `filter:url-roundtrip` sichert beides.

##### Voreinstellung je Ansicht

`applyViewDefault(patch)` setzt nur Facetten, die seit dem letzten Zurücksetzen unberührt sind, und lässt eine getroffene Wahl stehen. Damit bringt jede Ansicht beim Abonnieren ihren passenden Schärfegrad mit, ohne den geteilten Schnitt zu überschreiben. Der Verknüpfungen-Tab nutzt den Mechanismus mit `weit`; Zeitstrahl und Karte bekommen ihren engen Default in der nächsten Welle.

Umgerüstet ist bisher der Verknüpfungen-Tab. Bestand, Chronik, Karte, Netzwerk und Statistik lesen die Listenform korrekt und hängen unverändert am geteilten Filter, tragen ihre Regler aber weiterhin an ihrer bisherigen Stelle.

### Schnittstellenvertrag

| Thema | Kanonische Quelle |
|-------|------------------|
| Designhaltung, Designsystem, Lektionen aus den entfernten Visualisierungen | [design.md](design.md) |
| Datenmodell, Ontologie, Vokabulare | [data.md](data.md) |
| Pipeline, Datenfluss, Qualitätsbaseline | [Pipeline](#pipeline) |
| Testsuite, TDD-Workflow | [testing.md](testing.md) |
| Architekturentscheidungen | [journal.md](journal.md) |
| Identität, Funktionsumfang, operativer Stand | [specification.md](specification.md) |
| Forschungsrahmen und Use Cases | [research-framework.md](research-framework.md) |
