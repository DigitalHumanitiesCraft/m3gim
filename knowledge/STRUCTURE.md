# M³GIM Project Structure

This document explains the folder organization and file naming conventions for the M³GIM (Mapping Mobile Musicians) project.

---

## 📁 Folder Structure Overview

```
m3gim/
├── 📂 .claude/                 # Claude Code IDE configuration
├── 📂 .github/                 # GitHub-specific files
│   └── workflows/              # GitHub Actions CI/CD
│       └── sync_data.yml       # Automated data pipeline
├── 📂 archive_development/     # Legacy prototype files (Phase 0)
│   ├── archive_catalog_*.html  # Old catalog versions
│   ├── *.py                    # Old processing scripts
│   └── IMPROVEMENTS.md         # Prototype change log
├── 📂 data/                    # Data files (versioned in Git)
│   ├── archive_data.json       # Original data export (backup)
│   ├── archive_data_enhanced.json # Processed JSON-LD (embedded in HTML)
│   ├── archive_stats_enhanced.json # Pre-computed statistics
│   ├── schema.jsonld           # JSON-LD schema definition
│   └── vocabularies/           # Controlled vocabularies (JSON)
│       ├── dokumenttyp.json    # Document type taxonomy
│       ├── sprache.json        # Language codes
│       ├── scan_status.json    # Digitization status
│       └── bearbeitungsstatus.json # Processing workflow states
├── 📂 docs/                    # Project documentation
│   ├── INDEX.md                # Documentation index (START HERE)
│   ├── research.md             # Research context & questions
│   ├── data.md                 # Data model specification
│   ├── requirements.md         # User stories & feature requirements
│   └── architecture.md         # Technical architecture
├── 📂 knowledge/               # Research knowledge base (notes, drafts)
├── 📂 preprocessing/           # Data processing pipeline
│   ├── README.md               # Pipeline documentation
│   ├── sheets_sync.py          # Google Sheets API sync
│   ├── validate_schema.py      # JSON Schema validation
│   ├── process_archive_data.py # Data cleaning & normalization
│   ├── enrich_entities.py      # Person/place extraction & linking
│   ├── transform_to_ric.py     # JSON-LD transformation (RiC ontology)
│   ├── generate_statistics.py  # Aggregate metrics computation
│   └── generate_catalog.py     # HTML generation with embedded data
├── 📂 scripts/                 # Utility scripts (non-pipeline)
│   ├── backup_to_zenodo.py     # Archival backup script
│   └── check_links.py          # Broken link checker
├── 📂 templates/               # HTML templates
│   └── catalog_template.html   # Base template for catalog page
├── 📂 tests/                   # Automated tests
│   ├── test_processing.py      # Unit tests for data processing
│   ├── test_pipeline.py        # Integration tests for full pipeline
│   └── fixtures/               # Test data files
├── 📄 .gitignore               # Git ignore rules
├── 📄 archive_catalog.html     # Published catalog (embedded data)
├── 📄 CLAUDE.md                # Claude Code assistant notes
├── 📄 IMPLEMENTATION_PLAN.md   # Development roadmap & timeline
├── 📄 LICENSE                  # Software license (MIT)
├── 📄 README.md                # Project overview (user-facing, GitHub homepage)
├── 📄 requirements.txt         # Python dependencies (pip)
├── 📄 STRUCTURE.md             # This file (folder organization)
└── 📄 VAULT_ANALYSIS.md        # Project analysis & decisions
```

---

## 🎯 Folder Purposes

### `.claude/`
**Purpose:** Claude Code IDE settings and configuration
**Who touches:** Developers using Claude Code editor
**Contents:**
- `settings.local.json` - Bash permissions, IDE preferences

**Git Status:** ❌ Not tracked (in .gitignore)

---

### `.github/workflows/`
**Purpose:** GitHub Actions automation (CI/CD pipelines)
**Who touches:** DevOps, technical lead
**Contents:**
- `sync_data.yml` - Daily data sync from Google Sheets → JSON-LD → GitHub Pages

**Key Features:**
- Runs daily at 2 AM UTC
- Manual trigger via "Run workflow" button
- Sends email alerts on failure

**Git Status:** ✅ Tracked (critical infrastructure)

---

### `archive_development/`
**Purpose:** Archive old prototype files (Phase 0, pre-M³GIM)
**Who touches:** No one (historical reference only)
**Contents:**
- Old HTML catalog versions (before embedded data)
- Legacy Python scripts (before pipeline refactor)
- Old documentation (IMPROVEMENTS.md, web_display_plan.md)

