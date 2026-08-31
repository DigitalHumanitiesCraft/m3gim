# Frontend-Fehlersuche und testgetriebene Behebung

Repo `DHCraft/m3gim`, Branch `main`, Datenstand `docs/data/m3gim.jsonld` (byte-gleich mit `data/output/m3gim.jsonld`, gesichert durch `tests/test_33_frontend_data_fresh.py`).

## Ausgangslage

Beide Suiten waren vor jeder Änderung grün.

- `node --test tests/frontend/*.test.mjs` — 234 Tests, 234 pass, 0 fail.
- `pytest tests/ -m "not slow"` — 355 passed, 1 deselected, 2 xfailed.
- `pytest -m frontend tests/frontend/` (Playwright 1.58 war bereits installiert, keine Installation nötig) — 1 passed.

Vorbestehende, fremde Arbeitskopie-Änderungen zu Sessionbeginn: `knowledge/data-errors.md`, `knowledge/journal.md`, untracked `data/reports/bayreuth-1953-source-analysis.md`. Diese blieben unangetastet.

## Endstand

- `node --test tests/frontend/*.test.mjs` — 254 Tests, 254 pass, 0 fail.
- `pytest tests/ -m "not slow"` — 355 passed, 1 deselected, 2 xfailed.
- `pytest -m frontend tests/frontend/` — 1 passed.

```
 docs/js/data/constants.js                |   7 +-
 docs/js/data/loader.js                   |  25 ++++---
 docs/js/main.js                          |   3 +-
 docs/js/views/_network-geometry.js       |  51 +++++++++++----
 docs/js/views/basket.js                  |  23 +++++--
 docs/js/views/statistics-data.js         |   9 ++-
 tests/frontend/loader.test.mjs           |  95 +++++++++++++++++++++++++++
 tests/frontend/network-geometry.test.mjs | 109 +++++++++++++++++++++++++++++++
```

Neu und untracked: `tests/frontend/_shipped.mjs` (geteilter Zugriff auf den ausgelieferten Datensatz), `tests/frontend/event-year-count.test.mjs`. Ebenfalls in `git status`, aber nicht von mir: die beiden `knowledge/`-Dateien und der Bayreuth-Report.

## Fix 1, Regie-Ausnahmen der Wagner-Familie

**Fehlerbild.** Wieland und Wolfgang Wagner fehlten im Netzwerk-Tab, obwohl sie mit 35 und 18 Dokumenten zu den bestbelegten Personen des Bestands gehören. Der Befund hatte zwei voneinander unabhängige Ursachen; die zweite kam aus dem parallelen Test-Audit und wurde am echten Store nachgemessen.

**Ursache A, Schlüsselform.** `docs/js/data/constants.js:22` führte die Ausnahmen als `'wieland wagner'`/`'wolfgang wagner'`, der Datensatz schreibt `Wagner, Wieland`. Der `includes`-Vergleich in `getPersonKategorie` (`docs/js/utils/normalize.js:29`) traf damit nie, beide bekamen die Kategorie `Komponist` und fielen durch `isPureComposer` aus dem Netzwerk.

**Ursache B, fehlende Wortgrenze.** `docs/js/views/_network-geometry.js:129` verglich mit `lower.includes(composer)`. Der Listeneintrag `'wolf'` traf jedes `Wolfgang` und `Wolfram`, `'verdi'` das `Monteverdi`. Zusätzlich genügte ein geteilter Nachname allein: der Bassist `Weber, Ludiwig` und die Sängerin `Schubert, Erika` fielen heraus, obwohl sie im Bestand nie als Komponist auftreten.

**Messung am echten Store.** Vorher entfernte `isPureComposer` 31 Personen aus dem Netzwerk, 14 davon ohne jede Komponisten-Rolle, darunter `Wagner, Wieland` (35 Dok.), `Wagner, Wolfgang` (18), `Witte, Wolfgang` (5), `Wagner, Gertrud` (5). Nachher sind es 16, jede einzelne mit belegter Rolle `komponist`.

