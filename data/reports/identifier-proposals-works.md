# Normdaten-Vorschläge für den Werkindex

Recherchestand 2026-08-22. Gegenstand sind die Werke aus `data/output/wikidata-reconciliation.json`, die Liste `unmatched` ohne Identifikator und die Liste `matched` zur Gegenprüfung. Jeder hier genannte Identifikator ist über `https://www.wikidata.org/wiki/Special:EntityData/<QID>.json` abgerufen und an drei Merkmalen geprüft worden, ob Label oder Alias den Werktitel trägt, ob der in Wikidata ausgewiesene Komponist mit dem im Werkindex geführten übereinstimmt und ob die Entität das musikalische Werk bezeichnet statt seiner literarischen Vorlage, einer Aufnahme oder einer Gattung. Kein Identifikator stammt aus dem Gedächtnis.

Das Dokument schlägt vor und ändert nichts. Weder `wikidata-reconciliation.json` noch der Datensatz noch die Skripte sind angetastet.

Die Konfidenzstufen sind wie folgt belegt. **Gesichert** heißt, Titel und Komponist stimmen und die Entität bezeichnet das musikalische Werk. **Wahrscheinlich** heißt, die Zuordnung ist plausibel, aber ein Merkmal fehlt oder weicht ab; die Abweichung steht jeweils im Abschnitt „Fälle für eine fachliche Entscheidung". **Offen** heißt, es gibt mehrere gleichrangige Kandidaten oder keinen tragfähigen Beleg.

## Überblick

| Kategorie | Zahl |
|---|---:|
| Vorschläge für Werke ohne Identifikator, gesichert | 45 |
| Vorschläge für Werke ohne Identifikator, wahrscheinlich | 3 |
| Werke ohne Identifikator, bewusst offen gelassen | 36 |
| Korrekturen mit belegtem Ersatz | 20 |
| Korrekturen ohne tragfähigen Ersatz, Identifikator zu entfernen | 5 |

Die 48 Vorschläge decken 50 der 86 `unmatched`-Zeilen ab, weil zwei Werke doppelt geführt sind, die neunte Sinfonie Beethovens unter zwei Komponisten-Schreibweisen und die Götterdämmerung mit und ohne Artikel.

Von den 38 Werken, die im Datenbestand bereits einen Identifikator tragen, sind 25 falsch. Das betrifft 22 der 34 automatisch zugeordneten Werke und 3 der 4 Identifikatoren, die aus dem Werkindex selbst stammen und die Reconciliation deshalb nie geprüft hat.

## Vorschläge für Werke ohne Identifikator

