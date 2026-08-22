---
title: Identifikator-Vorschläge Personen
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: draft
created: 2026-08-22
updated: 2026-08-22
language: de
version: 0.1
authors: [Christopher Pollin]
generated-with: Claude Code
related: [data-errors, data, pipeline-architecture]
---

# Identifikator-Vorschläge Personen

> Rechercheergebnis zu den Personen ohne Wikidata-Identifikator aus `data/output/wikidata-reconciliation.json` (Liste `unmatched`) und zu den dokumentierten Fehlzuordnungen aus [data-errors.md](../../knowledge/data-errors.md) unter AF-02. Vorschlagsdokument zur Freigabe, keine Datenänderung. Die Übernahme in die Indizes und der Pflichtlauf von `scripts/verify-manual-approvals.py` liegen beim Operator.

## Verfahren und Belegregel

Jeder hier genannte Identifikator ist gegen die Live-Entität geprüft. Der Abruf lief über `https://www.wikidata.org/wiki/Special:EntityData/<QID>.json` mit der User-Agent-Kennung `m3gim-research/1.0 (https://dhcraft.org/m3gim; office@dhcraft.org)`. Kandidaten wurden über `wbsearchentities` gesucht, der Beleg entstand ausschließlich aus dem anschließenden Abruf des Datensatzes selbst. Geprüft und festgehalten wurden je Vorschlag drei Merkmale.

1. Trägt ein Label oder ein Alias den Quellnamen, die Ansetzung `Nachname, Vorname` als Inversion gelesen und Diakritika normalisiert.
2. Deckt ein Beruf (P106), ein Stimmfach (P412) oder die Beschreibung die Rolle, die die Person im Bestand trägt.
3. Sind Geburts- und Sterbedatum (P569, P570) mit dem Wirkungszeitraum des Records vereinbar, wobei eine vor 1900 verstorbene Person nur als Komponist, Librettist oder Werkvorlage in Frage kommt.

Der Bestandskontext stammt aus `data/output/m3gim.jsonld`, ausgewertet wurden Rolle, redaktionelle Anmerkung, Datum und Ort des jeweiligen Records.

## Konfidenzstufen

**Gesichert.** Alle drei Prüfungen bestehen. Eine orthografische Abweichung des Quellnamens zählt hier nur dann als unschädlich, wenn Beruf, Lebensdaten und Bestandskontext zusammen die Identität zweifelsfrei tragen; die Abweichung ist in der Anmerkungsspalte benannt.

**Wahrscheinlich.** Eine Prüfung bleibt unscharf, etwa weil der Wikidata-Datensatz keine Beschreibung führt, weil der Quellname einen abweichenden Vornamen oder nur Initialen trägt, oder weil die Bestandsrolle keinen Berufsabgleich erlaubt.

**Offen.** Mehrere gleichrangige Kandidaten, kein tragfähiger Kandidat, oder ein Quellname ohne Vornamen. Diese Fälle stehen in der dritten Liste und bekommen keinen Identifikator.

Insgesamt entstanden 63 Vorschläge zu den 117 Personen der `unmatched`-Liste, davon 54 gesichert und 9 wahrscheinlich. 54 Fälle bleiben offen.

## Tabelle 1, fehlende Identifikatoren

### Gesichert

