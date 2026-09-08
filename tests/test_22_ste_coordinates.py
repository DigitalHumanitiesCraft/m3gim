"""Coordinate patch for SpatiotemporalEvents (session 33, milestone mobility atlas).

Precondition for the mobility-atlas tab: every Verortung whose place resolves
against the Ortsindex carries in its m3gim-ontology:atPlace sub-object

    @id       : wd:Qxxx
    owl:sameAs: http://www.wikidata.org/entity/Qxxx
    geo:lat   : <float>
    geo:long  : <float>
    m3gim-ontology:country: <Label>   (if present in the Wikidata property P17)

Analogous to the enrichment of regular rico:Place entries in
scripts/transform.py (_inject_enrichment, l. 954-962).

Anchors: cities with a Q-ID from data/output/wikidata-reconciliation.json
(Zurich Q72, Salzburg Q34713). Vienna/Munich/Bayreuth are still unmatched and
stay without coordinates after the patch (reconciliation gap, not a pipeline
bug).
"""

import pytest


ANCHOR_STES = [
    # (record prefix of the STE @id, expected Q-ID, expected city name)
    # Anchored on the NIM_004_24 Folio (Zurich, Salzburg). The STE @ids carry a
    # GLOBAL counter that jumps on every STE change (most recently E-97 mobility
    # STE), so anchor via (record prefix, place name) instead of the exact @id,
    # otherwise the test breaks on every STE increase.
    ("m3gim-data:ev_NIM_004_24_", "wd:Q72",    "Zürich"),
    ("m3gim-data:ev_NIM_004_24_", "wd:Q34713", "Salzburg"),
]


def _anchor_ste(graph, id_prefix, expected_name):
    """Find the STE on the anchor record (@id prefix) whose atPlace name matches,
    stable against shifts of the global STE counter."""
    for n in graph:
        if (n.get("@type") == "m3gim-ontology:Annotation"
                and str(n.get("@id", "")).startswith(id_prefix)):
            p = n.get("m3gim-ontology:atPlace")
            if isinstance(p, dict) and p.get("name") == expected_name:
                return n
    return None


def _at_place(ste):
    p = ste.get("m3gim-ontology:atPlace")
    return p if isinstance(p, dict) else None


# ---------------------------------------------------------------------------
# Anchor asserts (guard the STE coordinate patch from session 33)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("id_prefix,expected_qid,expected_name", ANCHOR_STES)
def test_anchor_ste_has_wikidata_id(graph, id_prefix, expected_qid, expected_name):
    """Anchor STE carries @id + owl:sameAs to Wikidata in the atPlace sub-object."""
    ste = _anchor_ste(graph, id_prefix, expected_name)
    assert ste is not None, (
        f"Anker-STE {expected_name!r} auf {id_prefix!r} fehlt im Graph. "
        f"Pipeline-Regression oder Fixture pflegen."
    )
    ste_id = ste.get("@id")
    place = _at_place(ste)
    assert place is not None, f"{ste_id}: m3gim-ontology:atPlace fehlt oder ist kein Objekt"
    assert place.get("name") == expected_name, (
        f"{ste_id}: Ort={place.get('name')!r}, erwartet {expected_name!r}"
    )
    assert "m3gim-ontology:authorityReference" not in place
    assert "@id" not in place and "owl:sameAs" not in place


@pytest.mark.parametrize("id_prefix,expected_qid,expected_name", ANCHOR_STES)
def test_anchor_ste_has_coordinates(graph, id_prefix, expected_qid, expected_name):
    """Anchor STE carries geo:lat + geo:long as float in the atPlace sub-object."""
    ste = _anchor_ste(graph, id_prefix, expected_name)
    assert ste is not None, f"Anker-STE {expected_name!r} auf {id_prefix!r} fehlt"
    place = _at_place(ste)
    assert place is not None, f"{expected_name}: m3gim-ontology:atPlace fehlt"

    lat = place.get("geo:lat")
    lon = place.get("geo:long")
    assert lat is None and lon is None


# ---------------------------------------------------------------------------
# Shape assertion
# ---------------------------------------------------------------------------


def test_ste_place_wd_id_shape(graph):
    """Where @id is set in atPlace, it matches ^wd:Q\\d+$ and owl:sameAs fits."""
    import re
    qid_pattern = re.compile(r"^wd:Q\d+$")
    offenders = []
    for ste in (n for n in graph if n.get("@type") == "m3gim-ontology:Annotation"):
        place = _at_place(ste)
        if not place:
            continue
        pid = place.get("@id")
        if pid is None:
            continue  # places without a Q-ID are allowed
        if not qid_pattern.match(pid):
            offenders.append((ste.get("@id"), "@id", pid))
        same = place.get("owl:sameAs", "")
        if same and not same.startswith("http://www.wikidata.org/entity/"):
            offenders.append((ste.get("@id"), "owl:sameAs", same))
    assert not offenders, f"Fehlerhafte Q-ID/sameAs-Shape: {offenders[:5]}"


# ---------------------------------------------------------------------------
# Soft coverage
# ---------------------------------------------------------------------------


def test_ste_geo_coverage_soft(graph):
    """At least 10 STE carry geo:lat in atPlace. Real coverage depends on the
    reconciliation coverage of the Ortsindex; the threshold is deliberately
    conservative (city Q-IDs matched at test time: Zurich, Salzburg, Stuttgart,
    Berlin, Paris, New York, Basel, Linz, Rome, ...). Growing reconciliation
    should let the number rise over time; if it drops below 10 a regression in
    the patch is likely."""
    stes = [n for n in graph if n.get("@type") == "m3gim-ontology:Annotation"]
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
