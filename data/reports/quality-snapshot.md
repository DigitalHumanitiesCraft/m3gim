# M³GIM Quality-Snapshot

_Generiert: 2026-08-21T20:31_

Grundlage: `data\output\m3gim.jsonld` + `data\output\wikidata-reconciliation.json`.

## Verknüpfungsrate

- **147/892** Records mit mindestens einer Verknüpfung = **16%**

### Konvolute mit mehreren Folios

| Konvolut | Records | verlinkt | Rate |
|---|---:|---:|---:|
| UAKUG/NIM_003 | 10 | 3 | 30% |
| UAKUG/NIM_004 | 34 | 32 | 94% |
| UAKUG/NIM_005 | 30 | 2 | 7% |
| UAKUG/NIM_006 | 10 | 0 | 0% |
| UAKUG/NIM_007 | 29 | 28 | 97% |
| UAKUG/NIM_008 | 41 | 0 | 0% |
| UAKUG/NIM_011 | 22 | 21 | 95% |
| UAKUG/NIM_022 | 7 | 3 | 43% |
| UAKUG/NIM_023 | 15 | 13 | 87% |
| UAKUG/NIM_043 | 14 | 0 | 0% |
| UAKUG/NIM_073 | 47 | 5 | 11% |
| UAKUG/NIM_135 | 149 | 4 | 3% |
| UAKUG/NIM_136 | 38 | 3 | 8% |
| UAKUG/NIM_137 | 59 | 15 | 25% |
| UAKUG/NIM_139 | 158 | 11 | 7% |
| UAKUG/NIM_142 | 37 | 7 | 19% |
| UAKUG/NIM_168 | 2 | 0 | 0% |

### Einzelobjekte (aggregiert)

- **0/190** Einzelobjekte verlinkt (0%), verteilt auf 190 Signaturen (Plakate, Tonträger, Einzelstücke).

## Bearbeitungsstand

| Status | Records |
|---|---:|
| (leer) | 479 |
| zurueckgestellt | 253 |
| abgeschlossen | 122 |
| begonnen | 38 |

## Wikidata-Coverage

- 272 gematcht, 263 kein Match, 14 übersprungen (bereits mit Q-ID oder zu kurz)

### Nach Typ + Konfidenz

| Typ | exact | fuzzy_high | fuzzy_low | gesamt |
|---|---:|---:|---:|---:|
| person | 5 | 190 | 1 | 196 |
| org | 3 | 5 | 0 | 8 |
| location | 14 | 2 | 0 | 16 |
| work | 27 | 6 | 0 | 33 |

### Low-Confidence-Matches (manuelle Freigabe erforderlich)

**0 Matches mit Score 80–89** — prüfen, ob sie tatsächlich das korrekte Wikidata-Objekt treffen. Freigegebene Einträge manuell als `manual_review: approved` markieren.

_Keine Low-Confidence-Matches in diesem Lauf._

## Provenance-Coverage

- Records mit `m3gim:xlsxSource`: **892/892** (100%)
- Records mit provenienz-belegten Ereignissen (`agrelon:metadataProvenance` auf STE/DatedEvent/AgRelOn): **87/892** (10%)
- Nested Entities (Details + AgRelOn) mit `xlsxSource`: **110/110** (100%)

## Externe Blocker (zur Klärung mit Erschließungsteam)

1. **`UAKUG/NIM/PL_07` Duplikat** im Google Sheet bereinigen — aktuell xfail in `test_05_referential.py`.
2. **Verwaiste Signatur `UAKUG/NIM_11`**: tritt in Verknüpfungen auf, existiert aber nicht in `M3GIM-Objekte.xlsx`. Mögliche Interpretation: Tippfehler (`NIM_110` / `NIM_111`?) oder fehlende Objektzeile nachpflegen.
3. **Header-Shifts** in drei Indizes (Organisationen, Orte, Werke): Erste Datenzeile wird als Header gelesen. Pipeline kompensiert via `HEADER_SHIFTS`-Mapping in `scripts/transform.py` — sollte im Google Sheet gefixt werden, damit die Normalform sauber ist.

