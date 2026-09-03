/**
 * Record detail — pure data layer.
 *
 * partitionRecord splits a record into its functional parts, sourceSummary
 * bundles the provenance of the record and of everything nested in it. No DOM
 * and no d3, so both stay unit-testable; record-chips.js turns the partition
 * into chips and record-detail.js assembles the panel.
 */

import { ensureArray, roleToken } from '../utils/format.js';
import { extractXlsxSource } from '../utils/provenance.js';
import { sectionForRole, DATING_SCOPE } from '../data/constants.js';
import { datingsOf, datingsByScope } from '../data/loader.js';

// Agents already visible through an AgRelOn relation are suppressed in their
// origin bucket so the same agent is not shown in two sections. Only roles
// with an AgRelOn equivalent are affected.
const AGRELON_ROLES = new Set([
  'absender', 'empfänger', 'empfaenger', 'adressat',
  'arbeitgeber', 'agent', 'vermittler', 'auftraggeber',
]);

// The agent types the loader also treats as an organisation (indexAgents).
const INSTITUTION_TYPES = new Set(['rico:CorporateBody', 'rico:Group']);

/**
 * voiceType of the first stage role that carries one, if the model records it.
 * The data currently holds none; this reads it defensively from either the
 * inline stage-role reference node or the resolved StageRole node so the field
 * surfaces the moment the pipeline emits it, without a schema change here.
 */
function firstVoiceType(store, stageRoleRefs) {
  for (const sr of ensureArray(stageRoleRefs)) {
    if (!sr) continue;
    const inline = sr['m3gim-ontology:voiceType'];
    if (inline) return inline;
    const node = sr['@id'] && store && store.stageRoleNodes?.get(sr['@id']);
    if (node && node['m3gim-ontology:voiceType']) return node['m3gim-ontology:voiceType'];
  }
  return null;
}

/**
 * Partition a record into its functional parts, dom-free and therefore
 * unit-testable: the agent buckets with AgRelOn dedup plus the raw work,
 * annotation, location, relation and finance lists. buildRecordBlocks turns
 * these into DOM, this function never does.
 */
