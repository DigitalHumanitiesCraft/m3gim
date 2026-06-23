# Verifikations-Spur — Verknüpfungen-Tab (M3)

Browser-Verifikation gegen `http://localhost:8000` (lokaler `python -m http.server` auf `docs/`), Chrome, 2026-06-23.

## Ausgangszustand (ohne Interaktion)

Tab „Verknüpfungen" sichtbar, deterministisch gerendert, ganzer Graph im Viewport.
Console-State-Stempel (DEV):

```
[verknuepfungen] fokus:Malaniuk, Ira | schaerfe:weit | ort:— | zeit:alle | knoten:48 |
  person:12 | werk:12 | institution:12 | ort_n:12 | recordsWeit:115 | recordsEng:100 | gekappt:627
```

Keine Konsolenfehler. Malaniuk zentriert (KUG-Blau), Nachbarn in vier Typ-Sektoren:
Person (oben, blau), Werk (rechts, gold), Ort (links, grün), Institution (unten, teal).
Legende rechts, Differenznennung-Caption über dem Graph.

## Partner-Leitfrage als reines Filterergebnis (Ort = Bayreuth)

Ort-Facette auf „Bayreuth (45)" gesetzt — Graph schneidet auf den Bayreuth-Kontext:

```
Caption: „Malaniuk, Ira — Schärfegrad weit (im Dokument genannt). 39 Dokumente im Fokus,
davon 38 mit raumzeitlichem/Aufführungs-Beleg. Kanten heißen ‚im selben Dokument genannt',
nicht ‚zusammen aufgetreten'. Gekappt (Top 12/Typ): Person +182, Werk +13, Institution +32, Ort +19."
```

Sichtbar: Bayreuth-Ensemble (Mödl, Varnay, Windgassen, Knappertsbusch, Keilberth, Wieland
Wagner), Wagner-Werke (Tristan, Parsifal, Ring, Götterdämmerung, Siegfried, Walküre),
Reiseorte (Buenos Aires, Brüssel, Wien, München, Zürich), Institutionen (Bayreuther
Festspiele, Bayreuther Ensemble, Wiener/Münchner Staatsoper, Teatro alla Scala).

## M1-Daten sichtbar im Detail-Panel

Werk-Knoten „Tristan und Isolde" gewählt → Rolle-Prefix-Chips:

```
WERK  Tristan und Isolde
GEMEINSAM 17 Dok.  ·  PARTIE Brangäne  ·  KOMPONIST Wagner, Richard
```

`PARTIE Brangäne` ist die kuratierte Werkindex-Spalte `rolle/stimme`, die die Pipeline vor
M1 fallen ließ — sie erreicht jetzt das Frontend. Institutions-Sitze (M1) speisen die
„auswärts/am Haus"-Datengrundlage.

## Geprüfte Interaktion

- Schärfegrad weit/eng: schaltet den Record-Satz um, Differenz wird benannt (recordsEng/recordsWeit).
- Ort- und Zeitfenster-Facetten: geteilter Filter-State (`filter-state.js`), wirken auf den Graph.
- Knotentyp-Toggles: jeder Typ einzeln abschaltbar (wörtliche Partnervorgabe).
- Fokus-Wechsel (Person/Ort): lokaler View-State.
- Knoten-Klick: Detail-Panel mit datengetriebenen Chips (kein redaktionelles Deuten).

Determinismus: Positionen aus reinen Funktionen in `_verknuepfungen-geometry.js`
(unit-getestet), keine Force-Simulation.
