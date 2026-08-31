#!/usr/bin/env python3
"""
MÂ³GIM Validierung â€” Step 2 der Pipeline.

Prueft die Google Sheets Excel-Exporte und erzeugt einen Markdown-Report.
Normalisiert Werte vor der Validierung (.lower().strip(), Datetime-Artefakte).

Verwendung:
    python scripts/validate.py
"""

import csv
import os
import sys
import re
import pandas as pd
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass

from transform import (
    build_index_lookup,
    load_index as _load_index,
    load_verknuepfungen,
    normalize_role,
    resolve_verknuepfungen_source,
)

# Windows-Konsole: UTF-8 erzwingen
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent.parent
SHEETS_DIR = Path(os.environ.get("M3GIM_SHEETS_DIR", BASE_DIR / "data" / "google-spreadsheet"))
REPORTS_DIR = Path(os.environ.get("M3GIM_REPORTS_DIR", BASE_DIR / "data" / "reports"))

# ---------------------------------------------------------------------------
# Signatur-Patterns
# ---------------------------------------------------------------------------

SIGNATUR_PATTERNS = {
    'hauptbestand': r'^UAKUG/NIM_\d{3}$',
    'plakate': r'^UAKUG/NIM/PL_\d{2}$',
    'tontraeger': r'^UAKUG/NIM_TT_\d{2}$'
}

# ---------------------------------------------------------------------------
# Kontrollierte Vokabulare (Iteration 2 â€” erweitert)
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
        "vollständig", "vollstaendig", "in bearbeitung", "offen",
        "abgeschlossen", "begonnen", "zurueckgestellt", "zurückgestellt",
        "erledigt"
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
        "datum", "detail", "ensemble", "ausgaben", "einnahmen", "summe"
    ]
}

# Komposit-Typen die als gueltig akzeptiert werden
KOMPOSIT_TYPEN = [
    "ort,datum", "ort, datum",
    "ausgaben,waehrung", "ausgaben, waehrung", "ausgaben, währung",
    "einnahmen,waehrung", "einnahmen, waehrung", "einnahmen, währung",
    "summe,waehrung", "summe, waehrung", "summe, währung",
    "ereignis,ort,datum", "ereignis, ort, datum",
    "ausgaben,währung", "einnahmen,währung", "summe,währung"
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
# Header-Shift-Korrekturen kommen aus _common.py (INDEX_HEADER_SHIFTS).


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

@dataclass
class ValidationIssue:
    """Ein Validierungsproblem.

    ``sheet`` benennt das Quellblatt. Die Verknuepfungen verteilen sich seit
    E-95 auf mehrere Blaetter, weshalb eine Zeilennummer ohne Blattangabe im
    Report nicht auffindbar ist.
    """
    level: str  # ERROR oder WARNING
    code: str
    table: str
    row: int
    field: str
    value: str
    message: str
    sheet: str = ""


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
    # Excel-Datetime-Artefakt: "1958-04-18 00:00:00" â†’ "1958-04-18"
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


def normalize_bearbeitungsstand(value: str) -> str | None:
    """Normalisiert Bearbeitungsstand wie transform.py (fuzzy matching)."""
    if value is None:
        return None
    bs = value.strip().lower()
    if not bs:
        return None
    if 'vollst' in bs or bs == 'abgeschlossen' or bs.startswith('erledigt'):
        return 'abgeschlossen'
    elif bs.startswith('begonnen') or bs == 'in bearbeitung' or bs == 'offen':
        return bs  # Originalwert behalten (ist im Vokabular)
    elif 'ckgestellt' in bs or 'zurück' in bs:
        return 'zurueckgestellt'
    return None  # Unbekannter Wert -> E004


def validate_vocab(value: str, vocab_name: str) -> bool:
    """Prueft ob Wert im Vokabular enthalten ist (nach Normalisierung)"""
    if value is None:
        return True
    return value in VOCAB.get(vocab_name, [])


def is_komposit_typ(value: str) -> bool:
    """Prueft ob ein Typ ein gueltiger Komposit-Typ ist"""
    if value is None:
        return False
    normalized = value.replace(" ", "")
    return normalized in [k.replace(" ", "") for k in KOMPOSIT_TYPEN] or value in KOMPOSIT_TYPEN


def is_empty_row(row: pd.Series, key_fields: list) -> bool:
    """Prueft ob eine Zeile leer ist (alle Schluesselfelder leer)"""
    return all(pd.isna(row.get(f)) or str(row.get(f, "")).strip() == "" for f in key_fields)


def load_index(name: str) -> pd.DataFrame | None:
    """Laedt einen Index ueber den Loader der Pipeline.

    Die eigene Kopie dieser Funktion kannte nur den Legacy-Zweig der
    Header-Shift-Korrektur; sie liess dem Personenindex die kopflose
    Namensspalte und dem Ortsindex die mit einem Ortsnamen ueberschriebene
    Kennungsspalte. Die Validierung sah damit andere Spalten als die
    Transformation, und die Befunde der Index-Verdichtung fielen aus (E-152).
    """
    return _load_index(name)


# ---------------------------------------------------------------------------
# Pruefschicht der CSV-Quelle (E-152)
# ---------------------------------------------------------------------------

# Zulaessige Datumsnotationen der Verknuepfungstabelle nach data.md § 6:
# volles ISO-Datum, Monat, Jahr, Zeitspanne mit "/", die belegte Freitextform
# "bis" sowie die Klammer-/Fragezeichen-Unsicherheit und die drei Qualifier.
_ISO_DATE_PART = r'\d{4}(?:-\d{2}(?:-\d{2})?)?'
_SOURCE_DATE_OK = re.compile(
    r'^(?:'
    rf'(?:circa:|vor:|nach:)?{_ISO_DATE_PART}(?:/{_ISO_DATE_PART})?'
    rf'|{_ISO_DATE_PART}\s+bis\s+{_ISO_DATE_PART}'
    r'|\d{4}-\d{4}'                        # Spielzeitform, clean_date macht YYYY/YYYY daraus
    r'|\d{4}-\[[^\]]+\]'
    r')$'
)
_TIMESTAMP_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}[ T]00:00:00$')

