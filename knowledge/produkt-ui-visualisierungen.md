# Produkt, UI und Visualisierungen

> Kanonische Quelle fuer Informationsarchitektur, Interaktionen, Designsystem und offene Produktluecken.

## Informationsarchitektur

### Datenorientierte Hauptbereiche

- Archiv
- Indizes
- Matrix
- Kosmos

### Kontextseiten

- Ueber
- Projekt
- Hilfe

### Routing

- Hash-basiertes Routing in `router.js`
- Deep Links fuer Views und Datensatzkontext

## Ansichtslogik

### Archiv

- Bestand und Chronik als zwei Perspektiven auf denselben Datenraum
- Klickbare Spaltenheader mit Sortier-Indikatoren (statt Dropdown)
- Autocomplete-Combobox fuer Personenfilter (statt Select mit 294 Optionen)
- Erweiterte Suche: Signatur, Titel, Dokumenttyp, Datum
- Unbearbeitete Objekte dezent markiert (opacity, Tooltip)
- Inline-Detailflaechen mit "Zum Wissenskorb"-Button
- Bookmark-Icons an jeder Zeile (Hover → sichtbar)

### Indizes

- Vier Grid-Bloecke: Personen, Organisationen, Orte, Werke
- Cross-Grid-Facettensuche: Klick auf Index-Eintrag filtert die anderen 3 Grids
- Facet-Chip mit Entfernen-Button ueber den Grids
- Detail-Expansion auf 10 Records begrenzt + "Alle im Archiv anzeigen" Link
- Grid-Count zeigt gefilterte/total bei aktivem Filter
- Suche, Sortierung, Expansion und Seiteneinstieg in zugehoerige Records

### Matrix

- Begegnungsstruktur als Heatmap (Person x Zeitraum)
- Kategoriefilter und Drilldown auf Dokumentliste

### Kosmos

- Repertoire-/Rollenbezug als Force-Graph
- Fokus-Interaktionen, Zoom/Pan, Legendenlogik

## Designsystem (konsolidiert)

- Funktionale Farbsemantik statt ueberfrachteter Einzeltypen-Farben
- Typografische Rollen fuer UI, Titel und Signaturdarstellung
- Konsistente Abwesenheitsdarstellung fuer fehlende Erschliessungsangaben

## Forschungsbezug

- Archiv und Indizes: Quellenbezug und Nachvollziehbarkeit
- Matrix: Netzwerk- und Zeitmuster
- Kosmos: Repertoire- und Rollenprofil

### Wissenskorb (Session 10)

- Bookmark-Icons in Archiv (Bestand-Zeilen, Inline-Detail) und Indizes (Detail-Records)
- Korb-Tab (5. Tab) mit Badge-Count, nur sichtbar bei >= 1 Item
- Sortierte Record-Liste mit Signatur, Titel, Typ-Badge, Entfernen-Button
- sessionStorage-Persistenz (kein Server)
- Empty-State mit Anleitung

## Offene Luecken und Constraints

- Deferred Features (z. B. Matrix-Zeitzoom, erweiterte Index-Hierarchien)
- Reconciliation-Pfad fuer Wikidata noch nicht als eigenes Skript im Repo
- Datenabdeckung ist weiterhin der dominierende Qualitaetshebel
