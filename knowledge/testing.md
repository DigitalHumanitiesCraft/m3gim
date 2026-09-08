---
title: Tests
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: en
version: 0.7
created: 2026-02-19
updated: 2026-09-08
authors: [Christopher Pollin]
generated-with: Codex
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Testing
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/testing
topics: ["[[Test-Driven Development]]", "[[Data Validation]]"]
related: [architecture, data, journal]
---

# Tests

> Quality assurance of the generated dataset and of the artefacts around it. Two layers, three test modes, a test-driven workflow for model changes.

## Purpose

The suite checks source-to-output preservation, model structure and references, publication freshness, pipeline failure paths and frontend behaviour. It combines source-backed expectations with isolated failure cases and actual browser interactions. Its guarantees extend to the assertions and environments exercised. Historical interpretation and acceptance remain with the researchers.

Every test asserts one non-trivial invariant and can fail. Soft warnings belong in `validate.py`.

## Two layers

The suite separates two kinds of statement, because the holdings receive new deliveries and a red run can mean two different things.

Invariants check model, pipeline, serialization and frontend contract, independent of the errors the source currently carries. They run as `pytest tests/ -m "not data_quality and not slow"` and must always be green. Red here means the project broke something.

The data mirror carries the marker `data_quality` and checks source cleanliness and source-to-model coverage, including whether every link reaches a record or an implemented mapping. The marker alone does not classify the cause; an unmapped admitted type can require pipeline/model work. Failure messages name source cells for the cataloguing team. These tests carry no hard-coded exception list and turn green with a clean delivery. Run them with `pytest tests/ -m data_quality`. The holdings verifier separates source resolution from rendered coverage; only its source-resolution check belongs to this layer. Missing rendered records are an implementation failure. Release acceptance must assess the named source findings and their impact as recorded in [plan.md](plan.md).

The contract between the layers is the value list `Typ-Rolle.csv`. A recorded value outside the value list is a data mirror finding. A value that stands in the value list but is missing from the vocabulary is an invariant finding, because then the model lags behind.

## The three test modes and the pass-through policy

Hard tests assert a structural invariant and must be green. They catch crashes and silent data loss as well as referential, namespace and identifier guarantees.

Strict xfail tests are expected to be red. `strict=True` makes the suite break as soon as the test passes, which signals that the marker is to be removed. This mode carries both unimplemented model features and source-fix signals.

Report tests never fail. They print the finding without a side effect and do not mutate the tracked quality snapshot, which `report-quality.py` alone maintains.

The dividing line is the pass-through policy. A structural blocker belongs in a hard or an xfail test and the pipeline has to solve it. A content error in the data belongs in a report or a source-fix signal and is corrected at the source by the cataloguing team, never silently in the pipeline.

Four strict xfail markers stand in the suite, each naming the source finding it waits for. An object row that carries nothing beyond its signature, a folio granularity inconsistency between object and link table, a composer spelling variant in the work index, and impossible calendar dates. Each one turns the source fix into a suite break, which is how the marker gets removed.

## Minimum occurrence and the baseline guard

A test that would also pass on an empty dataset asserts nothing. Every test therefore carries a minimum occurrence, derived at runtime from the source where possible, rather than accepting an empty list.

The regression baselines in `tests/fixtures/baseline_counts.json` compare with a greater-or-equal, so growth is allowed and shrinkage is forbidden. Project leadership decided that the minimum values are pulled to roughly ninety percent of the reached actual after every data update. The buffer of ten percent carries the normal variation of a new export, a loss beyond it strikes. Without the pull, the actual values grow silently away from the minimum values and the guard stops catching even the loss of half a holding. The test stays unchanged, the fixture carries the statement.

## Author rules

