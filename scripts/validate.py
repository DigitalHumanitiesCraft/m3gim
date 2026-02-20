#!/usr/bin/env python3
"""
M³GIM Validierung — Step 2 der Pipeline.

Prueft die Google Sheets Excel-Exporte und erzeugt einen Markdown-Report.
Normalisiert Werte vor der Validierung (.lower().strip(), Datetime-Artefakte).

Verwendung:
    python scripts/validate.py
"""

import sys
import re
import pandas as pd
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass

# Windows-Konsole: UTF-8 erzwingen
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent.parent
SHEETS_DIR = BASE_DIR / "data" / "google-spreadsheet"
REPORTS_DIR = BASE_DIR / "data" / "reports"

# ---------------------------------------------------------------------------
# Signatur-Patterns
# ---------------------------------------------------------------------------

SIGNATUR_PATTERNS = {
    'hauptbestand': r'^UAKUG/NIM_\d{3}$',
    'plakate': r'^UAKUG/NIM/PL_\d{2}$',
    'tontraeger': r'^UAKUG/NIM_TT_\d{2}$'
}

# ---------------------------------------------------------------------------
# Kontrollierte Vokabulare (Iteration 2 — erweitert)
# ---------------------------------------------------------------------------

VOCAB = {
    "dokumenttyp": [
        "korrespondenz", "vertrag", "presse", "programm", "plakat",
        "tontraeger", "autobiografie", "identitaetsdokument", "studienunterlagen",
        "repertoire", "sammlung", "konzertprogramm", "tagebuch", "notizbuch",
        "urkunde", "zeugnis", "lebenslauf", "widmung", "biographie", "notiz",
        "photokopie", "quittung", "rezension", "typoskript", "visitenkarte",
        "konvolut", "dokument", "noten", "sonstiges", "repertoireliste"
    ],
    "bearbeitungsstand": [
        "vollständig", "vollstaendig", "in bearbeitung", "offen"
    ],
    "datierungsevidenz": [
        "aus_dokument", "erschlossen", "extern", "unbekannt"
    ],
    "zugaenglichkeit": [
        "offen", "eingeschraenkt", "gesperrt"
    ],
    "scan_status": [
        "nicht_gescannt", "gescannt", "online"
    ],
    "sprache": [
        "de", "uk", "en", "fr", "it", "ru", "pl", "es"
    ],
    "verknuepfung_typ": [
        "person", "ort", "institution", "ereignis", "werk", "rolle",
        "datum", "detail", "ensemble"
    ]
}

# Komposit-Typen die als gueltig akzeptiert werden
KOMPOSIT_TYPEN = [
    "ort,datum", "ort, datum",
    "ausgaben,waehrung", "ausgaben, waehrung", "ausgaben, währung",
    "einnahmen,waehrung", "einnahmen, waehrung", "einnahmen, währung",
    "summe,waehrung", "summe, waehrung", "summe, währung",
    "ereignis,ort,datum", "ereignis, ort, datum"
]

# Datumsformat-Pattern (ISO 8601 + Qualifier + Bereiche)
DATE_PATTERN = re.compile(
    r'^('
    r'\d{4}(-\d{2}(-\d{2})?)?'           # YYYY oder YYYY-MM oder YYYY-MM-DD
    r'(/\d{4}(-\d{2}(-\d{2})?)?)?'       # optionaler Bereich /YYYY...
    r'|circa:\d{4}'                        # circa:YYYY
    r'|vor:\d{4}'                          # vor:YYYY
    r'|nach:\d{4}'                         # nach:YYYY
    r')$'
)

# ---------------------------------------------------------------------------
# Header-Shift-Korrekturen fuer Indizes
# ---------------------------------------------------------------------------

HEADER_SHIFTS = {
    "organisationsindex": {
        # "Graz" als Header der name-Spalte → korrigieren
        "expected_columns": ["m3gim_id", "name", "wikidata_id", "ort", "assoziierte_person", "anmerkung"],
    },
    "ortsindex": {
        "expected_columns": ["m3gim_id", "name", "wikidata_id"],
    },
    "werkindex": {
        "expected_columns": ["m3gim_id", "name", "wikidata_id", "komponist", "rolle_stimme", "anmerkung"],
    }
}


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

