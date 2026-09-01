# Forschungsfragen M³GIM, Auswertung für Eutin 2026

Stand 2026-09-01. Datenquelle ausschließlich `data/output/m3gim.jsonld` (heutiger Pipeline-Lauf), ergänzt um `data/output/wikidata-enrichment.json` für Berufsangaben. Alle Zahlen sind aus dem Datensatz gezählt, nicht geschätzt. Auswertungsskript im Session-Scratchpad.

## Ehrlichkeits-Rahmen für den ganzen Report

Der Bestand zählt 1000 Records. Verknüpfungen, aus denen sich die Forschungsfragen beantworten lassen, tragen nur 187 davon (18,7 Prozent). Aufgeschlüsselt nach Verknüpfungsart:

| Verknüpfung am Record | Records |
|---|---|
| irgendeine auswertbare Verknüpfung | 187 |
| Datum (`rico:date`) | 638 |
| assoziierte Agenten (`hasAssociatedAgent`) | 182 |
| Ort (`hasOrHadLocation`) | 145 |
| Annotation (`hasAnnotation`) | 149 |
| Aufführung (`hasPerformance`) | 95 |
| explizite AgRelOn-Beziehung (`hasAgentRelation`) | 51 |

Jede Antwort unten steht auf höchstens diesen 187 verknüpften Records. Die restlichen 813 Records sind erfasst, aber noch nicht inhaltlich erschlossen (kein Ort, keine Rolle, kein benannter Agent) und tragen zur Beantwortung nichts bei. Der Datensatz ist damit ein erschlossener Kern von rund einem Fünftel des Nachlasses, nicht der ganze Teilnachlass.

## Frage 1a, Orte mit Auftritts- oder Aufführungsbezug

Zwei Evidenzstufen strikt getrennt. Stufe stark meint eine ausdrücklich als Aufführung, Gastspiel, Premiere, General­probe, Probe, Spielzeit oder Rahmenveranstaltung ausgewiesene Ortsrolle. Stufe schwach meint jede sonstige Verortung im Dokument (erwähnt, Vertragsort, Zielort, Absendeort, Entstehungsort, Wohnort). Ein Vertragsort belegt keinen Auftritt, sondern wo ein Vertrag geschlossen wurde, deshalb steht er in der schwachen Stufe.

Ortsnamen sind roh aus der Quelle übernommen, Dubletten aus Schreibvarianten und Fremdsprachen bleiben stehen und sind unten benannt.

### Stufe stark, ausdrücklich als Aufführungsort belegt

25 Orte tragen mindestens einen starken Auftrittsbeleg.

| Ort | belegende Dokumente | Zeitspanne |
|---|---|---|
| Bayreuth | 18 | 1951–1954 |
| München | 9 | 1952–1954 |
| Wien | 8 | 1957–1968 |
| Brüssel | 6 | 1954 |
| Salzburg | 4 | 1944–1958 |
| Paris | 3 | 1955–1956 |
| Neapel | 3 | 1952–1953 |
| Zürich | 2 | 1947 |
| Graz | 2 | 1949 |
| Stuttgart | 2 | 1957 |
| Barcelona | 2 | 1954 |
| Potsdam | 1 | 1944 |
| Italien | 1 | 1954 |
| Strasbourg | 1 | 1954 |
| Lissabon | 1 | 1953–1954 |
| Berlin | 1 | 1957 |
| Südfrankreich | 1 | 1962 |
| Norditalien | 1 | 1962 |
| Ottobeuren | 1 | 1958 |
| Wuppertal | 1 | 1953 |
| Turin | 1 | ohne Jahr |
| Prinzregententheater | 1 | ohne Jahr |
| Palais Pallavicini | 1 | 1963 |
| bayreuth (Schreibvariante) | 1 | 1953 |
| Bayeuth (Schreibfehler) | 1 | 1951 |

