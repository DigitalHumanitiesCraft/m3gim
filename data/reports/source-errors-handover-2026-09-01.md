# Quellfehler zur Korrektur in der Erfassung

Stand der Prüfung 2026-09-01, gegen den Datenstand vom 2026-08-31 plus den CSV-Export vom 2026-09-01.

Diese Liste führt nur Fehler, die in den Erfassungstabellen selbst zu beheben sind. Fehler des automatischen Wikidata-Abgleichs stehen nicht hier, sie werden in einem eigenen Abgleichlauf korrigiert. Jeder Punkt nennt die Datei, die Fundstelle und das betroffene Feld sowie den Ist-Wert und was zu tun ist. Zeilennummern beziehen sich auf die Zeile der Tabelle einschließlich der Kopfzeile. In den Verknüpfungs-CSV wird über Signatur und Folio adressiert, weil das der Navigation in der Tabelle entspricht.

Reihenfolge nach Datei, damit ein Blatt am Stück durchgearbeitet werden kann. Die vier mit **[Kopfzeile]** markierten Punkte stehen zuerst, weil eine fehlende oder mit Daten überschriebene Kopfzeile die Pipeline zu dauerhaften Notbehelfen zwingt und zugleich echte Datenwerte verloren gehen.

## Objekttabelle (`M3GIM-Objekte.xlsx`)

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Kopfzeile, erste Spalte **[Kopfzeile]** | Spaltentitel | `1` statt `box_nr` | Kopfzelle auf den Spaltennamen setzen |
| `UAKUG/NIM_004` Folio 34 | entstehungsdatum | `2026-09-06` | Wert entstand aus der jahrlosen Angabe `06-09` durch Autokonvertierung. Korrekten Monat oder korrektes Jahr eintragen, notfalls leeren. Spalte als Text formatieren, sonst kehrt der Effekt zurück |
| `UAKUG/NIM_004` Folio 5 | entstehungsdatum | `1963` | Prüfen, ob 1963 gemeint ist oder 1953. Es ist der einzige 196x-Wert im Konvolut. Betrifft eine Orpheus-Rezension der Süddeutschen Zeitung, nicht ein Bayreuth-Objekt |
| `UAKUG/NIM/PL_07` | ganze Zeile | zwei Zeilen, die zweite bis auf die Signatur leer | Die leere Doppelzeile entfernen |
| `UAKUG/NIM_138` | ganze Zeile | nur Signatur, sonst leer | Zeile befüllen oder entfernen |
| `UAKUG/NIM_137` Folio 11_62 | ganze Zeile | Zeile 725 trägt nur die Folio-Nummer, Signatur, Titel und Typ fehlen | Bestätigt am 2026-09-03. Ohne Signatur kann die Pipeline keinen Objekt-Identifier bilden und verwirft die Zeile, die 114 Verknüpfungszeilen zu Folio 11_62 laufen dadurch ins Leere. Zeile vollständig befüllen, mindestens die Signatur nachtragen |
| `UAKUG/NIM_005` Folio-Zeile, Zeile 76 | folio nr | `folio` klein statt `Folio` | Auf `Folio` korrigieren. Die kleingeschriebene Form wird nicht als Konvolut-Metadatenzeile erkannt und erscheint in der Anwendung als eigenes Objekt „Nr. folio" |
| `UAKUG/NIM_137` Folio 7 | titel | `... "das Reihngold" ...` | Tippfehler auf `Rheingold` korrigieren |
| `UAKUG/NIM_137` Folio 9 | titel | `... "Siegfreid" ...` | Tippfehler auf `Siegfried` korrigieren |
| `UAKUG/NIM_137` Folios 12_1 bis 12_42 | dokumenttyp | `presse` | Das Festivalheft dokumentiert Spielplan, Besetzungen und Personal. Auf `programm` setzen |
| `UAKUG/NIM_137` Folio 12_1 | titel | offenes Anführungszeichen `"Die Mitwirkenden ...` | Anführungszeichen schließen |
| `UAKUG/NIM_137` Heft 12 | fehlende Folios | endet bei Folio 12_42 | Folios 12_43 bis 12_45 ergänzen, sie stehen physisch im Heft (Technik, Verwaltung, Anzeigen, Bildrechte) |
| `UAKUG/NIM_073` Folio 5 | entstehungsdatum | `1956-10-01` | Autokonvertierung einer Monatsangabe zum Monatsersten. Auf `1956-10` zurücksetzen, Spalte als Text formatieren |
| `UAKUG/NIM_142` Folio 20 | entstehungsdatum | `1954-12-01` | wie vor, auf `1954-12` |
| `UAKUG/NIM_168` Folio 2 | entstehungsdatum | `1990-12-01` | wie vor, ein Weihnachtsgruß, also `1990-12` |
| `UAKUG/NIM_168` | fehlende Folios | nur Folios 1 und 2 erfasst | Die Verknüpfungen adressieren Sub-Folios 2_1 bis 2_3. Entweder die Sub-Folios hier anlegen oder in den Verknüpfungen auf 2 vereinheitlichen |

