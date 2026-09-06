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

Open inputs await verification and integration here. Accepted future work lives in [plan.md](plan.md); completed changes and their grounds live in [journal.md](journal.md).

Findings the cataloguing team fixes at the source do not stand here. They are collected in [`../data/reports/source-errors-handover-2026-09-01.md`](../data/reports/source-errors-handover-2026-09-01.md), the authority findings in [`../data/reports/reconciliation-register.md`](../data/reports/reconciliation-register.md). Decisions that wait on the project lead stand in [specification.md](specification.md) § Open decisions.

## Repository work

The current implementation, observed user feedback, map draft and next executable step are maintained in [plan.md](plan.md). This inbox carries no duplicate session handoff. A missing technical check remains a plan item until verified; scholarly acceptance remains with the project lead and project partners.

## Open handovers to the outside

### To a vault session: process knowledge into the Promptotyping method document (2026-09-03)

- Received: 2026-09-03.
- Source: the method-experience block formerly in the decision register of [journal.md](journal.md), preserved below.
- Target: the Promptotyping method document in the Obsidian vault, resolved by a vault session.
- Context: this is cross-project method knowledge; integration has not been verified by the repository session.
- Next action: a vault session checks whether the content is already integrated, transfers any remaining value and then removes this point. The original German wording is preserved below.

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
