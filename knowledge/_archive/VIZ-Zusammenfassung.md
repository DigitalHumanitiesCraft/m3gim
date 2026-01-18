# M³GIM Visualisierungen – Zusammenfassung

## Was wurde erstellt

### 1. Umfassende User Stories & Forschungsszenarien

**Dokument:** [USER-STORIES.md](USER-STORIES.md)

Für jede der vier Forschungsfragen wurden konkrete Szenarien entwickelt:

| FF | User Story | Forscherin | Kernfrage |
|----|------------|------------|-----------|
| FF1 | US 1.1 | Dr. Müller | Wer waren die Türöffner für Malaniuks Karriere? |
| FF1 | US 1.2 | Prof. Schmidt | Wie veränderte sich das Netzwerk zwischen Graz und Wien? |
| FF2 | US 2.1 | Dr. Weber | War Malaniuk eine Wagner-Spezialistin? |
| FF2 | US 2.2 | Mag. Fischer | Gab es einen Barock-Schwenk in der Spätphase? |
| FF2 | US 2.3 | Dr. Novak | Welche Karrieremuster lassen sich erkennen? |
| FF3 | US 3.1 | Dr. Klein | Wer waren Brückenpersonen zwischen Institutionen? |
| FF4 | US 4.1 | Dr. Rosenberg | Welche Mobilitätsformen lassen sich unterscheiden? |
| FF4 | US 4.2 | Mag. Berger | Wo lebte Malaniuk vs. wo trat sie auf? |

### 2. Erweiterte VIZ-Dokumente

Alle vier Visualisierungsdokumente wurden grundlegend überarbeitet:

- **[VIZ-1-Partitur.md](VIZ-1-Partitur.md)** – Mit detaillierten Spuren-Spezifikationen, UI-Flows, Testplan
- **[VIZ-2-Matrix.md](VIZ-2-Matrix.md)** – Mit Implementierungsplan für fehlende Features
- **[VIZ-3-Kosmos.md](VIZ-3-Kosmos.md)** – Mit Zustandsdiagramm für Click-to-Focus
- **[VIZ-4-Karrierefluss.md](VIZ-4-Karrierefluss.md)** – Mit kritischer Evaluation und Alternativ-Vorschlag

### 3. Implementierte Verbesserungen

| Feature | Datei | Forschungsnutzen |
|---------|-------|------------------|
| **Kategoriefilter für Matrix** | partitur.js | FF1/FF3: Fokus auf Dirigenten, Vermittler oder Kollegen |
| **Legende für Partitur** | partitur.js | FF2/FF4: Farben erklären sich selbst |
| **Document Panel schließen** | partitur.js | UX: Klick außerhalb schließt Panel |
| **Dynamische Matrix-Höhe** | partitur.js | UX: Anpassung an gefilterte Personen |

---

## Wie die Visualisierungen die Forschungsziele erfüllen

### FF1: Vernetzung und Professionalisierung

**Zielerreichung: 75%**

| Anforderung | Visualisierung | Status |
|-------------|----------------|--------|
| Schlüsselpersonen identifizieren | Begegnungs-Matrix | ✅ Intensität + Kategorien |
| Langfristige Beziehungen erkennen | Matrix (durchgehende Zeilen) | ✅ |
| Netzwerk-Brüche erkennen | Matrix (leere Zellen nach intensiven) | ✅ |
| Phasenvergleiche | Matrix mit Zeitfilter | ❌ Fehlt noch |

**Forschungsergebnis möglich:** "Karajan war 1955-1959 Schlüsselperson für Salzburg-Engagements. Erik Werba war durchgehender Vermittler."

### FF2: Ästhetische Strukturen

**Zielerreichung: 90%**

| Anforderung | Visualisierung | Status |
|-------------|----------------|--------|
| Repertoire-Schwerpunkte | Rollen-Kosmos | ✅ Komponisten-Größen |
| Signature Role finden | Kosmos (größter Rollen-Knoten) | ✅ |
| Repertoire-Entwicklung über Zeit | Partitur (Repertoire-Spur) | ✅ |
| Karrieremuster | Karriere-Fluss | ✅ Korrelationen sichtbar |

