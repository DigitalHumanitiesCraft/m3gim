# Produkt, UI und Visualisierungen

> Kanonische Quelle fuer Informationsarchitektur, Interaktionen, Designsystem und offene Produktluecken.

## Informationsarchitektur

### Datenorientierte Hauptbereiche

- Archiv
- Indizes
- Wissenskorb
- Matrix (ausgeblendet fuer Demo)
- Kosmos (ausgeblendet fuer Demo)

### Kontextseiten (statisches HTML, kein JS)

- Ueber (`about.html`) — Projektueberblick, Methodik, Datenstand
- Projekt (`projekt.html`) — Quellenbeschreibung, Tektonik, Erfassung, Modellierung
- Modell (`modell.html`) — Ontologie (RiC-O + m3gim), Verknuepfungstypen, Identifikatoren, Statistik
- Hilfe (`hilfe.html`) — Bedienung, Interaktion, Datumskonventionen, FAQ
- Einheitliches Template: info-header, info-nav, info-main, info-footer
- Statische Zahlen (aktualisieren nach Pipeline-Lauf, kein JS-Store)
- Optimale Lesebreite 720px, Source Serif 4 Titel, Print-Styles

### Routing

- Hash-basiertes Routing in `router.js` (nur Tabs: archiv, indizes, korb)
- Info-Seiten als eigenstaendige HTML-Dateien (normale Links, kein Hash-Routing)
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
- Reset-Button ("x Zuruecksetzen") setzt alle Filter gleichzeitig zurueck (nur sichtbar bei aktivem Filter)

### Indizes

- Vier Grid-Bloecke: Personen, Organisationen, Orte, Werke
- Cross-Grid-Facettensuche: Klick auf Index-Eintrag filtert die anderen 3 Grids
- Kompakte Toolbar: Suche (flex: 1) + Facet-Chips auf einer Zeile
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

### Wissenskorb (Session 10 + 12)

- Bookmark-Icons in Archiv (Bestand-Zeilen, Inline-Detail) und Indizes (Detail-Records)
- Korb-Tab immer sichtbar (auch bei 0 Items), Badge-Count bei >= 1
- Card-basierte Darstellung pro Record:
  - Header: Signatur (klickbar → Archiv), Titel, Typ-Badge, Entfernen-Button
  - Meta-Zeile: Datum, Sprache, Umfang, Status (Midpoint-Separator)
  - Verknuepfungen mit semantischer Trennung:
    - Personen und Institutionen als separate Zeilen (nach @type gesplittet)
    - Werke mit Rolle (auffuehrung, erwaehnt)
    - Orte, Rollen, Erwaehnt als klickbare Chips
  - Wikidata-Badges wo vorhanden
  - Konvolut-Info (Teil von Konvolut X)
  - Empty-State fuer unerschlossene Objekte
- Cross-Navigation: Signatur-Klick → Archiv mit Inline-Expansion, Chip-Klick → Index
- sessionStorage-Persistenz (kein Server)
- Empty-State mit Lesezeichen-Icon und Anleitung
- Detail-Panel (Sidebar) deaktiviert — alle Klicks navigieren zum Archiv-Tab

## Offene Luecken und Constraints

- Deferred Features (z. B. Matrix-Zeitzoom, erweiterte Index-Hierarchien)
- Reconciliation-Pfad fuer Wikidata noch nicht als eigenes Skript im Repo
- Datenabdeckung ist weiterhin der dominierende Qualitaetshebel