@dataclass
class ValidationIssue:
    """Ein Validierungsproblem"""
    level: str  # ERROR oder WARNING
    code: str
    table: str
    row: int
    field: str
    value: str
    message: str


def normalize_str(value) -> str | None:
    """Normalisiert String-Wert: lower + strip"""
    if pd.isna(value) or str(value).strip() == "":
        return None
    return str(value).strip().lower()


def clean_date(value) -> str | None:
    """Bereinigt Datumsartefakte (Excel 00:00:00)"""
    if pd.isna(value):
        return None
    s = str(value).strip()
    # Excel-Datetime-Artefakt: "1958-04-18 00:00:00" → "1958-04-18"
    s = re.sub(r'\s+00:00:00$', '', s)
    if s == "":
        return None
    return s


def validate_signatur(signatur: str) -> str | None:
    """Prueft Signatur und gibt Typ zurueck oder None"""
    if pd.isna(signatur):
        return None
    sig = str(signatur).strip()
    for typ, pattern in SIGNATUR_PATTERNS.items():
        if re.match(pattern, sig):
            return typ
    return None


def validate_date(date_str: str) -> bool:
    """Prueft ob Datum gueltig ist (nach Bereinigung)"""
    if date_str is None or date_str == "":
        return True
    return bool(DATE_PATTERN.match(date_str))


def validate_vocab(value: str, vocab_name: str) -> bool:
    """Prueft ob Wert im Vokabular enthalten ist (nach Normalisierung)"""
    if value is None:
        return True
    return value in VOCAB.get(vocab_name, [])


def is_komposit_typ(value: str) -> bool:
    """Prueft ob ein Typ ein gueltiger Komposit-Typ ist"""
    if value is None:
        return False
    return value in [k.replace(" ", "") for k in KOMPOSIT_TYPEN] or value in KOMPOSIT_TYPEN


def is_empty_row(row: pd.Series, key_fields: list) -> bool:
    """Prueft ob eine Zeile leer ist (alle Schluesselfelder leer)"""
    return all(pd.isna(row.get(f)) or str(row.get(f, "")).strip() == "" for f in key_fields)


def load_index(name: str) -> pd.DataFrame | None:
    """Laedt einen Index mit Header-Shift-Korrektur"""
    path = SHEETS_DIR / f"M3GIM-{name}.xlsx"
    if not path.exists():
        # Versuche alternative Schreibweisen
        alt = SHEETS_DIR / f"{name}.xlsx"
        if alt.exists():
            path = alt
        else:
            return None

    df = pd.read_excel(path)

    # Header-Shift-Korrektur: wenn ein bekannter Datenwert als Header steht
    canonical = name.lower().replace("m3gim-", "")
    if canonical in HEADER_SHIFTS:
        expected = HEADER_SHIFTS[canonical]["expected_columns"]
        if len(df.columns) == len(expected):
            # Pruefen ob erste Zeile wie ein Datenwert aussieht (nicht wie ein Header)
            first_val = str(df.columns[1]) if len(df.columns) > 1 else ""
            if first_val and first_val not in ["name", "titel", "ort", "m3gim_id"]:
                # Header ist verschoben — erste Zeile ist eigentlich Daten
                old_headers = list(df.columns)
                df.columns = expected[:len(df.columns)]
                # Alte Header als erste Datenzeile einfuegen
                first_row = pd.DataFrame([old_headers], columns=df.columns)
                df = pd.concat([first_row, df], ignore_index=True)

    return df


# ---------------------------------------------------------------------------
# Validierung: Objekte
# ---------------------------------------------------------------------------