| Quellname | QID | Wikidata-Label | Beschreibung | Lebensdaten | Kontext im Bestand | Anmerkung |
|---|---|---|---|---|---|---|
| Alighieri, Dante | Q1067 | Dante Alighieri | florentinischer Dichter und Philosoph | 1265–1321 | erwähnt, Ruppel-Rezension zu Orpheus und Eurydike, 1963 | |
| Appia, Adolphe | Q124077 | Adolphe Appia | Schweizer Architekt, P106 führt Bühnenbildner | 1862-09-01–1928-02-29 | erwähnt, Tristan-Rezensionen Brüssel und Bayreuth, 1954 | Theaterreformer, Bezug zur Bayreuther Inszenierungsdebatte |
| Arnold, Heinz | Q18019730 | Heinz Arnold | deutscher Operndirektor und -spielleiter | 1906-06-19–1994-07-24 | regisseur, Macbeth an der Bayerischen Staatsoper, München 1952 | ab 1950 Oberspielleiter der Bayerischen Staatsoper |
| Bach, Johann Sebastian | Q1339 | Johann Sebastian Bach | deutscher Komponist des Barocks | 1685-03-21–1750-07-28 | komponist, Konzertrepertoire-Liste | |
| Barber, Samuel | Q216870 | Samuel Barber | amerikanischer Komponist | 1910-03-09–1981-01-23 | komponist, NCAC Newsletter, Salzburg 1958 | |
| Barlach, Ernst | Q156890 | Ernst Barlach | deutscher Bildhauer, Schriftsteller und Zeichner | 1870-01-02–1938-10-24 | erwähnt, Ruppel-Rezension zu Orpheus und Eurydike, 1963 | |
| Bartók, Béla | Q83326 | Béla Bartók | ungarischer Komponist und Pianist | 1881-03-25–1945-09-26 | komponist, Opern- und Konzertrepertoire-Listen | |
| Beethoven, Ludwig van | Q255 | Ludwig van Beethoven | deutscher Komponist | 1770–1827 | komponist, IX. Symphonie Bayreuth 1953 u. a. | Quellvariante `Beethoven, Ludwig von` bleibt Quellfehler QF-03 |
| Bizet, Georges | Q56158 | Georges Bizet | französischer Komponist | 1838-10-25–1875-06-03 | komponist, Opernrepertoire-Liste | |
| Brahms, Johannes | Q7294 | Johannes Brahms | deutscher Komponist, Pianist und Dirigent | 1833-05-07–1897-04-03 | komponist, Liederabend Palais Pallavicini 1963 | |
| Braun, Hans | Q1578818 | Hans Braun | österreichischer Opernsänger, Bariton | 1917-05-14–1992-05-02 | sänger, Bayreuther Festspiele 1953 | Wiener Staatsoper, Gastspiele in Bayreuth belegt |
| Bruckner, Anton | Q81752 | Anton Bruckner | österreichischer Komponist | 1824-09-04–1896-10-11 | komponist, Konzertrepertoire-Liste | |
| Čajkovskij, Pëtr Ilʹič | Q7315 | Pjotr Iljitsch Tschaikowski | russischer Komponist | 1840-04-25–1893-10-25 | komponist, Opern- und Konzertrepertoire-Listen | Alias trägt die ISO-Transliteration |
| Caridis, Militades | Q638521 | Miltiades Caridis | deutsch-griechischer Dirigent und Komponist | 1923-05-09–1998-03-01 | dirigent, Orchesterkonzert Graz | Quellname mit Buchstabendreher Militades statt Miltiades |
| Cesare, curzi | Q1056774 | Cesare Curzi | amerikanischer Opernsänger, Tenor | 1926-10-14–2023-02-10 | sänger, Capriccio-Rezension München | Quelle vertauscht Vor- und Nachname und schreibt klein |
| Dermotas, Anton | Q588808 | Anton Dermota | jugoslawischer Tenor | 1910-01-04–1989-06-22 | sänger, Tannhäuser-Rezension 1956 | Dublette zu `Dermota, Anton`, Quellname mit angehängtem Genitiv-s |
| Dönch, Carl | Q1730779 | Karl Dönch | deutsch-österreichischer Sänger, Bassbariton | 1915-01-08–1994-09-16 | sänger, Der Wildschütz, Wien 1968 | Quellname mit C statt K |
| Dvořák, Antonín | Q7298 | Antonín Dvořák | tschechischer Komponist | 1841-09-08–1904-05-01 | komponist, Konzertrepertoire-Liste | |
| Felberma-Yers, Anny | Q18216386 | Anny Felbermayer | österreichische Lieder-, Oratorien- und Opernsängerin, Sopran | 1924-07-21–2014-09-05 | sänger, Tannhäuser-Rezension 1956 | Quellname mit Trennzeichen und Genitiv-s |
| Gostič, Josip | Q6279811 | Josef Gostic | slowenischer Opernsänger, Tenor | 1900-03-05–1963-12-25 | kein Datensatzbezug, nur Personenindex | Alias trägt `Josip Gostič` |
| Grillparzer, Franz | Q154438 | Franz Grillparzer | österreichischer Dramatiker | 1791–1872 | kein Datensatzbezug, nur Personenindex | |
| Händel, Georg Friedrich | Q7302 | Georg Friedrich Händel | deutsch-britischer Komponist des Barocks | 1685–1759-04-14 | komponist, Konzertrepertoire-Liste | |
| Hasse, Johann Asolph | Q164732 | Johann Adolph Hasse | deutscher Komponist des Barocks | 1699-03-15–1783-12-16 | erwähnt als Komponist, Titus-Rezensionen Stuttgart und München | Quellname mit Tippfehler Asolph statt Adolph |
| Hindemith, Paul | Q57244 | Paul Hindemith | deutscher Komponist der Moderne | 1895-11-16–1963-12-28 | dirigent und komponist, IX. Symphonie Bayreuth 1953, Köln 1954 | |
| Honegger, Arthur | Q123164 | Arthur Honegger | französisch-schweizerischer Komponist | 1892-03-10–1955-11-27 | komponist, Opernrepertoire-Liste | drei weitere Namensträger sind Journalisten und Politiker, Beruf trennt eindeutig |
| Honolka, Kurt Dr. | Q1447751 | Kurt Honolka | deutscher Musik- und Kulturkritiker | 1913-09-27–1988-10-07 | verfasser, Kritiker, Titus-Rezension Stuttgart 1954 | Quellname mit nachgestelltem Titel |
| Janáček, Leoš | Q184933 | Leoš Janáček | tschechischer Komponist | 1854-07-03–1928-08-12 | komponist, Opernrepertoire-Liste | |
| Jommelli, Niccolò | Q312891 | Niccolò Jommelli | italienischer Komponist der Vorklassik | 1714-09-10–1774-08-25 | erwähnt als Komponist, Titus-Rezensionen | |
| Klemperer, Otto | Q155136 | Otto Klemperer | deutscher Dirigent und Komponist | 1885-05-14–1973-07-06 | dirigent, Le Chant de la Terre, Straßburg 1954 | gleichnamiger Physiker Q7109681 über Beruf ausgeschlossen |
| Kmett, Waldemar | Q88847 | Waldemar Kmentt | österreichischer Tenor | 1929-02-02–2015-01-21 | sänger, Mozart-Requiem 1959 | Quellname verkürzt Kmentt zu Kmett |
| Kodály, Zoltán | Q153008 | Zoltán Kodály | ungarischer Komponist | 1882-12-16–1967-03-06 | komponist, Opernrepertoire-Liste | |
| Linné, Carl von | Q1043 | Carl von Linné | schwedischer Naturwissenschaftler | 1707-05-23–1778-01-10 | erwähnt, Tannhäuser-Rezension 1956 | Entität eindeutig, der Bezug zum Record bleibt sachlich zu klären |
| Lortzing, Albert | Q154203 | Albert Lortzing | deutscher Komponist, Schauspieler und Sänger | 1801–1851 | komponist, Der Wildschütz, Wien 1968 | |
| Mahler, Gustav | Q7304 | Gustav Mahler | österreichischer Komponist und Dirigent | 1860-07-07–1911-05-18 | komponist, Lied von der Erde, Wuppertal und Straßburg | |
| Maykut, Erich | Q59531271 | Erich Majkut | österreichischer Opern- und Konzertsänger | 1907-02-03–1976 | sänger, Tristan in Neapel 1954 | Quellname mit y statt j |
| Metastasio, Pietro | Q29473 | Pietro Metastasio | italienischer Librettist und Textdichter | 1698–1782 | librettist, Titus-Rezension Stuttgart 1954 | |
| Mitropoulos, Dimitri | Q319741 | Dimitri Mitropoulos | griechischer Dirigent | 1896-03-01–1960-11-02 | dirigent, NCAC Newsletter, Salzburg 1958 | |
| Mozart, Wolfgang Amadeus | Q254 | Wolfgang Amadeus Mozart | Musiker und Komponist der Wiener Klassik | 1756-01-27–1791-12-05 | komponist, mehrere Records 1953 bis 1963 | |
| Offenbach, Jacques | Q41555 | Jacques Offenbach | deutsch-französischer Komponist und Cellist | 1819-06-20–1880-10-04 | komponist, Orpheus-Rezension 1963 | |
| Orff, Carl | Q44086 | Carl Orff | deutscher Komponist und Musikpädagoge | 1895-07-10–1982-03-29 | erwähnt als Komponist, Bayreuther Tagblatt 1952 | |
| Otto van Rohr | Q2041291 | Otto von Rohr | deutscher Opernsänger, Bass | 1914-02-24–1982-07-15 | sänger, Tristan in Neapel 1954 | Quellname mit van statt von, Namensfolge nicht invertiert |
| Pirchan, Emil | Q1336659 | Emil Pirchan | österreichischer Bühnenbildner, Architekt und Autor | 1884-05-27–1957-12-20 | erwähnt, Maskenkunst, Sommerkurs 1944 | der gleichnamige Vater Q21993472 starb 1928 und scheidet aus |
| Prihoda, Vasa | Q679555 | Váša Příhoda | tschechischer Violinist | 1900-08-22–1960-07-26 | erwähnt, Violine, Sommerkurs 1944 | Alias trägt die diakritikafreie Form |
| Raimund, Ferdinand | Q45025 | Ferdinand Raimund | österreichischer Dramatiker | 1790-06-01–1836-09-05 | erwähnt als Theaterautor, Wildschütz-Rezension 1968 | |
| Rodzinski, Artur | Q554610 | Artur Rodziński | polnischer Dirigent | 1892-01-01–1958-11-27 | dirigent, Tristan in Neapel 1954 | Alias trägt die diakritikafreie Form |
| Rogatschewsky, Joseph | Q3185573 | Joseph Rogatchewsky | Opernsänger, Tenor | 1891-11-20–1985-03-31 | erwähnt, Brüsseler Tristan-Rezension und Empfang, 1954 | Direktor des Théâtre de la Monnaie zur Zeit des Records, Transliterationsvariante |
| Rossini, Gioachino | Q9726 | Gioachino Rossini | italienischer Komponist | 1792-02-29–1868-11-13 | komponist, Konzertrepertoire-Liste | |
| Schubert, Franz | Q7312 | Franz Schubert | österreichischer Komponist | 1797-01-31–1828-11-19 | komponist, Liederabend Wien 1963, Messe Es-Dur 1959 | acht weitere Namensträger, Beruf und Repertoirekontext trennen eindeutig |
| Schumann, Robert | Q7351 | Robert Schumann | Komponist, Musikkritiker und Dirigent | 1810-06-08–1856-07-29 | komponist, Konzertrepertoire-Liste | |
| Stravinsky, Igor | Q7314 | Igor Strawinsky | russisch-französisch-US-amerikanischer Komponist | 1882–1971 | komponist, Les Noces München | |
| Traetta, Tommaso | Q266084 | Tommaso Traetta | italienischer Komponist | 1727-03-30–1779-04-06 | erwähnt als Komponist, Schmidt-Garre-Rezension München 1953 | |
| Uhde, Hermann | Q68473 | Hermann Uhde | deutscher Heldenbariton | 1914-07-20–1965-10-10 | sänger, Bayreuther Besetzungen 1951 bis 1953 | redaktionelle Anmerkung „Sängerin“ ist ein Quellfehler |
| Verdi, Giuseppe | Q7317 | Giuseppe Verdi | italienischer Komponist der Romantik | 1813-10-09–1901-01-27 | komponist, Macbeth an der Bayerischen Staatsoper 1952 | |
| Walter, Bruno | Q156910 | Bruno Walter | deutsch-österreichischer Dirigent und Pianist | 1876-09-15–1962-02-17 | dirigent, Le Chant de la Terre Straßburg 1954 | |

