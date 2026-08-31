# Quell-Diff der M3GIM-Arbeitsmappen

Alt: `old-export`

Neu: `new-export`

Die Verknuepfungstabelle bleibt ausgespart.

## M3GIM-Objekte

Blaetter alt: ['Sheet1']; neu: ['Objekte'].

Blattnamen weichen ab; die Blaetter werden positionell gepaart.

### M3GIM-Objekte / Blatt `Objekte`

Rohkopfzeile alt: `['box_nr', 'archivsignatur', 'folio nr', 'titel', 'entstehungsdatum', 'datierungsevidenz', 'dokumenttyp', 'sprache', 'umfang', 'bearbeiter:in', 'erfassungsdatum', 'Bearbeitungsstand', 'Objekttabelle', 'Verknüpfungstabelle', 'Werkindex', 'Ortsindex', 'Organisationsindex', 'Personenindex']`

Rohkopfzeile neu: `[1, 'archivsignatur', 'folio nr', 'titel', 'entstehungsdatum', 'datierungsevidenz', 'dokumenttyp', 'sprache', 'umfang', 'bearbeiter:in', 'erfassungsdatum', 'Bearbeitungsstand', 'Objekttabelle', 'Verknüpfungstabelle', 'Werkindex', 'Ortsindex', 'Organisationsindex', 'Personenindex']`

Folio-Spalte erkannt alt `folio nr`, neu `folio nr`.
Nicht-textuelle Spaltenkoepfe alt [], neu [1].

Kanonische Spalten alt: `['box_nr', 'archivsignatur', 'folio nr', 'titel', 'entstehungsdatum', 'datierungsevidenz', 'dokumenttyp', 'sprache', 'umfang', 'bearbeiter:in', 'erfassungsdatum', 'bearbeitungsstand', 'objekttabelle', 'verknüpfungstabelle', 'werkindex', 'ortsindex', 'organisationsindex', 'personenindex']`

Kanonische Spalten neu: `[1, 'archivsignatur', 'folio nr', 'titel', 'entstehungsdatum', 'datierungsevidenz', 'dokumenttyp', 'sprache', 'umfang', 'bearbeiter:in', 'erfassungsdatum', 'bearbeitungsstand', 'objekttabelle', 'verknüpfungstabelle', 'werkindex', 'ortsindex', 'organisationsindex', 'personenindex']`

Neue Spalten: [1]. Entfallene Spalten: ['box_nr']. Positionelle Umbenennungen: [('box_nr', 1)].

Zeilen alt 917, neu 1018, Delta +101.

Doppelte Schluessel alt: {'UAKUG/NIM/PL_07': [8, 9], 'UAKUG/NIM_137': [603, 608, 609, 610, 611, 612, 613, 614, 618, 622, 623]}

Doppelte Schluessel neu: {'UAKUG/NIM/PL_07': [8, 9], 'UAKUG/NIM_137': [710, 712, 714, 718, 719]}

Der Zellvergleich nutzt je Schluessel die erste Zeile der Gruppe; bei Dubletten ist er deshalb nur ein Anhaltspunkt.

Neue Zeilen: 107. Entfallene Zeilen: 0.

<details><summary>Neue Schluessel</summary>

