---
title: "Source Material"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: en
version: 0.7
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
topics: ["[[RiC-O]]", "[[AgRelOn]]", "[[Data Modelling]]", "[[Controlled Vocabularies]]"]
knowledge-sources:
  standards:
    RiC-O: https://www.ica.org/en/records-context-ontology
    AgRelOn: https://d-nb.info/standards/elementset/agrelon
    Wikidata: https://www.wikidata.org
related: [data-model, research-framework, architecture, journal, testing]
---

# Source Material

This document is the spec-first anchor of the data model. It describes what the source material is, how the cataloguing team records it, and which properties of the source the pipeline compensates for. A change to the model is anchored here first, then in the vocabulary, then in a test, and last in the pipeline (E-133).

The formal side, meaning classes, properties, controlled vocabularies and serialization, is in [data-model.md](data-model.md). The German recording convention of the archive team is in [recording-guide.md](recording-guide.md). The pipeline implementation is in [architecture.md](architecture.md), the research frame in [research-framework.md](research-framework.md), the requirements in [specification.md](specification.md). Running figures live in the quality snapshot under `data/reports/`, this document carries none.

## Source fidelity contract (E-301)

The project lead requires source statements and extracted values to reach the frontend without additional historical interpretation. This contract supersedes earlier permissions for inferred currencies, fonds-centred agent relations, inferred relationship periods, name-based identity repairs, single-work stage-part associations and editorial timeline phases. Implementation and verification status are recorded in [plan.md](plan.md).

Rows containing only a signature or folio reference and no type, value, role, date or note remain in the original export but produce no source statement. A row that adds only a type while value, role, date and note remain empty is an incomplete recording rather than a source statement; the pipeline reports its sheet and row and emits no annotation. Preserving either incomplete shape must not create an apparent annotation or enlarge the linked document basis. A value, role, date or note remains substantive source content even when its type is absent.

- Keep the source exports unchanged. Preserve each contributing source row, its recorded type, value, role and note, and its sheet and row. A duplicate-looking row remains a separate witness. An absent record identifier or an unmatched link is a reported source defect; it does not authorise inventing an archival record or assigning the row to a plausible neighbour.
- Preserve missing values. Do not supply a currency, event role, participant, work association, relationship or relationship date from context. A recorded `Aktivität` remains an activity statement without an invented subtype. `dokument` remains a recorded document mention and creates no archival containment. Other unsupported link values remain neutral statements with their recorded type and value, without a guessed entity family. If a composite type supplies no separable components, retain the complete value as a neutral statement. For example, `ort, datum` with the single value `06-09` cannot establish both a place and a date; `Wien, ab 1956` explicitly supplies both components.
- Existing composite cells may be split into their explicitly recorded components. Their carriers are `Annotation` nodes. The legacy `hasPerformance`, `hasPerformer`, `performanceOf` and `hasStageRole` access paths describe those recorded components and imply no real event, participation, fulfilment or co-presence. Preserve existing statement identifiers. Vocabulary domain, range and subproperty declarations must not reintroduce such implications.
- Name folding serves text search only. It must not replace source names or merge person identities. An explicit shared source identifier permits grouping; name equality alone permits grouping of equally written mentions only, without asserting common historical identity. Identifier-less index rows must not inherit an identifier from a namesake. Conflicting index values remain unresolved and retain their source evidence.
- Authority identities already recorded in an index or explicitly approved by a human remain usable as separately sourced authority information. Algorithmic exact, alias or fuzzy matches remain review candidates until explicitly approved. Unknown approval states fail closed. Retain the existing authority caches unchanged; do not turn a candidate into an assertion merely to retain previous coverage.
- Every value added from an index or authority source carries a property-level source descriptor. The descriptor names the emitted property, source kind, source location and original value. A source row on a surrounding archival mention does not establish the origin of an enriched property. The UI and exports distinguish recorded archive statements, index information and Wikidata information.
- Entity mentions keep document-local nodes. `authorityReference` links a mention to a source-recorded or approved authority identifier. Neither a global Wikidata `@id` nor `owl:sameAs` stands on the node carrying local roles and source rows. Stage-part identifiers are scoped to their source statement; shared labels do not establish historical identity. These limits must also hold after RDF expansion.
- Dates preserve value, precision, qualification and dating evidence. `ab` and `seit` are not rewritten as `nach`; publication and premiere remain distinct properties. The shared document-time filter uses the recorded document date, preserving intervals and open or qualified boundaries. Content dates remain independently explorable and must not silently become a document's date. Uncertain values receive no invented tolerance or exact-year assignment. A year filter respects exclusive `vor`/`nach` boundaries at calendar edges; `ab`/`seit` remain inclusive. Inner-year limits retain the year when it still contains admissible dates. The original `datierungsevidenz` category is retained.
- Counts, intersections and presentation groups are permitted when their unit and basis are explicit and every contributing source witness remains retrievable. A shared document establishes a shared document occurrence of the recorded terms. It does not establish a personal relationship, appearance, presence or journey. Maps identify their coordinate source and spatial granularity.
- The research interface contains no hardcoded biographical phases or categories guessed from personal names. Source-grounded research context remains in the research documentation.

