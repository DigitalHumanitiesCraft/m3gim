---
title: Architecture
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: en
version: 0.7
created: 2026-02-19
updated: 2026-09-06
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Architecture
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/architecture
topics: ["[[Pipeline Design]]", "[[JSON-LD]]", "[[Data Validation]]", "[[Static Site Architecture]]", "[[Information Visualisation]]"]
related: [data, testing, journal, design, specification]
---

# Architecture

The project has two halves that meet in one file. The pipeline reads the recording tables and writes `docs/data/m3gim.jsonld`, and the frontend is a static single-page application in `docs/` that loads exactly that file. Everything about how the application looks and behaves lives in [design.md](design.md), everything the model asserts in [data.md](data.md) and [data-model.md](data-model.md).

## Pipeline

### Sources and their resolution

The source material lies git-tracked under `data/google-spreadsheet/`. The object table is read by `load_objekte` in `scripts/_common.py`, which prefers `M3GIM-Objekte.csv` and falls back to the workbook of the same name only when the CSV is absent, because the CSV preserves the recorded text while the workbook carries the spreadsheet's autoconversion in the date column. The four index tables for persons, organizations, places and works stay XLSX and go through `load_index`, whose header-shift correction covers three malformation classes of the export, a name column without a header, a leaked data value in the header row and an identifier column overwritten by a data value.

The link table lives as one CSV per box under `verknuepfungen/`, together with the value list `Typ-Rolle.csv` (E-152). `resolve_verknuepfungen_source` in `scripts/transform.py` takes the directory when it holds at least one `Box_*.csv` and otherwise falls back to the workbook whose name matches `M3GIM-Verkn*pfungen*.xlsx`, so both spellings of the umlaut resolve. Provenance is identical in both cases, each row carries its sheet name and its one-based row number including the header line. `Typ-Rolle.csv` is not read as a link sheet but as the value list that `validate.py` cross-checks types and roles against. `explore.py`, `validate.py` and `audit-data.py` use the same multi-sheet loader as the transformation, so their findings cannot drift behind the transformed state (E-95).

### The eight steps

| Step | Script | Input | Output |
|---|---|---|---|
| 1 | `explore.py` | source directory | `data/reports/exploration-report.md` |
| 2 | `validate.py` | source directory | `data/reports/validation-report.md` |
| 3 | `transform.py` | source directory, the two `wikidata-*.json`, `vocab/m3gim.ttl` | `data/output/m3gim.jsonld` |
| 4 | `build-views.py` | `data/output/m3gim.jsonld` | `docs/data/m3gim.jsonld` |
| 5 | `audit-data.py` | source, pipeline output, frontend copy | console report |
| 6 | `report-quality.py` | dataset and reconciliation file | `data/reports/quality-snapshot.md` |
| 7 | `report-cataloguing.py` | source and validation findings | `data/reports/cataloguing-report.md` |
| 8 | `build-model-page.py` | `vocab/m3gim.ttl`, dataset | `docs/datenmodell.html` |

Step 2 exits with code 1 as soon as the report carries ERROR findings, which is the expected state at the current data state, and step 5 reports the known source defects in the same way. Both have done their work once the report is written, the findings go to the cataloguing team through the handover list under `data/reports/`. Step 3 reads its role concepts, concept definitions and dating scopes out of the vocabulary rather than duplicating them (E-133), counts every path that discards a source row and prints the tally at the end of the run. Step 4 copies the result into the frontend data directory and skips the copy when the output directory is not the default, so a staging run cannot overwrite the published data source. Step 8 is deterministic by construction, no timestamps and no unordered sets, and `sync_shared_regions` in the same script replaces foot, info-page header and stylesheet version in all five HTML pages from its own templates while the page bodies stay handwritten (E-251).

The source validator resolves E005 against the complete published record-key policy: source records, RecordSet parents and recursively derived Folio parents, with the same deterministic hyphen repair as transformation. Signature-only rows that transformation drops produce E016 and cannot satisfy a link target. Calendar validation checks complete dates and month values as well as their notation; an impossible link date produces E010 at its source cell. Small helpers in `_common.py` share these policies, while the source values remain unchanged.

### Scripts outside the run

