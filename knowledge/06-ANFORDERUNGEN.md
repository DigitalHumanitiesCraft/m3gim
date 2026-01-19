# M³GIM Anforderungen und Implementierungsplan

## Übersicht

Dieses Dokument beschreibt den aktuellen Implementierungsstand, offene Anforderungen und den Implementierungsplan für das M³GIM-Projekt.

**Stand:** 2026-01-19 (Aktualisiert nach Implementierung aller kritischen Features)

---

## 1. Aktueller Implementierungsstand

### 1.1 Archiv-Bereich (MVP abgeschlossen)

| Feature | Status | Datei |
|---------|--------|-------|
| Katalogansicht mit Cards | ✅ | [app.js](../docs/js/app.js) |
| Suche in Titeln/Beschreibungen | ✅ | app.js:543-553 |
| Tektonik-Navigation | ✅ | app.js:216-362 |
| Filter: Dokumenttyp | ✅ | app.js:441-466 |
| Filter: Bestand (Objekte/Fotos) | ✅ | app.js:525-527 |
| Filter: Zugänglichkeit | ✅ | app.js:530-531 |
| Detail-Modal mit Metadaten | ✅ | app.js:620-829 |
| Verknüpfungen im Modal | ✅ | app.js:728-776 |
| JSON-LD Export-Ansicht | ✅ | app.js:916-929 |

### 1.2 Analyse-Bereich (Produktionsbereit)

| Feature | Status | Datei |
|---------|--------|-------|
| Toolbar mit Viz-Selector | ✅ | [index.html](../docs/index.html):121-200 |
| Partitur: 6-Spur-Layout | ✅ | [partitur.js](../docs/js/partitur.js) |
| Partitur: Zoom & Navigation | ✅ | partitur.js |
| Partitur: Tooltips | ✅ | partitur.js |
| Matrix: Vollständig | ✅ | [matrix.js](../docs/js/visualizations/matrix.js) |
| Kosmos: Vollständig | ✅ | [kosmos.js](../docs/js/visualizations/kosmos.js) |
| Karrierefluss: Vollständig | ✅ | [sankey.js](../docs/js/visualizations/sankey.js) |
| Document Panel | ✅ | Integriert in alle Visualisierungen |
| Export (SVG/PNG/CSV) | ✅ | [export.js](../docs/js/utils/export.js) |

### 1.3 Daten

| Komponente | Status | Datei |
|------------|--------|-------|
| JSON-LD Export (436 Records) | ✅ | [m3gim.jsonld](../data/export/m3gim.jsonld) |
| RiC-O 1.1 Konformität | ✅ | Validiert |
| View-spezifische Aggregationen | ✅ | [data/views/](../data/views/) |
| Partitur-Daten | ✅ | [partitur.json](../docs/data/partitur.json) (7.5KB) |
| Matrix-Daten | ✅ | [matrix.json](../docs/data/matrix.json) (3.1KB) |
| Kosmos-Daten | ✅ | [kosmos.json](../docs/data/kosmos.json) (4.9KB) |
| Sankey-Daten | ✅ | [sankey.json](../docs/data/sankey.json) (2.8KB) |

---

## 2. Implementierte Anforderungen (2026-01-19)

### 2.1 Kritisch (Alle abgeschlossen)

