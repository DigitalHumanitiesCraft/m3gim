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
    5. Dokumenttyp: Mapping deutsch → m3gim-vocab SKOS-Konzept (25 Typen)
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
import hashlib
import pandas as pd
from pathlib import Path
from datetime import datetime

from _common import (
    attach_xlsx_source,
    build_xlsx_source,
    default_currency_for,
    extract_bearbeitungsnotiz,
    is_approved_match,
    load_role_concepts,
    normalize_bearbeitungsstand,
    strip_zero_date_padding,
    INDEX_HEADER_SHIFTS,
)

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
    "ric-rst": "https://www.ica.org/standards/RiC/vocabularies/recordSetTypes#",
    "m3gim-ontology": "https://dhcraft.org/m3gim/ontology#",
    "m3gim-data": "https://dhcraft.org/m3gim/data#",
    "m3gim-vocab": "https://dhcraft.org/m3gim/vocabulary#",
    "agrelon": "https://d-nb.info/standards/elementset/agrelon#",
    "schema": "https://schema.org/",
    "gndo": "https://d-nb.info/standards/elementset/gnd#",
    "wd": "http://www.wikidata.org/entity/",
    "owl": "http://www.w3.org/2002/07/owl#",
    "geo": "http://www.w3.org/2003/01/geo/wgs84_pos#",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    # Inline-Property-Aliase: bare keys → qualifizierte URIs
    "name": "rico:name",
    "role": "m3gim-ontology:role",
    "composer": "m3gim-ontology:composer"
}

# Rollenbegriffe des formalen Vokabulars, deutsches Label → (CURIE, prefLabel).
# Das Vokabular steht in der Spec-Hierarchie ueber der Pipeline (E-133), der
# Rollenwert wird also von dort gelesen und nicht hier zweitgefuehrt.
VOCAB_PATH = Path(os.environ.get("M3GIM_VOCAB_PATH", BASE_DIR / "vocab" / "m3gim.ttl"))
ROLE_CONCEPTS = load_role_concepts(VOCAB_PATH)

# Mapping (typ, rolle) → AgRelOn-Klasse + -Property (data-model.md § 8.3, Phase 4.8).
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
    ("person", "auftraggeber"):      ("agrelon:IsHasPatron",         "agrelon:hasPatron"),
    ("institution", "ausbildungsstätte"): ("agrelon:HasIsMember",    "agrelon:isMemberOf"),
}

# Nachlass-Subjekt aller AgRelOn-Relationen: Ira Malaniuk, Wikidata Q94208
# (Label + Lebensdaten 2026-06-18 gegen Wikidata verifiziert, nicht geraten).
# Die n-äre Reifikation trägt sie als agrelon:hasSubject; das Gegenüber als
# hasObject (E-104). Referenziert die kanonische WD-Entität direkt, statt einen
# lokalen Knoten zu prägen (das Schema lässt Person nicht als Top-Level-@type).
MALANIUK_SUBJECT = {
    "name": "Malaniuk, Ira",
    "@id": "wd:Q94208",
    "owl:sameAs": "http://www.wikidata.org/entity/Q94208",
}


# Rollen, die die Erfassung an einer Datierung fuehrt. Die frueher hier
# angehaengte Abbildung auf eine typisierte Datums-Property ist mit dem
# Zielmodell entfallen; jeder Datumswert wird ein Annotationsknoten mit
# m3gim-ontology:atDate und seiner Rolle. Die Menge bleibt, weil ein
# Komposit "ort,datum" seine Rolle an beide Haelften vererbt und eine
# Datumsrolle am Ortsteil nichts aussagt (siehe ort-Zweig).
DATE_ONLY_ROLES = frozenset({
    "erstelldatum",
    "absendedatum",
    "empfangsdatum",
    "ausstellungsdatum",
    "erscheinungsdatum",
    "abreisedatum",
    "auftritt",
    "auftrittsdatum",
    "aufführung",
    "auffuehrungsdatum",
    "probe",
    "probendatum",
    "probenbeginn",
    "premiere",
    "premieredatum",
    "ausstrahlung",
    "ausstrahlungsdatum",
    "spielzeit",
    "überweisung",
    "ueberweisungsdatum",
    "gespräch",
    "gespraechsdatum",
})

# Die eine Datumsrolle, die am Dokument keinen Annotationsknoten erzeugt: die
# Entstehungsdatierung steht dort auf dem RiC-O-Term rico:creationDate.
CREATION_DATE_ROLE = "erstelldatum"

# Pipeline-interner Zwischenspeicher am Record, nie serialisiert. Er haelt eine
# malformte Entstehungsdatierung, bis die @id-Kollisionsaufloesung gelaufen ist.
PENDING_CREATION_DATE = "_malformed_creation_date"

# Mobilitaets-Ortsrollen (E-97): jede erzeugt eine datumslose
# m3gim-ontology:Annotation (First-Class-Mobilitaetsereignis fuer den
# Mobilitaets-Atlas). Vokabular-Vollstaendigkeit aus data.md § 4/§ 10 — im
# aktuellen Export sind zielort/absendeort/abreiseort belegt, empfangsort/
# vertragsort scaffolden fuer einen tieferen Export. wohnort ist KEIN
# Punktereignis (Zustand mit Validity) und steht bewusst nicht in dieser Menge.
MOBILITY_PLACE_ROLES = {
    "zielort", "absendeort", "abreiseort", "empfangsort", "vertragsort",
}

# Vertragsstatus (data-model.md § 11, E-99): in der Quelle wird ein unerfuellter
# Vertrag ueber die rolle-Spalte als "nicht eingehalten" markiert, dabei
# spaltenweit ueber den ganzen Vertragsblock (z.B. NIM_023) durchgereicht. Das
# ist KEINE Ereignis-/Ortsrolle: ein Ort oder ein ort,datum-Ereignis kann nicht
# "nicht eingehalten" sein. Wir filtern den Status daher als Rolle heraus,
# damit keine Scheinrolle entsteht (Routing-Fix). Die contractStatus-
# Modellierung (contractStatus/realized am Vertrags-Record) ist mangels Test-/
# Frontend-Bedarf noch nicht ausgebaut und mit dem Erschliessungsteam zu klaeren.
CONTRACT_STATUS_ROLES = {"nicht eingehalten"}

# ---------------------------------------------------------------------------
# Dokumenttyp-Mapping (deutsch → m3gim-vocab)
# ---------------------------------------------------------------------------

DOKUMENTTYP_TO_DFT = {
    # Korrespondenz-Hierarchie
    "korrespondenz": "m3gim-vocab:correspondence",
    "brief": "m3gim-vocab:letter",
    "postkarte": "m3gim-vocab:postcard",
    "telegramm": "m3gim-vocab:telegram",
    # Presse-Hierarchie
    "presse": "m3gim-vocab:press",
    "zeitungsausschnitt": "m3gim-vocab:newspaperClipping",
    "kritik": "m3gim-vocab:critique",
    "rezension": "m3gim-vocab:review",
    # Programm-Hierarchie: one canonical concept, the finer genre names stay
    # accepted source values as synonyms (decision template § 3).
    "programm": "m3gim-vocab:program",
    "programmheft": "m3gim-vocab:program",
    "konzertprogramm": "m3gim-vocab:program",
    # Biographisch-Hierarchie
    "biographisch": "m3gim-vocab:biographical",
    "biographie": "m3gim-vocab:biography",
    "autobiografie": "m3gim-vocab:autobiography",
    "lebenslauf": "m3gim-vocab:curriculumVitae",
    # Identitaetsdokument-Hierarchie
    "identitaetsdokument": "m3gim-vocab:identityDocument",
    "ausweis": "m3gim-vocab:identityCard",
    # Konvolut-Aggregate
    "sammlung": "m3gim-vocab:collection",
    "konvolut": "m3gim-vocab:bundle",
    # Flache Typen
    "vertrag": "m3gim-vocab:contract",
    "plakat": "m3gim-vocab:poster",
    "tontraeger": "m3gim-vocab:soundCarrier",
    "studienunterlagen": "m3gim-vocab:document",
    "repertoire": "m3gim-vocab:repertoireList",
    "repertoireliste": "m3gim-vocab:repertoireList",
    "tagebuch": "m3gim-vocab:diary",
    "notizbuch": "m3gim-vocab:note",
    "notiz": "m3gim-vocab:note",
    "urkunde": "m3gim-vocab:certificate",
    "zeugnis": "m3gim-vocab:certificate",
    "widmung": "m3gim-vocab:document",
    "fotografie": "m3gim-vocab:photograph",
    "photokopie": "m3gim-vocab:photocopy",
    "quittung": "m3gim-vocab:receipt",
    "typoskript": "m3gim-vocab:typescript",
    "visitenkarte": "m3gim-vocab:businessCard",
    "noten": "m3gim-vocab:sheetMusic",
    # E-101: neue Konzepte (aktiv mit dem tieferen Export, April-Daten kennen sie nicht)
    "briefumschlag": "m3gim-vocab:envelope",
    "musikzeitschrift": "m3gim-vocab:musicPeriodical",
    "chronik": "m3gim-vocab:chronicle",
    "verzeichnis": "m3gim-vocab:inventory",
    "dokument": "m3gim-vocab:document",
    "sonstiges": "m3gim-vocab:other",
}