Bayreuth, München, Wien und Brüssel tragen den Kern der belegten Bühnentätigkeit. Der zeitliche Schwerpunkt liegt auf den frühen Fünfzigern, Wien reicht als einziger Ort bis 1968 (die Zar-und-Zimmermann-Produktion, siehe 1c). Salzburg und Potsdam mit Beleg 1944 markieren die frühe Kriegs- und Ausbildungsphase.

Schreibvarianten in der starken Stufe, die dieselbe Stadt meinen: `Bayreuth` / `bayreuth` / `Bayeuth`. `Prinzregententheater` und `Palais Pallavicini` sind Spielstätten, keine Städte, und stehen in der Quelle unaufgelöst neben der Stadtangabe.

### Stufe schwach, nur im Dokument verortet

97 Orte tragen ausschließlich schwache Belege. Die zwölf häufigsten:

| Ort | belegende Dokumente | Zeitspanne |
|---|---|---|
| München | 51 | 1952–1964 |
| Bayreuth | 39 | 1951–1963 |
| Wien | 36 | 1952–1968 |
| Zürich | 22 | 1952–1968 |
| Stuttgart | 20 | 1952–1959 |
| Zürich, Zürichbergstrasse 104 | 19 | 1956–1964 |
| Köln | 13 | 1952–1960 |
| Graz | 10 | 1952 |
| Paris | 10 | 1956–1957 |
| Berlin | 10 | 1952–1957 |
| Salzburg | 10 | ohne Jahr |
| Hamburg | 9 | 1953 |

Zürich sticht in der schwachen Stufe hervor, ohne einen einzigen starken Auftrittsbeleg über 1947 hinaus. Der Grund ist die Wohnadresse `Zürich, Zürichbergstrasse 104` mit 19 Belegen, ein Korrespondenz- und Vertragsort, kein Auftrittsort. Zürich ist im Datensatz Malaniuks Wohn- und Verwaltungsort, nicht ihre Bühne.

## Frage 1b, Partien

Aggregiert über Performance-Knoten mit StageRole. Zuordnungsregel wie vorgegeben: eine Partie zählt als Malaniuk zugeordnet, wenn `hasPerformer` sie selbst nennt oder ganz fehlt (Standalone-Rolle im Nachlass); nennt `hasPerformer` einen anderen Namen, zählt sie nicht.

Wichtige Einschränkung zur Belastbarkeit dieser Zuordnung, sie prägt die ganze Frage. Von 985 Performance-Knoten nennen nur 17 Malaniuk ausdrücklich als Interpretin. 143 nennen ausdrücklich andere Personen. 825 tragen gar keinen Performer und gelten nach der Regel als ihr zugeordnet. Diese 825 sind zum großen Teil vollständige Besetzungslisten aus Programmheften, die Malaniuk aufbewahrt hat, also alle Rollen einer Aufführung inklusive der von Kollegen gesungenen. Die Regel führt deshalb Partien wie `Hans Sachs`, `Wotan`, `Tristan`, `König Marke` als ihr zugeordnet, obwohl es Männerpartien sind, die sie nie gesungen hat. Die Liste unten ist damit korrekt nach der vereinbarten Regel gezählt, misst aber das Rollen­inventar der in ihrem Nachlass dokumentierten Aufführungen, nicht ihr persönliches Partienrepertoire. Nur die 17 performer-expliziten Belege sind personenscharf.

204 Partien fallen nach der Regel auf Malaniuk. Die häufigsten mit Belegzahl, belegten Jahren und Aufführungsorten am selben Record. Werke (`performanceOf`) sind an diesen Records nicht besetzt, die Spalte bleibt leer.

