# Datenmodell

> Ontologie, Schichtenmodell, Verknuepfungslogik, RiC-O-Mapping, partitur.json-Schema und kontrollierte Vokabulare.

## Schichtenmodell

- **Schicht 1 (Kernmetadaten):** Signatur, Titel, Datum, Dokumenttyp, Sprache, Umfang, Bearbeitungsstand
- **Schicht 2 (Verknuepfungen):** Person, Ort, Institution, Werk, Rolle, Datum, Ereignis, Ensemble
- **Schicht 3 (Erweiterung):** Detail-Relationen (Honorar, Nebenleistungen, Gagen), projektspezifische Kontextangaben

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

- Objektidentitaet: `archivsignatur` + optionales Folio (2 Spalten)
- Konvolute als aggregierende Einheiten (`rico:RecordSet`), Kinder auf Folio-Ebene (`rico:Record`)
- Verknuepfungen haengen an der granularsten verfuegbaren Ebene (Folio oder Konvolut)
- 255 Hauptbestand-Eintraege sind Konvolute (physische Umschlaege). Nur NIM_003, NIM_004, NIM_007 haben bisher erschlossene Einzelstuecke
- 3 Bestandsgruppen: Hauptbestand (255), Plakate (26), Tontraeger (1) = 282 Objekte

## Verknuepfungsmechanismus

Zuordnung datenpraktisch ueber String-Matching in der `name`-Spalte. Feld `typ` steuert den Zielkontext:

| typ | Ziel | Pipeline-Status |
|-----|------|-----------------|
| person | Personenindex | implementiert (Agent/Mention) |
| institution | Organisationsindex | implementiert (Agent/Mention) |
| ort | Ortsindex | implementiert |
| werk | Werkindex | implementiert |
| ereignis | PerformanceEvent | implementiert |
| detail | DetailAnnotation | implementiert |
| rolle, datum | direkte Kontextverarbeitung | implementiert |
| ensemble | direkte Kontextverarbeitung | niedrige Prio |

### Rollentabelle (Quelle: Handreichung)

| typ | Moegliche Rollen |
|-----|-----------------|
| person | verfasser, adressat, erwaehnt, vertragspartner, unterzeichner, abgebildet |
| ort | entstehungsort, zielort, erwaehnt, auffuehrungsort, wohnort, vertragsort |
| institution | vertragspartner, arbeitgeber, veranstalter, vermittler, adressat, erwaehnt |
| ereignis | rahmenveranstaltung, premiere, auftritt, probe, implizit |
| werk | interpretin (→ Pipeline mappt auf auffuehrung/erwaehnt) |
| detail | [Feldname frei waehlbar]: honorar, nebenleistungen, einnahme, waehrung |

## Datumskonventionen

### Formate

| Situation | Format | Beispiel |
|-----------|--------|----------|
| Vollstaendig | YYYY-MM-DD | 1958-04-18 |
| Nur Monat | YYYY-MM | 1958-04 |
| Nur Jahr | YYYY | 1958 |
| Zeitspanne | YYYY-MM-DD/YYYY-MM-DD | 1958-08-10/1958-09-09 |
| Zeitspanne nur Jahre | YYYY/YYYY | 1945/1947 |

### Qualifier fuer unsichere Datierungen

| Qualifier | Bedeutung | Beispiel |
|-----------|-----------|----------|
| circa: | Ungefaehre Datierung | circa:1958 |
| vor: | Terminus ante quem | vor:1958 |
| nach: | Terminus post quem | nach:1958 |
| [leer] | Undatiert | |

### Datierungsevidenz

| Wert | Bedeutung |
|------|-----------|
| aus_dokument | Datum steht explizit im Dokument |
| erschlossen | Datum aus Kontext abgeleitet |
| extern | Datum aus anderer Quelle ermittelt |
| unbekannt | Keine Datierung moeglich |

Pipeline-Status: Als `m3gim:dateEvidence` in JSON-LD uebernommen.

## RiC-O und m3gim-Erweiterung

### RiC-O Kern

- Hierarchie: `rico:RecordSet` (Konvolut/Fonds), `rico:Record` (Einzelstueck)
- Beschreibung: `rico:identifier`, `rico:title`, `rico:date`, `rico:hasExtent`, `rico:hasOrHadLanguage`, `rico:generalDescription`
- Relationen: `rico:hasOrHadLocation`, `rico:hasOrHadSubject`
- Agenten-Typen: `rico:Person`, `rico:CorporateBody`, `rico:Group`

### m3gim-Erweiterung

Namespace: `https://dhcraft.org/m3gim/vocab#` (Prefix: `m3gim`)

RiC-O deckt archivalische Erschliessung ab, nicht aber: inhaltliche Rollen, Musikwerke, Auffuehrungen und Bearbeitungsstand.

**Klassen:**

| Klasse | Oberklasse | Zweck |
|--------|-----------|-------|
| `m3gim:MusicalWork` | `rico:Thing` | Musikalisches Werk (Oper, Lied, Konzert) |
| `m3gim:Performance` | `rico:Event` | Auffuehrungsereignis mit Werk, Ort, Mitwirkenden |
| `m3gim:PerformanceEvent` | `rico:Event` | Rahmenveranstaltung: Festspiele, Premieren, Gastspiele |
| `m3gim:DetailAnnotation` | — | Finanzielle/vertragliche Details (Schicht 3) |

**Object Properties:**

| Property | Domain → Range | Zweck |
|----------|---------------|-------|
| `m3gim:hasAssociatedAgent` | Record → Person/CorporateBody | Agenten-Verknuepfung (E-31: rico:hasOrHadAgent existiert nicht) |
| `m3gim:hasPerformer` | — | Person wirkt bei Auffuehrung mit |
| `m3gim:performanceOf` | — | Auffuehrung eines Werks |
| `m3gim:hasPerformanceRole` | — | Konkrete Buehnenrolle (z.B. Orpheus) |
| `m3gim:hasDetail` | — | Verweis auf DetailAnnotation |