# SKOS-Hierarchie der Dokumenttypen (data.md Abschnitt 12).
# Jeder Key ist ein Konzept, der Wert sein direkter Oberbegriff (skos:broader).
# Konzepte ohne Eintrag sind Top-Level (broader = dokument).
DFT_BROADER = {
    "letter": "correspondence",
    "postcard": "correspondence",
    "telegram": "correspondence",
    "envelope": "correspondence",  # E-101
    "newspaperClipping": "press",
    "critique": "press",
    "review": "press",
    "musicPeriodical": "press",  # E-101
    "biography": "biographical",
    "autobiography": "biographical",
    "curriculumVitae": "biographical",
    "chronicle": "biographical",  # E-101
    "identityCard": "identityDocument",
}
# E-101: 'sammlung' und 'verzeichnis' bleiben bewusst ohne broader (top-level /
# eigenständig; die is-a-Beziehung von sammlung zu konvolut wird nicht
# vorentschieden, data-model.md § 12).

# Lesbare deutsche Labels für skos:prefLabel der Dokumenttyp-Concepts (E-101). Löst die
# Frontend-Handtabelle DOKUMENTTYP_LABELS ab; die Werte sind mit ihr deckungs-
# gleich, damit der Frontend-Umbau die Anzeige nicht verändert.
DFT_LABELS = {
    "document": "Dokument",
    "bundle": "Konvolut",
    "collection": "Sammlung",
    "correspondence": "Korrespondenz",
    "letter": "Brief",
    "postcard": "Postkarte",
    "telegram": "Telegramm",
    "envelope": "Briefumschlag",
    "press": "Presse",
    "newspaperClipping": "Zeitungsausschnitt",
    "critique": "Kritik",
    "review": "Rezension",
    "musicPeriodical": "Musikzeitschrift",
    "program": "Programm",
    "contract": "Vertrag",
    "poster": "Plakat",
    "photograph": "Fotografie",
    "note": "Notiz",
    "typescript": "Typoskript",
    "photocopy": "Photokopie",
    "certificate": "Urkunde",
    "businessCard": "Visitenkarte",
    "receipt": "Quittung",
    "sheetMusic": "Noten",
    "repertoireList": "Repertoireliste",
    "biographical": "Biographisch",
    "biography": "Biographie",
    "autobiography": "Autobiografie",
    "curriculumVitae": "Lebenslauf",
    "chronicle": "Chronik",
    "identityDocument": "Identitätsdokument",
    "identityCard": "Ausweis",
    "inventory": "Verzeichnis",
    "diary": "Tagebuch",
    "soundCarrier": "Tonträger",
    "other": "Sonstiges",
}

# Header-Shift-Korrekturen und Waehrungs-/Bearbeitungsstand-Defaults
# kommen aus _common.py (INDEX_HEADER_SHIFTS, FINANCE_CURRENCY_DEFAULTS,
# normalize_bearbeitungsstand). Siehe knowledge/data.md § 17.


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
    """Erzeugt SKOS-Concept-Knoten fuer alle tatsaechlich genutzten Dokumenttyp-Begriffe.

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
            if ident.startswith("m3gim-vocab:"):
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
            "@id": f"m3gim-vocab:{concept}",
            "@type": "skos:Concept",
            # E-101: lesbares deutsches Label statt des nackten Slugs.
            "skos:prefLabel": DFT_LABELS.get(concept, concept),
        }
        if concept in DFT_BROADER:
            node["skos:broader"] = {"@id": f"m3gim-vocab:{DFT_BROADER[concept]}"}
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


def attach_role(target: dict, value) -> None:
    """Setzt die Rolle eines Knotens als Verweis auf ihr Concept im Vokabular.

    Der Verweisknoten fuehrt das skos:prefLabel des Concepts mit, damit ein
    Konsument den Anzeigetext ohne Nachschlagen hat. Ist der erfasste Wert im
    Vokabular auf ein anderes Concept gefuehrt, bleibt er in
    m3gim-ontology:derivedFromRole stehen, sodass die Zusammenfuehrung
    umkehrbar bleibt. Fuehrt die Quelle keine Rolle, traegt der Knoten keine.

    Ein Wert ausserhalb des Vokabulars bleibt als Literal stehen. Das betrifft
    den Vertragsstatus "nicht eingehalten", der in der Rollenspalte steht und
    laut Vokabular ausdruecklich kein Rollenbegriff ist; seine Modellierung ist
    mit dem Erschliessungsteam offen (data-model.md § 11).
    """
    if not value:
        return
    key = str(value).strip().lower()
    if not key:
        return
    concept = ROLE_CONCEPTS.get(key)
    if concept is None:
        target["role"] = key
        return
    curie, pref_label = concept
    target["role"] = {"@id": curie, "skos:prefLabel": pref_label}
    if key != pref_label:
        target["m3gim-ontology:derivedFromRole"] = key


# "Kein Datum"-Platzhalter: "ohne Datum" (belegt) sowie die etablierte
# Archiv-Kurzform "o. D."/"o.d." (case-insensitive, beliebige Innen-Whitespace).
_NO_DATE_PLACEHOLDER = re.compile(
    r"^(?:ohne\s+datum|o\.?\s*d\.?)$", re.IGNORECASE
)


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
    # "Kein Datum"-Platzhalter (data.md § 6): die etablierte Konvention "ohne
    # Datum"/"o. D." ist KEIN Datum und darf nicht in rico:date landen (bricht
    # das JSON-LD-Schema). Auf None abbilden. Belegt im Export: "ohne Datum".
    if _NO_DATE_PLACEHOLDER.match(s):
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


# Datums-Routing-Normalisierung (data.md § 6, E-102). Fuehrt Textnotationen auf
# ISO-Repraesentationen, bevor die Annotation ihren Wert bekommt.
# Verlustfrei: nicht erkannte Notationen bleiben unveraendert stehen und
# tragen dafuer das Flag datierung-malformed.
_RANGE_BIS = re.compile(r"^(.+?)\s+bis\s+(.+)$", re.IGNORECASE)
_FREITEXT_BEGINN = re.compile(
    r"^(?:ab|seit)\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)$", re.IGNORECASE
)


def normalize_dating(value: str) -> str:
    """Normalisiert Datumsnotationen gemaess Routing-Tabelle (data.md § 6).

    - "X bis Y" → ISO-TimeSpan "X/Y" (nur wenn beide Seiten ISO sind)
    - "ab/seit YYYY" → Qualifier "nach:YYYY"
    sonst unveraendert.
    """
    if not isinstance(value, str):
        return value
    s = value.strip()
    m = _RANGE_BIS.match(s)
    if m and is_iso_date(m.group(1).strip()) and is_iso_date(m.group(2).strip()):
        return f"{m.group(1).strip()}/{m.group(2).strip()}"
    m = _FREITEXT_BEGINN.match(s)
    if m:
        return f"nach:{m.group(1)}"
    return s


# Datenqualitaets-Flags aus anmerkung-Signalen (data-model.md § 7, E-102). Das
# Vokabular ist aus den tatsaechlichen anmerkung-Eintraegen abgeleitet, nicht
# extrapoliert (Leitplanke 'Fremdterme verifizieren'): "Name nicht eindeutig
# auffindbar", "Vorname fehlt"/"ohne Vornamen", "Rolle Unsicher: ..."/"(??)",
# "Tippfehler uebernommen".
_QUALITY_FLAG_SIGNALS = [
    (re.compile(r"name nicht eindeutig", re.IGNORECASE), "name-nicht-eindeutig"),
    (re.compile(r"vorname[n]?\s+fehlt|ohne\s+vorname", re.IGNORECASE), "vorname-fehlt"),
    (re.compile(r"rolle\s+unsicher|\(\?\?\)", re.IGNORECASE), "rolle-unsicher"),
    (re.compile(r"tippfehler", re.IGNORECASE), "quelle-tippfehler"),
]


def quality_flags(anmerkung) -> list[str]:
    """Leitet kontrollierte Datenqualitaets-Flags aus einem anmerkung-Freitext
    ab. Liefert eine deduplizierte, stabil sortierte Liste (leer, wenn kein
    Signal greift). Keine fabrizierte Konfidenz — das Flag ist das Signal."""
    if not isinstance(anmerkung, str) or not anmerkung.strip():
        return []
    found = [flag for rx, flag in _QUALITY_FLAG_SIGNALS if rx.search(anmerkung)]
    # Reihenfolge der Signalliste als stabile Ausgabeordnung beibehalten.
    seen = set()
    return [f for f in found if not (f in seen or seen.add(f))]


def create_record_id(signatur: str, folio: str = None) -> str:
    """Erzeugt URI aus Signatur (+ Folio)"""
    # UAKUG/NIM_028 → m3gim-data:NIM_028
    # UAKUG/NIM_003 + 1_1 → m3gim-data:NIM_003_1_1
    # UAKUG/NIM/PL_07 → m3gim-data:NIM_PL_07
    clean = signatur.replace("UAKUG/", "").replace("/", "_")
    if folio:
        clean = f"{clean}_{folio.replace(' ', '_')}"
    return f"m3gim-data:{clean}"


def normalize_signatur(sig: str) -> str:
    """Nullt die NIM-Konvolutnummer auf drei Stellen (NIM_11 -> NIM_011).

    Die Verknuepfungstabelle fuehrt ein Konvolut zweistellig, die Objekte-
    Tabelle dreistellig; ohne Angleich treffen die Verknuepfungen ihren
    Record nicht und verfallen. PL_xx und andere Formen bleiben unberuehrt.
    """
    return re.sub(r'NIM_(\d{1,3})\b',
                  lambda m: f"NIM_{int(m.group(1)):03d}", sig)


def load_index(name: str) -> pd.DataFrame | None:
    """Laedt einen Index mit Header-Shift-Korrektur.

    Zwei Fehlbild-Klassen aus dem Box-Export (E-95):

    (a) name-Spalte ohne Kopf — Personenindex: Position 0 traegt den echten
        Header "m3gim_id", aber die name-Spalte (Position 1) ist leer und
        wird von pandas zu "Unnamed: 1". Hier ist Zeile 0 eine echte
        Kopfzeile; es darf KEINE Datenzeile als Header konsumiert werden. Wir
        benennen die Spalten positionell auf den Kanon um.

    (b) geleakter Datenwert in der Kopfzeile — Org/Werk: Position 1 (bzw. 3)
        traegt einen Datenwert wie "Graz"/"Rossini, Gioachino" statt eines
        echten Headers. Position 0 bleibt aber "m3gim_id", d.h. Zeile 0 ist
        weiterhin eine (verunreinigte) Kopfzeile, keine verlorene Datenzeile.
        Daher ebenfalls nur Spalten umbenennen — die geleakten Einzelzellen
        gehen verloren (durchreichen; gleiches Verhalten wie im Prod-Export).
    """
    path = SHEETS_DIR / f"M3GIM-{name}.xlsx"
    if not path.exists():
        return None

    df = pd.read_excel(path)
    canonical = name.lower()

    if canonical in INDEX_HEADER_SHIFTS:
        expected = INDEX_HEADER_SHIFTS[canonical]
        col0 = str(df.columns[0]).strip().lower() if len(df.columns) else ""
        if col0 == "m3gim_id":
            # Zeile 0 ist eine echte (ggf. verunreinigte) Kopfzeile: nur die
            # Spalten positionell auf den Kanon umbenennen, keine Datenzeile
            # als Header konsumieren. Erhaelt etwaige Zusatzspalten am Ende.
            new_cols = list(expected[:len(df.columns)])
            if len(df.columns) > len(expected):
                new_cols += list(df.columns[len(expected):])
            df.columns = new_cols
        elif len(df.columns) == len(expected):
            # Legacy-Fall: Zeile 0 ist eine verschobene Datenzeile, die pandas
            # als Header gelesen hat (Position 0 != "m3gim_id"). Zurueckschieben.
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
        # M1: kuratierte Index-Felder durchreichen, damit ALLE gepflegten Daten
        # das Frontend erreichen (zuvor fielen sie nach build_index_lookup weg).
        # Pro Index-Typ nur die jeweils vorhandene Spalte (org: ort/Sitz +
        # assoziierte_person; person: lebensdaten; werk: rolle_stimme).
        for col in ('lebensdaten', 'ort', 'assoziierte_person', 'rolle_stimme'):
            if col in df.columns and pd.notna(row.get(col)):
                val = str(row[col]).strip()
                if val:
                    entry[col] = val
        lookup[name.lower()] = entry

    return lookup


# ---------------------------------------------------------------------------
# Objekte → Records
# ---------------------------------------------------------------------------

def convert_objekt(row: pd.Series, folio_col: str = None,
                   xlsx_row: int | None = None) -> dict:
    """Konvertiert ein Objekt zu JSON-LD Record.

    xlsx_row: 1-basierte XLSX-Zeilennummer inkl. Header (= pandas idx + 2),
              wird als m3gim-ontology:xlsxSource angehaengt.
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
        record["m3gim-ontology:xlsxSource"] = build_xlsx_source("Objekte", xlsx_row)

    # Titel
    titel = normalize_str(row.get('titel'))
    if titel:
        record["rico:title"] = titel

    # Datum (bereinigt). rico:date ist im JSON-Schema ISO-typisiert; ein
    # malformter Quellwert (z.B. "06-09" ohne Jahr) darf dort nicht landen
    # (bricht das Schema). ISO-Werte gehen in rico:date, nicht-ISO bleibt
    # verlustfrei als Annotationsknoten mit der Rolle entstehungsdatum
    # erhalten und ist als Quell-Datenfehler markiert. Der Knoten entsteht
    # erst nach der @id-Kollisionsaufloesung in build_konvolut_hierarchy,
    # weil seine Kennung die des Dokuments traegt.
    date_val = clean_date(row.get('entstehungsdatum'))
    if date_val:
        if is_iso_date(date_val):
            record["rico:date"] = date_val
        else:
            record[PENDING_CREATION_DATE] = date_val

    # Datierungsevidenz wird bewusst NICHT serialisiert (E-106, ersetzt E-100).
    # Die frueheren agrelon:metadataConfidence-Dezimalwerte (1.0/0.8/0.6) waren
    # eine erfundene Projektion der kategorialen datierungsevidenz-Spalte
    # (aus_dokument/erschlossen/extern) — kein gemessener Wert, gegen die
    # Leitplanke "Konfidenz nicht erfinden". Nichts im Frontend/Report las sie.
    # Die record-seitige Self-Provenance war ohne den Konfidenzwert ein leerer
    # Selbstverweis. Falls die Datierungsevidenz spaeter gebraucht wird, kehrt
    # sie als kategorialer Wert zurueck (nicht als Dezimalzahl). data-model.md § 9.

    # Dokumenttyp → m3gim-vocab
    dokumenttyp = normalize_lower(row.get('dokumenttyp'))
    if dokumenttyp:
        dft = DOKUMENTTYP_TO_DFT.get(dokumenttyp)
        if dft:
            record["rico:hasDocumentaryFormType"] = {"@id": dft}
        else:
            # Without this the record silently loses its type and drops out of
            # every type-based view; name value and source cell instead.
            where = record["rico:identifier"]
            if xlsx_row is not None:
                where += f", Objekte.xlsx Zeile {xlsx_row}"
            print(f"  WARNUNG: Dokumenttyp '{dokumenttyp}' ohne Eintrag in "
                  f"DOKUMENTTYP_TO_DFT — {where}")

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

    # Bearbeitungsstand (m3gim-Extension) — Mapping in _common.py.
    # E-102: Freitext-Anhang als separate Bearbeitungsnotiz herausloesen,
    # der canonische Status bleibt in m3gim-ontology:processingStatus.
    bearbeitungsstand = normalize_bearbeitungsstand(row.get('bearbeitungsstand'))
    if bearbeitungsstand:
        record["m3gim-ontology:processingStatus"] = bearbeitungsstand
    bearbeitungsnotiz = extract_bearbeitungsnotiz(row.get('bearbeitungsstand'))
    if bearbeitungsnotiz:
        record["m3gim-ontology:processingNote"] = bearbeitungsnotiz

    # Zugangs- und Scan-Status
    zugaenglichkeit = normalize_lower(row.get('zugaenglichkeit'))
    if zugaenglichkeit:
        record["m3gim-ontology:accessStatus"] = zugaenglichkeit

    scan_status = normalize_lower(row.get('scan_status'))
    if scan_status:
        record["m3gim-ontology:digitizationStatus"] = scan_status

    return record


