# Web Page Display Plan for Archive Data

## Data Overview
- 182 archive records
- 17 fields per record
- Archive boxes containing notebooks/documents

## Simple Web Page Structure

### 1. **Header Section**
- Title: "Archive Catalog"
- Quick stats: Total records, boxes, completed items

### 2. **Search/Filter Bar**
- Search by: Title, Box number, Notebook number
- Filter dropdowns: Language, Status, Completeness

### 3. **Main Data Table**
**Visible columns (prioritized):**
1. Box-Nr. (Box Number)
2. Heft-Nr. (Notebook Number)
3. Titel (Title)
4. Archivsignatur (Archive Signature)
5. Sprache (Language)
6. komplett? (Complete?)
7. Bearbeitungsstatus (Processing Status)

**Expandable row details:** Click to show all 17 fields

### 4. **Features**
- Sortable columns
- Pagination (20 items per page)
- Export to CSV/Excel
- Mobile responsive

### 5. **Technical Implementation**
**Frontend:** HTML + CSS + JavaScript (or simple framework like Vue.js)
**Backend:** Flask/FastAPI to serve data as JSON
**Database:** SQLite for simple queries

## HTML Template Structure
```
index.html
├── Header with stats
├── Search/Filter controls
├── Data table with pagination
└── Footer with export options
```