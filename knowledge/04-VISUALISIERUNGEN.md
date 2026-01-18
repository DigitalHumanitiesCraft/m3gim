# M³GIM Visualisierungen – Übersicht

## Überblick

| Visualisierung | Forschungsfragen | Kernfrage | Dokumentation |
|----------------|------------------|-----------|---------------|
| **Mobilitäts-Partitur** | FF1, FF2, FF3, FF4 | Was passierte wann gleichzeitig? | [VIZ-1-Partitur.md](VIZ-1-Partitur.md) |
| **Begegnungs-Matrix** | FF1, FF3 | Wer war wann wichtig? | [VIZ-2-Matrix.md](VIZ-2-Matrix.md) |
| **Rollen-Kosmos** | FF2 | Was war das Repertoire? | [VIZ-3-Kosmos.md](VIZ-3-Kosmos.md) |
| **Karrierefluss** | FF2, FF4 | Was hängt zusammen? | [VIZ-4-Karrierefluss.md](VIZ-4-Karrierefluss.md) |

## Datenfluss

```
Google Sheets → JSON-LD (RiC-O) → Views
                     │
                     ├── Partitur: Zeitachse mit 6 Spuren
                     ├── Matrix: Personen × Zeiträume Heatmap
                     ├── Kosmos: Radiales Force-Graph
                     └── Karrierefluss: Sankey-Diagramm
```

## Zielerreichung pro Forschungsfrage

| FF | Visualisierung | Erreichung | Begründung |
|----|----------------|------------|------------|
| **FF1** | Matrix | 75% | Netzwerke erkennbar, Zeitfilter fehlt |
| **FF2** | Kosmos + Partitur | 90% | Repertoire sehr gut visualisiert |
| **FF3** | Matrix | 65% | Vermittler erkennbar, Transfer-Inhalte nicht |
| **FF4** | Partitur | 85% | Mobilitätsformen klar, Karte fehlt |

## Gemeinsame Elemente

### Document Panel

Alle Visualisierungen führen zum Document Panel:
1. **Klick auf Element** → Panel öffnet rechts
2. **Inhalt:** Liste der verknüpften Archivalien
3. **Klick auf Dokument** → Modal mit Details
4. **Schließen:** Klick außerhalb oder X-Button

### Farbkodierung

Konsistente Farben über alle Visualisierungen:

| Komponist | Hex | Verwendung |
|-----------|-----|------------|
| Wagner | #8B0000 | Partitur, Kosmos, Karrierefluss |
| Verdi | #006400 | Partitur, Kosmos, Karrierefluss |
| Strauss | #4B0082 | Partitur, Kosmos, Karrierefluss |
| Gluck/Händel | #B8860B | Partitur, Kosmos, Karrierefluss |

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

*Version 2.0 – 2026-01-18*
*Übersichtsdokument mit Links zu detaillierten VIZ-Spezifikationen*
