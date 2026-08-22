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
  scopeForRole, rankForRole, mobilityClusterFor, ANCHORING_SCOPES,
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
 * @typedef {Object} Annotation          Eintrag in store.annotations
 *   Ein Aspektknoten des Records: Datierung, Verortung oder beides. Die
 *   verorteten Annotationen sind zugleich store.mobilityEvents -- dieselben
 *   Objekte unter zwei Zugaengen.
 * @property {string} id                 @id des Annotationsknotens
 * @property {?string} place             Ortsname
 * @property {?string} placeWikidata     Q-ID mit wd:-Praefix oder null
 * @property {?number} placeLat
 * @property {?number} placeLon
 * @property {?string} placeCountry
 * @property {?string} date              Datumswert ohne Qualifier
 * @property {?string} rawDate           Datumswert wie in den Daten
 * @property {?string} qualifier         'circa' | 'vor' | 'nach' | null
 * @property {?number} year              Jahr aus date, null wenn unparsbar
 * @property {?string} role              Rohform der Rolle, z. B. "zielort"
 * @property {?string} roleId            Concept-Id, null beim Literal
 * @property {string} roleLabel          Anzeigeform aus den Daten
 * @property {?string} derivedFromRole   urspruenglich erfasster Rollenwert
 * @property {?string} scope             Bezugsebene (siehe constants.js)
 * @property {number} rank               Prioritaet der Rolle (constants.js)
 * @property {?string} cluster           Mobilitaetssicht der Rolle
 * @property {string} origin             'annotation' | 'creationDate'
 * @property {?string} description       freier Text
 * @property {?string} qualityFlag       m3gim-ontology:dataQualityFlag
 * @property {?string} recordId          @id des Ursprungs-Records
 * @property {?Object} xlsxSource        Herkunft, siehe utils/provenance.js
 *
 * @typedef {{year: ?number, source: ?string, roleId: ?string, label: ?string}} Anchor
 *   Ergebnis von primaryYear(): das Jahr des Records und die benannte Stelle,
 *   aus der es stammt.
 *
 * @typedef {Object} FinanceEntry        Eintrag in store.finances
 * @property {?number} amount            numerisch (MonetaryAmount hasValue)
 * @property {?string} currency          ISO 4217 oder Roh-Code (z. B. "S" = Schilling)
 * @property {?string} description       z. B. "Honorar", "Reisekosten"
 *
 * @typedef {Object} RoleEntry           Eintrag in store.roleVocab
 * @property {string} id                 Concept-Id oder Literal
 * @property {boolean} literal           true, wenn die Rolle kein Concept ist
 * @property {?string} label             Anzeigeform aus den Daten
 * @property {?string} scope             Bezugsebene, null wenn nicht gefuehrt
 * @property {number} rank               Prioritaet der Rolle
 * @property {?string} cluster           Mobilitaetssicht der Rolle
 * @property {boolean} onAnnotation      Rolle steht an mind. einem Annotations-
 *   knoten des Graphen und braucht deshalb eine Bezugsebene. Finanzposten
 *   unter hasDetail zaehlen nicht dazu, sie tragen weder Datum noch Ort.
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
    recordCount: jsonld['m3gim-ontology:recordCount'] || 0,
    konvolutCount: jsonld['m3gim-ontology:recordSetCount'] || 0,
    exportDate: jsonld['m3gim-ontology:exportDate'] || '',
    qualityMeta: {
      approvedManualMatches: jsonld['m3gim-ontology:approvedManualMatches'] ?? 0,
      lowConfidenceSkipped: jsonld['m3gim-ontology:lowConfidenceSkipped'] ?? 0,
    },
    childToKonvolut: new Map(),
    // v2-Strukturen (Phase 6). Shapes: siehe JSDoc oberhalb buildStore().
    /** @type {Map<string, DftConcept>} */
    dftHierarchy: new Map(),
    /** @type {Map<string, RoleEntry>} roleId → Rollenbegriff */
    roleVocab: new Map(),
    /** @type {Map<string, Annotation>} alle Annotationen, verortet oder nicht */
    annotations: new Map(),
    /** @type {Map<string, string[]>} recordId → annotationId[], Quellreihenfolge */
    recordToAnnotations: new Map(),
    /** @type {Map<string, Annotation[]>} recordId → Datierungen, Quellreihenfolge */
    recordDatings: new Map(),
    /** @type {Map<string, Annotation>} die verorteten Annotationen */
    mobilityEvents: new Map(),
    /** @type {Map<string, string[]>} recordId → eventId[] */
    recordToEvents: new Map(),
    /** @type {Map<string, RelationEntry[]>} */
    agentRelations: new Map(),
    /** @type {Map<string, FinanceEntry[]>} */
    finances: new Map(),
    /** @type {Map<string, string>} stageRoleId → name (E-96) */
    stageRoles: new Map(),
    /** @type {Map<string, object>} performanceId → Performance-Node (E-96/E-98) */
    performances: new Map(),
    /** @type {Map<string, Array>} recordId → aufgeloeste Performances (M2):
     *  [{ id, work:{name,wikidata}|null, performers:[name], stageRoles:[name], date }] */
    recordToPerformances: new Map(),
  };

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
      indexConcept(store, node);
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

  // Pass 2.2: Adressgenaue Orte ("Stadt, Strasse") rollen ihre Records additiv
  // zum Stadt-Eintrag hoch, sofern die Stadt eigenstaendig existiert. Schliesst
  // den Recall-Gap im Ort-Filter (Filter "Zürich" verfehlte sonst Records, die
  // nur adressgenau erfasst sind) und konsolidiert den Ort-Index. Die
  // Adress-Eintraege bleiben fuer adressgenaue Recherche erhalten.
  consolidateCityLocations(store);

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
      const status = child['m3gim-ontology:processingStatus'];
      if (status) statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }

    // Konvolut-Titel: bevorzugt aus Folio-Record, sonst aus Sammel-Record
    // (Sammel-Zeilen ohne Folio bekommen _sammlung-Suffix, siehe
    // knowledge/data.md § 17 -- ihr Titel beschreibt das Konvolut
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

