/**
 * M³GIM Data Loader
 * Fetches m3gim.jsonld, parses the @graph, builds in-memory indexes.
 */

import { extractYear, splitQualifier } from '../utils/date-parser.js';
import {
  ensureArray, getDocTypeId, countLinks, cityOf, roleIdOf, roleToken, roleLabel,
} from '../utils/format.js';
import { normalizePerson, getPersonKategorie } from '../utils/normalize.js';
import { extractXlsxSource } from '../utils/provenance.js';
import {
  mobilityClusterFor, ANCHORING_SCOPES, LITERAL_ROLE_SCOPE,
} from './constants.js';

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
 * Store maps flatten JSON-LD subobjects into a lookup format so consumers do
 * not navigate nested structures. The cost is that JSON-LD keys like
 * `agrelon:hasObject` NO LONGER exist in the store entries. The counterpart
 * comes from counterpartOf(), which covers both build forms. When extending,
 * always keep the JSDoc shapes below at hand.
 *
 * @typedef {Object} RelationEntry       entry in store.agentRelations
 * @property {string} type               AgRelOn predicate ("agrelon:HasCorrespondent" etc.)
 * @property {string|null} objectName    entity name of the relation partner
 * @property {string|null} objectWikidata  Q-id with wd: prefix or null
 * @property {string|null} objectRole    concept CURIE of the recorded role of
 *   the counterpart, or null. A symmetric relation term carries no direction;
 *   this role holds it (E-149).
 * @property {string|null} objectRoleLabel  display form of that role
 * @property {string|null} validityBegin
 * @property {string|null} validityEnd
 * @property {string} provenance         @id of the record carrying the relation
 * @property {{sheet: string, row: number, datenpunkt: ?number}} xlsxSource
 *
 * @typedef {Object} Annotation          entry in store.annotations
 *   An aspect node of the record: Datierung, Verortung or both. The located
 *   annotations are also store.mobilityEvents -- the same objects under two
 *   access paths.
 * @property {string} id                 @id of the annotation node
 * @property {?string} place             place name
 * @property {?string} placeWikidata     Q-id with wd: prefix or null
 * @property {?number} placeLat
 * @property {?number} placeLon
 * @property {?string} placeCountry
 * @property {?string} date              date value without qualifier
 * @property {?string} rawDate           date value as in the data
 * @property {?string} qualifier         'circa' | 'vor' | 'nach' | null
 * @property {?number} year              year from date, null if unparsable
 * @property {?string} role              raw form of the role, e.g. "zielort"
 * @property {?string} roleId            concept id, null for a literal
 * @property {string} roleLabel          display form from the data
 * @property {?string} derivedFromRole   originally recorded role value
 * @property {?string} scope             Bezugsebene (see constants.js)
 * @property {number} rank               role priority (constants.js)
 * @property {?string} cluster           mobility Sicht of the role
 * @property {string} origin             'annotation' | 'creationDate'
 * @property {?string} description       free text
 * @property {?string} qualityFlag       m3gim-ontology:dataQualityFlag
 * @property {?string} recordId          @id of the origin record
 * @property {?Object} xlsxSource        provenance, see utils/provenance.js
 *
 * @typedef {{year: ?number, source: ?string, roleId: ?string, label: ?string}} Anchor
 *   result of primaryYear(): the year of the record and the named place it
 *   comes from.
 *
 * @typedef {Object} FinanceEntry        entry in store.finances
 * @property {?number} amount            numeric (MonetaryAmount hasValue)
 * @property {?string} currency          ISO 4217 or raw code (e.g. "S" = Schilling)
 * @property {?string} description       e.g. "Honorar", "Reisekosten"
 *
 * @typedef {Object} RoleEntry           entry in store.roleVocab
 * @property {string} id                 concept id or literal
 * @property {boolean} literal           true if the role is not a concept
 * @property {?string} label             display form from the data
 * @property {?string} scope             Bezugsebene, null if not tracked
 * @property {number} rank               role priority
 * @property {?string} cluster           mobility Sicht of the role
 * @property {boolean} onAnnotation      role sits on at least one annotation
 *   node of the graph and thus needs a Bezugsebene. Finance items under
 *   hasDetail do not count, they carry neither date nor place.
 *
 * @typedef {Object} DftConcept          entry in store.dftHierarchy
 * @property {string} id                 @id without prefix
 * @property {string} prefLabel
 * @property {?string} broader           parent concept id or null
 * @property {string[]} children         child concept ids (resolved backwards)
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
    recordCount: jsonld['m3gim-ontology:recordCount'] || 0,
    konvolutCount: jsonld['m3gim-ontology:recordSetCount'] || 0,
    exportDate: jsonld['m3gim-ontology:exportDate'] || '',
    qualityMeta: {
      approvedManualMatches: jsonld['m3gim-ontology:approvedManualMatches'] ?? 0,
      lowConfidenceSkipped: jsonld['m3gim-ontology:lowConfidenceSkipped'] ?? 0,
    },
    childToKonvolut: new Map(),
    // v2 structures (Phase 6). Shapes: see JSDoc above buildStore().
    /** @type {Map<string, DftConcept>} */
    dftHierarchy: new Map(),
    conceptDefinitions: new Map(),
    /** @type {Map<string, string>} roleId → Bezugsebene (concept CURIE), from the vocabulary (E-150) */
    roleScope: new Map(),
    /** @type {Map<string, number>} roleId → dating rank, from the vocabulary (E-150) */
    roleRank: new Map(),
    /** @type {Map<string, RoleEntry>} roleId → role term */
    roleVocab: new Map(),
    /** @type {Map<string, Annotation>} all annotations, located or not */
    annotations: new Map(),
    /** @type {Map<string, string[]>} recordId → annotationId[], source order */
    recordToAnnotations: new Map(),
    /** @type {Map<string, Annotation[]>} recordId → Datierungen, source order */
    recordDatings: new Map(),
    /** @type {Map<string, Annotation>} the located annotations */
    mobilityEvents: new Map(),
    /** @type {Map<string, string[]>} recordId → eventId[] */
    recordToEvents: new Map(),
    /** @type {Map<string, RelationEntry[]>} */
    agentRelations: new Map(),
    /** @type {Map<string, FinanceEntry[]>} */
    finances: new Map(),
    /** @type {Map<string, string>} stageRoleId → name (E-96) */
    stageRoles: new Map(),
    /** @type {Map<string, object>} performanceId → performance node (E-96/E-98) */
    performances: new Map(),
    /** @type {Map<string, Array>} recordId → resolved performances (M2):
     *  [{ id, work:{name,wikidata}|null, performers:[name], stageRoles:[name], date }] */
    recordToPerformances: new Map(),
    // Facet indexes of the shared filter. They carry the axes recordsFor would
    // otherwise re-search over the graph on every cut.
    /** @type {Map<string, Set<string>>} annotation role → record @ids */
    eventsByRole: new Map(),
    /** @type {Map<string, Set<string>>} agent role → record @ids */
    recordsByAgentRole: new Map(),
    /** @type {Map<string, {records: Set<string>, wikidata: ?string}>} rico:Group.
     *  Ensembles also stay in store.organizations, so map, Verknuepfungen and
     *  indexes keep running unchanged. */
    ensembles: new Map(),
  };

  // Pass 0: terms first. An annotation reads the Bezugsebene of its role during
  // build; if the term stood later in the graph, it would find none and fall
  // silently out of the Zeitanker.
  for (const node of graph) {
    if (node['@type'] === 'skos:Concept') indexConcept(store, node);
  }

  // Pass 1: Classify nodes
  for (const node of graph) {
    const nodeType = node['@type'];
    if (nodeType === 'rico:RecordSet') {
      const setType = node['rico:hasRecordSetType'];
      const typeId = setType ? setType['@id'] : null;
      if (typeId === 'ric-rst:Fonds') {
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
      // handled in Pass 0
    } else if (nodeType === 'm3gim-ontology:Annotation') {
      indexAnnotation(store, node);
    } else if (nodeType === 'm3gim-ontology:StageRole') {
      store.stageRoles.set(node['@id'], node['rico:name'] || node['@id']);
    } else if (nodeType === 'm3gim-ontology:Performance') {
      store.performances.set(node['@id'], node);
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
    indexRecordAnnotations(store, record);
    indexDatings(store, record);
    indexByYear(store, record);
    indexByDocType(store, record);
    indexAgents(store, record);
    indexLocations(store, record);
    indexWorks(store, record);
    indexAgentRelations(store, record);
    indexFinances(store, record);
    indexPerformances(store, record);
  }

  // Pass 2.2: address-precise places ("city, street") roll their records
  // additively up to the city entry, provided the city exists on its own.
  // Closes the recall gap in the place filter (filter "Zürich" otherwise missed
  // records recorded only address-precise) and consolidates the place index.
  // The address entries stay for address-precise research.
  consolidateCityLocations(store);

  // Pass 2.5: resolve AgRelOn relations backwards onto the person index. For
  // each relation the object is looked up in the person index (primarily by
  // Q-id, secondarily by normalizePerson(name)) and appended there in
  // personEntry.relations[]. Provides the data for relation badges in the
  // Indizes tab.
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
    const docTypeCounts = new Map();  // DFT id -> count
    const statusCounts = new Map();   // Bearbeitungsstand -> count
    let processedCount = 0;           // with at least one Verknuepfung

    // docTypeCounts / statusCounts aggregate only over the VISIBLE
    // (= linked) children -- consistent with the "only processed" principle and
    // the visible child count in the Konvolut badge. Otherwise bizarre
    // discrepancies arise like "Konvolut (3)" + "10x Programmheft".
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
      if (childLinks === 0) continue;  // aggregate only processed children
      processedCount++;
      const dft = getDocTypeId(child);
      if (dft) docTypeCounts.set(dft, (docTypeCounts.get(dft) || 0) + 1);
      const status = child['m3gim-ontology:processingStatus'];
      if (status) statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }

    // Konvolut title: preferably from the Folio record, else from the
    // collection record. scripts/transform.py assigns the collection-row suffix
    // as _collection, see knowledge/data.md § Datenqualität -- its title describes the
    // Konvolut by content, e.g. "Diverse Zeitungsausschnitte" for NIM_006.
    const sammelChildId = realChildIds.find(cid => cid.endsWith('_collection'));
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
      minYear: minYear === Infinity ? null : minYear,
      childCount: realChildIds.length,
      processedCount,
      folioId,
      totalLinks,
      datedCount,
      docTypeCounts,   // Map<dftId, count>
      statusCounts,    // Map<Bearbeitungsstand, count>
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

/* ------------------------------------------------------------------ */
/*  Access layer for Datierungen and Verortungen                        */
/*                                                                      */
/*  Four functions replace the flat typed date family. A view reads a   */
/*  Datierung through them without knowing a property name: the role is  */
/*  a reference to a vocabulary term on the node and carries its display */
/*  form, the Bezugsebene says what the Datierung refers to, and the    */
/*  rank orders several against each other. Documented in                */
/*  data/reports/frontend-date-contract.md, A1--A4.                     */
/* ------------------------------------------------------------------ */

/**
 * All annotations of a record in source order, located as well as unlocated,
 * dated as well as undated.
 * @param {Object} store
 * @param {Object} record
 * @returns {Annotation[]}
 */
function annotationsOf(store, record) {
  if (!store || !record) return [];
  const ids = store.recordToAnnotations.get(record['@id']) || [];
  return ids.map(id => store.annotations.get(id)).filter(Boolean);
}

/**
 * All Datierungen of a record in source order. The loader does not re-sort, so
 * the order of the recording table stays visible (contract A2, second order);
 * to select by priority take the `rank` field. The creation dating from
 * `rico:creationDate` stands as a Datierung with role `m3gim-vocab:creation` at
 * the end of the list; it has no position in the source order because it sits
 * on the record itself.
 * @param {Object} store
 * @param {Object} record
 * @returns {Annotation[]}
 */
export function datingsOf(store, record) {
  if (!store || !record) return [];
  return store.recordDatings.get(record['@id']) || [];
}

/**
 * The Datierungen of one Bezugsebene (contract A3). Access for any view that
 * may see only one level, e.g. the timeline, which excludes Erwaehnungen.
 * @param {Object} store
 * @param {Object} record
 * @param {string} scope - 'object' | 'attested' | 'mentioned' | 'framing'
 *   | 'unfulfilled' | 'unclassified'
 * @returns {Annotation[]}
 */
export function datingsByScope(store, record, scope) {
  return datingsOf(store, record).filter(d => d.scope === scope);
}

/**
 * The year of a record and the place it comes from (contract A4). `rico:date`
 * stays the single-valued Zeitanker and takes precedence; if absent, the
 * highest-ranked Datierung of an anchoring Bezugsebene wins. Erwaehnung,
 * Rahmenveranstaltung and the contract status `nicht eingehalten` never date.
 * Replaces firstTypedYear and secondaryYearForRecord in one.
 * @param {Object} store
 * @param {Object} record
 * @returns {Anchor}
 */
export function primaryYear(store, record) {
  const none = { year: null, source: null, roleId: null, label: null };
  if (!record) return none;
  const anchor = extractYear(record['rico:date']);
  if (anchor) return { year: anchor, source: 'rico:date', roleId: null, label: null };
  let best = null;
  for (const d of datingsOf(store, record)) {
    if (d.year == null) continue;
    if (!ANCHORING_SCOPES.has(d.scope)) continue;
    if (best === null || d.rank < best.rank) best = d;
  }
  if (!best) return none;
  return {
    year: best.year,
    source: best.origin === 'creationDate' ? 'rico:creationDate' : best.roleId,
    roleId: best.roleId,
    label: best.roleLabel,
  };
}

function indexByYear(store, record) {
  const { year } = primaryYear(store, record);
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

/**
 * Agent role → records. The key is the same one store.roleVocab uses for the
 * term (concept id, else literal), so the facet finds its display form without
 * a second mapping.
 */
function indexAgentRole(store, role, recordId) {
  if (!role || !recordId) return;
  const key = roleIdOf(role) || roleToken(role);
  if (!key) return;
  let ids = store.recordsByAgentRole.get(key);
  if (!ids) { ids = new Set(); store.recordsByAgentRole.set(key, ids); }
  ids.add(recordId);
}

/** rico:Group as its own axis next to the institution (ensemble). */
function indexEnsemble(store, name, recordId, wikidata) {
  let entry = store.ensembles.get(name);
  if (!entry) { entry = { records: new Set(), wikidata: wikidata || null }; store.ensembles.set(name, entry); }
  entry.records.add(recordId);
  if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
}

function indexAgents(store, record) {
  const agents = ensureArray(record['m3gim-ontology:hasAssociatedAgent']);

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
      if (type === 'rico:Group') indexEnsemble(store, rawName, record['@id'], wikidata);
      const orgRole = registerRole(store, agent.role);
      indexAgentRole(store, agent.role, record['@id']);
      if (orgRole) entry.roles.add(orgRole);
      if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
      // M2: curated seat (index) takes precedence over Wikidata seat (often
      // just a district); carries the "away/at the house" axis. + key contact + note.
      if (agent['m3gim-ontology:headquarters'] && !entry.sitz) entry.sitz = agent['m3gim-ontology:headquarters'];
      else if (agent['m3gim-ontology:wdLocation'] && !entry.sitz) entry.sitz = agent['m3gim-ontology:wdLocation'];
      if (agent['m3gim-ontology:keyContact'] && !entry.keyContact) entry.keyContact = agent['m3gim-ontology:keyContact'];
      if (agent['m3gim-ontology:indexNote'] && !entry.note) entry.note = agent['m3gim-ontology:indexNote'];
    } else {
      const name = normalizePerson(rawName);
      if (isJunkName(name)) continue;
      if (!store.persons.has(name)) {
        store.persons.set(name, { records: new Set(), roles: new Set(), kategorie: getPersonKategorie(name), wikidata });
      }
      const entry = store.persons.get(name);
      entry.records.add(record['@id']);
      const agentRole = registerRole(store, agent.role);
      indexAgentRole(store, agent.role, record['@id']);
      if (agentRole) entry.roles.add(agentRole);
      if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
      // WD-Enrichment-Properties
      if (agent['gndo:professionOrOccupationAsLiteral'] && !entry.occupation) entry.occupation = agent['gndo:professionOrOccupationAsLiteral'];
      if (agent['m3gim-ontology:voiceType'] && !entry.voiceType) entry.voiceType = agent['m3gim-ontology:voiceType'];
      if (agent['schema:birthDate'] && !entry.birthDate) entry.birthDate = agent['schema:birthDate'];
      if (agent['schema:deathDate'] && !entry.deathDate) entry.deathDate = agent['schema:deathDate'];
      // M2: curated index fields (occupation note + life dates)
      if (agent['m3gim-ontology:indexNote'] && !entry.note) entry.note = agent['m3gim-ontology:indexNote'];
      if (agent['m3gim-ontology:lifespan'] && !entry.lifespan) entry.lifespan = agent['m3gim-ontology:lifespan'];
    }
  }

  // Mentioned persons are in rico:hasOrHadSubject with @type rico:Person
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
    const subjRole = registerRole(store, subj.role);
    indexAgentRole(store, subj.role, record['@id']);
    if (subjRole) entry.roles.add(subjRole);
    if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
    // M2: curated index fields also for mentioned subject persons
    if (subj['m3gim-ontology:indexNote'] && !entry.note) entry.note = subj['m3gim-ontology:indexNote'];
    if (subj['m3gim-ontology:lifespan'] && !entry.lifespan) entry.lifespan = subj['m3gim-ontology:lifespan'];
  }
}

