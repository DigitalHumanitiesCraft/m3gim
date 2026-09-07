---
title: Specification
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: reviewed
language: en
version: 0.7
created: 2026-06-17
updated: 2026-09-07
authors: [Christopher Pollin]
generated-with: Claude Code
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

The application is a tool, not a narrative (E-156). It shows every recorded data point with the role the recording gives it, where it gives one, and with access to the record that carries it, it restricts the result set through the facets of the one sidebar, it leads from every statement back to the record, and it leaves the interpretation to the researcher. The data grow continuously. No view assumes a particular data state, every view names the data state it is built from, and gaps in the cataloguing stay visible instead of being smoothed by pipeline workarounds.

As a pilot study the project validates the method rather than the completeness of the fonds. It tests whether the material is workably catalogued with RiC-O 1.1, the m3gim extension and AgRelOn, whether the procedures scale, and whether the result carries the follow-up application.

The application is a static single-page application without a backend, delivered over GitHub Pages. The reason is a project time interrupted by funding gaps, in which an application that runs offline first and stays reachable without server operation is more robust than a server-dependent one.

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
- `docs/data/m3gim.jsonld` is the single data source of the frontend, and no count is hard coded in the application.
- Reproducible, meaning versioned source exports and a pipeline that derives the same dataset from them.
- Connectable to linked open data through RiC-O 1.1, AgRelOn, SKOS and Wikidata identifiers.
- No editorial interpretation in the interface that is not derivable from the metadata.
- No pre-emptive performance optimization (E-25). A markedly larger fonds in a follow-up project would reassess this.
- Interface strings and the finding texts of the Datenspiegel are German, code and the documents in `knowledge/` are English.

## Epics and user stories

The application is a tool, not a narrative (E-156). It shows every recorded data point with the role the recording gives it, where it gives one, and with access to the record that carries it, it lets the researcher restrict the result set by facets, and it leads from every statement back to the record. What a data point means, whether a contract place counts as a performance place or a co-mention as a collaboration, the researcher decides. The stories therefore ask for visibility, filtering and the way back to the source, never for an interpretation. The data grow continuously. No story assumes a particular data state, and every view names the data state it is built from.

The seven epics are the questions the project partners and the talk abstract put to the fonds. Their relation to the research questions is set out in [research-framework.md](research-framework.md). A story is fulfilled when the data points it names are visible, filterable and lead back to the record. The acceptance instrument is the task set in [research-framework.md](research-framework.md) § Evaluation. Where the dataset carries a dimension only in part, the story says so, and where the interface does not yet fulfil a story, § State names the gap.

### Epic 1. Where did Malaniuk perform?

- As a musicologist I want to see every place data point of the result set with the place role in which the place stands at the record, the date where one is recorded, and the record that carries it, so that I can describe her geographical range and cite every place.
- As a musicologist I want to group places by country and by time and restrict the result set by place role, time and country, without any role being excluded silently, so that I can read her international reach and its shift over the decades on the data alone.

The dataset carries the place with its role and the record. A date stands at the place where the annotation carries both, and country coverage depends on location enrichment. Place-role and country facets restrict the shared document cut. The Karte reports its eligible place evidence and lists places without drawable coordinates.

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

The view stands in two forms of the same data, the overview and the neighbourhood after a click. It answers the question with whom the creator of the fonds worked, from the evidence of the fonds and nothing else. It draws the persons and institutions of the current result set and connects two of them where they stand at the same record. It leaves the creator of the fonds out of the picture, because she stands at nearly every record and would cover every structure. She stays selectable as a person facet.

Overview. Every actor of the result set, persons and institutions, and every record that carries links is a node, and every mention is an edge, one to one with the Verknüpfungstabelle. Groups count as institutions, as the model treats them. The creator of the fonds is no node, and neither are her spelling variants in the source. A switch in the sidebar hides the record nodes, and hidden they leave the person to person projection, in which two actors are connected where they stand at the same record and the strength of the edge is the number of shared records. A second control fades the actors that carry a single record. There is no cap and no threshold that removes anything, and the picture of the whole fonds is dense on purpose, because the facets of the sidebar are the analysis and the picture is their result.

