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
updated: 2026-09-01
language: de
version: 0.5
authors: [Christopher Pollin]
generated-with: Claude Code
related: [INDEX, journal, specification]
---

# Handoff

Diese Process Inbox führt ausschließlich offene Übergabepunkte. Prüfe vor der Nutzung die Quelle und das aktuelle Ziel. Integriere dauerhaften Inhalt in das zuständige Dokument, dokumentiere Gegenstand, Quelle, Ziel und Ergebnis oder Verwerfungsgrund knapp in [journal.md](journal.md) und entferne den bearbeiteten Punkt anschließend vollständig.

## Offene Handoff-Punkte

### An die Frontend-Lane: Sidebar-Vereinheitlichung der übrigen Views (2026-09-01)

Der Bestand trägt seine Bedienung vollständig in der geteilten linken Filterspalte (E-158). Chronik, Karte, Netzwerk und Statistik stehen noch aus und führen ihre Regler an ihrer bisherigen Stelle. Mit dem Umzug fällt dort auch der verbliebene Erklärtext, die Chronik-Caption und das Schärfe-Banner, in Struktur und Tooltip (E-156). Vertrag sind die User Stories in [specification.md](specification.md) § Epic Bestand und der Eintrag in § Interface-Ausbau.

### An die Backend-Lane: zwei Refactorings der Pipeline (2026-09-01)

Von der Frontend-Lane, aus dem Code-Review dieser Session, von der Projektleitung zur Weitergabe freigegeben.

1. **Konvolut-Merkmal statt String-Heuristik.** Das Frontend entscheidet mit `isStandaloneKonvolut` über String-Muster (`/PL_`, `_TT_` in der Signatur), ob ein Top-Level-Record eine unaufgelöste Sammeleinheit ist. Sauberer wäre ein von der Pipeline gesetztes Merkmal am Record. Spec-first: zuerst in data.md verankern, dann Vokabular, Test, `scripts/transform.py`; das Frontend zieht nach, sobald das Merkmal im JSON-LD liegt.
2. **ENV-Overrides vereinheitlichen.** `explore.py`, `validate.py`, `transform.py` und `build-views.py` respektieren die M3GIM-ENV-Pfade, `audit-data.py` und `report-quality.py` lesen Festpfade. Daran hängt die in architecture.md § ENV-Overrides dokumentierte Falle des stillen Verlusts der Normdatenanreicherung. Entweder alle sechs Skripte vereinheitlichen oder die Overrides bewusst entfernen und die Doku nachziehen.
