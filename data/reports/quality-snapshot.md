# M³GIM Quality-Snapshot

_Generiert: 2026-04-18T08:54_

Grundlage: `data\output\m3gim.jsonld` + `data\output\wikidata-reconciliation.json`.

## Verknüpfungsrate

- **63/378** Records mit mindestens einer Verknüpfung = **17%**

### Konvolute mit mehreren Folios

| Konvolut | Records | verlinkt | Rate |
|---|---:|---:|---:|
| UAKUG/NIM/PL_07 | 2 | 0 | 0% |
| UAKUG/NIM_003 | 10 | 3 | 30% |
| UAKUG/NIM_004 | 34 | 32 | 94% |
| UAKUG/NIM_005 | 31 | 0 | 0% |
| UAKUG/NIM_006 | 10 | 0 | 0% |
| UAKUG/NIM_007 | 29 | 28 | 97% |
| UAKUG/NIM_008 | 41 | 0 | 0% |
| UAKUG/NIM_011 | 21 | 0 | 0% |

### Einzelobjekte (aggregiert)

- **0/200** Einzelobjekte verlinkt (0%), verteilt auf 200 Signaturen (Plakate, Tonträger, Einzelstücke).

## Bearbeitungsstand

| Status | Records |
|---|---:|
| (leer) | 298 |
| abgeschlossen | 54 |
| zurueckgestellt | 14 |
| begonnen | 12 |

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

- Records mit `m3gim:xlsxSource`: **378/378** (100%)
- Records mit `agrelon:hasProvenance`: **89/378** (24%) — nur Records mit Datierungsevidenz
- Nested Entities (Details + AgRelOn) mit `xlsxSource`: **45/45** (100%)

## Externe Blocker (zur Klärung mit Erschließungsteam)

1. **`UAKUG/NIM/PL_07` Duplikat** im Google Sheet bereinigen — aktuell xfail in `test_05_referential.py`.
2. **Verwaiste Signatur `UAKUG/NIM_11`**: tritt in Verknüpfungen auf, existiert aber nicht in `M3GIM-Objekte.xlsx`. Mögliche Interpretation: Tippfehler (`NIM_110` / `NIM_111`?) oder fehlende Objektzeile nachpflegen.
3. **Header-Shifts** in drei Indizes (Organisationen, Orte, Werke): Erste Datenzeile wird als Header gelesen. Pipeline kompensiert via `HEADER_SHIFTS`-Mapping in `scripts/transform.py` — sollte im Google Sheet gefixt werden, damit die Normalform sauber ist.

