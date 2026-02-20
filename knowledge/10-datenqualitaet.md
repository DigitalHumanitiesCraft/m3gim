# Datenqualitaet — Audit-Ergebnisse

> Systematische Analyse der Google-Sheets-Daten gegen die Pipeline-Outputs. Basis: Excel-Export vom Februar 2026, Pipeline-Audit vom 2026-02-20.

Stand: 2026-02-20

---

## Ueberblick

282 Objekte, 1246 effektive Verknuepfungen (nach Abzug von 45 Leerzeilen und 1 Template-Zeile), 4 Indizes (296 Personen, 58 Organisationen, 31 Orte, 95 Werke).

Die Pipeline verarbeitet die Daten korrekt — alle gefundenen Code-Bugs wurden behoben. Die verbleibenden Probleme sind **Datenerfassungsprobleme**, die im Google Sheet geloest werden muessen.

---

## Kritisch — Datenverlust

### Verknuepfungen ohne Archivsignatur (8 Zeilen)

8 Zeilen in der Verknuepfungen-Tabelle haben keine `archivsignatur`. Davon enthalten 3 echte Daten:

- Eine Zeile mit `name=Cox`, `typ=person`, `rolle=Briefpartner` — aber ohne Signatur nicht zuordenbar
- Eine Zeile mit `name=Wien`, `typ=ort` — nicht zuordenbar
- Eine Zeile mit `name=Basel`, `typ=ort`, plus Auffuehrungs-Datum — nicht zuordenbar

Diese 8 Verknuepfungen gehen in der Pipeline verloren, weil sie keinem Record zugeordnet werden koennen.

**Handlungsbedarf:** Signaturen in der Verknuepfungen-Tabelle nachtragen.

### Verknuepfungen ohne Typ (5 Zeilen)

5 Zeilen in NIM_004 Folio 32 haben `name`-Eintraege aber keinen `typ` (person/institution/ort/werk). Ohne Typ kann die Pipeline nicht entscheiden, in welche Relation die Verknuepfung gehoert.

**Handlungsbedarf:** Typ-Spalte fuer diese 5 Zeilen nachtragen.

### PL_07 Duplikat (1 Fehler)

Die Signatur `UAKUG/NIM/PL_07` erscheint zweimal in der Objekte-Tabelle. validate.py meldet das als einzigen echten Fehler. Eines der beiden Duplikate muss entfernt oder korrigiert werden.

**Handlungsbedarf:** Duplikat im Google Sheet pruefen und bereinigen.

---

## Hoch — Unvollstaendige Erfassung

### Bearbeitungsstand fehlt bei 213 von 282 Objekten

Nur 69 Objekte haben einen Wert in der Spalte `Bearbeitungsstand`. Ausserdem gibt es Case-Inkonsistenzen und Tippfehler:

- `vollständig` vs `Vollständig` vs `vollstädig` (Tippfehler)
- `begonnen` vs `Begonnen`
- `in bearbeitung` vs `in Bearbeitung`

Die Pipeline normalisiert die Schreibweise automatisch (Kleinschreibung, Trim), aber der Tippfehler `vollstädig` wird nicht korrigiert.

**Handlungsbedarf:** Einheitliche Schreibweise vereinbaren (Vorschlag: `vollstaendig`, `in bearbeitung`, `offen`). Alle 282 Objekte mit Bearbeitungsstand versehen. Tippfehler korrigieren.

### Nur 62 von 282 Objekten haben Verknuepfungen (22%)

220 Objekte haben keinerlei Verknuepfungen — keine Personen, keine Orte, keine Werke. Das bedeutet: 78% der Objekte erscheinen in keiner Visualisierung ausser der Partitur (Zeitleiste).

Die 3 verknuepften Konvolute (NIM_003, NIM_004, NIM_007) machen den Grossteil der 1246 Verknuepfungen aus.

**Handlungsbedarf:** Priorisierung der naechsten Verknuepfungs-Arbeit. Vorschlag: Objekte mit Bearbeitungsstand `vollstaendig` zuerst verknuepfen.

### 4 Objekte ohne Dokumenttyp

4 Objekte haben keinen Wert in der Spalte `dokumenttyp`. Dokumenttyp ist ein zentrales Klassifikationsfeld fuer die Partitur-Visualisierung.

**Handlungsbedarf:** Dokumenttypen nachtragen.

### 3 Objekte ohne Titel

3 Objekte haben keinen Wert in der Spalte `titel`. Der Titel erscheint in allen Visualisierungen als Primaer-Label.

**Handlungsbedarf:** Titel nachtragen.

---

## Mittel — Strukturelle Probleme im Google Sheet

