# CLAUDE.md

> Workflow rules for Claude Code sessions. Documentation lives in `knowledge/`.

## Project in one sentence

M³GIM (Mapping Mobile Musicians) is a DH pilot study on the mobility and knowledge production of a twentieth-century mezzo-soprano, based on the partial fonds UAKUG/NIM at the university archive of the KUG Graz, modelled in RiC-O 1.1 with the m3gim extension and AgRelOn, delivered as a static SPA on GitHub Pages, with Promptotyping as the context and knowledge engineering method. Running figures live in the quality snapshot `data/reports/quality-snapshot.md`, not here.

## Session start

Read this file, then [`knowledge/INDEX.md`](knowledge/INDEX.md) as the entry into the knowledge base, then [`knowledge/handoff.md`](knowledge/handoff.md) as the process inbox of open handover points, then the document the task calls for from the spec hierarchy.

## Lanes and delegation

In parallel sessions each instance works in exactly one lane (Frontend, Backend, Knowledge) and touches only that lane's files. The project lead assigns the lane. Coordination runs in writing through [`knowledge/handoff.md`](knowledge/handoff.md), where an instance names its lane, lists the files it holds, enters handovers as their own points and removes what is done. Implementation work is delegated to Opus subagents, which run on disjoint file sets and carry the binding conventions below in their prompt.

## Binding conventions (project lead, 2026-09-01)

- **Code comments in English**, only where they carry something (the why, constraints), and compact. German project terms (Konvolut, Folio, Verknüpfungen, Datenspiegel) stay inside the English sentence. String literals stay German, because the interface and the finding texts of the Datenspiegel address German readers.
- **No standing explanatory text in the UI.** Information rides on structure, symbols, icons and tooltips, text only where no other form carries it. Captions and breakdown lines belong in tooltips.
- **All filters of all views in the one left sidebar.** No top filter bars.
- **File names of generated files in English**, whatever language the content is in.
- **Every Markdown document in `knowledge/` is English** (decision of the project lead of 2026-09-05, E-260). German project terms stay where the glossary in [`knowledge/INDEX.md`](knowledge/INDEX.md) defines them. The one declared exception is [`knowledge/journal-archive.md`](knowledge/journal-archive.md), which keeps the original German wording of the rows and narratives it took over. Outside `knowledge/` the recording guide [`data/recording-guide.md`](data/recording-guide.md) stays German, because it addresses the cataloguing team (E-267).

## Spec hierarchy

1. [`knowledge/data.md`](knowledge/data.md), source material and model specification. Read first on any planned model change and anchor the change there before pipeline, tests or frontend are touched.
2. [`vocab/m3gim.ttl`](vocab/m3gim.ttl), the formal project vocabulary in Turtle. Every change anchored in `data.md` is carried here before the pipeline follows.
3. [`knowledge/specification.md`](knowledge/specification.md), project identity, scope and the volatile section on the state of the work with the open operator decisions.
4. [`knowledge/testing.md`](knowledge/testing.md), test strategy and TDD workflow.
5. [`knowledge/architecture.md`](knowledge/architecture.md), pipeline and frontend reference. The design system lives in [`knowledge/design.md`](knowledge/design.md).
6. [`knowledge/journal.md`](knowledge/journal.md), provenance as a compact register of sessions and decisions (E numbers). Superseded material moves to `knowledge/journal-archive.md`.

The spec-first order is therefore `data.md`, vocabulary, test, pipeline (E-133). The reading view on the dataset derived from the vocabulary is [`knowledge/data-model.md`](knowledge/data-model.md). Further documents in [`knowledge/INDEX.md`](knowledge/INDEX.md).

## Core commands

Prerequisites are Python 3.11+ and `pip install -r requirements-test.txt`, which includes `requirements.txt` and yields runtime and test environment in one step. Node is needed only for the JS unit tests.

Pipeline, full run on default paths, eight steps in this order, each callable on its own:

```bash
python scripts/explore.py           # source structure       -> data/reports/exploration-report.md
python scripts/validate.py          # source check           -> data/reports/validation-report.md
python scripts/transform.py         # source to JSON-LD      -> data/output/m3gim.jsonld
python scripts/build-views.py       # publication            -> docs/data/m3gim.jsonld
python scripts/audit-data.py        # source against JSON-LD, console report only
python scripts/report-quality.py    # running figures        -> data/reports/quality-snapshot.md
python scripts/report-cataloguing.py # cataloguing worklist  -> data/reports/cataloguing-report.md (E-248)
python scripts/build-model-page.py  # model page from the vocabulary -> docs/datenmodell.html, plus foot and info topbar in all docs/*.html
```

Outside the run stand `reconcile.py` and `enrich-wikidata.py`, which need network access and write the git-tracked `wikidata-*.json` to `data/output/`, and `build-social-images.py`, which rebuilds the Open Graph image and the PNG favicons and needs Pillow, absent from every requirements file.

**`validate.py` exits 1 as soon as the report carries ERROR findings**, the expected state at the current data state. Those findings are source errors and travel to the cataloguing team through [`data/reports/source-errors-handover-2026-09-01.md`](data/reports/source-errors-handover-2026-09-01.md), so the run has done its job once the report is written. `audit-data.py` follows the same convention. `transform.py` lists the discarded source rows at the end and aborts without the two `wikidata-*.json` unless `M3GIM_ALLOW_NO_WIKIDATA=1` is set.

