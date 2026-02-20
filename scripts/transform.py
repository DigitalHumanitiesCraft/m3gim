#!/usr/bin/env python3
"""
M³GIM Transform — Step 3 der Pipeline.

Erzeugt JSON-LD im RiC-O 1.1 Format mit m3gim-Erweiterungen.
Liest Google Sheets Exporte, normalisiert Daten, baut Konvolut-Hierarchie,
matched Verknuepfungen gegen Indizes.

Verwendung:
    python scripts/transform.py
"""

import sys
import re
import json
import pandas as pd
from pathlib import Path
from datetime import datetime

# Windows-Konsole: UTF-8 erzwingen
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent.parent
SHEETS_DIR = BASE_DIR / "data" / "google-spreadsheet"
OUTPUT_DIR = BASE_DIR / "data" / "output"

# ---------------------------------------------------------------------------
# JSON-LD Context
# ---------------------------------------------------------------------------

CONTEXT = {
    "rico": "https://www.ica.org/standards/RiC/ontology#",
    "m3gim": "https://dhcraft.org/m3gim/vocab#",
    "m3gim-dft": "https://dhcraft.org/m3gim/documentaryFormTypes#",
    "m3gim-role": "https://dhcraft.org/m3gim/roles#",
    "wd": "http://www.wikidata.org/entity/",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
}

# ---------------------------------------------------------------------------
# Dokumenttyp-Mapping (deutsch → m3gim-dft)
# ---------------------------------------------------------------------------

DOKUMENTTYP_TO_DFT = {
    "korrespondenz": "m3gim-dft:brief",
    "vertrag": "m3gim-dft:vertrag",
    "presse": "m3gim-dft:zeitungsausschnitt",
    "programm": "m3gim-dft:programmheft",
    "konzertprogramm": "m3gim-dft:programmheft",
    "plakat": "m3gim-dft:plakat",
    "tontraeger": "m3gim-dft:tontraeger",
    "autobiografie": "m3gim-dft:biographie",
    "biographie": "m3gim-dft:biographie",
    "identitaetsdokument": "m3gim-dft:ausweis",
    "studienunterlagen": "m3gim-dft:dokument",
    "repertoire": "m3gim-dft:dokument",
    "repertoireliste": "m3gim-dft:dokument",
    "sammlung": "m3gim-dft:konvolut",
    "konvolut": "m3gim-dft:konvolut",
    "tagebuch": "m3gim-dft:tagebuch",
    "notizbuch": "m3gim-dft:notiz",
    "notiz": "m3gim-dft:notiz",
    "urkunde": "m3gim-dft:urkunde",
    "zeugnis": "m3gim-dft:urkunde",
    "lebenslauf": "m3gim-dft:lebenslauf",
    "widmung": "m3gim-dft:dokument",
    "photokopie": "m3gim-dft:photokopie",
    "quittung": "m3gim-dft:quittung",
    "rezension": "m3gim-dft:rezension",
    "typoskript": "m3gim-dft:typoskript",
    "visitenkarte": "m3gim-dft:visitenkarte",
    "noten": "m3gim-dft:noten",
    "dokument": "m3gim-dft:dokument",
    "sonstiges": "m3gim-dft:sonstiges"
}

# ---------------------------------------------------------------------------
# Header-Shift-Korrekturen
# ---------------------------------------------------------------------------

HEADER_SHIFTS = {
    "organisationsindex": ["m3gim_id", "name", "wikidata_id", "ort", "assoziierte_person", "anmerkung"],
    "ortsindex": ["m3gim_id", "name", "wikidata_id"],
    "werkindex": ["m3gim_id", "name", "wikidata_id", "komponist", "rolle_stimme", "anmerkung"]
}


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

def normalize_str(value) -> str | None:
    """Normalisiert String-Wert: strip, lower fuer Vokabularfelder"""
    if pd.isna(value) or str(value).strip() == "":
        return None
    return str(value).strip()


def normalize_lower(value) -> str | None:
    """Normalisiert String-Wert: strip + lower"""
    if pd.isna(value) or str(value).strip() == "":
        return None
    return str(value).strip().lower()


def clean_date(value) -> str | None:
    """Bereinigt Datumsartefakte (Excel 00:00:00)"""
    if pd.isna(value):
        return None
    s = str(value).strip()
    s = re.sub(r'\s+00:00:00$', '', s)
    if s == "":
        return None
    return s


