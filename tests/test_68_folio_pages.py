"""Invariante: die Seiten eines Folios haengen an einem Datensatz des Folios.

Die Quelle erfasst die Seiten eines Blattes als eigene Objektzeilen mit dem
Folio ``13_1``, ``13_2`` und so fort. Ohne einen Datensatz des Folios stehen sie
im Bestand nebeneinander und verlieren den Zusammenhang der ganzen Unterlage.
Der Folio-Datensatz ist die Ebene, die RiC-O dafuer vorsieht; er traegt seine
Seiten ueber ``rico:hasOrHadPart``.

Spec: knowledge/data.md § Target model, decided and not built, vocab/m3gim.ttl.
"""

import re

from _helpers import ensure_list

DERIVED = "m3gim-ontology:derivedFolioRecord"

# Folio einer Seite: Blattnummer plus mindestens eine Seitenstufe.
PAGE_FOLIO = re.compile(r"^\d+(?:_\d+)+$")


def _folio(identifier: str) -> str | None:
    parts = str(identifier or "").split(" ", 1)
    return parts[1] if len(parts) == 2 else None


def _page_records(records):
    result = []
    for r in records:
        folio = _folio(r.get("rico:identifier"))
        if folio and PAGE_FOLIO.match(folio):
            result.append(r)
    return result


def _parent_identifier(identifier: str) -> str:
    signatur, folio = identifier.split(" ", 1)
    return f"{signatur} {folio.rsplit('_', 1)[0]}"


def _parts_index(records):
    """{Kind-@id: [Eltern-@id]} ueber alle Records."""
    index = {}
    for r in records:
        for part in ensure_list(r.get("rico:hasOrHadPart")):
            if isinstance(part, dict) and part.get("@id"):
                index.setdefault(part["@id"], []).append(r["@id"])
    return index


def test_every_page_record_has_exactly_one_folio_parent(records):
    pages = _page_records(records)
    # Mindestvorkommen aus dem Datenstand: 381 Seitendatensaetze in 21 Folios.
    assert len(pages) >= 370, (
        f"Nur {len(pages)} Seitendatensaetze gefunden, der Test liefe leer"
    )

    by_id = {r["@id"]: r for r in records}
    parents = _parts_index(records)
    offenders = []
    for page in pages:
        found = parents.get(page["@id"], [])
        if len(found) != 1:
            offenders.append((page["rico:identifier"], f"{len(found)} Eltern"))
            continue
        parent = by_id.get(found[0])
        expected = _parent_identifier(page["rico:identifier"])
        if not parent or parent.get("rico:identifier") != expected:
            offenders.append((
                page["rico:identifier"],
                f"Elter {parent.get('rico:identifier') if parent else found[0]} "
                f"statt {expected}",
            ))
    assert not offenders, (
        f"{len(offenders)} von {len(pages)} Seitendatensaetzen ohne genau einen "
        f"Folio-Datensatz: {offenders[:5]}"
    )


def test_folio_parents_carry_their_pages_in_page_order(records):
    pages = _page_records(records)
    by_ident = {r.get("rico:identifier"): r for r in records}
    parent_idents = {_parent_identifier(p["rico:identifier"]) for p in pages}
    # Mindestvorkommen aus dem Datenstand: 21 Folios mit Seiten.
    assert len(parent_idents) >= 20, (
        f"Nur {len(parent_idents)} Folio-Datensaetze mit Seiten"
    )

    offenders = []
    for ident in sorted(parent_idents):
        parent = by_ident.get(ident)
        if parent is None:
            offenders.append((ident, "kein Datensatz"))
            continue
        part_ids = [p["@id"] for p in ensure_list(parent.get("rico:hasOrHadPart"))
                    if isinstance(p, dict)]
        by_id = {r["@id"]: r for r in records}
        numbers = []
        for pid in part_ids:
            child = by_id.get(pid)
            folio = _folio(child.get("rico:identifier")) if child else None
            if folio:
                numbers.append(int(folio.rsplit("_", 1)[1]))
        if numbers != sorted(numbers):
            offenders.append((ident, f"Seitenfolge {numbers[:10]}"))
    assert not offenders, (
        f"Folio-Datensaetze mit ungeordneten Seiten: {offenders[:5]}"
    )


def test_derived_folio_records_are_marked_and_carry_no_own_cataloguing(records):
    """Ein Folio ohne eigene Objektzeile entsteht in der Pipeline.

    Er traegt das Merkmal, damit die Anwendung ihn nicht als erschlossene
    Unterlage zaehlt, und er traegt keinen Titel und kein Datum, weil die
    Quelle beides fuer das Folio nicht erfasst.
    """
    derived = [r for r in records if r.get(DERIVED) is True]
    # Mindestvorkommen aus dem Datenstand: 7 abgeleitete Folio-Datensaetze.
    assert len(derived) >= 5, (
        f"Nur {len(derived)} abgeleitete Folio-Datensaetze mit {DERIVED}"
    )
    offenders = [
        r.get("rico:identifier") for r in derived
        if r.get("rico:title") or r.get("rico:date")
        or not ensure_list(r.get("rico:hasOrHadPart"))
    ]
    assert not offenders, (
        f"Abgeleitete Folio-Datensaetze mit eigener Erschliessung oder ohne "
        f"Seiten: {offenders[:5]}"
    )
