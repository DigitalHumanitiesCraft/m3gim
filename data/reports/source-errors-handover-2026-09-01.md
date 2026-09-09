# Quellbefunde und Korrekturprüfungen für die Erfassung

Stand der Prüfung 2026-09-01, gegen den Datenstand vom 2026-08-31 plus den CSV-Export vom 2026-09-01.

Wirkungsangaben zur Pipeline wurden am 2026-09-09 gegen den E-301-Datenstand geprüft. Historische Bestandszahlen unten beziehen sich weiterhin auf den jeweils genannten älteren Datenstand. Korrekturen an Namen, Typen und Zuordnungen setzen einen Quellen- oder Identitätsbeleg voraus. Der aktuelle Datenstand bewahrt auch nicht modellierte Angaben als neutrale Aussagen, sofern ihre Signatur und ihr Folio ein vorhandenes Objekt auflösen.

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
| Objekttabelle Zeile 725, Folio 11_62 | ganze Zeile | Die Zeile trägt nur die Folio-Nummer. Signatur, Titel und Typ fehlen. Daneben adressieren 114 Verknüpfungszeilen `UAKUG/NIM_137` Folio 11_62, ohne ein vorhandenes Objekt zu treffen | Ohne Signatur kann die Pipeline für Zeile 725 keinen Objekt-Identifier bilden. Anhand der Quelle prüfen, zu welcher Signatur das Folio gehört. Erst danach die Signatur und die übrigen belegten Felder nachtragen. Die Nachbarschaft zu den 114 Verknüpfungszeilen allein belegt die Zuordnung zu `UAKUG/NIM_137` nicht |
| `UAKUG/NIM_005` Folio-Zeile, Zeile 76 | folio nr | `folio` klein; die Objektverarbeitung bildet daraus den eigenen Record `UAKUG/NIM_005 folio`. Der Link-Resolver behandelt das Literal `Folio` dagegen als Verweis auf das Konvolut | An der Quelle prüfen, ob die Zeile das gesamte Konvolut oder ein eigenes Folio beschreibt. Die belegte Granularität einheitlich erfassen; Groß- und Kleinschreibung allein lösen den semantischen Unterschied nicht |
| `UAKUG/NIM_137` Folio 7 | titel | `... "das Reihngold" ...` | Tippfehler auf `Rheingold` korrigieren |
| `UAKUG/NIM_137` Folio 9 | titel | `... "Siegfreid" ...` | Tippfehler auf `Siegfried` korrigieren |
| `UAKUG/NIM_137` Folios 12_1 bis 12_42 | dokumenttyp | `presse`; die Titel beschreiben Spielplan, Besetzungen und Personal eines Festivalhefts | Dokumenttyp am Original prüfen. Bei einem belegten Programmheft auf `programm` setzen; die Inhaltsbeschreibung allein entscheidet den Dokumenttyp nicht |
| `UAKUG/NIM_137` Folio 12_1 | titel | offenes Anführungszeichen `"Die Mitwirkenden ...` | Anführungszeichen schließen |
| `UAKUG/NIM_137` Heft 12 | fehlende Folios | endet bei Folio 12_42 | Folios 12_43 bis 12_45 ergänzen, sie stehen physisch im Heft (Technik, Verwaltung, Anzeigen, Bildrechte) |
| `UAKUG/NIM_073` Folio 5 | entstehungsdatum | `1956-10-01` | Autokonvertierung einer Monatsangabe zum Monatsersten. Auf `1956-10` zurücksetzen, Spalte als Text formatieren |
| `UAKUG/NIM_142` Folio 20 | entstehungsdatum | `1954-12-01` | wie vor, auf `1954-12` |
| `UAKUG/NIM_168` Folio 2 | entstehungsdatum | `1990-12-01` | wie vor, ein Weihnachtsgruß, also `1990-12` |
| `UAKUG/NIM_168` | fehlende Folios | nur Folios 1 und 2 erfasst | Die Verknüpfungen adressieren Sub-Folios 2_1 bis 2_3. Entweder die Sub-Folios hier anlegen oder in den Verknüpfungen auf 2 vereinheitlichen |

Die Autokonvertierung der Datumsspalte betrifft in der Objekttabelle 156 Zellen. Grundlegend behoben ist sie erst, wenn die Spalte als Text erfasst oder die Objekttabelle wie die Verknüpfungen als CSV ausgeführt wird.

### Jahreszahlen als Konvolut-Titel (2026-09-03)

