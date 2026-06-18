---
title: Plan
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Plan
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/plan
status: active
created: 2026-02-19
updated: 2026-06-17
language: de
version: 0.2
authors: [Christopher Pollin]
generated-with: Claude Code
related: [project, specification, data, decisions, data-entry-guidelines]
---

# Plan

Dieses Dokument steuert die nächsten Arbeitsschritte des Pilotprojekts und hält die getrackten Arbeitspakete, zurückgestellten Aufgaben und quellseitig zu behebenden Datenqualitätspunkte an einem Ort zusammen.

## Zielbild

Die Pilotstudie hat drei zusammenhängende Ziele. Sie validiert die Methodik, also die Frage, ob der Nachlass mit RiC-O 1.1 plus m3gim-Extension plus AgRelOn praktikabel und skalierbar erschließbar ist. Sie baut das Forschungsinterface schrittweise zu einem vollständigen Satz von Perspektiven aus. Und sie hebt die Datenqualität, ohne den tatsächlichen Erschließungsstand zu kaschieren. Diese drei Linien tragen den Antrag für das FWF-Folgeprojekt.

## Nächste Schritte

### Neuer Datenstand und Modell-Umsetzung

Ein neuer Export liegt vor und erschließt mehrere Konvolute tiefer. Die freigegebene Modell-Erweiterung ([decisions.md](decisions.md) E-95 bis E-102) wird testgetrieben umgesetzt.

1. Die modellunabhängige Test-Welle schreiben (strukturelle Invarianten, referenzielle Integrität, Q-ID-Hygiene), grün gegen den bisherigen Stand, rot an den strukturellen Blockern gegen den neuen Export.
2. Die Modell-Spec-Tests als rote xfail-Tests schreiben ([testing.md](testing.md)); die bestehenden Vokabular-Tests koordiniert anpassen.
3. Den Loader-Fix umsetzen (E-95), damit die strukturellen Tests gegen den neuen Export grün werden.
4. Die Modell-Features gruppenweise in der Pipeline implementieren (StageRole und Performance, Mobilitäts-Ortsrollen, Finanz-Parser, Dokumentvokabular, Datenqualitäts-Flags), bis die Spec-Tests umschlagen.
5. Produktivschalten: den neuen Export übernehmen, Pipeline laufen lassen, Snapshot-Diff als Gate, das Frontend-Vokabular aktivieren ([architecture.md](architecture.md)), danach die Reconciliation-Runde und die Approval-Verifikation.

Die finalen Cluster-Zuordnungen der neuen eventRoles und Rollen sind mit dem Frontend abzustimmen, bevor produktiv geschaltet wird.

### Ontologie-Konformität

Der Modellierungs-Audit (Web-Verifikation gegen RiC-O 1.1 und AgRelOn, [decisions.md](decisions.md) E-103/E-104) hat mehrere im Output verwendete Terme als nicht konform identifiziert.

**Welle 1 erledigt (2026-06-18, testgetrieben).** Umgesetzt in `transform.py`, Frontend, Tests und JSON-Schema; Pipeline regeneriert, Suite grün (193 passed inkl. `test_26`-Lock, JS 74/74):

1. ✅ `test_26` Term-Konformitäts-Lock + quellenbelegte Allowlist-Fixture — validiert jeden `rico:`/`ric-rst:`/`agrelon:`/`schema:`/`gndo:`-Term gegen die offiziellen Listen; verbietet die bekannten Fehlterme namentlich.
2. ✅ Konformitäts-Brecher: `rico:isAssociatedWithRecord` entfernt (STE trägt jetzt `agrelon:metadataProvenance` auf den Record); `agrelon:hasProvenance` → `metadataProvenance`, `hasConfidenceValue` → `metadataConfidence` (auch test_12/test_19 migriert).
3. ✅ Klassen-Fehlgriffe: `rico:File`/`rico:Fonds` → `ric-rst:File`/`ric-rst:Fonds`; `agrelon:HasIsPatron` → `IsHasPatron`.
4. ✅ Hygiene: Namespace kanonisch auf `documentaryFormTypes#`/`roles#`; `m3gim:premiereDate` → `m3gim:wdPremiereDate` (keine Dublette mit der Datumsrolle `premieredatum`).
5. ✅ Person-Normdaten auf schema/GND migriert: `schema:birthDate`/`deathDate`/`birthPlace`/`deathPlace`, `gndo:professionOrOccupationAsLiteral`; `m3gim:country` als Place-Property definiert.

**Offen aus Welle 1:**

