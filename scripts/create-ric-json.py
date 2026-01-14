#!/usr/bin/env python3
"""
M³GIM JSON-LD Export
Erzeugt JSON-LD Daten im Records in Contexts (RiC-O) Format.
"""

import pandas as pd
import json
from pathlib import Path
from datetime import datetime

# Pfade
BASE_DIR = Path(__file__).parent.parent
SHEETS_DIR = BASE_DIR / "data" / "google-spreadsheet"
OUTPUT_DIR = BASE_DIR / "data" / "output"

# JSON-LD Context
CONTEXT = {
    "rico": "https://www.ica.org/standards/RiC/ontology#",
    "m3gim": "https://dhcraft.org/m3gim/vocab#",
    "wd": "http://www.wikidata.org/entity/",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
}

# Dokumenttyp-Mapping zu RiC DocumentaryFormType
DOKUMENTTYP_TO_RIC = {
    "korrespondenz": "rico:Letter",
    "vertrag": "rico:Contract",
    "presse": "rico:Article",
    "programm": "rico:Program",
    "plakat": "rico:Poster",
    "tontraeger": "rico:AudioVisualRecord",
    "autobiografie": "rico:Autobiography",
    "identitaetsdokument": "rico:IdentityDocument",
    "studienunterlagen": "rico:EducationalRecord",
    "repertoire": "rico:List",
    "sammlung": "rico:Collection"
}


def create_record_id(signatur: str) -> str:
    """Erzeugt URI aus Signatur"""
    # UAKUG/NIM_028 -> m3gim:NIM_028
    clean = signatur.replace("UAKUG/", "").replace("/", "_")
    return f"m3gim:{clean}"


def convert_objekt(row: pd.Series) -> dict:
    """Konvertiert ein Objekt zu JSON-LD"""
    record = {
        "@id": create_record_id(row['archivsignatur']),
        "@type": "rico:Record",
        "rico:identifier": row['archivsignatur']
    }

    # Titel
    if pd.notna(row.get('titel')):
        record["rico:title"] = str(row['titel'])

    # Datum
    if pd.notna(row.get('entstehungsdatum')):
        record["rico:date"] = str(row['entstehungsdatum'])

    # Dokumenttyp
    dokumenttyp = row.get('dokumenttyp')
    if pd.notna(dokumenttyp):
        ric_type = DOKUMENTTYP_TO_RIC.get(str(dokumenttyp).lower(), "rico:Record")
        record["rico:hasDocumentaryFormType"] = {"@id": ric_type}

    # Sprache
    if pd.notna(row.get('sprache')):
        record["rico:hasLanguage"] = str(row['sprache'])

    # Umfang
    if pd.notna(row.get('umfang')):
        record["rico:hasExtent"] = str(row['umfang'])

    # Zugänglichkeit
    if pd.notna(row.get('zugaenglichkeit')):
        record["m3gim:accessStatus"] = str(row['zugaenglichkeit'])

    # Scan-Status
    if pd.notna(row.get('scan_status')):
        record["m3gim:digitizationStatus"] = str(row['scan_status'])

    return record


def convert_foto(row: pd.Series) -> dict:
    """Konvertiert ein Foto zu JSON-LD"""
    record = {
        "@id": create_record_id(row['archivsignatur']),
        "@type": ["rico:Record", "rico:Photograph"],
        "rico:identifier": row['archivsignatur']
    }

    # Titel
    if pd.notna(row.get('titel')):
        record["rico:title"] = str(row['titel'])

    # Datum
    if pd.notna(row.get('entstehungsdatum')):
        record["rico:date"] = str(row['entstehungsdatum'])

    # Beschreibung
    if pd.notna(row.get('beschreibung')):
        record["rico:scopeAndContent"] = str(row['beschreibung'])

    # Fotograf
    if pd.notna(row.get('fotograf')):
        record["rico:hasCreator"] = str(row['fotograf'])

    # Format
    if pd.notna(row.get('format')):
        record["rico:hasExtent"] = str(row['format'])

    # Fototyp
    if pd.notna(row.get('fototyp')):
        record["m3gim:photoType"] = str(row['fototyp'])

    # Aufnahmeort
    if pd.notna(row.get('aufnahmeort')):
        record["rico:hasOrHadLocation"] = str(row['aufnahmeort'])

    # Filename
    if pd.notna(row.get('filename')):
        record["m3gim:filename"] = str(row['filename'])

    return record


def load_index(name: str, id_field: str = 'm3gim_id') -> dict:
    """Lädt einen Index und erstellt Lookup-Dictionary"""
    path = SHEETS_DIR / f"M3GIM-{name}.xlsx"
    if not path.exists():
        return {}

    df = pd.read_excel(path)
    lookup = {}
    for _, row in df.iterrows():
        if pd.notna(row.get('name')) or pd.notna(row.get('titel')):
            name_val = row.get('name') or row.get('titel')
            entry = {
                "@id": f"m3gim:{row[id_field]}",
                "name": str(name_val)
            }
            if pd.notna(row.get('wikidata_id')):
                entry["sameAs"] = f"wd:{row['wikidata_id']}"
            lookup[str(name_val)] = entry
    return lookup


