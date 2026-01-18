# M³GIM Design-Dokument

## Konzeptionelle Grundlage

Dieses Dokument beschreibt das UI/UX-Konzept für M³GIM als **zweigliedrige Forschungsplattform**:

1. **Archiv-Bereich:** Navigation entlang archivischer Strukturen (Tektonik, Provenienz) und objektbasierte Metadatenrecherche
2. **Analyse-Bereich:** Inhaltsbasierte Exploration, Visualisierung von Beziehungen und Netzwerken

Diese Trennung folgt einer fundamentalen Unterscheidung:
- **Archiv** = "Was haben wir? Wie ist es organisiert?" (bestandsorientiert)
- **Analyse** = "Was bedeutet es? Welche Muster gibt es?" (forschungsorientiert)

---

## Zielgruppen

| Priorität | Zielgruppe | Bedürfnisse | Primärer Bereich |
|-----------|------------|-------------|------------------|
| Primär | Projektteam (Forschende) | Effiziente Navigation, Verknüpfungen explorieren, Hypothesen prüfen | Beide |
| Sekundär | Fachcommunity (Musikwissenschaft, Opernforschung) | Recherche zu Künstlermobilität, Quellennachweis | Archiv |
| Tertiär | Interessierte Laien, Nachkommen | Zugängliche Darstellung, visuelle Einstiege | Analyse |

**Design-Implikation:** Der Archiv-Bereich dient der präzisen Quellenarbeit, der Analyse-Bereich ermöglicht explorative Einstiege und visuelle Entdeckungen. Beide Bereiche sind ohne Login nutzbar.

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

## Informationsarchitektur: Zwei Bereiche

### Bereichs-Navigation (globale Ebene)

```
┌─────────────────────────────────────────────────────────────────┐
│  M³GIM                                                          │
│                                                                 │
│  ┌─────────────────────┐     ┌─────────────────────┐           │
│  │      📁 ARCHIV      │     │     📊 ANALYSE      │           │
│  │                     │     │                     │           │
│  │  Tektonik           │     │  Netzwerke          │           │
│  │  Provenienz         │     │  Timeline           │           │
│  │  Objektsuche        │     │  Karten             │           │
│  └─────────────────────┘     └─────────────────────┘           │
│                                                                 │
│  "Wo ist was im Bestand?"    "Welche Muster zeigen sich?"      │
└─────────────────────────────────────────────────────────────────┘
```

**Design-Entscheidung:** Die zwei Bereiche sind gleichberechtigt, aber unterschiedlich in ihrer Logik. Nutzer:innen können jederzeit wechseln, wobei Kontext (z.B. ausgewählte Person) erhalten bleibt.

---

## Bereich 1: ARCHIV

### Konzept

Der Archiv-Bereich folgt archivwissenschaftlichen Prinzipien:
- **Tektonik:** Hierarchische Gliederung des Bestands (Bestandsgruppe → Systematikgruppe → Einheit)
- **Provenienz:** Entstehungskontext und Überlieferungsgeschichte
- **Pertinenz:** Objektbasierte Suche nach Metadaten

### Bestandsstruktur (aus Archivexport)

Der Nachlass gliedert sich in **4 Bestandsgruppen** mit insgesamt **436 Einheiten**:

| Bestandsgruppe | Anzahl | Signaturschema | Systematikgruppen |
|----------------|--------|----------------|-------------------|
| Hauptbestand | 182 | UAKUG/NIM_XXX | Berufliche Tätigkeit (89), Dokumente (42), Korrespondenzen (31), Sammlungen (16) |
| Fotografien | 228 | UAKUG/NIM_FS_XXX | Rollenporträts, Szenenfotos, private Aufnahmen |
| Plakate | 25 | UAKUG/NIM/PL_XX | Konzert- und Opernplakate |
| Tonträger | 1 | UAKUG/NIM_TT_XX | Videokassette |

### Archiv-Ansichten

#### 1.1 Tektonik-Ansicht (hierarchisch)

