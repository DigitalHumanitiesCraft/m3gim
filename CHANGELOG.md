# Changelog

Each version states its number, date and review status. The status follows three values: `built` means agents built the state and the project's executable checks pass, `reviewed` means an independent agent with fresh context found no material finding and the knowledge documents agree with code and data, and `validated` means a named person accepted the state for a named purpose. A status applies to exactly the version it stands beside.

## Unreleased

Status: built, on the branch `ui-variant` (pushed to origin for safekeeping). Not merged, not published.

- The tab list keeps its width on phones, so views can be switched below 700 pixels again (`tests/frontend/test_phone_navigation.py`, which fails on the published state).
- Interface text uses no middle dot as separator. Counts stand as label and number, enumerations are joined by commas, page titles name the page and the project (`tests/test_72_interface_separators.py`).
- Dashboard panels and the network carry their coverage as a compact count with the explanation in its tooltip. The network count opens the same cut in Bestand. The pressed preset button alone marks an active view pair.
- Bestand and Indizes show a provenance key for plain source values, supplemented values and Wikidata matches. The register Wikidata mark takes the match colour used everywhere else.
- The empty basket says in one sentence how documents get into it.
- Unused frontend exports and the tests that only exercised them were removed.
- Proposed number 0.10.0. The research coordination confirmed the three-place number on 2026-11-15; the tag stays with the user.
- Semicolons and dashes no longer join statements in interface strings, and executable checks now cover explanatory sentences above figures, empty views, the coverage counts' path to their data and the connectors (`tests/frontend/test_interface_rules.py`, `tests/test_72_interface_separators.py`). They fail on the published state.
- Below 700 pixels an arrow at the right edge of the band shows that further views follow and scrolls to them.
- `docs/js/views/karte-data.js` and `scripts/assemble-verknuepfungen.py` were removed after every importer moved to `docs/js/data/place-evidence.js`.
- A separate branch `ui-variant-sidebar` starts the filter column folded at every width. It lowers the visible text elements of the first screen, yet no research view meets the density limits of the `work` profile yet.

Checked: Node unit suite, Python invariants and browser suite as recorded in [knowledge/plan.md](knowledge/plan.md). Unchecked: scholarly validation of any view.

## Knowledge curation, 2026-11-15

No version. The knowledge base was curated against code, data and the current Promptotyping convention, see [knowledge/journal.md](knowledge/journal.md). The published application is unchanged.

## 0.9-rc.1, 2026-09-09

Status: reviewed for the tagged commit. Three independent agents and the root agent audited the published revision, their findings were corrected (E-303, E-304) and checked again. The project lead accepted the designation as partner-review prerelease (E-305). Scholarly validation of the research tasks T1 to T10 is open.

A one-commit repair of the phone tab list waits on the branch `hotfix-phone-tabs` for the user's decision to publish it.

The site served from `main` since 2026-10-02 also carries the untagged commit `3f75a46`, which keeps the preview badge visible at every width. That commit is built only, and on phones it collapses the tab list, which the unreleased change above repairs.

Tag `v0.9-rc.1` and the [GitHub prerelease](https://github.com/DigitalHumanitiesCraft/m3gim/releases/tag/v0.9-rc.1) hold the release notes, verification scope and open source findings.