# ---------------------------------------------------------------------------
# Konvolut-Hierarchie
# ---------------------------------------------------------------------------

def build_konvolut_hierarchy(df: pd.DataFrame, folio_col: str = None,
                             annotation_seen: dict | None = None
                             ) -> tuple[list, list, list]:
    """Erkennt Konvolute und baut Hierarchie.

    Args:
        annotation_seen: geteiltes Register der vergebenen Annotations-@ids,
            damit die hier und die in add_relations_to_records erzeugten
            Knoten sich nicht auf dieselbe Kennung setzen.

    Returns:
        records: Liste aller Records (Einzelobjekte + Folios)
        konvolute: Liste der Konvolut-RecordSets
        annotations: Annotationsknoten aus malformten Entstehungsdatierungen
    """
    if annotation_seen is None:
        annotation_seen = {}
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

        # Leere Platzhalterzeile (nur Signatur/box_nr, kein Folio und kein
        # Inhalt) ueberspringen: solche Zeilen sind kein Objekt und fielen
        # ohne Folio alle auf dieselbe Sammlungs-@id (Quellartefakt, z.B.
        # NIM_137). Eine Zeile mit Folio oder mit Titel/Typ/Datum/Stand bleibt.
        if not folio:
            _content_cols = ('titel', 'dokumenttyp', 'entstehungsdatum',
                             'Bearbeitungsstand')
            if not any(pd.notna(row.get(c)) and str(row.get(c)).strip()
                       for c in _content_cols):
                continue

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
            "rico:hasRecordSetType": {"@id": "ric-rst:File"},
            "rico:identifier": sig,
            "rico:hasOrHadPart": [{"@id": mid} for mid in member_ids]
        }
        konvolute.append(konvolut)

    # --- Kollisions-Aufloesung (siehe knowledge/data.md § 17) ---
    # Wenn eine Signatur sowohl eine Sammel-Zeile (ohne Folio) als auch
    # Folio-Zeilen hat, hat der Sammel-Record die gleiche @id wie das
    # RecordSet. Wir geben der Sammel-Zeile ein _sammlung-Suffix und
    # haengen sie als Meta-Member an das Konvolut.
    konvolut_ids = {k["@id"] for k in konvolute}
    for rec in records:
        if rec["@id"] in konvolut_ids and rec.get("@type") == "rico:Record":
            old_id = rec["@id"]
            new_id = f"{old_id}_collection"
            rec["@id"] = new_id
            # Dem Konvolut als Meta-Member anfuegen
            konv = next(k for k in konvolute if k["@id"] == old_id)
            konv["rico:hasOrHadPart"].append({"@id": new_id})

    # Malformte Entstehungsdatierungen als Annotationsknoten materialisieren.
    # Erst hier, weil die @id des Knotens die des Dokuments traegt und diese
    # oben noch gewechselt haben kann.
    annotations = []
    for rec in records:
        date_val = rec.pop(PENDING_CREATION_DATE, None)
        if not date_val:
            continue
        node = build_annotation(rec, annotation_seen, date=date_val,
                                role="entstehungsdatum")
        node["m3gim-ontology:dataQualityFlag"] = "datierung-malformed"
        # Die Ursprungszelle ist die Datumsspalte derselben Objektzeile.
        source = rec.get("m3gim-ontology:xlsxSource")
        if source:
            node["m3gim-ontology:xlsxSource"] = source
        annotations.append(node)

    return records, konvolute, annotations