# Buendelungskennung: ganze Zahl (Aktivitaet) oder zweistellige Dezimale
# (Beteiligung, E-127). Eine einstellige Dezimale ist zwischen Beteiligung 01
# und 10 nicht entscheidbar.
_ID_ACTIVITY = re.compile(r'^\d+$')
_ID_PARTICIPATION = re.compile(r'^\d+\.\d{2}$')
_ID_AMBIGUOUS = re.compile(r'^\d+\.\d$')

# Folio-Formen der Quelle. Die Bindestrichform trifft keinen Objektsatz, weil
# die Objekttabelle dieselben Folios mit Unterstrich fuehrt.
_FOLIO_OK = re.compile(r'^\d+(?:_\d+){0,2}$')
_FOLIO_HYPHEN = re.compile(r'^\d+-\d+$')

_SIGNATUR_OK = re.compile(r'^UAKUG/NIM(?:_\d{1,3}|/PL_\d{2}|_TT_\d{2})$')

_DATE_TYPES = {"datum", "ort, datum", "ort_datum", "datum, werk", "datum_werk"}


def _source_position(row, idx: int) -> tuple[int, str]:
    """Fundstelle einer Verknuepfungszeile aus der Provenienz des Loaders."""
    sheet = ""
    if "_xlsx_sheet" in row.index and pd.notna(row.get("_xlsx_sheet")):
        sheet = str(row.get("_xlsx_sheet"))
    if "_xlsx_row" in row.index and pd.notna(row.get("_xlsx_row")):
        return int(row.get("_xlsx_row")), sheet
    return int(idx) + 2, sheet


def load_typ_rolle(sheets_dir: Path) -> dict[str, set[str]]:
    """Liest die Wertliste `Typ-Rolle.csv` als {typ: {rolle}}.

    Die Datei ist kein Verknuepfungsblatt, sondern die an der Quelle
    hinterlegte Dropdown-Zuordnung. Fehlt sie, entfaellt die Kreuzpruefung.
    """
    path = Path(sheets_dir) / "verknuepfungen" / "Typ-Rolle.csv"
    if not path.exists():
        return {}
    allowed: dict[str, set[str]] = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))
    for raw in rows[1:]:
        if not raw:
            continue
        typ = (raw[0] or "").strip().lower()
        if not typ:
            continue
        bucket = allowed.setdefault(typ, set())
        for cell in raw[1:]:
            rolle = normalize_role(cell)
            if rolle:
                bucket.add(rolle)
    return allowed


