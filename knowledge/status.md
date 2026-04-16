# Status

> Steckbrief, aktueller Datenstand, erreichte Meilensteine und nächste Schritte. Stand: 2026-04-16 (Session 28, v2-Pipeline live + Phase 4.1–4.8 umgesetzt).

## Steckbrief

- **Titel**: Mapping Mobile Musicians (M³GIM). Mobilität und Musiktheaterwissen im Graz der Nachkriegszeit am Beispiel der Sängerin Ira Malaniuk
- **Gegenstand**: Digitale Erschließung des Teilnachlasses Ira Malaniuk (UAKUG/NIM), siehe [ira-malaniuk.md](ira-malaniuk.md)
- **Projekttyp**: Machbarkeitsstudie / Pilotstudie für FWF-Folgeprojekt
- **Institutioneller Kontext**: Universitätsarchiv der KUG Graz
- **Projektleitung**: Nicole K. Strohmann (Historische Musikwissenschaft und Genderforschung, KUG)
- **Kooperationspartner**: Wolfgang Madl (Archiv KUG), Christopher Pollin (DH Craft OG)
- **Beratend**: Georg Vogeler (Zentrum für Informationsmodellierung, Universität Graz)
- **Räumlicher Fokus**: Oper Graz 1945–1969
- **Technischer Kern**: Python-Datenpipeline + statisches Frontend auf GitHub Pages
- **Live-Umgebung**: https://dhcraft.org/m3gim

Siehe [forschungsrahmen.md](forschungsrahmen.md) für Theorie, Forschungsfragen und Kontext.

## Datenstand

### v1 (`data/google-spreadsheet/`, Baseline 2026-02-25)

- 282 Objekte (255 Konvolute, 26 Plakate, 1 Tonträger)
- 1.246 effektive Verknüpfungen
- 4 Indizes: Personen 296, Organisationen 59, Orte 31, Werke 96
- 62 von 282 Objekten (22%) aktiv verknüpft

### v2 (`data/source-v2/`, aktuell)

- 381 Objekte (354 Hauptbestand, 26 Plakate, 1 Tonträger)
- 1.464 Verknüpfungen
- 4 Indizes: Personen 328, Organisationen 75, Orte 32, Werke 137
- 70 Objekte mit aktiven Verknüpfungen
- 43 `m3gim:SpatiotemporalEvent`-Instanzen (aus 60 Komposit-Rows, Verluste durch Artefakte und verwaiste Signaturen)
- 21 Finanz-Zeilen (abendgage, provision, erwähnt)
- 295 von 381 Objekten (77%) mit Titel + Dokumenttyp, 256 (67%) mit Datum

### Getestet

- v1: 156 Tests grün, 1 xfail (PL_07 Duplikat)
- v2: 155 Tests grün, 1 skipped (verwaiste NIM_11-Signatur), 1 xfail
- Siehe [tests.md](tests.md).

## Erreichte Meilensteine

### v2-Parallelstruktur + Modell-Erweiterungen (Session 28, 2026-04-16)

Testgetriebene Umsetzung aller in [datenmodell.md](datenmodell.md) spezifizierten Modell-Erweiterungen für die neuen Daten:

| Phase | Umsetzung |
|---|---|
| 4.1 | Gender-neutrale Rollennormalisierung (`normalize_role`) |
| 4.2 | SKOS-Hierarchie für Dokumenttypen, `build_dft_concepts()` |
| 4.3 | `agrelon:hasProvenance` + `hasConfidenceValue` ersetzt `m3gim:dateEvidence` |
| 4.4 | `m3gim:SpatiotemporalEvent` als Top-Level-Graph-Entitäten |
| 4.6 | Finanzschicht mit `monetaryAmount`/`currency`/`detailRole` |
| 4.7 | Typisierte Datumsproperty-Familie (`absendedatum`, `auffuehrungsdatum` etc.) |
| 4.8 | AgRelOn-Relationen (HasEmployeeEmployer, HasCorrespondent, HasProfessionalContact, HasIsPatron, HasIsMember) |

Zusätzlich: 12 neue Test-Module (test_11–19), 156 Tests grün, TDD-Workflow mit strict-xfail-Spec als Leitlinie.

Siehe [entscheidungen.md E-62 bis E-69](entscheidungen.md) für die Architekturentscheidungen und [pipeline.md](pipeline.md) für die Umsetzung.

### Ältere Meilensteine (kompakt)

