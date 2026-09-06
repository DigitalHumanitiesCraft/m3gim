---
title: Handoff
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: active
created: 2026-08-21
updated: 2026-09-05
language: en
version: 0.6
authors: [Christopher Pollin]
generated-with: Claude Code
related: [INDEX, journal, specification]
---

# Handoff

This process inbox carries open points only. A point names its addressee, what is to be done and what closes it. Durable content moves into the document that owns it and leaves a line in [journal.md](journal.md) naming subject, source, target and outcome, after which the point is removed here in full.

Two kinds of point live here. Assignments run inside the repository and are held by a lane. Handovers leave the repository and wait on the vault or on the project lead.

Findings the cataloguing team fixes at the source do not stand here. They are collected in [`../data/reports/source-errors-handover-2026-09-01.md`](../data/reports/source-errors-handover-2026-09-01.md), the authority findings in [`../data/reports/reconciliation-register.md`](../data/reports/reconciliation-register.md). Decisions that wait on the project lead stand in [specification.md](specification.md) § Open decisions.

## Open assignments per lane

In parallel sessions each instance works in exactly one lane and touches only that lane's files. Every assignment ends with the invariant suite green, the JS unit tests green, and one journal line with an E number where it changes a decision. The publication boundary is the repository itself, nothing enters an external service.

The two versions the assignments serve are defined in [specification.md](specification.md) § Versions 0.9 and 1.0, the stories they fulfil in § Epics and user stories, and the acceptance instrument is the task set of [research-framework.md](research-framework.md) § Evaluation. Each assignment names its objective, the files it may touch, its acceptance and the evidence that closes it.

Order set by the project lead on 2026-09-05, F0 first, then F2 alone until the Netzwerk stands clean, with the sidebar as it is plus the two view controls, then F1, F3 and the Karte part of F4, then the rest. The dependencies were B1 before F1, B2 before F8 and B3 before the Karte check of F4. All three backend assignments are done, so none of them blocks any more.

Decision numbers. The register in [journal.md](journal.md) defines the next free number and is the only place a row exists. No block is reserved for a lane, an instance takes the next free number when it writes its row.

### Backend lane

B1. Done. Every role in use leaves the pipeline as a `skos:Concept` with a `skos:prefLabel`, so no role reaches the frontend as a bare label. Held by `tests/test_67_role_concepts.py` (E-254).

B2. Done. Pages recorded as `1_1`, `1_2` and so on hang under one record of their folio, which the pipeline derives where the source carries no object row for the folio itself. Held by `tests/test_68_folio_pages.py`, with the decision in the register of [journal.md](journal.md) and the shape in [data-model.md](data-model.md) § Shape of the graph.

B3. Done. The place branch of the reconciliation reads the place names of the Verknüpfungstabelle beside the place index, and Wuppertal carries an identifier again because the source now holds it in the place index (E-255). The places that stay unresolved and their reason stand in [`../data/reports/reconciliation-register.md`](../data/reports/reconciliation-register.md) § Orte ohne Kennung, where AF-07 keeps the remaining part. Whether the coordinates of such a place reach the dataset is the open point B5.

B4. Done. The Erschließungsreport carries the objects listed as worked on without a Verknüpfung as a section of its own and bundles the ERROR findings of the validation by class with a pointer into the validation report, so the team reads one place. The orphan rule lives once in `scripts/report-cataloguing.py` and `tests/test_61_orphan_links.py` asks it, held by `tests/test_69_cataloguing_report.py` (E-272). `ruff` is not installed in the environment of that run.

B5. Open. Coordinates for the places of the Verknüpfungstabelle. Wuppertal carries `wd:Q2107` and `owl:sameAs` in the delivered dataset without `geo:lat` and `geo:long`, while `data/output/wikidata-enrichment.json` holds coordinates for that identifier. The enrichment file was written after the transformation that produced the current dataset, so the first step is a fresh pipeline run after the frontend wave and a check of that record afterwards. If the place still stands without coordinates, the cause is the assignment path in `scripts/transform.py`, which is to be traced from the place index to the entries the link table builds. Acceptance: a place that only the link table names carries its coordinates and is drawn on the Karte.

### Frontend lane

F0. Open. Commit the open working tree and report the commit here. Acceptance: the commit hash stands in this file.

