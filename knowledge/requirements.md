# Requirements Documentation: M³GIM Digital Archive

## Target Users

**Primary Users:**
- **Researchers:** Musicologists, historians, cultural studies scholars investigating mobility, opera history, gender studies
- **Students:** Graduate/PhD students researching 20th-century music theater
- **Archivists:** KUG archive staff maintaining and expanding the collection

**Secondary Users:**
- **Data Contributors:** Project team members entering and curating data
- **Public Audiences:** Opera enthusiasts, Ukrainian cultural heritage communities

---

## Research-Driven Requirements

Each requirement is mapped to research questions (RQ1-RQ4) from [research.md](research.md).

---

## Epic 1: Data Discovery & Search
**Research Goals:** Enable researchers to locate relevant materials for all RQs
**Priority:** MUST HAVE

### User Stories

**US 1.1: Basic Search**
```
AS A researcher
I WANT TO search the catalog by keywords
SO THAT I can find relevant archival materials quickly

Acceptance Criteria:
- Search covers: titel, enthaelt, personen, orte fields
- Real-time filtering (results update while typing)
- Case-insensitive matching
- Search highlights matching terms in results
- Keyboard shortcut (/) to focus search box
```
**Research Mapping:** All RQs (fundamental access requirement)

**US 1.2: Advanced Filtering**
```
AS A musicologist
I WANT TO filter records by multiple criteria (date, place, document type, language)
SO THAT I can narrow down materials for specific research questions

Acceptance Criteria:
- Filter by: dokumenttyp (dropdown)
- Filter by: date range (jahr_von - jahr_bis sliders)
- Filter by: orte (multi-select)
- Filter by: sprache (multi-select)
- Filter by: graz_bezug (checkbox toggle)
- Filters are combinable (AND logic)
- Clear all filters button
- Filter state visible in URL (shareable links)
```
**Research Mapping:** RQ1 (Graz focus), RQ4 (mobility patterns)

**US 1.3: Graz-Specific View**
```
AS A researcher studying Graz opera culture
I WANT TO see only records with Graz connections
SO THAT I can focus on materials relevant to RQ1

Acceptance Criteria:
- Quick filter button "Graz-Related Only"
- Badge indicator on Graz-related records
- Count of Graz records in statistics dashboard
- Export filtered Graz dataset
```
**Research Mapping:** RQ1 (urban culture)

---

## Epic 2: Contextual Data Visualization
**Research Goals:** Support RQ2-RQ4 through visual pattern discovery
**Priority:** MUST HAVE

### User Stories

**US 2.1: Network Visualization**
```
AS A researcher investigating professional networks
I WANT TO see a network graph of persons connected through archival records
SO THAT I can identify key figures and collaboration patterns (RQ1, RQ3)

Acceptance Criteria:
- Interactive network graph (D3.js/Vis.js)
- Nodes = persons (sized by connection count)
- Edges = shared archival records
- Click node → filter records by person
- Hover node → show person details (name, rolle, GND link)
- Color-code by rolle (Dirigent, Sängerin, Regisseur, etc.)
- Export network data (GraphML format)
```
**Research Mapping:** RQ1 (networking), RQ3 (knowledge transfer networks)

**US 2.2: Geographic Mobility Map**
```
AS A researcher studying mobility patterns
I WANT TO see Malaniuk's locations plotted on an interactive map
SO THAT I can analyze geographic mobility forms (RQ4)

Acceptance Criteria:
- Interactive map (Leaflet.js)
- Markers for all unique orte
- Marker size = number of records associated with location
- Click marker → show records from that location
- Timeline slider to filter by date
- Connection lines showing movement between cities (optional)
- Export coordinates as GeoJSON
```
**Research Mapping:** RQ4 (mobility forms)

**US 2.3: Timeline Visualization**
```
AS A historian
I WANT TO see a timeline of archival materials
SO THAT I can understand chronological patterns in Malaniuk's career

Acceptance Criteria:
- Horizontal timeline (1924-1998)
- Records plotted by jahr_von
- Color-coded by dokumenttyp
- Zoom to focus period (1945-1969)
- Click event → show record details
- Highlight Graz period (1945-1947)
```
**Research Mapping:** RQ2 (transformation over time), RQ4 (career phases)