# ---------------------------------------------------------------------------
# Verknuepfungen → RiC-O Relations
# ---------------------------------------------------------------------------

# Fallback-Waehrung pro Archivsignatur-Praefix lebt in _common.py
# (FINANCE_CURRENCY_DEFAULTS + default_currency_for). Siehe
# knowledge/data.md § 17 fuer die redaktionellen Annahmen.


# Numerischer Kopf eines Finanz-Rohwerts: fuehrende Ziffern mit '.' (Tausender)
# und ',' (Dezimal). Erfasst "1.200", "631,50", "200,00", "50000".
_AMOUNT_HEAD = re.compile(r"^\s*([\d.,]+)")


def _parse_amount_token(token: str) -> str | None:
    """Wandelt einen numerischen Roh-Token in einen xsd:decimal-String.

    Konvention (data-model.md § 11, europaeisch): '.' ist Tausendertrenner, ',' ist
    Dezimaltrenner. Ein abschliessendes Komma vor der Waehrung ist hier bereits
    abgetrennt; ein verbleibendes ',NN' ist eine echte Nachkommastelle.
    """
    token = token.strip().rstrip(",").strip()
    if not token:
        return None
    cleaned = token.replace(".", "").replace(",", ".")
    try:
        amount_decimal = float(cleaned)
    except ValueError:
        return None
    if amount_decimal == int(amount_decimal):
        return str(int(amount_decimal))
    return f"{amount_decimal:g}"


def _parse_single_monetary(segment: str) -> tuple[str | None, str | None]:
    """Zerlegt EIN Betrag-Segment (kein Doppelbetrag) in (amount, currency)."""
    s = segment.strip()
    if not s:
        return None, None
    head = _AMOUNT_HEAD.match(s)
    if not head:
        # Kein numerischer Kopf -> nicht parsbar als Betrag.
        return None, None
    num_token = head.group(1)
    rest = s[head.end():].strip()
    # 'rest' beginnt ggf. mit dem Waehrungstrenner (Komma) -> abschneiden.
    rest = rest.lstrip(",").strip()
    currency = rest.rstrip(".").strip() or None
    return _parse_amount_token(num_token), currency


def parse_monetary_values(name: str) -> list[tuple[str | None, str | None]]:
    """Zerlegt einen Finanz-Rohwert in eine Liste von (amount, currency).

    Robust gegen die in der Quelle gemischten Notationen (data-model.md § 11):
      - 'AMOUNT, CURRENCY'     : '4000, Esc', '1.200, DM'  (Komma+Space-Trenner)
      - 'AMOUNT,DEC, CURRENCY' : '631,50, Fr.'             (Dezimalkomma DANN Trenn-Komma)
      - 'AMOUNT,DEC CURRENCY'  : '1500,00 DM', '200,00 Belgische Francs'
                                                           (Dezimalkomma, Space, Waehrung)
      - 'AMOUNT,CURRENCY'      : '153,DM'                  (Komma ohne Space als Trenner)
      - 'AMOUNT CURRENCY'      : '50000 Lire'              (Space-Trenner ohne Komma)
      - 'AMOUNT'               : '36000', '18.000'         (keine Waehrung)
      - Doppelbetrag '25, DM/45, DM' -> zwei eigenstaendige Eintraege.

    Strategie pro Segment: den numerischen Kopf (Ziffern + '.'/',') vom Rest
    abloesen, den Rest als Waehrung lesen. Ein ',NN'-Suffix im Kopf ist eine
    echte Nachkommastelle und bleibt Teil des Betrags; '.'-Gruppen sind Tausender.
    """
    if not name:
        return [(None, None)]
    s = str(name).strip()
    if not s:
        return [(None, None)]
    # Doppelbetrag am '/' trennen (data-model.md § 11): jeder Teil wird ein eigener
    # Eintrag mit gleichem detailField. Nur Segmente mit numerischem Kopf zaehlen.
    segments = [seg for seg in s.split("/") if seg.strip()]
    parsed = [_parse_single_monetary(seg) for seg in segments]
    parsed = [p for p in parsed if p[0] is not None]
    return parsed or [_parse_single_monetary(s)]


def parse_monetary_value(name: str) -> tuple[str | None, str | None]:
    """Erster (amount, currency)-Eintrag eines Finanz-Rohwerts.

    Duenne Huelle um parse_monetary_values fuer Aufrufer/Tests, die einen
    einzelnen Betrag erwarten (Doppelbetraege liefern den ersten Teil).
    """
    return parse_monetary_values(name)[0]


def decompose_komposit_typ(typ: str) -> list[str]:
    """Zerlegt Komposit-Typ in Einzeltypen: 'ort, datum' → ['ort', 'datum'].

    E-95-Normalisierung: der typ "rolle, Vorname Nachname Saenger*in"
    (~230 Zeilen, v.a. Box 5) ist eine durchgesickerte Erfassungs-Anweisung,
    kein echter Typwert. Seine name-Werte sind reale Rolle,Person-Paare
    (z.B. "Siegfried, Bernd Aldenoff"). Wir mappen ihn auf das kanonische
    Komposit "rolle, person", damit die Zeilen denselben Decompose-Pfad wie
    echte rolle,person-Kompositen nehmen (Vorarbeit fuer E-96
    Performance/StageRole). Strukturelle Absorption, keine Inhaltsaenderung.

    Unterstrich ist gleichwertiger Komposit-Trenner: Google-Sheets-Dropdowns
    koennen kein Komma im Wert tragen, der Dropdown-Umbau des Erschliessungs-
    teams exportiert "Datum, Ort" deshalb als "Datum_Ort".
    """
    parts = [t.strip().lower() for t in re.split(r"[,_]", typ)]
    # Durchgesickerte Erfassungs-Anweisung -> kanonisches "rolle, person".
    if (len(parts) == 2 and parts[0] == "rolle"
            and "nger" in parts[1] and parts[1].split()[:2] == ["vorname", "nachname"]):
        return ["rolle", "person"]
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
        else:
            # Freitext-Beginn nach dem Komma ("Wien, ab 1956"): am ersten Komma
            # trennen und das Datum normalisieren ("ab 1956" → "nach:1956",
            # data.md § 6). Nur uebernehmen, wenn daraus ein ISO-Wert wird —
            # sonst kein Ort-Leak ins Datumsfeld (Audit-Befund zu E-102).
            m2 = re.match(r'^(.+?),\s*(.+)$', name)
            if m2:
                cand = normalize_dating(m2.group(2).strip())
                if is_iso_date(cand):
                    result['ort'] = m2.group(1).strip()
                    result['datum'] = cand

    # Pattern: "Buehnenrolle, Personname" (E-96, rolle,person -> Performance).
    # Erstes Komma trennt die Bühnenrolle vom Interpret:innen-Namen.
    if 'rolle' in typen and 'person' in typen:
        m = re.match(r'^(.+?),\s*(.+)$', name)
        if m:
            result['rolle'] = m.group(1).strip()
            result['person'] = m.group(2).strip()

    # Pattern: "YYYY..., Werktitel" (E-98, datum,werk -> Performance). Datum
    # mit führendem Jahr vor dem Komma; ohne führendes Jahr (Komponist-statt-
    # Werk-Zeile) bleibt 'datum' der Rohwert und scheitert am is_iso_date-Gate.
    if 'datum' in typen and 'werk' in typen:
        m = re.match(r'^(\d{4}[^,]*),\s*(.+)$', name)
        if m:
            result['datum'] = clean_date(m.group(1).strip())
            result['werk'] = m.group(2).strip()

    return result


def _stage_role_slug(name: str) -> str:
    """Deterministischer ASCII-Slug für die StageRole-@id (E-96).

    ASCII, weil das JSON-LD-@id-Pattern nur [\\w/_.-] erlaubt und JSON-Schema-\\w
    keine Umlaute matcht. ä/ö/ü/ß werden transliteriert.
    """
    s = name.strip().lower()
    for a, b in [("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")]:
        s = s.replace(a, b)
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s or "rolle"


def _make_stage_role(stage_roles: dict, role_name: str) -> str:
    """Dedupliziert eine m3gim-ontology:StageRole-Entität und gibt ihre @id zurück (E-96).

    Das geteilte ``stage_roles``-Registry stellt sicher, dass dieselbe Bühnenrolle
    (etwa *Brangäne*) genau einen Knoten mit deterministischer Slug-@id bekommt.
    """
    slug = _stage_role_slug(role_name)
    sid = f"m3gim-data:stagerole_{slug}"
    if sid not in stage_roles:
        stage_roles[sid] = {
            "@id": sid,
            "@type": "m3gim-ontology:StageRole",
            "rico:name": role_name.strip(),
        }
    return sid


