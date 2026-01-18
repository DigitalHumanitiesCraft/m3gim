# Evaluation der vier Visualisierungen

## Bewertungskriterien

Jede Visualisierung muss **alle drei Kriterien** erfüllen:
1. **Intuitiv:** Verständlich ohne Erklärung, folgt bekannten Mustern
2. **Funktional:** Liefert forschungsrelevante Erkenntnisse, beantwortet Fragen
3. **Ästhetisch ansprechend:** Visuell attraktiv, einladend zur Exploration

---

## 1. Mobilitäts-Partitur

| Kriterium | Erfüllt? | Begründung |
|-----------|----------|------------|
| **Intuitiv** | ✅ Ja | Zeitachse horizontal, Spuren vertikal – Standard-Pattern. Fokus-Linie als Cursor ist vertraut. Die Partitur-Metapher (parallele Stimmen) ist für musikaffines Publikum sofort verständlich. |
| **Funktional** | ✅ Ja | Beantwortet "Was passierte gleichzeitig?", "Wie entwickelte sich X über Zeit?", "Wann waren Umbruchpunkte?". Adressiert FF4 direkt (Mobilität), FF1-FF3 sekundär. |
| **Ästhetisch** | ⚠️ Bedingt | Die Swimlane-Layouts sind funktional, aber die visuelle Dichte kann überwältigend sein. Farbcodierung (Mobilität, Komponisten, Orte) ist konsistent, aber viele Farben gleichzeitig. |

**Verbesserungspotential für Ästhetik:**
- Dezentere Grautöne für Grid-Linien
- Sanftere Farbverläufe statt harter Kanten
- Mehr Weißraum zwischen Spuren

**Gesamturteil: ✅ Erfüllt** – Kernvisualisierung für das Projekt. Ästhetik ist akzeptabel, aber verbesserbar.

---

## 2. Begegnungs-Matrix

| Kriterium | Erfüllt? | Begründung |
|-----------|----------|------------|
| **Intuitiv** | ✅ Ja | Heatmap ist ein etabliertes Pattern. Zeilen = Personen, Spalten = Zeiträume, Farbe = Intensität. Sortierung nach Kategorien mit Separatoren macht Struktur sichtbar. |
| **Funktional** | ✅ Ja | Beantwortet "Wer war wann wichtig?", "Wie veränderte sich das Netzwerk?", "Welche Kategorien dominierten wann?". Adressiert FF1, FF3 direkt. |
| **Ästhetisch** | ✅ Ja | Klares Grid, konsistente Farbskala (Blau-Verlauf), Kategoriefarben als Akzente. Intensitätszahlen in Zellen geben Präzision ohne Überladung. |

**Stärke:** Die Kombination aus Übersicht (Heatmap) und Details (Zahlen in Zellen) ist elegant.

**Gesamturteil: ✅ Erfüllt** – Gelungene Visualisierung auf allen drei Ebenen.

---

## 3. Rollen-Kosmos

| Kriterium | Erfüllt? | Begründung |
|-----------|----------|------------|
| **Intuitiv** | ⚠️ Bedingt | Radiale Layouts sind visuell ansprechend, aber die Hierarchie (Zentrum → Komponist → Rolle) muss erklärt werden. Click-to-Focus ist nicht selbsterklärend – der Hinweistext ist nötig. |
| **Funktional** | ✅ Ja | Beantwortet "Welche Komponisten dominierten?", "Welche Rollen waren zentral?", "Wie breit war das Repertoire?". Adressiert FF2 direkt. |
| **Ästhetisch** | ✅ Ja | Visuell attraktiv, organisch durch Force-Layout. Farbcodierung nach Komponisten ist einprägsam. Die radiale Form weckt Neugier. |

**Problem bei Intuitivität:**
- Nutzer erwarten bei Kreisen eher eine Karte oder ein einfaches Netzwerk
- Die Drei-Ebenen-Hierarchie (Zentrum, Komponisten, Rollen) ist nicht sofort lesbar
- Lösung: Legende verbessern, Hierarchie expliziter machen

**Verbesserungsvorschlag:**
- Konzentrische Ringe andeuten (gestrichelte Kreise für Komponisten-Ebene und Rollen-Ebene)
- "Orbit"-Metapher kommunizieren: "Rollen kreisen um ihre Komponisten"

