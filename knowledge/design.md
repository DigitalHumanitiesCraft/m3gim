---
title: Design
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
  name: Vorlage Design
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/design
topics: ["[[Information Visualisation]]", "[[Scholar-Centered Design]]"]
related: [architecture, specification, research-framework, data-model, journal]
---

# Design

## Stance

The interface is a research and cataloguing tool, not a dashboard and not a narrated exhibition (E-156). It shows the fonds the way an edition shows its sources, with visible provenance, an honest cataloguing state and a typography that suits reading. Gaps and duplicates stand as they lie in the source. The interface strings are German, the code and this document are English. Four rules govern every view.

1. Explanation comes from structure, symbols and tooltips. Standing explanatory text is the antipattern, counts live in the controls that carry them, captions and breakdowns live in tooltips. The tooltip is the preview, the detail column or the inline detail is the detail.
2. All filters of all views live in the one left sidebar. There is no top filter bar and no view-local filter place, and neither sidebar nor detail column scrolls. A column that would run long folds, caps a list with a link into the view that owns the level, or starts its view-owned sections collapsed (E-240, E-259).
3. Nothing is hidden silently. The application opens on the full result set (E-253), no cap and no threshold removes an entity from a picture (E-257), a count stands beside every facet value, and a data point a view cannot show is named beside the view with the reason.
4. Colour is spent on meaning only. The four content families, the accent as the single interactive colour, red for error and green for a Wikidata match are the whole vocabulary. A surface never takes the accent and an interactive state never takes a warm tone.

## Tokens

`docs/css/variables.css` holds every token and is the only source for the view stylesheets. Surfaces are warm and the accent is cool, and the two never mix (E-186). `--surface` is the white work area, the only ground content stands on, `--surface-2` the cream of the sidebar, `--surface-3` the parchment step of hover and keyboard cursor. `--line`, `--line-soft` and `--line-strong` are warm greys, so a hairline carries a boundary and no colour. `--accent` is the KUG blue of brand band, link, active tab, focus ring and selection outline, with `--accent-light`, `--accent-dark` and `--accent-soft` beside it. Text runs on `--color-text-primary`, `--color-text-secondary` and `--color-text-tertiary`, all warm, with `--color-text-inverse` on the band and `--color-absent` for a missing value. Exactly two semantic colours exist, `--color-error` for errors and data-quality flags and `--color-match` for a Wikidata match.

The four content families are the four entity kinds, `--chip-c-person-text`, `--chip-c-institution-text`, `--chip-c-ort-text` and `--chip-c-werk-text`, each at least 4,5 to 1 against white and separated in hue and lightness. The colour appears as the family icon of a Bestand row, as the dot at a block title of the detail, at the title of the four entity facets and at the head of a register (E-171, E-212, E-230). Chips stay neutral on `--chip-c-neutral-border`, so the legend arises from proximity, and `--swatch-color` stays transparent until a legend sets it. The categorical set `--cat-1` to `--cat-6` carries the Mobilitätssichten through the aliases `--color-sicht-*`, which Chronik and Statistik read.

Typography carries the kind of a value (E-187). `--font-mono` is reserved for identifiers, that is signature, folio, term id, Q-ID and provenance pill, `--font-title` is the serif of the word mark and the info-page headings, and everything else runs in `--font-ui` with tabular figures in number columns. Sizes run from `--text-2xs`, the half step of sidebar and legend counts, to `--text-3xl`, with `--weight-*` and `--leading-*` beside them. Spacing is an eight pixel grid, `--space-1` to `--space-16`, with `--space-1-5` for dense rows. The frame stands in `--view-sidebar-w`, `--brand-band-height` as `--top-bar-height`, `--footer-height` and `--table-head-height`, the last a token because two sticky layers stack on it. `--border-radius`, the two transitions and the three shadows close the set.

## Components

Sidebar. One column of fixed order in every view, composed in `docs/js/ui/sidebar.js` from the parts beside it (E-158, E-166, E-250). The order is search, Zeitraum, shared facets, view-owned sections, legend, with three rules, before facets, sections and legend. The search names its searchable fields in the placeholder and is absent where it cuts nothing (E-169). The result line is the root row of the Dokumenttyp tree, not a block of its own. Narrow screens start with the sidebar collapsed and expose it through the labelled Filter control. Dokumenttyp comes first, then the entity facets, each with the dot of its family. Selected values stand in a strip over the work area rather than in the column, so a filter change never makes the column jump (E-182, E-192).

Facet tree. Dokumenttyp shows its values as a tree without a search field of its own. Selection and pointer are separate (E-193), a selected row carries check and accent text without fill, fill belongs to hover and focus, the keyboard cursor takes `--surface-3`. The chevron is a click target over the full row height with `aria-expanded`. A selected broader term shows its children with a muted implied check, because the filter resolves over the leaves, and its tooltip names the split against the subtypes. An open facet is one row of title and input, whose suggestions offer the most frequent values on focus and the hits while typing, with keyboard operation, umlaut folding and a marked hit part (E-178, E-183). The placeholder is a standing prompt, never a real value (E-188). A count stands beside every value.

