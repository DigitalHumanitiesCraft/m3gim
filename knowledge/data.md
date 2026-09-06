---
title: "Source Material"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: en
version: 0.6
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

The formal side, meaning classes, properties, controlled vocabularies and serialization, is in [data-model.md](data-model.md). The German recording convention of the archive team is in [recording-guide.md](recording-guide.md). The pipeline implementation is in [architecture.md](architecture.md), the research frame in [research-framework.md](research-framework.md), the project steering in [specification.md](specification.md). Running figures live in the quality snapshot under `data/reports/`, this document carries none.

## Sources and holdings groups

The material is the UAKUG/NIM holdings at the archive of the University of Music and Performing Arts Graz, the partial estate of the mezzo-soprano the fonds stems from. It falls into three holdings groups, and the group is readable from the signature.

| Group | Signature form | Character |
|---|---|---|
| main holdings | `UAKUG/NIM_nnn` | letters, contracts, press, programmes, photographs, held as convolutes |
| posters | `UAKUG/NIM/PL_nn` | individual items, note the slash before `PL` |
| sound carriers | `UAKUG/NIM_TT_nn` | individual items, shellac discs and recordings |

The source period runs from 1919 to 2010. The earliest dating sits on a poster, the latest on an exhibition after the death of the creator of the fonds. A value outside that span is a source error and belongs on the handover list under `data/reports/`.

Cataloguing is selective and unfinished. Title and document type are the best covered fields, creation date is middling, extent and language are thin, and only a growing selection of convolutes is opened down to the folio. Any analysis of this material carries that coverage with it. Which convolutes carry folios, and how far each field reaches, is in the quality snapshot.

No independent scholarly literature on the creator of the fonds exists. The placement in the research context is in [research-framework.md](research-framework.md).

## Source format

The authoritative source format is the CSV export of the spreadsheet. The reason is that the XLSX export converts date, folio and bundling columns into cell types and thereby invents precision the recording does not carry, a bare month becoming the first of that month and a year-less entry becoming a calendar date of the export year (E-152). The CSV export passes the recorded text through unchanged.

The link table lives as one CSV per sheet under `data/google-spreadsheet/verknuepfungen/`, one file per box plus the value list `Typ-Rolle.csv`. File names carry the sheet label with an underscore, `Box_1.csv` and so on, while the sheet name in the provenance keeps the spelling of the source, `Box 1`. The box numbers are not contiguous, because a sheet without a usable data row is not carried along. The object table is a CSV as well, `M3GIM-Objekte.csv`, beside the workbook. The loader prefers the CSV and falls back to the XLSX without it, whose date column then carries the autoconversion. The four index tables stay XLSX, because they hold no endangered column.

`resolve_verknuepfungen_source` takes every `Box_*.csv` in that directory. Without the directory it falls back to the first file matching `M3GIM-Verkn*pfungen*.xlsx`, which covers both the `ü` and the `ue` spelling, and without either it raises `FileNotFoundError`.

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

An index may carry the same name more than once, partly as an accidental double entry and partly as genuine homonymy. Three deterministic rules govern the merge, and none of them resolves a case silently.

Identity comes from `m3gim_id` where a row carries one. Rows sharing an `m3gim_id` denote the same entity and are condensed. Without the identifier the trimmed name decides. Two rows with the same name and different identifiers are a name collision and not a duplicate.

Within one identity the first non-empty value in source order wins per field, and a filled field is never overwritten by an empty one. The associated person of the organization index is multi-valued and collects every value of the group. Where two rows of one identity carry different non-empty values in the same field, the first wins and the case enters the validation report with both values.

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

The notation decides the representation. A complete or partial ISO date becomes a typed date property, a range becomes a time span value, a bracket or question-mark uncertainty such as `1957-[05-27?]` becomes an annotation node carrying a quality flag, and a free-text beginning such as `ab …` or `seit …` becomes the qualifier `nach:`.

Complete dates must also be possible calendar dates, and month values must be in range. Regular validation reports violations at the source cell; it does not infer a corrected date. The three current impossible complete link dates remain editorial findings and retain their strict source-fix test.

The object table carries a separate column for dating evidence with the values `aus_dokument`, `erschlossen`, `extern` and `unbekannt`. It is deliberately not serialized ([data-model.md](data-model.md) § Meta-statements and provenance).

## The link mechanism

One row of the link table carries one statement about one record. The `typ` column steers the target context, and the `name` column is matched against the index entries by string comparison after normalization. A row carrying a name and a role but no type is not modelled, because the type steers the target context and a type is not guessed, and the row enters the validation report with its source cell. A type proposal is produced separately after the pattern of `scripts/propose-links.py` (E-147).

