import pandas as pd
import json
from datetime import datetime
import re
from pathlib import Path
import sys
import os

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

class CompactLogger:
    """Compact console logger with emoji indicators and progress tracking"""
    
    ICONS = {
        'info': '📊',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌',
        'process': '⚙️',
        'data': '📁',
        'clean': '🧹',
        'export': '📤',
        'stats': '📈'
    }
    
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.start_time = datetime.now()
        
    def log(self, message, level='info', data=None):
        """Compact single-line logging with optional data"""
        icon = self.ICONS.get(level, '•')
        timestamp = datetime.now().strftime('%H:%M:%S')
        
        if data:
            if isinstance(data, dict):
                data_str = f" [{', '.join(f'{k}:{v}' for k, v in data.items())}]"
            else:
                data_str = f" [{data}]"
        else:
            data_str = ""
        
        print(f"{icon} {timestamp} | {message}{data_str}")
        
    def progress(self, current, total, message="Processing"):
        """Inline progress indicator"""
        percent = (current / total) * 100
        bar_length = 30
        filled = int(bar_length * current / total)
        bar = '█' * filled + '░' * (bar_length - filled)
        
        sys.stdout.write(f'\r⚙️ {message}: |{bar}| {percent:.1f}% ({current}/{total})')
        sys.stdout.flush()
        
        if current == total:
            print()  # New line when complete
    
    def summary(self):
        """Print execution summary"""
        duration = (datetime.now() - self.start_time).total_seconds()
        print(f"\n⏱️ Total execution time: {duration:.2f}s")

def clean_and_enrich_data(df, logger):
    """Clean and enrich the archive data"""
    logger.log("Starting data cleaning", "clean")
    
    # First, rename German columns to English for easier processing
    column_mapping = {
        'Box-Nr.': 'box_nr',
        'Heft-Nr.': 'heft_nr',
        'Dat. - Findbuch': 'date_findbuch',
        'Archivsignatur': 'archive_signature',
        'Titel': 'title',
        'Enthält (Was ist in dem Heft)': 'contains',
        'Darin (Was ist zusätzlich in dem Heft, passt aber inhaltlich nicht zu "enthält")': 'additional_content',
        'Anzahl der Objekte': 'object_count',
        'Filename': 'filename',
        'komplett?': 'complete',
        'Sprache': 'language',
        'Wichtige Fundstellen/Notizen': 'important_findings',
        'Weiterverarbeitung (z.B. Scannen, Transkribieren)': 'further_processing',
        'Provenienz': 'provenance',
        'Bearbeitungsstatus': 'processing_status',
        'Notizen': 'notes',
        '\tStatus (offen / in Bearbeitung / erledigt)': 'status'
    }
    
    # Rename columns
    df = df.rename(columns=column_mapping)
    
    # Track changes
    changes = {'filled_missing': 0, 'standardized_dates': 0, 'enriched_fields': 0}
    
    # Fill missing 'complete' status
    missing_complete = df['complete'].isna().sum()
    # Map German values to standard values
    df['complete'] = df['complete'].str.lower().map({
        'ja': 'ja',
        'nein': 'nein',
        'yes': 'ja',
        'no': 'nein'
    }).fillna('pending_review')
    changes['filled_missing'] = missing_complete
    
    # Standardize date formats
    def standardize_date(date_str):
        if pd.isna(date_str):
            return None
        date_str = str(date_str).strip()
        
        # Try different date patterns
        patterns = [
            (r'(\d{4})', '%Y'),
            (r'(\d{1,2})\.(\d{1,2})\.(\d{4})', '%d.%m.%Y'),
            (r'(\d{1,2})/(\d{1,2})/(\d{4})', '%m/%d/%Y'),
            (r'(\d{4})-(\d{2})-(\d{2})', '%Y-%m-%d')
        ]
        
        for pattern, fmt in patterns:
            if re.match(pattern, date_str):
                try:
                    return pd.to_datetime(date_str, format=fmt).strftime('%Y-%m-%d')
                except:
                    pass
        return date_str
    
    df['date_standardized'] = df['date_findbuch'].apply(standardize_date)
    changes['standardized_dates'] = df['date_standardized'].notna().sum()
    
    # Add enriched fields
    df['has_filename'] = df['filename'].notna()
    df['content_length'] = df['contains'].fillna('').str.len()
    df['title_length'] = df['title'].fillna('').str.len()
    df['needs_processing'] = (df['further_processing'].notna()) | (df['processing_status'] == 'pending')
    df['priority_score'] = (
        df['important_findings'].notna().astype(int) * 3 +
        df['has_filename'].astype(int) * 2 +
        (df['complete'] == 'ja').astype(int) * 1
    )
    
    # Add quality score
    required_fields = ['title', 'box_nr', 'archive_signature']
    df['quality_score'] = df[required_fields].notna().sum(axis=1) / len(required_fields) * 100
    
    changes['enriched_fields'] = 8
    
    logger.log("Data cleaning complete", "success", changes)
    return df

