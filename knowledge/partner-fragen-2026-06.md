---
title: Partner-Rückmeldung Juni 2026 — Diskussionsstand
status: draft
created: 2026-06-22
language: de
authors: [Christopher Pollin]
related: [data, data-entry-guidelines, filter-modell, visualisierung-bayreuth, decisions, plan]
---

# Partner-Rückmeldung Juni 2026 — Diskussionsstand

> Arbeitsstand zur Vorbereitung des Treffens am **2026-06-23**. Festgehalten sind die vier Fragen aus der Mail von Nicole K. Strohmann (KUG, im Namen des Teams, 2026-06-22), was davon geklärt ist, was offen bleibt, und die daraus abgeleiteten Verbesserungen an Erfassung, Workflow und UI. **Kein abgeschlossenes Wissen** — die Entscheidungen werden im Treffen ausgehandelt und danach nach `data.md` / `decisions.md` überführt.

## Die vier Fragen im Original (verkürzt)

1. **Auftrittstypen differenziert sehen** — Gastspiele mit dem Bayreuther Ensemble (Tournee, z. B. Bayreuth in Neapel) vs. „normale" Inszenierung (Wieland-Wagner-Inszenierung, Malaniuk singt, kein offizielles Gastspiel) vs. Auftritte in Bayreuth während der Festspiele. → Gelöst durch Ort und Institution? → Visualisierung prüfen.
2. **Drop-downs** übertragen sich nicht in schon befüllte Tabellen.
3. **Verknüpfungstyp / Komma / „richtiger Typ"** — „Rolle, Nachname, Vorname" oder „Rolle, Vorname Nachname"? Welche Rolle spielt das Komma? Und: Zeile 1533 (Tristan, Bayreuther Gastspiel in Brüssel/Barcelona) — Rolle „Gastspiel" oder „Aufführung"?
4. **Verbindende Visualisierung** — eine Ebene, die nach den Typen der Verknüpfungstabelle gefiltert werden kann und Personen, Orte, Werke, Institutionen verbindet („Malaniuk 1952 in Bayreuth, X Werke, wer war beteiligt"). Einzelansichten bleiben erkennbar, einzeln abschaltbar.

## Der verbindende Befund

Drei der vier Fragen (1, 3, 4) sind Symptome derselben Lücke: Die Verknüpfungstabelle **schreibt heute alles als Freitext aus** — Namen ausgeschrieben, Auftritte als lose Zeilen ohne Klammer. Das erzeugt das überladene Komma, uneinheitliche Namen und die Unmöglichkeit, zusammengehörige Zeilen einem Auftritt zuzuordnen.

Das Gegenmittel ist ein Prinzip: **referenzieren statt ausschreiben.** Daraus die Kette, die zugleich Bau- und Argumentationsreihenfolge ist:

> **bündeln → referenzieren → differenzieren → verbinden**

1. **Bündeln** — die leere Spalte `datenpunkt_id` füllen, damit zusammengehörige Zeilen *einen* Auftritt bilden.
2. **Referenzieren** — in der Verknüpfungstabelle Index-IDs statt ausgeschriebener Namen führen (über Auswahllisten, nicht durch Tippen von IDs).
3. **Differenzieren** — Gastspiel als eigene Eigenschaft des Auftritts, nicht als konkurrierenden Rollenwert.
4. **Verbinden** — Cross-View-Filter (entworfen) plus heterogener Graph (braucht Schritt 1).

## Vier Entscheidungspunkte (mit Empfehlung)

### E-A Auftritts-Bündelung (`datenpunkt_id`)
- **Frage:** zusammengehörige Verknüpfungszeilen zu einem Auftritt klammern.
- **Empfehlung:** ja. Einziger Punkt mit echtem Erfassungs-Mehraufwand (eine laufende Nummer pro Auftrittsgruppe). Automatische Gruppierung über das Folio scheidet aus, weil ein Folio häufig mehrere Auftritte enthält.
- **Offen für die Partner:** im Erfassungsalltag zumutbar?
- **Wirkung:** Voraussetzung für den präzisen Auftrittsknoten → trägt E-C und E-D.

### E-B Namen als Index-ID (referenzieren statt ausschreiben)
- **Frage:** Name nicht mehr in die `name`-Spalte tippen, sondern Person/Werk/Ort aus dem Index wählen; gespeichert wird die ID.
- **Empfehlung:** ja, schrittweise (zuerst Personen). Auswahllisten statt Freitext — das ist zugleich die Antwort auf Frage 2 (die Drop-downs sind das Werkzeug).
- **Wirkung:** löst das dreifach überladene Komma vollständig, beseitigt die Person↔Organisation-Kollision (eponyme Organisationen), macht die Frage „Komma ja/nein" gegenstandslos. Die Ansetzungsregel „Nachname, Vorname" lebt dann sauber im Index, siehe `data-entry-guidelines.md`.

### E-C Gastspiel als eigene Eigenschaft
- **Frage:** „Gastspiel" aus dem Rollenfeld lösen.
- **Empfehlung:** Aufführung ist die Handlung, Gastspiel der Modus — beides getrennt führen. Zwei Achsen:
  - *auswärts vs. am Haus* = Auftrittsort ≠ Institutionssitz → **automatisch ableitbar** (Sitz liegt für gut die Hälfte der Institutionen im Index vor).
  - *Ensemble-Tournee vs. Solo-Gastspiel* → **muss aus der Quelle erfasst werden**, nicht ableitbar.
- **Offen für die Partner:** Welche Trennschärfe ist gewünscht — reicht die berechnete Ebene, oder braucht es „Ensemble-Tournee" als eigene erfasste Stufe?
- **UI:** Farbe nach Modus, oder Linie Sitz→Auftrittsort (Tournee als sichtbare Bewegung). Leitplanke gegen den Bayreuth-Auftrittsnachweis-Fehlschluss beachten, siehe `visualisierung-bayreuth.md`.

### E-D Verbindende Visualisierung
- **Frage:** Personen, Orte, Werke, Institutionen in einer filterbaren Ebene verbinden.
- **Empfehlung:** zwei Bausteine, in dieser Reihenfolge:
  1. **Cross-View-Filter** — bereits entworfen (`filter-modell.md`, E-117): ein Schnitt wirkt synchron in allen Ansichten, Einzelansichten bleiben erkennbar und einzeln abschaltbar. Sofort baubar, ohne Datenumbau, aber grob (Dokumentebene).
  2. **Heterogener Graph** — alle Typen in einem Netz, der Auftritt als Verbindungsknoten. Wird präzise erst mit E-A.
- **Ehrlichkeit im UI:** Dokumentebene zeigt „im selben Dokument genannt", nicht „zusammen aufgetreten". Erst der Auftrittsknoten macht „im selben Auftritt mitgewirkt" belastbar. Dieser Unterschied (weit vs. eng) muss im UI sichtbar bleiben.
- **Wertvollste Rückfrage an die Partner:** ihre 2–3 typischen Leitfragen ans Material — sie sind die Spezifikation für Filter und Graph.

## Lern-Landkarte

| Frage | Datennormalisierung | Workflow | Daten ins UI |
|---|---|---|---|
| 1 Gastspiel | Gastspiel als saubere Zusatzangabe (E-C) | Tournee vs. Solo bewusst erfassen | Auftrittstypen in der Karte trennbar |
| 2 Drop-downs | — | `datenpunkt_id` (E-A) + Validierung auf ganze Spalte / Quelle „aus Bereich" | ermöglicht präzisen Auftrittsknoten |
| 3 Komma/Typ | Namen per Index-ID (E-B) | Auswahllisten statt Freitext | eindeutige Knoten im Graph |
| 4 Verbindung | — | — | Filter + Graph; Leitfragen = Anforderungen |

## Antwort auf Frage 2 (Sofort-Hilfe, technisch)

Google-Sheets-Verhalten: eine Datenvalidierung gilt nur für den Zellbereich, auf den sie angewandt wurde. Hebel: (a) Validierung auf die ganze Spalte legen; (b) Quelle „aus einem Bereich" (Hilfsspalte) statt fester Liste — dann greift ein neuer Listeneintrag in allen Zellen. Bestehende Werte werden markiert, nie überschrieben.

## Scout-Snapshot 2026-06-22 (reproduzierbar, vergänglich)

Erhoben gegen `data/google-spreadsheet/M3GIM-Verknüpfungen.xlsx` und die Indizes; reproduzierbar über ein Ad-hoc-Skript (nicht eingecheckt). **Momentaufnahme, kein gepflegter Zählstand** — laufende Zahlen gehören in den Quality-Snapshot.

- `datenpunkt_id` ist nahezu leer (Einzelfälle), also als Auftritts-Identifikator faktisch ungenutzt.
- Auf Objektebene (Folio) tragen rund 40 % der Objekte gleichzeitig Werk + Ort + Person + Institution — der Auftrittsknoten ist datengedeckt, nur nicht ausgezeichnet.
- Mehrdeutigkeit innerhalb des Folios ist real: ein nennenswerter Teil der Auftritts-Folios führt mehr als ein Werk bzw. mehr als einen Ort (z. B. „Bayreuth 1951–53" und „Salzburg 1956" auf einem Folio, beide „gastspiel").
- Rolle `gastspiel` ist mehrfach belegt und hängt inkonsistent an `institution`, `werk` und `ort, datum` — ein Modus, kein Entitätsattribut. Das Neapel-Beispiel der Partner ist konkret vorhanden (Teatro di San Carlo, Rheingold/Walküre).
- Personennamen folgen ganz überwiegend „Nachname, Vorname"; die Minderheit der Ausnahmen sind Mononyme, Partikel/Titel (van Beethoven vs. Della Casa, Graf von, Dr., III.), Initialen/Pressekürzel und falsch herum erfasste Namen.
- Institutionen tragen für gut die Hälfte einen Sitz (`ort`) im Organisationsindex — Grundlage für „auswärts vs. am Haus".
- Nebenbefund Datenqualität: Der Organisationsindex hat einen Header-Shift (zweite Spalte als „graz" statt „name") — separat prüfen.

## Offene Fragen ans Team (für das Treffen)

1. Ist das Vergeben einer Auftritts-Nummer (`datenpunkt_id`) beim Erfassen praktikabel?
2. Wie unterscheidet ihr in der Quelle eine Ensemble-Tournee von einem Solo-Gastspiel — und welche Trennschärfe braucht ihr in der Visualisierung?
3. Welche 2–3 Leitfragen stellt ihr am häufigsten ans Material?
4. Wäre eine Umstellung auf Auswahllisten (Name aus Index statt Freitext) im Erfassungsalltag tragbar?