| Partie | Belege | Jahre | belegte Aufführungsorte |
|---|---|---|---|
| Brangäne | 42 | 1952–1963 | Barcelona, Bayreuth, Brüssel, Italien, Lissabon, München, Neapel, Paris, Salzburg, Turin, Wien, Zürich |
| Fricka | 24 | 1951–1956 | Bayreuth, München, Neapel, Paris |
| Tristan | 21 | 1952–1956 | Bayreuth, Brüssel, Paris, Turin |
| Isolde | 21 | 1952–1956 | Bayreuth, Brüssel, Paris, Turin |
| Kurwenal | 15 | 1952–1956 | Bayreuth, Brüssel, Italien, Paris, Turin |
| Waltraute | 14 | 1951–1953 | Bayreuth |
| Solistin | 14 | ohne Jahr | keine |
| Altsolo | 13 | 1954 | Bayreuth |
| Amneris | 12 | 1952–1956 | Bayreuth, Graz, München, Salzburg, Wien, Zürich |
| König Marke | 12 | 1952–1956 | Bayreuth, Brüssel, Paris, Turin |
| Melot | 10 | 1952–1956 | Bayreuth, Brüssel, Paris, Turin |
| Magdalena | 10 | 1951–1954 | Bayreuth, München |
| Opernsängerin | 10 | ohne Jahr | keine |
| Dorabella | 9 | 1952–1953 | keine |

Die drei belegstärksten Partien Brangäne, Fricka und Isolde/Tristan bilden den Wagner-Kern. Brangäne aus Tristan und Isolde ist mit 42 Belegen und der weitesten geografischen Streuung die am besten dokumentierte Partie, sie ist über die tatsächlich von ihr gesungenen Rollen hinaus zugleich die Rolle, deren Besetzungslisten am häufigsten im Nachlass liegen. Amneris (Aida) und Dorabella (Così) belegen das italienische Fach neben dem Wagner-Schwerpunkt. Die generischen Einträge `Solistin`, `Opernsängerin`, `1. dramatische Altistin` sind Funktionsbezeichnungen aus Verträgen und Programmen, keine Opernpartien.

Nur drei StageRoles fallen ausschließlich auf andere Performer und damit nicht auf Malaniuk: `Matelot`, `Rheintocher` (Schreibfehler), `Rheintochter`.

## Frage 1c, Kombination Ort × Partie × Jahr

Vollständige Tripel entstehen, wo an einem Record oder einer Performance ein Aufführungsort, eine Malaniuk zugeordnete Partie und ein Jahr zusammen belegt sind. 211 solcher Tripel liegen vor. Sie stammen aus wenigen dicht erschlossenen Programmheft-Records, weshalb dieselbe Einschränkung wie in 1b gilt: die Tripel enthalten die vollständigen Besetzungen dieser Aufführungen, also auch Partien anderer Sänger. Die Tabelle ist nach Jahr und Ort sortiert und hier auf die aussagekräftigen Cluster verdichtet; die Rohliste aller 211 Tripel steht im Auswertungslauf.

| Jahr | Ort | Quell-Record | Partien am Record (Auswahl) |
|---|---|---|---|
| 1951 | Bayreuth | NIM_135 2, NIM_135 13 | Meistersinger- und Ring-Besetzung, darunter Waltraute, Brünnhilde, Magdalena |
| 1951 | Bayeuth | NIM_135 2 | Woglinde, Wellgunde, Floßhilde, Erste/Zweite/Dritte Norn |
| 1952 | Bayreuth | NIM_073 33, NIM_136 95, NIM_073 19 | Brangäne, Isolde, Tristan, Fricka, König Marke, Meistersinger-Besetzung |
| 1952 | München | NIM_011 18, NIM_011 19 | Fricka |
| 1952 | Neapel | NIM_022 3 | Fricka, Grimgerde |
| 1953 | Bayreuth | NIM_073 30, NIM_004 10, NIM_137 | Ring- und Parsifal-Besetzung, Brangäne, Isolde, Waltraute |
| 1953 | Lissabon | NIM_007 4 | Brangäne, Magdalene, Zweite Dame, Aufseherin |
| 1953 | Neapel | NIM_023 3 | Brangäne |
| 1954 | Barcelona | NIM_011 5 | Brangäne |
| 1954 | Brüssel | NIM_142 22, NIM_142 27 | Tristan-Besetzung, Brangäne, Isolde, Kurwenal, König Marke |
| 1954 | München | NIM_004 13 | Meistersinger-Besetzung, Magdalena |
| 1954 | Italien | NIM_004 9 | Brangäne, Kurwenal, Marke |
| 1956 | Paris | NIM_004 19, NIM_139 128 | Tristan- und Rheingold-Besetzung, Brangäne, Isolde, Fricka |
| 1968 | Wien | NIM_007 12 | Zar-und-Zimmermann-Besetzung, Gräfin, Baron Kronthal, Gretchen |