Drei Konvolute tragen als Titel nur eine Jahresangabe. Im Bestand steht das Datum damit zweimal in der Kopfzeile, einmal als Titel und einmal als Zeitspanne, und ein beschreibender Titel fehlt.

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Zeile 437, `UAKUG/NIM_134` Konvolutzeile | titel | `1949 - / 1950` bei entstehungsdatum `1949-01-01/1950-12-31` | Beschreibenden Titel nach dem Muster der übrigen Konvolute nachtragen |
| Zeile 523, `UAKUG/NIM_135` Konvolutzeile | titel | `1951` bei entstehungsdatum `1950-01-01/1951-12-31` | wie vor |
| Zeile 671, `UAKUG/NIM_136` Konvolutzeile | titel | `1952` bei entstehungsdatum `1951-01-01/1953-12-31` | wie vor |
| Zeile 670, `UAKUG/NIM_135` Folio 20 | entstehungsdatum | `1991` an `Gondroms Festspielmagazin, hg. von Buchhandlung Gondrom Bayreuth 1991` | Prüfen, ob das Objekt in dieses Konvolut gehört oder das Jahr ein Tippfehler ist. Der Konvoluttitel nennt 1951, und die Kopfzeile des Bestands zieht die Spanne dadurch bis 1991 |

## Verknüpfungstabelle (CSV je Box)

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Box 1, `UAKUG/NIM_007` Folio 20 | zielort | `Zürich` am Umschlag an die Deutsche Oper Berlin | Zielort prüfen, er widerspricht dem Titel |
| Box 1, `UAKUG/NIM_007` Folio 16 | rolle | Sophokles trägt `Aufführung` | Sein Werk wurde aufgeführt, nicht er. Auf `Vorlage` oder `Verfasser` setzen |
| Box 1, Signatur `UAKUG/NIM_11` | Signatur | 260 Zeilen mit zweistelliger Konvolutnummer `NIM_11` statt dreistellig `NIM_011` | Die Pipeline gleicht die Schreibung an und ordnet die Zeilen dem Konvolut `NIM_011` zu, es geht nichts verloren. Zur Einheitlichkeit die Signatur an der Quelle auf `UAKUG/NIM_011` korrigieren. Sollte inhaltlich ein anderes Konvolut gemeint sein, bitte melden, dann wäre die Angleichung falsch |
| Box 1, `UAKUG/NIM_11` Folio 7, Tabellenzeile 3424 einschließlich Kopfzeile | Datum (Erstelldatum) | `1055-08-24` | Der Wert steht im ausgelieferten Datensatz als `rico:creationDate` und bleibt zugleich als eigene Quellaussage erhalten. Die Objekttabelle führt separat `rico:date` `1955-08-24`; keiner der Werte überschreibt den anderen. Das Original auf das gemeinte Jahrhundert prüfen und die Verknüpfungszeile nur bei Quellenbeleg korrigieren |
| Box 1, `UAKUG/NIM_11` Folio 7 | rolle | Ausgabe `15,00 DM` trägt `interpret:in` | Eine Finanzrolle eintragen, keine Personenrolle |
| Box 1, `UAKUG/NIM_005` Folio 16 | Datum | `1951-02-29` | 1951 ist kein Schaltjahr, korrektes Datum eintragen |
| Box 1, `UAKUG/NIM_005` Folio 21 | Datum | `1959-31-08` | Tag und Monat vertauscht, auf `1959-08-31` |
| Box 1, `UAKUG/NIM_005` Folio 22 | Datum | `1959-02-30` | Kein 30. Februar, korrektes Datum eintragen |
| Box 1, `UAKUG/NIM_005` Kopfzeile der Tätigkeitslisten (Zeile 875) | Folio | Folio-Wert `1-29`, name `Tätigkeitslisten`; der Spannenwert trifft keinen Objektsatz | An der Quelle prüfen, ob die Zeile eine belegte Sammelaussage oder ein einzelnes Folio beschreibt. Für eine Sammelaussage eine dafür vorgesehene Granularität verwenden; eine einzelne Folio-Nummer nur mit Quellenbeleg vergeben |
| Box 1, `UAKUG/NIM_005` Folio 16 (Teatro Dell Opera Zeile 1119, Stadttheater Zürich Zeile 1126), Folio 18 (Theatre Royal de la Monnaie Zeile 1391) | rolle | Institutionszeilen tragen die Rolle `v` statt eines gültigen Wertes | Der Rollenwert ist abgeschnitten, gemeint ist vermutlich `veranstalter:in`. Ausschreiben, das Dropdown erzwingt sonst keinen gültigen Wert |
| Box 1, `UAKUG/NIM_005` Folio 16 (Solistin Zeile 1174), Folio 18 (Brangäne Zeile 1389), Folio 19 (Venus Zeile 1474) | rolle | Partiezeilen tragen `re` beziehungsweise `r` statt eines gültigen Wertes | Der Rollenwert ist abgeschnitten, gemeint ist vermutlich `repertoire`. Ausschreiben, das Dropdown erzwingt sonst keinen gültigen Wert |
| Box 1, `UAKUG/NIM_005` Folios 16 bis 28 und die Kopfzeile mit Folio `1-29`, Box 5, `UAKUG/NIM_136` | typ | Der Lauf vom 2026-09-01 fand in der neuen NIM_005-Erschließung 228 Zeilen mit Name und Rolle, aber ohne Typ, darunter 226 Bezeichnungen von Dokumentgattungen. Die aktuelle Pipeline erhält eine typfehlende Angabe als neutrale Aussage, wenn Signatur und Folio ein vorhandenes Objekt auflösen. Die Zeile mit Folio `1-29` bleibt wegen ihres verwaisten Zielschlüssels außerhalb des Datensatzes. In NIM_136 (Box 5) bestand der Befund ebenfalls | Den Typ anhand der jeweiligen Quelle ergänzen. Die Pipeline erhält `dokument` als neutralen aufgezeichneten Typ. Eine Ergänzung der Werteliste ist mit der Erfassung abzugleichen. Bei `Brief` auf Folio 16, Zeile 1034, steht `dokument` in der Anmerkungsspalte; weitere Zeilen führen `person`. Vor dem Verschieben oder Ändern prüfen, welchen Typ die jeweilige Angabe beschreibt |
| Box 2, `UAKUG/NIM_016` Folio 13 | werk / anmerkung | Werk `Requiem`, Komponist `Mozart` nur in der Anmerkung | Komponist in eine auswertbare Spalte bringen, sonst bleibt der Titel mehrdeutig |
| Box 5, `UAKUG/NIM_137` | Folio | `15-1` und `15-2` mit Bindestrich; die Objekttabelle schreibt `15_1` und `15_2` mit Unterstrich | Die Pipeline verbindet diese Zeilen deterministisch mit den vorhandenen Unterstrich-Objekten. Die Quellschreibung anhand der realen Folio-Notation prüfen und anschließend vereinheitlichen; aktuell geht dadurch keine Verknüpfung verloren |
| Box 1, `UAKUG/NIM_004` Folio 34, Zeile 867 | typ / name | Typ `ort, datum` mit Wert `06-09`, Rolle erscheinungsdatum, Anmerkung „ohne Jahr" | Die aktuelle Pipeline erhält den vollständigen Wert als neutrale Aussage und erzeugt daraus keinen Ort. An der Quelle prüfen, ob `06-09` einen Datumsrest bezeichnet. Bei bestätigter Datumsbedeutung als reine Datumsangabe mit der belegten Präzision erfassen |
| Box 5, `UAKUG/NIM_137` Folios 15_1 und 15_2 | typ / rolle | Partien stehen einmal als Kompositzeile `rolle, Vorname Nachname Sänger*in`, etwa `Froh, Gerhard Stolze`, und einmal als reine Rollenzeile, etwa `Froh` | Die aktuelle Pipeline erhält beide Quellzeilen als getrennte Aussagen. An der Vorlage prüfen, ob beide Zeilen verschiedene Aussagen tragen oder eine Erfassungsdublette bilden. Eine Zeile erst nach belegter Dublettenentscheidung entfernen |
| mehrere Boxen | Beteiligungskennung | `1.1` statt `1.01` in 26 Zeilen | Zweistellig schreiben, sonst ist Beteiligung 01 nicht von 10 zu unterscheiden |
| Verknüpfungstabelle | Name | `Teatro Colon` ohne Akzent | Der Index führt `Teatro Colón` mit Akzent. Schreibung angleichen, sonst greift die Normdaten-Verknüpfung nicht |
| Verknüpfungstabelle | Ortsname | `bayreuth` (klein) und `Bayeuth` (Tippfehler, Box 5 Zeile 44 im Komposit `Bayeuth, 1951-08-04`) | Auf `Bayreuth` vereinheitlichen. `Bayeuth` steht heute als eigener Eintrag im Ortsregister der Anwendung |

