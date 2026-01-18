# M³GIM Datenanforderungen

## Übersicht

Dieses Dokument beschreibt die Datenstrukturen, die für die vollständige Funktionalität der M³GIM Visualisierungen benötigt werden.

## Aktueller Stand

### Vorhandene Daten (`data/m3gim.jsonld`)
- **436 Archiv-Datensätze** im JSON-LD Format (RiC-O 1.1)
- Enthält: Signaturen, Titel, Datumsangaben, Dokumenttypen
- Wird für die **Archiv-Ansicht** verwendet

### Synthetische Daten (`docs/data/synthetic-data.json`)
- **Prototyp-Daten** für Visualisierungsentwicklung
- Enthält: Lebensphasen, Orte, Mobilität, Netzwerk, Repertoire
- **Muss durch echte Daten ersetzt werden**

---

## Benötigte Datenstrukturen

### 1. Lebensphasen (für Partitur & Sankey)

```json
{
  "lebensphasen": [
    {
      "id": "LP1",
      "label": "Kindheit & Jugend",
      "von": "1919",
      "bis": "1937",
      "ort": "Lemberg",
      "beschreibung": "Kurze Beschreibung der Phase",
      "dokumente": ["NIM_080", "NIM_FS_001"]  // Verknüpfte Archivalien
    }
  ]
}
```

**Benötigte Phasen:**
1. Kindheit & Jugend (1919-1937)
2. Ausbildung (1937-1944)
3. Flucht & Neubeginn (1944-1945)
4. Erstes Festengagement Graz (1945-1947)
5. Aufstieg Wien/München (1947-1955)
6. Internationale Karriere (1955-1970)
7. Späte Karriere & Ruhestand (1970-2009)

---

### 2. Orte (für Partitur, Kosmos, Sankey)

```json
{
  "orte": [
    {
      "id": "L1",
      "name": "Wien",
      "land": "Österreich",
      "wikidata": "Q1741",
      "koordinaten": [48.2082, 16.3738],
      "zeitraeume": [
        {
          "von": "1947",
          "bis": "1958",
          "typ": "wohnort",           // oder "auffuehrungsort"
          "dokumente": ["NIM_022"]
        }
      ]
    }
  ]
}
```

**Benötigte Ortstypen:**
- `wohnort` - Hauptwohnsitz
- `auffuehrungsort` - Opernhaus, Konzertsaal

**Wichtige Orte:**
- Lemberg/Lwiw (Geburtsort, Ausbildung)
- Wien (Staatsoper)
- Graz (Erstes Engagement)
- München (Bayerische Staatsoper)
- Bayreuth (Festspiele)
- Salzburg (Festspiele)
- Zürich (Ruhestand)
- London (Gastspiele)

---

### 3. Mobilität (für Partitur & Sankey)

```json
{
  "mobilitaet": [
    {
      "id": "M1",
      "jahr": "1944",
      "von_ort": "L1",              // Orts-ID
      "nach_ort": "L2",
      "form": "erzwungen",          // Mobilitätsform
      "beschreibung": "Flucht vor der Roten Armee",
      "dokumente": ["NIM_070"]
    }
  ]
}
```

**Mobilitätsformen (FF4):**
- `erzwungen` - Flucht, Vertreibung
- `geografisch` - Umzug für Engagement
- `bildung` - Studium, Ausbildung
- `lebensstil` - Ruhestand, persönliche Gründe
- `national` - Gastspiele, Tourneen

---

### 4. Personen / Netzwerk (für Matrix)

```json
{
  "personen": [
    {
      "id": "P1",
      "name": "Karl Böhm",
      "kategorie": "dirigent",       // dirigent, regisseur, kollege, vermittler
      "wikidata": "Q78504",
      "begegnungen": [
        {
          "zeitraum": "1950-1954",
          "intensitaet": 4,          // 1-5 Skala
          "kontext": "Wiener Staatsoper",
          "dokumente": ["NIM_012", "NIM_FS_010"]
        }
      ]
    }
  ]
}
```

