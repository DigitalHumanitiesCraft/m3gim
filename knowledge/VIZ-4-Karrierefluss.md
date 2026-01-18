# Visualisierung 4: Karriere-Fluss

## Konzept

Der Karriere-Fluss ist ein Alluvial-Diagramm (Sankey-Variante), das zeigt, wie sich Ira Malaniuks Karriere über drei Dimensionen entwickelt hat:
1. **Karrierephasen** (zeitliche Gliederung)
2. **Repertoire-Schwerpunkte** (ästhetische Dimension)
3. **Geografische Zentren** (räumliche Dimension)

Die Flows zwischen den Spalten zeigen, wie diese Dimensionen zusammenhängen: Welches Repertoire dominierte in welcher Phase? Wo wurde welches Repertoire aufgeführt?

**Kernmetapher:** Ein Fluss, der sich in Nebenarme aufteilt und wieder vereint. Die Karriere "fließt" durch Phasen, Repertoires und Orte.

**Einzigartiger Wert:** Der Karriere-Fluss zeigt **kategoriale Zusammenhänge**, nicht zeitliche Details. Er beantwortet: "Welches Repertoire dominierte wo?" – das ist in der Partitur nicht direkt lesbar.

## Adressierte Forschungsfragen

| FF | Relevanz | Wie adressiert | User Story |
|----|----------|----------------|------------|
| **FF1** | Mittel | Zeigt geografische Vernetzungsmuster | - |
| **FF2** | Hoch | Zeigt ästhetische Schwerpunktverschiebungen über die Karriere | US 2.3 |
| **FF3** | Gering | Nur implizit über Netzwerk-Orte | - |
| **FF4** | Hoch | Zeigt Mobilität zwischen geografischen Zentren | US 4.3 |

---

## User Stories & UI-Flows

### US 2.3: Karrieremuster erkennen

**Forscherin:** Dr. Novak (Kulturwissenschaft)
**Frage:** "Gab es typische Karrierepfade? Hängt geografische Expansion mit Repertoire-Erweiterung zusammen?"

**UI-Flow:**
```
1. Öffne "Analyse" → "Karriere-Fluss"
2. Lese den Erklärungs-Text: "Von links nach rechts..."
3. Folge einem Flow: "Höhepunkt" → "Wagner" → "Bayreuth"
4. ERKENNTNIS: In der Höhepunkt-Phase dominierte Wagner, v.a. in Bayreuth
5. Vergleiche mit "Anfänge" → "Verdi" → "Wien"
6. ERKENNTNIS: Verdi war die Basis, Wagner der Aufstieg
7. Hover über den dicksten Flow → Tooltip: "Stärke: 90, 5 Archivalien"
8. Klicke auf "Bayreuth" Knoten → Document Panel öffnet
9. Sehe: 8 Festspiel-Programme, 4 Verträge
```

**Forschungsergebnis:** Es gibt einen klaren Karrierepfad: Verdi/Wien → Wagner/Bayreuth → Strauss/München. Die geografische und ästhetische Expansion korrelieren.

---

### US 4.3: Geografische Zentren identifizieren

**Forscherin:** Mag. Berger (Kulturgeografie)
**Frage:** "Welche Orte waren die wichtigsten Karriere-Zentren?"

**UI-Flow:**
```
1. Öffne Karriere-Fluss → Fokussiere auf rechte Spalte "GEOGRAFISCHES ZENTRUM"
2. Vergleiche Knotengrößen: Wien, Bayreuth, München, Salzburg
3. ERKENNTNIS: Bayreuth hat die dicksten eingehenden Flows
4. Folge Bayreuth-Flows zurück:
   - Hauptsächlich aus "Wagner" (Repertoire)
   - Aus "Höhepunkt" und "Aufstieg" (Phasen)
5. ERKENNTNIS: Bayreuth = Wagner-Zentrum in Spitzenzeit
6. Vergleiche mit "Andere" → dünn, viele kleine Flows
7. ERKENNTNIS: Die Karriere war auf 4 Hauptorte konzentriert
```