**Datatype Properties:**

| Property | Typ | Zweck |
|----------|-----|-------|
| `m3gim:bearbeitungsstand` | xsd:string | Projektinterner Status |
| `m3gim:dateEvidence` | xsd:string | Herkunft der Datierung |
| `m3gim:eventDate` | xsd:string | Datum als Literal (E-33: rico:isAssociatedWithDate ist ObjectProperty) |

**Erwaehnung:** Inhaltlich erwaehnete Personen/Institutionen als `rico:hasOrHadSubject` mit `@type: rico:Person` (E-32: standard RiC-O statt custom `m3gim:mentions`).

### PerformanceRoles (11 Werte, SKOS ConceptScheme)

| Kategorie | Rollen |
|---|---|
| Archivalisch-inhaltlich | erwaehnt, absender, empfaenger, widmungsempfaenger |
| Kuenstlerisch | dirigent, solistin, regisseur, komponist, saenger |
| Institutionell | intendant, mitglied |

### DocumentaryFormTypes (25 Werte, SKOS ConceptScheme)

brief, vertrag, programmheft, plakat, kritik, fotografie, telegramm, postkarte, urkunde, zeitungsausschnitt, notiz, biographie, visitenkarte, quittung, typoskript, photokopie, rezension, tagebuch, lebenslauf, ausweis, noten, sonstiges, konvolut, tontraeger, dokument

### JSON-LD Context

7 Prefixe: rico, m3gim, m3gim-dft, m3gim-role, wd, skos, xsd.
3 Aliase: `name` → `rico:name`, `role` → `m3gim:role`, `komponist` → `m3gim:komponist` (E-34).

## partitur.json (Biografische Masterdaten)

Manuell kuratierte Datenquelle fuer die Mobilitaet-Ansicht. Von `build-views.py` erzeugt, von `mobilitaet.js` konsumiert.

```
{
  lebensphasen: [{ id, label, von, bis, ort, beschreibung }],      // 7 (LP1-LP7)
  orte: [{ ort, typ: "wohnort"|"auffuehrungsort", von, bis }],     // 8
  mobilitaet: [{ von, nach, jahr, form, beschreibung }],            // 5 Pfeile
  netzwerk: [{ periode, intensitaet }],                              // 7 Perioden
  repertoire: [{ komponist, farbe, von, bis, dokumente, dokumente_liste }],
  dokumente: [{ jahr, anzahl }],
  _meta: { generated, source_records }
}
```

Gastspiel-Daten kommen NICHT aus partitur.json, sondern werden zur Laufzeit aus `store.locations` extrahiert (Rollen: auffuehrungsort, gastspiel, auffuehrung, spielzeit).

## Epistemologische Dreispalten-Analyse

Die Wissensquellen (Antrag, Handreichung) lassen sich in drei epistemische Ebenen gliedern:

1. **Kontextwissen** (Theorie, Methodik, Forschungsstand) — rahmt das Projekt, fliesst nicht direkt in die Datenmodellierung → `forschung.md`
2. **Kerndokument** (Projektbrief, Arbeitsprogramm, Technik) — steuert das Projekt, muss praezise abgebildet sein → `projekt-status.md`, `pipeline.md`
3. **Entitaeten und Verknuepfungen** (Personen, Orte, Werke, Ereignisse) — wird direkt operationalisiert, definiert die Datenstruktur → diese Datei

Alle 8 Entitaetstypen (Person, Institution, Ort, Werk, Rolle, Datum, Ereignis, Detail) sind pipeline-faehig implementiert. Einzige Ausnahme: Ensemble (niedrige Prioritaet).

## Kontrollierte Vokabulare

### Normalisierung (Pipeline-seitig)

- Case- und Whitespace-Normalisierung (`lower().strip()`)
- Excel-Datetime-Artefakte bereinigt (Zeitanteil `00:00:00` abstreifen)
- Komposit-Typen dekomponiert (z.B. `ort, datum` → separate Relationen)
- Header-Shift-Abfederung in Org/Ort/Werk-Index
- Wikidata-URI-Validierung (nur `^Q\d+$` bekommt `wd:`-Prefix)

### Namenskonventionen (Quelle: Handreichung)

- **Personen:** Nachname, Vorname ("Malaniuk, Ira"). Adelstitel nachgestellt ("Karajan, Herbert von").
- **Orte:** Gebraeuchlicher deutscher Name. Historische Ortsnamen aus der Quelle ("Lemberg" statt "Lwiw").
- **Institutionen:** Offizielle Bezeichnung ohne Rechtsform ("Bayerische Staatsoper").
- **Werke:** Titel aus der Quelle, Komponist als Zusatzfeld.

### Erfassungsstatus

Drei parallele Systeme (zu vereinheitlichen):

| Quelle | Werte |
|--------|-------|
| Handreichung (Soll) | in_bearbeitung, schicht1_fertig, schicht2_fertig, abgeschlossen |
| Pipeline (transform.py) | begonnen, abgeschlossen, zurueckgestellt |
| Meeting-Doku | vollstaendig, in bearbeitung, offen |

Empfehlung: Handreichungs-System (4 Werte, bildet Schichtfortschritt ab).

## Offene Fragen

- Transliteration ukrainischer Namen — welcher Standard?
- Titelbildung — wie viel Normierung, wie viel Quellennaehe?
- Fremdsprachige Dokumente — Titel auf Deutsch oder Originalsprache?
- Vier-Augen-Prinzip bei der Erfassung?
