# M³GIM Design-Entscheidungen

*Arbeitsversion – Systematische Bearbeitung der offenen Fragen aus DESIGN.md*

---

## Methodik

Dieses Dokument bearbeitet die 13 offenen Fragen aus dem Design-Dokument. Für jede Frage:
1. **Position A:** Empfohlene Lösung mit Begründung
2. **Position B:** Gegenposition oder Alternative
3. **Synthese:** Konkreter Handlungsvorschlag

---

## Archivfachliche Fragen

### Frage 2: Provenienz-Darstellung

> Wie visualisieren wir Entstehungskontext, ohne zu überladen?

**Position A: Minimale Integration in Detailansicht**

Provenienz wird nur in der Detailansicht angezeigt, nicht in Listen oder Visualisierungen. Ein kompakter Block unter den Kernmetadaten:

```
PROVENIENZ
Übernommen: 2015 vom Nachlass der Künstlerin
Vorbesitz: Privatbesitz Ira Malaniuk, Zürich
Bearbeitung: Erschließung 2026 (Projekt M³GIM)
```

*Begründung:* Provenienz ist für Quellenkritik wichtig, aber nicht für die tägliche Recherche. Die meisten Nutzenden interessiert "Was steht drin?", nicht "Wie kam es ins Archiv?".

**Position B: Provenienz als Filter-Dimension**

Provenienz könnte als Facette in der Objektsuche angeboten werden: "Zeige nur Objekte aus Privatbesitz" vs. "Zeige nur Objekte aus institutioneller Überlieferung".

*Begründung:* Für FF4 (Mobilitätsformen) könnte relevant sein, ob Dokumente aus der Grazer Zeit oder der Zürcher Zeit stammen.

**Synthese:**

→ **Phase 2:** Provenienz-Block in Detailansicht implementieren (minimaler Aufwand)
→ **Phase 4 (optional):** Falls Daten vorhanden, Provenienz als Filter evaluieren

---

### Frage 3: Verknüpfungstypen visuell unterscheiden

> Unterscheiden wir visuell zwischen agent/subject/location? → Vorschlag: Icons (👤/🏛️/📍/🎭/📅)

**Position A: Icons verwenden**

| Typ | Icon | Farbe |
|-----|------|-------|
| person | 👤 | Blau |
| institution | 🏛️ | Grau |
| ort | 📍 | Grün |
| werk | 🎭 | Orange |
| ereignis | 📅 | Violett |

*Begründung:* Icons sind international verständlich, sparen Platz, und ermöglichen schnelles Scannen der Verknüpfungsliste.

**Position B: Textuelle Kategorien ohne Icons**

Verknüpfungen werden gruppiert dargestellt:

```
PERSONEN
- Ira Malaniuk (Vertragspartnerin)
- Rudolf Hartmann (Unterzeichner)

ORTE
- München (Vertragsort)
- Zürich (Wohnort)
```

*Begründung:* Gruppierung ist übersichtlicher als eine gemischte Liste mit Icons. Barrierefreier, da Icons von Screenreadern oft ignoriert werden.

**Synthese:**

→ **Kombinieren:** Gruppierte Darstellung MIT Icons als visuellem Marker
→ **Accessibility:** Icons mit aria-label versehen
→ **Implementierung:** Gruppierung nach Typ, Icon vor jedem Eintrag

```
👤 PERSONEN
   Ira Malaniuk (Vertragspartnerin)
   Rudolf Hartmann (Unterzeichner)

📍 ORTE
   München (Vertragsort)
   Zürich (Wohnort)
```

---

## Visualisierungsfragen

### Frage 4: Netzwerk-Skalierung

> Bei 50+ Personen wird es unübersichtlich. Clustering? Filter-Defaults?

**Position A: Progressive Disclosure mit Schwellenwert**

Default-Ansicht zeigt nur Personen mit **≥3 Dokumenten-Verbindungen** zu Malaniuk. Das reduziert die initiale Ansicht auf ~15-20 Kernpersonen (Karajan, Böhm, Werba, etc.). Nutzer können den Schwellenwert per Slider anpassen.