### Header-Shifts in 3 von 4 Indizes

Die Indizes fuer Organisationen, Orte und Werke haben einen systematischen Fehler: Die erste Datenzeile wird als Spaltenueberschrift interpretiert. Beispiel Werkindex:

- Soll-Header: `m3gim_id, name, wikidata_id, komponist, rolle/stimme, anmerkung`
- Ist-Header: `m3gim_id, Rossini Gioachino, wikidata_id, Barber Samuel, rolle/stimme, anmerkung`

Die Pipeline korrigiert das automatisch (HEADER_SHIFTS-Mapping), aber die erste Datenzeile (z.B. Rossini) geht dabei verloren — sie wird als Header interpretiert und nicht als Daten verarbeitet.

Der Personenindex hat dieses Problem nicht.

**Handlungsbedarf:** In den 3 betroffenen Indizes eine echte Header-Zeile einfuegen (gleiche Spaltennamen wie im Personenindex). Die erste Datenzeile wird dann korrekt als Daten gelesen.

### Folio-Spalte ohne Header

Die dritte Spalte in der Objekte-Tabelle (nach `box_nr` und `archivsignatur`) hat keinen Spaltennamen. Pandas liest sie als `Unnamed: 2`. Diese Spalte enthaelt die Folio-Nummer bei Konvolut-Eintraegen (z.B. `1_1`, `2_1`).

Die Pipeline erkennt die Spalte korrekt ueber den Index, aber ein expliziter Header wuerde die Datenstruktur klarer machen.

**Handlungsbedarf:** Header `folio` fuer die dritte Spalte setzen.

---

## Niedrig — Anreicherungs-Luecken

### Wikidata-IDs fehlen bei 97% der Index-Eintraege

Von 480 Eintraegen in den 4 Indizes haben nur 11 eine Wikidata-ID:

- Personenindex: 3 von 296 (Malaniuk, Karajan, Boehm)
- Organisationsindex: 4 von 58
- Ortsindex: 0 von 31
- Werkindex: 4 von 95

Wikidata-IDs ermoeglichen die Verlinkung mit externen Wissensdatenbanken und sind fuer die Forschungsnachnutzung wichtig.

**Handlungsbedarf:** Wird durch `reconcile.py` (geplant) semi-automatisch geloest. Kein manueller Aufwand noetig — Reconciliation nach Abschluss der Erfassung.

### Sprache nur bei 74 von 282 Objekten erfasst

Nur 26% der Objekte haben einen Wert in der Spalte `sprache`. Die haeufigsten Werte: deutsch (62), englisch (5), franzoesisch (4), italienisch (1), gemischt (2).

**Handlungsbedarf:** Sprache nachtragen, insbesondere fuer bereits vollstaendig erfasste Objekte.

---

## Pipeline-seitig behoben (kein Handlungsbedarf)

Diese Probleme wurden im Pipeline-Code geloest und erfordern keine Aenderungen im Google Sheet:

- Case-Inkonsistenzen in typ, rolle, dokumenttyp — Pipeline normalisiert mit `.lower().strip()`
- Excel-Datetime-Artefakte (`00:00:00` an Datumsfeldern) — Pipeline streift Zeitanteil ab
- 45 leere Zeilen in Verknuepfungen — Pipeline ueberspringt sie
- 1 Template-Zeile in Verknuepfungen — Pipeline erkennt und ueberspringt sie
- Komposit-Typen (`ort,datum`, `person,rolle`) — Pipeline dekomponiert in Einzel-Relationen
- Header-Shifts in 3 Indizes — Pipeline korrigiert via HEADER_SHIFTS-Mapping (aber Datenzeile geht verloren, s.o.)

---

## Zusammenfassung der Handlungsbedarfe

Fuer das Meeting am 24. Februar:

**Sofort (vor weiterer Erfassung):**
- Header-Shifts in 3 Indizes korrigieren (Header-Zeile einfuegen)
- Folio-Spalte benennen
- PL_07 Duplikat bereinigen
- Bearbeitungsstand-Schreibweise vereinbaren

**Laufend (bei der Erfassung):**
- Verknuepfungen: Signatur und Typ immer ausfuellen
- Bearbeitungsstand fuer alle Objekte pflegen
- Fehlende Dokumenttypen und Titel nachtragen
- Sprache erfassen

**Nach Abschluss der Erfassung:**
- Wikidata-Reconciliation (`reconcile.py`)
- Verknuepfungs-Fortschritt pruefen (Ziel: >50% verknuepfte Objekte)

---

Siehe auch: [→ Quellenbestand](02-quellenbestand.md) · [→ Datenmodell](03-datenmodell.md) · [→ Architektur](04-architektur.md)
