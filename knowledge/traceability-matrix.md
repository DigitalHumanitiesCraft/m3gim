# Traceability-Matrix (Alt -> Neu)

> Nachweis fuer verlustfreie Refaktorierung der projekt-eigenen Markdown-Quellen.
> Alle Originale liegen unveraendert unter `knowledge/_archive/2026-02-20-pre-kb-refactor/`.

## Mapping-Regeln

1. Kein Quellinhalt wird geloescht, sondern in **Kanon**, **Appendix**, **generierten Reports** oder **Archiv** ueberfuehrt.
2. Wenn ein Abschnitt stark verdichtet wurde, bleibt die Vollfassung im Archiv und ist hier referenziert.
3. Reports bleiben vollstaendig generiert; Struktur wurde modernisiert, Inhalte bleiben erhalten.

## Matrix

| Quelle | Quellabschnitt | Ziel (kanonisch/anhang) | Erhaltungsmodus |
|---|---|---|---|
| `README.md` | Repository | `README.md` -> Repository-Zweck | verdichtet + aktualisiert |
| `README.md` | Struktur | `README.md` -> Struktur | verdichtet + aktualisiert |
| `README.md` | Technologie | `README.md` -> Technologiestand; `knowledge/system-architektur-pipeline.md` | konsolidiert |
| `README.md` | Lizenz | `README.md` -> Lizenz | direkt uebernommen |
| `scripts/README.md` | Ordnerstruktur | `scripts/README.md` -> Pipeline-Workflow | konsolidiert |
| `scripts/README.md` | Workflow | `scripts/README.md` -> Pipeline-Workflow | direkt uebernommen |
| `scripts/README.md` | Abhaengigkeiten | `scripts/README.md` -> Abhaengigkeiten | direkt uebernommen |
| `scripts/README.md` | explore.py | `scripts/README.md` -> `explore.py` | direkt uebernommen |
| `scripts/README.md` | migrate.py | `scripts/README.md` -> `migrate.py` | direkt uebernommen |
| `scripts/README.md` | validate.py | `scripts/README.md` -> `validate.py` | direkt uebernommen |
| `scripts/README.md` | transform.py | `scripts/README.md` -> `transform.py` | direkt uebernommen |
| `scripts/README.md` | build-views.py | `scripts/README.md` -> `build-views.py` | direkt uebernommen |
| `MEETING-2026-02-24.md` | Status | `MEETING-2026-02-24.md` -> Kernaussagen; `knowledge/operativer-plan-claude.md` | verdichtet + referenziert |
| `MEETING-2026-02-24.md` | Bestand | `knowledge/projekt-kontext.md` -> Belastbarer Ist-Stand | konsolidiert |
| `MEETING-2026-02-24.md` | Pipeline Iteration 2 | `knowledge/system-architektur-pipeline.md` -> Pipeline | konsolidiert |
| `MEETING-2026-02-24.md` | Datenqualitaet (auto) | `knowledge/datenmodell-ontologie.md` -> Normalisierung | konsolidiert |
| `MEETING-2026-02-24.md` | Datenqualitaet (Handlungsbedarf) | `knowledge/operativer-plan-claude.md` -> Priorisierte Korrekturpunkte | konsolidiert |
| `MEETING-2026-02-24.md` | Gespraechspunkte | `knowledge/operativer-plan-claude.md` -> Naechste Schritte | konsolidiert |
| `knowledge/README.md` | Dokumente | `knowledge/README.md` -> Kanonische Kerndokumente | ersetzt |
| `knowledge/README.md` | Vault-Dokumentation | `knowledge/quellenindex.md` -> Quellen | uebernommen/kontextualisiert |
| `knowledge/01-projekt.md` | Kern | `knowledge/projekt-kontext.md` -> Projektprofil | konsolidiert |
| `knowledge/01-projekt.md` | Forschungsfragen | `knowledge/projekt-kontext.md` -> Leitfragen | direkt uebernommen |
| `knowledge/01-projekt.md` | Mobilitaetstypen | `knowledge/projekt-kontext.md` -> Mobilitaetstypen | direkt uebernommen |
| `knowledge/01-projekt.md` | Meilensteine | `knowledge/projekt-kontext.md` -> Meilensteinbild | verdichtet |
| `knowledge/02-quellenbestand.md` | Bestandsgruppen | `knowledge/projekt-kontext.md` -> Datenstand | konsolidiert |
| `knowledge/02-quellenbestand.md` | Konvolute | `knowledge/datenmodell-ontologie.md` -> Konvolut- und Objektlogik | konsolidiert |
| `knowledge/02-quellenbestand.md` | Verknuepfungen | `knowledge/datenmodell-ontologie.md` -> Verknuepfungsmechanismus | konsolidiert |
| `knowledge/02-quellenbestand.md` | Aktuelle Bestandszahlen | `knowledge/projekt-kontext.md` -> Datenstand | konsolidiert |
| `knowledge/02-quellenbestand.md` | Datenqualitaet | `knowledge/operativer-plan-claude.md` + `knowledge/datenmodell-ontologie.md` | konsolidiert |
| `knowledge/03-datenmodell.md` | Schichten | `knowledge/datenmodell-ontologie.md` -> Schichtenmodell | direkt uebernommen |
| `knowledge/03-datenmodell.md` | Google Sheets | `knowledge/datenmodell-ontologie.md` -> Tabellenmodell | direkt uebernommen |
| `knowledge/03-datenmodell.md` | Konvolut-Hierarchie | `knowledge/datenmodell-ontologie.md` -> Konvolut- und Objektlogik | direkt uebernommen |
| `knowledge/03-datenmodell.md` | Verknuepfungs-Mechanismus | `knowledge/datenmodell-ontologie.md` -> Verknuepfungsmechanismus | direkt uebernommen |
| `knowledge/03-datenmodell.md` | Komposit-Typen | `knowledge/datenmodell-ontologie.md` -> Normalisierung | konsolidiert |
| `knowledge/03-datenmodell.md` | Vokabulare | `knowledge/datenmodell-ontologie.md` -> Kontrollierte Vokabulare | konsolidiert |
| `knowledge/03-datenmodell.md` | Entitaetsindizes | `knowledge/datenmodell-ontologie.md` -> Tabellenmodell/Normalisierung | konsolidiert |
| `knowledge/03-datenmodell.md` | Pipeline-Normalisierung | `knowledge/datenmodell-ontologie.md` -> Normalisierung | direkt uebernommen |
| `knowledge/04-architektur.md` | Workflow | `knowledge/system-architektur-pipeline.md` -> Datenfluss | direkt uebernommen |
| `knowledge/04-architektur.md` | Pipeline | `knowledge/system-architektur-pipeline.md` -> Pipeline | direkt uebernommen |
| `knowledge/04-architektur.md` | Verzeichnisstruktur | `knowledge/system-architektur-pipeline.md` -> Komponentenstruktur | konsolidiert |
| `knowledge/04-architektur.md` | Pipeline-Anforderungen | `knowledge/datenmodell-ontologie.md` -> Normalisierung | konsolidiert |
| `knowledge/04-architektur.md` | JSON-LD | `knowledge/datenmodell-ontologie.md` -> RiC-O und m3gim | konsolidiert |
| `knowledge/04-architektur.md` | Frontend | `knowledge/system-architektur-pipeline.md` + `knowledge/produkt-ui-visualisierungen.md` | konsolidiert |
| `knowledge/04-architektur.md` | CI/CD | `knowledge/system-architektur-pipeline.md` -> CI/CD | direkt uebernommen |
| `knowledge/05-design-system.md` | Farbsystem | `knowledge/produkt-ui-visualisierungen.md` -> Designsystem | konsolidiert |
| `knowledge/05-design-system.md` | Typografie | `knowledge/produkt-ui-visualisierungen.md` -> Designsystem | konsolidiert |
| `knowledge/05-design-system.md` | Layout | `knowledge/produkt-ui-visualisierungen.md` -> IA/Ansichtslogik | konsolidiert |
| `knowledge/06-visualisierungen.md` | Uebersicht | `knowledge/produkt-ui-visualisierungen.md` -> Ansichtslogik | konsolidiert |
| `knowledge/06-visualisierungen.md` | Archiv | `knowledge/produkt-ui-visualisierungen.md` -> Archiv | direkt uebernommen |
| `knowledge/06-visualisierungen.md` | Indizes | `knowledge/produkt-ui-visualisierungen.md` -> Indizes | direkt uebernommen |
| `knowledge/06-visualisierungen.md` | Matrix | `knowledge/produkt-ui-visualisierungen.md` -> Matrix | direkt uebernommen |
| `knowledge/06-visualisierungen.md` | Kosmos | `knowledge/produkt-ui-visualisierungen.md` -> Kosmos | direkt uebernommen |
| `knowledge/06-visualisierungen.md` | Nicht umgesetzte Konzepte | `knowledge/operativer-plan-claude.md` -> Deferred/offen | konsolidiert |
| `knowledge/06-visualisierungen.md` | Forschungshypothesen | `knowledge/produkt-ui-visualisierungen.md` -> Forschungsbezug | konsolidiert |
| `knowledge/06-visualisierungen.md` | Evaluation | `knowledge/operativer-plan-claude.md` | konsolidiert |
| `knowledge/07-entscheidungen.md` | Architekturentscheidungen | `knowledge/operativer-plan-claude.md` -> Priorisierte Korrekturpunkte | konsolidiert |
| `knowledge/07-entscheidungen.md` | Offene Entscheidungen | `knowledge/operativer-plan-claude.md` -> Deferred/offen | direkt uebernommen |
| `knowledge/07-entscheidungen.md` | Technische Schulden | `knowledge/operativer-plan-claude.md` | konsolidiert |
| `knowledge/07-entscheidungen.md` | Verschobene Features | `knowledge/operativer-plan-claude.md` | direkt uebernommen |
| `knowledge/07-entscheidungen.md` | Prozesswissen | `knowledge/appendices/journal-volltext.md` + `knowledge/operativer-plan-claude.md` | konsolidiert + volltext |
| `knowledge/08-ric-o.md` | Was ist RiC-O | `knowledge/datenmodell-ontologie.md` -> RiC-O Kern | konsolidiert |
| `knowledge/08-ric-o.md` | Klassenhierarchie | `knowledge/datenmodell-ontologie.md` -> RiC-O Kern | konsolidiert |
| `knowledge/08-ric-o.md` | Wichtige Properties | `knowledge/datenmodell-ontologie.md` -> RiC-O Kern | konsolidiert |
| `knowledge/08-ric-o.md` | Vokabulare | `knowledge/datenmodell-ontologie.md` -> RiC-O und m3gim | konsolidiert |
| `knowledge/08-ric-o.md` | Modellierungsmuster | `knowledge/datenmodell-ontologie.md` -> Konvolut- und Objektlogik | direkt uebernommen |
| `knowledge/08-ric-o.md` | M3GIM-Mapping | `knowledge/datenmodell-ontologie.md` -> RiC-O und m3gim | direkt uebernommen |
| `knowledge/08-ric-o.md` | JSON-LD Context | `knowledge/datenmodell-ontologie.md` -> RiC-O und m3gim | konsolidiert |
| `knowledge/09-m3gim-ontology.md` | Warum Erweiterung | `knowledge/datenmodell-ontologie.md` -> m3gim-Erweiterung | direkt uebernommen |
| `knowledge/09-m3gim-ontology.md` | Klassen | `knowledge/datenmodell-ontologie.md` -> m3gim-Erweiterung | direkt uebernommen |
| `knowledge/09-m3gim-ontology.md` | Properties | `knowledge/datenmodell-ontologie.md` -> m3gim-Erweiterung | direkt uebernommen |
| `knowledge/09-m3gim-ontology.md` | Vokabulare | `knowledge/datenmodell-ontologie.md` -> kontrollierte Vokabulare | konsolidiert |
| `knowledge/09-m3gim-ontology.md` | JSON-LD Context | `knowledge/datenmodell-ontologie.md` -> RiC-O und m3gim | konsolidiert |
| `knowledge/09-m3gim-ontology.md` | Zusammenfassung | `knowledge/datenmodell-ontologie.md` | konsolidiert |
| `knowledge/10-datenqualitaet.md` | Ueberblick | `knowledge/projekt-kontext.md` + `knowledge/operativer-plan-claude.md` | konsolidiert |
| `knowledge/10-datenqualitaet.md` | Kritisch | `knowledge/operativer-plan-claude.md` -> Priorisierte Korrekturpunkte | direkt uebernommen |
| `knowledge/10-datenqualitaet.md` | Hoch | `knowledge/operativer-plan-claude.md` -> Naechste Schritte | direkt uebernommen |
| `knowledge/10-datenqualitaet.md` | Mittel | `knowledge/datenmodell-ontologie.md` -> Normalisierung + `knowledge/operativer-plan-claude.md` | konsolidiert |
| `knowledge/10-datenqualitaet.md` | Niedrig | `knowledge/operativer-plan-claude.md` | konsolidiert |
| `knowledge/10-datenqualitaet.md` | Pipeline-seitig behoben | `knowledge/datenmodell-ontologie.md` -> Normalisierung | direkt uebernommen |
| `knowledge/10-datenqualitaet.md` | Zusammenfassung Handlungsbedarfe | `knowledge/operativer-plan-claude.md` -> Naechste Schritte | direkt uebernommen |
| `knowledge/11-aufgabenkatalog.md` | Uebersicht | `knowledge/operativer-plan-claude.md` -> Umsetzungsstand | direkt uebernommen |
| `knowledge/11-aufgabenkatalog.md` | Farbsystem/Übergreifend/Bestand/Chronik/Indizes/Matrix/Kosmos/Querverweise | `knowledge/operativer-plan-claude.md` -> Erreichte Kernpunkte + Deferred | konsolidiert |
| `knowledge/11-aufgabenkatalog.md` | Deferred | `knowledge/operativer-plan-claude.md` -> Deferred/offen | direkt uebernommen |
| `knowledge/12-zustandsbericht.md` | Architektur | `knowledge/system-architektur-pipeline.md` | konsolidiert |
| `knowledge/12-zustandsbericht.md` | Daten | `knowledge/projekt-kontext.md` + `knowledge/datenmodell-ontologie.md` | konsolidiert |
| `knowledge/12-zustandsbericht.md` | Frontend | `knowledge/system-architektur-pipeline.md` + `knowledge/produkt-ui-visualisierungen.md` | konsolidiert |
| `knowledge/12-zustandsbericht.md` | Dokumentation | `knowledge/quellenindex.md` + `knowledge/README.md` | konsolidiert |
| `knowledge/12-zustandsbericht.md` | Offene Baustellen | `knowledge/operativer-plan-claude.md` | direkt uebernommen |
| `knowledge/journal.md` | Alle Sessions inkl. H3-Unterpunkte | `knowledge/appendices/journal-volltext.md` | volltext lossless |
| `data/reports/exploration-report.md` | Executive Summary / Datei-Uebersicht / Tabellen-Checks / Cross-Checks / Zusammenfassung | `data/reports/exploration-report.md` (neu generiert) | generiert, vollstaendig |
| `data/reports/validation-report.md` | Executive Summary / Fehler / Warnungen / Gruppen-Analyse | `data/reports/validation-report.md` (neu generiert) | generiert, vollstaendig |

## Abdeckungsstatus

- Erfasste Quell-Dateien im Scope: 19
- Gemappte Quell-Dateien: 19
- Ungemappte Quell-Dateien: 0
- Volltext-Anhaenge: Journal, Meeting
- Vollarchiv: vorhanden unter `knowledge/_archive/2026-02-20-pre-kb-refactor/`
