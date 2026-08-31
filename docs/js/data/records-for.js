/**
 * Filter → Dokumentmenge. Die einzige Aufloesung im Frontend.
 *
 * Bis hierher loeste jede Ansicht ihre Facetten selbst auf: Bestand und Chronik
 * in `_archive-filter.js`, der Verknuepfungsgraph in `_verknuepfungen-geometry.js`,
 * die Statistik in `statistics-data.js`, Karte und Netzwerk je in ihrem
 * View-Modul. Fuenf Fassungen derselben Frage laufen auseinander, und der
 * Betrachter sieht zum selben Schnitt in zwei Tabs verschiedene Mengen, ohne
 * dass etwas darauf hinweist. Dieses Modul haelt die Aufloesung an einer Stelle;
 * ein lexikalischer Gate in `tests/frontend/records-for.test.mjs` haelt die
 * Eigenaufloesungen fern.
 *
 * Reine Funktionen, kein DOM und kein d3, nach dem Vorbild von
 * `statistics-data.js` und `_network-geometry.js`.
 *
 * Semantik (E-151): mehrere Werte einer Facette wirken als ODER, verschiedene
 * Facetten als UND. Ein Wert ohne Entsprechung im Bestand betrifft nur sich
 * selbst; treffen alle Werte einer Facette nichts, bleibt die Menge leer.
 * Undatierte Records ueberstehen das Zeitfenster (E-88), der enge Schaerfegrad
 * nennt seine Differenz statt sie zu glaetten.
 */

import { primaryYear } from './loader.js';
import { facetValues } from '../ui/filter-state.js';

/** Die Facette, unter der ein Ereignis ohne Mobilitaetssicht gefuehrt wird. */
const KONTEXT_SICHT = 'kontext';

/**
 * Entitaetsfacetten, deren Index eine Store-Map mit `records`-Set ist.
 * Reihenfolge bestimmt die Auswertungsreihenfolge und damit nichts weiter,
 * weil der Schnitt kommutativ ist.
 */
const ENTITY_MAPS = Object.freeze({
  person: 'persons',
  ort: 'locations',
  werk: 'works',
  institution: 'organizations',
  ensemble: 'ensembles',
});

/** Facetten, deren Index bereits als Wert → Record-Ids im Store liegt. */
const DIRECT_INDEXES = Object.freeze({
  rolle: 'recordsByAgentRole',
  ereignis: 'eventsByRole',
});

/** Alle Facetten, die eine Dokumentmenge schneiden. */
export const FACET_KEYS = Object.freeze([
  ...Object.keys(ENTITY_MAPS), ...Object.keys(DIRECT_INDEXES), 'sicht', 'finanzen',
]);

/**
 * Wertindex einer Facette.
 * @param {Object} store
 * @param {string} key  eine der FACET_KEYS
 * @returns {Map<string, Set<string>>} Wert → Record-@ids; leere Map bei
 *   unbekanntem Schluessel
 */
export function facetIndex(store, key) {
  if (!store) return new Map();
  const mapName = ENTITY_MAPS[key];
  if (mapName) {
    const source = store[mapName];
    const out = new Map();
    if (!source) return out;
    for (const [value, entry] of source) {
      if (entry && entry.records && entry.records.size > 0) out.set(value, entry.records);
    }
    return out;
  }
  const directName = DIRECT_INDEXES[key];
  if (directName) return store[directName] instanceof Map ? store[directName] : new Map();
  if (key === 'sicht') return sichtIndex(store);
  if (key === 'finanzen') return waehrungIndex(store);
  return new Map();
}

/**
 * Waehlbare Werte einer Facette mit Belegzahl, absteigend.
 *
 * Rollen ohne Anzeigeform bleiben draussen (E-143): eine Rolle, die nur als
 * Concept-Id im Regler stuende, ist nicht bedienbar.
 * @param {Object} store
 * @param {string} key
 * @returns {Array<{value: string, label: string, count: number}>}
 */
export function facetInventory(store, key) {
  const index = facetIndex(store, key);
  const needsVocabLabel = key in DIRECT_INDEXES;
  const out = [];
  for (const [value, ids] of index) {
    const count = ids ? ids.size : 0;
    if (count === 0) continue;
    const label = needsVocabLabel ? vocabLabel(store, value) : String(value);
    if (!label) continue;
    out.push({ value, label, count });
  }
  out.sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label, 'de'));
  return out;
}

