---
title: "Frontend-Vertrag für Datierungen und Rollen"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: snapshot
created: 2026-08-22
updated: 2026-08-22
language: de
version: 0.1
authors: [Christopher Pollin]
generated-with: Claude Code
related: [frontend-architecture, design, data, domain-ontology, architecture-decisions, testing]
---

# Frontend-Vertrag für Datierungen und Rollen

Das Datenmodell führt Datierungen heute in mehreren Formen nebeneinander. Eine Zusammenführung auf eine einheitliche Form, in der die Rolle ein Vokabularbegriff ist und das Frontend generisch über eine Schleife rendert, betrifft jede Ansicht der Anwendung. Dieses Dokument nimmt die Frontend-Seite auf, also alle Stellen im Code von `docs/js/`, die eine Datierung oder eine Rolle lesen, anzeigen, sortieren, filtern oder gruppieren, prüft je Stelle, was eine Zusammenführung kostet, und formuliert daraus die Anforderungen an das zusammengeführte Modell. Der Befund am Datenbestand ist Gegenstand einer parallelen Arbeit und wird hier nur dort herangezogen, wo eine Aussage über den Code sonst unbelegt bliebe.

Alle Aussagen sind am Code des Arbeitsstands vom 2026-08-22 geprüft. Zählstände beziehen sich auf `docs/data/m3gim.jsonld` in der an diesem Tag vorliegenden Fassung; als Momentaufnahme führt das Dokument sie bewusst mit. Zeilennummern verweisen auf denselben Stand. Wo eine Aussage eine Schätzung ist, steht das ausdrücklich dabei.

## Vier Träger einer Datierung im heutigen Code

Das Frontend liest Datierungen aus vier voneinander unabhängigen Strukturen.

1. `rico:date` am Record. Einwertig, ausschließlich ISO-Formen, gespeist aus der Quellspalte `entstehungsdatum` (`scripts/transform.py:592–606`). Dies ist der einzige Zeitanker, den heute mehr als eine Ansicht teilt.
2. Die flache typisierte Familie am Record. `knowledge/data.md` § 7 und `vocab/m3gim.ttl` führen sechzehn Properties, `scripts/transform.py:111–134` bildet zweiundzwanzig Rollenschlüssel darauf ab, `docs/js/data/loader.js:275–281` kennt vierzehn davon, und fünfzehn sind im aktuellen Export belegt. Die Rolle steckt im Property-Namen.
3. `m3gim:hasDatedEvent` am Record. Inline-Knoten der Klasse `m3gim:DatedEvent` mit `m3gim:dateValue` und `m3gim:dateRole`. Die Rolle ist ein freies Literal. Im aktuellen Export tragen 38 Records zusammen 100 solcher Knoten, davon 75 mit der Rolle `erwähnt`.
4. `m3gim:SpatiotemporalEvent` als referenzierter Top-Level-Knoten mit `m3gim:atDate` und `m3gim:eventRole`, dazu `m3gim:auffuehrungsdatum` am `m3gim:Performance`-Knoten.

Welche der beiden ersten Formen eine Datierung erreicht, entscheidet die Pipeline nicht nach Semantik, sondern nach Parsbarkeit. `scripts/transform.py:1447–1467` schickt eine Datierung genau dann in die typisierte Property, wenn die Rolle bekannt **und** der Wert ISO-konform ist; andernfalls landet dieselbe Rolle im `DatedEvent`. Der Record `m3gim:NIM_004_34` belegt das, seine Rolle `erscheinungsdatum` steht im `DatedEvent`, weil der Wert `06-09` kein Jahr trägt. Die Formzugehörigkeit kodiert damit heute Datenqualität und nicht Bedeutung. Für den Vertrag ist das der wichtigste Ausgangsbefund, weil das Frontend die beiden Formen an mehreren Stellen so behandelt, als trügen sie unterschiedliche Bedeutung.

## 1. Bestandsaufnahme am Code

72 Lesestellen in 22 Modulen lesen eine Datierung oder eine Rolle. Die Spalte „Rolle" sagt, ob die Rolle an dieser Stelle angezeigt wird, ob sie eine Auswahl steuert (Filter, Gruppierung, Farbe, Reihenfolge) oder ob sie nur implizit vorausgesetzt ist, also aus dem Property-Namen mitgedacht wird, ohne dass ein Rollenwert gelesen würde.

### Ladeprogramm, Filterzustand, Hilfsfunktionen

| Nr. | Ort | Gelesen | Zweck | Rolle |
|---|---|---|---|---|
| L1 | `data/loader.js:212` | `child['rico:date']` | Konvolut-Datumsspanne (`konvolutMeta.dateDisplay`) und `datedCount` | implizit |
| L2 | `data/loader.js:275–281` | Liste `TYPED_DATE_PROPS` (14 Namen) | Namensregister der flachen Familie; die Listenreihenfolge ist zugleich Priorität | implizit im Namen |
| L3 | `data/loader.js:283–296` `firstTypedYear` | jede Property aus L2, Qualifier `circa:`/`vor:`/`nach:` gestrippt | erstes verwertbares Jahr | implizit, erste Fundstelle gewinnt |
| L4 | `data/loader.js:298–305` `indexByYear` | `rico:date`, sonst `firstTypedYear` | `store.byYear` | implizit |
| L5 | `data/loader.js:479–480` | `m3gim:atDate`, `m3gim:eventRole` am STE | `store.mobilityEvents.date`/`.role` | Auswahl und Anzeige |
| L6 | `data/loader.js:533` | `perf['m3gim:auffuehrungsdatum']` | `store.recordToPerformances[].date` | ein Property-Name hart verdrahtet |
| L7 | `utils/format.js:104–112` `countLinks` | Anzahl der `m3gim:hasDatedEvent`-Einträge | Verknüpfungszähler, speist `unprocessedIds`, die Links-Spalte und `konvolutMeta.totalLinks` | implizit |
| L8 | `utils/date-parser.js:6`, `:41` | beliebiger Datumsstring | `extractYear`, `formatDate` | rollenblind |
| L9 | `ui/filter-sync.js:77–83` `recordYear` | ausschließlich `rico:date` | Auflösung der geteilten Facette `zeitfenster` | implizit |
| L10 | `ui/filter-sync.js:54–62` `engRecordSet` | `recordToEvents` plus `recordToPerformances` | Schärfegrad `eng` | implizit |

### Bestand

| Nr. | Ort | Gelesen | Zweck | Rolle |
|---|---|---|---|---|
| L11 | `views/archive-holdings.js:313–314` | `extractYear(r['rico:date']) \|\| 9999` | Sortierschlüssel `datum`, undatierte ans Ende | implizit |
| L12 | `views/archive-holdings.js:339` | `extractYear(r['rico:date'])` | tote Zuweisung, die Variable `year` wird in `renderRows` nirgends verwendet | implizit |
| L13 | `views/archive-holdings.js:407` | `formatDate(r['rico:date'])`, Fallback `o. D.`; Konvolute `meta.dateDisplay` | Datum-Spalte | implizit |
| L14 | `views/archive-holdings.js:408` | Präsenzprüfung `!r['rico:date']` | Markierung `isUndated` | implizit |
| L15 | `views/_archive-filter.js:26` | Rohstring `record['rico:date']` | Volltextsuche der Bestand-Toolbar über das Datum | implizit |

