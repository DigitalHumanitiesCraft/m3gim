# M³GIM Projektwissen

> Konsolidiertes Wissensdokument aus Iteration 1. Dient als Context-Engineering-Quelle für LLM-gestützte Entwicklung in Iteration 2.
> Stand: 2026-02-18

---

## 1. Projekt

**Mapping Mobile Musicians (M³GIM)** untersucht Mobilität und Musiktheaterwissen im Graz der Nachkriegszeit am Beispiel der Mezzosopranistin Ira Malaniuk (1919--2009). Malaniuk floh 1944 aus Lemberg, erhielt 1945--47 ihr erstes Festengagement am Grazer Opernhaus und machte von dort internationale Karriere (Bayreuth ab 1952, Wiener Staatsoper, Bayerische Staatsoper). Ab 1970 Professorin an der KUG Graz. Ihr Teilnachlass (UAKUG/NIM, 436 Archiveinheiten) wird digital erschlossen.

- **Laufzeit:** 01.03.2026--28.02.2027 (Machbarkeitsstudie für FWF-Folgeprojekt)
- **Finanzierung:** Stadt Graz (bewilligt Dez 2025), Mariann Steegmann Foundation (bewilligt Feb 2026)
- **Technisches Kontingent DH Craft:** 80h (AP1 Datenmodell 20h, AP2 Pipeline 15h, AP3 Frontend 25h, AP4 Dokumentation 10h, AP5 Schulung 10h)
- **Repository:** github.com/DigitalHumanitiesCraft/m3gim
- **Live:** dhcraft.org/m3gim

### Forschungsfragen

- **FF1** Professionalisierung/Vernetzung: Wie prägten Sänger*innen die Grazer Musik- und Theaterkultur?
- **FF2** Genretransformation: Welche narrativen und ästhetischen Strukturen wurden durch Migration beeinflusst?
- **FF3** Wissenstransfer: Wie wurde Musiktheaterwissen durch Mobilität transferiert und adaptiert?
- **FF4** Mobilitätsformen: Welche Mobilitätsformen lassen sich bei Malaniuk identifizieren?

### Mobilitätstypen

National (Staatsbürgerschaft durch Heirat), geografisch (Pendelmobilität), erzwungen (Flucht 1944), bildung (Studium), lebensstil (Zürich wegen Ehemann).

---

## 2. Quellenbestand

436 Archiveinheiten (AUGIAS) in vier Bestandsgruppen:

| Bestandsgruppe | AUGIAS | Google Sheets (Feb 2026) | Signaturschema |
|---|---|---|---|
| Hauptbestand | 182 | 255 | UAKUG/NIM_XXX |
| Fotografien | 228 | (fehlt im Export) | UAKUG/NIM_FS_XXX |
| Plakate | 25 | 26 | UAKUG/NIM/PL_XX |
| Tonträger | 1 | 1 | UAKUG/NIM_TT_XX |

Hauptbestand-Systematikgruppen: 89 Berufliche Tätigkeit, 42 Dokumente, 31 Korrespondenzen, 16 Sammlungen.

---

## 3. Datenmodell (v2.3)

Dreischichtenmodell:

- **Schicht 1 (obligatorisch):** Kernmetadaten -- archivsignatur, titel, entstehungsdatum (ISO 8601), dokumenttyp, sprache, umfang. zugaenglichkeit und scan_status jetzt empfohlen statt obligatorisch.
- **Schicht 2 (empfohlen):** Verknüpfungen mit Folio-Granularität -- typ: person/ort/institution/ereignis/werk/detail/rolle/datum, jeweils mit Rolle und optionalem Folio.
- **Schicht 3 (fakultativ):** Quellentyp-spezifische Details via typ "detail" in der Verknüpfungstabelle.

### Google Sheets (7 Tabellen)

| Tabelle | Farbe | Records |
|---|---|---|
| M3GIM-Objekte | blau | 283 |
| M3GIM-Fotos | orange | fehlt im Export |
| M3GIM-Verknüpfungen | grün | 1.292 |
| Personenindex | violett | 296 |
| Organisationsindex | violett | 58 |
| Ortsindex | violett | 31 |
| Werkindex | violett | 95 |

