#!/usr/bin/env python3
"""
M³GIM View Data Builder

Generates view-specific JSON files from the main JSON-LD archive data.
These pre-aggregated files improve frontend performance and simplify
visualization code.

Usage:
    python scripts/build-views.py

Output:
    data/views/partitur.json
    data/views/matrix.json
    data/views/kosmos.json
    data/views/sankey.json
"""

import json
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
INPUT_FILE = PROJECT_ROOT / 'data' / 'export' / 'm3gim.jsonld'
OUTPUT_DIR = PROJECT_ROOT / 'data' / 'views'

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
    'Andere': '#757575'
}

# Personen-Kategorien (bekannte Persönlichkeiten)
PERSONEN_KATEGORIEN = {
    # Dirigenten
    'karajan': 'Dirigent',
    'böhm': 'Dirigent',
    'knappertsbusch': 'Dirigent',
    'furtwängler': 'Dirigent',
    'krauss': 'Dirigent',
    'solti': 'Dirigent',
    'kempe': 'Dirigent',

    # Regisseure
    'wieland wagner': 'Regisseur',
    'wolfgang wagner': 'Regisseur',
    'felsenstein': 'Regisseur',

    # Vermittler
    'werba': 'Vermittler',
    'taubman': 'Vermittler',

    # Kollegen (Sänger)
    'ludwig': 'Kollege',
    'jurinac': 'Kollege',
    'della casa': 'Kollege',
    'nilsson': 'Kollege',
    'vickers': 'Kollege',
    'windgassen': 'Kollege',
    'hotter': 'Kollege'
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
                    'titel': record.get('rico:title', '')[:100]
                })

    # Aggregate repertoire by composer and year range
    komponist_jahre = defaultdict(lambda: {'min': 9999, 'max': 0, 'count': 0, 'signaturen': []})
    for item in repertoire:
        k = item['komponist']
        komponist_jahre[k]['min'] = min(komponist_jahre[k]['min'], item['jahr'])
        komponist_jahre[k]['max'] = max(komponist_jahre[k]['max'], item['jahr'])
        komponist_jahre[k]['count'] += 1
        komponist_jahre[k]['signaturen'].append(item['signatur'])

    repertoire_aggregated = [
        {
            'komponist': k,
            'farbe': KOMPONISTEN_FARBEN.get(k, '#757575'),
            'von': v['min'],
            'bis': v['max'],
            'dokumente': v['count'],
            'signaturen': v['signaturen'][:10]  # Limit for JSON size
        }
        for k, v in komponist_jahre.items()
        if v['min'] < 9999
    ]

    # Placeholder for mobility events (would need manual annotation)
    mobilitaet = [
        {
            'von': 'Lemberg',
            'nach': 'Wien',
            'jahr': 1944,
            'form': 'erzwungen',
            'beschreibung': 'Flucht vor der Roten Armee'
        },
        {
            'von': 'Wien',
            'nach': 'Graz',
            'jahr': 1945,
            'form': 'geografisch',
            'beschreibung': 'Erstes Engagement'
        },
        {
            'von': 'Graz',
            'nach': 'Wien',
            'jahr': 1950,
            'form': 'geografisch',
            'beschreibung': 'Wiener Staatsoper'
        },
        {
            'von': 'Wien',
            'nach': 'Bayreuth',
            'jahr': 1952,
            'form': 'geografisch',
            'beschreibung': 'Bayreuther Festspiele Debüt'
        },
        {
            'von': 'Wien',
            'nach': 'Zürich',
            'jahr': 1970,
            'form': 'lebensstil',
            'beschreibung': 'Übersiedlung (Ehemann)'
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

    IMPROVED: Weighted intensity based on document type
    """
    print('Building matrix.json...')

    # Extract persons from titles with weighted intensity
    personen_begegnungen = defaultdict(lambda: defaultdict(list))

    # Known persons to look for in titles
    known_persons = list(PERSONEN_KATEGORIEN.keys())

    for record in records:
        title = (record.get('rico:title') or '').lower()
        year = extract_year(record.get('rico:date'))
        period = get_5year_period(year)
        doc_type = get_dokumenttyp(record)

        if not period:
            continue

        # Calculate intensity based on document type
        # Letter = high intensity (3), Program/Poster = medium (2), Photo = low (1)
        intensity_weight = 1
        if doc_type == 'Letter':
            intensity_weight = 3
        elif doc_type in ['Program', 'Poster', 'Contract']:
            intensity_weight = 2

        for person_key in known_persons:
            if person_key in title:
                # Capitalize properly
                person_name = person_key.title()
                if person_key == 'wieland wagner':
                    person_name = 'Wieland Wagner'
                elif person_key == 'wolfgang wagner':
                    person_name = 'Wolfgang Wagner'
                elif person_key == 'karajan':
                    person_name = 'Herbert von Karajan'
                elif person_key == 'böhm':
                    person_name = 'Karl Böhm'
                elif person_key == 'furtwängler':
                    person_name = 'Wilhelm Furtwängler'

                personen_begegnungen[person_name][period].append({
                    'signatur': record.get('rico:identifier'),
                    'titel': record.get('rico:title', '')[:80],
                    'typ': doc_type,
                    'weight': intensity_weight
                })

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
                    'dokumente': [
                        {'signatur': d['signatur'], 'titel': d['titel'], 'typ': d['typ']}
                        for d in docs[:5]  # Limit to 5 for JSON size
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
        cat_order = {'Dirigent': 0, 'Regisseur': 1, 'Vermittler': 2, 'Kollege': 3, 'Andere': 4}
        return (cat_order.get(p['kategorie'], 5), -p['gesamt_intensitaet'])

    personen.sort(key=sort_key)

    return {
        'zeitraeume': zeitraeume,
        'kategorien': ['Dirigent', 'Regisseur', 'Vermittler', 'Kollege'],
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
        title = record.get('rico:title', '')
        title_lower = title.lower()
        komponist = get_komponist_from_title(title)

        if komponist:
            komponisten_data[komponist]['dokumente'] += 1

            # Extract work name
            werk = None
            for pattern, werk_name in werk_patterns.items():
                if pattern in title_lower:
                    werk = werk_name
                    break

            if werk:
                werk_data = komponisten_data[komponist]['werke'][werk]
                werk_data['dokumente'] += 1
                werk_data['signaturen'].append(record.get('rico:identifier'))

                # Extract location
                for loc_pattern, loc_name in orte_patterns.items():
                    if loc_pattern in title_lower:
                        werk_data['orte'][loc_name] += 1
                        break

                # Extract role
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
    - flows: Connections between nodes
    """
    print('Building sankey.json...')

    # Count flows
    phase_komponist = defaultdict(lambda: defaultdict(int))
    komponist_ort = defaultdict(lambda: defaultdict(int))

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
        title = record.get('rico:title', '').lower()
        year = extract_year(record.get('rico:date'))
        phase = get_karrierephase(year)
        komponist = get_komponist_from_title(title)

        if phase and komponist:
            phase_komponist[phase][komponist] += 1

            # Try to find location
            for pattern, ort in orte_patterns.items():
                if pattern in title:
                    komponist_ort[komponist][ort] += 1
                    break

    # Build flows
    flows = []

    # Phase -> Komponist
    for phase, komponisten in phase_komponist.items():
        for komponist, count in komponisten.items():
            if count > 0:
                flows.append({
                    'source': phase,
                    'target': komponist,
                    'value': count
                })

    # Komponist -> Ort
    for komponist, orte in komponist_ort.items():
        for ort, count in orte.items():
            if count > 0:
                flows.append({
                    'source': komponist,
                    'target': ort,
                    'value': count
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

    print()
    print('Done!')


if __name__ == '__main__':
    main()
