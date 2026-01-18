# Visualisierung 2: Begegnungs-Matrix

## Konzept

Die Begegnungs-Matrix ist eine Heatmap, die Beziehungsintensitäten zwischen Ira Malaniuk und ihrem Netzwerk über Zeitperioden hinweg zeigt. Jede Zeile repräsentiert eine Person, jede Spalte eine Zeitperiode (5-Jahres-Intervalle). Die Farbintensität zeigt die Begegnungsdichte.

**Kernmetapher:** Wie in einer Tabelle liest man Zeilen (Personen) und Spalten (Zeiträume). Die Farbe zeigt Intensität – je dunkler, desto wichtiger war diese Person in diesem Zeitraum.

**Einzigartiger Wert:** Die Matrix zeigt *wer* wann wichtig war. Die Partitur zeigt *was* passierte, aber nicht *mit wem*.

## Adressierte Forschungsfragen

| FF | Relevanz | Wie adressiert | User Story |
|----|----------|----------------|------------|
| **FF1** | Sehr hoch | Zeigt direkt, welche Personen wann für Vernetzung wichtig waren | US 1.1 |
| **FF2** | Gering | Nur indirekt über Regisseure/Dirigenten als ästhetische Einflüsse | - |
| **FF3** | Sehr hoch | Vermittler-Kategorie zeigt Wissenstransfer-Akteure | US 3.1 |
| **FF4** | Gering | Mobilität nur implizit über geografisch verteilte Kontakte | - |

---

## User Stories & UI-Flows

### US 1.1: Karriereschlüsselpersonen identifizieren

**Forscherin:** Dr. Müller (Musikwissenschaft)
**Frage:** "Wer waren die Türöffner für Malaniuks Karriere? Gab es Brüche in den Netzwerken?"

**UI-Flow:**
```
1. Öffne "Analyse" → "Begegnungs-Matrix"
2. Betrachte die Heatmap: Zeilen = Personen, Spalten = 5-Jahres-Perioden
3. Scanne nach Mustern:
   - MUSTER 1: Dunkle Spalten = intensive Phasen (1955-1959 sehr dunkel)
   - MUSTER 2: Durchgehende Zeilen = langfristige Beziehungen (z.B. Werba)
   - MUSTER 3: Abrupte Enden = Brüche (z.B. Karajan endet 1960)
4. Klicke auf Zelle "Karajan, 1955-1959" (dunkelblau)
5. Document Panel öffnet: 3 Verträge, 2 Korrespondenzen
6. ERKENNTNIS: Karajan engagierte Malaniuk für Salzburger Festspiele
7. Klicke auf nächste Zelle "Karajan, 1960-1964" (leer)
8. FRAGE entsteht: Warum endete die Beziehung? → Archivrecherche nötig
```

**Forschungsergebnis:** Karajan war 1955-1959 Schlüsselperson, die Beziehung endete abrupt. Hypothese: Karajans Wechsel zur Berliner Philharmonie?

---

### US 1.2: Netzwerkveränderungen vergleichen

**Forscherin:** Prof. Schmidt (Kulturgeschichte)
**Frage:** "Wie unterschied sich das Graz-Netzwerk vom Wien-Netzwerk?"

**Idealer UI-Flow (NOCH NICHT IMPLEMENTIERT):**
```
1. Öffne Matrix
2. Setze Zeitfilter auf "1945-1949" (Graz-Phase)
3. Sehe: Wenige Personen, lokale Kontakte
4. Wechsle Zeitfilter auf "1955-1964" (Internationale Phase)
5. Sehe: Viele Personen, Dirigenten dominieren
6. VERGLEICH: Anzahl Kontakte 5 → 25 (5x Wachstum)
7. ERKENNTNIS: Professionalisierung = Netzwerk-Expansion
```

**Aktueller Workaround:** Beide Phasen mental vergleichen (nicht ideal).

---

### US 3.1: Vermittler-Personen identifizieren

**Forscherin:** Dr. Klein (Netzwerkforschung)
**Frage:** "Wer waren Brückenpersonen zwischen Institutionen?"

**UI-Flow:**
```
1. Öffne Matrix
2. Beachte Kategoriesortierung: Dirigent | Vermittler | Kollege
3. Fokussiere auf "VERMITTLER"-Sektion
4. Identifiziere: Erik Werba (durchgehend 1945-1969)
5. Klicke auf Werba-Zeile
6. ERKENNTNIS: Werba war in JEDER Phase aktiv
7. Klicke auf einzelne Zellen → verschiedene Kontexte:
   - 1945-1949: "Liedbegleiter"
   - 1950-1954: "Korrespondenzpartner"
   - 1955-1969: "Konzertpartner"
8. HYPOTHESE: Werba war Kontinuitätsgarant trotz Karrierewechsel
```

