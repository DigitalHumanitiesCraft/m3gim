# Status

> Steckbrief, aktueller Datenstand, erreichte Meilensteine und nächste Schritte. Laufende Zählstände stehen im Quality-Snapshot (`data/reports/quality-snapshot.md`), nicht hier — dieses Dokument ist qualitativ.

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

Aktive Quelle: `data/google-spreadsheet/`. Drei Bestandsgruppen (Hauptbestand, Plakate, Tonträger) + vier Indizes (Personen, Organisationen, Orte, Werke) + eine Verknüpfungstabelle. Feinerschlossen sind vor allem die Konvolute um NIM_003–007 und NIM_011.

Modellerweiterungen der Pipeline sind abgeschlossen: SKOS-Dokumenttyp-Hierarchie, SpatiotemporalEvents, AgRelOn-Relationen, Finanzschicht mit `monetaryAmount`/`currency`, typisierte Datumsproperties, semantische Provenance (`agrelon:hasProvenance`/`hasConfidenceValue`) und technische XLSX-Quellreferenz (`m3gim:xlsxSource`).

**Laufende Zahlen** (Bestand, Feldabdeckung, Verknüpfungsrate, Wikidata-Coverage, Low-Confidence-Freigabeliste): im **Quality-Snapshot** `data/reports/quality-snapshot.md`, wird bei jedem Pipeline-Lauf neu generiert.

Frühere Datenstände liegen in `data/_archive/` — Referenz, nicht operativ.

### Getestet

Suite durchgängig grün bis auf die beiden dokumentierten Ausnahmen (`PL_07` xfail, `NIM_11` skip). Der Provenance-Kontrakt ist doppelt abgesichert: `test_19` prüft die semantische Ebene (`agrelon:hasProvenance` + Konfidenz), `test_20` die technische XLSX-Quellreferenz mit kuratierten Anker-Records. Siehe [tests.md](tests.md).

## Erreichte Meilensteine

### Session 33 — Mobilitäts-Atlas MVP

Zwei sequenzielle Commits haben den ersten Tab mit Karte realisiert:

- **Koordinaten-Patch (Pipeline)**: `m3gim:SpatiotemporalEvent` trägt im `m3gim:atPlace`-Subobjekt nun `@id` (`wd:Qxxx`), `owl:sameAs`, `geo:lat`, `geo:long` und – falls vorhanden – `m3gim:country`. Umgesetzt in `scripts/transform.py` als zwei minimale Eingriffe: Ortsindex-Lookup für spatiotemporal-rels in `process_verknuepfungen()` und Wiederverwendung von `_inject_enrichment()` im STE-Zweig von `add_relations_to_records()`. TDD via neuem `tests/test_22_ste_coordinates.py` (Anker: Zürich, Salzburg; Soft-Coverage ≥ 10).
- **Mobilitäts-Atlas-Tab**: neuer Tab `docs/js/views/mobilitaets-atlas.js`, Grid mit Leaflet-Karte (OSM-Tiles, kein API-Key), horizontalem D3-Zeitstrahl (Brush filtert Karte + Panel) und Chip-Detailpanel. Bi-direktionale Kopplung über lokalen Renderer-State (`selectedPlace`, `selectedRange`, `unverortetMode`). Marker-Größe skaliert mit Event-Zahl pro Ort; Signal-Grün markiert die Auswahl. Events ohne Koordinaten (Wien, München, Bayreuth – Reconciliation-Lücke) sind über Badge "N unverortet" erreichbar. Chip-Helper `buildRoleChip()` aus `archiv-inline-detail.js` exportiert und wiederverwendet. Loader-Erweiterung: `placeLat`/`placeLon`/`placeCountry` auf `mobilityEvent`. Debug-Helper `window.m3gim.mobilityEventsWithGeo()`.

Designgrundlage: [interface-konzept.md § Mobilitäts-Atlas](interface-konzept.md). Tests: 188 passed, 1 skipped, 1 xfailed.

### Session 32 — Interface-Fundament MVP (E-75)

Fünf aufeinander aufbauende Commits haben das neue Forschungsinterface-Fundament gelegt:

