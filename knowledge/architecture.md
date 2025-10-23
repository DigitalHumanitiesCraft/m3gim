# Architecture Documentation: M³GIM Digital Archive

## Design Principles

1. **Simplicity First:** Minimal dependencies, easy maintenance, no complex server infrastructure
2. **Offline Capability:** Works without internet connection (embedded data model)
3. **Sustainability:** Static site with long-term hosting via GitHub Pages (free, stable)
4. **Open Standards:** JSON-LD, RiC compliance, Linked Open Data ready
5. **Progressive Enhancement:** Core content accessible without JavaScript

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAYER                                │
│  Researchers, Students, Public → Web Browsers (Desktop/Mobile)   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  GitHub Pages (Static Hosting)                                   │
│  • index.html (Single-Page Application)                          │
│  • Embedded JSON-LD data (no API calls)                          │
│  • CDN resources: Bootstrap 5, Chart.js, Font Awesome            │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                         [Build Process]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   PROCESSING LAYER                               │
│  GitHub Actions (CI/CD Pipeline)                                 │
│  • Triggered: Daily cron OR manual dispatch                      │
│  • Fetch: Google Sheets → Python script                          │
│  • Transform: Validate → Clean → Enrich → JSON-LD               │
│  • Publish: Commit to repo → Auto-deploy to Pages               │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                         [Sync Data]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  Google Sheets (Collaborative Data Entry)                        │
│  • Template: 17 columns with validation rules                    │
│  • Access: Project team only (authenticated)                     │
│  • Exports: JSON via Google Sheets API                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend (Presentation Layer)

**Core Technologies:**
- **HTML5:** Semantic markup, ARIA accessibility
- **CSS3:** Custom styles + Bootstrap 5.3 (responsive grid, components)
- **JavaScript (ES6+):** Client-side logic, no framework dependencies

**Libraries (CDN-delivered):**
```html
<!-- UI Framework -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- Icons -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">

<!-- Visualizations -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.3.0"></script>           <!-- Statistics -->
<script src="https://cdn.jsdelivr.net/npm/d3@7.8.5"></script>                 <!-- Networks -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>      <!-- Maps -->

<!-- Utilities -->
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1"></script>         <!-- CSV export -->
```

**Browser Targets:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ (2020-2021)

### Backend (Processing Layer)

**Runtime:**
- **Python 3.11+** (data processing scripts)
- **GitHub Actions** (serverless CI/CD)

**Python Libraries:**
```python
# requirements.txt
pandas==2.0.3           # Data manipulation
openpyxl==3.1.2        # Excel reading
google-auth==2.22.0    # Google Sheets authentication
google-api-python-client==2.95.0
jsonschema==4.19.0     # JSON-LD validation
pytest==7.4.0          # Testing
```

**GitHub Actions Workflow:**
```yaml
# .github/workflows/sync_data.yml
name: Sync and Deploy
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:      # Manual trigger

jobs:
  sync-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Fetch from Google Sheets
        env:
          GOOGLE_CREDENTIALS: ${{ secrets.GOOGLE_SHEETS_CREDENTIALS }}
        run: python scripts/sheets_sync.py
      - name: Process data
        run: python scripts/process_archive_data.py
      - name: Validate JSON-LD
        run: python scripts/validate_schema.py
      - name: Generate catalog
        run: python scripts/generate_catalog.py
      - name: Commit changes
        run: |
          git config user.name "M3GIM Bot"
          git config user.email "bot@m3gim.uni-graz.at"
          git add archive_data_enhanced.json index.html
          git diff --quiet || git commit -m "🤖 Auto-update: $(date +'%Y-%m-%d')"
          git push
```

### Data Layer

**Primary Storage:**
- **Google Sheets** (collaborative editing)
  - Sheet ID: `[PROJECT_SHEET_ID]`
  - Sheet Name: `M3GIM_Archive_Data`
  - Authentication: Service Account with read-only API access

**Version Control:**
- **Git Repository:** `github.com/chpollin/malaniuk`
- **Branch Strategy:** `main` (production), `develop` (testing), `feature/*` (PRs)

**Data Formats:**
```
preprocessing/
├── archive_data.json              # Original export
├── archive_data_enhanced.json     # Processed, enriched (embedded in HTML)
├── archive_stats_enhanced.json    # Pre-computed statistics
└── schema.jsonld                  # JSON-LD schema

data/vocabularies/
├── dokumenttyp.json               # Controlled vocab: document types
├── sprache.json                   # Controlled vocab: languages
└── bearbeitungsstatus.json        # Controlled vocab: processing status
```

### Hosting & Deployment

**Static Hosting:**
- **Platform:** GitHub Pages
- **URL:** `https://chpollin.github.io/malaniuk/`
- **Custom Domain (optional):** `malaniuk.kug.ac.at` (CNAME)
- **SSL:** Automatic via Let's Encrypt

