# Visualisierung 1: Mobilitäts-Partitur

## Konzept

Die Mobilitäts-Partitur ist eine multi-layer Timeline-Visualisierung, die mehrere Dimensionen eines Künstlerlebens parallel darstellt – wie Stimmen in einer Orchesterpartitur. Sie ermöglicht sowohl synchrone Lesart (Was passierte gleichzeitig?) als auch diachrone Lesart (Wie entwickelte sich eine Dimension über Zeit?).

**Kernmetapher:** Wie in einer Orchesterpartitur mehrere Instrumente gleichzeitig notiert sind, zeigt die Mobilitäts-Partitur mehrere Lebensdimensionen parallel. Die Forscherin kann vertikal lesen ("Was passierte 1958 in allen Dimensionen?") oder horizontal ("Wie entwickelte sich das Repertoire über 30 Jahre?").

## Adressierte Forschungsfragen

| FF | Relevanz | Wie adressiert | User Story |
|----|----------|----------------|------------|
| **FF1** | Hoch | Netzwerk-Spur zeigt Dichte der Vernetzung pro Periode | US 1.2 |
| **FF2** | Hoch | Repertoire-Spur zeigt Entwicklung des künstlerischen Profils | US 2.2 |
| **FF3** | Mittel | Implizit über Netzwerk-Dichte lesbar | - |
| **FF4** | Sehr hoch | Mobilitäts-Spur mit Farbcodierung nach Mobilitätsform, Orte-Spur zeigt Wohnorte vs. Aufführungsorte | US 4.1, 4.2 |

---

## User Stories & UI-Flows

### US 2.2: Repertoire-Entwicklung analysieren

**Forscherin:** Dr. Weber (Opernforschung)
**Frage:** "Begann Malaniuk mit Verdi und wechselte zu Wagner? Oder war das Repertoire von Anfang an breit?"

**UI-Flow:**
```
1. Öffne Partitur → Scrolle zur Repertoire-Spur
2. Lese Farbcodierung: Rot=Wagner, Grün=Verdi, Violett=Strauss
3. ERKENNTNIS: Amneris (Verdi) beginnt früh (~1946), läuft bis ~1968
4. ERKENNTNIS: Fricka (Wagner) beginnt später (~1952), wird dominant
5. Setze Fokus-Slider auf 1952 (Bayreuth-Debüt)
6. ERKENNTNIS: Ab 1952 explodiert das Wagner-Repertoire
7. Klicke auf Fricka-Balken → Document Panel zeigt 12 Archivalien
8. Öffne "Szenenfoto Fricka (Ring)" → Archiv-Detailansicht
```

**Forschungsergebnis:** Das Wagner-Repertoire korreliert mit dem Bayreuth-Engagement. Verdi war die Basis, Wagner der Aufstieg.

---

### US 4.1: Mobilitätsformen klassifizieren

**Forscherin:** Dr. Rosenberg (Migrationsforschung)
**Frage:** "Welche Mobilitätsformen lassen sich unterscheiden? Wie verhält sich erzwungene zu freiwilliger Mobilität?"

**UI-Flow:**
```
1. Öffne Partitur → Fokussiere Mobilitäts-Spur
2. Sehe Kreise: E (rot) = erzwungen, G (grün) = geografisch, L (violett) = Lebensstil
3. ERKENNTNIS: 1944 roter Kreis → Flucht aus der Ukraine
4. ERKENNTNIS: 1945-1955 viele grüne Kreise → Karriere-Mobilität (Gastspiele)
5. ERKENNTNIS: 1970 violetter Kreis → Übersiedlung nach Zürich (Ehemann)
6. Klicke auf roten Kreis → Document Panel: "Identitätsdokument Staatenlose"
7. FORSCHUNGSFRAGE BEANTWORTET: Drei Haupttypen identifiziert
```

**Forschungsergebnis:** Malaniuks Mobilität wandelte sich von erzwungen (Flucht) über karrierebedingt (Gastspiele) zu lebensstilbedingt (Zürich).

---

### US 4.2: Wohnorte vs. Aufführungsorte

**Forscherin:** Mag. Berger (Kulturgeografie)
**Frage:** "Wo lebte Malaniuk vs. wo trat sie auf? Gab es Pendelmuster?"

**UI-Flow:**
```
1. Öffne Partitur → Fokussiere Orte-Spur
2. Sehe zwei Zeilen: "Wohnort" (große Balken), "Bühne" (kleine Balken)
3. ERKENNTNIS: Wohnort wechselt selten (Lemberg→Wien→Graz→Zürich)
4. ERKENNTNIS: Aufführungsorte überlappen massiv (Wien, München, Bayreuth parallel)
5. ERKENNTNIS: Zürich = Wohnort, aber keine Aufführungen dort
6. Klicke auf "Bayreuth" → Document Panel: Festspiel-Programme, Verträge
```

