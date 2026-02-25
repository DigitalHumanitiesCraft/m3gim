# Wissensarchitektur

> Dreispaltige Strukturanalyse des Wissensdokuments (antrag.md) und Ableitung der Datenarchitektur.
> Erstellt: Session 14 (2026-02-20).

## Dreispalten-Modell

Das Wissensdokument laesst sich in drei epistemische Ebenen gliedern:

### Links: Kontextwissen (Theorie, Methodik, Forschungsstand)

Dieses Wissen rahmt das Projekt, fliesst aber nicht direkt in die Datenmodellierung ein.

| Quelle (Antrag) | Inhalt | KB-Abdeckung |
|------------------|--------|--------------|
| §2.1 Mobility Studies | Urry, Hannam/Sheller/Urry, mobility turn | projekt-kontext.md (neu) |
| §2.2 Musikwiss. Mobilitaetsforschung | Meyer, MUSICI, MusMig, Leopold | projekt-kontext.md (neu, kompakt) |
| §2.3 Strohmanns Mobilitaetsbegriff | Motilitaet, erweiterte Definition | projekt-kontext.md (neu) |
| §2.4 Analytische Konzepte | Musiktheaterwissen, Kulturelles Kapital, Graz als Schnittstelle | projekt-kontext.md (neu) |
| §2.5 Regionale Musikliteratur | Flotzinger, Suppan, Bruestle, Harer/Marsoner | Nicht in KB (niedrige Prio) |
| §4 Vorarbeiten | Habilitation, HAB Wolfenbuettel, Seminar WS 2024/25 | Nicht in KB (Antrags-Material) |
| §9 Innovationsanspruch | RiC + Gender + DH als Neuland | projekt-kontext.md (1 Satz) |
| §11 Bibliografie | 40+ Referenzen | Nicht in KB (Literaturliste → Zotero o.ae.) |

### Mitte: Kerndokument (Projektbrief, Arbeitsprogramm, Technik, Finanzierung)

Dieses Wissen steuert das Projekt und muss in der KB praezise abgebildet sein.

| Quelle (Antrag) | Inhalt | KB-Abdeckung |
|------------------|--------|--------------|
| §0 Projektsteckbrief | Team, Budget, Zeitraum, Foerderung | projekt-kontext.md (neu) |
| §1.3 Quellenbestand | 182 AE, 17 Boxen, Materialtypen | projekt-kontext.md (282 korrigiert) |
| §3.1 Forschungsfragen | FF1–FF4 | projekt-kontext.md (vollstaendig) |
| §3.2 Hypothese | Mobilitaet als Katalysator | projekt-kontext.md (neu) |
| §3.3 Machbarkeitsfragen | 4 Evaluierungspunkte | Nicht in KB (→ Evaluierung nach Go live) |
| §5 Arbeitsprogramm | 3 Arbeitsfelder, 12 APs, Meilensteine | projekt-kontext.md (Meilensteine neu) |
| §6 Technische Architektur | 3 Stufen, Datenmodell, Prototyp | system-architektur-pipeline.md |
| §7 Finanzierung | Budget-Aufschluesselung | Nicht in KB (bewusst) |
| §8 Projektteam | 6 Personen + Profile | Nicht in KB (Antrags-Material) |
| §10 Strategie | FWF-Folgeprojekt | projekt-kontext.md (neu, 1 Satz) |

### Rechts: Entitaeten und Verknuepfungen (Personen, Orte, Werke, Institutionen, Ereignisse)

Dieses Wissen wird direkt operationalisiert — es definiert die Datenstruktur.

| Entitaetstyp | Antrag | Handreichung | Pipeline | Frontend | Status |
|-------------|--------|-------------|---------|---------|--------|
| **Person** | Personen als Agenten, Netzwerke | 6 Rollen (verfasser, adressat, ...) | m3gim:hasAssociatedAgent + rico:hasOrHadSubject (@type: rico:Person) | Personen-Index, Chips | **IMPLEMENTIERT** |
| **Institution** | Institutionen als Agenten | 6 Rollen (vertragspartner, arbeitgeber, ...) | m3gim:hasAssociatedAgent (CorporateBody/Group) | Org-Index, Chips | **IMPLEMENTIERT** |
| **Ort** | Auftrittsorte, Graz-Bezuege | 6 Rollen (entstehungsort, auffuehrungsort, ...) | rico:hasOrHadLocation | Ort-Index, Chips | **IMPLEMENTIERT** |
| **Werk** | Musikwerke mit Komponist | 1 Rolle (interpretin) | rico:hasOrHadSubject | Werk-Index, Chips | **IMPLEMENTIERT** |
| **Rolle** | Buehnenrollen | Nicht explizit | m3gim:hasPerformanceRole | Korb-Chips | **IMPLEMENTIERT** |
| **Datum** | Zeitliche Zuordnung | Formate + Qualifier + Evidenz | m3gim:eventDate + m3gim:dateEvidence | Chronik, Sortierung | **IMPLEMENTIERT** |
| **Ereignis** | Auftritte, Gastspiele, Ehrungen | 5 Rollen (rahmenveranstaltung, premiere, ...) | m3gim:PerformanceEvent via rico:hasOrHadSubject | Inline-Detail | **IMPLEMENTIERT** |
| **Detail** | Honorare, Gagen | Schema (name=Feld, rolle=Wert) | m3gim:DetailAnnotation via m3gim:hasDetail | Inline-Detail, Korb | **IMPLEMENTIERT** |
| **Ensemble** | Gruppen Musizierender | Erwaehnt | Nicht implementiert | Nicht implementiert | **NIEDRIG** |

