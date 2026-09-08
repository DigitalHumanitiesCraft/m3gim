---
title: Architecture
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: en
version: 0.8
created: 2026-02-19
updated: 2026-09-08
authors: [Christopher Pollin]
generated-with: Codex
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

[data.md](data.md) owns source formats, columns and recording defects. The loaders share the following resolution rules.

- `load_objekte` in `scripts/_common.py` requires `M3GIM-Objekte.csv` for ordinary production; compatibility readers cannot silently replace the source format.
- `load_index` reads the four XLSX indexes and repairs missing, shifted or overwritten headers before field-wise consolidation.
- `resolve_verknuepfungen_source` in `scripts/transform.py` selects the required directory containing `Box_*.csv`. Missing production CSV inputs stop the transformation.
- The shared multi-sheet loader preserves sheet names and one-based row numbers including the header. Exploration, validation, audit and transformation use it. `Typ-Rolle.csv` supplies validation values and is excluded from the link rows.

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

Step 2 exits with code 1 as soon as the report carries ERROR findings, which is the expected state at the current data state, and step 5 reports the known source defects in the same way. Both have done their work once the report is written, the findings go to the cataloguing team through the handover list under `data/reports/`. Step 3 reads its role concepts, concept definitions and dating scopes out of the vocabulary rather than duplicating them (E-133), counts every path that discards a source row and prints the tally at the end of the run. Step 4 copies the result into the frontend data directory and skips the copy when the output directory is not the default, so a staging run cannot overwrite the published data source. Step 8 is deterministic by construction, no timestamps and no unordered sets, and uses `scripts/_site_html.py` for the common page shell (E-297, extracting the E-251 templates). That module owns page metadata, structured data, navigation, footer and ordered stylesheet links. `scripts/sync-site-html.py` updates those regions on all five pages without loading vocabulary or archival data; `--check` reports drift without writing. Handwritten page bodies remain intact. Model-page generation still produces its own vocabulary-derived body and synchronizes the shared regions afterwards.

The source validator resolves E005 against the complete published record-key policy: source records, RecordSet parents and recursively derived Folio parents, with the same deterministic hyphen repair as transformation. Signature-only rows that transformation drops produce E016 and cannot satisfy a link target. Calendar validation checks complete dates and month values as well as their notation; an impossible link date produces E010 at its source cell. Both source tables report midnight timestamp patterns as W010 before cleanup. Processing-status validation uses the shared `_common.py` normaliser and checks its result against the normalised accepted vocabulary, preserving E004 for unknown values. The legacy transformation limit for timestamps is documented in [data.md](data.md) § Date notation of the source.

Step 7 is the cataloguing team's consolidated report (E-272). It covers thinly catalogued convolutes, worked-on objects without links, unlinked title places, unmapped link types and validation errors grouped by class. Its `worked_on_without_link` rule is shared with `tests/test_61_orphan_links.py`.

The quality snapshot computes its figures from the dataset and reconciliation output and links to the maintained source and reconciliation finding registers. It contains no separately maintained list of editorial instructions. Register links resolve from the configured report directory, including isolated output locations.

### Scripts outside the run

| Script | Purpose |
|---|---|
| `reconcile.py` | Wikidata reconciliation of the four indexes, exact and alias matches before fuzzy matching, type filter per entity kind, composer check for works, confidence levels exact, alias, fuzzy_high and fuzzy_low. Writes `data/output/wikidata-reconciliation.json` |
| `enrich-wikidata.py` | Wikidata properties for matched entities, occupation, voice type, life dates, coordinates, country, composer, genre, premiere date, foundation date. Uses only identities explicitly present in source indexes or manually approved matches (E-301). Writes `data/output/wikidata-enrichment.json` |
| `verify-manual-approvals.py` | Holds every `match: "manual"` entry against live Wikidata labels, aliases and description, exit code 1 on a mismatch (E-78). `SKIP_VERIFY_MANUAL=1` skips it offline |
| `export-wikidata-csv.py` | Lookup CSVs from the reconciliation file for import into the spreadsheet |
| `propose-links.py` | Link proposals from the object titles against the four indexes, in the column shape of the link table. Assigns no role and resolves no ambiguous title position (E-147). Writes `data/reports/link-proposals.md` |
| `scout-coverage.py` | Read-only measurement of the data coverage of a place focus before a view is built on it |
| `assemble-verknuepfungen.py` | Reassembles the per-box CSV exports into the workbook, for the fallback path of the loader |
| `build-social-images.py` | Open Graph image and PNG favicons into `docs/img/` from the accent token. Needs Pillow, which no requirements file carries |
| `backup.py` | Unchanged snapshot of a raw Drive export into the gitignored `data/backup/` |
| `check-doc-split.py` | Content preservation when a knowledge document is split or merged |

