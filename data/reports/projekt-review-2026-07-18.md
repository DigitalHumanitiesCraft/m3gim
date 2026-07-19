# Projekt-Review und Optimierungsplan

Snapshot vom 2026-07-18. Gesamtreview über Knowledge, Pipeline, Tests und Frontend, mit priorisiertem Plan. Befunde aus vier parallelen Analysen, tragende Punkte am Code verifiziert; als Snapshot-Dokument darf es Zählstände enthalten.

## Gesamturteil

Das Projekt ist überdurchschnittlich diszipliniert geführt. Entscheidungslog mit E-Nummern, Determinismus-Test, Baseline-Strategie, dokumentierte Workarounds mit Verweis auf `data.md`, sauberes Fixture-Design in der Testsuite, konsistentes Designsystem im Frontend. Die Schwächen sind nicht architektureller Natur, sondern Wartbarkeits- und Sichtbarkeitsschulden eines evolutionär gewachsenen Systems. Vier Problemfelder tragen fast alle Einzelbefunde:

1. Die Testsuite ist auf diesem Stand nicht grün (15 Errors, 1 Failure, 1 XPASS), obwohl CLAUDE.md sie als Standard-Gate führt.
2. Die Pipeline hat stille Fehlerpfade, fehlendes Enrichment, verschluckte Relationen und dreifach duplizierte Ladelogik.
3. Vokabulare und Mappings werden an mehreren Stellen von Hand parallel gepflegt (data.md § 5, transform.py, Frontend-`constants.js`, Test-Hardcodes).
4. Toter Ballast (Legacy-Derivate, obsolete Skripte, verborgene Tabs samt CSS) ohne Verfalls- oder Reaktivierungsentscheidung.

## Zustand der Testsuite (verifiziert per Lauf am 2026-07-18)

`pytest tests/ -m "not slow"` ergibt: 236 passed, 1 failed, 15 errors, 1 xpassed, 1 skipped.

- **15 Errors** in `test_08_partitur.py` und `test_09_baselines.py`. `conftest.py:92` lädt `data/output/views/partitur.json`; das Verzeichnis `data/output/views/` existiert nicht und ist nicht git-getrackt. Ein frischer Checkout kann die Suite nicht grün laufen lassen, ohne vorher `build-views.py` auszuführen, obwohl das Partitur-Derivat laut CLAUDE.md von keinem Tab mehr konsumiert wird. Tests hängen an einem toten Artefakt.
- **1 Failure** in `test_04_verknuepfungen.py:100`, `UAKUG/NIM_168` ohne ausgehende Relation. Bekannte Regression, in `plan.md` § Test-Regression dokumentiert; der Test tut also, was er soll, aber der rote Zustand ist unmarkiert und maskiert künftige echte Brüche.
- **1 XPASS** in `test_05_referential.py`, `test_all_record_ids_unique` mit `xfail(strict=False)` für das PL_07-Duplikat. Das Duplikat ist offenbar behoben, der Marker steht noch, und `strict=False` widerspricht der eigenen TDD-Regel aus CLAUDE.md (strict=True, damit XPASS die Suite failt).

## Befunde nach Bereich

### Pipeline (Schweregrad hoch zuerst)

- **Stilles Überspringen von Enrichment und Reconciliation** (`transform.py:1712` und `:1723`). Fehlen die JSON-Dateien, läuft die Pipeline mit leerem Dict weiter und baut Records ohne Wikidata-Properties, nur ein „uebersprungen“-Print. Ein vergessener `enrich-wikidata.py`-Lauf produziert einen scheinbar validen, tatsächlich entkernten Output.
- **`load_index()` existiert dreimal** (`transform.py:474`, `validate.py:194`, `reconcile.py:332`) mit abweichender Header-Shift-Logik und abweichendem Fehlerverhalten. Nur die transform-Variante hat den Guard gegen nicht-textuelle Header; ändert sich der Box-Export, brechen validate und reconcile still oder anders als transform.
- **Stille Drops ohne Zähler**, etwa Relationen ohne Namen (`transform.py:1314` `continue` ohne Warnung) und Zeilen ohne Signatur. Der Lauf meldet nicht, wie viel er verworfen hat.
- **`add_relations_to_records()`** ist ein Block von gut 300 Zeilen mit einer langen elif-Kaskade über die Relationstypen; jeder neue Typ (Phase 4.9 Reifikation) verlängert die Kaskade. Ein Dispatch über eine Handler-Tabelle wäre der kleinste tragfähige Umbau.
- **Versionierung**: `requirements.txt` ist ungepinnt, `requirements-test.txt` nur mit Untergrenzen. Der Dev-Split existiert bereits, es fehlt nur das Pinning.
- **Altlasten**: `migrate-v2.py` ist eine einmalige historische Migration ohne Aufrufpfad, Kandidat für `scripts/_archive/`. `audit-data.py` beschreibt sich selbst als durch `test_34_rawdata_crosscheck.py` abgelöst und bleibt als Schnellüberblick, dieser Doppelzweck sollte entschieden werden. `assemble-verknuepfungen.py` ist dagegen aktiv (CSV-Export-Assembly, E-95) und bleibt.
- **build-views.py** baut vier Derivate, von denen kein aktiver Tab eines liest, rund 590 Zeilen Pflegeaufwand bei jeder Modelländerung plus Test-Abhängigkeit (siehe Errors oben). Der Deferred-Block in `plan.md` ist unbefristet.