### Chronik

| Nr. | Ort | Gelesen | Zweck | Rolle |
|---|---|---|---|---|
| L16 | `views/archive-timeline.js:126` | `extractYear(r['rico:date'])` | Primärjahr, bestimmt die Jahreszeile | implizit |
| L17 | `views/archive-timeline.js:128–131` | `secondaryYearForRecord` | Sekundärdatierung nur für Records ohne Primärjahr | Auswahl |
| L18 | `views/archive-timeline.js:318` | `record['rico:date']` als String | Sortierung der Chips innerhalb einer Jahreszeile | implizit |
| L19 | `views/archive-timeline.js:376–377` | `formatDate(record['rico:date'])` | Datum am Chip nur, wenn es über die Jahreszahl hinaus Information trägt | implizit |
| L20 | `views/archive-timeline.js:420–424` | `secondary.label` | Badge `≈ Aufführungsdatum` plus Tooltip „Jahr nicht aus dem Hauptdatum, sondern aus …" | **angezeigt** |
| L21 | `views/chronik-data.js:15–30` | Hand-Map `SECONDARY_LABEL` | vierzehn Property-Namen auf deutsche Anzeige-Labels | **angezeigt** |
| L22 | `views/chronik-data.js:68–81` | `TYPED_DATE_PROPS` in Listenreihenfolge | erste Property gewinnt, ihr Label wird mitgeführt | Auswahl und Anzeige |
| L23 | `views/chronik-data.js:82–89` | `store.mobilityEvents[].date` | STE-Fallback, Label fest „Ereignisdatum (STE)" | angezeigt |
| L24 | `views/chronik-data.js:38–61` `sichtForRecord` | `mobilityClusterFor(ev.role)` | dominante Mobilitätssicht, trägt den linken Farbakzent am Chip | Auswahl |

### Statistik

| Nr. | Ort | Gelesen | Zweck | Rolle |
|---|---|---|---|---|
| L25 | `views/statistics-data.js:47–49`, `:57–63` | `extractYear(rec['rico:date'])` | `facetInventory`, Spektrum des Zeitreglers und Zahl der undatierten Records | implizit |
| L26 | `views/statistics-data.js:96–142` `filterStore` | dasselbe Jahr-Primitiv | record-basierter Jahresschnitt, aus dem der Sub-Store folgt | implizit |
| L27 | `views/statistics-data.js:249–250` | `ev.date.slice(0, 4)` | eigener Jahresparser für die Dekaden-Stapel | implizit |
| L28 | `views/statistics-data.js:148–153` | `mobilityClusterFor(ev.role)` | Sicht-Facette schneidet `mobilityEvents` | Auswahl |
| L29 | `views/statistics-data.js:190–217` | rohe Rollennamen | Residualbucket „Nicht klassifiziert" listet die unklassifizierten Rollen im Beschreibungstext | **angezeigt** |
| L30 | `views/statistics-data.js:222–237` `aggregateEventRoles` | `ev.role` | die Rolle ist zugleich `label` der Zeile | **angezeigt** |
| L31 | `views/statistics.js:350–365` | Zeilen aus L30 | Balkengruppe „Auftrittstypen", Beschriftung ist der rohe Rollenstring | **angezeigt** |
| L32 | `views/statistics.js:191–198` | Regler `lo`/`hi` | Zeitraum-Facette, view-lokal und nicht am geteilten Filter | implizit |
| L33 | `views/statistics-data.js:428–450` | `e.role` der Finanzeinträge | Detail-Rollen im Finanzen-Panel | **angezeigt** |

### Indizes

| Nr. | Ort | Gelesen | Zweck | Rolle |
|---|---|---|---|---|
| L34 | `views/indexes.js:59`, `:412–422` | `schema:birthDate`, `schema:deathDate` | Subtitle `Beruf · Stimmfach · Lebensdaten` | keine Datumsrolle |

Nullbefund für dieses Tab. Die Indizes lesen keine Objektdatierung. Sie sind von einer Zusammenführung nur mittelbar betroffen, über die Record-Mengen, die andere Filter ihnen zuspielen.

### Karte

| Nr. | Ort | Gelesen | Zweck | Rolle |
|---|---|---|---|---|
| L35 | `views/entity-map-data.js:106` | `rec['rico:date']` | Datum eines Ortsbelegs, der aus `rico:hasOrHadLocation` stammt | implizit |
| L36 | `views/entity-map-data.js:116` | `loc.role` | Rolle desselben Belegs | Auswahl |
| L37 | `views/entity-map-data.js:132–133` | `ev.date`, `ev.role` | Datum und Rolle eines Belegs, der aus einem STE stammt | Auswahl |
| L38 | `views/entity-map-data.js:93–99` | `role` und `date` im Dedup-Schlüssel | zwei Belege gelten als gleich, wenn Record, Stadt, Rolle, Datum und Quelle übereinstimmen | Auswahl |
| L39 | `views/mobility.js:56` `sichtOf` | `mobilityClusterFor(o.role)` | Sicht eines Belegs, Farbe des Tortensegments | Auswahl |
| L40 | `views/mobility.js:82–84` | `extractYear(o.date)` über alle Belege | Spektrum des Zeitreglers | implizit |
| L41 | `views/mobility.js:107–110` `inWindow` | `extractYear(o.date)` | Zeitfenster, undatierte Belege bleiben sichtbar | implizit |
| L42 | `views/mobility.js:620–626` | `extractYear(o.date)` | erstes und letztes Jahr je Ortsknoten | implizit |
| L43 | `views/mobility.js:637–645` `sortOcc` | Jahr, dann Ortsname, dann Rolle | Reihenfolge der Belegliste im Klick-Detail | Auswahl |
| L44 | `views/mobility.js:648–658` `buildOccChip` | `o.role` als Chip-Prefix, `formatDate(o.date)` als Wert | Belegchip | **angezeigt** |

### Netzwerk

| Nr. | Ort | Gelesen | Zweck | Rolle |
|---|---|---|---|---|
| L45 | `views/network.js:248–268` | Präsenzprüfung `!rec['rico:date']`, dann eigene Regex `/(\d{4})/` | Personen-zu-Jahre-Index und Gesamtspanne des Zeitreglers | implizit |
| L46 | `views/network.js:272–279` | derselbe Index | Personen ohne Record im Zeitfenster werden ausgeblendet | implizit |
| L47 | `views/network.js:487` | `rico:date` als String | Sortierung der Belegliste im Detail-Panel | implizit |
| L48 | `views/network.js:502` | `r['rico:date']` roh | Datumsanzeige in der Belegliste, ohne `formatDate` | implizit |

### Verknüpfungen

| Nr. | Ort | Gelesen | Zweck | Rolle |
|---|---|---|---|---|
| L49 | `views/_verknuepfungen-geometry.js:38–46` | `store.byYear` invertiert | Record-zu-Jahr-Index der Zeitfenster-Facette; erbt damit den typisierten Fallback aus L4 | implizit |
| L50 | `views/verknuepfungen.js:89–96` `yearBounds` | Schlüssel von `store.byYear` | Grenzen der Zeitfenster-Eingaben | implizit |
| L51 | `views/verknuepfungen.js:141–152`, `:206–208` | geteilte Facette `zeitfenster` | Von-Bis-Eingaben, schreiben und lesen den geteilten Filter | implizit |

