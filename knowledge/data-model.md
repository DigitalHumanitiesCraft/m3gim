---
title: "Data Model"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: en
version: 0.6
created: 2026-02-19
updated: 2026-09-09
authors: [Christopher Pollin]
generated-with: Codex
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Datengrundlage
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/data
topics: ["[[RiC-O]]", "[[AgRelOn]]", "[[Data Modelling]]", "[[Controlled Vocabularies]]", "[[Archival Description]]"]
knowledge-sources:
  vocabulary: ../vocab/m3gim.ttl
  standards:
    RiC-O: https://www.ica.org/en/records-context-ontology
    AgRelOn: https://d-nb.info/standards/elementset/agrelon
    SKOS: http://www.w3.org/2004/02/skos/core
    Wikidata: https://www.wikidata.org
  vocabularies:
    GND: https://gnd.network
    Wikidata: https://www.wikidata.org
related: [data, architecture, journal, specification, research-framework, testing]
---

# Data Model

This document reads the formal model out of the vocabulary. It says which standards carry the model and why, how identifiers are assigned, how statements about statements are made, what shape the resulting graph has, what follows from that shape for anyone querying it, and where the model stops. The source material it formalizes is in [data.md](data.md).

The authoritative term list is [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl), with an editorial note on each term and its German display label. The generated reading view of that file is `docs/datenmodell.html`. Neither list is repeated here. [CLAUDE.md](../CLAUDE.md) owns the source-first change sequence. Every external RiC-O or AgRelOn term must be verified against the official ICA-EGAD component lists or the German National Library RDF before admission (E-103, E-104). Naming plausibility is insufficient evidence for a term.

## Namespaces

The project terms sit in three namespaces separated by the kind of thing they name (E-138). Ontology and instances therefore share no space, the way RiC-O itself separates them. Project term names are English throughout, and the German display values are `skos:prefLabel`.

| Prefix | URI | Purpose |
|---|---|---|
| `m3gim-ontology` | `https://dhcraft.org/m3gim/ontology#` | project classes and properties |
| `m3gim-vocab` | `https://dhcraft.org/m3gim/vocabulary#` | controlled concepts, schemes and collections |
| `m3gim-data` | `https://dhcraft.org/m3gim/data#` | instances of the holdings |
| `rico` | `https://www.ica.org/standards/RiC/ontology#` | Records in Contexts Ontology 1.1 |
| `ric-rst` | `https://www.ica.org/standards/RiC/vocabularies/recordSetTypes#` | RiC-O vocabulary of record set types |
| `agrelon` | `https://d-nb.info/standards/elementset/agrelon#` | relations between agents and the pattern for meta-statements |
| `schema` | `https://schema.org/` | life dates of persons |
| `gndo` | `https://d-nb.info/standards/elementset/gnd#` | occupation as a literal |
| `wd` | `http://www.wikidata.org/entity/` | Wikidata entities as identifiers |
| `owl` | `http://www.w3.org/2002/07/owl#` | Ontology declarations; local source mentions never use `owl:sameAs` |
| `geo` | `http://www.w3.org/2003/01/geo/wgs84_pos#` | WGS84 coordinates |
| `skos` | `http://www.w3.org/2004/02/skos/core#` | organization of the controlled vocabularies |
| `xsd` | `http://www.w3.org/2001/XMLSchema#` | datatypes |
| `dcterms` | `http://purl.org/dc/terms/` | source reference of a property-level provenance statement |

Identical names in different namespaces are admissible and denote different things. The property for a composer and the role value for a composer are one such pair, the class for a framing event and the role value for a framing event another.

## Anchoring in RiC-O

RiC-O 1.1 carries the archival core. A convolute is a `rico:RecordSet` with `rico:Record` children joined by `rico:hasOrHadPart`, and the kind of a record set is a value of `ric-rst:` rather than a class, the fonds and the file both being record sets with a type. Agents are `rico:Person`, `rico:CorporateBody` and `rico:Group`, places are `rico:Place`. Description runs over the RiC-O description properties, and the archival dating of a unit stays on `rico:date` with the pure creation dating beside it on `rico:creationDate`.

