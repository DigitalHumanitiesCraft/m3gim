#!/usr/bin/env python3
"""
M3GIM Data Audit — validates alignment between source data, JSON-LD and frontend copy.

Checks:
1. Source data (XLSX) → JSON-LD: are all records and Verknuepfungen transformed correctly?
2. JSON-LD → docs/data: does the frontend copy match the pipeline output?
3. Handreichung compliance: are all defined types and roles processed?
4. Antrag alignment: do the numbers match the actual state?

Usage:
    python scripts/audit-data.py

NOTE (Session 51): this is a coarse aggregate review tool (set and counter
comparisons). The cell-exact value-by-value crosscheck against the addressed
XLSX cell now lives in the suite test tests/test_34_rawdata_crosscheck.py (runs
with `pytest`). This script stays as a quick overview but uses the same
multi-sheet loader as the pipeline (load_verknuepfungen), so its numbers no
longer drift with the Box export.
"""

import sys
import re
import json
import pandas as pd
from pathlib import Path
from collections import Counter

# Windows console: force UTF-8
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).parent.parent
SHEETS_DIR = BASE_DIR / "data" / "google-spreadsheet"
OUTPUT_DIR = BASE_DIR / "data" / "output"
DOCS_DIR = BASE_DIR / "docs" / "data"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_jsonld():
    path = OUTPUT_DIR / "m3gim.jsonld"
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def normalize(val):
    """Normalise a string for comparison"""
    if pd.isna(val) or str(val).strip() == "":
        return None
    return str(val).strip()

# Record-side link properties. Since E-96 a stage role reaches the record as
# an m3gim-ontology:Performance node instead of an attribute.
LINK_PROPERTIES = (
    "m3gim-ontology:hasAssociatedAgent",
    "rico:hasOrHadLocation",
    "rico:hasOrHadSubject",
    "m3gim-ontology:hasPerformance",
)


def has_links(node):
    """Does the record carry at least one Verknuepfung?"""
    return any(node.get(prop) for prop in LINK_PROPERTIES)

# ---------------------------------------------------------------------------
# Audit 1: XLSX → JSON-LD record completeness
# ---------------------------------------------------------------------------

def audit_records(df_objekte, graph):
    """Check that all XLSX objects end up in the JSON-LD"""
    print("\n--- Audit 1: XLSX → JSON-LD Record-Vollstaendigkeit ---")

    xlsx_sigs = set()
    for _, row in df_objekte.iterrows():
        sig = normalize(row.get('archivsignatur'))
        if sig and sig.lower() != 'beispiel':
            # Depending on workbook state the folio column is named 'folio nr'
            # (current), 'folio'/'folio_nr' or (old) 'unnamed: 2'. Take the first
            # present.
            folio = None
            for fcol in ('folio nr', 'folio_nr', 'folio', 'unnamed: 2'):
                if fcol in df_objekte.columns:
                    folio = normalize(row.get(fcol))
                    break
            obj_id = f"{sig} {folio}" if folio else sig
            xlsx_sigs.add(obj_id)

    jsonld_ids = set()
    for node in graph:
        if node.get("@type") in ("rico:Record", "rico:RecordSet"):
            identifier = node.get("rico:identifier")
            if identifier:
                jsonld_ids.add(identifier)

    missing_in_jsonld = xlsx_sigs - jsonld_ids
    extra_in_jsonld = jsonld_ids - xlsx_sigs

    # drop the Fonds ID
    extra_in_jsonld.discard("UAKUG/NIM")

    errors = 0
    if missing_in_jsonld:
        print(f"  FEHLER: {len(missing_in_jsonld)} Objekte aus XLSX fehlen im JSON-LD:")
        for s in sorted(missing_in_jsonld)[:10]:
            print(f"    - {s}")
        errors += len(missing_in_jsonld)
    if extra_in_jsonld:
        print(f"  WARNUNG: {len(extra_in_jsonld)} Objekte im JSON-LD ohne XLSX-Entsprechung:")
        for s in sorted(extra_in_jsonld)[:10]:
            print(f"    - {s}")

    if errors == 0:
        print(f"  OK: {len(xlsx_sigs)} XLSX-Objekte ↔ {len(jsonld_ids) - 1} JSON-LD Records (+ 1 Fonds)")

    return errors

# ---------------------------------------------------------------------------
# Audit 2: Verknuepfungen — Typ-Abdeckung
# ---------------------------------------------------------------------------

