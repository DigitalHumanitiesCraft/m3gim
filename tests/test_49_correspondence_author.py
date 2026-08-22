"""Die Absenderseite eines Briefes erreicht das Beziehungsnetz.

Der Bestand fuehrt die Absenderseite der Korrespondenz unter der Rolle
`verfasser`; der im Vokabular deklarierte Wert `absender` kommt in den Daten
nicht vor. Solange `verfasser` ohne AgRelOn-Zuordnung bleibt, zeigt die
Korrespondenz-Sektion nur den Adressaten, und der zweite Partner steht unter
einer Produktionsrolle.

Die Zuordnung gilt nur am Dokumenttyp Korrespondenz. An einer Rezension ist der
`verfasser` der Kritiker; eine pauschale Abbildung erzeugte dort eine
Korrespondenz, die es nie gab. Beide Richtungen sind hier festgehalten.

Lauf: pytest tests/test_49_correspondence_author.py
"""

CORRESPONDENCE = "m3gim-vocab:correspondence"
AUTHOR = "m3gim-vocab:author"
# Nachlassbildnerin: als Verfasserin ihres eigenen Briefes waere sie Subjekt und
# Objekt zugleich, deshalb erzeugt die Pipeline dort keine Relation.
FONDS_IDS = {"wd:Q94208"}
FONDS_NAMES = {"Malaniuk, Ira"}


def _as_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def _dft(record):
    v = record.get("rico:hasDocumentaryFormType")
    return v.get("@id") if isinstance(v, dict) else v


def _role_id(agent):
    r = agent.get("role")
    return r.get("@id") if isinstance(r, dict) else r


def _authors(record):
    for a in _as_list(record.get("m3gim-ontology:hasAssociatedAgent")):
        if isinstance(a, dict) and _role_id(a) == AUTHOR:
            yield a


def _is_fonds(agent):
    return agent.get("@id") in FONDS_IDS or agent.get("name") in FONDS_NAMES


def _correspondent_names(record):
    out = set()
    for rel in _as_list(record.get("m3gim-ontology:hasAgentRelation")):
        if not isinstance(rel, dict):
            continue
        if rel.get("@type") != "agrelon:HasCorrespondent":
            continue
        obj = rel.get("agrelon:hasObject") or {}
        if isinstance(obj, dict) and obj.get("name"):
            out.add(obj["name"])
    return out


def test_author_of_a_letter_becomes_a_correspondent(records):
    """Ein fremder Verfasser auf einem Brief steht als Korrespondenzpartner."""
    expected = []
    missing = []
    for rec in records:
        if _dft(rec) != CORRESPONDENCE:
            continue
        partners = _correspondent_names(rec)
        for a in _authors(rec):
            if _is_fonds(a):
                continue
            expected.append((rec.get("rico:identifier"), a.get("name")))
            if a.get("name") not in partners:
                missing.append((rec.get("rico:identifier"), a.get("name")))
    assert expected, (
        "Kein fremder Verfasser auf einem Korrespondenzstueck im Datenstand — "
        "der Test verliert seinen Gegenstand und ist zu pruefen."
    )
    assert not missing, (
        f"{len(missing)} von {len(expected)} Absenderseiten erreichen das "
        f"Beziehungsnetz nicht: {missing[:6]}"
    )


def test_author_outside_correspondence_stays_out(records):
    """Ein Verfasser an Rezension oder Presse wird nicht zum Korrespondenten."""
    wrong = []
    for rec in records:
        if _dft(rec) == CORRESPONDENCE:
            continue
        partners = _correspondent_names(rec)
        for a in _authors(rec):
            if a.get("name") in partners:
                wrong.append((rec.get("rico:identifier"), _dft(rec), a.get("name")))
    assert not wrong, (
        f"{len(wrong)} Verfasser ausserhalb der Korrespondenz sind als "
        f"Korrespondenzpartner gefuehrt: {wrong[:6]}"
    )
