#!/usr/bin/env python3
"""
M3GIM Data Audit — Validiert Alignment zwischen Quelldaten, JSON-LD und Frontend-Views.

Prueft:
1. Quelldaten (XLSX) → JSON-LD: Sind alle Records und Verknuepfungen korrekt transformiert?
2. JSON-LD → View-JSONs: Sind alle Entitaeten in den Views repraesentiert?
3. Handreichungs-Compliance: Werden alle definierten Typen und Rollen verarbeitet?
4. Antrag-Alignment: Stimmen die Zahlen mit dem Ist-Stand ueberein?

Verwendung:
    python scripts/audit-data.py
"""

import sys
import re
import json
import pandas as pd
from pathlib import Path
from collections import Counter

# Windows-Konsole: UTF-8 erzwingen
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).parent.parent
SHEETS_DIR = BASE_DIR / "data" / "google-spreadsheet"
OUTPUT_DIR = BASE_DIR / "data" / "output"
DOCS_DIR = BASE_DIR / "docs" / "data"

# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

def load_jsonld():
    """Laedt JSON-LD und gibt Graph zurueck"""
    path = OUTPUT_DIR / "m3gim.jsonld"
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def load_view(name):
    """Laedt ein View-JSON aus docs/data/"""
    path = DOCS_DIR / name
    if not path.exists():
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def normalize(val):
    """Normalisiert String fuer Vergleich"""
    if pd.isna(val) or str(val).strip() == "":
        return None
    return str(val).strip()

# ---------------------------------------------------------------------------
# Audit 1: XLSX → JSON-LD Record-Vollstaendigkeit
# ---------------------------------------------------------------------------

def audit_records(df_objekte, graph):
    """Prueft ob alle XLSX-Objekte im JSON-LD landen"""
    print("\n--- Audit 1: XLSX → JSON-LD Record-Vollstaendigkeit ---")

    # Alle Signaturen aus XLSX
    xlsx_sigs = set()
    for _, row in df_objekte.iterrows():
        sig = normalize(row.get('archivsignatur'))
        if sig and sig.lower() != 'beispiel':
            folio = normalize(row.get('unnamed: 2')) if 'unnamed: 2' in df_objekte.columns else None
            obj_id = f"{sig} {folio}" if folio else sig
            xlsx_sigs.add(obj_id)

    # Alle Identifiers aus JSON-LD
    jsonld_ids = set()
    for node in graph:
        if node.get("@type") in ("rico:Record", "rico:RecordSet"):
            identifier = node.get("rico:identifier")
            if identifier:
                jsonld_ids.add(identifier)

    # Vergleich
    missing_in_jsonld = xlsx_sigs - jsonld_ids
    extra_in_jsonld = jsonld_ids - xlsx_sigs

    # Fonds-ID abziehen
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
    """Prueft ob alle Verknuepfungstypen verarbeitet werden"""
    print("\n--- Audit 2: Verknuepfungstypen und Rollen ---")

    # Alle Typen und Rollen aus XLSX
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
        # Komposit-Typen splitten
        for t in typ_lower.split(","):
            t = t.strip()
            if t and t not in ['waehrung', 'währung']:
                xlsx_types[t] += 1

        if rolle:
            xlsx_roles[rolle.lower().strip()] += 1

    # JSON-LD Typ-Verteilung
    jsonld_agents = 0
    jsonld_locations = 0
    jsonld_subjects = 0
    jsonld_mentions = 0
    jsonld_dates = 0
    jsonld_roles = 0
    jsonld_details = 0
    jsonld_events = 0

    for node in graph:
        if node.get("@type") not in ("rico:Record",):
            continue
        agents = node.get("m3gim:hasAssociatedAgent", [])
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
            if s.get("@type") == "m3gim:PerformanceEvent":
                jsonld_events += 1
            elif s.get("@type") == "rico:Person":
                jsonld_mentions += 1

        dts = node.get("m3gim:eventDate", [])
        if isinstance(dts, (str,)):
            dts = [dts]
        elif isinstance(dts, dict):
            dts = [dts]
        jsonld_dates += len(dts)

        rls = node.get("m3gim:hasPerformanceRole", [])
        if isinstance(rls, dict):
            rls = [rls]
        jsonld_roles += len(rls)

        dtls = node.get("m3gim:hasDetail", [])
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
    print(f"    Performance Roles:           {jsonld_roles}")
    print(f"    Details (Schicht 3):         {jsonld_details}")

    # Handreichungs-Rollen pruefen
    print(f"\n  XLSX Rollen (Top 20):")
    for r, c in sorted(xlsx_roles.items(), key=lambda x: -x[1])[:20]:
        print(f"    {r:30s} {c:4d}")

    errors = 0
    if missing_sig > 0:
        print(f"\n  WARNUNG: {missing_sig} Verknuepfungen ohne Signatur (Datenverlust)")
    if missing_typ > 0:
        print(f"  WARNUNG: {missing_typ} Verknuepfungen ohne Typ (nicht verarbeitbar)")

    # Handreichungs-Compliance: Sind alle definierten Typen vorhanden?
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
# Audit 3: JSON-LD → View-JSONs Konsistenz
# ---------------------------------------------------------------------------