The current vocabulary retains one internal subproperty edge, from `m3gim-ontology:hasDetail` to `m3gim-ontology:hasAnnotation`. The four RiC-O subproperty mappings introduced under E-103 are absent after E-301. Legacy access paths for recorded people and source composites must not infer participation or historical events through vocabulary entailment. RiC-O queries reach archival records through their directly declared types and properties; project annotations require the project vocabulary.

Three value-form deviations remain open. The term conformance test checks that an external term exists, not that the value fits its range, and three object properties receive a value form their range excludes. Language and extent expect an individual of a RiC-O class and receive a string, and the documentary form type expects a RiC-O individual and receives a concept typed only as `skos:Concept`.

RiC-O carries more than the project uses. The roles for author, addressee, sender, receiver and publisher each have their own object property in RiC-O 1.1, while the project carries them as role values on the collecting property `m3gim-ontology:hasAssociatedAgent`, which therefore deliberately stands without a subproperty edge, because a collecting edge cannot correctly specialize any one of them. RiC-O also offers an activity class as a subclass of event, which is the anchor the target model below reaches for.

## Why these classes

The extension adds five classes, and the reason for each is a property of the material rather than a wish for expressiveness.

`m3gim-ontology:Annotation` is the load-bearing one (E-136). Every dating, location and detail hangs as its own annotation node on its subject, carries its value in a fixed value property and its recorded role in a single role property, so that no property name expresses a role any more and a consumer reaches every dating of a document through one loop. Without a place it is a pure dating, without a date a pure location. The class replaces the three earlier classes for the spatiotemporal event, the dated event and the detail annotation. It has no superclass, because the earlier subclass edge onto the event class no longer holds once financial items sit on the same node, and RiC-O 1.1 offers no fitting anchor, a detail being neither an event nor a description element of a resource. Whether it should be modelled as the reification of a statement is open.

A date row and a place row carrying the same role remain separate source statements (E-139, E-301). Their shared role supplies no occurrence binding in either the pipeline or the interface. A composite cell retains its complete original value alongside any explicitly separable components.

Source composites of stage part with person and of date with work use neutral `m3gim-ontology:Annotation` carriers under E-301. Existing `perf_` identifiers and the `hasPerformance` access path remain for continuity; their vocabulary declarations do not classify the carrier as an event or establish actual participation. Source `ereignis`, `Aktivität` and `dokument` rows remain neutral statements of their recorded type. The legacy `Performance` and `FramingEvent` classes are not supplied by guessing what these rows describe. `MusicalWork` follows the recorded work type. Stage-part names remain available without inferring which work or appearance they belong to.

### Roles as one property

The recording carries a single role column. Before the rebuild the pipeline distributed its values over four properties differentiated by link type, for the date, the detail, the event and the place. All four already drew from one vocabulary and therefore collapse into `m3gim-ontology:role` (E-137).

The property is an object property with `skos:Concept` as its range. The role value is a reference to a concept, and the referencing node carries that concept's `skos:prefLabel` along, so the display text is available without a lookup and the values stay machine-readable through the IRI. Where the source carries no role the node carries none, and a role inferred from position arises nowhere. An unmapped source value can remain a literal and requires editorial review. Current contract-status statements are retained as descriptions, as explained under the financial layer.

The role and source reference belong to a document-local mention or annotation. An admitted Wikidata IRI is the object of `m3gim-ontology:authorityReference`; it does not identify the node carrying the local role. RDF expansion therefore preserves separate document contexts under E-301.

### Property families

The term list itself is in [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl) and in `docs/datenmodell.html`. Six families exist, and only what a reader cannot see from the term names is stated here.

The relational properties connect an archival resource to local agent mentions, source-composite annotations and detail statements. A composite may expose the person, work or stage-part components explicitly recorded in its source row. The legacy property names establish no performance or participation. The detail property remains a subproperty of the annotation property, keeping financial items addressable through their existing access path.

