"""Mobilitaets-Spec: Verortungen als Annotationsknoten + die 5
Mobilitaetssichten aus data.md Abschnitt 10.

STATUS: aktiv. Tests greifen, wenn die Pipeline den Komposittyp `ort, datum`
nicht mehr als Annotation emittiert oder die Mindest-Invarianten unterschreitet.

Ziel-Invarianten (aus data.md § 10):
- Jede XLSX-Zeile mit typ='ort, datum' erzeugt genau eine Verortung
- Eine Verortung ist ein m3gim-ontology:Annotation-Knoten mit
  m3gim-ontology:atPlace und, wo die Quelle eines hergibt,
  m3gim-ontology:atDate (ISO oder TimeSpan)
- m3gim-ontology:role fuehrt die Rollen aus dem Vokabular (gastspiel,
  aufführung, probe...)
- Die 5 Mobilitaetssichten sind aus dem Graph ableitbar (performative, institutionelle,
  reise/korrespondenz, biographische, diskursive Mobilitaet)
"""


from _helpers import ensure_list


def role_label(node):
    """Anzeigetext der Rolle eines Knotens, aus dem mitgefuehrten prefLabel."""
    role = node.get("role")
    if isinstance(role, dict):
        return role.get("skos:prefLabel", "")
    return role or ""


def places(graph):
    """Alle Verortungen: Annotationsknoten, die einen Ort tragen."""
    return [
        n for n in graph
        if n.get("@type") == "m3gim-ontology:Annotation"
        and n.get("m3gim-ontology:atPlace")
    ]


# ---------------------------------------------------------------------------
# Verortungen als Annotationsknoten
# ---------------------------------------------------------------------------

def test_spatiotemporal_events_exist(graph, xlsx_verknuepfungen):
    """Verortungen existieren im Graph. Untergrenze skaliert mit
    der XLSX-Anzahl `ort, datum`-Rows, toleriert aber Verluste fuer Artefakte
    und verwaiste Signaturen (60%-Schwelle, konsistent mit
    test_every_ort_datum_row_produces_event)."""
    events = places(graph)
    row_count = 0
    if "typ" in xlsx_verknuepfungen.columns:
        typ_col = xlsx_verknuepfungen["typ"].fillna("").astype(str).str.strip().str.lower()
        row_count = (typ_col == "ort, datum").sum()
    assert len(events) >= max(5, row_count * 0.6), (
        f"Nur {len(events)} Verortungen fuer {row_count} XLSX-Zeilen"
    )


# Nach der Zusammenfuehrung im Vokabular tragen die Aspektpaare denselben
# Begriff, weil der Aspekt in der Wertproperty steht: absendeort und
# absendedatum sind absendung, empfangsort und empfangsdatum empfangnahme,
# abreiseort und abreisedatum abreise.
MOBILITY_PLACE_ROLES = {
    "zielort", "absendung", "abreise", "empfangnahme", "vertragsort",
}


def test_spatiotemporal_events_have_place_and_date(graph):
    """Jede Verortung hat m3gim-ontology:atPlace; datierte auch
    m3gim-ontology:atDate. Ausnahmen ohne atDate: datumslose Mobilitaets-
    Verortungen (E-97, Rolle aus MOBILITY_PLACE_ROLES) sowie bis zu 3
    Freitext-Rows."""
    events = places(graph)
    assert events, "Keine Verortungen"
    missing = []
    for ev in events:
        if not ev.get("m3gim-ontology:atPlace"):
            missing.append((ev.get("@id"), "atPlace"))
        if (not ev.get("m3gim-ontology:atDate")
                and role_label(ev) not in MOBILITY_PLACE_ROLES):
            missing.append((ev.get("@id"), "atDate"))
    assert len(missing) <= 3, f"Zu viele Verortungen ohne place/date: {missing[:5]}"


