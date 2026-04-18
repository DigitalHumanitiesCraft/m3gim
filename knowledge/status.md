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

### Session 45 — Statistik schaerfer, Chronik dichte-adaptiv

Kleine, gezielte Korrekturen nach Screenshot-Review (E-92):

- **Statistik-Hero entfernt.** Die vier Kennzahl-Kacheln am Statistik-Tab-Kopf waren Tech-Dashboard-Residuum und duplizierten Zahlen, die ohnehin in den Sektions-Legenden auftauchen. `buildHeroRow`/`heroCard` in [`statistik.js`](../docs/js/views/statistik.js) + `.statistik-hero*` in [`statistik.css`](../docs/css/statistik.css) komplett raus.
- **Mobilitaetssichten als Balken-Chart.** Statt sechs Feature-Kacheln mit Mini-Dichte-Balken rendert die Sektion jetzt einen einzigen `buildHorizontalBars`-Chart, sortiert nach Haeufigkeit, mit eigener Farbfamilie pro Sicht (`SICHT_COLOR`). Die redaktionellen "Beispiel:"-Links (kollidierten mit E-87) und der `.statistik-sicht*`-CSS-Block sind weg. Vorher verglichen die Dichte-Balken nur tile-intern; jetzt sind die Proportionen zwischen Sichten direkt lesbar.
- **Histogramm bekommt Achsen-Titel.** `buildHistogram` akzeptiert `xAxisLabel`/`yAxisLabel`; Geografie-Jahrzehnt-Histogramm zeigt jetzt "Jahrzehnt" und "Anzahl Events". Neue `.stat-axis__title`-Regel, Margins leicht groesser.
- **Chronik-Jahre dichte-adaptiv.** Leere Jahre ohne Dekaden-Status rendern als 6-px-Linie (Label versteckt, Marker 6 px), belegte Jahre bleiben auf voller Hoehe, Dekaden-Jahre bleiben auch bei Null Records sichtbar als Anker. Lueckenstruktur als Rhythmus ohne endloses Scrollen, keine neue Interaktion \u2014 pure CSS-Regel `.chronik-year--empty:not(.chronik-year--decade)` in [`archiv.css`](../docs/css/archiv.css). Konform zu E-88 "Datenqualitaet wird gezeigt".

Smoke-Canary unveraendert gueltig (1 passed).

### Session 44 — Projekt-Finalisierung

Abschluss des Interface-Redesign-Zyklus (E-91):

- **Chip-Klick setzt Toolbar-Filter.** Klick auf eine Person/Ort/Werk-Chip im Inline-Detail oder Korb setzt den entsprechenden Toolbar-Filter im aktiven Record-Tab (Bestand/Chronik) und laesst den Lesefluss dort \u2014 kein Sprung mehr in die Indizes. `router.applyArchivFilter(facet, value)` dispatcht ueber den `m3gim:navigate`-Bus, Handler in [`archiv-bestand.js`](../docs/js/views/archiv-bestand.js) + [`archiv-chronik.js`](../docs/js/views/archiv-chronik.js) rufen `toolbar.setPerson/setLocation/setWerk`. Grids ohne Facet-Equivalent (Organisationen) navigieren weiter in den Index (Fallback).
- **Indizes-Toolbar einheitlich.** Die Indizes-Seite nutzt jetzt die generische [`buildToolbar`](../docs/js/views/_toolbar.js)-Komponente: globale Suche ueber alle vier Grids + Toggle `Nur mit Wikidata`. Per-Grid-Search ist weg, Cross-Grid-Facet-Filter bleibt als zweite Ebene. Tote CSS-Regeln aus [`indizes.css`](../docs/css/indizes.css) entfernt, neue `.archiv-toggle`-Regel in [`archiv.css`](../docs/css/archiv.css).
- **Refactor `extractXlsxSource`.** Drei identische Kopien in `loader.js`, `archiv-inline-detail.js`, `korb.js` ersetzt durch [`utils/provenance.js`](../docs/js/utils/provenance.js). Ein Ort der Wahrheit fuer das Provenance-Shape, stricteres Verhalten (null bei fehlender Zeile).
- **Smoke-Test auf Chronik-Zeitstrahl umgestellt.** `tests/frontend/smoke.py` pruefte noch die alte Perioden-Akkordeon-Struktur und brach nach der E-88-Umstellung. Neu: `chronik-year`-Grid (>= 90 Jahre), `chronik-point`-Chips, Click-Canary dispatcht `selectRecord` und prueft den Sprung ins Bestand-Inline-Detail. logStamp-Erwartung fuer Chronik: `records, jahre-belegt, undatiert, spanne`.
- **Korb-Follow-ups entschieden** (E-91 Punkt 4): Konvolute bleiben nicht bookmarkbar (eigene Export-Aggregationslogik waere noetig \u2014 eigenes Arbeitspaket wenn je noetig). Tab-Name bleibt "Wissenskorb".

