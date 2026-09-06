---
title: Research Framework
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: reviewed
language: en
version: 0.5
created: 2026-02-19
updated: 2026-09-05
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
related: [specification, data, data-model, design, architecture, journal]
---

# Research Framework

> Theory, research questions, the mobility types, the case study, the context of the Graz opera house, and the way the research questions reach the application as epics, personas and an evaluation instrument.

## Theoretical frame

M³GIM works in the field of mobility studies and extends it by a musicological and a gender-sensitive perspective.

- Mobility turn. Urry (2007) and Hannam, Sheller and Urry (2006) provide the base.
- Musicological. Leopold (Analecta musicologica 49, 2013) argues for understanding a migrant existence as a musical identity rather than as a deficit.
- Cultural theory. Greenblatt et al., *Cultural Mobility* (2010).
- Project position. Project leadership extends mobility beyond the geographical dimension to forms of mental, cultural, intellectual, compositional and vocal movement. The analytical distinction between motility, the capacity to move, and realized mobility is central.

### Precursors in the digital humanities

Two related projects exist, both confined to the early modern period.

- MUSICI, Goulet and zur Nieden, [musici.eu](https://musici.eu)
- MusMig, Katalinic, Zagreb

M³GIM closes the gap to the twentieth century and tests a modelling based on RiC-O 1.1 for it, described in [data.md](data.md).

The current station-map and timeline proposal in [plan.md](plan.md) is an exploratory response to guided user feedback. Its evidence rules distinguish travel, chronological stations, correspondence and document co-mention. The proposal adds no inferred historical journey and has not changed the accepted model or task definitions.

## Mobility types

The project distinguishes five theoretical types of movement, developed against the case study.

1. National mobility, changes of status brought about by marriage.
2. Geographical mobility, commuting between engagements.
3. Forced migration, flight and displacement.
4. Educational and training mobility, professionalization at changing places.
5. Lifestyle migration, permanent relocation of the centre of life.

These five types are a theoretical typology and have no counterpart in the project vocabulary. The five event categories that the application uses, performative, institutional, correspondence, discursive and biographical, are a different set derived from the recorded event roles. Whether the movement types enter the model as a second mobility axis, or whether both sets are merged, is an open decision in [specification.md](specification.md) § Open decisions.

## Case study Ira Malaniuk

The Ukrainian Austrian mezzo-soprano Ira Malaniuk (1919 to 2009) is the concrete case of the project. Her biography embodies the five types and connects the theoretical layer with a continuously documented life in movement.

### Biographical stations

| Year | Place | Event |
|---|---|---|
| 1919 | Stanislau (Ukraine) | Born |
| Childhood | Lviv | Growing up |
| 1937 to 1944 | Lviv | Voice studies at the conservatory |
| 1944 | to Austria | Flight, forced migration |
| 1945 to 1947 | Graz | First permanent engagement as a contralto at the Graz opera house |
| 1947 to 1952 | Zurich | Engagement |
| 1952 to 1956 | Munich | Bavarian State Opera |
| 1956 to 1971 | Vienna | Vienna State Opera |
| 1951 to 1958 (literature) | Bayreuth | Festival guest performances |
| 1951 to 1963 | Salzburg | Festival guest performances |
| 1970 to 2000 | Graz | Professor of song interpretation at the KUG |
| 2009 | Zirl (Tyrol) | Died |

The Bayreuth span 1951 to 1958 comes from the secondary literature. The partial estate held at the university archive attests Bayreuth only for 1951 to 1953. The application therefore shows that span and marks 1954 to 1958 as a gap in the cataloguing rather than asserting the span of the literature.

International guest appearances include the Teatro Colón in Buenos Aires, the Royal Opera House in London, the Scala in Milan, Lisbon and Paris.

### Artistic collaboration

Malaniuk appeared with formative conductors and directors, among them Herbert von Karajan, Wilhelm Furtwängler, Hans Knappertsbusch, Wieland Wagner, Bruno Walter, Joseph Keilberth and Georg Solti.

Her repertoire centred on Wagner (Waltraute, Brangäne, Second Norn, Fricka), Verdi, Mozart, Strauss and Mahler (Das Lied von der Erde), alongside concert and lied singing.

### The case against the mobility types

1. Forced migration, the flight from Ukraine in 1944.
2. Educational and training mobility, the conservatory in Lviv and the professionalization in Graz, Zurich and Munich.
3. Geographical mobility, commuting between engagements in Zurich, Munich and Vienna and the festivals.
4. National mobility, Austrian citizenship through marriage and a biographical continuity reaching back into the Habsburg monarchy.
5. Lifestyle migration, the permanent relocation to Vienna and later to Zirl.

There is no independent scholarly literature on Malaniuk. The project performs the first archive-based work on the partial estate, described in [data.md](data.md).

## Research questions

FF1. How did singers shape the musical and theatrical culture of Graz, and what part did their mobility play for professionalization and networking?

FF2. Which narrative and aesthetic structures were influenced by migration, and how did they contribute to the transformation of the opera genre after the Second World War?

FF3. How was music theatre knowledge transferred through mobility and adapted in new contexts?

FF4. Which specific forms of mobility can be identified in the case of Malaniuk, and how did they influence her career and her production of knowledge?

Hypothesis. The mobility of female singers was not only a precondition for careers but a catalyst for new cultures of knowledge and new aesthetic paradigms in music theatre.

Feasibility. The pilot study evaluates whether the archival units of the partial estate can be catalogued workably with RiC-O 1.1, the m3gim extension and AgRelOn, whether the procedures scale to larger datasets, and whether a transfer to an FWF follow-up study on female singers in European cultural metropolises of the nineteenth and twentieth centuries is possible.

## The talk perspective

The talk abstract of project leadership sharpens FF4 into the perspective of a concrete presentation. It is quoted verbatim in German because it is source material of the project.

> **Mobilität und Musiktheaterwissen: Mapping Ira Malaniuks Karriere im Musiktheater des 20. Jahrhunderts**
>
> Der Vortrag untersucht die ukrainisch-österreichische Sängerin Ira Malaniuk (1919–2009) als Akteurin musiktheatraler Mobilität im Europa des 20. Jahrhunderts. Im Zentrum steht die Frage, welche Rolle unterschiedliche Mobilitätsformen für Malaniuks Karriereentwicklung spielten – von Ausbildung, Flucht und Engagementwechseln bis hin zu Gastspielpraxis, Repertoireprofil und internationaler Vernetzung. Dabei wird Mobilität nicht allein als geografische Bewegung verstanden, sondern als mehrdimensionale Analysekategorie, die soziale, künstlerische, kulturelle und nationale Bewegungen einschließt.
>
> Ausgehend von ihrer Autobiografie und anderen Quellen ihres Nachlasses (Theaterverträge, Auftrittskalender, Repertoirelisten, Konzertprogramme, Zeitungsberichte usw.) fragt der Beitrag danach, wie sich erzwungene Migration, ausbildungs- und berufsbezogene Mobilität und künstlerische Beweglichkeit in Malaniuks Karriere verschränkten und wie Malaniuk dazu beitrug, dass Musiktheaterwissen über Engagements, Gastspiele, Rollenarbeit und künstlerische Kooperationen zwischen Orten und Institutionen wie Graz, Zürich, München, Wien und Bayreuth zirkulierte. Die mobile Sängerin wird somit – so die These – als Trägerin, Vermittlerin und Transformatorin von Rollen-, Repertoire- und Aufführungswissen sichtbar.
>
> Methodisch verbindet der Beitrag musikhistorische und gendersensible Perspektiven mit digitalen Verfahren der Mobilitätsforschung. Durch das Mapping von Orten, Rollen, Institutionen und künstlerischen Beziehungen wird Malaniuks Karriere als relationales Gefüge analysierbar, in dem Mobilität zugleich Voraussetzung, Ressource und Ergebnis musiktheatraler Professionalisierung war. Abschließend reflektiert der Vortrag die Möglichkeiten und Grenzen digitaler Mapping-Verfahren für eine gendersensible Mobilitätsgeschichte des Musiktheaters: Welche Muster werden durch Visualisierung erkennbar, welche Leerstellen bleiben bestehen, und inwiefern verändert die digitale Modellierung den Blick auf Sängerinnenkarrieren im 20. Jahrhundert?

Compared against the delivered data state, this perspective converges on one chain, the data point identifier in the recording, the bundling of an occurrence, and the institution and stage part at the appearance. The individual findings are held in the handover list under `data/reports/`, not here.

## Research context, the Graz opera house

The Graz opera house in the years 1945 to 1969 serves as the nucleus of the mobility analysis. Malaniuk embodies the narrative of Graz as a springboard.

Literature

- List, *Oper und Operette in Graz* (1974, chronicle)
- Nemeth, *Operngeschichte abseits der Routine* (dissertation 2005, on one period of artistic directorship)
- Brüstle (ed.), *Musikerinnen in Graz und in der Steiermark* (2020)

Research gaps

- The National Socialist period at the opera house
- The mobility of female opera singers with a connection to Graz
- Transnational entanglements
- A systematic analysis of artistic movement and local networks

## Personas

The application serves the researchers and the cataloguing team. It is a tool for finding things oneself, not a narrative (E-156).

### The musicologist, core persona

A researcher of the KUG team working on the mobility and the knowledge production of female singers. She reads Malaniuk's movements, forms of appearance and networks as evidence for FF1 and FF4 and traces every finding back to the record that attests it. She needs the forms of appearance kept apart, guest performance against engagement against travel, a spatial and temporal overview, and a return path into the holdings from every statement. Her tasks are numbers one to seven of the task set.

### The modeller in the digital humanities

A methodologist responsible for the modelling in RiC-O, the m3gim extension and AgRelOn, who tests the feasibility and the scaling stated above. She makes the degree of cataloguing, the gaps in the data and the load-bearing capacity of the model visible. She needs honest coverage indicators per axis, the cataloguing mirror and the provenance of every data point. Her tasks are numbers eight and nine.

### The cataloguing team

The team of the university archive that fills and corrects the source tables. Its members need to see which fields are missing or inconsistent. They reach that state not through the interface but through the artefacts of the pipeline, the quality snapshot, the validation report and the link proposals under `data/reports/`, together with the handover list of source errors. Their task is number ten.

External re-use, including the planned FWF follow-up study, is out of scope for the pilot and gets no persona of its own.

## Research epics

The application answers seven questions. Each of them is an epic of [specification.md](specification.md) § Epics and user stories, where the user stories, the views and the delivered state are held.

| Question | Research questions |
|---|---|
| Where did Malaniuk perform? | FF1, FF4 |
| Which stage parts did she sing? | FF2, FF3 |
| Where did she sing what, when, and for which house? | FF1, FF2, FF3 |
| In which ways was she mobile? | FF1, FF4 |
| With whom did she work? | FF1, FF3 |
| How did her knowledge travel? | FF3 |
| What is a statement based on? | all four |

The application is a tool. It shows every recorded data point with the role it carries and access to its attesting record, it names what the holdings do not attest, and it leaves the interpretation to the researcher. It draws no conclusion about the case, because a statement about the subject belongs in a publication and not in an interface (E-156).

## Evaluation

The guiding question is whether the tool makes the research questions answerable, and for whom. The answer falls per epic, not for the tool as a whole. An epic counts as answerable when the person of the matching persona solves her task without help and can trace the finding back to the document that attests it.

### Task set

Each task succeeds or fails without an intermediate grade. The observation records whether it was solved, how many wrong paths arose, and where the person stalled. Tasks 1–9 run in the browser; task 10 uses the cataloguing report and source-error handover. The project lead accepts version 0.9 after completing this set. Version 1.0 is the same state after the project partners have run the set and accepted the result. Automated runs prepare evidence and do not replace either acceptance.

The stable scope is document-centred (E-282). Shared filters select documents; places, persons, works and dates appearing together in that selection need not belong to one historical occurrence. Each task requires the researcher to inspect the source before asserting that connection. Missing and undated evidence remain explicit.

For the musicologist

1. Select documents whose time anchor falls between 1950 and 1955. Name their places and place roles where recorded, identify any missing role or retained undated context, and inspect one source to determine whether it attests an appearance.
2. Show only the places that carry the role of a guest performance, and say which roles the other places carry.
3. Name the countries in which the holdings attest places, and say which of them is attested most thinly.
4. Select documents mentioning Bayreuth and Tristan und Isolde within the document time slice 1954. Name the persons and their recorded roles, open one source, and explain whether that source supports a shared performance or only separate mentions.
5. Name a recorded relationship and the document that attests it, and distinguish it from a co-mention of the same two persons.
6. Name three works of the repertoire, and say whether the holdings name a place or a stage part for one of them.
7. Open a multi-page source and move through its pages without leaving the record.

For the modeller

8. Find a document whose year on the timeline does not come from its own date of creation, and say which link date the year comes from.
9. Take one record of the Bestand. Account for its persons and institutions in the Netzwerk and for its places on the Karte or in the unlocated-place list. Explain declared exclusions, including the creator of the fonds in the network, and return to the source for one item.

For the cataloguing team

10. Name from the handover list a source error of your own recording, and say which cell has to be corrected for it.

### Measures of success

- Task success. The share of tasks solved without help, per persona. A task that two out of three people fail names a defect of the interface and not a single case.
- Return to the source. For every finding a task produces, the path to the attesting document must lie within the application itself. If the return fails, the finding is unusable for a publication.
- Honesty of the display. Does the person state on her own that a statement rests on a part of the holdings? The coverage line of every view and the date of the data state are the places where this can be read.
- Misreading. Every place at which a person takes a figure for a statement about the whole holdings, while it means the catalogued part, counts as a finding against the display.

### Machine pre-check

Before every round with people the machine check runs, so that a failed task does not rest on a data state that cannot carry the question. The epics on place and time need coverage on those axes, the epic on collaboration a named relationship, the epic on repertoire a reference to a work. The current figures stand in the [quality snapshot](../data/reports/quality-snapshot.md), not in this document.

Time and staffing of the rounds are a matter for project leadership.

## Sources

- Strohmann and Bagge (eds.), *Kulturelles Handeln | Macht | Mobil*, Böhlau 2023
- Urry, *Mobilities*, 2007
- Leopold, *Analecta musicologica* 49, 2013
- Greenblatt et al., *Cultural Mobility*, 2010
- Proposal to the Steegmann Foundation (M³GIM, submitted 2026-01-10, not in the repository for data protection reasons, held in the Obsidian vault)