- ✅ `agrelon:hasSubject` ergänzt: referenziert Malaniuks verifizierte Wikidata-Entität `wd:Q94208` direkt (Label + Lebensdaten 2026-06-18 gegen Wikidata belegt), kein lokaler Knoten — das Schema lässt Person nicht als Top-Level-@type. Reifikation jetzt symmetrisch.
- `agrelon:metadataPeriod` erscheint aktuell 0× (Validity nur bei HasEmployeeEmployer, dessen einzige Zeile die verwaiste `NIM_11` ist) — kommt mit der Verknüpfungs-Datenpflege bzw. E-97 (wohnort-Zustand).
- ✅ `m3gim:eventDate`-Drop umgesetzt (E-102): atomar ersetzt durch `m3gim:hasDatedEvent` (DatedEvent-Fallback) + Datums-Routing. `ort,datum`-Daten leben dedupliziert im STE (Blocker-Fix aus dem Audit).
- ✅ Datierungs-Konfidenz ganz entfernt (E-106, löst E-100 ab): `agrelon:metadataConfidence` war eine erfundene Dezimal-Projektion der `datierungsevidenz` und wurde von nichts gelesen.

### Interface-Ausbau

Aktiv sind Bestand, Chronik, Statistik, Indizes, Netzwerk und Wissenskorb. Die übrigen drei Perspektiv-Tabs sind verborgen und werden überarbeitet, bevor sie wieder sichtbar geschaltet werden.

1. Reaktivierung und Redesign der drei verbleibenden Perspektiv-Tabs Mobilitäts-Atlas, Repertoire und Biogramm. Pro Tab wird der Daten-Kontrakt gegen den Store verifiziert, das Rolle-Prefix-Chip-Muster konsequent angewendet und ein Meta-Fresh-Check vor dem Enable durchgeführt. Die Reihenfolge der drei Tabs ist offen.
2. SKOS-Labels in der Pipeline pflegen, also `skos:prefLabel` mit lesbaren deutschen Labels an die DFT-Concepts schreiben, damit das Frontend die Handtabelle `DOKUMENTTYP_LABELS` ablösen kann.
3. AgRelOn-Granularität schärfen über `HasAddressee` und `HasSender` statt des pauschalen `HasCorrespondent`, alternativ über eine symmetrische Beziehung für beide Richtungen.
4. Die Netzwerk-Spur im Biogramm ergänzen, sobald die AgRelOn-Relationen Validity-Dates tragen.
5. Eine weitere Reconciliation-Runde fahren und die Unmatched-Restliste manuell prüfen, falls gewünscht. Nicht blockierend.

## Deferred Aufräumarbeiten

Diese Arbeiten sind bewusst zurückgestellt und werden nach Bedarf angegangen.

- `loadPartitur()` samt `test_08_partitur.py` und den Derivaten `partitur.json`, `matrix.json` und `kosmos.json` bleiben unberührt. Die Derivate werden weiter gebaut, aber von keinem aktiven Tab mehr konsumiert. Sie werden entfernt, sobald absehbar ist, dass keine künftige Visualisierung sie noch braucht.
- `scripts/build-views.py` und `scripts/audit-data.py` lesen noch das durch E-96 entfernte `m3gim:hasPerformanceRole` (Repertoire-/Auftritts-Ableitung). Sie laufen fehlerfrei, liefern aber für diese Spuren leere Listen, bis sie auf `m3gim:hasPerformance`/`m3gim:StageRole` umgestellt werden. Da die Derivate von keinem aktiven Tab konsumiert werden, zurückgestellt. (Die `eventDate`→`hasDatedEvent`-Umstellung beider Skripte ist mit E-102 bereits erledigt; build-views zieht die `ort,datum`-Daten zusätzlich aus dem STE.)
- Der Confidence-Dot am Record-Header entfällt: die zugrundeliegende Datierungs-Konfidenz ist mit E-106 entfernt, `confidenceDotProps()` wurde gelöscht.

## Deferred Modell-Erweiterungen

Diese Modell-Erweiterungen sind spezifiziert oder vorgemerkt, aber noch nicht umgesetzt.

- `m3gim:StageRole` als Entität ist freigegeben (E-96) und Teil der laufenden Modell-Umsetzung; ein dedizierter Rollenindex (`m3gim_id`, `name`, `belongsToWork`, `voiceType`, `wikidata_id`) bleibt davon getrennt und wartet auf ein neues Rollenindex-XLSX vom Erschließungsteam.
- Eine leichtgewichtige Reifikation über `m3gim:Statement` wird nur dort ergänzt, wo die Provenance nicht bereits aus der Record-URI folgt.
- Zenodo-Archivierung und EAD-Export gehören zum Betriebsmodell und werden später angegangen.

## Offene Datenqualität

