# M³GIM Design System

*Visuelles Identitätssystem für das digitale Archiv Ira Malaniuk*

---

## Design-Philosophie

### Leitprinzipien

Das Design des M³GIM-Archivs muss drei scheinbar widersprüchliche Anforderungen vereinen:

1. **Institutionelle Seriosität** – Als universitäres Archivprojekt der KUG muss das Interface Vertrauen und wissenschaftliche Glaubwürdigkeit ausstrahlen.

2. **Kulturelle Resonanz** – Das Thema ist eine bedeutende Opernsängerin des 20. Jahrhunderts. Das Design sollte die ästhetische Welt der klassischen Musik subtil evozieren, ohne kitschig zu werden.

3. **Funktionale Klarheit** – Forschende müssen effizient durch 436 Archiveinheiten navigieren können. Form folgt Funktion.

### Designhaltung: "Scholarly Elegance"

Wir orientieren uns an der visuellen Sprache von:
- **Hochwertigen Musikarchiven** (Wienbibliothek Digital, Bayerische Staatsbibliothek)
- **Kulturinstitutionen** (Salzburger Festspiele, Wiener Staatsoper – deren digitale Präsenzen)
- **Akademischen Digital-Humanities-Projekten** (Europeana, EHRI)

**Nicht** an:
- Generischen Bootstrap-Interfaces
- Start-up-ästhetik mit knalligen Farben
- Überladenen Dashboard-Designs

---

## Farbsystem

### Primärpalette: KUG-Institutionell

Die Kunstuniversität Graz verwendet ein tiefes Blau als Leitfarbe. Wir erweitern dies zu einer vollständigen Palette:

```
┌─────────────────────────────────────────────────────────────┐
│  PRIMÄR                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ████████  KUG-Blau (Primary)     #004A8F                  │
│  ████████  KUG-Blau Dunkel        #003366                  │
│  ████████  KUG-Blau Hell          #1565C0                  │
│  ░░░░░░░░  KUG-Blau Tint          #E3EDF7                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Sekundärpalette: Archiv-Neutral

Für Hintergründe, Karten und neutrale Elemente:

```
┌─────────────────────────────────────────────────────────────┐
│  NEUTRAL                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ████████  Papier-Weiß            #FAFAFA                  │
│  ████████  Archiv-Creme           #F5F3EF                  │
│  ████████  Pergament              #EDE8E0                  │
│  ████████  Schatten               #D4CFC5                  │
│                                                             │
│  ████████  Text-Primär            #1A1A1A                  │
│  ████████  Text-Sekundär          #4A4A4A                  │
│  ████████  Text-Tertiär           #757575                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Akzentpalette: Mobilitätsformen (FF4)

Für die Visualisierung der fünf Mobilitätsformen – bewusst gedämpft, nicht grell:

```
┌─────────────────────────────────────────────────────────────┐
│  AKZENTE (Mobilitätsformen)                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ████████  Erzwungen (Flucht)     #B71C1C  Bordeaux-Rot    │
│  ████████  Geografisch            #2E7D32  Waldgrün        │
│  ████████  Bildung                #E65100  Terrakotta      │
│  ████████  Lebensstil             #6A1B9A  Aubergine       │
│  ████████  National               #1565C0  Kobaltblau      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Semantische Farben

```
┌─────────────────────────────────────────────────────────────┐
│  STATUS                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ████████  Erfolg / Offen         #2E7D32                  │
│  ████████  Warnung / Eingeschr.   #E65100                  │
│  ████████  Fehler / Gesperrt      #B71C1C                  │
│  ████████  Info                   #1565C0                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Typografie

### Schriftfamilien

**Primär: Inter** (Google Fonts)
- Moderne, gut lesbare Sans-Serif
- Exzellente Zahlen und Tabellen (tabular figures)
- Open Source, keine Lizenzkosten

**Sekundär: Source Serif 4** (Google Fonts)
- Für längere Texte in der Detailansicht (Beschreibungen, Provenienz)
- Verleiht akademische Würde
- Gute Lesbarkeit bei kleinen Größen

**Monospace: JetBrains Mono**
- Für Signaturen (UAKUG/NIM_028)
- Technische Daten, JSON-LD-Ansicht

### Typografische Skala

