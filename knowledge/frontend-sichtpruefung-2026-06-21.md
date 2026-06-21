---
title: Frontend-Sichtprüfung 2026-06-21
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: draft
created: 2026-06-21
updated: 2026-06-21
language: de
version: 0.1
authors: [Christopher Pollin]
generated-with: Claude Code
author: claude-code-worker
human-reviewed: false
related: [data, plan, decisions, architecture, design, visualisierung-bayreuth]
---

# Frontend-Sichtprüfung 2026-06-21

> Befundbericht der Forschungsleitstellen-Lane m3gim. Eine Chrome-Sichtprüfung des lokal geserveten Frontends mit dem Ziel, den aktuellen Datenstand vollständig im Interface zu verifizieren, die Mobilitätsdimension zu bewerten, den Mobilitäts-Atlas auf Reaktivierbarkeit zu prüfen und Datenauffälligkeiten als Befund festzuhalten, getrennt nach Pipeline-, Reconciliation- und Quellfehler. Grundlage für das Operator-Feedback durch den Fachexperten. Die kanonische Wissensbasis bleibt in [data.md](data.md), [plan.md](plan.md), [decisions.md](decisions.md); hier steht das Geprüfte und Gefundene.

## Methode

Geprüft wurde das statische Frontend, lokal über einen HTTP-Server aus `docs/` ausgeliefert, in Chrome. Zahlen sind reproduzierbar erhoben, entweder als Store-Abfrage über `window.m3gim.store` (das flache Loader-Format, das auch die Views konsumieren) oder als DOM-Lesung der gerenderten Ansicht. Wo eine Bildlesung und eine DOM-Lesung sich widersprachen, gilt das DOM, der skalierte Screenshot hat sich zweimal als unzuverlässig erwiesen (siehe Verifikationsnotiz). Der geprüfte Datenstand trägt das Export-Datum 2026-06-18T15:03 (Konsolen-Log beim Laden), deckungsgleich mit `data/output/m3gim.jsonld`.

## Datenstand-Verifikation

Der aktuelle Datenstand kommt vollständig im Frontend an. `docs/data/m3gim.jsonld` ist byte-identisch mit `data/output/m3gim.jsonld`, der E-107-Promote ist vollzogen, ein neuerer Quell-Export liegt lokal nicht vor (die XLSX sind von April, der Build vom 18. Juni). Der Store lädt fehlerfrei, die Konsole meldet beim Laden keine Fehler und die Provenienz-Metrik 378/378 Records mit `xlsxSource`.

Alle sechs aktiven Tabs rendern den Datenstand:

- Bestand. Drei Konvolute, Record-Detail mit vollständigen Chip-Sektionen.
- Chronik. Zeitstrahl mit Jahresbändern und Ortschips inline.
- Statistik. Dokumenttypen, Mobilitätssichten, Geografie, Netzwerk, Repertoire, Finanzen.
- Indizes. Personen, Organisationen, Orte, Werke als Facettengrids.
- Netzwerk. Konzentrisches Personennetz um Malaniuk, Filter-Sidebar.
- Korb. Vorhanden, leer per Default, keine Daten zu verifizieren.

Die verborgenen Tabs Mobilitäts-Atlas, Repertoire und Biogramm sind im Router auf Bestand umgebogen (siehe Atlas-Abschnitt).

## Mobilität im Frontend

Die typisierten Ortsrollen erscheinen als Chips. Im Record-Detail (geprüft an NIM_007_4, dem Record mit der reichsten Ortsrollen-Belegung) zeigt die Sektion ORT & EREIGNIS die Chips ZIELORT Wien, ZIELORT Lissabon, ABREISEORT München, GASTSPIEL Lissabon. Die datumslosen E-97-Ortsrollen tragen korrekt das Suffix `· —` für das fehlende Datum, die datierten Rollen ihr Datum. Jeder Chip trägt eine Z-Provenienz auf die XLSX-Zeile. Das ist der umgesetzte E-97- und E-108-Kontrakt.