### Wissenskorb

| Nr. | Ort | Gelesen | Zweck | Rolle |
|---|---|---|---|---|
| L52 | `views/basket.js:158–169` | `formatDate(record['rico:date'])` | Meta-Zeile der Karte | implizit |
| L53 | `views/basket.js:215` | dasselbe | CSV-Spalte „Datierung" | implizit |
| L54 | `views/basket.js:226–233` | `ev.role`, `formatDate(ev.date)` | CSV-Spalte „Orte", Rolle und Datum je STE | **angezeigt** |
| L55 | `views/basket.js:274–295` | `formatDate(rico:date)`, daraus per Regex das Jahr | BibTeX-Feld `year` | implizit |
| L56 | `views/basket.js:172–180` | `buildRecordBlocks` | erbt die Blöcke der Detailansicht samt Datumschips | siehe L59, L60 |

### Detailansichten

| Nr. | Ort | Gelesen | Zweck | Rolle |
|---|---|---|---|---|
| L57 | `views/archive-inline-detail.js:116` | `formatDate(record['rico:date'])` | Metadaten-Zeile „Datum" | implizit |
| L58 | `views/archive-inline-detail.js:220–222` | `ensureArray(record['m3gim:hasDatedEvent'])` | Sammlung der genannten Datierungen | implizit |
| L59 | `views/archive-inline-detail.js:255–268` | Blockreihenfolge | eigener Block „Im Dokument genannte Daten" an fester Position zwischen „Ort & Ereignis" und „Erwähnt" | Auswahl |
| L60 | `views/archive-inline-detail.js:381–393` | `d['m3gim:dateRole']` als Chip-Prefix, `formatDate(d['m3gim:dateValue'])` als Wert | Datumschips, Cluster fest `datum` | **angezeigt, roh** |
| L61 | `views/archive-inline-detail.js:316–329` | `steChipPrefix(ev.role)`, `formatDate(ev.date)` | Chip „Ort · Datum" im Block „Ort & Ereignis" | **angezeigt, über Hand-Map** |
| L62 | `views/archive-inline-detail.js:349–357` | `validityBegin`/`validityEnd` | Gültigkeitszeitraum am AgRelOn-Beziehungschip | angezeigt |

### Rollen-Landkarten in `data/constants.js`

| Nr. | Ort | Gelesen | Zweck | Rolle |
|---|---|---|---|---|
| L63 | `data/constants.js:276–284` | acht Datumsrollen in Großschreibung | `ROLE_CLUSTER` weist ihnen die Chip-Farbfamilie `datum` zu | Auswahl über den Namen |
| L64 | `data/constants.js:317–392` | einundvierzig Rollenschlüssel | `EVENT_ROLE_TO_MOBILITY_CLUSTER` mischt Ortsrollen, Ereignisrollen und Datumsrollen in einer Tabelle und ordnet sie den fünf Mobilitätssichten zu | Auswahl |
| L65 | `data/constants.js:476–495` | dreizehn Datumsrollen | `STE_ROLE_DISPLAY` übersetzt eine Datumsrolle in eine Orts- oder Ereignisrolle für die Chip-Beschriftung, Fallback ist die Großschreibung des Rohwerts | **angezeigt** |
| L66 | `data/constants.js:394–399` `mobilityClusterFor` | Rollenstring, kleingeschrieben | einziger Zugang zur Sicht, `null` bei fehlendem Eintrag | Auswahl |

### Verborgene Tabs

| Nr. | Ort | Gelesen | Zweck | Rolle |
|---|---|---|---|---|
| L67 | `views/biogram.js:43–55` | `ev.date`, `ev.role` | Orte-Spur des Zeitstrahls | angezeigt im Tooltip |
| L68 | `views/biogram.js:62–73` | `rec['rico:date']` | Belege-Spur | implizit |
| L69 | `views/mobility-atlas.js:155–190`, `:250` | `extractYear(e.date)` | Zeitstrahl mit Brush, Achsenskala | implizit |
| L70 | `views/mobility-atlas.js:285–292` | `ev.role`, `formatDate(ev.date)` | Chips im Detailpanel | **angezeigt, roh** |
| L71 | `views/mobility-atlas.js:317–325` `clusterForEvent` | Regex `/datum$/` auf dem Rollennamen | Farbcluster aus der Endung des Rollennamens | Auswahl über die Zeichenkette |
| L72 | `views/repertoire.js:253–262` | `rico:date` als Sortierschlüssel und Rohanzeige | chronologische Belegliste | implizit |

### Verteilung

| Bereich | Lesestellen |
|---|---:|
| Ladeprogramm, Filterzustand, Hilfsfunktionen | 10 |
| Bestand | 5 |
| Chronik | 9 |
| Statistik | 9 |
| Indizes | 1 |
| Karte | 10 |
| Netzwerk | 4 |
| Verknüpfungen | 3 |
| Wissenskorb | 5 |
| Detailansichten | 6 |
| Rollen-Landkarten | 4 |
| Verborgene Tabs | 6 |

Nach der Art des Zugriffs zeigen 15 Stellen eine Rolle an, 13 treffen anhand einer Rolle eine Auswahl, 2 tun beides, 40 setzen die Rolle nur implizit voraus, und 2 haben mit Rollen nichts zu tun (L8, L34). Die impliziten 40 liegen fast durchweg auf `rico:date`, weshalb der Zeitanker die empfindlichste Stelle des Umbaus ist.

## 2. Was bei einer Zusammenführung verloren ginge

### Bedeutung, die heute aus dem Property-Namen kommt

Sechs Stellen gewinnen ihre Bedeutung ausschließlich aus der Zeichenkette des Property- oder Rollennamens.

- **L2 und L22, die Reihenfolge der Namensliste.** `TYPED_DATE_PROPS` beginnt mit `auffuehrungsdatum`, `premieredatum`, `auftrittsdatum` und endet mit `ueberweisungsdatum`, `abreisedatum`. Der Kommentar an der Liste benennt den Grund, die Reihenfolge folgt dem Aufführungsbezug. `secondaryYearForRecord` nimmt die erste Property, die einen Wert trägt, und liefert damit für einen Record mit Aufführungs- und Überweisungsdatum das Aufführungsjahr. Nach einer Zusammenführung existiert die Liste nicht mehr, und die Auswahl braucht ein anderes Kriterium.
- **L21, die Hand-Map `SECONDARY_LABEL`.** Vierzehn Property-Namen werden auf deutsche Anzeigeformen abgebildet, damit das Badge am Chronik-Chip `≈ Aufführungsdatum` statt `≈ m3gim:auffuehrungsdatum` zeigt. Diese Map ist die reinste Ausprägung des Problems, das die Zusammenführung lösen soll, und sie ist zugleich die Stelle, die ohne Ersatz sofort bricht.
- **L63, der Datumsrollen-Block in `ROLE_CLUSTER`.** Acht großgeschriebene Rollennamen entscheiden über die Chip-Farbfamilie `datum`. Kein Eintrag heißt Fallback auf `neutral`, also Grau, was Designregel 3 aus `knowledge/design.md` verletzt, ohne einen Fehler auszulösen.
- **L65, `STE_ROLE_DISPLAY`.** Dreizehn Datumsrollen werden auf Orts- und Ereignisrollen umgeschrieben, weil `absendedatum` an einem Chip der Form „Ort · Datum" semantisch schief steht und `ABSENDEORT` passt. Diese Übersetzung ist eine bewusste redaktionelle Entscheidung, die im Code lebt und in keiner Datenstruktur steht.
- **L71, `clusterForEvent` im Mobilitäts-Atlas.** Die Funktion prüft mit `/datum$/`, ob ein Rollenname auf „datum" endet, und leitet daraus das Farbcluster ab. Eine Zusammenführung, die Rollen als `m3gim-role:`-Begriffe führt, entzieht dieser Regel die Grundlage vollständig, weil ein Begriff wie `auffuehrung` die Endung nicht mehr trägt.
- **L6, das hart verdrahtete `m3gim:auffuehrungsdatum` am Performance-Knoten.** Der Loader liest genau diesen einen Namen. Jeder andere Datumsträger an einer Performance bleibt heute unsichtbar, und nach der Zusammenführung fällt der Zugriff aus.

