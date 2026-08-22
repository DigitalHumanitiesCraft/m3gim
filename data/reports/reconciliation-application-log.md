# Protokoll der Reconciliation-Übernahme

Redaktioneller Durchgang vom 2026-08-22 über `data/output/wikidata-reconciliation.json`, gelaufen in drei Etappen. Grundlage sind die drei Vorschlagsdokumente `identifier-proposals-persons.md`, `identifier-proposals-works.md` und `identifier-proposals-orgs-places.md` in diesem Verzeichnis. Übernommen wurde ausschließlich die Konfidenzstufe **gesichert**.

Jede Kennung ist vor der Übernahme über `https://www.wikidata.org/wiki/Special:EntityData/<QID>.json` mit der Kennung `m3gim-research/1.0` abgerufen und an Label oder Alias, an der Entitätsklasse aus P31 und bei Personen zusätzlich an Beruf (P106, P412) und Lebensdaten (P569, P570) gegen die Behauptung des Vorschlagsdokuments geprüft worden. Bei Werken lief die Prüfung über den in P86 ausgewiesenen Komponisten, bei Orten über die Koordinate aus P625. Der Abruf hat in keinem Fall von der Behauptung abgewichen. Die Einträge der zweiten Etappe sind vor ihrer Übernahme ein zweites Mal frisch abgerufen worden.

Alle geschriebenen Einträge der Liste `matched` tragen `match: "manual"`, `confidence: 100`, `manual_review: "approved"` und eine datierte Notiz mit dem Beleg. Gestrichene Einträge wandern in der im Bestand vorhandenen Form ohne Zusatzfelder nach `unmatched`; ihre Begründung steht in der Tabelle der ersten Etappe und im Register [`knowledge/data-errors.md`](../../knowledge/data-errors.md).

## Umfang

| Eingriffsart | Etappe 1 | Etappe 2 | Etappe 3 | gesamt |
|---|---:|---:|---:|---:|
| Neue Zuordnung, `unmatched` nach `matched` | 118 | 20 | 3 | 141 |
| Korrektur einer bestehenden Kennung in `matched` | 30 | 1 | 0 | 31 |
| Streichung, `matched` nach `unmatched` | 17 | 0 | 0 | 17 |

## Nicht übernommen

Außerhalb dieses Durchgangs bleiben die Konfidenzstufen `wahrscheinlich` und `offen`, die Fälle, die die Vorschlagsdokumente als fachliche Entscheidung an die Projektleitung zurückgeben (Haus gegen Kompanie bei Institutionen, Granularität bei Liedzyklen, Dublettenpaare im Werkindex, Personen mit mehreren gleichrangigen Kandidaten), die als Quellfehler ausgewiesenen Ortsvarianten und alles, was in der Liste `skipped` steht, weil dort die Kennung aus dem Index selbst stammt.

## Etappe 1, Einzelnachweis