Die fünf Mobilitätstypen sind in der Statistik explizit als Sektion Mobilitätssichten ausgewiesen: Performativ 24, Institutionell 6, Diskursiv 4, Korrespondenz 2, Biografisch 1, dazu eine sechste Leiste Nicht klassifiziert 24. 61 SpatiotemporalEvents insgesamt, 46 datiert, 15 datumslos (die E-97-Ortsrollen zielort 11, absendeort 3, abreiseort 1).

### Befund M1, die zentrale Mobilitäts-Lücke

Die Leiste Nicht klassifiziert ist mit 24 Events exakt so lang wie die größte benannte Sicht Performativ. Ursache ist eine Inkonsistenz zwischen Spezifikation und Implementierung:

- [data.md](data.md) Abschnitt 10 ordnet die Mobilitäts-Ortsrollen `absendeort`, `empfangsort`, `zielort`, `abreiseort`, `vertragsort` ausdrücklich der Reise- und Korrespondenzmobilität zu.
- Das Frontend mappt in `docs/js/data/constants.js` (`EVENT_ROLE_TO_MOBILITY_CLUSTER`) genau diese fünf Ortsrollen bewusst auf `null`. Der begründende Kommentar behauptet, Abschnitt 10 nenne keine Zuordnung der Ortsrollen. Diese Begründung ist veraltet, Abschnitt 10 nennt die Zuordnung inzwischen.

Folge im Interface: die mit Abstand häufigste Reisemobilitäts-Rolle `zielort` (11) plus `abreiseort` (1) landen unter Nicht klassifiziert, statt unter Korrespondenz beziehungsweise Reise. Die benannte Sicht Korrespondenz zeigt nur 2 (die `absendedatum`-Events), obwohl die Reisemobilität die datenreichste Mobilitätsspur des Bestands ist. Genau die Dimension, die in den Vordergrund treten soll, wird im Diagramm als unklassifiziert ausgewiesen.

Dies ist kein Pipeline- und kein Quellfehler, sondern ein Frontend-Klassifikator, der hinter der eigenen Spezifikation zurückbleibt. Die Auflösung ist deterministisch: die fünf Ortsrollen in `EVENT_ROLE_TO_MOBILITY_CLUSTER` auf `korrespondenz` mappen (Abschnitt 10 folgend), den veralteten Kommentar streichen und `tests/test_25_chronik_mobility_cluster.py` entsprechend nachziehen. Da der Klassifikator-Kommentar die Zuordnung dem Erschließungsteam zur Klärung vorlegt und es die fachliche Frage berührt, ob ein Zielort ohne Datum als Reisemobilität zählt, ist die Ratifikation eine Operator- beziehungsweise Fachexperten-Entscheidung. Kanonisch als offene Entscheidung in [decisions.md](decisions.md) verzeichnet.

## Mobilitäts-Atlas, Reaktivierbarkeit

Der Atlas ist reaktivierbar. Der Daten-Kontrakt ist erfüllt, der Code-Pfad ist intakt und liest `store.mobilityEvents`. Verifiziert wurden ein harter technischer Blocker und eine Designnachbesserung.

- Harter Blocker. Leaflet ist nicht eingebunden. `window.L` ist zur Laufzeit `undefined`, der Atlas ruft in `mobility-atlas.js` `L.map()` unbedingt auf und würde mit `ReferenceError: L is not defined` brechen (von der Error-Boundary graceful abgefangen). In `index.html` ist das Leaflet-Script bewusst auskommentiert, solange der Tab verborgen ist. Reaktivierung heißt zuerst, das Leaflet-CDN (JS und CSS) wieder einzubinden. Geringer Aufwand. D3 ist geladen, der Zeitstrahl funktioniert nach dem Leaflet-Fix.
- Designnachbesserung Zeitstrahl. Von den 61 Events haben 55 Koordinaten (Karte) und 46 ein parsebares Jahr (Zeitstrahl). 9 Events sind verortet, aber datumslos, sie erscheinen als Kartenmarker, fallen aber lautlos aus dem Zeitstrahl (`extractYear(e.date) != null`). Diese 9 sind die datumslosen E-97-Ortsrollen mit Stadt-Q-ID. Eine Reaktivierung sollte sie sichtbar machen, analog dem Silent-Drop-Hinweis aus E-108, statt sie stumm zu droppen.
- Unverortet. 6 Events ohne Koordinaten, alle sechs sind die adressgenauen Zürich-Varianten (siehe Befund Q3). Der Atlas behandelt sie bereits transparent über eine eigene Badge und einen Unverortet-Modus mit Begründung ohne Q-ID. Das ist solide.

