/**
 * Filter → document set. The single resolution in the frontend.
 *
 * Every view used to resolve its facets itself, so five versions of the same
 * question drifted apart and the viewer saw different sets for the same cut in
 * two tabs. This module holds the resolution in one place; a lexical gate in
 * `tests/frontend/records-for.test.mjs` keeps the self-resolutions away.
 *
 * Pure functions, no DOM and no d3, following `statistik-data.js` and
 * `_netzwerk-geometry.js`.
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
 * Ira Malaniuk's life span. It is the fallback of the year axis: a Bestand
 * without a single dated record still gets the span the project is about,
 * instead of a per-view invention.
 */
export const YEAR_MIN = 1919;
export const YEAR_MAX = 2009;

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
  ereignis: 'eventsByRole',
});

/** All facets that cut a document set. */
export const FACET_KEYS = Object.freeze([
  ...Object.keys(ENTITY_MAPS), ...Object.keys(DIRECT_INDEXES),
  'docType', 'sicht', 'finanzen', 'stand',
]);

/** The Erschliessungsstand as the source writes it, in reading order. */
const SOURCE_STAND = Object.freeze(['abgeschlossen', 'begonnen', 'zurueckgestellt']);

/**
 * Value under which a base record without any Bearbeitungsstand stays
 * selectable. The base is the Verknuepfung and not the Bearbeitungsstand
 * (E-165), so such a record belongs to the Bestand while matching none of the
 * three source values; without this fourth value it would sit in the base and
 * answer to no checkbox.
 */
const STAND_NONE = 'ohne-angabe';

/** The values of the Erschliessungsstand facet, in reading order. */
export const STAND_VALUES = Object.freeze([...SOURCE_STAND, STAND_NONE]);

/** Display forms of the Erschliessungsstand. The source writes the umlaut as
 *  `ue`; the label restores it, the value stays the raw source term. */
const STAND_LABELS = Object.freeze({
  abgeschlossen: 'abgeschlossen',
  begonnen: 'begonnen',
  zurueckgestellt: 'zurückgestellt',
  [STAND_NONE]: 'ohne Angabe',
});

/** What the Bestand preselects on first open (E-162): the two states that mean
 *  the object has been worked on. Removable like any other chip. */
export const STAND_DEFAULT = Object.freeze(['abgeschlossen', 'begonnen']);

/** Record property carrying the Erschliessungsstand. */
const STATUS_PROP = 'm3gim-ontology:processingStatus';

const baseCache = new WeakMap();

/**
 * The document base of the whole frontend: every record carrying at least one
 * Verknuepfung (E-165). A record without any is out of every view and out of
 * every count — it is neither cut away by a facet nor greyed out, it does not
 * exist for the interface, and the Findmittel to the whole Teilnachlass stays
 * the archive. The Bearbeitungsstand is a facet on this base, not its
 * definition: a record can be verknuepft without carrying one.
 *
 * A store without `unprocessedIds` (test fixtures) puts every record in the
 * base rather than none, so a fixture states its exclusions explicitly.
 * @param {Object} store
 * @returns {Set<string>} record @ids
 */
export function baseIds(store) {
  if (!store || !Array.isArray(store.allRecords)) return new Set();
  const hit = baseCache.get(store);
  if (hit) return hit;
  const unprocessed = store.unprocessedIds instanceof Set ? store.unprocessedIds : null;
  const out = new Set();
  for (const record of store.allRecords) {
    const id = record['@id'];
    if (unprocessed && unprocessed.has(id)) continue;
    out.add(id);
  }
  baseCache.set(store, out);
  return out;
}

/** The base as records, in the order of `store.allRecords`. */
export function baseRecords(store) {
  const ids = baseIds(store);
  return (store && store.allRecords ? store.allRecords : []).filter(r => ids.has(r['@id']));
}

/**
 * Value index of a facet.
 * @param {Object} store
 * @param {string} key  one of FACET_KEYS
 * @returns {Map<string, Set<string>>} value → record @ids; empty map on
 *   unknown key
 */
function facetIndex(store, key) {
  if (!store) return new Map();
  // The store is immutable once loaded, but every facet count of the sidebar
  // asks for these indexes again, so a keystroke in the search field rebuilt
  // them over all records once per facet (Projektleitung, 2026-09-04).
  let cache = indexCache.get(store);
  if (!cache) { cache = new Map(); indexCache.set(store, cache); }
  const hit = cache.get(key);
  if (hit) return hit;
  const built = buildFacetIndex(store, key);
  cache.set(key, built);
  return built;
}

const indexCache = new WeakMap();

