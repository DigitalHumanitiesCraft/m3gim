# Vorschläge für Wikidata-Identifikatoren, Organisationen und Orte

Recherchestand 2026-08-22. Grundlage sind die Listen `unmatched` und `skipped` in `data/output/wikidata-reconciliation.json` für die Typen `org` und `location`, dazu `matched` zur Prüfung der bestehenden Zuordnungen. Der Verwendungszusammenhang je Eintrag stammt aus `data/output/m3gim.jsonld`, die Spalten `ort` und `anmerkung` aus `data/google-spreadsheet/M3GIM-Organisationsindex.xlsx`. Als Snapshot-Dokument führt der Report Zählstände und Index-Kennungen.

Dieser Report schlägt vor und ändert nichts. Reconciliation-Datei, Datensatz, Datenfehler-Register und Skripte sind unangetastet.

## Belegverfahren

Jeder genannte Identifikator ist über `https://www.wikidata.org/wiki/Special:EntityData/<QID>.json` mit einer eigenen User-Agent-Kennung abgerufen und am Datensatz geprüft, auf Label und Alias in allen erfassten Sprachen, auf die Entitätsklasse aus P31, auf Sitz und Verwaltungszuordnung aus P17, P131 und P159, auf Gründungs- und Auflösungsdatum aus P571 und P576 sowie bei Orten auf die Koordinate aus P625. Namensgleichheit allein gilt nicht als Beleg; wo die Institution zwischen Bestandsname und Wikidata-Label auseinanderfällt, steht die Divergenz in der Anmerkungsspalte.

Konfidenzstufen:

- **gesichert.** Label oder Alias der abgerufenen Entität trägt den Quellnamen oder dessen extern belegte historische Form, die Entitätsklasse passt zur Sache, und Sitz oder Verwaltungszuordnung deckt sich mit der Ortsangabe des Index.
- **wahrscheinlich.** Die Institutionsidentität ergibt sich aus Klasse, Ort und Wirkungszeitraum, der Quellname schließt aber nur über eine externe Quelle an die Entität an, oder die Entität selbst ist ein dünner Stub.
- **offen.** Keine Entität auffindbar, mehrere gleichrangige Kandidaten, oder ein Widerspruch zwischen Bestandsbeleg und Entitätsdaten.

## Organisationen

Alle Zeilen stammen aus `unmatched` beziehungsweise `skipped`. Die Kennung in Klammern ist die `m3gim_id` des Organisationsindex.

### Gesichert