| Script | Purpose |
|---|---|
| `reconcile.py` | Wikidata reconciliation of the four indexes, exact and alias matches before fuzzy matching, type filter per entity kind, composer check for works, confidence levels exact, alias, fuzzy_high and fuzzy_low. Writes `data/output/wikidata-reconciliation.json` |
| `enrich-wikidata.py` | Wikidata properties for matched entities, occupation, voice type, life dates, coordinates, country, composer, genre, premiere date, foundation date. Passes fuzzy_low on only with `manual_review: "approved"` (E-74). Writes `data/output/wikidata-enrichment.json` |
| `verify-manual-approvals.py` | Holds every `match: "manual"` entry against live Wikidata labels, aliases and description, exit code 1 on a mismatch (E-78). `SKIP_VERIFY_MANUAL=1` skips it offline |
| `export-wikidata-csv.py` | Lookup CSVs from the reconciliation file for import into the spreadsheet |
| `propose-links.py` | Link proposals from the object titles against the four indexes, in the column shape of the link table. Assigns no role and resolves no ambiguous title position (E-147). Writes `data/reports/link-proposals.md` |
| `report-cataloguing.py` | The one address of the cataloguing team (E-272), thinly catalogued convolutes, the objects the Bearbeitungsstand lists as worked on while they carry no Verknüpfung, titles naming an unlinked place, link types the pipeline does not map, and the ERROR findings of the validation bundled by class with a pointer into the validation report. The orphan rule lives here as `worked_on_without_link`, and `tests/test_61_orphan_links.py` asks it. Writes `data/reports/cataloguing-report.md` |
| `scout-coverage.py` | Read-only measurement of the data coverage of a place focus before a view is built on it |
| `assemble-verknuepfungen.py` | Reassembles the per-box CSV exports into the workbook, for the fallback path of the loader |
| `build-social-images.py` | Open Graph image and PNG favicons into `docs/img/` from the accent token. Needs Pillow, which no requirements file carries |
| `backup.py` | Unchanged snapshot of a raw Drive export into the gitignored `data/backup/` |
| `check-doc-split.py` | Content preservation when a knowledge document is split or merged |

`reconcile.py` and `enrich-wikidata.py` need network access and run only when the Wikidata alignment is drawn again. Both result files are git-tracked and present in a normal clone.

The standard transformation requires the object table, links and all four nonempty index tables. Missing required input fails before publication. Reconciliation retains previous results when an index is missing or a request fails; transient errors remain eligible for retry and make the selected run exit unsuccessfully. Lookup exports admit a `fuzzy_low` match only with an approved manual review. Central JSON and publication writes use temporary files and atomic replacement. Backups are staged and hash-verified before replacing an existing snapshot; a failed new backup leaves no apparently complete target.

### ENV overrides

| Variable | Default | Honoured by |
|---|---|---|
| `M3GIM_SHEETS_DIR` | `data/google-spreadsheet` | `_common.py`, `explore.py`, `validate.py`, `transform.py`, and through `_common` also `audit-data.py` |
| `M3GIM_OUTPUT_DIR` | `data/output` | `_common.py`, `transform.py`, `build-views.py`, and through `_common` also `audit-data.py` and `report-quality.py` |
| `M3GIM_REPORTS_DIR` | `data/reports` | `_common.py`, `explore.py`, `validate.py`, and through `_common` also `report-quality.py` |
| `M3GIM_JSONLD_PATH` | `$M3GIM_OUTPUT_DIR/m3gim.jsonld` | `build-views.py` |
| `M3GIM_VOCAB_PATH` | `vocab/m3gim.ttl` | `transform.py` |
| `M3GIM_ALLOW_NO_WIKIDATA` | unset | `transform.py` |

The three path variables are resolved once in `scripts/_common.py` and imported from there. `audit-data.py` and `report-quality.py` used to read fixed paths and therefore audited the default data state while the transformation ran against another one (E-167). `explore.py`, `validate.py` and `transform.py` resolve the same variables in their own module scope with the same defaults.

### The Wikidata guard

`transform.py` reads `wikidata-reconciliation.json` and `wikidata-enrichment.json` from the output directory, that is from the zone it writes its own result into. If the directory is fresh or has been emptied, both files are missing, and the dataset then loses every enriched property, coordinates, life dates, occupations, voice types, composer and genre statements, together with the identifiers that only reconciliation adds. The frontend renders an empty Karte in that case because no node carries coordinates any more. The run therefore aborts with exit code 1 and a message naming the two files, unless `M3GIM_ALLOW_NO_WIKIDATA=1` marks the run as deliberate (E-167). Whoever works with an alternative output directory copies the two files there first.