function indexLocations(store, record) {
  const locs = ensureArray(record['rico:hasOrHadLocation']);
  for (const loc of locs) {
    const name = loc.name || loc['skos:prefLabel'] || '';
    if (!name) continue;
    // Date values that slipped into the place column. The four-leading-digits
    // check let the month-day form "06-09" through; a place name always carries
    // at least one letter.
    if (!/\p{L}/u.test(name)) continue;
    if (/^\d{4}(-\d{2}){0,2}/.test(name)) continue;
    const wikidata = loc['@id'] || null;
    if (!store.locations.has(name)) {
      store.locations.set(name, { records: new Set(), roles: new Set(), wikidata: wikidata });
    }
    const entry = store.locations.get(name);
    entry.records.add(record['@id']);
    const locRole = registerRole(store, loc.role);
    if (locRole) entry.roles.add(locRole);
    if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
  }
}

/**
 * Roll address-precise places additively under their city. Conservative: only
 * when cityOf(name) != name (i.e. address-precise) AND the city already exists
 * as its own place (no new city entries created, no false merge). Address
 * entries stay unchanged.
 */
function consolidateCityLocations(store) {
  for (const [name, entry] of [...store.locations]) {
    const city = cityOf(name);
    if (city === name) continue;
    const cityEntry = store.locations.get(city);
    if (!cityEntry) continue;
    for (const id of entry.records) cityEntry.records.add(id);
    for (const r of entry.roles) cityEntry.roles.add(r);
  }
}