### Wahrscheinlich

| Quellname | QID | Wikidata-Label | Beschreibung | Lebensdaten | Kontext im Bestand | offener Punkt |
|---|---|---|---|---|---|---|
| Bergfeld, Dr. Johann | Q95219360 | Joachim Bergfeld | ohne Beschreibung, P106 Musikwissenschaftler | 1906–1988 | kein Datensatzbezug im Index, die Records nennen „Dr. Joachim Bergfeld (Fränkische Presse)“ als Verfasser | Quelle führt den Vornamen Johann, Wikidata Joachim; Vornamensklärung durch die Erschließung nötig |
| Guthrie, Frederick | Q94939724 | Frederick Guthrie | ohne Beschreibung, P106 Sänger und Musiker, enwiki-Artikel „Frederick Guthrie (bass)“ | 1923-03-31–2008-12-06 | sänger, Aida an der Wiener Staatsoper 1956 | Wikidata-Datensatz ist dünn, die redaktionelle Anmerkung „Dirigent“ widerspricht der Rolle sänger |
| Hurshells, Edmund | Q95305216 | Edmund Hurshell | ohne Beschreibung, P106 Sänger und Musiker | 1920–1993-02-26 | sänger, Tannhäuser-Rezension 1956 | Quellname mit angehängtem Genitiv-s, kein Stimmfach in Wikidata |
| Königin Elisabeth | Q235186 | Elisabeth Gabriele in Bayern | Königin der Belgier 1909 bis 1934, Königin von Belgien 1934 bis 1965 | 1876-07-25–1965 | erwähnt, Brüsseler Tristan-Rezension und Empfang, 1954 | Quellname trägt nur Titel und Vornamen, die Zuordnung stützt sich auf den Brüsseler Kontext |
| Lustigs, Rudolf | Q61477245 | Rudolf Lustig | darstellender Künstler, Sänger, Tenor, Wien | 1906–1988 | sänger, Tannhäuser-Rezension 1956 | Quellname mit angehängtem Genitiv-s, zahlreiche Namensgleiche ohne Berufsangabe |
| Michalis, Ruth | Q1669194 | Ruth Michaelis | deutsche Altistin | 1909-02-27–1989-12-01 | sänger, Anmerkung „Sängerin (alt)“, Macbeth München 1952 | Quellname schreibt Michalis statt Michaelis |
| Ruppert, K. H. | Q57059 | Karl Heinz Ruppel | deutscher Literatur- und Theaterkritiker | 1900-09-05–1980-09-08 | kein Datensatzbezug im Index, die Records nennen „K.H. Ruppel“ als Verfasser in der Süddeutschen Zeitung | Quellname schreibt Ruppert statt Ruppel und führt nur Initialen |
| Scheenerger, Hansheinz | Q3127066 | Hansheinz Schneeberger | Schweizer Geiger, Konzertmeister | 1926-10-16–2019-10-23 | interpret, Anmerkung „Violist“, Hindemith-Konzert Köln 1954 | Nachname stark korrumpiert, Wikidata führt Geiger gegen die Anmerkung Violist |
| Schumann, Karl | Q94900869 | Karl Schumann | ohne Beschreibung, P106 Musikkritiker und Theaterkritiker, geboren in München | 1925–2007 | verfasser, Kritiker, Macbeth und Orpheus, München 1952 | 1952 wäre er 27 Jahre alt, Wikidata-Datensatz ohne Sitelink und ohne Beschreibung |