### Generated and versioned outputs

`data/output/` holds the dataset and the two Wikidata files, all three versioned so a normal clone can run and compare. `docs/data/` holds the published copy of the dataset and, beside it, the world geometry `geo/countries-110m.geo.json`, which no pipeline step produces. `m3gim.jsonld` is the only data source of the frontend, the pre-aggregated derivatives were removed with E-140. Under `data/reports/` three classes live side by side, the permanent curation evidence of the authority alignment, the finding registers of the operational error management, and the reports a run regenerates, of which the exploration, validation, link-proposal and cataloguing reports are gitignored.

Identical source data yield identical artefacts with two exceptions. `transform.py` writes the run date as `m3gim-ontology:exportDate`, and the generated Markdown reports carry their generation time in the head. A rerun from an unchanged source therefore shows exactly those lines in `git diff` and nothing else. `tests/test_10_determinismus.py` holds the property by running the transformation twice and removing the export date before the comparison.

### What the transformation asserts

The dataset carries records with their convolute hierarchy, `owl:sameAs` plus the enriched properties, `skos:Concept` nodes for the hierarchical document types, `m3gim-ontology:Annotation` as a top-level node for every dating and every located statement (E-100, E-136), `m3gim-ontology:Performance` with `m3gim-ontology:hasStageRole` and `m3gim-ontology:hasPerformer` for the stage parts of the source composites (E-96, E-98), `agrelon:*` relations between agents with the record URI as `agrelon:metadataProvenance`, financial detail annotations with `m3gim-ontology:monetaryAmount` and `m3gim-ontology:currency` (E-99), and `m3gim-ontology:xlsxSource` at every record and every nested entity as the technical source reference (E-73). Dating confidence is not serialized, confidence is not fabricated (E-106). `m3gim-ontology:dataQualityFlag` and `m3gim-ontology:processingNote` carry the signals of the annotation column and the cataloguing status (E-102). The structural normalizations of the loader, the header shifts, the field-wise index consolidation, the currency defaults, the role hygiene and the date normalization are catalogued with their source-fix proposals in [data.md](data.md) § Compensations in the pipeline.

There is no active CI workflow, the pipeline runs locally and the results are committed by hand.

## Frontend

### Runtime and toolchain

Vanilla JavaScript with ES modules, no build step (E-03), no framework (E-01), delivery over GitHub Pages. The whole dataset is loaded once at startup (E-05). D3 7.9.0 and the interface fonts are shipped under `docs/vendor/`. `docs/vendor/manifest.json` records their upstream URLs and SHA-256 digests, and adjacent licence files preserve redistribution terms. The Karte fetches the locally shipped country geometry when it first opens. D3 carries the projection and zoom of the Karte and the edge drawing of the Netzwerk. The bars of the Statistik are DOM primitives without a library.

`main.js` is the entry. It loads `./data/m3gim.jsonld` through `loadArchive`, sets up the Korb and the register menu, and starts the router. The registry `TAB_RENDERERS` maps every tab key onto its render function. A tab is rendered once when it is first activated and afterwards updated by its own drawing logic, only the Korb is fully redrawn when its content changes. A render error stays inside its tab and releases it for another attempt (E-51). On localhost `main.js` additionally imports `utils/dev.js` dynamically (E-50).

### Module layout

Every view follows the same cut. The orchestrator holds the view-local state, builds the sidebar and draws. The data layer beside it is free of DOM and D3 and therefore checkable with Node unit tests, and where the drawing grows it lives in a module of its own.