- **Session 17–19**: Ereignis- und Detail-Typ, `reconcile.py` mit Fuzzy-Matching, `validate.py` Mojibake gefixt
- **Session 20–21**: Matrix + Kosmos aktiviert, Cross-Visualization Linking, Wissenskorb CSV/BibTeX, FF-Badges auf allen Visualisierungen
- **Session 22**: Excel-Quelldateien git-getrackt
- **Session 23**: Zeitfluss-View neu, Shared Component System (`viz-components.js`), 4×6 Cross-View-Navigation
- **Session 24**: Partitur-Singleton, Tooltip-Controller, Zoom+Reset-Helper als Shared-Infrastruktur
- **Session 25**: `extract_auftritte()` (3-Pass, 60 Events), Mobilitäts-Redesign (Layer, Event-Marker), 2 Prototyp-Seiten (Lebensstationen, Lebenspartitur)
- **Session 26**: DEV/Prod-Log-Toggle, Error Boundaries pro Tab, Event-Bus, ARIA/Accessibility, Responsive Breakpoints
- **Session 27**: Wikidata-Enrichment-Pipeline, Lebenspartitur als SPA-Tab, Fuzzy-Matching in reconcile.py

Detaillierte Entscheidungen: [entscheidungen.md](entscheidungen.md) (E-01 bis E-69).

## Nächste Schritte

### Sofort (Datenqualität)

- **Verwaiste Signatur `UAKUG/NIM_11`** klären — entweder Umbenennung oder Nachtrag in Objekte.xlsx (blockiert die einzige arbeitgeber-Zeile)
- **PL_07 Duplikat** im Google Sheet bereinigen, dann xfail in `test_05_referential.py` entfernen
- **Reconciliation + Enrichment** für v2 laufen lassen (reconcile.py + enrich-wikidata.py mit v2-Indizes), damit WD-Coverage von 0,9 % (Personen) auf v1-Niveau (60 %+) steigt

### v2-Migration (abgeleitet aus ehemaligem IMPLEMENTATION-PLAN.md)

**Phase 4.5 — `m3gim:StageRole` als eigenständige Entität**
- Erfordert neues Rollenindex-XLSX (Spalten `m3gim_id`, `name`, `belongsToWork`, `voiceType`, `wikidata_id`)
- Muss mit Erschließungsteam abgestimmt werden (221 Bühnenrollen-Zeilen im Datenbestand)
- Pipeline: Typ `rolle` wird zu StageRole-Entity statt String-Literal

**Phase 4.9 — Reifikation / Meta-Statement-Klasse** *(optional, spät)*
- `m3gim:Statement` als Leichtgewicht-Variante von RDF-Reifikation
- Nur wo Provenance nicht aus Record-URI folgt

**Phase 5 — Testsuite weiter ausbauen** *(größtenteils erledigt in Session 28)*
- Weitere Mobilitätssicht-Tests ausbauen (biografische + diskursive Sichten)
- Determinismus-Test auf v2 prüfen

**Phase 6 — Frontend auf v2 umstellen**
- `loader.js` erweitern: `m3gim:hasSpatiotemporalEvent`, `m3gim:agentRelation`, `m3gim:hasDetail`, typisierte Datumsproperties indexieren (neue Store-Felder `mobilityEvents`, `agentRelations`, `finances`, `dftHierarchy`)
- Feature-Flag `DATA_VERSION = 'v2'` in `constants.js`
- Mobilitäts-Tab und Lebenspartitur nutzen SpatiotemporalEvent-Instanzen direkt (statt aus `partitur.json`)
- Neuer Indizes-Grid für Bühnenrollen (Phase 4.5 vorausgesetzt)
- Optional: Finanz-Visualisierung (Honorare, Währungsverläufe)

**Phase 7 — Betriebsmodell**
- Update-Workflow dokumentiert: `cp neue XLSX → data/source-v2/` → `python scripts/transform.py` (mit ENV) → `pytest` → Snapshot-Diff → Merge
- Rollenvokabular-Pflege: neue unbekannte Rolle → Warnung im Pipeline-Log, Review ob in [datenmodell.md § 5](datenmodell.md) ergänzen
- Baselines halb-automatisch aktualisieren, wenn Tests durchlaufen
- Zenodo-Archivierung vorbereiten

### Forschung / Datenqualität (laufend)

- Verknüpfungsrate auf über 50 % erhöhen (aktuell 22 % in v1, 18 % in v2 bezogen auf alle Objekte)
- Bearbeitungsstand pflegen (fehlt bei ~75 %)
- Header-Shifts in drei Indizes im Google Sheet korrigieren (Pipeline kompensiert aktuell über `HEADER_SHIFTS`-Mapping)
- Datierungen nicht als Freitext (`"Wien, ab 1956"`), sondern als strukturiertes Feld

### Offen / deferred

- Matrix: Zeitfilter, Zoom, Sortier-Ausbau
- Leaflet-Karte (deferred, E-04)
- Erweiterte Ort-Hierarchien (deferred)
- EAD-Export (im Antrag erwähnt)
- Digitalisate-Strategie (Platzhalter-URLs)

## Strategischer Kontext

Machbarkeitsstudie für FWF-Antrag. Die Pilotstudie liefert methodische Validierung (RiC-O 1.1 + m3gim + AgRelOn praktikabel), technische Infrastruktur (Pipeline + Frontend + Tests) und erste empirische Ergebnisse. Geplante Folgefinanzierung: Mobilität und Wissensproduktion von Sängerinnen an europäischen Kulturmetropolen im 19. und 20. Jahrhundert.
