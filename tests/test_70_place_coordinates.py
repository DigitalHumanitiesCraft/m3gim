"""Invariant: a place carries in the dataset what the authority files attest.

Two ways lost a resolved place its identifier and with it its coordinates, so
that the Karte could not draw it. Since E-255 the place branch of the
reconciliation reads the place names of the Verknuepfungstabelle beside the
place index, and the assignment ran through the place index alone, so exactly
those places arrived without identifier (AF-07 in
data/reports/reconciliation-register.md). And the place half of an
"ort, datum" composite looked itself up under the raw cell "Wien, 1957-09-07",
which matches no place name, while the annotation node of the same row carried
its coordinates.

The claims are derived from the authority files instead of a hardcoded list:
an approved match reaches every place node of that name, and a place node whose
identifier the enrichment carries coordinates for carries them, whichever source
named the place.

Spec: knowledge/data.md § Naming conventions and place duplicates,
data/reports/reconciliation-register.md § Orte ohne Kennung.
"""

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from _common import is_approved_match  # noqa: E402
from transform import build_index_lookup, load_index  # noqa: E402

# The two properties whose value is a place sub-object; both are enriched from
# the same lookup in transform.py.
PLACE_KEYS = ("rico:hasOrHadLocation", "m3gim-ontology:atPlace")

# Lower bound at the data state of 2026-09-05 (measured: 23 place names that
# only the Verknuepfungstabelle carries and the reconciliation resolved). It
# keeps the test from passing on the place index alone.
MIN_LINK_ONLY_PLACES = 20

# Lower bound for the whole-dataset contract, well below the measured coverage.
MIN_ENRICHED_PLACE_NODES = 200

# The anchor of the objective: the performance place of a link row whose record
# has no place column of its own.
ANCHOR_RECORD = "UAKUG/NIM_023 5"
ANCHOR_PLACE = "Wuppertal"


def _place_nodes(node, out=None):
    """Every place sub-object of the graph, nested ones included."""
    if out is None:
        out = []
    if isinstance(node, dict):
        for key, value in node.items():
            if key in PLACE_KEYS:
                for item in (value if isinstance(value, list) else [value]):
                    if isinstance(item, dict):
                        out.append(item)
            _place_nodes(value, out)
    elif isinstance(node, list):
        for item in node:
            _place_nodes(item, out)
    return out


def _by_name(nodes):
    grouped = {}
    for node in nodes:
        name = (node.get("name") or "").strip().lower()
        if name:
            grouped.setdefault(name, []).append(node)
    return grouped


@pytest.fixture(scope="module")
def places_by_name(graph):
    return _by_name(_place_nodes(graph))


@pytest.fixture(scope="module")
def approved_locations(reconciliation_path):
    """name -> Q-ID for every approved place match, first match wins."""
    with open(reconciliation_path, encoding="utf-8") as f:
        data = json.load(f)
    matches = {}
    for match in data.get("matched", []):
        if match.get("type") != "location" or not is_approved_match(match):
            continue
        matches.setdefault(match["name"].strip().lower(), match["qid"])
    return matches


@pytest.fixture(scope="module")
def enrichment(enrichment_path):
    with open(enrichment_path, encoding="utf-8") as f:
        return json.load(f).get("entities", {})


@pytest.fixture(scope="module")
def place_index():
    return build_index_lookup(load_index("Ortsindex"))


@pytest.fixture(scope="module")
def resolved_names(approved_locations, places_by_name, place_index):
    """Place names the dataset uses and an approved match resolves.

    A name the index marks ambiguous stays out: there the pipeline withholds
    the identifier on purpose, because it would come from an arbitrary one of
    the candidates (E-152).
    """
    return {
        name: qid for name, qid in approved_locations.items()
        if name in places_by_name and not place_index.get(name, {}).get("ambiguous")
    }


@pytest.fixture(scope="module")
def link_only_names(resolved_names, place_index):
    """Of those, the names the place index does not carry."""
    return {name: qid for name, qid in resolved_names.items()
            if name not in place_index}


