# M³GIM Visualisierungskonzept

*Innovative Ansätze jenseits von Standard-Netzwerk/Timeline/Karte*

---

## Ausgangspunkt: Was erfassen wir eigentlich?

Basierend auf dem Dreischichtenmodell:

### Schicht 1: Kernmetadaten (alle 436 Einheiten)
- Signatur, Datum, Dokumenttyp, Sprache, Umfang
- → **Zeitliche Verteilung**, **Typologische Struktur**

### Schicht 2: Kontextuelle Verknüpfungen
- **Personen** mit Rollen (verfasser, adressat, erwähnt, vertragspartner, abgebildet, interpretin)
- **Orte** mit Rollen (entstehungsort, zielort, auffuehrungsort, wohnort, vertragsort)
- **Institutionen** mit Rollen (vertragspartner, arbeitgeber, veranstalter, vermittler)
- **Ereignisse** mit Typen (rahmenveranstaltung, auftritt, probe, implizit)
- **Werke** mit Rollen (interpretin, erwähnt)

### Schicht 3: Quellentyp-spezifisch (Schlüsseldokumente)
- Verträge: Honorare, Nebenleistungen, Rundfunkrechte
- Korrespondenz: Vermittler, Repertoire-Diskussion
- Kritiken: Rezeption, Inszenierungskontexte

---

## Die vier Forschungsfragen – neu gelesen

| FF | Kern-Frage | Was die Daten zeigen können |
|----|------------|------------------------------|
| **FF1** | Mobilität → Vernetzung → Professionalisierung | Wer vermittelt? Welche Institutionen sind Knotenpunkte? Wie entwickeln sich Honorare? |
| **FF2** | Migration → Ästhetik → Operngenre-Transformation | Repertoire-Wandel über Zeit. Welche Rollen wann wo? Ukrainische Lieder als Identitätsmarker. |
| **FF3** | Wissenstransfer – flüchtig, mündlich | Wer ist "Vermittler"? Korrespondenz-Netzwerke. Proben-Kontexte. |
| **FF4** | Mobilitätsformen identifizieren | Orts-Trajektorien + Kontext (erzwungen/gewählt, temporär/permanent) |

---

## Visualisierung 1: "Biografie-Strom" (Sankey/Alluvial)

### Konzept

Zeigt Malaniuks Leben als **Fluss durch verschiedene Zustände**:
- Horizontale Achse = Zeit (1919–2009)
- Vertikale Bänder = Kategorien (Ort, Institution, Rolle/Fach)
- Bandbreite = Dokumenten-Dichte oder Intensität
- Farbe = Mobilitätsform

```
         1919    1940    1945    1950    1960    1970    2009
         │       │       │       │       │       │       │
ORTE     ████ Lemberg ████│       │       │       │       │
                    ╲     │       │       │       │       │
                     ╲────┼── Wien ───────│       │       │
                          │    ╲          │       │       │
                          │     ╲── Graz ─┤       │       │
                          │               │       │       │
                          │         ══════╪═ München ═════╪═══
                          │        ╱      │    ╲    ╱     │
                          │       ╱       ╧═════╧═ Bayreuth
                          │      ╱                        │
                          │     ╱                   Zürich ███
         │       │       │       │       │       │       │
ROLLEN   ─ Studentin ─────│       │       │       │       │
                    ╲     │       │       │       │       │
                     ╲────┼─ Ensemble ────┤       │       │
                          │               │       │       │
                          │        ═══════╪═ Gast-Star ═══╪═══
                          │               │               │
                          │               │         Ruhestand
```

### Forschungsfragen-Bezug

| FF | Was diese Visualisierung zeigt |
|----|-------------------------------|
| FF1 | Parallelität: Graz UND München UND Bayreuth gleichzeitig → "Pendel-Karriere" |
| FF2 | Rollen-Wandel: Vom Ensemble zur Gast-Star-Phase |
| FF4 | Mobilitätsformen als Farbe: Rot (Lemberg→Wien = erzwungen), Grün (Wien↔München = geografisch) |

### Datengrundlage

Aus den vorhandenen Daten ableitbar:
- **Orte** aus `rico:hasOrHadLocation` mit Rollen (wohnort, auffuehrungsort, vertragsort)
- **Zeiträume** aus `rico:date` der Dokumente
- **Mobilitätsform** → muss annotiert werden (Schicht 2/3) oder aus Biografie-Wissen inferiert

### Interaktion

- Hover über Band → zeigt Dokumente aus diesem Zeitraum/Ort
- Klick auf Übergang → zeigt "Bruch-Dokumente" (letztes Dokument aus X, erstes aus Y)
- Filter: Nur Verträge / Nur Korrespondenz / Nur Auftritte

