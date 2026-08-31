# Umbauplan: drei Typ-Ansichten auf einem geteilten Facettenschnitt

Erstellt 2026-08-31 gegen den Stand `d75f23d` (main). Repo read-only gelesen, nichts geändert.
Alle Zeilennummern beziehen sich auf diesen Stand. Node-Testlauf zur Baseline: `node --test tests/frontend/*.test.mjs` ergibt 234 Tests, 0 Fehler.

Während der Analyse hat eine parallele Instanz im selben Arbeitsverzeichnis geschrieben (`knowledge/journal.md`, `knowledge/data-errors.md`, `tests/frontend/loader.test.mjs`, `tests/frontend/network-geometry.test.mjs`, neu `tests/frontend/_shipped.mjs`, `tests/frontend/event-year-count.test.mjs`, `data/reports/bayreuth-1953-source-analysis.md`). Zwei Folgen für diesen Plan stehen in § 13.

## 1. Befunde

### 1.1 Belegt aus dem Code

| Befund | Beleg |
|---|---|
| Fünf getrennte Facettenauflösungen, keine gemeinsame Funktion | `docs/js/views/_archive-filter.js:48` (Bestand, Chronik), `docs/js/views/_verknuepfungen-geometry.js:112` (eigener Ort- und Zeitschnitt in `buildGraph`), `docs/js/views/statistics-data.js:95` (`filterStore`), `docs/js/views/mobility.js:114` (`inEntity`/`inWindow`), `docs/js/views/network.js:405` (`passesFilter`) |
| Branch `facet-multiselect` trägt nur den Zustandshalter | `git diff main...facet-multiselect` = 2 Dateien, +188/−11: `docs/js/ui/filter-state.js` plus die neue `tests/frontend/multi-facet.test.mjs`. Kein Consumer umgestellt. |
| Der Branch-Test schlägt gegen den heutigen Code an drei Stellen fehl | `sharedToToolbarState({ort:'Graz'})` liefert `'Graz'` statt `['Graz']` (`filter-sync.js:24`), dasselbe rückwärts (`filter-sync.js:40`), und `filterByToolbarState` ruft `store.persons.get(['A','B'])` (`_archive-filter.js:64`), was `undefined` ergibt und die Facette wirkungslos macht |
| Der Branch bricht zusätzlich drei bestehende Testblöcke, die E-151 nicht nennt | `tests/frontend/verknuepfungen-geometry.test.mjs:198-235` (`f.ort === ''`, `getFilter().ort === 'Bayreuth'`, `last.person === 'Wagner, Wieland'`) und `tests/frontend/filter-sync.test.mjs:25-36` sowie `:195,197` |
| Das Netzwerk rechnet die Ko-Okkurrenz über den ungefilterten Store | `network.js:332` und `network.js:201`, beide `computeCoOccurrence(_store.persons.entries(), …)`; die Filter wirken erst in `applyFilters()` (`network.js:349-402`) über CSS-Klassen |
| Ring 3 wird hart verworfen | `_network-geometry.js:226`, `if (ring === 3) continue;` innerhalb `computeLayout` |
| `rolle` und `sicht` liest keine Ansicht | Deklariert in `filter-state.js:26,28`; `sichtToActiveSet`/`activeSetToSicht` (`filter-sync.js:141,154`) werden nur vom Test importiert, von keinem View-Modul |
| Die Karte führt eine eigene Entitätsauswahl | `mobility.js:128-137` (Sidebar-Sektion), `mobility.js:292-350` (`buildEntityPicker`, `refreshEntityPicker`); der geteilte Filter kommt nur über `zeitfenster` und `ort` an (`mobility.js:104-111`), die Sicht wird ausdrücklich ignoriert |
| Ensemble ist mit Institution verschmolzen | `loader.js:453`, `rico:CorporateBody` und `rico:Group` gehen in denselben `store.organizations`-Index |
| Ereignis hat keinen Index | `store` (`loader.js`, Initialisierung) führt `annotations`, `recordToAnnotations`, `mobilityEvents`, `recordToEvents`, aber keinen Index Rolle zu Records |
| Kein Filterzustand in der URL | `router.js:112-129`, die Hash-Grammatik ist `#<tab>[/<recordId>]`; `main.js` liest keinen Filter beim Start |
| `buildGraph` ist dem Ziel am nächsten | `_verknuepfungen-geometry.js:124-149` schneidet Fokusmenge, Ort, Zeitfenster und Schärfegrad in derselben Funktion und weist die Differenz aus (`stats.recordsWeit`, `stats.recordsEng`) |
| `filterStore` ist das Muster Sub-Store aus Schnitt | `statistics-data.js:95-160`, drei Schritte Jahresschnitt, Sub-Store, Event-Facetten; leeres Set heißt nichts, `null` heißt alles |
| Ein lexikalisches Gate existiert bereits als Vorbild | `tests/frontend/shared-filter-reach.test.mjs`, wer `title: 'Zeitraum'` baut, muss `subscribe` und `setFilter` verwenden |

### 1.2 Datendeckung, gemessen an `docs/data/m3gim.jsonld`

Gescoutet vor dem Entwurf, weil eine Facette ohne Deckung ein toter Regler ist.

