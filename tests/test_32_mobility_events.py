"""Mobilitaets-Ereignisse aus Ortsrollen (E-97, datengedeckter Kern).

Die Mobilitaets-Ortsrollen (zielort/absendeort/abreiseort/empfangsort/
vertragsort) erzeugen je eine DATUMSLOSE m3gim:SpatiotemporalEvent — ein
First-Class-Mobilitaetsereignis fuer den Mobilitaets-Atlas. Der Ort bleibt
zusaetzlich als rico:hasOrHadLocation am Record erhalten (kein Index-Regress).

Abgrenzung: wohnort (Zustand mit agrelon:hasValidityPeriod) und vertragspartner
(AgRelOn-Relation) sind in E-97 spezifiziert, kommen im aktuellen Export aber
0x vor und sind bewusst NICHT implementiert (kein spekulativer, nie feuernder
Code, Leitplanke "datengedeckt"). Die Tests test_dated_ste_unaffected und
test_wohnort_not_a_point_event sichern diese Abgrenzung als Regression-Guards.

Spec: data.md Abschnitt 4/10, decisions.md E-97.
"""

from _helpers import ensure_list

MOBILITY_PLACE_ROLES = {
    "zielort", "absendeort", "abreiseort", "empfangsort", "vertragsort",
}


def _stes(graph):
    return [n for n in graph if isinstance(n, dict)
            and n.get("@type") == "m3gim:SpatiotemporalEvent"]


def _mobility_stes(graph):
    return [n for n in _stes(graph)
            if n.get("m3gim:eventRole") in MOBILITY_PLACE_ROLES]


# --- Datengedeckter Kern (E-97) -------------------------------------------

def test_mobility_place_role_emits_dateless_ste(graph, records):
    """Jede Mobilitaets-Ortsrolle erzeugt eine wohlgeformte, DATUMSLOSE
    m3gim:SpatiotemporalEvent: atPlace mit name, eventRole aus dem Mobilitaets-
    Vokabular, Self-Provenance auf einen existierenden Record, KEIN atDate.
    Mindestens 10 erwartet (Quelle: zielort 13 + absendeort 3 + abreiseort 1)."""
    rec_ids = {r["@id"] for r in records}
    mob = _mobility_stes(graph)
    assert len(mob) >= 10, f"Nur {len(mob)} Mobilitaets-STE — Routing greift nicht"
    offenders = []
    for ev in mob:
        if "m3gim:atDate" in ev:
            offenders.append((ev.get("@id"), "atDate vorhanden", ev["m3gim:atDate"]))
        place = ev.get("m3gim:atPlace")
        if not isinstance(place, dict) or not (place.get("name") or "").strip():
            offenders.append((ev.get("@id"), "atPlace", place))
        prov = ev.get("agrelon:metadataProvenance")
        rid = prov.get("@id") if isinstance(prov, dict) else None
        if rid not in rec_ids:
            offenders.append((ev.get("@id"), "provenance", rid))
    assert not offenders, f"Fehlgeformte Mobilitaets-STE: {offenders[:5]}"


def test_mobility_place_retained_as_location(graph, records):
    """Der Mobilitaets-Ort bleibt zusaetzlich als rico:hasOrHadLocation am
    Quell-Record erhalten (kein Regress des Ortsindex). Fuer mindestens einen
    Mobilitaets-STE deckt sich der atPlace-Name mit einer Record-Location."""
    rec_by_id = {r["@id"]: r for r in records}
    overlaps = 0
    for ev in _mobility_stes(graph):
        prov = ev.get("agrelon:metadataProvenance")
        rid = prov.get("@id") if isinstance(prov, dict) else None
        rec = rec_by_id.get(rid)
        if not rec:
            continue
        place_name = (ev.get("m3gim:atPlace") or {}).get("name")
        loc_names = {
            (loc or {}).get("name")
            for loc in ensure_list(rec.get("rico:hasOrHadLocation"))
            if isinstance(loc, dict)
        }
        if place_name in loc_names:
            overlaps += 1
    assert overlaps >= 1, (
        "Kein Mobilitaets-Ort als rico:hasOrHadLocation erhalten — Index-Regress"
    )


# --- Regression-Guards / Abgrenzung (kein xfail) --------------------------

def test_dated_ste_unaffected(graph):
    """Die bestehenden Komposit-ort,datum-STEs (MIT atDate) bleiben unberuehrt;
    mindestens 40 datierte STE im Graph (Baseline 46)."""
    dated = [n for n in _stes(graph) if "m3gim:atDate" in n]
    assert len(dated) >= 40, f"Nur {len(dated)} datierte STE — Komposit-Pfad regressiert"


def test_wohnort_not_a_point_event(graph):
    """wohnort ist ein Zustand, kein Punktereignis: kein STE traegt eventRole
    'wohnort' (E-97-Abgrenzung; die Zustands-Modellierung mit Validity ist
    mangels Datendeckung bewusst zurueckgestellt)."""
    offenders = [n.get("@id") for n in _stes(graph)
                 if n.get("m3gim:eventRole") == "wohnort"]
    assert not offenders, (
        f"{len(offenders)} STE mit eventRole 'wohnort' — als Punktereignis "
        f"fehlmodelliert: {offenders[:5]}"
    )