- **Alt-Viz entfernt**: sechs D3-Prototypen (Mobilität, Matrix, Kosmos, Zeitfluss, Lebenspartitur, Lebensstationen) + zugehöriges CSS + zwei Standalone-HTMLs + `aggregator.js` + `viz-components.js` raus. Tab-Leiste reduziert auf Archiv, Indizes, Korb (später erweitert).
- **Archiv-Inline-Detail** rendert Finanzen, AgRelOn-Beziehungen und SpatiotemporalEvents im neuen Rolle-Prefix-Chip-Pattern aus dem Dossier-Mockup: Uppercase-Mono-Prefix + Serif-Wert + Provenance-Pille (`#1276`) + optionales Wikidata-Badge. Zentraler Helper `buildRoleChip()` in `archiv-inline-detail.js`, Cluster-Farbfamilien in `archiv.css` (ort, person, rolle, beziehung, finanz, datum, neutral).
- **Indizes-Personen mit Beziehungsbadges**: Loader-Pass 2.5 resolviert AgRelOn-Relationen rückwärts auf Personen-Einträge (Matching primär Q-ID, sekundär `normalizePerson(name)`). `renderNameCell()` zeigt eine dritte Zeile `idx-relations` mit Chips im gleichen Muster. Mehrfach-Relationen werden gezählt, Klick springt zum Beleg.
- **DFT-Filter hierarchisch**: `buildDftTree(store)` + `expandDftFilter(store, shortId)` in `format.js`. Dropdown nutzt `<optgroup>`-Struktur; Oberbegriff matcht transitiv in Bestand + Chronik.
- **Erschließungsstand-Tab** (neu): eigener Tab mit Report-Typografie auf Basis einer strukturierten `quality-snapshot.json`. In Session 33 wieder entfernt, weil redundant zum Markdown-Report (`data/reports/quality-snapshot.md`), der für die Team-Kommunikation ausreicht. Markdown-Report bleibt Pflichtlauf der Pipeline.

Designgrundlage durchgängig: [interface-konzept.md](interface-konzept.md). Tests: 182 passed, 1 skipped, 1 xfailed.

### Session 31 — Wikidata-Rerun + xlsxSource-Provenance + Quality-Snapshot

- **Reconciliation + Enrichment** auf aktuellen v2-Indizes neu gelaufen. WD-Coverage pro Index gestiegen, Low-Confidence-Matches werden ab jetzt nicht automatisch angereichert, sondern im Quality-Snapshot zur manuellen Freigabe gelistet (E-74).
- **`m3gim:xlsxSource`** als technische Provenance auf Records + DetailAnnotations + AgRelOn-Relationen + SpatiotemporalEvents. Jeder Datenpunkt lässt sich zur Ursprungs-Zelle in der XLSX zurückführen (E-73, [datenmodell.md § 9](datenmodell.md)).
- **Anker-Record-Strategie** in `test_20_xlsx_provenance.py`: drei kuratierte Records (`NIM_007 5_1`, `NIM_004 3`, `NIM_003 1_8`) mit strict-Assertions über ihre XLSX-Herkunft plus Soft-Coverage über den Rest. Die Tests sind gleichzeitig Living Documentation der XLSX → JSON-LD-Abbildung.
- **`scripts/report-quality.py`** + `data/reports/quality-snapshot.md`: Team-taugliches Markdown mit Verknüpfungsrate, Bearbeitungsstand, WD-Coverage, Provenance-Coverage, Low-Confidence-Freigabeliste, Blocker-Abschnitt.
- **Frontend-Debug erweitert:** Store-Log zeigt WD-Coverage pro Index + Provenance-Coverage; `window.m3gim.provenanceOf(recordId)` liefert alle XLSX-Quellen eines Records + Nested Entities als Liste.

### Phase 7 Schritt 1 — Archiv-Inline-Detail zeigt Finanzen, Beziehungen, Ereignisse (Session 30)

