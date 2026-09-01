"""Term conformance lock: every rico:/ric-rst:/agrelon:/schema:/gndo: term in the
output must be in the curated allowlist, which is backed against the official
term lists (journal.md E-103/E-104/E-105).

Catches the error class "term extrapolated from the naming convention"
(guardrail 'verify foreign terms'): rico:isAssociatedWithRecord (does not
exist), rico:File/rico:Fonds as a class (they are recordSetTypes values),
agrelon:hasProvenance/hasConfidenceValue/hasValidityPeriod (named metadata*),
agrelon:HasIsPatron (named IsHasPatron). A non-listed term fails hard, either it
is wrong (correct it) or the allowlist must be extended against the official
source, never from memory.

The allowlist is deliberately the set of actually used, verified terms (plus a
close verified reserve), not the full ontology: this way every newly introduced
foreign term stands out until it is added with a source.
"""

import json
from pathlib import Path

import pytest

ALLOWLIST_PATH = Path(__file__).parent / "fixtures" / "rico_agrelon_allowlist.json"

# Only these namespaces claim external conformance and are checked. The three
# project namespaces (own) and geo:/owl:/skos:/xsd:/wd: (standard,
# uncontroversial) are exempt.
VALIDATED_PREFIXES = ("rico:", "ric-rst:", "agrelon:", "schema:", "gndo:")


@pytest.fixture(scope="session")
def allowlist() -> set:
    with open(ALLOWLIST_PATH, encoding="utf-8") as f:
        data = json.load(f)
    allowed = set()
    for ns, terms in data.items():
        if ns.startswith("_"):
            continue
        allowed.update(terms)
    return allowed


def _collect_terms(node, used: set):
    """Collect all prefixed terms: property keys + @type/@id values."""
    if isinstance(node, dict):
        for key, value in node.items():
            if isinstance(key, str) and key.startswith(VALIDATED_PREFIXES):
                used.add(key)
            if key in ("@type", "@id") and isinstance(value, str) \
                    and value.startswith(VALIDATED_PREFIXES):
                used.add(value)
            _collect_terms(value, used)
    elif isinstance(node, list):
        for item in node:
            _collect_terms(item, used)


def test_all_external_terms_in_allowlist(graph, allowlist):
    """Every used rico:/ric-rst:/agrelon:/schema:/gndo: term is backed.

    Also covers the known wrong terms of the audit: none of them is in the
    allowlist, so their return necessarily surfaces here. The formerly adjacent
    test_known_wrong_terms_absent could therefore never turn red without this
    test already being red.
    """
    used = set()
    _collect_terms(graph, used)
    offenders = sorted(t for t in used if t not in allowlist)
    assert not offenders, (
        f"{len(offenders)} nicht gelistete externe Terme im Output: {offenders}. "
        "Entweder Fehlterm (korrigieren) oder Allowlist gegen die offizielle "
        "Quelle nachpflegen (tests/fixtures/rico_agrelon_allowlist.json) — "
        "nie aus der Benennungskonvention raten (E-103/E-104)."
    )

