"""Datenspiegel: verwaiste Verknuepfungszeilen.

Jede Verknuepfungszeile adressiert ueber (archivsignatur + " " + folio)
ein Objekt. Trifft sie keines, faellt ihr Inhalt still aus dem Datensatz —
so gingen die Tagesbesetzungen der Bayreuther Programmhefte verloren, weil
die Objekttabelle deren Folios nicht fuehrt.

Dieser Test ist absichtlich ROT, solange die Quelle Waisen traegt
(Marker data_quality, siehe pytest.ini). Seine Fehlermeldung ist die
Waisenliste, gruppiert nach Signatur, direkt als Arbeitsauftrag ans
Erschliessungsteam lesbar. Er traegt keine hartkodierten Erwartungen und
wird mit einer vollstaendigen Objekttabelle von selbst gruen.
"""

import re

import pytest


def _norm(value) -> str:
    if value is None:
        return ""
    s = str(value).strip()
    return "" if s.lower() in ("", "nan", "none") else s


def _objekt_id(sig: str, folio: str) -> str:
    # Spiegel der Pipeline-Regel (transform.py): signatur + " " + folio,
    # Literal "Folio" ist kein Folio.
    if folio and folio.lower() != "folio":
        return f"{sig} {folio}"
    return sig


@pytest.mark.data_quality
def test_every_verknuepfung_hits_a_record(xlsx_verknuepfungen, graph):
    df = xlsx_verknuepfungen

    sig_col = next(
        (c for c in df.columns
         if isinstance(c, str) and c.strip().lower() in ("", "archivsignatur")),
        df.columns[0],
    )
    folio_col = next(
        (c for c in df.columns
         if isinstance(c, str) and "folio" in c.lower()),
        None,
    )
    assert folio_col is not None, "Folio-Spalte nicht gefunden"

    known = {
        n.get("rico:identifier")
        for n in graph
        if isinstance(n, dict) and n.get("rico:identifier")
    }
    assert len(known) > 500, "Datensatz unplausibel klein, Lauf pruefen"

    orphans: dict[str, dict[str, int]] = {}
    sig = None
    checked = 0
    for _, row in df.iterrows():
        sig_val = _norm(row.get(sig_col))
        if sig_val:
            sig = sig_val
        if not sig or not sig.startswith("UAKUG"):
            continue
        if not (_norm(row.get("typ")) or _norm(row.get("name"))):
            continue
        checked += 1
        folio = _norm(row.get(folio_col))
        objekt_id = _objekt_id(sig, folio)
        if objekt_id in known:
            continue
        # Spiegel der deterministischen Folio-Join-Reparatur der Pipeline:
        # eine Bindestrichform gilt als getroffen, wenn ihre Unterstrichform
        # ein Objekt trifft.
        if "-" in objekt_id and objekt_id.replace("-", "_") in known:
            continue
        orphans.setdefault(sig, {})
        orphans[sig][folio or "(ohne Folio)"] = (
            orphans[sig].get(folio or "(ohne Folio)", 0) + 1
        )

    assert checked > 1000, "Verknuepfungstabelle unplausibel klein"

    if orphans:
        lines = ["Verknuepfungszeilen ohne Objekt (Signatur / Folio: Zeilen):"]
        for s in sorted(orphans):
            total = sum(orphans[s].values())
            folien = ", ".join(
                f"{f}: {n}" for f, n in sorted(orphans[s].items())
            )
            lines.append(f"  {s}  ({total} Zeilen)  ->  {folien}")
        lines.append(
            "Fix: fehlende Objektzeilen anlegen oder Signatur/Folio "
            "korrigieren, siehe data/reports/source-errors-handover-*.md"
        )
        pytest.fail("\n".join(lines))