- Zeile 725: `11_62`
- Zeile 216: `UAKUG/NIM_016 1`
- Zeile 225: `UAKUG/NIM_016 10`
- Zeile 226: `UAKUG/NIM_016 11`
- Zeile 227: `UAKUG/NIM_016 12`
- Zeile 228: `UAKUG/NIM_016 13`
- Zeile 229: `UAKUG/NIM_016 14`
- Zeile 230: `UAKUG/NIM_016 15`
- Zeile 231: `UAKUG/NIM_016 16`
- Zeile 232: `UAKUG/NIM_016 17`
- Zeile 233: `UAKUG/NIM_016 18`
- Zeile 234: `UAKUG/NIM_016 19`
- Zeile 217: `UAKUG/NIM_016 2`
- Zeile 218: `UAKUG/NIM_016 3`
- Zeile 219: `UAKUG/NIM_016 4`
- Zeile 220: `UAKUG/NIM_016 5`
- Zeile 221: `UAKUG/NIM_016 6`
- Zeile 222: `UAKUG/NIM_016 7`
- Zeile 223: `UAKUG/NIM_016 8`
- Zeile 224: `UAKUG/NIM_016 9`
- Zeile 375: `UAKUG/NIM_073 33_4`
- Zeile 438: `UAKUG/NIM_134 1`
- Zeile 515: `UAKUG/NIM_134 10`
- Zeile 516: `UAKUG/NIM_134 11`
- Zeile 517: `UAKUG/NIM_134 12`
- Zeile 518: `UAKUG/NIM_134 13`
- Zeile 519: `UAKUG/NIM_134 14`
- Zeile 520: `UAKUG/NIM_134 15`
- Zeile 521: `UAKUG/NIM_134 16`
- Zeile 522: `UAKUG/NIM_134 17`
- Zeile 439: `UAKUG/NIM_134 1_1`
- Zeile 448: `UAKUG/NIM_134 1_10`
- Zeile 449: `UAKUG/NIM_134 1_11`
- Zeile 450: `UAKUG/NIM_134 1_12`
- Zeile 440: `UAKUG/NIM_134 1_2`
- Zeile 441: `UAKUG/NIM_134 1_3`
- Zeile 442: `UAKUG/NIM_134 1_4`
- Zeile 443: `UAKUG/NIM_134 1_5`
- Zeile 444: `UAKUG/NIM_134 1_6`
- Zeile 445: `UAKUG/NIM_134 1_7`
- Zeile 446: `UAKUG/NIM_134 1_8`
- Zeile 447: `UAKUG/NIM_134 1_9`
- Zeile 451: `UAKUG/NIM_134 2`
- Zeile 452: `UAKUG/NIM_134 3`
- Zeile 453: `UAKUG/NIM_134 3_1`
- Zeile 462: `UAKUG/NIM_134 3_10`
- Zeile 463: `UAKUG/NIM_134 3_11`
- Zeile 464: `UAKUG/NIM_134 3_12`
- Zeile 454: `UAKUG/NIM_134 3_2`
- Zeile 455: `UAKUG/NIM_134 3_3`
- Zeile 456: `UAKUG/NIM_134 3_4`
- Zeile 457: `UAKUG/NIM_134 3_5`
- Zeile 458: `UAKUG/NIM_134 3_6`
- Zeile 459: `UAKUG/NIM_134 3_7`
- Zeile 460: `UAKUG/NIM_134 3_8`
- Zeile 461: `UAKUG/NIM_134 3_9`
- Zeile 465: `UAKUG/NIM_134 4`
- Zeile 466: `UAKUG/NIM_134 4_1`
- Zeile 475: `UAKUG/NIM_134 4_10`
- Zeile 476: `UAKUG/NIM_134 4_11`
- Zeile 477: `UAKUG/NIM_134 4_12`
- Zeile 478: `UAKUG/NIM_134 4_13`
- Zeile 479: `UAKUG/NIM_134 4_14`
- Zeile 480: `UAKUG/NIM_134 4_15`
- Zeile 481: `UAKUG/NIM_134 4_16`
- Zeile 482: `UAKUG/NIM_134 4_17`
- Zeile 483: `UAKUG/NIM_134 4_18`
- Zeile 484: `UAKUG/NIM_134 4_19`
- Zeile 467: `UAKUG/NIM_134 4_2`
- Zeile 485: `UAKUG/NIM_134 4_20`
- Zeile 486: `UAKUG/NIM_134 4_21`
- Zeile 487: `UAKUG/NIM_134 4_22`
- Zeile 488: `UAKUG/NIM_134 4_23`
- Zeile 489: `UAKUG/NIM_134 4_24`
- Zeile 490: `UAKUG/NIM_134 4_25`
- Zeile 491: `UAKUG/NIM_134 4_26`
- Zeile 492: `UAKUG/NIM_134 4_27`
- Zeile 493: `UAKUG/NIM_134 4_28`
- Zeile 494: `UAKUG/NIM_134 4_29`
- Zeile 468: `UAKUG/NIM_134 4_3`
- Zeile 495: `UAKUG/NIM_134 4_30`
- Zeile 496: `UAKUG/NIM_134 4_31`
- Zeile 497: `UAKUG/NIM_134 4_32`
- Zeile 498: `UAKUG/NIM_134 4_33`
- Zeile 499: `UAKUG/NIM_134 4_34`
- Zeile 500: `UAKUG/NIM_134 4_35`
- Zeile 501: `UAKUG/NIM_134 4_36`
- Zeile 502: `UAKUG/NIM_134 4_37`
- Zeile 503: `UAKUG/NIM_134 4_38`
- Zeile 504: `UAKUG/NIM_134 4_39`
- Zeile 469: `UAKUG/NIM_134 4_4`
- Zeile 505: `UAKUG/NIM_134 4_40`
- Zeile 506: `UAKUG/NIM_134 4_41`
- Zeile 507: `UAKUG/NIM_134 4_42`
- Zeile 508: `UAKUG/NIM_134 4_43`
- Zeile 509: `UAKUG/NIM_134 4_44`
- Zeile 470: `UAKUG/NIM_134 4_5`
- Zeile 471: `UAKUG/NIM_134 4_6`
- Zeile 472: `UAKUG/NIM_134 4_7`
- Zeile 473: `UAKUG/NIM_134 4_8`
- Zeile 474: `UAKUG/NIM_134 4_9`
- Zeile 510: `UAKUG/NIM_134 5`
- Zeile 511: `UAKUG/NIM_134 6`
- Zeile 512: `UAKUG/NIM_134 7`
- Zeile 513: `UAKUG/NIM_134 8`
- Zeile 514: `UAKUG/NIM_134 9`
- Zeile 778: `UAKUG/NIM_138`

</details>

Zeilen mit geaenderten Zellen: 5 von 895 gemeinsamen Schluesseln.

| Spalte | geaenderte Zellen |
|---|---:|
| `entstehungsdatum` | 4 |
| `bearbeiter:in` | 1 |

<details><summary>Geaenderte Zellen</summary>

- `UAKUG/NIM_004 34` (neu Zeile 75), Spalte `entstehungsdatum`: `06-09` -> `2026-09-06`
- `UAKUG/NIM_073 33_2` (neu Zeile 369), Spalte `bearbeiter:in`: `(leer)` -> `QH`
- `UAKUG/NIM_073 5` (neu Zeile 334), Spalte `entstehungsdatum`: `1956-10` -> `1956-10-01`
- `UAKUG/NIM_142 20` (neu Zeile 949), Spalte `entstehungsdatum`: `1954-12` -> `1954-12-01`
- `UAKUG/NIM_168 2` (neu Zeile 1003), Spalte `entstehungsdatum`: `1990-12` -> `1990-12-01`