def load_verknuepfungen(path: Path) -> pd.DataFrame:
    """Laedt die Verknuepfungstabelle als EINE DataFrame ueber alle Sheets (E-95).

    Der Box-Export verteilt die Verknuepfungen auf mehrere, inkonsistent
    benannte Sheets (Box_01, Box_02, Box_4, Box 5, Box 6, Box 9). Der
    Produktions-Workbook hat genau ein Sheet "Verknuepfungen". Diese Funktion
    absorbiert beide Faelle:

    - Spalte 0 ist die Archivsignatur, im Box-Export OHNE Header (pandas liest
      sie als " " bzw. "Unnamed: 0"). Sie wird positionell erkannt, auf
      "archivsignatur" umbenannt und pro Sheet forward-gefuellt (viele
      Folgezeilen lassen die Signatur leer).
    - Die uebrigen Spalten werden per (lowercased) Name angeglichen; Box 6
      ohne datenpunkt_id wird toleriert.
    - Provenance (Sheet-Name + 1-basierte XLSX-Zeile) wandert in die
      Hilfsspalten ``_xlsx_sheet`` / ``_xlsx_row``, damit
      ``process_verknuepfungen`` die Herkunftszeile sheet-genau aufzeichnet.

    Rueckwaerts-kompatibel: beim Single-Sheet-Workbook mit echtem
    "archivsignatur"-Header liefert die Funktion genau die bisherige
    Spaltenstruktur (plus die beiden Provenance-Hilfsspalten).
    """
    xl = pd.ExcelFile(path)
    frames: list[pd.DataFrame] = []

    for sheet in xl.sheet_names:
        df = pd.read_excel(path, sheet_name=sheet)
        if df.empty:
            continue

        # Spalten lowercasen/strippen; nicht-textuelle Header tolerieren.
        rename: dict = {}
        cols = list(df.columns)
        for pos, col in enumerate(cols):
            if pos == 0:
                # Spalte 0 ist immer die Archivsignatur — positionell,
                # unabhaengig vom (oft leeren/ungesetzten) Header.
                rename[col] = "archivsignatur"
            elif isinstance(col, str):
                rename[col] = col.strip().lower()
            # nicht-textuelle Header bleiben unveraendert (werden unten ignoriert)
        df = df.rename(columns=rename)

        # Sheets ohne Verknuepfungs-Signatur ueberspringen: der Dropdown-Umbau
        # des Erschliessungsteams fuegt dem Workbook versteckte Hilfsblaetter
        # und das Blatt "Typ-Rollen" hinzu. Eine Verknuepfungszeile braucht
        # mindestens typ + name (Spalte 0 ist positionell die Signatur).
        if not {"typ", "name"}.issubset(df.columns):
            print(f"  Sheet '{sheet}' uebersprungen (keine Verknuepfungs-Spalten)")
            continue

        # Signatur forward-fillen (viele Folgezeilen lassen sie leer) und die
        # NIM-Konvolutnummer auf drei Stellen normalisieren, damit zweistellig
        # erfasste Signaturen (NIM_11) ihren dreistelligen Record treffen.
        if "archivsignatur" in df.columns:
            df["archivsignatur"] = df["archivsignatur"].ffill()
            df["archivsignatur"] = df["archivsignatur"].map(
                lambda s: normalize_signatur(s) if isinstance(s, str) else s)

        # Provenance: originale XLSX-Zeile (1-basiert inkl. Header) + Sheet.
        df["_xlsx_sheet"] = sheet
        df["_xlsx_row"] = [int(i) + 2 for i in range(len(df))]

        frames.append(df)

    if not frames:
        return pd.DataFrame(columns=["archivsignatur", "_xlsx_sheet", "_xlsx_row"])

    # Union der Spalten ueber alle Sheets (Box 6 fehlt datenpunkt_id -> NaN).
    combined = pd.concat(frames, ignore_index=True, sort=False)
    return combined


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

        # Folio-Feld pruefen (Spalte heisst oft "Folio" in Verknuepfungen).
        # load_verknuepfungen lowercased die Header -> "folio".
        folio = None
        for col in ['folio', 'Folio', 'Unnamed: 1']:
            if col in df.columns:
                folio_raw = row.get(col)
                if pd.notna(folio_raw) and str(folio_raw).strip():
                    folio_val = str(folio_raw).strip()
                    # Guard: vereinzelt steht die Kopfzeichenkette "Folio"
                    # literal in einer Folio-Datenzelle — keine echte Folio.
                    if folio_val.lower() != "folio":
                        folio = folio_val
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

        # Provenance: Sheet-Name + originale XLSX-Zeile + datenpunkt_id.
        # load_verknuepfungen liefert die Herkunft sheet-genau in den
        # Hilfsspalten _xlsx_sheet/_xlsx_row (Box-Export verteilt Zeilen auf
        # mehrere Sheets). Fallback auf "Verknuepfungen"/idx+2, falls die
        # Hilfsspalten fehlen (DataFrame nicht ueber load_verknuepfungen geladen).
        sheet_name = "Verknuepfungen"
        if "_xlsx_sheet" in df.columns and pd.notna(row.get("_xlsx_sheet")):
            sheet_name = str(row.get("_xlsx_sheet"))
        if "_xlsx_row" in df.columns and pd.notna(row.get("_xlsx_row")):
            xlsx_row = int(row.get("_xlsx_row"))
        else:
            xlsx_row = int(idx) + 2  # pandas idx 0-basiert, XLSX-Header in Zeile 1
        dp_raw = row.get('datenpunkt_id') if 'datenpunkt_id' in df.columns else None
        datenpunkt_id = None
        if pd.notna(dp_raw):
            try:
                datenpunkt_id = int(float(dp_raw))
            except (ValueError, TypeError):
                datenpunkt_id = str(dp_raw).strip() or None
        source_info = build_xlsx_source(sheet_name, xlsx_row, datenpunkt_id)

        # Komposit-Typen decomponieren (Komma- und Unterstrich-Trenner).
        # Bedingungslos: decompose_komposit_typ behandelt Einzeltypen korrekt
        # ("person" -> ["person"]) und filtert einen nackten Waehrungs-Typ zur
        # leeren Liste, statt ihn als unverarbeitbare Generic-Relation zu emittieren.
        typen = decompose_komposit_typ(typ)
        # Komposit-Werte decomponieren (z.B. "München, 1952-12-17" → Ort + Datum)
        decomposed = decompose_komposit_value(name, typen) if len(typen) > 1 else {}

        # Komposit ort,datum: zusaetzlich eine Annotations-Relation emittieren
        # (data.md § 4, § 10). Der Annotationsknoten wird in add_relations
        # als Top-Level-Entity gebaut.
        ortdatum_ste_emitted = False
        if 'ort' in typen and 'datum' in typen:
            ort_val = decomposed.get('ort')
            datum_val = decomposed.get('datum')
            if ort_val and datum_val and is_iso_date(datum_val):
                ortdatum_ste_emitted = True
                ste_rel = {
                    "typ": "spatiotemporal",
                    "name": ort_val,  # name wird als Event-Ort verwendet
                    "ort": ort_val,
                    "datum": datum_val,
                    "rolle": rolle,
                    "anmerkung": anmerkung,
                    "_source": source_info,
                }
                # Ortsindex-Lookup, damit der Annotations-Zweig in add_relations_to_records
                # Wikidata-Enrichment (Koordinaten, Land) auf das atPlace-Subobjekt
                # anwenden kann (Mobilitaets-Atlas-Vorarbeit).
                ort_lookup = indices.get("ort", {}).get(ort_val.strip().lower())
                if ort_lookup and 'wikidata_id' in ort_lookup:
                    ste_rel["wikidata_id"] = ort_lookup["wikidata_id"]
                relations.setdefault(objekt_id, []).append(ste_rel)

        # Reine ort-Zeile mit Mobilitaets-Rolle -> datumslose Annotation
        # (E-97). Additiv zur flachen rico:hasOrHadLocation (kein Index-Regress):
        # der ort-Zweig in add_relations_to_records emittiert den Ort weiterhin
        # als Location, dieser Block ergaenzt das Mobilitaetsereignis. Greift nur
        # ohne Datum — mit Datum traegt bereits die Komposit-ort,datum-Annotation oben.
        if typen == ['ort'] and (rolle or '').strip().lower() in MOBILITY_PLACE_ROLES:
            mob_ort = name.strip() if name else ''
            if mob_ort:
                mob_rel = {
                    "typ": "spatiotemporal",
                    "name": mob_ort,
                    "ort": mob_ort,
                    "rolle": rolle,
                    "anmerkung": anmerkung,
                    "_source": source_info,
                }
                mob_lookup = indices.get("ort", {}).get(mob_ort.lower())
                if mob_lookup and 'wikidata_id' in mob_lookup:
                    mob_rel["wikidata_id"] = mob_lookup["wikidata_id"]
                relations.setdefault(objekt_id, []).append(mob_rel)

        # Komposit rolle,person -> m3gim-ontology:Performance (Bühnenrolle + Interpret:in),
        # E-96. Die Performance wird in add_relations als Top-Level-Entity gebaut.
        is_roleperson = 'rolle' in typen and 'person' in typen
        if is_roleperson:
            rolle_val = decomposed.get('rolle')
            person_val = decomposed.get('person')
            if rolle_val and person_val:
                perf_rel = {
                    "typ": "performance",
                    "name": person_val,
                    "stageRole": rolle_val,
                    "performer": person_val,
                    "anmerkung": anmerkung,
                    "_source": source_info,
                }
                p_lookup = indices.get("person", {}).get(person_val.strip().lower())
                if p_lookup and 'wikidata_id' in p_lookup:
                    perf_rel["performer_wikidata_id"] = p_lookup["wikidata_id"]
                relations.setdefault(objekt_id, []).append(perf_rel)

        # Komposit datum,werk -> m3gim-ontology:Performance (Aufführung eines Werks), E-98.
        # Werk nur über den Index, nie literale Q-ID/Rohstring. Komponist-statt-
        # Werk-Zeilen (kein führendes Jahr) fallen am is_iso_date-Gate raus.
        is_datumwerk = 'datum' in typen and 'werk' in typen
        if is_datumwerk:
            datum_val = decomposed.get('datum')
            werk_val = decomposed.get('werk')
            if datum_val and werk_val and is_iso_date(datum_val):
                perf_rel = {
                    "typ": "performance",
                    "name": werk_val,
                    "performanceOf": werk_val,
                    "auffuehrungsdatum": datum_val,
                    "anmerkung": anmerkung,
                    "_source": source_info,
                }
                w_lookup = indices.get("werk", {}).get(werk_val.strip().lower())
                if w_lookup and 'wikidata_id' in w_lookup:
                    perf_rel["work_wikidata_id"] = w_lookup["wikidata_id"]
                relations.setdefault(objekt_id, []).append(perf_rel)

        for t in typen:
            # Einzelteile der Performance-Komposite nicht zusätzlich emittieren —
            # die n-äre Performance trägt sie (E-96/E-98).
            if is_roleperson and t in ('rolle', 'person'):
                continue
            if is_datumwerk and t in ('datum', 'werk'):
                continue
            # ort,datum: der Datums-Teil ist bereits im Annotationsknoten
            # (atDate) repraesentiert — nicht zusaetzlich als eigene
            # Datumsannotation emittieren (data.md § 4: eine Repraesentation).
            # Der Orts-Teil bleibt als rico:hasOrHadLocation erhalten.
            if ortdatum_ste_emitted and t == 'datum':
                continue
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
                if match:
                    # Kuratierte Indexfelder fuer add_relations_to_records,
                    # getrennt vom Verknuepfungs-anmerkung in rel["anmerkung"]
                    # (M1: ALLE Index-Daten ins JSON-LD).
                    rel["_index"] = match

            if objekt_id not in relations:
                relations[objekt_id] = []
            relations[objekt_id].append(rel)

    return relations