Der Bau der Reaktivierung ist operator-gated (Frontend- und `index.html`-Änderung plus Test für den neuen Zeitstrahl-Pfad).

## Datenbefunde beim Durchklicken

Getrennt nach Fehlerklasse. Quellfehler reicht die Pipeline getreu durch, sie sind im Excel zu beheben. Reconciliation-Fehler entstehen im automatischen Wikidata-Match. Frontend-Befunde liegen im Anzeige- oder Klassifikations-Code.

### Quellfehler (im Excel zu beheben)

- Q1, Zukunftsdatum. Das Konvolut NIM_004 zeigt im Bestand die Datumsspanne 1952 bis 2026. Das Maximum stammt von `NIM_004_34`, das ein Jahr 2026 trägt. Bei einem Kritiken-Konvolut der Spanne 1952 bis 1968 ist 2026 ein Erfassungsfehler. Folgewirkung im Interface: der Zeitfenster-Slider im Netzwerk-Tab reicht bis 2026. Quelle ist `M3GIM-Objekte.xlsx`. (Dies ist der in plan.md unter Offene Datenqualität gemeldete Zukunftsdatum-Punkt, hier am Interface lokalisiert.)
- Q2, Beethoven van gegen von. In der Repertoire-Statistik erscheinen Beethoven, Ludwig van (3) und Beethoven, Ludwig von (2) als zwei getrennte Komponisten, ebenso im Werkindex (van bei der 9. Sinfonie und den Geschöpfen des Prometheus, von bei drei Liedern). Bekannter Quellfehler im Werkindex, in plan.md unter Strukturelle Quell-Fixes mit `test_24`-xfail geführt.
- Q3, Zürich-Adressvarianten. Der Orte-Index listet Zürich (14) und zusätzlich getrennt Zürich, Zürichbergstrasse 104 (4), Zürich, Geibelstrasse 1/1 (2) und Zürich, Zurichbergstrasse 104 (1). Letztere trägt einen Umlaut-Tippfehler, Zurich statt Zürich. Diese sechs adressgenauen Records sind genau die sechs unverorteten Atlas-Events. Die E-108-cityOf-Konsolidierung greift im Store und in der Statistik (Top-Orte zeigt Zürich konsolidiert), nicht aber im Indizes-Orte-Grid, dort fragmentiert Zürich weiter in vier Einträge. Wer im Orte-Filter Zürich wählt, verfehlt die adressgenau erfassten Records. Wurzel ist der fehlende Stadt- und Q-ID-Layer im `M3GIM-Ortsindex.xlsx`, in plan.md unter Anreicherung und Normdaten (Session 51) beschrieben.

### Reconciliation-Fehler (automatischer Wikidata-Match)