Die folgenden Punkte sind quellseitig im Excel zu beheben, nicht im Pipeline-Code. Vor der Bearbeitung ist ihr aktueller Stand gegen den [Quality-Snapshot](../data/reports/quality-snapshot.md) zu verifizieren, da ein frischer Datenexport vorliegt und einige Punkte bereits behoben sein könnten.

### Instanz-Tickets

- Verwaiste Signatur `UAKUG/NIM_11`. In der Verknüpfungstabelle existiert ein Eintrag mit dieser Signatur, für den kein Objekt erfasst ist. Betroffen ist die einzige arbeitgeber-Zeile, weshalb `test_12` an dieser Stelle skipt. Die fehlende Objektzeile nachpflegen oder den Eintrag korrigieren.
- `PL_07`-Duplikat. Für `UAKUG/NIM/PL_07` gibt es zwei Zeilen im Objekte-Sheet. Eine der beiden entfernen oder auf eine eigene Signatur umstellen, danach den xfail-Marker in `test_05` entfernen.
- Sophokles-Rolle in Zeile 1208 der Verknüpfungen-XLSX. Sophokles trägt dort die Rolle `Aufführung`, obwohl sein Werk aufgeführt wurde, nicht er selbst. Die Rolle auf `Vorlage` oder `Verfasser` ändern.
- Zukunftsdatum im neuen Export. Eine Datumszelle trägt ein in der Zukunft liegendes Datum, das auf einen Erfassungsfehler hindeutet, und ist gegen die Quelle zu korrigieren.
- Verschwundenes Konvolut. Ein im vorigen Stand vorhandenes Presse-Konvolut fehlt im neuen Export; zu prüfen, ob es versehentlich entfernt wurde.
- Verwaiste Signatur `UAKUG/NIM_168`. Box 9 der Verknüpfungstabelle referenziert durchgehend `UAKUG/NIM_168`, für die kein Objekt erfasst ist, sodass ihre Verknüpfungen nicht angehängt werden können. Die fehlenden Objektzeilen nachpflegen oder die Signatur korrigieren.
- Fehlende Objekt-Folios bei `UAKUG/NIM_137`. Mehrere in Box 5 referenzierte Folios sind im Objekte-Sheet nicht erfasst, weshalb die zugehörigen Verknüpfungen ins Leere laufen.
- Datum in der Folio-Spalte. In Box 5 trägt mindestens eine Folio-Zelle ein Datum statt einer Folio-Nummer und ist gegen die Quelle zu korrigieren.
- Tippfehler in der Erfassung. `Maskenbidner` → `Maskenbildner`, `Rundfunkshonorar` → `Rundfunkhonorar`, `Malaiuk`/`Malniuk` → `Malaniuk`. Bis zur Quellkorrektur reicht die Pipeline sie unverändert durch.
- Dubletten und fehlende Index-IDs. Mehrere Personen-, Organisations- und Werk-Einträge sind doppelt erfasst oder ohne `m3gim_id`; an der Quelle zu konsolidieren beziehungsweise nachzupflegen.
- Erkennungslücke `dataQualityFlag` (E-102, Audit). Die vier Flag-Regex (`name-nicht-eindeutig`/`vorname-fehlt`/`rolle-unsicher`/`quelle-tippfehler`) sind bewusst konservativ und fangen einige reale `anmerkung`-Unsicherheitssignale nicht: `Vorname unklar`, `unleserlich`, einzelnes `[…?]`. Bewusst kein Mislabeling (eine „unklar"-Zeile ist nicht „fehlt"). Bei Bedarf entweder Regex erweitern (ggf. neue Flags `quelle-unleserlich`/`vorname-unklar`) oder quellseitig vereinheitlichen.

### Strukturelle Quell-Fixes