def create_record_id(signatur: str, folio: str = None) -> str:
    """Erzeugt URI aus Signatur (+ Folio)"""
    # UAKUG/NIM_028 → m3gim:NIM_028
    # UAKUG/NIM_003 + 1_1 → m3gim:NIM_003_1_1
    # UAKUG/NIM/PL_07 → m3gim:NIM_PL_07
    clean = signatur.replace("UAKUG/", "").replace("/", "_")
    if folio:
        clean = f"{clean}_{folio.replace(' ', '_')}"
    return f"m3gim:{clean}"


def load_index(name: str) -> pd.DataFrame | None:
    """Laedt einen Index mit Header-Shift-Korrektur"""
    path = SHEETS_DIR / f"M3GIM-{name}.xlsx"
    if not path.exists():
        return None

    df = pd.read_excel(path)
    canonical = name.lower()

    if canonical in HEADER_SHIFTS:
        expected = HEADER_SHIFTS[canonical]
        if len(df.columns) == len(expected):
            first_val = str(df.columns[1]) if len(df.columns) > 1 else ""
            if first_val and first_val not in ["name", "titel", "ort", "m3gim_id"]:
                old_headers = list(df.columns)
                df.columns = expected[:len(df.columns)]
                first_row = pd.DataFrame([old_headers], columns=df.columns)
                df = pd.concat([first_row, df], ignore_index=True)

    return df


def build_index_lookup(df: pd.DataFrame) -> dict:
    """Baut Lookup-Dictionary: name → {wikidata_id, ...}"""
    lookup = {}
    name_col = 'name' if 'name' in df.columns else 'titel'
    if name_col not in df.columns:
        return lookup

    for _, row in df.iterrows():
        name = normalize_str(row.get(name_col))
        if name is None:
            continue
        entry = {"name": name}
        if pd.notna(row.get('wikidata_id')):
            wid = str(row['wikidata_id']).strip()
            if wid:
                entry["wikidata_id"] = wid
        if pd.notna(row.get('gnd_id')):
            gid = str(row['gnd_id']).strip()
            if gid:
                entry["gnd_id"] = gid
        if pd.notna(row.get('anmerkung')):
            entry["anmerkung"] = str(row['anmerkung']).strip()
        if pd.notna(row.get('komponist')):
            entry["komponist"] = str(row['komponist']).strip()
        lookup[name.lower()] = entry

    return lookup


# ---------------------------------------------------------------------------
# Objekte → Records
# ---------------------------------------------------------------------------

def convert_objekt(row: pd.Series, folio_col: str = None) -> dict:
    """Konvertiert ein Objekt zu JSON-LD Record"""
    sig = str(row['archivsignatur']).strip()
    folio_raw = row.get(folio_col) if folio_col else None
    folio = str(folio_raw).strip() if pd.notna(folio_raw) and str(folio_raw).strip() else None

    record = {
        "@id": create_record_id(sig, folio),
        "@type": "rico:Record",
        "rico:identifier": f"{sig} {folio}" if folio else sig
    }

    # Titel
    titel = normalize_str(row.get('titel'))
    if titel:
        record["rico:title"] = titel

    # Datum (bereinigt)
    date_val = clean_date(row.get('entstehungsdatum'))
    if date_val:
        record["rico:date"] = date_val

    # Dokumenttyp → m3gim-dft
    dokumenttyp = normalize_lower(row.get('dokumenttyp'))
    if dokumenttyp:
        dft = DOKUMENTTYP_TO_DFT.get(dokumenttyp)
        if dft:
            record["rico:hasDocumentaryFormType"] = {"@id": dft}

    # Sprache
    sprache = normalize_str(row.get('sprache'))
    if sprache:
        record["rico:hasOrHadLanguage"] = sprache

    # Umfang
    umfang = normalize_str(row.get('umfang'))
    if umfang:
        record["rico:hasExtent"] = umfang

    # Beschreibung
    beschreibung = normalize_str(row.get('beschreibung'))
    if beschreibung:
        record["rico:scopeAndContent"] = beschreibung

    # Bearbeitungsstand (m3gim-Extension)
    bearbeitungsstand = normalize_lower(row.get('bearbeitungsstand'))
    if bearbeitungsstand:
        # Normalisiere auf einheitliche Werte
        bs = bearbeitungsstand
        if 'vollst' in bs or bs == 'abgeschlossen' or bs.startswith('erledigt'):
            bearbeitungsstand = 'abgeschlossen'
        elif bs.startswith('begonnen'):
            bearbeitungsstand = 'begonnen'
        elif 'ckgestellt' in bs or 'zurück' in bs:
            bearbeitungsstand = 'zurueckgestellt'
        record["m3gim:bearbeitungsstand"] = bearbeitungsstand

    # Zugangs- und Scan-Status
    zugaenglichkeit = normalize_lower(row.get('zugaenglichkeit'))
    if zugaenglichkeit:
        record["m3gim:accessStatus"] = zugaenglichkeit

    scan_status = normalize_lower(row.get('scan_status'))
    if scan_status:
        record["m3gim:digitizationStatus"] = scan_status

    return record


