---
title: "Bayreuth 1953: Quellenanalyse und Integrationsbefund"
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: review
created: 2026-08-31
updated: 2026-08-31
language: de
version: 0.1
authors: [Christopher Pollin]
generated-with: Codex
related: [data, data-model, data-entry-guidelines, data-errors]
---

# Bayreuth 1953: Quellenanalyse und Integrationsbefund

## Ergebnis und Geltungsbereich

Die sieben Scans erschließen einen zusammenhängenden Quellenkomplex zu den Bayreuther Festspielen 1953. Die Hefte 3, 7, 8, 9, 10 und 11 belegen angekündigte Besetzungen einzelner Aufführungstage. Heft 12 dokumentiert die Festivalorganisation, den Saisonspielplan, die beteiligten Personen und Ensembles sowie biografische Angaben zu den Sängerinnen und Sängern. Diese Quellentypen tragen Aussagen mit verschiedener Reichweite. Der Integrationsentwurf hält Tagesaufführung, Saisonplanung, Personalbestand und Biografie daher getrennt.

Die Auswertung ist quellenkritisch geprüft und mit dem Datenstand des Repositorys vom 31. August 2026 abgeglichen. Sie bestätigt Besetzungsangaben, findet neue Verknüpfungen und weist Erfassungsfehler aus. Eine Aufführung im historischen Sinn gilt durch ein Programmheft als angekündigt. Für den Nachweis der tatsächlich realisierten Besetzung wären Aufführungsberichte, Abendzettel mit Korrekturen oder weitere zeitnahe Belege erforderlich.

## 1. Vorgehen

1. Alle 40 Scanseiten wurden gerendert und per OCR erschlossen. Die OCR diente als Such- und Transkriptionshilfe.
2. Datums-, Werk-, Rollen- und Namensangaben der Tagesprogramme wurden am Scan kontrolliert.
3. Heft 12 wurde nach physischen Folios, Inhaltssegmenten und Aussagearten gegliedert.
4. Die Angaben wurden quellenübergreifend verglichen. Abweichungen bleiben als verschiedene Quellenstände sichtbar.
5. Namen, Werke, Objektmetadaten und vorhandene Verknüpfungen wurden gegen die M3GIM-Arbeitsmappen, die Indizes und das erzeugte JSON-LD geprüft.

## 2. Quelleninventar

| Quelle | Umfang | Quellenart | Kernbeleg | M3GIM-Bezug |
|---|---:|---|---|---|
| `UAKUG_NIM_005_137_3.pdf` | 2 Scanseiten | Tagesprogramm | 11. August 1953, Beethovens 9. Sinfonie | Detaillierte Erfassung liegt unter Folio `3_22`; Elternobjekt 3 ist unverknüpft |
| `UAKUG_NIM_005_137_7.pdf` | 2 Scanseiten | Tagesprogramm | 25. Juli 1953, *Das Rheingold* | Objekt vorhanden, bisher ohne Verknüpfungen |
| `UAKUG_NIM_005_137_8.pdf` | 2 Scanseiten | Tagesprogramm | 26. Juli 1953, *Die Walküre* | Objekt vorhanden, bisher ohne Verknüpfungen |
| `UAKUG_NIM_005_137_9.pdf` | 2 Scanseiten | Tagesprogramm | 27. Juli 1953, *Siegfried* | Objekt vorhanden, bisher ohne Verknüpfungen |
| `UAKUG_NIM_005_137_10.pdf` | 2 Scanseiten | Tagesprogramm | 29. Juli 1953, *Götterdämmerung* | Objekt vorhanden, bisher ohne Verknüpfungen |
| `UAKUG_NIM_005_137_11.pdf` | 6 Scanseiten | Tagesprogramm mit Saisonrollenliste | 22. August 1953, *Tristan und Isolde*; zusätzlich „Wer singt was?“ | Objekt vorhanden, bisher ohne Verknüpfungen |
| `UAKUG_NIM_005_137_12.pdf` | 24 Scanseiten, 45 Folios | Festivalheft | Gesamtverzeichnis der Mitwirkenden, Spielplan, Besetzungsmatrix, Biografien | Objektmetadaten nur bis Folio 42; Folios 43 bis 45 fehlen |