- Index-Header-Shifts in Organisations-, Orts- und Werkindex. Eine saubere Kopfzeile in die drei Index-Blätter einfügen und beim Excel-Export mitgeben, damit die Pipeline-Kompensation entfallen kann.
- Bearbeitungsstand-Dropdown. Die Spalte als Google-Sheets-Dropdown mit den drei kanonischen Werten `abgeschlossen`, `begonnen` und `zurueckgestellt` konfigurieren, damit das Normalisierungs-Mapping entfällt.
- Freitext-Datierungen strikt nach ISO. Die Datumsspalte ausschließlich als ISO-Datum erfassen (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `YYYY/YYYY`) und ortsmischende Freitext-Angaben in eine separate Anmerkungsspalte verschieben.
- Ort-Datum-Rollentrennung. Bei Komposit-Einträgen `ort, datum` die Rolle nur dem Datum zuordnen, nicht dem Ort, damit der `rico:Place` keine Datumsrolle erbt.
- Stabiler Folio-Spaltenname. In den Objektdaten einen stabilen Spaltennamen festlegen (aktuell `folio nr`), damit die heuristischen Spalten-Fallbacks wegfallen können.
- Sammel-Zeilen und @id-Kollision. Sammel-Zeilen, die ein Konvolut insgesamt beschreiben, entfernen und ihren Inhalt als Konvolut-Metadaten unterbringen, oder ihnen eine eigene Folio-Nummer geben, damit keine zwei Graph-Knoten mit gleicher @id entstehen.
- Beethoven van/von-Vereinheitlichung im Werkindex. Die als `Beethoven, Ludwig von` erfassten Zellen auf `Beethoven, Ludwig van` vereinheitlichen, danach den xfail-Marker in `test_24` entfernen.
- Box-Sheet-Struktur der Verknüpfungstabelle. Eine einheitliche Kopfzeile mit benannter `archivsignatur`-Spalte und konsistente Sheet-Benennung setzen, damit die Mehrblatt- und Forward-Fill-Kompensation (E-95) entfallen kann.
- Personenindex-Kopfzeile. Eine saubere Namensspalten-Kopfzeile einfügen, damit der Header-Shift für den Personenindex entfällt.
- Literal-Folio-Zellen. Zellen mit dem Wert `Folio` durch die tatsächliche Folio-Nummer ersetzen, damit der Guard entfallen kann.

### Anreicherung und Normdaten

- GND-IDs für die Kernpersonen anreichern.
- Wikidata-IDs durchgängig pflegen, damit die Normdaten-Verknüpfung über alle Indizes hinweg trägt.
- Ortsdubletten normalisieren, betroffen sind unter anderem die Zürich-Adressvariante, ein Stuttgart-Whitespace-Fall sowie Freitextmischungen wie `Wien, ab 1956`.
- Unverknüpfte Einträge der Verknüpfungstabelle ohne Archivsignatur nachzuordnen.

## Datenqualität laufend

Diese redaktionellen Punkte werden fortlaufend im Erfassungsteam bearbeitet.

- Die Verknüpfungsrate erhöhen. Der Schwerpunkt lag bisher auf den Konvoluten um NIM_003, NIM_004 und NIM_007, Einzelobjekte sind weitgehend unverknüpft.
- Der Bearbeitungsstand ist bei der Mehrheit der Objekte noch offen.

## Status-Tracker

| Arbeitspaket | Status | Notiz |
|---|---|---|
| Neuer Datenstand und Modell-Umsetzung | aktiv | testgetrieben. Erledigt: E-95 (Loader), E-96+E-98 (Performance/StageRole), E-102 (Quality-Flags + DatedEvent + eventDate-Drop + ort,datum-Dedup), E-106 (Datierungs-Konfidenz entfernt, löst E-100 ab), E-101 (Dokumentvokabular, datengedeckte Teile: sammlung eigenständig + deutsche prefLabels + neue Konzepte gerüstet; dokument-Aboutness vertagt). Offen: E-97 (Mobilitäts-Ortsrollen), E-99 (Finanz-Parser), dann Promote (wartet auf tieferen Export) |
| Ontologie-Konformität (E-103/E-104/E-105) | erledigt | Term-Renames + schema/GND-Migration + test_26-Lock, `agrelon:hasSubject`→`wd:Q94208`, `eventDate`-Drop (mit E-102) — alles umgesetzt, Suite grün |
| Reaktivierung Mobilitäts-Atlas, Repertoire, Biogramm | offen | pro Tab Daten-Kontrakt, Chip-Muster, Meta-Fresh-Check |
| Frontend auf SKOS-prefLabel umstellen | bereit | Pipeline emittiert deutsche `skos:prefLabel` (E-101); 8 Views + `format.js` von der Hand-Map `DOKUMENTTYP_LABELS` auf `store.concepts.get(...).prefLabel` umstellen, dann Hand-Map entfernen. Unmittelbarer Folgeschritt. |
| AgRelOn-Granularität | offen | `HasAddressee`/`HasSender` statt pauschal |
| Biogramm-Netzwerk-Spur | blockiert | wartet auf AgRelOn validity-dates |
| Weitere Reconciliation-Runde | optional | Unmatched-Restliste, nicht blockierend |
| Deferred Aufräumarbeiten | zurückgestellt | Partitur-Derivate; build-views/audit-data hasPerformanceRole-Spur |
| Deferred Modell-Erweiterungen | zurückgestellt | Phase 4.5, Phase 4.9, Zenodo, EAD |
| Offene Datenqualität | quellseitig | gegen Quality-Snapshot verifizieren |
| Datenqualität laufend | laufend | Verknüpfungsrate, Bearbeitungsstand |
