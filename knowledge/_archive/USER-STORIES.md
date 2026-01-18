# M³GIM User Stories & Forschungsszenarien

## Einleitung

Dieses Dokument verbindet die vier Forschungsfragen (FF1-FF4) des M³GIM-Projekts mit konkreten User Stories, UI-Flows und Akzeptanzkriterien. Jede Story beschreibt, wie eine Forscherin die Visualisierungen nutzt, um ihre Fragen zu beantworten.

**Ziel:** Die Visualisierungen sollen nicht nur "schön" sein, sondern konkrete Forschungsarbeit ermöglichen und neue Erkenntnisse generieren.

---

## Forschungsfragen im Überblick

| FF | Kernfrage | Schlüsselwörter |
|----|-----------|-----------------|
| **FF1** | Wie prägten Sänger\*innen die Grazer Kultur? Welche Rolle spielte Mobilität für Professionalisierung und Vernetzung? | Netzwerk, Professionalisierung, Graz, Kontakte |
| **FF2** | Welche narrativen und ästhetischen Strukturen wurden durch Migration beeinflusst? | Repertoire, Ästhetik, Rollen, Stil |
| **FF3** | Wie wurde Musiktheaterwissen durch Mobilität transferiert und adaptiert? | Wissenstransfer, Vermittler, Adaption |
| **FF4** | Welche Mobilitätsformen lassen sich bei Malaniuk identifizieren? | Mobilität, Orte, Flucht, Migration |

---

## FF1: Vernetzung und Professionalisierung

### User Story 1.1: Karriereschlüsselpersonen identifizieren

**Als** Musikwissenschaftlerin
**möchte ich** verstehen, welche Personen in welchen Karrierephasen für Ira Malaniuks Professionalisierung entscheidend waren,
**um** die Mechanismen künstlerischer Netzwerkbildung zu rekonstruieren.

#### Szenario

Dr. Müller untersucht, wie Sängerinnen in der Nachkriegszeit ihre Karrieren aufbauten. Sie fragt sich:
- Wer waren die "Türöffner" für Malaniuks Karriere?
- Gab es Brüche in den Netzwerken? (z.B. nach dem Wechsel von Graz nach Wien)
- Welche Dirigenten/Vermittler kamen in mehreren Karrierephasen vor?

#### UI-Flow

```
1. Öffne "Analyse" → "Begegnungs-Matrix"
2. Betrachte die Heatmap: Zeilen = Personen, Spalten = 5-Jahres-Perioden
3. Identifiziere Muster:
   - Dunkle Spalten = intensive Phasen
   - Durchgehende Zeilen = langfristige Beziehungen
   - Abrupte Enden = Brüche
4. Klicke auf eine Zelle (z.B. "Karajan, 1955-1959")
5. Das Document Panel öffnet sich mit den Archivalien
6. Klicke auf ein Dokument → navigiere zum Archiveintrag
7. Notiere die Erkenntnis: "Karajan war 1955-1959 wichtig, aber die Beziehung endete abrupt"
```

#### Akzeptanzkriterien

| Kriterium | Erfüllt? | Nachweis |
|-----------|----------|----------|
| Matrix zeigt Intensität über Zeit | ✅ | Farbskala 0-5 implementiert |
| Kategoriesortierung sichtbar | ✅ | Dirigenten, Vermittler, Kollegen gruppiert |
| Klick → Archivbelege | ✅ | Document Panel mit Dokumenten |
| Zeiträume klar erkennbar | ✅ | 5-Jahres-Intervalle |
| **Forschungsfrage beantwortbar** | ⚠️ | Teilweise: Brüche erkennbar, aber *warum* nicht |

#### Verbesserungspotential

1. **Fehlend:** Annotation-Funktion – Forscherin kann keine Notizen zu Zellen hinzufügen
2. **Fehlend:** Export der Matrix als CSV für statistische Auswertung
3. **Fehlend:** Sortieroptionen (nach Gesamtintensität, nach erstem Auftreten)
4. **Schwäche:** Die Matrix zeigt *dass*, aber nicht *warum* Beziehungen enden

