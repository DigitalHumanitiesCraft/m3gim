# XLSX-Workarounds: Was Pipeline kompensiert, was an der Quelle zu fixen ist

> Prinzip: **Documents as Source of Truth**. Pipeline-Workarounds sind Schulden, nicht Features. Dieses Dokument macht sie sichtbar — damit klar ist, wo das Archiv-Team Änderungen in den XLSX vornehmen sollte und wo der Pipeline-Code defensiv bleiben muss.
>
> Kategorien:
> - **Spec** — strukturell unvermeidlich, bleibt im Code. Typisch: Format-Transformationen (Datums-Bereinigung, Komposit-Zerlegung, Gender-Suffix-Strip).
> - **Workaround** — kompensiert eine XLSX-Eigenheit, die quellseitig fixbar wäre. Redaktioneller Hinweis ans Archiv-Team.
> - **Policy** — redaktionelle Entscheidung (z. B. Default-Währung). Bleibt, solange die Entscheidung gilt.
> - **Dead** — ungenutzt, wurde entfernt. Steht hier zur Historie.

## 1. Index-Header-Shifts

| Feld | Inhalt |
|---|---|
| **Workaround** | `INDEX_HEADER_SHIFTS` in [`scripts/_common.py`](../scripts/_common.py) — verwendet in `transform.py`, `validate.py`, `reconcile.py` |
| **Kompensiert** | Organisations-, Orts- und Werkindex haben keinen sauberen Kopf: Die erste Datenzeile wird vom Excel-Export als Header interpretiert. Pipeline erkennt das am untypischen Wert in Spalte 1 (z. B. „Graz" statt „name") und schiebt die Zeile zurück ins DataFrame. |
| **Kategorie** | Workaround |
| **Source-Fix-Vorschlag** | In den drei Index-Blättern eine saubere Kopfzeile (`m3gim_id`, `name`, `wikidata_id`, ...) einfügen und beim Excel-Export mitgeben. Dann kann die Kompensation entfallen. |
| **Test-Absicherung** | `tests/test_03_roundtrip.py` — wenn der Shift wegfällt und die XLSX wieder verschoben wäre, brechen Record-Counts und Wikidata-Referenzen. |

## 2. Finanz-Währungs-Default für NIM_007

| Feld | Inhalt |
|---|---|
| **Workaround** | `FINANCE_CURRENCY_DEFAULTS` + `default_currency_for()` in [`scripts/_common.py`](../scripts/_common.py) |
| **Kompensiert** | Konvolut UAKUG/NIM_007 „Aufstellung 1966" Folio 5_1 hat fünf Finanzwerte ohne Währungssuffix (36000, 18000, 90000×2, 180000). Benachbarte Folien 5_2..5_8 sind durchgehend in Schilling ausgewiesen, daher ist „S" die redaktionell gestützte Annahme. |
| **Kategorie** | Policy |
| **Source-Fix-Vorschlag** | Optional: Währungssuffix in Folio 5_1 nachtragen, dann wird der Default überflüssig. Keine Dringlichkeit — die Annahme ist dokumentiert. |
| **Test-Absicherung** | `tests/test_13_finanzen.py` — prüft Währungs-Vokabular-Abdeckung auf den NIM_007-Records. Ein neuer unbekannter Währungs-Wert würde rot. |

## 3. Bearbeitungsstand-Normalisierung

| Feld | Inhalt |
|---|---|
| **Workaround** | `normalize_bearbeitungsstand()` + `BEARBEITUNGSSTAND_CANONICAL` in [`scripts/_common.py`](../scripts/_common.py) |
| **Kompensiert** | Das Bearbeitungsstand-Feld enthält Varianten in Groß-/Kleinschreibung und Synonymen: `vollständig`/`Vollständig`/`erledigt`/`Erledigt`/`Vollständig (Ira Malaniuk betreffend)`/`begonnen`/`Begonnen`/`zurückgestellt`/`Zurückgestellt`. Pipeline mappt auf drei kanonische Werte: `abgeschlossen`, `begonnen`, `zurueckgestellt`. |
| **Kategorie** | Workaround |
| **Source-Fix-Vorschlag** | Spalte als Google-Sheets-Dropdown mit exakt drei Optionen (`abgeschlossen`, `begonnen`, `zurueckgestellt`) konfigurieren. Dann entfällt das Mapping. |
| **Test-Absicherung** | `tests/test_03_roundtrip.py::test_bearbeitungsstand_normalized` — prüft strict, dass im Output nur die drei kanonischen Werte erscheinen. Ein neuer Rohwert, den das Mapping nicht kennt, landet ungefiltert durch und lässt den Test rot werden. |

