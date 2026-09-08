import { baseRecords, facetInventory, facetCounts, recordsFor } from '../data/records-for.js';
import { matchesQuery, foldText } from '../utils/normalize.js';

export const SEARCH_FAMILIES = Object.freeze({
  person: 'Person', institution: 'Institution', werk: 'Werk', ort: 'Ort', document: 'Dokument',
});

/** Number of records produced when the draft replaces the committed text query. */
export function textSearchCount(store, filter, draft = '') {
  return recordsFor(store, { ...(filter || {}), search: draft.trim() }).ids.size;
}

/** The draft matches labels; committed filters alone determine eligibility. */
export function searchSuggestions(store, filter, draft = '') {
  const found = [];
  for (const family of ['person', 'institution', 'werk', 'ort']) {
    const entries = facetInventory(store, family);
    const counts = facetCounts(store, filter, family, entries.map(entry => entry.value));
    for (const entry of entries) {
      const count = counts.get(entry.value) || 0;
      if (!count || !matchesQuery(entry.label, draft)) continue;
      found.push({ family, rawValue: entry.value, label: entry.label, count,
        key: JSON.stringify([family, entry.value]) });
    }
  }
  const eligible = recordsFor(store, filter).ids;
  for (const record of baseRecords(store)) {
    const id = record['@id'];
    if (!eligible.has(id)) continue;
    const signature = record['rico:identifier'] || id;
    const title = record['rico:title'] || '';
    if (!matchesQuery(`${signature} ${id} ${title}`, draft)) continue;
    found.push({ family: 'document', rawValue: id, label: signature,
      title, count: 1, key: JSON.stringify(['document', id]) });
  }
  const q = foldText(draft.trim());
  return found.sort((a, b) => {
    const exactA = q && foldText(a.label) === q ? 1 : 0;
    const exactB = q && foldText(b.label) === q ? 1 : 0;
    return exactB - exactA || b.count - a.count
      || a.label.localeCompare(b.label, 'de') || a.family.localeCompare(b.family);
  });
}