Testsuite durchgaengig gruen (191 passed, 1 skipped, 2 xfail). Frontend-Smoke-Canary ebenfalls gruen.

### Session 43 — UI-Feinschliff: Konvolut-Affordance, Provenance-Tooltip, Wikidata-Link, Statistik-Politur

Drei sichtbare Defekte + Statistik-Politur in einem Durchlauf (E-90). Konvolut-Aufklapp-Chevron wird als KUG-blauer Button mit Hintergrund dargestellt, `aria-expanded` gesetzt. Die Provenance-Pille am Rolle-Prefix-Chip nutzt jetzt das CSS-`data-tip`-System mit mehrzeiligem Tooltip (Sheet · Zeile · Datenpunkt) und einem Paperclip-Icon; das Chip-Level-Tooltip "Im Index oeffnen" wird nur noch gesetzt, wenn keine Child-Element eigene Tooltips hat \u2014 damit Schluss mit Doppel-Tooltips bei Hover. Das Wikidata-Badge bekam eine linke Trennlinie und eigenen Hover-State + data-tip, sodass es als separate Klick-Aktion erkennbar ist. In der Statistik bekommen Donut-Legenden-Labels bei Ellipsis jetzt `data-tip` mit dem Voll-Text, das Histogramm duennt Ticks bei > 10 Kategorien aus, und das SVG-Wrap shrinkt auf schmalen Viewports. Klick-Action auf Chip (navigateToIndex) bleibt vorerst \u2014 Entscheidung Phase C im Plan offen.

### Session 42 — Statistik als visuelles Portr\u00e4t + generische Toolbar-Komponente

Statistik-Tab komplett umgebaut (E-89): weg von Prozent-Balken und Tech-Tabellen, hin zu D3-Donut (Dokumenttypen, AgRelOn, W\u00e4hrungen) + Histogramm (Events pro Jahrzehnt) + horizontal Bars (Top-Orte, Komponisten, Detail-Rollen). Sektion `Verlinkung & Qualit\u00e4t` und der `Bearbeitungsstand`-Balken sind entfernt \u2014 Tech-Reporting lebt im Markdown-Report `data/reports/quality-snapshot.md`. Tote CSS-Regeln mit ausger\u00e4umt.

Zus\u00e4tzlich: Die Filter-Toolbar ist als generische Komponente [`docs/js/views/_toolbar.js`](../docs/js/views/_toolbar.js) neu gezogen. Jeder Tab deklariert seine Facetten (`search`, `dftSelect`, `entityCombobox`, `select`, `toggle`); [`_archiv-toolbar.js`](../docs/js/views/_archiv-toolbar.js) ist auf einen d\u00fcnnen Wrapper geschrumpft. Indizes kann die Komponente in einer Nachfolge-Session mit eigenen Facetten anbinden.

### Session 41 — Chronik als Scroll-Zeitstrahl + Ort/Werk-Filter in der Toolbar

Chronik vom Perioden-Akkordeon auf einen scrollenden Jahres-Zeitstrahl umgestellt (E-88). Records werden als klickbare Punkte rechts der Zeitachse pro Jahr angeordnet, leere Jahre bleiben als Umriss-Dot sichtbar, Dot-Groesse skaliert mit Jahresbelegung. Gruppierungs-Toggle (Ort/Person/Werk) und Fuenfjahresperioden-Logik entfallen.

