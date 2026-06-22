---
title: Use Cases, Personas & Evaluation
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: draft
language: de
version: 0.1
created: 2026-06-22
updated: 2026-06-22
authors: [Christopher Pollin]
generated-with: Claude Code
related: [research, partner-fragen-2026-06, design, architecture, decisions]
---

# Use Cases, Personas & Evaluation

> **Arbeitsstand / Platzhalter** (angelegt 2026-06-22). Operationalisiert die Forschungsfragen aus [research.md](research.md) und die Mobilitäts-User-Stories in konkrete Use Cases, leitet Personas ab und skizziert, wie sich beides evaluieren lässt. Bewusst als **Gerüst** angelegt: die mit *(ausarbeiten)* markierten Unterbereiche sind offen und mit den Projektpartner:innen zu schärfen — der laufende Diskussionsstand dazu liegt in [partner-fragen-2026-06.md](partner-fragen-2026-06.md). Was im Tool bereits gebaut ist, steht in [architecture.md](architecture.md) § Statistik und [decisions.md](decisions.md) (E-122/E-123).

Zweck dieses Dokuments: die Lücke zwischen den abstrakten Forschungsfragen (FF1–FF4) und den konkreten UI-Bausteinen schließen, damit Entwurfsentscheidungen und eine spätere Evaluation auf benannte Bedürfnisse zurückführbar sind statt auf Bauchgefühl.

## 1 Personas (ausarbeiten)

Wen bedient das Tool? Vorläufig aus FF1–FF4 und der Partner-Konstellation abgeleitet; mit den realen Bedürfnissen aus der Partner-Rückmeldung zu schärfen.

### P1 — Musikwissenschaftliche Forscherin (Kern-Persona)
- **Kontext:** KUG-Forschungsteam (Strohmann u. a.), arbeitet an Mobilität und Wissensproduktion von Sängerinnen.
- **Ziel:** Malaniuks Bewegungen, Auftrittsformen und Netzwerke als Evidenz für FF1/FF4 lesen und einzelne Befunde bis zur Quelle zurückverfolgen.
- **Braucht:** Differenzierung der Auftrittsarten (Gastspiel vs. Engagement vs. Reise), räumlich-zeitliche Übersicht, Rücksprung in den belegenden Bestand. *(ausarbeiten: konkrete Aufgaben/Erwartungen aus der Mail)*

### P2 — DH-Methodikerin / Modelliererin
- **Kontext:** Erschließung und Modellierung (RiC-O + m3gim + AgRelOn), prüft Praktikabilität und Skalierung (Machbarkeitsfrage in research.md).
- **Ziel:** Erschließungsgrad, Datenlücken und Modell-Tragfähigkeit sichtbar machen.
- **Braucht:** ehrliche Deckungsanzeigen (datiert/verortet/undatiert), Erschließungsspiegel, Provenienz. *(ausarbeiten)*

### P3 — Erschließung / studentische Hilfskraft
- **Kontext:** befüllt und korrigiert die Quell-Spreadsheets.
- **Ziel:** sieht, welche Felder fehlen oder inkonsistent sind (z. B. fehlende `datenpunkt_id`, Namensvarianten).
- **Braucht:** Rückmeldung aus dem Tool über Datenqualitätssignale. *(ausarbeiten)*

### P4 — Externe Nachnutzung / FWF-Folgestudie *(optional, ausarbeiten)*

## 2 Use Cases (aus den Forschungsfragen)

Schema je Use Case: **FF-Bezug · Frage · benötigte Daten · UI-Baustein (Stand) · Datendeckung · offen**. Der Stand bezieht sich auf das Statistik-Dashboard (E-123) und die Mobilitäts-Chronik (E-124); querschnittlich greift der geplante Cross-View-Filter ([filter-modell.md](filter-modell.md), Milestone 4). Exakte Deckungszahlen sind den Live-Daten / dem [Quality-Snapshot](../data/reports/quality-snapshot.md) zu entnehmen, nicht diesem Text — hier nur die Größenordnung und die ehrliche Grenze.

### UC-1 — Wohin und wann bewegte sie sich? (FF4; UC-1)
- **Frage:** Räumlich-zeitliches Bewegungsprofil über die Karriere.
- **Daten:** SpatiotemporalEvents mit `atPlace`/`placeCountry`/`atDate`; Records mit `rico:date`.
- **UI (Stand):** Chronik als **temporale Achse** (Mobilitäts-Chronik, E-124: Sicht-gefärbter Jahres-Zeitstrahl + kollabierbarer Dekaden-Sicht-Header) + Karte als **räumliche Achse** (Trajektorie, E-111) + Statistik „Wohin & Wann" (Aggregat).
- **Deckung:** Die Masse des datierten Materials klumpt in den 1950ern; nur drei Lebensdekaden sind überhaupt belegt. Die Chronik ist damit ehrlich eine **Erschließungs-Momentaufnahme der München-/Bayreuth-Jahre**, kein Karriere-Bogen über die Lebensspanne. Dichte = Überlieferung, nicht Aktivität — als Caption ausgewiesen.
- **Offen:** Ort×Zeit und Trajektorie noch nicht gekoppelt; der Cross-View-Filter würde Chronik, Karte und Statistik auf denselben Schnitt bringen.

