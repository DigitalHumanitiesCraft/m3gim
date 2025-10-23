# Data Processing Pipeline

This folder documents the automated data pipeline that transforms raw archival data from Google Sheets into structured, enriched JSON-LD suitable for web presentation and research analysis.

---

## Pipeline Overview

```
┌─────────────────┐
│ Google Sheets   │  ← Researchers enter data with validation
│ (17 columns)    │
└────────┬────────┘
         │
         │ [GitHub Actions: Daily Sync]
         ↓
┌─────────────────┐
│ Raw JSON        │  ← sheets_sync.py fetches via API
│ (unvalidated)   │
└────────┬────────┘
         │
         │ [Validation]
         ↓
┌─────────────────┐
│ Schema Check    │  ← validate_schema.py
│ (JSON Schema)   │     ✓ Required fields present
└────────┬────────┘     ✓ Formats correct
         │              ✓ Controlled vocabs match
         │
         │ [Cleaning]
         ↓
┌─────────────────┐
│ Normalized Data │  ← process_archive_data.py
│ (cleaned)       │     • Standardize dates
└────────┬────────┘     • Normalize languages
         │              • Fill missing values
         │
         │ [Enrichment]
         ↓
┌─────────────────┐
│ Enhanced Data   │  ← enrich_entities.py
│ (structured)    │     • Extract person names
└────────┬────────┘     • Extract place names
         │              • Link to GND/GeoNames
         │              • Calculate quality scores
         │
         │ [Transformation]
         ↓
┌─────────────────┐
│ JSON-LD Output  │  ← transform_to_ric.py
│ (RiC-compliant) │     • Add @context
└────────┬────────┘     • Map to RiC ontology
         │              • Generate statistics
         │
         │ [Embedding]
         ↓
┌─────────────────┐
│ HTML Catalog    │  ← generate_catalog.py
│ (embedded data) │     • Inject JSON into HTML
└────────┬────────┘     • Minify output
         │
         │ [Deployment]
         ↓
┌─────────────────┐
│ GitHub Pages    │  ← Git push triggers deploy
│ (live website)  │
└─────────────────┘
```

---

## Scripts

### 1. `sheets_sync.py`
**Purpose:** Fetch data from Google Sheets via API
**Input:** Google Sheets ID, Service Account credentials
**Output:** `data/raw_sheets_export.json`

**Key Functions:**
```python
def fetch_sheet_data(sheet_id, range_name='M3GIM_Archive_Data!A:Q'):
    """Fetch all rows from Google Sheet"""

def validate_credentials():
    """Check if service account has access"""

def convert_to_json(sheet_values):
    """Transform sheet rows to JSON records"""
```

**Configuration:**
- Sheet ID: Stored in GitHub Secret `GOOGLE_SHEET_ID`
- Credentials: Stored in GitHub Secret `GOOGLE_SHEETS_CREDENTIALS`
- API Scopes: `https://www.googleapis.com/auth/spreadsheets.readonly`

**Error Handling:**
- If API call fails → retry 3 times with exponential backoff
- If credentials invalid → send email alert to admin
- If sheet not found → use last successful export as fallback

---

### 2. `validate_schema.py`
**Purpose:** Validate data against M³GIM schema
**Input:** `data/raw_sheets_export.json`, `data/schema.json`
**Output:** Validation report (console), exit code (0=success, 1=error)

**Key Functions:**
```python
def validate_required_fields(record):
    """Check: archivsignatur, box_nr, titel, dokumenttyp, sprache, scan_status"""

def validate_controlled_vocabularies(record):
    """Verify values match predefined lists"""

def validate_date_formats(record):
    """Check jahr_von/jahr_bis are integers YYYY format"""

def validate_unique_signatures(records):
    """Ensure no duplicate archivsignatur values"""

def generate_validation_report(errors):
    """Output human-readable error summary"""
```

**Validation Rules:**
- **archivsignatur:** Regex `^UAKUG/NIM_\d{3}$` (e.g., UAKUG/NIM_001)
- **box_nr:** Integer 1-17
- **jahr_von/jahr_bis:** Integer 1900-2025, jahr_bis ≥ jahr_von
- **dokumenttyp:** Must match `data/vocabularies/dokumenttyp.json`
- **sprache:** Must match `data/vocabularies/sprache.json` (comma-separated allowed)
- **scan_status:** Must match `data/vocabularies/scan_status.json`

**Exit Codes:**
- `0` - All records valid
- `1` - Validation errors (pipeline stops, sends alert)
- `2` - Warning (pipeline continues, logs issues)

