# Entscheidungen und Prozesswissen

> Architekturentscheidungen, offene Entscheidungen, technische Schulden und Learnings.

## Architekturentscheidungen (final)

| ID | Entscheidung |
|---|---|
| E-01 | Vanilla JS (kein Framework) |
| E-02 | D3.js v7 fuer alle Visualisierungen |
| E-03 | Kein Build-Tool, direkte ES6-Module auf GitHub Pages |
| E-04 | Leaflet + CartoDB (deferred) |
| E-05 | Offline-first (alle Daten bei Startup) |
| E-06 | Google Sheets als Erfassungstool |
| E-07 | Wikidata Q-IDs als Normdaten |
| E-08 | JSON-LD / RiC-O 1.1 als Datenformat |
| E-09 | Mobilitaetsform-Praefix `[mobilitaet:]` im Anmerkungsfeld |
| E-10 | Synthetische Daten mit `_meta.synthetic` |
| E-11 | 4 D3-Vis (Matrix, Kosmos, Zeitfluss, Mobilitaet) + 3 Views (Archiv, Indizes, Korb) |
| E-12 | Netzwerk-Schwellenwert 3+ fuer Matrix |
| E-13 | 5-Jahres-Intervalle in Matrix |
| E-14 | Komponisten-Farbkodierung |
| E-15 | 7 Lebensphasen LP1–LP7 |
| E-16 | Scroll-Morphing im Kosmos |
| E-17 | Farbe + Linienstil fuer Mobilitaetstypen |
| E-18 | Tab-basiert (Archiv, Indizes, Mobilitaet, Korb, Matrix, Kosmos) |
| E-19 | Bestand/Chronik-Toggle mit Inline-Expansion |
| E-20 | Inline-Expansion (Archiv) + Slide-in Sidebar (deaktiviert) |
| E-21 | Collapsible Provenienz-Darstellung |
| E-22 | Gruppierte Verknuepfungen mit Icons |
| E-23 | Horizontale Toolbar fuer Visualisierungen |
| E-24 | Export CSV > JSON-LD > GEXF > GeoJSON |
| E-25 | Keine praeemptive Performance-Optimierung |
| E-26 | Seiten statt Modals — About/Projekt/Hilfe als eigenstaendige HTML-Seiten |
| E-27 | 4 funktionale Farbkategorien: KUG-Blau (Interaktion), Signal-Gruen (Verknuepfung), Neutral-Grau (Abwesenheit), Warmer Hintergrund (Struktur) |
| E-28 | Handreichung als UX-Quelle — Erfassungskonventionen direkt in Frontend-Texte |
| E-29 | Dynamischer Counter: "X von Y Objekten" bei aktivem Filter |
| E-30 | Stats-Bar entfernt — Info nur kontextuell im Archiv-Tab |
| E-31 | `m3gim:hasAssociatedAgent` statt `rico:hasOrHadAgent` (existiert nicht in RiC-O 1.1) |
| E-32 | Erwaehnungen als `rico:hasOrHadSubject` mit `@type: rico:Person` (standard RiC-O statt custom `m3gim:mentions`) |
| E-33 | `m3gim:eventDate` fuer Datum-Literale (rico:isAssociatedWithDate ist ObjectProperty) |
| E-34 | `@context`-Aliase (`name` → `rico:name`, `role` → `m3gim:role`, `komponist` → `m3gim:komponist`) |
| E-35 | GitHub Actions Workflow entfernt — Pipeline laeuft lokal |
| E-36 | Floating-Tooltip (HTML-div ueber SVG) statt CSS-`::after` — SVG-Elemente unterstuetzen keine Pseudo-Elemente |
| E-37 | Popup-Menue fuer Multi-Dokument-Dots — bei >1 Dokumenten pro Gastspiel-Dot |
| E-38 | Guest-City-Display-Normalisierung via GUEST_DISPLAY_MAP |
| E-39 | Piecewise-linear Zeitskala mit Skalenbruch (BREAK_YEAR=1975, BREAK_RATIO=0.74) |
| E-40 | Excel-Quelldateien in `data/source/` git-getrackt (Reproduzierbarkeit statt nur Google Sheets) |
| E-41 | Layer-Toggle statt gleichzeitiger Darstellung aller Schichten in Mobilitaet (5 Layer: mobilitaet, auftritte, netzwerk, repertoire, sparkline) |
| E-42 | Vertikale Event-Marker statt Bezier-Pfeile fuer Mobilitaetsereignisse — Position + Text statt Kurve + Farbe |
| E-43 | `extract_auftritte()` Pipeline-Funktion — 3-Pass-Extraktion (strukturiert, Programmhefte/Plakate, Rezensionen) mit 4 Kategorien (engagement, festspiel, gastspiel, konzert) |
| E-44 | `buildLayerChips()` als Multi-Select-Erweiterung des Phase-Chip-Patterns in viz-components.js |
| E-45 | Auftritte-Aggregation — Deduplizierung nach (ort, jahr, werk), Dots ueber dem Balken positioniert |
| E-46 | `kontext`-Felder in `mobilitaet[]` — narrative Zusatztexte fuer Forschungsbezug (z.B. Netzwerk-Deltas, Wissenstransfer) |
| E-47 | Prototyp-Seiten als eigenstaendige HTML (lebensstationen.html, lebenspartitur.html) statt weitere SPA-Tab-Iterationen |
| E-48 | Lebensstationen: Scrollytelling mit IntersectionObserver, 7 Kapitel + 7 Wendepunkte, Sticky Mini-Timeline |
| E-49 | Lebenspartitur: Vertikaler Bump-Chart (Lebenslinie + synchronisierte Facetten fuer Netzwerk/Repertoire) |
| E-50 | DEV/Prod Log-Toggle: `viewLog()` gibt No-Ops auf GitHub Pages, Console-Diagnostik nur auf localhost |
| E-51 | Error Boundaries pro View: main.js faengt Render-Fehler pro Tab ab (sync+async), erlaubt Re-Render |
| E-52 | Deutsche Fehlermeldungen in loader.js: Netzwerk/404/Parse unterschieden, `loadPartitur()` warnt statt stilles null |
| E-53 | Zentraler Cross-View Event-Bus (`events.js`): `onViewNavigate(tab, handler)` mit Auto-Replay statt `pendingHighlight`-Pattern pro View |
| E-54 | Prototyp-Seiten modularisiert: inline CSS/JS extrahiert in externe Module, `loadPartitur()` Singleton statt direktem fetch() |
| E-55 | ARIA-Accessibility: `role="tablist/tab/tabpanel"`, `aria-selected` dynamisch, `aria-hidden` auf dekorativen SVG-Icons |
| E-56 | Responsive Breakpoints: `@media <768px` in base.css + components.css, FF-Badges hidden, Toolbars kompakter |
| E-57 | Lebenspartitur als SPA-Tab: `renderLebenspartitur(store, container)` mit container-relativem DOM, Standalone-`init()` beibehalten fuer `lebenspartitur.html` |
| E-58 | Fuzzy-Matching in reconcile.py: `thefuzz.token_set_ratio`, 3 Confidence-Level (exact/fuzzy_high/fuzzy_low), backward-kompatibles JSON-Format |
| E-59 | Wikidata-Enrichment-Pipeline: `enrich-wikidata.py` holt Properties (P106, P412, P569/P570, P625, P1191 etc.), `transform.py` injiziert `owl:sameAs` + `m3gim:`-Properties in JSON-LD |
| E-60 | UA-Distanz im Kosmos: Phase-Filter-Annotation zeigt durchschnittliche Urauffuehrungsdistanz, Werk-Tooltips zeigen individuelle Distanz |
| E-61 | Indizes-Subtitles: `renderNameCell()` zeigt Beruf, Stimmfach, Lebensdaten aus WD-Enrichment unter Personennamen |
| E-62 | ~~v2-Parallelstruktur~~ — **obsolet seit 2026-04-17, Session 29**: v2 wurde zum alleinigen Default konsolidiert. `data/google-spreadsheet/` + `data/output/` + `data/reports/` sind die einzigen operativen Verzeichnisse; alte v1-Stände liegen unter `data/_archive/`. ENV-Overrides bleiben als Technik verfügbar (z.B. für Experimente mit alternativen Datenständen), sind im Normalbetrieb aber nicht mehr nötig. `build-views.py` kopiert im Default-Lauf automatisch `m3gim.jsonld` + Derivate nach `docs/data/`. |
| E-63 | Gender-neutrale Rollennormalisierung (`normalize_role`): `:in`/`:innen`-Suffixe werden gestrippt. Ambiguierende End-`in`-Formen bleiben erhalten (interpret, technische leitung). Kontrolliertes Vokabular in [datenmodell.md § 5](datenmodell.md). |
| E-64 | SKOS-Hierarchie für Dokumenttypen: `build_dft_concepts()` emittiert `skos:Concept`-Knoten mit `skos:broader` als Top-Level-Graph-Entitäten. Korrespondenz, Presse, Programm, Biographisch, Identitätsdokument als Oberklassen. Nur effektiv verwendete Konzepte werden emittiert (transitives Closure). |
| E-65 | `m3gim:dateEvidence` → `agrelon:hasProvenance` + `agrelon:hasConfidenceValue`: Der Record verweist als Provenance auf sich selbst; die Evidenz-Stufen (`aus_dokument`/`erschlossen`/`extern`/`unbekannt`) werden auf Dezimal-Konfidenzen (1.0/0.6/0.8/0.0) gemappt. Kompletter Drop des alten Property-Namens, nicht additiv — **Frontend-breaking**, Phase 6 nachziehen. |
| E-66 | `m3gim:SpatiotemporalEvent` als Top-Level-Graph-Entitäten: Komposit `ort, datum` erzeugt zusätzlich zu den zwei getrennten Relationen eine SpatiotemporalEvent-Instanz mit `atPlace`, `atDate`, `eventRole`. Records referenzieren via `m3gim:hasSpatiotemporalEvent`. Rein additiv, bestehende `rico:hasOrHadLocation`+`m3gim:eventDate` bleiben. |
| E-67 | Finanzschicht strukturiert: `parse_monetary_value` zerlegt `AMOUNT, CURRENCY`, Komma als Dezimaltrenner. `m3gim:DetailAnnotation` trägt `monetaryAmount` (xsd:decimal), `currency` (belegter Code ohne ISO-4217-Zwang wegen Ambiguität „Fr" = FRF/CHF), `detailRole`, `detailValue` (Rohwert). |
| E-68 | Typisierte Datumsproperty-Familie: `m3gim:absendedatum`, `m3gim:auffuehrungsdatum`, `m3gim:premieredatum` etc. je nach Rolle statt generisch `m3gim:eventDate`. `is_iso_date()` als Gatekeeper gegen Freitext-Leaks (`"Wien, ab 1956"` landet im Fallback `m3gim:eventDate`, nicht in typisierter Property). `clean_date` normalisiert `YYYY-YYYY` → `YYYY/YYYY` (data.md § 6). |
| E-69 | AgRelOn für Agent-Agent-Relationen: `AGRELON_MAPPING` (typ, rolle) → AgRelOn-Klasse + -Property. Umgesetzt: `HasEmployeeEmployer`, `HasCorrespondent`, `HasProfessionalContact`, `HasIsPatron`, `HasIsMember`. Emission als `m3gim:agentRelation`-Array am Record mit `agrelon:hasProvenance` (Record-URI). `hasValidityPeriod` aus `rico:date` als Heuristik für Employer-Relationen. |
| E-70 | v2-Konsolidierung (Session 29, 2026-04-17): v2 ist alleiniger Default, v1 unter `data/_archive/` archiviert. `docs/data/m3gim.jsonld` ist alleinige primäre Datenquelle des Frontends — Derivate (`partitur.json`, `matrix.json`, `kosmos.json`) sind optionale Visualisierungs-Hilfen, die vom Store aus regeneriert werden können. `build-views.py` kopiert seitdem auch `m3gim.jsonld` automatisch nach `docs/data/` (zuvor manueller Schritt, Drift-Quelle). E-62 damit obsolet. |
| E-71 | `FINANCE_CURRENCY_DEFAULTS` pro Archivsignatur-Präfix in `transform.py`: greift, wenn XLSX-Typ `ausgaben, währung` markiert ist, das Namensfeld aber keinen Währungs-Suffix trägt. Aktuell `UAKUG/NIM_007` → `S` (Schilling). Defaults sind explizite Redaktionsentscheidungen; ohne Eintrag bleibt `currency` leer und `validate.py` warnt. Alternative heuristisches Raten im Parser wurde bewusst verworfen, weil historisch korrekte Währungszuordnung inhaltlich, nicht syntaktisch erfolgen muss. |
| E-72 | Phase 6 — Store-Maps in `loader.js` (Session 30): `dftHierarchy`, `mobilityEvents`+`recordToEvents`, `agentRelations`, `finances`, plus typisierte Datumsfelder als Fallback in `indexByYear`. Jede Map ist eigenständige Indexer-Funktion, die Pass 1 (Top-Level-Knoten: Concepts, STE) bzw. Pass 2 (record-gebunden: events-refs, agentRelations, finances) durchläuft. Pass 1.5 verdrahtet `skos:broader` zu `children[]`-Backrefs. DFT-Concepts und STE werden **nicht** direkt als Record-Properties indexiert — sie sind Top-Level-Graph-Entitäten mit `@id`, und Records verweisen via `@id`. Die Views sehen die Maps erst nach Phase 7 (View-Migration). |
| E-73 | `m3gim:xlsxSource` als technische Provenance pro Record und pro aus Verknüpfungen abgeleiteter Entität (DetailAnnotation, AgRelOn-Relation, SpatiotemporalEvent). Blank-Node mit `xlsxSheet` (`"Objekte"` / `"Verknuepfungen"`), `xlsxRow` (1-basiert inkl. Header) und optional `datenpunktId`. Einzelne Record-Properties (`rico:title` etc.) bekommen keinen eigenen Eintrag — ihre Quelle ist die des umgebenden Records. Ergänzt die semantische Provenance (`agrelon:hasProvenance`) und ermöglicht direkte Rücknavigation XLSX-Zelle → JSON-LD → UI-Chip. Pipeline-Implementation in [transform.py](../scripts/transform.py) `convert_objekt` + `process_verknuepfungen` + `add_relations_to_records`. Kontrakt in [datenmodell.md § 9](datenmodell.md). |
| E-74 | Low-Confidence-Policy: Reconcile-Matches mit `match = "fuzzy_low"` (Score 80–89) werden **nicht automatisch** ins Enrichment oder in die JSON-LD übernommen. Filter in `enrich-wikidata.py` + `transform.py` lässt nur `exact`, `fuzzy_high` und explizit als `manual_review: "approved"` freigegebene Einträge durch. Der Quality-Snapshot listet die low-conf-Einträge zur redaktionellen Freigabe. Begründung: Fehl-Matches wie „Schottland" → „Scotland" (Score 89) würden sonst ungeprüft Wikidata-Properties in die Personenindex-Subtitles kippen. Konservative Policy hebt die WD-Coverage langsamer, schützt aber Datenintegrität. |
| E-75 | Interface-Redesign als Forschungswerkzeug, nicht Dashboard (Session 32). Die sechs D3-Prototypen (Mobilität, Matrix, Kosmos, Zeitfluss, Lebenspartitur, Lebensstationen) werden entfernt, ihre Lektionen in [frontend.md § Lektionen](frontend.md) konserviert. Neue Tab-Architektur: Dossier, Biogramm, Mobilitäts-Atlas, Netzwerk, Repertoire — Perspektiven auf denselben Graph, kein Feature-Wechsel. (Der ursprünglich mitgeplante Erschließungsstand-Tab wurde in Session 33 wieder entfernt, weil der Markdown-Report `data/reports/quality-snapshot.md` die Team-Qualitätssicht ausreichend trägt.) Designregeln und Muster ([interface-konzept.md](interface-konzept.md)) binden: Source-Serif-Titel + Mono-Signatur + warmer Papier-Hintergrund, Rolle-Prefix-Chips als universelles Daten-Atom (Einzelbeleg + Aggregat-Breakdown mit gleicher Primitive), Confidence als Micro-Dot, Provenance-Pille pro Datenpunkt, Selection per Kontur, Tabelle-vor-Chart für Rankings, Datenqualität wird gezeigt (nicht gemergt), minimalistische Interaktions-UI statt Toolbar-Chrome. Tab-Namen inhaltlich ohne „View"/„Chart"-Floskeln. Begründung: Die sechs Prototypen waren je für sich brauchbar, aber uneinheitlich in Designsprache, überladen in Interaktion und schlecht gekoppelt an die Phase-6-Store-Maps. Ein einheitliches, daten-getreueres Interface ist für die FWF-Bewerbung und für die Erschließungsarbeit wertvoller als sechs weiterentwickelte Einzel-Viz. |

## Offene Entscheidungen

| Thema | Prioritaet | Status |
|---|---|---|
| Matrix Zeitfilter UI | hoch | Slider, Dropdown, oder Timeline-Brush |
| ~~Wikidata in Kosmos-View~~ | ~~mittel~~ | erledigt: UA-Distanz-Annotation + Tooltip (E-60) |

## Technische Schulden

- Kein JSON-LD/GEXF-Export aus Archiv-View (offen)
- Alle Iteration-1-Schulden behoben (monolithische Dateien, synthetische Daten, Inline-CSS)
- `aggregator.js` dupliziert Pipeline-Logik (pre-built JSONs nutzen 5-Jahres-Perioden statt Lebensphasen → Pipeline-Update noetig)
- Legend-Builder nicht konsolidiert (bewusst: zu heterogene Patterns, Abstraktion lohnt nicht)

## Verschobene Features

| Prioritaet | Feature | Status |
|---|---|---|
| Hoch | Export CSV/JSON-LD/GEXF | CSV/BibTeX erledigt (Session 20), JSON-LD/GEXF offen |
| Mittel | Matrix Zeitfilter/Zoom | offen |
| ~~Mittel~~ | ~~Cross-Visualization Linking~~ | erledigt (Session 20): Matrix ↔ Kosmos ↔ Indizes |
| ~~Mittel~~ | ~~Merkliste + CSV-Export~~ | erledigt (Session 20): Wissenskorb + CSV/BibTeX |
| Niedrig | Leaflet Karte | offen |

## Prozesswissen

### Was funktioniert hat

- Promptotyping-Dokumente als Source of Truth → Code-Generierung
- Synthetische Daten entkoppeln Frontend- von Datenarbeit
- Design-System als CSS Custom Properties vorab definiert
- Offline-first ueberlebt Funding-Gaps
- Iterative Vis-Entwicklung (Partitur → Patterns fuer Matrix/Kosmos)

### Iteration-2-Erkenntnisse

- Data-first statt UI-first
- Modularisierung von Anfang an
- User Testing frueher
- Evaluation-driven Priorisierung (schwach abgedeckte Forschungsfragen früh benennen)
- Controlled Vocabulary Enforcement bei Datenerfassung

### Positive Ueberraschungen aus Datenanalyse

- Erschliessungstiefe bei den feinerschlossenen Konvoluten (NIM_003/004/005/006/007) uebertrifft Erwartungen
- Gender-inklusives Rollen-Vokabular mit substanziellem `:in`-Anteil
- Hoher Personen-Kategorien-Abdeckungsgrad — Matrix bekommt direkt Daten
- Werk-Verknuepfungen ermoeglichen substantiellen Rollen-Kosmos
