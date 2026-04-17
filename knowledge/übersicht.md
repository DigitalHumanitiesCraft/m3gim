# M³GIM Knowledge Base

> Map of Content für die Wissensbasis des Projekts. Einstiegspunkt für alle Dokumentationsthemen.

## Leseempfehlung nach Rolle

- **Erstbesuch** → [status.md](status.md) (Steckbrief + aktueller Stand) → [forschungsrahmen.md](forschungsrahmen.md) (Forschungsfragen)
- **Datenmodell verstehen/ändern** → [datenmodell.md](datenmodell.md)
- **Pipeline ausführen/debuggen** → [pipeline.md](pipeline.md)
- **Frontend anpassen** → [frontend.md](frontend.md) + [interface-konzept.md](interface-konzept.md) (Designregeln + Tab-Architektur)
- **Tests schreiben** → [tests.md](tests.md)
- **Warum wurde X entschieden** → [entscheidungen.md](entscheidungen.md)

## Dokumente

| Datei | Thema |
|---|---|
| [status.md](status.md) | Steckbrief, Datenstand, Meilensteine, nächste Schritte |
| [forschungsrahmen.md](forschungsrahmen.md) | Theorie, 5 Mobilitätstypen, FF1–FF4, Oper Graz |
| [ira-malaniuk.md](ira-malaniuk.md) | Biografie als atomare Note, Quellenbestand UAKUG/NIM |
| [datenmodell.md](datenmodell.md) | RiC-O 1.1 + m3gim + AgRelOn, Mobilitätssichten, Vokabulare, partitur.json-Schema |
| [pipeline.md](pipeline.md) | Skripte, ENV-Overrides, Pipeline-Erweiterungen, Qualitäts-Baseline |
| [tests.md](tests.md) | Testsuite-Überblick, TDD-Workflow, Anker-Record-Strategie |
| [frontend.md](frontend.md) | Laufzeitmodell, Store (inkl. v2-Maps), Ansichten, Designsystem, Lektionen aus entfernten Viz |
| [interface-konzept.md](interface-konzept.md) | Tab-Architektur + Designregeln für das Interface-Redesign (6 Tabs, Chip-Pattern, Tabelle-vor-Chart) |
| [entscheidungen.md](entscheidungen.md) | Architekturentscheidungen, offene Entscheidungen, Tech-Schulden |

## Weitere Ressourcen

- `appendices/journal-volltext.md` — Journal-Rohtext (historisch, nicht kuratiert)
- `../CLAUDE.md` — Workflow-Regeln für Claude-Code-Sessions (prozessual, nicht dokumentarisch)
- Session-Memory: `.claude/projects/.../memory/` (persistiert über Sessions)
- Obsidian-Vault `C:\Users\Chrisi\Documents\obsidian\Projects\M³GIM\` — enthält DSGVO-sensible Quellen (Antrag, Handreichung) und Forschungsnotizen, die nicht im Repo liegen

## Pflegehinweis

- **Modell-Änderungen immer zuerst in [datenmodell.md](datenmodell.md)** — die Spec ist Source of Truth, Pipeline + Tests + Frontend folgen
- Forschungsnotizen werden im Obsidian-Vault gepflegt, das Repo enthält das destillierte, DSGVO-bereinigte Extrakt
- Flache Struktur: alle Dokumente auf Top-Level, keine Unterordner (Ausnahme: `appendices/`)
- Dokumente konkret halten: keine „siehe auch ähnlich"-Passagen, besser Querlinks setzen und Inhalt atomar