**Forschungsergebnis:** Trotz internationaler Karriere waren nur 4 Orte wirklich zentral. "Andere" (London, Edinburgh, etc.) waren Randerscheinungen.

---

### US 2.4: Repertoire-Shift analysieren

**Forscherin:** Dr. Weber (Opernforschung)
**Frage:** "Wie veränderte sich der Repertoire-Fokus über die Karrierephasen?"

**UI-Flow:**
```
1. Öffne Karriere-Fluss
2. Folge "Anfänge" (links) → wohin fließt es?
   - Dicker Flow zu "Verdi"
   - Dünner Flow zu "Wagner"
3. Folge "Höhepunkt" (links) → wohin fließt es?
   - Sehr dicker Flow zu "Wagner"
   - Mittlerer Flow zu "Strauss"
4. ERKENNTNIS: Repertoire-Shift von Verdi → Wagner
5. Folge "Spätphase" → "Gluck/Händel"
6. ERKENNTNIS: Spätwerk = neue Exploration (Barock)
```

**Forschungsergebnis:** Drei Repertoire-Phasen: Verdi-Basis, Wagner-Höhepunkt, Barock-Spätwerk.

---

## Visuelle Spezifikation

### Drei-Spalten-Layout

```
KARRIEREPHASE          REPERTOIRE-SCHWERPUNKT     GEOGRAFISCHES ZENTRUM
─────────────          ──────────────────────     ─────────────────────

┌───────────┐          ┌────────────┐             ┌──────────┐
│ Anfänge   │═════════►│  Verdi     │═══════════►│  Wien    │
│ 1945-1950 │          └────────────┘             └──────────┘
└───────────┘              ║
                           ║
┌───────────┐              ║         ┌────────────┐
│ Aufstieg  │══════════════╬════════►│  Wagner    │═════════►┌──────────┐
│ 1950-1955 │              ║         └────────────┘          │ Bayreuth │
└───────────┘              ║                                  └──────────┘
                           ║
┌───────────┐              ║         ┌────────────┐           ┌──────────┐
│ Höhepunkt │══════════════╩════════►│  Strauss   │═════════►│ München  │
│ 1955-1965 │                        └────────────┘           └──────────┘
└───────────┘
                                     ┌────────────┐           ┌──────────┐
┌───────────┐                        │ Gluck/     │═════════►│ Salzburg │
│ Spätphase │═══════════════════════►│ Händel     │           └──────────┘
│ 1965-1970 │                        └────────────┘
└───────────┘
```

### Farbkodierung

Flows erben die Farbe des **Repertoire-Knotens** (mittlere Spalte):

| Repertoire | Hex | Konsistent mit Kosmos |
|------------|-----|----------------------|
| Wagner | #8B0000 | Dunkelrot |
| Verdi | #006400 | Dunkelgrün |
| Strauss | #4B0082 | Violett |
| Gluck/Händel | #B8860B | Gold/Braun |

### Flow-Breite

```
Flow-Breite = log(Dokumentenmenge + 1) * Skalierungsfaktor

Minimum: 2px (auch bei 1 Dokument)
Maximum: 30px (bei sehr vielen Dokumenten)
```

### Knoten-Größe

- **Phase:** Fixe Höhe, Breite proportional zur Dauer
- **Repertoire:** Höhe proportional zur Dokumentenmenge
- **Geo:** Höhe proportional zur Dokumentenmenge

---

## Implementierungsstatus