**Git Status:** ✅ Tracked (for historical reference)
**Action:** Do not modify. Use for reference when migrating features.

---

### `data/`
**Purpose:** Structured data files (JSON, JSON-LD, CSV)
**Who touches:**
- **Automated:** GitHub Actions writes processed files here
- **Manual:** Developers can add controlled vocabularies

**File Types:**

| File | Format | Source | Purpose |
|------|--------|--------|---------|
| `archive_data.json` | JSON | Google Sheets export | Backup of original data |
| `archive_data_enhanced.json` | JSON-LD | Processing pipeline | Published data (embedded in HTML) |
| `archive_stats_enhanced.json` | JSON | Statistics generator | Dashboard metrics |
| `schema.jsonld` | JSON-LD | Manual | Schema definition for validation |
| `vocabularies/*.json` | JSON | Manual | Controlled vocabulary lists |

**Git Status:** ✅ Tracked (data is code in this project)

**Subfolders:**
- `vocabularies/` - Controlled vocabularies (manually curated)

---

### `docs/`
**Purpose:** Human-readable project documentation
**Who touches:** All team members (collaborative documentation)

**Documents:**

| File | Audience | Purpose |
|------|----------|---------|
| `INDEX.md` | Everyone | Documentation index (start here) |
| `research.md` | Researchers | Research context, questions, methodology |
| `data.md` | Developers & Researchers | Data model, fields, query examples |
| `requirements.md` | Product Team | User stories, features, epics |
| `architecture.md` | Developers | Technical design, stack, deployment |

**Git Status:** ✅ Tracked (living documentation)

---

### `knowledge/`
**Purpose:** Unstructured knowledge base (research notes, drafts, brainstorming)
**Who touches:** Researchers, project lead
**Contents:**
- Literature reviews
- Meeting notes
- Draft texts for publications
- Research hypotheses
- Interview transcripts

**Git Status:** ⚠️ Optional (sensitive/private content may be excluded via .gitignore)

---

### `preprocessing/`
**Purpose:** Data processing pipeline (ETL: Extract, Transform, Load)
**Who touches:** Developers, data engineers

**Scripts (Execution Order):**

1. **`sheets_sync.py`** - Fetch data from Google Sheets
2. **`validate_schema.py`** - Validate against M³GIM schema
3. **`process_archive_data.py`** - Clean & normalize
4. **`enrich_entities.py`** - Extract persons/places, link to GND/GeoNames
5. **`transform_to_ric.py`** - Convert to JSON-LD (RiC ontology)
6. **`generate_statistics.py`** - Compute dashboard metrics
7. **`generate_catalog.py`** - Embed data in HTML

**Documentation:** `README.md` in this folder (detailed pipeline guide)

**Git Status:** ✅ Tracked (critical infrastructure)

---

### `scripts/`
**Purpose:** Utility scripts (NOT part of main pipeline)
**Who touches:** Developers, sysadmins
**Examples:**
- `backup_to_zenodo.py` - Archive releases to Zenodo (DOI)
- `check_links.py` - Find broken links in HTML/docs
- `migrate_data.py` - One-time data migrations

**Git Status:** ✅ Tracked

---

### `templates/`
**Purpose:** HTML templates for catalog generation
**Who touches:** Frontend developers
**Contents:**
- `catalog_template.html` - Base HTML structure (before data embedding)

**Git Status:** ✅ Tracked

---

### `tests/`
**Purpose:** Automated testing (unit tests, integration tests)
**Who touches:** Developers
**Contents:**
- `test_processing.py` - Unit tests for data processing functions
- `test_pipeline.py` - Integration tests for full pipeline
- `fixtures/` - Test data files

**Run Tests:**
```bash
pytest tests/ -v                # All tests
pytest tests/ --cov=preprocessing  # With coverage
```

**Git Status:** ✅ Tracked

---

## 📄 Root-Level Files

### Configuration Files

**`.gitignore`**
- Purpose: Exclude files from version control
- Contents:
  ```
  # Python
  __pycache__/
  *.pyc
  venv/
  .env

  # Data (exclude if too large or sensitive)
  data/*.xlsx
  data/*.csv

  # IDE
  .vscode/
  .idea/
  .claude/

  # OS
  .DS_Store
  Thumbs.db
  ```

**`requirements.txt`**
- Purpose: Python dependencies (for `pip install -r requirements.txt`)
- Contents:
  ```
  pandas==2.0.3
  google-auth==2.22.0
  google-api-python-client==2.95.0
  jsonschema==4.19.0
  pytest==7.4.0
  ```