---

### User Story 1.2: Netzwerkveränderungen über Zeit verfolgen

**Als** Historikerin
**möchte ich** sehen, wie sich Malaniuks Netzwerk zwischen der Graz-Phase und der internationalen Karriere veränderte,
**um** den Einfluss von Mobilität auf soziales Kapital zu analysieren.

#### Szenario

Prof. Schmidt vergleicht zwei Karrierephasen:
- Graz (1945-1947): Lokales Netzwerk
- Internationale Phase (1955-1965): Globales Netzwerk

Sie fragt: Wie viele Personen "überlebten" den Übergang? Wer kam neu hinzu?

#### UI-Flow (FEHLT DERZEIT)

```
1. IDEAL: Zeitfilter auf Matrix anwenden ("nur 1945-1950" vs "nur 1955-1965")
2. IDEAL: Zwei Ansichten nebeneinander vergleichen
3. IDEAL: "Diff-View" zeigt, wer neu hinzukam / wegfiel
```

#### Akzeptanzkriterien

| Kriterium | Erfüllt? | Nachweis |
|-----------|----------|----------|
| Zeitfilter für Matrix | ❌ | Nicht implementiert |
| Vergleichsansicht | ❌ | Nicht implementiert |
| Diff-Visualisierung | ❌ | Nicht implementiert |

#### Notwendige Erweiterung

**Zeitfilter für Begegnungs-Matrix:**
- Dropdown: "Zeitraum auswählen" mit Mehrfachauswahl
- Dynamische Neuberechnung der Intensitäten
- "Vergleichsmodus" mit zwei nebeneinander liegenden Matrizen

---

## FF2: Ästhetische Strukturen und Repertoire

### User Story 2.1: Repertoire-Schwerpunkte erkennen

**Als** Opernforscherin
**möchte ich** verstehen, welche Komponisten und Rollen Malaniuks künstlerisches Profil prägten,
**um** ihre Position in der Operngeschichte einzuordnen.

#### Szenario

Dr. Weber analysiert Malaniuks Repertoire:
- War sie eine "Wagner-Spezialistin"?
- Wie breit war ihr Repertoire wirklich?
- Gab es Verschiebungen über die Karriere?

#### UI-Flow

```
1. Öffne "Analyse" → "Rollen-Kosmos"
2. Betrachte die Übersicht: Malaniuk im Zentrum, Komponisten als Satelliten
3. ERKENNTNIS: Wagner und Verdi dominieren (große Knoten)
4. Klicke auf "Wagner" → die Wagner-Rollen werden fokussiert
5. Sehe: Fricka (groß), Waltraute (mittel), Erda (klein)
6. ERKENNTNIS: Fricka war ihre Hauptrolle bei Wagner
7. Klicke auf "Fricka" → Document Panel zeigt 12 Archivalien
8. Klicke auf "Szenenfoto Fricka (Ring)" → navigiere zum Foto im Archiv
```

#### Akzeptanzkriterien

| Kriterium | Erfüllt? | Nachweis |
|-----------|----------|----------|
| Komponisten als Hauptkategorien | ✅ | Knoten um Zentrum |
| Rollen als Unterelemente | ✅ | Äußere Knoten |
| Größe = Dokumentenmenge | ✅ | Radius-Berechnung |
| Click-to-Focus | ✅ | Dimmt nicht-fokussierte Elemente |
| Klick → Archivbelege | ✅ | Document Panel |
| **Forschungsfrage beantwortbar** | ✅ | Repertoire-Schwerpunkte klar erkennbar |

#### Verbesserungspotential

1. **Fehlend:** Zeitdimension – Wann sang sie welche Rolle zum ersten/letzten Mal?
2. **Fehlend:** Verknüpfung mit Aufführungsorten – Wo sang sie welche Rolle?
3. **Schwäche:** Nur Dokumentenmenge, nicht Aufführungshäufigkeit

---

### User Story 2.2: Repertoire-Entwicklung über Zeit analysieren

