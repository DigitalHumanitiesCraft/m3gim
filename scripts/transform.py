#!/usr/bin/env python3
"""
M³GIM Transform — Step 3 der Pipeline.

Erzeugt JSON-LD im RiC-O 1.1 Format mit m3gim-Erweiterungen.
Liest Google Sheets Exporte, normalisiert Daten, baut Konvolut-Hierarchie,
matched Verknuepfungen gegen Indizes.

Normalisierungsschritte:
    1. Spaltennamen: .lower().strip() (Excel hat gemischte Gross-/Kleinschreibung)
    2. Header-Shift-Korrektur: 3 Indizes (Org, Ort, Werk) haben verschobene Header
    3. String-Werte: .strip() (Leerzeichen), .lower() fuer Vokabularfelder
    4. Datumsfelder: Excel-Artefakte entfernen ("1958-04-18 00:00:00" → "1958-04-18")
    5. Dokumenttyp: Mapping deutsch → m3gim-dft SKOS-Konzept (25 Typen)
    6. Bearbeitungsstand: Varianten normalisieren (vollstaendig/Erledigt → abgeschlossen)
    7. Komposit-Typen: "ort,datum" decomponieren in separate Relationen
    8. Komposit-Werte: "Muenchen, 1952-12-17" → Ort + Datum getrennt
    9. Rollen: .lower() fuer konsistente Kleinschreibung
   10. Wikidata-IDs: Regex-Validierung ^Q\d+$ (verhindert falsche URIs)

Verwendung:
    python scripts/transform.py
"""

import os
import sys
import re
import json
import pandas as pd
from pathlib import Path
from datetime import datetime

from _common import attach_xlsx_source, build_xlsx_source, is_approved_match

# Windows-Konsole: UTF-8 erzwingen
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent.parent
SHEETS_DIR = Path(os.environ.get("M3GIM_SHEETS_DIR", BASE_DIR / "data" / "google-spreadsheet"))
OUTPUT_DIR = Path(os.environ.get("M3GIM_OUTPUT_DIR", BASE_DIR / "data" / "output"))

# ---------------------------------------------------------------------------
# JSON-LD Context
# ---------------------------------------------------------------------------

CONTEXT = {
    "rico": "https://www.ica.org/standards/RiC/ontology#",
    "m3gim": "https://dhcraft.org/m3gim/vocab#",
    "m3gim-dft": "https://dhcraft.org/m3gim/documentaryFormTypes#",
    "m3gim-role": "https://dhcraft.org/m3gim/roles#",
    "agrelon": "https://d-nb.info/standards/elementset/agrelon#",
    "wd": "http://www.wikidata.org/entity/",
    "owl": "http://www.w3.org/2002/07/owl#",
    "geo": "http://www.w3.org/2003/01/geo/wgs84_pos#",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    # Inline-Property-Aliase: bare keys → qualifizierte URIs
    "name": "rico:name",
    "role": "m3gim:role",
    "komponist": "m3gim:komponist"
}

# Mapping Datierungsevidenz → Konfidenz (data.md § 9)
EVIDENZ_TO_CONFIDENCE = {
    "aus_dokument": "1.0",
    "erschlossen": "0.6",
    "extern": "0.8",
    "unbekannt": "0.0",
}

# Mapping (typ, rolle) → AgRelOn-Klasse + -Property (data.md § 8.3, Phase 4.8).
# Die Pipeline erzeugt zusaetzlich zur normalen Agent-Relation eine agrelon-
# Relation mit Provenance auf den Record.
AGRELON_MAPPING = {
    # (typ, rolle) -> (agrelon_class, agrelon_property_on_subject)
    ("institution", "arbeitgeber"): ("agrelon:HasEmployeeEmployer", "agrelon:hasEmployer"),
    ("person", "absender"):          ("agrelon:HasCorrespondent",    "agrelon:hasCorrespondent"),
    ("person", "empfänger"):         ("agrelon:HasCorrespondent",    "agrelon:hasCorrespondent"),
    ("person", "adressat"):          ("agrelon:HasCorrespondent",    "agrelon:hasCorrespondent"),
    ("person", "agent"):             ("agrelon:HasProfessionalContact", "agrelon:hasProfessionalContact"),
    ("person", "vermittler"):        ("agrelon:HasProfessionalContact", "agrelon:hasProfessionalContact"),
    ("person", "auftraggeber"):      ("agrelon:HasIsPatron",         "agrelon:hasPatron"),
    ("institution", "ausbildungsstätte"): ("agrelon:HasIsMember",    "agrelon:isMemberOf"),
}


