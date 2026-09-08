---
title: Implementation Plan
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: active
language: en
created: 2026-09-06
updated: 2026-09-08
authors: [Christopher Pollin]
generated-with: Codex
method:
  name: Promptotyping
related: [INDEX, specification, research-framework, data, data-model, architecture, design, testing, handoff, journal]
---

# Implementation Plan

## Current state and next action

The application baseline inspected on 2026-09-08 is `4df1be7` (M6j, 2026-09-07), which matched the latest successful Pages build at that check. Chronik has source/entity lanes, natural calendar groups, compressed empty stretches, editorial context bands and a shared selection component with Netzwerk. Guided acceptance remains incomplete; version 0.9 has not been accepted.

The 2026-09-08 status check found one technical failure in addition to eight source/model checks. The selection-detail stylesheet URL uses asset version `2026-09-07`, while the other stylesheets and the generator use `2026-09-05`. The institution-chip routing defect is also confirmed. Exact checks and limits are below.

**Next executable step:** restore consistent stylesheet versioning, then correct institution navigation and address the observed register problems. Continue the guided Chronik review for scrolling orientation, dense groups, date summaries and source interpretation. The map proposal below remains a draft.

The 2026-09-08 knowledge cleanup corrects stale descriptions and consolidates responsibility across documents (E-292). It preserves the story/task evidence and unresolved external handovers. Its documentation verification is recorded below.

## Open follow-up work

| Work | Observed problem or proposed result | Completion evidence |
|---|---|---|
| Stylesheet version consistency | The index selection-detail stylesheet uses a different version from the other links and generator; the invariant check fails | One consistent asset version across generated pages and index stylesheet links; the existing footer invariant passes |
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

Compare the draft and current map on the same sample. The reader must understand every line, reach its evidence, distinguish chronology from travel, identify missing locations and operate it by keyboard. This evaluation decides between a replacement, a connection mode or a station-only view. Implementation of this proposal requires a design decision based on that evaluation.

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

[CLAUDE.md](../CLAUDE.md) owns authorisation and working rules. [specification.md](specification.md) owns requirements, open decisions and version definitions; [research-framework.md](research-framework.md) owns evaluation tasks. This plan records active follow-up work, observed evidence and remaining acceptance.

## Milestones and commit boundaries

The stabilisation changes and Chronik iterations through M6j are recorded in [journal.md](journal.md) and Git. Completed implementation history is maintained there. The tables below retain the evidence needed for research acceptance; a completed technical change does not establish scholarly acceptance.

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

[testing.md](testing.md) defines check responsibilities and acceptance limits. Counts below refer to their named revision and execution scope.

| Checkpoint | Evidence and limit |
|---|---|
| Current baseline, 2026-09-08, `4df1be7` | Node suite passed. Pytest with `-m "not slow"`: 635 passed, 9 failed, 4 xfailed, 1 deselected, no skips. Browser tests were executed. Eight failures expose source/model findings; `test_stylesheet_links_carry_the_asset_version[index.html]` exposes the inconsistent selection-detail CSS version. The slow determinism check was excluded. |
| Chronik M6j, 2026-09-07 | 693 Node checks, 28 targeted Chronik/Netzwerk browser cases and seven knowledge checks passed. Smoke reported 37 OK. Geometry was checked for every group at 390, 800 and 1366 pixels before/after selection; additional visual inspection covered narrow and wide rendering. Guided visual and scholarly acceptance remain open. |
| Last full run including slow checks, M6f | 618 Python/browser checks passed, eight source/model checks failed, four strict source-fix xfails, no skips. This is a historical checkpoint before subsequent Chronik changes. |
| Knowledge cleanup, 2026-09-08 | Seven knowledge-integrity checks and the browser test for editorial Chronik context passed. A comparison with `4df1be7` confirmed all 291 existing decision definitions, the seven epic sections, 19 story rows, ten task examples, guided observations, research questions, talk text, evaluation and identifier exclusion lists were preserved. All eight editorial phases retain their identifiers, bounds and source links; only the Bayreuth description changed. `git diff --check` passed. Source tables, generated datasets and vocabulary are unchanged. |

Earlier verification, including network selection measurements and exhaustive source-label/export checks, is retained as historical evidence in [journal.md](journal.md).

## Session close and re-entry

Resume through [CLAUDE.md](../CLAUDE.md) and this document's first section. External knowledge awaiting integration remains in [handoff.md](handoff.md). Git preserves completed changes and superseded wording.

## Source and model limits requiring acceptance

The 2026-09-08 run confirms seven Python source/model failures and one browser source comparison failure, eight in total. The separate stylesheet invariant failure is listed above. They identify 400 link rows without matching records, object row 725 without a signature, 26 marked-as-worked records without links, invalid role/type values, named links without a type, and 32 links without a model mapping. The last group comprises 26 document links and six activity links. The browser source comparison is the eighth check and also reports the missing object. The unmapped link types are a model/pipeline gap. The other findings concern source identity, completeness or controlled values. Their counts overlap and must not be added as a count of affected records.

Missing records and links limit completeness for tasks 1–6, 8 and 9. Invalid or missing roles/types constrain role, contract and document-type interpretation. Unmodelled activities include engagements and a radio recording in Box 2, so the current graph cannot be treated as a complete appearance history. The maintained [data.md](data.md) and the [source handover list](../data/reports/source-errors-handover-2026-09-01.md) own these findings. Acceptance must name the admitted limits or require source correction; a blanket “expected red” label is insufficient.

Further limits remain the ambiguous work/part binding, sparse residence and contracting-party evidence, source dating qualifiers, unresolved identities and incomplete location coverage. The decided occurrence model, editorial identity decisions and partner-side recording changes remain outside this stabilisation increment. [specification.md](specification.md) § Open decisions is the single address for those decisions.

## Remaining acceptance

After technical verification, the project lead runs tasks 1–10 with the recorded examples and current data state, records interpretation failures or accepted limits, and decides version 0.9. Partner acceptance establishes 1.0 under the existing definition. Publication, archiving and external communication do not follow from a local commit.
