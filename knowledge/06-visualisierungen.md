# Visualisierungen

> Vier D3.js-basierte Darstellungen, operieren auf vorberechneten View-JSONs.

---

## Übersicht

| Visualisierung | Dimension | View-JSON | Forschungsfragen |
|---|---|---|---|
| Mobilitäts-Partitur | Zeit | partitur.json | FF1–FF4 |
| Begegnungs-Matrix | Netzwerk | matrix.json | FF1, FF3 |
| Rollen-Kosmos | Repertoire | kosmos.json | FF2 |
| Karrierefluss | Korrelation | sankey.json | FF2, FF4 |

---

## Mobilitäts-Partitur (Zeit)

6 Spuren auf gemeinsamer Zeitachse:
1. **Lebensphasen** LP1–LP7 (1919–2009)
2. **Orte-Swimlane** (Wohnorte oberhalb, Aufführungsorte unterhalb)
3. **Mobilitäts-Spur** (5 Migrationsereignisse farbkodiert)
4. **Netzwerk-Aggregation** (Balkendiagramm pro 5-Jahres-Periode)
5. **Repertoire** (Rollen als Balken nach Komponist)
6. **Dokumente** (Überlieferungsdichte)

Fokus-Linie als zentrales Navigationsinstrument.

---

## Begegnungs-Matrix (Netzwerk)

Heatmap Person × 5-Jahres-Periode. Intensität = (Briefe × 3) + (Programme/Plakate × 2) + (Sonstige × 1). 6-stufige Farbskala. Personen sortiert nach Kategorien.

**Kritische Lücke:** Zeitfilter für Phasenvergleiche fehlt.

---

## Rollen-Kosmos (Repertoire)

Radiale Force-Graph. Zentrum: Malaniuk (50px). Mittlere Bahn: Komponisten. Äußere Bahn: Rollen. Click-to-Focus.

**Kritische Datenanforderung:** Rollenname im Anmerkungsfeld der Werk-Verknüpfung.

---

## Karrierefluss (Korrelation)

Alluvial/Sankey: Phase → Repertoire → Ort. Schwächste Visualisierung, redundant mit Partitur und Kosmos.

**Empfehlung Iteration 2:** Ablösung durch Leaflet-Karte (CartoDB Positron).

---

## Forschungshypothesen

- **Wagner-Hypothese:** Malaniuk als primäre Wagner-Sängerin wahrgenommen, aber Daten zeigen differenzierteres Bild (Verdi als Karrierebasis, Wagner erst ab Bayreuth 1952).
- **Bayreuth-Netzwerk:** Bayreuther Kontakte zogen Engagements an Wiener und Münchner Staatsoper nach sich.
- **Vermittler-Frage:** Erik Werba als durchgehender Mediator über 30 Jahre (1945–1969).

---

## Evaluation (Iteration 1)

| FF | Zielerreichung | Hauptlücke |
|---|---|---|
| FF1 Vernetzung | 70% | Zeitfilter in Matrix fehlt |
| FF2 Genre | 90% | Kosmos + Partitur bilden Repertoire ab |
| FF3 Wissenstransfer | 60% | Vermittler identifizierbar, Inhalte nicht kodiert |
| FF4 Mobilität | 85% | Kartendarstellung fehlt |

---

Siehe auch: [→ Design-System](05-design-system.md) · [→ Architektur](04-architektur.md) · [→ Entscheidungen](07-entscheidungen.md)