### Werktitel in Kurzform, Dubletten im Werke-Register und fehlende Komponisten (2026-09-04)

Die Verknüpfungstabelle führt ähnliche Werktitel in mehreren Schreibungen, häufig einmal ausgeschrieben und einmal als Kurzform. Jede Schreibung bleibt im Werke-Register als eigene Quellnennung sichtbar. Eine Kurzform ohne eindeutigen Treffer im Werkindex erhält daraus keinen Komponisten und keine Wikidata-Kennung. Der Lauf vom 2026-09-04 zählte 188 Werknamen im damaligen Datensatz, davon 94 ohne Komponisten. Zehn dieser 94 trafen einen Indexeintrag ohne Komponisten, 84 trafen keinen Indexeintrag. Titelähnlichkeit belegt keine Werkidentität. Die folgenden Paare sind Prüfkandidaten für die Redaktion.

Die Kurzformen häufen sich in der Erschließung von `UAKUG/NIM_005` (Box 1, Zeilen 1006 bis 2904) und in einem Zeilenlauf zu `UAKUG/NIM_004` Folio 30 (Box 1, Zeilen 722 bis 738, dort Troubadour, Cosi fan Tutte, Zauberflöte, Tannhäuser, Meistersinger, Walküre). Zwei dieser Zeilen tragen in der Anmerkung `sic!` (Box 1, Zeilen 1280 und 1287), die Kurzform ist dort also bewusst nach dem Wortlaut der Vorlage erfasst.

