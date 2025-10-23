# M³GIM: Mapping Mobile Musicians

**Digital Archive & Research Platform for Music Theater Mobility Studies**

![Status](https://img.shields.io/badge/status-prototype-yellow)
![License](https://img.shields.io/badge/license-MIT%20%2B%20CC%20BY%204.0-blue)

## 🎵 About the Project

**M³GIM** (Mapping Mobile Musicians - Mobilität und Musiktheaterwissen im Graz der Nachkriegszeit am Beispiel der Sängerin Ira Malaniuk) is a digital humanities research project investigating transnational knowledge transfer in postwar music theater (1945-1969) through the lens of Ukrainian-Austrian mezzo-soprano **Ira Malaniuk** (1919-2009).

**Project Team:**
- **Project Lead:** Univ.-Prof.in Dr.in Nicole K. Strohmann (KUG Graz)
- **Technical Implementation:** Dr. Christopher Pollin (Digital Humanities Craft OG)

**Duration:** 01.01.2026 – 31.12.2026 (Phase 1: Feasibility Study for FWF Follow-up Project)

---

## 🌐 Access the Digital Archive

**Live Catalog:** [https://chpollin.github.io/malaniuk/](https://chpollin.github.io/malaniuk/)

---

## 📚 The Archive

The **Ira Malaniuk Estate** (Universitätsarchiv der KUG Graz, Signatur: UAKUG/NIM) comprises:

- **182 archival records** in 17 archive boxes
- **Time span:** 1924-1998 (focus: 1945-1969, Malaniuk's formative Graz period)
- **Content types:** Autobiographical texts, activity lists, programs, repertoire registers, contracts, press clippings, correspondence, photographs
- **Languages:** German, Ukrainian, Italian, French, English

### Research Focus

The project investigates four central research questions:

1. **Urban Culture:** How did singers shape Graz's music and theater culture? What role did mobility play in professionalization and networking?
2. **Genre Transformation:** How did migration influence narrative and aesthetic structures in postwar opera?
3. **Knowledge Transfer:** How was ephemeral music theater knowledge transferred through mobility and adapted in new contexts?
4. **Mobility Forms:** Which specific forms of mobility can be identified in Malaniuk's career, and how did these influence knowledge production?

**Central Hypothesis:** Mobility of singers was not only a prerequisite for careers, but a catalyst for new knowledge cultures and aesthetic paradigms in music theater.

---

## ✨ Features

### Current (Prototype Phase)

- ✅ **182 digitally cataloged archival records**
- ✅ **Interactive web catalog** (search, filter, export)
- ✅ **Multilingual support** (German, Ukrainian, Italian, French)
- ✅ **Data export** (CSV, JSON for research)
- ✅ **Statistics dashboard** (visual analysis)
- ✅ **Offline-capable** (embedded data, no server required)
- ✅ **Responsive design** (works on mobile devices)

### Planned (Phase 1, 2026)

- 🔄 **Network visualization** (person-institution connections)
- 🔄 **Geographic mapping** (mobility patterns)
- 🔄 **Timeline visualization** (career phases)
- 🔄 **Linked Open Data** (GND, GeoNames integration)
- 🔄 **Digital scans** (archival materials)
- 🔄 **JSON-LD export** (RiC-compliant)

---

## 🔍 Quick Start

### For Researchers

1. **Browse the catalog:** Visit [live catalog](https://chpollin.github.io/malaniuk/)
2. **Search:** Use keyword search or advanced filters (person, place, date, document type)
3. **Export data:** Download as CSV or JSON for analysis in Excel, R, Python
4. **Cite:** See [Citation](#citation) section below

### For Developers

```bash
# Clone the repository
git clone https://github.com/chpollin/malaniuk.git
cd malaniuk

# Install dependencies
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# View catalog locally
python -m http.server 8000
# Open http://localhost:8000/docs/
```

**Documentation:** See [knowledge/INDEX.md](knowledge/INDEX.md) for complete technical documentation.

---

## 📁 Repository Structure

```
m3gim/
├── docs/                       # GitHub Pages (public web catalog)
│   ├── index.html              # Interactive catalog (embedded data)
│   └── assets/                 # Web assets (CSS, JS, images)
│       └── styles.css          # Custom styles
├── knowledge/                  # Documentation (internal)
│   ├── INDEX.md                # Documentation hub (START HERE)
│   ├── research.md             # Research context & questions
│   ├── data.md                 # Data model specification
│   ├── requirements.md         # Feature requirements & user stories
│   └── architecture.md         # Technical architecture
├── preprocessing/              # Data processing pipeline & scripts
│   ├── README.md               # Pipeline documentation
│   ├── archive_data.json       # Original data (182 records)
│   ├── archive_data_enhanced.json  # Processed/enhanced data
│   └── *.py                    # Python processing scripts
├── data/                       # Source data & vocabularies
│   └── vocabularies/           # Controlled vocabularies (JSON)
├── scripts/                    # Utility scripts
├── templates/                  # HTML templates
├── tests/                      # Automated tests
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

---

## 🎓 Academic Use

This catalog is designed for researchers, historians, and cultural heritage professionals studying:

- **Ukrainian opera and musical history** - Malaniuk's contributions to preserving Ukrainian cultural identity
- **20th century European cultural history** - Postwar reconstruction and mobility
- **Gender studies** - Female agency in male-dominated opera world
- **Mobility studies** - Forced migration, professional mobility, knowledge transfer
- **Digital humanities** - Archival data modeling, network analysis, cultural mapping
- **Biographical research** - First comprehensive digital catalog of Ira Malaniuk materials

---

## 📜 Citation

### For the Archive

When citing this digital archive in research or publications:

```
M³GIM: Mapping Mobile Musicians - Mobilität und Musiktheaterwissen
im Graz der Nachkriegszeit am Beispiel der Sängerin Ira Malaniuk (2024-2026).
Kunstuniversität Graz. https://chpollin.github.io/malaniuk/
```

### For Individual Records

When citing specific archival materials:

```
Ira Malaniuk Estate, [Archivsignatur, e.g. UAKUG/NIM_001],
[Title of document], Universitätsarchiv der Kunstuniversität Graz (UAKUG/NIM),
accessed [date] via https://chpollin.github.io/malaniuk/
```

### BibTeX

```bibtex
@misc{m3gim2024,
  title = {M³GIM: Mapping Mobile Musicians - Mobilität und Musiktheaterwissen im Graz der Nachkriegszeit},
  author = {Strohmann, Nicole K. and Pollin, Christopher},
  year = {2024-2026},
  howpublished = {\url{https://chpollin.github.io/malaniuk/}},
  institution = {Kunstuniversität Graz},
  note = {Digital archive of the Ira Malaniuk Estate (UAKUG/NIM)}
}
```

---

## 🛠️ Technical Architecture

**Stack:** Simple, sustainable, open-source
- **Frontend:** HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Chart.js, D3.js, Leaflet.js
- **Backend:** Python 3.11+ (data processing)
- **Data:** JSON-LD (RiC-compliant), controlled vocabularies
- **Hosting:** GitHub Pages (static site, free, stable)
- **CI/CD:** GitHub Actions (automated pipeline from Google Sheets)

**Design Principles:**
1. **Offline-first:** Embedded data, works without internet
2. **No dependencies:** No server, no database, no API calls
3. **Long-term sustainability:** Static site, open standards
4. **Accessibility:** WCAG 2.1 AA compliant
5. **Open Source:** MIT License (code) + CC BY 4.0 (data)

**Documentation:** See [knowledge/architecture.md](knowledge/architecture.md) for technical details.

---

## 🤝 Contributing

We welcome contributions from the research community:

- **Data corrections:** Identify errors or missing information
- **Entity enrichment:** Help link persons to authority files (GND, VIAF)
- **Documentation:** Improve clarity, fix typos, add examples
- **Code:** Submit pull requests for bug fixes or features

**How to contribute:**
1. Check [GitHub Issues](https://github.com/chpollin/malaniuk/issues) for open tasks
2. Fork the repository
3. Make your changes in a feature branch
4. Submit a pull request with clear description

**Questions?** Contact the project team (see below).

---

## 📞 Contact & Support

**Project Lead:**
- Univ.-Prof.in Dr.in Nicole K. Strohmann
- Kunstuniversität Graz, Institut für Musikwissenschaft
- Email: nicole.strohmann@kug.ac.at

**Technical Lead:**
- Dr. Christopher Pollin
- Digital Humanities Craft OG
- Email: christopher.pollin@gmail.com

**GitHub Repository:** https://github.com/chpollin/malaniuk
**Issues & Support:** https://github.com/chpollin/malaniuk/issues

---

## 📄 License

**Dual License:**

- **Code** (Python scripts, JavaScript): **MIT License** (open source, commercially usable)
- **Data** (archival records, documentation): **CC BY 4.0** (Creative Commons Attribution)

See [LICENSE](LICENSE) file for full terms.

**Note:** Original archival materials (photographs, letters, documents) remain subject to their original copyright holders. This license applies to digital representations and metadata.

---

## 🙏 Acknowledgments

**Funded by:**
- Kunstuniversität Graz (2026-2027, Phase 1)
- Future: FWF (Fonds zur Förderung der wissenschaftlichen Forschung), Phase 2

**Archive Partner:**
- Universitätsarchiv der Kunstuniversität Graz

**Technology Stack:**
- [Bootstrap 5](https://getbootstrap.com/) - UI framework (MIT License)
- [Chart.js](https://www.chartjs.org/) - Statistics charts (MIT License)
- [D3.js](https://d3js.org/) - Network visualizations (ISC License)
- [Leaflet.js](https://leafletjs.com/) - Interactive maps (BSD 2-Clause)
- [Font Awesome](https://fontawesome.com/) - Icons (Font Awesome Free License)

**Standards & Ontologies:**
- [Records in Contexts (RiC)](https://www.ica.org/standards/RiC/ontology) - Archival description standard
- [JSON-LD](https://www.w3.org/TR/json-ld11/) - Linked data format
- [GND](https://www.dnb.de/EN/gnd) - Authority control (persons)
- [GeoNames](http://www.geonames.org/) - Geographic data

---

## 🗺️ Roadmap

### Phase 1: Feasibility Study (2026-2027)

- [x] **Q4 2025:** Project documentation & data model design ✅
- [ ] **Q1 2026:** Structured data entry (182 records)
- [ ] **Q1 2026:** Web catalog prototype with search & filter
- [ ] **Q2 2026:** Network & geographic visualizations
- [ ] **Q2 2026:** Digital scans integration (partial)
- [ ] **Q3 2026:** JSON-LD export (RiC-compliant)
- [ ] **Q4 2026:** Open Access publication
- [ ] **Q1 2027:** Public launch & user testing

### Phase 2: FWF Proposal (2027-2030)

- [ ] Extended network analysis & cultural mapping
- [ ] Comparative study: singers at European cultural centers
- [ ] International research data networking
- [ ] SPARQL endpoint & Linked Open Data
- [ ] Crowdsourcing platform for community contributions

---

## 📊 Statistics

- **182** archival records cataloged
- **17** physical archive boxes
- **50+ years** of career documentation (1924-1998)
- **4 languages** represented in materials
- **100%** open access & free to use

---

**Status:** 🚧 Prototype Phase (Documentation Complete, Implementation In Progress)

**Last Updated:** 2025-10-23

---

**[View Documentation](knowledge/INDEX.md)** | **[Browse Catalog](https://chpollin.github.io/malaniuk/)** | **[Report Issues](https://github.com/chpollin/malaniuk/issues)**
