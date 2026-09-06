---
title: Implementation Plan
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: active
language: en
created: 2026-09-06
updated: 2026-09-06
authors: [Christopher Pollin]
generated-with: Codex
method:
  name: Promptotyping
related: [INDEX, specification, research-framework, data, data-model, architecture, design, testing, handoff, journal]
---

# Implementation Plan

## Purpose and authority

This is the authorised implementation and acceptance plan for stabilising the existing application. It integrates the repository review and the subsequent story audit of 2026-09-06 against commit `e18dfa7`. Application code and source data were unchanged during those reviews. The plan records remaining work and its completion evidence; it does not declare the application accepted.

[specification.md](specification.md) owns the requirements and the version definitions. [research-framework.md](research-framework.md) owns the research questions and the task set. [data.md](data.md) and [data-model.md](data-model.md) own source and model boundaries. The implementation instruction of 2026-09-06 authorises the scope and contract clarifications below, recorded as E-282. Scholarly acceptance remains a separate step. The inherited assignments in [handoff.md](handoff.md) supply context; their old status labels are not evidence of either a missing implementation or acceptance.

## Project goal and stable scope

The pilot examines the mobility and knowledge production of the creator of the fonds through the archival material. Researchers need to investigate geographical reach, repertoire and stage parts, institutions, relationships and the circulation of music theatre knowledge. The application supplies recorded statements, their roles and their source evidence. Historical explanations of migration, aesthetic change or professionalisation require scholarly interpretation of that evidence.

The methodological goal is to establish whether the recording, RiC-O modelling, vocabulary and static research interface support those investigations and can carry the follow-up study. A successful implementation preserves the source-to-record-to-view-to-export chain and makes the limits of the recorded material intelligible. The quality of that chain is the release criterion.

The authorised stable scope is the existing document-centred research tool, including all six analytical views and the basket as the evidence export path. Preserve the vanilla ES-module frontend and the flat Python pipeline. The occurrence and participation model remains a separate, already decided model development whose implementation requires grouped source evidence. It must not be simulated by joining every place, date, work and person mentioned in one record.

The existing version definitions remain binding. Technical readiness means that the machine and browser gates below pass. Version 0.9 additionally requires the project lead to complete the research tasks and accept their interpretation. Version 1.0 requires the project partners' acceptance of the same scope. Neither the test count nor an agent report establishes either acceptance.

## Milestones and commit boundaries

Each completed milestone receives one commit, with its verification recorded here. The final milestone belongs to human acceptance and cannot be completed by an agent.

| Milestone | Completion criterion | State |
|---|---|---|
| M1 Research scope | Source-aware tasks and common search/time contract recorded in specification and research framework | Complete; E-282 |
| M2 Reliable data processing | Failure paths preserve existing data; report counts reflect the model; relevant tests and determinism pass | Complete; failure-path review and isolated determinism passed |
| M3 Consistent and usable views | Shared filters, map safety, evidence navigation and accessible static delivery verified | Complete; independent browser and Node checks |
| M4 Complete research paths | All stories mapped to executed checks or named material limits; actual evidence exports verified | Pending |
| M5 Consolidation and integrated verification | Unused code and superseded process documents resolved; full checks on one clean revision | Pending |
| M6 Scholarly acceptance | Project lead accepts task results for 0.9; partners accept them for 1.0 | Awaiting human task runs |

## Milestone verification

M1 was committed as `1218a10`. The follow-up review confirms that all 19 stories remain mapped and that task wording, view subsets and human acceptance have distinct meanings. No model extension or scholarly result was inferred.

M2 passed independent review after correcting four additional failure paths: missing input could report success, retryable failures with an old cached result could stop retrying, existing-QID checks could escape per-item handling, and a failed new backup could appear complete. The preservation and knowledge checks pass together (21 passed, one skipped); the agent's pipeline run had 546 passing invariants and four declared model xfails, and isolated determinism passed. Shared atomic file helpers are sufficient; no pipeline framework or packaging migration is required. Source errors remain cataloguing findings and have not been edited.

M2 was committed as `12383e4`. M3's independent review corrected a map subset count presented as the shared document count, added visible keyboard focus and reset its accessible label, preserved undated document context, and made grouped performance-date provenance keyboard reachable. Statistics rankings now expose every counted record. All six views agree on the nonempty and empty search cuts, direct filter links replace earlier filters, and the app loads with third-party requests blocked. Narrow screens start with collapsed filters. Node checks pass 678/678; the smoke passes; map and actual basket download checks pass; all 187 records and 51 Folio pages open in the exhaustive verifier, including every expected source-cell combination for the 152 records with link-cell provenance. Source dates grouped under a season were checked in their individual date tooltips. The shared search and atomic files remain small common helpers; no frontend framework or wider structural rewrite is needed.

