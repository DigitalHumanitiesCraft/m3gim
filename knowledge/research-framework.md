---
title: Forschungsrahmen
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: reviewed
language: de
version: 0.4
created: 2026-02-19
updated: 2026-08-21
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Domänenwissen
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/domain-knowledge
topics: ["[[Mobility Studies]]", "[[Music History]]", "[[Gender Studies]]", "[[Biography]]"]
related: [specification, data, data-entry-guidelines, design, frontend-architecture, architecture-decisions]
---

# Forschungsrahmen

> Theorie, Forschungsfragen, die Mobilitätstypen, der Kontext des Grazer Opernhauses sowie die Operationalisierung der Forschungsfragen als Use Cases mit Personas und Evaluationsskizze.

## Theoretischer Rahmen

M³GIM verortet sich im Feld der Mobility Studies und erweitert diese um musikwissenschaftliche und genderspezifische Perspektiven.

- **Mobility Turn**: Urry (2007), Hannam/Sheller/Urry (2006) liefern die Basis.
- **Musikwissenschaftlich**: Silke Leopold (Analecta musicologica 49, 2013) plädiert, „Migrantendasein nicht als defizitär, sondern als musikalische Identität zu begreifen."
- **Kulturtheoretisch**: Greenblatt et al., *Cultural Mobility* (2010).
- **Projektnah**: Die Projektleitung erweitert Mobilität über die geografische Dimension hinaus: „Formen von mentaler, kultureller, intellektueller, kompositorischer, sängerischer usw. Bewegung." Die analytische Unterscheidung von **Motilität** (Bewegungsfähigkeit) und realisierter **Mobilität** ist zentral.

### DH-Vorläufer

Verwandte Digital-Humanities-Projekte, beide auf die Frühe Neuzeit beschränkt:

- **MUSICI** — Goulet/zur Nieden, [musici.eu](https://musici.eu)
- **MusMig** — Katalinic, Zagreb

M³GIM schließt die Lücke zum 20. Jahrhundert und erprobt dafür eine RiC-O-1.1-basierte Modellierung (siehe [data.md](data.md)).

## Mobilitätstypen

Am Fallbeispiel Ira Malaniuk (siehe [Fallbeispiel Ira Malaniuk](#fallbeispiel-ira-malaniuk)) operationalisiert:

1. **Nationale Mobilität** — durch Heirat bedingte Statusveränderungen
2. **Geografische Mobilität** — Pendeln zwischen Engagements
3. **Erzwungene Migration** — Flucht und Vertreibung (bei Malaniuk 1944 aus der Ukraine)
4. **Bildungs- und Ausbildungsmobilität** — Professionalisierung an wechselnden Stätten
5. **Lebensstil-Migration** — dauerhafte Verlagerung des Lebensmittelpunkts

Diese Typen werden im Frontend über die Mobilitätssichten (siehe [data.md](data.md)) operationalisiert und in der Chronik und der Statistik sichtbar gemacht (siehe [design.md](design.md)).

## Fallbeispiel Ira Malaniuk

Die ukrainisch-österreichische Mezzosopranistin Ira Malaniuk (1919–2009) ist das konkrete Fallbeispiel des Projekts. Ihre Biografie verkörpert die oben benannten Mobilitätstypen und verbindet die theoretische Begründungsschicht mit einer durchgehend dokumentierten Lebensbewegung.

### Biografische Stationen

| Jahr | Ort | Ereignis |
|---|---|---|
| 1919 | Stanislau (Ukraine) | Geburt |
| Kindheit | Lemberg | Aufwachsen |
| 1937–1944 | Lemberg | Gesangsstudium am Konservatorium |
| 1944 | → Österreich | Flucht (erzwungene Migration) |
| 1945–1947 | Graz | Erstes Festengagement als Altistin am Grazer Opernhaus |
| 1947–1952 | Zürich | Engagement |
| 1952–1956 | München | Bayerische Staatsoper |
| 1956–1971 | Wien | Wiener Staatsoper |
| 1951–1958 (Literatur) | Bayreuth | Festspiel-Gastspiele |
| 1951–1963 | Salzburg | Festspiel-Gastspiele |
| 1970–2000 | Graz | Professorin für Liedinterpretation an der KUG |
| 2009 | Zirl (Tirol) | Gestorben |

Die Bayreuther Spanne 1951–1958 ist ein Wert aus der Sekundärliteratur. Die Datengrundlage des Teilnachlasses (UAKUG/NIM) belegt für Bayreuth nur 1951–1953; in den Bayreuth-Records gibt es kein Datum nach 1953, das einzige 1954 ist das Sterbedatum einer erwähnten Person. Die Festspieljahre bis 1958 sind im Teilnachlass weder als Record noch als Ereignis belegt (feldgenau verifiziert am 2026-06-20). Die Anwendung zeigt Bayreuth deshalb als 1951–1953 und weist die Spanne 1954–1958 als Erschließungslücke aus, statt die Spanne der Literatur vorzutäuschen.

Internationale Gastspiel-Stationen umfassen das Teatro Colón Buenos Aires, das Royal Opera House London, die Mailänder Scala, Lissabon und Paris.

### Künstlerische Zusammenarbeit

Malaniuk trat mit prägenden Dirigenten und Regisseuren auf, darunter Herbert von Karajan, Wilhelm Furtwängler, Hans Knappertsbusch, Wieland Wagner, Bruno Walter, Joseph Keilberth und Georg Solti.

Ihre Repertoire-Schwerpunkte lagen bei Wagner (Waltraute, Brangäne, 2. Norn, Fricka), Verdi, Mozart, Strauss und Mahler (Das Lied von der Erde) sowie im Konzert- und Liedgesang.

### Bezug zu den Mobilitätstypen

1. **Erzwungene Migration** — 1944, Flucht aus der Ukraine.
2. **Bildungs- und Ausbildungsmobilität** — Konservatorium Lemberg, Professionalisierung in Graz, Zürich und München.
3. **Geografische Mobilität** — Pendeln zwischen Engagements (Zürich, München, Wien) und Festspielen.
4. **Nationale Mobilität** — österreichische Staatsbürgerschaft durch Heirat, kuk-biografische Kontinuität.
5. **Lebensstil-Migration** — dauerhafte Verlagerung nach Wien (ab 1956), später nach Zirl.

Zur theoretischen Einordnung dieser Typen siehe [Mobilitätstypen](#mobilitätstypen).

Zu Malaniuk besteht keine eigenständige wissenschaftliche Literatur. Das Projekt leistet die ersten archivgestützten Erschließungsarbeiten am Teilnachlass UAKUG/NIM (siehe [data.md](data.md)).

## Forschungsfragen

**FF1.** Wie prägten Sängerinnen und Sänger die Musik- und Theaterkultur von Graz, und welche Rolle spielte ihre Mobilität für Professionalisierung und Vernetzung?

**FF2.** Welche narrativen und ästhetischen Strukturen wurden durch Migration beeinflusst, und wie trugen diese zur Transformation des Operngenres nach dem Zweiten Weltkrieg bei?

**FF3.** Wie wurde Musiktheaterwissen durch Mobilität transferiert und in neuen Kontexten adaptiert?

**FF4.** Welche spezifischen Mobilitätsformen lassen sich am Beispiel Malaniuks identifizieren, und wie beeinflussten diese ihre Karriere sowie die Wissensproduktion?

**Hypothese.** Die Mobilität von Sängerinnen war nicht nur Voraussetzung für Karrieren, sondern Katalysator für neue Wissenskulturen und ästhetische Paradigmen im Musiktheater.

**Machbarkeit.** Die Pilotstudie evaluiert, ob

1. die Archiveinheiten des Teilnachlasses (siehe [data.md](data.md)) mit RiC-O 1.1 + m3gim-Erweiterung + AgRelOn praktikabel erschließbar sind,
2. die Verfahren auf größere Datensätze skalieren,
3. der Transfer auf eine FWF-Folgestudie (Sängerinnen an europäischen Kulturmetropolen, 19./20. Jh.) möglich ist.

## Forschungskontext: Oper Graz

Das Grazer Opernhaus (Fokus 1945–1969) dient als Nukleus der Mobilitätsanalyse. Malaniuk verkörpert das Narrativ „Graz als Sprungbrett".

**Literatur**

- List, *Oper und Operette in Graz* (1974, chronikalisch)
- Nemeth, *Operngeschichte abseits der Routine* (Diss. 2005, zur Intendanz Carl Nemeth)
- Brüstle (Hrsg.), *Musikerinnen in Graz und in der Steiermark* (2020)

**Forschungslücken**

- NS-Zeit am Opernhaus
- Mobilität von Opernsängerinnen mit Graz-Bezug
- Transnationale Verflechtungen
- Systematische Analyse künstlerischer Bewegungen und lokaler Netzwerke

## Personas (ausarbeiten)

Wen bedient das Tool? Vorläufig aus FF1–FF4 und der Partner-Konstellation abgeleitet; mit den realen Bedürfnissen aus der Partner-Rückmeldung zu schärfen.

### P1 — Musikwissenschaftliche Forscherin (Kern-Persona)

- **Kontext:** KUG-Forschungsteam, arbeitet an Mobilität und Wissensproduktion von Sängerinnen.
- **Ziel:** Malaniuks Bewegungen, Auftrittsformen und Netzwerke als Evidenz für FF1/FF4 lesen und einzelne Befunde bis zur Quelle zurückverfolgen.
- **Braucht:** Differenzierung der Auftrittsarten (Gastspiel vs. Engagement vs. Reise), räumlich-zeitliche Übersicht, Rücksprung in den belegenden Bestand.
- **Aufgaben:** die Aufgaben 1 bis 5 im Abschnitt [Evaluation](#evaluation). Was die Partner-Rückmeldung an eigenen Erwartungen ergibt, kommt dort hinzu.

### P2 — DH-Methodikerin / Modelliererin

- **Kontext:** Erschließung und Modellierung (RiC-O + m3gim + AgRelOn), prüft Praktikabilität und Skalierung (Machbarkeitsfrage oben).
- **Ziel:** Erschließungsgrad, Datenlücken und Modell-Tragfähigkeit sichtbar machen.
- **Braucht:** ehrliche Deckungsanzeigen (datiert/verortet/undatiert), Erschließungsspiegel, Provenienz.
- **Aufgaben:** die Aufgaben 6 bis 8 im Abschnitt [Evaluation](#evaluation).

### P3 — Erschließung / studentische Hilfskraft

- **Kontext:** befüllt und korrigiert die Quell-Spreadsheets.
- **Ziel:** sieht, welche Felder fehlen oder inkonsistent sind (z. B. fehlende `datenpunkt_id`, Namensvarianten).
- **Braucht:** Rückmeldung aus dem Tool über Datenqualitätssignale; die Erschließungssicht der Statistik und die Vorschlagsliste aus `scripts/propose-links.py` sind die beiden Stellen, an denen sie ankommt.
- **Aufgaben:** die Aufgaben 9 und 10 im Abschnitt [Evaluation](#evaluation).

### P4 — Externe Nachnutzung / FWF-Folgestudie *(optional, ausarbeiten)*

## Use Cases (aus den Forschungsfragen)

Schema je Use Case: **FF-Bezug · Frage · benötigte Daten · UI-Baustein (Stand) · Datendeckung · offen**. Der Stand bezieht sich auf das Statistik-Dashboard (E-123) und die Mobilitäts-Chronik (E-124); querschnittlich greift der geplante Cross-View-Filter ([frontend-architecture.md](frontend-architecture.md) § Cross-View-Filter, Milestone 4). Exakte Deckungszahlen sind dem [Quality-Snapshot](../data/reports/quality-snapshot.md) zu entnehmen, nicht diesem Text; hier nur die Größenordnung und die ehrliche Grenze.

### UC-1 — Wohin und wann bewegte sie sich? (FF4)

- **Frage:** Räumlich-zeitliches Bewegungsprofil über die Karriere.
- **Daten:** SpatiotemporalEvents mit `atPlace`/`placeCountry`/`atDate`; Records mit `rico:date`.
- **UI (Stand):** Chronik als temporale Achse (E-124: Sicht-gefärbter Jahres-Zeitstrahl plus kollabierbarer Dekaden-Sicht-Header), Karte als räumliche Achse (entitätszentriert, E-126), Statistik „Wohin & Wann" als Aggregat.
- **Deckung:** Die Masse des datierten Materials klumpt in den 1950ern; nur wenige Lebensdekaden sind überhaupt belegt. Die Chronik ist damit ehrlich eine Erschließungs-Momentaufnahme der München-/Bayreuth-Jahre, kein Karriere-Bogen über die Lebensspanne. Dichte = Überlieferung, nicht Aktivität, als Caption ausgewiesen.
- **Offen:** Ort×Zeit und Karte noch nicht gekoppelt; der Cross-View-Filter würde Chronik, Karte und Statistik auf denselben Schnitt bringen.

### UC-2 — Welche Art von Mobilität? Gastspiel vs. Engagement vs. Reise (FF1/FF4)

- **Frage:** Auftrittsformen differenziert sehen (Partnerfrage „alle Gastspiele").
- **Daten:** `eventRole` (gastspiel/aufführung/spielzeit …), gruppiert zu den Sichten performativ, institutionell, Reise und Korrespondenz, biografisch, diskursiv (`mobilityClusterFor`).
- **UI (Stand):** Statistik „Art der Mobilität" (Sichten plus feine Auftrittstypen), Chronik (Sicht als linker Akzentbalken am Record-Chip, E-124).
- **Deckung:** `gastspiel` als eigene Rolle sichtbar. Aber nur ein Teil der Chronik-Chips trägt überhaupt eine Sicht (der Rest hat kein SpatiotemporalEvent); die sicht-losen Chips bleiben monochrom, die Monochromie ist die ehrliche Aussage „keine Sicht erschlossen". `biografisch`/`diskursiv` sind faktisch leer; eine Legende, die alle Sichten gleichberechtigt zeigt, täuscht Ausgewogenheit vor. `korrespondenz`-Dominanz teils ein E-110-Mapping-Artefakt (datumslose Ortsrollen).
- **Offen:** Ensemble-/Institutions-Zuordnung pro Ereignis nicht erfasst, Gastspiel daher nicht nach Ensemble auswertbar (Datenstufe, siehe [specification.md](specification.md) § Stand und nächste Schritte).

### UC-3 — Wie international war ihre Karriere? (FF1)

- **Frage:** Geografische Reichweite und Schwerpunktverschiebung über die Zeit.
- **Daten:** `placeCountry`/`atPlace` (Q-IDs) über Events; Records mit Ort und `rico:date`.
- **UI (Stand):** Statistik „Wohin & Wann" → Reichweite (Länder); Chronik → Top-Orte je Dekade über Q-ID (E-124, Ort-Label aus aufgelöstem Q-ID, nicht rohem `.name`).
- **Deckung:** Orte sind upstream zu Wikidata-Q-IDs rekonziliert (Doppel-Anker Wikidata plus Archiv); ein kleiner unrekonzilierter Rest (QF-16) bleibt. Schwerpunktwechsel stützt sich auf die breiten 1950er; die spätere Basis ist zu dünn für eine belastbare Verschiebungs-Aussage.
- **Offen:** Land×Zeit als eigener Schnitt; Institution pro Ereignis fehlt (siehe UC-2).

### UC-4 — Mit wem war sie verbunden? (FF1/FF3)

- **Frage:** Beziehungsgeflecht und prägende Kontakte.
- **Daten:** AgRelOn-Relationen (Typ plus benannter Partner).
- **UI (Stand):** Statistik „Mit wem" (Typ-Donut ↔ benannte Partner mit Typ-Drill), Netzwerk-Tab.
- **Deckung:** dünn, wenige Relationen mit benanntem Gegenüber; Normalisierungs-Dubletten (QF-15).
- **Offen:** Verknüpfung Beziehung↔Ereignis/Ort fehlt; reichere Variante wäre Ko-Okkurrenz (erschlossenes Umfeldnetz, klar zu etikettieren). Keine belastbare zeitliche Achse (Relationen sind record-, nicht ereignisbasiert), daher nicht in die Chronik gezogen.

### UC-5 — Welches Repertoire sang sie, wo? (FF2/FF3), niedrige Priorität für eine zeitliche Aussage

- **Frage:** Künstlerische Mobilität, Werke und Partien über Orte und Zeit.
- **Daten:** Werke (`komponist`), Performances/StageRoles, Records mit Werk- und Ortsbezug.
- **UI (Stand):** Statistik „Repertoire" (Top-Komponisten), flach. In der Chronik nur als Begleitspur am Chip denkbar, keine eigene Achse.
- **Offen:** Performances tragen fast nie ein eigenes Datum (sie erben das Record-Datum und damit den 1950er-Klumpen); als eigenständige zeitliche Entwicklungs-Frage trägt UC-5 kaum. Werk×Ort/Werk×Partie am Ereignis nicht verknüpft (Datenstufe).

### UC-6 — Wo und wann entstand welches Wissen? (FF3)

- **Frage:** Rezeption/Wissensproduktion (Rezensionen, Rundfunk, Druck) verorten.
- **Daten:** diskursive Sicht plus Dokumenttypen.
- **UI (Stand):** „Art der Mobilität" (diskursive Sicht) plus „Dokumenttypen".
- **Offen:** Die diskursive Sicht ist datenseitig sehr dünn; ein eigener diskursiver Schnitt lohnt erst mit mehr Erschließung. *(ausarbeiten)*

*(ausarbeiten: weitere UCs der Personas P2/P3, z. B. „Erschließungslücken finden", „Datenqualität prüfen".)*

## Evaluation

Leitfrage: Macht das Tool die Forschungsfragen *beantwortbar*, und für wen? Die Antwort fällt je Use Case, nicht für das Tool im Ganzen. Ein Use Case gilt als beantwortbar, wenn die Person aus der zugehörigen Persona ihre Aufgabe ohne Hilfestellung löst und den Befund bis zum belegenden Dokument zurückverfolgen kann.

### Aufgabenset

Jede Aufgabe ist so formuliert, dass sie gelingt oder scheitert, ohne Zwischenstufe. Die Beobachtung hält fest, ob sie gelöst wurde, wie viele Fehlwege dabei entstanden und an welcher Stelle die Person stockte.

Für die musikwissenschaftliche Forscherin (P1):

1. Nenne die Orte, an denen ein Auftritt zwischen 1950 und 1955 belegt ist, und öffne für einen davon das belegende Dokument (UC-1).
2. Zeige nur die Gastspiele und sage, wie viele der Auftrittsbelege damit wegfallen (UC-2).
3. Nenne die Länder, in denen der Bestand Auftritte belegt, und sage, welches davon am dünnsten belegt ist (UC-3).
4. Nenne eine benannte Beziehungsperson und das Dokument, das die Beziehung belegt (UC-4).
5. Nenne drei Werke des Repertoires und sage, ob der Bestand für eines davon einen Ort nennt (UC-5).

Für die Modelliererin (P2):

6. Sage für eine beliebige Sicht, wie viele Dokumente des Bestands ihre Auswertung tragen, und wo diese Angabe steht.
7. Finde ein Dokument, dessen Jahr nicht aus seinem eigenen Entstehungsdatum stammt, und sage, woher es kommt.
8. Sage, welcher Rollenwert im Interface ohne eigenen Vokabularbegriff geführt wird.

Für die Erschließung (P3):

9. Nenne die drei am dünnsten erschlossenen Konvolute und die Achse, die dort am häufigsten fehlt.
10. Nenne ein Dokument, dessen Titel einen Ort nennt, der nicht als Verknüpfung erfasst ist.

### Erfolgsmaße

- **Aufgabenerfolg.** Anteil der ohne Hilfestellung gelösten Aufgaben je Persona. Eine Aufgabe, die zwei von drei Personen scheitern lässt, benennt einen Interface-Mangel und keinen Einzelfall.
- **Rücksprung zur Quelle.** Für jeden Befund, den eine Aufgabe erzeugt, muss der Weg zum belegenden Dokument in der Anwendung selbst liegen. Scheitert der Rücksprung, ist der Befund für eine Publikation unbrauchbar.
- **Ehrlichkeit der Anzeige.** Nennt die Person von sich aus, dass eine Aussage auf einem Teil des Bestands beruht? Die Deckungsangabe an den entitätsgetriebenen Sichten und die Erschließungssicht sind die Stellen, an denen das ablesbar ist.
- **Fehldeutung.** Jede Stelle, an der eine Person eine Zahl für eine Aussage über den Gesamtbestand hält, obwohl sie den erschlossenen Teil meint, zählt als Befund gegen die Anzeige.

### Datengetriebene Vorprüfung

Vor jedem Durchgang mit Personen läuft die maschinelle Prüfung, damit eine gescheiterte Aufgabe nicht auf einen Datenstand zurückgeht, der die Frage gar nicht tragen kann.

- Die Deckung je Achse steht in der Erschließungssicht der Statistik; UC-1 bis UC-3 setzen eine belegte Zeit- und Ortsachse voraus, UC-4 eine benannte Beziehung, UC-5 einen Werkbezug.
- Der Smoke-Stempel je Sicht hält den Zustand maschinenlesbar fest und ist die Abbruchbedingung: bricht eine Sicht, wird ihre Aufgabe nicht getestet.
- Die aktuellen Zahlen stehen im [Quality-Snapshot](../data/reports/quality-snapshot.md), nicht in diesem Dokument.

### Offen

Zeitpunkt und Besetzung der Durchgänge sind Sache der Projektleitung. Ebenso offen ist, ob P4 (externe Nachnutzung) mit eigenen Aufgaben antritt oder erst mit der Folgestudie entsteht.

## Quellen

- Strohmann/Bagge (Hrsg.), *Kulturelles Handeln | Macht | Mobil*, Böhlau 2023
- Urry, *Mobilities*, 2007
- Leopold, *Analecta musicologica* 49, 2013
- Greenblatt et al., *Cultural Mobility*, 2010
- Antrag Steegmann Foundation (M³GIM, eingereicht 2026-01-10 — nicht im Repo, DSGVO, liegt im Obsidian-Vault)