</details>

**Wertverteilungen**

*bearbeitungsstand*

| bearbeitungsstand | alt | neu | Delta |
|---|---:|---:|---:|
| `(leer)` | 503 | 513 | +10 ** |
| `Zurückgestellt, keine Erwähnung Malaniuks` | 139 | 139 | +0 |
| `erledigt` | 73 | 95 | +22 ** |
| `zurückgestellt, weil keine Erwähnung Malaniuks` | 0 | 64 | +64 ** |
| `zurückgestellt` | 44 | 44 | +0 |
| `vollständig` | 42 | 42 | +0 |
| `begonnen` | 35 | 40 | +5 ** |
| `Zurückgestellt, weil keine Erwähnung Malaniuks` | 34 | 34 | +0 |
| `zurückgestellt, weil keine Erwähnung I.M.` | 17 | 17 | +0 |
| `zurückgestellt, keine Erwähnung Malaniuks` | 10 | 10 | +0 |
| `Vollständig` | 3 | 3 | +0 |
| `Zurückgestellt, Duplikat` | 3 | 3 | +0 |
| `Begonnen` | 2 | 2 | +0 |
| `Erledigt` | 2 | 2 | +0 |
| `zurückgestellt, keine Erwähnung IMs` | 2 | 2 | +0 |
| `Erledigt (Ira Malaniuk betreffend. Rest zurückgestellt)` | 1 | 1 | +0 |
| `Zurückgestellt` | 1 | 1 | +0 |
| `Zurückgestellt aus Zeitmangel` | 1 | 1 | +0 |
| `Zurückgestellt aus Zeitmangel (IM erwähnt)` | 1 | 1 | +0 |
| `Zurückgestellt, unlesbar` | 1 | 1 | +0 |
| `abgeschlossen` | 1 | 1 | +0 |
| `begonnen (nur Ira Malaniuk)` | 1 | 1 | +0 |
| `zurückgestellt, da irrelevant` | 1 | 1 | +0 |

*dokumenttyp*

| dokumenttyp | alt | neu | Delta |
|---|---:|---:|---:|
| `programm` | 234 | 306 | +72 ** |
| `(leer)` | 261 | 270 | +9 ** |
| `presse` | 99 | 100 | +1 ** |
| `korrespondenz` | 66 | 85 | +19 ** |
| `sammlung` | 77 | 77 | +0 |
| `musikzeitschrift` | 38 | 38 | +0 |
| `vertrag` | 31 | 31 | +0 |
| `rezension` | 28 | 28 | +0 |
| `plakat` | 25 | 25 | +0 |
| `Typoskript` | 19 | 19 | +0 |
| `notiz` | 15 | 15 | +0 |
| `quittung` | 8 | 8 | +0 |
| `autobiografie` | 3 | 3 | +0 |
| `identitaetsdokument` | 3 | 3 | +0 |
| `repertoire` | 2 | 2 | +0 |
| `Briefumschlag` | 1 | 1 | +0 |
| `Chronik` | 1 | 1 | +0 |
| `biographie` | 1 | 1 | +0 |
| `photokopie` | 1 | 1 | +0 |
| `repertoireliste` | 1 | 1 | +0 |
| `tontraeger` | 1 | 1 | +0 |
| `verzeichnis` | 1 | 1 | +0 |
| `visitenkarte` | 1 | 1 | +0 |

*sprache*

| sprache | alt | neu | Delta |
|---|---:|---:|---:|
| `(leer)` | 462 | 471 | +9 ** |
| `de` | 353 | 445 | +92 ** |
| `fr` | 65 | 65 | +0 |
| `de, en, fr` | 20 | 20 | +0 |
| `en` | 8 | 8 | +0 |
| `it` | 7 | 7 | +0 |
| `en, fr` | 1 | 1 | +0 |
| `es` | 1 | 1 | +0 |

*datierungsevidenz*

| datierungsevidenz | alt | neu | Delta |
|---|---:|---:|---:|
| `(leer)` | 472 | 482 | +10 ** |
| `aus_dokument` | 358 | 449 | +91 ** |
| `unbekannt` | 84 | 84 | +0 |
| `erschlossen` | 3 | 3 | +0 |

*entstehungsdatum, Formatklassen*

| Format | alt | neu | Delta |
|---|---:|---:|---:|
| `(leer)` | 340 | 350 | +10 ** |
| `YYYY` | 170 | 242 | +72 ** |
| `YYYY-MM-DD` | 191 | 214 | +23 ** |
| `Zeitspanne mit /` | 183 | 183 | +0 |
| `sonstiges Freitext/malformt` | 30 | 29 | -1 ** |
| `YYYY-MM` | 3 | 0 | -3 ** |

## M3GIM-Personenindex

Blaetter alt: ['Personenindex']; neu: ['Personenindex'].

### M3GIM-Personenindex / Blatt `Personenindex`

Rohkopfzeile alt: `['m3gim_id', 'name', 'wikidata_id', 'lebensdaten', 'anmerkung', 'Unnamed: 5']`

Rohkopfzeile neu: `['m3gim_id', 'Unnamed: 1', 'wikidata_id', 'lebensdaten', 'anmerkung', 'Unnamed: 5']`

Header-Shift-Diagnose alt: Zweig (a)/(b): Kopfzeile vorhanden, Spalten werden positionell umbenannt

Header-Shift-Diagnose neu: Zweig (a)/(b): Kopfzeile vorhanden, Spalten werden positionell umbenannt

