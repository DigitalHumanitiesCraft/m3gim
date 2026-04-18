/**
 * M³GIM Data Loader
 * Fetches m3gim.jsonld, parses the @graph, builds in-memory indexes.
 */

import { extractYear } from '../utils/date-parser.js';
import { ensureArray, getDocTypeId, countLinks } from '../utils/format.js';
import { normalizePerson, getPersonKategorie } from '../utils/normalize.js';
import { extractXlsxSource } from '../utils/provenance.js';

/**
 * Load and parse the archive JSON-LD, build the Store.
 * @param {string} url - path to m3gim.jsonld
 * @returns {Promise<Store>}
 */
export async function loadArchive(url = './data/m3gim.jsonld') {
  let response;
  try {
    response = await fetch(url);
  } catch (e) {
    throw new Error('Archivdaten nicht erreichbar — bitte Netzwerkverbindung prüfen.');
  }
  if (response.status === 404) {
    throw new Error(`Archivdaten nicht gefunden (${url}).`);
  }
  if (!response.ok) {
    throw new Error(`Fehler beim Laden der Archivdaten (HTTP ${response.status}).`);
  }
  let jsonld;
  try {
    jsonld = await response.json();
  } catch (e) {
    throw new Error('Archivdaten konnten nicht gelesen werden — ungültiges Datenformat.');
  }
  return buildStore(jsonld);
}

