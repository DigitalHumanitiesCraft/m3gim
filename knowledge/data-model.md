---
title: "Data Model"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: en
version: 0.5
created: 2026-02-19
updated: 2026-09-06
authors: [Christopher Pollin]
generated-with: Claude Code
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

The authoritative term list is [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl), with an editorial note on each term and its German display label. The generated reading view of that file is `docs/datenmodell.html`. Neither list is repeated here. A model change is anchored in [data.md](data.md) first, then in the vocabulary, then in a test, and last in the pipeline (E-133).

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
| `owl` | `http://www.w3.org/2002/07/owl#` | `owl:sameAs` on reconciled entities |
| `geo` | `http://www.w3.org/2003/01/geo/wgs84_pos#` | WGS84 coordinates |
| `skos` | `http://www.w3.org/2004/02/skos/core#` | organization of the controlled vocabularies |
| `xsd` | `http://www.w3.org/2001/XMLSchema#` | datatypes |

Identical names in different namespaces are admissible and denote different things. The property for a composer and the role value for a composer are one such pair, the class for a framing event and the role value for a framing event another.

## Anchoring in RiC-O

RiC-O 1.1 carries the archival core. A convolute is a `rico:RecordSet` with `rico:Record` children joined by `rico:hasOrHadPart`, and the kind of a record set is a value of `ric-rst:` rather than a class, the fonds and the file both being record sets with a type. Agents are `rico:Person`, `rico:CorporateBody` and `rico:Group`, places are `rico:Place`. Description runs over the RiC-O description properties, and the archival dating of a unit stays on `rico:date` with the pure creation dating beside it on `rico:creationDate`.

Four subproperty edges connect the project statements to RiC-O, and all four are verified against the official component lists of RiC-O 1.1 rather than extrapolated (E-103). A performance is associated with an event, a place of an annotation is a location, a performer is a participant, and the date of an annotation is a date. Anyone querying only the RiC-O level therefore receives the project statements with it. Two earlier edges were withdrawn with E-136, the one from the annotation property, because the target node now also carries financial items that are no events, and the one onto the beginning date, because it asserted the start of a document's own duration.

Three value-form deviations remain open. The term conformance test checks that an external term exists, not that the value fits its range, and three object properties receive a value form their range excludes. Language and extent expect an individual of a RiC-O class and receive a string, and the documentary form type expects a RiC-O individual and receives a concept typed only as `skos:Concept`.

RiC-O carries more than the project uses. The roles for author, addressee, sender, receiver and publisher each have their own object property in RiC-O 1.1, while the project carries them as role values on the collecting property `m3gim-ontology:hasAssociatedAgent`, which therefore deliberately stands without a subproperty edge, because a collecting edge cannot correctly specialize any one of them. RiC-O also offers an activity class as a subclass of event, which is the anchor the target model below reaches for.

## Why these classes

The extension adds five classes, and the reason for each is a property of the material rather than a wish for expressiveness.

`m3gim-ontology:Annotation` is the load-bearing one (E-136). Every dating, location and detail hangs as its own annotation node on its subject, carries its value in a fixed value property and its recorded role in a single role property, so that no property name expresses a role any more and a consumer reaches every dating of a document through one loop. Without a place it is a pure dating, without a date a pure location. The class replaces the three earlier classes for the spatiotemporal event, the dated event and the detail annotation. It has no superclass, because the earlier subclass edge onto the event class no longer holds once financial items sit on the same node, and RiC-O 1.1 offers no fitting anchor, a detail being neither an event nor a description element of a resource. Whether it should be modelled as the reification of a statement is open.

A date row and a place row carrying the same role are not merged into one node (E-139). Merging would assert a togetherness the recording did not record, the derivation is left to the interface, and the source cell stays single-valued per node.

`m3gim-ontology:Performance` is an event in which a work is realized and at the same time the reification node for the composites of stage part with performer and of date with work. `m3gim-ontology:FramingEvent` is the superordinate event within which single performances take place, a festival, a concert series or a season, and its name follows the English label of the term rather than describing a performance (E-139). `m3gim-ontology:MusicalWork` is identified through the work index. `m3gim-ontology:StageRole` makes the stage part a reusable entity rather than a string attribute, because parts recur across documents and years and are referenced as such.

