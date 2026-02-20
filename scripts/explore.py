#!/usr/bin/env python3
"""M³GIM Data Explorer — Step 1 der Pipeline.

Analysiert Google-Sheets-Exporte (XLSX) und erzeugt einen Exploration Report.
Zeigt Datenstruktur, Füllgrade, Vokabulare und Probleme BEVOR validiert wird.

Verwendung:
    python scripts/explore.py                                    # data/google-spreadsheet/ (default)
    python scripts/explore.py data/google-spreadsheet/export.zip # ZIP entpacken
    python scripts/explore.py data/google-spreadsheet/           # Ordner direkt
"""

import sys
import os
import zipfile
import re
from pathlib import Path
from datetime import datetime
from collections import Counter

# Windows-Konsole: UTF-8 erzwingen
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

import pandas as pd

# ---------------------------------------------------------------------------
# Konfiguration
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
INPUT_DIR = ROOT / "data" / "google-spreadsheet"
REPORT_DIR = ROOT / "data" / "reports"

# Erwartete Tabellen (flexible Zuordnung: Schlüssel = kanonischer Name)
EXPECTED_TABLES = {
    "objekte": {
        "patterns": ["objekte", "objects"],
        "description": "Hauptbestand + Plakate + Tonträger",
    },
    "verknuepfungen": {
        "patterns": ["verknüpfungen", "verknuepfungen", "relations", "links"],
        "description": "Kontextuelle Verknüpfungen",
    },
    "personenindex": {
        "patterns": ["personenindex", "personen", "persons"],
        "description": "Personen-Normdaten",
    },
    "organisationsindex": {
        "patterns": ["organisationsindex", "organisationen", "organizations"],
        "description": "Organisations-Normdaten",
    },
    "ortsindex": {
        "patterns": ["ortsindex", "orte", "places"],
        "description": "Orts-Normdaten",
    },
    "werkindex": {
        "patterns": ["werkindex", "werke", "works"],
        "description": "Werk-Normdaten",
    },
}

# Spalten die kontrollierte Vokabulare enthalten
VOCAB_COLUMNS = [
    "dokumenttyp", "sprache", "zugaenglichkeit", "scan_status",
    "datierungsevidenz", "typ", "rolle", "bearbeitungsstand",
]

# Signaturmuster
SIGNATUR_PATTERNS = {
    "hauptbestand": r"^UAKUG/NIM_\d{3}$",
    "plakate": r"^UAKUG/NIM/PL_\d{2}$",
    "tontraeger": r"^UAKUG/NIM_TT_\d{2}$",
}

# Datumsformate
DATE_ISO = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")
DATE_RANGE = re.compile(r"^\d{4}.*[/–-].*\d{4}")
DATE_QUALIFIER = re.compile(r"^(circa|vor|nach|um):")
DATE_EXCEL_ARTIFACT = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$")


# ---------------------------------------------------------------------------
# ZIP-Handling
# ---------------------------------------------------------------------------

def extract_zip(zip_path: Path, target_dir: Path) -> list[Path]:
    """Entpackt ZIP nach target_dir, gibt Liste der XLSX-Dateien zurück."""
    target_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(target_dir)
    return list(target_dir.glob("**/*.xlsx"))


# ---------------------------------------------------------------------------
# Datei-Matching
# ---------------------------------------------------------------------------

def match_tables(xlsx_files: list[Path]) -> dict[str, Path | None]:
    """Ordnet gefundene XLSX-Dateien den erwarteten Tabellen zu."""
    matched = {name: None for name in EXPECTED_TABLES}
    unmatched = []

    for f in xlsx_files:
        stem = f.stem.lower().replace("-", "").replace("_", "").replace(" ", "")
        found = False
        for name, config in EXPECTED_TABLES.items():
            for pattern in config["patterns"]:
                normalized = pattern.lower().replace("-", "").replace("_", "").replace(" ", "")
                if normalized in stem or stem in normalized:
                    matched[name] = f
                    found = True
                    break
            if found:
                break
        if not found:
            unmatched.append(f)

    return matched, unmatched


# ---------------------------------------------------------------------------
# Tabellen-Analyse
# ---------------------------------------------------------------------------