## Evidence from the reviewed revision

The initial review ran the complete Node suite successfully, the isolated determinism test successfully, and the Python invariants and optional browser suite with failures. The Python integrity failure depended on whether an ignored generated report already existed. Browser failures included obsolete expectations for collapsed holdings, a work now carrying location evidence, and the rebuilt network's diagnostic fields. The data mirror separately exposed known source defects. These are dated observations of the reviewed revision, not a permanent claim that the suites pass.

Isolated reproductions confirmed loss of an existing reconciliation entry when its requested index was missing, a timeout cached permanently as an unmatched search, executable markup in a map role tooltip, URL filter merging, a legacy basket ID that counted without resolving, an empty map time slice displaying out-of-slice evidence, a validator crash on missing input, and two performance-only records omitted from the quality report's linked-record count.

The story audit adds a cross-view search defect. For the same shipped graph, the query `nim_004` selects 32 basis records through the holdings and chronicle search predicates, while the statistics input remains all 187 basis records. [records-for.js](../docs/js/data/records-for.js) omits search, [statistik.js](../docs/js/views/statistik.js) disables its search control, and [_bestand-filter.js](../docs/js/views/_bestand-filter.js) applies view-specific search. Network name search and register name search also need to be reconciled with the shared document-filter contract.

The audit found substantial implemented functionality. Folio grouping, role facets, source-date provenance, record-based statistics, register navigation, recorded-relation marks and evidence exports have executable checks. A browser smoke run observed map and network rendering, entity changes, country filtering, filter handover and reload, and data-state tooltips. A targeted browser check opened `NIM_007_5_1`, advanced from page one to page two of the Folio and observed the updated signature and URL with one detail row remaining open. These sampled paths leave the complete research tasks and human interpretation unaccepted.

| View | Current evidence | Remaining stable-version check |
|---|---|---|
| Bestand | Detail and hierarchy tests; browser-observed source paths, data state and Folio paging | Correct the exhaustive DOM verifier; test grouped row membership, search, deep links and full source-value coverage. |
| Indizes | Data and navigation tests; browser-observed register paths and data state | Verify work/part binding, variant discovery, evidence jumps and the meaning of the shared query. |
| Netzwerk | Actor/mention/projection tests; browser-observed rendering and filter handover | Human distinction of relation and co-mention, intentional exclusions, complete task routes, current performance and visual acceptance. |
| Chronik | Time-anchor and aggregation tests; browser smoke observed timeline and record jumps | Human reading of inherited dates, undated context and sparse sequences; common search and time contract. |
| Karte | Geometry/evidence tests; browser-observed rendering and filters | Tooltip corrections, keyboard evidence access, accountable unlocated/undated items and the time contract. |
| Statistik | Record-distinct aggregation tests; browser smoke observed section rendering | Shared search, evidence jumps from role rankings, readable denominators and the actual need for a further role section. |

## Research acceptance corrections

The following corrections were integrated into the task set under E-282 when the project lead authorised this plan. They make the acceptance instrument testable without adding claims the data cannot carry.

- **Task 1, appearances in a period.** Require the researcher to name the place role where recorded and identify a missing role as a recording gap. Retained undated records must be identifiable as undated context. A record date alone does not establish a dated appearance at every place it mentions.
- **Task 4, Bayreuth, 1954 and a work.** The correctly typed filter, `zeitfenster: [1954, 1954]`, returns seven records at the reviewed revision, including a review concerning Brussels. Shared document membership is the attested relation. For the stable scope, ask which persons and roles are recorded in documents mentioning the place and work within the selected document time slice, and have the researcher inspect one source to assess the connection. If the task must assert an actual performance with those participants at that place and time, occurrence modelling and source grouping become prerequisites for that task.
- **Task 9, completeness across views.** Compare persons and institutions with the network and places with map points plus the unlocated-place list. The network deliberately omits the creator of the fonds. That exception must have an accessible explanation and remain available through the person facet. The check must allow a view's declared evidence subset while accounting for every omitted item.
- **Task 10, correcting a source cell.** This is an inspection of the cataloguing reports and handover list. The acceptance instrument must explicitly include that artefact task alongside browser tasks 1–9.