def test_resolved_places_carry_their_identifier(resolved_names, link_only_names,
                                                places_by_name):
    """Every place node of a resolved name carries the attested Q-ID.

    Two ways lost it: a name with no index row, and the place half of an
    "ort, datum" composite, whose lookup ran on the raw cell.
    """
    assert len(link_only_names) >= MIN_LINK_ONLY_PLACES, (
        f"Only {len(link_only_names)} resolved place names outside the place "
        f"index, expected at least {MIN_LINK_ONLY_PLACES}. Reconciliation "
        "shrunk or the source moved the names into the index?"
    )
    missing = sorted({
        f"{name} ({qid})"
        for name, qid in resolved_names.items()
        for node in places_by_name[name]
        if node.get("@id") != f"wd:{qid}"
    })
    assert not missing, (
        f"Place nodes without the attested identifier: {missing[:10]}"
    )


def test_resolved_places_carry_their_coordinates(resolved_names, link_only_names,
                                                 places_by_name, enrichment):
    """Coordinates reach the place, whichever source named it."""
    def has_coordinates(qid):
        return "coordinates" in enrichment.get(qid, {}).get("properties", {})

    with_coordinates = {name: qid for name, qid in resolved_names.items()
                        if has_coordinates(qid)}
    link_only_with_coordinates = [name for name, qid in link_only_names.items()
                                  if has_coordinates(qid)]
    assert len(link_only_with_coordinates) >= MIN_LINK_ONLY_PLACES, (
        f"Only {len(link_only_with_coordinates)} of {len(link_only_names)} "
        "place names outside the index carry coordinates in the enrichment"
    )
    missing = sorted({
        name for name in with_coordinates
        for node in places_by_name[name]
        if not isinstance(node.get("geo:lat"), (int, float))
        or not isinstance(node.get("geo:long"), (int, float))
    })
    assert not missing, f"Place nodes without coordinates: {missing[:10]}"


def test_every_enriched_place_carries_its_coordinates(graph, enrichment):
    """The whole-dataset contract, independent of where the name came from."""
    nodes = _place_nodes(graph)
    enriched = [
        node for node in nodes
        if "coordinates" in enrichment.get(
            str(node.get("@id", "")).removeprefix("wd:"), {}
        ).get("properties", {})
    ]
    assert len(enriched) >= MIN_ENRICHED_PLACE_NODES, (
        f"Only {len(enriched)} place nodes with an enriched identifier, "
        f"expected at least {MIN_ENRICHED_PLACE_NODES}"
    )
    missing = sorted({
        node.get("name") for node in enriched
        if not isinstance(node.get("geo:lat"), (int, float))
        or not isinstance(node.get("geo:long"), (int, float))
    })
    assert not missing, (
        f"Enriched place nodes without coordinates: {missing[:10]}"
    )


def test_anchor_record_place_carries_coordinates(records):
    """The case of the assignment, a link-table place on a folio record."""
    record = next(
        (r for r in records if r.get("rico:identifier") == ANCHOR_RECORD), None)
    assert record is not None, f"Anchor record {ANCHOR_RECORD} missing"
    locations = record.get("rico:hasOrHadLocation") or []
    if isinstance(locations, dict):
        locations = [locations]
    place = next(
        (p for p in locations if p.get("name") == ANCHOR_PLACE), None)
    assert place is not None, (
        f"{ANCHOR_RECORD}: place {ANCHOR_PLACE} missing"
    )
    assert isinstance(place.get("geo:lat"), (int, float)), (
        f"{ANCHOR_RECORD}/{ANCHOR_PLACE}: geo:lat={place.get('geo:lat')!r}"
    )
    assert isinstance(place.get("geo:long"), (int, float)), (
        f"{ANCHOR_RECORD}/{ANCHOR_PLACE}: geo:long={place.get('geo:long')!r}"
    )
