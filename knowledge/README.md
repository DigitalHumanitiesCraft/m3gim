# M³GIM Knowledge Base

> 8 destillierte Wissensdokumente als flacher Vault. Stand: Session 28 (2026-04-16), v2-Pipeline live.

## Dokumente

| Datei | Inhalt |
|-------|--------|
| [forschung.md](forschung.md) | Theoretischer Rahmen, 5 Mobilitaetstypen, FF1–FF4, Ira Malaniuk, Forschungskontext Graz |
| [data.md](data.md) | Datenmodell v2: Schichtenmodell, Tabellenmodell, RiC-O + m3gim + AgRelOn, Mobilitaetssichten, kontrollierte Vokabulare, partitur.json-Schema |
| [pipeline.md](pipeline.md) | Skriptverantwortung, Datenfluss, ENV-Overrides (v1/v2-Parallel), Pipeline-Erweiterungen (SpatiotemporalEvent, AgRelOn, Finanz, typisierte Daten), Qualitaets-Baseline |
| [testing.md](testing.md) | Test-Suite (19 Module, 156 Tests), JSON-Schemas, Roundtrip, Coverage-Tests, TDD-Workflow, Snapshot-Diff |
| [frontend.md](frontend.md) | Laufzeitmodell, Verzeichnisstruktur, Store, Routing, Prototyp-Seiten, Schnittstellenvertrag |
| [visualisierungen.md](visualisierungen.md) | 7 Ansichten (4 D3-Visualisierungen + 2 Prototyp-Seiten + Lebenspartitur-Tab), Layer-Architektur, Interaktion, Designsystem |
| [entscheidungen.md](entscheidungen.md) | E-01 bis E-69, Technische Schulden, Verschobene Features, Prozesswissen |
| [projekt-status.md](projekt-status.md) | Steckbrief, Umsetzungsstand, Session-Verlauf, Gap-Analyse, Naechste Schritte |

## Weitere Ressourcen

- `appendices/` — [Journal Volltext](appendices/journal-volltext.md)
- Session-Memory: `.claude/projects/.../memory/` (persistiert ueber Sessions)
- Root: `../CLAUDE.md` — Workflow-Regeln fuer Claude-Code-Sessions (nicht dokumentarisch, prozessual)
- Root: `../IMPLEMENTATION-PLAN.md` — v2-Migration-Plan (7 Phasen, Phase 4.1/4.2/4.3/4.4/4.6/4.7/4.8 umgesetzt)

## Pflegehinweis

- Forschungsdokumente werden synchron im Obsidian-Vault (`Projects/M³GIM/`) gepflegt
- Quellen (Antrag, Handreichung) leben nur im Vault (DSGVO, `.gitignore`)
- Flache Struktur: alle 8 Docs auf Top-Level, keine Unterordner
- Modelländerungen zuerst in `data.md`, dann Pipeline + Tests + Frontend