### Roles as one property

The recording carries a single role column. Before the rebuild the pipeline distributed its values over four properties differentiated by link type, for the date, the detail, the event and the place. All four already drew from one vocabulary and therefore collapse into `m3gim-ontology:role` (E-137).

The property is an object property with `skos:Concept` as its range. The role value is a reference to a concept, and the referencing node carries that concept's `skos:prefLabel` along, so the display text is available without a lookup and the values stay machine-readable through the IRI. Where the source carries no role the node carries none, and a role inferred from position arises nowhere. A value outside the vocabulary stays a literal, which in these holdings concerns the contract status alone.

The role holds only in the context of its document but hangs on the entity node. Where that node carries a Wikidata IRI, the document context is lost on merging to RDF, which is the consequence discussed under the shape of the graph below.

### Property families

The term list itself is in [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl) and in `docs/datenmodell.html`. Six families exist, and only what a reader cannot see from the term names is stated here.

The relational properties connect an archival resource to an agent, a performance, an annotation or a detail, and the performance in turn to its work, its performer and its stage part. The detail property remains a subproperty of the annotation property although both point at the same class now, because it keeps a financial item addressable in one triple and preserves the access path the interface reads.

The descriptive and dating properties are strings throughout. Every date value is a string, because historical dating regularly exceeds the schema strictness of a date datatype through spans, incomplete values and the three qualifiers, so whoever filters by time parses those forms. Where several recorded role values merge onto one concept, `m3gim-ontology:derivedFromRole` keeps the original value.

Two properties sit on the role concept rather than on the data and were a hand table in the interface until they moved into the vocabulary (E-150). `m3gim-ontology:datingScope` names what a dating dates and draws from the scheme of dating scopes, and only a dating of the object itself and a dating of an attested event may date a document, the remaining scopes staying readable without setting the time anchor. `m3gim-ontology:datingRank` is an integer deciding between several anchoring datings of one document, the smaller value taking precedence, and a concept without a rank sorting behind every concept with one.

`m3gim-ontology:unresolvedAggregate` is true on a main-holdings record that stands at top level without a folio and therefore denotes a collective unit whose folio cataloguing is pending. It replaces a character test on the signature that the interface performed itself, because the holdings group is a statement of the material and belongs in the dataset rather than in display logic.

The quality properties carry a controlled flag derived from uncertainty signals in the note field, together with a confidence value that is declared and deliberately empty (E-102, E-106). The note texts yield no quantifiable confidence signal, and a number set there would be exactly the invented confidence the guardrail forbids. The flag itself is the uncertainty signal.

The authority-data properties injected from the Wikidata enrichment use an established vocabulary wherever one carries, life dates through schema.org and occupation through the GND literal property, and stay under the project namespace only where none does (E-105). Their four time values are cut to the precision attested in Wikidata and therefore carry the forms of EDTF level 0, with the precision level implicit in the length of the value (E-132). Beside them the curated index properties pass the index columns through onto the entity, which is what reaches an unmatched entity without a Q-identifier. Curated and enriched values stay separate on purpose, and where they overlap, as the curated note does with the enriched occupation, the resolution is open.

Two properties are declared and emitted only where the source column exists, the access status and the digitization status. The current object export carries neither column, so both terms carry an editorial note marking them unused, which the vacancy test demands as the excuse of an empty term.

## Identifiers

An annotation node receives a content-based identifier, a hash over place, role and date prefixed by the record-local identifier, with a stable ordinal suffix where genuine content duplicates occur on one record (E-115). The identifier is thus a pure function of its content and stable against the row order of the source.

A stage part receives a deterministic slug identifier with umlaut transliteration and is deduplicated over it. The vocabulary stays separate from this, because it carries relation roles as values and not stage parts as entities.

Documents and convolutes keep the archival signature as their local name. An additional type marker would add no distinction and would break every bookmark a second time, because the record identifier travels into the URL hash of the application.

## Controlled vocabularies

The vocabulary carries its concepts in six SKOS concept schemes, one for the roles an agent takes in a document, one for the roles in which a dating, a location or an entity reference stands to its document, one for the kinds of financial item, one for the degree of definiteness of a statement independent of the target node, one for the dating scopes, and one hierarchical scheme of documentary form types.

