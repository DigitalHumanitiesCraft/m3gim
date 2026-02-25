# Datenmodell und Ontologie

> Kanonische Quelle fuer Schichtenmodell, Verknuepfungslogik, RiC-O-Mapping, kontrollierte Vokabulare und Erfassungskonventionen.

## Schichtenmodell

- **Schicht 1 (Kernmetadaten):** Signatur, Titel, Datum, Dokumenttyp, Sprache, Umfang, Bearbeitungsstand
- **Schicht 2 (Verknuepfungen):** Person, Ort, Institution, Werk, Rolle, Datum, Ereignis, Ensemble
- **Schicht 3 (Erweiterung):** Detail-Relationen (Honorar, Nebenleistungen, Gagen) und projektspezifische Kontextangaben

## Tabellenmodell (Google Sheets)

| Tabelle | Funktion |
|---|---|
| M3GIM-Objekte | Primaere Record-Metadaten (Schicht 1) |
| M3GIM-Verknuepfungen | Kontext- und Entitaetsrelationen (Schicht 2 + 3) |
| Personenindex | Personen-Normdaten (Name, Lebensdaten, Wikidata-ID) |
| Organisationsindex | Organisations-Normdaten |
| Ortsindex | Ortsdaten |
| Werkindex | Werknachweise (Titel, Komponist, Wikidata-ID) |

## Konvolut- und Objektlogik

- Objektidentitaet nutzt `archivsignatur` plus optionales Folio.
- Konvolute werden als aggregierende Einheiten modelliert (`rico:RecordSet`), Kinder auf Folio-Ebene (`rico:Record`).
- Verknuepfungen haengen an der granularsten verfuegbaren Ebene (Folio oder Konvolut).
- Alle 255 Hauptbestand-Eintraege sind Konvolute (physische Umschlaege). Nur 3 (NIM_003, NIM_004, NIM_007) haben bisher erschlossene Einzelstuecke.

## Verknuepfungsmechanismus

- Die Zuordnung erfolgt datenpraktisch ueber String-Matching in `name`.
- `typ` steuert den Zielkontext:
  - `person` → Personenindex
  - `institution` → Organisationsindex
  - `ort` → Ortsindex
  - `werk` → Werkindex
  - `rolle`, `datum` → direkte Kontextverarbeitung
  - `ereignis` → Eventverarbeitung (definiert in Handreichung, Pipeline-Implementierung ab Session 14)
  - `ensemble` → direkte Kontextverarbeitung
  - `detail` → Schicht-3-Relationen (definiert in Handreichung, Pipeline-Implementierung ab Session 14)

### Vollstaendige Rollentabelle (Quelle: Handreichung)

| typ | Moegliche Rollen | Pipeline-Status |
|-----|-----------------|-----------------|
| person | verfasser, adressat, erwaehnt, vertragspartner, unterzeichner, abgebildet | implementiert (als Agent/Mention) |
| ort | entstehungsort, zielort, erwaehnt, auffuehrungsort, wohnort, vertragsort | implementiert |
| institution | vertragspartner, arbeitgeber, veranstalter, vermittler, adressat, erwaehnt | implementiert (als Agent/Mention) |
| ereignis | rahmenveranstaltung, premiere, auftritt, probe, implizit | implementiert (als m3gim:PerformanceEvent) |
| werk | interpretin | implementiert (als auffuehrung/erwaehnt) |
| detail | [Feldname frei waehlbar]: honorar, nebenleistungen, einnahme, waehrung | implementiert (als m3gim:DetailAnnotation) |

**Anmerkung Werk-Rolle:** Handreichung definiert "interpretin" (Malaniuk-zentriert), Pipeline mappt auf "auffuehrung" vs. "erwaehnt" (Dokument-zentriert). Beide Perspektiven sind gueltig.

## Datumskonventionen (Quelle: Handreichung)

### Formate

