# Data Model Documentation

## Overview

This document describes the M³GIM data model for archival records of the Ira Malaniuk estate. The current prototype uses simplified test data; the M³GIM model represents the refined, standardized approach for the full project.

---

## Source Material

**Collection:** Ira Malaniuk Estate (Teilnachlass)
**Archive:** Universitätsarchiv der Kunstuniversität Graz (KUG)
**Signature Base:** UAKUG/NIM
**Extent:** 182 archival units in 17 archive boxes
**Period:** 1924-1998 (focus: 1945-1969)
**Content Types:** Autobiographical texts, study materials, activity lists, programs, repertoire registers, contracts, press clippings, correspondence, photographs

---

## Data Model: M³GIM Standard

### Core Fields (17 Required Fields)

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `archivsignatur` | string | ✓ | Unique archive signature | Format: `UAKUG/NIM_XXX` (001-182) |
| `box_nr` | integer | ✓ | Physical box number | Range: 1-17 |
| `titel` | string | ✓ | Descriptive title of record | Min. 10 characters |
| `jahr_von` | integer | - | Start year | Format: YYYY (1900-2025) |
| `jahr_bis` | integer | - | End year | Format: YYYY (≥ jahr_von) |
| `dokumenttyp` | enum | ✓ | Document type | See controlled vocabulary below |
| `sprache` | enum | ✓ | Primary language(s) | See controlled vocabulary below |
| `scan_status` | enum | ✓ | Digitization status | See controlled vocabulary below |
| `enthaelt` | text | - | Physical description of contents | Free text |
| `umfang` | integer | - | Number of objects/pages | Positive integer |
| `datei_url` | url | - | Link to digital file | Valid URL (future use) |
| `graz_bezug` | boolean | - | Graz-related content | true/false |
| `personen` | list | - | Associated persons | Structured: `{name, rolle, gnd_id}` |
| `orte` | list | - | Associated places | Structured: `{ort, land, geonames_id}` |
| `notizen` | text | - | Research notes | Free text |
| `bearbeitungsstatus` | enum | - | Processing status | See controlled vocabulary below |
| `wichtige_fundstellen` | text | - | Important findings | Free text |

### Controlled Vocabularies

**dokumenttyp** (8 values):
- `autobiografie` - Autobiographical texts
- `korrespondenz` - Letters, correspondence
- `vertrag` - Contracts, agreements
- `programm` - Concert/opera programs
- `pressematerial` - Press clippings, reviews
- `fotografie` - Photographs
- `repertoireliste` - Repertoire lists
- `sonstiges` - Other materials

**sprache** (5 values):
- `deutsch` - German
- `ukrainisch` - Ukrainian
- `englisch` - English
- `französisch` - French
- `italienisch` - Italian
- Multiple languages: comma-separated (e.g., `deutsch, französisch`)

**scan_status** (3 values):
- `gescannt` - Digitized and available
- `in_bearbeitung` - Scanning in progress
- `ausstehend` - Not yet digitized

**bearbeitungsstatus** (4 values):
- `offen` - Not yet processed
- `in_bearbeitung` - Currently being processed
- `abgeschlossen` - Processing complete
- `validiert` - Quality-checked and validated

---

## Data Transformations

### 1. Input Layer: Google Sheets
**Format:** Spreadsheet with 17 columns, data validation via dropdowns
**Entry:** Manual by researchers (no programming knowledge required)
**Validation:** Real-time via Google Sheets formulas and dropdown constraints

### 2. Processing Layer: Python Pipeline
**Script:** `process_archive_data.py`

**Transformations:**
```python
# Date standardization
"1944" → {"jahr_von": 1944, "jahr_bis": 1944}
"1953-1959" → {"jahr_von": 1953, "jahr_bis": 1959}
"ohne Datum" → {"jahr_von": null, "jahr_bis": null}

# Language normalization
"deutsch, italienisch" → ["deutsch", "italienisch"]

# Person extraction (from notes/correspondence)
"Brief an Karajan" → {"personen": [{"name": "Herbert von Karajan", "rolle": "Dirigent", "gnd_id": "118560239"}]}

# Place extraction
"Graz, Opernhaus" → {"orte": [{"ort": "Graz", "land": "Österreich", "geonames_id": "2778067"}]}

# Quality scoring
quality_score = (filled_required_fields / total_required_fields) * 100

# Priority calculation
priority_score = (wichtige_fundstellen ? 3 : 0) + (has_scan ? 2 : 0) + (graz_bezug ? 1 : 0)
```

### 3. Output Layer: JSON-LD (RiC-compatible)
**Standard:** Records in Contexts (RiC-CM) + Music Domain Extensions
**Format:** JSON-LD with `@context` linking to RiC ontology

