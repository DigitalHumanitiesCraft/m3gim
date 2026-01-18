# M³GIM Design-System

## Design-Philosophie

**"Archival Elegance meets Modern Clarity"**

Das Design verbindet die Ästhetik historischer Archive (warme Töne, Serifen-Typografie) mit der Klarheit moderner Data-Dashboards.

## Farbpalette

### Primär: KUG Institutional

| Name | Hex | Verwendung |
|------|-----|------------|
| Primary Main | #004A8F | Aktive Elemente, Links |
| Primary Dark | #002D5C | Hover, Fokus |
| Primary Light | #6B9DD1 | Badges, Tags |
| Primary Tint | #E1ECF5 | Hintergründe |

### Neutral: Archive Palette

| Name | Hex | Verwendung |
|------|-----|------------|
| Paper | #FCFBF9 | Hintergrund |
| Cream | #F7F5F2 | Sidebar, Karten |
| Parchment | #F0EDE8 | Hover-States |
| Sand | #E8E4DC | Borders |
| Shadow | #C4BFB5 | Dividers |

### Text

| Name | Hex | Verwendung |
|------|-----|------------|
| Primary | #2C2825 | Überschriften |
| Secondary | #5C5651 | Body |
| Tertiary | #8A857E | Labels |
| Hint | #B0AAA3 | Placeholder |

### Gold Accent

| Name | Hex | Verwendung |
|------|-----|------------|
| Rich | #9A7B4F | Highlights |
| Medium | #C4A574 | Lebensphasen |
| Light | #E8DBC7 | Tints |

### Komponisten (Visualisierungen)

| Komponist | Hex |
|-----------|-----|
| Richard Wagner | #6B2C2C |
| Giuseppe Verdi | #2C5C3F |
| Richard Strauss | #4A3A6B |
| Gluck/Händel | #8B7355 |
| Ludwig van Beethoven | #4A5A7A |

### Personen-Kategorien (Matrix)

| Kategorie | Hex |
|-----------|-----|
| Dirigent | #4A6E96 |
| Regisseur | #6B4E8C |
| Vermittler | #3D7A5A |
| Kollege | #9A6B3D |
| Fokusperson | #004A8F |

### Mobilitätsformen (Partitur)

| Form | Hex |
|------|-----|
| Erzwungen | #8B3A3A |
| Geografisch | #3D7A5A |
| Bildung | #B67D3D |
| Lebensstil | #6B4E8C |
| National | #4A6E96 |

## Typografie

### Font-Stack

| Font | Verwendung | Fallback |
|------|------------|----------|
| **Inter** | UI, Labels, Navigation | system-ui, sans-serif |
| **Source Serif 4** | Titel, Beschreibungen | Georgia, serif |
| **JetBrains Mono** | Signaturen, Code | monospace |

### Hierarchie

| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 (Logo) | Inter | 1.5rem | 700 |
| H2 (Modal) | Source Serif 4 | 1.25rem | 600 |
| Body | Inter | 0.875rem | 400 |
| Label | Inter | 0.75rem | 500 |
| Signatur | JetBrains Mono | 0.875rem | 400 |

## Komponenten

### Navigation Tabs

```css
.nav-tab {
  background: transparent;
  color: var(--text-secondary);
  border-radius: 20px;
  padding: 0.5rem 1rem;
}

.nav-tab--active {
  background: var(--primary);
  color: white;
}
```

### Cards (Archiv)

- Hintergrund: Cream (#F7F5F2)
- Border: 1px solid Sand (#E8E4DC)
- Border-Radius: 8px
- Hover: translateY(-2px) + Box-Shadow

### Filter Chips

- Inaktiv: Border + transparent
- Aktiv: Primary Tint + Primary Border

### Visualization Tabs

- Horizontal, Pill-Form
- Icons + Labels
- Active: Primary Background

## Layout

### Header

- Höhe: 60px
- Position: sticky
- Inhalt: Logo | Tabs | Search

### Sidebar (Archiv)

- Breite: 280px
- Sections: Bestand, Filter
- Collapsible

### Main Grid

```css
.main {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-rows: auto 1fr;
}
```

### Analyse (Fullwidth)

- Toolbar: Horizontal, volle Breite
- Visualization: flex-grow: 1

## Icons

- **Library:** Lucide Icons
- **CDN:** unpkg.com/lucide@latest
- **Init:** `lucide.createIcons()` bei DOM-Änderungen

### Verwendete Icons

| Icon | Verwendung |
|------|------------|
| archive | Archiv-Tab |
| bar-chart-3 | Analyse-Tab |
| layers | Partitur |
| grid-3x3 | Matrix |
| sun | Kosmos |
| git-branch | Karrierefluss |
| user | Person |
| building-2 | Institution |
| map-pin | Ort |
| music | Werk |
| calendar | Ereignis |

## Responsive Breakpoints

| Name | Breite | Änderung |
|------|--------|----------|
| Desktop | ≥1200px | 3-Spalten Grid |
| Tablet | ≥768px | 2-Spalten Grid |
| Mobile | <768px | 1-Spalte, Sidebar collapsed |

## Accessibility

- Farbkontrast: WCAG AA (≥4.5:1)
- Skip-Link vorhanden
- ARIA-Labels für alle interaktiven Elemente
- Focus-Indikatoren sichtbar
- Keyboard-Navigation: Tab, Enter, Space

---

*Version 1.0 – 2026-01-18*
*Konsolidiert aus DESIGN-System.md v1.0 und color-schemes.js*