def validate_objekte(df: pd.DataFrame) -> list[ValidationIssue]:
    """Validiert die Objekttabelle"""
    issues = []

    # Eindeutigkeit Signaturen — Konvolute duerfen gleiche archivsignatur haben
    # (unterschieden durch Folio-Spalte). Nur echte Duplikate (gleiche Signatur
    # UND gleiche Folio) sind Fehler.
    folio_col = None
    for col in df.columns:
        if col.lower() in ['folio', 'unnamed: 2']:
            folio_col = col
            break

    seen_ids = {}  # {objekt_id: first_row}
    for idx, row in df.iterrows():
        sig = row.get('archivsignatur')
        if pd.isna(sig) or str(sig).strip() == "":
            continue
        sig = str(sig).strip()
        folio_raw = row.get(folio_col) if folio_col else None
        folio = str(folio_raw).strip() if pd.notna(folio_raw) else ""
        objekt_id = f"{sig} {folio}".strip()
        if objekt_id in seen_ids:
            issues.append(ValidationIssue(
                level="ERROR", code="E001", table="Objekte", row=idx + 2,
                field="archivsignatur", value=objekt_id,
                message=f"Doppelte Objekt-ID: {objekt_id} (auch in Zeile {seen_ids[objekt_id]})"
            ))
        else:
            seen_ids[objekt_id] = idx + 2

    for idx, row in df.iterrows():
        # Leere Zeilen ueberspringen
        if is_empty_row(row, ['archivsignatur', 'titel']):
            continue

        excel_row = idx + 2

        # Signaturformat
        sig = row.get('archivsignatur')
        if pd.notna(sig) and validate_signatur(sig) is None:
            issues.append(ValidationIssue(
                level="ERROR", code="E002", table="Objekte", row=excel_row,
                field="archivsignatur", value=str(sig),
                message="Ungueltiges Signaturformat"
            ))

        # Pflichtfeld archivsignatur
        if pd.isna(sig) or str(sig).strip() == "":
            issues.append(ValidationIssue(
                level="ERROR", code="E003", table="Objekte", row=excel_row,
                field="archivsignatur", value="",
                message="Pflichtfeld archivsignatur ist leer"
            ))

        # Pflichtfeld titel
        if pd.isna(row.get('titel')) or str(row.get('titel')).strip() == "":
            issues.append(ValidationIssue(
                level="WARNING", code="W001", table="Objekte", row=excel_row,
                field="titel", value="",
                message="Pflichtfeld titel ist leer"
            ))

        # Vokabular-Pruefung (nach Normalisierung)
        for field, vocab in [('dokumenttyp', 'dokumenttyp'),
                             ('zugaenglichkeit', 'zugaenglichkeit'), ('scan_status', 'scan_status'),
                             ('datierungsevidenz', 'datierungsevidenz'),
                             ('bearbeitungsstand', 'bearbeitungsstand')]:
            val = normalize_str(row.get(field))
            if val is not None and not validate_vocab(val, vocab):
                issues.append(ValidationIssue(
                    level="ERROR", code="E004", table="Objekte", row=excel_row,
                    field=field, value=str(row.get(field)),
                    message=f"Ungueltiger Wert fuer {field}"
                ))

        # Sprache: Komma-separierte Werte erlaubt (z.B. "de, en, fr")
        sprache_val = normalize_str(row.get('sprache'))
        if sprache_val is not None:
            langs = [s.strip() for s in sprache_val.split(",")]
            for lang in langs:
                if lang and not validate_vocab(lang, 'sprache'):
                    issues.append(ValidationIssue(
                        level="ERROR", code="E004", table="Objekte", row=excel_row,
                        field="sprache", value=str(row.get('sprache')),
                        message=f"Ungueltiger Wert fuer sprache: {lang}"
                    ))
                    break

        # Datumsformat (nach Bereinigung)
        date_val = clean_date(row.get('entstehungsdatum'))
        if date_val is not None and not validate_date(date_val):
            issues.append(ValidationIssue(
                level="WARNING", code="W002", table="Objekte", row=excel_row,
                field="entstehungsdatum", value=str(row.get('entstehungsdatum')),
                message="Ungueltiges Datumsformat (erwartet: ISO 8601)"
            ))

    return issues


# ---------------------------------------------------------------------------
# Validierung: Verknuepfungen
# ---------------------------------------------------------------------------

