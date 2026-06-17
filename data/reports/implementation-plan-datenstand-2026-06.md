# Implementierungsplan: Neuer Datenstand 2026-06 -> Pipeline -> Frontend

> Orchestrierungs-Spezifikation fuer die phasierte Workflow-Uebergabe. Arbeitsdokument, kein knowledge/-Spec.
> Quelle der Modell-Spec bleibt data.md (G1-G8) + decisions.md (E-95 bis E-102).
> Erstellt: 2026-06-17. Status: zur Freigabe.

## Ausgangslage

Spec (data.md, decisions E-95-E-102) und Infrastruktur (backup.py, Frontend-Renames) sind committet (0e54fc6). Nicht umgesetzt: Test-Welle, Loader-Fix, sieben Modell-Feature-Gruppen, Promote, Frontend-Vokabular, Tab-Reaktivierung. Der neue Export liegt in `data/backup/2026-06-17T055322Z/` (gitignored), noch nicht promoted nach `data/google-spreadsheet/`.

## Strukturbefunde des neuen Exports (empirisch, treiben alles)

- Verknuepfungen = 6 Box-Sheets, inkonsistent benannt: `Box_01, Box_02, Box_4, Box 5, Box 6, Box 9`.
- Signaturspalte ohne Header, Position 0; 29 Zeilen mit leerer Signatur (forward-fill noetig).
- Spaltenlayout variiert pro Sheet: Box 6 ohne `datenpunkt_id`.
- Header-Shifts in allen 4 Indizes: Datenwerte als Koepfe (`Claredon`, `Turin`, `Rossini, Gioachino`, `Barber, Samuel`), Personen-Namensspalte leer.
- 3.699 Datenzeilen, 80 distinkte Rollen.
- Komposit-typen: `rolle, person`(51), `datum, werk`(73), `ort, datum`(92), `einnahmen/ausgaben/summe, waehrung`(56 gesamt).
- typ `rolle, vorname nachname saenger*in`(230, v.a. Box 5): GEKLAERT = geleakte Erfassungs-Instruktion; name-Werte sind echte Rolle,Person-Paare ("Bruennhilde, Astrid Varnay"). ENTSCHEIDUNG: strukturell auf `rolle, person` normalisieren (groesster Performance-Lieferant). Faellt aus der Durchreich-Policy (struktureller Blocker).
- Mobilitaets-Ortsrollen real: `zielort, absendeort, abreiseort, empfangsort, vertragsort, entstehungsort, wohnort, auffuehrungsort`.
- Finanz-Rollen + Status: `abendgage, gesamtverguetung, provision, rundfunkshonorar, reisekosten`, `nicht eingehalten`(9).
- Korrespondenz: `verfasser:in`(67), `adressat:in`(30), `empfaenger:in`, `unterzeichner:in`.
- Tippfehler durchreichen (CLAUDE.md): `maskenbidner:in`(14), `rundfunkshonorar`(3).

## Korrekturen aus dem Understand-Sweep (wf_ca56bb98)

Read-only Grounding vor der Implementierung hat zwei Annahmen revidiert:

- **Staging ist geloest, kein Promote-Risiko in Phase 0-2.** `transform.py` ist ueber `M3GIM_SHEETS_DIR`/`M3GIM_OUTPUT_DIR`, Tests ueber `M3GIM_JSONLD_PATH` voll parametrisiert. TDD laeuft gegen den Backup-Export nach `c:/tmp/m3gim_v2_output`, Produktion (`data/google-spreadsheet/`, `data/output/`, `docs/data/`) bleibt unberuehrt bis Phase 3.
- **Weniger Greenfield.** Komposit-Dekomposition, `DATUMSROLLE_TO_PROPERTY`, `AGRELON_MAPPING`, `DFT_BROADER`, `INDEX_HEADER_SHIFTS` (org/orts/werk) und im Frontend `EVENT_ROLE_TO_MOBILITY_CLUSTER` (mit 7 auskommentierten pending-Eintraegen) existieren bereits. Offen erzeugt werden v.a. `m3gim:Performance`/`StageRole` (E-96/E-98 ersetzen das alte `hasPerformanceRole`-Artefakt), die date-losen Mobilitaets-STE (E-97), der Finanz-Umbau (E-99) und die Qualitaets-/Datums-Routing-Schicht (E-100/E-102).
- **Produktionsquelle ist Single-Sheet und sauber** - E-95 wird nur fuer den neuen Box-Export gebraucht; der Loader muss rueckwaertskompatibel bleiben.
- Nur 2 bestehende xfail: test_05 (PL_07-Duplikat, non-strict), test_24 (Beethoven van/von, strict).