def convert_verknuepfungen(df: pd.DataFrame, indices: dict) -> dict:
    """Gruppiert Verknüpfungen nach Signatur und konvertiert zu JSON-LD"""
    relations = {}

    for _, row in df.iterrows():
        sig = row.get('archivsignatur')
        if pd.isna(sig):
            continue

        sig = str(sig)
        if sig not in relations:
            relations[sig] = []

        typ = str(row.get('typ', ''))
        name = str(row.get('name', ''))
        rolle = str(row.get('rolle', ''))

        rel = {
            "type": typ,
            "name": name,
            "role": rolle
        }

        # Datum bei Ereignissen
        if pd.notna(row.get('datum')):
            rel["date"] = str(row['datum'])

        # Anmerkung
        if pd.notna(row.get('anmerkung')):
            rel["note"] = str(row['anmerkung'])

        # Wikidata-Referenz aus Index
        if typ in indices and name in indices[typ]:
            if 'sameAs' in indices[typ][name]:
                rel["sameAs"] = indices[typ][name]["sameAs"]

        relations[sig].append(rel)

    return relations


def add_relations_to_records(records: list, relations: dict):
    """Fügt Verknüpfungen zu Records hinzu"""
    for record in records:
        sig = record.get("rico:identifier")
        if sig and sig in relations:
            subjects = []
            locations = []
            agents = []

            for rel in relations[sig]:
                if rel["type"] == "person":
                    entry = {"name": rel["name"], "role": rel["role"]}
                    if "sameAs" in rel:
                        entry["@id"] = rel["sameAs"]
                    agents.append(entry)

                elif rel["type"] == "ort":
                    entry = {"name": rel["name"], "role": rel["role"]}
                    if "sameAs" in rel:
                        entry["@id"] = rel["sameAs"]
                    locations.append(entry)

                elif rel["type"] == "institution":
                    entry = {"name": rel["name"], "role": rel["role"]}
                    if "sameAs" in rel:
                        entry["@id"] = rel["sameAs"]
                    agents.append(entry)

                elif rel["type"] == "werk":
                    entry = {"name": rel["name"]}
                    if "sameAs" in rel:
                        entry["@id"] = rel["sameAs"]
                    subjects.append(entry)

                elif rel["type"] == "ereignis":
                    entry = {"name": rel["name"], "type": rel["role"]}
                    if "date" in rel:
                        entry["date"] = rel["date"]
                    subjects.append(entry)

                elif rel["type"] == "detail":
                    # Details als Key-Value
                    record[f"m3gim:{rel['name']}"] = rel["role"]

            if subjects:
                record["rico:hasOrHadSubject"] = subjects
            if locations:
                record["rico:hasOrHadLocation"] = locations
            if agents:
                record["rico:hasOrHadAgent"] = agents


def main():
    """Hauptfunktion"""
    print("=" * 60)
    print("M³GIM JSON-LD Export (RiC-O)")
    print("=" * 60)

    records = []

    # Indizes laden
    print("Lade Indizes...")
    indices = {
        "person": load_index("Personenindex"),
        "ort": load_index("Ortsindex"),
        "institution": load_index("Organisationsindex"),
        "werk": load_index("Werkindex")
    }

    # Objekte laden
    objekte_path = SHEETS_DIR / "M3GIM-Objekte.xlsx"
    if objekte_path.exists():
        print(f"Exportiere {objekte_path.name}...")
        df_objekte = pd.read_excel(objekte_path)
        for _, row in df_objekte.iterrows():
            if pd.notna(row.get('archivsignatur')):
                records.append(convert_objekt(row))
        print(f"  {len(df_objekte)} Objekte")

    # Fotos laden
    fotos_path = SHEETS_DIR / "M3GIM-Fotos.xlsx"
    if fotos_path.exists():
        print(f"Exportiere {fotos_path.name}...")
        df_fotos = pd.read_excel(fotos_path)
        for _, row in df_fotos.iterrows():
            if pd.notna(row.get('archivsignatur')):
                records.append(convert_foto(row))
        print(f"  {len(df_fotos)} Fotos")

    # Verknüpfungen laden und zuordnen
    verk_path = SHEETS_DIR / "M3GIM-Verknüpfungen.xlsx"
    if verk_path.exists():
        print(f"Verarbeite {verk_path.name}...")
        df_verk = pd.read_excel(verk_path)
        relations = convert_verknuepfungen(df_verk, indices)
        add_relations_to_records(records, relations)
        print(f"  {len(df_verk)} Verknüpfungen")

    # JSON-LD Dokument erstellen
    jsonld = {
        "@context": CONTEXT,
        "@graph": records,
        "m3gim:exportDate": datetime.now().isoformat(),
        "m3gim:recordCount": len(records)
    }

    # Speichern
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "m3gim.jsonld"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(jsonld, f, ensure_ascii=False, indent=2)

    print()
    print("=" * 60)
    print(f"Export abgeschlossen")
    print(f"  Records: {len(records)}")
    print(f"  Ausgabe: {output_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