/* ------------------------------------------------------------------ */
/*  Zugriffsschicht auf Datierungen und Verortungen                     */
/*                                                                      */
/*  Vier Funktionen loesen die flache typisierte Datumsfamilie ab. Eine  */
/*  Ansicht liest eine Datierung ueber sie, ohne einen Property-Namen zu */
/*  kennen: die Rolle steht als Verweis auf einen Vokabularbegriff am    */
/*  Knoten und fuehrt ihre Anzeigeform mit, die Bezugsebene sagt, worauf */
/*  sich die Datierung bezieht, und der Rang ordnet mehrere gegen-       */
/*  einander. Belegt in data/reports/frontend-date-contract.md, A1--A4.  */
/* ------------------------------------------------------------------ */

/**
 * Alle Annotationen eines Records in Quellreihenfolge, verortete wie
 * unverortete, datierte wie undatierte.
 * @param {Object} store
 * @param {Object} record
 * @returns {Annotation[]}
 */
export function annotationsOf(store, record) {
  if (!store || !record) return [];
  const ids = store.recordToAnnotations.get(record['@id']) || [];
  return ids.map(id => store.annotations.get(id)).filter(Boolean);
}

/**
 * Alle Datierungen eines Records in Quellreihenfolge. Der Loader sortiert
 * nicht um, damit die Reihenfolge der Erfassungstabelle sichtbar bleibt
 * (Vertrag A2, zweite Ordnung); wer nach Prioritaet auswaehlen will, nimmt
 * das Feld `rank`. Die Entstehungsdatierung aus `rico:creationDate` steht als
 * Datierung mit der Rolle `m3gim-vocab:creation` am Ende der Liste; sie hat
 * keine Position in der Quellreihenfolge, weil sie am Record selbst steht.
 * @param {Object} store
 * @param {Object} record
 * @returns {Annotation[]}
 */
export function datingsOf(store, record) {
  if (!store || !record) return [];
  return store.recordDatings.get(record['@id']) || [];
}

