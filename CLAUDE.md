# CLAUDE.md

Shared repository instructions for Claude and Codex. [AGENTS.md](AGENTS.md) routes here so the rules have one maintained source.

## Session start

Read this file, [knowledge/INDEX.md](knowledge/INDEX.md), [knowledge/handoff.md](knowledge/handoff.md), then [knowledge/plan.md](knowledge/plan.md) § Current state and next action. Read the relevant specification, design or data document before substantive changes. Inspect the real branch, working tree and recent commits; distinguish existing local work from your task.

Project identity, requirements and version definitions live in [knowledge/specification.md](knowledge/specification.md). The plan owns active work, verification and user acceptance. The handoff is an inbox for unresolved inputs, not a duplicate task list. The journal owns decision provenance. Resume from these documents rather than session memory or an assumed milestone state.

## Lanes and delegation

The project lead authorised the stabilisation work and one commit per achieved milestone. Follow-up review checks the result, relevant tests and knowledge before committing. This authorisation persists across turns; do not ask for the same commit permission again. Commits use German descriptions and a truthful Co-Authored-By trailer. This Codex-led stabilisation work uses `Co-Authored-By: Codex <noreply@openai.com>`.

Use Sol 5.6 for delegated work in this stabilisation session, as explicitly approved by the project lead. Give agents bounded tasks and disjoint write sets; root integrates and verifies their reports against actual files. Existing global model preferences are subject to this explicit override.

Communicate in compact, substantive German paragraphs. Ask only for a necessary decision or missing input. When the user is discussing a proposal, evaluate it without silently implementing it. Keep draft, implementation, technical verification and user acceptance separate. A local commit does not authorise pushing, deployment or external communication.

## Binding conventions

- Maintained knowledge lives in `knowledge/` and is English by default. The partner-facing recording guide stays German. Root README and agent instruction files are entry/action documents; dated source and curation evidence stays beside its data.
- Code comments are concise English. Interface strings and commit messages are German. Follow the applicable web-style and python-style skills.
- The frontend is a static no-build ES-module application. Use existing modules, design tokens and local assets; preserve keyboard access and reduced-motion behaviour.
- The shared sidebar owns filters. Other presentation and interaction contracts are maintained in [knowledge/design.md](knowledge/design.md). Draft alternatives in the plan do not overwrite the current design.
- Preserve archival signatures, RDF identifiers, source evidence and uncertainty. A document co-mention does not establish an appearance, presence at a place or a journey.
- Preserve the distinction between a document date, a dated statement, limited precision and a qualified boundary. A recorded range alone cannot establish continuous activity or a biographical phase. Editorial context follows the separate provenance contract in [knowledge/architecture.md](knowledge/architecture.md) § Frontend.
- Update the responsible knowledge document after a coherent change and add a concise journal entry. Use Git for superseded wording; do not create routine session reports or another archive.

## Frontend refactoring

Read the current view contract in [knowledge/design.md](knowledge/design.md) before changing geometry or interaction. When the user revises that contract, update its responsible section after implementation. Mark superseded decisions in the journal; retain earlier test results as historical checkpoints without presenting them as current acceptance.

Separate source projection, temporal geometry and group aggregation from DOM rendering where those responsibilities already have dedicated modules. Reuse shared UI components for common behaviour, with view-specific evidence and selection state supplied by each caller. Avoid copying the detail shell or adding a second filter path to implement a new view interaction.

When a shared component changes, verify every existing consumer with real dense content, open and closed selection, and narrow and wide hosts. Check vertical and horizontal bounds, internal scrolling and keyboard return in addition to screenshots. [knowledge/testing.md](knowledge/testing.md) § Frontend checks owns the detailed criteria. A passing test count does not establish visual or scholarly acceptance.

## Spec hierarchy

For source or model changes, read [knowledge/data.md](knowledge/data.md) first. Anchor the change there, then update the formal vocabulary in [vocab/m3gim.ttl](vocab/m3gim.ttl), meaningful tests, pipeline and frontend in that order. [knowledge/data-model.md](knowledge/data-model.md) describes the formal model; [knowledge/architecture.md](knowledge/architecture.md) describes the implementation. Do not introduce plausible but unattested vocabulary terms.

## Core commands

[README.md](README.md) § Running it locally owns setup, the eight pipeline commands and test commands. [knowledge/architecture.md](knowledge/architecture.md) owns pipeline dependencies, output paths and environment overrides; [knowledge/testing.md](knowledge/testing.md) owns test scope and acceptance limits.

To inspect the shipped frontend, run `python -m http.server 8000 --bind 127.0.0.1 --directory docs`. No data regeneration is needed. Use `python -m pytest` when the pytest executable is not on PATH. Run checks appropriate to the changed behaviour; a knowledge-only change does not require a full pipeline run.

The invariant suite must pass. Source-data checks report the named source defects and have separate acceptance implications. Browser tests start their own server. Playwright is required for browser and candidate verification; an optional local skip is not browser evidence. Verify actual downloads for export changes and real rendering for visual changes.

## Data and safety boundaries

- Never hand-edit `docs/data/m3gim.jsonld`; it is generated from `data/output/` through `build-views.py`. The world geometry in `docs/data/geo/` is separately shipped.
- Source formats, identifier exceptions and pipeline compensations belong to [knowledge/data.md](knowledge/data.md). Do not rewrite recording values to conceal data errors.
- Transformation requires the reconciliation and enrichment files in its output directory. A deliberate run without them uses `M3GIM_ALLOW_NO_WIKIDATA=1`; ordinary isolated runs must retain the authority inputs.
- Run `python scripts/verify-manual-approvals.py` after every batch of manual Wikidata approvals. Its offline exception is `SKIP_VERIFY_MANUAL=1`.
- Personal research source documents `antrag.md` and `handreichung.md` belong in the Obsidian vault, never in this repository. From a repository session the vault remains read-only.
- Do not discard unrelated work, apply an old stash automatically, bypass hooks or perform destructive Git operations without the user's explicit request.

## Session close

Verify Git state, secure authorised work and write the actual result, open decisions and next executable step into the existing canonical documents. Leave no duplicate session-handoff file when the plan and commits are sufficient. Report the commit, verification scope and remaining user acceptance compactly. Preserve existing external handovers until their target has actually integrated them.