---

### 3. `process_archive_data.py`
**Purpose:** Clean and normalize data
**Input:** `data/raw_sheets_export.json`
**Output:** `data/archive_data_cleaned.json`, `data/archive_data_cleaned.csv`

**Key Functions:**
```python
def clean_and_enrich_data(df):
    """Main cleaning pipeline"""

def standardize_dates(date_string):
    """Convert free-text dates to structured format
    Examples:
      "1944" → {"jahr_von": 1944, "jahr_bis": 1944}
      "1953-1959" → {"jahr_von": 1953, "jahr_bis": 1959}
      "ohne Datum" → {"jahr_von": null, "jahr_bis": null}
    """

def normalize_languages(lang_string):
    """Convert to list format
    "deutsch, italienisch" → ["deutsch", "italienisch"]
    """

def fill_missing_complete_status(df):
    """Fill empty 'komplett' with 'pending_review'"""

def calculate_quality_score(record):
    """Score = (filled_required_fields / 6) * 100"""

def calculate_priority_score(record):
    """Score = wichtige_fundstellen*3 + has_scan*2 + graz_bezug*1"""
```

**Transformations Applied:**
1. **Date Standardization:** Parse various formats → `jahr_von`/`jahr_bis` integers
2. **Language Normalization:** Split comma-separated → list of values
3. **Whitespace Trimming:** Remove leading/trailing spaces from all text fields
4. **Empty String → Null:** Convert "" to null for consistency
5. **Boolean Conversion:** "ja"/"nein" → true/false for `graz_bezug`
6. **Integer Conversion:** String numbers → integers for `box_nr`, `umfang`

**Data Quality Metrics Added:**
- `quality_score` (0-100): Percentage of required fields filled
- `priority_score` (0-6): Research priority based on content flags
- `has_filename` (boolean): Whether digitized scan exists
- `content_length` (integer): Character count of `enthaelt` field
- `needs_processing` (boolean): Whether further work required

---

### 4. `enrich_entities.py`
**Purpose:** Extract and link persons and places
**Input:** `data/archive_data_cleaned.json`
**Output:** `data/archive_data_enriched.json`

**Key Functions:**
```python
def extract_persons(record):
    """Parse person names from notes, correspondence, titel
    Returns: [{"name": str, "rolle": str, "gnd_id": str}]
    """

def extract_places(record):
    """Parse place names from notes, orte field
    Returns: [{"ort": str, "land": str, "lat": float, "lon": float, "geonames_id": str}]
    """

def link_to_gnd(person_name):
    """Query GND API for authority ID
    https://lobid.org/gnd/search?q=name
    """

def link_to_geonames(place_name):
    """Query GeoNames API for coordinates
    http://api.geonames.org/search?q=place_name
    """

def detect_graz_context(record):
    """Heuristics to flag Graz-related records:
    - "Graz" in titel/orte/enthaelt
    - Year 1945-1947 (Graz engagement period)
    - dokumenttyp='vertrag' + mentions Oper Graz
    """
```

**Entity Extraction Strategies:**

**Persons:**
1. Regex patterns: `"Brief an (.+)"`, `"mit (.+) und"`, `"unter (.+) in"`
2. Named Entity Recognition (NER) with spaCy (future enhancement)
3. Manual curation list: `data/entities/known_persons.json`
4. GND API lookup for validation and ID assignment

**Places:**
1. Regex patterns: City names followed by venue keywords (Opernhaus, Theater)
2. GeoNames search API with `featureClass=P` (populated places)
3. Manual curation list: `data/entities/known_places.json` (for historical names)
4. Coordinate geocoding for mapping

**Graz Context Detection:**
```python
def is_graz_related(record):
    graz_keywords = ['graz', 'grazer', 'steiermark', 'styria']
    graz_period = 1945 <= record.jahr_von <= 1947

    # Check multiple fields
    in_title = any(kw in record.titel.lower() for kw in graz_keywords)
    in_places = any(p['ort'].lower() == 'graz' for p in record.orte)
    in_period = graz_period and record.dokumenttyp in ['vertrag', 'programm']

    return in_title or in_places or in_period
```

---

### 5. `transform_to_ric.py`
**Purpose:** Convert to JSON-LD with RiC ontology
**Input:** `data/archive_data_enriched.json`
**Output:** `data/archive_data_enhanced.json` (JSON-LD)

**Key Functions:**
```python
def add_jsonld_context():
    """Generate @context linking to ontologies"""

def transform_record_to_ric(record):
    """Map M³GIM fields to RiC-CM classes/properties"""

def generate_graph_structure(records):
    """Create @graph array with all records"""
```

