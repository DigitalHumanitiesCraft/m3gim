# Bericht — M³GIM Session-Übersicht

> Temporäres Arbeitsdokument (Stand 2026-06-24). Vollständige Übersicht über alles, was in dieser Session besprochen wurde: Projektstand, die vier Partner-Fragen mit echten Beispielen, der dokumentzentrierte Befund, das beschlossene Auftritts-Occurrence-Modell, die Modellierungs-Diskussion, die Erfassungs- und Visualisierungs-Themen, die Datenmodell-Hygiene und die offenen Team-Entscheidungen. Nicht für den Commit gedacht; die kanonischen Inhalte liegen bereits in `knowledge/`.

---

## 1. Projektstand (Code und Daten)

- Branch `main` sauber. Die Milestone-Serie **M1–M4** ist eingespielt: Datengrundlage (alle Index-Felder ins Frontend), Loader-Anreicherung, Verknüpfungen-Tab (heterogener Graph), Cross-View-Filter. Entscheidungs-Log bis E-125.
- Tests real geprüft: JS-Frontend grün. Python-Suite grün bis auf eine **bewusst rote Datenlücke** (NIM_168, quellseitig zu fixen) und zwei **Umgebungsartefakte** (Partitur-Derivate ohne `build-views`-Lauf, fehlendes `playwright` für den Smoke-Test) — keine echten Code-Defekte.
- Der Datenbestand ist durch M1 deutlich gewachsen (JSON-LD jetzt rund 1.974 Graph-Knoten, u. a. 895 Records, 724 Performances, 190 StageRoles, 125 SpatiotemporalEvents). `docs/data` und `data/output` sind in sync.
- Der Quality-Snapshot (2026-06-18) liegt vor der M1-Expansion und ist **veraltet** (nennt noch 378 Records). Ein frischer Pipeline-Lauf frischt ihn auf und macht zugleich die Partitur-Tests lokal grün.

---

## 2. Die vier Partner-Fragen (mit echten Beispielen)

Drei der vier Fragen (1, 3, 4) haben dieselbe Wurzel: Die Verknüpfungstabelle schreibt alles als Freitext aus und bündelt zusammengehörige Zeilen nicht zu einem Auftritt. Lösungskette **bündeln → referenzieren → differenzieren → verbinden**.

### Frage 1 — Gastspiele differenziert sehen

Drei Fälle trennen: Ensemble-Tournee (Bayreuth in Neapel), „normale" Inszenierung ohne Gastspiel, Auftritt in Bayreuth während der Festspiele.

Befund aus den echten Daten: `gastspiel` hängt im Bestand als Rolle an **sechs** verschiedenen Typen (`ort, datum`, `institution`, `werk`, `ort`, `ensemble`, `rolle`). Beispiel Neapel (`NIM_136`, Folio 100_24): `Neapel` als `auffuehrungsort`, `Teatro di San Carlo` als `institution` mit Rolle `gastspiel`. Gastspiel ist also kein Attribut einer Sache, sondern der **Modus des Auftritts**.

Empfehlung: Gastspiel/Tournee in ein eigenes Feld `modus`. Auswärts gegen am Haus leitet das Tool aus Ort gegen Institutionssitz automatisch ab; Ensemble-Tournee gegen Solo-Gastspiel steht nur in der Quelle und muss erfasst werden.

### Frage 2 — Drop-downs übertragen sich nicht

Reine Google-Sheets-Mechanik: Eine Datenvalidierung gilt nur für den Bereich, auf den sie angewandt wurde. Hebel: Validierung auf die ganze Spalte legen oder die Quelle „aus einem Bereich" beziehen; bestehende Werte werden markiert, nie überschrieben. (Tab-übergreifend siehe Abschnitt 6.)

### Frage 3 — Komma und „richtiger Typ" (Zeile 1533)

Das Komma bedeutet heute drei Dinge gleichzeitig:

- `Knappertsbusch, Hans` (typ `person`) — Nachname / Vorname
- `Neapel, 1952-12-12` (typ `ort, datum`) — Ort / Datum
- `Siegfried, Bernd Aldenoff` (typ `rolle, Vorname Nachname Sänger*in`) — Partie / Sänger, Name hier umgekehrt

Zeile 1533 ist real `typ=werk, name=Tristan und Isolde, rolle=gastspiel`. Nach heutiger Regel = `gastspiel`, aber „Gastspiel oder Aufführung" ist eine falsche Wahl (Aufführung ist die Handlung, Gastspiel der Modus). Das Komma-Problem verschwindet, sobald Namen als Index-ID referenziert statt getippt werden.

### Frage 4 — Die verbindende Visualisierung

Gewünscht: eine filterbare Ebene, die Personen, Orte, Werke, Institutionen verbindet, Einzelansichten erkennbar und abschaltbar.

Status: gebaut — Verknüpfungen-Tab + Cross-View-Filter (M3/M4). Ehrliche Grenze: zeigt heute „im selben Dokument genannt", noch nicht belastbar „im selben Auftritt mitgewirkt".

---

## 3. Der gemeinsame Kern: dokumentzentrierte Annotation

Die Annotation ist **dokumentzentriert**. Bündelt ein Dokument mehrere Auftritte, verteilen sich deren Aussagen flach am Record, und wer was in welchem Auftritt getan hat, ist nicht rekonstruierbar — die Annotation belegt „kommt im Dokument vor", nicht „wer hat was getan".

Belegfall `UAKUG/NIM_011` Folio 5 — ein Brief, der ein Tristan-Gastspiel der Bayreuther in Brüssel und Barcelona beschreibt, also **zwei Auftritte** (belegt durch zwei getrennte Reisen: Bahn nach Brüssel, Flug nach Barcelona).

Was der Record heute strukturell bindet:

- `hasAssociatedAgent` (flach): Wieland Wagner, Malaniuk, Keilberth, Jochum, Bayreuther Festspiele, Bayreuther Ensemble
- `hasOrHadLocation` (flach): Bayreuth (absendeort), Brüssel, Barcelona
- `hasSpatiotemporalEvent`: **ein** Knoten, der nur auf **Bayreuth** (absendeort) zeigt — also am Auftrittsort vorbei
- `hasPerformance`: **ein** Knoten mit nur der Partie Brangäne, ohne Werk-, Orts-, Datums- oder Personenbindung

Verloren geht dadurch: welcher Dirigent zu welcher Stadt gehört, ob Brangäne in beiden Städten gesungen wurde, welche Gage zu welchem Auftritt zählt. Die zwei Auftritte sind verschmolzen.

---

## 4. Die Lösung: Auftritts-Occurrence (Entscheidung E-125)

**Original (Spalte `datenpunkt_id` leer):**

| typ | name | rolle |
|---|---|---|
| person | Wagner, Wieland | verfasser:in |
| person | Malaniuk, Ira | adressat:in |
| person | Keilberth, Joseph | dirigent:in |
| person | Jochum, Eugen | dirigent:in |
| Datum | 1954-05-03 | Erstelldatum |
| ort | Bayreuth | absendeort |
| ort | Brüssel | gastspiel |
| ort | Barcelona | gastspiel |
| institution | Bayreuther Festspiele | gastspiel |
| werk | Tristan und Isolde | gastspiel |
| rolle | Brangäne | gastspiel |
| summe, währung | 1200 | abendgage _(Bahn Brüssel)_ |
| summe, währung | 1200 | abendgage _(Flug Barcelona)_ |
| ensemble | Bayreuther Ensemble | gastspiel |

**Ideal (mit `datenpunkt_id` gebündelt, leer = Dokument, 1/2 = Auftritte):**

