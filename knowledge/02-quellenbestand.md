# Quellenbestand & Datenqualität

> 282 Objekte in drei Bestandsgruppen, erfasst in Google Sheets (Stand Februar 2026)

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

## Konvolute

Einige Objekte sind **Konvolute** (Sammlungsobjekte mit mehreren Folios). Die Objekt-ID setzt sich zusammen aus `archivsignatur` + `folio`: z.B. `UAKUG/NIM_003 1_1`.

| Konvolut | Folios | Verknüpfungen | Inhalt |
|---|---|---|---|
| UAKUG/NIM_003 | 11 | 35 | |
| UAKUG/NIM_004 | 35 | 795 | |
| UAKUG/NIM_007 | 30 | 426 | |
| UAKUG/NIM/PL_07 | 2 | | |

Weitere Konvolute werden im Laufe der Erfassung hinzukommen.

---

## Verknüpfungen

1.264 Verknüpfungen (+ 18 leere Zeilen, werden ignoriert). Bisher sind nur 3 von 282 Objekten verknüpft (NIM_003, NIM_004, NIM_007) — die Verknüpfungsarbeit steht am Anfang.

**Verknüpfungs-Mechanismus:** String-Matching über die `name`-Spalte. Die Spalte `typ` bestimmt den Ziel-Index:
- `typ=person`, `name="Strauss, Richard"` → Lookup im Personenindex
- `typ=werk`, `name="Macbeth"` → Lookup im Werkindex
- `typ=ort`, `name="New York"` → Lookup im Ortsindex
- `typ=institution`, `name=...` → Lookup im Organisationsindex
- `typ=rolle`, `name="Carmen"` → Opernrolle (kein Index-Lookup)
- `typ=datum`, `typ=ereignis` → kontextuelle Information

IDs in den Indizes (O1–O63, W1–W95 etc.) sind Durchzählungen, keine Verknüpfungs-Schlüssel.

---

## Aktuelle Bestandszahlen

| Tabelle | Zeilen | Spalten |
|---|---|---|
| M3GIM-Objekte | 282 | 18 |
| M3GIM-Verknüpfungen | 1.264 | 6 |
| Personenindex | 296 | 6 |
| Organisationsindex | 58 | 6 |
| Ortsindex | 31 | 3 |
| Werkindex | 95 | 6 |

---

## Datenqualität

### Datumsangaben

~243 Objekte (86%) haben Datumsangaben, heterogene Formate:
- 59 ISO-Format (z.B. `1958-04-18`)
- 142 Bereiche (z.B. `1945/1947`)
- ~42 Excel-Datetime-Artefakte (`1958-04-18 00:00:00`) — Export-Artefakt, kein Datenproblem, Pipeline streift `00:00:00` ab

Verdächtiger Eintrag: `2026-09-06` — wahrscheinlich Typo für `1926-09-06`.

### Personenkategorien

257/296 Personen mit Kategorie im `anmerkung`-Feld, 80 verschiedene Werte. Normalisierung nötig: "Sänger" vs. "sänger:in" vs. "Sänger (Tenor)". Pipeline liest Kategorie aus diesem Feld.

### Wikidata-Reconciliation

Wikidata-IDs werden **nicht** vom Erfassungsteam eingetragen. Geplanter Workflow:
1. KUG-Team trägt Namen ein (Personen, Organisationen, Orte)
2. Automatisierte Reconciliation via `reconcile.py`
3. Händische Nachbearbeitung

### Bekannte Probleme (Pipeline löst P1–P5 automatisch)

| Prio | Problem | Lösung |
|---|---|---|
| **P1** | Header-Shifts in 3 Indizes (erste Datenzeile als Spaltenname) | Pipeline: Spaltennamen-Mapping |
| **P2** | Konvolut-Hierarchie (`Unnamed: 2` = Folio-Spalte in Objekte) | Pipeline: Objekt-ID = signatur + folio |
| **P3** | 7 neue Dokumenttypen nicht im bisherigen Vokabular | Vokabular erweitert |
| **P4** | Case/Whitespace-Inkonsistenzen (typ, rolle, bearbeitungsstand) | Pipeline: `.lower().strip()` |
| **P5** | 18 leere Zeilen in Verknüpfungen | Pipeline: überspringen |

### Header-Shifts im Detail

| Index | Spalte | Steht als Header | Sollte sein |
|---|---|---|---|
| Organisationsindex | 2 | "Graz" | "name" |
| Ortsindex | 1 | "Unnamed: 0" | "m3gim_id" |
| Werkindex | 2 | "Rossini, Gioachino" | "titel" |
| Werkindex | 4 | "Barber, Samuel" | "komponist" |

---

Siehe auch: [→ Datenmodell](03-datenmodell.md) · [→ Architektur](04-architektur.md)