Die Autokonvertierung der Datumsspalte betrifft in der Objekttabelle 156 Zellen. Grundlegend behoben ist sie erst, wenn die Spalte als Text erfasst oder die Objekttabelle wie die Verknüpfungen als CSV ausgeführt wird.

## Verknüpfungstabelle (CSV je Box)

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Box 1, `UAKUG/NIM_007` Folio 20 | zielort | `Zürich` am Umschlag an die Deutsche Oper Berlin | Zielort prüfen, er widerspricht dem Titel |
| Box 1, `UAKUG/NIM_007` Folio 16 | rolle | Sophokles trägt `Aufführung` | Sein Werk wurde aufgeführt, nicht er. Auf `Vorlage` oder `Verfasser` setzen |
| Box 1, Signatur `UAKUG/NIM_11` | Signatur | 260 Zeilen mit zweistelliger Konvolutnummer `NIM_11` statt dreistellig `NIM_011` | Die Pipeline gleicht die Schreibung an und ordnet die Zeilen dem Konvolut `NIM_011` zu, es geht nichts verloren. Zur Einheitlichkeit die Signatur an der Quelle auf `UAKUG/NIM_011` korrigieren. Sollte inhaltlich ein anderes Konvolut gemeint sein, bitte melden, dann wäre die Angleichung falsch |
| Box 1, `UAKUG/NIM_11` Folio 7 | Datum (Erstelldatum) | `1055-08-24` | Jahrhundertdreher, auf `1955-08-24` korrigieren |
| Box 1, `UAKUG/NIM_11` Folio 7 | rolle | Ausgabe `15,00 DM` trägt `interpret:in` | Eine Finanzrolle eintragen, keine Personenrolle |
| Box 1, `UAKUG/NIM_005` Folio 16 | Datum | `1951-02-29` | 1951 ist kein Schaltjahr, korrektes Datum eintragen |
| Box 1, `UAKUG/NIM_005` Folio 21 | Datum | `1959-31-08` | Tag und Monat vertauscht, auf `1959-08-31` |
| Box 1, `UAKUG/NIM_005` Folio 22 | Datum | `1959-02-30` | Kein 30. Februar, korrektes Datum eintragen |
| Box 1, `UAKUG/NIM_005` Kopfzeile der Tätigkeitslisten (Zeile 875) | Folio | Folio-Wert `1-29`, name `Tätigkeitslisten` | Ein Spannenwert trifft keinen Objektsatz. Entweder eine echte Folio-Nummer vergeben oder die Zeile als Konvolut-Anmerkung führen |
| Box 1, `UAKUG/NIM_005` Folio 16 (Teatro Dell Opera Zeile 1119, Stadttheater Zürich Zeile 1126), Folio 18 (Theatre Royal de la Monnaie Zeile 1391) | rolle | Institutionszeilen tragen die Rolle `v` statt eines gültigen Wertes | Der Rollenwert ist abgeschnitten, gemeint ist vermutlich `veranstalter:in`. Ausschreiben, das Dropdown erzwingt sonst keinen gültigen Wert |
| Box 1, `UAKUG/NIM_005` Folio 16 (Solistin Zeile 1174), Folio 18 (Brangäne Zeile 1389), Folio 19 (Venus Zeile 1474) | rolle | Partiezeilen tragen `re` beziehungsweise `r` statt eines gültigen Wertes | Der Rollenwert ist abgeschnitten, gemeint ist vermutlich `repertoire`. Ausschreiben, das Dropdown erzwingt sonst keinen gültigen Wert |
| Box 1, `UAKUG/NIM_005` Folios 16 bis 28 und die Kopfzeile mit Folio `1-29`, Box 5, `UAKUG/NIM_136` | typ | In der neuen NIM_005-Erschließung 228 Zeilen mit Name und Rolle, aber ohne Typ, davon 226 Dokumentgattungen (überwiegend Bestätigung, Vertrag, Gastvertrag, Verpflichtungsschein, Programm, Dienstvertrag, Korrespondenz, Abschlussschein, Kontrakt). Ohne Typ fehlt der Zielkontext, die Zeilen erreichen den Datensatz nicht. In NIM_136 (Box 5) besteht der Befund fort | Typ ergänzen, bei den Dokumentgattungen den Typ `dokument`. In manchen Zeilen ist die Typangabe verrutscht, `Brief` auf Folio 16 (Zeile 1034) trägt den Wert `dokument` in der Anmerkungsspalte, andere Dokumentzeilen tragen fälschlich `person` als Typ. Typ in die Typspalte setzen |
| Box 2, `UAKUG/NIM_016` Folio 13 | werk / anmerkung | Werk `Requiem`, Komponist `Mozart` nur in der Anmerkung | Komponist in eine auswertbare Spalte bringen, sonst bleibt der Titel mehrdeutig |
| Box 5, `UAKUG/NIM_137` | Folio | `15-1` und `15-2` mit Bindestrich | Die Objekttabelle schreibt `15_1` und `15_2` mit Unterstrich. Vereinheitlichen, sonst treffen die Zeilen kein Objekt |
| Box 1, `UAKUG/NIM_004` Folio 34, Zeile 867 | typ / name | Typ `ort, datum` mit Wert `06-09`, Rolle erscheinungsdatum, Anmerkung „ohne Jahr" | Der jahrlose Datumsrest steckt im Orts-Datums-Komposit und erscheint in der Anwendung als Ort „06-09". Zeile auf eine reine Datumszeile umstellen oder leeren, bis das Jahr geklärt ist |
| Box 5, `UAKUG/NIM_137` Folios 15_1 und 15_2 | typ / rolle | Partien doppelt erfasst, einmal als Kompositzeile `rolle, Vorname Nachname Sänger*in` (etwa `Froh, Gerhard Stolze`), einmal als reine Rollenzeile (`Froh`) | Eine der beiden Erfassungsformen wählen. Die Doppelerfassung erzeugt in der Anwendung doppelte Rollen-Chips am selben Dokument |
| mehrere Boxen | Beteiligungskennung | `1.1` statt `1.01` in 26 Zeilen | Zweistellig schreiben, sonst ist Beteiligung 01 nicht von 10 zu unterscheiden |
| Verknüpfungstabelle | Name | `Teatro Colon` ohne Akzent | Der Index führt `Teatro Colón` mit Akzent. Schreibung angleichen, sonst greift die Normdaten-Verknüpfung nicht |
| Verknüpfungstabelle | Ortsname | `bayreuth` (klein) und `Bayeuth` (Tippfehler) | Auf `Bayreuth` vereinheitlichen |