```
Verbindungsstärke: [■■■□□□□□□□] 3+ Dokumente
                   ↓
Zeige 18 von 52 Personen
```

*Begründung:* Die wichtigsten Beziehungen werden sofort sichtbar. "Einmal erwähnt" ist selten forschungsrelevant.

**Position B: Semantisches Clustering**

Personen werden nach Beziehungstyp gruppiert:
- Cluster "Dirigenten" (Karajan, Böhm, Knappertsbusch)
- Cluster "Kollegen" (Ludwig, Jurinac, Berry)
- Cluster "Agenten/Vermittler" (Taubman, etc.)

*Begründung:* Ermöglicht Einsichten in die Struktur des Netzwerks, nicht nur die Stärke einzelner Verbindungen.

**Synthese:**

→ **Phase 3:** Schwellenwert-Filter implementieren (technisch einfacher)
→ **Phase 4:** Wenn Rollendaten ausreichend vorhanden, Clustering als Option anbieten
→ **Konkret:** Default = 3+ Verbindungen, Slider von 1-10

---

### Frage 5: Timeline-Granularität

> Tage vs. Monate vs. Jahre? Aggregation bei Zoom?

**Position A: Adaptive Granularität (Semantic Zoom)**

Die Granularität passt sich dem Zoom-Level an:

| Zoom-Level | Zeitspanne sichtbar | Granularität | Darstellung |
|------------|---------------------|--------------|-------------|
| Übersicht | 1919-1998 (79 Jahre) | Jahre | Balken pro Jahr |
| Mittlere Ansicht | 1945-1960 (15 Jahre) | Monate | Punkte pro Monat |
| Detail | 1958 (1 Jahr) | Tage | Einzelne Dokumente |

*Begründung:* Verhindert Überladung auf hoher Ebene, ermöglicht Präzision im Detail. Nutzer navigieren intuitiv durch Zoom.

**Position B: Fixe Jahres-Ansicht mit Drill-Down**

Timeline zeigt immer Jahre. Klick auf ein Jahr öffnet Modal mit Monats-/Tagesansicht.

*Begründung:* Einfacher zu implementieren, konsistente Darstellung, keine komplexe Zoom-Logik.

**Synthese:**

→ **Phase 3:** Starte mit fixer Jahres-Ansicht + Drill-Down Modal
→ **Phase 4:** Wenn Zeit/Budget, Semantic Zoom nachrüsten
→ **Begründung:** Jahres-Übersicht deckt 80% der Anwendungsfälle ab (FF2: ästhetische Entwicklung über Karriere)

---

### Frage 6: Karten-Basemap

> Historische Karte oder moderne? Einfach (Leaflet) oder aufwändig?

**Position A: Moderne Karte (Leaflet + OpenStreetMap)**

Schlichte, moderne Basemap mit neutralem Stil (z.B. CartoDB Positron). Fokus liegt auf den Datenpunkten, nicht auf der Karte selbst.

*Begründung:*
- Performant und offline-fähig (Tiles können gecached werden)
- Grenzen von 1945-1970 sind komplex (Nachkriegszeit, geteiltes Deutschland)
- Orte existieren heute noch, nur Grenzen haben sich geändert

**Position B: Historische Karte als Layer**

Zeitgenössische Karte (z.B. aus David Rumsey Collection) als optionaler Layer.

*Begründung:* Für FF4 (Mobilitätsformen, erzwungene Migration) könnte der historische Kontext wichtig sein – Lemberg lag 1944 nicht in der "Ukraine", sondern war Teil wechselnder Herrschaftsgebiete.

**Synthese:**

→ **Phase 3:** Leaflet mit moderner Basemap (CartoDB Positron)
→ **Phase 4 (optional):** Historischer Layer als Forschungsoption, wenn Bedarf vom KUG-Team bestätigt
→ **Begründung:** Moderne Karte ist neutral und lenkt nicht vom eigentlichen Inhalt ab

---

### Frage 7: Mobilitätsform-Encoding

> Ist Farbe das richtige visuelle Attribut, oder besser Linienart/Icons?

**Position A: Farbe als primäres Encoding**