The descriptive and dating properties are strings throughout. Date strings retain spans, limited precision and qualifiers, so time consumers parse those forms explicitly. Vocabulary resolution keeps an incoming role alias in `m3gim-ontology:derivedFromRole` when it differs from the preferred label. `m3gim-ontology:recordedRole` retains the exact source spelling alongside its source-cell reference.

Two properties sit on the role concept rather than on source statements (E-150). `m3gim-ontology:datingScope` categorises the recorded dating role; `m3gim-ontology:datingRank` provides a display order for those categories. E-301 uses the explicitly recorded document date for the shared time filter. Neither vocabulary property can turn a content date into a missing document date.

`m3gim-ontology:unresolvedAggregate` is true on a main-holdings record that stands at top level without a folio and therefore denotes a collective unit whose folio cataloguing is pending. It replaces a character test on the signature that the interface performed itself, because the holdings group is a statement of the material and belongs in the dataset rather than in display logic.

Original notes retain their wording as `rico:generalDescription`. E-301 removes heuristic quality flags derived from name forms or note keywords. The separately recorded `datingEvidence` category is preserved; the application assigns no numeric confidence to it. Legacy quality properties remain available only for explicitly recorded values.

The authority-data properties injected from the Wikidata enrichment use an established vocabulary wherever one carries, life dates through schema.org and occupation through the GND literal property, and stay under the project namespace only where none does (E-105). Their four time values are cut to the precision attested in Wikidata and therefore carry the forms of EDTF level 0, with the precision level implicit in the length of the value (E-132). Beside them the curated index properties pass the index columns through onto the entity, which is what reaches an unmatched entity without a Q-identifier. Curated and enriched values stay separate on purpose, and where they overlap, as the curated note does with the enriched occupation, the resolution is open.

Two properties are declared and emitted only where the source column exists, the access status and the digitization status. The current object export carries neither column, so both terms carry an editorial note marking them unused, which the vacancy test demands as the excuse of an empty term.

## Identifiers

An annotation node receives a content-based identifier, a hash over place, role and date prefixed by the record-local identifier, with a stable ordinal suffix where genuine content duplicates occur on one record (E-115). The identifier is thus a pure function of its content and stable against the row order of the source.

A stage-part mention receives a deterministic identifier scoped to its source statement. Equal part names do not establish an identity across works or documents. The vocabulary stays separate because it carries relation roles as values and not stage parts as entities.

Documents and convolutes keep the archival signature as their local name. An additional type marker would add no distinction and would break every bookmark a second time, because the record identifier travels into the URL hash of the application.

## Controlled vocabularies

The vocabulary carries its concepts in six SKOS concept schemes, one for the roles an agent takes in a document, one for the roles in which a dating, a location or an entity reference stands to its document, one for the kinds of financial item, one for the degree of definiteness of a statement independent of the target node, one for the dating scopes, and one hierarchical scheme of documentary form types.

The scheme of annotation roles unifies what was first proposed as separate schemes for event, place and date roles. With one annotation node the same concept carries a dating, a location or both, so a split by date and place roles has no object. Where a date role and a place role named the same aspect they collapsed into one concept and lost their aspect ending, because the aspect sits in the value property and the role name only repeated it. The original recorded value survives in the derived-from-role property.

The scheme of financial item types stays beside the annotation roles, because no value of the financial layer occurs as a date or place role in these holdings or the other way round. Two exceptions exist, the qualifier for a mention, which has its own scheme, and a performer value on a detail, which names no financial item and is to be checked as a recording error.

Beside the schemes the vocabulary carries collections grouped by the target a role appears on in the dataset, roles at persons, at corporate bodies, at groups, at places, at works, at framing events, at datings, at financial details, and the mobility place roles. A role may sit in several collections, because the same column serves different target types. The pipeline reads none of these collections. It reads the vocabulary for the concept definitions, the role labels, the dating scope and rank, and the documentary form type hierarchy, and it holds the mobility place roles as a hard-coded German set in `scripts/transform.py` ([data.md](data.md) § Role values). The collection and the set are therefore two statements of the same thing that can drift apart.

