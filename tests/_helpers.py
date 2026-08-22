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
    for prop in ("m3gim-ontology:hasAssociatedAgent", "rico:hasOrHadLocation", "rico:hasOrHadSubject"):
        for ent in ensure_list(record.get(prop)):
            if isinstance(ent, dict):
                yield ent


def relation_parties(rel):
    """Die beteiligten Seiten einer AgRelOn-Relation, unabhaengig von der Form.

    Ein gerichteter n-aerer Begriff traegt agrelon:hasSubject und
    agrelon:hasObject, ein symmetrischer wie HasCorrespondent traegt beide
    Seiten als agrelon:hasSubjectObject (E-149). Wer nur die eine Form liest,
    haelt die Relationen der anderen fuer leer.
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
    """Die Seiten einer Relation ohne die Nachlassbildnerin."""
    return [p for p in relation_parties(rel)
            if p.get("@id") != fonds_id and p.get("name") != fonds_name]

