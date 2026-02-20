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

### Semantische Farben

**Komponisten:** Wagner `#6B2C2C` · Verdi `#2C5C3F` · Strauss `#4A3A6B` · Gluck/Händel `#8B7355` · Beethoven `#4A5A7A`

**Mobilität:** Erzwungen `#8B3A3A` · Geografisch `#3D7A5A` · Bildung `#B67D3D` · Lebensstil `#6B4E8C` · National `#4A6E96`

**Personen-Kategorien:** Dirigent `#4A6E96` · Regisseur `#6B4E8C` · Vermittler `#3D7A5A` · Kollege `#9A6B3D`

---

## Typografie

| Verwendung | Font | Größe/Gewicht |
|---|---|---|
| UI-Text | Inter | 0.875rem / 400 |
| Titel | Source Serif 4 | 1.25rem / 600 |
| Signaturen | JetBrains Mono | — |

---

## Layout

Tab-basierte Single-Page-App mit 4 Tabs:

- **Header:** KUG-Blau, Statistik-Chips (Objekte, Konvolute, Zeitraum, Personen)
- **Tab-Bar:** Archiv · Indizes · Matrix · Kosmos
- **Archiv:** Bestand/Chronik-Toggle, Suchleiste + Typfilter + Sortierung, Inline-Expansion (kein Modal/Sidebar)
- **Indizes:** 4-Grid (Personen, Organisationen, Orte, Werke), Suche + Kategorie-Filter, Detailansicht in Sidebar
- **Matrix/Kosmos:** D3.js-Visualisierungen mit Slide-in Detail-Panel (420px)
- **Footer:** KUG Graz · GitHub · Prototyp

Spacing: 8px-Raster. Icons: Lucide (CDN). Accessibility: WCAG 2.1 AA.

---

Siehe auch: [→ Visualisierungen](06-visualisierungen.md) · [→ Entscheidungen](07-entscheidungen.md)
