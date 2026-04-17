# Status

> Steckbrief, aktueller Datenstand, erreichte Meilensteine und nächste Schritte. Stand: 2026-04-17 (Session 30, Phase 6 abgeschlossen: loader.js indexiert alle v2-Strukturen).

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

- 164 Tests grün, 1 xfail (PL_07 Duplikat), 1 skipped (verwaiste NIM_11-Signatur)
- Alle Phase-6-Kontrakttests grün — loader.js indexiert die v2-Strukturen.
- Siehe [tests.md](tests.md).

## Erreichte Meilensteine

### Phase 7 Schritt 1 — Archiv-Inline-Detail zeigt Finanzen, Beziehungen, Ereignisse (Session 30, 2026-04-17)

Alle v2-Daten sind nun im Archiv-Inline-Detail sichtbar. [archiv-inline-detail.js](../docs/js/views/archiv-inline-detail.js) rendert drei neue Panels aus den Phase-6-Store-Maps:

- **Finanzen** (14 Records): Tabelle mit Feld · Betrag+Währung · Rolle. `NIM_007_5_1` zeigt 5 Einträge in Schilling (Ausgaben 36.000 + 18.000, Einnahmen 90.000 × 2, Summe 180.000).
- **Beziehungen** (19 Records): AgRelOn-Chips mit sprechenden Labels (`HasIsPatron` → „Patron", `HasCorrespondent` → „Korrespondenz", `HasIsMember` → „Mitglied" etc.) + optional Wikidata-Link. Klickbar → Personen-Index.
- **Ereignisse** (24 Records): SpatiotemporalEvent-Chips mit Rolle + Ort + Datum. `NIM_004_3` zeigt „erscheinungsdatum: München · 17. Dez. 1952". Klickbar → Orte-Index.

Damit sind alle 33 Record-Properties entweder im UI sichtbar oder bewusst als Metadaten ausgelassen (Provenance, Konfidenz). Verifiziert gegen XLSX-Rohdaten für 3 strategische Records: `NIM_004_3` (16 XLSX-Zeilen → alle im UI), `NIM_007_5_1` (Finanzen jetzt sichtbar), `NIM_003_1_8` (Finanzen + AgRelOn sichtbar).

### Phase 6 — loader.js indexiert v2-Strukturen (Session 30, 2026-04-17)

5 neue Store-Maps in [loader.js](../docs/js/data/loader.js) eingezogen, alle 7 Phase-6-Kontrakttests in `test_06` wurden regulär grün:

| Store-Map | Größe | Funktion |
|---|---|---|
| `store.dftHierarchy` | 18 Concepts | SKOS-Dokumenttyp-Hierarchie mit `broader` + `children`-Backrefs |
| `store.mobilityEvents` | 43 Events | Top-Level-SpatiotemporalEvents mit `place`, `date`, `role`, `recordId` |
| `store.recordToEvents` | 24 Records | Reverse-Map: Record-ID → Event-IDs aus `m3gim:hasSpatiotemporalEvent` |
| `store.agentRelations` | 19 Records | AgRelOn-Relationen mit Typ, Objektname, Q-ID, Validity, Provenance |
| `store.finances` | 14 Records | DetailAnnotations mit geparstem Betrag (Number), Währung, Feld, Rolle |

Zusätzlich: `indexByYear()` nutzt jetzt typisierte Datumsproperties (`m3gim:auffuehrungsdatum` etc.) als Fallback, wenn `rico:date` fehlt — Matrix + Zeitfluss bekommen damit mehr zeitliche Dots. 164 Tests grün. Views sind noch unverändert auf dem alten Store-Kontrakt — **Phase 7 macht die neuen Maps sichtbar**.

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

### Phase 7 — Views nutzen die neuen Store-Maps

Die Store-Maps aus Phase 6 sind befüllt, die Views zeigen sie noch nicht. Reihenfolge nach Sichtbarkeit des Gewinns:

1. **Archiv-Inline-Detail** — Finanzen, AgRelOn-Relationen, typisierte Datumsfelder, SpatiotemporalEvents als Panels. Kleinster Aufwand, größter User-sichtbarer Effekt (z.B. `NIM_007 5_1` zeigt endlich seine 5 Finanzzeilen).
2. **Indizes-Personen** — Beziehungsbadges aus `store.agentRelations` an die Personen-Kacheln. Optional: neuer fünfter Grid „Beziehungen".
3. **Archiv-Dokumenttyp-Filter** — DFT-Hierarchie (`biographisch` → `autobiografie`, `biographie`) gruppieren.
4. **Mobilitäts-Schwimmbahn** — `store.mobilityEvents` (43 STE) statt heuristische Partitur-Auftritte (39). Präzisere Event-Marker mit Dokument-Link.
5. **Lebenspartitur** — STE als präzise Orts-Zeit-Anker. Phasen bleiben statisch aus `LEBENSPHASEN`-Konstante.
6. **Optional: Finanz-Visualisierung** — neuer Tab oder in Lebenspartitur integriert.

Nach Phase 7: `partitur.json` kann ausgemustert werden, da kein Konsument mehr übrig ist. Derivate `matrix.json` / `kosmos.json` bleiben optional.

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