Kanonische Spalten alt: `['m3gim_id', 'name', 'wikidata_id', 'lebensdaten', 'anmerkung', 'Unnamed: 5']`

Kanonische Spalten neu: `['m3gim_id', 'name', 'wikidata_id', 'lebensdaten', 'anmerkung', 'Unnamed: 5']`

Neue Spalten: keine. Entfallene Spalten: keine. Positionelle Umbenennungen: keine.

Zeilen alt 328, neu 477, Delta +149.

Doppelte Schluessel alt: {'Böhme, Kurt': [26, 27], 'Hartmann, Rudolf': [78, 79], 'Heger, Robert': [81, 82], 'Holm, Richard': [88, 89], 'Moralt, Rudolf': [172, 173], 'Neidlinger, Gustav': [178, 179]}

Doppelte Schluessel neu: {'Appia, Adolphe': [8, 9], 'Böhme, Kurt': [31, 32], 'Eberhardt, Paul': [63, 64], 'Falcon, Bruni': [74, 75, 76], 'Faulhaber, Werner': [77, 78, 79], 'Heger, Robert': [115, 116], 'Hirsch, Robert': [122, 123], 'Holm, Richard': [125, 126], 'Hotter, Hans': [132, 133, 134], 'Keilberth, Joseph': [154, 155], 'Kuën, Paul': [182, 183], 'Litz, Gisela': [199, 200, 201], 'Malaniuk, Ira': [217, 218], 'Moralt, Rudolf': [240, 241], 'Neidlinger, Gustav': [247, 248], 'Orff, Carl': [255, 256], 'Pitz, Wilhelm': [270, 271], 'Plümacher, Hetty': [272, 273, 274], 'Seebohm, Hans-Christopher': [335, 336], 'Stolze, Gerhard': [352, 353], 'Tinel, Paul': [371, 372], 'Uhde, Hermann': [381, 382], 'Varnay, Astrid': [389, 390], 'von Ilosvay, Maria': [397, 398], 'Wagner, Wieland': [405, 406, 407], 'Witte, Erich': [428, 429], 'Zimmermann, Erika': [436, 437]}

Der Zellvergleich nutzt je Schluessel die erste Zeile der Gruppe; bei Dubletten ist er deshalb nur ein Anhaltspunkt.

Neue Zeilen: 131. Entfallene Zeilen: 9.

<details><summary>Neue Schluessel</summary>

