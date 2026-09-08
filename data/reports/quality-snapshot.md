# M³GIM Quality-Snapshot

_Laufzeit des Reports: 2026-09-08T17:43+02:00_

Grundlage: `data/output/m3gim.jsonld` + `data/output/wikidata-reconciliation.json`.

## Gezählte Menge

Alle Zahlen dieses Reports beziehen sich auf **997 Records**. Der Graph führt **1007** Knoten vom Typ `rico:Record`; die Differenz von 10 sind 3 Folio-Platzhalter, entstanden aus innerhalb eines Konvoluts wiederholten Kopfzeilen der Objekttabelle, deren Folio-Zelle den Text „Folio“ trägt, und 7 Foliodatensätze, die die Pipeline über den Seiten eines Blattes bildet. Weder die einen noch die anderen tragen eine eigene Erschließung und zählen deshalb nicht mit.

| Platzhalter | Quellzeile |
|---|---:|
| UAKUG/NIM_003 Folio | Objekte 30 |
| UAKUG/NIM_004 Folio | Objekte 41 |
| UAKUG/NIM_007 Folio | Objekte 116 |

## Verknüpfungsrate

- **188/997** Records mit mindestens einer Verknüpfung = **19%**

### Konvolute mit mehreren Folios

| Konvolut | Records | verlinkt | Rate |
|---|---:|---:|---:|
| UAKUG/NIM_003 | 10 | 3 | 30% |
| UAKUG/NIM_004 | 34 | 32 | 94% |
| UAKUG/NIM_005 | 30 | 16 | 53% |
| UAKUG/NIM_006 | 10 | 0 | 0% |
| UAKUG/NIM_007 | 29 | 28 | 97% |
| UAKUG/NIM_008 | 41 | 0 | 0% |
| UAKUG/NIM_011 | 22 | 21 | 95% |
| UAKUG/NIM_016 | 20 | 19 | 95% |
| UAKUG/NIM_022 | 7 | 3 | 43% |
| UAKUG/NIM_023 | 15 | 13 | 87% |
| UAKUG/NIM_043 | 14 | 0 | 0% |
| UAKUG/NIM_073 | 48 | 5 | 10% |
| UAKUG/NIM_134 | 86 | 4 | 5% |
| UAKUG/NIM_135 | 149 | 6 | 4% |
| UAKUG/NIM_136 | 38 | 3 | 8% |
| UAKUG/NIM_137 | 59 | 17 | 29% |
| UAKUG/NIM_139 | 158 | 11 | 7% |
| UAKUG/NIM_142 | 37 | 7 | 19% |
| UAKUG/NIM_168 | 2 | 0 | 0% |

### Einzelobjekte (aggregiert)

- **0/188** Einzelobjekte verlinkt (0%), verteilt auf 188 Signaturen (Plakate, Tonträger, Einzelstücke).

## Bearbeitungsstand

| Status | Records |
|---|---:|
| (leer) | 493 |
| zurueckgestellt | 317 |
| abgeschlossen | 144 |
| begonnen | 43 |

## Wikidata-Abgleich

- 196 Abgleiche ausdrücklich freigegeben; 234 Kandidaten ohne Freigabe; 171 ohne Treffer.
- 13 Einträge vom Abgleich ausgenommen (bereits mit Q-ID oder zu kurz).
Automatische Treffer werden erst nach ausdrücklicher Prüfung in den Datensatz übernommen. Bereits im Quellindex erfasste Kennungen bleiben eigene Quellenangaben.

### Nach Typ und Abgleichsverfahren

| Typ | manual | exact | alias | fuzzy_high | fuzzy_low | gesamt |
|---|---:|---:|---:|---:|---:|---:|
| person | 72 | 4 | 0 | 166 | 0 | 242 |
| org | 40 | 2 | 0 | 5 | 0 | 47 |
| location | 21 | 26 | 13 | 5 | 0 | 65 |
| work | 63 | 10 | 0 | 3 | 0 | 76 |

### Kandidaten zur manuellen Prüfung

**234 Kandidaten** benötigen eine belegte Identitätsprüfung. Ein Ähnlichkeitsscore ist kein Identitätsnachweis. Bestätigte Einträge erhalten `manual_review: approved`.