`reconcile.py` and `enrich-wikidata.py` need network access and run only when the Wikidata alignment is drawn again. Both result files are git-tracked and present in a normal clone.

The standard transformation requires the object table, links and all four nonempty index tables. Missing required input fails before publication. Reconciliation retains previous results when an index is missing or a request fails; transient errors remain eligible for retry and make the selected run exit unsuccessfully. Lookup exports admit only manually approved matches; automatic matches remain proposals. Central JSON and publication writes use temporary files and atomic replacement. Backups are staged and hash-verified before replacing an existing snapshot; a failed new backup leaves no apparently complete target.

### ENV overrides

| Variable | Default | Honoured by |
|---|---|---|
| `M3GIM_SHEETS_DIR` | `data/google-spreadsheet` | `_common.py`, `explore.py`, `validate.py`, `transform.py`, and through `_common` also `audit-data.py` |
| `M3GIM_OUTPUT_DIR` | `data/output` | `_common.py`, `transform.py`, `build-views.py`, and through `_common` also `audit-data.py` and `report-quality.py` |
| `M3GIM_REPORTS_DIR` | `data/reports` | `_common.py`, `explore.py`, `validate.py`, and through `_common` also `report-quality.py` |
| `M3GIM_JSONLD_PATH` | `$M3GIM_OUTPUT_DIR/m3gim.jsonld` | `build-views.py` |
| `M3GIM_VOCAB_PATH` | `vocab/m3gim.ttl` | `transform.py` |
| `M3GIM_ALLOW_NO_WIKIDATA` | unset | `transform.py` |

The three path variables are resolved once in `scripts/_common.py` and imported by consumers, including audit and quality reporting (E-167). `explore.py`, `validate.py` and `transform.py` resolve the same variables in their own module scope with the same defaults.

### The Wikidata guard

`transform.py` reads `wikidata-reconciliation.json` and `wikidata-enrichment.json` from the output directory, that is from the zone it writes its own result into. If the directory is fresh or has been emptied, both files are missing, and the dataset then loses every enriched property, coordinates, life dates, occupations, voice types, composer and genre statements, together with the identifiers that only reconciliation adds. The frontend renders an empty Karte in that case because no node carries coordinates any more. The run therefore aborts with exit code 1 and a message naming the two files, unless `M3GIM_ALLOW_NO_WIKIDATA=1` marks the run as deliberate (E-167). Whoever works with an alternative output directory copies the two files there first.

### Generated and versioned outputs

`data/output/` holds the dataset and the two Wikidata files, all three versioned so a normal clone can run and compare. `docs/data/` holds the published copy of the dataset and, beside it, the world geometry `geo/countries-110m.geo.json`, which no pipeline step produces. `m3gim.jsonld` is the only archival data source of the frontend. Under `data/reports/` three classes live side by side, the permanent curation evidence of the authority alignment, the finding registers of the operational error management, and the reports a run regenerates, of which the exploration, validation, link-proposal and cataloguing reports are gitignored.

Dataset and consuming frontend changes must be published as a compatible revision. An earlier staggered publication broke the frontend until its consumer changes arrived. Publication therefore verifies the shipped data copy and consumers together.

Identical source data yield identical artefacts with two exceptions. `transform.py` writes the run date as `m3gim-ontology:exportDate`, and the generated Markdown reports carry their generation time in the head. A rerun from an unchanged source therefore shows exactly those lines in `git diff` and nothing else. `tests/test_10_determinismus.py` holds the property by running the transformation twice and removing the export date before the comparison.

### What the transformation asserts