**US 2.4: Statistical Dashboard**
```
AS A researcher
I WANT TO see aggregate statistics about the collection
SO THAT I can understand collection composition and identify research gaps

Acceptance Criteria:
- Total records count
- Records by dokumenttyp (chart)
- Records by sprache (chart)
- Records by decade (chart)
- Geographic distribution (top 10 cities)
- Person frequency list (most-mentioned)
- Completeness metrics (scan_status distribution)
- Export statistics as JSON/CSV
```
**Research Mapping:** All RQs (overview and gap analysis)

---

## Epic 3: Data Export & Interoperability
**Research Goals:** Enable secondary analysis and long-term preservation
**Priority:** MUST HAVE

### User Stories

**US 3.1: Flexible Data Export**
```
AS A researcher
I WANT TO export filtered datasets in multiple formats
SO THAT I can analyze data in external tools (Excel, R, Python, Gephi)

Acceptance Criteria:
- Export formats: CSV, JSON, JSON-LD, BibTeX
- Export current filtered view or entire dataset
- CSV includes all fields (not just visible columns)
- JSON-LD validates against RiC schema
- BibTeX format for citation management
- Download triggers with descriptive filename (e.g., m3gim_graz_1945-1947.csv)
```
**Research Mapping:** All RQs (enables computational analysis)

**US 3.2: Persistent Citations**
```
AS A scholar
I WANT TO cite individual archival records with stable URLs
SO THAT my publications can link reliably to source materials

Acceptance Criteria:
- Each record has unique URL (e.g., /records/UAKUG_NIM_001)
- URL includes human-readable identifier
- Click "Cite this record" → copy citation in multiple formats (APA, MLA, Chicago)
- Citation includes: Malaniuk Archive, archivsignatur, title, date, URL
- Record permalink survives site redesigns
```
**Research Mapping:** Academic credibility for all RQs

**US 3.3: LOD Integration**
```
AS A digital humanities researcher
I WANT TO access Linked Open Data endpoints
SO THAT I can connect M³GIM data with external resources (GND, VIAF, GeoNames)

Acceptance Criteria:
- Persons linked to GND authority IDs (clickable)
- Places linked to GeoNames (clickable)
- JSON-LD export includes @context with ontology links
- SPARQL endpoint (future phase)
```
**Research Mapping:** RQ3 (knowledge transfer), enables cross-database queries

---

## Epic 4: Archival Detail & Provenance
**Research Goals:** Support source criticism and archival research
**Priority:** MUST HAVE

### User Stories

**US 4.1: Comprehensive Record View**
```
AS AN archivist
I WANT TO see all metadata fields for a record
SO THAT I can verify data quality and completeness

Acceptance Criteria:
- Expandable detail view for each record
- Display all 17 fields (including empty fields)
- Visual indicators for: scanned (✓), Graz-related (★), important (!)
- Edit button (future: for authorized users)
- View history log (who edited, when)
```
**Research Mapping:** Data quality assurance for all RQs

**US 4.2: Digital Object Access**
```
AS A researcher
I WANT TO view digitized documents directly from the catalog
SO THAT I can examine primary sources without visiting the archive

Acceptance Criteria:
- "View Scan" button visible if datei_url exists
- Inline PDF viewer (or open in new tab)
- Download original file button
- Copyright/usage notice displayed
- Placeholder for un-digitized items ("Scan pending")
```
**Research Mapping:** All RQs (primary source access)

**US 4.3: Related Records**
```
AS A researcher
I WANT TO see records related to the current record
SO THAT I can discover connected materials

Acceptance Criteria:
- "Related Records" section in detail view
- Related by: same person, same place, same year, same dokumenttyp
- Related by: same box (physically adjacent materials)
- Similarity score displayed
- Click to navigate to related record
```
**Research Mapping:** RQ3 (knowledge transfer), contextual understanding

