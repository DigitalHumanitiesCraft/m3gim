#!/usr/bin/env python3
"""
M³GIM Validierung
Prüft die Google Sheets Excel-Exporte und erzeugt einen Report.
"""

import pandas as pd
import re
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass
from typing import List

# Pfade
BASE_DIR = Path(__file__).parent.parent
SHEETS_DIR = BASE_DIR / "data" / "processed"
REPORTS_DIR = BASE_DIR / "data" / "reports"

# Signatur-Patterns
SIGNATUR_PATTERNS = {
    'hauptbestand': r'^UAKUG/NIM_\d{3}$',
    'fotos': r'^UAKUG/NIM_FS_\d{3}$',
    'plakate': r'^UAKUG/NIM/PL_\d{2}$',
    'tontraeger': r'^UAKUG/NIM_TT_\d{2}$'
}

# Kontrollierte Vokabulare
VOCAB = {
    "dokumenttyp": ["autobiografie", "korrespondenz", "vertrag", "programm", "presse",
                    "repertoire", "studienunterlagen", "identitaetsdokument", "plakat",
                    "tontraeger", "sammlung"],
    "datierungsevidenz": ["aus_dokument", "erschlossen", "extern", "unbekannt"],
    "zugaenglichkeit": ["offen", "eingeschraenkt", "gesperrt"],
    "scan_status": ["nicht_gescannt", "gescannt", "online"],
    "sprache": ["de", "uk", "en", "fr", "it"],
    "fototyp": ["sw", "farbe", "digital"],
    "verknuepfung_typ": ["person", "ort", "institution", "ereignis", "werk", "detail"],
    "verknuepfung_rolle": ["verfasser", "adressat", "erwähnt", "erwaehnt", "vertragspartner",
                          "unterzeichner", "abgebildet", "entstehungsort", "zielort",
                          "auffuehrungsort", "wohnort", "vertragsort", "arbeitgeber",
                          "veranstalter", "vermittler", "rahmenveranstaltung", "premiere",
                          "auftritt", "probe", "implizit", "interpretin"]
}

# Datumsformat-Pattern (ISO 8601 + Qualifier)
DATE_PATTERN = r'^(\d{4}(-\d{2}(-\d{2})?)?(/\d{4}(-\d{2}(-\d{2})?)?)?|circa:\d{4}|vor:\d{4}|nach:\d{4})?$'


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


def validate_signatur(signatur: str) -> str | None:
    """Prüft Signatur und gibt Typ zurück oder None"""
    if pd.isna(signatur):
        return None
    for typ, pattern in SIGNATUR_PATTERNS.items():
        if re.match(pattern, str(signatur)):
            return typ
    return None


def validate_date(date_str: str) -> bool:
    """Prüft ob Datum gültig ist"""
    if pd.isna(date_str) or str(date_str).strip() == "":
        return True
    return bool(re.match(DATE_PATTERN, str(date_str).strip()))


def validate_vocab(value: str, vocab_name: str) -> bool:
    """Prüft ob Wert im Vokabular enthalten ist"""
    if pd.isna(value) or str(value).strip() == "":
        return True
    return str(value).strip().lower() in [v.lower() for v in VOCAB.get(vocab_name, [])]


def validate_objekte(df: pd.DataFrame) -> List[ValidationIssue]:
    """Validiert die Objekttabelle"""
    issues = []

    # Eindeutigkeit Signaturen
    duplicates = df[df['archivsignatur'].duplicated(keep=False)]
    seen = set()
    for idx, row in duplicates.iterrows():
        sig = row['archivsignatur']
        if sig not in seen:
            issues.append(ValidationIssue(
                level="ERROR", code="E001", table="Objekte", row=idx + 2,
                field="archivsignatur", value=str(sig),
                message=f"Doppelte Signatur: {sig}"
            ))
            seen.add(sig)

    for idx, row in df.iterrows():
        excel_row = idx + 2  # Excel-Zeile (1-basiert + Header)

        # Signaturformat
        sig = row.get('archivsignatur')
        if pd.notna(sig) and validate_signatur(sig) is None:
            issues.append(ValidationIssue(
                level="ERROR", code="E002", table="Objekte", row=excel_row,
                field="archivsignatur", value=str(sig),
                message=f"Ungültiges Signaturformat"
            ))

        # Pflichtfelder
        if pd.isna(row.get('archivsignatur')) or str(row.get('archivsignatur')).strip() == "":
            issues.append(ValidationIssue(
                level="ERROR", code="E003", table="Objekte", row=excel_row,
                field="archivsignatur", value="",
                message="Pflichtfeld archivsignatur ist leer"
            ))

        if pd.isna(row.get('titel')) or str(row.get('titel')).strip() == "":
            issues.append(ValidationIssue(
                level="WARNING", code="W001", table="Objekte", row=excel_row,
                field="titel", value="",
                message="Pflichtfeld titel ist leer"
            ))

        # Vokabular-Prüfung
        for field, vocab in [('dokumenttyp', 'dokumenttyp'), ('sprache', 'sprache'),
                             ('zugaenglichkeit', 'zugaenglichkeit'), ('scan_status', 'scan_status'),
                             ('datierungsevidenz', 'datierungsevidenz')]:
            val = row.get(field)
            if pd.notna(val) and str(val).strip() != "" and not validate_vocab(val, vocab):
                issues.append(ValidationIssue(
                    level="ERROR", code="E004", table="Objekte", row=excel_row,
                    field=field, value=str(val),
                    message=f"Ungültiger Wert für {field}"
                ))

        # Datumsformat
        date_val = row.get('entstehungsdatum')
        if pd.notna(date_val) and not validate_date(date_val):
            issues.append(ValidationIssue(
                level="WARNING", code="W002", table="Objekte", row=excel_row,
                field="entstehungsdatum", value=str(date_val),
                message="Ungültiges Datumsformat (erwartet: ISO 8601)"
            ))

    return issues


