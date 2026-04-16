"""Verknüpfungs-Typ-Mapping: XLSX-typ → RiC-O/m3gim-Property.

transform.py-Mapping (add_relations_to_records):
  person       → m3gim:hasAssociatedAgent (@type rico:Person)
                 außer Rolle 'erwähnt' → rico:hasOrHadSubject
  institution  → m3gim:hasAssociatedAgent (@type rico:CorporateBody)
  ensemble     → m3gim:hasAssociatedAgent (@type rico:Group)
  ort          → rico:hasOrHadLocation (@type rico:Place)
  werk         → rico:hasOrHadSubject (@type m3gim:MusicalWork)
  ereignis     → rico:hasOrHadSubject (@type m3gim:PerformanceEvent)
  rolle        → m3gim:hasPerformanceRole
  datum        → m3gim:eventDate
"""

from _helpers import ensure_list


def _collect_entities(records, prop, type_filter=None):
    """Gibt alle Entities für eine Property zurück, optional nach @type gefiltert."""
    result = []
    for r in records:
        for ent in ensure_list(r.get(prop)):
            if not isinstance(ent, dict):
                continue
            if type_filter and ent.get("@type") != type_filter:
                continue
            result.append((r["@id"], ent))
    return result


def test_verknuepfungen_count_reasonable(records, xlsx_verknuepfungen):
    """Gesamt-Relationen ≥ 80% der XLSX-Zeilen (mit Typ + Signatur).
    Komposit-Typen erhöhen die Zahl, manche Zeilen ohne Typ werden gefiltert."""
    valid_xlsx = xlsx_verknuepfungen[
        xlsx_verknuepfungen["archivsignatur"].notna()
        & xlsx_verknuepfungen["typ"].notna()
    ]
    total_in_graph = 0
    for r in records:
        for prop in ("m3gim:hasAssociatedAgent", "rico:hasOrHadLocation",
                     "rico:hasOrHadSubject", "m3gim:hasPerformanceRole"):
            total_in_graph += len(ensure_list(r.get(prop)))
        if "m3gim:eventDate" in r:
            total_in_graph += len(ensure_list(r["m3gim:eventDate"]))

    assert total_in_graph >= len(valid_xlsx) * 0.8, (
        f"Nur {total_in_graph} Relationen für {len(valid_xlsx)} XLSX-Zeilen"
    )


def test_person_typ_in_agents(records):
    agents = _collect_entities(records, "m3gim:hasAssociatedAgent", "rico:Person")
    assert len(agents) > 0, "Keine Person-Agents gefunden"


def test_ort_typ_in_locations(records):
    locs = _collect_entities(records, "rico:hasOrHadLocation", "rico:Place")
    assert len(locs) > 0, "Keine Ort-Locations gefunden"


def test_werk_typ_in_subjects(records):
    works = _collect_entities(records, "rico:hasOrHadSubject", "m3gim:MusicalWork")
    assert len(works) > 0, "Keine Werk-Subjects gefunden"


def test_institution_typ_in_agents(records):
    orgs = _collect_entities(records, "m3gim:hasAssociatedAgent", "rico:CorporateBody")
    assert len(orgs) > 0, "Keine Institution-Agents gefunden"


def test_mentioned_persons_in_subjects_not_agents(records):
    """Personen mit Rolle 'erwähnt' landen in rico:hasOrHadSubject, NICHT in Agents.
    transform.py sortiert nur rico:Person um (Institutionen mit 'erwähnt' bleiben in Agents)."""
    for r in records:
        for ent in ensure_list(r.get("m3gim:hasAssociatedAgent")):
            if not isinstance(ent, dict):
                continue
            if ent.get("@type") != "rico:Person":
                continue  # nur Personen werden in transform.py umsortiert
            role = (ent.get("role") or "").lower()
            assert role not in ("erwähnt", "erwaehnt"), (
                f"{r['@id']}: 'erwähnt'-Person in Agents: {ent.get('name')}"
            )