- Knoten: 895 `rico:Record`, 724 `Performance`, 385 `Annotation`, 190 `StageRole`, 77 `skos:Concept`, 18 `RecordSet`.
- Annotationen: 385 gesamt, davon 342 mit Datum und 125 mit Ort. 27 distinkte Rollen, Kopf `performance` 103, `mentioned` 79, `publicationDate` 34, `guestPerformance` 22, `dispatch` 21.
- Akteursrollen an Personen und Körperschaften: Kopf `singer` 423, `composer` 110, `mentioned` 107, `conductor` 76, `author` 65, `performer` 46.
- Agententypen: 984 `rico:Person`, 236 `rico:CorporateBody`, 15 `rico:Group`. Die 15 Group-Belege verteilen sich auf 9 Namen, darunter vier Schreibvarianten des Bayreuther Klangkörpers.
- Werke als Subjekt: 271 Belege auf 142 distinkte Werke, Kopf `Tristan und Isolde` mit 43.
- Finanzen: 57 Belege mit `monetaryAmount`, sieben Währungen (DM 25, S 12, Lire 8, Esc 4, Fr 3, Belgische Francs 3, RM 2). `m3gim-ontology:detailRole` ist in allen 57 leer, die Rolle steht unter `role` und lautet durchgängig `m3gim-vocab:mentioned`.
- Datierungsebenen am Vokabular: 16 Begriffe tragen `attestedDating`, 7 `objectDating`, je einer `framingDating` und `mentionedDating`.
- Attestierte Datierungen im Bestand: 57 Records tragen mindestens eine, 51 davon zusätzlich ein `rico:date`, 6 ausschließlich. Bei 12 der 51 weicht das attestierte Jahr vom Dokumentjahr ab, bei 39 nicht. Attestierte Jahre liegen zwischen 1947 und 1968, Spitze 1953 mit 59 Datierungen.
- Personen roh (vor `normalizePerson`): 472, davon 316 in genau einem Record und 156 in zwei oder mehr. AgRelOn: 45 Relationen auf 10 distinkte Partner.
- Der Beispielschnitt trägt. Datum 1954 und Ort Bayreuth und Werk Tristan liefert 5 Records (`UAKUG/NIM_011 3`, `… 5`, `… 6`, `UAKUG/NIM_142 22_4`, `… 27`) mit rund 15 distinkten Mitwirkenden. Ohne Jahresfacette sind es 18 Records.

### 1.3 Einschätzungen

- Die Facetten Person, Ort, Werk, Datum und Ereignis tragen. Rolle trägt ebenfalls, hat aber eine lange Liste ohne natürliche Gruppierung; ohne die Cluster aus `ROLE_CLUSTER` wird der Regler unbedienbar.
- Ensemble ist mit 15 Belegen und Schreibvarianten die dünnste der neun gewünschten Achsen. Als eigene Facette liefert sie fast immer eine leere oder einelementige Auswahl.
- Finanzen taugt heute als Ja-Nein-Achse plus Währung. Eine Rollenaufschlüsselung wäre erfunden.
- Der neue Zeitstrahl der belegten Ereignisjahre trägt weniger Records als die heutige Chronik. Sein Gewinn liegt in den 12 divergierenden Fällen und darin, dass die Bezugsebene explizit wird. Er muss beide Ebenen zeigen, sonst wirkt er als Rückschritt.
- Ring 3 einzuschalten verdreifacht die Knotenzahl grob (316 Einmal-Personen gegen 156 Mehrfach-Personen, vor dem Abzug reiner Komponisten und vor der Hochstufung über `kategorie`). Die Frage ist gestalterisch zu entscheiden; technisch steht der Schalter nach dem Umbau ohnehin bereit.

## 2. Reihenfolge und Abhängigkeiten

```
S1 Listenform ──> S2 recordsFor ──> S3 Facetten-Indizes
      │                 │                  │
      └──> S4 URL-Hash  ├──────────────────┴──> S5 Zeitstrahl
                        ├──> S6 Karte
                        └──> S7 Netzwerk
                                  └──> S8 gemeinsame Facettenleiste (optional)
```

S1 blockiert alles, weil eine Ansicht, die weiter einen String liest, kommentarlos einen anderen Ausschnitt zeigt (E-151). S2 ist die Voraussetzung für S5 bis S7. S3 erweitert S2 um die vier heute unbelegten Achsen und kann parallel zu S4 laufen. S5, S6 und S7 sind untereinander unabhängig und folgen der Vorgabe der Projektleitung in dieser Reihenfolge.

## 3. Schritt 1: Listenform durch jede lesende Stelle ziehen

**Ziel.** Mehrfachauswahl je Facette wirkt als ODER innerhalb und UND zwischen den Facetten, und keine Ansicht liest mehr einen String.

**Betroffene Dateien.**