**RiC Mapping:**

| M³GIM Field | RiC Property | Notes |
|-------------|--------------|-------|
| `archivsignatur` | `rico:identifier` | Unique ID |
| `titel` | `rico:title` | Primary title |
| `jahr_von` / `jahr_bis` | `rico:hasBeginningDate` / `rico:hasEndDate` | Date range |
| `dokumenttyp` | `rico:hasDocumentaryFormType` | Controlled term |
| `sprache` | `rico:hasLanguage` | ISO 639-2 codes |
| `enthaelt` | `rico:scopeAndContent` | Physical description |
| `umfang` | `rico:hasExtent` | Quantity |
| `box_nr` | `rico:hasCarrierType` | Physical location |
| `personen` | `rico:hasCreator` / `rico:isAssociatedWithPerson` | Agent relations |
| `orte` | `rico:isAssociatedWithPlace` | Place relations |
| `notizen` | `rico:descriptiveNote` | Research notes |
| `datei_url` | `rico:hasInstantiation` | Digital manifestation |

**Example Output:**
```json
{
  "@context": {
    "@vocab": "https://www.ica.org/standards/RiC/ontology#",
    "rico": "https://www.ica.org/standards/RiC/ontology#",
    "schema": "http://schema.org/",
    "m3gim": "https://m3gim.uni-graz.at/ontology#"
  },
  "@graph": [
    {
      "@id": "https://m3gim.uni-graz.at/records/UAKUG_NIM_001",
      "@type": "rico:Record",
      "rico:identifier": "UAKUG/NIM_001",
      "rico:title": "Geschichte einer Karriere",
      "rico:hasBeginningDate": "1991",
      "rico:hasEndDate": "2009",
      "rico:hasDocumentaryFormType": {
        "@id": "https://m3gim.uni-graz.at/vocab/dokumenttyp/autobiografie"
      },
      "rico:hasLanguage": ["de", "uk"],
      "rico:isAssociatedWithPerson": [
        {
          "@type": "rico:Person",
          "schema:name": "Ira Malaniuk",
          "schema:sameAs": "http://d-nb.info/gnd/118576801"
        }
      ],
      "rico:isAssociatedWithPlace": [
        {
          "@type": "rico:Place",
          "schema:name": "Graz",
          "schema:addressCountry": "AT",
          "schema:sameAs": "http://sws.geonames.org/2778067/"
        }
      ],
      "m3gim:grazRelated": true,
      "m3gim:qualityScore": 100.0,
      "m3gim:priorityScore": 3
    }
  ]
}
```

---

### 6. `generate_statistics.py`
**Purpose:** Compute aggregate metrics for dashboard
**Input:** `data/archive_data_enhanced.json`
**Output:** `data/archive_stats_enhanced.json`

**Key Functions:**
```python
def calculate_collection_stats(records):
    """Overall counts and distributions"""

def calculate_temporal_distribution(records):
    """Records by decade"""

def calculate_geographic_distribution(records):
    """Records by place (top 10)"""

def calculate_person_frequency(records):
    """Most-mentioned persons"""

def calculate_completeness_metrics(records):
    """Data quality overview"""
```

**Metrics Generated:**
```json
{
  "total_records": 182,
  "total_boxes": 17,
  "date_range": {"earliest": 1924, "latest": 1998},
  "graz_related_count": 67,
  "avg_quality_score": 92.3,
  "dokumenttyp_distribution": {
    "korrespondenz": 45,
    "programm": 38,
    "fotografie": 32,
    ...
  },
  "top_persons": [
    {"name": "Herbert von Karajan", "count": 12, "gnd_id": "118560239"},
    {"name": "Wieland Wagner", "count": 8, "gnd_id": "118628852"},
    ...
  ],
  "top_places": [
    {"ort": "Wien", "count": 54, "geonames_id": "2761369"},
    {"ort": "Graz", "count": 42, "geonames_id": "2778067"},
    ...
  ],
  "scan_status": {
    "gescannt": 21,
    "in_bearbeitung": 15,
    "ausstehend": 146
  }
}
```

---

### 7. `generate_catalog.py`
**Purpose:** Embed JSON-LD into HTML for offline access
**Input:** `data/archive_data_enhanced.json`, `templates/catalog_template.html`
**Output:** `archive_catalog.html`