| datenpunkt_id | typ | name | rolle | modus |
|---|---|---|---|---|
| _leer_ | person | Wagner, Wieland | verfasser | |
| _leer_ | person | Malaniuk, Ira | adressat | |
| _leer_ | datum | 1954-05-03 | erstelldatum | |
| _leer_ | ort | Bayreuth | absendeort | |
| _leer_ | person | Keilberth, Joseph | dirigent | _(Stadt unklar)_ |
| _leer_ | person | Jochum, Eugen | dirigent | _(Stadt unklar)_ |
| 1 | ort | Brüssel | auffuehrungsort | |
| 1 | werk | Tristan und Isolde | aufführung | gastspiel |
| 1 | rolle | Brangäne | interpret | |
| 1 | institution | Bayreuther Festspiele | veranstalter | |
| 1 | summe, währung | 1200 | abendgage | _(Bahn)_ |
| 2 | ort | Barcelona | auffuehrungsort | |
| 2 | werk | Tristan und Isolde | aufführung | gastspiel |
| 2 | rolle | Brangäne | interpret | |
| 2 | institution | Bayreuther Festspiele | veranstalter | |
| 2 | summe, währung | 1200 | abendgage | _(Flug)_ |

**Das Modell:**

- `m3gim:Occurrence` — Bündelknoten (Auftritt), Identität aus `(archivsignatur, folio, datenpunkt_id)`. Leer = Dokument-Default (auch Sammelbecken für nicht auflösbare Zuordnungen), Nummer = Auftritt.
- Die bestehenden Aspekt-Klassen werden Facetten: `SpatiotemporalEvent` (Wo/Wann), `Performance` (Was/Wer), `DetailAnnotation` (Betrag).
- `m3gim:attests` — der Record **bezeugt** die Occurrence (CIDOC-CRM-`P70`-Logik), statt sie zu enthalten. Damit ist der spätere Schritt zu dokumentübergreifender Auftritts-Identität ein ID-Hochstufen, kein Remodeling.
- `m3gim:mode` — Gastspiel/Tournee an der Occurrence statt als Rolle.

Modell und Erfassungskonvention sind in `knowledge/data.md` (§ 4/7/9) und `knowledge/data-entry-guidelines.md` verankert; die Pipeline-Umsetzung steht testgetrieben aus.

---

## 5. Die Modellierungs-Diskussion (Hintergrund zur Entscheidung)

- **n-äre Reifikation.** Der Occurrence-Knoten ist das klassische n-äre Relations-Muster — ein Join-Punkt, an dem zusammengehörige Aussagen zusammenlaufen. Das Modell nutzt dieses Muster bereits bei den AgRelOn-Beziehungen und den Event-Klassen.
- **„Event" ist zu eng.** Das Modell hat schon vier `rico:Event`-Subtypen (`SpatiotemporalEvent`, `Performance`, `PerformanceEvent`, `DatedEvent`), jeder fängt **einen Aspekt** einer Quellzelle. Der Bündelknoten liegt eine Ebene darüber. Der Name **Occurrence** ist bewusst weiter, weil nicht jedes Vorkommnis raumzeitlich ist (etwa ein Vertrag).
- **CIDOC-Bezug.** CIDOC CRM ist aktivitätszentriert: die E7 Activity ist genau der Hub, an dem Akteure, Ort, Zeit und Werke hängen. RiC-O dagegen ist record-zentriert — daher die eingebaute Dokumentzentrierung. Die Lösung ist hybrid: RiC-O bleibt die Archivschicht, ein Occurrence-Knoten kommt als Join-Ebene dazu.
- **Designgabel.** (a) Occurrence pro Dokument (sofort über `datenpunkt_id` baubar) gegen (b) dokumentübergreifende Auftritts-Entität mit eigener ID. Empfehlung: (a) jetzt, aber die Relation als **Bezeugung** anlegen, damit (b) später nur ein ID-Hochstufen ist.

---

## 6. Erfassungs-Themen

