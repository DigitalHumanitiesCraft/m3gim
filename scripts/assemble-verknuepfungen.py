"""Assembles the multi-sheet Verknüpfungen workbook from the per-Box CSV exports.

The Google sheet "M3GIM-Verknüpfungen" carries one tab per Box. When the tabs
are exported individually as CSV, this script reassembles them into the workbook
that ``transform.py`` (``load_verknuepfungen``, E-95) expects. One sheet per Box,
column 0 the Archivsignatur without a real header, following columns
folio/datenpunkt_id/typ/name/rolle/anmerkung.

Usage:
    python scripts/assemble-verknuepfungen.py [SOURCE-DIR]

SOURCE-DIR defaults to the Downloads staging folder. Output overwrites
``data/google-spreadsheet/M3GIM-Verknüpfungen.xlsx`` (git-tracked, so the
history is preserved).
"""
import glob
import os
import re
import sys
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SRC = Path(r"C:\Users\Chrisi\Downloads\m3gim")
OUT_PATH = BASE_DIR / "data" / "google-spreadsheet" / "M3GIM-Verknüpfungen.xlsx"


def sheet_name(filename: str) -> str:
    """Derives the sheet name from the filename.

    "M3GIM-Verknüpfungen - Box 5.csv" -> "Box 5". Excel sheet names are capped at
    31 characters and a restricted character subset, so forbidden characters are
    replaced.
    """
    base = os.path.splitext(os.path.basename(filename))[0]
    label = base.split(" - ")[-1].strip() or base.strip()
    label = re.sub(r"[:\\/?*\[\]]", "_", label)
    return label[:31]


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    files = sorted(glob.glob(str(src / "*.csv")))
    if not files:
        sys.exit(f"Keine CSV in {src}")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(OUT_PATH, engine="openpyxl") as writer:
        used: set[str] = set()
        for fn in files:
            # Read cells verbatim as text so folio values ("2_24"),
            # datenpunkt_id ("9") and signatures ("NIM_11") are not coerced
            # numerically. Empty cells stay empty (NaN on reload), which the
            # loader's ffill of the Signatur relies on.
            df = pd.read_csv(fn, dtype=str, keep_default_na=False,
                             encoding="utf-8-sig")
            name = sheet_name(fn)
            n = name
            i = 2
            while n in used:  # sheet names must be unique
                n = f"{name[:28]}_{i}"
                i += 1
            used.add(n)
            df.to_excel(writer, sheet_name=n, index=False)
            print(f"  {os.path.basename(fn):45s} -> Sheet {n!r}: "
                  f"{len(df)} Zeilen, {len(df.columns)} Spalten")

    print(f"\nGeschrieben: {OUT_PATH}")


if __name__ == "__main__":
    main()
