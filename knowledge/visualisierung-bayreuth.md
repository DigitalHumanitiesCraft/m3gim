---
title: Visualisierung Bayreuth
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: draft
created: 2026-06-20
updated: 2026-06-20
language: de
version: 0.2
authors: [Christopher Pollin]
generated-with: Claude Code
topics: ["[[Information Visualisation]]"]
related: [research, data, design, architecture, plan, decisions]
---

# Visualisierung Bayreuth

> Wissensbündelung, Definitionen und Klärungsvorlage für die Frontend-Visualisierung des Bayreuth-Fokus, also der Netzwerke, Rollen und Mobilitäten von Ira Malaniuk hinsichtlich Bayreuth. Dieses Dokument ist das Arbeits- und Auftragsdokument der Forschungsleitstellen-Lane m3gim, kein Ersatz der kanonischen Wissensbasis. Die Source of Truth bleibt in [project.md](project.md), [research.md](research.md), [data.md](data.md), [design.md](design.md), [architecture.md](architecture.md), [plan.md](plan.md) und [decisions.md](decisions.md); hier wird das für eine konkrete Visualisierungsaufgabe Relevante zusammengezogen und auf einen klärbaren Stand gebracht.

## Auftrag

Die Lane arbeitet an der Informationsvisualisierung im Frontend mit Fokus auf Bayreuth und Mobilität. Die leitende Frage lautet, wie sich Netzwerke, Rollen und Mobilitäten von Malaniuk hinsichtlich Bayreuth sichtbar machen lassen. Drei Dimensionen laufen an einem Ort zusammen, das Netzwerk (mit wem), die Rolle (als was, in welcher Funktion und welcher Bühnenpartie) und die Mobilität (wann, woher, wohin). Bayreuth ist der gemeinsame Bezugspunkt, der die drei Achsen koppelt.

## Warum Bayreuth ein tragfähiger Fokus ist

Bayreuth bündelt die Forschungsfragen an einem klar umrissenen Ort und Zeitraum. Malaniuk gastierte laut [research.md](research.md) zwischen 1951 und 1958 bei den Bayreuther Festspielen, parallel zu ihren Festengagements in Zürich, München und Wien. Der Ort verbindet damit unmittelbar Mobilität (Gastspiel-Reisen neben dem festen Engagement), Netzwerk (das Bayreuther Ensemble und seine Leitung) und Rolle (das Wagner-Fach).

- Repertoire-Anker. Malaniuks Wagner-Partien sind Waltraute, Brangäne, 2. Norn und Fricka. Sie sind der Kern des Bayreuth-Bezugs auf der Rollen-Achse.
- Netzwerk-Anker. Zur künstlerischen Zusammenarbeit zählen Wieland Wagner, Hans Knappertsbusch, Joseph Keilberth, Herbert von Karajan und Wilhelm Furtwängler, also genau die Leitungsfiguren der Bayreuther Nachkriegsjahre. Im Netzwerk-Tab erscheint die Wagner-Familie bereits als Kontext.
- Designsystem-Anker. Bayreuth ist in [design.md](design.md) ausdrücklich als ortsfarbcodierter Ort vorgesehen (Graz, Wien, Bayreuth, Salzburg, München), die Farbzuordnung gehört ins Designsystem, nicht in eine einzelne Ansicht.
- Forschungsverankerung. Der Fokus zahlt auf FF1 (Professionalisierung und Vernetzung durch Mobilität), FF3 (Wissenstransfer durch Mobilität) und FF4 (spezifische Mobilitätsformen) ein. Auf der Mobilitätstypologie ist Bayreuth ein Fall geografischer Mobilität, das Pendeln zwischen Engagement und Festspiel.

## Datengrundlage im Store

Einzige primäre Datenquelle des Frontends ist `docs/data/m3gim.jsonld`, gelesen über den Loader in den Store ([architecture.md](architecture.md)). Die Derivate `partitur.json`, `matrix.json`, `kosmos.json` sind nicht angebunden. Für den Bayreuth-Fokus tragen folgende Store-Strukturen.

