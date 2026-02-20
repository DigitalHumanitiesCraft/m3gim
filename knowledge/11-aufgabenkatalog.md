# Aufgabenkatalog — Session 9

> 33 identifizierte Verbesserungen, priorisiert und statusverfolgt. Basiert auf dem Soll-Ist-Abgleich v5.0.

---

## Übersicht

| Status | Anzahl |
|--------|--------|
| DONE | 23 |
| DEFERRED | 10 |

---

## Farbsystem (F)

| ID | Beschreibung | Status | Milestone |
|----|-------------|--------|-----------|
| F-1 | Einheitliche Badge-Farbe (Grau statt per-Typ-Farben) | DONE | M7 |
| F-2 | Empty-State Farbe (Grau + Kursiv) | DONE | M2 (QW-3) |
| F-3 | VKN.-Spalte Signal-Grün bei >0 | DONE | M7 |
| F-4 | Detail-Panel Hintergrund | DEFERRED | — |
| F-5 | Stats-Bar Badges | DONE (obsolet) | M8 (Stats-Bar entfernt) |
| F-6 | Konvolut-Zeilen ohne Hintergrund (Hierarchie via Typografie) | DONE | M7 |
| F-7 | Personen-Index Kategorie-Farbstriche entfernt | DONE | M7 |
| F-8 | Index-Count-Farbe auf `--color-text-secondary` | DONE | M7 |
| F-9 | Wikidata-Badge auf Signal-Grün | DONE | M7 |
| F-10 | Folio-Zeilen ohne Hintergrundfarbe | DONE | M7 |

---

## Übergreifend (Ü)

| ID | Beschreibung | Status | Milestone |
|----|-------------|--------|-----------|
| Ü-1 | Counter-Duplikat bereinigen (Stats-Bar + Archiv-Counter) | DONE | M8 |
| Ü-2 | Erschließungsdashboard | DEFERRED | — |
| Ü-3 | Konsistentes Abwesenheits-Pattern (`--color-absent`) | DONE | M7 |

---

## Bestand (B)

| ID | Beschreibung | Status | Milestone |
|----|-------------|--------|-----------|
| B-1 | Folio-Differenzierung (Zusatzinfo bei identischen Titeln) | DONE | M9 |

---

## Chronik (C)

| ID | Beschreibung | Status | Milestone |
|----|-------------|--------|-----------|
| C-1 | Chronik-Gruppierung Ort/Person/Werk | DONE | M4 |
| C-2 | "Ohne Ort"-Hinweis (Schicht-2-Kontext) | DONE | M9 |
| C-3 | Undatierte Objekte erklärt ("ohne Datumsangabe in der Quelle") | DONE | M9 |
| C-4 | Agenten-Tooltip (vollständige Liste bei >3) | DONE | M9 |

---

## Indizes (I)

| ID | Beschreibung | Status | Milestone |
|----|-------------|--------|-----------|
| I-1 | Indizes 4-Grid mit Suche und Sortierung | DONE | Iteration 2 |
| I-2 | Personen-Filter im Archiv | DONE | M6 |
| I-3 | Orts-Hierarchie im Index | DEFERRED | — |
| I-4 | Dokumenttyp-Filter im Index | DEFERRED | — |
| I-5 | Merkliste + CSV-Export | DEFERRED | — |

---

## Matrix (M)

| ID | Beschreibung | Status | Milestone |
|----|-------------|--------|-----------|
| M-1 | Matrix-Drilldown bei Zellen-Klick | DONE | M3 |
| M-2 | Kategorie-Kürzel in Y-Achse ([D], [R], etc.) | DONE | M10 |
| M-3 | Sortieroptionen (nach Intensität, Name, Kategorie) | DEFERRED | — |
| M-4 | Zeitauflösung/Zoom | DEFERRED | — |

---

## Kosmos (K)

| ID | Beschreibung | Status | Milestone |
|----|-------------|--------|-----------|
| K-1 | Visuelle Legende (Graduated Circles + Kantendicke) | DONE | M10 |
| K-2 | Klickbare Tags → Index-Navigation | DONE | M5 |
| K-3 | Temporaler Slider | DEFERRED | — |
| K-4 | Zoom/Pan (d3.zoom) | DONE | M10 |

---

## Interaktion (IT)

| ID | Beschreibung | Status | Milestone |
|----|-------------|--------|-----------|
| IT-1 | Matrix-Drilldown (= M-1) | DONE | M3 |
| IT-3 | Chronik-Gruppierung (= C-1) | DONE | M4 |
| IT-4 | Klickbare Tags in Detail → Index | DONE | M5 |

---

## Deferred (10 Items)

Bewusst zurückgestellt — wertvoll, aber komplex oder abhängig von mehr Daten:

| ID | Grund |
|----|-------|
| F-4 | Minor visual tweak (Detail-Panel Hintergrund) |
| Ü-2 | Erschließungsdashboard braucht eigenes Modul |
| I-3 | Komplex: Parser für "Stadt, Straße" mit Handreichungs-Konventionen |
| I-4 | Nice-to-have, niedrige Priorität |
| I-5 | Eigenes Feature: localStorage-Modul, Export-Formate |
| M-3 | Matrix funktioniert auch ohne Sortierung |
| M-4 | Erfordert dynamische Perioden-Aggregation |
| K-3 | Braucht Datums-Annotation im Aggregator |

---

Siehe auch: [→ Entscheidungen](07-entscheidungen.md) · [→ Architektur](04-architektur.md) · [→ Journal](journal.md)
