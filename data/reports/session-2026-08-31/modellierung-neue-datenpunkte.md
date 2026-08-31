# Modellierung der neu hinzugekommenen Datenpunkte

Entwurfsstufe zur Lieferung vom 2026-08-31. Gegenstand sind acht Befundgruppen aus den beiden Explorationsberichten, je Gruppe ein Befund mit Beleg, ein einfügefertiger Entwurfstext für `knowledge/data.md`, die Vokabularergänzung als Turtle im Stil von `vocab/m3gim.ttl`, die vor der Implementierung zu schreibenden xfail-Invarianten und die offenen Entscheidungen. Implementierung ist nicht Teil dieser Stufe.

## Belegbasis und Prüfweg

Gezählt wurde über die verlustfreien CSV-Ausfuhren `new-export/csv/Verknüpfungstabelle neu - Box N.csv` (Blätter Box 1, 2, 4, 5, 6, 7, 9) sowie über `new-export/csv/Box_3.csv`, `Box_8.csv`, `Box_10.csv` für die drei einzeiligen Blätter, insgesamt 5654 plus 3 Zeilen. Zelltyp und Zahlenformat wurden zusätzlich direkt in `new-export/M3GIM-Verknüpfungen.xlsx` mit openpyxl gelesen, weil der gelesene Wert allein nicht sagt, was erfasst wurde. Die Signaturspalte ist in beiden Quellen lückig und wurde je Blatt vorwärts gefüllt, wie es die Pipeline tut.

Die Fremdterme dieses Entwurfs sind am 2026-08-31 gegen die offiziellen Listen geprüft. RiC-O 1.1 über `ICA-EGAD/RiC-O`, `ontology/current-version/CSV_lists_of_components/RiC-O_1-1_list-of-object-properties.csv` und `RiC-O_1-1_list-of-classes.csv`, abgerufen über die GitHub-API. CIDOC-CRM über `cidoc-crm.org/html/cidoc_crm_v7.1.3.html`. Die geprüften Domain- und Range-Angaben stehen bei den Punkten, an denen sie tragen; neu aufzunehmende Allowlist-Einträge sind in § 9 gesammelt.

Drei Angaben des Auftragstextes haben sich an den Daten nicht bestätigt und sind unten korrigiert, die Rolle `Absender:in` als Personenrolle (§ 4.1), die Zahl der nötigen neuen Rollenbegriffe (§ 4) und die offene RiC-O-Frage zur Seiten-Hierarchie (§ 7).

## 1. Typ „Aktivität"

### Befund

Sechs Zeilen, alle im Blatt Box 2, verteilt auf zwei Signaturen.

| Blatt | XLSX-Zeile | Signatur | Folio | datenpunkt_id | name | anmerkung |
|---|---:|---|---|---|---|---|
| Box 2 | 20 | UAKUG/NIM_022 | 1_1 | 1 | Bayreuther Festspiele | |
| Box 2 | 39 | UAKUG/NIM_022 | 3 | 1 | Auftrittsreihe in Neapel | |
| Box 2 | 50 | UAKUG/NIM_023 | 1_1 | 1 | Bayreuther Festspiele 1953 | |
| Box 2 | 116 | UAKUG/NIM_023 | 4 | *(leer)* | Engagement Teatro di San Carlo | |
| Box 2 | 210 | UAKUG/NIM_023 | 11 | 1 | Engagement Theatre Municipale de Lausanne | Vertrag nicht eingehalten |
| Box 2 | 288 | UAKUG/NIM_023 | 2 | 1 | Rundfunkaufnahme Radio Italiana Rom | |

Die Rollenspalte ist in allen sechs Zeilen leer. Der `name` ist eine frei formulierte Benennung der Aktivität und kein Wert eines Index. Fünf der sechs Zeilen tragen eine Aktivitätsnummer, die Zeile 116 trägt keine, obwohl in ihrem Folio die Nummer 1 vergeben ist; das ist ein Quellfehler in einer Zelle.

Entscheidend für die Modellierung ist der Gegenbefund. Aktivitäten mit Beteiligungen existieren auch dort, wo keine `Aktivität`-Zeile steht. Box 1, UAKUG/NIM_007, Folio 4 führt die Beteiligungen `01.01` bis `01.04` ohne jede `Aktivität`-Zeile, ebenso Box 5, UAKUG/NIM_134, Folio 3_4 und 4_3. Die Identität des Vorkommnisses kommt daher aus der Kennung und nicht aus der `Aktivität`-Zeile; diese benennt ein Vorkommnis, das die Kennung bereits konstituiert.

Die Pipeline hat für den Typ keinen Pfad. Die Typ-Kaskade in `scripts/transform.py` (`add_relations_to_records`, Zweige `person`, `institution`, `ensemble`, `ort`, `werk`, `ereignis`, `rolle`, `datum`, `detail`, `spatiotemporal`, `performance`) endet ohne `else`; die sechs Zeilen fallen ohne Ausgabe und ohne Zähler durch.

### Entwurf für `data.md`

In § 4, Tabelle der Verknüpfungstypen, nach der Zeile `ereignis` einzufügen:

> | aktivität | → `m3gim-ontology:Occurrence` (Benennung des Vorkommnisses) | Zielmodell, ausstehend |
> | dokument | → `m3gim-ontology:Annotation` (Aboutness, [data-model.md](data-model.md) § 12) | ausstehend |

In § 4, am Ende des Abschnitts „Auftrittsbündelung über `datenpunkt_id`", als neuer Absatz:

> Der Verknüpfungstyp `aktivität` trägt die Benennung eines Vorkommnisses. Seine `name`-Zelle ist ein frei formulierter Titel wie „Engagement Teatro di San Carlo" und wird am Vorkommnisknoten auf `rico:name` geführt. Der Typ konstituiert das Vorkommnis nicht, weil die Aktivitätskennung das bereits tut und Aktivitäten auch ohne benennende Zeile belegt sind. Eine `aktivität`-Zeile ohne Aktivitätskennung lässt sich keinem Vorkommnis zuordnen und geht als Quellbefund ins [Datenfehler-Register](data-errors.md), ohne dass die Pipeline die Zuordnung errät. Die Rollenspalte bleibt bei diesem Typ leer; das Blatt „Typ-Rolle" bietet für ihn den Wert `Aufführung` an, der in den Daten nicht vorkommt.

### Vokabular

Die Klasse steht in E-128 spezifiziert und ist bewusst noch nicht im Vokabular; mit der Umsetzung wandert sie hinein. Der Turtle-Block ergänzt gegenüber E-128 die heute geprüfte RiC-O-Anschlusskante an `attests` und den CIDOC-Präfix.

```turtle
@prefix crm: <http://www.cidoc-crm.org/cidoc-crm/> .

m3gim-ontology:Occurrence
    a owl:Class ;
    rdfs:label "Vorkommnis"@de , "Occurrence"@en ;
    rdfs:comment "Gebündeltes Geschehen, das ein Dokument bezeugt, etwa ein Engagement, eine Auftrittsreihe, eine Rundfunkaufnahme oder ein Vertragsverhältnis. Der Knoten gruppiert die Aspektknoten eines Auftritts, also Datierung, Verortung, Werk, Partie, Betrag und beteiligte Akteure."@de ;
    rdfs:subClassOf rico:Event , crm:E7_Activity ;
    rdfs:isDefinedBy <https://dhcraft.org/m3gim/ontology> ;
    skos:editorialNote "Der Name ist weiter gefasst als Ereignis, weil nicht jedes Vorkommnis raumzeitlich ist; ein Vertrag ist eines (E-125)."@de ;
    skos:editorialNote "crm:E7_Activity ist am 2026-08-31 gegen cidoc-crm.org/html/cidoc_crm_v7.1.3.html geprueft, Oberklasse dort E5 Event, Namensraum http://www.cidoc-crm.org/cidoc-crm/."@de ;
    skos:editorialNote "Die Identitaet kommt aus (archivsignatur, folio, aktivitaetsnummer). Eine Zeile mit typ aktivitaet benennt den Knoten, konstituiert ihn aber nicht; Vorkommnisse ohne benennende Zeile sind belegt."@de .

m3gim-ontology:attests
    a owl:ObjectProperty ;
    rdfs:label "bezeugt"@de , "attests"@en ;
    rdfs:comment "Die Archivressource bezeugt ein Vorkommnis, statt es zu enthalten. Damit bleibt der Weg zu einer dokumentuebergreifenden Vorkommnis-Identitaet offen."@de ;
    rdfs:domain [ a owl:Class ; owl:unionOf ( rico:Record rico:RecordSet ) ] ;
    rdfs:range m3gim-ontology:Occurrence ;
    rdfs:subPropertyOf rico:isAssociatedWithEvent ;
    rdfs:isDefinedBy <https://dhcraft.org/m3gim/ontology> ;
    skos:editorialNote "Die Anschlusskante ist am 2026-08-31 gegen die RiC-O-1.1-Komponentenliste geprueft: rico:isAssociatedWithEvent traegt Domain Thing und Range Event, und m3gim-ontology:Occurrence ist eine Unterklasse von rico:Event."@de ;
    skos:editorialNote "Die Bezeugung folgt der CIDOC-CRM-P70-Logik (E-125)."@de .
```

### Testinvarianten

1. Mindestens 6 Knoten vom Typ `m3gim-ontology:Occurrence` tragen ein `rico:name`, das aus einer Zeile mit `typ = aktivität` stammt.
2. Mindestens 5 dieser benannten Vorkommnisse sind über `m3gim-ontology:attests` von genau einem Record erreichbar, und kein `attests`-Ziel ist ein anderer Typ als `m3gim-ontology:Occurrence`.
3. Der Ankerfall `UAKUG/NIM_022 1_1` trägt genau ein Vorkommnis mit `rico:name = "Bayreuther Festspiele"` und dessen `m3gim-ontology:xlsxSource` zeigt auf Blatt „Box 2", Zeile 20.
4. Keine Zeile mit einem Typ außerhalb der bekannten Menge verlässt die Pipeline ohne Eintrag im Verwurfszähler, geprüft an mindestens 1 gemeldeten Fall.

### Offene Entscheidungen

**A1. Umgang mit der Aktivitätszeile ohne Kennung** (Box 2, Zeile 116). Variante A bindet nicht und meldet den Fall ins Datenfehler-Register. Variante B bindet an die einzige Aktivität des Folios, wenn das Folio genau eine Aktivitätsnummer führt, was hier zutrifft. Empfehlung ist A, weil B eine Zuordnung setzt, die die Quelle nicht getroffen hat, und der Quell-Fix eine Zelle kostet. Sollte der Fall häufiger werden, ist B mit einem `dataQualityFlag` vertretbar.