| Quelltitel | geführter Komponist | Vorschlag | Wikidata-Label | ausgewiesener Komponist | Werktyp | Uraufführung bzw. Erscheinen | Konfidenz |
|---|---|---|---|---|---|---|---|
| 3. Symphonie | Brahms, Johannes | [Q223502](https://www.wikidata.org/wiki/Q223502) | 3. Sinfonie | Johannes Brahms | musikalisches Werk | UA 1883-12-02 | gesichert |
| 8. Symphonie | Beethoven, Ludwig van | [Q270785](https://www.wikidata.org/wiki/Q270785) | 8. Sinfonie | Ludwig van Beethoven | musikalisches Werk | Publ. 1817 | gesichert |
| Aida | Verdi, Giuseppe | [Q171277](https://www.wikidata.org/wiki/Q171277) | Aida | Giuseppe Verdi | dramatisch-musikalisches Werk (Oper) | UA 1871-12-24 | gesichert |
| Arabella | Strauss, Richard | [Q390779](https://www.wikidata.org/wiki/Q390779) | Arabella | Richard Strauss | dramatisch-musikalisches Werk (Commedia lirica, Oper) | UA 1933-07-01 | gesichert |
| Boris Godunov | Musorgskij, Modest Petrovič | [Q386846](https://www.wikidata.org/wiki/Q386846) | Boris Godunow | Modest Petrovich Mussorgsky | dramatisch-musikalisches Werk (Oper) | UA 1874-01-27 | gesichert |
| Capriccio | (kein Komponist geführt) | [Q1034949](https://www.wikidata.org/wiki/Q1034949) | Capriccio | Richard Strauss | dramatisch-musikalisches Werk (Oper) | UA 1942-10-28 | wahrscheinlich |
| Chovanščina | Musorgskij, Modest Petrovič | [Q917711](https://www.wikidata.org/wiki/Q917711) | Chowanschtschina | Modest Petrovich Mussorgsky, Nikolai Rimsky-Korsakov | dramatisch-musikalisches Werk (Oper) | UA 1886-02-09 | gesichert |
| Così fan tutte | Mozart, Wolfgang Amadeus | [Q207410](https://www.wikidata.org/wiki/Q207410) | Così fan tutte | Wolfgang Amadeus Mozart | dramatisch-musikalisches Werk (Dramma giocoso, Opera buffa, Oper) | UA 1790-01-26 | gesichert |
| Daphne | Strauss, Richard | [Q1165496](https://www.wikidata.org/wiki/Q1165496) | Daphne | Richard Strauss | dramatisch-musikalisches Werk (Oper) | UA 1938-10-15 | gesichert |
| Der Evangelimann | Kienzl, Wilhelm | [Q1193192](https://www.wikidata.org/wiki/Q1193192) | Der Evangelimann | Wilhelm Kienzl | dramatisch-musikalisches Werk (Oper) | UA 1895-05-04 | gesichert |
| Der Wildschütz oder Die Stimme der Natur | Lortzing, Albert | [Q253376](https://www.wikidata.org/wiki/Q253376) | Der Wildschütz | Albert Lortzing | dramatisch-musikalisches Werk (Oper) | UA 1842-12-31 | gesichert |
| Die Geschöpfe des Prometheus | Beethoven, Ludwig van | [Q1157012](https://www.wikidata.org/wiki/Q1157012) | Die Geschöpfe des Prometheus | Ludwig van Beethoven | musikalisches Werk | UA 1801-03-28 | gesichert |
| Die Meistersinger von Nürnberg | Wagner, Richard | [Q465540](https://www.wikidata.org/wiki/Q465540) | Die Meistersinger von Nürnberg | Richard Wagner | dramatisch-musikalisches Werk (Oper) | UA 1868-06-21 | gesichert |
| Die Walküre | Wagner, Richard | [Q324319](https://www.wikidata.org/wiki/Q324319) | Die Walküre | Richard Wagner | dramatisch-musikalisches Werk (Musikdrama, Oper) | UA 1870-06-26 | gesichert |
| Die Zauberflöte | Mozart, Wolfgang Amadeus | [Q5064](https://www.wikidata.org/wiki/Q5064) | Die Zauberflöte | Wolfgang Amadeus Mozart | dramatisch-musikalisches Werk (Singspiel, Oper) | UA 1791-09-30 | gesichert |
| E-Dur Messe | Schubert, Franz | [Q1924059](https://www.wikidata.org/wiki/Q1924059) | Messe Nr. 6 Es-Dur | Franz Schubert | musikalisches Werk (Messe) | Publ. 1865 | wahrscheinlich |
| Elektra | Strauss, Richard | [Q731927](https://www.wikidata.org/wiki/Q731927) | Elektra | Richard Strauss | dramatisch-musikalisches Werk (Tragödie, Oper) | UA 1909-01-25 | gesichert |
| Elias, op. 70, MWV A 25 | Mendelssohn Bartholdy, Felix | [Q1329006](https://www.wikidata.org/wiki/Q1329006) | Elias | Felix Mendelssohn | musikalisches Werk (Oratorium) | Publ. 1846 | gesichert |
| Evgenij Onegin | Čajkovskij, Pëtr Ilʹič | [Q50956](https://www.wikidata.org/wiki/Q50956) | Eugen Onegin | Pyotr Ilyich Tchaikovsky | dramatisch-musikalisches Werk (Oper) | UA 1879-03-17 | gesichert |
| Falstaff | Verdi, Giuseppe | [Q318455](https://www.wikidata.org/wiki/Q318455) | Falstaff | Giuseppe Verdi | dramatisch-musikalisches Werk (Commedia lirica, Oper) | UA 1893-02-09 | gesichert |
| Ganymed | Schubert, Franz | [Q11296115](https://www.wikidata.org/wiki/Q11296115) | Ganymed | Franz Schubert | musikalisches Werk (Lied) | Publ. 1825 | gesichert |
| Götterdämmerung / die Götterdämmerung | Wagner, Richard | [Q272029](https://www.wikidata.org/wiki/Q272029) | Götterdämmerung | Richard Wagner | dramatisch-musikalisches Werk (Musikdrama, Oper) | UA 1876-08-17 | gesichert |
| Herzog Blaubart's Burg | (Anmerkung: Bartók, Béla) | [Q249749](https://www.wikidata.org/wiki/Q249749) | Herzog Blaubarts Burg | Béla Bartók | dramatisch-musikalisches Werk (Oper) | UA 1918-05-24 | gesichert |
| Il Trovatore | Verdi, Giuseppe | [Q203470](https://www.wikidata.org/wiki/Q203470) | Il trovatore | Giuseppe Verdi | dramatisch-musikalisches Werk (Oper) | UA 1853-01-19 | gesichert |
| Kát'a Kabanová | Janáček, Leoš | [Q1322339](https://www.wikidata.org/wiki/Q1322339) | Katja Kabanowa | Leoš Janáček | dramatisch-musikalisches Werk (Oper) | UA 1921-11-23 | gesichert |
| La clemenza di Tito | Mozart, Wolfgang Amadeus | [Q578526](https://www.wikidata.org/wiki/Q578526) | La clemenza di Tito | Wolfgang Amadeus Mozart | dramatisch-musikalisches Werk (Opera seria, Oper) | UA 1791-09-06 | gesichert |
| La Traviata | Verdi, Giuseppe | [Q186162](https://www.wikidata.org/wiki/Q186162) | La traviata | Giuseppe Verdi | dramatisch-musikalisches Werk / italienische Oper (Tragödie, Oper) | UA 1853-03-06 | gesichert |
| Macbeth | Verdi, Giuseppe | [Q320363](https://www.wikidata.org/wiki/Q320363) | Macbeth | Giuseppe Verdi | dramatisch-musikalisches Werk (Opera seria, Tragödie, Oper) | UA 1847-03-14 | gesichert |
| Madama Butterfly | Puccini, Giacomo | [Q19005](https://www.wikidata.org/wiki/Q19005) | Madama Butterfly | Giacomo Puccini | dramatisch-musikalisches Werk (Oper, Tragödie) | UA 1904-02-17 | gesichert |
| Matthäuspassion | Bach, Johann Sebastian | [Q379111](https://www.wikidata.org/wiki/Q379111) | Matthäus-Passion | Johann Sebastian Bach | Passion (Oratorium) | UA 1727-04-11 | gesichert |
| Messen, KV 317 | Mozart, Wolfgang Amadeus | [Q1543168](https://www.wikidata.org/wiki/Q1543168) | Krönungsmesse | Wolfgang Amadeus Mozart | musikalisches Werk (Messe) | Publ. 1779-01-01 | gesichert |
| Messen, WAB 28 (f-Moll) | Bruckner, Anton | [Q1472748](https://www.wikidata.org/wiki/Q1472748) | Messe f-Moll | Anton Bruckner | musikalisches Werk (Messe) | ohne Datum | gesichert |
| Messen, op. 123 (D-Dur) | Beethoven, Ludwig van | [Q723790](https://www.wikidata.org/wiki/Q723790) | Missa Solemnis | Ludwig van Beethoven | musikalisches Werk (Messe) | ohne Datum | gesichert |
| Missa in angustijs | Haydn, Joseph | [Q660836](https://www.wikidata.org/wiki/Q660836) | Missa in angustiis | Joseph Haydn | musikalisches Werk (Messe) | Publ. 1798-01-01 | gesichert |
| Orpheus und Eurydike | Gluck, Christoph Willibald | [Q723776](https://www.wikidata.org/wiki/Q723776) | Orfeo ed Euridice | Christoph Willibald von Gluck | dramatisch-musikalisches Werk (Oper) | UA 1762-10-05 | gesichert |
| Paradies und Peri | (Anmerkung: Schumann, Robert) | [Q1170035](https://www.wikidata.org/wiki/Q1170035) | Das Paradies und die Peri | Robert Schumann | musikalisches Werk (Oratorium) | UA 1843-12-04 | gesichert |
| Parsifal | Wagner, Richard | [Q220340](https://www.wikidata.org/wiki/Q220340) | Parsifal | Richard Wagner | dramatisch-musikalisches Werk (Oper, Musikdrama) | UA 1882-07-26 | gesichert |
| Pikovaja dama | Čajkovskij, Pëtr Ilʹič | [Q221047](https://www.wikidata.org/wiki/Q221047) | Pique Dame | Pyotr Ilyich Tchaikovsky | dramatisch-musikalisches Werk (Oper) | UA 1890-12-07 | gesichert |
| Requium | Mozart, Wolfgang Amadeus | [Q207875](https://www.wikidata.org/wiki/Q207875) | Requiem | Wolfgang Amadeus Mozart, Franz Xaver Süssmayr | musikalisches Werk (Messe) | UA 1792 | gesichert |
| Rhapsodien, Alt, Männerchor, Orchester, op. 53 | Brahms, Johannes | [Q432984](https://www.wikidata.org/wiki/Q432984) | Alt-Rhapsodie | Johannes Brahms | musikalisches Werk | Publ. 1870 | gesichert |
| Rigoletto | Verdi, Giuseppe | [Q189234](https://www.wikidata.org/wiki/Q189234) | Rigoletto | Giuseppe Verdi | dramatisch-musikalisches Werk (Oper) | UA 1851-03-11 | gesichert |
| Sinfonien, Nr. 9, op. 125 (d-Moll) | Beethoven, Ludwig van / von | [Q11989](https://www.wikidata.org/wiki/Q11989) | 9. Sinfonie | Ludwig van Beethoven | musikalisches Werk | UA 1824-05-07 | gesichert |
| Svadebka | Stravinsky, Igor | [Q2521679](https://www.wikidata.org/wiki/Q2521679) | Les Noces | Igor Stravinsky | Ballett | UA 1923-06-13 | gesichert |
| Székely fonó | Kodály, Zoltán | [Q527447](https://www.wikidata.org/wiki/Q527447) | Spinnstube | Zoltán Kodály | dramatisch-musikalisches Werk (Liederspiel, Oper) | Publ. 1932-01-01 | gesichert |
| Tannhäuser und der Sängerkrieg auf Wartburg | Wagner, Richard | [Q560619](https://www.wikidata.org/wiki/Q560619) | Tannhäuser | Richard Wagner | dramatisch-musikalisches Werk (Oper) | UA 1845-10-19 | gesichert |
| Vanessa | Barber, Samuel | [Q1545849](https://www.wikidata.org/wiki/Q1545849) | Vanessa | Samuel Barber | dramatisch-musikalisches Werk (Oper) | UA 1958-01-15 | gesichert |
| Vergin tutt' amor | Durante, Francesco | [Q11493224](https://www.wikidata.org/wiki/Q11493224) | Vergin, tutto amor | Francesco Durante | kein P31 | ohne Datum | wahrscheinlich |
| Weihnachts-Oratorium | Bach, Johann Sebastian | [Q642010](https://www.wikidata.org/wiki/Q642010) | Weihnachts-Oratorium | Johann Sebastian Bach | musikalisches Werk (Oratorium) | Publ. 1734 | gesichert |

Zu den Quelltiteln, die vom Wikidata-Label abweichen, trägt die vorgeschlagene Entität den Quelltitel jeweils als Alias oder als `P1476`. Belegt ist das für „Der Wildschütz oder Die Stimme der Natur" (Alias), „Tannhäuser und der Sängerkrieg auf Wartburg" (Alias und `P1476`), „Orpheus und Eurydike" (Alias), „Székely fonó" (Alias und `P1476`), „Elias, op. 70, MWV A 25" (Alias „MWV A 25"), „Messen, KV 317" (Alias „K 317"), „Messen, op. 123 (D-Dur)" (Alias „Missa solemnis, Op. 123") und „Missa in angustijs" (Label „Missa in angustiis"). Bei „Messen, WAB 28 (f-Moll)" liefern `P826` (Tonart f-Moll) und die IMSLP-Kennung `Mass_No.3_in_F_minor,_WAB_28_(Bruckner,_Anton)` den Nachweis der Opuszählung. Bei „Svadebka" trägt die Entität den russischen Titel `Свадебка` als `P1476`; zusätzlich nennt der Bestand selbst den Titel „Les Noces" (Abschlussschein zur Aufführung in München).

## Korrekturen

### Der Fall Carmen

`Q674832` trägt das Label „Carmen" in neun Sprachen und ist ausweislich der abgerufenen Entitätsdaten die Novelle von Prosper Mérimée, `P31` literarisches Werk, `P50` Prosper Mérimée, `P577` 1847. Genau diese Jahreszahl ist über das Enrichment als `m3gim:wdPremiereDate` in den Datensatz gelangt. Bizets Oper ist `Q185968`, `P31` dramatisch-musikalisches Werk, `P86` Georges Bizet, `P1191` 1875-03-03, Genre Opéra comique. Die Verbindung zwischen beiden Entitäten ist in Wikidata explizit gesetzt, `Q185968` führt `P144` (basiert auf) mit dem Wert `Q674832`. Die Reconciliation hat die Vorlage statt der Vertonung gegriffen, und Wikidata selbst dokumentiert das Verhältnis.

### Dasselbe Muster bei weiteren Werken

Die Verwechslung zwischen Vorlage und Vertonung betrifft sieben weitere Werke. Bei Lohengrin ist es das mittelhochdeutsche Versepos, bei La Gioconda das Drama von Gabriele D'Annunzio, beim Stabat mater die mittelalterliche Sequenz des Jacopone da Todi, bei der Jungen Magd das Gedicht Georg Trakls, beim Lied der Mignon der Goethe-Text aus Wilhelm Meisters Lehrjahren, beim Nachtstück ein Gedicht Friederike Bruns und bei den Jahreszeiten ein Roman des zwanzigsten Jahrhunderts, der mit Haydn nichts zu tun hat.

Daneben steht ein zweites, gleich häufiges Muster, die Verwechslung des Werks mit einer Tonaufnahme. Fünf Zuordnungen zeigen auf Alben, darunter eine Kleiber-Einspielung des Tristan von 1982, eine Solti-Einspielung des Figaro von 1982 und ein Popalbum von Lucio Battisti, das zufällig „Don Giovanni" heißt. Ein drittes Muster trifft die Gattungsebene. `Q6941842` bezeichnet die musikalische Gattung Requiem, `P31` Musikgattung und Werktyp, `P279` Untertyp von Messe. Der Wert steht im Datensatz sowohl für das Verdi-Requiem als auch für das Requiem Hindemiths.

| Quelltitel | geführter Komponist | bisheriger Identifikator | was diese Entität tatsächlich ist | korrekter Identifikator | Wikidata-Label | ausgewiesener Komponist | Werktyp und Datum | Konfidenz |
|---|---|---|---|---|---|---|---|---|
| Carmen | Bizet, Georges | [Q674832](https://www.wikidata.org/wiki/Q674832) | Carmen, Novelle von Prosper Mérimée, Publ. 1847; literarisches Werk | [Q185968](https://www.wikidata.org/wiki/Q185968) | Carmen | Georges Bizet | dramatisch-musikalisches Werk (Opéra comique, Oper, französische Oper), UA 1875-03-03 | gesichert |
| La Gioconda | Ponchielli, Amilcare | [Q25218531](https://www.wikidata.org/wiki/Q25218531) | La Gioconda, play written by Gabriele D'Annunzio; literarisches Werk | [Q748840](https://www.wikidata.org/wiki/Q748840) | La Gioconda | Amilcare Ponchielli | dramatisch-musikalisches Werk (Oper, Grand opéra), UA 1876-04-08 | gesichert |
| Lohengrin | Wagner, Richard | [Q51806381](https://www.wikidata.org/wiki/Q51806381) | Lohengrin, poem by Nouhuwius; literarisches Werk | [Q23085](https://www.wikidata.org/wiki/Q23085) | Lohengrin | Richard Wagner | dramatisch-musikalisches Werk (Oper), UA 1850-08-28 | gesichert |
| Die Jahreszeiten | Haydn, Joseph | [Q1213668](https://www.wikidata.org/wiki/Q1213668) | Die Jahreszeiten, Roman von Peter Bichsel; literarisches Werk | [Q970337](https://www.wikidata.org/wiki/Q970337) | Die Jahreszeiten | Joseph Haydn | musikalisches Werk (Oratorium), Publ. 1801-01-01 | gesichert |
| Stabat mater | Pergolesi, Giovanni Battista | [Q210080](https://www.wikidata.org/wiki/Q210080) | Stabat mater, Anfang eines mittelalterlichen Gedichts: ‚Es stand die Mutter schmerzerfüllt‘; literarisches Werk / Sequenz (Dichtung) | [Q643347](https://www.wikidata.org/wiki/Q643347) | Stabat Mater | Giovanni Battista Pergolesi | musikalisches Werk, Publ. 1736-01-01 | gesichert |
| Stabat mater | Rossini, Gioachino | [Q210080](https://www.wikidata.org/wiki/Q210080) | Stabat mater, Anfang eines mittelalterlichen Gedichts: ‚Es stand die Mutter schmerzerfüllt‘; literarisches Werk / Sequenz (Dichtung) | [Q778788](https://www.wikidata.org/wiki/Q778788) | Stabat Mater | Gioachino Rossini | musikalisches Werk (geistliche Musik), Publ. 1831-01-01 | gesichert |
| Requiem | Verdi, Giuseppe | [Q6941842](https://www.wikidata.org/wiki/Q6941842) | Requiem, musikalische Form für die liturgische Totenmesse; Musikgattung / Werktyp | [Q1356210](https://www.wikidata.org/wiki/Q1356210) | Messa da Requiem | Giuseppe Verdi | musikalisches Werk (Requiem, Messe), UA 1874-05-22 | gesichert |
| Johannespassion | Bach, Johann Sebastian | [Q106280609](https://www.wikidata.org/wiki/Q106280609) | Johannespassion / Passio Salvatoris et Domini Nostri Jesu Christi, Swedish musical work by unknown composer; musikalisches Werk | [Q865333](https://www.wikidata.org/wiki/Q865333) | Johannes-Passion | Johann Sebastian Bach | musikalisches Werk (Oratorium, Passion), ohne Datum | gesichert |
| Der Rosenkavalier | Strauss, Richard | [Q85756466](https://www.wikidata.org/wiki/Q85756466) | Der Rosenkavalier, 1977 studio album by Lear, Von Stade, Welting, Bastin, Carreras, Hammond Stroud, Philharmonie de Rotterdam conducted by Edo de Waart; Album (Oper) | [Q471240](https://www.wikidata.org/wiki/Q471240) | Der Rosenkavalier | Richard Strauss | dramatisch-musikalisches Werk (komische Oper, Oper), UA 1911-01-26 | gesichert |
| Don Giovanni | Mozart, Wolfgang Amadeus | [Q3510792](https://www.wikidata.org/wiki/Q3510792) | Don Giovanni, Album von Lucio Battisti; Album (Popmusik) | [Q192039](https://www.wikidata.org/wiki/Q192039) | Don Giovanni | Wolfgang Amadeus Mozart | dramatisch-musikalisches Werk (Dramma giocoso, Oper), UA 1787-10-29 | gesichert |
| Le nozze di Figaro | Mozart, Wolfgang Amadeus | [Q85776062](https://www.wikidata.org/wiki/Q85776062) | Le nozze di Figaro, 1982 studio album by Georg Solti; Album (Oper) | [Q201873](https://www.wikidata.org/wiki/Q201873) | Le nozze di Figaro | Wolfgang Amadeus Mozart | dramatisch-musikalisches Werk (Opera buffa, Oper), UA 1786-05-01 | gesichert |
| Tristan und Isolde | Wagner, Richard | [Q115127657](https://www.wikidata.org/wiki/Q115127657) | Tristan und Isolde, 1982 opera recording conducted by Carlos Kleiber; Album (Oper) | [Q1324254](https://www.wikidata.org/wiki/Q1324254) | Tristan und Isolde | Richard Wagner | dramatisch-musikalisches Werk (Oper), UA 1865-06-10 | gesichert |
| Un ballo in maschera | Verdi, Giuseppe | [Q64732249](https://www.wikidata.org/wiki/Q64732249) | Un ballo in maschera, Quadrille von Johann Strauss Sohn (op. 272); musikalisches Werk (Quadrille) | [Q221757](https://www.wikidata.org/wiki/Q221757) | Un ballo in maschera | Giuseppe Verdi | dramatisch-musikalisches Werk (Oper), UA 1859-02-17 | gesichert |
| Pulcinella | Stravinsky, Igor | [Q86670408](https://www.wikidata.org/wiki/Q86670408) | Pulcinella, 1965 studio album by Santo & Johnny; Album | [Q2630833](https://www.wikidata.org/wiki/Q2630833) | Pulcinella | Igor Stravinsky | choreografisches Werk (neoklassisches Ballett), UA 1920-05-15 | gesichert |
| Le chant de la Terre | Mahler, Gustav | [Q3221001](https://www.wikidata.org/wiki/Q3221001) | Le chant de la terre, Klavierstück von Déodat de Séverac; musikalisches Werk | [Q846646](https://www.wikidata.org/wiki/Q846646) | Das Lied von der Erde | Gustav Mahler | musikalisches Werk (Liederzyklus), UA 1911-11-20 | gesichert |
| Ave Maria | Schubert, Franz | [Q790310](https://www.wikidata.org/wiki/Q790310) | Ave Maria, Musikstück von Bach und Gounod; musikalisches Werk | [Q1331995](https://www.wikidata.org/wiki/Q1331995) | Ellens dritter Gesang | Franz Schubert | musikalisches Werk (klassische Musik), Publ. 1825 | wahrscheinlich |
| Requiem | Hindemith, Paul | [Q6941842](https://www.wikidata.org/wiki/Q6941842) | Requiem, musikalische Form für die liturgische Totenmesse; Musikgattung / Werktyp | [Q3567675](https://www.wikidata.org/wiki/Q3567675) | When Lilacs Last in the Dooryard Bloom'd | Paul Hindemith | musikalisches Werk (Messe), ohne Datum | wahrscheinlich |
| Die Meistersinger von Nürnberg (Quell-ID W24) | Wagner, Richard | [Q190891](https://www.wikidata.org/wiki/Q190891) | zentrierte Fünfeckszahl; Zahlentyp | [Q465540](https://www.wikidata.org/wiki/Q465540) | Die Meistersinger von Nürnberg | Richard Wagner | dramatisch-musikalisches Werk (Oper), UA 1868-06-21 | gesichert |
| Julius Cäsar (Quell-ID W47) | Händel, Georg Friedrich | [Q729645](https://www.wikidata.org/wiki/Q729645) | Clarity, Album von Jimmy Eat World; Album (Alternative Rock) | [Q875563](https://www.wikidata.org/wiki/Q875563) | Giulio Cesare | George Frideric Handel | dramatisch-musikalisches Werk (Opera seria, Oper), UA 1724-02-20 | gesichert |
| Orfeo ed Euridice (Quell-ID W65) | Gluck, Christoph Willibald | [Q309823](https://www.wikidata.org/wiki/Q309823) | Offene Wissenschaft; soziale Bewegung | [Q723776](https://www.wikidata.org/wiki/Q723776) | Orfeo ed Euridice | Christoph Willibald von Gluck | dramatisch-musikalisches Werk (Oper), UA 1762-10-05 | gesichert |
| Stabat mater (Quell-ID W80) | (kein Komponist geführt) | [Q210080](https://www.wikidata.org/wiki/Q210080) | Stabat mater, mittelalterliche Sequenz des Jacopone da Todi; literarisches Werk / Sequenz | kein tragfähiger Kandidat | (entfällt) | (entfällt) | (entfällt) | offen |
| Nachtstück | Schubert, Franz | [Q33056195](https://www.wikidata.org/wiki/Q33056195) | Nachtstück, Gedicht von Friederike Brun; literarisches Werk | kein tragfähiger Kandidat | (entfällt) | (entfällt) | (entfällt) | offen |
| Die junge Magd | Hindemith, Paul | [Q19183563](https://www.wikidata.org/wiki/Q19183563) | Die junge Magd, Gedicht von Georg Trakl (1913); literarisches Werk | kein tragfähiger Kandidat | (entfällt) | (entfällt) | (entfällt) | offen |
| Lied der Mignon | Beethoven, Ludwig von | [Q110953165](https://www.wikidata.org/wiki/Q110953165) | Wilhelm Meisters Lehrjahre. Heiss mich nicht reden, Gedicht von Goethe; literarisches Werk (Lyrik) | kein tragfähiger Kandidat | (entfällt) | (entfällt) | (entfällt) | offen |
| Regentropfen | (kein Komponist, Anmerkung: Ukrainisches Lied) | [Q60992362](https://www.wikidata.org/wiki/Q60992362) | Regentropfen, Lied von Emil Palm und Willi Ostermann (1935); musikalisches Werk | kein tragfähiger Kandidat | (entfällt) | (entfällt) | (entfällt) | offen |

Zu den fünf Zeilen ohne Ersatz. Für Schuberts „Nachtstück" D 672 und für Hindemiths „Die junge Magd" op. 23b führt Wikidata keine Entität; auffindbar ist jeweils nur die Textvorlage, und im Fall des Nachtstücks stammt die gefundene Vorlage zudem von einer anderen Dichterin als der von Schubert vertonte Mayrhofer-Text. Für „Stabat mater" ohne Komponistenangabe fehlt das entscheidende Unterscheidungsmerkmal zwischen den mindestens vier vorhandenen Vertonungen. Zu „Lied der Mignon" und „Regentropfen" siehe den Abschnitt zu den fachlichen Entscheidungen.

Die drei Zeilen mit Quell-ID betreffen Identifikatoren, die im Werkindex selbst eingetragen sind. `reconcile.py` überspringt Zeilen mit vorhandener `wikidata_id`, deshalb hat sie nie eine Prüfung berührt. `Q190891` ist die zentrierte Fünfeckszahl, `Q729645` ein Album der Band Jimmy Eat World, `Q309823` das Konzept Open Science. Diese drei Werte gehören in das Register in `knowledge/data-errors.md` und zurück ans Erschließungsteam. Der vierte Quell-Identifikator, `Q723407` für Salome, ist geprüft und korrekt.

## Bewusst offen gelassene Fälle

36 der 86 Zeilen ohne Identifikator bleiben ohne Vorschlag. Die Gründe fallen in fünf Gruppen.

### Einzellieder ohne eigene Entität, Elternwerk vorhanden

Dreizehn Titel des Werkindex sind Einzelnummern aus Hugo Wolfs Spanischem Liederbuch, ausgewiesen in der Anmerkungsspalte als „Geistliche Lieder" oder „Weltliche Lieder, Spanisches Liederbuch". Eine Abfrage aller Werke mit `P86` Hugo Wolf ergibt 31 Entitäten; darunter ist keine einzige Nummer des Zyklus. In Wikidata existiert allein die Sammlung `Q19896118`, die bereits korrekt zugeordnet ist. Betroffen sind „Ach, des Knaben Augen", „Alle gingen, Herz, zur Ruh", „Auf dem grünen Balkon mein Mädchen schaut", „Bedeckt mich mit Blumen", „Die ihr schwebet um diese Palmen", „Führ mich, Kind, nach Bethlehem", „Geh', Geliebter, geh' jetzt", „Herr, was trägt der Boden hier", „In dem Schatten meiner Locken", „Mühvoll komm' ich und beladen", „Nun wandre, Maria", „Sagt, seid Ihr es, feiner Herr" und „Wenn du zu den Blumen gehst".

Ein Sonderfall darunter ist „In dem Schatten meiner Locken". Für diesen Text existiert `Q54989475`, ausgewiesen als Arie aus Wolfs Oper Der Corregidor und über `P361` an `Q907976` gehängt. Der Werkindex verortet den Titel im Spanischen Liederbuch. Beide Zuordnungen sind vertretbar, weil Wolf die Vertonung in der Oper wiederverwendet hat.

### Einzellieder ohne Entität und ohne verwendbares Elternwerk

Für acht weitere Liedtitel liefert weder die Komponisten-Abfrage noch die Labelsuche eine Entität. Es sind „Der Gang zum Liebchen" und „Es träumte mir" (Brahms), „Er liebt mich nicht" (Schubert), „Ein kleines Haus" und „Stets barg, die Liebe sie" (Haydn), „Glücks genug" und „Mein Herz ist stumm" (Richard Strauss) sowie „Ich liebe dich" (Beethoven). Die Liedebene ist in Wikidata für diese Komponisten nur punktuell erschlossen, und ein Elternopus ist im Werkindex nicht ausgewiesen.

### Werke ohne Wikidata-Entität

Sieben Werke haben in Wikidata keine Entsprechung. Für Wolodymyr Barwinsky (`Q4078084`) ist kein einziges Werk erfasst, weshalb „O ihr Felder" und „Traurigkeit" offen bleiben. Für Cherubino Busatti (`Q1070430`) gilt dasselbe, „Pupilette" bleibt offen. Franz Schmidt (`Q434601`) führt neun Werke, darunter kein Klavierquintett, weshalb „Quintett für Klavier und Schteichquartett, G-Dur" offen bleibt. Hindemiths Kantate „Apparebit repentina dies" existiert nicht als Entität; auffindbar ist allein der lateinische Hymnentext `Q113213513`, also erneut die Vorlage. Ebenso ohne Entität sind „Gesang an die Hoffnung" (Hindemith) und die beiden Lauretanischen Litaneien Mozarts KV 109 und KV 195.

### Zeilen ohne geführten Komponisten

Vier Zeilen führen keinen Komponisten und lassen sich ohne ihn nicht entscheiden. „Oh, ihr Felder" und „Wenn ich in die Weite der Steppe schaue" tragen die Anmerkung „Ukrainisches Lied", „Wenn ich die Weite" nennt Wolodymyr Woloszyn, zu dem sich keine Komponistenentität finden lässt. Die Zeile „Litaniae lauretanae KV 195" mit dem Komponistenwert „Requiem" ist ein Spaltenversatz in der Quelle und dublettiert die vorangehende Zeile.

### Mehrere gleichrangige Kandidaten

Für Honeggers Judith führt Wikidata zwei Entitäten mit `P86` Arthur Honegger, `Q31891898` (`P31` musikalisches Werk, Sitelink zur schwedischen Wikipedia „Judith (opera)") und `Q59136891` (`P31` dramatisch-musikalisches Werk, `P7937` Oper, `P407` Französisch, Sitelink zur katalanischen Wikipedia). Beide bezeichnen dasselbe Werk und sind in Wikidata eine unaufgelöste Dublette. Die Wahl zwischen ihnen ist eine Entscheidung über die Dublette; sinnvoll wäre ein Merge-Antrag in Wikidata, bis dahin die reicher typisierte `Q59136891`.

## Warum die automatische Zuordnung versagt hat

Der Grund steht in `scripts/reconcile.py` und ist an vier Stellen fassbar.

Der Typfilter `Q_MUSICAL_WORK` enthält `Q105543609` (musikalisches Werk), `Q7725634` (literarisches Werk), `Q1344`, `Q7366`, `Q9730`, `Q482994` (Album) und `Q188451` (Musikgattung). Er enthält `Q58483083` nicht, und das ist der `P31`-Wert, den in Wikidata praktisch jede Oper trägt. Der Filter weist die richtige Opernentität systematisch ab und lässt zugleich ihre literarische Vorlage, ihre Tonaufnahme und ihren Gattungsbegriff durch. Das erklärt beide Fehlerfamilien in einem Zug und erklärt zusätzlich, warum unter den 34 automatischen Werktreffern keine einzige Oper ist. Wozzeck ist als `manual` eingetragen, Salome stammt aus der Quelle.

Die im Docstring angekündigte „P86-Validierung" ist nicht implementiert. `reconcile_work` vergleicht `P86` nie mit dem im Werkindex geführten Komponisten. Vorhandenes `P86` erhöht lediglich den Score um fünf Punkte, und bei einem exakten Labeltreffer kehrt die Funktion sofort zurück, ohne die Claims überhaupt abzurufen. Carmen, La Gioconda, Lohengrin, Nachtstück, Die Jahreszeiten, Regentropfen, Don Giovanni, Pulcinella und Un ballo in maschera sind genau so entstanden, über einen exakten Labeltreffer auf ein gleichnamiges Objekt beliebiger Herkunft.

Verglichen wird ausschließlich `label` aus der Suchantwort, nie ein Alias. Deshalb scheitern alle Titel in einer anderen Ansetzung als der deutschen Wikidata-Label-Sprache, etwa „Chovanščina" gegen „Chowanschtschina", „Evgenij Onegin" gegen „Eugen Onegin", „Pikovaja dama" gegen „Pique Dame", „Kát'a Kabanová" gegen „Katja Kabanowa", „Svadebka" gegen „Les Noces" und „Székely fonó" gegen „Spinnstube". Ebenso scheitern die RAK-nahen Einheitstitel des Konzertrepertoires, „Messen, KV 317", „Messen, WAB 28 (f-Moll)", „Rhapsodien, Alt, Männerchor, Orchester, op. 53" oder „Elias, op. 70, MWV A 25". In allen genannten Fällen trägt die richtige Entität den Quelltitel als Alias oder als `P1476`.

Der vierte Punkt betrifft die Quelle. Trägt eine Werkindex-Zeile bereits eine `wikidata_id`, überspringt `reconcile.py` sie vollständig. Die drei falschen Quell-Identifikatoren sind deshalb ungeprüft in den Datensatz gelangt. `scripts/verify-manual-approvals.py` prüft nur Einträge mit `match: "manual"` und greift hier nicht.

## Fälle für eine fachliche Entscheidung

Sechs Punkte lassen sich mit Wikidata-Evidenz allein nicht schließen.

1. **Einzellieder gegen Elternwerk.** Ob die dreizehn Wolf-Nummern den Identifikator des Spanischen Liederbuchs `Q19896118` erhalten oder ohne Identifikator bleiben, ist eine Modellentscheidung über die Granularität von `m3gim:MusicalWork`. Ein Identifikator des Elternwerks an der Einzelnummer erzeugt im Datensatz mehrere Werke mit derselben Q-ID, was für „Stabat mater" bereits einmal passiert ist.
2. **Marienlieder und Rilke-Zyklus bei Hindemith.** Beide Titel stehen im Werkindex ohne weitere Angabe. Als einziger Kandidat für beide kommt `Q1169721` „Das Marienleben" in Frage, laut Wikidata ein Liederzyklus Hindemiths (`P86` Paul Hindemith, `P7937` Liederzyklus, `P921` `Q1446512` Marienleben als Bildthema). Die Zuordnung zu „Rilke-Zyklus" setzt voraus, dass die Textvorlage Rilkes gemeint ist, was Wikidata am Werkeintrag nicht ausweist. Gegen die Zuordnung zu „Marienlieder" spricht die Rollenangabe „Altsolo" im Werkindex, weil Das Marienleben für Sopran und Klavier geschrieben ist. Ob es sich um zwei Bezeichnungen desselben Werks handelt, entscheidet die Quelle, die Rezension zu Hindemith in Köln vom 1954-03-31.
3. **Hindemiths Requiem.** `Q3567675` „When Lilacs Last in the Dooryard Bloom'd" trägt als `P1476` den vollen Titel mit dem Untertitel „A Requiem for those we love" und als `P7937` den Wert Messe. Das Werk hat ein Altsolo, was zur Rollenangabe passt. Der Quelltitel lautet aber nur „Requiem", und Hindemith hat kein weiteres Werk dieses Namens. Die Zuordnung ist plausibel und braucht eine Bestätigung aus der Quelle.
4. **Schuberts Ave Maria.** Der Werkindex führt „Ave Maria / Schubert, Franz". In Wikidata stehen `Q1331995` „Ellens dritter Gesang" mit den Aliasen „Ave Maria" und „Ave Maria (Schubert)" sowie `Q113551455` „Ave Maria", eine über `P144` an `Q1331995` gehängte Fassung mit lateinischem Text. Welche der beiden gemeint ist, hängt davon ab, ob im Konzert der Storck-Text oder die lateinische Kontrafaktur gesungen wurde.
5. **Beethovens Lied der Mignon.** Der Werkindex führt den Titel unter Beethoven. In Wikidata gibt es keine Entität dieses Namens von Beethoven; als Vertonung eines Mignon-Textes ist `Q114436961` „Sehnsucht, WoO 134" („Nur wer die Sehnsucht kennt") erfasst, daneben käme das Lied „Mignon" op. 75 Nr. 1 in Frage, das in Wikidata fehlt. Auch die Komponistenangabe selbst ist zu prüfen, weil „Lied der Mignon" als Werktitel für Schuberts D 877 geläufig ist und Wikidata dafür drei Entitäten führt (`Q114245637`, `Q114245659`, `Q114245792`).
6. **Doppelte Werkindex-Zeilen.** W23 und W24 führen beide „Die Meistersinger von Nürnberg", W65 „Orfeo ed Euridice" und W66 „Orpheus und Eurydike" bezeichnen dasselbe Werk `Q723776`, und W66 trägt bereits die Anmerkung „Sprache des Werktitels noch unklar (Vereinheitlichung notwendig!)". Ebenso dublettieren sich die beiden W53-Zeilen „Le chant de la Terre" und „Lied von der Erde" auf `Q846646` sowie W78 und W99 mit der neunten Sinfonie unter zwei Komponisten-Schreibweisen. Die Zusammenführung ist eine Erschließungsentscheidung.

Ein siebter Punkt betrifft die Quelldaten. Die Zeile „Regentropfen" (W73) trägt die Anmerkung „Ukrainisches Lied" und keinen Komponisten; der bisher zugeordnete deutsche Schlager von 1935 ist ausgeschlossen. Ohne Angabe des ukrainischen Komponisten bleibt die Zeile unbestimmbar. Dasselbe gilt für „Wenn ich die Weite" mit dem Komponisten Woloszyn, zu dem keine Entität auffindbar ist.

## Nebenbefund, Werke des Bestands ohne Werkindex-Zeile

Beim Abgleich mit `data/output/m3gim.jsonld` fallen vier Werke auf, die in den Objekten mehrfach vorkommen und im Werkindex keine Zeile haben. Sie erreichen die Reconciliation deshalb gar nicht.

| Werk im Bestand | Vorkommen | belegte Entität | Wikidata-Label | Komponist laut Wikidata |
|---|---|---|---|---|
| Das Rheingold | Verträge Bayreuth 1952 und 1953, Neapel, RAI-Aufnahme | [Q327717](https://www.wikidata.org/wiki/Q327717) | Das Rheingold | Richard Wagner |
| Siegfried | Bayreuth 1953, Richard-Wagner-Verband | [Q333146](https://www.wikidata.org/wiki/Q333146) | Siegfried | Richard Wagner |
| Der Ring des Nibelungen | Bayreuth 1951 bis 1953, Presse | [Q190237](https://www.wikidata.org/wiki/Q190237) | Der Ring des Nibelungen | Richard Wagner |
| Fidelio | Orchesterkonzert Graz | [Q193778](https://www.wikidata.org/wiki/Q193778) | Fidelio | Ludwig van Beethoven |

Für Rheingold und Siegfried ist das inhaltlich auffällig, weil beide zu den Bayreuther Verpflichtungen Malaniuks gehören und im Bestand mit Verträgen belegt sind.