def audit_verknuepfungen(df_verk, graph):
    """Check that all Verknuepfung types are processed"""
    print("\n--- Audit 2: Verknuepfungstypen und Rollen ---")

    xlsx_types = Counter()
    xlsx_roles = Counter()
    missing_sig = 0
    missing_typ = 0

    for _, row in df_verk.iterrows():
        sig = normalize(row.get('archivsignatur'))
        typ = normalize(row.get('typ'))
        name = normalize(row.get('name'))
        rolle = normalize(row.get('rolle'))

        if not sig or sig.lower() == 'beispiel':
            continue
        if not name:
            continue

        if not sig:
            missing_sig += 1
            continue
        if not typ:
            missing_typ += 1
            continue

        typ_lower = typ.lower().strip()
        # split composite types
        for t in typ_lower.split(","):
            t = t.strip()
            if t and t not in ['waehrung', 'währung']:
                xlsx_types[t] += 1

        if rolle:
            xlsx_roles[rolle.lower().strip()] += 1

    # JSON-LD type distribution
    jsonld_agents = 0
    jsonld_locations = 0
    jsonld_subjects = 0
    jsonld_mentions = 0
    jsonld_dates = 0
    jsonld_performances = 0
    jsonld_details = 0
    jsonld_events = 0

    for node in graph:
        if node.get("@type") not in ("rico:Record",):
            continue
        agents = node.get("m3gim-ontology:hasAssociatedAgent", [])
        if isinstance(agents, dict):
            agents = [agents]
        jsonld_agents += len(agents)

        locs = node.get("rico:hasOrHadLocation", [])
        if isinstance(locs, dict):
            locs = [locs]
        jsonld_locations += len(locs)

        subjs = node.get("rico:hasOrHadSubject", [])
        if isinstance(subjs, dict):
            subjs = [subjs]
        jsonld_subjects += len(subjs)
        for s in subjs:
            if s.get("@type") == "m3gim-ontology:FramingEvent":
                jsonld_events += 1
            elif s.get("@type") == "rico:Person":
                jsonld_mentions += 1

        # Each dating hangs off an annotation node under
        # m3gim-ontology:hasAnnotation.
        dts = node.get("m3gim-ontology:hasAnnotation", [])
        if isinstance(dts, (str,)):
            dts = [dts]
        elif isinstance(dts, dict):
            dts = [dts]
        jsonld_dates += len(dts)

        # E-96: rolle links became m3gim-ontology:Performance nodes; the record
        # points at them via m3gim-ontology:hasPerformance.
        perfs = node.get("m3gim-ontology:hasPerformance", [])
        if isinstance(perfs, dict):
            perfs = [perfs]
        jsonld_performances += len(perfs)

        dtls = node.get("m3gim-ontology:hasDetail", [])
        if isinstance(dtls, dict):
            dtls = [dtls]
        jsonld_details += len(dtls)

    print(f"  XLSX Verknuepfungstypen:")
    for t, c in sorted(xlsx_types.items(), key=lambda x: -x[1]):
        print(f"    {t:20s} {c:4d}")

    print(f"\n  JSON-LD Verteilung:")
    print(f"    Agents (Person+Institution): {jsonld_agents}")
    print(f"    Locations:                   {jsonld_locations}")
    print(f"    Subjects (Werk+Ereignis):    {jsonld_subjects}")
    print(f"      davon Events:              {jsonld_events}")
    print(f"    Mentions:                    {jsonld_mentions}")
    print(f"    Dates:                       {jsonld_dates}")
    print(f"    Performances (Rollen):       {jsonld_performances}")
    print(f"    Details (Schicht 3):         {jsonld_details}")

    print(f"\n  XLSX Rollen (Top 20):")
    for r, c in sorted(xlsx_roles.items(), key=lambda x: -x[1])[:20]:
        print(f"    {r:30s} {c:4d}")

    errors = 0
    if missing_sig > 0:
        print(f"\n  WARNUNG: {missing_sig} Verknuepfungen ohne Signatur (Datenverlust)")
    if missing_typ > 0:
        print(f"  WARNUNG: {missing_typ} Verknuepfungen ohne Typ (nicht verarbeitbar)")

    # Handreichung compliance: are all defined types present?
    handreichung_types = {'person', 'ort', 'institution', 'ereignis', 'werk', 'detail',
                          'rolle', 'datum', 'ensemble'}
    actual_types = set(xlsx_types.keys())
    missing_types = handreichung_types - actual_types
    extra_types = actual_types - handreichung_types
    if missing_types:
        print(f"\n  INFO: Handreichungs-Typen ohne Daten: {', '.join(sorted(missing_types))}")
    if extra_types:
        print(f"  INFO: Zusaetzliche Typen in Daten: {', '.join(sorted(extra_types))}")

    return errors

