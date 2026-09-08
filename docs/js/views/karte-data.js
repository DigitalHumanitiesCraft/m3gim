/** Source-backed place evidence and shared document filtering. */
import { ensureArray, cityOf, roleIdOf, roleToken, roleLabel } from '../utils/format.js';
import { extractXlsxSource } from '../utils/provenance.js';
import { extractYear } from '../utils/date-parser.js';
import { primaryYear } from '../data/loader.js';
import { recordsFor } from '../data/records-for.js';
// The city-to-country resolution moved into the shared filter layer with the
// Land facet; it stays reachable here for the Orte register, which reads it
// through this module beside the Belege.
export { countryByCity } from '../data/records-for.js';
import { facetValues } from '../ui/filter-state.js';

const NO_ROLE_LABEL = 'ohne Rolle';
const roleKeyOf = o => o.roleId || o.role || '';
export const hasGeo = o => Number.isFinite(o.placeLat) && Number.isFinite(o.placeLon);

export function placeRoleLabel(o) {
  const label = o.roleLabel || o.role || o.roleId;
  return label ? label[0].toLocaleUpperCase('de-DE') + label.slice(1) : NO_ROLE_LABEL;
}

export const ENTITY_FAMILY = Object.freeze({ org: 'institution', person: 'person', werk: 'werk' });

/** Entity-to-document membership for register navigation. */
export function buildEntities(store) {
  const out = [];
  const push = (kind, prefix, name, e) => {
    out.push({ id: prefix + name, kind, family: ENTITY_FAMILY[kind], name,
      records: e.records, wikidata: e.wikidata || null });
  };
  for (const [name, e] of store.organizations) push('org', 'org:', name, e);
  for (const [name, e] of store.persons) push('person', 'person:', name, e);
  for (const [name, e] of (store.works || new Map())) {
    if (!e || !e.records || e.records.size === 0) continue;
    push('werk', 'werk:', name, e);
  }
  out.sort((a, b) => b.records.size - a.records.size || a.name.localeCompare(b.name, 'de-DE'));
  return out;
}

// Date-shaped recording errors cannot identify a place.
const looksDateLike = s => /^\d/.test(String(s).trim());

/** A place evidence keeps its own date separate from the document time anchor. */
function assignPlacement(out) {
  const cityCoord = new Map();
  for (const o of out) {
    if (hasGeo(o)) {
      const key = cityOf(o.place).toLowerCase();
      if (!cityCoord.has(key)) cityCoord.set(key, [o.placeLat, o.placeLon]);
    }
  }
  for (const o of out) {
    if (hasGeo(o)) o.placement = 'direct';
    else {
      const coords = cityCoord.get(cityOf(o.place).toLowerCase());
      if (coords) {
        [o.placeLat, o.placeLon] = coords;
        o.placement = 'city';
      } else o.placement = 'unlocatable';
    }
  }
  return out;
}

