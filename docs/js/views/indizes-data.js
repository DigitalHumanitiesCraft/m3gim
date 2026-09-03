/**
 * Indizes — pure data layer.
 *
 * Entry lists of the four grids, the cross-grid facet cut and the two global
 * filters (search, Wikidata only). No DOM: indizes.js adds icons, columns and
 * cell renderers on top.
 */

/**
 * @typedef {Object} GridEntry
 * @property {string} name
 * @property {number} count       number of linked records
 * @property {Set<string>} records
 * @property {?string} wikidata
 */

/** Per-grid entry source and the fields the search runs over. */
export const GRID_SOURCES = {
  personen: {
    getEntries: (s) => [...s.persons.entries()]
      .filter(([, data]) => data.records.size > 0)
      .map(([name, data]) => ({
        name, count: data.records.size, kategorie: data.kategorie, wikidata: data.wikidata, records: data.records,
        occupation: data.occupation || null, voiceType: data.voiceType || null,
        birthDate: data.birthDate || null, deathDate: data.deathDate || null,
      })),
    searchFields: (e) => [e.name, e.kategorie].filter(Boolean).join(' '),
  },
  organisationen: {
    getEntries: (s) => [...s.organizations.entries()]
      .filter(([, data]) => data.records.size > 0)
      .map(([name, data]) => ({
        name, count: data.records.size, wikidata: data.wikidata, records: data.records,
      })),
    searchFields: (e) => e.name,
  },
  orte: {
    getEntries: (s) => [...s.locations.entries()]
      .filter(([, data]) => data.records.size > 0)
      .map(([name, data]) => ({
        name, count: data.records.size, wikidata: data.wikidata, records: data.records,
      })),
    searchFields: (e) => e.name,
  },
  werke: {
    getEntries: (s) => [...s.works.entries()]
      .filter(([, data]) => data.records.size > 0)
      .map(([name, data]) => ({
        name, count: data.records.size, komponist: data.komponist || '', wikidata: data.wikidata, records: data.records,
      })),
    searchFields: (e) => [e.name, e.komponist].filter(Boolean).join(' '),
  },
};

// Memoised entry lists per grid. getEntries materialises the full list from the
// store map on every call; the data never changes after the load. renderIndizes
// clears the cache when the store is exchanged.
const entriesCache = new Map();

/** Cached entry list of one grid. */
export function getGridEntries(store, gridKey) {
  let cached = entriesCache.get(gridKey);
  if (!cached) {
    cached = GRID_SOURCES[gridKey].getEntries(store);
    entriesCache.set(gridKey, cached);
  }
  return cached;
}

export function clearEntriesCache() {
  entriesCache.clear();
}

/**
 * Apply the cross-grid facet filter: for grids OTHER than the active filter's
 * grid, only entries whose records overlap with the filter's recordIds survive.
 * @param {Array<GridEntry>} entries
 * @param {string} gridKey
 * @param {?{gridKey: string, recordIds: Set<string>}} activeFilter
 */
export function applyFacetFilter(entries, gridKey, activeFilter) {
  if (!activeFilter || activeFilter.gridKey === gridKey) return entries;
  return entries.filter(e => {
    for (const id of e.records) {
      if (activeFilter.recordIds.has(id)) return true;
    }
    return false;
  });
}

/**
 * The two global sidebar filters (E-91): Wikidata presence and the search term
 * over the grid's own search fields. The term arrives lower-cased.
 * @param {Array<GridEntry>} entries
 * @param {string} gridKey
 * @param {{q?: string, withWikidata?: boolean}} state
 */
export function filterEntries(entries, gridKey, { q = '', withWikidata = false } = {}) {
  let out = entries;
  if (withWikidata) out = out.filter(e => hasWikidata(e));
  if (q) {
    const search = GRID_SOURCES[gridKey].searchFields;
    out = out.filter(e => search(e).toLowerCase().includes(q));
  }
  return out;
}

/** A reconciled entry carries a wd:-prefixed Q-id; anything else counts as none. */
export function hasWikidata(entry) {
  return Boolean(entry.wikidata) && String(entry.wikidata).startsWith('wd:');
}