- Ort. `store.locations` aus `rico:hasOrHadLocation` der Records (Felder Name, Wikidata, Rolle), Stadt-konsolidiert über `cityOf` (E-108). `store.mobilityEvents` aus den Top-Level `m3gim:SpatiotemporalEvent` (Felder `place`, `placeWikidata`, `placeLat`, `placeLon`, `date`, `role`), verknüpft über `store.recordToEvents`. Der Ort Bayreuth ist die Ankerentität der Mobilitäts-Achse.
- Netzwerk. `store.persons` aus `m3gim:hasAssociatedAgent` (Akteure) und `rico:hasOrHadSubject` mit `@type rico:Person` (erwähnte Subjekte). `store.agentRelations` trägt die explizit annotierten AgRelOn-Beziehungen, die Ko-Okkurrenz wird im Frontend aus gemeinsamen Dokumenten abgeleitet.
- Rolle. `store.stageRoles` (m3gim:StageRole) und `store.performances` (n-äre m3gim:Performance über `m3gim:hasPerformance` am Record), `store.works` das Werk mit Komponist.

Formatregel, die für die Korrektheit zentral ist. Consumer dürfen nur das flache Loader-Format lesen, nicht die rohen JSON-LD-Keys. Das Missachten führte in Session 35 zu einem stillen Dedup-Bug, bei dem Malaniuk doppelt erschien. Die JSDoc-Shapes stehen über `buildStore()` in `loader.js`.

## Datendeckung Bayreuth (Scout-Befund, 2026-06-20)

Erhoben read-only über `scripts/scout-coverage.py` gegen `docs/data/m3gim.jsonld`, entlang der Loader-Mappings, also im Store-Format, das auch das Frontend sieht. Reproduzierbar und bei Daten-Updates neu zu erheben (`python scripts/scout-coverage.py`).

Ortsanker. Bayreuth liegt als ein einziger, sauberer Ortseintrag vor, Wikidata `wd:Q3923`, ohne zersplitterte Adressvarianten. Die Ortsnormalisierungs-Frage stellt sich für Bayreuth also nicht. Neun Records tragen Bayreuth als Ort, mit den Rollen auffuehrungsort, gastspiel und erwähnt.

Mobilitäts-Achse. Vier SpatiotemporalEvents verorten Bayreuth raumzeitlich, alle vier mit Koordinaten (49.95, 11.58) und alle vier datiert. Zwei tragen die Rolle gastspiel über die Spanne 1951/1953, zwei einzelne Daten 1952-08-26 und 1953-07-06. Das ist die exakte, belegte Verortung der Bayreuth-Aufenthalte, schmal, aber vollständig verortet und datiert. Über 1953 hinaus ist in der Datengrundlage kein Bayreuth-Bezug belegt, obwohl die Literatur die Festspiel-Gastspiele bis 1958 führt (verifiziert, siehe V1). Die belegte Spanne ist also 1951 bis 1953, nicht 1951 bis 1958.

Netzwerk-Achse über die neun Records, strukturell zu trennen. Akteure (hasAssociatedAgent) umfassen das Bayreuther Mitwirkenden-Umfeld, darunter Wieland und Wolfgang Wagner, Wilhelm Pitz, Joseph Keilberth, Hans Knappertsbusch, Eugen Jochum sowie Sängerkolleginnen und -kollegen wie Martha Mödl, Wolfgang Windgassen, Astrid Varnay, Josef Greindl, Gustav Neidlinger, Hermann Uhde und Birgit Nilsson. Erwähnte Subjekt-Personen (hasOrHadSubject) sind ein anderer Befund, überwiegend Komponisten (Mozart, Gluck, Händel, Bach, Strauss, Orff) und historische oder genannte Figuren. Für eine Netzwerk-Ansicht zählt primär die Akteurs-Achse, die Subjekt-Achse ist Kontext, kein Kontaktnetz. Explizite AgRelOn-Beziehungen sind im Bayreuth-Ausschnitt fast leer (eine HasCorrespondent-Relation), das Netzwerk ist also fast vollständig Ko-Okkurrenz aus geteilten Records, nicht annotierte Relation.

Rollen-Achse. Bühnenrollen über die Performances der Bayreuth-Records. Der Wagner-Kern ist belegt, Brangäne mehrfach, dazu Tristan-und-Isolde- und Ring-Partien (Waltraute, die drei Nornen, die Rheintöchter, Wotan, Hagen, Gunther, Gutrune, Alberich, Brünnhilde). Daneben stehen Nicht-Bayreuth-Rollen aus anderen Häusern (Amneris, Carmen, Lady Macbeth, Sextus, Orpheus), die über dieselben Sammelrecords mitlaufen.

Werk-Achse. Tristan und Isolde dominiert, dazu Götterdämmerung als Ring-Beleg, neben Werken aus dem weiteren Repertoire (Orpheus und Eurydike, Aida, Carmen, La clemenza di Tito, Salome).