### Serialization of source fidelity

Index provenance uses a content-addressed `urn:sha256:` reference to the original XLSX bytes, together with its sheet and row. This identifies the exact input independently of the checkout directory and avoids publishing local filesystem paths. The four versioned index files resolve these hashes. Wikidata provenance retains the authority entity URI and the property-specific value from the unchanged local cache.

`m3gim-ontology:recordedType`, `recordedValue` and `recordedRole` preserve the original link cells; `rico:generalDescription` preserves the recorded note. These literal fields describe the source statement, not a classification inferred by the application. Existing `xlsxSource` supplies sheet, row and the recorded data-point identifier. Neutral unsupported statements use `hasDetail` with `detailField` holding the recorded type and `detailValue` holding the recorded value, alongside these original fields.

`m3gim-ontology:datingEvidence` retains the object table's categorical evidence value without a numeric confidence score. `m3gim-ontology:wdPublicationDate` preserves an authority publication date independently of `wdPremiereDate`.

`m3gim-ontology:authorityReference` is an object reference such as `{"@id": "wd:Q94208"}` on a local mention. The reference carries no document role or source-row properties; those belong to the surrounding local node. This is a link to authority information and declares no `owl:sameAs` equivalence between the source statement and the authority entity.

`m3gim-ontology:propertySource` is a list of source descriptors for added properties. Each descriptor carries `m3gim-ontology:sourceProperty` (the emitted property name), `m3gim-ontology:sourceKind` (`index` or `wikidata`), `m3gim-ontology:sourceValue` (the original source value), and `dcterms:source` (the index file or authority entity URI). Index descriptors additionally carry `xlsxSource` identifying the index row. The descriptors survive dataset and basket exports and are used for value-specific UI attribution. Record- and link-derived fields use their own original fields and source row; no second descriptor is needed for every directly transcribed cell.

## Sources and holdings groups

The material is the UAKUG/NIM holdings at the archive of the University of Music and Performing Arts Graz, the partial estate of the mezzo-soprano the fonds stems from. It falls into three holdings groups, and the group is readable from the signature.

| Group | Signature form | Character |
|---|---|---|
| main holdings | `UAKUG/NIM_nnn` | letters, contracts, press, programmes, photographs, held as convolutes |
| posters | `UAKUG/NIM/PL_nn` | individual items, note the slash before `PL` |
| sound carriers | `UAKUG/NIM_TT_nn` | individual items, shellac discs and recordings |

Earlier corpus inspection found datings from 1919 to 2010, including a poster and a later exhibition. This observed span is not a validation rule. A date outside it must retain its source wording and may be referred for source review; the span alone cannot establish an error.

