# Plan: Post-Audit Fixes — Pipeline, Wikidata-CSV, Commits

> Session 19 (2026-02-25). Erstellt nach vollstaendigem Pipeline-Audit.

## Kontext

Pipeline-Audit (Session 19) ergab 69 Fehler in validate.py — alle verursacht durch einen einzigen Bug: doppelte UTF-8-Kodierung in den Vokabular-Listen. Die Pipeline selbst (transform.py) verarbeitet alle Daten korrekt. Zusaetzlich: 27 uncommittete Dateien aus Session 18/19, Wikidata-Lookup-CSVs fuer Google-Sheets-Import gewuenscht.

**Ziel:** validate.py fixen, Wikidata-CSVs exportieren, 3 saubere Commits erstellen, Vault-Sync notieren.

---

## Schritt 1: validate.py Bearbeitungsstand-Bug fixen (47 E004-Fehler)

**Datei:** `scripts/validate.py`

**Root Cause:** Zeile 55 enthaelt `"vollstÃ¤ndig"` (Mojibake durch doppelte UTF-8-Kodierung) statt `"vollständig"`. Nach `normalize_str()` (.lower().strip()) bleibt `"vollstÃ¤ndig"` — matcht nicht gegen das korrekte `"vollständig"` aus den Excel-Daten.

**Loesung:** Fuzzy-Normalisierungsfunktion `normalize_bearbeitungsstand()` einfuehren, die transform.py's Logik (Zeilen 258-264) spiegelt:

- `'vollst' in bs` → `'abgeschlossen'`
- `bs.startswith('erledigt')` → `'abgeschlossen'`
- `bs.startswith('begonnen')` → `'begonnen'`
- `'ckgestellt' in bs` → `'zurueckgestellt'`
- Alles andere → `None` (dann E004)

Plus: VOCAB-Liste korrigieren (Mojibake durch korrektes UTF-8 ersetzen).

**Ergebnis:** 47 Fehler → 0.

---

## Schritt 2: validate.py Komposit-Typen-Bug fixen (21 E004-Fehler)

**Datei:** `scripts/validate.py`

**Root Cause:** KOMPOSIT_TYPEN (Zeilen 78-85) enthaelt `"ausgaben, wÃ¤hrung"` (Mojibake). Excel liefert `"ausgaben, währung"` — kein Match.

**Loesung:**
1. Mojibake in KOMPOSIT_TYPEN durch korrektes UTF-8 ersetzen
2. `is_komposit_typ()` verbessern: Input-Wert vor Vergleich ebenfalls `.replace(" ", "")` anwenden

**Ergebnis:** 21 Fehler → 0.

---

## Schritt 3: PL_07-Duplikat dokumentieren (1 E001-Fehler)

**Kein Code-Fix.** Zeile 9 in Objekte-Tabelle ist eine leere Duplikatzeile. Muss im Google Sheet geloescht werden. Validator meldet korrekt.

---

## Schritt 4: Wikidata-Lookup-CSVs generieren

**Neue Datei:** `scripts/export-wikidata-csv.py`

Liest `data/output/wikidata-reconciliation.json` (171 Matches) und erzeugt 5 CSVs in `data/output/wikidata-csvs/`:

| Datei | Zeilen | Spalten |
|-------|--------|---------|
| `person-matches.csv` | 152 | name, qid, wikidata_label, match_type |
| `org-matches.csv` | 3 | name, qid, wikidata_label, match_type |
| `location-matches.csv` | 14 | name, qid, wikidata_label, match_type |
| `work-matches.csv` | 2 | name, qid, wikidata_label, match_type |
| `unmatched.csv` | 295 | name, type |

Zweck: Nicole/Wolfgang koennen die CSVs per VLOOKUP in Google Sheets einpflegen.

---

## Schritt 5: Pipeline neu durchlaufen + Reports regenerieren

1. `python scripts/validate.py` → erwartetes Ergebnis: **1 Fehler** (E001 Duplikat), ~177 Warnungen
2. `python scripts/transform.py` → JSONLD regenerieren
3. `python scripts/build-views.py` → Views regenerieren
4. `python scripts/audit-data.py` → BESTANDEN bestaetigen
5. `docs/data/` synchronisieren

---

## Schritt 6: 3 Git-Commits erstellen

**Commit 1 — Session 18 Mobilitaet:**
- `docs/js/views/mobilitaet.js`, `docs/css/mobilitaet.css`
- `feat: Mobilität-Tooltips, Dokument-Navigation, Popup-Menü, Skalenbruch`

**Commit 2 — Knowledge-Refactor:**
- 12 Renames + 5 modifizierte Archiv-Dateien + 7 neue Knowledge-Docs + README
- `docs: Knowledge-Base destilliert — 7 flache Dokumente, 12 Quellen archiviert`

**Commit 3 — Pipeline-Audit-Fixes:**
- validate.py + export-wikidata-csv.py + CSVs + Reports + JSONLD + docs/data/
- `fix: validate.py Encoding-Bugs, Wikidata-CSV-Export, Pipeline-Reports aktualisiert`

---

## Schritt 7: Vault-Sync notieren

Manuelle Aktion: 7 neue Knowledge-Docs nach Obsidian-Vault kopieren.

---

## Erwartetes Ergebnis

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| validate.py Fehler | 69 | 1 (E001 Duplikat, Sheet-seitig) |
| Wikidata-CSVs | 0 | 5 Dateien |
| Uncommittete Dateien | ~27 | 0 |
| Pipeline-Status | BESTANDEN | BESTANDEN |

## Verifikation

1. `python scripts/validate.py` → 1 Fehler, ~177 Warnungen
2. `python scripts/audit-data.py` → BESTANDEN
3. `ls data/output/wikidata-csvs/` → 5 CSV-Dateien
4. `git status` → clean (nach 3 Commits)