def analyze_table(path: Path, name: str) -> dict:
    """Analysiert eine einzelne XLSX-Datei."""
    result = {
        "path": path,
        "name": name,
        "sheets": [],
        "columns": [],
        "row_count": 0,
        "column_analysis": [],
        "vocab_values": {},
        "warnings": [],
    }

    try:
        xls = pd.ExcelFile(path, engine="openpyxl")
        result["sheets"] = xls.sheet_names

        # Erste Sheet lesen (Google Sheets Export hat typisch nur eine)
        df = pd.read_excel(path, engine="openpyxl")

        # Leere Zeilen entfernen
        df = df.dropna(how="all")

        # Template-Zeilen erkennen und entfernen
        if "archivsignatur" in df.columns:
            template_mask = df["archivsignatur"].astype(str).str.lower() == "beispiel"
            template_count = template_mask.sum()
            if template_count > 0:
                result["warnings"].append(
                    f"{template_count} Template-Zeile(n) gefunden (archivsignatur='beispiel')"
                )
                df = df[~template_mask]

        result["columns"] = list(df.columns)
        result["row_count"] = len(df)

        # Spaltenanalyse
        for col in df.columns:
            series = df[col]
            non_null = series.notna().sum()
            fill_rate = non_null / len(df) * 100 if len(df) > 0 else 0

            # Typ erkennen
            col_type = _detect_column_type(series)

            col_info = {
                "name": col,
                "type": col_type,
                "fill_rate": round(fill_rate, 1),
                "non_null": non_null,
                "total": len(df),
            }

            # Vokabular-Spalten: Unique-Werte auflisten
            col_lower = str(col).lower().strip()
            if col_lower in VOCAB_COLUMNS or non_null <= 50:
                unique_vals = sorted(
                    series.dropna().astype(str).unique(),
                    key=lambda x: x.lower()
                )
                if 0 < len(unique_vals) <= 100:
                    col_info["unique_values"] = unique_vals
                    col_info["unique_count"] = len(unique_vals)

            result["column_analysis"].append(col_info)

        # Spezifische Checks je nach Tabelle
        if name == "objekte":
            result.update(_analyze_objekte(df))
        elif name == "verknuepfungen":
            result.update(_analyze_verknuepfungen(df))
        elif name in ("personenindex", "organisationsindex", "ortsindex", "werkindex"):
            result.update(_analyze_index(df, name))

    except Exception as e:
        result["warnings"].append(f"Fehler beim Lesen: {e}")

    return result


def _detect_column_type(series: pd.Series) -> str:
    """Erkennt den dominanten Datentyp einer Spalte."""
    non_null = series.dropna()
    if len(non_null) == 0:
        return "leer"
    if pd.api.types.is_numeric_dtype(non_null):
        return "numerisch"
    if pd.api.types.is_datetime64_any_dtype(non_null):
        return "datum"
    # String-basierte Datumserkennung
    str_vals = non_null.astype(str)
    date_count = sum(1 for v in str_vals if DATE_ISO.match(v) or DATE_RANGE.match(v))
    if date_count > len(non_null) * 0.5:
        return "datum (string)"
    return "text"


def _analyze_objekte(df: pd.DataFrame) -> dict:
    """Spezifische Analyse für die Objekte-Tabelle."""
    extra = {"signatur_analysis": {}, "date_analysis": {}}

    # Signatur-Analyse
    if "archivsignatur" in df.columns:
        sigs = df["archivsignatur"].dropna().astype(str)
        counts = {"hauptbestand": 0, "plakate": 0, "tontraeger": 0, "unbekannt": 0}
        duplicates = []
        seen = set()

        for sig in sigs:
            sig = sig.strip()
            if sig in seen:
                duplicates.append(sig)
            seen.add(sig)

            matched = False
            for typ, pattern in SIGNATUR_PATTERNS.items():
                if re.match(pattern, sig):
                    counts[typ] += 1
                    matched = True
                    break
            if not matched:
                counts["unbekannt"] += 1

        extra["signatur_analysis"] = {
            "counts": counts,
            "duplicates": duplicates,
            "total": len(sigs),
        }

    # Datums-Analyse
    if "entstehungsdatum" in df.columns:
        dates = df["entstehungsdatum"].dropna().astype(str)
        date_types = Counter()
        suspicious = []

        for d in dates:
            d = d.strip()
            if DATE_EXCEL_ARTIFACT.match(d):
                date_types["excel_artefakt"] += 1
            elif DATE_QUALIFIER.match(d):
                date_types["qualifiziert"] += 1
            elif DATE_ISO.match(d):
                date_types["iso"] += 1
                # Verdächtige Daten (Zukunft)
                try:
                    year = int(d[:4])
                    if year > 2010:
                        suspicious.append(d)
                except ValueError:
                    pass
            elif DATE_RANGE.match(d):
                date_types["bereich"] += 1
            else:
                date_types["sonstiges"] += 1

        extra["date_analysis"] = {
            "distribution": dict(date_types),
            "total": len(dates),
            "suspicious": suspicious,
        }

    return extra