```
┌─────────────────────────────────────────────────────────────────┐
│  ARCHIV > Tektonik                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📦 UAKUG/NIM - Nachlass Ira Malaniuk (436 Einheiten)          │
│  │   1924-1998 │ 17 Archivboxen                                │
│  │                                                              │
│  ├─── 📁 Hauptbestand (182)                                    │
│  │    │                                                         │
│  │    ├─── 📂 Berufliche Tätigkeit (89)         → FF1, FF4     │
│  │    │    │   Verträge, Engagements, Tätigkeitslisten         │
│  │    │    ├── 📄 NIM_028: Gastvertrag Bayer. Staatsoper       │
│  │    │    └── ...                                              │
│  │    │                                                         │
│  │    ├─── 📂 Dokumente (42)                    → FF4          │
│  │    │    │   Identitätsdokumente, genealogische Unterlagen   │
│  │    │    └── ...                                              │
│  │    │                                                         │
│  │    ├─── 📂 Korrespondenzen (31)              → FF3          │
│  │    │    │   Briefe, Karten, Telegramme                      │
│  │    │    └── ...                                              │
│  │    │                                                         │
│  │    └─── 📂 Sammlungen (16)                   → FF2          │
│  │         │   Pressekritiken, Programmzettel                  │
│  │         └── ...                                              │
│  │                                                              │
│  ├─── 📁 Fotografien (228)                      → FF2          │
│  │    │   Rollenporträts, Szenenfotos, private Aufnahmen       │
│  │    └── ...                                                   │
│  │                                                              │
│  ├─── 📁 Plakate (25)                           → FF2          │
│  │    └── ...                                                   │
│  │                                                              │
│  └─── 📁 Tonträger (1)                                         │
│       └── NIM_TT_01: "100 Jahre Grazer Oper" (ORF, 1999)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Legende:** FF1-FF4 = Forschungsfragen (siehe Analyse-Bereich)

**Interaktion:**
- Klick auf Ordner: Auf-/Zuklappen der Ebene
- Klick auf Dokument: Öffnet Detailansicht (Overlay oder rechte Spalte)
- Breadcrumb zeigt aktuelle Position in Hierarchie
- Badge zeigt Relevanz für Forschungsfragen (FF1-FF4)

**Datenvoraussetzung:** Feld `systematikgruppe` im Hauptbestand bereits vorhanden (aus Archivexport). Für Fotografien, Plakate, Tonträger ergibt sich die Zuordnung aus dem Signaturpräfix

#### 1.2 Objektsuche (Katalog-Ansicht, bestehendes MVP)

```
┌─────────────────────────────────────────────────────────────────┐
│  ARCHIV > Objektsuche                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔍 Suche in 436 Archiveinheiten...                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Filter: [Dokumenttyp ▼] [Zeitraum ▼] [Zugänglichkeit ▼]       │
│                                                                 │
│  Aktive Filter: [Korrespondenz ×] [1950-1960 ×]                │
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │ UAKUG/NIM_001      │  │ UAKUG/NIM_002      │                │
│  │ Korrespondenz      │  │ Vertrag            │                │
│  │ 1958-04-18    ●    │  │ 1960          ●    │                │
│  │ Brief an...        │  │ Engagement...      │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                 │
│  Zeige 1-20 von 436                          [← 1 2 3 ... →]   │
└─────────────────────────────────────────────────────────────────┘
```

**Erweiterungen gegenüber MVP:**
- Aggregationsfunktionen: "Gruppiere nach Jahr / Dokumenttyp / Person"
- Bulk-Aktionen: "Alle 23 Ergebnisse exportieren (CSV/JSON)"
- Speicherbare Suchen (optional, ohne Login via URL-Parameter)

#### 1.3 Detailansicht (Einzelobjekt)

Die bestehende Detailansicht wird um **Kontext-Informationen** erweitert:

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Zurück │ Tektonik: NIM > Verträge > NIM_028                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  UAKUG/NIM_028                                      ● offen     │
│  ════════════════════════════════════════════════════          │
│                                                                 │
│  Gastvertrag Bayerische Staatsoper München                     │
│                                                                 │
│  ┌─────────────┬───────────────────────────────────────────┐   │
│  │ Datum       │ 18. April 1958                            │   │
│  │ Dokumenttyp │ Vertrag                                   │   │
│  │ Umfang      │ 2 Blatt                                   │   │
│  │ Sprache     │ Deutsch                                   │   │
│  │ Scan        │ ✓ Digitalisat vorhanden                   │   │
│  └─────────────┴───────────────────────────────────────────┘   │
│                                                                 │
│  VERKNÜPFUNGEN                                                  │
│  ─────────────                                                  │
│  👤 Ira Malaniuk (Vertragspartnerin) → [Zur Person]            │
│  🏛️ Bayerische Staatsoper (Vertragspartner) → [Zur Institution]│
│  📍 München (Vertragsort) → [Zum Ort]                          │
│                                                                 │
│  KONTEXT IM BESTAND                                             │
│  ─────────────────                                              │
│  ← NIM_027: Vertrag Wiener Staatsoper (1957)                   │
│  → NIM_029: Korrespondenz Agentur (1958)                       │
│                                                                 │
│  IM ANALYSE-BEREICH ZEIGEN                                      │
│  [→ Auf Timeline zeigen] [→ Im Netzwerk zeigen]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Bereich 2: ANALYSE

### Konzept

Der Analyse-Bereich unterstützt die **vier Forschungsfragen** des Projekts durch visuelle Exploration:

| FF | Forschungsfrage | Visualisierung | Primäre Quellentypen |
|----|-----------------|----------------|----------------------|
| **FF1** | Wie prägten Sänger\*innen die Grazer Kultur? Welche Rolle spielte Mobilität für Professionalisierung und Vernetzung? | **Netzwerk** | Verträge, Korrespondenz, Tätigkeitslisten |
| **FF2** | Welche narrativen und ästhetischen Strukturen wurden durch Migration beeinflusst? | **Timeline** | Pressekritiken, Programmzettel, Fotografien |
| **FF3** | Wie wurde Musiktheaterwissen durch Mobilität transferiert und adaptiert? | **Netzwerk** | Korrespondenz, autobiografische Texte |
| **FF4** | Welche Mobilitätsformen lassen sich bei Malaniuk identifizieren? | **Karte** | Identitätsdokumente, genealogische Unterlagen |

### Mobilitätsformen als Analysekategorie

Das Projekt identifiziert fünf Mobilitätsformen bei Ira Malaniuk, die in der Karten-Visualisierung unterschieden werden können:

| Mobilitätsform | Beschreibung | Beispiel | Farb-Encoding |
|----------------|--------------|----------|---------------|
| **Nationale** | Wechsel der Staatsangehörigkeit | Heirat → österreichische Staatsbürgerschaft | 🔵 Blau |
| **Geografische** | "Das Hin und Her zwischen Orten" | Gastspiele Wien, München, Bayreuth | 🟢 Grün |
| **Erzwungene** | Flucht und Vertreibung | 1944: Flucht aus der Ukraine | 🔴 Rot |
| **Bildungs-** | Ortswechsel für Ausbildung | Studium in Lemberg, Wien | 🟡 Gelb |
| **Lebensstil-** | Übersiedlung aus persönlichen Gründen | Zürich (wegen Ehemann) | 🟣 Violett |

### Analyse-Ansichten

#### 2.1 Personen-Netzwerk (→ FF1, FF3)

```
┌─────────────────────────────────────────────────────────────────┐
│  ANALYSE > Netzwerk                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filter: [Alle Personen ▼] [Zeitraum: 1945-1969 ▼]             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │              ○ Karajan                                  │   │
│  │             /                                           │   │
│  │        ○ Böhm ─── ● IRA MALANIUK ─── ○ Werba           │   │
│  │             \         │         \                       │   │
│  │              ○ Klemperer    ○ Ludwig   ○ Berry         │   │
│  │                       │                                 │   │
│  │                  ○ Jurinac                              │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Legende: ● Fokusperson │ ○ Verbundene Person                  │
│  Liniendicke = Anzahl gemeinsamer Dokumente                    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Ausgewählt: Erik Werba                                        │
│  12 gemeinsame Dokumente mit Ira Malaniuk                      │
│  Rollen: Korrespondenzpartner, Künstlerischer Partner          │
│  [→ Dokumente anzeigen] [→ Im Archiv öffnen]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Interaktion:**
- Hover über Knoten: Zeigt Kurzinfo
- Klick auf Knoten: Selektiert Person, zeigt Details unten
- Klick auf Kante: Zeigt Liste der verbindenden Dokumente
- Doppelklick: Zentriert Netzwerk auf diese Person