- R1, New York als Bundesstaat statt Stadt. Alle drei New-York-Events (`absendeort` NIM_004_1, `zielort` NIM_004_23, `entstehung` NIM_004_27) tragen `wd:Q1384` mit Koordinaten 43 / -75. Das sind Identität und Zentroid des Bundesstaats New York, nicht der Stadt (die läge bei 40.7 / -74.0, `wd:Q60`). Für Absende- und Zielort einer Korrespondenz ist die Stadt gemeint. Im reaktivierten Atlas erschiene der Marker an falscher, ländlicher Position. Gleiche Fehlerklasse wie der frühere Q2861-Rostock-Fall, Ursache ist der Match über den nackten Ortsnamen ohne Disambiguierung. Korrektur über eine manuelle Q-ID im Ortsindex oder eine Reconciliation-Runde mit Approval-Verifikation.
- R2, mehrere Personen-Fehlmatches, vom Interface aufgedeckt. Im Personen-Index widersprechen mehrere Wikidata-Berufs- und Lebensdaten-Labels dem Musikkontext deutlich: Dermota, Anton als Politiker 1876 bis 1914 (der Tenor lebte 1910 bis 1989), Böhme, Kurt als Ubootfahrer 1917 bis 1984 (der Bass 1908 bis 1989), Holm, Richard als Botaniker, Wächter, Eberhard als Maler 1762 bis 1852, Wiener, Otto als Physiker, Richter, Gerd als Tischtennisspieler von 1974. Das sind Kandidaten für Fehlmatches auf gleichnamige, prominentere Personen. Hier nicht je einzeln gegen Wikidata abschließend verifiziert, der Widerspruch im angezeigten Label ist der Befund. Empfohlen ist ein Lauf von `scripts/verify-manual-approvals.py` plus eine gezielte Reconciliation-Prüfung dieser Namen. Wertvoll für die Operator-Verifikation: das Interface macht solche Fehlmatches über die Beruf- und Lebensdaten-Labels unmittelbar sichtbar.

### Frontend-Befunde (Anzeige- und Klassifikations-Code)

- F1, Mobilitäts-Klassifikator hinter der Spec. Siehe Befund M1. Die typisierten Ortsrollen werden als Nicht klassifiziert ausgewiesen, obwohl data.md Abschnitt 10 sie der Reise- und Korrespondenzmobilität zuordnet.
- F2, kleine Datierungs-Metrik-Differenz. Das Statistik-Histogramm meldet 44 von 61 Events mit Jahresangabe, die Atlas-Logik und eine direkte Store-Zählung kommen auf 46 datierte Events. Differenz von zwei Events, vermutlich aus unterschiedlicher Jahr-Parselogik (TimeSpan oder nicht-jahresscharfes Datum). Kein blockierender Punkt, bei einer Mobilitäts-Überarbeitung die beiden Zählwege angleichen.

## Empfehlungen

Alle drei sind operator- beziehungsweise fachexperten-gated, keine wurde gebaut.

1. Mobilitäts-Klassifikator an die Spec angleichen (Befund M1, F1). Die fünf Ortsrollen auf `korrespondenz` mappen, damit die Reisemobilität als benannte Sicht erscheint und die Dimension in den Vordergrund tritt. Voraussetzung ist die fachliche Ratifikation, dass ein datumsloser Zielort als Reisemobilität zählt.
2. Atlas reaktivieren (Atlas-Abschnitt). Leaflet-CDN einbinden, die 9 verorteten datumslosen Events im Zeitstrahl sichtbar machen, den Unverortet-Modus beibehalten.
3. Quell- und Reconciliation-Tickets an das Erschließungsteam (Q1 bis Q3, R1, R2). Diese liegen außerhalb des Codes, die Pipeline reicht sie getreu durch.

## Verifikationsnotiz

Methodisch zentral und für die nächste Sichtprüfung festzuhalten: der gegen das 4096px breite Render skalierte Screenshot war zweimal irreführend. Eine vermeintliche Chip-Beschriftung FRIEDHOF war im DOM ERWÄHNT, eine vermeintliche Datumsspanne bis 2826 war im DOM 2026. Beide Befunde wurden erst durch die DOM-Lesung korrigiert. Zahlen und Beschriftungen dieses Berichts stammen daher aus Store-Abfrage oder DOM, nicht aus dem Bild. Die Screenshot-Spur dient der visuellen Begleitung, nicht als Zahlenquelle.
