# Visualisierung 3: Rollen-Kosmos

## Konzept

Der Rollen-Kosmos ist eine radiale Force-Graph-Visualisierung, die Ira Malaniuks künstlerisches Universum zeigt: Im Zentrum steht die Künstlerin, um sie herum gruppieren sich Komponisten, von denen wiederum die einzelnen Rollen ausstrahlen. Die Größe der Knoten korreliert mit der Dokumentenmenge, die Farben unterscheiden die Komponisten.

**Kernmetapher:** Ein "Sonnensystem" des Repertoires. Malaniuk ist die Sonne, Komponisten sind Planeten, Rollen sind Monde. Je größer ein Himmelskörper, desto mehr Archivmaterial belegt ihn.

**Einzigartiger Wert:** Der Kosmos zeigt das *ästhetische Profil* – welche Komponisten und Rollen prägten die Künstlerin? Die Partitur zeigt *wann*, der Kosmos zeigt *was*.

## Adressierte Forschungsfragen

| FF | Relevanz | Wie adressiert | User Story |
|----|----------|----------------|------------|
| **FF1** | Gering | Nur indirekt (Repertoire als Teil der Professionalisierung) | - |
| **FF2** | Sehr hoch | Zeigt künstlerisches Profil, ästhetische Schwerpunkte | US 2.1 |
| **FF3** | Gering | Nur indirekt (Repertoire als "Wissen") | - |
| **FF4** | Gering | Keine direkte Mobilitätsdarstellung | - |

---

## User Stories & UI-Flows

### US 2.1: Repertoire-Schwerpunkte erkennen

**Forscherin:** Dr. Weber (Opernforschung)
**Frage:** "War Malaniuk eine Wagner-Spezialistin? Wie breit war ihr Repertoire wirklich?"

**UI-Flow:**
```
1. Öffne "Analyse" → "Rollen-Kosmos"
2. Überblick: Malaniuk im Zentrum, 4-5 Komponisten als Satelliten
3. ERSTE ERKENNTNIS: Wagner (rot) und Verdi (grün) sind die größten Knoten
4. ERKENNTNIS: Das Repertoire war NICHT einseitig – zwei Schwerpunkte
5. Klicke auf "Wagner" → Fokus-Modus aktiviert
6. Sehe nur Wagner-Rollen: Fricka (sehr groß), Waltraute (mittel), Erda (klein)
7. ERKENNTNIS: Fricka war DIE Wagner-Rolle (34 Dokumente)
8. Klicke auf "Fricka" → Document Panel öffnet
9. Sehe: 12 Fotografien, 8 Verträge, 14 Kritiken
10. Klicke auf "Szenenfoto Fricka (Ring)" → Archiv-Detailansicht
```

**Forschungsergebnis:** Malaniuk war keine reine Wagner-Spezialistin, sondern hatte zwei Säulen: Wagner (Fricka) und Verdi (Amneris). Die Bezeichnung "Wagner-Sängerin" in der Literatur greift zu kurz.

---

### US 2.2: Repertoire-Breite analysieren

**Forscherin:** Mag. Fischer (Musiktheater)
**Frage:** "Wie entwickelte sich das Repertoire? Gab es einen 'Barock-Schwenk' in der Spätphase?"

**UI-Flow:**
```
1. Öffne Kosmos → Identifiziere kleine Knoten
2. Sehe: "Gluck/Händel" (goldbraun) ist klein, aber vorhanden
3. Klicke auf Gluck/Händel → Fokus auf Barock-Rollen
4. Sehe: Orfeo (klein), Cornelia (sehr klein)
5. FRAGE: Wann wurden diese Rollen gesungen?
6. Klicke auf "Orfeo" → Document Panel
7. Sehe: 3 Dokumente, alle aus 1965-1968
8. ERKENNTNIS: Der "Barock-Schwenk" kam in der Spätphase
```

**Forschungsergebnis:** Der Barock war Spätwerk, nicht Kernrepertoire. Malaniuk explorierte neue Stile, als die Wagner-Karriere abklang.

---

### US 2.3: Dominanz einzelner Rollen quantifizieren

**Forscherin:** Dr. Novak (Quantitative Kulturwissenschaft)
**Frage:** "Welche Rolle war am wichtigsten? Gibt es eine 'Signature Role'?"

**UI-Flow:**
```
1. Öffne Kosmos → Vergleiche Knotengrößen der Rollen
2. ERKENNTNIS: Fricka ist deutlich größer als alle anderen
3. Hover über Fricka → Tooltip: "34 Dokumente"
4. Hover über Amneris → Tooltip: "28 Dokumente"
5. ERKENNTNIS: Fricka (Wagner) > Amneris (Verdi) > Rest
6. Klicke auf Fricka → Document Panel → sortiere nach Typ
7. Sehe: 12 Fotografien – visuelle Ikonografie dominiert
8. HYPOTHESE: Fricka war die "Signature Role" = visuelle Marke
```