[data-model.md](data-model.md) owns the emitted classes, relations, provenance and known RDF compromises. Transformation resolves source rows into that model, retaining source cells and uncertainty. It reads role definitions, labels and dating ranks from `vocab/m3gim.ttl`, preserves unsupported link types as neutral statements and reports source rows lacking a resolvable record. Occurrence grouping remains absent. E-301 removes inferred historical relations and retains original link cells, dating evidence and property-level authority provenance.

[data.md](data.md) § Compensations in the pipeline records permitted format repairs, source preservation and prohibited assumptions. There is no active CI workflow; pipeline execution and publication are local actions.

## Frontend

### Runtime and toolchain

Vanilla JavaScript with ES modules, no build step (E-03), no framework (E-01), delivery over GitHub Pages. The whole dataset is loaded once at startup (E-05). D3 7.9.0 and the interface fonts are shipped under `docs/vendor/`. `docs/vendor/manifest.json` records their upstream URLs and SHA-256 digests, and adjacent licence files preserve redistribution terms. The Karte fetches the locally shipped country geometry when it first opens. D3 carries the projection and zoom of the Karte and the edge drawing of the Netzwerk. Dashboard renderers use the same local D3 runtime alongside native controls and evidence lists.

`start.js` is the small browser entry. It preserves the current route when the skip link focuses the main region and catches a failed application import with a reload action and direct project/data links. The loading region starts hidden in HTML, so the separate `noscript` explanation remains usable without JavaScript. The application tablist stays inert until its event handlers and initial view are ready, so early clicks cannot bypass startup. The entry imports `main.js` and calls `startApp()`. This loads `./data/m3gim.jsonld` through `loadArchive`, sets up the Korb and the register menu, and starts the router. The registry `TAB_RENDERERS` maps every tab key onto its render function. A tab is rendered once when it is first activated and afterwards updated by its own drawing logic, only the Korb is fully redrawn when its content changes. A render error stays inside its tab and releases it for another attempt (E-51). On localhost `main.js` additionally imports `utils/dev.js` dynamically (E-50).

The application head contains a generated import map for every module under `docs/js/` (E-298). A deterministic digest of their paths and text versions all module URLs and the `start.js` entry together. The map applies to static and dynamic imports and retains one shared module instance for filter and store state. Relative addresses also work under the Pages repository prefix. After JavaScript edits, `scripts/sync-site-html.py` refreshes the map; its read-only check detects stale versions. Line-ending normalization keeps the generated head stable across Windows and Unix checkouts. This prevents fresh HTML from importing incompatible dependencies retained in the browser's HTTP cache.

### Module layout

Every view follows the same cut. The orchestrator holds the view-local state, builds the sidebar and draws. The data layer beside it is free of DOM and D3 and therefore checkable with Node unit tests, and where the drawing grows it lives in a module of its own.