- `docs/js/ui/filter-state.js` komplett, Branch-Stand übernehmen (`LIST_FACETS`, `toList`, `facetValues`, listbewusstes `getFilter`/`setFilter`/`resetFilter`/`isFilterActive`).
- `docs/js/ui/filter-sync.js:24-47`, beide Projektionen auf Listen.
- `docs/js/views/_archive-filter.js:15-18` und `:48-75`, Vereinigung je Entitätsfacette.
- `docs/js/views/_toolbar.js:38-44` (State-Initialisierung), `:47` (`isAnyActive`), `:88-96` (`resetAll`), `:106-113` (`setFacet`), `:229-350` (`buildEntityCombobox` auf entfernbare Chips).
- `docs/js/views/_archive-toolbar.js:68-84`, API um `addFacet`/`removeFacet` ergänzen, `applyFacet` reicht Listen durch.
- Lesende Stellen: `archive-holdings.js:48,54,68-72`, `archive-timeline.js:56,60,79-82`, `network.js:129-133` und `:418-421` (`sharedPerson` wird `sharedPersons`), `mobility.js:104-111` (`selectedCity` wird `selectedCities`), `verknuepfungen.js:132` und `:201-209`.

**Neue und geänderte Signaturen.**

```js
// filter-state.js (vom Branch)
export function facetValues(filterState, key): string[]

// filter-sync.js
export function sharedToToolbarState(shared): {person: string[], location: string[], werk: string[]}
export function toolbarStateToShared(toolbarState): {person: string[], ort: string[], werk: string[]}

// _archive-filter.js, neu und nicht exportiert
function unionRecords(entityMap, values): Set<string>|null   // null = Facette inaktiv

// _toolbar.js
setFacet(key, value)          // value: string | string[], ersetzt die Auswahl
addFacet(key, value)          // hängt einen Wert an
removeFacet(key, value)       // entfernt einen Wert
```

**Wiederverwendet.** `buildToolbar` bleibt der einzige Toolbar-Bauer; die Chip-Optik gibt es bereits zweimal, als `.idx-facet-chip` (`indexes.js:249-256`) und als `.vs-chip` (`sidebar.js:69-90`). Eine der beiden wird zur geteilten Primitive, keine dritte.

**Tests vorher.**

- `tests/frontend/multi-facet.test.mjs` unverändert vom Branch übernehmen. Sie deckt bereits Zustandshalter, beide Projektionen, ODER innerhalb, UND zwischen, unbekannten Einzelwert und ausschließlich unbekannte Werte ab.
- Ergänzen in derselben Datei: `facetValues(null, 'ort')` liefert `[]`; `isToolbarFiltered({person: []})` ist falsch.
- Anzupassen, nicht neu: `tests/frontend/verknuepfungen-geometry.test.mjs:198-235` und `tests/frontend/filter-sync.test.mjs:25-36,186-197` auf die Listenform. Diese Anpassung gehört in denselben Commit, sonst ist die Suite zwischendurch rot.

**Bewusst nicht angefasst.** `zeitfenster` und `schaerfe` bleiben skalar, das eine ist ein Fenster, das andere ein Modus. `docType` bleibt ein view-lokaler Einzelwert, weil `expandDftFilter` (`format.js:237`) die Hierarchie bereits als ODER auflöst. Der Bestand-Toggle `zeigeUnerschlossen` (E-116) bleibt view-lokal.

## 4. Schritt 2: `recordsFor` als einzige Auflösung

**Ziel.** Aus Store und Filter entsteht genau eine Record-Menge, an der jede Ansicht schneidet.

**Neue Datei.** `docs/js/data/records-for.js`, rein, ohne DOM und ohne d3, nach dem Vorbild von `statistics-data.js` und `_network-geometry.js`.

```js
/**
 * @param {Object} store
 * @param {Object} filter                 getFilter()-Ergebnis
 * @param {{base?: Set<string>}} [opts]   Startmenge, Default alle Records
 * @returns {{ids: Set<string>, weit: number, eng: number,
 *            undatiert: number, byFacet: Object<string, number>}}
 */
export function recordsFor(store, filter, opts = {})

/** Wertindex einer Facette. key ∈ ort|person|werk|institution|ensemble|rolle|ereignis|sicht|finanzen
 *  @returns {Map<string, Set<string>>} Wert -> Record-@ids */
export function facetIndex(store, key)

/** Wählbare Werte einer Facette mit Belegzahl, absteigend.
 *  @returns {Array<{value: string, label: string, count: number}>} */
export function facetInventory(store, key)
```

**Aufbau von `recordsFor`.**

1. Startmenge aus `opts.base` oder `store.allRecords`.
2. Je Entitätsfacette Vereinigung der Wertmengen über `facetIndex`, danach Schnitt zwischen den Facetten. Ein Wert ohne Entsprechung betrifft nur sich selbst.
3. `zeitfenster` über `primaryYear(store, record)` (`loader.js:401`); undatierte Records bleiben sichtbar, wie `applyZeitfenster` (`filter-sync.js:103`) es hält (E-88).
4. `schaerfe === 'eng'` schneidet auf `engRecordSet(store)` (`filter-sync.js:57`).
5. `weit`, `eng` und `undatiert` werden mitgezählt, damit jede Ansicht die Differenz nennen kann, ohne sie selbst zu rechnen.

**Wiederverwendet.** `primaryYear` und `datingsByScope` (`loader.js:387,401`), `engRecordSet` (`filter-sync.js:57`), `mobilityClusterFor` (`constants.js:420`), `cityOf` und `expandDftFilter` (`format.js:85,237`), `resolveRecords` (`format.js:147`) für den Rückweg von Ids auf Records.