def validate_fotos(df: pd.DataFrame) -> List[ValidationIssue]:
    """Validiert die Fototabelle"""
    issues = []

    # Eindeutigkeit
    duplicates = df[df['archivsignatur'].duplicated(keep=False)]
    seen = set()
    for idx, row in duplicates.iterrows():
        sig = row['archivsignatur']
        if sig not in seen:
            issues.append(ValidationIssue(
                level="ERROR", code="E001", table="Fotos", row=idx + 2,
                field="archivsignatur", value=str(sig),
                message=f"Doppelte Signatur: {sig}"
            ))
            seen.add(sig)

    for idx, row in df.iterrows():
        excel_row = idx + 2

        # Signaturformat (muss NIM_FS sein)
        sig = row.get('archivsignatur')
        if pd.notna(sig):
            if not re.match(SIGNATUR_PATTERNS['fotos'], str(sig)):
                issues.append(ValidationIssue(
                    level="ERROR", code="E002", table="Fotos", row=excel_row,
                    field="archivsignatur", value=str(sig),
                    message="Ungültiges Signaturformat (erwartet: UAKUG/NIM_FS_XXX)"
                ))

        # Pflichtfeld
        if pd.isna(sig) or str(sig).strip() == "":
            issues.append(ValidationIssue(
                level="ERROR", code="E003", table="Fotos", row=excel_row,
                field="archivsignatur", value="",
                message="Pflichtfeld archivsignatur ist leer"
            ))

        # Vokabular
        for field, vocab in [('fototyp', 'fototyp'), ('datierungsevidenz', 'datierungsevidenz')]:
            val = row.get(field)
            if pd.notna(val) and str(val).strip() != "" and not validate_vocab(val, vocab):
                issues.append(ValidationIssue(
                    level="ERROR", code="E004", table="Fotos", row=excel_row,
                    field=field, value=str(val),
                    message=f"Ungültiger Wert für {field}"
                ))

        # Datumsformat
        date_val = row.get('entstehungsdatum')
        if pd.notna(date_val) and not validate_date(date_val):
            issues.append(ValidationIssue(
                level="WARNING", code="W002", table="Fotos", row=excel_row,
                field="entstehungsdatum", value=str(date_val),
                message="Ungültiges Datumsformat"
            ))

    return issues


def validate_verknuepfungen(df: pd.DataFrame, valid_signaturen: set) -> List[ValidationIssue]:
    """Validiert die Verknüpfungstabelle"""
    issues = []

    for idx, row in df.iterrows():
        excel_row = idx + 2

        # Referentielle Integrität
        sig = row.get('archivsignatur')
        if pd.notna(sig) and str(sig).strip() != "":
            if str(sig) not in valid_signaturen:
                issues.append(ValidationIssue(
                    level="ERROR", code="E005", table="Verknuepfungen", row=excel_row,
                    field="archivsignatur", value=str(sig),
                    message="Signatur existiert nicht in Objekte oder Fotos"
                ))

        # Typ-Vokabular
        typ = row.get('typ')
        if pd.notna(typ) and not validate_vocab(typ, 'verknuepfung_typ'):
            issues.append(ValidationIssue(
                level="ERROR", code="E004", table="Verknuepfungen", row=excel_row,
                field="typ", value=str(typ),
                message="Ungültiger Verknüpfungstyp"
            ))

        # Rolle-Vokabular
        rolle = row.get('rolle')
        if pd.notna(rolle) and not validate_vocab(rolle, 'verknuepfung_rolle'):
            issues.append(ValidationIssue(
                level="WARNING", code="W003", table="Verknuepfungen", row=excel_row,
                field="rolle", value=str(rolle),
                message="Unbekannte Rolle (nicht im Standardvokabular)"
            ))

        # Datum bei Ereignissen
        datum = row.get('datum')
        if pd.notna(datum) and not validate_date(datum):
            issues.append(ValidationIssue(
                level="WARNING", code="W002", table="Verknuepfungen", row=excel_row,
                field="datum", value=str(datum),
                message="Ungültiges Datumsformat"
            ))

    return issues