| Quellname (Index) | Vorschlag | Wikidata-Label | Entitätsklasse | Kontext im Bestand | Anmerkung |
|---|---|---|---|---|---|
| Abendzeitung (O2) | Q225076 | Abendzeitung | Tageszeitung, Sitz München | Rezensionsherausgeber, Index-`ort` München | |
| Aktiengesellschaft Leu & Co. (O4) | Q806636 | Bank Leu | Organisation (Bank), Sitz Zürich, 1755 bis 2007 | erwähnt, Index-`ort` Zürich, `anmerkung` Bank | Firmenform `Aktiengesellschaft Leu & Co. Zürich` ab 1854, belegt im verlinkten dewiki-Artikel |
| Arbeiter Zeitung (O5) | Q627083 | Arbeiter-Zeitung | Zeitung, Sitz Wien, 1889 bis 1991 | Rolle `herausgeber`, Rezension zu `Der Wildschütz` 1968 | Quellform ohne Bindestrich |
| Deutsche Oper Berlin (O12) | Q637834 | Deutsche Oper Berlin | Opernhaus, Berlin | erwähnt, Umschlag `an Deutsche Oper Berlin` | |
| Epic Records (O15) | Q216364 | Epic Records | Plattenlabel, USA, ab 1953 | erwähnt in einer Plattenrezension 1959 | |
| Fränkische Presse (O18) | Q23787475 | Fränkische Presse | Zeitung, Bayreuth | Rezensionen zu den Bayreuther Festspielen 1953 | |
| Hochschule für Musik und darstellende Kunst Graz (O66) | Q875147 | Universität für Musik und darstellende Kunst Graz | Universität und Konservatorium, Graz | Index-`ort` Graz, assoziiert mit der Nachlassbildnerin | Bestandsname ist ein Alias der Entität, Umbenennung 1998 |
| Indiana University School of Music (O65) | Q6119774 | Jacobs School of Music | Konservatorium, Bloomington (Indiana) | Index-`ort` `Bloomington, Indiana` | Bestandsname ist ein Alias der Entität, Umbenennung 2005 |
| Landestheater (Hannover) (O20) | Q1524804 | Niedersächsische Staatstheater Hannover | Theatergesellschaft, Hannover | erwähnt in einer Rezension 1956 | Alias `Landestheater Hannover`; die Opernsparte führt Q114142443, das Haus Q315705 |
| Le Monde (O21) | Q12461 | Le Monde | Tageszeitung, Frankreich, ab 1944 | Rezensent René Dumesnil | |
| Markgräfliches Opernhaus (O69) | Q278908 | Markgräfliches Opernhaus | Opernhaus und Museum, Bayreuth | Rolle `auffuehrungsort`, Konzertanfrage 1952 | |
| Mozart-Sängerknaben (O23) | Q993642 | Mozart Knabenchor Wien | Knabenchor, Österreich, ab 1955 | Rolle `aufführung`, `Der Wildschütz` 1968 | Bestandsname ist ein Alias der Entität |
| Münchner Merkur (O24) | Q279832 | Münchner Merkur | Tageszeitung, Bayern, ab 1946 | Rezensionsherausgeber | |
| Münchner Opern-Festspiele (O25) | Q822390 | Münchner Opernfestspiele | Opernfestival, München | Index-`anmerkung` Festival | Quellform mit Bindestrich |
| Musikakademie in Lemberg (O26) | Q1992023 | Nationale Musikakademie Lwiw „Mykoly Lyssenka“ | Konservatorium, Lemberg, ab 1854 | Kurzbiografie und Memorandum zur Ausbildung der Nachlassbildnerin | einzige Musikhochschule der Stadt, Aliasformen `Konservatorium Lemberg` und `Lemberger Konservatorium` |
| Musikverein Graz (O27), Musikverein für Steiermark (O68) | Q1955271 | Musikverein für Steiermark | Musikverein, Graz, ab 1815 | beide Indexzeilen ohne weitere Kontextspalte | eine Institution unter zwei Indexzeilen, dewiki-Titel `Musikverein Graz` |
| Neues Österreich (O31) | Q1440644 | Neues Österreich | Tageszeitung, Österreich | Rolle `herausgeber`, Rezensionen 1956 | |
| Opéra de Monte-Carlo (O34) | Q1577048 | Opéra de Monaco (de), Opéra de Monte-Carlo (en) | Opernhaus, Monaco | Rolle `auffuehrungsort`, `Der Rosenkavalier` | deutsches Label weicht vom Bestandsnamen ab, englisches Label deckt ihn |
| Opéra de Monte-Carlo. Orchestre national (O35) | Q2914921 | Orchestre philharmonique de Monte-Carlo | Orchester, Monaco, ab 1856 | Rolle `auftritt`, gleiche Aufführung wie O34 | Alias `Orchestre National de l'Opéra de Monte Carlo` |
| Opernhaus Zürich (O36), Stadttheater Zürich (O49) | Q670406 | Opernhaus Zürich | Opernhaus, Zürich | Engagement laut Tätigkeitsliste und Kurzbiografie | Alias `Stadttheater Zürich`, eine Institution unter zwei Indexzeilen |
| orchestre municipal (Strasbourg) (O37) | Q472844 | Straßburger Philharmoniker | Orchester, Straßburg, ab 1855 | Rolle `aufführung`, `Le Chant de la Terre` 1954 unter Fritz Münch | bis 1972 `Orchestre municipal de Strasbourg`, belegt im frwiki-Artikel der Entität |
| Plattenevrlag Decca (O40) | Q557632 | Decca Records | Plattenlabel, Vereinigtes Königreich | erwähnt in Kurzbiografie und Memorandum | Erfassungs-Tippfehler `Plattenevrlag` |
| R.C.A.-Victor (O43) | Q3415083 | RCA Victor | Plattenlabel, USA, ab 1945 | Index ohne Ortsspalte | Punktschreibweise der Quelle |
| Salzburger Festspiele (O44) | Q256443 | Salzburger Festspiele | Musikfestival, Salzburg, ab 1920 | | |
| SAS Scandinavian Airlines (O45) | Q187854 | SAS Scandinavian Airlines | Fluggesellschaft, ab 1946 | Rolle `fluggesellschaft`, Gastspielreise Lissabon 1953 | Quellform mit doppeltem Leerzeichen |
| Staatsoper Wien (O47), Wiener Staatsoper (O61) | Q209937 | Wiener Staatsoper | Opernhaus, Wien | Rolle `auffuehrungsort` in mehreren Rezensionen | Alias `Staatsoper Wien`, eine Institution unter zwei Indexzeilen |
| Stadttheater Graz (O48) | Q618239 | Opernhaus Graz | Opernhaus, Graz | erwähnt im Memorandum zur Laufbahn | Alias `Stadttheater`, identisch mit dem bereits gematchten `Oper Graz` (O33) |
| Stuttgarter Nachrichten (O50) | Q2359571 | Stuttgarter Nachrichten | Tageszeitung, Stuttgart, ab 1946 | Rezensent Kurt Honolka | Index-`ort` Neapel bezeichnet den Berichtsort; der Verlagssitz ist Stuttgart |
| Stuttgarter Staatsoper (O51) | Q467147 | Staatsoper Stuttgart | Opernhaus, Stuttgart | Index-`ort` Stuttgart | Alias `Stuttgarter Staatsoper` |
| Süddeutsche Zeitung (O52) | Q158870 | Süddeutsche Zeitung | Tageszeitung, München, ab 1945 | Rezensent K. H. Ruppel | die gleichnamigen Blätter Q109369396 und Q122817093 sind vor 1945 eingestellt |
| Südost-Tagespost (O67) | Q2381148 | Südost Tagespost | steirische Tageszeitung | Index-`anmerkung` Zeitung | dewiki-Titel mit Bindestrich, Wikidata-Label ohne |
| Teatro di San Carlo (O54) | Q628491 | Teatro San Carlo | Opernhaus, Neapel, ab 1737 | Neapel-Aufführungen der Nachlassbildnerin | |
| Volksoper Wien (O58) | Q694747 | Volksoper Wien | Opernhaus, Wien | Rolle `auffuehrungsort`, mehrfach | |
| Wiener Philharmoniker (O59) | Q154685 | Wiener Philharmoniker | Sinfonieorchester, Wien, ab 1843 | Rolle `auftritt`, `Tannhäuser` 1956 | |
| Wiener Symphoniker (O62) | Q686887 | Wiener Symphoniker | Sinfonieorchester, Wien, ab 1900 | Rolle `aufführung`, Plattenrezension 1959 | |
| Wiener Zeitung (O63) | Q697173 | Wiener Zeitung | Tageszeitung, Wien, ab 1703 | Rolle `herausgeber`, `Der Wildschütz` 1968 | |

