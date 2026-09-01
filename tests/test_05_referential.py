"""Referential integrity within the JSON-LD graph."""

from collections import Counter


from _helpers import ensure_list


def test_fonds_exists_exactly_once(graph):
    fonds = [n for n in graph if isinstance(n.get("rico:hasRecordSetType"), dict)
             and n["rico:hasRecordSetType"].get("@id") == "ric-rst:Fonds"]
    assert len(fonds) == 1, f"Erwartet 1 Fonds, gefunden: {len(fonds)}"


def test_all_record_ids_unique(graph):
    ids = [n["@id"] for n in graph]
    counts = Counter(ids)
    dups = {k: v for k, v in counts.items() if v > 1}
    assert not dups, f"Doppelte @id: {dups}"


def test_fonds_parts_all_resolvable(fonds, graph):
    graph_ids = {n["@id"] for n in graph}
    parts = ensure_list(fonds.get("rico:hasOrHadPart"))
    missing = []
    for part in parts:
        if not isinstance(part, dict):
            continue
        pid = part.get("@id")
        if pid and pid not in graph_ids:
            missing.append(pid)
    assert not missing, f"Fonds-Parts ohne Ziel: {missing[:5]}"


def test_konvolut_children_exist(konvolute, records):
    record_ids = {r["@id"] for r in records}
    missing = []
    for k in konvolute:
        for part in ensure_list(k.get("rico:hasOrHadPart")):
            if isinstance(part, dict):
                pid = part.get("@id")
                if pid and pid not in record_ids:
                    missing.append((k["@id"], pid))
    assert not missing, f"Konvolut-Kinder ohne Record: {missing[:5]}"


def test_no_orphan_records(records, konvolute, fonds):
    """Every record is referenced either directly in the Fonds or in a Konvolut."""
    referenced = set()
    for part in ensure_list(fonds.get("rico:hasOrHadPart")):
        if isinstance(part, dict):
            referenced.add(part.get("@id"))
    for k in konvolute:
        for part in ensure_list(k.get("rico:hasOrHadPart")):
            if isinstance(part, dict):
                referenced.add(part.get("@id"))

    orphans = [r["@id"] for r in records if r["@id"] not in referenced]
    assert not orphans, f"Waisen-Records: {orphans[:5]}"


def test_folio_records_have_konvolut_parent(records, konvolute):
    """Every Folio record hangs on the Konvolut whose signature it carries.

    A Folio's object ID is `archivsignatur + " " + folio` (knowledge/data.md,
    Konvolut hierarchy). A record whose rico:identifier carries a Folio value
    must therefore hang as rico:hasOrHadPart on exactly the Konvolut that
    carries the bare signature. If the test breaks, a Folio hangs on the wrong
    Konvolut or none, and the holdings hierarchy in the frontend loses it.
    """
    konvolut_by_ident = {}
    for k in konvolute:
        ident = str(k.get("rico:identifier") or "").strip()
        if ident:
            konvolut_by_ident[ident] = k["@id"]

    parent_of = {}
    for k in konvolute:
        for part in ensure_list(k.get("rico:hasOrHadPart")):
            if isinstance(part, dict) and part.get("@id"):
                parent_of[part["@id"]] = k["@id"]

    folio_records = [
        r for r in records
        if " " in str(r.get("rico:identifier") or "").strip()
    ]
    # Minimum occurrence: the holdings are mostly catalogued per Folio. If the
    # share drops below half, the test no longer checks anything.
    assert len(folio_records) >= len(records) * 0.5, (
        f"Nur {len(folio_records)} von {len(records)} Records tragen eine "
        f"Folio-Signatur. Die Konvolut-Hierarchie ist eingebrochen, der "
        f"Test liefe leer."
    )

    offenders = []
    for r in folio_records:
        signatur = str(r["rico:identifier"]).split()[0]
        expected = konvolut_by_ident.get(signatur)
        if expected is None:
            offenders.append((r["@id"], f"kein Konvolut mit Signatur {signatur}"))
        elif parent_of.get(r["@id"]) != expected:
            offenders.append(
                (r["@id"], f"Parent {parent_of.get(r['@id'])} statt {expected}")
            )
    assert not offenders, (
        f"{len(offenders)} von {len(folio_records)} Folio-Records ohne "
        f"passenden Konvolut-Parent: {offenders[:5]}"
    )


def test_konvolute_have_children(konvolute):
    """No Konvolut is empty.

    Used to be the only effective assert in the body of
    test_folio_records_have_konvolut_parent and now carries its own name.
    """
    assert konvolute, "Keine Konvolute im Graph"
    empty = [k["@id"] for k in konvolute if not ensure_list(k.get("rico:hasOrHadPart"))]
    assert not empty, f"Konvolute ohne Kinder: {empty[:5]}"
