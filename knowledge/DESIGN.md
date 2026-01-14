# M³GIM Design-Dokument

## Zielgruppen

| Priorität | Zielgruppe | Bedürfnisse |
|-----------|------------|-------------|
| Primär | Projektteam (Pollin, Strohmann) | Effiziente Navigation, schnelles Auffinden, Verknüpfungen explorieren |
| Sekundär | Fachcommunity (Musikwissenschaft, Opernforschung, Migrationsgeschichte) | Recherche zu Künstlermobilität im 20. Jh. |
| Tertiär | Interessierte Laien, Nachkommen | Zugängliche Darstellung ohne Fachkenntnis |

**Design-Implikation:** Funktional für Forschende, zugänglich für Externe. Kein Login für Grundfunktionen.

---

## Farbschema

Basierend auf KUG Corporate Design (geschätzte Werte, offizielle Abstimmung mit Wolfgang Madl empfohlen).

### Primärpalette

| Farbe | Hex | RGB | Verwendung |
|-------|-----|-----|------------|
| KUG Blau | `#004A8F` | 0, 74, 143 | Primärakzent, Links, Buttons, aktive Elemente |
| KUG Blau Light | `#E8F0F8` | 232, 240, 248 | Hintergründe, Hover-States |
| KUG Grau | `#6B6B6B` | 107, 107, 107 | Sekundärtext, Icons, Rahmen |
| Grau Light | `#F5F5F5` | 245, 245, 245 | Seitenhintergrund, Karten |
| Weiß | `#FFFFFF` | 255, 255, 255 | Inhaltsflächen |
| Schwarz | `#1A1A1A` | 26, 26, 26 | Fließtext (nicht reines Schwarz) |

### Semantische Farben

| Farbe | Hex | Verwendung |
|-------|-----|------------|
| Erfolg | `#2E7D32` | Validierungsstatus, verfügbare Scans |
| Warnung | `#ED6C02` | Eingeschränkte Zugänglichkeit |
| Fehler | `#D32F2F` | Gesperrte Dokumente |
| Info | `#0288D1` | Hinweise, Tooltips |

### CSS Custom Properties

```css
:root {
  /* KUG Palette */
  --color-primary: #004A8F;
  --color-primary-light: #E8F0F8;
  --color-gray: #6B6B6B;
  --color-gray-light: #F5F5F5;
  --color-white: #FFFFFF;
  --color-text: #1A1A1A;

  /* Semantisch */
  --color-success: #2E7D32;
  --color-warning: #ED6C02;
  --color-error: #D32F2F;
  --color-info: #0288D1;

  /* Abstände */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Radien */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

---

## Typografie

Serifenlose Systemschriften (performant, keine externen Abhängigkeiten).

```css
:root {
  --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace;

  --font-size-xs: 0.75rem;   /* 12px - Labels, Badges */
  --font-size-sm: 0.875rem;  /* 14px - Sekundärtext */
  --font-size-base: 1rem;    /* 16px - Fließtext */
  --font-size-lg: 1.125rem;  /* 18px - Lead-Text */
  --font-size-xl: 1.5rem;    /* 24px - H3 */
  --font-size-2xl: 2rem;     /* 32px - H2 */
  --font-size-3xl: 2.5rem;   /* 40px - H1 */
}
```

---

## Funktionen & Prioritäten

### Phase 1: MVP (aktueller Sprint)

| Funktion | Priorität | Status |
|----------|-----------|--------|
| Datenliste mit allen 436 Records | Hoch | Offen |
| Suche (Volltextsuche über Titel) | Hoch | Offen |
| Filter: Dokumenttyp | Hoch | Offen |
| Filter: Zeitraum (Jahr) | Hoch | Offen |
| Detailansicht pro Record | Hoch | Offen |
| JSON-LD Download | Mittel | Vorhanden |

### Phase 2: Vertiefung

| Funktion | Priorität | Abhängigkeit |
|----------|-----------|--------------|
| Filter: Zugänglichkeit, Fototyp | Mittel | Phase 1 |
| Verknüpfungen als klickbare Links | Mittel | Verknüpfungstabelle befüllt |
| Timeline-Visualisierung | Mittel | 315 Records mit Datum |
| CSV-Export für Filterresultate | Niedrig | Phase 1 |

### Phase 3: Visualisierungen

| Funktion | Priorität | Voraussetzung |
|----------|-----------|---------------|
| Karte (Aufführungsorte, Wohnorte) | Mittel | Ortsindex mit Koordinaten |
| Netzwerk (Personen-Dokumente) | Niedrig | Verknüpfungen vollständig |
| IIIF-Viewer für Digitalisate | Niedrig | Bildrechte geklärt |

---

## Seitenstruktur

### Startseite / Katalog

```
┌─────────────────────────────────────────────────────────────┐
│  M³GIM - Digitales Archiv Ira Malaniuk            [KUG Logo]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔍 Suche in 436 Archiveinheiten...                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Filter:  [Dokumenttyp ▼]  [Zeitraum ▼]  [Nur Fotos ☐]    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ UAKUG/NIM_001        │  │ UAKUG/NIM_002        │        │
│  │ Korrespondenz        │  │ Vertrag              │        │
│  │ 1958-04-18           │  │ 1960                 │        │
│  │ Brief an...          │  │ Engagement Wien...   │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ UAKUG/NIM_FS_001     │  │ ...                  │        │
│  │ 📷 Fotografie        │  │                      │        │
│  │ 1949-01-22           │  │                      │        │
│  │ "Macbeth" Zürich     │  │                      │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│  Zeige 1-20 von 436                        [← 1 2 3 ... →] │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Universität für Musik und darstellende Kunst Graz         │
│  Universitätsarchiv | Gefördert von Mariann Steegmann Found.│
│  Daten: CC BY 4.0 | JSON-LD Download                       │
└─────────────────────────────────────────────────────────────┘
```

### Detailansicht

```
┌─────────────────────────────────────────────────────────────┐
│  ← Zurück zur Übersicht                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  UAKUG/NIM_FS_001                                          │
│  ══════════════════════════════════════════════════════    │
│                                                             │
│  📷 Fotografie                            ● offen          │
│                                                             │
│  Titel                                                      │
│  "Macbeth" an der Züricher Oper                            │
│                                                             │
│  Datum           22. Januar 1949                           │
│  Beschreibung    Lady Macbeth in der Wahnsinnsszene        │
│  Fotograf        Lerda                                      │
│  Format          10 x 14 cm                                 │
│  Fototyp         Schwarz-Weiß                              │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│  Verknüpfungen                                              │
│                                                             │
│  Person          Ira Malaniuk (abgebildet)                 │
│  Werk            Macbeth (Verdi)                           │
│  Ort             Zürich, Opernhaus                         │
│  Ereignis        Premiere, 22.01.1949                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  JSON-LD für diesen Record ↓                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Komponenten