| Situation | Format | Beispiel |
|-----------|--------|----------|
| Vollstaendiges Datum | YYYY-MM-DD | 1958-04-18 |
| Nur Monat bekannt | YYYY-MM | 1958-04 |
| Nur Jahr bekannt | YYYY | 1958 |
| Zeitspanne | YYYY-MM-DD/YYYY-MM-DD | 1958-08-10/1958-09-09 |
| Zeitspanne nur Jahre | YYYY/YYYY | 1945/1947 |

### Qualifier fuer unsichere Datierungen

| Qualifier | Bedeutung | Beispiel |
|-----------|-----------|----------|
| circa: | Ungefaehre Datierung | circa:1958 |
| vor: | Terminus ante quem | vor:1958 |
| nach: | Terminus post quem | nach:1958 |
| [leer] | Undatiert (kein Datum ermittelbar) | |

### Datierungsevidenz

Feld in der Erfassungstabelle, das die Qualitaet der Datierung dokumentiert:

| Wert | Bedeutung |
|------|-----------|
| aus_dokument | Datum steht explizit im Dokument |
| erschlossen | Datum aus Kontext abgeleitet (Poststempel, Briefkopf, Ereignisbezug) |
| extern | Datum aus anderer Quelle ermittelt |
| unbekannt | Keine Datierung moeglich |

**Pipeline-Status:** Datierungsevidenz wird als `m3gim:dateEvidence` in die JSON-LD-Transformation uebernommen.

## Erfassungsstatus

### IST-Zustand: Drei parallele Systeme (zu vereinheitlichen)

| Quelle | Werte |
|--------|-------|
| Handreichung (Soll) | in_bearbeitung, schicht1_fertig, schicht2_fertig, abgeschlossen |
| Pipeline (transform.py) | begonnen, abgeschlossen, zurueckgestellt |
| Meeting-Doku (Vorschlag) | vollstaendig, in bearbeitung, offen |

**Empfehlung:** Auf das Handreichungs-System vereinheitlichen (4 Werte, da es den Schichtfortschritt abbildet). Pipeline-Mapping entsprechend anpassen.

## RiC-O und m3gim-Erweiterung

### RiC-O Kern

- Hierarchie: `rico:RecordSet` (Konvolut/Fonds), `rico:Record` (Einzelstueck), Teil-Ganzes-Beziehungen
- Beschreibung: `rico:identifier`, `rico:title`, `rico:date`, `rico:hasExtent`, `rico:hasOrHadLanguage`, `rico:generalDescription`
- Relationen: `rico:hasOrHadLocation`, `rico:hasOrHadSubject` (+ projektspezifisch `m3gim:hasAssociatedAgent`)
- Agenten-Typen: `rico:Person`, `rico:CorporateBody`, `rico:Group`

### m3gim-Erweiterung

Namespace: `https://dhcraft.org/m3gim/vocab#` (Prefix: `m3gim`)

RiC-O deckt archivalische Erschliessung ab, nicht aber: inhaltliche Rollen (wer wird im Dokument erwaehnt, wer hat dirigiert), Musikwerke (kein Typ fuer kuenstlerische Werke), Auffuehrungen (spezifische Events mit Rollen und Programm) und Bearbeitungsstand (Workflow-Status).

**Klassen:**

- `m3gim:MusicalWork` (Oberklasse: `rico:Thing`) — Musikalisches Werk (Oper, Lied, Konzert). Identifikation ueber `rico:identifier` (Wikidata-URI), Bezeichnung ueber `rico:title`.
- `m3gim:Performance` (Oberklasse: `rico:Event`) — Auffuehrungsereignis. Verknuepft mit Werk (`m3gim:performanceOf`), Ort (`rico:hasOrHadLocation`), Datum (`m3gim:eventDate`), Mitwirkende (`m3gim:hasPerformer`).
- `m3gim:PerformanceEvent` (Oberklasse: `rico:Event`) — Rahmenveranstaltung: Festspiele, Premieren, Gastspiele. Karrierestationen unabhaengig von einzelnen Dokumenten.
- `m3gim:DetailAnnotation` — Finanzielle und vertragliche Details (Honorar, Nebenleistungen, Gagen). Schicht-3-Erweiterung.

**Object Properties:**

