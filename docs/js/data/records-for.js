/**
 * Filter → document set. The single resolution in the frontend.
 *
 * Every view used to resolve its facets itself, so five versions of the same
 * question drifted apart and the viewer saw different sets for the same cut in
 * two tabs. This module holds the resolution in one place; a lexical gate in
 * `tests/frontend/records-for.test.mjs` keeps the self-resolutions away.
 *
 * Pure functions, no DOM and no d3, following `statistics-data.js` and
 * `_network-geometry.js`.
 *
 * Semantics (E-151): several values of one facet act as OR, different facets as
 * AND. A value without a match in the Bestand concerns only itself; if all
 * values of a facet match nothing, the set stays empty. Undated records survive
 * the time window (E-88), the enge Schaerfegrad names its difference rather than
 * smoothing it away.
 */

import { primaryYear } from './loader.js';
import { facetValues } from '../ui/filter-state.js';
import { getDocTypeId, expandDftFilter, dftLabel, buildDftTree } from '../utils/format.js';

/** The facet under which an event without mobility Sicht is listed. */
const KONTEXT_SICHT = 'kontext';

/**
 * Entity facets whose index is a store map with a `records` set. Order sets the
 * evaluation order and nothing else, because the intersection is commutative.
 */
const ENTITY_MAPS = Object.freeze({
  person: 'persons',
  ort: 'locations',
  werk: 'works',
  institution: 'organizations',
  ensemble: 'ensembles',
});

/** Facets whose index already sits as value → record ids in the store. */
const DIRECT_INDEXES = Object.freeze({
  rolle: 'recordsByAgentRole',
  ereignis: 'eventsByRole',
});

/** All facets that cut a document set. */
export const FACET_KEYS = Object.freeze([
  ...Object.keys(ENTITY_MAPS), ...Object.keys(DIRECT_INDEXES),
  'docType', 'sicht', 'finanzen',
]);

/**
 * Value index of a facet.
 * @param {Object} store
 * @param {string} key  one of FACET_KEYS
 * @returns {Map<string, Set<string>>} value → record @ids; empty map on
 *   unknown key
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
  if (key === 'docType') return docTypeIndex(store);
  if (key === 'sicht') return sichtIndex(store);
  if (key === 'finanzen') return waehrungIndex(store);
  return new Map();
}

/**
 * Selectable values of a facet with occurrence count, descending.
 *
 * Roles without a display form stay out (E-143): a role that would stand only
 * as concept id in the control is not operable.
 * @param {Object} store
 * @param {string} key
 * @returns {Array<{value: string, label: string, count: number}>}
 */
export function facetInventory(store, key) {
  const index = facetIndex(store, key);
  const needsVocabLabel = key in DIRECT_INDEXES;
  const isDocType = key === 'docType';
  const out = [];
  for (const [value, ids] of index) {
    const count = ids ? ids.size : 0;
    if (count === 0) continue;
    const label = needsVocabLabel ? vocabLabel(store, value)
      : isDocType ? dftLabel(store, value)
      : String(value);
    if (!label) continue;
    // Vocabulary facets carry only terms with a real display form (E-143). A
    // raw value whose label falls back to itself (e.g. the truncated source
    // value "v") does not belong in the inventory; it is a Datenspiegel finding,
    // not a facet.
    if (needsVocabLabel && label === String(value)) continue;
    out.push({ value, label, count });
  }
  out.sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label, 'de'));
  return out;
}

/**
 * Document-type inventory as DFT tree groups with per-value counts.
 *
 * The docType facet follows the same operate pattern as the entity facets
 * (search field, suggestions, removable chips); the tree groups appear as
 * grouped suggestions. Each group carries a selectable parent value (the whole
 * subtree via expandDftFilter) and its leaf children with their own counts.
 * Only values that actually occur in the Bestand appear.
 * @param {Object} store
 * @returns {Array<{value:string, label:string, count:number,
 *   children:Array<{value:string, label:string, count:number}>}>}
 */
