#!/usr/bin/env python3
"""
Create a detailed signature index for synthetic data generation
"""

import json
from pathlib import Path
from collections import defaultdict

def parse_date(date_str):
    if not date_str:
        return None
    if '/' in date_str:
        date_str = date_str.split('/')[0]
    try:
        return int(date_str.split('-')[0])
    except:
        return None

def main():
    # Load data
    with open('/home/user/m3gim/data/export/m3gim.jsonld', 'r', encoding='utf-8') as f:
        data = json.load(f)

    records = data.get('@graph', [])

    # Create signature index
    signature_index = {}
    for record in records:
        sig = record.get('@id', '').replace('m3gim:', '')
        title = record.get('rico:title', '')
        date_str = record.get('rico:date', '')
        year = parse_date(date_str)
        doc_type_obj = record.get('rico:hasDocumentaryFormType', {})
        doc_type = doc_type_obj.get('@id', '').replace('m3gim-dft:', '') if isinstance(doc_type_obj, dict) else 'Unknown'

        signature_index[sig] = {
            'title': title,
            'year': year,
            'date': date_str,
            'type': doc_type
        }

    # Save signature index
    output_path = Path('/home/user/m3gim/data/reports/signature-index.md')
    output_path.parent.mkdir(parents=True, exist_ok=True)

    report = []
    report.append("# Signatur-Index für Synthetische Daten")
    report.append("")
    report.append(f"**Total Signaturen:** {len(signature_index)}")
    report.append("")
    report.append("---")
    report.append("")

    # Group by period
    by_period = defaultdict(list)
    for sig, info in signature_index.items():
        year = info['year']
        if year:
            period_start = (year // 5) * 5
            period = f"{period_start}-{period_start + 4}"
            by_period[period].append((sig, info))
        else:
            by_period['Unknown'].append((sig, info))

    # Group by type
    by_type = defaultdict(list)
    for sig, info in signature_index.items():
        by_type[info['type']].append((sig, info))

    # Output by period
    report.append("## Signaturen nach Zeitperioden")
    report.append("")

    for period in sorted(by_period.keys()):
        if period == 'Unknown':
            continue
        sigs = by_period[period]
        report.append(f"### {period} ({len(sigs)} Dokumente)")
        report.append("")
        report.append("| Signatur | Jahr | Typ | Titel (gekürzt) |")
        report.append("|----------|------|-----|-----------------|")

        for sig, info in sorted(sigs, key=lambda x: (x[1]['year'] or 0, x[0]))[:30]:
            year = info['year'] or '?'
            doc_type = info['type']
            title = info['title'][:80].replace('|', '/')
            report.append(f"| {sig} | {year} | {doc_type} | {title} |")

        if len(sigs) > 30:
            report.append(f"| ... | ... | ... | *({len(sigs) - 30} weitere Dokumente)* |")

        report.append("")

    # Output by type
    report.append("## Signaturen nach Dokumenttyp")
    report.append("")

    for doc_type in sorted(by_type.keys(), key=lambda x: len(by_type[x]), reverse=True):
        sigs = by_type[doc_type]
        report.append(f"### {doc_type} ({len(sigs)} Dokumente)")
        report.append("")

        # Show first 20 of each type
        for sig, info in sorted(sigs, key=lambda x: (x[1]['year'] or 0, x[0]))[:20]:
            year = info['year'] or '?'
            title = info['title'][:100]
            report.append(f"- **{sig}** ({year}): {title}")

        if len(sigs) > 20:
            report.append(f"- *... und {len(sigs) - 20} weitere*")

        report.append("")

    # Wagner works detail
    report.append("## Wagner-Werke (detailliert)")
    report.append("")

    wagner_keywords = ['Wagner', 'Tannhäuser', 'Lohengrin', 'Tristan', 'Parsifal',
                       'Walküre', 'Rheingold', 'Siegfried', 'Götterdämmerung',
                       'Meistersinger', 'Holländer']

    wagner_sigs = []
    for sig, info in signature_index.items():
        title_upper = info['title'].upper()
        if any(kw.upper() in title_upper for kw in wagner_keywords):
            wagner_sigs.append((sig, info))

    report.append(f"**Gefunden:** {len(wagner_sigs)} Dokumente")
    report.append("")
    report.append("| Signatur | Jahr | Typ | Titel |")
    report.append("|----------|------|-----|-------|")

    for sig, info in sorted(wagner_sigs, key=lambda x: (x[1]['year'] or 0, x[0])):
        year = info['year'] or '?'
        doc_type = info['type']
        title = info['title'][:100].replace('|', '/')
        report.append(f"| {sig} | {year} | {doc_type} | {title} |")

    report.append("")

    # Verdi works detail
    report.append("## Verdi-Werke (detailliert)")
    report.append("")

    verdi_keywords = ['Verdi', 'Aida', 'Traviata', 'Rigoletto', 'Trovatore',
                      'Otello', 'Falstaff', 'Don Carlos', 'Nabucco', 'Macbeth']

    verdi_sigs = []
    for sig, info in signature_index.items():
        title_upper = info['title'].upper()
        if any(kw.upper() in title_upper for kw in verdi_keywords):
            verdi_sigs.append((sig, info))

    report.append(f"**Gefunden:** {len(verdi_sigs)} Dokumente")
    report.append("")
    report.append("| Signatur | Jahr | Typ | Titel |")
    report.append("|----------|------|-----|-------|")

    for sig, info in sorted(verdi_sigs, key=lambda x: (x[1]['year'] or 0, x[0])):
        year = info['year'] or '?'
        doc_type = info['type']
        title = info['title'][:100].replace('|', '/')
        report.append(f"| {sig} | {year} | {doc_type} | {title} |")

    report.append("")

    # Strauss works detail
    report.append("## Strauss-Werke (detailliert)")
    report.append("")

    strauss_keywords = ['Strauss', 'Rosenkavalier', 'Salome', 'Elektra',
                        'Ariadne', 'Frau ohne Schatten', 'Arabella', 'Capriccio']

    strauss_sigs = []
    for sig, info in signature_index.items():
        title_upper = info['title'].upper()
        if any(kw.upper() in title_upper for kw in strauss_keywords):
            strauss_sigs.append((sig, info))

    report.append(f"**Gefunden:** {len(strauss_sigs)} Dokumente")
    report.append("")
    report.append("| Signatur | Jahr | Typ | Titel |")
    report.append("|----------|------|-----|-------|")

    for sig, info in sorted(strauss_sigs, key=lambda x: (x[1]['year'] or 0, x[0])):
        year = info['year'] or '?'
        doc_type = info['type']
        title = info['title'][:100].replace('|', '/')
        report.append(f"| {sig} | {year} | {doc_type} | {title} |")

    report.append("")

    # Save report
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"Signature index saved to: {output_path}")
    print(f"Total lines: {len(report)}")

if __name__ == '__main__':
    main()