### Bedeutung, die heute aus der Reihenfolge kommt

Zwei verschiedene Ordnungen tragen heute Bedeutung, und beide sind implizit.

Die erste ist die eben genannte Listenreihenfolge in `TYPED_DATE_PROPS`, eine Priorität zwischen Rollen. Die zweite ist die Array-Reihenfolge der `m3gim:hasDatedEvent`-Einträge, die der Zeilenreihenfolge der Erfassungstabelle folgt und in L58 und L60 unverändert in die Chip-Reihenfolge durchschlägt. Der Record `m3gim:NIM_023_9` zeigt beide Ordnungen nebeneinander, er trägt eine Generalprobe am 2. Juli und eine Aufnahme am 3. Juli, und die Chips erscheinen in genau dieser Quellreihenfolge. Ein zusammengeführtes Modell, das Datierungen als Menge liefert und keine Ordnung zusichert, macht beide Reihenfolgen zufällig.

Eine dritte, schwächere Ordnung liegt in L59, der festen Position des Blocks „Im Dokument genannte Daten" in der Blockliste der Detailansicht. Sie hängt am Blockschlüssel und nicht an den Daten und bleibt deshalb erhalten, solange die Zusammenführung die Trennung der Bezugsebenen mitliefert.

### Bedeutung, die heute aus der Trennung der beiden Formen kommt

Dies ist der teuerste Posten. Der Kommentar über `datedEventChipEls` (`views/archive-inline-detail.js:381–386`) hält die Regel ausdrücklich fest, die Datierungen aus `m3gim:hasDatedEvent` werden im Dokument genannt, sind also Eigenschaft des Dokuments und nicht Ereignisse in Malaniuks Leben, und stehen deshalb bewusst nicht im Chronik-Zeitstrahl. Der Kommentar nennt sogar den Beleg, ein Jahr 1872 auf einer Lebenslinie von 1919 bis 2009. Der Beleg existiert wirklich, `m3gim:NIM_004_7` trägt eine `erwähnt`-Datierung 1872 und `m3gim:NIM_073_30_1` eine Spanne 1876/1953.

Diese Regel ist heute nirgends als Datum-Eigenschaft abgebildet. Sie ist ausschließlich dadurch wirksam, dass `secondaryYearForRecord` (L22) über `TYPED_DATE_PROPS` läuft und `m3gim:hasDatedEvent` nicht anfasst. Fällt die Formunterscheidung weg, ohne dass ein Ersatz die Bezugsebene trägt, wandern acht heute undatierte Records aus dem Undatiert-Block in Jahreszeilen, darunter `m3gim:NIM_139_109_2` mit drei Aufführungsdaten aus 1956 und `m3gim:NIM_142_28` mit einem Empfang 1954. Bei `m3gim:NIM_004_7` und `m3gim:NIM_073_30_1` bekäme der Zeitstrahl Punkte außerhalb der Lebensspanne, und der Achsenkopf müsste seine Jahresgrenzen ausweiten.

Ein zweiter Fall derselben Art ist die Rolle `nicht eingehalten` am Record `m3gim:NIM_023_11`, die drei Datierungen trägt (17., 19. und 21. Mai 1953). Diese Datierungen bezeichnen Termine, die gerade nicht stattgefunden haben. `vocab/check-coverage.py:49–50` führt den Wert als ausdrückliche Ausnahme, er ist im Schema kein Rollenbegriff, sondern ein Vertragsstatus. Eine generische Schleife über alle Datierungen eines Records würde drei Phantompunkte erzeugen, und keine heutige Struktur hielte sie auf.

Ein dritter Fall sind die neun `rahmenveranstaltung`-Datierungen, meist Spannen einer Festspielsaison, die deutlich weiter sind als das Record-Datum. `m3gim:NIM_023_1_1` trägt ein Record-Datum vom 25. August 1952 und eine Rahmendatierung vom 24. Juni bis 22. August 1953. In einer gemeinsamen Aggregation über Dekaden zählte dieser Record in zwei Dekadenbalken.

### Bedeutung, die heute aus dem Rollen-Rohstring kommt

An fünf Stellen wird ein Rollenwert unverändert als Beschriftung ausgegeben, an L30 und L31 in der Statistik, an L44 auf der Karte, an L60 in der Detailansicht und an L70 im Atlas. Der Nutzer liest dort heute Zeichenketten wie `zielort`, `erwähnt` oder `nicht eingehalten`. Das ist keine Ausdruckskraft, die verloren gehen könnte, sondern eine Lücke, die die Zusammenführung schließen kann, sobald die Rolle ein Vokabularbegriff mit Anzeigeform ist. Zugleich zeigt L29, dass die Rohform gebraucht wird, denn der Residualtext der Statistik zählt die unklassifizierten Rollen namentlich auf und wäre mit reinen Anzeigelabels ungenauer.

## 3. Anforderungen an den Vertrag

Vier Anforderungen halten die heutige Ausdruckskraft. Sie sind so formuliert, dass jede einzeln prüfbar ist.

### A1, die Rolle liefert ihre Anzeigeform aus den Daten

Das Frontend darf keine Rollennamen mehr im Code führen. Der Präzedenzfall steht bereits im Repository, E-101 hat die Hand-Map `DOKUMENTTYP_LABELS` abgeschafft, indem die Pipeline `skos:prefLabel` an die `m3gim-dft:`-Concepts schreibt, der Loader sie in `store.dftHierarchy` legt und `dftLabel(store, id)` sie auflöst (`utils/format.js:8–16`). Für Rollen fehlen zwei Schritte.

Erstens erreichen die Rollen-Concepts das Frontend heute nicht. Der `@graph` von `docs/data/m3gim.jsonld` enthält 22 `skos:Concept`-Knoten, sämtlich aus dem `m3gim-dft:`-Namespace. Kein `m3gim-role:`-Concept wird ausgeliefert. Die Pipeline muss die Rollen-Concepts genauso emittieren wie die Dokumenttypen.