Das dichteste Jahr ist 1953 in Bayreuth, das späteste greifbare Ereignis 1968 in Wien. Der Aufführungsatlas des Nachlasses ist im Kern ein Bayreuth-Atlas der Jahre 1951 bis 1954 mit Gastspielausläufern nach Brüssel, Paris, Neapel, Barcelona und Lissabon.

### Leerstellen-Messung

Diese Zahlen sind der eigentliche Befund für den Vortrag.

| Messung | Wert |
|---|---|
| Partien-Belege (Malaniuk zugeordnet) insgesamt | 766 |
| davon OHNE zugeordneten Ort | 512 (66,8 Prozent) |
| Aufführungsorts-Belege insgesamt | 115 |
| davon OHNE zugeordnete Partie | 57 (49,6 Prozent) |

Zwei Drittel aller Partienbelege hängen ortlos in der Luft, knapp die Hälfte aller Aufführungsorts-Belege trägt keine Partie. Die Kombination Ort × Partie × Jahr, die Frage 1c eigentlich verlangt, ist nur für den kleineren Teil des ohnehin schmalen erschlossenen Kerns überhaupt herstellbar. Wo sie gelingt, gelingt sie fast nur an Bayreuther Programmheften.

## Frage 2, Künstlerisches Netzwerk

Zwei Evidenzstufen strikt getrennt. Stufe explizit meint modellierte AgRelOn-Beziehungen mit Malaniuk als Subjekt oder Objekt. Stufe Ko-Präsenz meint Personen und Institutionen, die als assoziierte Agenten in denselben Records auftreten wie der Nachlass Malaniuks, ohne dass eine gerichtete Beziehung zu ihr modelliert wäre. Ko-Präsenz ist die schwächere Evidenz, sie belegt gemeinsames Vorkommen in einem Dokument, nicht eine belegte persönliche Beziehung.

### Stufe explizit, AgRelOn-Beziehungen

51 Records tragen AgRelOn-Beziehungen. Die Beziehungstypen sind fast durchweg `HasCorrespondent` (Briefwechsel), daneben vereinzelt `HasProfessionalContact`, `HasIsMember`, `HasEmployeeEmployer`, `IsHasPatron`. Partner mit mehr als einem Beleg:

| Partner | Belege | Beziehungstyp(en) |
|---|---|---|
| Wagner, Wieland | 8 | Korrespondent (7), beruflicher Kontakt (1) |
| Klebe, Carl-Heinz | 5 | Korrespondent |
| Müller-Kray, Hans | 5 | Korrespondent |
| Taubman, Martin Hugo | 4 | Korrespondent (3), beruflicher Kontakt (1) |
| Baasch, Dr. med. Ernst | 3 | Patron (1), Korrespondent (2) |
| Schröter, Alfred | 3 | Korrespondent |
| Ballhausen, Felix | 2 | Korrespondent, beruflicher Kontakt |
| Kühnly, Ernst | 2 | Korrespondent, beruflicher Kontakt |
| Bayerische Staatsoper | 2 | Korrespondent |
| Bayreuther Festspiele | 2 | Arbeitgeber (1), Korrespondent (1) |
| Barth, Herbert | 2 | Korrespondent |
| Taubman, Martin | 2 | beruflicher Kontakt |

Institutionen in der expliziten Stufe, getrennt von Personen: Bayerische Staatsoper, Bayreuther Festspiele (auch als Arbeitgeber), Sommerkurse Deutsches Musikinstitut für Ausländer, Universität Mozarteum Salzburg (Mitgliedschaft), Musikschule der Stadt Wien (Mitgliedschaft), Staatsoper München (Arbeitgeber), Sekretär der Tonhalle-Gesellschaft Zürich.