/**
 * Die Datierungen einer Bezugsebene (Vertrag A3). Zugang fuer jede Ansicht,
 * die nur eine Ebene sehen darf, etwa der Zeitstrahl, der Erwaehnungen
 * ausschliesst.
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
 * Das Jahr eines Records und die Stelle, aus der es stammt (Vertrag A4).
 * `rico:date` bleibt der einwertige Zeitanker und hat Vorrang; fehlt er,
 * gewinnt die ranghoechste Datierung einer ankernden Bezugsebene. Erwaehnung,
 * Rahmenveranstaltung und der Vertragsstatus `nicht eingehalten` datieren
 * nie. Loest firstTypedYear und secondaryYearForRecord in einem ab.
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
      const orgRole = registerRole(store, agent.role);
      if (orgRole) entry.roles.add(orgRole);
      if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
      // M2: kuratierter Sitz (Index) mit Vorrang vor Wikidata-Sitz (oft nur
      // Stadtteil); traegt die "auswaerts/am Haus"-Achse. + Schluesselkontakt + Notiz.
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
      if (agentRole) entry.roles.add(agentRole);
      if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
      // WD-Enrichment-Properties
      if (agent['gndo:professionOrOccupationAsLiteral'] && !entry.occupation) entry.occupation = agent['gndo:professionOrOccupationAsLiteral'];
      if (agent['m3gim-ontology:voiceType'] && !entry.voiceType) entry.voiceType = agent['m3gim-ontology:voiceType'];
      if (agent['schema:birthDate'] && !entry.birthDate) entry.birthDate = agent['schema:birthDate'];
      if (agent['schema:deathDate'] && !entry.deathDate) entry.deathDate = agent['schema:deathDate'];
      // M2: kuratierte Index-Felder (Beruf-Notiz + Lebensdaten)
      if (agent['m3gim-ontology:indexNote'] && !entry.note) entry.note = agent['m3gim-ontology:indexNote'];
      if (agent['m3gim-ontology:lifespan'] && !entry.lifespan) entry.lifespan = agent['m3gim-ontology:lifespan'];
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
    const subjRole = registerRole(store, subj.role);
    if (subjRole) entry.roles.add(subjRole);
    if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
    // M2: kuratierte Index-Felder auch fuer erwaehnte Subjekt-Personen
    if (subj['m3gim-ontology:indexNote'] && !entry.note) entry.note = subj['m3gim-ontology:indexNote'];
    if (subj['m3gim-ontology:lifespan'] && !entry.lifespan) entry.lifespan = subj['m3gim-ontology:lifespan'];
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
    const locRole = registerRole(store, loc.role);
    if (locRole) entry.roles.add(locRole);
    if (wikidata && !entry.wikidata) entry.wikidata = wikidata;
  }
}

/**
 * Adressgenaue Orte additiv unter ihre Stadt rollen. Konservativ: nur wenn
 * cityOf(name) != name (also adressgenau) UND die Stadt bereits als eigener
 * Ort existiert (kein Erzeugen neuer Stadt-Eintraege, kein Falsch-Merge).
 * Adress-Eintraege bleiben unveraendert bestehen.
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
    // WD-Enrichment: Premiere date
    if (subj['m3gim-ontology:wdPremiereDate'] && !wEntry.premiereDate) wEntry.premiereDate = subj['m3gim-ontology:wdPremiereDate'];
    if (subj['m3gim-ontology:wdGenre'] && !wEntry.wdGenre) wEntry.wdGenre = subj['m3gim-ontology:wdGenre'];
    // M2: kuratierte Index-Felder — die von Malaniuk gesungene Partie + Notiz
    if (subj['m3gim-ontology:sungPart'] && !wEntry.partie) wEntry.partie = subj['m3gim-ontology:sungPart'];
    if (subj['m3gim-ontology:indexNote'] && !wEntry.note) wEntry.note = subj['m3gim-ontology:indexNote'];
  }
}

/* ------------------------------------------------------------------ */
/*  v2-Store-Maps (Phase 6)                                            */
/* ------------------------------------------------------------------ */

/**
 * SKOS-Concept (DFT-Hierarchie). Pass 1 legt nur Einzelknoten an,
 * Parent→Children folgt in Pass 1.5. Dokumenttypen und Rollen teilen sich seit
 * der Zusammenfuehrung den Namensraum m3gim-vocab; ausgeliefert werden bisher
 * ausschliesslich Dokumenttyp-Concepts.
 */
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