## Tabelle 2, Korrekturen der Fehlzuordnungen

### Die sechs unter AF-02 genannten Fälle

| Quellname | alte QID | alte Entität | neue QID | neue Entität | Begründung |
|---|---|---|---|---|---|
| Dermota, Anton | Q12784779 | slowenischer Jurist, Politiker und Übersetzer, 1876-01-01–1914-05-03 | Q588808 | Anton Dermota, jugoslawischer Tenor, P412 Tenor, 1910-01-04–1989-06-22 | die alte Entität starb 1914 und kann 1953 in Bayreuth nicht gesungen haben; die neue trägt Opernsänger und Tenor und passt zur Anmerkung „Sänger (Tenor)“ |
| Böhme, Kurt | Q10314824 | deutscher Marineoffizier und U-Boot-Kommandant, 1917-01-21–1984-07-16 | Q658343 | Kurt Böhme, deutscher Bassist, P412 Bassbariton, 1908-05-05–1989-12-20 | Beruf Ubootfahrer widerspricht der Rolle sänger in Bayreuth 1952 und München 1954; die neue Entität ist der Dresdner Bassist |
| Holm, Richard | Q19273665 | Richard William Holm, Botaniker, 1925–1987 | Q96387 | Richard Holm, deutscher Opernsänger, P412 Tenor, 1912-08-03–1988-07-20, Sterbeort München | Beruf Botaniker widerspricht der Rolle sänger; der Tenor Holm war Ensemblemitglied in München, wo beide Records verortet sind |
| Wächter, Eberhard | Q481471 | Eberhard von Wächter, deutscher Maler, 1762-02-28–1852-08-14 | Q78976 | Eberhard Waechter, österreichischer Sänger und Operndirektor, P412 Bariton, 1929-07-08–1992-03-29 | die alte Entität starb 1852; die neue trägt die Aliase `Eberhard Wächter` und `Eberhard Waechter` und passt zur Tannhäuser-Rezension 1956 |
| Wiener, Otto | Q86610 | deutscher Physiker, 1862-06-15–1927-01-18 | Q89123 | Otto Wiener, österreichischer Opernsänger, P412 Bariton, 1911-02-13–2000-08-05 | Beruf Physiker widerspricht der Rolle sänger; die neue Entität ist der Wiener Bariton |
| Richter, Gerd | Q116526092 | deutscher Tischtennisspieler und Softwareentwickler, geboren 1974-12-29 | offen, zwei Kandidaten | Q94907900 Gerd Richter, deutscher Bühnenbildner, Szenenbildner und Kostümbildner, geboren 1903 in Dresden, gestorben 1979 in Stuttgart, GND 116511478, dewiki-Artikel; Q19594934 Gerd Richter, German scenographer, Szenograf, 1903–1965, ohne Sitelink, ULAN 500076752 | die alte Entität wurde 1974 geboren und scheidet für Records von 1954 und 1956 aus; beide Kandidaten sind Bühnenbildner des Jahrgangs 1903, für Q94907900 spricht der Sterbeort Stuttgart in Verbindung mit dem Stuttgarter Titus-Record, entschieden ist die Wahl damit nicht |