**Key Functions:**
```python
def embed_data_in_html(template_file, data_file, output_file):
    """Inject JSON into <script> tag for EMBEDDED_DATA"""

def replace_fetch_with_embedded(html_content):
    """Modify loadData() function to use embedded data instead of fetch()"""

def minify_output(html_content):
    """Remove unnecessary whitespace (optional)"""
```

**Process:**
1. Read `templates/catalog_template.html`
2. Read `data/archive_data_enhanced.json`
3. Insert JSON into template: `const EMBEDDED_DATA = {JSON};`
4. Modify loadData() function to skip fetch:
   ```javascript
   // OLD: const response = await fetch('archive_data_enhanced.json');
   // NEW: const jsonData = EMBEDDED_DATA;
   ```
5. Write to `archive_catalog.html`
6. Output file size and checksum

**Benefits:**
- No CORS issues (works from file://)
- No server required (GitHub Pages can be disabled and site still works)
- Faster loading (no HTTP request)
- Offline-capable by default

---

## GitHub Actions Workflow

**File:** `.github/workflows/sync_data.yml`

```yaml
name: Sync Archive Data and Deploy

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:      # Manual trigger button

jobs:
  sync-and-build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Fetch from Google Sheets
        env:
          GOOGLE_CREDENTIALS: ${{ secrets.GOOGLE_SHEETS_CREDENTIALS }}
          GOOGLE_SHEET_ID: ${{ secrets.GOOGLE_SHEET_ID }}
        run: |
          python processing/sheets_sync.py

      - name: Validate schema
        run: |
          python processing/validate_schema.py
          if [ $? -ne 0 ]; then
            echo "❌ Schema validation failed"
            exit 1
          fi

      - name: Clean and normalize
        run: |
          python processing/process_archive_data.py

      - name: Enrich entities
        run: |
          python processing/enrich_entities.py

      - name: Transform to JSON-LD
        run: |
          python processing/transform_to_ric.py

      - name: Generate statistics
        run: |
          python processing/generate_statistics.py

      - name: Generate catalog HTML
        run: |
          python processing/generate_catalog.py

      - name: Run tests
        run: |
          pytest tests/

      - name: Commit and push
        run: |
          git config user.name "M3GIM Bot"
          git config user.email "bot@m3gim.uni-graz.at"
          git add data/ archive_catalog.html
          git diff --quiet || git commit -m "🤖 Auto-update archive data ($(date +'%Y-%m-%d %H:%M'))"
          git push

      - name: Send notification on failure
        if: failure()
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.gmail.com
          server_port: 465
          username: ${{ secrets.EMAIL_USERNAME }}
          password: ${{ secrets.EMAIL_PASSWORD }}
          to: christopher.pollin@uni-graz.at
          subject: "❌ M3GIM Pipeline Failed"
          body: "The data processing pipeline failed. Check logs at: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

**Triggers:**
- **Scheduled:** Daily at 2 AM UTC (when researchers are asleep)
- **Manual:** "Run workflow" button in GitHub UI
- **Future:** Webhook on Google Sheets edit (requires Apps Script)

**Secrets Configuration:**
```bash
# In GitHub repo settings → Secrets and variables → Actions
GOOGLE_SHEETS_CREDENTIALS  # JSON service account key
GOOGLE_SHEET_ID            # Sheet ID from URL
EMAIL_USERNAME             # For failure notifications
EMAIL_PASSWORD             # App-specific password
```

---

## Error Handling

**Pipeline Failure Scenarios:**

1. **Google Sheets API Error:**
   - Retry 3 times with exponential backoff
   - If still fails → use last successful export (cached)
   - Send email alert to admin

2. **Schema Validation Error:**
   - Stop pipeline immediately (don't deploy bad data)
   - Generate detailed error report (record ID + field + issue)
   - Send notification with fix instructions

3. **Entity Enrichment Failure (GND/GeoNames API down):**
   - Continue pipeline (enrichment is nice-to-have)
   - Mark affected records with `enrichment_status: "failed"`
   - Retry enrichment in next run

4. **Git Push Failure (merge conflict):**
   - Pull latest changes
   - Re-run processing
   - Attempt push again
   - If still fails → manual intervention required (alert)

**Logging:**
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('processing/pipeline.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Usage in scripts
logger.info(f"Processing record {record['archivsignatur']}")
logger.warning(f"Missing GND ID for person: {person_name}")
logger.error(f"Schema validation failed: {error_message}")
```

---

## Testing

**Unit Tests:** `tests/test_processing.py`

```python
import pytest
from processing.process_archive_data import standardize_dates, normalize_languages

def test_date_standardization():
    assert standardize_dates("1944") == {"jahr_von": 1944, "jahr_bis": 1944}
    assert standardize_dates("1953-1959") == {"jahr_von": 1953, "jahr_bis": 1959}
    assert standardize_dates("ohne Datum") == {"jahr_von": None, "jahr_bis": None}

def test_language_normalization():
    assert normalize_languages("deutsch") == ["deutsch"]
    assert normalize_languages("deutsch, italienisch") == ["deutsch", "italienisch"]
    assert normalize_languages("") == []

def test_quality_score_calculation():
    from processing.process_archive_data import calculate_quality_score
    record = {
        "archivsignatur": "UAKUG/NIM_001",
        "box_nr": 1,
        "titel": "Test",
        "dokumenttyp": "autobiografie",
        "sprache": "deutsch",
        "scan_status": "gescannt"
    }
    assert calculate_quality_score(record) == 100.0

def test_graz_detection():
    from processing.enrich_entities import detect_graz_context
    record = {"titel": "Auftritt in Graz", "orte": [], "jahr_von": 1946}
    assert detect_graz_context(record) == True
```

**Integration Test:** `tests/test_pipeline.py`

```python
def test_full_pipeline():
    """Run entire pipeline on test dataset"""
    # 1. Load test data
    test_data = load_fixture('test_data.json')

    # 2. Process
    cleaned = process_archive_data.clean_and_enrich_data(test_data)

    # 3. Validate
    validation_result = validate_schema.validate_jsonld(cleaned, 'schema.json')
    assert validation_result == True

    # 4. Check output
    assert len(cleaned) == len(test_data)
    assert all('quality_score' in record for record in cleaned)
```

**Run Tests:**
```bash
pytest tests/ -v                # Run all tests
pytest tests/ --cov=processing  # With coverage report
pytest tests/ -k test_date      # Run specific test
```

---

## Performance Metrics

**Current Performance (182 records):**
- Google Sheets fetch: ~2 seconds
- Schema validation: ~0.5 seconds
- Data cleaning: ~1 second
- Entity enrichment: ~15 seconds (GND/GeoNames API calls)
- JSON-LD transformation: ~0.5 seconds
- Statistics generation: ~0.3 seconds
- HTML generation: ~0.2 seconds
- **Total pipeline time:** ~20 seconds

**Scalability Targets:**
- 500 records: < 60 seconds
- 1000 records: < 2 minutes
- 5000 records: < 10 minutes

**Optimization Strategies:**
- Cache GND/GeoNames API responses (TTL: 30 days)
- Incremental processing (only changed records)
- Parallel API calls (asyncio)
- Database indexing (if switching to SQLite backend)

---

## Monitoring Dashboard (Future)

**Metrics to Track:**
- Pipeline success rate (%)
- Average execution time (seconds)
- Data quality score trend (over time)
- Number of enriched entities (persons/places)
- API error rate (GND/GeoNames)
- GitHub Pages deploy time

**Tools:**
- GitHub Actions dashboard (built-in)
- Grafana + Prometheus (if self-hosting monitoring)
- Simple status page (HTML) generated by pipeline

---

## Maintenance

**Weekly Tasks:**
- Review pipeline logs for warnings
- Check data quality dashboard for degradation
- Verify API keys haven't expired

**Monthly Tasks:**
- Update Python dependencies (`pip list --outdated`)
- Review entity extraction accuracy (sample 10 records)
- Backup data to Zenodo

**Quarterly Tasks:**
- Full pipeline performance audit
- Security review (dependency vulnerabilities)
- User feedback integration

---

## Troubleshooting

**Common Issues:**

**"Google Sheets API quota exceeded"**
```
Solution: Reduce sync frequency OR request quota increase
Workaround: Manual export to Excel, process locally
```

**"Schema validation fails after Sheets update"**
```
Cause: Someone edited outside controlled vocabularies
Solution: Check validation error log, fix in Sheets
Prevention: Protect sheet with data validation rules
```

**"Entity enrichment takes too long"**
```
Cause: Too many API calls to GND/GeoNames
Solution: Implement caching layer (Redis or local JSON)
Alternative: Pre-compute entities, store in reference file
```

**"Git merge conflicts on auto-commit"**
```
Cause: Manual edits to data files while pipeline running
Solution: Only edit via Sheets, never directly in GitHub
Recovery: git reset --hard origin/main && re-run pipeline
```

---

## Contact

**Technical Issues:** Open issue at https://github.com/chpollin/malaniuk/issues
**Data Questions:** Email project team (see README.md)
**Pipeline Alerts:** Automatically sent to technical lead