# Mapping Datumsrolle → typisierte m3gim-Property (data.md § 7, Phase 4.7).
# Rollen ohne Eintrag landen im generischen Fallback m3gim:eventDate.
DATUMSROLLE_TO_PROPERTY = {
    "absendedatum": "m3gim:absendedatum",
    "empfangsdatum": "m3gim:empfangsdatum",
    "ausstellungsdatum": "m3gim:ausstellungsdatum",
    "erscheinungsdatum": "m3gim:erscheinungsdatum",
    "abreisedatum": "m3gim:abreisedatum",
    "auftritt": "m3gim:auftrittsdatum",
    "aufführung": "m3gim:auffuehrungsdatum",
    "probe": "m3gim:probendatum",
    "probenbeginn": "m3gim:probenbeginn",
    "premiere": "m3gim:premieredatum",
    "ausstrahlung": "m3gim:ausstrahlungsdatum",
    "spielzeit": "m3gim:spielzeitVon",
    "überweisung": "m3gim:ueberweisungsdatum",
    "gespräch": "m3gim:gespraechsdatum",
}

# ---------------------------------------------------------------------------
# Dokumenttyp-Mapping (deutsch → m3gim-dft)
# ---------------------------------------------------------------------------

DOKUMENTTYP_TO_DFT = {
    # Korrespondenz-Hierarchie
    "korrespondenz": "m3gim-dft:korrespondenz",
    "brief": "m3gim-dft:brief",
    "postkarte": "m3gim-dft:postkarte",
    "telegramm": "m3gim-dft:telegramm",
    # Presse-Hierarchie
    "presse": "m3gim-dft:presse",
    "zeitungsausschnitt": "m3gim-dft:zeitungsausschnitt",
    "kritik": "m3gim-dft:kritik",
    "rezension": "m3gim-dft:rezension",
    # Programm-Hierarchie
    "programm": "m3gim-dft:programm",
    "programmheft": "m3gim-dft:programmheft",
    "konzertprogramm": "m3gim-dft:programmheft",
    # Biographisch-Hierarchie
    "biographisch": "m3gim-dft:biographisch",
    "biographie": "m3gim-dft:biographie",
    "autobiografie": "m3gim-dft:autobiografie",
    "lebenslauf": "m3gim-dft:lebenslauf",
    # Identitaetsdokument-Hierarchie
    "identitaetsdokument": "m3gim-dft:identitaetsdokument",
    "ausweis": "m3gim-dft:ausweis",
    # Konvolut-Aggregate
    "sammlung": "m3gim-dft:konvolut",
    "konvolut": "m3gim-dft:konvolut",
    # Flache Typen
    "vertrag": "m3gim-dft:vertrag",
    "plakat": "m3gim-dft:plakat",
    "tontraeger": "m3gim-dft:tontraeger",
    "studienunterlagen": "m3gim-dft:dokument",
    "repertoire": "m3gim-dft:repertoireliste",
    "repertoireliste": "m3gim-dft:repertoireliste",
    "tagebuch": "m3gim-dft:tagebuch",
    "notizbuch": "m3gim-dft:notiz",
    "notiz": "m3gim-dft:notiz",
    "urkunde": "m3gim-dft:urkunde",
    "zeugnis": "m3gim-dft:urkunde",
    "widmung": "m3gim-dft:dokument",
    "photokopie": "m3gim-dft:photokopie",
    "quittung": "m3gim-dft:quittung",
    "typoskript": "m3gim-dft:typoskript",
    "visitenkarte": "m3gim-dft:visitenkarte",
    "noten": "m3gim-dft:noten",
    "dokument": "m3gim-dft:dokument",
    "sonstiges": "m3gim-dft:sonstiges",
}

