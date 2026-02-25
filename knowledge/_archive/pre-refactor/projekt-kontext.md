# Projektkontext

> Kanonische Quelle fuer Projektziel, Forschungsrahmen, belastbaren Ist-Stand und Projektsteuerung.
> Stand der Faktenbasis: Working Tree vom 2026-02-21.

## Projektsteckbrief

- **Titel:** Mapping Mobile Musicians (M3GIM). Mobilitaet und Musiktheaterwissen im Graz der Nachkriegszeit am Beispiel der Saengerin Ira Malaniuk
- **Gegenstand:** Digitale Erschliessung des Teilnachlasses Ira Malaniuk (UAKUG/NIM)
- **Projekttyp:** Machbarkeitsstudie / Pilotstudie fuer FWF-Folgeprojekt
- **Institutioneller Kontext:** Universitaetsarchiv der KUG Graz
- **Projektleitung:** Nicole K. Strohmann (Professur fuer Historische Musikwissenschaft und Genderforschung, KUG)
- **Kooperationspartner:** Wolfgang Madl (Archiv KUG), Christopher Pollin (DH Craft OG)
- **Beratend:** Georg Vogeler (Institut fuer Digitale Geisteswissenschaften, Universitaet Graz)
- **Raeumlicher Fokus:** Oper Graz in der Nachkriegszeit (1945–1969)
- **Technischer Kern:** Python-Datenpipeline + statisches Frontend auf GitHub Pages
- **Live-Umgebung:** https://dhcraft.org/m3gim

## Forschungsrahmen

### Theoretischer Rahmen

Das Projekt verortet sich im Feld der Mobility Studies (Urry 2007, Hannam/Sheller/Urry 2006) und erweitert diese um musikwissenschaftliche Perspektiven. Zentrale Anschlusspunkte:

- **Strohmanns erweiterter Mobilitaetsbegriff:** Mobilitaet(en) als "Formen von mentaler, kultureller, intellektueller, kompositorischer, saengerischer Bewegung" — ueber rein geografische Dimension hinaus, als epistemologische Analysekategorie. Analytische Unterscheidung von Motilitaet (Bewegungsfaehigkeit) und realisierter Mobilitaet.
- **Leopold (2013):** Plaedoyer, "Migrantendasein nicht als defizitaer, sondern als musikalische Identitaet zu begreifen" — direkte Anschlussstelle.
- **Greenblatt et al. (2010):** Cultural Mobility als kulturtheoretischer Bezugsrahmen fuer Wanderbewegungen und Zirkulationsprozesse.
- **DH-Vorlaeufer:** MUSICI (Goulet/zur Nieden, Fruehe Neuzeit, musici.eu), MusMig (Katalinic, HERA). M3GIM schliesst die Luecke zum 20. Jahrhundert.

### Schluesselbegriffe

- **Musiktheaterwissen:** Fluechtiges, oft muendlich ueberliefertes Wissen, das durch Mobilitaet transferiert und in neuen Kontexten adaptiert wird.
- **Kulturelles Kapital:** Wechselwirkungen zwischen individueller Biografie, institutionellen Rahmenbedingungen und gesellschaftlich-politischen Kontexten.
- **Motilitaet vs. realisierte Mobilitaet:** Bewegungsfaehigkeit als Voraussetzung vs. tatsaechlich vollzogene Bewegung.
- **Graz als Schnittstelle:** Ort der Konvergenz von biografischen Erfahrungen, institutionellem Rahmen und kulturellem Kapital. Narrativ "Stadt Graz als Sprungbrett" fuer internationale Buehnenkarrieren.

### Leitfragen

- **FF1 Vernetzung:** Wie praegten Saenger:innen die Grazer Musik- und Theaterkultur?
- **FF2 Genretransformation:** Welche narrativen und aesthetischen Strukturen wurden durch Migration beeinflusst?
- **FF3 Wissenstransfer:** Wie wurde Musiktheaterwissen durch Mobilitaet transferiert und adaptiert?
- **FF4 Mobilitaet:** Welche Mobilitaetsformen lassen sich bei Malaniuk identifizieren?

### Hypothese

Die Mobilitaet von Saenger:innen war nicht nur notwendige Voraussetzung fuer ihre Karriere, sondern auch Katalysator fuer die Entstehung neuer Wissenskulturen und aesthetischer Paradigmen im Musiktheater. Dies wird exemplarisch an Malaniuk ueberprueft.

### Mobilitaetstypen

- national (z.B. Heirat)
- geografisch (Hin- und Hergerissensein zwischen Orten)
- erzwungen (Flucht und Vertreibung)
- bildung (Ausbildungsmobilitaet)
- lebensstil (Lebensstil-Migration)

## Belastbarer Ist-Stand (Repository)

### Datenstand

- 282 Objekte in der Objekttabelle (255 Konvolute im Hauptbestand, 26 Plakate, 1 Tontraeger)
- 1.246 effektive Verknuepfungen (nach Filterung leerer/Template-Zeilen)
- 4 Indizes: Personen (313 inkl. Erwaehnungen), Organisationen (64), Orte (43), Werke (94)
- 62 von 282 Objekten mit mindestens einer Verknuepfung (22%)
- Konvolut-Schwerpunkt: NIM_003 (11 Folios), NIM_004 (35), NIM_007 (30) tragen den Grossteil der Verknuepfungen

### Produktstand

- 3 aktive Daten-Tabs: Archiv (Bestand/Chronik), Indizes (4-Grid), Wissenskorb
- 2 ausgeblendete Tabs: Matrix (D3 Heatmap), Kosmos (D3 Force)
- 5 statische Info-Seiten: Ueber, Projekt, Modell, Hilfe, Impressum (eigenstaendige HTML-Dateien)
- Hash-Routing fuer Daten-Tabs, normale Links fuer Info-Seiten
- Detail-Interaktion: Inline-Expansion im Archiv, Cross-Navigation aus Indizes/Korb

### Datenqualitaetslage

- Ein blockierender Fehler im Rohbestand dokumentiert: Duplikat `UAKUG/NIM/PL_07`
- Kritische Erfassungsluecken: fehlende Signatur- und Typwerte in Teilen der Verknuepfungstabelle
- Strukturelle Probleme in drei Indizes (Header-Shift), pipeline-seitig abgefedert

### Technische Iterationen

- Iteration 1: abgeschlossen
- Iteration 2 (Pipeline + Frontend-Refinement): weitgehend umgesetzt
- Wikidata-Reconciliation: `reconcile.py` implementiert (171 Matches), WD-Icons im Frontend
- Laufende Prioritaet: Erfassungsqualitaet, WD-Ergebnisse in Google Sheets uebertragen, Deferred Features

## Strategischer Kontext

Das Vorhaben ist als Machbarkeitsstudie fuer einen FWF-Antrag konzipiert. Die Pilotstudie liefert methodische Validierung, technische Infrastruktur und erste empirische Ergebnisse. Die geplante Folgefinanzierung soll Mobilitaet und Wissensproduktion von Saengerinnen an europaeischen Kulturmetropolen im 19. und 20. Jahrhundert untersuchen.

## Geltungsbereich dieser KB

- Diese Datei beschreibt den fachlichen Rahmen und den belastbaren Zustand.
- Technische Details sind in `knowledge/Technik/Technische Dokumentation.md` und `knowledge/Daten/Datenmodell und Ontologie.md` kanonisch.
- Operative Prioritaeten stehen in `knowledge/Prozess/Operativer Plan.md`.
