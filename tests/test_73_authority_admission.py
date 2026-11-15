"""Only person-approved authority matches reach the dataset (E-74, E-301).

The interface marks Wikidata values as supplemented but not as unchecked,
which holds only while no automatic match is admitted. This check fails as
soon as an exact, alias or fuzzy match passes without manual approval, or
the shipped dataset carries a Q-identifier that the reconciliation only
matched automatically.
"""

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from _common import is_approved_match  # noqa: E402


@pytest.mark.parametrize("kind", ["exact", "alias", "fuzzy_high", "fuzzy_low"])
def test_automatic_match_is_held_back(kind):
    assert not is_approved_match({"match": kind, "confidence": 100})
    assert is_approved_match({"match": kind, "manual_review": "approved"})


def test_shipped_dataset_carries_no_automatic_only_identifier():
    recon = json.loads((ROOT / "data/output/wikidata-reconciliation.json").read_text(encoding="utf-8"))
    approved = {m["qid"] for m in recon["matched"] if is_approved_match(m)}
    automatic = {m["qid"] for m in recon["matched"] if not is_approved_match(m)} - approved
    assert automatic, "the reconciliation holds automatic matches; otherwise this check proves nothing"
    shipped = (ROOT / "docs/data/m3gim.jsonld").read_text(encoding="utf-8")
    leaked = sorted(q for q in automatic if f'"wd:{q}"' in shipped or f"/entity/{q}\"" in shipped)
    # A curated index column could carry the same identifier as a source
    # value; none does today, so any hit is reported for inspection.
    assert not leaked, f"automatic-only identifiers in the shipped dataset: {leaked[:10]}"