Zweitens taugt der heutige `skos:prefLabel` der Rollen-Concepts nicht als Anzeigeform. In `vocab/m3gim.ttl:791` steht `m3gim-role:absendedatum skos:prefLabel "absendedatum"@de`, also der Slug. Die deutsche Anzeigeform „Absendedatum" liegt am `rdfs:label` der zugehörigen Property (`vocab/m3gim.ttl:271`) und geht mit der Property verloren. Der Vertrag muss festlegen, welches Prädikat am Concept die Anzeigeform trägt, entweder ein auf die Anzeigeform umgestellter `skos:prefLabel` mit dem Slug als `skos:notation`, oder ein zusätzliches `rdfs:label`. Die zweite Variante ist rückholbar und lässt L29 seine Rohform behalten.

Drittens braucht die Anzeigeform zwei Kontexte. `STE_ROLE_DISPLAY` (L65) belegt, dass dieselbe Rolle an einem Ereignischip anders heißen muss als an einem Datumschip, `absendedatum` gegenüber `ABSENDEORT`. Entweder trägt das Concept beide Formen, oder das Modell trennt die Ortsrolle von der Datumsrolle so sauber, dass die Übersetzung entfällt. Die zweite Variante ist die sauberere; `vocab/m3gim.ttl:224` hält die Frage als offene Editorial Note bereits fest, dort steht, dass der Wertebereich von `m3gim:eventRole` Ortsrollen, Ereignisrollen und Datumsrollen mischt und die Zulässigkeit von Datumsrollen zu klären ist.

Abgesichert ist die Auflösbarkeit bereits, `vocab/check-coverage.py:47` prüft jedes `m3gim:dateRole`-Literal gegen ein Concept. Die eine dokumentierte Ausnahme `nicht eingehalten` muss der Vertrag mitentscheiden, denn ein Wert ohne Concept hat nach A1 keine Anzeigeform.

### A2, mehrere Datierungen an einem Objekt behalten eine sinnvolle Reihenfolge

Zwei Ordnungen sind zu ersetzen (§ 2). Der Vertrag muss beide zusichern.

Die Ordnung zwischen Rollen ersetzt ein Rang am Rollenbegriff, etwa ein `skos:notation` oder eine eigene Property, die die heutige Listenreihenfolge von `TYPED_DATE_PROPS` abbildet. Ohne diesen Rang muss die Auswahl der Sekundärdatierung willkürlich werden oder auf den frühesten Wert zurückfallen, was für den Record `m3gim:NIM_023_9` das Generalprobendatum statt des Aufnahmedatums liefert. Ein Rang am Begriff ist zudem die Stelle, an der eine fachliche Entscheidung sichtbar wird, statt im Code zu verschwinden.

Die Ordnung innerhalb eines Records ersetzt entweder eine zugesicherte Array-Reihenfolge, die der Loader nicht umsortiert, oder eine explizite Ordnungszahl je Datierung. Die zugesicherte Array-Reihenfolge ist der kleinere Eingriff und deckt die Chip-Reihenfolge in L58 und L60 ab. Sie muss dann im Vertrag stehen, weil ein `Map`- oder `Set`-basierter Store sie sonst unbemerkt verliert.

### A3, jede Datierung nennt ihre Bezugsebene

Die Zusammenführung darf die Bezugsebene nicht der Rolle überlassen. Der Beleg dafür ist, dass ein und dieselbe Rolle `erscheinungsdatum` heute in beiden Formen vorkommt, als typisierte Property an 27 Records und als `DatedEvent` an `m3gim:NIM_004_34`. Auch die Rolle `entstehung` steht an `m3gim:NIM_023_3` in einem `DatedEvent`, während dieselbe Quellspalte sonst `rico:date` speist. Die Rolle sagt, was für eine Art Zeitpunkt gemeint ist, und die Bezugsebene sagt, worauf er sich bezieht.

Der Vertrag braucht dafür einen eigenen kontrollierten Term je Datierung mit mindestens drei Werten.

- Datierung des Objekts. Das Dokument selbst ist dann entstanden, ausgestellt oder erschienen. Heute `rico:date` und ein Teil der typisierten Familie.
- Datierung eines bezeugten Ereignisses. Das Dokument belegt ein Ereignis, das dann stattfand. Heute der Aufführungsteil der typisierten Familie und der Datumsteil des `SpatiotemporalEvent`.
- Datierung einer Erwähnung. Das Datum steht im Dokument und gehört nicht in die Lebenslinie. Heute die 75 `erwähnt`-Einträge in `m3gim:hasDatedEvent`.

Die Fälle `nicht eingehalten` und `rahmenveranstaltung` zeigen, dass drei Werte knapp bemessen sind. Ein nicht eingehaltener Termin ist eine negierte Behauptung, eine Rahmenveranstaltung ein umfassender Zeitraum. Ob beide eigene Werte bekommen oder als Erwähnung geführt werden, ist eine fachliche Entscheidung; für das Frontend genügt, dass sie nicht in der Ebene „bezeugtes Ereignis" landen, weil nur diese Ebene den Zeitstrahl speist.

Das Modell führt mit `m3gim:attests` und der geplanten `m3gim:Occurrence` (`knowledge/data.md` § 7) bereits eine Bezeugungslogik. Die Bezugsebene dort anzusiedeln wäre konsistent, verschiebt aber die Verfügbarkeit auf den Zeitpunkt, zu dem die Occurrence-Ebene in der Pipeline steht. Ein Term direkt an der Datierung ist unabhängig davon lieferbar.

### A4, ein Zeitanker je Record bleibt einwertig und benannt

Der Zeitfilter ist die verwundbarste Stelle. Die geteilte Facette `zeitfenster` (`ui/filter-state.js:26`) wirkt in fünf Ansichten, und jede löst sie heute anders auf.

| Ansicht | Auflösung des Jahres | Fundstelle |
|---|---|---|
| Bestand, Chronik | `extractYear(record['rico:date'])` | L9 |
| Netzwerk | eigene Regex `/(\d{4})/` auf `rico:date` | L45 |
| Karte | `extractYear` auf dem Belegdatum, das aus `rico:date` oder `STE.atDate` stammt | L35, L37, L41 |
| Verknüpfungen | `store.byYear`, also `rico:date` **oder** typisierter Fallback | L49, L4 |
| Statistik (eigener Regler) | `extractYear(rec['rico:date'])` | L25 |

Vier verschiedene Jahresbegriffe hinter einer Facette sind schon heute eine Inkonsistenz, die niemandem auffällt, weil `rico:date` fast überall die Antwort gibt. Eine Zusammenführung, die `rico:date` durch eine Menge gleichrangiger Datierungen ersetzt, macht aus der Inkonsistenz vier verschiedene Filterergebnisse.

Der Vertrag muss deshalb genau eines von zwei Dingen zusichern.

1. `rico:date` bleibt als einwertiger Zeitanker am Record bestehen und wird aus der zusammengeführten Menge deterministisch abgeleitet. Der Umbau bleibt dann auf die Anzeige- und Rollenseite beschränkt, und die fünf Filterauflösungen laufen unverändert weiter.
2. Die zusammengeführte Menge trägt eine ausgezeichnete Datierung, etwa über die Bezugsebene aus A3 plus den Rang aus A2, und das Frontend bekommt eine einzige Funktion, die diesen Anker liefert. Dann müssen alle fünf Auflösungen auf diese Funktion umgestellt werden, was den Umbau größer macht und die heutige Inkonsistenz nebenbei beseitigt.

