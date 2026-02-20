/**
 * M³GIM About Page — Über das Projekt.
 */

import { el, clear } from '../utils/dom.js';

export function renderAbout(store, container) {
  clear(container);

  const linkedCount = store.allRecords.filter(r => {
    return r['rico:hasOrHadAgent'] || r['rico:hasOrHadLocation'] ||
           r['rico:hasOrHadSubject'] || r['m3gim:mentions'];
  }).length;
  const pct = Math.round(linkedCount / store.allRecords.length * 100);
  const exportDate = store.exportDate ? store.exportDate.split('T')[0] : 'unbekannt';

  const page = el('article', { className: 'page' },

    el('header', { className: 'page__header' },
      el('h1', { className: 'page__title' }, 'Über M³GIM'),
      el('p', { className: 'page__lead' },
        'Mapping Mobile Musicians — Digitale Erschließung des Teilnachlasses Ira Malaniuk am Universitätsarchiv der Kunstuniversität Graz.'
      ),
    ),

    el('section', { className: 'page__section' },
      el('h2', {}, 'Ira Malaniuk (1919–2009)'),
      el('p', {},
        'Die ukrainisch-österreichische Mezzosopranistin Ira Malaniuk gehörte zu den bedeutendsten Sängerinnen der Nachkriegszeit. ' +
        'Ihr Teilnachlass (UAKUG/NIM) am Universitätsarchiv der KUG Graz umfasst 282 Archiveinheiten in drei Bestandsgruppen: ' +
        'Hauptbestand (255 Objekte), Plakate (26 Objekte) und Tonträger (1 Objekt).'
      ),
    ),

    el('section', { className: 'page__section' },
      el('h2', {}, 'Methodik'),
      el('p', {},
        'M³GIM nutzt den Ansatz des Promptotyping: Dokumente und Erfassungsrichtlinien bilden die verbindliche Grundlage (Documents as Source of Truth), ' +
        'während der Code als austauschbares Artefakt gilt (Code as Disposable Artifact). ' +
        'Die Daten werden in Google Sheets erfasst, über eine Python-Pipeline in JSON-LD (RiC-O 1.1) transformiert und im Browser visualisiert.'
      ),
    ),

    el('section', { className: 'page__section' },
      el('h2', {}, 'Datenstand'),
      el('dl', { className: 'page__stats' },
        el('dt', {}, 'Export'), el('dd', {}, exportDate),
        el('dt', {}, 'Archivalien'), el('dd', {}, `${store.allRecords.length} Objekte in ${store.konvolute.size} Konvoluten`),
        el('dt', {}, 'Verknüpfungen'), el('dd', {}, `${linkedCount} Objekte (${pct}%) mit mindestens einer Verknüpfung`),
        el('dt', {}, 'Indizes'), el('dd', {}, `${store.persons.size} Personen, ${store.organizations.size} Organisationen, ${store.locations.size} Orte, ${store.works.size} Werke`),
      ),
    ),

    el('section', { className: 'page__section' },
      el('h2', {}, 'Institution'),
      el('p', {},
        'Kunstuniversität Graz (KUG) — Universitätsarchiv. ' +
        'Signaturschema: UAKUG/NIM.'
      ),
      el('p', { className: 'page__note' },
        'Prototyp — Entwickelt als Digital-Humanities-Projekt.'
      ),
    ),
  );

  container.appendChild(page);
}
