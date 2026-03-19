#!/usr/bin/env python3
"""
M³GIM View Data Builder

Generates view-specific JSON files from the main JSON-LD archive data.
These pre-aggregated files improve frontend performance and simplify
visualization code.

Usage:
    python scripts/build-views.py

Output:
    data/views/partitur.json   (Legacy — nicht im Frontend konsumiert)
    data/views/matrix.json
    data/views/kosmos.json
    data/views/sankey.json     (Legacy — nicht im Frontend konsumiert)

Hinweis:
    partitur.json und sankey.json werden weiterhin erzeugt, sind aber
    im aktuellen Frontend nicht eingebunden. Matrix und Kosmos sind
    als Tabs ausgeblendet (hidden), der Code bleibt erhalten.
"""

import json
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
INPUT_FILE = PROJECT_ROOT / 'data' / 'output' / 'm3gim.jsonld'
OUTPUT_DIR = PROJECT_ROOT / 'data' / 'output' / 'views'

# =============================================================================
# STATIC DATA: Lebensphasen (based on biographical research)
# =============================================================================

LEBENSPHASEN = [
    {
        'id': 'LP1',
        'label': 'Kindheit & Jugend',
        'von': 1919,
        'bis': 1937,
        'ort': 'Lemberg',
        'beschreibung': 'Aufgewachsen in der Ukraine (Lemberg/Lwiw)'
    },
    {
        'id': 'LP2',
        'label': 'Studium',
        'von': 1937,
        'bis': 1944,
        'ort': 'Lemberg',
        'beschreibung': 'Gesangsstudium am Konservatorium Lemberg'
    },
    {
        'id': 'LP3',
        'label': 'Flucht & Neuanfang',
        'von': 1944,
        'bis': 1945,
        'ort': 'Wien',
        'beschreibung': 'Flucht vor der Roten Armee, Ankunft in Österreich'
    },
    {
        'id': 'LP4',
        'label': 'Erste Engagements',
        'von': 1945,
        'bis': 1950,
        'ort': 'Graz',
        'beschreibung': 'Engagement an der Grazer Oper, erste Erfolge'
    },
    {
        'id': 'LP5',
        'label': 'Aufstieg',
        'von': 1950,
        'bis': 1955,
        'ort': 'Wien',
        'beschreibung': 'Wiener Staatsoper, erste internationale Auftritte'
    },
    {
        'id': 'LP6',
        'label': 'Internationale Karriere',
        'von': 1955,
        'bis': 1970,
        'ort': 'Wien/Bayreuth',
        'beschreibung': 'Bayreuther Festspiele, Salzburg, internationale Gastspiele'
    },
    {
        'id': 'LP7',
        'label': 'Spätphase & Ruhestand',
        'von': 1970,
        'bis': 2009,
        'ort': 'Zürich',
        'beschreibung': 'Rückzug aus dem Bühnenleben, Leben in Zürich'
    }
]

# Karrierephasen für Sankey (vereinfacht)
KARRIEREPHASEN = [
    {'id': 'anfaenge', 'label': 'Anfänge', 'von': 1940, 'bis': 1950},
    {'id': 'aufstieg', 'label': 'Aufstieg', 'von': 1950, 'bis': 1955},
    {'id': 'hoehepunkt', 'label': 'Höhepunkt', 'von': 1955, 'bis': 1968},
    {'id': 'spaetphase', 'label': 'Spätphase', 'von': 1968, 'bis': 1975}
]

# Komponisten-Mapping (Werk -> Komponist)
KOMPONISTEN_MAPPING = {
    # Wagner
    'ring': 'Wagner',
    'nibelungen': 'Wagner',
    'walküre': 'Wagner',
    'rheingold': 'Wagner',
    'siegfried': 'Wagner',
    'götterdämmerung': 'Wagner',
    'meistersinger': 'Wagner',
    'tristan': 'Wagner',
    'parsifal': 'Wagner',
    'lohengrin': 'Wagner',
    'tannhäuser': 'Wagner',
    'fricka': 'Wagner',
    'waltraute': 'Wagner',
    'erda': 'Wagner',
    'brangäne': 'Wagner',

    # Verdi
    'aida': 'Verdi',
    'amneris': 'Verdi',
    'trovatore': 'Verdi',
    'azucena': 'Verdi',
    'maskenball': 'Verdi',
    'ulrica': 'Verdi',
    'don carlos': 'Verdi',
    'eboli': 'Verdi',

    # Strauss
    'rosenkavalier': 'Strauss',
    'octavian': 'Strauss',
    'ariadne': 'Strauss',
    'elektra': 'Strauss',
    'klytämnestra': 'Strauss',
    'frau ohne schatten': 'Strauss',

    # Gluck/Händel (Barock)
    'orpheus': 'Gluck/Händel',
    'orfeo': 'Gluck/Händel',
    'julius cäsar': 'Gluck/Händel',
    'händel': 'Gluck/Händel',
    'gluck': 'Gluck/Händel',

    # Beethoven
    'fidelio': 'Beethoven',
    'beethoven': 'Beethoven'
}

# Farben für Komponisten
KOMPONISTEN_FARBEN = {
    'Wagner': '#6B2C2C',
    'Verdi': '#2C5C3F',
    'Strauss': '#4A3A6B',
    'Gluck/Händel': '#8B7355',
    'Beethoven': '#4A5A7A',
    'Mozart': '#5B4A8A',
    'Wolf': '#6B5B3F',
    'Brahms': '#3A5C6B',
    'Schubert': '#7A5A4A',
    'Bizet': '#8A3A4A',
    'Hindemith': '#4A6B5A',
    'Lortzing': '#5A6B7A',
    'Rossini': '#7A4A5A',
    'Andere': '#757575'
}

# =============================================================================
# AUFTRITTS-KATEGORISIERUNG
# =============================================================================