### Werktitel in Kurzform, Dubletten im Werke-Register und fehlende Komponisten (2026-09-04)

Die Verknüpfungstabelle führt dieselbe Oper unter mehreren Titeln, meist einmal ausgeschrieben mit Artikel und einmal als Kurzform ohne Artikel. Das Frontend gleicht Werknamen nicht unscharf ab, deshalb steht jede Schreibung als eigener Eintrag im Werke-Register, und die Kurzform trifft den Werkindex nicht, bleibt also ohne Komponisten und ohne Wikidata-Kennung. 188 Werknamen stehen im ausgelieferten Datensatz, 94 davon ohne Komponisten. Zehn dieser 94 lösen einen Indexeintrag auf, der selbst keinen Komponisten führt, darunter die weiter unten bereits gemeldeten Requiem- und Stabat-mater-Fälle, und 84 lösen gar keinen Indexeintrag auf. Von diesen 84 unterscheiden sich elf von der Indexform nur in Artikel, Groß- und Kleinschreibung oder Akzent, sechzehn sind Schreibvarianten oder Tippfehler dicht an einer Indexform, und 57 haben im Werkindex keine Entsprechung, darunter fünf Kurzformen eines längeren Indextitels.

Die Kurzformen häufen sich in der Erschließung von `UAKUG/NIM_005` (Box 1, Zeilen 1006 bis 2904) und in einem Zeilenlauf zu `UAKUG/NIM_004` Folio 30 (Box 1, Zeilen 722 bis 738, dort Troubadour, Cosi fan Tutte, Zauberflöte, Tannhäuser, Meistersinger, Walküre). Zwei dieser Zeilen tragen in der Anmerkung `sic!` (Box 1, Zeilen 1280 und 1287), die Kurzform ist dort also bewusst nach dem Wortlaut der Vorlage erfasst.