function buildFacetIndex(store, key) {
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
  if (key === 'stand') return standIndex(store);
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
  const base = baseIds(store);
  const needsVocabLabel = key in DIRECT_INDEXES;
  const isDocType = key === 'docType';
  const out = [];
  for (const [value, ids] of index) {
    // A value that occurs only outside the base is not a facet of this Bestand.
    const count = countIn(ids, base);
    if (count === 0) continue;
    const label = needsVocabLabel ? vocabLabel(store, value)
      : isDocType ? dftLabel(store, value)
      : key === 'stand' ? (STAND_LABELS[value] || String(value))
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
  const base = baseIds(store);
  const countLeaf = (id) => countIn(index.get(id), base);
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
 *   `weit` is the size of the resulting set, `eng` the subset of it with
 *   spatiotemporal or performance evidence. The two are counted, never used to
 *   cut: the Schaerfegrad-Umschalter is gone (E-163), the difference stays a
 *   figure a view may name.
 */
export function recordsFor(store, filter, opts = {}) {
  const f = filter || {};
  let ids = opts.base instanceof Set ? new Set(opts.base) : new Set(baseIds(store));

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
      const year = yearOfId(store, id);
      if (year == null) { undatiert += 1; kept.add(id); continue; }
      if (year >= lo && year <= hi) kept.add(id);
    }
    ids = kept;
  } else {
    for (const id of ids) if (yearOfId(store, id) == null) undatiert += 1;
  }

  const weit = ids.size;
  const anchored = engRecords(store);
  let eng = 0;
  for (const id of ids) if (anchored.has(id)) eng += 1;

  return { ids, weit, eng, undatiert, byFacet };
}

/**
 * Year span of the Bestand, for every time slider. One definition, so the three
 * views do not slide over different axes.
 *
 * The span is Malaniuk's life span, widened by outliers that the base actually
 * carries. Widening instead of replacing keeps the axis at 1919–2009 for a cut
 * whose latest document is older, and it keeps records outside the base — an
 * uncatalogued 2010 clipping among them — from stretching the slider past the
 * years anything is shown for.
 * @param {Object} store
 * @returns {{min: number, max: number}}
 */
export function yearBounds(store) {
  let min = YEAR_MIN, max = YEAR_MAX;
  const base = baseIds(store);
  if (store && store.byYear) {
    for (const [year, records] of store.byYear) {
      if (!records.some(r => base.has(r['@id']))) continue;
      if (year < min) min = year;
      if (year > max) max = year;
    }
  }
  return { min, max };
}

/**
 * Belegzahlen of a facet's values in the current cut: how many documents remain
 * when that value is added to the filter. The other facets stay as they are and
 * this facet's own selection drops out, so the counts of a multi-value facet
 * (OR within the facet) do not shrink each other away.
 * @param {Object} store
 * @param {Object} filter        the current cut
 * @param {string} key           facet whose values are counted
 * @param {Iterable<string>} values
 * @returns {Map<string, number>}
 */
export function facetCounts(store, filter, key, values) {
  const rest = { ...(filter || {}) };
  delete rest[key];
  const { ids } = recordsFor(store, rest);
  const index = facetIndex(store, key);
  const out = new Map();
  for (const value of values) {
    const leaves = key === 'docType' ? expandDftFilter(store, value) : [value];
    const seen = new Set();
    for (const leaf of leaves) {
      const hit = index.get(leaf);
      if (!hit) continue;
      for (const id of hit) if (ids.has(id)) seen.add(id);
    }
    out.set(value, seen.size);
  }
  return out;
}

/** Size of the intersection of a record-id set with the base. */
function countIn(ids, base) {
  if (!ids) return 0;
  let n = 0;
  for (const id of ids) if (base.has(id)) n += 1;
  return n;
}

/**
 * Year of a record via the single Zeitanker of the data layer (contract A4).
 * `rico:date` first, else the highest-ranking anchoring Datierung; null when
 * undated. The one resolution, so a record without `rico:date` does not count
 * as dated in one view and undated in the next.
 * @param {Object} store
 * @param {Object} record
 * @returns {?number}
 */
export function yearOf(store, record) {
  if (!record) return null;
  const { year } = primaryYear(store, record);
  return typeof year === 'number' && Number.isFinite(year) ? year : null;
}

// --- Derivations -----------------------------------------------------------

/** Year of the record behind an @id. Memoised, because every cut walks its whole
 *  set for the Zeitfenster and the count of the undated (Projektleitung,
 *  2026-09-04). */
function yearOfId(store, id) {
  if (!store) return null;
  let years = yearCache.get(store);
  if (!years) { years = new Map(); yearCache.set(store, years); }
  if (years.has(id)) return years.get(id);
  const record = store.records ? store.records.get(id) : null;
  const year = yearOf(store, record);
  years.set(id, year);
  return year;
}

const yearCache = new WeakMap();

/**
 * Erschliessungsstand → records (E-162). The Bearbeitungsstand of the source,
 * nothing derived; a record whose value is missing or unknown falls under
 * STAND_NONE, so the facet reaches every record of the base.
 */
function standIndex(store) {
  const out = new Map();
  if (!store || !store.allRecords) return out;
  for (const record of store.allRecords) {
    const status = record[STATUS_PROP];
    const value = SOURCE_STAND.includes(status) ? status : STAND_NONE;
    let ids = out.get(value);
    if (!ids) { ids = new Set(); out.set(value, ids); }
    ids.add(record['@id']);
  }
  return out;
}

/**
 * Records with spatiotemporal or performance evidence. Counted, not cut; kept
 * local here so the data layer does not point at the sync layer.
 */
function engRecords(store) {
  if (!store) return new Set();
  const hit = engCache.get(store);
  if (hit) return hit;
  const set = new Set();
  if (store.recordToEvents) for (const id of store.recordToEvents.keys()) set.add(id);
  if (store.recordToPerformances) for (const id of store.recordToPerformances.keys()) set.add(id);
  engCache.set(store, set);
  return set;
}

const engCache = new WeakMap();

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
  const label = (entry && entry.label) || '';
  return label ? label[0].toLocaleUpperCase('de-DE') + label.slice(1) : '';
}