| `typ` | Target |
|---|---|
| `person` | person index, `rico:Person` |
| `institution` | organization index, `rico:CorporateBody` |
| `ensemble` | `rico:Group` |
| `ort` | place index, `rico:Place` |
| `werk` | work index, `m3gim-ontology:MusicalWork` |
| `rolle` | `m3gim-ontology:StageRole` on a `m3gim-ontology:Performance` |
| `datum` | annotation node with a date |
| `ereignis` | `m3gim-ontology:FramingEvent` |
| `ort, datum` | annotation node with place and date (E-96) |
| `datum, werk` | performance with work and date (E-98) |
| `rolle, person` | performance with stage part and performer (E-96) |
| `ort` in a mobility place role | place reference plus a dateless annotation node (E-97) |
| `ausgaben, währung`, `einnahmen, währung`, `summe, währung` | annotation node carrying a financial item |

Two type values have no target branch and are dropped silently, `Aktivität` and `dokument`. Both occur in the source, both need a modelling round of their own, and both are carried on the handover list and in the [reconciliation register](../data/reports/reconciliation-register.md) until then. The handler for a type `detail` exists in the pipeline as the path for the third cataloguing layer, but no row of the source carries that type, so the path is unused.

Dependent dropdowns enforce the value lists for `typ` and `rolle` at the source. Since a Google Sheets dropdown value carries no comma, a composite type may appear with an underscore in the export, attested for `einnahmen_währung`, `ausgaben_währung`, `summe_währung` and `ort_datum`. The pipeline accepts the underscore as an equivalent composite separator.

### Composite link types

Every composite type resolves into a target entity with typed properties by the same pattern. The formal version is the vocabulary together with `decompose_komposit_typ()` in the pipeline.

| Composite | Target | Special rule |
|---|---|---|
| `ort, datum` | annotation node with place and date | the mobility core of the model ([data-model.md](data-model.md) § Mobility perspectives) |
| `datum, werk` | performance with work and date | the work is resolved through the index only, never as a raw string or a literal Q-identifier, and a row whose value half carries no leading year holds a composer rather than a work and is filtered out |
| `rolle, person` | performance with stage part and performer | both source spellings of the type are treated alike |
| `rolle` alone | performance with a stage part only | every stage part carries the same entity structure (E-96) |
| `ort` in a mobility place role | place reference plus a dateless annotation node | the missing date is itself the statement, because the source gives none and none is guessed |
| the three currency composites | annotation node carrying amount, currency and financial role | amount parsing and double amounts in [data-model.md](data-model.md) § Financial layer |

## Role values

`Typ-Rolle.csv` is the source of the role values. It lists, per link type, the roles the dropdown offers, and it is therefore the authoritative list of what may be recorded. The document does not repeat it. The concepts these values resolve onto, with their definitions and their German display labels, are in [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl) and in the generated model page `docs/datenmodell.html`. Neither list is a superset of the other, because the value list carries values the vocabulary has not yet taken up and the vocabulary carries concepts specified ahead of the recording.

Role normalisation removes the colon suffixes `:in` and `:innen` and levels capitalization. A bare trailing `in` is preserved because it can be part of a word stem. Subsequent vocabulary resolution keeps an incoming alias in `m3gim-ontology:derivedFromRole` when it differs from the concept's preferred label. The earlier spelling and gender-suffix normalisations remain traceable through the source cell. The vocabulary supplies the display labels; changing their gendered form remains an editorial decision.

Two legacy role-column patterns require special handling. `CONTRACT_STATUS_ROLES` prevents an unfulfilled-contract status from being treated as a role. The current export records `Vertrag nicht eingehalten` in `anmerkung`; the pipeline preserves it as `rico:generalDescription` at the affected data point. A date role inherited by the place half of an `ort, datum` composite is stripped from the place because it supplies no place role.

The five mobility place roles are the one group the pipeline treats specially, as the German set `MOBILITY_PLACE_ROLES` in `scripts/transform.py`. Its members are `zielort`, `absendeort`, `abreiseort`, `empfangsort` and `vertragsort`. A residence is deliberately not among them, because it is a state with a validity period and not a point event.

### Dating scope and rank

Two properties on the role concept say what a dating dates and which one counts when a document carries several. Both live on the concept in the vocabulary rather than in the interface, so dataset and application make the same statement (E-150).

