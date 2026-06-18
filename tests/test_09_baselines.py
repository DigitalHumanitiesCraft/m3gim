"""Regression-Baselines: Mindestwerte aus fixtures/baseline_counts.json.

Alle Checks verwenden `>=`, nicht `==` — Wachstum erlaubt, Schrumpfung nicht."""

from _helpers import ensure_list, iter_entities_with_id


def _count_unique_names_by_type(records, prop, type_filter):
    names = set()
    for r in records:
        for ent in ensure_list(r.get(prop)):
            if isinstance(ent, dict) and ent.get("@type") == type_filter:
                name = ent.get("name")
                if name:
                    names.add(name)
    return len(names)


def _count_relations(records):
    total = 0
    for r in records:
        for prop in ("m3gim:hasAssociatedAgent", "rico:hasOrHadLocation",
                     "rico:hasOrHadSubject", "m3gim:hasPerformance",
                     # E-102: das abgeschaffte m3gim:eventDate ist in
                     # m3gim:hasDatedEvent (DatedEvent-Fallback) aufgegangen;
                     # ort,datum-Daten leben (dedupliziert) im STE.
                     "m3gim:hasDatedEvent", "m3gim:hasSpatiotemporalEvent"):
            total += len(ensure_list(r.get(prop)))
    return total


def _count_wd_matches(records):
    wd = set()
    for r in records:
        for ent in iter_entities_with_id(r):
            aid = ent.get("@id", "")
            if aid.startswith("wd:Q"):
                wd.add(aid)
    return len(wd)


def test_records_count_baseline(records, baseline):
    assert len(records) >= baseline["records_min"]


def test_konvolute_count_baseline(konvolute, baseline):
    assert len(konvolute) >= baseline["konvolute_min"]


def test_persons_count_baseline(records, baseline):
    # Personen kommen aus Agents UND Subjects (erwähnt)
    names = set()
    for r in records:
        for ent in ensure_list(r.get("m3gim:hasAssociatedAgent")):
            if isinstance(ent, dict) and ent.get("@type") == "rico:Person":
                if ent.get("name"):
                    names.add(ent["name"])
        for ent in ensure_list(r.get("rico:hasOrHadSubject")):
            if isinstance(ent, dict) and ent.get("@type") == "rico:Person":
                if ent.get("name"):
                    names.add(ent["name"])
    assert len(names) >= baseline["persons_min"], (
        f"Nur {len(names)} Personen, erwartet >= {baseline['persons_min']}"
    )


def test_organizations_count_baseline(records, baseline):
    names = set()
    for r in records:
        for ent in ensure_list(r.get("m3gim:hasAssociatedAgent")):
            if isinstance(ent, dict) and ent.get("@type") in ("rico:CorporateBody", "rico:Group"):
                if ent.get("name"):
                    names.add(ent["name"])
    assert len(names) >= baseline["organizations_min"]


def test_locations_count_baseline(records, baseline):
    n = _count_unique_names_by_type(records, "rico:hasOrHadLocation", "rico:Place")
    assert n >= baseline["locations_min"]


def test_works_count_baseline(records, baseline):
    n = _count_unique_names_by_type(records, "rico:hasOrHadSubject", "m3gim:MusicalWork")
    assert n >= baseline["works_min"]


def test_verknuepfungen_count_baseline(records, baseline):
    assert _count_relations(records) >= baseline["verknuepfungen_min"]


def test_wd_matches_count_baseline(records, baseline):
    assert _count_wd_matches(records) >= baseline["wd_matches_min"]


def test_partitur_auftritte_count_baseline(partitur, baseline):
    assert len(partitur["auftritte"]) >= baseline["partitur_auftritte_min"]


def test_partitur_lebensphasen_count_exact(partitur, baseline):
    assert len(partitur["lebensphasen"]) == baseline["partitur_lebensphasen_exact"]


def test_partitur_mobilitaet_count_baseline(partitur, baseline):
    assert len(partitur["mobilitaet"]) >= baseline["partitur_mobilitaet_min"]