---

## Epic 5: Collaborative Research Features
**Research Goals:** Enable scholarly annotation and knowledge building
**Priority:** SHOULD HAVE (Phase 2)

### User Stories

**US 5.1: Researcher Annotations**
```
AS A musicologist
I WANT TO add scholarly annotations to records
SO THAT I can share interpretations and findings with colleagues

Acceptance Criteria:
- Annotation text field (markdown support)
- Annotations include: author name, date, affiliation
- Public/private annotation toggle
- Export annotations with records
- Moderation queue for public annotations
```
**Research Mapping:** RQ2, RQ3 (collaborative knowledge production)

**US 5.2: Crowdsourcing Interface**
```
AS A member of the Ukrainian diaspora community
I WANT TO contribute information about people/places in the archive
SO THAT I can enrich cultural heritage documentation

Acceptance Criteria:
- "Suggest an improvement" form on each record
- Fields: corrected spelling, additional context, related persons
- Submission includes contributor name/email (optional)
- Admin review workflow before publishing
- Contributor attribution in record metadata
```
**Research Mapping:** Expands source base for all RQs

---

## Epic 6: Mobile & Accessibility
**Research Goals:** Ensure broad access for diverse users
**Priority:** MUST HAVE

### User Stories

**US 6.1: Responsive Design**
```
AS A researcher using a tablet or smartphone
I WANT TO browse the catalog on mobile devices
SO THAT I can work in the archive or library without a laptop

Acceptance Criteria:
- Layout adapts to screen widths: 320px (mobile), 768px (tablet), 1024px+ (desktop)
- Touch-friendly controls (buttons ≥44px)
- Mobile: card layout instead of table
- Collapsible filters on mobile
- Readable text without zooming (16px base font)
```
**Research Mapping:** Usability for all RQs

**US 6.2: Accessibility (WCAG 2.1 AA)**
```
AS A researcher with visual impairments
I WANT TO use the catalog with screen readers and keyboard navigation
SO THAT I can conduct research independently

Acceptance Criteria:
- Semantic HTML (proper heading hierarchy)
- ARIA labels for interactive elements
- Keyboard navigation: Tab, Enter, Arrow keys
- Focus indicators visible
- Color contrast ≥4.5:1 for text
- Alt text for all images/icons
- Skip-to-content link
```
**Research Mapping:** Inclusive research access

---

## Epic 7: Performance & Offline Access
**Research Goals:** Enable research in low-bandwidth/offline contexts
**Priority:** SHOULD HAVE

### User Stories

**US 7.1: Offline Catalog**
```
AS A researcher traveling to archives
I WANT TO use the catalog without internet
SO THAT I can cross-reference materials on-site

Acceptance Criteria:
- Embedded JSON data (no external API calls)
- Single HTML file with all dependencies
- Works from file:// protocol
- Service Worker for PWA offline caching (future)
- "Save for offline" button → download complete catalog
```
**Research Mapping:** Practical access for all RQs

**US 7.2: Fast Loading**
```
AS ANY user
I WANT THE catalog to load quickly
SO THAT I can start researching without delays

Acceptance Criteria:
- Initial page load < 3 seconds (3G connection)
- Search results update < 100ms
- Filter changes update < 200ms
- Lazy-load images/visualizations
- Minified CSS/JS
- Progressive enhancement (content visible before JS loads)
```
**Research Mapping:** User experience for all RQs

---

## Epic 8: Data Administration (Backend)
**Research Goals:** Sustainable data curation workflow
**Priority:** MUST HAVE

### User Stories

**US 8.1: Google Sheets Data Entry**
```
AS A project team member
I WANT TO enter data in Google Sheets with validation
SO THAT I can contribute without programming knowledge

Acceptance Criteria:
- Template with 17 columns (M³GIM schema)
- Dropdown validation for: dokumenttyp, sprache, scan_status, bearbeitungsstatus
- Data validation rules: archivsignatur format, jahr range
- Conditional formatting: highlight incomplete records
- Protected header row
- Instructions sheet in workbook
```
**Research Mapping:** Data quality for all RQs