| Typ | Quellname | Komponist | Eingriff | alte Kennung | neue Kennung | Beleg aus dem Abruf |
|---|---|---|---|---|---|---|
| Ort | Bloomington, Indiana |  | Neue Zuordnung |  | Q490385 | Bloomington, Stadt im US-Bundesstaat Indiana |
| Organisation | Abendzeitung |  | Neue Zuordnung |  | Q225076 | Abendzeitung, Münchner Boulevardzeitung |
| Organisation | Aktiengesellschaft Leu & Co. |  | Neue Zuordnung |  | Q806636 | Bank Leu, Organisation |
| Organisation | Arbeiter Zeitung |  | Neue Zuordnung |  | Q627083 | Arbeiter-Zeitung, österreichische Tageszeitung |
| Organisation | Deutsche Oper Berlin |  | Neue Zuordnung |  | Q637834 | Deutsche Oper Berlin, Opernhaus |
| Organisation | Epic Records |  | Neue Zuordnung |  | Q216364 | Epic Records, US-amerikanisches Musiklabel |
| Organisation | Fränkische Presse |  | Neue Zuordnung |  | Q23787475 | Fränkische Presse, regionale Tageszeitung in Bayreuth |
| Organisation | Hochschule für Musik und darstellende Kunst Graz |  | Neue Zuordnung |  | Q875147 | Universität für Musik und darstellende Kunst Graz, Universität in Österreich |
| Organisation | Indiana University School of Music |  | Neue Zuordnung |  | Q6119774 | Jacobs School of Music, constituent school of Indiana University |
| Organisation | Le Monde |  | Neue Zuordnung |  | Q12461 | Le Monde, französische Tageszeitung |
| Organisation | Markgräfliches Opernhaus |  | Neue Zuordnung |  | Q278908 | Markgräfliches Opernhaus, Theatergebäude und Weltkulturerbe in Bayreuth, Bayern |
| Organisation | Mozart-Sängerknaben |  | Neue Zuordnung |  | Q993642 | Mozart Knabenchor Wien, österreichischer Knabenchor |
| Organisation | Musikakademie in Lemberg |  | Neue Zuordnung |  | Q1992023 | Nationale Musikakademie Lwiw "Mykoly Lyssenka", Universität in Ukraine |
| Organisation | Musikverein Graz |  | Neue Zuordnung |  | Q1955271 | Musikverein für Steiermark, österreichischer Musikverein in Graz (1815–) |
| Organisation | Musikverein für Steiermark |  | Neue Zuordnung |  | Q1955271 | Musikverein für Steiermark, österreichischer Musikverein in Graz (1815–) |
| Organisation | Münchner Merkur |  | Neue Zuordnung |  | Q279832 | Münchner Merkur, bayerische Abonnement-Zeitung |
| Organisation | Neues Österreich |  | Neue Zuordnung |  | Q1440644 | Neues Österreich, Österreichische Tageszeitung |
| Organisation | Opernhaus Zürich |  | Neue Zuordnung |  | Q670406 | Opernhaus Zürich, Musiktheater der Stadt Zürich |
| Organisation | Opéra de Monte-Carlo |  | Neue Zuordnung |  | Q1577048 | Opéra de Monaco, Opernhaus im Fürstentum Monaco |
| Organisation | Salzburger Festspiele |  | Neue Zuordnung |  | Q256443 | Salzburger Festspiele, internationales Kulturfest in Salzburg |
| Organisation | Staatsoper Wien |  | Neue Zuordnung |  | Q209937 | Wiener Staatsoper, Opernhaus in Wien |
| Organisation | Stadttheater Zürich |  | Neue Zuordnung |  | Q670406 | Opernhaus Zürich, Musiktheater der Stadt Zürich |
| Organisation | Stuttgarter Nachrichten |  | Neue Zuordnung |  | Q2359571 | Stuttgarter Nachrichten, deutsche Tageszeitung mit Sitz in Stuttgart |
| Organisation | Stuttgarter Staatsoper |  | Neue Zuordnung |  | Q467147 | Staatsoper Stuttgart, Opernhaus in Stuttgart |
| Organisation | Süddeutsche Zeitung |  | Neue Zuordnung |  | Q158870 | Süddeutsche Zeitung, deutsche überregionale Tageszeitung |
| Organisation | Südost-Tagespost |  | Neue Zuordnung |  | Q2381148 | Südost Tagespost, steirische Tageszeitung |
| Organisation | Teatro di San Carlo |  | Neue Zuordnung |  | Q628491 | Teatro San Carlo, Opernhaus in Neapel |
| Organisation | Volksoper Wien |  | Neue Zuordnung |  | Q694747 | Volksoper Wien, Opernhaus in Wien |
| Organisation | Wiener Philharmoniker |  | Neue Zuordnung |  | Q154685 | Wiener Philharmoniker, österreichisches Sinfonieorchester |
| Organisation | Wiener Staatsoper |  | Neue Zuordnung |  | Q209937 | Wiener Staatsoper, Opernhaus in Wien |
| Organisation | Wiener Symphoniker |  | Neue Zuordnung |  | Q686887 | Wiener Symphoniker, Orchester |
| Organisation | Wiener Zeitung |  | Neue Zuordnung |  | Q697173 | Wiener Zeitung, österreichische Tageszeitung |
| Person | Alighieri, Dante |  | Neue Zuordnung |  | Q1067 | Dante Alighieri, florentinischer Dichter und Philosoph (1265–1321) |
| Person | Bach, Johann Sebastian |  | Neue Zuordnung |  | Q1339 | Johann Sebastian Bach, deutscher Komponist des Barocks (1685–1750) |
| Person | Barber, Samuel |  | Neue Zuordnung |  | Q216870 | Samuel Barber, amerikanischer Komponist; 1910–1981 |
| Person | Barlach, Ernst |  | Neue Zuordnung |  | Q156890 | Ernst Barlach, deutscher Bildhauer, Schriftsteller und Zeichner (1870–1938) |
| Person | Bartók, Béla |  | Neue Zuordnung |  | Q83326 | Béla Bartók, ungarischer Komponist und Pianist; 1881–1945 |
| Person | Beethoven, Ludwig van |  | Neue Zuordnung |  | Q255 | Ludwig van Beethoven, deutscher Komponist (1770–1827) |
| Person | Bizet, Georges |  | Neue Zuordnung |  | Q56158 | Georges Bizet, französischer Komponist; 1838–1875 |
| Person | Brahms, Johannes |  | Neue Zuordnung |  | Q7294 | Johannes Brahms, deutscher Komponist, Pianist und Dirigent; 1833–1897 |
| Person | Braun, Hans |  | Neue Zuordnung |  | Q1578818 | Hans Braun, österreichischer Opernsänger mit der Stimmlage Bariton; Bariton; 1917–1992 |
| Person | Bruckner, Anton |  | Neue Zuordnung |  | Q81752 | Anton Bruckner, österreichischer Komponist; 1824–1896 |
| Person | Caridis, Militades |  | Neue Zuordnung |  | Q638521 | Miltiades Caridis, deutsch-griechischer Komponist; 1923–1998 |
| Person | Dermotas, Anton |  | Neue Zuordnung |  | Q588808 | Anton Dermota, jugoslawischer Tenor; Tenor; 1910–1989 |
| Person | Dvořák, Antonín |  | Neue Zuordnung |  | Q7298 | Antonín Dvořák, tschechischer Komponist; 1841–1904 |
| Person | Felberma-Yers, Anny |  | Neue Zuordnung |  | Q18216386 | Anny Felbermayer, österreichische Lieder-, Oratorien- und Opernsängerin (lyrischer Sopran); Sopran; 1924–2014 |
| Person | Gostič, Josip |  | Neue Zuordnung |  | Q6279811 | Josef Gostic, Slovenian opera singer (1900-1963); Tenor |
| Person | Hasse, Johann Asolph |  | Neue Zuordnung |  | Q164732 | Johann Adolph Hasse, deutscher Komponist des Barocks; Tenor; 1699–1783 |
| Person | Hindemith, Paul |  | Neue Zuordnung |  | Q57244 | Paul Hindemith, deutscher Komponist der Moderne; 1895–1963 |
| Person | Honegger, Arthur |  | Neue Zuordnung |  | Q123164 | Arthur Honegger, französisch-schweizerischer Komponist der Groupe des Six; 1892–1955 |
| Person | Honolka, Kurt Dr. |  | Neue Zuordnung |  | Q1447751 | Kurt Honolka, deutscher Musik- und Kulturkritiker, Schriftsteller, Autor; 1913–1988 |
| Person | Händel, Georg Friedrich |  | Neue Zuordnung |  | Q7302 | Georg Friedrich Händel, deutsch-britischer Komponist des Barocks (1685–1759) |
| Person | Janáček, Leoš |  | Neue Zuordnung |  | Q184933 | Leoš Janáček, tschechischer Komponist; 1854–1928 |
| Person | Jommelli, Niccolò |  | Neue Zuordnung |  | Q312891 | Niccolò Jommelli, italienischer Komponist der Vorklassik; 1714–1774 |
| Person | Klemperer, Otto |  | Neue Zuordnung |  | Q155136 | Otto Klemperer, deutscher Dirigent und Komponist; 1885–1973 |
| Person | Kmett, Waldemar |  | Neue Zuordnung |  | Q88847 | Waldemar Kmentt, österreichischer Tenor; Tenor; 1929–2015 |
| Person | Kodály, Zoltán |  | Neue Zuordnung |  | Q153008 | Zoltán Kodály, ungarischer Komponist; 1882–1967 |
| Person | Lortzing, Albert |  | Neue Zuordnung |  | Q154203 | Albert Lortzing, deutscher Komponist, Schauspieler und Sänger; Tenor; 1801–1851 |
| Person | Mahler, Gustav |  | Neue Zuordnung |  | Q7304 | Gustav Mahler, österreichischer Komponist und Dirigent (1860-1911) |
| Person | Metastasio, Pietro |  | Neue Zuordnung |  | Q29473 | Pietro Metastasio, italienischer Librettist, Textdichter und Autor (1698–1782) |
| Person | Mitropoulos, Dimitri |  | Neue Zuordnung |  | Q319741 | Dimitri Mitropoulos, griechischer Dirigent; 1896–1960 |
| Person | Mozart, Wolfgang Amadeus |  | Neue Zuordnung |  | Q254 | Wolfgang Amadeus Mozart, Musiker und Komponist der Wiener Klassik; 1756–1791 |
| Person | Offenbach, Jacques |  | Neue Zuordnung |  | Q41555 | Jacques Offenbach, deutsch-französischer Komponist und Cellist (1819–1880) |
| Person | Orff, Carl |  | Neue Zuordnung |  | Q44086 | Carl Orff, deutscher Komponist und Musikpädagoge (1895–1982) |
| Person | Rodzinski, Artur |  | Neue Zuordnung |  | Q554610 | Artur Rodziński, polnischer Dirigent; 1892–1958 |
| Person | Rogatschewsky, Joseph |  | Neue Zuordnung |  | Q3185573 | Joseph Rogatchewsky, Opera singer (1891–1985); Tenor |
| Person | Rossini, Gioachino |  | Neue Zuordnung |  | Q9726 | Gioachino Rossini, italienischer Komponist; 1792–1868 |
| Person | Schubert, Franz |  | Neue Zuordnung |  | Q7312 | Franz Schubert, österreichischer Komponist; 1797–1828 |
| Person | Schumann, Robert |  | Neue Zuordnung |  | Q7351 | Robert Schumann, Komponist, Musikkritiker und Dirigent; 1810–1856 |
| Person | Stravinsky, Igor |  | Neue Zuordnung |  | Q7314 | Igor Strawinsky, russisch-französisch-US-amerikanischer Komponist (1882–1971) |
| Person | Traetta, Tommaso |  | Neue Zuordnung |  | Q266084 | Tommaso Traetta, italienischer Komponist; 1727–1779 |
| Person | Uhde, Hermann |  | Neue Zuordnung |  | Q68473 | Hermann Uhde, deutscher Heldenbariton; Bassbariton; 1914–1965 |
| Person | Verdi, Giuseppe |  | Neue Zuordnung |  | Q7317 | Giuseppe Verdi, italienischer Komponist der Romantik (1813–1901) |
| Person | Walter, Bruno |  | Neue Zuordnung |  | Q156910 | Bruno Walter, deutsch-österreichischer Dirigent, Pianist und Komponist; 1876–1962 |
| Person | Čajkovskij, Pëtr Ilʹič |  | Neue Zuordnung |  | Q7315 | Pjotr Iljitsch Tschaikowski, russischer Komponist; 1840–1893 |
| Werk | 3. Symphonie | Brahms, Johannes | Neue Zuordnung |  | Q223502 | 3. Sinfonie, Werk von Johannes Brahms; Komponist Johannes Brahms |
| Werk | 8. Symphonie | Beethoven, Ludwig van | Neue Zuordnung |  | Q270785 | 8. Sinfonie, Sinfonie von Ludwig van Beethoven; Komponist Ludwig van Beethoven |
| Werk | Aida | Verdi, Giuseppe | Neue Zuordnung |  | Q171277 | Aida, Oper von Giuseppe Verdi; Komponist Giuseppe Verdi |
| Werk | Arabella | Strauss, Richard | Neue Zuordnung |  | Q390779 | Arabella, Oper von Richard Strauss; Komponist Richard Strauss |
| Werk | Boris Godunov | Musorgskij, Modest Petrovič | Neue Zuordnung |  | Q386846 | Boris Godunow, Oper in vier Akten mit Prolog von Modest Mussorgski; Komponist Modest Petrowitsch Mussorgski |
| Werk | Chovanščina | Musorgskij, Modest Petrovič | Neue Zuordnung |  | Q917711 | Chowanschtschina, Oper von Modest Mussorgski; Komponist Modest Petrowitsch Mussorgski, Nikolai Andrejewitsch Rimski-Korsakow |
| Werk | Così fan tutte | Mozart, Wolfgang Amadeus | Neue Zuordnung |  | Q207410 | Così fan tutte, Oper von Wolfgang Amadeus Mozart; Komponist Wolfgang Amadeus Mozart |
| Werk | Daphne | Strauss, Richard | Neue Zuordnung |  | Q1165496 | Daphne, Oper von Richard Strauss; Komponist Richard Strauss |
| Werk | Der Evangelimann | Kienzl, Wilhelm | Neue Zuordnung |  | Q1193192 | Der Evangelimann, Oper von Wilhelm Kienzl; Komponist Wilhelm Kienzl |
| Werk | Der Wildschütz oder Die Stimme der Natur | Lortzing, Albert | Neue Zuordnung |  | Q253376 | Der Wildschütz, Komische Oper von Albert Lortzing; Komponist Albert Lortzing |
| Werk | Die Geschöpfe des Prometheus | Beethoven, Ludwig van | Neue Zuordnung |  | Q1157012 | Die Geschöpfe des Prometheus, Ballett von Beethoven und Viganò; Komponist Ludwig van Beethoven |
| Werk | Die Meistersinger von Nürnberg | Wagner, Richard | Neue Zuordnung |  | Q465540 | Die Meistersinger von Nürnberg, Oper von Richard Wagner; Komponist Richard Wagner |
| Werk | Die Walküre | Wagner, Richard | Neue Zuordnung |  | Q324319 | Die Walküre, Oper von Richard Wagner (1870); Komponist Richard Wagner |
| Werk | Die Zauberflöte | Mozart, Wolfgang Amadeus | Neue Zuordnung |  | Q5064 | Die Zauberflöte, Oper von Wolfgang Amadeus Mozart (Musik) und Emanuel Schikaneder (Libretto); Komponist Wolfgang Amadeus Mozart |
| Werk | Elektra | Strauss, Richard | Neue Zuordnung |  | Q731927 | Elektra, Oper von Richard Strauss; Komponist Richard Strauss |
| Werk | Evgenij Onegin | Čajkovskij, Pëtr Ilʹič | Neue Zuordnung |  | Q50956 | Eugen Onegin, Oper von Pjotr Iljitsch Tschaikowski; Komponist Pjotr Iljitsch Tschaikowski |
| Werk | Falstaff | Verdi, Giuseppe | Neue Zuordnung |  | Q318455 | Falstaff, Oper von Giuseppe Verdi; Komponist Giuseppe Verdi |
| Werk | Ganymed | Schubert, Franz | Neue Zuordnung |  | Q11296115 | Ganymed, Lied von Franz Schubert; Komponist Franz Schubert |
| Werk | Götterdämmerung | Wagner, Richard | Neue Zuordnung |  | Q272029 | Götterdämmerung, Oper von Richard Wagner; Komponist Richard Wagner |
| Werk | Herzog Blaubart's Burg |  | Neue Zuordnung |  | Q249749 | Herzog Blaubarts Burg, Oper von Béla Bartók; Komponist Béla Bartók |
| Werk | Il Trovatore | Verdi, Giuseppe | Neue Zuordnung |  | Q203470 | Il trovatore, Oper von Giuseppe Verdi; Komponist Giuseppe Verdi |
| Werk | Kát'a Kabanová | Janáček, Leoš | Neue Zuordnung |  | Q1322339 | Katja Kabanowa, Oper von Leoš Janáček; Komponist Leoš Janáček |
| Werk | La Traviata | Verdi, Giuseppe | Neue Zuordnung |  | Q186162 | La traviata, Oper von Giuseppe Verdi; Komponist Giuseppe Verdi |
| Werk | La clemenza di Tito | Mozart, Wolfgang Amadeus | Neue Zuordnung |  | Q578526 | La clemenza di Tito, Oper von Wolfgang Amadeus Mozart; Komponist Wolfgang Amadeus Mozart |
| Werk | Macbeth | Verdi, Giuseppe | Neue Zuordnung |  | Q320363 | Macbeth, Oper von Giuseppe Verdi; Komponist Giuseppe Verdi |
| Werk | Madama Butterfly | Puccini, Giacomo | Neue Zuordnung |  | Q19005 | Madama Butterfly, Oper von Giacomo Puccini; Komponist Giacomo Puccini |
| Werk | Messen, WAB 28 (f-Moll) | Bruckner, Anton | Neue Zuordnung |  | Q1472748 | Messe f-Moll, musikalisches Werk des österreichischen Komponisten Anton Bruckner; Komponist Anton Bruckner |
| Werk | Messen, op. 123 (D-Dur) | Beethoven, Ludwig van | Neue Zuordnung |  | Q723790 | Missa Solemnis, Werk von Beethoven; Komponist Ludwig van Beethoven |
| Werk | Missa in angustijs | Haydn, Joseph | Neue Zuordnung |  | Q660836 | Missa in angustiis, Messkomposition; Komponist Joseph Haydn |
| Werk | Orpheus und Eurydike | Gluck, Christoph Willibald | Neue Zuordnung |  | Q723776 | Orfeo ed Euridice, Oper von Christoph Willibald Gluck; Komponist Christoph Willibald Gluck |
| Werk | Parsifal | Wagner, Richard | Neue Zuordnung |  | Q220340 | Parsifal, Oper von Richard Wagner; Komponist Richard Wagner |
| Werk | Pikovaja dama | Čajkovskij, Pëtr Ilʹič | Neue Zuordnung |  | Q221047 | Pique Dame, Oper von Peter Tschaikowski; Komponist Pjotr Iljitsch Tschaikowski |
| Werk | Requium | Mozart, Wolfgang Amadeus | Neue Zuordnung |  | Q207875 | Requiem, Werk von Wolfgang Amadeus Mozart; Komponist Wolfgang Amadeus Mozart, Franz Xaver Süßmayr |
| Werk | Rhapsodien, Alt, Männerchor, Orchester, op. 53 | Brahms, Johannes | Neue Zuordnung |  | Q432984 | Alt-Rhapsodie, Chorwerk von Johannes Brahms nach einem Text von Johann Wolfgang von Goethe; Komponist Johannes Brahms |
| Werk | Rigoletto | Verdi, Giuseppe | Neue Zuordnung |  | Q189234 | Rigoletto, Oper von Giuseppe Verdi; Komponist Giuseppe Verdi |
| Werk | Sinfonien, Nr. 9, op. 125 (d-Moll) | Beethoven, Ludwig van | Neue Zuordnung |  | Q11989 | 9. Sinfonie, Sinfonie von Ludwig van Beethoven; Komponist Ludwig van Beethoven |
| Werk | Sinfonien, Nr. 9, op. 125 (d-Moll) | Beethoven, Ludwig von | Neue Zuordnung |  | Q11989 | 9. Sinfonie, Sinfonie von Ludwig van Beethoven; Komponist Ludwig van Beethoven |
| Werk | Svadebka | Stravinsky, Igor | Neue Zuordnung |  | Q2521679 | Les Noces, Komposition von Igor Strawinsky; Komponist Igor Strawinsky |
| Werk | Székely fonó | Kodály, Zoltán | Neue Zuordnung |  | Q527447 | Spinnstube, opera by Zoltán Kodály (1932); Komponist Zoltán Kodály |
| Werk | Tannhäuser und der Sängerkrieg auf Wartburg | Wagner, Richard | Neue Zuordnung |  | Q560619 | Tannhäuser, Oper von Richard Wagner; Komponist Richard Wagner |
| Werk | Vanessa | Barber, Samuel | Neue Zuordnung |  | Q1545849 | Vanessa, englischsprachige Oper von Samuel Barber (1958); Komponist Samuel Barber |
| Werk | Weihnachts-Oratorium | Bach, Johann Sebastian | Neue Zuordnung |  | Q642010 | Weihnachts-Oratorium, Komposition von Johann Sebastian Bach; Komponist Johann Sebastian Bach |
| Werk | die Götterdämmerung | Wagner, Richard | Neue Zuordnung |  | Q272029 | Götterdämmerung, Oper von Richard Wagner; Komponist Richard Wagner |
| Ort | New York |  | Korrektur | Q1384 | Q60 | bisher New York, Bundesstaat der Vereinigten Staaten von Amerika; jetzt New York City, bevölkerungsreichste Stadt der Vereinigten Staaten |
| Organisation | Teatro Colón |  | Korrektur | Q11951072 | Q827401 | bisher Teatro Colón, Theater in A Coruña, Spanien; jetzt Teatro Colón, Opernhaus an der Plaza Lavalle in Buenos Aires, Argentinien |
| Person | Böhme, Kurt |  | Korrektur | Q10314824 | Q658343 | bisher Kurt Böhme, Deutscher Marineoffizier und U-Boot-Kommandant im Zweiten Weltkrieg; jetzt Kurt Böhme, deutscher Bassist; Bassbariton; 1908–1989 |
| Person | Böhme, Kurt |  | Korrektur | Q10314824 | Q658343 | bisher Kurt Böhme, Deutscher Marineoffizier und U-Boot-Kommandant im Zweiten Weltkrieg; jetzt Kurt Böhme, deutscher Bassist; Bassbariton; 1908–1989 |
| Person | Dermota, Anton |  | Korrektur | Q12784779 | Q588808 | bisher Anton Dermota, slowenischer Jurist, Politiker und Übersetzer; jetzt Anton Dermota, jugoslawischer Tenor; Tenor; 1910–1989 |
| Person | Hartmann, Rudolf |  | Korrektur | Q124351 | Q2172861 | bisher Rudolf Hartmann, niederdeutscher Schriftsteller und kommunistischer Politiker; jetzt Rudolf Hartmann, deutscher Opernregisseur und Intendant; 1900–1988 |
| Person | Hartmann, Rudolf |  | Korrektur | Q124351 | Q2172861 | bisher Rudolf Hartmann, niederdeutscher Schriftsteller und kommunistischer Politiker; jetzt Rudolf Hartmann, deutscher Opernregisseur und Intendant; 1900–1988 |
| Person | Holm, Richard |  | Korrektur | Q19273665 | Q96387 | bisher Richard William Holm, botanist; jetzt Richard Holm, deutscher Opernsänger (Tenor); Tenor; 1912–1988 |
| Person | Holm, Richard |  | Korrektur | Q19273665 | Q96387 | bisher Richard William Holm, botanist; jetzt Richard Holm, deutscher Opernsänger (Tenor); Tenor; 1912–1988 |
| Person | Klein, Peter |  | Korrektur | Q102360758 | Q87612 | bisher Peter Klein, deutscher Informatiker (1966- ); jetzt Peter Klein, deutsch-österreichischer Tenor und Musikpädagoge; Tenor; 1907–1992 |
| Person | Lohmann, Paul |  | Korrektur | Q2061025 | Q5962517 | bisher Paul Lohmann, deutscher Politiker (SPD), MdL; jetzt Paul Lohmann, Deutscher Konzert- und Oratoriensänger (Bariton) und Gesangspädagoge; 1894–1981 |
| Person | Preys, Hermann |  | Korrektur | Q1612378 | Q61080 | bisher Hermann Preysing, deutscher Hals-Nasen-Ohren-Arzt und Hochschullehrer; jetzt Hermann Prey, deutscher Bariton; Bariton; 1929–1998 |
| Person | Schmidt, Franz |  | Korrektur | Q95295060 | Q434601 | bisher Franz Schmidt, deutscher Bibliothekar, Philosoph und Literaturwissenschaftler (1895–1972); jetzt Franz Schmidt, österreichischer Komponist; 1874–1939 |
| Person | Weber, Ludwig |  | Korrektur | Q136748514 | Q79010 | bisher Ludwig Weber, verfolgter Sozialdemokrat; jetzt Ludwig Weber, österreichischer Opernsänger (Bass); Bass; 1899–1974 |
| Person | Wiener, Otto |  | Korrektur | Q86610 | Q89123 | bisher Otto Wiener, deutscher Physiker; jetzt Otto Wiener, österreichischer Opernsänger (Bariton); Bariton; 1911–2000 |
| Werk | Carmen | Bizet, Georges | Korrektur | Q674832 | Q185968 | bisher Carmen, Novelle von Prosper Mérimée; jetzt Carmen, Oper von Georges Bizet; Komponist Georges Bizet |
| Werk | Der Rosenkavalier | Strauss, Richard | Korrektur | Q85756466 | Q471240 | bisher Der Rosenkavalier, 1977 studio album by Lear, Von Stade, Welting, Bastin, Carreras, Hammond Stroud, Philharmonie de Rotterdam conducted by Edo de Waart; jetzt Der Rosenkavalier, Oper von Richard Strauss; Komponist Richard Strauss |
| Werk | Die Jahreszeiten | Haydn, Joseph | Korrektur | Q1213668 | Q970337 | bisher Die Jahreszeiten, Roman von Peter Bichsel; jetzt Die Jahreszeiten, Musikwerk von Joseph Haydn; Komponist Joseph Haydn |
| Werk | Don Giovanni | Mozart, Wolfgang Amadeus | Korrektur | Q3510792 | Q192039 | bisher Don Giovanni, Album von Lucio Battisti; jetzt Don Giovanni, italienische Oper von W. A. Mozart und Lorenzo Da Ponte; Komponist Wolfgang Amadeus Mozart |
| Werk | Johannespassion | Bach, Johann Sebastian | Korrektur | Q106280609 | Q865333 | bisher Johannespassion / Passio Salvatoris et Domini Nostri Jesu Christi, Swedish musical work by unknown composer; jetzt Johannes-Passion, vollständig erhaltene authentische Passion von Johann Sebastian Bach; Komponist Johann Sebastian Bach |
| Werk | La Gioconda | Ponchielli, Amilcare | Korrektur | Q25218531 | Q748840 | bisher La Gioconda, play written by Gabriele D'Annunzio; jetzt La Gioconda, Oper von Amilcare Ponchielli; Komponist Amilcare Ponchielli |
| Werk | Le chant de la Terre | Mahler, Gustav | Korrektur | Q3221001 | Q846646 | bisher Le chant de la terre, Klavierstück von Déodat de Séverac; jetzt Das Lied von der Erde, sinfonischer Liederzyklus von Gustav Mahler; Komponist Gustav Mahler |
| Werk | Le nozze di Figaro | Mozart, Wolfgang Amadeus | Korrektur | Q85776062 | Q201873 | bisher Le nozze di Figaro, 1982 studio album by Georg Solti; jetzt Le nozze di Figaro, Oper von Wolfgang Amadeus Mozart und Lorenzo Da Ponte (1786); Komponist Wolfgang Amadeus Mozart |
| Werk | Lohengrin | Wagner, Richard | Korrektur | Q51806381 | Q23085 | bisher Lohengrin, poem by Nouhuwius; jetzt Lohengrin, Oper von Richard Wagner; Komponist Richard Wagner |
| Werk | Pulcinella | Stravinsky, Igor | Korrektur | Q86670408 | Q2630833 | bisher Pulcinella, 1965 studio album by Santo & Johnny; jetzt Pulcinella, Komposition von Igor Fjodorowitsch Strawinski; Komponist Igor Strawinsky |
| Werk | Requiem | Verdi, Giuseppe | Korrektur | Q6941842 | Q1356210 | bisher Requiem, musikalische Form für die liturgische Totenmesse; jetzt Messa da Requiem, Vertonung des Textes der Totenmesse (Requiem) durch den Komponisten Giuseppe Verdi aus dem Jahr 1874; Komponist Giuseppe Verdi |
| Werk | Stabat mater | Pergolesi, Giovanni Battista | Korrektur | Q210080 | Q643347 | bisher Stabat mater, Anfang eines mittelalterlichen Gedichts: ‚Es stand die Mutter schmerzerfüllt‘; jetzt Stabat Mater, Werk von Giovanni Battista Pergolesi; Komponist Giovanni Battista Pergolesi |
| Werk | Stabat mater | Rossini, Gioachino | Korrektur | Q210080 | Q778788 | bisher Stabat mater, Anfang eines mittelalterlichen Gedichts: ‚Es stand die Mutter schmerzerfüllt‘; jetzt Stabat Mater, Komposition von Gioachino Rossini; Komponist Gioachino Rossini |
| Werk | Tristan und Isolde | Wagner, Richard | Korrektur | Q115127657 | Q1324254 | bisher Tristan und Isolde, 1982 opera recording conducted by Carlos Kleiber; jetzt Tristan und Isolde, Oper von Richard Wagner; Komponist Richard Wagner |
| Werk | Un ballo in maschera | Verdi, Giuseppe | Korrektur | Q64732249 | Q221757 | bisher Un ballo in maschera, Quadrille von Johann Strauss Sohn (op. 272); jetzt Un ballo in maschera, Oper von Giuseppe Verdi; Komponist Giuseppe Verdi |
| Person | Campese |  | Streichung | Q5028328 |  | die gehaltene Kennung ist Campese Ma'afu, australischer Rugby-Union-Spieler; geboren 1984; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Person | Eberhardt, Paul |  | Streichung | Q94761352 |  | die gehaltene Kennung ist Paul Eberhardt, Mensch; Theologe, Herausgeber, Schriftsteller; 1879–1923; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Person | Ernest, Wilhelm |  | Streichung | Q2572555 |  | die gehaltene Kennung ist Wilhelm Ernst, deutscher katholischer Moraltheologe; 1927–2001; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Person | Leder, Alfred |  | Streichung | Q27732662 |  | die gehaltene Kennung ist Alfred Leder, Prof. in Rostock: 1994-2015; zuletzt: Professor (C4) für Strömungsmechanik; geboren 1949; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Person | Leopold III. |  | Streichung | Q349086 |  | die gehaltene Kennung ist Leopold III., Markgraf von Ostarrichi (1095–1136); damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Person | Simon, Théo |  | Streichung | Q20243266 |  | die gehaltene Kennung ist Theo Simon, deutscher Geologe; 1947–2025; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Person | Thiel, Fred |  | Streichung | Q78170333 |  | die gehaltene Kennung ist Fred Thiel, American businessman; geboren 1960; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Person | Tinel, Paul |  | Streichung | Q110850252 |  | die gehaltene Kennung ist Paul Tinel, Mensch; Schneider; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Person | Traute, Elisabeth |  | Streichung | Q55676977 |  | die gehaltene Kennung ist Elisabeth Trauterbul, Ehefrau des Magdeburger Stiftsjuristen Ludwig Trauterbul; 1540–1607; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Person | Weber |  | Streichung | Q63875 |  | die gehaltene Kennung ist Georg Heinrich Weber, deutscher Arzt und Botaniker; 1752–1828; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Person | Witte, Wolfgang |  | Streichung | Q2591797 |  | die gehaltene Kennung ist Wolfgang Witte, deutscher Mikrobiologe; geboren 1945; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Person | Wolf, Winfried |  | Streichung | Q2584346 |  | die gehaltene Kennung ist Winfried Wolf, deutscher Politiker (PDS), MdB; 1949–2023; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Werk | Die junge Magd | Hindemith, Paul | Streichung | Q19183563 |  | die gehaltene Kennung ist Die junge Magd, 1913 poem written by Georg Trakl; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Werk | Lied der Mignon | Beethoven, Ludwig von | Streichung | Q110953165 |  | die gehaltene Kennung ist Wilhelm Meisters Lehrjahre. Heiss mich nicht reden, Lied von Johann Wolfgang von Goethe; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Werk | Nachtstück | Schubert, Franz | Streichung | Q33056195 |  | die gehaltene Kennung ist Nachtstück, poem; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Werk | Regentropfen |  | Streichung | Q60992362 |  | die gehaltene Kennung ist Regentropfen, Lied von Emil Palm und Willi Ostermann (1935); damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |
| Werk | Stabat mater |  | Streichung | Q210080 |  | die gehaltene Kennung ist Stabat mater, Anfang eines mittelalterlichen Gedichts: ‚Es stand die Mutter schmerzerfüllt‘; damit nachweislich falsch, ein belegter Ersatz liegt nicht vor |

