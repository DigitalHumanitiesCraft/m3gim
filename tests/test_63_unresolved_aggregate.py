"""Invariante: das Merkmal der unaufgeloesten Sammeleinheit steht im Datensatz.

Ein Datensatz des Hauptbestands ohne Folio bezeichnet keine Einzelunterlage,
sondern eine Sammeleinheit, deren Folioerschliessung aussteht. Bis zum
2026-09-03 entschied das Frontend diese Frage ueber Zeichenmuster der Signatur
(`isStandaloneKonvolut`). Die Bestandsgruppe ist eine Aussage des Materials und
gehoert in den Datensatz, deshalb setzt die Pipeline
`m3gim-ontology:unresolvedAggregate`.

Spec: knowledge/data.md § Konvolut- und Objektlogik, vocab/m3gim.ttl.
"""

PROP = "m3gim-ontology:unresolvedAggregate"


def _top_level_records(records, konvolute):
    """Records ohne Folio, die kein Kind eines Konvoluts sind."""
    member_ids = set()
    for k in konvolute:
        parts = k.get("rico:hasOrHadPart") or []
        if isinstance(parts, dict):
            parts = [parts]
        for part in parts:
            member_ids.add(part.get("@id"))
    return [r for r in records if r.get("@id") not in member_ids]


def test_unresolved_aggregate_marks_hauptbestand_only(records, konvolute):
    top_level = _top_level_records(records, konvolute)
    assert len(top_level) > 10, "Zu wenige Top-Level-Records, Lauf pruefen"

    marked = [r for r in top_level if r.get(PROP) is True]
    assert len(marked) >= 5, (
        f"Kein oder zu wenig gesetztes {PROP} an Top-Level-Records "
        f"({len(marked)} von {len(top_level)})"
    )

    # Plakate und Tontraeger sind Einzelstuecke, nie Sammeleinheit.
    einzelstuecke = [
        r.get("rico:identifier") for r in marked
        if "/PL_" in (r.get("rico:identifier") or "")
        or "_TT_" in (r.get("rico:identifier") or "")
    ]
    assert not einzelstuecke, (
        f"Plakate/Tontraeger als Sammeleinheit markiert: {einzelstuecke[:10]}"
    )

    # Jeder uebrige Top-Level-Record des Hauptbestands traegt das Merkmal.
    fehlend = [
        r.get("rico:identifier") for r in top_level
        if r.get(PROP) is not True
        and "/PL_" not in (r.get("rico:identifier") or "")
        and "_TT_" not in (r.get("rico:identifier") or "")
    ]
    assert not fehlend, (
        f"Hauptbestands-Records ohne {PROP}: {fehlend[:10]}"
    )


def test_unresolved_aggregate_never_on_folio_records(records, konvolute):
    """Ein Objekt innerhalb eines Konvoluts ist Einzelunterlage, nie Sammeleinheit."""
    top_ids = {r.get("@id") for r in _top_level_records(records, konvolute)}
    offenders = [
        r.get("rico:identifier") for r in records
        if r.get("@id") not in top_ids and r.get(PROP) is not None
    ]
    assert not offenders, (
        f"{PROP} an Folio-Records gesetzt: {offenders[:10]}"
    )