## 2. Beteiligungs-IDs in `datenpunkt_id` / `data_id`

### Befund

151 gefüllte Kennungszellen, davon 75 zweistufig und 76 einstufig. Sie ergeben 20 Vorkommnisse und 17 Beteiligungen.

| Blatt | Signatur | Folio | Kennungen |
|---|---|---|---|
| Box 1 | UAKUG/NIM_003 | 1_1 | 1, 2 |
| Box 1 | UAKUG/NIM_007 | 4 | 01.01, 01.02, 01.03, 01.04 |
| Box 2 | UAKUG/NIM_022 | 1_1 | 1, 1.1, 1.2, 1.3 |
| Box 2 | UAKUG/NIM_022 | 3 | 1, 1.1, 1.2 |
| Box 2 | UAKUG/NIM_023 | 1_1 | 1, 1.1, 1.2, 1.3, 1.4 |
| Box 2 | UAKUG/NIM_023 | 1_3, 2, 4, 11 | 1 sowie 1.1, 1.2 in 2 und 4 |
| Box 5 | UAKUG/NIM_134 | 3_4 | 1, 2, 3 |
| Box 5 | UAKUG/NIM_134 | 4_3 | 1 bis 7 |

**Was die zweite Stufe trägt.** Auf der Beteiligungsebene kommen genau vier Typen vor, `Datum` (27 Zeilen), `rolle` (18), `einnahmen_währung` (15) und `werk` (15). Der Ankerfall Box 2, UAKUG/NIM_022, Folio 1_1 zeigt die Gestalt vollständig. Die Aktivität 1 trägt die Spielzeit `1952-06-22/1952-08-25`, den Veranstalter und die Gesamtvergütung 9600 DM; die Beteiligung 1.1 trägt das Werk *Die Meistersinger von Nürnberg*, die Partie *Magdalena*, die Abendgage 600 DM und sieben Aufführungsdaten, 1.2 *Tristan und Isolde* mit *Brangäne*, 800 DM und fünf Daten, 1.3 *Das Rheingold* mit *Fricka*, 700 DM und zwei Daten. Box 2, UAKUG/NIM_023, Folio 4 verschiebt das Werk auf die Aktivitätsebene und lässt auf der Beteiligungsebene nur Partie und Abendgage stehen. Konstant über alle Fälle sind Partie und Honorar, veränderlich ist die Ebene, auf der Werk und Datierung stehen.

**Die mitwirkende Partei fehlt auf der zweiten Stufe.** In keinem der 75 zweistufigen Datensätze steht eine `person`-Zeile. Die Sängerin steht auf Dokumentebene (Box 2, Zeile 2, `person` / `Malaniuk, Ira` / `sänger:in`). E-128 beschreibt die `Participation` als Bindung „genau eine mitwirkende Partei mit ihrer Funktion und, bei Sänger:innen, ihrer gesungenen Partie"; die Quelle materialisiert davon Partie und Honorar und lässt die Partei implizit. Das ist die tragende Abweichung des Ist-Standes vom Zielmodell.

**Die Granularität der ersten Stufe ist zwischen den Blättern uneinheitlich.** In Box 2 bündelt die Ganzzahl ein Engagement oder eine Festspielteilnahme, unter der die einzelnen Produktionen als zweite Stufe stehen. In Box 5, UAKUG/NIM_134, Folio 3_4 bündelt dieselbe Ganzzahl bereits eine einzelne Produktion samt Besetzung, dort mit 15 `person`-Zeilen auf Aktivitätsebene (Komponist, Regisseur, vier Sänger:innen bei Kennung 1). In Folio 4_3 bündeln die Kennungen 1 bis 7 je ein Werk mit seinen Aufführungsdaten, während die Festwoche als `ereignis` auf Dokumentebene steht.

**Der Excel-Verlust und seine Umkehrung.** Die Kennungszellen der zweiten Stufe sind Datumszellen. `Box 2!C6` trägt `datetime(2026, 1, 1)` mit Zahlenformat `d.m`, `Box 2!C13` trägt `datetime(2026, 2, 1)` mit demselben Format, `Box 1!C2374` trägt `datetime(2026, 1, 1)` mit `dd.mm`. Der angezeigte Wert steht als Tag und Monat in der Zelle, also `(Aktivität, Beteiligung) = (Tag, Monat)`. Die CSV-Ausfuhr zeigt an denselben Stellen `1.1`, `1.2` und `01.01`, was die Ableitung bestätigt. Das Jahr 2026 ist die Auffüllung der Tabellenkalkulation und ohne Aussage.

Die Pipeline zerstört beide Stufen. `scripts/transform.py` Zeile 1229 bis 1236 setzt `datenpunkt_id = int(float(dp_raw))`; auf dem CSV-Pfad fallen `01.01` bis `01.04` damit auf 1 zusammen, auf dem XLSX-Pfad wirft `float()` auf einem `datetime` und der Fallback legt die Zeichenkette `"2026-01-01 00:00:00"` in `m3gim-ontology:dataPointId`.

### Entwurf für `data.md`

§ 4, den Absatz „Seit E-127 ist diese Identität zweistufig verfeinert …" ersetzen durch:

> Seit E-127 ist diese Identität zweistufig. Eine Ganzzahl bündelt die Aktivität, eine Dezimale die einzelne Beteiligung daran. Beide Stufen stehen in derselben Zelle, geschrieben als `1`, `1.1` oder `01.01`. Die Erfassung schreibt die Stufen in wechselnder Stellenzahl; für die Auswertung gilt allein das Zahlenpaar.
>
> Die Zuordnung eines Aspektknotens folgt der Kennung seiner eigenen Zeile und nicht dem Typ. Eine leere Kennung führt den Knoten an das Dokument, eine Ganzzahl an das Vorkommnis `(archivsignatur, folio, aktivität)`, eine Dezimale an die Beteiligung `(vorkommnis, beteiligungsnummer)`. Damit hängt jeder Knoten dort, wo die Quelle ihn hingeschrieben hat, und keine Ebene wird aus dem Typ erschlossen.
>
> Die zweite Stufe trägt im Bestand durchgängig die gesungene Partie und das zugehörige Honorar, dazu je nach Fall das Werk und die Aufführungsdaten. Die mitwirkende Partei trägt sie nicht; diese steht auf Dokumentebene. Eine Beteiligung erhält deshalb nur dann `m3gim-ontology:performedBy`, wenn eine `person`-Zeile die Beteiligungskennung selbst führt. Eine Person von der Dokumentebene an eine Beteiligung zu binden wäre eine Zuordnung, die die Quelle nicht getroffen hat.
>
> Die Bündelungstiefe der ersten Stufe ist zwischen den Erfassungsblättern uneinheitlich. Ein Blatt bündelt darunter das Engagement und darüber hinaus die einzelne Produktion als zweite Stufe, ein anderes bündelt die Produktion bereits auf der ersten Stufe und führt darunter keine zweite. Das Modell nimmt beide Tiefen auf, weil die Ebene aus der Kennung folgt; welche Tiefe erfasst werden soll, ist eine Erfassungsfrage und steht in [data-entry-guidelines.md](data-entry-guidelines.md).

§ 17, Tabelle der kompensierten Eigenheiten, zwei Zeilen ergänzen:

> | Kennungszelle als Kalenderdatum gelesen (`1.1` wird `datetime(2026,1,1)` mit Zahlenformat `d.m`) | Workaround | Kennung wird als `(Tag, Monat)` zurückgelesen, wenn das Zahlenformat auf `d`/`m` passt; Quell-Fix ist die Textformatierung der Spalte |
> | Folio-Zelle als Kalenderdatum gelesen (`15-1` wird `datetime(2026,1,15)` mit Zahlenformat `d-m`) | Workaround | Folio wird als `Tag_Monat` zurückgelesen; ohne das laufen 46 Verknüpfungszeilen auf eine nicht existierende Objekt-ID |

### Vokabular

