/**
 * Reine Datenschicht der Mobilitäts-Chronik (kein DOM, kein d3).
 * Spiegelt den statistics-data.js-Split: die View orchestriert nur,
 * Sicht-Ableitung / Dekaden-Aggregation leben hier. Die Sekundär-Datierung
 * kommt seit dem zusammengeführten Modell aus `primaryYear()` der Datenschicht.
 */

// Geteilte Sichten-Konstanten weiterreichen, damit die View eine Quelle hat.
export { SICHTEN, SICHT_COLOR } from './statistics-data.js';

/**
 * Dominante Mobilitätssicht eines Records aus seinen verorteten Annotationen.
 * Form-ist-Signal: keine verortete Annotation → keine Sicht (Chip bleibt
 * monochrom); eine verortete Annotation mit sichtloser Rolle → 'neutral'
 * (Ereignis vorhanden, Sicht nicht erschlossen).
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
    // Die Sicht steht am Annotationsknoten (aus der stabilen Concept-Id
    // abgeleitet); die Rohform der Rolle taugt nicht als Schluessel.
    const key = ev.cluster || 'neutral';
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