Cataloguing is selective and unfinished. Title and document type are the best covered fields, creation date is middling, extent and language are thin, and only a growing selection of convolutes is opened down to the folio. Any analysis of this material carries that coverage with it. Which convolutes carry folios, and how far each field reaches, is in the quality snapshot.

## Source format

The authoritative source format is the CSV export of the spreadsheet. The reason is that the XLSX export converts date, folio and bundling columns into cell types and thereby invents precision the recording does not carry, a bare month becoming the first of that month and a year-less entry becoming a calendar date of the export year (E-152). The CSV export passes the recorded text through unchanged.

The link table lives as one CSV per sheet under `data/google-spreadsheet/verknuepfungen/`, currently nine box exports plus the value list `Typ-Rolle.csv`. File names carry the sheet label with an underscore, `Box_1.csv` and so on, while the sheet name in the provenance keeps the spelling of the source, `Box 1`. An incomplete or scaffolding row remains in its raw box export; the source-fidelity guard above prevents it from creating an apparent statement or enlarging the linked document basis. The object table is a CSV as well, `M3GIM-Objekte.csv`, beside the workbook. Ordinary production requires these CSV exports. The four index tables stay XLSX, because they hold no endangered column.

`resolve_verknuepfungen_source` takes every `Box_*.csv` in that directory. A missing required source stops production with an explicit error. Any legacy XLSX reader is a compatibility path, not an equivalent production input.

## Tables and columns

Six tables carry the material. The object table holds the record metadata, the link table the relational enrichment, the four index tables the normalized entities of the four families.

| Table | Columns as the source writes them |
|---|---|
| object table | `archivsignatur`, `folio nr`, `titel`, `entstehungsdatum`, `datierungsevidenz`, `dokumenttyp`, `sprache`, `umfang`, `bearbeiter:in`, `erfassungsdatum`, `Bearbeitungsstand`, plus per-table completion flags |
| link table | signature column with a blank header, `Folio`, `datenpunkt_id` or `data_id`, `typ`, `name`, `rolle`, `anmerkung` |
| person index | `m3gim_id`, name, `wikidata_id`, `lebensdaten`, `anmerkung` |
| organization index | `m3gim_id`, name, `wikidata_id`, `ort`, `assoziierte_person`, `anmerkung` |
| place index | name, plus a column marking what was added during recording |
| work index | `m3gim_id`, title, `wikidata_id`, composer, `rolle/stimme`, `anmerkung` |

The bundling column of the link table carries two spellings, `datenpunkt_id` in some sheets and `data_id` in others. Both name the same value and the loader merges them. The signature column of the link table has a blank header and is filled only where the signature changes, so it is recognized by position and forward-filled per sheet.

Several index sheets have lost their header row, meaning a data value stands where the column name belongs. The name columns of the person, place and work index and one identifier column of the organization index are affected. The pipeline recognizes those columns by position and pushes the leaked value back into the data.

The folio column of the object table is called `folio nr` today and was called `folio` and an unnamed column before. The pipeline accepts all variants through a heuristic column detection with a regular expression fallback.

### Identity and precedence in the index tables

An index may carry the same name more than once. The source fidelity contract governs whether values can be associated with the same identity.

Identity comes from `m3gim_id` where a row carries one. Rows sharing that explicit identifier may be grouped while preserving their witnesses. An identifier-less row keeps its own identity evidence and does not inherit an identifier from a namesake. Equal written names support a group of mentions only. Two rows with the same name and different identifiers remain a name collision.

Within an explicitly recorded identity, consistent values can be consolidated with all their source witnesses. Conflicting scalar values remain unresolved instead of choosing the first row. The associated-person field of the organization index is multi-valued and retains each recorded value with its provenance.