def _is_fonds_subject(agent_entry: dict) -> bool:
    """True if the linked agent is the fonds creator herself. The Wikidata id
    decides; the name is the fallback because a share of the linked agents
    carries no id at all."""
    agent_id = agent_entry.get("@id")
    if agent_id:
        return agent_id == MALANIUK_SUBJECT["@id"]
    return agent_entry.get("name") == MALANIUK_SUBJECT["name"]


def _maybe_add_agrelon(record: dict, typ: str, rolle: str, agent_entry: dict,
                       rel: dict | None = None):
    """Emittiert eine agrelon:*-Relation, wenn (typ, rolle) in AGRELON_MAPPING.

    Die Relation haengt am Record (m3gim-ontology:hasAgentRelation) und traegt als
    Provenance die Record-URI selbst. Der optionale ``rel``-Parameter ist die
    Quell-Verknuepfungszeile — sein ``_source`` wird als ``m3gim-ontology:xlsxSource``
    durchgereicht (technische Provenance).
    """
    mapping = AGRELON_MAPPING.get((typ, rolle))
    if not mapping:
        return
    if _is_fonds_subject(agent_entry):
        # Subject and object would be the same person ("Malaniuk corresponded
        # with Malaniuk"): semantically empty and below the minQualifiedCardi-
        # nality of rico:CorrespondenceRelation. The role stays recorded as
        # m3gim-ontology:hasAssociatedAgent, so no information is lost.
        return
    agrelon_class, _prop = mapping
    rel_entry = {
        "@type": agrelon_class,
        "agrelon:hasSubject": MALANIUK_SUBJECT,
        "agrelon:hasObject": {"name": agent_entry.get("name")},
        "agrelon:metadataProvenance": {"@id": record["@id"]},
    }
    # Agent-@id (wd:) durchreichen, falls vorhanden
    if agent_entry.get("@id"):
        rel_entry["agrelon:hasObject"]["@id"] = agent_entry["@id"]
    # Validity aus rico:date des Records als Heuristik (nur fuer HasEmployeeEmployer)
    if agrelon_class == "agrelon:HasEmployeeEmployer" and record.get("rico:date"):
        rel_entry["agrelon:metadataPeriod"] = {
            "agrelon:hasBeginDate": record["rico:date"][:4],
        }
    if rel is not None:
        attach_xlsx_source(rel_entry, rel)
    record.setdefault("m3gim-ontology:hasAgentRelation", []).append(rel_entry)


def _annotation_id(rec_local_id: str, ort: str, rolle: str, datum: str,
                   seen: dict) -> str:
    """Stabile, inhaltsbasierte Annotations-@id: Hash ueber (Ort, Rolle, Datum)
    je Record statt eines globalen Zaehlers. Das Einfuegen oder Aendern einer
    Annotation verschiebt damit keine anderen @ids mehr (frueher globaler
    Zaehler, wiederkehrender test_22-Bruch). Echte Inhaltsdubletten auf
    demselben Record bekommen ein stabiles Ordinal-Suffix in
    Auftrittsreihenfolge.

    Gehasht wird der erfasste Rollenwert und nicht das Concept, auf das er im
    Vokabular fuehrt. Sonst verschoebe jede Zusammenfuehrung im Vokabular die
    Kennungen der Knoten, die sie gar nicht betrifft.
    """
    raw = "\x1f".join((ort or "", rolle or "", datum or ""))
    h = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:8]
    base = f"m3gim-data:ev_{rec_local_id}_{h}"
    n = seen.get(base, 0) + 1
    seen[base] = n
    return base if n == 1 else f"{base}-{n}"


def build_annotation(record: dict, seen: dict, place: dict | None = None,
                     date: str | None = None, role=None) -> dict:
    """Baut einen Annotationsknoten und haengt ihn an das Dokument.

    Der Knoten traegt seinen Wert in m3gim-ontology:atPlace, in
    m3gim-ontology:atDate oder in beiden und seine erfasste Rolle in
    m3gim-ontology:role. Fehlt der Ort, ist es eine reine Datierung; fehlt das
    Datum, eine reine Verortung. Der Rueckverweis auf das Dokument ist
    Provenienz: das Dokument bezeugt die Annotation.

    Der Aufrufer haengt den Knoten in die Graph-Liste; hier entsteht nur die
    Kante am Dokument, damit @id-Vergabe und Kante nicht auseinanderlaufen.
    """
    rec_local_id = record["@id"].split(":", 1)[-1]
    place_name = place.get("name") if place else None
    node = {
        "@id": _annotation_id(rec_local_id, place_name, role, date, seen),
        "@type": "m3gim-ontology:Annotation",
        "agrelon:metadataProvenance": {"@id": record["@id"]},
    }
    if place:
        node["m3gim-ontology:atPlace"] = place
    if date:
        node["m3gim-ontology:atDate"] = date
    attach_role(node, role)
    record.setdefault("m3gim-ontology:hasAnnotation", []).append({"@id": node["@id"]})
    return node


def _attach_index_fields(entry: dict, rel: dict, typ: str):
    """Haengt kuratierte Indexfelder (rel['_index']) als m3gim-ontology:-Properties an
    die Entitaet. Eigener Namespace, additiv zum Loader; getrennt vom
    Verknuepfungs-anmerkung. data.md § Index-Durchreichung (M1).

    person: anmerkung -> indexNote (Beruf), lebensdaten -> lifespan.
    institution: ort -> headquarters, assoziierte_person -> keyContact, anmerkung -> indexNote.
    werk: rolle_stimme -> sungPart (von Malaniuk gesungene Partie), anmerkung -> indexNote.
    """
    idx = rel.get("_index")
    if not idx:
        return
    note = idx.get("anmerkung")
    if typ == "person":
        if note:
            entry["m3gim-ontology:indexNote"] = note
        if idx.get("lebensdaten"):
            entry["m3gim-ontology:lifespan"] = idx["lebensdaten"]
    elif typ == "institution":
        if idx.get("ort"):
            entry["m3gim-ontology:headquarters"] = idx["ort"]
        if idx.get("assoziierte_person"):
            entry["m3gim-ontology:keyContact"] = idx["assoziierte_person"]
        if note:
            entry["m3gim-ontology:indexNote"] = note
    elif typ == "werk":
        if idx.get("rolle_stimme"):
            entry["m3gim-ontology:sungPart"] = idx["rolle_stimme"]
        if note:
            entry["m3gim-ontology:indexNote"] = note