| Kurzform (Belegstelle) | Ausgeschriebene Form (Belegstelle) | Ist-Wert | Zu tun |
|---|---|---|---|
| `Walküre`, 12 Dokumente, Box 1 Zeilen 737, 1273, 1433, Box 5 Zeilen 323, 1372 | `Die Walküre`, 6 Dokumente, Box 1 Zeile 3562, Box 2 Zeilen 44, 71 | zwei Registereinträge, die Kurzform ohne Komponisten | Auf die Indexform `Die Walküre` vereinheitlichen |
| `Tristan`, 11 Dokumente, Box 1 Zeilen 1280, 1330, 1384 und weitere in NIM_005 | `Tristan und Isolde`, 44 Dokumente, Box 1 Zeilen 208, 248, 496 | wie vor | Auf `Tristan und Isolde` vereinheitlichen |
| `Rheingold`, 5 Dokumente, Box 1 Zeilen 1271, 1432, 1587 | `Das Rheingold`, 9 Dokumente, Box 2 Zeilen 24, 43, 70 | wie vor | Auf `Das Rheingold` |
| `Meistersinger`, 6 Dokumente, Box 1 Zeilen 736, 1287, 1404 | `Die Meistersinger von Nürnberg`, 9 Dokumente, Box 1 Zeilen 349, 2992, 3242 | dazu `Die Meistersinger vin Nürnberg` in Box 5 Zeile 273 | Beide auf `Die Meistersinger von Nürnberg` |
| `Rosenkavalier`, 3 Dokumente, Box 1 Zeilen 1755, 1845, 2315 | `Der Rosenkavalier`, 2 Dokumente, Box 1 Zeile 804, Box 5 Zeile 897 | dazu `Der Rosenkawalier` | Auf `Der Rosenkavalier` |
| `Ring des Nibelungen`, 2 Dokumente, Box 1 Zeile 1777, Box 5 Zeile 402 | `Der Ring des Nibelungen`, 7 Dokumente, Box 4 Zeilen 41, 96, 169 | dazu `Der Ring des Niebelungen` | Auf `Der Ring des Nibelungen` |
| `Zauberflöte`, 2 Dokumente, Box 1 Zeilen 324, 731 | `Die Zauberflöte`, 1 Dokument, Box 1 Zeile 2993 | wie vor | Auf `Die Zauberflöte` |
| `Junge Magd`, 1 Dokument, Box 1 Zeile 2627 | `Die junge Magd`, 1 Dokument, Box 1 Zeile 3518 | wie vor | Auf `Die junge Magd` |
| `Cosi Fan Tutte` und drei weitere Schreibungen, 9 Dokumente, Box 1 Zeilen 326, 730, 1182, Box 2 Zeile 193 | `Così fan tutte`, 1 Dokument, Box 1 Zeilen 3362, 3363 | fünf Registereinträge für ein Werk, nur die Indexform mit Komponist | Auf `Così fan tutte` |
| `Stabat Mater` Box 1 Zeile 1695, `Stabat mater` Box 1 Zeilen 859, 3528, 3529 | drei Werke gleichen Titels im Index | zwei Registereinträge, keiner auflösbar | Groß- und Kleinschreibung vereinheitlichen und den Komponisten je Zeile mitführen |
| `Elias`, 3 Dokumente, Box 1 Zeilen 1006, 2147, 2383 | `Elias, op. 70, MWV A 25`, 2 Dokumente, Box 1 Zeile 3523, Box 2 Zeile 295 | Kurzform trifft den Indextitel nicht | Auf die Indexform oder den Indextitel auf `Elias` kürzen und die Werkkennung führen |
| `Orpheus`, 2 Dokumente, Box 1 Zeilen 1516, 1727 | `Orpheus und Eurydike`, 5 Dokumente, Box 1 Zeilen 124, 136, 181 | wie vor | Auf `Orpheus und Eurydike` |
| `Troubadour`, 4 Dokumente, Box 1 Zeilen 722, 1233, 1240 | `Der Troubadour`, 2 Dokumente, Box 2 Zeilen 157, 170 | beide Formen fehlen im Werkindex | Indexzeile mit Komponist anlegen und die Schreibung vereinheitlichen |
| `Tannhäuser`, 6 Dokumente, Box 1 Zeilen 410, 735, 1118 | Index führt `Tannhäuser und der Sängerkrieg auf Wartburg` | Kurzform trifft den Indextitel nicht | wie bei `Elias` |
| `Der Wildschütz`, 6 Dokumente, Box 1 Zeilen 3122, 3147, 3172 | Index führt `Der Wildschütz oder Die Stimme der Natur` | wie vor | wie vor |

