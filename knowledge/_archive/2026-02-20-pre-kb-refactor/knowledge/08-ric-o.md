# RiC-O 1.1 Referenz

> Records in Contexts Ontology — OWL-2-Ontologie fuer archivalische Erschliessung als Linked Data

Quelle: [ICA RiC-O v1.1](https://www.ica.org/standards/RiC/RiC-O_1-1.html) (Mai 2025), [GitHub](https://github.com/ICA-EGAD/RiC-O)

---

## Was ist RiC-O?

RiC-O ist die formale OWL-2-Ontologie des ICA-Standards "Records in Contexts" (RiC). Sie ersetzt die aelteren Standards ISAD(G), ISAAR(CPF), ISDF und ISDIAH. RiC-O ermoeglicht archivalische Beschreibung als Linked Data (RDF/JSON-LD).

RiC-O 1.1 definiert: 107 Klassen, 75 Datatype Properties, 480 Object Properties.

---

## Klassenhierarchie

Alles erbt von `rico:Thing`.

### RecordResource (Archivgut)

- **rico:RecordResource** — Oberbegriff fuer alles Archivgut
  - **rico:Record** — Einzelnes Archivale (Brief, Vertrag, Tagebuch)
  - **rico:RecordPart** — Teil eines Records (Seite, Folio, Abschnitt)
  - **rico:RecordSet** — Aggregation (Bestand, Serie, Akte, Sammlung, Konvolut)

RecordSets koennen RecordSets enthalten (Bestand > Serie > Akte). Records koennen RecordParts enthalten. Die Hierarchie wird ueber `rico:hasOrHadPart` / `rico:isOrWasPartOf` modelliert.

### Agent (Akteure)

- **rico:Agent** — Handelnde Entitaet
  - **rico:Person** — Natuerliche Person
  - **rico:CorporateBody** — Koerperschaft (Organisation mit Rechtsstatus)
  - **rico:Group** — Organisierte Gruppe
  - **rico:Position** — Funktion/Rolle in einer Organisation
  - **rico:Mechanism** — Technisches System

### Weitere Klassen

- **rico:Place** — Ort (mit Unterklasse rico:PhysicalLocation fuer Koordinaten)
- **rico:Activity** — Zweckgebundene Handlung
- **rico:Event** — Ereignis als zeitlicher Marker
- **rico:Rule** — Norm, Richtlinie
- **rico:Instantiation** — Physische/digitale Auspraegung eines RecordResource
- **rico:Date** — Datum (mit Unterklassen fuer verschiedene Datumstypen)
- **rico:Relation** — Beziehung zwischen Entitaeten (zahlreiche Unterklassen)

---

## Wichtige Properties

### Beschreibende Properties (Datatype)

- `rico:identifier` — Signatur/Referenzcode
- `rico:title` — Titel
- `rico:scopeAndContent` — Inhaltsbeschreibung
- `rico:hasExtent` — Umfang
- `rico:date` — Datum (mit 9+ Unter-Properties in v1.1)
- `rico:note` — Anmerkung (neu in v1.1)
- `rico:rankInHierarchy` — Position in Hierarchie (neu in v1.1)

### Beziehungs-Properties (Object)

- `rico:hasOrHadPart` / `rico:isOrWasPartOf` — Teil-Ganzes (hierarchisch, transitiv)
- `rico:hasOrHadAgent` — Verbindung zu Akteuren (generisch)
- `rico:hasOrHadSubject` — Thematischer Bezug
- `rico:hasOrHadLocation` — Ortsbezug
- `rico:hasOrHadType` — Typzuordnung (umbenannt von hasOrHadCategory in v1.1)
- `rico:hasDocumentaryFormType` — Dokumenttypzuordnung
- `rico:hasOrganicProvenance` — Provenienz (Entstehungszusammenhang)
- `rico:isAssociatedWithDate` — Datumszuordnung
- `rico:documentedBy` — Dokumentation einer Aktivitaet

### Spezialisierte Agenten-Properties

- `rico:hasOrHadCreator` — Erzeuger
- `rico:hasOrHadAccumulator` — Sammler
- `rico:hasOrHadController` — Verwalter
- `rico:hasOrHadAuthor` — Autor

---

## Vokabulare

RiC-O liefert zwei SKOS-Vokabulare als Named Individuals:

### DocumentaryFormType

Vordefinierte Dokumenttypen (Auswahl): FindingAid, IIIFManifest (neu in v1.1). Projekte erweitern dieses Vokabular typischerweise mit eigenen Typen.

### RecordSetType

Vordefinierte Bestandstypen: Fonds, Series, File, Collection. Diese klassifizieren RecordSets.

---

## Modellierungsmuster

### Bestand > Konvolut > Folio

```
Bestand (RecordSet, type=Fonds)
  └── Konvolut (RecordSet, type=File)
        ├── Folio 1 (Record oder RecordPart)
        ├── Folio 2 (Record oder RecordPart)
        └── ...
```

- Bestand-Konvolut: `rico:hasOrHadPart`
- Konvolut-Folio: `rico:hasOrHadPart`
- Einzelobjekte (kein Konvolut): direkt als Record unter dem Bestand

### Verknuepfung mit Personen

```
Record --rico:hasOrHadAgent--> Person
         (oder spezialisiert: hasOrHadCreator, hasOrHadAuthor)
```

Rollen werden ueber rico:Relation-Unterklassen modelliert, nicht als einfache Strings.

### Verknuepfung mit Orten

```
Record --rico:hasOrHadLocation--> Place
```

### Verknuepfung mit Themen/Werken

```
Record --rico:hasOrHadSubject--> Thing
         (Werk, Ereignis, oder anderes Thema)
```

### Datumsmodellierung

```
Record --rico:isAssociatedWithDate--> Date
         (oder rico:date als Literal)
```

v1.1 hat 9 neue Datums-Unter-Properties fuer praezisere Datierung.

---

## M3GIM-Mapping (Entwurf)

### Google Sheets -> RiC-O Klassen

- Einzelobjekt (z.B. NIM_045) -> `rico:Record`
- Konvolut (z.B. NIM_003) -> `rico:RecordSet` (type=File)
- Folio im Konvolut (z.B. NIM_003 1_1) -> `rico:Record` oder `rico:RecordPart`
- Gesamtbestand UAKUG/NIM -> `rico:RecordSet` (type=Fonds)
- Person -> `rico:Person`
- Organisation -> `rico:CorporateBody`
- Ort -> `rico:Place`
- Werk -> als `rico:hasOrHadSubject` (kein eigener RiC-O-Typ fuer Musikwerke)

### Google Sheets -> RiC-O Properties

- archivsignatur -> `rico:identifier`
- titel -> `rico:title`
- entstehungsdatum -> `rico:date` (oder spezialisierte Unter-Property)
- dokumenttyp -> `rico:hasDocumentaryFormType` (mit m3gim-spezifischem Vokabular)
- umfang -> `rico:hasExtent`
- beschreibung -> `rico:scopeAndContent`
- sprache -> `rico:hasOrHadLanguage`
- bearbeitungsstand -> `m3gim:bearbeitungsstand` (kein RiC-O-Aequivalent)

### Verknuepfungen -> RiC-O Relations

- typ=person -> `rico:hasOrHadAgent` (mit rolle als Qualifier)
- typ=institution -> `rico:hasOrHadAgent`
- typ=ort -> `rico:hasOrHadLocation`
- typ=werk -> `rico:hasOrHadSubject`
- typ=ereignis -> `rico:hasOrHadSubject`
- typ=rolle -> `m3gim:hasPerformanceRole` (Projekterweiterung)
- typ=datum -> `rico:isAssociatedWithDate`
- typ=ensemble -> `rico:hasOrHadAgent` (Ensemble als rico:Group)

### Geloeste Modellierungsfragen

1. **Konvolut-Folios**: `rico:Record`. Folios haben eigene Signaturen und eigene Verknuepfungen — sie sind eigenstaendige Archivalien, keine Teile.
2. **Rollen-Qualifikation**: m3gim-Extension. RiC-O deckt archivalische Rollen (Erzeuger, Autor), m3gim ergaenzt inhaltliche Rollen (erwaehnt, dirigiert, singt). Siehe [-> m3gim-Ontologie](09-m3gim-ontology.md).
3. **Musikwerke**: `m3gim:MusicalWork` (Unterklasse von rico:Thing). Verknuepft via `rico:hasOrHadSubject`, identifiziert via Wikidata-URI. Siehe [-> m3gim-Ontologie](09-m3gim-ontology.md).
4. **Komposit-Typen**: Ja, zwei separate RiC-O-Relationen. `ort, datum` wird zu `rico:hasOrHadLocation` + `rico:isAssociatedWithDate`. Rein RiC-O, kein m3gim noetig.
5. **Folio-Granularitaet**: Verknuepfungen haengen dort, wo die Daten sie liefern — am Folio wenn vorhanden, sonst am Konvolut. `rico:hasOrHadPart` verbindet die Hierarchie.

---

## JSON-LD Context (Entwurf)

```json
{
  "@context": {
    "rico": "https://www.ica.org/standards/RiC/ontology#",
    "m3gim": "https://dhcraft.org/m3gim/vocab#",
    "m3gim-dft": "https://dhcraft.org/m3gim/documentaryFormTypes#",
    "wd": "http://www.wikidata.org/entity/",
    "skos": "http://www.w3.org/2004/02/skos/core#"
  }
}
```

---

Siehe auch: [-> m3gim-Ontologie](09-m3gim-ontology.md) . [-> Datenmodell](03-datenmodell.md) . [-> Architektur](04-architektur.md)