- Zeile 4: `Aldenhoff, Bernd`
- Zeile 474: `Anouilh, Jean`
- Zeile 443: `Berg, Hans`
- Zeile 28: `Björling, Sigurd`
- Zeile 34: `Bondeville, Emanuel`
- Zeile 35: `Borkh, Inge`
- Zeile 447: `Borst, Heinz`
- Zeile 38: `Brenner, Eduard`
- Zeile 40: `Bugarinanovic, Melanie`
- Zeile 469: `Czerwenka, Oskar`
- Zeile 442: `Dalberg, Friedrich`
- Zeile 51: `De Sabata, Victor`
- Zeile 52: `Dehler, Thomas`
- Zeile 439: `Deinert, Herbert`
- Zeile 53: `Delacroix, eugène`
- Zeile 470: `Diehl, André`
- Zeile 476: `Ecker, Norbert`
- Zeile 65: `Edelmann, Otto`
- Zeile 66: `Ehard, Hans`
- Zeile 67: `Eisenmenger, Arthur`
- Zeile 441: `Eisenschmidt, Arthur`
- Zeile 69: `Elisabeth, Königin`
- Zeile 74: `Falcon, Bruni`
- Zeile 77: `Faulhaber, Werner`
- Zeile 468: `Fekesa, Jörg`
- Zeile 82: `Ferrein, Giuliano`
- Zeile 84: `Flagstadt, Kirsten`
- Zeile 475: `Friedl, Edith`
- Zeile 86: `Friedland, Brünnhild`
- Zeile 87: `Fues, willi`
- Zeile 90: `Georges Alvès`
- Zeile 95: `Glotz, Michel`
- Zeile 453: `Gruder-Guntram, Hugo`
- Zeile 449: `Hager, Paul`
- Zeile 107: `Handt, Herbert`
- Zeile 109: `Hartmann, Karl Amadeus`
- Zeile 111: `Hartmann, Rudolf Otto`
- Zeile 118: `Herminghaus, A. E.`
- Zeile 121: `Hirsch, Georges`
- Zeile 466: `Hopf, Gertraud`
- Zeile 130: `Hopf, Hans`
- Zeile 137: `Hundhammer, Alois`
- Zeile 142: `Ilosvay, Maria`
- Zeile 444: `Janko, Josef`
- Zeile 457: `Jaumonet, Leopold`
- Zeile 440: `Jorissen, Ingrid`
- Zeile 148: `Karajan, Herbert von`
- Zeile 450: `Kaulbach, Margarete`
- Zeile 158: `Kietz, Ernst Benedikt`
- Zeile 164: `Klomp, M. Z.`
- Zeile 165: `Klose`
- Zeile 166: `Klose, Willi`
- Zeile 461: `Koch, Karl O.`
- Zeile 177: `Krott, Josef`
- Zeile 179: `Kuborn de Gauqier`
- Zeile 451: `Lausch, Eleanor`
- Zeile 194: `Leitner, Ferdinand`
- Zeile 205: `London, George`
- Zeile 208: `Lorenz, Max`
- Zeile 210: `Lubin, Germaine`
- Zeile 211: `Ludwig, Hanna`
- Zeile 473: `Ludwig, Heinz`
- Zeile 213: `Maghini, Ruggero`
- Zeile 220: `Mallarme, Stéphane`
- Zeile 462: `Marszalek, Franz`
- Zeile 464: `Matzerath, Otto`
- Zeile 231: `Messerschmitt, Willy`
- Zeile 445: `Mikorey, Karl`
- Zeile 448: `Mill, Arnold van`
- Zeile 238: `Mittag, Erwin`
- Zeile 460: `Moltkau, Hans`
- Zeile 465: `Müller-Kray, Hans`
- Zeile 244: `Müller-Minervo, Otto`
- Zeile 455: `Nillson, Birgit`
- Zeile 471: `Pernerstorfer, Alois`
- Zeile 263: `Pfeiffer, Anton`
- Zeile 264: `Pfeiffer, Elsa`
- Zeile 268: `Pflanzl, Heinrich`
- Zeile 454: `Piel, Emma`
- Zeile 282: `Rappl, Erich`
- Zeile 283: `Reding, Janine`
- Zeile 287: `Reissinger, Hans C.`
- Zeile 289: `Resnik, Regina`
- Zeile 293: `Rogatchewsky, Joseph`
- Zeile 296: `Rohr, Otto von`
- Zeile 298: `Rollwagen, Hans`
- Zeile 309: `Sattler, Dieter`
- Zeile 317: `Schlüter, Erna`
- Zeile 320: `Schneider, Hugo`
- Zeile 459: `Schröter, Andreas`
- Zeile 324: `Schubert, Erika`
- Zeile 326: `Schubert, Willi`
- Zeile 333: `Schwarzkopf, Elisabeth`
- Zeile 334: `Schwennicke, Fritz`
- Zeile 312: `Schäffer, Fritz`
- Zeile 335: `Seebohm, Hans-Christopher`
- Zeile 337: `Seidel, Hanns`
- Zeile 341: `Siewert, Ruth`
- Zeile 343: `Singer, Joseph`
- Zeile 347: `Sorrell, Ilse`
- Zeile 477: `Stari, Willi`
- Zeile 348: `Steber, Eleanor`
- Zeile 354: `Strachwitz von Gross-Zauche und Camminetz, Hyacinth`
- Zeile 467: `Strauss, Richard Junior`
- Zeile 358: `Streich, Rita`
- Zeile 359: `Strelow, Liselotte`
- Zeile 478: `Sutermeister, Heinrich`
- Zeile 364: `Szemere, László`
- Zeile 308: `Sängerin`
- Zeile 446: `Tandler, Heinz`
- Zeile 368: `Thebom, Blanche`
- Zeile 370: `Thomamüller, Liselotte`
- Zeile 376: `Toscanini, Arturo`
- Zeile 380: `Treptow, Günther`
- Zeile 375: `Töpper, Hertha`
- Zeile 383: `Unger, Gerhard`
- Zeile 387: `Valabrega, Cesare`
- Zeile 396: `Voioumaa, Väinö`
- Zeile 401: `Wagner, Ellen`
- Zeile 402: `Wagner, Gertrud`
- Zeile 408: `Wagner, Wieland Gottfried`
- Zeile 463: `Wienke, Gerhard`
- Zeile 452: `Wild Elfriede`
- Zeile 422: `Wilhelm, Rolf Alexander`
- Zeile 458: `Wirz, Karl Andreas`
- Zeile 428: `Witte, Erich`
- Zeile 427: `Wißner, Otto`
- Zeile 433: `Wylach, G.`
- Zeile 472: `Zallinger, Meinhard von`
- Zeile 438: `[ohne Name] P288`
- Zeile 397: `von Ilosvay, Maria`

</details>

**Entfallene Schluessel**

- alt Zeile 257: `Szemere`
- alt Zeile 307: `Zimmermann, Wolfram`
- alt Zeile 323: `[ohne Name] P304`
- alt Zeile 324: `[ohne Name] P305`
- alt Zeile 325: `[ohne Name] P306`
- alt Zeile 326: `[ohne Name] P307`
- alt Zeile 327: `[ohne Name] P308`
- alt Zeile 328: `[ohne Name] P309`
- alt Zeile 329: `[ohne Name] P310`

Zeilen mit geaenderten Zellen: 8 von 313 gemeinsamen Schluesseln.

| Spalte | geaenderte Zellen |
|---|---:|
| `anmerkung` | 7 |
| `m3gim_id` | 3 |

<details><summary>Geaenderte Zellen</summary>

- `Braun, Hans` (neu Zeile 37), Spalte `anmerkung`: `(leer)` -> `Sänger`
- `Hartmann, Rudolf` (neu Zeile 112), Spalte `m3gim_id`: `P71` -> `P287`
- `Hartmann, Rudolf` (neu Zeile 112), Spalte `anmerkung`: `Opernregie` -> `Bühnenbildner`
- `Hotter, Hans` (neu Zeile 132), Spalte `anmerkung`: `(leer)` -> `Sänger`
- `Kuën, Paul` (neu Zeile 182), Spalte `m3gim_id`: `P115` -> `(leer)`
- `Königin Elisabeth` (neu Zeile 170), Spalte `anmerkung`: `(leer)` -> `Sängerin`
- `Wagner, Wolfgang` (neu Zeile 409), Spalte `anmerkung`: `Festspielleiter Bayreuth, Regisseur` -> `Festspielleiter Bayreuth, Regisseur, Leiter der Bayreuthe Festspiele`
- `Weber, Ludwig` (neu Zeile 456), Spalte `m3gim_id`: `P269` -> `(leer)`
- `Weber, Ludwig` (neu Zeile 456), Spalte `anmerkung`: `Sänger` -> `Sänger:in`
- `Windgassen, Wolfgang` (neu Zeile 424), Spalte `anmerkung`: `Sängerin` -> `Sänger`

