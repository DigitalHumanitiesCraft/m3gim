---
title: Implementation Plan
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: active
language: en
created: 2026-09-06
updated: 2026-09-07
authors: [Christopher Pollin]
generated-with: Codex
method:
  name: Promptotyping
related: [INDEX, specification, research-framework, data, data-model, architecture, design, testing, handoff, journal]
---

# Implementation Plan

## Current state and next action

The Chronik now combines source/entity lanes with natural calendar groups, compressed empty stretches and explicitly editorial biographical context bands (M6i). This implements the project lead's follow-up after rejecting the long empty scroll distances and dense point strip of M6h. The shared Chronik/Netzwerk selection component and upper-right legend remain. Technical verification is recorded below; guided acceptance of the revised presentation remains pending. Version 0.9 has not been accepted.

**Next executable step:** inspect the revised Chronik with the project lead: named lanes in a dense group, compressed gaps, the meaning of editorial phases, original datings and source-specific evidence. Register search unification, register details and the institution-chip fix remain separate open work.

Sol 5.6 is the project lead's explicitly accepted subagent model for this work. The user authorised integration of the map discussion into the plan, without approving a final design or production replacement.

## Open follow-up work

| Work | Observed problem or proposed result | Completion evidence |
|---|---|---|
| Institution navigation | Shared chips route institutions through the person facet; Nordwestdeutscher Rundfunk yields an empty result | Correct facet and source-backed documents through mouse and keyboard activation |
| Register entry and row | First Indizes click opens Personen; work, unlabelled composer, document action and two icons crowd the row | Proposed first-click register menu; work and labelled composer left, document and view actions right; user can explain each action |
| Register detail | The stage-part remainder does not expand; neighbouring names leave their relation to the work unclear | Expandable remainder lists; separate work properties from document co-mentions; preserve derived and ambiguous part bindings |
| Action visibility | Static stage-part, dating and finance chips resemble actionable entity chips | Consistent selectable text, filters, navigation and external links without inventing new role/date filters |
| Map geometry | Legend moved to the upper right under M6g; pies still overlap and obscure labels | Evaluate placement with the map proposal below |
| Guided acceptance | Recent fixes need user retesting; remaining research paths have not been accepted | Record successful navigation, interpretation and remaining failures separately |

## Map proposal for evaluation

**Draft, not implemented.** Explore a map of attested stations with a linked timeline for a selected person or work and period. Places would have fixed geographic positions. Selecting a station or connection would expose dates, roles and attesting documents. Reuse the network's selection, highlighting and evidence-panel interaction where it helps. Its actor/document graph cannot be projected directly onto the map because actors and records do not each have one justified coordinate.

A line must identify its evidence meaning:

- An explicitly recorded departure and destination may support a directed travel connection when both belong to the same journey and actor.
- Two attested, dated stations may form a chronological sequence. The link does not establish the intervening route or exclude unrecorded stops.
- Dispatch and reception may support correspondence when the source links the endpoints. A letter's movement does not establish the singer's movement.
- Places named in one document establish document co-mention, distinct from travel and a bound appearance.

First inspect one source-backed person/period sample and determine which lines can be justified before drawing them. Use the relevant annotation dates and preserve uncertainty, ranges, undated evidence and contradictions. A document's creation date is not an automatic date of presence. If the sample does not support connections, show separate attested stations. Missing coordinates remain visible. The work-centred variant needs the same check; a work and place in one record do not establish a performance there.

The 2026-09-06 read-only measurement used the shipped JSON-LD through `loadArchive()` and `buildOccurrences()`: 776 deduplicated map evidence entries from 144 records, 101 raw place names, 93 names after `cityOf()` grouping, 61 grouped names with coordinates, and 365 entries with a nonempty date. These describe the extraction, not a verified count of visited cities or journeys. There are 282 contract-place entries and 113 mentions. Recompute after a data change. The decided occurrence bundling model remains a separate, unimplemented development.

Compare the draft and current map on the same sample. The reader must understand every line, reach its evidence, distinguish chronology from travel, identify missing locations and operate it by keyboard. This evaluation decides between a replacement, a connection mode or a station-only view. No map, data or vocabulary implementation is part of the session close.

## Guided user walkthrough

