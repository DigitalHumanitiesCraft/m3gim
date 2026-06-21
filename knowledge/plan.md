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
updated: 2026-06-21
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

**Welle 1 erledigt (2026-06-18, testgetrieben).** Umgesetzt in `transform.py`, Frontend, Tests und JSON-Schema; Suite grün (217 passed / 1 skipped / 2 xfailed inkl. `test_26`-Lock, JS 85/85):

1. ✅ `test_26` Term-Konformitäts-Lock + quellenbelegte Allowlist-Fixture — validiert jeden `rico:`/`ric-rst:`/`agrelon:`/`schema:`/`gndo:`-Term gegen die offiziellen Listen; verbietet die bekannten Fehlterme namentlich.
2. ✅ Konformitäts-Brecher: `rico:isAssociatedWithRecord` entfernt (STE trägt jetzt `agrelon:metadataProvenance` auf den Record); `agrelon:hasProvenance` → `metadataProvenance`, `hasConfidenceValue` → `metadataConfidence` (auch test_12/test_19 migriert).
3. ✅ Klassen-Fehlgriffe: `rico:File`/`rico:Fonds` → `ric-rst:File`/`ric-rst:Fonds`; `agrelon:HasIsPatron` → `IsHasPatron`.
4. ✅ Hygiene: Namespace kanonisch auf `documentaryFormTypes#`/`roles#`; `m3gim:premiereDate` → `m3gim:wdPremiereDate` (keine Dublette mit der Datumsrolle `premieredatum`).
5. ✅ Person-Normdaten auf schema/GND migriert: `schema:birthDate`/`deathDate`/`birthPlace`/`deathPlace`, `gndo:professionOrOccupationAsLiteral`; `m3gim:country` als Place-Property definiert.

**Offen aus Welle 1:**

- ✅ `agrelon:hasSubject` ergänzt: referenziert Malaniuks verifizierte Wikidata-Entität `wd:Q94208` direkt (Label + Lebensdaten 2026-06-18 gegen Wikidata belegt), kein lokaler Knoten — das Schema lässt Person nicht als Top-Level-@type. Reifikation jetzt symmetrisch.
- `agrelon:metadataPeriod` erscheint aktuell 0× (Validity nur bei HasEmployeeEmployer, dessen einzige Zeile die verwaiste `NIM_11` ist) — kommt mit der Verknüpfungs-Datenpflege bzw. dem `wohnort`-Zustand. Letzterer ist der vertagte Teil von E-97: `wohnort` kommt im April-Export 0× vor, daher bewusst **nicht** als Punktereignis modelliert (kein spekulativer Code); der datengedeckte E-97-Kern (zielort/absendeort/abreiseort → datumslose STE) ist umgesetzt.
- ✅ `m3gim:eventDate`-Drop umgesetzt (E-102): atomar ersetzt durch `m3gim:hasDatedEvent` (DatedEvent-Fallback) + Datums-Routing. `ort,datum`-Daten leben dedupliziert im STE (Blocker-Fix aus dem Audit).
- ✅ Datierungs-Konfidenz ganz entfernt (E-106, löst E-100 ab): `agrelon:metadataConfidence` war eine erfundene Dezimal-Projektion der `datierungsevidenz` und wurde von nichts gelesen.

### Interface-Ausbau

Aktiv sind Bestand, Chronik, Statistik, Indizes, Netzwerk und Wissenskorb. Die übrigen drei Perspektiv-Tabs sind verborgen und werden überarbeitet, bevor sie wieder sichtbar geschaltet werden.

1. Reaktivierung und Redesign der drei verbleibenden Perspektiv-Tabs Mobilitäts-Atlas, Repertoire und Biogramm. Der Mobilitäts-Atlas ist durch den sichtbaren E-111-Mobilitäts-Tab (D3-geo-Karte) überholt; ob er stillgelegt oder als zweite Sicht reaktiviert wird, ist operator-offen (handoff Stand 8). Pro Tab wird der Daten-Kontrakt gegen den Store verifiziert, das Rolle-Prefix-Chip-Muster konsequent angewendet und ein Meta-Fresh-Check vor dem Enable durchgeführt. Die Reihenfolge der Tabs ist offen.
2. AgRelOn-Granularität schärfen über `HasAddressee` und `HasSender` statt des pauschalen `HasCorrespondent`, alternativ über eine symmetrische Beziehung für beide Richtungen.
3. Die Netzwerk-Spur im Biogramm ergänzen, sobald die AgRelOn-Relationen Validity-Dates tragen.
4. Eine weitere Reconciliation-Runde fahren und die Unmatched-Restliste manuell prüfen, falls gewünscht. Nicht blockierend.

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