**Migrationspfad der fünf Auflösungen.**

- `_archive-filter.js:48` wird zur dünnen Hülle, in der Suche und `docType` bleiben, während die drei Entitätsfacetten aus `recordsFor` kommen.
- `statistics-data.js:95-160` ersetzt Schritt 1 (die eigene Jahresschleife, `:96-125`) durch `recordsFor`; die Sub-Store-Ableitung `:125-140` und die Event-Facetten `:145-160` bleiben unverändert.
- `_verknuepfungen-geometry.js:124-149` nimmt die Menge über `opts.records` entgegen statt sie zu bauen; `stats.recordsWeit`/`recordsEng` kommen aus dem Rückgabewert.
- `mobility.js:114-118` und `network.js:405-425` siehe Schritt 6 und 7.

**Tests vorher.** `tests/frontend/records-for.test.mjs`, Node-Unit ohne DOM, mit einem Miniatur-Store nach dem Vorbild von `multi-facet.test.mjs`:

- eine Facette schneidet; zwei Facetten wirken als UND; zwei Werte einer Facette als ODER,
- ein unbekannter Wert entwertet die Facette nicht, ausschließlich unbekannte Werte liefern die leere Menge,
- `zeitfenster` lässt undatierte Records durch, `schaerfe: 'eng'` entfernt die nicht belegten,
- `facetInventory` liefert absteigend sortierte Werte mit Belegzahl größer null,
- ein Fixture-Test über `storeFromShipped()` aus `tests/frontend/_shipped.mjs`: der Schnitt 1954 und Bayreuth und Tristan liefert mindestens 5 Records, und die Mitwirkendenmenge enthält `Malaniuk, Ira` sowie `Wagner, Wieland`.

Dazu ein lexikalisches Gate in derselben Datei, nach dem Muster von `shared-filter-reach.test.mjs`: kein Modul unter `docs/js/views/` löst eine Entitätsfacette selbst über `store.persons.get(`, `store.locations.get(` oder `store.works.get(` auf. Das ist der Schutz gegen die Rückkehr der fünf Auflösungen; die drei heutigen Vorkommen in `_archive-filter.js:64,68,72` verschwinden mit diesem Schritt.

**Bewusst nicht angefasst.** `store.byYear` (`loader.js:420`) bleibt als Loader-Index bestehen. Die Aggregatfunktionen in `statistics-data.js` bleiben unverändert, sie laufen weiter auf einem Sub-Store und kennen den Filter nicht. `coverage.js` behält seine Formulierung.

## 5. Schritt 3: Die vier fehlenden Achsen im Store verankern

**Ziel.** Ereignis, Rolle, Sicht und Ensemble bekommen einen Index, damit `facetIndex` sie bedienen kann.

**Betroffene Dateien.**

- `docs/js/data/loader.js:453`, `rico:Group` bekommt zusätzlich einen eigenen Index `store.ensembles` und bleibt in `store.organizations`, damit Karte, Verknüpfungen und Indizes unverändert weiterlaufen.
- `docs/js/data/loader.js`, Store-Initialisierung: drei neue Maps.

```js
/** @type {Map<string, Set<string>>} Annotationsrolle (roleId) -> Record-@ids */
eventsByRole: new Map(),
/** @type {Map<string, Set<string>>} Akteursrolle (roleId) -> Record-@ids */
recordsByAgentRole: new Map(),
/** @type {Map<string, {records: Set<string>, wikidata: ?string}>} */
ensembles: new Map(),
```

`eventsByRole` wird in `indexRecordAnnotations` (`loader.js:713-730`) gefüllt, `recordsByAgentRole` in `indexAgents` (`loader.js:441-500`) am bestehenden `registerRole`-Aufruf. Die Sicht-Achse braucht keinen eigenen Index, sie leitet sich in `facetIndex(store, 'sicht')` aus `entry.cluster` der verorteten Annotationen ab, wie `sichtForRecord` (`chronik-data.js:18`) es tut.

**Tests vorher.** `tests/frontend/facet-inventory.test.mjs` über `storeFromShipped()` (`tests/frontend/_shipped.mjs`), mit Mindestvorkommen statt Nulltoleranz (TDD-Regel aus `CLAUDE.md`):

- `facetInventory(store, 'ereignis')` enthält mindestens 15 Rollen, darunter `m3gim-vocab:performance` mit mindestens 90 Belegen,
- `facetInventory(store, 'rolle')` enthält mindestens 20 Rollen, darunter `m3gim-vocab:singer` mit mindestens 400 Belegen,
- `facetInventory(store, 'sicht')` enthält alle fünf Sichten aus `SICHTEN` plus den Kontext-Eimer,
- `facetInventory(store, 'ensemble')` ist nicht leer und trägt weniger als 20 Werte; der Test hält die dünne Deckung ausdrücklich fest, damit sie beim nächsten Datenstand auffällt,
- `facetInventory(store, 'finanzen')` liefert die sieben Währungen und keine Rollenachse.
- Jede Rolle, die im Datensatz vorkommt, trägt ein Anzeigelabel aus `store.roleVocab`; ohne Label darf sie nicht in das Inventar (Anschluss an E-143).