def generate_statistics(df, logger):
    """Generate comprehensive statistics"""
    logger.log("Generating statistics", "stats")
    
    stats = {
        'total_records': len(df),
        'total_boxes': df['box_nr'].nunique(),
        'total_notebooks': df['heft_nr'].nunique(),
        'complete_items': len(df[df['complete'] == 'ja']),
        'pending_review': len(df[df['complete'] == 'pending_review']),
        'incomplete_items': len(df[df['complete'] == 'nein']),
        'languages': df['language'].value_counts().to_dict(),
        'avg_quality_score': round(df['quality_score'].mean(), 1),
        'high_priority_items': len(df[df['priority_score'] >= 4]),
        'items_needing_processing': len(df[df['needs_processing'] == True]),
        'items_with_files': len(df[df['has_filename'] == True]),
        'date_range': {
            'earliest': df['date_standardized'].dropna().min() if df['date_standardized'].notna().any() else None,
            'latest': df['date_standardized'].dropna().max() if df['date_standardized'].notna().any() else None
        },
        'box_distribution': df.groupby('box_nr').size().to_dict(),
        'processing_status': df['processing_status'].value_counts().to_dict(),
        'avg_content_length': round(df['content_length'].mean(), 0),
        'last_updated': datetime.now().isoformat()
    }
    
    logger.log(f"Statistics generated", "success", {'metrics': len(stats)})
    return stats

def export_data(df, stats, logger):
    """Export data in multiple formats"""
    logger.log("Starting data export", "export")
    
    # Export to JSON with metadata
    export_data = {
        'metadata': {
            'version': '2.0',
            'generated': datetime.now().isoformat(),
            'total_records': len(df),
            'schema_version': '2024.1'
        },
        'statistics': stats,
        'data': df.to_dict('records')
    }
    
    with open('archive_data_enhanced.json', 'w', encoding='utf-8') as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2, default=str)
    
    logger.log("Exported enhanced JSON", "success", {'size': f'{len(json.dumps(export_data, default=str))/1024:.1f}KB'})
    
    # Export statistics separately
    with open('archive_stats_enhanced.json', 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2, default=str)
    
    # Export cleaned CSV
    df.to_csv('archive_data_cleaned.csv', index=False, encoding='utf-8')
    logger.log("Exported cleaned CSV", "success", {'rows': len(df), 'cols': len(df.columns)})
    
    return export_data

def main():
    logger = CompactLogger()
    logger.log("Archive Data Processor v2.0", "info")
    
    try:
        # Load data
        logger.log("Loading Excel data", "data")
        df = pd.read_excel('data/data.xlsx')
        logger.log(f"Data loaded", "success", {'rows': len(df), 'cols': len(df.columns)})
        
        # Clean and enrich
        df = clean_and_enrich_data(df, logger)
        
        # Generate statistics
        stats = generate_statistics(df, logger)
        
        # Export data
        export_data(df, stats, logger)
        
        # Print summary stats
        logger.log("Process complete!", "success")
        print("\n📊 Quick Summary:")
        print(f"  • Records: {stats['total_records']}")
        print(f"  • Boxes: {stats['total_boxes']}")
        print(f"  • Quality Score: {stats['avg_quality_score']}%")
        print(f"  • High Priority: {stats['high_priority_items']}")
        print(f"  • Need Processing: {stats['items_needing_processing']}")
        
    except Exception as e:
        logger.log(f"Error: {str(e)}", "error")
        raise
    
    finally:
        logger.summary()

if __name__ == "__main__":
    main()