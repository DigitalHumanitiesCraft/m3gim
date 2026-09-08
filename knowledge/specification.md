---
title: Specification
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: reviewed
language: en
version: 0.8
created: 2026-06-17
updated: 2026-09-08
authors: [Christopher Pollin]
generated-with: Codex
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Specification
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/specification
knowledge-sources:
  institutions:
    Universitätsarchiv der KUG Graz: https://www.kug.ac.at
  standards:
    RiC-O: https://www.ica.org/standards/RiC/ontology
    AgRelOn: https://d-nb.info/standards/elementset/agrelon
topics: ["[[Requirements]]", "[[User Stories]]", "[[Scope]]"]
related: [research-framework, data, data-model, architecture, design, journal, testing, handoff, plan]
---

# Specification

## Project

M³GIM (Mapping Mobile Musicians) is a pilot study on the mobility and the knowledge production of the mezzo-soprano Ira Malaniuk (1919 to 2009). It is a feasibility study for an FWF follow-up project on female singers at European cultural metropolises of the nineteenth and twentieth centuries. The project lead is the professorship for historical musicology and gender studies at the University of Music and Performing Arts Graz, the cooperation partners are the university archive of that institution and DH Craft, and the Centre for Information Modelling at the University of Graz advises. The technical core is a Python pipeline that transforms the archival recording into JSON-LD and a static single-page application on GitHub Pages, reachable at https://dhcraft.org/m3gim. Theory and research questions are in [research-framework.md](research-framework.md).

### Source material

The material is the fonds UAKUG/NIM at the university archive of the KUG Graz, the partial estate of the creator of the fonds, in the three holdings groups main holdings, posters and sound carriers. The archive team catalogues it after the project recording convention, and this project reads that recording rather than producing the source description itself. Source material, recording and known defects are in [data.md](data.md), the formal model in [data-model.md](data-model.md).

### Standards

- RiC-O 1.1 for the archival modelling, extended by the m3gim extension for works, performances, stage parts and mobility
- AgRelOn for agent to agent relations
- SKOS for the controlled vocabularies of document types, roles and perspectives
- JSON-LD as the serialization and the single interface between pipeline and application
- Wikidata identifiers as authority data through reconciliation and enrichment

The choice follows the claim to linked open data connectivity. The limits of authority coverage are named in [data.md](data.md).

### Licence

Code is MIT, text and data are CC BY 4.0 unless the archive decides otherwise for its material, and source material keeps its individual rights note.

## Goal and frame

The application supports source-based research into mobility and knowledge production. Recorded statements remain traceable to their documents, with source roles, uncertainty and cataloguing gaps preserved. Researchers interpret the historical connections. The stable interaction and evidence contract is defined below.

The pilot evaluates whether RiC-O 1.1, the m3gim extension and AgRelOn support this material and a follow-up study. Completeness of the fonds is outside the pilot's claim. A static application on GitHub Pages keeps the result available without operating a backend across funding interruptions.

## Requirements

### Functional

- One result set, shared by all views and restricted through the facets of the one left sidebar.
- Every data point visible with its role and a way back to the record that carries it. Technical source cells remain available in data and exports (E-285).
- The four registers of persons, institutions, places and works as entry points, with the Wikidata identity where a match exists.
- The Korb as a collection across views, with an export that carries source cells and links.
- The data state of the dataset named in every view.

The requirements per research question are set out as epics and stories below and are not repeated here.

### Non-functional

- No backend, no build chain, all data loaded at start, deliverable as static files.
- `docs/data/m3gim.jsonld` is the single archival data source of the frontend, and no count is hard coded in the application. E-290 adds a separately identified editorial context layer from the research framework.
- Reproducible, meaning versioned source exports and a pipeline that derives the same dataset from them.
- Connectable to linked open data through RiC-O 1.1, AgRelOn, SKOS and Wikidata identifiers.
- Archival assertions must derive from the metadata. E-290 permits a separate, explicitly editorial and source-linked biographical context layer; it neither changes archival evidence nor participates in document filtering.
- No pre-emptive performance optimization (E-25). A markedly larger fonds in a follow-up project would reassess this.
- Interface strings and Datenspiegel findings are German. Knowledge is English by default; the partner-facing recording guide stays German.

## Epics and user stories