The documentary form types are hierarchical so that a query can filter granularly by letter or aggregated by correspondence. The pipeline emits only the edges of the second level, so the root of the tree is not reachable in the dataset, and every emitted concept carries a readable German label instead of a bare slug (E-101). Two concepts of the tree are worth naming. `m3gim-vocab:collection` deliberately carries no broader edge onto `m3gim-vocab:bundle`, because the is-a relation between the two is not pre-decided and their distinction is still to be settled. `m3gim-vocab:program` is the canonical concept of its branch, and the source spellings for a programme booklet and a concert programme resolve onto it as alternative labels (E-131).

## AgRelOn

AgRelOn, the Agent Relationship Ontology of the German National Library, models relations between agents over a categorized vocabulary of relation types. The model integrates it as a complementary layer for agent-to-agent relations and for meta-statements. It replaces no part of the project model, because its scope is limited to agent and agent and covers neither spatiotemporal nor work-related nor archival relations. The reasons for using it are a standard vocabulary for the institutional and the correspondence layer, connectivity to GND-based holdings of other archives, and one uniform meta-statement pattern.

The former transformation generated fonds-centred correspondence, professional, employment, patronage and membership relations from document roles. E-301 retires that inference. A named institution with a role at a document does not by itself identify the other party or establish an agent-to-agent relationship. A document date cannot supply the beginning of employment.

The vocabulary remains available for an explicitly recorded relationship with both parties and its own source evidence. The current recording format supplies no general relationship statement of that shape, so the pipeline emits no inferred `hasAgentRelation` entries. Recorded persons, institutions and document roles remain available independently. AgRelOn's provenance property remains in use on source annotations.

## Meta-statements and provenance

The model carries two provenance traces separately, a semantic one and a technical one. The semantic pattern comes from AgRelOn and is transferable to every relation of the model rather than only to agent-to-agent relations, which is what makes it one cross-cutting layer above the subject layers. It carries a validity period as a blank node with a beginning and an end, a confidence value, and a provenance reference to the attesting document.

The provenance reference on an annotation points to its source document. No statement carries an invented confidence value. Historical relationship reification remains a model option only for source data that explicitly records the relationship.

`m3gim-ontology:datingEvidence` retains the source's categorical dating evidence under E-301. The former numeric confidence projection remains prohibited. An entry recorded as `erschlossen` keeps that category in the dataset and frontend; its origin must not disappear through serialization.

The technical trace is the source cell, `m3gim-ontology:xlsxSource`, a container carrying the sheet name and the one-based row number including the header row. It addresses the recording table and is distinct from a reference to the archival object. Record and link statements retain their own source row. `recordedType`, `recordedValue` and `recordedRole` preserve the source link cells alongside its original note. Duplicate-looking statements keep every witness.

Properties added from an index or Wikidata carry their own `propertySource` descriptors. Each descriptor names the property, source kind, source value and source URI; index descriptors additionally identify the index row. The exact shape is specified in [data.md](data.md) § Serialization of source fidelity. The surrounding document's source row must not be presented as evidence for an external value. Dataset and basket exports retain these descriptors. `wdPublicationDate` and `wdPremiereDate` preserve distinct authority predicates.

`m3gim-ontology:dataPointId` sits in that container but carries a subject-side bundling rather than an origin (E-125). It belongs on the attested entity rather than on the source cell address, and its successor is the two-level activity identifier of the target model.

## Financial layer

A financial item is the same node type as a dating or a location and differs only in the properties it carries, the kind of item, the unchanged cell value, the parsed amount, the currency and the role naming the kind of payment. The raw value is kept so the parsing stays checkable. The kind of item stays beside the role, because it carries the direction of the money flow and is therefore independent of the role, a document being able to carry the same amount once as income with a remuneration role and once as a sum with a mention.

Amounts appear in shifting source notation, including a trailing currency and a double amount in one cell. The parser separates an explicitly recorded currency and extracts the numeric value. A double amount becomes two annotation nodes sharing the original cell value and source row. Ambiguous currency codes retain their source spelling. A missing currency remains missing; no default may be inferred from the signature, location or neighbouring rows (E-301). Totals with an unknown currency cannot be combined with a named currency.