## 3. Tagesprogramme als Aufführungsquellen

### 3.1 Heft 3: Beethovens 9. Sinfonie

Das Programm kündigt für Dienstag, den 11. August 1953, 20 Uhr, die 9. Sinfonie in d-Moll op. 125 von Ludwig van Beethoven an. Paul Hindemith dirigiert das Festspiel-Orchester und den verstärkten Festspielchor. Wilhelm Pitz verantwortet die Choreinstudierung. Die Solopartien übernehmen Birgit Nilsson, Ira Malaniuk, Anton Dermota und Ludwig Weber. Als Ende ist ungefähr 21.15 Uhr angegeben.

Der Bestand führt diese Angaben bereits unter `UAKUG/NIM_137`, Folio `3_22`. Drei Namen sind dort fehlerhaft geschrieben: `Nisson, Birgit`, `Weber, Ludiwig` und `Pilz, Wilhelm`. Die Scans belegen `Nilsson`, `Ludwig` und `Pitz`.

### 3.2 Heft 7: *Das Rheingold*

Das Programm vom Samstag, 25. Juli 1953, nennt Joseph Keilberth als Dirigenten, Wieland Wagner für Inszenierung und Gesamtausstattung und Gertrud Wagner für die Regieassistenz. Ira Malaniuk singt Fricka. Die vollständige Rollenbesetzung lautet:

| Rolle | Person |
|---|---|
| Wotan | Hans Hotter |
| Donner | Hermann Uhde |
| Froh | Gerhard Stolze |
| Loge | Erich Witte |
| Fasolt | Ludwig Weber |
| Fafner | Josef Greindl |
| Alberich | Gustav Neidlinger |
| Mime | Paul Küen |
| Fricka | Ira Malaniuk |
| Freia | Bruni Falcon |
| Erda | Maria von Ilosvay |
| Woglinde | Erika Zimmermann |
| Wellgunde | Hetty Plümacher |
| Floßhilde | Gisela Litz |

Die technische Liste nennt unter anderem Otto Wissner, M. Z. Klomp, Willi Klose, Josef Krott, Arthur Eisenschmidt, Hugo Schneider und Willi Schubert. Die bestehende Migrationsbeispielmappe führt für dieselbe Aufführung `Erna Schlöter` als Woglinde, `Arthur Eisenmenger` und Gertrud Wagner als Regisseurin. Das Tagesprogramm belegt Erika Zimmermann, Arthur Eisenschmidt und Regieassistenz. Diese drei Stellen müssen vor einer Übernahme aus der Beispielmappe korrigiert werden.

### 3.3 Heft 8: *Die Walküre*

Für Sonntag, den 26. Juli 1953, dokumentiert das Programm Joseph Keilberth, Wieland Wagner und Gertrud Wagner in denselben Leitungsfunktionen. Ira Malaniuk singt Fricka. Ramon Vinay ist Siegmund, Josef Greindl Hunding, Hans Hotter Wotan, Regina Resnik Sieglinde und Martha Mödl Brünnhilde. Die Walküren werden von Brünnhild Friedland, Bruni Falcon, Lise Sorrell, Maria von Ilosvay, Liselotte Thomamüller, Gisela Litz, Sibylla Plate und Erika Schubert gesungen.

### 3.4 Heft 9: *Siegfried*

Das Programm vom Montag, 27. Juli 1953, nennt Joseph Keilberth, Wieland Wagner und Gertrud Wagner. Wolfgang Windgassen singt Siegfried, Paul Küen Mime, Hans Hotter den Wanderer, Gustav Neidlinger Alberich, Josef Greindl Fafner, Maria von Ilosvay Erda, Martha Mödl Brünnhilde und Rita Streich den Waldvogel.

Ira Malaniuk ist in dieser Tagesbesetzung nicht aufgeführt. Dieser Befund grenzt die Aussage des konkreten Programmhefts ein; aus dem Fehlen entsteht keine eigene Beziehung im Datenmodell.

### 3.5 Heft 10: *Götterdämmerung*

