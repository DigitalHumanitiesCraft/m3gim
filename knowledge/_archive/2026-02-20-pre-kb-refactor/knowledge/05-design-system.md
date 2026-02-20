# Design-System: Scholarly Elegance

> Drei Anforderungen: institutionelle Glaubwürdigkeit, kulturelle Resonanz, funktionale Klarheit.

---

## Farbsystem

### Primär

KUG-Blau `#004A8F` (7.2:1 Kontrast = AAA)

### Archiv-Neutrals

| Name | Hex |
|---|---|
| Paper | `#FCFBF9` |
| Cream | `#F7F5F2` |
| Parchment | `#F0EDE8` |
| Sand | `#E8E4DC` |
| Shadow | `#C4BFB5` |

### Gold-Akzente

Rich `#9A7B4F` · Medium `#C4A574` · Light `#E8DBC7`

### Text

Primary `#2C2825` · Secondary `#5C5651` · Tertiary `#8A857E`

### Funktionale Farben (E-27)

4 Kategorien statt per-Element-Farben:

| Kategorie | Farbe | Verwendung |
|---|---|---|
| KUG-Blau | `#004A8F` | Interaktion: Links, aktive Elemente, Signaturen |
| Signal-Grün | `#2E7D4F` | Verknüpfung vorhanden: VKN.-Spalte, Wikidata-Badge |
| Neutral-Grau | `--color-text-tertiary` | Abwesenheit: "o. D.", "Nicht klassifiziert", leere VKN. |
| Warmer Hintergrund | Cream/Parchment | Struktur: Header, Perioden, Hover |

### Semantische Farben

**Komponisten:** Wagner `#6B2C2C` · Verdi `#2C5C3F` · Strauss `#4A3A6B` · Gluck/Händel `#8B7355` · Beethoven `#4A5A7A`

**Personen-Kategorien:** Dirigent `#4A6E96` · Regisseur `#6B4E8C` · Vermittler `#3D7A5A` · Kollege `#9A6B3D` · Korrepetitor `#8B5E3C` · Andere `#757575`

---

## Typografie

| Verwendung | Font | Größe/Gewicht |
|---|---|---|
| UI-Text | Inter | 0.875rem / 400 |
| Titel | Source Serif 4 | 1.25rem / 600 |
| Signaturen | JetBrains Mono | — |

---

## Layout

Tab-basierte Single-Page-App:

- **Header:** KUG-Blau, Titel, 3 Nav-Links (Über, Projekt, Hilfe)
- **Tab-Bar:** Archiv · Indizes · Matrix · Kosmos
- **Archiv:** Bestand/Chronik-Toggle, Suchleiste + Typ/Personen-Filter + Sortierung, dynamischer Counter, Inline-Expansion
- **Indizes:** 4-Grid (Personen, Organisationen, Orte, Werke), Suche + Sortierung, Detailansicht in Sidebar
- **Matrix:** D3.js Heatmap + Kategorie-Filter + Drilldown-Panel
- **Kosmos:** D3.js Force-Graph + Zoom/Pan + Graduated-Circle-Legende
- **Info-Seiten:** About, Projekt (Schichten-Modell), Hilfe (FAQ)
- **Footer:** KUG Graz · GitHub · Prototyp

Spacing: 8px-Raster. Icons: Inline-SVG. Accessibility: WCAG 2.1 AA.

---

Siehe auch: [→ Visualisierungen](06-visualisierungen.md) · [→ Entscheidungen](07-entscheidungen.md)