**Deployment Pipeline:**
```
Google Sheets Edit → GitHub Actions Trigger
                              ↓
                       Fetch Data (API)
                              ↓
                       Validate & Transform
                              ↓
                       Generate HTML (Embedded JSON)
                              ↓
                       Git Commit & Push
                              ↓
                  GitHub Pages Auto-Deploy (30-60s)
                              ↓
                       Live at https://...
```

---

## Component Architecture

### Frontend Components

**1. Core Application**
```javascript
// Main application structure
const App = {
  data: {
    allData: [],           // All records from EMBEDDED_DATA
    filteredData: [],      // Currently filtered records
    currentPage: 1,
    itemsPerPage: 20,
    filters: {},
    searchQuery: ''
  },

  init() {
    this.loadData();
    this.initFilters();
    this.initSearch();
    this.renderTable();
    this.renderStats();
  },

  loadData() {
    this.data.allData = EMBEDDED_DATA.data;
    this.data.filteredData = [...this.data.allData];
  }
};
```

**2. Search Module**
```javascript
const SearchModule = {
  searchableFields: ['titel', 'enthaelt', 'personen', 'orte', 'notizen'],

  search(records, query) {
    const q = query.toLowerCase();
    return records.filter(record =>
      this.searchableFields.some(field => {
        const value = record[field];
        if (Array.isArray(value)) {
          return value.some(v => v.toString().toLowerCase().includes(q));
        }
        return value?.toString().toLowerCase().includes(q);
      })
    );
  }
};
```

**3. Filter Module**
```javascript
const FilterModule = {
  filters: {
    dokumenttyp: [],
    sprache: [],
    orte: [],
    graz_bezug: null,
    jahr_von: null,
    jahr_bis: null
  },

  apply(records) {
    let filtered = [...records];

    if (this.filters.dokumenttyp.length > 0) {
      filtered = filtered.filter(r =>
        this.filters.dokumenttyp.includes(r.dokumenttyp)
      );
    }

    if (this.filters.graz_bezug) {
      filtered = filtered.filter(r => r.graz_bezug === true);
    }

    if (this.filters.jahr_von) {
      filtered = filtered.filter(r => r.jahr_von >= this.filters.jahr_von);
    }

    return filtered;
  }
};
```

**4. Export Module**
```javascript
const ExportModule = {
  toCSV(data) {
    const csv = Papa.unparse(data, { quotes: true, delimiter: ',', header: true });
    this.download(csv, 'malaniuk_archive.csv', 'text/csv');
  },

  toJSON(data) {
    const json = JSON.stringify(data, null, 2);
    this.download(json, 'malaniuk_archive.json', 'application/json');
  },

  toJSONLD(data) {
    const jsonld = {
      '@context': 'https://m3gim.uni-graz.at/context.jsonld',
      '@graph': data.map(r => this.transformToRiC(r))
    };
    const str = JSON.stringify(jsonld, null, 2);
    this.download(str, 'malaniuk_archive_ric.jsonld', 'application/ld+json');
  },

  download(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};
```

**5. Visualization: Network Graph (D3.js)**
```javascript
const NetworkModule = {
  buildGraph(data) {
    const nodes = new Map();
    const links = [];

    data.forEach(record => {
      record.personen?.forEach(person => {
        if (!nodes.has(person.name)) {
          nodes.set(person.name, {
            id: person.name,
            rolle: person.rolle,
            gnd_id: person.gnd_id,
            connections: 0
          });
        }
        nodes.get(person.name).connections++;
      });

      // Create links between persons in same record
      if (record.personen?.length > 1) {
        for (let i = 0; i < record.personen.length; i++) {
          for (let j = i + 1; j < record.personen.length; j++) {
            links.push({
              source: record.personen[i].name,
              target: record.personen[j].name,
              record: record.archivsignatur
            });
          }
        }
      }
    });

    return { nodes: Array.from(nodes.values()), links };
  },

  render(graph) {
    const simulation = d3.forceSimulation(graph.nodes)
      .force('link', d3.forceLink(graph.links).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2));
    // ... (full D3 rendering)
  }
};
```

**6. Visualization: Map (Leaflet.js)**
```javascript
const MapModule = {
  init() {
    this.map = L.map('map').setView([47.0707, 15.4395], 6); // Graz
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  },

  plotLocations(data) {
    const locationCounts = {};

    data.forEach(record => {
      record.orte?.forEach(place => {
        if (place.lat && place.lon) {
          const key = `${place.lat},${place.lon}`;
          if (!locationCounts[key]) {
            locationCounts[key] = {
              name: place.ort,
              lat: place.lat,
              lon: place.lon,
              count: 0,
              records: []
            };
          }
          locationCounts[key].count++;
          locationCounts[key].records.push(record.archivsignatur);
        }
      });
    });

    Object.values(locationCounts).forEach(loc => {
      const marker = L.circleMarker([loc.lat, loc.lon], {
        radius: Math.sqrt(loc.count) * 3,
        fillColor: loc.name === 'Graz' ? '#FF6384' : '#36A2EB',
        fillOpacity: 0.6
      }).addTo(this.map);

      marker.bindPopup(`
        <strong>${loc.name}</strong><br>
        ${loc.count} records<br>
        <a href="#" onclick="filterByPlace('${loc.name}')">Show records</a>
      `);
    });
  }
};
```