## 4. Umlaut-Fallback für Verknüpfungen-Datei (Dead)

| Feld | Inhalt |
|---|---|
| **Workaround** | Früher: `transform.py` prüfte zuerst `M3GIM-Verknüpfungen.xlsx`, fiel auf `M3GIM-Verknuepfungen.xlsx` zurück, falls Umlaut-Export fehlte. |
| **Kompensiert** | Potenzielles Export-Artefakt bei Umlauten unter Windows. |
| **Kategorie** | Dead |
| **Stand** | Entfernt in Session 35. Repo enthält nur die Umlaut-Variante. Pipeline wirft jetzt `FileNotFoundError`, wenn die Datei nicht gefunden wird — saubere Fehlermeldung statt stiller ASCII-Fallback. |
| **Test-Absicherung** | — (Entfernung hat sich in der Testsuite nicht niedergeschlagen, da der ASCII-Pfad nie genutzt wurde). |

## 5. Role-Hygiene: Datumsrollen im Ort-Komposit

| Feld | Inhalt |
|---|---|
| **Workaround** | `transform.py` (im `process_verknuepfungen`-Zweig für `ort, datum`-Komposite) strippt das `role`-Feld im Ort-Zweig, wenn die Rolle in `DATUMSROLLE_TO_PROPERTY` liegt (`absendedatum`, `empfangsdatum`, `auffuehrungsdatum`, `erscheinungsdatum`, ...). |
| **Kompensiert** | Bei Komposit-Einträgen `ort, datum` wurde die Datums-Rolle an beide Hälften vererbt. Der `rico:Place` trug dann z. B. Rolle „erscheinungsdatum" — im Frontend erschien „Stuttgart (erscheinungsdatum)". |
| **Kategorie** | Workaround |
| **Source-Fix-Vorschlag** | In der Verknüpfungstabelle Rolle nur dem Datum zuordnen, nicht dem Ort (erfordert Spaltenstruktur mit getrennten `rolle_ort`/`rolle_datum`). Pragmatisch aufwendig; der Code-Strip ist akzeptabel. |
| **Test-Absicherung** | `tests/test_23_role_hygiene.py` mit Anker-Record `NIM_004_12` (Stuttgart). |

## 6. Freitext-Datierungen

| Feld | Inhalt |
|---|---|
| **Workaround** | `transform.py` gibt Datums-Rohwerte aus der Verknüpfungstabelle unverändert durch; `test_04::test_event_date_iso_or_range` toleriert Freitext-Werte wie „Wien, ab 1956" (geloggt, nicht geblockt). |
| **Kompensiert** | Einige Verknüpfungs-Einträge haben statt ISO-Datum einen Freitext, der Ort + Zeit mischt. |
| **Kategorie** | Workaround |
| **Source-Fix-Vorschlag** | Datumsspalte strikt als ISO-Datum erfassen (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `YYYY/YYYY` für Zeitspannen). Freitext-Angaben in eine separate Anmerkungsspalte verschieben. |
| **Test-Absicherung** | `tests/test_04_verknuepfungen.py::test_event_date_iso_or_range` — wird nach Workstream B strikt auf ISO. Freitext-Einträge lassen den Test dann rot werden. |

## 7. Verwaiste Signatur UAKUG/NIM_11

| Feld | Inhalt |
|---|---|
| **Workaround** | In der Verknüpfungstabelle existiert ein Eintrag mit Signatur `UAKUG/NIM_11`, für den kein Objekt in `M3GIM-Objekte.xlsx` existiert. Die Pipeline emittiert die Verknüpfung nicht (keine Ziel-Record gefunden); `test_12_agrelon.py::test_has_employer_relations` skipt, wenn die eine betroffene arbeitgeber-Zeile deshalb keinen Treffer produziert. |
| **Kompensiert** | Datenerfassungsfehler oder Tippfehler (`NIM_110` / `NIM_111`?). |
| **Kategorie** | Workaround |
| **Source-Fix-Vorschlag** | Entweder die fehlende Objektzeile nachpflegen oder den Eintrag in der Verknüpfungstabelle korrigieren/entfernen. |
| **Test-Absicherung** | Nach Fix: Skip entfällt, `test_12` prüft die Relation wieder strikt. |

## 8. PL_07-Duplikat

