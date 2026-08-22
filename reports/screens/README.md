# Screenshot-Spur

Prüfbare visuelle Belege der Frontend-Arbeit, damit der Stand ohne eigenen Lauf gesichtet werden kann. Dieses Verzeichnis hält die Bilder und sagt zu jedem, was es zeigt und ob der abgebildete Zustand in der heutigen Oberfläche noch erreichbar ist.

Die Konvention der Spur (Erzeugung headless über Playwright, Serverport, Dateinamensmuster, Vorrang der DOM-Lesung vor der Bildlesung) ist nach [`knowledge/testing.md`](../../knowledge/testing.md) § Screenshot-Spur und Sichtprüfung umgezogen und steht dort.

Geprüft am 2026-08-22 gegen [`knowledge/architecture-decisions.md`](../../knowledge/architecture-decisions.md) und den Frontend-Code unter `docs/js/`.

## 2026-06-21 Mobilitätskarte geschärft (E-114, Milestone-Runde)

Vier Bilder der biografischen Trajektorienkarte. E-126 hat diese Karte am 2026-06-24 durch die entitätszentrierte Sicht ersetzt und dabei die Verbindungslinien, den Zeitregler mit Abspielen und den Off-Map-Knopf entfernt. Der abgebildete Zustand ist damit vollständig abgelöst.

| Datei | Zeigt | Zustand heute |
|---|---|---|
| `2026-06-21-mobility-base.png` | Basisansicht. Label-Ausdünnung beschriftet nur die Hauptstationen (Wien, München, Zürich), der Rest bleibt entzerrt bis Hover oder Zoom. Im Detailstreifen der neue Knopf „3 abseits der Karte". | nicht mehr erreichbar (E-126) |
| `2026-06-21-mobility-tooltip.png` | Knoten-Tooltip beim Überfahren von Wien: dominante Sicht (Performativ), Ereigniszahl (21), Zeitspanne (1956–1968). | nicht mehr erreichbar (E-126) |
| `2026-06-21-mobility-offmap.png` | Off-Map-Panel. New York wird ehrlich als außerhalb des Kartenausschnitts projiziert ausgewiesen, mit Verweis auf den Koordinaten-Fehlmatch AF-01, statt off-canvas auszulaufen. | nicht mehr erreichbar (E-126) |
| `2026-06-21-mobility-zoom.png` | In den Cluster gezoomt. Mehr Stationen werden sichtbar beschriftet (Salzburg, Stuttgart, Bayreuth, Paris), Font und Umriss bleiben gegen den Zoom bildschirmkonstant. | nicht mehr erreichbar (E-126) |

## 2026-06-21 Bestand-Vollanzeige (E-116)

| Datei | Zeigt | Zustand heute |
|---|---|---|
| `2026-06-21-2159-bestand-erschlossen.png` | Bestand im Default „nur erschlossen". Der Toolbar-Toggle „Nicht erschlossene einblenden" ist ungesetzt, der Count nennt die bearbeiteten Einheiten. | erreichbar; der Toggle steht unverändert in `_toolbar.js` und `archive-holdings.js` |
| `2026-06-21-2159-bestand-alle.png` | Derselbe Tab mit gesetztem Toggle. Unerschlossene Zeilen erscheinen ausgegraut mit dem Badge „nicht erschlossen", daneben der Zurücksetzen-Knopf, der Count nennt beide Teilmengen. | erreichbar |

Zwei Einschränkungen gelten für beide Bilder. Die Tab-Leiste zeigt den Stand vor der Umbenennung, sie führt „Mobilität" und weder „Karte" noch „Verknüpfungen". Und die Datumsspanne des Kritiken-Konvoluts reicht im Bild bis 2026, das ist das Zukunftsdatum QF-01, das der Datenstand seit dem Pipeline-Lauf vom 2026-06-22 nicht mehr trägt.

## 2026-06-22 Demo-Reihe nach dem Pipeline-Lauf

Vier Bilder ohne Datum im Dateinamen, entstanden nach der Signatur-Normalisierung und dem Leerzeilen-Filter in `transform.py`.