```turtle
m3gim-ontology:Participation
    a owl:Class ;
    rdfs:label "Beteiligung"@de , "Participation"@en ;
    rdfs:comment "Ein Besetzungsposten innerhalb eines Vorkommnisses, im Bestand die gesungene Partie mit dem zugehoerigen Honorar und, je nach Erfassung, dem Werk und den Auffuehrungsdaten."@de ;
    rdfs:isDefinedBy <https://dhcraft.org/m3gim/ontology> ;
    skos:editorialNote "Die Identitaet kommt aus (vorkommnis, beteiligungsnummer), also aus der zweiten Stufe der Erfassungskennung."@de ;
    skos:editorialNote "Die mitwirkende Partei steht im Bestand auf Dokumentebene und nicht an der Beteiligung. m3gim-ontology:performedBy bleibt deshalb bis auf Weiteres unbefuellt; eine Bindung aus der Dokumentebene waere eine erfundene Zuordnung. Der Term traegt darum den Marker unused."@de .

m3gim-ontology:hasParticipation
    a owl:ObjectProperty ;
    rdfs:label "hat Beteiligung"@de , "has participation"@en ;
    rdfs:comment "Bindet einen Besetzungsposten an das Vorkommnis oder die Auffuehrung, zu der er gehoert."@de ;
    rdfs:domain [ a owl:Class ; owl:unionOf ( m3gim-ontology:Occurrence m3gim-ontology:Performance ) ] ;
    rdfs:range m3gim-ontology:Participation ;
    rdfs:isDefinedBy <https://dhcraft.org/m3gim/ontology> .

m3gim-ontology:performedBy
    a owl:ObjectProperty ;
    rdfs:label "ausgefuehrt von"@de , "performed by"@en ;
    rdfs:comment "Mitwirkende Partei einer Beteiligung oder eines Vorkommnisses."@de ;
    rdfs:domain [ a owl:Class ; owl:unionOf ( m3gim-ontology:Participation m3gim-ontology:Occurrence ) ] ;
    rdfs:range [ a owl:Class ; owl:unionOf ( rico:Person rico:CorporateBody rico:Group ) ] ;
    rdfs:subPropertyOf rico:hasOrHadParticipant ;
    rdfs:isDefinedBy <https://dhcraft.org/m3gim/ontology> ;
    skos:editorialNote "Die Anschlusskante ist am 2026-08-31 gegen die RiC-O-1.1-Komponentenliste geprueft: rico:hasOrHadParticipant traegt Domain Event und Range Thing, und m3gim-ontology:Occurrence ist eine Unterklasse von rico:Event."@de ;
    skos:editorialNote "Die Domain umfasst das Vorkommnis, weil ein Erfassungsblatt die Besetzung auf der Aktivitaetsebene fuehrt und ein anderes sie gar nicht auf Kennungsebene fuehrt."@de .

m3gim-ontology:playsStageRole
    a owl:ObjectProperty ;
    rdfs:label "singt Partie"@de , "plays stage role"@en ;
    rdfs:comment "Die in der Beteiligung besetzte Partie."@de ;
    rdfs:domain m3gim-ontology:Participation ;
    rdfs:range m3gim-ontology:StageRole ;
    rdfs:isDefinedBy <https://dhcraft.org/m3gim/ontology> ;
    skos:editorialNote "Die Partie bleibt ein geteilter Konzeptknoten, damit die Frage nach allen Besetzungen einer Partie beantwortbar bleibt; die konkrete Besetzung sitzt hier (E-128)."@de .

m3gim-ontology:hasFee
    a owl:ObjectProperty ;
    rdfs:label "hat Honorar"@de , "has fee"@en ;
    rdfs:comment "Honorar, das an einer Beteiligung haengt. Veranstaltungsfinanzen bleiben ueber m3gim-ontology:hasDetail am Vorkommnis."@de ;
    rdfs:domain m3gim-ontology:Participation ;
    rdfs:range m3gim-ontology:Annotation ;
    rdfs:subPropertyOf m3gim-ontology:hasAnnotation ;
    rdfs:isDefinedBy <https://dhcraft.org/m3gim/ontology> .

m3gim-ontology:activityNumber
    a owl:DatatypeProperty ;
    rdfs:label "Aktivitaetsnummer"@de , "activity number"@en ;
    rdfs:comment "Erste Stufe der Erfassungskennung, die Nummer der Aktivitaet innerhalb des Folios."@de ;
    rdfs:domain m3gim-ontology:Occurrence ;
    rdfs:range xsd:integer ;
    rdfs:isDefinedBy <https://dhcraft.org/m3gim/ontology> .

m3gim-ontology:participationNumber
    a owl:DatatypeProperty ;
    rdfs:label "Beteiligungsnummer"@de , "participation number"@en ;
    rdfs:comment "Zweite Stufe der Erfassungskennung, die Nummer der Beteiligung innerhalb der Aktivitaet."@de ;
    rdfs:domain m3gim-ontology:Participation ;
    rdfs:range xsd:integer ;
    rdfs:isDefinedBy <https://dhcraft.org/m3gim/ontology> .
```

`m3gim-ontology:dataPointId` wird mit der Umstellung gegenstandslos und bekommt entweder eine `skos:editorialNote` mit dem Marker `unused:` oder wird gestrichen. Der Term steht heute im Container der technischen Herkunft, obwohl er seit E-125 eine fachliche Bündelung trägt; die beiden neuen Zahlproperties stehen dort, wo die Bündelung hingehört, am Vorkommnis und an der Beteiligung.

### Testinvarianten

1. Mindestens 20 Knoten vom Typ `m3gim-ontology:Occurrence` tragen eine `m3gim-ontology:activityNumber`, und keiner trägt eine Zeichenkette der Form `20\d\d-\d\d-\d\d`.
2. Mindestens 17 Knoten vom Typ `m3gim-ontology:Participation` tragen eine `m3gim-ontology:participationNumber`, und die Menge ihrer Nummern innerhalb eines Vorkommnisses ist lückenlos ab 1.
3. Der Ankerfall `UAKUG/NIM_022 1_1` trägt genau ein Vorkommnis mit genau 3 Beteiligungen, deren Partien `Magdalena`, `Brangäne` und `Fricka` sind und deren Honorare 600, 800 und 700 DM betragen.
4. Der Ankerfall `UAKUG/NIM_007 4` trägt genau 4 Beteiligungen mit den Nummern 1 bis 4, obwohl die Quelle sie als `01.01` bis `01.04` schreibt und die XLSX-Zelle ein Datum führt.
5. Mindestens 15 Beteiligungen tragen ein `m3gim-ontology:hasFee`, und kein Honorarknoten hängt zugleich über `m3gim-ontology:hasDetail` am Dokument.
6. Kein Knoten vom Typ `m3gim-ontology:Participation` trägt ein `m3gim-ontology:performedBy`, solange keine `person`-Zeile eine zweistufige Kennung führt; der Test hält damit die Nichtbindung fest und schlägt an, sobald die Quelle die Bindung liefert.

### Offene Entscheidungen

**B1. Wohin das Werk gehört, wenn es an der Beteiligung steht.** In 15 Zeilen trägt eine Beteiligung ein `werk`. Variante A erweitert die Domain von `m3gim-ontology:performanceOf` auf `Participation`, sodass die Beteiligung das Werk direkt trägt. Variante B legt eine eigene Property an. `rico:hasOrHadSubject` scheidet aus, weil seine Domain laut Komponentenliste `RecordResource` ist und eine Beteiligung keine ist. Empfehlung ist A, weil `performanceOf` bereits genau diese Aussage macht und eine zweite Property daneben dieselbe Sache zweimal benennt.

**B2. Ob je Aktivität eine `m3gim-ontology:Performance` gebaut wird.** E-128 sieht sie vor. Die Daten liefern das Werk je nach Fall an der Aktivität oder an der Beteiligung, sodass eine Aufführung je Aktivität in den Fällen mit drei Werken drei Werke tragen müsste. Variante A verzichtet in der ersten Umsetzungsrunde auf die Aufführungsebene und hängt die Beteiligungen direkt an das Vorkommnis, wozu die in E-128 vorgesehene Domain von `hasParticipation` bereits passt. Variante B baut sie und akzeptiert die Mehrfachbelegung. Empfehlung ist A, weil die Ebene im Ist-Stand keine Aussage trägt, die das Vorkommnis nicht schon trägt, und ihr Nachziehen später ein Einhängen ist.

**B3. Die uneinheitliche Bündelungstiefe.** Zu klären mit dem Erschließungsteam, ob die erste Stufe das Engagement oder die Produktion bündelt. Das Modell trägt beide Lesarten; Auswertungen über Vorkommnisse hinweg zählen mit der heutigen Erfassung Ungleiches.

**B4. Rückleseregel oder Quell-Fix.** Variante A liest die Kennung aus `(Tag, Monat)` zurück und dokumentiert das als Workaround. Variante B wartet auf die Textformatierung der Spalte in der Quelle. Empfehlung ist A mit gleichzeitiger Meldung an das Erschließungsteam, weil die Rückleseregel bei Aktivitätsnummern über 31 oder Beteiligungsnummern über 12 bricht und deshalb ein Übergang bleibt.

## 3. Typ „dokument"

### Befund

27 Zeilen, davon 24 in Box 1 unter `UAKUG/NIM_005` Folio 15, je eine in Box 6 (Zeile 385, `UAKUG/NIM_142` Folio 27, `L'oeuvre d'art vivant`), Box 9 (Zeile 13, `UAKUG/NIM_168` Folio 2_2, `Festspielbuch 1951`) und Box 3 (Zeile 2, `UAKUG/NIM_024`, ohne `name` und ohne Rolle). Die Rolle ist in allen 26 benannten Zeilen `erwähnt`.

Die `name`-Werte zerfallen in zwei Sorten. Die überwiegende Sorte sind Gattungsbezeichnungen, die das Dokumenttypen-Vokabular kennt oder kennen könnte, `Vertrag`, `Verträge`, `Dienstvertrag`, `Programm`, `Programme`, `Kritiken`, `Ausweis`, `Gewerkschaftsausweis`, `Gewerkschaftsausweise`, `Bestätigung`, `Übereinkommen`, `Korrespondenz`, `Brief`. Die zweite Sorte sind Titel konkreter Publikationen, `L'oeuvre d'art vivant` und `Festspielbuch 1951`; sie sind keine Dokumenttypen.

Der Typ steht weder in der `data.md`-§-4-Tabelle noch im Blatt „Typ-Rolle" des Workbooks. `data-model.md` § 12 hat die Modellierung bereits festgelegt, ohne dass die Pipeline sie umsetzt; die Kaskade hat keinen Zweig `dokument`, die 27 Zeilen fallen still durch.

### Entwurf für `data.md`

Die Tabellenzeile für § 4 steht oben in § 1 dieses Berichts. Zusätzlich in § 5, als neue Untersektion nach „Bühnenrollen (Typ `rolle`)":

> ### Dokumentrollen (Typ `dokument`)
>
> Der Typ nennt ein Dokument, von dem der Record handelt, ohne dass dieses Dokument im Bestand liegt. Er beschreibt Aboutness und nicht Enthaltensein; die Modellierung steht in [data-model.md](data-model.md) § 12.
>
> | Rolle | Status | Bemerkung |
> |---|---|---|
> | erwähnt | ● | einzige belegte Rolle des Typs |
>
> Die `name`-Werte des Typs sind teils Gattungsbezeichnungen, die im Dokumenttypen-Vokabular auflösen, teils Titel konkreter Publikationen, die dort keine Entsprechung haben. Ein Wert, der in `DOKUMENTTYP_TO_DFT` nicht auflöst, bleibt als Literal stehen und trägt das Flag `dokumenttyp-unbekannt`; ein Wert wird nicht auf den nächstliegenden Begriff gezwungen.

### Vokabular

```turtle
m3gim-ontology:mentionsFormType
    a owl:ObjectProperty ;
    rdfs:label "nennt Dokumenttyp"@de , "mentions form type"@en ;
    rdfs:comment "Verweist von einer Annotation auf den Dokumenttyp, den das Dokument nennt, ohne ihn zu enthalten. Traegt Aboutness und nicht die Form der beschriebenen Einheit."@de ;
    rdfs:domain m3gim-ontology:Annotation ;
    rdfs:range skos:Concept ;
    rdfs:isDefinedBy <https://dhcraft.org/m3gim/ontology> ;
    skos:editorialNote "rico:hasDocumentaryFormType scheidet hier aus. Seine Domain ist laut RiC-O-1.1-Komponentenliste (geprueft 2026-08-31) Record und RecordPart; eine Annotation ist keines von beidem, und der geteilte Concept-Knoten darf keine record-spezifischen Daten aufnehmen (data-model.md § 12)."@de .
```