| Kurzform (Belegstelle) | Ausgeschriebene Form (Belegstelle) | Ist-Wert | Zu prüfen |
|---|---|---|---|
| `Walküre`, 12 Dokumente, Box 1 Zeilen 737, 1273, 1433, Box 5 Zeilen 323, 1372 | `Die Walküre`, 6 Dokumente, Box 1 Zeile 3562, Box 2 Zeilen 44, 71 | zwei Registereinträge, die Kurzform ohne Komponisten | Werkidentität und Quellwortlaut prüfen |
| `Tristan`, 11 Dokumente, Box 1 Zeilen 1280, 1330, 1384 und weitere in NIM_005 | `Tristan und Isolde`, 44 Dokumente, Box 1 Zeilen 208, 248, 496 | wie vor | Werkidentität prüfen; die `sic!`-Schreibung in Zeile 1280 erhalten |
| `Rheingold`, 5 Dokumente, Box 1 Zeilen 1271, 1432, 1587 | `Das Rheingold`, 9 Dokumente, Box 2 Zeilen 24, 43, 70 | wie vor | Werkidentität und Quellwortlaut prüfen |
| `Meistersinger`, 6 Dokumente, Box 1 Zeilen 736, 1287, 1404 | `Die Meistersinger von Nürnberg`, 9 Dokumente, Box 1 Zeilen 349, 2992, 3242 | dazu `Die Meistersinger vin Nürnberg` in Box 5 Zeile 273 | Werkidentität prüfen; die `sic!`-Schreibung in Zeile 1287 erhalten |
| `Rosenkavalier`, 3 Dokumente, Box 1 Zeilen 1755, 1845, 2315 | `Der Rosenkavalier`, 2 Dokumente, Box 1 Zeile 804, Box 5 Zeile 897 | dazu `Der Rosenkawalier` | Werkidentität und mögliche Verschreibung prüfen |
| `Ring des Nibelungen`, 2 Dokumente, Box 1 Zeile 1777, Box 5 Zeile 402 | `Der Ring des Nibelungen`, 7 Dokumente, Box 4 Zeilen 41, 96, 169 | dazu `Der Ring des Niebelungen` | Werkidentität und mögliche Verschreibung prüfen |
| `Zauberflöte`, 2 Dokumente, Box 1 Zeilen 324, 731 | `Die Zauberflöte`, 1 Dokument, Box 1 Zeile 2993 | wie vor | Werkidentität und Quellwortlaut prüfen |
| `Junge Magd`, 1 Dokument, Box 1 Zeile 2627 | `Die junge Magd`, 1 Dokument, Box 1 Zeile 3518 | wie vor | Werkidentität und Quellwortlaut prüfen |
| `Cosi Fan Tutte` und drei weitere Schreibungen, 9 Dokumente, Box 1 Zeilen 326, 730, 1182, Box 2 Zeile 193 | `Così fan tutte`, 1 Dokument, Box 1 Zeilen 3362, 3363 | fünf Registereinträge; nur die Indexform trägt einen Komponisten | Werkidentität, Quellschreibungen und mögliche Verschreibungen prüfen |
| `Stabat Mater` Box 1 Zeile 1695, `Stabat mater` Box 1 Zeilen 859, 3528, 3529 | drei Werke gleichen Titels im Index | zwei Registereinträge, keiner auflösbar | Werkidentität über den jeweiligen Komponisten und die Quelle klären |
| `Elias`, 3 Dokumente, Box 1 Zeilen 1006, 2147, 2383 | `Elias, op. 70, MWV A 25`, 2 Dokumente, Box 1 Zeile 3523, Box 2 Zeile 295 | Kurzform trifft den Indextitel nicht | Werkidentität und Ansetzungsform anhand der Quelle klären |
| `Orpheus`, 2 Dokumente, Box 1 Zeilen 1516, 1727 | `Orpheus und Eurydike`, 5 Dokumente, Box 1 Zeilen 124, 136, 181 | wie vor | Werkidentität und Quellwortlaut prüfen |
| `Troubadour`, 4 Dokumente, Box 1 Zeilen 722, 1233, 1240 | `Der Troubadour`, 2 Dokumente, Box 2 Zeilen 157, 170 | beide Formen fehlen im Werkindex | Werkidentität und Komponist anhand der Quelle klären |
| `Tannhäuser`, 6 Dokumente, Box 1 Zeilen 410, 735, 1118 | Index führt `Tannhäuser und der Sängerkrieg auf Wartburg` | Kurzform trifft den Indextitel nicht | Werkidentität und Quellwortlaut prüfen |
| `Der Wildschütz`, 6 Dokumente, Box 1 Zeilen 3122, 3147, 3172 | Index führt `Der Wildschütz oder Die Stimme der Natur` | wie vor | Werkidentität und Quellwortlaut prüfen |

