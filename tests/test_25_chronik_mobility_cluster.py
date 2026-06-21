"""Mobilitaetssichten-Cluster fuer STE-eventRoles (Session 36, M3).

Das Frontend (docs/js/data/constants.js) haelt ein Mapping
`EVENT_ROLE_TO_MOBILITY_CLUSTER`, das jede empirisch belegte `m3gim:eventRole`
genau einer der fuenf Sichten aus datenmodell.md § 10 zuordnet (oder
explizit auf `null` setzt, wenn neutral).

Dieser Test liest die JS-Konstante via Regex (kein JS-Runtime noetig) und
prueft: jede im aktuellen Datenstand vorkommende `eventRole` hat einen
expliziten Eintrag. Neue eventRoles in den Daten -> bewusste Entscheidung
im Constants-File.
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

    Simple regex parser -- das Mapping hat immer die Form
    `'key': 'value',` oder `'key':  null,`. Kommentare werden ignoriert.
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
    """Jede im aktuellen Datenstand belegte eventRole muss in der Konstante
    stehen. Kein stillschweigendes Fallback."""
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
    """Die fuenf Mobilitaets-Ortsrollen (E-97, MOBILITY_PLACE_ROLES) zaehlen als
    Reise-/Korrespondenzmobilitaet und mappen auf den Cluster 'korrespondenz'
    (datenmodell.md § Ortsrollen/§ 10, Entscheidung E-110, order-m3gim
    2026-06-21 Punkt 1). Lockt die Angleichung gegen stilles Regressieren auf
    'null' ('Nicht klassifiziert')."""
    mapping = _load_event_role_map()
    place_roles = ["zielort", "absendeort", "abreiseort", "empfangsort", "vertragsort"]
    for role in place_roles:
        assert mapping.get(role) == "korrespondenz", (
            f"Mobilitaets-Ortsrolle '{role}' -> '{mapping.get(role)}', "
            "erwartet 'korrespondenz' (E-110)."
        )


def test_mapping_covers_datenmodell_spec_datumsrollen() -> None:
    """Die in datenmodell.md § 5 als Datumsrollen spezifizierten Werte
    sind entweder gemappt oder sollten gemappt sein. Soft-Check: nur die
    empirisch aussichtsreichsten werden hart gefordert."""
    mapping = _load_event_role_map()
    # Must-have Datumsrollen aus § 5 (empirisch bereits belegt oder
    # unmittelbar erwartbar).
    must_have = {
        "absendedatum",
        "empfangsdatum",
        "erscheinungsdatum",
        "ausstellungsdatum",
        "spielzeit",
    }
    missing = must_have - set(mapping.keys())
    assert not missing, (
        "Datumsrollen aus datenmodell.md § 5 nicht gemappt: "
        + ", ".join(sorted(missing))
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