def _analyze_verknuepfungen(df: pd.DataFrame) -> dict:
    """Spezifische Analyse für die Verknüpfungen-Tabelle."""
    extra = {"link_analysis": {}}

    # Typ-Verteilung
    if "typ" in df.columns:
        typ_counts = df["typ"].dropna().astype(str).str.strip().str.lower()
        # Komposit-Typen erkennen
        composite = typ_counts[typ_counts.str.contains(",")]
        simple = typ_counts[~typ_counts.str.contains(",")]

        extra["link_analysis"]["typ_distribution"] = dict(Counter(typ_counts))
        extra["link_analysis"]["composite_count"] = len(composite)
        extra["link_analysis"]["composite_types"] = dict(Counter(composite))

    # Folio-Nutzung
    if "folio" in df.columns:
        folio_filled = df["folio"].notna().sum()
        extra["link_analysis"]["folio_usage"] = folio_filled

    # Top-Objekte nach Verknüpfungsanzahl
    if "archivsignatur" in df.columns:
        sig_counts = Counter(df["archivsignatur"].dropna().astype(str))
        extra["link_analysis"]["top_objects"] = dict(sig_counts.most_common(10))

    return extra


def _analyze_index(df: pd.DataFrame, name: str) -> dict:
    """Spezifische Analyse für Index-Tabellen."""
    extra = {"index_analysis": {}}

    # Spaltenheader prüfen (bekannte Shifts)
    expected_headers = {
        "personenindex": ["id", "name", "wikidata_id", "anmerkung"],
        "organisationsindex": ["id", "name", "wikidata_id", "ort"],
        "ortsindex": ["id", "name", "wikidata_id", "koordinaten"],
        "werkindex": ["id", "titel", "komponist", "wikidata_id"],
    }
    expected = expected_headers.get(name, [])
    actual = [str(c).lower().strip() for c in df.columns]
    missing = [h for h in expected if h not in actual]
    unexpected = [c for c in actual if c not in expected and c != ""]

    extra["index_analysis"]["expected_headers"] = expected
    extra["index_analysis"]["actual_headers"] = list(df.columns)
    extra["index_analysis"]["missing_headers"] = missing
    extra["index_analysis"]["unexpected_headers"] = unexpected

    if missing:
        extra.setdefault("warnings", []).append(
            f"Fehlende Spaltenheader: {', '.join(missing)} "
            f"(gefunden: {', '.join(str(c) for c in df.columns)})"
        )

    # ID-Analyse
    id_col = None
    for col in df.columns:
        if str(col).lower().strip() in ("id", "m3gim_id"):
            id_col = col
            break

    if id_col:
        ids = df[id_col].dropna().astype(str)
        duplicates = [v for v, c in Counter(ids).items() if c > 1]
        missing_ids = df[df[id_col].isna()].index.tolist()
        extra["index_analysis"]["total"] = len(df)
        extra["index_analysis"]["duplicate_ids"] = duplicates
        extra["index_analysis"]["missing_id_rows"] = len(missing_ids)
    else:
        extra.setdefault("warnings", []).append("Kein ID-Header gefunden")

    # Wikidata-Abdeckung
    for col in df.columns:
        if "wikidata" in str(col).lower():
            wikidata_filled = df[col].notna().sum()
            extra["index_analysis"]["wikidata_count"] = wikidata_filled
            extra["index_analysis"]["wikidata_rate"] = (
                round(wikidata_filled / len(df) * 100, 1) if len(df) > 0 else 0
            )
            break

    return extra


# ---------------------------------------------------------------------------
# Cross-Table-Analyse
# ---------------------------------------------------------------------------

