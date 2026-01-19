# M³GIM Daten-Pipelines

## Übersicht

Dieses Dokument beschreibt die Datenflüsse im M³GIM-Projekt: von der Erfassung in Google Sheets über die Serialisierung als JSON-LD bis zur Aufbereitung für die Visualisierungen.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Google Sheets  │────▶│    JSON-LD      │────▶│  View JSONs     │
│  (Erfassung)    │     │   (RiC-O 1.1)   │     │  (Aggregiert)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Projektteam            Export-Script            Build-Script
   (manuell)              (Python)                 (Python/Node)
```

---

## 1. Erfassung (Google Sheets)

### Tabellen

| Tabelle | Inhalt | Schicht |
|---------|--------|---------|
| [M3GIM-Objekte](https://drive.google.com/open?id=1tpNY5ooBXZCnsT1zRBF2_BhrGmS2GYjUyM8NFwi-zOo) | Hauptbestand, Plakate, Tonträger | 1 |
| [M3GIM-Fotos](https://docs.google.com/spreadsheets/d/1H1AVtMuih_hceI35OXS-ttpbpV4bVy6kVC0pL1Sg8Hk) | Fotografien | 1 |
| [M3GIM-Verknuepfungen](https://docs.google.com/spreadsheets/d/1th3fWqadBy98DjRRQuqZLdwDnVEcFvah60OS3Pi02KA) | Personen, Orte, Werke, Events | 2+3 |
| [M3GIM-Personenindex](https://drive.google.com/open?id=1MHzdOy6qm1ylQeESVU-KJOgmSvYkl210-iPs3q0hOKE) | Normierte Personen | Index |
| [M3GIM-Ortsindex](https://drive.google.com/open?id=1XUwvhfI85I34OYesqmYb2rWmHfaBV10y5ecfnvuwEZk) | Normierte Orte | Index |
| [M3GIM-Werkindex](https://drive.google.com/open?id=19D6NZCak_RLpMAeh6fjKMdgIydizSHSO9rFlDGJnPIY) | Normierte Werke | Index |

### Workflow

1. Projektteam erfasst in Google Sheets
2. Dropdown-Validierung für kontrollierte Felder
3. Manuelle Prüfung vor Export

---

## 2. Export zu JSON-LD

### Aktueller Stand

- **Script:** Python (nicht im Repository)
- **Output:** `data/export/m3gim.jsonld`
- **Format:** JSON-LD mit RiC-O 1.1 Ontologie
- **Records:** 436 Archiveinheiten

### JSON-LD Struktur

```json
{
  "@context": {
    "rico": "https://www.ica.org/standards/RiC/ontology#",
    "m3gim": "https://m3gim.kug.ac.at/ontology#",
    "m3gim-dft": "https://m3gim.kug.ac.at/documentaryFormType/"
  },
  "@graph": [
    {
      "@id": "m3gim:NIM_028",
      "@type": "rico:Record",
      "rico:identifier": "UAKUG/NIM_028",
      "rico:title": "Gastvertrag Bayerische Staatsoper München",
      "rico:date": "1958-04-18",
      "rico:hasDocumentaryFormType": { "@id": "m3gim-dft:Contract" },
      "rico:hasOrHadAgent": [
        { "name": "Malaniuk, Ira", "role": "vertragspartner" },
        { "name": "Hartmann, Rudolf", "role": "unterzeichner" }
      ],
      "rico:hasOrHadLocation": [
        { "name": "München", "role": "vertragsort" }
      ],
      "rico:hasOrHadSubject": [
        { "name": "Die Meistersinger von Nürnberg", "type": "werk", "role": "interpretin" }
      ]
    }
  ]
}
```

### RiC-O Mapping

| M³GIM Feld | RiC-O Property |
|------------|----------------|
| archivsignatur | rico:identifier |
| titel | rico:title |
| entstehungsdatum | rico:date |
| dokumenttyp | rico:hasDocumentaryFormType |
| sprache | rico:hasLanguage |
| umfang | rico:physicalOrLogicalExtent |
| personen | rico:hasOrHadAgent |
| orte | rico:hasOrHadLocation |
| werke | rico:hasOrHadSubject |

---

## 3. Build-Pipeline: View-Aggregationen

**Status:** Implementiert (2026-01-19)

### Architektur

```
data/
├── export/
│   └── m3gim.jsonld          # Quelldaten (436 Records)
├── views/                     # Generierte View-Daten
│   ├── partitur.json         # 7.5KB - Timeline data
│   ├── matrix.json           # 3.1KB - Person-time matrix
│   ├── kosmos.json           # 4.9KB - Composer-work network
│   └── sankey.json           # 2.8KB - Career flow
└── archive-export/           # Original CSV-Exporte
```

### Implementierung: Python Build-Script

**Datei:** `scripts/build-views.py`
**Ausführung:** `python scripts/build-views.py` oder `npm run build:views`
**Output:** `data/views/*.json` (werden nach `docs/data/` kopiert)

```python
#!/usr/bin/env python3
"""
build-views.py - Generiert View-spezifische JSON-Dateien aus JSON-LD

Usage: python scripts/build-views.py
"""

import json
from pathlib import Path
from collections import defaultdict

INPUT_FILE = Path('data/export/m3gim.jsonld')
OUTPUT_DIR = Path('data/views')

def load_jsonld():
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('@graph', [])

def build_partitur(records):
    """Aggregiert Daten für Mobilitäts-Partitur"""
    partitur = {
        'lebensphasen': get_lebensphasen(),  # Statisch definiert
        'orte': aggregate_orte(records),
        'mobilitaet': aggregate_mobilitaet(records),
        'netzwerk': aggregate_netzwerk(records),
        'repertoire': aggregate_repertoire(records),
        'dokumente': aggregate_dokumente_pro_jahr(records)
    }
    return partitur

def build_matrix(records):
    """Aggregiert Daten für Begegnungs-Matrix"""
    personen = defaultdict(lambda: defaultdict(list))

    for record in records:
        year = extract_year(record.get('rico:date', ''))
        if not year:
            continue

        period = get_period(year)  # z.B. "1955-1959"

        agents = ensure_list(record.get('rico:hasOrHadAgent', []))
        for agent in agents:
            if isinstance(agent, dict):
                name = agent.get('name', '')
                role = agent.get('role', '')
                if name and name != 'Malaniuk, Ira':
                    personen[name][period].append({
                        'signatur': record.get('rico:identifier'),
                        'role': role
                    })

    # In Matrix-Format konvertieren
    matrix = []
    for name, periods in personen.items():
        row = {
            'name': name,
            'kategorie': classify_person(name),  # Dirigent, Vermittler, etc.
            'begegnungen': [
                {'zeitraum': p, 'intensitaet': len(docs), 'dokumente': docs}
                for p, docs in periods.items()
            ]
        }
        matrix.append(row)

    return {'personen': matrix}

def build_kosmos(records):
    """Aggregiert Daten für Rollen-Kosmos"""
    komponisten = defaultdict(lambda: defaultdict(list))

    for record in records:
        subjects = ensure_list(record.get('rico:hasOrHadSubject', []))
        for subject in subjects:
            if isinstance(subject, dict) and subject.get('type') == 'werk':
                werk = subject.get('name', '')
                komponist = get_komponist(werk)  # Lookup aus Werkindex
                rolle = subject.get('role', '')

                if komponist and rolle:
                    komponisten[komponist][werk].append({
                        'signatur': record.get('rico:identifier'),
                        'rolle': rolle,
                        'datum': record.get('rico:date')
                    })

    # In Kosmos-Format konvertieren
    kosmos = {
        'zentrum': {'name': 'Ira Malaniuk'},
        'komponisten': [
            {
                'name': komp,
                'werke': [
                    {'name': w, 'dokumente': docs}
                    for w, docs in werke.items()
                ]
            }
            for komp, werke in komponisten.items()
        ]
    }
    return kosmos

def build_karrierefluss(records):
    """Aggregiert Daten für Karrierefluss (Sankey)"""
    flows = {
        'phase_repertoire': [],  # Phase → Komponist
        'repertoire_geo': []     # Komponist → Ort
    }

    for record in records:
        year = extract_year(record.get('rico:date', ''))
        phase = get_karrierephase(year)  # Anfänge, Aufstieg, Höhepunkt, Spätphase

        subjects = ensure_list(record.get('rico:hasOrHadSubject', []))
        locations = ensure_list(record.get('rico:hasOrHadLocation', []))

        for subject in subjects:
            if isinstance(subject, dict) and subject.get('type') == 'werk':
                komponist = get_komponist(subject.get('name', ''))

                if phase and komponist:
                    flows['phase_repertoire'].append({
                        'source': phase,
                        'target': komponist,
                        'signatur': record.get('rico:identifier')
                    })

                for loc in locations:
                    if isinstance(loc, dict):
                        ort = loc.get('name', '')
                        if ort and komponist:
                            flows['repertoire_geo'].append({
                                'source': komponist,
                                'target': ort,
                                'signatur': record.get('rico:identifier')
                            })

    return aggregate_flows(flows)

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    records = load_jsonld()

    print(f"Loaded {len(records)} records")

    # Build all views
    views = {
        'partitur': build_partitur(records),
        'matrix': build_matrix(records),
        'kosmos': build_kosmos(records),
        'karrierefluss': build_karrierefluss(records)
    }

    # Write output files
    for name, data in views.items():
        output_file = OUTPUT_DIR / f'{name}.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Written: {output_file}")

if __name__ == '__main__':
    main()
```

### Option B: Node.js Build-Script

```javascript
// scripts/build-views.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = join(__dirname, '../data/export/m3gim.jsonld');
const OUTPUT_DIR = join(__dirname, '../data/views');

function loadJsonLd() {
  const data = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'));
  return data['@graph'] || [];
}

function buildPartitur(records) {
  // ... Aggregationslogik
}

function buildMatrix(records) {
  // ... Aggregationslogik
}

function buildKosmos(records) {
  // ... Aggregationslogik
}

function buildKarrierefluss(records) {
  // ... Aggregationslogik
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const records = loadJsonLd();

  console.log(`Loaded ${records.length} records`);

  const views = {
    partitur: buildPartitur(records),
    matrix: buildMatrix(records),
    kosmos: buildKosmos(records),
    karrierefluss: buildKarrierefluss(records)
  };

  for (const [name, data] of Object.entries(views)) {
    const outputFile = join(OUTPUT_DIR, `${name}.json`);
    writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Written: ${outputFile}`);
  }
}

main();
```

---

## 4. CI/CD Pipeline (GitHub Actions)

### Workflow: Build Views on Data Change

```yaml
# .github/workflows/build-views.yml
name: Build View Data

on:
  push:
    paths:
      - 'data/export/m3gim.jsonld'
  workflow_dispatch:  # Manuelle Ausführung

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r scripts/requirements.txt

      - name: Build view data
        run: python scripts/build-views.py

      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add data/views/
          git diff --staged --quiet || git commit -m "build: regenerate view data from JSON-LD"
          git push
```

### Workflow: Deploy to GitHub Pages

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - 'data/views/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Copy data to docs
        run: |
          mkdir -p docs/data
          cp data/export/m3gim.jsonld docs/data/
          cp -r data/views docs/data/

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

---

## 5. View-Datenformate

### partitur.json

```json
{
  "lebensphasen": [
    {
      "id": "LP1",
      "label": "Kindheit",
      "von": 1919,
      "bis": 1937,
      "ort": "Lemberg",
      "beschreibung": "Aufgewachsen in der Ukraine"
    }
  ],
  "orte": [
    {
      "ort": "Wien",
      "typ": "wohnort",
      "von": 1945,
      "bis": 1970,
      "dokumente": ["NIM_028", "NIM_042"]
    },
    {
      "ort": "Bayreuth",
      "typ": "auffuehrungsort",
      "von": 1952,
      "bis": 1968,
      "dokumente": ["NIM_004", "NIM_FS_047"]
    }
  ],
  "mobilitaet": [
    {
      "von": "Lemberg",
      "nach": "Wien",
      "jahr": 1944,
      "form": "erzwungen",
      "beschreibung": "Flucht vor der Roten Armee",
      "dokumente": ["NIM_042"]
    }
  ],
  "netzwerk": [
    {
      "periode": "1955-1959",
      "intensitaet": 28,
      "top_personen": ["Karajan", "Böhm", "Werba"]
    }
  ],
  "repertoire": [
    {
      "rolle": "Fricka",
      "werk": "Der Ring des Nibelungen",
      "komponist": "Wagner",
      "von": 1952,
      "bis": 1968,
      "dokumente": ["NIM_004", "NIM_FS_047"]
    }
  ],
  "dokumente": [
    { "jahr": 1958, "anzahl": 15 },
    { "jahr": 1959, "anzahl": 12 }
  ]
}
```

### matrix.json

```json
{
  "zeitraeume": ["1945-1949", "1950-1954", "1955-1959", "1960-1964", "1965-1969"],
  "kategorien": ["Dirigent", "Regisseur", "Vermittler", "Kollege"],
  "personen": [
    {
      "name": "Karajan, Herbert von",
      "kategorie": "Dirigent",
      "wikidata": "Q154749",
      "begegnungen": [
        {
          "zeitraum": "1955-1959",
          "intensitaet": 5,
          "dokumente": [
            { "signatur": "NIM_028", "kontext": "Salzburger Festspiele" }
          ]
        }
      ]
    },
    {
      "name": "Werba, Erik",
      "kategorie": "Vermittler",
      "begegnungen": [
        { "zeitraum": "1945-1949", "intensitaet": 3 },
        { "zeitraum": "1950-1954", "intensitaet": 4 },
        { "zeitraum": "1955-1959", "intensitaet": 5 }
      ]
    }
  ]
}
```

### kosmos.json

```json
{
  "zentrum": {
    "name": "Ira Malaniuk",
    "wikidata": "Q94208"
  },
  "komponisten": [
    {
      "name": "Richard Wagner",
      "farbe": "#8B0000",
      "dokumente_gesamt": 45,
      "werke": [
        {
          "name": "Der Ring des Nibelungen",
          "rollen": [
            {
              "name": "Fricka",
              "dokumente": 34,
              "zeitraum": "1952-1968"
            },
            {
              "name": "Waltraute",
              "dokumente": 8,
              "zeitraum": "1954-1960"
            }
          ]
        }
      ]
    },
    {
      "name": "Giuseppe Verdi",
      "farbe": "#006400",
      "dokumente_gesamt": 38,
      "werke": [
        {
          "name": "Aida",
          "rollen": [
            {
              "name": "Amneris",
              "dokumente": 28,
              "zeitraum": "1946-1968"
            }
          ]
        }
      ]
    }
  ]
}
```

### karrierefluss.json

```json
{
  "phasen": [
    { "id": "anfaenge", "label": "Anfänge", "von": 1945, "bis": 1950 },
    { "id": "aufstieg", "label": "Aufstieg", "von": 1950, "bis": 1955 },
    { "id": "hoehepunkt", "label": "Höhepunkt", "von": 1955, "bis": 1965 },
    { "id": "spaetphase", "label": "Spätphase", "von": 1965, "bis": 1970 }
  ],
  "repertoire": [
    { "id": "wagner", "label": "Wagner", "farbe": "#8B0000" },
    { "id": "verdi", "label": "Verdi", "farbe": "#006400" },
    { "id": "strauss", "label": "Strauss", "farbe": "#4B0082" }
  ],
  "orte": [
    { "id": "wien", "label": "Wien" },
    { "id": "bayreuth", "label": "Bayreuth" },
    { "id": "muenchen", "label": "München" }
  ],
  "flows": [
    {
      "source": "hoehepunkt",
      "target": "wagner",
      "value": 45,
      "dokumente": ["NIM_004", "NIM_028"]
    },
    {
      "source": "wagner",
      "target": "bayreuth",
      "value": 30,
      "dokumente": ["NIM_004"]
    }
  ]
}
```

---

## 6. Frontend-Integration

### Laden der View-Daten

```javascript
// In partitur.js
async function loadViewData(viewName) {
  const response = await fetch(`data/views/${viewName}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load ${viewName}.json`);
  }
  return response.json();
}

// Initialisierung
async function init() {
  const partiturData = await loadViewData('partitur');
  renderPartitur(partiturData);
}
```

### Fallback auf JSON-LD

```javascript
async function loadData() {
  try {
    // Versuche View-spezifische Daten zu laden
    return await loadViewData('partitur');
  } catch (error) {
    console.warn('View data not found, falling back to JSON-LD');
    // Fallback: Aggregiere aus JSON-LD zur Laufzeit
    const jsonld = await fetch('data/m3gim.jsonld').then(r => r.json());
    return aggregatePartiturFromJsonLd(jsonld['@graph']);
  }
}
```

---

## 7. Validierung

### JSON-Schema für View-Daten

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://m3gim.kug.ac.at/schemas/partitur.json",
  "title": "Partitur View Data",
  "type": "object",
  "required": ["lebensphasen", "orte", "mobilitaet", "netzwerk", "repertoire", "dokumente"],
  "properties": {
    "lebensphasen": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "label", "von", "bis"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "von": { "type": "integer", "minimum": 1919, "maximum": 2009 },
          "bis": { "type": "integer", "minimum": 1919, "maximum": 2009 }
        }
      }
    }
  }
}
```

### Validierung im Build

```python
import jsonschema

def validate_view(view_name, data):
    schema_file = f'schemas/{view_name}.schema.json'
    with open(schema_file) as f:
        schema = json.load(f)

    jsonschema.validate(instance=data, schema=schema)
    print(f"✓ {view_name}.json is valid")
```

---

## 8. Offene Aufgaben

| ID | Aufgabe | Priorität |
|----|---------|-----------|
| PL-01 | Build-Script implementieren | Kritisch |
| PL-02 | View-JSON-Formate finalisieren | Kritisch |
| PL-03 | GitHub Actions einrichten | Hoch |
| PL-04 | JSON-Schemas erstellen | Mittel |
| PL-05 | Dokumentation der Aggregationslogik | Mittel |

---

*Version 1.0 – 2026-01-18*
