/**
 * Der geteilte Filter im URL-Hash.
 *
 * Die Grammatik lautet `#<tab>[/<recordId>][?<query>]`. Der Pfad-Teil bleibt
 * unveraendert, damit jeder bestehende Deep-Link der Bestandsansicht weiter
 * gilt; der Query-Teil traegt den Schnitt und macht ihn zitierbar.
 *
 * Kodierung: `typ=correspondence&ort=Bayreuth,Wien&person=Malaniuk%2C%20Ira&jahr=1951-1953`.
 * Das Komma trennt die Werte einer Facette. Ein Komma im Wert wird
 * prozentkodiert, was bei der Namensform `Nachname, Vorname` der Regelfall ist;
 * ohne diese Kodierung zerfiele jeder Personenname in zwei Werte.
 *
 * Leerwerte erscheinen nicht: eine leere Auswahl und ein gefaltetes Zeitfenster
 * und ein inaktives Zeitfenster bleiben aus der URL heraus, damit
 * ein unveraenderter Regler keinen Filter behauptet.
 *
 * Reine Funktionen, kein DOM. Das Schreiben in die Adresszeile bleibt Sache
 * des Routers.
 */

import { facetValues } from './filter-state.js';
import {
  normalizePredicates, parsePredicate, serializePredicate,
} from '../data/query-predicates.js';

/** Facetten mit Werteliste, in der Reihenfolge, in der sie in der URL stehen. */
const LIST_KEYS = [
  'docType', 'ort', 'person', 'werk', 'institution', 'land', 'verknuepfung',
];

/** Query-Schluessel des Zeitfensters; der State-Schluessel heisst zeitfenster. */
const YEAR_KEY = 'jahr';
const PREDICATE_KEY = 'praedikat';

/**
 * The document type is serialized as `typ` so every query key is German; the
 * state key stays docType. The old key is still read, so existing deep links
 * keep working.
 */
const TYPE_KEY = 'typ';
const TYPE_STATE_KEY = 'docType';

/**
 * Der Filter als Query-Teil, ohne fuehrendes Fragezeichen.
 * @param {Object} filter  getFilter()-Ergebnis
 * @returns {string} leer, wenn keine Facette aktiv ist
 */
export function serializeFilter(filter) {
  const f = filter || {};
  const parts = [];
  for (const key of LIST_KEYS) {
    const values = facetValues(f, key);
    if (values.length === 0) continue;
    const urlKey = key === TYPE_STATE_KEY ? TYPE_KEY : key;
    parts.push(`${urlKey}=${values.map(encodeURIComponent).join(',')}`);
  }
  if (Array.isArray(f.zeitfenster)) {
    const [von, bis] = f.zeitfenster;
    if (Number.isFinite(von) && Number.isFinite(bis)) parts.push(`${YEAR_KEY}=${von}-${bis}`);
  }
  const search = (f.search || '').trim();
  if (search) parts.push(`suche=${encodeURIComponent(search)}`);
  for (const predicate of normalizePredicates(f.predicates)) {
    parts.push(`${PREDICATE_KEY}=${encodeURIComponent(serializePredicate(predicate))}`);
  }
  return parts.join('&');
}

/**
 * Query-Teil als Patch fuer setFilter. Unbekannte Schluessel und unbrauchbare
 * Werte fallen weg, statt geraten zu werden.
 * @param {string} query  mit oder ohne fuehrendes Fragezeichen
 * @returns {Object}
 */