---

## Visualisierung 2: "Rollen-Kosmos" (Radial/Chord)

### Konzept

Zeigt Malaniuks künstlerisches Universum:
- **Zentrum** = Ira Malaniuk
- **Innerer Ring** = Komponisten (Wagner, Verdi, Strauss, Mozart, ...)
- **Äußerer Ring** = Rollen (Fricka, Amneris, Octavian, ...)
- **Verbindungen** = Wo/Wann aufgeführt

```
                         WAGNER
                      ╱    │    ╲
               Kundry ─ Fricka ─ Waltraute
                  ╲      │      ╱
                   ╲     │     ╱
        VERDI ──────── IRA ──────── STRAUSS
           │       ╱    │    ╲       │
        Amneris   ╱     │     ╲   Octavian
           │     ╱      │      ╲     │
        Azucena ╱   GLUCK/HÄNDEL ╲   Komponist
               ╱        │        ╲
           Orpheus ─ Cornelia ─ [...]
```

### Forschungsfragen-Bezug

| FF | Was diese Visualisierung zeigt |
|----|-------------------------------|
| FF2 | Repertoire-Schwerpunkte: Wagner dominant? Verdi-Fach? Zeitgenössisches? |
| FF2 | Ukrainische Lieder als "Satelliten" außerhalb der Oper → Identitätsbewahrung |
| FF3 | Welche Rollen wurden "gelernt" vs. "mitgebracht"? (Zeitliche Schichtung) |

### Datengrundlage

- **Werke** aus `rico:hasOrHadSubject` (Werk-Entitäten mit Wikidata-ID)
- **Rollen** aus Schicht 3 (Verträge, Programmzettel, Kritiken)
- **Komponisten** über Wikidata-Verknüpfung der Werke

### Interaktion

- Hover über Rolle → Zeigt alle Aufführungsorte/-daten
- Klick auf Komponist → Filtert auf diesen Komponisten, zeigt Zeitverlauf
- Zeitschieber → Welche Rollen wann? (Animation möglich)

---

## Visualisierung 3: "Begegnungs-Matrix" (Heatmap)

### Konzept

Zeigt **Beziehungsintensität über Zeit**:
- Zeilen = Personen (Dirigenten, Kollegen, Vermittler, ...)
- Spalten = Zeitperioden (5-Jahres-Blöcke oder Dekaden)
- Zellfarbe = Anzahl gemeinsamer Dokumente
- Gruppierung = Beziehungstyp (künstlerisch, geschäftlich, privat)

```
                    1940-44  1945-49  1950-54  1955-59  1960-64  1965-69  1970+
                    ───────  ───────  ───────  ───────  ───────  ───────  ─────
DIRIGENTEN
  Karajan              ░        ░       ██       ███      ███       ██      ░
  Böhm                 ░        ░        █       ███      ███      ███      █
  Knappertsbusch       ░        ░       ██        ██       █        ░       ░
  Keilberth            ░        ░        █        ██       ██       █       ░

KOLLEGEN
  Ludwig               ░        ░        ░         █       ██      ███     ██
  Jurinac              ░        ░       ██        ██       ██       █       ░
  Hotter               ░        █        █        ██        █       ░       ░

VERMITTLER
  Taubman (Agentur)    ░        ░        █       ███      ███       ██      ░
  Werba                ░        █       ██       ███      ███      ███     ██

INSTITUTIONEN
  Wiener Staatsoper    ░        █       ██       ███       ██       █       ░
  Bayer. Staatsoper    ░        ░        █       ███      ███      ███      █
  Bayreuther Festsp.   ░        ░        █        ██       ██       █       ░
```

### Forschungsfragen-Bezug

| FF | Was diese Visualisierung zeigt |
|----|-------------------------------|
| FF1 | Wer war wann wichtig? Karriere-Phasen durch Beziehungen sichtbar |
| FF3 | Vermittler (Werba, Taubman) als konstante Begleiter → Wissenstransfer |
| FF1 | Institutionen-Cluster: "Wiener Kreis" vs. "Münchner Kreis" |

### Datengrundlage

- **Personen** aus `rico:hasOrHadAgent` mit Rollen
- **Ko-Okkurrenz** = gleiche Person in mehreren Dokumenten eines Zeitraums
- **Kategorisierung** (Dirigent/Kollege/Vermittler) → muss annotiert oder aus Wikidata inferiert werden

### Interaktion

- Hover über Zelle → Liste der Dokumente
- Klick auf Person → Öffnet Personen-Detailansicht mit allen Verknüpfungen
- Klick auf Zeitperiode → Filtert Archiv auf diesen Zeitraum