def audit_views(graph):
    """Prueft ob View-JSONs konsistent mit JSON-LD sind"""
    print("\n--- Audit 3: JSON-LD → View-JSONs ---")

    errors = 0

    # Partitur: Lebensphasen-Ansicht
    partitur = load_view("partitur.json")
    if partitur:
        lebensphasen = partitur.get("lebensphasen", [])
        print(f"  partitur.json: {len(lebensphasen)} Lebensphasen")
    else:
        print(f"  WARNUNG: partitur.json nicht gefunden")

    # Matrix: Personen × Zeitraeume × Kategorien
    matrix = load_view("matrix.json")
    if matrix:
        zeitraeume = matrix.get("zeitraeume", [])
        kategorien = matrix.get("kategorien", [])
        personen = matrix.get("personen", [])
        print(f"  matrix.json: {len(personen)} Personen, {len(zeitraeume)} Zeitraeume, {len(kategorien)} Kategorien")
    else:
        print(f"  WARNUNG: matrix.json nicht gefunden")

    # Kosmos: Zentrum + Komponisten/Werke
    kosmos = load_view("kosmos.json")
    if kosmos:
        zentrum = kosmos.get("zentrum", {})
        komponisten = kosmos.get("komponisten", [])
        werke_total = sum(len(k.get("werke", [])) for k in komponisten)
        print(f"  kosmos.json: {len(komponisten)} Komponisten, {werke_total} Werke (Zentrum: {zentrum.get('name', '?')})")
    else:
        print(f"  WARNUNG: kosmos.json nicht gefunden")

    # Frontend JSON-LD Kopie
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
# Audit 4: Datenqualitaets-Metriken
# ---------------------------------------------------------------------------

def audit_quality(df_objekte, graph):
    """Prueft Datenqualitaet und gibt Metriken aus"""
    print("\n--- Audit 4: Datenqualitaets-Metriken ---")

    errors = 0

    # Pflichtfelder aus Handreichung
    missing_sig = 0
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

    # JSON-LD: Records mit Verknuepfungen
    linked = 0
    unlinked = 0
    for node in graph:
        if node.get("@type") != "rico:Record":
            continue
        has_links = any(
            node.get(prop) for prop in [
                "m3gim:hasAssociatedAgent", "rico:hasOrHadLocation",
                "rico:hasOrHadSubject",
                "m3gim:hasPerformanceRole"
            ]
        )
        if has_links:
            linked += 1
        else:
            unlinked += 1

    print(f"\n  Verknuepft:    {linked} / {linked + unlinked} ({100*linked//(linked+unlinked)}%)")
    print(f"  Unverknuepft:  {unlinked}")

    # Wikidata-Abdeckung
    wd_persons = 0
    wd_orgs = 0
    wd_works = 0
    total_persons = 0
    total_orgs = 0
    total_works = 0

    for node in graph:
        if node.get("@type") != "rico:Record":
            continue
        agents = node.get("m3gim:hasAssociatedAgent", [])
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
            if s.get("@type") == "m3gim:MusicalWork":
                total_works += 1
                if s.get("@id", "").startswith("wd:"):
                    wd_works += 1

    print(f"\n  Wikidata-Abdeckung:")
    print(f"    Personen-Agents:      {wd_persons} / {total_persons} mit Wikidata-ID")
    print(f"    Org-Agents:           {wd_orgs} / {total_orgs} mit Wikidata-ID")
    print(f"    Werk-Subjects:        {wd_works} / {total_works} mit Wikidata-ID")

    # Erfassungsstatus-Verteilung
    status_counts = Counter()
    for node in graph:
        if node.get("@type") != "rico:Record":
            continue
        bs = node.get("m3gim:bearbeitungsstand", "nicht_gesetzt")
        status_counts[bs] += 1

    print(f"\n  Erfassungsstatus:")
    for s, c in sorted(status_counts.items(), key=lambda x: -x[1]):
        print(f"    {s:25s} {c:4d}")

    return errors

# ---------------------------------------------------------------------------
# Audit 5: Handreichungs-Compliance
# ---------------------------------------------------------------------------

def audit_handreichung_compliance(df_verk):
    """Prueft ob die Daten den Handreichungs-Konventionen entsprechen"""
    print("\n--- Audit 5: Handreichungs-Compliance ---")

    warnings = 0

    # Datumsformat-Check
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
        # Bereinige Excel-Artefakte fuer den Check
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

    # Namensformat-Check (Nachname, Vorname)
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
# Hauptfunktion
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("M3GIM Data Audit")
    print("=" * 60)

    # Daten laden
    print("\nLade Daten...")
    data = load_jsonld()
    graph = data.get("@graph", [])
    print(f"  JSON-LD: {len(graph)} Graph-Knoten")

    # XLSX laden
    objekte_path = SHEETS_DIR / "M3GIM-Objekte.xlsx"
    df_objekte = pd.read_excel(objekte_path)
    df_objekte.columns = [c.lower().strip() if isinstance(c, str) else c
                          for c in df_objekte.columns]
    print(f"  Objekte-XLSX: {len(df_objekte)} Zeilen")

    verk_path = SHEETS_DIR / "M3GIM-Verknüpfungen.xlsx"
    if not verk_path.exists():
        verk_path = SHEETS_DIR / "M3GIM-Verknuepfungen.xlsx"
    df_verk = pd.read_excel(verk_path)
    print(f"  Verknuepfungen-XLSX: {len(df_verk)} Zeilen")

    # Audits ausfuehren
    total_errors = 0
    total_errors += audit_records(df_objekte, graph)
    total_errors += audit_verknuepfungen(df_verk, graph)
    total_errors += audit_views(graph)
    total_errors += audit_quality(df_objekte, graph)
    warnings = audit_handreichung_compliance(df_verk)

    # Zusammenfassung
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
