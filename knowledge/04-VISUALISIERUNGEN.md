# M³GIM Visualisierungen

## Übersicht

| Visualisierung | Forschungsfragen | Kernfrage | Bibliothek |
|----------------|------------------|-----------|------------|
| **Mobilitäts-Partitur** | FF1, FF2, FF3, FF4 | Was passierte wann gleichzeitig? | D3.js |
| **Begegnungs-Matrix** | FF1, FF3 | Wer war wann wichtig? | D3.js |
| **Rollen-Kosmos** | FF2 | Was war das Repertoire? | D3.js |
| **Karrierefluss** | FF2, FF4 | Was hängt zusammen? | D3.js (Sankey) |

## 1. Mobilitäts-Partitur

### Konzept

Multi-Layer Timeline mit 6 parallelen Spuren – wie eine Orchesterpartitur. Ermöglicht synchrone ("Was passierte 1958?") und diachrone ("Wie entwickelte sich das Repertoire?") Lesart.

### Spuren

| Spur | Inhalt | Farbe |
|------|--------|-------|
| Lebensphasen | Kindheit, Studium, Aufstieg, Höhepunkt, Ruhe | KUG Blau (20% opacity) |
| Orte | Wohnort (groß) + Aufführungsorte (gestapelt) | Orts-Farbskala |
| Mobilität | Ereignisse mit Form-Klassifikation | Rot/Grün/Violett |
| Netzwerk | Dichte der Begegnungen pro Periode | KUG Blau Gradient |
| Repertoire | Rollen als horizontale Balken | Komponisten-Farben |
| Dokumente | Anzahl pro Jahr (Kreise) | Grau |

### Interaktion

- **Fokus-Slider:** Vertikale Linie markiert Jahr
- **Spur-Filter:** Checkboxen zum Ein/Ausblenden
- **Klick auf Element:** Document Panel mit Archivalien

### User Stories

**US 2.2 (Repertoire-Entwicklung):**
1. Scrolle zur Repertoire-Spur
2. Erkenne: Amneris (grün) beginnt früh, Fricka (rot) später
3. Setze Fokus auf 1952 → Wagner-Explosion ab Bayreuth-Debüt

**US 4.1 (Mobilitätsformen):**
1. Fokussiere Mobilitäts-Spur
2. 1944: Roter Kreis (E) = Flucht
3. 1945-1955: Grüne Kreise (G) = Karriere-Pendeln
4. 1970: Violetter Kreis (L) = Übersiedlung Zürich

---

## 2. Begegnungs-Matrix

### Konzept

Heatmap: Zeilen = Personen, Spalten = 5-Jahres-Perioden. Farbintensität = Begegnungshäufigkeit. Gruppiert nach Kategorie.

### Kategorien

| Kategorie | Farbe | Beispiele |
|-----------|-------|-----------|
| Dirigent | #4A6E96 | Karajan, Böhm, Knappertsbusch |
| Regisseur | #6B4E8C | Wieland Wagner |
| Vermittler | #3D7A5A | Erik Werba, Agentur Taubman |
| Kollege | #9A6B3D | Christa Ludwig, Sena Jurinac |

### Intensitätsskala

| Wert | Hex | Bedeutung |
|------|-----|-----------|
| 0 | #F5F3EF | Keine Begegnung |
| 1-2 | #E3EDF7 | Gering |
| 3-4 | #6AACDC | Mittel |
| 5+ | #0A5189 | Sehr hoch |

### Interaktion

- **Hover:** Tooltip mit Person, Zeitraum, Intensität
- **Klick auf Zelle:** Document Panel mit Dokumenten
- **Kategoriefilter:** Nur Dirigenten/Vermittler zeigen

### User Stories

**US 1.1 (Schlüsselpersonen):**
1. Identifiziere dunkle Zeilen → wichtige Personen
2. Karajan 1955-1959 sehr dunkel → Salzburg-Engagement
3. Karajan 1960+ leer → Beziehungsende (warum?)