Ohne Entsprechung im Werkindex stehen daneben unter anderem `Figaro` (5 Dokumente), `IX. Beethoven` (5), `Don Carlos` (3), `Missa Solemnis` (3), `Titus` (3) sowie die Verschreibungen `Fallstaff`, `Lohegerin`, `Parisfal`, `Mozarts Requium`, `Howantschina` und `Bluebarts Castle` neben dem vorhandenen `Herzog Blaubart's Burg`.

Eine explizit erfasste Werkkennung `m3gim_id` kann belegte Identitäten verbinden. Vor jeder Zusammenführung ist zu prüfen, ob Kurzform und Indexform dasselbe Werk bezeichnen und ob der Komponist zur Quellnennung gehört. Bewusste Wiedergaben des Vorlagenwortlauts, darunter die beiden mit `sic!` gekennzeichneten Zeilen, bleiben unverändert erhalten. Eine zusätzliche redaktionelle Ansetzung braucht ein eigenes Feld oder eine explizite Kennung mit Quellenbeleg.

### Weitere Titeldubletten im Werke-Register (2026-09-05)

Zwei Dubletten zeigt das Werke-Register der Anwendung unmittelbar, und bei der ersten liegt die Dublette bereits im Werkindex selbst.

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Werkindex Zeilen 27 und 48 | titel | `die Götterdämmerung` (W125) und `Götterdämmerung` (W40), beide Wagner, beide mit einer Waltraute-Partie | Identität anhand der Indexquelle prüfen. Bei bestätigter Dublette eine Ansetzung festlegen und beide Quellzeugen erhalten. Beide Zeilen tragen bisher keine Wikidata-Kennung |
| Verknüpfungstabelle, `Götterdämmerung` in 13 Zeilen (Box 1 Zeilen 247, 738, 1195 und weitere in NIM_005) gegen `Die Götterdämmerung` in 4 Zeilen (Box 2 Zeilen 72 und 122, Box 5 Zeilen 15 und 407) | name | zwei Schreibungen, die auf zwei Registereinträge laufen | Werkidentität und Quellwortlaut prüfen. Bei bestätigter Identität eine explizite Kennung ergänzen und beide Quellschreibungen erhalten |
| Verknüpfungstabelle, `Herzog Blaubarts Burg` in 8 Zeilen (Box 1 Zeilen 746, 1132, 1316 und weitere, Box 5 Zeile 880) gegen `Herzog Blaubart's Burg` in 3 Zeilen (Box 2 Zeilen 379, 386, 395) | name | zwei Registereinträge; nur die Apostrophform trifft den Werkindex, Zeile 50, W42, Bartók | Werkidentität und Quellwortlaut prüfen. Eine gemeinsame Indexkennung erst nach dieser Prüfung vergeben |

### Adresse als Ort im Ortsregister (2026-09-05)

Die Anwendung baut ihr Ortsregister aus den Ortsnamen der Verknüpfungstabelle. Eine Adresse steht dort deshalb als eigener Ort neben der Stadt, und die Belege verteilen sich auf zwei Einträge.

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Box 1, `UAKUG/NIM_004` Folios 1 und 30 sowie `UAKUG/NIM_007` Folios 9 und 10, Box 2, `UAKUG/NIM_016` mit fünfzehn Zeilen | name | `Zürich, Zürichbergstrasse 104` in 19 Zeilen vom Typ `ort`, in den Rollen zielort, absendeort, empfangsort und erwähnt | Ortsnamen auf `Zürich` setzen und die Adresse in die Anmerkungsspalte nehmen. Eine Adresse ist eine Angabe am Dokument und kein Eintrag des Ortsindex |

### Rollen ohne Werkbezug und abweichende Partienschreibung (2026-09-04)

Bei Objekten mit mehreren Werken stehen Werke und Bühnenrollen als zwei getrennte Zeilenläufe, sodass keine Rolle einem Werk zuzuordnen ist. `UAKUG/NIM_004` Folio 10 führt in Box 1 zwei Werke (Zeilen 247 und 248) und fünfundzwanzig Rollenzeilen (Zeilen 249 bis 273), deren Partien aus vier Opern stammen. `UAKUG/NIM_022` Folio 1_1 führt in Box 2 drei Werke (Zeilen 22 bis 24) und drei Rollen (Zeilen 25 bis 27). Die Rollenspalte nennt nur die Partie der Sängerin und nie die übrige Besetzung, und die Anwendung zeigt solche Rollen deshalb als Chips ohne Werk. Zu tun ist ein Werkbezug je Rollenzeile, etwa über die Beteiligungskennung `datenpunkt_id`, die dafür bereits vorgesehen ist.

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Box 2, `UAKUG/NIM_022` Folio 1_1, Zeile 25, gegen Werkindex Zeile 31 | name | Rollenzeile `Magdalena` zum Werk `Die Meistersinger von Nürnberg`, dessen Indexzeile die Partie `Magdalene` schreibt | Eine Schreibung wählen. Die Verarbeitung gleicht nicht unscharf ab, die Abweichung bleibt als zwei Partien stehen. Der Werkindex führt beide Formen selbst, Zeile 31 `Magdalene` und Zeile 80 `Magdalena` am Kurztitel `Meistersinger` |