export function docTypeGroups(store) {
  const index = docTypeIndex(store);
  const countLeaf = (id) => (index.get(id) ? index.get(id).size : 0);
  const countSubtree = (id) => {
    let n = 0;
    for (const leaf of expandDftFilter(store, id)) n += countLeaf(leaf);
    return n;
  };
  const out = [];
  for (const group of buildDftTree(store)) {
    const children = (group.children || [])
      .map(c => ({ value: c.id, label: c.label, count: countSubtree(c.id) }))
      .filter(c => c.count > 0);
    const groupCount = countSubtree(group.id);
    if (children.length === 0 && groupCount === 0) continue;
    out.push({ value: group.id, label: group.label, count: groupCount, children });
  }
  return out;
}

/**
 * The document set for a filter.
 *
 * @param {Object} store
 * @param {Object} filter                 getFilter() result
 * @param {{base?: Set<string>}} [opts]   start set, default all records
 * @returns {{ids: Set<string>, weit: number, eng: number,
 *            undatiert: number, byFacet: Object<string, number>}}
 *   `weit` is the set after entity and time cut, `eng` the subset of it with
 *   spatiotemporal or performance evidence. Both are always present so every
 *   view can name the difference without computing it itself.
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
      // Dokumenttyp: ein gewaehlter Wert kann ein Oberbegriff der DFT-Hierarchie
      // sein; expandDftFilter loest ihn auf seine Blaetter auf (ODER), damit die
      // Baumgruppen als gruppierte Vorschlaege funktionieren.
      const leaves = key === 'docType' ? expandDftFilter(store, value) : new Set([value]);
      for (const leaf of leaves) {
        const hit = index.get(leaf);
        if (!hit) continue;
        for (const id of hit) if (ids.has(id)) union.add(id);
      }
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

// --- Derivations -----------------------------------------------------------

/** Year of a record via the single Zeitanker of the data layer (contract A4). */
function yearOf(store, id) {
  const record = store && store.records ? store.records.get(id) : null;
  if (!record) return null;
  const { year } = primaryYear(store, record);
  return typeof year === 'number' && Number.isFinite(year) ? year : null;
}

/**
 * Records with spatiotemporal or performance evidence (Schaerfegrad eng). The
 * same set `engRecordSet` holds in filter-sync.js; kept local here so the data
 * layer does not point at the sync layer.
 */
function engRecords(store) {
  const set = new Set();
  if (store && store.recordToEvents) for (const id of store.recordToEvents.keys()) set.add(id);
  if (store && store.recordToPerformances) for (const id of store.recordToPerformances.keys()) set.add(id);
  return set;
}

/**
 * Document type → records, keyed by the record's leaf DFT id (getDocTypeId).
 * A selected parent concept is expanded to its leaves in recordsFor via
 * expandDftFilter, so the index stays flat and the tree lives in the vocabulary.
 * Records without a classified type are dropped; the docType facet cuts among
 * the types that exist, the Erschliessungsluecke is a Datenspiegel finding.
 */
function docTypeIndex(store) {
  const out = new Map();
  if (!store || !store.allRecords) return out;
  for (const record of store.allRecords) {
    const type = getDocTypeId(record);
    if (!type) continue;
    let ids = out.get(type);
    if (!ids) { ids = new Set(); out.set(type, ids); }
    ids.add(record['@id']);
  }
  return out;
}

/**
 * Mobility Sicht → records. The Sicht sits as `cluster` on the annotation;
 * without a cluster the evidence falls into the Kontext bucket, as the map does.
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
 * Currency → records. The finance axis today carries presence and currency;
 * `detailRole` is empty in all records, a finer axis would be invented.
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

/** Display form of a role from the vocabulary; empty if the term has none. */
function vocabLabel(store, value) {
  const entry = store && store.roleVocab ? store.roleVocab.get(value) : null;
  return (entry && entry.label) || '';
}