| Path | Purpose |
|---|---|
| `main.js` | Entry, `TAB_RENDERERS`, lazy rendering per tab, error boundaries |
| `data/loader.js` | JSON-LD loading and store construction in separate passes (E-72), plus the accessors for datings and locations, `primaryYear` among them |
| `data/records-for.js` | The one resolution from store and filter to a result set, with `baseIds`, `recordsFor`, `facetInventory`, `docTypeGroups`, `facetCounts`, `yearBounds`, `yearOf`. Pure |
| `data/constants.js` | `CONTENT_FAMILIES` and `familyOfBlock`, `AGRELON_LABELS`, `ANCHORING_SCOPES`, the mobility cluster mapping, and the shared glyphs |
| `ui/router.js` | Hash routing, tab switching, ARIA state, `navigateToView`, `navigateToIndex`, `applyArchivFilter`, `setIndexRegister`, `INDEX_REGISTERS`, legacy aliases |
| `ui/tabs.js` | Keyboard pattern of the tab bar, returns the chosen tab name and writes no hash |
| `ui/register-menu.js` | The register menu at the Indizes tab, a second click or ArrowDown opens the four registers under it (E-230) |
| `ui/sidebar.js` | The one scaffold of the filter column, `createSidebar` and `viewShell`, the composer of the parts beside it and the one import address of the views (E-250) |
| `ui/sidebar-status.js`, `-facets.js`, `-options.js`, `-range.js`, `-strip.js`, `-controls.js` | Result line, shared facets and tree control, row forms, year range, chip strip, remaining control factories |
| `ui/filter-state.js` | The shared filter state with `getFilter`, `setFilter`, `replaceFilter`, `addFacetValue`, `resetFilter`, `deviatingKeys`, `subscribe` |
| `ui/filter-url.js`, `ui/filter-sync.js` | The filter in the hash query and the folding between year window and time facet. Pure |
| `ui/events.js` | The navigation channel `m3gim:navigate`, replayed for views not yet rendered (E-53) |
| `ui/basket.js`, `ui/charts.js`, `ui/family-icons.js` | Korb with localStorage persistence, the horizontal bar primitive, the four family symbols |
| `views/*` | Per view an orchestrator, a pure data layer and, where needed, a drawing module |
| `utils/` | `dom.js`, `env.js` (`IS_DEV`, `logStamp`), `format.js` (signatures, document types, `cityOf`), `normalize.js`, `date-parser.js`, `provenance.js` (`extractXlsxSource`, E-91), `dev.js` |

The stylesheets follow the same split, `docs/css/variables.css` carries the tokens and one stylesheet per tab carries its own visuals. The token layers and the design rules behind them stand in [design.md](design.md).

The content pages `about.html`, `projekt.html`, `datenmodell.html` and `impressum.html` lie beside the application as standalone HTML and are reached by ordinary links, not by hash routing. Explanatory and legal content is a linkable page and never a modal overlay (E-26). `datenmodell.html` is generated and never written by hand.

### Store and loader

`loadArchive` distinguishes a missing network connection, a missing file and a failed parse and reports each case with its own German text (E-52). `buildStore` builds the maps in separate passes (E-72), first the concepts so an annotation finds its dating scope while it is being built, then nodes, relations, the convolute hierarchy and finally the set of records without any link.

| Store map | Source in the JSON-LD | Use |
|---|---|---|
| `records`, `allRecords`, `bySignatur`, `byDocType`, `byYear` | the record nodes | base indexes of every view |
| `konvolute`, `konvolutChildren`, `childToKonvolut`, `konvolutMeta`, `folioIds` | the convolute hierarchy | grouping and group head of the Bestand |
| `persons`, `organizations`, `locations`, `works`, `ensembles` | the linked entities | registers, facets, Karte, Netzwerk |
| `dftHierarchy`, `conceptDefinitions` | `skos:Concept` with `skos:broader` and definition | document type facet as a tree, label, gloss (E-143) |
| `roleVocab`, `roleScope`, `roleRank` | role concepts with dating scope and rank (E-150) | display form of a role and choice of the time anchor |
| `annotations`, `recordToAnnotations`, `recordDatings` | `m3gim-ontology:Annotation` and `m3gim-ontology:hasAnnotation` | datings in the detail, `primaryYear` |
| `mobilityEvents`, `recordToEvents` | the located annotations with coordinates and country | Karte, accent of the Chronik, place block of the detail |
| `agentRelations` | `m3gim-ontology:hasAgentRelation` | relation block of the detail, marks in the registers and the Netzwerk |
| `finances` | detail annotations with amount, currency and role | finance block of detail and Korb |
| `stageRoles`, `performances`, `recordToPerformances` | `m3gim-ontology:StageRole` and `m3gim-ontology:Performance` | work and performance blocks, stage parts in the Statistik |
| `eventsByRole`, `recordsByAgentRole` | precomputed facet indexes | axes of `recordsFor`, so a cut does not walk the graph |
| `unprocessedIds` | records without any link | definition of the document base (E-165) |
| `@context`, `graph` | the shipped document itself | the Korb exports the selection as JSON-LD without refetching the file |

