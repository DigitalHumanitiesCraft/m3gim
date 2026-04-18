"""Wikidata-Enrichment-Integrität."""

import re

import pytest

from _helpers import iter_entities_with_id


Q_PATTERN = re.compile(r"^Q\d+$")


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


def test_every_wd_id_in_output_stems_from_reconciliation(records, reconciliation):
    """Jede Q-ID im Output kommt aus wikidata-reconciliation.json ODER direkt
    aus Indizes. Nach einem regulaeren Pipeline-Lauf existiert die Datei
    immer; Fehlen ist ein Fehler, kein Skip-Grund.
    """
    assert reconciliation is not None, (
        "wikidata-reconciliation.json fehlt. Pipeline vollstaendig ausfuehren: "
        "`python scripts/reconcile.py` (oder transform.py mit vorhandener Datei)."
    )
    recon_qids = {m.get("qid") for m in reconciliation.get("matched", []) if m.get("qid")}
    used_qids = _collect_used_qids(records)
    overlap = used_qids & recon_qids
    assert recon_qids, "reconciliation.matched ist leer — Pipeline-Regress."
    assert overlap, "Keine Q-IDs aus reconciliation im Output — Enrichment hat nichts gezogen."


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

            bd = ent.get("m3gim:birthDate")
            if bd is not None:
                if not isinstance(bd, str) or not re.match(r"^-?\d{3,4}", bd):
                    offenders.append((r["@id"], "m3gim:birthDate", bd))
    assert not offenders, f"Enrichment-Typ-Fehler: {offenders[:5]}"


def test_voice_type_is_string_not_list_object(records):
    """m3gim:voiceType wird in transform.py auf erstes label reduziert — kein dict/list im Output."""
    offenders = []
    for r in records:
        for ent in iter_entities_with_id(r):
            vt = ent.get("m3gim:voiceType")
            if vt is not None and not isinstance(vt, str):
                offenders.append((r["@id"], vt))
    assert not offenders, f"voiceType nicht als String: {offenders[:3]}"


def test_occupation_is_list_of_strings(records):
    """m3gim:occupation ist Liste von Strings (Labels)."""
    offenders = []
    for r in records:
        for ent in iter_entities_with_id(r):
            occ = ent.get("m3gim:occupation")
            if occ is None:
                continue
            if not isinstance(occ, list):
                offenders.append((r["@id"], "not-list", occ))
                continue
            for item in occ:
                if not isinstance(item, str):
                    offenders.append((r["@id"], "item-not-str", item))
    assert not offenders, f"occupation-Struktur: {offenders[:3]}"