def cross_table_analysis(tables: dict[str, dict]) -> list[dict]:
    """Prüft referentielle Integrität zwischen Tabellen."""
    checks = []

    objekte = tables.get("objekte")
    verknuepfungen = tables.get("verknuepfungen")

    if not objekte or not verknuepfungen:
        return checks

    obj_path = objekte["path"]
    verk_path = verknuepfungen["path"]

    try:
        df_obj = pd.read_excel(obj_path, engine="openpyxl").dropna(how="all")
        df_verk = pd.read_excel(verk_path, engine="openpyxl").dropna(how="all")

        # Template-Zeilen filtern
        if "archivsignatur" in df_obj.columns:
            df_obj = df_obj[df_obj["archivsignatur"].astype(str).str.lower() != "beispiel"]

        # Check 1: Verknüpfungen → Objekte
        if "archivsignatur" in df_obj.columns and "archivsignatur" in df_verk.columns:
            obj_sigs = set(df_obj["archivsignatur"].dropna().astype(str).str.strip())
            verk_sigs = set(df_verk["archivsignatur"].dropna().astype(str).str.strip())
            orphan_sigs = verk_sigs - obj_sigs

            checks.append({
                "name": "Verknüpfungen → Objekte",
                "description": "Verknüpfungen referenzieren existierende Objekte",
                "obj_count": len(obj_sigs),
                "verk_count": len(verk_sigs),
                "orphans": sorted(orphan_sigs),
                "status": "OK" if not orphan_sigs else "WARNUNG",
            })

        # Check 2: Verknüpfungen-Werte → Index-Tabellen
        if "wert" in df_verk.columns and "typ" in df_verk.columns:
            for index_name in ("personenindex", "organisationsindex", "ortsindex", "werkindex"):
                index_table = tables.get(index_name)
                if not index_table:
                    continue

                # Welcher Typ passt zu welchem Index?
                typ_mapping = {
                    "personenindex": ["person"],
                    "organisationsindex": ["institution"],
                    "ortsindex": ["ort"],
                    "werkindex": ["werk"],
                }
                relevant_types = typ_mapping.get(index_name, [])

                try:
                    df_idx = pd.read_excel(index_table["path"], engine="openpyxl").dropna(how="all")

                    # Index-Werte sammeln (name oder titel)
                    idx_values = set()
                    for col in ("name", "titel"):
                        if col in df_idx.columns:
                            idx_values.update(
                                df_idx[col].dropna().astype(str).str.strip().str.lower()
                            )
                    # Auch erste Spalte prüfen falls Header verschoben
                    if not idx_values and len(df_idx.columns) > 0:
                        first_col = df_idx.columns[0]
                        idx_values.update(
                            df_idx[first_col].dropna().astype(str).str.strip().str.lower()
                        )

                    # Verknüpfungswerte für diesen Typ
                    mask = df_verk["typ"].astype(str).str.lower().str.strip().isin(relevant_types)
                    verk_values = set(
                        df_verk.loc[mask, "wert"].dropna().astype(str).str.strip().str.lower()
                    )
                    not_in_index = verk_values - idx_values

                    checks.append({
                        "name": f"Verknüpfungen ({', '.join(relevant_types)}) → {index_name}",
                        "description": f"Werte in Verknüpfungen existieren im {index_name}",
                        "verk_values": len(verk_values),
                        "index_values": len(idx_values),
                        "not_in_index": sorted(list(not_in_index)[:20]),
                        "not_in_index_count": len(not_in_index),
                        "status": "OK" if not not_in_index else "INFO",
                    })
                except Exception:
                    pass

    except Exception as e:
        checks.append({
            "name": "Cross-Table-Analyse",
            "description": str(e),
            "status": "FEHLER",
        })

    return checks


# ---------------------------------------------------------------------------
# Report-Generierung
# ---------------------------------------------------------------------------