Die erste Variante ist die kleinere Änderung, die zweite die ehrlichere. Für die zweite spricht, dass sie den Erschließungsspiegel aus E-87 stärkt, weil die Anzahl der Records ohne Anker dann in jeder Ansicht dieselbe ist.

### Nebenbedingungen

Drei Punkte hängen an der Zusammenführung, ohne zu den vier Hauptanforderungen zu gehören.

- **Verknüpfungszählung.** `countLinks` (L7) zählt `m3gim:hasDatedEvent`-Einträge mit. Der Zähler entscheidet über `unprocessedIds`, also darüber, ob ein Record im Default-Modus des Bestands und in der Chronik überhaupt erscheint, und über die Links-Spalte sowie `konvolutMeta.totalLinks`. Der neue Träger muss dort eingesetzt werden. Im aktuellen Export hängt kein Record allein an dieser Zählung, weil alle 38 Records mit `DatedEvent` weitere Verknüpfungen tragen; die Zahlen in der Links-Spalte und im Konvolut-Tooltip sänken aber stillschweigend.
- **Qualifier.** `circa:`, `vor:` und `nach:` werden heute an zwei Stellen weggeschnitten (`data/loader.js:290`, `views/chronik-data.js:75`) und sonst nirgends ausgewertet. `knowledge/frontend-architecture.md` § Erweiterung führt das als offenen Punkt. Der Vertrag sollte festlegen, ob der Qualifier ein eigenes Feld der Datierung wird; sonst bleibt die Sonderbehandlung als String-Operation an zwei Stellen liegen.
- **Provenance.** Jeder `DatedEvent` trägt heute `m3gim:xlsxSource`, jede typisierte Property trägt keine. Die Provenance-Pille am Chip (L60) zeigt sie folglich nur für die eine Hälfte. Eine Zusammenführung, die alle Datierungen zu Knoten macht, kann die Quellzelle durchgängig mitführen; das wäre ein Gewinn und ist an `utils/provenance.js` ohne Änderung anschließbar.

## 4. Vorschlag für die Zugriffsschicht

### Ein neues Modul, vier Funktionen

Ein Modul `docs/js/data/datings.js` kapselt den gesamten Zugriff. Es liegt neben `loader.js` und `constants.js`, ist DOM-frei und damit über `node --test` prüfbar, wie `chronik-data.js` und `statistics-data.js` es vormachen.

- `datingsOf(store, record)` liefert die normalisierte Liste aller Datierungen eines Records, in Vertragsreihenfolge (A2), jeder Eintrag als `{ value, year, roleId, roleLabel, scope, rank, qualifier, xlsxSource }`.
- `roleLabel(store, roleId)` löst den Rollenbegriff über `store.roleVocab` auf, genau wie `dftLabel(store, id)` es für Dokumenttypen tut (A1). Fallback ist die Rollen-Id.
- `primaryYear(store, record)` liefert `{ year, source }`, wobei `source` entweder den Zeitanker nach A4 oder die gewählte Sekundärdatierung samt Rollenlabel benennt. Die Funktion ersetzt `firstTypedYear`, `secondaryYearForRecord` und `recordYear` in einem.
- `datingsByScope(store, record, scope)` filtert nach Bezugsebene (A3) und ist der Zugang für alle Ansichten, die nur eine Ebene sehen dürfen.

Dazu kommt eine Erweiterung des Loaders um `store.roleVocab` als `Map<roleId, {id, prefLabel, notation, rank, cluster}>`, aufgebaut in Pass 1 aus den `m3gim-role:`-Concepts, parallel zu `indexConcept` für die Dokumenttypen (`data/loader.js:447–457`).

### Was dadurch entfällt

Sechs Lesestellen und drei Hand-Maps verschwinden ersatzlos.

| Entfällt | Ersetzt durch |
|---|---|
| `TYPED_DATE_PROPS` (L2) und `firstTypedYear` (L3) | `primaryYear` |
| `SECONDARY_LABEL` (L21) | `roleLabel` |
| `secondaryYearForRecord` (L22, L23) | `primaryYear` |
| Datumsrollen-Block in `ROLE_CLUSTER` (L63) | `store.roleVocab[].cluster` |
| `STE_ROLE_DISPLAY` und `steChipPrefix` (L65) | `roleLabel` mit Anzeigekontext, sofern A1 die zweite Anzeigeform liefert |
| `clusterForEvent` (L71) | `store.roleVocab[].cluster` |
| die vier Jahresauflösungen L9, L25, L45, L49 | `primaryYear` |

### Vier reale Codestellen im Vorher-Nachher

**1. Sekundärdatierung der Chronik** (`views/chronik-data.js:15–30` und `:68–89`).

Vorher, zusammen 30 Zeilen Hand-Map plus 22 Zeilen Suchschleife:

```js
const SECONDARY_LABEL = {
  'm3gim:auffuehrungsdatum': 'Aufführungsdatum',
  'm3gim:premieredatum': 'Premierendatum',
  // ... zwölf weitere Zeilen
};

export function secondaryYearForRecord(store, record) {
  for (const prop of TYPED_DATE_PROPS) {
    const v = record[prop];
    if (!v) continue;
    const values = Array.isArray(v) ? v : [v];
    for (const val of values) {
      if (typeof val !== 'string') continue;
      const y = extractYear(val.replace(/^(circa|vor|nach):/, ''));
      if (y) return { year: y, source: prop, label: SECONDARY_LABEL[prop] || 'typisiertes Datum' };
    }
  }
  const eventIds = store.recordToEvents?.get(record['@id']) || [];
  for (const eid of eventIds) {
    const ev = store.mobilityEvents.get(eid);
    if (ev && ev.date) {
      const y = extractYear(ev.date);
      if (y) return { year: y, source: '__ste', label: 'Ereignisdatum (STE)' };
    }
  }
  return null;
}
```

Nachher:

```js
export function secondaryYearForRecord(store, record) {
  const candidates = datingsByScope(store, record, 'attested');
  for (const d of candidates) {
    if (d.year) return { year: d.year, source: d.roleId, label: d.roleLabel };
  }
  return null;
}
```

Die Priorität steckt danach in `rank` am Rollenbegriff (A2), das Label kommt aus dem Vokabular (A1), und der Ausschluss der Erwähnungen ist explizit statt Nebenwirkung der Formzugehörigkeit (A3).

**2. Datumschips der Detailansicht** (`views/archive-inline-detail.js:381–393`).

Vorher, mit der Rohrolle als Prefix:

```js
function datedEventChipEls(datedEvents) {
  return datedEvents.map(d => buildRoleChip({
    prefix: d['m3gim:dateRole'] || 'genannt',
    value: formatDate(d['m3gim:dateValue']) || d['m3gim:dateValue'] || '?',
    cluster: 'datum',
    xlsxSource: extractXlsxSource(d),
  }));
}
```

Nachher, generisch über alle Datierungen einer Ebene:

```js
function datingChipEls(store, record, scope) {
  return datingsByScope(store, record, scope).map(d => buildRoleChip({
    prefix: d.roleLabel,
    value: formatDate(d.value) || d.value || '?',
    cluster: d.cluster,
    qualityFlag: d.qualityFlag,
    xlsxSource: d.xlsxSource,
  }));
}
```

