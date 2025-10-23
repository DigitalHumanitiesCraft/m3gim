# M³GIM Documentation Index

Welcome to the Mapping Mobile Musicians (M³GIM) documentation. This index guides you through all project documentation organized by audience and purpose.

---

## 📋 Quick Navigation

| Document | Audience | Purpose | Location |
|----------|----------|---------|----------|
| **[README.md](../README.md)** | Everyone | Project overview, quick start | Root |
| **[research.md](research.md)** | Researchers | Research context, questions, methodology | knowledge/ |
| **[data.md](data.md)** | Developers & Researchers | Data model, fields, transformations, queries | knowledge/ |
| **[requirements.md](requirements.md)** | Product Team | User stories, epics, features | knowledge/ |
| **[architecture.md](architecture.md)** | Developers | Technical implementation, stack | knowledge/ |
| **[preprocessing/README.md](../preprocessing/README.md)** | Developers | Data pipeline documentation | preprocessing/ |

---

## 🎯 Documentation by Audience

### For Researchers & Scholars

**Start here if you want to:**
- Understand the research questions → [research.md](research.md)
- Query the archive data → [data.md](data.md#data-access--querying)
- Export data for analysis → [requirements.md](requirements.md#epic-3-data-export--interoperability)
- Cite the project → [README.md](../README.md#citation)

**Key Sections:**
1. [Research Questions](research.md#research-questions) - Four main RQs about mobility, networks, knowledge transfer
2. [Data Model Overview](data.md#overview) - What's in the archive (182 records, 17 fields)
3. [Query Examples](data.md#data-access--querying) - How to filter by person, place, date, Graz context
4. [Visualization Features](requirements.md#epic-2-contextual-data-visualization) - Network graphs, maps, timelines

### For Developers & Implementers

**Start here if you want to:**
- Set up the development environment → [architecture.md](architecture.md#development-workflow)
- Understand the tech stack → [architecture.md](architecture.md#technology-stack)
- Modify the data pipeline → [preprocessing/README.md](../preprocessing/README.md)
- Deploy the website → [architecture.md](architecture.md#hosting--deployment)

**Key Sections:**
1. [System Architecture](architecture.md#system-architecture-overview) - Three-tier design (data/processing/presentation)
2. [Component Architecture](architecture.md#component-architecture) - Frontend modules, backend scripts
3. [Pipeline Overview](preprocessing/README.md#pipeline-overview) - Google Sheets → GitHub Actions → JSON-LD → Web
4. [Testing Guide](preprocessing/README.md#testing) - Unit tests, integration tests, CI/CD

### For Project Managers & Stakeholders

**Start here if you want to:**
- Review feature requirements → [requirements.md](requirements.md)
- Understand priorities → [requirements.md](requirements.md#prioritization-moscow)
- Track progress → GitHub Issues (link TBD)

**Key Sections:**
1. [Epics & User Stories](requirements.md#epic-1-data-discovery--search) - 8 major feature areas
2. [Success Metrics](requirements.md#success-metrics) - How we measure project success
3. [Timeline & Phases](research.md#expected-outcomes) - Phase 1 (2026), Phase 2 (FWF proposal)
4. [Out of Scope](requirements.md#out-of-scope-future-considerations) - What we're NOT building

### For Data Contributors

**Start here if you want to:**
- Enter archival data → Google Sheets Template (link TBD)
- Understand field definitions → [data.md](data.md#core-fields-17-required-fields)
- Follow data entry guidelines → [Data Entry Manual](data_entry_guidelines.md) (TODO)
- Check data quality → [preprocessing/README.md](../preprocessing/README.md#validation)

---

## 📚 Document Summaries

### [research.md](research.md) (4 KB)
**Compact research context**
- Project identity (M³GIM, KUG Graz, 2026-2027)
- Research object (Ira Malaniuk, 1919-2009)
- Four research questions (urban culture, genre transformation, knowledge transfer, mobility forms)
- Central hypothesis (mobility as catalyst for knowledge cultures)
- Methodology (actor-centered, digital humanities)
- Expected outcomes (Phase 1 prototype, Phase 2 FWF proposal)

### [data.md](data.md) (12 KB)
**Comprehensive data model documentation**
- Source material (182 records, UAKUG/NIM)
- M³GIM standard (17 core fields with validation rules)
- Controlled vocabularies (dokumenttyp, sprache, scan_status, bearbeitungsstatus)
- Data transformations (input → processing → output)
- JSON-LD structure (RiC-compliant)
- Query examples (JavaScript code for filtering, searching, network analysis)
- Migration notes (prototype → M³GIM)

### [requirements.md](requirements.md) (18 KB)
**Feature requirements organized as epics and user stories**

**8 Major Epics:**
1. Data Discovery & Search (search, filters, Graz-specific view)
2. Contextual Data Visualization (network graphs, maps, timelines, statistics)
3. Data Export & Interoperability (CSV/JSON/JSON-LD/BibTeX, citations, LOD)
4. Archival Detail & Provenance (comprehensive records, digital access, related items)
5. Collaborative Research (annotations, crowdsourcing) [Phase 2]
6. Mobile & Accessibility (responsive design, WCAG 2.1 AA)
7. Performance & Offline Access (embedded data, fast loading)
8. Data Administration (Google Sheets, automated pipeline, quality monitoring)

**Includes:**
- User stories with acceptance criteria
- Research question mapping (every feature → RQ1-RQ4)
- MoSCoW prioritization
- Success metrics (quantitative & qualitative)

### [architecture.md](architecture.md) (20 KB)
**Technical implementation blueprint**

**Design Principles:**
- Simplicity first (minimal dependencies)
- Offline capability (embedded data)
- Sustainability (static site, GitHub Pages)
- Open standards (JSON-LD, RiC)
- Progressive enhancement (works without JS)

**Key Sections:**
- System architecture diagram (user → presentation → processing → data layers)
- Technology stack (HTML/CSS/JS, Python 3.11+, GitHub Pages)
- Component architecture (frontend modules, backend scripts with code examples)
- Data flow diagrams (entry, processing, user access)
- Security considerations
- Performance optimization
- Development workflow (setup, testing, deployment)

### [preprocessing/README.md](preprocessing/README.md) (15 KB)
**Data pipeline detailed documentation**

**Pipeline Stages:**
1. `sheets_sync.py` - Fetch from Google Sheets
2. `validate_schema.py` - Schema validation
3. `process_archive_data.py` - Clean and normalize
4. `enrich_entities.py` - Extract persons/places, link to GND/GeoNames
5. `transform_to_ric.py` - Convert to JSON-LD (RiC ontology)
6. `generate_statistics.py` - Compute metrics
7. `generate_catalog.py` - Embed data in HTML

**Includes:**
- GitHub Actions workflow (YAML)
- Error handling strategies
- Testing guide (unit tests, integration tests)
- Performance metrics (current: ~20s for 182 records)
- Monitoring and troubleshooting

---

## 🗂️ Folder Structure

```
m3gim/
├── .claude/                    # Claude Code configuration
├── data/                       # Data files
│   ├── archive_data.json       # Original data (backup)
│   ├── archive_data_enhanced.json  # Processed data (JSON-LD)
│   ├── archive_stats_enhanced.json  # Statistics
│   ├── schema.jsonld           # JSON-LD schema definition
│   └── vocabularies/           # Controlled vocabularies
│       ├── dokumenttyp.json
│       ├── sprache.json
│       └── bearbeitungsstatus.json
├── docs/                       # Documentation (YOU ARE HERE)
│   ├── INDEX.md                # This file
│   ├── research.md             # Research context
│   ├── data.md                 # Data model
│   ├── requirements.md         # User stories & epics
│   └── architecture.md         # Technical architecture
├── preprocessing/              # Data pipeline scripts
│   ├── README.md               # Pipeline documentation
│   ├── sheets_sync.py          # Fetch from Google Sheets
│   ├── validate_schema.py      # Schema validation
│   ├── process_archive_data.py # Data cleaning
│   ├── enrich_entities.py      # Entity extraction
│   ├── transform_to_ric.py     # JSON-LD transformation
│   ├── generate_statistics.py  # Metrics computation
│   └── generate_catalog.py     # HTML embedding
├── scripts/                    # Utility scripts
├── tests/                      # Test files
│   ├── test_processing.py      # Unit tests
│   └── test_pipeline.py        # Integration tests
├── templates/                  # HTML templates
│   └── catalog_template.html   # Base template for catalog
├── archive_development/        # Legacy prototype files
├── knowledge/                  # Knowledge base
├── .gitignore                  # Git ignore rules
├── .github/                    # GitHub Actions workflows
│   └── workflows/
│       └── sync_data.yml       # Automated pipeline
├── requirements.txt            # Python dependencies
└── README.md                   # Project overview (user-facing)
```

---

## 🚀 Getting Started Guides

### For Researchers: Using the Archive Catalog

1. **Browse the catalog:** Visit [GitHub Pages URL] (TBD)
2. **Search for materials:** Use keyword search or filters (person, place, date, document type)
3. **View Graz-related items:** Click "Graz-Related Only" filter
4. **Export data:** Click "Export" → Choose format (CSV/JSON/JSON-LD)
5. **Cite a record:** Click record → "Cite this record" → Copy citation

**Advanced Usage:**
- [Network visualization](requirements.md#us-21-network-visualization) - See connections between persons
- [Geographic map](requirements.md#us-22-geographic-mobility-map) - Explore Malaniuk's mobility
- [Timeline](requirements.md#us-23-timeline-visualization) - View chronological patterns

### For Developers: Setting Up Locally

```bash
# 1. Clone repository
git clone https://github.com/chpollin/malaniuk.git
cd malaniuk

# 2. Install Python dependencies
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Process data (if you have source data)
python preprocessing/process_archive_data.py

# 4. Generate catalog
python preprocessing/generate_catalog.py

# 5. Test locally
python -m http.server 8000
# Open http://localhost:8000/archive_catalog.html
```

**Next Steps:**
- Read [architecture.md](architecture.md#development-workflow) for full setup
- Check [preprocessing/README.md](../preprocessing/README.md#testing) for testing guide
- Review [data.md](data.md) to understand data model

### For Data Contributors: Entering Archival Records

**Prerequisites:**
- Google account with access to M³GIM Sheets
- Familiarity with archival description standards

**Process:**
1. Open Google Sheets template (link TBD)
2. Fill 17 required fields per record (see [data.md](data.md#core-fields-17-required-fields))
3. Use dropdown menus for controlled vocabularies
4. Save (auto-syncs daily at 2 AM UTC)
5. Check quality dashboard (link TBD) to verify data

**Field Definitions:**
- See [data.md](data.md#core-fields-17-required-fields) for detailed descriptions
- See [controlled vocabularies](data.md#controlled-vocabularies) for valid values
- See data entry guidelines (TODO) for examples and best practices

---

## 📖 Additional Resources

### External Documentation
- [Records in Contexts (RiC) Ontology](https://www.ica.org/standards/RiC/ontology)
- [JSON-LD Specification](https://www.w3.org/TR/json-ld11/)
- [GND (Gemeinsame Normdatei)](https://www.dnb.de/EN/gnd)
- [GeoNames](http://www.geonames.org/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.3/)
- [Chart.js Documentation](https://www.chartjs.org/)
- [D3.js Documentation](https://d3js.org/)
- [Leaflet.js Documentation](https://leafletjs.com/)

### Related Projects
- [GAMS - Geisteswissenschaftliches Asset Management System](https://gams.uni-graz.at/)
- [Performing Arts CH](https://www.performingarts.ch/) - Swiss database for performing arts
- [OperaBase](https://www.operabase.com/) - International opera database
- [RISM (Répertoire International des Sources Musicales)](https://rism.info/)

### Academic Publications
- Strohmann, N. K. (forthcoming). "Mobilität und Wissenstransfer im Musiktheater"
- (Additional publications to be added as project progresses)

---

## 🤝 Contributing

**Types of Contributions Welcome:**
- **Data:** Correct errors, add missing information via Google Sheets
- **Code:** Submit pull requests for bug fixes or features
- **Documentation:** Improve clarity, fix typos, add examples
- **Research:** Share findings, suggest new research questions

**How to Contribute:**
1. Check [GitHub Issues](https://github.com/chpollin/malaniuk/issues) (TBD)
2. Read [architecture.md](architecture.md#development-workflow) for dev setup
3. Make changes in feature branch
4. Submit pull request with clear description
5. Wait for review from project team

**Contribution Guidelines:** (TODO: Create CONTRIBUTING.md)

---

## 📞 Contact & Support

**Project Team:**
- **Project Lead:** Univ.-Prof.in Dr.in Nicole K. Strohmann (KUG Graz)
- **Technical Lead:** Dr. Christopher Pollin (Digital Humanities Craft OG)

**Get Help:**
- **Technical Issues:** [GitHub Issues](https://github.com/chpollin/malaniuk/issues)
- **Data Questions:** Email project team (see README.md)
- **General Inquiries:** [Contact form TBD]

**Project Website:** https://m3gim.uni-graz.at (TBD)
**GitHub Repository:** https://github.com/chpollin/malaniuk

---

## 📄 License

- **Code:** MIT License (open source)
- **Data:** CC BY 4.0 (Creative Commons Attribution)
- **Documentation:** CC BY 4.0

See LICENSE file in repository for details.

---

## 🔄 Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-23 | Initial documentation structure created |

**Last Updated:** 2025-10-23
**Maintained By:** M³GIM Project Team

---

## 📝 TODO: Missing Documentation

**Priority 1 (Phase 1, Q1 2026):**
- [ ] Data entry guidelines (German/English)
- [ ] Google Sheets template setup guide
- [ ] User manual for catalog interface
- [ ] CONTRIBUTING.md
- [ ] LICENSE file
- [ ] Comprehensive .gitignore

**Priority 2 (Phase 1, Q2 2026):**
- [ ] API documentation (if SPARQL endpoint added)
- [ ] Video tutorials (data entry, catalog usage)
- [ ] Accessibility statement (WCAG compliance)
- [ ] Privacy policy / Datenschutzerklärung
- [ ] FAQ page

**Priority 3 (Phase 2, FWF Proposal):**
- [ ] Scholarly methodology paper
- [ ] Technical whitepaper
- [ ] Crowdsourcing guidelines
- [ ] Multi-language documentation (DE/EN/UK)

---

**Navigation:** [↑ Back to Top](#m³gim-documentation-index) | [← Back to README](../README.md)