### Folio-Granularität (v2.3 NEU)

Verknüpfungen referenzieren einzelne Seiten innerhalb von Sammlungsobjekten:
- NIM_003: 35 Verknüpfungen
- NIM_004: 795 Verknüpfungen auf 45 Folios
- NIM_007: 426 Verknüpfungen

### Komposit-Typen (v2.3 NEU)

Erfassungsteam nutzt zusammengesetzte Typen: `ort, datum` (48x), `ausgaben, waehrung` (11x), `einnahmen, waehrung` (8x), `ereignis, ort, datum` (1x). Pipeline decomponiert diese beim Import.

### Typ-Vokabular

Basis: person, ort, institution, ereignis, werk, detail. Neu in v2.3: rolle (215x), datum (74x). Komposit: ort,datum, ausgaben,waehrung, einnahmen,waehrung, summe,waehrung, ereignis,ort,datum, ensemble.

### Rollen-Vokabular (58 Werte)

Gender-inklusive `:in`-Form. Top-10: sänger:in (161), dirigent:in (36), pianist:in (7), komponist:in (5), regisseur:in (5).

### Dokumenttyp-Vokabular (19 Werte)

korrespondenz, vertrag, presse, programm, plakat, tontraeger, autobiografie, identitaetsdokument, studienunterlagen, repertoire, sammlung, foto, konzertprogramm, tagebuch, notizbuch, urkunde, zeugnis, lebenslauf, widmung.

### Entitätsindizes

| Index | Records | Wikidata | Besonderheiten |
|---|---|---|---|
| Personenindex | 296 | 3 (1%) | anmerkung als de-facto-Kategorie (257/296 kategorisiert) |
| Organisationsindex | 58 | 4 (7%) | Spaltennamen-Shift ("Graz" statt "name"), Doppel-IDs O43/O44 |
| Ortsindex | 31 | 0 (0%) | Kein ID-Header, keine Koordinaten, 6 fehlende Orte |
| Werkindex | 95 | 4 (4%) | Spaltennamen-Shift ("Rossini" statt "titel"), 10 ohne ID |

---

## 4. Technische Architektur

Dreistufig: Erfassung (Google Sheets) → Verarbeitung (Python 3.11+) → Präsentation (Vite v5 + D3.js v7, GitHub Pages).

### Pipeline (4 Python-Scripts)

1. **migrate.py:** AUGIAS-Export → formatierte Excel mit Dropdowns
2. **validate.py:** Datenqualitätsprüfung → validation-report.md
3. **create-ric-json.py:** Google Sheets → JSON-LD (RiC-O 1.1) → m3gim.jsonld
4. **build-views.py:** JSON-LD → 4 View-JSONs (partitur.json, matrix.json, kosmos.json, sankey.json)

### Pipeline-Anpassungen für v2.3

- **P1** Spaltennamen-Mapping: Organisationsindex "Graz"→"name", Werkindex "Rossini"→"titel"/"Barber"→"komponist", Ortsindex fehlender ID-Header
- **P2** Komposit-Typ-Decompose: `ort, datum` → separate Ort- + Datum-Verknüpfung
- **P3** Folio-Feld in JSON-LD aufnehmen
- **P4** Neue Typen `rolle` und `datum` verarbeiten
- **P5** Template-Zeile (archivsignatur="beispiel") filtern
- **P6** Robuster Date-Parser (ISO, Bereiche, Excel-Datetime-Artefakte)
- **P7** Personen-Kategorie aus Personenindex.anmerkung lesen (statt hardcoded)
- **P8** Duplicate-ID-Erkennung (O43/O44)
- **P9** Quellpfad: `data/google-spreadsheet/` statt `data/processed/`
- **P10** Fotos-Tabelle optional (graceful skip wenn fehlend)

### JSON-LD (RiC-O 1.1)

