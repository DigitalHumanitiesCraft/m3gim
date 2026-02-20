# M3GIM-Ontologie

> Projekteigene Erweiterung von RiC-O 1.1 fuer Konzepte, die RiC-O nicht abdeckt.

Namespace: `https://dhcraft.org/m3gim/vocab#` (Prefix: `m3gim`)

---

## Warum eine Erweiterung?

RiC-O deckt archivalische Erschliessung vollstaendig ab: Bestand, Konvolut, Folio, Provenienz, Verwahrung. Was RiC-O nicht abdeckt:

- **Inhaltliche Rollen**: RiC-O kennt archivalische Rollen (Erzeuger, Sammler, Autor). M3GIM braucht inhaltliche Rollen: wer wird im Dokument erwaehnt, wer hat dirigiert, wer hat gesungen.
- **Musikwerke**: RiC-O hat keinen Typ fuer kuenstlerische Werke. M3GIM verknuepft Archivalien mit Opern, Liedern, Konzertprogrammen.
- **Auffuehrungen**: RiC-O kennt Events, aber keine spezifischen Auffuehrungsereignisse mit Rollen und Programm.
- **Bearbeitungsstand**: Projektinterner Workflow-Status, kein archivalisches Konzept.

---

## Klassen

### m3gim:MusicalWork

Musikalisches Werk (Oper, Lied, Konzert, Liederzyklus).

- Oberklasse: `rico:Thing`
- Identifikation: `rico:identifier` (Wikidata-URI wenn vorhanden)
- Bezeichnung: `rico:title`
- Verknuepfung zum Archivale: `rico:hasOrHadSubject` (vom Record zum Werk)

Beispiel: Carmen (Bizet), Der Rosenkavalier (Strauss), Wesendonck-Lieder (Wagner)

### m3gim:Performance

Auffuehrungsereignis — eine konkrete Auffuehrung eines Werks an einem Ort zu einem Zeitpunkt.

- Oberklasse: `rico:Event`
- Werk: `m3gim:performanceOf` -> `m3gim:MusicalWork`
- Ort: `rico:hasOrHadLocation` -> `rico:Place`
- Datum: `rico:isAssociatedWithDate` -> `rico:Date`
- Mitwirkende: `m3gim:hasPerformer` -> `rico:Person` (mit Rollenqualifikation)

---

## Properties

### Object Properties

**m3gim:mentionedIn** (Person -> RecordResource)
- Domain: `rico:Person`
- Range: `rico:RecordResource`
- Bedeutung: Person wird im Dokument erwaehnt (nicht als Erzeuger/Autor, sondern inhaltlich)
- Inverse: `m3gim:mentions`

**m3gim:mentions** (RecordResource -> Person)
- Domain: `rico:RecordResource`
- Range: `rico:Person`
- Bedeutung: Dokument erwaehnt diese Person
- Inverse: `m3gim:mentionedIn`

**m3gim:hasPerformer** (Performance -> Person)
- Domain: `m3gim:Performance`
- Range: `rico:Person`
- Bedeutung: Person wirkt bei Auffuehrung mit

**m3gim:performanceOf** (Performance -> MusicalWork)
- Domain: `m3gim:Performance`
- Range: `m3gim:MusicalWork`
- Bedeutung: Auffuehrung dieses Werks

### Datatype Properties

**m3gim:bearbeitungsstand** (RecordResource -> String)
- Domain: `rico:RecordResource`
- Range: `xsd:string`
- Bedeutung: Projektinterner Bearbeitungsstand
- Werte: `vollstaendig`, `in bearbeitung`, `offen`

---

## Vokabulare

### m3gim:PerformanceRole (SKOS ConceptScheme)

Rollen von Personen in Bezug auf Archivalien und Auffuehrungen. Erweitert die archivalischen Rollen von RiC-O um inhaltliche und kuenstlerische Rollen.

**Archivalisch-inhaltliche Rollen** (Beziehung Person-Dokument):
- `m3gim:role/erwaehnt` — Person wird im Dokument erwaehnt
- `m3gim:role/absender` — Person ist Absender (bei Korrespondenz)
- `m3gim:role/empfaenger` — Person ist Empfaenger (bei Korrespondenz)
- `m3gim:role/widmungsempfaenger` — Person ist Widmungsempfaenger