### Weitere Fehlzuordnungen derselben Klasse

Ein systematischer Abgleich aller 200 gematchten Personen gegen Beruf und Lebensdaten hat weitere Fälle derselben Fehlerklasse gefunden, die AF-02 nicht führt. Sie stehen hier getrennt, weil der Auftrag sie nicht nennt, die Korrekturlogik aber dieselbe ist.

| Quellname | alte QID | alte Entität | neue QID | neue Entität | Begründung |
|---|---|---|---|---|---|
| Hartmann, Rudolf | Q124351 | niederdeutscher Schriftsteller und kommunistischer Politiker, 1885-12-11–1945-03-05, gestorben im KZ Mauthausen | Q2172861 | Rudolf Hartmann, deutscher Opernregisseur und Intendant, 1900-10-11–1988-08-26 | die alte Entität starb 1945 und war Politiker; die Rolle regisseur an der Bayerischen Staatsoper 1952 trifft den Intendanten Hartmann |
| Weber, Ludwig | Q136748514 | verfolgter Sozialdemokrat, geboren 1886-11-03, ohne Berufsangabe | Q79010 | Ludwig Weber, österreichischer Opernsänger, P412 Bass, 1899-07-29–1974-12-09 | die alte Entität führt keinen Beruf; der Bass Weber ist die Bayreuther Besetzung der Records von 1951 bis 1956 mit neunzehn Rollenbelegen |
| Preys, Hermann | Q1612378 | Hermann Preysing, deutscher Hals-Nasen-Ohren-Arzt, 1866-06-28–1926-10-30 | Q61080 | Hermann Prey, deutscher Bariton, P412 Bariton, 1929-07-11–1998-07-22 | die alte Entität starb 1926 und ist ein Mediziner mit abweichendem Namen; der Quellname trägt ein überzähliges s |
| Klein, Peter | Q102360758 | deutscher Informatiker, geboren 1966 | Q87612 | Peter Klein, deutsch-österreichischer Tenor und Musikpädagoge, 1907-01-25–1992-10-03 | die alte Entität wurde 1966 geboren; der Wiener Charaktertenor passt zu fünf Sängerbelegen im Wildschütz 1968 |
| Schmidt, Franz | Q95295060 | deutscher Bibliothekar, Philosoph und Literaturwissenschaftler, 1895–1972 | Q434601 | Franz Schmidt, österreichischer Komponist, 1874-12-22–1939-02-11 | die Rolle ist komponist in einer Konzertrepertoire-Liste, die alte Entität ist Bibliothekar |
| Lohmann, Paul | Q2061025 | deutscher Politiker (SPD), 1902-10-20–1953-10-27 | Q5962517 | Paul Lohmann, deutscher Konzert- und Oratoriensänger und Gesangslehrer, 1894–1981 | die redaktionelle Anmerkung lautet „Gesang“ im Programmheft des Sommerkurses 1944, der Politiker scheidet fachlich aus |

### Fehlzuordnungen ohne auffindbaren Ersatz

Für diese Personen führt Wikidata keine passende Entität. Die vorhandene Q-ID ist nachweislich falsch und gehört gestrichen, damit der Datensatz keine falsche Normdatenaussage trägt.