## Event-Modellierung (implementiert)

### Umsetzung

Ereignisse (Festspiele, Premieren, Gastspiele, Ehrungen) werden als `m3gim:PerformanceEvent` in der Pipeline verarbeitet. Die Verknuepfungstabelle enthaelt Eintraege vom `typ: ereignis`.

### Vorgeschlagenes Modell

```
Ereignis in Verknuepfungstabelle:
  archivsignatur: UAKUG/NIM_028
  typ: ereignis
  name: Muenchner Sommerfestspiele 1958
  rolle: rahmenveranstaltung
  datum: 1958-08-10/1958-09-09

→ JSON-LD Mapping:

{
  "@type": "m3gim:PerformanceEvent",
  "rico:title": "Muenchner Sommerfestspiele 1958",
  "m3gim:eventRole": "rahmenveranstaltung",
  "m3gim:eventDate": "1958-08-10/1958-09-09"
}
```

### RiC-O-Kompatibilitaet

RiC-O 1.1 definiert `rico:Event` als Klasse. Fuer M3GIM empfehlenswert:

- **Option A:** `rico:Event` direkt nutzen (standardkonform, aber generisch)
- **Option B:** `m3gim:PerformanceEvent` als Subklasse von `rico:Event` (spezifischer, erweiterbar)

**Empfehlung:** Option B — `m3gim:PerformanceEvent rdfs:subClassOf rico:Event`. Das erlaubt spaetere Spezialisierung (z.B. Unterscheidung Festspiel vs. Ehrung vs. Premiere) ohne den RiC-O-Kern zu verlassen.

### Rollen-Semantik

| Rolle | Bedeutung | Beispiel |
|-------|-----------|----------|
| rahmenveranstaltung | Uebergeordnetes Ereignis, in dem Dokument entstand | Muenchner Sommerfestspiele 1958 |
| premiere | Erstauffuehrung eines Werks/einer Inszenierung | Premiere Orpheus, Bayer. Staatsoper 1953 |
| auftritt | Einzelner Auftritt/Gastspiel | Gastspiel Buenos Aires 1952 |
| probe | Probenarbeit | Proben Bayreuth 1951 |
| implizit | Ereignis aus Kontext erschlossen, nicht explizit im Dokument | |

### Auswirkung auf Frontend

- **Archiv:** Inline-Detail zeigt Ereignisse als eigene Zeile mit Datum und Rolle
- **Indizes:** Kein eigener Ereignis-Index noetig (Ereignisse haengen an Records, nicht als globaler Index)
- **Chronik:** Ereignisse koennten als alternative Gruppierungsdimension dienen (nach Festspiel/Premiere)
- **Korb:** Ereignis-Chips mit Rolle

## Detail-Modellierung: Konzept

### Problem

Schicht 3 (Honorare, Nebenleistungen) ist in der Handreichung definiert, aber nicht in der Pipeline.

### Vorgeschlagenes Modell

```
Detail in Verknuepfungstabelle:
  archivsignatur: UAKUG/NIM_028
  typ: detail
  name: honorar
  rolle: 1.000 DM
  anmerkung: Julius Caesar

→ JSON-LD Mapping:

{
  "@type": "m3gim:DetailAnnotation",
  "m3gim:detailField": "honorar",
  "m3gim:detailValue": "1.000 DM",
  "rico:generalDescription": "Julius Caesar"
}
```

### Auswirkung auf Frontend

- **Inline-Detail:** Details als strukturierte Key-Value-Paare unter "Weitere Angaben"
- **Korb:** Detail-Zeilen im Card-Layout
- **Kein Index:** Details sind Record-lokal, keine globale Aggregation

## Quellen-Alignment

| Dokument | Rolle | Pflegeort |
|----------|-------|-----------|
| antrag.md (= Wissensdokument v2) | Historisches Referenzdokument, nicht aktualisierbar | Repo-Root (read-only) |
| handreichung.md | Erfassungsanleitung fuer KUG-Team, lebend | Repo-Root |
| knowledge/*.md | Kanonische Wissensbasis, Code-nah | knowledge/ (aktiv gepflegt) |
| docs/*.html | Oeffentliche Darstellung | docs/ (bei Pipeline-Lauf aktualisieren) |
