/** Source-backed place statements, independent of map rendering. */
import { ensureArray, cityOf, roleIdOf, roleToken, roleLabel } from '../utils/format.js';
import { extractXlsxSource } from '../utils/provenance.js';
import { extractYear } from '../utils/date-parser.js';
import { primaryYear } from './loader.js';
import { recordsFor, countryByCity } from './records-for.js';

export { countryByCity };

const NO_ROLE_LABEL = 'ohne Rolle';
const PLACE_LINK = 'ort:';
const roleKeyOf = statement => statement.roleId || statement.role || '';

export const hasGeo = statement => (
  Number.isFinite(statement.placeLat) && Number.isFinite(statement.placeLon)
);

export function placeRoleLabel(statement) {
  const label = statement.roleLabel || statement.role || statement.roleId;
  return label ? label[0].toLocaleUpperCase('de-DE') + label.slice(1) : NO_ROLE_LABEL;
}

export const ENTITY_FAMILY = Object.freeze({
  org: 'institution', person: 'person', werk: 'werk',
});

/** Entity-to-document membership for register navigation. */
export function buildEntities(store) {
  const out = [];
  const push = (kind, prefix, name, entry) => {
    out.push({ id: prefix + name, kind, family: ENTITY_FAMILY[kind], name,
      records: entry.records, wikidata: entry.wikidata || null });
  };
  for (const [name, entry] of store.organizations) push('org', 'org:', name, entry);
  for (const [name, entry] of store.persons) push('person', 'person:', name, entry);
  for (const [name, entry] of (store.works || new Map())) {
    if (!entry || !entry.records || entry.records.size === 0) continue;
    push('werk', 'werk:', name, entry);
  }
  out.sort((a, b) => b.records.size - a.records.size || a.name.localeCompare(b.name, 'de-DE'));
  return out;
}

const looksDateLike = value => /^\d/.test(String(value).trim());

/** Stable identity of a place statement before geographic presentation. */
export function placeStatementKey(statement) {
  const source = statement.xlsxSource;
  if (source?.sheet && source?.row) {
    return JSON.stringify([
      statement.recordId, source.sheet, source.row, source.datenpunkt ?? null,
      statement.place, statement.roleId || statement.role || null,
    ]);
  }
  return JSON.stringify([
    statement.recordId, statement.source, statement.id, statement.place,
    statement.roleId || statement.role || null,
  ]);
}

/** Add coordinates inherited from another statement of the same city. */
export function assignPlacePlacement(statements) {
  const cityCoordinates = new Map();
  for (const statement of statements) {
    if (!hasGeo(statement)) continue;
    const key = cityOf(statement.place).toLowerCase();
    if (!cityCoordinates.has(key)) {
      cityCoordinates.set(key, [statement.placeLat, statement.placeLon]);
    }
  }
  for (const statement of statements) {
    if (hasGeo(statement)) statement.placement = 'direct';
    else {
      const coordinates = cityCoordinates.get(cityOf(statement.place).toLowerCase());
      if (coordinates) {
        [statement.placeLat, statement.placeLon] = coordinates;
        statement.placement = 'city';
      } else statement.placement = 'unlocatable';
    }
  }
  return statements;
}

/**
 * Project every source-row place statement exactly once. Mirrored location and
 * annotation paths collapse only when their record, source row, place and role
 * identity agree; independent duplicate wording remains independent evidence.
 */
