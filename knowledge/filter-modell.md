---
title: Filter-Modell
project:
  name: M³GIM
  repository: https://github.com/DigitalHumanitiesCraft/m3gim
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
status: draft
created: 2026-06-21
updated: 2026-06-30
language: de
version: 0.1
authors: [Christopher Pollin]
generated-with: Claude Code
topics: ["[[Information Visualisation]]"]
related: [architecture, data, decisions, plan, visualisierung-bayreuth]
---

# Filter-Modell

> Spezifikation des view-übergreifenden einheitlichen Filters für das M³GIM-Frontend. Das Dokument legt das geteilte Filter-State-Modell fest, seine Verteilung über die bestehende Mechanik und die Filtersemantik der beiden Schärfegrade `weit` und `eng`. Es ist der Entwurf für Milestone 3 (order-m3gim, 2026-06-21). Der Bau des Filters ist Milestone 4 und bleibt propose-first gated, hier nur gescopt. Die Source of Truth des Datenmodells bleibt in [data.md](data.md) und [architecture.md](architecture.md), der Bayreuth-Befund in [visualisierung-bayreuth.md](visualisierung-bayreuth.md).

## Zweck

Ein gesetzter Schnitt nach Ort, Person, Werk, Rolle, Zeitfenster oder Mobilitätssicht soll synchron in allen filterbaren Views wirken, statt in jedem Tab getrennt gesetzt zu werden. Bayreuth 1951 bis 1953 erscheint dann als reines Filterergebnis (order Punkt 2 „Filter und Selektion einheitlich über alle Views"), und ein generalisierter Ort-Zeit-Schnitt ersetzt einen eigenen Bayreuth-View (order Punkt 5). Der Filter ist ein neutraler gekoppelter Schnitt mit den sichtbar getrennten Schärfegraden `weit` und `eng`, das ist die orchestratorseitig entschiedene Baurichtung. Eine Forschungsfrage-Rahmung bleibt additive spätere Schicht und wird jetzt nicht verdrahtet.

## Ausgangslage, getrennte Filtermechaniken

Heute trägt jeder filterbare View seine eigene Filterlogik, die Zustände sind nicht gekoppelt.

- Bestand und Chronik teilen die Filter-Pipeline `filterByToolbarState` und `isToolbarFiltered` (`docs/js/views/_archive-filter.js`) und je eine eigene Instanz von `buildFilterToolbar` (`_archive-toolbar.js`), aber mit getrenntem State. Facetten heute: Suche, Dokumenttyp, Person, Ort, Werk (plus die bestand-lokale Erschließungs-Umschaltung aus E-116).
- Netzwerk hat eine eigene Filter-Sidebar mit Zeitfenster (`_network-sidebar.js`, E-93/E-94).
- Karte (Mobilität) filtert view-lokal über die Sicht-Legende und den Zeitregler (`mobility.js`, E-111).

Der Event-Bus `docs/js/ui/events.js` (E-53) ist heute ein gezielter, einmaliger Navigationskanal, nicht ein geteilter Filter-State. `onViewNavigate(tab, handler)` registriert genau einen Handler pro Ziel-Tab, das globale `m3gim:navigate` stellt ein zuletzt anliegendes Detail zu und spielt es beim Subscribe einmal ab. Das trägt den Sprung „zeige diesen Record im Bestand" oder „setze diesen Personfilter", aber keinen fortlaufenden, in mehreren Views gleichzeitig wirkenden Schnitt. Genau diese Lücke schließt das Filter-Modell.

## Das geteilte Filter-State-Modell

Ein einziges Filter-State-Objekt ist die Quelle, alle Views lesen daraus und schreiben dorthin. Jede Facette zieht ihre Werte aus `store.*`, nicht aus redaktionellen Listen (Leitplanke „keine redaktionelle Deutung im UI", E-87). Leerwert heißt Facette inaktiv.

| Facette | Wert-Typ | Quelle im Store | Leerwert |
|---|---|---|---|
| `ort` | String (Stadtname) | `store.locations`, Stadt-konsolidiert über `cityOf` (E-108) | `''` |
| `person` | String (Name) | `store.persons` (aus `hasAssociatedAgent` + `hasOrHadSubject`) | `''` |
| `werk` | String (Name) | `store.works` (mit Komponist) | `''` |
| `rolle` | String (Rollen-Id) | distinkte Rollen über `store.persons[].roles` (Akteursrolle) | `''` |
| `zeitfenster` | `[vonJahr, bisJahr]` | abgeleitet aus `rico:date` der Records und den Event-Daten | `null` (volle Spanne) |
| `sicht` | Sicht-Id | `mobilityClusterFor(eventRole)`, `null` → Bucket `kontext` | `''` |
| `schaerfe` | `'weit'` \| `'eng'` | Modus, kein Entitätsfilter, siehe unten | `'weit'` |

`rolle` ist die Akteursrolle (Dirigent, Sänger, Korrespondenzpartner), nicht die `eventRole`. Die `eventRole` speist ausschließlich die `sicht`-Facette, damit beide nicht vermengt werden. Die bestand-lokale Erschließungs-Umschaltung aus E-116 (`zeigeUnerschlossen`) bleibt view-lokal und wandert nicht in den geteilten State, sie ist eine Darstellungsfrage des Bestands, kein view-übergreifender Datenschnitt.

## Schärfegrade als Filtersemantik

Die wichtigste Designvorgabe (visualisierung-bayreuth.md § Methodische Kopplung). Ein Ort, eine Person, ein Werk koppeln an Daten auf unterschiedlich scharfen Ebenen, der Record-Bezug ist weit und unscharf, die Ereignis-Verortung eng und exakt, und der Filter darf die unscharfe nicht als die scharfe ausgeben.

- `schaerfe = 'weit'`, Record-Bezug. Ein Treffer ist ein Record, der die Entität führt, etwa über `rico:hasOrHadLocation` auf Stadtebene. Weit und unscharf, weil Sammeldokumente (Lebenslauf, Rollenverzeichnis) mehrere Orte und Zeiten bündeln. Das Vorhandensein im selben Record ist kein Nachweis, dass das Ereignis an diesem Ort stattfand.
- `schaerfe = 'eng'`, Ereignis-Verortung. Ein Treffer ist ein `m3gim:SpatiotemporalEvent` mit `atPlace` und Datum und Koordinaten. Raumzeitlich exakt.

Der `schaerfe`-Modus ist kein eigener Entitätsfilter, sondern ein Schalter, der die Auflösung der `ort`- und `zeitfenster`-Facette umstellt: weit filtert über die Record-Menge (`store.locations[name].records`, `store.recordToEvents` nicht nötig), eng filtert über die Event-Menge (`store.mobilityEvents` mit `place === ort`). Die Leitplanke gegen den Bayreuth-Auftrittsnachweis-Fehlschluss ist damit im Modell verankert, nicht der Disziplin überlassen: der Default ist `weit` (der Kontext bleibt sichtbar), aber jeder View zeigt den aktiven Schärfegrad an und nennt im engen Modus die Differenz, wie viele der record-bezogenen Treffer raumzeitlich belegt sind. Das ist die Anwendung des Erschließungsspiegel-Prinzips (E-87) auf den Filter.

## Die eine geteilte Sicht-Facette

Order Punkt: die `sicht`-Facette darf nicht divergierende Definitionen erben. Befund nach Abgleich der beiden Klassifikatoren, des globalen und des view-lokalen.

- Global, kanonisch: `mobilityClusterFor(eventRole)` aus `EVENT_ROLE_TO_MOBILITY_CLUSTER` (`constants.js`), seit E-110 an [data.md § 10](data.md) angeglichen. Liefert eine der Sichten performativ, institutionell, korrespondenz, diskursiv, biografisch oder `null`.
- View-lokal: `ROLE_TO_TYPE` in `mobility.js` (E-109). Sein eigener Kommentar hält fest, dass es sich seit E-110 mit dem globalen Klassifikator deckt und nur feiner ist, weil es einen expliziten Eimer `kontext` für die Nicht-Mobilitäts-Ortsrollen (Entstehung, Erwähnung, Auftrag) führt, dort wo der globale Klassifikator `null` liefert.

Ableitung für den geteilten Filter: die `sicht`-Facette nutzt `mobilityClusterFor` als alleinige Quelle und faltet dessen `null`-Rückgabe in eine explizite Option `kontext`, exakt wie `mobility.js` es bereits tut. Damit gibt es eine Sicht-Definition, der view-lokale `ROLE_TO_TYPE` wird in Milestone 4 durch denselben kanonischen Pfad ersetzt, statt parallele Tabellen zu pflegen.

## Verteilung über die bestehende Mechanik

Kein neuer Apparat, der vorhandene Event-Bus und die generische Toolbar werden erweitert.

- Ein geteilter Filter-Halter (Milestone 4: neues Modul `docs/js/ui/filter-state.js`) hält das eine Filter-State-Objekt und bietet `getFilter()`, `setFilter(patch)`, `subscribe(fn)`. `setFilter` merged den Patch und dispatcht ein `m3gim:filter`-CustomEvent über denselben `window`-Kanal, den `events.js` schon trägt. Damit bleibt `events.js` die zentrale Dispatch-Stelle, erweitert um den Filter-Kanal neben dem bestehenden `m3gim:navigate`.
- Die Views Bestand, Chronik, Netzwerk und Karte abonnieren beim Render und zeichnen bei Filteränderung neu, indem sie ihre bestehende Filterfunktion auf den geteilten State statt auf privaten State anwenden (Bestand und Chronik über `filterByToolbarState`, Netzwerk über seine Sidebar-Logik, Karte über ihren Sicht- und Zeit-Filter).
- Die generische `buildToolbar` (`_toolbar.js`) wird zur Sicht auf den geteilten State: `setFacet` schreibt über `setFilter`, der initiale und der reaktive Zustand kommen aus `getFilter`, und die Toolbar abonniert, um externe Änderungen zu spiegeln (ein Klick auf einen Kartenknoten setzt `ort`, die Ort-Combobox im Bestand zieht nach). Das ist die konkrete Integrationsfläche, `events.js` plus `buildToolbar`, nicht ein erfundener Mechanismus.
- `onViewNavigate` bleibt unverändert für den orthogonalen Sprung „öffne diesen Record und scrolle hin", der Tab-Aktivierung plus Scroll trägt, nicht Filterung.

## Welcher View teilt welche Facette

Nicht jede Facette ist in jedem View gleich sinnvoll. Die Matrix nennt, wo eine Facette primär (●), unterstützend (○) oder datenseitig schwach (·) wirkt.

| Facette | Bestand | Chronik | Netzwerk | Karte |
|---|:--:|:--:|:--:|:--:|
| `ort` | ● | ● | ○ | ● |
| `person` | ● | ● | ● | ○ |
| `werk` | ● | ● | ○ | · |
| `rolle` | ● | ○ | ● | · |
| `zeitfenster` | ○ | ● | ● | ● |
| `sicht` | · | ○ | ○ | ● |
| `schaerfe` | ● | ● | ● | ● |

Lesart. Zeit ist in Chronik, Netzwerk (E-93/E-94) und Karte (Zeitregler) bereits primär und braucht nur die Kopplung an das geteilte `zeitfenster`. Sicht ist auf der Karte primär (Legende existiert), anderswo unterstützend. Person trägt überall. Werk und Sicht sind auf der Karte datenschwach, weil ein Record ohne verortetes Event keine Koordinaten hat, genau hier greift der Schärfegrad: die Karte ist intrinsisch `eng`, das Netzwerk intrinsisch `weit`.

## Bayreuth 1951 bis 1953 als durchgerechnetes Filterergebnis

Der Bayreuth-Befund liegt in [visualisierung-bayreuth.md](visualisierung-bayreuth.md), die laufenden Zählstände im generierten Quality-Snapshot (`data/reports/quality-snapshot.md`), reproduzierbar über `python scripts/scout-coverage.py Bayreuth`. Qualitativ: Bayreuth (`wd:Q3923`) erscheint in mehreren Records über die Rollen auffuehrungsort, gastspiel und erwähnt, ein Teil davon ist als `m3gim:SpatiotemporalEvent` verortet, datiert und mit Koordinaten belegt, der größere Teil bleibt record-bezogen ohne Ereignis-Verortung. Das Akteursfeld um Malaniuk, Wieland Wagner, Wilhelm Pitz und das Bayreuther Ensemble spannt sich über die Record-Menge. Belegte Spanne 1951 bis 1953, über 1953 hinaus kein Bayreuth-Bezug in der Datengrundlage, während die Literatur bis 1958 führt (V1 in visualisierung-bayreuth.md).

Setzt der Operator `ort = 'Bayreuth'`, ergibt sich pro View, nach Schärfegrad getrennt. Die Mengen sind keine festen Zahlen, sondern Schnitte derselben Datengrundlage.

| View | `schaerfe = 'weit'` (Record-Bezug) | `schaerfe = 'eng'` (Ereignis-Verortung) |
|---|---|---|
| Bestand | alle Bayreuth-Records als Zeilen | nur die Records, die die verorteten Events tragen |
| Chronik | Records am Jahr gruppiert, undatierte in der Gruppe „ohne Datum" | die datierten Events an ihren Jahren |
| Netzwerk | Ko-Okkurrenznetz aller Akteure über die Bayreuth-Records | nur event-belegte Akteure, deutlich schmaler |
| Karte | datenschwach (Records ohne Event tragen keine Koordinaten) | die Bayreuth-Punkte, der raumzeitlich saubere Kern |

Das Zeitfenster 1951 bis 1953 fällt aus den Daten, es wird nicht gesetzt, sondern ergibt sich. Die Tabelle ist zugleich die Probe auf die Schärfegrad-Semantik, Karte und Netzwerk gehen auf denselben Ort-Schnitt auf gegensätzlichen Schärfegraden, und genau das macht der Filter sichtbar, statt eine der beiden Mengen als die Wahrheit auszugeben.

## Milestone 4, Scope (nicht bauen)

Der Bau bleibt propose-first gated, hier nur der abgegrenzte Umfang.

- Neues Modul `docs/js/ui/filter-state.js` mit `getFilter`/`setFilter`/`subscribe` und dem `m3gim:filter`-Kanal in `events.js`.
- `buildToolbar` (`_toolbar.js`) gegen den geteilten State rückverdrahten, Facetten `ort`, `person`, `werk`, `rolle`, `zeitfenster`, `sicht`, `schaerfe` als geteilte Controls, Bestand und Chronik darauf umstellen.
- Netzwerk-Sidebar-Zeitfenster und Karten-Sicht-/Zeit-Filter an denselben State koppeln, den view-lokalen `ROLE_TO_TYPE` durch `mobilityClusterFor` ersetzen.
- Schärfegrad-Schalter als geteiltes Control plus pro View die Schärfegrad-Anzeige mit Differenznennung im engen Modus.
- Bayreuth 1951 bis 1953 als reines Filterergebnis sichtbar, ohne eigenen View.

Grün-Kriterium Milestone 4: neuer Smoke-Canary, der einen geteilten Filter setzt und die synchrone Wirkung in den Views Bestand, Chronik, Netzwerk und Karte prüft, JS-Suite und pytest frontend-contract grün, Screenshot-Spur für die operator-gated Live-Sicht.

## Verifikation Milestone 3

Maschinelles Grün-Kriterium dieses Entwurfs: das Dokument existiert und ist nach main gepusht, [decisions.md](decisions.md) E-117 und der Status-Tracker in [plan.md](plan.md) verweisen darauf, der Scout ist frisch gegen `docs/data/m3gim.jsonld` gelaufen und der Bayreuth-Befund über die Spanne 1951 bis 1953 hier verankert (Zählstände im Quality-Snapshot `data/reports/quality-snapshot.md`).

## Offene Punkte

- Default-Schärfegrad pro View, falls `weit` auf der Karte irreführt (Vorschlag: Karte erzwingt `eng`, weil sie nichts anderes ehrlich zeigen kann).
- Persistenz des Filters über Tab-Wechsel hinaus (Vorschlag: ja, der geteilte State überlebt den Tab-Wechsel, das ist der Sinn).
- Verhältnis zur bestand-lokalen Erschließungs-Umschaltung (E-116), bleibt view-lokal, nicht im geteilten State.

## Related

- [[visualisierung-bayreuth]], der Bayreuth-Befund und die Schärfegrade `weit` und `eng`.
- [[architecture]], Store-Format, Views, Event-Bus.
- [[decisions]], E-110 (Sicht-Klassifikator), E-108 (cityOf), E-53 (Event-Bus), E-117 (dieser Entwurf).
- [[data]] § 10, die Mobilitätssichten.
