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

import { documentDateBounds, primaryYear } from './loader.js';
import { evidenceResult, createWitness } from './evidence.js';
import {
  PREDICATE_TYPES, normalizePredicate, normalizePredicates, buildPredicateFacetPatch,
} from './query-predicates.js';
import {
  MISSING_ROLE, boundEntityRoleWitnesses, facetMemberWitnesses, searchMatchWitnesses,
} from './query-evidence.js';
import { matchesQuery } from '../utils/normalize.js';
import {
  getDocTypeId, expandDftFilter, dftLabel, buildDftTree, ensureArray, cityOf,
  roleIdOf, roleToken,
} from '../utils/format.js';

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
  'docType', 'finanzen', 'verknuepfung', 'land',
]);

/**
 * The link types of the Verknuepfungstabelle with their display form. The
 * Structured values use their graph shape; neutral details retain the
 * source column's recordedType verbatim.
 */
const LINK_TYPES = Object.freeze([
  ['ort', 'Ort'], ['person', 'Person'], ['institution', 'Institution'],
  ['werk', 'Werk'], ['datum', 'Datum'], ['ereignis', 'Ereignis'],
  ['finanz', 'Finanzen'], ['ensemble', 'Ensemble'],
  ['aktivität', 'Aktivität'], ['dokument', 'Dokumentangabe'],
  ['datum, werk', 'Datum, Werk'], ['ort, datum', 'Ort, Datum'],
  ['angabe', 'Angabe ohne Typ'],
]);

/** Agent and subject classes to their link type. */
const AGENT_LINK_TYPE = Object.freeze({
  'rico:Person': 'person', 'rico:CorporateBody': 'institution', 'rico:Group': 'ensemble',
});
const SUBJECT_LINK_TYPE = Object.freeze({
  'rico:Person': 'person', 'm3gim-ontology:MusicalWork': 'werk',
  'm3gim-ontology:FramingEvent': 'ereignis',
});

/** Separator between link type and role in a facet value of `verknuepfung`.
 *  A role key carries colons of its own, so the split takes the first one. */
const LINK_SEP = ':';

const baseCache = new WeakMap();

/**
 * The document base of the whole frontend: every record carrying at least one
 * Verknuepfung (E-165). A record without any is out of every view and out of
 * every count — it is neither cut away by a facet nor greyed out, it does not
 * exist for the interface, and the Findmittel to the whole Teilnachlass stays
 * the archive.
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
  if (key === 'finanzen') return waehrungIndex(store);
  if (key === 'verknuepfung') return linkIndex(store);
  if (key === 'land') return landIndex(store);
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
 * Link-type inventory as tree groups: the type with its documents, below it the
 * roles it was recorded in, each with its own count. Choosing the type means
 * any role of that type, so the type value carries the union itself and needs
 * no expansion in `recordsFor`.
 *
 * Every source entry remains operable. A missing role has an explicit
 * presentation sentinel, and a role without a display form receives a visible
 * fallback that preserves its raw key. A document with two roles of one type
 * counts in both children and once at the parent.
 * @param {Object} store
 * @returns {Array<{value:string, label:string, count:number, tip:string,
 *   children:Array<{value:string, label:string, count:number}>}>}
 */
export function linkGroups(store) {
  const index = facetIndex(store, 'verknuepfung');
  const base = baseIds(store);
  const out = [];
  for (const [key, label] of LINK_TYPES) {
    const count = countIn(index.get(key), base);
    if (count === 0) continue;
    const prefix = key + LINK_SEP;
    const children = [];
    for (const [value, ids] of index) {
      if (!value.startsWith(prefix)) continue;
      const role = value.slice(prefix.length);
      const roleName = role === MISSING_ROLE ? 'Ohne erfasste Rolle'
        : vocabLabel(store, role) || `Rolle ohne Bezeichnung (${role})`;
      const n = countIn(ids, base);
      if (n === 0) continue;
      children.push({ value, label: roleName, count: n });
    }
    children.sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label, 'de'));
    out.push({ value: key, label, count, children, tip: '' });
  }
  out.sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label, 'de'));
  return out;
}

/**
 * The document set for a filter.
 *
 * @param {Object} store
 * @param {Object} filter                 getFilter() result
 * @param {{base?: Set<string>}} [opts]   start set, default all records
 * @returns {{ids: Set<string>, weit: number, eng: number,
 *   undatiert: number, byFacet: Object<string, number>, witnesses: Object[],
 *   invalidPredicates: Object[], valid: boolean, evidence: Object}}
 *   `weit` is the size of the resulting set, `eng` the subset of it with
 *   spatiotemporal or performance evidence. The two are counted, never used to
 *   cut: the Schaerfegrad-Umschalter is gone (E-163), the difference stays a
 *   figure a view may name.
 */