| Path | User observation | Remaining check |
|---|---|---|
| Bestand, `NIM_023_5` (T1/T9) | Found quickly through the convolute; participants and Wuppertal's performance-place role were readable | Cross-view interpretation; distinguish record date 26 April 1953, rehearsal 3 April and performance 4 April; the spoken rehearsal date was corrected against the screenshot |
| Folio paging (T7), `NIM_007_5` | Control found, content change observed, page 4 reopened from its URL | This exact paging/address path is user-confirmed; retest the subsequently added individual title |
| Bestand fixes M6a–M6e | Tooltip, title selection and scroll defects were reported and fixes implemented | Targeted visual retest of the single tooltip, copying, stable opening and responsive detail head |
| Werkregister (US2.2), Tristan und Isolde | Work and document evidence reached; composer recognised on the second look; actions, relations and hidden roles confused | Re-evaluate after register improvements; successful navigation is partial acceptance evidence |
| Karte (T1/US1.1) | Screenshots show selected Wuppertal, legend and overlap problems; user proposes a mobility view | Document jump and place-role interpretation are not confirmed; evaluate the map draft on explicit evidence |
| Chronik and register follow-up, 2026-09-07 | Chronik title, totals and introductory explanation removed as requested. Seven existing Chronik browser cases passed; actual Chronik/Register/Bestand/Statistik rendering compared. The project lead questions the second register search and proposes reusing the network detail panel. | Chronik right panel implemented under M6g. One search appropriate to the active view and the register detail panel remain proposals |
| Remaining views | Chronik, Netzwerk, Statistik, other registers and Korb/exports lack complete guided acceptance | Continue task examples below, including shared filters, document/event dates and actual downloads |

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
| M4 Complete research paths | All stories mapped to checks or material limits; actual evidence exports and visual follow-up | Complete, `e8ef22b`; source and performance limits recorded below |
| M4T Trustworthy tests | Independent audit of the whole test suite; correct assertions, meaningful missing coverage and warranted simplification | Complete, `ee28ced`; independent audits and integrated checks |
| M5 Knowledge and integrated verification | Maintained knowledge consolidated; complete technical checks from one clean snapshot | Complete, `e6e10a0`; clean snapshot and independent content review |
| M5a Network interaction follow-up | Reduce the first selection cost with unchanged graph, evidence and keyboard behaviour; measure and independently review | Complete, `32bf5e1`; independent comparison and interaction checks |
| M5b Source diagnostics follow-up | Regular validation reports exact Folio misses, impossible complete dates and rows dropped for missing content | Complete, `b2b6ffd`; source data and transformed graph remain unchanged |
| M5c Evidence-path follow-up | Complete statistics evidence navigation and rehearse the task set against the recorded scope | Complete, `709912c`; independently reviewed and verified from a clean snapshot |
| M5d Narrow network and knowledge follow-up | Keep the selected graph readable and its detail keyboard-reachable; reconcile stale open-model claims with the implemented behaviour | Complete, `a716f23`; independently reviewed and verified from a clean snapshot, including test-environment follow-up |
| M5e Report and source-check corrections | Remove obsolete report instructions, diagnose object timestamps before cleanup, share status normalisation and repair document references | Complete, `36c8c58`; independently reviewed, 154 focused checks passed from a clean snapshot |
| M5f Remove unused code and align tests | Retire obsolete JS/CSS and test helpers, preserve meaningful checks against production paths and name all basket exports | Implemented, `54b40be`; acceptance status above |
| M6a First guided Bestand feedback | Correct reported tooltip fragmentation, title selection and detail alignment | Implemented, `c6c0530`; acceptance status above |
| M6b Remove source-debugging labels | Remove technical sheet/row displays while preserving content, record navigation and export provenance | Implemented, `28f0865`; acceptance status above |
| M6c Stable row position and document addresses | Preserve the activated row's reading position and keep the URL aligned with the open record | Implemented, `967b7d6`; acceptance status above |
| M6d Direct-link arrival | Place the addressed title below the sticky heads, including short filtered lists and tall screens | Implemented, `0830498`; acceptance status above |
| M6e Individual document titles | Display full signature and title with a separate responsive metadata group; preserve paging and direct links | Implemented, `9b2d1da`; acceptance status above |
| M6f Chronik lanes | Source-aware vertical chronology, actual corpus, dense groups and existing sidebar | Implemented locally; technical verification and guided acceptance below |
| M6g Stable Chronik details | Right detail column, complete side lists, fixed upper-right legends and open Verknüpfung section | Implemented; geometry and selection shell superseded by M6h |
| M6h Continuous time and shared selection | Scaled uninterrupted axis, proportional ranges, density groups and shared Chronik/Netzwerk detail component | Historical checkpoint; geometry superseded by M6i after user feedback |
| M6i Calendar lanes and editorial context | Named lanes, natural calendar groups, compressed gaps, source-linked biographical bands and stable shared details | Implemented; verification below, guided acceptance pending |
| M6 Scholarly acceptance | Project lead accepts task results for 0.9; partners accept them for 1.0 | Bestand, Werkregister and Karte partly observed; overall acceptance pending |

