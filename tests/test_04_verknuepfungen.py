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


_RELATIONAL_PROPS = (
    "m3gim:hasAssociatedAgent",
    "rico:hasOrHadLocation",
    "rico:hasOrHadSubject",
    "m3gim:hasPerformanceRole",
    "m3gim:eventDate",
    "m3gim:hasSpatiotemporalEvent",
    "agrelon:hasRelation",
    "m3gim:hasDetailAnnotation",
)


def _has_any_relation(record):
    for prop in _RELATIONAL_PROPS:
        if ensure_list(record.get(prop)):
            return True
    # Typisierte Datumsproperties (m3gim:absendedatum etc.) auch zaehlen
    for key in record:
        if key.startswith("m3gim:") and key.endswith("datum"):
            return True
    return False


def test_verknuepfungen_every_referenced_record_has_relations(
    records, xlsx_verknuepfungen
):
    """Jeder Record, den die XLSX-Verknuepfungstabelle mit typ+Signatur
    adressiert, hat im Output mindestens eine ausgehende Relation.

    Regressions-Alarm statt der frueheren 80-Prozent-Toleranz: wenn die
    Pipeline stillschweigend aufhoert, Relationen fuer ein Konvolut zu
    emittieren, schlaegt dieser Test an. Orphan-Signaturen (NIM_11 u. ae.,
    siehe knowledge/xlsx-fixes.md § 7) werden uebersprungen, da fuer sie
    kein Ziel-Record existiert.
    """
    # Index: Signatur -> Record(s)
    by_sig = {}
    for r in records:
        ident = r.get("rico:identifier", "")
        base = ident.split()[0] if ident else ""
        if base:
            by_sig.setdefault(base, []).append(r)

    # Alle Signaturen, die in valid_xlsx als Ziel auftreten
    valid = xlsx_verknuepfungen[
        xlsx_verknuepfungen["archivsignatur"].notna()
        & xlsx_verknuepfungen["typ"].notna()
    ]
    referenced_sigs = {str(s).strip() for s in valid["archivsignatur"]}

    unlinked = []
    for sig in sorted(referenced_sigs):
        if sig not in by_sig:
            continue  # Orphan — siehe xlsx-fixes.md § 7
        # Mindestens einer der Records dieser Signatur (Konvolut oder Folio)
        # traegt eine Relation
        if not any(_has_any_relation(r) for r in by_sig[sig]):
            unlinked.append(sig)

    assert not unlinked, (
        f"{len(unlinked)} referenzierte Signaturen ohne ausgehende "
        f"Relation im Output (stiller Relationen-Verlust). "
        f"Beispiele: {unlinked[:10]}"
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
    """m3gim:eventDate-Werte sind ISO (YYYY[-MM[-DD]]) oder ISO-Range (YYYY/YYYY).

    Ein Baseline-Wert in baseline_counts.json akzeptiert die aktuell bekannten
    Freitext-Einträge ("Wien, ab 1956", "1944-05 bis 1944-09", "1957-[05-27?]").
    Wenn die Zahl waechst, muss eine neue Freitext-Datierung aufgetaucht sein —
    XLSX bereinigen (knowledge/xlsx-fixes.md § 6). Wenn sie sinkt, die Baseline
    nach unten ziehen, damit die Bereinigung nicht stillschweigend rueckgaengig
    gemacht werden kann.
    """
    import json
    import re
    from pathlib import Path

    iso_strict = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?(/\d{4}(-\d{2}(-\d{2})?)?)?$")

    offenders = []
    for r in records:
        for d in ensure_list(r.get("m3gim:eventDate")):
            if not isinstance(d, str):
                continue
            if not iso_strict.match(d):
                offenders.append((r["@id"], d))

    baseline_path = Path(__file__).parent / "fixtures" / "baseline_counts.json"
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    allowed = baseline.get("event_date_non_iso_max", 0)

    assert len(offenders) == allowed, (
        f"{len(offenders)} eventDate-Werte entsprechen nicht ISO "
        f"(Baseline erlaubt {allowed}). Drift! Erste Offenders: "
        f"{offenders[:5]}. XLSX redaktionell bereinigen "
        f"(knowledge/xlsx-fixes.md § 6); Baseline in "
        f"tests/fixtures/baseline_counts.json anpassen."
    )


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