def generate_report(issues: List[ValidationIssue], stats: dict) -> str:
    """Erzeugt Markdown-Report"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    errors = [i for i in issues if i.level == "ERROR"]
    warnings = [i for i in issues if i.level == "WARNING"]

    status = "Validierung erfolgreich" if len(errors) == 0 else f"{len(errors)} Fehler müssen behoben werden"

    report = f"""# M³GIM Validierungsreport

**Datum:** {now}

## Zusammenfassung

| Tabelle | Zeilen | Fehler | Warnungen |
|---------|--------|--------|-----------|
| Objekte | {stats.get('objekte', 0)} | {len([i for i in errors if i.table == 'Objekte'])} | {len([i for i in warnings if i.table == 'Objekte'])} |
| Fotos | {stats.get('fotos', 0)} | {len([i for i in errors if i.table == 'Fotos'])} | {len([i for i in warnings if i.table == 'Fotos'])} |
| Verknüpfungen | {stats.get('verknuepfungen', 0)} | {len([i for i in errors if i.table == 'Verknuepfungen'])} | {len([i for i in warnings if i.table == 'Verknuepfungen'])} |

**Status:** {status}

"""

    if errors:
        report += "---\n\n## Fehler (blockieren Export)\n\n"
        for i, issue in enumerate(errors, 1):
            report += f"""### {issue.code}: {issue.message}
- **Tabelle:** {issue.table}
- **Zeile:** {issue.row}
- **Feld:** {issue.field}
- **Wert:** `{issue.value}`

"""

    if warnings:
        report += "---\n\n## Warnungen (Export möglich)\n\n"
        for issue in warnings:
            report += f"- **{issue.table} Zeile {issue.row}:** {issue.field} - {issue.message} (`{issue.value}`)\n"

    if not errors and not warnings:
        report += "---\n\n**Keine Probleme gefunden.**\n"

    return report


def main():
    """Hauptfunktion"""
    print("=" * 60)
    print("M³GIM Validierung")
    print("=" * 60)

    all_issues = []
    stats = {}
    valid_signaturen = set()

    # Objekte laden und validieren
    objekte_path = SHEETS_DIR / "M3GIM-Objekte.xlsx"
    if objekte_path.exists():
        print(f"Validiere {objekte_path.name}...")
        df_objekte = pd.read_excel(objekte_path)
        stats['objekte'] = len(df_objekte)
        all_issues.extend(validate_objekte(df_objekte))
        valid_signaturen.update(df_objekte['archivsignatur'].dropna().astype(str).tolist())
    else:
        print(f"  WARNUNG: {objekte_path.name} nicht gefunden")

    # Fotos laden und validieren
    fotos_path = SHEETS_DIR / "M3GIM-Fotos.xlsx"
    if fotos_path.exists():
        print(f"Validiere {fotos_path.name}...")
        df_fotos = pd.read_excel(fotos_path)
        stats['fotos'] = len(df_fotos)
        all_issues.extend(validate_fotos(df_fotos))
        valid_signaturen.update(df_fotos['archivsignatur'].dropna().astype(str).tolist())
    else:
        print(f"  WARNUNG: {fotos_path.name} nicht gefunden")

    # Verknüpfungen laden und validieren
    verk_path = SHEETS_DIR / "M3GIM-Verknüpfungen.xlsx"
    if verk_path.exists():
        print(f"Validiere {verk_path.name}...")
        df_verk = pd.read_excel(verk_path)
        stats['verknuepfungen'] = len(df_verk)
        all_issues.extend(validate_verknuepfungen(df_verk, valid_signaturen))
    else:
        print(f"  WARNUNG: {verk_path.name} nicht gefunden")

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
    print(f"  Fehler: {len(errors)}")
    print(f"  Warnungen: {len(warnings)}")
    print(f"  Report: {report_path}")
    print("=" * 60)

    # Exit-Code für CI/CD
    return 1 if errors else 0


if __name__ == "__main__":
    exit(main())