| Mobilitätsform | Farbe | Hex |
|----------------|-------|-----|
| Erzwungen | Rot | #D32F2F |
| Geografisch | Grün | #2E7D32 |
| Bildung | Gelb | #ED6C02 |
| Lebensstil | Violett | #7B1FA2 |
| National | Blau | #1976D2 |

*Begründung:* Farbe ist das stärkste präattentive Merkmal – Unterschiede werden sofort wahrgenommen. Bei 5 Kategorien noch gut unterscheidbar.

**Position B: Linienart + Farbe kombiniert**

Zusätzlich zur Farbe:
- Erzwungen: gestrichelte Linie (Bruch)
- Geografisch: durchgezogene Linie (Kontinuität)
- Bildung: gepunktete Linie (Entwicklung)

*Begründung:* Redundantes Encoding hilft bei Farbenblindheit (~8% der männlichen Bevölkerung).

**Synthese:**

→ **Farbe als primäres Merkmal** (visuell dominant)
→ **Linienart als sekundäres Merkmal** (Accessibility)
→ **Tooltips** zeigen Mobilitätsform als Text
→ **Legende** kombiniert alle drei Encodings

---

## Forschungsfragen

### Frage 9: Export-Formate

> Welche Datenformate braucht die Fachcommunity (CSV, RDF, Gephi)?

**Position A: CSV als universelles Format**

CSV-Export für gefilterte Ergebnisse. Spaltenstruktur entspricht der Objekttabelle + aufgelöste Verknüpfungen.

*Begründung:* CSV ist das "kleinste gemeinsame Vielfache" – öffnet in Excel, importierbar in jede Datenbank, maschinenlesbar.

**Position B: Spezialisierte Formate für Visualisierungstools**

- **Gephi (GEXF):** Für Netzwerkanalyse
- **Palladio (JSON):** Für Digital-Humanities-Workflows
- **GeoJSON:** Für Karten-Weiterverarbeitung

*Begründung:* Die Fachcommunity arbeitet mit spezialisierten Tools. Ein CSV-Export erfordert manuelle Transformation.

**Synthese:**

→ **Phase 2:** CSV-Export für Objektliste (einfach, universell)
→ **Phase 3:** JSON-LD ist bereits vorhanden (RDF-kompatibel)
→ **Phase 4:** Gephi-Export (GEXF) für Netzwerk, wenn Forschungsbedarf bestätigt
→ **Priorität:** CSV > JSON-LD > GEXF > GeoJSON

---

### Frage 10: Mobilitätsform-Erfassung (bereits gelöst)

> Wie wird die Mobilitätsform bei Orts-Verknüpfungen erfasst?

✓ **Gelöst in Datenmodell v2.2:** Präfix-Notation in Anmerkungsfeld `[mobilität:erzwungen]`

→ Workshop am 23.01. klärt Erfassungsworkflow

---

## Technische Fragen

### Frage 11: Offline-Fähigkeit

> Bleibt das Prinzip "alles eingebettet" bei größeren Visualisierungen?

**Position A: Beibehaltung des Offline-First-Prinzips**

Alle Daten (JSON-LD, ~500KB) werden beim Laden eingebettet. Visualisierungen arbeiten clientseitig auf diesen Daten.

*Begründung:*
- Keine CORS-Probleme
- Funktioniert auch ohne Internetverbindung
- GitHub Pages hat keine Serverlogik
- 500KB sind bei modernen Verbindungen in <1s geladen

**Position B: Lazy Loading für Visualisierungen**

Grunddaten eingebettet, aber Visualisierungsdaten (z.B. Netzwerk-Edges, Koordinaten) werden bei Bedarf nachgeladen.

*Begründung:* Reduziert initiale Ladezeit. Nutzer, die nur die Objektsuche nutzen, laden keine Netzwerkdaten.

**Synthese:**

→ **Offline-First beibehalten** für Kernfunktionen (Suche, Filter, Detailansicht)
→ **Lazy Loading** für Visualisierungen als Option, aber nicht notwendig bei 436 Records
→ **Entscheidung:** Bei aktuellem Datenvolumen kein Handlungsbedarf

---

### Frage 12: Performance bei 4000 Records

> 436 Records sind unproblematisch. Was bei 4000?