### Wahrscheinlich

| Quellname (Index) | Vorschlag | Wikidata-Label | Entitätsklasse | Kontext im Bestand | Grund für die Abstufung |
|---|---|---|---|---|---|
| Conservatoire (O9) | Q282200 | Conservatoire à rayonnement régional de Strasbourg | Konservatorium, Straßburg, ab 1855 | Index-`ort` Strasbourg | der Quellname ist eine Gattungsbezeichnung, die Zuordnung hängt allein an der Ortsspalte |
| Convent Garden Opera Company (O10) | Q4266459 | The Royal Opera | Opernensemble, London, ab 1946 | Rolle `aufführung`, NCAC-Newsletter | die Kompanie hieß bis 1968 Covent Garden Opera Company, Wikidata führt dazu keinen Alias. Das Haus wäre Q55018 mit Alias `Covent Garden Opera` |
| Neuer Kurier (O30) | Q360136 | kein Label in de oder en, `mul`-Label `Kurier`, dewiki `Kurier (Tageszeitung)` | Tageszeitung, Wien, ab 1954 | Rolle `herausgeber`, Rezension 1956 | die Entität trägt den Bestandsnamen nirgends. Die Identität stützt sich auf die Namensphase `Neuer Kurier` ab Oktober 1954 laut dewiki-Artikel und auf P155 zu Q70475117 `Wiener Kurier` |
| Österreichische neue Tageszeitung (O38) | Q1979928 | Neue Österreichische Tageszeitung | Zeitung, Österreich | Rolle `herausgeber` | die Wortstellung von Label und Bestandsname weicht ab. Die Titelkette Wiener Tageszeitung, Neue Wiener Tageszeitung, Österreichische Neue Tageszeitung ab 1956-01-01 ist extern belegt, Wikidata führt dazu keinen Alias |
| Plattenverlag Philipps (O41) | Q1536003 | Philips Records | Plattenlabel, Niederlande, ab 1946 | erwähnt in Kurzbiografie und Memorandum | Erfassungsschreibweise `Philipps` mit doppeltem p |
| Richard-Wagner-Verband (O70) | Q631944 | Richard-Wagner-Verband | Non-Profit-Organisation, Sitz Bayern, ab 1909 | Brief über eine Konzertanfrage 1952, Absendeort Bayreuth | der Dachverband trägt den Namen, die Ortsverbände ebenso, und die Quelle nennt keinen Ortsverband. Q130901904 (Wien, 1873 bis 1938) scheidet wegen der Auflösung aus |
| Staatsoper München (O46) | Q681931 | Bayerische Staatsoper | Opernkompagnie, München, ab 1653 | Rolle `arbeitgeber`, Brief über Dienstverträge 1952 | Alias `Münchner Staatsoper` deckt die Sache, die Wortform bleibt abweichend. Dublette zur bereits gematchten Zeile O6 |