**Forschungsergebnis:** Die "Homebase" verschob sich, während das Gastspiel-Netzwerk expandierte. Zürich war Ruhepol, nicht Arbeitsort.

---

## Spuren-Detailspezifikation

### Spur 1: Lebensphasen

| Attribut | Wert |
|----------|------|
| Datenquelle | Sekundärdaten / Biografische Forschung |
| Felder | id, label, von, bis, ort, beschreibung, dokumente[] |
| Visuelle Kodierung | Rechteck, volle Breite, Label zentriert |
| Farbe | KUG Blau (#004A8F) mit 20% Opacity |
| Interaktion | Hover → Tooltip, Klick → Document Panel |

**Forschungsrelevanz:** Kontextualisierung aller anderen Spuren. "Was war die Lebensphase während des Wagner-Engagements?"

### Spur 2: Orte (Swimlane)

| Attribut | Wert |
|----------|------|
| Datenquelle | Ortsindex + Verknüpfungstabelle |
| Layout | Zwei Zeilen: Wohnort (oben, 16px hoch), Bühne (unten, gestapelt 8px) |
| Farbskala | ortColors: Lemberg=#8B4513, Wien=#C41E3A, Graz=#2E7D32, etc. |
| Collision Detection | Für Aufführungsorte: Slot-basierte Stapelung |
| Interaktion | Hover → Tooltip mit Dokument-Count, Klick → Document Panel |

**Forschungsrelevanz (FF4):** Unterscheidung Sesshaftigkeit vs. Pendeln. Parallelität zeigt Arbeitsbelastung.

### Spur 3: Mobilität

| Attribut | Wert |
|----------|------|
| Datenquelle | Mobilitäts-Ereignisse mit Form-Klassifikation |
| Visuelle Kodierung | Kreise auf Zeitachse, Radius = Dokumentenmenge |
| Farbskala | Rot (#D32F2F) = erzwungen, Grün (#2E7D32) = geografisch, Violett (#6A1B9A) = Lebensstil |
| Labels | Buchstaben unter Kreis (E, G, L) |
| Interaktion | Hover → Von→Nach + Beschreibung, Klick → Document Panel |

**Forschungsrelevanz (FF4):** Direkte Beantwortung der Forschungsfrage nach Mobilitätsformen.

### Spur 4: Netzwerk (Dichte)

| Attribut | Wert |
|----------|------|
| Datenquelle | Aggregation aus Personen-Begegnungen pro 5-Jahres-Periode |
| Visuelle Kodierung | Balkendiagramm (Area Chart wäre Alternative) |
| Farbskala | KUG Blau mit Intensitäts-Gradient |
| Interaktion | Hover → "Netzwerk 1955-1959: Intensität 28" |

**Forschungsrelevanz (FF1, FF3):** Zeigt "Netzwerk-Dichte" – wann war Malaniuk am stärksten vernetzt?

### Spur 5: Repertoire

| Attribut | Wert |
|----------|------|
| Datenquelle | Werkindex + Rollen-Verknüpfungen |
| Layout | Horizontale Balken mit Collision Detection (max 5 Slots) |
| Farbskala | Nach Komponist: Wagner=#8B0000, Verdi=#006400, Strauss=#4B0082 |
| Label | Rollenname (nur wenn Breite > 60px) |
| Interaktion | Hover → Rolle + Werk + Zeitraum, Klick → Document Panel |

**Forschungsrelevanz (FF2):** Zeigt Repertoire-Entwicklung über Zeit. Dominanz einzelner Komponisten sichtbar.

### Spur 6: Dokumente

| Attribut | Wert |
|----------|------|
| Datenquelle | Aggregation: Dokumentanzahl pro Jahr |
| Visuelle Kodierung | Kreise, Radius proportional zu sqrt(Anzahl) |
| Farbe | Grau (#757575) |
| Interaktion | Hover → "15 Dokumente (1958)" |

**Forschungsrelevanz:** Zeigt Überlieferungsdichte. Lücken = fehlende Quellen oder tatsächlich "stille" Phasen?

---

## Fokus-Linie: Das Schlüssel-Feature

Die vertikale Fokus-Linie ist das zentrale Navigationsinstrument:

```
                    │ 1958
────────────────────┼────────────────────
Lebensphasen   [...│Internationale Karriere...]
────────────────────┼────────────────────
Orte           [...│Wien/München/Bayreuth...]
────────────────────┼────────────────────
Mobilität      [...│ ●G  ●G ...]
────────────────────┼────────────────────
```

**Interaktion:**
- Slider in Sidebar: Zieht die Linie
- Klick auf Achse: Springt zu Jahr
- Tastatur: Pfeiltasten ±1 Jahr

**Forschungsnutzen:** Synchrone Lesart. "Was passierte 1958 in allen Dimensionen?"

---

## Implementierungsstatus

| Feature | Status | Details |
|---------|--------|---------|
| 6 Spuren | ✅ | Alle implementiert |
| Fokus-Linie | ✅ | Mit Slider steuerbar |
| Spurenfilter | ✅ | Checkboxen in Sidebar |
| Tooltips | ✅ | Für alle Elemente |
| Document Panel | ✅ | Klick → Archivalien |
| Swimlane für Orte | ✅ | Wohnort/Bühne getrennt |
| Collision Detection | ✅ | Für Repertoire und Orte |
| Komponisten-Farbcodierung | ✅ | Wagner, Verdi, Strauss, etc. |
| Mobilitätsform-Farbcodierung | ✅ | Erzwungen, Geografisch, Lebensstil |

---

## Kritische Evaluation

### Stärken

1. **Synchrone Lesart einzigartig:** Keine andere Visualisierung im Projekt zeigt "Was passierte gleichzeitig?"
2. **Archivalien-Verlinkung:** Jeder Datenpunkt ist belegbar – wissenschaftlich essenziell
3. **Swimlane-Layout:** Wohnort vs. Bühne ist innovativ und intuitiv
4. **Fokus-Linie:** Macht die Partitur-Metapher greifbar

### Schwächen

1. **Visuelle Dichte:** Bei allen 6 Spuren kann es überwältigend sein
2. **Netzwerk-Spur abstrakt:** Nur Balken, keine Personen sichtbar → Matrix besser
3. **Keine Legende im Bild:** Farben müssen "gelernt" werden
4. **Export fehlt:** Kein PNG/SVG-Export für Publikationen

### Verbesserungsvorschläge

| Priorität | Verbesserung | Begründung |
|-----------|--------------|------------|
| Hoch | Legende einblenden | Farben ohne Erklärung nicht verständlich |
| Hoch | SVG-Export | Für wissenschaftliche Publikationen |
| Mittel | Spur-Tooltips verbessern | Mehr Kontext beim Hover |
| Mittel | Jahrzehnt-Schnellnavigation | Klick auf "1950er" springt zur Dekade |
| Niedrig | Responsive Anpassung | Auf kleinen Bildschirmen problematisch |

---

## Testplan

### Funktionale Tests

| Test | Erwartetes Ergebnis | Status |
|------|---------------------|--------|
| Fokus-Slider bewegen | Linie bewegt sich, Jahr-Label aktualisiert | ✅ |
| Spur ausblenden | Spur verschwindet, Layout passt sich an | ✅ |
| Lebensphase klicken | Document Panel öffnet mit Dokumenten | ✅ |
| Ort klicken | Document Panel zeigt Orts-Dokumente | ✅ |
| Mobilitäts-Marker klicken | Document Panel zeigt Mobilitäts-Dokumente | ✅ |
| Repertoire-Balken klicken | Document Panel zeigt Rollen-Dokumente | ✅ |

### Forschungs-Tests

| Test | Forschungsfrage | Erwartetes Ergebnis | Status |
|------|-----------------|---------------------|--------|
| Repertoire-Entwicklung ablesen | FF2 | Wagner-Anstieg ab 1952 sichtbar | ✅ |
| Mobilitätsformen unterscheiden | FF4 | Rot/Grün/Violett klar unterscheidbar | ✅ |
| Wohnort vs. Bühne erkennen | FF4 | Zwei Zeilen in Orte-Spur | ✅ |
| Netzwerk-Dichte ablesen | FF1 | Balken in Netzwerk-Spur | ✅ |

---

## Offene Fragen für Forscher*innen

1. Sind die 5-Jahres-Intervalle für die Netzwerk-Dichte sinnvoll, oder wären Jahres-Intervalle besser?
2. Sollten die Lebensphasen von den Forscher*innen editierbar sein?
3. Fehlt eine wichtige Spur? (z.B. "Einkommen" oder "Gesundheit"?)

---

*Version 2.0 – 2026-01-18*
*Erweitert um User Stories, Testplan und kritische Evaluation*