# Biografische Hauptorte mit Engagement-Zeiträumen
LOCATION_ORDER = ['Lemberg', 'Wien', 'Graz', 'Bayreuth', 'München', 'Salzburg', 'Zürich']

ENGAGEMENT_ZEITRAEUME = {
    'Graz': (1945, 1950),
    'Wien': (1950, 1970),
}

FESTSPIEL_ORTE = {'Bayreuth', 'Salzburg'}
FESTSPIEL_KEYWORDS = {'festspiel', 'festival', 'festvorstellung', 'festwoche', 'mozart-woche'}

KONZERT_KEYWORDS = {'liederabend', 'konzert', 'sinfonisch', 'symphonie', 'sinfonie',
                    'lied', 'solistin', 'lieder'}

# Oper-Indikatoren (Titel oder Rollenname → Gattung oper)
OPER_KEYWORDS = {'oper', 'opera', 'atto', 'akte', 'aufzüge', 'musikdrama'}

AUFTRITT_FARBEN = {
    'engagement': '#004A8F',
    'festspiel': '#9A7B4F',
    'gastspiel': '#3D7A5A',
    'konzert': '#6B4E8C',
}

# Personen-Kategorien (bekannte Persönlichkeiten aus dem Archiv)
# Erweiterte Liste basierend auf Archivanalyse
PERSONEN_KATEGORIEN = {
    # Dirigenten
    'karajan': 'Dirigent',
    'böhm': 'Dirigent',
    'knappertsbusch': 'Dirigent',
    'furtwängler': 'Dirigent',
    'krauss': 'Dirigent',
    'solti': 'Dirigent',
    'kempe': 'Dirigent',
    'hindemith': 'Dirigent',  # Paul Hindemith (NIM_PL_17)
    'kolessa': 'Dirigent',  # Nikolaus Kolessa (NIM_PL_04)

    # Regisseure/Intendanten
    'wieland wagner': 'Regisseur',
    'wolfgang wagner': 'Regisseur',
    'felsenstein': 'Regisseur',
    'hartmann': 'Regisseur',  # Rudolf Hartmann (NIM_084, NIM_028)

    # Vermittler/Korrepetitoren
    'werba': 'Korrepetitor',  # Erik/Eric Werba (NIM_PL_01, NIM_PL_02)
    'taubman': 'Vermittler',  # Agentur Taubman (NIM_028)
    'baumgartner': 'Korrepetitor',  # Paul Baumgartner (NIM_048)

    # Kollegen (Sänger)
    'ludwig': 'Kollege',
    'jurinac': 'Kollege',
    'della casa': 'Kollege',
    'nilsson': 'Kollege',
    'vickers': 'Kollege',
    'windgassen': 'Kollege',
    'hotter': 'Kollege',
    'rehfuss': 'Kollege',  # Heinz Rehfuss (NIM_048)
    'callas': 'Kollege',  # Maria Callas (NIM_080)

    # Institutionen/Personen aus Korrespondenz
    'kojetinsky': 'Institution',  # Max Kojetinsky, Opernhaus Graz (NIM_081)
    'gasser': 'Korrespondenz',  # Dr. C. Gasser (NIM_059)
    'speck': 'Korrespondenz',  # Dr. Eduard Speck (NIM_096)
}

# Vollständige Namen für bekannte Personen
PERSONEN_VOLLNAMEN = {
    'karajan': 'Herbert von Karajan',
    'böhm': 'Karl Böhm',
    'knappertsbusch': 'Hans Knappertsbusch',
    'furtwängler': 'Wilhelm Furtwängler',
    'krauss': 'Clemens Krauss',
    'solti': 'Georg Solti',
    'kempe': 'Rudolf Kempe',
    'hindemith': 'Paul Hindemith',
    'kolessa': 'Nikolaus Kolessa',
    'wieland wagner': 'Wieland Wagner',
    'wolfgang wagner': 'Wolfgang Wagner',
    'felsenstein': 'Walter Felsenstein',
    'hartmann': 'Rudolf Hartmann',
    'werba': 'Erik Werba',
    'taubman': 'Agentur Taubman',
    'baumgartner': 'Paul Baumgartner',
    'ludwig': 'Christa Ludwig',
    'jurinac': 'Sena Jurinac',
    'della casa': 'Lisa della Casa',
    'nilsson': 'Birgit Nilsson',
    'vickers': 'Jon Vickers',
    'windgassen': 'Wolfgang Windgassen',
    'hotter': 'Hans Hotter',
    'rehfuss': 'Heinz Rehfuss',
    'callas': 'Maria Callas',
    'kojetinsky': 'Max Kojetinsky',
    'gasser': 'Dr. C. Gasser',
    'speck': 'Dr. Eduard Speck',
}


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def load_jsonld():
    """Load and parse the JSON-LD file."""
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('@graph', [])


def extract_year(date_str):
    """Extract the first year from a date string."""
    if not date_str:
        return None

    # Handle date ranges (1958-04-18/1958-09-09)
    if '/' in date_str:
        date_str = date_str.split('/')[0]

    # Extract year
    match = re.match(r'(\d{4})', date_str)
    if match:
        return int(match.group(1))
    return None