**Fix.** Die beiden Schlüssel stehen jetzt in der Kommaform des Datensatzes. `isPureComposer` verlangt zwei Bedingungen: der Name trägt als eigenes Wort-Token den Nachnamen eines gelisteten Komponisten (`nameTokens`/`hasComposerSurname`, Trennung an Nicht-Buchstaben), und die Person tritt im Bestand als Komponist auf. Liegt kein Rollenbeleg vor, entscheidet weiterhin die Kategorie. Eine kuratierte Nicht-Komponisten-Kategorie aus `PERSONEN_KATEGORIEN` schließt die Ausfilterung generell aus; das war zuvor nur für `Regisseur` formuliert und hätte sonst Paul Hindemith (7 Dok., Kategorie `Dirigent`, Rollen dirigent und komponist) neu herausgeworfen.

**Tests.** `tests/frontend/network-geometry.test.mjs`, sieben neue Fälle:

- `Kette: Regie-Ausnahmen der Wagner-Familie bleiben im Netzwerk` — führt `getPersonKategorie` und `isPureComposer` in der Reihenfolge, in der der Loader sie führt, mit den echten Schreibweisen.
- `Kette: Werk-Komponisten bleiben gefiltert` — Gegenprobe.
- `Kette am erzeugten Datensatz: Wieland und Wolfgang Wagner sind Knoten, Richard nicht` — voller Weg JSON-LD, `loadArchive`, `computeLayout`.
- `isPureComposer: Vorname Wolfgang ist kein Komponisten-Nachname`
- `isPureComposer: geteilter Nachname ohne Komponisten-Rolle bleibt drin`
- `isPureComposer: derselbe Nachname mit Komponisten-Rolle faellt heraus`
- `isPureComposer: kuratierte Nicht-Komponisten-Kategorie schuetzt trotz Komponisten-Rolle`
- `Kette am erzeugten Datensatz: nur belegte Komponisten fallen aus dem Netzwerk` — misst die Gesamtzahl der zu Unrecht Entfernten.
- `Kette am erzeugten Datensatz: kuratierte Kategorien bleiben im Netzwerk`

Alle waren rot, alle sind grün. Die bestehenden Fälle ab Zeile 128, die die Kategorie von Hand verdrahten, bleiben unverändert und weiterhin grün; sie prüfen die Filterlogik, die neuen prüfen ihre Speisung.

**Diff-Umfang.** `constants.js` +5/-2 (Schlüssel plus erklärender Kommentar), `_network-geometry.js` +37/-14 (zwei neue Hilfsfunktionen, umgebaute Bedingung, Doc).

## Fix 2, Konvoluttitel aus der Sammel-Zeile

**Fehlerbild.** 14 von 17 Konvoluten trugen im Bestand keinen Titel, sondern nur ihre Signatur.

**Ursache.** `docs/js/data/loader.js:295` suchte die Sammel-Zeile mit `endsWith('_sammlung')`. `scripts/transform.py:882` vergibt seit der Umbenennung `_collection`. Im Datensatz stehen 12 `_collection`-Records und 0 `_sammlung`-Records.

**Fix.** Suffix im Loader nachgezogen, Kommentar auf die vergebende Stelle in der Pipeline umgestellt. Kein zweites Suffix zur Sicherheit, damit die nächste Umbenennung wieder auffällt.

**Tests.** `tests/frontend/loader.test.mjs`, Block `Konvolut-Titel aus der Sammel-Zeile`:

- `jedes Konvolut mit Sammel-Record traegt dessen Titel` — prüft die semantische Invariante am ausgelieferten Datensatz statt einer Zahl, mit Mindestvorkommen von 10 Sammel-Records als Trivialitätsschutz.
- `die deutliche Mehrheit der Konvolute traegt einen Titel` — Untergrenze 15.

Vorher rot mit der vollständigen Liste der 12 verlorenen Titel, nachher grün. Nach dem Fix tragen 15 von 17 Konvoluten einen Titel; `NIM_005` und `NIM_168` haben weder einen Folio- noch einen Sammel-Record und fallen zu Recht auf die Signatur zurück.