### Offen

| Quellname (Index) | Befund |
|---|---|
| Abendkonzerte in Wiener Palais (O1) | Veranstalterreihe für Liederabende in Wiener Palais, belegt zu einem Konzertprogramm im Palais Pallavicini 1963. Keine Wikidata-Entität auffindbar |
| Académie nationale de musique (O3) | zwei gleichrangige Lesarten. Q187840 `Palais Garnier` führt `Académie nationale de musique` als Alias und bezeichnet das Haus, Q283339 `Pariser Oper` bezeichnet die Opernkompagnie und damit die Institution. Der Bestandsbeleg ist eine Rezension zu `Tristan und Isolde` in Paris 1956 und trägt beide Lesarten |
| Centropa Concert Organisation, Konzertdirektion (O8) | keine Wikidata-Entität auffindbar. Die Quelle führt selbst `nicht verifizierbar` in der Wikidata-Spalte, der Name erscheint im JSON-LD-Bestand nicht |
| Deutsches Musikinstitut für Ausländer (O13) | Einrichtung der NS-Zeit, belegt über ein Programmheft zum Sommerkurs 1944 in Potsdam und Salzburg. Keine Wikidata-Entität und kein Wikipedia-Artikel auffindbar |
| Düsseldorfer Zeitung (O14) | Zeitwiderspruch. Der einzige Kandidat Q123681449 erscheint regelmäßig bis 1926, der Bestandsbeleg ist eine Rezension vom 1954-03-31. Der Fall gehört ans Erfassungsteam, weil vermutlich ein anderes Düsseldorfer Blatt der Nachkriegszeit gemeint ist |
| Ernst Kühnly Bühnenvermittlung Inland und Ausland (O16) | Stuttgarter Bühnenagentur, belegt über einen Brief zum Gastspiel Lissabon 1953. Keine Wikidata-Entität auffindbar |
| Felix Ballhausen Bühnenvermittlung, Ballhaus Agentur München (O17) | Münchner Bühnenagentur, belegt über einen Brief zu Dienstverträgen 1952. Keine Wikidata-Entität auffindbar, die Quelle führt selbst `nicht verifizierbar` |
| Konzertgesellschaft Zürich (O19) | belegt nur über eine Visitenkarte. Keine Wikidata-Entität auffindbar |
| National Artists Corporation (O28, O29) | New Yorker Künstleragentur, belegt über Korrespondenz 1957 und 1959. Keine Wikidata-Entität auffindbar. Die beiden Indexzeilen sind eine Dublette |
| Philharmoniaquartett (O39) | Wiener Streichquartett, belegt als `interpret` eines Liederabends. Keine Wikidata-Entität auffindbar. Q1762521 `Philharmonia Quartett Berlin` scheidet aus, das Ensemble besteht erst seit 1985 |
| Richard-Wagner-Stipendienstiftung (O71) | Bayreuther Stiftung von 1882, belegt über den Brief von 1952. Keine Wikidata-Entität auffindbar, von der 1973 errichteten Richard-Wagner-Stiftung Bayreuth zu unterscheiden |
| Tonhalle-Gesellschaft Zürich (O56) | die Trägergesellschaft selbst hat keine Wikidata-Entität. Zwei benachbarte Kandidaten, Q673575 `Tonhalle-Orchester Zürich` als Klangkörper und Q3531558 `Tonhalle` als Konzerthaus. Der Bestandsbeleg ist ein Brief des Sekretärs über Konzerte und Probezeiten 1968 |
| Wiener Staatopernchor (O60) | Chor der Wiener Staatsoper, belegt über eine Plattenrezension 1959. Keine Wikidata-Entität für den Chor auffindbar, Wikidata führt das Bühnenorchester (Q1020610) und das Staatsballett (Q7928345) getrennt. Erfassungs-Tippfehler `Staatopernchor` |
| Zürcher Tagblatt (O64) | keine Wikidata-Entität auffindbar. Q2387796 `Tagblatt der Stadt Zürich` ist das städtische Amtsblatt und trägt den Bestandsnamen weder als Label noch als Alias |