Der Wertevorrat von `m3gim-ontology:dataQualityFlag` wächst um `dokumenttyp-unbekannt`. Er steht heute als Literalmenge ohne Schema; das bleibt so, bis die in `data-model.md` § 7 offene Frage nach einem eigenen Schema entschieden ist.

### Testinvarianten

1. Mindestens 26 Annotationsknoten stammen aus Zeilen mit `typ = dokument` und tragen die Rolle `m3gim-vocab:mentioned`.
2. Mindestens 20 davon tragen ein `m3gim-ontology:mentionsFormType` auf ein Concept des Schemas `m3gim-vocab:documentaryFormTypes`.
3. Mindestens 2 davon tragen kein `mentionsFormType`, sondern den Rohwert plus das Flag `dokumenttyp-unbekannt`, belegt an `L'oeuvre d'art vivant` und `Festspielbuch 1951`.
4. Kein Concept des Dokumenttypen-Vokabulars trägt eine Property, die aus einer `dokument`-Zeile stammt, geprüft über die Menge der Properties an allen Concept-Knoten.

### Offene Entscheidungen

**C1. Trägerform der Aboutness.** Variante A ist der Annotationsknoten mit `mentionsFormType`, wie oben entworfen. Variante B ist `rico:scopeAndContent` am Record, dessen Domain `RecordResource` ist und damit passt; sie führt die 24 Nennungen von `UAKUG/NIM_005` Folio 15 zu einer Zeichenkette zusammen und verliert Zählbarkeit und Quellzellenadresse je Nennung. Empfehlung ist A.

**C2. Die zweite Sorte von Werten.** Ob eine genannte Publikation eine eigene Entität bekommt, etwa als `rico:RecordResource` außerhalb des Bestands, ist offen. Der Entwurf lässt sie bewusst als Literal mit Flag stehen, weil zwei Belege für eine Klassenentscheidung zu dünn sind.

**C3. Die Zeile ohne `name`** (Box 3, Zeile 2, `UAKUG/NIM_024`). Sie trägt einen Typ und sonst nichts und geht als Quellbefund ins Register, ohne modelliert zu werden.

## 4. Neue Rollenwerte

### Befund und Korrektur des Auftragstextes

Neun Werte waren zu prüfen, fünf brauchen einen neuen Begriff.

| Wert der Quelle | Zeilen | typ-Kontext | Befund |
|---|---:|---|---|
| `Absender:in` | 18 | `institution` (18 von 18) | löst nach Normalisierung auf `absender` und trifft den bestehenden `m3gim-vocab:sender`; **kein neuer Begriff** |
| `Aufnahmedatum` | 5 | `Datum` | bezeichnet denselben Aspekt wie `Aufnahme` am Werk, belegt auf fünf gemeinsamen Folios; **kein neuer Begriff**, `skos:altLabel` an `m3gim-vocab:recording` |
| `Unterschriftsdatum` | 6 | `Datum` | neuer Begriff |
| `Reisedatum` | 1 | `Datum` | neuer Begriff |
| `Abspielhonorar` | 1 | `einnahmen_währung` | neuer Begriff |
| `Gage` | 1 | `summe_währung` | neuer Begriff |
| `summe` | 1 | `summe_währung` | neuer Begriff, siehe D3 |
| `Auftragsdatum` | 0 | nur Blatt „Typ-Rolle" | **keine Datendeckung**, nicht aufnehmen |
| `Lehrtätigkeit` | 0 | nur Blatt „Typ-Rolle" | **keine Datendeckung**, nicht aufnehmen |

**Zu `Absender:in`.** Der Auftragstext führt den Wert als Personenrolle. Alle 18 Belege stehen an `typ = institution`, und das Blatt „Typ-Rolle" listet ihn ebenfalls dort. Beleg Box 2, Zeile 156, `UAKUG/NIM_023` Folio 7, `institution` / `Nordwestdeutscher Rundfunk` / `Absender:in`. `normalize_role` streift `:in` ab, `attach_role` findet `absender` als `skos:prefLabel` von `m3gim-vocab:sender`. Zu tun ist eine Tabellenzeile in `data.md` § 5 und nichts am Vokabular.

**Zu `Aufnahmedatum`.** Der Wert steht auf fünf Folios zusammen mit `Aufnahme` am Werk, etwa Box 2, `UAKUG/NIM_023` Folio 7, Zeile 154 `Datum` / `1953-03-19/1953-03-24` / `Aufnahmedatum` und Zeile 157 `werk` / `Der Troubadour` / `Aufnahme`. Das ist genau das Muster, das E-139 für `absendedatum` und `absendeort` zu `dispatch` zusammengeführt hat, weil der Aspekt in der Wertproperty steht und der Rollenname ihn nur wiederholt. Die Quellschreibung bleibt über `m3gim-ontology:derivedFromRole` erhalten.

**Zu `Unterschriftsdatum` gegen `ausstellungsdatum`.** Beide kommen auf keinem gemeinsamen Folio vor, sodass die Daten die Unterscheidung nicht erzwingen. Sie stützen sie auch nicht als Zusammenfall. Für den eigenen Begriff spricht, dass `unterzeichner` bereits als Akteursrolle geführt wird und die Datierung der Unterzeichnung deren Gegenstück ist. Belege Box 2, Zeilen 35, 36, 67, 87, 104, 115.

**Zu `Abspielhonorar` gegen `rundfunkshonorar`.** Der eine Beleg steht in Box 2, Zeile 336, `UAKUG/NIM_016` Folio 13, ein Schreiben des Süddeutschen Rundfunks über 125 DM für die Ausstrahlung einer vorhandenen Requiem-Aufnahme (Zeile 335, `werk` / `Requiem` / `Ausstrahlung`). Die drei entfallenen `Rundfunkshonorar`-Belege lagen dagegen an Aufnahmeverträgen mit dem Nordwestdeutschen Rundfunk (`UAKUG/NIM_023` Folios 7, 8, 10) und honorierten die Herstellung der Aufnahme. Beides sind verschiedene Akte.

**Zu `Gage` gegen `abendgage`.** Beide stehen im selben Folio nebeneinander mit verschiedenen Werten. Box 2, `UAKUG/NIM_023` Folio 4, Zeile 125 trägt auf Aktivitätsebene `summe_währung` / `280.000, Lire` / `Gage` mit der Anmerkung „3x Götterdämmerung (je 280.000)", die Zeilen 126 und 127 tragen auf Beteiligungsebene `einnahmen_währung` / `200.000, Lire` und `80.000, Lire` / `abendgage`. Die `Gage` ist die Summe der Abendgagen eines Abends über beide Partien. Ein Zusammenfall würde genau diese Aufteilung tilgen.

### Entwurf für `data.md`

§ 5, Tabelle „Institutionenrollen", nach `empfänger` einfügen:

> | absender | ● ★ | Korrespondenzrolle auch bei Institutionen, häufig bei Rundfunkanstalten |

§ 5, Tabelle „Datumsrollen", drei Zeilen ergänzen und eine Bemerkung schärfen:

> | unterschriftsdatum | ● ★ | Datierung der Unterzeichnung, Gegenstück zur Akteursrolle `unterzeichner` |
> | reisedatum | ● ★ | Reisemobilität ohne Richtungsangabe, gegen `abreisedatum` abzugrenzen |
> | aufnahmedatum | ● ★ | fällt mit der Werkrolle `aufnahme` auf einen Begriff zusammen, Ursprungswert in `derivedFromRole` |

§ 5, Tabelle „Finanzrollen", drei Zeilen ergänzen und die Bemerkung zu `rundfunkhonorar` schärfen:

> | abspielhonorar | ● ★ | Vergütung für die Ausstrahlung einer vorhandenen Aufnahme, gegen `rundfunkhonorar` (Herstellung) abzugrenzen |
> | gage | ● ★ | Abendsumme über mehrere Partien, gegen `abendgage` (je Partie) abzugrenzen |
> | summe | ● ★ | Rolle wiederholt das Detailfeld `summe`, siehe D3 |
> | rundfunkhonorar | ○ | seit der Lieferung 2026-08-31 nicht mehr belegt, Quelle führt die Belege jetzt als `gesamtvergütung` |

§ 5, am Ende der Untersektion „Bezugsebene und Rang einer Datierung", als neuer Absatz:

> Ein neu aufgenommener Rollenbegriff bekommt einen Rang am Ende der bestehenden Reihe. Die Reihenfolge der bereits vergebenen Ränge bleibt unverändert, weil eine Umsortierung eine Datierung verschiebt, die heute ankert. Eine Umsortierung ist eine eigene Entscheidung und keine Nebenwirkung einer Ergänzung.

### Vokabular

```turtle
m3gim-vocab:signatureDate a skos:Concept ;
    skos:prefLabel "unterschriftsdatum"@de ;
    skos:altLabel "signature date"@en ;
    skos:definition "Datum, an dem ein Vertrag oder eine Erklaerung unterzeichnet wurde."@de ;
    m3gim-ontology:datingScope m3gim-vocab:objectDating ;
    m3gim-ontology:datingRank 23 ;
    skos:editorialNote "Gegenstueck zur Akteursrolle m3gim-vocab:signatory. Ob der Begriff mit m3gim-vocab:issueDate zusammenfaellt, ist offen; die beiden kommen im Bestand auf keinem gemeinsamen Folio vor."@de ;
    skos:inScheme m3gim-vocab:annotationRoles .

m3gim-vocab:travelDate a skos:Concept ;
    skos:prefLabel "reisedatum"@de ;
    skos:altLabel "travel date"@en ;
    skos:definition "Datum einer Reisebewegung ohne Angabe der Richtung, also weder Abreise noch Ankunft am Zielort ausdruecklich benannt."@de ;
    m3gim-ontology:datingScope m3gim-vocab:attestedDating ;
    m3gim-ontology:datingRank 24 ;
    skos:editorialNote "Ein einziger Beleg, eine Rueckkehr aus dem Urlaub. Gegen m3gim-vocab:departure abzugrenzen, das die Abreise benennt."@de ;
    skos:inScheme m3gim-vocab:annotationRoles .

m3gim-vocab:playbackFee a skos:Concept ;
    skos:prefLabel "abspielhonorar"@de ;
    skos:altLabel "playback fee"@en ;
    skos:definition "Verguetung fuer die Ausstrahlung einer bereits vorhandenen Aufnahme."@de ;
    skos:editorialNote "Gegen m3gim-vocab:broadcastFee abzugrenzen, das die Herstellung einer Rundfunkaufnahme honoriert. Ein Zusammenfall wuerde zwei verschiedene Akte in einem Begriff fuehren."@de ;
    skos:inScheme m3gim-vocab:financialItemTypes .

m3gim-vocab:fee a skos:Concept ;
    skos:prefLabel "gage"@de ;
    skos:altLabel "fee"@en ;
    skos:definition "Verguetung eines Auftrittsabends, gegebenenfalls ueber mehrere Partien summiert."@de ;
    skos:editorialNote "Gegen m3gim-vocab:performanceFee abzugrenzen, das die Abendgage je Partie benennt. Beide stehen im Bestand im selben Folio mit verschiedenen Betraegen nebeneinander (UAKUG/NIM_023 Folio 4)."@de ;
    skos:inScheme m3gim-vocab:financialItemTypes .

m3gim-vocab:total a skos:Concept ;
    skos:prefLabel "summe"@de ;
    skos:altLabel "total"@en ;
    skos:definition "Zusammenfassender Betrag ohne Angabe der Zahlungsart."@de ;
    skos:editorialNote "Der Wert wiederholt in der Rollenspalte, was m3gim-ontology:detailField bereits traegt. Er steht hier, damit die Rollenproperty kein Literal ausserhalb des Vokabulars fuehren muss; ob die Quelle ihn weiter vergeben soll, ist mit dem Erschliessungsteam zu klaeren."@de ;
    skos:inScheme m3gim-vocab:financialItemTypes .
```