/**
 * Die Dokumentmenge zu einem Filter.
 *
 * @param {Object} store
 * @param {Object} filter                 getFilter()-Ergebnis
 * @param {{base?: Set<string>}} [opts]   Startmenge, Default alle Records
 * @returns {{ids: Set<string>, weit: number, eng: number,
 *            undatiert: number, byFacet: Object<string, number>}}
 *   `weit` ist die Menge nach Entitaets- und Zeitschnitt, `eng` die Teilmenge
 *   davon mit raumzeitlichem oder Auffuehrungs-Beleg. Beide stehen immer da,
 *   damit jede Ansicht die Differenz nennen kann, ohne sie selbst zu rechnen.
 */
export function recordsFor(store, filter, opts = {}) {
  const f = filter || {};
  let ids = opts.base instanceof Set
    ? new Set(opts.base)
    : new Set((store && store.allRecords ? store.allRecords : []).map(r => r['@id']));

  const byFacet = {};
  for (const key of FACET_KEYS) {
    const values = facetValues(f, key);
    if (values.length === 0) continue;
    const index = facetIndex(store, key);
    const union = new Set();
    for (const value of values) {
      const hit = index.get(value);
      if (!hit) continue;
      for (const id of hit) if (ids.has(id)) union.add(id);
    }
    byFacet[key] = union.size;
    ids = union;
  }

  let undatiert = 0;
  if (Array.isArray(f.zeitfenster)) {
    const [von, bis] = f.zeitfenster;
    const lo = von == null ? -Infinity : von;
    const hi = bis == null ? Infinity : bis;
    const kept = new Set();
    for (const id of ids) {
      const year = yearOf(store, id);
      if (year == null) { undatiert += 1; kept.add(id); continue; }
      if (year >= lo && year <= hi) kept.add(id);
    }
    ids = kept;
  } else {
    for (const id of ids) if (yearOf(store, id) == null) undatiert += 1;
  }

  const weit = ids.size;
  const anchored = engRecords(store);
  let eng = 0;
  for (const id of ids) if (anchored.has(id)) eng += 1;
  if (f.schaerfe === 'eng') {
    const kept = new Set();
    for (const id of ids) if (anchored.has(id)) kept.add(id);
    ids = kept;
  }

  return { ids, weit, eng, undatiert, byFacet };
}

// --- Ableitungen ----------------------------------------------------------

/** Jahr eines Records ueber den einen Zeitanker der Datenschicht (Vertrag A4). */
function yearOf(store, id) {
  const record = store && store.records ? store.records.get(id) : null;
  if (!record) return null;
  const { year } = primaryYear(store, record);
  return typeof year === 'number' && Number.isFinite(year) ? year : null;
}

/**
 * Records mit raumzeitlichem oder Auffuehrungs-Beleg (Schaerfegrad eng).
 * Dieselbe Menge, die `engRecordSet` in filter-sync.js fuehrt; hier lokal
 * gehalten, damit die Datenschicht nicht auf die Sync-Schicht zeigt.
 */
function engRecords(store) {
  const set = new Set();
  if (store && store.recordToEvents) for (const id of store.recordToEvents.keys()) set.add(id);
  if (store && store.recordToPerformances) for (const id of store.recordToPerformances.keys()) set.add(id);
  return set;
}

/**
 * Mobilitaetssicht → Records. Die Sicht steht als `cluster` an der Annotation;
 * ohne Cluster faellt der Beleg in den Kontext-Eimer, wie die Karte es haelt.
 */
function sichtIndex(store) {
  const out = new Map();
  if (!store || !store.recordToAnnotations) return out;
  for (const [recordId, annotationIds] of store.recordToAnnotations) {
    for (const aid of annotationIds) {
      const annotation = store.annotations.get(aid);
      if (!annotation) continue;
      const key = annotation.cluster || KONTEXT_SICHT;
      let ids = out.get(key);
      if (!ids) { ids = new Set(); out.set(key, ids); }
      ids.add(recordId);
    }
  }
  return out;
}

/**
 * Waehrung → Records. Die Finanzachse traegt heute Vorhandensein und Waehrung;
 * `detailRole` ist in allen Belegen leer, eine feinere Achse waere erfunden.
 */
function waehrungIndex(store) {
  const out = new Map();
  if (!store || !store.finances) return out;
  for (const [recordId, entries] of store.finances) {
    for (const entry of entries) {
      if (!entry || !entry.currency) continue;
      let ids = out.get(entry.currency);
      if (!ids) { ids = new Set(); out.set(entry.currency, ids); }
      ids.add(recordId);
    }
  }
  return out;
}

/** Anzeigeform einer Rolle aus dem Vokabular; leer, wenn der Begriff keine hat. */
function vocabLabel(store, value) {
  const entry = store && store.roleVocab ? store.roleVocab.get(value) : null;
  return (entry && entry.label) || '';
}
