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

The project lead authorised implementation of the reviewed stabilisation plan on 2026-09-06, one commit per completed milestone, independent follow-up reviews and consolidation of maintained knowledge into `knowledge/`. The subsequent instruction adds a project-wide test review before completion. This document records execution and evidence. [specification.md](specification.md) owns requirements and version definitions; [research-framework.md](research-framework.md) owns the research questions and evaluation tasks.

The pilot investigates mobility and knowledge production through the partial fonds. Its research tool must preserve the chain from a recorded statement through the document and its views into a citable export. The stable scope is document-centred, with six analytical views and the Korb. Historical interpretation belongs to the researchers. Co-mention of a place, work and person cannot establish a common performance. Occurrence modelling remains a separate decided development that requires grouped source evidence.

E-282 anchors the shared document search and record-time cut. Annotation dates remain visible as provenance; undated records remain identifiable context. Explicit filter URLs replace the previous cut, while queryless navigation preserves it. The map and network declare the evidence they can display within that cut. Task 10 uses cataloguing artefacts; tasks 1–9 use the application. Version 0.9 requires project-lead acceptance of the task results, and 1.0 requires partner acceptance. Agents can establish technical evidence and prepare those runs.

## Milestones and commit boundaries

| Milestone | Completion criterion | State |
|---|---|---|
| M1 Research scope | Source-aware tasks and common search/time contract | Complete, `1218a10` |
| M2 Reliable data processing | Preservation under failure, accurate reports and deterministic output | Complete, `12383e4` |
| M3 Consistent and usable views | Common filters, accessible evidence and local static assets | Complete, `8f94728`; narrow network follow-up in M4 |
| M4 Complete research paths | All stories mapped to checks or material limits; actual evidence exports and visual follow-up | Complete; source and performance limits recorded below |
| M4T Trustworthy tests | Independent audit of the whole test suite; correct assertions, meaningful missing coverage and warranted simplification | Active; added by project lead |
| M5 Knowledge and integrated verification | Maintained knowledge consolidated; complete technical checks from one clean snapshot | Active |
| M6 Scholarly acceptance | Project lead accepts task results for 0.9; partners accept them for 1.0 | Awaiting human task runs |

Each completed milestone receives one commit and a follow-up review of the achieved goal, implementation and knowledge. Publication and source editing are separate actions. No release or scholarly acceptance follows automatically from a passing suite.

## Completed implementation and follow-up review

M1 resolved the scope and task contradictions and retained all 19 stories. The version definitions were preserved. No historical result or model extension was inferred.

M2 requires the object table, links and all four nonempty index inputs. Missing input fails explicitly. Reconciliation preserves prior results until replacement succeeds and retries transient failures, including previously cached failures. Low-confidence fuzzy exports require manual approval. Atomic file replacement and verified backup staging prevent incomplete output from replacing valid data. Quality reports count performance links and exclude derived Folio containers from source-cataloguing totals. Independent review found four further failure paths and closed them before commit. Preservation checks and isolated determinism passed. Small shared file helpers were sufficient; the flat pipeline remains.

M3 introduced shared search including linked entity names, atomic filter links and consistent document cuts in every view. Work/part ambiguity remains explicit. Role rankings expose every counted record. Map tooltips escape untrusted values, keyboard focus is visible, undated context is labelled, and its main count names the common cut. Grouped dates expose their individual source cells by keyboard. Stored basket IDs are validated, migrated and reconciled with loaded records. D3 and the existing fonts are shipped locally with licences, upstream URLs and checksums. Unused filter/search helpers and composer constants were removed with their obsolete tests.

The M3 checks passed 678 Node cases, the browser smoke, map and real basket download paths. The exhaustive holdings verifier opened all 187 basis records and 51 Folio pages, covering all expected source-cell combinations for 152 records with link-cell provenance. It distinguishes a missing source object from a rendering omission. The source dates of grouped season entries are inspected in their individual date tooltips. A later screenshot review exposed a blank narrow network despite its controls rendering; M4 treats that as a real follow-up finding rather than extending M3's success claim.

