# M³GIM Design-Entscheidungen

Dokumentation der wichtigsten Architektur- und Design-Entscheidungen im Projekt.

## 1. Vanilla JavaScript statt Framework

**Entscheidung:** Kein React/Vue/Angular, nur Vanilla JS + D3.js

**Begründung:**
- Statisches Hosting auf GitHub Pages
- Keine Build-Toolchain nötig
- Langlebigkeit: Keine Framework-Updates
- Lernkurve für Projektteam minimiert

**Trade-off:** Mehr Boilerplate, aber volle Kontrolle.

---

## 2. RiC-O für JSON-LD

**Entscheidung:** Records in Contexts Ontology (RiC-O) 1.1

**Begründung:**
- Archivstandard der ICA
- SPARQL-fähig
- Wikidata-kompatibel
- Langzeitarchivierung-freundlich

**Mapping:**
| M³GIM | RiC-O |
|-------|-------|
| archivsignatur | rico:identifier |
| titel | rico:title |
| entstehungsdatum | rico:date |
| dokumenttyp | rico:hasDocumentaryFormType |

---

## 3. Google Sheets als Erfassungstool

**Entscheidung:** Google Sheets statt eigenem Erfassungssystem

**Begründung:**
- Projektteam bereits vertraut
- Kollaboratives Editieren
- Dropdown-Validierung nativ
- Export zu CSV trivial

**Trade-off:** Keine referentielle Integrität, manueller Export-Workflow.

---

## 4. Analyse als Default-View

**Entscheidung:** Beim Öffnen der Seite wird "Analyse" angezeigt, nicht "Archiv"

**Begründung:**
- Visualisierungen sind der wissenschaftliche Mehrwert
- Archiv ist "nur" Katalog (gibt es überall)
- Forschungsfragen werden durch Visualisierungen beantwortet

---

## 5. Vier Visualisierungen (nicht drei, nicht fünf)

**Entscheidung:** Partitur, Matrix, Kosmos, Karrierefluss

**Begründung:**
- Jede Visualisierung adressiert andere Forschungsfragen
- Komplementär, nicht redundant:
  - Partitur: Zeit
  - Matrix: Netzwerk
  - Kosmos: Repertoire
  - Karrierefluss: Korrelationen

**Kritik an Karrierefluss:** Könnte durch Karte ersetzt werden (siehe VIZ-4-Karrierefluss.md).

---

## 6. Scroll-Morphing Kosmos

**Entscheidung:** Kosmos entfaltet sich beim Scrollen von radial zu Timeline

**Begründung:**
- Innovativer Ansatz: Exploration durch Scrolling
- Zeigt Zeitdimension im Kosmos (vorher fehlend)
- Natürliche Interaktion (Scrollen ist intuitiv)

**Implementierung:**
- Dual-Positions-System (radial + timeline)
- d3.easeCubicInOut für Morphing
- Sticky Visualization während Scroll

---

## 7. Mobilitätsform als Annotation

**Entscheidung:** Mobilitätsform wird in Anmerkungsfeld mit Präfix `[mobilität:]` erfasst

**Begründung:**
- Kein Schema-Change nötig
- Flexibel erweiterbar
- Rückwärtskompatibel

**Format:** `[mobilität:erzwungen] Flucht 1944`

---

## 8. Wikidata als primäre Normdatenquelle

**Entscheidung:** Wikidata Q-IDs, nicht GND

**Begründung:**
- Breitere Abdeckung (international)
- Einheitliche URIs
- SPARQL-Endpoint
- Verlinkung zu GND/VIAF automatisch

**Workflow:** Reconciliation nachträglich via OpenRefine.

---

## 9. Horizontal Toolbar für Analyse

**Entscheidung:** Toolbar horizontal über volle Breite, keine Sidebar

**Begründung:**
- Visualisierung braucht maximale Breite
- Toolbar-Elemente sind kompakt (Chips)
- Konsistent mit modernen Data-Dashboards

**Implementierung:** CSS Grid mit `grid-column: 1 / -1`.

---

## 10. Document Panel statt Modal

**Entscheidung:** Klick auf Visualisierungs-Element öffnet Panel (rechts), nicht Modal

**Begründung:**
- Visualisierung bleibt sichtbar
- Kontext geht nicht verloren
- Schnelleres Durchblättern mehrerer Dokumente

**Modal nur für:** Vollständige Archivansicht mit allen Metadaten.

---

## 11. Synthetische Daten für Prototyp

**Entscheidung:** Synthetische Testdaten bis zur vollen Erfassung

**Begründung:**
- Entwicklung nicht durch Erfassung blockiert
- Visualisierungen können getestet werden
- Struktur entspricht echten Daten

**Markierung:** `"_meta": { "synthetic": true }`

---

## 12. Lebensphasen manuell definiert

**Entscheidung:** Lebensphasen (Kindheit, Studium, Aufstieg, etc.) sind fix

**Begründung:**
- Biografische Periodisierung ist Forschungsleistung
- Nicht aus Daten ableitbar
- 7 Phasen entsprechen Malaniuks Vita

**Phasen:**
- LP1: Kindheit (1919-1937)
- LP2: Studium (1937-1944)
- LP3: Flucht (1944-1945)
- LP4: Erste Engagements (1945-1950)
- LP5: Aufstieg (1950-1955)
- LP6: Höhepunkt (1955-1970)
- LP7: Spätphase (1970-2009)

---

## 13. Farben nach Komponisten (nicht nach Werken)

**Entscheidung:** Farbcodierung in Kosmos und Partitur nach Komponist

**Begründung:**
- Komponisten sind das ästhetische Ordnungsprinzip
- Werke sind zu granular (zu viele Farben)
- Forschungsfrage FF2 fragt nach Komponisten-Schwerpunkten

**Palette:** Wagner=Rot, Verdi=Grün, Strauss=Violett, Gluck=Gold

---

## 14. 5-Jahres-Intervalle in Matrix

**Entscheidung:** Matrix zeigt 5-Jahres-Perioden, nicht einzelne Jahre

**Begründung:**
- Jährliche Auflösung zu granular (zu viele Spalten)
- 5 Jahre = sinnvolle biografische Einheit
- Karrierephasen sind oft ~5 Jahre

**Alternative:** Jahres-Intervalle für Detailanalyse (nicht implementiert).

---

## Verworfene Optionen

### Leaflet-Karte statt Karrierefluss
- **Überlegung:** Geografische Mobilität räumlich zeigen
- **Status:** Aufgeschoben, Karrierefluss bleibt vorerst
- **Grund:** Zeigt kategoriale Zusammenhänge, die Karte nicht zeigt

### Force-Graph für Netzwerk
- **Überlegung:** D3-Force statt Heatmap
- **Status:** Verworfen
- **Grund:** Heatmap zeigt Zeit-Dimension besser

### Timeline mit Observable Plot
- **Überlegung:** Observable Plot statt D3 für Partitur
- **Status:** Verworfen
- **Grund:** D3 bietet mehr Kontrolle für komplexe Interaktionen

---

*Version 1.0 – 2026-01-18*
*Konsolidiert aus DESIGN-Entscheidungen.md, PROTOTYPE_LEARNINGS.md*
