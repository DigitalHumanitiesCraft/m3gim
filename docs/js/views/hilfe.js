/**
 * M³GIM Hilfe Page — Bedienung und Erläuterungen.
 */

import { el, clear } from '../utils/dom.js';

export function renderHilfe(store, container) {
  clear(container);

  const page = el('article', { className: 'page' },

    el('header', { className: 'page__header' },
      el('h1', { className: 'page__title' }, 'Hilfe'),
      el('p', { className: 'page__lead' },
        'Wie Sie die vier Ansichten nutzen und was die angezeigten Daten bedeuten.'
      ),
    ),

    // Tabs
    el('section', { className: 'page__section' },
      el('h2', {}, 'Die vier Ansichten'),
      el('dl', { className: 'page__layers' },
        el('dt', {}, 'Archiv'),
        el('dd', {},
          'Zwei Darstellungen des Bestands: ' +
          'Der Bestand zeigt alle Objekte in einer Tabelle mit Signatur, Typ, Datum und Verknüpfungsanzahl. ' +
          'Die Chronik gruppiert die Objekte nach Ort, Person oder Werk und ordnet sie zeitlich.'
        ),
        el('dt', {}, 'Indizes'),
        el('dd', {},
          'Vier Register: Personen, Organisationen, Orte und Werke. ' +
          'Jeder Eintrag zeigt die Anzahl verknüpfter Objekte. ' +
          'Klick auf einen Eintrag zeigt die zugehörigen Archivalien.'
        ),
        el('dt', {}, 'Matrix'),
        el('dd', {},
          'Heatmap der Verbindungen zwischen Personen und Zeiträumen. ' +
          'Zeilen = Personen, Spalten = Perioden. Klick auf eine Zelle zeigt die zugehörigen Objekte.'
        ),
        el('dt', {}, 'Kosmos'),
        el('dd', {},
          'Netzwerkgraph aller Entitäten und ihrer Verbindungen. ' +
          'Knotengröße = Anzahl verknüpfter Objekte. Klick auf einen Knoten zeigt Details.'
        ),
      ),
    ),

    // Interactions
    el('section', { className: 'page__section' },
      el('h2', {}, 'Interaktion'),
      el('dl', { className: 'page__layers' },
        el('dt', {}, 'Klick auf ein Objekt'),
        el('dd', {},
          'Im Archiv-Bestand öffnet sich eine Detailzeile direkt unter dem Eintrag. ' +
          'In allen anderen Ansichten öffnet sich das Detail-Panel am rechten Rand.'
        ),
        el('dt', {}, 'Farbige Tags'),
        el('dd', {},
          'Tags in der Detailansicht sind klickbar. Ein Klick auf einen Personen- oder Ortsnamen ' +
          'navigiert zum entsprechenden Index-Eintrag.'
        ),
        el('dt', {}, 'Suche und Filter'),
        el('dd', {},
          'Im Archiv-Tab können Sie nach Signatur, Titel oder Inhalt suchen. ' +
          'Zusätzlich lassen sich Dokumenttyp und Person filtern. ' +
          'Die Chronik unterstützt die gleichen Filter.'
        ),
        el('dt', {}, 'Matrix-Drilldown'),
        el('dd', {},
          'Klick auf eine farbige Zelle in der Matrix zeigt die konkreten Objekte, ' +
          'die diese Person in diesem Zeitraum betreffen.'
        ),
      ),
    ),

    // Datumskonventionen
    el('section', { className: 'page__section' },
      el('h2', {}, 'Datumsangaben'),
      el('p', {},
        'Datierungen werden so genau wie möglich aus den Quellen übernommen. ' +
        'Folgende Konventionen gelten:'
      ),
      el('dl', { className: 'page__layers' },
        el('dt', {}, 'o.\u00a0D.'),
        el('dd', {},
          '„Ohne Datum" — Das Objekt enthält keinen datierbaren Hinweis. ' +
          'Dies ist eine bewusste Aussage über die Quelle, keine Lücke in der Erfassung.'
        ),
        el('dt', {}, 'Jahrzehnte'),
        el('dd', {},
          'Einige Objekte sind nur auf ein Jahrzehnt datierbar (z.\u00a0B. „1950er"). ' +
          'In der Chronik werden sie der frühesten Periode dieses Jahrzehnts zugeordnet.'
        ),
        el('dt', {}, 'Zeiträume'),
        el('dd', {},
          'Manche Objekte umfassen einen Zeitraum (z.\u00a0B. „1945–1960"). ' +
          'Sie werden in der Chronik unter der Startperiode angezeigt.'
        ),
      ),
    ),

    // Namenskonventionen
    el('section', { className: 'page__section' },
      el('h2', {}, 'Namenskonventionen'),
      el('p', {},
        'Personennamen werden in der Form „Nachname, Vorname" erfasst. ' +
        'Die Ansetzung orientiert sich an der Gemeinsamen Normdatei (GND) und wird durch Wikidata-Identifikatoren ergänzt, ' +
        'sobald eine Reconciliation durchgeführt wurde.'
      ),
      el('p', {},
        'Ira Malaniuk selbst erscheint nicht als Verknüpfung — sie ist als Bestandsbildnerin implizit in jedem Objekt präsent.'
      ),
    ),

    // FAQ
    el('section', { className: 'page__section' },
      el('h2', {}, 'Häufige Fragen'),
      el('dl', { className: 'page__layers' },
        el('dt', {}, 'Warum zeigen manche Objekte keine Verknüpfungen?'),
        el('dd', {},
          'Die Erschließung folgt einem Schichten-Modell. Objekte in Schicht 1 (Metadaten) haben noch keine ' +
          'Verknüpfungen zu Personen, Orten oder Werken. Diese werden in Schicht 2 ergänzt.'
        ),
        el('dt', {}, 'Was bedeuten die grünen Markierungen?'),
        el('dd', {},
          'Grün (Signal-Grün) zeigt an, dass ein Objekt oder eine Entität mit externen Daten verknüpft ist — ' +
          'entweder als Verknüpfungszähler im Bestand oder als Wikidata-Identifikator im Index.'
        ),
        el('dt', {}, 'Warum erscheint Malaniuk nicht im Personen-Index?'),
        el('dd', {},
          'Der gesamte Bestand ist ihr Teilnachlass. Sie ist als Bestandsbildnerin implizit in jedem Objekt ' +
          'präsent und wird daher nicht als separate Verknüpfung erfasst.'
        ),
      ),
    ),
  );

  container.appendChild(page);
}