| Quellname | falsche QID | falsche Entität | Bestandsrolle | Widerspruch |
|---|---|---|---|---|
| Campese | Q5028328 | australischer Rugby-Union-Spieler, geboren 1984 | erwähnt, Anmerkung „Maestro“, Neapel 1954 | Geburtsjahr dreißig Jahre nach dem Record, Quellname ohne Vornamen |
| Wolf, Winfried | Q2584346 | deutscher Politiker (PDS), geboren 1949 | erwähnt, Anmerkung „Klavier“, Sommerkurs 1944 | Geburtsjahr nach dem Record |
| Witte, Wolfgang | Q2591797 | deutscher Mikrobiologe, geboren 1945-04-20 | sänger, Der Wildschütz Wien 1968 | Beruf und Alter unvereinbar mit fünf Sängerbelegen |
| Thiel, Fred | Q78170333 | American businessman, geboren 1960 | kostümbildner, Bayreuth und Brüssel 1954 | Geburtsjahr nach dem Record |
| Simon, Théo | Q20243266 | deutscher Geologe, 1947–2025 | technische leitung, Brüssel 1954 | Geburtsjahr nach dem Record |
| Leder, Alfred | Q27732662 | Ingenieur, Professur in Rostock ab 1994, geboren 1949-08-12 | chorleiter, München 1952 | Geburtsjahr nach dem Record |
| Eberhardt, Paul | Q94761352 | Theologe, Herausgeber, Schriftsteller, 1879–1923 | beleuchter, Bayreuth 1953 und Brüssel 1954 | Todesjahr dreißig Jahre vor dem Record |
| Ernest, Wilhelm | Q2572555 | Wilhelm Ernst, deutscher katholischer Moraltheologe, 1927-10-09–2001-08-01 | sänger, Tristan in Neapel 1954 | Beruf und abweichender Nachname |
| Tinel, Paul | Q110850252 | Schneider, französischer Staatsbürger, ohne Lebensdaten | verfasser, Journalist, Brüsseler Tristan-Rezension 1954 | Beruf Schneider, kein Datum zur Prüfung |
| Traute, Elisabeth | Q55676977 | Hausfrau, Ehefrau eines Magdeburger Stiftsjuristen, 1540–1607 | sänger, Tannhäuser-Rezension 1956 | Todesjahr 1607 |
| Weber | Q63875 | deutscher Arzt und Botaniker, 1752–1828 | komponist, Konzertrepertoire-Liste | Beruf Botaniker, Quellname ohne Vornamen; Carl Maria von Weber liegt als Lesart nahe, bleibt aber unbelegt |
| Leopold III. | Q349086 | Markgraf von Ostarrichi, 1073–1136 | erwähnt, Anmerkung „Böhmischer König“, Titus-Rezension Stuttgart 1954 | die Anmerkung nennt einen böhmischen König, die gematchte Entität war Markgraf von Österreich; La clemenza di Tito entstand zur Prager Krönung Leopolds II. (Q151321, Kaiser des Heiligen Römischen Reiches und König von Böhmen, 1747-05-05–1792-03-01), die Ordnungszahl in der Quelle ist zu prüfen |

### Matches mit dünner Belegbasis

Diese Zuordnungen sind nicht widersprüchlich, stützen sich aber auf Wikidata-Datensätze ohne Beschreibung, ohne Beruf oder ohne Label. Sie brauchen eine redaktionelle Sichtprüfung, bevor sie als Normdaten gelten.

| Quellname | QID | Befund |
|---|---|---|
| Klebe, Karl-Heinz | Q133073813 | Entität ohne jedes Label, P106 Kunstsammler, nur GND 1069196592; im Bestand Kontaktperson der Bayreuther Festspiele |
| Altmann, Olga | Q95686480 | Entität ohne Beschreibung und ohne Beruf, nur GND 116295120; im Bestand Unterzeichnerin von Einzahlungsnachweisen einer Wiener Konzertdirektion 1957/58 |
| Willy Heyer | Q95264973 | Entität ohne Beschreibung und ohne Beruf, geboren 1895; im Bestand sänger in der Monte-Carlo-Rezension |
| Sobota, Elisabeth | Q95704592 | Entität ohne Beschreibung und ohne Beruf, nur GND 117442232; im Bestand Sängerin im Wildschütz 1968 |
| Bauer, Gerhard | Q1511281 | österreichischer Politiker, 1940–2007; im Bestand Verfasser einer Rezension in der Arbeiter-Zeitung 1968 mit der Anmerkung „Journalist“, der Berufsabgleich trägt nicht |
| Chenier, André | Q295548 | französischer Dichter, 1762–1794; der Match als Dichter ist plausibel, die Bestandsrolle sänger ist der Fehler und gehört zu den Quellfehlern |

## Bewusst offen gelassene Fälle

54 Personen der `unmatched`-Liste bleiben ohne Vorschlag.

### Quellname ohne Vornamen, ohne auflösbare Initiale oder nur mit Anrede

Für diese Einträge gilt die Regel, dass ein reiner Nachname, eine Anrede oder eine Initialenfolge keinen Identifikator bekommt. Wo eine Lesart naheliegt, ist sie als Hinweis für die Erschließung genannt, ohne Zuweisung.

