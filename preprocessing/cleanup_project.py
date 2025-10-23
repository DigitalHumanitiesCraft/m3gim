import os
import shutil
import sys

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def cleanup_project():
    """Clean up project folder, keeping only essential files"""
    
    # Files to keep in root
    keep_files = [
        'archive_catalog.html',  # Final version for GitHub Pages
        'archive_data.json',      # Original data (backup)
        'archive_data_enhanced.json',  # Enhanced data
        'data'  # Data folder
    ]
    
    # Files to move to archive folder
    archive_files = [
        'archive_catalog_academic.html',
        'archive_catalog_enhanced.html', 
        'archive_catalog_standalone.html',
        'archive_data_cleaned.csv',
        'archive_stats.json',
        'archive_stats_enhanced.json',
        'create_simple_webpage.py',
        'generate_catalog.py',
        'load_data.py',
        'process_archive_data.py',
        'serve.py',
        'web_display_plan.md',
        'IMPROVEMENTS.md'
    ]
    
    # Create archive folder if it doesn't exist
    archive_dir = 'archive_development'
    if not os.path.exists(archive_dir):
        os.makedirs(archive_dir)
        print(f"📁 Created {archive_dir}/ folder")
    
    # Move files to archive
    moved_count = 0
    for file in archive_files:
        if os.path.exists(file):
            try:
                shutil.move(file, os.path.join(archive_dir, file))
                print(f"  ➜ Moved {file} to {archive_dir}/")
                moved_count += 1
            except Exception as e:
                print(f"  ⚠️ Could not move {file}: {e}")
    
    print(f"\n✅ Cleanup complete!")
    print(f"📊 Moved {moved_count} files to {archive_dir}/")
    print(f"\n📌 Files in root directory:")
    
    # List remaining files
    for item in os.listdir('.'):
        if os.path.isfile(item):
            size = os.path.getsize(item) / 1024
            print(f"  • {item} ({size:.1f} KB)")
        elif os.path.isdir(item) and item != '.git':
            print(f"  📁 {item}/")
    
    print(f"\n🚀 Ready for GitHub Pages deployment!")
    print(f"   Your catalog will be available at:")
    print(f"   https://chpollin.github.io/malaniuk/archive_catalog.html")

if __name__ == "__main__":
    response = input("This will reorganize your project files. Continue? (y/n): ")
    if response.lower() == 'y':
        cleanup_project()
    else:
        print("Cleanup cancelled.")