Die Blockbildung in `buildRecordBlocks` ruft die Funktion dann zweimal, für `mentioned` und für `attested`, und der Aufrufer sieht die Trennung im Code statt in zwei Datenstrukturen.

**3. Jahresindex des Loaders** (`data/loader.js:283–305`).

Vorher, mit der Namensliste als Priorität:

```js
function firstTypedYear(record) {
  for (const prop of TYPED_DATE_PROPS) {
    const v = record[prop];
    if (!v) continue;
    const values = Array.isArray(v) ? v : [v];
    for (const val of values) {
      if (typeof val !== 'string') continue;
      const bare = val.replace(/^(circa|vor|nach):/, '');
      const y = extractYear(bare);
      if (y) return y;
    }
  }
  return null;
}

function indexByYear(store, record) {
  const year = extractYear(record['rico:date']) || firstTypedYear(record);
  if (year) { /* ... */ }
}
```

Nachher:

```js
function indexByYear(store, record) {
  const { year } = primaryYear(store, record);
  if (year) { /* ... */ }
}
```

**4. Farbcluster im Mobilitäts-Atlas** (`views/mobility-atlas.js:317–325`).

Vorher, mit einer Zeichenketten-Heuristik auf dem Rollennamen:

```js
function clusterForEvent(ev) {
  const role = (ev.role || '').toLowerCase();
  if (/datum$/.test(role)) return 'datum';
  if (role.includes('auffuehrung') || role.includes('aufführung')
      || role.includes('gastspiel') || role.includes('premiere')
      || role.includes('spielzeit') || role.includes('wiederaufnahme')) {
    return 'ort';
  }
  return 'neutral';
}
```

Nachher:

```js
const clusterForEvent = (store, ev) => roleCluster(store, ev.role);
```

### Welche Ansichten einfacher werden

- **Chronik.** Der größte Gewinn. Die Hand-Map und die zweifache Suchschleife entfallen, und die Regel „Erwähnungen gehören nicht auf die Lebenslinie" wird von einer Nebenwirkung zu einer benannten Bedingung. Das Badge am Chip (L20) bekommt sein Label aus den Daten.
- **Detailansicht und Wissenskorb.** Beide rendern über dieselbe Blocklogik. Aus zwei Sonderpfaden (`datedEventChipEls` für die eine Form, die Metadaten-Zeile für `rico:date`) wird ein generischer Pfad, und `m3gim:erstelldatum` sowie die übrigen heute unsichtbaren typisierten Datierungen erscheinen erstmals überhaupt im UI, weil sie heute an keiner Lesestelle angezeigt werden.
- **Mobilitäts-Atlas.** Verliert seine Heuristik. Der Tab ist verborgen, der Gewinn also latent.
- **Statistik.** Die Balkenbeschriftungen in L30 und L31 werden lesbar, ohne dass die Aggregation sich ändert.

### Welche Ansichten komplizierter werden

- **Bestand.** Die Datum-Spalte ist einwertig. Trägt ein Record nach der Zusammenführung mehrere gleichrangige Datierungen, muss die Spalte eine auswählen und die übrigen andeuten. Das ist eine neue Designentscheidung, die es heute nicht gibt. Unter A4-Variante 1 entfällt sie.
- **Karte.** `buildOccurrences` (L35 bis L38) zieht Belege aus zwei Quellen zusammen und dedupliziert über einen Schlüssel, der Rolle und Datum enthält. Mit mehreren Datierungen je Record vervielfachen sich die Belege eines Ortsbezugs, und der Dedup-Schlüssel muss um die Bezugsebene erweitert werden, sonst wachsen die Knotengrößen ohne fachlichen Grund.
- **Netzwerk.** Der Personen-zu-Jahre-Index (L45) sammelt heute je Person eine Jahresmenge aus einwertigen Record-Daten. Mit mehreren Datierungen je Record wird die Menge größer und die Zeitfenster-Filterung großzügiger, was mehr Personen im Fenster hält. Ob das gewollt ist, ist eine fachliche Frage.
- **Verknüpfungen.** Der Index invertiert `store.byYear` zu einer Eins-zu-eins-Abbildung Record auf Jahr (`views/_verknuepfungen-geometry.js:42–44`). Ein Record mit mehreren Jahren überschreibt sich dort still selbst, und zwar schon heute. Nach der Zusammenführung tritt der Fall häufiger auf, und der Index muss auf eine Jahresmenge umgestellt werden.

## 5. Risiken

### Was bricht laut

- Jeder direkte Zugriff auf einen der vierzehn Property-Namen. Das sind L2, L3, L6, L22 und die drei Hand-Maps L21, L63, L65. Diese Stellen werfen keinen Fehler, liefern aber sofort sichtbar falsche Ergebnisse, und die Chronik verlöre ihre gesamte Sekundärdatierung.
- `views/mobility-atlas.js:319`, sobald ein Rollenbegriff nicht mehr auf „datum" endet.
- `tests/test_25_chronik_mobility_cluster.py`, das `EVENT_ROLE_TO_MOBILITY_CLUSTER` per Regex aus `constants.js` liest und gegen die im Datenstand belegten `eventRole`-Werte prüft. Bei geänderten Rollenwerten schlägt es an, was hier erwünscht ist.
- `tests/test_18_typed_dates.py` und `tests/test_30_quality_and_dated_events.py`, die beide eine eigene Kopie der Property-Liste führen und Mindestvorkommen erwarten. `test_30` verlangt zusätzlich mindestens zehn `DatedEvent`-Einträge; verschwindet die Klasse, schlägt der Test fehl und muss mit der Modelländerung umgeschrieben werden.

### Was heute stumm funktioniert und danach auffiele

- **`m3gim:erstelldatum` fehlt in `TYPED_DATE_PROPS`.** Die Property steht in `knowledge/data.md` § 7, in `vocab/m3gim.ttl:260`, in `scripts/transform.py:112` und in der Property-Liste von `tests/test_30`, aber nicht in `data/loader.js:275–281`. Zehn Records tragen sie im aktuellen Export. Sichtbar wird der Fehler heute nicht, weil alle zehn zusätzlich ein `rico:date` haben, und der Fallback deshalb nie gebraucht wird. Dasselbe gilt für `m3gim:spielzeitBis`, das im Vokabular als von der Pipeline nicht befüllt vermerkt ist. Eine generische Schleife über alle Datierungen deckt beide Lücken auf.
- **Tote Zuweisung in `renderRows`** (L12). `const year = extractYear(r['rico:date'])` wird berechnet und nie gelesen. Bei einem Umbau fällt sie auf, weil die Zeile umgeschrieben werden muss.
- **Vier verschiedene Jahresbegriffe hinter einer Facette** (A4). Die Verknüpfungen-Ansicht filtert schon heute anders als Bestand und Chronik, weil sie den typisierten Fallback erbt und die anderen nicht. Ein Record, der nur ein Aufführungsdatum trägt, liegt für die eine Ansicht im Fenster und für die andere nicht. Da nur drei Records im aktuellen Export ohne `rico:date` eine typisierte Datierung tragen, bleibt der Unterschied unsichtbar. Nach einer Zusammenführung, die mehr Datierungen sichtbar macht, wächst der Unterschied.
- **Eins-zu-eins-Jahresindex der Verknüpfungen** (L49). Ein Record mit mehreren Jahren in `store.byYear` landet dort nur mit dem zuletzt gesehenen. Heute selten, danach der Normalfall.
- **`countLinks` ohne `hasSpatiotemporalEvent`.** Der Zähler berücksichtigt Agenten, Orte, Subjekte, `hasDatedEvent` und Performances, jedoch kein `m3gim:hasSpatiotemporalEvent`. Ein Record, dessen einzige Erschließung ein raumzeitliches Ereignis ist, gilt als unerschlossen. Verschiebt die Zusammenführung Datierungen von `hasDatedEvent` in eine Ereignisstruktur, verschärft sich diese Asymmetrie.