**Visualisierungs-Entscheidungen:**
- Force-directed Layout (D3.js) oder hierarchisch?
- Wie filtern wir sinnvoll bei 50+ Personen? → Mindestanzahl Verbindungen, Zeitraum

#### 2.2 Timeline (→ FF2)

```
┌─────────────────────────────────────────────────────────────────┐
│  ANALYSE > Timeline                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filter: [Alle Dokumenttypen ▼] [Person: Ira Malaniuk ▼]       │
│                                                                 │
│  1924    1930    1940    1950    1960    1970    1980    1998  │
│  │───────│───────│───────│───────│───────│───────│───────│     │
│                                                                 │
│  Lebensphasen:                                                  │
│  ──────────────────────────────────────────────────────────     │
│  │ Kindheit    │ Ausbildung │ Karriere            │ Ruhe │     │
│                                                                 │
│  Dokumente:                                                     │
│  ──────────────────────────────────────────────────────────     │
│           ▲         ▲▲▲  ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲     ▲▲   ▲          │
│           │         │││  ││││││││││││││││     ││   │          │
│           │         │││  └── Dichte: 1950-1965 ──┘  │          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Ausgewählt: 1958 (15 Dokumente)                               │
│  [Verträge: 5] [Korrespondenz: 8] [Fotos: 2]                   │
│  [→ Alle anzeigen]                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Interaktion:**
- Zoom: Mausrad oder Pinch → Verdichtet/Erweitert Zeitachse
- Brush: Bereich auswählen → Filtert auf Zeitspanne
- Klick auf Markierung: Zeigt Dokument(e) dieses Datums

#### 2.3 Karte (→ FF4: Mobilitätsformen)

```
┌─────────────────────────────────────────────────────────────────┐
│  ANALYSE > Karte                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filter: [Zeitraum: 1945-1969 ▼] [Mobilitätsform: Alle ▼]      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │     🔴 Lemberg (1919-1944)                              │   │
│  │        ↓ Erzwungene Mobilität (Flucht)                  │   │
│  │                                                         │   │
│  │     🟡 Wien (1944-1945) ← Ausbildung                    │   │
│  │        ↓                                                │   │
│  │     🟢 Graz (1945-1947) ← Erstes Festengagement         │   │
│  │        ↓                                                │   │
│  │     🟢 München ←→ Wien ←→ Bayreuth (1947-1970)         │   │
│  │        │  Geografische Mobilität (Gastspiele)          │   │
│  │        ↓                                                │   │
│  │     🟣 Zürich (1970+) ← Lebensstil-Migration           │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Legende:                                                       │
│  🔴 Erzwungen  🟢 Geografisch  🟡 Bildung  🟣 Lebensstil       │
│  Kreisgröße = Anzahl Dokumente │ Linien = Bewegungsrichtung    │
│                                                                 │
│  Ausgewählt: Graz (1945-1947)                                  │
│  Mobilitätsform: Geografisch (Festengagement)                  │
│  Institutionen: Grazer Oper                                    │
│  Dokumente: 23 │ [→ Im Archiv anzeigen]                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Visualisierungs-Entscheidungen:**
- Farb-Encoding nach Mobilitätsform (siehe Tabelle oben)
- Animierte Linien zeigen Bewegungsrichtung über Zeit
- Zeitleiste unten erlaubt Filterung nach Lebensphase

