---
title: Design
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
status: complete
language: de
version: 0.6
created: 2026-02-19
updated: 2026-09-04
authors: [Christopher Pollin]
generated-with: Claude Code
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Design
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/design
topics: ["[[Information Visualisation]]", "[[Scholar-Centered Design]]"]
related: [architecture, research-framework, journal, data-model]
---

# Design

## Grundhaltung

Das Interface ist ein Forschungswerkzeug für Forschung und Erschließung, kein Dashboard (E-156). Es zeigt den Archivbestand wie eine Edition ihre Quellen, mit sichtbarer Provenienz, ehrlichem Erschließungsstand und einer Typografie, die zur Lesehaltung passt. Lücken und Dubletten stehen so da, wie sie im Bestand liegen.

## Bereiche

Jede Ansicht ist aus denselben Bereichen gebaut.

- Eine einzeilige Kopfleiste, ein Markenband über die volle Breite in KUG-Blau (E-185, E-196). Links steht die weiße Wortmarke mit dem Badge, rechts stehen die Links zu den Infoseiten in `--accent-soft`. Dazwischen liegen die Tabs derselben Zeile in den drei sichtbaren Gruppen Material, Perspektiven und Werkzeug (E-160), in `--accent-soft`, aktiv und bei Hover weiß auf einer leicht aufgehellten Tabfläche, die weiße Unterlinie steht um wenige Pixel in das Band gerückt, damit sie sich von der hellen Arbeitsfläche darunter absetzt (E-211). Der Markenblock nimmt die Breite der Sidebar-Spalte ein, sodass der erste Tab an der linken Kante der Arbeitsfläche und damit über der Tabelle beginnt. Der Untertitel steht auf den Infoseiten und in der Anwendung im Tooltip der Marke. Die Infoseiten tragen dasselbe Band ohne Tabs.
- Linke Sidebar mit Suche und allen Facetten, auf dem warmen Cremeton der zweiten Fläche.
- Arbeitsfläche der Ansicht in reinem Weiß, die einzige Fläche, auf der Inhalt steht.
- Fuß in einer festen Zeile, neutral und ohne Akzentfarbe, in zwei Gruppen: links das KUG-Zeichen mit Impressum, rechts Repository, Lizenz mit CC-Zeichen, Promptotyping und DHCraft, jedes mit einem gleich großen Zeichen davor (E-209, E-211). Die Research-Preview-Pille steht allein in der Kopfleiste. Erklärungen zu Lizenz und Herkunft stehen in den Tooltips.

## Tab-Architektur

Sieben Tabs stehen in drei Gruppen, jeder registrierte Tab ist sichtbar (E-140, E-160). Tab-Namen benennen den Gegenstand.

