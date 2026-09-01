"""Helper functions for tests. Importable from test modules."""


def ensure_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return v
    return [v]


def iter_strings(obj):
    """Yield all string values in a dict/list recursively."""
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for v in obj.values():
            yield from iter_strings(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from iter_strings(item)


def iter_entities_with_id(record):
    """Return all sub-entities from a record (Agents, Subjects, Locations)."""
    for prop in ("m3gim-ontology:hasAssociatedAgent", "rico:hasOrHadLocation", "rico:hasOrHadSubject"):
        for ent in ensure_list(record.get(prop)):
            if isinstance(ent, dict):
                yield ent


def relation_parties(rel):
    """The parties of an AgRelOn relation, independent of its form.

    A directed n-ary term carries agrelon:hasSubject and agrelon:hasObject, a
    symmetric one such as HasCorrespondent carries both sides as
    agrelon:hasSubjectObject (E-149). Reading only one form leaves the
    relations of the other looking empty.
    """
    if not isinstance(rel, dict):
        return []
    both = ensure_list(rel.get("agrelon:hasSubjectObject"))
    if both:
        return [p for p in both if isinstance(p, dict)]
    out = []
    for key in ("agrelon:hasSubject", "agrelon:hasObject"):
        node = rel.get(key)
        if isinstance(node, dict):
            out.append(node)
    return out


def relation_counterparts(rel, fonds_id="wd:Q94208", fonds_name="Malaniuk, Ira"):
    """The parties of a relation excluding the fonds creator."""
    return [p for p in relation_parties(rel)
            if p.get("@id") != fonds_id and p.get("name") != fonds_name]