export function buildOccurrences(store) {
  const locations = [];
  const annotations = [];
  const evidence = (o) => {
    const rec = store.records?.get(o.recordId);
    const anchor = rec ? primaryYear(store, rec) : {};
    return { ...o, recordYear: anchor.year ?? null, recordDate: anchor.date || null,
      documentDate: rec?.['rico:date'] || null };
  };
  for (const rec of store.allRecords) {
    for (const [index, loc] of ensureArray(rec['rico:hasOrHadLocation']).entries()) {
      const name = loc.name || loc['skos:prefLabel'];
      if (!name || looksDateLike(name)) continue;
      locations.push(evidence({
        id: `${rec['@id']}:place:${index}`, place: name,
        placeLat: typeof loc['geo:lat'] === 'number' ? loc['geo:lat'] : null,
        placeLon: typeof loc['geo:long'] === 'number' ? loc['geo:long'] : null,
        placeWikidata: String(loc['@id'] || '').startsWith('wd:') ? loc['@id'] : null,
        date: null, role: roleToken(loc.role), roleId: roleIdOf(loc.role),
        roleLabel: roleLabel(store, loc.role), recordId: rec['@id'], source: 'loc',
        sources: ['loc'], xlsxSource: extractXlsxSource(loc),
        description: loc['rico:generalDescription'] || null,
        qualityFlag: loc['m3gim-ontology:dataQualityFlag'] || null,
      }));
    }
  }
  for (const ev of store.mobilityEvents.values()) {
    if (!ev.place || looksDateLike(ev.place)) continue;
    annotations.push(evidence({
      ...ev, date: ev.rawDate || ev.date || null,
      source: 'ste', sources: ['ste'],
    }));
  }
  // Only mirror paths of the same source row may collapse. Distinct rows,
  // addresses and undated statements retain their independent identities.
  const sourceKey = o => o.xlsxSource?.sheet && o.xlsxSource?.row
    ? JSON.stringify([o.recordId, o.xlsxSource.sheet, o.xlsxSource.row,
        o.place, o.roleId || o.role || null]) : null;
  const mirrored = new Map();
  for (const o of annotations) {
    const key = sourceKey(o);
    if (!key) continue;
    if (!mirrored.has(key)) mirrored.set(key, []);
    mirrored.get(key).push(o);
  }
  const uniqueLocations = locations.filter(o => {
    const matches = mirrored.get(sourceKey(o));
    if (!matches) return true;
    for (const match of matches) {
      match.sources = ['loc', 'ste'];
      if (!hasGeo(match) && hasGeo(o)) {
        match.placeLat = o.placeLat; match.placeLon = o.placeLon;
      }
      match.placeWikidata ||= o.placeWikidata;
      match.qualityFlag ||= o.qualityFlag;
      match.description = [...new Set([match.description, o.description].filter(Boolean))].join(' · ') || null;
    }
    return false;
  });
  return assignPlacement([...uniqueLocations, ...annotations]);
}

/** Select evidence by the shared document cut and any explicit place roles. */
export function occurrencesInCut(store, occurrences, shared) {
  const { ids } = recordsFor(store, shared || {});
  const roles = placeRolesOf(shared);
  return (occurrences || []).filter(o => ids.has(o.recordId)
    && (roles === null || roles.has(o.roleId || o.role)));
}

/** Prefix of a place role in a value of the Verknuepfungs-Facette. */
const PLACE_LINK = 'ort:';

/**
 * The chosen place roles as their raw keys, or null when the facet names none.
 * The bare type `ort` names no role and therefore leaves every Beleg standing,
 * as any other facet does.
 * @param {Object} shared  getFilter() result
 * @returns {?Set<string>}
 */
export function placeRolesOf(shared) {
  const values = facetValues(shared, 'verknuepfung')
    .filter(v => typeof v === 'string' && v.startsWith(PLACE_LINK))
    .map(v => v.slice(PLACE_LINK.length));
  return values.length > 0 ? new Set(values) : null;
}

// ---------------------------------------------------------------------------
// Ableitungen ueber einer Beleg-Liste (Knoten, Tooltip, Ortsdetail)
// ---------------------------------------------------------------------------

/** Dated place statements first, retaining undated evidence. */
export function sortOcc(occ) {
  return occ.slice().sort((a, b) => {
    const ya = extractYear(a.date), yb = extractYear(b.date);
    if (ya != null && yb != null && ya !== yb) return ya - yb;
    if (ya != null && yb == null) return -1;
    if (ya == null && yb != null) return 1;
    const pa = (a.place || '').localeCompare(b.place || '', 'de-DE');
    return pa !== 0 ? pa : (a.role || '').localeCompare(b.role || '', 'de-DE');
  });
}

/** Group source evidence for navigation; counts refer to distinct documents. */
export function groupPlaces(occurrences) {
  const groups = new Map();
  for (const o of occurrences) {
    const city = cityOf(o.place);
    const key = city.toLowerCase();
    if (!groups.has(key)) groups.set(key, { key, city, evidence: [], records: new Set() });
    const group = groups.get(key);
    group.evidence.push(o); group.records.add(o.recordId);
  }
  return [...groups.values()].map(group => {
    const roles = new Map();
    for (const o of group.evidence) {
      const id = roleKeyOf(o);
      if (!roles.has(id)) roles.set(id, new Set());
      roles.get(id).add(o.recordId);
    }
    return { ...group, located: group.evidence.some(hasGeo),
      roles: [...roles].map(([id, ids]) => ({ id,
        label: placeRoleLabel(group.evidence.find(o => roleKeyOf(o) === id)), count: ids.size })),
    };
  }).sort((a, b) => b.records.size - a.records.size || a.city.localeCompare(b.city, 'de'));
}