Namespaces: `rico:` (ICA RiC-O), `m3gim:` (Projektvokabular), `m3gim-dft:` (DocumentaryFormTypes).
Mapping: archivsignatur → rico:identifier, titel → rico:title, entstehungsdatum → rico:date, dokumenttyp → rico:hasDocumentaryFormType.

### Frontend

Vanilla JS (ES6-Module, kein Framework), D3.js v7 für alle Visualisierungen, Lucide Icons (CDN). Offline-first: alle Daten (~500KB) bei Startup geladen, kein Backend. CI/CD: GitHub Action triggert build-views.py bei Push, Deploy auf GitHub Pages.

---

## 5. Design-System: Scholarly Elegance

Drei Anforderungen: institutionelle Glaubwürdigkeit, kulturelle Resonanz, funktionale Klarheit.

### Farbsystem

- **Primär:** KUG-Blau `#004A8F` (7.2:1 Kontrast = AAA)
- **Archiv-Neutrals:** Paper `#FCFBF9`, Cream `#F7F5F2`, Parchment `#F0EDE8`, Sand `#E8E4DC`, Shadow `#C4BFB5`
- **Gold-Akzente:** Rich `#9A7B4F`, Medium `#C4A574`, Light `#E8DBC7`
- **Text:** Primary `#2C2825`, Secondary `#5C5651`, Tertiary `#8A857E`
- **Komponisten:** Wagner `#6B2C2C`, Verdi `#2C5C3F`, Strauss `#4A3A6B`, Gluck/Händel `#8B7355`, Beethoven `#4A5A7A`
- **Mobilität:** Erzwungen `#8B3A3A`, Geografisch `#3D7A5A`, Bildung `#B67D3D`, Lebensstil `#6B4E8C`, National `#4A6E96`
- **Personen-Kategorien:** Dirigent `#4A6E96`, Regisseur `#6B4E8C`, Vermittler `#3D7A5A`, Kollege `#9A6B3D`

### Typografie

- Inter (UI, 0.875rem/400)
- Source Serif 4 (Titel, 1.25rem/600)
- JetBrains Mono (Signaturen)

### Layout

Zwei-Bereiche-Architektur: ARCHIV (Tektonik-Sidebar 280px, Card Grid, Detail Modal 720px) und ANALYSE (4 D3.js-Vis, Document Panel 380px, Horizontal Toolbar). Spacing: 8px-Raster. WCAG 2.1 AA.

---

## 6. Visualisierungen

Vier D3.js-basierte Darstellungen, operieren auf vorberechneten View-JSONs.

### Mobilitäts-Partitur (Zeit, FF1--4)

6 Spuren auf gemeinsamer Zeitachse: (1) Lebensphasen LP1--LP7 (1919--2009), (2) Orte-Swimlane (Wohnorte oberhalb, Aufführungsorte unterhalb), (3) Mobilitäts-Spur (5 Migrationsereignisse farbkodiert), (4) Netzwerk-Aggregation (Balkendiagramm pro 5-Jahres-Periode), (5) Repertoire (Rollen als Balken nach Komponist), (6) Dokumente (Überlieferungsdichte). Fokus-Linie als zentrales Navigationsinstrument.

### Begegnungs-Matrix (Netzwerk, FF1/FF3)

Heatmap Person x 5-Jahres-Periode. Intensität = (Briefe x 3) + (Programme/Plakate x 2) + (Fotos x 1). 6-stufige Farbskala. Personen sortiert nach Kategorien. Kritische Lücke: Zeitfilter für Phasenvergleiche fehlt.

### Rollen-Kosmos (Repertoire, FF2)

Radiale Force-Graph. Zentrum: Malaniuk (50px). Mittlere Bahn: Komponisten. Äußere Bahn: Rollen. Click-to-Focus. Kritische Datenanforderung: Rollenname im Anmerkungsfeld der Werk-Verknüpfung.

### Karrierefluss (Korrelation, FF2/FF4)

