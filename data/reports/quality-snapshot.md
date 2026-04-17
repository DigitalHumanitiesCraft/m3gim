# M³GIM Quality-Snapshot

_Generiert: 2026-04-17T20:19_

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

- 262 gematcht, 273 kein Match, 14 übersprungen (bereits mit Q-ID oder zu kurz)

### Nach Typ + Konfidenz

| Typ | exact | fuzzy_high | fuzzy_low | gesamt |
|---|---:|---:|---:|---:|
| person | 5 | 190 | 5 | 200 |
| org | 3 | 5 | 0 | 8 |
| location | 14 | 2 | 4 | 20 |
| work | 27 | 6 | 1 | 34 |

### Low-Confidence-Matches (manuelle Freigabe erforderlich)

**10 Matches mit Score 80–89** — prüfen, ob sie tatsächlich das korrekte Wikidata-Objekt treffen. Freigegebene Einträge manuell als `manual_review: approved` markieren.

| Typ | Name | → | Q-ID | Label | Score |
|---|---|---|---|---|---:|
| location | Mailand | → | [Q490](https://www.wikidata.org/wiki/Q490) | Milan | 83 |
| location | Rom | → | [Q220](https://www.wikidata.org/wiki/Q220) | Rome | 86 |
| location | Schottland | → | [Q22](https://www.wikidata.org/wiki/Q22) | Scotland | 89 |
| location | Straßburg | → | [Q6602](https://www.wikidata.org/wiki/Q6602) | Strasbourg | 89 |
| person | Bahr-Mildenburg, Anna | → | [Q79028](https://www.wikidata.org/wiki/Q79028) | Anna von Mildenburg | 88 |
| person | Musorgskij, Modest Petrovič | → | [Q132682](https://www.wikidata.org/wiki/Q132682) | Modest Petrovich Mussorgsky | 87 |
| person | Sophokles | → | [Q7235](https://www.wikidata.org/wiki/Q7235) | Sophocles | 89 |
| person | Tizian | → | [Q47551](https://www.wikidata.org/wiki/Q47551) | Titian | 83 |
| person | Traute, Elisabeth | → | [Q55676977](https://www.wikidata.org/wiki/Q55676977) | Elisabeth Trauterbul | 89 |
| work | Wozzeck | → | [Q657215](https://www.wikidata.org/wiki/Q657215) | Woyzeck | 86 |

## Provenance-Coverage

- Records mit `m3gim:xlsxSource`: **378/378** (100%)
- Records mit `agrelon:hasProvenance`: **89/378** (24%) — nur Records mit Datierungsevidenz
- Nested Entities (Details + AgRelOn) mit `xlsxSource`: **45/45** (100%)

## Externe Blocker (zur Klärung mit Erschließungsteam)

1. **`UAKUG/NIM/PL_07` Duplikat** im Google Sheet bereinigen — aktuell xfail in `test_05_referential.py`.
2. **Verwaiste Signatur `UAKUG/NIM_11`**: tritt in Verknüpfungen auf, existiert aber nicht in `M3GIM-Objekte.xlsx`. Mögliche Interpretation: Tippfehler (`NIM_110` / `NIM_111`?) oder fehlende Objektzeile nachpflegen.
3. **Header-Shifts** in drei Indizes (Organisationen, Orte, Werke): Erste Datenzeile wird als Header gelesen. Pipeline kompensiert via `HEADER_SHIFTS`-Mapping in `scripts/transform.py` — sollte im Google Sheet gefixt werden, damit die Normalform sauber ist.