Each completed milestone receives one commit and a follow-up review of the achieved goal, implementation and knowledge. Publication and source editing are separate actions. No release or scholarly acceptance follows automatically from a passing suite.

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
| US4.2 | Inspect contract/residence evidence over time | Chronicle statement/context tests, dated source examples T1/T8 and dense-group browser checks. Residence evidence is sparse; absence of a point cannot establish historical absence. |
| US5.1 | Inspect actors, roles and evidence | Network completeness tests against shipped records and T9. Creator exclusion is explained and the person facet remains available. |
| US5.2 | Distinguish relation from co-mention | Relation marks, graph evidence and separate projection tests. T5 identifies a source-backed comparison; successful human distinction is still unobserved. |
| US5.3 | Explore an actor's surroundings over time | Neighbourhood and shared-cut tests retain undated context. Visual inspection and interaction measurement are recorded separately below. |
| US6.1 | Find records by document type | Hierarchical facet and statistics tests compare distinct record sets. Browser smoke covers type filtering and source navigation. |
| US6.2 | Combine type, work, place, person and time | Intersection tests and browser navigation/reload checks cover shared search and explicit URL replacement. T4 documents a seven-record sample and its interpretive limit. |
| US7.1 | Return to the attesting record | Exhaustive holdings verification, Folio paging and ranking evidence lists. Aggregate evidence is a set of source-bearing records. Source-cell provenance remains in data and exports; its debugging labels are removed from the interface under E-285. |
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
| T5 | `NIM_016_13` names Malaniuk as addressee at Box 2 row 330 and Rüger as author at row 331, which also carries their recorded correspondence relation. The record detail exposes both persons, the relation and its source; the network marks visible Rüger | Distinguish the explicitly recorded relation from the co-mention of these same persons in the document, and account for creator exclusion in the network. |
| T6 | `NIM_022_1_1` names Meistersinger, Tristan and Rheingold in Box 2 rows 22–24; its three stage parts remain unbound. `NIM_139_104` has one Tristan work statement, Box 6 row 17, with nine performer/part statements | Identify source ambiguity and the explicitly marked single-work derivation. |
| T7 | `NIM_007_5_1` advances from page one to page two; the signature and URL change and one detail stays open | Verify that the displayed page and its evidence remain citable. All 51 Folio pages were opened by the verifier. |
| T8 | `NIM_007_11` has own date 1968-11-18 at object row 135 and content anchor 1959-09-05 from performance/rehearsal at Box 1 rows 3081/3087 | Read the separate 1959 statement groups and 1968 document group, including the explicitly attested Zürich context. |
| T9 | `NIM_023_5` carries Malaniuk as contracting party (Box 2 row 128), Fues as conductor (129), Mahler as composer (138), Herminghaus as signatory (140), institutions (135/136), Wuppertal (134) and Das Lied von der Erde (137) | Compare the appropriate view subsets, including the creator exception and places with/without coordinates. |
| T10 | Object-table row 725 has Folio `11_62` but no archival signature; its intended record is absent from the graph | Reach the source finding through the cataloguing artefacts and identify the cell requiring editorial correction. |

## Verification checkpoints

[testing.md](testing.md) owns test responsibilities and commands. Historical execution narratives remain in Git and [journal.md](journal.md).