F1. In progress. Link types and roles as sidebar facets. Objective: the types of the Verknüpfungstabelle, place, person, work, institution, event, date, finance, ensemble, and their roles are facets of the shared sidebar with a count per value in the result set, built with the tree control of the document types. This carries the place role (E-224 becomes a facet choice), the country as a shared facet without a silent role exclusion, and the count per role. The Karte loses its local country section. The `sicht` facet, which no control writes, and the six mobility Sichten are removed. Files: `docs/js/ui/sidebar.js`, `docs/js/data/filter-state.js`, `docs/js/data/records-for.js`, `docs/js/views/karte*.js`, `docs/js/views/chronik*.js`, `docs/css/sidebar.css`, `tests/frontend/`. Acceptance: tasks 2, 3 and 4 of the task set pass in the browser, and the sidebar does not scroll at 1080 pixels height in any view. Evidence: unit test of the facet inventory, smoke test, screenshot per view.

F2. Built, acceptance and aesthetics in progress. The Netzwerk stands as one view in two forms of the same data, the two-mode overview of actors and records and the neighbourhood after a click, in `docs/js/views/netzwerk.js`, `_netzwerk-geometry.js` and `_netzwerk-canvas.js`. The decisions behind it are E-256, E-257, E-259, E-265 and E-268, and the rule lives in [design.md](design.md) § Views.

What remains is the acceptance in three layers. Completeness as an invariant: a unit test over the real dataset asserts that every actor of a linked record is a node, every mention an edge, and the edge count per record equal to its actor count, with the record `UAKUG/NIM_023 5` present unfiltered. Performance as a measurement in the smoke test: first draw of the unfiltered fonds under one second after data load, hover and click under one frame, edge count reported. Research use as tasks 4, 5 and 9 of the task set in the browser, where Bayreuth 1954 Tristan yields the participants with their roles from the sidebar alone. The visual acceptance re-reads the six findings of the project lead on the first two-mode build, the lattice layout, the size of a record node, the readability of the relation mark, the second step of the neighbourhood, the label density in the centre and the used area. Report the measured numbers here. Built since then are the layout to measured rest and its area use (E-273, E-274), the two-step neighbourhood (E-276), the coverage line (E-277), the view parameters in the hash (E-278), the keyboard operation of the drawing (E-279) and the relation attributes of the export (E-275). The signs of the drawing and the question of a legend are with the aesthetics wave.

F3. Done. The Zeitanker of a record comes from the highest-ranked anchoring Datierung of the Verknüpfungen, `rico:date` carries the fallback, the Anchor carries the date value beside the year, and the Chronik marks at the chip a year that does not come from the document's own dating (E-264). The time cut of the Karte and the date column of the Bestand follow the same anchor, and the Korb export names the Zeitanker with its Quellzelle.

F4. Done. The Karte names every place of the cut it cannot draw in a sidebar section of its own, with record count, reason and the jump into the documents (E-280), and its place evidence dates over the Zeitanker. Task 9 was played for `UAKUG/NIM_023 5` and for a Wagner record. Two findings stay outside this assignment, the far places drawn outside the European fit extent, which goes to the sidebar wave, and the coordinates of the link-table places, which is B5.

F5. In progress. One rule for stage part to work. Objective: record detail and Werke register bind a stage part to a work by the same rule in the loader, curated Partie of the Werke index first, otherwise a record with a single work, and mark the derived binding (E-216). Files: `docs/js/data/loader.js`, `record-detail-data.js`, `indizes-data.js`, `tests/frontend/`. Acceptance: a unit test runs both views against the same records and gets the same bindings. Evidence: the test.

F6. In progress. The coverage line of the Netzwerk carries the `exportDate` of the dataset, the other views do not. Objective: every view states the data state it is built from. Files: `docs/js/ui/sidebar.js`. Acceptance: the smoke test reads the date in every view.

F7. Done. Every export format carries the source cell of every data point and the Verknüpfungen of the record, gathered once in `recordEvidence` (E-281). Held by `korb-evidence.test.mjs` against `m3gim-data:NIM_016_13`, which carries every evidence family once. The remaining gap, the four download wrappers outside the suite, stands in [testing.md](testing.md) § Boundaries.

F8. In progress. Folio paging. Objective: the detail moves through the pages of a folio without leaving the record, and the Bestand shows a folio as one grouped row with its page count. Files: `record-detail*.js`, `bestand*.js`, `docs/css/`. Acceptance: task 7 of the task set passes. The folio record it needs stands in the dataset since B2.