The stories operationalize the stable research contract below. They require visible evidence, filtering and a path to the source across changing data states. Historical interpretation remains part of the human evaluation.

The seven epics are the questions the project partners and the talk abstract put to the fonds. Their relation to the research questions is set out in [research-framework.md](research-framework.md). A story is fulfilled when the data points it names are visible, filterable and lead back to the record. The acceptance instrument is the task set in [research-framework.md](research-framework.md) § Evaluation. Where the dataset carries a dimension only in part, the story says so, and [plan.md](plan.md) records implementation gaps and acceptance evidence for each story.

### Epic 1. Which places does the estate attest?

- As a musicologist I want to see every place data point of the result set with the place role in which the place stands at the record, the date explicitly attached to that place statement, and the attesting record, so that I can compare place references and cite their evidence. Document dates and the document time anchor remain separately labelled.
- As a musicologist I want to group places by country and by time and restrict the result set by place role, time and country, without any role being excluded silently, so that I can compare the geographical distribution of indexed documents and inspect its dating and coverage limits.

The dataset carries the place with its role and the record. A date stands at the place where the annotation carries both, and country coverage depends on location enrichment. Place-role and country facets restrict the shared document cut. The Orte view provides the primary place list and complete source evidence, with an optional geographic companion. Selection opens evidence without changing the shared filter; filtering and transfer to the Chronik are explicit actions. Place and role counts name distinct attesting documents. Multiple graph paths from one source row count as one place statement, while independent rows remain separate. A journey or realized appearance requires additional evidence binding and scholarly source assessment (E-294).

### Epic 2. Which stage parts did she sing?

- As a musicologist I want to see every stage part with its work and composer where the fonds names them, and the records that carry it, so that I can reconstruct her repertoire from the fonds.
- As a musicologist I want to see every work with its composer and the stage parts the fonds assigns to it, and reach the records from there.
- As a musicologist I want to recognise when the same work or stage part appears under several spellings, because the tool merges nothing the recording keeps apart.

The dataset carries stage part and work as separate entities and binds them only through the curated Partie of the Werke index. Elsewhere the interface infers the binding from a record that names a single work and marks the result as derived. Spelling variants stand as separate entries, because the tool merges nothing the recording keeps apart.

### Epic 3. Where did she sing what, when, and for which house?

- As a musicologist I want to read at one record every data point together, place, work, stage part, date, institution and participants, each with its role and attesting record, so that I decide myself what forms one appearance.
- As a musicologist I want to choose an institution or a person and see the places, works, times and records connected with it.
- As a musicologist I want to see fee, currency, contract place and contracting party at contracts, so that I can read the conditions of her work.

The dataset carries every data point at record level with its source cell. A role stands at most of them, not at all. The institution per performance and the binding of the data points into one occurrence come with the next recording stage (§ Occurrence). The third story is a proposal from the data, not a partner question. Fee, currency and contract place are attested, the contracting party barely.

### Epic 4. In which ways was she mobile?

- As a musicologist I want to see the roles in which places and events are recorded, guest performance, performance, season, contract, residence, journey, dispatch and the others, each with its count in the result set, and restrict the result set by them.
- As a musicologist I want to see contracts and residence data points in time, so that I can read her fixed ties to houses and places in sequence.

Every role used in the dataset is exported as a concept with a label (E-254). The shared link-type and role facet counts and filters its attesting documents. Residence evidence remains too sparse to establish a sequence. The researcher interprets what a recorded role means for mobility.

### Epic 5. With whom did she work?

- As a musicologist I want to see every person and institution that stands with her at a record, with the agent role in which it stands there, and the record.
- As a musicologist I want to see recorded relations with their kind, correspondence, colleagueship, patronage and the others, and distinguish them from mere co-mention at the same record.
- As a musicologist I want to move from a person or institution to its surroundings, persons, places, works, houses, and restrict the result set by time.

The dataset carries both kinds of evidence and keeps them apart. Recorded relations are few and each stands in a single document, co-mention is frequent and counted. The tool shows both and marks which is which.

### Epic 6. How did her knowledge travel?

- As a musicologist I want to see records by their document type, programme, press, broadcast, recording, letter, contract, photograph and the others, and restrict the result set by type.
- As a musicologist I want to combine document type with work, place, person or time, for instance every press report on a stage part at a place.