## Kritische Abhaengigkeitskette (drei harte Gates)

```
E-95 Loader  ->  Test-Welle rot (TDD)  ->  Backend-Features gruen  ->  Promote + Snapshot-Diff  ->  Frontend
   blockiert        Gate (CLAUDE.md)        teilen transform.py          erzeugt Output erst hier      braucht Output
```

Parallelitaet gehoert INNERHALB der Phasen, nicht ueber die Lanes.

## Phasen

### Phase 0 - Loader-Absorption (E-95) | Backend | serielles Gate | 1 Agent
- transform.py:1108 `pd.read_excel(verk_path)` -> Multi-Sheet-Loader: alle 6 Boxen via `pd.ExcelFile`, je Sheet Header=Zeile 0, Spalte 0 -> `archivsignatur`, Signatur forward-fillen, Spaltenvarianz (Box 6 ohne `datenpunkt_id`) tolerieren, concat.
- load_index:313 + INDEX_HEADER_SHIFTS (_common.py): Shifts fuer Personen-/Orts-/Org-/Werkindex.
- Guards: Literal-`Folio`-Zellen, nicht-textuelle Spaltenkoepfe.
- DoD: Strukturinvarianten-Tests (1a) gruen gegen neuen Export.

### Phase 1 - Test-Welle | Test | fan-out 2-3 Agents | TDD-rot
- 1a Strukturinvarianten (modellunabhaengig): 6 Boxen geladen, Zeilen-Untergrenze, keine @id-Kollision, referenzielle Integritaet Signatur<->Objekte, Q-IDs nie literal, forward-fill korrekt. Gruen nach Phase 0.
- 1b Modell-Spec (xfail strict), je Gruppe ein test_NN:
  - E-96/E-98 StageRole + Performance
  - E-97 Mobilitaets-Ortsrollen + vertragspartner-AgRelOn + wohnort-Zustand
  - E-99 Finanz-Parser + contractStatus
  - E-101 Dokumentvokabular + Aboutness + AgRelOn-Granularitaet (HasAddressee/HasSender)
  - E-100/E-102 Konfidenz-Disziplin + dataQualityFlag + Datums-Routing
- Bestehende Vokabular-Tests (test_15) koordiniert erweitern.

### Phase 2 - Backend Modell-Features | Backend | SERIELL, 1 Owner | bis XPASS
Begruendung seriell: Features verzahnen sich am geteilten Dispatch; xfail-Tests sind das Sicherheitsnetz; Merge-Fehler im Datenkern zu teuer.
- E-96/97/98 Komposite + Events: decompose_komposit_typ/value (559/566), process_verknuepfungen (588)
- E-99 Finanz + contractStatus: parse_monetary_value (522)
- E-97/E-101 AgRelOn: _maybe_add_agrelon/add_relations_to_records (698/729)
- E-101 Vokabular: build_dft_concepts (217)
- E-100/E-102 Datum/Qualitaet: clean_date/is_iso_date (273/298) + Routing
- xfail-Marker je Feature entfernen sobald XPASS; Suite gruen halten.

### Phase 3 - Promote + Snapshot-Diff | Gate | 1 Agent
- Backup -> data/google-spreadsheet/ promoten (manueller Schritt laut backup-log).
- transform.py + build-views.py laufen lassen.
- snapshot_diff.py alt<->neu als Gate; verify-manual-approvals.py; Reconciliation-Runde; Quality-Snapshot neu generieren.

### Phase 4 - Frontend-Vokabular | Frontend | 1 Agent
- Neue Rollen/eventRoles in constants.js aktivieren (Cluster mit Frontend abstimmen), Rolle-Prefix-Chip-Muster, Meta-Fresh-Check, optional SKOS-Labels.