### Backend Components

**1. Google Sheets Sync**
```python
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

class SheetsSyncer:
    def __init__(self, sheet_id, credentials_path):
        self.sheet_id = sheet_id
        self.creds = Credentials.from_service_account_file(
            credentials_path,
            scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
        )
        self.service = build('sheets', 'v4', credentials=self.creds)

    def fetch_data(self, sheet_name='M3GIM_Archive_Data'):
        result = self.service.spreadsheets().values().get(
            spreadsheetId=self.sheet_id,
            range=f'{sheet_name}!A:Q'  # Columns A-Q (17 fields)
        ).execute()
        return result.get('values', [])

    def to_dataframe(self, values):
        headers = values[0]
        data = values[1:]
        return pd.DataFrame(data, columns=headers)
```

**2. Schema Validator**
```python
import jsonschema
import json

def validate_jsonld(data_file, schema_file):
    with open(data_file) as f:
        data = json.load(f)

    with open(schema_file) as f:
        schema = json.load(f)

    try:
        jsonschema.validate(instance=data, schema=schema)
        print("✅ JSON-LD is valid")
        return True
    except jsonschema.exceptions.ValidationError as e:
        print(f"❌ Validation error: {e.message}")
        return False
```

**3. Data Processor**
See [preprocessing/README.md](../preprocessing/README.md) for complete 7-script pipeline documentation:
- `sheets_sync.py` - Fetch from Google Sheets
- `validate.py` - Validate required fields
- `process.py` - Clean and standardize
- `enrich.py` - Extract entities, add GND/GeoNames IDs
- `transform.py` - Convert to JSON-LD
- `stats.py` - Generate statistics
- `generate.py` - Build HTML with embedded data

---

## Security & Privacy

**Authentication:**
- Google Sheets: Service account with read-only access (credentials in GitHub Secrets)
- No public write access to data

**Data Privacy:**
- No personal data collection (no cookies, analytics, or tracking)
- Archival records reviewed for GDPR compliance
- Copyright notices on digitized materials

**Input Validation:**
- Google Sheets: Dropdown validation prevents invalid entries
- Python pipeline: Schema validation catches malformed data
- Frontend: Client-side sanitization (no user-generated content stored)

**Dependency Security:**
- Dependabot enabled for automated security updates
- Regular audits of npm/pip dependencies

---

## Performance Optimization

**Frontend:**
- Embedded data eliminates network latency (no API calls)
- Lazy-load visualizations (render on tab activation)
- Debounced search (300ms delay to reduce re-renders)

**Backend:**
- GitHub Actions caching (Python dependencies, Sheets API responses)
- Pre-computed statistics (no runtime aggregation)

**Hosting:**
- GitHub Pages CDN (global edge caching)
- Gzip compression (automatic)
- HTTP/2 support (automatic)

---

## Development Workflow

**Local Development:**
```bash
# 1. Clone repository
git clone https://github.com/chpollin/malaniuk.git
cd malaniuk

# 2. Install Python dependencies
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Run data processing
python preprocessing/process_archive_data.py

# 4. Test locally
python -m http.server 8000
# Open http://localhost:8000/docs/
```

**Testing:**
```bash
# Run unit tests
pytest tests/

# Validate JSON-LD
python scripts/validate_schema.py

# Check accessibility (WCAG 2.1 AA)
npx pa11y http://localhost:8000/docs/
```

**Deployment:**
```bash
# Push to GitHub (triggers auto-deployment)
git add .
git commit -m "Update data"
git push origin main

# GitHub Actions runs → GitHub Pages updates (30-60s)
```

---

## Disaster Recovery

**Backups:**
- Git history (complete data versioning)
- Weekly automated backups to university server
- Quarterly export to Zenodo (DOI for each release)

**Rollback Procedure:**
```bash
# If bad data deployed
git revert HEAD
git push origin main
# GitHub Pages auto-deploys previous version
```

**Data Loss Prevention:**
- Google Sheets version history (unlimited)
- Git repository mirrored to GitLab (automated sync)

---

## Contact & Support

**Technical Lead:** Dr. Christopher Pollin (Digital Humanities Craft OG)
**Project Lead:** Univ.-Prof.in Dr.in Nicole K. Strohmann (KUG Graz)
**Repository:** https://github.com/chpollin/malaniuk
**Issues:** https://github.com/chpollin/malaniuk/issues

---

**Last Updated:** 2025-10-23 | See [preprocessing/README.md](../preprocessing/README.md) for data pipeline details
