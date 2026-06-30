---
title: Forschungsrahmen
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.2
created: 2026-02-19
updated: 2026-06-30
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
related: [project, data, specification, data-entry-guidelines]
---

# Forschungsrahmen

> Theorie, Forschungsfragen, die Mobilitätstypen und der Kontext des Grazer Opernhauses.

## Theoretischer Rahmen

M³GIM verortet sich im Feld der Mobility Studies und erweitert diese um musikwissenschaftliche und genderspezifische Perspektiven.

- **Mobility Turn**: Urry (2007), Hannam/Sheller/Urry (2006) liefern die Basis.
- **Musikwissenschaftlich**: Silke Leopold (Analecta musicologica 49, 2013) plädiert, „Migrantendasein nicht als defizitär, sondern als musikalische Identität zu begreifen."
- **Kulturtheoretisch**: Greenblatt et al., *Cultural Mobility* (2010).
- **Projektnah**: Nicole K. Strohmann erweitert Mobilität über die geografische Dimension hinaus: „Formen von mentaler, kultureller, intellektueller, kompositorischer, sängerischer usw. Bewegung." Die analytische Unterscheidung von **Motilität** (Bewegungsfähigkeit) und realisierter **Mobilität** ist zentral.

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

Die Bayreuther Spanne 1951–1958 ist ein Wert aus der Sekundärliteratur. Die Datengrundlage des Teilnachlasses (UAKUG/NIM) belegt für Bayreuth nur 1951–1953; zur Auflösung dieser Diskrepanz siehe [visualisierung-bayreuth.md](visualisierung-bayreuth.md).

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

## Quellen

- Strohmann/Bagge (Hrsg.), *Kulturelles Handeln | Macht | Mobil*, Böhlau 2023
- Urry, *Mobilities*, 2007
- Leopold, *Analecta musicologica* 49, 2013
- Greenblatt et al., *Cultural Mobility*, 2010
- Antrag Steegmann Foundation (M³GIM, eingereicht 2026-01-10 — nicht im Repo, DSGVO, liegt im Obsidian-Vault)
