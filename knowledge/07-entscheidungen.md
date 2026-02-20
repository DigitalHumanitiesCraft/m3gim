# Entscheidungen, Schulden & Prozesswissen

> 25 finale + 3 offene Architekturentscheidungen. Technische Schulden und Learnings aus Iteration 1.

---

## Architekturentscheidungen (final)

| ID | Entscheidung |
|---|---|
| E-01 | Vanilla JS (kein Framework) |
| E-02 | D3.js v7 für alle Visualisierungen |
| E-03 | Vite v5 als Build-Tool |
| E-04 | Leaflet + CartoDB (deferred auf Iteration 2) |
| E-05 | Offline-first (alle Daten bei Startup) |
| E-06 | Google Sheets als Erfassungstool |
| E-07 | Wikidata Q-IDs als Normdaten |
| E-08 | JSON-LD / RiC-O 1.1 als Datenformat |
| E-09 | Mobilitätsform-Präfix `[mobilität:]` im Anmerkungsfeld |
| E-10 | Synthetische Daten mit `_meta.synthetic` |
| E-11 | Vier Visualisierungen (Partitur, Matrix, Kosmos, Karrierefluss) |
| E-12 | Netzwerk-Schwellenwert 3+ für Matrix |
| E-13 | 5-Jahres-Intervalle in Matrix |
| E-14 | Komponisten-Farbkodierung |
| E-15 | 7 Lebensphasen LP1–LP7 |
| E-16 | Scroll-Morphing im Kosmos |
| E-17 | Farbe + Linienstil für Mobilitätstypen |
| E-18 | Zwei-Bereiche-Architektur (Archiv + Analyse) |
| E-19 | Tektonik-Navigation als Hauptnavigation |
| E-20 | Side Panel + Modal für Details |
| E-21 | Collapsible Provenienz-Darstellung |
| E-22 | Gruppierte Verknüpfungen mit Icons |
| E-23 | Horizontale Toolbar für Visualisierungen |
| E-24 | Export CSV > JSON-LD > GEXF > GeoJSON |
| E-25 | Keine präemptive Performance-Optimierung |

---

## Offene Entscheidungen

| Thema | Priorität | Optionen |
|---|---|---|
| Karrierefluss vs. Karte | mittel | Sankey beibehalten oder durch Leaflet-Karte ersetzen |
| Matrix Zeitfilter UI | hoch | Slider, Dropdown, oder Timeline-Brush |
| Deep Linking | niedrig | Hash-basiert oder URL-Parameter |

---

## Technische Schulden (Iteration 1)

- `app.js` monolithisch (1.101 Zeilen)
- `partitur.js` monolithisch (4.460 Zeilen)
- Synthetische Daten noch in Frontend-Code praesent (Iteration 1 Artefakt)
- Kategoriefilter-HTML ohne JS-Binding
- Kein CSV/JSON-LD-Export aus Archiv-View
- Inline-CSS in partitur.js

---

## Verschobene Features

| Priorität | Feature |
|---|---|
| Hoch | Matrix Zeitfilter |
| Hoch | Matrix Kategoriefilter aktivieren |
| Hoch | Export CSV/JSON-LD/GEXF |
| Mittel | Deep Linking |
| Mittel | Cross-Visualization Linking |
| Niedrig | Leaflet Karte |
| Niedrig | Kosmos Scroll-Morphing |

---

## Prozesswissen (Iteration 1)

### Was funktioniert hat

- Promptotyping-Dokumente als Source of Truth (9 Knowledge-Docs → Code-Generierung)
- Synthetische Daten entkoppeln Frontend- von Datenarbeit
- Design-System als CSS Custom Properties vorab definiert
- Offline-first überlebt Funding-Gaps
- Iterative Vis-Entwicklung (Partitur zuerst → Patterns für Matrix/Kosmos/Karrierefluss)

### Was in Iteration 2 anders

- Data-first statt UI-first
- Modularisierung von Anfang an
- User Testing früher
- Evaluation-driven Priorisierung (FF3=60% braucht Aufmerksamkeit)
- Controlled Vocabulary Enforcement bei Datenerfassung

### Positive Überraschungen aus der Datenanalyse

- Erschließungstiefe bei 3 Konvoluten (1.246 effektive Verknüpfungen) übertrifft Erwartungen
- Gender-inklusives Rollen-Vokabular (58 Werte mit `:in`-Form) zeigt sorgfältige Erfassung
- 257/296 Personen mit Kategorie — Begegnungs-Matrix bekommt direkt Daten
- 134 Werk-Verknüpfungen ermöglichen substantiellen Rollen-Kosmos

### Erkenntnisse aus Daten-Exploration (Feb 2026)

- Konvolut-Hierarchie entdeckt: Objekt-ID = archivsignatur + folio (2 Spalten)
- Verknüpfung über String-Matching (`name`-Spalte), nicht über IDs
- Header-Shifts in 3 von 4 Indizes — Pipeline muss Spaltennamen mappen
- Dokumenttyp-Vokabular gewachsen (18 → 25 Werte)
- Case-Inkonsistenzen durchgängig — Pipeline normalisiert mit `.lower().strip()`
- Wikidata wird via Reconciliation-Script befüllt, nicht manuell
- 62/282 Objekte mit Verknüpfungen (22%) — Verknüpfungsarbeit steht am Anfang

---

Siehe auch: [→ Architektur](04-architektur.md) · [→ Visualisierungen](06-visualisierungen.md) · [→ Projekt](01-projekt.md)