**Voraussetzung:** Ortsindex mit Koordinaten (Wikidata-Abfrage), Mobilitätsform als Attribut bei Orts-Verknüpfungen

---

## Verbindung der Bereiche

### Kontextübergabe zwischen Bereichen

| Von | Nach | Beispiel |
|-----|------|----------|
| Archiv → Analyse | Objekt auf Timeline zeigen | Detailansicht → "Auf Timeline zeigen" |
| Archiv → Analyse | Person im Netzwerk zeigen | Verknüpfung → "Im Netzwerk zeigen" |
| Analyse → Archiv | Dokumente zu Auswahl | Netzwerk-Kante → "Dokumente anzeigen" |
| Analyse → Archiv | Ort im Katalog filtern | Karte → "Dokumente aus München" |

### URL-Struktur (Deep-Linking)

```
/archiv/tektonik                    → Tektonik-Ansicht
/archiv/suche?typ=vertrag&jahr=1958 → Gefilterte Suche
/archiv/objekt/NIM_028              → Detailansicht

/analyse/netzwerk?person=Q94208     → Netzwerk mit Fokus Malaniuk
/analyse/timeline?von=1950&bis=1960 → Timeline gefiltert
/analyse/karte?ort=Q1726            → Karte mit Fokus München
```

---

## Offene Fragen (zur Diskussion)

