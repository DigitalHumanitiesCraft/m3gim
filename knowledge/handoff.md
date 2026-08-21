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
updated: 2026-08-21
language: de
version: 0.4
authors: [Christopher Pollin]
generated-with: Claude Code
related: [INDEX, journal, specification]
---

# Handoff

Diese Process Inbox führt ausschließlich offene Übergabepunkte. Prüfe vor der Nutzung die Quelle und das aktuelle Ziel. Integriere dauerhaften Inhalt in das zuständige Dokument, dokumentiere Gegenstand, Quelle, Ziel und Ergebnis oder Verwerfungsgrund knapp in [journal.md](journal.md) und entferne den bearbeiteten Punkt anschließend vollständig.

## Offene Handoff-Punkte

### Vier fachliche Entscheidungen zu Vokabular und Anreicherung liegen entscheidungsreif vor

- Received: 2026-08-21
- Source: [data/reports/vocabulary-decisions-2026-08-21.md](../data/reports/vocabulary-decisions-2026-08-21.md), Entscheidungsvorlage mit Datenbeispielen, Standardrecherche, Optionen und Ansatzpunkten im Code
- Target: `scripts/transform.py`, `scripts/enrich-wikidata.py`, `vocab/m3gim.ttl`, `knowledge/data.md`, `knowledge/data-errors.md`
- Context: Die vier offenen Punkte aus der Vokabular-Formalisierung sind aufbereitet, die selbstbezüglichen Korrespondenzbeziehungen, der fehlende Mapping-Eintrag für `fotografie`, die Label-Dublette zwischen `programm` und `programmheft` und die ungültige ISO-Form der angereicherten Zeitwerte. Die Vorlage trifft keine Entscheidung und ändert keinen Code; sie führt je Frage zwei bis drei Optionen mit Auswirkung, Aufwand, Rückholbarkeit und Ansatzpunkt sowie eine begründete Empfehlung.
- Next action: Operator entscheidet je Frage eine Option; danach Umsetzung entlang der benannten Ansatzpunkte, Nachzug in [data-errors.md](data-errors.md) für QF-18, QF-19 und AF-04 sowie ein Eintrag im Entscheidungslog.
- Blocker: Keiner. Die vier Fragen sind voneinander unabhängig und einzeln entscheidbar.

### Referenznachzug der umbenannten Wissensdokumente in Code und Reports

- Received: 2026-08-21
- Source: Refactoring-Runde der Wissensbasis gegen den Naming Contract der Promptotyping-Konvention, dokumentiert in [journal.md](journal.md) § Session 61
- Target: `docs/js/views/statistics.js`, `docs/js/views/statistics-data.js`, `scripts/_common.py`, `vocab/m3gim.ttl`, `vocab/check-coverage.py`, `tests/frontend/smoke.py`, `tests/test_04_verknuepfungen.py`, `tests/test_26_term_conformance.py`, `tests/test_30_quality_and_dated_events.py`, `tests/test_31_dft_vocab.py`, `tests/test_32_mobility_events.py`, `tests/fixtures/rico_agrelon_allowlist.json`
- Context: Sieben Dokumente der Wissensbasis sind umbenannt worden, `datenfehler.md` zu `data-errors.md`, `decisions.md` zu `architecture-decisions.md`, `pipeline.md` zu `pipeline-architecture.md`, `architecture.md` zu `frontend-architecture.md`, `research.md` zu `research-framework.md`, `domain.md` zu `domain-ontology.md` und `vocab-derivation-findings.md` zu `vocabulary-derivation-findings.md`. Verweise in `knowledge/`, `CLAUDE.md` und `README.md` sind nachgezogen. Die genannten Dateien liegen außerhalb der Schreibgrenze dieser Runde und tragen die alten Namen weiter, durchgängig in Kommentaren, Docstrings und Skip-Begründungen, nirgends in ausgeführtem Code.
- Next action: Kommentar- und Docstring-Verweise auf die neuen Dateinamen setzen, wenn die jeweilige Datei ohnehin angefasst wird.
- Blocker: Die datierten Momentaufnahmen unter `data/reports/` bleiben davon ausgenommen, sie frieren ihren Prüfstand samt der damals gültigen Dokumentnamen ein.