</details>

**Wertverteilungen**

| Spalte | gefuellt alt | gefuellt neu |
|---|---:|---:|
| `Unnamed: 5` | 1/328 | 1/477 |
| `anmerkung` | 280/328 | 425/477 |
| `lebensdaten` | 20/328 | 20/477 |
| `m3gim_id` | 327/328 | 325/477 |
| `name` | 321/328 | 476/477 |
| `wikidata_id` | 3/328 | 3/477 |

## M3GIM-Organisationsindex

Blaetter alt: ['Organisationsindex']; neu: ['Organisationsindex'].

### M3GIM-Organisationsindex / Blatt `Organisationsindex`

Rohkopfzeile alt: `['m3gim_id', 'Graz', 'wikidata_id', 'ort', 'Assoziierte Person', 'anmerkung']`

Rohkopfzeile neu: `['m3gim_id', 'Claredon', 'wikidata_id', 'ort', 'Assoziierte Person', 'anmerkung']`

Header-Shift-Diagnose alt: Zweig (a)/(b): Kopfzeile vorhanden, Spalten werden positionell umbenannt; geleakte Kopfwerte: Pos 1 = 'Graz', Pos 4 = 'Assoziierte Person'

Header-Shift-Diagnose neu: Zweig (a)/(b): Kopfzeile vorhanden, Spalten werden positionell umbenannt; geleakte Kopfwerte: Pos 1 = 'Claredon', Pos 4 = 'Assoziierte Person'

Kanonische Spalten alt: `['m3gim_id', 'name', 'wikidata_id', 'ort', 'assoziierte_person', 'anmerkung']`

Kanonische Spalten neu: `['m3gim_id', 'name', 'wikidata_id', 'ort', 'assoziierte_person', 'anmerkung']`

Neue Spalten: keine. Entfallene Spalten: keine. Positionelle Umbenennungen: keine.

Zeilen alt 75, neu 107, Delta +32.

Doppelte Schluessel alt: {'Bayreuther Festspiele': [8, 9], 'National Artists Corporation': [30, 31]}

Doppelte Schluessel neu: {'Bayreuther Festspiele': [9, 10], 'National Artists Corporation': [44, 45]}

Der Zellvergleich nutzt je Schluessel die erste Zeile der Gruppe; bei Dubletten ist er deshalb nur ein Anhaltspunkt.

Neue Zeilen: 34. Entfallene Zeilen: 3.

<details><summary>Neue Schluessel</summary>

- Zeile 8: `Bayreuth (Stadt). Stadtrat`
- Zeile 11: `Bayreuther Ensemble`
- Zeile 12: `Bayreuther Festspielorchester`
- Zeile 13: `Bayrischer Rundfunk`
- Zeile 15: `Chorgemeinschaft Wuppertal`
- Zeile 102: `Columbia Graphophone`
- Zeile 100: `Das Musikleben`
- Zeile 105: `Deutsches Museum von Meisterwerken der Naturwissenschaft und Technik`
- Zeile 99: `Die Presse`
- Zeile 25: `Francesoir`
- Zeile 103: `Grand Hotel Brüssel`
- Zeile 107: `Hessischer Rundfunk`
- Zeile 31: `Le Figaro`
- Zeile 32: `Le Journal du Dimanche`
- Zeile 34: `Le Temps de Paris`
- Zeile 35: `Les Nouvelles Littéraires`
- Zeile 49: `Nordwestdeutscher Rundfunk`
- Zeile 53: `Opéra Garnier`
- Zeile 54: `Opéra national de Paris. Orchestre`
- Zeile 63: `Radio Audizioni Italia (Roma)`
- Zeile 97: `Radio Audizioni Italia. Coro di Torino`
- Zeile 104: `Radio Monte Carlo`
- Zeile 98: `Radiotelevisione italiana`
- Zeile 68: `Schweizerische Verrechnungsstelle`
- Zeile 71: `Stadthalle Wuppertal-Elberfeld`
- Zeile 78: `Syndicat d'Initiative de la ville de Bruxelles`
- Zeile 106: `Süddeutscher Rundfunk`
- Zeile 79: `Teatro alla Scala`
- Zeile 101: `Teldec`
- Zeile 84: `Theatre Royal de la Monnaie`
- Zeile 82: `Théâtre municipal de Lausanne`
- Zeile 87: `Viva musica`
- Zeile 88: `Volksbühne Wuppertal`
- Zeile 95: `Wuppertaler Konzertdirektion G. Wylach`

</details>

**Entfallene Schluessel**

- alt Zeile 74: `[ohne Name] O72`
- alt Zeile 75: `[ohne Name] O73`
- alt Zeile 76: `[ohne Name] O74`

Zeilen mit geaenderten Zellen: 1 von 70 gemeinsamen Schluesseln.

| Spalte | geaenderte Zellen |
|---|---:|
| `ort` | 1 |

<details><summary>Geaenderte Zellen</summary>

- `Teatro di San Carlo` (neu Zeile 81), Spalte `ort`: `(leer)` -> `Neapel`

