# Projekt-Status

> Steckbrief, Umsetzungsstand, Gap-Analyse und operative naechste Schritte.

## Steckbrief

- **Titel:** Mapping Mobile Musicians (M3GIM). Mobilitaet und Musiktheaterwissen im Graz der Nachkriegszeit am Beispiel der Saengerin Ira Malaniuk
- **Gegenstand:** Digitale Erschliessung des Teilnachlasses Ira Malaniuk (UAKUG/NIM)
- **Projekttyp:** Machbarkeitsstudie / Pilotstudie fuer FWF-Folgeprojekt
- **Institutioneller Kontext:** Universitaetsarchiv der KUG Graz
- **Projektleitung:** Nicole K. Strohmann (Professur fuer Historische Musikwissenschaft und Genderforschung, KUG)
- **Kooperationspartner:** Wolfgang Madl (Archiv KUG), Christopher Pollin (DH Craft OG)
- **Beratend:** Georg Vogeler (Institut fuer Digitale Geisteswissenschaften, Universitaet Graz)
- **Foerderinstitutionen:** KUG Eigenmittel, Stadt Graz, Mariann Steegmann Foundation
- **Foerderzeitraum:** 01.03.2026 – 29.02.2027 (12 Monate)
- **Raeumlicher Fokus:** Oper Graz in der Nachkriegszeit (1945–1969)
- **Technischer Kern:** Python-Datenpipeline + statisches Frontend auf GitHub Pages
- **Live-Umgebung:** https://dhcraft.org/m3gim

## Meilensteine

| Datum | Meilenstein |
|-------|-------------|
| Maerz 2026 | Kick-off, Projektstart |
| April 2026 | Studientag (projektinterner Austausch) |
| 24.04.2026 | Lange Nacht der Forschung (oeffentliche Sichtbarkeit) |
| September 2026 | Arbeitsgespraech (externe Expert:innen, Zeitgenoss:innen, Grazer Opernfreunde) |
| Januar 2027 | Studientag (finale Abstimmung, Vorbereitung Go live) |
| Maerz 2027 | Go live (Online-Veroeffentlichung) |

## Datenstand

- 282 Objekte (255 Konvolute, 26 Plakate, 1 Tontraeger)
- 1.246 effektive Verknuepfungen (nach Filterung leerer/Template-Zeilen)
- 4 Indizes: Personen (313), Organisationen (64), Orte (43), Werke (94)
- 62/282 Objekte mit mindestens einer Verknuepfung (22%)
- Verknuepfungs-Schwerpunkt: NIM_003, NIM_004, NIM_007

## Umsetzungsstand

### Erreichte Kernpunkte

- Pipeline Iteration 2 lauffaehig (explore → validate → transform → build-views)
- Frontend: 19 JS-Module, 10 CSS, 4 aktive Tabs (Archiv, Indizes, Mobilitaet, Korb)
- Archiv UX: Sortierung, Autocomplete, erweiterte Suche, Inline-Expansion, Bookmark-Icons
- Indizes Explorer: Facettensuche, Cross-Navigation, Wikidata-Icons, WD-Coverage
- Mobilitaet-View: Schwimmbahn-Timeline mit D3, Floating-Tooltips, Dokument-Navigation, Popup-Menue
- Wissenskorb: Card-Details, sessionStorage, Cross-Navigation
- 5 Info-Seiten (about, projekt, modell, hilfe, impressum) mit einheitlichem Header
- Wikidata-Reconciliation: 171 Matches (reconcile.py), Icons im Frontend
- RiC-O 1.1 Compliance: 6 Property-Korrekturen nach OWL-Pruefung

### Deferred / offen

- Matrix/Kosmos wieder einblenden nach erster Praesentation
- Matrix-Zeitauflosung und Sortierausbau
- Erweiterte Indextiefe (z.B. Orts-Hierarchien)
- Wissenskorb-Export (CSV/BibTeX)
- Leaflet-Karte

## Gap-Analyse: Offene Pipeline-Implementierungen

### Erledigt (Session 17/18)

1. ~~Ereignis-Typ (`typ: ereignis`)~~ → implementiert als `m3gim:PerformanceEvent`
2. ~~Detail-Typ (`typ: detail`, Schicht 3)~~ → implementiert als `m3gim:DetailAnnotation`
3. ~~reconcile.py~~ → 171 Matches
4. ~~datierungsevidenz~~ → implementiert als `m3gim:dateEvidence`

### Hoch (offen)

5. **Erfassungsstatus vereinheitlichen:** 3 parallele Systeme → Google Sheets + transform.py synchronisieren

### Mittel

6. **Wissenskorb-Export:** CSV/BibTeX
7. **Nachhaltigkeit:** Zenodo-Archivierung vorbereiten

### Niedrig

8. **box_nr und scan_status:** Antrag nennt sie, Pipeline kennt sie nicht
9. **EAD-Kompatibilitaet:** Antrag erwaehnt Test
10. **Digitalisate-Strategie:** Platzhalter-URLs, finale Loesung offen

## Offene Handreichungs-Fragen (Kick-off)

1. Transliteration ukrainischer Namen — welcher Standard?
2. Titelbildung — wie viel Normierung, wie viel Quellennaehe?
3. Fremdsprachige Dokumente — Titel auf Deutsch oder Originalsprache?
4. Vier-Augen-Prinzip bei der Erfassung?

## Operative Naechste Schritte

1. Erfassungsstatus mit Team vereinheitlichen (Kick-off)
2. Datenqualitaetsluecken in Quelltabellen reduzieren
3. Wikidata-Ergebnisse in Google Sheets uebertragen (171 Matches vorhanden)
4. Wissenskorb-Export (CSV/BibTeX) evaluieren
5. Info-Seiten (modell.html) Zahlen nach Pipeline-Lauf aktualisieren
6. Reports und KB synchron halten

## Strategischer Kontext

Machbarkeitsstudie fuer FWF-Antrag. Pilotstudie liefert methodische Validierung, technische Infrastruktur und erste empirische Ergebnisse. Geplante Folgefinanzierung: Mobilitaet und Wissensproduktion von Saengerinnen an europaeischen Kulturmetropolen im 19. und 20. Jahrhundert.