Methodische Kopplung, zentral für jede Visualisierung. Die Achsenzahlen beruhen auf der Kopplung Person, Rolle oder Werk steht im selben Record wie ein Bayreuth-Ort, nicht auf nachweislich in Bayreuth. Die Bayreuth-Records sind teils Sammeldokumente (Lebenslauf, Rollenverzeichnis), die mehrere Orte und Spielstätten bündeln. Raumzeitlich exakt ist nur die Ereignis-Achse mit ihren vier verorteten Events. Eine ehrliche Visualisierung muss diese zwei Schärfegrade auseinanderhalten und darf die Record-Kopplung nicht als Bayreuth-Auftrittsnachweis ausgeben. Das ist die Anwendung des Erschließungsspiegel-Prinzips (E-87, E-88) auf den Bayreuth-Fokus.

## Definitionen

Arbeitsbegriffe für diese Aufgabe, damit Klärung und Umsetzung dieselbe Sprache sprechen.

- Bayreuth-Bezug (Record-Ebene). Ein Dokument, das Bayreuth als Ort führt (`rico:hasOrHadLocation`, Stadt-Ebene Bayreuth). Weite, unscharfe Kopplung. Aktuell neun Records.
- Bayreuth-Verortung (Ereignis-Ebene). Ein `m3gim:SpatiotemporalEvent` mit `atPlace` Bayreuth, mit Datum und Koordinaten. Enge, raumzeitlich exakte Kopplung. Aktuell vier Events.
- Akteur. Eine Person über `m3gim:hasAssociatedAgent`, also belegt mitwirkend (Sänger, Dirigent, Regie, Korrespondenzpartner).
- Erwähnte Subjekt-Person. Eine Person über `rico:hasOrHadSubject` mit `@type rico:Person`, also genannt oder besprochen, oft Komponist. Kein Beleg für eine direkte Zusammenarbeit.
- Annotierte Beziehung gegen Ko-Okkurrenz. Annotiert heißt explizit als AgRelOn-Relation erfasst (für Bayreuth fast leer). Ko-Okkurrenz heißt aus der gemeinsamen Nennung in einem Dokument abgeleitet (die Hauptquelle des Bayreuth-Netzes).
- Zwei Schärfegrade. Im selben Record wie Bayreuth (weit) gegen nachweislich in Bayreuth (eng). Die Unterscheidung ist die wichtigste Designvorgabe dieser Aufgabe.

## Relevante Frontend-Bausteine

| Baustein | Status | Bezug zum Bayreuth-Fokus |
|---|---|---|
| Netzwerk-Tab | aktiv | Konzentrische Personen-Visualisierung um Malaniuk, zwei Ringe nach Evidenzstärke, Rolle als Füllfarbe, AgRelOn-Radiallinien gegen Ko-Okkurrenz-Bänder, Filter-Sidebar mit Zeitfenster (E-93, E-94). Ein Bayreuth-Schnitt ließe sich über Zeitfenster (1951 bis 1958) und einen Ortsbezug ansetzen. |
| Mobilitäts-Atlas | verborgen | Leaflet-Karte plus D3-Zeitstrahl auf `store.mobilityEvents`, die natürliche Heimat der Bayreuth-Reisebewegung. Reaktivierung ist ein Gate (E-81, E-76). |
| Indizes | aktiv | Orte-Grid mit Bayreuth als Eintrag, Cross-Grid-Facettensuche auf Personen, Organisationen, Orte, Werke. |
| Statistik | aktiv | Geografie-Sektion mit Top-Orten, Mobilitätssichten, Netzwerk-Typen, read-only Showroom ohne Interaktion (E-85, E-89). |
| Designsystem | aktiv | Ortsfarbcodierung Bayreuth in `variables.css`, view-übergreifend. |

## Designleitplanken

Die Designhaltung in [design.md](design.md) bindet auch diese Arbeit. Die für eine Visualisierung wichtigsten Regeln und Anti-Muster.

