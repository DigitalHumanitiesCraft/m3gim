---
title: Datenfehler-Register
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: active
created: 2026-06-21
updated: 2026-08-21
language: de
version: 0.4
authors: [Christopher Pollin]
generated-with: Claude Code
related: [specification, data, pipeline-architecture, architecture-decisions]
---

# Datenfehler-Register

> Gesammelte, laufend gepflegte Liste von allem, was quellseitig zu beheben ist, getrennt nach Quellfehler, Abgleichfehler und strukturellen Quell-Fixes, jeder Eintrag mit Fundstelle und Status. Dies ist die kanonische Adresse für Datenfehler; [specification.md](specification.md) § Stand und der Sichtprüfungs-Report (`data/reports/frontend-sichtpruefung-2026-06-21.md`) verweisen hierher.

## Grundsatz

Datenfehler werden in dieser Lane nie selbst korrigiert (order-m3gim 2026-06-21, Punkt 3). Die Korrektur liegt bei der Datenerfassung (Quellfehler im Excel) oder in einer Reconciliation-Runde mit Approval-Verifikation (Abgleichfehler). Die Pipeline reicht Quellfehler getreu durch, was `tests/test_34_rawdata_crosscheck.py` zellgenau gegen die per `(xlsxSheet, xlsxRow)` adressierte Rohzelle belegt. Zwei Quellfehler sind über xfail-Marker test-gelockt, damit sie nicht stillschweigend verschwinden, sondern beim Quell-Fix sichtbar umschlagen.

Status-Werte: `offen` (noch nicht adressiert), `test-gelockt` (durch einen xfail-Test gegen stilles Regressieren gesichert), `UI-gemildert` (Frontend-Mitigation greift, die Quellwurzel bleibt offen).

## Quellfehler

Im Excel zu beheben. Vor der Bearbeitung jeweils gegen den [Quality-Snapshot](../data/reports/quality-snapshot.md) verifizieren, da ein frischer Export einige Punkte bereits behoben haben kann.