In the work index the title alone is not an identity, because different works share it. The key is the pair of title and composer. A link row naming only a title and matching more than one index entry is not resolved. The work then appears with its title, without a composer, and with the quality flag for an ambiguous name, and the ambiguity enters the validation report.

### Convolutes, folios and record identity

Record identity is the archival signature plus the optional folio, joined by a space. Convolutes are aggregating units serialized as `rico:RecordSet` with children on folio level as `rico:Record`. Links hang on the most granular level available. Where a collective row and its folio rows share one signature, the aggregate keeps a suffix on its identifier so the two do not collide.

Part of the main holdings is not yet resolved into individual items. Such a record stands at top level without a folio, but it denotes a collective unit whose folio cataloguing is pending rather than a single document. The pipeline sets `m3gim-ontology:unresolvedAggregate` on those records. The property follows from the holdings group of the signature and not from the content of the row, so main-holdings convolute signatures carry it while posters, sound carriers and any record with a folio do not.

## Date notation of the source

Dates are recorded as text in ISO 8601 with the granularity the source supports.

| Situation | Format | Example |
|---|---|---|
| complete | YYYY-MM-DD | 1958-04-18 |
| month only | YYYY-MM | 1958-04 |
| year only | YYYY | 1958 |
| time span | YYYY-MM-DD/YYYY-MM-DD | 1958-08-10/1958-09-09 |
| time span of years | YYYY/YYYY | 1945/1947 |
| season in the source spelling | YYYY-YYYY | 1947-1952 |

The season form with a hyphen is the spelling of the source, and `clean_date()` normalizes it onto the slash form without loss. Four qualifiers prefix a value, `circa:` for an approximate dating, `vor:` for a terminus ante quem, `nach:` for a terminus post quem, and an empty value for undated.

A value of the form `YYYY-MM-DD 00:00:00`, including the `T` separator variant, is outside the admissible source notation. Validation reports W010 at the source row in both object and link tables before date cleanup. The apparent day precision requires source review. The legacy transformer still removes the space-separated midnight suffix and can emit the remaining calendar date; it retains the `T` variant as a malformed annotation. Validation exposes this compatibility limit and does not infer the intended precision. The current source export contains neither timestamp form. Month and day places without padding, as in `1956-5-13`, are a source error and enter the report as well. The pipeline does not pad them, because padding produces exactly the claim the move to the CSV source removed.

The notation decides the representation. A complete or partial ISO date becomes a date property, and a range keeps both boundaries and their precision. A bracket or question-mark uncertainty such as `1957-[05-27?]` remains an annotation value. A free-text beginning such as `ab …` or `seit …` retains its wording and inclusive beginning. No qualifier is replaced by one with a different meaning.

Complete dates must also be possible calendar dates, and month values must be in range. Regular validation reports violations at the source cell; it does not infer a corrected date. The three current impossible complete link dates remain editorial findings and retain their strict source-fix test.

The object table carries a separate column for dating evidence with the values `aus_dokument`, `erschlossen`, `extern` and `unbekannt`. Its recorded category is serialized as `datingEvidence`; a missing category remains missing ([data-model.md](data-model.md) § Meta-statements and provenance).

## The link mechanism

One row of the link table carries one statement about one record. The `typ` column steers the target context, and the `name` column provides the recorded name. An absent or unsupported type is preserved as a neutral detail statement with its original cells and enters the validation report. It receives no guessed entity family. A type proposal is produced separately after the pattern of `scripts/propose-links.py` (E-147).

| `typ` | Target |
|---|---|
| `person` | person index, `rico:Person` |
| `institution` | organization index, `rico:CorporateBody` |
| `ensemble` | `rico:Group` |
| `ort` | place index, `rico:Place` |
| `werk` | work index, `m3gim-ontology:MusicalWork` |
| `rolle` | stage-part component on a neutral `Annotation` |
| `datum` | annotation node with a date |
| `ereignis`, `Aktivität`, `dokument` | neutral `Annotation` retaining the recorded type and value |
| `ort, datum` | annotation node with place and date (E-96) |
| `datum, werk` | annotation with the work and date recorded together |
| `rolle, person` | annotation with the stage part and person recorded together |
| `ort` in a mobility place role | place reference plus a dateless annotation node (E-97) |
| `ausgaben, währung`, `einnahmen, währung`, `summe, währung` | annotation node carrying a financial item |