| Path | Purpose |
|---|---|
| `main.js` | Entry, `TAB_RENDERERS`, lazy rendering per tab, error boundaries |
| `data/loader.js` | JSON-LD loading and store construction in separate passes (E-72), plus the accessors for datings and locations, `primaryYear` among them |
| `data/records-for.js` | The one resolution from store and filter to a result set, with `baseIds`, `recordsFor`, `facetInventory`, `docTypeGroups`, `facetCounts`, `yearBounds`, `yearOf`. Pure |
| `data/query-predicates.js`, `query-evidence.js`, `evidence.js` | Canonical typed predicates, source-entry matching and the common aggregate/evidence contract |
| `data/place-evidence.js` | Source-preserving place projection shared by Orte and dashboard aggregations; `views/karte-data.js` remains a compatibility re-export |
| `data/constants.js` | `CONTENT_FAMILIES` and `familyOfBlock`, `AGRELON_LABELS`, `ANCHORING_SCOPES`, the mobility cluster mapping, and the shared glyphs |
| `data/entity-types.js` | Shared register/facet/network keys and recorded RDF-class dispatch; CorporateBody and Group use institution |
| `ui/router.js` | Hash routing, tab switching, ARIA state, `navigateToView`, `navigateToIndex`, `applyArchivFilter`, `setIndexRegister`, `INDEX_REGISTERS`, legacy aliases |
| `ui/tabs.js` | Keyboard pattern of the tab bar, returns the chosen tab name and writes no hash |
| `ui/tooltip.js` | One fixed tooltip overlay for the application, outside CSS columns, with hover/focus handling, accessible description and viewport placement |
| `ui/register-menu.js` | The register menu at the Indizes tab, the first click or ArrowDown opens the four registers under it (E-293) |
| `ui/sidebar.js` | The one scaffold of the filter column, `createSidebar` and `viewShell`, the composer of the parts beside it and the one import address of the views (E-250) |
| `ui/search.js`, `search-data.js` | Shared draft/commit combobox with an explicit text action, prospective text count and typed filter actions retaining original family/value identities |
| `ui/sidebar-status.js`, `-facets.js`, `-options.js`, `-range.js`, `-strip.js`, `-controls.js` | Result line, shared facets and tree control, row forms, year range, chip strip, remaining control factories |
| `ui/filter-state.js` | The shared filter state with `getFilter`, `setFilter`, `replaceFilter`, `addFacetValue`, `resetFilter`, `deviatingKeys`, `subscribe` |
| `ui/filter-url.js` | Parsing and serialising the shared filter and view parameters in the hash query. Pure |
| `ui/events.js` | The navigation channel `m3gim:navigate`, replayed for views not yet rendered (E-53) |
| `ui/basket.js`, `ui/family-icons.js` | Korb with localStorage persistence and the four family symbols |
| `views/*` | Per view an orchestrator, a pure data layer and, where needed, a drawing module |
| `utils/` | `dom.js`, `env.js` (`IS_DEV`, `logStamp`), `format.js` (signatures, document types, `cityOf`), `normalize.js`, `date-parser.js`, `provenance.js` (`extractXlsxSource`, E-91), `dev.js` |

The shared CSS responsibilities are separated into `view-shell.css` for available-height layout and toolbar placement, `search.css` for common search/history, `sidebar.css` for facet controls and `controls.css` for compact selects, inputs and text actions. `variables.css` carries colour, geometry and stacking tokens; each tab stylesheet retains its local visuals. The page catalogue supplies the stylesheet order. The token layers and design rules stand in [design.md](design.md).

The content pages `about.html`, `projekt.html`, `datenmodell.html` and `impressum.html` lie beside the application as standalone HTML and are reached by ordinary links, not by hash routing. Explanatory and legal content is a linkable page and never a modal overlay (E-26). `datenmodell.html` is generated and never written by hand.

### Store and loader

`loadArchive` distinguishes a missing network connection, a missing file and a failed parse and reports each case with its own German text (E-52). `buildStore` builds the maps in separate passes (E-72), first the concepts so an annotation finds its dating scope while it is being built, then nodes, relations, the convolute hierarchy and finally the set of records without any link.

| Store map | Source in the JSON-LD | Use |
|---|---|---|
| `records`, `allRecords`, `bySignatur`, `byDocType`, `byYear` | the record nodes | base indexes of every view |
| `konvolute`, `konvolutChildren`, `childToKonvolut`, `konvolutMeta`, `folioIds` | the convolute hierarchy | grouping and group head of the Bestand |
| `persons`, `organizations`, `locations`, `works`, `ensembles` | the linked entities | registers, facets, Karte, Netzwerk |
| `dftHierarchy`, `conceptDefinitions` | `skos:Concept` with `skos:broader` and definition | document type facet as a tree, label, gloss (E-143) |
| `roleVocab`, `roleScope`, `roleRank` | role concepts with dating scope and rank (E-150) | display form and recorded aspect of a role |
| `annotations`, `recordToAnnotations`, `recordDatings` | `m3gim-ontology:Annotation` and `m3gim-ontology:hasAnnotation` | datings in the detail, `primaryYear` |
| `mobilityEvents`, `recordToEvents` | the located annotations with coordinates and country | Karte, undated Chronik document context, place block of the detail |
| `agentRelations` | `m3gim-ontology:hasAgentRelation` | relation block of the detail, marks in the registers and the Netzwerk |
| `finances` | detail annotations with amount, currency and role | finance block of detail and Korb |
| `stageRoles`, `performances`, `recordToPerformances` | `m3gim-ontology:StageRole` and `m3gim-ontology:Performance` | work and performance blocks, stage parts in the Statistik |
| `eventsByRole`, `recordsByAgentRole` | precomputed facet indexes | axes of `recordsFor`, so a cut does not walk the graph |
| `unprocessedIds` | records without any link | definition of the document base (E-165) |
| `@context`, `graph` | the shipped document itself | the Korb exports the selection as JSON-LD without refetching the file |