def add_relations_to_records(records: list, relations: dict,
                             enrichment_data: dict | None = None,
                             stage_roles: dict | None = None,
                             annotation_seen: dict | None = None) -> tuple[list, list]:
    """Fuegt Verknuepfungen als RiC-O/m3gim Properties zu Records hinzu.

    Returns:
        (annotations, performances): Top-Level-Entities, die dem Graph
        hinzugefuegt werden. StageRole-Entitäten werden in das geteilte
        ``stage_roles``-Registry dedupliziert (E-96/E-98), Annotations-@ids in
        das geteilte ``annotation_seen``-Registry.
    """
    if enrichment_data is None:
        enrichment_data = {}
    if stage_roles is None:
        stage_roles = {}
    if annotation_seen is None:
        annotation_seen = {}
    annotations = []
    performances = []
    perf_counter = 0  # Performance-@ids bleiben (Scope: nur Annotationen stabilisiert)
    for record in records:
        identifier = record.get("rico:identifier")
        if not identifier or identifier not in relations:
            continue

        agents = []
        locations = []
        subjects = []
        creation_dates = []  # Entstehungsdatierung -> rico:creationDate
        mentions = []

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
            attach_role(entry, rel.get("rolle"))
            attach_xlsx_source(entry, rel)
            # E-102: Datenqualitaets-Flag aus anmerkung-Signal an die Entitaet,
            # auf die sich die Unsicherheit bezieht (person/institution/ort/werk).
            _qf = quality_flags(rel.get("anmerkung"))
            if _qf:
                entry["m3gim-ontology:dataQualityFlag"] = _qf if len(_qf) > 1 else _qf[0]

            if t == "person":
                rolle_lower = (rel.get("rolle") or "").lower()
                _attach_index_fields(entry, rel, "person")
                if rolle_lower in ["erwähnt", "erwaehnt", "erwähnt"]:
                    mentions.append(entry)
                else:
                    entry["@type"] = "rico:Person"
                    agents.append(entry)
                    _maybe_add_agrelon(record, t, rolle_lower, entry, rel=rel)

            elif t == "institution":
                entry["@type"] = "rico:CorporateBody"
                _attach_index_fields(entry, rel, "institution")
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
                # Komposit "ort,datum" vererbt die Rolle an beide Haelften.
                # Eine Datumsrolle (erscheinungsdatum, auffuehrung, ...) gehoert
                # semantisch nur zum Datum-Teil — am Ort produziert sie im UI
                # Etiketten wie "Muenchen (erscheinungsdatum)". Hier strippen,
                # damit die Rolle nur dort erscheint, wo sie aussagekraeftig ist.
                if (rel.get("rolle") or "").strip().lower() in DATE_ONLY_ROLES:
                    entry.pop("role", None)
                    entry.pop("m3gim-ontology:derivedFromRole", None)
                locations.append(entry)

            elif t == "werk":
                entry["@type"] = "m3gim-ontology:MusicalWork"
                if rel.get("komponist"):
                    entry["composer"] = rel["komponist"]
                _attach_index_fields(entry, rel, "werk")
                subjects.append(entry)

            elif t == "ereignis":
                entry["@type"] = "m3gim-ontology:FramingEvent"
                if rel.get("datum"):
                    entry["date"] = rel["datum"]
                if "role" not in entry:
                    attach_role(entry, "rahmenveranstaltung")
                subjects.append(entry)

            elif t == "rolle":
                # Standalone-Bühnenrolle (ohne Interpret:in) -> m3gim-ontology:Performance
                # mit nur hasStageRole; löst das alte Attribut hasPerformanceRole
                # ab (E-96).
                perf_counter += 1
                rec_local_id = record["@id"].split(":", 1)[-1]
                perf_id = f"m3gim-data:perf_{rec_local_id}_{perf_counter}"
                perf = {
                    "@id": perf_id,
                    "@type": "m3gim-ontology:Performance",
                    "m3gim-ontology:hasStageRole": {"@id": _make_stage_role(stage_roles, name)},
                }
                if rel.get("anmerkung"):
                    perf["rico:generalDescription"] = rel["anmerkung"]
                _qf = quality_flags(rel.get("anmerkung"))
                if _qf:
                    perf["m3gim-ontology:dataQualityFlag"] = _qf if len(_qf) > 1 else _qf[0]
                attach_xlsx_source(perf, rel)
                performances.append(perf)
                record.setdefault("m3gim-ontology:hasPerformance", []).append({"@id": perf_id})

            elif t == "datum":
                date_val = clean_date(rel.get("datum") or name)
                if not date_val:
                    continue
                # Datums-Routing (data.md § 6, E-102): Textnotationen erst auf
                # ISO normalisieren ("X bis Y" → TimeSpan, "ab/seit X" → nach:).
                date_val = normalize_dating(date_val)
                rolle_key = (rel.get("rolle") or "").strip().lower()
                if rolle_key == CREATION_DATE_ROLE and is_iso_date(date_val):
                    # Die reine Entstehungsdatierung des Dokuments steht am
                    # Dokument selbst, auf dem RiC-O-Term rico:creationDate.
                    creation_dates.append(date_val)
                    continue
                # Jeder andere Datumswert wird ein Annotationsknoten mit
                # m3gim-ontology:atDate und seiner erfassten Rolle. Kein
                # Property-Name traegt mehr eine Rolle.
                annotation = build_annotation(record, annotation_seen,
                                              date=date_val, role=rolle_key or None)
                if rel.get("anmerkung"):
                    annotation["rico:generalDescription"] = rel["anmerkung"]
                qf = quality_flags(rel.get("anmerkung"))
                # Eine Notation, die kein ISO-Datum ergibt, wird markiert statt
                # eine eigene Bauform zu erzwingen. Der Wert bleibt im Wortlaut
                # der Quelle stehen und geht ins Fehlerregister.
                if not is_iso_date(date_val):
                    qf = qf + ["datierung-malformed"]
                if qf:
                    annotation["m3gim-ontology:dataQualityFlag"] = (
                        qf if len(qf) > 1 else qf[0]
                    )
                attach_xlsx_source(annotation, rel)
                annotations.append(annotation)

            elif t == "detail":
                # Schicht-3-Detail als strukturiertes Objekt
                detail_entry = {
                    "@type": "m3gim-ontology:Annotation",
                    "m3gim-ontology:detailField": name
                }
                if rel.get("rolle"):
                    detail_entry["m3gim-ontology:detailValue"] = rel["rolle"]
                if rel.get("anmerkung"):
                    detail_entry["rico:generalDescription"] = rel["anmerkung"]
                attach_xlsx_source(detail_entry, rel)
                if "m3gim-ontology:hasDetail" not in record:
                    record["m3gim-ontology:hasDetail"] = []
                record["m3gim-ontology:hasDetail"].append(detail_entry)

            elif t == "spatiotemporal":
                # Komposit ort,datum bzw. datumslose Mobilitaets-Ortsrolle
                # (E-97) als Annotationsknoten mit Rueckverweis.
                # Vertragsstatus ("nicht eingehalten") ist keine Rolle,
                # sondern eine spaltenweit durchgereichte Vertragsmarkierung
                # (data-model.md § 11). Vor @id-Hash UND Rolle herausfiltern, damit
                # beide konsistent bleiben (test_35 leitet die @id aus dem Output ab).
                ste_role = rel.get("rolle")
                if ste_role and ste_role.strip().lower() in CONTRACT_STATUS_ROLES:
                    ste_role = None
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
                # Der Rueckverweis auf den Record ist Provenienz (der Record
                # dokumentiert die Annotation); rico:isAssociatedWithRecord
                # existiert in RiC-O 1.1 nicht (E-103). data-model.md § 10.
                ev = build_annotation(record, annotation_seen, place=place_entry,
                                      date=rel.get("datum"), role=ste_role)
                if rel.get("anmerkung"):
                    ev["rico:generalDescription"] = rel["anmerkung"]
                attach_xlsx_source(ev, rel)
                annotations.append(ev)

            elif t == "performance":
                # n-äre m3gim-ontology:Performance aus rolle,person (E-96) bzw. datum,werk
                # (E-98) als Top-Level-Entity mit Rückverweis am Record.
                perf_counter += 1
                rec_local_id = record["@id"].split(":", 1)[-1]
                perf_id = f"m3gim-data:perf_{rec_local_id}_{perf_counter}"
                perf = {"@id": perf_id, "@type": "m3gim-ontology:Performance"}
                if rel.get("stageRole"):
                    perf["m3gim-ontology:hasStageRole"] = {
                        "@id": _make_stage_role(stage_roles, rel["stageRole"])
                    }
                if rel.get("performer"):
                    performer = {"name": rel["performer"], "@type": "rico:Person"}
                    pwid = rel.get("performer_wikidata_id", "")
                    if pwid and re.match(r'^Q\d+$', pwid):
                        performer["@id"] = f"wd:{pwid}"
                        performer["owl:sameAs"] = f"http://www.wikidata.org/entity/{pwid}"
                        pen = enrichment_data.get(pwid, {}).get("properties", {})
                        if pen:
                            _inject_enrichment(performer, pen)
                    perf["m3gim-ontology:hasPerformer"] = performer
                if rel.get("performanceOf"):
                    work = {"name": rel["performanceOf"], "@type": "m3gim-ontology:MusicalWork"}
                    wwid = rel.get("work_wikidata_id", "")
                    if wwid and re.match(r'^Q\d+$', wwid):
                        work["@id"] = f"wd:{wwid}"
                        work["owl:sameAs"] = f"http://www.wikidata.org/entity/{wwid}"
                    perf["m3gim-ontology:performanceOf"] = work
                if rel.get("auffuehrungsdatum"):
                    perf["m3gim-ontology:atDate"] = rel["auffuehrungsdatum"]
                if rel.get("anmerkung"):
                    perf["rico:generalDescription"] = rel["anmerkung"]
                attach_xlsx_source(perf, rel)
                performances.append(perf)
                record.setdefault("m3gim-ontology:hasPerformance", []).append({"@id": perf_id})

            elif t in ["ausgaben", "einnahmen", "summe"]:
                # Finanz-Informationen als Detailangabe (data.md Abschnitt 11).
                # Doppelbetrag ('25, DM/45, DM') -> zwei Detailangaben mit
                # gleichem detailField (parse_monetary_values).
                for amount, currency in parse_monetary_values(name):
                    if currency is None and amount is not None:
                        currency = default_currency_for(
                            record.get("rico:identifier", ""))
                    detail_entry = {
                        "@type": "m3gim-ontology:Annotation",
                        "m3gim-ontology:detailField": t,
                        "m3gim-ontology:detailValue": name,
                    }
                    attach_role(detail_entry, rel.get("rolle"))
                    if amount is not None:
                        detail_entry["m3gim-ontology:monetaryAmount"] = {
                            "@value": amount,
                            "@type": "xsd:decimal",
                        }
                    if currency:
                        detail_entry["m3gim-ontology:currency"] = currency
                    attach_xlsx_source(detail_entry, rel)
                    if "m3gim-ontology:hasDetail" not in record:
                        record["m3gim-ontology:hasDetail"] = []
                    record["m3gim-ontology:hasDetail"].append(detail_entry)

        # Erwähnte Personen → rico:hasOrHadSubject (statt einer eigenen Kante)
        # Sie werden als rico:Person mit role "erwähnt" modelliert
        for m in mentions:
            m["@type"] = "rico:Person"
            subjects.append(m)

        # Properties setzen (nur wenn nicht leer)
        if agents:
            record["m3gim-ontology:hasAssociatedAgent"] = (
                agents if len(agents) > 1 else agents[0]
            )
        if locations:
            record["rico:hasOrHadLocation"] = locations if len(locations) > 1 else locations[0]
        if subjects:
            record["rico:hasOrHadSubject"] = subjects if len(subjects) > 1 else subjects[0]
        if creation_dates:
            record["rico:creationDate"] = (
                creation_dates if len(creation_dates) > 1 else creation_dates[0]
            )

    return annotations, performances