- Bestand, Material. Einzelbelege in der Konvolut-Hierarchie mit Konvoluten als Gruppenköpfen und ihren Kindern in Signaturfolge (E-82, E-158, E-203). Ein Konvolut öffnet geschlossen, nur beim ersten ungefilterten Laden steht das erste Konvolut offen (E-206), der Chevron am Kopf klappt es auf und scrollt den Kopf unter den Spaltenkopf, der geöffnete Kopf haftet oben an der scrollenden Fläche und trägt die vier Familiensymbole als Legende, ein Direktlink auf ein Kind öffnet sein Konvolut (E-175). Pfeiltasten, Enter, Leertaste und Escape führen durch die Köpfe (E-214). Form ist eine rahmenlose Record-Tabelle über die volle Breite, die Zeilen weiß mit warmer Haarlinie, der getönte Ton allein an Hover, Spaltenkopf und haftendem offenen Konvolut-Kopf, der Spaltenkopf mit der Chip-Zeile über den Daten ein Band (E-191, E-198). Spaltenkopf und geparkter Konvolut-Kopf bilden ihrerseits ein Band, dessen untere Trennlinie der Kopf trägt, der Spaltenkopf gibt seine ab, solange ein Kopf offen ist, und die beiden haftenden Lagen überlappen um ein Pixel, damit zwischen ihnen keine Fuge steht. Die Kopfzeile eines Konvoluts steht wie jede andere Zeile auf Weiß. Der Spaltenkopf ist eine reine Beschriftungszeile, die Tabelle hat keine Sortierung, weil eine Hierarchie sich nicht flach ordnen lässt und Datum wie Typ von Chronik und Facette bedient werden (E-203). Der Konvolut-Kopf trägt Signatur, Titel, die Datumsspanne und eingeklappt die Typenverteilung als kleine Chips mit ihren Zahlen, inline nach dem Titel und links umbrechend. Seine Typ-Zelle bleibt leer, einen Badge trägt er nicht (E-197). Gesamtzahl, Erschließungsstand, Zahlen je Inhaltsfamilie und der Hinweis auf das Aufklappen stehen ausschließlich im Tooltip seines Titels (E-190, E-197). Eine Objektzeile trägt vor der Signatur ihren eigenen eingerückten Chevron, rechts bei geschlossenem und nach unten bei offenem Inline-Detail, mit `aria-expanded` an der Zeile (E-217). Ein Kind zeigt die Folio-Nummer ohne Präfix, lässt das Datum leer, wenn es dem Konvolut gleicht, und ersetzt einen ererbten Sammeltitel durch den ersten Beteiligten in gedämpfter Textfarbe ohne Familiensymbol, die Titelzelle trägt kein Zeichen (E-177, E-217). Der Typ einer Zeile ist Text. Die Spalte Entitäten zeigt die vier Familiensymbole der Indizes, gefüllt in Familienfarbe mit der Zahl der verschiedenen Entitäten daneben, wo welche vorkommen, sonst als stille Kontur, die Namen im Tooltip (E-212, E-215). Dazu die Korb-Spalte und das Inline-Detail über volle Breite.
- Indizes, Material. Personen, Institutionen, Orte und Werke als aggregierte Übersicht, gezeigt wird ein Register je Seite (E-226). Gewählt wird es in der segmentierten Kopfzeile der Liste, die zugleich die Legende der vier Inhaltsfamilien ist, jedes Segment mit dem Familiensymbol, das aktive in Familienfarbe, denselben, die Bestandszeile und Blocktitel des Details führen (E-227). Form ist eine Liste ohne Spaltenköpfe, ein Eintrag je Entität in einer Zeilenhöhe mit Name, kurzer Anreicherung, Belegzahl im Schnitt und einfarbiger Wikidata-Marke, und dem nach Familie gruppierten Umfeld im aufgeklappten Eintrag, das den Weitergang in das andere Register trägt.
- Chronik, Perspektive. Mobilität über die Lebensspanne. Form ist ein Jahres-Zeitstrahl mit Dot-Dichte je Jahr, Record-Chips mit Sicht-Akzent und kollabierbarem Dekaden-Header.
- Karte, Perspektive. Orte einer gewählten Person oder Institution samt Länder-Reichweite. Form ist eine Stummkarte aus lokaler Geometrie mit Anteils-Knoten je Ort, ohne Reisepfeile (E-126).
- Netzwerk, Perspektive. Umfeld einer Fokus-Entität über die Knotentypen Person, Institution, Ort und Werk, die als Sektoren um das Zentrum liegen, dazu die Ringe nach Evidenzstärke im reinen Personenbild (E-93). Form ist ein SVG-Graph, in dem die Linienart die Evidenz trägt, gerade Radialen für annotierte Beziehungen und geschwungene Kanten für Ko-Okkurrenz. Ein Klick auf einen Knoten macht ihn zur neuen Fokus-Entität, das Bild ist damit begehbar statt auswählbar.
- Statistik, Perspektive. Der Bestand in Zahlen über Dokumenttypen, Erschließungsstand, Repertoire, Personen und Institutionen. Form ist genau eine gewählte Ansicht über die volle Breite, gebaut aus Ranglisten mit DOM-Balken.
- Korb, Werkzeug. Querschnitts-Merkliste mit CSV- und BibTeX-Export. Form ist eine Card-Liste im Chip-Muster des Inline-Details.