Neighbourhood. A click on a node keeps the layout still, highlights the node and its neighbourhood, fades the rest and labels the highlighted nodes. At an actor of the two-mode network the neighbourhood runs two steps, the records of the actor and the actors standing at those records, the second step drawn paler, because the question is with whom she worked and not which sources name her. A record node and the projection mark one step (E-276). A recorded relation, which in the dataset always starts at the creator of the fonds, is not an edge but a mark at the node of the counterpart with a jump to the attesting record.

Time. The network uses the shared primary document time anchor: the highest-ranked anchoring link date precedes the source dating (E-264, E-282). Nodes whose records carry no year stay in the picture and are drawn faint.

Detail column. The column is absent until a node or an edge is selected and the drawing uses the whole width beside the sidebar. Clicking a node keeps the layout still, highlights the node and its neighbourhood, opens the column with its kind, name, Wikidata mark, the roles with their record counts in the result set, the neighbours as a list with edge strength, the recorded relation with its evidence, and a jump into the Bestand with the node as filter, and writes the node into the address so the state is citable. Clicking an edge highlights both ends and lists the shared records with signature and title. A click on empty ground or Escape closes the column. The shared selection component scrolls internally and exposes complete lists; source actions open Bestand (E-289).

Tooltips. The tooltip is the preview, the column is the detail. A node shows name, kind and record count in the result set, an edge the two names and the shared record count, each view control what it does, the coverage line the date of the data state. No explanatory text stands in the drawing.

Sidebar. Name, time window, document facets, person, place, work, institution, and the two view controls, the record nodes and the fading of actors with a single record. The sidebar scrolls independently when its controls exceed the available height. The coverage line stands at the view and names the visible records of the cut against all records of the fonds, with the records that carry a Verknüpfung and the date of the data state in its tooltip (E-277).

Export. The GEXF export contains the projection the picture shows, nodes with kind and record count, edges with strength and roles, and the recorded relations as the node attributes `relations` and `relationRecords`, the relation with its label and the signatures of the attesting records (E-275).

Technology. D3 as loaded, the force layout computed to rest before the first draw, nodes and interaction in SVG, edges on canvas with quadtree hit testing, and a highlight that touches only the affected elements. Colour stays quiet, the actors in one tone, the records as small squares in the accent, and the highlight is the only strong colour. No further library.

## Views

All filters of all views stand in the one left sidebar, which scrolls independently when needed, and no view carries a filter bar of its own. A detail column is absent until a selection exists, and the drawing or the list uses the full width beside the sidebar until then. The Erschließungsstand is no facet and no section of the Statistik. It stays as a statement in the record detail, because the cataloguing team reads the generated pipeline reports rather than the application (E-248).

Bestand. The archival base view on the records in their Konvolut hierarchy and the provenance anchor of the application. It lists in signature order without a sorting control, because the Chronik carries the date and the facets carry the type (E-203). A Konvolut stands as a permanently visible group head that opens its Folios, a record opens its detail. Records without a Verknüpfung lie outside the application, their finding aid stays the archive (E-165). The view opens on the full base set (E-253).

Chronik. A continuous scaled vertical axis places all recorded dates of the selected documents in time (E-287, E-289). Intervals span their temporal extent; year/month precision and qualified boundaries remain explicit. Densely spaced values aggregate their labels while retaining exact temporal marks and complete evidence access. Source and entity context remain distinct, with typed parts separate from works. Chronik and Netzwerk share a detail component that appears only on selection and adapts to narrow screens. The common document cut applies before projection; display navigation never filters away earlier statements, malformed values or undated context.