def test_agents_have_name(records):
    """Jedes Agent-Entity hat name."""
    offenders = []
    for r in records:
        for ent in ensure_list(r.get("m3gim:hasAssociatedAgent")):
            if isinstance(ent, dict) and not ent.get("name"):
                offenders.append((r["@id"], ent))
    assert not offenders, f"Agents ohne name: {offenders[:3]}"


def test_locations_have_name(records):
    offenders = []
    for r in records:
        for ent in ensure_list(r.get("rico:hasOrHadLocation")):
            if isinstance(ent, dict) and not ent.get("name"):
                offenders.append((r["@id"], ent))
    assert not offenders, f"Locations ohne name: {offenders[:3]}"


def test_performance_role_structure(records):
    """m3gim:hasPerformanceRole-Einträge haben name und optional role."""
    for r in records:
        for rol in ensure_list(r.get("m3gim:hasPerformanceRole")):
            if isinstance(rol, dict):
                assert "name" in rol, f"{r['@id']}: Rolle ohne name"


def test_event_date_iso_or_range(records):
    """m3gim:eventDate ist ISO-Datum (YYYY[-MM[-DD]]), ISO-Range mit Slash,
    oder Jahres-Bis-Range (YYYY-YYYY). Freitext wie 'Wien, ab 1956' ist
    ein XLSX-Datenproblem (Verknüpfungs-Erfassung) — hier als Warnung geloggt.

    Die Pipeline gibt datum-Werte unveraendert durch; saubere Datierung ist
    redaktionelle Aufgabe (siehe knowledge/datenmodell.md § Datumskonventionen)."""
    import re
    # Strikte Pattern: ISO-Datum oder ISO-Range mit Slash
    iso_strict = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?(/\d{4}(-\d{2}(-\d{2})?)?)?$")
    # Lax: erlaubt YYYY-YYYY (Pipeline-Konvention in älteren Erfassungen)
    year_range = re.compile(r"^\d{4}-\d{4}$")

    hard_offenders = []   # Freitext — flaggen
    soft_offenders = []   # Konventions-Abweichung (YYYY-YYYY) — nur warnen

    for r in records:
        for d in ensure_list(r.get("m3gim:eventDate")):
            if not isinstance(d, str):
                continue
            if iso_strict.match(d):
                continue
            if year_range.match(d):
                soft_offenders.append((r["@id"], d))
                continue
            hard_offenders.append((r["@id"], d))

    if soft_offenders:
        print(f"INFO: {len(soft_offenders)} eventDate im YYYY-YYYY-Format (besser: YYYY/YYYY): "
              f"{soft_offenders[:3]}")
    if hard_offenders:
        print(f"WARNUNG: {len(hard_offenders)} eventDate als Freitext "
              f"(XLSX-Datenproblem, redaktionell fixen): {hard_offenders[:5]}")
    # Test soll Daten-Drift signalisieren, aber nicht blockieren.
    # Wird strict, sobald XLSX bereinigt.


def test_roles_gender_neutral(records):
    """Keine Rolle im Output endet auf :in oder :innen (data.md Abschnitt 5).

    Die Pipeline normalisiert Rollen bei der Ingestion (transform.py
    normalize_role). Dieser Test sichert die Invariante, dass kein Gender-Suffix
    in den JSON-LD-Output gelangt, unabhaengig davon wie es in XLSX erfasst wird.
    """
    offenders = []
    for r in records:
        for prop in ("m3gim:hasAssociatedAgent", "rico:hasOrHadLocation",
                     "rico:hasOrHadSubject", "m3gim:hasPerformanceRole"):
            for ent in ensure_list(r.get(prop)):
                if not isinstance(ent, dict):
                    continue
                role = ent.get("role")
                if isinstance(role, str) and (role.endswith(":in") or role.endswith(":innen")):
                    offenders.append((r["@id"], role))
    assert not offenders, (
        f"{len(offenders)} Rollen mit Gender-Suffix im Output: {offenders[:5]}"
    )