An `m3gim-vocab:recording` ist ein deutsches Alternativlabel zu ergänzen, damit `load_role_concepts` die Quellschreibung auflöst:

```turtle
m3gim-vocab:recording
    skos:altLabel "aufnahmedatum"@de .
```

### Testinvarianten

1. Mindestens 18 Entitätsknoten vom Typ `rico:CorporateBody` tragen die Rolle `m3gim-vocab:sender`, und keiner von ihnen trägt statt eines Concept-Verweises das Literal `absender`.
2. Mindestens 6 Annotationsknoten tragen die Rolle `m3gim-vocab:signatureDate`, und jeder von ihnen trägt `datingScope = objectDating` und `datingRank = 23`.
3. Mindestens 5 Annotationsknoten tragen die Rolle `m3gim-vocab:recording` mit `m3gim-ontology:derivedFromRole = "aufnahmedatum"`.
4. Mindestens je 1 Knoten trägt `m3gim-vocab:travelDate`, `m3gim-vocab:playbackFee`, `m3gim-vocab:fee` und `m3gim-vocab:total`.
5. Kein Rollenwert der Quelle landet als Literal in `m3gim-ontology:role`, geprüft über alle `role`-Werte des Datensatzes; die einzige zugelassene Ausnahme ist im Test namentlich zu führen und ist nach dieser Lieferung leer.
6. Die vergebenen `datingRank`-Werte sind über alle Concepts hinweg paarweise verschieden und lückenlos von 0 aufwärts, geprüft an mindestens 25 Begriffen.
7. Jeder `(typ, rolle)`-Wert der Quelle, den das Blatt „Typ-Rolle" nicht führt, wird gezählt und im Validierungsreport genannt, geprüft an mindestens 60 gemeldeten Kombinationen.

### Offene Entscheidungen

**D1. `unterschriftsdatum` gegen `ausstellungsdatum`.** Variante A führt beide getrennt, wie oben entworfen. Variante B führt `unterschriftsdatum` als Alternativlabel auf `issueDate`. Empfehlung ist A, weil Unterzeichnung und Ausstellung verschiedene Akte sind und die Quelle für beide eine Rolle vergibt. Die Bestätigung gehört ins Erschließungsteam.

**D2. `abspielhonorar` gegen `rundfunkhonorar`.** Variante A führt beide getrennt, wie oben entworfen, und `broadcastFee` wird zum unbelegten Begriff (§ 5). Variante B führt `abspielhonorar` als Alternativlabel auf `broadcastFee` und rettet damit dessen Belegung. Empfehlung ist A, weil Herstellung und Ausstrahlung verschiedene Akte sind; die Belegungsfrage ist über die `unused:`-Notiz zu lösen und nicht über einen inhaltlichen Zusammenfall.

**D3. Die Rolle `summe`.** Variante A nimmt `m3gim-vocab:total` auf, wie oben entworfen. Variante B behandelt sie wie den Vertragsstatus und führt sie bewusst nicht als Begriff, wodurch `attach_role` das Literal `summe` in die Rollenproperty schreibt. Empfehlung ist A, weil ein Literal in der Rollenproperty die schlechtere der beiden Folgen ist und ein Begriff wenig kostet. Die eigentliche Klärung ist eine Erfassungsfrage.

**D4. Die beiden Werte ohne Datendeckung.** `Auftragsdatum` und `Lehrtätigkeit` stehen im Blatt „Typ-Rolle" und in keiner Datenzeile. Sie werden nach der Leitplanke, erst die Datendeckung zu prüfen und nur Gedecktes zu bauen, nicht ins Vokabular genommen. Ihr Auftreten in der Wertliste geht als Hinweis an das Erschließungsteam, weil eine angebotene und nie vergebene Auswahl entweder gebraucht wird oder verschwinden sollte.

## 5. Entfallene Belege

### Befund

Drei Rollenwerte der Vorlieferung sind auf null gefallen. Alle drei sind zeilengenau nachverfolgt.

**`nicht eingehalten`, 9 Zeilen auf 0.** Der Vertragsstatus steht jetzt in der Anmerkungsspalte als `Vertrag nicht eingehalten`, und der Block ist von 9 auf 12 Zeilen gewachsen (Box 2, Zeilen 199 bis 210, `UAKUG/NIM_023` Folio 11). Die betroffenen Zeilen tragen nun eine echte Rolle. Box_02 Zeile 200 führte alt `institution` / `Théâtre municipal de Lausanne` / `nicht eingehalten`, neu Box 2 Zeile 200 führt dieselbe Zeile mit `veranstalter:in` und der Anmerkung. Die Anmerkung steht auch an der `Aktivität`-Zeile 210, `Engagement Theatre Municipale de Lausanne`. Damit hat die Quelle die Frage beantwortet, die `data-model.md` § 11 offengehalten hat; der Status ist aus der Rollenspalte heraus und hängt an einer benennbaren Sache.

Folgen im Code und im Vokabular. `CONTRACT_STATUS_ROLES` in `scripts/transform.py` greift nie mehr. `m3gim-vocab:unfulfilledDating` verliert seinen einzigen Anker, ebenso der in E-150 beschlossene benannte Einzeleintrag für den Vertragsstatus.

**`Rundfunkshonorar`, 3 Zeilen auf 0.** Alle drei Belege sind auf `Gesamtvergütung` umgeschrieben, bei identischer Signatur, identischem Folio und identischem Betrag. Box_02 Zeile 159 (`UAKUG/NIM_023` Folio 7, `1.200, DM`), Zeile 166 (Folio 8, `800, DM`), Zeile 195 (Folio 10, `1500, DM`). Der Verlust ist real, weil `gesamtvergütung` an denselben Folios auch die Summe aus Honorar und Reisekosten bezeichnet; Box 2, Folio 8 führt jetzt zweimal `Gesamtvergütung`, einmal 800 DM und einmal 953 DM, wobei 953 die Summe aus 800 und 153 Reisekosten ist. Die beiden Zeilen sind ohne die alte Rolle nicht mehr voneinander zu unterscheiden.

**`Ratenzahlung`, 1 Zeile auf 0.** Der Beleg (Box_02 Zeile 20, `UAKUG/NIM_022` Folio 1_1, `Datum` / `1952-06-22/1952-08-25`) trägt neu die Rolle `Spielzeit` (Box 2, Zeile 5). Die Aussage über die Ratenzahlung ist ersatzlos entfallen.

### Entwurf für `data.md`

§ 5, Untersektion „Statusmarkierungen in der Rollenspalte", ersetzen durch:

> ### Statusmarkierungen
>
> Die Quelle hat den Vertragsstatus mit der Lieferung vom 2026-08-31 aus der Rollenspalte in die Anmerkungsspalte verlegt. Der Wert lautet dort `Vertrag nicht eingehalten` und steht spaltenweit über einen ganzen Vertragsblock, im Bestand über zwölf Zeilen von `UAKUG/NIM_023` Folio 11 einschließlich der Zeile, die die Aktivität benennt. Die betroffenen Zeilen tragen jetzt zusätzlich eine echte Rolle.
>
> Damit ist die Voraussetzung erfüllt, unter der `data-model.md` § 11 die Statusmodellierung vertagt hat. Der Status hängt an der Aktivität und nicht an jeder einzelnen Aussage über sie. Er wird als `m3gim-ontology:contractStatus` am Vorkommnis geführt; `m3gim-ontology:realized = false` wird nur bei ausdrücklichem Beleg gesetzt und nie aus fehlendem Beleg geschlossen.

§ 17, Tabelle, die Zeile zum Vertragsstatus ersetzen durch:

> | Vertragsstatus in der Anmerkungsspalte über einen ganzen Block wiederholt (NIM_023 Folio 11) | Workaround | Status wird einmal am Vorkommnis geführt, statt an jeder der zwölf Zeilen; Quell-Fix wäre eine eigene Statusspalte |

### Vokabular

```turtle
m3gim-ontology:contractStatus
    a owl:ObjectProperty ;
    rdfs:label "Vertragsstatus"@de , "contract status"@en ;
    rdfs:comment "Stand eines vertraglich vereinbarten Vorkommnisses, soweit die Quelle ihn ausdruecklich vermerkt."@de ;
    rdfs:domain m3gim-ontology:Occurrence ;
    rdfs:range skos:Concept ;
    rdfs:isDefinedBy <https://dhcraft.org/m3gim/ontology> ;
    skos:editorialNote "Die Quelle vermerkt den Status seit der Lieferung 2026-08-31 in der Anmerkungsspalte und nicht mehr in der Rollenspalte. Damit ist die in E-139 vertagte Modellierung nicht mehr extern blockiert."@de .

m3gim-ontology:realized
    a owl:DatatypeProperty ;
    rdfs:label "eingetreten"@de , "realized"@en ;
    rdfs:comment "Sagt, ob ein vereinbartes Vorkommnis stattgefunden hat. Der Wert false wird nur bei ausdruecklichem Beleg gesetzt."@de ;
    rdfs:domain m3gim-ontology:Occurrence ;
    rdfs:range xsd:boolean ;
    rdfs:isDefinedBy <https://dhcraft.org/m3gim/ontology> ;
    skos:editorialNote "Aus fehlendem Beleg folgt kein false. Ein Vorkommnis ohne diese Property ist unbestimmt und nicht eingetreten."@de .

m3gim-vocab:contractStatuses
    a skos:ConceptScheme ;
    rdfs:label "Vertragsstaende"@de , "Contract statuses"@en ;
    skos:prefLabel "Vertragsstaende"@de ;
    rdfs:comment "Geschlossenes Vokabular fuer m3gim-ontology:contractStatus."@de .

m3gim-vocab:notFulfilled a skos:Concept ;
    skos:prefLabel "nicht eingehalten"@de ;
    skos:altLabel "not fulfilled"@en ;
    skos:definition "Die vertraglich vereinbarte Leistung ist ausweislich der Quelle nicht erbracht worden."@de ;
    skos:inScheme m3gim-vocab:contractStatuses .
```