The contract status is not a role. The current source export records `Vertrag nicht eingehalten` in `anmerkung`. The pipeline preserves that statement as `rico:generalDescription` on its affected data points, and the record detail displays it beside their roles and dates. Legacy role-column handling remains in the pipeline. The target fields are a contract status together with a realization flag on the contract record, where the flag would be set only on explicit evidence and never inferred from missing evidence. This formal modelling remains deferred pending clarification with the cataloguing team (E-139).

Financial entries all hang on the document in the generated dataset. Substantively they attach primarily to a performance, secondarily to a contract or a journey. Binding them to the participation is decided for the target model (E-128).

## Shape of the graph

The graph is document-centred. Consumers must accept singleton objects and lists for multi-valued properties, including `hasAssociatedAgent` (E-31). Documents, archival units, source-composite annotations, source-scoped stage parts, referenced annotations and documentary form type concepts have top-level identifiers. Persons, institutions, places and works are embedded local mentions. An admitted Wikidata identifier belongs to their `authorityReference`; the local mention remains a blank node. Referenced datings and locations are top-level nodes, while `hasDetail` reaches embedded annotations.

Records carry two levels of containment. A Konvolut is an archival unit whose parts are its folios, and a folio whose pages the source records as `1_1`, `1_2` and so on is itself a record that holds those pages through `rico:hasOrHadPart` in page order. The identifier of that folio record is the signature plus the folio without the page suffix. Where the source carries no object row for the folio itself, the pipeline derives the record and marks it with `m3gim-ontology:derivedFolioRecord`, which leaves it without title and without date, because either taken from a page would state about the folio what the source states about one page of it (E-269).

Three consequences follow for anyone working with the data.

A question about all documents naming a person is answered over the recorded name or admitted authority reference. There is no independent top-level person register in the graph; person mentions are embedded. A name group alone establishes no identity.

Everything that holds only in the context of one document hangs on the embedded node, which concerns the role, the source cell and the quality flag.

On conversion to RDF, the local blank node retains the role and source-cell context of its mention. The Wikidata reference does not merge that node with other mentions of the same entity. This prevents document-specific roles from becoming global assertions about a person or city (E-301).

Two further shape decisions are worth knowing. The alias `name` stands for the RiC-O name property and `role` for the role property in the emitted context, so the serialization reads shorter than the term names suggest. And the figures describing the export sit on the root node of the serialization, which carries no type, so no domain can be given for them and they are not addressable. A node for the dataset itself would make them so.

A person or an institution mentioned in the content is serialized as a subject of the record with the corresponding agent type rather than through a project property for mentions, which keeps the model conformant, and the role value for a mention separates a recorded mention from an unrecorded role.

## Mobility perspectives

The five perspectives organize research queries over existing classes and roles. They add no classes and cannot supply the missing occurrence binding.

| Perspective | Evidence to inspect | Interpretation limit |
|---|---|---|
| Performative | Performance, guest-performance, premiere, revival and gala roles; work/performer composites and dated place annotations | Separate fragments in one document need source assessment before they can describe the same appearance. |
| Institutional | Recorded season and contract statements with their own dates | A contract or season span does not establish uninterrupted presence or realized performances. |
| Travel and correspondence | Correspondence relations, letter provenance, dispatch/receiving/departure dates and mobility place roles | A letter's endpoints do not establish the singer's journey. Actor, date and route require their own connection in the source. |
| Biographical | Residence statements and their recorded temporal context | Sparse evidence cannot establish continuous residence between attestations. |
| Discursive | Reviews, press items and critiques with creation places or publishing institutions | Publication geography can differ from the geography of the activity discussed. |

The five specially handled mobility place roles produce dateless annotations when the source supplies only a place. This preserves the recorded role without inventing a date or proving a historical movement. [data.md](data.md) § Role values owns that implementation set.

The selected, unevenly catalogued partial estate limits every query. An absent event in the dataset establishes neither historical occurrence nor historical absence. Coverage and data state must remain accessible alongside the findings.

