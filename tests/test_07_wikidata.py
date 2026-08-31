"""Wikidata-Enrichment-Integrität."""

import re
import sys
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).parent.parent / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from transform import load_index  # noqa: E402

from _helpers import iter_entities_with_id  # noqa: E402


Q_PATTERN = re.compile(r"^Q\d+$")

# Die zweite zulaessige Herkunft neben der Reconciliation: kuratierte Q-IDs,
# die das Erschliessungsteam direkt in die Index-Arbeitsmappen eintraegt.
INDEX_NAMES = ("Personenindex", "Organisationsindex", "Ortsindex", "Werkindex")


def _collect_used_qids(records):
    qids = set()
    for r in records:
        for ent in iter_entities_with_id(r):
            aid = ent.get("@id", "")
            if aid.startswith("wd:"):
                qid = aid.replace("wd:", "")
                if Q_PATTERN.match(qid):
                    qids.add(qid)
    return qids


@pytest.fixture(scope="module")
def index_qids() -> set:
    """Kuratierte Q-IDs aus den Index-Arbeitsmappen, ueber den kanonischen
    Pipeline-Reader gelesen (Header-Shift-Korrektur, E-95)."""
    qids = set()
    for name in INDEX_NAMES:
        df = load_index(name)
        if df is None:
            continue
        for col in df.columns:
            if not isinstance(col, str) or "wikidata" not in col.lower():
                continue
            for val in df[col].dropna():
                qid = str(val).strip().removeprefix("wd:")
                if Q_PATTERN.match(qid):
                    qids.add(qid)
    return qids


def test_every_wd_id_in_output_stems_from_reconciliation(
    records, reconciliation, index_qids
):
    """Jede Q-ID im Output hat eine benannte Herkunft: entweder ein Treffer in
    wikidata-reconciliation.json oder eine kuratierte wikidata_id-Zelle eines
    Index-XLSX. Eine Q-ID ohne beides ist erfunden.

    Frueher pruefte der Test nur, dass die Schnittmenge nicht leer ist; eine
    Q-ID im Output, die in keiner Quelle steht, fiel damit nicht auf. Genau
    diese Fehlerklasse hat in Session 34 tragende Datenfehler erzeugt
    (CLAUDE.md, Manuelle Wikidata-Approvals).
    """
    assert reconciliation is not None, (
        "wikidata-reconciliation.json fehlt. Pipeline vollstaendig ausfuehren: "
        "`python scripts/reconcile.py` (oder transform.py mit vorhandener Datei)."
    )
    recon_qids = {m.get("qid") for m in reconciliation.get("matched", []) if m.get("qid")}
    assert recon_qids, "reconciliation.matched ist leer — Pipeline-Regress."
    used_qids = _collect_used_qids(records)
    assert len(used_qids) >= 100, (
        f"Nur {len(used_qids)} Q-IDs im Output — Enrichment hat nichts gezogen."
    )
    unsourced = sorted(used_qids - recon_qids - index_qids)
    assert not unsourced, (
        f"{len(unsourced)} Q-IDs im Output ohne Herkunft in Reconciliation oder "
        f"Index-XLSX: {unsourced[:10]}. Entweder ein manuelles Approval ist "
        f"nicht in wikidata-reconciliation.json gelandet, oder die Q-ID ist "
        f"erfunden (siehe scripts/verify-manual-approvals.py)."
    )


def test_enrichment_properties_well_typed(records):
    offenders = []
    for r in records:
        for ent in iter_entities_with_id(r):
            lat = ent.get("geo:lat")
            lon = ent.get("geo:long")
            if lat is not None:
                if not isinstance(lat, (int, float)) or not -90 <= lat <= 90:
                    offenders.append((r["@id"], "geo:lat", lat))
            if lon is not None:
                if not isinstance(lon, (int, float)) or not -180 <= lon <= 180:
                    offenders.append((r["@id"], "geo:long", lon))

            bd = ent.get("schema:birthDate")
            if bd is not None:
                if not isinstance(bd, str) or not re.match(r"^-?\d{3,4}", bd):
                    offenders.append((r["@id"], "schema:birthDate", bd))
    assert not offenders, f"Enrichment-Typ-Fehler: {offenders[:5]}"


def test_voice_type_is_string_not_list_object(records):
    """m3gim-ontology:voiceType wird in transform.py auf erstes label reduziert — kein dict/list im Output."""
    offenders = []
    for r in records:
        for ent in iter_entities_with_id(r):
            vt = ent.get("m3gim-ontology:voiceType")
            if vt is not None and not isinstance(vt, str):
                offenders.append((r["@id"], vt))
    assert not offenders, f"voiceType nicht als String: {offenders[:3]}"


def test_occupation_is_list_of_strings(records):
    """gndo:professionOrOccupationAsLiteral ist Liste von Strings (Labels)."""
    offenders = []
    for r in records:
        for ent in iter_entities_with_id(r):
            occ = ent.get("gndo:professionOrOccupationAsLiteral")
            if occ is None:
                continue
            if not isinstance(occ, list):
                offenders.append((r["@id"], "not-list", occ))
                continue
            for item in occ:
                if not isinstance(item, str):
                    offenders.append((r["@id"], "item-not-str", item))
    assert not offenders, f"occupation-Struktur: {offenders[:3]}"
