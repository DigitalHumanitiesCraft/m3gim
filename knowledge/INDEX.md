---
title: M³GIM Knowledge Base
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Index
  version: 0.4
  url: https://dhcraft.org/Promptotyping/promptotyping-document/index
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-index
status: active
created: 2026-02-19
updated: 2026-09-08
language: en
version: 0.7
authors: [Christopher Pollin]
generated-with: Codex
related: [specification, plan, data, data-model, recording-guide, research-framework, architecture, design, journal, journal-archive, testing, handoff]
---

# M³GIM Knowledge Base

This page is the entry point into the knowledge base of the project. It orders the documents by their Promptotyping function, names the storage zones of the repository, gives reading paths and defines the constitutive terms. The maintained documents define the project contract; statements about implemented behaviour must be checked against the current code. Dataset figures carry their own timestamp in the [quality snapshot](../data/reports/quality-snapshot.md).

## Documents

| Path | Function | Routing question | Update |
|---|---|---|---|
| [INDEX.md](INDEX.md) | Navigation | What lies here, how is it read, which terms are constitutive? | with every change to the contents of the folder |
| [specification.md](specification.md) | Charter and specification | What must the application achieve, and which decisions remain open? | with a change to identity, requirements or scope |
| [plan.md](plan.md) | Implementation plan | What is next, what did users verify, and which improvements remain proposals? | with an accepted scope clarification, integrated change or new verification result |
| [data.md](data.md) | Source material and spec-first anchor | What is the source material, how does the cataloguing team record it, and what is defective in it? | with a new data export or a changed recording |
| [data-model.md](data-model.md) | Domain knowledge | How is the material formally modelled, and where does the model stop? | with a change to [`vocab/m3gim.ttl`](../vocab/m3gim.ttl), to the model or to the recording convention |
| [recording-guide.md](recording-guide.md) | Recording convention | How does the cataloguing team enter records, links, uncertainty and provenance? | with an agreed change to partner-side recording |
| [research-framework.md](research-framework.md) | Domain knowledge | Which theory, research questions, personas and use cases carry the project? | when research questions, personas or use cases are sharpened |
| [architecture.md](architecture.md) | Architecture | How does the data pipeline run, and how is the static SPA built? | with a change to `scripts/`, `docs/js/` or the data flow |
| [design.md](design.md) | Design | How does the application look, and how does it behave? | with a change to the design stance or the design system |
| [testing.md](testing.md) | Quality assurance | What is guaranteed, and how is it checked? | with a change to the test suite or the TDD workflow |
| [handoff.md](handoff.md) | Handoff | Which checked handover points wait for integration or rejection? | when a point arrives or is processed |
| [journal.md](journal.md) | Provenance | How did the project arrive here, and why was it decided this way? | after transitions that belong together, and with every decision in the decision register |
| [journal-archive.md](journal-archive.md) | Provenance archive | Which earlier decision was superseded or lapsed? | retain existing decision references; use Git for superseded prose |

The data findings live operationally under `data/reports/`. The errors that can be fixed at the source stand in the handover list [`source-errors-handover-2026-09-01.md`](../data/reports/source-errors-handover-2026-09-01.md), the Wikidata alignment in the [`reconciliation-register.md`](../data/reports/reconciliation-register.md).

## Storage zones

- `knowledge/` holds maintained project knowledge. Root README, CLAUDE and AGENTS provide entry points and working rules.
- `data/google-spreadsheet/` holds versioned source exports; [data.md](data.md) owns their format and interpretation.
- `data/reports/` holds permanent curation evidence and finding registers, plus generated reports. The quality snapshot describes its own dataset timestamp. Other generated reports are recreated by a run.
- `data/output/` and `docs/data/` hold pipeline artefacts; [architecture.md](architecture.md) owns their production and delivery.
- `vocab/` holds the formal vocabulary and coverage checker; [data-model.md](data-model.md) explains their semantics.

## Reading paths

- Session start: [`../AGENTS.md`](../AGENTS.md) routes to the shared [`../CLAUDE.md`](../CLAUDE.md) → [INDEX.md](INDEX.md) → [handoff.md](handoff.md) → [plan.md](plan.md) § Current state and next action → the relevant specification, design or data document.
- Understanding or changing the data model: [data.md](data.md) → [data-model.md](data-model.md) → [journal.md](journal.md) § Decision register. First the source material, then its formalization. The model change is anchored in [data.md](data.md), and vocabulary, pipeline, tests and frontend follow.
- Working with the generated dataset without knowing the pipeline: [data-model.md](data-model.md) → [`data/reports/reconciliation-register.md`](../data/reports/reconciliation-register.md).
- Running or debugging the pipeline: [`../CLAUDE.md`](../CLAUDE.md) § Core commands → [architecture.md](architecture.md) § Pipeline → [testing.md](testing.md).
- Adapting the frontend: [architecture.md](architecture.md) § Frontend → [design.md](design.md).
- Stabilising the reviewed application: [specification.md](specification.md) → [plan.md](plan.md) → [research-framework.md](research-framework.md) § Evaluation. The plan distinguishes implemented behaviour, observed checks and human acceptance.
- Recording data: [recording-guide.md](recording-guide.md), which is German and addressed to the cataloguing team, then [data.md](data.md).
- Entering from the research side: [research-framework.md](research-framework.md) → [specification.md](specification.md).