def get_5year_period(year):
    """Convert a year to a 5-year period string."""
    if not year:
        return None
    start = (year // 5) * 5
    return f'{start}-{start + 4}'


def get_karrierephase(year):
    """Determine the career phase for a given year."""
    if not year:
        return None
    for phase in KARRIEREPHASEN:
        if phase['von'] <= year <= phase['bis']:
            return phase['id']
    return None


def get_dokumenttyp(record):
    """Extract document type from record."""
    dft = record.get('rico:hasDocumentaryFormType', {})
    if isinstance(dft, dict):
        type_id = dft.get('@id', '')
        return type_id.replace('m3gim-dft:', '')
    return 'Unknown'


def get_komponist_from_title(title):
    """Try to determine composer from title."""
    if not title:
        return None

    title_lower = title.lower()
    for keyword, komponist in KOMPONISTEN_MAPPING.items():
        if keyword in title_lower:
            return komponist
    return None


def get_person_kategorie(name):
    """Determine category for a person."""
    if not name:
        return 'Andere'

    name_lower = name.lower()
    for keyword, kategorie in PERSONEN_KATEGORIEN.items():
        if keyword in name_lower:
            return kategorie
    return 'Andere'


def ensure_list(value):
    """Ensure value is a list."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


# Normalisierung: "Wagner, Richard" → "Wagner" (Kurzform fuer Farb-Zuordnung)
KOMPONISTEN_NORMALISIERUNG = {
    'wagner, richard': 'Wagner',
    'wagner': 'Wagner',
    'verdi, giuseppe': 'Verdi',
    'verdi, guiseppe': 'Verdi',
    'verdi': 'Verdi',
    'strauss, richard': 'Strauss',
    'strauss': 'Strauss',
    'gluck, christoph willibald': 'Gluck/Händel',
    'gluck': 'Gluck/Händel',
    'händel': 'Gluck/Händel',
    'beethoven, ludwig van': 'Beethoven',
    'beethoven, ludwig von': 'Beethoven',
    'beethoven': 'Beethoven',
    'mozart, wolfgang amadeus': 'Mozart',
    'mozart': 'Mozart',
    'wolf, hugo': 'Wolf',
    'wolf': 'Wolf',
    'brahms, johannes': 'Brahms',
    'brahms': 'Brahms',
    'schubert, franz': 'Schubert',
    'schubert': 'Schubert',
    'bizet, georges': 'Bizet',
    'bizet': 'Bizet',
    'hindemith, paul': 'Hindemith',
    'hindemith': 'Hindemith',
    'lortzing, albert': 'Lortzing',
    'lortzing': 'Lortzing',
    'rossini, gioachino': 'Rossini',
    'rossini': 'Rossini',
}


def normalize_komponist(name):
    """Normalisiert Komponistennamen auf kanonische Kurzform."""
    if not name:
        return name
    return KOMPONISTEN_NORMALISIERUNG.get(name.strip().lower(), name.strip())


# =============================================================================
# AUFTRITTS-EXTRAKTION
# =============================================================================

def _get_lebensphase(year):
    """Determine life phase ID for a given year."""
    if not year:
        return None
    for phase in LEBENSPHASEN:
        if phase['von'] <= year <= phase['bis']:
            return phase['id']
    return None


def _extract_ort_from_record(record):
    """Extract performance location from record (structured data)."""
    ort = None
    ort_detail = None

    # 1. Check rico:hasOrHadLocation with role auffuehrungsort
    locations = ensure_list(record.get('rico:hasOrHadLocation'))
    for loc in locations:
        if isinstance(loc, dict):
            role = (loc.get('role') or '').lower()
            if role in ('auffuehrungsort', 'gastspiel', 'aufführung', 'spielzeit'):
                ort = loc.get('name', '')
                break

    # 2. Check agents with role auffuehrungsort (institutions as venues)
    if not ort:
        agents = ensure_list(record.get('m3gim:hasAssociatedAgent'))
        for agent in agents:
            if isinstance(agent, dict):
                role = (agent.get('role') or '').lower()
                if role == 'auffuehrungsort':
                    name = agent.get('name', '')
                    # Map institution → city
                    if 'staatsoper' in name.lower() and 'wien' in name.lower():
                        ort, ort_detail = 'Wien', name
                    elif 'staatsoper' in name.lower() and 'bayer' in name.lower():
                        ort, ort_detail = 'München', name
                    elif 'bayreuth' in name.lower() or 'festspiel' in name.lower():
                        ort, ort_detail = 'Bayreuth', name
                    elif 'salzburg' in name.lower():
                        ort, ort_detail = 'Salzburg', name
                    elif 'graz' in name.lower():
                        ort, ort_detail = 'Graz', name
                    else:
                        ort_detail = name
                    break

    # 3. Fallback: first location with any meaningful role
    if not ort:
        for loc in locations:
            if isinstance(loc, dict):
                role = (loc.get('role') or '').lower()
                if role in ('entstehungsort', 'erscheinungsdatum'):
                    ort = loc.get('name', '')
                    break

    return ort, ort_detail


def _extract_werk_from_record(record):
    """Extract musical work + composer from record."""
    werk = None
    komponist = None
    gattung = None

    # 1. Structured: rico:hasOrHadSubject with @type m3gim:MusicalWork
    subjects = ensure_list(record.get('rico:hasOrHadSubject'))
    for subj in subjects:
        if isinstance(subj, dict) and subj.get('@type') == 'm3gim:MusicalWork':
            werk = subj.get('name', '')
            komponist = normalize_komponist(subj.get('komponist', ''))
            break

    # 2. Fallback: title-matching
    if not komponist:
        komponist = get_komponist_from_title(record.get('rico:title'))

    # Determine gattung
    title_lower = (record.get('rico:title') or '').lower()
    roles = ensure_list(record.get('m3gim:hasPerformanceRole'))
    has_character_role = any(
        isinstance(r, dict) and r.get('name', '') and r.get('name', '') not in ('Alt Solo',)
        for r in roles
    )

    if any(kw in title_lower for kw in OPER_KEYWORDS) or has_character_role:
        gattung = 'oper'
    elif any(kw in title_lower for kw in KONZERT_KEYWORDS):
        gattung = 'konzert'
    elif werk and komponist:
        gattung = 'oper'  # default for named works with composer
    else:
        gattung = None

    return werk, komponist, gattung


def _extract_rolle_from_record(record):
    """Extract Malaniuk's performance role from record."""
    roles = ensure_list(record.get('m3gim:hasPerformanceRole'))
    for role in roles:
        if isinstance(role, dict):
            role_type = (role.get('role') or '').lower()
            if role_type in ('aufführung', 'interpret:in', 'premiere', 'auftritt'):
                return role.get('name')
    # First role as fallback
    if roles and isinstance(roles[0], dict):
        return roles[0].get('name')
    return None


def _categorize_auftritt(ort, jahr, title, roles_raw):
    """Determine auftritt category: engagement, festspiel, gastspiel, konzert."""
    title_lower = (title or '').lower()

    # 1. Festspiel-Orte
    if ort in FESTSPIEL_ORTE:
        return 'festspiel'

    # 2. Festspiel-Keywords in title
    if any(kw in title_lower for kw in FESTSPIEL_KEYWORDS):
        return 'festspiel'

    # 3. Gastspiel role in performance roles
    roles = ensure_list(roles_raw)
    for r in roles:
        if isinstance(r, dict) and (r.get('role') or '').lower() == 'gastspiel':
            return 'gastspiel'

    # 4. Engagement: known city within engagement period
    if ort and jahr and ort in ENGAGEMENT_ZEITRAEUME:
        von, bis = ENGAGEMENT_ZEITRAEUME[ort]
        if von <= jahr <= bis:
            return 'engagement'

    # 5. Konzert-Keywords
    if any(kw in title_lower for kw in KONZERT_KEYWORDS):
        return 'konzert'

    # 6. Main city outside engagement period → engagement (broader sense)
    if ort in LOCATION_ORDER:
        return 'engagement'

    # 7. Fallback
    return 'gastspiel'


def extract_auftritte(records):
    """
    Extract performance events from archive records.

    Three-pass extraction:
    - Pass 1: Structured data (eventDate + location + work)
    - Pass 2: Programmhefte + Plakate (title parsing)
    - Pass 3: Rezensionen with performance context

    Returns deduplicated list of performance events.
    """
    raw_auftritte = []
    seen_records = set()

    for record in records:
        if record.get('@type') == 'rico:RecordSet':
            continue

        rec_id = record.get('@id', '')
        signatur = record.get('rico:identifier', '')
        title = record.get('rico:title', '')
        doc_type = get_dokumenttyp(record)

        # Extract year from eventDate (preferred) or rico:date
        jahr = None
        datum = None
        event_dates = ensure_list(record.get('m3gim:eventDate'))
        for ed in event_dates:
            if isinstance(ed, str):
                j = extract_year(ed)
                if j:
                    jahr = j
                    datum = ed.split('/')[0] if '/' in ed else ed  # first date
                    break

        if not jahr:
            rico_date = record.get('rico:date')
            if rico_date:
                jahr = extract_year(rico_date)
                datum = rico_date

        if not jahr or jahr < 1935 or jahr > 2009:
            continue

        # Extract components
        ort, ort_detail = _extract_ort_from_record(record)
        werk, komponist, gattung = _extract_werk_from_record(record)
        rolle = _extract_rolle_from_record(record)

        # Pass 1: Structured data (eventDate + location/agent auffuehrungsort)
        has_event_date = len(event_dates) > 0
        has_perf_context = ort is not None or werk is not None

        # Pass 2: Programmhefte + Plakate
        is_performance_doc = doc_type in ('programmheft', 'plakat')

        # Pass 3: Rezensionen with work reference
        is_perf_rezension = (doc_type == 'rezension' and
                             (werk is not None or komponist is not None))

        if not (has_event_date and has_perf_context) and \
           not is_performance_doc and \
           not is_perf_rezension:
            continue

        if rec_id in seen_records:
            continue
        seen_records.add(rec_id)

        # Try to infer ort from title for programmhefte/plakate if missing
        if not ort and title:
            title_lower = title.lower()
            for city in LOCATION_ORDER:
                if city.lower() in title_lower:
                    ort = city
                    break
            # Check common venue names
            if not ort:
                venue_map = {
                    'wiener staatsoper': 'Wien',
                    'staatsoper wien': 'Wien',
                    'volksoper': 'Wien',
                    'bayerische staatsoper': 'München',
                    'prinzregententheater': 'München',
                    'festspielhaus': 'Bayreuth',
                    'mozarteum': 'Salzburg',
                    'tonhalle': 'Zürich',
                    'grazer oper': 'Graz',
                    'opernhaus graz': 'Graz',
                }
                for venue, city in venue_map.items():
                    if venue in title_lower:
                        ort = city
                        ort_detail = venue.title()
                        break

        kategorie = _categorize_auftritt(ort, jahr, title, record.get('m3gim:hasPerformanceRole'))

        raw_auftritte.append({
            'ort': ort,
            'ort_detail': ort_detail,
            'kategorie': kategorie,
            'werk': werk,
            'komponist': komponist,
            'rolle': rolle,
            'jahr': jahr,
            'datum': datum,
            'phase': _get_lebensphase(jahr),
            'dokumente': [signatur],
            'gattung': gattung,
            'titel': title[:80] if title else None,
        })

    # Deduplicate: merge records with same (ort, jahr, werk)
    dedup = {}
    for a in raw_auftritte:
        key = (a['ort'] or '', a['jahr'], a['werk'] or '')
        if key in dedup:
            existing = dedup[key]
            for sig in a['dokumente']:
                if sig not in existing['dokumente']:
                    existing['dokumente'].append(sig)
            # Upgrade fields if missing
            if not existing['rolle'] and a['rolle']:
                existing['rolle'] = a['rolle']
            if not existing['ort_detail'] and a['ort_detail']:
                existing['ort_detail'] = a['ort_detail']
            if not existing['gattung'] and a['gattung']:
                existing['gattung'] = a['gattung']
        else:
            dedup[key] = a

    result = sorted(dedup.values(), key=lambda x: (x['jahr'], x['ort'] or ''))

    # Log statistics
    cats = defaultdict(int)
    for a in result:
        cats[a['kategorie']] += 1
    print(f'  Auftritte: {len(result)} total — ' +
          ', '.join(f'{k}: {v}' for k, v in sorted(cats.items())))

    return result


# =============================================================================
# VIEW BUILDERS
# =============================================================================

def build_partitur(records):
    """
    Build data for Mobilitäts-Partitur visualization.

    Structure:
    - lebensphasen: Static biographical phases
    - orte: Locations over time (Wohnort vs. Aufführungsort)
    - mobilitaet: Mobility events with form classification
    - netzwerk: Network density per period
    - repertoire: Roles/works over time
    - dokumente: Document count per year
    """
    print('Building partitur.json...')

    # Aggregate documents per year
    docs_per_year = defaultdict(int)
    for record in records:
        year = extract_year(record.get('rico:date'))
        if year:
            docs_per_year[year] += 1

    # Extract repertoire from titles
    repertoire = []
    for record in records:
        komponist = get_komponist_from_title(record.get('rico:title'))
        if komponist:
            year = extract_year(record.get('rico:date'))
            if year:
                repertoire.append({
                    'komponist': komponist,
                    'jahr': year,
                    'signatur': record.get('rico:identifier'),
                    'titel': record.get('rico:title', '')[:100],
                    'typ': get_dokumenttyp(record)
                })

    # Aggregate repertoire by composer and year range
    komponist_jahre = defaultdict(lambda: {'min': 9999, 'max': 0, 'count': 0, 'dokumente': []})
    for item in repertoire:
        k = item['komponist']
        komponist_jahre[k]['min'] = min(komponist_jahre[k]['min'], item['jahr'])
        komponist_jahre[k]['max'] = max(komponist_jahre[k]['max'], item['jahr'])
        komponist_jahre[k]['count'] += 1
        komponist_jahre[k]['dokumente'].append({
            'signatur': item['signatur'],
            'titel': item['titel'],
            'typ': item.get('typ', 'Unknown')
        })

    repertoire_aggregated = [
        {
            'komponist': k,
            'farbe': KOMPONISTEN_FARBEN.get(k, '#757575'),
            'von': v['min'],
            'bis': v['max'],
            'dokumente': v['count'],
            'dokumente_liste': v['dokumente'][:20]  # Full doc refs for click-through
        }
        for k, v in komponist_jahre.items()
        if v['min'] < 9999
    ]

    # Mobility events with narrative context
    mobilitaet = [
        {
            'von': 'Lemberg',
            'nach': 'Wien',
            'jahr': 1944,
            'form': 'erzwungen',
            'beschreibung': 'Flucht vor der Roten Armee',
            'kontext': 'Abbruch des Studiums am Konservatorium Lemberg, Verlust aller lokalen Netzwerke. 11 Dokumente aus 1944 belegen die dichteste Überlieferung vor 1950.'
        },
        {
            'von': 'Wien',
            'nach': 'Graz',
            'jahr': 1945,
            'form': 'geografisch',
            'beschreibung': 'Erstes Engagement',
            'kontext': 'Engagement als Altistin an der Grazer Oper — Graz als Sprungbrett für die internationale Karriere.'
        },
        {
            'von': 'Graz',
            'nach': 'Wien',
            'jahr': 1950,
            'form': 'geografisch',
            'beschreibung': 'Wiener Staatsoper',
            'kontext': 'Wechsel an die Wiener Staatsoper markiert den Beginn der Aufstiegsphase. Netzwerk-Intensität verdoppelt sich (7 → 46).'
        },
        {
            'von': 'Wien',
            'nach': 'Bayreuth',
            'jahr': 1952,
            'form': 'geografisch',
            'beschreibung': 'Bayreuther Festspiele Debüt',
            'kontext': 'Internationaler Durchbruch. Zusammenarbeit mit Wieland Wagner und Knappertsbusch beginnt.'
        },
        {
            'von': 'Wien',
            'nach': 'Zürich',
            'jahr': 1970,
            'form': 'lebensstil',
            'beschreibung': 'Übersiedlung (Ehemann)',
            'kontext': 'Rückzug aus dem aktiven Bühnenleben. Gleichzeitig Beginn der Lehrtätigkeit an der KUG Graz.'
        },
        {
            'von': 'Lemberg',
            'nach': 'Wien',
            'jahr': 1950,
            'form': 'national',
            'beschreibung': 'Staatsbürgerschaft durch Heirat'
        },
        {
            'von': 'Zürich',
            'nach': 'Graz',
            'jahr': 1970,
            'form': 'bildung',
            'beschreibung': 'Professur für Liedinterpretation, KUG Graz',
            'kontext': 'Wissenstransfer: Erfahrung aus internationaler Karriere fließt in die Lehre. Graz als Ort der Rückkehr.'
        }
    ]

    # Network density per period (simplified - count documents as proxy)
    perioden = ['1940-1944', '1945-1949', '1950-1954', '1955-1959',
                '1960-1964', '1965-1969', '1970-1974']
    netzwerk = []
    for periode in perioden:
        start, end = map(int, periode.split('-'))
        count = sum(docs_per_year[y] for y in range(start, end + 1))
        netzwerk.append({
            'periode': periode,
            'intensitaet': count
        })

    # Extract performance events
    auftritte = extract_auftritte(records)

    return {
        'lebensphasen': LEBENSPHASEN,
        'orte': [
            {'ort': 'Lemberg', 'typ': 'wohnort', 'von': 1919, 'bis': 1944},
            {'ort': 'Wien', 'typ': 'wohnort', 'von': 1944, 'bis': 1950},
            {'ort': 'Graz', 'typ': 'wohnort', 'von': 1945, 'bis': 1950},
            {'ort': 'Wien', 'typ': 'wohnort', 'von': 1950, 'bis': 1970},
            {'ort': 'Zürich', 'typ': 'wohnort', 'von': 1970, 'bis': 2009},
            {'ort': 'Bayreuth', 'typ': 'auffuehrungsort', 'von': 1952, 'bis': 1968},
            {'ort': 'München', 'typ': 'auffuehrungsort', 'von': 1953, 'bis': 1968},
            {'ort': 'Salzburg', 'typ': 'auffuehrungsort', 'von': 1955, 'bis': 1965}
        ],
        'mobilitaet': mobilitaet,
        'auftritte': auftritte,
        'netzwerk': netzwerk,
        'repertoire': sorted(repertoire_aggregated, key=lambda x: -x['dokumente']),
        'dokumente': [
            {'jahr': year, 'anzahl': count}
            for year, count in sorted(docs_per_year.items())
        ],
        '_meta': {
            'generated': datetime.now().isoformat(),
            'source_records': len(records)
        }
    }


def build_matrix(records):
    """
    Build data for Begegnungs-Matrix visualization.

    Structure:
    - zeitraeume: List of 5-year periods
    - kategorien: Person categories
    - personen: List of persons with their encounters per period

    IMPROVED: Weighted intensity based on document type, full names
    """
    print('Building matrix.json...')

    # Extract persons from structured data AND titles
    personen_begegnungen = defaultdict(lambda: defaultdict(list))

    known_persons = list(PERSONEN_KATEGORIEN.keys())

    for record in records:
        # Skip RecordSets (Fonds, Konvolute)
        if record.get('@type') == 'rico:RecordSet':
            continue

        title = (record.get('rico:title') or '').lower()
        year = extract_year(record.get('rico:date'))
        period = get_5year_period(year)
        doc_type = get_dokumenttyp(record)

        if not period:
            continue

        # Calculate intensity based on document type
        intensity_weight = 1
        if doc_type in ['brief', 'korrespondenz']:
            intensity_weight = 3
        elif doc_type in ['programmheft', 'plakat', 'vertrag']:
            intensity_weight = 2

        signatur = record.get('rico:identifier')
        doc_entry = {
            'signatur': signatur,
            'titel': record.get('rico:title', ''),
            'typ': doc_type,
            'weight': intensity_weight
        }

        # Method 1: Extract from structured data (m3gim:hasAssociatedAgent + mentioned persons in subjects)
        seen_names = set()
        for agent in ensure_list(record.get('m3gim:hasAssociatedAgent')):
            if isinstance(agent, dict):
                name = agent.get('name', '')
                if name and name not in seen_names:
                    seen_names.add(name)
                    personen_begegnungen[name][period].append(doc_entry)
        # Mentioned persons are now in rico:hasOrHadSubject with @type rico:Person
        for subj in ensure_list(record.get('rico:hasOrHadSubject')):
            if isinstance(subj, dict) and subj.get('@type') == 'rico:Person':
                name = subj.get('name', '')
                if name and name not in seen_names:
                    seen_names.add(name)
                    personen_begegnungen[name][period].append(doc_entry)

        # Method 2: Fallback title matching for known persons (Iteration 1 approach)
        for person_key in known_persons:
            if person_key in title:
                person_name = PERSONEN_VOLLNAMEN.get(person_key, person_key.title())
                if person_name not in seen_names:
                    personen_begegnungen[person_name][period].append(doc_entry)

    # Convert to output format
    zeitraeume = ['1940-1944', '1945-1949', '1950-1954', '1955-1959',
                  '1960-1964', '1965-1969', '1970-1974']

    personen = []
    for name, perioden in personen_begegnungen.items():
        kategorie = get_person_kategorie(name)
        begegnungen = []
        for z in zeitraeume:
            docs = perioden.get(z, [])
            if docs:
                # Calculate weighted intensity (sum of weights, not just count)
                total_weight = sum(d['weight'] for d in docs)
                begegnungen.append({
                    'zeitraum': z,
                    'intensitaet': total_weight,  # Weighted intensity
                    'anzahl_dokumente': len(docs),  # Actual document count
                    'dokumente': [
                        {'signatur': d['signatur'], 'titel': d['titel'], 'typ': d['typ']}
                        for d in docs  # Include all documents
                    ]
                })

        if begegnungen:  # Only include if there are encounters
            personen.append({
                'name': name,
                'kategorie': kategorie,
                'begegnungen': begegnungen,
                'gesamt_intensitaet': sum(b['intensitaet'] for b in begegnungen)
            })

    # Sort by category, then by total intensity
    def sort_key(p):
        cat_order = {'Dirigent': 0, 'Regisseur': 1, 'Korrepetitor': 2, 'Vermittler': 3, 'Kollege': 4, 'Institution': 5, 'Korrespondenz': 6, 'Andere': 7}
        return (cat_order.get(p['kategorie'], 8), -p['gesamt_intensitaet'])

    personen.sort(key=sort_key)

    return {
        'zeitraeume': zeitraeume,
        'kategorien': ['Dirigent', 'Regisseur', 'Korrepetitor', 'Kollege', 'Vermittler'],
        'personen': personen,
        '_meta': {
            'generated': datetime.now().isoformat(),
            'source_records': len(records),
            'note': 'Intensity weighted by document type: Letter=3, Program/Poster/Contract=2, Photo=1'
        }
    }


def build_kosmos(records):
    """
    Build data for Rollen-Kosmos visualization.

    Structure:
    - zentrum: Ira Malaniuk
    - komponisten: Composers with their works and roles

    IMPROVED: Better role extraction and geographic context
    """
    print('Building kosmos.json...')

    # Aggregate by composer with location tracking
    komponisten_data = defaultdict(lambda: {
        'dokumente': 0,
        'werke': defaultdict(lambda: {
            'dokumente': 0,
            'signaturen': [],
            'orte': defaultdict(int),
            'rollen': defaultdict(int)
        })
    })

    # Extended work patterns (from analysis)
    werk_patterns = {
        'ring': 'Der Ring des Nibelungen',
        'walküre': 'Die Walküre',
        'rheingold': 'Das Rheingold',
        'götterdämmerung': 'Götterdämmerung',
        'siegfried': 'Siegfried',
        'meistersinger': 'Die Meistersinger',
        'tristan': 'Tristan und Isolde',
        'tannhäuser': 'Tannhäuser',
        'lohengrin': 'Lohengrin',
        'parsifal': 'Parsifal',
        'aida': 'Aida',
        'trovatore': 'Il Trovatore',
        'maskenball': 'Ein Maskenball',
        'don carlos': 'Don Carlos',
        'macbeth': 'Macbeth',
        'falstaff': 'Falstaff',
        'traviata': 'La Traviata',
        'rosenkavalier': 'Der Rosenkavalier',
        'elektra': 'Elektra',
        'salome': 'Salome',
        'arabella': 'Arabella',
        'capriccio': 'Capriccio',
        'frau ohne schatten': 'Die Frau ohne Schatten',
        'orpheus': 'Orfeo ed Euridice',
        'orfeo': 'Orfeo ed Euridice',
        'julius cäsar': 'Giulio Cesare',
        'carmen': 'Carmen'
    }

    # Known roles (from analysis)
    rollen_patterns = {
        'fricka': 'Fricka',
        'waltraute': 'Waltraute',
        'erda': 'Erda',
        'brangäne': 'Brangäne',
        'amneris': 'Amneris',
        'azucena': 'Azucena',
        'ulrica': 'Ulrica',
        'eboli': 'Eboli',
        'octavian': 'Octavian',
        'klytämnestra': 'Klytämnestra',
        'herodias': 'Herodias',
        'kabanicha': 'Kabanicha',
        'orlofsky': 'Orlofsky'
    }

    # Location patterns
    orte_patterns = {
        'bayreuth': 'Bayreuth',
        'münchen': 'München',
        'wien': 'Wien',
        'salzburg': 'Salzburg',
        'zürich': 'Zürich',
        'graz': 'Graz',
        'buenos aires': 'Buenos Aires'
    }

    for record in records:
        # Skip RecordSets
        if record.get('@type') == 'rico:RecordSet':
            continue

        title = record.get('rico:title', '')
        title_lower = title.lower()
        signatur = record.get('rico:identifier')

        # Method 1: Structured data — Werke aus rico:hasOrHadSubject
        subjects = ensure_list(record.get('rico:hasOrHadSubject'))
        for subj in subjects:
            if isinstance(subj, dict) and subj.get('@type') == 'm3gim:MusicalWork':
                werk_name = subj.get('name', '')
                komp = normalize_komponist(subj.get('komponist', ''))
                if komp:
                    komponisten_data[komp]['dokumente'] += 1
                    werk_data = komponisten_data[komp]['werke'][werk_name]
                    werk_data['dokumente'] += 1
                    werk_data['signaturen'].append(signatur)
                    # Location from structured data
                    locs = ensure_list(record.get('rico:hasOrHadLocation'))
                    for loc in locs:
                        if isinstance(loc, dict):
                            loc_name = loc.get('name', '')
                            if loc_name:
                                werk_data['orte'][loc_name] += 1
                    # Roles from structured data
                    perf_roles = ensure_list(record.get('m3gim:hasPerformanceRole'))
                    for pr in perf_roles:
                        if isinstance(pr, dict):
                            rolle_name = pr.get('name', '')
                            if rolle_name:
                                werk_data['rollen'][rolle_name] += 1

        # Method 2: Fallback title matching (Iteration 1 approach)
        komponist = get_komponist_from_title(title)
        if komponist:
            # Nur zaehlen wenn nicht schon via structured data erfasst
            if not subjects:
                komponisten_data[komponist]['dokumente'] += 1

            werk = None
            for pattern, werk_name in werk_patterns.items():
                if pattern in title_lower:
                    werk = werk_name
                    break

            if werk:
                werk_data = komponisten_data[komponist]['werke'][werk]
                # Nur zaehlen wenn nicht schon via structured data
                if not any(isinstance(s, dict) and s.get('name') == werk for s in subjects):
                    werk_data['dokumente'] += 1
                    werk_data['signaturen'].append(signatur)

                for loc_pattern, loc_name in orte_patterns.items():
                    if loc_pattern in title_lower:
                        werk_data['orte'][loc_name] += 1
                        break

                for rolle_pattern, rolle_name in rollen_patterns.items():
                    if rolle_pattern in title_lower:
                        werk_data['rollen'][rolle_name] += 1

    # Convert to output format
    komponisten = []
    for name, data in komponisten_data.items():
        werke = []
        for werk_name, werk_data in data['werke'].items():
            # Get top locations
            top_orte = sorted(werk_data['orte'].items(), key=lambda x: -x[1])[:3]
            top_rollen = sorted(werk_data['rollen'].items(), key=lambda x: -x[1])[:3]

            werke.append({
                'name': werk_name,
                'dokumente': werk_data['dokumente'],
                'signaturen': werk_data['signaturen'][:10],
                'orte': [{'name': o[0], 'count': o[1]} for o in top_orte],
                'rollen': [{'name': r[0], 'count': r[1]} for r in top_rollen]
            })

        komponisten.append({
            'name': name,
            'farbe': KOMPONISTEN_FARBEN.get(name, '#757575'),
            'dokumente_gesamt': data['dokumente'],
            'werke': sorted(werke, key=lambda x: -x['dokumente'])
        })

    # Sort by document count
    komponisten.sort(key=lambda x: -x['dokumente_gesamt'])

    return {
        'zentrum': {
            'name': 'Ira Malaniuk',
            'wikidata': 'Q94208',
            'lebensdaten': '1919-2009',
            'fach': 'Alt'
        },
        'komponisten': komponisten,
        '_meta': {
            'generated': datetime.now().isoformat(),
            'source_records': len(records),
            'note': 'Includes geographic and role context extracted from titles'
        }
    }


def build_sankey(records):
    """
    Build data for Karriere-Fluss (Sankey) visualization.

    Structure:
    - phasen: Career phases
    - repertoire: Composer categories
    - orte: Geographic centers
    - flows: Connections between nodes (with document references)

    IMPROVED: Now includes document signaturen for click-through
    """
    print('Building sankey.json...')

    # Track flows with document references
    phase_komponist = defaultdict(lambda: defaultdict(list))
    komponist_ort = defaultdict(lambda: defaultdict(list))

    # Known locations in titles
    orte_patterns = {
        'wien': 'Wien',
        'vienna': 'Wien',
        'bayreuth': 'Bayreuth',
        'münchen': 'München',
        'munich': 'München',
        'salzburg': 'Salzburg',
        'graz': 'Graz'
    }

    for record in records:
        # Skip RecordSets
        if record.get('@type') == 'rico:RecordSet':
            continue

        title = record.get('rico:title', '')
        title_lower = title.lower()
        year = extract_year(record.get('rico:date'))
        phase = get_karrierephase(year)
        komponist = get_komponist_from_title(title)
        signatur = record.get('rico:identifier')
        doc_type = get_dokumenttyp(record)

        if phase and komponist and signatur:
            doc_info = {
                'signatur': signatur,
                'titel': title[:100],
                'typ': doc_type
            }
            phase_komponist[phase][komponist].append(doc_info)

            # Method 1: Structured location data
            found_loc = False
            locs = ensure_list(record.get('rico:hasOrHadLocation'))
            for loc in locs:
                if isinstance(loc, dict):
                    loc_name = loc.get('name', '')
                    # Normalize to known cities
                    for pattern, ort in orte_patterns.items():
                        if pattern in loc_name.lower():
                            komponist_ort[komponist][ort].append(doc_info)
                            found_loc = True
                            break
                if found_loc:
                    break

            # Method 2: Fallback title matching
            if not found_loc:
                for pattern, ort in orte_patterns.items():
                    if pattern in title_lower:
                        komponist_ort[komponist][ort].append(doc_info)
                        break

    # Build flows with document references
    flows = []

    # Phase -> Komponist
    for phase, komponisten in phase_komponist.items():
        for komponist, docs in komponisten.items():
            if len(docs) > 0:
                flows.append({
                    'source': phase,
                    'target': komponist,
                    'value': len(docs),
                    'dokumente': docs[:20]  # Limit for JSON size
                })

    # Komponist -> Ort
    for komponist, orte in komponist_ort.items():
        for ort, docs in orte.items():
            if len(docs) > 0:
                flows.append({
                    'source': komponist,
                    'target': ort,
                    'value': len(docs),
                    'dokumente': docs[:20]
                })

    return {
        'phasen': KARRIEREPHASEN,
        'repertoire': [
            {'id': 'Wagner', 'label': 'Wagner', 'farbe': KOMPONISTEN_FARBEN['Wagner']},
            {'id': 'Verdi', 'label': 'Verdi', 'farbe': KOMPONISTEN_FARBEN['Verdi']},
            {'id': 'Strauss', 'label': 'Strauss', 'farbe': KOMPONISTEN_FARBEN['Strauss']},
            {'id': 'Gluck/Händel', 'label': 'Gluck/Händel', 'farbe': KOMPONISTEN_FARBEN['Gluck/Händel']},
            {'id': 'Beethoven', 'label': 'Beethoven', 'farbe': KOMPONISTEN_FARBEN['Beethoven']}
        ],
        'orte': [
            {'id': 'Wien', 'label': 'Wien'},
            {'id': 'Bayreuth', 'label': 'Bayreuth'},
            {'id': 'München', 'label': 'München'},
            {'id': 'Salzburg', 'label': 'Salzburg'},
            {'id': 'Graz', 'label': 'Graz'}
        ],
        'flows': flows,
        '_meta': {
            'generated': datetime.now().isoformat(),
            'source_records': len(records)
        }
    }


# =============================================================================
# MAIN
# =============================================================================

def main():
    """Main entry point."""
    print(f'M³GIM View Data Builder')
    print(f'=' * 50)
    print(f'Input: {INPUT_FILE}')
    print(f'Output: {OUTPUT_DIR}')
    print()

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load source data
    print(f'Loading JSON-LD...')
    records = load_jsonld()
    print(f'Loaded {len(records)} records')
    print()

    # Build all views
    views = {
        'partitur': build_partitur(records),
        'matrix': build_matrix(records),
        'kosmos': build_kosmos(records),
        'sankey': build_sankey(records)
    }

    # Write output files
    for name, data in views.items():
        output_file = OUTPUT_DIR / f'{name}.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'  [OK] {output_file.name} ({len(json.dumps(data)):,} bytes)')

    # Copy frontend-consumed views to docs/data/
    docs_data = PROJECT_ROOT / 'docs' / 'data'
    frontend_views = ['partitur', 'matrix', 'kosmos']
    print()
    print('Copying to docs/data/:')
    for name in frontend_views:
        src = OUTPUT_DIR / f'{name}.json'
        dst = docs_data / f'{name}.json'
        if src.exists() and dst.parent.exists():
            import shutil
            shutil.copy2(src, dst)
            print(f'  [CP] {name}.json -> docs/data/')

    print()
    print('Done!')


if __name__ == '__main__':
    main()