# ---------------------------------------------------------------------------
# Konvolut-Hierarchie
# ---------------------------------------------------------------------------

def build_konvolut_hierarchy(df: pd.DataFrame, folio_col: str = None) -> tuple[list, list]:
    """Erkennt Konvolute und baut Hierarchie.

    Returns:
        records: Liste aller Records (Einzelobjekte + Folios)
        konvolute: Liste der Konvolut-RecordSets
    """
    records = []
    konvolut_members = {}  # {signatur: [record_ids]}

    for _, row in df.iterrows():
        if pd.isna(row.get('archivsignatur')) or str(row['archivsignatur']).strip() == "":
            continue
        # Template-Zeilen ueberspringen
        if str(row['archivsignatur']).strip().lower() == "beispiel":
            continue

        sig = str(row['archivsignatur']).strip()
        folio_raw = row.get(folio_col) if folio_col else None
        folio = str(folio_raw).strip() if pd.notna(folio_raw) and str(folio_raw).strip() else None

        record = convert_objekt(row, folio_col)
        records.append(record)

        # Track Konvolut-Zugehoerigkeit
        if folio:
            if sig not in konvolut_members:
                konvolut_members[sig] = []
            konvolut_members[sig].append(record["@id"])

    # Konvolut-RecordSets erzeugen
    konvolute = []
    for sig, member_ids in konvolut_members.items():
        konvolut = {
            "@id": create_record_id(sig),
            "@type": "rico:RecordSet",
            "rico:hasRecordSetType": {"@id": "rico:File"},
            "rico:identifier": sig,
            "rico:hasOrHadPart": [{"@id": mid} for mid in member_ids]
        }
        konvolute.append(konvolut)

    return records, konvolute


# ---------------------------------------------------------------------------
# Verknuepfungen → RiC-O Relations
# ---------------------------------------------------------------------------

def decompose_komposit_typ(typ: str) -> list[str]:
    """Zerlegt Komposit-Typ in Einzeltypen: 'ort, datum' → ['ort', 'datum']"""
    parts = [t.strip().lower() for t in typ.split(",")]
    # "waehrung" / "währung" ist kein eigener Typ, gehoert zum vorherigen
    return [p for p in parts if p not in ["waehrung", "währung"]]


def decompose_komposit_value(name: str, typen: list[str]) -> dict[str, str]:
    """Zerlegt einen Komposit-Wert in Einzelwerte fuer die Typen.

    Bei 'ort,datum'-Kompositen wie 'München, 1952-12-17':
    → {'ort': 'München', 'datum': '1952-12-17'}

    Fallback: gleicher Wert fuer alle Typen.
    """
    result = {t: name for t in typen}
    if not name or len(typen) < 2:
        return result

    # Pattern: "Ortsname, YYYY..." (Ort + Datum)
    if 'ort' in typen and 'datum' in typen:
        m = re.match(r'^(.+?),\s*(\d{4}.*)$', name)
        if m:
            result['ort'] = m.group(1).strip()
            result['datum'] = clean_date(m.group(2).strip())

    return result