M4 closed the narrow network regression with a minimum board height. Independent measurement at 800 × 900 found every one of 947 node centres within the 760 × 529 plot; the new browser assertion checks every node's dimensions, visibility, opacity and containment. Root reran all four research-path browser checks and 33 network checks successfully. The literal seven-record T4 canary verifies rendered holdings, Folio grouping, filter navigation and an opened source pill. Real GEXF downloads match both network modes. All 19 stories now have technical evidence or a named source/model limit.

Network measurements on local Windows Chromium at 1366 × 900 used 947 nodes (760 actors and 187 records) and 1,568 mention edges. First draw after data readiness took 109 ms, with layout about 67 ms and painting 35 ms. Hover handlers took 0.6–2.8 ms and warm selection handlers 2–3 ms. The first selection took 22–27 ms synchronously and 35–41 ms to the next frame. The cold-click one-frame target remains unmet in this environment. A simple class-update experiment produced no reliable improvement and was removed; no scheduling redesign is included in this increment.

Screenshots show the complete drawing area, distinct document squares and actor circles, irregular connected components and visible relation rings. Central label density remains high with some overlap. The overview screenshot alone cannot establish the readability of the second neighbourhood step; its structural classes and evidence routes are tested. These observations prepare human visual acceptance and preserve the performance limitation explicitly.

## Story coverage and acceptance

The story identifiers address bullets within each epic of [specification.md](specification.md). Every story still requires scholarly acceptance. Automated checks establish the stated technical behaviour; the source samples below prepare human interpretation.

| Story | Research operation | Technical evidence and material limit |
|---|---|---|
| US1.1 | Read place, role, date and record | Map evidence/geometry tests, actual keyboard record jump, exhaustive record provenance. Source-backed sample T1. Location and date describe their recorded context. |
| US1.2 | Restrict places by role, country and time | Shared facet and map-cut checks include empty and undated cases; unlocated places remain listed. Samples T2–T3. Missing coordinates limit drawing, and missing evidence limits historical completeness. |
| US2.1 | Read stage part, work, composer and evidence | Grouping tests cover curated binding, marked single-work derivation and ambiguous multi-work records. T6 supplies both real-data cases. |
| US2.2 | Reach a work's composer, parts and records | Register tests cover the common binding rule, document counts and evidence links; browser checks operate register rows and jumps. Absent recording remains absent. |
| US2.3 | Discover recorded spelling variants | Register search and facet-inventory tests retain separate entries. No automatic identity merge occurs. Editorial identity remains a curation task. |
| US3.1 | Inspect recorded aspects together | Record partition and source tests plus exhaustive browser detail verification. Multiple aspects remain co-mentioned until occurrence binding exists. |
| US3.2 | Follow an actor through places, works and time | Register hubs and shared-filter tests cover transfer to appropriate views. Network nodes represent actors and documents; map points represent places. T4 and T9 prepare the combined reading. |
| US3.3 | Inspect contractual conditions | Finance/model tests and contract sample NIM_023 5. Contracting-party and status recording is sparse; the story remains a proposal in the specification. |
| US4.1 | Read roles and their counts | Distinct-record aggregation and facet tests, complete ranking drilldowns. Repeated mentions do not inflate record counts. Existing statistics sections support this operation. |
| US4.2 | Inspect contract/residence evidence over time | Chronicle anchor/role tests and dated source examples T1/T8. Residence evidence is sparse; absence of a point cannot establish historical absence. |
| US5.1 | Inspect actors, roles and evidence | Network completeness tests against shipped records and T9. Creator exclusion is explained and the person facet remains available. |
| US5.2 | Distinguish relation from co-mention | Relation marks, graph evidence and separate projection tests. T5 identifies a source-backed comparison; successful human distinction is still unobserved. |
| US5.3 | Explore an actor's surroundings over time | Neighbourhood and shared-cut tests retain undated context. Visual inspection and interaction measurement are recorded separately below. |
| US6.1 | Find records by document type | Hierarchical facet and statistics tests compare distinct record sets. Browser smoke covers type filtering and source navigation. |
| US6.2 | Combine type, work, place, person and time | Intersection tests and browser navigation/reload checks cover shared search and explicit URL replacement. T4 documents a seven-record sample and its interpretive limit. |
| US7.1 | Return to record and source cell | Exhaustive holdings verification, Folio paging, grouped date keyboard access and ranking evidence lists. Aggregate evidence is a set of source-bearing records. |
| US7.2 | Follow Wikidata identity | Loader/register tests cover identity attachment and missing matches; browser register checks inspect links. Historical identity correctness requires curation. |
| US7.3 | Read coverage and data state | Six-view browser test checks the common count and accessible data-state label. Map eligibility is reported separately. Unlinked archival records lie outside the application basis. |
| US7.4 | Collect and export evidence | Basket migration/reconciliation and all four format builders; actual CSV, BibTeX, JSON-LD and GEXF downloads preserve source evidence. Separate network downloads are checked in both projections. |