- Determinismus vor Schönheit. Gleiche Daten ergeben gleiche Grafik, analytisches oder seeded Layout statt unkontrollierter Force-Simulation. Der Netzwerk-Tab setzt das mit polar-analytischen Positionen bereits um.
- Tabelle vor Chart für Rankings. Ein Diagramm ist nur begründet, wo Raum oder Zeit selbst die Information ist, also im Atlas und im Biogramm.
- Erst statisch lesbar, dann Interaktion. Die sechs entfernten D3-Prototypen litten durchgängig an zu viel Toolbar-Chrome.
- Keine redaktionelle Deutung im UI. Alles Gerenderte muss aus den Daten ableitbar sein, handverdrahtete Karriere-Labels sind unzulässig (E-87).
- Datenqualität zeigen, nicht mergen. Lücken, Dubletten und Tippfehler stehen so da, wie sie im Bestand liegen, das Interface ist ein Erschließungsspiegel.
- Rolle-Prefix-Chips als universelles Daten-Atom, ein Muster für Einzelbeleg, Aggregat und Beziehung.
- Übernommene Lektionen. Skalenbruch als bewusste Geste an der Flucht 1944, durchgehende Ortsfarbcodierung, Kern-Peripherie-Schnitt gegen Überladung, Signal-Rot ausschließlich für die Flucht 1944.

## Visualisierungsansatz (erarbeitete Empfehlung)

Die Ansatzwahl ist eine Richtungsentscheidung und bleibt operator-gated. Aus der Datenlage lässt sich aber eine begründete Empfehlung ableiten, die hier vorbereitet vorliegt.

Drei Optionen stehen zur Wahl.

- a) Eigener Bayreuth-Ortsfokus als neue dedizierte Ansicht. Erfüllt die Drei-Achsen-Kopplung am direktesten, trägt aber den höchsten Bauaufwand und stünde auf schmaler Datenbasis (vier Events, neun Records), was eine große eigene Ansicht schwer rechtfertigt.
- b) Orts- und Zeitschnitt im bestehenden Netzwerk-Tab. Nutzt bewährte, deterministische Bausteine (Layout, Zeitfenster, Rolle als Füllfarbe), zeigt aber von sich aus nur die Netzwerk-Achse, nicht die geforderte Kopplung mit Rolle und Mobilität.
- c) Reaktivierung des Mobilitäts-Atlas mit Bayreuth-Schwerpunkt. Der Atlas lohnt sich über den Gesamtbestand der raumzeitlichen Ereignisse, für Bayreuth allein blieben vier Kartenpunkte. Zudem ist die Reaktivierung ein eigenes Gate (Leaflet-CDN, datumslose E-97-Ortsrollen).

Empfehlung. Den Bayreuth-Fokus als gekoppelten Schnitt im bestehenden Netzwerk-Tab realisieren, erweitert um Rolle und Mobilität, statt einer schweren neuen Ansicht oder des Atlas. Konkret bekommt der Netzwerk-Tab einen Orts-Fokus auf die Bayreuth-Records, der das Akteurs-Ko-Okkurrenznetz um Malaniuk auf den Bayreuth-Kontext einschränkt, die vier datierten Events als Zeitanker (1951 bis 1953) nutzt und die Wagner-Partien als Rollenkontext zeigt. Das koppelt die drei Achsen an einem Ort, nutzt bestehende Bausteine, respektiert die Leitplanke erst statisch lesbar und macht aus der schmalen, aber sauberen Datenlage das Maximum, ohne Substanz vorzutäuschen.

Der Mobilitäts-Atlas bleibt ein eigenständiges, späteres Vorhaben für den gesamten Ereignisbestand, nicht das Vehikel für den Bayreuth-Fokus.

Diese Empfehlung ist eine Vorentscheidung. Baubeginn erst nach Freigabe durch Operator oder Orchestrator.

## Klärungsvorlage für die Forschungsleitstelle

Durchnummerierte Agenda der offenen Punkte, gedacht zum Durchgehen in der Leitstelle. Jeder Punkt nennt Hintergrund, Optionen und, wo möglich, meine erarbeitete Empfehlung. Status ist überall offen, bis der Operator oder der Orchestrator entscheidet. Die zentrale Designentscheidung ist zusätzlich kanonisch in [decisions.md](decisions.md) unter Offene Entscheidungen verzeichnet.

Offene Designentscheidungen und Fragen.

