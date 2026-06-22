/**
 * Reine Datenschicht der Mobilitäts-Chronik (kein DOM, kein d3).
 * Spiegelt den statistics-data.js-Split: die View orchestriert nur,
 * Sicht-Ableitung / Sekundär-Datierung / Dekaden-Aggregation leben hier.
 */

import { extractYear } from '../utils/date-parser.js';
import { mobilityClusterFor } from '../data/constants.js';

// Geteilte Sichten-Konstanten weiterreichen, damit die View eine Quelle hat.
export { SICHTEN, SICHT_COLOR } from './statistics-data.js';

// Spiegel der Loader-Liste (loader.js TYPED_DATE_PROPS): typisierte Datumsfelder,
// aus denen ein undatierter Record sekundär datiert werden kann. Reihenfolge =
// Priorität.
const TYPED_DATE_PROPS = [
  'm3gim:auffuehrungsdatum', 'm3gim:premieredatum', 'm3gim:auftrittsdatum',
  'm3gim:absendedatum', 'm3gim:empfangsdatum', 'm3gim:gespraechsdatum',
  'm3gim:erscheinungsdatum', 'm3gim:ausstellungsdatum', 'm3gim:ausstrahlungsdatum',
  'm3gim:probenbeginn', 'm3gim:probendatum', 'm3gim:spielzeitVon',
  'm3gim:ueberweisungsdatum', 'm3gim:abreisedatum',
];

// Kurzlabel für die Datierungsherkunft (Badge am sekundär-datierten Chip).
const SECONDARY_LABEL = {
  'm3gim:auffuehrungsdatum': 'Aufführungsdatum',
  'm3gim:premieredatum': 'Premierendatum',
  'm3gim:auftrittsdatum': 'Auftrittsdatum',
  'm3gim:absendedatum': 'Absendedatum',
  'm3gim:empfangsdatum': 'Empfangsdatum',
  'm3gim:gespraechsdatum': 'Gesprächsdatum',
  'm3gim:erscheinungsdatum': 'Erscheinungsdatum',
  'm3gim:ausstellungsdatum': 'Ausstellungsdatum',
  'm3gim:ausstrahlungsdatum': 'Ausstrahlungsdatum',
  'm3gim:probenbeginn': 'Probenbeginn',
  'm3gim:probendatum': 'Probendatum',
  'm3gim:spielzeitVon': 'Spielzeitbeginn',
  'm3gim:ueberweisungsdatum': 'Überweisungsdatum',
  'm3gim:abreisedatum': 'Abreisedatum',
};

/**
 * Dominante Mobilitätssicht eines Records aus seinen SpatiotemporalEvents.
 * Form-ist-Signal: kein STE → keine Sicht (Chip bleibt monochrom); ein STE mit
 * nur unzuordenbarer Rolle → 'neutral' (Ereignis vorhanden, Sicht nicht erschlossen).
 * @returns {{sicht: string|null, hasSte: boolean, divergent: boolean, sichten: string[]}}
 */
export function sichtForRecord(store, rid) {
  const eventIds = store.recordToEvents?.get(rid) || [];
  if (eventIds.length === 0) {
    return { sicht: null, hasSte: false, divergent: false, sichten: [] };
  }
  const counts = new Map();
  for (const eid of eventIds) {
    const ev = store.mobilityEvents.get(eid);
    if (!ev) continue;
    const key = mobilityClusterFor(ev.role) || 'neutral';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const real = [...counts.entries()].filter(([k]) => k !== 'neutral');
  let sicht = null;
  if (real.length > 0) {
    real.sort((a, b) => b[1] - a[1]);
    sicht = real[0][0];
  } else if (counts.has('neutral')) {
    sicht = 'neutral';
  }
  const distinctReal = real.map(([k]) => k);
  return { sicht, hasSte: true, divergent: distinctReal.length > 1, sichten: distinctReal };
}

/**
 * Sekundäre Jahres-Datierung eines undatierten Records (kein `rico:date`-Jahr):
 * typisiertes Datumsfeld (Priorität) oder STE.atDate. Niemals mit `rico:date`
 * gleichsetzen — der Aufrufer markiert die Herkunft sichtbar.
 * @returns {{year: number, source: string, label: string}|null}
 */
export function secondaryYearForRecord(store, record) {
  for (const prop of TYPED_DATE_PROPS) {
    const v = record[prop];
    if (!v) continue;
    const values = Array.isArray(v) ? v : [v];
    for (const val of values) {
      if (typeof val !== 'string') continue;
      const y = extractYear(val.replace(/^(circa|vor|nach):/, ''));
      if (y) return { year: y, source: prop, label: SECONDARY_LABEL[prop] || 'typisiertes Datum' };
    }
  }
  const eventIds = store.recordToEvents?.get(record['@id']) || [];
  for (const eid of eventIds) {
    const ev = store.mobilityEvents.get(eid);
    if (ev && ev.date) {
      const y = extractYear(ev.date);
      if (y) return { year: y, source: '__ste', label: 'Ereignisdatum (STE)' };
    }
  }
  return null;
}

/**
 * Dekaden×Sicht-Stapel über eine Record-Menge — record-basiert, spiegelt die
 * Chips (ein Record = ein Punkt = ein dominanter Sicht-Akzent). Lückendekaden
 * werden gefüllt, damit der Header eine durchgehende Achse behält.
 * @param {Array<{year: number|null, sicht: string}>} items
 * @returns {{rows: Array<{decade:number,total:number,bySicht:Object}>, dated:number, undated:number}}
 */
export function aggregateDecadeStacks(items) {
  const buckets = new Map(); // decade -> Map<sichtKey, count>
  let dated = 0;
  let undated = 0;
  for (const it of items) {
    const sicht = it.sicht || 'neutral';
    if (it.year == null || !Number.isFinite(it.year)) { undated++; continue; }
    dated++;
    const decade = Math.floor(it.year / 10) * 10;
    if (!buckets.has(decade)) buckets.set(decade, new Map());
    const m = buckets.get(decade);
    m.set(sicht, (m.get(sicht) || 0) + 1);
  }
  const rows = [];
  if (buckets.size > 0) {
    const min = Math.min(...buckets.keys());
    const max = Math.max(...buckets.keys());
    for (let d = min; d <= max; d += 10) {
      const m = buckets.get(d) || new Map();
      const bySicht = {};
      let total = 0;
      for (const [k, c] of m) { bySicht[k] = c; total += c; }
      rows.push({ decade: d, total, bySicht });
    }
  }
  return { rows, dated, undated };
}