Ohne Entsprechung im Werkindex stehen daneben unter anderem `Figaro` (5 Dokumente), `IX. Beethoven` (5), `Don Carlos` (3), `Missa Solemnis` (3), `Titus` (3) sowie die Verschreibungen `Fallstaff`, `Lohegerin`, `Parisfal`, `Mozarts Requium`, `Howantschina` und `Bluebarts Castle` neben dem vorhandenen `Herzog Blaubart's Burg`.

Die dauerhafte Abhilfe ist, die Werknennung in den Boxen über die Werkkennung `m3gim_id` des Werkindex führen statt über den ausgeschriebenen Titel, so wie es der Punkt zu Organisationen und Orten unter den strukturellen Format-Fixes vorsieht. Damit fallen alle Schreibvarianten zusammen und der Komponist kommt aus dem Index. Bis dahin sind die Kurzformen an der Quelle auf die Indexform zu ziehen, für die fünf verkürzten Indextitel ist zu entscheiden, welche Ansetzung gilt, und die im Index fehlenden Werke sind dort mit Komponist anzulegen. Wo die Kurzform bewusst den Wortlaut der Vorlage wiedergibt (die beiden `sic!`-Zeilen), gehört der Wortlaut in die Anmerkung und die Ansetzungsform in die Namensspalte.

## Personenindex (`M3GIM-Personenindex.xlsx`)

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Kopfzeile, Namensspalte **[Kopfzeile]** | Spaltentitel | leer | Kopftitel für die Namensspalte setzen |
| Zeilen 217 und 218 | ganze Zeile | `Malaniuk, Ira` doppelt, Zeile 218 ohne Kennung | Zusammenführen. Die zentrale Person darf nur einmal stehen, mit Kennung P139 und Q94208 |
| Zeilen 436 und 437 | ganze Zeile | `Zimmermann, Erika` doppelt, Zeile 437 ohne Kennung | Zusammenführen |
| (entfallene Zeile) | ganze Zeile | `Zimmermann, Wolfram` fehlt gegenüber dem Vorexport | Prüfen, ob die Streichung beabsichtigt war |
| Zeile 456 | m3gim_id | `Weber, Ludwig` ohne Kennung | Kennung nachtragen, im Vorexport war es P269 |
| Zeilen 226 und 216 | ganze Zeile | `Maykut, Erich` (P146) und `Majkut, Erich` (P138) als zwei Personen | Dieselbe Person, zusammenführen, korrekt ist `Majkut` |
| Zeile 56 | name | `Dermotas, Anton` | Genitiv-s aus dem Fließtext, auf `Dermota, Anton` |
| Zeile 80 | name | `Felberma-Yers, Anny` | auf `Felbermayer, Anny` prüfen und korrigieren |
| Zeile 139 | name | `Hurshells, Edmund` | Genitiv-s entfernen, auf `Hurshell` prüfen |
| Zeile 212 | name | `Lustigs, Rudolf` | auf `Lustig, Rudolf` |
| Zeile 276 | name | `Preys, Hermann` | auf `Prey, Hermann` |
| Zeile 45 | name | `Caridis, Militades` | auf `Caridis, Miltiades` |
| Zeile 113 | name | `Hasse, Johann Asolph` | auf `Adolph` |
| Zeile 314 | name | `Scheenerger, Hansheinz` | auf `Schneeberger, Hansheinz` |
| Zeile 257 | name | `Otto van Rohr` | auf `Rohr, Otto von`, Ansetzungsform Nachname zuerst |
| Zeile 46 | name | `Cesare, curzi` | Namensfolge vertauscht, auf `Curzi, Cesare` |
| Zeile 189 | name | `Kurt, Kuhlmann` | Namensfolge vertauscht, auf `Kuhlmann, Kurt` |