export function partitionRecord(record, store) {
  const recordId = record['@id'];
  const allAgents = ensureArray(record['m3gim-ontology:hasAssociatedAgent']);
  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  const works = subjects.filter(s => s['@type'] === 'm3gim-ontology:MusicalWork' || s['@type'] === 'm3gim-ontology:FramingEvent');
  const mentionedPersons = subjects.filter(s => s['@type'] === 'rico:Person');
  // Resolve the referenced Performance entities (E-96, replaced the former
  // hasPerformanceRole attribute). The individual Performance nodes are
  // fragmentary: a dated one carries a work and date but no stage role, an
  // undated one carries only a standalone stage role. Split them so a dated
  // performance goes to its own "Aufführungen" section and the undated
  // standalone roles stay in Werk & Repertoire — no role appears twice.
  const performanceRoles = [];   // undated standalone stage roles
  const performances = [];       // dated performances (date + work + roles)
  for (const ref of ensureArray(record['m3gim-ontology:hasPerformance'])) {
    const perf = store.performances?.get(ref && ref['@id']);
    if (!perf) continue;
    const qualityFlag = perf['m3gim-ontology:dataQualityFlag'];
    const date = perf['m3gim-ontology:atDate'] || null;
    const roleNames = ensureArray(perf['m3gim-ontology:hasStageRole'])
      .map(sr => sr && sr['@id'] && store.stageRoles?.get(sr['@id']))
      .filter(Boolean);
    if (date) {
      const wof = perf['m3gim-ontology:performanceOf'];
      performances.push({
        date,
        work: wof ? (wof.name || wof['skos:prefLabel'] || null) : null,
        workWikidata: wof && String(wof['@id'] || '').startsWith('wd:') ? wof['@id'] : null,
        roles: roleNames,
        // voiceType may sit on the stage role or the performance once modelled.
        voiceType: perf['m3gim-ontology:voiceType']
          || firstVoiceType(store, perf['m3gim-ontology:hasStageRole']),
        xlsxSource: extractXlsxSource(perf),
        qualityFlag,
      });
    } else {
      // dataQualityFlag sits on the Performance, not the StageRole. voiceType is
      // attached only when the model carries it, so the common case keeps the
      // minimal { name, qualityFlag } shape.
      const voiceType = firstVoiceType(store, perf['m3gim-ontology:hasStageRole']);
      for (const name of roleNames) {
        performanceRoles.push(voiceType ? { name, qualityFlag, voiceType } : { name, qualityFlag });
      }
    }
  }
  const locations = ensureArray(record['rico:hasOrHadLocation']);
  const eventIds = store.recordToEvents?.get(recordId) || [];
  const events = eventIds.map(eid => store.mobilityEvents.get(eid)).filter(Boolean);
  const agentRelations = store.agentRelations?.get(recordId) || [];
  const finances = store.finances?.get(recordId) || [];
  // Placeless datings only; placed ones already stand in the Ort & Ereignis
  // block, so no chip appears twice. mentionedDatings are dates NAMED in the
  // document, not biographical events, which is why they hang on the record and
  // never on the Chronik timeline. eventDatings carry every other scope, so
  // framing events, the contract status and the object dating stay visible.
  const hasDatings = Boolean(store && store.recordDatings);
  const mentionedDatings = hasDatings
    ? datingsByScope(store, record, DATING_SCOPE.mentioned).filter(d => !d.place) : [];
  const eventDatings = hasDatings
    ? datingsOf(store, record).filter(d => !d.place && d.scope !== DATING_SCOPE.mentioned) : [];

  const agrelonAgentKeys = new Set();
  for (const rel of agentRelations) {
    const key = rel.objectWikidata || (rel.objectName || '').toLowerCase();
    if (key) agrelonAgentKeys.add(key);
  }

  const bucket = { produktion: [], mitwirkende: [], institutionen: [], erwaehnt: [], weitere: [] };
  for (const a of allAgents) {
    // The role hangs on the agent as a reference node; section and dedup tables
    // key on its raw token.
    const token = roleToken(a.role);
    const roleKey = (token || '').toLowerCase();
    if (AGRELON_ROLES.has(roleKey)) {
      const agentKey = a['@id'] || (a.name || '').toLowerCase();
      if (agentKey && agrelonAgentKeys.has(agentKey)) continue;
    }
    // The institution is one of the four content families, so a corporate agent
    // leaves the role-based sections and stands in its own block whatever role
    // it carries. Without that split a Theater sits unmarked among the persons
    // of Mitwirkende.
    if (INSTITUTION_TYPES.has(a['@type'])) {
      bucket.institutionen.push(a);
      continue;
    }
    const section = sectionForRole(token) || 'weitere';
    bucket[section].push(a);
  }
  for (const p of mentionedPersons) bucket.erwaehnt.push(p);

  return {
    bucket, works, performanceRoles, performances, events, locations,
    agentRelations, finances, mentionedDatings, eventDatings,
  };
}

/**
 * Provenance of the record and of everything nested in it, dom-free so it is
 * unit-testable. Per-chip pills stay in place; this bundles them so the whole
 * entry can be traced back to its Verknüpfungen sheets without hovering each
 * chip (design rule 6).
 *
 * @returns {{record: ?{sheet: ?string, row: number}, linked: Array<{sheet: string, rows: number[]}>}}
 */
export function sourceSummary(record, store) {
  const own = extractXlsxSource(record);
  const {
    bucket, works, performanceRoles, performances, events, locations,
    agentRelations, finances, mentionedDatings, eventDatings,
  } = partitionRecord(record, store);

  const bySheet = new Map();
  const nested = [
    ...bucket.produktion, ...bucket.mitwirkende, ...bucket.institutionen,
    ...bucket.erwaehnt, ...bucket.weitere,
    ...works, ...performanceRoles, ...performances, ...events, ...locations,
    ...agentRelations, ...finances, ...mentionedDatings, ...eventDatings,
  ];
  for (const entity of nested) {
    // Store-derived entities carry a precomputed xlsxSource, raw JSON-LD nodes
    // do not; both shapes reach this list.
    const src = (entity && entity.xlsxSource) || extractXlsxSource(entity);
    if (!src || !src.sheet) continue;
    if (!bySheet.has(src.sheet)) bySheet.set(src.sheet, new Set());
    bySheet.get(src.sheet).add(src.row);
  }

  const linked = [...bySheet.entries()]
    .map(([sheet, rows]) => ({ sheet, rows: [...rows].sort((a, b) => a - b) }))
    .sort((a, b) => a.sheet.localeCompare(b.sheet, 'de'));
  return { record: own ? { sheet: own.sheet, row: own.row } : null, linked };
}
