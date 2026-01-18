# M³GIM: Mapping Mobile Musicians

Digital Archive & Research Platform for Music Theater Mobility Studies

---

## Project Status

**Current Phase:** Frontend Refactoring Complete (MVP)

✅ Archive data migrated, validated, and exported as RiC-O conformant JSON-LD
✅ Modular CSS architecture with design tokens
✅ ES6 module-based JavaScript architecture
✅ Vite build system configured
✅ ESLint code quality enforcement
⏳ Awaiting real data to replace synthetic visualization data

---

## Project Overview

**M³GIM** (Mapping Mobile Musicians - Mobilität und Musiktheaterwissen im Graz der Nachkriegszeit am Beispiel der Sängerin Ira Malaniuk) is a digital humanities research project investigating transnational knowledge transfer in postwar music theater (1945-1969) through the lens of Ukrainian-Austrian mezzo-soprano Ira Malaniuk (1919-2009).

**Project Team:**
- Project Lead: Univ.-Prof.in Dr.in Nicole K. Strohmann (KUG Graz)
- Technical Implementation: Dr. Christopher Pollin (Digital Humanities Craft OG)

**Duration:** 01.01.2026 - 31.12.2026 (Phase 1: Feasibility Study)

---

## Data Pipeline

```
data/archive-export/     →  migrate.py   →  data/processed/
(Original Excel)                            (Normalized Excel)
                                                   ↓
                                            validate.py
                                                   ↓
                                            data/reports/
                                            (Validation Report)
                                                   ↓
                                            create-ric-json.py
                                                   ↓
docs/data/m3gim.jsonld  ←  copy          ←  data/export/
(GitHub Pages)                              (JSON-LD Export)
```

### Current Data

| Category | Count |
|----------|-------|
| Objects (Hauptbestand, Plakate, Tonträger) | 208 |
| Photographs | 228 |
| **Total Records** | **436** |

---

## Repository Structure

```
m3gim/
├── data/
│   ├── archive-export/    # Original archive Excel exports
│   ├── processed/         # Normalized Excel (migrate.py output)
│   ├── export/            # JSON-LD export (create-ric-json.py output)
│   └── reports/           # Validation reports
├── docs/                  # GitHub Pages frontend
│   ├── index.html         # Main HTML with accessibility enhancements
│   ├── css/
│   │   ├── main.css       # CSS orchestrator (imports all modules)
│   │   ├── tokens.css     # Design tokens (colors, spacing, typography)
│   │   ├── base.css       # Reset and base styles
│   │   ├── components/    # UI component styles (8 modules)
│   │   └── visualizations/ # D3.js visualization styles (4 modules)
│   ├── js/
│   │   ├── main.js        # ES6 module entry point
│   │   ├── modules/       # Core modules (config, state, utils)
│   │   ├── services/      # Data and filter services
│   │   ├── components/    # UI components (modal, grid, filters, etc.)
│   │   ├── app.js         # Legacy application code
│   │   └── partitur.js    # Partitur visualization
│   └── data/
│       ├── m3gim.jsonld       # Archive data (436 records)
│       └── synthetic-data.json # Prototype visualization data
├── scripts/
│   ├── migrate.py         # Archive → Normalized Excel
│   ├── validate.py        # Data validation
│   └── create-ric-json.py # Excel → JSON-LD (RiC-O)
├── knowledge/             # Project documentation (13 files)
│   ├── 01-PROJEKT.md      # Project overview
│   ├── 02-DATENMODELL.md  # RiC-O data model
│   ├── 03-DESIGN-SYSTEM.md # UI/UX specifications
│   ├── 04-VISUALISIERUNGEN.md # Visualization concepts
│   ├── 05-ENTSCHEIDUNGEN.md # Architecture decisions
│   ├── 06-ANFORDERUNGEN.md # Requirements
│   ├── 07-PIPELINES.md    # Data pipelines
│   ├── 08-IMPLEMENTIERUNGSPLAN.md # Implementation plan
│   ├── 09-DATENANFORDERUNGEN.md # Real data requirements
│   └── VIZ-*.md           # Individual visualization specs
├── .eslintrc.cjs          # ESLint configuration
├── vite.config.js         # Vite build configuration
├── package.json           # Node.js dependencies
└── README.md
```

---

## Technical Stack

- **Data Model:** Records in Contexts (RiC-O) 1.1
- **Serialization:** JSON-LD with custom DocumentaryFormTypes
- **Processing:** Python (pandas, openpyxl)
- **Build System:** Vite 6.x (dev server, production bundling)
- **Frontend:** ES6 Modules, CSS Design Tokens
- **Visualizations:** D3.js v7 (Partitur, Matrix, Kosmos, Sankey)
- **Code Quality:** ESLint with custom rules
- **Icons:** Lucide Icons
- **Authority Data:** Wikidata Q-IDs

### JSON-LD Namespaces

| Prefix | URI | Purpose |
|--------|-----|---------|
| `rico:` | https://www.ica.org/standards/RiC/ontology# | RiC-O ontology |
| `m3gim:` | https://dhcraft.org/m3gim/vocab# | Project vocabulary |
| `m3gim-dft:` | https://dhcraft.org/m3gim/documentary-form-types# | DocumentaryFormTypes |
| `wd:` | http://www.wikidata.org/entity/ | Wikidata entities |

---

## Scripts

### migrate.py
Transforms archive Excel exports to normalized format with controlled vocabularies.

```bash
python scripts/migrate.py
```

### validate.py
Validates data against schema rules (signatures, vocabularies, dates).

```bash
python scripts/validate.py
```

### create-ric-json.py
Exports to RiC-O conformant JSON-LD.

```bash
python scripts/create-ric-json.py
```

---

## Development

### Prerequisites

- Node.js 18+
- Python 3.10+ (for data processing)

### Setup

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Opens at http://localhost:5173

### Production Build

```bash
npm run build
npm run preview
```

### Linting

```bash
npm run lint      # Check for issues
npm run lint:fix  # Auto-fix issues
```

---

## Source Materials

**Archive:** Ira Malaniuk Estate (UAKUG/NIM)
**Location:** Universitätsarchiv der Kunstuniversität Graz
**Extent:** 182 archival units in 17 archive boxes
**Period:** 1924-1998 (focus: 1945-1969)

---

## License

- Code: MIT License
- Data & Documentation: CC BY 4.0
- Source materials: See individual file rights

---

## Contact

- Project Lead: nicole.strohmann@kug.ac.at
- Technical Lead: christopher.pollin@gmail.com

---

Last Updated: 2026-01-18