The dataset carries the document types with their vocabulary hierarchy, a few groups over a flat remainder. The combination is the shared faceted filtering of the sidebar.

### Epic 7. What is a statement based on?

- As a researcher I want to reach the record from every data point in every view, with signature, title and convolute, so that I can cite it. Exports retain the technical source cells.
- As a researcher I want to see at every normalized person, institution, place and work whether it is matched to Wikidata, and go there.
- As a researcher I want to see at every view on how many records of the current data state it rests, and the date of that data state.
- As a researcher I want to collect records across views in the basket and export them with their evidence and links.

The dataset carries the source cell of every data point and, at a normalized entity, the Wikidata identity without a degree of certainty, because the match confidence stays in the reconciliation report and is deliberately not asserted at the entity (E-106). The common coverage line exposes the data-state date through its tooltip and accessible label in all six views.

### What the epics leave out

The cataloguing status is not a research subject. It stays as a data point in the record detail and leaves sidebar and statistics. The cataloguing team reads the pipeline reports, not the interface. Stories that presuppose an interpretation, for instance which forms of mobility the fonds does not attest, are not stories. The tool shows the roles that exist with their counts, and the absence is read by the researcher.

## Versions 0.9 and 1.0

Version 0.9 is the state in which every story of § Epics and user stories is fulfilled in the interface as far as the dataset carries it, the data reach the interface completely and correctly, and the project lead has accepted the task set of [research-framework.md](research-framework.md) § Evaluation: tasks 1–9 in the browser and task 10 against the cataloguing artefacts. Version 1.0 is the same state after the project partners have run the task set and accepted the result. Data keep growing between and after both versions without changing either definition.

## Stable research contract

The implementation scope is the document-centred tool (E-282). Shared text search, facets and the time window select one set of linked source records across all six views. Text search uses the common document search fields, including signature, title and linked values. A view's entity chooser or graph selection refines its presentation within that set and does not redefine the shared query. An explicit filter URL replaces the previous filter; navigation without a filter query preserves it.

The time window uses the primary record time anchor, with undated records retained as declared context. A map annotation keeps its own date as source evidence; it is not a second, silent time filter. Each view accounts for its eligible subset, such as located places or actors excluding the creator of the fonds. Grouped rows and aggregate counts refer back to the records they represent.

The Chronik displays every recorded document and statement date within that shared document set (E-287). Its source and entity lanes retain document context, uncertainty, undated evidence and complete access to dense groups. Dated rows do not by themselves bind co-mentioned entities into an occurrence.

Co-mention is the relation available before occurrence grouping is implemented. The task set therefore asks researchers to assess historical connections in the source. The planned occurrence model remains a separate extension. Role counts and filters belong to the shared sidebar; the existing four statistics sections provide evidence navigation from their rankings. A further statistics section requires a demonstrated unmet research task.

## Netzwerk view

The network exposes document co-mention among persons and institutions in the shared result set. Its two-mode projection links actors to their attesting records. Its actor projection connects actors through shared records and counts distinct records as edge strength. Groups follow the model's institution classification. The creator of the fonds and her recorded variants are excluded from the drawing because their ubiquity obscures the other connections; the person facet still includes her.

Explicitly recorded relations remain distinguishable from co-mention and link to their evidence. Co-mention establishes neither collaboration nor a shared appearance. Undated records remain identifiable context under the common time cut. Both projections expose their complete eligible sets without a hidden threshold.

Selection, layout, legends and detail behaviour belong to [design.md](design.md) § Views. Projection, rendering and GEXF serialization belong to [architecture.md](architecture.md) § Views.

## Views

All views use the shared document cut. The sidebar owns filters; selected details expose the evidence behind an item. [design.md](design.md) owns their presentation and interaction.