Chips. Every semantic data point appears as a chip of uppercase role token and value, the same primitive for single evidence in the detail, aggregate distributions with their count and AgRelOn relations. In the strip the removable outline chips stand grouped per facet under the facet name, because within a facet one value suffices and across facets all must hold (E-204).

Marks and family symbols. Four line icons in `docs/js/ui/family-icons.js` name person, institution, place and work, drawn in the family colour through `currentColor` and always `aria-hidden`, the meaning carried by tooltip and accessible name of the cell. Evidence against absence is a matter of stroke weight and colour. A quality flag of the model shows one neutral sign whose tooltip quotes the `rico:generalDescription` unchanged (E-222, E-243). Everything derived, inherited or supplemented carries exactly one mark, the dotted underline in secondary colour with a tooltip beginning "ergänzt: " (E-216), while absence stays italic in the absence colour.

Tooltips. The tooltip is the CSS tooltip on `data-tip`, with `data-tip-wrap` for multiline content and `data-tip-pos` for placement. Native `title` exists only on SVG drawings, because SVG nodes carry no pseudo elements (E-36). One hover shows exactly one tooltip (E-90), a tooltip never repeats the visible text, and an icon button carries an `aria-label` beside it (E-210).

Provenance pill. Every finance, relation and event data point of the detail carries a compact pill in mono naming the row of the recording table, with sheet, row and data point in the tooltip (E-221). It swallows the click, so it triggers neither the filter of its chip nor a jump, and its absence means the source carries no row for that data point.

Coverage line. Each view states at the view, not in the sidebar, how far its data reach the result set and on which data state, taking the export date of the dataset. It counts against the records of the fonds, never against itself.

Detail column. A view that carries a selection puts its detail in a column right of the drawing. The column is absent before any selection and slides in with it, the drawing using the full width beside the sidebar until then. It does not scroll, every list caps at a fixed number with a link into the view owning the level. Escape or a click on empty ground closes it, and the selection stands in the address.

Inline detail. The detail a Bestand row opens carries no close control, no title and no bundled source lines. It is closed from the row that opened it, by its chevron, by a click on the row and by Escape. Its head holds the full Signatur alone, as the citable identifier and as the first element of the meta bar, and takes the focus when the detail opens without entering the tab sequence. Provenance rides on the pill of every chip, and the administrative fields stay in the collapsible foot. Active row and detail row are one bracket with a continuous left accent bar, so neither a hairline between them nor a second accent edge below cuts it (E-271).

Register row. One element, one function. The whole row of a register entry, its name included, opens and closes that entry like its chevron and carries the keyboard operation of a Bestand row. The jump into the filtered Bestand lives only in the document pill, which keeps its `href` so a middle click opens the filtered view and which names its purpose in tooltip and accessible name (E-270).

Tabs. Seven tabs in three groups, Material, Perspektiven and Werkzeug, in one KUG blue band that also carries word mark and info links (E-160, E-185, E-196). Groups are set apart by spacing and a short hairline, never by a written label. The active tab takes white on a slightly lightened face with the white underline pushed into the band (E-211). The brand block takes the width of the sidebar column, so the first tab starts at the left edge of the work area, and between 900 and 1365 pixels the band keeps all seven labels by stepping padding and gaps down (E-244). The Indizes tab carries the register menu, which names the four registers with their family symbol and marks the chosen one with `aria-checked` (E-230).

Footer. One fixed row, neutral and without accent, in two groups, the KUG mark with the imprint on the left, repository, method, DHCraft and the CC BY licence on the right, each behind an equally sized mark (E-209), the explanations in the tooltips. `scripts/build-model-page.py` writes this row into all pages from one template (E-251).

## Views

Bestand. The records in archival order, convolutes as group heads with their children in signature order (E-82, E-203). A frameless record table over the full width, rows white on a warm hairline, the tinted tone only on hover, column head and parked open convolute head (E-191, E-198). A convolute opens closed, its chevron unfolds it and parks the head under the column head, and a direct link to a child opens its convolute (E-175, E-206). Arrow keys, Enter, space and Escape run through the heads (E-214). The head carries signature, title and date span, folded also the type distribution as small chips, with its numbers and its cataloguing state in the tooltip of the title (E-190, E-197). An object row carries an indented chevron for its inline detail with `aria-expanded`, shows the folio number without prefix, leaves the date empty where it equals the convolute, and shows the family icons of the entities it names with their counts (E-212, E-215, E-217). There is no sorting, because a hierarchy does not order flat.

