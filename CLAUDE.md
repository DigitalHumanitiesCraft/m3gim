# CLAUDE.md

> Workflow-Regeln für Claude-Code-Sessions. Prozessual, nicht dokumentarisch. Für Dokumentation siehe `knowledge/`.

## Projekt in einem Satz

**M³GIM** (Mapping Mobile Musicians) — DH-Pilotstudie zur Mobilität und Wissensproduktion der Mezzosopranistin Ira Malaniuk (1919–2009), basierend auf dem Teilnachlass UAKUG/NIM am Universitätsarchiv der KUG Graz, modelliert in RiC-O 1.1 + m3gim-Extension + AgRelOn, als statische SPA auf GitHub Pages. Promptotyping-Methodik: Dokumente sind die Source of Truth, Code ist wegwerfbares Artefakt. Laufende Zählstände im Quality-Snapshot (`data/reports/quality-snapshot.md`), nicht hier.

## Spec-Hierarchie

1. **`knowledge/datenmodell.md`** — Modell-Spezifikation. Bei jeder geplanten Modelländerung zuerst lesen und dort verankern, bevor Pipeline/Tests/Frontend angefasst werden.
2. **`knowledge/status.md`** — aktueller Stand, nächste Schritte.
3. **`knowledge/tests.md`** — Teststrategie + TDD-Workflow.
4. **`knowledge/pipeline.md`** — Pipeline-Referenz.
5. **`knowledge/frontend.md`** — Frontend-Architektur + Visualisierungen.
6. **`knowledge/entscheidungen.md`** — historische Architekturentscheidungen (E-01 aufwärts, laufend ergänzt).

Weitere Dokumente siehe [`knowledge/übersicht.md`](knowledge/übersicht.md).

## Kern-Commands

### Pipeline (ein Lauf, Default-Pfade, kopiert nach `docs/data/`)

```bash
python scripts/transform.py
python scripts/build-views.py
```

`build-views.py` schreibt `m3gim.jsonld` + Derivate (`partitur.json`, `matrix.json`, `kosmos.json`) nach `docs/data/`. **`m3gim.jsonld` ist die einzige primäre Datenquelle für das Frontend**. Die drei Derivate werden seit Session 32 von keinem aktiven Tab mehr konsumiert (sie wurden für die entfernten D3-Prototypen gebaut) und stehen im Deferred-Aufräumblock — sie bleiben vorerst als potenzielle Bausteine für eine künftige Viz.

### Tests

```bash
pytest tests/ -m "not slow"     # Standard-Lauf ohne Determinismus-Test
pytest tests/                   # inkl. Determinismus-Test (slow)
```

Keine ENV-Overrides mehr nötig — es gibt nur einen Datenstand.

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

Bei neuen Features aus `datenmodell.md`:

1. Invariante in `tests/test_NN_*.py` als `@pytest.mark.xfail(reason="Phase X nicht implementiert", strict=True)` formulieren. **strict=True** ist wichtig: XPASS failt die Suite und signalisiert, dass der xfail-Marker zu entfernen ist.
2. Tests mit Mindestvorkommen versehen (nicht „leere Liste ist ok"), damit sie nicht trivial bestehen.
3. Erst dann in `scripts/transform.py` implementieren, bis xfail → XPASS.
4. xfail-Marker entfernen, Testsuite wieder grün.

Siehe `knowledge/tests.md` § TDD-Workflow. In Phase 4.1–4.8 (Session 28) und erneut für den Phase-6-Frontend-Kontrakt (Session 29) durchgängig angewendet.

### Modell-Erweiterungen testgetrieben in folgender Reihenfolge

Falls in Zukunft weitere Phasen aus `status.md` umgesetzt werden:

1. Tests als Spec (xfail strict).
2. `datenmodell.md` ggf. erweitern/konkretisieren.
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

Vollständiger Katalog der Pipeline-Workarounds (Header-Shifts, Finance-Currency-Defaults, Bearbeitungsstand-Normalisierung, Role-Hygiene, Freitext-Datierungen, Orphans, Komponisten-Schreibweisen) inkl. Source-Fix-Vorschlägen und Test-Absicherung: [`knowledge/xlsx-fixes.md`](knowledge/xlsx-fixes.md).

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
├── reports/              # exploration + validation reports
└── _archive/             # historische Stände (v1-Snapshots, obsolete Dirs) — Stand: 2026-04-17
```

**Datenfluss:** `data/google-spreadsheet/` → Pipeline → `data/output/m3gim.jsonld` → `docs/data/m3gim.jsonld` → Frontend-Loader.

Das Frontend konsumiert ausschließlich `docs/data/m3gim.jsonld`. Die Derivate `partitur.json`, `matrix.json`, `kosmos.json` werden von `build-views.py` weiterhin gebaut, aber von keinem aktiven Tab mehr gelesen (Deferred-Aufräumblock in `status.md`).

## Wegweiser

- Details zu Architektur, Datenmodell, Tests, Frontend → `knowledge/` (siehe `knowledge/übersicht.md`)
- Session-Memory (persistiert über Sessions): `.claude/projects/*/memory/`
- Aktuelle Roadmap: `knowledge/status.md` § Nächste Schritte