**Example Record:**
```json
{
  "@context": {
    "@vocab": "https://www.ica.org/standards/RiC/ontology#",
    "schema": "http://schema.org/",
    "m3gim": "https://m3gim.uni-graz.at/ontology#"
  },
  "@type": "Record",
  "@id": "https://m3gim.uni-graz.at/records/UAKUG_NIM_001",
  "identifier": "UAKUG/NIM_001",
  "title": "Stefania Pawlyschyn: Geschichte einer Karriere",
  "hasRecordPart": {
    "@type": "RecordPart",
    "physicalLocation": {
      "box": 1,
      "archivalUnit": 1
    }
  },
  "creationDate": {
    "startDate": "1991",
    "endDate": "2009",
    "dateQualifier": "approximate"
  },
  "documentType": "autobiografie",
  "language": ["de", "uk"],
  "digitizationStatus": "gescannt",
  "hasPerson": [
    {
      "@type": "Person",
      "name": "Stefania Pawlyschyn",
      "role": "author",
      "sameAs": "http://d-nb.info/gnd/XXXXXXX"
    }
  ],
  "hasPlace": [
    {
      "@type": "Place",
      "name": "Graz",
      "country": "Austria",
      "sameAs": "http://sws.geonames.org/2778067/"
    }
  ],
  "grazRelated": true,
  "extent": {
    "pageCount": 125,
    "physicalDescription": "Typoskript in bedruckter Mappe"
  },
  "notes": "vermutlich Original weil viele handschriftl. Verbesserungen",
  "m3gim:priorityScore": 3,
  "m3gim:qualityScore": 100.0
}
```

---

## Data Access & Querying

### JavaScript Client-Side Queries

**Load Data:**
```javascript
// Data is embedded in HTML for offline access
const allRecords = EMBEDDED_DATA.data;
```

**Filter by Box:**
```javascript
const box1Records = allRecords.filter(r => r.box_nr === 1);
```

**Filter by Date Range:**
```javascript
const postwarRecords = allRecords.filter(r =>
  r.jahr_von >= 1945 && r.jahr_von <= 1969
);
```

**Filter by Graz Context:**
```javascript
const grazRecords = allRecords.filter(r => r.graz_bezug === true);
```

**Full-Text Search:**
```javascript
function searchRecords(query) {
  const q = query.toLowerCase();
  return allRecords.filter(r =>
    r.titel.toLowerCase().includes(q) ||
    r.enthaelt?.toLowerCase().includes(q) ||
    r.personen?.some(p => p.name.toLowerCase().includes(q))
  );
}
```

**Filter by Document Type:**
```javascript
const correspondence = allRecords.filter(r =>
  r.dokumenttyp === 'korrespondenz'
);
```

**Find Related Records (by Person):**
```javascript
function findRecordsByPerson(personName) {
  return allRecords.filter(r =>
    r.personen?.some(p =>
      p.name.toLowerCase().includes(personName.toLowerCase())
    )
  );
}
```

**Network Analysis Data Extraction:**
```javascript
// Extract all unique persons with their connections
const personNetwork = allRecords.reduce((network, record) => {
  record.personen?.forEach(person => {
    if (!network[person.name]) {
      network[person.name] = {
        name: person.name,
        rolle: person.rolle,
        connections: []
      };
    }
    network[person.name].connections.push(record.archivsignatur);
  });
  return network;
}, {});
```

**Geographic Distribution:**
```javascript
// Count records by place
const placeDistribution = allRecords.reduce((counts, record) => {
  record.orte?.forEach(place => {
    counts[place.ort] = (counts[place.ort] || 0) + 1;
  });
  return counts;
}, {});
```

---

## Data Quality Metrics

**Completeness Score:**
```javascript
function calculateCompleteness(record) {
  const requiredFields = ['archivsignatur', 'box_nr', 'titel', 'dokumenttyp', 'sprache', 'scan_status'];
  const filledRequired = requiredFields.filter(f => record[f] != null).length;
  return (filledRequired / requiredFields.length) * 100;
}
```

**Priority Score:**
```javascript
function calculatePriority(record) {
  let score = 0;
  if (record.wichtige_fundstellen) score += 3;
  if (record.datei_url) score += 2;
  if (record.graz_bezug) score += 1;
  return score;
}
```

---

## Export Formats

**CSV Export:**
```javascript
function exportToCSV(records) {
  const headers = Object.keys(records[0]);
  const csv = [
    headers.join(','),
    ...records.map(r => headers.map(h => JSON.stringify(r[h] || '')).join(','))
  ].join('\n');
  return csv;
}
```

**JSON-LD Export:**
```javascript
function exportToJSONLD(records) {
  return {
    "@context": "https://m3gim.uni-graz.at/context.jsonld",
    "@graph": records.map(r => transformToRiC(r))
  };
}
```

---

## Migration Notes (Prototype → M³GIM)

**Current Prototype Schema (17 fields, German):**
- Uses mixed German/English field names
- No controlled vocabularies enforced
- Date format inconsistent (text strings)
- 13 boxes (incorrect count)
- No structured person/place data

**Migration Tasks:**
1. Rename fields to English standard names
2. Expand to 17 boxes (review physical archive)
3. Implement controlled vocabularies with validation
4. Parse person/place names from free-text fields
5. Standardize date formats to YYYY integers
6. Add Graz context flags through manual review
7. Link persons to GND authority file
8. Link places to GeoNames database
9. Generate RiC-compliant JSON-LD
10. Validate against schema

**Estimated Effort:** 40-60 hours for manual data enhancement + 20 hours for script development