The scheme of annotation roles unifies what was first proposed as separate schemes for event, place and date roles. With one annotation node the same concept carries a dating, a location or both, so a split by date and place roles has no object. Where a date role and a place role named the same aspect they collapsed into one concept and lost their aspect ending, because the aspect sits in the value property and the role name only repeated it. The original recorded value survives in the derived-from-role property.

The scheme of financial item types stays beside the annotation roles, because no value of the financial layer occurs as a date or place role in these holdings or the other way round. Two exceptions exist, the qualifier for a mention, which has its own scheme, and a performer value on a detail, which names no financial item and is to be checked as a recording error.

Beside the schemes the vocabulary carries collections grouped by the target a role appears on in the dataset, roles at persons, at corporate bodies, at groups, at places, at works, at framing events, at datings, at financial details, and the mobility place roles. A role may sit in several collections, because the same column serves different target types. The pipeline reads none of these collections. It reads the vocabulary for the concept definitions, the role labels, the dating scope and rank, and the documentary form type hierarchy, and it holds the mobility place roles as a hard-coded German set in `scripts/transform.py` ([data.md](data.md) § Role values). The collection and the set are therefore two statements of the same thing that can drift apart.

The documentary form types are hierarchical so that a query can filter granularly by letter or aggregated by correspondence. The pipeline emits only the edges of the second level, so the root of the tree is not reachable in the dataset, and every emitted concept carries a readable German label instead of a bare slug (E-101). Two concepts of the tree are worth naming. `m3gim-vocab:collection` deliberately carries no broader edge onto `m3gim-vocab:bundle`, because the is-a relation between the two is not pre-decided and their distinction is still to be settled. `m3gim-vocab:program` is the canonical concept of its branch, and the source spellings for a programme booklet and a concert programme resolve onto it as alternative labels (E-131).

## AgRelOn

AgRelOn, the Agent Relationship Ontology of the German National Library, models relations between agents over a categorized vocabulary of relation types. The model integrates it as a complementary layer for agent-to-agent relations and for meta-statements. It replaces no part of the project model, because its scope is limited to agent and agent and covers neither spatiotemporal nor work-related nor archival relations. The reasons for using it are a standard vocabulary for the institutional and the correspondence layer, connectivity to GND-based holdings of other archives, and one uniform meta-statement pattern.

Five relation classes occur in the dataset, for correspondence, for professional contact, for the employment relation, for patronage and for membership. A colleague relation and a student-teacher relation stand ready as an extension space and are not served by the current mapping pattern. The relations hang on the attesting document over `m3gim-ontology:hasAgentRelation`, which stands without a range, because AgRelOn does not carry its relation classes under a common superclass attested here.

The n-ary reification pattern, meaning one class per relation type with the agents in subject and object position and validity as a blank node, corresponds exactly to AgRelOn (E-104, amended E-69). Validity, confidence and provenance are the metadata properties of AgRelOn and not the has-properties. The reification carries both the subject and the object side.

Two departures from the plain subject-object shape follow from AgRelOn itself. Where the relation property is declared symmetric, which in this dataset is correspondence, the pipeline emits `agrelon:hasSubjectObject` with both sides in one list, because both carry the same role and a subject-object split would assert a direction the concept does not know. The actual direction, meaning who wrote and who received, is a statement about the document and stays as the recorded role on the respective side. For patronage the orientation is reversed against the default, because the patron holds the subject position and the patronized person sits at the object, which follows the direction of the first name part of the class as the AgRelOn comment on the symmetric property prescribes.

The pipeline sets the creator of the fonds as the fixed subject of every relation. Where she is at the same time the addressee or the sender of the document, a correspondence relation from her to herself would arise, with an identical Wikidata identifier on both sides. In a personal estate that is the regular case rather than an exception, and such relations are suppressed while the role assignment stays on the record with its source cell, so nothing is lost (E-129). Whether the actual counterpart is drawn in as the relation target is open.

