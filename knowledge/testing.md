---
title: Tests
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: en
version: 0.6
created: 2026-02-19
updated: 2026-09-06
authors: [Christopher Pollin]
generated-with: Claude Code
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

The data mirror carries the marker `data_quality` and asserts source cleanliness, for instance that every link row meets a record. Failure messages name source cells for the cataloguing team. These tests carry no hard-coded exception list and turn green with a clean delivery. Run them with `pytest tests/ -m data_quality`. The holdings verifier separates source resolution from rendered coverage; only its source-resolution check belongs to this layer. Missing rendered records are an implementation failure. Release acceptance must assess the named source findings and their impact as recorded in [plan.md](plan.md).

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

The coverage checker `vocab/check-coverage.py` runs as a binding gate in the standard run. One test starts it as its own process and takes the checker output into the assertion, so a red run names the missing term. Running it as a separate process has three reasons. The script exports no callable check function, its file name carries a hyphen and is therefore not an importable module name, and the manual command from [`../CLAUDE.md`](../CLAUDE.md) and the gate use the same entry point and cannot drift apart.

The counter-direction runs over the same entry point with `--vacancy` and asserts that no declared term is carried without use. An empty term is excused by an editorial note beginning with the marker `unused:` that names the reason, so the reason travels with the term instead of living in an exception list in the test code.

A third test locks the naming convention decided by project leadership, that a declared class begins with a capital letter and a declared property or concept with a lower-case one. It reads with rdflib rather than a text pattern, because the declaration usually stands on the line after the identifier and a line-wise comparison would not attach it to its subject. Anonymous class expressions are blank nodes and stay outside the check.

## Integrity of the knowledge base

The knowledge base carries two citation systems that are addressed from code, tests, vocabulary and control documents. E numbers name architecture and model decisions, AF and QF numbers name reconciliation and source findings. A rebuild that distributes the definitions can make a number disappear or appear twice, and the citation in the code then points nowhere without anything breaking.

The integrity test is the barrier against that. It requires that every cited number has exactly one definition somewhere in `knowledge/`, without binding to a particular document, and that no number is defined twice. [journal.md](journal.md) counts as a definition address but not as a citation site, because its entries carry the identifiers of their time and a pull-through would falsify the record.

Further checks resolve relative Markdown links, cited document names and titled section references. Generated reports may be absent from a fresh checkout only when a verified producer accounts for them. The old numbered-section scanner was removed because the maintained knowledge uses titled sections. Every vocabulary name written in backticks must be declared or explicitly marked as a retired or target term. Historical documents retain the terms of their time.

## Frontend checks

Node tests exercise DOM-free frontend functions with `node --test tests/frontend/*.test.mjs`. Shared fixtures load the real concept vocabulary and shipped graph through the application loader. Source-backed cases establish filter, grouping and evidence semantics; synthetic fixtures isolate boundary cases. Module-by-module test coverage is visible in the test directory.

Filter, Folio and deep-link checks call the production `recordsFor` path. Retired helper functions lose their exclusive tests; distinct source and interaction guarantees remain. Filter-event tests restore global browser substitutes and filter state even when an assertion fails.

The browser suite starts a local server itself, with a 128-connection pending queue for concurrent module loading. Its session-scoped Chromium process serves isolated contexts, so storage and page state remain separate. Browser-error reports include failed request URLs and their transport errors. Playwright is an optional dependency for routine browserless development and mandatory for candidate verification. Install it with `pip install playwright` and `playwright install chromium`, then run `pytest tests/frontend/ -m "frontend and not data_quality"`. An unavailable browser cannot establish technical readiness.

The smoke run visits the router views and checks drawing, state stamps, filters, URL roundtrips, source navigation and console errors. A WARN, FAIL, unexpected browser exception or console error fails its process. The network stamp uses its current graph and projection fields. Focused browser tests cover exact register behaviour, shared search and empty cuts, filter replacement, narrow sidebar controls, data-state accessibility, page headers, map keyboard operation and real downloads.