Für Mittwoch, den 29. Juli 1953, führt das Programm Joseph Keilberth, Wieland Wagner und Gertrud Wagner sowie Wilhelm Pitz für den Chor. Ira Malaniuk übernimmt in derselben Aufführung Waltraute und die zweite Norn. Diese Doppelrolle ist ein aussagekräftiger Testfall für das Zielmodell: Eine datierte Mitwirkung derselben Person muss mehrere Bühnenrollen tragen können.

Die übrige Besetzung umfasst Wolfgang Windgassen als Siegfried, Hermann Uhde als Gunther, Josef Greindl als Hagen, Gustav Neidlinger als Alberich, Martha Mödl als Brünnhilde, Natalie Hinsch-Gröndahl als Gutrune, Maria von Ilosvay als erste Norn, Regina Resnik als dritte Norn sowie Erika Zimmermann, Hetty Plümacher und Gisela Litz als Rheintöchter.

### 3.6 Heft 11: *Tristan und Isolde* und „Wer singt was?“

Das Tagesprogramm vom Samstag, 22. August 1953, nennt Eugen Jochum als Dirigenten, Wieland Wagner für Inszenierung und Gesamtausstattung sowie Wilhelm Pitz für den Chor. Ramon Vinay singt Tristan, Ludwig Weber König Marke, Martha Mödl Isolde, Gustav Neidlinger Kurwenal, Hermann Uhde Melot und Ira Malaniuk Brangäne. Gerhard Stolze ist der Hirt, Alfons Herwig der Steuermann und Gene Tobin die Stimme eines jungen Seemannes.

Die zusätzliche Liste „Wer singt was?“ besitzt Saisonreichweite. Sie nennt vorgesehene Rollen und ist kein Beleg für eine bestimmte Tagesbesetzung. Werner Faulhaber erscheint dort für Donner, Steuermann und den zweiten Gralsritter. Heft 12 berichtet, dass er wenige Wochen vor den Festspielen starb. Die Tagesprogramme zeigen Ersatzbesetzungen: Hermann Uhde singt Donner am 25. Juli und Alfons Herwig den Steuermann am 22. August. Auch Ira Malaniuks zweite Norn fehlt in „Wer singt was?“, obwohl Heft 10 diese Rolle am 29. Juli belegt.

## 4. Heft 12 als Saison- und Personalquelle

### 4.1 Physische Struktur

Die 24 Scanseiten bilden 45 nummerierte Folios ab. Die Doppelseiten ab Scanseite 3 folgen fortlaufend der Zuordnung linkes und rechtes Folio. Scanseite 23 trägt sichtbar die Nummern 43 und 44, Scanseite 24 die Nummer 45. Das Objektverzeichnis endet derzeit bei Folio 42.

| Folios | Inhalt | Empfohlene Modellierung |
|---|---|---|
| 1–2 | Titel und Einführung | Metadaten des Festivalhefts |
| 3–4 | Festspielleitung | Organisation und Funktionszuweisungen auf Saisonebene |
| 5–6 | Dirigenten | Personen und Festivalfunktionen |
| 7–16 | Studienleitung und technische Leitungen | Saisonmitwirkungen mit Funktionsvokabular |
| 17–18 | Künstlerische Verwaltung und Einleitung der Sängerbiografien | Saisonorganisation und redaktioneller Übergang |
| 19–32 | Sängerbiografien | Personen, Ausbildungs- und Engagementereignisse, Gastspielorte |
| 33–34 | Verwaltung und vollständiger Spielplan | Rahmenveranstaltung und datierte Aufführungen |
| 35–36 | Gesamtverzeichnis und Solisten | Saisonmitwirkungen und Besetzungsplanung |
| 37–38 | Ring- und Beethoven-Besetzung; Beginn Orchesterliste | Werkbezogene Saisonplanung und Ensemblemitgliedschaft |
| 39–40 | Festspiel-Orchester | Ensemblemitgliedschaft 1953 |
| 41–42 | Festspielchor | Ensemblemitgliedschaft 1953 |
| 43–44 | Technik, Verwaltung, Werkstätten und weiteres Personal | Organisationseinheiten und Saisonmitwirkungen |
| 45 | Verlagsanzeigen und Bildrechte | Heftmetadaten und Rechtehinweise |

### 4.2 Spielplan und Besetzungsstände