def process_verknuepfungen(df: pd.DataFrame, indices: dict) -> dict:
    """Verarbeitet Verknuepfungen und gruppiert nach Signatur.

    Returns:
        dict: {signatur_or_objekt_id: [relation_dicts]}
    """
    relations = {}

    for _, row in df.iterrows():
        sig = row.get('archivsignatur')
        if pd.isna(sig) or str(sig).strip() == "":
            continue
        sig_str = str(sig).strip()
        if sig_str.lower() == "beispiel":
            continue

        # Folio-Feld pruefen (Spalte heisst oft "Folio" in Verknuepfungen)
        folio = None
        for col in ['Folio', 'folio', 'Unnamed: 1']:
            if col in df.columns:
                folio_raw = row.get(col)
                if pd.notna(folio_raw) and str(folio_raw).strip():
                    folio = str(folio_raw).strip()
                break

        # Objekt-ID: signatur + folio
        objekt_id = f"{sig_str} {folio}" if folio else sig_str

        typ = normalize_lower(row.get('typ'))
        name = normalize_str(row.get('name'))
        rolle = normalize_lower(row.get('rolle'))
        datum = clean_date(row.get('datum') if 'datum' in df.columns else None)
        anmerkung = normalize_str(row.get('anmerkung'))

        if typ is None:
            continue

        # Komposit-Typen decomponieren
        typen = decompose_komposit_typ(typ) if "," in typ else [typ]
        # Komposit-Werte decomponieren (z.B. "München, 1952-12-17" → Ort + Datum)
        decomposed = decompose_komposit_value(name, typen) if len(typen) > 1 else {}

        for t in typen:
            rel_name = decomposed.get(t, name) if decomposed else name
            rel = {
                "typ": t,
                "name": rel_name,
                "rolle": rolle,
                "datum": decomposed.get('datum', datum) if t == 'datum' else datum,
                "anmerkung": anmerkung
            }

            # Wikidata-URI aus Index anreichern
            index_map = {
                'person': 'person',
                'institution': 'organisation',
                'ort': 'ort',
                'werk': 'werk'
            }
            if t in index_map and name:
                lookup = indices.get(index_map[t], {})
                match = lookup.get(name.lower())
                if match and 'wikidata_id' in match:
                    rel["wikidata_id"] = match["wikidata_id"]
                if match and 'komponist' in match:
                    rel["komponist"] = match["komponist"]

            if objekt_id not in relations:
                relations[objekt_id] = []
            relations[objekt_id].append(rel)

    return relations


def add_relations_to_records(records: list, relations: dict):
    """Fuegt Verknuepfungen als RiC-O/m3gim Properties zu Records hinzu"""
    for record in records:
        identifier = record.get("rico:identifier")
        if not identifier or identifier not in relations:
            continue

        agents = []
        locations = []
        subjects = []
        dates = []
        mentions = []
        roles = []

        for rel in relations[identifier]:
            t = rel["typ"]
            name = rel.get("name")
            if not name:
                continue

            # Basis-Entry mit Name
            entry = {"name": name}
            wid = rel.get("wikidata_id", "")
            if wid and re.match(r'^Q\d+$', wid):
                entry["@id"] = f"wd:{wid}"
            if rel.get("rolle"):
                entry["role"] = rel["rolle"]

            if t == "person":
                rolle_lower = (rel.get("rolle") or "").lower()
                if rolle_lower in ["erwähnt", "erwaehnt", "erwähnt"]:
                    mentions.append(entry)
                else:
                    entry["@type"] = "rico:Person"
                    agents.append(entry)

            elif t == "institution":
                entry["@type"] = "rico:CorporateBody"
                agents.append(entry)

            elif t == "ensemble":
                entry["@type"] = "rico:Group"
                agents.append(entry)

            elif t == "ort":
                locations.append(entry)

            elif t == "werk":
                entry["@type"] = "m3gim:MusicalWork"
                if rel.get("komponist"):
                    entry["komponist"] = rel["komponist"]
                subjects.append(entry)

            elif t == "ereignis":
                if rel.get("datum"):
                    entry["date"] = rel["datum"]
                subjects.append(entry)

            elif t == "rolle":
                roles.append({"name": name, "role": rel.get("rolle")})

            elif t == "datum":
                date_val = clean_date(rel.get("datum") or name)
                if date_val:
                    dates.append(date_val)

            elif t == "detail":
                # Details als Key-Value-Paar
                if rel.get("rolle"):
                    record[f"m3gim:{name}"] = rel["rolle"]

            elif t in ["ausgaben", "einnahmen", "summe"]:
                # Finanz-Informationen
                if rel.get("rolle"):
                    record[f"m3gim:{t}"] = f"{name} {rel['rolle']}"
                else:
                    record[f"m3gim:{t}"] = name

        # Properties setzen (nur wenn nicht leer)
        if agents:
            record["rico:hasOrHadAgent"] = agents if len(agents) > 1 else agents[0]
        if locations:
            record["rico:hasOrHadLocation"] = locations if len(locations) > 1 else locations[0]
        if subjects:
            record["rico:hasOrHadSubject"] = subjects if len(subjects) > 1 else subjects[0]
        if mentions:
            record["m3gim:mentions"] = mentions if len(mentions) > 1 else mentions[0]
        if dates:
            record["rico:isAssociatedWithDate"] = dates if len(dates) > 1 else dates[0]
        if roles:
            record["m3gim:hasPerformanceRole"] = roles if len(roles) > 1 else roles[0]


# ---------------------------------------------------------------------------
# Hauptfunktion
# ---------------------------------------------------------------------------