- `Hartmann, Prof.`, erwähnt in Korrespondenz zu Verträgen und zu Bayreuth 1952. Lesart Rudolf Hartmann, Intendant der Bayerischen Staatsoper, Q2172861, identisch mit der Korrektur oben.
- `Resnik`, Sängerin, Bayreuth 1953, die Quellanmerkung schlägt selbst „Regina (?)“ vor. Lesart Regina Resnik, Q435523, US-amerikanische Opernsängerin, Mezzosopran und Alt, 1922-08-30–2013-08-08.
- `Wallerstein`, Regisseur, Aida an der Wiener Staatsoper 1956, Quellanmerkung „unvollständig“. Lesart Lothar Wallerstein, Q1619671, Bühnenregisseur, 1882-11-06–1949-11-14, dessen Inszenierungen die Wiener Staatsoper über seinen Tod hinaus spielte.
- `Schoeck`, Komponist in der Konzertrepertoire-Liste, Quellanmerkung „verm. Schoeck, Othmar“. Lesart Othmar Schoeck, Q661927, Schweizer Komponist und Dirigent, 1886-09-01–1957-03-08.
- Ohne tragfähige Lesart bleiben `Horwitz`, `Hübner-Langenbruck, Prof.`, `Kuborn, M.`, `Kuborn - de Gauquier, Mme`, `Meiner`, `Pfeiffer, Mme`, `Rogatschewsky, Mme`, `Sch. K.`, `Schnyder`, `Schwab`, `Semon, Mrs.`, `Sforza`, `Strachwitz, Graf von`, `Szemere`, `Taubman, Frau`, `Uva`, `Vilmar-Hansen, E.`, `voioumaa, Mme`, `Wehrli., Dr.`.

### Vollständiger Name, aber kein tragfähiger Wikidata-Kandidat

Für diese Personen liefert die Suche entweder gar keinen Treffer oder nur Namensgleiche aus fremden Feldern. Sie sind größtenteils Personal des Musiktheaterbetriebs unterhalb der Lexikonschwelle, also Agenten, Verwaltung, technische Leitung, Lokaljournalismus und Ensemblemitglieder ohne Nachschlagewerkeintrag.

`Angerer, Dr. Dorothea`, `Baasch, Dr. med. Ernst`, `Ballhausen, Felix`, `Carey, Michel`, `Crampe, Fernand`, `Di Costanzo, Pasquale`, `Fürst, Paul`, `Gerard, Fritz`, `Hinsch-Gröhndal, Natalie`, `Hirsch, Robert`, `Jucker, Emil`, `Kaufmann, Hans-Joachim`, `Kühnly, Ernst`, `Kurt, Kuhlmann`, `Levinger. Dr. Henry W.`, `Lobasa, Monique`, `Malaniuk, Josef (Osyp)`, `Mathels, Elsa`, `Neumann-Spallart, Gottfried`, `Reding, Jeannine`, `Reinhard, Georges`, `Savelli, Laurent`, `Scheinwein, Robert`, `Schwarzbauer, Erich`, `Snider, Margaret`, `Taubman, Martin Hugo`, `Tobin, Gene`, `Vichey, Luben`, `Wachmann, Franzi`, `Warren, Cox`, `Wissner, Otto`.

Zwei Einträge tragen zusätzliche Quellprobleme. `Kurt, Kuhlmann` vertauscht Vor- und Nachnamen, gemeint ist der Regisseur Kurt Kuhlmann der Stuttgarter Titus-Aufführung. `Warren, Cox` ist die vertauschte Form von `Cox, Warren` und in QF-15 bereits als Namensvariante registriert.

## Muster in den Befunden

**Der `break` in der Kandidatenschleife von `reconcile_person` ist die häufigste Ursache der Nichtzuordnung.** Die Funktion bildet beide Namensformen, den rohen Indexstring `Nachname, Vorname` und die invertierte Form. Sie fragt aber zuerst den rohen String ab und bricht die Schleife ab, sobald diese Abfrage überhaupt Treffer liefert. Bei kanonischen Personen liefert `wbsearchentities` auf die Komma-Form die Lexikonartikel, weil deren Titel genau so lautet. Die Gegenprobe gegen die Live-API zeigt es für `Bach, Johann Sebastian` (fünf Treffer, angeführt vom ADB-Artikel Q23939877 und vom Lexikoneintrag Q28003252), für `Beethoven, Ludwig van` (fünf Treffer, angeführt vom BLKÖ-Artikel Q88592110), für `Verdi, Giuseppe` (ein Treffer, ein Lexikonartikel) und für `Uhde, Hermann` (ein Treffer, der ADB-Artikel). Diese Artikelentitäten fallen anschließend durch die P31-Prüfung auf `Mensch`, weshalb gar kein Match entsteht, während die invertierte Abfrage die Person auf Platz eins geliefert hätte. Betroffen sind fast alle 40 gesicherten Vorschläge der ersten Gruppe. Beide Abfragen laufen zu lassen und die Trefferlisten zu vereinigen, löst diese Klasse geschlossen auf.

**Ein Komma-Alias aus der GND erzeugt einen scheinbar exakten Match.** Wikidata-Datensätze, die aus GND-Beständen entstanden sind, tragen die Ansetzung `Nachname, Vorname` als Alias. `wbsearchentities` gibt in seinem Feld `label` bei einem Alias-Treffer die getroffene Aliasform zurück, und `reconcile_person` liest genau dieses Feld. Für `Weber, Ludwig` liefert die Komma-Abfrage einen einzigen Treffer, Q136748514, mit `match.type = alias` und `label = "Weber, Ludwig"`. Damit greift `is_exact_match`, der Score springt auf 100, und die Funktion kehrt sofort zurück, ohne die invertierte Abfrage zu stellen, in der der Bass Ludwig Weber steht. Derselbe Mechanismus erklärt `Böhme, Kurt` (Alias am Ubootfahrer-Datensatz) und `Schmidt, Franz` (Alias am Bibliothekar-Datensatz). Der Kurzschluss bei `exact` ist damit die riskanteste Stelle der Funktion, weil er die Prüfung an einer Aliasform ohne Berufskontrolle beendet.