def validate_verknuepfungen(df: pd.DataFrame, valid_signaturen: set,
                             indices: dict) -> list[ValidationIssue]:
    """Validiert die Verknuepfungstabelle"""
    issues = []

    for idx, row in df.iterrows():
        # Leere Zeilen ueberspringen
        if is_empty_row(row, ['archivsignatur', 'typ', 'name']):
            continue

        excel_row = idx + 2

        # Template-Zeilen ueberspringen
        sig = row.get('archivsignatur')
        if pd.notna(sig) and str(sig).strip().lower() == "beispiel":
            continue

        # Referentielle Integritaet: Signatur muss in Objekte existieren
        if pd.notna(sig) and str(sig).strip() != "":
            sig_str = str(sig).strip()
            if sig_str not in valid_signaturen:
                issues.append(ValidationIssue(
                    level="ERROR", code="E005", table="Verknuepfungen", row=excel_row,
                    field="archivsignatur", value=sig_str,
                    message="Signatur existiert nicht in Objekte"
                ))

        # Typ-Vokabular (nach Normalisierung)
        typ = normalize_str(row.get('typ'))
        if typ is not None:
            if not validate_vocab(typ, 'verknuepfung_typ') and not is_komposit_typ(typ):
                issues.append(ValidationIssue(
                    level="ERROR", code="E004", table="Verknuepfungen", row=excel_row,
                    field="typ", value=str(row.get('typ')),
                    message="Ungueltiger Verknuepfungstyp"
                ))

        # Cross-Table-Check: Name muss im entsprechenden Index existieren
        name = row.get('name')
        if pd.notna(name) and typ is not None:
            name_str = str(name).strip()
            # Nur fuer Typen die einen Index haben
            index_map = {
                'person': 'personenindex',
                'institution': 'organisationsindex',
                'ort': 'ortsindex',
                'werk': 'werkindex'
            }
            # Bei Komposit-Typen den ersten Teil nehmen
            base_typ = typ.split(",")[0].strip() if "," in typ else typ

            if base_typ in index_map and index_map[base_typ] in indices:
                index_df = indices[index_map[base_typ]]
                if index_df is not None:
                    # Suche Name im Index (case-insensitive)
                    name_col = 'name' if 'name' in index_df.columns else 'titel'
                    if name_col in index_df.columns:
                        index_names = index_df[name_col].dropna().astype(str).str.strip().str.lower().tolist()
                        if name_str.lower() not in index_names:
                            issues.append(ValidationIssue(
                                level="WARNING", code="W004", table="Verknuepfungen", row=excel_row,
                                field="name", value=name_str,
                                message=f"Name nicht im {index_map[base_typ]} gefunden"
                            ))

        # Rolle als Warning (Rollen sind offen, neue Werte sind erlaubt)
        rolle = normalize_str(row.get('rolle'))
        if rolle is not None and rolle == "":
            # Leere Rolle ist OK
            pass

        # Datum-Format bei Verknuepfungen
        datum = clean_date(row.get('datum') if 'datum' in df.columns else None)
        if datum is not None and not validate_date(datum):
            issues.append(ValidationIssue(
                level="WARNING", code="W002", table="Verknuepfungen", row=excel_row,
                field="datum", value=str(row.get('datum')),
                message="Ungueltiges Datumsformat"
            ))

    return issues


# ---------------------------------------------------------------------------
# Report-Generierung
# ---------------------------------------------------------------------------

def generate_report(issues: list[ValidationIssue], stats: dict) -> str:
    """Erzeugt Markdown-Report"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    errors = [i for i in issues if i.level == "ERROR"]
    warnings = [i for i in issues if i.level == "WARNING"]

    status = "Validierung erfolgreich" if len(errors) == 0 else f"{len(errors)} Fehler muessen behoben werden"

    report = f"""# M³GIM Validierungsreport

**Datum:** {now}

## Zusammenfassung