Die Genitiv-s-Namen der Zeilen 56, 80, 139, 212 und 276 stammen aus einer Tannhäuser- und einer Capriccio-Rezension, in der die flektierte Fließtextform als Ansetzung übernommen wurde.

## Organisationsindex (`M3GIM-Organisationsindex.xlsx`)

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Kopfzeile, Namensspalte **[Kopfzeile]** | Spaltentitel | `Claredon` statt eines Titels | Die Organisation `Claredon` in eine Datenzeile setzen, Kopftitel eintragen |
| Zeile 59 | name | `Plattenevrlag Decca` | auf `Plattenverlag Decca` |
| Zeile 60 | name | `Plattenverlag Philipps` | auf `Philips` |
| Zeile 91 | name | `Wiener Staatopernchor` | auf `Wiener Staatsopernchor` |
| Zeilen 42 und 43 | ganze Zeile | `Musikverein für Steiermark` (O68) und `Musikverein Graz` (O27) | Prüfen, ob dieselbe Institution, dann zusammenführen |
| Zeilen 55 und 73 | ganze Zeile | `Opernhaus Zürich` (O36) und `Stadttheater Zürich` (O49) | wie vor |
| Zeilen 44 und 45 | ganze Zeile | `National Artists Corporation` zweimal (O28, O29) | wie vor |
| (weitere Paare) | ganze Zeile | `Staatsoper Wien` und `Wiener Staatsoper`, `Stadttheater Graz` und `Oper Graz`, `Staatsoper München` und `Bayerische Staatsoper` | Je Paar prüfen und zusammenführen |

## Ortsindex (`M3GIM-Ortsindex.xlsx`)

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Kopfzeile, erste Spalte **[Kopfzeile]** | Spaltentitel | `Turin` statt `m3gim_id` | Turin steht zusätzlich als eigene Datenzeile (Zeile 40), ist also doppelt. Kopftitel setzen, Dublette prüfen |