</details>

**Wertverteilungen**

| Spalte | gefuellt alt | gefuellt neu |
|---|---:|---:|
| `anmerkung` | 18/75 | 27/107 |
| `assoziierte_person` | 19/75 | 26/107 |
| `m3gim_id` | 75/75 | 80/107 |
| `name` | 72/75 | 106/107 |
| `ort` | 46/75 | 73/107 |
| `wikidata_id` | 5/75 | 5/107 |

## M3GIM-Ortsindex

Blaetter alt: ['Ortsindex']; neu: ['Ortsindex'].

### M3GIM-Ortsindex / Blatt `Ortsindex`

Rohkopfzeile alt: `['Unnamed: 0', 'name', 'Bei Erfassung hinzugefügt ']`

Rohkopfzeile neu: `['Turin', 'name', 'Bei Erfassung hinzugefügt ']`

Header-Shift-Diagnose alt: KEIN Zweig greift: Pos 0 = 'Unnamed: 0' ist nicht 'm3gim_id', Pos 1 = 'name' steht auf der Ausnahmeliste. Spalten bleiben roh, kanonische Spalten fehlen damit im DataFrame.

Header-Shift-Diagnose neu: KEIN Zweig greift: Pos 0 = 'Turin' ist nicht 'm3gim_id', Pos 1 = 'name' steht auf der Ausnahmeliste. Spalten bleiben roh, kanonische Spalten fehlen damit im DataFrame.

Kanonische Spalten alt: `['Unnamed: 0', 'name', 'Bei Erfassung hinzugefügt ']`

Kanonische Spalten neu: `['Turin', 'name', 'Bei Erfassung hinzugefügt ']`

Neue Spalten: ['Turin']. Entfallene Spalten: ['Unnamed: 0']. Positionelle Umbenennungen: [('Unnamed: 0', 'Turin')].

Zeilen alt 32, neu 40, Delta +8.

Doppelte Schluessel alt: {'Stuttgart': [27, 28]}

Doppelte Schluessel neu: {'Stuttgart': [27, 28]}

Der Zellvergleich nutzt je Schluessel die erste Zeile der Gruppe; bei Dubletten ist er deshalb nur ein Anhaltspunkt.

Neue Zeilen: 7. Entfallene Zeilen: 0.

<details><summary>Neue Schluessel</summary>

- Zeile 36: `Belgrad`
- Zeile 38: `Brüssel`
- Zeile 35: `Dresden`
- Zeile 37: `Düsseldorf`
- Zeile 41: `Ottobeuren`
- Zeile 40: `Turin`
- Zeile 34: `Wuppertal`

</details>

Zeilen mit geaenderten Zellen: 0 von 31 gemeinsamen Schluesseln.

**Wertverteilungen**

| Spalte | gefuellt alt | gefuellt neu |
|---|---:|---:|
| `Bei Erfassung hinzugefügt ` | 1/32 | 1/40 |
| `Turin` | 0/32 | 33/40 |
| `Unnamed: 0` | 32/32 | 0/40 |
| `name` | 32/32 | 39/40 |

## M3GIM-Werkindex

Blaetter alt: ['Werkindex']; neu: ['Werkindex'].

### M3GIM-Werkindex / Blatt `Werkindex`

Rohkopfzeile alt: `['m3gim_id', 'Rossini, Gioachino', 'wikidata_id', 'Barber, Samuel', 'rolle/stimme', 'anmerkung']`

Rohkopfzeile neu: `['m3gim_id', 'Rossini, Gioachino', 'wikidata_id', 'Barber, Samuel', 'rolle/stimme', 'anmerkung']`

Header-Shift-Diagnose alt: Zweig (a)/(b): Kopfzeile vorhanden, Spalten werden positionell umbenannt; geleakte Kopfwerte: Pos 1 = 'Rossini, Gioachino', Pos 3 = 'Barber, Samuel', Pos 4 = 'rolle/stimme'

Header-Shift-Diagnose neu: Zweig (a)/(b): Kopfzeile vorhanden, Spalten werden positionell umbenannt; geleakte Kopfwerte: Pos 1 = 'Rossini, Gioachino', Pos 3 = 'Barber, Samuel', Pos 4 = 'rolle/stimme'

Kanonische Spalten alt: `['m3gim_id', 'name', 'wikidata_id', 'komponist', 'rolle_stimme', 'anmerkung']`

Kanonische Spalten neu: `['m3gim_id', 'name', 'wikidata_id', 'komponist', 'rolle_stimme', 'anmerkung']`

Neue Spalten: keine. Entfallene Spalten: keine. Positionelle Umbenennungen: keine.

Zeilen alt 137, neu 138, Delta +1.

Doppelte Schluessel alt: {'Die Meistersinger von Nürnberg': [24, 25], 'Sinfonien, Nr. 9, op. 125 (d-Moll)': [79, 100], 'Stabat mater': [81, 121, 122], 'Requiem': [114, 125], 'Litaniae lauretanae KV 195': [119, 120]}

Doppelte Schluessel neu: {'Litaniae lauretanae KV 195': [72, 73], 'Requiem': [101, 102, 103], 'Sinfonien, Nr. 9, op. 125 (d-Moll)': [109, 110], 'Stabat mater': [112, 113, 114]}

Der Zellvergleich nutzt je Schluessel die erste Zeile der Gruppe; bei Dubletten ist er deshalb nur ein Anhaltspunkt.

Neue Zeilen: 10. Entfallene Zeilen: 9.

