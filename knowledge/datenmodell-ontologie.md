# Datenmodell und Ontologie

> Kanonische Quelle fuer Schichtenmodell, Verknuepfungslogik, RiC-O-Mapping und kontrollierte Vokabulare.

## Schichtenmodell

- **Schicht 1 (Kernmetadaten):** Signatur, Titel, Datum, Dokumenttyp, Sprache, Umfang
- **Schicht 2 (Verknuepfungen):** Person, Ort, Institution, Werk, Rolle, Datum, Ereignis, Ensemble
- **Schicht 3 (Erweiterung):** Detailrelationen und projektspezifische Kontextangaben

## Tabellenmodell (Google Sheets)

| Tabelle | Funktion |
|---|---|
| M3GIM-Objekte | Primare Record-Metadaten |
| M3GIM-Verknuepfungen | Kontext- und Entitaetsrelationen |
| Personenindex | Personen-Normdaten |
| Organisationsindex | Organisations-Normdaten |
| Ortsindex | Ortsdaten |
| Werkindex | Werknachweise |

## Konvolut- und Objektlogik

- Objektidentitaet nutzt `archivsignatur` plus optionales Folio.
- Konvolute werden als aggregierende Einheiten modelliert, Kinder auf Folio-Ebene.
- Verknuepfungen haengen an der granularsten verfuegbaren Ebene (Folio oder Konvolut).

## Verknuepfungsmechanismus

- Die Zuordnung erfolgt datenpraktisch ueber String-Matching in `name`.
- `typ` steuert den Zielkontext:
  - `person` -> Personenindex
  - `institution` -> Organisationsindex
  - `ort` -> Ortsindex
  - `werk` -> Werkindex
  - `rolle`, `datum`, `ereignis`, `ensemble` -> direkte Kontextverarbeitung

## RiC-O und m3gim-Erweiterung

### RiC-O Kern

- Hierarchie: `rico:RecordSet`, `rico:Record`, Teil-Ganzes-Beziehungen
- Beschreibung: `rico:identifier`, `rico:title`, `rico:date`, `rico:hasExtent`
- Relationen: `rico:hasOrHadAgent`, `rico:hasOrHadLocation`, `rico:hasOrHadSubject`

### m3gim-Erweiterung

- Projektspezifische Konzepte fuer Musikwerke, Rollen und Bearbeitungsstand
- Eigene Vokabularraeume fuer Rollen und Dokumenttypen
- Erweiterung dort, wo RiC-O fachlich nicht ausreicht (inhaltliche Rollen, Performanzbezug)

## Kontrollierte Vokabulare und Normalisierung

### Praktisch relevante Normalisierung

- Case- und Whitespace-Normalisierung (`lower().strip()`)
- Bereinigung von Excel-Datetime-Artefakten
- Dekomposition von Komposit-Typen (z. B. `ort, datum`)
- Header-Shift-Abfederung in betroffenen Indextabellen

### Betriebsrelevante Vokabularfelder

- Dokumenttyp
- Bearbeitungsstand
- Verknuepfungstyp
- Rollenwerte

## Datenqualitaetsvertrag

- Pipeline-seitige Korrekturen ersetzen keine Erfassungspflege.
- Kritische Datenverluste (fehlende Signatur/Typ) muessen in den Quelltabellen behoben werden.
- Diese Datei definiert Modell- und Verarbeitungslogik; Priorisierung der Behebung steht in `knowledge/operativer-plan-claude.md`.
