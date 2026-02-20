# Projektkontext

> Kanonische Quelle fuer Projektziel, Forschungsrahmen und belastbaren Ist-Stand.
> Stand der Faktenbasis: Working Tree vom 2026-02-20.

## Projektprofil

- **Titel:** Mapping Mobile Musicians (M3GIM)
- **Gegenstand:** Digitale Erschliessung des Teilnachlasses Ira Malaniuk (UAKUG/NIM)
- **Institutioneller Kontext:** Universitaetsarchiv der KUG Graz
- **Technischer Kern:** Python-Datenpipeline + statisches Frontend auf GitHub Pages
- **Live-Umgebung:** https://dhcraft.org/m3gim

## Forschungsrahmen

### Leitfragen

- **FF1 Vernetzung:** Wie praegten Saenger:innen die Grazer Musik- und Theaterkultur?
- **FF2 Genretransformation:** Welche narrativen und aesthetischen Strukturen wurden durch Migration beeinflusst?
- **FF3 Wissenstransfer:** Wie wurde Musiktheaterwissen durch Mobilitaet transferiert und adaptiert?
- **FF4 Mobilitaet:** Welche Mobilitaetsformen lassen sich bei Malaniuk identifizieren?

### Mobilitaetstypen

- national
- geografisch
- erzwungen
- bildung
- lebensstil

## Belastbarer Ist-Stand (Repository)

### Datenstand

- 282 Objekte in der Objekttabelle
- 1.246 effektive Verknuepfungen (nach Filterung leerer/Template-Zeilen)
- 4 Indizes: Personen (296), Organisationen (58), Orte (31), Werke (95)
- Konvolut-Schwerpunkt: NIM_003, NIM_004, NIM_007 tragen den Grossteil der Verknuepfungen

### Produktstand

- 4 Daten-Tabs: Archiv, Indizes, Matrix, Kosmos
- 3 Info-Seiten: Ueber, Projekt, Hilfe
- Hash-Routing und Deep-Linking im Frontend aktiv
- Detail-Interaktion: Inline (Archiv) und Sidebar (Indizes/Matrix/Kosmos)

### Datenqualitaetslage

- Ein blockierender Fehler im Rohbestand dokumentiert: Duplikat `UAKUG/NIM/PL_07`
- Kritische Erfassungsluecken: fehlende Signatur- und Typwerte in Teilen der Verknuepfungstabelle
- Strukturelle Probleme in drei Indizes (Header-Shift), pipeline-seitig abgefedert

## Meilensteinbild (kompakt)

- Iteration 1: abgeschlossen
- Iteration 2 (Pipeline + Frontend-Refinement): weitgehend umgesetzt
- Laufende Prioritaet: Erfassungsqualitaet, Reconciliation-Workflow, Deferred Features

## Geltungsbereich dieser KB

- Diese Datei beschreibt den fachlichen Rahmen und den belastbaren Zustand.
- Technische Details sind in `knowledge/system-architektur-pipeline.md` und `knowledge/datenmodell-ontologie.md` kanonisch.
- Operative Prioritaeten stehen in `knowledge/operativer-plan-claude.md`.
