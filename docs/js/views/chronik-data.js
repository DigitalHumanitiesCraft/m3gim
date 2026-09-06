/**
 * Reine Datenschicht der Mobilitäts-Chronik (kein DOM, kein d3).
 * Spiegelt den statistik-data.js-Split: die View orchestriert nur, die Achse
 * der Datierungsrollen und die Dekaden-Aggregation leben hier. Der Zeitanker
 * kommt aus `primaryYear()` der Datenschicht.
 */

import { ensureArray } from '../utils/format.js';
import { primaryYear } from '../data/loader.js';
import { rankedRoleScale, REST_COLOR } from './statistik-data.js';

/** Key of the tail: every dating role past the six hues shares one segment.
 *  A header of fourteen greys says less than one honest rest. */
export const REST_KEY = 'weitere';

/**
 * The place label of a record chip: the place of its first located annotation,
 * otherwise its first rico:hasOrHadLocation. A name starting with a digit is a
 * date leaked into the place column ("06-09") and is no place; the record keeps
 * its point, only the pseudo place stays unnamed. Same rule as the map, which
 * skips such occurrences in karte-data.js; not imported from there because the
 * predicate is local to that module (user-story audit 2026-09-04).
 * @returns {string}
 */
export function placeLabelFor(store, record) {
  const rid = record['@id'];
  const eventIds = store.recordToEvents?.get(rid) || [];
  let place = '';
  for (const eid of eventIds) {
    const ev = store.mobilityEvents.get(eid);
    if (ev && ev.place) { place = ev.place; break; }
  }
  if (!place) {
    const locs = ensureArray(record['rico:hasOrHadLocation']);
    if (locs.length > 0) place = locs[0].name || '';
  }
  return /^\d/.test(place.trim()) ? '' : place;
}

/**
 * The dating role of a Zeitanker: the key the Chronik counts and colours it
 * under. Two datings with the same display form are one role, even where one
 * sits at the object and the other at a Verknuepfung; the archival `rico:date`
 * carries none and is therefore named after itself. An undated record has none.
 * @param {?{year:?number, source:?string, label:?string}} anchor  from primaryYear
 * @returns {?{key: string, label: string}}
 */
export function datingRoleOf(anchor) {
  if (!anchor || anchor.year == null || !anchor.source) return null;
  const label = anchor.label || '';
  return { key: label || anchor.source, label: label || 'Quellendatierung' };
}

/**
 * The dating roles of a record set as a colour scale, the six most frequent
 * with a hue of their own and the rest collapsed into one segment. Built over
 * the base set and never over the cut, so a filter moves the sizes and not the
 * colours.
 * @param {Object} store
 * @param {Array<Object>} records
 * @returns {Map<string, {key:string, label:string, count:number, color:string}>}
 */
export function datingRoleScale(store, records) {
  const tally = new Map();
  for (const record of records || []) {
    const role = datingRoleOf(primaryYear(store, record));
    if (!role) continue;
    let e = tally.get(role.key);
    if (!e) { e = { key: role.key, label: role.label, count: 0 }; tally.set(role.key, e); }
    e.count += 1;
  }
  const out = new Map();
  let rest = 0;
  for (const e of rankedRoleScale([...tally.values()]).values()) {
    if (e.color === REST_COLOR) { rest += e.count; continue; }
    out.set(e.key, e);
  }
  if (rest > 0) {
    out.set(REST_KEY, { key: REST_KEY, label: 'Weitere Datierungen', count: rest, color: REST_COLOR });
  }
  return out;
}

/** The segment a Zeitanker falls into; everything past the hues collects under
 *  REST_KEY. Null stays null: the undated record stands at the end of the axis
 *  and in no segment. */
export function datingRoleKey(anchor, scale) {
  const role = datingRoleOf(anchor);
  if (!role) return null;
  return scale && scale.has(role.key) ? role.key : REST_KEY;
}

/**
 * Dekaden×Datierungsrolle-Stapel über eine Record-Menge — record-basiert,
 * spiegelt die Chips (ein Record = ein Punkt = ein Akzent). Lückendekaden
 * werden gefüllt, damit der Header eine durchgehende Achse behält.
 * @param {Array<{year: number|null, role: ?string}>} items
 * @returns {{rows: Array<{decade:number,total:number,byRole:Object}>, dated:number, undated:number}}
 */
export function aggregateDecadeStacks(items) {
  const buckets = new Map(); // decade -> Map<roleKey, count>
  let dated = 0;
  let undated = 0;
  for (const it of items) {
    const role = it.role || REST_KEY;
    if (it.year == null || !Number.isFinite(it.year)) { undated++; continue; }
    dated++;
    const decade = Math.floor(it.year / 10) * 10;
    if (!buckets.has(decade)) buckets.set(decade, new Map());
    const m = buckets.get(decade);
    m.set(role, (m.get(role) || 0) + 1);
  }
  const rows = [];
  if (buckets.size > 0) {
    const min = Math.min(...buckets.keys());
    const max = Math.max(...buckets.keys());
    for (let d = min; d <= max; d += 10) {
      const m = buckets.get(d) || new Map();
      const byRole = {};
      let total = 0;
      for (const [k, c] of m) { byRole[k] = c; total += c; }
      rows.push({ decade: d, total, byRole });
    }
  }
  return { rows, dated, undated };
}