**Gesamturteil: ⚠️ Bedingt erfüllt** – Ästhetik und Funktion stark, Intuitivität verbesserbar.

---

## 4. Karriere-Fluss

| Kriterium | Erfüllt? | Begründung |
|-----------|----------|------------|
| **Intuitiv** | ⚠️ Bedingt | Alluvial/Sankey-Diagramme sind weniger verbreitet. Die Leserichtung (links→rechts) ist klar, aber die Bedeutung der Spalten muss erklärt werden. |
| **Funktional** | ⚠️ Bedingt | Zeigt Zusammenhänge, aber auf sehr aggregierter Ebene. Die Frage "Wie hängen Phase, Repertoire und Ort zusammen?" ist relevant für FF2/FF4, aber weniger dringlich als die detaillierteren Ansichten. |
| **Ästhetisch** | ✅ Ja | Fließende Kurven sind elegant, Farbcodierung ist konsistent mit Kosmos. Die Drei-Spalten-Struktur ist klar. |

**Kritische Bewertung:**
- **Redundanz mit Partitur:** Beide zeigen Entwicklung über Zeit, aber Partitur zeigt mehr Details
- **Aggregationsverlust:** Individuelle Dokumente/Ereignisse werden unsichtbar
- **Nutzen unklar:** Was lernt man, was die Partitur nicht zeigt?

**Mehrwert des Karriere-Flusses:**
+ Zeigt **kategoriale Zusammenhänge**, nicht nur zeitliche
+ Beantwortet: "Welches Repertoire dominierte wo?" – das ist in der Partitur nicht direkt lesbar
+ Kompakte Übersicht für Einsteiger, bevor sie in Details gehen

**Gesamturteil: ⚠️ Bedingt erfüllt** – Ästhetik ja, Funktionalität und Intuitivität fraglich. Könnte durch bessere Alternative ersetzt werden.

---

## Zusammenfassung

| Visualisierung | Intuitiv | Funktional | Ästhetisch | Gesamt |
|----------------|----------|------------|------------|--------|
| **Partitur** | ✅ | ✅ | ⚠️ | ✅ Behalten |
| **Matrix** | ✅ | ✅ | ✅ | ✅ Behalten |
| **Kosmos** | ⚠️ | ✅ | ✅ | ⚠️ Verbessern |
| **Karriere-Fluss** | ⚠️ | ⚠️ | ✅ | ❓ Überdenken |

---

## Empfehlung

### Behalten und verbessern:
1. **Partitur** – Ästhetik aufräumen (mehr Weißraum, sanftere Farben)
2. **Matrix** – Keine Änderung nötig
3. **Kosmos** – Konzentrische Hilfskreise hinzufügen, Hierarchie klarer kommunizieren

### Überdenken:
4. **Karriere-Fluss** – Drei Optionen:

**Option A: Behalten wie ist**
- Mehrwert: Kompakte kategoriale Übersicht
- Risiko: Wirkt wie "Filler", wenn Partitur existiert

**Option B: Ersetzen durch Karte**
- Geografische Mobilität mit Leaflet
- Zeigt räumliche Dimension, die in Partitur nur als Track existiert
- Intuitiver (Karten sind universal verständlich)
- Adressiert FF4 direkter

**Option C: Zu einem "Netzwerk-Graph" umbauen**
- Force-Graph wie im DESIGN.md beschrieben
- Zeigt Personen-Beziehungen, ergänzt Matrix
- Adressiert FF1, FF3

### Meine Empfehlung: Option B (Karte)

Die Karte wäre:
- **Intuitiver:** Karten brauchen keine Erklärung
- **Funktionaler für FF4:** Mobilitätsformen direkt räumlich zeigen
- **Ästhetisch:** Leaflet + CartoDB Positron ist elegant
- **Distinct:** Völlig andere visuelle Sprache als die anderen drei

Die Partitur zeigt Zeit, die Matrix zeigt Beziehungen, der Kosmos zeigt Repertoire – eine **Karte** würde den **Raum** zeigen. Das wäre eine vollständigere Abdeckung der Dimensionen.

---

## Entscheidungsbedarf

Soll der Karriere-Fluss:
1. Beibehalten werden (mit Verbesserungen der Intuitivität)?
2. Durch eine Karte ersetzt werden?
3. Durch ein Personen-Netzwerk ersetzt werden?

---

*Version 1.0 – 2026-01-18*