## Orte

### Aus dem Ortsindex

| Quellname (Index) | Vorschlag | Wikidata-Label | Entitätsklasse | Koordinaten | Kontext im Bestand | Stufe |
|---|---|---|---|---|---|---|
| Bloomington, Indiana (L32) | Q490385 | Bloomington | City in Indiana, County Seat | 39.1667 / -86.5347 | Sitz der Indiana University School of Music (O65), Kontakt Max Röthlisberger | gesichert |
| Frankfurt (L4) | Q1794 | Frankfurt am Main | Großstadt in Hessen | 50.1106 / 8.6822 | die Erfassungsspalte präzisiert selbst `Frankfurt am Main` | gesichert |

Die Zeile `Frankfurt` steht als `skipped` mit `existing_qid: "Frankfurt am Main"` in der Reconciliation. In der Zelle steht die Erfassungsnotiz aus der Nachbarspalte, die `reconcile.py` durch den Header-Shift des Ortsindex als Wikidata-Spalte gelesen hat. Ein Approval ist damit nicht ausgesprochen. Der Header-Shift steht bereits als struktureller Quell-Fix im Register.

### Aus den Verknüpfungen, ohne Eintrag im Ortsindex

Diese Orte erreichen die Reconciliation nie, weil deren Eingabe der Ortsindex ist. Sie stehen im JSON-LD mit `@id: null` und bleiben im Atlas unverortet.

| Quellname | Vorschlag | Wikidata-Label | Entitätsklasse | Koordinaten | Kontext im Bestand | Stufe |
|---|---|---|---|---|---|---|
| Barcelona | Q1492 | Barcelona | Gemeinde in Katalonien | 41.3825 / 2.1769 | Rolle `gastspiel`, Korrespondenz Wieland Wagner 1954 | gesichert |
| Belgrad | Q3711 | Belgrad | Hauptstadt Serbiens | 44.8178 / 20.4569 | Ortsrolle in der Verknüpfungstabelle | gesichert |
| Brüssel | Q239 | Brüssel | Gemeinde in Belgien | 50.8467 / 4.3517 | Rollen `auffuehrungsort`, `gastspiel` und `empfang`, Korrespondenz 1954 | gesichert |
| Dresden | Q1731 | Dresden | Großstadt in Sachsen | 51.0493 / 13.7381 | Ortsrolle in der Verknüpfungstabelle | gesichert |
| Düsseldorf | Q1718 | Düsseldorf | Großstadt in Nordrhein-Westfalen | 51.2256 / 6.7767 | Ortsrolle in der Verknüpfungstabelle | gesichert |
| Genf, Geneve | Q71 | Genf | Gemeinde und Kantonshauptort, Schweiz | 46.2 / 6.15 | Begleitbrief zum Originalvertrag Genf 1956, Tätigkeitsliste mit `Grand Theatre Geneve` | gesichert, zwei Schreibvarianten auf eine Entität |
| Lausanne | Q807 | Lausanne | Gemeinde und Kantonshauptort, Schweiz | 46.5333 / 6.6333 | Vertrag mit dem Théâtre municipal de Lausanne 1953 | gesichert |
| Strasbourg | Q6602 | Straßburg | Gemeinde in Frankreich | 48.5733 / 7.7522 | Rezension 1954 | gesichert, identisch mit der bereits gematchten Indexzeile `Straßburg` |
| Turin | Q495 | Turin | Großstadt im Piemont | 45.0792 / 7.6761 | Rolle `auffuehrungsort`, RAI-Aufführung `Tristan und Isolde` 1956 | gesichert |
| Warschau | Q270 | Warschau | Hauptstadt Polens | 52.23 / 21.0111 | Tätigkeitsliste 1939 bis 1949, dazu `Große Oper Warschau` | gesichert |
| Wuppertal | Q2107 | Wuppertal | Großstadt in Nordrhein-Westfalen | 51.2667 / 7.1833 | Rolle `auffuehrungsort`, Abschlussschein zu Mahlers `Lied von der Erde` 1953 | gesichert |
| Beromünster | Q7146 | Beromünster | Gemeinde im Kanton Luzern | 47.1997 / 8.2 | Tätigkeitsliste, gemeinsam mit `Schweizerischer Landessender Beromünster` | wahrscheinlich, der Quellstring bezeichnet primär den Sender, dessen Standort die Gemeinde ist |

