/**
 * M³GIM Data Loader
 * Fetches m3gim.jsonld, parses the @graph, builds in-memory indexes.
 */

import { extractYear } from '../utils/date-parser.js';
import { ensureArray, getDocTypeId, countLinks } from '../utils/format.js';
import { PERSONEN_KATEGORIEN, PERSONEN_NORMALISIERUNG } from './constants.js';

/**
 * Load and parse the archive JSON-LD, build the Store.
 * @param {string} url - path to m3gim.jsonld
 * @returns {Promise<Store>}
 */
export async function loadArchive(url = './data/m3gim.jsonld') {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  const jsonld = await response.json();
  return buildStore(jsonld);
}

function buildStore(jsonld) {
  const graph = jsonld['@graph'] || [];

  const store = {
    fonds: null,
    konvolute: new Map(),
    records: new Map(),
    allRecords: [],
    byYear: new Map(),
    byDocType: new Map(),
    bySignatur: new Map(),
    persons: new Map(),
    organizations: new Map(),
    locations: new Map(),
    works: new Map(),
    konvolutChildren: new Map(),
    recordCount: jsonld['m3gim:recordCount'] || 0,
    konvolutCount: jsonld['m3gim:konvolutCount'] || 0,
    exportDate: jsonld['m3gim:exportDate'] || '',
    childToKonvolut: new Map(),
  };

  // Pass 1: Classify nodes
  for (const node of graph) {
    if (node['@type'] === 'rico:RecordSet') {
      const setType = node['rico:hasRecordSetType'];
      const typeId = setType ? setType['@id'] : null;
      if (typeId === 'rico:Fonds') {
        store.fonds = node;
      } else {
        store.konvolute.set(node['@id'], node);
        const parts = ensureArray(node['rico:hasOrHadPart']);
        const childIds = parts.map(p => p['@id']);
        store.konvolutChildren.set(node['@id'], childIds);
        for (const cid of childIds) {
          store.childToKonvolut.set(cid, node['@id']);
        }
      }
    } else if (node['@type'] === 'rico:Record') {
      store.records.set(node['@id'], node);
      store.allRecords.push(node);
      if (node['rico:identifier']) {
        store.bySignatur.set(node['rico:identifier'], node);
      }
    }
  }

  // Pass 2: Build derived indexes
  for (const record of store.allRecords) {
    indexByYear(store, record);
    indexByDocType(store, record);
    indexAgents(store, record);
    indexLocations(store, record);
    indexWorks(store, record);
  }

  // Pass 3: Derive Konvolut display metadata + filter Folio records
  store.folioIds = new Set();
  store.konvolutMeta = new Map();

  for (const [kid, konvolut] of store.konvolute) {
    const childIds = store.konvolutChildren.get(kid) || [];
    const folioId = childIds.find(cid => cid.endsWith('_Folio'));
    const folioRecord = folioId ? store.records.get(folioId) : null;
    if (folioId) store.folioIds.add(folioId);

    const realChildIds = childIds.filter(cid => !cid.endsWith('_Folio'));
    let minYear = Infinity, maxYear = -Infinity;
    let datedCount = 0;
    let totalLinks = 0;

    for (const cid of realChildIds) {
      const child = store.records.get(cid);
      if (!child) continue;
      totalLinks += countLinks(child);
      const year = extractYear(child['rico:date']);
      if (year) {
        datedCount++;
        if (year < minYear) minYear = year;
        if (year > maxYear) maxYear = year;
      }
    }

    const title = folioRecord ? folioRecord['rico:title'] : null;
    let dateDisplay = '';
    if (minYear !== Infinity) {
      dateDisplay = minYear === maxYear
        ? String(minYear)
        : `${minYear}\u2009\u2013\u2009${maxYear}`;
    }

    store.konvolutMeta.set(kid, {
      title,
      dateDisplay,
      childCount: realChildIds.length,
      folioId,
      totalLinks,
      datedCount,
    });
  }

  // Remove Folio records from allRecords (they are metadata, not archival objects)
  if (store.folioIds.size > 0) {
    store.allRecords = store.allRecords.filter(r => !store.folioIds.has(r['@id']));
  }

  // Pass 4: Identify unprocessed records (no links AND no bearbeitungsstand)
  store.unprocessedIds = new Set();
  for (const record of store.allRecords) {
    const hasLinks = countLinks(record) > 0;
    const hasStatus = !!record['m3gim:bearbeitungsstand'];
    if (!hasLinks && !hasStatus) {
      store.unprocessedIds.add(record['@id']);
    }
  }

  return store;
}