**Als** Karriereforscherin
**möchte ich** sehen, wie sich Malaniuks Repertoire über ihre Karriere veränderte,
**um** ästhetische Entwicklungen mit biografischen Ereignissen zu korrelieren.

#### Szenario

Mag. Huber fragt:
- Begann Malaniuk mit Verdi und wechselte zu Wagner?
- Oder war das Repertoire von Anfang an breit?
- Gab es einen "Barock-Schwenk" in der Spätphase?

#### UI-Flow

```
1. Öffne "Analyse" → "Mobilitäts-Partitur"
2. Scrolle zur Spur "Repertoire"
3. Sehe: Farbcodierte Balken (Rot=Wagner, Grün=Verdi, Violett=Strauss)
4. ERKENNTNIS: Amneris (Verdi, grün) beginnt früh und läuft lang
5. ERKENNTNIS: Fricka (Wagner, rot) beginnt später, wird aber dominant
6. Bewege den Fokus-Slider auf 1952 (Bayreuth-Debüt)
7. ERKENNTNIS: Ab 1952 explodiert das Wagner-Repertoire
8. Klicke auf "Fricka" Balken → Document Panel zeigt Bayreuth-Dokumente
```

#### Akzeptanzkriterien

| Kriterium | Erfüllt? | Nachweis |
|-----------|----------|----------|
| Zeitliche Ausdehnung der Rollen | ✅ | Balken mit von-bis |
| Farbcodierung nach Komponist | ✅ | Rot, Grün, Violett |
| Fokus-Linie interaktiv | ✅ | Slider + vertikale Linie |
| Klick → Archivbelege | ✅ | Document Panel |
| **Forschungsfrage beantwortbar** | ✅ | Repertoire-Entwicklung sichtbar |

---

### User Story 2.3: Karrieremuster im Karriere-Fluss erkennen

**Als** Kulturwissenschaftlerin
**möchte ich** auf einen Blick sehen, wie Karrierephase, Repertoire und Ort zusammenhängen,
**um** Karrieremuster zu identifizieren.

#### Szenario

Dr. Novak fragt:
- Gab es typische "Karrierepfade"? (z.B. Graz → Wien → International)
- Welches Repertoire wurde wo gespielt?
- Hängt die geografische Expansion mit Repertoire-Erweiterung zusammen?

#### UI-Flow

```
1. Öffne "Analyse" → "Karriere-Fluss"
2. Lese von links nach rechts:
   - KARRIEREPHASE: Anfänge, Aufstieg, Höhepunkt, Spätphase
   - REPERTOIRE: Wagner, Verdi, Strauss, Gluck/Händel
   - GEOGRAFISCHES ZENTRUM: Wien, Bayreuth, München, Salzburg
3. Folge einem Flow: "Höhepunkt" → "Wagner" → "Bayreuth"
4. ERKENNTNIS: In der Höhepunkt-Phase dominierte Wagner, v.a. in Bayreuth
5. Hover über den Flow → Tooltip: "Stärke: 90, 5 Archivalien"
6. Klicke auf "Wagner" Knoten → Document Panel zeigt Wagner-Dokumente
```

#### Akzeptanzkriterien

| Kriterium | Erfüllt? | Nachweis |
|-----------|----------|----------|
| Drei Spalten klar getrennt | ✅ | Karrierephase, Repertoire, Geo |
| Flows zeigen Zusammenhänge | ✅ | Bezier-Kurven mit Farbcodierung |
| Hover zeigt Details | ✅ | Tooltip mit Stärke |
| Leserichtung kommuniziert | ✅ | Erklärender Text oben |
| Klick → Archivbelege | ✅ | Document Panel |
| **Forschungsfrage beantwortbar** | ⚠️ | Muster erkennbar, aber Kausalität unklar |

#### Kritische Reflexion

Der Karriere-Fluss zeigt **Korrelationen**, aber nicht **Kausalitäten**. Die Visualisierung kann nicht beantworten:
- *Warum* wurde Wagner in Bayreuth gespielt? (Trivial: Weil Bayreuth Wagner-Festspiele sind)
- *Was* führte zur Repertoire-Erweiterung?