---

## Visualisierung 4: "Mobilitäts-Partitur" (Multi-Layer-Timeline)

### Konzept

Zeigt **alle Dimensionen parallel** wie eine Orchesterpartitur:
- Jede "Stimme" = eine Dimension (Ort, Netzwerk, Repertoire, Dokumenttyp)
- Horizontale Achse = Zeit
- Synchrone Lesart: Was passierte 1958 gleichzeitig?
- Diachrone Lesart: Wie entwickelte sich der Ort über Zeit?

```
ZEIT        1919──1930──1940──1945──1950──1955──1960──1965──1970──1998
            │     │     │     │     │     │     │     │     │     │
            │     │     │     │     │     │     │     │     │     │
LEBENS-     │ Kindheit  │Stud.│     │  Aufstieg  │  Höhepunkt  │Ruhe│
PHASEN      │           │     │     │            │             │    │
            │     │     │     │     │     │     │     │     │     │
            ├─────┴─────┴─────┼─────┴─────┴─────┼─────┴─────┴─────┤
            │     │     │     │     │     │     │     │     │     │
ORT         │░░░░░░░░░░░░░░░░░│     │     │     │     │     │     │
 Lemberg    │████████████████│     │     │     │     │     │     │
 Wien       │                 │████░│░░░░░░████░│░░░░░│     │     │
 Graz       │                 │     │██░░░│     │     │     │     │
 München    │                 │     │     │░████│█████│█████│░░░░░│
 Bayreuth   │                 │     │     │  ░██│░░███│░░░░░│     │
 Zürich     │                 │     │     │     │     │     │█████│
            │     │     │     │     │     │     │     │     │     │
            ├─────┴─────┴─────┼─────┴─────┴─────┼─────┴─────┴─────┤
            │     │     │     │     │     │     │     │     │     │
MOBILITÄT   │     │     │  ⚡ │     │     │     │     │     │     │
(Form)      │ ─── Bildung ─── │ ═══ Geografisch (Gastspiele) ═══ │
            │                 │ ╔══════════════════════════════╗ │
            │     │     │  🔴 │ ║    Erzwungen (Flucht)        ║ │
            │     │     │     │ ╚══════════════════════════════╝ │
            │     │     │     │     │     │     │     │  🟣 Lebens│
            │     │     │     │     │     │     │     │     │     │
            ├─────┴─────┴─────┼─────┴─────┴─────┼─────┴─────┴─────┤
            │     │     │     │     │     │     │     │     │     │
NETZWERK    │  ○  │  ○  │  ○  │ ○○  │○○○○○│○○○○○│○○○○○│ ○○○ │ ○○  │
(Dichte)    │     │     │     │     │     │     │     │     │     │
            │     │     │     │     │     │     │     │     │     │
            ├─────┴─────┴─────┼─────┴─────┴─────┼─────┴─────┴─────┤
            │     │     │     │     │     │     │     │     │     │
REPERTOIRE  │     │     │     │ ─── │Azucena────│─────│     │     │
            │     │     │     │     │     │Fricka│─────│─────│     │
            │     │     │     │     │ Orpheus   │     │     │     │
            │     │     │     │     │     │     │Klytämnestra──│  │
            │     │     │     │     │     │     │     │     │     │
            ├─────┴─────┴─────┼─────┴─────┴─────┼─────┴─────┴─────┤
            │     │     │     │     │     │     │     │     │     │
DOKUMENTE   │  ▪  │  ▪  │ ▪▪  │ ▪▪▪ │▪▪▪▪▪│▪▪▪▪▪│▪▪▪▪▪│ ▪▪▪ │ ▪▪  │
(Typ)       │     │     │     │ ███ │█████│█████│█████│ ███ │ ██  │
            │     │     │     │  Verträge dominieren │Kritiken│   │
```

### Forschungsfragen-Bezug

Diese Visualisierung ist die **einzige, die alle vier FF gleichzeitig adressiert**:

| FF | Spur in der Partitur |
|----|---------------------|
| FF1 | NETZWERK-Spur: Wann war die Vernetzung am dichtesten? |
| FF2 | REPERTOIRE-Spur: Welche Rollen wann? Wandel sichtbar |
| FF3 | NETZWERK + ORT: Wo entstanden die Verbindungen? |
| FF4 | MOBILITÄT-Spur: Explizite Darstellung der Formen |

### Datengrundlage