- `m3gim:hasAssociatedAgent` — Agenten-Verknuepfung (ersetzt nicht-existentes `rico:hasOrHadAgent`). Domain: Record, Range: Person/CorporateBody/Group.
- `m3gim:hasPerformer` — Person wirkt bei Auffuehrung mit
- `m3gim:performanceOf` — Auffuehrung eines bestimmten Werks
- `m3gim:hasPerformanceRole` — Konkrete Buehnenrolle (z.B. Orpheus, Bruennhilde)
- `m3gim:hasDetail` — Verweis auf finanzielle/vertragliche Details

**Datatype Properties:**

- `m3gim:bearbeitungsstand` — Projektinterner Bearbeitungsstand (xsd:string)
- `m3gim:dateEvidence` — Herkunft der Datierung: aus_dokument, erschlossen, extern, unbekannt (xsd:string)
- `m3gim:eventDate` — Datum eines Ereignisses als Literal (xsd:string). Ersetzt `rico:isAssociatedWithDate`, das in RiC-O 1.1 eine ObjectProperty mit Range `rico:Date` ist und daher nicht fuer String-Literale geeignet.

**Erwaehnung als Subject (kein eigenes Property):**

Inhaltlich erwaehnete Personen/Institutionen werden als `rico:hasOrHadSubject` mit `@type: rico:Person` modelliert (RiC-O-konform, domain: RecordResource, range: Thing). Das fruehere `m3gim:mentions` wurde zugunsten dieses Standardansatzes entfernt.

**11 PerformanceRoles** (SKOS ConceptScheme, Namespace `m3gim-role`):

| Kategorie | Rollen |
|---|---|
| Archivalisch-inhaltlich | erwaehnt, absender, empfaenger, widmungsempfaenger |
| Kuenstlerisch | dirigent, solistin, regisseur, komponist, saenger |
| Institutionell | intendant, mitglied |

**25 DocumentaryFormTypes** (SKOS ConceptScheme, Namespace `m3gim-dft`):
brief, vertrag, programmheft, plakat, kritik, fotografie, telegramm, postkarte, urkunde, zeitungsausschnitt, notiz, biographie, visitenkarte, quittung, typoskript, photokopie, rezension, tagebuch, lebenslauf, ausweis, noten, sonstiges, konvolut, tontraeger, dokument

**JSON-LD Context (7 Prefixe + 3 Aliase):**

| Prefix | Namespace |
|---|---|
| rico | `https://www.ica.org/standards/RiC/ontology#` |
| m3gim | `https://dhcraft.org/m3gim/vocab#` |
| m3gim-dft | `https://dhcraft.org/m3gim/documentaryFormTypes#` |
| m3gim-role | `https://dhcraft.org/m3gim/roles#` |
| wd | `http://www.wikidata.org/entity/` |
| skos | `http://www.w3.org/2004/02/skos/core#` |
| xsd | `http://www.w3.org/2001/XMLSchema#` |

**@context-Aliase** (kurze JSON-Keys bei semantischer Korrektheit):

| Alias | Expandiert zu |
|---|---|
| `name` | `rico:name` |
| `role` | `m3gim:role` |
| `komponist` | `m3gim:komponist` |

**Was kommt woher:**

- RiC-O liefert: Bestand/Konvolut/Folio-Hierarchie, archivalische Beschreibung, Orts-/Datumsverknuepfung (`rico:hasOrHadLocation`, `rico:date`), thematische Verknuepfung (`rico:hasOrHadSubject`), Dokumenttyp-Zuordnung, Typisierung (`rico:Place`, `rico:Person`)
- m3gim ergaenzt: Agenten-Verknuepfung (`m3gim:hasAssociatedAgent`), Ereignisdaten als Literale (`m3gim:eventDate`), Inhaltliche Rollen, Musikwerke, Auffuehrungen, 25 Dokumenttypen, Bearbeitungsstand

### Implementiert (seit Iteration 2)