Because a contracting party and an employer map onto the same AgRelOn class, the origin is no longer distinguishable without the derived-from-role property. The validity period is set for the employment relation alone and carries, as a heuristic, the year of the record's date as a beginning, with no end date, because the source gives none.

## Meta-statements and provenance

The model carries two provenance traces separately, a semantic one and a technical one. The semantic pattern comes from AgRelOn and is transferable to every relation of the model rather than only to agent-to-agent relations, which is what makes it one cross-cutting layer above the subject layers. It carries a validity period as a blank node with a beginning and an end, a confidence value, and a provenance reference to the attesting document.

The provenance reference sits on the agent relations and on the annotation nodes and points at the document that attests the statement. Since both hang on that document, the reference is currently a self-reference. Whether the agent relations should instead be carried as their own graph nodes referring to their evidence is open. No statement carries a confidence value.

The dating evidence column of the source is deliberately not serialized (E-106). The earlier mapping of its categorical values onto decimals was an invented projection and no measured value. Should the evidence be needed later it returns as a categorical value, and a decimal is not revived.

The technical trace is the source cell, `m3gim-ontology:xlsxSource`, a typeless container carrying the sheet name and the one-based row number including the header row. It addresses the row in the recording table and serves pipeline and review, and it is not a scholarly source reference. It sits on the record, on every annotation node whether referenced or embedded, on every performance and every entity node derived from a link row, and on every agent relation. Direct record properties receive none, because their origin is implicitly that of the surrounding record, which keeps the serialization readable without repeating provenance per atomic property.

`m3gim-ontology:dataPointId` sits in that container but carries a subject-side bundling rather than an origin (E-125). It belongs on the attested entity rather than on the source cell address, and its successor is the two-level activity identifier of the target model.

## Financial layer

A financial item is the same node type as a dating or a location and differs only in the properties it carries, the kind of item, the unchanged cell value, the parsed amount, the currency and the role naming the kind of payment. The raw value is kept so the parsing stays checkable. The kind of item stays beside the role, because it carries the direction of the money flow and is therefore independent of the role, a document being able to carry the same amount once as income with a remuneration role and once as a sum with a mention.

Amounts appear in the source in shifting notation, including a trailing currency and a double amount in one cell. The parser separates the currency first and then extracts the numeric value, and a double amount becomes two independent annotation nodes with the same kind of item, so no attested amount is lost. Where the source is unambiguous the ISO 4217 code stands, and historical or ambiguous currencies keep their original code from the source rather than being normalized speculatively. The value range therefore mixes ISO codes and source spellings, and machine evaluation would need a second field with the normalized code. Where the currency is missing the pipeline sets an editorially justified default for two locations, and that derived character is not marked in the data.

The contract status is not a role. An unfulfilled contract is marked in the source in the role column and passed through over a whole contract block, the vocabulary deliberately carries no concept for it, and the role property keeps it as a literal. The target fields are a contract status together with a realization flag on the contract record, where the flag would be set only on explicit evidence and never inferred from missing evidence. The decision is deferred, because it presupposes a clarification with the cataloguing team (E-139).

Financial entries all hang on the document in the generated dataset. Substantively they attach primarily to a performance, secondarily to a contract or a journey. Binding them to the participation is decided for the target model (E-128).

## Shape of the graph

The graph is document-centred. Standing as independent top-level nodes with their own identifier are documents, archival units, performances, stage parts, the annotations referenced through the annotation property, and the documentary form type concepts attested in the holdings. Persons, institutions, places and works stand embedded in the document that names them. Where an entity is reconciled against Wikidata, the embedded node carries that identifier, otherwise only a name. The annotations come in two build forms, the referenced datings and locations as top-level nodes addressed by identifier, and the details reached through the detail property as embedded nodes without an identifier of their own.

Records carry two levels of containment. A Konvolut is an archival unit whose parts are its folios, and a folio whose pages the source records as `1_1`, `1_2` and so on is itself a record that holds those pages through `rico:hasOrHadPart` in page order. The identifier of that folio record is the signature plus the folio without the page suffix. Where the source carries no object row for the folio itself, the pipeline derives the record and marks it with `m3gim-ontology:derivedFolioRecord`, which leaves it without title and without date, because either taken from a page would state about the folio what the source states about one page of it (E-269).