**US 3.1 (Vermittler):**
1. Filtere auf "Vermittler"
2. Erik Werba durchgehend 1945-1969
3. → Kontinuitätsgarant durch alle Phasen

---

## 3. Rollen-Kosmos

### Konzept

Radiales Force-Graph: Zentrum = Malaniuk, Innerer Ring = Komponisten, Äußerer Ring = Rollen. Größe = Dokumentenmenge.

### Hierarchie

```
            ROLLEN (Radius 280)
           ○ Fricka  ○ Waltraute
                  \    /
       KOMPONISTEN (Radius 160)
        ● Wagner    ● Verdi
              \    /
           ZENTRUM
         IRA MALANIUK
```

### Click-to-Focus

1. **Normal:** Alle Elemente gedimmt
2. **Klick auf Komponist:** Fokus → nur dessen Rollen sichtbar
3. **Klick auf Zentrum/Hintergrund:** Reset

### Interaktion

- **Hover auf Komponist:** Tooltip mit Werke-Anzahl
- **Hover auf Rolle:** Zeitraum, Dokumentenzahl
- **Klick auf Rolle:** Document Panel

### User Stories

**US 2.1 (Repertoire-Schwerpunkte):**
1. Wagner (rot) und Verdi (grün) sind größte Knoten
2. → Zwei Säulen, nicht nur Wagner-Spezialistin
3. Klick auf Wagner → Fricka ist dominanteste Rolle

---

## 4. Karrierefluss

### Konzept

Alluvial-Diagramm mit 3 Spalten: Karrierephase → Repertoire → Geografisches Zentrum. Flows zeigen Zusammenhänge.

### Spalten

| Spalte | Knoten |
|--------|--------|
| KARRIEREPHASE | Anfänge, Aufstieg, Höhepunkt, Spätphase |
| REPERTOIRE | Wagner, Verdi, Strauss, Gluck/Händel |
| GEO | Wien, Bayreuth, München, Salzburg |

### Flow-Farben

Flows erben die Farbe des Repertoire-Knotens (Wagner=rot, Verdi=grün).

### Interaktion

- **Hover auf Flow:** Highlight + Tooltip mit Stärke
- **Klick auf Knoten:** Document Panel

### Kritische Bewertung

**Stärken:**
- Zeigt kategoriale Zusammenhänge auf einen Blick
- Kompakte Übersicht für Einsteiger

**Schwächen:**
- Redundant mit Partitur (beide zeigen Zeit)
- Subjektive Phaseneinteilung
- Könnte durch Karte ersetzt werden (für FF4)

---

## Document Panel

Alle Visualisierungen führen zum Document Panel:

1. **Klick auf Element** → Panel öffnet rechts
2. **Inhalt:** Liste der verknüpften Archivalien
3. **Klick auf Dokument** → Modal mit Details
4. **Schließen:** Klick außerhalb oder X-Button

---

## Zielerreichung pro Forschungsfrage

| FF | Visualisierung | Erreichung | Begründung |
|----|----------------|------------|------------|
| **FF1** | Matrix | 75% | Netzwerke erkennbar, Zeitfilter fehlt |
| **FF2** | Kosmos + Partitur | 90% | Repertoire sehr gut visualisiert |
| **FF3** | Matrix | 65% | Vermittler erkennbar, Transfer-Inhalte nicht |
| **FF4** | Partitur | 85% | Mobilitätsformen klar, Karte fehlt |

## Offene Erweiterungen

### Priorität HOCH
- Zeitfilter für Matrix
- Export-Funktionen (CSV, SVG)

### Priorität MITTEL
- Cross-Visualization Links
- Geografische Karte (Alternative zu Karrierefluss)

### Priorität NIEDRIG
- Annotation-System
- Animierte Zeitreise

---

*Version 1.0 – 2026-01-18*
*Konsolidiert aus VIZ-1 bis VIZ-4, VIZ-Evaluation, VIZ-Zusammenfassung*