## Limits of the model

Source-composite annotations retain the components recorded together in one link row. Separate rows do not establish a shared occurrence. Who sang which part in which performance requires an explicit source connection; the target model below remains unbuilt.

Stage-part nodes are scoped to their source row. Identically named parts remain independent witnesses. Their displayed name grouping supplies no work binding or voice type.

The same part can occur as a literal on a work index entry and as a source-scoped entity. The frontend retains an explicitly recorded index binding with its provenance. A document containing one work and several parts supplies no additional bindings.

The function of a participation, meaning singing, conducting or directing, is not expressed at the performer edge. It sits on the person node in the role property and therefore holds in the document context, unassigned to the performance.

The mobility perspectives are query patterns and not classes, and which role value belongs to which perspective is for part of the values still to be settled with the cataloguing team.

The pipeline knows a second emission path over a link type for details in which the two detail properties are populated the other way round. That path carries no rows in the current source, so the collision is inconsequential, and which reading holds is to be settled before it carries data.

## Target model v2

This section describes a state that is decided and not built. Its terms deliberately stand outside the vocabulary, listed in an editorial note of the ontology node, and their admission belongs in the implementation round so that specification and vocabulary move together.

The recording identifier becomes two-level (E-127). An integer identifies the activity, a two-digit decimal identifies the single participation in it, the occurrence identifier comes from signature, folio and activity, and the participation identifier from occurrence and participation number. This replaces the sparsely filled one-level data point identifier. Occurrence grouping has not been implemented in the current pipeline.

`m3gim-ontology:Occurrence` is the bundling node above the aspect nodes, grouping the annotation for place and time, the performance for work and part, the annotation for the amount, and the participating agents of one appearance. The name is deliberately wider than event, because not every occurrence is spatiotemporal, a contract being one that is not. The record attests it through `m3gim-ontology:attests` rather than containing it, which follows the CIDOC-CRM logic for a document attesting an activity and keeps the path to a cross-document appearance identity open. The class is a subclass of the CIDOC-CRM activity class beside the RiC-O event, and the RiC-O activity class stands ready as the closer alternative.

`m3gim-ontology:Participation` binds exactly one participating party with its function and, for singers, its sung part to the performance, which makes the statement that one person sang one part in one performance reconstructable. The stage part stays a shared reusable concept node so that a question about who sang one part over the years stays answerable, while the concrete casting sits at the participation. One performance per activity then carries its whole casting over `m3gim-ontology:hasParticipation` instead of one performance per person-role pair, with work, place and date as facets of the occurrence.

Beside these the target model carries `m3gim-ontology:performedBy` for the participating party, `m3gim-ontology:inFunction` for the controlled function, `m3gim-ontology:playsStageRole` for the sung part, `m3gim-ontology:hasFee` binding a fee to the participation while the event finances stay on the occurrence, `m3gim-ontology:mode` for the appearance mode separate from the role vocabulary, `m3gim-ontology:belongsToWork` binding a stage part to its work, and `m3gim-ontology:attachedTo` as the back-reference of a detail. The contract fields named under the financial layer belong to the same pending round.

## Recording

The German recording convention of the archive team is in [recording-guide.md](recording-guide.md). It remains German because it addresses the cataloguing team and is the target side of the data quality, whereas the compensations for what the recorded holdings actually look like are in [data.md](data.md) § Compensations in the pipeline.

## Related

- [data.md](data.md) — the source material this model formalizes
- [recording-guide.md](recording-guide.md) — the German recording convention of the archive team
- [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl) — the authoritative term list with an editorial note per term
- [`../vocab/rename-map.json`](../vocab/rename-map.json) — the mapping of the earlier identifiers onto the current ones
- [journal.md](journal.md) — the decision register behind the E-numbers cited here
- [specification.md](specification.md) — project steering and the open decisions
- [architecture.md](architecture.md) § Pipeline — how the dataset is produced
- [testing.md](testing.md) — the test gates that hold the model
- [`../data/reports/reconciliation-register.md`](../data/reports/reconciliation-register.md) — the register of authority-file and structural findings