Three consequences follow for anyone working with the data.

A question about all documents concerning one person is answered over the name or the Wikidata identifier in the embedded node. There is no person node.

Everything that holds only in the context of one document hangs on the embedded node, which concerns the role, the source cell and the quality flag.

On merging to RDF the document context falls away and those context-dependent statements travel to the globally identified entity. A city then carries all place roles of all documents at once and a person all agent roles. The JSON tree holds the context, the flat triple does not.

Two further shape decisions are worth knowing. The alias `name` stands for the RiC-O name property and `role` for the role property in the emitted context, so the serialization reads shorter than the term names suggest. And the figures describing the export sit on the root node of the serialization, which carries no type, so no domain can be given for them and they are not addressable. A node for the dataset itself would make them so.

A person or an institution mentioned in the content is serialized as a subject of the record with the corresponding agent type rather than through a project property for mentions, which keeps the model conformant, and the role value for a mention separates a recorded mention from an unrecorded role.

## Mobility perspectives

Mobility is the central substantive question of the project, meaning where the creator of the fonds performed, where she was engaged, where she travelled, with whom she corresponded and where she was written about. The model supports the question through five perspectives realized as query patterns over the existing classes and roles. There are no classes for them, because they are different cuts through the same data.

Performative mobility asks where she performed and reads the annotation nodes whose role is a performance, a guest performance, a premiere, a revival or a gala performance, or alternatively the performances with a performer together with their place annotation and their date.

Institutional mobility asks where she was engaged and reads the annotation nodes carrying the season role, supplemented by the employment relations with their validity period.

Travel and correspondence mobility asks where she was when and reads the correspondence relations with their provenance on letters, supplemented by the mobility place roles and by the datings for dispatch, receiving and departure.

Biographical mobility asks after residences and reads the residence role with its time span over the AgRelOn validity period.

Discursive mobility asks where she was written about and reads the records whose documentary form type is a review, a press item or a critique together with a place in the creation role, or a publishing institution with a place reference. The discursive space typically diverges from the performative one.

The five mobility place roles attest a mobility event by themselves and produce a dateless annotation node beside the place reference. The missing date is itself the statement, because the source gives none and none is guessed. A residence is expressly not among them, being a state with a validity period rather than a point event.

Every mobility analysis carries the current state of cataloguing with it. Only part of the convolutes is opened down to the folio, the rest stays on the level of the archival unit, and dates as well as titles are selectively present. The data therefore attest the state of the cataloguing, and an event without evidence in the opened part of the holdings does not appear in the dataset although it took place. Mobility maps are to be communicated as an interim state of the cataloguing and not as a reconstruction of the biography, and that survivorship bias must be marked in words at any visualization.

## Limits of the model

A performance falls apart into several nodes, because one arises per link row. Who sang which part in which performance is not reconstructable from that. The answer is the target model below, which is decided and not built.

Stage parts are global and carry neither a work binding nor a voice type. Identically named parts of different works collapse, because deduplication runs over the name alone. Whether that holds is to be settled with the cataloguing team.

The same part sits twice in the model, as a literal on the work from the work index and as an entity of its own, with no connection between the two.

The function of a participation, meaning singing, conducting or directing, is not expressed at the performer edge. It sits on the person node in the role property and therefore holds in the document context, unassigned to the performance.

The mobility perspectives are query patterns and not classes, and which role value belongs to which perspective is for part of the values still to be settled with the cataloguing team.

The pipeline knows a second emission path over a link type for details in which the two detail properties are populated the other way round. That path carries no rows in the current source, so the collision is inconsequential, and which reading holds is to be settled before it carries data.

## Target model v2

This section describes a state that is decided and not built. Its terms deliberately stand outside the vocabulary, listed in an editorial note of the ontology node, and their admission belongs in the implementation round so that specification and vocabulary move together.

The recording identifier becomes two-level (E-127). An integer identifies the activity, a two-digit decimal identifies the single participation in it, the occurrence identifier comes from signature, folio and activity, and the participation identifier from occurrence and participation number. This replaces the one-level data point identifier, whose column is nearly never filled in the source, which is why the occurrence model built on it never takes effect.

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