F9. In progress. Erschließungsstand out of sidebar and Statistik (E-262). Objective: the cataloguing status stays as a statement in the record detail only. Files: `sidebar.js`, `statistik*.js`, `filter-state.js`. Acceptance: no filter chip and no Statistik section carries the status, the detail does.

F10. Waiting on the project lead. Gendered role labels, after the decision recorded in [specification.md](specification.md) § Open decisions. Files: [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl) if the labels move there, otherwise none.

### Knowledge lane

K1. Open. Dead section addresses outside `knowledge/`. Inside the knowledge base every reference of the form `document.md § Title` was rewritten onto the heading that now carries the subject, and `tests/test_45_knowledge_integrity.py` holds them from here on. The same references stand unrewritten in [`../CLAUDE.md`](../CLAUDE.md), [`../README.md`](../README.md), in the docstrings and comments of `scripts/`, `tests/` and `docs/js/`, and in the editorial notes of [`../vocab/m3gim.ttl`](../vocab/m3gim.ttl), which the generated model page reproduces. Beside them the decision register addresses a number of rows to numbered design rules that [design.md](design.md) no longer numbers. Both sets lie outside the file set this lane held for the pass and need an owner, and the second one needs a decision, whether the design rules take numbers again or those addresses move onto a section title.

K2. Open, to decide. Refactor of [journal.md](journal.md). The register is read at every session start and has grown long enough that reading it costs real context. The shape proposed is that the register holds only the rows that currently hold, that a superseded row moves to [journal-archive.md](journal-archive.md) with a pointer left behind, that a decision cell runs to at most three sentences with the mechanics in the document that owns the rule, that a rule citation names the document by content rather than by a numbered design rule, and that the session entries before September 2026 move to the archive as well. Nothing of this is decided, and the E numbers stay where they are in any case.

## Open handovers to the outside

### To the project lead: the six frontend principles (2026-09-05)

The Operational Orchestrator put six principles up for acceptance on 2026-09-05. Explanation comes through structure and tooltip, one subject per view with the pair of numbers only in the root row, one sidebar for all views, filters cut documents and nothing else, enrichment is always visible as such, and user stories name research goals. They wait on a yes or a no, and on a yes they enter [design.md](design.md) as rules with an E number of their own. The point stands as an open decision in [specification.md](specification.md) § Open decisions as well.

### To a vault session: process knowledge into the Promptotyping method document (2026-09-03)

The block below stood in the decision register of [journal.md](journal.md) until 2026-09-03. It describes the working method rather than this project and therefore belongs in the Promptotyping method document in the Obsidian vault, which does not carry it today. A session started in the vault moves it there and removes this point afterwards. The wording stands here unchanged and stays German.

> #### Was funktioniert hat
>
> - Promptotyping-Dokumente als Source of Truth → Code-Generierung
> - Synthetische Daten entkoppeln Frontend- von Datenarbeit
> - Design-System als CSS Custom Properties vorab definiert
> - Offline-first ueberlebt Funding-Gaps
> - Iterative Vis-Entwicklung (Partitur → Patterns fuer Matrix/Kosmos)
>
> #### Iteration-2-Erkenntnisse
>
> - Data-first statt UI-first
> - Modularisierung von Anfang an
> - User Testing frueher
> - Evaluation-driven Priorisierung (schwach abgedeckte Forschungsfragen früh benennen)
> - Controlled Vocabulary Enforcement bei Datenerfassung
> - Der Datenintegritätskern verträgt keinen großen autonomen Lauf. Der Lauf vom 2026-06-17 lieferte die Loader-Absorption (E-95) und blieb bei Test-Welle und Modell-Features stecken; die Empfehlung des Implementierungsplans lautet seither, seriell und human-guided umzusetzen.
> - Agenten-Selbstberichte gelten erst nach Gegenprüfung am realen Dateistand. Ein Verify-Agent meldete für denselben Lauf einen Totalverlust der Daten, den die direkte Prüfung der Sheet-Provenance widerlegte; seine Annahme, der Record-Identifier trage kein Folio, war falsch.
>
> #### Positive Ueberraschungen aus Datenanalyse
>
> - Erschliessungstiefe bei den feinerschlossenen Konvoluten (NIM_003/004/005/006/007) uebertrifft Erwartungen
> - Gender-inklusives Rollen-Vokabular mit substanziellem `:in`-Anteil
> - Hoher Personen-Kategorien-Abdeckungsgrad — Matrix bekommt direkt Daten
> - Werk-Verknuepfungen ermoeglichen substantiellen Rollen-Kosmos