function indexWorks(store, record) {
  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  for (const subj of subjects) {
    if (subj['@type'] !== 'm3gim-ontology:MusicalWork') continue;
    const name = subj.name || subj['skos:prefLabel'] || '';
    if (!name) continue;
    if (!store.works.has(name)) {
      store.works.set(name, { records: new Set(), komponist: subj.composer || null, wikidata: subj['@id'] || null });
    }
    const wEntry = store.works.get(name);
    wEntry.records.add(record['@id']);
    // WD enrichment: premiere date
    if (subj['m3gim-ontology:wdPremiereDate'] && !wEntry.premiereDate) wEntry.premiereDate = subj['m3gim-ontology:wdPremiereDate'];
    if (subj['m3gim-ontology:wdGenre'] && !wEntry.wdGenre) wEntry.wdGenre = subj['m3gim-ontology:wdGenre'];
    // M2: curated index fields — the Partie Malaniuk sang + note
    if (subj['m3gim-ontology:sungPart'] && !wEntry.partie) wEntry.partie = subj['m3gim-ontology:sungPart'];
    if (subj['m3gim-ontology:indexNote'] && !wEntry.note) wEntry.note = subj['m3gim-ontology:indexNote'];
  }
}

/* ------------------------------------------------------------------ */
/*  v2 store maps (Phase 6)                                            */
/* ------------------------------------------------------------------ */

