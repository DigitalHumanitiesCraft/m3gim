# Visualisierungen & Views

> 2 D3.js-Visualisierungen (Matrix, Kosmos) + 2 datengetriebene Views (Archiv, Indizes), operieren auf vorberechneten View-JSONs.

---

## Übersicht

| Tab | Typ | View-JSON | Forschungsfragen |
|---|---|---|---|
| Archiv (Bestand + Chronik) | Datengetriebene View | archiv.json | FF1, FF4 |
| Indizes | Datengetriebene View | indizes.json | FF1, FF3 |
| Begegnungs-Matrix | D3.js Heatmap | matrix.json | FF1, FF3 |
| Rollen-Kosmos | D3.js Force-Graph | kosmos.json | FF2 |

---

## Archiv (Bestand + Chronik)

Zwei umschaltbare Perspektiven auf denselben Datenbestand:

**Bestand (Tektonik):** Hierarchische Darstellung Fonds → Konvolute → Objekte. Konvolute sind aufklappbar. Jeder Record kann inline expandiert werden (shared `buildInlineDetail()`-Komponente). Suchleiste, Dokumenttyp-Filter, Sortierung (Signatur/Datum/Titel).

**Chronik (Mobilität):** Zeitlich-geografische Gruppierung nach 5-Jahres-Perioden → Orte. Karriere-Notizen pro Periode (z.B. "1945-1949: Graz / Nachkriegszeit"). Records inline expandierbar.

Ersetzt die ursprüngliche Mobilitäts-Partitur (6-Spuren-Zeitachse aus Iteration 1, zu komplex für den aktuellen Datenstand).

---

## Indizes (4-Grid)

Vier durchsuchbare Index-Karten: Personen, Organisationen, Orte, Werke. Jeder Index mit Suchfeld und Kategorie-Filter. Detail-Panel (Sidebar) zeigt verknüpfte Archiv-Records.

Ersetzt den Karrierefluss/Sankey aus Iteration 1.

---

## Begegnungs-Matrix (Netzwerk)

Heatmap Person × 5-Jahres-Periode. Intensität = (Briefe × 3) + (Programme/Plakate × 2) + (Sonstige × 1). 6-stufige Farbskala. Personen sortiert nach Kategorien.

**Kritische Lücke:** Zeitfilter für Phasenvergleiche fehlt.

---

## Rollen-Kosmos (Repertoire)

Radiale Force-Graph. Zentrum: Malaniuk (50px). Mittlere Bahn: Komponisten. Äußere Bahn: Rollen. Click-to-Focus.

**Kritische Datenanforderung:** Rollenname im Anmerkungsfeld der Werk-Verknüpfung.

---

## Nicht umgesetzte Konzepte (Iteration 1)

| Konzept | Status | Begründung |
|---|---|---|
| Mobilitäts-Partitur (6-Spuren-Zeitachse) | Ersetzt durch Archiv-Chronik | Zu komplex, Daten unzureichend für 6 Spuren |
| Karrierefluss/Sankey (Phase → Repertoire → Ort) | Ersetzt durch Indizes | Redundant mit Partitur und Kosmos |
| Leaflet-Karte (CartoDB Positron) | Verschoben | Deferred auf spätere Iteration |

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
| FF2 Genre | 90% | Kosmos bildet Repertoire ab |
| FF3 Wissenstransfer | 60% | Vermittler identifizierbar, Inhalte nicht kodiert |
| FF4 Mobilität | 85% | Kartendarstellung fehlt, Chronik-View als Zwischenlösung |

---

Siehe auch: [→ Design-System](05-design-system.md) · [→ Architektur](04-architektur.md) · [→ Entscheidungen](07-entscheidungen.md)
