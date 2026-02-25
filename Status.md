# Status — M3GIM (Mapping Mobile Musicians)

> Letzte Aktualisierung: 2026-02-25, nach Session 19

---

## Pipeline & Daten

- [x] Pipeline Iteration 2 lauffaehig (explore → validate → transform → build-views → reconcile)
- [x] validate.py Encoding-Bugs gefixt (69 → 1 Fehler, Mojibake in VOCAB + KOMPOSIT_TYPEN)
- [x] `normalize_bearbeitungsstand()` eingefuehrt (spiegelt transform.py Logik)
- [x] Wikidata-Reconciliation: 171 Matches (reconcile.py)
- [x] Wikidata-CSV-Export: 5 CSVs fuer Google-Sheets-Import (export-wikidata-csv.py)
- [x] RiC-O 1.1 Compliance: 6 Property-Korrekturen nach OWL-Check
- [x] Pipeline-Status: BESTANDEN (1 Fehler = PL_07-Duplikat, Sheet-seitig)
- [ ] PL_07-Duplikat im Google Sheet loeschen (leere Zeile 9)
- [ ] Wikidata-Ergebnisse in Google Sheets uebertragen (171 Matches, CSVs vorhanden)
- [ ] Header-Shifts in 3 Indizes korrigieren (Org, Ort, Werk — echte Header-Zeile einfuegen)
- [ ] Folio-Spalte in Objekte-Tabelle benennen (Header `folio` setzen)
- [ ] Bearbeitungsstand-Werte mit Team vereinbaren

## Frontend

- [x] 4 aktive Tabs: Archiv, Indizes, Mobilitaet, Korb
- [x] Archiv: Sortierung, Autocomplete, erweiterte Suche, Inline-Expansion, Bookmark-Icons
- [x] Indizes: Facettensuche, Cross-Navigation, Wikidata-Icons, WD-Coverage
- [x] Mobilitaet: Schwimmbahn-Timeline (D3.js), 7 Swim-Lanes, Floating-Tooltips, Popup-Menue
- [x] Mobilitaet: Skalenbruch bei 1975, GUEST_DISPLAY_MAP, PHASE_ABBR
- [x] Wissenskorb: Card-Details, sessionStorage, Cross-Navigation
- [x] 5 Info-Seiten (about, projekt, modell, hilfe, impressum) mit einheitlichem Header
- [x] Matrix + Kosmos Code erhalten, Tabs ausgeblendet (hidden)
- [ ] Matrix wieder einblenden + Zeitfilter-UI entscheiden
- [ ] Kosmos wieder einblenden + Wikidata-Icons integrieren
- [ ] Cross-Visualization Linking (Mobilitaet → Matrix → Kosmos)
- [ ] Wissenskorb-Export (CSV/BibTeX)
- [ ] Leaflet-Karte (deferred)

## Dokumentation & Knowledge

- [x] Knowledge-Base: 7 destillierte Docs als flacher Vault
- [x] 12 alte Quelldateien archiviert in `_archive/pre-refactor/`

- [x] 3 saubere Commits (Session 18 Mobilitaet, Knowledge-Refactor, Pipeline-Fixes)
- [x] Journal-Volltext bis Session 19
- [ ] Vault-Sync: 7 Knowledge-Docs nach Obsidian kopieren (manuell)
- [ ] Info-Seiten (modell.html) Zahlen nach Pipeline-Lauf aktualisieren

## Forschung & Methodik

- [x] 5 Mobilitaetstypen definiert (national, geographisch, erzwungen, Bildung, Lifestyle)
- [x] 4 Forschungsfragen operationalisiert (FF1–FF4)
- [ ] FF4 evaluieren: Sind die 5 Mobilitaetstypen in der Timeline visuell unterscheidbar?
- [ ] FF1 evaluieren: Zeigen 296 Personen erkennbare Netzwerk-Cluster in der Matrix?
- [ ] FF2 evaluieren: Zeigt Kosmos Repertoire-Wandel ueber Karrierephasen?
- [ ] Skalierbarkeit pruefen: Nur 3/255 Konvolute substantiell bearbeitet

---

## Datenbasis (Stand: 2026-02-25)

| Dimension | Anzahl |
|-----------|--------|
| Archiveinheiten | 282 |
| Davon verknuepft | 62 (22%) |
| Effektive Verknuepfungen | 1.246 |
| Personen (Index) | 296 |
| Organisationen (Index) | 59 |
| Orte (Index) | 31 |
| Werke (Index) | 96 |
| Wikidata-Matches | 171 |
| Validate-Fehler | 1 (E001 PL_07-Duplikat) |
| Validate-Warnungen | 177 (W004 Cross-Table) |

## Forschungsfragen → Visualisierungen

| FF | Frage | Primaerer View | Datenlage |
|----|-------|---------------|-----------|
| FF1 | Netzwerke und Professionalisierung | Matrix | 296 Personen, Cluster-Analyse noetig |
| FF2 | Genretransformation durch Migration | Kosmos | 96 Werke, Repertoire-Wandel ueber Zeit pruefen |
| FF3 | Wissenstransfer durch Mobilitaet | Matrix + Cross-Link | ~60% Abdeckung, braucht Organisationsdaten |
| FF4 | Mobilitaetsformen bei Malaniuk | Mobilitaetsview | 5 Typen, visuelle Unterscheidbarkeit pruefen |

## Offene Forschungsfragen

- Tragen die vorhandenen 1.246 Verknuepfungen die Netzwerk-Analyse (FF1), oder sind die Daten zu duenn fuer sichtbare Cluster?
- Zeigt der Kosmos Repertoire-Wandel ueber Karrierephasen, oder nur eine statische Wolke?
- Wie wird erzwungene Migration visuell von regulaerer Mobilitaet unterschieden?
- Skalierbarkeit: Nur 3 von 255 Konvoluten substantiell bearbeitet — reichen die Daten fuer methodische Validierung?