<details><summary>Neue Schluessel</summary>

- Zeile 4: `9. Symphonie`
- Zeile 20: `Das Rheingold`
- Zeile 24: `Der Ring des Nibelungen`
- Zeile 133: `Die Favoritin`
- Zeile 134: `Die schwarze Spinne`
- Zeile 67: `Les Noces`
- Zeile 70: `Lieder von der Erde`
- Zeile 80: `Meistersinger`
- Zeile 131: `Sampiero Corso`
- Zeile 132: `Siegfried`

</details>

**Entfallene Schluessel**

- alt Zeile 98: `Requium`
- alt Zeile 127: `[ohne Name] W126`
- alt Zeile 128: `[ohne Name] W127`
- alt Zeile 129: `[ohne Name] W128`
- alt Zeile 130: `[ohne Name] W129`
- alt Zeile 131: `[ohne Name] W130`
- alt Zeile 132: `[ohne Name] W131`
- alt Zeile 133: `[ohne Name] W132`
- alt Zeile 134: `[ohne Name] W133`

Zeilen mit geaenderten Zellen: 5 von 122 gemeinsamen Schluesseln.

| Spalte | geaenderte Zellen |
|---|---:|
| `rolle_stimme` | 3 |
| `komponist` | 3 |
| `m3gim_id` | 2 |
| `wikidata_id` | 1 |

<details><summary>Geaenderte Zellen</summary>

- `Die Meistersinger von Nürnberg` (neu Zeile 31), Spalte `wikidata_id`: `(leer)` -> `Q190891`
- `Die Walküre` (neu Zeile 32), Spalte `rolle_stimme`: `(leer)` -> `Fricka`
- `Herzog Blaubart's Burg` (neu Zeile 50), Spalte `komponist`: `(leer)` -> `Bartók, Béla`
- `Sinfonien, Nr. 9, op. 125 (d-Moll)` (neu Zeile 109), Spalte `m3gim_id`: `W78` -> `W99`
- `Sinfonien, Nr. 9, op. 125 (d-Moll)` (neu Zeile 109), Spalte `komponist`: `Beethoven, Ludwig von` -> `Beethoven, Ludwig van`
- `Sinfonien, Nr. 9, op. 125 (d-Moll)` (neu Zeile 109), Spalte `rolle_stimme`: `Alt-Solo` -> `Altsolo`
- `Stabat mater` (neu Zeile 112), Spalte `m3gim_id`: `W80` -> `W120`
- `Stabat mater` (neu Zeile 112), Spalte `komponist`: `(leer)` -> `Pergolesi, Giovanni Battista`
- `Stabat mater` (neu Zeile 112), Spalte `rolle_stimme`: `(leer)` -> `Altsolo`

</details>

**Wertverteilungen**

| Spalte | gefuellt alt | gefuellt neu |
|---|---:|---:|
| `anmerkung` | 30/137 | 29/138 |
| `komponist` | 116/137 | 124/138 |
| `m3gim_id` | 137/137 | 136/138 |
| `name` | 124/137 | 133/138 |
| `rolle_stimme` | 63/137 | 67/138 |
| `wikidata_id` | 4/137 | 4/138 |

*rolle_stimme*

| rolle_stimme | alt | neu | Delta |
|---|---:|---:|---:|
| `(leer)` | 74 | 71 | -3 ** |
| `Altsolo` | 26 | 26 | +0 |
| `Alt-Solo` | 3 | 3 | +0 |
| `Fricka` | 0 | 2 | +2 ** |
| `Lady Macbeth` | 2 | 2 | +0 |
| `Magdalena` | 1 | 2 | +1 ** |
| `Adelaide` | 1 | 1 | +0 |
| `Amneris` | 1 | 1 | +0 |
| `Aufseherin` | 1 | 1 | +0 |
| `Azucena` | 1 | 1 | +0 |
| `Brangäne` | 1 | 1 | +0 |
| `Carmen` | 1 | 1 | +0 |
| `Dorabella` | 1 | 1 | +0 |
| `Engel` | 1 | 1 | +0 |
| `Fricka, Waltraute` | 0 | 1 | +1 ** |
| `Gaea` | 1 | 1 | +0 |
| `Hausfrau` | 1 | 1 | +0 |
| `Judith` | 1 | 1 | +0 |
| `Kabanicha` | 1 | 1 | +0 |
| `Maddalena` | 1 | 1 | +0 |
| `Magdalene` | 1 | 1 | +0 |
| `Marfa` | 1 | 1 | +0 |
| `Marina` | 1 | 1 | +0 |
| `Octavian` | 1 | 1 | +0 |
| `Olga und Filipjewna` | 1 | 1 | +0 |
| `Orpheus` | 1 | 1 | +0 |
| `Ortrud` | 1 | 1 | +0 |
| `Quickly und Meg` | 1 | 1 | +0 |
| `Salome` | 1 | 1 | +0 |
| `Sextus (Hosenrolle)` | 1 | 1 | +0 |
| `Suzuki` | 1 | 1 | +0 |
| `Ulrika` | 1 | 1 | +0 |
| `Venus` | 1 | 1 | +0 |
| `Waltraute` | 1 | 1 | +0 |
| `Waltraute/Zweite Norn` | 1 | 1 | +0 |
| `Zweite Dame` | 1 | 1 | +0 |
| `keine Rollenangabe` | 1 | 1 | +0 |
| `ohne Angabe` | 1 | 1 | +0 |