Alluvial/Sankey: Phase → Repertoire → Ort. Schwächste Visualisierung, redundant mit Partitur und Kosmos. Empfehlung Iteration 2: Ablösung durch Leaflet-Karte (CartoDB Positron).

---

## 7. Forschungshypothesen

- **Wagner-Hypothese:** Malaniuk als primäre Wagner-Sängerin wahrgenommen, aber Daten zeigen differenzierteres Bild (Verdi als Karrierebasis, Wagner erst ab Bayreuth 1952).
- **Bayreuth-Netzwerk:** Bayreuther Kontakte zogen Engagements an Wiener und Münchner Staatsoper nach sich.
- **Vermittler-Frage:** Erik Werba als durchgehender Mediator über 30 Jahre (1945--1969).

---

## 8. Evaluation (Iteration 1)

| FF | Zielerreichung | Hauptlücke |
|---|---|---|
| FF1 Vernetzung | 70% | Zeitfilter in Matrix fehlt |
| FF2 Genre | 90% | Kosmos + Partitur bilden Repertoire ab |
| FF3 Wissenstransfer | 60% | Vermittler identifizierbar, Inhalte nicht kodiert |
| FF4 Mobilität | 85% | Kartendarstellung fehlt |

---

## 9. Architekturentscheidungen (25 final, 3 offen)

### Final

E-01 Vanilla JS, E-02 D3.js v7, E-03 Vite v5, E-04 Leaflet+CartoDB (deferred), E-05 Offline-first, E-06 Google Sheets, E-07 Wikidata Q-IDs, E-08 JSON-LD/RiC-O 1.1, E-09 Mobilitätsform-Präfix `[mobilität:]`, E-10 Synthetische Daten mit `_meta.synthetic`, E-11 Vier Visualisierungen, E-12 Netzwerk-Schwellenwert 3+, E-13 5-Jahres-Intervalle Matrix, E-14 Komponisten-Farbkodierung, E-15 7 Lebensphasen LP1--LP7, E-16 Scroll-Morphing Kosmos, E-17 Farbe+Linienstil Mobilität, E-18 Zwei-Bereiche-Architektur, E-19 Tektonik-Navigation, E-20 Side Panel + Modal, E-21 Collapsible Provenienz, E-22 Gruppierte Verknüpfungen mit Icons, E-23 Horizontale Toolbar, E-24 Export CSV>JSON-LD>GEXF>GeoJSON, E-25 Keine präemptive Performance-Optimierung.

### Offen

- Karrierefluss vs. Karte (mittel)
- Matrix Zeitfilter UI (hoch)
- Deep Linking (niedrig)

---

## 10. Technische Schulden

- app.js monolithisch (1.101 Zeilen)
- partitur.js monolithisch (4.460 Zeilen)
- Synthetische Daten noch präsent
- Kategoriefilter-HTML ohne JS-Binding
- Kein CSV/JSON-LD-Export aus Archiv-View
- Inline-CSS in partitur.js

### Verschobene Features (priorisiert)

| Priorität | Feature |
|---|---|
| Hoch | Matrix Zeitfilter |
| Hoch | Matrix Kategoriefilter aktivieren |
| Hoch | Export CSV/JSON-LD/GEXF |
| Mittel | Deep Linking |
| Mittel | Cross-Visualization Linking |
| Niedrig | Leaflet Karte |
| Niedrig | Kosmos Scroll-Morphing |

---

## 11. Datenqualität (Stand Februar 2026)

- **Datumsangaben:** 243/283 Objekte (86%), aber heterogene Formate (58 ISO, 142 Bereiche, ~43 Excel-Artefakte). Ein Verdacht: `2026-09-06` wahrscheinlich Typo für `1926-09-06`.
- **Personenkategorien:** 257/296 mit Kategorie im anmerkung-Feld, 80 verschiedene Werte (Normalisierung nötig: "Sänger" vs. "sänger:in" vs. "Sänger (Tenor)").
- **Wikidata:** Personenindex 3/296 (1%), Organisationsindex 4/58 (7%), Werkindex 4/95 (4%), Ortsindex 0/31 (0%). De facto nicht begonnen.
- **Ortsindex:** Keine Koordinaten, 6 Orte aus Organisationsindex fehlen.
- **Organisationsindex:** Duplicate IDs O43/O44, 3 Rows ohne ID.
- **Werkindex:** 10 Einträge ohne ID, Komponisten-Schreibweise inkonsistent.
- **Bearbeitungsstand:** 9 verschiedene Schreibweisen für 3 logische Werte ("in Bearbeitung"/"In Bearbeitung"/"Bearbeitung").
- **Fotos-Tabelle:** Fehlt im Google-Sheets-Export (228 Records betroffen).