**Forschungsergebnis:** Fricka war nicht nur die häufigste, sondern auch die visuell präsenteste Rolle. Die Fotografien belegen aktive Image-Bildung.

---

## Visuelle Spezifikation

### Hierarchie-Ebenen

```
                         ┌─────────────────┐
                         │  ROLLEN-EBENE   │
                         │   (Radius 280)  │
                         │  ○ Fricka       │
                         │  ○ Waltraute    │
                         │  ○ Erda         │
             ┌───────────┴─────────────────┴───────────┐
             │           KOMPONISTEN-EBENE             │
             │              (Radius 160)               │
             │                                         │
             │     ● Wagner      ● Verdi               │
             │                                         │
             │        ● Strauss    ● Gluck             │
             └─────────────────────────────────────────┘
                              │
                              │
                     ┌────────┴────────┐
                     │    ZENTRUM      │
                     │  IRA MALANIUK   │
                     │   (fixiert)     │
                     └─────────────────┘
```

### Konzentrische Hilfskreise (Orbit-Guides)

- **Radius 160:** Gestrichelte Linie, Label "Komponisten"
- **Radius 280:** Gestrichelte Linie, Label "Rollen"

Diese Guides erhöhen die **Intuitivität** (aus VIZ-Evaluation) und kommunizieren die Hierarchie.

### Farbkodierung

| Komponist | Hex | Begründung |
|-----------|-----|------------|
| Richard Wagner | #8B0000 | Dunkelrot – dramatisch, assoziiert mit Bayreuth |
| Giuseppe Verdi | #006400 | Dunkelgrün – Italien-Konnotation |
| Richard Strauss | #4B0082 | Violett/Indigo – Moderne, Raffinesse |
| Gluck/Händel | #B8860B | Gold/Braun – Barock, historisch |
| Georg Friedrich Händel | #2F4F4F | Dunkelgrau – alternativ zu Gluck |

### Größenkodierung

```
Radius = sqrt(anzahl_dokumente) * 2 + Basis

Basis:
- Zentrum: 50px (fix)
- Komponist: 25px (Minimum)
- Rolle: 10px (Minimum)
```

---

## Interaktion: Click-to-Focus

### Zustandsdiagramm

```
                 ┌─────────────┐
                 │   NORMAL    │
                 │  (alle dim) │
                 └──────┬──────┘
                        │ Klick auf Komponist
                        ▼
                 ┌─────────────┐
                 │   FOKUS     │
                 │ (1 Komponist│
                 │  + Rollen)  │
                 └──────┬──────┘
                        │ Klick auf Hintergrund/Zentrum
                        │ oder gleichen Komponist
                        ▼
                 ┌─────────────┐
                 │   NORMAL    │
                 └─────────────┘
```

### Fokus-Effekte

| Element | Normal | Fokussiert | Nicht-Fokus |
|---------|--------|------------|-------------|
| Fokussierter Komponist | opacity 0.2 | opacity 0.8, stroke 2px | - |
| Fokussierte Rollen | opacity 0.6 | opacity 0.8, Labels sichtbar | opacity 0.08 |
| Andere Komponisten | opacity 0.2 | - | opacity 0.08 |
| Verbindungslinien | opacity 0.25 | opacity 0.6 | opacity 0.05 |

---

## Implementierungsstatus

| Feature | Status | Details |
|---------|--------|---------|
| Force-Layout mit d3-forceCollide | ✅ | Keine Überlappungen |
| Drei Hierarchie-Ebenen | ✅ | Zentrum, Komponist, Rolle |
| Konzentrische Orbit-Guides | ✅ | Gestrichelte Kreise mit Labels |
| Click-to-Focus | ✅ | Dimmt nicht-fokussierte Elemente |
| Reset durch Zentrum-Klick | ✅ | Oder Hintergrund-Klick |
| Hover-Tooltips | ✅ | Für alle Knoten |
| Klick auf Rolle → Document Panel | ✅ | Archivalien-Liste |
| Komponisten-Farbcodierung | ✅ | Wagner, Verdi, Strauss, etc. |
| Größenkodierung nach Dokumenten | ✅ | sqrt-Skalierung |
| Legende (Komponisten) | ✅ | Oben links |
| Legende (Größe) | ✅ | Unten links |
| Instruktionstext | ✅ | "Klick auf Komponist zum Fokussieren" |
| **Zeitfilter** | ❌ | FEHLT – Wann wurde welche Rolle gesungen? |
| **Orts-Verlinkung** | ❌ | FEHLT – Wo wurde welche Rolle gesungen? |

---

## Kritische Evaluation

### Stärken

1. **Sofortiges ästhetisches Profil:** Dominante Komponisten/Rollen auf einen Blick
2. **Click-to-Focus reduziert Komplexität:** Fokussierung ohne Datenverlust
3. **Orbit-Guides verbessern Intuitivität:** Hierarchie ist kommuniziert
4. **Archivalien-Link:** Jede Rolle führt zu Quellen

### Schwächen