The formerly omitted `Aktivität` and `dokument` rows are retained as neutral statements under E-301. This adds no subtype, occurrence grouping or archival record. The handler for a source type `detail` remains available, although no current source row carries that type.

Dependent dropdowns enforce the value lists for `typ` and `rolle` at the source. Since a Google Sheets dropdown value carries no comma, a composite type may appear with an underscore in the export, attested for `einnahmen_währung`, `ausgaben_währung`, `summe_währung` and `ort_datum`. The pipeline accepts the underscore as an equivalent composite separator.

### Composite link types

Every composite type resolves into a target entity with typed properties by the same pattern. The formal version is the vocabulary together with `decompose_komposit_typ()` in the pipeline.

| Composite | Target | Special rule |
|---|---|---|
| `ort, datum` | annotation node with place and date | the mobility core of the model ([data-model.md](data-model.md) § Mobility perspectives) |
| `datum, werk` | annotation with work and date | an unparseable or ambiguous composite retains its complete original value as a neutral detail; no component is guessed |
| `rolle, person` | annotation with stage part and person | both source spellings of the type are treated alike |
| `rolle` alone | annotation with a stage-part component only | it establishes a recorded part name without claiming an appearance |
| `ort` in a mobility place role | place reference plus a dateless annotation node | the missing date is itself the statement, because the source gives none and none is guessed |
| the three currency composites | annotation node carrying amount, currency and financial role | amount parsing and double amounts in [data-model.md](data-model.md) § Financial layer |

## Role values

`Typ-Rolle.csv` is the source of the role values. It lists, per link type, the roles the dropdown offers, and it is therefore the authoritative list of what may be recorded. The document does not repeat it. The concepts these values resolve onto, with their definitions and their German display labels, are in [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl) and in the generated model page `docs/datenmodell.html`. Neither list is a superset of the other, because the value list carries values the vocabulary has not yet taken up and the vocabulary carries concepts specified ahead of the recording.

Role normalisation removes the colon suffixes `:in` and `:innen` and levels capitalization. A bare trailing `in` is preserved because it can be part of a word stem. Subsequent vocabulary resolution keeps an incoming alias in `m3gim-ontology:derivedFromRole` when it differs from the concept's preferred label. The earlier spelling and gender-suffix normalisations remain traceable through the source cell. The vocabulary supplies the display labels; changing their gendered form remains an editorial decision.

Two legacy role-column patterns require special handling. `CONTRACT_STATUS_ROLES` prevents an unfulfilled-contract status from being treated as a role. The current export records `Vertrag nicht eingehalten` in `anmerkung`; the pipeline preserves it as `rico:generalDescription` at the affected data point. A date role inherited by the place half of an `ort, datum` composite is stripped from the place because it supplies no place role.

The five mobility place roles are the one group the pipeline treats specially, as the German set `MOBILITY_PLACE_ROLES` in `scripts/transform.py`. Its members are `zielort`, `absendeort`, `abreiseort`, `empfangsort` and `vertragsort`. A residence is deliberately not among them, because it is a state with a validity period and not a point event.

### Dating scope and rank

Role metadata describes the recorded aspect of a content dating. It is distinct from the document date and cannot select a replacement for it (E-301).

`m3gim-ontology:datingScope` names the aspect a dating refers to and draws from the scheme `m3gim-vocab:datingScopes`. Each statement keeps its own role and date. The shared document-time filter reads the explicit object dating; content dates remain separately explorable.

