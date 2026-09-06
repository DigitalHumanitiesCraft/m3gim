"""Mobility-view cluster for STE eventRoles (session 36, M3).

The frontend (docs/js/data/constants.js) holds a mapping
`EVENT_ROLE_TO_MOBILITY_CLUSTER` that assigns every empirically attested
`m3gim:eventRole` to exactly one of the five views from data-model.md § Mobility perspectives (or
explicitly sets it to `null` when neutral).

This test reads the JS constant via regex (no JS runtime needed) and checks that
every `eventRole` occurring in the current data has an explicit entry. New
eventRoles in the data force a deliberate decision in the constants file.

The test deliberately reads the frontend data source `docs/data/m3gim.jsonld`
and not the pipeline output: it checks the constant against exactly the data the
frontend loads. Both move to the new terms together with the frontend step of
the model rebuild.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
JSONLD_PATH = REPO_ROOT / "docs" / "data" / "m3gim.jsonld"
CONSTANTS_PATH = REPO_ROOT / "docs" / "js" / "data" / "constants.js"

VALID_CLUSTERS = {
    "performativ",
    "institutionell",
    "korrespondenz",
    "diskursiv",
    "biografisch",
}


def _load_event_role_map() -> dict[str, str | None]:
    """Parse EVENT_ROLE_TO_MOBILITY_CLUSTER from constants.js.

    Simple regex parser -- the mapping always has the form `'key': 'value',` or
    `'key':  null,`. Comments are ignored.
    """
    source = CONSTANTS_PATH.read_text(encoding="utf-8")
    m = re.search(
        r"EVENT_ROLE_TO_MOBILITY_CLUSTER\s*=\s*\{([^}]*)\}",
        source,
        re.DOTALL,
    )
    assert m, "EVENT_ROLE_TO_MOBILITY_CLUSTER nicht in constants.js gefunden"
    body = m.group(1)
    mapping: dict[str, str | None] = {}
    for line in body.splitlines():
        line = line.split("//", 1)[0].strip()
        if not line:
            continue
        entry = re.match(r"'([^']+)'\s*:\s*([^,]+),?", line)
        if not entry:
            continue
        key = entry.group(1).lower()
        raw_val = entry.group(2).strip()
        if raw_val == "null":
            mapping[key] = None
        else:
            mapping[key] = raw_val.strip("'\" ")
    return mapping


def _collect_event_roles() -> Counter:
    data = json.loads(JSONLD_PATH.read_text(encoding="utf-8"))
    roles: Counter = Counter()
    for node in data.get("@graph", []):
        types = node.get("@type")
        if not types:
            continue
        type_str = "|".join(types) if isinstance(types, list) else str(types)
        if "SpatiotemporalEvent" not in type_str:
            continue
        role = node.get("m3gim:eventRole")
        if role:
            roles[role.lower()] += 1
    return roles


def test_every_cluster_value_is_valid_or_null() -> None:
    mapping = _load_event_role_map()
    for role, cluster in mapping.items():
        if cluster is None:
            continue
        assert cluster in VALID_CLUSTERS, (
            f"eventRole '{role}' -> Cluster '{cluster}' ist nicht in "
            f"{sorted(VALID_CLUSTERS)}"
        )


def test_every_empirical_event_role_is_mapped() -> None:
    """Every eventRole attested in the current data must be in the constant. No
    silent fallback."""
    mapping = _load_event_role_map()
    empirical = _collect_event_roles()
    missing = [r for r in empirical if r not in mapping]
    assert not missing, (
        "Nicht gemappte eventRole(n) im Datenstand: "
        + ", ".join(sorted(missing))
        + ". Eintrag in EVENT_ROLE_TO_MOBILITY_CLUSTER ergaenzen "
        "(auch null ist eine gueltige Entscheidung)."
    )


def test_place_roles_count_as_reise_korrespondenz() -> None:
    """The five mobility place roles (E-97, MOBILITY_PLACE_ROLES) count as
    travel/correspondence mobility and map to the cluster 'korrespondenz'
    (data.md § Role values, data-model.md § Mobility perspectives, decision E-110, order-m3gim 2026-06-21 point 1).
    Locks the alignment against a silent regression to 'null' ('Nicht
    klassifiziert')."""
    mapping = _load_event_role_map()
    place_roles = ["zielort", "absendeort", "abreiseort", "empfangsort", "vertragsort"]
    for role in place_roles:
        assert mapping.get(role) == "korrespondenz", (
            f"Mobilitaets-Ortsrolle '{role}' -> '{mapping.get(role)}', "
            "erwartet 'korrespondenz' (E-110)."
        )


def test_mapping_covers_datenmodell_spec_datumsrollen() -> None:
    """The values specified in data.md § Role values as date roles are either mapped or
    should be mapped. Soft check: only the empirically most likely are required
    hard."""
    mapping = _load_event_role_map()
    # Must-have date roles from § Role values (already attested empirically or immediately
    # expectable).
    must_have = {
        "absendedatum",
        "empfangsdatum",
        "erscheinungsdatum",
        "ausstellungsdatum",
        "spielzeit",
    }
    missing = must_have - set(mapping.keys())
    assert not missing, (
        "Datumsrollen aus data.md § Role values nicht gemappt: "
        + ", ".join(sorted(missing))
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
