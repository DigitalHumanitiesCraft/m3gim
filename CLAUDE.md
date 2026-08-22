# CLAUDE.md

> Workflow-Regeln für Claude-Code-Sessions. Prozessual, nicht dokumentarisch. Für Dokumentation siehe `knowledge/`.

## Projekt in einem Satz

**M³GIM** (Mapping Mobile Musicians) — DH-Pilotstudie zur Mobilität und Wissensproduktion der Mezzosopranistin Ira Malaniuk (1919–2009), basierend auf dem Teilnachlass UAKUG/NIM am Universitätsarchiv der KUG Graz, modelliert in RiC-O 1.1 + m3gim-Extension + AgRelOn, als statische SPA auf GitHub Pages. Promptotyping-Methodik: Dokumente sind die Source of Truth, Code ist wegwerfbares Artefakt. Laufende Zählstände im Quality-Snapshot (`data/reports/quality-snapshot.md`), nicht hier.

## Sessionstart

Nach dieser Datei wird [`knowledge/INDEX.md`](knowledge/INDEX.md) als Einstieg in die Wissensbasis gelesen, danach [`knowledge/handoff.md`](knowledge/handoff.md) als Process Inbox mit den offenen Übergabepunkten, danach das aufgabenrelevante Dokument aus der Spec-Hierarchie.

## Spec-Hierarchie

1. **`knowledge/data.md`** — Datengrundlage und Modell-Spezifikation. Bei jeder geplanten Modelländerung zuerst lesen und dort verankern, bevor Pipeline/Tests/Frontend angefasst werden.
2. **`vocab/m3gim.ttl`** — das formale Projektvokabular in Turtle, die maschinenlesbare Fassung des Modells (Klassen, Properties, Domain, Range, SKOS-Schemata). Jede in `data.md` verankerte Modelländerung wird hier nachgezogen, bevor die Pipeline folgt.
3. **`knowledge/specification.md`** — Projektidentität, Funktionsumfang und der volatile Abschnitt „Stand und nächste Schritte" (inklusive Status-Tracker und offener Operator-Entscheidungen).
4. **`knowledge/testing.md`** — Teststrategie + TDD-Workflow.
5. **`knowledge/pipeline-architecture.md`** — Pipeline-Referenz.
6. **`knowledge/frontend-architecture.md`** + **`knowledge/design.md`** — Frontend-Architektur und Designsystem.
7. **`knowledge/architecture-decisions.md`** — historische Architekturentscheidungen (E-01 aufwärts, laufend ergänzt).

Weitere Dokumente siehe [`knowledge/INDEX.md`](knowledge/INDEX.md).

Das formale Projektvokabular ist ein gepflegtes Artefakt und steht seit der Entscheidung der Projektleitung vom 2026-08-21 in dieser Hierarchie (E-133 in [`knowledge/architecture-decisions.md`](knowledge/architecture-decisions.md), löst die frühere offene Frage 10 in [`knowledge/data-model.md`](knowledge/data-model.md)). Die Spec-first-Reihenfolge lautet damit `data.md`, Vokabular, Test, Pipeline; der Abdeckungsprüfer `vocab/check-coverage.py` läuft als verbindliches Test-Gate mit (siehe § Vokabular-Abdeckung prüfen). Die aus dem Vokabular abgeleitete Lesesicht auf den Datensatz führt [`knowledge/data-model.md`](knowledge/data-model.md).

## Kern-Commands

### Voraussetzungen

Python 3.11+, dann `pip install -r requirements-test.txt`. Die Datei bindet `requirements.txt` per Include ein und liefert damit Laufzeit- und Testumgebung in einem Schritt. Node wird nur für die JS-Unit-Tests gebraucht.

### Pipeline (vollständiger Lauf, Default-Pfade, kopiert nach `docs/data/`)

Sechs Schritte in dieser Reihenfolge, jeder einzeln aufrufbar:

```bash
python scripts/explore.py         # Strukturdiagnose der XLSX  -> data/reports/exploration-report.md
python scripts/validate.py        # Quellprüfung der XLSX      -> data/reports/validation-report.md
python scripts/transform.py       # XLSX nach JSON-LD          -> data/output/m3gim.jsonld
python scripts/build-views.py     # Derivate aus dem JSON-LD   -> data/output/views/*.json, Kopie nach docs/data/
python scripts/audit-data.py      # Abgleich XLSX / JSON-LD / Views, nur Konsolenreport
python scripts/report-quality.py  # laufende Zählstände        -> data/reports/quality-snapshot.md
python scripts/build-model-page.py # Modellseite aus dem Vokabular -> docs/datenmodell.html
```

`reconcile.py` und `enrich-wikidata.py` stehen außerhalb dieses Laufs. Sie brauchen Netzzugriff, schreiben `wikidata-reconciliation.json` und `wikidata-enrichment.json` nach `data/output/` und laufen nur, wenn der Wikidata-Abgleich neu gezogen wird. Beide Ergebnisdateien sind git-getrackt und im normalen Klon vorhanden.