/**
 * SKOS concept (DFT hierarchy). Pass 1 creates only single nodes,
 * parent→children follows in Pass 1.5. Document types and roles share the
 * m3gim-vocab prefix since the three-way namespace split and are separated by
 * their concept scheme; without the split every role would appear as a document
 * type in the facet. The definition of each term is recorded independent of the
 * scheme, because the UI needs it on every label (E-143).
 */
const DFT_SCHEME = 'm3gim-vocab:documentaryFormTypes';

function indexConcept(store, node) {
  const id = node['@id'];
  if (!id) return;
  const label = node['skos:prefLabel'] || id.split(':').pop();
  const definition = node['skos:definition'] || null;
  if (definition) store.conceptDefinitions.set(id, { id, label, definition });

  // Bezugsebene and rank of a Datierung sit on the role term since E-150 and
  // reach the store from there; the frontend keeps no table for it.
  const scope = node['m3gim-ontology:datingScope'];
  const scopeId = scope && typeof scope === 'object' ? scope['@id'] : scope;
  if (scopeId) store.roleScope.set(id, scopeId);
  const rank = node['m3gim-ontology:datingRank'];
  if (typeof rank === 'number') store.roleRank.set(id, rank);

  const scheme = node['skos:inScheme'] && node['skos:inScheme']['@id'] || null;
  // Without a scheme the legacy case applies: until E-143 the dataset carried
  // exclusively document-type concepts.
  if (scheme && scheme !== DFT_SCHEME) return;

  const broader = node['skos:broader'] && node['skos:broader']['@id'] || null;
  store.dftHierarchy.set(id, { id, prefLabel: label, broader, children: [] });
}

