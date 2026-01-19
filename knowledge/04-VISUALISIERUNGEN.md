# M³GIM Visualisierungen

## Überblick

Vier D3.js-Visualisierungen beantworten die Forschungsfragen aus verschiedenen Perspektiven.

| Visualisierung | Forschungsfragen | Kernfrage |
|----------------|------------------|-----------|
| **Mobilitäts-Partitur** | FF1, FF2, FF3, FF4 | Was passierte wann gleichzeitig? |
| **Begegnungs-Matrix** | FF1, FF3 | Wer war wann wichtig? |
| **Rollen-Kosmos** | FF2 | Was war das Repertoire? |
| **Karrierefluss** | FF2, FF4 | Was hängt zusammen? |

## Datenfluss

```
Excel → JSON-LD (RiC-O) → build-views.py → View-JSONs → D3.js
```

### Python-Pipeline

```bash
python scripts/build-views.py
```

Erzeugt in `data/views/`:
- `partitur.json` – Lebensphasen, Orte, Mobilität, Netzwerk, Repertoire, Dokumente
- `matrix.json` – Personen × Perioden mit gewichteter Intensität
- `kosmos.json` – Komponisten mit Werken, Orten, Rollen
- `sankey.json` – Karrierephasen → Repertoire → Orte mit Dokumentreferenzen

---

## 1. Mobilitäts-Partitur

**Konzept:** Multi-Layer Timeline – Biografie als Orchesterpartitur mit 6 Spuren.

### Spuren

| Spur | Daten | Visualisierung |
|------|-------|----------------|
| Lebensphasen | 7 Phasen (LP1–LP7) | Farbige Blöcke |
| Orte | Wohnorte + Aufführungsorte | Swimlane (oben/unten) |
| Mobilität | 5 Migrationsereignisse | Kreise mit Typ-Farbe |
| Netzwerk | Intensität pro Periode | Balkendiagramm |
| Repertoire | Komponisten mit Zeitspanne | Farbige Balken |
| Dokumente | Anzahl pro Jahr | Balkendiagramm |

### Interaktionen

- **Zoom:** Mausrad, Buttons (+/−/Reset)
- **Navigator:** Brush zur Bereichsauswahl
- **Klick (Repertoire):** Dokument-Panel mit Signatur, Titel, Typ
- **Tooltip:** Hover auf allen Elementen

---

## 2. Begegnungs-Matrix

**Konzept:** Heatmap der Beziehungsintensität – wer war wann wichtig?

### Intensitätsberechnung

```
Intensität = (Briefe × 3) + (Programme/Plakate × 2) + (Fotos × 1)
```

### Kategorien

| Kategorie | Beispiele |
|-----------|-----------|
| Dirigent | Karajan, Furtwängler, Kolessa, Hindemith |
| Regisseur | Hartmann |
| Korrepetitor | Werba, Baumgartner |
| Kollege | Ludwig, Rehfuss |

### Interaktionen

- **Hover:** Tooltip mit Intensitätserklärung
- **Klick:** Dokument-Panel mit vollständiger Archivalienliste

---

## 3. Rollen-Kosmos

**Konzept:** Radiales Force-Graph – Malaniuks künstlerisches Universum.

### Hierarchie

```
Zentrum: Ira Malaniuk
  └── Komponisten (große Knoten)
       └── Werke (kleinere Knoten)
```

### Interaktionen

- **Klick (Komponist):** Fokus-Modus, andere gedimmt
- **Klick (Werk):** Dokument-Panel mit Signaturen
- **Reset:** Klick auf Zentrum oder Hintergrund

---

## 4. Karrierefluss (Sankey)

**Konzept:** Alluvial-Diagramm – Phase → Repertoire → Aufführungsorte.

### Spalten

1. **Karrierephasen:** Anfänge, Aufstieg, Höhepunkt, Spätphase
2. **Repertoire:** Wagner, Verdi, Beethoven, Gluck/Händel, Strauss
3. **Orte:** Wien, Bayreuth, München, Salzburg, Graz

### Interaktionen

- **Hover (Flow):** Tooltip mit Dokumentanzahl
- **Klick (Flow):** Dokument-Panel mit verknüpften Archivalien
- **Klick (Knoten):** Dokument-Panel mit allen Dokumenten des Knotens

---

## Einheitliches Dokument-Panel

Alle vier Visualisierungen verwenden ein konsistentes Dokument-Panel:

- **Trigger:** Klick auf interaktives Element
- **Anzeige:** Modal-Panel mit halbtransparentem Overlay
- **Schließen:** ×-Button, Overlay-Klick, ESC-Taste
- **Inhalt:** Signatur (monospace), Titel, Typ-Badge

### Dokumentstruktur

```json
{
  "signatur": "UAKUG/NIM_119",
  "titel": "Programmheft zu einer Aufführung von...",
  "typ": "Program"
}
```

---

## Farbkodierung

### Komponisten (konsistent über alle Views)

| Komponist | Hex |
|-----------|-----|
| Wagner | #6B2C2C |
| Verdi | #2C5C3F |
| Strauss | #4A3A6B |
| Gluck/Händel | #8B7355 |
| Beethoven | #4A5A7A |

### Mobilitätsformen (Partitur)

| Form | Hex |
|------|-----|
| Erzwungen | #D32F2F |
| Geografisch | #2E7D32 |
| Lebensstil | #6A1B9A |

---

## Forschungsfragen-Abdeckung

| FF | Frage | Visualisierung |
|----|-------|----------------|
| FF1 | Netzwerke & Vernetzung | Matrix, Partitur (Netzwerk) |
| FF2 | Repertoire-Evolution | Kosmos, Sankey, Partitur (Repertoire) |
| FF3 | Wissenstransfer | Matrix (Vermittler-Kategorie) |
| FF4 | Transnationale Mobilität | Partitur (Orte, Mobilität), Sankey |

---

## Technische Implementierung

### ES6-Module (`docs/js/visualizations/`)

| Modul | Export |
|-------|--------|
| `partitur.js` | `renderPartitur(container)` |
| `matrix.js` | `renderMatrix(container)` |
| `kosmos.js` | `renderKosmos(container)` |
| `sankey.js` | `renderSankey(container)` |

### Globaler Einstiegspunkt (`viz-main.js`)

```javascript
window.M3GIM_VIZ = {
  renderPartitur, renderMatrix, renderKosmos, renderSankey
};
```

### Lokale Entwicklung

```bash
cd docs && npx vite --port 3000
```

---

*Version 3.0 – 2026-01-19*
*Konsolidiert aus VIZ-1 bis VIZ-4, aktualisiert mit Implementierungsstatus*
