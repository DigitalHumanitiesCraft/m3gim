/**
 * Display decisions for Bestand and Chronik, plus minimal deep-link widening.
 * Document search, time and facets are resolved centrally by recordsFor.
 */

import { facetValues } from '../ui/filter-state.js';
import { recordsFor, recordMatchesSearch, facetInventory, yearOf, FACET_KEYS } from '../data/records-for.js';

/** Facetten des geteilten Filters, die im Bestand/in der Chronik schneiden.
 *  Die Liste stand hier als Zweitschrift und lief mit jeder neuen Facette aus
 *  dem Tritt (Land, Verknuepfung); sie ist jetzt die Achsenliste selbst. Ein
 *  Schluessel, den kein Bedienelement schreibt, traegt eine leere Wahl und
 *  schneidet damit nichts. */
const CUT_FACETS = FACET_KEYS;

/** Ob mindestens eine schneidende Facette oder die Suche aktiv ist. Eine leere
 *  Liste heisst inaktiv. */
export function isSharedFiltered(shared) {
  if (shared?.predicates?.length) return true;
  if (shared && (shared.search || '').trim()) return true;
  for (const key of CUT_FACETS) {
    if (facetValues(shared, key).length > 0) return true;
  }
  return false;
}

/** Facets that flatten the Bestand hierarchy. */
const FLATTEN_FACETS = ['institution'];

/** Ob eine dieser Facetten gesetzt ist. Zaehlt fuer die Frage, ob die
 *  Hierarchie abzuflachen und der gefilterte Zaehler zu zeigen ist. */
export function sharedFacetsActive(sharedFilter) {
  for (const key of FLATTEN_FACETS) {
    if (facetValues(sharedFilter, key).length > 0) return true;
  }
  return false;
}

/**
 * Filter-Patch, der `recordId` in den geltenden Schnitt hereinholt.
 *
 * Ein Sprung, der einen Datensatz benennt, muss ihn zeigen. Trifft der Schnitt
 * ihn nicht, verengt er nicht, er verschweigt: ein gesetzter Erschliessungsstand
 * laesst zurueckgestellte und Objekte ohne Angabe aus, und ein Deep Link auf
 * eines von ihnen oeffnete bis dahin nichts, ohne einen Hinweis
 * (Projektleitung, 2026-09-04).
 *
 * Geweitet wird pro blockierender Facette und minimal, um genau einen Wert, den
 * der Datensatz selbst traegt (den seltensten, damit die Weitung so klein wie
 * moeglich bleibt); keine Facette wird fallengelassen, jede Weitung steht
 * danach als Chip. Das Zeitfenster wird auf das Jahr des Datensatzes
 * ausgedehnt. Traegt der Datensatz in einer blockierenden Facette keinen Wert
 * (etwa Personenfilter, Dokument ohne Person) oder schliesst die Freitextsuche
 * ihn aus, bleibt er ausgeschlossen; der Patch nennt diese Facetten in
 * `blocked`, damit der Aufrufer nicht still scheitert.
 *
 * @param {Object} store
 * @param {string} recordId
 * @param {Object} shared  getFilter()-Ergebnis
 * @returns {{patch: Object, blocked: string[]}}
 */
export function widenFilterForRecord(store, recordId, shared) {
  const patch = {};
  const blocked = [];
  if (!store || !recordId) return { patch, blocked };
  const base = new Set([recordId]);
  if (shared?.predicates?.length
      && !recordsFor(store, { predicates: shared.predicates }, { base }).ids.has(recordId)) {
    blocked.push('predicates');
  }

  for (const key of CUT_FACETS) {
    const values = facetValues(shared, key);
    if (values.length === 0) continue;
    if (recordsFor(store, { [key]: values }, { base }).ids.size > 0) continue;
    const own = minimalOwnValue(store, key, base);
    if (own == null) { blocked.push(key); continue; }
    patch[key] = [...values, own];
  }

  const zeitfenster = shared && shared.zeitfenster;
  const record = store.records ? store.records.get(recordId) : null;
  if (Array.isArray(zeitfenster) && record) {
    const year = yearOf(store, record);
    // Ein Datensatz ohne Jahr faellt beim Zeitfenster nicht heraus (recordsFor
    // haelt die Undatierten), also ist nichts zu weiten.
    if (year != null) {
      const [von, bis] = zeitfenster;
      // Eine offene Grenze bleibt offen; sie schliesst niemanden aus.
      if ((von != null && year < von) || (bis != null && year > bis)) {
        patch.zeitfenster = [
          von != null && year < von ? year : von,
          bis != null && year > bis ? year : bis,
        ];
      }
    }
  }

  // Die Freitextsuche laesst sich nicht weiten, ohne sie fallenzulassen; sie
  // wird gemeldet statt still uebergangen.
  const search = ((shared && shared.search) || '').trim();
  if (search && record && !recordMatchesSearch(store, record, search)) {
    blocked.push('search');
  }

  return { patch, blocked };
}

/**
 * Der seltenste Facettenwert, den der Datensatz selbst traegt, oder null.
 *
 * Die Facettenindizes bleiben privat in records-for.js, es gibt keine
 * Rueckwaertssuche vom Datensatz zum Wert. Statt die Indexregeln hier ein
 * zweites Mal zu bauen, wird der eine Aufloeser mit dem Datensatz als eigener
 * Grundmenge befragt.
 */
function minimalOwnValue(store, key, base) {
  let best = null;
  for (const entry of facetInventory(store, key)) {
    if (recordsFor(store, { [key]: [entry.value] }, { base }).ids.size === 0) continue;
    if (best == null || entry.count < best.count) best = entry;
  }
  return best ? best.value : null;
}