def validate_verknuepfungen_source(df: pd.DataFrame,
                                   typ_rolle: dict | None = None
                                   ) -> list[ValidationIssue]:
    """Prueft die Verknuepfungszeilen gegen die Formatregeln der Quelle.

    Die Schicht meldet und repariert nichts. Jeder Befund traegt Blatt und
    Zeile, damit das Erschliessungsteam ihn in der Tabelle findet
    (data.md § 3, § 6, § 17; pipeline-architecture.md § Pruefschicht).
    """
    issues: list[ValidationIssue] = []
    combos: dict = {}

    for idx, row in df.iterrows():
        excel_row, sheet = _source_position(row, idx)
        typ_raw = row.get('typ')
        typ = str(typ_raw).strip().lower() if pd.notna(typ_raw) else ""
        name_raw = row.get('name')
        name = str(name_raw).strip() if pd.notna(name_raw) else ""
        rolle = normalize_role(row.get('rolle')) or ""

        # --- Signaturstumpf ------------------------------------------------
        sig_raw = row.get('archivsignatur')
        sig = str(sig_raw).strip() if pd.notna(sig_raw) else ""
        if sig and sig.lower() != "beispiel" and not _SIGNATUR_OK.match(sig):
            issues.append(ValidationIssue(
                level="ERROR", code="E014", table="Verknuepfungen", row=excel_row,
                sheet=sheet, field="archivsignatur", value=sig,
                message="Signatur ohne Konvolutnummer, bezeichnet kein Objekt",
            ))

        # --- Datumsformat ---------------------------------------------------
        if typ in _DATE_TYPES and name:
            candidate = name
            if typ in {"ort, datum", "ort_datum", "datum, werk", "datum_werk"}:
                # Komposit: nur die Datumshaelfte pruefen, wenn sie abtrennbar ist.
                parts = [p.strip() for p in name.split(",")]
                candidate = next(
                    (p for p in parts if re.match(r'^\d{4}', p)), ""
                )
            if candidate:
                if _TIMESTAMP_PATTERN.match(candidate):
                    issues.append(ValidationIssue(
                        level="WARNING", code="W010", table="Verknuepfungen",
                        row=excel_row, sheet=sheet, field="name", value=candidate,
                        message=("Zeitstempelmuster: der Wert ist durch eine "
                                 "Autokonvertierung der Tabellenkalkulation "
                                 "gelaufen und behauptet Tagesgenauigkeit"),
                    ))
                elif not _SOURCE_DATE_OK.match(candidate):
                    issues.append(ValidationIssue(
                        level="ERROR", code="E010", table="Verknuepfungen",
                        row=excel_row, sheet=sheet, field="name", value=candidate,
                        message="Datumsnotation ausserhalb von data.md § 6",
                    ))

        # --- Buendelungskennung ---------------------------------------------
        dp_raw = row.get('datenpunkt_id') if 'datenpunkt_id' in df.columns else None
        dp = str(dp_raw).strip() if pd.notna(dp_raw) else ""
        if dp:
            if _ID_AMBIGUOUS.match(dp):
                issues.append(ValidationIssue(
                    level="WARNING", code="W011", table="Verknuepfungen",
                    row=excel_row, sheet=sheet, field="datenpunkt_id", value=dp,
                    message=("Beteiligungskennung mit einstelliger Dezimale, "
                             "zwischen 01 und 10 nicht entscheidbar"),
                ))
            elif not (_ID_ACTIVITY.match(dp) or _ID_PARTICIPATION.match(dp)):
                issues.append(ValidationIssue(
                    level="ERROR", code="E011", table="Verknuepfungen",
                    row=excel_row, sheet=sheet, field="datenpunkt_id", value=dp,
                    message="Kennung ausserhalb der Muster n und n.mm",
                ))

        # --- Folio -----------------------------------------------------------
        folio_raw = row.get('folio') if 'folio' in df.columns else None
        folio = str(folio_raw).strip() if pd.notna(folio_raw) else ""
        if folio and folio.lower() != "folio" and not _FOLIO_OK.match(folio):
            code = "E012" if _FOLIO_HYPHEN.match(folio) else "E015"
            message = ("Folio in Bindestrichform; die Objekttabelle fuehrt "
                       "dieselbe Folio mit Unterstrich"
                       if code == "E012" else "Folio ausserhalb der Quellmuster")
            issues.append(ValidationIssue(
                level="ERROR", code=code, table="Verknuepfungen", row=excel_row,
                sheet=sheet, field="folio", value=folio, message=message,
            ))

        # --- Zeile ohne Typ ---------------------------------------------------
        if not typ and name:
            issues.append(ValidationIssue(
                level="ERROR", code="E013", table="Verknuepfungen", row=excel_row,
                sheet=sheet, field="typ",
                value=f"{sig} | {folio} | {name} | {rolle}",
                message=("Zeile mit Name und Rolle ohne Typ; ohne Typ ist der "
                         "Zielkontext unbestimmt und die Zeile wird nicht modelliert"),
            ))

        # --- Kreuzpruefung typ x rolle ---------------------------------------
        if typ_rolle and typ:
            if rolle not in typ_rolle.get(typ, set()):
                key = (typ, rolle)
                if key not in combos:
                    combos[key] = [excel_row, sheet, 0]
                combos[key][2] += 1

    for (typ, rolle), (first_row, first_sheet, count) in combos.items():
        issues.append(ValidationIssue(
            level="WARNING", code="W012", table="Verknuepfungen", row=first_row,
            sheet=first_sheet, field="typ/rolle", value=f"{typ} / {rolle}",
            message=(f"Kombination steht nicht in Typ-Rolle.csv, {count} Zeile(n); "
                     "entweder fehlt sie in der Wertliste oder der Wert ist falsch"),
        ))

    return issues