## Korrekturen bestehender Zuordnungen

| Kennung | Betroffen | Bisher | Korrekt | Beleg |
|---|---|---|---|---|
| AF-01 | Ort `New York`, Rollen `absendeort` (NIM_004 1), `zielort` (NIM_004 23) und `entstehung` (NIM_004 27), dazu die übrigen New-York-Vorkommen | Q1384 | **Q60** | Q1384 trägt Label `New York`, Beschreibung `Bundesstaat der Vereinigten Staaten von Amerika`, P31 Q35657 `Bundesstaat der Vereinigten Staaten` und Koordinate 43 / -75. Q60 trägt Label `New York City` mit den Aliasformen `New York, NY` und `New York (city)`, P31 unter anderem Q515 `Stadt` und Q1093829 `Ort mit Status City in den Vereinigten Staaten`, P131 Q1384 und Koordinate 40.7128 / -74.0061. Für Absende- und Zielort einer Korrespondenz ist die Stadt gemeint |
| neu | Organisation `Teatro Colón` (O53), Buenos-Aires-Auftritte | Q11951072 | **Q827401** | Q11951072 trägt die Beschreibung `Theater in A Coruña, Spanien`, P17 Q29 Spanien, P131 Q8757 A Coruña und Koordinate 43.3702 / -8.3986. Q827401 ist das Opernhaus an der Plaza Lavalle, P17 Q414 Argentinien, P131 Q1486 Buenos Aires, Koordinate -34.6011 / -58.3831. Der Organisationsindex führt für O53 die Ortsspalte `Buenos Aires`. Das Match steht in der Reconciliation als `exact` mit Konfidenz 100, weil beide Häuser gleich heißen |

Der Fall Teatro Colón ist derselbe Fehlertyp wie der behobene Rostock-Fall, eine über reine Namensgleichheit erzeugte Zuordnung. Er zeigt zusätzlich, dass die Schwelle `exact` bei mehrdeutigen Namen keine Sicherheit gibt, weil sie nur die Zeichenkette vergleicht.

## Prüfung auf weitere Verwechslungen zwischen Stadt und übergeordneter Einheit

Alle im Datensatz verwendeten Orts-Q-IDs sind abgerufen und auf P31 und P625 geprüft. Über den New-York-Fall hinaus trägt kein Ort dieselbe Verwechslung.

Drei Randfälle sind zu unterscheiden und gehören nicht in diese Klasse:

