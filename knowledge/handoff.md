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
updated: 2026-08-22
language: de
version: 0.4
authors: [Christopher Pollin]
generated-with: Claude Code
related: [INDEX, journal, specification]
---

# Handoff

Diese Process Inbox führt ausschließlich offene Übergabepunkte. Prüfe vor der Nutzung die Quelle und das aktuelle Ziel. Integriere dauerhaften Inhalt in das zuständige Dokument, dokumentiere Gegenstand, Quelle, Ziel und Ergebnis oder Verwerfungsgrund knapp in [journal.md](journal.md) und entferne den bearbeiteten Punkt anschließend vollständig.

## Offene Handoff-Punkte

### Referenznachzug der umbenannten Wissensdokumente in Code und Reports

- Received: 2026-08-21
- Source: Refactoring-Runde der Wissensbasis gegen den Naming Contract der Promptotyping-Konvention, dokumentiert in [journal.md](journal.md) § Session 61
- Target: `docs/js/views/statistics.js`, `docs/js/views/statistics-data.js`, `scripts/_common.py`, `vocab/m3gim.ttl`, `vocab/check-coverage.py`, `tests/frontend/smoke.py`, `tests/test_04_verknuepfungen.py`, `tests/test_26_term_conformance.py`, `tests/test_30_quality_and_dated_events.py`, `tests/test_31_dft_vocab.py`, `tests/test_32_mobility_events.py`, `tests/fixtures/rico_agrelon_allowlist.json`
- Context: Sieben Dokumente der Wissensbasis sind umbenannt worden, `datenfehler.md` zu `data-errors.md`, `decisions.md` zu `architecture-decisions.md`, `pipeline.md` zu `pipeline-architecture.md`, `architecture.md` zu `frontend-architecture.md`, `research.md` zu `research-framework.md`, `domain.md` zu `domain-ontology.md` und `vocab-derivation-findings.md` zu `vocabulary-derivation-findings.md`. Verweise in `knowledge/`, `CLAUDE.md` und `README.md` sind nachgezogen. Die genannten Dateien liegen außerhalb der Schreibgrenze dieser Runde und tragen die alten Namen weiter, durchgängig in Kommentaren, Docstrings und Skip-Begründungen, nirgends in ausgeführtem Code.
- Next action: Kommentar- und Docstring-Verweise auf die neuen Dateinamen setzen, wenn die jeweilige Datei ohnehin angefasst wird.
- Blocker: Die datierten Momentaufnahmen unter `data/reports/` bleiben davon ausgenommen, sie frieren ihren Prüfstand samt der damals gültigen Dokumentnamen ein.

### Zwei Zählwege für datierte Ereignisse liefern verschiedene Ergebnisse

- Received: 2026-08-22
- Source: Frontend-Sichtprüfung am laufenden Interface vom 2026-06-21, festgehalten in [journal.md](journal.md); die beiden Zählwege im heutigen Code nachgesucht und am aktuellen Datensatz belegt
- Target: `docs/js/main.js` (`logTabActivation`, Profil `karte`), `docs/js/views/statistics-data.js` (`aggregateDecadesBySicht`); als Bezugspunkt `extractYear` in `docs/js/utils/date-parser.js`
- Context: Beide Wege zählen über dieselbe Menge `store.mobilityEvents` ab, wie viele Ereignisse datiert sind, und legen dabei verschiedene Kriterien an. `main.js` prüft mit `/\d{4}/.test(String(e.date || ''))` auf vier zusammenhängende Ziffern an beliebiger Stelle. `aggregateDecadesBySicht` verlangt eine Zeichenkette ab vier Zeichen Länge und einen aus `date.slice(0, 4)` parsbaren Jahreswert, also die Ziffern am Anfang. Auseinander laufen die beiden bei den qualifizierten Datierungen, die [data.md](data.md) § 6 als `circa:`, `vor:` und `nach:` zulässt, weil das Präfix vor der Jahreszahl steht. Belegt am aktuellen `data/output/m3gim.jsonld` (mit `docs/data/m3gim.jsonld` identisch) an den beiden SpatiotemporalEvents zur Wiener Spielzeit an den Records `NIM_004_24` und `NIM_004_29`, deren `m3gim-ontology:atDate` den Wert `nach:1956` trägt; sie gelten dem Regex-Weg als datiert und dem Präfix-Weg als undatiert, in der Gegenrichtung gibt es am heutigen Stand keinen abweichenden Fall. Sichtbar wird die Abweichung in der Statistik-Caption „… von … Ereignissen mit Jahresangabe", während der `karte`-Stempel `datiert` nur im DEV-Modus geschrieben wird.
- Next action: Zuerst eine Invariante als Test einspielen, die beide Zählwege am selben Datensatz gegeneinander stellt und bei Abweichung failt, erst danach die Wege auf eine Quelle ziehen. `extractYear` aus `docs/js/utils/date-parser.js` ist der vorhandene Kandidat, es sucht die erste Vierziffernfolge, behandelt Zeitspannen über den `/`-Split und dient in `statistics-data.js` bereits als Jahres-Primitive der Records.