def main():
    """Hauptfunktion"""
    print("=" * 60)
    print("M³GIM Transform (RiC-O JSON-LD)")
    print("=" * 60)

    # Indizes laden
    print("\nLade Indizes...")
    indices = {}
    for name, key in [("Personenindex", "person"), ("Organisationsindex", "organisation"),
                       ("Ortsindex", "ort"), ("Werkindex", "werk")]:
        df = load_index(name)
        if df is not None:
            indices[key] = build_index_lookup(df)
            print(f"  {name}: {len(indices[key])} Eintraege")
        else:
            print(f"  WARNUNG: {name} nicht gefunden")

    # Objekte laden
    objekte_path = SHEETS_DIR / "M3GIM-Objekte.xlsx"
    if not objekte_path.exists():
        print(f"\nFEHLER: {objekte_path} nicht gefunden")
        return 1

    print(f"\nLade {objekte_path.name}...")
    df_objekte = pd.read_excel(objekte_path)
    # Spaltennamen normalisieren (Excel hat gemischte Gross-/Kleinschreibung)
    df_objekte.columns = [c.lower().strip() if isinstance(c, str) else c
                          for c in df_objekte.columns]

    # Folio-Spalte erkennen
    folio_col = None
    for col in df_objekte.columns:
        if col.lower() in ['folio'] or 'unnamed' in col.lower():
            # Pruefen ob die Spalte Folio-artige Werte hat
            sample = df_objekte[col].dropna().astype(str).head(5)
            if any(re.match(r'^\d+_\d+$', s.strip()) or s.strip().startswith('fol.') for s in sample):
                folio_col = col
                break
    if folio_col:
        print(f"  Folio-Spalte erkannt: '{folio_col}'")

    # Konvolut-Hierarchie bauen
    records, konvolute = build_konvolut_hierarchy(df_objekte, folio_col)
    print(f"  {len(records)} Records, {len(konvolute)} Konvolute")

    # Verknuepfungen laden
    verk_path = SHEETS_DIR / "M3GIM-Verknüpfungen.xlsx"
    if not verk_path.exists():
        verk_path = SHEETS_DIR / "M3GIM-Verknuepfungen.xlsx"

    relations = {}
    if verk_path.exists():
        print(f"\nLade {verk_path.name}...")
        df_verk = pd.read_excel(verk_path)
        relations = process_verknuepfungen(df_verk, indices)
        total_rels = sum(len(v) for v in relations.values())
        print(f"  {total_rels} Verknuepfungen fuer {len(relations)} Objekte")

        # Relations zu Records hinzufuegen
        add_relations_to_records(records, relations)
        # Relations auch zu Konvolut-Records (falls Verknuepfungen am Konvolut haengen)
        add_relations_to_records(konvolute, relations)

    # Gesamtbestand als Fonds
    fonds = {
        "@id": "m3gim:UAKUG_NIM",
        "@type": "rico:RecordSet",
        "rico:hasRecordSetType": {"@id": "rico:Fonds"},
        "rico:identifier": "UAKUG/NIM",
        "rico:title": "Teilnachlass Ira Malaniuk",
        "rico:hasOrHadPart": []
    }

    # Konvolute gehoeren zum Fonds
    for k in konvolute:
        fonds["rico:hasOrHadPart"].append({"@id": k["@id"]})

    # Einzelobjekte (nicht in Konvoluten) gehoeren direkt zum Fonds
    konvolut_sigs = {k["rico:identifier"] for k in konvolute}
    konvolut_member_ids = set()
    for k in konvolute:
        for part in k.get("rico:hasOrHadPart", []):
            konvolut_member_ids.add(part["@id"])

    for r in records:
        if r["@id"] not in konvolut_member_ids:
            fonds["rico:hasOrHadPart"].append({"@id": r["@id"]})

    # JSON-LD Dokument
    graph = [fonds] + konvolute + records

    jsonld = {
        "@context": CONTEXT,
        "@graph": graph,
        "m3gim:exportDate": datetime.now().isoformat(),
        "m3gim:recordCount": len(records),
        "m3gim:konvolutCount": len(konvolute)
    }

    # Speichern
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "m3gim.jsonld"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(jsonld, f, ensure_ascii=False, indent=2)

    print()
    print("=" * 60)
    print(f"Export abgeschlossen")
    print(f"  Records:    {len(records)}")
    print(f"  Konvolute:  {len(konvolute)}")
    print(f"  Fonds:      1")
    print(f"  Graph:      {len(graph)} Entitaeten")
    print(f"  Ausgabe:    {output_path}")
    size_kb = output_path.stat().st_size / 1024
    print(f"  Groesse:    {size_kb:.1f} KB")
    print("=" * 60)


if __name__ == "__main__":
    exit(main() or 0)