/**
 * Store-Maps transformieren JSON-LD-Subobjekte zum Teil in ein flaches
 * Lookup-Format -- damit Consumer nicht durch verschachtelte Strukturen
 * navigieren muessen. Das hat den Preis, dass *JSON-LD-Keys wie
 * `agrelon:hasObject` in den Store-Entries NICHT mehr existieren*.
 * Bei Erweiterungen: immer die JSDoc-Shapes unten zur Hand nehmen.
 *
 * @typedef {Object} RelationEntry       Eintrag in store.agentRelations
 * @property {string} type               AgRelOn-Prädikat ("agrelon:HasCorrespondent" u. a.)
 * @property {string|null} objectName    Entity-Name des Beziehungs-Partners
 * @property {string|null} objectWikidata  Q-ID mit wd:-Präfix oder null
 * @property {string|null} validityBegin
 * @property {string|null} validityEnd
 * @property {string} provenance         @id des Records, das die Relation trägt
 * @property {{sheet: string, row: number, datenpunkt: ?number}} xlsxSource
 *
 * @typedef {Object} MobilityEvent       Eintrag in store.mobilityEvents
 * @property {string} id                 @id des SpatiotemporalEvent
 * @property {?{name: string, wikidata: ?string}} place
 * @property {?string} date              ISO-Datum oder Jahresangabe
 * @property {?string} role              z. B. "auffuehrungsort"
 * @property {?string} description       freier Text
 * @property {?string} recordId          @id des Ursprungs-Records
 *
 * @typedef {Object} FinanceEntry        Eintrag in store.finances
 * @property {?number} amount            numerisch (MonetaryAmount hasValue)
 * @property {?string} currency          ISO 4217 oder Roh-Code (z. B. "S" = Schilling)
 * @property {?string} description       z. B. "Honorar", "Reisekosten"
 *
 * @typedef {Object} DftConcept          Eintrag in store.dftHierarchy
 * @property {string} id                 @id ohne Präfix
 * @property {string} prefLabel
 * @property {?string} broader           Parent-Concept-ID oder null
 * @property {string[]} children         Kind-Concept-IDs (rückwaerts aufgeloest)
 */
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
    qualityMeta: {
      approvedManualMatches: jsonld['m3gim:approvedManualMatches'] ?? 0,
      lowConfidenceSkipped: jsonld['m3gim:lowConfidenceSkipped'] ?? 0,
    },
    childToKonvolut: new Map(),
    // v2-Strukturen (Phase 6). Shapes: siehe JSDoc oberhalb buildStore().
    /** @type {Map<string, DftConcept>} */
    dftHierarchy: new Map(),
    /** @type {Map<string, MobilityEvent>} */
    mobilityEvents: new Map(),
    /** @type {Map<string, string[]>} recordId → eventId[] */
    recordToEvents: new Map(),
    /** @type {Map<string, RelationEntry[]>} */
    agentRelations: new Map(),
    /** @type {Map<string, FinanceEntry[]>} */
    finances: new Map(),
  };

  // Pass 1: Classify nodes
  for (const node of graph) {
    const nodeType = node['@type'];
    if (nodeType === 'rico:RecordSet') {
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
    } else if (nodeType === 'rico:Record') {
      store.records.set(node['@id'], node);
      store.allRecords.push(node);
      if (node['rico:identifier']) {
        store.bySignatur.set(node['rico:identifier'], node);
      }
    } else if (nodeType === 'skos:Concept') {
      indexConcept(store, node);
    } else if (nodeType === 'm3gim:SpatiotemporalEvent') {
      indexMobilityEvent(store, node);
    }
  }

  // Pass 1.5: Derive DFT parent→children backrefs (concepts are now all known)
  for (const [cid, concept] of store.dftHierarchy) {
    if (concept.broader && store.dftHierarchy.has(concept.broader)) {
      store.dftHierarchy.get(concept.broader).children.push(cid);
    }
  }

  // Pass 2: Build derived indexes
  for (const record of store.allRecords) {
    indexByYear(store, record);
    indexByDocType(store, record);
    indexAgents(store, record);
    indexLocations(store, record);
    indexWorks(store, record);
    indexRecordToEvents(store, record);
    indexAgentRelations(store, record);
    indexFinances(store, record);
  }

  // Pass 2.5: AgRelOn-Relationen rueckwaerts auf Personen-Index aufloesen.
  // Fuer jede Relation wird das Objekt im Personen-Index gesucht (primaer
  // ueber Q-ID, sekundaer ueber normalizePerson(name)) und dort in
  // personEntry.relations[] angehaengt. Liefert die Datengrundlage fuer
  // Beziehungsbadges im Indizes-Tab.
  resolveAgentRelationsToPersons(store);

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
    const docTypeCounts = new Map();  // DFT-Id -> Count
    const statusCounts = new Map();   // Bearbeitungsstand -> Count
    let processedCount = 0;           // mit mind. einer Verknuepfung

    // docTypeCounts / statusCounts aggregieren nur ueber die SICHTBAREN
    // (= verknuepften) Kinder -- konsistent mit dem Leitprinzip "nur
    // bearbeitet" und der sichtbaren Kind-Anzahl im Konvolut-Badge. Sonst
    // entstehen bizarre Diskrepanzen wie "Konvolut (3)" + "10x Programmheft".
    for (const cid of realChildIds) {
      const child = store.records.get(cid);
      if (!child) continue;
      const childLinks = countLinks(child);
      totalLinks += childLinks;
      const year = extractYear(child['rico:date']);
      if (year) {
        datedCount++;
        if (year < minYear) minYear = year;
        if (year > maxYear) maxYear = year;
      }
      if (childLinks === 0) continue;  // nur bearbeitete Kinder aggregieren
      processedCount++;
      const dft = getDocTypeId(child);
      if (dft) docTypeCounts.set(dft, (docTypeCounts.get(dft) || 0) + 1);
      const status = child['m3gim:bearbeitungsstand'];
      if (status) statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }

    // Konvolut-Titel: bevorzugt aus Folio-Record, sonst aus Sammel-Record
    // (Sammel-Zeilen ohne Folio bekommen _sammlung-Suffix, siehe
    // knowledge/xlsx-fixes.md § 13 -- ihr Titel beschreibt das Konvolut
    // inhaltlich, z. B. "Diverse Zeitungsausschnitte" fuer NIM_006).
    const sammelChildId = realChildIds.find(cid => cid.endsWith('_sammlung'));
    const sammelRecord = sammelChildId ? store.records.get(sammelChildId) : null;
    const title = (folioRecord && folioRecord['rico:title'])
      || (sammelRecord && sammelRecord['rico:title'])
      || null;
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
      processedCount,
      folioId,
      totalLinks,
      datedCount,
      docTypeCounts,   // Map<dftId, count>, absteigend sortierbar
      statusCounts,    // Map<bearbeitungsstand, count>
    });
  }

  // Remove Folio records from allRecords (they are metadata, not archival objects)
  if (store.folioIds.size > 0) {
    store.allRecords = store.allRecords.filter(r => !store.folioIds.has(r['@id']));
  }

  // Pass 4: Identify unprocessed records (no links at all)
  store.unprocessedIds = new Set();
  for (const record of store.allRecords) {
    const hasLinks = countLinks(record) > 0;
    if (!hasLinks) {
      store.unprocessedIds.add(record['@id']);
    }
  }

  return store;
}