## Etappe 2, Nachtrag

Diese Zuordnungen sind in der ersten Etappe zurückgenommen worden, weil `scripts/verify-manual-approvals.py` sie zurückwies. Die Ursache lag im Prüfskript. Sein Typsignal-Vokabular lag außerhalb des normalisierten Stringraums, weil die Umlautentschärfung `sänger` auf `sanger` abbildet, während die Liste nur `sänger` und `saenger` führte; dazu fehlten fachliche Signale für Dramatiker, Architekt, Violinist, Oratorium, Passion, Messe, Musiklabel, Fluggesellschaft, Orchester, Festival und Opernhaus. Die Projektleitung hat das Skript repariert, die Signale laufen jetzt durch dieselbe Normalisierung wie die geprüften Beschreibungen, und `tests/test_44_approval_signals.py` sichert das ab. Die hier gelisteten Zuordnungen sind daraufhin erneut über `Special:EntityData` abgerufen, erneut gegen die Behauptung der Vorschlagsdokumente geprüft und eingetragen worden.

| Typ | Quellname | Komponist | Eingriff | alte Kennung | neue Kennung | Beleg aus dem Abruf |
|---|---|---|---|---|---|---|
| Organisation | Landestheater (Hannover) |  | Neue Zuordnung |  | Q1524804 | Niedersächsische Staatstheater Hannover, Mehrspartentheater |
| Organisation | Münchner Opern-Festspiele |  | Neue Zuordnung |  | Q822390 | Münchner Opernfestspiele, music festival |
| Organisation | Plattenevrlag Decca |  | Neue Zuordnung |  | Q557632 | Decca Records, britisches Musiklabel |
| Organisation | R.C.A.-Victor |  | Neue Zuordnung |  | Q3415083 | RCA Victor, US international record label |
| Organisation | SAS  Scandinavian Airlines |  | Neue Zuordnung |  | Q187854 | SAS Scandinavian Airlines, skandinavische Fluggesellschaft |
| Organisation | Stadttheater Graz |  | Neue Zuordnung |  | Q618239 | Opernhaus Graz, Opernhaus in Graz, Steiermark, Österreich |
| Organisation | orchestre municipal (Strasbourg) |  | Neue Zuordnung |  | Q472844 | Straßburger Philharmoniker, Sinfonie- und Opernorchester der Stadt Straßburg |
| Person | Appia, Adolphe |  | Neue Zuordnung |  | Q124077 | Adolphe Appia, Schweizer Architekt; 1862–1928 |
| Person | Cesare, curzi |  | Neue Zuordnung |  | Q1056774 | Cesare Curzi, amerikanischer Opernsänger; Tenor; 1926–2023 |
| Person | Dönch, Carl |  | Neue Zuordnung |  | Q1730779 | Karl Dönch, deutsch-österreichischer Sänger und Schauspieler; Bassbariton; 1915–1994 |
| Person | Grillparzer, Franz |  | Neue Zuordnung |  | Q154438 | Franz Grillparzer, österreichischer Dramatiker; 1791–1872 |
| Person | Maykut, Erich |  | Neue Zuordnung |  | Q59531271 | Erich Majkut, österreichischer Opern- und Konzertsänger; 1907–1976 |
| Person | Otto van Rohr |  | Neue Zuordnung |  | Q2041291 | Otto von Rohr, deutscher Opernsänger; Bass; 1914–1982 |
| Person | Pirchan, Emil |  | Neue Zuordnung |  | Q1336659 | Emil Pirchan, österreichischer Bühnenbildner, Architekt und Autor (1884-1957) |
| Person | Prihoda, Vasa |  | Neue Zuordnung |  | Q679555 | Váša Příhoda, tschechischer Violinist; 1900–1960 |
| Person | Raimund, Ferdinand |  | Neue Zuordnung |  | Q45025 | Ferdinand Raimund, österreichischer Dramatiker; 1790–1836 |
| Werk | Elias, op. 70, MWV A 25 | Mendelssohn Bartholdy, Felix | Neue Zuordnung |  | Q1329006 | Elias, Oratorium von Mendelssohn-Bartholdy; Komponist Felix Mendelssohn Bartholdy |
| Werk | Matthäuspassion | Bach, Johann Sebastian | Neue Zuordnung |  | Q379111 | Matthäus-Passion, Passion von Johann Sebastian Bach; Komponist Johann Sebastian Bach |
| Werk | Messen, KV 317 | Mozart, Wolfgang Amadeus | Neue Zuordnung |  | Q1543168 | Krönungsmesse, Lateinische Messe komponiert von Wolfgang Amadeus Mozart; Komponist Wolfgang Amadeus Mozart |
| Werk | Paradies und Peri |  | Neue Zuordnung |  | Q1170035 | Das Paradies und die Peri, weltliches Oratorium von Robert Schumann (1843); Komponist Robert Schumann |
| Person | Wächter, Eberhard |  | Korrektur | Q481471 | Q78976 | bisher Eberhard von Wächter, deutscher Maler; jetzt Eberhard Waechter, österreichischer Sänger und Operndirektor; Bariton; 1929–1992 |