**`LICENSE`**
- Purpose: Software license (MIT for code, CC BY 4.0 for data)

---

### Documentation Files (Root)

**`README.md`**
- **Audience:** Everyone (first impression on GitHub)
- **Purpose:** Project overview, quick start, links to docs
- **Length:** 2-3 screens (~100 lines)
- **Contents:**
  - Project description (1-2 paragraphs)
  - Features list
  - Installation instructions
  - Usage examples
  - Link to live catalog
  - Citation format
  - Contact information

**`CLAUDE.md`** (4 KB)
- **Audience:** Developers using Claude Code assistant
- **Purpose:** Notes for AI-assisted development
- **Contents:** Context for Claude, common tasks, code patterns

**`IMPLEMENTATION_PLAN.md`** (20 KB)
- **Audience:** Project team
- **Purpose:** Development roadmap, milestones, timeline
- **Contents:**
  - Phase 1 tasks (2026)
  - Phase 2 tasks (FWF proposal)
  - Gantt chart (text-based)
  - Resource allocation

**`VAULT_ANALYSIS.md`** (35 KB)
- **Audience:** Technical lead, researchers
- **Purpose:** Deep analysis of project decisions, trade-offs
- **Contents:**
  - Technology choices (why GitHub Pages vs GAMS?)
  - Data model rationale
  - Research methodology justification
  - Risk assessment

**`STRUCTURE.md`** (This file)
- **Audience:** New developers, collaborators
- **Purpose:** Explain folder organization
- **Contents:** You're reading it!

---

### Output Files (Root)

**`archive_catalog.html`**
- **Purpose:** Published web catalog (GitHub Pages serves this)
- **Source:** Generated by `preprocessing/generate_catalog.py`
- **Size:** ~1.5 MB (includes embedded JSON-LD data)
- **Access:** https://chpollin.github.io/malaniuk/archive_catalog.html
- **Git Status:** ✅ Tracked (this is the deliverable)

---

## 🔄 Workflow: Where Files Go

### Data Entry Workflow
```
Researcher enters data in Google Sheets
    ↓
GitHub Actions (daily 2 AM UTC)
    ↓
preprocessing/sheets_sync.py
    ↓
data/raw_sheets_export.json (temporary)
    ↓
preprocessing/validate_schema.py
    ↓
preprocessing/process_archive_data.py
    ↓
data/archive_data_enhanced.json
    ↓
preprocessing/generate_catalog.py
    ↓
archive_catalog.html (root)
    ↓
Git commit & push
    ↓
GitHub Pages deploys
    ↓
Live at https://chpollin.github.io/malaniuk/
```

### Documentation Update Workflow
```
Developer edits docs/*.md
    ↓
Git commit & push
    ↓
GitHub renders markdown
    ↓
Documentation updated (instant)
```

### Code Development Workflow
```
Developer clones repo
    ↓
Creates feature branch (git checkout -b feature/new-viz)
    ↓
Edits files in:
  - preprocessing/ (if changing pipeline)
  - templates/ (if changing HTML)
  - tests/ (adds tests)
    ↓
Runs tests (pytest tests/)
    ↓
Commits changes
    ↓
Pushes to GitHub
    ↓
Opens Pull Request
    ↓
Code review → merge to main
    ↓
GitHub Actions runs (auto-deploys)
```

---

## 🚫 What NOT to Track in Git

**Add to `.gitignore`:**

```gitignore
# Large data files (use Git LFS or external storage)
*.xlsx
*.pdf
*.zip

# Sensitive credentials
.env
secrets.json
credentials.json

# Python cache
__pycache__/
*.pyc
*.pyo
.pytest_cache/

# Virtual environments
venv/
env/
.venv/

# IDE settings (personal preferences)
.vscode/
.idea/
.claude/

# OS files
.DS_Store
Thumbs.db
desktop.ini

# Temporary files
*.tmp
*.bak
*~

# Build artifacts
dist/
build/
*.egg-info/

# Logs
*.log
logs/
```

**Why exclude these?**
- **Large files:** Git is slow with >50MB files → use Git LFS
- **Credentials:** Security risk if pushed to public repo
- **Generated files:** Can be recreated by running scripts
- **Personal settings:** Each developer has their own IDE preferences

---

## 📐 Naming Conventions

