# M³GIM Quality-Snapshot

_Laufzeit des Reports: 2026-09-06T10:34+02:00_

Grundlage: `data/output/m3gim.jsonld` + `data/output/wikidata-reconciliation.json`.

## Gezählte Menge

Alle Zahlen dieses Reports beziehen sich auf **997 Records**. Der Graph führt **1007** Knoten vom Typ `rico:Record`; die Differenz von 10 sind 3 Folio-Platzhalter, entstanden aus innerhalb eines Konvoluts wiederholten Kopfzeilen der Objekttabelle, deren Folio-Zelle den Text „Folio“ trägt, und 7 Foliodatensätze, die die Pipeline über den Seiten eines Blattes bildet. Weder die einen noch die anderen tragen eine eigene Erschließung und zählen deshalb nicht mit.

| Platzhalter | Quellzeile |
|---|---:|
| UAKUG/NIM_003 Folio | Objekte 30 |
| UAKUG/NIM_004 Folio | Objekte 41 |
| UAKUG/NIM_007 Folio | Objekte 116 |

## Verknüpfungsrate

- **188/997** Records mit mindestens einer Verknüpfung = **19%**

### Konvolute mit mehreren Folios

| Konvolut | Records | verlinkt | Rate |
|---|---:|---:|---:|
| UAKUG/NIM_003 | 10 | 3 | 30% |
| UAKUG/NIM_004 | 34 | 32 | 94% |
| UAKUG/NIM_005 | 30 | 16 | 53% |
| UAKUG/NIM_006 | 10 | 0 | 0% |
| UAKUG/NIM_007 | 29 | 28 | 97% |
| UAKUG/NIM_008 | 41 | 0 | 0% |
| UAKUG/NIM_011 | 22 | 21 | 95% |
| UAKUG/NIM_016 | 20 | 19 | 95% |
| UAKUG/NIM_022 | 7 | 3 | 43% |
| UAKUG/NIM_023 | 15 | 13 | 87% |
| UAKUG/NIM_043 | 14 | 0 | 0% |
| UAKUG/NIM_073 | 48 | 5 | 10% |
| UAKUG/NIM_134 | 86 | 4 | 5% |
| UAKUG/NIM_135 | 149 | 6 | 4% |
| UAKUG/NIM_136 | 38 | 3 | 8% |
| UAKUG/NIM_137 | 59 | 17 | 29% |
| UAKUG/NIM_139 | 158 | 11 | 7% |
| UAKUG/NIM_142 | 37 | 7 | 19% |
| UAKUG/NIM_168 | 2 | 0 | 0% |

### Einzelobjekte (aggregiert)

- **0/188** Einzelobjekte verlinkt (0%), verteilt auf 188 Signaturen (Plakate, Tonträger, Einzelstücke).

## Bearbeitungsstand

| Status | Records |
|---|---:|
| (leer) | 493 |
| zurueckgestellt | 317 |
| abgeschlossen | 144 |
| begonnen | 43 |

## Wikidata-Coverage

- 430 gematcht, 171 kein Match, 13 übersprungen (bereits mit Q-ID oder zu kurz)

### Nach Typ + Konfidenz

| Typ | exact | fuzzy_high | fuzzy_low | gesamt |
|---|---:|---:|---:|---:|
| person | 4 | 166 | 0 | 170 |
| org | 2 | 5 | 0 | 7 |
| location | 26 | 5 | 0 | 31 |
| work | 10 | 3 | 0 | 13 |

### Low-Confidence-Matches (manuelle Freigabe erforderlich)

**0 Matches mit Score 80–89** — prüfen, ob sie tatsächlich das korrekte Wikidata-Objekt treffen. Freigegebene Einträge manuell als `manual_review: approved` markieren.

_Keine Low-Confidence-Matches in diesem Lauf._

## Provenance-Coverage

- Records mit `m3gim-ontology:xlsxSource`: **997/997** (100%)
- Records mit provenienz-belegten Ereignissen (`agrelon:metadataProvenance` auf Annotation/AgRelOn): **151/997** (15%)
- Nested Entities (Details + AgRelOn) mit `xlsxSource`: **127/127** (100%)

## Externe Blocker (zur Klärung mit Erschließungsteam)

1. **`UAKUG/NIM/PL_07` Duplikat** im Google Sheet bereinigen — aktuell xfail in `test_05_referential.py`.
2. **Verwaiste Signatur `UAKUG/NIM_11`**: tritt in Verknüpfungen auf, existiert aber nicht in `M3GIM-Objekte.xlsx`. Mögliche Interpretation: Tippfehler (`NIM_110` / `NIM_111`?) oder fehlende Objektzeile nachpflegen.
3. **Header-Shifts** in drei Indizes (Organisationen, Orte, Werke): Erste Datenzeile wird als Header gelesen. Pipeline kompensiert via `HEADER_SHIFTS`-Mapping in `scripts/transform.py` — sollte im Google Sheet gefixt werden, damit die Normalform sauber ist.