**`validate.py` endet mit Exit 1, sobald der Report ERROR-Befunde führt.** Das ist der erwartete Zustand am aktuellen Datenstand. Die Befunde sind Quellfehler, die über das Register in [`knowledge/data-errors.md`](knowledge/data-errors.md) ans Erschließungsteam gehen; der Lauf hat geleistet, was er soll, sobald der Report geschrieben ist. `audit-data.py` folgt derselben Konvention und meldet am aktuellen Stand 0 Fehler.

Die ENV-Overrides greifen bei `explore.py`, `validate.py`, `transform.py` und `build-views.py`. `audit-data.py` und `report-quality.py` lesen die Default-Pfade fest. Wer `M3GIM_OUTPUT_DIR` auf ein leeres Verzeichnis zeigt oder das Ausgabeverzeichnis leert, verliert die Normdatenanreicherung stillschweigend; die Falle ist in [`knowledge/pipeline-architecture.md`](knowledge/pipeline-architecture.md) § ENV-Overrides beschrieben.

`build-views.py` schreibt `m3gim.jsonld` + Derivate (`partitur.json`, `matrix.json`, `kosmos.json`) nach `docs/data/`. **`m3gim.jsonld` ist die einzige primäre Datenquelle für das Frontend**. Die drei Derivate werden seit Session 32 von keinem aktiven Tab mehr konsumiert (sie wurden für die entfernten D3-Prototypen gebaut) und stehen im Deferred-Block von `knowledge/specification.md` § Stand; ihr Verfall oder Weiterbau ist eine offene Operator-Entscheidung.

### Tests

```bash
pytest tests/ -m "not slow"             # Standard-Lauf ohne Determinismus-Test
pytest tests/                           # inkl. Determinismus-Test (slow)
node --test tests/frontend/*.test.mjs   # JS-Unit-Tests des Frontends
```

Keine ENV-Overrides mehr nötig — es gibt nur einen Datenstand.

Der Browser-Smoke-Test `tests/frontend/test_smoke.py` ist ein optionales Extra. Playwright steht in keiner Requirements-Datei; fehlt das Paket, überspringt sich der Test, und der Standardlauf prüft weiterhin die Pipeline-Artefakte samt Frontend-Kontrakt aus den Daten heraus, ohne die gerenderte Oberfläche. Wer den Browserteil will, installiert ihn mit `pip install playwright` und `playwright install chromium`; danach läuft er in `pytest tests/` mit und lässt sich mit `pytest -m frontend tests/frontend/` einzeln ansteuern. Umfang des Smoke-Durchlaufs in [`knowledge/testing.md`](knowledge/testing.md) § Frontend-Smoke.

### Vokabular-Abdeckung prüfen

```bash
python vocab/check-coverage.py
```

Prüft read-only, ob jeder im Datensatz verwendete `m3gim`-Term in `vocab/m3gim.ttl` definiert ist. Der Docstring des Skripts nennt `uv run`; `uv` ist keine Projektvoraussetzung, der normale Interpreter genügt. Die einzige Abhängigkeit rdflib steht in `requirements-test.txt`.

Die Prüfung läuft zusätzlich als verbindliches Test-Gate. `tests/test_40_vocab_gate.py` startet dasselbe Skript als eigenen Prozess, läuft damit im Standardlauf `pytest tests/` mit und übernimmt den Befund des Skripts in die Fehlermeldung des Tests. So fällt auch eine Vokabularänderung ohne unmittelbare Datenwirkung auf. Die Namenskonvention des Vokabulars (Klassen groß, Properties und SKOS-Concepts klein) sichert `tests/test_41_naming_convention.py`. Der Handbefehl bleibt der direkte Weg zum vollständigen Konsolenreport.

### Snapshot-Diff (bei Daten-Updates)

```bash
python tests/tools/snapshot_diff.py <alt.jsonld> <neu.jsonld>
```

Das Tool schaltet intern auf UTF-8, kein `PYTHONIOENCODING` mehr nötig.

### Manuelle Wikidata-Approvals verifizieren

```bash
python scripts/verify-manual-approvals.py
```

Prüft alle `match: "manual"`-Einträge in `wikidata-reconciliation.json` gegen Wikidata (Label + Alias + Typ-Signal in der Description). Pflichtlauf nach jedem manuellen Approval-Batch — Session 34 hat gezeigt, dass Q-IDs aus dem Kopf tragende Datenfehler produzieren (Q2861 war Rostock statt Bayreuth, Q200491 war ein Game-Publisher statt Iwano-Frankiwsk). Offline überspringbar via `SKIP_VERIFY_MANUAL=1`.

## Workflow-Regeln

### TDD-Modus für Modell-Erweiterungen

Bei neuen Features aus `data.md`:

1. Invariante in `tests/test_NN_*.py` als `@pytest.mark.xfail(reason="Phase X nicht implementiert", strict=True)` formulieren. **strict=True** ist wichtig: XPASS failt die Suite und signalisiert, dass der xfail-Marker zu entfernen ist.
2. Tests mit Mindestvorkommen versehen (nicht „leere Liste ist ok"), damit sie nicht trivial bestehen.
3. Erst dann in `scripts/transform.py` implementieren, bis xfail → XPASS.
4. xfail-Marker entfernen, Testsuite wieder grün.

Siehe `knowledge/testing.md` § TDD-Workflow. In Phase 4.1–4.8 (Session 28) und erneut für den Phase-6-Frontend-Kontrakt (Session 29) durchgängig angewendet.

### Modell-Erweiterungen testgetrieben in folgender Reihenfolge

Falls in Zukunft weitere Phasen aus `specification.md` § Stand umgesetzt werden:

1. Tests als Spec (xfail strict).
2. `data.md` ggf. erweitern/konkretisieren.
3. Pipeline in `scripts/transform.py` implementieren.
4. xfail → XPASS → xfail-Marker entfernen.
5. Testsuite wieder grün.

### Keine Commits ohne explizite Aufforderung

Commit-Regel aus den Projektgewohnheiten: **nie selbständig committen**. Auch nicht, wenn ein Commit logisch zur Arbeit gehört. Nur, wenn die Nutzer:in das Commit-Wort explizit nennt. Commits werden dann mit Co-Authored-By-Trailer versehen.

### docs/data/ nur über Pipeline

Die Dateien in `docs/data/*.json` + `docs/data/m3gim.jsonld` werden ausschließlich von `build-views.py` bzw. manuellem Kopieren aus `data/output/` geschrieben. Nicht direkt editieren — das würde bei nächstem Pipeline-Lauf überschrieben.

### Plakate/Dateinamen-Eigenheiten

- `M3GIM-Verknüpfungen.xlsx` — Dateiname enthält das `ü`, nicht `ue`. Beim Schreiben von Skripten immer das `ü`; die Pipeline wirft `FileNotFoundError` bei Abweichungen.
- Plakate-IDs: `UAKUG/NIM/PL_XX` (mit Slash), nicht `UAKUG/NIM_PL_XX`.
- Konvolut-Hierarchie: Objekt-ID = `archivsignatur + " " + folio`. Die Folio-Spalte im aktuellen Objekte-XLSX heißt `folio nr` (früher `folio` oder `Unnamed: 2`). Pipeline akzeptiert aktuell alle Varianten.

Vollständiger Katalog der Pipeline-Workarounds (Header-Shifts, Finance-Currency-Defaults, Bearbeitungsstand-Normalisierung, Role-Hygiene, Freitext-Datierungen, Orphans, Komponisten-Schreibweisen) inkl. Source-Fix-Vorschlägen und Test-Absicherung: [`knowledge/data.md`](knowledge/data.md) § Datenqualität.

## Rote Linien

- **DSGVO**: `antrag.md`, `handreichung.md` nur im Obsidian-Vault `C:\Users\Chrisi\Documents\obsidian\Projects\M³GIM\`, **nie ins Repo**. Die `.gitignore` führt entsprechende Einträge.
- **Keine destruktiven Git-Operationen** (`reset --hard`, `push --force`, `checkout .`) ohne explizite Nutzer-Aufforderung.
- **Pre-commit-Hooks nicht umgehen** (`--no-verify`).
- **Nicht direkt in `docs/data/` schreiben** (siehe oben).

## Datenquellen-Struktur

```
data/
├── google-spreadsheet/   # Quelle (XLSX, git-tracked — 6 Dateien, ü-Umlaut)
├── output/               # Pipeline-Output (m3gim.jsonld, wikidata-*.json, views/)
├── reports/              # Kurationsbelege der Normdaten, Quality-Snapshot, offene
│                         #   Entscheidungsvorlagen; die erzeugten Reports sind
│                         #   nicht versioniert, ein Lauf stellt sie her
└── _archive/             # historische Stände; die XLSX darin sind unversioniert
```

**Datenfluss:** `data/google-spreadsheet/` → Pipeline → `data/output/m3gim.jsonld` → `docs/data/m3gim.jsonld` → Frontend-Loader.

Das Frontend konsumiert ausschließlich `docs/data/m3gim.jsonld`. Die Derivate `partitur.json`, `matrix.json`, `kosmos.json` werden von `build-views.py` weiterhin gebaut, aber von keinem aktiven Tab mehr gelesen (Deferred-Block in `specification.md` § Stand).

## Wegweiser

- Details zu Architektur, Datenmodell, Tests, Frontend → `knowledge/` (siehe `knowledge/INDEX.md`)
- Session-Memory (persistiert über Sessions): `.claude/projects/*/memory/`
- Aktueller Stand und nächste Schritte: `knowledge/specification.md` § Stand und nächste Schritte