Three maps flatten the raw JSON-LD into a lookup shape, `agentRelations`, `mobilityEvents` and `finances` carry for instance `objectName` instead of the nested `agrelon:hasObject`. Reading the JSON-LD keys there yields an empty result without an error. The JSDoc shapes stand above `buildStore()`, and the contract tests in `tests/test_06_frontend_contract.py` hold these assumptions out of the data.

The shared document-time basis reads the explicit record dating under E-301. It preserves ranges, qualification and missing dates; content-role ranks cannot supply a substitute document date. The filter and dashboard distinguish intervals and uncertain bounds from exact calendar bins. The Chronik projects each recorded content date separately within the selected document set. Every date remains attributable to its own source statement.

### Filter state and result set

One filter state carries all views. A cut by place, person, work, institution, document type, link type or role, country, year window or free text holds in every filterable view at once. `ui/filter-state.js` keeps the object and offers `getFilter()`, `setFilter(patch)`, `replaceFilter(filter)` and `subscribe(fn)`. Changes dispatch a `m3gim:filter` event to subscribers. The state lives in the module, so a cut survives a tab change on its own.

The shared list facets are `ort`, `person`, `werk`, `institution`, `docType`, `verknuepfung` and `land`; `zeitfenster` is a year pair and `search` is free text. `verknuepfung` represents both a link type and a composite `type:role` value. Several values of one basic facet act as OR, different facets as AND (E-151). Typed `predicates` add `entity-role`, exact `records` and inclusive/exclusive `set-membership` descriptors. Unsupported descriptors normalize to an explicit `invalid` condition, which matches no records and remains removable. Deep-frozen normalization, deterministic serialization and structural equality prevent equivalent updates from dispatching or entering history twice.

The application starts with the empty selection (E-253). `deviatingKeys()` drives the active chips and `resetFilter()` restores the full basis. Shared search uses cached normalized document fields and linked entity names. Draft suggestions preserve family and raw value; selecting an option consumes the draft and commits its typed facet or exact source ID. A separate open action preserves the cut. Registers and Orte have no local text lookup.

`buildFacetSelectionPatch` creates entity/role binding regardless of control order. Matching requires both values in the same place or agent/subject entry. Existing unbound facet URLs retain document co-occurrence semantics; the filter strip offers explicit conversion. `facetSelectionValues` represents consumed basic values in their bound form. Candidate counts preserve the complementary bound condition. `linkRoleInventory` and the shared role tree include every source family, missing roles and unlabelled role keys. `recordsFor` returns matching witnesses separately from the complete qualifying document context.

Filter history is owned by `ui/filter-state.js`. `undoFilter`, `redoFilter` and `filterHistoryStatus` serve the shared toolbar. URL restoration and replay use `{history:false}`. Range inputs update their visible preview during input and commit once on change. Removing half of a bound condition retains the remaining entity or role as a basic facet.

`recordsFor(store, filter, {base})` resolves the shared result set for every view. `baseIds(store)` includes every record with a source-bearing link, including neutral annotations and details under E-301. A source-bearing link requires recorded content. Rows containing only a signature or folio join do not create annotations or expand the interface basis. Records without source-bearing links remain outside that basis; the finding aid for the complete fonds remains the archive. `recordsFor` returns `ids` together with the counts `weit`, `eng` and `undatiert`, which are counted and never cut, so a view can name the difference without computing it. Undated records survive the year window (E-88). `facetInventory`, `docTypeGroups` and `facetCounts` provide the shared selectable values and counts; `yearBounds` and `yearOf` supply the common date resolution. A lexical gate in `tests/frontend/records-for.test.mjs` keeps the former per-view resolutions out.

### Router and deep links