### Record-Karte

```
┌────────────────────────────────────┐
│ UAKUG/NIM_001              ● offen │  ← Signatur + Status-Badge
├────────────────────────────────────┤
│ Korrespondenz                      │  ← Dokumenttyp (Badge)
│ 1958-04-18                         │  ← Datum
├────────────────────────────────────┤
│ Brief von Erik Werba an            │  ← Titel (max 2 Zeilen)
│ Ira Malaniuk betreffend...         │
└────────────────────────────────────┘
```

### Filter-Chips

```
Aktive Filter: [Korrespondenz ×] [1950-1960 ×]  [Alle Filter löschen]
```

### Status-Badges

| Status | Farbe | Icon |
|--------|-------|------|
| offen | Grün (#2E7D32) | ● |
| eingeschränkt | Orange (#ED6C02) | ◐ |
| gesperrt | Rot (#D32F2F) | ○ |

### Dokumenttyp-Badges

| Typ | Hintergrund |
|-----|-------------|
| Korrespondenz | KUG Blau Light |
| Vertrag | Grau Light |
| Programm | Grau Light |
| Fotografie | KUG Blau Light + 📷 Icon |
| Plakat | Grau Light |
| ... | ... |

---

## Responsive Breakpoints

```css
/* Mobile First */
--breakpoint-sm: 640px;   /* Große Phones */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Große Monitore */
```

| Breakpoint | Karten pro Zeile | Sidebar |
|------------|------------------|---------|
| < 640px | 1 | Hidden |
| 640-1024px | 2 | Collapsed |
| > 1024px | 3-4 | Visible |

---

## Institutionelle Anforderungen

### Footer-Elemente (Pflicht)

1. **KUG-Logo** mit Link zu kug.ac.at
2. **Archivverweis:** "Universitätsarchiv der Kunstuniversität Graz (UAKUG)"
3. **Förderer:** "Gefördert von der Mariann Steegmann Foundation"
4. **Lizenz:** "Metadaten: CC BY 4.0"
5. **Kontakt:** Link zu Projektverantwortlichen

### Zu klären mit Wolfgang Madl

- [ ] Offizielle KUG-Farbwerte (Pantone → Hex)
- [ ] Genehmigung zur Logo-Nutzung
- [ ] Bildrechte für Fotografien (Digitalisate zeigen?)
- [ ] Zitierempfehlung für den Bestand

---

## Nächste Schritte

1. **MVP implementieren:** Liste + Suche + Filter + Detail
2. **Farbschema testen:** Gegen KUG-Website abgleichen
3. **Abstimmung:** Wolfgang Madl zu Corporate Design befragen
4. **Feedback:** Nicole Strohmann zu Funktionspriorisierung

---

## Referenzen

- KUG Logo: https://www.kug.ac.at/presse/logo
- RiC-O Ontology: https://www.ica.org/standards/RiC/ontology
- Archiv-UX Best Practices: Access to Memory (AtoM), ArchivesSpace
