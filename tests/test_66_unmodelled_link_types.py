"""Report recorded link types without a dedicated processing handler.

E-301 preserves unsupported values as neutral source statements when their
target record resolves. A missing handler therefore indicates a cataloguing
question, not lost source content. The current dedicated neutral handlers also
cover ``dokument`` and ``aktivitaet``. This data-quality check keeps source
locations available for reviewing any additional types.
"""

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))


def _known_types() -> set:
    from transform import RELATION_HANDLERS  # noqa: WPS433

    return set(RELATION_HANDLERS)


def _raw(value) -> str:
    """Der erfasste Text, nur getrimmt, fuer die Befundzeile."""
    s = ("" if value is None else str(value)).strip()
    return "" if s.lower() == "nan" else s


def _norm(value) -> str:
    return _raw(value).lower()


@pytest.mark.data_quality
def test_every_recorded_link_type_has_a_model_mapping(xlsx_verknuepfungen):
    from transform import decompose_komposit_typ  # noqa: WPS433

    known = _known_types()
    assert "person" in known, "RELATION_HANDLERS unplausibel leer"

    findings: dict = {}
    for _, row in xlsx_verknuepfungen.iterrows():
        typ = _norm(row.get("typ"))
        if not typ:
            continue
        # Komposittypen werden vor dem Dispatch zerlegt; unbekannt ist nur,
        # was nach der Zerlegung keinen Handler trifft.
        parts = decompose_komposit_typ(typ) or []
        unknown = [p for p in parts if p not in known]
        if not unknown:
            continue
        sig = _raw(row.get("archivsignatur")) or "(ohne Signatur)"
        sheet = _raw(row.get("_xlsx_sheet"))
        line = _raw(row.get("_xlsx_row"))
        place = f"{sheet} Zeile {line}" if sheet and line else "(Fundstelle unbekannt)"
        name = _raw(row.get("name")) or "(ohne Name)"
        for part in unknown:
            findings.setdefault(part, []).append(f"{sig} | {place} | {name}")

    if not findings:
        return

    lines = ["Verknuepfungstypen ohne eigenen Handler in RELATION_HANDLERS. "
             "Bei aufloesbarem Zielobjekt bleiben ihre Werte als neutrale "
             "Quellaussagen erhalten:"]
    for typ, places in sorted(findings.items(), key=lambda x: -len(x[1])):
        lines.append(f"  Typ {typ!r}: {len(places)} Zeilen")
        for place in places:
            lines.append(f"    {place}")
    lines.append(
        "Den Typ anhand der Quelle pruefen. Eine fachliche Modellierung in "
        "data.md verankern und bei Bedarf Vokabular und Handler ergaenzen; "
        "eine Erfassungskorrektur benoetigt einen Quellenbeleg."
    )
    pytest.fail("\n".join(lines))
