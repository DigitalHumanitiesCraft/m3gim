# Operativer Plan (Claude)

> Kanonische Quelle fuer laufenden Arbeitsstand, Priorisierung und naechste Umsetzungsstufen.

## Zielbild

- Stabiler Daten-zu-Produkt-Workflow bei gleichzeitigem Ausbau der Erschliessungstiefe.
- Dokumentation eng am Working Tree, nicht an historischer Planlage.

## Umsetzungsstand (kompakt)

### Erreichte Kernpunkte

- Pipeline Iteration 2 lauffaehig
- Pipeline-Fix: Bearbeitungsstand-Spalte normalisiert, Werte gemappt (Session 10)
- Frontend-Refactor auf modulare Struktur (21 Module, 9 CSS)
- Archiv UX: Spalten-Sortierung, Autocomplete-Personenfilter, erweiterte Suche, Bearbeitungsstand-Markierung
- Indizes Explorer: Facettensuche, Viewport-Fix, Detail-Begrenzung, Cross-Navigation
- Wissenskorb: Bookmark-Icons, Korb-Tab, sessionStorage-Prototyp
- Navigation auf Seitenmodell mit Hash-Routing (5 Tabs + 3 Seiten)
- Matrix/Kosmos-Verbesserungen (Drilldown, Labels, Zoom/Legende)
- Knowledge-Refactor: 12 nummerierte Docs → 5 kanonische + Traceability-Matrix + Quellenindex + Anhaenge
- HTML/CSS-Cleanup: hidden-Attribut, aria-Labels, Zeichenbereinigung, Badge-Konsolidierung

### Deferred / offen

- Wikidata-Reconciliation-Skript (`reconcile.py`) fehlt weiterhin
- Matrix-Zeitauflosung und Sortierausbau
- Erweiterte Indextiefe (z. B. Orts-Hierarchien)
- Wissenskorb-Export (Download als Liste/BibTeX)

## Priorisierte Korrekturpunkte (Doku vs Code)

1. Historische Tooling-Referenzen (Vite/package.json) nicht mehr als Ist-Stand behandeln.
2. Legacy-Output-Nutzung klar markieren (`partitur.json`, `sankey.json`).
3. Statusangaben auf Working-Tree-Realitaet und aktuelle Modulanzahl normalisieren.
4. Reconciliation als geplanten, nicht implementierten Baustein eindeutig kennzeichnen.

## Operative Naechste Schritte

1. Reconciliation-Workflow spezifizieren und implementieren (`reconcile.py`).
2. Datenqualitaetsluecken in den Quelltabellen reduzieren (Signatur/Typ/Titel/Dokumenttyp).
3. Wissenskorb-Export (CSV/BibTeX) evaluieren.
4. Reports und KB synchron halten (Template-gesteuerte Erneuerung).

## Steuerlogik fuer Folgearbeit

- **Kanonisch:** Dateien unter `knowledge/` ausser `_archive/`
- **Nachweisend:** `knowledge/traceability-matrix.md`
- **Historisch:** `knowledge/_archive/...` und `knowledge/appendices/...`