**Diff-Umfang.** `loader.js`, Teil der Gesamtänderung +16/-9.

**Browser-Beleg.** Im Bestand-Tab stehen jetzt „Kritiken" (NIM_004), „Bayreuth" (NIM_011), „1953 / Bayreuth" (NIM_137), „Ira Malaniuk, Verträge und Vereinbarungen" (NIM_022, NIM_023) und die übrigen in der Konvolutzeile.

## Fix 3, doppelt vergebene Q-ID im Personen-Index

**Fehlerbild.** Wieland Wagner (35 Dokumente) trug im Indizes-Tab keine einzige Beziehung, obwohl acht AgRelOn-Relationen ihn benennen.

**Ursache.** `docs/js/data/loader.js:900-914` baute `personsByQid` mit `set()` ohne Kollisionsprüfung. Die Tippfehlervariante `Wagner, WIeland` trägt dieselbe Q-ID `wd:Q60465` bei einem einzigen Dokument und stand in der Iterationsreihenfolge hinten; als letzter Schreiber gewann sie die Q-ID. Weil die Q-ID-Auflösung Vorrang vor dem Namen hat, landeten alle acht Relationen dort. Alle acht benennen im JSON-LD ausdrücklich `Wagner, Wieland`.

**Fix.** Deterministische Vorrangregel beim Aufbau der Map: der Eintrag mit mehr Records gewinnt, bei Gleichstand der zuerst gesehene (`>=` im Vergleich). Drei Kommentarzeilen benennen den Grund.

**Tests.** `tests/frontend/loader.test.mjs`, Block `Doppelt vergebene Q-ID im Personen-Index`:

- `Relationen landen am belegstaerksten Eintrag der Q-ID` — allgemein über alle Q-ID-Gruppen mit mehr als einem Eintrag, mit Gegenstandsprüfung („kein Datenstand mit doppelt vergebener Q-ID" schlägt fehl).
- `Anker: Wieland Wagner haelt seine Beziehungen unter der kanonischen Schreibweise` — der konkret gemeldete Fall.

Vorher rot mit `wd:Q60465: 'Wagner, Wieland' (35 Records) haelt 0 von 8 Relationen`, nachher grün: kanonische Schreibweise 8, Tippfehlervariante 0.

**Diff-Umfang.** `loader.js`, Teil der Gesamtänderung +16/-9.

## Fix 4, zwei Zählwege für datierte Ereignisse

**Befund zum Handoff-Punkt.** Der dort genannte Belegfall `nach:1956` an NIM_004_24 und NIM_004_29 fällt heute nicht mehr auseinander. `splitQualifier` im Loader trennt den Qualifier ab, bevor eine Ansicht den Wert sieht, und legt zusätzlich das aufgelöste Jahr als `year` an der Annotation ab. Beide Wege liefern am Datenstand identisch 82 von 125 Mobilitäts-Ereignissen. Der Handoff-Punkt ist insoweit überholt.

**Was reproduzierbar bleibt.** Die zweite malformte Datierung `06-09` (zweimal, an NIM_004_34). `docs/js/views/statistics-data.js:251` schnitt die ersten vier Zeichen ab und gab sie an `parseInt`; aus `06-0` wird die Zahl 6. `aggregateDecadesBySicht` bucht daraufhin ein Jahrzehnt 0, und weil die Achse die Lücke zwischen kleinstem und größtem Jahrzehnt auffüllt, entstehen 190 leere Jahrzehnt-Zeilen. Sichtbar wird das heute nur deshalb nicht, weil die beiden betroffenen Annotationen keinen Ort tragen und damit nicht in `store.mobilityEvents` stehen; jede Ortsergänzung an der Quelle würde die Stapelgrafik zerstören. `docs/js/main.js:117` prüfte parallel mit `/\d{4}/` irgendwo im Wert und wäre bei `06-09` zum gegenteiligen Ergebnis gekommen.

**Fix.** Beide Stellen lösen das Jahr über `extractYear` aus `docs/js/utils/date-parser.js` auf. `main.js` importiert den Parser neu.

**Tests.** `tests/frontend/event-year-count.test.mjs`, neu:

- `die Statistik zaehlt genau die Datierungen mit aufgeloestem Jahr` — stellt beide Wege am ausgelieferten Datensatz gegeneinander. Geprüft wird über die vollständige Annotationsmenge desselben Ladelaufs, weil die verorteten Annotationen den jahrlosen Fall heute nur zufällig nicht enthalten; die Objekte stammen sämtlich aus dem echten Loader. Vorher rot mit „zaehlt 342, der Loader loest 340 Jahre auf. Differenz: 06-09, 06-09".
- `die Jahrzehnt-Achse beginnt am kleinsten aufgeloesten Jahr` — datenadaptiv gegen das kleinste real aufgelöste Jahr, nicht gegen eine feste Schranke. Vorher rot mit „190 Jahrzehnt-Zeilen ausserhalb". Die legitim frühen Datierungen 1872 und 1876/1953 (Erwähnungen) bleiben zulässig.
- `die verortete Teilmenge zaehlt genauso` — Regressionsschloss für den heute sichtbaren Pfad.
- `kein Modul leitet ein Jahr selbst aus einem Datumswert ab` — lexikalische Prüfung über alle Frontend-Module nach dem Muster von `year-anchor.test.mjs`, weil die Diagnostik in `main.js` nicht exportiert ist. Vorher rot mit `main.js:117`, `basket.js:280`, `statistics-data.js:251`.

**Diff-Umfang.** `statistics-data.js` +6/-3, `main.js` +2/-1.

## Fix 5, Jahresangabe im BibTeX-Export

Eigener Befund aus derselben Fehlerklasse, aufgedeckt durch die lexikalische Prüfung aus Fix 4.

**Fehlerbild.** `docs/js/views/basket.js:280` las das BibTeX-Jahr aus dem gerenderten deutschen Anzeigedatum von `rico:date` (`formatDate(...).match(/\d{4}/)`). Ein Record ohne `rico:date`, dessen Jahr an einer ankernden Datierung hängt, exportierte ohne Jahresfeld. Am Datenstand betrifft das sechs Records, darunter NIM_004/24 (1947), NIM_023/6 (1953), NIM_139/104 (1956). Der Zeitanker-Vertrag aus `year-anchor.test.mjs` verlangt für genau diese Records ein Jahr.

**Fix.** `primaryYear(storeRef, r).year` statt der Regex über den Anzeigetext. Um den Export prüfbar zu machen, ist der Textaufbau vom Download getrennt: `buildBibTeX(ids, storeRef)` ist exportiert und rein, `exportBibTeX(ids)` reicht sein Ergebnis an `downloadFile` weiter. Das schließt die in `knowledge/testing.md` § Abgrenzungen ausdrücklich vermerkte Testlücke, deren Vorbedingung dort als Eingriff in den Frontend-Code benannt ist.

**Tests.** `tests/frontend/event-year-count.test.mjs`, Block `Jahresangabe im BibTeX-Export`:

- `ein Record mit abgeleitetem Jahr exportiert dieses Jahr` — über alle Records ohne `rico:date` mit aufgelöstem Ankerjahr, am echten Datensatz.
- `ein Record mit eigenem rico:date behaelt sein Jahr` — Gegenprobe gegen Überkorrektur.

Vorher rot (Modul exportierte `buildBibTeX` nicht, danach fehlende Jahresfelder), nachher grün.

**Diff-Umfang.** `basket.js` +18/-5.

## Fix 6, Datumsartefakt im Ortsindex

Eigener Befund aus dem Browserlauf.

**Fehlerbild.** `06-09` stand als Ort im Indizes-Tab, in der Ortsauswahl der Bestand-Toolbar und in der Liste der unverorteten Orte der Karte.

**Ursache.** `docs/js/data/loader.js:519` wirft Datumswerte aus dem Ortsindex, prüft dafür aber auf vier führende Ziffern (`/^\d{4}(-\d{2}){0,2}/`). Die Monats-Tages-Form `06-09` kam durch. Dieselbe Mustergrenze steht in `tests/test_06_frontend_contract.py:15`, weshalb der pytest-Kontrakt den Fall ebenfalls nicht sieht (dort nicht geändert, außerhalb meines Schreibbereichs).

**Fix.** Zusätzliche Bedingung vor der bestehenden: ein Ortsname trägt mindestens einen Buchstaben (`/\p{L}/u`). Der Datensatz enthält 59 Ortsnamen, genau einer davon ist buchstabenlos, und keiner beginnt mit vier Ziffern; die alte Prüfung bleibt für künftige Formen wie „1944-05 Wien" stehen.

**Test.** `tests/frontend/loader.test.mjs`, `kein Ortsname ohne einen einzigen Buchstaben`, mit Untergrenze von 40 Orten gegen Überfilterung. Vorher rot mit `06-09`, nachher grün. Im Browser sinkt der Orte-Index sichtbar von 58 auf 57.

**Diff-Umfang.** `loader.js`, Teil der Gesamtänderung +16/-9.

## Browserlauf

Lokaler `python -m http.server 8765 --directory docs`, Chromium headless über Playwright. Drei Durchläufe: Tab-Durchlauf, Interaktionslauf, Selektor-Verifikation. Der Server ist wieder gestoppt.

**Ergebnis.** Keine Konsolenfehler, keine `pageerror`, kein Fehler-Banner, keine leere View über alle acht sichtbaren Tabs (`bestand`, `chronik`, `statistik`, `indizes`, `karte`, `netzwerk`, `verknuepfungen`, `korb`). Alle logStamps erscheinen vollständig:

```
[chronik]        records:148 | jahre-belegt:15 | datiert:122 | sekundaer:6 | undatiert:26 | sicht-gedeckt:66 | spanne:1919–2009
[statistik]      records:892 | events:125 | personen:456 | ansichten:8 | aktiv:wohin-wann | spanne:1919-2010 | undatiert:341 | sicht:alle | land:alle
[indizes]        personen:456/456 | organisationen:143/143 | orte:57/57 | werke:142/142
[karte]          entitaeten:599 | orte:26 | belege:415 | unverortet:44 | jahre:1944-1968
[netzwerk]       total:163 | ring1:50 | ring2:113 | agrelon:19
[verknuepfungen] fokus:Malaniuk, Ira | schaerfe:weit | ort:— | zeit:alle | knoten:48 | ... | gekappt:626
[korb]           eintraege:0 | aufgeloest:0 | events:0 | finanzen:0
```

Der `[bestand]`-Stempel erscheint beim Erstaufruf und danach nicht erneut, weil `renderTab` lazy rendert; das ist so gebaut.

Interaktiv geprüft und funktionsfähig: Bestand-Suche („Bayreuth" ergibt 43 von 148 bearbeiteten Einheiten), Erschließungs-Toggle (866 Einheiten, 148 erschlossen, 718 nicht erschlossen), Netzwerk-Namenssuche (nach „Wagner" sind 155 Knoten gedimmt, die Treffer bleiben voll deckend), alle acht Statistik-Ansichten durchgeklickt, Verknüpfungen-Graph mit 49 Knoten und Schärfegrad-Caption, Inline-Detail eines Records.

**Gemeldete Fälle.**

- *Konvoluttitel im Bestand* — nach Fix 2 sichtbar, siehe oben.
- *Wagner-Suche im Netzwerk* — Wieland und Wolfgang erscheinen jetzt als Knoten, ebenso Gertrud, Siegfried und Ellen. Richard Wagner erscheint weiterhin nicht, siehe offene Entscheidungen.
- *Person Herminghaus* — `Herminghaus, A. E.`, ein Dokument, Rolle `unterzeichner`, keine AgRelOn-Relation, keine Q-ID, Kategorie `Andere`. Damit Ring 3, also die dokumentierte Ausblendung einmaliger Nennungen. Nicht gefixt, wie vorgegeben. Im Indizes-Tab ist die Person auffindbar (Suche „Herminghaus" liefert 1 von 456).
- *Ort Wuppertal* — im Ortsindex vorhanden (ein Dokument, Rolle `auffuehrungsort`), zusätzlich zwei Organisationen „Chorgemeinschaft Wuppertal" und „Volksbühne Wuppertal". Auf der Karte fehlt der Ort, weil ihm die Q-ID und damit die Koordinate fehlt; er steht in der Gruppe „26 Orte ohne Koordinate". Das ist eine Lücke der Normdatenanreicherung, kein Frontend-Fehler. 32 der 57 Orte tragen keine Q-ID.

## Gefundene, nicht gefixte Punkte

**Offene Entscheidungen (Design, ausdrücklich nicht geändert).**

1. *Ring-3-Ausblendung im Netzwerk.* Personen mit einer einzigen Nennung und ohne Relation werden nicht gezeichnet. Betrifft den gemeldeten Fall Herminghaus. Dokumentiert in `frontend-architecture.md` § Netzwerk und im Modul-Docstring.
2. *Ausschluss reiner Werk-Komponisten aus dem Personen-Netzwerk.* Richard Wagner ist mit 27 Dokumenten die nach Malaniuk am besten belegte Person und bleibt draußen, ebenso Strauss (9), Mozart (10), Beethoven (9). Für die Forschungsfrage „mit welchen Personen stand Malaniuk in Beziehung" ist das vertretbar, für „welches Repertoire trägt der Bestand" nicht; der Repertoire-Tab, auf den der Docstring verweist, existiert seit E-140 nicht mehr. Entscheidung der Projektleitung.
3. *TOP_N-Kappung im Verknüpfungen-Tab.* Die Caption weist 626 gekappte Knoten bei 48 gezeichneten aus. Die Kappung wird korrekt benannt, ihre Höhe ist eine Designfrage.
4. *Default-Schärfegrad `weit`.* Unverändert, wie in `frontend-architecture.md` § Milestone-4-Stand als offen vermerkt.
5. *Monteverdi.* `Monteverdi, Claudio` (1 Dokument, Rolle `komponist`) wurde vorher nur durch den Teilstring-Treffer `verdi` gefiltert und erscheint nach dem Wortgrenzen-Fix im Netzwerk. Sachlich ein Werk-Komponist; die Aufnahme in `KOMPONISTEN_NAMEN` ist eine einzeilige Pflege der kuratierten Liste und damit eine redaktionelle Entscheidung, die ich nicht selbst getroffen habe.

**Datenbefunde für das Erschließungsteam (Quelle, nicht Frontend).**

6. *Tippfehler-Dubletten im Personen-Index.* `Wagner, WIeland` gegen `Wagner, Wieland` (gleiche Q-ID, Ursache von Fix 3), `Wagner, Siegfied` gegen `Wagner, Siegfried`, `Weber, Ludiwig` gegen `Weber, Ludwig`, `Wagner, Wieland Gottfried` als dritte Variante desselben Regisseurs. Der Loader trägt sie jetzt verlustfrei, zusammengeführt sind sie damit nicht. Ein Frontend-Workaround, der Tippfehlerformen als Schlüssel aufnimmt, wäre genau die stille Kaschierung, die `test_24` für Komponistennamen ausdrücklich ablehnt.
7. *Malformte Datierung `06-09`* an NIM_004_34 (zweimal). Ursache von Fix 4 und Fix 6.
8. *`nicht eingehalten`* erreicht das Frontend als deutscher Rohtext in der Rollenposition, während alle 25 übrigen Annotationsrollen `m3gim-vocab:`-Kennungen sind. Frontend-seitig in `LITERAL_ROLE_SCOPE` und `ANNOTATION_ROLE_CLUSTER` ausdrücklich abgefangen, also kein Fehler, aber eine Modellinkonsistenz.
9. *Adressgenaue Orte* rollen über `cityOf` korrekt auf Zürich und München hoch, führen aber fünf beziehungsweise zwei getrennte Einträge im Ortsindex, darunter die Schreibvariante `Zürich, Zurichbergstrasse 104` ohne Umlaut.

**Nicht behobene Schwächen mit geringer Wirkung.**

10. *`getPersonKategorie` vergleicht weiterhin ohne Wortgrenze.* Am Datenstand entstehen drei Treffer über einen Vornamen: `Hoelscher, Ludwig`, `Weber, Ludwig` und `Suthaus, Ludwig` bekommen die Kategorie `Kollege` über den Schlüssel `'ludwig'`. Alle drei sind sachlich Kolleginnen und Kollegen, der Treffer ist also zufällig richtig. Die Kategorie steuert nach Fix 1 nur noch die Ringzuordnung und den Schutz vor der Komponisten-Ausfilterung; die Knotenfarbe kommt aus `derivePersonKategorie` über die echten Rollen. Eine Umstellung auf Wortgrenzen müsste die Mehrwort-Schlüssel (`'wolf, hugo'`, `'della casa'`, `'wagner, wieland'`) mittragen und wäre ohne belegten Schaden reine Vorsorge.
11. *Elf Schlüssel in `PERSONEN_KATEGORIEN` treffen im Datenstand niemanden* (`tschaikowsky`, `krauß`, `solti`, `kempe`, `kolessa`, `felsenstein`, `baumgartner`, `jurinac`, `vickers`, `rehfuss`, `callas`), ebenso 19 der Schlüssel in `PERSONEN_NORMALISIERUNG`. Tote Einträge ohne Wirkung; ihre Pflege ist redaktionell.
12. *Doku-Drift in `knowledge/frontend-architecture.md`.* Die CSS-Dateien heißen dort `archiv`, `indizes`, `korb`, `netzwerk` und es werden `mobility-atlas`, `repertoire`, `biogramm` genannt; tatsächlich liegen unter `docs/css/` die Dateien `archive.css`, `indexes.css`, `basket.css`, `network.css`, `sidebar.css`, `statistics.css`, `verknuepfungen.css`, und die drei genannten existieren nicht mehr. `knowledge/` war für mich schreibgeschützt.

**Geprüft und in Ordnung.** Kein Frontend-Modul liest die rohen JSON-LD-Schlüssel dort, wo der Store flach abbildet (`agrelon:hasObject`, `atPlace`, `hasDetail`), also kein Rückfall in den Session-35-Dedup-Fehler. Kein toter Vokabularverweis: von allen `rico:`-, `agrelon:`-, `skos:`- und `m3gim-ontology:`-Literalen im Frontend fehlen im Datensatz nur `agrelon:hasEndDate` (Gegenstück zum vorhandenen `hasBeginDate`, null-sicher gelesen) und `m3gim-vocab:unfulfilledDating` (im Vokabular deklariert, im Datenstand unbelegt, Gegenstand von `test_46`). Keine toten Asset-Verweise in den fünf HTML-Dateien. Kein toter CSS-Selektor beim Bestand: die Zeilen tragen nur Modifier-Klassen, und die CSS-Regeln greifen genau diese. Alle AgRelOn-Typen und alle Sprachwerte finden ihr Label. `ROLE_CLUSTER`, `ROLE_TO_SECTION`, `STE_ROLE_DISPLAY` und `ANNOTATION_ROLE_CLUSTER` sehen von außen ungenutzt aus, werden aber innerhalb von `constants.js` von den exportierten Hilfsfunktionen konsumiert; kein toter Code.

## Verifikation

Jede Angabe oben stammt aus einem Lauf gegen den realen Dateizustand. Die Vorher-Zahlen sind gegen einen `git archive HEAD`-Auszug in einem Scratchpad-Verzeichnis gemessen, nicht aus dem Gedächtnis rekonstruiert: 31 entfernte Personen, 3 von 17 Konvoluten mit Titel, 58 Orte, Wieland Wagner mit 0 und die Tippfehlervariante mit 8 Relationen. Die Nachher-Zahlen stammen aus demselben Skript gegen den Arbeitsstand: 16 entfernte Personen, 15 von 17 Konvoluten mit Titel, 57 Orte, 8 gegen 0 Relationen. Jeder neue Test war vor seinem Fix rot und ist danach grün; die Rot-Meldungen sind oben je Fix wörtlich zitiert. Keine Commits, kein Staging.