def validate_index_identities(name: str, lookup: dict) -> list[ValidationIssue]:
    """Meldet die Befunde der Index-Verdichtung (data.md § 3).

    Ein Feldkonflikt innerhalb einer Identitaet, eine Namenskollision zwischen
    zwei Kennungen und ein im Werkindex mehrdeutiger Titel sind Quellbefunde;
    die Pipeline loest sie deterministisch auf, ohne sie zu verschweigen.
    """
    issues: list[ValidationIssue] = []
    for key in sorted(lookup):
        entry = lookup[key]
        if entry.get("index_conflict"):
            fields = entry.get("index_conflict_fields", {})
            issues.append(ValidationIssue(
                level="WARNING", code="W013", table=name, row=0, sheet=name,
                field=", ".join(sorted(fields)), value=entry.get("name", key),
                message=("Mehrfach erfasste Identitaet mit verschiedenen Werten; "
                         f"der erste gewinnt: {fields}"),
            ))
        if entry.get("name_collision"):
            issues.append(ValidationIssue(
                level="WARNING", code="W014", table=name, row=0, sheet=name,
                field="m3gim_id", value=entry.get("name", key),
                message=("Derselbe Name unter mehreren Kennungen: "
                         f"{entry.get('collision_candidates')}"),
            ))
        if entry.get("ambiguous"):
            issues.append(ValidationIssue(
                level="WARNING", code="W015", table=name, row=0, sheet=name,
                field="titel", value=entry.get("name", key),
                message=("Titel bezeichnet mehrere Werke; ohne Komponisten in der "
                         "Verknuepfungszeile bleibt die Zuordnung offen: "
                         f"{[c.get('komponist') for c in entry.get('candidates', [])]}"),
            ))
    return issues


# ---------------------------------------------------------------------------
# Validierung: Objekte
# ---------------------------------------------------------------------------