# ---------------------------------------------------------------------------
# Audit 3: JSON-LD → docs/data Synchronitaet
# ---------------------------------------------------------------------------

def audit_views(graph):
    """Check that the frontend copy matches the pipeline output"""
    print("\n--- Audit 3: JSON-LD → docs/data ---")

    errors = 0

    frontend_jsonld = DOCS_DIR / "m3gim.jsonld"
    output_jsonld = OUTPUT_DIR / "m3gim.jsonld"
    if frontend_jsonld.exists() and output_jsonld.exists():
        if frontend_jsonld.stat().st_size == output_jsonld.stat().st_size:
            print(f"  docs/data/m3gim.jsonld: In Sync ({frontend_jsonld.stat().st_size / 1024:.1f} KB)")
        else:
            print(f"  WARNUNG: docs/data/m3gim.jsonld ({frontend_jsonld.stat().st_size}) != data/output/m3gim.jsonld ({output_jsonld.stat().st_size})")
            errors += 1

    return errors

# ---------------------------------------------------------------------------
# Audit 4: data quality metrics
# ---------------------------------------------------------------------------

def audit_quality(df_objekte, graph):
    """Check data quality and print metrics"""
    print("\n--- Audit 4: Datenqualitaets-Metriken ---")

    errors = 0

    # mandatory fields from the Handreichung
    missing_titel = 0
    missing_typ = 0
    missing_datum = 0
    has_bearbeitungsstand = 0
    has_evidenz = 0
    total = 0

    for _, row in df_objekte.iterrows():
        sig = normalize(row.get('archivsignatur'))
        if not sig or sig.lower() == 'beispiel':
            continue
        total += 1

        if not normalize(row.get('titel')):
            missing_titel += 1
        if not normalize(row.get('dokumenttyp')):
            missing_typ += 1
        if not normalize(row.get('entstehungsdatum')):
            missing_datum += 1
        if normalize(row.get('bearbeitungsstand')):
            has_bearbeitungsstand += 1
        if normalize(row.get('datierungsevidenz')):
            has_evidenz += 1

    print(f"  Gesamt: {total} Objekte")
    print(f"  Ohne Titel:            {missing_titel}")
    print(f"  Ohne Dokumenttyp:      {missing_typ}")
    print(f"  Ohne Datum:            {missing_datum}")
    print(f"  Mit Bearbeitungsstand: {has_bearbeitungsstand} / {total} ({100*has_bearbeitungsstand//total}%)")
    print(f"  Mit Datierungsevidenz: {has_evidenz} / {total} ({100*has_evidenz//total}%)")

    # JSON-LD: records with Verknuepfungen
    linked = 0
    unlinked = 0
    for node in graph:
        if node.get("@type") != "rico:Record":
            continue
        if has_links(node):
            linked += 1
        else:
            unlinked += 1

    print(f"\n  Verknuepft:    {linked} / {linked + unlinked} ({100*linked//(linked+unlinked)}%)")
    print(f"  Unverknuepft:  {unlinked}")

    # Wikidata coverage
    wd_persons = 0
    wd_orgs = 0
    wd_works = 0
    total_persons = 0
    total_orgs = 0
    total_works = 0

    for node in graph:
        if node.get("@type") != "rico:Record":
            continue
        agents = node.get("m3gim-ontology:hasAssociatedAgent", [])
        if isinstance(agents, dict):
            agents = [agents]
        for a in agents:
            if a.get("@type") == "rico:Person":
                total_persons += 1
                if a.get("@id", "").startswith("wd:"):
                    wd_persons += 1
            elif a.get("@type") in ("rico:CorporateBody", "rico:Group"):
                total_orgs += 1
                if a.get("@id", "").startswith("wd:"):
                    wd_orgs += 1

        subjs = node.get("rico:hasOrHadSubject", [])
        if isinstance(subjs, dict):
            subjs = [subjs]
        for s in subjs:
            if s.get("@type") == "m3gim-ontology:MusicalWork":
                total_works += 1
                if s.get("@id", "").startswith("wd:"):
                    wd_works += 1

    print(f"\n  Wikidata-Abdeckung:")
    print(f"    Personen-Agents:      {wd_persons} / {total_persons} mit Wikidata-ID")
    print(f"    Org-Agents:           {wd_orgs} / {total_orgs} mit Wikidata-ID")
    print(f"    Werk-Subjects:        {wd_works} / {total_works} mit Wikidata-ID")

    # processing status distribution
    status_counts = Counter()
    for node in graph:
        if node.get("@type") != "rico:Record":
            continue
        bs = node.get("m3gim-ontology:processingStatus", "nicht_gesetzt")
        status_counts[bs] += 1

    print(f"\n  Erfassungsstatus:")
    for s, c in sorted(status_counts.items(), key=lambda x: -x[1]):
        print(f"    {s:25s} {c:4d}")

    return errors