Wieland Wagner ist der einzige explizit modellierte Beziehungspartner mit deutlichem Gewicht und zugleich der Regisseur, der in der Ko-Präsenz vorn steht. Sein Doppelbefund über beide Evidenzstufen ist das belastbarste Netzwerksignal des Datensatzes. Die explizite Stufe ist ansonsten dünn und stark durch die Korrespondenz geprägt, sie bildet Malaniuks Briefnetz ab, nicht ihr Bühnennetz.

Dubletten aus Schreibvarianten in der expliziten Stufe: `Taubman, Martin Hugo` / `Taubman, Martin` / `Taubmann, Martin Hugo`; `Angerer, Dr. Dorothea` / `Angerer, Dorothea`; `Cox, Warren` / `Warren, Cox`; `Wirz, Karl Andreas` / `Wirz, (Dr.)`. Drei Selbsteinträge Malaniuks mit Tippfehler (`Malnaiuk`, `Maklaniuk`, `Malaniuk, Ira (Ehemann von)`) sind Datenfehler und keine Partner.

### Stufe Ko-Präsenz, gemeinsames Vorkommen in Dokumenten

420 Personen und 248 Institutionen treten als assoziierte Agenten in Malaniuks Records auf. Beruf aus dem Wikidata-Enrichment, soweit vorhanden.

Personen, die häufigsten fünfzehn:

| Person | gemeinsame Dokumente | Beruf (Wikidata) | häufigste Rolle im Dokument |
|---|---|---|---|
| Wagner, Wieland | 33 | Bühnenregisseur, Komponist, Schriftsteller | Regisseur |
| Wagner, Richard | 24 | Komponist, Librettist, Dirigent | Komponist |
| Knappertsbusch, Hans | 21 | Dirigent, Hochschullehrer | Dirigent |
| Weber, Ludwig | 18 | Opernsänger | Sänger |
| Mödl, Martha | 17 | Opernsängerin | Sängerin |
| Varnay, Astrid | 16 | Opernsängerin | Sängerin |
| Wagner, Wolfgang | 15 | (Festspielleiter) | Regisseur, Leitung |
| Windgassen, Wolfgang | 12 | Opernsänger | Sänger |
| Neidlinger, Gustav | 12 | Opernsänger | Sänger |
| Keilberth, Joseph | 11 | Dirigent | Dirigent |
| Greindl, Josef | 11 | Opernsänger | Sänger |
| Stolze, Gerhard | 11 | Opernsänger | Sänger |
| Pitz, Wilhelm | 10 | Dirigent, Chorleiter | Chorleiter |
| Vinay, Ramon | 10 | Opernsänger | Sänger |
| Uhde, Hermann | 8 | Opernsänger | Sänger |

Institutionen, die häufigsten fünfzehn, getrennt von den Personen:

| Institution | gemeinsame Dokumente | häufigste Rolle |
|---|---|---|
| Bayreuther Festspiele | 37 | Rahmenveranstaltung, Gastspiel |
| Bayerische Staatsoper | 15 | Veranstalter |
| Süddeutscher Rundfunk | 11 | Absender, Veranstalter |
| Staatsoper Wien | 10 | Veranstalter |
| Teatro di San Carlo | 9 | Veranstalter, Aufführungsort |
| Volksoper Wien | 9 | Aufführungsort, Veranstalter |
| Wiener Staatsoper | 8 | Aufführungsort |
| Münchner Festspiele | 8 | Veranstalter |
| Bayerischer Rundfunk | 7 | Veranstalter |
| Staatstheater Stuttgart | 7 | Veranstalter |
| Stadttheater Zürich | 6 | Veranstalter |
| Deutsche Oper Berlin | 6 | Veranstalter |
| Opéra Garnier | 6 | Aufführungsort |
| Nordwestdeutscher Rundfunk | 6 | Veranstalter |
| Konzertdirektion | 6 | erwähnt |