| Typ | Name | → | Q-ID | Label | Score |
|---|---|---|---|---|---:|
| location | Barcelona | → | [Q1492](https://www.wikidata.org/wiki/Q1492) | Barcelona | 100 |
| location | Basel | → | [Q78](https://www.wikidata.org/wiki/Q78) | Basel | 100 |
| location | Belgrad | → | [Q3711](https://www.wikidata.org/wiki/Q3711) | Belgrade | 95 |
| location | Berlin | → | [Q64](https://www.wikidata.org/wiki/Q64) | Berlin | 100 |
| location | Bern | → | [Q70](https://www.wikidata.org/wiki/Q70) | Bern | 100 |
| location | Bremen | → | [Q24879](https://www.wikidata.org/wiki/Q24879) | Bremen | 100 |
| location | Brüssel | → | [Q239](https://www.wikidata.org/wiki/Q239) | Brussels | 95 |
| location | Cagliari | → | [Q1897](https://www.wikidata.org/wiki/Q1897) | Cagliari | 100 |
| location | Düsseldorf | → | [Q1718](https://www.wikidata.org/wiki/Q1718) | Düsseldorf | 100 |
| location | Firenze | → | [Q2044](https://www.wikidata.org/wiki/Q2044) | Florence | 95 |
| location | Frankfurt a. M. | → | [Q1794](https://www.wikidata.org/wiki/Q1794) | Frankfurt | 95 |
| location | Frankfurt am Main | → | [Q1794](https://www.wikidata.org/wiki/Q1794) | Frankfurt | 95 |
| location | Frankfurt/Main | → | [Q1794](https://www.wikidata.org/wiki/Q1794) | Frankfurt | 95 |
| location | Geneve | → | [Q71](https://www.wikidata.org/wiki/Q71) | Geneva | 91 |
| location | Genf | → | [Q71](https://www.wikidata.org/wiki/Q71) | Geneva | 95 |
| location | Graz | → | [Q13298](https://www.wikidata.org/wiki/Q13298) | Graz | 100 |
| location | Hamburg | → | [Q1055](https://www.wikidata.org/wiki/Q1055) | Hamburg | 100 |
| location | Innsbruck | → | [Q1735](https://www.wikidata.org/wiki/Q1735) | Innsbruck | 100 |
| location | Italien | → | [Q38](https://www.wikidata.org/wiki/Q38) | Italy | 95 |
| location | Koblenz | → | [Q3104](https://www.wikidata.org/wiki/Q3104) | Koblenz | 100 |
| location | Kopenhagen | → | [Q1748](https://www.wikidata.org/wiki/Q1748) | Copenhagen | 95 |
| location | Linz | → | [Q41329](https://www.wikidata.org/wiki/Q41329) | Linz | 100 |
| location | London | → | [Q84](https://www.wikidata.org/wiki/Q84) | London | 100 |
| location | Lübeck | → | [Q2843](https://www.wikidata.org/wiki/Q2843) | Lübeck | 100 |
| location | Madrid | → | [Q116170766](https://www.wikidata.org/wiki/Q116170766) | Madrid city | 100 |
| location | Mainz | → | [Q1720](https://www.wikidata.org/wiki/Q1720) | Mainz | 100 |
| location | Metz | → | [Q22690](https://www.wikidata.org/wiki/Q22690) | Metz | 100 |
| location | Milano | → | [Q490](https://www.wikidata.org/wiki/Q490) | Milan | 91 |
| location | Monte Carlo | → | [Q45240](https://www.wikidata.org/wiki/Q45240) | Monte Carlo | 100 |
| location | Napoli | → | [Q2634](https://www.wikidata.org/wiki/Q2634) | Naples | 95 |
| location | Palermo | → | [Q2656](https://www.wikidata.org/wiki/Q2656) | Palermo | 100 |
| location | Paris | → | [Q90](https://www.wikidata.org/wiki/Q90) | Paris | 100 |
| location | Perchtoldsdorf | → | [Q21880302](https://www.wikidata.org/wiki/Q21880302) | Perchtoldsdorf | 100 |
| location | Potsdam | → | [Q1711](https://www.wikidata.org/wiki/Q1711) | Potsdam | 100 |
| location | Salzburg | → | [Q34713](https://www.wikidata.org/wiki/Q34713) | Salzburg | 100 |
| location | Strassburg | → | [Q6602](https://www.wikidata.org/wiki/Q6602) | Strasbourg | 90 |
| location | Stuttgart | → | [Q1022](https://www.wikidata.org/wiki/Q1022) | Stuttgart | 100 |
| location | Stuttgart | → | [Q1022](https://www.wikidata.org/wiki/Q1022) | Stuttgart | 100 |
| location | Torino | → | [Q495](https://www.wikidata.org/wiki/Q495) | Turin | 95 |
| location | Turin | → | [Q495](https://www.wikidata.org/wiki/Q495) | Turin | 100 |
| location | Venezia | → | [Q641](https://www.wikidata.org/wiki/Q641) | Venice | 95 |
| location | Warschau | → | [Q270](https://www.wikidata.org/wiki/Q270) | Warsaw | 95 |
| location | Wuppertal | → | [Q2107](https://www.wikidata.org/wiki/Q2107) | Wuppertal | 100 |
| location | Zürich | → | [Q72](https://www.wikidata.org/wiki/Q72) | Zurich | 91 |
| org | Cuvilliéstheater | → | [Q532191](https://www.wikidata.org/wiki/Q532191) | Cuvilliés Theatre | 90 |
| org | Metropolitan Opera | → | [Q10583424](https://www.wikidata.org/wiki/Q10583424) | The Metropolitan Opera | 100 |
| org | Nord- und Westdeutscher Rundfunkverband | → | [Q1997444](https://www.wikidata.org/wiki/Q1997444) | Nord- und Westdeutscher Rundfunkverband | 100 |
| org | Oper Graz | → | [Q618239](https://www.wikidata.org/wiki/Q618239) | Graz Opera | 95 |
| org | Prinzregententheater | → | [Q456586](https://www.wikidata.org/wiki/Q456586) | Prinzregententheater | 100 |
| org | Théâtre National de l'Opéra-Comique | → | [Q872222](https://www.wikidata.org/wiki/Q872222) | Opéra-Comique | 100 |
| org | Universität Mozarteum Salzburg | → | [Q871369](https://www.wikidata.org/wiki/Q871369) | Mozarteum University Salzburg | 97 |
| person | Adam, Theo | → | [Q64414](https://www.wikidata.org/wiki/Q64414) | Theo Adam | 100 |
| person | Adorno, Theodor W. | → | [Q152388](https://www.wikidata.org/wiki/Q152388) | Theodor W. Adorno | 100 |
| person | Altmann, Olga | → | [Q95686480](https://www.wikidata.org/wiki/Q95686480) | Olga Altmann | 100 |
| person | Autran, Victor | → | [Q139169792](https://www.wikidata.org/wiki/Q139169792) | Victor Autran | 100 |
| person | Barth, Irmgard | → | [Q94777017](https://www.wikidata.org/wiki/Q94777017) | Irmgard Barth | 100 |
| person | Bauer, Gerhard | → | [Q1511281](https://www.wikidata.org/wiki/Q1511281) | Gerhard Bauer | 100 |
| person | Bauer-Theussl, Franz | → | [Q113646](https://www.wikidata.org/wiki/Q113646) | Franz Bauer-Theussl | 100 |
| person | Baylé, Theo | → | [Q27864063](https://www.wikidata.org/wiki/Q27864063) | Theo Baylé | 100 |
| person | Beaton, Cecil Walter Hardy | → | [Q697096](https://www.wikidata.org/wiki/Q697096) | Cecil Beaton | 100 |
| person | Besnard, Maurice | → | [Q3300510](https://www.wikidata.org/wiki/Q3300510) | Maurice Bénard | 93 |
| person | Blankenheim, Toni | → | [Q95565](https://www.wikidata.org/wiki/Q95565) | Toni Blankenheim | 100 |
| person | Bonaparte, Napoleon | → | [Q517](https://www.wikidata.org/wiki/Q517) | Napoleon | 100 |
| person | Böhm,Karl | → | [Q84241](https://www.wikidata.org/wiki/Q84241) | Karl Böhm | 100 |
| person | Calzabigi, Ranieri de | → | [Q1310912](https://www.wikidata.org/wiki/Q1310912) | Ranieri de' Calzabigi | 100 |
| person | Chenier, André | → | [Q295548](https://www.wikidata.org/wiki/Q295548) | André Chénier | 96 |
| person | Cortis, Marcello | → | [Q52306091](https://www.wikidata.org/wiki/Q52306091) | Marcello Cortis | 100 |
| person | Curjel, Hans | → | [Q17249803](https://www.wikidata.org/wiki/Q17249803) | Hans Curjel | 100 |
| person | Della Casa, Lisa | → | [Q123575](https://www.wikidata.org/wiki/Q123575) | Lisa Della Casa | 100 |
| person | Didur, Adam | → | [Q349160](https://www.wikidata.org/wiki/Q349160) | Adamo Didur | 95 |
| person | Dumesnil, René | → | [Q3426141](https://www.wikidata.org/wiki/Q3426141) | René Dumesnil | 100 |
| person | Dünnwald, Josef | → | [Q25271239](https://www.wikidata.org/wiki/Q25271239) | Josef Dünnwald | 100 |
| person | Elfriede Ott | → | [Q1328656](https://www.wikidata.org/wiki/Q1328656) | Elfriede Ott | 100 |
| person | Erlenwein, Herbert | → | [Q95636832](https://www.wikidata.org/wiki/Q95636832) | Herbert Erlenwein | 100 |
| person | Eschert, Hasso | → | [Q95339861](https://www.wikidata.org/wiki/Q95339861) | Hasso Eschert | 100 |
| person | Fahberg, Antonia | → | [Q598316](https://www.wikidata.org/wiki/Q598316) | Antonia Fahberg | 100 |
| person | Ferenz, Willy | → | [Q47291788](https://www.wikidata.org/wiki/Q47291788) | Willy Ferenz | 100 |
| person | Fischer, Edwin | → | [Q123249](https://www.wikidata.org/wiki/Q123249) | Edwin Fischer | 100 |
| person | Frantz, Ferdinand | → | [Q77205](https://www.wikidata.org/wiki/Q77205) | Ferdinand Frantz | 100 |
| person | Furtwängler, Wilhelm | → | [Q57285](https://www.wikidata.org/wiki/Q57285) | Wilhelm Furtwängler | 100 |
| person | Ghislanzoni, Antonio | → | [Q524960](https://www.wikidata.org/wiki/Q524960) | Antonio Ghislanzoni | 100 |
| person | Gielen, Josef | → | [Q1465297](https://www.wikidata.org/wiki/Q1465297) | Josef Gielen | 100 |
| person | Gieseking, Walter | → | [Q61028](https://www.wikidata.org/wiki/Q61028) | Walter Gieseking | 100 |
| person | Gluck, Christoph Willibald | → | [Q130759](https://www.wikidata.org/wiki/Q130759) | Christoph Willibald von Gluck | 100 |
| person | Golther, Wolfgang | → | [Q103583](https://www.wikidata.org/wiki/Q103583) | Wolfgang Golther | 100 |
| person | Grefe, Gustav | → | [Q112472552](https://www.wikidata.org/wiki/Q112472552) | Gustav Grefe | 100 |
| person | Greindl, Josef | → | [Q63857](https://www.wikidata.org/wiki/Q63857) | Josef Greindl | 100 |
| person | Grob-Prandl, Gertrude | → | [Q3818034](https://www.wikidata.org/wiki/Q3818034) | Gertrude Grob-Prandl | 100 |
| person | Günter, Horst | → | [Q15456377](https://www.wikidata.org/wiki/Q15456377) | Horst Günter | 100 |
| person | Haefliger, Ernst | → | [Q124177](https://www.wikidata.org/wiki/Q124177) | Ernst Haefliger | 100 |
| person | Hanka, Erika | → | [Q50825278](https://www.wikidata.org/wiki/Q50825278) | Erika Hanka | 100 |
| person | Haydn, Joseph | → | [Q7349](https://www.wikidata.org/wiki/Q7349) | Joseph Haydn | 100 |
| person | Heger, Robert | → | [Q72123](https://www.wikidata.org/wiki/Q72123) | Robert Heger | 100 |
| person | Heger, Robert | → | [Q72123](https://www.wikidata.org/wiki/Q72123) | Robert Heger | 100 |
| person | Heitmann, Fritz | → | [Q91286](https://www.wikidata.org/wiki/Q91286) | Fritz Heitmann | 100 |
| person | Hoelscher, Ludwig | → | [Q108009](https://www.wikidata.org/wiki/Q108009) | Ludwig Hoelscher | 100 |
| person | Hotter, Hans | → | [Q63244](https://www.wikidata.org/wiki/Q63244) | Hans Hotter | 100 |
| person | Höngen, Elisabeth | → | [Q74611](https://www.wikidata.org/wiki/Q74611) | Elisabeth Höngen | 100 |
| person | Hübner, Wilhelm | → | [Q2573335](https://www.wikidata.org/wiki/Q2573335) | Wilhelm Hübner | 100 |
| person | Hüni-Mihacsek, Felicie | → | [Q3068099](https://www.wikidata.org/wiki/Q3068099) | Felicie Hüni-Mihacsek | 100 |
| person | ibe | → | [Q56402502](https://www.wikidata.org/wiki/Q56402502) | Ibe | 100 |
| person | Ilosvay | → | [Q1896516](https://www.wikidata.org/wiki/Q1896516) | Maria von Ilosvay | 100 |
| person | Jochum, Eugen | → | [Q57419](https://www.wikidata.org/wiki/Q57419) | Eugen Jochum | 100 |
| person | Jürgens, Helmut | → | [Q2716190](https://www.wikidata.org/wiki/Q2716190) | Helmut Jürgens | 100 |
| person | Kaufmann, Harald | → | [Q1584570](https://www.wikidata.org/wiki/Q1584570) | Harald Kaufmann | 100 |
| person | Kautsky, Hans | → | [Q1580703](https://www.wikidata.org/wiki/Q1580703) | Hans Kautsky | 100 |
| person | Kautsky, Robert | → | [Q27990163](https://www.wikidata.org/wiki/Q27990163) | Robert Kautsky | 100 |
| person | Keil, Adolf | → | [Q94931882](https://www.wikidata.org/wiki/Q94931882) | Adolf Keil | 100 |
| person | Keilberth, Joseph | → | [Q61123](https://www.wikidata.org/wiki/Q61123) | Joseph Keilberth | 100 |
| person | Kempff, Wilhelm | → | [Q159946](https://www.wikidata.org/wiki/Q159946) | Wilhelm Kempff | 100 |
| person | Kienzl, Wilhelm | → | [Q637353](https://www.wikidata.org/wiki/Q637353) | Wilhelm Kienzl | 100 |
| person | Klarwein, Franz | → | [Q1447805](https://www.wikidata.org/wiki/Q1447805) | Franz Klarwein | 100 |
| person | Klebe, Karl-Heinz | → | [Q133073813](https://www.wikidata.org/wiki/Q133073813) | Karl Heinz Klebe | 100 |
| person | Klobučar, Berislav | → | [Q2897169](https://www.wikidata.org/wiki/Q2897169) | Berislav Klobučar | 100 |
| person | Knappertsbusch, Hans | → | [Q57425](https://www.wikidata.org/wiki/Q57425) | Hans Knappertsbusch | 100 |
| person | Kotzebue, August von | → | [Q57242](https://www.wikidata.org/wiki/Q57242) | August von Kotzebue | 100 |
| person | Krauss, Clemens | → | [Q78918](https://www.wikidata.org/wiki/Q78918) | Clemens Krauss | 100 |
| person | Krauß, Clemens | → | [Q78918](https://www.wikidata.org/wiki/Q78918) | Clemens Krauss | 92 |
| person | Krayenbühl, Hugo | → | [Q15441062](https://www.wikidata.org/wiki/Q15441062) | Hugo Krayenbühl | 100 |
| person | Kreppel, Walter | → | [Q19629015](https://www.wikidata.org/wiki/Q19629015) | Walter Kreppel | 100 |
| person | Kuen, Paul | → | [Q94912384](https://www.wikidata.org/wiki/Q94912384) | Paul Kuen | 100 |
| person | Kulenkampff, Georg | → | [Q470033](https://www.wikidata.org/wiki/Q470033) | Georg Kulenkampff | 100 |
| person | Kunz, Erich | → | [Q78855](https://www.wikidata.org/wiki/Q78855) | Erich Kunz | 100 |
| person | Kupferberg, Herbert | → | [Q26992171](https://www.wikidata.org/wiki/Q26992171) | Herbert Kupferberg | 100 |
| person | Kupper, Annelies | → | [Q75998](https://www.wikidata.org/wiki/Q75998) | Annelies Kupper | 100 |
| person | Kusche, Benno | → | [Q817948](https://www.wikidata.org/wiki/Q817948) | Benno Kusche | 100 |
| person | Kuën, Paul | → | [Q105714](https://www.wikidata.org/wiki/Q105714) | Paul Kuën | 100 |
| person | Köth, Erika | → | [Q77743](https://www.wikidata.org/wiki/Q77743) | Erika Köth | 100 |
| person | Lauro, Michele | → | [Q133793307](https://www.wikidata.org/wiki/Q133793307) | Michele Lauro | 100 |
| person | Leimer, Karl | → | [Q1664629](https://www.wikidata.org/wiki/Q1664629) | Karl Leimer | 100 |
| person | List, Rudolf | → | [Q2173338](https://www.wikidata.org/wiki/Q2173338) | Rudolf List | 100 |
| person | Litz, Gisela | → | [Q5564902](https://www.wikidata.org/wiki/Q5564902) | Gisela Litz | 100 |
| person | Loose, Emmy | → | [Q89450](https://www.wikidata.org/wiki/Q89450) | Emmy Loose | 100 |
| person | Lorenz, Gerlinde | → | [Q112474535](https://www.wikidata.org/wiki/Q112474535) | Gerlinde Lorenz | 100 |
| person | Mahlke, Hans | → | [Q109441772](https://www.wikidata.org/wiki/Q109441772) | Hans Mahlke | 100 |
| person | Majkut, Erich | → | [Q59531271](https://www.wikidata.org/wiki/Q59531271) | Erich Majkut | 100 |
| person | Martienssen-Lohmann, Franziska | → | [Q4282634](https://www.wikidata.org/wiki/Q4282634) | Franziska Martienssen-Lohmann | 100 |
| person | Marx, Joseph | → | [Q506561](https://www.wikidata.org/wiki/Q506561) | Joseph Marx | 100 |
| person | Masaccio | → | [Q5811](https://www.wikidata.org/wiki/Q5811) | Masaccio | 100 |
| person | Massard, Robert | → | [Q3435871](https://www.wikidata.org/wiki/Q3435871) | Robert Massard | 100 |
| person | Mazzolà, Caterino | → | [Q2856477](https://www.wikidata.org/wiki/Q2856477) | Caterino Mazzolà | 100 |
| person | Mendelssohn Bartholdy, Felix | → | [Q46096](https://www.wikidata.org/wiki/Q46096) | Felix Mendelssohn | 100 |
| person | Menotti, Gian Carlo | → | [Q270662](https://www.wikidata.org/wiki/Q270662) | Gian Carlo Menotti | 100 |
| person | Metternich, Josef | → | [Q95732](https://www.wikidata.org/wiki/Q95732) | Josef Metternich | 100 |
| person | Meyer, Werner | → | [Q114183944](https://www.wikidata.org/wiki/Q114183944) | Werner Meyer | 100 |
| person | Meyer-Welfing, Hugo | → | [Q55677315](https://www.wikidata.org/wiki/Q55677315) | Hugo Meyer-Welfing | 100 |
| person | Moralt, Rudolf | → | [Q70098](https://www.wikidata.org/wiki/Q70098) | Rudolf Moralt | 100 |
| person | Moralt, Rudolf | → | [Q70098](https://www.wikidata.org/wiki/Q70098) | Rudolf Moralt | 100 |
| person | Moratti, Vittorino | → | [Q16677800](https://www.wikidata.org/wiki/Q16677800) | Vittorino Moratti | 100 |
| person | Munch, Fritz | → | [Q3087945](https://www.wikidata.org/wiki/Q3087945) | Fritz Münch | 95 |
| person | Mödl, Martha | → | [Q62964](https://www.wikidata.org/wiki/Q62964) | Martha Mödl | 100 |
| person | Neidlinger, Gustav | → | [Q68344](https://www.wikidata.org/wiki/Q68344) | Gustav Neidlinger | 100 |
| person | Neidlinger, Gustav | → | [Q68344](https://www.wikidata.org/wiki/Q68344) | Gustav Neidlinger | 100 |
| person | Nestroy, Johann Nepomuk | → | [Q44862](https://www.wikidata.org/wiki/Q44862) | Johann Nestroy | 100 |
| person | Ney, Elly | → | [Q66912](https://www.wikidata.org/wiki/Q66912) | Elly Ney | 100 |
| person | Nilsson, Birgit | → | [Q233951](https://www.wikidata.org/wiki/Q233951) | Birgit Nilsson | 100 |
| person | Oboussier, Robert | → | [Q12333612](https://www.wikidata.org/wiki/Q12333612) | Robert Oboussier | 100 |
| person | Pandano, Vittorio | → | [Q130777432](https://www.wikidata.org/wiki/Q130777432) | Vittorio Pandano | 100 |
| person | Pantscheff, Ljubomir | → | [Q55675699](https://www.wikidata.org/wiki/Q55675699) | Ljubomir Pantscheff | 100 |
| person | Paumgartner, Bernhard | → | [Q214365](https://www.wikidata.org/wiki/Q214365) | Bernhard Paumgartner | 100 |
| person | Pergolesi, Giovanni Battista | → | [Q185312](https://www.wikidata.org/wiki/Q185312) | Giovanni Battista Pergolesi | 100 |
| person | Peter, Albrecht | → | [Q94901792](https://www.wikidata.org/wiki/Q94901792) | Albrecht Peter | 100 |
| person | Pfeifle, Alfred | → | [Q2645656](https://www.wikidata.org/wiki/Q2645656) | Alfred Pfeifle | 100 |
| person | Pfitzner, Hans | → | [Q57358](https://www.wikidata.org/wiki/Q57358) | Hans Pfitzner | 100 |
| person | Pitz, Wilhelm | → | [Q2574498](https://www.wikidata.org/wiki/Q2574498) | Wilhelm Pitz | 100 |
| person | Plümacher, Hetty | → | [Q1616310](https://www.wikidata.org/wiki/Q1616310) | Hetty Plümacher | 100 |
| person | Proebstl, Max | → | [Q1913239](https://www.wikidata.org/wiki/Q1913239) | Max Proebstl | 100 |
| person | Prêtre, Georges | → | [Q342381](https://www.wikidata.org/wiki/Q342381) | Georges Prêtre | 100 |
| person | Puccini, Giacomo | → | [Q7311](https://www.wikidata.org/wiki/Q7311) | Giacomo Puccini | 100 |
| person | Ramin, Günther | → | [Q518002](https://www.wikidata.org/wiki/Q518002) | Günther Ramin | 100 |
| person | Reger, Max | → | [Q57139](https://www.wikidata.org/wiki/Q57139) | Max Reger | 100 |
| person | Rialland, Louis | → | [Q132941819](https://www.wikidata.org/wiki/Q132941819) | Louis Rialland | 100 |
| person | Richter, Gerd | → | [Q116526092](https://www.wikidata.org/wiki/Q116526092) | Gerd Richter | 100 |
| person | Roller, Alfred | → | [Q78981](https://www.wikidata.org/wiki/Q78981) | Alfred Roller | 100 |
| person | Rossmayer, Richard | → | [Q110071082](https://www.wikidata.org/wiki/Q110071082) | Richard Rossmayer | 100 |
| person | Rott, Adolf | → | [Q364029](https://www.wikidata.org/wiki/Q364029) | Adolf Rott | 100 |
| person | Rouquetty, Camille | → | [Q112391565](https://www.wikidata.org/wiki/Q112391565) | Camille Rouquetty | 100 |
| person | Rysanek, Leonie | → | [Q78613](https://www.wikidata.org/wiki/Q78613) | Leonie Rysanek | 100 |
| person | Rössl-Majdan, Hilde | → | [Q89249](https://www.wikidata.org/wiki/Q89249) | Hilde Rössel-Majdan | 97 |
| person | Röthlisberger, Max | → | [Q1913324](https://www.wikidata.org/wiki/Q1913324) | Max Röthlisberger | 100 |
| person | Samazeuilh, Gustave | → | [Q447590](https://www.wikidata.org/wiki/Q447590) | Gustave Samazeuilh | 100 |
| person | Schalk, Franz | → | [Q79026](https://www.wikidata.org/wiki/Q79026) | Franz Schalk | 100 |
| person | Schellenberg, Arno | → | [Q694529](https://www.wikidata.org/wiki/Q694529) | Arno Schellenberg | 100 |
| person | Schmidt-Garre, Helmut | → | [Q95634885](https://www.wikidata.org/wiki/Q95634885) | Helmut Schmidt-Garre | 100 |
| person | Schulthess, Walter | → | [Q4527615](https://www.wikidata.org/wiki/Q4527615) | Walter Schulthess | 100 |
| person | Schöffler, Paul | → | [Q71953](https://www.wikidata.org/wiki/Q71953) | Paul Schöffler | 100 |
| person | Schünemann, Georg | → | [Q121675](https://www.wikidata.org/wiki/Q121675) | Georg Schünemann | 100 |
| person | Serafin, Harald | → | [Q1584745](https://www.wikidata.org/wiki/Q1584745) | Harald Serafin | 100 |
| person | Sobota, Elisabeth | → | [Q95704592](https://www.wikidata.org/wiki/Q95704592) | Elisabeth Sobota | 100 |
| person | Steinecke, Wolfgang | → | [Q16720951](https://www.wikidata.org/wiki/Q16720951) | Wolfgang Steinecke | 100 |
| person | Steiner, Adolf | → | [Q89574267](https://www.wikidata.org/wiki/Q89574267) | Adolf Steiner | 100 |
| person | Stich-Randall, Teresa | → | [Q433730](https://www.wikidata.org/wiki/Q433730) | Teresa Stich-Randall | 100 |
| person | Stolze, Gerhard | → | [Q73847](https://www.wikidata.org/wiki/Q73847) | Gerhard Stolze | 100 |
| person | Strauss, Richard | → | [Q13894](https://www.wikidata.org/wiki/Q13894) | Richard Strauss | 100 |
| person | Suter, Hermann | → | [Q671472](https://www.wikidata.org/wiki/Q671472) | Hermann Suter | 100 |
| person | Suthaus, Ludwig | → | [Q70400](https://www.wikidata.org/wiki/Q70400) | Ludwig Suthaus | 100 |
| person | Swarowsky, Hans | → | [Q78721](https://www.wikidata.org/wiki/Q78721) | Hans Swarowsky | 100 |
| person | Süßmayr, Franz Xaver | → | [Q310518](https://www.wikidata.org/wiki/Q310518) | Franz Xaver Süssmayr | 94 |
| person | Tasso, Fiorenzo | → | [Q137834857](https://www.wikidata.org/wiki/Q137834857) | Fiorenzo Tasso | 100 |
| person | Traxel, Josef | → | [Q92013](https://www.wikidata.org/wiki/Q92013) | Josef Traxel | 100 |
| person | Urbancic, Elisabeth | → | [Q1330331](https://www.wikidata.org/wiki/Q1330331) | Elisabeth Urbancic | 100 |
| person | Vacchiano | → | [Q2580837](https://www.wikidata.org/wiki/Q2580837) | William Vacchiano | 100 |
| person | Vandenburg, Howard | → | [Q94932751](https://www.wikidata.org/wiki/Q94932751) | Howard Vandenburg | 100 |
| person | Varnay, Astrid | → | [Q254518](https://www.wikidata.org/wiki/Q254518) | Astrid Varnay | 100 |
| person | Vinay, Ramon | → | [Q748221](https://www.wikidata.org/wiki/Q748221) | Ramón Vinay | 95 |
| person | Wagner, Richard | → | [Q1511](https://www.wikidata.org/wiki/Q1511) | Richard Wagner | 100 |
| person | Wagner, Siegfried | → | [Q143867](https://www.wikidata.org/wiki/Q143867) | Siegfried Wagner | 100 |
| person | Wagner, Wieland | → | [Q60465](https://www.wikidata.org/wiki/Q60465) | Wieland Wagner | 100 |
| person | Wehofschitz, Kurt | → | [Q95305013](https://www.wikidata.org/wiki/Q95305013) | Kurt Wehofschitz | 100 |
| person | Weishappel, Rudolf | → | [Q55681641](https://www.wikidata.org/wiki/Q55681641) | Rudolf Weishappel | 100 |
| person | Welt, Alfred | → | [Q132908618](https://www.wikidata.org/wiki/Q132908618) | Alfred Welti | 96 |
| person | Werba, Erik | → | [Q1354192](https://www.wikidata.org/wiki/Q1354192) | Erik Werba | 100 |
| person | Wesendonck, Mathilde | → | [Q63265](https://www.wikidata.org/wiki/Q63265) | Mathilde Wesendonck | 100 |
| person | Wieter, Georg | → | [Q1506390](https://www.wikidata.org/wiki/Q1506390) | Georg Wieter | 100 |
| person | Willy Heyer | → | [Q95264973](https://www.wikidata.org/wiki/Q95264973) | Willy Heyer | 100 |
| person | Windgassen, Wolfgang | → | [Q60906](https://www.wikidata.org/wiki/Q60906) | Wolfgang Windgassen | 100 |
| person | Wißmann, Lore | → | [Q1619892](https://www.wikidata.org/wiki/Q1619892) | Lore Wissmann | 92 |
| person | Wolf, Hugo | → | [Q215747](https://www.wikidata.org/wiki/Q215747) | Hugo Wolf | 100 |
| person | Zadek, Hilde | → | [Q72147](https://www.wikidata.org/wiki/Q72147) | Hilde Zadek | 100 |
| person | Zimmermann, Erika | → | [Q95756451](https://www.wikidata.org/wiki/Q95756451) | Erika Zimmermann | 100 |
| person | Zimmermann, Wolfram | → | [Q108824609](https://www.wikidata.org/wiki/Q108824609) | Wolfram Zimmermann | 100 |
| work | Ave Maria | → | [Q790310](https://www.wikidata.org/wiki/Q790310) | Ave Maria | 100 |
| work | Befreit | → | [Q23010225](https://www.wikidata.org/wiki/Q23010225) | Befreit | 100 |
| work | Judas Maccabaeus | → | [Q993971](https://www.wikidata.org/wiki/Q993971) | Judas Maccabaeus | 100 |
| work | Kindertotenlieder | → | [Q589396](https://www.wikidata.org/wiki/Q589396) | Kindertotenlieder | 100 |
| work | Lamento d'Arianna | → | [Q47008942](https://www.wikidata.org/wiki/Q47008942) | Lamento d'Arianna | 100 |
| work | Le laudi di San Francesco d'Assisi | → | [Q1809945](https://www.wikidata.org/wiki/Q1809945) | Le Laudi | 100 |
| work | Lied von der Erde | → | [Q846646](https://www.wikidata.org/wiki/Q846646) | Das Lied von der Erde | 100 |
| work | Messiah | → | [Q207732](https://www.wikidata.org/wiki/Q207732) | Messiah | 100 |
| work | Rastlose Liebe | → | [Q7295275](https://www.wikidata.org/wiki/Q7295275) | Rastlose Liebe | 100 |
| work | Requiem | → | [Q6941842](https://www.wikidata.org/wiki/Q6941842) | music for the Requiem Mass | 100 |
| work | Spanisches Liederbuch | → | [Q19896118](https://www.wikidata.org/wiki/Q19896118) | Spanisches Liederbuch | 100 |
| work | Theresienmesse | → | [Q1438716](https://www.wikidata.org/wiki/Q1438716) | Theresienmesse | 100 |
| work | Von ewiger Liebe | → | [Q11550399](https://www.wikidata.org/wiki/Q11550399) | Von ewiger Liebe | 100 |

## Provenance-Coverage

- Records mit `m3gim-ontology:xlsxSource`: **997/997** (100%)
- Records mit provenienz-belegten Ereignissen (`agrelon:metadataProvenance` auf Annotation/AgRelOn): **169/997** (17%)
- Nested Entities (Details + AgRelOn) mit `xlsxSource`: **435/435** (100%)

## Kanonische Befundregister

Die gepflegten Einzelbefunde stehen in den zuständigen Registern:

- [Quellbefunde](source-errors-handover-2026-09-01.md)
- [Reconciliation-Register](reconciliation-register.md)