The legacy `m3gim-ontology:datingRank` remains available as vocabulary metadata. It supplies no authority to infer one primary historical date from several source statements. Intervals retain both bounds; qualification and absence stay visible.

## Naming conventions and place duplicates

Persons are set as surname, given name, with a nobiliary particle following the given name. Places carry the customary German name and keep the historical form of the source. Institutions carry the official designation without a legal form. Works carry the title of the source, with the composer as a separate field.

Two kinds of place duplicate are consolidated before normalization. A trailing space produces a second entry of the same place and is trimmed away. A place given with a street address becomes its own place entry linked to the plain place by `skos:broader`. A free-text mixture of place and time in one cell is split into an annotation node carrying the place and the date separately.

## Processing status

Two value systems for the processing status run in parallel. The recording guide specifies `in_bearbeitung`, `schicht1_fertig`, `schicht2_fertig` and `abgeschlossen`, which mirror the layer progress and allow a coverage measurement per layer. The pipeline normalizes onto `begonnen`, `abgeschlossen` and `zurueckgestellt` through `normalize_bearbeitungsstand()`, which absorbs the inconsistent spellings and synonyms of the source. Which system holds is an open decision, and only its answer makes the degree of cataloguing measurable per layer.

## Compensations in the pipeline

The recording is the authoritative source. The following categories distinguish required format conversion, source defects and editorial assumptions so each compensation can be assessed against its evidence. The code sits in `scripts/_common.py` and `scripts/transform.py`, the concrete findings with file, location and field are in the handover list under `data/reports/`.

The compensations fall into three categories. A specification compensation is a structurally unavoidable format transformation that hides no data error, meaning the underscore variant of a composite type, the removal of gender-inclusive role notation, the restriction of Wikidata raw values to the pattern of a Q-identifier, and the skipping of hidden dropdown helper sheets on the XLSX path.

A workaround compensates for a property that can be corrected at the source. The retained structural cases include lost index headers, the shifting folio column name, a literal `Folio` placeholder, recording spread across box sheets, sparsely filled signature columns, collective and folio rows sharing a signature, and the two bundling-column spellings. Raw monetary notation, malformed dates, recorded contract notes and typeless statements remain accessible. Index conflicts stay unresolved. A bare stage-part row and a part/person composite both retain their source witnesses; the former deduplication is prohibited by E-301.

A template row whose signature reads `beispiel` is excluded as recording scaffolding. Currency defaults based on signature prefixes are prohibited by E-301; a missing currency stays missing. Earlier approvals of such assumptions remain historical decision evidence only.

## Target model, decided and not built

The current link table supplies document-level statements and composite fragments. It does not reliably bind all persons, parts, places and payments to an individual appearance. Existing `datenpunkt_id`/`data_id` values are retained as source metadata; transformation does not construct occurrences from them.

The decided two-level activity/participation identifier requires human source grouping and an adapted pipeline (E-125, E-127, E-128). The migration workbook remains preparatory material. [data-model.md](data-model.md) § Target model v2 owns the proposed terms and relations; [recording-guide.md](recording-guide.md) distinguishes that target from the active recording format.

## Recording

The German recording convention of the archive team, meaning how the tables are filled, how titles are formed, how uncertainty is recorded and what the quality checklist asks, is in [recording-guide.md](recording-guide.md). It remains German because it addresses the cataloguing team.

## Related

- [data-model.md](data-model.md) — the formal model this material is mapped onto
- [recording-guide.md](recording-guide.md) — the German recording convention of the archive team
- [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl) — the vocabulary with the concepts the role values resolve onto
- [architecture.md](architecture.md) § Pipeline — how the dataset is produced
- [testing.md](testing.md) — the invariants and the data mirror that hold this material
- [journal.md](journal.md) — the decision register behind the E-numbers cited here
- [`../data/reports/reconciliation-register.md`](../data/reports/reconciliation-register.md) — the register of authority-file and structural findings