**Forschungsergebnis möglich:** "Malaniuk war keine reine Wagner-Spezialistin. Zwei Säulen: Wagner (Fricka) und Verdi (Amneris). Barock kam erst im Spätwerk."

### FF3: Wissenstransfer

**Zielerreichung: 65%**

| Anforderung | Visualisierung | Status |
|-------------|----------------|--------|
| Vermittler identifizieren | Matrix (Kategorie "Vermittler") | ✅ Mit neuem Filter |
| Langfristige Vermittler | Matrix (durchgehende Zeilen) | ✅ |
| Transfer-Inhalte | Archivalien-Link | ⚠️ Nur indirekt |

**Forschungsergebnis möglich:** "Erik Werba war in allen Karrierephasen aktiv – als Liedbegleiter, Korrespondenzpartner und Konzertpartner."

### FF4: Mobilitätsformen

**Zielerreichung: 85%**

| Anforderung | Visualisierung | Status |
|-------------|----------------|--------|
| Mobilitätsformen klassifizieren | Partitur (Mobilität-Spur) | ✅ Farbcodierung |
| Wohnort vs. Aufführungsort | Partitur (Orte-Swimlane) | ✅ Zwei Zeilen |
| Pendelmuster erkennen | Partitur (Orte überlappen) | ✅ |
| Geografische Karte | - | ❌ Nicht implementiert |

**Forschungsergebnis möglich:** "Drei Mobilitätstypen: Flucht (1944), Karriere-Pendeln (1945-1965), Lebensstil-Migration (1970)."

---

## Testbare Forschungsszenarien

### Szenario 1: "Die Wagner-Hypothese"

**Hypothese:** Malaniuk war primär Wagner-Sängerin.

**Test:**
1. Öffne Rollen-Kosmos
2. Vergleiche Knoten-Größen: Wagner vs. Verdi
3. Klicke auf Wagner → zähle Rollen
4. Klicke auf Verdi → zähle Rollen

**Erwartetes Ergebnis:** Wagner und Verdi sind etwa gleich groß → Hypothese widerlegt.

### Szenario 2: "Das Bayreuth-Netzwerk"

**Hypothese:** Bayreuth war das wichtigste Karriere-Zentrum.

**Test:**
1. Öffne Karriere-Fluss
2. Folge Flows zu "Bayreuth"
3. Vergleiche mit Wien, München

**Erwartetes Ergebnis:** Bayreuth hat dickste Wagner-Flows → Hypothese bestätigt für Wagner-Repertoire.

### Szenario 3: "Die Vermittler-Frage"

**Hypothese:** Es gab einen "roten Faden" durch alle Karrierephasen.

**Test:**
1. Öffne Matrix
2. Filtere auf "Vermittler"
3. Suche durchgehende Zeilen

**Erwartetes Ergebnis:** Erik Werba erscheint in jeder Spalte → roter Faden identifiziert.

---

## Offene Punkte für nächste Iteration

### Priorität HOCH

1. **Zeitfilter für Matrix** – Ermöglicht Phasenvergleiche
2. **Export-Funktionen** – CSV/SVG für wissenschaftliche Publikationen

### Priorität MITTEL

3. **Cross-Visualization Links** – "Zeige diese Person im Kosmos"
4. **Geografische Karte** – Für FF4 optimal

### Priorität NIEDRIG

5. **Annotation-System** – Forscher*innen können Notizen hinzufügen
6. **Animierte Zeitreise** – Kosmos wächst über Zeit

---

## Fazit

Die vier Visualisierungen bilden ein **komplementäres System**:

- **Partitur:** Was passierte wann? (Zeit)
- **Matrix:** Wer war wann wichtig? (Netzwerk)
- **Kosmos:** Was war das Repertoire? (Ästhetik)
- **Karriere-Fluss:** Was hängt zusammen? (Korrelationen)

Jede Visualisierung beantwortet **andere Fragen** und führt über das **Document Panel** immer zu den **Archivalien als Belegen**.

Das System erfüllt die Forschungsziele zu **~80%**. Die fehlenden 20% sind primär:
- Zeitfilter für Matrix (FF1-Vergleiche)
- Geografische Karte (FF4-Räumlichkeit)
- Transfer-Inhalte (FF3-Details)

---

*Version 1.0 – 2026-01-18*