export function recordsFor(store, filter, opts = {}) {
  const f = filter || {};
  let ids = opts.base instanceof Set ? new Set(opts.base) : new Set(baseIds(store));
  const matchingWitnesses = [];

  const byFacet = {};
  for (const key of FACET_KEYS) {
    const values = facetValues(f, key);
    if (values.length === 0) continue;
    const index = facetIndex(store, key);
    const union = new Set();
    for (const value of values) {
      // Dokumenttyp: a chosen value can be a broader term of the DFT hierarchy;
      // expandDftFilter resolves it to its leaves (OR), which is what makes the
      // tree groups work as grouped suggestions.
      const leaves = key === 'docType' ? expandDftFilter(store, value) : new Set([value]);
      for (const leaf of leaves) {
        const hit = index.get(leaf);
        if (!hit) continue;
        for (const id of hit) if (ids.has(id)) union.add(id);
      }
    }
    byFacet[key] = union.size;
    ids = union;
    for (const value of values) {
      matchingWitnesses.push(...facetMemberWitnesses(store, key, value, ids));
    }
  }

  const query = String(f.search || '').trim();
  if (query) {
    const kept = new Set();
    for (const id of ids) {
      const record = store && store.records ? store.records.get(id) : null;
      if (recordMatchesSearch(store, record, query)) {
        kept.add(id);
        matchingWitnesses.push(...searchMatchWitnesses(store, record, query));
      }
    }
    ids = kept;
  }

  let undatiert = 0;
  if (Array.isArray(f.zeitfenster)) {
    const [von, bis] = f.zeitfenster;
    const lo = von == null ? -Infinity : von;
    const hi = bis == null ? Infinity : bis;
    const kept = new Set();
    for (const id of ids) {
      const record = store.records?.get(id);
      const bounds = documentDateBounds(record);
      if (!bounds || (bounds.from == null && bounds.to == null)) { undatiert += 1; kept.add(id); continue; }
      const startsBeforeEnd = bounds.from == null || bounds.from <= hi;
      const endsAfterStart = bounds.to == null || bounds.to >= lo;
      if (startsBeforeEnd && endsAfterStart) kept.add(id);
    }
    ids = kept;
  } else {
    for (const id of ids) if (yearOfId(store, id) == null) undatiert += 1;
  }

  const invalidPredicates = [];
  for (const predicate of normalizePredicates(f.predicates)) {
    if (predicate.type === PREDICATE_TYPES.INVALID) {
      invalidPredicates.push(predicate);
      ids = new Set();
      continue;
    }
    if (predicate.type === PREDICATE_TYPES.ENTITY_ROLE) {
      const matching = boundEntityRoleWitnesses(store, predicate, ids);
      const matchingIds = new Set(matching.map(witness => witness.recordId));
      ids = new Set([...ids].filter(id => matchingIds.has(id)));
      matchingWitnesses.push(...matching);
      continue;
    }
    if (predicate.type === PREDICATE_TYPES.RECORDS) {
      const base = baseIds(store);
      const missing = predicate.ids.filter(id => !base.has(id));
      if (missing.length > 0) {
        invalidPredicates.push(normalizePredicate({
          type: PREDICATE_TYPES.INVALID,
          reason: `Unbekannte Dokument-ID: ${missing.join(', ')}`,
          input: predicate,
        }));
        ids = new Set();
        continue;
      }
      const selected = new Set(predicate.ids);
      ids = new Set([...ids].filter(id => selected.has(id)));
      for (const id of ids) {
        const record = store?.records?.get(id);
        matchingWitnesses.push(createWitness({
          recordId: id, dimension: 'records', value: id, source: record,
          nodeId: id, kind: 'record',
        }));
      }
      continue;
    }
    if (predicate.type === PREDICATE_TYPES.SET_MEMBERSHIP) {
      for (const member of predicate.include) {
        const memberIds = idsForFacetMember(store, member.facet, member.value);
        ids = new Set([...ids].filter(id => memberIds.has(id)));
        matchingWitnesses.push(...facetMemberWitnesses(
          store, member.facet, member.value, ids,
        ));
      }
      for (const member of predicate.exclude) {
        const memberIds = idsForFacetMember(store, member.facet, member.value);
        ids = new Set([...ids].filter(id => !memberIds.has(id)));
      }
    }
  }

  undatiert = 0;
  for (const id of ids) if (yearOfId(store, id) == null) undatiert += 1;
  const weit = ids.size;
  const anchored = engRecords(store);
  let eng = 0;
  for (const id of ids) if (anchored.has(id)) eng += 1;

  const evidence = evidenceResult({
    recordIds: ids,
    contextRecordIds: ids,
    witnesses: matchingWitnesses,
    invalid: invalidPredicates,
  });
  return {
    ids, weit, eng, undatiert, byFacet,
    witnesses: evidence.witnesses,
    invalidPredicates: evidence.invalidPredicates,
    valid: evidence.valid,
    evidence,
  };
}