| Feature | Status | Details |
|---------|--------|---------|
| 3-Spalten-Alluvial | ✅ | Phase → Repertoire → Geo |
| Bezier-Kurven für Flows | ✅ | Fließende Übergänge |
| Farbcodierung nach Komponist | ✅ | Konsistent mit Kosmos |
| Hover auf Flow | ✅ | Highlight + Tooltip mit Stärke |
| Klick auf Knoten → Document Panel | ✅ | Archivalien-Liste |
| Leserichtungspfeile | ✅ | → zwischen Spalten |
| Narrative Anleitung | ✅ | Text oben + unten |
| Spaltenüberschriften | ✅ | KARRIEREPHASE, REPERTOIRE, GEO |
| **Filter nach Mobilitätsform** | ⚠️ | HTML existiert, nicht verbunden |
| **Zeitfilter** | ❌ | FEHLT |
| **Export** | ❌ | FEHLT |

---

## Kritische Evaluation

### Stärken

1. **Kategoriale Zusammenhänge:** Was hängt womit zusammen? Nicht ableitbar aus Partitur
2. **Einstiegsfreundlich:** Kompakte Übersicht für Laien
3. **Archiv-Link:** Jeder Knoten führt zu Quellen
4. **Leserichtung kommuniziert:** Pfeile und Text erklären die Lesart

### Schwächen

1. **Redundanz mit Partitur:** Beide zeigen Entwicklung über Zeit
2. **Aggregationsverlust:** Individuelle Dokumente/Ereignisse werden unsichtbar
3. **Subjektive Phaseneinteilung:** "Anfänge", "Höhepunkt" sind interpretativ
4. **Keine Zeitskala:** Jahre sind nur in Labels sichtbar

### Kritische Frage: Brauchen wir diese Visualisierung?

**Argument für den Karriere-Fluss:**
- Zeigt *kategoriale* Zusammenhänge, nicht nur *zeitliche*
- Beantwortet "Welches Repertoire dominierte wo?" – in Partitur nicht direkt lesbar
- Kompakte Übersicht für Einsteiger

**Argument gegen den Karriere-Fluss:**
- Redundant mit Partitur (Zeit) und Kosmos (Repertoire)
- Subjektive Phaseneinteilung
- Weniger forschungsrelevant als Matrix (FF1/FF3)

**Empfehlung aus VIZ-Evaluation:** Option B (Karte) wäre intuitiver für FF4. Der Karriere-Fluss ist "nice to have", aber nicht essenziell.

---

## Alternative: Geografische Karte

Statt des Karriere-Flusses könnte eine **Leaflet-Karte** implementiert werden:

| Aspekt | Karriere-Fluss | Karte |
|--------|---------------|-------|
| Intuitivität | ⚠️ Muss erklärt werden | ✅ Universal verständlich |
| FF4-Relevanz | ⚠️ Indirekt | ✅ Direkt (Mobilität räumlich) |
| Ästhetik | ✅ Elegant | ✅ Elegant |
| Einzigartigkeit | ✅ Anderer Blickwinkel | ⚠️ Ähnlich wie Partitur-Orte |

**Entscheidung offen:** Soll der Karriere-Fluss beibehalten oder durch eine Karte ersetzt werden?

---

## Verbesserungsvorschläge mit Begründung

### Wenn der Karriere-Fluss bleibt:

| Priorität | Feature | Forschungsnutzen | Aufwand |
|-----------|---------|------------------|---------|
| HOCH | Mobilitätsform-Filter aktivieren | FF4 direkt adressieren | Gering |
| MITTEL | Prozentangaben in Flows | "45% des Repertoires war Wagner" | Gering |
| MITTEL | Export als SVG | Für Publikationen | Gering |
| NIEDRIG | Animierte Flows | Zeigt Entwicklung dynamisch | Hoch |

### Wenn eine Karte stattdessen kommt:

| Priorität | Feature | Forschungsnutzen | Aufwand |
|-----------|---------|------------------|---------|
| HOCH | Leaflet + CartoDB Positron | Moderne, neutrale Basiskarte | Mittel |
| HOCH | Mobilitätslinien mit Animation | Bewegungsrichtung sichtbar | Mittel |
| MITTEL | Farbcodierung nach Mobilitätsform | FF4 Kernfrage | Gering |
| MITTEL | Zeitfilter-Slider | Nur 1950-1960 zeigen | Mittel |