### Tests

- **Baseline-Semantik inkonsistent**: `test_09` prüft `partitur_lebensphasen_exact` mit `==`, obwohl `testing.md` Mindestwerte vorschreibt.
- **Skip statt Assert**: `test_12_agrelon.py:68` skippt bei null Arbeitgeber-Relationen, der Test kann trivial „bestehen“.
- **Handgepflegte Wahrheitsquellen in Tests**: `DATA_MD_ROLES` in `test_15` (manuell gegen data.md § 5 synchron zu halten), Cluster-Mapping in `test_25` parallel zu `docs/js/data/constants.js`, Allowlist in `test_26` ohne Versionsstempel. Jede Rollen-Ergänzung braucht Handarbeit an mehreren Stellen; Vergessen fällt erst spät auf.
- **Kein Mid-Layer**: außer `test_14` (echte Unit-Tests der Parser) wird ausschließlich der fertige Output getestet. Ein Bug in einer transform-Funktion zeigt sich als diffuser Bruch in mehreren Output-Tests, nicht als lokalisierte Unit-Failure. Das ist als Strategie in `testing.md` dokumentiert und vertretbar, die Grenzfälle von `decompose_komposit_value` (Ortsnamen mit Komma, mehrteilige Datierungen) sind aber ungetestet.
- **Doku-Drift**: test_34 bis test_36 fehlen in `testing.md`.

### Frontend

- **Loader-Robustheit** (`docs/js/data/loader.js`): `m3gim:atPlace` wird ohne `ensureArray` als Objekt angenommen (Array-Input würde werfen); der `wd:`-Präfix-Check auf `@id` ist zwischen Agent- und STE-Pfad inkonsistent; `buildStore()` läuft ohne Guard, ein fehlendes `@graph` crasht die App ohne Fehlermeldung im UI.
- **innerHTML mit Fremdtext**: `main.js` interpoliert `err.message` in `innerHTML` (Fehlerpfad, geringes, aber unnötiges Risiko); `ui/sidebar.js` setzt `r.html` per `innerHTML`, die Aufrufer sind zu prüfen, dass dort nie Datenwerte ankommen.
- **Korb-Invalidierung unvollständig**: bei Korb-Änderung wird nur der Korb-Tab neu gerendert, Bestand und Indizes behalten veraltete Korb-Marker.
- **Accessibility**: Tab-Pattern ist ARIA-seitig korrekt aufgebaut, aber ohne Pfeiltasten-Navigation; das Bestand-Raster hat keine Tabellensemantik für Screenreader; `--color-sicht-kontext` auf Papier liegt bei etwa 2.5:1 und verfehlt AA.
- **Ballast**: CSS der drei verborgenen Tabs (mobility-atlas, repertoire, biogram) wird immer geladen; verschmerzbar, aber Teil derselben Aufräumentscheidung wie die Derivate.

### Knowledge

- **Widerspruch zum StageRole-Stand**: `plan.md` führt die Modellentscheidung als blockiert, `data.md` und `decisions.md` (E-128) führen sie als spezifiziert bzw. erledigt. Vermutlich ist nur die Erfassung des Rollenindex blockiert, nicht das Modell; die Formulierung in `plan.md` ist zu präzisieren.
- **Status-Tracker in `plan.md`** mischt aktive, erledigte, blockierte und deferred Einträge unsortiert und ohne Priorität; was als Nächstes ansteht, ist nicht auf einen Blick erkennbar.
- **Operator-Entscheidungen verstreut** (Atlas-Reaktivierung, Bestand-Default-Modus, Cross-View-Filter, Derivate-Verfall) statt an einer Stelle gesammelt.
- **Momentaufnahmen unter `knowledge/`**: `frontend-sichtpruefung-2026-06-21.md` und `visualisierung-bayreuth.md` sind laut INDEX.md bereits Verlagerungskandidaten nach `data/reports/`; der Umzug ist offen.
- **testing.md** hinkt der Suite um die neuesten Tests hinterher (siehe oben).

## Optimierungsplan

Gegliedert nach dem Lane-Modell, damit die Blöcke in getrennten Sessions laufen können. Innerhalb einer Phase ist die Reihenfolge Empfehlung, zwischen Phasen ist sie Priorität.