/**
 * Rollenwert im Rollenregister vermerken und seine Rohform zurueckgeben.
 * Das Anzeigelabel kommt aus den Daten (skos:prefLabel am Verweisknoten); die
 * Bezugsebene, der Rang und die Mobilitaetssicht kommen aus constants.js und
 * haengen an der stabilen Concept-Id. Der Vertragsstatus `nicht eingehalten`
 * ist kein Concept und wird unter seinem Literal gefuehrt.
 * @returns {?string} Rohform der Rolle
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
      scope: scopeForRole(key),
      rank: rankForRole(key),
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
 * Top-Level-Annotation normalisieren. Ein Knoten traegt eine Datierung, eine
 * Verortung oder beides; die verorteten landen zusaetzlich in
 * store.mobilityEvents und sind dort dieselben Objekte, keine Kopien.
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
    // Eine Annotation ohne Rolle ist in ihrer Bezugsebene nicht entscheidbar
    // und datiert deshalb nicht. Der Wert benennt den Zustand, statt ihn zu
    // verschweigen.
    scope: role
      ? scopeForRole(roleId || (typeof role === 'string' ? role : null))
      : 'unclassified',
    rank: rankForRole(roleId),
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
 * Record → Annotations-IDs in Quellreihenfolge. Die verorteten davon fuehrt
 * store.recordToEvents weiter; sie sind die raumzeitliche Spur, an der die
 * Karte, die Sicht-Ableitung der Chronik und der enge Schaerfegrad haengen.
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
}

/**
 * Die Datierungen eines Records sammeln: die datierten Annotationen in
 * Quellreihenfolge, danach die Entstehungsdatierung aus `rico:creationDate`,
 * die am Record selbst steht und deshalb keine Position in der Quell-
 * reihenfolge hat.
 */
function indexDatings(store, record) {
  const list = [];
  for (const annotation of annotationsOf(store, record)) {
    if (annotation.date) list.push(annotation);
  }
  const creation = record['rico:creationDate'];
  if (creation) {
    const { qualifier, value } = splitQualifier(creation);
    // Die Rolle steht der Property nicht bei, sie ist durch die Property
    // bestimmt. Registriert wird sie trotzdem, damit die Rollenpruefung sie
    // sieht: ohne einen Rollenverweis irgendwo im Datenstand hat auch diese
    // Datierung keine Anzeigeform.
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
      scope: scopeForRole(roleId),
      rank: rankForRole(roleId),
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
 * Performance-Kette aufloesen (M2): Record -> m3gim-ontology:hasPerformance -> Performance
 * -> {performanceOf (Werk, inline), hasPerformer (Person, inline),
 *     hasStageRole (Ref auf store.stageRoles), atDate}.
 * Materialisiert das Rueckgrat des engen Schaerfegrads im Verknuepfungen-Graph:
 * pro Record die belegten Auffuehrungen mit Werk, Mitwirkenden und Buehnenrolle.
 * Die einzelnen Performance-Knoten sind fragmentarisch (entweder Rolle, oder
 * Rolle+Performer, oder Werk+Datum) — hier zusammengefuehrt, nicht erfunden.
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


/** AgRelOn-Relationen am Record. */
function indexAgentRelations(store, record) {
  const rels = ensureArray(record['m3gim-ontology:hasAgentRelation']);
  if (rels.length === 0) return;
  const entries = [];
  for (const rel of rels) {
    if (!rel || typeof rel !== 'object') continue;
    const obj = rel['agrelon:hasObject'] || {};
    const validity = rel['agrelon:metadataPeriod'];
    entries.push({
      type: rel['@type'] || null,
      objectName: obj.name || null,
      objectWikidata: obj['@id'] && String(obj['@id']).startsWith('wd:') ? obj['@id'] : null,
      validityBegin: validity && validity['agrelon:hasBeginDate'] || null,
      validityEnd: validity && validity['agrelon:hasEndDate'] || null,
      provenance: rel['agrelon:metadataProvenance'] && rel['agrelon:metadataProvenance']['@id'] || null,
      xlsxSource: extractXlsxSource(rel),
    });
  }
  if (entries.length > 0) store.agentRelations.set(record['@id'], entries);
}

/** Finanzposten am Record (Annotation unter hasDetail, nur mit monetaryAmount). */
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

