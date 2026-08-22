/**
 * Erschliessungsgrad einer Auswertung.
 *
 * Der Bestand ist katalogisiert, aber nur zu einem Teil verknuepft. Jede
 * Auswertung, die Personen, Orte, Werke oder Rollen braucht, laeuft deshalb
 * auf einem Ausschnitt. Ohne Angabe liest der Betrachter das Aggregat als
 * Aussage ueber den ganzen Bestand.
 *
 * Diese Datei haelt die Rechnung getrennt von der Darstellung: `coverage` ist
 * rein und pruefbar, `coverageNote` baut daraus die eine Formulierung, die
 * ueberall gleich lautet.
 */

import { el } from '../utils/dom.js';

/**
 * @param {Object} store
 * @param {Iterable<string>} recordIds  @id der Records, auf denen die
 *   Auswertung beruht. Dubletten werden zusammengefasst.
 * @returns {{used:number, total:number, share:number}} share in [0,1];
 *   0 bei leerem Bestand, damit keine Division durch null entsteht.
 */
export function coverage(store, recordIds) {
  const total = store && store.allRecords ? store.allRecords.length : 0;
  const seen = new Set();
  for (const id of recordIds || []) {
    if (typeof id === 'string' && id) seen.add(id);
  }
  const used = Math.min(seen.size, total || seen.size);
  return { used, total, share: total ? used / total : 0 };
}

/**
 * Die Angabe als Textknoten, eine Formulierung fuer alle Ansichten.
 * @param {Object} store
 * @param {Iterable<string>} recordIds
 * @param {string} was  woraus die Auswertung besteht, etwa 'Dokumenten'
 * @returns {HTMLElement}
 */
export function coverageNote(store, recordIds, was = 'Dokumenten') {
  const { used, total } = coverage(store, recordIds);
  return el('p', { className: 'coverage-note' },
    el('span', { className: 'coverage-note__figure' }, `${used} von ${total}`),
    el('span', { className: 'coverage-note__text' },
      ` ${was} des Bestands tragen diese Auswertung.`));
}

/**
 * Reine Textform, wo kein Element passt (Caption, title-Attribut).
 * @returns {string}
 */
export function coverageText(store, recordIds, was = 'Dokumenten') {
  const { used, total } = coverage(store, recordIds);
  return `${used} von ${total} ${was} des Bestands tragen diese Auswertung.`;
}
