# M³GIM: Mapping Mobile Musicians

Digitale Erschließung des Teilnachlasses Ira Malaniuk (UAKUG/NIM, 283 Archiveinheiten) am Universitätsarchiv der KUG Graz. Das Projekt untersucht Mobilität und Musiktheaterwissen im Graz der Nachkriegszeit.

**Live:** [dhcraft.org/m3gim](https://dhcraft.org/m3gim)

## Repository

Dieses Repository enthält die Datenpipeline (Python), das Frontend (Vite, D3.js v7) und das destillierte Projektwissen.

Siehe [`knowledge/`](knowledge/) für das Projektwissen und [`scripts/README.md`](scripts/README.md) für die Pipeline-Dokumentation.

## Struktur

```
m3gim/
├── knowledge/             # Destilliertes Projektwissen (7 Dokumente)
├── data/
│   ├── archive-export/    # Originale AUGIAS-Exporte (XLSX, nicht getrackt)
├── scripts/
│   ├── migrate.py         # AUGIAS-Export → formatierte Excel
│   ├── validate.py        # Datenqualitätsprüfung
│   ├── create-ric-json.py # Google Sheets → JSON-LD (RiC-O 1.1)
│   └── build-views.py     # JSON-LD → View-Aggregationen
├── .github/workflows/     # CI/CD
├── package.json
├── vite.config.js
└── .gitignore
```

## Technologie

- **Datenmodell:** Records in Contexts (RiC-O) 1.1, JSON-LD
- **Pipeline:** Python 3.11+ (pandas, openpyxl)
- **Frontend:** Vite v5, D3.js v7, Vanilla JS (ES6-Module)
- **Hosting:** GitHub Pages
- **Normdaten:** Wikidata Q-IDs

## Lizenz

- Code: MIT
- Daten & Dokumentation: CC BY 4.0
- Quellenmaterial: siehe Einzelrechtevermerk