### Phase 0, Suite wieder grün (Backend-Lane, vor allem anderen)

1. Partitur-Abhängigkeit entkoppeln. `conftest.py` skippt die Partitur-Fixtures mit Begründung, wenn `data/output/views/partitur.json` fehlt, oder test_08/test_09-Partitur-Teile wandern zu den Derivaten in den Deferred-Block. Entscheidend ist, dass ein frischer Checkout ohne `build-views.py`-Lauf grün wird.
2. test_04/NIM_168 als bekannte Regression markieren, `xfail(strict=True)` mit Verweis auf `plan.md` § Test-Regression. Der Datenfehler selbst wird gemäß Datenfehler-Policy ans Archivteam durchgereicht, nicht in der Pipeline umgangen.
3. test_05-XPASS auflösen. PL_07-Behebung verifizieren, xfail-Marker entfernen, und die strict=True-Regel auf alle verbleibenden xfail-Marker anwenden.

### Phase 1, stille Fehler laut machen (Backend-Lane)

4. Enrichment-Gate in `transform.py`. Fehlende oder leere `wikidata-enrichment.json`/`wikidata-reconciliation.json` bricht den Lauf ab oder erfordert ein explizites Opt-out (ENV-Flag analog `SKIP_VERIFY_MANUAL`), niemals stilles Weiterlaufen.
5. Drop-Zähler. Jede Stelle, die Zeilen oder Relationen verwirft (fehlende Signatur, leerer Name, Ort ohne Index-Match, malformed Datierung), zählt und meldet am Laufende eine Summe. Ziel ist ein Laufprotokoll, aus dem Datenverlust ablesbar ist.
6. `load_index()`, Header-Shift und `normalize_signatur()` nach `_common.py` konsolidieren, eine Implementierung mit dem defensivsten Verhalten, Unit-Tests dazu, die drei Skripte importieren sie.

### Phase 2, Testschulden (Backend-Lane)

7. `test_09` Exact-Baseline auf Mindestwert umstellen, gemäß eigener Regel in `testing.md`.
8. `test_12` Skip durch Assert mit Mindestvorkommen ersetzen oder die Absenz der Rolle als bewusste Entscheidung dokumentieren.
9. `DATA_MD_ROLES` in `test_15` aus `data.md` § 5 parsen statt von Hand pflegen; gleiches Muster für das Cluster-Mapping in `test_25` gegen `constants.js` prüfen.
10. Parametrisierte Unit-Tests für `decompose_komposit_value` und `parse_monetary_values` mit den bekannten Grenzfällen (Komma im Ortsnamen, Zeitspannen, Leerzeichen-Varianten bei Beträgen).
11. `testing.md` um test_34 bis test_36 ergänzen.

### Phase 3, Frontend-Härtung (Frontend-Lane)

12. `loader.js`: `ensureArray` auf `m3gim:atPlace`, konsistente `String(@id).startsWith('wd:')`-Prüfung in allen Agent-Pfaden, try/catch um `buildStore()` mit sichtbarer Fehlermeldung im UI und Prüfung auf leeren Store.
13. `main.js` Fehleranzeige auf `textContent` umstellen; Aufrufer von `sidebar.js` `r.html` prüfen und Datenwerte auf Textknoten zwingen.
14. Korb-Invalidierung auf alle Tabs mit Korb-Markern ausweiten (Bestand, Indizes).
15. Accessibility-Paket: Pfeiltasten-Navigation im Tab-Pattern, Tabellensemantik (`role="table"`-Familie) im Bestand-Raster, `--color-sicht-kontext` auf AA-Kontrast anheben, `lang="en"` auf englischsprachige Links.

### Phase 4, Altlasten entscheiden (Backend-Lane plus Operator)

16. Operator-Entscheidung zu den Derivaten herbeiführen: entweder Verfallsdatum und Archivierung von `build-views.py`-Legacy-Teilen samt zugehöriger Tests und `docs/data/`-Kopien, oder verbindliche Viz-Roadmap, die sie konsumiert. Der unbefristete Deferred-Zustand ist die teuerste Option.
17. `migrate-v2.py` nach `scripts/_archive/` mit Vermerk des letzten Einsatzes; Doppelrolle von `audit-data.py` (Schnellüberblick neben test_34) entscheiden und im Docstring festhalten. `assemble-verknuepfungen.py` bleibt aktiv.
18. Requirements pinnen (Runtime exakt, Test mit Ober- und Untergrenzen).
19. CSS der verborgenen Tabs an die Tab-Entscheidung koppeln, bei Archivierung der Tabs mit auslagern.

### Phase 5, Knowledge-Konsistenz (Knowledge-Lane)