Three maps flatten the raw JSON-LD into a lookup shape, `agentRelations`, `mobilityEvents` and `finances` carry for instance `objectName` instead of the nested `agrelon:hasObject`. Reading the JSON-LD keys there yields an empty result without an error. The JSDoc shapes stand above `buildStore()`, and the contract tests in `tests/test_06_frontend_contract.py` hold these assumptions out of the data.

`primaryYear(store, record)` is the single time anchor, and its precedence runs at content level (E-264). The function walks the datings of the record and takes the highest ranked one whose dating scope is anchoring, which are the two scopes object and attested, and `rico:date` of the object table carries only the fallback. Mentions, framing events and the contract status for an unfulfilled agreement never date a record. The result names the year, its source, the role it came from and that role's own date value, so a view can date a record at the day, mark a year that comes from a link instead of from the document's own dating, and cut Chronik and Karte at the same year.

### Filter state and result set

One filter state carries all views. A cut by place, person, work, institution, document type, link type or role, country, year window or free text holds in every filterable view at once. `ui/filter-state.js` keeps the object and offers `getFilter()`, `setFilter(patch)`, `replaceFilter(filter)` and `subscribe(fn)`. Changes dispatch a `m3gim:filter` event to subscribers. The state lives in the module, so a cut survives a tab change on its own.

The shared list facets are `ort`, `person`, `werk`, `institution`, `docType`, `verknuepfung` and `land`; `zeitfenster` is a year pair and `search` is free text. `verknuepfung` represents both a link type and a composite `type:role` value. Several values of one facet act as OR, different facets as AND (E-151). Ensemble, event role and finance indexes remain available to the data selector without their own shared-state facets.

The application starts with the empty selection (E-253). `deviatingKeys()` drives the active chips and `resetFilter()` restores the full basis. The unused touched/default mechanism has been removed. Shared search uses a cached normalized text per record, including document fields and linked entity names. The register's separate entity lookup is local navigation and preserves the shared document query.

`recordsFor(store, filter, {base})` is the single resolution, and before it existed each view resolved its own facets so that two tabs showed different sets for the same filter. `baseIds(store)` is the document base of the whole application, every record with at least one link (E-165). A record without a link is neither greyed out nor filtered away, it does not exist for the interface, and the finding aid for the complete fonds remains the archive. `recordsFor` returns `ids` together with the counts `weit`, `eng` and `undatiert`, which are counted and never cut, so a view can name the difference without computing it. Undated records survive the year window (E-88), because the window is a section of the dated track and not an erasure of the undated. Beside it stand `facetInventory` with the selectable values, `docTypeGroups` with the document type as tree groups, `facetCounts` with the counts in the current cut, and `yearBounds` and `yearOf` as the single year axis and year resolution. A lexical gate in `tests/frontend/records-for.test.mjs` keeps the former per-view resolutions out.

### Router and deep links

`ui/router.js` is the only place that writes to the address bar (E-208). The grammar is `#<tab>[/<recordId>][?<query>]`, and `splitHash` separates the query before it splits the path, so an existing deep link to a record stays valid. Writing goes through `replaceState`, so a slider step creates no history entry. The catalogue `TABS` holds `bestand`, `chronik`, `statistik`, `indizes`, `karte`, `netzwerk` and `korb`, every registered tab is visible. At the Indizes the second path segment carries the register from `INDEX_REGISTERS` instead of a record, so the address reads `#indizes/personen` (E-226).

Four legacy aliases keep old addresses alive, `archiv` becomes `bestand`, `mobilitaet` and `mobilitaets-atlas` become `karte`, and `verknuepfungen` becomes `netzwerk`. The query part survives the redirect. `resolveRecordId` maps the instance prefix `m3gim:` from before the namespace split onto `m3gim-data:` (E-138). `parseHash` reads the path before the query, because the filter handover dispatches to the subscribers and the router writes the address back out of that subscription, which would otherwise carry the record of the previous hash. A hash without a record part clears the selected record (E-219).

`navigateToIndex(gridType, entityName)`, `navigateToView(tab, context)` and `applyArchivFilter(facet, value)` are the ways into a view. Only the record id and the register stand in the address, the remaining context travels as the detail of the `m3gim:navigate` event and stays out of the shared filter (E-226). `setIndexRegister(key)` writes the register from the view, and the register menu at the tab reaches the already drawn page over the same channel.