**Forschungsergebnis:** Vermittler sind langfristiger aktiv als Dirigenten. Werba als "roter Faden" durch alle Karrierephasen.

---

## Visuelle Spezifikation

### Matrix-Layout

```
                    1945-49  1950-54  1955-59  1960-64  1965-69
                   ┌────────┬────────┬────────┬────────┬────────┐
DIRIGENT           │        │        │        │        │        │
  Karajan         │   ░    │   ▓    │   █    │        │        │
  Böhm            │        │   ▓    │   ▓    │   ▓    │   ░    │
  Knappertsbusch  │        │   █    │   █    │   ▓    │        │
                  ├────────┼────────┼────────┼────────┼────────┤
VERMITTLER        │        │        │        │        │        │
  Werba           │   ▓    │   ▓    │   █    │   ▓    │   ▓    │
                  ├────────┼────────┼────────┼────────┼────────┤
KOLLEGE           │        │        │        │        │        │
  Ludwig          │        │   ░    │   ▓    │   ▓    │   ░    │
  Jurinac         │   ░    │   ▓    │   ▓    │   ░    │        │
                  └────────┴────────┴────────┴────────┴────────┘

Legende: ░ = 1-2  ▓ = 3-4  █ = 5+ Begegnungen
```

### Farbskala

| Intensität | Wert | Hex-Farbe | Bedeutung |
|------------|------|-----------|-----------|
| 0 | keine | #F5F3EF | Keine dokumentierte Begegnung |
| 1 | minimal | #E3EDF7 | 1 Dokument |
| 2 | gering | #B6D4F1 | 2 Dokumente |
| 3 | mittel | #6AACDC | 3 Dokumente |
| 4 | hoch | #2180B9 | 4 Dokumente |
| 5 | sehr hoch | #0A5189 | 5+ Dokumente |

### Kategorie-Farben (Zeilenakzent)

| Kategorie | Hex | Verwendung |
|-----------|-----|------------|
| Dirigent | #1565C0 | Linker Punkt + Separator |
| Regisseur | #6A1B9A | Linker Punkt + Separator |
| Vermittler | #2E7D32 | Linker Punkt + Separator |
| Kollege | #E65100 | Linker Punkt + Separator |

---

## Implementierungsstatus

| Feature | Status | Details |
|---------|--------|---------|
| Heatmap-Grid | ✅ | Rechtecke mit Farbskala |
| Intensitäts-Labels | ✅ | Zahlen in Zellen |
| Kategoriesortierung | ✅ | Dirigent → Vermittler → Kollege |
| Kategorie-Separatoren | ✅ | Visuelle Trennlinien |
| Hover-Tooltips | ✅ | Person, Zeitraum, Intensität, Kontext |
| Klick → Document Panel | ✅ | Archivalien pro Zelle |
| Legende (Intensität) | ✅ | Oben rechts |
| Legende (Kategorie) | ✅ | Unten |
| **Zeitfilter** | ❌ | FEHLT – Kritische Lücke |
| **Sortieroptionen** | ❌ | FEHLT |
| **Export** | ❌ | FEHLT |

---

## Kritische Evaluation

### Stärken

1. **Direkte FF1/FF3-Antwort:** "Wer war wann wichtig?" – sofort ablesbar
2. **Muster erkennbar:** Langfristige vs. kurzfristige Beziehungen, Brüche
3. **Kategorisierung:** Dirigent/Vermittler/Kollege strukturiert das Netzwerk
4. **Archiv-Link:** Jede Zelle führt zu Quellen

### Schwächen

1. **Kein Zeitfilter:** Vergleiche zwischen Phasen sind mühsam
2. **Keine Sortierung:** Kann nicht nach "wichtigste Person" sortieren
3. **Statische Kategorien:** Kategorien sind fix, nicht filterbar
4. **Aggregationsverlust:** 5-Jahres-Intervalle = grobe Auflösung

### Notwendige Erweiterungen

#### 1. Zeitfilter (Priorität: HOCH)

```
┌─────────────────────────────────────────┐
│ Zeitraum auswählen:                     │
│ [x] 1945-1949                          │
│ [x] 1950-1954                          │
│ [ ] 1955-1959  ← ausgeblendet          │
│ [ ] 1960-1964                          │
│ [ ] 1965-1969                          │
└─────────────────────────────────────────┘
```