### Folders
- **Lowercase, underscores:** `preprocessing/`, `archive_development/`
- **Descriptive:** `data/vocabularies/` (not `data/vocabs/`)
- **Plural for collections:** `scripts/`, `tests/`, `templates/`

### Files

**Python Scripts:**
- **Lowercase, underscores:** `sheets_sync.py`, `validate_schema.py`
- **Verb_noun format:** `generate_catalog.py`, `enrich_entities.py`

**Markdown Docs:**
- **Uppercase for root:** `README.md`, `LICENSE`, `IMPLEMENTATION_PLAN.md`
- **Lowercase for docs/:** `research.md`, `data.md`, `requirements.md`
- **Descriptive:** `INDEX.md` (not `index.md` to avoid confusion with web index.html)

**Data Files:**
- **Lowercase, underscores:** `archive_data.json`, `archive_stats_enhanced.json`
- **Descriptive suffixes:** `_enhanced.json` (processed), `_raw.json` (original)

**HTML Files:**
- **Lowercase, underscores:** `archive_catalog.html`
- **Template suffix:** `catalog_template.html`

---

## 🔗 Cross-References

**Documentation Links:**
- Root README.md → docs/INDEX.md
- docs/INDEX.md → All other docs
- docs/*.md → Cross-link to each other (e.g., requirements.md references research.md)

**Code Comments:**
```python
# See docs/data.md for field definitions
# See preprocessing/README.md for pipeline overview
```

**GitHub Issues:**
- Reference docs: "See `docs/requirements.md#epic-2` for feature details"

---

## 📅 Maintenance

**Weekly:**
- Check for broken links: `python scripts/check_links.py`
- Review new files: Are they in the right folder?

**Monthly:**
- Update STRUCTURE.md if folders added/removed
- Review .gitignore: Are we excluding the right files?

**Quarterly:**
- Archive old files: Move obsolete code to `archive_development/`
- Clean up root: Move loose files to appropriate folders

---

## 🆘 Troubleshooting

**"Where do I put this file?"**

| File Type | Where It Goes | Example |
|-----------|---------------|---------|
| Python script (pipeline) | `preprocessing/` | `new_validator.py` |
| Python script (utility) | `scripts/` | `backup_data.py` |
| Documentation | `docs/` | `api_reference.md` |
| Test file | `tests/` | `test_new_feature.py` |
| HTML template | `templates/` | `search_page_template.html` |
| JSON data | `data/` | `archive_data.json` |
| Controlled vocabulary | `data/vocabularies/` | `new_vocab.json` |
| Research notes | `knowledge/` | `literature_review.md` |
| Old/obsolete code | `archive_development/` | `old_script.py` |

**"Should this be in Git?"**

| File | Track in Git? | Reason |
|------|---------------|--------|
| `*.py` | ✅ Yes | Code must be versioned |
| `*.md` | ✅ Yes | Documentation must be versioned |
| `*.json` (data) | ✅ Yes | Data is small, structured, central to project |
| `*.xlsx` | ❌ No | Binary, large, external system (Google Sheets) is source of truth |
| `*.pdf` (scans) | ❌ No | Too large, host externally |
| `.env` | ❌ No | Contains secrets |
| `venv/` | ❌ No | Generated (use `requirements.txt` instead) |
| `__pycache__/` | ❌ No | Generated by Python |

**"I can't find a file!"**

1. Check if it's in `.gitignore` (shouldn't be tracked)
2. Check `archive_development/` (might be old version)
3. Search entire repo: `git ls-files | grep filename`
4. Check if it's generated: Run pipeline scripts
5. Ask team: File might be on Google Drive, not in Git

---

## 🔮 Future Structure (Phase 2)

**Potential additions:**

```
m3gim/
├── api/                        # SPARQL endpoint (if implemented)
│   ├── server.py               # Flask/FastAPI server
│   └── queries/                # Example SPARQL queries
├── visualizations/             # Standalone viz tools
│   ├── network_explorer/
│   ├── map_viewer/
│   └── timeline_tool/
├── notebooks/                  # Jupyter notebooks for data analysis
├── docker/                     # Docker configuration (if needed)
└── deployment/                 # Deployment scripts (if moving off GitHub Pages)
```

---

## 📞 Questions?

**For clarification on structure:**
- Check `docs/INDEX.md` for documentation overview
- Check `docs/architecture.md` for technical details
- Check `preprocessing/README.md` for pipeline details
- Open GitHub issue if still unclear

---

**Last Updated:** 2025-10-23
**Maintained By:** M³GIM Project Team
