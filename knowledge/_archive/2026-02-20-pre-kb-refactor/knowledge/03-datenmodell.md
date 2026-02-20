# Datenmodell (v2.5)

> Dreischichtenmodell für archivalische Erschließung mit Folio-Granularität und Konvolut-Hierarchie

---

## Schichten

- **Schicht 1 (obligatorisch):** Kernmetadaten — archivsignatur, titel, entstehungsdatum (ISO 8601), dokumenttyp, sprache, umfang. `zugaenglichkeit` und `scan_status` jetzt empfohlen statt obligatorisch.
- **Schicht 2 (empfohlen):** Verknüpfungen mit Folio-Granularität — typ: person/ort/institution/ereignis/werk/rolle/datum/ensemble, jeweils mit Rolle und optionalem Folio.
- **Schicht 3 (fakultativ):** Quellentyp-spezifische Details via typ `detail` in der Verknüpfungstabelle.

---

## Google Sheets (6 Tabellen)

| Tabelle | Farbe | Records | Spalten |
|---|---|---|---|
| M3GIM-Objekte | blau | 282 | 18 |
| M3GIM-Verknüpfungen | grün | 1.264 | 6 (archivsignatur, Folio, typ, name, rolle, anmerkung) |
| Personenindex | violett | 296 | 6 |
| Organisationsindex | violett | 58 | 6 |
| Ortsindex | violett | 31 | 3 |
| Werkindex | violett | 95 | 6 |

---

## Konvolut-Hierarchie

Objekte können Konvolute (Sammlungsobjekte) sein. Die vollständige Objekt-ID setzt sich zusammen aus zwei Spalten:

- **archivsignatur** = Konvolut-ID (z.B. `UAKUG/NIM_003`)
- **Folio** = Stelle im Konvolut (z.B. `1_1`)
- **Objekt-ID** = `archivsignatur + " " + folio` → `UAKUG/NIM_003 1_1`

Bei Nicht-Konvoluten ist Folio leer, die archivsignatur allein ist die ID.

In der Objekte-Tabelle heißt die Folio-Spalte aktuell `Unnamed: 2` (fehlender Header). In der Verknüpfungstabelle heißt sie `Folio`.

---

## Verknüpfungs-Mechanismus

Verknüpfungen referenzieren Entitäten über **String-Matching** in der `name`-Spalte. Die `typ`-Spalte bestimmt den Ziel-Index:

| typ | name (Beispiel) | Ziel |
|---|---|---|
| person | Strauss, Richard | Personenindex |
| werk | Macbeth | Werkindex |
| ort | New York | Ortsindex |
| institution | Wiener Staatsoper | Organisationsindex |
| rolle | Carmen | Opernrolle (kein Index) |
| datum | 1958-04-18 | Kontextuell (kein Index) |
| ereignis | Premiere | Kontextuell (kein Index) |
| ensemble | | Ensemble (kein Index) |

IDs in den Indizes (O1–O63, W1–W95 etc.) sind **Durchzählungen**, keine Verknüpfungs-Schlüssel.

---

## Komposit-Typen

Erfassungsteam nutzt zusammengesetzte Typen: `ort, datum` (48x), `ausgaben, waehrung` (11x), `einnahmen, waehrung` (8x), `summe, waehrung`, `ereignis, ort, datum` (1x). Pipeline decomponiert diese beim Import.

---

## Vokabulare

### Typ-Vokabular

Basis: person, ort, institution, ereignis, werk, rolle, datum. Komposit: ort,datum · ausgaben,waehrung · einnahmen,waehrung · summe,waehrung · ereignis,ort,datum · ensemble.

### Rollen-Vokabular (58 Werte)

Gender-inklusive `:in`-Form. Top-10: sänger:in (161), dirigent:in (36), pianist:in (7), komponist:in (5), regisseur:in (5). Pipeline normalisiert Case (z.B. `Sänger:in` → `sänger:in`).

### Dokumenttyp-Vokabular (25 Werte)

korrespondenz · vertrag · presse · programm · plakat · tontraeger · autobiografie · identitaetsdokument · studienunterlagen · repertoire · sammlung · konzertprogramm · tagebuch · notizbuch · urkunde · zeugnis · lebenslauf · widmung · biographie · notiz · photokopie · quittung · rezension · typoskript · visitenkarte.

### Bearbeitungsstand (3 Werte)

`vollständig` · `in bearbeitung` · `offen`. Pipeline normalisiert aus 9 Schreibvarianten (Case, Tippfehler, Whitespace).

---

## Entitätsindizes

| Index | Records | Besonderheiten |
|---|---|---|
| Personenindex | 296 | anmerkung als de-facto-Kategorie (257/296 kategorisiert, 80 Werte) |
| Organisationsindex | 58 | Header-Shift ("Graz" statt "name"), IDs O1–O63 |
| Ortsindex | 31 | Header-Shift ("Unnamed: 0" statt "m3gim_id"), keine wikidata_id-Spalte |
| Werkindex | 95 | Header-Shift ("Rossini" statt "titel", "Barber" statt "komponist") |

Wikidata-IDs werden nicht manuell erfasst, sondern via Reconciliation-Workflow (siehe [→ Quellenbestand](02-quellenbestand.md)).

---

## Pipeline-Normalisierung

Die Pipeline korrigiert folgende Probleme automatisch beim Import:

| Was | Wie |
|---|---|
| Header-Shifts in 3 Indizes | Spaltennamen-Mapping |
| Case-Inkonsistenzen (typ, rolle, dokumenttyp, bearbeitungsstand) | `.lower().strip()` |
| Excel-Datetime-Artefakte (`00:00:00`) | Zeitanteil abstreifen |
| Leere Zeilen in Verknüpfungen | Überspringen |
| Komposit-Typen | Decomposition in separate Verknüpfungen |
| Template-Zeilen (archivsignatur="beispiel") | Filtern |

---

Siehe auch: [→ Quellenbestand](02-quellenbestand.md) · [→ Architektur](04-architektur.md) · [→ Visualisierungen](06-visualisierungen.md)
