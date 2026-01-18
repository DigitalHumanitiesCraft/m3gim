# M³GIM Projektdokumentation

## Überblick

**M³GIM** (Mapping Music, Mobility, and Gender in the Interwar Period and Migration) ist ein Digital Humanities-Forschungsprojekt an der Kunstuniversität Graz (KUG). Es erschließt den Teilnachlass der ukrainisch-österreichischen Opernsängerin Ira Malaniuk (1919-2009) digital und macht ihn über eine interaktive Web-Applikation zugänglich.

**Bestand:** UAKUG/NIM – 436 Archiveinheiten
- 182 Objekte (Hauptbestand)
- 228 Fotografien
- 25 Plakate
- 1 Tonträger

## Forschungsfragen

| FF | Kernfrage | Schlüsselwörter |
|----|-----------|-----------------|
| **FF1** | Wie prägten Sänger*innen die Grazer Kultur? Welche Rolle spielte Mobilität für Professionalisierung und Vernetzung? | Netzwerk, Professionalisierung, Kontakte |
| **FF2** | Welche narrativen und ästhetischen Strukturen wurden durch Migration beeinflusst? | Repertoire, Ästhetik, Rollen, Stil |
| **FF3** | Wie wurde Musiktheaterwissen durch Mobilität transferiert und adaptiert? | Wissenstransfer, Vermittler |
| **FF4** | Welche Mobilitätsformen lassen sich bei Malaniuk identifizieren? | Mobilität, Orte, Flucht, Migration |

## Architektur

### Dreistufige Architektur

| Stufe | Funktion | Technologie |
|-------|----------|-------------|
| Erfassung | Dateneingabe durch Projektteam | Google Sheets |
| Verarbeitung | Validierung, Reconciliation, Export | Python, OpenRefine |
| Präsentation | Webbasierte Darstellung | GitHub Pages, D3.js |

### Technologiestack

- **Erfassung:** Google Sheets mit Dropdown-Validierung
- **Serialisierung:** JSON-LD basierend auf Records in Contexts (RiC)
- **Frontend:** HTML5, Vanilla JavaScript, D3.js v7
- **Hosting:** GitHub Pages (statisch)

### Repository-Struktur

```
m3gim/
├── data/
│   ├── archive-export/      # Originale Archivexporte
│   └── m3gim.jsonld          # JSON-LD Export
├── docs/
│   ├── index.html            # Frontend
│   ├── css/                  # Stylesheets
│   └── js/                   # JavaScript-Module
├── knowledge/                # Projektdokumentation
└── README.md
```

## Google Sheets (Erfassung)

| Tabelle | Inhalt | Link |
|---------|--------|------|
| M3GIM-Objekte | Hauptbestand, Plakate, Tonträger | [Link](https://drive.google.com/open?id=1tpNY5ooBXZCnsT1zRBF2_BhrGmS2GYjUyM8NFwi-zOo) |
| M3GIM-Fotos | Fotografien | [Link](https://docs.google.com/spreadsheets/d/1H1AVtMuih_hceI35OXS-ttpbpV4bVy6kVC0pL1Sg8Hk) |
| M3GIM-Verknuepfungen | Personen, Orte, Werke, Details | [Link](https://docs.google.com/spreadsheets/d/1th3fWqadBy98DjRRQuqZLdwDnVEcFvah60OS3Pi02KA) |
| M3GIM-Personenindex | Normierte Personen | [Link](https://drive.google.com/open?id=1MHzdOy6qm1ylQeESVU-KJOgmSvYkl210-iPs3q0hOKE) |
| M3GIM-Organisationsindex | Institutionen | [Link](https://drive.google.com/open?id=1zusl-KtvWhooeyFd3r3SMHZ1t-8rwm8xnZULaFsKwik) |
| M3GIM-Ortsindex | Orte | [Link](https://drive.google.com/open?id=1XUwvhfI85I34OYesqmYb2rWmHfaBV10y5ecfnvuwEZk) |
| M3GIM-Werkindex | Werke | [Link](https://drive.google.com/open?id=19D6NZCak_RLpMAeh6fjKMdgIydizSHSO9rFlDGJnPIY) |

## Web-Applikation

### Zwei Hauptbereiche

1. **Archiv** – Katalog mit Suche, Filter, Tektonik-Navigation
2. **Analyse** – Vier Visualisierungen (Partitur, Matrix, Kosmos, Karrierefluss)

### Visualisierungen

| Visualisierung | Forschungsfragen | Beschreibung |
|----------------|------------------|--------------|
| **Mobilitäts-Partitur** | FF1, FF2, FF3, FF4 | Multi-Layer Timeline mit 6 Spuren |
| **Begegnungs-Matrix** | FF1, FF3 | Heatmap der Netzwerk-Intensität |
| **Rollen-Kosmos** | FF2 | Radiales Repertoire-Universum |
| **Karrierefluss** | FF2, FF4 | Alluvial-Diagramm Phase→Repertoire→Ort |

## Signaturenschemata

| Bestandsgruppe | Schema | Beispiel |
|----------------|--------|----------|
| Hauptbestand | UAKUG/NIM_XXX | UAKUG/NIM_028 |
| Fotografien | UAKUG/NIM_FS_XXX | UAKUG/NIM_FS_047 |
| Plakate | UAKUG/NIM/PL_XX | UAKUG/NIM/PL_01 |
| Tonträger | UAKUG/NIM_TT_XX | UAKUG/NIM_TT_01 |

## Kontakt

- **Projektleitung:** Kunstuniversität Graz, Institut für Musikwissenschaft
- **Technische Umsetzung:** Digital Humanities Craft (DHCraft)
- **Repository:** [github.com/DigitalHumanitiesCraft/m3gim](https://github.com/DigitalHumanitiesCraft/m3gim)

---

*Version 1.0 – 2026-01-18*
