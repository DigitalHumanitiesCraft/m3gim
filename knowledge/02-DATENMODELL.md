# M³GIM Datenmodell

## Dreischichtenmodell

| Schicht | Inhalt | Obligatorisch |
|---------|--------|---------------|
| **Schicht 1** | Kernmetadaten (Signatur, Datum, Typ) | Ja |
| **Schicht 2** | Kontextuelle Verknüpfungen (Personen, Orte, Werke) | Empfohlen |
| **Schicht 3** | Quellentyp-spezifische Details (Honorar, Vermittler) | Optional |

**Leitsatz:** Ein leeres Feld bedeutet "nicht ermittelbar", nicht "unbekannt".

## Schicht 1: Kernmetadaten

### Objekttabelle (Hauptbestand, Plakate, Tonträger)

| Feld | Typ | Validierung |
|------|-----|-------------|
| archivsignatur | String | UAKUG/NIM_XXX, eindeutig |
| box_nr | String | Freitext (Boxnummer oder Standort) |
| titel | String | Pflicht |
| entstehungsdatum | String | ISO 8601 (YYYY, YYYY-MM, YYYY-MM-DD) |
| datierungsevidenz | Dropdown | aus_dokument, erschlossen, extern, unbekannt |
| dokumenttyp | Dropdown | siehe Vokabular |
| sprache | Dropdown | de, uk, en, fr, it |
| umfang | String | Freitext |
| zugaenglichkeit | Dropdown | offen, eingeschraenkt, gesperrt |
| scan_status | Dropdown | nicht_gescannt, gescannt, online |
| bearbeiter | String | Freitext |
| erfassungsdatum | Date | YYYY-MM-DD |

### Fototabelle

| Feld | Typ | Validierung |
|------|-----|-------------|
| archivsignatur | String | UAKUG/NIM_FS_XXX, eindeutig |
| alte_signatur | String | Freitext |
| fotobox_nr | String | Freitext |
| titel | String | Pflicht |
| entstehungsdatum | String | ISO 8601 |
| datierungsevidenz | Dropdown | wie oben |
| beschreibung | String | Freitext |
| stichwoerter | String | Semikolon-getrennt |
| fotograf | String | Freitext |
| fototyp | Dropdown | sw, farbe, digital |
| format | String | z.B. 10x15 cm |
| aufnahmeort | String | Freitext |
| rechte | String | Freitext |
| filename | String | Freitext |

## Schicht 2: Verknüpfungen

### Tabellenstruktur

| Spalte | Beschreibung |
|--------|--------------|
| archivsignatur | Verweis auf Objekt/Foto |
| typ | person, ort, institution, ereignis, werk, detail |
| name | Name der Entität |
| rolle | Rolle der Verknüpfung |
| datum | ISO 8601 (bei Ereignissen) |
| anmerkung | Zusatzinfo, inkl. Mobilitätsform |

### Rollen nach Typ

**person:** verfasser, adressat, erwähnt, vertragspartner, unterzeichner, abgebildet

**ort:** entstehungsort, zielort, erwähnt, auffuehrungsort, wohnort, vertragsort

**institution:** vertragspartner, arbeitgeber, veranstalter, vermittler, adressat, erwähnt

**ereignis:** rahmenveranstaltung, premiere, auftritt, probe, implizit

**werk:** interpretin

### Mobilitätsformen (für Orts-Verknüpfungen)

In der Anmerkung mit Präfix `[mobilität:]`:

| Form | Definition | Beispiel |
|------|------------|----------|
| national | Staatsbürgerschaft | Einbürgerung Österreich |
| geografisch | Karriere-Pendeln | Wien↔München↔Bayreuth |
| erzwungen | Flucht, Vertreibung | 1944: Flucht aus Lemberg |
| bildung | Ausbildung | Studium in Wien |
| lebensstil | Persönliche Gründe | Zürich (Ehemann) |

**Beispiel:**
```
| archivsignatur | typ | name | rolle | datum | anmerkung |
| UAKUG/NIM_042 | ort | Lemberg | wohnort | 1919/1944 | [mobilität:erzwungen] Flucht 1944 |
```

## Schicht 3: Details

Schicht-3-Felder werden mit `typ=detail` erfasst:

| archivsignatur | typ | name | rolle | anmerkung |
|----------------|-----|------|-------|-----------|
| UAKUG/NIM_028 | detail | honorar | 1.000 DM | Julius Cäsar |

### Typische Details nach Dokumenttyp

**Verträge:** honorar, nebenleistungen, vermittlungsprovision, vertragslaufzeit

**Korrespondenz:** korrespondenztyp, vermittler, repertoirehinweise

**Presse:** publikationsorgan, rezensent, bewertungstendenz

**Fotografien:** aufnahmeanlass, kostüm_rolle, inszenierung

## Kontrollierte Vokabulare

### dokumenttyp
autobiografie · korrespondenz · vertrag · programm · presse · repertoire · studienunterlagen · identitaetsdokument · plakat · tontraeger · sammlung

### zugaenglichkeit
offen · eingeschraenkt · gesperrt

### datierungsevidenz
aus_dokument · erschlossen · extern · unbekannt

### sprache
de · uk · en · fr · it

### fototyp
sw · farbe · digital

### mobilitaetsform
national · geografisch · erzwungen · bildung · lebensstil

## Entitätsindizes

### ID-Schema

| Entität | Präfix | Beispiel |
|---------|--------|----------|
| Personen | P | P1, P2 |
| Organisationen | O | O1, O2 |
| Orte | L | L1, L2 |
| Werke | W | W1, W2 |

### Wikidata-Reconciliation

- Wikidata-IDs werden nachträglich per OpenRefine ergänzt
- Format: Q-ID (z.B. Q94208 für Ira Malaniuk)
- Personen: `wdt:P31 wd:Q5`
- Orte: `wdt:P31 wd:Q515`
- Werke: `wdt:P31 wd:Q7725634`

## JSON-LD Export (RiC-konform)

```json
{
  "@context": {
    "rico": "https://www.ica.org/standards/RiC/ontology#",
    "m3gim": "https://dhcraft.org/m3gim/vocab#",
    "wd": "http://www.wikidata.org/entity/"
  },
  "@graph": [
    {
      "@id": "m3gim:NIM_028",
      "@type": "rico:Record",
      "rico:identifier": "UAKUG/NIM_028",
      "rico:title": "Gastvertrag Bayerische Staatsoper München",
      "rico:date": "1958-04-18",
      "rico:hasDocumentaryFormType": { "@id": "m3gim:vertrag" }
    }
  ]
}
```

---

*Version 1.0 – 2026-01-18*
*Konsolidiert aus Datenmodell v2.2 und Technische Dokumentation v1.0*