export function parseFilterQuery(query) {
  const patch = {};
  if (typeof query !== 'string') return patch;
  const raw = query.startsWith('?') ? query.slice(1) : query;
  if (!raw) return patch;

  let typSeen = false;
  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    if (eq < 1) continue;
    const rawKey = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    const key = rawKey === TYPE_KEY ? TYPE_STATE_KEY : rawKey;
    // typ beats the docType alias regardless of the order they appear in
    if (rawKey === TYPE_STATE_KEY && typSeen) continue;
    if (rawKey === TYPE_KEY) typSeen = true;
    if (LIST_KEYS.includes(key)) {
      const values = value.split(',')
        .map(v => safeDecode(v))
        .filter(v => v.length > 0);
      if (values.length > 0) patch[key] = values;
      continue;
    }
    if (key === YEAR_KEY) {
      const window = parseYearWindow(value);
      if (window) patch.zeitfenster = window;
      continue;
    }
    if (key === 'suche') {
      const s = safeDecode(value).trim();
      if (s) patch.search = s;
      continue;
    }
    if (key === PREDICATE_KEY) {
      if (!patch.predicates) patch.predicates = [];
      patch.predicates.push(parsePredicate(safeDecode(value)));
    }
  }
  if (patch.predicates) patch.predicates = normalizePredicates(patch.predicates);
  return patch;
}

/**
 * Hash in Pfad und Query zerlegen. Der Query-Teil wird abgetrennt, bevor der
 * Pfad an `/` aufgeteilt wird; sonst liefe der Datensatz-Deep-Link in den
 * Filter hinein.
 * @param {string} hash  mit oder ohne fuehrende Raute
 * @returns {{path: string, query: string}}
 */
export function splitHash(hash) {
  const raw = typeof hash === 'string' ? hash.replace(/^#/, '') : '';
  const q = raw.indexOf('?');
  if (q === -1) return { path: raw, query: '' };
  return { path: raw.slice(0, q), query: raw.slice(q + 1) };
}

/**
 * Hash aus Tab, optionalem Datensatz und Filter zusammensetzen.
 * @param {string} tab
 * @param {?string} recordId
 * @param {Object} filter
 * @param {string} [extra] view parameters standing beside the filter
 * @returns {string} mit fuehrender Raute
 */
export function buildHash(tab, recordId, filter, extra) {
  let hash = '#' + tab;
  if (recordId) hash += '/' + encodeURIComponent(recordId);
  const query = [serializeFilter(filter), extra || ''].filter(Boolean).join('&');
  if (query) hash += '?' + query;
  return hash;
}

/** Does the query key belong to the shared filter? */
export function isFilterKey(key) {
  const stateKey = key === TYPE_KEY ? TYPE_STATE_KEY : key;
  return LIST_KEYS.includes(stateKey) || key === YEAR_KEY
    || key === 'suche' || key === PREDICATE_KEY;
}

/** Whether a query explicitly supplies shared filter state. */
export function hasFilterQuery(query) {
  const raw = String(query || '').replace(/^\?/, '');
  return raw.split('&').some((pair) => {
    const eq = pair.indexOf('=');
    return eq > 0 && isFilterKey(pair.slice(0, eq));
  });
}

/**
 * The part of a query the shared filter does not own, verbatim.
 *
 * The router rewrites the query on every filter change. Without carrying these
 * pairs over, a view parameter beside the filter was lost as soon as the
 * address named a cut as well, so `#netzwerk?ort=Bayreuth&knoten=…` reached the
 * view without its node.
 *
 * @param {string} query  with or without a leading question mark
 * @returns {string} empty when the query carries filter keys only
 */
export function viewParams(query) {
  if (typeof query !== 'string') return '';
  const raw = query.startsWith('?') ? query.slice(1) : query;
  if (!raw) return '';
  return raw.split('&').filter((pair) => {
    const eq = pair.indexOf('=');
    return eq > 0 && !isFilterKey(pair.slice(0, eq));
  }).join('&');
}

/** Prozentkodierung aufloesen; eine kaputte Sequenz bleibt, wie sie steht. */
function safeDecode(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

/** `1951-1953` als geordnetes Fenster; alles andere ist unbrauchbar. */
function parseYearWindow(value) {
  const m = /^(-?\d{1,4})-(-?\d{1,4})$/.exec(value);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [Math.min(a, b), Math.max(a, b)];
}