1. **Keine Zeitdimension:** Wann wurde welche Rolle gesungen? Nur im Tooltip
2. **Keine Ortsdimension:** Wo wurde welche Rolle gesungen? Komplett fehlend
3. **Static Layout:** Kann nicht "1952-1960" filtern
4. **Force-Layout variiert:** Bei jedem Laden leicht andere Positionen

### Warum der Kosmos trotzdem wichtig ist

Die Partitur zeigt *wann* das Repertoire sich entwickelte. Der Kosmos zeigt *was* das Repertoire *war*. Für FF2 (ästhetische Strukturen) ist diese Abstraktion wertvoll:

> "Malaniuk war primär eine Wagner/Verdi-Sängerin mit 2 Hauptrollen (Fricka, Amneris) und einem kleinen Barock-Nebenzweig."

Diese Aussage ist aus der Partitur schwer abzulesen, aus dem Kosmos sofort.

---

## Verbesserungsvorschläge mit Begründung

| Priorität | Feature | Forschungsnutzen | Aufwand |
|-----------|---------|------------------|---------|
| HOCH | Zeitspanne im Tooltip | "Fricka: 1952-1968" ist wertvoller als nur Dokumentenzahl | Gering |
| MITTEL | Zeitfilter-Overlay | "Zeige nur Rollen 1955-1965" | Mittel |
| MITTEL | Export als SVG | Für Publikationen | Gering |
| NIEDRIG | Stabileres Layout | Fixe Positionen statt Force | Mittel |
| NIEDRIG | Orts-Verbindung | "Fricka wurde in Bayreuth, Wien, München gesungen" | Hoch |

---

## Testplan

### Funktionale Tests

| Test | Erwartetes Ergebnis | Status |
|------|---------------------|--------|
| Komponist klicken | Fokus-Modus aktiviert, andere gedimmt | ✅ |
| Zentrum klicken | Fokus zurückgesetzt | ✅ |
| Hintergrund klicken | Fokus zurückgesetzt | ✅ |
| Rolle klicken | Document Panel öffnet | ✅ |
| Hover auf Komponist | Tooltip: Name, Werke-Anzahl, Dokumentenzahl | ✅ |
| Hover auf Rolle | Tooltip: Name, Komponist, Werk, Zeitraum, Dokumentenzahl | ✅ |

### Forschungs-Tests

| Test | Forschungsfrage | Erwartetes Ergebnis | Status |
|------|-----------------|---------------------|--------|
| Dominante Komponisten identifizieren | FF2 | Wagner + Verdi größte Knoten | ✅ |
| Signature Role finden | FF2 | Fricka größter Rollen-Knoten | ✅ |
| Repertoire-Breite einschätzen | FF2 | 4-5 Komponisten sichtbar | ✅ |
| Barock-Anteil erkennen | FF2 | Gluck/Händel klein aber vorhanden | ✅ |
| Zeitraum pro Rolle ablesen | FF2 | ⚠️ Nur im Tooltip, nicht visuell | ⚠️ |

---

## Datenmodell-Anforderung

### Konsistente Rollenerfassung

Für die volle Funktionalität muss bei **jeder Werk-Verknüpfung** auch die **Rolle** erfasst werden:

```json
{
  "archivsignatur": "UAKUG/NIM_028",
  "typ": "werk",
  "name": "Aida",
  "rolle": "interpretin",
  "anmerkung": "Amneris"  // ← KRITISCH: Rollenname hier
}
```

**Problem:** Aktuell ist das Anmerkungsfeld nicht konsistent befüllt. Ohne Rollennamen kann der Kosmos nicht zwischen "Amneris" und "Aida" (die Titelrolle, die Malaniuk nie sang) unterscheiden.

**Empfehlung:** Erfassungsrichtlinie um Pflichtfeld "Rolle" erweitern, wenn `typ=werk`.

---

## Nächster Implementierungsschritt: Zeitspanne im Tooltip

### Aktuell

```javascript
showTooltip(event, d.name, `${d.komponist}: ${d.werk}\n${d.zeitraum} · 📄 ${docCount} Archivalien`);
```

### Verbessert

```javascript
const zeitspanne = d.zeitraum || 'unbekannt';
const [von, bis] = zeitspanne.split('-');
const dauer = bis && von ? `${parseInt(bis) - parseInt(von)} Jahre` : '';
showTooltip(event, d.name,
  `${d.komponist}: ${d.werk}\n` +
  `Zeitraum: ${zeitspanne} (${dauer})\n` +
  `📄 ${docCount} Archivalien\n` +
  `Klick für Archivbelege`
);
```

---

## Offene Fragen für Forscher*innen

1. Sollen Rollen **nur** Opernrollen sein, oder auch Konzertstücke (z.B. Mahler-Lieder)?
2. Wäre eine **animierte** Version sinnvoll, die das Repertoire über Zeit wachsen zeigt?
3. Fehlen Komponisten? (z.B. Mozart – sang Malaniuk je Mozart?)

---

*Version 2.0 – 2026-01-18*
*Erweitert um User Stories, Interaktionsdesign und kritische Evaluation*