20. StageRole-Formulierung in `plan.md` präzisieren, blockiert ist die Rollenindex-Erfassung, nicht die Modellentscheidung (E-128 erledigt).
21. Status-Tracker in `plan.md` nach Status sortieren und die offenen Punkte priorisieren; verborgene Tabs je einzeln mit Zustand und Reaktivierungs- oder Stilllegungspfad führen.
22. Operator-Entscheidungen als eigene Sektion bündeln (in `plan.md` oder `decisions.md` § Offene Modellentscheidungen).
23. `frontend-sichtpruefung-2026-06-21.md` und `visualisierung-bayreuth.md` nach `data/reports/` verschieben, INDEX.md nachziehen.
24. E-110-Umsetzung im Frontend verifizieren (Ortsrollen-Klassifikation in `constants.js` gegen `data.md` § 10), Ergebnis in `datenfehler.md` oder decisions.md festhalten.

### Phase 5b, Konsolidierung des knowledge-Ordners (Knowledge-Lane)

Der Ordner führt sechzehn kanonische Dokumente plus zwei Momentaufnahmen. Weniger Dokumente sind das richtige Ziel, aber der Hebel ist nicht die Stückzahl, sondern die Zahl der Stellen, die bei einer Änderung mitgepflegt werden müssen. Leitregel: Dokumente, die sich aus demselben Grund ändern und dieselbe Leserschaft haben, gehören zusammen; Dokumente mit verschiedener Leserschaft (Erfassungsteam, Entwicklung, Archivteam) bleiben getrennt, auch wenn sie kurz sind.

Konkrete Zusammenlegungen, geordnet nach Klarheit des Falls:

25. `use-cases.md` in `research.md` integrieren. Das Dokument operationalisiert erklärtermaßen die Forschungsfragen aus research.md, ist als Gerüst mit „(ausarbeiten)“-Platzhaltern markiert und hat dieselbe Leserschaft. Ein Dokument „Forschung“ mit Theorie, Forschungsfragen, Use Cases und Evaluationsskizze. Beim Merge den Klarnamen einer dritten Person entfernen (Namensregel, Rolle und Institution genügen).
26. `specification.md` in `project.md` integrieren. Die Spezifikation ist „abgeleitet aus dem real Gebauten“ und driftet damit konstruktionsbedingt gegen architecture.md und design.md. Identität, Ziel, Anforderungen, Funktionsumfang und Abgrenzung tragen zusammen ein Dokument; die Epics/User Stories dabei auf die Abgrenzungs- und Anforderungssubstanz eindampfen.
27. `filter-modell.md` bleibt, solange der Cross-View-Filter im Bau ist (Feature-Bauplan), und wird nach Umsetzung in architecture.md gefaltet, mit Entscheidungsspur in decisions.md. Ein Verfallskriterium („nach Milestone 4 einarbeiten“) jetzt im Dokumentkopf vermerken.
28. Optional `design.md` in `architecture.md`. Beide adressieren die Frontend-Entwicklung; die Trennung Bauweise/Gestalt ist sauber, kostet aber einen Querverweis pro Thema. Nur zusammenlegen, wenn die Frontend-Lane das als Gewinn empfindet.
29. `journal.md` beschneiden. Das Tagebuch ist auf über 800 Zeilen gewachsen; ältere Sessions in `knowledge/_archive/` oder `data/reports/` auslagern und im Journal eine Zeile Verweis lassen. Die Konvention verlangt Kompaktheit.
30. Nicht anfassen: `data.md` (Kern, bereits an der Obergrenze dessen, was in einem Zug gelesen werden kann; weitere Merges hinein verschlechtern es), `data-entry-guidelines.md` (normativ, Leserschaft Erfassungsteam), `datenfehler.md` (operatives Register, Leserschaft Archivteam), `decisions.md`, `plan.md`, `pipeline.md`, `testing.md`, `INDEX.md`.

Zielbild sind rund zehn kanonische Dokumente mit je genau einer Funktion und Leserschaft. Nach jeder Zusammenlegung INDEX.md (Lesepfade, Matrix, Frontmatter `related`) nachziehen und eingehende Links per Grep prüfen.

## Abhängigkeiten

Phase 0 vor allem anderen, weil jede weitere Arbeit ein grünes Gate braucht. Phase 1 vor Phase 2, weil die Drop-Zähler und die konsolidierte Ladelogik die neuen Unit-Tests tragen. Phase 3 ist unabhängig und kann parallel in der Frontend-Lane laufen. Phase 4 Punkt 16 entscheidet, ob die Partitur-Tests aus Phase 0 dauerhaft entfallen oder zurückkehren. Phase 5 ist unabhängig, Punkt 20 sollte aber vor der nächsten Modellarbeit erledigt sein, damit die Blockiert-Markierung niemanden fehlleitet.