Two interface contracts are resolved for implementation under E-282. First, one shared text query currently has different meanings or no effect across views. Use one shared document search; view-local entity lookup must be identifiable as local navigation and must not silently reuse that filter key. Second, direct record-place links use the record's time anchor, while located annotations retain their own dates. The map currently filters those evidence items and the network filters records. Use the common document cut and account separately for each view's eligible evidence. Preserve annotation dates as evidence provenance. Undated retention is an existing rule, not automatically a defect to remove.

The specification's statistics paragraph promises role rankings and a jump from every row, while the design limits statistics to four sections and the shared sidebar already offers role counts and filters. First test whether the existing arrangement fulfils the role story. Add a role section only if an unmet research task requires it. Missing evidence navigation from an existing stage-part or agent-role row is a concrete gap independently of that choice.

## Story coverage and acceptance

The identifiers below address each bullet by its position within an epic of [specification.md](specification.md). For example, US2.3 is the third story in Epic 2. They are stable addresses for this plan, not new requirements. Every story still awaits scholarly acceptance. “Checked” below refers to tests or code/data inspection, and the browser scope is stated separately above.

| Story | Research operation and relevant views | Evidence and remaining acceptance |
|---|---|---|
| US1.1 | Read place, role, date and record through Karte and Bestand | Paths implemented and partly browser-observed. Check a located and an unlocated place and their source cells. Distinguish an annotation's own date from the contextual record time anchor of a direct place link. Repair map tooltip defects. |
| US1.2 | Restrict place evidence by role, country and time | Facets implemented and sampled in the browser. Verify the time contract, counts, unknown country coverage and URL reproducibility. |
| US2.1 | Read a stage part with work, composer and evidence | Detail grouping checked. Compare a curated binding, a marked derivation and a multi-work record that stays unbound. |
| US2.2 | Reach a work's composer, stage parts and records from Indizes | Register and evidence paths implemented. Verify that detail and register use the same binding rule and that a missing part is read as missing recording. |
| US2.3 | Recognise separately recorded spelling variants | Separate entries retained. Demonstrate a search that makes both forms discoverable; do not introduce automatic identity or merging. Editorial variant links need supporting evidence if required. |
| US3.1 | Inspect all recorded aspects together in Bestand | Partition and source-evidence checks exist. Compare the full recorded values with detail blocks and source cells. Explain the absence of occurrence binding. |
| US3.2 | Follow a person or institution through places, works, times and records | Register hub, Karte and Netzwerk distribute this operation. Run the whole route with one preserved document cut; the network alone has no place or work nodes. |
| US3.3 | Inspect recorded contractual conditions | Finance and place data are displayed; the contracting party is sparsely recorded. Select a source-backed example and preserve unknowns. This story remains marked as a proposal in the specification. |
| US4.1 | Read and filter recorded roles with counts | Shared role tree is implemented and checked. Verify counts per distinct record, the eligible evidence of the map and the need for any additional ranking. |
| US4.2 | Inspect contract and residence evidence over time | Chronik uses the declared anchor; residence coverage is thin. Demonstrate time provenance and distinguish a recording gap from historical absence. |
| US5.1 | Inspect actors, their roles and attesting records | Network completeness and detail paths checked. Verify the intentional creator exclusion and compare roles against the record. |
| US5.2 | Distinguish a recorded relation from co-mention | Relation marks, projection edges and evidence paths are implemented and checked. A human must identify both correctly and open their separate evidence. |
| US5.3 | Explore an actor's surroundings within a time slice | Network and register routes implemented. Verify each relevant family across the appropriate views, including the treatment of undated records. |
| US6.1 | Find records by document type | Hierarchical type facets and statistics checked. Compare displayed counts and drilldown IDs against the source-backed expected set. |
| US6.2 | Combine type with work, place, person and time | Shared facet intersection checked. Repair search and URL drift; prove the same filter state and evidence set across navigation and reload. |
| US7.1 | Return from a finding to record and source cell | Many individual paths checked. Exercise aggregate or graph edge → all attesting records → their data points and source cells. Existing non-interactive rankings need an evidence route; an aggregate has a set of sources. |
| US7.2 | Recognise and follow Wikidata identity | Marks and links implemented. Check all four entity families, matched and unmatched cases; identity correctness remains a curation responsibility. |
| US7.3 | Read coverage and data state | Data-state tooltips observed in the browser. Verify the denominator and explain the linked-record basis and each view's eligible subset. |
| US7.4 | Collect and export evidence across views | Export builders checked. Repair stored-ID migration and test actual downloads, reload, membership and source evidence in all four formats. |

## Implementation work and completion evidence

### Preserve input and output data