/** Values as a list without depending on the state module. */
function facetValues(filterState, key) {
  const value = filterState && filterState[key];
  if (value == null || value === '') return [];
  return Array.isArray(value) ? value.filter(item => item != null && item !== '') : [value];
}

/** Resolve one set-membership atom through the same indexes as basic facets. */
function idsForFacetMember(store, facet, value) {
  const index = facetIndex(store, facet);
  const leaves = facet === 'docType' ? expandDftFilter(store, value) : [value];
  const ids = new Set();
  for (const leaf of leaves) {
    for (const id of index.get(leaf) || []) ids.add(id);
  }
  return ids;
}

/** Shared document search used by every view. */
export function recordMatchesSearch(store, record, query) {
  if (!record) return false;
  const fields = [
    record['rico:identifier'],
    record['rico:title'],
    dftLabel(store, getDocTypeId(record)),
    record['rico:date'],
    linkedSearchValues(store, record['@id']),
  ];
  return matchesQuery(fields.filter(Boolean).join(' '), query);
}

const searchValuesCache = new WeakMap();

/** Linked entity names by record, built once for the immutable store. */
function linkedSearchValues(store, recordId) {
  if (!store || !recordId) return '';
  let index = searchValuesCache.get(store);
  if (!index) {
    index = new Map();
    const add = (id, value) => {
      if (!id || !value) return;
      if (!index.has(id)) index.set(id, []);
      index.get(id).push(value);
    };
    for (const mapName of ['persons', 'organizations', 'locations', 'works', 'ensembles']) {
      for (const [name, entry] of store[mapName] || []) {
        for (const id of entry.records || []) add(id, name);
      }
    }
    searchValuesCache.set(store, index);
  }
  return (index.get(recordId) || []).join(' ');
}

/**
 * Year span of the Bestand, for every time slider. One definition, so the three
 * views do not slide over different axes.
 *
 * The span follows finite bounds explicitly recorded on documents in the
 * linked basis. Intervals and open qualified dates contribute their recorded
 * finite endpoints without turning them into exact-year histogram entries.
 * @param {Object} store
 * @returns {{min: number, max: number}}
 */
export function yearBounds(store) {
  let min = Infinity, max = -Infinity;
  const base = baseIds(store);
  for (const record of store?.allRecords || []) {
    if (!base.has(record['@id'])) continue;
    const bounds = documentDateBounds(record);
    for (const year of [bounds?.from, bounds?.to]) {
      if (!Number.isFinite(year)) continue;
      if (year < min) min = year;
      if (year > max) max = year;
    }
  }
  return Number.isFinite(min) ? { min, max } : { min: null, max: null };
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
  const predicates = normalizePredicates(filter?.predicates);
  const structuredDimension = predicates.some(predicate => (
    (predicate.type === PREDICATE_TYPES.ENTITY_ROLE
      && (key === 'verknuepfung' || predicate.family === key))
    || (predicate.type === PREDICATE_TYPES.SET_MEMBERSHIP
      && [...predicate.include, ...predicate.exclude].some(member => member.facet === key))
  ));
  if (structuredDimension) {
    const counts = new Map();
    for (const value of values) {
      const patch = buildPredicateFacetPatch(filter, key, [value]);
      const candidate = { ...(filter || {}), ...patch };
      candidate.predicates = normalizePredicates(candidate.predicates).flatMap(predicate => {
        if (predicate.type !== PREDICATE_TYPES.SET_MEMBERSHIP) return [predicate];
        const include = predicate.include.filter(member => member.facet !== key);
        const exclude = predicate.exclude.filter(member => member.facet !== key);
        if (include.length === 0 && exclude.length === 0) return [];
        return [{ ...predicate, include, exclude }];
      });
      counts.set(value, recordsFor(store, candidate).ids.size);
    }
    return counts;
  }

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
 * Exact year of a record's explicit document date; null for missing,
 * qualified, open and interval values.
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
 *  2026-09-04). Exported so the Indizes can read the Zeitspanne of an entry
 *  over the same memo instead of resolving every Datierung a second time. */
