# M³GIM Implementierungsplan — Datenmodell v2 + neue Daten

> Stand: 2026-04-16. Dieser Plan beschreibt die Einfuehrung des in `knowledge/data.md` formulierten Datenmodells v2 und die Verarbeitung des neuen Google-Sheets-Exports (1172 Objekte, 2015 Verknuepfungen). Er ist zur Wiederaufnahme nach Context-Compact gedacht.

## Ausgangslage

### Was vorhanden ist

- **Pipeline v1** stabil: 8 Python-Skripte (`scripts/`), Input `data/google-spreadsheet/` (alter Stand: 282 Objekte, 1246 Verknuepfungen), Output `data/output/m3gim.jsonld` + `partitur.json`
- **Frontend v1** stabil: 23 ES6-Module, 8 Tabs, 5 D3-Visualisierungen. Konsumiert `docs/data/m3gim.jsonld` + `docs/data/partitur.json`
- **Test-Suite v1** gruen: 63 Tests in `tests/`, dokumentiert in `knowledge/testing.md` und `memory/testing.md`. Validiert das v1-Artefakt gegen JSON-Schemas, XLSX-Roundtrip, Referential-Integrity, Frontend-Kontrakt, Regression-Baselines
- **Datenmodell v1** dokumentiert in `knowledge/datenmodell.md` (8 Entitaetstypen, RiC-O 1.1 + m3gim-Extension, partitur.json)
- **Datenmodell v2** formuliert in `knowledge/data.md` — nicht nur mehr Daten, sondern ein **ausgebautes Modell**:
  - Neue Klassen: `m3gim:StageRole`, `m3gim:SpatiotemporalEvent`, `m3gim:DatedEvent`
  - AgRelOn-Integration (Agent-Agent-Relationen, Meta-Statements)
  - Typisierte Datumsproperties (statt generisch `m3gim:eventDate`)
  - Finanzschicht mit `m3gim:monetaryAmount`, `m3gim:currency`
  - Hierarchische Dokumenttyp-SKOS
  - 5 Mobilitaetssichten als SPARQL-Patterns
  - Erweiterte Rollenvokabulare (Gender-neutral, ~80 Rollen verteilt auf 7 Zielkontexte)