**Bewusst nicht angefasst.** Das Vokabular (`vocab/m3gim.ttl`) und die Pipeline. Alle vier Achsen sind aus dem ausgelieferten Datensatz ableitbar, es braucht keinen neuen Term und keinen neuen Serialisierungsschritt.

## 6. Schritt 4: Filterzustand im URL-Hash

**Ziel.** Ein Schnitt ist teilbar und überlebt den Reload.

**Betroffene Dateien.**

- `docs/js/ui/router.js:112-129`, Hash-Grammatik `#<tab>[/<recordId>][?<query>]`. Der Query-Teil wird in `parseHash` abgetrennt, bevor nach `/` gesplittet wird; `updateHash` hängt ihn wieder an.
- Neu `docs/js/ui/filter-url.js`, rein.
- `docs/js/main.js`, einmalig beim Start den Filter aus dem Hash setzen und danach `subscribe` an `updateHash` hängen.

```js
/** @returns {string} Query ohne führendes '?', leer bei leerem Filter */
export function serializeFilter(filter): string
/** @returns {Object} Patch für setFilter; unbekannte Schlüssel fallen weg */
export function parseFilterQuery(query): object
```

Die Kodierung lautet `ort=Bayreuth,Wien&person=Malaniuk%2C%20Ira&jahr=1951-1953&schaerfe=eng`. Komma trennt die Werte einer Facette; ein Komma im Wert wird prozentkodiert, was bei der Namensform `Nachname, Vorname` der Regelfall ist.

**Tests vorher.** `tests/frontend/filter-url.test.mjs`:

- Rundlauf `serializeFilter` und `parseFilterQuery` für jede Facette, einzeln und kombiniert,
- ein Name mit Komma überlebt beide Richtungen unverändert,
- ein unbekannter Schlüssel wird ignoriert und wirft nicht,
- ein leerer Filter erzeugt keinen Query-Teil,
- ein Fenster über die volle Spanne erscheint nicht in der URL (dieselbe Faltung wie `yearRangeToZeitfenster`, `filter-sync.js:182`).

Ergänzung in `tests/frontend/router.test.mjs`: ein Hash mit Query liefert weiterhin die Record-Id, und `resolveRecordId` bleibt unberührt.

Smoke-Canary `filter:url-roundtrip` in `tests/frontend/smoke.py`, nach dem Muster von `m4:cross-view-filter` (`:290-315`): Ort setzen, Hash prüfen, `page.reload()`, Ansicht ist weiterhin gefiltert.

**Bewusst nicht angefasst.** Kein `pushState`, weil jeder Sliderschritt sonst einen History-Eintrag erzeugt; `replaceState` wie heute. Kein `localStorage`, der Wissenskorb bleibt die einzige persistierte Nutzerzustandsspur.

## 7. Schritt 5: Zeitstrahl der belegten Ereignisjahre

**Ziel.** Die Achse zeigt, wann etwas stattfand, und nennt daneben, wann das Dokument datiert.

**Betroffene Dateien.**

- `docs/js/data/loader.js`, neu neben `primaryYear` (`:401`):

```js
/**
 * Die attestierten Datierungen eines Records, Rang-sortiert. Leere Liste,
 * wenn keine Bezugsebene `attestedDating` vorliegt.
 * @returns {Annotation[]}
 */
export function attestedDatings(store, record)

/**
 * Das ranghöchste belegte Ereignisjahr und seine Herkunft, null wenn keines.
 * @returns {Anchor}
 */
export function attestedYear(store, record)
```

Beide bauen auf `datingsByScope(store, record, DATING_SCOPE.attested)` (`loader.js:387`, `constants.js:574`). Es entsteht keine zweite Jahresheuristik, die Auswahl kommt aus dem Vokabular (E-150).

- `docs/js/views/chronik-data.js`, neu:

```js
/**
 * @param {'attested'|'object'} ebene
 * @returns {Array<{record, year: ?number, ebene, roleLabel: ?string,
 *                  zweitJahr: ?number, zweitLabel: ?string}>}
 */
export function timelineEntries(store, records, { ebene })
```

- `docs/js/views/archive-timeline.js:126-132` (Annotation je Record), `:162` (Dekadenaggregat), `:200-215` (Deckungs-Caption), `:419-424` (Sekundär-Badge). Der Badge-Text `≈ <Rolle>` wird zur Kennzeichnung der Zweitangabe umgewidmet.

**Gestaltung.** Der Achsenkopf bekommt eine Ebenen-Umschaltung. In der Ebene `attested` trägt der Chip das Ereignisjahr als Vollton und das Dokumentjahr als gekennzeichnete Zweitangabe; in der Ebene `object` bleibt es wie heute. Die Deckungs-Caption nennt die Differenz ungeglättet, etwa in der Form „N von M Dokumenten tragen ein belegtes Ereignisjahr, bei K weicht es vom Dokumentjahr ab". Die Zahlen kommen aus den Daten, kein redaktioneller Kommentar.

