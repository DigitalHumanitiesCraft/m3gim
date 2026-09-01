# Frontend-Stichprobenbericht, 2026-09-01

Klickende Browser-Stichproben (headless Chromium via Playwright) gegen den
lokalen Server, ergänzend zum vollständigen Zeilenabgleich in
[frontend-verification-bestand.md](frontend-verification-bestand.md). Drei
unabhängige Prüfläufe: Bestand-Tiefenstichprobe, Tab-übergreifende
Konsistenz, Inline-Detail gegen die Verknüpfungs-CSV.

## Gesamtbild

Die Daten kommen an. Der vollständige Abgleich Quell-CSV → JSON-LD →
gerenderte Bestand-Tabelle geht pro Zeile auf (Anwesenheit, Titel,
Datierung, Verknüpfungszahl), der Toolbar-Zähler stimmt mit der Zeilenmenge
überein. In keinem der drei Läufe fiel ein einziger JavaScript- oder
Console-Fehler, über alle sieben Tabs und alle Interaktionen (Aufklappen,
Inline-Detail, Sortieren, Filtern, Kartenklick). Bei sechs tief geprüften
Records deckte sich das Inline-Detail Zeile für Zeile mit den getypten
CSV-Zeilen, in fünf Fällen exakt, im sechsten mit einer erklärbaren
Modell-Lücke (unten).

## Bestätigte Reparaturen und Regeln

- Die neuen Folios 23 bis 29 in `UAKUG/NIM_005` erscheinen mit korrekten
  Titeln und der Undatiert-Markierung „o. D.", identisch zur Objekte-CSV.
- Die Bindestrich-Reparatur wirkt: `UAKUG/NIM_137` 15_1 und 15_2 stehen als
  „Nr. 15.1"/„Nr. 15.2" mit Verknüpfungszahlen über null in der Tabelle,
  obwohl die Verknüpfungs-CSV sie mit Bindestrich schreibt.
- `UAKUG/NIM_004` Folio 34 zeigt „o. D." statt des Autokonvertierungsjahres
  2026, der fehlerhafte Quellwert erreicht die Datumsanzeige nicht.
- Facetten-Hygiene: der abgeschnittene Rollen-Rohwert `v` liegt zwar im
  Datenbestand, taucht aber in keinem Rollen-Filter als wählbarer Wert auf.
- Geteilter Filter-State: ein in Bestand gesetzter Ort-Filter Bayreuth
  erscheint als derselbe Chip in der Chronik, die Mengen beider Ansichten
  sind konsistent, das Zurücksetzen leert beide.
- Netzwerk: Komponisten mit belegter Komponisten-Rolle bleiben als reine
  Werkurheber draußen, Personen mit echten Rollenbelegen (etwa die
  Bayreuther Dirigenten) erscheinen. Rollenlose Nachnamen-Nennungen wie
  „Brahms" aus den Tätigkeitslisten bleiben sichtbar, das ist die bewusste
  Evidenzregel aus `_network-geometry.js`, kein Fehler.
- Finanz-Verknüpfungen (`einnahmen_währung`, `summe_währung`) erreichen das
  Detail mit Betrag, Währung und Rolle, geprüft an Briefen mit Abspielhonorar
  und Abendgagen.
- AgRelOn-Beziehungen erzeugen zusätzliche Beziehungs-Chips (Korrespondenz,
  beruflicher Kontakt), die Agents bleiben daneben in ihren Sektionen, das
  ist die gewollte doppelte Sicht, kein Datenverlust.

## Befunde

### Darstellungslücken der Anwendung (Kandidaten für die User-Story-Phase)

1. Monatsgenaue Datierungen erscheinen roh als `1956-10` statt als
   „Okt. 1956". Tagesgenaue Werte werden korrekt formatiert („26. Jul.
   1953"), die Formatierung in `docs/js/utils/date-parser.js` kennt die
   reine Jahr-Monat-Form nicht. Kein erfundener Tag, nur Lesbarkeit.
2. Die aus `datum, werk`-Kompositzeilen gebauten Performance-Entitäten sind
   im Inline-Detail unsichtbar. Am Programmflyer der Bayreuther Festspiele
   1953 (`UAKUG/NIM_137`, Heft in `UAKUG/NIM_073` Folio 30_1) fehlen so die
   vierundzwanzig datierten Aufführungen der Serie im Record-Detail, obwohl
   sie modellkonform als `m3gim-ontology:Performance` im Datensatz stehen.
   Genau diese Serie trägt die Antwort auf die Leitfrage Ort×Partie×Zeit.

### Quellbefunde (auf die Partner-Übergabeliste übernommen)

1. Objekte-CSV Zeile 725 trägt nur die Folio-Nummer 11_62 und sonst nichts,
   die Pipeline lässt die Zeile fallen, die Verknüpfungen auf dieses Folio
   verfallen weiter.
2. Objekte-CSV Zeile 76 schreibt `folio` klein statt `Folio`, die Zeile wird
   nicht als Konvolut-Metadatenzeile erkannt und erscheint als eigenes
   Objekt „Nr. folio" unter `UAKUG/NIM_005`.
3. Der jahrlose Datumsrest `06-09` steckt in einer `ort, datum`-Kompositzeile
   und erscheint im Detail von `UAKUG/NIM_004` Folio 34 als Ort „06-09".
4. Die Partien in `UAKUG/NIM_137` 15_1/15_2 sind doppelt erfasst (Komposit-
   und reine Rollenzeile), das Detail zeigt sie deshalb doppelt.

Alle vier stehen in
[source-errors-handover-2026-09-01.md](source-errors-handover-2026-09-01.md).
Bereits gelistete Quellbefunde, die die Stichproben erneut sichtbar machten
(Tippfehler „Lohegerin", „Wagner, Richard" als Sänger, Namens-Dubletten mit
Komma-Artefakten, kleingeschriebene Institutionsnamen), reichen wie erfasst
durch, was der Datenfehler-Policy entspricht.

## Werkzeug

Der Zeilenabgleich ist wiederholbar:

```bash
python -m http.server 8791 -d docs
python tests/tools/verify_bestand_display.py
```

Das Skript schreibt frontend-verification-bestand.md neben diesen Bericht
und endet mit Exit 1, sobald eine Einheit fehlt oder ein Feld abweicht.