- **Neue Daten** in `C:\Users\Chrisi\Downloads\drive-download-20260416T174846Z-3-001\`:
  - 6 XLSX (Objekte 381, Verknuepfungen 1464, Personen 328, Orgs 75, Orte 32, Werke 137)
  - Schema fast identisch, zwei Additionen: `folio nr` (vormals `Unnamed: 2`), `datenpunkt_id` in Verknuepfungen
  - Laut `data.md` gibt es in einem anderen Export-Stand 1172 Objekte und 2015 Verknuepfungen — Klaerung welcher Stand verwendet wird erfolgt in Phase 1

### Leitprinzipien

1. **Alte Pipeline bleibt byte-identisch** — Pfad-Overrides per ENV, kein transform.py-Refactor ohne Test-Absicherung
2. **Parallel-Pfad v2**: `data/source-v2/`, `data/output-v2/`, frisch gebauter `scripts/v2/transform.py`. v1 bleibt als Referenz zum Roundtrip-Check
3. **Jeder Modell-Schritt ist testgetrieben**: Test formuliert die Invariante, dann Implementierung. Bei Regressionen bricht Test
4. **Mitten im Projekt** — das Modell und die Daten werden weiter wachsen. Architektur sieht **Feld-Additionen** und **Rollen-Erweiterungen** als Regelfall, nicht als Ausnahme
5. **Frontend zuletzt** — erst wenn v2-Pipeline gruen ist und v2-Output als stabil gilt, werden Frontend-Tabs sukzessive umgestellt (feature-flag pro Tab)

## Phasenplan

### Phase 0 — Vorbereitung nach Context-Compact

**Ziel:** Frisch starten, Kontext aus Dokumenten wiederherstellen.

1. Diesen Plan (`IMPLEMENTATION-PLAN.md`) lesen
2. `knowledge/data.md` lesen (Datenmodell v2, vollstaendig)
3. `knowledge/datenmodell.md` lesen (Datenmodell v1, zum Vergleich)
4. `knowledge/testing.md` lesen (Test-Suite-Zustand)
5. `C:\Users\Chrisi\.claude\projects\c--Users-Chrisi-Documents-GitHub-DHCraft-m3gim\memory\MEMORY.md` lesen (Auto-Memory)
6. `tests/` kurz inspizieren (10 Module, aktueller Zustand)
7. Das neue Downloads-Verzeichnis inspizieren, Dateiliste bestaetigen

**Output:** Handlungsfaehigkeit wiederhergestellt, Plan naechster konkreter Schritt.

### Phase 1 — Datenstruktur parallel anlegen

**Ziel:** Neue Daten in Repository bringen, ohne v1 zu beruehren. Klaeren, welcher Export-Stand (381 vs. 1172 Objekte) der aktuelle ist.

1. Anlegen `data/source-v2/` — Kopie der 6 XLSX aus Downloads
2. Bestand verifizieren: Zeilenzahlen zu Modell-Dokumentation (`data.md`) abgleichen. Wenn Diskrepanz (1172 vs. 381), beim Nutzer rueckfragen welcher Stand verbindlich ist
3. Git-Status: `data/source-v2/*.xlsx` committen (Reproduzierbarkeit)
4. `data/output-v2/` anlegen (Target, zunaechst leer)
5. Alte Daten `data/google-spreadsheet/` bleiben unveraendert — Referenz fuer Roundtrip-Vergleich

**Tests:** keine neuen, aber ENV-Overrides der bestehenden Tests pruefen, damit spaeter v2-Artefakte validiert werden koennen.

**Output:** Saubere Parallelstruktur, klare Quelle-Zielort-Zuordnung.

### Phase 2 — Exploration + Audit der neuen Daten

**Ziel:** Quantitative und qualitative Baseline der v2-Daten. Entscheiden, was v2 anders/neu macht, bevor Pipeline gebaut wird.

1. `scripts/explore.py` gegen `data/source-v2/` laufen lassen (ENV-Override) → Report in `data/reports-v2/exploration.md`
2. `scripts/validate.py` ebenso → `data/reports-v2/validation.md`
3. Diff-Report erstellen (manuell oder Skript): was ist in v2 neu/geaendert gegenueber v1? Neue Rollen? Neue Dokumenttypen? Welche Komposit-Typen neu? Zaehlungen fuer jeden Verknuepfungstyp
4. Baseline-Zahlen fuer v2 sammeln: Records, Konvolute, Personen, Orgs, Orte, Werke, Verknuepfungen gesamt, pro Typ, pro Rolle

**Output:** Klares Bild, wie breit die Modell-Erweiterung tatsaechlich ist. Entscheidungsgrundlage fuer Phase 3: welche v2-Modell-Features sind zwingend (weil in Daten), welche optional (noch keine Daten)?

### Phase 3 — v1-Pipeline auf v2-Daten (Minimum Viable Output)

**Ziel:** Zeigen, was die bestehende Pipeline mit den neuen Daten **ohne Modellaenderung** macht. Nichts verschwenden, was schon funktioniert.

1. `scripts/transform.py` per ENV-Override gegen `data/source-v2/` laufen lassen → `data/output-v2/m3gim.jsonld`
2. `scripts/build-views.py` ebenso → `data/output-v2/views/partitur.json`
3. Snapshot-Diff v1 vs v2-Output: `python tests/tools/snapshot_diff.py data/output/m3gim.jsonld data/output-v2/m3gim.jsonld`
4. Tests gegen v2: `M3GIM_JSONLD_PATH=... M3GIM_SHEETS_DIR=... pytest tests/ -m "not slow"`
5. Failures kategorisieren:
   - Echte Regressionen (Pipeline-Bug durch neue Daten) — sofort fixen
   - Baseline-Unterschreitungen (Schwellen zu hoch) — baseline_counts.json aktualisieren
   - Modell-bedingte Failures (v2 verlangt neue Klassen/Properties) — als Todo fuer Phase 4 vormerken, Tests vorruebergehend auf xfail

**Output:** v2-Daten sind mit v1-Modell gebaut. Wir kennen den Gap zwischen "was die Pipeline heute kann" und "was data.md will".

### Phase 4 — Modell-Erweiterung (testgetrieben, schrittweise)

**Ziel:** Datenmodell v1 → v2. Pro Schritt: Test schreiben, Pipeline erweitern, Test gruen. Reihenfolge nach Nutzen + Reifegrad in Daten.

**Schritt 4.1 — Rollen-Vokabular erweitern + Gender-Neutralisierung.**
- Pipeline: `transform.py:normalize_lower` erweitern um Gender-Suffix-Strip (`:in`, `:innen`, finales `in` nur bei bekannten Rollen-Stems)
- Neue Rollen additiv aufnehmen (Rollen-Enum in Tests erweitern)
- Test: alle belegten Rollen aus v2 sind im kontrollierten Vokabular. Unbekannte Rollen: Log/Warning

**Schritt 4.2 — Dokumenttypen hierarchisieren.**
- Pipeline: `DOKUMENTTYP_TO_DFT` um Oberklassen (korrespondenz, presse, programm, biographisch, identitaetsdokument) erweitern
- JSON-LD: `skos:broader`-Relation im Context fuer hierarchische Queries
- Test: neue Dokumenttypen mappen korrekt auf neue/alte DFT-Klassen

**Schritt 4.3 — `m3gim:dateEvidence` → `agrelon:hasProvenance` + Konfidenz.**
- JSON-LD-Context: `agrelon:` Namespace hinzufuegen
- Pipeline: Evidenzwert wird zu `agrelon:hasConfidenceValue` (Mapping aus data.md § 9)
- Archivrecord-URI wird zu `agrelon:hasProvenance`
- Test: keine `m3gim:dateEvidence` mehr im Output, stattdessen `agrelon:hasProvenance` + optional `hasConfidenceValue`
- **Achtung**: Frontend-Breaking — Frontend-Update in Phase 6 einplanen

**Schritt 4.4 — `m3gim:SpatiotemporalEvent` fuer Komposittyp `ort, datum`.**
- Pipeline: Bei Typ-Decomposition `ort, datum` neue Klasse erzeugen statt zwei getrennte Relationen
- `m3gim:atPlace`, `m3gim:atDate`, optional `m3gim:eventRole`
- Test: jeder Komposittyp `ort, datum` im XLSX erzeugt genau eine SpatiotemporalEvent-Instanz

**Schritt 4.5 — `m3gim:StageRole` als eigenstaendige Entitaet.**
- **Vorab**: Rollenindex-XLSX einfuehren (neue Spalten: `m3gim_id`, `name`, `belongsToWork`, `voiceType`, `wikidata_id`) — mit Nutzer abstimmen
- Pipeline: `rolle`-Typ wird zu StageRole-Entity statt Literal
- Test: StageRole hat `belongsToWork`-Relation, `voiceType` optional

**Schritt 4.6 — Finanzschicht.**
- Pipeline: Komposittyp `ausgaben, waehrung` + `einnahmen, waehrung` + `summe, waehrung` → `DetailAnnotation` mit `monetaryAmount` (xsd:decimal) + `currency` (ISO-4217 oder Freitext)
- Test: Geldbetraege sind parsbar, Waehrungscodes gehoeren zum erlaubten Set

**Schritt 4.7 — Typisierte Datumsproperty-Familie.**
- Pipeline: statt generisch `m3gim:eventDate` je nach Datumsrolle `m3gim:absendedatum`, `m3gim:auffuehrungsdatum`, `m3gim:premieredatum` etc.
- Test: je typisierte Property ein Assertion, dass sie ISO-Format hat (mit Qualifier-Ausnahme fuer `circa:`, `vor:`, `nach:`)

**Schritt 4.8 — AgRelOn-Relationen.**
- Pipeline: Explicit Mapping gemaess `data.md` § 8.3 (Arbeitgeber → hasEmployer, Korrespondent → hasCorrespondent etc.)
- Inferenz-Regeln fuer `hasColleague` (Ko-Praesenz) in separatem Skript, nicht in `transform.py`, mit Schwellenwert
- Test: jede explizit gesetzte AgRelOn-Relation hat Provenance

**Schritt 4.9 — Meta-Statement-Schicht (optional, spaet).**
- Reifikation nur dort, wo Provenance nicht aus Record-URI folgt
- Lightweight `m3gim:Statement`-Klasse statt RDF-Reifikation wo moeglich
- Test: Reifikation ist optional — kein Zwang fuer alle Relationen

**Zwischen jedem Schritt:** `pytest tests/ -m "not slow"` muss gruen bleiben. Bei neuen Invarianten: neuer Test.

### Phase 5 — Test-Suite v2 nachziehen

**Ziel:** Tests decken das neue Modell vollstaendig ab. Keine Modell-Entscheidung darf ungetestet bleiben.

1. JSON-Schema `m3gim_jsonld.schema.json` erweitern: neue Klassen, neue Properties, `agrelon:`-Namespace, typisierte Datumsproperties, Finanz-Properties
2. Neues Test-Modul `test_11_mobilitaet.py`: die 5 Mobilitaetssichten aus data.md § 10 als Integrationstests (SPARQL-aehnliche Patterns in Python)
3. Neues Test-Modul `test_12_agrelon.py`: AgRelOn-Relations haben Provenance, hasValidityPeriod ist well-formed
4. Neues Test-Modul `test_13_finanzen.py`: DetailAnnotation hat monetaryAmount+currency, Waehrung im kontrollierten Set
5. `test_09_baselines.py` um v2-Baselines erweitern (StageRole-Anzahl, SpatiotemporalEvent-Anzahl, AgRelOn-Relation-Anzahl)
6. Snapshot-Diff-Tool erweitern: Klassifizierung neuer Entity-Typen (StageRole/SpatiotemporalEvent) in der Diff-Ausgabe

### Phase 6 — Frontend anpassen

**Ziel:** Frontend konsumiert v2-Output, ohne v1-Codepfad zu verlieren, bis v2 als stabil gilt.

1. `docs/js/data/loader.js` erweitern: `agrelon:hasProvenance` extrahieren, `SpatiotemporalEvent`/`StageRole` indexieren
2. Feature-Flag: `DATA_VERSION = 'v2'` in `constants.js`, Store trennt v1- und v2-Zweige wo strukturell noetig
3. Mobilitaet-Tab (`views/mobilitaet.js`, `lebenspartitur.js`) nutzt SpatiotemporalEvent-Instanzen direkt, faellt auf partitur.json zurueck wenn nicht vorhanden
4. Indizes-Tab erweitern: neue Entity-Liste fuer StageRole (Buehnenrollen mit Werk + Stimmfach)
5. Finanz-Visualisierung (neu, siehe visualisierungen.md oder neuer Tab): Honorare, Waehrungen
6. `partitur.json` weiterhin bauen, aber aus v2-Output generieren

### Phase 7 — Betriebsmodell fuer laufende Updates

**Ziel:** Das Projekt ist mitten im Lauf. Neue Daten kommen woechentlich. Das Daten-Update darf kein aufwendiger Prozess sein.

1. Dokumentierter Update-Workflow in `knowledge/pipeline.md`:
   - Neue XLSX nach `data/source-v2/` kopieren (ueberschreibt)
   - `python scripts/v2/transform.py && python scripts/v2/build-views.py`
   - `pytest tests/ -m "not slow"` — alle gruen oder Issue kategorisieren
   - `python tests/tools/snapshot_diff.py data/output-v2-prev/m3gim.jsonld data/output-v2/m3gim.jsonld` — Review
   - `cp data/output-v2/*.json* docs/data/` + commit + push
2. **Feld-Additionen als Regelfall**: Pipeline ignoriert unbekannte XLSX-Spalten nicht stillschweigend, sondern loggt. Tests mit `--strict-markers` markieren neue Felder als "discovered but not modeled"
3. Rollenvokabular-Pflege: wenn neue Rolle in Daten auftaucht, laeuft Pipeline durch, gibt aber Warnung — Review, ob die Rolle in `data.md` ergaenzt werden soll
4. Baselines halb-automatisch updaten: wenn Tests stabil durchlaufen und Daten gewachsen sind, `tests/fixtures/baseline_counts.json` per Skript aktualisieren (kein manuelles Fummeln)
5. Schema-Evolution dokumentieren in `knowledge/data.md` als changelog — jede neue Property mit Datum und Begruendung

## Governance: was wo entschieden wird

| Entscheidung | Ort |
|---|---|
| Modellaenderungen (neue Klassen, Properties, Rollen) | `knowledge/data.md` — gilt als Spezifikation |
| Pipeline-Umsetzung | `scripts/v2/*.py`, dokumentiert in `knowledge/pipeline.md` |
| Test-Invarianten | `tests/*.py` mit Verweis auf data.md §x |
| Frontend-Kontrakt | JSON-Schema in `tests/schemas/` als Quelle; `docs/js/data/loader.js` folgt |
| Vokabular-Pflege | XLSX-Rollenindex (neu anzulegen) + `data.md` § 5 |

## Wiederaufnahme nach Context-Compact

Wenn der Kontext leer ist und wir weitermachen, folgt die naechste Session diesem Ablauf:

1. `IMPLEMENTATION-PLAN.md` (diese Datei) lesen
2. `knowledge/data.md` + `knowledge/datenmodell.md` (Vergleich) lesen
3. `knowledge/testing.md` lesen
4. Git-Status pruefen (was ist seit letzter Session commited?)
5. Letzten Arbeitspunkt aus TODO-Liste im Repo oder aus MEMORY.md identifizieren
6. Phase aus Abschnitt "Phasenplan" ermitteln
7. Weitermachen

Das Repo selbst traegt die volle Wahrheit — dieser Plan ist der Wegweiser, keine Kopie des Wissens.

## Status beim Verfassen des Plans

- Phase 0: — (laeuft nach Compact)
- Phase 1: offen (naechster Schritt)
- Phase 2–7: offen

Letzte abgeschlossene Arbeit: Test-Suite v1 (63 Tests gruen, 1 xfail), dokumentiert in `knowledge/testing.md`.