- **Bündeln** — `datenpunkt_id` füllen (Abschnitt 4). Einziger Punkt mit echtem Erfassungs-Mehraufwand.
- **Referenzieren** — Namen über Auswahllisten als Index-ID führen statt auszuschreiben, schrittweise ab den Personen. Beseitigt das überladene Komma und die Person-Organisation-Kollision.
- **Dropdown-Werte Tab-übergreifend** — die Validierung aller Box-Tabs auf **denselben benannten Bereich** (Vokabular-Hilfsblatt) zeigen lassen; ein neuer Listeneintrag greift dann in allen Boxen. Die Validierungsregel selbst wird je Tab einmal gesetzt.
- **Neues Datenfeld (neue Spalte) über alle Boxen** — propagiert **nicht** automatisch, muss je Box ergänzt werden. Grundlösung: die Boxen zu **einem** Verknüpfungs-Sheet zusammenführen (die Pipeline liest sie ohnehin als Union, E-95).

---

## 7. Datenmodell-Hygiene (Konformitätswelle 2)

Als offene Modellentscheidung in `knowledge/decisions.md` festgehalten, geplant nach dem Occurrence-Umbau.

- **Daten- und Ontologie-Ebene im selben Namespace.** Heute teilen sich Instanzen (`m3gim:NIM_011_5`), Properties (`m3gim:hasPerformance`) und Klassen (`m3gim:SpatiotemporalEvent`) denselben Namespace `m3gim:` (rund 4.545 Instanz-IDs, 53 Properties, 7 Klassen). Unterscheidbar sind die Ebenen nur über die Konvention (Klassen PascalCase, Properties camelCase, Instanzen tragen IDs), nicht über den Namespace. Das Dokumenttyp- und das Rollenvokabular liegen dagegen schon sauber in eigenen Namespaces (`m3gim-dft:`, `m3gim-role:`). Empfehlung: Instanzen abspalten (etwa `m3gim-id:`), sodass `m3gim:` reine Ontologie bleibt — wie RiC-O selbst trennt.
- **Sprach-Mix in den Property-Namen.** Teils deutsch (`bearbeitungsstand`, `sitz`, `partie`, die `*datum`-Familie), teils englisch (`hasPerformance`, `atDate`, `monetaryAmount`). Empfehlung: Term-Namen durchgängig englisch (anschlussfähig zu `rico:`/`agrelon:`/`schema:`/`gndo:`), Werte deutsch als SKOS-`prefLabel`. Die deutschen `*datum`-Properties zuerst gegen das englische `atDate`/`dateRole`-Modell auf Redundanz prüfen — dann ist der Cleanup zugleich Sprach- und Redundanz-Fix.

---

## 8. Interface- und Visualisierungs-Befunde und TODOs

### Filter-Funktion (Befund am Code)

Die Facetten **lassen sich kombinieren**, und zwar UND-verknüpft — es ist nicht „nur eine Entität". Aber mit zwei realen Grenzen:

- **Bestand und Chronik** wenden fünf Facetten als UND-Filter an (Suche, Dokumenttyp, Person, Ort, Werk) — gleichzeitig kombinierbar.
- **Verknüpfungen-Tab** kombiniert eine Fokus-Entität plus Ort, Zeitfenster, Schärfegrad und Knotentyp-Schalter.
- Grenze 1: **je Facette nur ein Wert** (Single-Select), kein ODER innerhalb einer Facette.
- Grenze 2: **eine Fokus-Entität** im Graph, keine zwei gleichrangigen.
- Vorbehalt: Das kombinierte Ergebnis ist heute Dokument-Ko-Okkurrenz („beide im Dokument genannt"), nicht „zusammen aufgetreten" — erst die Occurrence-Bündelung macht daraus „im selben Auftritt".

### TODOs (in `knowledge/plan.md` § Interface-Ausbau eingetragen)

- **Indizes-Seite optimieren** (Personen-, Orts-, Organisations-, Werkindex); konkrete Punkte noch zu schärfen.
- **Facetten-/Filter-Funktion ausbauen** — Mehrfachauswahl bzw. ODER innerhalb einer Facette, einheitliche Filter-UX über die Views.
- **Statistik-Tab Aggregat→Quelle-Durchstich** — aggregierte Werte (etwa „gastspiel 22") klickbar machen und die belegenden Dokumente auflisten, analog Chronik (E-124) und Mobilität.
- **Karten-Ansicht entitätszentriert erweitern** — Institutionsfilter (etwa Bayreuther Festspiele) zeigt die zugehörigen Orte als **Punkte**, **nicht** als Reisepfeile zwischen Orten. Je Ort die Personen, Werke, Dokumente und die zeitliche Dimension auflösen (Orts-, Werk-, Personen-Ebene). Ergänzt die biografische Trajektorienkarte (E-111) um eine WO-und-wer-Sicht; braucht `institution` als zusätzliche Filter-Facette (heute nicht in `FILTER_FACETS`).

---

## 9. Was im Knowledge festgehalten wurde

- `partner-fragen-2026-06.md` gelöscht; Inhalt in die kanonischen Dokumente verteilt.
- `data.md` — Occurrence-Modell (§ 4 Bündelung, § 7 Klasse/Relationen/Identität, § 9 `datenpunktId`-Hochstufung).
- `data-entry-guidelines.md` — Erfassungskonvention mit dem Folio-5-Beispiel.
- `decisions.md` — E-125 (Occurrence) plus Ontologie-Hygiene als offene Modellentscheidung.
- `plan.md` — Roadmap-Linie (bündeln/referenzieren/differenzieren/verbinden), vier Interface-TODOs, Box-Sheet-Quellfix erweitert.
- `INDEX.md`, `use-cases.md` — Querverweise nachgezogen.

---

## 10. Offene Entscheidungen fürs Team

- Ist das Vergeben einer Auftritts-Nummer (`datenpunkt_id`) im Erfassungsalltag praktikabel?
- Wie unterscheidet ihr in der Quelle Ensemble-Tournee von Solo-Gastspiel, und welche Trennschärfe braucht ihr in der Visualisierung?
- Wäre die Umstellung auf Auswahllisten (Name aus Index statt Freitext) tragbar?
- Deutsche Bezeichnung für `m3gim:Occurrence` (Auftritt oder Datenpunkt)?
- Eure 2–3 typischen Leitfragen ans Material — sie sind die Spezifikation für Filter und Karte.

---

## 11. Offene Prozess-Punkte (nächste Schritte)

Diese vier Punkte bestimmen, was als Nächstes passiert, und brauchen eine Richtungsentscheidung.

- **Nächste Aufgabe und Lane.** Occurrence-Pipeline umsetzen (Backend, testgetrieben), einen Frontend-TODO angehen (Karten-Institutionsfilter, Statistik-Durchstich, Filter-Mehrfachauswahl), oder bei Knowledge bleiben. Pro Session nur eine Lane, die Arbeit verteilt sich auf alle drei.
- **Meeting-Ergebnisse einarbeiten.** Beschlüsse zu den vier Team-Fragen (Abschnitt 10) in die Spec überführen, sobald sie vorliegen — die „offen"-Marker in E-125 und den offenen Modellentscheidungen entsprechend auf „entschieden" stellen.
- **`modus` als echte Spalte.** Bestätigen, ob die Verknüpfungstabelle eine `modus`-Spalte bekommt oder Gastspiel/Tournee anders kodiert wird; danach Konvention und Folio-5-Beispiel angleichen.
- **Quality-Snapshot auffrischen.** Pipeline-Lauf, damit der Snapshot wieder zum gewachsenen Datenstand passt (korrigiert zugleich die lokalen Partitur-Tests).

---

## Anhang — Technischer Stand

- Lokaler Server für die App: `python -m http.server 8000 --directory docs`, erreichbar unter http://localhost:8000/.
- Relevante Tabs: `#verknuepfungen` (heterogener Graph), `#karte` (Trajektorie), `#statistik` (Dashboard), `#netzwerk`.
- Pipeline: `python scripts/transform.py` dann `python scripts/build-views.py`.