| View | Research operation and evidence |
|---|---|
| Bestand | Browse linked archival records in signature and Konvolut order, inspect every recorded field and follow Folio pages. Unlinked records remain outside the application basis. |
| Chronik | Compare recorded document and statement dates in source and entity lanes, preserving precision, qualifiers, undated evidence and access to dense groups. Separately sourced editorial bands provide biographical context. |
| Orte | Find places and recorded roles, inspect complete source evidence, compare geographical distribution through an optional map and open the selected place in the Chronik. Document dates and explicitly dated place statements remain separate. Places without coordinates remain in the list. Historical journeys and realized appearances require source assessment and occurrence binding. |
| Register | Enter through persons, institutions, places or works, inspect enrichment and document evidence, and continue into the relevant analytical view. Curated, derived and ambiguous work/part bindings remain distinguishable. |
| Netzwerk | Inspect actor/document co-mention and explicitly recorded relations under the contract above. |
| Statistik | Compare distinct-record counts by document type, repertoire, person and institution, and inspect the records behind each ranking. |
| Korb | Collect records across views and export CSV, BibTeX, JSON-LD or GEXF with source cells and links sufficient to trace the evidence. |

Cataloguing status remains available in record details. Source correction uses the pipeline's cataloguing artefacts. The common coverage display names the selected records against the linked application basis and provides the data timestamp; it does not measure completeness of the entire fonds.

## Open decisions

This is the single address for decisions that are open. [journal.md](journal.md) carries the decisions that fell. The model extensions below concern further development and recording; the accepted document-centred stabilisation scope is defined above.

### Model and vocabulary

- Gendered role labels. Source forms include gendered labels, while E-63 normalises the colon suffixes and the vocabulary supplies the current display labels. The partners' requested display change remains an editorial decision. Exact original spelling remains recoverable through the source cell; colon-suffix normalisation precedes `derivedFromRole` handling.
- Further correspondence modelling beyond the existing fonds-centred relation model. E-129 already decides the suppression of self-relations involving the creator, and E-149 defines symmetric correspondence with both participants and their recorded side roles. Any change to this scheme requires an explicit model revision.
- `sammlung` against `konvolut`, meaning whether the two names separate a physical wrapper from a thematic compilation or denote the same thing. The vocabulary carries `collection` without a `skos:broader` on `konvolut` and an editorial note holding the question open.
- The formal binding of a `StageRole` entity to its work, its relationship with the stage-part literal retained from the work index, and a separate recording index supplying work identity and voice type. StageRole entities are already implemented. The two source rows classifying `protagonist` as a person remain an editorial type finding.
- The occurrence implementation. The target model is decided (E-125, E-127, E-128), the pipeline grouping and the recording rollout are open, and until they exist the Netzwerk shows co-mention at the record and the binding of person, stage part and performance is missing from the dataset.
- Formal contract status and realization fields. Current statements in the annotation column are already retained as `rico:generalDescription` and displayed at their data points. A structured status model remains pending clarification with the cataloguing team.
- The inference rules from co-presence, meaning under which threshold of shared performances and which measure of temporal proximity a co-mention may become an annotated relation. No such rule exists, and none is applied.
- The interval meaning of qualified datings in the shared time filter. `circa:`, `vor:` and `nach:` are already preserved and displayed; the current filter uses their numeric year anchor. The Chronik renders qualified boundaries independently of that filter contract, including the recorded `nach:1956` value. Wikidata time precision is implemented under E-132 and remains implicit in the value's length.
- The RDF shape of annotations and embedded identities, RiC-O range alignment for language, extent and document type, and the placement of `dataPointId` provenance. [data-model.md](data-model.md) records the present compromises.
- Currency defaults and their derivation, processing-status vocabulary, and the unused `detail` link convention require agreement with the cataloguing team before recording guidance or emission changes.
- Whether the five movement types of [research-framework.md](research-framework.md) enter the model as a second mobility axis beside the five event perspectives, or whether both sets are merged.

### Interface and operation

- The KUG logo in the footer, taken from the press area of the institution, whose use on the project page is to be confirmed with it.

### Repository

- The unversioned holdings in `data/_archive/`, which hold the original files of the institution beside versioned material.

## State

Implemented are the eight-step source-to-JSON-LD pipeline, its validation and cataloguing reports, the formal vocabulary and coverage checks, and the static application described above. [plan.md](plan.md) owns the current implementation, defects, verification and human acceptance. Version acceptance follows the definitions above.

Occurrence grouping remains unimplemented. Source findings are maintained in [data.md](data.md) and the [source handover list](../data/reports/source-errors-handover-2026-09-01.md); authority findings are maintained in the [reconciliation register](../data/reports/reconciliation-register.md). Zenodo archiving and EAD export remain deferred parts of an operating model.