def normalize_containers(records: list) -> None:
    """Einelementige Sammelkanten auf ihren einzigen Wert zurueckfuehren.

    Laeuft ueber alle Records und Konvolute in einem Durchgang, weil die
    Annotationen eines Dokuments aus zwei Quellen kommen, den Objektzeilen und
    den Verknuepfungszeilen.
    """
    for record in records:
        for prop in ("m3gim-ontology:hasDetail", "m3gim-ontology:hasAnnotation",
                     "m3gim-ontology:hasPerformance"):
            values = record.get(prop)
            if isinstance(values, list) and len(values) == 1:
                record[prop] = values[0]


# ---------------------------------------------------------------------------
# Enrichment-Injection
# ---------------------------------------------------------------------------

def _inject_enrichment(entry: dict, props: dict):
    """Injiziert Wikidata-Enrichment-Properties in eine Entitaet.

    Die Datumswerte laufen durch ``strip_zero_date_padding``, weil der
    Enrichment-Cache aus einem Lauf vor der Praezisions-Normalisierung stammen
    kann und die Wikidata-Nullform sonst in den Datensatz durchschlaegt (E-132).
    """
    # Personen
    if "occupation" in props:
        labels = [o.get("label", o.get("qid", "")) for o in props["occupation"]
                  if isinstance(o, dict)]
        if labels:
            entry["gndo:professionOrOccupationAsLiteral"] = labels
    if "voiceType" in props:
        items = props["voiceType"]
        if isinstance(items, list) and items:
            entry["m3gim-ontology:voiceType"] = items[0].get("label", "") if isinstance(items[0], dict) else str(items[0])
        elif isinstance(items, dict):
            entry["m3gim-ontology:voiceType"] = items.get("label", "")
    if "birthDate" in props:
        entry["schema:birthDate"] = strip_zero_date_padding(props["birthDate"])
    if "deathDate" in props:
        entry["schema:deathDate"] = strip_zero_date_padding(props["deathDate"])
    if "birthPlace" in props:
        bp = props["birthPlace"]
        if isinstance(bp, dict):
            entry["schema:birthPlace"] = bp.get("label", bp.get("qid", ""))
    if "deathPlace" in props:
        dp = props["deathPlace"]
        if isinstance(dp, dict):
            entry["schema:deathPlace"] = dp.get("label", dp.get("qid", ""))

    # Orte
    if "coordinates" in props:
        coords = props["coordinates"]
        if isinstance(coords, dict) and "lat" in coords:
            entry["geo:lat"] = coords["lat"]
            entry["geo:long"] = coords["lon"]
    if "country" in props:
        c = props["country"]
        if isinstance(c, dict):
            entry["m3gim-ontology:country"] = c.get("label", c.get("qid", ""))

    # Werke
    if "composer" in props:
        c = props["composer"]
        if isinstance(c, dict):
            entry["m3gim-ontology:wdComposer"] = c.get("label", c.get("qid", ""))
    if "genre" in props:
        items = props["genre"]
        if isinstance(items, list) and items:
            entry["m3gim-ontology:wdGenre"] = [g.get("label", "") for g in items if isinstance(g, dict)]
        elif isinstance(items, dict):
            entry["m3gim-ontology:wdGenre"] = items.get("label", "")
    if "premiereDate" in props:
        entry["m3gim-ontology:wdPremiereDate"] = strip_zero_date_padding(props["premiereDate"])
    elif "publicationDate" in props:
        entry["m3gim-ontology:wdPremiereDate"] = strip_zero_date_padding(props["publicationDate"])

    # Organisationen
    if "location" in props:
        loc = props["location"]
        if isinstance(loc, dict):
            entry["m3gim-ontology:wdLocation"] = loc.get("label", loc.get("qid", ""))
    if "inception" in props:
        entry["m3gim-ontology:wdInception"] = strip_zero_date_padding(props["inception"])


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
        # Guard: nicht-textuelle Header (im Box-Export traegt Spalte 0
        # statt "box_nr" den int 1) ueberspringen, statt an .lower() zu
        # scheitern (E-95).
        if not isinstance(col, str):
            continue
        col_lower = col.lower()
        if col_lower in ['folio', 'folio nr', 'folio_nr'] or 'unnamed' in col_lower:
            # Pruefen ob die Spalte Folio-artige Werte hat
            sample = df_objekte[col].dropna().astype(str).head(5)
            if any(re.match(r'^\d+_\d+$', s.strip()) or s.strip().startswith('fol.') for s in sample):
                folio_col = col
                break
    if folio_col:
        print(f"  Folio-Spalte erkannt: '{folio_col}'")

    # Konvolut-Hierarchie bauen. annotation_seen ist ueber alle Erzeugungs-
    # stellen geteilt, damit zwei Annotationen desselben Dokuments nie
    # dieselbe @id bekommen.
    annotation_seen = {}
    records, konvolute, annotations = build_konvolut_hierarchy(
        df_objekte, folio_col, annotation_seen)
    print(f"  {len(records)} Records, {len(konvolute)} Konvolute")

    # Verknuepfungen laden
    verk_path = SHEETS_DIR / "M3GIM-Verknüpfungen.xlsx"
    if not verk_path.exists():
        raise FileNotFoundError(
            f"Verknuepfungstabelle fehlt: {verk_path}. "
            "Erwartet wird genau dieser Dateiname mit Umlaut."
        )

    print(f"\nLade {verk_path.name}...")
    df_verk = load_verknuepfungen(verk_path)
    sheet_names = sorted(df_verk["_xlsx_sheet"].dropna().unique().tolist()) \
        if "_xlsx_sheet" in df_verk.columns else []
    print(f"  {len(df_verk)} Zeilen aus {len(sheet_names)} Sheet(s): {sheet_names}")
    relations = process_verknuepfungen(df_verk, indices)
    total_rels = sum(len(v) for v in relations.values())
    print(f"  {total_rels} Verknuepfungen fuer {len(relations)} Objekte")

    # Relations zu Records hinzufuegen (mit Enrichment-Daten). stage_roles ist
    # ein über beide Aufrufe geteiltes Dedup-Registry für StageRole-Entitäten (E-96).
    stage_roles = {}
    record_annotations, performances = add_relations_to_records(
        records, relations, enrichment_data, stage_roles, annotation_seen)
    # Relations auch zu Konvolut-Records (falls Verknuepfungen am Konvolut haengen)
    konvolut_annotations, performances_k = add_relations_to_records(
        konvolute, relations, enrichment_data, stage_roles, annotation_seen)
    annotations = (list(annotations) + list(record_annotations)
                   + list(konvolut_annotations))
    performances = list(performances) + list(performances_k)
    stage_role_nodes = list(stage_roles.values())
    normalize_containers(records + konvolute)

    # Gesamtbestand als Fonds
    fonds = {
        "@id": "m3gim-data:UAKUG_NIM",
        "@type": "rico:RecordSet",
        "rico:hasRecordSetType": {"@id": "ric-rst:Fonds"},
        "rico:identifier": "UAKUG/NIM",
        "rico:title": "Teilnachlass Ira Malaniuk",
        "rico:hasOrHadPart": []
    }

    # Konvolute gehoeren zum Fonds
    for k in konvolute:
        fonds["rico:hasOrHadPart"].append({"@id": k["@id"]})

    # Einzelobjekte (nicht in Konvoluten) gehoeren direkt zum Fonds
    konvolut_member_ids = set()
    for k in konvolute:
        for part in k.get("rico:hasOrHadPart", []):
            konvolut_member_ids.add(part["@id"])

    for r in records:
        if r["@id"] not in konvolut_member_ids:
            fonds["rico:hasOrHadPart"].append({"@id": r["@id"]})

    # SKOS-Konzepte fuer verwendete Dokumenttypen (data.md Abschnitt 12)
    dft_concepts = build_dft_concepts(records)

    # JSON-LD Dokument
    graph = ([fonds] + konvolute + records + dft_concepts
             + annotations + performances + stage_role_nodes)

    jsonld = {
        "@context": CONTEXT,
        "@graph": graph,
        "m3gim-ontology:exportDate": datetime.now().isoformat(),
        "m3gim-ontology:recordCount": len(records),
        "m3gim-ontology:recordSetCount": len(konvolute),
        "m3gim-ontology:approvedManualMatches": recon_count,
        "m3gim-ontology:lowConfidenceSkipped": recon_low_skipped,
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