**Log-Stempel.** Heute `records, jahre-belegt, datiert, sekundaer, undatiert, sicht-gedeckt, spanne, gefiltert` (`archive-timeline.js:188-197`). Neu ergänzt um `ebene`, `attestiert` und `nur-dokument`. Die Erwartung in `tests/frontend/smoke.py:148` (`records, jahre-belegt, datiert, undatiert, sicht-gedeckt, spanne`) ist im selben Commit mitzuziehen; `datiert` bleibt bestehen und meint weiterhin die Menge mit Jahr in der aktiven Ebene.

**Tests vorher.**

- Erweiterung von `tests/frontend/datings.test.mjs`, weil die Fixtures dort bereits stehen: `attestedDatings` liefert nur `attestedDating` und nie `mentioned`, `framing` oder `unfulfilled`; ein Record mit Dokument- und Ereignisdatum liefert beide getrennt; ohne attestierte Datierung ist die Liste leer und `attestedYear` null.
- Neu `tests/frontend/timeline-level.test.mjs`: `timelineEntries` mit `ebene: 'attested'` liefert für einen Record mit beiden Datierungen `year` aus der attestierten und `zweitJahr` aus `rico:date`; die Umschaltung auf `object` dreht das um. Fixture-Strecke über `storeFromShipped()` mit Mindestvorkommen: mindestens 50 Records mit attestierter Datierung, mindestens 10 mit abweichendem Jahr.
- Smoke-Canary `chronik:ebene`: Umschalten ändert die Zahl der belegten Jahre im Stempel.

**Bewusst nicht angefasst.** `primaryYear` bleibt unverändert der eine Zeitanker (E-141), sonst kippen Bestand, Statistik, Karte und der geteilte Zeitfilter mit. Die Sicht-Akzente (`:395-406`), der Dekaden-Header (`:219-291`), die Auflösung vom Segment auf die belegenden Chips (`:274-291`) und der Undatiert-Block (`:323-362`) bleiben. `store.byYear` bleibt.

## 8. Schritt 6: Ortskarte ortszentriert

**Ziel.** Die Karte ist eine Facettenansicht auf Orte und rechnet auf derselben Menge wie die übrigen Ansichten.

**Betroffene Dateien.**

- `docs/js/views/mobility.js:104-118`, `pullSharedIntoState`, `inEntity` und `inWindow` entfallen zugunsten von `recordsFor`; die Karte gruppiert nur noch.
- `docs/js/views/mobility.js:128-137`, die Sidebar-Sektion „Entität" wird durch die geteilten Facetten ersetzt; `buildEntityPicker` und `refreshEntityPicker` (`:292-350`) entfallen oder werden zu Schreibern auf die Facetten `person` und `institution` (siehe Operatorentscheidung).
- `docs/js/views/entity-map-data.js:100`, Signatur wird `buildOccurrences(store, recordIds)`; ohne zweites Argument bleibt das heutige Verhalten.
- `docs/js/views/mobility.js:236-250`, die eingeklappte Liste der nicht verortbaren Orte wird zur dauerhaft sichtbaren Liste neben der Karte.

**Neue reine Funktion.** Die Gruppierung liegt heute im d3-Pfad und ist damit nicht ohne Browser prüfbar.

```js
// entity-map-data.js
/**
 * Belege zu Stadt-Knoten verdichten. Rein, ohne d3.
 * @returns {Array<{city, lat: ?number, lon: ?number, total: number,
 *                  bySicht: Object<string, number>, placement, records: Set<string>}>}
 */
export function placeNodes(occurrences)
```

**Wiederverwendet.** `assignPlacement` (`entity-map-data.js:81`) bleibt unverändert, ebenso `cityOf`, `SICHT_COLOR`, `coverageNote` und die Verortungslegende.

**Log-Stempel.** Heute `entitaeten, orte, belege, unverortet, jahre` (`mobility.js:279-285`). Neu `orte, belege, unverortet, ohne-koordinate-sichtbar, facetten, jahre`; `entitaeten` fällt weg, sobald die Auswahlliste geht. `tests/frontend/smoke.py:152` und der Canary `karte:render` (`:260-270`, prüft `mob-entity__item:has-text("Bayreuther Festspiele")`) sind mitzuziehen.

**Tests vorher.**

- `tests/frontend/entity-map-data.test.mjs`: `buildOccurrences(store, ids)` liefert ausschließlich Belege der übergebenen Records; ohne zweites Argument bleibt das Ergebnis identisch zum heutigen (Regressionsanker); `placeNodes` fasst Adressbelege derselben Stadt zusammen und erhält die Verortungsstufe des schwächsten Belegs.
- Fixture-Strecke gegen den erzeugten Datensatz: Ort Bayreuth und Jahr 1954 liefert mindestens einen Knoten mit Koordinate; die Liste ohne Koordinate ist nicht leer, weil sie sonst stillschweigend verschwände.
- Smoke-Canary `karte:facetten`: Ort in der Chronik gesetzt, die Karte hebt genau diesen Knoten hervor und der Stempel nennt `facetten:1`.

**Bewusst nicht angefasst.** Projektion und `fitExtent`, die lokale Ländergeometrie, das Gradnetz, die Tortendiagramm-Knoten, `non-scaling-stroke`, die vier Verortungsstufen und ihre Legende, Zoom und Pan.

## 9. Schritt 7: Personennetzwerk auf dem Schnitt