| Checkpoint | Evidence and limit |
|---|---|
| Last full integrated baseline, M5f | Fresh tree `8e4b32ddffd90eabac094512dfed06aea839f227` passed 675 Node and 597 Python/browser checks, including isolated determinism and real exports; four strict source-fix xfails, no skips, eight source findings |
| Network selection, M5a | Five alternating Chromium 145 comparisons at 1366 × 900 with 947 nodes reduced median synchronous selection from 22.6 to 3.1 ms; next-frame time from 36.7 to 16.4 ms, unchanged detail; local measurement |
| Source-label removal, M6b | Verifier opened 187 records and 51 Folio pages, checked 4,899 role/value chips and 25 grouped dates; four actual export checks preserved provenance |
| Direct arrival, M6d | Six filtered/unfiltered cases at 800 × 900, 1366 × 800 and 2048 × 1111 aligned the target below sticky heads; manual scroll and title-copy checks remained green |
| Calendar lanes and editorial context, M6i | 687 Node checks, 19 targeted Chronik/Netzwerk browser cases and seven knowledge-integrity checks passed. Standalone smoke against the local application: 37 OK, no warnings or failures. Tests cover natural calendar groups, compressed century gaps, original 1924/1925 dating, complete dense-day lists, source-linked entity highlighting, stable selection, and horizontal/vertical lane bounds at 390, 800 and 1366 pixels. Root inspected actual desktop, detail and mobile screenshots and reloaded the revised view in the user's in-app browser. Independent reviews checked date/source semantics, navigation, editorial provenance and knowledge consistency; identified dating, navigation and clipped-band labelling issues were corrected. Source tables, generated datasets and vocabulary are unchanged. This establishes the targeted technical scope; guided visual and scholarly acceptance remain open. |
| Continuous Chronik and shared selection, M6h | 678 Node checks, 14 targeted Chronik/Netzwerk browser cases and seven knowledge-integrity checks passed. Standalone smoke: 37 OK, no warnings or failures. Real-data browser cases cover dated statements, proportional ranges, four scales, the dense 26 July 1953 group (46 persons, six sources, 26 parts), evidence/back navigation, undated access, selection geometry and responsive focus. Root inspected Chronik/Network screenshots and checked label fit at 360, 390, 800 and 1366 pixels. A full-network detail initially enlarged the graph stage; the corrected layout preserves plot height at 1440, 1366 and 800 pixels and scrolls the full detail internally. Independent review checked source semantics, qualifier boundaries, keyboard routes and knowledge consistency. Source tables and generated data were unchanged; this is targeted frontend verification, with guided interpretation pending. |
| Chronik details, M6g | Ten targeted Chronik browser cases pass, including dense lists, source navigation, keyboard return and dialog/desktop resizing. Two map browser checks pass. Root inspected 1536-pixel sparse/dense Chronik and 390-pixel dialog screenshots; independent review checked detail context and selection. All 673 Node checks and seven knowledge-integrity checks passed; no skips. The ten Chronik browser checks passed again after integration. Historical checkpoint; M6h implements the subsequent scaled geometry request. Guided acceptance remains open. |
| Chronik revision, M6f | 672 Node checks passed. Full pytest including browser and slow checks: 618 passed, 8 existing source-data failures, 4 expected source-fix xfails, no skips. This includes seven new Chronik browser cases plus shared-view, research-path, smoke and exhaustive Bestand checks. Root inspected the actual default and dense-day rendering at 1536 pixels and the narrow layout at 390 pixels. Independent review covered data separation, parts, undated locations and evidence completeness. Guided user acceptance is pending. |
| Previous application change, M6e | 676 Node checks, 22 existing browser cases and the corrected new header case passed; seven knowledge checks passed. Browser scope covers smoke, shared views, research paths, exhaustive Bestand display, page reload, selection and responsive geometry. Root inspected 2048, 800 and 600-pixel screenshots. This is targeted verification after M5f |
| Controlled knowledge close | Seven knowledge integrity checks passed, including AGENTS links and decision references; 19 stories, ten task examples and 18 Git references verified. Independent Sol 5.6 review checked routing, retained rules and draft/acceptance boundaries. No application tests were rerun for this documentation close |

## Session close and re-entry

Resume through the root action layer and this document's first section. The current implementation and verification checkpoint is M6i; Git identifies its local commit. Source tables, generated datasets and vocabulary remain unchanged by this UI refactoring. The existing pre-plan stash was left untouched; it is not a pending step and must not be applied automatically.

The review server serves `docs/` at `http://localhost:8000/`. If unavailable, run `python -m http.server 8000 --bind 127.0.0.1 --directory docs` from the repository. Serving the shipped frontend needs no transformation run. Browser URLs are local review addresses; public RDF identifiers remain unchanged. Pushing, publishing and external communication are separate actions.

Maintained knowledge stays in `knowledge/`. Root README, CLAUDE and AGENTS are entry/action documents. Source diffs, reconciliation provenance and dated curation evidence remain beside their data. The external Vault handover remains in [handoff.md](handoff.md). No new session-handoff document is required.

## Source and model limits requiring acceptance

At the last integrated run, seven Python source checks and one browser source comparison failed, eight source checks in total. They identify 400 link rows without matching records, object row 725 without a signature, 26 marked-as-worked records without links, invalid role/type values, named links without a type, and 32 links without a model mapping. The last group comprises 26 document links and six activity links. The browser source comparison is the eighth check and also reports the missing object. These are source/model findings; the implementation work has not changed the historical recording.

Missing records and links limit completeness for tasks 1–6, 8 and 9. Invalid or missing roles/types constrain role, contract and document-type interpretation. Unmodelled activities include engagements and a radio recording in Box 2, so the current graph cannot be treated as a complete appearance history. The maintained [data.md](data.md) and the [source handover list](../data/reports/source-errors-handover-2026-09-01.md) own these findings. Acceptance must name the admitted limits or require source correction; a blanket “expected red” label is insufficient.

Further limits remain the ambiguous work/part binding, sparse residence and contracting-party evidence, source dating qualifiers, unresolved identities and incomplete location coverage. The decided occurrence model, editorial identity decisions and partner-side recording changes remain outside this stabilisation increment. [specification.md](specification.md) § Open decisions is the single address for those decisions.

## Remaining acceptance

After technical verification, the project lead runs tasks 1–10 with the recorded examples and current data state, records interpretation failures or accepted limits, and decides version 0.9. Partner acceptance establishes 1.0 under the existing definition. Publication, archiving and external communication do not follow from a local commit.