export function yearOfId(store, id) {
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
 * Link type and (type, role) → records, read off the graph shapes named at
 * LINK_TYPES. Both levels live in one index, the type under its bare key and
 * the role under `typ:rolle`, so a choice on either side resolves the same way.
 * Entries without a role use the UI-only MISSING_ROLE sentinel.
 */
function linkIndex(store) {
  const out = new Map();
  if (!store || !store.allRecords) return out;
  const add = (typ, role, id) => {
    if (!typ) return;
    put(out, typ, id);
    const roleKey = roleIdOf(role) || roleToken(role) || MISSING_ROLE;
    put(out, typ + LINK_SEP + roleKey, id);
  };
  for (const record of store.allRecords) {
    const id = record['@id'];
    for (const agent of ensureArray(record['m3gim-ontology:hasAssociatedAgent'])) {
      add(AGENT_LINK_TYPE[agent['@type']], agent.role, id);
    }
    for (const subject of ensureArray(record['rico:hasOrHadSubject'])) {
      add(SUBJECT_LINK_TYPE[subject['@type']], subject.role, id);
    }
    for (const loc of ensureArray(record['rico:hasOrHadLocation'])) {
      add('ort', loc.role, id);
    }
    for (const detail of ensureArray(record['m3gim-ontology:hasDetail'])) {
      const monetary = detail['m3gim-ontology:monetaryAmount'];
      const recorded = String(detail['m3gim-ontology:recordedType']
        ?? detail['m3gim-ontology:detailField'] ?? '').trim().toLocaleLowerCase('de-AT');
      add(monetary ? 'finanz' : recorded || 'angabe',
        detail['m3gim-ontology:recordedRole'] || detail.role, id);
    }
    for (const annotation of annotationsOfRecord(store, record)) {
      // The located annotation is the place half of the ort,datum composite,
      // the bare one a date row: that is the split transform.py made.
      add(annotation.place ? 'ort' : 'datum',
        annotation.roleId || annotation.role, id);
    }
  }
  return out;
}

/** Every place link of the Bestand as [recordId, placeName, country|null]. */
function placeRows(store) {
  const rows = [];
  if (!store || !store.allRecords) return rows;
  for (const record of store.allRecords) {
    const id = record['@id'];
    for (const loc of ensureArray(record['rico:hasOrHadLocation'])) {
      rows.push([id, loc.name || loc['skos:prefLabel'] || '',
        loc['m3gim-ontology:country'] || null]);
    }
    for (const annotation of annotationsOfRecord(store, record)) {
      if (annotation.place) rows.push([id, annotation.place, annotation.placeCountry]);
    }
  }
  return rows;
}

/** City → country only when all country-bearing statements agree. */
function countryTally(rows) {
  const tally = new Map();
  for (const [, name, land] of rows) {
    if (!name || !land) continue;
    const key = cityOf(name).toLowerCase();
    let counts = tally.get(key);
    if (!counts) { counts = new Map(); tally.set(key, counts); }
    counts.set(land, (counts.get(land) || 0) + 1);
  }
  const out = new Map();
  for (const [key, counts] of tally) {
    if (counts.size === 1) out.set(key, counts.keys().next().value);
  }
  return out;
}

/**
 * City in lower case → country where all explicit statements agree.
 * @param {Object} store
 * @returns {Map<string, string>}
 */
export function countryByCity(store) {
  return countryTally(placeRows(store));
}

/**
 * Country → records, only where that source statement carries the country.
 */
function landIndex(store) {
  const out = new Map();
  const rows = placeRows(store);
  for (const [id, , land] of rows) {
    if (land) put(out, land, id);
  }
  return out;
}

/** Annotations of a record, tolerant of a fixture store that carries none.
 *  The loader keeps `annotationsOf` to itself, so the walk stands here. */
function annotationsOfRecord(store, record) {
  const map = store.recordToAnnotations;
  const ids = (map instanceof Map && map.get(record['@id'])) || [];
  return ids.map(id => store.annotations.get(id)).filter(Boolean);
}

/** Append a record id under a value of a facet index. */
function put(index, value, id) {
  let ids = index.get(value);
  if (!ids) { ids = new Set(); index.set(value, ids); }
  ids.add(id);
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

/** Display form of a role from the vocabulary; empty if the term has none.
 *  A role that occurs only at a work (repertoire, Wiederaufnahme,
 *  Festvorstellung) never passes the role register of the loader, so the
 *  concept node the dataset ships beside it carries the display form. */
function vocabLabel(store, value) {
  if (!store) return '';
  const entry = store.roleVocab ? store.roleVocab.get(value) : null;
  const concept = store.conceptDefinitions ? store.conceptDefinitions.get(value) : null;
  const label = (entry && entry.label) || (concept && concept.label) || '';
  return label ? label[0].toLocaleUpperCase('de-DE') + label.slice(1) : '';
}
