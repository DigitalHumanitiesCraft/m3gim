#!/usr/bin/env python3
"""
Archive Analysis Script v2
Enhanced person name extraction based on roles and patterns
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
    if '/' in date_str:
        date_str = date_str.split('/')[0]
    try:
        year = int(date_str.split('-')[0])
        return year
    except:
        return None

def get_period(year):
    """Get 5-year period for a year"""
    if year is None:
        return "Unknown"
    period_start = (year // 5) * 5
    period_end = period_start + 4
    return f"{period_start}-{period_end}"

def extract_person_names_enhanced(title):
    """Enhanced person name extraction with role-based patterns"""
    names = set()

    # Pattern 1: Names with titles (Dr., Prof.)
    title_pattern = r'\b(Prof\.|Dr\.|Frau|Herr)\s+([A-ZÄÖÜ][a-zäöü]+(?:\s+[A-ZÄÖÜ][a-zäöü]+)+)\b'
    for match in re.finditer(title_pattern, title):
        names.add(match.group(2))

    # Pattern 2: Names near roles
    roles = ['Dirigent', 'Mezzosopran', 'Tenor', 'Sopran', 'Bass', 'Bariton',
             'Kammersängerin', 'Regisseur', 'Alt', 'Direttore', 'Klavier',
             'Solistin', 'Solist', 'Leitung', 'am Flügel']

    for role in roles:
        # Look for names before or after role mentions
        pattern = rf'([A-ZÄÖÜ][a-zäöü]+\s+[A-ZÄÖÜ][a-zäöü]+)\s+\(?{role}'
        for match in re.finditer(pattern, title):
            name = match.group(1)
            if is_valid_person_name(name):
                names.add(name)

        # Also look for role followed by name
        pattern2 = rf'{role}\s+([A-ZÄÖÜ][a-zäöü]+\s+[A-ZÄÖÜ][a-zäöü]+)'
        for match in re.finditer(pattern2, title):
            name = match.group(1)
            if is_valid_person_name(name):
                names.add(name)

    # Pattern 3: Name in specific contexts (Brief an/von, etc.)
    context_patterns = [
        r'Brief (?:von|an)\s+(?:Prof\.|Dr\.)?\s*([A-ZÄÖÜ][a-zäöü]+(?:\s+[A-ZÄÖÜ][a-zäöü]+)+)',
        r'Korrespondenz.*?([A-ZÄÖÜ][a-zäöü]+\s+[A-ZÄÖÜ][a-zäöü]+)',
        r'mit\s+([A-ZÄÖÜ][a-zäöü]+\s+[A-ZÄÖÜ][a-zäöü]+)',
    ]

    for pattern in context_patterns:
        for match in re.finditer(pattern, title):
            name = match.group(1)
            if is_valid_person_name(name):
                names.add(name)

    # Pattern 4: Special handling for Ira Malaniuk (all forms)
    if re.search(r'\b(?:IRA\s+MALANIUK|Ira\s+Malaniuk)\b', title):
        names.add('Ira Malaniuk')

    # Filter out false positives
    names = {n for n in names if is_valid_person_name(n)}

    return list(names)

def is_valid_person_name(name):
    """Check if a string is likely a valid person name"""
    if not name:
        return False

    # Remove leading/trailing whitespace
    name = name.strip()

    # Must have at least first and last name
    words = name.split()
    if len(words) < 2 or len(words) > 4:
        return False

    # Exclude if contains certain keywords
    exclude_keywords = [
        'Oper', 'Theater', 'Saal', 'Fest', 'Konzert', 'Staatsoper',
        'Volksoper', 'Spielplan', 'Ausstellung', 'Abend', 'Woche',
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
        'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag',
        'Samstag', 'Sonntag', 'Neue', 'Großer', 'Kleiner', 'Neuen'
    ]

    for keyword in exclude_keywords:
        if keyword.lower() in name.lower():
            return False

    # Each word should be capitalized
    if not all(word[0].isupper() for word in words if word):
        return False

    return True

def extract_works(title):
    """Extract opera/work names from title"""
    works = []

    # Works in quotes
    quoted_pattern = r'["\"]([^"\"]+)["\"]'
    quoted_matches = re.findall(quoted_pattern, title)
    for match in quoted_matches:
        if len(match) < 50:
            works.append(match)

    # Known operas (comprehensive list)
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
        'Hänsel und Gretel', 'Der Freischütz', 'Jephta', 'Hoffmanns Erzählungen'
    ]

    title_upper = title.upper()
    for work in known_works:
        if work.upper() in title_upper:
            works.append(work)

    return list(set(works))

def extract_places(title):
    """Extract place names from title"""
    places = []

    known_places = [
        'Wien', 'Bayreuth', 'München', 'Salzburg', 'Graz', 'Linz',
        'Berlin', 'Hamburg', 'Dresden', 'Frankfurt', 'Köln', 'Stuttgart',
        'Stanislau', 'Zürich', 'Buenos Aires', 'Teatro Colon'
    ]

    for place in known_places:
        if place.lower() in title.lower():
            places.append(place)

    return list(set(places))

def extract_composers(title):
    """Extract composer names from title"""
    composers = []

    known_composers = [
        'Wagner', 'Verdi', 'Mozart', 'Beethoven', 'Strauss', 'Brahms',
        'Schubert', 'Haydn', 'Händel', 'Puccini', 'Bizet', 'Massenet',
        'Mascagni', 'Leoncavallo', 'Donizetti', 'Rossini', 'Bellini',
        'Hugo Wolf', 'Hindemith'
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

    # Data structures
    people_data = defaultdict(lambda: {
        'signatures': set(),
        'years': [],
        'doc_types': [],
        'sample_titles': []
    })

    works_data = defaultdict(lambda: {
        'signatures': set(),
        'years': [],
        'composer': None
    })

    places_data = defaultdict(lambda: {
        'signatures': set(),
        'years': []
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

        periods[period] += 1
        doc_types[doc_type] += 1
        if year:
            years_distribution[year] += 1

        # Extract people
        people = extract_person_names_enhanced(title)
        for person in people:
            people_data[person]['signatures'].add(signature)
            if year:
                people_data[person]['years'].append(year)
            people_data[person]['doc_types'].append(doc_type)
            if len(people_data[person]['sample_titles']) < 3:
                people_data[person]['sample_titles'].append(title[:120])

        # Extract works
        works = extract_works(title)
        for work in works:
            works_data[work]['signatures'].add(signature)
            if year:
                works_data[work]['years'].append(year)

        # Extract places
        places = extract_places(title)
        for place in places:
            places_data[place]['signatures'].add(signature)
            if year:
                places_data[place]['years'].append(year)

        # Extract composers
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

    # Sort
    people_sorted = sorted(people_data.items(), key=lambda x: len(x[1]['signatures']), reverse=True)
    works_sorted = sorted(works_data.items(), key=lambda x: len(x[1]['signatures']), reverse=True)
    places_sorted = sorted(places_data.items(), key=lambda x: len(x[1]['signatures']), reverse=True)
    composers_sorted = sorted(composers_data.items(), key=lambda x: len(x[1]['signatures']), reverse=True)

    # Generate report
    report = []
    report.append("# M3GIM Archive Analysis Report (v2)")
    report.append("")
    report.append(f"**Total Records Analyzed:** {analysis['total_records']}")
    report.append(f"**Analysis Date:** {datetime.now().strftime('%Y-%m-%d')}")
    report.append("")
    report.append("---")
    report.append("")

    # Top 20 People
    report.append("## 1. Top 20 Personen (mit Signaturen)")
    report.append("")
    report.append("*Hinweis: Personen wurden durch rollenbasierte Mustererkennung extrahiert (Dirigenten, Sänger, etc.)*")
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
        report.append(f"- **Signaturen:** {', '.join(sigs[:12])}")
        if len(sigs) > 12:
            report.append(f"  - *(... und {len(sigs) - 12} weitere)*")

        # Show sample titles
        if data['sample_titles']:
            report.append(f"- **Beispiel-Kontext:** *\"{data['sample_titles'][0]}\"*")

        report.append("")

    # Composers with their works
    report.append("## 2. Komponisten (mit Werken und Signaturen)")
    report.append("")

    major_composers = ['Wagner', 'Verdi', 'Strauss']

    for composer_name in major_composers:
        if composer_name in dict(composers_sorted):
            data = composers_data[composer_name]
            sigs = sorted(data['signatures'])
            works = sorted([w for w in data['works'] if w])
            years = data['years']
            year_range = f"{min(years)}-{max(years)}" if years else "N/A"

            report.append(f"### {composer_name}-Werke")
            report.append(f"- **Anzahl Dokumente:** {len(sigs)}")
            report.append(f"- **Zeitraum:** {year_range}")
            report.append(f"- **Werke:** {', '.join(works) if works else 'N/A'}")
            report.append(f"- **Signaturen:** {', '.join(sigs[:12])}")
            if len(sigs) > 12:
                report.append(f"  - *(... und {len(sigs) - 12} weitere)*")
            report.append("")

    # Other composers
    report.append("### Weitere Komponisten")
    report.append("")

    for composer, data in composers_sorted:
        if composer in major_composers:
            continue
        if len(data['signatures']) < 2:
            continue

        sigs = sorted(data['signatures'])
        works = sorted([w for w in data['works'] if w])
        years = data['years']
        year_range = f"{min(years)}-{max(years)}" if years else "N/A"

        report.append(f"**{composer}**")
        report.append(f"- Dokumente: {len(sigs)}, Zeitraum: {year_range}")
        if works:
            report.append(f"- Werke: {', '.join(works[:5])}")
        report.append(f"- Signaturen: {', '.join(sigs[:6])}")
        if len(sigs) > 6:
            report.append(f"  *(+{len(sigs) - 6})*")
        report.append("")

    # Top Works
    report.append("## 3. Top 15 Werke (mit Signaturen)")
    report.append("")

    for i, (work, data) in enumerate(works_sorted[:15], 1):
        sigs = sorted(data['signatures'])
        years = data['years']
        year_range = f"{min(years)}-{max(years)}" if years else "N/A"

        report.append(f"### {i}. {work}")
        report.append(f"- **Anzahl Dokumente:** {len(sigs)}")
        report.append(f"- **Zeitraum:** {year_range}")
        report.append(f"- **Signaturen:** {', '.join(sigs[:10])}")
        if len(sigs) > 10:
            report.append(f"  - *(... und {len(sigs) - 10} weitere)*")
        report.append("")

    # Top Places
    report.append("## 4. Top 10 Orte (mit Signaturen)")
    report.append("")

    for i, (place, data) in enumerate(places_sorted[:10], 1):
        sigs = sorted(data['signatures'])
        years = data['years']
        year_range = f"{min(years)}-{max(years)}" if years else "N/A"

        report.append(f"### {i}. {place}")
        report.append(f"- **Anzahl Dokumente:** {len(sigs)}")
        report.append(f"- **Zeitraum:** {year_range}")
        report.append(f"- **Signaturen:** {', '.join(sigs[:10])}")
        if len(sigs) > 10:
            report.append(f"  - *(+{len(sigs) - 10})*")
        report.append("")

    # Temporal Coverage
    report.append("## 5. Zeitliche Abdeckung")
    report.append("")
    report.append("### 5-Jahres-Perioden")
    report.append("")
    report.append("| Periode | Anzahl Dokumente | Dichte |")
    report.append("|---------|------------------|--------|")

    periods_sorted = sorted(periods.items(), key=lambda x: x[0])
    max_count = max([c for p, c in periods_sorted if p != "Unknown"], default=1)

    for period, count in periods_sorted:
        if period != "Unknown":
            density = "█" * int(count / max_count * 20)
            report.append(f"| {period} | {count:4d} | {density} |")

    if "Unknown" in periods:
        report.append(f"| Unknown | {periods['Unknown']:4d} | |")
    report.append("")

    # Best documented years
    report.append("### Top 20 Jahre (nach Dokumentanzahl)")
    report.append("")
    report.append("| Jahr | Anzahl |")
    report.append("|------|--------|")

    years_sorted = sorted(years_dist.items(), key=lambda x: x[1], reverse=True)
    for year, count in years_sorted[:20]:
        report.append(f"| {year} | {count:4d} |")
    report.append("")

    # Document Types
    report.append("## 6. Dokumenttyp-Verteilung")
    report.append("")
    report.append("| Dokumenttyp | Anzahl | Prozent |")
    report.append("|-------------|--------|---------|")

    total_docs = sum(doc_types.values())
    doc_types_sorted = sorted(doc_types.items(), key=lambda x: x[1], reverse=True)

    for doc_type, count in doc_types_sorted:
        percent = (count / total_docs * 100)
        report.append(f"| {doc_type} | {count:4d} | {percent:5.1f}% |")
    report.append("")

    # Recommendations
    report.append("---")
    report.append("")
    report.append("## 7. Empfehlungen für synthetische Daten")
    report.append("")

    report.append("### Zusammenfassung der verfügbaren Signaturen:")
    report.append("")

    report.append(f"**Hauptperson:** Ira Malaniuk ({len(people_data['Ira Malaniuk']['signatures'])} Dokumente)")
    report.append("")

    report.append("**Weitere Personen (>2 Dokumente):**")
    for person, data in people_sorted[:15]:
        if person != 'Ira Malaniuk' and len(data['signatures']) > 2:
            report.append(f"- {person}: {len(data['signatures'])} Dokumente")
    report.append("")

    report.append("**Gut dokumentierte Perioden (>20 Dokumente):**")
    for period, count in periods_sorted:
        if period != "Unknown" and count > 20:
            report.append(f"- {period}: {count} Dokumente")
    report.append("")

    report.append("**Häufigste Werke (>5 Dokumente):**")
    for work, data in works_sorted[:15]:
        if len(data['signatures']) > 5:
            report.append(f"- {work}: {len(data['signatures'])} Dokumente")
    report.append("")

    report.append("**Häufigste Orte:**")
    for place, data in places_sorted[:8]:
        if len(data['signatures']) > 3:
            report.append(f"- {place}: {len(data['signatures'])} Dokumente")
    report.append("")

    # Save report
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"\nReport saved to: {output_path}")
    print(f"Total lines: {len(report)}")

if __name__ == '__main__':
    jsonld_path = Path('/home/user/m3gim/data/export/m3gim.jsonld')
    output_path = Path('/home/user/m3gim/data/reports/archive-analysis.md')

    print("Starting enhanced archive analysis...")
    analysis = analyze_archive(jsonld_path)

    print("\nGenerating report...")
    generate_report(analysis, output_path)

    print("\n✓ Analysis complete!")