`ui/router.js` is the only place that writes to the address bar (E-208). Manual Bestand expansion calls `selectRecord` for the open record or displayed Folio page; closing clears the selection. Row rebuilding preserves the activated row's viewport position, while direct navigation immediately aligns the document row below the sticky column and convolute heads. Bestand calculates the required trailing scroll space from the table height, including for filtered lists shorter than the viewport, and resets it on a view update. The grammar is `#<tab>[/<recordId>][?<query>]`, and `splitHash` separates the query before it splits the path, so an existing deep link to a record stays valid. Writing goes through `replaceState`, so a slider step creates no history entry. The catalogue `TABS` holds `bestand`, `chronik`, `statistik`, `indizes`, `karte`, `netzwerk` and `korb`, every registered tab is visible. At the Indizes the second path segment carries the register from `INDEX_REGISTERS` instead of a record, so the address reads `#indizes/personen` (E-226).

Four legacy aliases keep old addresses alive, `archiv` becomes `bestand`, `mobilitaet` and `mobilitaets-atlas` become `karte`, and `verknuepfungen` becomes `netzwerk`. The query part survives the redirect. `resolveRecordId` maps the instance prefix `m3gim:` from before the namespace split onto `m3gim-data:` (E-138). `parseHash` reads the path before the query, because the filter handover dispatches to the subscribers and the router writes the address back out of that subscription, which would otherwise carry the record of the previous hash. A hash without a record part clears the selected record (E-219).

`navigateToIndex(gridType, entityName)`, `navigateToView(tab, context)` and `applyArchivFilter(facet, value)` are the ways into a view. Only the record id and the register stand in the address, the remaining context travels as the detail of the `m3gim:navigate` event and stays out of the shared filter (E-226). `setIndexRegister(key)` writes the register from the view, and the register menu at the tab reaches the already drawn page over the same channel.

An explicit filter query replaces the previous filter atomically. A queryless link preserves the cut. The filter is encoded with German keys, for instance `typ=correspondence&ort=Bayreuth,Wien&jahr=1951-1953`. The comma separates the values of a facet, a comma inside a value is percent-encoded, which is the normal case for the name form surname first. Empty values do not appear. The former key `docType` is still read so existing deep links hold (E-173). Beside the filter the query carries the parameters of a view, the selected Netzwerk node among them. `viewParams` in `ui/filter-url.js` returns every pair whose key is no filter key, and `updateHash` carries them through each rewrite while the tab stays the same and drops them with the view they belong to, so a hash naming both a cut and a node no longer loses the node (E-278). `tests/frontend/filter-url.test.mjs` and `router-hash.test.mjs` cover both directions of the grammar.

`setViewParams` is the shared writer for panel configuration and saved comparison reference. View parameters are retained per view during tab changes and restored through the existing navigation channel. Typed predicates use repeated `praedikat` parameters with canonical JSON. `quellansicht=1` identifies explicit source inspection that preserves the active cut. A source outside that cut opens its complete detail above Bestand with a visible context label; it does not silently remove predicates or change the result count.

### The one filter column

`createSidebar(store, opts)` builds the year range and facets, followed by view-specific sections and the legend. `viewShell` centrally mounts its single search and filter strip above the work area. Each view destroys the old sidebar subscription and search listeners when rebuilding. The result line is the root row of the document-type tree (E-170). It exposes a focusable data-state label and can describe the view's eligible evidence separately from the common record count. Layouts below 1200 viewport pixels initially fold the column behind the labelled Filter control.

`createSidebar` returns `element`, `strip`, `update()` and `destroy()`. The strip is the row of deviating values as removable chips with the reset link, which every view hangs above its canvas so a filter change cannot make the column jump, and which stays empty and without height while nothing deviates. Through `localChips` the strip additionally takes groups that only cut in one view, the local place lookup in Orte, which answers the same reset; entity and country choices use shared facets. The column subscribes to the filter itself and reports every change, its own and a foreign one, as a single `onChange` call.

The document type is a tree whose selected groups include their descendants; `impliedByGroup` marks an included child. Other facets use keyboard-operable lists with complete expandable remainders. Values come from `facetInventory` and the dataset (E-87), including zero-count candidates. Missing roles and absent role labels use explicit selectable fallback values, superseding the hiding rule of E-143. Cataloguing status remains in record details and reports.

