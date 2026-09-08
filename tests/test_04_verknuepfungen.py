"""Verknuepfungen type mapping: XLSX typ -> RiC-O/m3gim property.

transform.py mapping (add_relations_to_records):
  person       -> m3gim-ontology:hasAssociatedAgent (@type rico:Person)
                 except role 'erwähnt' -> rico:hasOrHadSubject
  institution  -> m3gim-ontology:hasAssociatedAgent (@type rico:CorporateBody)
  ensemble     -> m3gim-ontology:hasAssociatedAgent (@type rico:Group)
  ort          -> rico:hasOrHadLocation (@type rico:Place)
  werk         -> rico:hasOrHadSubject (@type m3gim-ontology:MusicalWork)
  ereignis     -> rico:hasOrHadSubject (@type m3gim-ontology:FramingEvent)
  rolle        -> m3gim-ontology:hasPerformance (source Annotation + StageRole)
  datum        -> m3gim-ontology:hasAnnotation (Annotation with atDate)
"""

import pytest

from _helpers import ensure_list


def role_label(entity):
    """Display text of a node's role.

    Since the rework the role is a reference to a vocabulary concept and
    carries its skos:prefLabel. A bare string only remains for the contract
    status, which the vocabulary deliberately does not carry as a concept.
    """
    role = entity.get("role")
    if isinstance(role, dict):
        return role.get("skos:prefLabel", "")
    return role or ""


def _collect_entities(records, prop, type_filter=None):
    """Return all entities for a property, optionally filtered by @type."""
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
    "m3gim-ontology:hasAssociatedAgent",
    "rico:hasOrHadLocation",
    "rico:hasOrHadSubject",
    "m3gim-ontology:hasPerformance",
    "m3gim-ontology:hasAnnotation",
    "m3gim-ontology:hasDetail",
    "agrelon:hasRelation",
)


def _has_any_relation(record):
    for prop in _RELATIONAL_PROPS:
        if ensure_list(record.get(prop)):
            return True
    # The creation date on the document is also a relation to the
    # Verknuepfungen row, even though it has no node of its own.
    return bool(record.get("rico:creationDate"))


@pytest.mark.xfail(
    strict=True,
    reason="NIM_168 Folio-Granularitaets-Inkonsistenz zwischen Objekt- und "
    "Verknuepfungstabelle (Sub-Folios 2_1..2_3), Source-Fix beim "
    "Erschliessungsteam offen — siehe data/reports/reconciliation-register.md",
)
def test_verknuepfungen_every_referenced_record_has_relations(
    records, xlsx_verknuepfungen
):
    """Jeder Record, den die XLSX-Verknuepfungstabelle mit typ+Signatur
    adressiert, hat im Output mindestens eine ausgehende Relation.

    Regressions-Alarm statt der frueheren 80-Prozent-Toleranz: wenn die
    Pipeline stillschweigend aufhoert, Relationen fuer ein Konvolut zu
    emittieren, schlaegt dieser Test an. Orphan-Signaturen (NIM_11 u. ae.,
    siehe knowledge/data.md § Compensations in the pipeline) werden uebersprungen, da fuer sie
    kein Ziel-Record existiert.

    BEKANNTE ECHTE DATENLUECKE (bewusst rot, Source-Fix offen): NIM_168 wird in
    der Verknuepfungstabelle ueber Sub-Folios 2_1/2_2/2_3 adressiert, die
    Objekttabelle kennt aber nur die Folio-Records 1 und 2. Die Relationen
    haengen daher an nicht existierenden Record-IDs und gehen verloren. Das ist
    eine Inkonsistenz ZWISCHEN den beiden Quelltabellen (Folio-Granularitaet),
    nur vom Erschliessungsteam loesbar: entweder die Objekttabelle um die
    Sub-Folios 2_1..2_3 ergaenzen oder die Verknuepfungsfolios auf 2 vereinheit-
    lichen. Kein Pipeline-Fallback, weil ein Umhaengen auf Folio 2 die Provenienz
    falsch zuordnen wuerde. Bis zur Quellbereinigung traegt der Test
    xfail(strict=True); nach dem Source-Fix bricht XPASS die Suite und der
    Marker wird entfernt.
    """
    by_sig = {}
    for r in records:
        ident = r.get("rico:identifier", "")
        base = ident.split()[0] if ident else ""
        if base:
            by_sig.setdefault(base, []).append(r)

    valid = xlsx_verknuepfungen[
        xlsx_verknuepfungen["archivsignatur"].notna()
        & xlsx_verknuepfungen["typ"].notna()
    ]
    referenced_sigs = {str(s).strip() for s in valid["archivsignatur"]}

    unlinked = []
    for sig in sorted(referenced_sigs):
        if sig not in by_sig:
            continue  # Orphan, see data.md § Compensations in the pipeline
        # At least one record of this signature (Konvolut or Folio) carries a relation.
        if not any(_has_any_relation(r) for r in by_sig[sig]):
            unlinked.append(sig)

    assert not unlinked, (
        f"{len(unlinked)} referenzierte Signaturen ohne ausgehende "
        f"Relation im Output (stiller Relationen-Verlust). "
        f"Beispiele: {unlinked[:10]}"
    )