| Feld | Inhalt |
|---|---|
| **Workaround** | Zwei Zeilen in `M3GIM-Objekte.xlsx` für `UAKUG/NIM/PL_07`. `test_05::test_all_record_ids_unique` läuft als `xfail`. |
| **Kompensiert** | Redaktionelles Duplikat. |
| **Kategorie** | Workaround |
| **Source-Fix-Vorschlag** | Im Google Sheet eine der beiden Zeilen entfernen oder die zweite auf eine eigene Signatur umstellen (z. B. `UAKUG/NIM/PL_07b`). |
| **Test-Absicherung** | Nach Fix: `xfail`-Marker in `test_05` entfernen, Test wird strict-green. |

## 9. Gender-Suffix in Rollen

| Feld | Inhalt |
|---|---|
| **Workaround** | `normalize_role()` in `scripts/transform.py` entfernt `:innen` und `:in` (`saenger:in` → `saenger`, `dirigent:innen` → `dirigent`). |
| **Kompensiert** | Gender-inklusive Notation in der Erfassung vs. kanonisch maskulin in Wikidata/RiC-O. |
| **Kategorie** | Spec |
| **Source-Fix-Vorschlag** | Keiner. Das ist eine bewusste Format-Transformation, kein Datenfehler. |
| **Test-Absicherung** | `tests/test_04::test_roles_gender_neutral`, `tests/test_14::normalize_role`. |

## 10. Q-ID-Regex-Filter

| Feld | Inhalt |
|---|---|
| **Workaround** | `transform.py` akzeptiert nur Werte, die dem Muster `^Q\d+$` entsprechen, als Wikidata-ID. |
| **Kompensiert** | Tippfehler wie `"wikidata: Q123"`, `"q123"`, Leerzeichen, URLs. |
| **Kategorie** | Spec |
| **Source-Fix-Vorschlag** | Keiner — der Filter bleibt als Sicherheitsnetz, auch wenn die Eingabe sauber wird. |
| **Test-Absicherung** | `tests/test_07_wikidata.py::test_wd_ids_match_regex`. |

## 11. Folio-Spalten-Fallback

| Feld | Inhalt |
|---|---|
| **Workaround** | `transform.py` erkennt die Folio-Spalte heuristisch — akzeptiert `folio`, `folio nr`, `folio_nr`, `Unnamed: 1`, plus Regex-Fallback (`^\d+_\d+$` als typisches Folio-Werteformat). |
| **Kompensiert** | Der Spaltenname der Folio-Nummer hat sich im Laufe des Projekts geändert. |
| **Kategorie** | Workaround |
| **Source-Fix-Vorschlag** | In `M3GIM-Objekte.xlsx` einen stabilen Spaltennamen festlegen (aktuell `folio nr`). Ab dann können die anderen Varianten wegfallen. |
| **Test-Absicherung** | `tests/test_03_roundtrip.py::test_every_xlsx_signatur_in_graph` — ein Folio-Verlust würde dort auffallen. |

## 13. Sammel-Zeilen + Folios = @id-Kollision

