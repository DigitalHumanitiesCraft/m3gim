"""Vergleicht zwei Exportstaende der M3GIM-Arbeitsmappen (ohne Verknuepfungen).

Aufruf:
    python diff_sources.py <alt-verzeichnis> <neu-verzeichnis> [-o bericht.md]

Fuer jede Mappe und jedes Blatt wird verglichen: Blattliste, Rohkopfzeile und
kanonisierte Spalten, Zeilenzahl, Header-Shift-Diagnose gegen
INDEX_HEADER_SHIFTS aus scripts/_common.py des Repos, Schluesselmenge
(Objekte: archivsignatur + folio; Indizes: m3gim_id bzw. name), neue und
entfallene Zeilen, geaenderte Zellen und die Verteilung der kontrollierten
Spalten.

Read-only: liest nur XLSX und schreibt genau eine Markdown-Datei.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")

# Fallback, falls scripts/_common.py des Repos nicht importierbar ist. Der
# Import ist der Normalfall, damit die Diagnose gegen den echten Kanon laeuft.
INDEX_HEADER_SHIFTS_FALLBACK: dict[str, list[str]] = {
    "personenindex": ["m3gim_id", "name", "wikidata_id", "lebensdaten", "anmerkung"],
    "organisationsindex": ["m3gim_id", "name", "wikidata_id", "ort",
                           "assoziierte_person", "anmerkung"],
    "ortsindex": ["m3gim_id", "name", "wikidata_id"],
    "werkindex": ["m3gim_id", "name", "wikidata_id", "komponist",
                  "rolle_stimme", "anmerkung"],
}

WORKBOOKS = [
    "M3GIM-Objekte",
    "M3GIM-Personenindex",
    "M3GIM-Organisationsindex",
    "M3GIM-Ortsindex",
    "M3GIM-Werkindex",
]

FOLIO_COL_NAMES = ("folio", "folio nr", "folio_nr")
ID_PATTERN = re.compile(r"^[POLW]\d+$", re.IGNORECASE)


def load_shifts(repo: Path | None) -> dict[str, list[str]]:
    if repo is None:
        return INDEX_HEADER_SHIFTS_FALLBACK
    scripts_dir = repo / "scripts"
    if not (scripts_dir / "_common.py").exists():
        return INDEX_HEADER_SHIFTS_FALLBACK
    sys.path.insert(0, str(scripts_dir))
    try:
        from _common import INDEX_HEADER_SHIFTS  # type: ignore
        return INDEX_HEADER_SHIFTS
    except Exception:
        return INDEX_HEADER_SHIFTS_FALLBACK


def s(value) -> str:
    """Zellwert als vergleichbarer String; NaN/None werden zu ''."""
    if value is None or (isinstance(value, float) and value != value):
        return ""
    text = str(value).strip()
    if text.lower() in ("nan", "nat"):
        return ""
    # Excel-Datetime-Artefakt abstreifen (00:00:00), wie die Pipeline es tut.
    if text.endswith(" 00:00:00"):
        text = text[: -len(" 00:00:00")]
    return text


def canonical_columns(index_name: str, raw_cols: list, shifts: dict) -> tuple[list, str]:
    """Bildet die Rohspalten auf den Kanon ab, so wie load_index() es tut.

    Rueckgabe: (kanonische Spaltenliste, Diagnosetext).
    """
    expected = shifts.get(index_name)
    if not expected:
        return list(raw_cols), "kein Header-Shift-Kanon fuer dieses Blatt"
    col0 = str(raw_cols[0]).strip().lower() if raw_cols else ""
    if col0 == "m3gim_id":
        new_cols = list(expected[: len(raw_cols)])
        if len(raw_cols) > len(expected):
            new_cols += list(raw_cols[len(expected):])
        leaked = [f"Pos {i} = {raw_cols[i]!r}" for i in range(1, min(len(raw_cols), len(expected)))
                  if str(raw_cols[i]).strip().lower() not in
                  (expected[i], f"unnamed: {i}") and not str(raw_cols[i]).startswith("Unnamed")]
        note = ("Zweig (a)/(b): Kopfzeile vorhanden, Spalten werden positionell "
                "umbenannt" + (f"; geleakte Kopfwerte: {', '.join(leaked)}" if leaked else ""))
        return new_cols, note
    if len(raw_cols) == len(expected):
        first_val = str(raw_cols[1]) if len(raw_cols) > 1 else ""
        if first_val and first_val not in ["name", "titel", "ort", "m3gim_id"]:
            note = ("Legacy-Zweig greift: Zeile 0 wird als verschobene Datenzeile "
                    "zurueckgeschoben")
            return list(expected[: len(raw_cols)]), note
        note = (f"KEIN Zweig greift: Pos 0 = {raw_cols[0]!r} ist nicht 'm3gim_id', "
                f"Pos 1 = {first_val!r} steht auf der Ausnahmeliste. Spalten bleiben roh, "
                "kanonische Spalten fehlen damit im DataFrame.")
        return list(raw_cols), note
    note = (f"KEIN Zweig greift: Pos 0 = {raw_cols[0]!r} ist nicht 'm3gim_id' und die "
            f"Spaltenzahl {len(raw_cols)} weicht vom Kanon {len(expected)} ab.")
    return list(raw_cols), note


def detect_folio_col(df: pd.DataFrame) -> str | None:
    """Folio-Spalten-Erkennung wie in transform.py (heuristisch + Regex-Probe)."""
    for col in df.columns:
        if not isinstance(col, str):
            continue
        low = col.lower()
        if low in FOLIO_COL_NAMES or "unnamed" in low:
            sample = df[col].dropna().astype(str).head(5)
            if any(re.match(r"^\d+_\d+$", v.strip()) or v.strip().startswith("fol.")
                   for v in sample):
                return col
    return None


def load_workbook_sheets(path: Path) -> dict[str, pd.DataFrame]:
    if not path.exists():
        return {}
    return pd.read_excel(path, sheet_name=None)


def normalize_objekte_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out.columns = [c.lower().strip() if isinstance(c, str) else c for c in out.columns]
    return out


def objekte_key(row: pd.Series, folio_col) -> str:
    sig = s(row.get("archivsignatur"))
    folio = s(row.get(folio_col)) if folio_col else ""
    return f"{sig} {folio}".strip()


def index_key(row: pd.Series, cols: list) -> str:
    """Schluessel eines Indexeintrags.

    Der Name ist der Schluessel, weil die Pipeline ihre Lookups ueber den
    Namen baut (build_index_lookup) und die m3gim_id im Export nicht stabil
    gefuehrt ist. Nur wenn kein Name dasteht, tritt die ID an ihre Stelle;
    Aenderungen der ID erscheinen dann als geaenderte Zelle.
    """
    ident = s(row.get("m3gim_id")) if "m3gim_id" in cols else ""
    name = s(row.get("name")) if "name" in cols else ""
    return name or (f"[ohne Name] {ident}" if ident else "")


def classify_date(value: str) -> str:
    if not value:
        return "(leer)"
    v = value.strip()
    for q in ("circa:", "vor:", "nach:"):
        if v.lower().startswith(q):
            return f"Qualifier {q}"
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        return "YYYY-MM-DD"
    if re.fullmatch(r"\d{4}-\d{2}", v):
        return "YYYY-MM"
    if re.fullmatch(r"\d{4}", v):
        return "YYYY"
    if re.fullmatch(r"\d{4}(-\d{2}){0,2}/\d{4}(-\d{2}){0,2}", v):
        return "Zeitspanne mit /"
    if re.fullmatch(r"\d{4}\.0", v):
        return "Jahr als Float"
    return "sonstiges Freitext/malformt"


def build_rows(df: pd.DataFrame, keyfunc) -> dict[str, list[tuple[int, pd.Series]]]:
    rows: dict[str, list[tuple[int, pd.Series]]] = defaultdict(list)
    for idx, row in df.iterrows():
        key = keyfunc(row)
        if not key:
            continue
        rows[key].append((int(idx) + 2, row))  # XLSX-Zeile inkl. Kopfzeile
    return rows


def value_counts(df: pd.DataFrame, col) -> Counter:
    if col not in df.columns:
        return Counter()
    return Counter(s(v) for v in df[col])


def fill_rate(df: pd.DataFrame, col) -> tuple[int, int]:
    if col not in df.columns:
        return (0, len(df))
    filled = sum(1 for v in df[col] if s(v))
    return (filled, len(df))


def counter_table(old: Counter, new: Counter, label: str) -> list[str]:
    keys = sorted(set(old) | set(new), key=lambda k: (-max(old.get(k, 0), new.get(k, 0)), k))
    lines = [f"| {label} | alt | neu | Delta |", "|---|---:|---:|---:|"]
    for k in keys:
        a, b = old.get(k, 0), new.get(k, 0)
        mark = "" if a == b else " **"
        lines.append(f"| `{k or '(leer)'}` | {a} | {b} | {b - a:+d}{mark} |")
    return lines


def diff_sheet(name: str, sheet: str, df_old: pd.DataFrame | None,
               df_new: pd.DataFrame | None, shifts: dict, out: list[str],
               max_rows: int = 400) -> None:
    out.append(f"### {name} / Blatt `{sheet}`")
    out.append("")
    if df_old is None:
        out.append("Blatt nur im NEUEN Export vorhanden.")
        out.append("")
    if df_new is None:
        out.append("Blatt nur im ALTEN Export vorhanden.")
        out.append("")
        return

    is_objekte = "Objekte" in name
    index_name = name.replace("M3GIM-", "").lower()

    raw_old = list(df_old.columns) if df_old is not None else []
    raw_new = list(df_new.columns)

    out.append(f"Rohkopfzeile alt: `{raw_old}`")
    out.append("")
    out.append(f"Rohkopfzeile neu: `{raw_new}`")
    out.append("")

    if is_objekte:
        o = normalize_objekte_columns(df_old) if df_old is not None else None
        n = normalize_objekte_columns(df_new)
        folio_old = detect_folio_col(o) if o is not None else None
        folio_new = detect_folio_col(n)
        out.append(f"Folio-Spalte erkannt alt `{folio_old}`, neu `{folio_new}`.")
        nontext_old = [c for c in raw_old if not isinstance(c, str)]
        nontext_new = [c for c in raw_new if not isinstance(c, str)]
        out.append(f"Nicht-textuelle Spaltenkoepfe alt {nontext_old}, neu {nontext_new}.")
        out.append("")
        cols_old = list(o.columns) if o is not None else []
        cols_new = list(n.columns)
        keyfunc_old = (lambda r: objekte_key(r, folio_old))
        keyfunc_new = (lambda r: objekte_key(r, folio_new))
    else:
        cols_old, note_old = canonical_columns(index_name, raw_old, shifts) if raw_old else ([], "")
        cols_new, note_new = canonical_columns(index_name, raw_new, shifts)
        o = df_old.copy() if df_old is not None else None
        if o is not None:
            o.columns = cols_old
        n = df_new.copy()
        n.columns = cols_new
        out.append(f"Header-Shift-Diagnose alt: {note_old}")
        out.append("")
        out.append(f"Header-Shift-Diagnose neu: {note_new}")
        out.append("")
        keyfunc_old = (lambda r: index_key(r, cols_old))
        keyfunc_new = (lambda r: index_key(r, cols_new))

    out.append(f"Kanonische Spalten alt: `{cols_old}`")
    out.append("")
    out.append(f"Kanonische Spalten neu: `{cols_new}`")
    out.append("")
    added_cols = [c for c in cols_new if c not in cols_old]
    dropped_cols = [c for c in cols_old if c not in cols_new]
    renamed = [(a, b) for a, b in zip(cols_old, cols_new) if a != b]
    out.append(f"Neue Spalten: {added_cols or 'keine'}. Entfallene Spalten: "
               f"{dropped_cols or 'keine'}. Positionelle Umbenennungen: "
               f"{renamed or 'keine'}.")
    out.append("")
    out.append(f"Zeilen alt {len(o) if o is not None else 0}, neu {len(n)}, "
               f"Delta {len(n) - (len(o) if o is not None else 0):+d}.")
    out.append("")

    rows_old = build_rows(o, keyfunc_old) if o is not None else {}
    rows_new = build_rows(n, keyfunc_new)

    dup_old = {k: [r[0] for r in v] for k, v in rows_old.items() if len(v) > 1}
    dup_new = {k: [r[0] for r in v] for k, v in rows_new.items() if len(v) > 1}
    out.append(f"Doppelte Schluessel alt: {dup_old or 'keine'}")
    out.append("")
    out.append(f"Doppelte Schluessel neu: {dup_new or 'keine'}")
    out.append("")
    if dup_old or dup_new:
        out.append("Der Zellvergleich nutzt je Schluessel die erste Zeile der Gruppe; bei "
                   "Dubletten ist er deshalb nur ein Anhaltspunkt.")
        out.append("")

    added = sorted(set(rows_new) - set(rows_old))
    removed = sorted(set(rows_old) - set(rows_new))
    out.append(f"Neue Zeilen: {len(added)}. Entfallene Zeilen: {len(removed)}.")
    out.append("")
    if added:
        out.append("<details><summary>Neue Schluessel</summary>")
        out.append("")
        for k in added[:max_rows]:
            xlsx_row = rows_new[k][0][0]
            out.append(f"- Zeile {xlsx_row}: `{k}`")
        if len(added) > max_rows:
            out.append(f"- … {len(added) - max_rows} weitere")
        out.append("")
        out.append("</details>")
        out.append("")
    if removed:
        out.append("**Entfallene Schluessel**")
        out.append("")
        for k in removed[:max_rows]:
            xlsx_row = rows_old[k][0][0]
            out.append(f"- alt Zeile {xlsx_row}: `{k}`")
        if len(removed) > max_rows:
            out.append(f"- … {len(removed) - max_rows} weitere")
        out.append("")

    shared_cols = [c for c in cols_new if c in cols_old]
    changes: list[str] = []
    changed_keys = 0
    per_col = Counter()
    for key in sorted(set(rows_old) & set(rows_new)):
        ro = rows_old[key][0][1]
        rn = rows_new[key][0][1]
        diffs = []
        for c in shared_cols:
            a, b = s(ro.get(c)), s(rn.get(c))
            if a != b:
                diffs.append((c, a, b))
                per_col[c] += 1
        if diffs:
            changed_keys += 1
            if len(changes) < max_rows:
                for c, a, b in diffs:
                    changes.append(f"- `{key}` (neu Zeile {rows_new[key][0][0]}), Spalte "
                                   f"`{c}`: `{a or '(leer)'}` -> `{b or '(leer)'}`")
    out.append(f"Zeilen mit geaenderten Zellen: {changed_keys} von "
               f"{len(set(rows_old) & set(rows_new))} gemeinsamen Schluesseln.")
    out.append("")
    if per_col:
        out.append("| Spalte | geaenderte Zellen |")
        out.append("|---|---:|")
        for c, cnt in per_col.most_common():
            out.append(f"| `{c}` | {cnt} |")
        out.append("")
    if changes:
        out.append("<details><summary>Geaenderte Zellen</summary>")
        out.append("")
        out.extend(changes)
        if changed_keys > max_rows:
            out.append(f"- … Ausgabe bei {max_rows} Eintraegen abgeschnitten")
        out.append("")
        out.append("</details>")
        out.append("")

    # Verteilungen der kontrollierten Spalten
    out.append("**Wertverteilungen**")
    out.append("")
    if is_objekte:
        for col in ("bearbeitungsstand", "dokumenttyp", "sprache", "datierungsevidenz"):
            co = value_counts(o, col) if o is not None else Counter()
            cn = value_counts(n, col)
            if not co and not cn:
                continue
            out.append(f"*{col}*")
            out.append("")
            out.extend(counter_table(co, cn, col))
            out.append("")
        # Datierungsformate
        co = Counter(classify_date(s(v)) for v in o["entstehungsdatum"]) if (
            o is not None and "entstehungsdatum" in o.columns) else Counter()
        cn = Counter(classify_date(s(v)) for v in n["entstehungsdatum"]) if (
            "entstehungsdatum" in n.columns) else Counter()
        out.append("*entstehungsdatum, Formatklassen*")
        out.append("")
        out.extend(counter_table(co, cn, "Format"))
        out.append("")
    else:
        out.append("| Spalte | gefuellt alt | gefuellt neu |")
        out.append("|---|---:|---:|")
        for c in sorted(set(cols_old) | set(cols_new), key=str):
            fo = fill_rate(o, c) if o is not None else (0, 0)
            fn = fill_rate(n, c)
            out.append(f"| `{c}` | {fo[0]}/{fo[1]} | {fn[0]}/{fn[1]} |")
        out.append("")
        for c in cols_new:
            if isinstance(c, str) and c.lower() in ("kategorie", "typ", "art", "rolle_stimme"):
                out.append(f"*{c}*")
                out.append("")
                out.extend(counter_table(value_counts(o, c) if o is not None else Counter(),
                                         value_counts(n, c), c))
                out.append("")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("old_dir", type=Path)
    ap.add_argument("new_dir", type=Path)
    ap.add_argument("-o", "--out", type=Path,
                    default=Path(__file__).resolve().parent.parent / "reports" / "diff-sources.md")
    ap.add_argument("--repo", type=Path,
                    default=Path(r"C:\Users\Chrisi\Documents\GitHub\DHCraft\m3gim"),
                    help="Repo-Wurzel fuer den Import von INDEX_HEADER_SHIFTS")
    args = ap.parse_args()

    shifts = load_shifts(args.repo)

    out: list[str] = []
    out.append("# Quell-Diff der M3GIM-Arbeitsmappen")
    out.append("")
    out.append(f"Alt: `{args.old_dir}`")
    out.append("")
    out.append(f"Neu: `{args.new_dir}`")
    out.append("")
    out.append("Die Verknuepfungstabelle bleibt ausgespart.")
    out.append("")

    for wb in WORKBOOKS:
        po, pn = args.old_dir / f"{wb}.xlsx", args.new_dir / f"{wb}.xlsx"
        so, sn = load_workbook_sheets(po), load_workbook_sheets(pn)
        out.append(f"## {wb}")
        out.append("")
        out.append(f"Blaetter alt: {list(so)}; neu: {list(sn)}.")
        out.append("")
        if list(so) != list(sn):
            out.append("Blattnamen weichen ab; die Blaetter werden positionell gepaart.")
            out.append("")
        pairs = []
        keys_o, keys_n = list(so), list(sn)
        for i, kn in enumerate(keys_n):
            ko = kn if kn in so else (keys_o[i] if i < len(keys_o) else None)
            pairs.append((ko, kn))
        for ko, kn in pairs:
            diff_sheet(wb, kn, so.get(ko) if ko else None, sn[kn], shifts, out)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("\n".join(out), encoding="utf-8")
    print(f"Bericht geschrieben: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
