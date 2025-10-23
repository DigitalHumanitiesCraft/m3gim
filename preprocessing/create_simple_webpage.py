import pandas as pd
import json
import os
from datetime import datetime

def load_and_prepare_data():
    """Load Excel data and prepare it for web display"""
    
    data_path = os.path.join('data', 'data.xlsx')
    df = pd.read_excel(data_path, sheet_name='Tabelle1')
    
    df = df.fillna('')
    
    df.columns = [
        'box_nr', 'heft_nr', 'date_findbuch', 'archive_signature',
        'title', 'contains', 'additional_content', 'object_count',
        'filename', 'complete', 'language', 'important_findings',
        'further_processing', 'provenance', 'processing_status',
        'notes', 'status'
    ]
    
    for col in df.columns:
        if df[col].dtype == 'datetime64[ns]':
            df[col] = df[col].astype(str)
        elif df[col].dtype == 'object':
            df[col] = df[col].astype(str)
    
    data_dict = df.to_dict('records')
    
    with open('archive_data.json', 'w', encoding='utf-8') as f:
        json.dump(data_dict, f, ensure_ascii=False, indent=2)
    
    print(f"Data exported to archive_data.json")
    print(f"Total records: {len(data_dict)}")
    
    stats = {
        'total_records': int(len(df)),
        'total_boxes': int(df['box_nr'].nunique()),
        'languages': {str(k): int(v) for k, v in df['language'].value_counts().to_dict().items()},
        'complete_count': int((df['complete'] == 'ja').sum()) if 'complete' in df.columns else 0
    }
    
    with open('archive_stats.json', 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    
    print(f"Statistics exported to archive_stats.json")
    
    create_simple_html()
    
    return data_dict, stats

def create_simple_html():
    """Create a simple HTML page to display the data"""
    
    html_content = '''<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Archive Catalog</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; background: #f4f4f4; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 20px; }
        .stats { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
        .stat-card { background: #007bff; color: white; padding: 15px; border-radius: 5px; flex: 1; min-width: 150px; }
        .stat-card h3 { font-size: 14px; opacity: 0.9; }
        .stat-card .number { font-size: 28px; font-weight: bold; }
        .controls { margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap; }
        input, select { padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        input[type="text"] { flex: 1; min-width: 200px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #007bff; color: white; cursor: pointer; user-select: none; }
        th:hover { background: #0056b3; }
        tr:hover { background: #f8f9fa; }
        .clickable { cursor: pointer; color: #007bff; }
        .clickable:hover { text-decoration: underline; }
        .pagination { margin-top: 20px; display: flex; gap: 10px; justify-content: center; align-items: center; }
        .pagination button { padding: 8px 12px; border: 1px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer; }
        .pagination button:hover { background: #007bff; color: white; }
        .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
        .pagination .current { background: #007bff; color: white; }
        .detail-row { display: none; background: #f8f9fa; }
        .detail-row td { padding: 20px; }
        .detail-content { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
        .detail-item { margin-bottom: 10px; }
        .detail-label { font-weight: bold; color: #666; }
        @media (max-width: 768px) {
            table { font-size: 12px; }
            th, td { padding: 8px; }
            .controls { flex-direction: column; }
            input[type="text"] { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Archive Catalog</h1>
        
        <div class="stats" id="stats">
            <div class="stat-card">
                <h3>Total Records</h3>
                <div class="number" id="totalRecords">-</div>
            </div>
            <div class="stat-card" style="background: #28a745;">
                <h3>Total Boxes</h3>
                <div class="number" id="totalBoxes">-</div>
            </div>
            <div class="stat-card" style="background: #ffc107;">
                <h3>Complete Items</h3>
                <div class="number" id="completeItems">-</div>
            </div>
        </div>
        
        <div class="controls">
            <input type="text" id="searchInput" placeholder="Search in title, box number, or notebook number...">
            <select id="languageFilter">
                <option value="">All Languages</option>
            </select>
            <select id="completeFilter">
                <option value="">All Status</option>
                <option value="ja">Complete</option>
                <option value="nein">Incomplete</option>
                <option value="">Unknown</option>
            </select>
        </div>
        
        <table id="dataTable">
            <thead>
                <tr>
                    <th onclick="sortTable('box_nr')">Box Nr. ↕</th>
                    <th onclick="sortTable('heft_nr')">Heft Nr. ↕</th>
                    <th onclick="sortTable('title')">Title ↕</th>
                    <th onclick="sortTable('archive_signature')">Archive Signature ↕</th>
                    <th onclick="sortTable('language')">Language ↕</th>
                    <th onclick="sortTable('complete')">Complete? ↕</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="tableBody">
            </tbody>
        </table>
        
        <div class="pagination" id="pagination">
            <button onclick="previousPage()" id="prevBtn">Previous</button>
            <span id="pageInfo">Page 1 of 1</span>
            <button onclick="nextPage()" id="nextBtn">Next</button>
        </div>
    </div>
    
    <script>
        let allData = [];
        let filteredData = [];
        let currentPage = 1;
        const itemsPerPage = 20;
        let sortColumn = '';
        let sortDirection = 'asc';
        
        async function loadData() {
            try {
                const dataResponse = await fetch('archive_data.json');
                allData = await dataResponse.json();
                
                const statsResponse = await fetch('archive_stats.json');
                const stats = await statsResponse.json();
                
                document.getElementById('totalRecords').textContent = stats.total_records;
                document.getElementById('totalBoxes').textContent = stats.total_boxes;
                document.getElementById('completeItems').textContent = stats.complete_count || 0;
                
                const languages = Object.keys(stats.languages || {});
                const languageFilter = document.getElementById('languageFilter');
                languages.forEach(lang => {
                    if (lang) {
                        const option = document.createElement('option');
                        option.value = lang;
                        option.textContent = lang;
                        languageFilter.appendChild(option);
                    }
                });
                
                filteredData = [...allData];
                renderTable();
            } catch (error) {
                console.error('Error loading data:', error);
                document.getElementById('tableBody').innerHTML = '<tr><td colspan="7">Error loading data. Please ensure archive_data.json exists.</td></tr>';
            }
        }
        
        function renderTable() {
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageData = filteredData.slice(start, end);
            
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';
            
            pageData.forEach((item, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.box_nr || ''}</td>
                    <td>${item.heft_nr || ''}</td>
                    <td>${item.title || ''}</td>
                    <td>${item.archive_signature || ''}</td>
                    <td>${item.language || ''}</td>
                    <td>${item.complete || ''}</td>
                    <td><span class="clickable" onclick="toggleDetails(${start + index})">Details ▼</span></td>
                `;
                tbody.appendChild(row);
                
                const detailRow = document.createElement('tr');
                detailRow.className = 'detail-row';
                detailRow.id = `detail-${start + index}`;
                detailRow.innerHTML = `
                    <td colspan="7">
                        <div class="detail-content">
                            <div class="detail-item"><span class="detail-label">Date:</span> ${item.date_findbuch || 'N/A'}</div>
                            <div class="detail-item"><span class="detail-label">Contains:</span> ${item.contains || 'N/A'}</div>
                            <div class="detail-item"><span class="detail-label">Additional Content:</span> ${item.additional_content || 'N/A'}</div>
                            <div class="detail-item"><span class="detail-label">Object Count:</span> ${item.object_count || 'N/A'}</div>
                            <div class="detail-item"><span class="detail-label">Filename:</span> ${item.filename || 'N/A'}</div>
                            <div class="detail-item"><span class="detail-label">Important Findings:</span> ${item.important_findings || 'N/A'}</div>
                            <div class="detail-item"><span class="detail-label">Further Processing:</span> ${item.further_processing || 'N/A'}</div>
                            <div class="detail-item"><span class="detail-label">Processing Status:</span> ${item.processing_status || 'N/A'}</div>
                            <div class="detail-item"><span class="detail-label">Notes:</span> ${item.notes || 'N/A'}</div>
                        </div>
                    </td>
                `;
                tbody.appendChild(detailRow);
            });
            
            updatePagination();
        }
        
        function toggleDetails(index) {
            const detailRow = document.getElementById(`detail-${index}`);
            detailRow.style.display = detailRow.style.display === 'table-row' ? 'none' : 'table-row';
        }
        
        function filterData() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const languageFilter = document.getElementById('languageFilter').value;
            const completeFilter = document.getElementById('completeFilter').value;
            
            filteredData = allData.filter(item => {
                const matchesSearch = !searchTerm || 
                    (item.title && item.title.toLowerCase().includes(searchTerm)) ||
                    (item.box_nr && item.box_nr.toString().includes(searchTerm)) ||
                    (item.heft_nr && item.heft_nr.toString().includes(searchTerm)) ||
                    (item.archive_signature && item.archive_signature.toLowerCase().includes(searchTerm));
                
                const matchesLanguage = !languageFilter || item.language === languageFilter;
                const matchesComplete = !completeFilter || item.complete === completeFilter;
                
                return matchesSearch && matchesLanguage && matchesComplete;
            });
            
            currentPage = 1;
            renderTable();
        }
        
        function sortTable(column) {
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'asc';
            }
            
            filteredData.sort((a, b) => {
                const aVal = a[column] || '';
                const bVal = b[column] || '';
                
                if (sortDirection === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
            
            renderTable();
        }
        
        function updatePagination() {
            const totalPages = Math.ceil(filteredData.length / itemsPerPage);
            document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
            document.getElementById('prevBtn').disabled = currentPage === 1;
            document.getElementById('nextBtn').disabled = currentPage === totalPages;
        }
        
        function previousPage() {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        }
        
        function nextPage() {
            const totalPages = Math.ceil(filteredData.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        }
        
        document.getElementById('searchInput').addEventListener('input', filterData);
        document.getElementById('languageFilter').addEventListener('change', filterData);
        document.getElementById('completeFilter').addEventListener('change', filterData);
        
        loadData();
    </script>
</body>
</html>'''
    
    with open('archive_catalog.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print("HTML page created: archive_catalog.html")

if __name__ == "__main__":
    data, stats = load_and_prepare_data()
    print(f"\nWeb page created successfully!")
    print(f"Open 'archive_catalog.html' in your browser to view the data.")
    print(f"\nFiles created:")
    print(f"  - archive_data.json (data file)")
    print(f"  - archive_stats.json (statistics)")
    print(f"  - archive_catalog.html (web page)")