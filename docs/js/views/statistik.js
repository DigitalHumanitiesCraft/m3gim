/**
 * Statistik-View (Session 37).
 *
 * Read-only Showroom des Bestandes: aggregiert alle Store-Maps zu einer
 * Zusammenschau. Kein Forschungstool -- keine Filter, keine Suche, keine
 * internen Module-Variablen. Jede Sektion ist eine reine Funktion, die
 * store-Daten in DOM-Knoten umwandelt.
 */

import { clear, el } from '../utils/dom.js';
import { logStamp } from '../utils/env.js';

export function renderStatistik(store, container) {
  clear(container);

  const wrap = el('div', { className: 'statistik' });
  wrap.appendChild(buildIntro(store));
  // Sektions-Container bleibt in M0 leer; M1-M4 fuellen ihn sektionsweise.
  const body = el('div', { className: 'statistik__sections' });
  body.appendChild(placeholderSection('Bestand in Zahlen', 'M1'));
  body.appendChild(placeholderSection('Mobilitaetssichten + Geografie', 'M2'));
  body.appendChild(placeholderSection('Netzwerk + Repertoire', 'M3'));
  body.appendChild(placeholderSection('Qualitaet + Finanzen', 'M4'));
  wrap.appendChild(body);

  container.appendChild(wrap);

  logStamp('statistik', [
    ['records', store.recordCount],
    ['konvolute', store.konvolutCount],
    ['events', store.mobilityEvents.size],
    ['personen', store.persons.size],
    ['sektionen', body.childElementCount],
  ]);
}

function buildIntro(store) {
  const intro = el('header', { className: 'statistik__intro' });
  intro.appendChild(el('h2', { className: 'statistik__title' }, 'Statistik'));
  intro.appendChild(el('p', { className: 'statistik__lead' },
    'Zusammenschau des Bestandes: Umfang, Verknuepfungen, Datenqualitaet. '
    + 'Kein Forschungswerkzeug -- zeigt, was in den Daten steckt und was damit moeglich wird.'));
  return intro;
}

function placeholderSection(label, milestone) {
  const section = el('section', { className: 'stat-section stat-section--placeholder' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, label));
  section.appendChild(el('p', { className: 'stat-section__placeholder' },
    `Folgt in Milestone ${milestone}.`));
  return section;
}
