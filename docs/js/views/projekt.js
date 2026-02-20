/**
 * M³GIM Projekt Page — Quellenbeschreibung, Tektonik, Erfassung, Modellierung.
 */

import { el, clear } from '../utils/dom.js';

export function renderProjekt(store, container) {
  clear(container);

  const linkedCount = store.allRecords.filter(r => {
    return r['rico:hasOrHadAgent'] || r['rico:hasOrHadLocation'] ||
           r['rico:hasOrHadSubject'] || r['m3gim:mentions'];
  }).length;
  const pct = Math.round(linkedCount / store.allRecords.length * 100);

  // Count Konvolute with children (erschlossene Konvolute)
  const erschlosseneKonvolute = store.konvolute.size;
  let erschlosseneEinzelstuecke = 0;
  for (const [, children] of store.konvolutChildren) {
    erschlosseneEinzelstuecke += children.filter(cid => !store.folioIds.has(cid)).length;
  }

  const page = el('article', { className: 'page' },

    el('header', { className: 'page__header' },
      el('h1', { className: 'page__title' }, 'Projekt'),
      el('p', { className: 'page__lead' },
        'Der Teilnachlass der Mezzosopranistin Ira Malaniuk (1919\u20132009) an der Kunstuniversit\u00e4t Graz \u2014 ' +
        'Quellen, Tektonik und Erschlie\u00dfungsprozess.'
      ),
    ),

    // Quellenbeschreibung
    el('section', { className: 'page__section' },
      el('h2', {}, 'Der Teilnachlass'),
      el('p', {},
        'Das Universit\u00e4tsarchiv der Kunstuniversit\u00e4t Graz (UAKUG) bewahrt einen Teilnachlass der ' +
        'ukrainisch-\u00f6sterreichischen Mezzosopranistin Ira Malaniuk unter der Signatur UAKUG/NIM. ' +
        'Die Materialien dokumentieren eine internationale Opernkarriere, die von Lemberg \u00fcber Z\u00fcrich und M\u00fcnchen ' +
        'bis nach Wien, Bayreuth, Buenos Aires und London f\u00fchrte.'
      ),
      el('p', {},
        'Der Bestand umfasst Programme, Korrespondenzen, Vertr\u00e4ge, Rezensionen, Plakate, Urkunden, ' +
        'Fotografien und pers\u00f6nliche Dokumente aus dem Zeitraum 1934 bis 2009. ' +
        'Er ist eine zentrale Quelle f\u00fcr die Erforschung k\u00fcnstlerischer Mobilit\u00e4t im 20.\u00a0Jahrhundert.'
      ),
    ),

    // Tektonik
    el('section', { className: 'page__section' },
      el('h2', {}, 'Tektonik'),
      el('p', {},
        'Der Teilnachlass gliedert sich in drei Bestandsgruppen mit insgesamt ' +
        store.allRecords.length + ' Archiveinheiten:'
      ),
      el('table', { className: 'page__table' },
        el('thead', {},
          el('tr', {},
            el('th', {}, 'Bestandsgruppe'),
            el('th', {}, 'Einheiten'),
            el('th', {}, 'Signaturschema'),
            el('th', {}, 'Materialien'),
          ),
        ),
        el('tbody', {},
          el('tr', {},
            el('td', {}, 'Hauptbestand'),
            el('td', {}, '255'),
            el('td', { className: 'mono' }, 'UAKUG/NIM_XXX'),
            el('td', {}, 'Programme, Korrespondenzen, Vertr\u00e4ge, Rezensionen, Urkunden, Sammlungen'),
          ),
          el('tr', {},
            el('td', {}, 'Plakate'),
            el('td', {}, '26'),
            el('td', { className: 'mono' }, 'UAKUG/NIM/PL_XX'),
            el('td', {}, 'Opern- und Konzertplakate (1940er\u20131960er Jahre)'),
          ),
          el('tr', {},
            el('td', {}, 'Tontr\u00e4ger'),
            el('td', {}, '1'),
            el('td', { className: 'mono' }, 'UAKUG/NIM_TT_01'),
            el('td', {}, 'Audioaufnahmen'),
          ),
        ),
      ),
      el('p', {},
        'Jede Archiveinheit im Hauptbestand ist ein Konvolut \u2014 ein physischer Umschlag oder eine Mappe, ' +
        'die mehrere Einzeldokumente enthalten kann. Die Titel auf den Konvoluten stammen h\u00e4ufig ' +
        'von handschriftlichen Aufschriften auf den Umschl\u00e4gen selbst.'
      ),
      el('p', {},
        'Bei ' + erschlosseneKonvolute + ' Konvoluten (NIM_003, NIM_004, NIM_007) wurden die ' +
        erschlosseneEinzelstuecke + ' enthaltenen Einzelst\u00fccke bereits detailliert erfasst. ' +
        'Die \u00fcbrigen Konvolute sind bisher nur auf der Ebene der Archiveinheit beschrieben \u2014 ' +
        'ihre interne Zusammensetzung wird im Rahmen der laufenden Erschlie\u00dfung erg\u00e4nzt.'
      ),
    ),

    // Erfassung
    el('section', { className: 'page__section' },
      el('h2', {}, 'Erfassung'),
      el('p', {},
        'Die Erschlie\u00dfung erfolgt durch Studierende und Mitarbeiter:innen der KUG Graz ' +
        'in einem kollaborativen Google-Spreadsheet. Die Erfassung folgt einem dreistufigen Schichten-Modell:'
      ),
      el('dl', { className: 'page__layers' },
        el('dt', {}, 'Schicht 1 \u2014 Metadaten'),
        el('dd', {},
          'Grundlegende Beschreibung jeder Archiveinheit: Signatur, Titel, Dokumenttyp, Datierung, Sprache, Umfang. ' +
          'Dies entspricht der klassischen archivischen Verzeichnung.'
        ),
        el('dt', {}, 'Schicht 2 \u2014 Verkn\u00fcpfungen'),
        el('dd', {},
          'Verbindung der Objekte mit Personen, Organisationen, Orten und Werken. ' +
          'Jede Verkn\u00fcpfung erh\u00e4lt eine Rolle (z.\u00a0B. Absender, Auff\u00fchrungsort, erw\u00e4hntes Werk). ' +
          'Aktuell haben ' + linkedCount + ' von ' + store.allRecords.length + ' Objekten (' + pct + '\u2009%) mindestens eine Verkn\u00fcpfung.'
        ),
        el('dt', {}, 'Schicht 3 \u2014 Interpretation'),
        el('dd', {},
          'Kontextualisierung und wissenschaftliche Einordnung: Mobilit\u00e4tskategorien, ' +
          'biografische Zuordnung, Netzwerkanalyse. Diese Schicht wird in den Visualisierungen sichtbar.'
        ),
      ),
    ),

    // Modellierung
    el('section', { className: 'page__section' },
      el('h2', {}, 'Modellierung'),
      el('p', {},
        'Die erfassten Daten werden \u00fcber eine automatisierte Pipeline in ein strukturiertes Format \u00fcberf\u00fchrt:'
      ),
      el('ol', { className: 'page__pipeline' },
        el('li', {},
          el('strong', {}, 'Exploration'),
          ' \u2014 Analyse der Rohdaten, Erkennung von Strukturproblemen'
        ),
        el('li', {},
          el('strong', {}, 'Validierung'),
          ' \u2014 Normalisierung, Pflichtfeld-Pr\u00fcfung, Cross-Table-Checks'
        ),
        el('li', {},
          el('strong', {}, 'Transformation'),
          ' \u2014 Konvertierung zu JSON-LD nach dem internationalen Archivstandard RiC-O 1.1 mit projektspezifischen m3gim-Erweiterungen'
        ),
        el('li', {},
          el('strong', {}, 'View-Generierung'),
          ' \u2014 Erzeugung optimierter Datenstrukturen f\u00fcr jede Visualisierung'
        ),
      ),
      el('p', {},
        'Das resultierende Datenmodell beschreibt Archiveinheiten, ihre Verkn\u00fcpfungen zu Personen, Orten, ' +
        'Institutionen und Werken sowie die semantischen Rollen dieser Beziehungen. ' +
        'Eine detaillierte Beschreibung der Ontologie, Verkn\u00fcpfungstypen und Identifikatoren findet sich auf der '
      ),
      el('p', {},
        el('a', { href: '#modell', className: 'page__link' }, '\u2192 Seite \u201eDatenmodell\u201c')
      ),
    ),

    // Abwesenheits-Semantik
    el('section', { className: 'page__section' },
      el('h2', {}, 'Leere Felder und Abwesenheit'),
      el('p', {},
        'Ein leeres Feld bedeutet: \u201eIn dieser Quelle nicht ermittelbar.\u201c ' +
        'Es ist keine Aussage dar\u00fcber, ob die Information existiert \u2014 nur, dass sie aus dem vorliegenden Material nicht abgeleitet werden kann.'
      ),
      el('p', {},
        'Objekte ohne Datum werden als \u201eo.\u00a0D.\u201c (ohne Datum) angezeigt. ' +
        'Objekte ohne Verkn\u00fcpfungen befinden sich typischerweise noch in Schicht\u00a01 der Erschlie\u00dfung.'
      ),
    ),
  );

  container.appendChild(page);
}