*Dokumentiert in [DESIGN-Entscheidungen.md](DESIGN-Entscheidungen.md) mit Position/Gegenposition/Synthese.*

### Archivfachliche Perspektive

1. ~~**Tektonik-Tiefe:**~~ ✓ Dreistufig: Bestandsgruppe → Systematikgruppe → Einheit
2. ~~**Provenienz-Darstellung:**~~ ✓ Minimaler Block in Detailansicht (Phase 2)
3. ~~**Verknüpfungstypen:**~~ ✓ Gruppierung + Icons (👤/🏛️/📍/🎭/📅) + aria-label

### Visualisierungsperspektive

4. ~~**Netzwerk-Skalierung:**~~ ✓ Schwellenwert-Filter (Default: 3+ Verbindungen)
5. ~~**Timeline-Granularität:**~~ ✓ Fixe Jahres-Ansicht + Drill-Down Modal
6. ~~**Karten-Basemap:**~~ ✓ Leaflet + CartoDB Positron (modern, neutral)
7. ~~**Mobilitätsform-Encoding:**~~ ✓ Farbe primär + Linienart sekundär + Tooltip

### Forschungsperspektive

8. ~~**Analysefragen:**~~ ✓ FF1-FF4 aus Project Overview
9. ~~**Export:**~~ ✓ Priorität: CSV → JSON-LD (vorhanden) → GEXF (Phase 4)
10. ~~**Mobilitätsform-Erfassung:**~~ ✓ Präfix `[mobilität:]` in Anmerkungsfeld (Datenmodell v2.2)

### Technische Perspektive

11. ~~**Offline-Fähigkeit:**~~ ✓ Beibehalten, kein Handlungsbedarf bei 436 Records
12. ~~**Performance:**~~ ✓ Erst bei Bedarf optimieren (Pagination bereits vorhanden)
13. ~~**Bibliotheken:**~~ ✓ D3.js (Netzwerk) + Observable Plot (Timeline) + Leaflet (Karte)

---

## Funktionen & Prioritäten (aktualisiert)

### Phase 1: MVP (abgeschlossen ✓)

| Funktion | Status |
|----------|--------|
| Datenliste mit allen 436 Records | ✓ Fertig |
| Suche (Volltextsuche über Titel, Beschreibung, Signatur) | ✓ Fertig |
| Filter: Dokumenttyp, Sammlung, Zugänglichkeit | ✓ Fertig |
| Detailansicht pro Record | ✓ Fertig |
| JSON-LD Download | ✓ Fertig |

### Phase 2: Archiv-Erweiterung