Die instanzbezogenen Datenfehler (Quellfehler und Abgleichfehler, je mit Fundstelle und Status) sind seit 2026-06-21 kanonisch im [Datenfehler-Register](datenfehler.md) geführt, getrennt nach Fehlerklasse. Dort liegen Zukunftsdatum, vertauschte Zielorte, Beethoven van/von, verwaiste Signaturen, fehlende Folios, Erfassungstippfehler, die Zürich-Adressvarianten und die Wikidata-Fehlmatches. Die folgenden strukturellen Quell-Fixes betreffen das Excel-Format, nicht einzelne Fehlwerte, und bleiben hier.

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
- Wikidata-Fehlmatches korrigieren (Reconciliation). New York auf Bundesstaat statt Stadt (AF-01), mehrere Personen auf gleichnamige prominentere Entitäten (AF-02). Kanonisch mit Fundstelle und Korrekturweg im [Datenfehler-Register](datenfehler.md § Abgleichfehler); über `verify-manual-approvals.py` plus gezielte Reconciliation-Prüfung beheben.
- Ortsdubletten normalisieren, betroffen sind unter anderem die Zürich-Adressvariante, ein Stuttgart-Whitespace-Fall sowie Freitextmischungen wie `Wien, ab 1956`. **Konkretisierung (Session 51):** vier adressgenaue Orte zersplittern den Ortsindex — `Zürich, Zürichbergstrasse 104` (7×), `Zürich, Geibelstrasse 1/1` (4×), `Zürich, Zurichbergstrasse 104` (1×, **Umlaut-Tippfehler** `Zu`→`Zü`) und `München, Martiusstrasse 3` (1×). Wurzel: der Reconcile-Match-Key ist der rohe Ortsname-String, und der Ortsindex (`M3GIM-Ortsindex.xlsx`) trägt keine Stadt/Q-ID-Ebene; nur die nackten Städtenamen erhalten eine Q-ID, die Adressvarianten nicht. Funktionale Folge im Frontend: der Ort-Filter „Zürich" verfehlte adressgenau erfasste Records (Recall-Lücke), Top-Orte unterzählten Zürich. **UI-Mitigation umgesetzt** (E-108, `cityOf` in `format.js` + Loader-Konsolidierung + Statistik-Aggregation) — die Wurzel bleibt: Ortsindex um eine Stadt/Q-ID-Spalte erweitern bzw. den Umlaut-Tippfehler quellseitig korrigieren.
- Unverknüpfte Einträge der Verknüpfungstabelle ohne Archivsignatur nachzuordnen.

## Datenqualität laufend

Diese redaktionellen Punkte werden fortlaufend im Erfassungsteam bearbeitet.

- Die Verknüpfungsrate erhöhen. Der Schwerpunkt lag bisher auf den Konvoluten um NIM_003, NIM_004 und NIM_007, Einzelobjekte sind weitgehend unverknüpft.
- Der Bearbeitungsstand ist bei der Mehrheit der Objekte noch offen.

## Status-Tracker

