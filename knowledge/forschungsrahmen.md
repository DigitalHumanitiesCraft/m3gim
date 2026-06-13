---
title: Forschungsrahmen
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.1
created: 2026-02-19
updated: 2026-05-09
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
topics: ["[[Mobility Studies]]", "[[Music History]]", "[[Gender Studies]]"]
related: [status, ira-malaniuk, datenmodell, entscheidungen]
---

# Forschungsrahmen

> Theorie, Forschungsfragen, Mobilitätstypen und der Kontext des Grazer Opernhauses.

## Theoretischer Rahmen

M³GIM verortet sich im Feld der Mobility Studies und erweitert diese um musikwissenschaftliche und genderspezifische Perspektiven.

- **Mobility Turn**: Urry (2007), Hannam/Sheller/Urry (2006) liefern die Basis.
- **Musikwissenschaftlich**: Silke Leopold (Analecta musicologica 49, 2013) plädiert, „Migrantendasein nicht als defizitär, sondern als musikalische Identität zu begreifen."
- **Kulturtheoretisch**: Greenblatt et al., *Cultural Mobility* (2010).
- **Projektnah**: Nicole K. Strohmann erweitert Mobilität über die geografische Dimension hinaus: „Formen von mentaler, kultureller, intellektueller, kompositorischer, sängerischer usw. Bewegung." Die analytische Unterscheidung von **Motilität** (Bewegungsfähigkeit) und realisierter **Mobilität** ist zentral.

### DH-Vorläufer

Zwei verwandte Digital-Humanities-Projekte, beide auf die Frühe Neuzeit beschränkt:

- **MUSICI** — Goulet/zur Nieden, [musici.eu](https://musici.eu)
- **MusMig** — Katalinic, Zagreb

M³GIM schließt die Lücke zum 20. Jahrhundert und erprobt dafür eine RiC-O-1.1-basierte Modellierung (siehe [datenmodell.md](datenmodell.md)).

## Fünf Mobilitätstypen

Am Fallbeispiel [Ira Malaniuk](ira-malaniuk.md) operationalisiert:

1. **Nationale Mobilität** — durch Heirat bedingte Statusveränderungen
2. **Geografische Mobilität** — Pendeln zwischen Engagements
3. **Erzwungene Migration** — Flucht und Vertreibung (bei Malaniuk: 1944 aus der Ukraine)
4. **Bildungs- und Ausbildungsmobilität** — Professionalisierung an wechselnden Stätten
5. **Lebensstil-Migration** — dauerhafte Verlagerung des Lebensmittelpunkts

Die fünf Typen werden im Frontend über die Mobilitätssichten (siehe [datenmodell.md § 10](datenmodell.md)) operationalisiert und in der [Lebenspartitur-Visualisierung](frontend.md) sichtbar gemacht.

## Forschungsfragen

**FF1.** Wie prägten Sängerinnen und Sänger die Musik- und Theaterkultur von Graz, und welche Rolle spielte ihre Mobilität für Professionalisierung und Vernetzung?

**FF2.** Welche narrativen und ästhetischen Strukturen wurden durch Migration beeinflusst, und wie trugen diese zur Transformation des Operngenres nach dem Zweiten Weltkrieg bei?

**FF3.** Wie wurde Musiktheaterwissen durch Mobilität transferiert und in neuen Kontexten adaptiert?

**FF4.** Welche spezifischen Mobilitätsformen lassen sich am Beispiel Malaniuks identifizieren, und wie beeinflussten diese ihre Karriere sowie die Wissensproduktion?

**Hypothese.** Die Mobilität von Sängerinnen war nicht nur Voraussetzung für Karrieren, sondern Katalysator für neue Wissenskulturen und ästhetische Paradigmen im Musiktheater.

**Machbarkeit.** Die Pilotstudie evaluiert, ob

1. die Archiveinheiten des Teilnachlasses (siehe [ira-malaniuk.md](ira-malaniuk.md)) mit RiC-O 1.1 + m3gim-Erweiterung + AgRelOn praktikabel erschließbar sind,
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
