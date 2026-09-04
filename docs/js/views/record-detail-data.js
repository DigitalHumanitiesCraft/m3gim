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
      // The Performance node carries the Quellzeile of the role and, where the
      // Besetzung is recorded, its performer. Both were dropped here, which left
      // the Rolle chip as the one chip of the detail without a Provenance-Pille
      // (Projektleitung, 2026-09-04).
      const xlsxSource = extractXlsxSource(perf);
      const performers = ensureArray(perf['m3gim-ontology:hasPerformer'])
        .map(p => p && (p.name || p['skos:prefLabel']))
        .filter(Boolean);
      for (const name of roleNames) {
        const role = { name, qualityFlag, xlsxSource };
        if (voiceType) role.voiceType = voiceType;
        if (performers.length) role.performers = performers;
        performanceRoles.push(role);
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

// =========================================================================
// Auftritt: ordering and grouping of the performance data of one record.
// All pure, so record-chips.js stays a rendering layer (Projektleitung,
// 2026-09-04).
// =========================================================================

const SEASON_ROLE = 'm3gim-vocab:season';
const PERFORMANCE_ROLE = 'm3gim-vocab:performance';

/** Beginning of a Datierung as an ISO string, of a range its start; null when undated. */
function datingStart(dating) {
  const raw = String((dating && (dating.date || dating.rawDate)) || '').trim();
  if (!raw) return null;
  const start = raw.split('/')[0].trim();
  return /^\d{4}/.test(start) ? start : null;
}

/** The two ends of a Datierung, only for a real ISO day range. */
function isoRange(dating) {
  const raw = String((dating && (dating.date || dating.rawDate)) || '').trim();
  if (!raw.includes('/')) return null;
  const [from, to] = raw.split('/').map(s => s.trim());
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  return iso.test(from) && iso.test(to) ? [from, to] : null;
}

/**
 * Datierungen by date ascending, undated last. The list arrives in source order
 * and Array#sort is stable, so equal or missing dates keep their Quellzeile
 * order.
 */
export function sortDatingsByDate(datings) {
  return [...datings].sort((a, b) => {
    const x = datingStart(a);
    const y = datingStart(b);
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return x < y ? -1 : 1;
  });
}

/**
 * Bundle the placeless Auffuehrungs-Datierungen of a record under the Spielzeit
 * that spans them, so a Festspielsommer stands as one head line with its dates
 * instead of a dozen single chips. A Spielzeit without dates inside it stays a
 * plain chip, and every other Datierung passes through untouched.
 *
 * @returns {{seasons: Array<{season: Object, dates: Object[]}>, rest: Object[]}}
 */
export function groupPerformanceDatings(datings) {
  const seasons = [];
  const others = [];
  for (const d of datings) {
    if (d.roleId === SEASON_ROLE && isoRange(d)) seasons.push({ season: d, dates: [], range: isoRange(d) });
    else others.push(d);
  }
  if (seasons.length === 0) return { seasons: [], rest: sortDatingsByDate(datings) };

  const loose = [];
  for (const d of others) {
    const start = d.roleId === PERFORMANCE_ROLE ? datingStart(d) : null;
    const group = start
      ? seasons.find(g => start >= g.range[0] && start <= g.range[1])
      : null;
    if (group) group.dates.push(d);
    else loose.push(d);
  }
  // A Spielzeit that bundles nothing is just another Datierung.
  const bundling = [];
  for (const g of seasons) {
    if (g.dates.length) bundling.push({ season: g.season, dates: sortDatingsByDate(g.dates) });
    else loose.push(g.season);
  }
  bundling.sort((a, b) => (datingStart(a.season) || '') < (datingStart(b.season) || '') ? -1 : 1);
  return { seasons: bundling, rest: sortDatingsByDate(loose) };
}

/** Umlaut- and diacritic-insensitive comparison key for a Partie name. */
function partKey(value) {
  return String(value || '').trim().toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Hang the Buehnenrollen of a record on their work.
 *
 * The data gives two resolvable paths and no third: a record with exactly one
 * MusicalWork holds the whole Besetzung of that work, and a role whose name
 * equals the `m3gim-ontology:sungPart` of a work is that work's Partie (the
 * field may name two, separated by a slash). A record with several works and a
 * flat Besetzung list carries no link at all, because the Verknuepfungen sheet
 * lists works and roles as two independent runs of rows; those roles stay
 * loose rather than being guessed onto a work (Projektleitung, 2026-09-04).
 *
 * @returns {{groups: Array<{work: Object, roles: Object[]}>, looseRoles: Object[]}}
 */
export function groupRolesByWork(works, performanceRoles) {
  const groups = works.map(work => ({ work, roles: [] }));
  const musical = groups.filter(g => g.work['@type'] === 'm3gim-ontology:MusicalWork');
  const single = musical.length === 1 ? musical[0] : null;

  const byPart = new Map();
  for (const g of groups) {
    const part = g.work['m3gim-ontology:sungPart'];
    if (!part) continue;
    for (const one of String(part).split('/')) {
      const key = partKey(one);
      if (key && !byPart.has(key)) byPart.set(key, g);
    }
  }

  const looseRoles = [];
  for (const role of performanceRoles) {
    const group = single || byPart.get(partKey(role.name));
    if (group) group.roles.push(role);
    else looseRoles.push(role);
  }
  return { groups, looseRoles };
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