**Ziel.** Ko-Okkurrenz rechnet auf der gefilterten Menge, Einmal-Nennungen sind erreichbar.

**Betroffene Dateien.**

- `docs/js/views/_network-geometry.js`, neu:

```js
/**
 * Personeneinträge, auf eine Record-Menge beschnitten. Das records-Set jedes
 * Eintrags enthält nur noch Ids aus recordIds; Einträge ohne Rest fallen weg.
 * @returns {Array<[string, object]>}
 */
export function personsInRecords(store, recordIds)
```

- `docs/js/views/_network-geometry.js:210-280`, `computeLayout(persons, {cx, cy, radii, includeRing3 = false})`; die harte Verwerfung `:226` wird zur Option, `radii` nimmt einen dritten Wert entgegen.
- `docs/js/views/network.js:319-335` (`layoutFor`), `:201-206` (`onMinSharedChanged`), beide bekommen `personsInRecords(_store, _recordIds)` statt `_store.persons.entries()`.
- `docs/js/views/_network-sidebar.js`, Schalter „Einmal-Nennungen zeigen"; `sharedPerson` wird `sharedPersons` (Liste).
- `docs/js/views/network.js:405-425` (`passesFilter`) behält die view-lokalen Achsen Suche, Kategorie, Mindestdokumente und die beiden Linien-Toggles.

**Konflikt, der zu lösen ist.** E-93 hält fest, dass Filter nur die Opazität ändern und die Positionen stehen bleiben, damit der Verdichtungs-Flow keinen Layout-Sprung hat. Ein Neuaufbau auf der geschnittenen Menge bricht das. Der Vorschlag trennt beides: die Positionen werden einmal je Render auf der ungefilterten Personenmenge berechnet und bleiben stabil, die Ko-Okkurrenz rechnet auf der geschnittenen Menge. Dann wandert kein Knoten, und die Kanten sagen die Wahrheit über den Schnitt. Technisch heißt das, `computeLayout` bekommt weiterhin `_store.persons.entries()`, `computeCoOccurrence` dagegen `personsInRecords(...)`.

**Log-Stempel.** Heute `total, ring1, ring2, agrelon` (`network.js:559-564`). Neu ergänzt um `ring3`, `koocc` und `records`. `tests/frontend/smoke.py:153` ist mitzuziehen.

**Tests vorher.** Erweiterung von `tests/frontend/network-geometry.test.mjs`:

- `personsInRecords` beschneidet die `records`-Sets und entfernt Einträge ohne Rest,
- `computeCoOccurrence` auf einer beschnittenen Menge liefert echt weniger Paare als auf der vollen, und keine Kante nennt einen Record außerhalb des Schnitts,
- `computeLayout({includeRing3: true})` legt Ring 3 an und lässt die x- und y-Werte der Ring-1- und Ring-2-Knoten unverändert (Determinismus-Anker),
- `classifyRing` bleibt unverändert (Regressionsanker gegen ein Verrutschen der Schwellen).

Smoke-Canary `netzwerk:schnitt`: Ort gesetzt, `[netzwerk] koocc` sinkt, `total` bleibt gleich (weil die Positionen stabil bleiben).

**Bewusst nicht angefasst.** `derivePersonKategorie`, `RING_THRESHOLDS`, `nodeColor`, die Unterscheidung der beiden Linientypen samt `<title>`-Tooltips, das Detail-Panel (`network.js:430-550`), Zoom und Pan, `_network-canvas.js` insgesamt.

## 10. Schritt 8: Gemeinsame Facettenleiste (optional)

**Ziel.** Die neun Achsen stehen an einer Stelle statt in drei Sidebars.

Neu `docs/js/ui/facet-bar.js` mit `buildFacetBar(store, {facets, onChange}): {element, update}`, gebaut auf der Chip-Combobox aus Schritt 1 und auf `facetInventory` aus Schritt 2. Die view-eigenen Regler (Schärfegrad, Ebene des Zeitstrahls, Linien-Toggles des Netzwerks) bleiben in der jeweiligen Sidebar.

Dieser Schritt ist verzichtbar. Solange jede der drei Ansichten die Facetten in ihrer eigenen Sidebar-Sektion trägt, wirkt der Schnitt bereits überall; die Leiste macht ihn nur sichtbarer. Der Bau lohnt erst, wenn Schritt 5 bis 7 stehen und die Bedienung an drei Stellen erprobt ist.

## 11. Was über alle Schritte hinweg unberührt bleibt

- Pipeline (`scripts/`), Vokabular (`vocab/`), `docs/data/` und `data/`. Der gesamte Umbau ist frontend-intern und kommt ohne einen neuen Term und ohne einen neuen Pipeline-Lauf aus.
- Die Cross-Grid-Facettensuche der Indizes (`indexes.js:34,148,230-274`) bleibt die zweite, unabhängige Filterebene.
- Der Bestand-Toggle `zeigeUnerschlossen` (E-116) und die Ausblendung von Plakaten und Tonträgern (`EXCLUDED_DFT`) bleiben view-lokal.
- Wissenskorb, Statistik-Ansichtenwahl, `buildRoleChip`, `coverage.js`, die Info-Seiten und `datenmodell.html`.
- Kein Build-Tool, keine neue Abhängigkeit, D3 bleibt der einzige Fremdcode.
- Das Prinzip Erschließungsspiegel: jede neue Zahl in der Oberfläche kommt aus einem Aggregat über `store.*`; leere Jahre, Orte ohne Koordinate und die Differenz zwischen weit und eng bleiben sichtbar statt geglättet.