Files are [reconcile.py](../scripts/reconcile.py), [validate.py](../scripts/validate.py), [transform.py](../scripts/transform.py), [build-views.py](../scripts/build-views.py), [backup.py](../scripts/backup.py), [export-wikidata-csv.py](../scripts/export-wikidata-csv.py) and the shared pipeline helpers.

For a standard transformation require the object table, the link table and all four index workbooks for persons, organisations, places and works, using the existing CSV/XLSX fallback rules for objects and links. A deliberately reduced run needs an explicit mode and must not silently replace the full published dataset. Missing object input must exit with an input diagnostic without dereferencing `None`. Retain previous reconciliation entries until replacement is successful. Separate transient request failures from unmatched results and keep them eligible for retry. Apply the common approval policy to authority lookups, including the rule that a `fuzzy_low` match requires `manual_review: approved`. Write central JSON artefacts through a temporary file and atomic replacement. Complete and verify a replacement backup before retiring the old snapshot.

Completion evidence is an isolated failure-path test for missing input, request failure, interrupted write and failed backup replacement. Existing authority results and publishable output remain intact in every failed run. A successful isolated transformation remains deterministic and publishes the intended dataset only.

### Establish one document-filter contract

Files are [records-for.js](../docs/js/data/records-for.js), [filter-state.js](../docs/js/ui/filter-state.js), [router.js](../docs/js/ui/router.js), the search consumers and their tests. Resolve the search and time contracts above before changing their semantics. Apply an explicit URL filter atomically; preserve the documented queryless navigation behaviour. Distinguish the document cut from entity lookup, selection, highlighting and the eligible evidence of a particular view.

Completion evidence compares record ID sets for a small collection of source-backed cuts across all six views, including search, combined facets, empty results and undated evidence. Grouped Folio rows and aggregate bars must be compared through the records they represent, not by DOM row counts. Reload and direct links produce the same state. A local view selection cannot silently expand the document cut.

### Correct view evidence and navigation

Repair the map's HTML insertion and empty-window fallback. Give the map's essential interactions an accessible keyboard equivalent consistent with the existing one-tab-stop rule for drawings. Verify the one stage-part/work-binding rule across record detail and registers. Provide evidence navigation from the stage-part and agent-role rankings that currently stop at a static label. Make declared exclusions and derived bindings understandable through the existing tooltip and accessible-label system.

Completion evidence is a browser check of hostile text rendered as text, zero-evidence tooltips, keyboard selection and return, and each new evidence path. The research tasks test the interpretation of relationships, roles and dates separately. Network rendering, geometry, projection export and interaction measurements must use the current drawing contract. Report measured performance against [testing.md](testing.md) § Boundaries and visual criteria in [design.md](design.md) § Views on a named environment; do not infer a universal result from one run.

### Preserve the collected research result

Files are [basket.js](../docs/js/ui/basket.js), [korb.js](../docs/js/views/korb.js) and export tests. Validate stored arrays and IDs, migrate the legacy namespace and remove unavailable records from the effective selection. Test the actual CSV, BibTeX, JSON-LD and GEXF download paths in addition to their builders. For the separate network GEXF export, verify exactly which projection and active cut it represents.

Completion evidence is a collected selection surviving reload with the same resolved records. Every downloaded file is parseable in its format and preserves the promised source references. CSV quoting, Unicode, file names and empty selections are exercised through the browser. Unknown records cannot leave a positive count with empty cards and exports.

### Align quality reporting with the model

Files are [report-quality.py](../scripts/report-quality.py), [report-cataloguing.py](../scripts/report-cataloguing.py) and shared helpers. Define the common meaning of a real catalogued record and a record carrying links; include performance evidence and exclude derived container records where the report measures source cataloguing. Keep genuinely different frontend and reporting denominators explicit rather than forcing all counts to one number.

Completion evidence covers the performance-only examples and derived Folio containers against the current graph. Every source row is either represented with provenance or accounted for in diagnostics. Review the known missing-object and unmodelled-link findings for their effect on each research task. A known data-mirror failure is admissible only with a named source finding, a stated impact and an accepted limit; marking the entire data-quality layer “expected red” is insufficient for release.

### Make the verification run trustworthy

Repair the generated-report exception, the obsolete holdings expectation and selectors, the work-location fixture assumption and the network stamp contract. Compare the holdings DOM after deliberate expansion and paging with the current display contract. Separate actual source defects from rendering defects. Make exceptions and unexpected console errors fail the release browser checks; a warning cannot establish that a required interaction passed.

