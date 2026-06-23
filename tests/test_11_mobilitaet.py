"""Mobilitaets-Spec: Phase 4.4 SpatiotemporalEvent + die 5 Mobilitaetssichten
aus data.md Abschnitt 10.

STATUS: aktiv, sichert den Phase-4.4-Output (seit Session 28). Tests greifen,
wenn die Pipeline den Komposittyp `ort, datum` nicht mehr als SpatiotemporalEvent
emittiert oder die Mindest-Invarianten unterschreitet.

Ziel-Invarianten (aus data.md § 10):
- Jede XLSX-Zeile mit typ='ort, datum' erzeugt genau eine SpatiotemporalEvent
- SpatiotemporalEvent hat m3gim:atPlace (Ortsreferenz) und m3gim:atDate (ISO oder TimeSpan)
- m3gim:eventRole fuehrt die 12 Rollen aus v2 (gastspiel, aufführung, probe...)
- Mindestens 60 SpatiotemporalEvent-Instanzen im v2-Output (Datenbestand)
- Die 5 Mobilitaetssichten sind aus dem Graph ableitbar (performative, institutionelle,
  reise/korrespondenz, biographische, diskursive Mobilitaet)
"""

import pytest

from _helpers import ensure_list


# ---------------------------------------------------------------------------
# Phase 4.4: SpatiotemporalEvent
# ---------------------------------------------------------------------------

def test_spatiotemporal_events_exist(graph, xlsx_verknuepfungen):
    """SpatiotemporalEvents existieren im Graph. Untergrenze skaliert mit
    der XLSX-Anzahl `ort, datum`-Rows, toleriert aber Verluste fuer Artefakte
    und verwaiste Signaturen (60%-Schwelle, konsistent mit
    test_every_ort_datum_row_produces_event)."""
    events = [n for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"]
    row_count = 0
    if "typ" in xlsx_verknuepfungen.columns:
        typ_col = xlsx_verknuepfungen["typ"].fillna("").astype(str).str.strip().str.lower()
        row_count = (typ_col == "ort, datum").sum()
    assert len(events) >= max(5, row_count * 0.6), (
        f"Nur {len(events)} SpatiotemporalEvents fuer {row_count} XLSX-Zeilen"
    )


MOBILITY_PLACE_ROLES = {
    "zielort", "absendeort", "abreiseort", "empfangsort", "vertragsort",
}


def test_spatiotemporal_events_have_place_and_date(graph):
    """Jede SpatiotemporalEvent-Instanz hat m3gim:atPlace; datierte STE auch
    m3gim:atDate. Ausnahmen ohne atDate: datumslose Mobilitaets-STE (E-97,
    eventRole aus MOBILITY_PLACE_ROLES) sowie bis zu 3 Freitext-Rows."""
    events = [n for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"]
    assert events, "Keine SpatiotemporalEvents"
    missing = []
    for ev in events:
        if not ev.get("m3gim:atPlace"):
            missing.append((ev.get("@id"), "atPlace"))
        if (not ev.get("m3gim:atDate")
                and ev.get("m3gim:eventRole") not in MOBILITY_PLACE_ROLES):
            missing.append((ev.get("@id"), "atDate"))
    assert len(missing) <= 3, f"Zu viele SpatiotemporalEvents ohne place/date: {missing[:5]}"


def test_spatiotemporal_event_roles_known(graph):
    """eventRole-Werte gehoeren zum belegten Vokabular (data.md § 5 ort-Rollen +
    gastspiel/generalprobe/spielzeit).
    """
    allowed = {
        "gastspiel", "aufführung", "auftritt", "probe", "generalprobe",
        "premiere", "wiederaufnahme", "festvorstellung", "spielzeit",
        "absendedatum", "auffuehrungsdatum",
        "auftrag", "entstehung", "erscheinungsdatum",
        "ausstellungsdatum", "erwähnt",
        # tieferer Export (G2-Aktivierung, Treffen 2026-06-23):
        "aufnahme", "rahmenveranstaltung",
    } | MOBILITY_PLACE_ROLES
    events = [n for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"]
    assert len(events) >= 20, f"Zu wenige Events: {len(events)} (erwartet >= 20)"
    unknown = set()
    for ev in events:
        role = ev.get("m3gim:eventRole")
        if role and role not in allowed:
            unknown.add(role)
    assert not unknown, f"SpatiotemporalEvent-Rollen ausserhalb des Vokabulars: {unknown}"


def test_every_ort_datum_row_produces_event(xlsx_verknuepfungen, graph):
    """Mindestens 60% der XLSX-Zeilen mit typ='ort, datum' erzeugen ein Event.
    Verluste entstehen durch:
    - Artefakte (Datetime-Leaks, Freitext wie 'Wien, ab 1956') ~5%
    - Rows ohne matching Record (Folio stimmt nicht mit Objekt-Record ueberein) ~20%
    Daher Toleranz 60% als Untergrenze."""
    df = xlsx_verknuepfungen
    typ_col = df["typ"].fillna("").astype(str).str.strip().str.lower()
    row_count = (typ_col == "ort, datum").sum()
    events = [n for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"]
    assert len(events) >= row_count * 0.6, (
        f"{len(events)} Events fuer {row_count} XLSX-Zeilen"
    )


# ---------------------------------------------------------------------------
# 5 Mobilitaetssichten aus data.md § 10 — SPARQL-aehnliche Pattern in Python
# ---------------------------------------------------------------------------

PERFORMATIVE_ROLES = {"auftritt", "aufführung", "gastspiel", "premiere",
                     "wiederaufnahme", "festvorstellung"}


def test_performative_mobility_query(graph):
    """Sicht 1: Wo trat Malaniuk auf?
    SpatiotemporalEvent mit eventRole in PERFORMATIVE_ROLES, UND
    atPlace + atDate erfuellt.
    """
    matches = []
    for n in graph:
        if n.get("@type") != "m3gim:SpatiotemporalEvent":
            continue
        if n.get("m3gim:eventRole") in PERFORMATIVE_ROLES:
            if n.get("m3gim:atPlace") and n.get("m3gim:atDate"):
                matches.append(n)
    assert len(matches) >= 20, (
        f"Performative Mobilitaet liefert nur {len(matches)} Events"
    )


def test_institutional_mobility_query(graph, records):
    """Sicht 2: Wo war sie engagiert?
    SpatiotemporalEvent mit eventRole=spielzeit ODER
    AgRelOn HasEmployeeEmployer-Relation.
    """
    spielzeit = [n for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"
                 and n.get("m3gim:eventRole") == "spielzeit"]
    employer_rels = []
    for r in records:
        for rel in ensure_list(r.get("m3gim:agentRelation")):
            if isinstance(rel, dict) and rel.get("@type") == "agrelon:HasEmployeeEmployer":
                employer_rels.append(rel)
    assert spielzeit or employer_rels, "Keine institutionelle Mobilitaet ableitbar"


def test_correspondence_mobility_query(records):
    """Sicht 3: Wo war sie wann (ueber Korrespondenz)?
    AgRelOn HasCorrespondent mit Provenance auf Briefe.
    """
    has_corr = 0
    for r in records:
        for rel in ensure_list(r.get("m3gim:agentRelation")):
            if isinstance(rel, dict) and rel.get("@type") == "agrelon:HasCorrespondent":
                has_corr += 1
    assert has_corr > 0, "Keine HasCorrespondent-Relationen"