- Derive lower bounds at runtime from the source. A fixed number bound to the size of one export turns hard tests red against the previous data state.
- Skip only a genuinely optional or export-specific feature. Required source/publication files and model families must fail clearly when absent.
- An unimplemented feature is a strict xfail, not a hard test.
- Some invariants cannot be computed from the graph without a provenance marker written by the pipeline. The marker is then part of the feature.
- A frontend vocabulary parser used in a coupling test strips comments, otherwise it counts commented-out entries as mapped.
- Use source-backed expected values for model and research semantics. Synthetic inputs cover pure functions and failures absent from the current corpus. Import production code under test; avoid duplicating its algorithm as an oracle.
- An integration test may compare consumers with the common selector, but independent source-backed sets must establish that selector's meaning.
- Browser assertions wait for an observable state and operate visible controls. DOM presence alone does not prove that a plot or control is visible.

## TDD workflow for model changes

1. Formulate the invariant. Which output is supposed to come into being?
2. Write the test with `@pytest.mark.xfail(reason=..., strict=True)`, the reason pointing at the anchor in [data.md](data.md) that has to exist first.
3. Anchor a minimum occurrence so the test cannot pass trivially.
4. Implement in `scripts/transform.py` until the test turns XPASS.
5. Remove the xfail marker, suite green again.

Where a feature scales with the source, the test scales with it too, so a new data state runs without test corrections. The order of work is the spec-first order of [`../CLAUDE.md`](../CLAUDE.md), that is [data.md](data.md), then the vocabulary, then the test, then the pipeline (E-133).

## Anchor records

Beside the aggregate-oriented tests, the provenance module keeps a small dictionary of curated anchor records with their expected source row, document type, title fragment and detail count. Each anchor runs through parametrized tests, so the mapping from source cell to dataset node is readable in the test itself.

Two maintenance rules follow. When the source table is resorted, the anchor test breaks on purpose and the fixture is pulled to the new row by hand, because a dynamic row lookup would undercut the contract. And anchors stay few, chosen to cover the breadth of the model rather than every peculiarity. The current anchors live in the test files, this document does not list them.

## Test groups

The per-file list is the directory itself together with the module docstrings. This table gives the ranges and what they are for.

| Range | Purpose |
|---|---|
| 01 to 19 | The generated dataset against the source. Schema, string hygiene, roundtrip of object and link tables, referential integrity, frontend contract, Wikidata provenance and typing, regression baselines, determinism of the run, mobility, agent relations, finance, parse units, vocabulary coverage, the dating model and its meta contract. |
| 20 to 39 | Model extensions and provenance. Source reference down to the cell, anchor records, coordinates, role hygiene, composer uniqueness, mobility clusters and events, term conformance against RiC-O and AgRelOn, stage parts and performances, quality flags, document vocabulary, freshness of the published copy, identifier stability, index completeness, the dropdown export, the confirmed modelling rules, calendar validity of the dates. |
| 40 to 52 | Artefacts beside the dataset. Vocabulary gate in both directions, naming convention, the narrow Turtle reader of the pipeline, the generated model page, the read sites of the evaluation scripts, reconciliation and approval logic, integrity of the knowledge base, the sender side of correspondence, footer and markup hygiene of the delivered pages, link proposals, role positions of an agent relation, dating scope and rank. |
| 60 to 71 | Source layer, reports and preservation. CSV paths, orphan and unmodelled links, recording value lists, diagnostics, duplicate stage parts, report accounting and data preservation under failed input, requests, writes or backup replacement. |
| `tests/frontend/` | Node unit tests of the DOM-free frontend functions, plus browser-bound pytest modules for the smoke run, stable shared-view contracts, register and holdings behaviour, map keyboard operation and basket downloads. |

The numbering has gaps and collisions. Numbers are stable identifiers rather than a continuous index, so a retired module does not free its number, and three numbers carry two modules each. A reference by number alone is therefore ambiguous and has to name the file.

Beside the numbered modules the directory holds `conftest.py` with the session-scoped fixtures and the path overrides described in [architecture.md](architecture.md) § ENV overrides, `_helpers.py` with the shared graph accessors, `fixtures/` with the baselines and the verified allowlist of external terms, `schemas/` with the JSON Schema, `tools/` with the snapshot diff and the holdings verification as command-line tools, and `frontend/` as described above.