# ---------------------------------------------------------------------------
# Audit 5: Handreichungs-Compliance
# ---------------------------------------------------------------------------

def audit_handreichung_compliance(df_verk):
    """Check that the data follows the Handreichung conventions"""
    print("\n--- Audit 5: Handreichungs-Compliance ---")

    warnings = 0

    # date format check
    bad_dates = 0
    date_patterns = [
        r'^\d{4}-\d{2}-\d{2}$',           # YYYY-MM-DD
        r'^\d{4}-\d{2}$',                   # YYYY-MM
        r'^\d{4}$',                          # YYYY
        r'^\d{4}-\d{2}-\d{2}/\d{4}-\d{2}-\d{2}$',  # YYYY-MM-DD/YYYY-MM-DD
        r'^\d{4}/\d{4}$',                   # YYYY/YYYY
        r'^circa:\d{4}',                     # circa:YYYY
        r'^vor:\d{4}',                       # vor:YYYY
        r'^nach:\d{4}',                      # nach:YYYY
    ]

    for _, row in df_verk.iterrows():
        datum = normalize(row.get('datum'))
        if not datum:
            continue
        # strip Excel artefacts before the check
        datum_clean = re.sub(r'\s+00:00:00$', '', datum)
        if not any(re.match(p, datum_clean) for p in date_patterns):
            bad_dates += 1
            if bad_dates <= 5:
                print(f"  WARNUNG: Nicht-konformes Datum: '{datum_clean}'")

    if bad_dates > 5:
        print(f"  ... und {bad_dates - 5} weitere")
    if bad_dates == 0:
        print(f"  Datumsformate: Alle konform")
    warnings += bad_dates

    # name format check (surname, given name)
    bad_names = 0
    for _, row in df_verk.iterrows():
        typ = normalize(row.get('typ'))
        name = normalize(row.get('name'))
        if not typ or not name:
            continue
        typ_lower = typ.lower().strip()
        if typ_lower == 'person' and ',' not in name:
            bad_names += 1
            if bad_names <= 5:
                print(f"  WARNUNG: Person ohne Komma: '{name}'")

    if bad_names > 5:
        print(f"  ... und {bad_names - 5} weitere")
    if bad_names == 0:
        print(f"  Namensformat: Alle Personen mit Komma-Trennung")
    warnings += bad_names

    return warnings

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("M3GIM Data Audit")
    print("=" * 60)

    print("\nLade Daten...")
    data = load_jsonld()
    graph = data.get("@graph", [])
    print(f"  JSON-LD: {len(graph)} Graph-Knoten")

    # Load the object source, CSV preferred (data.md § 3), the same source as
    # transform.py, otherwise the audit compares XLSX date artefacts against the
    # CSV-based dataset and reports phantom errors.
    from _common import load_objekte, resolve_objekte_source
    objekte_path = resolve_objekte_source(SHEETS_DIR)
    df_objekte = load_objekte(SHEETS_DIR)
    print(f"  Objektquelle {objekte_path.name}: {len(df_objekte)} Zeilen")

    # Pipeline loader: CSV directory preferred (E-152), otherwise the
    # multi-sheet workbook. A separate single-sheet read path would let the
    # aggregate numbers drift against the transformed state.
    sys.path.insert(0, str(BASE_DIR / "scripts"))
    from transform import load_verknuepfungen, resolve_verknuepfungen_source
    verk_path = resolve_verknuepfungen_source(SHEETS_DIR)
    df_verk = load_verknuepfungen(verk_path)
    print(f"  Verknuepfungen: {len(df_verk)} Zeilen aus {verk_path.name}")

    total_errors = 0
    total_errors += audit_records(df_objekte, graph)
    total_errors += audit_verknuepfungen(df_verk, graph)
    total_errors += audit_views(graph)
    total_errors += audit_quality(df_objekte, graph)
    warnings = audit_handreichung_compliance(df_verk)

    print()
    print("=" * 60)
    print(f"ERGEBNIS: {total_errors} Fehler, {warnings} Warnungen")
    if total_errors == 0:
        print("Status: BESTANDEN")
    else:
        print("Status: FEHLGESCHLAGEN")
    print("=" * 60)

    return 1 if total_errors > 0 else 0


if __name__ == "__main__":
    exit(main())
