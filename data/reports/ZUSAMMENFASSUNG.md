# M3GIM Archiv-Analyse: Zusammenfassung

**Datum:** 2026-01-19
**Analysierte Dokumente:** 436 Archivdokumente

---

## Überblick

Diese Analyse untersucht die 436 Archivdokumente aus `/home/user/m3gim/data/export/m3gim.jsonld`, um zu verstehen, welche realistischen synthetischen Daten mit ECHTEN Signaturen erstellt werden können.

## Generierte Berichte

### 1. **archive-analysis.md** - Hauptanalyse
- **Top 20 Personen** mit Signaturen, Zeiträumen und Dokumenttypen
- **Komponisten-Analyse** (Wagner, Verdi, Strauss + weitere)
- **Top 15 Werke** mit Signaturen
- **Top 10 Orte** mit Signaturen
- **Zeitliche Abdeckung** (5-Jahres-Perioden + Jahresweise)
- **Dokumenttyp-Verteilung**
- **Empfehlungen** für synthetische Daten

### 2. **signature-index.md** - Detaillierte Signaturlisten
- Signaturen **nach Zeitperioden** (1915-2014)
- Signaturen **nach Dokumenttyp** (Photograph, Letter, etc.)
- **Wagner-Werke** (19 Dokumente mit Signaturen)
- **Verdi-Werke** (21 Dokumente mit Signaturen)
- **Strauss-Werke** (9 Dokumente mit Signaturen)

---

## Wichtigste Erkenntnisse

### Personen

**Hauptperson: Ira Malaniuk**
- **196 Dokumente** (45% des gesamten Archivs!)
- Zeitraum: 1942-2010
- Dokumenttypen: Photographs (133), Collections (20), Letters (18)
- Über **180 verschiedene Signaturen**

**Weitere dokumentierte Personen:**
- Max Kojetinsky (2 Dokumente) - Opernhaus Graz
- Erik Werba (1) - Pianist
- Heinz Rehfuss (1) - Bariton
- Paul Baumgartner (1) - Pianist
- Rudolf Hartmann (1) - Prof.
- Bruno Walter (1) - Dirigent
- Ernst Baasch (1) - Ehemann

### Komponisten & Werke

#### Wagner (19 Dokumente)
**Werke:** Tannhäuser, Lohengrin, Tristan und Isolde, Meistersinger, Götterdämmerung

**Beispiel-Signaturen:**
- NIM_FS_034 - "Tannhäuser" in Rom (1951)
- NIM_119 - "Tristan und Isolde" Wiener Staatsoper (1956)
- NIM_FS_002 - Meistersinger in Bayreuth (1951)
- NIM_120 - "Tannhäuser" Wiener Staatsoper (1956)

#### Verdi (21 Dokumente)
**Werke:** Aida, Macbeth, Don Carlos, Falstaff, Traviata

**Beispiel-Signaturen:**
- NIM_087 - "Aida" Wiener Staatsoper (1956)
- NIM_FS_001 - "Macbeth" Züricher Oper (1949)
- NIM_089 - "Don Carlos" Wiener Staatsoper (1956)
- NIM_FS_196 - Falstaff (1949)

#### Strauss (9 Dokumente)
**Werke:** Der Rosenkavalier, Salome, Arabella, Capriccio

**Beispiel-Signaturen:**
- NIM_FS_206 - "Der Rosenkavalier" München
- NIM_FS_198 - Herodias in Salome
- NIM_FS_040 - Arabella München (1952)
- NIM_066 - "Capriccio" München (1965)

### Orte (Geografische Verteilung)

1. **Bayreuth** - 24 Dokumente (1950-1999)
2. **München** - 17 Dokumente (1952-1996)
3. **Wien** - 17 Dokumente (1956-2000)
4. **Zürich** - 12 Dokumente (1947-1961)
5. **Salzburg** - 9 Dokumente (1944-1999)
6. **Graz** - 9 Dokumente (1941-1999)
7. **Stanislau** - 5 Dokumente (1930-1942)
8. **Buenos Aires** - 4 Dokumente (1952)

### Zeitliche Abdeckung

**Am besten dokumentierte Perioden:**
- **1950-1954:** 68 Dokumente ████████████████████
- **1995-1999:** 58 Dokumente █████████████████
- **1955-1959:** 49 Dokumente ██████████████
- **1960-1964:** 36 Dokumente ██████████
- **1940-1944:** 24 Dokumente ███████

**Top Jahre:**
- 1999: 50 Dokumente
- 1952: 19 Dokumente
- 1951: 17 Dokumente
- 1960: 14 Dokumente
- 1953: 14 Dokumente

**Schwach dokumentierte Perioden:**
- 1915-1939 (nur 5 Dokumente)
- 1970-1989 (nur 11 Dokumente)
- 121 Dokumente ohne Datierung

### Dokumenttypen

| Typ | Anzahl | Prozent |
|-----|--------|---------|
| Photograph | 228 | 52.3% |
| Collection | 78 | 17.9% |
| Letter | 31 | 7.1% |
| Program | 30 | 6.9% |
| Article | 26 | 6.0% |
| Poster | 25 | 5.7% |
| Contract | 12 | 2.8% |

---

## Empfehlungen für synthetische Daten

### 1. Matrix-Daten (Verzeichnis)

**Beste Datenbasis:**
- Zeitraum: **1950-1964** (153 Dokumente)
- Orte: **München, Wien, Zürich, Bayreuth**
- Komponisten: **Wagner, Verdi, Strauss**