| Arbeitspaket | Status | Notiz |
|---|---|---|
| Neuer Datenstand und Modell-Umsetzung | aktiv | testgetrieben. Erledigt: E-95 (Loader), E-96+E-98 (Performance/StageRole), E-102 (Quality-Flags + DatedEvent + eventDate-Drop + ort,datum-Dedup), E-106 (Datierungs-Konfidenz entfernt, löst E-100 ab), E-101 (Dokumentvokabular, datengedeckte Teile), E-97 (Mobilitäts-Ortsrollen → datumslose STE, datengedeckter Kern; wohnort/vertragspartner mangels Daten vertagt). **E-99 (Finanz-Parser) vertagt:** alle 21 Finanzzeilen parst der Bestand bereits korrekt, die E-99-Sonderfälle kommen 0× vor — wäre spekulativer Code. **Promote erledigt (E-107, 2026-06-18):** Frontend-Daten regeneriert, `docs/data` == `data/output` (+15 E-97-Mobilitäts-STE im Frontend); Staleness-Guard `test_33` ergänzt; `report-quality.py`-Provenienz-Metrik gefixt |
| Ontologie-Konformität (E-103/E-104/E-105) | erledigt | Term-Renames + schema/GND-Migration + test_26-Lock, `agrelon:hasSubject`→`wd:Q94208`, `eventDate`-Drop (mit E-102) — alles umgesetzt, Suite grün |
| Mobilitäts-View (eigener Tab) | erledigt | E-109 → E-111 (2026-06-21, operator-beauftragt). Sichtbarer Tab `mobilitaet`. Zuerst Listendarstellung aller 61 SpatiotemporalEvents nach den fünf Mobilitätssichten (E-109), dann auf direkte Operator-Anweisung durch eine **D3-geo-Trajektorienkarte** ersetzt (E-111): Vollbreitenkarte, Orte als Knoten nach dominanter Mobilitätssicht, biografischer Pfad als gerichtete Pfeile hell-zu-dunkel über die Zeit, Zeitregler mit Abspielen, Sicht-Legende als Filter, Bedienelemente statt Fließtext. Lokale Natural-Earth-110m-Geometrie (`docs/data/geo/`), kein Tile-Server, kein Leaflet. Der globale Klassifikator wurde an § 10 angeglichen (E-110, order-m3gim Punkt 1): die fünf Ortsrollen mappen auf `korrespondenz`, der Statistik-Tab führt sie als „Reise & Korrespondenz" statt „Nicht klassifiziert", `test_25` lockt die Zuordnung. Browser-verifiziert (177 Länder, 11 Knoten, 23 Arcs, Zeit-Reveal greift), Suite grün. Beide Runden nach main gepusht (ea62739, 24ed8e2). **Geschärft (E-114, Milestone-Runde):** Knoten-Tooltip, zoomabhängige Label-Ausdünnung mit Counter-Scaling, ehrlicher Off-Map-Umgang mit dem New-York-Fehlmatch AF-01 (aus Knoten und Pfad ausgenommen, im Detailstreifen ausgewiesen) statt auslaufender Arcs; Screenshot-Spur unter `reports/screens/`, Live-Deploy operator-gated. Offen (handoff Stand 8): Einfärbungsregel Zürich/Köln, Cross-View-Filter (order Punkt 2). |
| Reaktivierung Mobilitäts-Atlas, Repertoire, Biogramm | offen | **Mobilitäts-Atlas durch E-111 überholt:** der sichtbare D3-geo-Mobilitäts-Tab deckt den raumzeitlichen Zweck ab. Die Reaktivierung des verborgenen Leaflet-Atlas ist damit kein Selbstzweck mehr; ob er stillgelegt oder als zweite Sicht reaktiviert wird, ist offene Operator-Frage (handoff Stand 8 Punkt 2). Repertoire und Biogramm bleiben unabhängig davon offen. Pro Tab Daten-Kontrakt, Chip-Muster, Meta-Fresh-Check. **Atlas-Befund (Session 51):** Tab bricht beim Render mit `ReferenceError: L is not defined` — Leaflet ist bewusst nicht eingebunden (`index.html`, `mobility-atlas.js`), die Error-Boundary fängt es graceful ab. Reaktivierung erfordert Leaflet via CDN; zudem fehlen dann die 15 datumslosen E-97-Ortsrollen im Atlas-Zeitstrahl (`datedEvents`-Filter) und adressgenaue Orte ohne Q-ID landen in „unverortet". Den Silent-Drop-Hinweis (analog Statistik, E-108) bei Reaktivierung mitziehen. **Laufzeit-Befund bestätigt (2026-06-21, Forschungsleitstelle):** `window.L` zur Laufzeit `undefined` verifiziert, Datenkontrakt erfüllt (55 verortet, 6 unverortet = die Zürich-Adressvarianten); von den 15 datumslosen fallen 9 verortete Events aus dem Zeitstrahl, erscheinen aber als Kartenmarker, bei Reaktivierung sichtbar machen. |
| Frontend auf SKOS-prefLabel umstellen | erledigt | `format.js` `dftLabel(store, id)` löst Labels aus `store.dftHierarchy` (skos:prefLabel, E-101) auf; alle 7 Views umgestellt, Hand-Map `DOKUMENTTYP_LABELS` aus `constants.js` entfernt. Verifiziert: JS + Loader-Integrationstest. |
| Loader-Integrationstest | erledigt | `tests/frontend/loader.test.mjs` deckt die zuvor ungetestete Strecke JSON-LD→`loadArchive`→store ab (synthetische Fixture + Anker gegen `docs/data`). Schließt die Test-Lücke aus der Session-49-Reflexion. JS jetzt 85. |
| Frontend-Verifikations-Härtung + UI-Sichtbarmachung (E-108) | erledigt | Session 51, nach E-107. **Gegencheck:** `tests/test_34_rawdata_crosscheck.py` prüft JSON-LD-Werte zellgenau gegen die per `(xlsxSheet, xlsxRow)` adressierte XLSX-Rohzelle (381 Records + 61 STE + 15 E-97-Ortsrollen exakt); ersetzt das single-sheet-veraltete `audit-data.py` (zugleich auf `load_verknuepfungen` + `folio nr` gefixt). **Kontrakt:** E-97-Datumslosigkeit nun dreischichtig getestet (`loader.test.mjs` 4 Anker-Briefe, `record-partition.test.mjs` `steChipPrefix`, `smoke.py` ZIELORT-Chip mit „—"). **UI:** `dataQualityFlag` als dezenter Marker an allen 29 Fundstellen (Agenten/Subjekte/Performance), `hasDatedEvent` als „Im Dokument genannte Daten"-Block im Record-Detail (bewusst **nicht** im Biografie-Zeitstrahl — alle 19 sind `erwähnt`, also genannte statt biografische Daten), Silent-Drop-Hinweis im Statistik-Histogramm, Korb-`logStamp`, Ortsnamen-Fragmentierung via `cityOf` gemildert. **Hygiene:** tote `xlsx-fixes.md`-Verweise (18× über 9 Dateien) auf `data.md § 17` umgebogen. |
| STE-@id stabilisieren (Refactoring) | offen | STE-`@id` tragen einen globalen Zähler → jede STE-Änderung verschiebt alle nachfolgenden @ids (`test_22` 3× gebrochen). Vergabe record-lokal oder inhaltsbasiert (Ort+Rolle+Datum-Hash) machen, dann sind @ids über Läufe stabil und kein Test muss daran ankern. |
| Smoke-Loop um Mobilitäts-Tab erweitern | erledigt | E-113 (2026-06-21, Milestone-Runde). `tests/frontend/smoke.py` deckt jetzt alle sieben sichtbaren Tabs ab (`mobilitaet` und `korb` ergänzt), inklusive logStamp-Erwartungen für beide und einem harten Karten-Canary `mobilitaet:karte-render`, der nach dem asynchronen Geometrie-Load Knoten, Pfeile, Sicht-Filter und Ländergeometrie prüft. Verifiziert: smoke 24 OK / 0 FAIL, JS 87/87, pytest frontend-contract + data-fresh 18/18. |
| Datendeckungs-Scouting-Skript | vorhanden | `scripts/scout-coverage.py` existiert (committet a576fe4), scoutet die Datendeckung read-only entlang der Loader-Mappings (Store-Format). Das Grundwerkzeug „erst scouten, dann implementieren" steht (Muster bestätigt, verhinderte in Session 49 E-99 als spekulativen Code); die ticket-spezifische `typ`/`rolle`-Verteilung pro geplantem Ticket bleibt als Ausbau offen. |
| AgRelOn-Granularität | offen | `HasAddressee`/`HasSender` statt pauschal |
| Biogramm-Netzwerk-Spur | blockiert | wartet auf AgRelOn validity-dates |
| Weitere Reconciliation-Runde | optional | Unmatched-Restliste, nicht blockierend |
| Deferred Aufräumarbeiten | zurückgestellt | Partitur-Derivate; build-views/audit-data hasPerformanceRole-Spur |
| Deferred Modell-Erweiterungen | zurückgestellt | Phase 4.5, Phase 4.9, Zenodo, EAD |
| Offene Datenqualität | quellseitig | gegen Quality-Snapshot verifizieren |
| Datenqualität laufend | laufend | Verknüpfungsrate, Bearbeitungsstand |