# SKOS-Hierarchie fuer m3gim-dft (data.md Abschnitt 12).
# Jeder Key ist ein Konzept, der Wert sein direkter Oberbegriff (skos:broader).
# Konzepte ohne Eintrag sind Top-Level (broader = dokument).
DFT_BROADER = {
    "brief": "korrespondenz",
    "postkarte": "korrespondenz",
    "telegramm": "korrespondenz",
    "zeitungsausschnitt": "presse",
    "kritik": "presse",
    "rezension": "presse",
    "programmheft": "programm",
    "biographie": "biographisch",
    "autobiografie": "biographisch",
    "lebenslauf": "biographisch",
    "ausweis": "identitaetsdokument",
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


def build_dft_concepts(records: list) -> list:
    """Erzeugt SKOS-Concept-Knoten fuer alle tatsaechlich genutzten m3gim-dft-Begriffe.

    Fuegt skos:broader-Relation gemaess data.md Abschnitt 12 hinzu.
    Nur verwendete Konzepte werden emittiert (sparsamer Graph).
    Transitive Elternbegriffe werden mitgenommen (z.B. "brief" zieht
    "korrespondenz" mit ein).
    """
    used = set()
    for r in records:
        dft = r.get("rico:hasDocumentaryFormType")
        if isinstance(dft, dict):
            ident = dft.get("@id", "")
            if ident.startswith("m3gim-dft:"):
                used.add(ident.split(":", 1)[1])

    # Transitiv Elternbegriffe ergaenzen
    to_process = list(used)
    while to_process:
        concept = to_process.pop()
        broader = DFT_BROADER.get(concept)
        if broader and broader not in used:
            used.add(broader)
            to_process.append(broader)

    concepts = []
    for concept in sorted(used):
        node = {
            "@id": f"m3gim-dft:{concept}",
            "@type": "skos:Concept",
            "skos:prefLabel": concept,
        }
        if concept in DFT_BROADER:
            node["skos:broader"] = {"@id": f"m3gim-dft:{DFT_BROADER[concept]}"}
        concepts.append(node)
    return concepts


def normalize_role(value) -> str | None:
    """Normalisiert Rollenbezeichner: lower + strip + Gender-Suffix entfernen.

    Strippt :innen und :in (z.B. saenger:in -> saenger, dirigent:innen -> dirigent).
    Finales 'in' ohne Doppelpunkt wird nicht generell entfernt, da mehrdeutig
    (interpret, verfassen...); bei Bedarf ueber Stem-Allowlist erweiterbar.
    Siehe data.md Abschnitt 5.
    """
    v = normalize_lower(value)
    if v is None:
        return None
    for suffix in (":innen", ":in"):
        if v.endswith(suffix):
            v = v[: -len(suffix)]
            break
    return v


def clean_date(value) -> str | None:
    """Bereinigt Datumsartefakte (Excel 00:00:00) + normalisiert Zeitspannen.

    YYYY-YYYY (Spielzeit) wird zu YYYY/YYYY (ISO-8601 TimeSpan, data.md § 6).
    Freitext-Werte wie 'Wien, ab 1956' bleiben unveraendert — werden in der
    Pipeline per Pattern-Match herausgefiltert, bevor sie in typisierte
    Datumsproperties gelangen.
    """
    if pd.isna(value):
        return None
    s = str(value).strip()
    s = re.sub(r'\s+00:00:00$', '', s)
    if s == "":
        return None
    # YYYY-YYYY -> YYYY/YYYY (ISO-Konvention fuer Zeitspannen nur Jahre)
    s = re.sub(r'^(\d{4})-(\d{4})$', r'\1/\2', s)
    return s


# Pattern fuer akzeptierte typisierte Datumswerte: ISO-8601 + Zeitspanne + Qualifier
ISO_DATE_PATTERN = re.compile(
    r"^(circa:|vor:|nach:)?\d{4}(-\d{2}(-\d{2})?)?(/\d{4}(-\d{2}(-\d{2})?)?)?$"
)


def is_iso_date(value) -> bool:
    return isinstance(value, str) and bool(ISO_DATE_PATTERN.match(value))


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

def convert_objekt(row: pd.Series, folio_col: str = None,
                   xlsx_row: int | None = None) -> dict:
    """Konvertiert ein Objekt zu JSON-LD Record.

    xlsx_row: 1-basierte XLSX-Zeilennummer inkl. Header (= pandas idx + 2),
              wird als m3gim:xlsxSource angehaengt.
    """
    sig = str(row['archivsignatur']).strip()
    folio_raw = row.get(folio_col) if folio_col else None
    folio = str(folio_raw).strip() if pd.notna(folio_raw) and str(folio_raw).strip() else None

    record = {
        "@id": create_record_id(sig, folio),
        "@type": "rico:Record",
        "rico:identifier": f"{sig} {folio}" if folio else sig
    }

    if xlsx_row is not None:
        record["m3gim:xlsxSource"] = build_xlsx_source("Objekte", xlsx_row)

    # Titel
    titel = normalize_str(row.get('titel'))
    if titel:
        record["rico:title"] = titel

    # Datum (bereinigt)
    date_val = clean_date(row.get('entstehungsdatum'))
    if date_val:
        record["rico:date"] = date_val

    # Datierungsevidenz → agrelon:hasProvenance + agrelon:hasConfidenceValue
    # (data.md § 9, Phase 4.3)
    evidenz = normalize_lower(row.get('datierungsevidenz'))
    if evidenz and evidenz in EVIDENZ_TO_CONFIDENCE:
        # Provenance: Self-Reference auf den Record als Aussagequelle
        record["agrelon:hasProvenance"] = {"@id": record["@id"]}
        record["agrelon:hasConfidenceValue"] = {
            "@value": EVIDENZ_TO_CONFIDENCE[evidenz],
            "@type": "xsd:decimal",
        }

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

    for idx, row in df.iterrows():
        if pd.isna(row.get('archivsignatur')) or str(row['archivsignatur']).strip() == "":
            continue
        # Template-Zeilen ueberspringen
        if str(row['archivsignatur']).strip().lower() == "beispiel":
            continue

        sig = str(row['archivsignatur']).strip()
        folio_raw = row.get(folio_col) if folio_col else None
        folio = str(folio_raw).strip() if pd.notna(folio_raw) and str(folio_raw).strip() else None

        # XLSX-Zeilennummer: pandas-Idx ist 0-basiert, XLSX hat Header in Zeile 1
        record = convert_objekt(row, folio_col, xlsx_row=int(idx) + 2)
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

# Fallback-Währung pro Archivsignatur-Präfix. Greift, wenn eine Zeile als
# "ausgaben, währung" / "einnahmen, währung" / "summe, währung" markiert ist,
# aber im Namensfeld nur eine Zahl ohne Suffix steht. Setzt eine Redaktions-
# entscheidung voraus — jeder Eintrag dokumentiert die inhaltliche Annahme.
#
# NIM_007 "Aufstellung 1966": Folio 5_1 hat fünf Zahlen ohne Währung
# (36000, 18000, 90000 ×2, 180000). Benachbarte Folien 5_2..5_8 sind
# konsistent in S (Schilling) ausgewiesen, daher S als Default.
FINANCE_CURRENCY_DEFAULTS = {
    "UAKUG/NIM_007": "S",
}


def _default_currency_for(signatur: str) -> str | None:
    """Liefert Default-Währung, falls die Archivsignatur ein bekanntes Präfix hat."""
    if not signatur:
        return None
    for prefix, curr in FINANCE_CURRENCY_DEFAULTS.items():
        if signatur.startswith(prefix):
            return curr
    return None


def parse_monetary_value(name: str) -> tuple[str | None, str | None]:
    """Zerlegt Finanz-Rohwert in (amount, currency).

    Erwartetes Format: 'AMOUNT[, CURRENCY]' wie '4000, ESC' / '631,50, Fr.' / '36000'.
    Dezimaltrenner: Komma (europaeisch). Ergebnis amount ist xsd:decimal-kompatibler
    String, currency bleibt Originalcode (keine ISO-4217-Normalisierung wegen
    Ambiguitaet, z.B. 'Fr' = FRF oder CHF). Siehe data.md Abschnitt 11.
    """
    if not name:
        return None, None
    s = str(name).strip()
    if not s:
        return None, None

    # Letztes Komma trennt Betrag und Waehrung
    if ',' in s:
        amount_str, currency = s.rsplit(',', 1)
        amount_str = amount_str.strip()
        currency = currency.strip().rstrip('.').strip() or None
    else:
        amount_str = s
        currency = None

    # Betrag parsen: Komma als Dezimaltrenner, Punkte als Tausendertrenner
    cleaned = amount_str.replace('.', '').replace(',', '.')
    try:
        amount_decimal = float(cleaned)
        if amount_decimal == int(amount_decimal):
            amount_out = str(int(amount_decimal))
        else:
            amount_out = f"{amount_decimal:g}"
    except ValueError:
        amount_out = None

    return amount_out, currency


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

    for idx, row in df.iterrows():
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
        rolle = normalize_role(row.get('rolle'))
        datum = clean_date(row.get('datum') if 'datum' in df.columns else None)
        anmerkung = normalize_str(row.get('anmerkung'))

        if typ is None:
            continue

        # Provenance: XLSX-Zeile + datenpunkt_id (falls vorhanden)
        xlsx_row = int(idx) + 2  # pandas idx 0-basiert, XLSX-Header in Zeile 1
        dp_raw = row.get('datenpunkt_id') if 'datenpunkt_id' in df.columns else None
        datenpunkt_id = None
        if pd.notna(dp_raw):
            try:
                datenpunkt_id = int(float(dp_raw))
            except (ValueError, TypeError):
                datenpunkt_id = str(dp_raw).strip() or None
        source_info = build_xlsx_source("Verknuepfungen", xlsx_row, datenpunkt_id)

        # Komposit-Typen decomponieren
        typen = decompose_komposit_typ(typ) if "," in typ else [typ]
        # Komposit-Werte decomponieren (z.B. "München, 1952-12-17" → Ort + Datum)
        decomposed = decompose_komposit_value(name, typen) if len(typen) > 1 else {}

        # Komposit ort,datum: zusaetzlich eine SpatiotemporalEvent-Relation emittieren
        # (data.md § 4, § 10, Phase 4.4). Die Event-Instanz wird in add_relations
        # als Top-Level-Entity gebaut.
        if 'ort' in typen and 'datum' in typen:
            ort_val = decomposed.get('ort')
            datum_val = decomposed.get('datum')
            if ort_val and datum_val and is_iso_date(datum_val):
                ste_rel = {
                    "typ": "spatiotemporal",
                    "name": ort_val,  # name wird als Event-Ort verwendet
                    "ort": ort_val,
                    "datum": datum_val,
                    "rolle": rolle,
                    "anmerkung": anmerkung,
                    "_source": source_info,
                }
                # Ortsindex-Lookup, damit der STE-Zweig in add_relations_to_records
                # Wikidata-Enrichment (Koordinaten, Land) auf das atPlace-Subobjekt
                # anwenden kann (Mobilitaets-Atlas-Vorarbeit).
                ort_lookup = indices.get("ort", {}).get(ort_val.strip().lower())
                if ort_lookup and 'wikidata_id' in ort_lookup:
                    ste_rel["wikidata_id"] = ort_lookup["wikidata_id"]
                relations.setdefault(objekt_id, []).append(ste_rel)

        for t in typen:
            rel_name = decomposed.get(t, name) if decomposed else name
            rel = {
                "typ": t,
                "name": rel_name,
                "rolle": rolle,
                "datum": decomposed.get('datum', datum) if t == 'datum' else datum,
                "anmerkung": anmerkung,
                "_source": source_info,
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
                match = lookup.get(name.strip().lower())
                if match and 'wikidata_id' in match:
                    rel["wikidata_id"] = match["wikidata_id"]
                if match and 'komponist' in match:
                    rel["komponist"] = match["komponist"]

            if objekt_id not in relations:
                relations[objekt_id] = []
            relations[objekt_id].append(rel)

    return relations


def _maybe_add_agrelon(record: dict, typ: str, rolle: str, agent_entry: dict,
                       rel: dict | None = None):
    """Emittiert eine agrelon:*-Relation, wenn (typ, rolle) in AGRELON_MAPPING.

    Die Relation haengt am Record (m3gim:agentRelation) und traegt als
    Provenance die Record-URI selbst. Der optionale ``rel``-Parameter ist die
    Quell-Verknuepfungszeile — sein ``_source`` wird als ``m3gim:xlsxSource``
    durchgereicht (technische Provenance).
    """
    mapping = AGRELON_MAPPING.get((typ, rolle))
    if not mapping:
        return
    agrelon_class, _prop = mapping
    rel_entry = {
        "@type": agrelon_class,
        "agrelon:hasObject": {"name": agent_entry.get("name")},
        "agrelon:hasProvenance": {"@id": record["@id"]},
    }
    # Agent-@id (wd:) durchreichen, falls vorhanden
    if agent_entry.get("@id"):
        rel_entry["agrelon:hasObject"]["@id"] = agent_entry["@id"]
    # Validity aus rico:date des Records als Heuristik (nur fuer HasEmployeeEmployer)
    if agrelon_class == "agrelon:HasEmployeeEmployer" and record.get("rico:date"):
        rel_entry["agrelon:hasValidityPeriod"] = {
            "agrelon:hasBeginDate": record["rico:date"][:4],
        }
    if rel is not None:
        attach_xlsx_source(rel_entry, rel)
    record.setdefault("m3gim:agentRelation", []).append(rel_entry)


def add_relations_to_records(records: list, relations: dict,
                             enrichment_data: dict | None = None) -> list:
    """Fuegt Verknuepfungen als RiC-O/m3gim Properties zu Records hinzu.

    Returns:
        list: Top-Level-Entities (m3gim:SpatiotemporalEvent-Instanzen),
        die dem Graph hinzugefuegt werden sollen.
    """
    if enrichment_data is None:
        enrichment_data = {}
    spatiotemporal_events = []
    event_counter = 0
    for record in records:
        identifier = record.get("rico:identifier")
        if not identifier or identifier not in relations:
            continue

        agents = []
        locations = []
        subjects = []
        dates = []
        typed_dates = {}  # property-URI -> list[str]
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
                entry["owl:sameAs"] = f"http://www.wikidata.org/entity/{wid}"
                # Enrichment-Properties injizieren
                enrich = enrichment_data.get(wid, {}).get("properties", {})
                if enrich:
                    _inject_enrichment(entry, enrich)
            if rel.get("rolle"):
                entry["role"] = rel["rolle"]
            attach_xlsx_source(entry, rel)

            if t == "person":
                rolle_lower = (rel.get("rolle") or "").lower()
                if rolle_lower in ["erwähnt", "erwaehnt", "erwähnt"]:
                    mentions.append(entry)
                else:
                    entry["@type"] = "rico:Person"
                    agents.append(entry)
                    _maybe_add_agrelon(record, t, rolle_lower, entry, rel=rel)

            elif t == "institution":
                entry["@type"] = "rico:CorporateBody"
                agents.append(entry)
                _maybe_add_agrelon(record, t, (rel.get("rolle") or "").lower(), entry, rel=rel)

            elif t == "ensemble":
                entry["@type"] = "rico:Group"
                agents.append(entry)

            elif t == "ort":
                # Skip date-like strings that leaked into locations
                if name and re.match(r'^\d{4}(-\d{2}){0,2}', name):
                    continue
                entry["@type"] = "rico:Place"
                locations.append(entry)

            elif t == "werk":
                entry["@type"] = "m3gim:MusicalWork"
                if rel.get("komponist"):
                    entry["komponist"] = rel["komponist"]
                subjects.append(entry)

            elif t == "ereignis":
                entry["@type"] = "m3gim:PerformanceEvent"
                if rel.get("datum"):
                    entry["date"] = rel["datum"]
                if not entry.get("role"):
                    entry["role"] = "rahmenveranstaltung"
                subjects.append(entry)

            elif t == "rolle":
                roles.append({"name": name, "role": rel.get("rolle")})

            elif t == "datum":
                date_val = clean_date(rel.get("datum") or name)
                if not date_val:
                    continue
                # Typisierte Datumsproperty je nach Rolle (data.md § 7, Phase 4.7).
                # Freitext-Werte (nicht-ISO) landen in generischem eventDate, damit
                # die typisierte Property rein ISO-konform bleibt.
                rolle_key = (rel.get("rolle") or "").strip().lower()
                prop = DATUMSROLLE_TO_PROPERTY.get(rolle_key)
                if prop and is_iso_date(date_val):
                    typed_dates.setdefault(prop, []).append(date_val)
                else:
                    dates.append(date_val)

            elif t == "detail":
                # Schicht-3-Detail als strukturiertes Objekt
                detail_entry = {
                    "@type": "m3gim:DetailAnnotation",
                    "m3gim:detailField": name
                }
                if rel.get("rolle"):
                    detail_entry["m3gim:detailValue"] = rel["rolle"]
                if rel.get("anmerkung"):
                    detail_entry["rico:generalDescription"] = rel["anmerkung"]
                attach_xlsx_source(detail_entry, rel)
                if "m3gim:hasDetail" not in record:
                    record["m3gim:hasDetail"] = []
                record["m3gim:hasDetail"].append(detail_entry)

            elif t == "spatiotemporal":
                # Phase 4.4: Komposit ort,datum -> m3gim:SpatiotemporalEvent
                # als Top-Level Graph-Entity mit Rueckverweis.
                event_counter += 1
                rec_local_id = record["@id"].split(":", 1)[-1]
                ev_id = f"m3gim:ste_{rec_local_id}_{event_counter}"
                # atPlace: wie reguläre rico:Place-Entries mit Q-ID + Enrichment
                # anreichern, sobald Reconciliation einen Treffer liefert.
                place_entry = {"name": rel["ort"]}
                wid = rel.get("wikidata_id", "")
                if wid and re.match(r'^Q\d+$', wid):
                    place_entry["@id"] = f"wd:{wid}"
                    place_entry["owl:sameAs"] = f"http://www.wikidata.org/entity/{wid}"
                    enrich = enrichment_data.get(wid, {}).get("properties", {})
                    if enrich:
                        _inject_enrichment(place_entry, enrich)
                ev = {
                    "@id": ev_id,
                    "@type": "m3gim:SpatiotemporalEvent",
                    "m3gim:atPlace": place_entry,
                    "m3gim:atDate": rel["datum"],
                    "rico:isAssociatedWithRecord": {"@id": record["@id"]},
                }
                role_val = rel.get("rolle")
                if role_val:
                    ev["m3gim:eventRole"] = role_val
                if rel.get("anmerkung"):
                    ev["rico:generalDescription"] = rel["anmerkung"]
                attach_xlsx_source(ev, rel)
                spatiotemporal_events.append(ev)
                record.setdefault("m3gim:hasSpatiotemporalEvent", []).append({"@id": ev_id})

            elif t in ["ausgaben", "einnahmen", "summe"]:
                # Finanz-Informationen als DetailAnnotation (data.md Abschnitt 11)
                amount, currency = parse_monetary_value(name)
                if currency is None and amount is not None:
                    currency = _default_currency_for(record.get("rico:identifier", ""))
                detail_entry = {
                    "@type": "m3gim:DetailAnnotation",
                    "m3gim:detailField": t,
                    "m3gim:detailValue": name,
                }
                if rel.get("rolle"):
                    detail_entry["m3gim:detailRole"] = rel["rolle"]
                if amount is not None:
                    detail_entry["m3gim:monetaryAmount"] = {
                        "@value": amount,
                        "@type": "xsd:decimal",
                    }
                if currency:
                    detail_entry["m3gim:currency"] = currency
                attach_xlsx_source(detail_entry, rel)
                if "m3gim:hasDetail" not in record:
                    record["m3gim:hasDetail"] = []
                record["m3gim:hasDetail"].append(detail_entry)

        # Erwähnte Personen → rico:hasOrHadSubject (statt m3gim:mentions)
        # Sie werden als rico:Person mit role "erwähnt" modelliert
        for m in mentions:
            m["@type"] = "rico:Person"
            subjects.append(m)

        # Properties setzen (nur wenn nicht leer)
        if agents:
            record["m3gim:hasAssociatedAgent"] = agents if len(agents) > 1 else agents[0]
        if locations:
            record["rico:hasOrHadLocation"] = locations if len(locations) > 1 else locations[0]
        if subjects:
            record["rico:hasOrHadSubject"] = subjects if len(subjects) > 1 else subjects[0]
        if dates:
            record["m3gim:eventDate"] = dates if len(dates) > 1 else dates[0]
        # Typisierte Datumsproperties (data.md § 7, Phase 4.7)
        for prop, vals in typed_dates.items():
            record[prop] = vals if len(vals) > 1 else vals[0]
        if roles:
            record["m3gim:hasPerformanceRole"] = roles if len(roles) > 1 else roles[0]

        # Normalize detail arrays (single → unwrap)
        if "m3gim:hasDetail" in record:
            details = record["m3gim:hasDetail"]
            if len(details) == 1:
                record["m3gim:hasDetail"] = details[0]
        if "m3gim:hasSpatiotemporalEvent" in record:
            evs = record["m3gim:hasSpatiotemporalEvent"]
            if len(evs) == 1:
                record["m3gim:hasSpatiotemporalEvent"] = evs[0]

    return spatiotemporal_events


# ---------------------------------------------------------------------------
# Enrichment-Injection
# ---------------------------------------------------------------------------

def _inject_enrichment(entry: dict, props: dict):
    """Injiziert Wikidata-Enrichment-Properties in eine Entitaet."""
    # Personen
    if "occupation" in props:
        labels = [o.get("label", o.get("qid", "")) for o in props["occupation"]
                  if isinstance(o, dict)]
        if labels:
            entry["m3gim:occupation"] = labels
    if "voiceType" in props:
        items = props["voiceType"]
        if isinstance(items, list) and items:
            entry["m3gim:voiceType"] = items[0].get("label", "") if isinstance(items[0], dict) else str(items[0])
        elif isinstance(items, dict):
            entry["m3gim:voiceType"] = items.get("label", "")
    if "birthDate" in props:
        entry["m3gim:birthDate"] = props["birthDate"]
    if "deathDate" in props:
        entry["m3gim:deathDate"] = props["deathDate"]
    if "birthPlace" in props:
        bp = props["birthPlace"]
        if isinstance(bp, dict):
            entry["m3gim:birthPlace"] = bp.get("label", bp.get("qid", ""))
    if "deathPlace" in props:
        dp = props["deathPlace"]
        if isinstance(dp, dict):
            entry["m3gim:deathPlace"] = dp.get("label", dp.get("qid", ""))

    # Orte
    if "coordinates" in props:
        coords = props["coordinates"]
        if isinstance(coords, dict) and "lat" in coords:
            entry["geo:lat"] = coords["lat"]
            entry["geo:long"] = coords["lon"]
    if "country" in props:
        c = props["country"]
        if isinstance(c, dict):
            entry["m3gim:country"] = c.get("label", c.get("qid", ""))

    # Werke
    if "composer" in props:
        c = props["composer"]
        if isinstance(c, dict):
            entry["m3gim:wdComposer"] = c.get("label", c.get("qid", ""))
    if "genre" in props:
        items = props["genre"]
        if isinstance(items, list) and items:
            entry["m3gim:wdGenre"] = [g.get("label", "") for g in items if isinstance(g, dict)]
        elif isinstance(items, dict):
            entry["m3gim:wdGenre"] = items.get("label", "")
    if "premiereDate" in props:
        entry["m3gim:premiereDate"] = props["premiereDate"]
    elif "publicationDate" in props:
        entry["m3gim:premiereDate"] = props["publicationDate"]

    # Organisationen
    if "location" in props:
        loc = props["location"]
        if isinstance(loc, dict):
            entry["m3gim:wdLocation"] = loc.get("label", loc.get("qid", ""))
    if "inception" in props:
        entry["m3gim:inception"] = props["inception"]


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

    # Reconciliation-Ergebnisse als Fallback laden.
    # Konservative Policy: fuzzy_low nur uebernehmen, wenn manuell approved.
    recon_path = OUTPUT_DIR / "wikidata-reconciliation.json"
    recon_count = 0
    recon_low_skipped = 0
    if recon_path.exists():
        with open(recon_path, "r", encoding="utf-8") as f:
            recon_data = json.load(f)
        type_map = {"person": "person", "org": "organisation",
                     "location": "ort", "work": "werk"}
        for match in recon_data.get("matched", []):
            etype = type_map.get(match.get("type"))
            if not etype or etype not in indices:
                continue
            if not is_approved_match(match):
                recon_low_skipped += 1
                continue
            name_key = match["name"].strip().lower()
            if name_key in indices[etype]:
                entry = indices[etype][name_key]
                if "wikidata_id" not in entry:
                    entry["wikidata_id"] = match["qid"]
                    recon_count += 1
        print(f"\n  Reconciliation: {recon_count} Q-IDs ergaenzt aus {recon_path.name}"
              f" ({recon_low_skipped} low-conf ignoriert)")
    else:
        print(f"\n  Reconciliation: {recon_path.name} nicht vorhanden (uebersprungen)")

    # Enrichment-Daten laden (wikidata-enrichment.json)
    enrichment_data = {}
    enrichment_path = OUTPUT_DIR / "wikidata-enrichment.json"
    if enrichment_path.exists():
        with open(enrichment_path, "r", encoding="utf-8") as f:
            enrich_raw = json.load(f)
        enrichment_data = enrich_raw.get("entities", {})
        print(f"  Enrichment: {len(enrichment_data)} Entitaeten aus {enrichment_path.name}")
    else:
        print(f"  Enrichment: {enrichment_path.name} nicht vorhanden (uebersprungen)")

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
        col_lower = col.lower()
        if col_lower in ['folio', 'folio nr', 'folio_nr'] or 'unnamed' in col_lower:
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

        # Relations zu Records hinzufuegen (mit Enrichment-Daten)
        ste_events = add_relations_to_records(records, relations, enrichment_data)
        # Relations auch zu Konvolut-Records (falls Verknuepfungen am Konvolut haengen)
        ste_events_k = add_relations_to_records(konvolute, relations, enrichment_data)
        ste_events = list(ste_events) + list(ste_events_k)

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

    # SKOS-Konzepte fuer verwendete Dokumenttypen (data.md Abschnitt 12)
    dft_concepts = build_dft_concepts(records)

    # Fallback falls add_relations nicht gerufen wurde (z.B. keine Verknuepfungen)
    if 'ste_events' not in locals():
        ste_events = []

    # JSON-LD Dokument
    graph = [fonds] + konvolute + records + dft_concepts + ste_events

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
