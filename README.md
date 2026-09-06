# M³GIM: Mapping Mobile Musicians

M³GIM is a digital humanities pilot study on the mobility and the knowledge production of a twentieth-century mezzo-soprano, built on the partial fonds UAKUG/NIM at the university archive of the University of Music and Performing Arts Graz. The cataloguing team records the material in tables, a Python pipeline transforms that recording into JSON-LD modelled in RiC-O 1.1 with the m3gim extension and AgRelOn, and a static single-page application on GitHub Pages makes every recorded data point traceable back to the record and the source cell that carries it. Promptotyping is the context and knowledge engineering method behind the repository, so the maintained knowledge base in `knowledge/` is the source of truth and the code is the derived artefact.

The application runs at [dhcraft.org/m3gim](https://dhcraft.org/m3gim).

## Structure

```text
m3gim/
|-- knowledge/               # the maintained knowledge base, entry point knowledge/INDEX.md
|-- data/
|   |-- google-spreadsheet/  # source material, versioned: object table and links as CSV, four index XLSX
|   |-- output/              # pipeline output: m3gim.jsonld and the two wikidata-*.json
|   |-- curated/             # curated hand work the pipeline reads
|   |-- reports/             # curation evidence, quality snapshot, finding registers, generated reports
|-- scripts/                 # pipeline and related command-line tools
|-- vocab/                   # m3gim.ttl, the formal project vocabulary, with its coverage checker
|-- tests/                   # pytest suite, plus Node unit tests and the browser smoke run under tests/frontend/
`-- docs/                    # GitHub Pages frontend, vanilla JS without a build step
```

## Technology

- Model, RiC-O 1.1 with the m3gim extension, AgRelOn for agent relations, SKOS for the controlled vocabularies
- Pipeline, Python 3.11 or newer, with `pandas`, `openpyxl` and `thefuzz[speedup]`
- Frontend, vanilla JavaScript as ES modules, locally shipped D3 v7 and fonts, no framework and no build tool
- Authority data, Wikidata identifiers through `reconcile.py` and `enrich-wikidata.py`
- Hosting, GitHub Pages

The tab bar carries three groups, Material with Bestand and the register pages of the Indizes, Perspektiven with Chronik, Karte, Netzwerk and Statistik, and Werkzeug with the Korb. The views and their rules are described in [`knowledge/specification.md`](knowledge/specification.md) and [`knowledge/design.md`](knowledge/design.md).

Running figures on holdings, link rate and authority coverage live in the generated quality snapshot [`data/reports/quality-snapshot.md`](data/reports/quality-snapshot.md) and not in this file.

## Running it locally

Prerequisites are Python 3.11 or newer and, for the JavaScript unit tests, Node. `requirements-test.txt` includes the runtime dependencies from `requirements.txt`, so one install yields both environments.

```bash
pip install -r requirements-test.txt
python -m http.server 8000 --bind 127.0.0.1 --directory docs
```

The shipped frontend is available at `http://localhost:8000/`. Viewing it needs no data regeneration. Use the pipeline below when source data or transformation code changes.

### Pipeline

The full run has eight steps in this order, each callable on its own:

```bash
python scripts/explore.py            # source structure        -> data/reports/exploration-report.md
python scripts/validate.py           # source check            -> data/reports/validation-report.md
python scripts/transform.py          # source to JSON-LD       -> data/output/m3gim.jsonld
python scripts/build-views.py        # publication             -> docs/data/m3gim.jsonld
python scripts/audit-data.py         # source against JSON-LD, console report only
python scripts/report-quality.py     # running figures         -> data/reports/quality-snapshot.md
python scripts/report-cataloguing.py # cataloguing worklist    -> data/reports/cataloguing-report.md
python scripts/build-model-page.py   # vocabulary to the model page -> docs/datenmodell.html
```

Outside the run stand the Wikidata alignment, export, proposal, backup and asset-building tools listed in [`knowledge/architecture.md`](knowledge/architecture.md) § Scripts outside the run.

`M3GIM_SHEETS_DIR`, `M3GIM_OUTPUT_DIR` and `M3GIM_REPORTS_DIR` redirect source, output and report directory in every step, resolved once in `scripts/_common.py` and imported from there, so `audit-data.py`, `report-quality.py` and `report-cataloguing.py` see the same data state as the transformation. `build-views.py` also honours `M3GIM_JSONLD_PATH`, `transform.py` also `M3GIM_VOCAB_PATH` and `M3GIM_ALLOW_NO_WIKIDATA`.

Three points mislead easily in a fresh clone.

- `scripts/validate.py` exits 1 as soon as the validation report carries ERROR findings. At the current data state that is the expected outcome. The findings are source errors from the cataloguing and travel to the cataloguing team through [`data/reports/source-errors-handover-2026-09-01.md`](data/reports/source-errors-handover-2026-09-01.md) and the generated cataloguing report. `audit-data.py` follows the same convention.
- The authority files `wikidata-reconciliation.json` and `wikidata-enrichment.json` are versioned in `data/output/` and are read by the transformation from the output directory. If one of them is missing there, `transform.py` aborts with exit 1, because the dataset would silently lose coordinates, life dates and occupations. A deliberate run without authority data needs `M3GIM_ALLOW_NO_WIKIDATA=1`. The guard is described in [`knowledge/architecture.md`](knowledge/architecture.md).
- `docs/data/m3gim.jsonld` is the single data source of the frontend and is written only by `build-views.py`. Beside it `docs/data/geo/` carries the world geometry the Karte loads, which no pipeline step produces.

### Tests

```bash
pytest tests/ -m "not slow and not data_quality"  # invariants, must always be green
pytest tests/ -m data_quality                     # Datenspiegel, red while the source carries errors
pytest tests/ -m "not slow"                       # both without the determinism test
node --test tests/frontend/*.test.mjs             # JS unit tests of the frontend
python vocab/check-coverage.py                    # vocabulary coverage, read-only console report
```

The suite has two layers. The invariants check model, pipeline and frontend contract and are green whenever the code is sound. The Datenspiegel asserts that the source is clean, is deliberately red while known source errors exist, and its failure messages are the finding list for the cataloguing team. Red in the Datenspiegel is expected, red in the invariants is a bug.

The browser suite under `tests/frontend/` starts its HTTP server and Chromium itself, with isolated contexts for the research paths. Install `pip install playwright` and `playwright install chromium`, then run `pytest tests/frontend/ -m "frontend and not data_quality"`. Browserless local runs may skip this optional dependency; candidate verification requires it. The test responsibilities and limits are in [`knowledge/testing.md`](knowledge/testing.md).

## Data flow

The recording tables under `data/google-spreadsheet/` go through the pipeline into `data/output/m3gim.jsonld`, from there as a copy into `docs/data/m3gim.jsonld`, and from there into the loader of the application, which reads the whole dataset once at startup. There is no other data path and no pre-aggregated derivative.

## Documentation

- Agent entry, [AGENTS.md](AGENTS.md) → shared [CLAUDE.md](CLAUDE.md) → [current plan](knowledge/plan.md)
- Entry into the knowledge base, [`knowledge/INDEX.md`](knowledge/INDEX.md)
- Project identity, requirements, epics and the state of the work, [`knowledge/specification.md`](knowledge/specification.md)
- Source material and known defects, [`knowledge/data.md`](knowledge/data.md), with the formal model in [`knowledge/data-model.md`](knowledge/data-model.md) and the German partner-facing [`knowledge/recording-guide.md`](knowledge/recording-guide.md)
- Pipeline and frontend reference, [`knowledge/architecture.md`](knowledge/architecture.md), the design system in [`knowledge/design.md`](knowledge/design.md)
- Test strategy, [`knowledge/testing.md`](knowledge/testing.md)
- Decisions and their reasons, [`knowledge/journal.md`](knowledge/journal.md), superseded material in [`knowledge/journal-archive.md`](knowledge/journal-archive.md)
- Open handover points, [`knowledge/handoff.md`](knowledge/handoff.md)

## Licence

Code is MIT, see [LICENSE](LICENSE). Text, documentation, the knowledge documents and the generated data are CC BY 4.0, the decision recorded in [`knowledge/specification.md`](knowledge/specification.md). The archival source material of the fonds UAKUG/NIM is held by the university archive of the University of Music and Performing Arts Graz, stays outside these licences, and individual items carry their own rights notes.