## Source-backed task samples

These are agent-checked examples from the versioned data of 2026-09-06. Record identifiers below omit the common `m3gim-data:` prefix. They prepare tasks 1–10 in [research-framework.md](research-framework.md). Browser mechanisms have the coverage stated above. A researcher completing every task without help, interpreting its result and accepting the source limits remains unobserved.

| Task | Expected evidence | Interpretation to check in the human run |
|---|---|---|
| T1 | `NIM_023_5`, Wuppertal with performance-place role, Box 2 row 134; object row 257 dates the record 1953-04-26 | Read the place role and distinguish the record date from a bound performance date. |
| T2 | `NIM_004_24`, guest-performance evidence for Bayreuth, Box 1 row 577, and Salzburg, row 578; `NIM_007_4`, Lisbon, row 2982 | Follow a place-role finding to its exact source and respect mixed mentions within a document. |
| T3 | The lowest country counts tie at one record for Poland (`NIM_005_15`, Warsaw, Box 1 row 903), Denmark (`NIM_005_25`, Copenhagen, row 2485) and Serbia (`NIM_073_33_1_3`, Belgrade, Box 4 row 341) | Interpret counts as the selected evidence, including tied values and coverage. |
| T4 | Bayreuth, Tristan und Isolde and `zeitfenster: [1954, 1954]` yield `NIM_004_18`, `NIM_005_17`, `NIM_011_3`, `NIM_011_5`, `NIM_011_6`, `NIM_142_22_4`, `NIM_142_27` | The set includes a Brussels review. Read persons and roles as statements in those documents and inspect their source connection. |
| T5 | Recorded correspondence in `NIM_016_13`, Malaniuk–Rüger, Box 2 row 331, appears as a relation mark at visible Rüger. Fues (row 129) and Mahler (row 138) in `NIM_023_5` are visible co-mentioned actors without that recorded relation | Distinguish a relation mark from shared-document edges and account for creator exclusion. |
| T6 | `NIM_022_1_1` names Meistersinger, Tristan and Rheingold in Box 2 rows 22–24; its three stage parts remain unbound. `NIM_139_104` has one Tristan work statement, Box 6 row 17, with nine performer/part statements | Identify source ambiguity and the explicitly marked single-work derivation. |
| T7 | `NIM_007_5_1` advances from page one to page two; the signature and URL change and one detail stays open | Verify that the displayed page and its evidence remain citable. All 51 Folio pages were opened by the verifier. |
| T8 | `NIM_007_11` has own date 1968-11-18 at object row 135 and content anchor 1959-09-05 from performance/rehearsal at Box 1 rows 3081/3087 | Read the anchor's origin instead of treating it as the document's own date. |
| T9 | `NIM_023_5` carries Malaniuk as contracting party (Box 2 row 128), Fues as conductor (129), Mahler as composer (138), Herminghaus as signatory (140), institutions (135/136), Wuppertal (134) and Das Lied von der Erde (137) | Compare the appropriate view subsets, including the creator exception and places with/without coordinates. |
| T10 | Object-table row 725 has Folio `11_62` but no archival signature; its intended record is absent from the graph | Reach the source finding through the cataloguing artefacts and identify the cell requiring editorial correction. |