- **Berlin (Q64), Hamburg (Q1055), Wien (Q1741)** führen in Wikidata Stadt und Land in einer Entität, weil sie Stadtstaaten sind. Die Koordinaten liegen im jeweiligen Stadtzentrum, ein Kartenmarker landet richtig.
- **Schottland (Q22)** ist ein Land mit dem Zentroid 57 / -5 in den Highlands. Der Bestandsname lautet selbst `Schottland`, die Zuordnung bildet die Erfassungsgranularität also korrekt ab. Ein Marker an dieser Position ist ein Erfassungsbefund und kein Abgleichfehler. Der Eintrag stammt aus dem Ortsindex (L23) und kommt im JSON-LD nicht vor.
- **Italien** erscheint im JSON-LD ohne Q-ID als `auffuehrungsort` einer Rezension zu einer Neapel-Aufführung. Auch hier steht die Staatsebene in der Quelle. Die Entität wäre Q38, sinnvoller ist der Quellfix auf Neapel, das im selben Record bereits erfasst ist.

Zwei bestehende Zuordnungen zeigen eine Granularitätsabweichung ohne Ortsversatz, beide nur in der Reconciliation und nicht im Datensatz:

- **Perchtoldsdorf (L19)** ist auf Q21880302 gematcht, die Ortschaft mit P31 `Siedlung`. Die Marktgemeinde führt Q671367 mit Koordinate 48.1167 / 16.2667 gegenüber 48.119 / 16.257. Der Versatz ist irrelevant, die üblichere Ortsidentität ist die Gemeinde.
- **Madrid (L12)** ist auf Q116170766 `Stadt Madrid` gematcht, einen Eintrag aus der spanischen Gemeindeaufspaltung mit P31 `municipality capital`. Die kanonische Stadtentität ist Q2807 `Madrid` mit P31 Q2074737 `Gemeinde in Spanien` und Koordinate 40.4169 / -3.7033.

## Bewusst offen gelassene Fälle

### Organisationen

Die vierzehn Zeilen der Tabelle `Offen` oben, jeweils mit Grund. Vier davon brauchen eine fachliche Entscheidung statt weiterer Recherche:

- **Académie nationale de musique.** Haus oder Kompanie. Die Wahl hängt daran, ob das Projekt bei Aufführungsnennungen die Spielstätte oder den Betrieb als Referenzentität führt. Dieselbe Frage steht implizit bei den bereits gematchten Häusern, wo `Bayerische Staatsoper` und `Metropolitan Opera` auf Kompanien zeigen, während `Oper Graz`, `Prinzregententheater` und `Cuvilliéstheater` auf Gebäude zeigen.
- **Tonhalle-Gesellschaft Zürich.** Trägergesellschaft ohne eigene Entität. Zu entscheiden ist, ob ersatzweise der Klangkörper oder das Haus gesetzt wird oder die Zeile ohne Identifikator bleibt.
- **Convent Garden Opera Company.** Kompanie unter historischem Namen. Zu entscheiden ist, ob eine Zuordnung ohne deckenden Alias die Belegschwelle des Projekts erfüllt.
- **Düsseldorfer Zeitung.** Zeitwiderspruch zwischen Quelle und einzigem Kandidaten. Die Klärung liegt beim Erfassungsteam, das den Zeitungstitel am Original prüft.

### Teil 3, Ortsvarianten aus QF-16

- **`bayreuth`** (Kleinschreibung, zwei Vorkommen, davon eines bereits mit `wd:Q3923` verknüpft). Reiner Casing-Fehler derselben Stadt. Eine eigene Q-ID braucht es nicht. Der saubere Weg ist der Quellfix in der Verknüpfungstabelle, alternativ eine Case-Normalisierung des Ortsnamens vor dem Reconcile-Match-Key, die diesen Fall folgenlos macht. Urteil: Quellfehler, keine Zuordnung.
- **`Bayeuth`** (Tippfehler, zwei Vorkommen, Record NIM_135 2_25, Programmheft der Bayreuther Festspiele 1951). Der Kontext belegt die Stadt eindeutig. Trotzdem keine Zuordnung, weil eine Q-ID einen Erfassungsfehler kaschieren würde, den der Bestand als Erschließungsspiegel sichtbar halten soll. Urteil: Quellfehler, gehört ans Erfassungsteam. Ziel nach dem Fix ist Q3923.
- **`Bayerische Staatsoper` als Ort** (ein Vorkommen in einer Ortsrolle). Eine Institution steht in der Ortsspalte. Eine Ortszuordnung wäre falsch, eine Organisationszuordnung (Q681931) verlangt, dass die Zeile in die richtige Spalte wandert. Der Ort dieser Zeile wäre München (Q1726). Urteil: Quellfehler mit Spaltenverwechslung, gehört ans Erfassungsteam.

