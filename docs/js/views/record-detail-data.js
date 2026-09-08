/**
 * Record detail — pure data layer.
 *
 * partitionRecord splits a record into its functional parts. No DOM and no d3,
 * so it stays unit-testable; record-chips.js turns the partition into chips and
 * record-detail.js assembles the panel.
 */

import { ensureArray, roleToken, asWikidataId } from '../utils/format.js';
import { extractXlsxSource, propertySources, compactPropertySource } from '../utils/provenance.js';
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
    // The Erschliessung records a caveat about the Auffuehrung as
    // rico:generalDescription ("Vertrag nicht eingehalten", "im Original: ...").
    // Dropping it here made the chip claim the Auffuehrung took place.
    const description = perf['rico:generalDescription'] || null;
    const date = perf['m3gim-ontology:atDate'] || null;
    const roleNames = ensureArray(perf['m3gim-ontology:hasStageRole'])
      .map(sr => sr && sr['@id'] && store.stageRoles?.get(sr['@id']))
      .filter(Boolean);
    if (date) {
      const wof = perf['m3gim-ontology:performanceOf'];
      performances.push({
        date,
        work: wof ? (wof.name || wof['skos:prefLabel'] || null) : null,
        workWikidata: asWikidataId(wof),
        roles: roleNames,
        // voiceType may sit on the stage role or the performance once modelled.
        voiceType: perf['m3gim-ontology:voiceType']
          || firstVoiceType(store, perf['m3gim-ontology:hasStageRole']),
        xlsxSource: extractXlsxSource(perf),
        qualityFlag,
        description,
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
        if (description) role.description = description;
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
  const details = store.details?.get(recordId) || [];
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
    agentRelations, finances, details, mentionedDatings, eventDatings,
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

// =========================================================================
// Chip content: the fields of a node that the chip itself does not print.
// =========================================================================

/**
 * Composer of a work node.
 *
 * Inside a record the field arrives under the @context alias `composer`, while
 * store.works carries the same value as `komponist`. The work chip read only
 * the store spelling, so the composer never appeared on it (Projektleitung,
 * 2026-09-04).
 */
export function workComposer(work) {
  if (!work) return '';
  return work.composer || work.komponist || work['m3gim-ontology:composer'] || '';
}

/** "Label: Wert" from a node field, arrays joined; null when the field is absent. */
function fieldLine(node, key, label) {
  const raw = node[key];
  if (raw === undefined || raw === null || raw === '') return null;
  const value = Array.isArray(raw) ? raw.filter(Boolean).join(', ') : String(raw);
  return value ? `${label}: ${value}` : null;
}

/** Date and place of a life event as one line, either half alone as well. */
function lifeEventLine(node, dateKey, placeKey, label) {
  const parts = [node[dateKey], node[placeKey]].filter(Boolean).map(String);
  return parts.length ? `${label}: ${parts.join(', ')}` : null;
}

/** Coordinates verbatim, in the precision the enrichment wrote them. */
function coordinateLine(node) {
  const lat = node['geo:lat'];
  const lon = node['geo:long'];
  return (lat != null && lon != null) ? `Koordinaten: ${lat}, ${lon}` : null;
}

/**
 * Every modelled field of a node that the chip does not print, as tooltip
 * lines in a fixed order (design rule 8: the tooltip is the place of depth, not
 * standing text). The composer of a work is left out because the work chip
 * prints it in its value and a tooltip never repeats visible text (E-210).
 *
 * What the Wikidata enrichment injected stands under its own "ergänzt:" line,
 * the way the Indizes mark a supplemented subtitle (design rule 16); the lines
 * above it are read from the Verknüpfungen sheets.
 */
export function nodeTipLines(node) {
  if (!node || typeof node !== 'object') return [];
  const lines = [
    fieldLine(node, 'rico:generalDescription', 'Anmerkung'),
    fieldLine(node, 'm3gim-ontology:indexNote', 'Indexnotiz'),
    fieldLine(node, 'm3gim-ontology:sungPart', 'Partie'),
    fieldLine(node, 'm3gim-ontology:lifespan', 'Lebensdaten'),
    fieldLine(node, 'm3gim-ontology:headquarters', 'Sitz'),
    fieldLine(node, 'm3gim-ontology:keyContact', 'Kontakt'),
  ].filter(Boolean);
  const derived = [
    fieldLine(node, 'gndo:professionOrOccupationAsLiteral', 'Beruf'),
    fieldLine(node, 'm3gim-ontology:voiceType', 'Stimmfach'),
    lifeEventLine(node, 'schema:birthDate', 'schema:birthPlace', 'Geburt'),
    lifeEventLine(node, 'schema:deathDate', 'schema:deathPlace', 'Tod'),
    fieldLine(node, 'm3gim-ontology:wdComposer', 'Komponist'),
    fieldLine(node, 'm3gim-ontology:wdGenre', 'Gattung'),
    fieldLine(node, 'm3gim-ontology:wdPremiereDate', 'Uraufführung'),
    fieldLine(node, 'm3gim-ontology:wdPublicationDate', 'Publikationsdatum'),
    fieldLine(node, 'm3gim-ontology:wdInception', 'Gegründet'),
    fieldLine(node, 'm3gim-ontology:wdLocation', 'Sitz'),
    fieldLine(node, 'm3gim-ontology:country', 'Land'),
    coordinateLine(node),
  ].filter(Boolean);
  if (derived.length) {
    lines.push(...derived);
  }
  for (const raw of propertySources(node)) {
    const source = compactPropertySource(raw);
    const property = String(source.sourceProperty || '').replace(/^.*:/, '') || 'Wert';
    const witness = source.sourceKind === 'index' && source.xlsxSource
      ? `${source.xlsxSource.sheet} Zeile ${source.xlsxSource.row}`
      : source.source;
    lines.push(`${property}: ${source.sourceValue ?? '?'} · Quelle: ${witness || source.sourceKind || '?'}`);
  }
  return lines;
}

/**
 * Tooltip lines of the data-quality marker: the modelled flag and the
 * Erschließungsanmerkung `rico:generalDescription`, both verbatim. The
 * description is what says that a contract was not honoured; without it a
 * dated Aufführung chip reads as an event that took place.
 */
export function qualityTipLines(flag, note) {
  const lines = [];
  if (flag) lines.push(`Datenqualität: ${flag}`);
  if (note) lines.push(`Anmerkung: ${note}`);
  return lines;
}

/* Folio pages (B2) */

/** store → Map<page @id, Folio @id>, built once per store. The Konvolut
 *  RecordSets list the same pages again as their own parts; only the Record
 *  level is read here, because that is the Folio a page hangs on
 *  (tests/test_68_folio_pages.py). */
const pageParents = new WeakMap();

function parentIndex(store) {
  const cached = pageParents.get(store);
  if (cached) return cached;
  const index = new Map();
  const records = store && store.records ? store.records : new Map();
  for (const record of records.values()) {
    for (const part of ensureArray(record['rico:hasOrHadPart'])) {
      const id = part && part['@id'];
      if (id && records.has(id)) index.set(id, record['@id']);
    }
  }
  pageParents.set(store, index);
  return index;
}

/** Whether the record stands as a page under a Folio record. */
export function isFolioPage(store, recordId) {
  return parentIndex(store).has(recordId);
}

/**
 * The Folio a page belongs to: the topmost ancestor that is no page itself, or
 * null for a record that is no page. A page can carry pages of its own
 * (`33_1_1` under `33_1` under `33`), so the walk does not stop at the first
 * parent; the seen set keeps a cyclic source from hanging the browser.
 */
export function folioOfPage(store, recordId) {
  const index = parentIndex(store);
  if (!index.has(recordId)) return null;
  let id = recordId;
  const seen = new Set([id]);
  while (index.has(id)) {
    const parent = index.get(id);
    if (seen.has(parent)) break;
    seen.add(parent);
    id = parent;
  }
  return id;
}

/**
 * The pages of a Folio in page order, depth first: a page that carries pages of
 * its own stands before them, so no record of the sheet drops out of the
 * sequence. `rico:hasOrHadPart` already stands in page order, an invariant of
 * tests/test_68_folio_pages.py. Empty for every record without pages.
 */
export function folioPages(store, record) {
  const records = store && store.records ? store.records : new Map();
  const out = [];
  const seen = new Set();
  const walk = (node) => {
    for (const part of ensureArray(node && node['rico:hasOrHadPart'])) {
      const id = part && part['@id'];
      const child = id ? records.get(id) : null;
      if (!child || seen.has(id)) continue;
      seen.add(id);
      out.push(child);
      walk(child);
    }
  };
  walk(record);
  return out;
}

/**
 * Position of a page in its Folio with the neighbours the paging control
 * offers. The ends stop instead of wrapping: a Folio is a physical sheet with a
 * first and a last page, and a wrapping step would make the position say
 * nothing about how far the reader has come. `index` is -1 for a page outside
 * the list.
 * @param {Array<object>} pages
 * @param {string} currentId
 * @returns {{index: number, total: number, prev: ?object, next: ?object}}
 */
export function pageNeighbours(pages, currentId) {
  const list = Array.isArray(pages) ? pages : [];
  const index = list.findIndex(p => p && p['@id'] === currentId);
  return {
    index,
    total: list.length,
    prev: index > 0 ? list[index - 1] : null,
    next: index >= 0 && index < list.length - 1 ? list[index + 1] : null,
  };
}
