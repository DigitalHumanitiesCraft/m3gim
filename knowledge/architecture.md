---
title: Architektur
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.6
created: 2026-02-19
updated: 2026-09-03
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

> Dieses Dokument führt beide Architekturhälften von M³GIM. Teil [Pipeline](#pipeline) beschreibt Skriptverantwortung, Datenfluss, ENV-Overrides, Pipeline-Erweiterungen und Qualitäts-Baseline. Teil [Frontend](#frontend) beschreibt Laufzeitmodell, Modulstruktur, Store, Routing, Tab-Leiste, den geteilten Filter und die Ansichten. Der Datenfluss wird im Pipeline-Teil vollständig geführt und im Frontend-Teil nur an seiner Anschlussstelle aufgenommen. Designhaltung und Designsystem stehen in [design.md](design.md).

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
| `scripts/propose-links.py` | Erschliessungsvorschlaege aus dem Abgleich der Objekttitel gegen die vier Indizes, in der Spaltenform der Verknuepfungstabelle. Das Skript schreibt weder Quelltabelle noch Datensatz, vergibt keine Rolle, weil die Rolle eine Aussage ueber die Beziehung ist und nicht im Titel steht, und meldet mehrdeutige Titelstellen, statt sie aufzuloesen (E-147). | XLSX/CSV-Quellen | `$M3GIM_REPORTS_DIR/link-proposals.md` |
| `scripts/verify-manual-approvals.py` | Pflichtlauf nach manuellen Q-ID-Approvals: prueft `match: "manual"`-Eintraege gegen Live-Wikidata-Labels + Typ-Signal; Exitcode 1 bei Mismatch (E-78). Offline-Bypass via `SKIP_VERIFY_MANUAL=1`. | wikidata-reconciliation.json | Konsolenreport, Exitcode |

### ENV-Overrides

Die Pipeline-Skripte respektieren folgende Umgebungsvariablen für Ausnahmefälle (z.B. alternative Datenstände, Experimente):

| ENV | Default |
|---|---|
| `M3GIM_SHEETS_DIR` | `data/google-spreadsheet` |
| `M3GIM_OUTPUT_DIR` | `data/output` |
| `M3GIM_REPORTS_DIR` | `data/reports` |

Die Overrides greifen bei allen sechs Skripten des vollständigen Laufs sowie bei `reconcile.py`. Sie werden seit dem 2026-09-03 an einer Stelle aufgelöst, in `scripts/_common.py`, und von dort importiert; zuvor lasen `audit-data.py` und `report-quality.py` Festpfade und auditierten damit bei gesetzter Variable einen anderen Datenstand als die Transformation (E-167).

`transform.py` kennt zusätzlich `M3GIM_ALLOW_NO_WIKIDATA`. Fehlen `wikidata-reconciliation.json` oder `wikidata-enrichment.json` im Ausgabeverzeichnis, bricht der Lauf mit Exit 1 und einem Hinweis ab, statt einen entkernten Datensatz zu schreiben. Ein bewusster Lauf ohne Normdaten setzt die Variable auf `1`.

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

Die fünf Indextabellen und die Objekttabelle bleiben XLSX. Die Verknüpfungstabelle liegt seit der Lieferung vom 2026-08-31 als CSV-Ausfuhr je Blatt vor (E-152, [data.md](data.md) § Tabellenmodell, Quellformat), weil der XLSX-Export Datums-, Folio- und Bündelungsspalten in Zelltypen umwandelt und dabei Genauigkeit erfindet.

`load_verknuepfungen` in `scripts/transform.py` nimmt beide Quellen an. Der Aufrufer übergibt das Quellverzeichnis oder einen Pfad; existiert darin `verknuepfungen/` mit mindestens einer `Box_*.csv`, gewinnt das CSV-Verzeichnis, sonst greift der XLSX-Pfad mit dem bekannten Dateinamen. Die Provenienz ist in beiden Fällen dieselbe, `_xlsx_sheet` trägt den Blattnamen der Quelle und `_xlsx_row` die 1-basierte Zeile inklusive Kopfzeile. `Typ-Rolle.csv` wird nicht als Verknüpfungsblatt gelesen, sondern als Wertliste für die Kreuzprüfung in `validate.py`.

`build-views.py` kopiert `m3gim.jsonld` nur dann nach `docs/data/`, wenn `M3GIM_OUTPUT_DIR` auf den Default zeigt.

#### Geschlossene Falle, leeres Ausgabeverzeichnis kostete die Normdaten stillschweigend

`transform.py` liest `wikidata-reconciliation.json` und `wikidata-enrichment.json` aus dem **Ausgabe**verzeichnis `$M3GIM_OUTPUT_DIR`, also aus derselben Zone, in die es sein eigenes Ergebnis schreibt. Beide Dateien sind git-getrackt und liegen im normalen Klon bereit. Zeigt `M3GIM_OUTPUT_DIR` auf ein frisches Verzeichnis, oder wird `data/output/` geleert, dann fehlen die beiden Dateien. Bis zum 2026-09-03 meldete der Lauf dafür zwei Hinweiszeilen, endete mit Exit 0 und schrieb einen vollständig aussehenden Datensatz; seither bricht er mit Exit 1 ab, sofern nicht `M3GIM_ALLOW_NO_WIKIDATA=1` gesetzt ist (E-167).

Dem Datensatz fehlen dann sämtliche Wikidata-Properties aus dem Enrichment, also Koordinaten, Lebensdaten, Berufe, Stimmfächer, Komponisten- und Genreangaben, dazu jene Q-IDs, die erst die Reconciliation ergänzt. Übrig bleiben allein die Q-IDs, die in den Index-XLSX selbst erfasst sind. Das Frontend rendert daraufhin eine leere Karte, weil `geo:lat` und `geo:long` nirgends mehr im Graph stehen. Der Verlust wäre im Ergebnis groß und im Protokoll leise, deshalb der Abbruch. Wer mit einem alternativen Ausgabeverzeichnis arbeitet, kopiert die beiden Dateien vorher dorthin.

#### Reihenfolge eines vollständigen Laufs

Explorieren, validieren, transformieren, Ansichten bauen, auditieren, Snapshot schreiben. Die Befehle mit ihren jeweiligen Ausgabezielen stehen in [CLAUDE.md § Kern-Commands](../CLAUDE.md). `reconcile.py` und `enrich-wikidata.py` stehen außerhalb dieses Laufs und werden nur beim Neuziehen des Wikidata-Abgleichs gebraucht.

### Datenfluss

1. **Export** aus Google Sheets nach `$M3GIM_SHEETS_DIR` (git-getrackt fuer Reproduzierbarkeit): Objekt- und Indextabellen als XLSX, die Verknuepfungstabelle als CSV je Blatt unter `verknuepfungen/` (E-152)
2. **Exploration + Validierung** (`explore.py`, `validate.py`) → Reports
   2b. **Reconciliation** (`reconcile.py`) → `wikidata-reconciliation.json` (Fuzzy-Matching, Confidence-Level exact/fuzzy_high/fuzzy_low)
   2c. **Enrichment** (`enrich-wikidata.py`) → `wikidata-enrichment.json` (WD-Properties fuer gematchte Entitaeten)
3. **Modelltransformation** (`transform.py`) → `$M3GIM_OUTPUT_DIR/m3gim.jsonld` mit:
   - `owl:sameAs` + WD-Enrichment-Properties (fuzzy_low nur bei `manual_review: "approved"`, E-74)
   - Skos:Concept-Knoten fuer hierarchische Dokumenttypen (data-model.md § Dokumenttypen-Vokabular)
   - `m3gim-ontology:Annotation` als Top-Level Graph-Entities (data-model.md § Mobilitätsmodell)
   - `agrelon:*`-Relationen fuer Agent-Agent-Beziehungen (data-model.md § AgRelOn-Integration)
   - `agrelon:metadataProvenance` an AgRelOn-Relationen und STEs; Datierungsevidenz wird seit E-106 nicht mehr serialisiert (data-model.md § Meta-Statement-Modell)
   - `m3gim-ontology:Annotation` mit `monetaryAmount`/`currency`/`detailRole` (data-model.md § Finanzschicht)
   - `m3gim-ontology:xlsxSource` pro Record + Nested Entity (technische Quellreferenz auf Sheet + Zeile, data-model.md § Meta-Statement-Modell, E-73)
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

Die Uebernahme verdichtet jetzt feldweise. Identitaet ist die `m3gim_id`, ersatzweise der getrimmte Name; je Feld gewinnt der erste nicht leere Wert; ein gefuelltes Feld wird nie von einem leeren ueberschrieben; `assoziierte_person` sammelt alle Werte der Gruppe. Tragen zwei Zeilen derselben Identitaet in demselben Feld verschiedene nicht leere Werte, gewinnt der erste, und der Fall geht in den Validierungsreport; ein Flag am Knoten des Datensatzes entsteht nicht, weil der Konflikt im Bestand ausschliesslich die Anmerkungsspalte betrifft. Der Schluessel des Werkindex ist das Paar aus Titel und Komponist, weil `Requiem` und `Stabat mater` je drei verschiedene Werke bezeichnen; eine Verknuepfungszeile mit blossem Titel bleibt unaufgeloest und traegt `name-nicht-eindeutig`. Die Regel steht in [data.md](data.md) § Tabellenmodell unter Identitaet und Vorrang in den Indextabellen.

#### Pruefschicht der CSV-Quelle (E-152)

`validate.py` prueft die Verknuepfungszeilen zusaetzlich gegen die Formatregeln der Quelle und meldet jeden Befund mit Tabelle, Blatt und Zeile. Geprueft werden das Datumsformat gegen [data.md](data.md) § Datumskonventionen einschliesslich der Warnklasse fuer Zeitstempelmuster aus einer Autokonvertierung, das Muster der Buendelungskennung, das Folio-Muster mit der Bindestrichform als Befund, die Kreuzpruefung von `typ` und `rolle` gegen `Typ-Rolle.csv`, Zeilen mit `name` und ohne `typ` sowie Signaturstuempfe ohne Konvolutnummer. Kein Befund dieser Schicht veraendert Daten; jeder geht ueber das [Datenfehler-Register](../data/reports/reconciliation-register.md) an das Erschliessungsteam.

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
- **Phase 7 (abgeschlossen):** Interface-Redesign nach [design.md](design.md). Der Funktionsumfang der Tabs steht in [specification.md](specification.md) § Funktionsumfang und Abgrenzung.
- **Modell-Erweiterung neuer Datenstand (aktiv):** Loader-Fix und die Features aus E-95 bis E-102, testgetrieben umgesetzt (siehe oben). `m3gim-ontology:StageRole` als Entitaet ist Teil davon; ein dedizierter Rollenindex-XLSX (Spalten `m3gim_id`, `name`, `belongsToWork`, `voiceType`, `wikidata_id`) bleibt extern blockiert und wartet auf das Erschliessungsteam.

## Frontend

### Laufzeitmodell

Die Erfassung liegt als git-getrackter Export unter `data/google-spreadsheet/` (E-06, E-40), die Pipeline erzeugt daraus `docs/data/m3gim.jsonld`, und die Präsentation ist eine statische Single-Page-Anwendung in `docs/`. Der gesamte Datensatz wird beim Start geladen (E-05). Danach arbeitet die Anwendung ohne weitere Netzanfrage, mit der einen Ausnahme der Ländergeometrie, die die Karte beim ersten Öffnen nachlädt.

`main.js` ist der Einstieg. Es lädt `./data/m3gim.jsonld` über `loadArchive`, blendet den Ladezustand aus, richtet den Korb ein und startet den Router. Die Registry `TAB_RENDERERS` bildet jeden Tab-Key auf seine Renderfunktion ab. Ein Tab wird beim ersten Aktivieren einmal gerendert und danach von seiner eigenen Zeichenlogik aktualisiert, nur der Korb wird bei einer Änderung seines Inhalts komplett neu gerendert. Ein Renderfehler bleibt auf seinen Tab beschränkt und gibt ihn für einen neuen Versuch frei (E-51). Auf localhost lädt `main.js` zusätzlich `utils/dev.js` per dynamischem Import (E-50).

### Toolchain

Vanilla JS mit ES6-Modulen, kein Build-Schritt (E-03), kein Framework (E-01), Auslieferung über GitHub Pages. D3 v7 kommt per CDN (E-02) und trägt zwei Stellen, die Projektion und das Zoomverhalten der Karte in `karte-map.js` und die Zeichnung des Netzwerk-Canvas in `_netzwerk-canvas.js`. Die Balken der Statistik sind DOM-Primitive ohne Bibliothek.

### Verzeichnisstruktur

#### Top-Level

- `docs/` trägt Frontend und ausgelieferte Daten.
- `scripts/` trägt die Datenpipeline.
- `data/` trägt Rohdaten, Reports und Pipeline-Output.
- `knowledge/` trägt die kanonische Wissensbasis.
- `tests/` trägt die Testsuite (siehe [testing.md](testing.md)).

#### Frontend-Module

Jede Ansicht ist nach demselben Schnitt gebaut. Der Orchestrator hält den view-lokalen Zustand, baut die Sidebar und zeichnet. Die Datenschicht daneben ist DOM- und d3-frei und deshalb mit Node-Unit-Tests prüfbar, und wo die Zeichnung umfangreich wird, liegt sie in einem eigenen Modul.

| Pfad | Zweck |
|------|-------|
| `main.js` | Einstieg, `TAB_RENDERERS`-Registry, Lazy-Rendering je Tab, Error Boundaries, dynamischer Import der Diagnose |
| `data/loader.js` | JSON-LD-Ladeschicht und Store-Aufbau in Durchläufen (E-72), dazu die Zugänge zu Datierungen und Verortungen, darunter `primaryYear` als einziger Zeitanker |
| `data/records-for.js` | Filter zu Dokumentmenge, die einzige Auflösung im Frontend, mit `baseIds`, `recordsFor`, `facetInventory`, `docTypeGroups`, `facetCounts`, `yearBounds` und `yearOf`. Rein |
| `data/constants.js` | `CONTENT_FAMILIES` und `familyOfBlock`, `ROLE_CLUSTER`, `ROLE_TO_SECTION`, `AGRELON_LABELS`, `EVENT_ROLE_TO_MOBILITY_CLUSTER` mit `mobilityClusterFor`, die Bezugsebenen der Datierung sowie Wikidata- und Korb-Symbol |
| `ui/router.js` | Hash-Routing, Tab-Umschaltung, ARIA-Zustand, `navigateToView`, `navigateToIndex`, `applyArchivFilter`, Legacy-Aliase. Die einzige Stelle, die in die Adresszeile schreibt |
| `ui/tabs.js` | Tastaturmuster der Tab-Leiste, `nextTabIndex`, `setRovingTabindex`, `initTabKeyboard`. Kennt das Routing nicht, es liefert den gewählten Tab-Namen zurück |
| `ui/sidebar.js` | Das eine Gerüst der linken Filterspalte, `createSidebar(store, opts)` und `viewShell`, dazu die Control-Fabriken |
| `ui/filter-state.js` | Der geteilte Filterzustand mit `getFilter`, `setFilter`, `addFacetValue`, `applyViewDefault`, `resetFilter`, `deviatingKeys` und `subscribe` |
| `ui/filter-url.js` | Der Filter im URL-Hash, `serializeFilter`, `parseFilterQuery`, `splitHash`, `buildHash`. Rein |
| `ui/filter-sync.js` | `applyZeitfenster`, die Faltung zwischen Jahresfenster und Zeitfenster-Facette und der Loop-Guard. Rein |
| `ui/events.js` | Der Navigationskanal `m3gim:navigate` für den Sprung auf einen Datensatz, mit Nachspielen für noch nicht gerenderte Ansichten (E-53) |
| `ui/basket.js` | Korb mit localStorage-Persistenz und Änderungs-Callback |
| `ui/charts.js` | `buildHorizontalBars`, das eine Ranglisten-Primitiv der Statistik. Kennt den Bestand nicht |
| `views/bestand.js` | Orchestrator der Bestandstabelle, mit Spalten und Sortierung, der Anwendung des geteilten Schnitts, dem Zeilenaufbau und dem Inline-Detail |
| `views/bestand-data.js` | Reihenfolge, Sortierung und Badge-Entscheidung der Tabelle, dazu `familiesForRecord` als Grundlage der Erschließungsanzeige. Rein |
| `views/bestand-rows.js` | Zellenbau, also Typ als Text und Konvolut-Badge, Erschließungsanzeige für Zeile und Kopf, Konvolut-Chips, Folio-Hinweis mit Familienpunkt und Korb-Knopf mit `korbIcon` (E-174, E-177) |
| `views/_bestand-filter.js` | Die geteilte Filter-Pipeline von Bestand und Chronik, `filterBySharedState` plus die beiden Freitext-Prädikate |
| `views/chronik.js` | Orchestrator des Jahres-Zeitstrahls samt Dekaden-Header und Record-Chips |
| `views/chronik-data.js` | `sichtForRecord` und `aggregateDecadeStacks`, die Sichten-Konstanten kommen aus `statistik-data.js`. Rein |
| `views/statistik.js` | Orchestrator, hält die Wahl der Ansicht und zeichnet genau eine über die volle Breite |
| `views/statistik-data.js` | Die Aggregationen über die Dokumentmenge des Schnitts. Rein |
| `views/statistik-sections.js` | Je Ansicht eine Sektion aus Ranglisten, mit dem Durchstich in den gefilterten Bestand, wo eine Facette existiert (E-144) |
| `views/indizes.js` | Die vier Register als Grid-Explorer, mit Sortierung, aufklappbarem Detail und Cross-Grid-Schnitt |
| `views/indizes-data.js` | Einträge je Grid, Suche, Normdaten-Schalter und Cross-Grid-Schnitt. Rein |
| `views/karte.js` | Orchestrator der Karte, mit Entitäts- und Landesschnitt, Detail-Region und dem Zusammenspiel mit dem geteilten Filter |
| `views/karte-data.js` | Entitäten, Belege, Verortungsstufen, Länder-Aggregat und Sicht-Aufschlüsselung. Rein |
| `views/karte-map.js` | Projektion, Basemap, Knoten, Zoom und Pan der Karte |
| `views/karte-picker.js` | Die Entitätswahl als Sektions-Spezifikation für `createSidebar` |
| `views/netzwerk.js` | Orchestrator des Graphen, mit Fokus, Knotentypen, Reglern, Detail-Spalte und Telemetrie |
| `views/_netzwerk-geometry.js` | `buildGraph`, `computeLayout`, `computeCoOccurrence`, `focusRecords`, `derivePersonKategorie`, `labelGeometry` und die Typ- und Kategorie-Tabellen. Rein und deterministisch (E-93, E-94) |
| `views/_netzwerk-canvas.js` | SVG-Zeichnung, Zoom-Knöpfe und Hover-Hervorhebung des Graphen |
| `views/record-detail.js` | Das Detail eines Datensatzes über die volle Breite, `buildInlineDetail` und `buildRecordBlocks` als geteilte Quelle der funktionalen Blöcke |
| `views/record-detail-data.js` | `partitionRecord` und `sourceSummary`, die DOM-freie Zerlegung eines Datensatzes. Rein |
| `views/record-chips.js` | Die Chip-Fabriken je Blocktyp und `buildRoleChip` als universelles Daten-Atom |
| `views/korb.js` | Korb-Cards aus denselben Blöcken, dazu CSV- und BibTeX-Export |
| `utils/` | `dom.js` (Elementbau), `env.js` (`IS_DEV`, `logStamp`), `format.js` (Signaturen, Dokumenttypen, DFT-Baum, Gloss), `normalize.js` (Namensfaltung und Trefferbereiche der Autovervollständigung), `date-parser.js`, `provenance.js` (`extractXlsxSource`, E-91), `dev.js` (Diagnose) |

#### Stylesheets

`docs/css/variables.css` trägt die Tokens, jede andere Datei liest ausschließlich daraus. Die Tokens liegen in Schichten. Zuerst die Flächen und Linien mit `--surface`, den beiden warmen Stufen `--surface-2` (Creme) und `--surface-3` (Pergament) und den drei Linienstärken, dann der Akzent in vier Abstufungen, dann die warmen Textwerte und die beiden semantischen Farben für Fehler und Normdaten-Treffer. Der Kopfkommentar der Datei führt die Palettenregel, warme Fläche und kühler Akzent bleiben getrennt (E-186). Darunter die kategoriale Reihe `--cat-1` bis `--cat-6`, aus der Mobilitätssichten und Netzwerk-Kategorien ihre Werte beziehen, und die vier Inhaltsfamilien-Töne, die zugleich die Knotentypen des Netzwerks tragen. Zuletzt Typografie, Textgrößen, Abstände, Layoutmaße, Radien, Übergänge und Schatten. Der Alias-Block ist aufgelöst (E-202). Die beiden Gold-Aliasse fielen mit E-186, weil ein warmer Name auf dem blauen Akzent die verbotene Mischung war, und die sechs verbliebenen Altnamen `--color-kug-blau`, `--color-kug-blau-light`, `--color-kug-blau-dark`, `--color-paper`, `--color-cream` und `--color-parchment` sind in allen Stylesheets durch die Akzent- und Flächen-Tokens ersetzt und danach gelöscht. Zwei Namen für denselben Wert verstellen die Ablesbarkeit der Palettenregel.

| Datei | Rolle |
|---|---|
| `variables.css` | Design-Tokens, die einzige Quelle für jede andere Datei |
| `base.css` | Reset, Typografie, Platzhalterregel aller Eingabefelder (E-188), Seitengerüst aus dem einzeiligen Markenband (`.topbar`, `--brand-band-height`, E-196), Inhalt und Fuß |
| `components.css` | Geteilte Primitive, also Badges, Chips, Legendenzeile, Leerzustand, Spinner, Tooltip und Inline-Detail |
| `tabs.css` | Die Tab-Leiste mit ihren drei Gruppen und der Haarlinie zwischen ihnen (E-160) |
| `sidebar.css` | Gerüst und Controls der einen Filterspalte, `.vs-*` für Sektionen und Regler, `.fs-*` für Facetten und Vorschläge, dazu der Container am Hauptbereich |
| `bestand.css`, `chronik.css`, `indizes.css`, `statistik.css`, `karte.css`, `netzwerk.css`, `korb.css` | Je ein Stylesheet pro Tab, benannt wie sein Tab-Key (E-159), mit ausschließlich ansichtseigenen Visuals |
| `pages.css` | Die eigenständigen Infoseiten |

Der Umbruch für schmale Fenster hängt an einer Container Query statt an der Fensterbreite. `#main-content` eröffnet den Container `view-shell` über `container: view-shell / inline-size`, und die Ansichten fragen ihn mit `@container view-shell (width < 900px)` ab. Der Container sitzt am Elternelement, weil ein Element den Container nicht abfragen kann, den es selbst eröffnet, und weil der Spaltenwechsel des Gerüsts Teil der Antwort ist.

#### Info-Seiten (statisches HTML)

Die Content-Seiten `about.html`, `projekt.html`, `datenmodell.html` und `impressum.html` liegen als eigenständige HTML-Dateien neben der Anwendung und werden über normale Links erreicht, nicht über das Hash-Routing. `datenmodell.html` erzeugt `scripts/build-model-page.py` aus dem Vokabular und wird nie von Hand geschrieben. Erklärende und rechtliche Inhalte stehen als verlinkbare Seiten und nie als modales Overlay über der Anwendung (E-26).

### Routing

Das Routing liegt in `ui/router.js` und ist die einzige Stelle, die in die Adresszeile schreibt.

- Die Grammatik lautet `#<tab>[/<recordId>][?<query>]`. `splitHash` trennt zuerst den Query-Teil ab und zerlegt erst danach den Pfad an `/`, sodass ein bestehender Deep-Link auf einen Datensatz gültig bleibt. Geschrieben wird mit `replaceState`, damit ein Sliderschritt keinen History-Eintrag erzeugt.
- Der Katalog `TABS` führt `bestand`, `chronik`, `statistik`, `indizes`, `karte`, `netzwerk` und `korb`. Jeder registrierte Tab ist sichtbar, verborgene Tabs gibt es seit E-140 nicht mehr.
- Drei Legacy-Aliase halten alte Adressen am Leben. `archiv` wird zu `bestand`, `mobilitaet` und `mobilitaets-atlas` werden zu `karte` (E-118), und `verknuepfungen` wird zu `netzwerk`, weil die Ansicht mit E-160 dort aufgegangen ist. Der Query-Teil überlebt die Umleitung, ein geteilter Link öffnet also denselben Befund. Das Instanzpräfix `m3gim:` aus der Zeit vor der Namensraum-Dreiteilung löst `resolveRecordId` auf `m3gim-data:` auf (E-138).
- `parseHash` liest den Query-Teil in den geteilten Filter, bevor die Ansichten rendern. Ein leerer Query löst den Filter nicht auf, er heißt „dieser Link nennt keinen Schnitt“ und nicht „kein Schnitt“.
- `navigateToIndex(gridType, entityName)` springt in die Indizes, `navigateToView(tab, {recordId})` in eine Ansicht mit Kontext, und `applyArchivFilter(facet, value)` schreibt einen Facettenwert in den geteilten Filter und wechselt in die Ansicht, die ihn zeigt.
- Der Router abonniert den Filter selbst und schreibt jede Änderung als Query-Teil nach, statt sich von `main.js` rufen zu lassen.

### Tab-Leiste

Die Kopfleiste ist eine einzige Zeile, das Markenband in KUG-Blau, und trägt Marke, Tabs und Infolinks zugleich (E-196, löst den Tab-Zeilen-Teil von E-185 ab). `.topbar--app` nimmt dem Band den Zwischenraum und gibt `.topbar__lead` die Breite `calc(var(--view-sidebar-w) - var(--topbar-pad))`, sodass der erste Tab genau auf der linken Kante der Arbeitsfläche steht und mit der Tabelle darunter fluchtet. Die Tab-Leiste dehnt sich über die volle Bandhöhe, damit die Unterlinie des aktiven Tabs auf der Bandkante sitzt. `--top-bar-height` ist damit gleich `--brand-band-height` und bleibt der Wert, gegen den `sidebar.css` die Höhe des Gerüsts rechnet. Die Infoseiten tragen dasselbe Band ohne Tabs. Die Leiste steht in `docs/index.html` als `role="tablist"` mit den drei Gruppen Material, Perspektiven und Werkzeug (E-160). Die Gruppen-Container tragen `role="none"`, damit die Tabs im Barrierefreiheitsbaum direkte Kinder der Tabliste bleiben und die Gruppierung eine reine Leseordnung ist. Sichtbar getrennt werden die Gruppen durch Abstand und eine kurze senkrechte Haarlinie, weil eine Gruppenbeschriftung dauerhaft sichtbaren Erklärtext in die Navigation setzen würde.

`ui/tabs.js` trägt das Tastaturverhalten des WAI-ARIA-Musters. Pfeiltasten laufen über alle Tabs in DOM-Reihenfolge und halten an keiner Gruppengrenze, `Home` und `End` springen an die Enden, und die Bewegung schließt sich zum Ring. Aktivierung folgt dem Fokus. `setRovingTabindex` hält genau einen Tab über die Tabulatortaste erreichbar, und der Router zieht diesen Index nach jedem Wechsel in DOM-Reihenfolge nach, die von der Reihenfolge in `TABS` abweicht. Das Modul liefert nur den gewählten Tab-Namen zurück, das Schreiben des Hash bleibt beim Router.

### Store-Struktur (aus loader.js)

`loadArchive` liest die Datei, unterscheidet fehlende Netzverbindung, fehlende Datei und fehlgeschlagenes Parsen und meldet jeden Fall mit eigenem deutschen Text (E-52). `buildStore` baut daraus die Maps in getrennten Durchläufen auf (E-72). Der erste Durchlauf indiziert die Begriffe, damit eine Annotation ihre Bezugsebene beim Bau schon findet, danach folgen Knoten, Beziehungen, die Konvolut-Hierarchie und zuletzt die Menge der Datensätze ohne jede Verknüpfung.

```
store = {
  fonds, konvolute, records, allRecords, byYear, byDocType, bySignatur,
  persons, organizations, locations, works, ensembles,
  konvolutChildren, childToKonvolut, konvolutMeta, folioIds, unprocessedIds,
  recordCount, konvolutCount, exportDate, qualityMeta,
  dftHierarchy, conceptDefinitions, roleVocab, roleScope, roleRank,
  annotations, recordToAnnotations, recordDatings,
  mobilityEvents, recordToEvents,
  agentRelations, finances,
  stageRoles, performances, recordToPerformances,
  eventsByRole, recordsByAgentRole,
}
```

| Store-Map | Quelle im JSON-LD | Verwendung |
|---|---|---|
| `dftHierarchy`, `conceptDefinitions` | `skos:Concept`-Knoten mit `skos:broader` und Definition | Dokumenttyp-Facette als Baum, Anzeigelabel, Gloss am Badge (E-143) |
| `roleVocab`, `roleScope`, `roleRank` | Rollenbegriffe des Vokabulars mit Bezugsebene und Rang (E-150) | Anzeigeform einer Rolle, Auswahl des Zeitankers, Rollenfacette |
| `annotations`, `recordToAnnotations`, `recordDatings` | `m3gim-ontology:Annotation` und `hasAnnotation` | Datierungen im Detail, Sicht-Facette, `primaryYear` |
| `mobilityEvents`, `recordToEvents` | die verorteten Annotationen samt Koordinaten und Land | Karte, Sicht-Akzent der Chronik, Ort-und-Ereignis-Block des Details |
| `agentRelations` | `m3gim-ontology:hasAgentRelation` am Datensatz | Beziehungsblock des Details, Beziehungsbadges der Indizes, Netzwerk |
| `finances` | Detail-Annotationen mit `monetaryAmount`, `currency` und `detailRole` | Finanzblock von Detail und Korb |
| `stageRoles`, `performances`, `recordToPerformances` | `StageRole`- und `Performance`-Knoten (E-96, E-98) | Werk- und Aufführungsblöcke des Details, Bühnenrollen der Statistik |
| `eventsByRole`, `recordsByAgentRole`, `ensembles` | vorberechnete Facettenindizes | Achsen von `recordsFor`, damit ein Schnitt nicht über den Graph läuft |
| `unprocessedIds` | Datensätze ohne jede Verknüpfung | Definition der Dokumentbasis (E-165) |
| `konvolutMeta` | Aggregat je Konvolut aus Titel, Zeitspanne, Dokumenttyp- und Statuszählung | Gruppenkopf des Bestands |

Die Kontrakttests in [test_06_frontend_contract.py](../tests/test_06_frontend_contract.py) prüfen diese Annahmen aus den Daten heraus.

Ein Formatbruch ist zu beachten. `agentRelations`, `mobilityEvents` und `finances` überführen das rohe JSON-LD in ein flaches Lookup-Format, etwa `objectName` und `objectWikidata` statt des verschachtelten `agrelon:hasObject`. Wer stattdessen die JSON-LD-Schlüssel liest, bekommt still ein leeres Ergebnis, und genau das erzeugte einmal eine doppelt sichtbare Nachlassbildnerin im Detail. Die JSDoc-Shapes für `RelationEntry`, `Annotation`, `FinanceEntry` und `DftConcept` stehen oberhalb von `buildStore()`.

### Cross-View-Filter

Ein einziger Filterzustand trägt alle Ansichten. Ein Schnitt nach Ort, Person, Werk, Institution, Rolle, Dokumenttyp, Erschließungsstand, Sicht, Zeitfenster oder Freitext wirkt in jeder filterbaren Ansicht zugleich, statt in jedem Tab getrennt gesetzt zu werden. Bayreuth zwischen 1951 und 1953 ist damit ein Filterergebnis und keine eigene Ansicht.

#### Der geteilte Zustand

`ui/filter-state.js` hält das Objekt und bietet `getFilter()`, `setFilter(patch)` und `subscribe(fn)`. Eine Änderung dispatcht ein `m3gim:filter`-CustomEvent über denselben `window`-Kanal, den `events.js` benutzt. Anders als der tab-gebundene Navigationskanal fächert es an beliebig viele Abonnenten, und nur eine tatsächliche Änderung löst einen Dispatch aus. Der Zustand lebt im Modul, deshalb überlebt ein Schnitt jeden Tab-Wechsel ohne eigenes Zutun.

| Facette | Wert-Typ | Quelle im Store | Leerwert |
|---|---|---|---|
| `ort` | Liste von Stadtnamen | `locations`, stadtkonsolidiert über `cityOf` (E-108) | `[]` |
| `person` | Liste von Namen | `persons` | `[]` |
| `werk` | Liste von Namen | `works` | `[]` |
| `institution` | Liste von Namen | `organizations` | `[]` |
| `rolle` | Liste von Akteursrollen | `recordsByAgentRole` | `[]` |
| `docType` | Liste von Dokumenttyp-Kennungen | DFT-Hierarchie, Oberbegriffe über `expandDftFilter` | `[]` |
| `stand` | Liste von Erschließungsständen | `m3gim-ontology:processingStatus` am Datensatz | `[]` |
| `sicht` | Liste von Mobilitätssichten | `cluster` an der Annotation, ohne Sicht der Eimer `kontext` | `[]` |
| `zeitfenster` | `[vonJahr, bisJahr]` | `primaryYear` je Datensatz | `null` |
| `search` | Freitext | die Suchfelder der jeweiligen Ansicht | `''` |

Mehrere Werte einer Facette wirken als ODER, verschiedene Facetten als UND (E-151). `facetValues(state, key)` bringt jeden Wert auf die Listenform, sodass eine schreibende Stelle weiterhin einen einzelnen String übergeben darf, und `addFacetValue` hängt an, statt zu ersetzen, sodass ein Klick auf einen Chip den Schnitt verengt (E-91). `rolle` ist die Akteursrolle, die Ereignisrolle speist ausschließlich die Sicht-Facette. Ensemble, Ereignisrolle und Währung sind in `records-for.js` als Achsen gebaut, stehen aber nach der Entscheidung der Projektleitung vom 2026-08-31 nicht im geteilten Zustand, weil die Ensemble-Deckung zu dünn ist und die Finanzachse heute nur Vorhandensein und Währung trägt.

Einen Modus neben den Facetten gibt es nicht mehr. Der Umfang-Umschalter ist in die Facette Erschließungsstand übergegangen (E-162), und der Schärfegrad-Umschalter ist entfallen (E-163). Die Unterscheidung zwischen bloßer Nennung und raumzeitlichem Beleg wird weiterhin beziffert, aber nicht mehr geschnitten.

#### Voreinstellung je Ansicht als Nullpunkt

`applyViewDefault(patch)` setzt nur Facetten, die seit dem letzten Zurücksetzen unberührt sind, und lässt eine getroffene Wahl stehen. Zugleich merkt sich der Halter die Voreinstellung als Nullpunkt der Ansicht. Daran misst sich, was ein aktiver Filter ist. `deviatingKeys()` nennt die Facetten, die vom Nullpunkt abweichen, `isFilterActive()` fasst das zusammen, und `resetFilter()` setzt auf den Nullpunkt zurück statt auf leer. Der Bestand öffnet damit auf abgeschlossen und begonnen, ohne dass diese Vorbelegung als Chip erscheint oder als Filter zählt (E-166). Genutzt wird der Mechanismus heute allein vom Bestand.

#### `recordsFor` als einzige Auflösung

Aus Store und Filter entsteht in `data/records-for.js` genau eine Dokumentmenge, an der jede Ansicht schneidet. Zuvor löste jede Ansicht ihre Facetten selbst auf, und zwei Tabs zeigten zum selben Filter verschiedene Mengen.

`baseIds(store)` ist die Dokumentbasis der ganzen Anwendung, also jeder Datensatz mit mindestens einer Verknüpfung (E-165). Ein Datensatz ohne Verknüpfung wird nicht ausgegraut und nicht weggefiltert, er existiert für die Oberfläche nicht, und das Findmittel zum vollständigen Teilnachlass bleibt das Archiv. Der Erschließungsstand ist eine Facette auf dieser Basis und nicht ihre Definition, denn ein Datensatz kann verknüpft sein und keinen Stand tragen. Für diesen Fall führt die Facette den vierten Wert „ohne Angabe“. Ein Store ohne `unprocessedIds`, wie ihn eine Testfixture baut, legt alle Datensätze in die Basis, damit eine Fixture ihre Ausschlüsse ausdrücklich nennt.

`recordsFor(store, filter, {base})` liefert `ids`, `weit`, `eng`, `undatiert` und `byFacet`. `weit` ist die Größe der Menge, `eng` ihre Teilmenge mit raumzeitlichem oder Aufführungsbeleg. Beide werden gezählt und nie geschnitten, sodass eine Ansicht die Differenz benennen kann, ohne sie selbst zu rechnen. Undatierte Datensätze überleben das Zeitfenster (E-88), denn das Fenster ist ein Ausschnitt der datierten Spur und kein Tilgen des Undatierten. Daneben stehen `facetInventory(store, key)` mit den wählbaren Werten und ihrer Belegzahl, `docTypeGroups(store)` mit dem Dokumenttyp als Baumgruppen, `facetCounts` mit den Belegzahlen im aktuellen Schnitt, `yearBounds` als einzige Jahresachse und `yearOf` als einzige Jahresauflösung über `primaryYear`. Ein lexikalischer Gate in `tests/frontend/records-for.test.mjs` hält die früheren Eigenauflösungen fern, kein Modul unter `docs/js/views/` darf eine Entitätsfacette noch selbst über `store.persons.get(` und Geschwister auflösen.

#### Die eine Filterspalte

`ui/sidebar.js` ist das Gerüst, das jede Ansicht trägt. `createSidebar(store, opts)` baut eine feste Spaltenreihenfolge (E-166).

1. Suche, ein Freitextfeld ohne Titel, dessen Platzhalter die Ansicht über `search` mitgibt; `search: false` lässt das Feld weg, wo es nichts filtert (E-169).
2. Zeitraum als Regler mit zwei Griffen, die Jahreszahlen an den Enden der Schiene und ohne Zahlenfeld daneben. Ein zur vollen Spanne aufgezogener Regler faltet sich auf den Leerwert.
3. Die geteilten Facetten in der Reihenfolge Dokumenttyp, Erschließungsstand, Person, Ort, Werk, Institution (E-184, E-204). Der Erschließungsstand steht als geschlossene Liste seiner vier Werte in der Zeilenform des Baums, `standSection` mit der Control-Art `optionList`; eine Facette Rolle gibt es nicht mehr, die Beteiligungsart trägt die Personenfacette über ihr Rollenpräfix (E-204). Der Dokumenttyp-Baum trägt als Wurzelzeile die Zahl der Dokumente des Schnitts, ohne Abweichung vom Nullpunkt als bloße Zahl und mit Abweichung als Anteil an der Grundmenge (E-170).
4. Die ansichtseigenen Regler aus `sections`.
5. Die Legende aus `legend`.

Eine Ansicht übergibt allein die Punkte vier und fünf, dazu wahlweise `search`, `getCount` für den eigenen Zählstand und `yearSpan` für ihre Achse. Alles übrige kommt aus dem Gerüst und liest den geteilten Zustand. `createSidebar` liefert neben `element` auch `strip`, die Zeile der abweichenden Werte als entfernbare Konturchips mit dem Link zum Zurücksetzen, die jede Ansicht oben in ihre Arbeitsfläche hängt; sie ist leer und ohne Höhe, solange nichts vom Nullpunkt abweicht (E-172, E-182). Ein Ansichts-Default ist gegenüber dem Nullpunkt eine Abweichung, erzeugt also einen Chip, und `resetFilter` führt auf den Nullpunkt (E-170). Genau drei Linien gliedern die Spalte, vor den Facetten, vor den Ansichtsreglern und vor der Legende. Die Spalte abonniert den Filter selbst und meldet jede Änderung, eigene wie fremde, als einen einzigen `onChange`-Aufruf, und `destroy()` meldet das Abonnement beim erneuten Rendern wieder ab.

Die Facetten haben drei Darstellungsformen, weil ihre Wertemengen verschiedener Art sind. Der Dokumenttyp steht als offener Baum ohne Suchfeld, weil er klein und seine Gestalt die Information ist, eine Gruppe ist selbst wählbar und löst über `expandDftFilter` auf ihre Blätter auf. Im Baum trägt die gewählte Zeile Haken und Akzenttext ohne Füllung, die Füllung gehört Hover und Fokus und `--surface-3` dem Tastaturzeiger. Der Chevron ist ein eigenes Ziel über die Zeilenhöhe mit `aria-expanded` und Beschriftung, das den Klick der Zeile nicht auslöst. `impliedByGroup` markiert ein Blatt unter einem gewählten Oberbegriff mit gedämpftem Haken, nimmt ihm den Klick und setzt `aria-disabled`, `toggleGroup` verwirft beim Wählen des Oberbegriffs explizit gewählte Kinder (E-204), und `groupTip` bildet den Tooltip des Gruppenkopfs aus der Zahl direkt erfasster Dokumente, also der Subtree-Summe abzüglich ihrer Kinder (E-193). Alle übrigen sind offene Mengen mit dem Titel und dem Eingabefeld in einer Zeile (E-178); gewählte Werte stehen nur im `strip`, nicht als eigene Zeilen oder Zahl an der Facette (E-183). Die Vorschläge erscheinen erst bei Fokus, sind mit Pfeiltasten und Eingabetaste bedienbar, gleichen Umlaute und Diakritika aus, markieren den Trefferteil und zeigen eine bestehende Wahl mit `aria-selected` und Haken. Der Platzhalter des Eingabefelds ist die feste Aufforderung „<Facette> filtern…“, gebaut aus dem Facettentitel. Ihre Darstellung trägt die eine `::placeholder`-Regel in `base.css` (E-188). Die vier Entitätsfacetten tragen den Punkt ihrer Familie (E-171), Rolle ein hohles Personenquadrat (E-184), und eine Facette ohne Werte im Inventar der Ansicht steht auf ihre Titelzeile eingeklappt. `facetInventory` kapitalisiert Rollenlabels für die Anzeige, ohne die Labels in `store.roleVocab` zu verändern. Die Belegzahlen beziehen sich auf den aktuellen Schnitt und sagen damit, was ein Wert stehen ließe.

Die Werte kommen ausschließlich aus `facetInventory` und damit aus dem Datensatz, eine redaktionelle Werteliste im Code bleibt ausgeschlossen (E-87). Ein Rollenbegriff ohne Anzeigeform steht nicht im Inventar, weil ein Regler mit einer technischen Kennung nicht bedienbar ist (E-143).

Neben den Facetten stehen die Control-Fabriken `range` für das Jahresfenster, `slider` für einen Schwellenwert, `toggle` für einen Schalter, `search` für ein Freitextfeld mit optionaler Entprellung, `legend` für farbcodierte Filter-Chips, `staticLegend` für eine nicht interaktive Erklärzeile mit Farb- oder Klassenmarker und `custom` für eine Region, die die Ansicht selbst füllt und bei jedem `update()` neu zeichnet. `viewShell(sidebar, main)` ist das Grid aus Spalte und Arbeitsfläche.

#### Der Schnitt in der URL

Die Kodierung lautet `typ=correspondence&ort=Bayreuth,Wien&person=Malaniuk%2C%20Ira&jahr=1951-1953&stand=abgeschlossen`. Alle Schlüssel sind deutsch, der Dokumenttyp steht als `typ`, der frühere Schlüssel `docType` wird weiter gelesen, damit bestehende Deep Links gelten (E-173). Das Komma trennt die Werte einer Facette, ein Komma im Wert wird prozentkodiert, was bei der Namensform Nachname, Vorname der Regelfall ist. Leerwerte erscheinen nicht, also weder eine leere Auswahl noch ein zur vollen Spanne gefaltetes Zeitfenster. Ein Schnitt ist damit zitierbar und überlebt den Reload. Der Smoke-Canary `filter:url-roundtrip` sichert beides, `tests/frontend/filter-url.test.mjs` und `router-hash.test.mjs` sichern die beiden Richtungen der Grammatik.

### Ansichten

Sieben Tabs stehen in den drei Gruppen Material, Perspektiven und Werkzeug (E-160). Die Designhaltung hinter ihnen führt [design.md](design.md) § Tab-Architektur, die Anforderungen führt [specification.md](specification.md) § Epics und User Stories.

Vier Inhaltsfamilien ziehen sich durch Tabelle und Detail. `CONTENT_FAMILIES` in `data/constants.js` bildet die vier Entitätstypen Personen, Institutionen, Orte und Werke auf die Blöcke des Details ab (E-164), `familyOfBlock` liefert die Familie eines Blocks, und Blöcke ohne Familie, also genannte Daten und Finanzen, bleiben ohne Marker. Dieselbe Konstante speist die Erschließungsanzeige der Bestandstabelle, sodass die Legende aus der Nähe entsteht und nicht aus Text.

Jede Ansicht schreibt am Ende ihres Renderns einen Zustands-Stempel über `logStamp(view, parts)` aus `utils/env.js`. Auf der Produktion bleibt die Konsole stumm, lokal und im Browser-Smoke steht dort der gerenderte Schnitt mit fester Schlüsselreihenfolge. `stamp_expectations` in `tests/frontend/smoke.py` fordert je Ansicht die tragenden Schlüssel ein.

#### Bestand

Die archivische Grundsicht ist eine Tabelle mit den Spalten Signatur, Titel, Typ, Datum, Erschließung und Korb. Die Tabelle hat keine Sortierung, sie steht in der Signaturfolge, die `getOrderedItems` mit `naturalSort` herstellt, und `buildHead` in `bestand.js` baut den Spaltenkopf als reine Beschriftungszeile (E-203). Der Spaltenkopf haftet oben, der geöffnete Konvolut-Kopf parkt um seine Höhe darunter; die feste Höhe steht als `--table-head-height` in `variables.css`, weil beide haftenden Schichten auf ihr aufsetzen (E-200). Getönt ist allein der offene haftende Kopf, die Kopfzeile eines geschlossenen Konvoluts steht wie jede Zeile auf Weiß, und `--surface-2` trägt daneben nur `thead` und Hover (E-198). Konvolute stehen als dauerhafte Gruppenköpfe mit Titel, Zeitspanne und, eingeklappt, den häufigsten Dokumenttypen als Chips mit ihrer Zahl samt Sammelchip für den Rest. Einen Badge trägt der Kopf nicht, `buildDocTypeBadge` in `bestand-rows.js` gibt für ihn `null` zurück, und seine Typ-Zelle bleibt leer (E-197). `.badge--konvolut-struct` bleibt allein den eigenständigen Konvoluten und den noch nicht in Einzelobjekte aufgelösten Kindzeilen. Gesamtzahl, Erschließungsstand, Familienzahlen und der Hinweis auf das Aufklappen hängen an `.archiv-titel` in `bestand.js` (E-190, E-197). Die einzige Klapp-Interaktion der Tabelle ist das Detail eines Objekts (E-158). Sobald eine schneidende Facette, der Freitext oder das Zeitfenster greift, flacht `flattenForFilter` die Hierarchie ab, die Kindzeilen behalten ihre Kennzeichnung, damit sie ihren echten Dokumenttyp und nicht den Konvolut-Badge tragen, und ein Herkunftshinweis mit eigenem Außenabstand nennt das Konvolut. `pruneEmptyKonvolute` entfernt einen Kopf, dessen Kinder alle aus dem Schnitt gefallen sind.

Die Erschließungsanzeige je Objektzeile zeigt je Inhaltsfamilie ein Element in der Familienfarbe, gefüllt bei Belegen und sonst offen, und die Aufschlüsselung mit allen vier Zahlen liegt im Tooltip. `familiesForRecord` in `bestand-data.js` leitet sie aus derselben `partitionRecord`-Zerlegung ab, die das Detail rendert. `annotateKonvolutHeadTips` zählt dieselben Familien über die im Schnitt sichtbaren Kinder und gibt die vier Zahlen an den Titel-Tooltip des Kopfs; eine eigene Familienanzeige trägt der Kopf nicht (E-190, E-197).

Die Bedienung liegt vollständig in der geteilten Spalte, die Ansicht bringt keine eigene Sektion mit. Ihre Voreinstellung sind die Erschließungsstände abgeschlossen und begonnen (E-162). Der Freitext sucht über Signatur, Titel, Dokumenttyp-Label und Datum. Über der Tabelle stehen weder Zählcaption noch Banner, die Zahlen führt die Ergebniszeile der Spalte (E-156). Die Chip-Zeile `filterStrip` baut je abweichender Facette eine Gruppe aus Facettenname und Wertchips, Zeitraum und Suche als eigene Gruppen, der Gruppenname trägt den Tooltip mit der Verknüpfungsregel (E-204).

Das Detail läuft über die volle Breite. Es beginnt mit einer Aktionsleiste aus zwei gleich großen Schaltflächen für Korb und Schließen, gefolgt von der Metadatenzeile aus Typ, Datum, Sprache, Umfang und Status und der inhaltlichen Beschreibung aus `rico:scopeAndContent`. Darunter steht das Blockraster Produktion, Mitwirkende, Werk und Repertoire, Aufführungen, Ort und Ereignis, im Dokument genannte Daten, Erwähnt, Weitere, Beziehungen und Finanzen, jeder Blocktitel mit dem Farbpunkt seiner Inhaltsfamilie. Den Fuß bilden die gebündelte Quellenangabe aus `sourceSummary` und die zuklappbaren Verwaltungsangaben. Alle Chips entstehen über `buildRoleChip` mit Provenance-Pille und Wikidata-Anschluss. `buildRecordBlocks` speist zugleich den Korb, sodass beide Orte dieselbe Blocklogik zeigen.

#### Chronik

Ein scrollender Jahres-Zeitstrahl über die Lebensspanne, erweitert um vorhandene Ausreißer. Jedes Jahr rendert eine Zeile mit Label, dichteadaptivem Punkt und den Datensätzen als Chips, und leere Jahre bleiben sichtbar, weil die Lückenstruktur den Erschließungsstand zeigt und nicht die Abwesenheit von Aktivität (E-88). Ein linker Akzent am Chip trägt die dominante Mobilitätssicht aus `sichtForRecord`, ohne verortete Annotation bleibt der Chip ohne Akzent, und bei divergierenden Sichten trägt er einen Verlauf. Der Zeitanker ist `rico:date`. Fehlt er, nennt `primaryYear` die ranghöchste ankernde Datierung, und der Chip weist diese Sekundärherkunft sichtbar aus, statt sie mit dem Hauptdatum gleichzusetzen. Echt undatierte Datensätze stehen in einem eigenen Endblock mit einem Sicht-Ministapel als Kopf.

Über dem Zeitstrahl steht ein Dekaden-Header nach Mobilitätssicht. Die Spurbreite einer Dekade ist proportional zur größten, und ein Klick auf ein Segment hebt genau die belegenden Chips hervor und dämpft den Rest, sodass kein Aggregat ohne Rückführung auf seine Einzelquellen steht. Ein Klick auf einen Chip öffnet den Datensatz im Bestand. Die Ansicht bringt keine eigene Sidebar-Sektion mit und schneidet über dieselbe Pipeline wie der Bestand, mit Signatur und Titel als Suchfeldern.

#### Statistik

Der Bestand in Zahlen, eine Zusammenschau dessen, was keine andere Perspektive trägt (E-160). Die Sidebar-Sektion der Ansicht ist eine Einfachauswahl über fünf Ansichten, die als neutrale Chips nebeneinanderstehen, nämlich Dokumenttypen, Erschließungsstand, Repertoire mit Werken, Bühnenrollen und Komponisten, Personen mit Rollen-Census sowie Institutionen. Räumliche und zeitliche Aggregate liegen in Karte und Chronik, das Beziehungsaggregat im Netzwerk, die Länder-Reichweite in der Karten-Sidebar.

Gezeichnet wird ausschließlich mit `buildHorizontalBars` aus `ui/charts.js`, weil die Frage nach dem, was wie oft vorkommt, in einer Rangliste besser steht als in einem Chart. Eine Rangliste zeigt ihren Kopf und bündelt den Rest in einer Sammelzeile, deren Tooltip die Einzelwerte nennt. Wo eine Zeile eine geteilte Facette hat, führt sie in den so gefilterten Bestand (E-144), und Bühnenrollen, Komponisten sowie die Erschließungsachsen tragen keine und bleiben statisch. Die Ansicht Erschließungsstand nennt neben jedem Balken die Gegenzahl der offenen Dokumente und schlüsselt nach Konvolut auf, weil erst die zweite Zahl sagt, wo Arbeit liegt. Jede Aggregation läuft auf der Dokumentmenge des geteilten Schnitts und kennt den Filter nicht.

#### Indizes

Vier Register für Personen, Organisationen, Orte und Werke, parallel sichtbar im 2×2-Raster, jedes mit eigener Sortierung und aufklappbarem Detail samt Link in den gefilterten Bestand. Gezeigt werden nur Einträge mit Belegen, weil ein Eintrag ohne Beleg keinen Einstieg bietet. Personenzeilen tragen die Wikidata-Anreicherung aus Beruf, Stimmfach und Lebensdaten als Untertitel (E-61) und die rückwärts aufgelösten AgRelOn-Beziehungen als Badges.

Der geteilte Filter schneidet alle vier Register auf die Einträge, die mindestens ein Dokument des Schnitts belegen, das geteilte Suchfeld sucht in den Namensfeldern der Register. Die eigenen Sidebar-Sektionen sind ein Schalter für Einträge mit Wikidata-Kennung und der Chip des Cross-Grid-Schnitts. Dieser Schnitt ist die zweite Filterebene der Ansicht, ein Klick auf einen Eintrag setzt seine Dokumentmenge und filtert die drei anderen Register auf die Überschneidung. Die Zählwerte je Eintrag bleiben die Belegzahlen im ganzen Bestand.

#### Karte

Eine entitätszentrierte Stummkarte. Man wählt in der Sidebar eine Organisation oder Person, und die Karte zeigt die Orte ihrer Dokumente als Knoten, je Ort ein Tortendiagramm nach Mobilitätssicht und die Knotengröße nach Belegzahl im Zeitfenster. Verbindungslinien gibt es nicht, die räumliche Verteilung einer Entität ist die Aussage und nicht der Weg (E-126). Die Voreinstellung ist die Nachlassbildnerin.

`karte-data.js` zieht die Orte aus den Dokumentorten und den verorteten Annotationen zusammen und vergibt Verortungsstufen. Gesichert, stadtgenau nach dem Hochrollen einer Adresse und weit mit Prüfhinweis erscheinen als Ringstil am Knoten mit eigener Legende, nicht verortbare Belege stehen als eingeklappte Liste statt als erfundener Kartenpunkt. Die Basemap ist lokal, mit Ozean und Gradnetz als SVG und der Ländergeometrie aus `docs/data/geo/countries-110m.geo.json`, ohne Kachelserver und ohne Schlüssel. Zoom und Pan laufen über `d3.zoom`.

Eigene Sidebar-Sektionen sind die Entitätswahl im Facettenmuster mit genau einem Wert und die Länder-Reichweite als Liste mit Dokumentzahlen, deren Zeile den Landesschnitt der Karte schaltet (E-160, aus der Statistik übernommen). Als Legende folgen der Farbschlüssel der Sichten, die Verortungsstufen und die Detail-Region, die die gewählte Entität, je gewähltem Ort die Sicht-Aufschlüsselung und die belegenden Dokumente zeigt. Ortswahl und Zeitfenster laufen über den geteilten Filter, ein Klick auf einen Knoten setzt also die Ortsfacette für alle Ansichten.

#### Netzwerk

Der heterogene Graph um eine Fokus-Entität über die Knotentypen Person, Werk, Institution und Ort. Mit E-160 sind die frühere Netzwerk- und die Verknüpfungen-Ansicht hier zusammengefallen. Steht die Nachlassbildnerin im Fokus und ist nur der Knotentyp Person eingeschaltet, ist das Bild das konzentrische Personennetz mit Ringen nach Evidenzstärke (E-93).

Der Schnitt der Ansicht ist die Dokumentmenge des Fokus, geschnitten mit der Dokumentbasis und danach durch den geteilten Filter, sodass Zählstand und Bild dieselbe Grundmenge meinen wie in jeder anderen Ansicht. `buildGraph` nimmt diese Menge entgegen und baut sie nicht selbst. Je Knotentyp rendert der Graph die stärksten Nachbarn, und die Kappung steht als Bezifferung an der Toggle-Zeile des Typs, die neben dem Namen die Zahl der gezeigten und der vorhandenen Kandidaten nennt.

Zwei Linienarten sind ausdrücklich unterschieden. Gerade Radialen zum Zentrum sind annotierte AgRelOn-Beziehungen, geschwungene Bänder zwischen Knoten sind Ko-Okkurrenz aus gemeinsamen Dokumenten, deren Schwelle ein Regler steuert. Jede Linie trägt einen Tooltip mit dem Grund der Verbindung. Positionen entstehen analytisch aus reinen Funktionen in `_netzwerk-geometry.js`, ohne Force-Simulation.

Ein Klick auf einen Knoten macht ihn zum neuen Fokus. Die Detail-Spalte rechts zeigt immer die Fokus-Entität mit Typ, Wikidata-Anschluss, einer Metazeile aus Kategorie, Dokumentzahl, raumzeitlich belegtem Anteil und Nachbarzahl, den datengedeckten Feldern als Chips, den Beziehungstypen, einer Schaltfläche zum Aufnehmen der Entität in den geteilten Filter und der chronologischen Belegliste, aus der jeder Eintrag in den Bestand führt. Eigene Sidebar-Sektionen sind die Fokuswahl, die Knotentypen, die beiden Regler für Knoten je Typ und Ko-Okkurrenz-Schwelle, die Personenkategorien als Filter-Chips und die Legende für Linienarten, Ringe und Wikidata-Marker. Kategorie-Ausblendung und Freitext dünnen das Bild aus, ohne die Zählung zu bewegen.

#### Korb

Die Querschnitts-Merkliste, gehalten im localStorage und über die Tab-Leiste beziffert. Ein Lesezeichen steht in jeder Bestandszeile, im Detail und im Indizes-Detail. Je Datensatz zeigt eine Card die Signatur als Deep-Link, Titel, Typ, Metazeile und dieselben funktionalen Blöcke wie das Detail, weil beide `buildRecordBlocks` konsumieren. Der Export liefert CSV mit UTF-8-BOM über Signatur, Titel, Typ, Datierung, Konvolut, Personen mit Rollen, Orte mit Ereignisdaten, Werke mit Komponist, Beziehungen und Finanzen sowie BibTeX mit dem Verfasser primär aus der Rolle und ersatzweise aus der Korrespondenzbeziehung.

### DEV/Prod-Verhalten und Error Boundaries

`IS_DEV` in `utils/env.js` prüft `localhost` und `127.0.0.1`. Nur dort lädt `main.js` das Diagnose-Modul `utils/dev.js` per dynamischem Import (E-50), sodass auf der Produktion weder der Code noch seine Abhängigkeiten in den Startpfad geraten. Das Modul schreibt beim Laden einen Store-Report mit Grundzahlen, Normdaten-Abdeckung je Register und Provenance-Deckung, beim erstmaligen Öffnen eines Tabs eine kurze Kennzahlzeile, und es setzt `window.m3gim` mit `store`, `inspect(recordId)`, `finances()`, `agentRelations()`, `mobilityEvents()`, `mobilityEventsWithGeo()`, `netzwerkAggregate()`, `dftTree()` und `provenanceOf(recordId)`. Der letzte listet alle XLSX-Quellen eines Datensatzes samt verschachtelter Knoten und ist das Gegenstück zum Provenance-Test der Suite.

`logStamp` liegt daneben in `utils/env.js` und nicht im Diagnose-Modul, weil jede Ansicht es aufruft. Auf der Produktion ist es ein No-Op.

`main.js` fängt Renderfehler je Tab ab, synchron wie asynchron, zeigt eine als DOM gebaute Fehlerbox statt Markup und gibt den Tab für einen neuen Versuch frei (E-51). Die Ladeschicht unterscheidet fehlende Netzverbindung, fehlende Datei und fehlgeschlagenes Parsen und meldet jeden Fall mit eigenem deutschen Text, statt einen Sammelfehler zu werfen oder still `null` zurückzugeben (E-52).

### Schnittstellenvertrag

| Thema | Kanonische Quelle |
|-------|------------------|
| Designhaltung und Designsystem | [design.md](design.md) |
| Datenmodell, Ontologie, Vokabulare | [data.md](data.md), [data-model.md](data-model.md) |
| Pipeline, Datenfluss, Qualitätsbaseline | [Pipeline](#pipeline) |
| Testsuite, TDD-Workflow | [testing.md](testing.md) |
| Architektur- und Modellentscheidungen | [journal.md](journal.md) |
| Identität, Funktionsumfang, operativer Stand | [specification.md](specification.md) |
| Forschungsrahmen und Use Cases | [research-framework.md](research-framework.md) |
