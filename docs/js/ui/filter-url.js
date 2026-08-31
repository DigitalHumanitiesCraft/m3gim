/**
 * Der geteilte Filter im URL-Hash.
 *
 * Die Grammatik lautet `#<tab>[/<recordId>][?<query>]`. Der Pfad-Teil bleibt
 * unveraendert, damit jeder bestehende Deep-Link der Bestandsansicht weiter
 * gilt; der Query-Teil traegt den Schnitt und macht ihn zitierbar.
 *
 * Kodierung: `ort=Bayreuth,Wien&person=Malaniuk%2C%20Ira&jahr=1951-1953&schaerfe=eng`.
 * Das Komma trennt die Werte einer Facette. Ein Komma im Wert wird
 * prozentkodiert, was bei der Namensform `Nachname, Vorname` der Regelfall ist;
 * ohne diese Kodierung zerfiele jeder Personenname in zwei Werte.
 *
 * Leerwerte erscheinen nicht: eine leere Auswahl, ein gefaltetes Zeitfenster
 * (yearRangeToZeitfenster liefert dort null) und der Default-Schaerfegrad
 * `weit` bleiben aus der URL heraus, damit ein unveraenderter Regler keinen
 * Filter behauptet.
 *
 * Reine Funktionen, kein DOM. Das Schreiben in die Adresszeile bleibt Sache
 * des Routers.
 */

import { facetValues } from './filter-state.js';

/** Facetten mit Werteliste, in der Reihenfolge, in der sie in der URL stehen. */
const LIST_KEYS = ['ort', 'person', 'werk', 'institution', 'rolle', 'sicht'];

/** Query-Schluessel des Zeitfensters; der State-Schluessel heisst zeitfenster. */
const YEAR_KEY = 'jahr';

const SCHAERFE_VALUES = new Set(['weit', 'eng']);

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
    parts.push(`${key}=${values.map(encodeURIComponent).join(',')}`);
  }
  if (Array.isArray(f.zeitfenster)) {
    const [von, bis] = f.zeitfenster;
    if (Number.isFinite(von) && Number.isFinite(bis)) parts.push(`${YEAR_KEY}=${von}-${bis}`);
  }
  if (f.schaerfe === 'eng') parts.push('schaerfe=eng');
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

  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    if (eq < 1) continue;
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
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
    if (key === 'schaerfe' && SCHAERFE_VALUES.has(value)) patch.schaerfe = value;
  }
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
 * @returns {string} mit fuehrender Raute
 */
export function buildHash(tab, recordId, filter) {
  let hash = '#' + tab;
  if (recordId) hash += '/' + encodeURIComponent(recordId);
  const query = serializeFilter(filter);
  if (query) hash += '?' + query;
  return hash;
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