---

## Testplan

### Funktionale Tests

| Test | Erwartetes Ergebnis | Status |
|------|---------------------|--------|
| Hover auf Flow | Flow highlighted, Tooltip mit Stärke | ✅ |
| Klick auf Phase-Knoten | Document Panel mit Phasen-Dokumenten | ✅ |
| Klick auf Repertoire-Knoten | Document Panel mit Komponisten-Dokumenten | ✅ |
| Klick auf Geo-Knoten | Document Panel mit Orts-Dokumenten | ✅ |
| Leserichtung erkennbar | Pfeile und Text vorhanden | ✅ |

### Forschungs-Tests

| Test | Forschungsfrage | Erwartetes Ergebnis | Status |
|------|-----------------|---------------------|--------|
| Repertoire-Shift erkennen | FF2 | Verdi→Wagner Entwicklung sichtbar | ✅ |
| Karriere-Zentren identifizieren | FF4 | Bayreuth als Wagner-Ort erkennbar | ✅ |
| Phasen-Repertoire-Korrelation | FF2 | "Höhepunkt" korreliert mit Wagner | ✅ |
| Quantitative Aussage ablesen | FF2 | ⚠️ Keine Prozentzahlen | ⚠️ |

---

## Daten-Aggregationslogik

### Phase → Repertoire Flow

```javascript
// Für jeden Flow (Phase → Komponist):
karrierephasen.forEach(phase => {
  werke.forEach(werk => {
    const dokumente = werk.rollen.flatMap(r => r.dokumente || [])
      .filter(docId => {
        const doc = archiveDocuments[docId];
        const docYear = parseInt(doc.datum);
        return docYear >= phase.von && docYear <= phase.bis;
      });

    if (dokumente.length > 0) {
      flows.push({
        source: phase.id,
        target: `komp-${werk.komponist}`,
        value: dokumente.length,
        dokumente: dokumente
      });
    }
  });
});
```

### Repertoire → Geo Flow

```javascript
// Für jeden Flow (Komponist → Ort):
werke.forEach(werk => {
  orte.forEach(ort => {
    const dokumente = findSharedDocuments(werk, ort);

    if (dokumente.length > 0) {
      flows.push({
        source: `komp-${werk.komponist}`,
        target: `geo-${ort.id}`,
        value: dokumente.length,
        dokumente: dokumente
      });
    }
  });
});
```

---

## Offene Fragen für Forscher*innen

1. **Karrierephasen:** Sind "Anfänge, Aufstieg, Höhepunkt, Spätphase" die richtigen Einteilungen? Gibt es musikwissenschaftlich bessere Begriffe?

2. **Repertoire-Kategorien:** Sollen wir "Gluck/Händel" zusammenfassen oder trennen? Was ist mit Strauss vs. anderen Spätromantikern?

3. **Geografische Kategorien:** Ist "Andere" eine sinnvolle Kategorie, oder sollten wir London, Edinburgh, etc. explizit zeigen?

4. **Grundsatzfrage:** Ist der Karriere-Fluss wertvoll genug, oder soll er durch eine Karte ersetzt werden?

---

## Empfehlung

**Behalten mit Einschränkungen:**

Der Karriere-Fluss ist die *schwächste* der vier Visualisierungen, aber er hat einen spezifischen Wert: Er zeigt kategoriale Zusammenhänge auf einen Blick. Für Laien und als Einstieg ist er nützlich.

**Nächste Schritte:**
1. Mobilitätsform-Filter aktivieren (HTML existiert bereits)
2. Prozentangaben in Tooltips hinzufügen
3. Nach Projektfeedback: Entscheidung über Karte als Alternative

---

*Version 2.0 – 2026-01-18*
*Erweitert um User Stories, kritische Evaluation und Alternativ-Vorschlag*