/**
 * Bezugsebene of a role, from the vocabulary via the dataset (E-150). null if
 * the term carries none.
 */
function scopeForRole(store, roleId) {
  if (!roleId) return null;
  return store.roleScope.get(roleId) || LITERAL_ROLE_SCOPE[roleId] || null;
}

/**
 * Rank of a role. A term without a rank sorts behind every term with one, so
 * the function returns a value above any assigned rank there.
 */
function rankForRole(store, roleId) {
  const rank = roleId != null ? store.roleRank.get(roleId) : undefined;
  return rank === undefined ? Number.MAX_SAFE_INTEGER : rank;
}

/**
 * Register a role value in the role register and return its raw form. The
 * display label comes from the data (skos:prefLabel on the reference node);
 * Bezugsebene, rank and mobility Sicht hang on the stable concept id. The
 * contract status `nicht eingehalten` is not a concept and is tracked under its
 * literal.
 * @returns {?string} raw form of the role
 */
function registerRole(store, role, onAnnotation = false) {
  if (!role) return null;
  const id = roleIdOf(role);
  const token = roleToken(role);
  const key = id || token;
  if (!key) return null;
  let entry = store.roleVocab.get(key);
  if (!entry) {
    entry = {
      id: key,
      literal: !id,
      label: id ? null : token,
      scope: scopeForRole(store, key),
      rank: rankForRole(store, key),
      cluster: mobilityClusterFor(key),
      onAnnotation: false,
    };
    store.roleVocab.set(key, entry);
  }
  if (id && !entry.label && typeof role === 'object' && role['skos:prefLabel']) {
    entry.label = role['skos:prefLabel'];
  }
  if (onAnnotation) entry.onAnnotation = true;
  return token;
}