Der Erschließungsstand ist ein Filter, kein Modus (E-162), mit den Werten abgeschlossen, begonnen, zurückgestellt und ohne Angabe; im Bestand sind die ersten beiden voreingestellt, sichtbar als Chip über den Daten (E-170). Als Facette steht er direkt nach dem Dokumenttyp in der Seitenleiste, sein Chip nennt die gewählten Stände positiv (E-204, löst E-178 ab). Objekte ohne Verknüpfung erscheinen in keiner Ansicht (E-165), das Findmittel zum vollständigen Teilnachlass bleibt das Archiv. Ein Konvolut-Kopf steht nur, solange er ein sichtbares Kind hat, und Indizes zeigen nur Einträge mit Record-Referenz, weil ein Eintrag ohne Beleg keinen Einstieg bietet. Laufende Zahlen führt ausschließlich `data/reports/quality-snapshot.md`. Der Schärfegrad als Umschalter ist entfallen (E-163), die Unterscheidung zwischen Nennung und raumzeitlichem Beleg trägt das Netzwerk als Linienart und kehrt mit der Auftrittsbündelung als Facette Belegart zurück.

## Designregeln

### 1. Typografie als Bedeutungsträger

Die Schriftfamilie sagt, welcher Art ein Wert ist (E-187). Monospace trägt ausschließlich Bezeichner, also Signatur, Folio, Termkennung, Q-ID und Provenance-Pille, und macht sie beim Scannen einer Record-Liste als Adresse erkennbar. Source Serif 4 bleibt der Wortmarke und den Überschriften der Infoseiten vorbehalten. Alles übrige, Titel innerhalb der Ansichten eingeschlossen, steht im UI-Sansserif-Stack, Zahlenkolonnen mit Tabellenziffern. Die Infolinks der Kopfleiste teilen die Größe der Tab-Beschriftung und unterscheiden sich nur in Farbe und Gewicht.

### 2. Warme Flächen, ein kühler Akzent, vier Entitätsfarben

Die Flächen sind warm, der Akzent ist kühl, und die beiden werden nicht gemischt (E-186). Die Arbeitsfläche ist reines Weiß, `--surface-2` das Creme `#F5F0E8` der Seitenleiste, `--surface-3` das Pergament `#EDE5D8` als tiefere Stufe, und Linien und Textwerte gehören derselben warmen Familie an. Das KUG-Blau `#004A8F` ist der einzige Akzent, es trägt Marke, Markenband, Link, aktiven Tab, Fokusring und Kontur, dazu `--accent-soft` für Auswahl und Hover. Ein warmer Ton übernimmt keinen interaktiven Zustand, und ein warmer Tokenname zeigt nicht auf den Akzent, weshalb die beiden Gold-Aliasse gelöscht sind. Dazu ein Rot für Fehler und ein Grün für den Wikidata-Match.

Die vier Inhaltsfamilien sind die vier Entitätstypen, Personen (Pflaume `#6B3F80`), Institutionen (Gold `#7A6000`), Orte (Wald `#2C6B4A`) und Werke (Terrakotta `#BF4A18`), jede mindestens 4,5 zu 1 gegen Weiß und in Farbton und Helligkeit abgesetzt. Sie erscheinen als Familiensymbol in der Erschließungsanzeige einer Objektzeile (E-212), als Punkt am Blocktitel des Details und als Punkt am Titel der vier Entitätsfacetten in der Seitenleiste (E-171), die Chips bleiben neutral, womit die Legende aus Nähe entsteht (E-158). Der Konvolut-Kopf wiederholt die Quadrate nicht; seine Familienzahlen liegen im Tooltip (E-190). Eine eigene Rollenfacette gibt es seit E-204 nicht mehr, die Beteiligungsart trägt die Personenfacette über ihr Rollenpräfix. Beziehungen zählen zu den Personen, Finanzen und genannte Daten tragen keinen Marker. Sechs weitere Töne tragen Mobilitätssichten, Netzwerkkategorien und Knotentypen.

### 3. Rolle-Prefix-Chips als universelles Daten-Atom

Jeder semantische Datenpunkt erscheint als Chip aus Uppercase-Rollenbezeichner und Wert, etwa `KOMPONIST Beethoven, Ludwig van`. Dieselbe Primitive trägt Einzelbelege im Inline-Detail, Aggregatverteilungen mit Count und AgRelOn-Beziehungen. In der Chronik kommt ein linker Akzent in der Farbe der dominanten Mobilitätssicht dazu ([data-model.md](data-model.md) § Mobilitätsmodell), ohne Ereignis bleibt der Chip ohne Akzent.

### 4. Inline-Breakdown statt Drilldown-Panel

Aggregatzellen zeigen die Verteilung der Untertypen in der Zelle, gefolgt von der Summe als Ranking-Anker. Ein eigenes Panel bleibt den Fällen vorbehalten, in denen Einzelbelege gelistet werden müssen.