**Empfehlung:** Der Karriere-Fluss ist eine gute **Einstiegsvisualisierung** für Laien, aber Forscher brauchen die detailliertere Partitur.

---

## FF3: Wissenstransfer durch Mobilität

### User Story 3.1: Vermittler-Personen identifizieren

**Als** Netzwerkforscherin
**möchte ich** verstehen, wer Wissen zwischen Institutionen vermittelte,
**um** Transferprozesse zu rekonstruieren.

#### Szenario

Dr. Klein fragt:
- Wer war "Brücke" zwischen Wien und München?
- Gab es Personen, die in mehreren Kontexten auftauchten?
- Wie wurde Aufführungspraxis von einem Ort zum anderen übertragen?

#### UI-Flow

```
1. Öffne "Analyse" → "Begegnungs-Matrix"
2. Filtere auf Kategorie "Vermittler"
3. Identifiziere Personen mit hoher Intensität über mehrere Zeiträume
4. ERKENNTNIS: Erik Werba erscheint in 1945-1969 durchgehend
5. Klicke auf Werba-Zeile → sehe alle Begegnungen
6. ERKENNTNIS: Werba war Korrespondenzpartner UND künstlerischer Partner
7. Navigiere zu den Dokumenten → finde Korrespondenz mit Wissensinhalten
```

#### Akzeptanzkriterien

| Kriterium | Erfüllt? | Nachweis |
|-----------|----------|----------|
| Kategorie "Vermittler" filterbar | ⚠️ | Kategorie existiert, aber kein Filter-UI |
| Langfristige Beziehungen erkennbar | ✅ | Durchgehende Zeilen |
| Kontext der Begegnung sichtbar | ✅ | Tooltip zeigt Kontext |
| **Forschungsfrage beantwortbar** | ⚠️ | Vermittler erkennbar, aber Transfer-Inhalte nicht |

#### Notwendige Erweiterung

**Kategoriefilter in Sidebar:**
```
Personenkategorie:
[x] Dirigent
[x] Vermittler
[ ] Kollege
[ ] Regisseur
```

**Bereits als HTML vorhanden, aber nicht funktional verbunden!**

---

## FF4: Mobilitätsformen

### User Story 4.1: Mobilitätsformen klassifizieren

**Als** Migrationsforscherin
**möchte ich** die verschiedenen Formen von Mobilität in Malaniuks Leben unterscheiden,
**um** erzwungene von freiwilliger Mobilität zu differenzieren.

#### Szenario

Dr. Rosenberg analysiert Mobilitätsbiografien von Künstlerinnen:
- Welche Mobilitätsformen lassen sich bei Malaniuk identifizieren?
- Wie unterscheiden sich erzwungene von karrierebedingter Mobilität?
- Gibt es Phasen der "Sesshaftigkeit"?

#### UI-Flow

```
1. Öffne "Analyse" → "Mobilitäts-Partitur"
2. Fokussiere auf die Spur "Mobilität"
3. Sehe Kreise mit Buchstaben: E (erzwungen), G (geografisch), L (Lebensstil)
4. ERKENNTNIS: 1944 gibt es einen roten Kreis (E) → Flucht
5. ERKENNTNIS: 1945-1955 viele grüne Kreise (G) → Karriere-Mobilität
6. ERKENNTNIS: 1970 violetter Kreis (L) → Übersiedlung nach Zürich
7. Klicke auf den roten Kreis → Document Panel zeigt Fluchtdokumente
8. Klicke auf "Identitätsdokument Staatenlose" → Archiveintrag
```

#### Akzeptanzkriterien

| Kriterium | Erfüllt? | Nachweis |
|-----------|----------|----------|
| Mobilitätsformen farbcodiert | ✅ | CSS-Klassen mobility--erzwungen etc. |
| Zeitliche Position klar | ✅ | X-Position = Jahr |
| Beschreibung im Tooltip | ✅ | Von-Ort → Nach-Ort + Beschreibung |
| Klick → Archivbelege | ✅ | Document Panel |
| **Forschungsfrage beantwortbar** | ✅ | Mobilitätsformen unterscheidbar |

---

