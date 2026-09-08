"""E-301: source roles remain mentions and imply no agent relationships."""

from _helpers import ensure_list


def _role_label(agent):
    role = agent.get("role")
    return role.get("skos:prefLabel", "") if isinstance(role, dict) else role or ""


def _agents(records):
    for record in records:
        for agent in ensure_list(record.get("m3gim-ontology:hasAssociatedAgent")):
            if isinstance(agent, dict):
                yield agent


def test_source_roles_have_local_carriers_and_rows(records):
    wanted = {"arbeitgeber", "adressat", "auftraggeber", "absender", "empfänger"}
    found = set()
    for agent in _agents(records):
        role = _role_label(agent).lower()
        if role in wanted:
            found.add(role)
            assert isinstance(agent.get("m3gim-ontology:xlsxSource"), dict)
            assert agent.get("m3gim-ontology:recordedRole")
    assert {"arbeitgeber", "adressat", "auftraggeber"}.issubset(found)


def test_source_roles_create_no_agrelon_relationship_or_begin_year(records):
    assert not any(record.get("m3gim-ontology:hasAgentRelation") for record in records)
    assert not any("agrelon:metadataPeriod" in agent for agent in _agents(records))