### Views

The Bestand modules (`views/bestand.js`, `bestand-data.js`, `bestand-rows.js`, `_bestand-filter.js`) separate rendering, projection, row construction and filter handling. [design.md](design.md) owns the table and folding contract. As soon as a facet, the free text or the year window cuts, `flattenForFilter` flattens the hierarchy and `pruneEmptyKonvolute` removes a head whose children all fell out of the cut. A record addressed by id always opens, and `widenFilterForRecord` widens the cut by exactly one value the record carries, every widening appearing as a chip (E-219). Entity counts deduplicate names per family; `ui/family-icons.js` supplies the common symbols (E-212).

The record detail (`views/record-detail.js`, `record-detail-data.js`, `record-chips.js`) runs across the full width and is built from `buildRecordBlocks`, which also feeds the Korb. Source-composite annotations and neutral detail values retain their recorded wording; their grouping does not assert an event. Chips come from `buildRoleChip` with an authority link where available. Tooltips expose original notes and property-level index or Wikidata sources. Technical sheet and row references remain in the data and exports (E-285). A recorded `rico:generalDescription` appears as a source note; E-301 removes algorithmically inferred quality claims.

The Chronik resolves the common document set through `recordsFor` and projects exactly those records through `chronik-timeline-data.js`. `buildChronikTimeline(store, records)` retains source identities, dated statements, document context, typed parts, notes and original provenance. `chronik-time-layout.js` parses exclusive UTC extents and builds natural calendar groups plus explicitly compressed gaps. Its piecewise `position` and `timeAt` mappings place the source-derived calendar groups. Ranges only occupy their start group; at month/day granularity, coarser datings are retained separately. `chronik-calendar-data.js` deduplicates group sources by record identity and aggregates each entity family while preserving every evidence item and original row. `chronik-date-summary.js` summarizes distinct dating values for longer source previews, separating precise calendar coverage from recorded intervals, qualifiers and coarser values. It does not mutate source contexts. `chronik-axis.js` owns navigation, the sticky current period, one anchor per calendar group, folds and labelled source lanes. After rendering, it measures all group content with the possible detail-column width reserved, then supplies one common height to the pure calendar layout. Measurements change with corpus, scale or outer host width; opening selection keeps the established geometry. `chronik.js` renders named lane previews, dating summaries, cross-lane selection and complete shared-panel evidence with original datings. Invalid and undated values stay accessible through explicit controls.

The source fidelity contract removes the editorial biography layer from the research interface. Biographical interpretation stays in `knowledge/research-framework.md`. No phase boundary, inferred presence or career category supplies an archival assertion or a filter value.

`ui/selection-detail.js` and `css/selection-detail.css` own the shared Chronik, Netzwerk, Indizes, Orte and Dashboard selection shell. `createSelectionDetail({host,onClose,onChange})` returns `open`, `close`, `setFocusTarget`, `destroy` and panel/scroll getters. A caller replacing the originating control can retarget keyboard return to its surviving panel without reopening the detail. Views supply title, context, subtitle, content, originating trigger and an optional back callback. The component creates a hidden slot, opens a 300-pixel column only on sufficiently wide hosts, and moves the same panel into a native dialog on narrower hosts. It owns Escape, focus restoration and resize placement. Chronik keeps nested list state and source-specific evidence; Netzwerk keeps graph selection and URL state. The existing time/node coordinates remain stable. Indizes keeps its list DOM and scroll offset when selecting another entry. Resize observation ignores hidden hosts and closes their native dialog, so an inactive view cannot trap navigation (E-293).

The shared shell keeps its complete heading in a sticky header. `ui/detail-disclosure.js` supplies a native, initially closed details/summary container for dashboard evidence, register co-mentions and network neighbours/sources. It changes presentation only; evidence arrays and filter state remain owned by their existing modules (E-299).

The Dashboard keeps `views/statistik.js` as its route orchestrator. `statistik-data.js` computes DOM-free aggregates from an explicit document-ID cut. `dashboard-panel.js` owns independent panel configuration and renderer lifecycle; separate `dashboard-*` modules render the seven choices. `dashboard-selection.js` owns the one dashboard-wide selection and shared detail. Highlight updates operate on existing marks so a selection preserves local zoom, focus and panel controls. A chart replacement disposes its old renderer.