Drei bestehende Begriffe verlieren ihre Belegung und brauchen nach `tests/test_46_vocab_vacancy.py` eine Notiz mit dem Marker `unused:`.

```turtle
m3gim-vocab:broadcastFee
    skos:editorialNote "unused: Die drei Belege sind mit der Lieferung 2026-08-31 auf gesamtverguetung umgeschrieben. Der Begriff bleibt, weil er eine Unterscheidung festhaelt, die die Quelle aufgegeben hat, naemlich das Honorar fuer die Herstellung einer Rundfunkaufnahme gegen die allgemeine Gesamtverguetung."@de .

m3gim-vocab:installmentPeriod
    skos:editorialNote "unused: Der einzige Beleg traegt seit der Lieferung 2026-08-31 die Rolle spielzeit. Die Aussage ueber die Ratenzahlung ist ersatzlos entfallen; der Begriff bleibt als Nachweis des Verlusts."@de .

m3gim-vocab:unfulfilledDating
    skos:editorialNote "unused: Der Anker war der Vertragsstatus in der Rollenspalte, der seit der Lieferung 2026-08-31 in der Anmerkungsspalte steht und ueber m3gim-ontology:contractStatus am Vorkommnis gefuehrt wird. Der Begriff bleibt, solange nicht entschieden ist, ob eine Datierung an einem nicht eingetretenen Vorkommnis eine eigene Bezugsebene braucht."@de .
```

### Testinvarianten

1. Genau 1 Vorkommnis trägt `m3gim-ontology:contractStatus = m3gim-vocab:notFulfilled`, und es ist das mit `rico:name = "Engagement Theatre Municipale de Lausanne"`.
2. Kein Annotationsknoten und keine Entitätsreferenz trägt das Literal `nicht eingehalten` in `m3gim-ontology:role`, geprüft über den gesamten Datensatz.
3. Mindestens 11 Knoten dieses Vorkommnisses tragen keine eigene Statusangabe, sodass der Status genau einmal im Datensatz steht.
4. Jeder Begriff des Vokabulars ohne Beleg im Datensatz trägt eine `skos:editorialNote` mit dem Marker `unused:`, geprüft über `vocab/check-coverage.py --vacancy` an mindestens 3 solchen Begriffen.

### Offene Entscheidungen

**E1. Ob `contractStatus` jetzt gebaut wird.** Variante A baut ihn, wie oben entworfen. Variante B lässt den Status als Freitext in `rico:generalDescription` an den zwölf Knoten stehen, wie es die Pipeline heute mit der Anmerkung tut. Empfehlung ist A, weil B eine Aussage über eine Sache zwölfmal wiederholt und weil der Grund der Vertagung in E-139, die ausstehende Klärung mit dem Erschließungsteam, durch die Quelle selbst beantwortet ist.

**E2. Der Verlust der Rundfunkhonorar-Unterscheidung.** Rückfrage an das Erschließungsteam, ob die Umschreibung beabsichtigt war. Der Befund gehört in `knowledge/data-errors.md` § Strukturelle Quell-Fixes mit den drei Fundstellen. Bis zur Antwort wird nichts rekonstruiert.

## 6. Zeilen ohne `typ`

### Befund

865 Zeilen ohne Typangabe, davon 661 auch ohne `name`, also Leerzeilen ohne Aussage. 204 tragen `name` und `rolle`, davon 203 unter `UAKUG/NIM_005` und eine unter `UAKUG/NIM_136` (Box 5, Zeile 269, `Staatsoper Wien` / `erwähnt`).

Die 203 Zeilen stehen alle in Box 1, Zeilen 1033 bis 2203, verteilt auf die Folios 16 bis 23 mit je 6 bis 22 Zeilen und 61 Zeilen ohne Folio. Die Rolle ist in allen 203 Fällen `erwähnt`, die Anmerkungsspalte ist in 201 Fällen leer.

Der Block ist nicht sortenrein. Die häufigsten `name`-Werte sind `Vertrag` (44), `Bestätigung` (36), `Verpflichtungsschein` (17), `Gastvertrag` (9) und `Dienstvertrag` (8), also Dokumentbezeichnungen wie in § 3. Daneben stehen `Altsolo` (6, eine Partie oder ein Stimmfach), `Strassburg` (2) und `München` (2, Orte), `Bayerischer Rundfunk` (2, eine Institution) und `VIII. Mahler` (2, ein Werk). Ein geratener Einheitstyp wäre in einem messbaren Anteil der Zeilen falsch.

Zwei Zeilen tragen die fehlende Angabe verschoben in der Anmerkungsspalte. Box 1, Zeile 1033 führt `typ` leer, `name` `Brief`, `anmerkung` `dokument`; Box 1, Zeile 1039 führt `typ` `person`, `name` `Vertrag`, `anmerkung` `dokument`, also einen offensichtlich falschen Typ mit der Korrektur daneben. Eine weitere trägt `???` als Anmerkung.

Die Pipeline verwirft die Zeilen an `scripts/transform.py` Zeile 1214, `if typ is None: continue`, ohne Zähler und ohne Meldung.

### Entwurf für `data.md`

§ 17, Tabelle, eine Zeile ergänzen:

> | Verknüpfungszeile mit `name` und `rolle`, aber ohne `typ` | Workaround | Zeile wird gezählt und mit Fundstelle in den Validierungsreport geschrieben, statt still verworfen zu werden; ein Typ wird nicht geraten |

§ 17, nach der Tabelle, als neuer Absatz:

> Eine Zeile ohne Typangabe trägt keine auswertbare Aussage, weil der Typ den Zielkontext steuert und der `name` allein nicht sagt, ob er eine Person, einen Ort, ein Werk oder ein Dokument bezeichnet. Solche Zeilen werden nicht modelliert. Sie werden gezählt, mit Blatt, Zeile, Signatur, Folio, Name und Rolle in den Validierungsreport geschrieben und über das [Datenfehler-Register](data-errors.md) an das Erschließungsteam gegeben. Ein Vorschlag für den fehlenden Typ entsteht getrennt davon nach dem Muster von `scripts/propose-links.py` (E-147), also als Vorlage in der Spaltenform der Verknüpfungstabelle, die weder die Tabelle noch den Datensatz schreibt.

### Vokabular

Keine Ergänzung. Der Befund führt zu einer Meldung und nicht zu einem Term.

### Testinvarianten

1. Der Validierungsreport führt mindestens 203 Befunde der Klasse „Zeile ohne Typ mit Name und Rolle", jeder mit Blatt, Zeilennummer und Signatur.
2. Kein Knoten des Datensatzes stammt aus einer Zeile ohne Typangabe, geprüft über die `m3gim-ontology:xlsxSource`-Adressen gegen die Menge der typlosen Quellzeilen.
3. Die Summe aus verarbeiteten und gemeldeten Verknüpfungszeilen entspricht der Zahl der geladenen Zeilen, sodass kein stiller Verwurf bleibt.

### Offene Entscheidungen

**F1. Befundliste oder minimale Erwähnungs-Modellierung.** Variante A meldet und modelliert nicht, wie oben entworfen. Variante B erzeugt je Zeile einen Annotationsknoten mit dem Rohwert und der Rolle `mentioned`, ohne Typangabe. Empfehlung ist A. Variante B bringt Entitäten unbekannter Art in den Graphen, macht die Erschließungslücke unsichtbar, weil die Zeilen dann als verarbeitet erscheinen, und die Heterogenität des Blocks zeigt, dass ein einheitlicher Umgang die falsche Antwort auf verschiedene Fälle wäre. Der Quell-Fix ist eine Spalte in einem zusammenhängenden Block.

## 7. Seiten-Hierarchie über den Folio-Stamm

### RiC-O-Prüfung und Entscheidung

Die offene Frage lautete, ob `rico:hasOrHadPart` zwischen zwei `rico:Record` zulässig ist oder ob der Elternknoten zu einem `rico:RecordSet` werden muss. Beide Annahmen greifen zu kurz. Geprüft am 2026-08-31 gegen `ICA-EGAD/RiC-O`, `ontology/current-version/CSV_lists_of_components`:

| Term | Domain | Range | subPropertyOf |
|---|---|---|---|
| `rico:hasOrHadPart` | Thing | Thing | isRelatedTo |
| `rico:hasOrHadConstituent` | Record ; RecordPart | Record ; RecordPart | hasOrHadPart |
| `rico:includesOrIncluded` | RecordSet | Record ; RecordSet | hasOrHadPart |

Die Klassenliste führt zu `rico:Record` die Scope Note „A Record may itself contain one or more Records, or may consist of one or more Record Parts." Die Scope Note zu `rico:hasOrHadPart` lautet „Use to connect a Thing to another Thing that is or was a part of the whole Thing only if it is not possible to use a narrower, more specific whole/part relation, for example has or had constituent."

Damit ist entschieden. Record zu Record ist von RiC-O 1.1 ausdrücklich vorgesehen, und die richtige Kante ist `rico:hasOrHadConstituent`. `rico:hasOrHadPart` ist formal zulässig und durch seine eigene Scope Note ausgeschlossen, solange die engere Relation passt. Eine Hochstufung des Folio-Stamms zum `rico:RecordSet` ist unnötig; sie würde behaupten, ein Blatt sei eine Gruppierung, und die archivische Aussage verschieben.