### Ansichten, die stillschweigend leer liefen

Drei Stellen prüfen auf die Präsenz eines bestimmten Feldnamens und liefern ohne Ausnahme ein leeres oder falsches Ergebnis, wenn der Name verschwindet.

1. `views/network.js:255`, `if (!rec || !rec['rico:date']) continue;`. Ohne `rico:date` bliebe `_personYears` leer, `_yearRange` behielte seine Initialwerte, und `personInTimeRange` blendete bei aktivem Zeitfilter jede Person aus, weil die Funktion an Zeile 274 für Personen ohne Jahresmenge ausdrücklich `false` zurückgibt. Der Netzwerk-Tab wäre bei gesetztem Zeitfenster leer, ohne Fehlermeldung.
2. `views/archive-holdings.js:408`, `const isUndated = !item.isKonvolut && !r['rico:date'];`. Ohne `rico:date` trüge jeder Record die Undatiert-Markierung und die Datum-Spalte zeigte durchgehend `o. D.`.
3. `utils/format.js:109`, `countLinks` über `m3gim:hasDatedEvent`. Bei einem umbenannten Träger sänken die Links-Zahlen, und Records, deren einzige Verknüpfung eine Datierung ist, verschwänden aus dem Default-Modus des Bestands und aus der Chronik. Im aktuellen Export ist kein Record betroffen; die Konstruktion bleibt riskant.

Ergänzend sind zwei Halb-Fälle zu nennen. `views/statistics-data.js:249` prüft `typeof ev.date !== 'string' || ev.date.length < 4` und überspringt still; bei einem anderen Datumsformat blieben die Dekaden-Stapel leer, während die Caption weiterhin eine Gesamtzahl nennt. `views/entity-map-data.js:106` setzt das Belegdatum auf `null`, wenn `rico:date` fehlt; die Belege blieben sichtbar, fielen aber aus jeder Zeitfenster-Aussage heraus, weil `inWindow` (L41) undatierte Belege durchlässt.

### Fehlende Tests

Die Testsuite deckt die Pipeline-Seite der Datierungen gut ab und die Frontend-Seite kaum. Sechs Lücken sind für den Umbau tragend.

1. **Kein Test hält `TYPED_DATE_PROPS` gegen die Daten.** `test_25` leistet für `eventRole` genau das, es liest die JS-Konstante und verlangt für jede im Datenstand belegte Rolle einen Eintrag. Ein Gegenstück für die Datumsproperties existiert nicht, weshalb `m3gim:erstelldatum` seit seiner Einführung fehlt. Vor dem Umbau ist dieser Test der billigste Gewinn, danach ersetzt ihn ein Test auf Vollständigkeit des Rollenvokabulars.
2. **Kein Test sichert die Trennung der Bezugsebenen.** Dass Erwähnungen nicht in den Zeitstrahl gelangen, steht heute ausschließlich in einem Kommentar. Ein JS-Unit-Test auf `secondaryYearForRecord` mit einem Fixture-Record, der nur eine `erwähnt`-Datierung trägt und `null` liefern muss, schließt die Lücke. Er würde nach einer naiven Zusammenführung sofort rot.
3. **Kein Test sichert die Reihenfolge.** Weder die Priorität zwischen Rollen noch die Chip-Reihenfolge innerhalb eines Records ist geprüft. Ein Fixture mit Aufführungs- und Überweisungsdatum, der das Aufführungsjahr liefern muss, macht die Priorität zur Zusicherung.
4. **`recordYear` ist nur für `rico:date` geprüft.** `tests/frontend/filter-sync.test.mjs:71` prüft genau diesen Fall. Ein Test, der die vier Auflösungen aus A4 gegen denselben Fixture-Record laufen lässt und dasselbe Jahr verlangt, würde die heutige Divergenz sichtbar machen und ist die Absicherung für A4-Variante 2.
5. **Kein Test auf Rollen-Label-Auflösung.** `tests/frontend/loader.test.mjs` prüft die Auflösung des Dokumenttyp-Labels über `dftLabel` end-to-end. Der Test ist die Vorlage für das Gegenstück an `roleLabel`, sobald A1 die Concepts liefert.
6. **Der Playwright-Smoke prüft keine Datumschips.** `tests/frontend/smoke.py:374–390` verankert den Ereignischip (`ZIELORT` mit Datum `—`), und der Log-Stempel der Chronik (`smoke.py:149`) prüft die Schlüssel `datiert`, `undatiert` und `sicht-gedeckt` nur auf Anwesenheit; die Werte bleiben ungeprüft. Ein Anker auf den Block „Im Dokument genannte Daten" und ein Vorher-Nachher-Vergleich der Stempelwerte für `datiert` und `undatiert` fangen die stille Wanderung der acht Records aus § 2 ab.

Ein siebter, weicherer Punkt betrifft die verborgenen Tabs. Mobilitäts-Atlas, Biogramm und Repertoire tragen zusammen sechs Lesestellen und keinen einzigen Test. Ihre Stilllegung ist laut `knowledge/frontend-architecture.md` operator-offen. Vor dem Umbau ist zu entscheiden, ob sie mitgezogen oder entfernt werden; sie mitzuziehen kostet Aufwand für Code, den niemand sieht.

## Zusammenfassung der Anforderungen

| Nr. | Anforderung | Prüfbar an |
|---|---|---|
| A1 | Die Rolle liefert ihre Anzeigeform aus den Daten, über `m3gim-role:`-Concepts im `@graph` und einen Anzeige-Label am Concept | Wegfall von `SECONDARY_LABEL`, `STE_ROLE_DISPLAY` und des Datumsrollen-Blocks in `ROLE_CLUSTER` |
| A2 | Mehrere Datierungen behalten eine Reihenfolge, über einen Rang am Rollenbegriff und eine zugesicherte Reihenfolge je Record | Fixture mit zwei Datierungen liefert deterministisch dieselbe Auswahl und dieselbe Chip-Folge |
| A3 | Jede Datierung nennt ihre Bezugsebene als eigenen kontrollierten Term, unabhängig von der Rolle | Record mit ausschließlich erwähnter Datierung bleibt im Undatiert-Block der Chronik |
| A4 | Ein Zeitanker je Record bleibt einwertig und benannt, entweder als fortbestehendes `rico:date` oder als eine Funktion, auf die alle fünf Ansichten umgestellt werden | Derselbe Fixture-Record liefert in Bestand, Chronik, Netzwerk, Karte und Verknüpfungen dasselbe Jahr |