| Datei | Zeigt | Zustand heute |
|---|---|---|
| `demo-bestand-default.png` | Bestand im Default „nur erschlossen" am bereinigten Datenstand, Konvolute mit Typ-Chips und Bearbeitungsstand. | erreichbar; die Tab-Leiste des Bildes ist es nicht |
| `demo-bestand-alle.png` | Derselbe Tab mit eingeblendeten unerschlossenen Einheiten, jede mit Badge und ausgegrauter Zeile. | erreichbar; die Tab-Leiste des Bildes ist es nicht |
| `demo-chronik.png` | Chronik als reiner Jahres-Zeitstrahl. Records hängen als Chips an der Jahreszeile, Ort und Typ stehen im Chip, die Achse trägt keinen Kopf. | nicht mehr erreichbar (E-124); die Chronik führt heute eine Deckungs-Caption, einen kollabierbaren Dekaden-Sicht-Header und sicht-gefärbte Chips |
| `demo-statistik.png` | Statistik als durchlaufende Seite mit gestapelten Sektionen, oben der Dokumenttypen-Donut, darunter die Balken der Mobilitätssichten mit den analytischen Labels Performativ, Institutionell, Diskursiv. | nicht mehr erreichbar; die Statistik führt heute eine Sidebar mit wählbaren Ansichten (`SECTIONS` in `statistics.js`), und die Sicht-Labels heißen projektweit Auftritt, Engagement, Rezeption (E-126) |

## 2026-06-24 Entitätszentrierte Karte (E-126)

| Datei | Zeigt | Zustand heute |
|---|---|---|
| `2026-06-24-karte-pie-zoom.png` | Zwischenstand der Umbaurunde. Die Knoten sind bereits Tortendiagramme nach Mobilitätssicht, die Sidebar trägt aber noch die Ansicht-Knöpfe (Europa, Österreich, Deutschland, Alle Punkte), einen zweizeiligen Von-Bis-Regler und eine Zeile mit der vollen Belegzählung. | nicht mehr erreichbar; E-126 hat genau diese Bedienelemente entfernt und den Zeitraum auf einen Zwei-Daumen-Regler auf einer Linie gezogen |
| `2026-06-24-karte-klick-detail.png` | Knoten-Klick auf Bayreuth bei gewählter Entität. Hover-Tooltip mit Proportionsbalken über der Karte, in der Sidebar das Klick-Detail mit Sicht-Balken, Sicht-Zeilen und der Dokumentenzahl. | erreichbar; die Sidebar des Bildes führt die Verortungs-Legende noch nicht, die heute fest zwischen Farbschlüssel und Detailbereich steht |
| `2026-06-24-karte-zoom-ring.png` | Tief in einen Ort gezoomt. Der Knotenring bleibt durch `non-scaling-stroke` bildschirmkonstant, statt mit dem Zoom mitzuwachsen. | erreichbar; dieselbe Einschränkung zur Verortungs-Legende |
| `2026-06-24-karte-entitaet-bayreuth.png` | Entitäts-Filter in Aktion. „Bayreuther Festspiele" ist gewählt, die Knotenmenge schrumpft auf deren Orte, in der Sidebar steht der Knopf zum Lösen der Auswahl. Das ist derselbe Schnitt, den der Smoke-Canary `karte:render` prüft. | erreichbar; dieselbe Einschränkung zur Verortungs-Legende |
| `2026-06-24-karte-verortung.png` | Default „Alle Entitäten" mit der vollständigen Sidebar. Verortungs-Legende (gesichert, stadtgenau, weit prüfen) und darunter die eingeklappte Liste der Orte ohne Koordinate. | erreichbar, entspricht dem heutigen Aufbau der Karten-Sidebar |

## Beitexte und Werkzeug

| Datei | Zeigt | Zustand heute |
|---|---|---|
| `verknuepfungen-m3.md` | Textspur statt Bild. Browser-Verifikation des Verknüpfungen-Tabs vom 2026-06-23 mit Konsolen-Stempel, Bayreuth als reines Filterergebnis und den M1-Daten im Detail-Panel. | erreichbar; die protokollierten Stempel-Schlüssel stimmen mit dem heutigen `logStamp('verknuepfungen', …)` überein, der abweichende Serverport 8000 ist der Ad-hoc-Lauf jener Sitzung |
| `_show_alldata.py` | Ad-hoc-Playwright-Skript, das die beiden `demo-bestand-*`-Bilder erzeugt und die Store-Datenlage nach Dokumenttyp ausgibt. Fährt gegen `http://localhost:8765/`. | lauffähig; die benutzten Selektoren (`.archiv-toggle__input`, `.archiv-count`) stehen unverändert im Frontend |
| `README.md` | Diese Datei, das Verzeichnis der Spur. | keine Zustandsfrage |

## Überholte Bilder

Diese Bilder zeigen einen Zustand, der in der heutigen Oberfläche nicht mehr erreichbar ist. Sie bleiben vorerst liegen, die Löschung läuft zentral.

- `2026-06-21-mobility-base.png`
- `2026-06-21-mobility-tooltip.png`
- `2026-06-21-mobility-offmap.png`
- `2026-06-21-mobility-zoom.png`
- `2026-06-24-karte-pie-zoom.png`
- `demo-chronik.png`
- `demo-statistik.png`
