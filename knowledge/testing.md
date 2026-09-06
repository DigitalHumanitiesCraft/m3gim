---
title: Tests
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: en
version: 0.6
created: 2026-02-19
updated: 2026-09-05
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

The suite validates the output of the pipeline and the artefacts derived from it, not the pipeline code. It is the safety net for data updates and model changes. It guarantees that the dataset is structurally, semantically and referentially intact, that the published copy matches the generated one, that the formal vocabulary and the dataset cover each other, and that the frontend contract holds.

Every test asserts one non-trivial invariant and can fail. Soft warnings belong in `validate.py`.

## Two layers

The suite separates two kinds of statement, because the holdings receive new deliveries and a red run can mean two different things.

Invariants check model, pipeline, serialization and frontend contract, independent of the errors the source currently carries. They run as `pytest tests/ -m "not data_quality and not slow"` and must always be green. Red here means the project broke something.

The data mirror carries the marker `data_quality` and asserts that the source is clean, for instance that every row of the link table meets a record. These tests are deliberately red while known source errors exist. Their failure messages carry each finding with its source cell and are the finding list handed to the cataloguing team through the handover list under `data/reports/`. They hold no hard-coded expectation list and turn green by themselves with a clean delivery, without anyone touching the test. They run as `pytest tests/ -m data_quality`. With Playwright installed, the DOM comparison of the holdings list belongs to this layer as well, so the assertion reaches into the rendered document.

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
- A precondition that holds only for a new export is a skip, not an assert.
- An unimplemented feature is a strict xfail, not a hard test.
- Some invariants cannot be computed from the graph without a provenance marker written by the pipeline. The marker is then part of the feature.
- A frontend vocabulary parser used in a coupling test strips comments, otherwise it counts commented-out entries as mapped.
- Never guess a value. Fixtures and expected values come from the real dataset.

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
| 60 to 65 | Source layer and data mirror. CSV read path and format of the link exports, source rows that never reach the dataset, recording against the value list, the unresolved aggregate, the run diagnostics of the transform step, duplicate stage parts. |
| `tests/frontend/` | Node unit tests of the DOM-free frontend functions, plus the browser-bound pytest modules for the smoke run, the register page and the DOM comparison of the holdings list. |

The numbering has gaps and collisions. Numbers are stable identifiers rather than a continuous index, so a retired module does not free its number, and three numbers carry two modules each. A reference by number alone is therefore ambiguous and has to name the file.

Beside the numbered modules the directory holds `conftest.py` with the session-scoped fixtures and the path overrides described in [architecture.md](architecture.md) § ENV overrides, `_helpers.py` with the shared graph accessors, `fixtures/` with the baselines and the verified allowlist of external terms, `schemas/` with the JSON Schema, `tools/` with the snapshot diff and the holdings verification as command-line tools, and `frontend/` as described above.

## Vocabulary gates

The coverage checker `vocab/check-coverage.py` runs as a binding gate in the standard run. One test starts it as its own process and takes the checker output into the assertion, so a red run names the missing term. Running it as a separate process has three reasons. The script exports no callable check function, its file name carries a hyphen and is therefore not an importable module name, and the manual command from [`../CLAUDE.md`](../CLAUDE.md) and the gate use the same entry point and cannot drift apart.

The counter-direction runs over the same entry point with `--vacancy` and asserts that no declared term is carried without use. An empty term is excused by an editorial note beginning with the marker `unused:` that names the reason, so the reason travels with the term instead of living in an exception list in the test code.

A third test locks the naming convention decided by project leadership, that a declared class begins with a capital letter and a declared property or concept with a lower-case one. It reads with rdflib rather than a text pattern, because the declaration usually stands on the line after the identifier and a line-wise comparison would not attach it to its subject. Anonymous class expressions are blank nodes and stay outside the check.

## Integrity of the knowledge base

The knowledge base carries two citation systems that are addressed from code, tests, vocabulary and control documents. E numbers name architecture and model decisions, AF and QF numbers name reconciliation and source findings. A rebuild that distributes the definitions can make a number disappear or appear twice, and the citation in the code then points nowhere without anything breaking.

The integrity test is the barrier against that. It requires that every cited number has exactly one definition somewhere in `knowledge/`, without binding to a particular document, and that no number is defined twice. [journal.md](journal.md) counts as a definition address but not as a citation site, because its entries carry the identifiers of their time and a pull-through would falsify the record.