**Verwendbare Signaturen:**
Alle Signaturen aus den genannten Perioden können für Matrix-Einträge verwendet werden. Beispiel:
```
NIM_119 → Matrix-Eintrag: Tristan und Isolde, Wien 1956
NIM_087 → Matrix-Eintrag: Aida, Wien 1956
NIM_066 → Matrix-Eintrag: Capriccio, München 1965
```

### 2. Kosmos-Daten (Netzwerk)

**Beziehungen zwischen:**
- Personen (Ira Malaniuk + Dirigenten/Sänger)
- Orten (München ↔ Wien ↔ Bayreuth)
- Werken (Wagner-Ring-Zyklus)

**Beispiel-Verbindungen:**
- Ira Malaniuk → Bayreuth (24 Dokumente)
- Ira Malaniuk → München (17 Dokumente)
- Wagner → Bayreuth (mehrere Werke)

### 3. Partitur-Daten (Musikstücke)

**Verfügbare Opern mit Signaturen:**

**Wagner:**
- Tristan und Isolde (8 Dokumente: NIM_119, NIM_FS_050, NIM_FS_058, etc.)
- Tannhäuser (4 Dokumente)
- Meistersinger (Bayreuth-Bezug)

**Verdi:**
- Aida (9 Dokumente: NIM_063, NIM_087, NIM_FS_032, etc.)
- Macbeth (8 Dokumente)
- Don Carlos (3 Dokumente)

**Strauss:**
- Der Rosenkavalier (mehrere Fotografien)
- Capriccio (München 1965)
- Arabella (München 1952)

### 4. Syntax für synthetische Daten

**Vorschlag für realistische Einträge:**

```yaml
# Matrix-Eintrag basierend auf NIM_119
matrix:
  - id: M001
    title: "Tristan und Isolde"
    composer: "Wagner"
    location: "Wiener Staatsoper"
    year: 1956
    source_signature: "NIM_119"
    performer: "Ira Malaniuk (Brangäne)"

# Kosmos-Knoten
kosmos:
  - id: K001
    name: "Ira Malaniuk"
    type: "person"
    connected_to:
      - "Bayreuth"
      - "München"
      - "Wien"
    source_signatures: ["NIM_FS_002", "NIM_087", "NIM_119"]

# Partitur-Werk
partitur:
  - id: P001
    title: "Tristan und Isolde"
    composer: "Wagner"
    act: 2
    scene: 2
    role: "Brangäne"
    source_signatures: ["NIM_119", "NIM_FS_058", "NIM_FS_213"]
```

---

## Datenlücken & Einschränkungen

### Schwach dokumentierte Bereiche:

1. **Frühe Periode (vor 1940):** nur 5 Dokumente
2. **1970er/1980er:** sehr wenige Dokumente
3. **Andere Sänger/Dirigenten:** meist nur 1-2 Erwähnungen
4. **Nicht-Wagner/Verdi/Strauss Werke:** weniger gut dokumentiert

### 121 Dokumente ohne Datum
Diese können nicht für zeitbasierte synthetische Daten verwendet werden, aber:
- Sind oft Fotografien
- Können für allgemeine Kontext-Daten genutzt werden
- Enthalten wertvolle Titel-Informationen

---

## Nächste Schritte

### Für synthetische Daten-Generierung:

1. **Filtern Sie Signaturen nach Kriterien:**
   - Zeitraum (z.B. nur 1950-1964)
   - Komponist (z.B. nur Wagner)
   - Ort (z.B. nur Bayreuth)
   - Dokumenttyp (z.B. nur Photographs)

2. **Erstellen Sie realistische Kombinationen:**
   - Verwenden Sie nur Ort+Zeit+Werk-Kombinationen, die in den Daten vorkommen
   - Beispiel: München + 1965 + Capriccio = ✓ (NIM_066 existiert)
   - Beispiel: Salzburg + 1970 + Tosca = ✗ (keine Quelle)

3. **Referenzieren Sie Quell-Signaturen:**
   - Jeder synthetische Eintrag sollte mindestens eine echte Signatur referenzieren
   - Dies ermöglicht Nachvollziehbarkeit

4. **Nutzen Sie die density-visualization:**
   - Generieren Sie mehr Daten für gut dokumentierte Perioden (1950-1959)
   - Weniger Daten für schwach dokumentierte Perioden

---

## Dateien-Übersicht

```
/home/user/m3gim/data/reports/
├── archive-analysis.md      # Hauptanalyse mit Top-Listen
├── signature-index.md       # Detaillierte Signatur-Referenz
└── ZUSAMMENFASSUNG.md       # Dieses Dokument
```

**Empfohlene Nutzung:**
1. Lesen Sie zuerst **ZUSAMMENFASSUNG.md** (dieses Dokument)
2. Nutzen Sie **archive-analysis.md** für Überblick und Statistiken
3. Verwenden Sie **signature-index.md** als Nachschlagewerk für spezifische Signaturen

---

## Fazit

Das M3GIM-Archiv bietet eine **solide Basis** für synthetische Daten mit **echten Signaturen**:

✓ **196 Ira Malaniuk-Dokumente** decken breites Spektrum ab
✓ **1950er Jahre** sind hervorragend dokumentiert (68 Dokumente)
✓ **Wagner, Verdi, Strauss** haben jeweils 9-21 Dokumente
✓ **München, Wien, Bayreuth** sind Haupt-Locations

⚠ **Einschränkungen:**
- Fokus auf eine Person (Ira Malaniuk)
- 1970er/1980er schwach dokumentiert
- Andere Sänger/Dirigenten wenig vertreten

**Empfehlung:** Konzentrieren Sie synthetische Daten auf den **Zeitraum 1950-1964** und die **Komponisten Wagner/Verdi/Strauss** für maximale Authentizität.