## Werkindex (`M3GIM-Werkindex.xlsx`)

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Kopfzeile **[Kopfzeile]** | Spaltentitel | `Rossini, Gioachino` und `Barber, Samuel` stehen in der Kopfzeile | Zwei Komponisten sind in der Kopfzeile gefangen. Kopftitel setzen, die Werke als Datenzeilen anlegen |
| Zeile 31 | wikidata_id | `Die Meistersinger von Nürnberg` trägt `Q190891` (eine Zahl) | Prüfen und auf die Oper setzen, belegt wäre `Q465540` |
| Zeile 57 | wikidata_id | `Julius Cäsar` trägt `Q729645` (ein Musikalbum) | Händels Giulio Cesare, belegt wäre `Q875563` |
| Zeile 91 | wikidata_id | `Orfeo ed Euridice` trägt `Q309823` (ein Konzept) | belegt wäre `Q723776` |
| Zeile 85 | titel | `Missa in angustijs` | auf `Missa in angustiis` |
| Zeile 8 | titel | `Apparebit reppentina Dies` | auf `repentina` |
| Zeile 98 | titel | `Quintett für Klavier und Schteichquartett` | auf `Streichquartett` |
| mehrere Zeilen | komponist | `Beethoven, Ludwig van` und `Beethoven, Ludwig von` als zwei Schreibweisen, die 9. Sinfonie unter beiden | Auf `van` vereinheitlichen |
| Zeilen zu W97, W113, W124 | titel / komponist | `Requiem` dreimal (Mozart, Hindemith, Verdi) | Kein Fehler an sich, aber eine Verknüpfung nur über den Titel ist nicht auflösbar. Komponist stets mitführen |
| Zeilen zu W80, W120, W121 | titel / komponist | `Stabat mater` dreimal (ohne Angabe, Pergolesi, Rossini) | wie vor, dem titellosen Eintrag den Komponisten geben |
| Zeilen zu W64, W73, W93 | komponist | leer, Anmerkung `Ukrainisches Lied` | Komponist ergänzen, sonst nicht identifizierbar |

## Strukturelle Format-Fixes (einmalig, betreffen die Tabellenstruktur)

Diese Punkte betreffen das Tabellenformat, nicht einzelne Fehlwerte. Jeder erledigte Punkt erlaubt den Abbau einer defensiven Sonderbehandlung in der Verarbeitung.

- Saubere Kopfzeilen in Organisations-, Orts- und Werkindex einfügen (heute wird die erste Datenzeile als Kopf gelesen, die vier oben unter [Kopfzeile] genannten Datenwerte gehen dabei verloren). Der Schaden im Ortsindex erzeugt zusätzlich ein Scheinapproval, weil beim Eintrag `Frankfurt` eine Erfassungsnotiz als Wikidata-Spalte gelesen wird; belegt wäre Q1794.
- Namensspalten-Kopfzeile im Personenindex einfügen.
- Bearbeitungsstand als Dropdown mit den kanonischen Werten `abgeschlossen`, `begonnen`, `zurueckgestellt` konfigurieren.
- Datumsspalte ausschließlich als ISO-Datum erfassen (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `YYYY/YYYY`), ortsmischende Freitext-Angaben in die Anmerkungsspalte.
- Bei Komposit-Einträgen `ort, datum` die Rolle nur dem Datum zuordnen, nicht dem Ort.
- Stabilen Folio-Spaltennamen in der Objekttabelle festlegen (aktuell `folio nr`).
- Sammel-Zeilen, die ein Konvolut insgesamt beschreiben, entfernen oder mit eigener Folio-Nummer versehen.
- `Beethoven, Ludwig von` im Werkindex auf `van` vereinheitlichen (siehe oben).
- Zellen mit dem Literalwert `Folio` durch die tatsächliche Folio-Nummer ersetzen.
- Eine einheitliche Kopfzeile mit benannter `archivsignatur`-Spalte über alle Box-Blätter, oder die Boxen zu einem Verknüpfungs-Blatt zusammenführen (die Verarbeitung liest sie ohnehin als Einheit).
- Organisations- und Ortsnennungen der Verknüpfungstabelle über die Index-Kennung (`m3gim_id`) führen statt über den ausgeschriebenen Namen. Damit fallen Schreibvarianten zusammen und die Normdaten-Prüfung erreicht auch Nennungen ohne Indexzeile.

## Bereits behoben, nicht mehr zu bearbeiten

- Der Tippfehler `Requium` im Werkindex ist korrigiert, alle Requiem-Zeilen sind sauber geschrieben.
- In Box 5 steht kein Datum mehr in der Folio-Spalte.

## Nicht auf dieser Liste

Fehler des automatischen Wikidata-Abgleichs werden nicht in der Erfassung behoben, sondern in einem Abgleichlauf. Behoben sind dort bereits New York als Stadt statt Bundesstaat, mehrere Personen-Fehlzuordnungen und die nullwertigen Datumsangaben. Offen bleiben dort unter anderem die Granularität bei Perchtoldsdorf und Madrid und Hindemiths Requiem, das auf die liturgische Gattung statt auf das Werk zeigt.