def validate_objekte(df: pd.DataFrame) -> list[ValidationIssue]:
    """Validiert die Objekttabelle"""
    issues = []

    # Eindeutigkeit Signaturen â€” Konvolute duerfen gleiche archivsignatur haben
    # (unterschieden durch Folio-Spalte). Nur echte Duplikate (gleiche Signatur
    # UND gleiche Folio) sind Fehler.
    # Nachzug aus transform.py (E-95/E-152): nicht-textuelle Kopfzellen
    # ueberspringen, statt an .lower() zu scheitern — im Box-Export traegt
    # Spalte 0 statt "box_nr" den int 1. Und dieselbe Namensliste wie
    # transform.py verwenden; ohne "folio nr" fand die Validierung die
    # Folio-Spalte nicht und meldete jede Folio eines Konvoluts als Duplikat.
    folio_col = None
    for col in df.columns:
        if not isinstance(col, str):
            continue
        if col.lower() in ['folio', 'folio nr', 'folio_nr', 'unnamed: 2']:
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
                             ('datierungsevidenz', 'datierungsevidenz')]:
            val = normalize_str(row.get(field))
            if val is not None and not validate_vocab(val, vocab):
                issues.append(ValidationIssue(
                    level="ERROR", code="E004", table="Objekte", row=excel_row,
                    field=field, value=str(row.get(field)),
                    message=f"Ungueltiger Wert fuer {field}"
                ))

        # Bearbeitungsstand: fuzzy Normalisierung (spiegelt transform.py)
        bs_raw = normalize_str(row.get('bearbeitungsstand'))
        if bs_raw is not None:
            bs_norm = normalize_bearbeitungsstand(bs_raw)
            if bs_norm is None:
                issues.append(ValidationIssue(
                    level="ERROR", code="E004", table="Objekte", row=excel_row,
                    field="bearbeitungsstand", value=str(row.get('bearbeitungsstand')),
                    message="Ungueltiger Wert fuer bearbeitungsstand"
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

        excel_row, sheet = _source_position(row, idx)

        # Template-Zeilen ueberspringen
        sig = row.get('archivsignatur')
        if pd.notna(sig) and str(sig).strip().lower() == "beispiel":
            continue

        # Referentielle Integritaet: Signatur muss in Objekte existieren
        if pd.notna(sig) and str(sig).strip() != "":
            sig_str = str(sig).strip()
            if sig_str not in valid_signaturen:
                issues.append(ValidationIssue(
                    level="ERROR", code="E005", table="Verknuepfungen", row=excel_row, sheet=sheet,
                    field="archivsignatur", value=sig_str,
                    message="Signatur existiert nicht in Objekte"
                ))

        # Typ-Vokabular (nach Normalisierung)
        typ = normalize_str(row.get('typ'))
        if typ is not None:
            if not validate_vocab(typ, 'verknuepfung_typ') and not is_komposit_typ(typ):
                issues.append(ValidationIssue(
                    level="ERROR", code="E004", table="Verknuepfungen", row=excel_row, sheet=sheet,
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
                                level="WARNING", code="W004", table="Verknuepfungen", row=excel_row, sheet=sheet,
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
    """Erzeugt den Validierungsreport im kompakten, vollstaendigen Format."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    errors = [i for i in issues if i.level == "ERROR"]
    warnings = [i for i in issues if i.level == "WARNING"]

    by_code_warning = {}
    for w in warnings:
        key = (w.code, w.table)
        by_code_warning[key] = by_code_warning.get(key, 0) + 1

    status = "Validierung erfolgreich" if len(errors) == 0 else f"{len(errors)} Fehler muessen behoben werden"

    lines = []
    lines.append("# M3GIM Validierungsreport")
    lines.append("")
    lines.append(f"> Generiert: {now}")
    lines.append("")

    lines.append("## Executive Summary")
    lines.append("")
    lines.append(f"- Status: **{status}**")
    lines.append(f"- Fehler gesamt: **{len(errors)}**")
    lines.append(f"- Warnungen gesamt: **{len(warnings)}**")
    lines.append(f"- Objekte geprueft: **{stats.get('objekte', 0)}**")
    lines.append(f"- Verknuepfungen geprueft: **{stats.get('verknuepfungen', 0)}**")
    lines.append(f"- Geladene Indizes: **{', '.join(stats.get('indices_loaded', []))}**")
    lines.append("")

    lines.append("## Kennzahlen")
    lines.append("")
    lines.append("| Bereich | Fehler | Warnungen |")
    lines.append("|---|---|---|")
    lines.append(
        f"| Objekte | {len([i for i in errors if i.table == 'Objekte'])} | "
        f"{len([i for i in warnings if i.table == 'Objekte'])} |"
    )
    lines.append(
        f"| Verknuepfungen | {len([i for i in errors if i.table == 'Verknuepfungen'])} | "
        f"{len([i for i in warnings if i.table == 'Verknuepfungen'])} |"
    )
    lines.append(
        f"| Indizes/sonstige | {len([i for i in errors if i.table not in {'Objekte', 'Verknuepfungen'}])} | "
        f"{len([i for i in warnings if i.table not in {'Objekte', 'Verknuepfungen'}])} |"
    )

    if errors:
        lines.append("")
        lines.append("## Blocker (Fehler)")
        lines.append("")
        for issue in errors:
            lines.append(
                f"- **{issue.code} {issue.table}"
                + (f" [{issue.sheet}]" if issue.sheet else "")
                + f" Zeile {issue.row}:** "
                f"{issue.field} = `{issue.value}` -> {issue.message}"
            )

    lines.append("")
    lines.append("## Warnungen nach Kategorie")
    lines.append("")
    if by_code_warning:
        lines.append("| Code | Tabelle | Anzahl |")
        lines.append("|---|---|---|")
        for (code, table), count in sorted(by_code_warning.items(), key=lambda x: (-x[1], x[0][0], x[0][1])):
            lines.append(f"| {code} | {table} | {count} |")
    else:
        lines.append("- Keine Warnungen vorhanden.")

    lines.append("")
    lines.append("## Vollstaendige Fehlerliste")
    lines.append("")
    if errors:
        for issue in errors:
            lines.append(
                f"- **{issue.code} {issue.table}"
                + (f" [{issue.sheet}]" if issue.sheet else "")
                + f" Zeile {issue.row}:** "
                f"{issue.field} = `{issue.value}` -> {issue.message}"
            )
    else:
        lines.append("- Keine Fehler.")

    lines.append("")
    lines.append("## Vollstaendige Warnungsliste")
    lines.append("")
    if warnings:
        for issue in warnings:
            lines.append(
                f"- **{issue.code} {issue.table}"
                + (f" [{issue.sheet}]" if issue.sheet else "")
                + f" Zeile {issue.row}:** "
                f"{issue.field} = `{issue.value}` -> {issue.message}"
            )
    else:
        lines.append("- Keine Warnungen.")

    return "\n".join(lines)
# ---------------------------------------------------------------------------
# Hauptfunktion
# ---------------------------------------------------------------------------

def main():
    """Hauptfunktion"""
    print("=" * 60)
    print("MÂ³GIM Validierung (Iteration 2)")
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
        # Spaltennamen normalisieren (Excel hat gemischte Gross-/Kleinschreibung)
        df_objekte.columns = [c.lower().strip() if isinstance(c, str) else c
                              for c in df_objekte.columns]
        stats['objekte'] = len(df_objekte)
        all_issues.extend(validate_objekte(df_objekte))
        valid_signaturen.update(
            df_objekte['archivsignatur'].dropna().astype(str).str.strip().tolist()
        )
        print(f"  {len(df_objekte)} Objekte geladen")
    else:
        print(f"\n  WARNUNG: {objekte_path.name} nicht gefunden")

    # Verknuepfungen laden und validieren. Quelle ist seit E-152 das
    # CSV-Verzeichnis; derselbe Loader wie in transform.py, damit die
    # Validierung genau die Zeilen sieht, die transformiert werden (E-95).
    try:
        verk_path = resolve_verknuepfungen_source(SHEETS_DIR)
    except FileNotFoundError as exc:
        verk_path = None
        print(f"  WARNUNG: {exc}")
    if verk_path is not None:
        print(f"Validiere {verk_path.name}...")
        df_verk = load_verknuepfungen(verk_path)
        stats['verknuepfungen'] = len(df_verk)
        all_issues.extend(validate_verknuepfungen(df_verk, valid_signaturen, indices))
        all_issues.extend(
            validate_verknuepfungen_source(df_verk, load_typ_rolle(SHEETS_DIR))
        )
        print(f"  {len(df_verk)} Verknuepfungen geladen")

    # Befunde der Index-Verdichtung (data.md § 3)
    for canonical, index_df in indices.items():
        all_issues.extend(
            validate_index_identities(canonical, build_index_lookup(index_df))
        )

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