/**
 * Normalize a top-level annotation. A node carries a Datierung, a Verortung or
 * both; the located ones also land in store.mobilityEvents and are the same
 * objects there, not copies.
 */
function indexAnnotation(store, node) {
  const id = node['@id'];
  if (!id) return;
  const place = node['m3gim-ontology:atPlace'];
  const placeName = place && (place.name || place['skos:prefLabel']) || null;
  const placeQid = place && place['@id'] && String(place['@id']).startsWith('wd:') ? place['@id'] : null;
  const placeLat = place && typeof place['geo:lat'] === 'number' ? place['geo:lat'] : null;
  const placeLon = place && typeof place['geo:long'] === 'number' ? place['geo:long'] : null;
  const placeCountry = place && place['m3gim-ontology:country'] || null;
  const recordRef = node['agrelon:metadataProvenance'];
  const rawDate = node['m3gim-ontology:atDate'] || null;
  const { qualifier, value } = splitQualifier(rawDate);
  const role = node.role;
  const roleId = roleIdOf(role);
  const entry = {
    id,
    place: placeName,
    placeWikidata: placeQid,
    placeLat,
    placeLon,
    placeCountry,
    date: value,
    rawDate,
    qualifier,
    year: extractYear(value),
    role: registerRole(store, role, true),
    roleId,
    roleLabel: roleLabel(store, role),
    derivedFromRole: node['m3gim-ontology:derivedFromRole'] || null,
    // An annotation without a role is undecidable in its Bezugsebene and thus
    // does not date. The value names the state rather than hiding it.
    scope: role
      ? scopeForRole(store, roleId || (typeof role === 'string' ? role : null))
      : 'unclassified',
    rank: rankForRole(store, roleId),
    cluster: mobilityClusterFor(roleId || (typeof role === 'string' ? role : null)),
    origin: 'annotation',
    description: node['rico:generalDescription'] || null,
    qualityFlag: node['m3gim-ontology:dataQualityFlag'] || null,
    recordId: recordRef && recordRef['@id'] || null,
    xlsxSource: extractXlsxSource(node),
  };
  store.annotations.set(id, entry);
  if (placeName) store.mobilityEvents.set(id, entry);
}