# (XLSX-typ, Record-Property, @type der erzeugten Entity)
_TYP_TO_OUTPUT = [
    ("person", "m3gim-ontology:hasAssociatedAgent", "rico:Person"),
    ("institution", "m3gim-ontology:hasAssociatedAgent", "rico:CorporateBody"),
    ("ort", "rico:hasOrHadLocation", "rico:Place"),
    ("werk", "rico:hasOrHadSubject", "m3gim-ontology:MusicalWork"),
]

# Share of a type's source rows that must reach the output. Losses come from
# orphan signatures and Folio granularity (data.md § Compensations in the pipeline) and, for type person,
# from re-sorting the role 'erwaehnt' into rico:hasOrHadSubject. test_11 uses
# the same threshold for the Verortungen.
_MIN_YIELD = 0.6


@pytest.mark.parametrize("typ,prop,entity_type", _TYP_TO_OUTPUT)
def test_typ_reaches_output(records, xlsx_verknuepfungen, typ, prop, entity_type):
    """A base type of the source reaches the output with a lower bound derived
    from the source.

    The four predecessors checked only `len(...) > 0` and thus caught only the
    complete failure of a type branch. The lower bound is formed at runtime
    from the source row count (author rule in knowledge/testing.md), so a
    partial loss shows up too and the test carries a new data state without
    correction.
    """
    typ_col = (
        xlsx_verknuepfungen["typ"].fillna("").astype(str).str.strip().str.lower()
    )
    row_count = int((typ_col == typ).sum())
    assert row_count >= 10, (
        f"Quelle fuehrt nur {row_count} Zeilen mit typ={typ!r}, der Test "
        f"liefe leer. Spaltenbelegung oder Export pruefen."
    )
    found = _collect_entities(records, prop, entity_type)
    assert len(found) >= row_count * _MIN_YIELD, (
        f"typ={typ!r}: nur {len(found)} {entity_type}-Entities an {prop} fuer "
        f"{row_count} Quellzeilen (unter {_MIN_YIELD:.0%})."
    )


def test_mentioned_persons_in_subjects_not_agents(records):
    """Persons with role 'erwähnt' land in rico:hasOrHadSubject, NOT in Agents.
    transform.py re-sorts only rico:Person (institutions with 'erwähnt' stay in Agents)."""
    for r in records:
        for ent in ensure_list(r.get("m3gim-ontology:hasAssociatedAgent")):
            if not isinstance(ent, dict):
                continue
            if ent.get("@type") != "rico:Person":
                continue  # only persons get re-sorted in transform.py
            role = role_label(ent).lower()
            assert role not in ("erwähnt", "erwaehnt"), (
                f"{r['@id']}: 'erwähnt'-Person in Agents: {ent.get('name')}"
            )


def test_agents_have_name(records):
    """Every agent entity has a name."""
    offenders = []
    for r in records:
        for ent in ensure_list(r.get("m3gim-ontology:hasAssociatedAgent")):
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


def test_performance_references_resolvable(records, graph):
    """Every legacy hasPerformance reference resolves to a source Annotation."""
    perfs = {n["@id"]: n for n in graph
             if n.get("@type") == "m3gim-ontology:Annotation"
             and str(n.get("@id", "")).startswith("m3gim-data:perf_")}
    stage_roles = {n["@id"] for n in graph if n.get("@type") == "m3gim-ontology:StageRole"}
    for r in records:
        for ref in ensure_list(r.get("m3gim-ontology:hasPerformance")):
            pid = ref.get("@id") if isinstance(ref, dict) else None
            assert pid in perfs, f"{r['@id']}: hasPerformance-Ref {pid} fehlt im Graph"
            sr = perfs[pid].get("m3gim-ontology:hasStageRole")
            if isinstance(sr, dict):
                assert sr.get("@id") in stage_roles, (
                    f"{pid}: hasStageRole zeigt auf nicht-existente StageRole"
                )


def test_event_date_retired(records):
    """No record carries a project-specific date property.

    The generic m3gim:eventDate was the first term of this kind to be retired
    (E-102), the sixteen typed date properties followed with the target model.
    Every dating now hangs on an annotation node, the creation date on the
    document on rico:creationDate. Node well-formedness is checked by test_30,
    here only the regression guard against the return of a property name that
    expresses a role.
    """
    from test_18_typed_dates import RETIRED_DATE_PROPS

    offenders = [
        (r["@id"], key)
        for r in records
        for key in r
        if key in RETIRED_DATE_PROPS
        or (key.startswith("m3gim-ontology:") and key.endswith("datum"))
    ]
    assert not offenders, (
        f"{len(offenders)} Records tragen eine Datums-Property, die ihre Rolle "
        f"im Namen fuehrt: {offenders[:5]}"
    )


def test_roles_gender_neutral(records):
    """No role in the output ends in :in or :innen (data.md § Role values).

    The pipeline normalizes roles at ingestion (transform.py normalize_role).
    This test guards the invariant that no gender suffix reaches the JSON-LD
    output, regardless of how it is recorded in XLSX.
    """
    offenders = []
    for r in records:
        for prop in ("m3gim-ontology:hasAssociatedAgent", "rico:hasOrHadLocation",
                     "rico:hasOrHadSubject"):
            for ent in ensure_list(r.get(prop)):
                if not isinstance(ent, dict):
                    continue
                role = role_label(ent)
                if role.endswith(":in") or role.endswith(":innen"):
                    offenders.append((r["@id"], role))
    assert not offenders, (
        f"{len(offenders)} Rollen mit Gender-Suffix im Output: {offenders[:5]}"
    )