// Typisierte Datumsproperties aus Phase 4.7 — fallback fuer indexByYear,
// wenn rico:date fehlt. Reihenfolge entspricht dem Auffuehrungsbezug.
const TYPED_DATE_PROPS = [
  'm3gim:auffuehrungsdatum', 'm3gim:premieredatum', 'm3gim:auftrittsdatum',
  'm3gim:absendedatum', 'm3gim:empfangsdatum', 'm3gim:gespraechsdatum',
  'm3gim:erscheinungsdatum', 'm3gim:ausstellungsdatum', 'm3gim:ausstrahlungsdatum',
  'm3gim:probenbeginn', 'm3gim:probendatum', 'm3gim:spielzeitVon',
  'm3gim:ueberweisungsdatum', 'm3gim:abreisedatum',
];

function firstTypedYear(record) {
  for (const prop of TYPED_DATE_PROPS) {
    const v = record[prop];
    if (!v) continue;
    const values = Array.isArray(v) ? v : [v];
    for (const val of values) {
      if (typeof val !== 'string') continue;
      // circa:/vor:/nach: Praefix strippen
      const bare = val.replace(/^(circa|vor|nach):/, '');
      const y = extractYear(bare);
      if (y) return y;
    }
  }
  return null;
}

function indexByYear(store, record) {
  const year = extractYear(record['rico:date']) || firstTypedYear(record);
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

function isJunkName(name) {
  // Filter out placeholder entries like [Organi], Y., single chars
  if (name.length <= 2) return true;
  if (name.startsWith('[') && name.endsWith(']')) return true;
  return false;
}

function indexAgents(store, record) {
  const agents = ensureArray(record['m3gim:hasAssociatedAgent']);

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
      const name = normalizePerson(rawName);
      if (isJunkName(name)) continue;
      if (!store.persons.has(name)) {
        store.persons.set(name, { records: new Set(), roles: new Set(), kategorie: getPersonKategorie(name), wikidata });
      }
      const entry = store.persons.get(name);
      entry.records.add(record['@id']);
      if (agent.role) entry.roles.add(agent.role);
      if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
      // WD-Enrichment-Properties
      if (agent['m3gim:occupation'] && !entry.occupation) entry.occupation = agent['m3gim:occupation'];
      if (agent['m3gim:voiceType'] && !entry.voiceType) entry.voiceType = agent['m3gim:voiceType'];
      if (agent['m3gim:birthDate'] && !entry.birthDate) entry.birthDate = agent['m3gim:birthDate'];
      if (agent['m3gim:deathDate'] && !entry.deathDate) entry.deathDate = agent['m3gim:deathDate'];
    }
  }

  // Mentioned persons are now in rico:hasOrHadSubject with @type rico:Person
  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  for (const subj of subjects) {
    if (subj['@type'] !== 'rico:Person') continue;
    const rawName = subj.name || subj['skos:prefLabel'] || '';
    if (!rawName) continue;
    const name = normalizePerson(rawName);
    if (isJunkName(name)) continue;
    const wikidata = subj['@id'] || null;
    if (!store.persons.has(name)) {
      store.persons.set(name, { records: new Set(), roles: new Set(), kategorie: getPersonKategorie(name), wikidata });
    }
    const entry = store.persons.get(name);
    entry.records.add(record['@id']);
    if (subj.role) entry.roles.add(subj.role);
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
    const wikidata = loc['@id'] || null;
    if (!store.locations.has(name)) {
      store.locations.set(name, { records: new Set(), roles: new Set(), wikidata: wikidata });
    }
    const entry = store.locations.get(name);
    entry.records.add(record['@id']);
    if (loc.role) entry.roles.add(loc.role);
    if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
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
    const wEntry = store.works.get(name);
    wEntry.records.add(record['@id']);
    // WD-Enrichment: Premiere date
    if (subj['m3gim:premiereDate'] && !wEntry.premiereDate) wEntry.premiereDate = subj['m3gim:premiereDate'];
    if (subj['m3gim:wdGenre'] && !wEntry.wdGenre) wEntry.wdGenre = subj['m3gim:wdGenre'];
  }
}

