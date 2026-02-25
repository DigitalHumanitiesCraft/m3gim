# Operativer Plan (Claude)

> Kanonische Quelle fuer laufenden Arbeitsstand, Priorisierung und naechste Umsetzungsstufen.

## Zielbild

- Stabiler Daten-zu-Produkt-Workflow bei gleichzeitigem Ausbau der Erschliessungstiefe.
- Dokumentation eng am Working Tree, nicht an historischer Planlage.
- Antrag-Handreichung-Pipeline-Alignment: Alle in der Handreichung definierten Datentypen muessen pipeline-faehig sein.

## Umsetzungsstand (kompakt)

### Erreichte Kernpunkte

- Pipeline Iteration 2 lauffaehig
- Pipeline-Fix: Bearbeitungsstand-Spalte normalisiert, Werte gemappt (Session 10)
- Frontend-Refactor auf modulare Struktur (19 JS-Module, 10 CSS)
- Info-Seiten als eigenstaendige HTML-Dateien (Session 13): about.html, projekt.html, modell.html, hilfe.html
- Archiv UX: Spalten-Sortierung, Autocomplete-Personenfilter, erweiterte Suche, Bearbeitungsstand-Markierung
- Indizes Explorer: Facettensuche, Viewport-Fix, Detail-Begrenzung, Cross-Navigation
- Wissenskorb: Bookmark-Icons, Korb-Tab mit Card-Details, sessionStorage-Persistenz
- Navigation: 4 aktive Tabs (archiv, indizes, mobilitaet, korb) + 2 ausgeblendet (matrix, kosmos) + 5 HTML-Seiten (inkl. Impressum)
- Matrix/Kosmos-Verbesserungen (Drilldown, Labels, Zoom/Legende) — aktuell ausgeblendet
- Knowledge-Refactor: 12 nummerierte Docs → 5 kanonische + Traceability-Matrix + Quellenindex + Anhaenge
- Gap-Analyse Antrag/Handreichung/KB (Session 14): Kritische Luecken identifiziert und KB aktualisiert
- Info-Seiten wissenschaftlich ueberarbeitet (Session 15): about/projekt/modell mit Forschungsrahmen, Forschungsfragen, Theoretischem Rahmen, Teaminfos, Foerderung
- Einheitliche Navigation (Session 15): app-header auf allen 6 HTML-Seiten, kein visueller Bruch SPA ↔ Info-Seiten
- Impressum-Seite (Session 15): docs/impressum.html mit Team, Foerderung, Datenschutz, Lizenz
- Audit-Fixes (Session 15): audit-data.py View-JSON-Parsing korrigiert, quellenindex + traceability aktualisiert
- Repo-Cleanup (Session 15): migrate.py, Fotos-XLSX-Dateien entfernt
- Wikidata-Integration (Session 17): reconcile.py refactored (171 Matches), WD-Icons in Indizes/Korb/Inline-Detail, WD-Coverage in Grid-Headern
- RiC-O 1.1 Compliance (Session 17): 6 Property-Korrekturen nach OWL-Pruefung, @context-Aliase, rico:Place Typisierung
- GitHub Actions Workflow entfernt (Session 17): Merge-Konflikte vermieden, Pipeline laeuft lokal
- Mobilitaet-View (Session 17): Schwimmbahn-Timeline mit D3.js, 7 Swim-Lanes, Lebensphasen, Mobilitaetspfeile, Gastspiel-Dots
- Mobilitaet-Verbesserungen (Session 18): Floating-Tooltips, Dokument-Klick-Navigation, Popup-Menue, Skalenbruch, Legende ueber Diagramm, Phasen-Label-Abbreviations, Guest-City-Normalisierung

### Deferred / offen

- Matrix-Zeitauflosung und Sortierausbau (Matrix aktuell ausgeblendet)
- Erweiterte Indextiefe (z. B. Orts-Hierarchien)
- Wissenskorb-Export (Download als Liste/BibTeX)
- Matrix/Kosmos wieder einblenden nach erster Praesentation

## Gap-Analyse: Offene Pipeline-Implementierungen

Aus dem Abgleich Antrag + Handreichung vs. Pipeline (Session 14):

### Erledigt (seit Session 17/18)

1. ~~**Ereignis-Typ (`typ: ereignis`):**~~ Implementiert als `m3gim:PerformanceEvent` in transform.py.
2. ~~**Detail-Typ (`typ: detail`, Schicht 3):**~~ Implementiert als `m3gim:DetailAnnotation` in transform.py.
3. ~~**reconcile.py:**~~ Implementiert (100%-Match-Strategie mit Wikidata Search API und P31-Verifikation).
4. ~~**datierungsevidenz:**~~ Implementiert als `m3gim:dateEvidence` in transform.py.

### Hoch (offen)

5. **Erfassungsstatus vereinheitlichen:** 3 parallele Systeme (Handreichung: 4 Werte, Pipeline: 3, Meeting: 3). → Google Sheets + transform.py synchronisieren.

### Mittel

6. **Wissenskorb-Export:** CSV/BibTeX.
7. **Nachhaltigkeit:** Zenodo-Archivierung vorbereiten (Antrag verspricht es).

### Niedrig

8. **box_nr und scan_status:** Antrag nennt sie als Pflichtfelder, Pipeline kennt sie nicht. Klaerung noetig.
9. **EAD-Kompatibilitaet:** Antrag erwaehnt Test, nicht umgesetzt.
10. **Digitalisate-Strategie:** Platzhalter-URLs, finale Loesung offen.

## Offene Handreichungs-Fragen (Kick-off)

Diese Punkte sind in der Handreichung als "OFFEN" markiert und muessen im Kick-off-Meeting geklaert werden:

1. Transliteration ukrainischer Namen — welcher Standard?
2. Titelbildung — wie viel Normierung, wie viel Quellennaehe?
3. Fremdsprachige Dokumente — Titel auf Deutsch oder Originalsprache?
4. Vier-Augen-Prinzip bei der Erfassung?

## Priorisierte Korrekturpunkte (Doku vs Code)

1. Historische Tooling-Referenzen (Vite/package.json) nicht mehr als Ist-Stand behandeln.
2. ~~Legacy-Output-Nutzung klar markieren (`partitur.json`, `sankey.json`).~~ → `partitur.json` ist aktiv (Mobilitaet-View), nur `sankey.json` ist Legacy.
3. ~~Reconciliation als geplanten, nicht implementierten Baustein eindeutig kennzeichnen.~~ → erledigt.

## Operative Naechste Schritte

1. ~~Ereignis-Typ und Detail-Typ in transform.py implementieren.~~ → erledigt.
2. ~~datierungsevidenz-Feld in Pipeline aufnehmen.~~ → erledigt.
3. ~~Reconciliation-Workflow spezifizieren und implementieren (`reconcile.py`).~~ → erledigt.
4. Erfassungsstatus mit Team vereinheitlichen (Kick-off).
5. Datenqualitaetsluecken in den Quelltabellen reduzieren.
6. Wissenskorb-Export (CSV/BibTeX) evaluieren.
7. Reports und KB synchron halten.
8. ~~reconcile.py ausfuehren~~ → erledigt (171 Matches). Ergebnisse in Google Sheets uebertragen.
9. Info-Seiten (modell.html) Zahlen nach Pipeline-Lauf aktualisieren.

## Steuerlogik fuer Folgearbeit

- **Kanonisch:** Dateien unter `knowledge/` ausser `_archive/`
- **Nachweisend:** `knowledge/traceability-matrix.md`
- **Historisch:** `knowledge/_archive/...` und `knowledge/appendices/...`