| Feld | Inhalt |
|---|---|
| **Workaround** | `build_konvolut_hierarchy()` in `scripts/transform.py` — wenn eine Signatur sowohl eine Sammel-Zeile (ohne Folio, typ `sammlung` oder `korrespondenz`) als auch Folio-Zeilen hat, bekommt die Sammel-Zeile ein `_sammlung`-Suffix auf der @id und wird als Meta-Member an das Konvolut-RecordSet gehaengt. |
| **Kompensiert** | Alte Erfassungspraxis: Sammel-Zeile beschreibt das Konvolut insgesamt ("Diverse Zeitungsausschnitte"), Folio-Zeilen beschreiben die Teile. Beide hatten dieselbe `archivsignatur`, wodurch zwei Graph-Knoten mit gleicher `@id` entstanden — JSON-LD-Verletzung + „leeres Konvolut"-Eintrag im Frontend. |
| **Kategorie** | Workaround |
| **Source-Fix-Vorschlag** | Sammel-Zeile entfernen und ihren Inhalt (Titel, Beschreibung, dokumenttyp) als Konvolut-Metadaten an anderer Stelle unterbringen (z. B. eigene `konvolut_beschreibung`-Spalte), oder die Sammel-Zeile als eigene Folio-Nummer (z. B. `folio nr = 0`) erfassen. |
| **Test-Absicherung** | `tests/test_05_referential.py::test_all_record_ids_unique` — hat vor dem Fix 4 Kollisionen gezeigt, nach dem Fix nur noch die bekannte PL_07. `tests/frontend/smoke.py` fasst den verbleibenden Stand unter „graph:duplicate-@id" zusammen. |
| **Zusatz** | Der Sammel-Titel (z. B. „Diverse Zeitungsausschnitte" für NIM_006) wird im Frontend als Konvolut-Titel-Fallback genutzt (`loader.js::konvolutMeta.title`). Seit dem Frontend-Filter „nur bearbeitet" sind Konvolute ohne erschlossene Folios unsichtbar — der Fallback greift nur für teil-erschlossene Konvolute mit Sammel-Zeile. |

## 14. Komponisten-Schreibweise-Varianten im Werkindex

| Feld | Inhalt |
|---|---|
| **Workaround** | — (keiner in der Pipeline; reine Detektion in `tests/test_24_composer_uniqueness.py`) |
| **Kompensiert** | Der Werkindex enthält „Beethoven, Ludwig von" (2 Werke) und „Beethoven, Ludwig van" (3 Werke) als zwei verschiedene Rohstrings. Der Statistik-Tab listet sie deshalb in Top-10 getrennt. Typischer Tippfehler, kein struktureller Varianzgrund. |
| **Kategorie** | Workaround |
| **Source-Fix-Vorschlag** | In `data/google-spreadsheet/M3GIM-Werkindex.xlsx` die beiden „von"-Zellen auf „van" vereinheitlichen. Danach Pipeline neu laufen lassen und xfail-Marker in `test_24` entfernen (XPASS(strict) bricht sonst die Suite). |
| **Test-Absicherung** | `tests/test_24_composer_uniqueness.py::test_komponisten_ohne_fuzzy_duplikate` — strict-xfail, Levenshtein-Ratio ≥ 92 fängt die van/von-Variante und jede künftige Tippfehler-Doppelung. |
| **Bewusst NICHT im Code** | Kein `normalize_composer()` in `scripts/transform.py`. Das wäre ein Sonderfall-Workaround, der den einzelnen Tippfehler kaschiert und zukünftige Varianten stillschweigend weiter kaschieren würde — das widerspricht dem Prinzip „Pipeline-Workarounds sind Schulden, nicht Features" aus dem Dokument-Intro. |

## 15. Werk-Autor mit Performance-Rolle „Aufführung"

| Feld | Inhalt |
|---|---|
| **Workaround** | — (keiner in Pipeline oder Frontend) |
| **Kompensiert** | In `M3GIM-Verknüpfungen.xlsx` Zeile 1208 trägt `Sophokles` (typ=person) die Rolle `Aufführung` für Konvolut `UAKUG/NIM_007` Folio 16. Semantisch falsch: Sophokles wurde nicht aufgeführt, sein *Werk* wurde. Im Netzwerk-Tab (E-93) landet Sophokles dadurch als einzige Person in Kategorie „Andere", weil `aufführung` in keinem ROLE_PRIO-Bucket von `derivePersonKategorie()` liegt und die `onlyErwaehnt`-Prüfung an dieser zweiten Rolle scheitert. |
| **Kategorie** | Datenartefakt |
| **Source-Fix-Vorschlag** | In Zeile 1208 der Verknüpfungen-XLSX die Rolle von `Aufführung` auf `Vorlage` (bzw. `Verfasser`, falls das kontrollierte Vokabular dies bereits trägt) ändern. Sophokles ist Autor des Stücks, nicht Performer. |
| **Test-Absicherung** | — (aktuell keine; ein Unit-Test `derivePersonKategorie: bekannte Werk-Autoren nicht in "Andere"` wäre möglich, aber das Problem ist keines der Funktion, sondern der Quelle). |
| **Bewusst NICHT im Code** | Kein Sonder-Mapping `aufführung → Bühne` in `_netzwerk-geometry.js`. Das würde für Sänger:innen stimmen (die sind ohnehin über `sänger`/`sängerin` schon in Bühne), für Werk-Autor:innen aber eine neue falsche Einordnung produzieren. Die korrekte Lösung liegt an der Quelle. |

## 12. Template-Zeilen-Filter

| Feld | Inhalt |
|---|---|
| **Workaround** | Pipeline überspringt Zeilen, deren `archivsignatur`-Wert `"beispiel"` ist. |
| **Kompensiert** | Die XLSX enthält eine Muster-/Template-Zeile für das Archiv-Team. |
| **Kategorie** | Policy |
| **Source-Fix-Vorschlag** | — (Muster-Zeile ist nützlich für die Erfassung, nicht zu entfernen). |
| **Test-Absicherung** | — |

---

## Verweise

- **CLAUDE.md** — § Plakate/Dateinamen-Eigenheiten verweist auf dieses Dokument.
- **`data/reports/quality-snapshot.md`** — Externe-Blocker-Sektion verlinkt hierher.
- **`scripts/_common.py`** — zentrale Normalisierungs-Konstanten (HEADER_SHIFTS, FINANCE_CURRENCY_DEFAULTS, BEARBEITUNGSSTAND).