| Funktion | Priorität | Abhängigkeit |
|----------|-----------|--------------|
| Tektonik-Ansicht (Baumstruktur) | Hoch | Datenfeld für Serie/Gruppe |
| Kontext-Navigation (vorheriges/nächstes Objekt) | Mittel | Sortierung nach Signatur |
| Verknüpfungen als klickbare Links | Mittel | Verknüpfungstabelle befüllt |
| Aggregation ("Gruppiere nach...") | Mittel | - |
| CSV-Export für Filterresultate | Niedrig | - |

### Phase 3: Analyse-Bereich

| Funktion | Priorität | Voraussetzung |
|----------|-----------|---------------|
| Timeline-Visualisierung | Hoch | 315 Records mit Datum |
| Personen-Netzwerk | Hoch | Verknüpfungen mit Personenindex |
| Karte (Aufführungsorte) | Mittel | Ortsindex mit Koordinaten |
| Bereichs-Übergänge (Kontext erhalten) | Mittel | Phase 2 abgeschlossen |

### Phase 4: Vertiefung

| Funktion | Priorität | Voraussetzung |
|----------|-----------|---------------|
| IIIF-Viewer für Digitalisate | Niedrig | Bildrechte geklärt |
| Erweiterte Netzwerk-Analyse (Clustering) | Niedrig | Phase 3 evaluiert |
| Export für Gephi/Palladio | Niedrig | Forschungsbedarf bestätigt |

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

### Kurzfristig (Phase 2: Archiv-Erweiterung)

1. **Tektonik-Ansicht implementieren:**
   - Datenquelle: `systematikgruppe` aus Archivexport nutzen
   - Hierarchie: Bestandsgruppe → Systematikgruppe → Einheit
   - FF-Badges an Systematikgruppen anzeigen
2. **Detailansicht erweitern:**
   - Kontext-Navigation (vorheriges/nächstes Objekt nach Signatur)
   - Breadcrumb zur Tektonik-Position
3. **Verknüpfungen aktivieren:**
   - Klickbare Links zu Personenindex (mit Wikidata-ID)
   - Icons für Verknüpfungstypen (👤/🏛️/📍/🎭/📅)

### Mittelfristig (Phase 3: Analyse-Bereich)

4. **Timeline (FF2):**
   - D3.js oder Observable Plot evaluieren
   - Lebensphasen als Kontext-Layer
5. **Netzwerk (FF1, FF3):**
   - Force-directed Graph mit D3.js
   - Filter: Mindestanzahl Verbindungen, Zeitraum
6. **Karte (FF4):**
   - Leaflet mit Ortsindex-Koordinaten
   - Farb-Encoding für Mobilitätsformen
   - Neues Datenfeld: `mobilitaetsform` bei Orts-Verknüpfungen
7. **Bereichs-Navigation:**
   - Archiv ↔ Analyse Wechsel mit Kontexterhalt

### Klärungsbedarf (mit KUG-Team)

- [ ] Offizielle KUG-Farbwerte (Pantone → Hex) mit Wolfgang Madl
- [ ] Bildrechte für Fotografien (Digitalisate zeigen?)
- [x] ~~Forschungsfragen priorisieren~~ → FF1-FF4 definiert
- [x] ~~Tektonik-Struktur~~ → Systematikgruppen aus Archivexport
- [ ] Mobilitätsform-Erfassung: Wie wird das Feld im Erfassungsworkflow befüllt?

---

## Referenzen

### Standards & Ontologien
- RiC-O Ontology: https://www.ica.org/standards/RiC/ontology
- ISAD(G): https://www.ica.org/en/isadg-general-international-standard-archival-description-second-edition

### Archiv-UX Best Practices
- Access to Memory (AtoM): https://www.accesstomemory.org
- ArchivesSpace: https://archivesspace.org
- Europeana Collections: https://www.europeana.eu

### Visualisierungsbibliotheken
- D3.js: https://d3js.org
- Observable Plot: https://observablehq.com/plot
- Leaflet: https://leafletjs.com
- Gephi (Referenz für Netzwerkexport): https://gephi.org

### Institutionell
- KUG Logo: https://www.kug.ac.at/presse/logo
