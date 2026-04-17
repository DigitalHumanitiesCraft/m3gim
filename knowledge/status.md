# Status

> Steckbrief, aktueller Datenstand, erreichte Meilensteine und nächste Schritte. Stand: 2026-04-17 (Session 29, v2-Konsolidierung: v1 archiviert, v2 ist neuer Default).

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

## Datenstand (aktuell, `data/google-spreadsheet/`)

- 381 Objekte (354 Hauptbestand, 26 Plakate, 1 Tonträger)
- 1.494 XLSX-Verknüpfungen → 1.220 effektive Record-Properties
- 4 Indizes: Personen 324, Organisationen 69, Orte 41, Werke 97
- 70 Objekte mit aktiven Verknüpfungen
- 43 `m3gim:SpatiotemporalEvent`-Instanzen
- 21 Finanz-Zeilen (abendgage, provision, erwähnt) — **alle mit Währung** seit `FINANCE_CURRENCY_DEFAULTS`-Fix
- 18 SKOS-Concepts in DFT-Hierarchie
- 295 von 381 Objekten (77%) mit Titel + Dokumenttyp, 256 (67%) mit Datum

Frühere v1-Stände liegen in `data/_archive/` (Snapshot 2026-02-25: 282 Objekte, 1246 Verknüpfungen) — Referenz, nicht operativ.

### Getestet

- 157 Tests grün, 1 xfail (PL_07 Duplikat), 1 skipped (verwaiste NIM_11-Signatur)
- 7 Tests in `test_06` als XPASS(strict) → signalisieren, dass loader.js die v2-Strukturen indexieren soll (Phase 6)
- Siehe [tests.md](tests.md).

## Erreichte Meilensteine

### v2-Konsolidierung + Currency-Fix + Frontend-Kontrakt-Spec (Session 29, 2026-04-17)

- **Daten:** `data/` aufgeräumt — v1-Stände archiviert unter `data/_archive/`, v2 ist alleiniger Default. Ein Datenfluss, ein `data/output/`, ein `docs/data/`. Keine ENV-Overrides mehr im Normalbetrieb.
- **Pipeline:** `FINANCE_CURRENCY_DEFAULTS`-Mapping in `transform.py` (NIM_007 → `S`). Alle 21 Finanzzeilen haben jetzt Währung. `build-views.py` kopiert neu auch `m3gim.jsonld` automatisch nach `docs/data/` — der manuelle Schritt (eine Drift-Quelle) entfällt.
- **Tests:** Baselines auf v2-Niveau gehoben (records≥380, persons≥320, verknuepfungen≥1200, wd_matches≥200). 157 Tests grün. **7 gewollt rote `XPASS(strict)`-Marker in `test_06_frontend_contract.py`** formulieren präzise die Phase-6-loader.js-Arbeit (`store.dftHierarchy`, `store.mobilityEvents`, `store.agentRelations`, `store.finances`, typisierte Datumsfelder als Fallback in `indexByYear`).
- **Snapshot-Diff-Tool:** läuft ohne `PYTHONIOENCODING=utf-8` auf Windows.
- **Frontend verifiziert im Browser:** Alle sieben Tabs laden v2-Daten ohne Konsolenfehler. Archiv zeigt 381 Einheiten, Indizes 308 Personen / 69 Organisationen / 41 Orte / 97 Werke. Matrix, Kosmos, Mobilität, Zeitfluss, Lebenspartitur rendern SVGs korrekt. Sichtbarkeit der v2-Tiefe wartet auf Phase 6.

Siehe [entscheidungen.md E-70 + E-71](entscheidungen.md).

### v2-Modellerweiterungen (Session 28, 2026-04-16)

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

Zusätzlich: 12 neue Test-Module (test_11–19), TDD-Workflow mit strict-xfail-Spec als Leitlinie.

Siehe [entscheidungen.md E-63 bis E-69](entscheidungen.md) für die Architekturentscheidungen und [pipeline.md](pipeline.md) für die Umsetzung.

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

### Phase 6 — loader.js um v2-Store-Maps erweitern (aktuell in Arbeit)

Das Frontend bedient sich nun aus dem v2-JSON-LD (`docs/data/m3gim.jsonld`, 381 Records), der Loader indexiert die v2-spezifischen Strukturen aber noch nicht. Die 7 XPASS-Tests in `test_06` dokumentieren präzise den Auftrag. Reihenfolge:

1. **SKOS-Concept-Hierarchie** → `store.dftHierarchy` (18 Concepts mit broader-Links)
2. **SpatiotemporalEvents** → `store.mobilityEvents` + `store.recordToEvents` (43 Events, ISO/Range-fähig)
3. **AgRelOn-Relationen** → `store.agentRelations` (19 Einträge mit @type + hasObject)
4. **Finanzen** → `store.finances` (21 DetailAnnotations, monetaryAmount + currency)
5. **Typisierte Datumsproperties** → Fallback in `indexByYear()` für Records ohne `rico:date`

Nach jedem Schritt die entsprechenden xfail-Marker aus `test_06` entfernen, Suite grün halten.

### Phase 7 — Views auf Store-Aggregation umstellen

Alle D3-Views lesen heute `partitur.json`. Nach Phase 6 können sie direkt aus dem Store aggregieren — `partitur.json` und die anderen Derivate werden zu optionalen, für einzelne Visualisierungen gedachten Zusatzartefakten. Reihenfolge: Mobilität zuerst (sichtbarster Gewinn), dann Matrix/Zeitfluss, dann Indizes (neuer Beziehungen-Grid), zuletzt Lebenspartitur.

### Offene Datenqualität (extern blockiert)

- **Verwaiste Signatur `UAKUG/NIM_11`** — klären mit Erschließungsteam (blockiert die einzige arbeitgeber-Zeile, 1 Skip in `test_12`)
- **PL_07 Duplikat** im Google Sheet bereinigen → xfail in `test_05_referential.py` entfernen
- **Reconciliation + Enrichment** auf aktualisierten v2-Indizes neu laufen lassen, damit WD-Coverage hochgeht

### Deferred Modell-Erweiterungen

- **Phase 4.5** `m3gim:StageRole` als eigenständige Entität (221 Bühnenrollen). Braucht neues Rollenindex-XLSX vom Erschließungsteam.
- **Phase 4.9** Reifikation / `m3gim:Statement`-Leichtgewicht — nur wo Provenance nicht aus Record-URI folgt.
- **Zenodo-Archivierung** + **EAD-Export** — Betriebsmodell, später.

### Forschung / Datenqualität (laufend)

- Verknüpfungsrate auf über 50 % erhöhen (aktuell 70 von 381 Objekten = 18 %)
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