export function buildOccurrences(store) {
  const locations = [];
  const annotations = [];
  const withDocumentContext = (statement) => {
    const record = store.records?.get(statement.recordId);
    const anchor = record ? primaryYear(store, record) : {};
    return { ...statement, recordYear: anchor.year ?? null, recordDate: anchor.date || null,
      documentDate: record?.['rico:date'] || null };
  };
  for (const record of store.allRecords) {
    for (const [index, location] of ensureArray(record['rico:hasOrHadLocation']).entries()) {
      const name = location.name || location['skos:prefLabel'];
      if (!name || looksDateLike(name)) continue;
      locations.push(withDocumentContext({
        id: `${record['@id']}:place:${index}`,
        place: name,
        placeLat: typeof location['geo:lat'] === 'number' ? location['geo:lat'] : null,
        placeLon: typeof location['geo:long'] === 'number' ? location['geo:long'] : null,
        placeWikidata: String(location['@id'] || '').startsWith('wd:') ? location['@id'] : null,
        date: null,
        role: roleToken(location.role),
        roleId: roleIdOf(location.role),
        roleLabel: roleLabel(store, location.role),
        recordId: record['@id'],
        source: 'loc',
        sources: ['loc'],
        xlsxSource: extractXlsxSource(location),
        description: location['rico:generalDescription'] || null,
        qualityFlag: location['m3gim-ontology:dataQualityFlag'] || null,
      }));
    }
  }
  for (const event of store.mobilityEvents.values()) {
    if (!event.place || looksDateLike(event.place)) continue;
    annotations.push(withDocumentContext({
      ...event,
      date: event.rawDate || event.date || null,
      source: 'ste',
      sources: ['ste'],
    }));
  }

  const mirrored = new Map();
  for (const statement of annotations) {
    if (!statement.xlsxSource?.sheet || !statement.xlsxSource?.row) continue;
    const key = placeStatementKey(statement);
    if (!mirrored.has(key)) mirrored.set(key, []);
    mirrored.get(key).push(statement);
  }
  const uniqueLocations = locations.filter(statement => {
    const matches = mirrored.get(placeStatementKey(statement));
    if (!matches) return true;
    for (const match of matches) {
      match.sources = ['loc', 'ste'];
      if (!hasGeo(match) && hasGeo(statement)) {
        match.placeLat = statement.placeLat;
        match.placeLon = statement.placeLon;
      }
      match.placeWikidata ||= statement.placeWikidata;
      match.qualityFlag ||= statement.qualityFlag;
      match.description = [...new Set([match.description, statement.description].filter(Boolean))]
        .join(' · ') || null;
    }
    return false;
  });
  return assignPlacePlacement([...uniqueLocations, ...annotations]);
}

/** Select place statements by the shared document cut and legacy place roles. */
export function occurrencesInCut(store, occurrences, shared) {
  const { ids } = recordsFor(store, shared || {});
  const roles = placeRolesOf(shared);
  return (occurrences || []).filter(statement => ids.has(statement.recordId)
    && (roles === null || roles.has(statement.roleId || statement.role)));
}

/** Chosen legacy place roles, or null when the facet names none. */
export function placeRolesOf(shared) {
  const raw = shared?.verknuepfung;
  const values = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .filter(value => typeof value === 'string' && value.startsWith(PLACE_LINK))
    .map(value => value.slice(PLACE_LINK.length));
  return values.length > 0 ? new Set(values) : null;
}

/** Dated place statements first, retaining undated evidence. */
export function sortOcc(occurrences) {
  return occurrences.slice().sort((a, b) => {
    const yearA = extractYear(a.date);
    const yearB = extractYear(b.date);
    if (yearA != null && yearB != null && yearA !== yearB) return yearA - yearB;
    if (yearA != null && yearB == null) return -1;
    if (yearA == null && yearB != null) return 1;
    const place = (a.place || '').localeCompare(b.place || '', 'de-DE');
    return place !== 0 ? place : (a.role || '').localeCompare(b.role || '', 'de-DE');
  });
}

/** Group source evidence for map presentation; counts are distinct documents. */
export function groupPlaces(occurrences) {
  const groups = new Map();
  for (const statement of occurrences) {
    const city = cityOf(statement.place);
    const key = city.toLowerCase();
    if (!groups.has(key)) groups.set(key, { key, city, evidence: [], records: new Set() });
    const group = groups.get(key);
    group.evidence.push(statement);
    group.records.add(statement.recordId);
  }
  return [...groups.values()].map(group => {
    const roles = new Map();
    for (const statement of group.evidence) {
      const id = roleKeyOf(statement);
      if (!roles.has(id)) roles.set(id, new Set());
      roles.get(id).add(statement.recordId);
    }
    return { ...group, located: group.evidence.some(hasGeo),
      roles: [...roles].map(([id, ids]) => ({ id,
        label: placeRoleLabel(group.evidence.find(item => roleKeyOf(item) === id)),
        count: ids.size })) };
  }).sort((a, b) => b.records.size - a.records.size || a.city.localeCompare(b.city, 'de'));
}