`M3GIM_SHEETS_DIR`, `M3GIM_OUTPUT_DIR` and `M3GIM_REPORTS_DIR` apply in every pipeline step, `audit-data.py`, `report-quality.py` and `report-cataloguing.py` included, which read them through `scripts/_common.py` (E-249). `build-views.py` also honours `M3GIM_JSONLD_PATH`, `transform.py` also `M3GIM_VOCAB_PATH`. Pointing `M3GIM_OUTPUT_DIR` at an empty directory loses the authority enrichment, a trap the Wikidata guard catches while `M3GIM_ALLOW_NO_WIKIDATA` is unset ([`knowledge/architecture.md`](knowledge/architecture.md) § ENV overrides).

Tests:

```bash
pytest tests/ -m "not slow and not data_quality"  # invariants, must always be green
pytest tests/ -m data_quality                     # Datenspiegel, red while the source carries errors
pytest tests/ -m "not slow"                       # both without the determinism test
pytest tests/                                     # including the determinism test (slow)
node --test tests/frontend/*.test.mjs             # JS unit tests of the frontend
```

The suite is two-layered. Invariants check model, pipeline and frontend contract and must be green. The Datenspiegel (`data_quality`) asserts the cleanliness of the source, is deliberately red while known source errors exist, and its failure messages are the finding list for the cataloguing team. Red in the Datenspiegel is expected, red in the invariants is a bug. The browser smoke test under `tests/frontend/` is optional and skips itself without Playwright, which stands in no requirements file. Install it with `pip install playwright` and `playwright install chromium`, then address it with `pytest -m frontend tests/frontend/`. With Playwright installed it also runs in the unmarked run, where it needs a local HTTP server against `docs/` ([`knowledge/testing.md`](knowledge/testing.md) § Frontend checks).

```bash
python vocab/check-coverage.py                    # vocabulary coverage, read-only console report
python tests/tools/snapshot_diff.py <old> <new>   # snapshot diff on a data update
python scripts/verify-manual-approvals.py         # verify manual Wikidata approvals
```

The coverage check also runs as a binding test gate through `tests/test_40_vocab_gate.py`, the naming convention of the vocabulary through `tests/test_41_naming_convention.py`. `verify-manual-approvals.py` is mandatory after every batch of manual approvals, because Q-IDs written from memory have produced load-bearing data errors. It is skippable offline with `SKIP_VERIFY_MANUAL=1`.

## Workflow rules

TDD for model extensions, in this order:

1. Formulate the invariant in `tests/test_NN_*.py` as `@pytest.mark.xfail(reason=..., strict=True)`. **`strict=True` is required**, because XPASS then fails the suite and signals that the marker is to be removed.
2. Give the test a minimum occurrence count so it cannot pass trivially.
3. Extend or sharpen [`knowledge/data.md`](knowledge/data.md) and `vocab/m3gim.ttl` where the change belongs there.
4. Implement in `scripts/transform.py` until xfail turns to XPASS.
5. Remove the xfail marker, suite green again. See [`knowledge/testing.md`](knowledge/testing.md) § TDD workflow for model changes.

**Never commit without the explicit word from the user**, not even when a commit belongs logically to the work. Commits then carry the Co-Authored-By trailer.

`docs/data/m3gim.jsonld` is written only by `build-views.py` or by copying from `data/output/`. It is **the single data source of the frontend** and is never edited directly, a next pipeline run would overwrite it. Beside it, `docs/data/geo/` carries the shipped world geometry of the map, which no pipeline step generates.

Source format particulars:

- The Verknüpfungen come as one CSV per sheet under `data/google-spreadsheet/verknuepfungen/`, one `Box_N.csv` per box with non-contiguous numbers, plus `Typ-Rolle.csv` (E-152). `resolve_verknuepfungen_source` takes every `Box_*.csv` there, falls back to the first file matching `M3GIM-Verkn*pfungen*.xlsx`, and raises `FileNotFoundError` without either.
- Plakate IDs read `UAKUG/NIM/PL_XX` with a slash, not `UAKUG/NIM_PL_XX`.
- Konvolut hierarchy, the object ID is `archivsignatur + " " + folio`. The folio column is called `folio nr` today, the pipeline still accepts the older `folio` and `Unnamed: 2`.

The full catalogue of pipeline workarounds with source-fix proposals stands in [`knowledge/data.md`](knowledge/data.md) § Compensations in the pipeline.

## Red lines

- **DSGVO**, `antrag.md` and `handreichung.md` live in the Obsidian vault under `Projects\M³GIM\` and **never in the repository**. The `.gitignore` carries the entries.
- **No destructive git operations** (`reset --hard`, `push --force`, `checkout .`) without an explicit request.
- **No bypassing of pre-commit hooks** (`--no-verify`).
- **No direct writes into `docs/data/`**, see above.

## Data source structure

```
data/
├── google-spreadsheet/   # source, git-tracked: objects as CSV (+XLSX fallback), four index XLSX, verknuepfungen/*.csv
├── output/               # pipeline output (m3gim.jsonld, wikidata-*.json)
├── reports/              # curation evidence, quality snapshot, finding registers, generated reports unversioned
├── curated/              # curated hand work the pipeline reads
├── backup/               # backups of the source exports
├── migration/            # intermediate states of a source migration
├── _archive/             # historical states, the XLSX in it are unversioned
└── recording-guide.md    # the German recording convention of the cataloguing team (E-267)
```

Data flow, `data/google-spreadsheet/` to the pipeline to `data/output/m3gim.jsonld` to `docs/data/m3gim.jsonld` to the frontend loader. Pre-condensed derivatives were removed with E-140.

## Signposts

Architecture, data model, tests and frontend live in `knowledge/`, reachable through [`knowledge/INDEX.md`](knowledge/INDEX.md). Current state and next steps stand in [`knowledge/specification.md`](knowledge/specification.md) § State, the decisions that wait on the project lead in § Open decisions. Session memory persists in the user profile under `.claude/projects/*/memory/`, not in the repository.