### 5. Provenance-Pille am Datenpunkt

Die Quellreferenz der Erfassung steht als kompakte Pille an jedem Finanz-, Beziehungs- und Ereignis-Datenpunkt des Inline-Details und nennt Blatt, Zeile und Datenpunkt, im Label wie im Tooltip. Die Pille schluckt den Klick, sie löst also weder den Filter ihres Chips aus noch einen Sprung. Ob ein Sprung in das Blatt gebaut wird oder die Pille bei der Anzeige bleibt, steht als offene Entscheidung in [handoff.md](handoff.md) (E-221). Eine fehlende Pille heißt, die Quelle führt für diesen Datenpunkt keine Zeile. Provenance ist verpflichtender Teil der UI, keine Debug-Beigabe.

### 6. Selection durch Kontur, nicht Flächenfarbe

Ein ausgewählter Record bekommt einen dünnen farbigen Rahmen. Eine Füllung würde den Text dämpfen, die Kontur signalisiert Fokus ohne Ablenkung. Die Ausnahme ist der aktive Tab auf dem Markenband, wo die Kontur allein nicht sichtbar genug ist und eine leicht aufgehellte Fläche dazukommt (E-211).

### 7. Eine Filter-Sidebar für alle Ansichten

Suche und alle Facetten wohnen in einer linken Seitenleiste, die in jeder Ansicht identisch aufgebaut ist (E-158). Der Aufbau ist von oben nach unten fest (E-166) mit Suche, Zeitraum, geteilten Facetten, ansichtsspezifischen Reglern und Legende. Die Suche nennt im Platzhalter die Felder, auf die sie in der Ansicht trifft, und fehlt in Ansichten, in denen sie nichts filtert (E-169). Die Zahl der Dokumente des Schnitts steht als Wurzelzeile des Dokumenttyp-Baums, ohne Abweichung vom Nullpunkt als bloße Zahl und mit Abweichung als Anteil an der Grundmenge, sodass Gesamtmenge und Teilmengen untereinander lesbar sind (E-170). Alle Sektionstitel der Spalte tragen dieselbe gesperrte Kapitälchenform, die Wurzelzeile Dokumente eingeschlossen, weil sie in derselben Ebene steht wie die Titel der übrigen Facetten (E-199). Die Spalte grenzt sich zur Arbeitsfläche mit der schwächsten Linie ab. Die abweichenden Werte stehen ausschließlich als entfernbare Konturchips mit Akzenttext und Akzentrahmen zusammen mit dem Link zum Zurücksetzen in einer schmalen Zeile über den Daten in der Arbeitsfläche, die Chips in der kleinsten Textgröße, damit die Zeile der Tabelle keine Höhe nimmt; die Facette wiederholt weder gewählte Wertzeilen noch eine Titelzahl (E-182, E-183, E-192). Die Chips stehen je Facette gruppiert unter dem Facettennamen in der Kapitälchenform der Sektionstitel, weil innerhalb einer Facette ein Wert genügt und zwischen den Facetten alle zutreffen müssen und die Gruppierung diese Regel zeigt, die der Tooltip des Gruppennamens ausspricht (E-204). Ein Ansichts-Default, der Dokumente ausblendet, ist ein Filter wie jeder andere, erscheint als Chips der Facette Erschließungsstand, die ihre vier Werte mit Haken und Zahl direkt nach dem Dokumenttyp führt, und das Zurücksetzen führt auf die Grundmenge (E-170, E-204). Ein mitgemeintes Blatt unter einem gewählten Oberbegriff ist Information, kein Klickziel (E-204). Der Zeitraum ist ein Regler mit zwei Griffen und den Jahreszahlen an den Enden, ohne Zahlenfelder. Die Facetten folgen in der Reihenfolge Dokumenttyp, Erschließungsstand, Person, Ort, Werk, Institution (E-204). Bei den offenen Facetten stehen Titel und Eingabefeld in einer Zeile, der Titel in einer schmalen festen Spalte (E-178). Dokumenttyp zeigt seine Werteliste als Baum ohne eigenes Suchfeld. Im Baum trennen sich Auswahl und Zeiger (E-193). Eine gewählte Zeile trägt den Haken und Akzenttext ohne Füllung, die Füllung gehört Hover und Fokus, der Tastaturzeiger nimmt `--surface-3`. Der Chevron ist ein eigenes Klickziel über die volle Zeilenhöhe mit `aria-expanded` und eigener Beschriftung, ein gewählter Oberbegriff zeigt seine Kinder mit gedämpftem Mitwahl-Haken, weil der Filter über die Blätter auflöst, und sein Tooltip nennt die Aufteilung direkt gegen Untertypen. Die offenen Mengen zeigen ein Eingabefeld mit Vorschlägen, die bei Fokus die häufigsten Werte und beim Tippen die Treffer nennen, mit Tastaturbedienung, Umlautausgleich und markiertem Trefferteil; ein gewählter Vorschlag bleibt in dieser temporären Liste sichtbar und trägt einen Haken (E-183). Der Platzhalter ist die feste Aufforderung „<Facette> filtern…“ in tertiärer Farbe, normalem Gewicht und leicht kleiner, weil ein realer Wert im leeren Feld als bereits gesetzter Filter gelesen wurde (E-188). Die vier Entitätsfacetten tragen den Punkt ihrer Familie (E-171), und eine Facette ohne Werte im aktuellen Schnitt ist auf ihre Titelzeile eingeklappt. Drei Linien gliedern die Spalte, vor den Facetten, vor den Ansichtsreglern und vor der Legende, innerhalb der Blöcke trennt nur Abstand. Eine Verengung, die nur in einer Ansicht schneidet, steht in derselben Zeile als eigene Gruppe, die Entität und das Land der Karte und die Normdaten-Verengung der Indizes. Sie hält den Platzhalter fern und antwortet auf dasselbe Zurücksetzen, obwohl der geteilte Zustand sie nicht trägt (E-223). Ein Sektionstitel allein sagt nicht, worauf eine Liste verengt ist, die Chip-Zeile ist der Ort, an dem der Schnitt lesbar wird. Grundlage ist der geteilte Filterzustand ([architecture.md](architecture.md) § Cross-View-Filter), daneben gibt es weder ansichtslokale Filterorte noch Top-Filterleisten.

