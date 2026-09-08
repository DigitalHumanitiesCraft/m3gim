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
    assert link_only_names, "Kein manuell freigegebener Ort außerhalb des Index"
    missing = sorted({
        f"{name} ({qid})"
        for name, qid in resolved_names.items()
        for node in places_by_name[name]
        if node.get("m3gim-ontology:authorityReference") != {"@id": f"wd:{qid}"}
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
    assert with_coordinates, "Keine freigegebene Ortskennung mit Koordinaten im Cache"
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
            str((node.get("m3gim-ontology:authorityReference") or {}).get("@id", "")).removeprefix("wd:"), {}
        ).get("properties", {})
    ]
    assert enriched, "Keine Ortsnennung mit freigegebener Koordinate im Cache"
    missing = sorted({
        node.get("name") for node in enriched
        if not isinstance(node.get("geo:lat"), (int, float))
        or not isinstance(node.get("geo:long"), (int, float))
    })
    assert not missing, (
        f"Enriched place nodes without coordinates: {missing[:10]}"
    )


def test_unapproved_anchor_place_carries_no_authority_claim(records, approved_locations):
    """A formerly automatic place candidate remains a literal source mention."""
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
    assert ANCHOR_PLACE.lower() not in approved_locations
    assert "m3gim-ontology:authorityReference" not in place
    assert "geo:lat" not in place and "geo:long" not in place
