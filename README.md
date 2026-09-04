# M3GIM: Mapping Mobile Musicians

Digitale Erschliessung des Teilnachlasses Ira Malaniuk (UAKUG/NIM) am Universitaetsarchiv der KUG Graz.

**Live:** [dhcraft.org/m3gim](https://dhcraft.org/m3gim)

## Repository-Zweck

Dieses Repository enthaelt:

- die Datenpipeline (`scripts/*.py`)
- das statische Frontend (`docs/`)
- die kanonische Knowledge Base (`knowledge/`)

## Struktur

```text
m3gim/
|-- knowledge/                 # Kanonische KB (siehe knowledge/INDEX.md)
|-- data/
|   |-- google-spreadsheet/  # Quellexporte als CSV und XLSX (git-getrackt)
|   |-- output/              # Generiertes JSON-LD und die Wikidata-Dateien
|   `-- reports/             # Generierte Markdown-Reports
|-- scripts/                  # explore/validate/reconcile/enrich-wikidata/transform/build-views/audit-data/report-quality/build-model-page
|-- vocab/                    # Formales Projektvokabular (Turtle) + Abdeckungspruefer, siehe knowledge/data-model.md
|-- docs/                     # GitHub Pages Frontend (Vanilla JS, keine Build-Kette)
`-- README.md
```

## Technologiestand

- Datenmodell: RiC-O 1.1 + m3gim-Erweiterungen + AgRelOn
- Pipeline: Python 3.11+ (`pandas`, `openpyxl`, `thefuzz[speedup]`)
- Frontend: Vanilla JS (ES-Module), D3.js v7 als Library, kein Build-Tool
- Tab-Architektur in drei Gruppen: Material (Bestand, Indizes), Perspektiven (Chronik, Karte, Netzwerk, Statistik), Werkzeug (Korb). Verborgene Tabs gibt es seit E-140 nicht mehr. Details in [`knowledge/design.md`](knowledge/design.md) + [`knowledge/specification.md`](knowledge/specification.md)
- Hosting: GitHub Pages
- Normdaten: Wikidata-Q-IDs (Reconciliation via `reconcile.py` + Enrichment via `enrich-wikidata.py`)

Laufende Zahlen (Bestand, Verknuepfungsrate, WD-Coverage) stehen im generierten Quality-Snapshot unter [`data/reports/quality-snapshot.md`](data/reports/quality-snapshot.md), nicht im README.

## Lokal ausfuehren

Voraussetzungen sind Python 3.11+ sowie Node 18+ fuer die JS-Unit-Tests. `requirements-test.txt` bindet die Laufzeit-Abhaengigkeiten aus `requirements.txt` ein und liefert damit in einem Schritt eine lauffaehige Umgebung.

```bash
pip install -r requirements-test.txt
python scripts/transform.py && python scripts/build-views.py
python -m http.server 8000 --directory docs   # Frontend unter http://localhost:8000
```

Der vollstaendige Lauf mit allen sieben Pipeline-Schritten, die Testbefehle und der Vokabular-Abdeckungspruefer stehen in [`CLAUDE.md`](CLAUDE.md) § Kern-Commands. Drei Punkte, die in einem frischen Klon leicht in die Irre fuehren:

- `scripts/validate.py` endet mit Exit 1, sobald der Validierungsreport ERROR-Befunde fuehrt. Das ist am aktuellen Datenstand der erwartete Zustand, die Befunde sind Quellfehler aus der Erfassung und stehen in der Partner-Uebergabeliste [`data/reports/source-errors-handover-2026-09-01.md`](data/reports/source-errors-handover-2026-09-01.md).
- Die Normdatendateien `wikidata-reconciliation.json` und `wikidata-enrichment.json` liegen git-getrackt in `data/output/` und werden von der Transformation aus dem Ausgabeverzeichnis gelesen. Fehlt eine der beiden Dateien im Ausgabeverzeichnis, bricht `transform.py` mit Exit 1 ab; ein bewusster Lauf ohne Normdaten braucht `M3GIM_ALLOW_NO_WIKIDATA=1` und erzeugt einen Datensatz ohne Koordinaten, Lebensdaten und Berufe. Die Falle ist in [`knowledge/architecture.md`](knowledge/architecture.md) beschrieben.
- Der Browser-Smoke-Test ist ein optionales Extra. Ohne Playwright ueberspringt er sich und der uebrige Lauf bleibt gruen, siehe [`knowledge/testing.md`](knowledge/testing.md).

## Dokumentation

- Einstieg in die KB: [`knowledge/INDEX.md`](knowledge/INDEX.md)
- Aktueller Stand + nächste Schritte: [`knowledge/specification.md`](knowledge/specification.md) § Stand und nächste Schritte
- Offene Uebergabepunkte: [`knowledge/handoff.md`](knowledge/handoff.md)
- Architekturentscheidungen: [`knowledge/journal.md`](knowledge/journal.md)
- Architektur (Pipeline und Frontend): [`knowledge/architecture.md`](knowledge/architecture.md)
- Workflow-Regeln fuer Claude-Code-Sessions: [`CLAUDE.md`](CLAUDE.md)

## Licence

- Code: MIT (see [LICENSE](LICENSE)).
- Documentation and knowledge documents (`knowledge/`, `docs/` prose): CC BY 4.0.
- Third-party research data is excluded from these licences and the rights remain with their holders. The digitised archival source material (Teilnachlass Ira Malaniuk) is held by the Universitaetsarchiv der Kunstuniversitaet Graz; individual items carry their own rights notices.
