"""Datenqualitaets-Flags und Datums-Routing (E-102).

Drei Invarianten:
  1. Das generische m3gim:eventDate ist abgeschafft. Datumsrollen ohne
     typisierte Property landen in m3gim:hasDatedEvent (Klasse m3gim:DatedEvent,
     dateValue/dateRole), das auch klammer-/fragezeichen-unsichere Datierungen
     traegt. Kein stiller Datenverlust beim Drop.
  2. m3gim:dataQualityFlag zieht aus einem kontrollierten Vokabular, abgeleitet
     aus Unsicherheitssignalen im anmerkung-Feld. m3gim:qualityConfidence wird
     nicht fabriziert (Leitplanke "Konfidenz nicht erfinden").
  3. m3gim:bearbeitungsnotiz traegt den Freitext-Anhang des Objekt-
     Bearbeitungsstands, der canonische Status bleibt in m3gim:bearbeitungsstand.

Spec: data.md Abschnitt 6/7, decisions.md E-100/E-102.
"""

from _helpers import ensure_list

QUALITY_FLAG_VOCAB = {
    "name-nicht-eindeutig",
    "vorname-fehlt",
    "rolle-unsicher",
    "quelle-tippfehler",
}

TYPED_DATE_PROPS = {
    "m3gim:absendedatum", "m3gim:empfangsdatum", "m3gim:ausstellungsdatum",
    "m3gim:erscheinungsdatum", "m3gim:abreisedatum", "m3gim:auftrittsdatum",
    "m3gim:auffuehrungsdatum", "m3gim:probendatum", "m3gim:probenbeginn",
    "m3gim:premieredatum", "m3gim:ausstrahlungsdatum", "m3gim:spielzeitVon",
    "m3gim:spielzeitBis", "m3gim:ueberweisungsdatum", "m3gim:erstelldatum",
}


def _walk(node):
    """Alle dict-Knoten im Baum (inkl. verschachtelt)."""
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from _walk(v)
    elif isinstance(node, list):
        for item in node:
            yield from _walk(item)


def _all_nodes(graph):
    for n in graph:
        yield from _walk(n)


# --- 1. Datums-Routing / eventDate-Drop -----------------------------------

def test_generic_event_date_retired(graph):
    """m3gim:eventDate kommt nirgends mehr vor (E-102, atomarer Ersatz durch
    DatedEvent-Routing)."""
    offenders = [n.get("@id") for n in _all_nodes(graph) if "m3gim:eventDate" in n]
    assert not offenders, (
        f"{len(offenders)} Knoten tragen noch das abgeschaffte m3gim:eventDate: "
        f"{offenders[:5]}"
    )


def test_dated_events_wellformed(records):
    """Jeder m3gim:hasDatedEvent-Eintrag ist eine wohlgeformte m3gim:DatedEvent
    mit nicht-leerem dateValue und dateRole. Mindestens 10 erwartet (das frueher
    nach eventDate geleitete Volumen)."""
    total = 0
    offenders = []
    for r in records:
        for de in ensure_list(r.get("m3gim:hasDatedEvent")):
            total += 1
            if not isinstance(de, dict):
                offenders.append((r["@id"], de)); continue
            if de.get("@type") != "m3gim:DatedEvent":
                offenders.append((r["@id"], "type", de.get("@type")))
            val = de.get("m3gim:dateValue")
            if not isinstance(val, str) or not val.strip():
                offenders.append((r["@id"], "dateValue", val))
            if not isinstance(de.get("m3gim:dateRole"), str):
                offenders.append((r["@id"], "dateRole", de.get("m3gim:dateRole")))
    assert total >= 10, f"Nur {total} DatedEvents — Routing greift nicht"
    assert not offenders, f"Fehlgeformte DatedEvents: {offenders[:5]}"


def test_dated_event_does_not_duplicate_ste(records, graph):
    """Ein ort,datum-Komposit wird in GENAU EINE Repraesentation aufgeloest
    (data.md § 4): das SpatiotemporalEvent traegt Ort + Datum. Der Datums-Teil
    darf nicht zusaetzlich als DatedEvent am selben Record erscheinen — sonst
    zaehlt jede Datums-Aggregation das Datum doppelt (Audit-Befund zu E-102)."""
    # STE atDate+eventRole je Record (ueber die Self-Provenance).
    ste_by_rec = {}
    for n in graph:
        if isinstance(n, dict) and n.get("@type") == "m3gim:SpatiotemporalEvent":
            prov = n.get("agrelon:metadataProvenance")
            rid = prov.get("@id") if isinstance(prov, dict) else None
            if rid:
                ste_by_rec.setdefault(rid, set()).add(
                    (n.get("m3gim:atDate"), n.get("m3gim:eventRole"))
                )
    dupes = []
    for r in records:
        stes = ste_by_rec.get(r["@id"], set())
        for de in ensure_list(r.get("m3gim:hasDatedEvent")):
            if not isinstance(de, dict):
                continue
            pair = (de.get("m3gim:dateValue"), de.get("m3gim:dateRole"))
            if pair in stes:
                dupes.append((r["@id"], pair))
    assert not dupes, (
        f"{len(dupes)} DatedEvents duplizieren ein STE atDate+role am selben "
        f"Record (ort,datum doppelt repraesentiert, data.md § 4): {dupes[:5]}"
    )


