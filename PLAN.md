# Plan: Post-Audit Fixes — Pipeline, Wikidata-CSV, Commits

> Session 19 (2026-02-25). **ABGESCHLOSSEN.**

## Kontext

Pipeline-Audit (Session 19) ergab 69 Fehler in validate.py — alle verursacht durch einen einzigen Bug: doppelte UTF-8-Kodierung in den Vokabular-Listen. Die Pipeline selbst (transform.py) verarbeitet alle Daten korrekt. Zusaetzlich: 27 uncommittete Dateien aus Session 18/19, Wikidata-Lookup-CSVs fuer Google-Sheets-Import gewuenscht.

**Ziel:** validate.py fixen, Wikidata-CSVs exportieren, 3 saubere Commits erstellen, Vault-Sync notieren.

---

## Schritt 1: validate.py Bearbeitungsstand-Bug fixen (47 E004-Fehler) — ERLEDIGT

**Datei:** `scripts/validate.py`

**Root Cause:** Mojibake durch doppelte UTF-8-Kodierung in VOCAB-Liste.

**Loesung:** Fuzzy-Normalisierungsfunktion `normalize_bearbeitungsstand()` eingefuehrt + VOCAB-Liste korrigiert.

**Ergebnis:** 47 Fehler → 0.

---

## Schritt 2: validate.py Komposit-Typen-Bug fixen (21 E004-Fehler) — ERLEDIGT

**Datei:** `scripts/validate.py`

**Loesung:** Mojibake in KOMPOSIT_TYPEN korrigiert, `is_komposit_typ()` mit `.replace(" ", "")` verbessert.

**Ergebnis:** 21 Fehler → 0.

---

## Schritt 3: PL_07-Duplikat dokumentieren (1 E001-Fehler) — DOKUMENTIERT

**Kein Code-Fix.** Leere Duplikatzeile im Google Sheet. Validator meldet korrekt. Muss im Sheet geloescht werden.

---

## Schritt 4: Wikidata-Lookup-CSVs generieren — ERLEDIGT

**Neue Datei:** `scripts/export-wikidata-csv.py`

5 CSVs in `data/output/wikidata-csvs/` erzeugt (person-matches, org-matches, location-matches, work-matches, unmatched).

---

## Schritt 5: Pipeline neu durchlaufen + Reports regenerieren — ERLEDIGT

Validierung: 1 Fehler (E001 Duplikat), 177 Warnungen. Pipeline-Status: BESTANDEN.

---

## Schritt 6: 3 Git-Commits erstellen — ERLEDIGT

1. `feat: Mobilität-Tooltips, Dokument-Navigation, Popup-Menü, Skalenbruch`
2. `docs: Knowledge-Base destilliert — 7 flache Dokumente, 12 Quellen archiviert`
3. `fix: validate.py Encoding-Bugs, Wikidata-CSV-Export, Pipeline-Reports aktualisiert`

---

## Schritt 7: Vault-Sync notieren — MANUELL OFFEN

Manuelle Aktion: 7 neue Knowledge-Docs nach Obsidian-Vault kopieren.

---

## Ergebnis

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| validate.py Fehler | 69 | 1 (E001 Duplikat, Sheet-seitig) |
| Wikidata-CSVs | 0 | 5 Dateien |
| Uncommittete Dateien | ~27 | 0 |
| Pipeline-Status | BESTANDEN | BESTANDEN |