Zur Größenordnung: `Bayreuth` erscheint im Datensatz neunzig Mal als Ort, davon neunundsechzig Mal mit `wd:Q3923`. Die restlichen Vorkommen tragen `@id: null`, weil Mobilitäts-Ortsrollen aus der Verknüpfungstabelle die Q-ID des Ortsindex nicht in jedem Pfad erben. Das ist ein Pipelinebefund neben dem Casing-Rest und lohnt eine eigene Prüfung, weil der Casing-Fix allein die Lücke nicht schließt.

### Teil 3, adressgenaue Orte aus AF-03

Betroffen sind `Zürich, Zürichbergstrasse 104`, `Zürich, Zurichbergstrasse 104` (Umlaut-Tippfehler, QF-12), `Zürich, Geibelstrasse 1`, `Zürich, Geibelstrasse 1/1` und `München, Martiusstrasse 3`.

Für keine dieser Angaben ist eine eigene Wikidata-Zuordnung sinnvoll. Wikidata führt Wohnadressen ohne Denkmal- oder Bauwerksstatus nicht als Entitäten, und die fünf Strings bezeichnen Privatadressen. Die richtige Auflösung ist die im Register bereits benannte Stadtebene, also Q72 für die vier Zürcher Varianten und Q1726 für die Münchner. Die Frontend-Milderung über `cityOf` (E-108) leistet das zur Laufzeit, die Wurzel bleibt die fehlende Stadt- und Q-ID-Spalte im Ortsindex. Die vier Zürcher Strings sind zusätzlich auf zwei Adressen zu konsolidieren, weil `Zurichbergstrasse` gegenüber `Zürichbergstrasse` und `Geibelstrasse 1` gegenüber `Geibelstrasse 1/1` Erfassungsvarianten derselben Adresse sind.

Ein Nebenbefund derselben Klasse steht in der Ortsspalte des Datensatzes, nämlich `Hofburg`, `Palais Auersberg`, `Palais Lobkowitz`, `Palais Palffy`, `Palais Pallavicini`, `Palais Rasumofsky`, `Palais Schwarzenberg`, `Prinzregententheater`, `Theatre de la Monnaie` und `Grand Theatre Geneve`. Hier stehen Gebäude und Institutionen in der Ortsrolle. Anders als bei Privatadressen führt Wikidata diese Bauwerke als Entitäten, sie gehören aber in die Organisations- oder Spielstättenrolle, mit der Stadt als Ort. Das ist eine Modellierungsentscheidung und keine Recherchefrage.

## Struktureller Befund zur Reichweite der Reconciliation

Die Reconciliation läuft über die Indextabellen. Der Organisationsindex führt einundsiebzig belegte Zeilen, die Verknüpfungstabelle nennt darüber hinaus Organisationen, die den Index nie erreichen und deshalb ungeprüft bleiben, darunter Nordwestdeutscher Rundfunk, Bayrischer Rundfunk, Berliner Philharmoniker, Hamburgische Staatsoper, Staatsoper Dresden, Badisches Staatstheater Karlsruhe, Hessisches Staatstheater Kassel, Landestheater Linz, Vereinigte Bühnen Graz, Staatliche Oper Lemberg, Große Oper Warschau, Radiotelevisione italiana, Die Presse, Kieler Nachrichten und Musikschule der Stadt Wien. Für Orte gilt dasselbe, dort listet dieser Report die betroffenen Städte oben vollständig auf.

Die Wirkung ist doppelt. Ein Teil dieser Namen ist eine Schreibvariante bereits erfasster Entitäten (`Bayerischen Staatsoper`, `Bayrische Staatoper`, `Stuttgarter Stattsoper`, `Wiener Volksoper`, `Munich Opera compagny`), ein anderer Teil sind eigenständige Institutionen ohne Indexeintrag. Beides löst sich am selben Punkt, indem die Verknüpfungstabelle ihre Organisations- und Ortsnennungen über die Index-Kennung statt über den rohen String führt. Solange das offen ist, bleibt jede Erweiterung der Q-ID-Abdeckung auf den Indexbestand begrenzt.