## Conventions

Each document owns the routing question listed above. Current work and verification belong to [plan.md](plan.md), decisions and their reasons to [journal.md](journal.md), and source findings to the registers beside their data. Git preserves superseded prose. Decision identifiers remain addressable in the journal and its archive (E-292).

Knowledge is English by default. The partner-facing [recording-guide.md](recording-guide.md) stays German. The glossary preserves project-specific German terms. [CLAUDE.md](../CLAUDE.md) owns language, source-first modelling and session rules. The Obsidian Vault holds personal research sources and receives external knowledge only from a genuine Vault session.

## Glossary

Every knowledge document uses these English terms. The German column is the wording of the interface, the data and the archive team, and a document names the German term only where it quotes the interface or the source. Code identifiers are not listed here, the code carries its own names.

| Term | German | Definition |
|---|---|---|
| result set | Treffermenge | The records that satisfy the current faceted filtering. Every view shows the same result set. |
| faceted filtering | Facettensuche | Restricting the result set through the facets of the sidebar. Within one facet any selected value suffices, across facets all selected values must hold. |
| facet | Facette | A feature with discrete values by which the result set is restricted: person, place, work, institution, document type, role, time. |
| chip | Chip | A selected facet value, shown as a removable element. |
| basket | Korb | The records a researcher collects by hand across views, for export. |
| view | Ansicht, Tab | One page of the application: holdings, registers, chronicle, places, network, statistics, basket. |
| holdings | Bestand | The view that lists the records in their archival order of convolutes and folios. |
| register | Register, Index | The recorded names of one family, with a page per family. Name grouping alone establishes no identity. |
| family | Familie | One of the four entity kinds person, institution, place, work, each with a fixed colour and symbol. |
| entity | Entität | An entry of a register. |
| record | Objekt, Datensatz | One archival unit of the object table, identified by its signature. |
| convolute | Konvolut | An aggregating archival unit whose children are folios. |
| folio | Folio | A child of a convolute, identified by the convolute signature plus a folio number. |
| link | Verknüpfung | One row of the link table, connecting a record to an entity or an event in a role. |
| evidence, attested | Beleg, belegt | A record is the evidence for a statement when a link of that record carries it. A statement is attested when at least one link carries it. |
| data point | Datenpunkt | One recorded value, that is one cell of the recording tables with sheet and row. |
| source cell | Quellzelle, Erfassungsstelle | Sheet and row of the recording table a data point comes from. Preserved in the dataset, exports and cataloguing reports; technical labels are absent from the interface under E-285. |
| role | Rolle | The function in which something stands at a record. Three kinds are distinguished and never called role alone: place role (contract place, guest performance, dispatch), event role (performance, rehearsal, premiere), agent role (conductor, sender, patron). |
| stage part | Partie, Bühnenrolle | The part a singer performs in an opera. Never called role. |
| event | Ereignis | A dated or located statement at a record, carrying a role. In the dataset the node is called Annotation. |
| performance | Aufführung | A recorded performance role. Legacy performance access paths in the dataset carry neutral source-composite annotations and establish no historical occurrence. |
| occurrence | Auftritt | The planned bundle of place, work, stage part, date and institution that forms one appearance. Decided as target model, not yet in the dataset. |
| institution | Institution, Organisation, Haus | An entry of the institution register, including opera houses, festivals, broadcasters and ensembles. |
| perspective | Sicht, Mobilitätssicht | One of the five event categories performative, institutional, correspondence, biographical, discursive. Not a view. |
| recording | Erfassung | Entering the source material into the tables. |
| cataloguing | Erschließung | The archival work of describing the fonds, of which recording is the part this project reads. |
| coverage | Deckung | How many records of the result set carry the data a view needs, shown at the view. |
| data state | Datenstand | The dated pipeline run the application is built from. |
| creator of the fonds | Nachlassbildnerin | Ira Malaniuk as the person the fonds stems from. |
| data mirror | Datenspiegel | The test layer that asserts the cleanliness of the source and stays red while known source errors exist. |
| quality snapshot | Quality-Snapshot | The report generated by every pipeline run that holds all running figures. |
| handover list | Partner-Übergabeliste | The register of source errors handed to the cataloguing team. |
| DFT | DFT | Documentary form type, the hierarchical taxonomy of document types. |
| RiC-O, AgRelOn, SKOS | | Records in Contexts Ontology 1.1, the Agent Relationship Ontology of the German National Library, the Simple Knowledge Organization System. |
| m3gim extension | m3gim-Extension | The project ontology for works, performances, stage parts and mobility, formalized in `vocab/m3gim.ttl`. |
| Promptotyping | | The working method in which the knowledge documents are the source of truth and the code a derived artefact. |