### Phase 5 - Tab-Reaktivierung mit Mobilitaetsfokus | Frontend | 3-4 Agents parallel
Die drei versteckten Tabs reaktivieren, ueberarbeiten und auf Mobilitaetsfragen schaerfen. Mechanik (aus Sweep): Tabs rendern bereits korrekt (Leaflet/D3 on-demand), Aktivierung = `hidden`-Attribut in index.html entfernen + Tab in `VISIBLE_TABS` (router.js) aufnehmen + Meta-Fresh-Check. Pro Tab: Daten-Kontrakt gegen Store verifizieren, Rolle-Prefix-Chip-Muster (`buildRoleChip`), Cluster-Audit.

**Forschungsleitendes Mobilitaets-Briefing (aus Obsidian-Vault, Project Overview, nur Hintergrund - nichts davon ins Repo kopieren):**
- **5 Mobilitaetstypen** (Theorie, Bewegungstypen): nationale / geografische / erzwungene Migration / Bildungs- / Lebensstil-Mobilitaet. Spine fuer den Atlas - jede Bewegung einem Typ zuordenbar.
- **Motilitaet vs. realisierte Mobilitaet** (Strohmann): bildet E-97 exakt ab - `wohnort` = Zustand/Motilitaet (Validity-Period), `zielort/abreiseort/empfangsort` = realisierte Bewegungs-Events. Der Atlas kann beide visuell trennen.
- **Achtung Doppeldeutung "5 Typen":** die Frontend-Konstante `EVENT_ROLE_TO_MOBILITY_CLUSTER` nutzt eine ANDERE 5er-Gliederung (performativ/institutionell/korrespondenz/diskursiv/biografisch = Event-Kategorien), nicht die theoretischen Bewegungstypen. In Phase 5 zu entscheiden: Event-Cluster behalten und um die Bewegungstypen als zweite Achse ergaenzen, oder zusammenfuehren.
- **3 interne Validierungs-Hypothesen** als Zielbilder: Wagner-Hypothese (Wagner~Verdi gleich gross, Fricka groesster Rollenknoten), Bayreuth-Netzwerk (Dirigenten-Begegnungen ab 1950-54), Vermittler Erik Werba (durchgaengig in jeder Netzwerk-Spalte).
- **Design-Praezedenz** (Schwesterprojekt Luschan): Humboldt-Reiserouten-Karten (avhumboldt.de), Pleiades-Cluster/Region-Marker, Muster "Stationen-Geruest mit Objekten als Belege" - uebertragbar auf Malaniuks Karrierestationen.

**Tab-Zuschnitt:**
- **Mobilitaets-Atlas** (`docs/js/views/mobility-atlas.js`, Store `mobilityEvents`): date-lose E-97-STE + Ortsrollen; Lanes/Filter nach Bewegungstyp; Timeline-Kreise von hardcoded Palette auf `mobilityClusterFor(role)` umstellen; Performance-Orte einblenden sobald E-98 da ist.
- **Repertoire** (`repertoire.js`, Store `works`/`records`): E-96/E-98 Performance/StageRole; chronologische Werk-Timeline, `hasStageRole`-Verteilung, Auffuehrungsorte-Spur pro Werk; optional Finanz-Cross-Link (Honorar pro Werk/Komponist). Zielbild Wagner-Hypothese.
- **Biogramm** (`biogram.js`, Store `mobilityEvents`/`records`/`persons`): Orte-Spur in 5 Lanes nach Cluster partitionieren; Belege-Spur nach DFT-Kategorie einfaerben; Netzwerk-Spur erst wenn AgRelOn Validity-Dates traegt (plan.md, blockiert).

## Agenten-Map (~10-12 Laeufe)

| Phase | Laeufe | Parallel |
|---|---|---|
| 0 Loader | 1 | nein (Gate) |
| 1 Test-Welle | 3 | ja (getrennte test_NN) |
| 2 Backend-Features | 1 (ggf. in Etappen gecheckpointet) | nein (seriell) |
| 3 Promote/Diff | 1 | nein (Gate) |
| 4 Frontend-Vokabular | 1 | - |
| 5 Tabs | 3-4 | ja (getrennte view-Dateien) + 1 Verify/Synthese |

