# Quellenbestand & Datenqualität

> 283 Objekte in drei Bestandsgruppen, erfasst in Google Sheets (Stand Februar 2026)

---

## Bestandsgruppen

| Bestandsgruppe | Records | Signaturschema |
|---|---|---|
| Hauptbestand | 255 | UAKUG/NIM_XXX |
| Plakate | 26 | UAKUG/NIM/PL_XX |
| Tonträger | 1 | UAKUG/NIM_TT_XX |

Hauptbestand-Systematikgruppen: 89 Berufliche Tätigkeit, 42 Dokumente, 31 Korrespondenzen, 16 Sammlungen.

**Hinweis:** Plakate verwenden `/` vor PL (nicht `_`) — Inkonsistenz aus dem Archiv.

---

## Datenqualität

### Datumsangaben

243/283 Objekte (86%) haben Datumsangaben, aber heterogene Formate:
- 58 ISO-Format
- 142 Bereiche (z.B. "1945–1947")
- ~43 Excel-Datetime-Artefakte

Verdächtiger Eintrag: `2026-09-06` — wahrscheinlich Typo für `1926-09-06`.

### Personenkategorien

257/296 Personen mit Kategorie im `anmerkung`-Feld, 80 verschiedene Werte. Normalisierung nötig: "Sänger" vs. "sänger:in" vs. "Sänger (Tenor)".

### Wikidata-Verknüpfung

| Index | Records | Wikidata | Abdeckung |
|---|---|---|---|
| Personenindex | 296 | 3 | 1% |
| Organisationsindex | 58 | 4 | 7% |
| Werkindex | 95 | 4 | 4% |
| Ortsindex | 31 | 0 | 0% |

De facto nicht begonnen.

### Bekannte Probleme

- **Ortsindex:** Keine Koordinaten, 6 Orte aus Organisationsindex fehlen
- **Organisationsindex:** Duplicate IDs O43/O44, 3 Rows ohne ID
- **Werkindex:** 10 Einträge ohne ID, Komponisten-Schreibweise inkonsistent
- **Bearbeitungsstand:** 9 verschiedene Schreibweisen für 3 logische Werte ("in Bearbeitung"/"In Bearbeitung"/"Bearbeitung")

---

Siehe auch: [→ Datenmodell](03-datenmodell.md) · [→ Architektur](04-architektur.md)