### Veranstaltung als Person geführt (2026-09-03)

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Box 1, `UAKUG/NIM_003` Folio 1_1, Zeile 2 | typ / name | Typ `person` für `Sommerkurse Deutsches Musikinstitut für Ausländer`, Rolle `adressat:in` | Der Akteur ist eine Veranstaltung. In den Organisationsindex überführen und den Typ auf `institution` setzen. Solange er im Personenindex steht, erscheint er im Bestand mit dem Personensymbol. Sobald das Modell eine Veranstaltung kennt, gehört er dorthin |

### Verknüpfungszeilen mit dem Typ `Aktivität` (2026-09-03)

Sechs Zeilen tragen den Typ `Aktivität`, ihre Rollenspalte ist leer. Seit E-301 erreichen sie den Datensatz als neutrale Aussagen mit aufgezeichnetem Typ und Wert. Dasselbe gilt für den Typ `dokument`. Eine fachliche Untergliederung oder Bündelung nimmt die Pipeline nicht vor.

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Box 2, `UAKUG/NIM_022` Folio 1_1 Zeile 20 und Folio 3 Zeile 39, `UAKUG/NIM_023` Folio 1_1 Zeile 50, Folio 2 Zeile 288, Folio 4 Zeile 116 und Folio 11 Zeile 210 | typ | `Aktivität` mit den Namen `Bayreuther Festspiele`, `Auftrittsreihe in Neapel`, `Bayreuther Festspiele 1953`, `Rundfunkaufnahme Radio Italiana Rom`, `Engagement Teatro di San Carlo` und `Engagement Theatre Municipale de Lausanne` | Die sechs Angaben sind als neutrale Aussagen erhalten. Für eine strukturierte Nutzung ist anhand der Quelle zu entscheiden, ob sie Aktivitäten, Auftrittsbündel oder einen anderen Gegenstand bezeichnen. Eine Umstellung auf einen bestehenden Typ setzt diese Entscheidung voraus |

### Datum in der Ortsspalte (2026-09-05)

Das Komposit `ort, datum` verlangt getrennt erkennbare Orts- und Datumsbestandteile. Seit E-301 bleibt ein untrennbarer Einzelwert als neutrale Aussage erhalten. Ein Wert, der nur ein Datum enthält, erzeugt keinen Ortsnamen und geht in keine Ortszählung ein. Der jahrlose Fall auf Folio 34 steht bereits oben in der Tabelle, hier folgt der zweite.

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Box 1, `UAKUG/NIM_004` Folio 15, Zeile 408 | typ / name | Typ `ort, datum` mit Wert `1956-11-21`, Rolle erscheinungsdatum | Die aktuelle Pipeline erhält den Wert als neutrale Aussage und erzeugt keinen Ort. An der Quelle prüfen, ob ausschließlich das Datum gemeint ist. Bei Bestätigung auf eine reine Datumszeile umstellen |

### Spielstätten und Regionen als Ort erfasst (2026-09-05)