```
┌─────────────────────────────────────────────────────────────┐
│  HIERARCHIE                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Display       2.5rem / 40px    Inter 600    Seitentitel   │
│  H1            2rem / 32px      Inter 600    Bereichstitel │
│  H2            1.5rem / 24px    Inter 600    Sektionen     │
│  H3            1.125rem / 18px  Inter 600    Untertitel    │
│  Body          1rem / 16px      Inter 400    Fließtext     │
│  Body Serif    1rem / 16px      Source Serif Beschreibung  │
│  Small         0.875rem / 14px  Inter 400    Metadaten     │
│  Caption       0.75rem / 12px   Inter 500    Labels        │
│  Mono          0.875rem / 14px  JetBrains    Signaturen    │
│                                                             │
│  Zeilenhöhe: 1.5 (Body), 1.3 (Überschriften)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Spacing & Layout

### Spacing-Skala (8px-Basis)

```
--space-1:   0.25rem   (4px)
--space-2:   0.5rem    (8px)
--space-3:   0.75rem   (12px)
--space-4:   1rem      (16px)
--space-5:   1.5rem    (24px)
--space-6:   2rem      (32px)
--space-7:   3rem      (48px)
--space-8:   4rem      (64px)
```

### Layout-Grid

```
┌─────────────────────────────────────────────────────────────┐
│  DESKTOP (≥1200px)                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  HEADER (sticky, 64px Höhe)                          │  │
│  │  Logo │ Navigation │ Suche                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌────────────┐ ┌───────────────────────────────────────┐  │
│  │            │ │                                       │  │
│  │  SIDEBAR   │ │  CONTENT                              │  │
│  │  280px     │ │  flex: 1                              │  │
│  │  (sticky)  │ │                                       │  │
│  │            │ │                                       │  │
│  └────────────┘ └───────────────────────────────────────┘  │
│                                                             │
│  Max-Width: 1400px │ Padding: 32px │ Gap: 32px             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Komponenten

### 1. Header & Navigation

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │  M³GIM                        ┌─────────┬─────────┐    ││
│  │  Digitales Archiv             │ ARCHIV  │ ANALYSE │    ││
│  │  Ira Malaniuk                 └─────────┴─────────┘    ││
│  │                                                         ││
│  │                      ┌─────────────────────────────┐   ││
│  │                      │ 🔍 Suche im Archiv...       │   ││
│  │                      └─────────────────────────────┘   ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Hintergrund: Weiß mit 3px KUG-Blau Unterstrich            │
│  Tab-Navigation: Pill-Style, nicht Button-Style            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Spezifikation Header:**
- Höhe: 72px
- Logo: "M³GIM" in Inter 700, KUG-Blau
- Untertitel: Inter 400, Text-Sekundär
- Border-Bottom: 3px solid KUG-Blau
- Tabs: Pill-Form, 40px Höhe, 16px horizontales Padding

**Tab-Styling:**
```css
.nav-tab {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 20px;
  padding: 8px 20px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.nav-tab:hover {
  background: var(--archiv-creme);
  color: var(--kug-blau);
}

.nav-tab--active {
  background: var(--kug-blau);
  color: white;
  border-color: var(--kug-blau);
}
```

### 2. Sidebar