Karte. Every place of the result set as a point with its place role, its localization certainty and the way to the attesting records, entity-centred through the choice of a person, an institution or a work. A place the map cannot draw stands in a sidebar section of its own with its record count, its reason and the same jump into the documents a map point carries, instead of vanishing (E-280). The country is a facet of the shared sidebar rather than a section of this view, and it counts records with evidence of presence (E-224).

Register pages. One register per page for persons, institutions, places and works, chosen in the menu of the Indizes tab and citable in the address. An entry carries name, enrichment, evidence count in the result set and the Wikidata mark, and the opened entry is the hub that hands over to the Bestand, to the Netzwerk and, from the works register, to the Karte. Enriched values are marked as enriched (E-216), and family colour and family symbol are the same in menu, list, Bestand marks and detail block titles (E-226, E-230).

Record detail. Every recorded data point of the record with its role, in functional blocks, opened over the full width, with the full record signature and title in its head, a separate metadata group and collapsible administrative fields at the foot. Folio paging updates the individual title together with the signature and metadata (E-286). Technical source cells remain in the dataset and exports (E-285). On the Folio record the pipeline carries since E-269 the detail pages through the pages of a Folio without leaving the record.

Korb. Records collected by hand across views and exported as CSV, BibTeX, JSON-LD and GEXF (E-232). Every format carries the source cells of the data points and the Verknüpfungen of the record, so an export can be cited from without opening the application (E-281).

Statistik. The counting view provides ranked lists of document types, repertoire, persons and institutions with their counts in the result set, cut by the same shared filter as every other view, with a jump from a row into the Bestand filtered by that value.

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
- Whether the five movement types of [research-framework.md](research-framework.md) enter the model as a second mobility axis beside the five event perspectives, or whether both sets are merged.

### Interface and operation

- The KUG logo in the footer, taken from the press area of the institution, whose use on the project page is to be confirmed with it.

### Repository

- The unversioned holdings in `data/_archive/`, which hold the original files of the institution beside versioned material.

## State

Built are the pipeline from the source exports to `docs/data/m3gim.jsonld` with its validation, audit, quality snapshot and cataloguer report, the vocabulary with its coverage gate, and the application with the views described above, the shared sidebar, the Korb with its four export formats, and the two test layers, invariants and Datenspiegel. Every role used in the dataset leaves the pipeline as a SKOS concept with a label (E-254), and the pages of a Folio hang under a record of that Folio (E-269). Running figures are in the quality snapshot under [`../data/reports/quality-snapshot.md`](../data/reports/quality-snapshot.md).

The authorised stabilisation work is complete through the technical milestones recorded in [plan.md](plan.md), each with its own commit. Pipeline preservation, the common view contract, source-backed research paths and evidence exports have been checked. Follow-up review improved first network selection, source diagnostics and statistics evidence navigation, and corrected the agreement between document-type counts and filters. Independent test review and knowledge consolidation are integrated. The plan owns verification checkpoints and maps all 19 stories to evidence and material limits. Guided testing has confirmed a Folio paging/address path and exposed open institution navigation, register usability and map presentation problems. It also records a draft station-map/timeline investigation, which has not replaced the implemented map or established travel routes. Source-data findings and overall human acceptance remain open. [handoff.md](handoff.md) holds only the unresolved external knowledge handover. Version 0.9 still requires project-lead acceptance of the research tasks and source limits, and 1.0 requires partner acceptance.

Not built is the target model of [data.md](data.md) § Target model, decided and not built. The occurrence as a bundling node above the aspect nodes is absent from vocabulary and dataset, and the interface therefore shows co-mention at the record where it would show one appearance. Source errors stand in the handover list [`../data/reports/source-errors-handover-2026-09-01.md`](../data/reports/source-errors-handover-2026-09-01.md), the Wikidata findings in the [`../data/reports/reconciliation-register.md`](../data/reports/reconciliation-register.md). Deferred are the Zenodo archiving and the EAD export as part of an operating model.