**Kategorien:**
- `dirigent` - Böhm, Karajan, Knappertsbusch, etc.
- `regisseur` - Wieland Wagner, etc.
- `kollege` - Ludwig, Jurinac, Hotter, etc.
- `vermittler` - Agenten (Taubman, Zelzer), Intendanten

---

### 5. Repertoire / Werke (für Kosmos & Partitur)

```json
{
  "werke": [
    {
      "id": "W1",
      "titel": "Aida",
      "komponist": "Giuseppe Verdi",
      "wikidata": "Q131758",
      "rollen": [
        {
          "name": "Amneris",
          "stimmfach": "Mezzosopran",
          "zeitraum": "1945-1968",
          "erste_auffuehrung": "1945",
          "letzte_auffuehrung": "1968",
          "anzahl_dokumente": 15,
          "dokumente": ["NIM_001", "NIM_004", "NIM_060"]
        }
      ]
    }
  ]
}
```

**Wichtige Komponisten:**
- Richard Wagner (Fricka, Waltraute, Brangäne, Erda)
- Giuseppe Verdi (Amneris, Eboli, Azucena, Ulrica)
- Richard Strauss (Klytämnestra, Octavian, Herodias)
- C.W. Gluck (Orpheus)
- G.F. Händel (Cornelia)

---

### 6. Dokument-Aggregation (für Partitur)

```json
{
  "dokument_aggregation": {
    "nach_jahr": [
      { "jahr": "1945", "anzahl": 5 },
      { "jahr": "1946", "anzahl": 8 }
    ],
    "nach_typ": [
      { "typ": "Korrespondenz", "anzahl": 120 },
      { "typ": "Fotografie", "anzahl": 228 }
    ]
  }
}
```

---

## Datenquellen für Anreicherung

### Aus vorhandenen Archiv-Metadaten extrahierbar:
- Jahreszahlen aus `rico:date`
- Dokumenttypen aus `rico:hasDocumentaryFormType`
- Personen aus Titeln (NLP/Regex)
- Orte aus Titeln (NLP/Regex)
- Werke/Komponisten aus Titeln (Regex: "als Amneris", "Aida", etc.)

### Manuell zu ergänzen:
- Lebensphasen-Definitionen
- Mobilitätsereignisse mit Formen
- Netzwerk-Intensitäten
- Biografische Details

### Externe Quellen:
- Wikidata für Personen, Orte, Werke
- Operndatenbanken für Aufführungsgeschichte

---

## Validierung

### Pflichtfelder pro Entität:

| Entität | Pflichtfelder |
|---------|---------------|
| Lebensphase | id, label, von, bis |
| Ort | id, name, zeitraeume[].von, zeitraeume[].bis, zeitraeume[].typ |
| Mobilität | id, jahr, von_ort, nach_ort, form |
| Person | id, name, kategorie |
| Werk | id, titel, komponist, rollen[].name |

### Konsistenzprüfungen:
- Alle `dokumente`-Referenzen müssen in `archivalien.dokumente` existieren
- Alle `von_ort`/`nach_ort` müssen in `orte` existieren
- Zeiträume müssen chronologisch sinnvoll sein (1919-2009)

---

## Migration von Synthetisch zu Echt

### Schritt 1: JSON-LD Analyse
```bash
python scripts/analyze-jsonld.py
```
→ Extrahiert Statistiken über vorhandene Felder

### Schritt 2: Daten-Extraktion erweitern
- `data-extractor.js` verbessern
- Mehr Informationen aus Titeln extrahieren

### Schritt 3: Manuelle Anreicherung
- Lebensphasen definieren
- Netzwerk-Beziehungen erfassen
- Mobilitätsereignisse dokumentieren

### Schritt 4: Validierung
- Schema-Validierung gegen JSON-Schema
- Referenz-Integrität prüfen
- Visualisierungen testen

---

## Nächste Schritte

1. [ ] JSON-LD Analyse-Script erstellen
2. [ ] Data-Extractor für bessere Titel-Analyse erweitern
3. [ ] Lebensphasen-Daten manuell erfassen
4. [ ] Netzwerk-Daten aus Korrespondenz extrahieren
5. [ ] Repertoire aus Programmen/Plakaten extrahieren