| ID | Befund | Fundstelle | Status |
|---|---|---|---|
| QF-01 | Zukunftsdatum: `NIM_004_34` trägt das Jahr 2026 in einem Kritiken-Konvolut der Spanne 1952 bis 1968. Folge im Interface: der Zeitfenster-Slider im Netzwerk-Tab reicht bis 2026. | `M3GIM-Objekte.xlsx`, Record `NIM_004_34` | offen |
| QF-02 | `zielort` von `NIM_007_20`/`NIM_007_21` wirkt vertauscht. Umschlag „an Deutsche Oper Berlin" (NIM_007_20) trägt `zielort = Zürich`, „an Stadttheater Zürich" (NIM_007_21) trägt `zielort = Berlin`. Die Zielorte widersprechen den Titeln. | `M3GIM-Verknüpfungen.xlsx` Zeile 1269 und 1273; Titelquelle `M3GIM-Objekte.xlsx` | offen |
| QF-03 | Beethoven van gegen von: in Repertoire-Statistik und Werkindex erscheinen `Beethoven, Ludwig van` und `Beethoven, Ludwig von` als zwei getrennte Komponisten. | Werkindex; `van` bei 9. Sinfonie und Geschöpfe des Prometheus, `von` bei mehreren Liedern | test-gelockt (`test_24`) |
| QF-04 | PL_07-Duplikat: für `UAKUG/NIM/PL_07` existieren zwei Zeilen im Objekte-Sheet. Die Pipeline kompensiert auf einen Record, im Graph gibt es keine doppelten `@id` mehr; `test_05` wacht ohne Marker über die Eindeutigkeit. | `M3GIM-Objekte.xlsx`, Signatur `UAKUG/NIM/PL_07` | quellseitig offen, kompensiert |
| QF-05 | Sophokles-Rolle: Sophokles trägt die Rolle `Aufführung`, obwohl sein Werk aufgeführt wurde, nicht er selbst. Korrekt wäre `Vorlage` oder `Verfasser`. | `M3GIM-Verknüpfungen.xlsx` Zeile 1208 | offen |
| QF-06 | Verwaiste Signatur `UAKUG/NIM_11`: ein Verknüpfungseintrag ohne erfasste Objektzeile, betroffen ist die einzige arbeitgeber-Zeile (`test_12` skipt dort). | `M3GIM-Verknüpfungen.xlsx`, Signatur `UAKUG/NIM_11` | offen |
| QF-07 | Folio-Granularität `UAKUG/NIM_168`: Box 9 adressiert die Sub-Folios 2_1 bis 2_3, das Objekte-Sheet kennt nur die Folios 1 und 2. Die Verknüpfungen hängen an nicht existierenden Record-IDs und gehen verloren. Quellseitig lösbar, entweder Sub-Folios im Objekte-Sheet ergänzen oder die Verknüpfungsfolios auf 2 vereinheitlichen; ein Pipeline-Fallback würde die Provenienz falsch zuordnen. | `M3GIM-Verknüpfungen.xlsx`, Box 9 / `M3GIM-Objekte.xlsx` | test-gelockt (`test_04` xfail strict) |
| QF-08 | Fehlende Objekt-Folios bei `UAKUG/NIM_137`: mehrere in Box 5 referenzierte Folios fehlen im Objekte-Sheet, die zugehörigen Verknüpfungen laufen ins Leere. | `M3GIM-Objekte.xlsx` / `M3GIM-Verknüpfungen.xlsx`, Box 5 | offen |
| QF-09 | Datum in der Folio-Spalte: in Box 5 trägt mindestens eine Folio-Zelle ein Datum statt einer Folio-Nummer. | `M3GIM-Verknüpfungen.xlsx`, Box 5 | offen |
| QF-10 | Verschwundenes Presse-Konvolut: ein im vorigen Stand vorhandenes Konvolut fehlt im neuen Export, zu prüfen ob versehentlich entfernt. | Export-Diff voriger zu aktueller Stand | offen |
| QF-11 | Erfassungs-Tippfehler: `Maskenbidner` → `Maskenbildner`, `Rundfunkshonorar` → `Rundfunkhonorar`, `Malaiuk`/`Malniuk`/`Malnaiuk` → `Malaniuk`. Die Pipeline reicht sie bis zur Quellkorrektur unverändert durch. | XLSX-Erfassung, mehrere Zellen | offen |
| QF-12 | Zürich-Adressvarianten mit Umlaut-Tippfehler: `Zürich, Zurichbergstrasse 104` (`Zu` statt `Zü`) neben `Zürich, Zürichbergstrasse 104`. Teil der adressgenauen Ortsfragmentierung (siehe AF-03). | `M3GIM-Ortsindex.xlsx` | UI-gemildert (`cityOf`, E-108) |
| QF-13 | Dubletten und fehlende Index-IDs: mehrere Personen-, Organisations- und Werk-Einträge sind doppelt erfasst oder ohne `m3gim_id`. | Personen-, Organisations-, Werkindex | offen |
| QF-14 | Betrag in der Währungs-Spalte: einzelne Finanz-Verknüpfungen tragen als Währung `00 DM` bzw. `00 Belgische Francs` (Betrag in das Währungsfeld gerutscht), die in der Statistik als eigene Währungen erschienen. | `M3GIM-Verknüpfungen.xlsx`, Finanz-Verknüpfungen (`einnahmen`/`ausgaben`, `währung`) | UI-gemildert (Statistik-Donut bündelt Codes mit Ziffern als „unklar (Erfassung)") |
| QF-15 | Partner-Namensvarianten in den AgRelOn-Relationen: derselbe Beziehungspartner in mehreren Schreibweisen — `Taubman, Martin Hugo` / `Taubman, Martin`; `Cox, Warren` / `Warren, Cox` (Reihenfolge vertauscht). In der „Mit wem“-Partnerliste (E-123) erscheinen sie als getrennte Partner; bewusst roh gezeigt (Erschließungsspiegel), Quellfix nötig. | `M3GIM-Verknüpfungen.xlsx`, AgRelOn-Verknüpfungen | offen |
| QF-16 | Orts-Casing- und Reconciliation-Rest in den Mobilitäts-Ortsrollen: neben dem rekonzilierten `Bayreuth` (→ `wd:Q3923`) überleben unrekonzilierte Strings mit `@id:null`, nämlich `bayreuth` (Kleinschreibung), `Bayeuth` (Tippfehler) und `Bayerische Staatsoper` (Institution als Ort). Die Reconciliation-Pipeline löst die Masse upstream auf, diese fallen durch. Im Frontend erscheinen sie, weil Views den rohen `.name` rendern statt das aufgelöste Q-ID-Label (Chronik zeigt so „Bayeuth"). UI-Empfehlung: über `@id` gruppieren/färben, aufgelöstes Label anzeigen; der unrekonzilierte Rest bleibt ein Quellfix. | Mobilitäts-Ortsrollen / `M3GIM-Verknüpfungen.xlsx`; Reconciliation | offen (Quellfix), UI-gemildert über `@id`-Label |
| QF-17 | Datums-Tippfehler bei `NIM_004_5`: `rico:date` trägt 1963 statt 1953. Bei den Bayreuth-Records gibt es kein belegtes Datum nach 1953, der Wert fällt als Ausreißer auf und verschiebt den Zeitbezug des Records um ein Jahrzehnt. Befund aus der Bayreuth-Visualisierungsanalyse. | `M3GIM-Objekte.xlsx`, Record `NIM_004_5` | offen |
| QF-18 | Jahrhundertdreher im Erstelldatum von `UAKUG/NIM_011 7`: die Datumszeile trägt `1055-08-24`, während das Dokumentdatum `1955-08-24` lautet. Der Wert erscheint als `m3gim:erstelldatum` am Record und ist kein plausibles Datum des Bestands. | `M3GIM-Verknüpfungen.xlsx`, Blatt `Box_01`, Zeile 1557 | offen |
| QF-19 | Personenrolle in der Finanzspalte von `UAKUG/NIM_011 7`: die Ausgabenzeile über `15,00 DM` trägt als Rolle `interpret:in`. Der Wert landet als `m3gim:detailRole` an der DetailAnnotation, wo eine Finanzrolle erwartet ist. | `M3GIM-Verknüpfungen.xlsx`, Blatt `Box_01`, Zeile 1560 | offen |

## Abgleichfehler

Entstehen im automatischen Wikidata-Match (Reconciliation), nicht in der Quelle. Korrektur über eine manuelle Q-ID im jeweiligen Index oder eine erneute Reconciliation-Runde mit Approval-Verifikation (`scripts/verify-manual-approvals.py`).

| ID | Befund | Fundstelle | Status |
|---|---|---|---|
| AF-01 | New York als Bundesstaat statt Stadt: die New-York-Events tragen `wd:Q1384` (Bundesstaat, Zentroid 43 / -75) statt `wd:Q60` (Stadt, 40.7 / -74.0). Für Absende- und Zielort einer Korrespondenz ist die Stadt gemeint; im reaktivierten Atlas läge der Marker an falscher, ländlicher Position. Gleiche Klasse wie der frühere Q2861-Rostock-Fall (behoben). | STE `absendeort` NIM_004_1, `zielort` NIM_004_23, `entstehung` NIM_004_27 | offen |
| AF-02 | Personen-Fehlmatches auf gleichnamige, prominentere Entitäten, im Interface an widersprüchlichen Berufs- und Lebensdaten erkennbar: Dermota als Politiker (1876 bis 1914 statt Tenor 1910 bis 1989), Böhme als Ubootfahrer, Holm als Botaniker, Wächter als Maler (1762 bis 1852), Wiener als Physiker, Richter als Tischtennisspieler. Nicht je einzeln gegen Wikidata abschließend verifiziert; der Label-Widerspruch ist der Befund. | Personenindex, genannte Namen | offen |
| AF-03 | Adressgenaue Orte ohne Stadt-/Q-ID-Ebene: der Reconcile-Match-Key ist der rohe Ortsname-String, der Ortsindex trägt keine Stadt-/Q-ID-Spalte. Adressvarianten erhalten keine Q-ID, nur die nackten Städtenamen. Betroffen u. a. `Zürich, Zürichbergstrasse 104`, `Zürich, Geibelstrasse 1/1`, `München, Martiusstrasse 3`. Frontend-Folge: der Ort-Filter „Zürich" verfehlte adressgenau erfasste Records, etliche Events bleiben im Atlas unverortet. | `M3GIM-Ortsindex.xlsx` | UI-gemildert (`cityOf` + Loader-Konsolidierung, E-108) |
| AF-04 | Gründungsdaten ohne gültige ISO-Form: `m3gim:inception` trägt Werte der Gestalt `1715-00-00`, wenn Wikidata die Angabe nur jahresgenau führt. Die Anreicherung übernimmt das Zeitliteral verbatim und schneidet die Präzisionsangabe weg, sodass Monat und Tag als Nullen stehen bleiben. Betroffen sind mehrere Institutionen, darunter das Théâtre National de l'Opéra-Comique. | Wikidata-Anreicherung (`scripts/enrich-wikidata.py`, P571), Organisationsknoten im JSON-LD | offen |

## Strukturelle Quell-Fixes

Diese Punkte betreffen das Excel-Format, nicht einzelne Fehlwerte. Jeder erledigte Punkt erlaubt den Abbau einer Pipeline-Kompensation aus dem Katalog in [data.md](data.md) § Datenqualität.

- Index-Header-Shifts in Organisations-, Orts- und Werkindex. Eine saubere Kopfzeile in diese Index-Blätter einfügen und beim Excel-Export mitgeben, damit die Pipeline-Kompensation entfallen kann.
- Bearbeitungsstand-Dropdown. Die Spalte als Google-Sheets-Dropdown mit den kanonischen Werten `abgeschlossen`, `begonnen` und `zurueckgestellt` konfigurieren, damit das Normalisierungs-Mapping entfällt.
- Freitext-Datierungen strikt nach ISO. Die Datumsspalte ausschließlich als ISO-Datum erfassen (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `YYYY/YYYY`) und ortsmischende Freitext-Angaben in eine separate Anmerkungsspalte verschieben.
- Ort-Datum-Rollentrennung. Bei Komposit-Einträgen `ort, datum` die Rolle nur dem Datum zuordnen, nicht dem Ort, damit der `rico:Place` keine Datumsrolle erbt.
- Stabiler Folio-Spaltenname. In den Objektdaten einen stabilen Spaltennamen festlegen (aktuell `folio nr`), damit die heuristischen Spalten-Fallbacks wegfallen können.
- Sammel-Zeilen und @id-Kollision. Sammel-Zeilen, die ein Konvolut insgesamt beschreiben, entfernen und ihren Inhalt als Konvolut-Metadaten unterbringen, oder ihnen eine eigene Folio-Nummer geben, damit keine zwei Graph-Knoten mit gleicher @id entstehen.
- Beethoven van/von-Vereinheitlichung im Werkindex. Die als `Beethoven, Ludwig von` erfassten Zellen auf `Beethoven, Ludwig van` vereinheitlichen, danach den xfail-Marker in `test_24` entfernen (siehe QF-03).
- Box-Sheet-Struktur der Verknüpfungstabelle. Eine einheitliche Kopfzeile mit benannter `archivsignatur`-Spalte und konsistente Sheet-Benennung setzen, damit die Mehrblatt- und Forward-Fill-Kompensation (E-95) entfallen kann. Dropdown-Werte lassen sich Tab-übergreifend halten, indem die Validierung aller Box-Sheets auf denselben benannten Bereich auf einem Vokabular-Hilfsblatt zeigt; eine neue Spalte propagiert dagegen nicht automatisch und muss in jeder Box ergänzt werden. Beides löst sich grundlegend, wenn die Boxen zu einem einzigen Verknüpfungs-Sheet zusammengeführt werden (die Pipeline liest sie ohnehin als Union, E-95).
- Personenindex-Kopfzeile. Eine saubere Namensspalten-Kopfzeile einfügen, damit der Header-Shift für den Personenindex entfällt.
- Literal-Folio-Zellen. Zellen mit dem Wert `Folio` durch die tatsächliche Folio-Nummer ersetzen, damit der Guard entfallen kann.

## Anreicherung und Normdaten (laufende Pflege)

- GND-IDs für die Kernpersonen anreichern.
- Wikidata-IDs durchgängig pflegen, damit die Normdaten-Verknüpfung über alle Indizes hinweg trägt.
- Wikidata-Fehlmatches korrigieren, siehe AF-01 und AF-02; über `verify-manual-approvals.py` plus gezielte Reconciliation-Prüfung beheben.
- Ortsdubletten normalisieren, siehe AF-03 und QF-12; daneben ein Stuttgart-Whitespace-Fall und Freitextmischungen wie `Wien, ab 1956`. Die Wurzel bleibt, den Ortsindex um eine Stadt/Q-ID-Spalte erweitern.
- Unverknüpfte Einträge der Verknüpfungstabelle ohne Archivsignatur nachzuordnen.

## Verwandte Befunde ohne Quell- oder Abgleichfehler

Diese Punkte tauchen beim Durchklicken auf, sind aber Frontend- oder Spezifikationsfragen, keine Datenfehler, und werden im Code adressiert.

- Mobilitäts-Klassifikator (Befund M1/F1 der Sichtprüfung): die typisierten Ortsrollen wurden als „Nicht klassifiziert" geführt, obwohl [data.md](data.md § Ortsrollen) sie der Reise- und Korrespondenzmobilität zuordnet. Per order-m3gim Punkt 1 aufgelöst, die typisierten Ortsrollen mappen jetzt auf den `korrespondenz`-Cluster (Entscheidung E-110 in [architecture-decisions.md](architecture-decisions.md)).
- Datierungs-Metrik-Differenz (Befund F2): das Statistik-Histogramm und die Atlas- beziehungsweise Store-Zählung kommen auf leicht unterschiedliche Zahlen datierter Events. Differenz aus unterschiedlicher Jahr-Parselogik, nicht blockierend, bei einer Mobilitäts-Überarbeitung die Zählwege angleichen.
- Selbstbezügliche Korrespondenzbeziehungen (Befund der Vokabular-Formalisierung, siehe [vocabulary-derivation-findings.md](vocabulary-derivation-findings.md) § 4): die Pipeline setzt die Nachlassbildnerin fest als Subjekt jeder AgRelOn-Beziehung. Ist sie zugleich Adressatin oder Absenderin des Dokuments, entsteht eine Korrespondenzbeziehung von ihr zu sich selbst, mit identischer Wikidata-Kennung auf beiden Seiten (Beispiel `UAKUG/NIM_011 7`). In einem persönlichen Nachlass ist das der Regelfall. **Pipeline-Befund mit Datenwirkung, keine Korrektur vorgenommen.** Die Auflösung verlangt eine fachliche Entscheidung darüber, ob solche Beziehungen unterdrückt, umgehängt oder als Selbstbezug stehen gelassen werden; jede Variante ändert den erzeugten Datensatz.
- Erkennungslücke `dataQualityFlag` (E-102, Audit): die vier Flag-Regex (`name-nicht-eindeutig`/`vorname-fehlt`/`rolle-unsicher`/`quelle-tippfehler`) sind bewusst konservativ und fangen einige reale Unsicherheitssignale in `anmerkung` nicht (`Vorname unklar`, `unleserlich`, einzelnes `[…?]`). Bewusst kein Mislabeling, eine „unklar"-Zeile ist nicht „fehlt". Bei Bedarf Regex erweitern (ggf. neue Flags `quelle-unleserlich`/`vorname-unklar`) oder quellseitig vereinheitlichen. Pipeline-Heuristik, kein Datenfehler.
