#!/usr/bin/env python3
"""
Archive Analysis Script
Analyzes m3gim.jsonld to extract people, works, places, and temporal patterns
"""

import json
import re
from collections import defaultdict, Counter
from datetime import datetime
from pathlib import Path

def parse_date(date_str):
    """Parse date string and return year"""
    if not date_str:
        return None
    # Handle date ranges like "1940-12-20/1940-12-31"
    if '/' in date_str:
        date_str = date_str.split('/')[0]
    try:
        # Try parsing ISO date format
        year = int(date_str.split('-')[0])
        return year
    except:
        return None

def get_period(year):
    """Get 5-year period for a year"""
    if year is None:
        return "Unknown"
    # Round down to nearest 5
    period_start = (year // 5) * 5
    period_end = period_start + 4
    return f"{period_start}-{period_end}"

def extract_person_names(title):
    """Extract person names from title"""
    names = []

    # Common patterns for person names in titles
    # All caps names like "IRA MALANIUK", "NIKOLAUS KOLESSA"
    caps_pattern = r'\b[A-ZÄÖÜ]{2,}(?:\s+[A-ZÄÖÜ]{2,})+\b'
    caps_matches = re.findall(caps_pattern, title)
    names.extend(caps_matches)

    # Names with first name capitalized: "Ira Malaniuk", "Erik Werba"
    mixed_pattern = r'\b[A-ZÄÖÜ][a-zäöü]+(?:\s+[A-ZÄÖÜ][a-zäöü]+)+\b'
    mixed_matches = re.findall(mixed_pattern, title)
    names.extend(mixed_matches)

    # Filter out common false positives
    exclude_words = {'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
                     'August', 'September', 'Oktober', 'November', 'Dezember',
                     'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag',
                     'Samstag', 'Sonntag', 'Großer Saal', 'Kleiner Saal',
                     'Staatsoper Wien', 'Ludwig Van', 'Van Beethoven',
                     'Ausstellung Ira', 'Mein Weg', 'Unbekannte Feier',
                     'Buenos Aires', 'Teatro Colon', 'Richard Strauss',
                     'Wiener Staatsoper', 'Bayreuther Festspiele',
                     'Tonhalle Zürich', 'Liederabend Ira', 'Don Carlos',
                     'Zweiwöchentlicher Spielplan', 'Max Kojetinsky',
                     'Ernennung Ira'}

    # Additional filters: exclude phrases that contain certain keywords
    exclude_keywords = ['Ausstellung', 'Festspiele', 'Spielplan', 'Opernhaus',
                       'Theater', 'Staatsoper', 'Volksoper', 'Feier', 'Liederabend',
                       'Ernennung', 'Abend', 'Konzert', 'Festival']

    filtered_names = []
    for name in names:
        # Skip if it's in exclude list
        if name in exclude_words:
            continue
        # Skip if it contains exclude keywords
        if any(keyword.lower() in name.lower() for keyword in exclude_keywords):
            continue
        # Skip if it's too long (likely a phrase, not a name)
        if len(name.split()) > 3:
            continue
        # Skip if it's all caps and only 2 letters (likely abbreviation)
        words = name.split()
        if all(len(w) <= 2 for w in words):
            continue

        filtered_names.append(name)

    return list(set(filtered_names))  # Remove duplicates

def extract_works(title):
    """Extract opera/work names from title"""
    works = []

    # Works in quotes
    quoted_pattern = r'["\"]([^"\"]+)["\"]'
    quoted_matches = re.findall(quoted_pattern, title)
    # Filter quoted works to exclude non-work phrases
    for match in quoted_matches:
        if len(match) < 50 and not any(x in match.lower() for x in ['von', 'der', 'die', 'das']):
            works.append(match)

    # Known operas and compositions (case insensitive search)
    known_works = [
        # Wagner
        'Tannhäuser', 'Lohengrin', 'Tristan und Isolde', 'Tristan', 'Parsifal',
        'Die Walküre', 'Walküre', 'Das Rheingold', 'Rheingold', 'Siegfried',
        'Götterdämmerung', 'Die Meistersinger', 'Meistersinger von Nürnberg',
        'Der Fliegende Holländer', 'Fliegende Holländer',
        # Strauss
        'Der Rosenkavalier', 'Rosenkavalier', 'Salome', 'Elektra',
        'Ariadne auf Naxos', 'Die Frau ohne Schatten', 'Frau ohne Schatten',
        'Arabella', 'Capriccio', 'Daphne',
        # Verdi
        'Aida', 'La Traviata', 'Traviata', 'Rigoletto', 'Il Trovatore', 'Trovatore',
        'Otello', 'Falstaff', 'Don Carlos', 'Un ballo in maschera', 'La forza del destino',
        'Nabucco', 'Macbeth',
        # Puccini
        'La Bohème', 'Bohème', 'Madama Butterfly', 'Butterfly', 'Tosca', 'Turandot',
        'Manon Lescaut', 'La fanciulla del West',
        # Mozart
        'Don Giovanni', 'Die Zauberflöte', 'Zauberflöte', 'Le nozze di Figaro',
        'Figaro', 'Così fan tutte', 'Die Entführung aus dem Serail',
        # Beethoven
        'Fidelio', 'Egmont',
        # Bizet
        'Carmen',
        # Mascagni
        'Cavalleria Rusticana',
        # Leoncavallo
        'Pagliacci', 'Der Bajazzo',
        # Others
        'Don Quichotte', 'Tiefland', 'Paganini', 'Orpheus', 'Orfeo ed Euridice',
        'Hänsel und Gretel', 'Der Freischütz', 'Jephta'
    ]

    title_upper = title.upper()
    for work in known_works:
        if work.upper() in title_upper:
            works.append(work)

    return list(set(works))

def extract_places(title):
    """Extract place names from title"""
    places = []

    # Known places
    known_places = [
        'Wien', 'Vienna', 'Bayreuth', 'München', 'Munich', 'Salzburg',
        'Graz', 'Linz', 'Berlin', 'Hamburg', 'Dresden', 'Frankfurt',
        'Köln', 'Stuttgart', 'Stanislau', 'Mozarteum', 'Staatsoper',
        'Volksoper', 'Theater an der Wien', 'Festspielhaus'
    ]

    title_upper = title.upper()
    for place in known_places:
        if place.upper() in title_upper:
            places.append(place)

    return list(set(places))

def extract_composers(title):
    """Extract composer names from title"""
    composers = []

    known_composers = [
        'Wagner', 'Verdi', 'Mozart', 'Beethoven', 'Strauss', 'Brahms',
        'Schubert', 'Haydn', 'Händel', 'Puccini', 'Bizet', 'Massenet',
        'Mascagni', 'Leoncavallo', 'Donizetti', 'Rossini', 'Bellini'
    ]

    title_upper = title.upper()
    for composer in known_composers:
        if composer.upper() in title_upper:
            composers.append(composer)

    return composers

def analyze_archive(jsonld_path):
    """Analyze the archive JSONLD file"""

    print(f"Loading {jsonld_path}...")
    with open(jsonld_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    records = data.get('@graph', [])
    print(f"Found {len(records)} records")

    # Data structures for analysis
    people_data = defaultdict(lambda: {
        'signatures': set(),
        'years': [],
        'doc_types': [],
        'titles': []
    })

    works_data = defaultdict(lambda: {
        'signatures': set(),
        'years': [],
        'titles': []
    })

    places_data = defaultdict(lambda: {
        'signatures': set(),
        'years': [],
        'titles': []
    })

    composers_data = defaultdict(lambda: {
        'signatures': set(),
        'works': set(),
        'years': []
    })

    periods = Counter()
    doc_types = Counter()
    years_distribution = Counter()

    # Analyze each record
    for record in records:
        signature = record.get('@id', '').replace('m3gim:', '')
        title = record.get('rico:title', '')
        date_str = record.get('rico:date', '')
        doc_type_obj = record.get('rico:hasDocumentaryFormType', {})
        doc_type = doc_type_obj.get('@id', '').replace('m3gim-dft:', '') if isinstance(doc_type_obj, dict) else 'Unknown'

        year = parse_date(date_str)
        period = get_period(year)

        # Count periods and doc types
        periods[period] += 1
        doc_types[doc_type] += 1
        if year:
            years_distribution[year] += 1

        # Extract and store people
        people = extract_person_names(title)
        for person in people:
            people_data[person]['signatures'].add(signature)
            if year:
                people_data[person]['years'].append(year)
            people_data[person]['doc_types'].append(doc_type)
            people_data[person]['titles'].append(title[:100])  # Store truncated title

        # Extract and store works
        works = extract_works(title)
        for work in works:
            works_data[work]['signatures'].add(signature)
            if year:
                works_data[work]['years'].append(year)
            works_data[work]['titles'].append(title[:100])

        # Extract and store places
        places = extract_places(title)
        for place in places:
            places_data[place]['signatures'].add(signature)
            if year:
                places_data[place]['years'].append(year)
            places_data[place]['titles'].append(title[:100])

        # Extract and store composers
        composers = extract_composers(title)
        for composer in composers:
            composers_data[composer]['signatures'].add(signature)
            if year:
                composers_data[composer]['years'].append(year)
            composers_data[composer]['works'].update(works)

    return {
        'total_records': len(records),
        'people_data': people_data,
        'works_data': works_data,
        'places_data': places_data,
        'composers_data': composers_data,
        'periods': periods,
        'doc_types': doc_types,
        'years_distribution': years_distribution
    }

def generate_report(analysis, output_path):
    """Generate markdown report"""

    people_data = analysis['people_data']
    works_data = analysis['works_data']
    places_data = analysis['places_data']
    composers_data = analysis['composers_data']
    periods = analysis['periods']
    doc_types = analysis['doc_types']
    years_dist = analysis['years_distribution']

    # Sort people by number of signatures (descending)
    people_sorted = sorted(
        people_data.items(),
        key=lambda x: len(x[1]['signatures']),
        reverse=True
    )

    # Sort works by number of signatures
    works_sorted = sorted(
        works_data.items(),
        key=lambda x: len(x[1]['signatures']),
        reverse=True
    )

    # Sort places by number of signatures
    places_sorted = sorted(
        places_data.items(),
        key=lambda x: len(x[1]['signatures']),
        reverse=True
    )

    # Sort composers by number of signatures
    composers_sorted = sorted(
        composers_data.items(),
        key=lambda x: len(x[1]['signatures']),
        reverse=True
    )

    # Generate report
    report = []
    report.append("# M3GIM Archive Analysis Report")
    report.append("")
    report.append(f"**Total Records Analyzed:** {analysis['total_records']}")
    report.append(f"**Analysis Date:** {datetime.now().strftime('%Y-%m-%d')}")
    report.append("")
    report.append("---")
    report.append("")

    # Top 20 People
    report.append("## 1. Top 20 Personen (mit Signaturen)")
    report.append("")
    for i, (person, data) in enumerate(people_sorted[:20], 1):
        sigs = sorted(data['signatures'])
        years = data['years']
        year_range = f"{min(years)}-{max(years)}" if years else "N/A"
        doc_type_counts = Counter(data['doc_types'])
        top_doc_types = ", ".join([f"{dt}({c})" for dt, c in doc_type_counts.most_common(3)])

        report.append(f"### {i}. {person}")
        report.append(f"- **Anzahl Dokumente:** {len(sigs)}")
        report.append(f"- **Zeitraum:** {year_range}")
        report.append(f"- **Dokumenttypen:** {top_doc_types}")
        report.append(f"- **Signaturen:** {', '.join(sigs[:10])}")
        if len(sigs) > 10:
            report.append(f"  - *(... und {len(sigs) - 10} weitere)*")
        report.append("")

    # Top Composers with their works
    report.append("## 2. Komponisten (mit Werken und Signaturen)")
    report.append("")

    # Separate sections for major composers
    major_composers = ['Wagner', 'Verdi', 'Strauss']

    for composer_name in major_composers:
        if composer_name in dict(composers_sorted):
            data = composers_data[composer_name]
            sigs = sorted(data['signatures'])
            works = sorted(data['works'])
            years = data['years']
            year_range = f"{min(years)}-{max(years)}" if years else "N/A"

            report.append(f"### {composer_name}-Werke")
            report.append(f"- **Anzahl Dokumente:** {len(sigs)}")
            report.append(f"- **Zeitraum:** {year_range}")
            report.append(f"- **Werke:** {', '.join(works) if works else 'N/A'}")
            report.append(f"- **Signaturen:** {', '.join(sigs[:10])}")
            if len(sigs) > 10:
                report.append(f"  - *(... und {len(sigs) - 10} weitere)*")
            report.append("")

    # Other composers
    report.append("### Weitere Komponisten")
    report.append("")
    for i, (composer, data) in enumerate(composers_sorted[:15], 1):
        if composer in major_composers:
            continue
        sigs = sorted(data['signatures'])
        works = sorted(data['works'])
        years = data['years']
        year_range = f"{min(years)}-{max(years)}" if years else "N/A"

        report.append(f"**{composer}**")
        report.append(f"- **Anzahl Dokumente:** {len(sigs)}")
        report.append(f"- **Zeitraum:** {year_range}")
        report.append(f"- **Werke:** {', '.join(works) if works else 'N/A'}")
        report.append(f"- **Signaturen:** {', '.join(sigs[:6])}")
        if len(sigs) > 6:
            report.append(f"  - *(+{len(sigs) - 6} weitere)*")
        report.append("")

    # Top 10 Works
    report.append("## 3. Top 10 Werke (mit Signaturen)")
    report.append("")
    for i, (work, data) in enumerate(works_sorted[:10], 1):
        sigs = sorted(data['signatures'])
        years = data['years']
        year_range = f"{min(years)}-{max(years)}" if years else "N/A"

        report.append(f"### {i}. {work}")
        report.append(f"- **Anzahl Dokumente:** {len(sigs)}")
        report.append(f"- **Zeitraum:** {year_range}")
        report.append(f"- **Signaturen:** {', '.join(sigs[:8])}")
        if len(sigs) > 8:
            report.append(f"  - *(... und {len(sigs) - 8} weitere)*")
        report.append("")

    # Top 10 Places
    report.append("## 4. Top 10 Orte (mit Signaturen)")
    report.append("")
    for i, (place, data) in enumerate(places_sorted[:10], 1):
        sigs = sorted(data['signatures'])
        years = data['years']
        year_range = f"{min(years)}-{max(years)}" if years else "N/A"

        report.append(f"### {i}. {place}")
        report.append(f"- **Anzahl Dokumente:** {len(sigs)}")
        report.append(f"- **Zeitraum:** {year_range}")
        report.append(f"- **Signaturen:** {', '.join(sigs[:8])}")
        if len(sigs) > 8:
            report.append(f"  - *(... und {len(sigs) - 8} weitere)*")
        report.append("")

    # Temporal Coverage
    report.append("## 5. Zeitliche Abdeckung")
    report.append("")
    report.append("### 5-Jahres-Perioden")
    report.append("")
    report.append("| Periode | Anzahl Dokumente |")
    report.append("|---------|------------------|")

    periods_sorted = sorted(periods.items(), key=lambda x: x[0])
    for period, count in periods_sorted:
        if period != "Unknown":
            report.append(f"| {period} | {count} |")
    if "Unknown" in periods:
        report.append(f"| Unknown | {periods['Unknown']} |")
    report.append("")

    # Year distribution (detailed)
    report.append("### Jahresweise Verteilung (Top 20 Jahre)")
    report.append("")
    report.append("| Jahr | Anzahl Dokumente |")
    report.append("|------|------------------|")

    years_sorted = sorted(years_dist.items(), key=lambda x: x[1], reverse=True)
    for year, count in years_sorted[:20]:
        report.append(f"| {year} | {count} |")
    report.append("")

    # Document Types
    report.append("## 6. Dokumenttyp-Verteilung")
    report.append("")
    report.append("| Dokumenttyp | Anzahl |")
    report.append("|-------------|--------|")

    doc_types_sorted = sorted(doc_types.items(), key=lambda x: x[1], reverse=True)
    for doc_type, count in doc_types_sorted:
        report.append(f"| {doc_type} | {count} |")
    report.append("")

    # Recommendations for synthetic data
    report.append("---")
    report.append("")
    report.append("## 7. Empfehlungen für synthetische Daten")
    report.append("")
    report.append("### Gut dokumentierte Bereiche:")
    report.append("")

    # Best documented people
    report.append("**Personen mit vielen Dokumenten (>10):**")
    report.append("")
    for person, data in people_sorted[:10]:
        if len(data['signatures']) > 10:
            report.append(f"- {person}: {len(data['signatures'])} Dokumente")
    report.append("")

    # Best documented periods
    report.append("**Am besten dokumentierte Perioden:**")
    report.append("")
    for period, count in periods_sorted[:5]:
        if period != "Unknown" and count > 10:
            report.append(f"- {period}: {count} Dokumente")
    report.append("")

    # Best documented works
    report.append("**Häufigste Werke:**")
    report.append("")
    for work, data in works_sorted[:10]:
        if len(data['signatures']) > 5:
            report.append(f"- {work}: {len(data['signatures'])} Dokumente")
    report.append("")

    # Save report
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"\nReport saved to: {output_path}")
    print(f"Total lines: {len(report)}")

if __name__ == '__main__':
    # Paths
    jsonld_path = Path('/home/user/m3gim/data/export/m3gim.jsonld')
    output_path = Path('/home/user/m3gim/data/reports/archive-analysis.md')

    # Run analysis
    print("Starting archive analysis...")
    analysis = analyze_archive(jsonld_path)

    # Generate report
    print("\nGenerating report...")
    generate_report(analysis, output_path)

    print("\n✓ Analysis complete!")
