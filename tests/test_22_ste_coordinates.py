"""Koordinaten-Patch fuer SpatiotemporalEvents (Session 33, Milestone Mobilitaets-Atlas).

Vorbedingung fuer den Mobilitaets-Atlas-Tab: jeder m3gim:SpatiotemporalEvent,
dessen Ort gegen den Ortsindex aufloesbar ist, traegt in seinem
m3gim:atPlace-Subobjekt

    @id       : wd:Qxxx
    owl:sameAs: http://www.wikidata.org/entity/Qxxx
    geo:lat   : <float>
    geo:long  : <float>
    m3gim:country: <Label>   (falls in der Wikidata-Property P17 vorhanden)

Analog zur Anreicherung regulaerer rico:Place-Eintraege in
scripts/transform.py (_inject_enrichment, Z. 954-962).

Anker: Staedte mit Q-ID aus data/output/wikidata-reconciliation.json
(Zuerich Q72, Salzburg Q34713). Wien/Muenchen/Bayreuth sind noch
unmatched und werden nach dem Patch weiterhin ohne Koordinaten bleiben
(Reconciliation-Luecke, kein Pipeline-Bug).
"""

import pytest


ANCHOR_STES = [
    # (STE-@id, erwarteter Q-ID-Praefix, erwarteter Stadtname)
    # NIM_004_24 Folio: Zuerich(_7), Muenchen(_8), Wien(_9, nach:1956 — seit
    # E-102 als eigenes STE statt Datumsfeld-Leak), Bayreuth(_10), Salzburg(_11).
    ("m3gim:ste_NIM_004_24_7",  "wd:Q72",    "Zürich"),
    ("m3gim:ste_NIM_004_24_11", "wd:Q34713", "Salzburg"),
]


def _ste_by_id(graph):
    return {
        n.get("@id"): n for n in graph
        if n.get("@type") == "m3gim:SpatiotemporalEvent"
    }


def _at_place(ste):
    p = ste.get("m3gim:atPlace")
    return p if isinstance(p, dict) else None


# ---------------------------------------------------------------------------
# Anker-Asserts (sichern STE-Koordinaten-Patch aus Session 33)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("ste_id,expected_qid,expected_name", ANCHOR_STES)
def test_anchor_ste_has_wikidata_id(graph, ste_id, expected_qid, expected_name):
    """Anker-STE traegt im atPlace-Subobjekt @id + owl:sameAs auf Wikidata."""
    stes = _ste_by_id(graph)
    ste = stes.get(ste_id)
    assert ste is not None, (
        f"Anker-STE {ste_id!r} fehlt im Graph. Pipeline-Regression "
        f"oder Fixture pflegen."
    )
    place = _at_place(ste)
    assert place is not None, f"{ste_id}: m3gim:atPlace fehlt oder ist kein Objekt"
    assert place.get("name") == expected_name, (
        f"{ste_id}: Ort={place.get('name')!r}, erwartet {expected_name!r}"
    )
    assert place.get("@id") == expected_qid, (
        f"{ste_id}: atPlace.@id={place.get('@id')!r}, erwartet {expected_qid!r}"
    )
    same = place.get("owl:sameAs", "")
    assert same.startswith("http://www.wikidata.org/entity/"), (
        f"{ste_id}: owl:sameAs={same!r} (erwartet wikidata.org/entity/...)"
    )


@pytest.mark.parametrize("ste_id,expected_qid,expected_name", ANCHOR_STES)
def test_anchor_ste_has_coordinates(graph, ste_id, expected_qid, expected_name):
    """Anker-STE traegt im atPlace-Subobjekt geo:lat + geo:long als float."""
    stes = _ste_by_id(graph)
    ste = stes.get(ste_id)
    assert ste is not None, f"Anker-STE {ste_id!r} fehlt"
    place = _at_place(ste)
    assert place is not None, f"{ste_id}: m3gim:atPlace fehlt"

    lat = place.get("geo:lat")
    lon = place.get("geo:long")
    assert isinstance(lat, (int, float)), (
        f"{ste_id}: geo:lat={lat!r} (erwartet float)"
    )
    assert isinstance(lon, (int, float)), (
        f"{ste_id}: geo:long={lon!r} (erwartet float)"
    )
    # Plausibilitaet: Europa/nearby
    assert -90 <= lat <= 90, f"{ste_id}: Breitengrad ausserhalb [-90, 90]: {lat}"
    assert -180 <= lon <= 180, f"{ste_id}: Laengengrad ausserhalb [-180, 180]: {lon}"


# ---------------------------------------------------------------------------
# Shape-Assertion
# ---------------------------------------------------------------------------


def test_ste_place_wd_id_shape(graph):
    """Wo @id in atPlace gesetzt ist, matcht es ^wd:Q\\d+$ und owl:sameAs passt."""
    import re
    qid_pattern = re.compile(r"^wd:Q\d+$")
    offenders = []
    for ste in (n for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"):
        place = _at_place(ste)
        if not place:
            continue
        pid = place.get("@id")
        if pid is None:
            continue  # Orte ohne Q-ID sind erlaubt
        if not qid_pattern.match(pid):
            offenders.append((ste.get("@id"), "@id", pid))
        same = place.get("owl:sameAs", "")
        if same and not same.startswith("http://www.wikidata.org/entity/"):
            offenders.append((ste.get("@id"), "owl:sameAs", same))
    assert not offenders, f"Fehlerhafte Q-ID/sameAs-Shape: {offenders[:5]}"


# ---------------------------------------------------------------------------
# Soft-Coverage
# ---------------------------------------------------------------------------


def test_ste_geo_coverage_soft(graph):
    """Mind. 10 STE tragen geo:lat im atPlace. Reale Coverage haengt an
    der Reconciliation-Abdeckung des Ortsindex; die Schwelle ist bewusst
    konservativ gewaehlt (Stadt-Q-IDs, die zum Testzeitpunkt matched sind:
    Zuerich, Salzburg, Stuttgart, Berlin, Paris, New York, Basel, Linz, Rom, ...).
    Steigende Reconciliation soll die Zahl mit der Zeit wachsen lassen;
    sinkt sie unter 10, ist ein Regress im Patch wahrscheinlich."""
    stes = [n for n in graph if n.get("@type") == "m3gim:SpatiotemporalEvent"]
    if not stes:
        pytest.skip("Keine SpatiotemporalEvents im Graph")

    with_geo = 0
    for ste in stes:
        place = _at_place(ste)
        if place and isinstance(place.get("geo:lat"), (int, float)):
            with_geo += 1

    assert with_geo >= 10, (
        f"Nur {with_geo}/{len(stes)} STE mit geo:lat im atPlace. "
        f"Baseline >=10. Reconciliation-Regress oder Patch kaputt?"
    )