Indizes. The normalized entities of one family, one register per page, chosen in the menu of the Indizes tab (E-226, E-230). A narrow head names register, symbol and size of the result set and carries the sort between evidence count and alphabet as a pair of signs (E-231). The list has no column heads, one entry per row with name, short enrichment, the time span of its evidence and the Wikidata mark. An expanded entry is a hub rather than a third rendering of the same documents, showing roles with their counts and the environment as a few chips per family, and handing over to Bestand, Netzwerk and Karte (E-252).

Chronik. Mobility over the life span as a scrolling year timeline. Records hang on the year axis as chips with a left accent in the colour of their dominant Mobilitätssicht, and a record without a located annotation stays monochrome, which is itself the statement that no Sicht is catalogued. Empty years keep their place as outline dots (E-88), undated records stand at the end, and a collapsible decade header aggregates the same records.

Karte. The places of the shared document cut, optionally refined by a selected organization, person or work (E-235). A quiet map from local geometry uses one node per place and no travel arrows (E-126). The Zeitraum control cuts documents through their primary time anchor. Their place evidence remains visible with its own date retained as provenance; an explicit place-role choice further selects the corresponding evidence. Every place of the cut the map cannot draw stands in a sidebar section of its own, whose title carries their number and whose rows give the record count, a ring mark separating a Wikidata match without coordinates from an unresolved name, and the jump into the documents a map point carries (E-280).

Netzwerk. The co-mention network of the result set, in two forms of the same data, the overview and the neighbourhood after a click (E-268). Nodes are the actors named at the documents of the cut and the records that link them, edges are the mentions, and the creator of the fonds is no node (E-256). No cap and no threshold removes a node. The view brings two controls of its own into the shared sidebar, the first taking the record nodes away so that the person projection remains, the second fading the actors that carry a single record, and neither of them removes anything (E-257). Actors are drawn in one quiet tone, records as small squares in the accent, highlight is the only strong colour, and labels appear on highlight and from a zoom level. The edge layer is drawn on a canvas with the nodes as SVG above it, because the projection of the unfiltered fonds carries more edges than SVG can highlight without stalling. A click keeps the layout still, highlights the neighbourhood, fades the rest and opens the detail column, and the GEXF export writes exactly the projection that is drawn (E-259). In the two-mode network the neighbourhood of an actor runs two steps, the records of the actor and the actors standing at those records, the second step paler than the first, while a record node and the whole projection mark one step (E-276). Visual acceptance checks that the layout avoids a lattice and uses the available area, record nodes remain distinguishable at their small size, relation marks are readable, the second neighbourhood step is perceptible, and labels remain legible in the dense centre. The layout spreads into the aspect ratio of the drawing area instead of settling into a round blob, a bounded non-uniform fit takes the rest, and a few relaxation passes push apart only the pairs that touch, so the spacing stays irregular and no lattice forms (E-274).

Statistik. The fonds in numbers over document types, repertoire, persons and institutions. Exactly one chosen section over the full width, built from rankings with DOM bars, the choice standing in the sidebar. Every row reaches its counted documents through a matching facet or a complete evidence list. Document-type rows use the same hierarchy as the filter tree, so parent categories include their children. `Weitere` opens the remaining individual rows on the same scale and has no quantitative bar of its own. Evidence lists show one linked document per line. The cataloguing state remains in the record detail.

Korb. The records collected by hand across the views, as a card list in the chip pattern of the inline detail, with export to CSV, BibTeX, JSON-LD and GEXF (E-232). Every export carries the source cell of every data point.

## Accessibility

The focus ring is a two pixel accent outline with offset from `:focus-visible`, set once in `base.css` and never removed, and a skip link leads to the main content. The tab bar is a real tab set with `role="tab"`, `aria-selected` and roving tabindex, and the Bestand heads are keyboard-operable with `aria-expanded`. A drawing is one tab stop, not one per node. Karte and Netzwerk expose a visible keyboard cursor within that drawing; arrow keys move it and Enter selects. In the Netzwerk Escape closes the selection, and the SVG carries `role="group"`, while the edges stay pointer-bound because the detail column lists the neighbours they carry as keyboard-reachable rows (E-279). The result line of the sidebar is a polite live region with `role="status"`, the loading region carries `aria-live` and `aria-busy`, and the error box is a `role="alert"` naming the requested file (E-233). Family icons are `aria-hidden` and the surrounding cell carries the name, and a section head with a generated tooltip carries an `aria-label` of its own so the tooltip text stays out of its accessible name. Under a reduced-motion preference the loading ring stands still and scrolling is not animated. Below 900 pixels of container width the sidebar folds behind a labelled toggle, and the Wikidata mark takes a finger-sized target on touch widths.

## Related

- [architecture.md](architecture.md) for the frontend structure, the store and the shared filter state.
- [specification.md](specification.md) for the epics and user stories the views serve, [data-model.md](data-model.md) for the Mobilitätssichten and the role kinds the chips render.
- [journal.md](journal.md) for the decisions cited here.
