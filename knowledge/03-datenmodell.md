# Datenmodell (v2.4)

> Dreischichtenmodell für archivalische Erschließung mit Folio-Granularität

---

## Schichten

- **Schicht 1 (obligatorisch):** Kernmetadaten — archivsignatur, titel, entstehungsdatum (ISO 8601), dokumenttyp, sprache, umfang. `zugaenglichkeit` und `scan_status` jetzt empfohlen statt obligatorisch.
- **Schicht 2 (empfohlen):** Verknüpfungen mit Folio-Granularität — typ: person/ort/institution/ereignis/werk/detail/rolle/datum, jeweils mit Rolle und optionalem Folio.
- **Schicht 3 (fakultativ):** Quellentyp-spezifische Details via typ `detail` in der Verknüpfungstabelle.

---

## Google Sheets (6 Tabellen)

| Tabelle | Farbe | Records |
|---|---|---|
| M3GIM-Objekte | blau | 283 |
| M3GIM-Verknüpfungen | grün | 1.292 |
| Personenindex | violett | 296 |
| Organisationsindex | violett | 58 |
| Ortsindex | violett | 31 |
| Werkindex | violett | 95 |

---

## Folio-Granularität (v2.3+)

Verknüpfungen referenzieren einzelne Seiten innerhalb von Sammlungsobjekten:
- NIM_003: 35 Verknüpfungen
- NIM_004: 795 Verknüpfungen auf 45 Folios
- NIM_007: 426 Verknüpfungen

---

## Komposit-Typen (v2.3+)

Erfassungsteam nutzt zusammengesetzte Typen: `ort, datum` (48x), `ausgaben, waehrung` (11x), `einnahmen, waehrung` (8x), `ereignis, ort, datum` (1x). Pipeline decomponiert diese beim Import.

---

## Vokabulare

### Typ-Vokabular

Basis: person, ort, institution, ereignis, werk, detail. Neu in v2.3: rolle (215x), datum (74x). Komposit: ort,datum · ausgaben,waehrung · einnahmen,waehrung · summe,waehrung · ereignis,ort,datum · ensemble.

### Rollen-Vokabular (58 Werte)

Gender-inklusive `:in`-Form. Top-10: sänger:in (161), dirigent:in (36), pianist:in (7), komponist:in (5), regisseur:in (5).

### Dokumenttyp-Vokabular (19 Werte)

korrespondenz · vertrag · presse · programm · plakat · tontraeger · autobiografie · identitaetsdokument · studienunterlagen · repertoire · sammlung · konzertprogramm · tagebuch · notizbuch · urkunde · zeugnis · lebenslauf · widmung.

---

## Entitätsindizes

| Index | Records | Wikidata | Besonderheiten |
|---|---|---|---|
| Personenindex | 296 | 3 (1%) | anmerkung als de-facto-Kategorie (257/296 kategorisiert) |
| Organisationsindex | 58 | 4 (7%) | Spaltennamen-Shift ("Graz" statt "name"), Doppel-IDs O43/O44 |
| Ortsindex | 31 | 0 (0%) | Kein ID-Header, keine Koordinaten, 6 fehlende Orte |
| Werkindex | 95 | 4 (4%) | Spaltennamen-Shift ("Rossini" statt "titel"), 10 ohne ID |

---

Siehe auch: [→ Quellenbestand](02-quellenbestand.md) · [→ Architektur](04-architektur.md) · [→ Visualisierungen](06-visualisierungen.md)