The source-diagnostics checks compare the validator's valid target keys with the actual transformed hierarchy, including synthetic intermediate Folio parents. Isolated boundary cases preserve null-value and literal-cell semantics, deterministic join repair and the distinction between missing source content and a valid Folio row. Calendar checks assert accepted partial/season forms, rejected impossible dates and source-row W010 warnings for both midnight timestamp separators. Valid dates remain unflagged; shared processing-status normalisation accepts recorded variants while unknown values retain E004. Report links are checked from an overridden output directory. A diagnostic refactoring also needs a comparison with the former transformation output; two identical candidate runs establish determinism alone.

Relative Markdown links are checked across the root entry documents, maintained knowledge and the reports and migration evidence under `data/`. Historical statements retain their dated meaning, while their references must remain reachable after consolidation.

## Vocabulary gates

`vocab/check-coverage.py` is executed as a separate process so the test and manual gate use the same entry point and expose missing terms. Its `--vacancy` direction reports declared terms without use. An editorial note beginning `unused:` may retain an intentionally unused term with its reason.

The naming gate reads Turtle with rdflib and requires uppercase class initials and lowercase property/concept initials. Anonymous class expressions are excluded. External-term existence is checked separately from RDF range compatibility; the open range deviations are recorded in [data-model.md](data-model.md).

## Integrity of the knowledge base

E identifiers address decisions; AF and QF identifiers address authority and source findings. The integrity tests require unique definitions and resolvable citations across knowledge, code, tests and vocabulary, including the finding registers under `data/reports/`. Journal files supply historical definitions and are excluded from current-term citation checks.

Further checks resolve relative Markdown links, document names and titled section references. Generated reports may be absent only when a verified producer accounts for them. Vocabulary names in backticks must be declared or explicitly identified as retired or target terms.

These checks establish referential integrity. A consolidation also needs a content review against the code and source evidence, including retained decisions, research tasks and acceptance limits. Passing link checks cannot establish that a factual statement is current.

## Frontend checks

Node tests exercise the production DOM-free modules with real vocabulary and shipped-graph fixtures for research semantics, plus synthetic boundary cases. Shared selector integration is supplemented by independent source-backed expected sets. Filter-event tests restore browser substitutes and filter state after every run. Retired helpers lose their exclusive tests once the distinct guarantees remain covered through production paths.

Browser tests start their own local server and use isolated contexts in a session-scoped Chromium process. The server allows concurrent module loading; failures report request URLs and transport errors. Playwright is required for candidate verification. Setup and commands are maintained in [README.md](../README.md). An unavailable browser supplies no verification evidence.