Als Nebenbefund folgt eine Korrektur am Bestehenden. `build_konvolut_hierarchy` in `scripts/transform.py` verbindet das Konvolut-`rico:RecordSet` über `rico:hasOrHadPart` mit seinen Records. Dafür ist `rico:includesOrIncluded` die engere Relation, und dieselbe Scope Note gilt.

### Befund in den Daten

In `M3GIM-Objekte.xlsx`, Blatt `Objekte`, 1018 Zeilen. Folio-Muster: 413 reine Zahlen, 374 der Form `n_m`, 8 der Form `n_m_k`, 219 leer, 4 mit dem Literal `Folio` in der Zelle. Die Tiefe erreicht höchstens zwei Unterstriche.

Von den 382 Folios mit Unterstrich haben 280 einen Stamm, der als eigene Objektzeile existiert; 102 haben keinen. Die fehlenden Stämme verteilen sich auf `UAKUG/NIM_137` (46), `UAKUG/NIM_136` (36), `UAKUG/NIM_003` (10), `UAKUG/NIM_023` (4), `UAKUG/NIM_022` (3), `UAKUG/NIM_073` (2) und eine Zeile ohne Signatur. Belegfall `UAKUG/NIM_137 12_1` bis `12_42` ohne eine Zeile mit Folio `12`.

Hinzu kommt der Fall aus § 2. 46 Verknüpfungszeilen in Box 5 tragen ein zu einem Datum umgewandeltes Folio. `Box 5!B1272` führt `datetime(2026, 1, 15)` mit Zahlenformat `d-m`, also `15_1`; `Box 5!B1279` führt `datetime(2026, 2, 15)`, also `15_2`. Die Objekttabelle kennt beide Folios, `UAKUG/NIM_137 15_1` und `15_2`, sodass die Rückleseregel `(Tag, Monat)` die 46 Zeilen an ihre Objekte bindet. Heute laufen sie auf die Objekt-IDs `UAKUG/NIM_137 2026-01-15` und `2026-02-15` und finden keinen Objektsatz.

### Entwurf für `data.md`

§ 3, Untersektion „Konvolut- und Objektlogik", ersetzen durch:

> Objektidentität wird durch `archivsignatur` plus optionales Folio gebildet. Konvolute sind aggregierende Einheiten (`rico:RecordSet`) und enthalten ihre Blätter über `rico:includesOrIncluded`.
>
> Innerhalb eines Konvoluts trägt die Folio-Notation eine zweite Hierarchie. Ein Folio der Form `n_m` bezeichnet ein Blatt innerhalb des Blattes `n`; ein Folio der Form `n_m_k` setzt das eine Ebene tiefer fort. Der Stamm entsteht durch Abtrennen des letzten Unterstrich-Segments und wird rekursiv gebildet, bis kein Unterstrich mehr bleibt. Beide Seiten bleiben `rico:Record`, und die Kante ist `rico:hasOrHadConstituent`. RiC-O 1.1 sieht das ausdrücklich vor; die Scope Note zu `rico:Record` nennt den Fall, und die Scope Note zu `rico:hasOrHadPart` verweist für ihn auf die engere Relation.
>
> Die Kante entsteht nur, wo der Stamm als eigene Objektzeile belegt ist. Ein fehlender Stamm wird nicht als Knoten erzeugt, weil das eine Archiveinheit behaupten würde, die die Erschließung nicht führt. Die Fälle gehen als Befund ins [Datenfehler-Register](data-errors.md).
>
> Verknüpfungen hängen an der granularsten Ebene, die ihre Zeile nennt.

### Vokabular

Keine projekteigene Ergänzung. Zwei RiC-O-Terme kommen neu in Gebrauch und gehören in die Allowlist (§ 9).

### Testinvarianten

1. Mindestens 280 Records tragen eine `rico:hasOrHadConstituent`-Kante auf mindestens ein Kind, und jedes Kind-Folio entsteht aus dem Eltern-Folio durch Anhängen genau eines Unterstrich-Segments.
2. Kein Record trägt `rico:hasOrHadPart`, und jede Konvolut-Kante vom `rico:RecordSet` zu seinen Records ist `rico:includesOrIncluded`, geprüft an mindestens 200 Kanten.
3. Kein Record ist über `hasOrHadConstituent` sein eigener Vorfahr, und die Tiefe der Kette überschreitet 2 nicht.
4. Mindestens 102 fehlende Stämme stehen im Validierungsreport mit Signatur und erwartetem Folio, und für keinen von ihnen existiert ein Record im Datensatz.
5. Mindestens 46 Verknüpfungszeilen mit datumsgewandeltem Folio lösen auf einen existierenden Objektsatz auf, belegt an `UAKUG/NIM_137 15_1` und `15_2`.
6. Kein Objekt-Identifikator des Datensatzes enthält eine Zeichenkette der Form `20\d\d-\d\d-\d\d`.

### Offene Entscheidungen

**G1. Umgang mit den 102 fehlenden Stämmen.** Variante A verbindet nur, wo der Stamm belegt ist, und meldet den Rest, wie oben entworfen. Variante B erzeugt den Stamm als Record ohne eigene Metadaten. Empfehlung ist A, weil B 102 Archiveinheiten in den Datensatz stellt, die im Bestand keine Entsprechung haben, und weil die Lücke selbst der Befund ist, den das Erschließungsteam braucht.

**G2. Ob die bestehende Konvolut-Kante mitgezogen wird.** Die Umstellung von `hasOrHadPart` auf `includesOrIncluded` betrifft jede Konvolut-Kante des Datensatzes und ist eine Änderung an vorhandenen Daten. Sie gehört in dieselbe Runde wie die neue Kante, weil beide auf derselben Scope Note beruhen und ein halber Umbau zwei Konventionen nebeneinander stellt.

## 8. Schutzregeln für die Index-Übernahme

### Befund

`build_index_lookup` in `scripts/transform.py` schreibt in Zeile 696 `lookup[name.lower()] = entry` in Quellreihenfolge. Bei gleichem Namen gewinnt die letzte Zeile vollständig, auch mit leeren Feldern gegen gefüllte.

**Personenindex, 27 doppelte Namen bei 443 Namen.** Das Muster ist durchgehend gleich. Die erste Zeile trägt die gepflegte Fassung mit `m3gim_id`, teils Lebensdaten und einer ausführlichen Anmerkung; die Nachzügler tragen keine `m3gim_id` und eine knappe Anmerkung. Der tragende Fall ist die Nachlassbildnerin selbst.

| Zeile | m3gim_id | name | wikidata_id | lebensdaten | anmerkung |
|---:|---|---|---|---|---|
| 217 | P139 | Malaniuk, Ira | Q94208 | 1919–2009 | Mezzosopranistin, Projektgegenstand |
| 218 | | Malaniuk, Ira | | | sängerin |

Mit der heutigen Regel gewinnt Zeile 218. Damit verliert die zentrale Person des Projekts ihre Wikidata-Kennung, ihre Lebensdaten und ihre Projekt-ID, und mit der Kennung fällt die gesamte Wikidata-Anreicherung an ihr aus. Weitere Fälle derselben Bauart sind `Böhme, Kurt` (P24 mit Lebensdaten gegen P290 ohne), `Holm, Richard` (P79 mit Lebensdaten gegen P290 ohne), `Litz, Gisela` (P128 mit Lebensdaten gegen zwei leere Zeilen), `Plümacher, Hetty`, `Varnay, Astrid` und `Hirsch, Robert`. Bei `Böhme, Kurt` und `Holm, Richard` trägt die jeweils zweite Zeile dieselbe `m3gim_id` P290, was ein eigener Quellfehler ist.

Ein Sonderfall ist `Stolze, Gerhard` gegen `Stolze, Gerhard ` mit angehängtem Leerzeichen, also eine Dublette, die erst nach Trimmen sichtbar wird.

**Werkindex, 4 doppelte Namen bei 127 Namen.** Hier ist der Name keine Identität. `Requiem` steht dreimal mit den Komponisten Hindemith (W113), Verdi (W124) und Mozart (W97); `Stabat mater` steht dreimal mit Pergolesi (W120), Rossini (W121) und ohne Angabe (W80); `Sinfonien, Nr. 9, op. 125 (d-Moll)` steht zweimal mit demselben Komponisten in zwei Schreibungen, `Beethoven, Ludwig van` (W99) und `Beethoven, Ludwig von` (W78), also eine echte Dublette. `Litaniae lauretanae KV 195` steht zweimal, und die zweite Zeile trägt in der Komponistenspalte den Wert `Requiem`, also eine verrutschte Zelle.

Der Kollisionsfall ist in den Verknüpfungen live belegt. Box 2, Zeile 335, `UAKUG/NIM_016` Folio 13 führt `werk` / `Requiem` / `Ausstrahlung` mit der Anmerkung `Wolfgang Amadeus Mozart`. Die Auflösung steht in der Anmerkungsspalte und nicht in einer auswertbaren Spalte.

**Organisationsindex, 2 doppelte Namen bei 104 Namen.** Die beiden Fälle sind verschieden. `Bayreuther Festspiele` steht zweimal mit derselben `m3gim_id` O7, derselben Wikidata-ID Q157596 und demselben Ort, aber zwei verschiedenen assoziierten Personen; das ist ein mehrwertiges Feld und keine Dublette. `National Artists Corporation` steht zweimal mit den verschiedenen IDs O28 und O29; das sind zwei Indexeinträge unter einem Namen.

**Ortsindex.** Die Kopfzeile lautet neu `['Turin', 'name', 'Bei Erfassung hinzugefügt ']`. Die erste Spalte führt die Ortskennungen `L1`, `L2` und fort, ihr Kopf ist mit dem Ortsnamen `Turin` überschrieben. Keiner der Zweige von `INDEX_HEADER_SHIFTS` greift, weil Position 0 nicht `m3gim_id` heißt und Position 1 auf der Ausnahmeliste steht. Die Kennungsspalte erreicht den Datensatz damit unter dem Namen `Turin`, und der in die Kopfzelle geratene Ortsname geht verloren.

### Entwurf für `data.md`

§ 3, nach der Tabelle der Indextabellen, als neue Untersektion:

> ### Identität und Vorrang in den Indextabellen
>
> Ein Index kann denselben Namen mehrfach führen, teils als versehentliche Doppelerfassung, teils als echte Homonymie. Die Übernahme folgt deshalb drei Regeln, die deterministisch sind und keinen Fall stillschweigend auflösen.
>
> **Identität.** Führt eine Indexzeile eine `m3gim_id`, ist diese die Identität. Zeilen mit derselben `m3gim_id` bezeichnen dieselbe Entität und werden verdichtet. Fehlt die `m3gim_id`, entscheidet der getrimmte Name. Tragen zwei Zeilen denselben Namen und verschiedene `m3gim_id`, ist das eine Namenskollision und keine Dublette.
>
> **Verdichtung.** Innerhalb einer Identität gewinnt je Feld der erste nicht leere Wert in Quellreihenfolge. Ein gefülltes Feld wird nie von einem leeren überschrieben. `assoziierte_person` ist mehrwertig und sammelt alle Werte der Gruppe.
>
> **Kollision.** Tragen zwei Zeilen derselben Identität in demselben Feld verschiedene nicht leere Werte, gewinnt der erste, die Entität trägt `m3gim-ontology:dataQualityFlag` mit dem Wert `index-konflikt`, und der Fall geht mit beiden Werten in den Validierungsreport.
>
> Im Werkindex ist der Titel allein keine Identität, weil verschiedene Werke ihn teilen. Der Schlüssel ist das Paar aus Titel und Komponist. Eine Verknüpfungszeile, die nur einen Titel nennt und auf mehr als einen Indexeintrag passt, wird nicht aufgelöst; das Werk erscheint mit Titel, ohne Komponistenangabe und mit dem Flag `name-nicht-eindeutig`, und die Mehrdeutigkeit geht in den Validierungsreport.

§ 17, Tabelle, zwei Zeilen ergänzen:

> | Mehrfach erfasster Name in einem Index, Nachzüglerzeile ohne `m3gim_id` und ohne Normdaten | Workaround | feldweise Verdichtung nach Identität statt Überschreiben durch die letzte Zeile; ohne sie verliert unter anderem die Nachlassbildnerin ihre Wikidata-Kennung |
> | Ortsindex-Kopfzelle mit einem Ortsnamen überschrieben (`Turin` statt `m3gim_id`) | Workaround | Kennungsspalte positionsbasiert erkannt statt über den Kopfnamen; der in die Kopfzelle geratene Wert geht in den Validierungsreport |

### Vokabular

```turtle
m3gim-ontology:dataQualityFlag
    skos:editorialNote "Der Wertevorrat waechst mit der Lieferung 2026-08-31 um index-konflikt, gesetzt, wenn zwei Indexzeilen derselben Identitaet in demselben Feld verschiedene nicht leere Werte tragen, und um dokumenttyp-unbekannt (data.md § 5, Dokumentrollen)."@de .
```

Ein eigener Term entsteht nicht. Die Regel ist eine Pipeline-Regel und der Konflikt ein Flag im bestehenden Wertevorrat.

### Testinvarianten

1. Die Person `Malaniuk, Ira` trägt im Datensatz die Kennung `wd:Q94208`, ihre Lebensdaten und ihre Wikidata-Anreicherung, obwohl der Personenindex sie zweimal führt und die zweite Zeile leer ist.
2. Mindestens 6 weitere Personen tragen die Lebensdaten oder die Anmerkung ihrer ersten Indexzeile, obwohl eine spätere Zeile desselben Namens diese Felder leer lässt.
3. Der Validierungsreport führt mindestens 27 Personen-, 4 Werk- und 2 Organisationsbefunde der Klasse „Name mehrfach im Index".
4. Mindestens 3 Werkknoten mit dem Titel `Requiem` sind über das Paar aus Titel und Komponist unterscheidbar, und kein Werkknoten trägt einen Komponisten, den seine Indexzeile nicht führt.
5. Der Werkknoten aus Box 2, Zeile 335, trägt keinen Komponisten und das Flag `name-nicht-eindeutig`, solange die Auflösung nur in der Anmerkungsspalte steht.
6. Die Ortskennungen `L1` und folgende erreichen den Datensatz, geprüft an mindestens 30 Ortsknoten, und kein Ortsknoten heißt `Turin`, ohne dass eine Datenzeile ihn führt.
7. Der Lauf ist deterministisch: zwei Läufe über dieselbe Quelle erzeugen byteweise gleiche Indexauflösungen, geprüft über den bestehenden Determinismus-Test.

### Offene Entscheidungen

**H1. Vorrangregel.** Variante A ist die feldweise Verdichtung mit Erstwert-Vorrang und Konfliktflag, wie oben entworfen. Variante B ist Erste-Zeile-gewinnt als ganze Zeile, was einfacher ist und einen später nachgetragenen Wikidata-Treffer verwirft. Empfehlung ist A, weil sie kein gepflegtes Feld verliert und weil der Konflikt als Befund sichtbar bleibt, statt durch die Regel verschwiegen zu werden.

**H2. Werkindex-Schlüssel.** Variante A ist das Paar aus Titel und Komponist mit Nichtauflösung bei Mehrdeutigkeit, wie oben entworfen. Variante B behält den Titel als Schlüssel und wählt die Zeile mit der kleinsten `m3gim_id`, was deterministisch ist und einem Requiem einen beliebigen Komponisten zuweist. Empfehlung ist A.

**H3. Der Komponist in der Anmerkungsspalte.** Ob die Pipeline die Anmerkung einer Verknüpfungszeile für die Werkauflösung heranzieht, ist zu entscheiden. Der Entwurf zieht sie nicht heran, weil die Spalte Freitext ist. Der Quell-Fix wäre eine Erfassungskonvention, die den Komponisten in den Werknamen zieht.

## 9. Nachzuziehende Prüfeinträge

Vier Fremdterme kommen mit diesem Entwurf neu in Gebrauch. Sie sind am 2026-08-31 gegen die offiziellen Quellen geprüft und gehören mit dieser Herkunft in `tests/fixtures/rico_agrelon_allowlist.json`.

| Term | Quelle | Belegte Angabe |
|---|---|---|
| `rico:hasOrHadConstituent` | RiC-O 1.1, `list-of-object-properties.csv` | Domain `Record ; RecordPart`, Range `Record ; RecordPart`, subPropertyOf `hasOrHadPart` |
| `rico:includesOrIncluded` | RiC-O 1.1, `list-of-object-properties.csv` | Domain `RecordSet`, Range `Record ; RecordSet`, subPropertyOf `hasOrHadPart` |
| `rico:hasOrHadParticipant` | RiC-O 1.1, `list-of-object-properties.csv` | Domain `Event`, Range `Thing` |
| `crm:E7_Activity` | CIDOC-CRM 7.1.3 | Klasse `E7 Activity`, Oberklasse `E5 Event`, Namensraum `http://www.cidoc-crm.org/cidoc-crm/` |

Die Allowlist braucht dafür einen neuen Abschnitt `crm` und einen fortgeschriebenen `_provenance`-Text. `rico:isAssociatedWithEvent` und `rico:hasOrHadPart` stehen bereits darin.

## 10. Reihenfolge der Umsetzung

Die Spec-first-Reihenfolge des Projekts ist `data.md`, Vokabular, Test, Pipeline. Die acht Befundgruppen hängen inhaltlich zusammen und lassen sich in vier Runden schneiden, deren jede für sich einen grünen Testlauf erreichen kann.

1. **Rollen und entfallene Belege** (§ 4, § 5). Fünf neue Begriffe, ein Alternativlabel, drei `unused:`-Notizen, `contractStatus` und `realized` samt Schema. Berührt keine Klassenstruktur und macht die Testsuite als erstes wieder vollständig.
2. **Index-Schutzregeln und Seiten-Hierarchie** (§ 8, § 7). Beide betreffen den Objekt- und Indexpfad vor der Verknüpfungsverarbeitung, beide brauchen kein neues Vokabular, beide beheben je einen belegten Datenverlust.
3. **Vorkommnis und Beteiligung** (§ 1, § 2). Der eigentliche Modellschritt, sieben neue Terme und der Umbau der Zuordnungslogik von Typ auf Kennung.
4. **Aboutness und Befundlisten** (§ 3, § 6). Ein neuer Term und zwei Meldewege; setzt auf der Kennungslogik der dritten Runde nicht auf und kann auch früher laufen.

Neue Testdateien beginnen bei `tests/test_53_*.py`, weil `test_52_dating_scope_and_rank.py` die höchste vergebene Nummer ist. Alle Invarianten dieses Berichts entstehen zuerst als `@pytest.mark.xfail(strict=True)` mit dem genannten Mindestvorkommen, damit ein XPASS das Ziehen des Markers erzwingt.

## 11. Sammlung der offenen Entscheidungen

| Kennung | Gegenstand | Empfehlung | Blockiert durch |
|---|---|---|---|
| A1 | Aktivitätszeile ohne Kennung | melden, nicht binden | Quell-Fix, eine Zelle |
| B1 | Werk an der Beteiligung | Domain von `performanceOf` erweitern | Operator |
| B2 | Aufführungsebene je Aktivität | vorerst weglassen | Operator |
| B3 | uneinheitliche Bündelungstiefe | Erfassungskonvention klären | Erschließungsteam |
| B4 | Kennung zurücklesen oder Quell-Fix | zurücklesen und melden | Operator |
| C1 | Trägerform der Aboutness | Annotation mit `mentionsFormType` | Operator |
| C2 | genannte Publikation als eigene Entität | vorerst Literal mit Flag | Datenlage |
| C3 | `dokument`-Zeile ohne Namen | melden | Quell-Fix |
| D1 | `unterschriftsdatum` gegen `ausstellungsdatum` | getrennt führen | Erschließungsteam |
| D2 | `abspielhonorar` gegen `rundfunkhonorar` | getrennt führen | Erschließungsteam |
| D3 | Rolle `summe` | als Begriff aufnehmen | Erschließungsteam |
| D4 | Werte ohne Datendeckung | nicht aufnehmen, melden | Erschließungsteam |
| E1 | `contractStatus` jetzt bauen | ja | Operator |
| E2 | Verlust der Rundfunkhonorar-Unterscheidung | rückfragen, nichts rekonstruieren | Erschließungsteam |
| F1 | Zeilen ohne Typ | melden, nicht modellieren | Operator |
| G1 | 102 fehlende Folio-Stämme | nur Belegtes verbinden | Operator |
| G2 | bestehende Konvolut-Kante mitziehen | ja, in derselben Runde | Operator |
| H1 | Vorrangregel der Indexübernahme | feldweise Verdichtung mit Konfliktflag | Operator |
| H2 | Werkindex-Schlüssel | Titel und Komponist | Operator |
| H3 | Komponist aus der Anmerkungsspalte | nicht heranziehen | Erschließungsteam |