**Position A: Kein Problem mit modernem JavaScript**

Vanilla JS mit modernen APIs (Array.filter, Map, Set) verarbeitet 4000 Records in <50ms. Die Rendering-Grenze liegt bei ~10.000 DOM-Elementen gleichzeitig.

*Begründung:*
- Filter/Suche: O(n) ist bei 4000 kein Problem
- Rendering: Pagination oder Virtual Scrolling erst ab ~1000 gleichzeitig sichtbaren Karten nötig
- Visualisierungen: D3.js handhabt 4000 Datenpunkte problemlos

**Position B: Präventive Optimierung**

- Pagination einführen (20-50 Ergebnisse pro Seite)
- Such-Index mit Fuse.js oder Lunr.js vorberechnen
- Web Workers für Filterung

*Begründung:* Präventiv optimieren ist einfacher als reaktiv refactoren.

**Synthese:**

→ **Aktuell:** Pagination ist bereits implementiert (MVP)
→ **Bei Bedarf:** Virtual Scrolling nachziehen (Intersection Observer API)
→ **Kein** präventiver Such-Index nötig – Volltextsuche über 4000 Records ist in <100ms machbar
→ **Entscheidung:** Erst optimieren, wenn messbare Probleme auftreten

---

### Frage 13: D3.js vs. Observable Plot

> Welche Bibliothek für Timeline/Netzwerk?

**Position A: D3.js für alles**

D3.js ist der De-facto-Standard für datengetriebene Visualisierungen. Volle Kontrolle über jeden Aspekt.

| Aspekt | D3.js |
|--------|-------|
| Netzwerk | Force-directed Layout (d3-force) |
| Timeline | Scales + Axes (d3-scale, d3-axis) |
| Karte | Integration mit Leaflet möglich |
| Lernkurve | Steil, aber gut dokumentiert |
| Bundle-Size | ~80KB minified |

*Begründung:* Ein Framework für alle Visualisierungen bedeutet konsistentes Code-Design und weniger Abhängigkeiten.

**Position B: Observable Plot für Timeline, D3.js für Netzwerk**

Observable Plot ist eine höhere Abstraktion über D3, optimiert für statistische Visualisierungen (Balken, Linien, Zeitreihen).

| Aspekt | Observable Plot |
|--------|-----------------|
| Timeline | Sehr einfach (Plot.plot mit marks) |
| Netzwerk | Nicht geeignet |
| Lernkurve | Flach |
| Bundle-Size | ~50KB |

*Begründung:* Für die Timeline brauchen wir keine D3-Flexibilität. Observable Plot produziert in 10 Zeilen, was D3 in 100 macht.

**Synthese:**

→ **D3.js für Netzwerk** (unverzichtbar für Force-Layout)
→ **Observable Plot für Timeline** (schnellere Implementierung, wartbarer Code)
→ **Leaflet für Karte** (Spezialbibliothek, besser als D3-Geo)
→ **Begründung:** Pragmatismus – die richtige Bibliothek für den Job

---

## Zusammenfassung der Entscheidungen

| Frage | Entscheidung | Phase |
|-------|--------------|-------|
| Provenienz | Minimale Darstellung in Detailansicht | 2 |
| Verknüpfungs-Icons | Gruppierung + Icons mit aria-label | 2 |
| Netzwerk-Skalierung | Schwellenwert-Filter (Default: 3+ Verbindungen) | 3 |
| Timeline-Granularität | Fixe Jahres-Ansicht + Drill-Down Modal | 3 |
| Karten-Basemap | Leaflet + CartoDB Positron (modern, neutral) | 3 |
| Mobilitätsform-Encoding | Farbe primär + Linienart sekundär | 3 |
| Export-Formate | CSV → JSON-LD → GEXF (nach Priorität) | 2-4 |
| Offline-Fähigkeit | Beibehalten, kein Handlungsbedarf | - |
| Performance 4000 | Erst bei Bedarf optimieren | - |
| Visualisierungs-Bibliotheken | D3.js (Netzwerk) + Observable Plot (Timeline) + Leaflet (Karte) | 3 |

---

*Erstellt: 2026-01-18*