An explicit filter query replaces the previous filter atomically. A queryless link preserves the cut. The filter is encoded with German keys, for instance `typ=correspondence&ort=Bayreuth,Wien&jahr=1951-1953`. The comma separates the values of a facet, a comma inside a value is percent-encoded, which is the normal case for the name form surname first. Empty values do not appear. The former key `docType` is still read so existing deep links hold (E-173). Beside the filter the query carries the parameters of a view, the selected Netzwerk node among them. `viewParams` in `ui/filter-url.js` returns every pair whose key is no filter key, and `updateHash` carries them through each rewrite while the tab stays the same and drops them with the view they belong to, so a hash naming both a cut and a node no longer loses the node (E-278). `tests/frontend/filter-url.test.mjs` and `router-hash.test.mjs` cover both directions of the grammar.

### The one filter column

`createSidebar(store, opts)` builds the shared search, year range and facets, followed by view-specific sections and the legend. The result line is the root row of the document-type tree (E-170). It exposes a focusable data-state label and can describe the view's eligible evidence separately from the common record count. Narrow layouts initially fold the column behind the labelled Filter control.

`createSidebar` returns `element`, `strip`, `update()` and `destroy()`. The strip is the row of deviating values as removable chips with the reset link, which every view hangs above its canvas so a filter change cannot make the column jump, and which stays empty and without height while nothing deviates. Through `localChips` the strip additionally takes groups that only cut in one view, the selected entity of the Karte, which answers the same reset; country is a shared facet. The column subscribes to the filter itself and reports every change, its own and a foreign one, as a single `onChange` call.

The document type is a tree whose selected groups resolve to their leaves; `impliedByGroup` marks an included child. Other facet sets offer searchable suggestions with keyboard navigation and normalized matching. Values come from `facetInventory` and the dataset (E-87). Role terms require a display form (E-143). Cataloguing status remains in record details and reports.

### Views

The Bestand (`views/bestand.js`, `bestand-data.js`, `bestand-rows.js`, `_bestand-filter.js`) is the archival base view, a table in signature order with the columns signature, title, type, date, cataloguing and Korb, without sorting. Convolutes stand as permanent group heads with title, time span and their frequent document types, the column head and the open convolute head form a sticky band, and two levels fold, the convolute by the chevron of its head and the record row by its own chevron, which opens the inline detail. As soon as a facet, the free text or the year window cuts, `flattenForFilter` flattens the hierarchy and `pruneEmptyKonvolute` removes a head whose children all fell out of the cut. A record addressed by id always opens, and `widenFilterForRecord` widens the cut by exactly one value the record carries, every widening appearing as a chip (E-219). The entity column shows per content family the symbol from `ui/family-icons.js` with the number of distinct entities, the breakdown by name lies in the tooltip (E-212).

The record detail (`views/record-detail.js`, `record-detail-data.js`, `record-chips.js`) runs across the full width and is built from `buildRecordBlocks`, which also feeds the Korb, so both places show the same block logic. The blocks are production, contributors, work and repertoire, performances, place and event, dates named in the document, mentioned, further, relations and finances, each block title carrying the symbol of its content family. All chips come from `buildRoleChip` with a provenance pill and a Wikidata link, and the chip tooltip names every modelled data point of its node, source fields first and the enrichment introduced as such. A `rico:generalDescription` at a dating, performance, event or role appears as a quality marker with its wording (E-222).

The Chronik (`views/chronik.js`, `chronik-data.js`) is a scrolling year timeline. Empty years stay visible because the gap structure shows the state of cataloguing and not the absence of activity (E-88), records that only carry a secondary dating are marked as such, and genuinely undated ones stand in a closing block. A left accent on the chip carries the dominant mobility perspective from `sichtForRecord`, and a decade header aggregates by perspective, where a click on a segment highlights exactly the chips that carry it.

The Statistik (`views/statistik.js`, `statistik-data.js`, `statistik-sections.js`) shows the holdings in numbers, in four record-based sections, document types, repertoire, persons and institutions. Spatial and temporal aggregates lie in the Karte and the Chronik, the relation aggregate in the Netzwerk (E-160). Everything is drawn with `buildHorizontalBars`, a rank list shows its head and bundles the rest into a collecting row, and a row leads into the correspondingly filtered Bestand wherever a shared facet exists (E-144).

