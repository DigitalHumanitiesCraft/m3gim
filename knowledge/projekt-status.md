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
- **Raeumlicher Fokus:** Oper Graz in der Nachkriegszeit (1945–1969)
- **Technischer Kern:** Python-Datenpipeline + statisches Frontend auf GitHub Pages
- **Live-Umgebung:** https://dhcraft.org/m3gim

## Datenstand (Stand: 2026-02-25)

- 282 Objekte (255 Konvolute, 26 Plakate, 1 Tontraeger)
- 1.246 effektive Verknuepfungen (nach Filterung leerer/Template-Zeilen)
- 4 Indizes: Personen (296), Organisationen (59), Orte (31), Werke (96)
- 62/282 Objekte mit mindestens einer Verknuepfung (22%)
- Verknuepfungs-Schwerpunkt: NIM_003, NIM_004, NIM_007
- Validierung: 1 Fehler (E001 PL_07-Duplikat, Sheet-seitig), 177 Warnungen (W004 Cross-Table)

## Umsetzungsstand

### Erreichte Kernpunkte

- Pipeline Iteration 2 lauffaehig (explore → validate → transform → build-views → reconcile)
- validate.py Encoding-Bugs gefixt (Session 19): Mojibake in VOCAB + KOMPOSIT_TYPEN, `normalize_bearbeitungsstand()` eingefuehrt
- Wikidata-CSV-Export: 5 CSVs fuer Google-Sheets-Import (export-wikidata-csv.py)
- Frontend: 19 JS-Module, 10 CSS, 6 aktive Tabs (Archiv, Indizes, Mobilitaet, Matrix, Kosmos, Korb)
- Archiv UX: Sortierung, Autocomplete, erweiterte Suche, Inline-Expansion, Bookmark-Icons
- Indizes Explorer: Facettensuche, Cross-Navigation, Wikidata-Icons, WD-Coverage
- Mobilitaet-View: Schwimmbahn-Timeline mit D3, Floating-Tooltips, Dokument-Navigation, Popup-Menue
- Wissenskorb: Card-Details, sessionStorage, Cross-Navigation
- 5 Info-Seiten (about, projekt, modell, hilfe, impressum) mit einheitlichem Header
- Wikidata-Reconciliation: 171 Matches (reconcile.py), Icons im Frontend
- RiC-O 1.1 Compliance: 6 Property-Korrekturen nach OWL-Pruefung

### Erreicht (Session 20)

- Matrix + Kosmos Tabs aktiviert (6 aktive Tabs)
- Cross-Visualization Linking: Matrix ↔ Kosmos ↔ Indizes (navigateToView, Popups)
- Wissenskorb CSV/BibTeX-Export
- modell.html Zahlen aktualisiert (171 WD-Matches)
- Meeting-Referenzen aus allen Docs entfernt

### Deferred / offen

- Matrix-Zeitauflosung und Sortierausbau
- Erweiterte Indextiefe (z.B. Orts-Hierarchien)
- Leaflet-Karte

## Gap-Analyse: Offene Pipeline-Implementierungen

### Erledigt (Session 17–19)

1. ~~Ereignis-Typ (`typ: ereignis`)~~ → implementiert als `m3gim:PerformanceEvent`
2. ~~Detail-Typ (`typ: detail`, Schicht 3)~~ → implementiert als `m3gim:DetailAnnotation`
3. ~~reconcile.py~~ → 171 Matches
4. ~~datierungsevidenz~~ → implementiert als `m3gim:dateEvidence`
5. ~~validate.py Encoding-Bugs~~ → Mojibake gefixt, `normalize_bearbeitungsstand()` eingefuehrt (Session 19)
6. ~~Wikidata-CSV-Export~~ → 5 CSVs in `data/output/wikidata-csvs/` (Session 19)

### Hoch (offen)

7. **Erfassungsstatus vereinheitlichen:** 3 parallele Systeme → Google Sheets + transform.py synchronisieren

### Mittel

8. **Wissenskorb-Export:** CSV/BibTeX
9. **Nachhaltigkeit:** Zenodo-Archivierung vorbereiten

### Niedrig

10. **box_nr und scan_status:** Antrag nennt sie, Pipeline kennt sie nicht
11. **EAD-Kompatibilitaet:** Antrag erwaehnt Test
12. **Digitalisate-Strategie:** Platzhalter-URLs, finale Loesung offen

## Operative Naechste Schritte

1. Erfassungsstatus mit Team vereinheitlichen
2. Datenqualitaetsluecken in Quelltabellen reduzieren
3. Wikidata-Ergebnisse in Google Sheets uebertragen (171 Matches vorhanden)
4. Reports und KB synchron halten

## Strategischer Kontext

Machbarkeitsstudie fuer FWF-Antrag. Pilotstudie liefert methodische Validierung, technische Infrastruktur und erste empirische Ergebnisse. Geplante Folgefinanzierung: Mobilitaet und Wissensproduktion von Saengerinnen an europaeischen Kulturmetropolen im 19. und 20. Jahrhundert.
