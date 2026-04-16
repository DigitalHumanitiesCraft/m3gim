"""Hilfsfunktionen fuer Tests. Importierbar aus Testmodulen."""


def ensure_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return v
    return [v]


def iter_strings(obj):
    """Rekursiv alle String-Werte in einem dict/list ausgeben."""
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for v in obj.values():
            yield from iter_strings(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from iter_strings(item)


def iter_entities_with_id(record):
    """Gibt alle Sub-Entities aus einem Record zurueck (Agents, Subjects, Locations)."""
    for prop in ("m3gim:hasAssociatedAgent", "rico:hasOrHadLocation", "rico:hasOrHadSubject"):
        for ent in ensure_list(record.get(prop)):
            if isinstance(ent, dict):
                yield ent