| ID | Anforderung | Status | Implementiert in |
|----|-------------|--------|------------------|
| **REQ-01** | Echte Daten in Visualisierungen | ✅ | build-views.py, data/views/*.json |
| **REQ-02** | Document Panel implementieren | ✅ | matrix.js, kosmos.js (showDocumentPanel) |
| **REQ-03** | Matrix vollständig implementieren | ✅ | visualizations/matrix.js |
| **REQ-04** | Kosmos vollständig implementieren | ✅ | visualizations/kosmos.js |

### 2.2 Hoch (Teilweise implementiert)

| ID | Anforderung | Status | Implementiert in |
|----|-------------|--------|------------------|
| **REQ-05** | Zeitfilter für Matrix | ⏸️ | Nicht implementiert (bewusst ausgelassen) |
| **REQ-06** | Kategoriefilter für Matrix aktivieren | ⏸️ | Nicht implementiert (bewusst ausgelassen) |
| **REQ-07** | SVG/PNG Export | ✅ | utils/export.js (exportSVG, exportSVGasPNG) |
| **REQ-08** | CSV Export für Matrix | ✅ | utils/export.js (exportMatrixAsCSV) |
| **REQ-09** | Karrierefluss vollständig | ✅ | visualizations/sankey.js |

### 2.3 Mittel (Usability) - Bewusst nicht implementiert

Per Benutzeranforderung wurden folgende Features bewusst NICHT implementiert:

| ID | Anforderung | Status | Begründung |
|----|-------------|--------|------------|
| **REQ-10** | Legende in Partitur | ⏸️ | Tooltips ausreichend |
| **REQ-11** | Responsive Design | ✅ | Basis-Responsiveness vorhanden |
| **REQ-12** | Keyboard Navigation | ⏸️ | Explizit ausgeschlossen |
| **REQ-13** | Cross-Visualization Linking | ⏸️ | Für später vorgesehen |

### 2.4 Niedrig (Nice-to-have) - Nicht implementiert

Diese Features wurden bewusst NICHT implementiert:

| ID | Anforderung | Status | Begründung |
|----|-------------|--------|------------|
| **REQ-14** | Geografische Karte | ⏸️ | Nicht im Scope |
| **REQ-15** | Animierte Zeitreise | ⏸️ | Nicht im Scope |
| **REQ-16** | Annotation-System | ⏸️ | Nicht im Scope |

---

## 3. User Stories

### US-01: Archivrecherche (Implementiert)

**Als** Forscherin
**möchte ich** den Nachlass durchsuchen und filtern
**damit ich** relevante Quellen für meine Forschungsfrage finde.

**Akzeptanzkriterien:**
- [x] Volltextsuche in Titeln
- [x] Filter nach Dokumenttyp
- [x] Filter nach Bestandsgruppe
- [x] Tektonik-Navigation
- [x] Detail-Ansicht mit allen Metadaten

---

### US-02: Repertoire-Entwicklung analysieren (Teilweise implementiert)

**Als** Opernforscherin
**möchte ich** sehen, wie sich Malaniuks Repertoire über die Zeit entwickelte
**damit ich** ihre künstlerische Entwicklung verstehe (FF2).

**Akzeptanzkriterien:**
- [x] Partitur zeigt Repertoire-Spur
- [x] Farbcodierung nach Komponisten
- [ ] Klick auf Rolle → Document Panel mit Archivalien
- [ ] Kosmos zeigt Repertoire-Schwerpunkte
- [ ] Zeitspanne pro Rolle im Tooltip

**UI-Flow:**
```
1. Öffne Analyse → Partitur
2. Scrolle zur Repertoire-Spur
3. Erkenne: Amneris (grün) beginnt früh, Fricka (rot) später
4. Setze Fokus auf 1952 → Wagner-Explosion ab Bayreuth-Debüt
5. Klicke auf Fricka-Balken
6. Document Panel öffnet mit 12 Archivalien
7. Klicke auf "Szenenfoto Fricka" → Modal öffnet
```

---

### US-03: Schlüsselpersonen identifizieren (Nicht implementiert)

**Als** Netzwerkforscherin
**möchte ich** sehen, wer wann für Malaniuks Karriere wichtig war
**damit ich** Karrieremuster und Brüche verstehe (FF1, FF3).

**Akzeptanzkriterien:**
- [ ] Matrix zeigt Personen × Zeiträume
- [ ] Farbintensität = Begegnungshäufigkeit
- [ ] Kategoriesortierung (Dirigent, Vermittler, Kollege)
- [ ] Hover → Tooltip mit Details
- [ ] Klick → Document Panel
- [ ] Zeitfilter für Phasenvergleiche

**UI-Flow:**
```
1. Öffne Analyse → Matrix
2. Scanne nach Mustern: Dunkle Spalten = intensive Phasen
3. Identifiziere: Karajan 1955-1959 sehr dunkel
4. Klicke auf Zelle "Karajan, 1955-1959"
5. Document Panel: 3 Verträge, 2 Korrespondenzen
6. ERKENNTNIS: Karajan engagierte Malaniuk für Salzburg
```

---

### US-04: Mobilitätsformen klassifizieren (Teilweise implementiert)

**Als** Migrationsforscherin
**möchte ich** verschiedene Mobilitätsformen unterscheiden
**damit ich** Malaniuks Mobilität differenziert analysiere (FF4).

**Akzeptanzkriterien:**
- [x] Partitur zeigt Mobilitäts-Spur
- [x] Farbcodierung: Rot=erzwungen, Grün=geografisch, Violett=Lebensstil
- [ ] Klick auf Marker → Document Panel
- [ ] Karrierefluss zeigt Phase→Repertoire→Ort

**UI-Flow:**
```
1. Öffne Analyse → Partitur
2. Fokussiere Mobilitäts-Spur
3. 1944: Roter Kreis (E) = Flucht
4. 1945-1955: Grüne Kreise (G) = Karriere-Pendeln
5. 1970: Violetter Kreis (L) = Übersiedlung Zürich
6. Klicke auf roten Kreis
7. Document Panel: "Identitätsdokument Staatenlose"
```

---

### US-05: Vermittler identifizieren (Nicht implementiert)

**Als** Forscherin
**möchte ich** Brückenpersonen im Netzwerk erkennen
**damit ich** verstehe, wie Wissen transferiert wurde (FF3).

**Akzeptanzkriterien:**
- [ ] Matrix-Kategoriefilter auf "Vermittler"
- [ ] Durchgehende Zeilen = langfristige Beziehungen
- [ ] Klick auf Person → alle Dokumente

**UI-Flow:**
```
1. Öffne Matrix
2. Filtere auf "Vermittler"
3. Erik Werba durchgehend 1945-1969
4. Klicke auf Werba-Zeile
5. Document Panel: Liedbegleiter, Korrespondenzpartner, Konzertpartner
6. ERKENNTNIS: Werba war Kontinuitätsgarant
```

---

### US-06: Archivalien exportieren (Teilweise implementiert)

**Als** Forscherin
**möchte ich** Daten für externe Analyse exportieren
**damit ich** quantitative Auswertungen machen kann.

**Akzeptanzkriterien:**
- [x] JSON-LD im Modal anzeigbar
- [ ] CSV-Export der Matrix
- [ ] SVG-Export der Visualisierungen
- [ ] Auswahl exportieren (gefilterte Ergebnisse)

---

## 4. Implementierungsplan

### Phase 1: Daten-Pipeline (Priorität: Kritisch)

**Ziel:** Echte Daten statt synthetischer Testdaten

| Task | Beschreibung | Abhängigkeit |
|------|--------------|--------------|
| P1.1 | Build-Script für View-Aggregationen | - |
| P1.2 | partitur.json aus JSON-LD generieren | P1.1 |
| P1.3 | matrix.json aus JSON-LD generieren | P1.1 |
| P1.4 | kosmos.json aus JSON-LD generieren | P1.1 |
| P1.5 | karrierefluss.json aus JSON-LD generieren | P1.1 |
| P1.6 | GitHub Action für automatischen Build | P1.1-P1.5 |

**Details:** Siehe [07-PIPELINES.md](07-PIPELINES.md)

---

### Phase 2: Document Panel (Priorität: Kritisch)

**Ziel:** Jeder Klick auf Visualisierungselement führt zu Archivalien

| Task | Beschreibung | Abhängigkeit |
|------|--------------|--------------|
| P2.1 | Panel-Komponente erstellen (HTML/CSS) | - |
| P2.2 | Panel-State in partitur.js | P2.1 |
| P2.3 | Archivalien-Liste rendern | P2.2 |
| P2.4 | Klick auf Archivalie → Modal öffnen | P2.3 |
| P2.5 | Integration in Partitur | P2.4 |
| P2.6 | Integration in Matrix | P2.4, Phase 3 |
| P2.7 | Integration in Kosmos | P2.4, Phase 4 |

**Spezifikation:**
```
┌────────────────────────────────────────────────────────────┬──────────────┐
│                                                            │              │
│                    VISUALIZATION                           │   DOCUMENT   │
│                                                            │    PANEL     │
│                                                            │              │
│                                                            │  ┌────────┐  │
│                                                            │  │ Doc 1  │  │
│                                                            │  ├────────┤  │
│                                                            │  │ Doc 2  │  │
│                                                            │  ├────────┤  │
│                                                            │  │ Doc 3  │  │
│                                                            │  └────────┘  │
│                                                            │              │
└────────────────────────────────────────────────────────────┴──────────────┘
```

---

### Phase 3: Matrix-Visualisierung (Priorität: Hoch)

**Ziel:** Begegnungs-Matrix vollständig implementieren (FF1, FF3)

| Task | Beschreibung | Abhängigkeit |
|------|--------------|--------------|
| P3.1 | Heatmap-Grid mit D3 | Phase 1 |
| P3.2 | Intensitäts-Farbskala | P3.1 |
| P3.3 | Kategoriesortierung | P3.1 |
| P3.4 | Hover-Tooltips | P3.1 |
| P3.5 | Kategoriefilter aktivieren | P3.1 |
| P3.6 | Zeitfilter implementieren | P3.1 |
| P3.7 | Legende | P3.1 |
| P3.8 | Document Panel Integration | P3.1, Phase 2 |

---

### Phase 4: Kosmos-Visualisierung (Priorität: Hoch)

**Ziel:** Rollen-Kosmos vollständig implementieren (FF2)

| Task | Beschreibung | Abhängigkeit |
|------|--------------|--------------|
| P4.1 | Force-Layout mit D3 | Phase 1 |
| P4.2 | 3 Hierarchie-Ebenen (Zentrum, Komponist, Rolle) | P4.1 |
| P4.3 | Orbit-Guides | P4.1 |
| P4.4 | Click-to-Focus | P4.1 |
| P4.5 | Hover-Tooltips | P4.1 |
| P4.6 | Legende | P4.1 |
| P4.7 | Document Panel Integration | P4.1, Phase 2 |

---

### Phase 5: Karrierefluss-Visualisierung (Priorität: Mittel)

**Ziel:** Karrierefluss vollständig implementieren (FF2, FF4)

| Task | Beschreibung | Abhängigkeit |
|------|--------------|--------------|
| P5.1 | Sankey-Layout mit D3 | Phase 1 |
| P5.2 | 3-Spalten-Layout | P5.1 |
| P5.3 | Flow-Farbcodierung | P5.1 |
| P5.4 | Hover-Tooltips | P5.1 |
| P5.5 | Document Panel Integration | P5.1, Phase 2 |

---

### Phase 6: Export-Funktionen (Priorität: Mittel)

| Task | Beschreibung | Abhängigkeit |
|------|--------------|--------------|
| P6.1 | SVG-Export für alle Visualisierungen | Phasen 3-5 |
| P6.2 | PNG-Export (via Canvas) | P6.1 |
| P6.3 | CSV-Export für Matrix | Phase 3 |
| P6.4 | Gefilterte Archivalien exportieren | - |

---

## 5. Technische Schulden

| ID | Beschreibung | Priorität |
|----|--------------|-----------|
| TD-01 | Synthetische Daten entfernen | Hoch (nach Phase 1) |
| TD-02 | partitur.js aufteilen (matrix.js, kosmos.js, sankey.js) | Mittel |
| TD-03 | TypeScript Migration | Niedrig |
| TD-04 | Unit Tests für Aggregationslogik | Mittel |
| TD-05 | Responsive Breakpoints testen | Mittel |

---

## 6. Nicht-funktionale Anforderungen

### Performance
- Initiale Ladezeit < 3s
- Visualisierungs-Rendering < 500ms
- Smooth Scrolling (60fps)

### Accessibility
- WCAG 2.1 AA Konformität
- Keyboard-Navigation
- Screen Reader Support
- Farbkontrast ≥ 4.5:1

### Browser-Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 7. Glossar

| Begriff | Definition |
|---------|------------|
| Document Panel | Rechtes Seitenpanel, zeigt Archivalien zu einem Visualisierungselement |
| Fokus-Linie | Vertikale Linie in der Partitur, markiert ein Jahr |
| Tektonik | Hierarchische Gliederung des Archivbestands |
| View-Aggregation | Vorberechnete JSON-Daten für eine spezifische Visualisierung |

---

*Version 1.0 – 2026-01-18*