The release verification runs Python invariants, Node tests, isolated determinism and the required browser suite on the same revision and data state. The browser suite is required for that run even if it remains an optional local dependency. Test from a clean checkout without generated reports. Keep data-mirror findings separate and review their impact as above. A small number of complete research paths is more valuable than additional tests that only restate implementation details.

### Secure static delivery and usable presentation

Keep D3 and required fonts available locally or use the existing system-font fallback, preserving the no-build architecture. Verify the six views with external runtime requests blocked. Check the existing sidebar-height criterion, a narrower viewport, keyboard focus, tooltip reachability and empty/error states. The observed data-state date currently lives in a hover tooltip; expose it to keyboard and screen-reader users as well. Revisit network aesthetics against the recorded F2 findings using the actual data, rather than interpreting a passing geometry test as visual acceptance.

Completion evidence is a functioning local static delivery without a runtime CDN, legible view controls and data-state information, and no inaccessible essential finding-to-record route. Hosting publication is a separate action after verification and acceptance.

### Consolidate the maintained knowledge

Update the factual state in [specification.md](specification.md), [architecture.md](architecture.md), [design.md](design.md), [testing.md](testing.md) and the date-precedence passage in [data.md](data.md). Resolve the task-set contradictions explicitly in [research-framework.md](research-framework.md). Reduce [handoff.md](handoff.md) to unresolved received points after their integration; implementation presence and missing acceptance must be recorded separately.

The reviewed revision has no production consumer for `KOMPONISTEN_NAMEN` in [constants.js](../docs/js/data/constants.js), `isTouched` and `applyViewDefault` in [filter-state.js](../docs/js/ui/filter-state.js), or `makeSyncGuard` and `yearRangeToZeitfenster` in [filter-sync.js](../docs/js/ui/filter-sync.js). Repository-wide reference searches found only definitions, comments and tests. Confirm that this remains true at the implementation revision, then remove the unused mechanism together with its obsolete tests and comments. Investigate the old mobility-role fallback before deleting it. Consolidate superseded session plans and intermediate audits only after their lasting decisions and evidence have an existing canonical destination. Preserve source diffs, manual-reconciliation provenance and decision identifiers. Keep source description and formal model documentation separate.

Completion evidence is a reviewable content diff, preserved reference targets and passing document-integrity checks. No new archive or parallel acceptance document is required. Results belong in their owning document and one concise journal entry.

## Integration and agent use

Resolve the acceptance and shared-filter contracts first, because their meaning determines correct tests and view changes. Pipeline data preservation can proceed independently of frontend work. Integrate changes to shared state, loader and vocabulary through one owner, then run the dependent view checks on the same integrated revision. Repair verification contracts alongside the corresponding change so that later work has a reliable result.

Use three bounded Sol-5.6 review assignments for Bestand/Indizes, Chronik/Statistik and Netzwerk/Karte. Each must cite code or source evidence, identify the interaction actually executed and retain untested cases as open. Their comparisons are inputs to central verification. The review already demonstrated why this matters: an object-shaped time filter was ignored by the code and produced a wrong apparent result count, while the correct array-shaped filter yielded the real task sample.

During implementation, parallelise only disjoint file sets. Shared filter changes should not be edited concurrently by several view agents. After integration, ask a reviewer who did not implement the change to repeat the affected research path. More agents are useful when a concrete independent question remains; six permanent view owners are unnecessary for this scope.

## Release evidence still required

For each of tasks 1–9 record the source-backed expected result, the actual browser route, the resulting record IDs and whether the researcher reached the exact evidence without assistance. For task 10 record the report finding and the source cell to correct. Include an ambiguous, undated or unlocated case where that is relevant to the task. Keep failed interpretation, missing data, unimplemented behaviour and unexecuted checks distinct.

The project lead authorised the document-centred scope and task clarifications through the instruction to implement this plan. The observed research-task results still require project-lead and partner acceptance. Scholarly validation of authority matches, disputed source values and ambiguous stage-part bindings remains with the responsible researchers and cataloguing team.

No version is released by this planning pass. Completion of the implementation work establishes a technically reviewable candidate; the human task runs establish acceptance under the existing 0.9 and 1.0 definitions.

## Related

- [specification.md](specification.md) for the authoritative stories and version definitions.
- [research-framework.md](research-framework.md) for the research questions, personas and task set.
- [testing.md](testing.md) for test responsibilities and their current boundaries.
- [handoff.md](handoff.md) for inherited assignments and unresolved external inputs.
- [journal.md](journal.md) for decisions and the record of this planning pass.