/**
 * Record → annotation ids in source order. The located ones go on into
 * store.recordToEvents; they are the spatiotemporal trace on which the map, the
 * Sicht derivation of the Chronik and the enge Schaerfegrad hang.
 */
function indexRecordAnnotations(store, record) {
  const refs = ensureArray(record['m3gim-ontology:hasAnnotation']);
  if (refs.length === 0) return;
  const ids = [];
  const eventIds = [];
  for (const ref of refs) {
    const aid = ref && ref['@id'];
    if (!aid || !store.annotations.has(aid)) continue;
    ids.push(aid);
    if (store.mobilityEvents.has(aid)) eventIds.push(aid);
  }
  if (ids.length > 0) store.recordToAnnotations.set(record['@id'], ids);
  if (eventIds.length > 0) store.recordToEvents.set(record['@id'], eventIds);

  // Event role → records. The key follows store.roleVocab, as for the agent
  // role; an annotation without a role carries no axis.
  for (const aid of ids) {
    const key = store.annotations.get(aid).roleId;
    if (!key) continue;
    let set = store.eventsByRole.get(key);
    if (!set) { set = new Set(); store.eventsByRole.set(key, set); }
    set.add(record['@id']);
  }
}

/**
 * Collect a record's Datierungen: the dated annotations in source order, then
 * the creation dating from `rico:creationDate`, which sits on the record itself
 * and thus has no position in the source order.
 */
function indexDatings(store, record) {
  const list = [];
  for (const annotation of annotationsOf(store, record)) {
    if (annotation.date) list.push(annotation);
  }
  const creation = record['rico:creationDate'];
  if (creation) {
    const { qualifier, value } = splitQualifier(creation);
    // The role is not attached to the property, it is determined by the
    // property. It is registered anyway so the role check sees it: without a
    // role reference somewhere in the data this Datierung too has no display
    // form.
    const roleId = 'm3gim-vocab:creation';
    registerRole(store, roleId);
    list.push({
      id: null,
      place: null,
      placeWikidata: null,
      placeLat: null,
      placeLon: null,
      placeCountry: null,
      date: value,
      rawDate: creation,
      qualifier,
      year: extractYear(value),
      role: roleLabel(store, roleId),
      roleId,
      roleLabel: roleLabel(store, roleId),
      derivedFromRole: null,
      scope: scopeForRole(store, roleId),
      rank: rankForRole(store, roleId),
      cluster: mobilityClusterFor(roleId),
      origin: 'creationDate',
      description: null,
      qualityFlag: null,
      recordId: record['@id'],
      xlsxSource: extractXlsxSource(record),
    });
  }
  if (list.length > 0) store.recordDatings.set(record['@id'], list);
}


/**
 * Resolve the performance chain (M2): Record -> m3gim-ontology:hasPerformance
 * -> Performance -> {performanceOf (work, inline), hasPerformer (person,
 *     inline), hasStageRole (ref to store.stageRoles), atDate}.
 * Materializes the backbone of the enge Schaerfegrad in the Verknuepfungen
 * graph: per record the attested performances with work, participants and
 * Buehnenrolle. The individual performance nodes are fragmentary (either role,
 * or role+performer, or work+date) — merged here, not invented.
 */
function indexPerformances(store, record) {
  const refs = ensureArray(record['m3gim-ontology:hasPerformance']);
  if (refs.length === 0) return;
  const resolved = [];
  for (const ref of refs) {
    const pid = ref && ref['@id'];
    const perf = pid && store.performances.get(pid);
    if (!perf) continue;
    const wof = perf['m3gim-ontology:performanceOf'];
    const work = wof
      ? { name: wof.name || wof['skos:prefLabel'] || null,
          wikidata: (wof['@id'] && String(wof['@id']).startsWith('wd:')) ? wof['@id'] : null }
      : null;
    const stageRoles = ensureArray(perf['m3gim-ontology:hasStageRole'])
      .map(r => r && r['@id'] && store.stageRoles.get(r['@id']))
      .filter(Boolean);
    const performers = ensureArray(perf['m3gim-ontology:hasPerformer'])
      .map(p => p && (p.name || p['skos:prefLabel']))
      .filter(Boolean);
    resolved.push({
      id: pid,
      work,
      stageRoles,
      performers,
      date: perf['m3gim-ontology:atDate'] || null,
    });
  }
  if (resolved.length > 0) store.recordToPerformances.set(record['@id'], resolved);
}