## 12. Punkte, die eine Operatorentscheidung brauchen

1. **Default des Einmal-Nennungen-Schalters.** 316 der 472 rohen Personen erscheinen in genau einem Record, 156 in zwei oder mehr. Ring 3 eingeschaltet verdreifacht die Knotenzahl grob und bringt den dekorativen Halo zurück, den E-93 ausdrücklich verworfen hat. Vorschlag: Schalter vorhanden, Default aus, mit Zähler am Schalter, damit die verborgene Menge benannt bleibt.
2. **Verbleib der Karten-Entitätsauswahl.** Sie beantwortet eine andere Frage als der Facettenfilter, nämlich die nach einer einzelnen Institution über ihre Spielorte, und ist technisch durch die Facetten `person` und `institution` abgedeckt. Ihr Wegfall ändert die Bedienung spürbar und bricht den Smoke-Canary `karte:render`. Zur Wahl stehen das Entfernen, das Behalten als Schreiber auf die Facette und das Stehenlassen als zweite Ebene neben den Facetten.
3. **Umgang mit der heutigen Chronik.** Der Zeitstrahl der belegten Ereignisjahre kann die Chronik ersetzen (eine Ansicht mit Ebenen-Umschaltung), neben ihr stehen (zweiter Tab), oder als Ebene in derselben Ansicht laufen (Vorschlag dieses Plans). Die Entscheidung hat Folgen für die Tab-Bar, für den Router und für die Deep-Links auf `#chronik`.
4. **Ensemble als eigene Achse.** 15 Belege auf 9 Namen mit vier Schreibvarianten desselben Klangkörpers. Entweder als eigene Facette mit dieser dünnen Deckung, als Untermenge der Institution, oder zurückgestellt bis das Erschließungsteam die Varianten zusammengeführt hat.
5. **Finanzen als Achse.** Sie trägt heute nur Vorhandensein und Währung, weil `detailRole` in allen 57 Belegen leer ist. Eine feinere Achse wäre erfunden. Entweder so bauen, oder zurückstellen.
6. **Positionsstabilität im Netzwerk.** Der Vorschlag hält die Positionen auf der ungefilterten Menge und rechnet allein die Ko-Okkurrenz auf dem Schnitt, um E-93 zu wahren. Die Alternative, alles auf dem Schnitt zu rechnen, ergibt eine dichtere Grafik und einen Layout-Sprung bei jeder Filteränderung.
7. **Default-Schärfegrad je Ansicht.** In `frontend-architecture.md` § Milestone-4-Stand ausdrücklich offen. Der Zeitstrahl in der Ebene `attested` und die Karte sind beide intrinsisch eng; wenn der geteilte Default `weit` bleibt, zeigen sie beim ersten Aufruf mehr, als sie belegen können.
8. **Änderung der logStamp-Verträge.** Die Schritte 5 bis 7 ändern die Schlüsselreihenfolge in `smoke.py:147-155`. Das ist ein bewusster Vertragsbruch gegenüber dem heutigen Smoke-Durchlauf und sollte in einem Commit je Ansicht zusammen mit der Erwartung geändert werden.
9. **Zusammenführung von `facet-multiselect`.** E-151 nennt sechs offene Punkte; hinzu kommen die drei bestehenden Testblöcke, die die Stringform festhalten (`verknuepfungen-geometry.test.mjs:198-235`, `filter-sync.test.mjs:25-36,186-197`). Der Branch darf erst zusammengeführt werden, wenn alle neun erledigt sind, sonst zeigt eine Ansicht kommentarlos einen anderen Ausschnitt.

## 13. Parallele Arbeit im selben Arbeitsverzeichnis

Zwei Befunde, die vor dem Beginn zu klären sind.

- `tests/frontend/_shipped.mjs` ist während der Analyse neu entstanden und stellt `shippedGraph()` und `storeFromShipped()` bereit, also genau den Fixture-Zugang, den die Prüfstrecken dieses Plans brauchen. Alle Fixture-Tests hier bauen darauf auf statt einen zweiten Ladepfad anzulegen.
- `tests/frontend/event-year-count.test.mjs` (ebenfalls neu) arbeitet an der Jahresauflösung in `docs/js/views/statistics-data.js` und an der Jahrzehnt-Achse. Das ist dieselbe Stelle, die Schritt 2 (Ablösung der eigenen Jahresschleife in `filterStore`) und Schritt 5 (Ebenen des Zeitstrahls) anfassen. Die beiden Arbeiten sind zu ordnen, bevor der Umbau beginnt, sonst kollidieren sie in `statistics-data.js` und in der Dekaden-Aggregation.

Der hier beschriebene Umbau setzt auf dem Stand `d75f23d` auf. Vor dem ersten Commit ist gegen den dann aktuellen `main` zu prüfen, ob sich die genannten Zeilennummern verschoben haben.