- **Ereignisse:** `m3gim:PerformanceEvent` (Subklasse von `rico:Event`). Pipeline verarbeitet `typ: ereignis` mit Rollen (rahmenveranstaltung, premiere, auftritt, probe, implizit).
- **Details (Schicht 3):** `m3gim:DetailAnnotation` mit `m3gim:hasDetail`. Pipeline verarbeitet `typ: detail` (Feldname in `name`, Wert in `rolle`).
- **Datierungsevidenz:** `m3gim:dateEvidence` (aus_dokument, erschlossen, extern, unbekannt).

## Kontrollierte Vokabulare und Normalisierung

### Praktisch relevante Normalisierung

- Case- und Whitespace-Normalisierung (`lower().strip()`)
- Bereinigung von Excel-Datetime-Artefakten (Zeitanteil `00:00:00` abstreifen)
- Dekomposition von Komposit-Typen (z.B. `ort, datum` → separate Ort- und Datum-Relationen)
- Header-Shift-Abfederung in betroffenen Indextabellen (Org, Ort, Werk)
- Wikidata-URI-Validierung (nur Werte mit Pattern `^Q\d+$` bekommen `wd:`-Prefix)

### Betriebsrelevante Vokabularfelder

- Dokumenttyp (25 normalisierte Werte)
- Bearbeitungsstand (3 Pipeline-Werte, 4 Handreichungs-Werte — zu vereinheitlichen)
- Verknuepfungstyp (person, institution, ort, werk, rolle, datum, ereignis, ensemble, detail)
- Rollenwerte (je nach Verknuepfungstyp, siehe Rollentabelle oben)

### Namenskonventionen (Quelle: Handreichung)

- **Personen:** Nachname, Vorname (z.B. "Malaniuk, Ira"). Adelstitel nachgestellt ("Karajan, Herbert von").
- **Orte:** Gebraeuchlicher deutscher Name. Historische Ortsnamen aus der Quelle verwenden ("Lemberg" statt "Lwiw").
- **Institutionen:** Offizielle Bezeichnung ohne Rechtsform ("Bayerische Staatsoper", nicht "...GmbH").
- **Werke:** Titel aus der Quelle, Komponist als Zusatzfeld.

## partitur.json (Biografische Masterdaten)

Manuell kuratierte Datenquelle fuer die Mobilitaet-Ansicht. Wird von `build-views.py` erzeugt und von `mobilitaet.js` konsumiert.

```
{
  lebensphasen: [                    // 7 Eintraege (LP1–LP7)
    { id, label, von, bis, ort, beschreibung }
  ],
  orte: [                            // 8 Eintraege (5 Wohnorte + 3 Auffuehrungsorte)
    { ort, typ: "wohnort"|"auffuehrungsort", von, bis }
  ],
  mobilitaet: [                      // 5 Bewegungsereignisse
    { von, nach, jahr, form: "erzwungen"|"geografisch"|"lebensstil", beschreibung }
  ],
  netzwerk: [{ periode, intensitaet }],  // 7 Fuenfjahresperioden
  repertoire: [{ komponist, farbe, von, bis, dokumente, dokumente_liste }],
  dokumente: [{ jahr, anzahl }],     // Dokumentverteilung pro Jahr
  _meta: { generated, source_records }
}
```

Gastspiel-Daten kommen NICHT aus partitur.json, sondern werden zur Laufzeit aus `store.locations` extrahiert (Rollen: auffuehrungsort, gastspiel, auffuehrung, spielzeit).

## Datenqualitaetsvertrag

- Pipeline-seitige Korrekturen ersetzen keine Erfassungspflege.
- Kritische Datenverluste (fehlende Signatur/Typ) muessen in den Quelltabellen behoben werden.
- Diese Datei definiert Modell- und Verarbeitungslogik; Priorisierung der Behebung steht in `knowledge/Prozess/Operativer Plan.md`.

## Offene Fragen

- Transliteration ukrainischer Namen — welcher Standard? (ISO 9, wissenschaftliche Transliteration, vereinfachte Umschrift)
- Titelbildung — wie viel Normierung, wie viel Quellennaehe?
- Fremdsprachige Dokumente — Titel auf Deutsch oder Originalsprache?
- Vier-Augen-Prinzip bei der Erfassung?