/* ------------------------------------------------------------------ */
/*  v2-Store-Maps (Phase 6)                                            */
/* ------------------------------------------------------------------ */

/** SKOS-Concept (DFT-Hierarchie). Pass 1 legt nur Einzelknoten an, Parent→Children folgt in Pass 1.5. */
function indexConcept(store, node) {
  const id = node['@id'];
  if (!id) return;
  const broader = node['skos:broader'] && node['skos:broader']['@id'] || null;
  store.dftHierarchy.set(id, {
    id,
    prefLabel: node['skos:prefLabel'] || id.split(':').pop(),
    broader,
    children: [],
  });
}

/** Top-Level-SpatiotemporalEvent zu store.mobilityEvents. */
function indexMobilityEvent(store, node) {
  const id = node['@id'];
  if (!id) return;
  const place = node['m3gim:atPlace'];
  const placeName = place && (place.name || place['skos:prefLabel']) || null;
  const placeQid = place && place['@id'] && String(place['@id']).startsWith('wd:') ? place['@id'] : null;
  const placeLat = place && typeof place['geo:lat'] === 'number' ? place['geo:lat'] : null;
  const placeLon = place && typeof place['geo:long'] === 'number' ? place['geo:long'] : null;
  const placeCountry = place && place['m3gim:country'] || null;
  const recordRef = node['rico:isAssociatedWithRecord'];
  const recordId = recordRef && recordRef['@id'] || null;
  store.mobilityEvents.set(id, {
    id,
    place: placeName,
    placeWikidata: placeQid,
    placeLat,
    placeLon,
    placeCountry,
    date: node['m3gim:atDate'] || null,
    role: node['m3gim:eventRole'] || null,
    description: node['rico:generalDescription'] || null,
    recordId,
    xlsxSource: extractXlsxSource(node),
  });
}

/** Record → Event-IDs (aus m3gim:hasSpatiotemporalEvent am Record). */
function indexRecordToEvents(store, record) {
  const refs = ensureArray(record['m3gim:hasSpatiotemporalEvent']);
  if (refs.length === 0) return;
  const eventIds = [];
  for (const ref of refs) {
    const eid = ref && ref['@id'];
    if (eid && store.mobilityEvents.has(eid)) eventIds.push(eid);
  }
  if (eventIds.length > 0) store.recordToEvents.set(record['@id'], eventIds);
}


/** AgRelOn-Relationen am Record. */
function indexAgentRelations(store, record) {
  const rels = ensureArray(record['m3gim:agentRelation']);
  if (rels.length === 0) return;
  const entries = [];
  for (const rel of rels) {
    if (!rel || typeof rel !== 'object') continue;
    const obj = rel['agrelon:hasObject'] || {};
    const validity = rel['agrelon:hasValidityPeriod'];
    entries.push({
      type: rel['@type'] || null,
      objectName: obj.name || null,
      objectWikidata: obj['@id'] && String(obj['@id']).startsWith('wd:') ? obj['@id'] : null,
      validityBegin: validity && validity['agrelon:hasBeginDate'] || null,
      validityEnd: validity && validity['agrelon:hasEndDate'] || null,
      provenance: rel['agrelon:hasProvenance'] && rel['agrelon:hasProvenance']['@id'] || null,
      xlsxSource: extractXlsxSource(rel),
    });
  }
  if (entries.length > 0) store.agentRelations.set(record['@id'], entries);
}