Die geteilte Filter-Toolbar fuer Bestand + Chronik hat zwei neue Facetten: **Ort** und **Werk** als Entity-Comboboxen parallel zur Person-Combobox. `buildPersonCombobox` ist zu einem generischen `buildEntityCombobox(entityMap, opts)` refaktoriert, das auf jede `store.*`-Map mit `records`-Set laeuft. Neue Toolbar-API: `setLocation(name)`, `setWerk(name)` ergaenzen `setPerson(name)`. Bestand- und Chronik-Update-Code filtern zusaetzlich ueber `store.locations.get(loc).records` bzw. `store.works.get(werk).records`.

### Session 40 — Chronik rein datengetrieben

Redaktionelle Karriere-Notizen aus der Chronik entfernt (E-87). `KARRIERE_NOTIZEN` + `KARRIERE_NOTIZ_TOOLTIP` aus [`archiv-chronik.js`](../docs/js/views/archiv-chronik.js) raus, `note`-Rendering im Perioden-Header gestrichen, Editorial-Marker-CSS (`.chronik-period__note--editorial`, `.chronik-period__editorial-marker`) aus [`archiv.css`](../docs/css/archiv.css) entfernt. Die Perioden-Summary aus Top-Typen + Top-Gruppen trägt die datengetriebene Charakterisierung alleine. Knowledge-Sync: [`interface-konzept.md`](interface-konzept.md) § „Redaktionelle Einordnung wird markiert" gestrichen und durch „Keine redaktionelle Deutung im UI" ersetzt. Grundsatz: alles, was gerendert wird, muss aus `store.*` ableitbar sein — strukturelle Labels (`1950-1954`, „Undatiert") und prozessuale Workflow-Terminologie (Low-Confidence-Sichtung, E-74) bleiben, weil sie keine historische Deutung leisten.

### Session 39 — Wissenskorb zurueck in der Tab-Bar

Wissenskorb als fuenfter sichtbarer Tab reaktiviert und an die E-75/E-77-Designsprache angeglichen (E-86). `hidden`-Attribut am Korb-Button entfernt, `VISIBLE_TABS` in [`router.js`](../docs/js/ui/router.js) um `'korb'` erweitert; der stumme Bug in `updateKorbTabVisibility()` (bedingungsloses `btn.hidden = false` sabotierte E-81) ist beseitigt. [`docs/js/views/korb.js`](../docs/js/views/korb.js) rendert jetzt mit `buildRoleChip()` aus dem Inline-Detail und denselben funktionalen Bloecken (Produktion, Mitwirkende, Werk & Repertoire, Ort & Ereignis, Erwaehnt, Weitere, Beziehungen, Finanzen). CSV/BibTeX-Exporte tragen zusaetzlich AgRelOn-Beziehungen und Finanzen; Orte kommen auch aus `store.recordToEvents`, BibTeX-Author faellt bei fehlendem `verfasser:in` auf den `HasCorrespondent`-Sender zurueck. `stamp_expectations['korb']` berichtet nun `{records, relations, finances, events}`. Knowledge-Sync in [`frontend.md`](frontend.md), [`interface-konzept.md`](interface-konzept.md), [`entscheidungen.md`](entscheidungen.md).

### Session 38 — Statistik-Review + Datenqualitäts-Audit

Drei ehrliche Lücken im Statistik-Tab von Session 37 geschlossen, strikt nach der `xlsx-fixes.md`-Regel „Documents as Source of Truth — Pipeline-Workarounds sind Schulden, nicht Features".

- **§ 1 zeigt ungetypte Records.** `aggregateDocTypes` sammelt Records ohne DFT-Typ in ein eigenes Bucket, das ans Ende der Balkenliste gehängt wird. Vorher waren die ungetypten Records stillschweigend weggefiltert; jetzt summieren die Balken auf die Gesamt-Record-Zahl. CSS-Modifier `--missing` für die Grau-Tönung, logStamp-Key `doctypes-ohne`.
- **Komponisten-Varianten-Detektor** (`tests/test_24_composer_uniqueness.py`). Levenshtein-Ratio ≥ 92 findet „Beethoven, Ludwig van/von"-Paare im Werkindex. Strict-xfail bis XLSX-Fix durch das Archivteam; nach Fix wird XPASS → Suite bricht → Marker entfernen. Bewusst **kein** `normalize_composer()` in der Pipeline — das wäre ein Sonderfall-Workaround, der künftige Tippfehler zukleistert. Neuer Eintrag in `knowledge/xlsx-fixes.md § 14` dokumentiert das Ticket + die Prinzip-Begründung.
- **§ 6 Low-Confidence-Badge.** `scripts/transform.py` schreibt zwei Top-Level-Meta-Felder ins JSON-LD: `m3gim:approvedManualMatches` und `m3gim:lowConfidenceSkipped`. Loader liest in `store.qualityMeta`. UI ergänzt dritte Subsection in § 6 Qualität. Einhaltung des harten Prinzips „JSON-LD ist die einzige Frontend-Datenquelle" (CLAUDE.md) — keine zusätzliche Datei nach `docs/data/` kopiert. logStamp-Key `approved`.

### Session 37 — Statistik-Tab als Zusammenschau des Bestandes

Neuer vierter Tab **Statistik** zwischen Chronik und Indizes. Read-only Showroom mit sieben Sektionen (Hero-Row, Bestand in Zahlen, Mobilitätssichten, Geografie, Netzwerk, Repertoire, Verlinkung & Qualität, Finanzen), alle aus dem Live-Store aggregiert — keine Pipeline-Änderung, keine Hardcoded-Zahlen, keine Knowledge-Zählstände. Tab-Registrierung über `TAB_RENDERERS`/`VISIBLE_TABS`/`router.TABS`, neue View `docs/js/views/statistik.js` ohne Module-State, neues Stylesheet `docs/css/statistik.css`. Aggregations-Helper als pure Funktionen. Strukturierter Log-Stempel mit Aggregations-Keys, Smoke erweitert um `stamp_expectations['statistik']`. Siehe E-85 für die Showroom-vs.-Research-Abgrenzung, `knowledge/frontend.md § Statistik` für die View-Beschreibung.

### Session 35 — Bestand-Fokus, Konvolut-UX, Verifikationslauf

Fokussierung des Interfaces auf drei aktive Perspektiven + Hygiene-Runde gegen frontendspezifische Silent-Bugs.

- **Tab-Bar reduziert auf Bestand · Chronik · Indizes.** Die fünf weiteren Perspektiv-/Werkzeug-Tabs (Mobilitäts-Atlas, Repertoire, Biogramm, Netzwerk, Wissenskorb) sind per `hidden`-Attribut ausgeblendet; Code, CSS und Store-Maps bleiben. Hash-URLs auf versteckte Tabs werden auf Bestand umgebogen (`VISIBLE_TABS` in `router.js`). Begründung + Reaktivierungsprozedur: E-81.
- **Konvolut-UX geradegezogen.** `buildKonvolutDetail` entfällt; Konvolut-Metadaten (Top-3-Dokumenttyp-Chips + Status-Mix) stehen direkt in der Bestand-Zeile, Click auf Konvolut-Header toggled nur noch auf/zu (E-82). `konvolutMeta` im Loader um `docTypeCounts`, `statusCounts`, `processedCount` erweitert — einmalige Aggregation statt on-the-fly-Rendering.
- **Hierarchische Sortierung.** Konvolute bleiben Signatur-stabil, Kinder werden *innerhalb* ihres Konvoluts nach dem gewählten Sort-Key sortiert; bei aktivem Filter wird die Hierarchie aufgelöst und flach sortiert (E-83).
- **Record-Detail aufgeräumt.** AgRelOn-Dedup-Bug gefixt (Loader liefert flaches `objectName`/`objectWikidata`, UI las den JSON-LD-Pfad `rel['agrelon:hasObject']` → silent dead branch → Malaniuk doppelt sichtbar). Folio-Filter auf Kinder ausgeweitet (Folios ohne Links werden nicht mehr gerendert). Titel-Dedup: Folio mit Konvolut-Titel zeigt leere Titel-Zelle. Sprach-Kürzel (`en, fr`) werden über `formatLanguage()` zu „Englisch, Französisch".
- **Dokumenttyp-Label-Map synchronisiert.** `DOKUMENTTYP_LABELS` enthält die in den Daten tatsächlich vorkommenden DFT-IDs (z. B. `programm` → `Programmheft`). SKOS-Labels aus der Pipeline sind aktuell nur Slugs — strukturell besser wäre, sie in der Pipeline zu schreiben; als offene Entscheidung in [entscheidungen.md](entscheidungen.md) festgehalten.
- **Typ-Disziplin.** JSDoc-Shapes (`RelationEntry`, `MobilityEvent`, `FinanceEntry`, `DftConcept`) auf `buildStore()` in `loader.js`. Der gestrige Dedup-Bug wird künftig durch Linter sichtbar.
- **Verifikation gegen Rohdaten.** Record `NIM_004 1` Ende-zu-Ende gegen die XLSX-Quellen verifiziert: Typ, Datum, Sprache, Umfang, Bearbeitungsstand, alle Verknüpfungen + das typisierte `absendedatum` stimmen überein. Pipeline-Kanonisierung (`vollständig` → `abgeschlossen` via `normalize_bearbeitungsstand`) korrekt.
- **Frontend-Smoke erweitert.** Drei neue Canaries: Sprach-Label aufgelöst, Malaniuk erscheint einmal (Dedup ok), Konvolut-Meta-Chips sichtbar. Einer der Canaries hätte den Dedup-Bug vorab gefangen.
- **Offene Entscheidungen neu** (in `entscheidungen.md`): SKOS-Labels in Pipeline, AgRelOn-Granularität (`HasAddressee`/`HasSender` statt pauschal `HasCorrespondent`).

### Session 34 — Datenqualität + Interface-Ausbau (Repertoire · Biogramm · Netzwerk)

Mehrere Commits schließen die Datenqualitäts-Gaps und vervollständigen das in [interface-konzept.md](interface-konzept.md) verankerte Sechs-Perspektiven-Fundament (Archiv · Indizes · Mobilitäts-Atlas · Repertoire · Biogramm · Netzwerk, plus Wissenskorb als Querschnitts-Werkzeug).

- **ORTE-Label-Bug (Pipeline).** Im Komposit `ort,datum` der Verknüpfungstabelle wird die Rolle des Eintrags (z. B. `erscheinungsdatum`) an beide Hälften vererbt — der `rico:Place` trug dadurch eine Datumsrolle, im UI erschien „Stuttgart (erscheinungsdatum)". `scripts/transform.py` strippt das `role`-Feld im Ort-Zweig, wenn es in `DATUMSROLLE_TO_PROPERTY` liegt. TDD in `tests/test_23_role_hygiene.py`. Places mit Datumsrolle wurden vollständig bereinigt.
- **Reconciliation-Lücke geschlossen.** Prominente Malaniuk-Städte (Wien Q1741, München Q1726, Bayreuth Q3923, Köln Q365, Venedig Q641, Neapel Q2634, Buenos Aires Q1486, Lemberg Q36036, Lissabon Q597, Iwano-Frankiwsk Q156726) manuell als `match: "manual"` + `manual_review: "approved"` in `wikidata-reconciliation.json` eingetragen. Enrichment + Transform ziehen Koordinaten nach. Wirkung: STE-Coverage für den Mobilitäts-Atlas deutlich angehoben, Wien wird zum Haupt-Hub. Laufende Zahlen im Quality-Snapshot.
- **Archiv-Inline-Detail-Migration.** `renderEntityChips()` entfallen. Alle Agent-, Werk- und Ort-Chips laufen durch `buildRoleChip()` und tragen Cluster-Farbe + Provenance-Pille. Rechte Spalte in fünf funktionale Blöcke (Produktion · Mitwirkende · Werk & Repertoire · Ort & Ereignis · Erwähnt · Weitere) statt sechs typbasierter Sektionen. Mapping in `ROLE_TO_SECTION`/`sectionForRole()` in `docs/js/data/constants.js`. Ereignisse wandern in den Ort-&-Ereignis-Block (Doppeldarstellung entfällt).
- **Repertoire-Tab.** Zwei parallele Aggregat-Tabellen (Bühnenrepertoire × Komponisten), jede Zeile mit Inline-Breakdown `ERW · AUFF · REP → Summe`. Aggregation im Frontend aus `store.records` + `store.works`, DFT-Typ `m3gim-dft:repertoireliste` für REP. Klick öffnet Belegliste chronologisch. Debug-Helper `window.m3gim.repertoireAggregate()`.
- **Biogramm-Tab.** D3-Zeitstrahl 1919–2009 mit zwei Spuren (Orte aus `mobilityEvents` nach Land, Belege aller datierten Records). Phasen-Quickselect (Jugend · Nachkriegs-Graz · Europäische Karriere · Lehrtätigkeit). Flucht 1944 als vertikale Signal-Rot-Linie. Dritte (Netzwerk-)Spur deferred, weil AgRelOn keine Validity-Perioden trägt.
- **Netzwerk-Tab.** Tabelle vor Graph. Pivot pro Agenten-Gegenseite mit Chip-Breakdown (`KORRESP · BERUF · PATRON · ARBGBR · MITGLIED`). Klick öffnet Belegliste rechts (sticky). Datenlage aktuell dünn; Tab wächst ohne Code-Änderung mit der Erschließung.
- **Datenqualität Wikidata-Country-Labels + Q-ID-Korrekturen.** `enrich-wikidata.py` wählt P17-Claims jetzt über `rank=preferred` statt blindem `values[0]` (Berlin → Deutschland statt „Mark Brandenburg"). Zwei falsche Q-IDs aus dem manuellen Approval-Batch korrigiert: Bayreuth Q2861 (war Rostock) → Q3923, Stanislau Q200491 (war US-Game-Publisher) → Q156726. Neues Helper-Skript `scripts/verify-manual-approvals.py` prüft künftige Approvals gegen Live-Wikidata-Labels; als Pflichtlauf in [CLAUDE.md](../CLAUDE.md) verankert.
- **Frontend-Politur.** ROLE_TO_SECTION erweitert (Arrangeur, Bühnenbildner, Herausgeber etc. jetzt person-Cluster statt neutral). Design-Tokens in den drei neuen Tab-CSS-Files (`repertoire.css`, `biogramm.css`, `netzwerk.css`) auf die zentralen `--color-*` / `--space-*` / `--text-*` umgestellt. `.chip--compact`-Modifier in `archiv.css` als geteilter Stil für Aggregat-Breakdowns.

### Session 33 — Mobilitäts-Atlas MVP

Zwei sequenzielle Commits haben den ersten Tab mit Karte realisiert:

- **Koordinaten-Patch (Pipeline)**: `m3gim:SpatiotemporalEvent` trägt im `m3gim:atPlace`-Subobjekt nun `@id` (`wd:Qxxx`), `owl:sameAs`, `geo:lat`, `geo:long` und – falls vorhanden – `m3gim:country`. Umgesetzt in `scripts/transform.py` als zwei minimale Eingriffe: Ortsindex-Lookup für spatiotemporal-rels in `process_verknuepfungen()` und Wiederverwendung von `_inject_enrichment()` im STE-Zweig von `add_relations_to_records()`. TDD via neuem `tests/test_22_ste_coordinates.py` (Anker: Zürich, Salzburg; Soft-Coverage ≥ 10).
- **Mobilitäts-Atlas-Tab**: neuer Tab `docs/js/views/mobilitaets-atlas.js`, Grid mit Leaflet-Karte (OSM-Tiles, kein API-Key), horizontalem D3-Zeitstrahl (Brush filtert Karte + Panel) und Chip-Detailpanel. Bi-direktionale Kopplung über lokalen Renderer-State (`selectedPlace`, `selectedRange`, `unverortetMode`). Marker-Größe skaliert mit Event-Zahl pro Ort; Signal-Grün markiert die Auswahl. Events ohne Koordinaten (Wien, München, Bayreuth – Reconciliation-Lücke) sind über Badge "N unverortet" erreichbar. Chip-Helper `buildRoleChip()` aus `archiv-inline-detail.js` exportiert und wiederverwendet. Loader-Erweiterung: `placeLat`/`placeLon`/`placeCountry` auf `mobilityEvent`. Debug-Helper `window.m3gim.mobilityEventsWithGeo()`.

Designgrundlage: [interface-konzept.md § Mobilitäts-Atlas](interface-konzept.md).

### Session 32 — Interface-Fundament MVP (E-75)

Fünf aufeinander aufbauende Commits haben das neue Forschungsinterface-Fundament gelegt:

- **Alt-Viz entfernt**: sechs D3-Prototypen (Mobilität, Matrix, Kosmos, Zeitfluss, Lebenspartitur, Lebensstationen) + zugehöriges CSS + zwei Standalone-HTMLs + `aggregator.js` + `viz-components.js` raus. Tab-Leiste reduziert auf Archiv, Indizes, Korb (später erweitert).
- **Archiv-Inline-Detail** rendert Finanzen, AgRelOn-Beziehungen und SpatiotemporalEvents im neuen Rolle-Prefix-Chip-Pattern aus dem Dossier-Mockup: Uppercase-Mono-Prefix + Serif-Wert + Provenance-Pille (`#1276`) + optionales Wikidata-Badge. Zentraler Helper `buildRoleChip()` in `archiv-inline-detail.js`, Cluster-Farbfamilien in `archiv.css` (ort, person, rolle, beziehung, finanz, datum, neutral).
- **Indizes-Personen mit Beziehungsbadges**: Loader-Pass 2.5 resolviert AgRelOn-Relationen rückwärts auf Personen-Einträge (Matching primär Q-ID, sekundär `normalizePerson(name)`). `renderNameCell()` zeigt eine dritte Zeile `idx-relations` mit Chips im gleichen Muster. Mehrfach-Relationen werden gezählt, Klick springt zum Beleg.
- **DFT-Filter hierarchisch**: `buildDftTree(store)` + `expandDftFilter(store, shortId)` in `format.js`. Dropdown nutzt `<optgroup>`-Struktur; Oberbegriff matcht transitiv in Bestand + Chronik.
- **Erschließungsstand-Tab** (neu): eigener Tab mit Report-Typografie auf Basis einer strukturierten `quality-snapshot.json`. In Session 33 wieder entfernt, weil redundant zum Markdown-Report (`data/reports/quality-snapshot.md`), der für die Team-Kommunikation ausreicht. Markdown-Report bleibt Pflichtlauf der Pipeline.

Designgrundlage durchgängig: [interface-konzept.md](interface-konzept.md).

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

### Interface-Ausbau

Grundlage: [interface-konzept.md](interface-konzept.md). Aktiv sind **Bestand · Chronik · Statistik · Indizes · Wissenskorb**. Die übrigen vier Perspektiv-Tabs (Mobilitäts-Atlas, Repertoire, Biogramm, Netzwerk) sind verborgen und werden später überarbeitet (E-81, präzisiert durch E-86).

1. **Reaktivierung + Redesign der vier Perspektiv-Tabs** — pro Tab: Daten-Kontrakt gegen Store verifizieren, Rolle-Prefix-Chip-Muster konsequent anwenden, Meta-Fresh-Check vor Enable. Reihenfolge offen.
2. **SKOS-Labels in Pipeline pflegen** (offene Entscheidung in [entscheidungen.md](entscheidungen.md)) — `skos:prefLabel` an DFT-Concepts mit lesbaren deutschen Labels; dann kann das Frontend die Handtabelle `DOKUMENTTYP_LABELS` ersetzen.
3. **AgRelOn-Granularität** (offene Entscheidung) — `HasAddressee` / `HasSender` statt pauschal `HasCorrespondent`, oder symmetrische Beziehung für beide Richtungen.
4. **Biogramm — Netzwerk-Spur** sobald AgRelOn-Relationen validity-dates tragen.
5. **Weitere Reconciliation-Runde** — Unmatched-Restliste manuell prüfen, falls gewünscht. Nicht blockierend.

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
