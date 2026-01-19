# M³GIM Projektdokumentation

## Überblick

**M³GIM** (Mapping Music, Mobility, and Gender in the Interwar Period and Migration) ist ein Digital Humanities-Forschungsprojekt an der Kunstuniversität Graz (KUG). Es erschließt den Teilnachlass der ukrainisch-österreichischen Opernsängerin Ira Malaniuk (1919-2009) digital und macht ihn über eine interaktive Web-Applikation zugänglich.

**Bestand:** UAKUG/NIM – 436 Archiveinheiten
- 182 Objekte (Hauptbestand)
- 228 Fotografien
- 25 Plakate
- 1 Tonträger

**Live-URL:** [GitHub Pages](https://digitalhumanitiescraft.github.io/m3gim/)

## Forschungsfragen

| FF | Kernfrage | Schlüsselwörter |
|----|-----------|-----------------|
| **FF1** | Wie prägten Sänger*innen die Grazer Kultur? Welche Rolle spielte Mobilität für Professionalisierung und Vernetzung? | Netzwerk, Professionalisierung, Kontakte |
| **FF2** | Welche narrativen und ästhetischen Strukturen wurden durch Migration beeinflusst? | Repertoire, Ästhetik, Rollen, Stil |
| **FF3** | Wie wurde Musiktheaterwissen durch Mobilität transferiert und adaptiert? | Wissenstransfer, Vermittler |
| **FF4** | Welche Mobilitätsformen lassen sich bei Malaniuk identifizieren? | Mobilität, Orte, Flucht, Migration |

## Technologiestack

| Schicht | Technologie | Beschreibung |
|---------|-------------|--------------|
| Erfassung | Google Sheets | Dropdown-Validierung, kollaborativ |
| Serialisierung | JSON-LD (RiC-O 1.1) | ICA-Archivstandard |
| Build | Python | `build-views.py` für View-Aggregation |
| Frontend | Vite + D3.js v7 | ES6-Module, Hot Reload |
| Hosting | GitHub Pages | Statisch, kein Backend |

## Repository-Struktur

```
m3gim/
├── data/
│   ├── archive-export/      # Originale Archivexporte
│   ├── export/              # JSON-LD Export
│   │   └── m3gim.jsonld     # 436 Records (RiC-O 1.1)
│   └── views/               # Aggregierte View-Daten
│       ├── partitur.json
│       ├── matrix.json
│       ├── kosmos.json
│       └── sankey.json
├── docs/                    # Frontend (GitHub Pages)
│   ├── index.html
│   ├── css/
│   │   ├── main.css         # Import-Aggregator
│   │   ├── tokens.css       # Design-Tokens
│   │   ├── base.css         # Resets, Typography
│   │   └── components/      # Button, Card, Modal, etc.
│   ├── js/
│   │   ├── main.js          # Entry Point
│   │   ├── modules/         # Config, State, Utils
│   │   ├── components/      # UI-Komponenten
│   │   ├── services/        # Data, Filter
│   │   └── visualizations/  # Partitur, Matrix, Kosmos, Sankey
│   └── data/                # Kopie der View-JSONs
├── scripts/
│   └── build-views.py       # JSON-LD → View-JSONs
├── knowledge/               # Projektdokumentation
│   ├── 01-PROJEKT.md        # Diese Datei
│   ├── 02-DATENMODELL.md    # Dreischichten-Modell
│   ├── 03-DESIGN-SYSTEM.md  # Farben, Typografie
│   ├── 04-VISUALISIERUNGEN.md # Alle 4 Visualisierungen
│   ├── 05-ENTSCHEIDUNGEN.md # Design Decisions
│   ├── 06-ANFORDERUNGEN.md  # Feature-Status
│   ├── 07-PIPELINES.md      # Datenfluss
│   ├── 08-IMPLEMENTIERUNGSPLAN.md
│   └── 09-DATENANFORDERUNGEN.md
└── README.md
```

## Web-Applikation

### Zwei Hauptbereiche

1. **Archiv** – Katalog mit Suche, Filter, Tektonik-Navigation
2. **Analyse** – Vier D3.js-Visualisierungen (Default-View)

### Visualisierungen

| Visualisierung | FF | Konzept | Status |
|----------------|-----|---------|--------|
| **Mobilitäts-Partitur** | 1,2,3,4 | Multi-Layer Timeline (6 Spuren) | Implementiert |
| **Begegnungs-Matrix** | 1,3 | Heatmap Personen × Perioden | Implementiert |
| **Rollen-Kosmos** | 2 | Radiales Force-Graph | Implementiert |
| **Karrierefluss** | 2,4 | Sankey Phase→Repertoire→Ort | Implementiert |

Alle Visualisierungen unterstützen:
- Klick auf Element → Dokument-Panel mit Archivalien
- Tooltips bei Hover
- Konsistente Farbkodierung (Komponisten, Kategorien)

## Datenmodell

### Dreischichten-Modell

| Schicht | Inhalt | Tabelle |
|---------|--------|---------|
| 1 | Kernmetadaten (obligatorisch) | M3GIM-Objekte, M3GIM-Fotos |
| 2 | Verknüpfungen (empfohlen) | M3GIM-Verknuepfungen |
| 3 | Quellentyp-spezifisch (fakultativ) | typ=detail in Verknüpfungen |

### Signaturenschemata

| Bestandsgruppe | Schema | Beispiel |
|----------------|--------|----------|
| Hauptbestand | UAKUG/NIM_XXX | UAKUG/NIM_028 |
| Fotografien | UAKUG/NIM_FS_XXX | UAKUG/NIM_FS_047 |
| Plakate | UAKUG/NIM/PL_XX | UAKUG/NIM/PL_01 |
| Tonträger | UAKUG/NIM_TT_XX | UAKUG/NIM_TT_01 |

## Google Sheets (Erfassung)

| Tabelle | Inhalt |
|---------|--------|
| [M3GIM-Objekte](https://drive.google.com/open?id=1tpNY5ooBXZCnsT1zRBF2_BhrGmS2GYjUyM8NFwi-zOo) | Hauptbestand, Plakate, Tonträger |
| [M3GIM-Fotos](https://docs.google.com/spreadsheets/d/1H1AVtMuih_hceI35OXS-ttpbpV4bVy6kVC0pL1Sg8Hk) | Fotografien |
| [M3GIM-Verknuepfungen](https://docs.google.com/spreadsheets/d/1th3fWqadBy98DjRRQuqZLdwDnVEcFvah60OS3Pi02KA) | Personen, Orte, Werke |
| [Personenindex](https://drive.google.com/open?id=1MHzdOy6qm1ylQeESVU-KJOgmSvYkl210-iPs3q0hOKE) | Normierte Personen |
| [Ortsindex](https://drive.google.com/open?id=1XUwvhfI85I34OYesqmYb2rWmHfaBV10y5ecfnvuwEZk) | Normierte Orte |
| [Werkindex](https://drive.google.com/open?id=19D6NZCak_RLpMAeh6fjKMdgIydizSHSO9rFlDGJnPIY) | Normierte Werke |

## Lokale Entwicklung

```bash
# Dependencies installieren
npm install

# Dev-Server starten
cd docs && npx vite --port 3000

# View-Daten neu generieren
python scripts/build-views.py
```

## Kontakt

- **Projektleitung:** Kunstuniversität Graz, Institut für Musikwissenschaft
- **Technische Umsetzung:** Digital Humanities Craft (DHCraft)
- **Repository:** [github.com/DigitalHumanitiesCraft/m3gim](https://github.com/DigitalHumanitiesCraft/m3gim)

---

*Version 2.0 – 2026-01-19*
*Konsolidiert und aktualisiert mit Implementierungsstatus*