---

## 12. Prozesswissen (Iteration 1)

### Was funktioniert hat

- Promptotyping-Dokumente als Source of Truth (9 Knowledge-Docs → Code-Generierung)
- Synthetische Daten entkoppeln Frontend- von Datenarbeit
- Design-System als CSS Custom Properties vorab definiert
- Offline-first überlebt Funding-Gaps
- Iterative Vis-Entwicklung (Partitur zuerst → Patterns für Matrix/Kosmos/Karrierefluss)

### Was in Iteration 2 anders

- Data-first statt UI-first
- Modularisierung von Anfang an
- User Testing früher
- Evaluation-driven Priorisierung (FF3=60% braucht Aufmerksamkeit)
- Controlled Vocabulary Enforcement bei Datenerfassung

### Positive Überraschungen aus der Datenanalyse

- Erschließungstiefe bei 3 Sammlungsobjekten (1.256 Verknüpfungen) übertrifft Erwartungen
- Gender-inklusives Rollen-Vokabular (58 Werte mit `:in`-Form) zeigt sorgfältige Erfassung
- 257/296 Personen mit Kategorie -- Begegnungs-Matrix bekommt direkt Daten
- 134 Werk-Verknüpfungen ermöglichen substantiellen Rollen-Kosmos

---

## 13. Meilensteine

| Zeitraum | Meilenstein | Status |
|---|---|---|
| 23. Jan 2026 | Erfassungsworkshop im Archiv | done |
| Jan--Feb 2026 | Promptotyping Iteration 1 | done |
| 18. Feb 2026 | Wissens-Destillation Iteration 1 → Vault | done |
| 18. Feb 2026 | Google-Sheets-Analyse, Datenmodell v2.3 | done |
| 21. Feb 2026 | Konvolut-Lieferung | pending |
| 24. Feb 2026 | Meeting: Datenerfassung, Modellierung, Workflows | pending |
| Mär--Apr 2026 | Pipeline-Anpassung, Datenmodell-Finalisierung, Start Erfassung | planned |
| Mai--Jun 2026 | Promptotyping Iteration 2, Frontend-Entwicklung | planned |
| Sep 2026 | Arbeitsgespräch mit externen Expert*innen | planned |
| Mär 2027 | Website-Veröffentlichung | planned |

---

## 14. Dokumentation (Vault-Verweise)

Die kanonische Projektdokumentation liegt im Obsidian-Vault unter `Projects/M³GIM/`:

| Dokument | Version | Inhalt |
|---|---|---|
| Project Overview M³GIM | v3.1 | Strategische Referenz, Forschungsfragen, Arbeitsprogramm |
| M³GIM Datenmodell und Erfassungsrichtlinien | v2.3 | Feldkatalog, Verknüpfungsregeln, Vokabulare, Folio-Granularität |
| M³GIM Technische Dokumentation | v2.1 | Pipeline, JSON-LD, CI/CD, View-Datenformate |
| M³GIM Design-System | v1.0 | Scholarly Elegance, Farbsystem, Typografie |
| M³GIM Visualisierungen | v1.0 | 4 D3.js-Vis, Datenstrukturen, Evaluierung |
| M³GIM Entscheidungen | v1.0 | 27 Architektur- und Design-Entscheidungen |
| M³GIM Iteration 1 Learnings | v1.1 | Prozesswissen, technische Schulden, Datenanalyse-Erkenntnisse |