Der Spielplan weist zwei Ring-Zyklen aus. Joseph Keilberth dirigiert den ersten Zyklus am 25., 26., 27. und 29. Juli. Clemens Krauss dirigiert den zweiten Zyklus am 8., 9., 10. und 12. August. Die Besetzungsmatrix markiert Alternativen mit I und II. Eine Saisonrolle darf deshalb erst nach Verbindung mit Datum und Zyklus als Tagesbesetzung gelesen werden.

Die Malaniuk-Biografie nennt Fricka, Waltraute in der *Götterdämmerung*, Brangäne und die 9. Sinfonie. Die Besetzungsmatrix ergänzt die zweite Norn. Heft 10 ordnet beide *Götterdämmerung*-Rollen der Aufführung am 29. Juli zu. Der Vergleich zeigt, dass Biografie, Saisonmatrix und Tagesprogramm einander ergänzen und verschiedene redaktionelle Auswahlprinzipien besitzen.

### 4.3 Personenabdeckung im M3GIM-Index

Die Sängerbiografien umfassen 40 Personen. 21 Namen ergeben nach Normalisierung einen exakten Namenstreffer im Personenindex. Dazu gehören Ira Malaniuk, Birgit Nilsson, Martha Mödl, Hans Hotter, Ramon Vinay, Wolfgang Windgassen und weitere zentrale Mitwirkende. Paul Küen und Gustav Neidlinger treffen dabei jeweils auf zwei Indexzeilen. Für 19 Namen fehlt ein exakter Namenstreffer. Diese Gruppe enthält echte Lücken, unvollständige Ansetzungen und Schreibvarianten, etwa `Hinsch-Gröhndal` gegenüber `Hinsch-Gröndahl`, `Resnik` gegenüber Regina Resnik und `Ilosvay` ohne Vornamen.

Die Biografien liefern zudem Laufbahnaussagen. Für Ira Malaniuk werden das Studium bei Adam Didur und Anna Bahr-Mildenburg, Engagements in Graz, Zürich und München sowie Gastspiele in Barcelona, Brüssel, Rom, Neapel, Venedig, Buenos Aires und England genannt. Solche Aussagen gehören als eigene Karriere- und Mobilitätsereignisse in die Erfassung. Eine bloße Dokumenterwähnung würde ihren zeitlichen und institutionellen Zusammenhang verlieren.

## 5. Verbindung mit dem M3GIM-Datenmodell

### 5.1 Entitäten und Beziehungen

Der Quellenkomplex lässt sich im beschlossenen Zielmodell folgendermaßen abbilden:

| Quellenaussage | Zielknoten | Benötigte Verbindung |
|---|---|---|
| Bayreuther Festspiele 1953 | Rahmenveranstaltung | Ort Bayreuth, Saison 1953, veranstaltende Organisation |
| Aufführung an einem konkreten Datum | Aktivität bzw. Vorkommnis | Werk, Datum, Aufführungsort, Teil der Rahmenveranstaltung |
| Mitwirkung einer Person | Teilnahme | Person, Funktion, zugehörige Aufführung oder Saison |
| Bühnenrolle | Rollenwert an der Teilnahme | eine oder mehrere Rollen je Teilnahme |
| Festspiel-Orchester und Festspielchor | Gruppe | saisonale Mitgliedschaften und Beteiligung an Aufführungen |
| Technik, Verwaltung und Werkstätten | Organisationseinheit oder saisonale Teilnahme | Funktion, Einheit und Saisonbezug |
| Ausbildungs-, Engagement- und Gastspielangabe | Karriere- oder Mobilitätsereignis | Person, Institution oder Ort, soweit genannt, mit Quellenprovenienz |

Die zwei Ebenen der Migrationsmappe passen zu den Tagesprogrammen: Eine ganzzahlige `aktivitaet_id` bezeichnet die Aufführung, eine dezimale Kennung die Teilnahme. Für Malaniuk am 29. Juli genügt eine Teilnahme mit zwei Rollenwerten. Zwei getrennte Teilnahmen würden eine künstliche Verdopplung derselben Mitwirkung erzeugen.

### 5.2 Werk- und Personenindizes