**Begründung:** Ermöglicht Phasenvergleiche (US 1.2). Ohne diesen Filter ist die Matrix für historische Fragestellungen limitiert.

#### 2. Kategoriefilter (Priorität: MITTEL)

```
Personenkategorie:
[x] Dirigent (5)
[x] Vermittler (3)
[ ] Kollege (8) ← ausgeblendet
```

**Hinweis:** Das HTML existiert bereits in der Sidebar (`#controls-matrix`), aber die Funktionalität ist nicht implementiert!

#### 3. Sortieroptionen (Priorität: MITTEL)

```
Sortieren nach:
( ) Alphabetisch
(•) Gesamtintensität (absteigend)
( ) Erste Begegnung (chronologisch)
( ) Letzte Begegnung (chronologisch)
```

**Begründung:** "Wer war insgesamt am wichtigsten?" ist eine häufige Forschungsfrage.

---

## Testplan

### Funktionale Tests

| Test | Erwartetes Ergebnis | Status |
|------|---------------------|--------|
| Zelle mit Intensität > 0 klicken | Document Panel mit Dokumenten | ✅ |
| Zelle mit Intensität = 0 klicken | Nichts passiert | ✅ |
| Hover auf Zelle | Tooltip: Person, Zeitraum, Intensität, Kontext | ✅ |
| Kategorien sind sortiert | Dirigent, Vermittler, Kollege in dieser Reihenfolge | ✅ |
| Separatoren sichtbar | Farbige Linien zwischen Kategorien | ✅ |

### Forschungs-Tests

| Test | Forschungsfrage | Erwartetes Ergebnis | Status |
|------|-----------------|---------------------|--------|
| Schlüsselperson finden | FF1 | Karajan in 1955-59 erkennbar | ✅ |
| Langfristige Beziehung finden | FF1 | Werba durchgehend sichtbar | ✅ |
| Vermittler identifizieren | FF3 | Kategorie "Vermittler" lesbar | ✅ |
| Netzwerk-Bruch erkennen | FF1 | Leere Zellen nach intensiven Phasen | ✅ |
| Phasen vergleichen | FF1 | ❌ Nicht möglich ohne Zeitfilter | ❌ |

---

## Verbesserungsvorschläge mit Begründung

| Priorität | Feature | Forschungsnutzen | Implementierungsaufwand |
|-----------|---------|------------------|------------------------|
| **HOCH** | Zeitfilter | Phasenvergleiche (US 1.2) | Mittel |
| **HOCH** | Kategoriefilter aktivieren | Fokussierte Analyse | Gering (HTML existiert) |
| MITTEL | Sortierung | "Wichtigste Person" finden | Gering |
| MITTEL | Export als CSV | Statistische Auswertung | Gering |
| NIEDRIG | Jahres-Auflösung (statt 5 Jahre) | Feinere Analyse | Hoch (mehr Daten nötig) |

---

## Nächste Implementierungsschritte

### Schritt 1: Kategoriefilter aktivieren

```javascript
// In setupEventListeners() hinzufügen:
const matrixCategoryFilter = document.querySelector('#controls-matrix .filter-group__options');
if (matrixCategoryFilter) {
  matrixCategoryFilter.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', () => {
      const activeCategories = [...matrixCategoryFilter.querySelectorAll('input:checked')]
        .map(i => i.value);
      renderMatrix(container, activeCategories);
    });
  });
}
```

### Schritt 2: Zeitfilter hinzufügen

1. HTML in Sidebar erweitern (Checkboxen für Zeiträume)
2. Filter-State in partitur.js verwalten
3. `matrixData` vor Rendering filtern

### Schritt 3: Export-Button

```javascript
function exportMatrixCSV() {
  const rows = [['Person', 'Kategorie', ...zeitraeume]];
  personen.forEach(p => {
    const row = [p.name, p.kategorie];
    zeitraeume.forEach(z => {
      const b = p.begegnungen.find(b => b.zeitraum === z);
      row.push(b ? b.intensitaet : 0);
    });
    rows.push(row);
  });
  downloadCSV(rows, 'malaniuk-netzwerk-matrix.csv');
}
```

---

## Offene Fragen für Forscher*innen

1. Sind 5-Jahres-Intervalle die richtige Granularität? Oder wären 10-Jahres-Intervalle übersichtlicher?
2. Sollte die "Intensität" gewichtet werden? (z.B. Vertrag = 3, Brief = 1)
3. Fehlen wichtige Personenkategorien? (z.B. "Familie", "Kritiker", "Impresario")

---

*Version 2.0 – 2026-01-18*
*Erweitert um User Stories, kritische Evaluation und Implementierungsplan*