```
┌────────────────────────────────────────┐
│                                        │
│  BESTAND                               │  ← Section Label (Caption)
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ▼ Hauptbestand              182  │  │  ← Expandable, aktiv
│  │   ├─ Berufliche Tätigkeit    89  │  │
│  │   ├─ Dokumente               42  │  │
│  │   ├─ Korrespondenzen         31  │  │
│  │   └─ Sammlungen              16  │  │
│  │ ▶ Fotografien               228  │  │  ← Collapsed
│  │ ▶ Plakate                    25  │  │
│  │ ▶ Tonträger                   1  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ─────────────────────────────────     │  ← Subtle Divider
│                                        │
│  FILTER                                │
│                                        │
│  Dokumenttyp                           │
│  ┌──────────────────────────────────┐  │
│  │ ☑ Plakat                     25  │  │
│  │ ☑ Fotografie                228  │  │
│  │ ☑ Vertrag                    34  │  │
│  │ ...                              │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

**Spezifikation Sidebar:**
- Breite: 280px
- Background: Papier-Weiß (#FAFAFA)
- Padding: 24px
- Section Labels: Uppercase, Letter-Spacing 0.5px, Text-Tertiär
- Tree-Items: 40px Höhe, hover: Archiv-Creme Hintergrund
- Aktiver Item: KUG-Blau Hintergrund (10% Opacity), KUG-Blau Text

### 3. Archivkarten

```
┌─────────────────────────────────────────┐
│                                         │
│  UAKUG/NIM_PL_01              ● Offen   │  ← Signatur + Status
│                                         │
│  ┌─────────────────────────────────┐    │
│  │           Plakat                │    │  ← Typ-Badge
│  └─────────────────────────────────┘    │
│                                         │
│  Liederabend Ira Malaniuk              │  ← Titel (max 2 Zeilen)
│  am Flügel: Prof. Erik Werba           │
│                                         │
│  14. Dezember 1960                      │  ← Datum
│                                         │
└─────────────────────────────────────────┘
```

**Spezifikation Karte:**
- Background: Weiß
- Border: 1px solid Schatten (#D4CFC5)
- Border-Radius: 8px
- Padding: 20px
- Hover: Box-Shadow (0 4px 12px rgba(0,0,0,0.08)), translate Y -2px
- Signatur: JetBrains Mono, Small, Text-Tertiär
- Status-Badge: 6px Dot + Text (Offen=Grün, Eingeschränkt=Orange, Gesperrt=Rot)
- Typ-Badge: Pill, Archiv-Creme Background, Text-Sekundär
- Titel: H3, max 2 Zeilen mit Ellipsis
- Datum: Small, Text-Tertiär

### 4. Detailansicht (Modal)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  UAKUG / NIM / Plakate                              ✕      │
│  UAKUG/NIM_PL_01                                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Liederabend Ira Malaniuk                                  │
│  am Flügel: Prof. Erik Werba                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Datum           14. Dezember 1960                  │   │
│  │  Dokumenttyp     Plakat                             │   │
│  │  Format          B1                                 │   │
│  │  Zugänglichkeit  Offen                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PROVENIENZ                                         │   │
│  │                                                     │   │
│  │  Übernommen      2015 vom Nachlass der Künstlerin   │   │
│  │  Vorbesitz       Privatbesitz Ira Malaniuk, Zürich  │   │
│  │  Bearbeitung     Erschließung 2026 (Projekt M³GIM) │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  VERKNÜPFUNGEN                                             │
│                                                             │
│  👤 Personen                                               │
│     Ira Malaniuk (Interpretin)                             │
│     Erik Werba (Begleiter)                                 │
│                                                             │
│  🏛 Institutionen                                          │
│     Wiener Musikverein (Veranstalter)                      │
│                                                             │
│  📍 Orte                                                   │
│     Wien (Aufführungsort)                                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    [{ } JSON-LD]   [→ In Analyse öffnen]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Spezifikation Modal:**
- Max-Breite: 720px
- Background: Weiß
- Border-Radius: 12px
- Header: 72px, Sticky, Border-Bottom
- Breadcrumb: Caption, Text-Tertiär
- Signatur: Mono, H2
- Titel: Display, Source Serif 4
- Provenienz-Box: Archiv-Creme Background, 16px Padding
- Verknüpfungs-Icons: 16px, farbkodiert
- Footer: Archiv-Creme Background, 16px Padding

### 5. Visualisierungs-Bereich (Analyse)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Personennetzwerk                                          │
│  Zeigt Verbindungen basierend auf gemeinsamen Dokumenten.  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                                                     │   │
│  │                    [Visualisierung]                 │   │
│  │                                                     │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Ausgewählt: Herbert von Karajan                    │   │
│  │  12 gemeinsame Dokumente │ 1954–1967               │   │
│  │  [→ Im Archiv anzeigen]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Spezifikation Visualisierung:**
- Container: Weiß, Border-Radius 12px, min-height 500px
- Titel: H1, Text-Primär
- Beschreibung: Body, Text-Sekundär
- Auswahl-Panel: Fixed Bottom, Archiv-Creme Background
- Visualisierungs-Hintergrund: Subtiler Pergament-Ton (#F8F6F2)

---

## Iconografie

### Icon-System: Lucide Icons

Wir verwenden **Lucide** (lucide.dev) – einen Fork von Feather Icons mit erweitertem Set.

**Ausgewählte Icons:**

| Funktion | Icon | Lucide-Name |
|----------|------|-------------|
| Archiv | 📦 | `archive` |
| Analyse | 📊 | `bar-chart-3` |
| Suche | 🔍 | `search` |
| Filter | ⚙ | `sliders-horizontal` |
| Person | 👤 | `user` |
| Institution | 🏛 | `building-2` |
| Ort | 📍 | `map-pin` |
| Werk | 🎭 | `drama` / `music` |
| Ereignis | 📅 | `calendar` |
| Netzwerk | 🔗 | `git-branch` |
| Timeline | 📈 | `trending-up` |
| Karte | 🗺 | `map` |
| Dokument | 📄 | `file-text` |
| Foto | 📷 | `image` |
| Expand | ▶ | `chevron-right` |
| Collapse | ▼ | `chevron-down` |
| Schließen | ✕ | `x` |
| External | ↗ | `external-link` |

**Integration:**
```html
<!-- Via CDN (empfohlen für Prototyp) -->
<script src="https://unpkg.com/lucide@latest"></script>