Der Ortsindex führt Städte. Die Verknüpfungstabelle trägt daneben Spielstätten, Häuser und Regionen im Typ `ort`, und die Anwendung baut ihr Ortsregister aus dieser Spalte. Beide Klassen erscheinen dort deshalb als eigenständige Orte, keine von ihnen löst gegen den Ortsindex auf, und keine trägt Koordinaten, sodass sie auf der Karte in der Sektion „Ohne Kartenpunkt" stehen statt auf ihr. Die Belege verteilen sich zugleich auf zwei Einträge, einmal auf die Stadt und einmal auf das Haus. Der Befund entspricht dem Adressfall `Zürich, Zürichbergstrasse 104` weiter oben.

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Box 1, `UAKUG/NIM_007` Folio 1 (Zeile 2929) | typ / name | `Bayerische Staatsoper` als Typ `ort`, Rolle erwähnt | An der Quelle prüfen, ob Haus, Betrieb oder Ortsangabe gemeint ist. Eine zusätzliche Stadtangabe braucht einen eigenen Quellenbeleg |
| Box 1, `UAKUG/NIM_004` Folio 6 (Zeile 135) | typ / name | `Prinzregententheater` als Typ `ort`, Rolle auffuehrungsort | An der Quelle prüfen, ob Spielstätte und Stadt getrennt erfasst werden können. Box 7 Zeile 15 führt die Form `München, Prinzregententheater`; diese andere Zeile belegt keine Ergänzung für Zeile 135 |
| Box 6, `UAKUG/NIM_142` Folio 28 (Zeile 392) | typ / name | `Theatre de la Monnaie` als Typ `ort`, Rolle Empfang | An der Quelle prüfen, ob Haus, Betrieb oder Ortsangabe gemeint ist. Der Organisationsindex führt `Theatre Royal de la Monnaie`; Namensähnlichkeit allein belegt keine Identität |
| Box 1, `UAKUG/NIM_007` Folio 8 (Zeilen 3013 bis 3019) | typ / name | `Palais Pallavicini`, `Palais Schwarzenberg`, `Palais Auersberg`, `Palais Palffy`, `Palais Lobkowitz`, `Palais Rasumofsky` und `Hofburg` als Typ `ort` | Die Granularität anhand der Quelle prüfen. Gebäudeangaben erhalten; eine zusätzliche Stadtangabe nur mit Quellenbeleg erfassen |
| Box 1, `UAKUG/NIM_004` Folio 9 (Zeile 205) | typ / name | `Italien` als Typ `ort`, Rolle auffuehrungsort | Ein Land ist kein Ort des Ortsindex. Die konkrete Stadt eintragen oder die Angabe in die Anmerkung nehmen |
| Box 7, `UAKUG/NIM_016` Folio 2 (Zeilen 20 und 21) | typ / name | `Südfrankreich` und `Norditalien` als Typ `ort`, Rolle auffuehrungsort, Anmerkung „Erwähntes Sendegebiet der Radiosendung" | Regionen sind keine Orte des Ortsindex. Das Sendegebiet gehört in die Anmerkung, der Ort bleibt der Sendeort |
| Box 1, `UAKUG/NIM_005` Folio 23 (Zeile 2155) | typ / name | `Vertrag` als Typ `ort`, Rolle vertragsort | Kein Ortsname. Zeile korrigieren oder leeren |

### Schreibdublette Ottobeuern und Ottobeuren (2026-09-05)

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Box 1, `UAKUG/NIM_005` Folio 21 (Zeile 1911) und Box 2, `UAKUG/NIM_016` Folio 14 (Zeile 340) | Ortsname | `Ottobeuern` gegen `Ottobeuren` in Box 2 Zeilen 344 und 358 | Auf `Ottobeuren` vereinheitlichen, das ist die Form des Ortsindex. Die beiden Schreibungen stehen heute als zwei Einträge im Ortsregister, und `Ottobeuern` trägt weder Kennung noch Koordinaten |

## Personenindex (`M3GIM-Personenindex.xlsx`)

| Fundstelle | Feld | Ist-Wert | Zu tun |
|---|---|---|---|
| Kopfzeile, Namensspalte **[Kopfzeile]** | Spaltentitel | leer | Kopftitel für die Namensspalte setzen |
| Zeilen 217 und 218 | ganze Zeile | `Malaniuk, Ira` zweimal, Zeile 218 ohne Kennung | Anhand der Indexquelle prüfen, ob beide Zeilen dieselbe Person bezeichnen. Zeile 218 darf P139 und Q94208 nur bei belegter Identität übernehmen |
| Zeilen 436 und 437 | ganze Zeile | `Zimmermann, Erika` zweimal, Zeile 437 ohne Kennung | Identität anhand der Indexquelle prüfen und erst bei bestätigter Dublette zusammenführen |
| (entfallene Zeile) | ganze Zeile | `Zimmermann, Wolfram` fehlt gegenüber dem Vorexport | Prüfen, ob die Streichung beabsichtigt war |
| Zeile 456 | m3gim_id | `Weber, Ludwig` ohne Kennung | Kennung nachtragen, im Vorexport war es P269 |
| Zeilen 226 und 216 | ganze Zeile | `Maykut, Erich` (P146) und `Majkut, Erich` (P138) als zwei Personen | Identität und Namensform anhand der Quelle prüfen. Erst bei bestätigter Identität zusammenführen |
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
| Zeilen 42 und 43 | ganze Zeile | `Musikverein für Steiermark` (O68) und `Musikverein Graz` (O27) | Identität anhand der Indexquelle prüfen und erst bei bestätigter Dublette zusammenführen |
| Zeilen 55 und 73 | ganze Zeile | `Opernhaus Zürich` (O36) und `Stadttheater Zürich` (O49) | Institution, Gebäude und historischen Zeitraum prüfen; nur belegte Identitäten zusammenführen |
| Zeilen 44 und 45 | ganze Zeile | `National Artists Corporation` zweimal (O28, O29) | Identität anhand der Indexquelle prüfen und erst bei bestätigter Dublette zusammenführen |
| (weitere Paare) | ganze Zeile | `Staatsoper Wien` und `Wiener Staatsoper`, `Stadttheater Graz` und `Oper Graz`, `Staatsoper München` und `Bayerische Staatsoper` | Je Paar Institution, Gebäude und historischen Zeitraum prüfen. Nur belegte Identitäten zusammenführen |

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

## Als bearbeitet geführte Objekte ohne Verknüpfung (2026-09-03)

