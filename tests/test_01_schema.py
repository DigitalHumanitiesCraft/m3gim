"""JSON-Schema-Validierung für m3gim.jsonld.

Die Wohlgeformtheit und Aufloesbarkeit der Dokumenttyp-Hierarchie stand
hier ein zweites Mal und liegt seither allein in
test_06_frontend_contract.test_dft_hierarchy_concepts_resolve, das die
gleichen Aussagen schaerfer fasst (Mindestzahl der Concepts, broader auch
als Nicht-Dict beanstandet, Record-Referenzen ohne Praefixfilter).
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