### UC-2 — Welche Art von Mobilität? Gastspiel vs. Engagement vs. Reise (FF1/FF4)
- **Frage:** Auftrittsformen differenziert sehen (Partnerfrage 1: „alle Gastspiele").
- **Daten:** `eventRole` (gastspiel/aufführung/spielzeit …), gruppiert zu fünf Sichten (`mobilityClusterFor`).
- **UI (Stand):** Statistik „Art der Mobilität" (Sichten + feine Auftrittstypen) + Chronik (Sicht als linker Akzentbalken am Record-Chip, E-124).
- **Deckung:** `gastspiel` als eigene Rolle sichtbar. Aber: nur ein Teil der Chronik-Chips trägt überhaupt eine Sicht (der Rest hat kein SpatiotemporalEvent) — die sicht-losen Chips bleiben **monochrom**, die Monochromie ist die ehrliche Aussage „keine Sicht erschlossen". `biografisch`/`diskursiv` sind faktisch leer; eine gleichberechtigte 5-Sichten-Legende täuscht Ausgewogenheit vor. `korrespondenz`-Dominanz teils ein E-110-Mapping-Artefakt (datumslose Ortsrollen).
- **Offen:** Ensemble-/Institutions-Zuordnung pro Ereignis **nicht erfasst** → Gastspiel nicht nach Ensemble (z. B. Bayreuth-Festspiel) auswertbar (Datenstufe, siehe § Nächste Datenstufe in [plan.md](plan.md)).

### UC-3 — Wie international war ihre Karriere? (FF1)
- **Frage:** Geografische Reichweite und Schwerpunktverschiebung über die Zeit.
- **Daten:** `placeCountry`/`atPlace` (Q-IDs) über Events; Records mit Ort + `rico:date`.
- **UI (Stand):** Statistik „Wohin & Wann" → Reichweite (Länder); Chronik → Top-Orte je Dekade über Q-ID (E-124, Ort-Label aus aufgelöstem Q-ID, nicht rohem `.name`).
- **Deckung:** Orte sind upstream zu Wikidata-Q-IDs rekonziliert (Doppel-Anker Wikidata + Archiv); ein kleiner unrekonzilierter Rest (QF-16) bleibt. Schwerpunktwechsel stützt sich auf die breiten 1950er; die spätere Basis ist zu dünn für eine belastbare Verschiebungs-Aussage.
- **Offen:** Land×Zeit als eigener Schnitt; Institution pro Ereignis fehlt (siehe UC-2).

### UC-4 — Mit wem war sie verbunden? (FF1/FF3)
- **Frage:** Beziehungsgeflecht und prägende Kontakte.
- **Daten:** AgRelOn-Relationen (Typ + benannter Partner).
- **UI (Stand):** Statistik „Mit wem" (Typ-Donut ↔ benannte Partner mit Typ-Drill).
- **Deckung:** dünn — wenige Relationen mit benanntem Gegenüber; Normalisierungs-Dubletten (QF-15).
- **Offen:** Verknüpfung Beziehung↔Ereignis/Ort fehlt; reichere Variante wäre Ko-Okkurrenz (erschlossenes Umfeldnetz, klar zu etikettieren). Keine belastbare zeitliche Achse (Relationen sind record-, nicht ereignisbasiert) → nicht in die Chronik gezogen.

### UC-5 — Welches Repertoire sang sie, wo? (FF2/FF3) — niedrige Priorität für eine *zeitliche* Aussage
- **Frage:** Künstlerische Mobilität — Werke und Partien über Orte und Zeit.
- **Daten:** Werke (`komponist`), Performances/StageRoles, Records mit Werk- und Ortsbezug.
- **UI (Stand):** Statistik „Repertoire" (Top-Komponisten) — flach. In der Chronik nur als **Begleitspur** am Chip denkbar, keine eigene Achse.
- **Offen:** Performances tragen fast nie ein eigenes Datum (sie erben das Record-Datum und damit den 1950er-Klumpen) → als eigenständige zeitliche Entwicklungs-Frage trägt UC-5 kaum. Werk×Ort/Werk×Partie am Ereignis nicht verknüpft (Datenstufe).

### UC-6 — Wo und wann entstand welches Wissen? (FF3)
- **Frage:** Rezeption/Wissensproduktion (Rezensionen, Rundfunk, Druck) verorten.
- **Daten:** diskursive Sicht + Dokumenttypen.
- **UI (Stand):** „Art der Mobilität" (diskursive Sicht) + „Dokumenttypen".
- **Offen:** Die diskursive Sicht ist datenseitig sehr dünn → ein eigener diskursiver Schnitt lohnt erst mit mehr Erschließung. *(ausarbeiten)*

*(ausarbeiten: weitere UCs der Personas P2/P3, z. B. „Erschließungslücken finden", „Datenqualität prüfen".)*

## 3 Evaluation (ausarbeiten)

Leitfrage: Macht das Tool die Forschungsfragen *beantwortbar* — und für wen?

- **Methoden (Optionen):** aufgabenbasierter Walkthrough mit P1 (je UC eine Aufgabe, gelingt/scheitert), Think-aloud, kurzes Experten-Feedback zur Mail-Runde; für P2/P3 Erschließungs-/Datenqualitäts-Checks.
- **Kriterien (Optionen):** Aufgabenerfolg je UC; Nachvollziehbarkeit (führt der Befund zur Quelle?); Ehrlichkeit (werden Lücken sichtbar statt kaschiert?); Datendeckung je UC (verortet/datiert/benannt).
- **Datengetriebene Checks:** Deckungsquoten je UC aus dem Live-Store (schon teilweise als Captions sichtbar); Smoke-Stempel als maschinenlesbarer Zustand.
- *(ausarbeiten: Aufgabenset je Persona, Erfolgsmaße, wann/mit wem evaluiert.)*

## Verweise

- Forschungsfragen und Theorie: [research.md](research.md)
- Partner-Rückmeldung, offene Entscheidungen: [partner-fragen-2026-06.md](partner-fragen-2026-06.md)
- Gebauter Stand: [architecture.md](architecture.md) § Statistik, [decisions.md](decisions.md) E-122/E-123
- Querschnitt-Filter: [filter-modell.md](filter-modell.md)