### 8. Erklärung durch Struktur, nicht durch Text

Zählwerte stehen in den Bedienelementen selbst, Farbbedeutung entsteht aus Nähe (Regel 2), Zustände aus Form (Regel 10). Dauerhaft sichtbarer Erklärtext ist Anti-Muster, Captions und Aufschlüsselungszeilen wandern in Tooltips. Der Tooltip ist damit der legitime Ort der Vertiefung, die primäre Zugangsinformation trägt weiterhin die Struktur. Der Tooltip ist der CSS-Tooltip über `data-tip`, native `title`-Attribute gibt es außer an SVG-Zeichnungen nicht; er wiederholt nie den sichtbaren Text, und ein Icon-Knopf trägt daneben ein `aria-label` (E-210).

### 9. Uppercase-Letter-Spaced-Section-Header mit Gloss

Sektionen im Hauptbereich tragen dezente Überschriften nach dem Muster `BÜHNENROLLEN (STAGE ROLES)`. Das Fachvokabular erklärt sich über den englischen Gloss statt über ein Popup-Glossar.

### 10. Datenqualität wird gezeigt, nicht gemergt

Tippfehler, Dubletten und Normalisierungslücken erscheinen so, wie sie im Bestand liegen, das Interface ist ein Erschließungsspiegel. Ein Qualitätsflag des Modells zeigt ein neutrales Info-Symbol am Chip, dessen Tooltip den Wortlaut der `rico:generalDescription` unverändert nennt, ohne ihn zu deuten. Er steht an Datierung, Aufführung, Ereignis und Rolle, sodass ein Vermerk wie ein nicht eingehaltener Vertrag lesbar ist und nicht in den Daten bleibt (E-222). Der Tooltip des Chip-Werts ist der Träger jedes modellierten Datenpunkts seines Knotens, in fester Ordnung, die Quellfelder zuerst und danach die mit „ergänzt:“ eingeleitete Anreicherung (Regel 16). Ein Datenpunkt, den kein Chip und kein Block zeigt, gehört dorthin und nicht in stehenden Text (Regel 8). Jahre ohne bearbeitetes Material behalten in der Chronik ihren Platz als Umriss-Dot mit gedimmtem Label. Gerendert wird nur, was aus den Daten ableitbar ist, handverdrahtete Charakterisierungen einer Lebensphase nicht (E-87).