The route orchestrator applies paired presets through one `setViewParams` call. The panel owns native display/export disclosures. `dashboard-coverage.js` compares aggregate document-ID sets with the current cut and shared selection without changing either. Matrix aggregation exposes dimension membership from its existing indices; the renderer adds visible-page IDs so the coverage explanation can separate missing information, unsupported binding and local pagination. Reference-only A records remain represented when the comparison contains them. Coverage never adds synthetic evidence or changes export membership (E-300).

Aggregates carry stable keys, dimension values, counting unit, denominator, complete record IDs, source witnesses and an applicable descriptor. `dashboard-shared.js` supplies shared mark actions, complete list equivalents and download primitives. Source-statement Sankey aggregates reuse `data/place-evidence.js`, and `dashboard-map.js` reuses `karte-map.js`. A/B reference state retains the normalized filter, selected IDs and dataset fingerprint separately from current B. The router writes `dash-panel-a`, `dash-panel-b` and `dash-reference`; selecting a chart never writes a hidden document filter. Selection downloads preserve aggregate definitions and original source evidence; basket integration only adds missing IDs after an explicit action.

The Indizes orchestrator (`views/indizes.js`) owns the active register, sorting, shared-cut entries and selection. `indizes-data.js` computes entries, roles and co-mentions without DOM. `indizes-detail.js` builds complete expandable lists inside the shared selection shell. Properties with their sources, explicitly bound or unassigned stage parts and document co-mentions have separate sections. The record count links to the corresponding shared facet; network and map actions carry view-specific context.

The Orte view retains the `karte` route. `views/karte.js` coordinates the compact navigator, map and shared selection detail; `karte-detail.js` separates `buildPlaceOverview` from `buildPlaceSources`. Opening the latter with an optional role changes only the local panel. Its document disclosures retain every evidence row and the shared back callback restores the overview. `data/place-evidence.js` owns the pure projection, and `karte-data.js` re-exports its API for existing consumers. `buildOccurrences` preserves source rows, addresses and own statement dates. Only matching record/sheet/row/data-point/place identities merge mirrored graph paths. `documentDate`, `recordDate` and `recordYear` remain separate context. `karte-map.js` exposes `buildMap` with `draw`, `centerCity`, `selectCity` and `destroy`, reused in the dashboard. Explicit selection queues centring after shared-detail geometry settles; ordinary resize does not fit the full corpus again.

The Netzwerk (`views/netzwerk.js`, `_netzwerk-geometry.js`, `_netzwerk-canvas.js`) stands in two forms of the same cut, the two-mode network of actors and linked records and the person projection the sidebar switch leaves behind. The creator of the fonds is no node, she stands on almost every document and would connect everything with everything. Graph building and layout are pure functions in the geometry module, the same ones that carry the GEXF export, the edges are drawn on a canvas and the nodes in SVG above it. `layoutGraph` holds its repulsion in a uniform grid of typed arrays and ends at measured rest rather than after a fixed number of steps, the iteration count being only the ceiling for a graph that never settles, and it reports steps, rest and last movement beside the positions (E-273). A click marks the neighbourhood without moving the layout, two steps at an actor of the two-mode network and one step everywhere else (E-276), and the selected node stands in the query part of the hash. The retained visual and timing criteria are in [testing.md](testing.md) § Boundaries; observations and remaining acceptance are recorded in [plan.md](plan.md).

The Korb (`views/korb.js`) is the cross-cutting selection list, held in localStorage and counted in the tab bar. A card shows the same functional blocks as the detail, and the export writes CSV with a UTF-8 BOM, BibTeX, GEXF, and the selection as a JSON-LD document with the context of the source. `recordEvidence` is the one place that gathers what every format then carries, the source cell of the record and, per data point, family, role, value and source cell (E-281). The CSV holds one column per family in the form „Rolle: Wert [Blatt Zeile]" beside the document-year column, the BibTeX note takes the same statement, the GEXF writes sheet, row and data point as attributes at node and edge and merges two mentions into one edge only where they stand on the same source row, and the JSON-LD carries the provenance in the copied records.

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
