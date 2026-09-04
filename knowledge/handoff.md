---
title: Handoff
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: active
created: 2026-08-21
updated: 2026-09-04
language: de
version: 0.5
authors: [Christopher Pollin]
generated-with: Claude Code
related: [INDEX, journal, specification]
---

# Handoff

Diese Process Inbox führt ausschließlich offene Übergabepunkte. Prüfe vor der Nutzung die Quelle und das aktuelle Ziel. Integriere dauerhaften Inhalt in das zuständige Dokument, dokumentiere Gegenstand, Quelle, Ziel und Ergebnis oder Verwerfungsgrund knapp in [journal.md](journal.md) und entferne den bearbeiteten Punkt anschließend vollständig.

## Offene Handoff-Punkte

### An die Backend-Lane: als bearbeitet geführte Objekte ohne Verknüpfung (2026-09-03)

Seit E-165 ist die Verknüpfung die Dokumentbasis des Frontends, und der Datenspiegel führt in `tests/test_61_orphan_links.py` neu die Objekte auf, die als abgeschlossen oder begonnen gelten, aber keine einzige Verknüpfung tragen und deshalb in keiner Ansicht erscheinen; die Fehlermeldung des Tests ist die Liste ihrer Signaturen für das Erschließungsteam, das entweder die Verknüpfungen nachträgt oder den Bearbeitungsstand zurückstellt.

### An das Erschließungsteam: Verknüpfungszeilen mit unbekanntem Typ (2026-09-03)

Die neue Verwurfsaufstellung des Transformationslaufs hat einen bis dahin unsichtbaren Befund freigelegt. Ein knappes Dutzend Signaturen führt Zeilen mit den Typwerten `dokument` und `aktivität`, die die Pipeline nicht abbildet. Sie erreichen den Datensatz nicht. Zu entscheiden ist, ob die Typen in das Modell aufgenommen werden oder ob die Zeilen quellseitig auf einen bestehenden Typ umzustellen sind. Für `dokument` steht der Punkt bereits als Erfassungsfehler in der [Partner-Übergabeliste](../data/reports/source-errors-handover-2026-09-01.md), `aktivität` ist neu.

### An die Frontend-Lane: offene Punkte nach der Durchsicht vom 2026-09-03

Die Fix- und Umbauliste der Durchsicht vom 2026-09-03 und der beiden abendlichen Runden ist gebaut; ihr Ergebnis führt [journal.md](journal.md) als Session 78 mit den Entscheidungen E-185 bis E-204. Erledigt sind darunter auch die Ersetzung der sechs verbliebenen Farb-Aliasse durch die Akzent- und Flächen-Tokens (E-202) und der Rückbau der Sortierung, die Tabelle steht in Signaturfolge (E-203). Der Tagesstand ist als d40fe9f committet, das erste Konvolut öffnet beim ungefilterten Laden (E-206), die doppelten Partien sind in der Pipeline zusammengeführt (E-205), das Inline-Detail ist als Auftrittssicht gebaut (E-213). Aus dieser Liste ist nichts mehr offen.

Weiter offen aus [specification.md](specification.md) § Stand, nicht Teil dieser Durchsicht: Entscheidungen 8 (Detail-Panel neben Visualisierungen), 11 (Lade- und Fehlerzustand aus Tokens), Karte mit Werk als Entität, Export JSON-LD und GEXF, `dataQualityFlag` an den Record-Ebenen.

### An die Projektleitung: drei Entscheidungen aus dem Abschlussdurchgang (2026-09-04)

1. Die Provenienzpille am Chip nennt seit E-221 im Label und im Tooltip Blatt, Zeile und Datenpunkt und löst keinen Klick mehr aus. Regel 5 in [design.md](design.md) beschreibt jetzt diesen Stand und verweist für die offene Frage hierher. Zu entscheiden bleibt, ob ein Sprung in das Blatt gebaut wird oder die Pille bei der Anzeige bleibt.
2. Die Voreinstellung des Bestands auf abgeschlossen und begonnen blendet die zurückgestellten und die Objekte ohne Bearbeitungsstand aus; vorgeschlagen ist ein Start ohne Stand-Filter und ein Tooltip je Stand-Option, dessen vier Definitionen das Erschließungsteam bestätigt.
3. Das KUG-Logo im Fuß stammt aus dem Pressebereich der KUG; die Nutzung auf der Projektseite ist mit der KUG zu bestätigen.

### An das Erschließungsteam: Rollen ohne Werkbezug und abweichende Partienschreibung (2026-09-04)

Die Verknüpfungstabelle führt bei Objekten mit mehreren Werken die Werke und die Bühnenrollen als zwei getrennte Zeilenläufe, sodass eine Rolle keinem Werk zuzuordnen ist; `sungPart` nennt nur die eigene Partie der Sängerin, nie die Besetzung. Das Detail zeigt solche Rollen als freie Chips (E-213). Beispiel ist UAKUG/NIM_004 10 mit zwei Werken und fünfundzwanzig Rollen aus vier Opern. Ein Werkbezug je Rollenzeile, etwa über die geplante `datenpunkt_id`, würde die Zuordnung tragen. Zusatzbefund: UAKUG/NIM_022 1_1 schreibt die Partie am Werk als Magdalene und in der Rollenzeile als Magdalena; die Pipeline gleicht nicht unscharf ab, die Abweichung bleibt sichtbar.

