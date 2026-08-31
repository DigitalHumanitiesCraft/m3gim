"""Term-Konformitaets-Lock: jeder rico:/ric-rst:/agrelon:/schema:/gndo:-Term im
Output muss in der kuratierten Allowlist stehen, die gegen die offiziellen
Termlisten belegt ist (architecture-decisions.md E-103/E-104/E-105).

Faengt die Fehlerklasse "Term aus der Benennungskonvention extrapoliert"
(Leitplanke 'Fremdterme verifizieren'): rico:isAssociatedWithRecord (existiert
nicht), rico:File/rico:Fonds als Klasse (sind recordSetTypes-Werte),
agrelon:hasProvenance/hasConfidenceValue/hasValidityPeriod (heissen metadata*),
agrelon:HasIsPatron (heisst IsHasPatron). Ein nicht gelisteter Term failt hart —
entweder ist er falsch (korrigieren) oder die Allowlist ist gegen die offizielle
Quelle nachzupflegen, nie aus dem Kopf.

Die Allowlist ist bewusst die Menge der tatsaechlich genutzten, verifizierten
Terme (plus naher verifizierter Reserve), nicht die Voll-Ontologie: so faellt
jeder neu eingefuehrte Fremdterm auf, bis er belegt nachgetragen wird.
"""

import json
from pathlib import Path

import pytest

ALLOWLIST_PATH = Path(__file__).parent / "fixtures" / "rico_agrelon_allowlist.json"

# Nur diese Namespaces beanspruchen externe Konformitaet und werden geprueft.
# Die drei Projekt-Namensraeume (eigen) und geo:/owl:/skos:/xsd:/wd:
# (Standard, unstrittig) sind ausgenommen.
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
    """Sammelt alle prefixed Terme: Property-Keys + @type-/@id-Werte."""
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
    """Jeder verwendete rico:/ric-rst:/agrelon:/schema:/gndo:-Term ist belegt.

    Deckt die bekannten Fehlterme des Audits mit ab: keiner von ihnen steht in
    der Allowlist, ihre Rueckkehr faellt hier also zwingend auf. Der frueher
    danebenstehende test_known_wrong_terms_absent konnte deshalb nie rot
    werden, ohne dass dieser Test bereits rot war.
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