### User Story 4.2: Wohnorte vs. Aufführungsorte unterscheiden

**Als** Geografin
**möchte ich** verstehen, wo Malaniuk lebte vs. wo sie auftrat,
**um** Pendelmuster zu identifizieren.

#### Szenario

Mag. Berger kartiert Künstlermobilitäten:
- Wie unterscheiden sich Wohnorte von Aufführungsorten?
- Gab es "Homebase"-Orte, von denen aus sie reiste?
- Wie weit reichte das Gastspiel-Netzwerk?

#### UI-Flow

```
1. Öffne "Analyse" → "Mobilitäts-Partitur"
2. Fokussiere auf die Spur "Orte"
3. Sehe zwei Zeilen: "Wohnort" (große Balken), "Bühne" (kleine Balken)
4. ERKENNTNIS: Wohnort wechselt selten (Lemberg → Wien → Graz → Zürich)
5. ERKENNTNIS: Aufführungsorte überlappen (Wien, München, Bayreuth parallel)
6. Klicke auf "Bayreuth" (Aufführungsort) → Document Panel zeigt Bayreuth-Dokumente
```

#### Akzeptanzkriterien

| Kriterium | Erfüllt? | Nachweis |
|-----------|----------|----------|
| Wohnort vs. Aufführungsort unterschieden | ✅ | Zwei Zeilen in Swimlane |
| Farbcodierung nach Ort | ✅ | ortColors Scale |
| Zeitliche Überlappung sichtbar | ✅ | Collision Detection |
| Klick → Archivbelege | ✅ | Document Panel |
| **Forschungsfrage beantwortbar** | ✅ | Pendelmuster erkennbar |

---

## Zusammenfassung: Zielerreichung pro Forschungsfrage

| FF | Forschungsziel | Haupt-Visualisierung | Zielerreichung | Begründung |
|----|----------------|---------------------|----------------|------------|
| **FF1** | Vernetzung & Professionalisierung | Begegnungs-Matrix | ⚠️ 70% | Netzwerke erkennbar, aber Zeitfilter fehlt |
| **FF2** | Ästhetische Strukturen | Rollen-Kosmos + Partitur | ✅ 90% | Repertoire sehr gut visualisiert |
| **FF3** | Wissenstransfer | Begegnungs-Matrix | ⚠️ 60% | Vermittler erkennbar, aber Inhalte nicht |
| **FF4** | Mobilitätsformen | Mobilitäts-Partitur | ✅ 85% | Mobilitätstypen klar unterscheidbar |

---

## Kritische Bewertung der Visualisierungen

### Was funktioniert gut

1. **Archivalien-Verlinkung:** Jeder Datenpunkt führt zu Quellen – das ist essenziell für wissenschaftliche Arbeit
2. **Partitur-Metapher:** Die parallelen Spuren ermöglichen synchrone Lesart ("Was passierte gleichzeitig?")
3. **Kosmos-Fokussierung:** Click-to-Focus reduziert Komplexität ohne Information zu verlieren
4. **Karriere-Fluss als Einstieg:** Gut für Laien und Überblick

### Was fehlt oder verbessert werden muss

1. **Export-Funktionen:** Keine Möglichkeit, Ansichten als CSV/PNG zu exportieren
2. **Annotations:** Forscher*innen können keine Notizen hinzufügen
3. **Zeitfilter:** Die Matrix braucht einen Zeitfilter für Vergleiche
4. **Verlinkung zwischen Visualisierungen:** "Zeige diese Person im Kosmos" fehlt
5. **Geografische Karte:** FF4 wäre mit einer echten Karte besser bedient

### Empfehlungen für nächste Iteration

1. **Zeitfilter für Matrix** (Priorität: Hoch, FF1/FF3)
2. **Export als CSV/PNG** (Priorität: Mittel, alle FF)
3. **Cross-Visualization Links** (Priorität: Mittel, UX)
4. **Geografische Karte** (Priorität: Mittel, FF4)
5. **Annotation-System** (Priorität: Niedrig, alle FF)

---

*Version 1.0 – 2026-01-18*
