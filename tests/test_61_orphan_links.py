"""Datenspiegel: Quellzeilen, die den Datensatz nicht erreichen.

Jede Verknuepfungszeile adressiert ueber (archivsignatur + " " + folio)
ein Objekt. Trifft sie keines, faellt ihr Inhalt still aus dem Datensatz —
so gingen die Tagesbesetzungen der Bayreuther Programmhefte verloren, weil
die Objekttabelle deren Folios nicht fuehrt.

Die Gegenseite steht im zweiten Test: eine Objektzeile ohne Signatur kann
kein Objekt-Identifier bilden und wird von der Pipeline verworfen, obwohl
sie Inhalt traegt.

Der dritte Test nimmt die Blickrichtung des Frontends: seit E-165 ist die
Verknuepfung die Dokumentbasis, ein Objekt ohne jede Verknuepfung erscheint
in keiner Ansicht. Ein als abgeschlossen oder begonnen gefuehrtes Objekt
ohne Verknuepfung faellt damit aus der Anwendung heraus, obwohl sein
Bearbeitungsstand das Gegenteil behauptet.

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


@pytest.mark.data_quality
def test_every_objektzeile_carries_a_signature(xlsx_objekte):
    """Objektzeilen mit Inhalt, aber ohne archivsignatur.

    Der Objekt-Identifier ist signatur + " " + folio. Fehlt die Signatur,
    verwirft `build_konvolut_hierarchy` die Zeile, und alle Verknuepfungen,
    die ihr Folio adressieren, werden zu Waisen. Bekannter Fall Zeile 725,
    Folio 11_62 des Konvoluts UAKUG/NIM_137 mit 114 Verknuepfungszeilen.
    """
    df = xlsx_objekte
    folio_col = next(
        (c for c in df.columns
         if isinstance(c, str) and c.strip().lower() in ("folio nr", "folio")),
        None,
    )
    assert folio_col is not None, "Folio-Spalte nicht gefunden"
    assert len(df) > 500, "Objekttabelle unplausibel klein, Lauf pruefen"

    offenders = []
    for idx, row in df.iterrows():
        if _norm(row.get("archivsignatur")):
            continue
        content = {
            str(col): _norm(value)
            for col, value in row.items()
            if not str(col).startswith("_") and _norm(value)
        }
        content.pop("archivsignatur", None)
        if content:
            offenders.append((idx + 2, content))

    if offenders:
        lines = ["Objektzeilen ohne archivsignatur (Zeile: getragener Inhalt):"]
        for line_no, content in offenders:
            felder = ", ".join(f"{k}={v}" for k, v in sorted(content.items()))
            lines.append(f"  Zeile {line_no}  ->  {felder}")
        lines.append(
            "Fix: Signatur nachtragen oder die Zeile entfernen, siehe "
            "data/reports/source-errors-handover-*.md"
        )
        pytest.fail("\n".join(lines))


# Spiegel von countLinks (docs/js/utils/format.js): die fuenf Eigenschaften,
# deren Vorkommen ein Objekt als verknuepft gelten laesst.
LINK_PROPS = (
    "m3gim-ontology:hasAssociatedAgent",
    "rico:hasOrHadLocation",
    "rico:hasOrHadSubject",
    "m3gim-ontology:hasAnnotation",
    "m3gim-ontology:hasPerformance",
)

WORKED_ON = {"abgeschlossen", "begonnen"}


def _link_count(node: dict) -> int:
    total = 0
    for prop in LINK_PROPS:
        value = node.get(prop)
        if value is None:
            continue
        total += len(value) if isinstance(value, list) else 1
    return total


@pytest.mark.data_quality
def test_worked_on_records_carry_a_verknuepfung(graph):
    """Objekte mit Bearbeitungsstand abgeschlossen oder begonnen, aber ohne
    jede Verknuepfung.

    Sie liegen ausserhalb der Dokumentbasis (E-165) und sind deshalb in
    keiner Ansicht zu sehen, waehrend die Erfassung sie als bearbeitet
    fuehrt. Entweder fehlen die Verknuepfungen oder der Bearbeitungsstand
    ist zu korrigieren.
    """
    offenders = []
    for node in graph:
        if not isinstance(node, dict) or node.get("@type") != "rico:Record":
            continue
        if str(node.get("@id", "")).endswith("_Folio"):
            continue
        if node.get("m3gim-ontology:processingStatus") not in WORKED_ON:
            continue
        if _link_count(node) > 0:
            continue
        offenders.append(
            f"{node.get('rico:identifier') or node.get('@id')} "
            f"({node['m3gim-ontology:processingStatus']})"
        )

    if offenders:
        lines = [
            "Objekte als bearbeitet gefuehrt, aber ohne jede Verknuepfung "
            f"({len(offenders)}); sie erscheinen in keiner Ansicht:"
        ]
        lines.extend(f"  {o}" for o in sorted(offenders))
        lines.append(
            "Fix: Verknuepfungen nachtragen oder den Bearbeitungsstand "
            "zurueckstellen."
        )
        pytest.fail("\n".join(lines))
