"""Baut die mehrblättrige Verknüpfungs-Arbeitsmappe aus den Box-CSV-Exporten.

Die Google-Tabelle „M3GIM-Verknüpfungen" hat ein Tab pro Box. Werden die Tabs
einzeln als CSV exportiert, fügt dieses Skript sie wieder zu der Arbeitsmappe
zusammen, die ``transform.py`` (``load_verknuepfungen``, E-95) erwartet: ein
Sheet je Box, Spalte 0 die Archivsignatur ohne echten Header, Folgespalten
Folio/datenpunkt_id/typ/name/rolle/anmerkung.

Aufruf:
    python scripts/assemble-verknuepfungen.py [QUELL-ORDNER]

QUELL-ORDNER defaultet auf den Downloads-Ablageordner. Ausgabe überschreibt
``data/google-spreadsheet/M3GIM-Verknüpfungen.xlsx`` (git-versioniert, der
Vorstand bleibt über die Historie erhalten).
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
    """Leitet den Sheet-Namen aus dem Dateinamen ab.

    "M3GIM-Verknüpfungen - Box 5.csv" -> "Box 5". Excel-Sheetnamen sind auf
    31 Zeichen und ein Zeichen-Subset begrenzt; verbotene Zeichen werden ersetzt.
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
            # Zellen verbatim als Text lesen, damit Folio-Werte ("2_24"),
            # datenpunkt_id ("9") und Signaturen ("NIM_11") nicht numerisch
            # verfälscht werden; leere Zellen bleiben leer (-> NaN beim
            # Reload, worauf der ffill der Signatur im Loader baut).
            df = pd.read_csv(fn, dtype=str, keep_default_na=False,
                             encoding="utf-8-sig")
            name = sheet_name(fn)
            n = name
            i = 2
            while n in used:  # Sheetnamen müssen eindeutig sein
                n = f"{name[:28]}_{i}"
                i += 1
            used.add(n)
            df.to_excel(writer, sheet_name=n, index=False)
            print(f"  {os.path.basename(fn):45s} -> Sheet {n!r}: "
                  f"{len(df)} Zeilen, {len(df.columns)} Spalten")

    print(f"\nGeschrieben: {OUT_PATH}")


if __name__ == "__main__":
    main()