Die Werkzuordnung ist teilweise möglich. *Die Walküre* besitzt `W25`, *Götterdämmerung* `W40`, *Tristan und Isolde* `W86` und Beethovens 9. Sinfonie die geeignete Indexzeile `W99`. *Das Rheingold*, *Siegfried* und *Der Ring des Nibelungen* fehlen im Werkindex. Für *Götterdämmerung* und Beethovens 9. Sinfonie existieren zusätzlich Dubletten oder Schreibvarianten, die vor einer stabilen Import-ID geklärt werden müssen.

Auf Personenebene können vorhandene IDs genutzt werden, sofern Name und Person eindeutig übereinstimmen. Die saisonale Gesamtliste eignet sich als kontrollierte Erweiterungsgrundlage des Personenindex. Der Quellenbeleg trägt dabei die Schreibweise des Hefts, während die Indexansetzung nach den Projektregeln normiert wird.

### 5.3 Provenienz und Evidenzstatus

Jede importierte Aussage benötigt mindestens Archivsignatur, Folio oder Scanseite, Quellendatei und Prüfstatus. Für diesen Quellenkomplex sind vier Evidenzwerte zweckmäßig:

- `tagesprogramm`: datierte angekündigte Besetzung;
- `saisonliste`: geplanter oder zusammenfassender Saisonstand;
- `biografie`: redaktionelle Laufbahnaussage;
- `objektmetadatum`: Beschreibung des physischen Hefts.

Der Evidenzwert gehört zur Annotation oder zum Provenienznachweis. Dadurch bleiben widersprechende Besetzungen interpretierbar, ohne eine Quelle stillschweigend zu überschreiben.

## 6. Datenbefunde und erforderliche Korrekturen

1. Die Titel von Objekt 7 und 9 enthalten `Reihngold` und `Siegfreid`.
2. Heft 12 ist als `presse` klassifiziert. Der Inhalt entspricht der Projektdefinition von `program`.
3. Die Titelangaben zu Heft 12 enthalten ein nicht geschlossenes Anführungszeichen.
4. Für Heft 12 fehlen die Objektfolios 43 bis 45; mehrere frühere Folios besitzen unvollständige Metadaten.
5. Folio `3_22` führt drei quellenwidrige Personennamen: Nisson, Ludiwig und Pilz.
6. Die Beispielaufführung vom 25. Juli in `M3GIM-Verknuepfungen-v2.xlsx` enthält drei quellenwidrige Zuordnungen: Woglinde, Arthur Eisenschmidt und Gertrud Wagners Funktion.
7. Die aktuelle flache Saisonerfassung unter einem einzelnen Record trennt datierte Aufführungen und alternative Besetzungen unzureichend.
8. Die Datensätze 7 bis 11 besitzen im erzeugten JSON-LD noch keine Verknüpfungen.

Die ersten sieben Punkte sind Erfassungs- oder Modellierungsbefunde. Die Rohmappen bleiben in dieser Analyse unverändert. Die beiliegende Integrationsvorlage bereitet prüfbare Zeilen vor und markiert offene Indexentscheidungen.

## 7. Empfohlene Integrationsfolge

1. Objektmetadaten und Folios 43 bis 45 in der Erfassungsquelle ergänzen.
2. Schreibfehler in den Objekttiteln und in Folio `3_22` korrigieren.
3. Fehlende Personen und Werke in den Indizes anlegen oder vorhandenen Varianten kontrolliert zuordnen.
4. Die sechs Tagesprogramme als getrennte datierte Aufführungen mit Teilnahmen erfassen.
5. Heft 12 als Rahmenveranstaltungs-, Saison- und Personenquelle segmentweise auswerten.
6. Biografische Karriereangaben in einem eigenen Erfassungsgang modellieren und mit ihrer geringeren Datumspräzision kennzeichnen.
7. Nach dem Import die erzeugten Aufführungen, Teilnahmen und Quellenverweise im JSON-LD prüfen.

Die Integrationsvorlage unter `outputs/bayreuth-1953-source-analysis/` setzt die Schritte 3 bis 5 als Review-Arbeitsstand um. Sie ist eine fachlich geprüfte Transkription der ausgewerteten Stellen, jedoch keine aktive Installation in den M3GIM-Quelldaten.
