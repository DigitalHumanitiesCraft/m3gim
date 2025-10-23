# M³GIM Documentation Index

Central hub for M³GIM (Mapping Mobile Musicians) project documentation.

---

## 📋 Core Documentation

| Document | Audience | Purpose |
|----------|----------|---------|
| [README.md](../README.md) | Everyone | Project overview, quick start |
| [research.md](research.md) | Researchers | Research questions & methodology |
| [data.md](data.md) | Developers & Researchers | Data model, queries, transformations |
| [requirements.md](requirements.md) | Product Team | User stories & epics (8 major features) |
| [architecture.md](architecture.md) | Developers | Technical stack & implementation |
| [preprocessing/README.md](../preprocessing/README.md) | Developers | Data pipeline (7 scripts) |

---

## 🎯 Quick Links by Role

### Researchers
- [Research Questions](research.md#research-questions) - RQ1-RQ4 about mobility, knowledge transfer
- [Query Data](data.md#data-access--querying) - 10+ JavaScript examples
- [Export Options](requirements.md#epic-3-data-export--interoperability) - CSV/JSON/JSON-LD
- [Cite Project](../README.md#citation) - Citation formats

### Developers
- [Tech Stack](architecture.md#technology-stack) - HTML/JS/Python/GitHub Pages
- [Setup Guide](architecture.md#development-workflow) - Install & run locally
- [Data Pipeline](../preprocessing/README.md#pipeline-overview) - Google Sheets → JSON-LD → Web
- [Component Architecture](architecture.md#component-architecture) - Code examples

### Data Contributors
- [Field Definitions](data.md#core-fields-17-required-fields) - 17 standardized fields
- [Controlled Vocabularies](data.md#controlled-vocabularies) - Valid values
- [Data Entry] Google Sheets template (TBD)
- [Quality Check](../preprocessing/README.md#validation) - Validation rules

### Project Managers
- [Epics & Stories](requirements.md#epic-1-data-discovery--search) - 30+ user stories
- [Priorities](requirements.md#prioritization-moscow) - MUST/SHOULD/COULD/WON'T
- [Success Metrics](requirements.md#success-metrics) - How we measure success
- [Timeline](research.md#expected-outcomes) - Phase 1 (2026), Phase 2 (FWF)

---

## 📚 Document Summaries

**[research.md](research.md)** (4.6 KB) - Research context
- Project: M³GIM, KUG Graz, 2026-2027
- Subject: Ira Malaniuk (1919-2009), Ukrainian-Austrian mezzo-soprano
- 4 Research Questions: urban culture, genre transformation, knowledge transfer, mobility forms
- Hypothesis: Mobility as catalyst for new knowledge cultures in postwar opera

**[data.md](data.md)** (9.7 KB) - Data model
- 182 archival records (UAKUG/NIM)
- 17 core fields with validation rules
- 4 controlled vocabularies (dokumenttyp, sprache, scan_status, bearbeitungsstatus)
- JSON-LD structure (RiC-compliant)
- 10+ JavaScript query examples

**[requirements.md](requirements.md)** (17 KB) - Features & user stories
- 8 Major Epics: Search, Visualization, Export, Archival Detail, Collaboration, Accessibility, Performance, Administration
- 30+ User stories mapped to research questions
- MoSCoW prioritization
- Success metrics (quantitative & qualitative)

**[architecture.md](architecture.md)** (27 KB) - Technical design
- Stack: HTML5/CSS3/JS + Python 3.11+ + GitHub Pages
- Design: Offline-first, embedded data, no server dependencies
- Components: Frontend modules, backend scripts (with code examples)
- Workflows: Data flow diagrams, deployment pipeline

**[preprocessing/README.md](../preprocessing/README.md)** (23 KB) - Data pipeline
- 7 Script Pipeline: sheets_sync → validate → process → enrich → transform → stats → generate
- GitHub Actions workflow (automated daily sync)
- Testing guide (unit + integration tests)
- Performance: ~20s for 182 records

---

## 🗂️ Repository Structure

```
m3gim/
├── docs/                    # GitHub Pages (public catalog)
│   ├── index.html           # Interactive web catalog (249KB, embedded data)
│   └── assets/styles.css    # Custom CSS
├── knowledge/               # Documentation (YOU ARE HERE)
│   ├── INDEX.md             # This file
│   ├── research.md          # Research context
│   ├── data.md              # Data model
│   ├── requirements.md      # User stories
│   └── architecture.md      # Technical design
├── preprocessing/           # Data pipeline
│   ├── README.md            # Pipeline docs
│   ├── archive_data.json    # Original data (174KB)
│   ├── archive_data_enhanced.json  # Processed (246KB)
│   └── *.py                 # Processing scripts (6 files)
├── data/vocabularies/       # Controlled vocabularies (4 JSON files, future)
├── scripts/                 # Utility scripts
├── templates/               # HTML templates
├── tests/                   # Test files
└── README.md                # Project homepage
```

---

## 🚀 Quick Start

**Researchers:** Visit [catalog](https://chpollin.github.io/malaniuk/) → Search → Export

**Developers:**
```bash
git clone https://github.com/chpollin/malaniuk.git
pip install -r requirements.txt
python -m http.server 8000  # Open http://localhost:8000/docs/
```

**Data Entry:** Google Sheets → Fill 17 fields → Auto-syncs daily at 2 AM UTC

---

## 📖 External Resources

- [RiC Ontology](https://www.ica.org/standards/RiC/ontology) - Archival standard
- [JSON-LD Spec](https://www.w3.org/TR/json-ld11/) - Linked data format
- [GND](https://www.dnb.de/EN/gnd) - Authority control
- [GeoNames](http://www.geonames.org/) - Geographic data
- [GAMS](https://gams.uni-graz.at/) - Uni Graz digital asset system

**Related Projects:** [OperaBase](https://www.operabase.com/), [RISM](https://rism.info/), [Performing Arts CH](https://www.performingarts.ch/)

---

## 🤝 Contributing

- **Data:** Correct errors via Google Sheets
- **Code:** Submit PRs to [GitHub](https://github.com/chpollin/malaniuk)
- **Docs:** Improve clarity, fix typos
- **Research:** Share findings, suggest new RQs

---

## 📞 Contact

**Project Lead:** Univ.-Prof.in Dr.in Nicole K. Strohmann (KUG Graz)
**Technical Lead:** Dr. Christopher Pollin (Digital Humanities Craft OG)
**Issues:** https://github.com/chpollin/malaniuk/issues

---

## 📄 License

Code: MIT | Data & Docs: CC BY 4.0 | See [LICENSE](../LICENSE)

---

**Last Updated:** 2025-10-23 | [↑ Top](#m³gim-documentation-index) | [← README](../README.md)