## Test review and integrated verification

M4T reviews the whole suite with disjoint Sol-5.6 assignments for Python/pipeline and frontend tests. Correct wrong or vacuous assertions, explicit required-fixture handling, test-only duplicated logic and stale generated-file dependencies. Prefer behaviour checks and source-backed examples. Share expensive setup where isolation remains intact. Add tests only for meaningful missing guarantees, and preserve the distinction between implementation invariants and the data mirror. No blanket test renaming, framework change or numeric coverage target is required.

The clean candidate run must include Python invariants with isolated determinism, all Node tests and the browser suite. Playwright is mandatory for this verification even though local browserless runs may skip it. Browser console errors, execution exceptions and smoke warnings fail the gate. A successful DOM-presence assertion cannot substitute for visible drawing or an operable control. Network downloads are compared against the selected projection and record cut; user controls are exercised by visible clicks.

Network follow-up retains the former F2 criteria in [testing.md](testing.md) § Boundaries and [design.md](design.md) § Views. First draw, hover and selection measurements name environment and graph size. Visual review covers lattice avoidance, record-node size, relation marks, second-step neighbourhood, central labels and drawing-area use. Root integration rechecks substantive agent findings against actual files and executed checks.

M5 will record the clean snapshot, commands and observed results here after completion. Source-data failures remain separately visible and require an impact decision for release.

## Source and model limits requiring acceptance

The separate Python data mirror currently reports seven failing checks. They identify 400 link rows without matching records, object row 725 without a signature, 26 marked-as-worked records without links, invalid role/type values, named links without a type, and 32 links without a model mapping. The last group comprises 26 document links and six activity links. The browser source comparison also reports the missing object. These are source/model findings; the implementation work has not changed the historical recording.

Missing records and links limit completeness for tasks 1–6, 8 and 9. Invalid or missing roles/types constrain role, contract and document-type interpretation. Unmodelled activities include engagements and a radio recording in Box 2, so the current graph cannot be treated as a complete appearance history. The maintained [data.md](data.md) and the [source handover list](../data/reports/source-errors-handover-2026-09-01.md) own these findings. Acceptance must name the admitted limits or require source correction; a blanket “expected red” label is insufficient.

Further limits remain the ambiguous work/part binding, sparse residence and contracting-party evidence, source dating qualifiers, unresolved identities and incomplete location coverage. The decided occurrence model, editorial identity decisions and partner-side recording changes remain outside this stabilisation increment. [specification.md](specification.md) § Open decisions is the single address for those decisions.

## Knowledge consolidation

Maintained knowledge belongs in `knowledge/`, including the German partner recording guide. Root README and CLAUDE files remain entry and action documents. Pipeline usage is consolidated into the root command entry and [architecture.md](architecture.md); the duplicate scripts README and superseded process reports are removed after preserving their durable content. No new archive or parallel acceptance document is created.

Source diffs, manual-reconciliation provenance, decision identifiers, migration evidence and dated source analyses remain beside their data. They document a particular input or curation act. Current specifications, test boundaries and open decisions live in the maintained knowledge base. [handoff.md](handoff.md) retains only the unresolved external Vault handover; the Vault remains read-only from this repository session.

## Remaining acceptance

After technical verification, the project lead runs tasks 1–10 with the recorded examples and current data state, records interpretation failures or accepted limits, and decides version 0.9. Partner acceptance establishes 1.0 under the existing definition. Publication, archiving and external communication do not follow from a local commit.