function indexByYear(store, record) {
  const year = extractYear(record['rico:date']);
  if (year) {
    if (!store.byYear.has(year)) store.byYear.set(year, []);
    store.byYear.get(year).push(record);
  }
}

function indexByDocType(store, record) {
  const typeId = getDocTypeId(record);
  if (typeId) {
    if (!store.byDocType.has(typeId)) store.byDocType.set(typeId, []);
    store.byDocType.get(typeId).push(record);
  }
}

function normalizeName(rawName) {
  const lower = rawName.toLowerCase().trim();
  return PERSONEN_NORMALISIERUNG[lower] || rawName;
}

function isJunkName(name) {
  // Filter out placeholder entries like [Organi], Y., single chars
  if (name.length <= 2) return true;
  if (name.startsWith('[') && name.endsWith(']')) return true;
  return false;
}

function indexAgents(store, record) {
  const agents = ensureArray(record['rico:hasOrHadAgent']);
  const mentions = ensureArray(record['m3gim:mentions']);

  for (const agent of agents) {
    const rawName = agent.name || agent['skos:prefLabel'] || '';
    if (!rawName) continue;
    const type = agent['@type'] || '';
    const wikidata = agent['@id'] || null;

    if (type === 'rico:CorporateBody' || type === 'rico:Group') {
      if (!store.organizations.has(rawName)) {
        store.organizations.set(rawName, { records: new Set(), roles: new Set(), wikidata });
      }
      const entry = store.organizations.get(rawName);
      entry.records.add(record['@id']);
      if (agent.role) entry.roles.add(agent.role);
      if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
    } else {
      const name = normalizeName(rawName);
      if (isJunkName(name)) continue;
      if (!store.persons.has(name)) {
        store.persons.set(name, { records: new Set(), roles: new Set(), kategorie: getPersonKategorie(name), wikidata });
      }
      const entry = store.persons.get(name);
      entry.records.add(record['@id']);
      if (agent.role) entry.roles.add(agent.role);
      if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
    }
  }

  // Mentions are always persons
  for (const mention of mentions) {
    const rawName = mention.name || mention['skos:prefLabel'] || '';
    if (!rawName) continue;
    const name = normalizeName(rawName);
    if (isJunkName(name)) continue;
    const wikidata = mention['@id'] || null;
    if (!store.persons.has(name)) {
      store.persons.set(name, { records: new Set(), roles: new Set(), kategorie: getPersonKategorie(name), wikidata });
    }
    const entry = store.persons.get(name);
    entry.records.add(record['@id']);
    if (mention.role) entry.roles.add(mention.role);
    if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
  }
}

function indexLocations(store, record) {
  const locs = ensureArray(record['rico:hasOrHadLocation']);
  for (const loc of locs) {
    const name = loc.name || loc['skos:prefLabel'] || '';
    if (!name) continue;
    // Skip date-like strings that leaked into locations
    if (/^\d{4}(-\d{2}){0,2}/.test(name)) continue;
    if (!store.locations.has(name)) {
      store.locations.set(name, { records: new Set(), roles: new Set() });
    }
    const entry = store.locations.get(name);
    entry.records.add(record['@id']);
    if (loc.role) entry.roles.add(loc.role);
  }
}

function indexWorks(store, record) {
  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  for (const subj of subjects) {
    if (subj['@type'] !== 'm3gim:MusicalWork') continue;
    const name = subj.name || subj['skos:prefLabel'] || '';
    if (!name) continue;
    if (!store.works.has(name)) {
      store.works.set(name, { records: new Set(), komponist: subj.komponist || null, wikidata: subj['@id'] || null });
    }
    store.works.get(name).records.add(record['@id']);
  }
}

// Sort by keyword length descending so specific names match before generic ones
// e.g., "wieland wagner" matches before "wagner"
const SORTED_KATEGORIEN = Object.entries(PERSONEN_KATEGORIEN)
  .sort((a, b) => b[0].length - a[0].length);

function getPersonKategorie(name) {
  if (!name) return 'Andere';
  const lower = name.toLowerCase();
  for (const [keyword, kat] of SORTED_KATEGORIEN) {
    if (lower.includes(keyword)) return kat;
  }
  return 'Andere';
}