The Indizes (`views/indizes.js`, `indizes-data.js`) are register pages, exactly one of the four registers persons, organizations, places and works at a time. The register is chosen in the menu at the tab and stands in the path of the hash (E-226, E-230), the sorting by count or alphabet is a button pair in the head of the list. An entry is one row with name, the short enrichment marked as an addition, the count in the current cut and a Wikidata mark, and the expanded entry adds the roles, the recorded stage parts and the Umfeld. `buildUmfeld` collects the co-occurring entities grouped by content family, each chip leading into the other register, and the group carries the mark of an addition because co-occurrence means named in the same document and not appearing together (E-216). An entry hands over to the view that owns its level rather than becoming a third rendering of it (E-252), so the name opens its register detail and the document count leads into the filtered Bestand, and the jumps into Netzwerk and Karte set the entity as focus.

The Karte (`views/karte.js`, `karte-data.js`, `karte-map.js`, `karte-picker.js`) is entity-centred. A person, organization or work may refine the presentation (E-235). Its shared result count and every eligible place derive from the complete `recordsFor` document cut, including search and the primary record time anchor. `occurrencesInCut` keeps every place evidence item whose record belongs to that cut; the annotation date remains visible provenance and never applies a second hidden time filter. Undated records retained by the shared time contract remain context. Places are drawn from record places and located annotations, with role distribution, evidence count and location grade. A place without drawable coordinates stands in the sidebar with its reason and attesting records (E-280). The base map, country geometry and D3 runtime are local.

The Netzwerk (`views/netzwerk.js`, `_netzwerk-geometry.js`, `_netzwerk-canvas.js`) stands in two forms of the same cut, the two-mode network of actors and linked records and the person projection the sidebar switch leaves behind. The creator of the fonds is no node, she stands on almost every document and would connect everything with everything. Graph building and layout are pure functions in the geometry module, the same ones that carry the GEXF export, the edges are drawn on a canvas and the nodes in SVG above it. `layoutGraph` holds its repulsion in a uniform grid of typed arrays and ends at measured rest rather than after a fixed number of steps, the iteration count being only the ceiling for a graph that never settles, and it reports steps, rest and last movement beside the positions (E-273). A click marks the neighbourhood without moving the layout, two steps at an actor of the two-mode network and one step everywhere else (E-276), and the selected node stands in the query part of the hash. The retained visual and timing criteria are in [testing.md](testing.md) § Boundaries; observations and remaining acceptance are recorded in [plan.md](plan.md).

The Korb (`views/korb.js`) is the cross-cutting selection list, held in localStorage and counted in the tab bar. A card shows the same functional blocks as the detail, and the export writes CSV with a UTF-8 BOM, BibTeX, GEXF, and the selection as a JSON-LD document with the context of the source. `recordEvidence` is the one place that gathers what every format then carries, the source cell of the record and, per data point, family, role, value and source cell (E-281). The CSV holds one column per family in the form „Rolle: Wert [Blatt Zeile]" beside the Zeitanker column, the BibTeX note takes the same statement, the GEXF writes sheet, row and data point as attributes at node and edge and merges two mentions into one edge only where they stand on the same source row, and the JSON-LD carries the provenance in the copied records.

### Development mode and error boundaries

`IS_DEV` in `utils/env.js` tests for localhost. Only there does `main.js` import `utils/dev.js`, so neither the module nor its dependencies enter the startup path in production (E-50). The module writes a store report on load and sets `window.m3gim` with the store and a set of inspection functions, among them `provenanceOf(recordId)`, which lists every source cell of a record including its nested nodes. `logStamp(view, parts)` sits beside it and not in the diagnostic module because every view calls it at the end of its render, and in production it is a no-op. `stamp_expectations` in `tests/frontend/smoke.py` requires the carrying keys per view.

`main.js` catches render errors per tab, synchronous and asynchronous, shows an error box built as DOM and releases the tab for another attempt (E-51).

## Tests hook

What the suite guarantees, how the two layers of invariants and data mirror differ, and how a model extension is developed test first is described by [testing.md](testing.md). The parts that hold this document honest are the frontend contract tests out of the data, the determinism test, the vocabulary coverage gate and the Node unit tests of the pure data layers.

## Related

| Topic | Canonical source |
|---|---|
| Design stance and design system | [design.md](design.md) |
| Source material and data quality | [data.md](data.md) |
| Model, ontology, vocabularies | [data-model.md](data-model.md) |
| Test suite and TDD workflow | [testing.md](testing.md) |
| Architecture and model decisions | [journal.md](journal.md) |
| Identity, scope and state of work | [specification.md](specification.md) |
| Open handover points | [handoff.md](handoff.md) |
| Research framework and use cases | [research-framework.md](research-framework.md) |