**US 8.2: Automated Pipeline**
```
AS THE technical lead
I WANT data to sync automatically from Sheets to website
SO THAT updates are published without manual deployment

Acceptance Criteria:
- GitHub Actions workflow triggered daily (or on Sheets edit via webhook)
- Python script: fetch Sheets data → validate → transform to JSON-LD
- Validation errors logged and emailed to admin
- Generate archive_data_enhanced.json
- Update statistics (archive_stats_enhanced.json)
- Commit changes to GitHub
- GitHub Pages auto-deploys updated site
- Build status badge on README
```
**Research Mapping:** Efficient maintenance enables sustained research

**US 8.3: Quality Monitoring**
```
AS THE project lead
I WANT TO monitor data quality metrics
SO THAT I can identify and prioritize data improvement tasks

Acceptance Criteria:
- Dashboard showing: completeness score per record, missing fields summary, duplicate detection
- Alert if quality score < 80% for any record
- Prioritized task list: "Top 10 records needing attention"
- Export quality report (PDF)
- Track quality improvements over time (chart)
```
**Research Mapping:** Data reliability for all RQs

---

## Non-Functional Requirements

### Performance
- Catalog supports 500+ records without performance degradation
- Visualizations render < 2 seconds (network graphs, maps)
- Search response time < 100ms

### Browser Compatibility
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Graceful degradation for older browsers (content accessible, reduced features)

### Security & Privacy
- No user tracking or analytics without consent
- No personally identifiable information (PII) in public records
- Copyright compliance for digitized materials

### Maintainability
- Simple tech stack (HTML/CSS/JS, Python, GitHub Pages)
- No server-side runtime dependencies
- Documented code (inline comments, architecture.md)
- No external API dependencies (except Google Sheets for data entry)

### Licensing
- Code: MIT License (open source)
- Data: CC BY 4.0 (Creative Commons Attribution)
- Images: Rights statement per item (© KUG Archiv)

---

## Prioritization (MoSCoW)

**MUST HAVE (Phase 1, 2026):**
- Epic 1: Data Discovery & Search
- Epic 3: Data Export & Interoperability (basic)
- Epic 4: Archival Detail & Provenance
- Epic 6: Mobile & Accessibility
- Epic 8: Data Administration

**SHOULD HAVE (Phase 1.5, Q3 2026):**
- Epic 2: Contextual Data Visualization (network, map, timeline)
- Epic 7: Performance & Offline Access

**COULD HAVE (Phase 2, FWF Proposal):**
- Epic 5: Collaborative Research Features
- Epic 3: LOD Integration (full SPARQL endpoint)

**WON'T HAVE (Initial Phases):**
- User authentication/accounts (use public catalog + admin-only Sheets access)
- CMS for content editing (Google Sheets IS the CMS)
- Automated transcription (OCR for handwritten materials - future research)
- Multi-language interface (German/English docs only; Ukrainian in records)

---

## Success Metrics

**Quantitative:**
- 100% of 182 records cataloged with quality score ≥ 90%
- ≥ 50% of records have Graz context tagged
- ≥ 30% of records have digitized scans linked
- 500+ person entities identified and linked to GND
- 100+ places mapped to GeoNames
- Website usage: 100+ unique visitors in first 3 months

**Qualitative:**
- Researchers can answer all 4 RQs using the catalog
- User testing: ≥ 4/5 satisfaction rating from 3 test users
- FWF proposal: catalog cited as methodological contribution
- Academic publication references the catalog in methodology
- Community engagement: ≥ 5 crowdsourced contributions

---

## Out of Scope (Future Considerations)

- Full-text search inside PDFs (requires OCR)
- Audio/video integration (Malaniuk recordings)
- Comparative analysis with other singer archives
- Machine learning for entity extraction
- 3D object models (physical artifacts)
- VR/AR archive exploration