- **Objekte:** {stats.get('objekte', 0)} Zeilen, {len([i for i in errors if i.table == 'Objekte'])} Fehler, {len([i for i in warnings if i.table == 'Objekte'])} Warnungen
- **Verknuepfungen:** {stats.get('verknuepfungen', 0)} Zeilen, {len([i for i in errors if i.table == 'Verknuepfungen'])} Fehler, {len([i for i in warnings if i.table == 'Verknuepfungen'])} Warnungen
- **Indizes geladen:** {', '.join(stats.get('indices_loaded', []))}

**Status:** {status}

"""

    if errors:
        report += "---\n\n## Fehler (blockieren Export)\n\n"
        for issue in errors:
            report += f"- **{issue.code} {issue.table} Zeile {issue.row}:** {issue.field} = `{issue.value}` — {issue.message}\n"

    if warnings:
        report += "\n---\n\n## Warnungen (Export moeglich)\n\n"
        for issue in warnings:
            report += f"- **{issue.code} {issue.table} Zeile {issue.row}:** {issue.field} = `{issue.value}` — {issue.message}\n"

    if not errors and not warnings:
        report += "---\n\n**Keine Probleme gefunden.**\n"

    return report


# ---------------------------------------------------------------------------
# Hauptfunktion
# ---------------------------------------------------------------------------

def main():
    """Hauptfunktion"""
    print("=" * 60)
    print("M³GIM Validierung (Iteration 2)")
    print("=" * 60)

    all_issues = []
    stats = {}
    valid_signaturen = set()

    # Indizes laden (fuer Cross-Table-Checks)
    print("Lade Indizes...")
    indices = {}
    indices_loaded = []
    for name in ["Personenindex", "Organisationsindex", "Ortsindex", "Werkindex"]:
        df = load_index(name)
        if df is not None:
            canonical = name.lower()
            indices[canonical] = df
            indices_loaded.append(f"{name} ({len(df)})")
            print(f"  {name}: {len(df)} Eintraege")
        else:
            print(f"  WARNUNG: {name} nicht gefunden")
    stats['indices_loaded'] = indices_loaded

    # Objekte laden und validieren
    objekte_path = SHEETS_DIR / "M3GIM-Objekte.xlsx"
    if objekte_path.exists():
        print(f"\nValidiere {objekte_path.name}...")
        df_objekte = pd.read_excel(objekte_path)
        stats['objekte'] = len(df_objekte)
        all_issues.extend(validate_objekte(df_objekte))
        valid_signaturen.update(
            df_objekte['archivsignatur'].dropna().astype(str).str.strip().tolist()
        )
        print(f"  {len(df_objekte)} Objekte geladen")
    else:
        print(f"\n  WARNUNG: {objekte_path.name} nicht gefunden")

    # Verknuepfungen laden und validieren
    # Versuche beide Schreibweisen (mit und ohne Umlaut)
    verk_path = SHEETS_DIR / "M3GIM-Verknüpfungen.xlsx"
    if not verk_path.exists():
        verk_path = SHEETS_DIR / "M3GIM-Verknuepfungen.xlsx"
    if verk_path.exists():
        print(f"Validiere {verk_path.name}...")
        df_verk = pd.read_excel(verk_path)
        stats['verknuepfungen'] = len(df_verk)
        all_issues.extend(validate_verknuepfungen(df_verk, valid_signaturen, indices))
        print(f"  {len(df_verk)} Verknuepfungen geladen")
    else:
        print(f"  WARNUNG: M3GIM-Verknuepfungen.xlsx nicht gefunden")

    # Report generieren
    report = generate_report(all_issues, stats)

    # Report speichern
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / "validation-report.md"
    report_path.write_text(report, encoding='utf-8')

    # Zusammenfassung
    errors = [i for i in all_issues if i.level == "ERROR"]
    warnings = [i for i in all_issues if i.level == "WARNING"]

    print()
    print("=" * 60)
    print(f"Validierung abgeschlossen")
    print(f"  Fehler:    {len(errors)}")
    print(f"  Warnungen: {len(warnings)}")
    print(f"  Report:    {report_path}")
    print("=" * 60)

    # Exit-Code fuer CI/CD
    return 1 if errors else 0


if __name__ == "__main__":
    exit(main())