def test_spatiotemporal_event_roles_known(graph):
    """Rollenwerte an Verortungen gehoeren zum belegten Vokabular (data.md § 5
    ort-Rollen + gastspiel/generalprobe/spielzeit).
    """
    allowed = {
        "gastspiel", "aufführung", "probe", "generalprobe",
        "premiere", "wiederaufnahme", "festvorstellung", "spielzeit",
        "auftrag", "entstehung", "erscheinungsdatum",
        "ausstellungsdatum", "erwähnt",
        # tieferer Export (G2-Aktivierung, Treffen 2026-06-23):
        "aufnahme", "rahmenveranstaltung",
    } | MOBILITY_PLACE_ROLES
    events = places(graph)
    assert len(events) >= 20, f"Zu wenige Verortungen: {len(events)} (erwartet >= 20)"
    unknown = set()
    for ev in events:
        role = role_label(ev)
        if role and role not in allowed:
            unknown.add(role)
    assert not unknown, f"Rollen an Verortungen ausserhalb des Vokabulars: {unknown}"


def test_every_ort_datum_row_produces_event(xlsx_verknuepfungen, graph):
    """Mindestens 60% der XLSX-Zeilen mit typ='ort, datum' erzeugen eine Verortung.
    Verluste entstehen durch:
    - Artefakte (Datetime-Leaks, Freitext wie 'Wien, ab 1956') ~5%
    - Rows ohne matching Record (Folio stimmt nicht mit Objekt-Record ueberein) ~20%
    Daher Toleranz 60% als Untergrenze."""
    df = xlsx_verknuepfungen
    typ_col = df["typ"].fillna("").astype(str).str.strip().str.lower()
    row_count = (typ_col == "ort, datum").sum()
    events = places(graph)
    assert len(events) >= row_count * 0.6, (
        f"{len(events)} Verortungen fuer {row_count} XLSX-Zeilen"
    )


# ---------------------------------------------------------------------------
# 5 Mobilitaetssichten aus data.md § 10 — SPARQL-aehnliche Pattern in Python
# ---------------------------------------------------------------------------

# auftritt ist im Vokabular auf aufführung gefuehrt; der erfasste Wert steht
# weiter an m3gim-ontology:derivedFromRole.
PERFORMATIVE_ROLES = {"aufführung", "gastspiel", "premiere",
                     "wiederaufnahme", "festvorstellung"}


def test_performative_mobility_query(graph):
    """Sicht 1: Wo trat Malaniuk auf?
    Verortung mit Rolle in PERFORMATIVE_ROLES, UND atPlace + atDate erfuellt.
    """
    matches = [
        n for n in places(graph)
        if role_label(n) in PERFORMATIVE_ROLES and n.get("m3gim-ontology:atDate")
    ]
    assert len(matches) >= 20, (
        f"Performative Mobilitaet liefert nur {len(matches)} Verortungen"
    )


def test_institutional_mobility_query(graph, records):
    """Sicht 2: Wo war sie engagiert?
    Verortung mit Rolle spielzeit ODER
    AgRelOn HasEmployeeEmployer-Relation.
    """
    spielzeit = [n for n in places(graph) if role_label(n) == "spielzeit"]
    employer_rels = []
    for r in records:
        for rel in ensure_list(r.get("m3gim-ontology:hasAgentRelation")):
            if isinstance(rel, dict) and rel.get("@type") == "agrelon:HasEmployeeEmployer":
                employer_rels.append(rel)
    assert spielzeit or employer_rels, "Keine institutionelle Mobilitaet ableitbar"


def test_correspondence_mobility_query(records):
    """Sicht 3: Wo war sie wann (ueber Korrespondenz)?
    AgRelOn HasCorrespondent mit Provenance auf Briefe.
    """
    has_corr = 0
    for r in records:
        for rel in ensure_list(r.get("m3gim-ontology:hasAgentRelation")):
            if isinstance(rel, dict) and rel.get("@type") == "agrelon:HasCorrespondent":
                has_corr += 1
    assert has_corr > 0, "Keine HasCorrespondent-Relationen"