Die Ko-Präsenz zeichnet ein Bayreuth-zentriertes Ensemble- und Institutionennetz. Die häufigsten Personen sind das Bayreuther Sänger- und Dirigentenumfeld der frühen Fünfziger (Mödl, Varnay, Windgassen, Weber, Neidlinger, Greindl als Sängerkollegen; Knappertsbusch, Keilberth als Dirigenten; Wieland und Wolfgang Wagner als Regie und Leitung). Komponistennennungen (Richard Wagner, Beethoven, Strauss, Mozart, Lortzing) sind Werkzuschreibungen, kein persönliches Netzwerk, das ist beim Lesen der Tabelle zu trennen. Auf Institutionsseite dominieren die Bayreuther Festspiele deutlich, gefolgt von den festen Häusern München, Wien, Stuttgart, Zürich und einer auffälligen Dichte an Rundfunkanstalten, die auf Malaniuks Aufnahme- und Rundfunktätigkeit verweist.

Institutionsdubletten aus Schreibvarianten: `Staatsoper Wien` / `Wiener Staatsoper`; `Bayerischer Rundfunk` / `Bayrischer Rundfunk`. Sie sind hier getrennt gezählt und wären bei einer Auswertung als Kanten zusammenzuführen.

## Was die Daten heute nicht tragen

- Der auswertbare Kern umfasst 187 von 1000 Records. Vier von fünf Records tragen keine Verknüpfung, aus der sich Ort, Partie oder Netzwerk gewinnen ließe. Alle Aussagen oben beschreiben diesen Kern, nicht den Nachlass.
- Nur 17 Performance-Knoten nennen Malaniuk als Interpretin. Ihr persönliches Partienrepertoire ist personenscharf nur auf dieser Basis belegbar. Die 204 ihr zugeordneten Partien und die 211 Ort-Partie-Jahr-Tripel enthalten die vollständigen Besetzungen der aufbewahrten Programmhefte, also auch Männer- und Kollegenpartien. Ohne eine Markierung, welche Rolle in einer Besetzungsliste ihre eigene ist, lässt sich das Rolleninventar der Dokumente nicht vom Repertoire der Sängerin trennen.
- Zwei Drittel der Partienbelege (512 von 766) tragen keinen Ort, knapp die Hälfte der Aufführungsorts-Belege (57 von 115) trägt keine Partie. Die Kernkombination der ersten Forschungsfrage, Ort und Partie und Jahr gemeinsam, ist nur für eine Minderheit der Belege herstellbar und konzentriert sich auf wenige Bayreuther Programmhefte.
- `performanceOf` (das aufgeführte Werk) ist an den ausgewerteten Records durchgehend leer. Die Zuordnung Partie zu Werk läuft derzeit nur implizit über den Rollennamen, nicht über eine modellierte Werkangabe.
- Datierungen fehlen breit. 362 Records tragen kein `rico:date`, viele Orts- und Partienbelege bleiben dadurch ohne Jahr und fallen aus der Tripelbildung heraus.
- Ortsnamen liegen roh und mehrsprachig vor. Dubletten wie Bayreuth/Bayeuth, Rom/Roma, Mailand/Milano, Neapel/Napoli spreizen dieselbe Stadt über mehrere Zeilen und untertreiben die Belegzahl je Ort. Spielstätten (Prinzregententheater, Palais Pallavicini, Opéra Garnier) stehen unaufgelöst neben der Stadtangabe.
- Das Netzwerk ist in der belastbaren expliziten Stufe dünn (51 Records) und fast reines Korrespondenznetz. Das dichtere Bild der Ko-Präsenz ist die schwächere Evidenz, es belegt gemeinsames Vorkommen in einem Dokument, keine persönliche Beziehung, und mischt Werkkomponisten unter die realen Kontakte.
- Systematisch fehlen die noch nicht erschlossenen Konvolute (die 813 unverknüpften Records) und die verwaisten Bayreuther Tagesprogramme, deren Objektzeilen in der Quelle fehlen. Gerade der Bayreuth-Schwerpunkt, der die obigen Antworten trägt, ist dadurch nach oben verzerrt für das Erschlossene und zugleich lückenhaft für das noch nicht Erfasste.