// Identifier of the fonds subject who occupies one side of every AgRelOn
// relation. In the symmetric build form the other side is the partner.
const FONDS_SUBJECT_ID = 'wd:Q94208';
const FONDS_SUBJECT_NAME = 'Malaniuk, Ira';

/**
 * The counterpart of an AgRelOn relation, independent of its build form.
 *
 * A directed n-ary term carries `agrelon:hasSubject` and `agrelon:hasObject`, a
 * symmetric one like `HasCorrespondent` both sides as
 * `agrelon:hasSubjectObject` (E-149). Reading only the directed form yields no
 * partner for the entire Korrespondenz.
 */
function counterpartOf(rel) {
  const both = ensureArray(rel['agrelon:hasSubjectObject']);
  if (both.length > 0) {
    const other = both.find(p => p && typeof p === 'object'
      && p['@id'] !== FONDS_SUBJECT_ID && p.name !== FONDS_SUBJECT_NAME);
    return other || both[0] || {};
  }
  return rel['agrelon:hasObject'] || {};
}

/** AgRelOn relations on the record. */
function indexAgentRelations(store, record) {
  const rels = ensureArray(record['m3gim-ontology:hasAgentRelation']);
  if (rels.length === 0) return;
  const entries = [];
  for (const rel of rels) {
    if (!rel || typeof rel !== 'object') continue;
    const obj = counterpartOf(rel);
    const objRole = obj.role && typeof obj.role === 'object' ? obj.role : null;
    const validity = rel['agrelon:metadataPeriod'];
    entries.push({
      type: rel['@type'] || null,
      objectName: obj.name || null,
      objectWikidata: obj['@id'] && String(obj['@id']).startsWith('wd:') ? obj['@id'] : null,
      objectRole: objRole ? (objRole['@id'] || null) : null,
      objectRoleLabel: objRole ? (objRole['skos:prefLabel'] || null) : null,
      validityBegin: validity && validity['agrelon:hasBeginDate'] || null,
      validityEnd: validity && validity['agrelon:hasEndDate'] || null,
      provenance: rel['agrelon:metadataProvenance'] && rel['agrelon:metadataProvenance']['@id'] || null,
      xlsxSource: extractXlsxSource(rel),
    });
  }
  if (entries.length > 0) store.agentRelations.set(record['@id'], entries);
}

/** Finance items on the record (annotation under hasDetail, only with monetaryAmount). */
function indexFinances(store, record) {
  const details = ensureArray(record['m3gim-ontology:hasDetail']);
  if (details.length === 0) return;
  const entries = [];
  for (const det of details) {
    if (!det || typeof det !== 'object') continue;
    if (det['@type'] !== 'm3gim-ontology:Annotation') continue;
    const amount = det['m3gim-ontology:monetaryAmount'];
    if (!amount || typeof amount !== 'object') continue;
    const raw = amount['@value'];
    const value = raw != null ? Number(raw) : null;
    entries.push({
      field: det['m3gim-ontology:detailField'] || null,
      role: registerRole(store, det.role),
      rawValue: det['m3gim-ontology:detailValue'] || null,
      amount: Number.isFinite(value) ? value : null,
      currency: det['m3gim-ontology:currency'] || null,
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
  // Dieselbe Q-ID kann an zwei Namensvarianten haengen (Tippfehler im
  // Personen-Index). Ohne Vorrangregel gewinnt der zuletzt gesehene Eintrag
  // und zieht alle Relationen von der kanonischen Schreibweise ab.
  const personsByQid = new Map();
  for (const entry of store.persons.values()) {
    if (!entry.wikidata || !String(entry.wikidata).startsWith('wd:')) continue;
    const bisher = personsByQid.get(entry.wikidata);
    if (bisher && bisher.records.size >= entry.records.size) continue;
    personsByQid.set(entry.wikidata, entry);
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