- **Lebensphasen** → manuell definiert (Kindheit, Studium, Aufstieg, Höhepunkt, Ruhestand)
- **Orte** → aus Dokumenten-Verknüpfungen aggregiert
- **Mobilität** → aus Orts-Übergängen + Annotation der Form
- **Netzwerk** → Anzahl distinkte Personen pro Zeitperiode
- **Repertoire** → Werke aus Verträgen, Programmzetteln, Kritiken
- **Dokumente** → Aggregation nach Typ und Datum

### Interaktion

- **Vertikaler Schnitt** (Klick auf Jahr): Zeigt alle Dokumente dieses Jahres
- **Horizontale Spur-Selektion**: Zeigt nur diese Dimension im Detail
- **Brush** (Zeitbereich auswählen): Filtert Archiv auf diesen Zeitraum
- **Zoom**: Semantic Zoom – bei Vergrößerung erscheinen Monats-Details

---

## Synthese: Ein Konzept, vier Perspektiven

Anstatt vier separate Visualisierungen könnte man einen **integrierten Ansatz** wählen:

### "Karriere-Explorer"

```
┌─────────────────────────────────────────────────────────────────────┐
│  KARRIERE-EXPLORER                                    [1950] ──●── │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    MOBILITÄTS-PARTITUR                      │   │
│  │  (Kompakte Version mit 4 Spuren)                            │   │
│  │  Zeit: ════════════════●════════════════════════════════    │   │
│  │                        ↑                                    │   │
│  │                   Fokus-Jahr                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│          ┌───────────────────┼───────────────────┐                 │
│          ↓                   ↓                   ↓                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │   BIOGRAFIE │    │   NETZWERK  │    │   ROLLEN    │            │
│  │   (Sankey)  │    │  (Heatmap)  │    │  (Kosmos)   │            │
│  │             │    │             │    │             │            │
│  │  Woher →    │    │  Wer war    │    │  Was wurde  │            │
│  │  Wohin?     │    │  wichtig?   │    │  gesungen?  │            │
│  │             │    │             │    │             │            │
│  │   [FF4]     │    │  [FF1,FF3]  │    │   [FF2]     │            │
│  └─────────────┘    └─────────────┘    └─────────────┘            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  DOKUMENTE (Archiv-Karten, gefiltert auf Fokus-Zeitraum)    │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │   │
│  │  │ V01 │ │ K12 │ │ P03 │ │ Kr5 │ │ F22 │ │ ... │           │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Interaktions-Modell

1. **Zeit-Fokus setzen** (Partitur-Slider oder Jahreseingabe)
2. **Alle Detail-Panels aktualisieren sich synchron**
3. **Klick in Detail-Panel** → Öffnet Archiv-Dokument
4. **Bidirektionale Filterung** → Archiv → Visualisierung und umgekehrt

---

## Nächste Schritte

### 1. Synthetische Daten erstellen

Basierend auf dem Dreischichtenmodell:

```json
{
  "_meta": {
    "synthetic": true,
    "derivedFrom": "M³GIM Kick-Off 2026-01",
    "purpose": "Prototyp-Entwicklung"
  },
  "lebensphasen": [...],
  "orte": [...],
  "personen": [...],
  "werke": [...],
  "mobilitaet": [...]
}
```

### 2. Prototyp-Reihenfolge

| Priorität | Visualisierung | Begründung |
|-----------|---------------|------------|
| 1 | Mobilitäts-Partitur | Vereint alle FF, gibt Überblick |
| 2 | Begegnungs-Matrix | Einfach zu implementieren, klarer FF1/FF3-Bezug |
| 3 | Rollen-Kosmos | FF2-spezifisch, Repertoire-Daten nötig |
| 4 | Biografie-Strom | Komplex, aber eindrucksvoll für FF4 |

### 3. Technologie-Entscheidung

| Visualisierung | Bibliothek |
|---------------|------------|
| Partitur | D3.js (custom) oder Observable Plot (Facets) |
| Matrix/Heatmap | D3.js oder Observable Plot |
| Kosmos (Radial) | D3.js (d3-chord oder custom) |
| Sankey | D3.js (d3-sankey) |

---

## Offene Fragen an das Team

1. **Lebensphasen**: Gibt es eine etablierte Periodisierung für Malaniuks Biografie?
2. **Mobilitätsform-Annotation**: Wird das systematisch erfasst oder nur bei Schlüsseldokumenten?
3. **Personen-Kategorisierung**: Dirigent/Kollege/Vermittler – aus Wikidata ableitbar oder manuell?
4. **Repertoire-Vollständigkeit**: Haben wir eine Liste aller Rollen, oder nur aus den Dokumenten?

---

*Version 1.0 – 2026-01-18*
*Entwickelt für M³GIM Phase 3*