<!-- Verwendung -->
<i data-lucide="archive"></i>
<script>lucide.createIcons();</script>
```

---

## Interaktionen & Animationen

### Grundprinzipien

1. **Subtil, nicht ablenkend** – Animationen unterstützen das Verständnis, stehen nicht im Vordergrund
2. **Schnell** – Max. 200ms für UI-Feedback, 300ms für Übergänge
3. **Physikalisch plausibel** – Ease-out für eingehende, ease-in für ausgehende Elemente

### Timing-Funktionen

```css
:root {
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0.0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);

  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
}
```

### Definierte Animationen

| Element | Trigger | Animation |
|---------|---------|-----------|
| Karte | Hover | translate Y -2px, shadow-lg, 200ms |
| Button | Hover | Background-Color, 100ms |
| Tab | Click | Background + Color, 150ms |
| Modal | Open | Fade-in + Scale (0.95→1), 200ms |
| Modal | Close | Fade-out, 150ms |
| Sidebar-Tree | Expand | Height + Opacity, 200ms |
| Filter-Count | Update | Fade, 100ms |

---

## Responsive Verhalten

### Breakpoints

```css
--bp-mobile: 640px;
--bp-tablet: 900px;
--bp-desktop: 1200px;
--bp-wide: 1400px;
```

### Layout-Anpassungen

| Breakpoint | Sidebar | Cards | Header |
|------------|---------|-------|--------|
| ≥1200px | 280px fixed | 3-4 Spalten | Voll |
| 900-1199px | 260px fixed | 2-3 Spalten | Voll |
| 640-899px | Collapsed (Icon-only) | 2 Spalten | Tabs → Dropdown |
| <640px | Off-canvas | 1 Spalte | Hamburger-Menü |

---

## Barrierefreiheit

### WCAG 2.1 AA Compliance

1. **Farbkontrast:** Alle Text-Hintergrund-Kombinationen mindestens 4.5:1
2. **Fokus-Indikatoren:** Sichtbarer Outline (2px KUG-Blau) bei Keyboard-Navigation
3. **ARIA-Labels:** Alle interaktiven Elemente haben beschreibende Labels
4. **Skip-Links:** "Zum Inhalt springen" für Screenreader
5. **Reduzierte Bewegung:** @media (prefers-reduced-motion: reduce)

### Farbkontrast-Prüfung

| Kombination | Kontrast | Status |
|-------------|----------|--------|
| Text-Primär auf Weiß | 16.1:1 | ✓ AAA |
| Text-Sekundär auf Weiß | 7.8:1 | ✓ AAA |
| KUG-Blau auf Weiß | 7.2:1 | ✓ AAA |
| Weiß auf KUG-Blau | 7.2:1 | ✓ AAA |
| Text-Tertiär auf Weiß | 4.6:1 | ✓ AA |

---

## Implementierungs-Reihenfolge

### Phase 2.1: Design-Grundlagen
- [ ] CSS Custom Properties (Farben, Spacing, Typography)
- [ ] Lucide Icons einbinden
- [ ] Google Fonts laden (Inter, Source Serif 4, JetBrains Mono)

### Phase 2.2: Komponenten
- [ ] Header mit neuer Tab-Navigation
- [ ] Sidebar mit Tektonik-Tree
- [ ] Karten mit neuem Styling
- [ ] Modal mit Sektionen

### Phase 2.3: Feinschliff
- [ ] Hover-States und Animationen
- [ ] Responsive Anpassungen
- [ ] Accessibility-Audit

---

## Referenz-Designs

### Inspiration (Screenshots/Links)

1. **Wienbibliothek Digital** – wienbibliothek.at/digitale-bibliothek
   - Klare Typografie, akademischer Ton, gute Filterung

2. **Deutsche Digitale Bibliothek** – deutsche-digitale-bibliothek.de
   - Exzellente Kartenansicht, subtile Farbgebung

3. **Europeana Collections** – europeana.eu
   - Vorbildliche Detailansicht mit Metadaten-Hierarchie

4. **Salzburger Festspiele Archiv** – salzburgerfestspiele.at/archiv
   - Kulturelle Eleganz, Musikbezug

5. **Grove Music Online** – oxfordmusiconline.com
   - Akademische Strenge mit guter Usability

---

*Version 1.0 – 2026-01-18*
*Erstellt als Grundlage für Phase 2 der M³GIM-Entwicklung*