- K1, Visualisierungsansatz. Welcher der drei Wege wird gebaut, a eigener Bayreuth-Ortsfokus, b Schnitt im Netzwerk-Tab, c Atlas-Reaktivierung. Empfehlung b, erweitert um Rolle und Mobilität. Richtungsentscheidung, operator-gated.
- K2, Atlas-Reaktivierung. Soll der Mobilitäts-Atlas überhaupt zurückkommen, und wenn ja, für den Gesamtbestand oder Bayreuth-spezifisch. Hintergrund in E-81 und E-76, das Reaktivieren erfordert Leaflet-CDN, die Behandlung der datumslosen E-97-Ortsrollen im Zeitstrahl und der unverorteten adressgenauen Orte. Empfehlung, als eigenes Vorhaben vom Bayreuth-Fokus trennen.
- K3, Zweck der Ansicht. Soll sie eine Forschungsfrage beantworten (etwa, hat Bayreuth Malaniuks Netz erweitert) oder ein Schaufenster sein. Das ändert, welche Achse in den Vordergrund tritt. Klärungsbedarf, keine Empfehlung ohne deine Zielsetzung.
- K4, Umgang mit der Record-Unschärfe. Zeigt die Ansicht nur das raumzeitlich Sichere (die vier Events) oder den weiteren Record-Kontext (alle neun Dokumente mit ihren Personen und Rollen) mit klarer Kennzeichnung der Schärfegrade. Empfehlung, den Kontext zeigen, aber die zwei Schärfegrade sichtbar trennen (Erschließungsspiegel statt Auftrittsnachweis).
- K5, Rollen-Filterung. Sollen die Nicht-Bayreuth-Partien (Carmen, Aida, Lady Macbeth), die über Sammelrecords mitlaufen, ausgeblendet, markiert oder mitgezeigt werden. Hängt eng an K4.

Zu verifizieren, der verify-not-trust-Kern.

- V1, Zeitspanne. Verifiziert am 2026-06-20 (feldgenaue Analyse über den Scout). In den neun Bayreuth-Records gibt es kein Datum nach 1953, das einzige 1954 ist das Sterbedatum einer erwähnten Person, kein Bayreuth-Ereignis. Die in research.md genannten Festspieljahre bis 1958 sind in der Datengrundlage (UAKUG/NIM) nicht als Record oder Event belegt. Konsequenz, die Visualisierung zeigt Bayreuth ehrlich als 1951 bis 1953 und macht die Lücke 1954 bis 1958 als Erschließungslücke transparent, statt die Literatur-Spanne vorzutäuschen. Das verstärkt die Empfehlung gegen eine schwere eigene Ansicht, die Datenlage ist auch zeitlich schmal. Nebenbefund als Datenqualitätsticket, NIM_004_5 trägt `rico:date` 1963-03-06 bei `erscheinungsdatum` 1953-03-05, vermutlich ein Tippfehler 1963 statt 1953.
- V2, Wikidata-Identität. Verifiziert am 2026-06-20 gegen Live-Wikidata, korrekt. `wd:Q3923` ist Bayreuth, Bayern, Deutschland (Oberfranken), Koordinaten 49.948 / 11.578, deckungsgleich mit den Daten. Kein Fehl-Match wie der frühere Q2861-Rostock-Fall (E-78). Die Bayreuth-Ortsidentität ist belastbar.
- V3, Scout gegen Live-Frontend. Mein Scout bildet die Loader-Logik nach. Die Bayreuth-Zahlen sind einmal im Browser gegen das echte Frontend gegenzuprüfen (Ortsindex, Netzwerk-Tab), damit Nachbau und Laufzeit übereinstimmen.
- V4, Sicherungsstand. Der Git-Anker wird immer real erhoben, nie aus dem Gedächtnis. Uncommittete Arbeit zählt als gefährdet.

## Technischer Rahmen und rote Linien

- Statische SPA in `docs/`, Vanilla JS mit ES-Modulen, D3 v7 via CDN, Leaflet für den Atlas, kein Build-Tool, Hosting auf GitHub Pages.
- `docs/data/` wird ausschließlich über die Pipeline geschrieben (`scripts/transform.py`, dann `scripts/build-views.py`), nie direkt editieren.
- Keine Commits ohne ausdrückliche Aufforderung, keine destruktiven Git-Operationen, Pre-commit-Hooks nicht umgehen.
- DSGVO-sensible Dokumente liegen nur im Obsidian-Vault, nie im Repo.

## Forschungsleitstellen-Einbettung

Die Lane heißt m3gim. Anweisungen kommen über `reports/order-m3gim.md` im forschungsleitstelle-Repo, Meldungen gehen über `reports/handoff-m3gim.md` zurück. Es gilt verify-not-trust, der Git-Stand ist die Wahrheit, nicht der Selbstbericht. Quantitäten werden nur git-deterministisch oder als committetes Artefakt belegt, die Zahlen dieses Dokuments sind über `scripts/scout-coverage.py` reproduzierbar. Gearbeitet wird ein abgegrenzter Schritt pro order, danach folgt ein neuer handoff. Dieses Dokument ist die Klärungsvorlage, auf die der handoff verweist, sodass die Forschungsleitstelle die offenen Fragen, Definitionen und Entscheidungen über den Repo-Lesezugriff einsehen kann.
