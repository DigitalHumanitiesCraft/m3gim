import json
import os
import sys

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def generate_embedded_catalog(template_file='archive_catalog_academic.html', output_file='archive_catalog_standalone.html'):
    """Generate HTML catalog with embedded data to avoid CORS issues"""
    
    # Load the enhanced data
    with open('archive_data_enhanced.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Read the HTML template
    with open(template_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Find the script section and replace the fetch with embedded data
    # We'll inject the data directly before the loadData function
    data_script = f"""
    <script>
        // Embedded data to avoid CORS issues
        const EMBEDDED_DATA = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};
    </script>
    """
    
    # Find where to inject (before the main script)
    script_marker = '<script>\n        // Global variables'
    
    # Replace the loadData function to use embedded data
    old_load_data = """async function loadData() {
            logger.group('Data Loading');
            
            try {
                const response = await fetch('archive_data_enhanced.json');
                const jsonData = await response.json();
                
                allData = jsonData.data || jsonData;
                filteredData = [...allData];"""
    
    new_load_data = """async function loadData() {
            logger.group('Data Loading');
            
            try {
                // Use embedded data instead of fetch
                const jsonData = EMBEDDED_DATA;
                
                allData = jsonData.data || jsonData;
                filteredData = [...allData];"""
    
    # Also handle the fallback
    old_fallback = """} catch (error) {
                logger.log('Error loading data', error);
                // Fallback to original data
                const response = await fetch('archive_data.json');
                allData = await response.json();
                filteredData = [...allData];"""
    
    new_fallback = """} catch (error) {
                logger.log('Error loading data', error);
                // Use embedded data as fallback
                allData = EMBEDDED_DATA.data || [];
                filteredData = [...allData];"""
    
    # Apply replacements
    html_content = html_content.replace(script_marker, data_script + '\n    ' + script_marker)
    html_content = html_content.replace(old_load_data, new_load_data)
    html_content = html_content.replace(old_fallback, new_fallback)
    
    # Save the new file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"✅ Generated {output_file} with embedded data")
    print(f"📊 Data embedded: {len(data['data'])} records")
    print(f"📁 File size: {os.path.getsize(output_file) / 1024:.1f} KB")
    print(f"\n🚀 Open {output_file} directly in your browser - no server needed!")

if __name__ == "__main__":
    # Generate the final version as archive_catalog.html
    generate_embedded_catalog(
        template_file='archive_catalog_academic.html',
        output_file='archive_catalog.html'
    )