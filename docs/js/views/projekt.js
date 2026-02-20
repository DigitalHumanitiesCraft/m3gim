/**
 * M³GIM Projekt Page — Datenmodell, Erfassung, Erschließungsstand.
 */

import { el, clear } from '../utils/dom.js';

export function renderProjekt(store, container) {
  clear(container);

  const linkedCount = store.allRecords.filter(r => {
    return r['rico:hasOrHadAgent'] || r['rico:hasOrHadLocation'] ||
           r['rico:hasOrHadSubject'] || r['m3gim:mentions'];
  }).length;
  const pct = Math.round(linkedCount / store.allRecords.length * 100);

  const page = el('article', { className: 'page' },

    el('header', { className: 'page__header' },
      el('h1', { className: 'page__title' }, 'Projekt'),
      el('p', { className: 'page__lead' },
        'Wie die Daten im Teilnachlass Malaniuk erfasst, strukturiert und visualisiert werden.'
      ),
    ),

    // Schichten-Modell
    el('section', { className: 'page__section' },
      el('h2', {}, 'Schichten-Modell der Erschließung'),
      el('p', {},
        'Die Erfassung folgt einem dreistufigen Schichten-Modell. Jede Schicht baut auf der vorherigen auf:'
      ),
      el('dl', { className: 'page__layers' },
        el('dt', {}, 'Schicht 1 — Metadaten'),
        el('dd', {},
          'Grundlegende Beschreibung jedes Objekts: Signatur, Titel, Dokumenttyp, Datierung, Umfang. ' +
          'Dies entspricht der klassischen archivischen Verzeichnung.'
        ),
        el('dt', {}, 'Schicht 2 — Verknüpfungen'),
        el('dd', {},
          'Verbindung der Objekte mit Personen, Organisationen, Orten und Werken. ' +
          'Jede Verknüpfung erhält eine Rolle (z.\u00a0B. Absender, Aufführungsort, erwähntes Werk). ' +
          'Aktuell haben ' + linkedCount + ' von ' + store.allRecords.length + ' Objekten (' + pct + '%) mindestens eine Verknüpfung.'
        ),
        el('dt', {}, 'Schicht 3 — Interpretation'),
        el('dd', {},
          'Kontextualisierung und wissenschaftliche Einordnung: Mobilitätskategorien, ' +
          'biografische Zuordnung, Netzwerkanalyse. Diese Schicht wird in den Visualisierungen sichtbar.'
        ),
      ),
    ),

    // Bestandsgruppen
    el('section', { className: 'page__section' },
      el('h2', {}, 'Bestandsgruppen'),
      el('p', {},
        'Der Teilnachlass UAKUG/NIM gliedert sich in drei Bestandsgruppen:'
      ),
      el('table', { className: 'page__table' },
        el('thead', {},
          el('tr', {},
            el('th', {}, 'Gruppe'),
            el('th', {}, 'Objekte'),
            el('th', {}, 'Signaturschema'),
          ),
        ),
        el('tbody', {},
          el('tr', {},
            el('td', {}, 'Hauptbestand'),
            el('td', {}, '255'),
            el('td', { className: 'mono' }, 'UAKUG/NIM_XXX'),
          ),
          el('tr', {},
            el('td', {}, 'Plakate'),
            el('td', {}, '26'),
            el('td', { className: 'mono' }, 'UAKUG/NIM/PL_XX'),
          ),
          el('tr', {},
            el('td', {}, 'Tonträger'),
            el('td', {}, '1'),
            el('td', { className: 'mono' }, 'UAKUG/NIM_TT_01'),
          ),
        ),
      ),
      el('p', {},
        'Drei Objekte sind Konvolute (NIM_003, NIM_004, NIM_007), die jeweils mehrere Einzelstücke enthalten. ' +
        'Die Konvolut-Hierarchie wird im Archiv-Tab durch einrückbare Kindzeilen dargestellt.'
      ),
    ),

    // Pipeline
    el('section', { className: 'page__section' },
      el('h2', {}, 'Daten-Pipeline'),
      el('p', {},
        'Die Daten werden in Google Sheets erfasst und über eine vierstufige Python-Pipeline verarbeitet:'
      ),
      el('ol', { className: 'page__pipeline' },
        el('li', {},
          el('strong', {}, 'Exploration'),
          ' — Analyse der Rohdaten, Erkennung von Strukturproblemen'
        ),
        el('li', {},
          el('strong', {}, 'Validierung'),
          ' — Normalisierung, Pflichtfeld-Prüfung, Cross-Table-Checks'
        ),
        el('li', {},
          el('strong', {}, 'Transformation'),
          ' — Konvertierung zu JSON-LD nach RiC-O 1.1 mit m3gim-Erweiterungen'
        ),
        el('li', {},
          el('strong', {}, 'View-Generierung'),
          ' — Erzeugung optimierter Datenstrukturen für jede Visualisierung'
        ),
      ),
    ),

    // Abwesenheits-Semantik
    el('section', { className: 'page__section' },
      el('h2', {}, 'Leere Felder und Abwesenheit'),
      el('p', {},
        'Ein leeres Feld bedeutet: „In dieser Quelle nicht ermittelbar." ' +
        'Es ist keine Aussage darüber, ob die Information existiert — nur, dass sie aus dem vorliegenden Material nicht abgeleitet werden kann.'
      ),
      el('p', {},
        'Objekte ohne Datum werden als „o.\u00a0D." (ohne Datum) angezeigt. ' +
        'Objekte ohne Verknüpfungen befinden sich typischerweise noch in Schicht 1 der Erschließung.'
      ),
    ),
  );

  container.appendChild(page);
}