/** Finanz-DetailAnnotations (nur mit monetaryAmount). */
function indexFinances(store, record) {
  const details = ensureArray(record['m3gim:hasDetail']);
  if (details.length === 0) return;
  const entries = [];
  for (const det of details) {
    if (!det || typeof det !== 'object') continue;
    if (det['@type'] !== 'm3gim:DetailAnnotation') continue;
    const amount = det['m3gim:monetaryAmount'];
    if (!amount || typeof amount !== 'object') continue;
    const raw = amount['@value'];
    const value = raw != null ? Number(raw) : null;
    entries.push({
      field: det['m3gim:detailField'] || null,
      role: det['m3gim:detailRole'] || null,
      rawValue: det['m3gim:detailValue'] || null,
      amount: Number.isFinite(value) ? value : null,
      currency: det['m3gim:currency'] || null,
      xlsxSource: extractXlsxSource(det),
    });
  }
  if (entries.length > 0) store.finances.set(record['@id'], entries);
}

/**
 * Pass 2.5 — Rueckwaerts-Aufloesung: fuer jede Relation in store.agentRelations
 * wird das Ziel (objectName / objectWikidata) im Personen-Index gesucht und
 * dort in personEntry.relations[] angehaengt. Erlaubt Beziehungsbadges im
 * Personen-Grid. Zaehlt aufgeloeste vs. gesamte Relationen in
 * store.agentRelationResolvedCount + store.agentRelationTotalCount.
 */
function resolveAgentRelationsToPersons(store) {
  const personsByQid = new Map();
  for (const entry of store.persons.values()) {
    if (entry.wikidata && String(entry.wikidata).startsWith('wd:')) {
      personsByQid.set(entry.wikidata, entry);
    }
  }

  let total = 0;
  let resolved = 0;
  for (const [recordId, entries] of store.agentRelations) {
    for (const rel of entries) {
      total++;
      let personEntry = null;
      if (rel.objectWikidata) personEntry = personsByQid.get(rel.objectWikidata) || null;
      if (!personEntry && rel.objectName) {
        personEntry = store.persons.get(normalizePerson(rel.objectName)) || null;
      }
      if (!personEntry) continue;
      if (!personEntry.relations) personEntry.relations = [];
      personEntry.relations.push({
        type: rel.type,
        recordId,
        objectName: rel.objectName,
        xlsxSource: rel.xlsxSource || null,
      });
      resolved++;
    }
  }
  store.agentRelationTotalCount = total;
  store.agentRelationResolvedCount = resolved;
}

/* ------------------------------------------------------------------ */
/*  Partitur singleton                                                 */
/* ------------------------------------------------------------------ */

let _partiturCache = null;
let _partiturPromise = null;

/**
 * Load partitur.json once, cache the result.
 * Concurrent calls share the same in-flight promise.
 * @param {string} [url]
 * @returns {Promise<Object|null>}
 */
export async function loadPartitur(url = './data/partitur.json') {
  if (_partiturCache) return _partiturCache;
  if (_partiturPromise) return _partiturPromise;
  _partiturPromise = fetch(url)
    .then(r => {
      if (!r.ok) {
        console.warn(`[Partitur] Laden fehlgeschlagen (HTTP ${r.status})`);
        return null;
      }
      return r.json();
    })
    .then(data => { _partiturCache = data; return data; })
    .catch(err => {
      console.warn('[Partitur] Nicht erreichbar:', err.message);
      return null;
    });
  return _partiturPromise;
}

/**
 * Get cached Lebensphasen array (requires prior loadPartitur() call).
 * @returns {Array}
 */
export function getLebensphasen() {
  return _partiturCache?.lebensphasen || [];
}