`m3gim-ontology:datingScope` names the level a dating refers to and draws from the scheme `m3gim-vocab:datingScopes`. Only a dating of the object itself and a dating of an event the object attests may date a document. A mentioned dating, a framing period and a dating of a negated claim stay readable without setting the time anchor.

`m3gim-ontology:datingRank` is an integer deciding the order where a document carries several anchoring datings, the smaller value taking precedence. A role concept without a rank sorts behind every concept with one, in source order. A newly admitted role concept receives a rank at the end of the existing series, because resorting moves a dating that anchors today and is a decision of its own rather than a side effect.

## Naming conventions and place duplicates

Persons are set as surname, given name, with a nobiliary particle following the given name. Places carry the customary German name and keep the historical form of the source. Institutions carry the official designation without a legal form. Works carry the title of the source, with the composer as a separate field.

Two kinds of place duplicate are consolidated before normalization. A trailing space produces a second entry of the same place and is trimmed away. A place given with a street address becomes its own place entry linked to the plain place by `skos:broader`. A free-text mixture of place and time in one cell is split into an annotation node carrying the place and the date separately.

## Processing status

Two value systems for the processing status run in parallel. The recording guide specifies `in_bearbeitung`, `schicht1_fertig`, `schicht2_fertig` and `abgeschlossen`, which mirror the layer progress and allow a coverage measurement per layer. The pipeline normalizes onto `begonnen`, `abgeschlossen` and `zurueckgestellt` through `normalize_bearbeitungsstand()`, which absorbs the inconsistent spellings and synonyms of the source. Which system holds is an open decision, and only its answer makes the degree of cataloguing measurable per layer.

## Compensations in the pipeline

The recording is the authoritative source. Where the pipeline compensates for a property of the source, that compensation is a debt and not a feature, and it is kept visible so it stays clear what is to be fixed at the source and where the code must remain defensive. The code sits in `scripts/_common.py` and `scripts/transform.py`, the concrete findings with file, location and field are in the handover list under `data/reports/`.

The compensations fall into three categories. A specification compensation is a structurally unavoidable format transformation that hides no data error, meaning the underscore variant of a composite type, the removal of gender-inclusive role notation, the restriction of Wikidata raw values to the pattern of a Q-identifier, and the skipping of hidden dropdown helper sheets on the XLSX path.

A workaround compensates for a property that is fixable at the source and is therefore an editorial note to the archive team. The structural cases are the lost header rows of the index sheets, the shifting column name and the non-textual header of the folio column, the literal `Folio` as a folio cell value, the link table spread over several box sheets, the sparsely filled signature column with a blank header, the shared signature of a collective row and its folio rows, the two spellings of the bundling column, the multiply recorded name in one index, the shared work title across composers, the mixed monetary notation including double amounts, the date placeholders and malformed datings in the creation date, the inconsistent spellings of the processing status, the date role inherited onto the place half of a composite, the contract status in the role column, the free-text datings that are passed through rather than blocked, the link row without a type, and the stage part recorded twice as a bare role row and as a composite, which `_dedupe_stage_role_performances()` falls onto the entry carrying the performer (E-205).

A policy compensation is an editorial decision that holds as long as its assumption holds. Three exist, a template row whose signature reads `beispiel` is skipped, and two locations without a currency suffix receive a default currency bound to the signature prefix, one in schillings and one in Belgian francs, the latter still to be confirmed with the cataloguing team.

## Target model, decided and not built

The link mechanism above is document-centred. One row carries one statement, so where a document describes several appearances their statements spread flat across the record and it is no longer reconstructable which person, which stage part, which place and which amount belong to which appearance. The annotation then attests that something occurs in the document, not who did what.

The decided answer is an occurrence as a bundling node one level above the aspect nodes, with the record attesting it rather than containing it, and a two-level recording identifier whose integer identifies the activity and whose two-digit decimal identifies the single participation in it (E-125, E-127, E-128). The appearance mode, meaning a guest performance or a tour, would sit on the occurrence rather than competing as a role value on the individual place, work or institution row. None of this exists in the vocabulary or in the dataset. The terms and their relations are in [data-model.md](data-model.md) § Target model v2.

Two further points were decided with the partner feedback of 2026-09-05. The first is built. Pages of one folio, recorded as `1_1`, `1_2` and so on, stood as separate records and lost the context of the whole source, and they now hang under a record of their folio that carries them as parts, the level RiC-O provides, so that the interface can group them (E-269). The second is open. The year of a record is today taken first from the source dating of the object table and only then from the dates of the link table. The partners read the timeline at content level, meaning the events and appointments the source mentions, so the link dates take precedence and the source dating stays a data point of the record.

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
