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
updated: 2026-09-06
language: en
version: 0.6
authors: [Christopher Pollin]
generated-with: Claude Code
related: [INDEX, journal, specification, plan]
---

# Handoff

This process inbox carries open points only. A point names its addressee, what is to be done and what closes it. Durable content moves into the document that owns it and leaves a line in [journal.md](journal.md) naming subject, source, target and outcome, after which the point is removed here in full.

Two kinds of point live here. Assignments run inside the repository and are held by a lane. Handovers leave the repository and wait on the vault or on the project lead.

Findings the cataloguing team fixes at the source do not stand here. They are collected in [`../data/reports/source-errors-handover-2026-09-01.md`](../data/reports/source-errors-handover-2026-09-01.md), the authority findings in [`../data/reports/reconciliation-register.md`](../data/reports/reconciliation-register.md). Decisions that wait on the project lead stand in [specification.md](specification.md) § Open decisions.

## Repository work

The reviewed implementation work and its evidence are maintained in [plan.md](plan.md). This inbox carries no separate repository assignment. A missing technical check remains a plan item until verified; scholarly acceptance remains with the project lead and project partners.

## Open handovers to the outside

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