def test_uncertain_datings_routed_to_dated_event(records):
    """Klammer-/Fragezeichen-unsichere oder Freitext-Datierungen landen im
    DatedEvent (dateValue), nicht in einer typisierten Datumsproperty oder
    rico:date. Die typisierten Properties bleiben rein ISO/qualifiziert."""
    import re
    iso_or_qual = re.compile(
        r"^(circa:|vor:|nach:)?\d{4}(-\d{2}(-\d{2})?)?(/\d{4}(-\d{2}(-\d{2})?)?)?$"
    )
    typed_offenders = []
    for r in records:
        for prop in TYPED_DATE_PROPS:
            for val in ensure_list(r.get(prop)):
                if isinstance(val, str) and not iso_or_qual.match(val):
                    typed_offenders.append((r["@id"], prop, val))
    assert not typed_offenders, (
        f"Unsichere/Freitext-Datierung in typisierter Property statt DatedEvent: "
        f"{typed_offenders[:5]}"
    )
    # Mindestens eine DatedEvent traegt einen nicht-ISO-Wert (Beleg, dass die
    # unsicheren Faelle hier ankommen).
    nonsiso = []
    for r in records:
        for de in ensure_list(r.get("m3gim:hasDatedEvent")):
            if isinstance(de, dict):
                val = de.get("m3gim:dateValue", "")
                if isinstance(val, str) and not iso_or_qual.match(val):
                    nonsiso.append(val)
    assert nonsiso, "Keine nicht-ISO-Datierung im DatedEvent — Klammerfall verloren?"


# --- 2. Datenqualitaets-Flags ---------------------------------------------

def test_data_quality_flags_vocab(graph):
    """Jeder m3gim:dataQualityFlag-Wert stammt aus dem kontrollierten Vokabular;
    mindestens 10 Flags aus den anmerkung-Signalen vorhanden."""
    values = []
    for n in _all_nodes(graph):
        values.extend(ensure_list(n.get("m3gim:dataQualityFlag")))
    assert len(values) >= 10, f"Nur {len(values)} dataQualityFlags — Ableitung greift nicht"
    offenders = sorted({v for v in values if v not in QUALITY_FLAG_VOCAB})
    assert not offenders, (
        f"dataQualityFlag-Werte ausserhalb des Vokabulars {QUALITY_FLAG_VOCAB}: "
        f"{offenders}"
    )


def test_quality_confidence_not_fabricated(graph):
    """m3gim:qualityConfidence wird nicht fabriziert: die Pipeline emittiert
    keinen geratenen Zahlenwert fuer die Flag-Konfidenz (Leitplanke 'Konfidenz
    nicht erfinden'). Die Property bleibt fuer belegbare Werte reserviert."""
    offenders = [n.get("@id") for n in _all_nodes(graph)
                 if "m3gim:qualityConfidence" in n]
    assert not offenders, (
        f"{len(offenders)} Knoten tragen eine fabrizierte qualityConfidence: "
        f"{offenders[:5]}"
    )


# --- 3. Bearbeitungsnotiz --------------------------------------------------

def test_bearbeitungsnotiz_split(records):
    """Mindestens ein Record traegt eine m3gim:bearbeitungsnotiz (Freitext-Anhang
    des Bearbeitungsstands), und der canonische Status bleibt davon getrennt in
    m3gim:bearbeitungsstand."""
    canonical = {"abgeschlossen", "begonnen", "zurueckgestellt"}
    with_notiz = [r for r in records if r.get("m3gim:bearbeitungsnotiz")]
    assert with_notiz, "Kein Record mit m3gim:bearbeitungsnotiz — Split greift nicht"
    for r in with_notiz:
        notiz = r["m3gim:bearbeitungsnotiz"]
        assert isinstance(notiz, str) and notiz.strip()
        # Notiz ist Freitext, kein blosser canonischer Status.
        assert notiz.strip().lower() not in canonical, (
            f"{r['@id']}: bearbeitungsnotiz ist nur der Status: {notiz}"
        )
        # Der canonische Status bleibt erhalten und getrennt.
        assert r.get("m3gim:bearbeitungsstand") in canonical, (
            f"{r['@id']}: bearbeitungsstand fehlt oder nicht canonisch"
        )