The holdings verifier opens every linked basis record through grouped rows and Folio pages. Each hash navigation waits for the expected displayed signature through a locator assertion, independent of animation-frame polling and fixed sleeps. It checks row membership, populated role/value chips, grouped date values and the absence of retired source-debugging elements. Source resolution is reported separately. Cell-exact preservation remains covered by source-to-dataset and export tests. E-285 retires the earlier visible source-cell checks; their recorded successful runs describe the former interface. The missing source object at row 725 remains a source finding.

The four basket builders and their actual browser downloads are checked as CSV, BibTeX, JSON-LD and GEXF, including stored-ID migration and evidence. Network downloads are compared with the selected projection and document cut in both modes. That builder comparison establishes integration; literal source-backed expected record sets establish research semantics independently. The narrow network checks measure the drawing area before and after selection and require visible node centres inside it, closing the false-positive gap of checking only attached DOM nodes. Actual Tab navigation must bring the detail close control into the scrolling main area; page-level Escape must return focus to the selected node, and a second selection must retain the graph geometry.

Guided Bestand feedback adds browser regressions for selecting and copying the complete title of `NIM_023_5` at two viewport widths while preserving the open row, plus signature and keyboard toggling. The Potsdam tooltip at `NIM_003_1_1` is checked as one unfragmented overlay, including the Wikidata link, keyboard focus, preserved accessible descriptions and dismissal. Grouped dates expose substantive quality notes by keyboard where such notes exist; plain dates add no empty focus stop. A scroll regression measures the activated row before and after mouse and keyboard opening, switching and closing at 1366 and 800 pixels. It also reloads the resulting document address and requires the correct row and convolute to reopen. These checks cover the reported interaction defects; the project lead's interpretation remains separate acceptance evidence in [plan.md](plan.md).

Screenshots and DOM geometry answer different questions. The DOM and source queries establish text, counts and membership. Screenshots establish visual legibility and clipping. A contradiction requires investigation of dimensions, transforms and visibility before either observation is accepted.

Statistics checks require the literal seven-document Task 4 set in the composer evidence list and the actual opened record detail. A ranking-tail test proves the target is absent before expansion, follows it afterwards and checks the common bar scale. Parent-type counts must agree with the existing hierarchical facet. For the missing-type case, a browser response fixture removes one known record's type while retaining its real data and routes; the test follows the displayed evidence to that record. A static assertion that the row had no click handler was retired because it prevented the required evidence path. These tests protect the meaning of the interaction without prescribing the renderer's source text.

## Boundaries

Model invariants cannot establish the correctness of cataloguing decisions or historical identities. The source layer remains subject to editorial correction and scholarly review. The data mirror makes missing input evidence explicit without modifying it. Strict xfails retain their named source-fix signals.

Network acceptance retains the concrete former F2 criteria. The unfiltered graph must contain every actor and mention of its linked records, with `UAKUG/NIM_023 5` as a source-backed canary. After data readiness its first unfiltered draw must complete in less than one second on the named acceptance environment; hover and click updates must complete within one animation frame. Visual acceptance covers lattice avoidance, record-node size, relation-mark readability, the second neighbourhood step, central label density and use of the drawing area. Measurements name the environment and graph size. A fast warm click cannot establish the cold-click criterion, and technical observations cannot establish human visual acceptance.

The full smoke still includes fixed waits and overlaps with focused browser tests. It remains a broad integration canary; gradual replacement should remove a check only once an equivalent behaviour check covers its failure mode. The stable-view consumer comparison uses the common selector and is complemented by independent source-backed cases. No framework migration or wholesale test renumbering is needed.

Performance measurements apply to the recorded environment. The suite does not establish universal device performance, full assistive-technology conformance, unaided completion of the research tasks or scholarly acceptance. The current verification and material limits live in [plan.md](plan.md). Possible future additions include SHACL validation and continuous integration, which the repository does not currently run.
