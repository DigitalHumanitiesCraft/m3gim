"""Die Rollenstellen einer AgRelOn-Relation folgen der Ontologie.

Zwei Befunde aus der offiziellen AgRelOn-RDF von der Deutschen Nationalbibliothek,
beide am 2026-08-22 gegen die Quelle geprueft.

Erstens ist ``agrelon:hasCorrespondent`` eine ``owl:SymmetricProperty``, und fuer
symmetrische n-aere Begriffe sieht die Ontologie ``agrelon:hasSubjectObject`` vor,
weil beide Seiten dieselbe Rolle tragen. ``hasSubject`` und ``hasObject`` an einer
``HasCorrespondent``-Instanz behaupten eine Richtung, die der Begriff nicht kennt.
Die tatsaechliche Richtung, also wer geschrieben und wer empfangen hat, ist eine
Aussage ueber das Dokument und steht als erfasste Rolle am Beziehungsknoten.

Zweitens ist ``IsHasPatron`` der n-aere Begriff zu ``isPatronOf``/``hasPatron``,
und ``isPatronOf`` traegt die ``correspondsTo``-Richtung. Nach dem Kommentar zu
``hasSubjectObject`` folgen Subjekt- und Objektstelle der Lesart des ersten
Namensteils, hier ``isPatronOf``. Subjekt ist damit der Foerdernde und nicht der
Gefoerderte. Die Pipeline setzte die Nachlassbildnerin als Subjekt und drehte die
Beziehung damit um.

Lauf: pytest tests/test_51_agrelon_roles.py
"""

SYMMETRIC_CLASSES = {"agrelon:HasCorrespondent"}
FONDS_ID = "wd:Q94208"
FONDS_NAME = "Malaniuk, Ira"

# Rollen, die die Absenderseite eines Korrespondenzstueckes tragen, gegen die
# der empfangenden Seite. Beide stehen als Concept-CURIE am Beziehungsknoten.
SENDING_ROLES = {"m3gim-vocab:author", "m3gim-vocab:sender"}
RECEIVING_ROLES = {"m3gim-vocab:addressee", "m3gim-vocab:recipient"}


def _as_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def _relations(records):
    for rec in records:
        for rel in _as_list(rec.get("m3gim-ontology:hasAgentRelation")):
            if isinstance(rel, dict):
                yield rec, rel


def _role_id(node):
    # Der Datensatz fuehrt die Rolle unter dem @context-Kurznamen `role`.
    r = node.get("role") if isinstance(node, dict) else None
    if isinstance(r, dict):
        return r.get("@id")
    return r


def _is_fonds(node):
    return node.get("@id") == FONDS_ID or node.get("name") == FONDS_NAME


def test_a_symmetric_relation_carries_no_direction(records):
    """HasCorrespondent nutzt hasSubjectObject statt hasSubject/hasObject."""
    seen = 0
    wrong = []
    for rec, rel in _relations(records):
        if rel.get("@type") not in SYMMETRIC_CLASSES:
            continue
        seen += 1
        if "agrelon:hasSubject" in rel or "agrelon:hasObject" in rel:
            wrong.append(rec.get("rico:identifier"))
    assert seen, (
        "Keine symmetrische AgRelOn-Relation im Datenstand — der Test verliert "
        "seinen Gegenstand und ist zu pruefen."
    )
    assert not wrong, (
        f"{len(wrong)} von {seen} symmetrischen Relationen behaupten eine "
        f"Richtung, die der Begriff nicht kennt: {wrong[:6]}"
    )


def test_a_symmetric_relation_names_both_sides(records):
    """Beide Seiten stehen als hasSubjectObject am selben Knoten."""
    thin = []
    for rec, rel in _relations(records):
        if rel.get("@type") not in SYMMETRIC_CLASSES:
            continue
        sides = _as_list(rel.get("agrelon:hasSubjectObject"))
        if len(sides) != 2:
            thin.append((rec.get("rico:identifier"), len(sides)))
    assert not thin, (
        "Eine symmetrische Relation ohne genau zwei Seiten ist unvollstaendig: "
        f"{thin[:6]}"
    )


def test_the_direction_of_a_letter_stays_readable(records):
    """Die erfasste Rolle haelt fest, wer geschrieben und wer empfangen hat."""
    seen = 0
    missing = []
    for rec, rel in _relations(records):
        if rel.get("@type") not in SYMMETRIC_CLASSES:
            continue
        for side in _as_list(rel.get("agrelon:hasSubjectObject")):
            role = _role_id(side)
            # Die Nachlassbildnerin steht oft nicht in der Agentenliste ihres
            # eigenen Briefes; ihre Seite bleibt dann ohne Rolle. Eine aus der
            # Gegenseite abgeleitete Rolle waere geraten.
            if _is_fonds(side):
                continue
            if role is None:
                missing.append((rec.get("rico:identifier"), side.get("name")))
                continue
            if role in SENDING_ROLES or role in RECEIVING_ROLES:
                seen += 1
    assert seen, (
        "Keine Seite einer Korrespondenz traegt eine Absender- oder "
        "Empfaengerrolle — ohne sie zeigt die Oberflaeche zwei ununterscheidbare "
        "Partner."
    )
    assert not missing, (
        f"{len(missing)} Seiten ohne erfasste Rolle: {missing[:6]}"
    )


def test_the_patron_is_the_subject(records):
    """Bei IsHasPatron steht der Foerdernde an der Subjektstelle."""
    seen = 0
    inverted = []
    for rec, rel in _relations(records):
        if rel.get("@type") != "agrelon:IsHasPatron":
            continue
        seen += 1
        subj = rel.get("agrelon:hasSubject") or {}
        if subj.get("@id") == FONDS_ID or subj.get("name") == FONDS_NAME:
            inverted.append(rec.get("rico:identifier"))
    assert seen, (
        "Keine Patron-Relation im Datenstand — der Test verliert seinen "
        "Gegenstand und ist zu pruefen."
    )
    assert not inverted, (
        "Die Nachlassbildnerin steht als Foerdernde statt als Gefoerderte; "
        f"die Beziehung ist umgedreht: {inverted[:6]}"
    )