Die Verknüpfung ist die Dokumentbasis der Anwendung. Ein Objekt gilt als verknüpft, sobald es eine der fünf Eigenschaften trägt, die das Frontend zählt, also einen beteiligten Akteur, einen Ort, ein genanntes Thema, eine Anmerkung oder eine Aufführung. Ein Objekt ohne jede davon erscheint in keiner Ansicht, auch dann nicht, wenn sein Bearbeitungsstand `abgeschlossen` oder `begonnen` lautet, und die Erfassung behauptet damit einen Stand, den die Anwendung nicht zeigt.

Die Liste dieser Objekte steht nicht hier, sondern entsteht bei jedem Lauf neu. `tests/test_61_orphan_links.py` führt sie in `test_worked_on_records_carry_a_verknuepfung`, dessen Fehlermeldung die Signaturen mit ihrem Bearbeitungsstand nennt. Sie ist so als Arbeitsliste lesbar und veraltet hier nicht. Der Aufruf ist `pytest tests/test_61_orphan_links.py -m data_quality`.

Zu tun ist je Signatur eine von zwei Entscheidungen, entweder die Verknüpfungen nachtragen oder den Bearbeitungsstand auf `zurueckgestellt` zurücksetzen.

## Strukturelle Formatprüfungen (einmalig, betreffen die Tabellenstruktur)

Diese Punkte betreffen das Tabellenformat, nicht einzelne Fehlwerte. Jeder erledigte Punkt erlaubt den Abbau einer defensiven Sonderbehandlung in der Verarbeitung.

- Saubere Kopfzeilen in Organisations-, Orts- und Werkindex einfügen (heute wird die erste Datenzeile als Kopf gelesen, die vier oben unter [Kopfzeile] genannten Datenwerte gehen dabei verloren). Der Schaden im Ortsindex erzeugt zusätzlich ein Scheinapproval, weil beim Eintrag `Frankfurt` eine Erfassungsnotiz als Wikidata-Spalte gelesen wird; belegt wäre Q1794.
- Namensspalten-Kopfzeile im Personenindex einfügen.
- Bearbeitungsstand als Dropdown mit den kanonischen Werten `abgeschlossen`, `begonnen`, `zurueckgestellt` konfigurieren.
- Datumsangaben mit ihrer belegten Präzision in den unterstützten Formen erfassen, darunter `YYYY`, `YYYY-MM`, `YYYY-MM-DD` und `YYYY/YYYY`. Gemischte Orts- und Datumswerte nach Quellenprüfung in getrennte Aussagen überführen; der ursprüngliche Wortlaut bleibt als Quellwert erhalten.
- Bei Komposit-Einträgen `ort, datum` anhand der Quelle prüfen, welchen Bestandteil die Rolle beschreibt. Eine Datumsrolle nur dann dem Datum zuordnen, wenn diese Bedeutung belegt ist.
- Stabilen Folio-Spaltennamen in der Objekttabelle festlegen (aktuell `folio nr`).
- Sammel-Zeilen anhand der Quelle als Aussagen zum Konvolut oder zu einem einzelnen Folio klassifizieren. Belegte Sammelaussagen erhalten und eine Folio-Nummer nur für ein tatsächlich bezeichnetes Folio vergeben.
- `Beethoven, Ludwig von` im Werkindex auf `van` vereinheitlichen (siehe oben).
- Zellen mit dem Literalwert `Folio` anhand der Quelle auf ihre Granularität prüfen. Eine konkrete Folio-Nummer nur bei vorhandenem Beleg eintragen; Sammelaussagen auf der dafür vorgesehenen Ebene erhalten.
- Eine einheitliche Kopfzeile mit benannter `archivsignatur`-Spalte über alle Box-Blätter, oder die Boxen zu einem Verknüpfungs-Blatt zusammenführen (die Verarbeitung liest sie ohnehin als Einheit).
- Organisations- und Ortsnennungen nach geprüfter Identitätsentscheidung über die Index-Kennung `m3gim_id` führen. Die ausgeschriebene Quellform bleibt erhalten. Eine Kennung verbindet nur belegte Identitäten; gleiche oder ähnliche Namen reichen dafür nicht aus.

## Bereits behoben, nicht mehr zu bearbeiten

- Der Tippfehler `Requium` im Werkindex ist korrigiert, alle Requiem-Zeilen sind sauber geschrieben.
- In Box 5 steht kein Datum mehr in der Folio-Spalte.

## Nicht auf dieser Liste

Fehler des automatischen Wikidata-Abgleichs werden nicht in der Erfassung behoben, sondern in einem Abgleichlauf. Behoben sind dort bereits New York als Stadt statt Bundesstaat, mehrere Personen-Fehlzuordnungen und die nullwertigen Datumsangaben. Offen bleiben dort unter anderem die Granularität bei Perchtoldsdorf und Madrid und Hindemiths Requiem, das auf die liturgische Gattung statt auf das Werk zeigt.
