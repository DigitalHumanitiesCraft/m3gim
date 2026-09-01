"""JSON schema validation for m3gim.jsonld.

Well-formedness and resolvability of the Dokumenttyp hierarchy used to be
asserted here a second time and now lives solely in
test_06_frontend_contract.test_dft_hierarchy_concepts_resolve, which states
the same claims more strictly (minimum concept count, non-dict broader also
flagged, record references without prefix filter).
"""

import json
from pathlib import Path

import jsonschema
import pytest

SCHEMA_DIR = Path(__file__).parent / "schemas"


@pytest.fixture(scope="module")
def jsonld_schema():
    with open(SCHEMA_DIR / "m3gim_jsonld.schema.json", encoding="utf-8") as f:
        return json.load(f)


def test_jsonld_valid_against_schema(jsonld, jsonld_schema):
    jsonschema.validate(jsonld, jsonld_schema)