Alle v2-Daten sind im Archiv-Inline-Detail sichtbar. [archiv-inline-detail.js](../docs/js/views/archiv-inline-detail.js) rendert drei Panels aus den Phase-6-Store-Maps: **Finanzen** (Tabelle mit Feld · Betrag+Währung · Rolle), **Beziehungen** (AgRelOn-Chips mit sprechenden Labels wie „Patron", „Korrespondenz", „Mitglied"), **Ereignisse** (SpatiotemporalEvent-Chips mit Rolle + Ort + Datum). Verifiziert gegen XLSX-Rohdaten für die drei Anker-Records.

### Phase 6 — loader.js indexiert v2-Strukturen (Session 30)

Store-Maps in [loader.js](../docs/js/data/loader.js) eingezogen: `dftHierarchy` (SKOS-Dokumenttyp-Hierarchie mit `broader`+`children`-Backrefs), `mobilityEvents` + `recordToEvents` (Top-Level-STE + Reverse-Map), `agentRelations` (AgRelOn am Record), `finances` (DetailAnnotations mit geparstem Betrag). `indexByYear()` nutzt typisierte Datumsproperties (`m3gim:auffuehrungsdatum` etc.) als Fallback, wenn `rico:date` fehlt. Details: E-72.

### v2-Konsolidierung + Currency-Fix + Frontend-Kontrakt-Spec (Session 29)

- **Daten:** `data/` aufgeräumt — v1-Stände archiviert unter `data/_archive/`, v2 ist alleiniger Default. Ein Datenfluss, ein `data/output/`, ein `docs/data/`.
- **Pipeline:** `FINANCE_CURRENCY_DEFAULTS`-Mapping in `transform.py` (NIM_007 → `S`). `build-views.py` kopiert seitdem `m3gim.jsonld` automatisch nach `docs/data/`.
- **Tests:** Baselines auf v2-Niveau gehoben. XPASS(strict)-Marker in `test_06_frontend_contract.py` formulierten die Phase-6-loader.js-Arbeit als TDD-Spec.
- **Frontend verifiziert im Browser:** Alle Tabs laden v2-Daten ohne Konsolenfehler.

Siehe [entscheidungen.md E-70 + E-71](entscheidungen.md).

### v2-Modellerweiterungen (Session 28)

Testgetriebene Umsetzung der in [datenmodell.md](datenmodell.md) spezifizierten Modell-Erweiterungen:

| Phase | Umsetzung |
|---|---|
| 4.1 | Gender-neutrale Rollennormalisierung (`normalize_role`) |
| 4.2 | SKOS-Hierarchie für Dokumenttypen, `build_dft_concepts()` |
| 4.3 | `agrelon:hasProvenance` + `hasConfidenceValue` ersetzt `m3gim:dateEvidence` |
| 4.4 | `m3gim:SpatiotemporalEvent` als Top-Level-Graph-Entitäten |
| 4.6 | Finanzschicht mit `monetaryAmount`/`currency`/`detailRole` |
| 4.7 | Typisierte Datumsproperty-Familie (`absendedatum`, `auffuehrungsdatum` etc.) |
| 4.8 | AgRelOn-Relationen (HasEmployeeEmployer, HasCorrespondent, HasProfessionalContact, HasIsPatron, HasIsMember) |

Zusätzlich: zahlreiche neue Test-Module (test_11–19), TDD-Workflow mit strict-xfail-Spec als Leitlinie. Siehe [entscheidungen.md E-63 bis E-69](entscheidungen.md).

### Ältere Meilensteine (kompakt)

- **Session 17–19**: Ereignis- und Detail-Typ, `reconcile.py` mit Fuzzy-Matching, `validate.py` Mojibake gefixt
- **Session 20–21**: Matrix + Kosmos aktiviert, Cross-Visualization Linking, Wissenskorb CSV/BibTeX, FF-Badges auf allen Visualisierungen
- **Session 22**: Excel-Quelldateien git-getrackt
- **Session 23**: Zeitfluss-View neu, Shared Component System (`viz-components.js`), Cross-View-Navigation
- **Session 24**: Partitur-Singleton, Tooltip-Controller, Zoom+Reset-Helper als Shared-Infrastruktur
- **Session 25**: `extract_auftritte()` (3-Pass), Mobilitäts-Redesign (Layer, Event-Marker), Prototyp-Seiten (Lebensstationen, Lebenspartitur)
- **Session 26**: DEV/Prod-Log-Toggle, Error Boundaries pro Tab, Event-Bus, ARIA/Accessibility, Responsive Breakpoints
- **Session 27**: Wikidata-Enrichment-Pipeline, Lebenspartitur als SPA-Tab, Fuzzy-Matching in reconcile.py

Detaillierte Entscheidungen: [entscheidungen.md](entscheidungen.md).

## Nächste Schritte

### Interface-Ausbau (aktiver Fokus)

Grundlage: [interface-konzept.md](interface-konzept.md). MVP-Fundament steht (Session 32: Archiv, Indizes), Mobilitäts-Atlas steht (Session 33). Die weiteren Tabs bauen darauf auf.

1. **Repertoire-Tab** — Bühnenrollen × Komponisten als parallele Aggregat-Tabellen mit Inline-Breakdown (`ERWÄHNT · AUFFÜHRUNG · REPERTOIRE → Summe`), passend zum Repertoire-Mockup.
2. **Biogramm-Tab** — chronologische Gesamtsicht (Orte, Netzwerk, Repertoire) pro Lebensphase. Form offen, Konzeption nach Repertoire.
3. **Netzwerk-Tab** — offen. Voraussichtlich Tabelle mit Chip-Breakdown analog Repertoire, nicht Graph.
4. **Reconciliation-Lücke Wien/München/Bayreuth schließen** — die drei prominenten Malaniuk-Städte stehen in `wikidata-reconciliation.json` als `unmatched`. Manuelles Freischalten als `manual_review: "approved"` oder Nachzug der Q-IDs füllt den Atlas deutlich auf.

### Deferred Aufräumarbeiten (nach Bedarf)

- **`loadPartitur()` + `test_08_partitur.py` + partitur.json/matrix.json/kosmos.json-Derivate**: liegen in Session 32 bewusst unberührt. Die Derivate werden weiter gebaut, aber nicht mehr konsumiert. Entfernen, sobald absehbar, dass keine neue Viz sie doch noch braucht.
- **Confidence-Dot am Record-Header**: `confidenceDotProps()` in `constants.js` ist vorbereitet, aber noch nicht im Archiv-Inline-Detail platziert. Bauplatz ist der Record-Header neben dem Datum.

### Offene Datenqualität (extern blockiert)

- **Verwaiste Signatur `UAKUG/NIM_11`** — klären mit Erschließungsteam (betroffen: die einzige arbeitgeber-Zeile, Skip in `test_12`).
- **PL_07 Duplikat** im Google Sheet bereinigen → xfail in `test_05_referential.py` entfernen.
- **Low-Confidence-Matches** aus dem Quality-Snapshot sichten und ggf. als `manual_review: "approved"` freigeben (E-74).

### Deferred Modell-Erweiterungen

- **Phase 4.5** `m3gim:StageRole` als eigenständige Entität. Braucht neues Rollenindex-XLSX vom Erschließungsteam.
- **Phase 4.9** Reifikation / `m3gim:Statement`-Leichtgewicht — nur wo Provenance nicht aus Record-URI folgt.
- **Zenodo-Archivierung** + **EAD-Export** — Betriebsmodell, später.

### Datenqualität (laufend, redaktionell)

- Verknüpfungsrate erhöhen (Schwerpunkt bisher auf Konvoluten um NIM_003/004/007; Einzelobjekte weitgehend unverknüpft).
- Bearbeitungsstand bei der Mehrheit der Objekte noch offen.
- Header-Shifts in drei Indizes im Google Sheet korrigieren (Pipeline kompensiert über `HEADER_SHIFTS`-Mapping).
- Datierungen nicht als Freitext (`"Wien, ab 1956"`), sondern als strukturiertes Feld.

## Strategischer Kontext

Machbarkeitsstudie für FWF-Antrag. Die Pilotstudie liefert methodische Validierung (RiC-O 1.1 + m3gim + AgRelOn praktikabel), technische Infrastruktur (Pipeline + Frontend + Tests) und erste empirische Ergebnisse. Geplante Folgefinanzierung: Mobilität und Wissensproduktion von Sängerinnen an europäischen Kulturmetropolen im 19. und 20. Jahrhundert.