**Ein Genitiv-s wandert aus dem Rezensionstext in den Personenindex.** Im Record der Tannhäuser-Rezension von 1956 tragen vier Namen ein überzähliges s, nämlich `Dermotas, Anton`, `Felberma-Yers, Anny`, `Hurshells, Edmund` und `Lustigs, Rudolf`. Dazu kommt `Preys, Hermann` aus dem Capriccio-Record, das über die Ähnlichkeit zu `Preysing` sogar einen falschen Match erzeugt hat. Die Erfassung hat hier die flektierte Form des Fließtexts übernommen. Ein Quellfix an diesen fünf Zellen erledigt vier Nichtzuordnungen und einen Abgleichfehler.

**Der Fehlmatch auf die prominentere Namensgleiche ist breiter als AF-02 beschreibt.** Der systematische Abgleich aller gematchten Personen gegen P106 und P569/P570 hat neben den sechs genannten Fällen sechs weitere ersetzbare und zwölf zu streichende Zuordnungen gefunden, dazu sechs Matches auf Wikidata-Datensätze ohne Beschreibung oder Beruf. Die Ursache liegt in der Kombination aus reinem Namensabgleich und einer P31-Verifikation, die nur auf `Mensch` prüft. Ein zusätzlicher Filter auf P106 gegen ein Berufsvokabular des Musiktheaters und ein Plausibilitätstest der Lebensdaten gegen das Record-Datum hätten alle diese Fälle abgefangen; beide Prüfungen sind in dieser Recherche als Skript gelaufen und ließen sich in `reconcile.py` verankern.

**Zwei weitere Stellen in `reconcile_person` erzeugen den Fehlmatch mechanisch.** `search_wikidata` läuft mit `limit=5`, weshalb der gesuchte Sängername aus der Kandidatenliste fällt, wenn ihm fünf prominentere Namensträger vorausgehen. Die Auswahlbedingung lautet zudem `score > best_score`, also strikt größer, sodass bei mehreren Treffern mit identischem Score von 100 der erste Treffer der Wikidata-Trefferliste gewinnt; diese Reihenfolge bevorzugt die Entität mit den meisten Sitelinks und Statements. Für `Dermota, Anton` liefert die Komma-Abfrage null Treffer, die Schleife läuft weiter zur invertierten Form `Anton Dermota`, und dort steht der slowenische Politiker vor dem Tenor. Damit ist der Kern von AF-02 mechanisch erklärt.

**Namensgleichheit ohne Berufsprüfung trifft besonders kurze und häufige Namen.** `Weber`, `Campese`, `Schnyder` und `Meiner` stehen ohne Vornamen im Index, `Ludwig Weber`, `Peter Klein`, `Franz Schmidt` und `Rudolf Hartmann` sind Namen mit einem Dutzend Wikidata-Trägern. Genau dort hat der Fuzzy-Match den falschen gewählt.

**Das Betriebspersonal fehlt in Wikidata.** Von den 54 offenen Fällen sind 31 vollständig benannte Personen ohne Wikidata-Eintrag, darunter Konzertagenten, Opernverwaltung, technische Leitung, Ausstatter und lokale Kritiker. Für diese Gruppe ist die GND der aussichtsreichere Nachweisweg. Für die Ensemblemitglieder kommt das Große Sängerlexikon von Kutsch und Riemens in Frage, das mehrere der hier gesicherten Sängerbiografien belegt.

## Fachliche Entscheidungen, die der Operator treffen muss

1. `Richter, Gerd`. Zwei Bühnenbildner des Jahrgangs 1903 kommen in Frage. Q94907900 ist über GND und dewiki-Artikel besser belegt und starb in Stuttgart, was zum Stuttgarter Record passt. Q19594934 stammt aus dem Künstlerlexikon-Kontext mit abweichendem Todesjahr 1965. Ob es sich um zwei Personen oder um eine Dublette handelt, ist ohne biografische Quelle nicht zu entscheiden.
2. `Bergfeld, Dr. Johann`. Die Quelle führt den Vornamen Johann, die Records nennen Joachim, Wikidata kennt nur Joachim Bergfeld. Die Vornamensfrage gehört in die Erfassung, bevor der Identifikator gesetzt wird.
3. `Leopold III.` mit der Anmerkung „Böhmischer König“. Die Ordnungszahl der Quelle und die Anmerkung widersprechen einander. Wenn der Krönungsanlass von La clemenza di Tito gemeint ist, lautet die Entität Leopold II., Q151321.
4. `Linné, Carl von` erscheint als erwähnte Person in einer Tannhäuser-Rezension. Die Entität ist eindeutig, der Sachbezug im Record ist es nicht.
5. Ob die sechs Matches mit dünner Belegbasis als Normdaten stehen bleiben oder bis zur Sichtprüfung entfernt werden, ist eine Grundsatzfrage der Anreicherungspolitik und betrifft alle über die GND erzeugten Wikidata-Datensätze ohne Beschreibung.