| Area | Behaviour and source-backed checks |
|---|---|
| Shared application | Smoke visits router views and checks drawing, data stamps, filters, URL roundtrips, source navigation and console errors. WARN, FAIL or unexpected browser errors fail the run. Focused cases exercise shared search, empty cuts, explicit filter replacement, narrow sidebar controls and accessible data-state information. |
| Complete holdings | The verifier opens every linked basis record through grouped rows and Folio pages, waiting for the displayed signature. It checks membership, populated role/value chips, grouped dates and absence of retired source-debugging elements. Source resolution is reported separately; object row 725 is a source finding. Cell-exact preservation remains covered by dataset and export checks. |
| Bestand interaction | `NIM_023_5` supplies complete title selection/copying at two widths. `NIM_003_1_1` supplies the single Potsdam tooltip with Wikidata link, keyboard focus, description and dismissal. Quality notes on grouped dates are keyboard-accessible; ordinary dates add no empty focus stop. Opening, switching and closing records preserve the activated row's position at 1366 and 800 pixels. |
| Document addresses and Folios | Reload restores the addressed record and convolute. Direct arrival clears sticky heads at 800 × 900, 1366 × 800 and 2048 × 1111, in grouped and flattened results. Paging updates individual titles and metadata; the fourth-page URL reloads correctly, titles remain selectable and narrow metadata stacks. |
| Basket and network exports | Actual CSV, BibTeX, JSON-LD and GEXF downloads preserve source evidence and stored-ID migration. Network downloads match the selected projection and cut in both modes. Builder comparisons test integration; literal source sets independently test meaning. |
| Statistics | The composer evidence list contains the seven-record T4 set and opens an actual record. Ranking-tail expansion exposes the previously absent target on the same bar scale. Parent-type counts agree with hierarchical facets. A real-record fixture with its type removed verifies evidence access for the missing-type row. |
| Chronik source projection | `NIM_023_5` separates document and statement dates; `NIM_007_11` preserves Zürich context; `NIM_005_16`/`NIM_005_17` preserve undated contractual places. Identity, typed parts and evidence stay intact. |
| Chronik temporal functions | Precision, leap years, ranges, invalid/reversed values, qualifiers, natural groups, coarse dates, compressed gaps and inverse mapping are checked. Aggregation preserves every source context, null evidence dates and original rows. Summaries preserve distinct values, recorded intervals, uncertainty and unchanged inputs. |
| Chronik in the browser | Named lanes, explicit folds, complete dense lists, nested evidence and Bestand navigation remain reachable. The 26 July 1953 group tests density; the 1924/1925 source range retains its original extent. `NIM_005_25` shows `25 Datierungen · Jänner–Dezember 1963`. The sticky year follows navigation and scrolling. Editorial context keeps its provenance; invalid and undated values remain accessible. |
| Netzwerk in the browser | Node centres must be visible inside the drawing bounds. Selection retains plot size, node geometry and zoom. Tab reaches the detail close control; page-level Escape returns focus to the selected node. Both projections retain their complete eligible evidence. |

Screenshots establish legibility and clipping; DOM/source queries establish text, counts and membership. Conflicting observations require inspection of dimensions, transforms and visibility.

Every shared UI change must be checked in every current consumer with real dense content, before and after opening, replacing and closing selection, on narrow and wide hosts. Compare horizontal and vertical content bounds and drawing dimensions. Long lists must scroll internally, with close/back controls reachable by keyboard. The Netzwerk suite does not yet automate replacement of an open selection, so that operation needs a separate observed check when the shared behaviour changes.

Chronik geometry checks cover every laid-out group child in the shipped corpus, including decade/year scales at 390, 800 and 1366 pixels with details open and closed. Compare all group positions, heights and scroll offset across selection. The largest historical gap must remain visibly marked and compact. A single dense-day case cannot establish fit for all wrapping cases. Exact pixel constants remain implementation choices.

[plan.md](plan.md) records the checked revision, execution scope and human acceptance.

## Boundaries

Model invariants cannot establish the correctness of cataloguing decisions or historical identities. The source layer remains subject to editorial correction and scholarly review. The data mirror makes missing input evidence explicit without modifying it. Strict xfails retain their named source-fix signals.

Network acceptance retains the concrete former F2 criteria. The unfiltered graph must contain every actor and mention of its linked records, with `UAKUG/NIM_023 5` as a source-backed canary. After data readiness its first unfiltered draw must complete in less than one second on the named acceptance environment; hover and click updates must complete within one animation frame. Visual acceptance covers lattice avoidance, record-node size, relation-mark readability, the second neighbourhood step, central label density and use of the drawing area. Measurements name the environment and graph size. A fast warm click cannot establish the cold-click criterion, and technical observations cannot establish human visual acceptance.

The full smoke still includes fixed waits and overlaps with focused browser tests. It remains a broad integration canary; gradual replacement should remove a check only once an equivalent behaviour check covers its failure mode. The stable-view consumer comparison uses the common selector and is complemented by independent source-backed cases. No framework migration or wholesale test renumbering is needed.

Performance measurements apply to the recorded environment. The suite does not establish universal device performance, full assistive-technology conformance, unaided completion of the research tasks or scholarly acceptance. The current verification and material limits live in [plan.md](plan.md). Possible future additions include SHACL validation and continuous integration, which the repository does not currently run.