def generate_report(
    tables: dict[str, dict],
    unmatched: list[Path],
    cross_checks: list[dict],
    input_source: str,
) -> str:
    """Erzeugt den Markdown Exploration Report."""
    lines = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines.append("# M³GIM Exploration Report")
    lines.append("")
    lines.append(f"> Generiert: {now}")
    lines.append(f"> Quelle: `{input_source}`")
    lines.append("")

    # --- Übersicht ---
    lines.append("---")
    lines.append("")
    lines.append("## Datei-Übersicht")
    lines.append("")
    lines.append("| Tabelle | Datei | Rows | Columns | Status |")
    lines.append("|---|---|---|---|---|")

    all_warnings = []

    for name, config in EXPECTED_TABLES.items():
        table = tables.get(name)
        if table:
            status = "OK"
            if table.get("warnings"):
                status = f"{len(table['warnings'])} Warnung(en)"
                all_warnings.extend(
                    (name, w) for w in table["warnings"]
                )
            lines.append(
                f"| {name} | {table['path'].name} | {table['row_count']} | "
                f"{len(table['columns'])} | {status} |"
            )
        else:
            lines.append(f"| {name} | — | — | — | FEHLT |")

    if unmatched:
        lines.append("")
        lines.append(f"**Nicht zugeordnete Dateien:** {', '.join(f.name for f in unmatched)}")

    # --- Pro Tabelle ---
    for name in EXPECTED_TABLES:
        table = tables.get(name)
        if not table:
            continue

        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append(f"## {name}")
        lines.append("")
        lines.append(f"**Datei:** `{table['path'].name}` · "
                      f"**Sheets:** {', '.join(table['sheets'])} · "
                      f"**Zeilen:** {table['row_count']}")
        lines.append("")

        # Spaltenanalyse
        lines.append("### Spalten")
        lines.append("")
        lines.append("| Spalte | Typ | Füllgrad | Non-Null |")
        lines.append("|---|---|---|---|")
        for col in table["column_analysis"]:
            lines.append(
                f"| {col['name']} | {col['type']} | {col['fill_rate']}% | "
                f"{col['non_null']}/{col['total']} |"
            )

        # Vokabular-Werte
        vocab_cols = [
            c for c in table["column_analysis"]
            if "unique_values" in c and c.get("unique_count", 0) > 0
        ]
        if vocab_cols:
            lines.append("")
            lines.append("### Werte")
            lines.append("")
            for col in vocab_cols:
                vals = col["unique_values"]
                if len(vals) <= 30:
                    val_str = " · ".join(vals)
                else:
                    val_str = " · ".join(vals[:30]) + f" · ... (+{len(vals) - 30})"
                lines.append(f"**{col['name']}** ({col['unique_count']}): {val_str}")
                lines.append("")

        # Signatur-Analyse (Objekte)
        if "signatur_analysis" in table and table["signatur_analysis"]:
            sa = table["signatur_analysis"]
            lines.append("### Signaturen")
            lines.append("")
            for typ, count in sa["counts"].items():
                lines.append(f"- {typ}: {count}")
            if sa["duplicates"]:
                lines.append(f"- **Duplikate:** {', '.join(sa['duplicates'])}")
            lines.append("")

        # Datums-Analyse (Objekte)
        if "date_analysis" in table and table["date_analysis"]:
            da = table["date_analysis"]
            lines.append("### Datumsformate")
            lines.append("")
            for fmt, count in da["distribution"].items():
                lines.append(f"- {fmt}: {count}")
            if da["suspicious"]:
                lines.append(f"- **Verdächtig (Zukunft):** {', '.join(da['suspicious'])}")
            lines.append("")

        # Verknüpfungs-Analyse
        if "link_analysis" in table and table["link_analysis"]:
            la = table["link_analysis"]
            if "typ_distribution" in la:
                lines.append("### Typ-Verteilung")
                lines.append("")
                for typ, count in sorted(la["typ_distribution"].items(), key=lambda x: -x[1]):
                    lines.append(f"- {typ}: {count}")
                lines.append("")
            if la.get("composite_count"):
                lines.append(f"**Komposit-Typen:** {la['composite_count']}")
                for ct, count in la["composite_types"].items():
                    lines.append(f"  - `{ct}`: {count}")
                lines.append("")
            if la.get("folio_usage"):
                lines.append(f"**Folio-Feld genutzt:** {la['folio_usage']} Verknüpfungen")
                lines.append("")
            if la.get("top_objects"):
                lines.append("### Top-10 Objekte (nach Verknüpfungsanzahl)")
                lines.append("")
                for sig, count in la["top_objects"].items():
                    lines.append(f"- {sig}: {count}")
                lines.append("")

        # Index-Analyse
        if "index_analysis" in table and table["index_analysis"]:
            ia = table["index_analysis"]
            if ia.get("missing_headers"):
                lines.append(f"**Fehlende Header:** {', '.join(ia['missing_headers'])}")
                lines.append(
                    f"**Gefundene Header:** {', '.join(str(c) for c in ia['actual_headers'])}"
                )
                lines.append("")
            if ia.get("duplicate_ids"):
                lines.append(f"**Doppelte IDs:** {', '.join(ia['duplicate_ids'])}")
                lines.append("")
            if ia.get("missing_id_rows"):
                lines.append(f"**Zeilen ohne ID:** {ia['missing_id_rows']}")
                lines.append("")
            if "wikidata_count" in ia:
                lines.append(
                    f"**Wikidata:** {ia['wikidata_count']}/{ia.get('total', '?')} "
                    f"({ia.get('wikidata_rate', 0)}%)"
                )
                lines.append("")

        # Warnungen
        if table.get("warnings"):
            lines.append("### Warnungen")
            lines.append("")
            for w in table["warnings"]:
                lines.append(f"- {w}")
            lines.append("")

    # --- Cross-Table-Checks ---
    if cross_checks:
        lines.append("---")
        lines.append("")
        lines.append("## Cross-Table-Checks")
        lines.append("")
        for check in cross_checks:
            status_icon = {"OK": "OK", "WARNUNG": "WARNUNG", "INFO": "INFO", "FEHLER": "FEHLER"}
            icon = status_icon.get(check["status"], check["status"])
            lines.append(f"### {check['name']} [{icon}]")
            lines.append("")
            lines.append(check["description"])
            lines.append("")
            if check.get("orphans"):
                lines.append(f"Verwaiste Signaturen ({len(check['orphans'])}): "
                             f"{', '.join(check['orphans'][:20])}")
                lines.append("")
            if check.get("not_in_index_count"):
                lines.append(
                    f"Nicht im Index ({check['not_in_index_count']}): "
                    f"{', '.join(check['not_in_index'][:20])}"
                )
                if check["not_in_index_count"] > 20:
                    lines.append(f"  ... und {check['not_in_index_count'] - 20} weitere")
                lines.append("")

    # --- Zusammenfassung ---
    lines.append("---")
    lines.append("")
    lines.append("## Zusammenfassung")
    lines.append("")

    found = sum(1 for t in tables.values() if t is not None)
    total_rows = sum(t["row_count"] for t in tables.values() if t)
    total_warnings = len(all_warnings)

    lines.append(f"- **Tabellen:** {found}/{len(EXPECTED_TABLES)} erkannt")
    lines.append(f"- **Gesamt-Zeilen:** {total_rows}")
    lines.append(f"- **Warnungen:** {total_warnings}")
    lines.append(f"- **Cross-Table-Checks:** {len(cross_checks)}")
    lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # Input bestimmen
    if len(sys.argv) > 1:
        source = Path(sys.argv[1])
    else:
        source = INPUT_DIR

    input_source = str(source)

    # ZIP oder Ordner?
    if source.is_file() and source.suffix.lower() == ".zip":
        print(f"Entpacke ZIP: {source}")
        xlsx_files = extract_zip(source, INPUT_DIR)
    elif source.is_dir():
        xlsx_files = list(source.glob("*.xlsx"))
        # Auch in Unterordnern suchen (Google Drive export)
        if not xlsx_files:
            xlsx_files = list(source.glob("**/*.xlsx"))
    else:
        print(f"Fehler: '{source}' ist weder ZIP noch Ordner.")
        sys.exit(1)

    if not xlsx_files:
        print(f"Keine XLSX-Dateien in {source} gefunden.")
        print(f"Erwarteter Pfad: {INPUT_DIR}")
        print("Bitte Google Sheets als XLSX exportieren und in data/google-spreadsheet/ ablegen.")
        sys.exit(1)

    print(f"Gefunden: {len(xlsx_files)} XLSX-Datei(en)")
    for f in xlsx_files:
        print(f"  - {f.name}")

    # Matching
    matched, unmatched = match_tables(xlsx_files)
    print(f"\nZugeordnet: {sum(1 for v in matched.values() if v)}/{len(EXPECTED_TABLES)}")
    for name, path in matched.items():
        status = f"→ {path.name}" if path else "FEHLT"
        print(f"  {name}: {status}")

    # Analyse
    print("\nAnalysiere Tabellen...")
    tables = {}
    for name, path in matched.items():
        if path:
            print(f"  {name}...")
            tables[name] = analyze_table(path, name)

    # Cross-Table
    print("Cross-Table-Checks...")
    cross_checks = cross_table_analysis(tables)

    # Report
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report = generate_report(tables, unmatched, cross_checks, input_source)
    report_path = REPORT_DIR / "exploration-report.md"
    report_path.write_text(report, encoding="utf-8")

    print(f"\nReport geschrieben: {report_path}")

    # Zusammenfassung
    warning_count = sum(len(t.get("warnings", [])) for t in tables.values())
    if warning_count > 0:
        print(f"\n{warning_count} Warnung(en) gefunden — siehe Report für Details.")


if __name__ == "__main__":
    main()