## Lauf-Ergebnis (wf_62cf81c2)

### Phase 0 (Loader E-95) - FERTIG und committfaehig
- transform.py: `load_verknuepfungen()` als wiederverwendbarer Multi-Sheet-Loader (alle 6 Boxen, positionsbasierte Signatur, forward-fill je Sheet, Spaltenvarianz Box 6, Sheet+Zeile in die xlsx-Provenance). decompose_komposit_typ normalisiert `rolle, Vorname Nachname Saenger*in` -> `rolle, person`. Guards fuer Literal-`Folio` und nicht-textuelle Objekte-Header.
- _common.py: Personenindex in INDEX_HEADER_SHIFTS; load_index mit Diskriminator (col-0 == `m3gim_id` -> echter Header, nur Spalten umbenennen statt Datenzeile injizieren). Effekt: Personenindex-Lookup 0 -> 421, Junk-Header-Eintraege in Org/Werk eliminiert (auch im Produktionsstand).
- conftest.py: xlsx_verknuepfungen nutzt denselben load_verknuepfungen (eine Quelle).
- **Rueckwaertskompatibilitaet bewiesen:** Loader gegen Produktionsdaten -> Snapshot-Diff 0 Aenderungen (Records 381->381, Verknuepfungen 951->951, alle Dimensionen +-0). Testsuite gegen Produktion = Baseline (175 passed, 1 failed=Playwright, 15 errors=Partitur-Deadweight).

### Verify-Befund korrigiert (False Positive)
Der Loader-Verify-Agent meldete "CRITICAL 99,2% Datenverlust, Loader-Regression". Direkte Pruefung widerlegt das: angehaengte Provenance nach Sheet im Stage-Output = Box_01 1105, Box 5 573, Box 6 274, Box_4 238, Box_02 145, Objekte 906. Box 5 ist NICHT weg. Records tragen das Folio im Identifier (`{sig} {folio}`, Zeile 409), die Verify-Annahme "Identifier ohne Folio" war falsch. Die tatsaechlichen Luecken sind Content-Gaps (durchreichen), kein Code-Bug.

### Offene Content-Gaps (durchreichen, Archivteam / plan.md Offene Datenqualitaet)
- `UAKUG/NIM_168` (Box 9, 14 Zeilen): keine Objekt-Zeile vorhanden -> Relations koennen nicht attachen. Objektzeile nachpflegen oder Eintrag korrigieren.
- `UAKUG/NIM_137` (Box 5): mehrere referenzierte Folios (z. B. 9_27, 8_30, 7_1, 11_21) existieren nicht in Objekte.
- Datumskontaminierte Folio-Zellen in Box 5 (z. B. `2026-02-15` in der Folio-Spalte) - Erfassungsfehler in der Folio-Position.

### Offen (naechste Arbeit, NICHT im Phase-0-Commit)
- Phase 1 (Test-Welle) + Phase 2 (E-96..E-102): im autonomen Lauf nicht fertig geworden (Test-Autoren scheiterten/retry am Stage-Output). Empfehlung: seriell und human-guided umsetzen, kein erneuter grosser Autonom-Lauf im Daten-Integritaetskern.

## Workflow-Trace

- `wf_ca56bb98` (Understand-Sweep, read-only): Grounding-Map abgeschlossen.
- `wf_62cf81c2` (Phase 0-2 autonom): Phase 0 fertig + rueckwaertskompatibel; Verify-False-Positive; Phase 1/2 nicht abgeschlossen. Manuell verifiziert und committfaehig auf Phase 0 reduziert.
- Phase 1/2 (Tests + Modell-Features), Phase 3 (Promote), Phase 4/5 (Frontend) folgen als separate Schritte.

## Rote Linien (CLAUDE.md)
- Keine Commits ohne explizite Aufforderung.
- Nicht direkt in docs/data/ schreiben; nur ueber build-views.py.
- Pipeline-Workarounds nicht inhaltlich faelschen; Datenfehler ins Frontend durchreichen.
- M3GIM-Verknuepfungen.xlsx mit ue-Umlaut; Plakate-IDs mit Slash.