## Etappe 3

Nach der Reparatur der zweiten Etappe hat `scripts/verify-manual-approvals.py` noch drei belegte Zuordnungen zurückgewiesen, weil es sein Typsignal ausschließlich im Beschreibungstext sucht und die dortige Wortform im Vokabular fehlte. `Arnold, Heinz` trägt die Beschreibung „deutscher Operndirektor und -spielleiter", während `Regisseur` allein in P106 steht; `Linné, Carl von` trägt „schwedischer Naturwissenschaftler", während die Liste `naturforscher` führte; `Opéra de Monte-Carlo. Orchestre national` trägt nur die englische Beschreibung „symphonic orchestra in Monaco". Die Projektleitung hat das Vokabular um diese Formen ergänzt, bei Organisationen zusätzlich um `opera house` und `record label`, weil dieselbe Lücke bei englischsprachigen Beschreibungen wiederkehrt. Die drei Zuordnungen sind daraufhin erneut über `Special:EntityData` abgerufen, erneut geprüft und eingetragen worden.

Bei `Linné, Carl von` ist allein die Kennung belegt. Der Sachbezug im Bestand bleibt offen, weil ungeklärt ist, warum der schwedische Naturforscher in einer Tannhäuser-Rezension erwähnt wird; der Punkt liegt beim Erfassungsteam und steht als QF-22 im Register.

| Typ | Quellname | Komponist | Eingriff | alte Kennung | neue Kennung | Beleg aus dem Abruf |
|---|---|---|---|---|---|---|
| Organisation | Opéra de Monte-Carlo. Orchestre national |  | Neue Zuordnung |  | Q2914921 | Orchestre philharmonique de Monte-Carlo, symphonic orchestra in Monaco |
| Person | Arnold, Heinz |  | Neue Zuordnung |  | Q18019730 | Heinz Arnold, deutscher Operndirektor und -spielleiter; 1906–1994 |
| Person | Linné, Carl von |  | Neue Zuordnung |  | Q1043 | Carl von Linné, schwedischer Naturwissenschaftler, der die Grundlagen der modernen Taxonomie entwickelte; 1707–1778 |