**Kuenstlerische Rollen** (Beziehung Person-Auffuehrung):
- `m3gim:role/dirigent` — Dirigent/Dirigentin
- `m3gim:role/solistin` — Solist/Solistin
- `m3gim:role/regisseur` — Regisseur/Regisseurin
- `m3gim:role/komponist` — Komponist/Komponistin
- `m3gim:role/saenger` — Saenger/Saengerin (generisch)

**Institutionelle Rollen** (Beziehung Person-Organisation):
- `m3gim:role/intendant` — Intendant/Intendantin
- `m3gim:role/mitglied` — Ensemblemitglied

Das Vokabular ist erweiterbar. Neue Rollen werden bei Bedarf aus den Verknuepfungsdaten ergaenzt.

### m3gim:DocumentaryFormType (SKOS ConceptScheme)

Projekteigene Dokumenttypen, die das RiC-O-Vokabular erweitern. Verknuepft via `rico:hasDocumentaryFormType`.

- `m3gim-dft:brief` — Brief, Korrespondenz
- `m3gim-dft:vertrag` — Vertrag, Engagement
- `m3gim-dft:programmheft` — Programmheft, Programmzettel
- `m3gim-dft:plakat` — Auffuehrungsplakat
- `m3gim-dft:kritik` — Kritik, Rezension
- `m3gim-dft:fotografie` — Fotografie (nur Plakat-Kontext)
- `m3gim-dft:telegramm` — Telegramm
- `m3gim-dft:postkarte` — Postkarte, Ansichtskarte
- `m3gim-dft:urkunde` — Urkunde, Ehrung
- `m3gim-dft:zeitungsausschnitt` — Zeitungsausschnitt
- `m3gim-dft:notiz` — Notiz, Vermerk
- `m3gim-dft:biographie` — Biographisches Dokument
- `m3gim-dft:visitenkarte` — Visitenkarte
- `m3gim-dft:quittung` — Quittung, Rechnung
- `m3gim-dft:typoskript` — Typoskript
- `m3gim-dft:photokopie` — Photokopie
- `m3gim-dft:rezension` — Rezension (Musik)
- `m3gim-dft:tagebuch` — Tagebuch, Tagebucheintrag
- `m3gim-dft:lebenslauf` — Lebenslauf
- `m3gim-dft:ausweis` — Ausweis, Reisepass
- `m3gim-dft:noten` — Noten, Partitur
- `m3gim-dft:sonstiges` — Sonstige Dokumente
- `m3gim-dft:konvolut` — Konvolut (Sammlung)
- `m3gim-dft:tontraeger` — Tontraeger
- `m3gim-dft:dokument` — Dokument (generisch)

Namespace: `https://dhcraft.org/m3gim/documentaryFormTypes#` (Prefix: `m3gim-dft`)

---

## JSON-LD Context (vollstaendig)

```json
{
  "@context": {
    "rico": "https://www.ica.org/standards/RiC/ontology#",
    "m3gim": "https://dhcraft.org/m3gim/vocab#",
    "m3gim-dft": "https://dhcraft.org/m3gim/documentaryFormTypes#",
    "m3gim-role": "https://dhcraft.org/m3gim/roles#",
    "wd": "http://www.wikidata.org/entity/",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
  }
}
```

---

## Zusammenfassung: Was kommt woher?

**RiC-O liefert:**
- Bestand/Konvolut/Folio-Hierarchie (RecordSet, Record, hasOrHadPart)
- Archivalische Beschreibung (identifier, title, scopeAndContent, date, hasExtent)
- Archivalische Agenten-Rollen (hasOrHadCreator, hasOrHadAuthor, hasOrHadAccumulator)
- Orts- und Datumsverknuepfung (hasOrHadLocation, isAssociatedWithDate)
- Thematische Verknuepfung (hasOrHadSubject)
- Dokumenttyp-Zuordnung (hasDocumentaryFormType)

**m3gim ergaenzt:**
- Inhaltliche Rollen (mentionedIn/mentions, PerformanceRole-Vokabular)
- Musikwerke (MusicalWork)
- Auffuehrungen (Performance, hasPerformer, performanceOf)
- Dokumenttyp-Vokabular (25 m3gim-dft Typen)
- Bearbeitungsstand (bearbeitungsstand)

---

Siehe auch: [-> RiC-O Referenz](08-ric-o.md) . [-> Datenmodell](03-datenmodell.md) . [-> Architektur](04-architektur.md)
