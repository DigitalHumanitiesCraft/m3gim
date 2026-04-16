# CLAUDE.md

> Workflow-Regeln für Claude-Code-Sessions. Prozessual, nicht dokumentarisch. Für Dokumentation siehe `knowledge/`.

## Projekt in einem Satz

**M³GIM** (Mapping Mobile Musicians) — DH-Pilotstudie zur Mobilität und Wissensproduktion der Mezzosopranistin Ira Malaniuk (1919–2009), basierend auf dem Teilnachlass UAKUG/NIM (381 Objekte, 1.464 Verknüpfungen in v2), modelliert in RiC-O 1.1 + m3gim-Extension + AgRelOn, als statische SPA auf GitHub Pages. Promptotyping-Methodik: Dokumente sind die Source of Truth, Code ist wegwerfbares Artefakt.

## Spec-Hierarchie

1. **`knowledge/datenmodell.md`** — Modell-Spezifikation. Bei jeder geplanten Modelländerung zuerst lesen und dort verankern, bevor Pipeline/Tests/Frontend angefasst werden.
2. **`knowledge/status.md`** — aktueller Stand, nächste Schritte, v2-Migrationsphasen.
3. **`knowledge/tests.md`** — Teststrategie + TDD-Workflow.
4. **`knowledge/pipeline.md`** — Pipeline-Referenz.
5. **`knowledge/frontend.md`** — Frontend-Architektur + Visualisierungen.
6. **`knowledge/entscheidungen.md`** — E-01 bis E-69, historische Architekturentscheidungen.

Weitere Dokumente siehe [`knowledge/übersicht.md`](knowledge/übersicht.md).

## Kern-Commands

### v1-Pipeline (Default-Pfade, kopiert nach `docs/data/`)

```bash
python scripts/transform.py
python scripts/build-views.py
```

### v2-Pipeline (parallel, überschreibt Frontend NICHT)

```bash
M3GIM_SHEETS_DIR=data/source-v2 M3GIM_OUTPUT_DIR=data/output-v2 python scripts/transform.py
M3GIM_OUTPUT_DIR=data/output-v2 python scripts/build-views.py
```

### Tests

```bash
pytest tests/ -m "not slow"     # v1, ~156 Tests, 1s
# v2-Tests:
M3GIM_JSONLD_PATH=data/output-v2/m3gim.jsonld \
M3GIM_PARTITUR_PATH=data/output-v2/views/partitur.json \
M3GIM_SHEETS_DIR=data/source-v2 \
M3GIM_ENRICHMENT_PATH=data/output-v2/wikidata-enrichment.json \
M3GIM_RECONCILIATION_PATH=data/output-v2/wikidata-reconciliation.json \
    pytest tests/ -m "not slow"
```

### Snapshot-Diff v1 ↔ v2

```bash
PYTHONIOENCODING=utf-8 python tests/tools/snapshot_diff.py \
    data/output/m3gim.jsonld data/output-v2/m3gim.jsonld
```

## Workflow-Regeln

### TDD-Modus für Modell-Erweiterungen

Bei neuen Features aus `datenmodell.md`:

1. Invariante in `tests/test_NN_*.py` als `@pytest.mark.xfail(reason="Phase X nicht implementiert", strict=True)` formulieren. **strict=True** ist wichtig: XPASS failt die Suite und signalisiert, dass der xfail-Marker zu entfernen ist.
2. Tests mit Mindestvorkommen versehen (nicht „leere Liste ist ok"), damit sie nicht trivial bestehen.
3. Erst dann in `scripts/transform.py` implementieren, bis xfail → XPASS.
4. xfail-Marker entfernen, Testsuite wieder grün.

Siehe `knowledge/tests.md` § TDD-Workflow. In Phase 4.1–4.8 durchgängig angewendet, 12 neue Test-Module.

### v1 byte-identisch halten

Die alte v1-Pipeline (`data/google-spreadsheet/` → `data/output/`) dient als Referenz. Modelländerungen sollen **additiv** sein; v1-Output darf sich nur durch Spec-Erweiterungen (in `datenmodell.md` dokumentiert) ändern, nie durch Refactoring-Nebeneffekte. Schutz: `build-views.py` kopiert **nur bei Default-OUTPUT** nach `docs/data/`, v2-Läufe landen nie versehentlich im Frontend.

### Modell-Erweiterungen testgetrieben in folgender Reihenfolge

Falls in Zukunft weitere Phasen aus `status.md` umgesetzt werden:

1. Tests als Spec (xfail strict).
2. `datenmodell.md` ggf. erweitern/konkretisieren.
3. Pipeline in `scripts/transform.py` implementieren.
4. xfail → XPASS → xfail-Marker entfernen.
5. v1- und v2-Tests beide grün. Kein einseitiger Fix.

### Keine Commits ohne explizite Aufforderung

Commit-Regel aus den Projektgewohnheiten: **nie selbständig committen**. Auch nicht, wenn ein Commit logisch zur Arbeit gehört. Nur, wenn die Nutzer:in das Commit-Wort explizit nennt. Commits werden dann mit Co-Authored-By-Trailer versehen.

### docs/data/ nur über Pipeline

Die Dateien in `docs/data/*.json` + `docs/data/m3gim.jsonld` werden ausschließlich von `build-views.py` bzw. manuellem Kopieren aus `data/output/` geschrieben. Nicht direkt editieren — das würde bei nächstem Pipeline-Lauf überschrieben.

### Plakate/Dateinamen-Eigenheiten

- `M3GIM-Verknüpfungen.xlsx` — Dateiname enthält das `ü`, nicht `ue`. Pipeline kompensiert via `pd.read_excel()`-Fallback auf beide Varianten, aber beim Schreiben von Skripten immer das `ü`.
- Plakate-IDs: `UAKUG/NIM/PL_XX` (mit Slash), nicht `UAKUG/NIM_PL_XX`.
- Konvolut-Hierarchie: Objekt-ID = `archivsignatur + " " + folio`. In v2 heißt die Folio-Spalte im Objekte-XLSX `folio nr`, nicht `folio` oder `Unnamed: 2`. Pipeline akzeptiert beide.
- Header-Shifts in drei Indizes (Org, Ort, Werk): erste Datenzeile wird als Header gelesen. Pipeline korrigiert über `HEADER_SHIFTS`-Mapping; beim Debugging bewusst sein.

## Rote Linien

- **DSGVO**: `antrag.md`, `handreichung.md` nur im Obsidian-Vault `C:\Users\Chrisi\Documents\obsidian\Projects\M³GIM\`, **nie ins Repo**. Die `.gitignore` führt entsprechende Einträge.
- **Keine destruktiven Git-Operationen** (`reset --hard`, `push --force`, `checkout .`) ohne explizite Nutzer-Aufforderung.
- **Pre-commit-Hooks nicht umgehen** (`--no-verify`).
- **Nicht direkt in `docs/data/` schreiben** (siehe oben).

## Datenquellen-Struktur

```
data/
├── google-spreadsheet/   # v1-Quelle (XLSX, git-tracked — 7 Dateien)
├── source-v2/            # v2-Quelle (XLSX, git-tracked — 6 Dateien, ü-Umlaut)
├── output/               # v1-Output (m3gim.jsonld, wikidata-*.json, views/)
├── output-v2/            # v2-Output (parallel, nicht im Frontend)
├── reports/              # v1 exploration + validation reports
└── reports-v2/           # v2 reports
```

Das Frontend konsumiert `docs/data/m3gim.jsonld` und `docs/data/partitur.json`, die von v1 gespeist werden. Die v2-Migration zum Frontend ist Phase 6 (siehe `knowledge/status.md`).

## Wegweiser

- Details zu Architektur, Datenmodell, Tests, Frontend → `knowledge/` (siehe `knowledge/übersicht.md`)
- Session-Memory (persistiert über Sessions): `.claude/projects/*/memory/`
- Aktuelle Roadmap: `knowledge/status.md` § Nächste Schritte