Further checks run in the same module. Every relative Markdown link in `knowledge/` and in [`../CLAUDE.md`](../CLAUDE.md) points at an existing file. Every document name mentioned in code or fixture exists in the repository, with a small exception list for names that a script writes instead of citing, itself kept honest by a test. Every reference that names a section hits it in the named document, in the numbered form everywhere and in the titled form inside `knowledge/`, where the move to English replaced every German section title at once and left the file names intact. And every vocabulary name a knowledge document writes in backticks is declared in `vocab/m3gim.ttl` or carries the marker for a deliberate exemption, which covers a passage naming something retired or a decided target state. Historical documents are excluded, because their terms carry the names of their time.

## Frontend checks

The DOM-free functions of the frontend are covered by Node unit tests under `tests/frontend/`, run with `node --test tests/frontend/*.test.mjs`, without npm install and without build tools. Each file stands against a named silent defect, that is an error that shows no symptom but yields a wrong or empty result. Two helper files carry the fixtures, one putting the real concept nodes of the dataset in front of synthetic fixtures so no second vocabulary table lives in test code, the other supplying the shipped graph and the store built from it through the real loader. Where a view mixes DOM and D3 calls directly into its drawing logic it is not checked this way, because the effort would exceed the value.

The browser smoke run `tests/frontend/smoke.py` drives the application headless against a local HTTP server and is a canary rather than a full test. It walks the seven tabs of the router catalogue and asserts that the DOM does not render empty. It then checks the state stamp of each view against a required set of keys, which protects against a view rendering into nothing or a key falling out during a refactor. The holdings stamp names convolutes, records and the data state, and carries no sorting key since the table lost its sorting (E-203). The register page names the register, its entries, the total and the sorting, because the page shows exactly one register (E-226). The network stamp names focus, the facet keys, the data state and the node total, and of the per-type node counts only person and work are required. The remaining checks are canaries on the chronicle year grid and its aggregate resolution, the map after its asynchronous geometry load, the cross-view filter, the URL roundtrip, anchor titles and one fully expanded anchor record in the DOM, the convolute meta chips, the cataloguing-state facet, the scroll behaviour under the head, the empty filter strip, and duplicate identifiers in the graph.

Most of these checks catch every exception of their own execution and then report WARN instead of FAIL. Only a FAIL sets the exit code that the pytest wrapper evaluates, so a broken selector can let the run turn silently green. The map canary is a hard FAIL, because its stamp is written synchronously before the asynchronous draw and a silently empty map would otherwise pass. Whether the WARN checks should break the run is an open operator decision, and it decides whether the smoke run is a gate or a report.

The browser part is an optional extra. Playwright stands in no requirements file, so a default run in a browserless environment stays green through `pytest.importorskip`. With Playwright installed, the smoke test runs in the unmarked standard run as well, because `pytest.ini` does not exclude the marker.

Method rule from the frontend inspection. Where a reading of a screenshot and a reading of the DOM contradict each other, the DOM holds. Numbers and labels come from a store query or from the DOM.

## Boundaries

Deliberately outside the suite are the internals of the pipeline beyond the parse functions held as unit tests, the content of the recording tables itself, which is editorial work carried by `explore.py` and `validate.py`, the frontend JavaScript inside pytest, and runtime performance, which is uncritical for a pipeline of this size.

One gap is documented rather than closed. All four builders of the basket in [`../docs/js/views/korb.js`](../docs/js/views/korb.js), the CSV rows, the BibTeX assembly, the JSON-LD document and the GEXF graph, are exported and covered by Node unit tests against the shipped dataset. What stays outside the suite are the four download wrappers around them, which are module-internal, and with them the CSV quoting as the wrapper applies it, the byte order mark and the file name of the download. An ad-hoc Playwright script clicked the four buttons and read the written files once, and that check is not part of any run. Closing the gap presupposes exporting the wrappers as well, which is an intervention in the frontend code and therefore stands here as a note.

The same holds for three checks of 2026-09-05 that ran as ad-hoc scripts in the browser rather than as tests, the folio paging of the record detail, the page head of the info pages, and the geometry and timing of the Netzwerk. A durable browser suite for the Netzwerk is planned, over completeness of the graph against the dataset, first draw and interaction timing, and the tasks of the task set. Until it exists, the numbers those scripts produced hold for the run that produced them and for nothing else.

What can come later is SHACL validation against RiC-O shapes, semantically sharper than the JSON Schema, and continuous integration, which the project does not run today.