### 11. Trennlinien nur, wo Abstand nicht trägt

Gruppen werden zuerst durch Abstand, Überschrift und Ausrichtung getrennt. Eine Linie kommt nur dorthin, wo das Auge zwei Blöcke sonst nicht auseinanderhält, etwa zwischen Konvolut-Kopf und Objektzeilen. Sidebar-Sektionen, Listenzeilen und Legenden tragen keine Linien.

### 12. Tabelle vor Chart für Rankings

Lautet die Frage, was wie oft vorkommt, ist die Tabelle mit Inline-Breakdown überlegen, weil sie die Rangreihung als Hauptlesepfad erhält. Ein Chart ist dort begründet, wo Raum oder Zeit selbst die Information ist.

### 13. Erst statisch lesbar, dann Interaktion

Eine Darstellung muss ohne Bedienung lesbar sein. Interaktion kommt erst dazu, wenn die sortierte Darstellung eine Frage nicht mehr beantwortet, und nie als Toolbar-Chrome neben der Grafik.

### 14. Pipeline-Semantik sichtbar machen

Was die Pipeline semantisch unterscheidet, also Rollen-Typen, Datumsrollen, die Dokumenttypen-Hierarchie und Konfidenzstufen, erscheint auch im UI, sonst bleibt die Mühe der Differenzierung unsichtbar. Die Belegrollen-Chips sind direkt aus dem Datenmodell gerendert.

### 15. Determinismus vor Simulation

Gleiche Daten ergeben gleiche Grafik. Layouts entstehen aus reinen Funktionen und, wo Streuung nötig ist, aus geseedetem Zufall, nicht aus einer unkontrollierten Force-Simulation. Nur so bleiben Wiedererkennbarkeit und Langzeitstabilität einer Ansicht gegeben.

### 16. Ergänztes ist markiert

Alles, was Pipeline oder Frontend abgeleitet, ererbt oder ergänzt haben statt es aus der Quellzeile zu lesen, trägt genau eine Marke, die gepunktete Unterlinie in Sekundärfarbe, und einen Tooltip, der mit „ergänzt:“ beginnt und die Herleitung nennt (E-216). Keine zweite Farbe, kein Zeichen, keine Kursive. Abwesenheit bleibt kursiv in Absenzfarbe (Ü-3), der Quellbeleg behält Belegnummer und Provenienzpille (Regel 5); beides sind keine Ergänzungen.

### 17. Ein Zeichen, eine Bedeutung

Der Chevron bedeutet aufklappen und sonst nichts, auf beiden Ebenen der Bestandstabelle, am Konvolut-Kopf und an der Objektzeile, die ihr Inline-Detail öffnet (E-217). Navigation und Zuklappen bekommen keinen Chevron, ein Sprungziel ist kein Klappzustand und ein Schließen ist derselbe Auslöser wie das Öffnen. Eine zweite Darstellung dessen, was die Tabelle eine Ebene darunter oder in einer anderen Spalte ohnehin zeigt, entsteht nicht, deshalb bleibt die Titelzelle einer Objektzeile ohne Zeichen. Sonst trägt dasselbe Zeichen an drei Stellen drei Bedeutungen, und die Zeile, die tatsächlich aufklappt, bleibt ohne.

## Designsystem

Die Design-Tokens für Farben, Abstände, Textgrößen und Übergänge liegen zentral in `docs/css/variables.css` und sind die einzige Quelle für jedes Tab-CSS. Das KUG-Blau ist der Akzent aller Interaktion, ein Rot markiert Fehler und Datenqualität, ein Grün den Wikidata-Match. Vier Inhaltsfamilien-Töne tragen Personen, Institutionen, Orte und Werke, eine kategoriale Reihe aus sechs Tönen die Mobilitätssichten sowie Kategorien und Knotentypen des Netzwerks. Ein Tooltip an einem SVG-Element ist ein HTML-Element über der Grafik, weil SVG-Knoten keine Pseudo-Elemente tragen (E-36), und ein Hover zeigt genau einen Tooltip (E-90). Die Typografie führt Source Serif 4, einen UI-Sansserif-Stack und Monospace.