### An das Erschließungsteam: Werktitel in Kurzform und Werke ohne Komponisten (2026-09-04)

Dieselbe Oper steht in der Verknüpfungstabelle unter mehreren Titeln, ausgeschrieben mit Artikel und als Kurzform ohne, etwa `Die Walküre` neben `Walküre` und `Tristan und Isolde` neben `Tristan`. Die Anwendung gleicht nicht unscharf ab, deshalb steht jede Schreibung als eigener Eintrag im Werke-Register, und die Kurzform trifft den Werkindex nicht, bleibt also ohne Komponisten. Von 188 Werknamen des Datenstands tragen 94 keinen Komponisten, 84 davon, weil der Name keinen Indexeintrag auflöst. Die Fundstellen mit Signaturen und Zeilen stehen als eigener Punkt in der [Partner-Übergabeliste](../data/reports/source-errors-handover-2026-09-01.md). Zu entscheiden ist dort auch, ob die Werknennung künftig über die Werkkennung des Index statt über den Titel läuft.

### An das Erschließungsteam: Veranstaltung als Person geführt (2026-09-03)

Der Akteur „Sommerkurse Deutsches Musikinstitut für Ausländer" an UAKUG/NIM_003 1_1 trägt im Datensatz den Typ Person, weil er im Personenindex steht. Im Bestand erscheint er deshalb mit dem Personenpunkt. Er gehört in den Organisationsindex oder, sobald das Modell sie kennt, in eine Veranstaltung. Der Fall ist ein Beispiel; ein Datenspiegel-Test, der Indexeinträge mit Veranstaltungswörtern im Personenindex auflistet, steht noch aus.

### An das Erschließungsteam: Jahreszahlen als Konvolut-Titel (2026-09-03)

Zusatzbefund: UAKUG/NIM_135 trägt den Titel „1951", enthält aber unter Folio 20 ein Festspielmagazin von 1991, sodass die Kopfzeile die Spanne 1950–1991 zeigt. Zu prüfen ist, ob das Objekt in dieses Konvolut gehört oder das Jahr ein Tippfehler ist.

Die Konvolute UAKUG/NIM_134, NIM_135 und NIM_136 tragen als Titel nur Jahresangaben („1949 - / 1950", „1951", „1952"). Im Bestand steht damit das Datum zweimal in der Kopfzeile und ein Titel fehlt. Ein beschreibender Titel nach dem Muster der übrigen Konvolute wäre nachzutragen.

### An eine Vault-Session: Prozesswissen in das Promptotyping-Methodendokument übernehmen (2026-09-03)

Der folgende Abschnitt stand bis zum 2026-09-03 im Entscheidungsregister von [journal.md](journal.md). Er beschreibt die Arbeitsweise, nicht dieses Projekt, und gehört damit in das Promptotyping-Methodendokument im Obsidian-Vault. Eine im Vault gestartete Session übernimmt ihn dorthin und trägt diesen Punkt anschließend aus. Der Wortlaut steht hier unverändert.

> #### Was funktioniert hat
>
> - Promptotyping-Dokumente als Source of Truth → Code-Generierung
> - Synthetische Daten entkoppeln Frontend- von Datenarbeit
> - Design-System als CSS Custom Properties vorab definiert
> - Offline-first ueberlebt Funding-Gaps
> - Iterative Vis-Entwicklung (Partitur → Patterns fuer Matrix/Kosmos)
>
> #### Iteration-2-Erkenntnisse
>
> - Data-first statt UI-first
> - Modularisierung von Anfang an
> - User Testing frueher
> - Evaluation-driven Priorisierung (schwach abgedeckte Forschungsfragen früh benennen)
> - Controlled Vocabulary Enforcement bei Datenerfassung
> - Der Datenintegritätskern verträgt keinen großen autonomen Lauf. Der Lauf vom 2026-06-17 lieferte die Loader-Absorption (E-95) und blieb bei Test-Welle und Modell-Features stecken; die Empfehlung des Implementierungsplans lautet seither, seriell und human-guided umzusetzen.
> - Agenten-Selbstberichte gelten erst nach Gegenprüfung am realen Dateistand. Ein Verify-Agent meldete für denselben Lauf einen Totalverlust der Daten, den die direkte Prüfung der Sheet-Provenance widerlegte; seine Annahme, der Record-Identifier trage kein Folio, war falsch.
>
> #### Positive Ueberraschungen aus Datenanalyse
>
> - Erschliessungstiefe bei den feinerschlossenen Konvoluten (NIM_003/004/005/006/007) uebertrifft Erwartungen
> - Gender-inklusives Rollen-Vokabular mit substanziellem `:in`-Anteil
> - Hoher Personen-Kategorien-Abdeckungsgrad — Matrix bekommt direkt Daten
> - Werk-Verknuepfungen ermoeglichen substantiellen Rollen-Kosmos
